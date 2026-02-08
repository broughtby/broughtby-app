# Backfilling Reviews with NULL booking_id

This guide explains how to support reviews from before the platform existed (reviews without associated bookings).

## Problem

The `reviews` table originally had `booking_id` as `NOT NULL`, which prevented inserting historical reviews from before the platform. Additionally, reviews with NULL `booking_id` were being excluded from the API due to an `INNER JOIN` on the bookings table.

## Solution

### 1. Run the Database Migration

Apply the migration to make `booking_id` nullable:

```bash
psql -d broughtby -f server/db/make-booking-id-nullable.sql
```

This migration:
- Makes `booking_id` nullable in the `reviews` table
- Removes the old unique constraint
- Creates a partial unique index (only applies when `booking_id` IS NOT NULL)
- Maintains referential integrity with a nullable foreign key

### 2. Insert Backfilled Reviews

Now you can insert reviews without a booking:

```sql
INSERT INTO reviews (
  booking_id,           -- Can be NULL for backfilled reviews
  reviewer_id,          -- User ID of the reviewer
  reviewee_id,          -- User ID being reviewed
  reviewer_role,        -- 'brand' or 'ambassador'
  overall_rating,       -- 1-5 rating
  would_work_again,     -- Optional: true/false
  comment,              -- Optional: review text
  punctuality_rating,   -- For brand→ambassador reviews (1-5)
  professionalism_rating, -- For brand→ambassador reviews (1-5)
  engagement_rating,    -- For brand→ambassador reviews (1-5)
  clear_expectations_rating, -- For ambassador→brand reviews (1-5)
  onsite_support_rating, -- For ambassador→brand reviews (1-5)
  respectful_treatment_rating -- For ambassador→brand reviews (1-5)
)
VALUES (
  NULL,                 -- NULL booking_id for backfilled review
  1,                    -- reviewer_id
  2,                    -- reviewee_id
  'brand',              -- reviewer_role
  5,                    -- overall_rating
  true,                 -- would_work_again
  'Great experience!',  -- comment
  5, 5, 5,              -- brand→ambassador ratings
  NULL, NULL, NULL      -- ambassador→brand ratings (NULL if not applicable)
);
```

### 3. Recalculate Ratings

After inserting backfilled reviews, recalculate all user ratings:

```bash
node server/db/recalculate-ratings.js
```

This script:
- Calculates the average `overall_rating` for all users with reviews
- Updates each user's `rating` field in the `users` table
- Includes reviews with both NULL and non-NULL `booking_id`
- Resets rating to 0 for users with no reviews

## What Changed in the Code

### Database Schema
- `reviews.booking_id` is now nullable
- Partial unique index ensures uniqueness only when `booking_id` IS NOT NULL

### API Endpoints
- `GET /api/reviews/user/:userId` now uses `LEFT JOIN` instead of `INNER JOIN` on bookings
- This ensures reviews with NULL `booking_id` are included in the response

### Rating Calculation
- `updateUserRating()` function already calculates average from ALL reviews
- No changes needed - it naturally includes reviews regardless of `booking_id`
- Called automatically when new reviews are created via the API

### Discover Page
- Already pulls `rating` from `users` table
- Will display updated ratings after recalculation

## Important Notes

1. **The `createReview` API endpoint still requires a booking** - this is intentional. The API is for users creating reviews for completed bookings. Backfilled reviews should be inserted directly via SQL.

2. **Multiple NULL booking_ids are allowed** - Unlike non-NULL booking_ids (which have a unique constraint), you can have multiple reviews with NULL `booking_id` from the same reviewer. This is by design for backfilled data.

3. **Rating updates are automatic for API-created reviews** - When users create reviews via the API, ratings are recalculated automatically. Only backfilled reviews require running the recalculation script.

4. **Event information optional** - For backfilled reviews, `event_name` and `event_date` will be NULL since there's no associated booking. The frontend handles this gracefully.

## Verification

After migration and backfilling, verify:

1. Reviews appear on ambassador profiles (including those with NULL booking_id)
2. Ratings are correctly calculated and displayed in Discover grid
3. Average rating includes all reviews regardless of booking_id

```sql
-- Check reviews with NULL booking_id
SELECT * FROM reviews WHERE booking_id IS NULL;

-- Verify rating calculation for a user
SELECT
  u.id,
  u.name,
  u.rating as stored_rating,
  AVG(r.overall_rating)::numeric(3,2) as calculated_rating,
  COUNT(r.id) as review_count
FROM users u
LEFT JOIN reviews r ON r.reviewee_id = u.id
WHERE u.id = <user_id>
GROUP BY u.id, u.name, u.rating;
```
