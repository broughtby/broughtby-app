-- Create passes table to track when brands pass/dislike ambassadors
-- This allows us to show "Passed" status badges in the UI

BEGIN;

CREATE TABLE IF NOT EXISTS passes (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, ambassador_id),
  CHECK (brand_id != ambassador_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_passes_brand ON passes(brand_id);
CREATE INDEX idx_passes_ambassador ON passes(ambassador_id);

COMMIT;

SELECT 'Passes table created successfully.' AS message;
