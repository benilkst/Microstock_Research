import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  verifyPasscode,
  handleNicheIdeas,
  handleScreenshot,
  handleSummarizeInsights,
  formatErrorResponse,
} from './lib/handlers';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware JSON parser dengan batas ukuran untuk tangkapan layar & payload agregat
app.use(express.json({ limit: '15mb' }));

// Middleware Verifikasi Passcode untuk seluruh rute /api
const passcodeMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const passcodeHeader = req.headers['x-app-passcode'] as string | undefined;
  const check = verifyPasscode(passcodeHeader);
  if (!check.ok) {
    return res.status(check.status || 401).json({
      success: false,
      error: check.error,
      needsPasscode: true,
    });
  }
  next();
};

// ==========================================
// 1. ENDPOINT: IDE NICHE
// ==========================================
app.post(['/api/niche', '/api/gemini/niche-ideas'], passcodeMiddleware, async (req, res) => {
  try {
    const result = await handleNicheIdeas(req.body);
    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatErrorResponse(error);
    return res.status(status).json(body);
  }
});

// ==========================================
// 2. ENDPOINT: BACA SCREENSHOT MULTIMODAL
// ==========================================
app.post(['/api/screenshot', '/api/gemini/read-screenshot'], passcodeMiddleware, async (req, res) => {
  try {
    const result = await handleScreenshot(req.body);
    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatErrorResponse(error);
    return res.status(status).json(body);
  }
});

// ==========================================
// 3. ENDPOINT: RINGKAS INSIGHT PORTOFOLIO
// ==========================================
app.post(['/api/insights', '/api/gemini/summarize-insights'], passcodeMiddleware, async (req, res) => {
  try {
    const result = await handleSummarizeInsights(req.body);
    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatErrorResponse(error);
    return res.status(status).json(body);
  }
});

// ==========================================
// VITE INTEGRATION FOR DEV / PROD (AI Studio)
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Microstock Research berjalan di port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
