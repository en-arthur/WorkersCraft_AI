// Usage event ingestion — kept for analytics tracking
// Events are logged for future metering/billing integration

export async function ingestEvent(userId, eventName, metadata = {}) {
  // TODO: integrate with Paddle metering or analytics when needed
  console.log('[usage]', { userId, eventName, metadata })
}
