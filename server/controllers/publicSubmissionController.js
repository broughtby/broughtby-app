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

// POST /api/public/submissions — multipart form: photos[] + event_code + email + consent
const submitPublic = async (req, res) => {
  try {
    const { event_code, email, consent } = req.body;
    const photos = req.files || [];

    if (!event_code) return res.status(400).json({ error: 'event_code is required' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (photos.length === 0) return res.status(400).json({ error: 'At least one photo is required' });
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

    // Insert submission. Partial unique index on (campaign_id, email) catches duplicates.
    const messageId = `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    let submissionId;
    try {
      const insertResult = await db.query(
        `INSERT INTO photo_submissions (campaign_id, email, twilio_message_sid)
         VALUES ($1, $2, $3) RETURNING id`,
        [campaign.id, email, messageId]
      );
      submissionId = insertResult.rows[0].id;
    } catch (err) {
      if (err.code === '23505') {
        // Duplicate email for this campaign — return their existing code
        // (or static_code, if the campaign uses one)
        let existingCode = campaign.static_code || null;
        if (!existingCode) {
          const existing = await db.query(
            `SELECT c.code FROM photo_submissions ps
             LEFT JOIN coupons c ON c.id = ps.coupon_id
             WHERE ps.campaign_id = $1 AND ps.email = $2`,
            [campaign.id, email]
          );
          existingCode = existing.rows[0]?.code;
        }
        return res.status(409).json({
          error: "You've already claimed a code for this event!",
          code: existingCode,
          already_claimed: true,
        });
      }
      throw err;
    }

    // Upload all photos to Cloudinary in parallel (best-effort)
    const uploadedUrls = [];
    await Promise.all(photos.map(async (photo, idx) => {
      try {
        const publicId = `${campaign.event_code.toLowerCase()}-${submissionId}-${idx + 1}`;
        const uploadResult = await uploadBufferToCloudinary(photo.buffer, CLOUDINARY_FOLDER, publicId);
        uploadedUrls[idx] = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error(`[public] Photo ${idx + 1} upload failed:`, uploadErr.message);
      }
    }));

    const successfulUrls = uploadedUrls.filter(Boolean);
    if (successfulUrls.length > 0) {
      await db.query(
        `UPDATE photo_submissions
         SET media_url = $1, media_urls = $2
         WHERE id = $3`,
        [successfulUrls[0], successfulUrls, submissionId]
      );
      console.log(`[public] Uploaded ${successfulUrls.length}/${photos.length} photos for submission ${submissionId}`);
    }

    // Determine code: static_code wins if set, otherwise allocate from pool
    let code;
    if (campaign.static_code) {
      code = campaign.static_code;
    } else {
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
        try {
          await sendEmail({
            to: ADMIN_ALERT_EMAIL,
            subject: `[BroughtBy] Out of codes — ${campaign.name}`,
            html: `<p>The coupon pool for <strong>${campaign.name}</strong> (event code <code>${campaign.event_code}</code>) is exhausted.</p>
                   <p>A web submission from ${email} could not be assigned a code.</p>`,
          });
        } catch (emailErr) {
          console.error('[public] Admin alert email failed:', emailErr.message);
        }
        return res.status(503).json({ error: "We're temporarily out of codes for this event!" });
      }

      const coupon = couponResult.rows[0];
      await db.query(
        `UPDATE photo_submissions SET coupon_id = $1 WHERE id = $2`,
        [coupon.id, submissionId]
      );
      code = coupon.code;
    }

    await db.query(
      `UPDATE photo_submissions SET replied_at = NOW() WHERE id = $1`,
      [submissionId]
    );

    console.log(`[public] Code ${code} issued for ${email} (submission ${submissionId})`);
    return res.json({
      success: true,
      code,
      campaign_name: campaign.name,
    });
  } catch (err) {
    console.error('submitPublic error:', err);
    return res.status(500).json({ error: 'Submission failed' });
  }
};

module.exports = { getPublicCampaign, submitPublic };
