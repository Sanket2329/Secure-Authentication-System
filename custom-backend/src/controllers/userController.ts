import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Never return password hash!
      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
