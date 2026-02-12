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

// Generate password reset email HTML
const generatePasswordResetEmail = ({ userName, resetLink }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
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
          margin-bottom: 20px;
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
        .warning-box {
          background-color: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 15px 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .warning-text {
          font-size: 14px;
          color: #92400E;
          margin: 0;
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
          <h2 class="greeting">Reset Your Password</h2>

          <p class="message">
            Hi ${userName},
          </p>

          <p class="message">
            We received a request to reset your password for your BroughtBy account. Click the button below to create a new password:
          </p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="cta-button">
              Reset Password
            </a>
          </div>

          <div class="warning-box">
            <p class="warning-text">
              ⏱️ This link expires in 1 hour for security reasons.
            </p>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>

          <p class="message" style="font-size: 14px; color: #9CA3AF;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #0A2540; word-break: break-all;">${resetLink}</span>
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
            You're receiving this email because a password reset was requested for this account.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send password reset email
const sendPasswordResetEmail = async ({ userEmail, userName, resetLink }) => {
  const subject = 'Reset Your BroughtBy Password';
  const html = generatePasswordResetEmail({
    userName,
    resetLink,
  });

  return await sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

// Helper functions for formatting
const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Generate partnership accepted email HTML (to Brand when BA accepts)
const generatePartnershipAcceptedEmail = ({ brandName, ambassadorName, ambassadorLocation, ambassadorBio }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Partnership Accepted</title>
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
        .ambassador-card {
          background-color: #F0F9FF;
          border-left: 4px solid #0A2540;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .ambassador-name {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        .ambassador-info {
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
          <h2 class="greeting">${ambassadorName} accepted your partnership request!</h2>

          <p class="message">
            Great news! ${ambassadorName} is excited to work with ${brandName}.
          </p>

          <!-- Ambassador Info Card -->
          <div class="ambassador-card">
            <h3 class="ambassador-name">${ambassadorName}</h3>
            ${ambassadorLocation ? `<p class="ambassador-info">📍 ${ambassadorLocation}</p>` : ''}
            ${ambassadorBio ? `<p class="ambassador-info" style="margin-top: 15px;">${ambassadorBio}</p>` : ''}
          </div>

          <p class="message">
            You can now start chatting with ${ambassadorName} to discuss partnership details, coordinate events, and build a great working relationship.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/matches" class="cta-button">
              Start Chatting
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            Head to your matches page to send a message and get the conversation started!
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
            You're receiving this email because you have a brand account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate booking request email HTML (to BA when Brand creates booking)
const generateBookingRequestEmail = ({ ambassadorName, brandName, eventName, eventDate, startTime, endTime, eventLocation, hourlyRate, totalCost, notes }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Request</title>
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
        .booking-card {
          background-color: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .event-name {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        .booking-detail {
          font-size: 14px;
          color: #374151;
          margin: 8px 0;
          display: flex;
          align-items: flex-start;
        }
        .detail-label {
          font-weight: 600;
          min-width: 100px;
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
          <h2 class="greeting">New booking request from ${brandName} on BroughtBy</h2>

          <p class="message">
            Hi ${ambassadorName}! ${brandName} has sent you a booking request for an upcoming event.
          </p>

          <!-- Booking Details Card -->
          <div class="booking-card">
            <h3 class="event-name">${eventName}</h3>
            <div class="booking-detail">
              <span class="detail-label">📅 Date:</span>
              <span>${formatDate(eventDate)}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">🕐 Time:</span>
              <span>${formatTime(startTime)} - ${formatTime(endTime)}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">📍 Location:</span>
              <span>${eventLocation}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">💰 Rate:</span>
              <span>$${hourlyRate}/hour</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">💵 Total:</span>
              <span style="font-weight: 600; color: #0A2540;">$${totalCost}</span>
            </div>
            ${notes ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #FDE68A;">
              <div class="booking-detail">
                <span class="detail-label">📝 Notes:</span>
              </div>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6B7280;">${notes}</p>
            </div>
            ` : ''}
          </div>

          <p class="message">
            Review the booking details and confirm your availability for this event.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/calendar" class="cta-button">
              Review Booking
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            You can accept or decline this booking from your calendar page.
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

// Generate booking confirmed email HTML (to Brand when BA confirms)
const generateBookingConfirmedEmail = ({ brandName, ambassadorName, eventName, eventDate, startTime, endTime, eventLocation, totalCost }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmed</title>
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
        .confirmed-badge {
          display: inline-block;
          background-color: #10B981;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
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
        .booking-card {
          background-color: #D1FAE5;
          border-left: 4px solid #10B981;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .event-name {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        .booking-detail {
          font-size: 14px;
          color: #374151;
          margin: 8px 0;
          display: flex;
          align-items: flex-start;
        }
        .detail-label {
          font-weight: 600;
          min-width: 120px;
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
          <span class="confirmed-badge">✓ CONFIRMED</span>
          <h2 class="greeting">Booking confirmed: ${ambassadorName} for ${eventName}</h2>

          <p class="message">
            Great news! ${ambassadorName} has confirmed your booking request.
          </p>

          <!-- Booking Details Card -->
          <div class="booking-card">
            <h3 class="event-name">${eventName}</h3>
            <div class="booking-detail">
              <span class="detail-label">👤 Ambassador:</span>
              <span>${ambassadorName}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">📅 Date:</span>
              <span>${formatDate(eventDate)}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">🕐 Time:</span>
              <span>${formatTime(startTime)} - ${formatTime(endTime)}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">📍 Location:</span>
              <span>${eventLocation}</span>
            </div>
            <div class="booking-detail">
              <span class="detail-label">💵 Total Cost:</span>
              <span style="font-weight: 600; color: #0A2540;">$${totalCost}</span>
            </div>
          </div>

          <p class="message">
            Your event is all set! You can view all your confirmed bookings in your calendar.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/calendar" class="cta-button">
              View Calendar
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            If you need to make any changes or have questions, reach out to ${ambassadorName} through your matches page.
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
            You're receiving this email because you have a brand account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send partnership accepted email to brand
const sendPartnershipAcceptedEmail = async ({ brandEmail, brandName, ambassadorName, ambassadorLocation, ambassadorBio }) => {
  const subject = `${ambassadorName} accepted your partnership request!`;
  const html = generatePartnershipAcceptedEmail({
    brandName,
    ambassadorName,
    ambassadorLocation,
    ambassadorBio,
  });

  return await sendEmail({
    to: brandEmail,
    subject,
    html,
  });
};

// Send booking request email to ambassador
const sendBookingRequestEmail = async ({ ambassadorEmail, ambassadorName, brandName, eventName, eventDate, startTime, endTime, eventLocation, hourlyRate, totalCost, notes }) => {
  const subject = `New booking request from ${brandName} on BroughtBy`;
  const html = generateBookingRequestEmail({
    ambassadorName,
    brandName,
    eventName,
    eventDate,
    startTime,
    endTime,
    eventLocation,
    hourlyRate,
    totalCost,
    notes,
  });

  return await sendEmail({
    to: ambassadorEmail,
    subject,
    html,
  });
};

// Send booking confirmed email to brand
const sendBookingConfirmedEmail = async ({ brandEmail, brandName, ambassadorName, eventName, eventDate, startTime, endTime, eventLocation, totalCost }) => {
  const subject = `Booking confirmed: ${ambassadorName} for ${eventName}`;
  const html = generateBookingConfirmedEmail({
    brandName,
    ambassadorName,
    eventName,
    eventDate,
    startTime,
    endTime,
    eventLocation,
    totalCost,
  });

  return await sendEmail({
    to: brandEmail,
    subject,
    html,
  });
};

// Generate engagement request email HTML (to Account Manager when Brand creates engagement)
const generateEngagementRequestEmail = ({ accountManagerName, brandName, monthlyRate, startDate, notes }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Engagement Request</title>
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
        .engagement-card {
          background-color: #DBEAFE;
          border-left: 4px solid #10B981;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .engagement-title {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        .engagement-detail {
          font-size: 14px;
          color: #374151;
          margin: 8px 0;
          display: flex;
          align-items: flex-start;
        }
        .detail-label {
          font-weight: 600;
          min-width: 140px;
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
          <h2 class="greeting">New engagement request from ${brandName} on BroughtBy</h2>

          <p class="message">
            Hi ${accountManagerName}! ${brandName} has sent you an engagement request to join their team as an account manager.
          </p>

          <!-- Engagement Details Card -->
          <div class="engagement-card">
            <h3 class="engagement-title">Account Management Engagement</h3>
            <div class="engagement-detail">
              <span class="detail-label">💰 Monthly Retainer:</span>
              <span style="font-weight: 600; color: #0A2540;">$${monthlyRate.toLocaleString()}/month</span>
            </div>
            <div class="engagement-detail">
              <span class="detail-label">📅 Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
            ${notes ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #BFDBFE;">
              <div class="engagement-detail">
                <span class="detail-label">📝 Scope of Work:</span>
              </div>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6B7280;">${notes}</p>
            </div>
            ` : ''}
          </div>

          <p class="message">
            Review the engagement details and confirm if you're interested in working with ${brandName}.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/my-team" class="cta-button">
              Review Engagement
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            You can accept or decline this engagement from your My Team page.
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
            You're receiving this email because you have an account manager account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate engagement accepted email HTML (to Brand when Account Manager accepts)
const generateEngagementAcceptedEmail = ({ brandName, accountManagerName, monthlyRate, startDate }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Engagement Accepted</title>
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
        .confirmed-badge {
          display: inline-block;
          background-color: #10B981;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
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
        .engagement-card {
          background-color: #D1FAE5;
          border-left: 4px solid #10B981;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .engagement-title {
          font-size: 20px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        .engagement-detail {
          font-size: 14px;
          color: #374151;
          margin: 8px 0;
          display: flex;
          align-items: flex-start;
        }
        .detail-label {
          font-weight: 600;
          min-width: 140px;
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
          <span class="confirmed-badge">✓ ACCEPTED</span>
          <h2 class="greeting">Engagement accepted: ${accountManagerName} has joined your team!</h2>

          <p class="message">
            Great news! ${accountManagerName} has accepted your engagement request and is ready to start working with ${brandName}.
          </p>

          <!-- Engagement Details Card -->
          <div class="engagement-card">
            <h3 class="engagement-title">Account Management Engagement</h3>
            <div class="engagement-detail">
              <span class="detail-label">👤 Account Manager:</span>
              <span>${accountManagerName}</span>
            </div>
            <div class="engagement-detail">
              <span class="detail-label">💰 Monthly Retainer:</span>
              <span style="font-weight: 600; color: #0A2540;">$${monthlyRate.toLocaleString()}/month</span>
            </div>
            <div class="engagement-detail">
              <span class="detail-label">📅 Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
          </div>

          <p class="message">
            Your engagement is now active! You can view ${accountManagerName} and all your team members on your My Team page.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/my-team" class="cta-button">
              View My Team
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            If you need to make any changes or have questions, reach out to ${accountManagerName} through your matches page.
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
            You're receiving this email because you have a brand account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send engagement request email to account manager
const sendEngagementRequestEmail = async ({ accountManagerEmail, accountManagerName, brandName, monthlyRate, startDate, notes }) => {
  const subject = `New engagement request from ${brandName} on BroughtBy`;
  const html = generateEngagementRequestEmail({
    accountManagerName,
    brandName,
    monthlyRate,
    startDate,
    notes,
  });

  return await sendEmail({
    to: accountManagerEmail,
    subject,
    html,
  });
};

// Send engagement accepted email to brand
const sendEngagementAcceptedEmail = async ({ brandEmail, brandName, accountManagerName, monthlyRate, startDate }) => {
  const subject = `Engagement accepted: ${accountManagerName} has joined your team!`;
  const html = generateEngagementAcceptedEmail({
    brandName,
    accountManagerName,
    monthlyRate,
    startDate,
  });

  return await sendEmail({
    to: brandEmail,
    subject,
    html,
  });
};

// Generate new message email HTML
const generateNewMessageEmail = ({ recipientName, senderName, messagePreview, matchId }) => {
  // Truncate message preview to ~100 characters
  const preview = messagePreview.length > 100
    ? messagePreview.substring(0, 100) + '...'
    : messagePreview;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Message</title>
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
        .message-card {
          background-color: #F0F9FF;
          border-left: 4px solid #D4AF37;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .sender-name {
          font-size: 16px;
          color: #0A2540;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        .message-preview {
          font-size: 14px;
          color: #6B7280;
          font-style: italic;
          margin: 0;
          line-height: 1.5;
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
          <h2 class="greeting">New message from ${senderName}</h2>

          <p class="message">
            Hi ${recipientName}! You have a new message on BroughtBy.
          </p>

          <!-- Message Preview Card -->
          <div class="message-card">
            <p class="sender-name">${senderName} wrote:</p>
            <p class="message-preview">"${preview}"</p>
          </div>

          <p class="message">
            Open the conversation to read the full message and reply.
          </p>

          <div style="text-align: center;">
            <a href="https://app.broughtby.co/chat/${matchId}" class="cta-button">
              View Conversation
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="font-size: 14px;">
            Stay connected with your matches and keep the conversation going!
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
            You're receiving this email because you have an account on BroughtBy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send engagement created email (admin-initiated) - sends to both brand and AM
const sendEngagementCreatedEmail = async ({ brandEmail, brandName, amEmail, amName, monthlyRate, startDate }) => {
  // Email to brand
  const brandSubject = `${amName} is now your Account Manager on BroughtBy`;
  const brandHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Manager Assigned</title>
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
        .engagement-card {
          background-color: #D1FAE5;
          border-left: 4px solid #10B981;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
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
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1 class="logo">BroughtBy</h1>
        </div>
        <div class="content">
          <h2 class="greeting">Welcome your new Account Manager!</h2>
          <p class="message">
            Great news! ${amName} has been assigned as your dedicated Account Manager on BroughtBy.
          </p>
          <div class="engagement-card">
            <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #0A2540;">Account Manager: ${amName}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #374151;">💰 Monthly Retainer: $${monthlyRate.toLocaleString()}/month</p>
            <p style="margin: 5px 0; font-size: 14px; color: #374151;">📅 Start Date: ${formatDate(startDate)}</p>
          </div>
          <p class="message">
            ${amName} will help you discover and book brand ambassadors for your events. You can now message them directly to get started!
          </p>
          <div style="text-align: center;">
            <a href="https://app.broughtby.co/matches" class="cta-button">
              Message ${amName}
            </a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>BroughtBy</strong> - Premium Brand Ambassador Marketplace
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Email to account manager
  const amSubject = `New Client: ${brandName} on BroughtBy`;
  const amHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Client Assigned</title>
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
        .engagement-card {
          background-color: #DBEAFE;
          border-left: 4px solid #0A2540;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
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
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1 class="logo">BroughtBy</h1>
        </div>
        <div class="content">
          <h2 class="greeting">New client: ${brandName}</h2>
          <p class="message">
            You've been assigned as the Account Manager for ${brandName} on BroughtBy!
          </p>
          <div class="engagement-card">
            <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #0A2540;">Client: ${brandName}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #374151;">💰 Monthly Retainer: $${monthlyRate.toLocaleString()}/month</p>
            <p style="margin: 5px 0; font-size: 14px; color: #374151;">📅 Start Date: ${formatDate(startDate)}</p>
          </div>
          <p class="message">
            Reach out to ${brandName} to introduce yourself and start helping them find the perfect brand ambassadors for their events.
          </p>
          <div style="text-align: center;">
            <a href="https://app.broughtby.co/matches" class="cta-button">
              Message ${brandName}
            </a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>BroughtBy</strong> - Premium Brand Ambassador Marketplace
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send both emails in parallel
  return await Promise.all([
    sendEmail({ to: brandEmail, subject: brandSubject, html: brandHtml }),
    sendEmail({ to: amEmail, subject: amSubject, html: amHtml })
  ]);
};

module.exports = {
  sendEmail,
  sendPartnershipRequestEmail,
  generatePartnershipRequestEmail,
  sendPasswordResetEmail,
  generatePasswordResetEmail,
  sendPartnershipAcceptedEmail,
  generatePartnershipAcceptedEmail,
  sendBookingRequestEmail,
  generateBookingRequestEmail,
  sendBookingConfirmedEmail,
  generateBookingConfirmedEmail,
  sendEngagementRequestEmail,
  generateEngagementRequestEmail,
  sendEngagementAcceptedEmail,
  generateEngagementAcceptedEmail,
  sendEngagementCreatedEmail,
  generateNewMessageEmail,
};
