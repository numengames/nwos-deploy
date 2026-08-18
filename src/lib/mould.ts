// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// El REUSE.toml del molde declara en su cabecera, como spec legible por
// máquina, qué artefactos son solo del molde (y se retiran del repo
// generado) y qué archivo se renombra a LICENSE. Se lee del repo generado
// en cada deploy: dos fuentes de verdad para el mismo hecho es como un
// artefacto nuevo del molde (LEGAL_DEBT.md) llegó a heredarse. Formato:
//
//   # Mould-only artifacts, stripped by nwos-deploy after generation:
//   #   LICENSE, LICENSES/, REUSE.toml, TRADEMARKS.md, LEGAL_DEBT.md
//   # Renamed by nwos-deploy after generation:
//   #   LICENSE.client -> LICENSE (placeholders resolved)

export interface MouldSpec {
	strip: string[];
	renameFrom: string;
	renameTo: string;
}

// Devuelve null si el spec no aparece o no es coherente: el deploy debe
// abortar, nunca adivinar una lista.
export function parseMouldSpec(reuseToml: string): MouldSpec | null {
	const lines = reuseToml.split("\n").map((line) => line.replace(/^#\s?/, "").trim());

	const stripIdx = lines.findIndex((line) => line.startsWith("Mould-only artifacts, stripped by nwos-deploy"));
	const renameIdx = lines.findIndex((line) => line.startsWith("Renamed by nwos-deploy"));
	if (stripIdx === -1 || renameIdx === -1) return null;

	const strip: string[] = [];
	for (let i = stripIdx + 1; i < renameIdx; i++) {
		strip.push(
			...lines[i]
				.split(",")
				.map((entry) => entry.trim().replace(/\/$/, ""))
				.filter(Boolean),
		);
	}

	const rename = lines[renameIdx + 1]?.match(/^(\S+)\s*->\s*(\S+)/);
	if (!rename || strip.length === 0) return null;
	const [, renameFrom, renameTo] = rename;
	if (renameFrom === renameTo) return null;

	return {
		// Defensivo: el archivo a renombrar nunca forma parte del strip.
		strip: strip.filter((path) => path !== renameFrom),
		renameFrom,
		renameTo,
	};
}
