import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { RefreshSessionModel } from '../models/RefreshSession';
import { TokenService } from '../services/tokenService';
import { registerSchema, loginSchema } from '../utils/validation';
import { env } from '../config/env';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      await UserModel.create(email, passwordHash);

      return res.status(201).json({ success: true, message: 'Registration successful' });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Generic error to prevent email enumeration
      const genericError = 'Invalid email or password';

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: genericError });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: genericError });
      }

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateOpaqueRefreshToken();

      // Store refresh token as hash in DB
      const tokenHash = TokenService.hashToken(refreshToken);
      const expiresAt = TokenService.getRefreshTokenExpiry();
      
      await RefreshSessionModel.create(user.id, tokenHash, expiresAt);

      // Set Refresh Token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        token: accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;
      
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
      }

      const tokenHash = TokenService.hashToken(refreshToken);
      const session = await RefreshSessionModel.findByTokenHash(tokenHash);

      if (!session) {
        // Token doesn't exist at all
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }

      // Check if session has expired
      if (new Date() > session.expires_at) {
        return res.status(401).json({ success: false, message: 'Refresh token expired' });
      }

      // ANOMALY DETECTION: If the token is already revoked but someone is trying to use it again,
      // it means the token was likely stolen. Revoke ALL active sessions for this user.
      if (session.revoked) {
        console.warn(`🚨 SECURITY ALERT: Attempted reuse of revoked token for user ${session.user_id}`);
        await RefreshSessionModel.revokeAllUserSessions(session.user_id);
        res.clearCookie('refreshToken');
        return res.status(401).json({ success: false, message: 'Security anomaly detected. All sessions revoked. Please log in again.' });
      }

      // Valid token. Implement Rotation:
      // 1. Revoke the old token
      await RefreshSessionModel.revokeSession(session.id);

      // 2. Issue a new Refresh Token and Access Token
      const newAccessToken = TokenService.generateAccessToken(session.user_id);
      const newRefreshToken = TokenService.generateOpaqueRefreshToken();

      // 3. Store new token hash in DB
      const newTokenHash = TokenService.hashToken(newRefreshToken);
      const expiresAt = TokenService.getRefreshTokenExpiry();
      await RefreshSessionModel.create(session.user_id, newTokenHash, expiresAt);

      // 4. Set new cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        token: newAccessToken,
      });

    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;
      
      if (refreshToken) {
        // Hash token to find in DB
        const tokenHash = TokenService.hashToken(refreshToken);
        const session = await RefreshSessionModel.findByTokenHash(tokenHash);
        
        if (session) {
          // Invalidate session
          await RefreshSessionModel.revokeSession(session.id);
        }
      }

      // Clear cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}
