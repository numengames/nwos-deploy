// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// The house's social accounts, the same list on the four sites (a copy per
// repository, no shared package yet). GitHub is the organisation's;
// Discord is the Numinia server (invite verified 2026-10-03); X is added
// when the Oracle hands over the company URL. The two
// personal accounts that sat here until 2026-09-16 were a placeholder — a
// person's profile is not the house's address.
export interface SocialLink {
	readonly label: string;
	readonly href: string;
}

export const socialLinks: readonly SocialLink[] = [
	{ label: "GitHub", href: "https://github.com/numengames" },
	{ label: "Discord", href: "https://discord.gg/ASwwdd24pp" },
];
