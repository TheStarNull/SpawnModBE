/**
 * A minimal, dependency-free ZIP archive writer.
 *
 * Minecraft packs are distributed as zip-based archives (`.mcpack` for a single
 * pack, `.mcaddon` for a bundle of packs). This module builds a valid ZIP using
 * Node's built-in `zlib.deflateRawSync` for the DEFLATE compression of each entry
 * and manual construction of the local file headers, central directory and end
 * of central directory records.
 *
 * It only supports *storing* (writing) files. Reading/extracting is not required
 * by the framework.
 */

import { deflateRawSync } from 'node:zlib';

import { crc32, normalizeZipPath } from './util.js';

/** A file to be placed inside the archive. */
export interface ZipEntry {
  /** The relative path inside the archive (forward slashes, no leading `./`). */
  path: string;
  /** The file contents. */
  data: Buffer;
}

const METHOD_DEFLATE = 8;
const VERSION_NEEDED = 20; // 2.0

/** Writes a fixed-size unsigned integer to `buf` at `offset` using `size` bytes. */
function writeUInt(buf: Buffer, value: number, offset: number, size: number): void {
  if (size === 4) buf.writeUInt32LE(value, offset);
  else if (size === 2) buf.writeUInt16LE(value, offset);
  else throw new Error(`Unsupported integer size: ${size}`);
}

/** Computes the DOS-style timestamp used by ZIP records. */
function dosDateTime(): { time: number; date: number } {
  const now = new Date();
  let year = now.getUTCFullYear();
  if (year < 1980) year = 1980;
  const date = ((year - 1980) << 9) | ((now.getUTCMonth() + 1) << 5) | now.getUTCDate();
  const time = (now.getUTCHours() << 11) | (now.getUTCMinutes() << 5) | (now.getUTCSeconds() >> 1);
  return { time, date };
}

/** Serializes the file name field, rejecting invalid/empty names. */
function nameField(rawPath: string): Buffer {
  const path = normalizeZipPath(rawPath);
  const name = Buffer.from(path, 'utf8');
  if (name.length > 0xffff) {
    throw new Error(`ZIP entry name too long: ${path}`);
  }
  return name;
}

/**
 * Builds a ZIP archive from the given entries.
 *
 * @param entries The files to include.
 * @returns A Buffer containing the complete ZIP archive.
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  const { time, date } = dosDateTime();
  let offset = 0;

  for (const entry of entries) {
    const name = nameField(entry.path);
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const compressedSize = compressed.length;

    // Local file header (30 bytes + name).
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    writeUInt(local, VERSION_NEEDED, 4, 2);
    local.writeUInt16LE(0x0800, 6); // UTF-8 flag (general purpose bit 11)
    writeUInt(local, METHOD_DEFLATE, 8, 2);
    writeUInt(local, time, 10, 2);
    writeUInt(local, date, 12, 2);
    writeUInt(local, crc, 14, 4);
    writeUInt(local, compressedSize, 18, 4);
    writeUInt(local, size, 22, 4);
    writeUInt(local, name.length, 26, 2);
    writeUInt(local, 0, 28, 2); // extra field length
    parts.push(local, name, compressed);

    // Central directory record (46 bytes + name).
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); // central directory signature
    writeUInt(record, 0x0314, 4, 2); // version made by (unix, 2.0)
    writeUInt(record, VERSION_NEEDED, 6, 2);
    writeUInt(record, 0x0800, 8, 2);
    writeUInt(record, METHOD_DEFLATE, 10, 2);
    writeUInt(record, time, 12, 2);
    writeUInt(record, date, 14, 2);
    writeUInt(record, crc, 16, 4);
    writeUInt(record, compressedSize, 20, 4);
    writeUInt(record, size, 24, 4);
    writeUInt(record, name.length, 28, 2);
    writeUInt(record, 0, 30, 2); // extra len
    writeUInt(record, 0, 32, 2); // comment len
    writeUInt(record, 0, 34, 2); // disk number
    writeUInt(record, 0, 36, 2); // internal attrs
    writeUInt(record, 0x81a4, 38, 4); // external attrs (0644 regular file)
    writeUInt(record, offset, 42, 4); // local header offset
    central.push(record, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const centralOffset = offset;

  // End of central directory record (22 bytes).
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  writeUInt(end, 0, 4, 2); // disk number
  writeUInt(end, 0, 6, 2); // disk with central dir
  writeUInt(end, entries.length, 8, 2);
  writeUInt(end, entries.length, 10, 2);
  writeUInt(end, centralSize, 12, 4);
  writeUInt(end, centralOffset, 16, 4);
  writeUInt(end, 0, 20, 2); // comment length

  return Buffer.concat([...parts, ...central, end]);
}

/** Builds a ZIP archive from an array of `[path, Buffer]` pairs. */
export function buildZip(files: Array<[string, Buffer]>): Buffer {
  return createZip(files.map(([path, data]) => ({ path, data })));
}
