# 🚀 BroughtBy Deployment Guide

## Quick Start: Deploy to Render.com

### Prerequisites
- GitHub account with broughtby-app repository
- Render.com account (sign up at https://render.com)

---

## Step 1: Deploy Database

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `broughtby-db`
   - **Database**: `broughtby`
   - **Region**: Oregon (or closest to your users)
   - **Plan**: **Free**
4. Click **"Create Database"**
5. **Save the Internal Database URL** - you'll need it for the backend

---

## Step 2: Deploy Backend

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository: `broughtby/broughtby-app`
3. Configure:

**Basic Settings:**
- **Name**: `broughtby-backend`
- **Region**: Oregon (same as database)
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server/index.js`
- **Plan**: Free

**Environment Variables** (click Advanced):
```
NODE_ENV=production
PORT=5001
DATABASE_URL=<paste-internal-database-url-from-step-1>
JWT_SECRET=<generate-random-32-char-string>
CLIENT_URL=https://broughtby-frontend.onrender.com
```

Generate JWT_SECRET: `openssl rand -base64 32`

4. Click **"Create Web Service"**
5. Wait for deployment (~5-10 minutes)
6. **Copy your backend URL**: `https://broughtby-backend.onrender.com`

---

## Step 3: Initialize Database

After backend deploys successfully:

1. In backend service, click **"Shell"** (left sidebar)
2. Run database migration:
```bash
node server/db/migrate.js
```

This creates all database tables.

**Optional**: Add seed data for testing:
```bash
node server/db/seed.js
```

---

## Step 4: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect repository: `broughtby/broughtby-app`
3. Configure:

**Basic Settings:**
- **Name**: `broughtby-frontend`
- **Branch**: `main`
- **Root Directory**: `client`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`

**Environment Variables**:
```
REACT_APP_API_URL=https://broughtby-backend.onrender.com/api
```
(Use your actual backend URL from Step 2)

4. Click **"Create Static Site"**
5. Wait for deployment (~5-10 minutes)

---

## Step 5: Update Backend CORS

Once frontend is deployed:

1. Copy your frontend URL: `https://broughtby-frontend.onrender.com`
2. Go back to **backend service** → **Environment**
3. Update `CLIENT_URL` to your actual frontend URL
4. Click **"Save Changes"** (auto-redeploys)

---

## Step 6: Test Your App 🎉

Visit: `https://broughtby-frontend.onrender.com`

**Test Checklist:**
- ✅ User registration (both brand and ambassador)
- ✅ Login
- ✅ Profile creation with photo upload
- ✅ Discovery page (browse ambassadors)
- ✅ Like/pass functionality
- ✅ Match detection
- ✅ Real-time messaging
- ✅ Location filtering

---

## Production URLs

After successful deployment:

- **Frontend**: https://broughtby-frontend.onrender.com
- **Backend API**: https://broughtby-backend.onrender.com
- **Health Check**: https://broughtby-backend.onrender.com/health

---

## Important Notes

### Free Tier Limitations

**Spin Down:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Solution: Upgrade to Starter plan ($7/month per service) for 24/7 uptime

**Database:**
- Free tier: 512 MB storage
- Sufficient for ~5,000-10,000 users with basic profiles
- Expires after 90 days (must upgrade or migrate)

**File Storage:**
- Current: Local disk (ephemeral - lost on redeploy)
- **Action Required**: Migrate to cloud storage for production

---

## Recommended Upgrades

### For Production Use:

1. **Upgrade Services** ($7/month each)
   - Backend: Always on, no spin down
   - Frontend: Faster builds and deploys
   - Database: Persistent, no expiration

2. **Add Cloud Storage** (Required for file uploads)
   - Cloudinary (recommended): Free tier 25GB/month
   - AWS S3: Pay as you go
   - See `CLOUDINARY_SETUP.md` for integration guide

3. **Custom Domain** (Free on Render)
   - Frontend: `app.broughtby.co`
   - Backend: `api.broughtby.co`
   - Add in Render Dashboard → Settings → Custom Domain

4. **Monitoring & Analytics**
   - Render provides basic metrics
   - Consider: Sentry (error tracking), LogRocket (session replay)

---

## Environment Variables Reference

### Backend (Node.js)
```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secure-random-secret-key
CLIENT_URL=https://your-frontend-url.onrender.com

# Optional (for production):
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend (React)
```bash
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
```

---

## Troubleshooting

### Backend won't start
- Check logs in Render Dashboard
- Verify DATABASE_URL is correct
- Ensure migrations ran successfully

### Frontend can't connect to backend
- Verify REACT_APP_API_URL is correct
- Check backend CORS settings (CLIENT_URL)
- Check Network tab in browser dev tools

### Database connection errors
- Verify DATABASE_URL format
- Check database is running in Render
- Ensure migrations completed

### Images not loading
- Expected behavior on free tier (ephemeral storage)
- Migrate to Cloudinary for persistent storage

---

## Manual Deployment (Alternative)

If `render.yaml` doesn't work, follow the manual steps above.

---

## Next Steps

1. ✅ Deploy to Render
2. 📸 Set up Cloudinary for images
3. 🌐 Add custom domain
4. 📊 Set up monitoring
5. 🔒 Review security settings
6. 🎨 Customize branding
7. 📱 Test on mobile devices

---

## Support

- Render Docs: https://render.com/docs
- GitHub Issues: https://github.com/broughtby/broughtby-app/issues
- Contact: Brooke@broughtby.co

---

**Built with Claude Code** 🤖
https://claude.com/claude-code
