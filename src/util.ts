/**
 * Small shared utilities used across the framework.
 */

/** Computes the standard CRC-32 of `buf` (returned as an unsigned 32-bit int). */
export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Sanitizes a name so it can be used as a folder/file name.
 * Keeps letters, digits, CJK characters, `.`, `-`, `_`; other characters become `_`.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').replace(/\s+/g, '_');
  const trimmed = cleaned.replace(/^_+|_+$/g, '');
  return trimmed.length > 0 ? trimmed : 'pack';
}

/**
 * Normalizes a relative path for use inside a ZIP / pack.
 * - Uses forward slashes.
 * - Strips leading `./` and `/`.
 * - Collapses duplicate slashes.
 * - Rejects paths escaping the archive via `..`.
 */
export function normalizeZipPath(p: string): string {
  let out = p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  const segments = out.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error(`Path escapes the archive root: ${p}`);
    }
  }
  if (out.length === 0) {
    throw new Error('Empty path is not allowed in a pack.');
  }
  return out;
}