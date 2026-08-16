// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
export type NavChild = {
  label: string;
  href: string;
  id: string;
};

export type NavItem =
  | { label: string; href: string; id: string; children?: never }
  | { label: string; href?: never; id: string; children: NavChild[] };

// El header ya enlaza "/" (logo) y "/velo" (Try NWOS) de forma fija;
// aquí solo van entradas adicionales.
export const navItems: NavItem[] = [];
