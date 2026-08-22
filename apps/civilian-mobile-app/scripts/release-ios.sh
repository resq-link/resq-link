#!/usr/bin/env bash
# First-time iOS release: run interactively in Terminal (Apple login prompts required once).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> EAS iOS production build (interactive — follow Apple credential prompts)"
eas build --platform ios --profile production

echo ""
echo "==> When the build finishes, submit to App Store Connect / TestFlight:"
echo "    eas submit --platform ios --latest"
echo ""
read -r -p "Submit now? [y/N] " SUBMIT
if [[ "${SUBMIT,,}" == "y" ]]; then
  eas submit --platform ios --latest
fi

echo "Done. Attach the build in App Store Connect → version 1.0 → Build → Submit for Review."
