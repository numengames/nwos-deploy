// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
// Doble del binding `env` de `cloudflare:workers` para los tests.
//
// El módulo solo existe dentro de workerd; vitest corre en Node, así que
// `vitest.config.ts` lo apunta aquí por alias. El objeto es mutable y
// compartido: un test que necesite configurar el servidor escribe en él
// (ver test/registro-gate.test.ts), y el resto lo ve vacío, que es lo que
// debe ver — un servidor sin secretos.
export const env: Record<string, string> = {};
