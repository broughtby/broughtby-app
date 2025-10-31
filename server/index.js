const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const likeRoutes = require('./routes/likes');
const matchRoutes = require('./routes/matches');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const bookingRoutes = require('./routes/bookings');

const app = express();
const server = http.createServer(app);

// CORS configuration - allow requests from frontend
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000', // Local development
  'http://localhost:5001', // Local development alternate port
  'https://app.broughtby.co', // Production frontend
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BroughtBy API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      likes: '/api/likes',
      matches: '/api/matches',
      messages: '/api/messages',
    },
  });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join user's personal room for notifications
  socket.join(`user:${socket.userId}`);

  // Join a match room for messaging
  socket.on('join_match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`User ${socket.userId} joined match ${matchId}`);
  });

  // Leave a match room
  socket.on('leave_match', (matchId) => {
    socket.leave(`match:${matchId}`);
    console.log(`User ${socket.userId} left match ${matchId}`);
  });

  // Send a message
  socket.on('send_message', async (data) => {
    try {
      const { matchId, content } = data;

      // Verify user is part of this match
      const matchCheck = await db.query(
        'SELECT brand_id, ambassador_id FROM matches WHERE id = $1 AND (brand_id = $2 OR ambassador_id = $2)',
        [matchId, socket.userId]
      );

      if (matchCheck.rows.length === 0) {
        socket.emit('error', { message: 'Access denied to this match' });
        return;
      }

      // Save message to database
      const result = await db.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, match_id, sender_id, content, read, created_at`,
        [matchId, socket.userId, content]
      );

      const message = result.rows[0];

      // Get sender info
      const userResult = await db.query(
        'SELECT name, profile_photo FROM users WHERE id = $1',
        [socket.userId]
      );

      const enrichedMessage = {
        ...message,
        sender_name: userResult.rows[0].name,
        sender_photo: userResult.rows[0].profile_photo,
      };

      // Broadcast to match room
      io.to(`match:${matchId}`).emit('new_message', enrichedMessage);

      // Send notification to the other user
      const match = matchCheck.rows[0];
      const recipientId = match.brand_id === socket.userId ? match.ambassador_id : match.brand_id;
      io.to(`user:${recipientId}`).emit('message_notification', {
        matchId,
        message: enrichedMessage,
      });
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(`match:${data.matchId}`).emit('user_typing', {
      userId: socket.userId,
      matchId: data.matchId,
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(`match:${data.matchId}`).emit('user_stop_typing', {
      userId: socket.userId,
      matchId: data.matchId,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 BroughtBy API Server started`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    db.pool.end();
    process.exit(0);
  });
});

module.exports = { app, server, io };
