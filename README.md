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
| `@sk-web-backend/express-saml` | 0.0.2 | **published** — placeholder, pipeline proof only |

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

Three commands have no yarn 1 equivalent and are wrapped as scripts rather than left as traps:

```bash
yarn npm:login     # yarn login stores only a username and email, never an auth token
yarn npm:pack      # yarn pack has no --dry-run; shows exactly what would ship
yarn npm:publish   # yarn publish has no --provenance  (run from the package directory)
```

They are named with an `npm:` prefix on purpose. `login`, `publish` and `pack` are all yarn
builtins, so a script called `publish` would be shadowed by `yarn publish` — and worse, `publish`
is *also* an npm lifecycle script that npm runs after publishing, so that name would recurse
infinitely.

**Never run `npm install` or `npm ci` here.** Those would fight the yarn lockfile. The three
commands above touch neither `node_modules` nor the lockfile, so they coexist with yarn safely.

### Deferred: the express compatibility matrix

At 0.1.0, CI needs a matrix over both express majors **and** both `@types/express` majors:

| express | @types/express |
|---|---|
| 4.21.2 | 4.17.25 |
| 5.1.0 | 5.0.3 |

Runtimes alone are not enough. The package returns an express `Router`, so its emitted `.d.ts` is
exposed to whichever `@types/express` major the consumer has installed — a type-level break would
pass a runtime-only matrix. With yarn 1 workspaces, override per leg inside `packages/express-saml`
with `yarn add -D --exact express@$VERSION @types/express@$TYPES` before running `type-check`.

Omitted at 0.0.x because nothing imports express yet.

## Test against a consuming app

Publishing is close to irreversible — npm's unpublish window is 72 hours and only applies while
nothing depends on the package — so a broken version is a permanent entry in the registry. Verify
against a real consumer first. Three tiers, cheapest first.

### Why not `yarn link`

Node resolves a symlink to its real path before resolving that module's dependencies, and this
package finds its peers in the monorepo root:

```
passport                  web-shared-backend/node_modules/passport/lib/index.js
express                   web-shared-backend/node_modules/express/index.js
@node-saml/passport-saml  web-shared-backend/node_modules/@node-saml/passport-saml/lib/index.js
```

A linked package keeps resolving *those* copies rather than the consumer's, so the app ends up with
two `passport.use()` registries and two express instances. That is exactly the failure the
peer-dependency policy exists to prevent, and it surfaces as inexplicable auth behaviour rather
than a clean error. Copying into `node_modules` by hand is worse still: the next `yarn install`
silently wipes it, and it bypasses the `files` array entirely, so you would be testing against
files that never ship.

### Tier 1 — inner loop

[`yalc`](https://github.com/wclr/yalc) packs and *copies* rather than symlinking, so peers resolve
from the consumer, and it respects the `files` array.

```bash
yarn global add yalc

cd packages/express-saml
yarn build && yalc publish

cd ../../../<consumer>
yalc add @sk-web-backend/express-saml
```

After each change, `yarn build && yalc push` from the package pushes to every linked consumer.
Clean up with `yalc remove --all && yarn install --force` in the consumer.

yalc writes a `.yalc/` directory and a `file:.yalc/...` dependency, so a consumer wired up this way
shows in `git status` — you cannot forget it is there. Add `.yalc/` and `*.tgz` to the consumer's
`.gitignore`.

### Tier 2 — packaging gate

Byte-identical to what would be published. This is the tier that catches a missing entry in
`files`, a stale `dist/`, or a broken CommonJS emit.

```bash
cd packages/express-saml
yarn npm:pack                 # inspect the file list first
npm pack                      # writes the .tgz; runs prepublishOnly (build + test + smoke)

cd ../../../<consumer>
yarn add file:../web-shared-backend/packages/express-saml/sk-web-backend-express-saml-0.0.2.tgz
```

Yarn 1 caches `file:` dependencies by path and filename, so re-packing at the same version is
ignored. Bump the version or run `yarn cache clean @sk-web-backend/express-saml` between attempts.
Note also that `yarn pack` does not run `prepublishOnly`, so it will not rebuild for you — use
`npm pack`, or run `yarn build` first.

### Tier 3 — publish gate

The only tier that exercises the real thing: registry resolution, consumer CI, and a Docker build
with no build-context tricks. Tiers 1 and 2 both break inside an image, because `.yalc/` and
relative tarball paths are not in the build context.

```bash
cd packages/express-saml
yarn version --new-version 0.1.0-rc.1
yarn npm:publish --tag next

# in the consumer
yarn add @sk-web-backend/express-saml@next
```

A `^0.1.0` range never resolves to a prerelease, so no other consumer picks it up by accident, and
the `next` dist-tag keeps `latest` pointing at the last real release. This is what lets draken
falsify the API at step 3 without burning the `0.1.0` version number. If rc versions on public npm
are unwanted, a local [Verdaccio](https://verdaccio.org/) registry gives the same fidelity
privately.

### Verify peers stayed single-instance

Whichever tier you used, check this in the consumer before trusting the result:

```bash
yarn why passport
```

More than one `Found "passport@..."` block means the two-registry problem. Repeat for `express` and
`@node-saml/passport-saml`.

## Publish

Manual for now, via the **Publish** workflow (`workflow_dispatch`). Once 0.1.0 is real, the trigger
switches to release tags.

Auth is npm **trusted publishing** (OIDC) — no long-lived token in GitHub secrets, and it attaches
a provenance attestation linking the tarball to this repo and commit. The registered configuration:

| field | value |
|---|---|
| publisher | GitHub Actions |
| organization | `Sundsvallskommun` |
| repository | `web-shared-backend` |
| workflow filename | `publish.yml` |
| environment | `npm-publish` |

Three things about that table are load-bearing:

- **Do not rename `publish.yml`.** npm matches the trusted publisher on the filename. Renaming it
  breaks publishing silently — the job runs and fails at auth — until the npmjs settings page is
  updated to match.
- **The environment name must match on both sides.** npm's trusted publisher config keys on repo +
  workflow + environment and has no branch field, so the `npm-publish` GitHub Environment is the
  only place a branch restriction can live. A mismatch fails with an unhelpful OIDC error that does
  not name the environment.
- **Each package needs its own trusted publisher**, with these same values. The workflow's
  `package` input and `working-directory` already handle the fan-out, so no workflow change is
  needed when a second package lands.

`publishConfig.access: "public"` is required on every package. Without it, publishing a scoped
package fails with `402 Payment Required` — npm assumes a scoped package is private unless told
otherwise.

### What the `npm-publish` environment gates on

Two rules, not one:

- **Deployment branches** — `main` only.
- **Required reviewers** — the `Sundsvallskommun/web-developers` team. Self-review is currently
  *allowed*, so a maintainer can approve their own release while the team is small. Turn on
  "Prevent self-review" in the environment settings once more people contribute; that is a
  one-click change and needs no edit here.

Either way, a dispatched run sits in a *Waiting* state until someone approves it from the run's page
in the Actions tab. That is the gate working, not a stuck job — worth knowing before your first
release, because a waiting run looks identical to a hung one.

Token publishing is deliberately left enabled as a fallback, which is what makes `yarn npm:publish`
usable for rc versions and emergencies. That script passes `--no-provenance` because npm refuses to
attest outside a supported CI environment — so **CI must never use it**. `publish.yml` calls
`npm publish` directly, keeping the attestation.

A local publish packs whatever is on disk, so a stale or missing `dist/` would ship silently.
`prepublishOnly` runs `yarn build && yarn test && yarn test:smoke` first, which makes that
impossible — the smoke test `require()`s the freshly built `dist/` before anything is packed.

### How 0.0.1 was bootstrapped

Kept as a record, not as instructions: this is not repeatable for a package that already exists.

A trusted publisher can only be configured on a package's settings page, which does not exist until
the package does. So `0.0.1` went out by hand, once:

```bash
# Once: create the @sk-web-backend org at npmjs.com/org/create (web only — no CLI equivalent).

yarn npm:login                  # browser-based; writes a token to ~/.npmrc
cd packages/express-saml
yarn npm:pack                   # confirm the tarball contents
yarn npm:publish                # --otp=<code> as well if 2FA is set to "auth and writes"
```

The trusted publisher was then registered against the published package, and every release after
this one goes through the **Publish** workflow with no token anywhere.

One permanent consequence: **`0.0.1` carries no provenance attestation.** `--no-provenance` was
unavoidable for a local publish, and a published version cannot be amended. The first attested
release will be the next one. That is acceptable precisely because `0.0.1` is a throwaway.

## Consume

```bash
yarn add @sk-web-backend/express-saml
```

That is the whole integration. No registry configuration, no CI secret, and no Dockerfile
change in the consuming app.

## Setup checklist (step 1)

- [x] Create the `@sk-web-backend` npm org and add the Sundsvallskommun publishing account
- [x] Create `Sundsvallskommun/web-shared-backend` on GitHub and push this scaffold
- [x] Register the trusted publisher on npmjs for `@sk-web-backend/express-saml`
- [x] Publish `@sk-web-backend/express-saml@0.0.1`
- [x] Install it in one consumer and call `pipelineCheck()` once — confirmed at runtime in local
      dev
- [ ] Confirm the consumer's Docker image still builds unchanged, and that the package resolves in
      the consumer's CI. Step 1 is not done until all three environments are covered.
- [ ] Add the shared Renovate preset so consumers pick up releases
- [ ] Pin `packageManager` in draken, web-app-business-center and katla
- [ ] Fix `draken/backend/Dockerfile` — `RUN yarn build 2>&1 || true` means the build cannot
      fail the image, which removes the main safety signal for shared-code upgrades
- [ ] Add a LICENSE to draken and katla (msbolag and business-center already have one)
