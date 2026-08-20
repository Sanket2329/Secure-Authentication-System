import { Request, Response, NextFunction } from 'express';
import { FileModel } from '../models/File';
import path from 'path';
import fs from 'fs';

export class FileController {
  static async getFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const files = await FileModel.findByOwnerId(userId);

      return res.status(200).json({
        success: true,
        data: files.map(f => ({
          id: f.id,
          filename: f.filename,
          mimeType: f.mime_type,
          size: f.size,
          createdAt: f.created_at,
          downloadUrl: `/api/files/${f.id}/download`
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const fileId = req.params.id;

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const file = await FileModel.findById(fileId);

      // Explicitly handle 404
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Explicitly handle 403
      if (file.owner_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this file' });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: file.id,
          filename: file.filename,
          mimeType: file.mime_type,
          size: file.size,
          createdAt: file.created_at,
          downloadUrl: `/api/files/${file.id}/download`
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const fileId = req.params.id;

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const file = await FileModel.findById(fileId);

      // 404 vs 403 Logic
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }
      if (file.owner_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      // Secure Path generation - prevent path traversal by using absolute safe path
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      const safePath = path.resolve(uploadsDir, file.storage_path);

      if (!safePath.startsWith(uploadsDir)) {
        return res.status(400).json({ success: false, message: 'Invalid file path' });
      }

      if (!fs.existsSync(safePath)) {
         return res.status(404).json({ success: false, message: 'File not found on disk' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', file.mime_type);
      
      const fileStream = fs.createReadStream(safePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
