# Photo-to-Coupon Pilot (Medly Wine) — Feature Proposal v2

## Context for the implementer

This feature extends the existing BroughtBy platform. Use the existing patterns and conventions of the codebase wherever possible — match the existing admin UI styling, error handling, and database conventions.

**Existing stack:**

- **Backend:** Node.js / Express on Render
- **Database:** PostgreSQL on Render
- **Frontend:** React on Netlify
- **Image storage:** Cloudinary (already integrated, credentials in env)
- **Email:** Resend, `@broughtby.co` domain (already integrated)
- **Real-time:** Socket.io (already in use; not needed for this feature)

**Recommended build order:**

1. Database migrations for the four new tables (`campaigns`, `photo_submissions`, `coupons`, `phone_consent`)
2. Twilio inbound MMS webhook endpoint: signature validation + persist submission + copy media from Twilio to Cloudinary
3. Coupon assignment logic + outbound Twilio SMS reply (consent message on first interaction, "already claimed" on repeat)
4. Admin UI: campaign create/edit form, submissions table with thumbnails, coupon CSV upload, CSV export of submissions
5. End-to-end manual test from a verified personal phone number (works pre–10DLC approval since Twilio allows messaging verified numbers without it)

**Required environment variables to add to Render:**

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

(Cloudinary credentials already exist in the environment.)

**Test each piece before moving to the next.** Don't build everything and try to debug at the end.

---

## Overview

A simple SMS coupon-for-photo flow built into BroughtBy, offered as a value-add inside the Medly Wine engagement. Customers at a Medly activation text a photo to a campaign phone number and receive a unique coupon code redeemable on Medly's DTC site. Coupon codes are tagged per-event (e.g., `3CITIES` for the Three Cities Social Club activation) so Medly can attribute redemptions back to the specific event. Photos and consented phone numbers flow back to both Medly and BroughtBy.

## Goals

- Ship as a value-add inside the Medly engagement
- Collect a usable photo library and consented phone number list for Medly + BroughtBy
- Tie every coupon redemption back to a specific event for attribution
- Build infrastructure that's simple now but extensible (AI scoring, multi-brand, redemption tracking can layer on later)

## Non-goals (v1)

- AI quality scoring — every submission gets a coupon
- Multi-brand simultaneous campaigns — Medly only
- Brand self-service campaign setup — Brooke configures everything
- Coupon redemption tracking inside BroughtBy — Medly tracks redemptions on their DTC side via the event-tagged codes
- Photo gallery / download UI for brand — admin CSV export is sufficient
- Coupon caps, geofencing, image dedup — small test, not worth the build effort

## User flow

**Customer at the activation**

1. Sees signage or hears from ambassador: *"Text a photo with our wine to [number] for 20% off"*
2. Sends MMS with photo
3. Receives reply within a few seconds:
   - First-time sender: short message that includes the consent language + unique coupon code + DTC redemption link
   - Returning sender: "you've already claimed your code [CODE]" message
4. Hard cap: one coupon per phone number per event

**Admin (Brooke)**

1. Creates an event-level campaign in admin UI: name, event code (e.g., `3CITIES`), venue, dates, message templates
2. Uploads coupon code CSV from Kyle (codes already carry event tagging from Medly's side)
3. Monitors submissions live during the event
4. Exports photos + phone numbers + submission data after

## Functional requirements

**Inbound handling**

- Express endpoint receives Twilio inbound MMS webhook
- Twilio signature validation on every request (use the official `twilio` npm package's `validateRequest` helper)
- Persists submission immediately (MediaUrl, from-number, timestamp, campaign_id resolved from to-number)
- Returns 200 fast

**Coupon assignment**

- If phone number already has a coupon for this campaign → reply with "already claimed" message + the existing code
- Otherwise: pull next `available` coupon, mark `assigned`, link to submission
- On pool exhaustion → graceful "we're out of codes, message us at [contact]" + admin email alert via Resend

**Reply logic**

- All outbound SMS via Twilio Messages API
- Message templates live on the campaign record so copy is editable without a redeploy
- Consent language included in the first reply per phone number

**Admin UI** (extends existing BroughtBy admin)

- Campaign list + create/edit form (event code, venue, dates, templates)
- Submissions table: thumbnail, masked phone, coupon assigned, timestamp
- Coupon pool view: assigned vs. available count
- CSV export of submissions (phone, photo URL, code, timestamp) for handoff to Medly
- Manual overrides: force-assign a coupon, blacklist a phone number

## Data model

```
campaigns
  id, brand_id, name, event_code, event_venue,
  twilio_number, active_start, active_end,
  reply_message_template, consent_message_template,
  already_claimed_message_template, out_of_codes_message_template,
  status

photo_submissions
  id, campaign_id, phone_number, twilio_message_sid, media_url,
  coupon_id (nullable), submitted_at, replied_at

coupons
  id, campaign_id, code, status (available/assigned),
  submission_id (nullable), assigned_at

phone_consent
  phone_number (pk), first_consent_at, terms_version
```

Add a unique constraint on `(campaign_id, phone_number)` in `photo_submissions` for clean per-phone rate limiting.

## Consent message — draft templates

For first-time senders (one SMS, ~280 chars):

> Thanks for your photo! 🍷 Your code: **[CODE]** — redeem at medlywine.com. By texting, you agree your photo may be used by Medly Wine and BroughtBy for marketing. Msg/data rates apply. Reply STOP to opt out, HELP for help.

For returning senders:

> You've already claimed code **[CODE]** for this event — redeem at medlywine.com.

These are starting drafts; final copy will be reviewed before launch.

## Technical notes

- Twilio webhook fires to the existing Express backend on Render — no new service required
- Reuse existing Postgres — four new tables
- Images fetched server-side from Twilio's MediaUrl (basic auth with account SID + auth token) and copied to Cloudinary on receipt; Twilio doesn't retain media indefinitely
- Per-phone rate limit handled by the unique constraint on `(campaign_id, phone_number)` in `photo_submissions`
- Event tagging lives on the campaign record; coupon codes uploaded by Medly already encode the event identifier in the code string itself (e.g., `MEDLY3CITIES01`)

## Risks & dependencies

**10DLC registration is the long pole.** A2P 10DLC with Twilio takes 3–7 business days and requires brand + campaign vetting. Has to start before the build if launch is on a deadline. Dev/test can use a personal-use number; production traffic needs a registered campaign.

**Coupon supply from Kyle.** Need a CSV of unique one-time-use codes from Medly, ideally with `3CITIES` (or equivalent) baked into the code structure for clean attribution.

**Photo retention.** Twilio holds media for a limited window. Photos need to be copied to Cloudinary on receipt or they're gone.

**Consent language compliance.** Draft is a reasonable starting point but should be reviewed against TCPA requirements and the photo rights language Medly is comfortable with before going live.
