import { query } from '../config/db';

export interface RefreshSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export class RefreshSessionModel {
  static async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshSession> {
    const res = await query(
      'INSERT INTO refresh_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, tokenHash, expiresAt]
    );
    return res.rows[0];
  }

  static async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const res = await query('SELECT * FROM refresh_sessions WHERE token_hash = $1', [tokenHash]);
    return res.rows[0] || null;
  }

  static async revokeSession(id: string): Promise<void> {
    await query('UPDATE refresh_sessions SET revoked = true WHERE id = $1', [id]);
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await query('UPDATE refresh_sessions SET revoked = true WHERE user_id = $1', [userId]);
  }
}
