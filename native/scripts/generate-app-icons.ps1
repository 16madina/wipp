# Génère les icônes iOS/Android (app + notification) depuis la marque WIPP.
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$brand = Join-Path $root "assets\brand"
$res = Join-Path $root "android\app\src\main\res"
New-Item -ItemType Directory -Force -Path $brand | Out-Null

$navy = [System.Drawing.Color]::FromArgb(255, 11, 18, 32)
$gold = [System.Drawing.Color]::FromArgb(255, 255, 216, 77)
$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

function New-Canvas([int]$size, [bool]$transparent) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  if ($transparent) {
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  } else {
    $g.Clear($navy)
  }
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Draw-Mark($g, [float]$box, [float]$ox, [float]$oy, [System.Drawing.Color]$color, [float]$strokeMul = 1) {
  $s = $box / 32.0
  $brush = New-Object System.Drawing.SolidBrush $color
  $pen = New-Object System.Drawing.Pen $color, ([float](2.3 * $s * $strokeMul))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  function Oval([float]$cx, [float]$cy, [float]$r) {
    $g.FillEllipse($brush, $ox + ($cx - $r) * $s, $oy + ($cy - $r) * $s, 2 * $r * $s, 2 * $r * $s)
  }
  Oval 16 6.8 2.05
  Oval 11.6 15.2 2.25
  Oval 20.4 15.2 2.25

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier(
    $ox + 8.8 * $s, $oy + 20.2 * $s,
    $ox + 12.4 * $s, $oy + 25.6 * $s,
    $ox + 19.6 * $s, $oy + 25.6 * $s,
    $ox + 23.2 * $s, $oy + 20.2 * $s
  )
  $g.DrawPath($pen, $path)
  $path.Dispose()
  $pen.Dispose()
  $brush.Dispose()
}

function Save-Png($bmp, [string]$path) {
  $dir = Split-Path -Parent $path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Scale-Bitmap($src, [int]$size) {
  $c = New-Canvas $size $true
  $c.Graphics.DrawImage($src, 0, 0, $size, $size)
  $c.Graphics.Dispose()
  return $c.Bitmap
}

function Round-Bitmap($src, [int]$size) {
  $c = New-Canvas $size $true
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(0, 0, $size, $size)
  $c.Graphics.SetClip($path)
  $c.Graphics.DrawImage($src, 0, 0, $size, $size)
  $path.Dispose()
  $c.Graphics.Dispose()
  return $c.Bitmap
}

# Master 1024 plein cadre (iOS / Expo) — coins gérés par l’OS
$master = New-Canvas 1024 $false
Draw-Mark $master.Graphics 1024 0 0 $gold
$master.Graphics.Dispose()
Save-Png $master.Bitmap (Join-Path $brand "icon-1024.png")

# Premier plan adaptatif Android : marque dans la zone sûre ~66 %
$fg = New-Canvas 1024 $true
$safe = 1024 * 0.66
$pad = (1024 - $safe) / 2
Draw-Mark $fg.Graphics $safe $pad $pad $gold
$fg.Graphics.Dispose()
Save-Png $fg.Bitmap (Join-Path $brand "adaptive-foreground.png")

# Monochrome (icône thématique Android 13+)
$mono = New-Canvas 1024 $true
Draw-Mark $mono.Graphics $safe $pad $pad $white
$mono.Graphics.Dispose()
Save-Png $mono.Bitmap (Join-Path $brand "adaptive-monochrome.png")

# Notification Expo : 96×96 blanc, fond transparent
$notif = New-Canvas 96 $true
Draw-Mark $notif.Graphics (96 * 0.84) (96 * 0.08) (96 * 0.08) $white
$notif.Graphics.Dispose()
Save-Png $notif.Bitmap (Join-Path $brand "notification-icon.png")

# Favicon web
$fav = Scale-Bitmap $master.Bitmap 48
Save-Png $fav (Join-Path $brand "favicon-48.png")
$fav.Dispose()

# Mipmaps Android
$densities = @{
  "mdpi"    = @{ launcher = 48;  foreground = 108 }
  "hdpi"    = @{ launcher = 72;  foreground = 162 }
  "xhdpi"   = @{ launcher = 96;  foreground = 216 }
  "xxhdpi"  = @{ launcher = 144; foreground = 324 }
  "xxxhdpi" = @{ launcher = 192; foreground = 432 }
}
foreach ($dpi in $densities.Keys) {
  $dir = Join-Path $res "mipmap-$dpi"
  $info = $densities[$dpi]
    $legacy = Scale-Bitmap $master.Bitmap $info.launcher
    $round = Round-Bitmap $master.Bitmap $info.launcher
    $fore = Scale-Bitmap $fg.Bitmap $info.foreground
    $monoBmp = Scale-Bitmap $mono.Bitmap $info.foreground
    Save-Png $legacy (Join-Path $dir "ic_launcher.png")
    Save-Png $round (Join-Path $dir "ic_launcher_round.png")
    Save-Png $fore (Join-Path $dir "ic_launcher_foreground.png")
    Save-Png $monoBmp (Join-Path $dir "ic_launcher_monochrome.png")
    $legacy.Dispose(); $round.Dispose(); $fore.Dispose(); $monoBmp.Dispose()
  foreach ($name in @("ic_launcher.webp", "ic_launcher_round.webp", "ic_launcher_foreground.webp")) {
    $old = Join-Path $dir $name
    if (Test-Path $old) { Remove-Item $old -Force }
  }
}

# Notifications : PNG Expo 96×96 + drawable vector Android.

$master.Bitmap.Dispose()
$fg.Bitmap.Dispose()
$mono.Bitmap.Dispose()
$notif.Bitmap.Dispose()

Write-Host "Icons generated."
