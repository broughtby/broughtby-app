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

  // Create bookings table
  `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_name VARCHAR(200) NOT NULL,
      event_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      duration NUMERIC(5,2) NOT NULL,
      event_location TEXT NOT NULL,
      hourly_rate NUMERIC(10,2) NOT NULL,
      total_cost NUMERIC(10,2) NOT NULL,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (brand_id != ambassador_id),
      CHECK (end_time > start_time),
      CHECK (duration > 0),
      CHECK (total_cost >= 0),
      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
    );
  `,

  // Create indexes for bookings
  `
    CREATE INDEX IF NOT EXISTS idx_bookings_match ON bookings(match_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_bookings_ambassador ON bookings(ambassador_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  `,

  // Add is_admin column for admin user impersonation feature
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `,

  // Create index on is_admin for faster admin checks
  `
    CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
  `,

  // Set team@luxewellness.com as admin
  `
    UPDATE users SET is_admin = TRUE WHERE email = 'team@luxewellness.com';
  `,

  // Add time tracking columns to bookings table
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'bookings' AND column_name = 'checked_in_at') THEN
        ALTER TABLE bookings ADD COLUMN checked_in_at TIMESTAMP;
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'bookings' AND column_name = 'checked_out_at') THEN
        ALTER TABLE bookings ADD COLUMN checked_out_at TIMESTAMP;
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'bookings' AND column_name = 'actual_hours') THEN
        ALTER TABLE bookings ADD COLUMN actual_hours NUMERIC(10,2);
      END IF;
    END $$;
  `,

  // Add password reset token columns to users table
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'reset_token') THEN
        ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'reset_token_expires') THEN
        ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
      END IF;
    END $$;
  `,

  // Add is_active column to users table for account status management
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
      END IF;
    END $$;
  `,

  // Create index on is_active for faster filtering
  `
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
  `,

  // Add is_test column to users table for marking test/demo accounts
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_test') THEN
        ALTER TABLE users ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `,

  // Create index on is_test for faster filtering
  `
    CREATE INDEX IF NOT EXISTS idx_users_is_test ON users(is_test);
  `,

  // Create reviews table
  `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_role VARCHAR(20) NOT NULL CHECK (reviewer_role IN ('brand', 'ambassador')),

      overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
      would_work_again BOOLEAN,
      comment TEXT,

      punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
      professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
      engagement_rating INTEGER CHECK (engagement_rating BETWEEN 1 AND 5),

      clear_expectations_rating INTEGER CHECK (clear_expectations_rating BETWEEN 1 AND 5),
      onsite_support_rating INTEGER CHECK (onsite_support_rating BETWEEN 1 AND 5),
      respectful_treatment_rating INTEGER CHECK (respectful_treatment_rating BETWEEN 1 AND 5),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(booking_id, reviewer_id),
      CHECK (reviewer_id != reviewee_id)
    );
  `,

  // Create indexes for reviews
  `
    CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
  `,

  // Add company-specific fields for brand users
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'company_name') THEN
        ALTER TABLE users ADD COLUMN company_name VARCHAR(255);
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'company_logo') THEN
        ALTER TABLE users ADD COLUMN company_logo TEXT;
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'company_website') THEN
        ALTER TABLE users ADD COLUMN company_website VARCHAR(255);
      END IF;
    END $$;
  `,

  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'contact_title') THEN
        ALTER TABLE users ADD COLUMN contact_title VARCHAR(255);
      END IF;
    END $$;
  `,

  // Add is_preview column for YC preview brand accounts
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_preview') THEN
        ALTER TABLE users ADD COLUMN is_preview BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `,

  // Create index on is_preview for faster filtering
  `
    CREATE INDEX IF NOT EXISTS idx_users_is_preview ON users(is_preview);
  `,

  // Add is_preview_ambassador column for test ambassador in preview mode
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'is_preview_ambassador') THEN
        ALTER TABLE users ADD COLUMN is_preview_ambassador BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `,

  // Create index on is_preview_ambassador for faster filtering
  `
    CREATE INDEX IF NOT EXISTS idx_users_is_preview_ambassador ON users(is_preview_ambassador);
  `,

  // Update role constraint to include account_manager
  `
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('brand', 'ambassador', 'account_manager'));
  `,

  // Add monthly_rate column for account managers
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'users' AND column_name = 'monthly_rate') THEN
        ALTER TABLE users ADD COLUMN monthly_rate NUMERIC(10,2);
      END IF;
    END $$;
  `,

  // Create engagements table for monthly retainer model
  `
    CREATE TABLE IF NOT EXISTS engagements (
      id SERIAL PRIMARY KEY,
      match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
      brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      monthly_rate NUMERIC(10,2) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (brand_id != account_manager_id),
      CHECK (status IN ('active', 'paused', 'ended'))
    );
  `,

  // Create indexes for engagements
  `
    CREATE INDEX IF NOT EXISTS idx_engagements_brand ON engagements(brand_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_engagements_am ON engagements(account_manager_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_engagements_match ON engagements(match_id);
  `,

  // Add audit trail columns to likes table
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'likes' AND column_name = 'created_by_am_id') THEN
        ALTER TABLE likes ADD COLUMN created_by_am_id INTEGER REFERENCES users(id);
      END IF;
    END $$;
  `,

  // Add audit trail columns to bookings table
  `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'bookings' AND column_name = 'created_by_am_id') THEN
        ALTER TABLE bookings ADD COLUMN created_by_am_id INTEGER REFERENCES users(id);
      END IF;
    END $$;
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
