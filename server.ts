import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "default-secret"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.get("/api/auth/google", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Google OAuth credentials are not configured in Settings." });
    }
    const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.readonly"],
      prompt: "consent",
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
    try {
      const { tokens } = await oauth2Client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      req.session!.tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/status", (req, res) => {
    res.json({ isAuthenticated: !!req.session?.tokens });
  });

  app.get("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  app.get("/api/drive/files", async (req, res) => {
    if (!req.session?.tokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      oauth2Client.setCredentials(req.session.tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const response = await drive.files.list({
        pageSize: 50,
        fields: "nextPageToken, files(id, name, mimeType, size, iconLink)",
        q: "trashed = false and (mimeType = 'application/pdf' or mimeType contains 'audio/')",
      });
      res.json(response.data);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.get("/api/drive/download/:fileId", async (req, res) => {
    if (!req.session?.tokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { fileId } = req.params;
    try {
      oauth2Client.setCredentials(req.session.tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      
      const fileMetadata = await drive.files.get({ fileId, fields: "name, mimeType" });
      const fileName = fileMetadata.data.name;
      const mimeType = fileMetadata.data.mimeType;

      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", mimeType || "application/octet-stream");
      response.data.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.post("/api/audio/compress", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Starting audio compression for: ${req.file.originalname} (${req.file.size} bytes)`);
    const tempInput = path.join(os.tmpdir(), `input_${Date.now()}_${req.file.originalname}`);
    const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}_${req.file.originalname}`);

    try {
      fs.writeFileSync(tempInput, req.file.buffer);
      console.log(`Temp input file created: ${tempInput}`);

      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .audioBitrate(64)
          .audioChannels(1)
          .toFormat("mp4")
          .on("start", (commandLine) => {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
          })
          .on("progress", (progress) => {
            console.log('Processing: ' + progress.percent + '% done');
          })
          .on("end", () => {
            console.log('Ffmpeg processing finished');
            resolve(null);
          })
          .on("error", (err) => {
            console.error('Ffmpeg error:', err);
            reject(err);
          })
          .save(tempOutput);
      });

      console.log(`Compression finished, reading temp output: ${tempOutput}`);
      const compressedBuffer = fs.readFileSync(tempOutput);
      console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="compressed_${req.file.originalname}"`);
      res.send(compressedBuffer);

    } catch (error) {
      console.error("Audio compression error:", error);
      res.status(500).json({ error: "Failed to compress audio" });
    } finally {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    }
  });

  app.post("/api/pdf/compress", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const pdfDoc = await PDFDocument.load(req.file.buffer);
      
      // Strip metadata
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");

      // Save with object streams and structural optimization
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="compressed_${req.file.originalname}"`);
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("PDF Compression error:", error);
      res.status(500).json({ error: "Failed to compress PDF" });
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler:", err);
    if (res.headersSent) {
      return next(err);
    }
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: "파일 크기가 너무 큽니다. (최대 100MB)" });
    }

    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
