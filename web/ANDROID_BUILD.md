# ChronoDeX Android APK Build Guide

This guide explains how to build the Android APK with native push notifications.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17+** - Required for Android builds
3. **Node.js 18+** - For building the web app

## Quick Build

```bash
cd web

# Build web app and sync with Android
npm run cap:sync

# Open in Android Studio
npm run android
```

## Step-by-Step Build

### 1. Build the Web App

```bash
cd web
npm run build
```

### 2. Sync with Capacitor

```bash
npx cap sync android
```

### 3. Open in Android Studio

```bash
npx cap open android
```

### 4. Build APK

In Android Studio:

1. Wait for Gradle sync to complete
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`

## Firebase Cloud Messaging Setup (Optional)

For server-pushed notifications when the app is completely closed:

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add an Android app with package name `com.chronodex.app`

### 2. Download Configuration

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/google-services.json`

### 3. Get Server Key

1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Copy the Server Key
3. Add to Supabase secrets:
   ```bash
   npx supabase secrets set FIREBASE_SERVER_KEY="your-server-key"
   ```

## How Notifications Work

### Local Notifications (Works Offline!)

The app uses **Capacitor Local Notifications** which schedule notifications directly on the device. These work:

- ✅ When the app is closed
- ✅ When the phone is locked
- ✅ Without internet connection
- ✅ After device restart (with RECEIVE_BOOT_COMPLETED permission)

### Push Notifications (Server-Triggered)

For notifications triggered by the server:

1. Web: Uses Web Push API via Service Worker
2. Android: Uses Firebase Cloud Messaging (FCM)

## Troubleshooting

### Notifications not appearing

1. **Check permissions**: Settings → Apps → ChronoDeX → Notifications → Enable
2. **Battery optimization**: Disable battery optimization for ChronoDeX
3. **Do Not Disturb**: Check if DND is enabled

### Build errors

1. **Gradle sync failed**: Try File → Sync Project with Gradle Files
2. **SDK not found**: Install required SDK in Android Studio → SDK Manager
3. **JDK version**: Ensure Java 17+ is installed and set as JAVA_HOME

### Local notifications not scheduling

1. Check if `SCHEDULE_EXACT_ALARM` permission is granted (Android 12+)
2. Some devices require special permissions for background work (Xiaomi, Samsung, etc.)

## Package Structure

```
web/
├── android/                 # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml    # App configuration
│   │   │   ├── java/                   # Java code
│   │   │   └── res/                    # Resources
│   │   └── build.gradle               # App-level build config
│   └── build.gradle                   # Project-level build config
├── capacitor.config.ts      # Capacitor configuration
├── services/
│   └── nativeNotificationService.ts   # Native notification handling
└── dist/                    # Built web assets (synced to Android)
```

## Signing for Release

For production APKs:

1. Generate a keystore:

   ```bash
   keytool -genkey -v -keystore chronodex-release.keystore -alias chronodex -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Add signing config to `android/app/build.gradle`:

   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('chronodex-release.keystore')
               storePassword 'your-password'
               keyAlias 'chronodex'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. Build release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Testing on Device

1. Enable USB debugging on your Android device
2. Connect via USB
3. In Android Studio, select your device from the device dropdown
4. Click the Run button (▶️)

Or install the APK directly:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```
