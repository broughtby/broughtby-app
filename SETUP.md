# BroughtBy - Quick Setup Guide

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` and update with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=broughtby
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_random_secret_key_here
```

### 3. Create Database

```bash
# Create PostgreSQL database
createdb broughtby

# Or using psql
psql -U postgres -c "CREATE DATABASE broughtby;"
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Seed Sample Data

```bash
npm run db:seed
```

This creates 7 sample ambassadors and 7 sample brands. All use password: `password123`

### 6. Start Development Server

```bash
npm run dev
```

This starts:
- Backend API on http://localhost:5000
- Frontend on http://localhost:3000

## Test the Application

### Login as Brand
- Email: `team@luxewellness.com`
- Password: `password123`
- Test: Browse ambassadors, like profiles, view matches, chat

### Login as Ambassador
- Email: `sarah.wellness@example.com`
- Password: `password123`
- Test: View received likes, accept matches, chat with brands

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l | grep broughtby`

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Set `PORT=3001` before running client

### Dependencies Issues
```bash
# Clear and reinstall
rm -rf node_modules client/node_modules
npm run install:all
```

## Next Steps

1. Customize the color scheme in `client/src/index.css`
2. Add your own sample data in `server/db/seed.js`
3. Configure production environment variables
4. Deploy backend and frontend separately or together

## Production Deployment

1. Build frontend:
```bash
npm run build
```

2. Set production environment variables
3. Use a process manager like PM2:
```bash
pm2 start server/index.js --name broughtby
```

4. Configure reverse proxy (nginx) for serving frontend and proxying API

## Support

For issues or questions, refer to:
- README.md for detailed documentation
- CLAUDE.md for architecture and development patterns
