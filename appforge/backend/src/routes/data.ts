import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import {
  insertDynamicRecord,
  getDynamicRecords,
  getDynamicRecord,
  updateDynamicRecord,
  deleteDynamicRecord,
} from '../services/schemaService';

const router = Router();

// Middleware: verify app belongs to user (or is published)
async function resolveApp(req: Request, res: Response, next: () => void): Promise<void> {
  try {
    const result = await query(
      'SELECT id, config, user_id, is_published FROM app_configs WHERE id = $1',
      [req.params.appId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    const app = result.rows[0];
    // Allow access if owner or app is published
    if (app.user_id !== req.user?.userId && !app.is_published) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve app' });
  }
}

// ─── List records ─────────────────────────────────────────────────────────────
router.get('/:appId/data/:tableName', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const filters: Record<string, unknown> = {};

    // Extract filters from query params (prefix "filter_")
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith('filter_')) {
        filters[key.slice(7)] = value;
      }
    }

    const { rows, total } = await getDynamicRecords(appId, tableName, req.user?.userId, filters, limit, offset);
    res.json({ rows, total, limit, offset });
  } catch (err) {
    console.error('List records error:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// ─── Get single record ────────────────────────────────────────────────────────
router.get('/:appId/data/:tableName/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName, id } = req.params;
    const record = await getDynamicRecord(appId, tableName, id, req.user?.userId);
    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    res.json(record);
  } catch (err) {
    console.error('Get record error:', err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// ─── Create record ────────────────────────────────────────────────────────────
router.post('/:appId/data/:tableName', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName } = req.params;
    const data = req.body;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      res.status(400).json({ error: 'Request body must be a JSON object' });
      return;
    }

    const record = await insertDynamicRecord(appId, tableName, req.user?.userId, data);
    res.status(201).json(record);
  } catch (err) {
    console.error('Create record error:', err);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// ─── Update record ────────────────────────────────────────────────────────────
router.put('/:appId/data/:tableName/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName, id } = req.params;
    const updated = await updateDynamicRecord(appId, tableName, id, req.body, req.user?.userId);
    if (!updated) {
      res.status(404).json({ error: 'Record not found or access denied' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Update record error:', err);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// ─── Delete record ────────────────────────────────────────────────────────────
router.delete('/:appId/data/:tableName/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName, id } = req.params;
    const deleted = await deleteDynamicRecord(appId, tableName, id, req.user?.userId);
    if (!deleted) {
      res.status(404).json({ error: 'Record not found or access denied' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete record error:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ─── Bulk import (from CSV) ───────────────────────────────────────────────────
router.post('/:appId/data/:tableName/bulk', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, tableName } = req.params;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: 'records must be a non-empty array' });
      return;
    }

    const inserted: unknown[] = [];
    const errors: unknown[] = [];

    for (const record of records.slice(0, 1000)) {
      try {
        const r = await insertDynamicRecord(appId, tableName, req.user?.userId, record);
        inserted.push(r);
      } catch (e) {
        errors.push({ record, error: String(e) });
      }
    }

    res.json({ inserted: inserted.length, errors: errors.length, errorDetails: errors.slice(0, 10) });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

export default router;
