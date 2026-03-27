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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="compressed.mp3"');

    ffmpeg(inputPath)
      .audioBitrate('64k')
      .toFormat('mp3')
      .on('end', () => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      })
      .on('error', (err) => {
        console.error('Compression error:', err);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Compression failed' });
        } else {
          res.end();
        }
      })
      .pipe(res, { end: true });
  });

  // In-memory job store for transcription
  interface Job {
    id: string;
    status: 'pending' | 'compressing' | 'uploading' | 'processing' | 'transcribing' | 'completed' | 'failed';
    transcription?: string;
    error?: string;
  }
  const jobs = new Map<string, Job>();

  // API Route: Start Transcription Job
  app.post('/api/transcribe/start', upload.single('audio'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { field, language, apiKey } = req.body;
    const inputPath = req.file.path;
    const jobId = Date.now().toString() + Math.random().toString().slice(2);

    jobs.set(jobId, { id: jobId, status: 'compressing' });
    res.json({ jobId });

    // Run async background job
    (async () => {
      const compressedPath = path.join(uploadDir, `compressed-${jobId}.mp3`);
      let uploadResult: any = null;
      const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });

      try {
        // 1. Compress
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .audioBitrate('16k')
            .audioChannels(1)
            .audioFrequency(16000)
            .toFormat('mp3')
            .on('end', resolve)
            .on('error', reject)
            .save(compressedPath);
        });

        jobs.set(jobId, { id: jobId, status: 'uploading' });

        // 2. Upload to Gemini
        uploadResult = await ai.files.upload({
          file: compressedPath,
          config: { mimeType: 'audio/mp3' }
        });

        jobs.set(jobId, { id: jobId, status: 'processing' });

        // 3. Wait for ACTIVE
        let fileState = uploadResult.state;
        while (fileState === 'PROCESSING') {
          await new Promise(r => setTimeout(r, 5000));
          const fileInfo = await ai.files.get({ name: uploadResult.name });
          fileState = fileInfo.state;
        }

        if (fileState === 'FAILED') throw new Error('Gemini API에서 오디오 파일 처리에 실패했습니다.');

        jobs.set(jobId, { id: jobId, status: 'transcribing' });

        // 4. Generate Content
        const prompt = `당신은 절대적인 기록관(Stenographer)입니다. 들리는 소리를 단 한 단어도 빠뜨리지 않고 텍스트로 옮기는 것이 유일한 임무입니다.
        
        주요 분야: ${field || '일반'}
        결과 언어: ${language || '한국어'}
        
        [중요 지침]
        1. 이 분야의 용어가 자주 등장하니 해당 단어들을 정확히 맞추는 용도(Dictionary Reference)로만 참고하고, 문장 구조는 절대 건드리지 마시오.
        2. 요약하지 마시오.
        3. 임의로 소제목이나 기호를 추가하지 마시오.
        4. 문법적으로 틀린 문장이라도 화자가 말한 그대로 적으시오.
        5. 화자가 여러 명일 경우 화자를 구분할 수 있다면 구분해주십시오.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
            prompt
          ]
        });

        if (!response.text) throw new Error('AI가 텍스트를 생성하지 못했습니다. (안전 필터에 걸렸거나 오디오 내용이 없을 수 있습니다.)');

        jobs.set(jobId, { id: jobId, status: 'completed', transcription: response.text });

      } catch (err: any) {
        console.error(`Job ${jobId} failed:`, err);
        jobs.set(jobId, { id: jobId, status: 'failed', error: err.message || 'Unknown error' });
      } finally {
        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
        if (uploadResult) {
          try { await ai.files.delete({ name: uploadResult.name }); } catch(e) {}
        }
      }
    })();
  });

  // API Route: Check Transcription Job Status
  app.get('/api/transcribe/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
