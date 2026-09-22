/**
 * The `Block` class — generates a behavior-pack block definition.
 *
 * A custom block is defined in `BP/blocks/<id>.json` and has a description
 * (identifier + menu category) plus a set of components. Unlike entities, blocks
 * do NOT have a resource-pack definition; visuals are wired via the
 * `minecraft:geometry` + `minecraft:material_instances` components and a
 * `terrain_texture.json` entry in the resource pack.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/blocks/blocks-intro
 *
 * @example
 * ```ts
 * const lamp = new Block({
 *   identifier: 'wiki:lamp',
 *   category: 'items',
 *   components: {
 *     'minecraft:light_emission': 15,
 *     'minecraft:light_dampening': 0,
 *     'minecraft:map_color': '#ffffff',
 *     'minecraft:destructible_by_mining': { seconds_to_destroy: 3 },
 *     'minecraft:geometry': 'minecraft:geometry.full_block',
 *     'minecraft:material_instances': { '*': { texture: 'wiki:lamp' } },
 *   },
 * });
 * bp.addBlock(lamp);
 * ```
 */

/** The creative inventory category for a block. */
export type BlockCategory =
  | 'construction'
  | 'nature'
  | 'equipment'
  | 'items'
  | 'none';

/** A block material instance (texture + optional render method). */
export interface BlockMaterialInstance {
  /** The texture shortname (key in `terrain_texture.json`). */
  texture: string;
  /** The render method, e.g. `'opaque'`, `'alpha_test'`, `'blend'`. */
  render_method?: string;
  /** Whether to use the block's face dimming. */
  face_dimming?: boolean;
  /** Whether to use ambient occlusion. */
  ambient_occlusion?: boolean;
}

/** A 3D vector for box origins/sizes (measured in pixels). */
export type BlockBoxVec = [number, number, number];

/** A collision / selection box definition. */
export interface BlockBox {
  origin: BlockBoxVec;
  size: BlockBoxVec;
}

/**
 * A valid block state value. Booleans, integers, strings, or an integer range
 * object `{ values: { min, max } }` (max ≤ min + 15).
 */
export type BlockStateValues =
  | boolean[]
  | number[]
  | string[]
  | { values: { min: number; max: number } };

/** A map of state name → valid values (the first value is the default). */
export type BlockStates = Record<string, BlockStateValues>;

/**
 * A block trait (applies vanilla states like direction). The key is the trait
 * identifier (e.g. `'minecraft:placement_position'`).
 */
export type BlockTraits = Record<string, { enabled_states: string[]; [k: string]: unknown }>;

/** A block permutation (conditional components). */
export interface BlockPermutation {
  /** The permutation condition (Molang, uses `q.block_state`). */
  condition: string;
  /** Components applied when the condition is met. */
  components: Record<string, unknown>;
}

/** Configuration accepted by {@link Block}. */
export interface BlockConfig {
  /** The block identifier (e.g. `'wiki:lamp'`). */
  identifier: string;
  /** The creative inventory category. Defaults to `'construction'`. */
  category?: BlockCategory;
  /** The expandable item group (e.g. `'minecraft:itemGroup.name.concrete'`). */
  group?: string;
  /** Whether the block is hidden from commands. Defaults to `false`. */
  isHiddenInCommands?: boolean;
  /**
   * The block's components. Keys use the vanilla `minecraft:*` names. This is the
   * single source of behavior (light, geometry, material_instances, ...).
   */
  components?: Record<string, unknown>;
  /**
   * Block states: `{ 'wiki:state': [values] }`. The first value is the default.
   * Each state may have up to 16 values; integer ranges max ≤ min + 15.
   */
  states?: BlockStates;
  /**
   * Block traits (apply vanilla states like direction). Keys are trait
   * identifiers (e.g. `'minecraft:placement_position'`).
   */
  traits?: BlockTraits;
  /** Optional block permutations (conditional components). */
  permutations?: BlockPermutation[];
  /** The `format_version`. Defaults to `'1.26.50'`. */
  formatVersion?: string;
}

/** The resolved block configuration. */
export interface ResolvedBlockConfig {
  identifier: string;
  category: BlockCategory;
  group: string | undefined;
  isHiddenInCommands: boolean;
  components: Record<string, unknown>;
  states: BlockStates;
  traits: BlockTraits;
  permutations: BlockPermutation[];
  formatVersion: string;
}

const CATEGORIES: readonly BlockCategory[] = [
  'construction',
  'nature',
  'equipment',
  'items',
  'none',
];

export class Block {
  readonly config: ResolvedBlockConfig;

  constructor(config: BlockConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Block requires a non-empty "identifier".');
    }
    const category = config.category ?? 'construction';
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Unknown block category: ${category}`);
    }
    this.config = {
      identifier: config.identifier,
      category,
      group: config.group,
      isHiddenInCommands: config.isHiddenInCommands ?? false,
      components: config.components ?? {},
      states: config.states ?? {},
      traits: config.traits ?? {},
      permutations: config.permutations ?? [],
      formatVersion: config.formatVersion ?? '1.26.50',
    };
  }

  /** The block identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The part after the namespace separator. */
  get shortName(): string {
    const idx = this.identifier.indexOf(':');
    return idx >= 0 ? this.identifier.slice(idx + 1) : this.identifier;
  }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string {
    return `${this.shortName}.json`;
  }

  /** The RP texture shortname for this block (equals the identifier). */
  get textureName(): string {
    return this.identifier;
  }

  /**
   * The texture shortname this block actually references in its
   * `minecraft:material_instances` (`*` instance when present), falling back to
   * the block identifier. Used by {@link Resource.addBlockTexture} so the
   * generated `terrain_texture.json` entry lines up with the value the block
   * points at — a mismatch otherwise leaves the block with a missing texture.
   */
  get renderTextureName(): string {
    const instances = this.config.components['minecraft:material_instances'];
    if (instances && typeof instances === 'object') {
      const star = (instances as Record<string, unknown>)['*'];
      if (star && typeof star === 'object') {
        const tex = (star as { texture?: unknown }).texture;
        if (typeof tex === 'string' && tex.trim() !== '') return tex;
      }
    }
    return this.textureName;
  }

  // ---- 链式 set 方法（mutate `this.config`，返回 `this` 便于串接）----

  /** Sets the creative category. Returns `this` for chaining. */
  setCategory(category: BlockCategory): this {
    this.config.category = category;
    return this;
  }

  /** Sets the item group (e.g. `'minecraft:itemGroup.name.concrete'`). Returns `this`. */
  setGroup(group: string): this {
    this.config.group = group;
    return this;
  }

  /** Sets a single component value. Returns `this` for chaining. */
  setComponent(name: string, value: unknown): this {
    this.config.components[name] = value;
    return this;
  }

  /**
   * Links the block's drop loot table via the `minecraft:loot` component.
   *
   * Accepts either a behavior-pack-relative path string (no `.json` — the
   * `minecraft:loot` value uses the `loot_tables/...` path) or a `LootTable`
   * instance combined with the path to write it to.
   *
   * @param lootTablePath The BP-relative path (e.g. `'loot_tables/blocks/custom_block'`).
   * @returns `this` for chaining.
   */
  setLoot(lootTablePath: string): this {
    this.config.components['minecraft:loot'] = lootTablePath.endsWith('.json')
      ? lootTablePath
      : `${lootTablePath}.json`;
    return this;
  }

  /** Adds a permutation (conditional components). Returns `this` for chaining. */
  addPermutation(permutation: BlockPermutation): this {
    this.config.permutations.push(permutation);
    return this;
  }

  /** Adds a block state. Returns `this` for chaining. */
  addState(name: string, values: BlockStateValues): this {
    this.config.states[name] = values;
    return this;
  }

  /** Adds a trait. Returns `this` for chaining. */
  addTrait(name: string, config: { enabled_states: string[]; [k: string]: unknown }): this {
    this.config.traits[name] = config;
    return this;
  }

  /** Builds the full behavior-pack block JSON. */
  buildJson(): object {
    const description: Record<string, unknown> = {
      identifier: this.identifier,
      menu_category: {
        category: this.config.category,
      },
    };
    if (this.config.group) {
      (description.menu_category as Record<string, unknown>).group = this.config.group;
    }
    if (this.config.isHiddenInCommands) {
      (description.menu_category as Record<string, unknown>).is_hidden_in_commands = true;
    }
    if (Object.keys(this.config.states).length > 0) {
      description.states = this.config.states;
    }
    if (Object.keys(this.config.traits).length > 0) {
      description.traits = this.config.traits;
    }

    return {
      format_version: this.config.formatVersion,
      'minecraft:block': {
        description,
        components:
          Object.keys(this.config.components).length > 0 ? this.config.components : {},
        ...(this.config.permutations.length > 0
          ? { permutations: this.config.permutations }
          : {}),
      },
    };
  }
}
