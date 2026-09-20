// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Coverage is measured and published; it does not bite. Measured on
// 2026-09-19 before this test: the logic of the service (src/lib, src/data,
// src/pages/api, scripts) stood at 15 % and nothing said so — registro.ts,
// the 467 lines that create a client's workspace, at 6 %. This test pins
// that `npm test` measures coverage of the logic and that there is no
// threshold: while STD-015 is draft the guard sees and does not bite
// (ENG-067). The threshold arrives when the register goes active, pinned
// to the value measured then.
import { describe, expect, it } from "vitest";
import config from "../vitest.config";

const coverage = (config as { test?: { coverage?: Record<string, unknown> } }).test?.coverage;

describe("coverage is seen, not enforced", () => {
	it("npm test measures coverage of the logic", () => {
		expect(coverage).toBeDefined();
		expect(coverage?.enabled).toBe(true);
		expect(coverage?.provider).toBe("v8");
		const include = coverage?.include as string[] | undefined;
		expect(include).toEqual(expect.arrayContaining(["src/lib/**", "src/data/**", "src/pages/api/**", "scripts/**"]));
	});

	it("publishes a readable summary in the log and an lcov for tools", () => {
		const reporter = coverage?.reporter as string[] | undefined;
		expect(reporter).toEqual(expect.arrayContaining(["text", "text-summary", "lcov"]));
	});

	it("has no threshold: sees, does not bite (STD-015 draft, ENG-067)", () => {
		expect(coverage?.thresholds).toBeUndefined();
	});
});
