/**
 * Central API base URL for all backend calls.
 *
 * Local dev:
 *   Leave VITE_API_BASE_URL unset. Vite's dev-server proxy (see vite.config.ts)
 *   forwards `/api/*` requests to http://localhost:3001, so a relative URL
 *   like `/api/bedrock/converse/stream` works out of the box.
 *
 * Production:
 *   • If the client is served from the same origin as the API (e.g. behind a
 *     single CloudFront distribution that routes /api/* to the backend),
 *     set VITE_API_BASE_URL="" — relative URLs will resolve to the same host.
 *   • If the API lives on a different origin, set VITE_API_BASE_URL to its
 *     absolute URL, e.g. "https://api.smewise.example.com".
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';
