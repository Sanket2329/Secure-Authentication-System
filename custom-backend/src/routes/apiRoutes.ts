import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { FileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes below
router.use(authenticate);

// User Profile
router.get('/me', UserController.getMe);

// Files
router.get('/files', FileController.getFiles);
router.get('/files/:id', FileController.getFile);
router.get('/files/:id/download', FileController.downloadFile);

export default router;
