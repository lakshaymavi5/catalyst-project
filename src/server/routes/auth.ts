import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, User } from '../db/index.js';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply auth rate limiter
router.use(authLimiter);

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body; // identifier = email or phone

    if (!identifier || !password) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_FIELDS',
        message: 'Please provide both your email/phone and password.'
      });
      return;
    }

    // Try finding by email first, then by phone
    let user: User | null = null;
    if (identifier.includes('@')) {
      user = await db.getUserByEmail(identifier.trim().toLowerCase());
    } else {
      user = await db.getUserByPhone(identifier.trim());
      if (!user) {
        user = await db.getUserByEmail(identifier.trim().toLowerCase());
      }
    }

    if (!user) {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email/phone or password.'
      });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email/phone or password.'
      });
      return;
    }

    const token = generateToken(user);

    // Set secure HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.full_name,
          role: user.role || 'customer',
          shopName: user.shop_name,
          shopAddress: user.shop_address,
          shopCity: user.shop_city,
          shopPin: user.shop_pin,
          shopPhone: user.shop_phone
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'LOGIN_FAILED',
      message: err.message || 'Login failed.'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      phone,
      fullName,
      password,
      role = 'customer',
      shopName,
      shopAddress,
      shopCity,
      shopPin,
      shopPhone
    } = req.body;

    if (!email || !phone || !fullName || !password) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_FIELDS',
        message: 'All fields (email, phone, full name, password) are required.'
      });
      return;
    }

    if (role === 'repairman' && (!shopName || !shopAddress)) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_WORKSHOP_FIELDS',
        message: 'Workshop name and physical shop address are required for repair specialists.'
      });
      return;
    }

    // Check existing
    const existingEmail = await db.getUserByEmail(email.trim().toLowerCase());
    if (existingEmail) {
      res.status(409).json({
        status: 'error',
        code: 'EMAIL_EXISTS',
        message: 'An account with this email address already exists.'
      });
      return;
    }

    const existingPhone = await db.getUserByPhone(phone.trim());
    if (existingPhone) {
      res.status(409).json({
        status: 'error',
        code: 'PHONE_EXISTS',
        message: 'An account with this phone number already exists.'
      });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = await db.createUser({
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password_hash: passwordHash,
      full_name: fullName.trim(),
      role: role === 'repairman' ? 'repairman' : 'customer',
      shop_name: shopName?.trim(),
      shop_address: shopAddress?.trim(),
      shop_city: shopCity?.trim(),
      shop_pin: shopPin?.trim(),
      shop_phone: shopPhone?.trim() || phone.trim()
    });

    const token = generateToken(newUser);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          fullName: newUser.full_name,
          role: newUser.role,
          shopName: newUser.shop_name,
          shopAddress: newUser.shop_address,
          shopCity: newUser.shop_city,
          shopPin: newUser.shop_pin,
          shopPhone: newUser.shop_phone
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'REGISTRATION_FAILED',
      message: err.message || 'Registration failed.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({
    status: 'success',
    message: 'Signed out successfully.'
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
        role: user.role || 'customer',
        shopName: user.shop_name,
        shopAddress: user.shop_address,
        shopCity: user.shop_city,
        shopPin: user.shop_pin,
        shopPhone: user.shop_phone
      }
    }
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({
      status: 'error',
      code: 'MISSING_IDENTIFIER',
      message: 'Please provide your registered email or phone.'
    });
    return;
  }

  // Real mock recovery flow
  res.json({
    status: 'success',
    message: `Password reset instructions have been dispatched to ${identifier}. If an account exists, you will receive a secure verification link.`
  });
});

export default router;
