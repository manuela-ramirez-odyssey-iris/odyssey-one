---
domain: cross-cutting
type: reference
tags: [api, auth, sso, oidc, msal, entra, security, production-readiness]
date: 2026-06-05
status: partial
source: "Confluence TMS 2538373145 (FE Login Flow SSO), 2660139009 (RMIS FE SSO MSAL). Both IMAGE-ONLY (no written spec). Jira: OTMS-805/806→LINX-6059/5981, OTMS-3194→OTMS-3406."
---

# Front-end Auth / SSO — understanding (PARTIAL)

> ⚠️ **The real auth pattern is NOT documented in text.** Both SSO LLD pages are a single embedded PNG diagram each, with no body, tables, comments, or child pages. Traced through three Jira tickets — all one-line user stories or null descriptions. **This is itself evidence of the documentation gap the prototype faced** (the cookie-paste stopgap exists *because* the real flow was never written down). SME/author: **Balaji Azhagesan**.

## What's inferable (medium confidence)
- **Library:** RMIS page title names **MSAL** (Microsoft Authentication Library) → IdP is **Microsoft Entra ID / Azure AD**, protocol **OIDC / OAuth2** (authorization-code + PKCE for SPAs).
- **For a React SPA:** maps to **`@azure/msal-browser` + `@azure/msal-react`** (`MsalProvider`, `useMsal`, `useIsAuthenticated`, `MsalAuthenticationTemplate`).
- **Two flows exist:** generic OTMS SSO (Dec 2024) + RMIS-specific MSAL (Jan 2025).
- **Logout distinction (from LINX-5981):** app-session logout ≠ SSO single-logout — deliberately separated. Carry into design.

## What is NOT recoverable (must get from diagrams / FE team / code)
Authorize+token endpoints, redirect URIs, token types/storage, lifetimes, silent-renewal, exact scopes/claims, and config values (tenantId, clientId, authority URL). **Not fabricated here.**

## Cookie-paste → production gap (the bounded work)
To replace the prototype's cookie-paste stopgap with the real flow, a React app needs:
1. `@azure/msal-browser` + `@azure/msal-react` installed.
2. An `msalConfig` (`auth.clientId`, `auth.authority` = `https://login.microsoftonline.com/<tenantId>`, `auth.redirectUri`, `scopes`) — values from the FE team / Entra app registration.
3. `<MsalProvider>` at the app root; route guards via `MsalAuthenticationTemplate` / `useIsAuthenticated`.
4. An Axios/fetch **interceptor** that calls `acquireTokenSilent` and attaches `Authorization: Bearer <access_token>` (+ `x-correlation-id`) to every API call — this is the single integration point all the service APIs already expect.
5. **Redirect URI registration** for the prototype/stage origin in the Entra app registration (an infra/IT ask — ties to the pending Soni infra request).

## To complete this note
Export the two diagrams (PNG or page→PDF) into `vault/00-inbox/`, then they can be read directly (or via `tools/convert-docs.sh`) to fill in endpoints/tokens/config. Or get the `msalConfig` from the production FE repo.

## Sensitive (internal only)
No secrets were extractable (pages are images). When config arrives: tenantId, clientId, and any secret are sensitive — clientId/tenantId are app config (env vars), never a client *secret* in a SPA.
