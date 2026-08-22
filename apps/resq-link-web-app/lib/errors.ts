export function publicErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('email-already-exists') || message.includes('already in use')) {
    return 'Email already in use';
  }
  if (message.includes('user-not-found')) {
    return 'Account not found';
  }
  if (message.includes('weak-password') || message.includes('invalid-password')) {
    return 'Password does not meet requirements';
  }
  if (message.includes('user-disabled')) {
    return 'This account is disabled';
  }
  console.error(fallback, error);
  return fallback;
}

export function readApiError(data: { error?: string } | null, fallback: string): string {
  if (data?.error && data.error.length < 180 && !data.error.includes('FIREBASE')) {
    return data.error;
  }
  return fallback;
}
