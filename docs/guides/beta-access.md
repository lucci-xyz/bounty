# Beta Access System

The BountyPay application now includes a comprehensive beta access system that allows you to control who can access the platform during the beta phase.

## Features

- **GitHub OAuth Integration**: Users must sign in with GitHub to request access
- **Application System**: Users can apply for beta access through a modal dialog
- **Admin Dashboard**: Admins can review and manage beta applications
- **Real-time Status Updates**: Users see their application status update in real-time
- **Notification System**: Framework for sending notifications when applications are reviewed

## Setup

### 1. Configure Admin Users

Set the `ADMIN_GITHUB_IDS` environment variable to a comma-separated list of GitHub user IDs who should have admin access:

```bash
ADMIN_GITHUB_IDS=123456789,987654321
```

To find a GitHub user ID:
- Go to `https://api.github.com/users/USERNAME` (replace USERNAME with the GitHub username)
- Look for the `id` field in the JSON response

### 2. Run Database Migrations

After pulling the latest code, run the Prisma migration to create the `beta_access` table:

```bash
npx prisma migrate dev
```

Or if you're deploying to production:

```bash
npx prisma migrate deploy
```

### 3. Update Environment Variables (Optional)

The beta access system uses the following environment variables:

- `ADMIN_GITHUB_IDS`: Comma-separated list of GitHub user IDs with admin access (required)
- `FRONTEND_URL`: Base URL of your application (optional, used for notifications)

## User Flow

### For Regular Users

1. **Landing**: User visits the site and sees a beta access modal
2. **Sign In**: User clicks "Sign in with GitHub" to authenticate
3. **Apply**: After signing in, user is prompted to apply for beta access
4. **Wait**: User sees a "pending" message while waiting for approval
5. **Access Granted**: Once approved, user gets access to the full application

### For Admin Users

1. **Sign In**: Admin signs in with GitHub (their ID must be in `ADMIN_GITHUB_IDS`)
2. **Admin Link**: "Admin" link appears in the navbar
3. **Review Applications**: Admin can view all beta applications at `/admin/beta`
4. **Approve/Reject**: Admin can approve or reject applications with one click
5. **Notifications**: System sends notifications to users when their status changes

## Admin Dashboard

Access the admin dashboard at `/admin/beta` (only visible to configured admins).

### Features:
- View all beta access applications
- See statistics (total, pending, approved, rejected)
- Approve or reject applications
- View application history with timestamps

### Statistics Displayed:
- **Total Applications**: All-time application count
- **Pending Review**: Applications waiting for review
- **Approved**: Successfully approved applications
- **Rejected**: Rejected applications

## API Endpoints

### Public Endpoints

- `GET /api/beta/check`: Check current user's beta access status
- `POST /api/beta/apply`: Submit a beta access application

### Admin Endpoints

- `GET /api/beta/applications`: List all beta applications (admin only)
- `POST /api/beta/review`: Approve or reject an application (admin only)
- `POST /api/beta/notify`: Send notification to user (admin only)
- `GET /api/admin/check`: Check if current user is an admin

## Notification System

The beta access system includes a fully implemented email notification system that sends professional emails to applicants when their applications are reviewed.

### Implementation

Email notifications are sent using [Resend](https://resend.com) via organized templates:

**Files:**
- `/server/notifications/email.js` - Core email functions
- `/server/notifications/templates/beta-approved.js` - Approval email template
- `/server/notifications/templates/beta-rejected.js` - Rejection email template
- `/app/api/beta/notify/route.js` - Notification endpoint

**How it works:**

1. Admin reviews application in `/admin/beta`
2. Admin approves or rejects the application
3. System loads the appropriate email template
4. Email is sent to the applicant's email address
5. Response confirms email delivery status

**Setup:**

To enable email notifications, configure these environment variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@luccilabs.xyz
```

See the [Email Setup Guide](./email-setup.md) for detailed configuration instructions.

### Email Templates

Templates are designed with:
- Professional, modern design
- Mobile-responsive layout
- BountyPay brand colors (#00827B, #39BEB7, #83EEE8)
- Plain text fallback for accessibility
- Clear call-to-action buttons

To customize templates, edit files in `/server/notifications/templates/`
```

## Security Considerations

1. **Admin Authorization**: Admin endpoints verify the user's GitHub ID against the configured list
2. **Session-based Auth**: Uses existing session management for authentication
3. **CSRF Protection**: OAuth flow includes state parameter for CSRF protection
4. **No Direct Database Access**: All operations go through API routes with proper authorization

## Troubleshooting

### Users Can't Access After Being Approved

- The modal polls for status updates every 5 seconds
- When approved, the page automatically refreshes
- If this doesn't work, users can manually refresh the page

### Admin Link Not Appearing

- Verify the GitHub user ID is correctly added to `ADMIN_GITHUB_IDS`
- Make sure there are no extra spaces in the environment variable
- Check that the admin has signed in (admin status is checked after authentication)

### Applications Not Showing in Admin Dashboard

- Verify the database migration ran successfully
- Check that the `beta_access` table exists in your database
- Ensure the admin user's GitHub ID is in the `ADMIN_GITHUB_IDS` list

## Database Schema

The beta access system adds the following table:

```prisma
model BetaAccess {
  id             Int     @id @default(autoincrement())
  githubId       BigInt  @unique @map("github_id")
  githubUsername String  @map("github_username")
  email          String?
  status         String  @default("pending") // pending, approved, rejected
  appliedAt      BigInt  @map("applied_at")
  reviewedAt     BigInt? @map("reviewed_at")
  reviewedBy     BigInt? @map("reviewed_by")
  
  @@index([status], name: "idx_beta_access_status")
  @@index([githubId], name: "idx_beta_access_github")
  @@map("beta_access")
}
```

## Future Enhancements

Potential improvements to the beta access system:

1. **Email Notifications**: Integrate with email service to notify users
2. **Waitlist Numbers**: Show users their position in the queue
3. **Invitation Codes**: Allow users to invite others
4. **Bulk Operations**: Approve/reject multiple applications at once
5. **Application Notes**: Allow admins to add notes to applications
6. **Auto-approval Rules**: Automatically approve users based on criteria
7. **Rate Limiting**: Prevent spam applications from the same user

