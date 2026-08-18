## What

<!-- One or two sentences. -->

## Why

<!-- The reason, not the mechanism. Link the issue or mission (MIS-XXX). -->

## How to verify

<!-- The steps a reviewer follows. Screenshots for visual changes. -->

## Definition of Done

- [ ] `npm run type-check && npm run lint && npm test && npm run build` pass locally
- [ ] Conventional commit messages; practice IDs referenced where they apply
- [ ] CLA signed (`CLA-SIGNATORIES.md`) — this repo ships AGPL code
- [ ] Licensing untouched, or the change is signed off by the Oracle (C-005)
- [ ] Visual changes follow the Design System v5.0.0: canonical tokens only, Geist/Geist Mono, spacing on the 4 scale, motion from the §10.1 catalogue
- [ ] Accessibility: contrast AA, focus visible, nothing by colour alone, `prefers-reduced-motion` respected
- [ ] No secrets, no loose `console.*` (use `src/lib/log.ts`), no new dependency with an unresolved licence
- [ ] Docs updated (`README.md`, `CLAUDE.md`, `.env.example`) if setup or behaviour changed
