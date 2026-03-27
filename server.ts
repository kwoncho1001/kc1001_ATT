import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Compress Audio
  app.post('/api/compress', upload.single('audio'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(uploadDir, `compressed-${Date.now()}.m4a`);

    ffmpeg(inputPath)
      .audioBitrate('64k')
      .toFormat('mp4') // Use mp4 container for m4a
      .on('end', () => {
        res.download(outputPath, 'compressed.m4a', (err) => {
          // Clean up files after download
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
      })
      .on('error', (err) => {
        console.error('Compression error:', err);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.status(500).json({ error: 'Compression failed' });
      })
      .save(outputPath);
  });

  // API Route: Transcribe Audio
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { field, language } = req.body;
    const inputPath = req.file.path;
    const compressedPath = path.join(uploadDir, `transcribe-compressed-${Date.now()}.m4a`);

    try {
      // 1. Compress the audio first to save Gemini API payload size
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .audioBitrate('64k')
          .toFormat('mp4')
          .on('end', resolve)
          .on('error', reject)
          .save(compressedPath);
      });

      // 2. Upload to Gemini File API
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const uploadResult = await ai.files.upload({
        file: compressedPath,
        config: {
          mimeType: 'audio/mp4',
        }
      });
      
      const prompt = `다음 오디오를 텍스트로 전사해주세요.
      주요 분야: ${field || '일반'}
      결과 언어: ${language || '한국어'}
      
      오디오의 내용을 최대한 정확하게 받아쓰기 하듯 전사해주세요.
      화자가 여러 명일 경우 화자를 구분할 수 있다면 구분해주시고,
      불필요한 추임새나 의미 없는 소리는 적절히 필터링하되 핵심 내용은 모두 포함해주세요.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType,
            }
          },
          prompt
        ]
      });

      const transcription = response.text;

      // Clean up Gemini file
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (e) {
        console.error('Failed to delete Gemini file:', e);
      }

      // Clean up
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);

      res.json({ transcription });
    } catch (error) {
      console.error('Transcription error:', error);
      // Clean up on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
