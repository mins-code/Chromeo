# This script rebuilds the web app, syncs it to android, builds the APK, and installs it to your connected device.

Write-Host "Rebuilding web assets and syncing with Android..."
pnpm run build
npx cap sync android

Write-Host "Building Android APK..."
cd android
.\gradlew assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful! Installing onto connected device..."
    adb install -r app\build\outputs\apk\debug\app-debug.apk
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Starting the app..."
        adb shell monkey -p com.chronodex.app -c android.intent.category.LAUNCHER 1
        Write-Host "Done!"
    } else {
        Write-Host "Failed to install the APK. Make sure your device is connected (check 'adb devices')." -ForegroundColor Red
    }
} else {
    Write-Host "Android build failed." -ForegroundColor Red
}

# Go back to web directory
cd ..
