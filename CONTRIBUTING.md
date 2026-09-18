# Contributing

The rules live in [`numengames/numinia-nwos`](https://github.com/numengames/numinia-nwos)
(`AGENTS.md`, transition regime included). Here, only what is specific to
this code:

1. **Sign the CLA, once, in your first pull request.** This repository
   ships `AGPL-3.0-only` code, so a Contributor License Agreement is
   required per repository — documentation and configuration changes too.
   Read [CLA.md](CLA.md), then add a row for yourself to
   [CLA-SIGNATORIES.md](CLA-SIGNATORIES.md) in a commit authored by you.
   CI fails pull requests whose author is not listed.
2. One pull request per cut, against `main`. No force pushes, no
   self-merge.
3. Every change under `src/**` adds an entry to `src/data/updates.ts` and
   raises the version — CI refuses the merge otherwise.
4. Run what CI runs before pushing:
   `npm run type-check && npm run lint && npm test && npm run build`.
   `npx prettier --write` every new file.
5. New code files carry the SPDX header
   (`SPDX-FileCopyrightText: 2026 Numen Games S.L.` +
   `SPDX-License-Identifier: AGPL-3.0-only`); files that cannot are
   declared in [REUSE.toml](REUSE.toml). Resolve a new dependency's licence
   from the registry before adding it; `license-check` inspects the built
   artifact and fails on violations — [LEGAL_DEBT.md](LEGAL_DEBT.md) is the
   only documented-exception path.
6. Assets (images, fonts, audio, data) need an explicit CC0 declaration in
   the PR and must not contain people, voices or personal data.
