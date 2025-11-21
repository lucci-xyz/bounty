# Email Notification Setup Guide

BountyPay uses [Resend](https://resend.com) for sending email notifications. This guide will walk you through setting up the email system.

## Overview

The email system handles two types of notifications:

1. **System Alerts** → Sent to `contact@luccilabs.xyz` for critical errors and issues
2. **User Notifications** → Sent to users for beta access approvals/rejections

## Quick Setup

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address

### 2. Configure Your Domain

To send emails from `@luccilabs.xyz`, you need to verify the domain:

1. In the Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter `luccilabs.xyz`
4. Add the provided DNS records to your domain:
   - DKIM records
   - SPF records
   - DMARC records (optional but recommended)
5. Wait for verification (usually takes a few minutes)

### 3. Generate API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "BountyPay Production")
4. Copy the API key (it starts with `re_`)

### 4. Configure Environment Variables

Add these variables to your environment:

#### Local Development (`.env`)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@luccilabs.xyz
```

#### Staging/Production (Vercel)
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`
   - `RESEND_FROM_EMAIL` = `alerts@luccilabs.xyz`
4. Apply to the appropriate environments (staging, production, or both)

## Email Types

### System Alerts

System alerts are automatically sent when critical issues occur:

- Bounty creation failures
- Payout errors
- Database sync issues
- Invalid wallet addresses
- Network configuration problems

**Recipient:** `contact@luccilabs.xyz` (hardcoded in `server/notifications/email.js`)

**Implementation:**
```javascript
import { sendSystemEmail } from '@/shared/server/notifications/email';

await sendSystemEmail({
  subject: 'Critical Error: Bounty Payout Failed',
  html: '<p>Error details...</p>',
  text: 'Error details...' // Optional, auto-generated from HTML if not provided
});
```

### User Notifications

User notifications are sent to beta applicants when their application is reviewed:

**Templates:**
- `server/notifications/templates/beta-approved.js` - Approval email
- `server/notifications/templates/beta-rejected.js` - Rejection email

**Implementation:**
```javascript
import { sendUserEmail } from '@/shared/server/notifications/email';
import { betaApprovedTemplate } from '@/shared/server/notifications/templates';

const template = betaApprovedTemplate({
  username: 'johndoe',
  frontendUrl: 'https://bountypay.luccilabs.xyz'
});

await sendUserEmail({
  to: 'user@example.com',
  subject: template.subject,
  html: template.html,
  text: template.text
});
```

## Architecture

### File Structure

```
server/notifications/
├── email.js                      # Core email functions
└── templates/                    # Email templates
    ├── index.js                  # Template exports
    ├── beta-approved.js          # Beta approval template
    └── beta-rejected.js          # Beta rejection template
```

### Core Functions

#### `sendSystemEmail({ subject, html, text })`
Sends alerts to the system admin email (`contact@luccilabs.xyz`).

- **Graceful degradation**: No-ops if `RESEND_API_KEY` is missing
- **Auto-logs**: Warnings when credentials are missing
- **Returns**: `{ success: boolean }` or `{ skipped: true }`

#### `sendUserEmail({ to, subject, html, text })`
Sends emails to specific users.

- **Graceful degradation**: No-ops if `RESEND_API_KEY` or `to` is missing
- **Auto-logs**: Success/failure messages
- **Returns**: `{ success: boolean, id?: string }` or `{ skipped: true, reason: string }`

#### `getAlertEmailAddress()`
Returns the system alert email address.

### Email Templates

All email templates follow this structure:

```javascript
export function templateName({ param1, param2 }) {
  return {
    subject: 'Email Subject',
    html: '<html>...</html>',    // Full HTML email
    text: 'Plain text version'   // Fallback for non-HTML clients
  };
}
```

**Design Guidelines:**
- Use inline CSS (email clients don't support external stylesheets)
- Mobile-responsive design
- Plain text fallback always included
- Brand colors: `#00827B` (primary), `#39BEB7` (secondary), `#83EEE8` (tertiary)

## Testing

### Test System Alerts

Trigger a test error to verify system alerts work:

```javascript
// In a test endpoint or console
import { sendSystemEmail } from '@/shared/server/notifications/email';

await sendSystemEmail({
  subject: '[TEST] Email System Check',
  html: '<p>This is a test of the system alert email.</p>'
});
```

Check `contact@luccilabs.xyz` for the email.

### Test User Notifications

Use the beta access admin panel:

1. Navigate to `/admin/beta`
2. Find a test user's application
3. Approve or reject it
4. Check the user's email inbox

### Development Mode

Without `RESEND_API_KEY`, emails won't be sent, but the system will:
- Log a warning to the console
- Return `{ skipped: true }`
- Continue execution without throwing errors

This allows development without email credentials.

## Monitoring

### Console Logs

All email operations are logged:

```
[email] User email sent successfully to user@example.com
[email] RESEND_API_KEY not configured. Skipping alert email: ...
[email] Failed to send user email: 403 {"error": "Invalid API key"}
```

### Resend Dashboard

Monitor email delivery in the Resend dashboard:
- Delivery status
- Open rates
- Bounce rates
- Failed deliveries

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `RESEND_API_KEY` is set correctly
2. **Verify Domain**: Make sure `luccilabs.xyz` is verified in Resend
3. **Check Logs**: Look for `[email]` prefixed messages in console
4. **API Limits**: Free tier has sending limits (check Resend dashboard)

### Emails Going to Spam

1. **Complete DNS Setup**: Ensure all DNS records (DKIM, SPF, DMARC) are configured
2. **Warm Up Domain**: Start with low volumes and gradually increase
3. **Content Quality**: Avoid spam trigger words, ensure proper HTML structure

### Invalid From Email

The from email must be from your verified domain. Valid options:
- `alerts@luccilabs.xyz`
- `noreply@luccilabs.xyz`
- `notifications@luccilabs.xyz`

Invalid:
- `alerts@gmail.com`
- `test@example.com`

## Production Checklist

Before going live:

- [ ] Resend account created
- [ ] Domain `luccilabs.xyz` verified
- [ ] DNS records configured and verified
- [ ] API key generated
- [ ] `RESEND_API_KEY` set in production environment
- [ ] `RESEND_FROM_EMAIL` set correctly
- [ ] Test system alert sent successfully
- [ ] Test user notification sent successfully
- [ ] Monitoring set up in Resend dashboard

## API Reference

### Resend API Endpoint

```
POST https://api.resend.com/emails
Authorization: Bearer {RESEND_API_KEY}
Content-Type: application/json

{
  "from": "alerts@luccilabs.xyz",
  "to": ["recipient@example.com"],
  "subject": "Email Subject",
  "html": "<p>Email content</p>",
  "text": "Email content"
}
```

### Rate Limits

Check [Resend pricing](https://resend.com/pricing) for current limits:
- Free tier: 100 emails/day, 3,000 emails/month
- Pro tier: Higher limits available

## Support

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **BountyPay Issues**: [GitHub Issues](https://github.com/luccilabs/bounty/issues)
- **Email Problems**: Contact `contact@luccilabs.xyz`

