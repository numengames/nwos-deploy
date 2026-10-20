// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// /version.json — the build's identity stamp (see src/pages/version.json.ts
// for why it exists). This test is the local half of the contract: the
// live half is `curl -s https://nwos.numen.games/version.json` compared
// against main's HEAD.
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/pages/version.json";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("/version.json", () => {
	it("answers with a commit and a build timestamp, never a value from the request", async () => {
		const response = GET();
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("application/json");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const body = (await response.json()) as { commit: string; builtAt: string };
		expect(typeof body.commit).toBe("string");
		expect(() => new Date(body.builtAt).toISOString()).not.toThrow();
	});

	it('falls back to "local" outside CI, never throwing or printing undefined', async () => {
		vi.stubEnv("WORKERS_CI_COMMIT_SHA", "");
		const body = (await GET().json()) as { commit: string };
		expect(body.commit).toBe("local");
	});

	it("carries the injected commit when Workers Builds sets one", async () => {
		vi.stubEnv("WORKERS_CI_COMMIT_SHA", "cafef00dcafef00dcafef00dcafef00dcafef00d");
		const body = (await GET().json()) as { commit: string };
		expect(body.commit).toBe("cafef00dcafef00dcafef00dcafef00dcafef00d");
	});
});
