/**
 * The `Structure` class — a behavior-pack structure (`.mcstructure`) generator.
 *
 * A `.mcstructure` file is a little-endian NBT document (NOT gzipped) that maps
 * a block palette to a grid of palette indices. Structures live in the behavior
 * pack at `structures/<namespace>/<name>.mcstructure` and are referenced by a
 * `minecraft:structure_template_feature` via their `namespace:name`.
 */

const COMPABILITY_VERSION = 17959425;

/** Writes a UTF-8 string with a little-endian length prefix. */
function writeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const len = Buffer.alloc(2);
  len.writeUInt16LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

/** Writes a little-endian 32-bit integer. */
function writeInt(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeInt32LE(value);
  return b;
}

/** Writes a named tag: `[type][nameLen][name][payload]`. */
function named(type: number, name: string, payload: Buffer): Buffer {
  return Buffer.concat([Buffer.from([type]), writeString(name), payload]);
}

/** Writes an unnamed list payload: `[elemType][count][elements...]`. */
function listPayload(elemType: number, elements: Buffer[]): Buffer {
  const count = Buffer.alloc(4);
  count.writeInt32LE(elements.length);
  return Buffer.concat([Buffer.from([elemType]), count, ...elements]);
}

/** Writes a named list tag. */
function listTag(elemType: number, name: string, elements: Buffer[]): Buffer {
  return named(9, name, listPayload(elemType, elements));
}

/** Writes a named compound tag. */
function compoundTag(name: string, entries: Buffer[]): Buffer {
  return named(10, name, bareCompound(entries));
}

/** Writes an unnamed compound (used as a list element). */
function bareCompound(entries: Buffer[]): Buffer {
  return Buffer.concat([...entries, Buffer.from([0])]);
}

/** A single palette block entry. */
export interface PaletteBlock {
  name: string;
  states: Record<string, unknown>;
  version: number;
}

/** Configuration accepted by {@link Structure}. */
export interface StructureConfig {
  /** The structure identifier, e.g. `'mymod:castle'`, used as the `structure_name`. */
  identifier: string;
  /** The structure size `[width, height, depth]` (x, y, z). */
  size: [number, number, number];
  /** The structure world origin (default `[0, 0, 0]`). */
  origin?: [number, number, number];
  /** Map of block identifier to a list of `[x, y, z]` positions. */
  blocks?: Record<string, Array<[number, number, number]>>;
  /** Optional block states per block identifier (default `{}`). */
  blockStates?: Record<string, Record<string, unknown>>;
  /** The block used to fill unset cells (default `'minecraft:air'`). */
  defaultBlock?: string;
  /** The `format_version` int (default `1`). */
  formatVersion?: number;
}

/** The resolved structure configuration (all defaults filled in). */
export interface ResolvedStructureConfig {
  identifier: string;
  size: [number, number, number];
  origin: [number, number, number];
  blocks: Record<string, Array<[number, number, number]>>;
  blockStates: Record<string, Record<string, unknown>>;
  defaultBlock: string;
  formatVersion: number;
}

export class Structure {
  /** The fully-resolved configuration. */
  readonly config: ResolvedStructureConfig;

  constructor(config: StructureConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Structure requires a non-empty "identifier".');
    }
    if (!Array.isArray(config.size) || config.size.length !== 3 || config.size.some((n) => !Number.isInteger(n) || n < 0)) {
      throw new Error('Structure requires a "size" of three non-negative integers [x, y, z].');
    }
    this.config = {
      identifier: config.identifier,
      size: [...config.size] as [number, number, number],
      origin: [...(config.origin ?? [0, 0, 0])] as [number, number, number],
      blocks: { ...(config.blocks ?? {}) },
      blockStates: { ...(config.blockStates ?? {}) },
      defaultBlock: config.defaultBlock ?? 'minecraft:air',
      formatVersion: config.formatVersion ?? 1,
    };
  }

  /** The structure identifier (also the `structure_name` reference). */
  get identifier(): string { return this.config.identifier; }

  /** The pack-relative file name under `structures/`, encoding the namespace. */
  get fileName(): string {
    const colon = this.identifier.indexOf(':');
    return colon >= 0
      ? `${this.identifier.slice(0, colon)}/${this.identifier.slice(colon + 1)}.mcstructure`
      : `${this.identifier}.mcstructure`;
  }

  /** Builds the little-endian NBT byte representation of the structure. */
  buildBinary(): Buffer {
    const [sx, sy, sz] = this.config.size;
    const total = sx * sy * sz;

    const palette: PaletteBlock[] = [];
    const indexByName = new Map<string, number>();
    const addPalette = (name: string, states?: Record<string, unknown>): number => {
      const existing = indexByName.get(name);
      if (existing !== undefined) return existing;
      const index = palette.length;
      indexByName.set(name, index);
      palette.push({ name, states: { ...(states ?? {}) }, version: COMPABILITY_VERSION });
      return index;
    };

    // Index 0 is always the fill block so every cell has a valid reference.
    addPalette(this.config.defaultBlock);
    const layer0 = new Array<number>(total).fill(0);
    const layer1 = new Array<number>(total).fill(-1);

    for (const [name, positions] of Object.entries(this.config.blocks)) {
      const index = addPalette(name, this.config.blockStates[name]);
      for (const [x, y, z] of positions) {
        const flat = x + y * sx + z * sx * sy;
        if (flat < 0 || flat >= total) {
          throw new Error(`Structure block ${name} at [${x},${y},${z}] is outside the size [${sx},${sy},${sz}].`);
        }
        layer0[flat] = index;
      }
    }

    const blockPalette = listTag(
      10,
      'block_palette',
      palette.map((p) => bareCompound([
        named(8, 'name', writeString(p.name)),
        compoundTag('states', Object.entries(p.states).map(([k, v]) => namedNbtValue(k, v))),
        named(3, 'version', writeInt(p.version)),
      ]))
    );

    const structure = compoundTag('structure', [
      listTag(9, 'block_indices', [
        listPayload(3, layer0.map(writeInt)),
        listPayload(3, layer1.map(writeInt)),
      ]),
      listTag(10, 'entities', []),
      compoundTag('palette', [
        compoundTag('default', [
          blockPalette,
          compoundTag('block_position_data', []),
        ]),
      ]),
    ]);

    const [ox, oy, oz] = this.config.origin;
    return compoundTag('', [
      named(3, 'format_version', writeInt(this.config.formatVersion)),
      listTag(3, 'size', [writeInt(sx), writeInt(sy), writeInt(sz)]),
      structure,
      listTag(3, 'structure_world_origin', [writeInt(ox), writeInt(oy), writeInt(oz)]),
    ]);
  }
}

/** Encodes a block-state value as an NBT tag (Int / String / Byte for booleans). */
function namedNbtValue(name: string, value: unknown): Buffer {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return named(3, name, writeInt(value));
  }
  if (typeof value === 'boolean') {
    return named(1, name, Buffer.from([value ? 1 : 0]));
  }
  return named(8, name, writeString(String(value)));
}
