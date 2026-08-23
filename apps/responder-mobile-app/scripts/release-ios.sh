#!/usr/bin/env bash
# Responder iOS → EAS production build → App Store Connect / TestFlight.
# Run interactively in Terminal (Apple login prompts required once).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> RESQ-Link Responder iOS release (TestFlight)"
echo ""
echo "Prerequisites:"
echo "  • App Store Connect app created for com.tuguegarao.resqlink.responder"
echo "  • Privacy URL: https://www.resq-link.com/privacy-policy"
echo "  • Demo responder active in Firebase dispatchers (e.g. bfp@rescue.ph)"
echo "  • EAS env synced: ./scripts/sync-eas-firebase-env.sh"
echo ""

if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in to EAS. Run: eas login"
  exit 1
fi

echo "==> Step 1: EAS iOS production build"
echo "    When prompted:"
echo "      • Log in with your Apple Developer Apple ID"
echo "      • Choose: Let EAS manage credentials (recommended)"
echo "      • Confirm bundle ID: com.tuguegarao.resqlink.responder"
echo ""
export EAS_SKIP_AUTO_FINGERPRINT="${EAS_SKIP_AUTO_FINGERPRINT:-1}"
eas build --platform ios --profile production --non-interactive

echo ""
echo "==> Step 2: Submit build to App Store Connect / TestFlight"
if [[ "${EAS_SUBMIT:-Y}" =~ ^[Yy] ]]; then
  eas submit --platform ios --latest --non-interactive
else
  echo "Skipped submit (set EAS_SUBMIT=Y to enable)."
fi

echo ""
echo "==> Step 3: App Store Connect → TestFlight (manual)"
echo "  1. Open https://appstoreconnect.apple.com → RESQ-Link Responder"
echo "  2. TestFlight → select the uploaded build (wait for processing)"
echo "  3. Add Internal Testers (App Store Connect Users) for same-day installs"
echo "  4. Optional External Testing: paste review notes from docs/APP_STORE_PRIVACY.md"
echo "     Demo: bfp@rescue.ph / BFP2024!"
echo "  5. Complete App Privacy questionnaire if not done"
echo ""
echo "Done. Share the TestFlight invite link with responders."
