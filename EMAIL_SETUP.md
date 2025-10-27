# Email Notification Setup Guide

BroughtBy sends email notifications to ambassadors when brands send partnership requests. This guide will help you set up email notifications.

## 📧 Email Service Options

### Option 1: Gmail (Easiest - Recommended for Getting Started)

**Best for:** Development, testing, small-scale production
**Cost:** Free
**Limit:** 500 emails/day

#### Setup Steps:

1. **Enable 2-Factor Authentication on Gmail**
   - Go to your Google Account settings
   - Navigate to Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character app password

3. **Add Environment Variables to Render**

   In your Render dashboard, add these environment variables:

   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (your app password)
   EMAIL_FROM=BroughtBy <noreply@broughtby.co>
   ```

   **Note:** Use the app-specific password, NOT your regular Gmail password!

---

### Option 2: SendGrid (Recommended for Production)

**Best for:** Production, higher volume
**Cost:** Free tier (100 emails/day), paid plans available
**Limit:** 100 emails/day (free), unlimited (paid)

#### Setup Steps:

1. **Sign up for SendGrid**
   - Visit: https://sendgrid.com
   - Create a free account

2. **Verify Your Sender Identity**
   - Go to Settings > Sender Authentication
   - Verify a single sender email (for free tier)
   - Or set up domain authentication (for better deliverability)

3. **Create API Key**
   - Navigate to Settings > API Keys
   - Click "Create API Key"
   - Select "Full Access" or "Restricted Access" (with Mail Send permission)
   - Copy the API key (you'll only see it once!)

4. **Add Environment Variables to Render**

   In your Render dashboard, add these environment variables:

   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=BroughtBy <noreply@broughtby.co>
   ```

---

## 🚀 Quick Start (Gmail)

For the fastest setup, use Gmail:

1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password
3. In Render dashboard, add environment variables:
   - `EMAIL_SERVICE` = `gmail`
   - `EMAIL_USER` = your Gmail address
   - `EMAIL_PASSWORD` = the 16-character app password
   - `EMAIL_FROM` = `BroughtBy <noreply@broughtby.co>`

4. Deploy your app to Render

That's it! Test by having a brand send a partnership request.

---

## 🎨 Email Template

The partnership request email includes:

- **Subject:** `[Brand Name] wants to work with you on BroughtBy!`
- **Content:**
  - Personalized greeting
  - Brand name, location, and bio
  - Call-to-action button linking to app.broughtby.co/matches
  - Professional BroughtBy branding
  - Responsive HTML design (mobile-friendly)

---

## 🧪 Testing

### Test Email Delivery:

1. Create a brand account
2. Create an ambassador account (use your email)
3. From the brand account, browse ambassadors
4. Click "Request to Work Together"
5. Check the ambassador's email inbox

### Troubleshooting:

**Emails not sending?**
- Check Render logs for error messages
- Verify environment variables are set correctly
- For Gmail: Ensure 2FA is enabled and you're using app password
- For SendGrid: Verify sender identity is confirmed

**Emails going to spam?**
- For Gmail: Accept the first email to train Gmail
- For SendGrid: Set up domain authentication
- Make sure EMAIL_FROM matches your verified sender

---

## 📊 Environment Variables Reference

### Required for Gmail:
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-specific-password
EMAIL_FROM=BroughtBy <noreply@broughtby.co>
```

### Required for SendGrid:
```bash
SENDGRID_API_KEY=SG.your-api-key
EMAIL_FROM=BroughtBy <verified-sender@yourdomain.com>
```

---

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
   - All email credentials are in .env (which is gitignored)
   - Only use environment variables

2. **Use App Passwords for Gmail**
   - Never use your actual Gmail password
   - App passwords can be revoked if compromised

3. **Restrict SendGrid API Keys**
   - Only grant "Mail Send" permission
   - Rotate keys regularly

---

## 📈 Scaling Considerations

### Gmail Limits:
- 500 emails/day
- Good for: < 20 partnership requests/day

### SendGrid Free Tier:
- 100 emails/day
- Good for: < 100 partnership requests/day

### SendGrid Paid Plans:
- Starting at $19.95/month (50,000 emails/month)
- Good for: Production with high volume

---

## 🆘 Support

**Gmail Setup Issues:**
- https://support.google.com/accounts/answer/185833

**SendGrid Documentation:**
- https://docs.sendgrid.com/

**BroughtBy Issues:**
- Check server/services/emailService.js
- Review Render logs for email errors
- Email errors won't fail partnership requests (graceful degradation)

---

## 🎯 Next Steps

After setting up email notifications:

1. ✅ Add environment variables to Render
2. ✅ Deploy your application
3. ✅ Test with a partnership request
4. ✅ Monitor email delivery in logs
5. ✅ Consider domain authentication (SendGrid) for better deliverability

---

**Questions?** Check the implementation in `server/services/emailService.js`
