# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BroughtBy is a premium marketplace connecting brands with vetted brand ambassadors. It uses a swipe-based matching system (similar to dating apps) where brands discover ambassadors, like their profiles, and ambassadors can accept to create matches. Once matched, they can communicate via real-time messaging.

## Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Real-time**: Socket.io for messaging
- **Authentication**: JWT with bcrypt

## Development Commands

### Initial Setup

```bash
# Install all dependencies (root and client)
npm run install:all

# Create PostgreSQL database
createdb broughtby

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Run backend only
npm run server:dev

# Run frontend only (from client directory)
cd client && npm start

# Re-seed database (useful during development)
npm run db:seed
```

### Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Architecture

### Database Schema

The application uses four main tables:

1. **users** - Stores both brands and ambassadors (differentiated by `role` field)
   - Ambassadors have additional fields: `age`, `hourly_rate`, `availability`, `rating`
   - Both roles have: `profile_photo`, `bio`, `location`, `skills`

2. **likes** - One-directional likes from brands to ambassadors
   - Brands can like ambassadors, but not vice versa
   - Prevents duplicate likes with UNIQUE constraint

3. **matches** - Created when ambassador accepts a brand's like
   - Represents mutual interest between brand and ambassador
   - Required before messaging can occur

4. **messages** - Chat messages within a match
   - Linked to match_id, includes sender_id and content
   - Supports real-time delivery via Socket.io

### Backend Structure

```
server/
├── config/
│   └── database.js          # PostgreSQL connection pool
├── db/
│   ├── migrate.js           # Database migrations
│   └── seed.js              # Sample data seeding
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── controllers/
│   ├── authController.js    # Register, login
│   ├── userController.js    # Profile, get ambassadors
│   ├── likeController.js    # Create like, get received likes
│   ├── matchController.js   # Create match, get matches
│   └── messageController.js # Get/send messages
├── routes/                   # Express route definitions
└── index.js                 # Server entry point + Socket.io
```

### Frontend Structure

```
client/src/
├── components/
│   ├── Navbar.js            # Navigation bar
│   └── PrivateRoute.js      # Route protection wrapper
├── context/
│   └── AuthContext.js       # Global auth state management
├── pages/
│   ├── Home.js              # Landing page
│   ├── Login.js             # Login page
│   ├── Register.js          # Registration page
│   ├── Discover.js          # Swipeable ambassador cards (brands only)
│   ├── Matches.js           # View matches and pending likes
│   ├── Chat.js              # Real-time messaging
│   └── Profile.js           # View/edit user profile
└── services/
    ├── api.js               # Axios API client
    └── socket.js            # Socket.io client wrapper
```

### User Flow

**Brand Flow:**
1. Register/Login as brand
2. Browse ambassadors in Discover page (swipeable cards)
3. Swipe right (like) or left (pass) on ambassadors
4. View matches in Matches page
5. Click match to open real-time chat

**Ambassador Flow:**
1. Register/Login as ambassador
2. Cannot browse (discovery is brand-only)
3. View received likes in Matches page (Likes tab)
4. Accept likes to create matches
5. Chat with matched brands

### Authentication & Authorization

- JWT tokens stored in localStorage
- Token includes: `userId`, `email`, `role`
- Auth middleware validates token on protected routes
- Socket.io uses same JWT for authentication
- Role-based restrictions:
  - Only brands can browse ambassadors and create likes
  - Only ambassadors can see received likes and create matches
  - Both can message within established matches

### Real-time Messaging

Socket.io events:
- `join_match` / `leave_match` - Join/leave match room
- `send_message` - Send message (broadcasts to match room)
- `new_message` - Receive new message
- `typing` / `stop_typing` - Typing indicators
- `message_notification` - Notification for new messages

Messages are:
1. Sent via Socket.io for real-time delivery
2. Saved to database via socket event handler
3. Broadcast to both users in the match room

### Styling

Uses CSS custom properties (variables) defined in `client/src/index.css`:

```css
--navy: #0A2540       /* Primary brand color */
--gold: #D4AF37       /* Accent color */
--light-gray: #F7F8FA /* Background */
--medium-gray: #E4E7EB
--dark-gray: #6B7280
```

Component styles are in separate CSS files co-located with components.

## Important Notes

### Database Migrations

- Migrations run in a transaction (all-or-nothing)
- Create indexes for performance on frequently queried fields
- Use `ON DELETE CASCADE` for referential integrity
- Check constraints prevent invalid data (e.g., `brand_id != ambassador_id`)

### API Error Handling

All API endpoints follow consistent error response format:
```json
{ "error": "Error message" }
```

Controllers use try-catch blocks and return appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

### Environment Variables

Required in `.env`:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL config
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret key for JWT signing (must be changed in production)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:3000)

### Sample Credentials

The seed script creates 7 ambassadors and 7 brands:

**Ambassador:**
- Email: sarah.wellness@example.com
- Password: password123

**Brand:**
- Email: team@luxewellness.com
- Password: password123

All seeded users use password: `password123`

### Common Development Patterns

**Adding a new API endpoint:**
1. Create controller function in `server/controllers/`
2. Add route in `server/routes/`
3. Import and use route in `server/index.js`
4. Add API call to `client/src/services/api.js`

**Adding a new page:**
1. Create component in `client/src/pages/`
2. Create corresponding CSS file
3. Add route in `client/src/App.js`
4. Wrap in `<PrivateRoute>` if authentication required

**Database queries:**
- Use parameterized queries ($1, $2, etc.) to prevent SQL injection
- Always handle errors with try-catch
- Release client connections in finally blocks
- Use transactions for multi-statement operations

### Testing the Application

1. Start PostgreSQL
2. Run migrations and seed: `npm run db:migrate && npm run db:seed`
3. Start dev server: `npm run dev`
4. Open http://localhost:3000
5. Login with sample credentials
6. Test brand flow: Browse ambassadors, like profiles, view matches, chat
7. Open incognito window, login as ambassador
8. Test ambassador flow: Accept likes, create matches, chat

### Performance Considerations

- Database indexes on foreign keys and frequently queried fields
- Connection pooling (max 20 connections)
- Socket.io rooms for efficient message broadcasting
- React context for global state (avoids prop drilling)
- Lazy loading could be added for ambassador cards

### Security Best Practices

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- CORS configured for specific client URL
- SQL injection prevention via parameterized queries
- Input validation using express-validator
- Authorization checks on all protected routes
- Socket authentication via JWT token
