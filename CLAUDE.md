# CLAUDE.md — nwos-deploy

This repository serves **nwos.numen.games**: the Narrative Work OS as a
service — a landing and the generator that creates a client's workspace.
The rules, the vocabulary and the decisions of Numen Games live in one
place, `numengames/numinia-archive` (numinia.org): read its `AGENTS.md`
first, transition regime included. This file only says what is specific
here.

**First instruction: audit the current branch state before assuming
anything.** Never trust that the repo matches this file or a brief — read
what is actually there first.

## What this is

Astro 5, `output: "static"` with the Cloudflare Workers adapter
(`@astrojs/cloudflare`, config in `wrangler.jsonc`); React 19 islands only
where a `client:` directive is used; Tailwind 3; Geist and Geist Mono
self-hosted. Path alias `@/*` → `src/*`. Nocturno only.

- **Routes**: `/` (product landing, static), `/velo` (deploy form, SSR),
  `/workspace/[slug]` (workspace browser, SSR), `/updates`, `/telemetry`,
  and the API under `src/pages/api/`. SSR routes carry
  `export const prerender = false`.
- **The deploy flow**: `/velo` → `DeployForm.tsx` → `POST /api/registro`
  creates a private GitHub repository from `nwos-workspace-template`,
  personalises the placeholders, installs the client's reserved `LICENSE`
  (verifies `LICENSE.client`, strips the mould's own `LICENSE`, `REUSE.toml`,
  `TRADEMARKS.md`, `LICENSES/`; any failure aborts), generates the canon
  documents with the Anthropic API, commits them, updates `STATUS.md`. The
  result is browsed at `/workspace/[slug]?key=<hmac>` — `WorkspaceViewer.tsx`
  calls `/api/workspace/[slug]/tree` and `/file`, both gated by the
  per-workspace key (`src/lib/token.ts`) returned once at deploy time.
- **Design**: the kit is installed as `@numengames/design-kit` (source
  `packages/design-kit/` in numinia-nwos; its agent instruction is
  `node_modules/@numengames/design-kit/sistema.prompt.txt`).
  `scripts/design-tokens.mjs` generates `src/styles/tokens.css` on every
  `dev`/`build` — never hand-edit it, never invent a hex. Registers: the
  landing is Umbral; `/velo` and the viewer are the Velo. Motion only from
  the kit's catalogue; WCAG 2.2 AA is the floor.
- **Logging**: `src/lib/log.ts` holds the only sanctioned `console` call;
  everything else goes through `log.info/warn/error` (`no-console` is a
  lint error).

## Commands

```bash
npm ci
npm run dev          # http://localhost:4321
npm run type-check && npm run lint && npm test && npm run build   # what CI runs
npm run preview      # wrangler dev, reads .dev.vars
```

Node ≥ 22.12. `npm run build` runs `scripts/license-check.mjs` as
`postbuild`: it inspects `dist/` module paths and parses `LEGAL_DEBT.md`
for documented exceptions. Run `npx prettier --write` on every new file or
lint fails.

## Gates that bite

- `scripts/check-version-bump.mjs`: any change under `src/**` needs a new
  entry in `src/data/updates.ts` and a raised version.
- The required check is the job named `build` in `ci.yml`: the
  conjunction of the artefact steps (type-check → lint → test → version
  bump → build → share card). The `presence` job (root files that must
  exist; this file must contain "audit the current branch state" and
  "design-kit") only reports while the archive's STD-015 is draft — it
  looks, it does not bite.
- `license-check.yml`: the PR author must be listed in
  `CLA-SIGNATORIES.md` — this repository ships AGPL-3.0-only code and a
  CLA is required per repository.
- No `©` line anywhere in the chrome: per-file licensing in `REUSE.toml`
  contradicts a blanket reservation.

## Environment

`GITHUB_ORG`, `GITHUB_TOKEN`, `GITHUB_TEMPLATE_REPO`, `ANTHROPIC_API_KEY`
(see `.env.example`), read through `getEnv(locals)` (`src/lib/env.ts`):
`locals.runtime.env` on Workers, `import.meta.env` in `npm run dev`. In
production they are wrangler secrets. Without them `/velo` and
`/workspace` return 500; the static pages still build.

## Deploy

Cloudflare Workers Builds on push to `main`; the build command lives in
`wrangler.jsonc` (`build.command`), the panel field stays empty. Verify a
publication with `nwos.numen.games/version.json` against the `main` SHA.

## Never without the operator

Repository visibility, secrets and Cloudflare credentials, DNS and custom
domains, the workspace access-key scheme, weakening any CI check,
force-pushing or rewriting history on `main`, anything about licences.
