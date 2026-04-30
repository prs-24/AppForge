import { Router, Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { query } from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { insertDynamicRecord } from '../services/schemaService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Upload & parse CSV ───────────────────────────────────────────────────────
router.post('/:appId/csv/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const rows: Record<string, string>[] = [];
    const errors: string[] = [];
    let rowIndex = 0;

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(req.file!.buffer);
      stream
        .pipe(csv({ strict: false }))
        .on('data', (row) => {
          rowIndex++;
          if (rowIndex > 10000) return; // Safety limit
          // Sanitize keys
          const sanitized: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.trim().replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanKey) sanitized[cleanKey] = String(value ?? '').trim();
          }
          rows.push(sanitized);
        })
        .on('error', (err) => {
          errors.push(String(err.message));
          resolve();
        })
        .on('end', resolve);
    });

    if (rows.length === 0) {
      res.status(400).json({ error: 'CSV file is empty or invalid', parseErrors: errors });
      return;
    }

    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);

    res.json({
      headers,
      preview,
      totalRows: rows.length,
      filename: req.file.originalname,
      parseErrors: errors,
    });
  } catch (err) {
    console.error('CSV upload error:', err);
    res.status(500).json({ error: 'CSV upload failed' });
  }
});

// ─── Import CSV with column mapping ──────────────────────────────────────────
router.post('/:appId/csv/import', authMiddleware, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { tableName, columnMapping } = req.body;
    if (!tableName) {
      res.status(400).json({ error: 'tableName is required' });
      return;
    }

    let mapping: Record<string, string> = {};
    try {
      mapping = typeof columnMapping === 'string' ? JSON.parse(columnMapping) : (columnMapping || {});
    } catch {
      // Use identity mapping if parsing fails
    }

    const rows: Record<string, string>[] = [];

    await new Promise<void>((resolve) => {
      const stream = Readable.from(req.file!.buffer);
      stream
        .pipe(csv({ strict: false }))
        .on('data', (row) => {
          if (rows.length >= 5000) return;
          const sanitized: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.trim().replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
            const mappedKey = mapping[cleanKey] || mapping[key.trim()] || cleanKey;
            if (mappedKey) sanitized[mappedKey] = String(value ?? '').trim();
          }
          rows.push(sanitized);
        })
        .on('end', resolve)
        .on('error', resolve);
    });

    // Log import
    const importLog = await query(
      `INSERT INTO csv_imports (app_id, user_id, filename, table_name, row_count, column_mapping, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')
       RETURNING id`,
      [
        req.params.appId,
        req.user!.userId,
        req.file.originalname,
        tableName,
        rows.length,
        JSON.stringify(mapping),
      ]
    );

    const importId = importLog.rows[0].id;
    let inserted = 0;
    const errors: unknown[] = [];

    for (const row of rows) {
      try {
        await insertDynamicRecord(req.params.appId, tableName, req.user?.userId, row);
        inserted++;
      } catch (e) {
        errors.push({ row, error: String(e) });
      }
    }

    // Update status
    await query(
      `UPDATE csv_imports SET status = $1, row_count = $2 WHERE id = $3`,
      [errors.length === 0 ? 'completed' : 'partial', inserted, importId]
    );

    res.json({
      importId,
      inserted,
      failed: errors.length,
      total: rows.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: 'CSV import failed' });
  }
});

// ─── List imports ─────────────────────────────────────────────────────────────
router.get('/:appId/csv/imports', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, filename, table_name, row_count, column_mapping, status, error_message, created_at
       FROM csv_imports WHERE app_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 50`,
      [req.params.appId, req.user!.userId]
    );
    res.json({ imports: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list imports' });
  }
});

export default router;
