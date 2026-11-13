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
	// The legal texts live once, on numinia.org (STD-037 SIT-005). The old
	// local routes keep answering with a permanent redirect so earlier links
	// (emails, the v0.18 changelog, indexed pages) do not 404.
	redirects: Object.fromEntries(
		// Astro emits both the bare and the trailing-slash route for each key.
		["privacy", "terms", "cookies", "notice"].map((slug) => [`/legal/${slug}`, { status: 301, destination: `https://numinia.org/legal/${slug}/` }]),
	),
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
