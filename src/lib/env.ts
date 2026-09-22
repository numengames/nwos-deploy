// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// En el runtime de Cloudflare Workers los secrets solo existen en el binding
// `env` del módulo `cloudflare:workers`. Hasta el adaptador v13 se leían de
// `Astro.locals.runtime.env`; ese acceso ya no está deprecado, LANZA — el
// adaptador define un getter que tira un Error explicando el reemplazo, así
// que dejarlo era un 500 en la primera petición real a /api/registro.
//
// `import.meta.env` queda como fallback para que `npm run dev` siga leyendo
// el .env local. El binding existe también en dev (vacío), así que el
// fallback tiene que ser por clave, no por objeto.
import { env as runtimeEnv } from "cloudflare:workers";

export function getEnv(): Env {
	const runtime = (runtimeEnv ?? {}) as Partial<Env>;
	const local = import.meta.env as unknown as Partial<Env>;
	const pick = (key: keyof Env) => runtime[key] || local[key] || "";
	return {
		GITHUB_ORG: pick("GITHUB_ORG"),
		GITHUB_TOKEN: pick("GITHUB_TOKEN"),
		GITHUB_TEMPLATE_REPO: pick("GITHUB_TEMPLATE_REPO"),
		ANTHROPIC_API_KEY: pick("ANTHROPIC_API_KEY"),
		WORKSPACE_KEY_SECRET: pick("WORKSPACE_KEY_SECRET") || undefined,
	};
}
