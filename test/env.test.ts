// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// getEnv() — de dónde salen los secretos del Worker.
//
// Hasta el adaptador @astrojs/cloudflare v12 se leían de
// `Astro.locals.runtime.env`. En v14 ese acceso ya no está deprecado: el
// adaptador define un getter que LANZA, y la fuente pasa a ser el binding
// `env` de `cloudflare:workers`. El fallo que estos tests fijan es silencioso
// en toda la suite de rutas — sus casos comprueban rechazos, y un servidor
// sin configuración rechaza exactamente igual que un getEnv roto. Sin este
// fichero, cambiar getEnv() por `return {}` deja los 65 tests en verde y
// rompe /api/registro en producción (comprobado con esa mutación).
import { afterEach, describe, expect, it } from "vitest";
import { env as workerEnv } from "cloudflare:workers";
import { getEnv } from "@/lib/env";

function setEnv(env: Record<string, string> = {}) {
	const binding = workerEnv as unknown as Record<string, string>;
	for (const key of Object.keys(binding)) delete binding[key];
	Object.assign(binding, env);
}

afterEach(() => setEnv());

describe("getEnv reads the Worker's `env` binding", () => {
	it("every declared secret comes from the binding", () => {
		setEnv({
			GITHUB_ORG: "numengames",
			GITHUB_TOKEN: "ghp_x",
			GITHUB_TEMPLATE_REPO: "nwos-workspace-template",
			ANTHROPIC_API_KEY: "sk-ant-x",
			WORKSPACE_KEY_SECRET: "hmac",
		});
		expect(getEnv()).toEqual({
			GITHUB_ORG: "numengames",
			GITHUB_TOKEN: "ghp_x",
			GITHUB_TEMPLATE_REPO: "nwos-workspace-template",
			ANTHROPIC_API_KEY: "sk-ant-x",
			WORKSPACE_KEY_SECRET: "hmac",
		});
	});

	it("an unset binding is the empty string, never undefined — the routes test the keys with `!key`", () => {
		setEnv({ GITHUB_ORG: "numengames" });
		const env = getEnv();
		expect(env.GITHUB_ORG).toBe("numengames");
		expect(env.GITHUB_TOKEN).toBe("");
		expect(env.ANTHROPIC_API_KEY).toBe("");
	});

	it("WORKSPACE_KEY_SECRET is the one that may be absent: undefined, so token.ts derives it", () => {
		setEnv({ GITHUB_TOKEN: "ghp_x" });
		expect(getEnv().WORKSPACE_KEY_SECRET).toBeUndefined();
	});
});
