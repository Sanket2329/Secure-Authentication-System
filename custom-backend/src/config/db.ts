import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Test the connection
pool.on('connect', () => {
  if (env.NODE_ENV !== 'test') {
    console.log('📦 Connected to PostgreSQL database');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Generic query helper
 */
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
