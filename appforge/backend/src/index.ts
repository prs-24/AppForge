import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { testConnection } from './db/pool';
import { runMigrations } from './db/migrations';
import { initFirebase } from './config/firebase';

import authRoutes from './routes/auth';
import appsRoutes from './routes/apps';
import dataRoutes from './routes/data';
import csvRoutes from './routes/csv';
import notificationsRoutes from './routes/notifications';
import exportRoutes from './routes/export';

const app = express();

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/apps', dataRoutes);
app.use('/api/apps', csvRoutes);
app.use('/api/apps', exportRoutes);
app.use('/api/notifications', notificationsRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ Cannot start without database. Check your DB config.');
    process.exit(1);
  }

  await runMigrations();
  initFirebase();

  const PORT = parseInt(process.env.PORT || '4000');
  app.listen(PORT, () => {
    console.log(`\n🚀 AppForge Backend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API:    http://localhost:${PORT}/api`);
    console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

export default app;
