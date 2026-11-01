import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'device-repair-assistant-secure-dev-secret-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access this step.'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    const user = await db.getUserById(decoded.sub);

    if (!user) {
      res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'The authenticated user session could not be located.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please sign in again.'
    });
  }
}
