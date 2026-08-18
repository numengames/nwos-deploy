// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { signWorkspaceKey, verifyWorkspaceKey } from "@/lib/token";

describe("workspace access keys (HMAC)", () => {
  it("firma determinista: mismo slug y secreto → misma clave", async () => {
    const a = await signWorkspaceKey("acme", "secret-1");
    const b = await signWorkspaceKey("acme", "secret-1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cambia con el slug y con el secreto", async () => {
    const base = await signWorkspaceKey("acme", "secret-1");
    expect(await signWorkspaceKey("acme2", "secret-1")).not.toBe(base);
    expect(await signWorkspaceKey("acme", "secret-2")).not.toBe(base);
  });

  it("verify acepta la clave correcta y rechaza el resto", async () => {
    const key = await signWorkspaceKey("acme", "secret-1");
    expect(await verifyWorkspaceKey("acme", key, "secret-1")).toBe(true);
    expect(await verifyWorkspaceKey("acme", null, "secret-1")).toBe(false);
    expect(await verifyWorkspaceKey("acme", "", "secret-1")).toBe(false);
    expect(await verifyWorkspaceKey("acme", key.slice(0, -1) + "0", "secret-1")).toBe(false);
    expect(await verifyWorkspaceKey("otro", key, "secret-1")).toBe(false);
  });
});
