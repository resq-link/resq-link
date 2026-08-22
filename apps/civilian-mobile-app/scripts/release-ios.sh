#!/usr/bin/env bash
# First-time iOS release: run in your Mac Terminal (Apple login prompts required once).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> RESQ-Link civilian iOS release"
echo ""
echo "Prerequisites:"
echo "  • Demo account approved: civilian@rescue.com (status = active in /admin/kyc)"
echo "  • App Store Connect app created for com.tuguegarao.resqlink"
echo "  • Privacy URL: https://www.resq-link.com/privacy-policy"
echo ""

if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in to EAS. Run: eas login"
  exit 1
fi

echo "==> Step 1: EAS iOS production build"
echo "    When prompted:"
echo "      • Log in with your Apple Developer Apple ID"
echo "      • Choose: Let EAS manage credentials (recommended)"
echo "      • Confirm bundle ID: com.tuguegarao.resqlink"
echo ""
export EAS_SKIP_AUTO_FINGERPRINT="${EAS_SKIP_AUTO_FINGERPRINT:-1}"
eas build --platform ios --profile production

echo ""
echo "==> Step 2: Submit build to App Store Connect / TestFlight"
read -r -p "Submit latest build now? [Y/n] " SUBMIT
SUBMIT="${SUBMIT:-Y}"
if [[ "${SUBMIT,,}" == "y" || "${SUBMIT,,}" == "yes" || -z "${SUBMIT// /}" ]]; then
  eas submit --platform ios --latest
fi

echo ""
echo "==> Step 3: App Store Connect (manual)"
echo "  1. Open https://appstoreconnect.apple.com → RESQ-Link → version 1.0"
echo "  2. Select the uploaded build under Build"
echo "  3. App Review Information → paste notes from docs/APP_STORE_PRIVACY.md"
echo "     Demo: civilian@rescue.com / Test123"
echo "  4. Complete App Privacy questionnaire if not done"
echo "  5. Submit for Review"
echo ""
echo "Done."
