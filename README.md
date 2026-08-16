# NWOS — Narrative Work OS

Web de NWOS (Narrative Work OS) y del sistema operativo interno de Numinia / Numen Games. Extraída de [pablofm-web](https://github.com/PabloFMM/pablofm-web), donde vivió durante su fase de experimentación.

**URL**: https://nwos.numen.games

## Stack

- Astro 5 (`output: "static"` + adaptador Cloudflare Workers) con islas React 19
- Tailwind 3 + shadcn/ui, dark-only, tipografía Geist
- Sistema de diseño en `DESIGN.md`

## Desarrollo

Requiere Node ≥ 22.12.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
```

## Variables de entorno

Las rutas SSR (`/velo`, `/workspace/[slug]`, `/api/*`) necesitan las variables de `.env.example` (GitHub + Anthropic). Sin ellas, el resto del sitio funciona pero esas rutas devuelven 500.

- **`npm run dev`**: se leen del `.env` local (fallback) o de un `.dev.vars` (mismo formato `CLAVE=valor`).
- **`npm run preview`** (`wrangler dev`, emula el runtime de Workers): se leen solo de `.dev.vars`.
- **Producción (Cloudflare Workers)**: configúralas como secrets una a una:

  ```bash
  npx wrangler secret put GITHUB_ORG
  npx wrangler secret put GITHUB_TOKEN
  npx wrangler secret put GITHUB_TEMPLATE_REPO
  npx wrangler secret put ANTHROPIC_API_KEY
  ```

En runtime el código las lee de `locals.runtime.env` (ver `src/lib/env.ts`); `import.meta.env` solo funciona en desarrollo.

## Deploy

`npm run build` y después `npx wrangler deploy` (usa `wrangler.jsonc`: worker en `dist/_worker.js/index.js` + assets estáticos de `dist/`).

## Estructura

- `src/pages/` — rutas estáticas (misiones, decisiones, planos, reportes, archive…) y SSR (`velo`, `workspace/`, `api/`)
- `src/data/` — datos hardcodeados en TS; `missions.ts` carga misiones del repo `numengames/numinia-digital-agents` en build (checkout hermano o API de GitHub)
- El flujo de deploy NWOS: `/velo` → `POST /api/registro` → crea repo privado desde template, genera docs canon con Claude y se explora en `/workspace/[slug]`
