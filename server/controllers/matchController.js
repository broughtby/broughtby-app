const db = require('../config/database');
const { sendPartnershipAcceptedEmail } = require('../services/emailService');
const Anthropic = require('@anthropic-ai/sdk');

const createMatch = async (req, res) => {
  try {
    const { brandId } = req.body;

    // Only ambassadors can create matches (by accepting likes)
    if (req.user.role !== 'ambassador') {
      return res.status(403).json({ error: 'Only ambassadors can create matches' });
    }

    // Verify a pending request exists from the brand to this ambassador
    const likeCheck = await db.query(
      'SELECT id FROM likes WHERE brand_id = $1 AND ambassador_id = $2 AND status = $3',
      [brandId, req.user.userId, 'pending']
    );

    if (likeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No pending request exists from this brand' });
    }

    // Update like status to accepted
    await db.query(
      `UPDATE likes SET status = 'accepted' WHERE brand_id = $1 AND ambassador_id = $2`,
      [brandId, req.user.userId]
    );

    // Create match
    const result = await db.query(
      `INSERT INTO matches (brand_id, ambassador_id)
       VALUES ($1, $2)
       ON CONFLICT (brand_id, ambassador_id) DO NOTHING
       RETURNING id, created_at`,
      [brandId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Match already exists' });
    }

    // Get the newly created match ID
    const matchId = result.rows[0].id;

    // Get ambassador's name for personalized welcome message
    const ambassadorQuery = await db.query(
      'SELECT name FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (ambassadorQuery.rows.length > 0) {
      const ambassadorName = ambassadorQuery.rows[0].name;
      const welcomeMessage = `Hi ${ambassadorName}! I'm interested in learning more about you to see if you'd be a good fit for some events coming up. When would be a good time to chat?`;

      // Insert the welcome message into the messages table
      await db.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [matchId, brandId, welcomeMessage]
      );

      // AI auto-reply from preview ambassador (non-blocking)
      (async () => {
        try {
          // Check if brand is a preview user
          const brandCheck = await db.query(
            'SELECT is_preview FROM users WHERE id = $1',
            [brandId]
          );

          const isPreviewBrand = brandCheck.rows[0]?.is_preview || false;

          // Check if ambassador is the preview ambassador
          const ambassadorCheck = await db.query(
            'SELECT is_preview_ambassador, name, profile_photo FROM users WHERE id = $1',
            [req.user.userId]
          );

          const isPreviewAmbassador = ambassadorCheck.rows[0]?.is_preview_ambassador || false;

          // Only generate AI reply if brand is preview and ambassador is preview ambassador
          if (!isPreviewBrand || !isPreviewAmbassador) {
            return;
          }

          console.log(`🤖 Generating AI welcome reply from ${ambassadorName}...`);

          // Call Anthropic API
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const systemPrompt = `You are Allan Sokol, a Founder & Marketer with one past startup exit. You graduated from the University of Illinois with a degree in Communication. You have experience working in startups, small businesses, and corporations which speaks to your versatility. You also helped run a 3-day tech week event in Chicago bringing together entrepreneurs across the city. You're friendly, professional, enthusiastic about brand ambassador work, and excited to connect with brands on field marketing activations and events. Keep your responses short and conversational (1-3 sentences). Don't be overly formal — you're chatting, not writing an email.`;

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

          console.log(`🤖 AI welcome reply generated: "${aiReply}"`);

          // Wait 2-3 seconds before sending reply (random delay for natural feel)
          const delay = 2000 + Math.random() * 1000; // 2-3 seconds
          await new Promise(resolve => setTimeout(resolve, delay));

          // Save AI reply to database
          await db.query(
            `INSERT INTO messages (match_id, sender_id, content)
             VALUES ($1, $2, $3)`,
            [matchId, req.user.userId, aiReply]
          );

          console.log(`🤖 AI welcome reply saved to database for match ${matchId}`);
        } catch (aiError) {
          console.error('Failed to generate AI welcome reply:', aiError);
          // Don't throw - AI reply failures shouldn't block the match creation
        }
      })();
    }

    // Send partnership accepted email to brand (non-blocking)
    db.query(
      'SELECT email, name FROM users WHERE id = $1',
      [brandId]
    ).then(brandQuery => {
      if (brandQuery.rows.length > 0 && ambassadorQuery.rows.length > 0) {
        const brand = brandQuery.rows[0];
        const ambassador = ambassadorQuery.rows[0];

        // Get additional ambassador info for email
        db.query(
          'SELECT name, email, location, bio FROM users WHERE id = $1',
          [req.user.userId]
        ).then(ambassadorDetailQuery => {
          if (ambassadorDetailQuery.rows.length > 0) {
            const ambassadorDetails = ambassadorDetailQuery.rows[0];

            sendPartnershipAcceptedEmail({
              brandEmail: brand.email,
              brandName: brand.name,
              ambassadorName: ambassadorDetails.name,
              ambassadorLocation: ambassadorDetails.location,
              ambassadorBio: ambassadorDetails.bio,
            }).catch(error => console.error('Failed to send partnership accepted email:', error));
          }
        }).catch(error => console.error('Failed to query ambassador details:', error));
      }
    }).catch(error => console.error('Failed to query brand info:', error));

    res.status(201).json({
      message: 'Partnership accepted successfully',
      match: result.rows[0],
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
};

const getMatches = async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'brand') {
      // Get matches where user is the brand
      query = `
        SELECT m.id as match_id, m.created_at,
               u.id as user_id, u.name, u.profile_photo, u.bio, u.location,
               u.age, u.skills, u.hourly_rate, u.availability, u.rating, u.is_test,
               (SELECT content FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM matches m
        JOIN users u ON m.ambassador_id = u.id
        WHERE m.brand_id = $1
        ORDER BY last_message_time DESC NULLS LAST, m.created_at DESC
      `;
      params = [req.user.userId];
    } else {
      // Get matches where user is the ambassador
      query = `
        SELECT m.id as match_id, m.created_at,
               u.id as user_id, u.name, u.profile_photo, u.bio, u.location, u.skills, u.is_test,
               (SELECT content FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE match_id = m.id
                ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM matches m
        JOIN users u ON m.brand_id = u.id
        WHERE m.ambassador_id = $1
        ORDER BY last_message_time DESC NULLS LAST, m.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await db.query(query, params);

    res.json({ matches: result.rows });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

module.exports = {
  createMatch,
  getMatches,
};
