#!/usr/bin/env bash
# Capture App Store screenshots from the booted iOS Simulator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/docs/app-store-screenshots"
EMAIL="${SCREENSHOT_EMAIL:-civilian@rescue.com}"
PASSWORD="${SCREENSHOT_PASSWORD:-}"

if [[ -z "$PASSWORD" ]]; then
  echo "Set SCREENSHOT_PASSWORD env var"
  exit 1
fi

mkdir -p "$OUT_DIR"

shot() {
  local name="$1"
  local path="$OUT_DIR/$name.png"
  xcrun simctl io booted screenshot "$path"
  echo "Saved $path"
}

sim_click_ratio() {
  # Click inside Simulator window at ratio (0-1) from top-left of device screen area.
  local rx="$1"
  local ry="$2"
  osascript <<EOF
tell application "Simulator" to activate
delay 0.4
tell application "System Events"
  tell process "Simulator"
    set win to front window
    set {wx, wy} to position of win
    set {ww, wh} to size of win
    -- Approximate device inset inside simulator chrome
    set dx to wx + (ww * ${rx})
    set dy to wy + (wh * ${ry})
    click at {dx, dy}
  end tell
end tell
EOF
}

sim_paste() {
  local text="$1"
  printf '%s' "$text" | xcrun simctl pbcopy booted
  osascript -e 'tell application "System Events" to keystroke "v" using command down'
}

sim_type() {
  osascript -e "tell application \"System Events\" to keystroke \"$1\""
}

open -a Simulator
sleep 2

echo "Waiting for RESQ-Link to be foreground..."
sleep 8

shot "01-login"

# Email field (~42% down screen)
sim_click_ratio 0.50 0.42
sleep 0.3
sim_paste "$EMAIL"

# Password field
sim_click_ratio 0.50 0.52
sleep 0.3
sim_paste "$PASSWORD"

# Sign In button
sim_click_ratio 0.50 0.62
echo "Signing in..."
sleep 10

shot "02-after-sign-in"

# Profile / settings tab (bottom-right area of app if bottom nav exists)
sim_click_ratio 0.88 0.93
sleep 2
shot "03-settings"

# Privacy row (~mid screen list item)
sim_click_ratio 0.50 0.55
sleep 2
shot "04-privacy-security"

# Back
sim_click_ratio 0.08 0.10
sleep 1

# Try emergency / home - center bottom home if visible
sim_click_ratio 0.50 0.93
sleep 2
shot "05-main-screen"

echo "Done. Screenshots in $OUT_DIR"
ls -la "$OUT_DIR"
