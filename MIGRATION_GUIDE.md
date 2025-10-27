# Database Migration Guide for Production

## Current Issue: 500 Error on Partnership Requests

The "Request to Work Together" button is returning a 500 error because the production database is missing the `status` column in the `likes` table.

## What Changed

We added a `status` column to track partnership request states:
- `pending` - Brand sent request, waiting for ambassador response
- `accepted` - Ambassador accepted, match created
- `declined` - Ambassador declined the request

## How to Fix (Run Migration on Production)

### Option 1: Via Render Shell (Quickest)

1. **Go to Render Dashboard**
   - Navigate to your web service
   - Click on the "Shell" tab

2. **Run Migration Command**
   ```bash
   npm run db:migrate
   ```

3. **Verify Success**
   - You should see: "✓ All migrations completed successfully!"
   - If you see errors about columns already existing, that's okay (migrations use IF NOT EXISTS)

4. **Test**
   - Try clicking "Request to Work Together" button
   - Should work now!

---

### Option 2: Add to Build Script (Automatic on Every Deploy)

**⚠️ Warning:** This runs migrations on every deployment. Generally safe but can be risky.

1. **Update Render Build Command**

   Current:
   ```bash
   npm install; cd client && npm install && npm run build
   ```

   New:
   ```bash
   npm install; npm run db:migrate; cd client && npm install && npm run build
   ```

2. **This will:**
   - Install dependencies
   - Run migrations (safe with IF NOT EXISTS clauses)
   - Build frontend

3. **Trigger Deploy**
   - Push any change to trigger rebuild
   - Migrations run automatically

---

### Option 3: Manual SQL (If Shell Doesn't Work)

If you can't access the Render shell, you can run the SQL directly on your PostgreSQL database:

1. **Get Database Connection String**
   - In Render dashboard, go to your PostgreSQL database
   - Copy the "External Database URL"

2. **Connect with psql**
   ```bash
   psql postgresql://your-connection-string
   ```

3. **Run This SQL**
   ```sql
   -- Add status column to likes table
   ALTER TABLE likes
   ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
   CHECK (status IN ('pending', 'accepted', 'declined'));

   -- Create index for faster filtering
   CREATE INDEX IF NOT EXISTS idx_likes_status ON likes(status);

   -- Verify the column exists
   \d likes
   ```

4. **Exit psql**
   ```bash
   \q
   ```

---

## Verification

After running the migration, verify it worked:

1. **Test the Button**
   - Log in as a brand
   - Click "Request to Work Together" on an ambassador
   - Should succeed (no 500 error)

2. **Check Database**
   ```bash
   psql postgresql://your-connection-string
   ```
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'likes' AND column_name = 'status';
   ```

   Should show:
   ```
   column_name | data_type         | column_default
   ------------|-------------------|----------------
   status      | character varying | 'pending'::character varying
   ```

3. **Check Render Logs**
   - Should see: "Partnership request sent successfully"
   - No more 500 errors

---

## What the Migration Does

The migration adds these changes to your database:

```sql
-- 1. Adds status column with default value 'pending'
ALTER TABLE likes
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'accepted', 'declined'));

-- 2. Creates index for performance
CREATE INDEX IF NOT EXISTS idx_likes_status ON likes(status);
```

**Safe:** Uses `IF NOT EXISTS` so it won't fail if already run.

---

## After Migration Works

Once the migration is complete:

1. ✅ "Request to Work Together" button works
2. ✅ Emails sent to ambassadors automatically
3. ✅ Ambassadors see "Requests" tab with Accept/Decline buttons
4. ✅ Status tracking works (pending → accepted/declined)

---

## Troubleshooting

### "Permission denied" error
- Make sure your database user has ALTER TABLE permissions
- You may need to use the database owner credentials

### "Column already exists" warning
- This is fine! The migration uses `IF NOT EXISTS`
- It means the column was already added

### Still getting 500 error after migration
- Check Render logs for the actual error message
- Verify migration ran successfully: `SELECT status FROM likes LIMIT 1;`
- Check email configuration (see EMAIL_SETUP.md)

### Migration takes a long time
- Adding a column with default value can lock the table briefly
- For small databases (< 10k rows), should be instant
- For larger databases, consider doing it during low-traffic time

---

## Future Migrations

For future database changes:

1. **Local Development:**
   ```bash
   npm run db:migrate
   ```

2. **Production (Render):**
   - Option A: Run via Shell tab
   - Option B: Add to build command
   - Option C: Run SQL manually

**Best Practice:** Test migrations locally first, then apply to production.

---

## Need Help?

- Check Render logs for specific error messages
- Verify database connection in Render environment variables
- Ensure `DATABASE_URL` or individual `DB_*` variables are set
- Contact Render support if shell access is not available
