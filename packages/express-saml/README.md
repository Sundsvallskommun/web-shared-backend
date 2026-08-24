# @sk-web-backend/express-saml

SAML login/logout flow for Sundsvalls kommun Express backends.

> **0.0.1 is a placeholder.** It ships no SAML code — it exists to prove the
> publish/consume pipeline. The real API lands in 0.1.0. See `CODE_REUSE.md` step 2.

## Planned API (0.1.0)

```ts
import { createSamlRouter } from '@sk-web-backend/express-saml';

app.use(
  BASE_URL_PREFIX,
  createSamlRouter({
    name: 'saml',
    idp: { mode: 'single', config: { /* ... */ } },
    redirects: { success: SAML_SUCCESS_REDIRECT, failure: SAML_FAILURE_REDIRECT, logout: SAML_LOGOUT_REDIRECT },
    relayFormat: 'csv',
    verify: async (profile) => { /* app-specific: profile -> user, or null to reject */ },
    onLoginSuccess: async (req, user, relay) => { /* app-specific session population */ },
  }),
);
```

Two hooks required (`verify`, `onLoginSuccess`), two optional (`logoutVerify`, `onLogout`).

Security defaults follow draken's hardened configuration: `wantAssertionsSigned: true`,
`wantAuthnResponseSigned: true`, `acceptedClockSkewMs: 5000`, sha256 signature and digest.
`identifierFormat`, `audience` and `relayFormat` have **no defaults** — they differ
legitimately per IdP and per frontend contract, so the caller must choose.

## Peer dependencies

`express ^4.21.2 || ^5.1.0` is a **migration bridge with a declared sunset**: v1.0 drops
Express 4, and v1.0 does not ship until all four consumer repos are on Express 5.
`engines: >=18.18` exists only because msbolag and katla still run `node:18-slim`.
