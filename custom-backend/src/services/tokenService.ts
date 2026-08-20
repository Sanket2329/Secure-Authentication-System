import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export class TokenService {
  /**
   * Generates a short-lived JWT access token
   */
  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  /**
   * Generates a cryptographically secure opaque refresh token
   */
  static generateOpaqueRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Hashes a token for secure database storage
   */
  static hashToken(token: string): string {
    return crypto
      .createHmac('sha256', env.REFRESH_TOKEN_SECRET)
      .update(token)
      .digest('hex');
  }

  /**
   * Calculates the expiration date for a refresh token
   */
  static getRefreshTokenExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);
    return expiresAt;
  }
}
