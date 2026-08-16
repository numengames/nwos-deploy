// En el runtime de Cloudflare Workers los secrets solo existen en
// locals.runtime.env; import.meta.env queda como fallback para que
// `npm run dev` siga leyendo el .env local. Con platformProxy activado
// locals.runtime.env existe también en dev (vacío), así que el fallback
// tiene que ser por clave, no por objeto.
export function getEnv(locals: App.Locals): Env {
	const runtime = (locals.runtime?.env ?? {}) as Partial<Env>;
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
