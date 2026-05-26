// Public-facing endpoints for the QR-code landing page.
//
// No auth required — the public submission flow is meant for event attendees
// scanning a QR code, uploading a photo, and receiving a coupon code on screen.
// The campaign is identified by its event_code (URL path parameter), and only
// 'active' campaigns are accessible.

const db = require('../config/database');
const cloudinary = require('../config/cloudinary');
const { sendEmail } = require('../services/emailService');

const CLOUDINARY_FOLDER = 'broughtby/sms-campaigns';
const ADMIN_ALERT_EMAIL = 'brooke@broughtby.co';
const CONSENT_TERMS_VERSION = 'v1';

function uploadBufferToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

// GET /api/public/campaigns/:eventCode — minimal info for landing page header
const getPublicCampaign = async (req, res) => {
  try {
    const { eventCode } = req.params;
    if (!eventCode) return res.status(400).json({ error: 'event_code required' });

    const result = await db.query(
      `SELECT c.id, c.name, c.event_code, c.event_venue,
              u.name AS brand_name, u.company_name AS brand_company,
              u.company_logo AS brand_logo
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.brand_id
       WHERE UPPER(c.event_code) = UPPER($1) AND c.status = 'active'
       LIMIT 1`,
      [eventCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or not active' });
    }

    const c = result.rows[0];
    res.json({
      name: c.name,
      event_code: c.event_code,
      event_venue: c.event_venue,
      brand_name: c.brand_company || c.brand_name || 'this brand',
      brand_logo: c.brand_logo,
    });
  } catch (err) {
    console.error('getPublicCampaign error:', err);
    res.status(500).json({ error: 'Failed to load campaign info' });
  }
};

// POST /api/public/submissions — multipart form: photo + event_code + phone + consent
const submitPublic = async (req, res) => {
  try {
    const { event_code, phone_number, consent } = req.body;
    const photo = req.file;

    if (!event_code) return res.status(400).json({ error: 'event_code is required' });
    if (!phone_number) return res.status(400).json({ error: 'Phone number is required' });
    if (!photo) return res.status(400).json({ error: 'A photo is required' });
    if (consent !== 'true' && consent !== true) {
      return res.status(400).json({ error: 'You must agree to the terms to receive a code' });
    }

    // Resolve active campaign by event_code (case-insensitive)
    const campaignResult = await db.query(
      `SELECT * FROM campaigns WHERE UPPER(event_code) = UPPER($1) AND status = 'active' LIMIT 1`,
      [event_code]
    );
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or not active' });
    }
    const campaign = campaignResult.rows[0];

    // Insert submission. UNIQUE(campaign_id, phone_number) catches duplicates.
    const messageId = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    let submissionId;
    try {
      const insertResult = await db.query(
        `INSERT INTO photo_submissions (campaign_id, phone_number, twilio_message_sid)
         VALUES ($1, $2, $3) RETURNING id`,
        [campaign.id, phone_number, messageId]
      );
      submissionId = insertResult.rows[0].id;
    } catch (err) {
      if (err.code === '23505') {
        // Duplicate phone for this campaign — return their existing code
        const existing = await db.query(
          `SELECT c.code FROM photo_submissions ps
           LEFT JOIN coupons c ON c.id = ps.coupon_id
           WHERE ps.campaign_id = $1 AND ps.phone_number = $2`,
          [campaign.id, phone_number]
        );
        const existingCode = existing.rows[0]?.code;
        return res.status(409).json({
          error: "You've already claimed a code for this event!",
          code: existingCode,
          already_claimed: true,
        });
      }
      throw err;
    }

    // Upload photo to Cloudinary (best-effort)
    try {
      const publicId = `${campaign.event_code.toLowerCase()}-${submissionId}`;
      const uploadResult = await uploadBufferToCloudinary(photo.buffer, CLOUDINARY_FOLDER, publicId);
      await db.query(
        `UPDATE photo_submissions SET media_url = $1 WHERE id = $2`,
        [uploadResult.secure_url, submissionId]
      );
      console.log(`[public] Photo uploaded: ${uploadResult.secure_url}`);
    } catch (uploadErr) {
      console.error('[public] Photo upload failed (continuing):', uploadErr.message);
    }

    // Allocate coupon atomically
    const couponResult = await db.query(
      `UPDATE coupons
       SET status = 'assigned', submission_id = $1, assigned_at = NOW()
       WHERE id = (
         SELECT id FROM coupons WHERE campaign_id = $2 AND status = 'available'
         ORDER BY id ASC FOR UPDATE SKIP LOCKED LIMIT 1
       )
       RETURNING id, code`,
      [submissionId, campaign.id]
    );

    if (couponResult.rows.length === 0) {
      // Out of codes
      try {
        await sendEmail({
          to: ADMIN_ALERT_EMAIL,
          subject: `[BroughtBy] Out of codes — ${campaign.name}`,
          html: `<p>The coupon pool for <strong>${campaign.name}</strong> (event code <code>${campaign.event_code}</code>) is exhausted.</p>
                 <p>A web submission from ${phone_number} could not be assigned a code.</p>`,
        });
      } catch (emailErr) {
        console.error('[public] Admin alert email failed:', emailErr.message);
      }
      return res.status(503).json({ error: "We're temporarily out of codes for this event!" });
    }
    const coupon = couponResult.rows[0];

    await db.query(
      `UPDATE photo_submissions SET coupon_id = $1, replied_at = NOW() WHERE id = $2`,
      [coupon.id, submissionId]
    );

    await db.query(
      `INSERT INTO phone_consent (phone_number, terms_version)
       VALUES ($1, $2) ON CONFLICT (phone_number) DO NOTHING`,
      [phone_number, CONSENT_TERMS_VERSION]
    );

    console.log(`[public] Code ${coupon.code} issued for ${phone_number} (submission ${submissionId})`);
    return res.json({
      success: true,
      code: coupon.code,
      campaign_name: campaign.name,
    });
  } catch (err) {
    console.error('submitPublic error:', err);
    return res.status(500).json({ error: 'Submission failed' });
  }
};

module.exports = { getPublicCampaign, submitPublic };
