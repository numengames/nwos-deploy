// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// Flat config. Every rule is an error, never a warning: CI is the authority
// (engineering-standards, Principle 1).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";

export default [
	{
		ignores: ["dist/**", ".astro/**", ".wrangler/**", ".vercel/**", "node_modules/**", "public/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...astro.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: {
			// SRE-03: structured logs, never console noise in shipped code.
			"no-console": "error",
			"no-debugger": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["**/*.tsx"],
		plugins: { "react-hooks": reactHooks },
		rules: reactHooks.configs.recommended.rules,
	},
	{
		// Build and CI scripts talk to the terminal: console is their output.
		files: ["scripts/**/*.mjs", "scripts/**/*.js"],
		rules: { "no-console": "off" },
	},
	{
		files: ["test/**/*.ts", "**/*.test.ts", "vitest.config.ts"],
		rules: { "@typescript-eslint/no-unused-vars": "off" },
	},
];
