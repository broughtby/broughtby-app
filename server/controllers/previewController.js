const db = require('../config/database');
const Anthropic = require('@anthropic-ai/sdk');

const resetPreview = async (req, res) => {
  try {
    // Verify user is a preview account
    const userCheck = await db.query(
      'SELECT is_preview FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userCheck.rows[0].is_preview) {
      return res.status(403).json({ error: 'Only preview accounts can reset' });
    }

    // Delete all messages associated with matches where the brand is the preview user
    await db.query(
      `DELETE FROM messages
       WHERE match_id IN (
         SELECT id FROM matches WHERE brand_id = $1
       )`,
      [req.user.userId]
    );

    // Delete all matches where the brand is the preview user
    await db.query(
      'DELETE FROM matches WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all likes where the brand is the preview user
    await db.query(
      'DELETE FROM likes WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all passes where the brand is the preview user
    await db.query(
      'DELETE FROM passes WHERE brand_id = $1',
      [req.user.userId]
    );

    // Delete all reviews where the brand left a review
    await db.query(
      'DELETE FROM reviews WHERE reviewer_id = $1',
      [req.user.userId]
    );

    // Delete all bookings where the brand is the preview user
    await db.query(
      'DELETE FROM bookings WHERE brand_id = $1',
      [req.user.userId]
    );

    res.json({
      message: 'Preview reset successfully',
    });
  } catch (error) {
    console.error('Preview reset error:', error);
    res.status(500).json({ error: 'Failed to reset preview' });
  }
};

const togglePreviewAmbassador = async (req, res) => {
  try {
    const { ambassadorId, enabled } = req.body;

    if (!ambassadorId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'ambassadorId and enabled (boolean) are required' });
    }

    // Verify caller is a preview brand or admin
    const userCheck = await db.query(
      'SELECT is_preview, is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { is_preview, is_admin } = userCheck.rows[0];
    if (!is_preview && !is_admin) {
      return res.status(403).json({ error: 'Only preview accounts or admins can toggle preview ambassadors' });
    }

    // Verify target is an ambassador
    const ambassadorCheck = await db.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [ambassadorId]
    );

    if (ambassadorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    if (ambassadorCheck.rows[0].role !== 'ambassador') {
      return res.status(400).json({ error: 'User is not an ambassador' });
    }

    // Toggle the flag
    await db.query(
      'UPDATE users SET is_preview_ambassador = $1 WHERE id = $2',
      [enabled, ambassadorId]
    );

    const ambassador = ambassadorCheck.rows[0];
    res.json({
      message: `${ambassador.name} preview mode ${enabled ? 'enabled' : 'disabled'}`,
      ambassadorId,
      enabled,
    });
  } catch (error) {
    console.error('Toggle preview ambassador error:', error);
    res.status(500).json({ error: 'Failed to toggle preview ambassador' });
  }
};

const generateBrandMessage = async (req, res) => {
  try {
    const { matchId, demoMode } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    // Verify caller is a preview brand
    const userCheck = await db.query(
      'SELECT is_preview, name, company_name, bio FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const brand = userCheck.rows[0];
    if (!brand.is_preview) {
      return res.status(403).json({ error: 'Only preview accounts can generate AI messages' });
    }

    // Use demoMode from request body (stored in localStorage on frontend)
    const isDemoMode = demoMode === true;

    // Get match data to find ambassador
    const matchQuery = await db.query(
      'SELECT brand_id, ambassador_id FROM matches WHERE id = $1',
      [matchId]
    );

    if (matchQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = matchQuery.rows[0];
    if (match.brand_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized for this match' });
    }

    // Get ambassador info
    const ambassadorQuery = await db.query(
      'SELECT name, bio, location, age, skills FROM users WHERE id = $1',
      [match.ambassador_id]
    );

    if (ambassadorQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    const ambassador = ambassadorQuery.rows[0];

    // Get recent message history for context
    const messagesQuery = await db.query(
      'SELECT sender_id, content FROM messages WHERE match_id = $1 ORDER BY created_at DESC LIMIT 10',
      [matchId]
    );

    const conversationHistory = messagesQuery.rows.reverse().map(msg => ({
      role: msg.sender_id === req.user.userId ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Build system prompt for brand
    const brandName = brand.company_name || brand.name;
    const brandInfo = brand.bio || 'a brand looking to work with ambassadors';
    const ambassadorName = ambassador.name;
    const ambassadorSkills = ambassador.skills ? ambassador.skills.join(', ') : 'various skills';

    // Adjust system prompt based on demo mode
    let systemPrompt;
    let fallbackUserMessage;

    if (isDemoMode) {
      // Demo mode: don't use names for privacy
      systemPrompt = `You are a representative from ${brandName}, ${brandInfo}. You're chatting with a brand ambassador with expertise in ${ambassadorSkills}.

You're friendly, professional, and interested in working together on brand activations and events. Keep your responses conversational and natural (1-3 sentences). Ask relevant questions about their availability, experience, or ideas for collaboration.

IMPORTANT: Do NOT use any names in your messages. Keep all communication professional but avoid mentioning specific names for privacy reasons.`;

      fallbackUserMessage = 'Hi! Nice to connect!';
    } else {
      // Normal mode: use names
      systemPrompt = `You are a representative from ${brandName}, ${brandInfo}. You're chatting with ${ambassadorName}, a brand ambassador with expertise in ${ambassadorSkills}.

You're friendly, professional, and interested in working together on brand activations and events. Keep your responses conversational and natural (1-3 sentences). Ask relevant questions about their availability, experience, or ideas for collaboration.`;

      fallbackUserMessage = `Hi! I'm ${ambassadorName}. Nice to connect!`;
    }

    // Call Anthropic API
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY is not configured');
      return res.status(500).json({ error: 'API key not configured. Please contact support.' });
    }

    console.log('🔑 ANTHROPIC_API_KEY is configured:', process.env.ANTHROPIC_API_KEY ? 'Yes (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'No');

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Anthropic API requires conversations to start with a user message
    // If we only have assistant messages (or no messages), prepend a user message
    let messagesToSend = conversationHistory.length > 0 ? conversationHistory : [];

    // Check if the conversation starts with an assistant message
    if (messagesToSend.length === 0 || messagesToSend[0].role !== 'user') {
      console.log('⚠️ Conversation does not start with user message, prepending fallback');
      messagesToSend = [
        { role: 'user', content: fallbackUserMessage },
        ...messagesToSend
      ];
    }

    console.log('🔑 Calling Anthropic API with model: claude-sonnet-4-5-20250929');
    console.log('📝 System prompt length:', systemPrompt.length);
    console.log('📝 System prompt:', systemPrompt);
    console.log('💬 Conversation history length:', conversationHistory.length);
    console.log('💬 Messages to send:', JSON.stringify(messagesToSend, null, 2));
    console.log('🎯 Fallback message being used?', conversationHistory.length === 0);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messagesToSend,
    });

    console.log('✅ Anthropic API response received:', JSON.stringify(response, null, 2));

    if (!response || !response.content || !response.content[0] || !response.content[0].text) {
      console.error('❌ Invalid Anthropic API response structure:', response);
      throw new Error('Invalid API response: missing content or text field');
    }

    const aiMessage = response.content[0].text;

    res.json({
      message: aiMessage,
    });
  } catch (error) {
    console.error('Generate brand message error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to generate message', details: error.message });
  }
};

const generateEventDetails = async (req, res) => {
  try {
    // Verify caller is a preview brand
    const userCheck = await db.query(
      'SELECT is_preview, name, company_name, bio, location FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const brand = userCheck.rows[0];
    if (!brand.is_preview) {
      return res.status(403).json({ error: 'Only preview accounts can generate AI event details' });
    }

    const brandName = brand.company_name || brand.name;
    const brandInfo = brand.bio || 'a brand';
    const brandLocation = brand.location || 'a major city';

    // Create prompt for AI to generate event details
    const systemPrompt = `You are helping generate realistic event details for ${brandName}, ${brandInfo}.

Generate a brand activation event with these fields:
1. eventName: A creative, engaging event name related to the brand
2. eventLocation: A specific venue/address in ${brandLocation}
3. notes: 2-3 sentences describing the event concept and what ambassadors will do

Return ONLY valid JSON with these exact fields: eventName, eventLocation, notes. No additional text or markdown.`;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        { role: 'user', content: 'Generate event details now.' }
      ],
    });

    const aiResponse = response.content[0].text;

    // Parse JSON response
    let eventDetails;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || aiResponse.match(/(\{[\s\S]*\})/);
      eventDetails = JSON.parse(jsonMatch ? jsonMatch[1] : aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback to default values
      eventDetails = {
        eventName: `${brandName} Brand Activation`,
        eventLocation: brandLocation,
        notes: `Join us for an exciting brand activation event. Ambassadors will engage with customers and share the ${brandName} story.`,
      };
    }

    // Add default time and rate values
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    res.json({
      ...eventDetails,
      eventDate: twoWeeksOut.toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '14:00',
      hourlyRate: '50',
    });
  } catch (error) {
    console.error('Generate event details error:', error);
    res.status(500).json({ error: 'Failed to generate event details' });
  }
};

module.exports = {
  resetPreview,
  togglePreviewAmbassador,
  generateBrandMessage,
  generateEventDetails,
};
