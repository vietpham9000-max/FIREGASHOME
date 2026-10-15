/**
 * Production push notifications are intentionally not configured here.
 * TODO: connect Expo Push/FCM to a trusted backend or Cloud Function that
 * validates telemetry and emits Gas/Fire alerts without exposing server keys.
 */
export async function prepareNotifications(): Promise<void> { return Promise.resolve(); }
