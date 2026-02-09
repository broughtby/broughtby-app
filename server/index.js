const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./config/database');
const { sendEmail, generateNewMessageEmail } = require('./services/emailService');
const Anthropic = require('@anthropic-ai/sdk');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const likeRoutes = require('./routes/likes');
const matchRoutes = require('./routes/matches');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const previewRoutes = require('./routes/previewRoutes');

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
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/preview', previewRoutes);

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
  socket.on('join_match', async (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`👤 User ${socket.userId} joined match ${matchId}`);

    // Check if this match needs an AI first response (preview mode only)
    try {
      // Get match details
      const matchCheck = await db.query(
        'SELECT brand_id, ambassador_id FROM matches WHERE id = $1',
        [matchId]
      );

      if (matchCheck.rows.length === 0) return;

      const match = matchCheck.rows[0];
      const { brand_id, ambassador_id } = match;

      // Only trigger if the joining user is the brand
      if (socket.userId !== brand_id) return;

      // Check if brand is a preview user
      const brandCheck = await db.query(
        'SELECT is_preview FROM users WHERE id = $1',
        [brand_id]
      );

      const isPreviewBrand = brandCheck.rows[0]?.is_preview || false;
      if (!isPreviewBrand) return;

      // Check if ambassador is the preview ambassador
      const ambassadorCheck = await db.query(
        'SELECT is_preview_ambassador, name, bio, location, age, skills, profile_photo FROM users WHERE id = $1',
        [ambassador_id]
      );

      const isPreviewAmbassador = ambassadorCheck.rows[0]?.is_preview_ambassador || false;
      if (!isPreviewAmbassador) return;

      // Use PostgreSQL advisory lock for atomic check-and-lock
      // pg_try_advisory_lock returns true if lock was acquired, false if already locked
      const lockResult = await db.query(
        'SELECT pg_try_advisory_lock($1) as acquired',
        [matchId]
      );

      const lockAcquired = lockResult.rows[0].acquired;
      if (!lockAcquired) {
        console.log(`🔒 Match ${matchId} is locked by another request, skipping`);
        return;
      }

      console.log(`🔓 Acquired lock for match ${matchId}`);

      try {
        // Check if ambassador (AI) has already sent a message
        const ambassadorMessageCount = await db.query(
          `SELECT COUNT(*) as count FROM messages
           WHERE match_id = $1 AND sender_id = $2`,
          [matchId, ambassador_id]
        );

        const ambassadorMsgCount = parseInt(ambassadorMessageCount.rows[0].count);
        if (ambassadorMsgCount > 0) {
          // AI has already responded, don't generate again
          console.log(`✓ Match ${matchId} already has AI response, skipping`);
          // Release the advisory lock before returning
          await db.query('SELECT pg_advisory_unlock($1)', [matchId]);
          return;
        }
      } catch (checkError) {
        console.error('Error checking ambassador messages:', checkError);
        // Release lock on error
        await db.query('SELECT pg_advisory_unlock($1)', [matchId]);
        return;
      }

      console.log(`🤖 Brand user joined match ${matchId}, triggering AI first response...`);

      // Trigger AI response in a non-blocking way
      (async () => {
        try {
          // Wait a moment before showing typing indicator (let chat UI load)
          await new Promise(resolve => setTimeout(resolve, 800));

          // Emit typing indicator
          io.to(`match:${matchId}`).emit('user_typing', {
            userId: ambassador_id,
            matchId: matchId,
          });

          // Get the welcome message for context
          const welcomeMessageResult = await db.query(
            'SELECT content FROM messages WHERE match_id = $1 ORDER BY created_at ASC LIMIT 1',
            [matchId]
          );

          const welcomeMessage = welcomeMessageResult.rows[0]?.content || '';

          // Get ambassador profile data for dynamic system prompt
          const profile = ambassadorCheck.rows[0];
          const skills = profile.skills ? profile.skills.join(', ') : 'various skills';

          // Build dynamic system prompt based on ambassador's actual profile
          const systemPrompt = `You are ${profile.name}, a brand ambassador${profile.age ? ` who is ${profile.age} years old` : ''}${profile.location ? ` based in ${profile.location}` : ''}. ${profile.bio || 'You are enthusiastic about brand ambassador work and connecting with brands.'} Your expertise includes: ${skills}. You're friendly, professional, and excited to work with brands on activations and events. Keep your responses short and conversational (1-3 sentences). Don't be overly formal — you're chatting, not writing an email.`;

          // Call Anthropic API
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: welcomeMessage
              }
            ],
          });

          const aiReply = response.content[0].text;

          console.log(`🤖 AI first response generated: "${aiReply}"`);

          // Wait 1-2 seconds before sending reply (realistic response time)
          const delay = 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          // Stop typing indicator
          io.to(`match:${matchId}`).emit('user_stop_typing', {
            userId: ambassador_id,
            matchId: matchId,
          });

          // Save AI reply to database
          const aiMessageResult = await db.query(
            `INSERT INTO messages (match_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, match_id, sender_id, content, read, created_at`,
            [matchId, ambassador_id, aiReply]
          );

          const aiMessage = aiMessageResult.rows[0];

          const enrichedAiMessage = {
            ...aiMessage,
            sender_name: profile.name,
            sender_photo: profile.profile_photo,
          };

          // Broadcast AI reply to match room
          io.to(`match:${matchId}`).emit('new_message', enrichedAiMessage);

          console.log(`✅ AI first response sent to match ${matchId}`);

          // Release the advisory lock
          await db.query('SELECT pg_advisory_unlock($1)', [matchId]);
          console.log(`🔓 Released lock for match ${matchId}`);
        } catch (aiError) {
          console.error('Failed to generate AI first response:', aiError);
          // Release lock even on error
          await db.query('SELECT pg_advisory_unlock($1)', [matchId]);
          console.log(`🔓 Released lock for match ${matchId} (after error)`);
        }
      })();
    } catch (error) {
      console.error('Error checking for AI first response:', error);
    }
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

      // Send email notification (fire and forget)
      (async () => {
        try {
          const recipientResult = await db.query(
            'SELECT email, name FROM users WHERE id = $1',
            [recipientId]
          );

          if (recipientResult.rows.length > 0) {
            const recipient = recipientResult.rows[0];
            const html = generateNewMessageEmail({
              recipientName: recipient.name,
              senderName: userResult.rows[0].name,
              messagePreview: content,
              matchId,
            });

            await sendEmail({
              to: recipient.email,
              subject: `[BroughtBy] ${userResult.rows[0].name} sent you a message`,
              html,
            });

            console.log(`Email notification sent to ${recipient.email}`);
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't throw - email failures shouldn't block the message
        }
      })();

      // AI auto-reply for preview ambassador (fire and forget)
      (async () => {
        try {
          console.log('🔍 AI auto-reply: Checking if conditions are met...');
          console.log('   Match ID:', matchId);
          console.log('   Sender ID (socket.userId):', socket.userId);
          console.log('   Recipient ID:', recipientId);

          // Check if sender is a preview user
          const senderCheck = await db.query(
            'SELECT is_preview FROM users WHERE id = $1',
            [socket.userId]
          );

          const isPreviewUser = senderCheck.rows[0]?.is_preview || false;
          console.log('   Is sender preview user?', isPreviewUser);

          // Check if recipient is the preview ambassador
          const recipientCheck = await db.query(
            'SELECT is_preview_ambassador, name FROM users WHERE id = $1',
            [recipientId]
          );

          const isPreviewAmbassador = recipientCheck.rows[0]?.is_preview_ambassador || false;
          const ambassadorName = recipientCheck.rows[0]?.name || 'Ambassador';
          console.log('   Is recipient preview ambassador?', isPreviewAmbassador);
          console.log('   Ambassador name:', ambassadorName);

          // Only generate AI reply if sender is preview user and recipient is preview ambassador
          if (!isPreviewUser || !isPreviewAmbassador) {
            console.log('❌ AI auto-reply: Conditions not met. Skipping.');
            return;
          }

          console.log(`🤖 AI auto-reply: Generating reply from ${ambassadorName}...`);

          // Wait 500ms before showing typing indicator (let frontend process the user's message first)
          await new Promise(resolve => setTimeout(resolve, 500));

          // Emit typing indicator
          console.log(`📤 Emitting typing indicator to match:${matchId} from user ${recipientId}`);
          io.to(`match:${matchId}`).emit('user_typing', {
            userId: recipientId,
            matchId: matchId,
          });

          // Fetch recent messages for context (last 10 messages)
          const recentMessages = await db.query(
            `SELECT m.sender_id, m.content, u.name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.match_id = $1
             ORDER BY m.created_at DESC
             LIMIT 10`,
            [matchId]
          );

          // Build conversation history (reverse to chronological order)
          const conversationHistory = recentMessages.rows.reverse().map(msg => {
            const role = msg.sender_id === recipientId ? 'assistant' : 'user';
            return { role, content: msg.content };
          });

          // Get ambassador profile data to build dynamic system prompt
          const ambassadorProfile = await db.query(
            'SELECT name, bio, location, age, skills, hourly_rate FROM users WHERE id = $1',
            [recipientId]
          );

          const profile = ambassadorProfile.rows[0];
          const skills = profile.skills ? profile.skills.join(', ') : 'various skills';

          // Build dynamic system prompt based on ambassador's actual profile
          const systemPrompt = `You are ${profile.name}, a brand ambassador${profile.age ? ` who is ${profile.age} years old` : ''}${profile.location ? ` based in ${profile.location}` : ''}. ${profile.bio || 'You are enthusiastic about brand ambassador work and connecting with brands.'} Your expertise includes: ${skills}. You're friendly, professional, and excited to work with brands on activations and events. Keep your responses short and conversational (1-3 sentences). Don't be overly formal — you're chatting, not writing an email.`;

          // Call Anthropic API
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationHistory,
          });

          const aiReply = response.content[0].text;

          console.log(`🤖 AI reply generated: "${aiReply}"`);

          // Wait 2-3 seconds before sending reply (random delay for natural feel)
          const delay = 2000 + Math.random() * 1000; // 2-3 seconds
          console.log(`⏳ Waiting ${delay.toFixed(0)}ms before sending reply...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Stop typing indicator
          console.log(`📤 Stopping typing indicator for match:${matchId} user ${recipientId}`);
          io.to(`match:${matchId}`).emit('user_stop_typing', {
            userId: recipientId,
            matchId: matchId,
          });

          // Save AI reply to database
          const aiMessageResult = await db.query(
            `INSERT INTO messages (match_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, match_id, sender_id, content, read, created_at`,
            [matchId, recipientId, aiReply]
          );

          const aiMessage = aiMessageResult.rows[0];

          // Get ambassador info for enriched message
          const ambassadorInfo = await db.query(
            'SELECT name, profile_photo FROM users WHERE id = $1',
            [recipientId]
          );

          const enrichedAiMessage = {
            ...aiMessage,
            sender_name: ambassadorInfo.rows[0].name,
            sender_photo: ambassadorInfo.rows[0].profile_photo,
          };

          // Broadcast AI reply to match room
          console.log(`📤 Broadcasting AI reply to match:${matchId}`);
          console.log(`   Message:`, enrichedAiMessage);
          io.to(`match:${matchId}`).emit('new_message', enrichedAiMessage);

          console.log(`✅ AI auto-reply complete for match ${matchId}`);
        } catch (aiError) {
          console.error('Failed to generate AI reply:', aiError);
          // Don't throw - AI reply failures shouldn't block the message
        }
      })();
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
