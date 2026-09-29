// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The legal texts: verbatim copies of the archive's masters (see
// src/data/legal.ts). The frontmatter is the archive's record and is never
// rendered; the pages read only the title, version and date from it.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const legal = defineCollection({
	loader: glob({ pattern: "LEG-00*.md", base: "./src/content/legal" }),
});

export const collections = { legal };
