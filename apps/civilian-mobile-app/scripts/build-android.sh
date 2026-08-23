#!/usr/bin/env bash
# Civilian Android Build via Expo EAS
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> RESQ-Link Civilian Android Build"
echo ""
echo "Select build profile:"
echo "  1) Preview (Installable APK for direct testing)"
echo "  2) Production (AAB bundle for Google Play Console)"
read -r -p "Enter choice [1/2] (default: 1): " CHOICE
CHOICE="${CHOICE:-1}"

PROFILE="preview"
if [[ "$CHOICE" == "2" ]]; then
  PROFILE="production"
fi

if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in to EAS. Run: eas login"
  exit 1
fi

echo "==> Starting EAS Android build with profile: $PROFILE"
export EAS_SKIP_AUTO_FINGERPRINT="${EAS_SKIP_AUTO_FINGERPRINT:-1}"
eas build --platform android --profile "$PROFILE"
