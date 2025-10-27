const db = require('../config/database');

const migrations = [
  // Create users table
  `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'ambassador')),
      name VARCHAR(255) NOT NULL,
      profile_photo VARCHAR(500),
      bio TEXT,
      location VARCHAR(255),
      age INTEGER,
      skills TEXT[],
      hourly_rate INTEGER,
      availability VARCHAR(50),
      rating DECIMAL(3,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Create index on email for faster lookups
  `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `,

  // Create index on role for filtering
  `
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `,

  // Create likes table
  `
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_id, ambassador_id),
      CHECK (brand_id != ambassador_id)
    );
  `,

  // Create indexes for likes
  `
    CREATE INDEX IF NOT EXISTS idx_likes_brand ON likes(brand_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_likes_ambassador ON likes(ambassador_id);
  `,

  // Create matches table
  `
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_id, ambassador_id),
      CHECK (brand_id != ambassador_id)
    );
  `,

  // Create indexes for matches
  `
    CREATE INDEX IF NOT EXISTS idx_matches_brand ON matches(brand_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_matches_ambassador ON matches(ambassador_id);
  `,

  // Create passes table (track when brands pass/dislike ambassadors)
  `
    CREATE TABLE IF NOT EXISTS passes (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_id, ambassador_id),
      CHECK (brand_id != ambassador_id)
    );
  `,

  // Create indexes for passes
  `
    CREATE INDEX IF NOT EXISTS idx_passes_brand ON passes(brand_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_passes_ambassador ON passes(ambassador_id);
  `,

  // Create messages table
  `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Create indexes for messages
  `
    CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `,

  // Add status column to likes table for request workflow
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'likes' AND column_name = 'status') THEN
        ALTER TABLE likes ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
      END IF;
    END $$;
  `,

  // Add check constraint for status column
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                     WHERE constraint_name = 'likes_status_check') THEN
        ALTER TABLE likes ADD CONSTRAINT likes_status_check
        CHECK (status IN ('pending', 'accepted', 'declined'));
      END IF;
    END $$;
  `,

  // Create index on status for faster filtering
  `
    CREATE INDEX IF NOT EXISTS idx_likes_status ON likes(status);
  `,
];

async function runMigrations() {
  const client = await db.pool.connect();

  try {
    console.log('Starting database migrations...');

    await client.query('BEGIN');

    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }

    await client.query('COMMIT');

    console.log('✓ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
