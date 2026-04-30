import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { sanitizeConfig, validateConfig } from '../utils/configValidator';

const router = Router();

// ─── Create app config ────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawConfig = req.body;
    const sanitized = sanitizeConfig(rawConfig);
    const { valid, errors, warnings } = validateConfig(sanitized);

    if (!valid) {
      res.status(400).json({ error: 'Invalid config', details: errors });
      return;
    }

    const result = await query(
      `INSERT INTO app_configs (user_id, name, description, config, version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, config, version, is_published, created_at`,
      [
        req.user!.userId,
        sanitized.name,
        sanitized.description || '',
        JSON.stringify(sanitized),
        sanitized.version || '1.0.0',
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      warnings,
    });
  } catch (err) {
    console.error('Create app error:', err);
    res.status(500).json({ error: 'Failed to create app' });
  }
});

// ─── List user's apps ─────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, version, is_published, published_url, github_repo, created_at, updated_at
       FROM app_configs WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user!.userId]
    );
    res.json({ apps: result.rows });
  } catch (err) {
    console.error('List apps error:', err);
    res.status(500).json({ error: 'Failed to list apps' });
  }
});

// ─── Get app config ───────────────────────────────────────────────────────────
router.get('/:appId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, config, version, is_published, published_url, github_repo, created_at, updated_at
       FROM app_configs WHERE id = $1 AND user_id = $2`,
      [req.params.appId, req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get app error:', err);
    res.status(500).json({ error: 'Failed to get app' });
  }
});

// ─── Update app config ────────────────────────────────────────────────────────
router.put('/:appId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const sanitized = sanitizeConfig(req.body);
    const { valid, errors, warnings } = validateConfig(sanitized);

    if (!valid) {
      res.status(400).json({ error: 'Invalid config', details: errors });
      return;
    }

    const result = await query(
      `UPDATE app_configs
       SET name = $1, description = $2, config = $3, version = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, name, description, config, version, updated_at`,
      [
        sanitized.name,
        sanitized.description || '',
        JSON.stringify(sanitized),
        sanitized.version || '1.0.0',
        req.params.appId,
        req.user!.userId,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json({ ...result.rows[0], warnings });
  } catch (err) {
    console.error('Update app error:', err);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// ─── Delete app ───────────────────────────────────────────────────────────────
router.delete('/:appId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM app_configs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.appId, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json({ success: true, deletedId: result.rows[0].id });
  } catch (err) {
    console.error('Delete app error:', err);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// ─── Validate config only ─────────────────────────────────────────────────────
router.post('/validate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const sanitized = sanitizeConfig(req.body);
  const result = validateConfig(sanitized);
  res.json({ sanitized, ...result });
});

export default router;
