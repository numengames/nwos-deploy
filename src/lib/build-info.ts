// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// What the footer says about itself: which version and which commit of the
// service you are looking at. Same contract as the other three sites: the
// version is the newest entry of src/data/updates.ts (the one place the
// number is maintained); the SHA is WORKERS_CI_COMMIT_SHA, injected by
// Workers Builds, or "dev" outside CI.
import { CURRENT_VERSION } from "../data/updates";

export const VERSION: string = CURRENT_VERSION;

export const COMMIT_SHA: string = (() => {
	const sha = import.meta.env.WORKERS_CI_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA ?? "";
	return sha ? sha.slice(0, 7) : "dev";
})();

export const HAS_SHA: boolean = COMMIT_SHA !== "dev";

export const REPO_URL = "https://github.com/numengames/nwos-deploy";

export const COMMIT_URL: string | null = HAS_SHA ? `${REPO_URL}/commit/${COMMIT_SHA}` : null;

/** The licence is not one: REUSE.toml assigns it per path. Link the map. */
export const LICENSE_URL = `${REPO_URL}/blob/main/REUSE.toml`;
