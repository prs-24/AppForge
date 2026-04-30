import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authMiddleware } from '../middleware/auth';
import { sendNotificationEmail } from '../services/emailService';

const router = Router();

// ─── Create notification (trigger from app events) ────────────────────────────
router.post('/trigger', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId, title, message, type, targetUserId, sendEmail } = req.body;

    const userId = targetUserId || req.user!.userId;

    const result = await query(
      `INSERT INTO notifications (user_id, app_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, message, type, is_read, created_at`,
      [userId, appId || null, title, message, type || 'info']
    );

    // Send email notification if requested
    if (sendEmail) {
      const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        sendNotificationEmail(userResult.rows[0].email, title, message).catch(() => {});
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ─── List user notifications ──────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [req.user!.userId];

    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }

    const result = await query(
      `SELECT id, app_id, title, message, type, is_read, metadata, created_at
       FROM notifications ${whereClause}
       ORDER BY created_at DESC LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user!.userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── Mark as read ─────────────────────────────────────────────────────────────
router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ─── Mark all as read ─────────────────────────────────────────────────────────
router.put('/read-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING id',
      [req.user!.userId]
    );
    res.json({ success: true, updated: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
