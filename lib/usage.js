import { polar } from '@/lib/polar'

/**
 * Ingest a usage event to Polar.
 * Non-fatal — errors are logged but never thrown.
 */
export async function ingestEvent(userId, eventName, metadata = {}) {
  try {
    await polar.events.ingest({
      events: [{ name: eventName, externalCustomerId: userId, metadata: { count: 1, ...metadata } }],
    })
  } catch (err) {
    console.error('[usage] ingestEvent error:', err)
  }
}
