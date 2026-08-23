/**
 * Map low-level fetch / network errors to user-safe messages.
 * Full technical details should be logged separately in __DEV__.
 */
export function toUserFacingNetworkError(error, context = 'request') {
  const raw = String(error?.message || error || '').trim();
  const lower = raw.toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (__DEV__) {
    console.warn(`[network:${context}]`, raw, code ? `(code: ${code})` : '');
  }

  if (
    code.includes('email-already-in-use') ||
    lower.includes('email-already-in-use') ||
    lower.includes('already exists')
  ) {
    return 'An account with this email already exists. Try logging in instead.';
  }

  if (code.includes('weak-password') || lower.includes('weak-password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }

  if (code.includes('invalid-email') || lower.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (
    code.includes('upload-failed') ||
    lower.includes('account could not be completed because the image upload failed') ||
    lower.includes('arraybuffer') ||
    lower.includes('blob') ||
    lower.includes('failed to upload image') ||
    lower.includes('storage upload failed')
  ) {
    return 'Your account could not be completed because the image upload failed.';
  }

  if (
    code.includes('invalid-image') ||
    (lower.includes('selected image') && lower.includes('processed')) ||
    (lower.includes('image') && lower.includes('empty'))
  ) {
    return 'The selected image could not be processed.';
  }

  if (
    lower.includes('connectexception') ||
    lower.includes('failed to connect') ||
    lower.includes('network request failed') ||
    lower.includes('fetch failed') ||
    lower.includes('econnrefused') ||
    lower.includes('timeout') ||
    lower.includes('timed out')
  ) {
    if (context === 'photo') {
      return 'Unable to upload your photo. Please check your connection and try again.';
    }
    if (context === 'otp') {
      return 'Your account was created, but we could not send the verification email. Tap Resend code on the next screen to try again.';
    }
    return 'Unable to connect. Please check your connection and try again.';
  }

  if (lower.includes('permission-denied') || lower.includes('permission denied')) {
    if (context === 'photo') {
      return 'Photo upload was denied. Please sign out, then try registering again.';
    }
    return 'Account setup was denied. Please try again or contact support.';
  }

  if (
    raw &&
    !lower.includes('firebase:') &&
    !lower.includes('192.168.') &&
    !lower.includes('10.0.2.2') &&
    !lower.includes('127.0.0.1')
  ) {
    return raw;
  }

  return 'Something went wrong. Please try again.';
}
