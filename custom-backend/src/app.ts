import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';

const app = express();

// Security middlewares
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/apiRoutes';

// Parsers
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/', authRoutes);
app.use('/', apiRoutes);

// Basic healthcheck route
app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Server is healthy' });
});

// Centralized error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Fallback generic error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
