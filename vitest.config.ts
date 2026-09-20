// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		include: ["test/**/*.test.ts"],
		// Coverage of the logic, printed with every `npm test` and in the CI
		// job summary. Pages and components (.astro, .tsx islands) are not
		// measured: no tool does that well; what a visitor sees is checked by
		// the build. No `thresholds` on purpose: while STD-015 is draft the
		// guard sees and does not bite (ENG-067). The threshold arrives when
		// the register goes active, pinned to the value measured then — a
		// ratchet, not a target.
		coverage: {
			enabled: true,
			provider: "v8",
			include: ["src/lib/**", "src/data/**", "src/pages/api/**", "scripts/**"],
			exclude: ["**/*.test.*", "**/*.d.ts"],
			reporter: ["text", "text-summary", "lcov"],
			reportsDirectory: ".coverage",
		},
	},
});
