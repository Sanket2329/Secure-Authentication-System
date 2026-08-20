import app from './app';
import { env } from './config/env';
import { pool } from './config/db';

const PORT = env.PORT || 3000;

async function startServer() {
  try {
    // Verify DB connection before starting
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
