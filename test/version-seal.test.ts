// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// version-seal writes dist/client/version.json at build time
// (scripts/version-seal.mjs, run as postbuild); these tests cover its pure
// functions without needing a real build.
import { describe, expect, it } from "vitest";
import { currentVersionFrom, sealBody } from "../scripts/version-seal.mjs";

describe("currentVersionFrom", () => {
	it("reads the newest version entry, same pattern as check-version-bump.mjs", () => {
		const source = `export const UPDATES = [\n\t{\n\t\tversion: "v0.18.0",\n\t\tdate: "2026-10-18",\n\t},\n\t{\n\t\tversion: "v0.17.0",\n\t\tdate: "2026-10-04",\n\t},\n];\n`;
		expect(currentVersionFrom(source)).toBe("v0.18.0");
	});

	it("returns null when the file has no version entry", () => {
		expect(currentVersionFrom("export const UPDATES = [];\n")).toBeNull();
	});
});

describe("sealBody", () => {
	it("names the live commit, the version and when it was built", () => {
		const body = sealBody("abc1234567890abc1234567890abc1234567890", "v0.18.0", "2026-10-18T12:00:00.000Z");
		expect(body).toEqual({
			commit: "abc1234567890abc1234567890abc1234567890",
			version: "v0.18.0",
			builtAt: "2026-10-18T12:00:00.000Z",
		});
	});

	it('falls back to "dev" outside Workers Builds (WORKERS_CI_COMMIT_SHA unset)', () => {
		const body = sealBody(undefined, "v0.18.0", "2026-10-18T12:00:00.000Z");
		expect(body.commit).toBe("dev");
	});
});
