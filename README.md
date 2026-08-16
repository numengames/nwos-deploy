# NWOS — Narrative Work OS

Servicio de despliegue de NWOS (Narrative Work OS): landing del producto y generación de workspaces de organización desde `nwos-workspace-template`. El visor de Numinia que vivía aquí se extrajo a `numengames/numinia-nwos` (rama `merge-viewer`).

**URL**: https://nwos.numen.games

## Stack

- Astro 5 (`output: "static"` + adaptador Cloudflare Workers) con islas React 19
- Tailwind 3, dark-only, tipografía Geist
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

- `src/pages/` — `/` (landing estática), `/velo` y `/workspace/[slug]` (SSR) y las rutas API bajo `api/`
- El flujo de deploy NWOS: `/velo` → `POST /api/registro` → crea repo privado desde `nwos-workspace-template`, genera docs canon con Claude y se explora en `/workspace/[slug]?key=<hmac>`
