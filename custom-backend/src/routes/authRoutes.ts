import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for login (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many failed login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
