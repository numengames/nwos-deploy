// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The paid trial — the one place its terms live. Every workspace costs the
// house an AI model's work, so the trial is sold: 29 EUR with VAT, one
// payment, one workspace; deducted from a later NWOS contract; refunded in
// full (by hand) if generation fails. The form and the route read it here.
//
// `link` is the processor's payment link an Oracle creates (PRO-020 step 5).
// A payment link is not a key. Empty means nothing is on sale: the form
// shows "Coming soon" and /api/registro refuses every deploy.

export interface Trial {
	/** Price with VAT, in whole euros. */
	readonly priceEur: number;
	readonly currency: "eur";
	/** https://buy.stripe.com/… — empty until an Oracle creates it. */
	readonly link: string;
}

export const TRIAL: Trial = {
	priceEur: 29,
	currency: "eur",
	link: "",
};

/** On sale only with an https payment link. */
export function trialOnSale(trial: Trial = TRIAL): boolean {
	return /^https:\/\/\S+$/.test(trial.link);
}

/** The organisation's name as the processor's client_reference_id allows
 *  it (letters, digits, - and _, at most 200): base64url of its UTF-8. The
 *  name travels with the payment, so the browser keeps nothing meanwhile. */
export function encodeReference(companyName: string): string {
	let bin = "";
	for (const b of new TextEncoder().encode(companyName)) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeReference(reference: string): string | null {
	if (!/^[A-Za-z0-9_-]{1,200}$/.test(reference)) return null;
	try {
		const bin = atob(reference.replace(/-/g, "+").replace(/_/g, "/"));
		return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
	} catch {
		return null;
	}
}

/** The link with the buyer's email and organisation carried to the processor. */
export function paymentUrl(trial: Trial, email: string, reference: string): string {
	const url = new URL(trial.link);
	url.searchParams.set("prefilled_email", email);
	url.searchParams.set("client_reference_id", reference);
	return url.toString();
}
