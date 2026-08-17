// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { sanitize } from "@/pages/api/registro";

describe("sanitize (companyName → slug de repo)", () => {
  it("minúsculas, espacios y símbolos a guiones, sin extremos", () => {
    expect(sanitize("NWOS E2E Test Aug17")).toBe("nwos-e2e-test-aug17");
    expect(sanitize("Acme, S.L.")).toBe("acme-s-l");
    expect(sanitize("  --Trim--  ")).toBe("trim");
  });

  it("colapsa secuencias de caracteres no válidos en un solo guion", () => {
    expect(sanitize("a  &  b")).toBe("a-b");
  });

  it("nombre sin alfanuméricos → cadena vacía (lo rechaza la ruta)", () => {
    expect(sanitize("¡¡¡···!!!")).toBe("");
  });
});
