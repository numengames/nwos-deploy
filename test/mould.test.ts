// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { parseMouldSpec } from "@/lib/mould";

// Cabecera real de nwos-workspace-template/REUSE.toml (main). Si el
// formato del molde cambia, este fixture debe cambiar con él.
const REAL_HEADER = `# REUSE.toml — nwos-workspace-template (the mould)
#
# Two objects live in this repository (C-005 §2.5):
#   A. The mould itself — Numen Games S.L. scaffolding, licensed MIT.
#   B. The artifact it emits — every file is copied verbatim into a client
#      workspace by GitHub's template-generate API.
#
# Mould-only artifacts, stripped by nwos-deploy after generation:
#   LICENSE, LICENSES/, REUSE.toml, TRADEMARKS.md, LEGAL_DEBT.md
# Renamed by nwos-deploy after generation:
#   LICENSE.client -> LICENSE (placeholders resolved)

version = 1

[[annotations]]
path = "**"
SPDX-License-Identifier = "MIT"
`;

describe("parseMouldSpec", () => {
  it("lee el spec real del molde: strip completo y rename", () => {
    expect(parseMouldSpec(REAL_HEADER)).toEqual({
      strip: ["LICENSE", "LICENSES", "REUSE.toml", "TRADEMARKS.md", "LEGAL_DEBT.md"],
      renameFrom: "LICENSE.client",
      renameTo: "LICENSE",
    });
  });

  it("admite la lista de strip repartida en varias líneas", () => {
    const spec = parseMouldSpec(
      "# Mould-only artifacts, stripped by nwos-deploy after generation:\n" +
        "#   LICENSE, LICENSES/\n" +
        "#   REUSE.toml\n" +
        "# Renamed by nwos-deploy after generation:\n" +
        "#   LICENSE.client -> LICENSE\n"
    );
    expect(spec?.strip).toEqual(["LICENSE", "LICENSES", "REUSE.toml"]);
  });

  it("excluye renameFrom del strip aunque el spec lo liste", () => {
    const spec = parseMouldSpec(
      "# Mould-only artifacts, stripped by nwos-deploy after generation:\n" +
        "#   LICENSE, LICENSE.client\n" +
        "# Renamed by nwos-deploy after generation:\n" +
        "#   LICENSE.client -> LICENSE\n"
    );
    expect(spec?.strip).toEqual(["LICENSE"]);
  });

  // Todos los casos incoherentes devuelven null: el deploy aborta en vez
  // de adivinar (fail closed).
  it("sin cabecera de spec → null", () => {
    expect(parseMouldSpec("version = 1\n[[annotations]]\npath = '**'")).toBeNull();
  });

  it("lista de strip vacía → null", () => {
    expect(
      parseMouldSpec(
        "# Mould-only artifacts, stripped by nwos-deploy after generation:\n" +
          "# Renamed by nwos-deploy after generation:\n" +
          "#   A -> B\n"
      )
    ).toBeNull();
  });

  it("sin par de rename → null", () => {
    expect(
      parseMouldSpec(
        "# Mould-only artifacts, stripped by nwos-deploy after generation:\n" +
          "#   X, Y\n" +
          "# Renamed by nwos-deploy after generation:\n" +
          "version = 1\n"
      )
    ).toBeNull();
  });

  it("rename a sí mismo → null", () => {
    expect(
      parseMouldSpec(
        "# Mould-only artifacts, stripped by nwos-deploy after generation:\n" +
          "#   X\n" +
          "# Renamed by nwos-deploy after generation:\n" +
          "#   LICENSE -> LICENSE\n"
      )
    ).toBeNull();
  });

  it("cadena vacía → null", () => {
    expect(parseMouldSpec("")).toBeNull();
  });
});
