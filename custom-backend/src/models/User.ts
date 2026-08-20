import { query } from '../config/db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(email: string, passwordHash: string): Promise<User> {
    const res = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return res.rows[0];
  }
}
