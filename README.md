# nwos-deploy

**[nwos.numen.games](https://nwos.numen.games)** — the Narrative Work OS as a
service: a landing that explains it and a generator that creates an
organisation's own workspace from `nwos-workspace-template`.

The rules of the house, its vocabulary and its decisions live in
[`numengames/numinia-archive`](https://github.com/numengames/numinia-archive)
(numinia.org). This repository holds code only.

## What is in it

- `/` product landing, `/how-it-works`, `/updates`, `/telemetry` (static).
- `/velo` (the paid trial) and `/workspace/[slug]` (workspace reader), server-rendered.
- `/api/*`: deploy (`/api/registro`), workspace tree/file/download/invite/transfer, `/api/health`.
- The public example workspace (`faro-austral`) is bundled at build from `src/content/demo/`, so it needs no secret.

Stack: Astro 7 (static output) on Cloudflare Workers, React 19 islands, Tailwind 4. Deploys on every push to `main`.

## Run

```bash
npm ci
npm run dev                                                        # http://localhost:4321
npm run type-check && npm run lint && npm test && npm run build    # what CI runs
```

Node ≥ 22.12. `/velo` and `/workspace/[slug]` need the variables in
`.env.example` (GitHub + Anthropic); without them the static pages still
work and those routes return 500. Architecture, gates and deploy are in
[`CLAUDE.md`](CLAUDE.md).

## Licences

`AGPL-3.0-only` for the application, declared per path in
[`REUSE.toml`](REUSE.toml). Contributions require the CLA
([`CLA.md`](CLA.md), [`CONTRIBUTING.md`](CONTRIBUTING.md)). Trademarks:
[`TRADEMARKS.md`](TRADEMARKS.md).

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. Commit messages and pull
request titles are in English.

## Status

Live at [nwos.numen.games](https://nwos.numen.games), under active development.
The current version and what changed: [nwos.numen.games/updates](https://nwos.numen.games/updates/).
Security reports: [`SECURITY.md`](SECURITY.md).
