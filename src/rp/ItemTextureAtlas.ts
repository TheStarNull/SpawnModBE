/**
 * The `ItemTextureAtlas` class — manages the RP `textures/item_texture.json`
 * atlas for item icons in bulk.
 *
 * The item texture atlas maps texture names to texture paths:
 * ```json
 * {
 *   "resource_pack_name": "my_pack",
 *   "texture_name": "atlas.items",
 *   "texture_data": {
 *     "ruby": { "textures": "textures/items/ruby" }
 *   }
 * }
 * ```
 * A texture name may map to a single path or to an array of paths (for
 * item variants like `axe` with wood/stone/iron/gold/diamond entries).
 */

/** A texture entry value: a single path or an array of paths. */
export type TexturePaths = string | string[];

/** Configuration for a single atlas entry. */
export interface ItemTextureEntry {
  /** The texture name key. */
  name: string;
  /** The texture path(s) (no `.png` extension). */
  paths: TexturePaths;
}

/** Configuration accepted by {@link ItemTextureAtlas}. */
export interface ItemTextureAtlasConfig {
  /** The `resource_pack_name` header. Defaults to `'my_pack'`. */
  resourcePackName?: string;
  /** The `texture_name` header. Defaults to `'atlas.items'`. */
  textureName?: string;
  /** Initial entries. */
  entries?: ItemTextureEntry[];
}

export class ItemTextureAtlas {
  readonly config: { resourcePackName: string; textureName: string };
  private readonly data: Map<string, TexturePaths> = new Map();

  constructor(config?: ItemTextureAtlasConfig) {
    this.config = {
      resourcePackName: config?.resourcePackName ?? 'my_pack',
      textureName: config?.textureName ?? 'atlas.items',
    };
    for (const entry of config?.entries ?? []) {
      this.set(entry.name, entry.paths);
    }
  }

  /** Sets an entry, overwriting any existing one. */
  set(name: string, paths: TexturePaths): this {
    this.data.set(name, paths);
    return this;
  }

  /** Sets many entries at once. */
  setAll(entries: ItemTextureEntry[]): this {
    for (const e of entries) this.set(e.name, e.paths);
    return this;
  }

  /** Returns the paths for a texture name, or `undefined`. */
  get(name: string): TexturePaths | undefined {
    return this.data.get(name);
  }

  /** Removes an entry. Returns `true` if it existed. */
  remove(name: string): boolean {
    return this.data.delete(name);
  }

  /** Builds the atlas JSON object. */
  buildJson(): object {
    const texture_data: Record<string, { textures: TexturePaths }> = {};
    for (const [name, paths] of [...this.data.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      texture_data[name] = { textures: paths };
    }
    return {
      resource_pack_name: this.config.resourcePackName,
      texture_name: this.config.textureName,
      texture_data,
    };
  }

  /** Serializes the atlas to pretty-printed JSON. */
  toString(): string {
    return JSON.stringify(this.buildJson(), null, 2);
  }
}