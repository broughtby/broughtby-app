const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Send email function - uses Resend API or falls back to Nodemailer
const sendEmail = async ({ to, subject, html }) => {
  try {
    // Option 1: Resend (Recommended - simplest and works with custom domains)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'BroughtBy <onboarding@resend.dev>',
        to,
        subject,
        html,
      });

      console.log('Email sent successfully via Resend:', result.id);
      return { success: true, messageId: result.id };
    }

    // Fallback to Nodemailer for other email services
    const transporter = createNodemailerTransporter();

    if (!transporter) {
      console.log('Email not sent: Email service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via Nodemailer:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Create Nodemailer transporter (fallback for non-Resend services)
const createNodemailerTransporter = () => {
  // SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Google OAuth2 (Gmail or Google Workspace)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN && process.env.EMAIL_USER) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: process.env.GOOGLE_ACCESS_TOKEN,
      },
    });
  }

  // Gmail App Password
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Custom SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_PORT &&
      process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  console.warn('Email service not configured. Set RESEND_API_KEY (recommended) or other email credentials');
  return null;
};

// Generate partnership request email HTML
const generatePartnershipRequestEmail = ({ brandName, brandLocation, ambassadorName, brandBio }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Partnership Request</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #F7F8FA;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #0A2540 0%, #0D3350 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .logo {
          color: #D4AF37;
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 1px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 24px;
          color: #0A2540;
          margin: 0 0 20px 0;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #4B5563;
          margin-bottom: 30px;
        }
        .brand-card {
          background-color: #F7F8FA;
          border-left: 4px solid #D4AF37;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .brand-name {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        .brand-info {
          font-size: 14px;
          color: #6B7280;
          margin: 5px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #0A2540;
          color: #ffffff;
          text-decoration: none;
          padding: 16px 40px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          background-color: #F7F8FA;
          padding: 30px;
          text-align: center;
          font-size: 14px;
          color: #6B7280;
        }
        .footer-link {
          color: #0A2540;
          text-decoration: none;
        }
        .divider {
          height: 1px;
          background-color: #E5E7EB;
          margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 30px 20px;
          }
          .header {
            padding: 30px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1 class="logo">BroughtBy</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <h2 class="greeting">Hi ${ambassadorName}! 👋</h2>

          <p class="message">
            Great news! A brand is interested in working with you on BroughtBy.
          </p>

          <!-- Brand Info Card -->
          <div class="brand-card">
            <h3 class="brand-name">${brandName}</h3>
            ${brandLocation ? `<p class="brand-info">📍 ${brandLocation}</p>` : ''}
            ${brandBio ? `<p class="brand-info" style="margin-top: 15px;">${brandBio}</p>` : ''}
          </div>

          <p class="message">
            <strong>${brandName}</strong> wants to partner with you! They've sent you a partnership request and are excited to explore working together.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/matches" class="cta-button">
              View Request & Respond
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            You can accept or decline this request from your BroughtBy dashboard. Once you accept, you'll be able to message each other and discuss partnership details.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>BroughtBy</strong> - Premium Brand Ambassador Marketplace
          </p>
          <p style="margin: 0;">
            <a href="https://app.broughtby.co" class="footer-link">Visit BroughtBy</a> ·
            <a href="https://app.broughtby.co/profile" class="footer-link">Manage Account</a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #9CA3AF;">
            You're receiving this email because you have an ambassador account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send partnership request email to ambassador
const sendPartnershipRequestEmail = async ({ ambassadorEmail, ambassadorName, brandName, brandLocation, brandBio }) => {
  const subject = `${brandName} wants to work with you on BroughtBy!`;
  const html = generatePartnershipRequestEmail({
    ambassadorName,
    brandName,
    brandLocation,
    brandBio,
  });

  return await sendEmail({
    to: ambassadorEmail,
    subject,
    html,
  });
};

module.exports = {
  sendEmail,
  sendPartnershipRequestEmail,
  generatePartnershipRequestEmail,
};
