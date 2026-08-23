#!/usr/bin/env bash
# Sync Firebase env vars from local .env to EAS (production, preview, development).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if ! eas whoami >/dev/null 2>&1; then
  echo "Not logged in to EAS. Run: eas login"
  exit 1
fi

get_env() {
  local name="$1"
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="$(echo "$key" | xargs)"
    val="$(echo "$val" | xargs | sed 's/^["'\''"]//;s/["'\''"]$//')"
    if [[ "$key" == "$name" ]]; then
      echo "$val"
      return 0
    fi
  done < "$ENV_FILE"
  return 1
}

resolve_firebase_value() {
  local eas_name="$1"
  local src
  case "$eas_name" in
    FIREBASE_API_KEY)
      for src in EXPO_PUBLIC_FIREBASE_API_KEY FIREBASE_API_KEY; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    FIREBASE_AUTH_DOMAIN)
      for src in EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN FIREBASE_AUTH_DOMAIN; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    FIREBASE_PROJECT_ID)
      for src in EXPO_PUBLIC_FIREBASE_PROJECT_ID FIREBASE_PROJECT_ID; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    FIREBASE_STORAGE_BUCKET)
      for src in EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET FIREBASE_STORAGE_BUCKET; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    FIREBASE_MESSAGING_SENDER_ID)
      for src in EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID FIREBASE_MESSAGING_SENDER_ID; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    FIREBASE_APP_ID)
      for src in EXPO_PUBLIC_FIREBASE_APP_ID FIREBASE_APP_ID; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    GOOGLE_MAPS_API_KEY)
      for src in EXPO_PUBLIC_GOOGLE_MAPS_API_KEY GOOGLE_MAPS_API_KEY; do
        get_env "$src" 2>/dev/null && return 0
      done ;;
    EXPO_PUBLIC_API_URL)
      for src in EXPO_PUBLIC_API_URL API_URL; do
        get_env "$src" 2>/dev/null && return 0
      done
      echo "https://www.resq-link.com"
      return 0 ;;
    EXPO_PUBLIC_OTP_API_URL)
      for src in EXPO_PUBLIC_OTP_API_URL OTP_API_URL EXPO_PUBLIC_API_URL API_URL; do
        get_env "$src" 2>/dev/null && return 0
      done
      echo "https://www.resq-link.com"
      return 0 ;;
  esac
  return 1
}

EAS_NAMES=(
  FIREBASE_API_KEY
  FIREBASE_AUTH_DOMAIN
  FIREBASE_PROJECT_ID
  FIREBASE_STORAGE_BUCKET
  FIREBASE_MESSAGING_SENDER_ID
  FIREBASE_APP_ID
  GOOGLE_MAPS_API_KEY
  EXPO_PUBLIC_API_URL
  EXPO_PUBLIC_OTP_API_URL
)

cd "$ROOT"

for eas_name in "${EAS_NAMES[@]}"; do
  if ! value="$(resolve_firebase_value "$eas_name")"; then
    echo "Skip $eas_name (not in .env)"
    continue
  fi
  for environment in production preview development; do
    echo "Setting $eas_name for $environment..."
    eas env:create "$environment" \
      --name "$eas_name" \
      --value "$value" \
      --visibility secret \
      --scope project \
      --non-interactive \
      --force
  done
done

echo "Done. Verify with: eas env:list"
