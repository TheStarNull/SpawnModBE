/**
 * Static assets bundled with the framework.
 *
 * Minecraft packs use a `pack_icon.png` at the pack root. This module provides a
 * small, valid, generated PNG placeholder so that generated packs always have a
 * usable icon even if the caller does not supply one.
 */

import { deflateSync } from 'node:zlib';

import { crc32 } from './util.js';

/** A tiny 1x1 (transparent) PNG. */
const TRANSPARENT_1x1_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000001849444154789c6360f89f808101809391f1ff3f030000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex'
);

/**
 * Builds a small square PNG whose pixels are a solid `color`.
 * @param size The width/height of the icon in pixels.
 * @param color An `[r, g, b]` tuple (0-255) used as the fill color.
 * @returns A valid PNG `Buffer`.
 */
export function buildIconPng(size: number, color: [number, number, number]): Buffer {
  const [r, g, b] = color;
  const channels = 4;
  const stride = size * channels + 1; // +1 for the filter byte at each row start.
  const raw = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const offset = rowStart + 1 + x * channels;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = 255;
    }
  }

  const compressed = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const png = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}



/**
 * The default pack icon: a 128x128 solid emerald-green square. Used when a pack
 * is generated without an explicit icon.
 */
export const DEFAULT_PACK_ICON: Buffer = buildIconPng(128, [80, 196, 120]);

/** The transparent 1x1 PNG, useful as an "empty" fallback. */
export const EMPTY_PACK_ICON: Buffer = TRANSPARENT_1x1_PNG;
