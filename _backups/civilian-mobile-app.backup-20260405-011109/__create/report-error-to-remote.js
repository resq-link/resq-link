import { serializeError } from 'serialize-error';

export const reportErrorToRemote = async ({ error }) => {
  const endpoint = process.env.EXPO_PUBLIC_LOGS_ENDPOINT;
  const projectGroupId = process.env.EXPO_PUBLIC_PROJECT_GROUP_ID;
  const apiKey = process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY;

  if (!endpoint || !projectGroupId || !apiKey) {
    // Optional remote logging; omit noisy dev logs when not configured.
    return { success: false, skipped: true };
  }
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        projectGroupId,
        logs: [
          {
            message: JSON.stringify(serializeError(error)),
            timestamp: new Date().toISOString(),
            level: 'error',
            source: 'BUILDER',
            devServerId: process.env.EXPO_PUBLIC_DEV_SERVER_ID,
          },
        ],
      }),
    });
  } catch (fetchError) {
    return { success: false, error: fetchError };
  }
  return { success: true };
};
