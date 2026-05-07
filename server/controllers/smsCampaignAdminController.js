const db = require('../config/database');
const { sendSms } = require('../services/twilioService');

const CONSENT_TERMS_VERSION = 'v1';

const CAMPAIGN_FIELDS = [
  'brand_id',
  'name',
  'event_code',
  'event_venue',
  'twilio_number',
  'active_start',
  'active_end',
  'reply_message_template',
  'consent_message_template',
  'already_claimed_message_template',
  'out_of_codes_message_template',
  'status',
];

const VALID_STATUSES = ['draft', 'active', 'paused', 'ended'];

function fillTemplate(template, code) {
  return (template || '').replace(/\[CODE\]/g, code || '');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// === Campaign CRUD ===

const listCampaigns = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*,
              u.name AS brand_name,
              u.company_name AS brand_company,
              COALESCE(s.submission_count, 0) AS submission_count,
              COALESCE(p.coupon_total, 0) AS coupon_total,
              COALESCE(p.coupon_assigned, 0) AS coupon_assigned
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.brand_id
       LEFT JOIN (
         SELECT campaign_id, COUNT(*) AS submission_count
         FROM photo_submissions
         GROUP BY campaign_id
       ) s ON s.campaign_id = c.id
       LEFT JOIN (
         SELECT campaign_id,
                COUNT(*) AS coupon_total,
                COUNT(*) FILTER (WHERE status = 'assigned') AS coupon_assigned
         FROM coupons
         GROUP BY campaign_id
       ) p ON p.campaign_id = c.id
       ORDER BY c.created_at DESC`,
      []
    );

    res.json({ campaigns: result.rows });
  } catch (err) {
    console.error('listCampaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
};

const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaignResult = await db.query(
      `SELECT c.*,
              u.name AS brand_name,
              u.company_name AS brand_company
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.brand_id
       WHERE c.id = $1`,
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaign = campaignResult.rows[0];

    const statsResult = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM photo_submissions WHERE campaign_id = $1) AS submission_count,
         (SELECT COUNT(DISTINCT phone_number) FROM photo_submissions WHERE campaign_id = $1) AS unique_phone_count,
         (SELECT MAX(submitted_at) FROM photo_submissions WHERE campaign_id = $1) AS last_submission_at,
         (SELECT COUNT(*) FROM coupons WHERE campaign_id = $1) AS coupon_total,
         (SELECT COUNT(*) FROM coupons WHERE campaign_id = $1 AND status = 'assigned') AS coupon_assigned`,
      [id]
    );

    res.json({ campaign, stats: statsResult.rows[0] });
  } catch (err) {
    console.error('getCampaign error:', err);
    res.status(500).json({ error: 'Failed to load campaign' });
  }
};

const createCampaign = async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.brand_id || !body.name || !body.event_code || !body.twilio_number) {
      return res.status(400).json({ error: 'brand_id, name, event_code, and twilio_number are required' });
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const fields = CAMPAIGN_FIELDS.filter(f => body[f] !== undefined);
    const values = fields.map(f => body[f]);
    const placeholders = fields.map((_, i) => `$${i + 1}`);

    const result = await db.query(
      `INSERT INTO campaigns (${fields.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );

    res.status(201).json({ campaign: result.rows[0] });
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const fields = CAMPAIGN_FIELDS.filter(f => body[f] !== undefined);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const values = fields.map(f => body[f]);
    const sets = fields.map((f, i) => `${f} = $${i + 1}`);
    values.push(id);

    const result = await db.query(
      `UPDATE campaigns
       SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign: result.rows[0] });
  } catch (err) {
    console.error('updateCampaign error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

// === Submissions ===

const listSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);

    const result = await db.query(
      `SELECT ps.id, ps.campaign_id, ps.phone_number, ps.twilio_message_sid,
              ps.media_url, ps.coupon_id, ps.submitted_at, ps.replied_at,
              c.code AS coupon_code
       FROM photo_submissions ps
       LEFT JOIN coupons c ON c.id = ps.coupon_id
       WHERE ps.campaign_id = $1
       ORDER BY ps.submitted_at DESC
       LIMIT $2`,
      [id, limit]
    );

    res.json({ submissions: result.rows });
  } catch (err) {
    console.error('listSubmissions error:', err);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
};

const exportSubmissionsCsv = async (req, res) => {
  try {
    const { id } = req.params;

    const campaignResult = await db.query(
      `SELECT name, event_code FROM campaigns WHERE id = $1`,
      [id]
    );
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaign = campaignResult.rows[0];

    const result = await db.query(
      `SELECT ps.phone_number, ps.media_url, c.code, ps.submitted_at, ps.replied_at
       FROM photo_submissions ps
       LEFT JOIN coupons c ON c.id = ps.coupon_id
       WHERE ps.campaign_id = $1
       ORDER BY ps.submitted_at ASC`,
      [id]
    );

    const header = ['phone_number', 'photo_url', 'code', 'submitted_at', 'replied_at'];
    const lines = [header.join(',')];
    for (const row of result.rows) {
      lines.push([
        csvEscape(row.phone_number),
        csvEscape(row.media_url),
        csvEscape(row.code),
        csvEscape(row.submitted_at?.toISOString?.() || row.submitted_at),
        csvEscape(row.replied_at?.toISOString?.() || row.replied_at),
      ].join(','));
    }

    const filename = `submissions-${campaign.event_code || campaign.name}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n') + '\n');
  } catch (err) {
    console.error('exportSubmissionsCsv error:', err);
    res.status(500).json({ error: 'Failed to export submissions' });
  }
};

// === Coupons ===

const uploadCoupons = async (req, res) => {
  try {
    const { id } = req.params;
    const codes = req.body?.codes;

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'codes must be a non-empty array of strings' });
    }
    if (codes.length > 10000) {
      return res.status(400).json({ error: 'Maximum 10,000 codes per upload' });
    }

    const trimmed = codes.map(c => String(c).trim()).filter(Boolean);
    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'No valid codes after trimming' });
    }

    const campaignCheck = await db.query(`SELECT id FROM campaigns WHERE id = $1`, [id]);
    if (campaignCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const client = await db.pool.connect();
    let inserted = 0;
    let skipped = 0;
    try {
      await client.query('BEGIN');
      for (const code of trimmed) {
        const r = await client.query(
          `INSERT INTO coupons (campaign_id, code) VALUES ($1, $2)
           ON CONFLICT (code) DO NOTHING
           RETURNING id`,
          [id, code]
        );
        if (r.rows.length > 0) inserted++;
        else skipped++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const totalsResult = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'available') AS available
       FROM coupons WHERE campaign_id = $1`,
      [id]
    );

    res.json({
      inserted,
      skipped,
      total: parseInt(totalsResult.rows[0].total, 10),
      available: parseInt(totalsResult.rows[0].available, 10),
    });
  } catch (err) {
    console.error('uploadCoupons error:', err);
    res.status(500).json({ error: 'Failed to upload coupons' });
  }
};

const getCouponPool = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'available') AS available,
              COUNT(*) FILTER (WHERE status = 'assigned') AS assigned
       FROM coupons WHERE campaign_id = $1`,
      [id]
    );
    const row = result.rows[0];
    res.json({
      total: parseInt(row.total, 10),
      available: parseInt(row.available, 10),
      assigned: parseInt(row.assigned, 10),
    });
  } catch (err) {
    console.error('getCouponPool error:', err);
    res.status(500).json({ error: 'Failed to load coupon pool' });
  }
};

// === Manual override ===

const manualAssign = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number, send_sms = true } = req.body || {};

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    const campaignResult = await db.query(`SELECT * FROM campaigns WHERE id = $1`, [id]);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaign = campaignResult.rows[0];

    const existing = await db.query(
      `SELECT ps.id, c.code FROM photo_submissions ps
       LEFT JOIN coupons c ON c.id = ps.coupon_id
       WHERE ps.campaign_id = $1 AND ps.phone_number = $2`,
      [id, phone_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Phone number already has a submission for this campaign',
        existing_code: existing.rows[0].code,
      });
    }

    const submissionResult = await db.query(
      `INSERT INTO photo_submissions (campaign_id, phone_number, twilio_message_sid)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [id, phone_number, `manual-${Date.now()}-${Math.floor(Math.random() * 1e6)}`]
    );
    const submissionId = submissionResult.rows[0].id;

    const couponResult = await db.query(
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
      [submissionId, id]
    );

    if (couponResult.rows.length === 0) {
      return res.status(409).json({ error: 'No available coupons in pool' });
    }
    const coupon = couponResult.rows[0];

    await db.query(
      `UPDATE photo_submissions SET coupon_id = $1, replied_at = NOW() WHERE id = $2`,
      [coupon.id, submissionId]
    );

    await db.query(
      `INSERT INTO phone_consent (phone_number, terms_version)
       VALUES ($1, $2)
       ON CONFLICT (phone_number) DO NOTHING`,
      [phone_number, CONSENT_TERMS_VERSION]
    );

    let smsSent = false;
    let smsError = null;
    if (send_sms) {
      try {
        const replyTemplate = campaign.consent_message_template || campaign.reply_message_template;
        await sendSms({
          to: phone_number,
          body: fillTemplate(replyTemplate, coupon.code),
        });
        smsSent = true;
      } catch (smsErr) {
        smsError = smsErr.message;
        console.error('manualAssign SMS failed:', smsErr.message);
      }
    }

    res.json({ submission_id: submissionId, code: coupon.code, sms_sent: smsSent, sms_error: smsError });
  } catch (err) {
    console.error('manualAssign error:', err);
    res.status(500).json({ error: 'Failed to assign coupon' });
  }
};

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  listSubmissions,
  exportSubmissionsCsv,
  uploadCoupons,
  getCouponPool,
  manualAssign,
};
