const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

function getClient() {
  if (client) return client;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured (set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)');
  }
  client = twilio(accountSid, authToken);
  return client;
}

// Validates X-Twilio-Signature header against the request body and full URL.
// In development (no auth token set), returns true with a warning so local
// testing isn't blocked. Production must have TWILIO_AUTH_TOKEN configured.
function validateSignature(req) {
  if (!authToken) {
    console.warn('[twilio] TWILIO_AUTH_TOKEN not set — skipping signature validation');
    return true;
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    console.warn('[twilio] Missing X-Twilio-Signature header');
    return false;
  }

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = `${proto}://${host}${req.originalUrl}`;

  return twilio.validateRequest(authToken, signature, url, req.body);
}

async function sendSms({ to, body }) {
  const c = getClient();
  return c.messages.create({ from: fromNumber, to, body });
}

// Twilio media URLs require basic auth using the account SID + auth token.
// Returns a Buffer of the image bytes.
async function downloadMedia(mediaUrl) {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Twilio media download failed: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { validateSignature, sendSms, downloadMedia };
