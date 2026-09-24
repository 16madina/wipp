#Requires -Version 5.1
<#
.SYNOPSIS
  Prepare WIPP mobile for local Android Studio builds on Windows (no EAS Cloud).

.DESCRIPTION
  Non-destructive checks + optional expo prebuild.
  Touch native sources live in modules/wipp-touch-native/ (not in android/).
  Prebuild generates android/ and autolinks that module via Expo config plugins.

.EXAMPLE
  cd mobile
  powershell -ExecutionPolicy Bypass -File .\scripts\prepare-android-windows.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\prepare-android-windows.ps1 -OpenStudio
#>
[CmdletBinding()]
param(
  [switch]$SkipPrebuild,
  [switch]$OpenStudio,
  [switch]$ForcePrebuild
)

$ErrorActionPreference = "Stop"
$MobileRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $MobileRoot "app.config.js"))) {
  throw "Run this script from the repo (expected mobile/app.config.js next to scripts/)."
}

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN $msg" -ForegroundColor Yellow }
function Write-Bad($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red }

Set-Location $MobileRoot
Write-Step "Git status (no reset / no force)"
git status -sb
$porcelain = git status --porcelain
if ($porcelain) {
  Write-Warn "Local uncommitted changes present — they will NOT be overwritten by this script."
  Write-Host $porcelain
} else {
  Write-Ok "Working tree clean"
}

Write-Step "Pull latest main (ff-only, non-destructive)"
git fetch origin main 2>$null
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) {
  Write-Warn "ff-only pull failed (diverged history?). Resolve manually — no force pull."
}

Write-Step "Verify WIPP Touch artifacts"
$required = @(
  "modules\wipp-touch-native\android\src\main\java\expo\modules\wipptouchnative\WippTouchNativeModule.kt",
  "modules\wipp-touch-native\android\src\main\java\expo\modules\wipptouchnative\WippNfcHceService.kt",
  "modules\wipp-touch-native\android\src\main\res\xml\wipp_nfc_apduservice.xml",
  "lib\touch-ble.ts",
  "lib\touch-shock.ts",
  "lib\touch-proximity.ts",
  "lib\touch-receiver.ts",
  "app\touch.tsx",
  "app\t\[code].tsx",
  "plugins\withWippTouchNative.js",
  "app.config.js"
)
$missing = @()
foreach ($rel in $required) {
  if (Test-Path (Join-Path $MobileRoot $rel)) { Write-Ok $rel }
  else { Write-Bad $rel; $missing += $rel }
}
if ($missing.Count -gt 0) {
  throw "Missing Touch files. Wrong clone/remote? Expected latest main with WippTouchNative."
}

Write-Step "Environment checks"
$checks = @{
  "node" = { node -v }
  "npm"  = { npm -v }
  "java" = { java -version 2>&1 | Select-Object -First 1 }
  "adb"  = { adb version 2>&1 | Select-Object -First 1 }
}
foreach ($name in $checks.Keys) {
  try {
    $out = & $checks[$name]
    Write-Ok "$name : $out"
  } catch {
    Write-Bad "$name not found in PATH"
  }
}

if ($env:ANDROID_HOME) {
  Write-Ok "ANDROID_HOME=$env:ANDROID_HOME"
} elseif ($env:ANDROID_SDK_ROOT) {
  Write-Ok "ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"
  $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
} else {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    $env:ANDROID_SDK_ROOT = $defaultSdk
    Write-Warn "ANDROID_HOME was unset — using $defaultSdk for this session"
  } else {
    Write-Bad "ANDROID_HOME / ANDROID_SDK_ROOT unset and default SDK not found"
  }
}

if ($env:JAVA_HOME) {
  Write-Ok "JAVA_HOME=$env:JAVA_HOME"
} else {
  Write-Warn "JAVA_HOME unset (Android Studio JDK is usually fine once Studio opens the project)"
}

Write-Step "npm install"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

$androidDir = Join-Path $MobileRoot "android"
$hasAndroid = Test-Path $androidDir

if ($SkipPrebuild) {
  Write-Warn "SkipPrebuild set — not running expo prebuild"
} elseif ($hasAndroid -and -not $ForcePrebuild) {
  Write-Warn "android/ already exists — prebuild NOT run (avoids overwriting local native edits)."
  Write-Warn "Touch sources remain in modules/wipp-touch-native/ and are autolinked."
  Write-Warn "To regenerate: re-run with -ForcePrebuild after backing up android/."
} else {
  if ($hasAndroid -and $ForcePrebuild) {
    Write-Warn "ForcePrebuild: expo prebuild will refresh android/ from app.config + modules."
  } else {
    Write-Step "expo prebuild --platform android (generate android/ — safe: no existing android/)"
  }
  npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }
  Write-Ok "android/ generated"
}

Write-Step "Quick Gradle wrapper check"
$gradlew = Join-Path $MobileRoot "android\gradlew.bat"
if (Test-Path $gradlew) {
  Write-Ok "Found android\gradlew.bat"
} else {
  Write-Warn "gradlew.bat missing — open the project in Android Studio to sync first"
}

if ($OpenStudio) {
  Write-Step "Open Android Studio"
  $studioCandidates = @(
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe",
    "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe",
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe"
  )
  $studio = $studioCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $studio) {
    Write-Bad "Android Studio not found. Open manually: File → Open → mobile\android"
  } else {
    $project = if (Test-Path $androidDir) { $androidDir } else { $MobileRoot }
    Write-Ok "Launching $studio with $project"
    Start-Process -FilePath $studio -ArgumentList "`"$project`""
  }
}

Write-Host "`nNext in Android Studio:" -ForegroundColor Cyan
Write-Host "  1. Sync Project with Gradle Files"
Write-Host "  2. Enable USB debugging on phone → connect → accept RSA"
Write-Host "  3. Run (not Build Bundle / AAB)"
Write-Host "  4. Optional: adb devices"
Write-Host ""
