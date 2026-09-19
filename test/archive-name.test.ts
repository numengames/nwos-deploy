// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: MIT
//
// The archive was numengames/numinia-nwos and is numengames/numinia-archive
// since 2026-09-17. GitHub redirects the old path today; the day someone
// creates a repository called numinia-nwos, the design-kit tarball that
// `npm ci` downloads and the links on the landing page land on a stranger's
// code. This test pins the two surfaces that fetch or link the archive.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Two halves, so this file does not match itself.
const OLD = ["numengames", "numinia-nwos"].join("/");
const NEW = "numengames/numinia-archive";

describe("the archive's name", () => {
	it("the design-kit tarball is fetched from numinia-archive", () => {
		const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
			dependencies: Record<string, string>;
		};
		const url = pkg.dependencies["@numengames/design-kit"];
		expect(url).toContain(`github.com/${NEW}/releases/download/`);
		expect(url).not.toContain(OLD);
	});

	it("the lockfile resolves the tarball from numinia-archive", () => {
		const lock = readFileSync("package-lock.json", "utf8");
		expect(lock).not.toContain(OLD);
	});

	it("the landing page links the archive by its current name", () => {
		const page = readFileSync("src/pages/index.astro", "utf8");
		expect(page).toContain(NEW);
		expect(page).not.toContain(OLD);
	});
});
