// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// SRE-03: structured logs (JSON), no loose console calls in shipped code.
// The Workers runtime streams stdout into observability; one line of JSON per
// event is queryable, a formatted string is not. This module holds the only
// sanctioned console call in the codebase.

/** Extra context attached to a log line. Keep keys stable: they are queried. */
export type LogFields = Record<string, unknown>;

type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, fields: LogFields = {}): void {
	// eslint-disable-next-line no-console
	console.log(
		JSON.stringify({
			level,
			event,
			time: new Date().toISOString(),
			...fields,
		}),
	);
}

export const log = {
	info: (event: string, fields?: LogFields) => emit("info", event, fields),
	warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
	error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/** The readable message of an unknown thrown value, without assuming Error. */
export function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return String(error);
}

/**
 * The HTTP status carried by a thrown value, when there is one — Octokit
 * attaches `status` to its request errors.
 */
export function errorStatus(error: unknown): number | undefined {
	if (typeof error === "object" && error !== null && "status" in error) {
		const status = (error as { status: unknown }).status;
		if (typeof status === "number") return status;
	}
	return undefined;
}
