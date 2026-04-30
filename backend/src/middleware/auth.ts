import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyFirebaseToken } from '../config/firebase';
import { query } from '../db/pool';
import { JWTPayload } from '../types';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  // Try JWT first
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
    req.user = payload;
    return next();
  } catch {
    // JWT failed, try Firebase
  }

  // Try Firebase token
  const firebaseDecoded = await verifyFirebaseToken(token);
  if (firebaseDecoded) {
    try {
      const result = await query('SELECT id, email, role FROM users WHERE firebase_uid = $1', [firebaseDecoded.uid]);
      if (result.rows.length > 0) {
        req.user = {
          userId: result.rows[0].id,
          email: result.rows[0].email,
          role: result.rows[0].role,
        };
        return next();
      }
    } catch {
      // DB lookup failed
    }
  }

  res.status(401).json({ error: 'Invalid or expired token' });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
    req.user = payload;
  } catch {
    // Ignore auth errors for optional routes
  }
  next();
}
