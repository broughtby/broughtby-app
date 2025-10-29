# Email Notification Setup Guide

BroughtBy sends email notifications to ambassadors when brands send partnership requests. This guide will help you set up email notifications.

---

## 🚀 Quick Setup with Resend (5 minutes) - RECOMMENDED

**Why Resend:**
- ✅ Simplest setup (just API key + FROM address)
- ✅ Works perfectly with custom domains (like brooke@broughtby.co)
- ✅ No complex OAuth or SMTP configuration
- ✅ Better deliverability than Gmail
- ✅ Free tier: 100 emails/day, 3,000/month
- ✅ Modern API, great documentation

### Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Click "Start Building"
3. Sign up with your email

### Step 2: Add Your Domain

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain: `broughtby.co`
4. Add the DNS records Resend provides to your domain registrar:
   - **SPF** record
   - **DKIM** record
   - **DMARC** record (optional but recommended)

**Note:** DNS changes can take up to 48 hours but usually work within minutes.

### Step 3: Verify Your Domain

1. Wait for DNS to propagate (check status in Resend dashboard)
2. Click "Verify" in Resend dashboard
3. Once verified, you can send from any address @broughtby.co

### Step 4: Get Your API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it: "BroughtBy Production"
4. Select permissions: "Sending access"
5. Click "Create"
6. **Copy the API key** (starts with `re_`) - you'll only see it once!

### Step 5: Add to Render Environment Variables

In your Render dashboard, add these environment variables:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=BroughtBy <brooke@broughtby.co>
```

**Important:**
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- Use your verified email address in `EMAIL_FROM`
- Remove any old `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_SERVICE` variables

### Step 6: Deploy and Test

1. **Deploy your app** - Render will redeploy with new env variables
2. **Test:** Send a partnership request from a brand account
3. **Check:** Ambassador should receive email at their registered email address
4. **Verify:** Check Render logs for: `"Email sent successfully via Resend"`

---

## ✅ That's It!

Resend is now configured and emails will be sent from `brooke@broughtby.co` (or whatever email you set).

---

## 📊 Monitoring Emails

### Check Delivery in Resend Dashboard

1. Go to https://resend.com/emails
2. See all sent emails, delivery status, and opens
3. Debug any delivery issues

### Check Render Logs

Look for these log messages:
```
Email sent successfully via Resend: [message-id]
```

If you see errors:
```
Error sending email: [error message]
```

---

## 🔍 Troubleshooting

### "Domain not verified" error

**Fix:**
1. Check DNS records are added correctly at your domain registrar
2. Wait for DNS propagation (can take up to 48 hours)
3. Use Resend's DNS checker in dashboard
4. Verify in Resend dashboard

### "Invalid API key" error

**Fix:**
1. Make sure you copied the full API key (starts with `re_`)
2. Verify `RESEND_API_KEY` is set correctly in Render
3. Generate a new API key if needed

### Emails not being received

**Check:**
1. Spam folder of recipient
2. Email address is correct in user profile
3. Resend dashboard shows delivery status
4. Check Render logs for sending confirmation

### "From address not verified"

**Fix:**
1. Make sure domain is verified in Resend
2. Use an email from your verified domain in `EMAIL_FROM`
3. Format: `Name <email@domain.com>`

---

## 🆚 Comparison: Email Services

| Feature | Resend | Gmail | SendGrid |
|---------|--------|-------|----------|
| Custom domains | ✅ Easy | ❌ Hard | ✅ Medium |
| Setup time | 5 min | 10 min | 15 min |
| Complexity | ✅ Simple | ⚠️ Medium | ⚠️ Medium |
| Free tier | 3,000/month | 500/day | 100/day |
| Deliverability | ✅ Excellent | ⚠️ Fair | ✅ Excellent |
| Analytics | ✅ Yes | ❌ No | ✅ Yes |
| OAuth required | ❌ No | ⚠️ For Workspace | ❌ No |

**Recommendation:** Use Resend for production. It's the easiest and most reliable option.

---

## 🔄 Alternative Options

### Option 2: Gmail (Personal Accounts Only)

**Best for:** Testing, personal Gmail accounts (@gmail.com)
**Not recommended for:** Google Workspace custom domains

<details>
<summary>Click to expand Gmail setup instructions</summary>

1. **Enable 2FA** on your Gmail account
2. **Generate App Password:** https://myaccount.google.com/apppasswords
3. **Add to Render:**
   ```bash
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM=BroughtBy <noreply@broughtby.co>
   ```

**Limitations:**
- Doesn't work reliably with Google Workspace
- Limited to 500 emails/day
- Emails may go to spam
- Less professional

</details>

### Option 3: SendGrid

**Best for:** High volume, need detailed analytics

<details>
<summary>Click to expand SendGrid setup instructions</summary>

1. **Sign up:** https://sendgrid.com
2. **Verify sender:** Settings > Sender Authentication
3. **Create API Key:** Settings > API Keys
4. **Add to Render:**
   ```bash
   SENDGRID_API_KEY=SG.your-api-key
   EMAIL_FROM=BroughtBy <brooke@broughtby.co>
   ```

**Free tier:** 100 emails/day

</details>

---

## 📋 Environment Variables Reference

### For Resend (Recommended):
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=BroughtBy <brooke@broughtby.co>
```

### For Gmail:
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=BroughtBy <noreply@broughtby.co>
```

### For SendGrid:
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=BroughtBy <brooke@broughtby.co>
```

---

## 📧 Email Details

### When emails are sent:
- Automatically when brand clicks "Request to Work Together"

### Email content includes:
- **Subject:** `[Brand Name] wants to work with you on BroughtBy!`
- **From:** Your configured `EMAIL_FROM` address
- **To:** Ambassador's registered email
- **Content:**
  - Personalized greeting
  - Brand information (name, location, bio)
  - Call-to-action button → app.broughtby.co/matches
  - Professional BroughtBy branding

### Email template features:
- ✅ Mobile-responsive design
- ✅ BroughtBy branding (navy/gold colors)
- ✅ Professional HTML layout
- ✅ Clear call-to-action button

---

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
   - All credentials stored in Render environment variables
   - .env is gitignored

2. **Rotate API keys regularly**
   - Generate new keys every 6-12 months
   - Revoke old keys after rotation

3. **Use verified domains**
   - Improves deliverability
   - Prevents emails being marked as spam

4. **Monitor sending**
   - Check Resend dashboard regularly
   - Watch for bounces and complaints

---

## 🎯 Next Steps

After setup:

1. ✅ Add environment variables to Render
2. ✅ Deploy application
3. ✅ Test with a partnership request
4. ✅ Verify email delivery
5. ✅ Monitor Resend dashboard

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)
- [Verify Domain Setup](https://resend.com/docs/dashboard/domains/introduction)

---

## 🆘 Need Help?

1. **Check Render logs** for specific error messages
2. **Check Resend dashboard** for delivery status
3. **Verify environment variables** are set correctly
4. **Test email delivery** with a test account first

---

**Summary:** Resend is the recommended solution. It takes 5 minutes to set up, works perfectly with custom domains, and provides excellent deliverability. Simply add your API key and EMAIL_FROM to Render, and you're done!
