const db = require('../config/database');
const cloudinary = require('../config/cloudinary');
const { validateSignature, sendSms, downloadMedia } = require('../services/twilioService');
const { sendEmail } = require('../services/emailService');

const ADMIN_ALERT_EMAIL = 'brooke@broughtby.co';
const CONSENT_TERMS_VERSION = 'v1';
const CLOUDINARY_FOLDER = 'broughtby/sms-campaigns';

const TWIML_OK = '<Response></Response>';

function fillTemplate(template, code) {
  return (template || '').replace(/\[CODE\]/g, code || '');
}

function uploadBufferToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function handleInboundMms(req, res) {
  if (!validateSignature(req)) {
    console.warn('[sms] Invalid Twilio signature, rejecting');
    return res.status(403).send('Invalid signature');
  }

  const { From: fromNumber, To: toNumber, MessageSid, NumMedia, MediaUrl0 } = req.body || {};
  const numMedia = parseInt(NumMedia || '0', 10);

  console.log(`[sms] Inbound from=${fromNumber} to=${toNumber} sid=${MessageSid} media=${numMedia}`);

  if (!fromNumber || !toNumber || !MessageSid) {
    console.warn('[sms] Missing required Twilio fields');
    return res.status(200).type('text/xml').send(TWIML_OK);
  }

  try {
    const campaignResult = await db.pool.query(
      `SELECT * FROM campaigns WHERE twilio_number = $1 AND status = 'active' LIMIT 1`,
      [toNumber]
    );
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      console.warn(`[sms] No active campaign for ${toNumber}`);
      return res.status(200).type('text/xml').send(TWIML_OK);
    }

    const dupResult = await db.pool.query(
      `SELECT id FROM photo_submissions WHERE twilio_message_sid = $1 LIMIT 1`,
      [MessageSid]
    );
    if (dupResult.rows.length > 0) {
      console.log(`[sms] Duplicate webhook ${MessageSid}, ignoring`);
      return res.status(200).type('text/xml').send(TWIML_OK);
    }

    if (numMedia === 0) {
      await sendSms({
        to: fromNumber,
        body: 'Please send a photo with your wine to receive your code!',
      });
      return res.status(200).type('text/xml').send(TWIML_OK);
    }

    let submissionId;
    try {
      const insertResult = await db.pool.query(
        `INSERT INTO photo_submissions (campaign_id, phone_number, twilio_message_sid)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [campaign.id, fromNumber, MessageSid]
      );
      submissionId = insertResult.rows[0].id;
    } catch (err) {
      if (err.code === '23505') {
        const existing = await db.pool.query(
          `SELECT c.code FROM photo_submissions ps
           LEFT JOIN coupons c ON c.id = ps.coupon_id
           WHERE ps.campaign_id = $1 AND ps.phone_number = $2`,
          [campaign.id, fromNumber]
        );
        const existingCode = existing.rows[0]?.code || '';
        await sendSms({
          to: fromNumber,
          body: fillTemplate(campaign.already_claimed_message_template, existingCode),
        });
        console.log(`[sms] Already-claimed reply sent to ${fromNumber}`);
        return res.status(200).type('text/xml').send(TWIML_OK);
      }
      throw err;
    }

    if (MediaUrl0) {
      try {
        const buffer = await downloadMedia(MediaUrl0);
        const publicId = `${campaign.event_code.toLowerCase()}-${submissionId}`;
        const uploadResult = await uploadBufferToCloudinary(buffer, CLOUDINARY_FOLDER, publicId);
        await db.pool.query(
          `UPDATE photo_submissions SET media_url = $1 WHERE id = $2`,
          [uploadResult.secure_url, submissionId]
        );
        console.log(`[sms] Photo uploaded: ${uploadResult.secure_url}`);
      } catch (uploadErr) {
        console.error('[sms] Photo upload failed (continuing):', uploadErr.message);
      }
    }

    const couponResult = await db.pool.query(
      `UPDATE coupons
       SET status = 'assigned', submission_id = $1, assigned_at = NOW()
       WHERE id = (
         SELECT id FROM coupons
         WHERE campaign_id = $2 AND status = 'available'
         ORDER BY id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id, code`,
      [submissionId, campaign.id]
    );
    const coupon = couponResult.rows[0];

    if (coupon) {
      await db.pool.query(
        `UPDATE photo_submissions SET coupon_id = $1 WHERE id = $2`,
        [coupon.id, submissionId]
      );

      const replyTemplate = campaign.consent_message_template || campaign.reply_message_template;
      await sendSms({
        to: fromNumber,
        body: fillTemplate(replyTemplate, coupon.code),
      });

      await db.pool.query(
        `INSERT INTO phone_consent (phone_number, terms_version)
         VALUES ($1, $2)
         ON CONFLICT (phone_number) DO NOTHING`,
        [fromNumber, CONSENT_TERMS_VERSION]
      );

      console.log(`[sms] Code ${coupon.code} sent to ${fromNumber}`);
    } else {
      const fallback = "We're temporarily out of codes for this event! We'll reach out shortly.";
      await sendSms({
        to: fromNumber,
        body: campaign.out_of_codes_message_template || fallback,
      });

      try {
        await sendEmail({
          to: ADMIN_ALERT_EMAIL,
          subject: `[BroughtBy] Out of codes — ${campaign.name}`,
          html: `<p>The coupon pool for <strong>${campaign.name}</strong> (event code <code>${campaign.event_code}</code>) is exhausted.</p>
                 <p>An incoming text from ${fromNumber} could not be assigned a code.</p>
                 <p>Upload more codes in the admin UI to resume.</p>`,
        });
      } catch (emailErr) {
        console.error('[sms] Admin alert email failed:', emailErr.message);
      }

      console.warn(`[sms] Out of codes for campaign ${campaign.id}`);
    }

    await db.pool.query(
      `UPDATE photo_submissions SET replied_at = NOW() WHERE id = $1`,
      [submissionId]
    );

    return res.status(200).type('text/xml').send(TWIML_OK);
  } catch (err) {
    console.error('[sms] Webhook error:', err);
    return res.status(500).send('Internal error');
  }
}

module.exports = { handleInboundMms };
