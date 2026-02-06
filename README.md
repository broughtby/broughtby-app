# BroughtBy

A premium marketplace connecting brands with vetted brand ambassadors. Think of it like a dating app for business: brands swipe through ambassador profiles, and when there's mutual interest, they can message and eventually book.

## Status

BroughtBy is an actively developed MVP currently used for live demos and early customer pilots.  
This repository reflects ongoing product development.

## Features

  **Core User Flows**
  - Dual User Roles: Brand and Brand Ambassador accounts
  - Smart Matching: Swipe-based interface for brands to discover ambassadors
  - Partnership Requests: Like/accept flow for creating matches
  - Real-time Messaging: Chat with matched ambassadors using Socket.io

  **Booking & Time Management**
  - Booking System: Create, manage, and track ambassador bookings
  - Time Tracking: Clock in/out functionality for completed bookings
  - Booking Status Management: Pending, confirmed, in-progress, completed states

  **Reviews & Ratings**
  - Review System: Brands and ambassadors can review each other after bookings
  - Rating Display: Star ratings and review counts on profiles
  - Review Lists: View reviews in profiles and discovery flow

  **Profile & Discovery**
  - Profile Management: Detailed profiles with photos, bios, skills, rates, and availability
  - Location Filtering: Filter ambassadors by location in discovery
  - Mobile-Responsive Design: Touch-optimized swipe cards and interfaces

  **Notifications**
  - Email Notifications: Partnership requests, message notifications, booking updates
  - Partnership Request Emails: Notify ambassadors of new brand interest
  - Chat Notifications: Alert users of new messages

  **Admin & Demo Tooling**
  - Test Accounts: Flag accounts for demo purposes (is_test field)
  - Demo Mode: Blur real names and rates during video recording
  - Demo Accept: Instant match creation for test accounts during demos
  - Reset Demo Data: Clear user interactions while preserving test reviews
  - Admin Impersonation: Admins can impersonate users for testing

  **Additional Features** 
  - Messages Page: Top-level navigation access to all conversations
  - Ambassador Community: Ambassadors can browse (view-only) other ambassadors
  - Auto-Welcome Messages: Automated greeting when matches are created
    
## Tech Stack

- **Frontend**: React with responsive design
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Real-time**: Socket.io for messaging
- **Authentication**: JWT-based auth with bcrypt

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up PostgreSQL database:
   ```bash
   createdb broughtby
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

5. Run database migrations:
   ```bash
   npm run db:migrate
   ```

6. Seed the database with sample data:
   ```bash
   npm run db:seed
   ```

### Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

- Backend API: http://localhost:5000
- Frontend: http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
broughtby-app/
├── server/              # Backend Express API
│   ├── config/         # Database and config setup
│   ├── db/             # Migrations and seeds
│   ├── middleware/     # Auth and validation middleware
│   ├── routes/         # API route handlers
│   ├── controllers/    # Business logic
│   └── index.js        # Server entry point
├── client/             # React frontend
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # React components
│       ├── pages/      # Page components
│       ├── services/   # API and Socket.io clients
│       ├── context/    # React context for state
│       └── styles/     # CSS and styling
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/ambassadors` - Get ambassador profiles (brands only)

### Matching
- `POST /api/likes` - Like an ambassador
- `GET /api/likes/received` - Get likes received (ambassadors only)
- `POST /api/matches` - Create a match
- `GET /api/matches` - Get all matches

### Messaging
- `GET /api/messages/:matchId` - Get messages for a match
- Socket.io events for real-time messaging

## License

ISC

## Development Notes

Early prototyping was done locally using AI-assisted development tools.  
The public commit history reflects active development since November 2025.

