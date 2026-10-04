// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only
//
// A minimal ZIP writer (STORE, no compression) for the Worker: enough to
// hand a visitor the public example as one file with no library and no
// network. Real workspaces are downloaded as GitHub's own archive; this
// only serves what the site holds itself. Format: PKWARE APPNOTE 6.3.x,
// local headers + central directory + end record, UTF-8 names (flag 0x800).

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

export function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
	readonly path: string;
	readonly content: string;
}

/** DOS date and time of the moment the archive is made (2-second resolution). */
function dosDateTime(d: Date): { date: number; time: number } {
	const date = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
	const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
	return { date, time };
}

export function makeZip(entries: readonly ZipEntry[], now: Date = new Date()): Uint8Array {
	const encoder = new TextEncoder();
	const { date, time } = dosDateTime(now);
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = encoder.encode(entry.path);
		const data = encoder.encode(entry.content);
		const crc = crc32(data);

		const local = new DataView(new ArrayBuffer(30 + name.length));
		local.setUint32(0, 0x04034b50, true);
		local.setUint16(4, 20, true); // version needed
		local.setUint16(6, 0x0800, true); // UTF-8 names
		local.setUint16(8, 0, true); // STORE
		local.setUint16(10, time, true);
		local.setUint16(12, date, true);
		local.setUint32(14, crc, true);
		local.setUint32(18, data.length, true);
		local.setUint32(22, data.length, true);
		local.setUint16(26, name.length, true);
		local.setUint16(28, 0, true);
		new Uint8Array(local.buffer).set(name, 30);

		const central = new DataView(new ArrayBuffer(46 + name.length));
		central.setUint32(0, 0x02014b50, true);
		central.setUint16(4, 20, true); // version made by
		central.setUint16(6, 20, true); // version needed
		central.setUint16(8, 0x0800, true);
		central.setUint16(10, 0, true);
		central.setUint16(12, time, true);
		central.setUint16(14, date, true);
		central.setUint32(16, crc, true);
		central.setUint32(20, data.length, true);
		central.setUint32(24, data.length, true);
		central.setUint16(28, name.length, true);
		central.setUint16(30, 0, true); // extra
		central.setUint16(32, 0, true); // comment
		central.setUint16(34, 0, true); // disk
		central.setUint16(36, 0, true); // internal attrs
		central.setUint32(38, 0, true); // external attrs
		central.setUint32(42, offset, true);
		new Uint8Array(central.buffer).set(name, 46);

		locals.push(new Uint8Array(local.buffer), data);
		centrals.push(new Uint8Array(central.buffer));
		offset += local.byteLength + data.length;
	}

	const centralSize = centrals.reduce((n, c) => n + c.length, 0);
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(4, 0, true);
	end.setUint16(6, 0, true);
	end.setUint16(8, entries.length, true);
	end.setUint16(10, entries.length, true);
	end.setUint32(12, centralSize, true);
	end.setUint32(16, offset, true);
	end.setUint16(20, 0, true);

	const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}
