# web-shared-backend

Shared backend libraries for Sundsvalls kommun Express apps, published to public npmjs.

Backend counterpart to `web-shared-components` (`@sk-web-gui/*`). Same layout, same registry,
one deliberate difference: these packages are **CJS only** (every consumer backend is
`"module": "commonjs"` and starts with `node dist/server.js`, so there is nothing to gain
from a dual ESM/CJS build).

Public, because the consuming apps are public. All four target repos live under
`github.com/Sundsvallskommun`; a private dependency would make them un-installable for
anyone outside the network — forks could not build and fork CI could not run — while
protecting code that is already readable in those repos.

Plan and rationale: [`../CODE_REUSE.md`](../CODE_REUSE.md).

| package | version | status |
|---|---|---|
| `@sk-web-backend/express-saml` | 0.0.1 | placeholder — pipeline proof only |

## Layout

```
packages/*              one package per directory, yarn workspaces
tsconfig.base.json      shared compiler options; packages extend it
```

No `.npmrc` anywhere, here or in consumers — everything resolves from the default registry.

No Lerna or Nx yet. `web-shared-components` needs them for ~40 packages; two packages do
not. The directory layout is identical, so adding Lerna later is non-breaking.

## Develop

```bash
yarn install
yarn type-check
yarn test          # vitest
yarn build
yarn test:smoke    # require()s the built dist/ — run after build
```

## Publish

Manual for now, via the **Publish** workflow (`workflow_dispatch`).

Auth is npm **trusted publishing** (OIDC) — no long-lived token in GitHub secrets, and it
attaches a provenance attestation linking the tarball to this repo and commit. It requires
a trusted publisher registered on npmjs.com for each package: repo
`Sundsvallskommun/web-shared-backend`, workflow `.github/workflows/publish.yml`.

`publishConfig.access: "public"` is required on every package. Without it, publishing a
scoped package fails with `402 Payment Required` — npm assumes a scoped package is private
unless told otherwise.

### Bootstrap the first publish

A trusted publisher is configured on a package's settings page, which only exists once the
package does. So 0.0.1 goes out by hand, once, and everything after it runs in CI:

```bash
# Once: create the @sk-web-backend org at npmjs.com/org/create (web only — no CLI equivalent).

npm login                       # browser-based; writes a token to ~/.npmrc

cd packages/express-saml
npm pack --dry-run              # confirm dist/, src/, LICENSE and README are in the tarball
npm publish --no-provenance     # --otp=<code> as well if 2FA is set to "auth and writes"
```

`--no-provenance` is required locally: `publishConfig.provenance` is `true` for CI, and npm
refuses to generate an attestation outside a supported CI environment. Do not drop it from
`publishConfig` to work around this — CI publishes should keep it.

Then register the trusted publisher on the package's npmjs settings page, and every release
after this one goes through the **Publish** workflow with no token anywhere.

A local `npm publish` packs whatever is on disk, so a stale or missing `dist/` would ship
silently. `prepublishOnly` runs `yarn build && yarn test && yarn test:smoke` first, which makes
that impossible — the smoke test `require()`s the freshly built `dist/` before anything is packed.

## Consume

```bash
yarn add @sk-web-backend/express-saml
```

That is the whole integration. No registry configuration, no CI secret, and no Dockerfile
change in the consuming app.

## Setup checklist (step 1)

- [ ] Create the `@sk-web-backend` npm org (free for public packages; the scope is
      currently unclaimed) and add the Sundsvallskommun publishing account
- [ ] Create `Sundsvallskommun/web-shared-backend` on GitHub and push this scaffold
- [ ] Register the trusted publisher on npmjs for `@sk-web-backend/express-saml`. If npm
      will not accept one for a name that does not exist yet, publish 0.0.1 once with a
      granular automation token, then switch and delete the secret.
- [ ] Publish `@sk-web-backend/express-saml@0.0.1`
- [ ] Install it in one consumer, call `pipelineCheck()` once, confirm the value at runtime
      and that the app's Docker image still builds unchanged
- [ ] Add the shared Renovate preset so consumers pick up releases
- [ ] Pin `packageManager` in draken, web-app-business-center and katla
- [ ] Fix `draken/backend/Dockerfile` — `RUN yarn build 2>&1 || true` means the build cannot
      fail the image, which removes the main safety signal for shared-code upgrades
- [ ] Add a LICENSE to draken and katla (msbolag and business-center already have one)
