import { PostHog } from 'posthog-node';

let posthogServer: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!posthogServer) {
    posthogServer = new PostHog(process.env.POSTHOG_API_KEY!, {
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 10,
      flushInterval: 5000,
    });
  }
  return posthogServer;
}

/**
 * Capture a server-side event.
 * Use for events that originate from API routes, webhooks, or Inngest functions.
 *
 * @param distinctId - Hashed email or anonymous session ID
 * @param event - Event name (use the taxonomy from Artifact 13 §3)
 * @param properties - Event properties
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const ph = getPostHogServer();
  ph.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: 'posthog-node',
      environment: process.env.NODE_ENV,
    },
  });
}
