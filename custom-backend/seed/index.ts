import { UserModel } from '../src/models/User';
import { FileModel } from '../src/models/File';
import { query } from '../src/config/db';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Clean up existing data
    await query('TRUNCATE users CASCADE');
    console.log('🧹 Cleaned existing data');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Seed Users
    const passwordHash = await bcrypt.hash('Password123!', 12);
    
    const alice = await UserModel.create('alice@example.com', passwordHash);
    const bob = await UserModel.create('bob@example.com', passwordHash);
    const charlie = await UserModel.create('charlie@example.com', passwordHash);
    
    console.log('👥 Created users: Alice, Bob, Charlie');

    // Helper to create mock physical file
    const createPhysicalFile = (filename: string, content: string) => {
      const storagePath = `${Date.now()}_${filename}`;
      const fullPath = path.join(uploadsDir, storagePath);
      fs.writeFileSync(fullPath, content);
      return { storagePath, size: Buffer.byteLength(content) };
    };

    // Seed Alice's files
    const aliceFile1 = createPhysicalFile('alice_report.pdf', 'Alice secret report content');
    await FileModel.create(alice.id, 'alice_report.pdf', 'application/pdf', aliceFile1.size, aliceFile1.storagePath);
    
    // Seed Bob's files
    const bobFile1 = createPhysicalFile('bob_image.png', 'fake image data');
    await FileModel.create(bob.id, 'bob_image.png', 'image/png', bobFile1.size, bobFile1.storagePath);

    // Seed Charlie's files
    const charlieFile1 = createPhysicalFile('charlie_notes.txt', 'Charlie top secret notes');
    await FileModel.create(charlie.id, 'charlie_notes.txt', 'text/plain', charlieFile1.size, charlieFile1.storagePath);

    console.log('📁 Created files and assigned ownership');
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
