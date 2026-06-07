let cachedOrigin: string | null = null;

function sanitizeDevOrigin(origin: string): string {
  if (!origin) return origin;
  // Convert any developer-restricted 'ais-dev-' subdomains to the public peer-accessible 'ais-pre-' shared URLs
  if (origin.includes("ais-dev-")) {
    return origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

/**
 * Proactively fetches the authenticated backend-determined external origin.
 * Resolves to the real public production/development web URL in all running sandboxes.
 */
export async function fetchAppOrigin(): Promise<string> {
  if (cachedOrigin) return cachedOrigin;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.origin) {
        cachedOrigin = sanitizeDevOrigin(data.origin);
        return cachedOrigin;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch app origin config:", err);
  }
  return sanitizeDevOrigin(window.location.origin);
}

/**
 * Returns the cached public origin or falls back to window.location.origin synchronously.
 */
export function getInstantOrigin(): string {
  if (cachedOrigin) return cachedOrigin;
  return sanitizeDevOrigin(window.location.origin);
}

/**
 * Set the cached origin manually if known.
 */
export function setCachedOrigin(origin: string) {
  cachedOrigin = sanitizeDevOrigin(origin);
}

