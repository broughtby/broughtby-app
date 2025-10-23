-- Delete only the originally seeded sample data
-- This will preserve all manually created users, matches, and messages

-- Seeded Ambassadors (7 users)
-- sarah.wellness@example.com
-- marcus.tech@example.com
-- emma.fashion@example.com
-- james.fitness@example.com
-- olivia.food@example.com
-- alex.travel@example.com
-- sophia.beauty@example.com

-- Seeded Brands (7 users)
-- team@luxewellness.com
-- partnerships@techfusion.com
-- brand@ecochic.com
-- hello@fitforge.com
-- contact@greenbite.com
-- team@wanderluxe.com
-- info@glownatural.com

BEGIN;

-- First, delete related data (messages, matches, likes) for seeded users
-- This ensures foreign key constraints are satisfied

DELETE FROM messages
WHERE match_id IN (
  SELECT id FROM matches
  WHERE brand_id IN (
    SELECT id FROM users WHERE email IN (
      'team@luxewellness.com',
      'partnerships@techfusion.com',
      'brand@ecochic.com',
      'hello@fitforge.com',
      'contact@greenbite.com',
      'team@wanderluxe.com',
      'info@glownatural.com'
    )
  )
  OR ambassador_id IN (
    SELECT id FROM users WHERE email IN (
      'sarah.wellness@example.com',
      'marcus.tech@example.com',
      'emma.fashion@example.com',
      'james.fitness@example.com',
      'olivia.food@example.com',
      'alex.travel@example.com',
      'sophia.beauty@example.com'
    )
  )
);

DELETE FROM matches
WHERE brand_id IN (
  SELECT id FROM users WHERE email IN (
    'team@luxewellness.com',
    'partnerships@techfusion.com',
    'brand@ecochic.com',
    'hello@fitforge.com',
    'contact@greenbite.com',
    'team@wanderluxe.com',
    'info@glownatural.com'
  )
)
OR ambassador_id IN (
  SELECT id FROM users WHERE email IN (
    'sarah.wellness@example.com',
    'marcus.tech@example.com',
    'emma.fashion@example.com',
    'james.fitness@example.com',
    'olivia.food@example.com',
    'alex.travel@example.com',
    'sophia.beauty@example.com'
  )
);

DELETE FROM likes
WHERE brand_id IN (
  SELECT id FROM users WHERE email IN (
    'team@luxewellness.com',
    'partnerships@techfusion.com',
    'brand@ecochic.com',
    'hello@fitforge.com',
    'contact@greenbite.com',
    'team@wanderluxe.com',
    'info@glownatural.com'
  )
)
OR ambassador_id IN (
  SELECT id FROM users WHERE email IN (
    'sarah.wellness@example.com',
    'marcus.tech@example.com',
    'emma.fashion@example.com',
    'james.fitness@example.com',
    'olivia.food@example.com',
    'alex.travel@example.com',
    'sophia.beauty@example.com'
  )
);

-- Finally, delete the seeded users
DELETE FROM users
WHERE email IN (
  -- Seeded Ambassadors
  'sarah.wellness@example.com',
  'marcus.tech@example.com',
  'emma.fashion@example.com',
  'james.fitness@example.com',
  'olivia.food@example.com',
  'alex.travel@example.com',
  'sophia.beauty@example.com',
  -- Seeded Brands
  'team@luxewellness.com',
  'partnerships@techfusion.com',
  'brand@ecochic.com',
  'hello@fitforge.com',
  'contact@greenbite.com',
  'team@wanderluxe.com',
  'info@glownatural.com'
);

-- Show summary of what remains
SELECT
  role,
  COUNT(*) as count
FROM users
GROUP BY role;

COMMIT;

-- Success message
SELECT 'Seeded sample data has been deleted. All manually created data has been preserved.' AS message;
