// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// Was this workspace paid for? Asked of the processor, never of the browser.
//
// The payment link sends the buyer back with the Checkout Session's id. The
// id alone proves nothing: the server reads the session with a restricted
// key (Checkout Sessions: read, nothing else) and accepts it only when it
// is complete and paid for the trial's amount and currency. The session
// carries the organisation's name (client_reference_id, set by the form
// before paying) and the payer's email: the workspace is built from those,
// not from anything the browser sends back. The model is called only after
// this says yes (OPS-015 §2).

import { decodeReference, type Trial } from "@/data/trial";

export const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

/** The part of a Checkout Session this check reads. */
interface CheckoutSession {
	id?: string;
	status?: string;
	payment_status?: string;
	amount_total?: number | null;
	currency?: string | null;
	client_reference_id?: string | null;
	customer_details?: { email?: string | null } | null;
	customer_email?: string | null;
}

export type PaymentCheck = { ok: true; companyName: string; email: string } | { ok: false; reason: string };

export async function checkPaidSession(sessionId: string, trial: Trial, stripeKey: string, fetchImpl: typeof fetch = fetch): Promise<PaymentCheck> {
	if (!SESSION_ID_RE.test(sessionId)) return { ok: false, reason: "malformed session id" };

	const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
		headers: { Authorization: `Bearer ${stripeKey}` },
	});
	if (res.status === 404) return { ok: false, reason: "no such session" };
	if (!res.ok) throw new Error(`processor answered ${res.status}`);

	const s = (await res.json()) as CheckoutSession;
	if (s.status !== "complete") return { ok: false, reason: `session ${s.status ?? "unknown"}` };
	if (s.payment_status !== "paid") return { ok: false, reason: `payment ${s.payment_status ?? "unknown"}` };
	if (s.currency !== trial.currency) return { ok: false, reason: "wrong currency" };
	if (s.amount_total !== trial.priceEur * 100) return { ok: false, reason: "wrong amount" };
	const companyName = s.client_reference_id ? decodeReference(s.client_reference_id) : null;
	if (!companyName) return { ok: false, reason: "no organisation on the payment" };
	const email = s.customer_details?.email || s.customer_email || "";
	if (!email) return { ok: false, reason: "no email on the payment" };
	return { ok: true, companyName, email };
}
