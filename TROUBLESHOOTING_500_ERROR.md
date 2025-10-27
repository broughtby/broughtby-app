# Fixing the 500 Error: "Request to Work Together" Button

## Problem Summary

When brands click "Request to Work Together", they get a 500 Internal Server Error.

## Root Cause

The **endpoints are correct** - they match perfectly:
- Frontend: `POST /api/likes` with `{ ambassadorId }`
- Backend: `POST /api/likes` handled by `createLike` controller

The issue is that **the production database is missing the `status` column** that was added in a recent migration.

## What's Happening

The backend code tries to run this SQL:
```sql
INSERT INTO likes (brand_id, ambassador_id, status)
VALUES ($1, $2, 'pending')
```

But the `status` column doesn't exist in production yet, causing a database error (500).

## The Fix: Run Database Migration

### Quick Fix (5 minutes)

1. **Go to Render Dashboard**
   - Open your web service
   - Click on the "Shell" tab

2. **Run this command:**
   ```bash
   npm run db:migrate
   ```

3. **You should see:**
   ```
   ✓ All migrations completed successfully!
   ```

4. **Test:**
   - Go to app.broughtby.co
   - Login as a brand
   - Click "Request to Work Together"
   - Should work now! ✅

### What the Migration Does

Adds the `status` column to track partnership request states:
- `pending` - Brand sent request, ambassador hasn't responded
- `accepted` - Ambassador accepted, partnership created
- `declined` - Ambassador declined the request

## Verification

After running the migration:

1. **Test the Button**
   - Should create partnership request successfully
   - Ambassador should receive email notification
   - No 500 error

2. **Check Render Logs**
   - Should see: "Partnership request sent successfully"
   - Email sending status (success or failure)

## Why Endpoints Are Correct

The `/api/likes` endpoint is the **correct** endpoint for partnership requests:

1. ✅ Frontend calls: `POST /api/likes` with `{ ambassadorId }`
2. ✅ Backend route exists: `router.post('/', auth, createLike)`
3. ✅ Controller logic:
   - Creates like with `status = 'pending'`
   - Sends email notification to ambassador
   - Returns success response

**No endpoint changes needed** - just run the migration!

## Complete Flow (After Migration)

1. Brand clicks "Request to Work Together"
2. Frontend → `POST /api/likes` with ambassador ID
3. Backend:
   - Validates brand and ambassador
   - Creates partnership request (status: pending)
   - Sends email to ambassador
   - Returns success
4. Ambassador receives email notification
5. Ambassador sees request in "Requests" tab
6. Ambassador can Accept or Decline

## Alternative: Automatic Migration on Deploy

If you want migrations to run automatically on every deploy:

**Update Render Build Command to:**
```bash
npm install; npm run db:migrate; cd client && npm install && npm run build
```

This will run migrations before building the frontend on every deployment.

---

## Summary

- **Problem:** 500 error on "Request to Work Together"
- **Cause:** Missing `status` column in production database
- **Solution:** Run `npm run db:migrate` via Render Shell
- **Endpoints:** Already correct, no changes needed
- **Time to fix:** 5 minutes

See `MIGRATION_GUIDE.md` for detailed migration instructions.
