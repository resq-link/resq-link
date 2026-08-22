export function mapLoginError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  const combined = `${code} ${message}`.toLowerCase();

  if (
    combined.includes('invalid-credential') ||
    combined.includes('wrong-password') ||
    combined.includes('user-not-found') ||
    combined.includes('invalid-email') ||
    combined.includes('missing-password')
  ) {
    return 'Invalid email or password.';
  }

  if (
    combined.includes('access denied') ||
    combined.includes('not a super admin') ||
    combined.includes('workspace') ||
    combined.includes('forbidden')
  ) {
    return 'You do not have access to this workspace.';
  }

  if (combined.includes('too-many-requests')) {
    return 'Unable to sign in right now. Please try again.';
  }

  return 'Unable to sign in right now. Please try again.';
}
