/**
 * Translate technical errors into responder-safe operational language.
 * Log the original error internally; never surface Firebase/stack traces.
 */
export function toOperationalError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  const raw =
    typeof error === "string"
      ? error
      : error.message || error.code || String(error);

  const lower = raw.toLowerCase();

  if (
    lower.includes("network") ||
    lower.includes("offline") ||
    lower.includes("connection") ||
    lower.includes("timeout")
  ) {
    return "Unable to connect. Check your connection and try again.";
  }

  if (lower.includes("permission") || lower.includes("unauthorized")) {
    return "You don't have permission to perform this action.";
  }

  if (lower.includes("not found") || lower.includes("does not exist")) {
    return "This incident is no longer available.";
  }

  if (
    lower.includes("firebase") ||
    lower.includes("undefined") ||
    lower.includes("internal") ||
    lower.includes("failed-precondition")
  ) {
    console.error("[operational]", raw);
    return fallback;
  }

  // Already user-friendly short messages can pass through
  if (raw.length < 120 && !lower.includes("error:")) {
    return raw;
  }

  console.error("[operational]", raw);
  return fallback;
}
