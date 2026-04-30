import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool';
import { verifyFirebaseToken, getFirebaseUser } from '../config/firebase';
import { authMiddleware } from '../middleware/auth';
import { sendWelcomeEmail } from '../services/emailService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── Register (email/password) ───────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, role, created_at`,
      [email.toLowerCase(), passwordHash, displayName || email.split('@')[0]]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.display_name).catch(() => {});

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login (email/password) ───────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await query(
      'SELECT id, email, password_hash, display_name, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: 'Please use Google or GitHub login for this account' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Firebase OAuth (Google/GitHub) ──────────────────────────────────────────
router.post('/firebase', async (req: Request, res: Response): Promise<void> => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      res.status(400).json({ error: 'Firebase token is required' });
      return;
    }

    const decoded = await verifyFirebaseToken(firebaseToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid Firebase token' });
      return;
    }

    const firebaseUser = await getFirebaseUser(decoded.uid);

    // Upsert user
    const result = await query(
      `INSERT INTO users (email, firebase_uid, display_name, avatar_url, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET
         firebase_uid = EXCLUDED.firebase_uid,
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         email_verified = EXCLUDED.email_verified,
         updated_at = NOW()
       RETURNING id, email, display_name, role`,
      [
        decoded.email || '',
        decoded.uid,
        firebaseUser?.displayName || decoded.name || decoded.email?.split('@')[0],
        firebaseUser?.photoURL || decoded.picture,
        decoded.email_verified || false,
      ]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Firebase auth error:', err);
    res.status(500).json({ error: 'Firebase authentication failed' });
  }
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT id, email, display_name, role, avatar_url, locale, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      locale: user.locale,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ─── Update profile ───────────────────────────────────────────────────────────
router.put('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayName, locale } = req.body;
    const result = await query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        locale = COALESCE($2, locale),
        updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, display_name, role, locale`,
      [displayName, locale, req.user!.userId]
    );
    const user = result.rows[0];
    res.json({ id: user.id, email: user.email, displayName: user.display_name, locale: user.locale });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
