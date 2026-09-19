# nwos-deploy

**[nwos.numen.games](https://nwos.numen.games)** — the Narrative Work OS as a
service: a landing that explains it and a generator that creates an
organisation's own workspace from `nwos-workspace-template`.

The rules of the house, its vocabulary and its decisions live in
[`numengames/numinia-archive`](https://github.com/numengames/numinia-archive)
(numinia.org). This repository holds code only.

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

Version and what changed: [nwos.numen.games/updates](https://nwos.numen.games/updates/).
