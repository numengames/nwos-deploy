// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
	site: "https://nwos.numen.games",
	output: "static",
	// `platformProxy` se retiró en el adaptador v14: `astro dev` y
	// `astro preview` corren ya dentro del workerd real vía el plugin de Vite
	// de Cloudflare, así que los bindings se comportan como en producción sin
	// tener que pedirlo.
	adapter: cloudflare(),
	integrations: [react(), sitemap()],
	vite: {
		// Tailwind 4 se registra como plugin de Vite: @astrojs/tailwind fue
		// retirado aguas arriba y su peer range se detiene en Astro 5.
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			// scripts/license-check.mjs inspecciona los module paths del
			// artefacto vía sourcemaps (canon C-005 §5: contenido, nunca
			// comentarios). App AGPL: publicar los maps es coherente.
			sourcemap: true,
		},
	},
});
