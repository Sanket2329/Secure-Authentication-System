import { query } from '../config/db';

export interface FileRecord {
  id: string;
  owner_id: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_path: string;
  created_at: Date;
}

export class FileModel {
  static async findByOwnerId(ownerId: string): Promise<FileRecord[]> {
    const res = await query('SELECT * FROM files WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
    return res.rows;
  }

  static async findById(id: string): Promise<FileRecord | null> {
    const res = await query('SELECT * FROM files WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(ownerId: string, filename: string, mimeType: string, size: number, storagePath: string): Promise<FileRecord> {
    const res = await query(
      'INSERT INTO files (owner_id, filename, mime_type, size, storage_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [ownerId, filename, mimeType, size, storagePath]
    );
    return res.rows[0];
  }
}
