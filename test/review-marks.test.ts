// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The viewer lifts the model's review marks out of HTML comments by
// position — never with a `<!--…-->` regex, which CodeQL rejects as an
// incomplete sanitization — and drops every other comment whole.
import { describe, expect, it } from "vitest";
import { liftReviewMarks } from "@/components/WorkspaceViewer";

describe("liftReviewMarks", () => {
	it("keeps a bare NEEDS REVIEW as a badge token", () => {
		expect(liftReviewMarks("text <!-- NEEDS REVIEW --> more")).toBe("text %%NEEDS_REVIEW%% more");
	});

	it("keeps the note of 'NEEDS REVIEW: why', whitespace folded", () => {
		expect(liftReviewMarks("a\n<!-- NEEDS REVIEW: the five\n   values were inferred. -->\nb")).toBe("a\n%%REVIEW_NOTE%%the five values were inferred.%%/REVIEW_NOTE%%\nb");
	});

	it("drops every other comment, including nested-looking ones, and leaves no <!-- behind", () => {
		const out = liftReviewMarks("x <!-- hidden --> y <!-<!-- tricky --> z <!-- a <!-- b --> c");
		expect(out).not.toContain("<!--");
		expect(out).toBe("x  y <!- z  c");
	});

	it("an unclosed comment is dropped to the end", () => {
		expect(liftReviewMarks("keep <!-- never closed")).toBe("keep ");
	});

	it("is case-insensitive on the mark and leaves plain text alone", () => {
		expect(liftReviewMarks("<!--needs review-->")).toBe("%%NEEDS_REVIEW%%");
		expect(liftReviewMarks("no comments here")).toBe("no comments here");
	});
});
