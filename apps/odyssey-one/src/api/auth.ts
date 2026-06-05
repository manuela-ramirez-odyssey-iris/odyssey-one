// Auth-token seam. Stubbed: returns a dev bearer token from env if present.
// Replaced by MSAL/Entra (acquireTokenSilent) later — callers never change.
export function getAuthToken(): string | null {
  return import.meta.env.VITE_API_TOKEN || null
}
