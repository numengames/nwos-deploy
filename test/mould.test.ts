// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { buildInstallTree, parseMouldSpec } from "@/lib/mould";

// Cabecera real de nwos-workspace-template/REUSE.toml (main). Si el
// formato del molde cambia, este fixture debe cambiar con él.
const REAL_HEADER = `# REUSE.toml — nwos-workspace-template (the mould)
#
# Two objects live in this repository (C-005 §2.5):
#   A. The mould itself — Numen Games S.L. scaffolding, licensed MIT.
#   B. The artifact it emits — every file is copied verbatim into a client
#      workspace by GitHub's template-generate API.
#
# Mould-only artifacts, stripped by nwos-deploy after generation:
#   LICENSE, LICENSES/, REUSE.toml, TRADEMARKS.md, LEGAL_DEBT.md
# Renamed by nwos-deploy after generation:
#   LICENSE.client -> LICENSE (placeholders resolved)

version = 1

[[annotations]]
path = "**"
SPDX-License-Identifier = "MIT"
`;

describe("parseMouldSpec", () => {
	it("lee el spec real del molde: strip completo y rename", () => {
		expect(parseMouldSpec(REAL_HEADER)).toEqual({
			strip: ["LICENSE", "LICENSES", "REUSE.toml", "TRADEMARKS.md", "LEGAL_DEBT.md"],
			renameFrom: "LICENSE.client",
			renameTo: "LICENSE",
		});
	});

	it("admite la lista de strip repartida en varias líneas", () => {
		const spec = parseMouldSpec("# Mould-only artifacts, stripped by nwos-deploy after generation:\n" + "#   LICENSE, LICENSES/\n" + "#   REUSE.toml\n" + "# Renamed by nwos-deploy after generation:\n" + "#   LICENSE.client -> LICENSE\n");
		expect(spec?.strip).toEqual(["LICENSE", "LICENSES", "REUSE.toml"]);
	});

	it("excluye renameFrom del strip aunque el spec lo liste", () => {
		const spec = parseMouldSpec("# Mould-only artifacts, stripped by nwos-deploy after generation:\n" + "#   LICENSE, LICENSE.client\n" + "# Renamed by nwos-deploy after generation:\n" + "#   LICENSE.client -> LICENSE\n");
		expect(spec?.strip).toEqual(["LICENSE"]);
	});

	// Todos los casos incoherentes devuelven null: el deploy aborta en vez
	// de adivinar (fail closed).
	it("sin cabecera de spec → null", () => {
		expect(parseMouldSpec("version = 1\n[[annotations]]\npath = '**'")).toBeNull();
	});

	it("lista de strip vacía → null", () => {
		expect(parseMouldSpec("# Mould-only artifacts, stripped by nwos-deploy after generation:\n" + "# Renamed by nwos-deploy after generation:\n" + "#   A -> B\n")).toBeNull();
	});

	it("sin par de rename → null", () => {
		expect(parseMouldSpec("# Mould-only artifacts, stripped by nwos-deploy after generation:\n" + "#   X, Y\n" + "# Renamed by nwos-deploy after generation:\n" + "version = 1\n")).toBeNull();
	});

	it("rename a sí mismo → null", () => {
		expect(parseMouldSpec("# Mould-only artifacts, stripped by nwos-deploy after generation:\n" + "#   X\n" + "# Renamed by nwos-deploy after generation:\n" + "#   LICENSE -> LICENSE\n")).toBeNull();
	});

	it("cadena vacía → null", () => {
		expect(parseMouldSpec("")).toBeNull();
	});
});

describe("buildInstallTree", () => {
	const spec = {
		strip: ["LICENSE", "LICENSES", "REUSE.toml", ".github", "tests"],
		renameFrom: "LICENSE.client",
		renameTo: "LICENSE",
	};
	const head = [
		{ path: "README.md", mode: "100644", type: "blob", sha: "a1" },
		{ path: "LICENSE", mode: "100644", type: "blob", sha: "a2" },
		{ path: "LICENSE.client", mode: "100644", type: "blob", sha: "a3" },
		{ path: "LICENSES", mode: "040000", type: "tree", sha: "a4" },
		{ path: "LICENSES/MIT.txt", mode: "100644", type: "blob", sha: "a5" },
		{ path: ".github", mode: "040000", type: "tree", sha: "a6" },
		{ path: ".github/workflows/ci.yml", mode: "100644", type: "blob", sha: "a7" },
		{ path: "canon", mode: "040000", type: "tree", sha: "a8" },
		{ path: "canon/C-001.md", mode: "100644", type: "blob", sha: "a9" },
		{ path: "vendored", mode: "160000", type: "commit", sha: "s1" },
	];

	it("retira los artefactos del spec por ruta exacta y por prefijo de directorio", () => {
		const tree = buildInstallTree(head, spec, "prov");
		const paths = tree.map((e) => e.path);
		expect(paths).not.toContain("LICENSES/MIT.txt");
		expect(paths).not.toContain(".github/workflows/ci.yml");
		expect(paths).toContain("canon/C-001.md");
	});

	it("no confunde prefijo de directorio con prefijo de nombre", () => {
		const tree = buildInstallTree([...head, { path: "LICENSES-INDEX.md", mode: "100644", type: "blob", sha: "b1" }], spec, "prov");
		expect(tree.map((e) => e.path)).toContain("LICENSES-INDEX.md");
	});

	it("renombra renameFrom conservando su blob personalizado y añade PROVENANCE.md", () => {
		const tree = buildInstallTree(head, spec, "prov");
		expect(tree.map((e) => e.path)).not.toContain("LICENSE.client");
		expect(tree.find((e) => e.path === "LICENSE")).toMatchObject({ sha: "a3", type: "blob" });
		expect(tree.find((e) => e.path === "PROVENANCE.md")).toMatchObject({ content: "prov" });
	});

	it("omite las entradas de directorio y conserva submódulos no afectados", () => {
		const tree = buildInstallTree(head, spec, "prov");
		expect(tree.some((e) => e.type === "tree")).toBe(false);
		expect(tree.find((e) => e.path === "vendored")).toMatchObject({ type: "commit", sha: "s1" });
	});

	it("lanza si renameFrom no está en HEAD: el deploy debe abortar", () => {
		expect(() => buildInstallTree([{ path: "README.md", mode: "100644", type: "blob", sha: "a1" }], spec, "prov")).toThrow(/LICENSE\.client/);
	});
});
