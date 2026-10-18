# The organisation package (alpha)

What an organisation receives when it starts on NWOS: the package for
building an organisation with this operating system.

It is copied from **numinia.org** (`numengames/numinia-archive`), the first
organisation that runs on NWOS. What Numinia learns by living this way reaches
every client through this folder. The copy is duplicated on purpose: a product
ships whole.

## The three layers

| Layer | Folder | What it is | Who writes it |
|---|---|---|---|
| Templates | `templates/` | The moulds every document is made from: principle, standard, procedure, decision, mission, report, proposal, opportunity… and the agent's card (`templates/agent/`). | Copied from numinia.org |
| Base | `base/standards/`, `base/procedures/` | What holds for any European organisation: how documents are written and versioned, personal data, secrets, accessibility, money, sales, tenders and grants, how an agent works and when it asks a person. | Copied from numinia.org |
| Own | — | Brand, culture, products, story. | Each organisation, starting from the AI's drafts |

Every document travels. The choices made when the workspace is created
decide which ones arrive filled in and visible, and which ones arrive as
empty templates (not built yet).

## How it is updated

Never by hand. From the root of this repository, with a checkout of
numinia-archive beside it:

```bash
node scripts/sync-organisation.mjs ../numinia-archive
```

The script replaces `templates/` and `base/`, and rewrites `MANIFEST.json`:
the numinia.org commit it was copied from, each file with its layer, and each
file left at home with the reason. Only CC0-1.0 files travel. What is
Numinia's own (its brand, its world, its websites) is listed in the `OWN` list
inside the script. That list is where the alpha is shaped.

## Known in this alpha

- The documents still speak as Numinia: they name the Oracle, Numen Games and
  numinia.org. Turning them into a client's words, with Numinia's names as an
  optional layer, is the next step.
- `LEG-TEMPLATE` stays at home: Numen's legal texts are reserved.
- The generator (`src/pages/api/registro.ts`) does not read this folder yet. It
  still builds from `nwos-workspace-template`.
