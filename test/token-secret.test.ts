// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The signing secret of the workspace keys is its own secret. Audit
// 2026-10-02: falling back to GITHUB_TOKEN tied a viewer key to the
// credential that can write the whole organisation, and kept working
// silently when the dedicated secret was never set. Fail closed instead.
import { describe, expect, it } from "vitest";
import { keySecret } from "@/lib/token";

const base = { GITHUB_ORG: "org", GITHUB_TOKEN: "ghp_x", GITHUB_TEMPLATE_REPO: "tpl", ANTHROPIC_API_KEY: "a", STRIPE_RESTRICTED_KEY: "s" };

describe("keySecret", () => {
	it("returns WORKSPACE_KEY_SECRET when set", () => {
		expect(keySecret({ ...base, WORKSPACE_KEY_SECRET: "wks" })).toBe("wks");
	});

	it("never falls back to GITHUB_TOKEN: no dedicated secret → null", () => {
		expect(keySecret({ ...base })).toBeNull();
		expect(keySecret({ ...base, WORKSPACE_KEY_SECRET: "" })).toBeNull();
	});
});
