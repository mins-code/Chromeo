# Background Push Notifications Setup Guide

## Overview

This guide explains how to set up background push notifications for ChronoDeX so users receive notifications even when the app is closed.

### Notification Options

| Platform    | Method                   | Reliability                        | Setup Complexity |
| ----------- | ------------------------ | ---------------------------------- | ---------------- |
| Web/PWA     | Web Push API             | ⭐⭐⭐ (requires browser running)  | Medium           |
| Android APK | Local Notifications      | ⭐⭐⭐⭐⭐ (native, works offline) | Low              |
| Android APK | Firebase Cloud Messaging | ⭐⭐⭐⭐⭐ (server-triggered)      | High             |

**For the most reliable notifications like native apps, build the Android APK!**
See [ANDROID_BUILD.md](web/ANDROID_BUILD.md) for instructions.

## Prerequisites

Before setting up notifications, ensure you have:

- Supabase project with all migrations applied
- VAPID keys generated
- Access to your deployment platform or Supabase dashboard

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

### Generate Keys

Run this command in your project root:

```bash
npx web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BKxBQO...your-public-key-here...

Private Key:
aBcDeFg...your-private-key-here...

=======================================
```

**⚠️ IMPORTANT**: Keep the private key secret! Never commit it to git.

## Step 2: Configure Environment Variables

### Frontend (.env file in /web directory)

Create or update `/web/.env`:

```env
VITE_VAPID_PUBLIC_KEY=BKxBQO...your-public-key-here...
```

### Backend (Supabase Secrets)

Set these secrets in your Supabase project:

#### Via Supabase Dashboard:

1. Go to Project Settings → Edge Functions
2. Add the following secrets:

```
VAPID_PUBLIC_KEY=BKxBQO...your-public-key-here...
VAPID_PRIVATE_KEY=aBcDeFg...your-private-key-here...
VAPID_EMAIL=mailto:your-email@example.com
```

#### Via Supabase CLI:

```bash
# From the project root
cd supabase

# Set each secret
npx supabase secrets set VAPID_PUBLIC_KEY="BKxBQO...your-public-key-here..."
npx supabase secrets set VAPID_PRIVATE_KEY="aBcDeFg...your-private-key-here..."
npx supabase secrets set VAPID_EMAIL="mailto:your-email@example.com"
```

## Step 3: Deploy Updated Edge Functions

Deploy the notification edge functions:

```bash
# From the project root
cd supabase
npx supabase functions deploy notification-scheduler
npx supabase functions deploy push-notification
```

## Step 4: Set Up Cron Job

The `notification-scheduler` function needs to run every minute to send due notifications. Choose one of the following options:

### Option A: Supabase pg_cron (Recommended)

Unfortunately, Supabase Edge Functions can't be directly triggered by pg_cron. You'll need to use an external scheduler.

### Option B: GitHub Actions (Free, Recommended)

1. Create `.github/workflows/notification-cron.yml` in your repository:

```yaml
name: Notification Scheduler

on:
  schedule:
    # Run every minute
    - cron: "* * * * *"
  workflow_dispatch: # Allow manual trigger

jobs:
  trigger-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Call Notification Scheduler
        run: |
          curl -X POST \
            https://<your-project-ref>.supabase.co/functions/v1/notification-scheduler \
            -H "Content-Type: application/json" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

2. Add `SUPABASE_ANON_KEY` to your GitHub repository secrets:

   - Go to Settings → Secrets and variables → Actions
   - Add new secret: `SUPABASE_ANON_KEY` with your Supabase anon key

3. Commit and push the workflow file

### Option C: Vercel Cron (If using Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "* * * * *"
    }
  ]
}
```

Then create `/api/cron/notifications.ts`:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized calls
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notification-scheduler`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
```

### Option D: External Service (cron-job.org)

1. Go to https://cron-job.org
2. Create a free account
3. Create a new cron job:
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/notification-scheduler`
   - Schedule: Every 1 minute
   - HTTP Method: POST
   - Headers:
     - `Content-Type: application/json`
     - `apikey: <your-supabase-anon-key>`

## Step 5: Test the Setup

### Test 1: Service Worker Registration

1. Build and run your app:

   ```bash
   cd web
   npm run build
   npm run preview
   ```

2. Open browser DevTools → Application → Service Workers
3. Verify `sw-custom.js` is registered and active

### Test 2: Push Subscription

1. Enable notifications in the app settings
2. Check DevTools → Console for logs like:

   ```
   [App] Service Worker registered
   Push notification subscription successful
   ```

3. Verify subscription in Supabase:
   ```sql
   SELECT * FROM push_subscriptions;
   ```

### Test 3: Schedule a Notification

1. Create a task with a notification 2 minutes in the future
2. Close the browser tab/app COMPLETELY
3. Wait for the notification to appear
4. Click the notification to verify it opens the app

### Test 4: Verify Cron Job

Check Supabase logs to confirm the scheduler is being called:

```bash
npx supabase functions logs notification-scheduler
```

You should see logs every minute showing:

```
Processing X due notifications
```

## Troubleshooting

### Notifications not appearing when app is closed

**Check:**

1. Service worker is registered (`DevTools → Application → Service Workers`)
2. Push subscription exists in database (`SELECT * FROM push_subscriptions;`)
3. Scheduled notifications exist (`SELECT * FROM scheduled_notifications WHERE sent = false;`)
4. Cron job is running (check GitHub Actions logs or cron-job.org dashboard)
5. VAPID keys are correctly configured in Supabase secrets

### "Push notification subscription failed" error

**Solutions:**

- Verify `VITE_VAPID_PUBLIC_KEY` is set in `.env`
- Rebuild the app after adding environment variables
- Check browser console for detailed error messages
- Ensure VAPID public key in frontend matches the one in Supabase

### Cron job not triggering

**Solutions:**

- For GitHub Actions: Check repository Actions tab for workflow runs
- For Vercel: Check deployment logs
- For cron-job.org: Check execution history on dashboard
- Manually test endpoint:
  ```bash
  curl -X POST https://<your-project-ref>.supabase.co/functions/v1/notification-scheduler \
    -H "apikey: <your-anon-key>"
  ```

### "VAPID keys not configured" error

**Solutions:**

- Verify secrets are set in Supabase:
  ```bash
  npx supabase secrets list
  ```
- Re-deploy edge functions after setting secrets:
  ```bash
  npx supabase functions deploy notification-scheduler
  ```

## Security Notes

1. **Never commit VAPID private key** to version control
2. Use environment variables for all sensitive keys
3. The notification-scheduler function uses service role key for database access
4. Push subscriptions are user-specific with RLS policies

## Next Steps

Once set up:

- Notifications will be sent automatically when tasks are due
- Users can manage notification settings in the app
- Background sync works even when the app is closed
- Notifications respect user preferences (tasks, events, budget alerts)

## Need Help?

Check the Supabase logs for detailed error messages:

```bash
npx supabase functions logs notification-scheduler --tail
npx supabase functions logs push-notification --tail
```
