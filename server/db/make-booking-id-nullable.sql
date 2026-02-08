-- Migration: Make booking_id nullable in reviews table to support backfilled reviews
-- This allows reviews from before the platform existed (without associated bookings)

BEGIN;

-- Step 1: Drop the unique constraint that includes booking_id
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_reviewer_id_key;

-- Step 2: Drop the foreign key constraint
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;

-- Step 3: Make booking_id nullable
ALTER TABLE reviews ALTER COLUMN booking_id DROP NOT NULL;

-- Step 4: Re-add the foreign key constraint (now nullable)
ALTER TABLE reviews ADD CONSTRAINT reviews_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Step 5: Create a partial unique index that only applies when booking_id is NOT NULL
-- This prevents duplicate reviews for the same booking, but allows multiple NULL booking_ids
CREATE UNIQUE INDEX idx_reviews_unique_booking_reviewer
  ON reviews(booking_id, reviewer_id)
  WHERE booking_id IS NOT NULL;

COMMIT;
