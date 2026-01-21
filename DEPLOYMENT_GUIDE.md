# ChronoDeX Deployment Guide: Vercel + Supabase + Android APK

This guide covers the complete setup for deploying ChronoDeX with proper notifications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ChronoDeX Notification System                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌──────────────────┐     ┌────────────────────────┐ │
│  │   Vercel    │     │     Supabase     │     │    GitHub Actions      │ │
│  │  (Frontend) │────▶│   (Database +    │◀────│   (Cron Scheduler)     │ │
│  │             │     │  Edge Functions) │     │   Every 1 minute       │ │
│  └─────────────┘     └──────────────────┘     └────────────────────────┘ │
│         │                     │                                          │
│         │                     │                                          │
│         ▼                     ▼                                          │
│  ┌──────────────────────────────────────────┐                           │
│  │              Users                        │                           │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────┐│                           │
│  │  │ Web/PWA │  │ Android │  │  Desktop  ││                           │
│  │  │  (Web   │  │   APK   │  │  Browser  ││                           │
│  │  │  Push)  │  │ (Local) │  │  (Push)   ││                           │
│  │  └─────────┘  └─────────┘  └───────────┘│                           │
│  └──────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Vercel Deployment

### Step 1: Push Updated Code to GitHub

The lockfile is now updated. Commit and push:

```bash
git add .
git commit -m "Add notification system with Capacitor"
git push origin opti-main
```

### Step 2: Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables**

Add these variables:

| Variable                 | Value                              | Environment |
| ------------------------ | ---------------------------------- | ----------- |
| `VITE_SUPABASE_URL`      | `https://your-project.supabase.co` | All         |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key             | All         |
| `VITE_VAPID_PUBLIC_KEY`  | Your VAPID public key              | All         |
| `VITE_GEMINI_API_KEY`    | Your Gemini API key (if using AI)  | All         |

### Step 3: Vercel Build Settings

Your `vercel.json` should already be configured. Verify it's in the `web` directory and points to the correct build output.

### Step 4: Redeploy

After pushing, Vercel will automatically redeploy. If not, trigger a redeploy from the Vercel dashboard.

---

## Part 2: Supabase Configuration

### Step 1: Apply Database Migration

The new migration adds FCM token support. Run:

```bash
cd supabase
npx supabase db push
```

Or manually run this SQL in Supabase SQL Editor:

```sql
-- Add FCM token support for native Android/iOS push notifications
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm
ON push_subscriptions(fcm_token) WHERE fcm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform
ON push_subscriptions(platform);
```

### Step 2: Deploy Edge Functions

Deploy the notification edge functions:

```bash
cd supabase
npx supabase functions deploy notification-scheduler
npx supabase functions deploy push-notification
```

### Step 3: Set Edge Function Secrets

In Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

| Secret              | Value                           |
| ------------------- | ------------------------------- |
| `VAPID_PUBLIC_KEY`  | Your VAPID public key           |
| `VAPID_PRIVATE_KEY` | Your VAPID private key          |
| `VAPID_EMAIL`       | `mailto:your-email@example.com` |

Or via CLI:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="your-public-key"
npx supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
npx supabase secrets set VAPID_EMAIL="mailto:your-email@example.com"
```

---

## Part 3: GitHub Actions Cron Job

The cron job triggers notification-scheduler every minute. This is **required** for background web push notifications.

### Step 1: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret                      | Value                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`              | `https://your-project.supabase.co`                           |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (from Project Settings → API) |

⚠️ **Important**: Use the **Service Role Key**, not the anon key. The service role key bypasses RLS and is required for the scheduler.

### Step 2: Verify Workflow

The workflow file is already created at `.github/workflows/notification-cron.yml`. After pushing to GitHub, check:

1. Go to your repository → **Actions** tab
2. You should see "Notification Scheduler" workflow
3. It will run automatically every minute

### Step 3: Test Manually

You can trigger it manually:

1. Go to **Actions** → **Notification Scheduler**
2. Click **Run workflow** → **Run workflow**
3. Check the logs to verify it's calling Supabase successfully

---

## Part 4: Android APK Build

The Android APK gives you **native app-like notifications** that work even when the app is closed.

### Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17+** - Usually bundled with Android Studio

### Step 1: Build Web App

```bash
cd web
npm run build
# or
pnpm build
```

### Step 2: Sync with Capacitor

```bash
npx cap sync android
```

### Step 3: Open in Android Studio

```bash
npx cap open android
```

Or manually open `web/android` folder in Android Studio.

### Step 4: Wait for Gradle Sync

Android Studio will automatically sync Gradle. Wait for it to complete (bottom status bar).
###abc

### Step 5: Build APK

In Android Studio:

1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. Click **locate** in the notification popup

APK location: `web/android/app/build/outputs/apk/debug/app-debug.apk`

### Step 6: Install on Device

**Option A - USB:**

1. Enable USB debugging on your Android device
2. Connect via USB
3. Run: `adb install web/android/app/build/outputs/apk/debug/app-debug.apk`

**Option B - Direct install:**

1. Copy APK to your phone
2. Open the APK file to install
3. Allow "Install from unknown sources" if prompted

---

## Part 5: Testing Notifications

### Test Web Push (Vercel)

1. Open your Vercel-deployed site
2. Enable notifications in Settings
3. Create a task with a reminder 2-3 minutes in the future
4. Close the browser tab
5. Notification should appear when due

### Test Android APK

1. Install APK on your Android phone
2. Open app and log in
3. Grant notification permissions when prompted
4. Create a task with reminder 2 minutes in future
5. **Close the app completely** (swipe away)
6. Notification should appear at the scheduled time

---

## Troubleshooting

### Vercel Build Fails

**Error**: `pnpm-lock.yaml is not up to date`
**Solution**: Run `pnpm install` locally and commit the updated lockfile

### Web Notifications Not Working

1. Check browser notification permissions
2. Verify VAPID keys match between frontend and Supabase
3. Check GitHub Actions workflow is running
4. Check Supabase Edge Function logs:
   ```bash
   npx supabase functions logs notification-scheduler
   ```

### Android Notifications Not Working

1. Check app has notification permissions: Settings → Apps → ChronoDeX → Notifications
2. Disable battery optimization for ChronoDeX
3. Some devices (Xiaomi, Samsung) require additional permissions

### Cron Job Not Running

1. Verify GitHub secrets are set correctly
2. Check Actions tab for workflow runs
3. Look for red ❌ indicating failures
4. Check workflow logs for error messages

---

## Summary: What Runs Where

| Component        | Host           | Purpose                                      |
| ---------------- | -------------- | -------------------------------------------- |
| Frontend (React) | Vercel         | Web app and PWA                              |
| Database         | Supabase       | Tasks, users, notifications                  |
| Edge Functions   | Supabase       | push-notification, notification-scheduler    |
| Cron Scheduler   | GitHub Actions | Triggers notification-scheduler every minute |
| Android App      | User's Phone   | Native notifications via APK                 |

---

## Quick Reference Commands

```bash
# Build web app
cd web && npm run build
PS C:\Users\Atul RN\Downloads\Chromeo-main> npx supabase db push
Initialising login role...
Connecting to remote database...
Remote migration versions not found in local migrations directory.

Make sure your local git repo is up-to-date. If the error persists, try repairing the migration history table:
supabase migration repair --status reverted 20260107

And update local migrations to match remote database:
supabase db pull

PS C:\Users\Atul RN\Downloads\Chromeo-main>
# Sync Android
npx cap sync android

# Open Android Studio
npx cap open android

# Deploy Supabase functions
cd supabase && npx supabase functions deploy notification-scheduler

# Check function logs
npx supabase functions logs notification-scheduler --tail
```
