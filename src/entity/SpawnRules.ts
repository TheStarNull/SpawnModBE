/**
 * The `SpawnRules` class — describes how an entity spawns naturally.
 *
 * Spawn rules define when/where/how an entity spawns into the world. They live at
 * BP/spawn_rules/<id>.json and are keyed by the entity identifier, with a set of
 * `conditions` (each a bundle of spawn components).
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/entities/spawn-rules
 *
 * @example
 * ```ts
 * const goblinSpawns = new SpawnRules({
 *   identifier: 'mymod:goblin',
 *   populationControl: 'monster',
 *   conditions: [{
 *     weight: 100,
 *     herd: { min_size: 2, max_size: 4 },
 *     spawnsOnSurface: true,
 *     brightness: { min: 0, max: 7, adjustForWeather: true },
 *     difficulty: { min: 'easy', max: 'hard' },
 *   }],
 * });
 * bp.addSpawnRules(goblinSpawns);
 * ```
 */

/** The population control category. */
export type PopulationControl = 'animal' | 'monster' | 'ambient' | 'underwater_animal';

/** The difficulty name. */
export type DifficultyName = 'peaceful' | 'easy' | 'normal' | 'hard';

/** A single spawn condition bundle. */
export interface SpawnCondition {
  /** Spawn weight. Defaults to 100. */
  weight?: number;
  /** Herd size range. */
  herd?: { min_size?: number; max_size?: number; event?: string; event_skip_count?: number };
  /** Spawns on the surface. */
  spawnsOnSurface?: boolean;
  /** Spawns underground. */
  spawnsUnderground?: boolean;
  /** Spawns underwater. */
  spawnsUnderwater?: boolean;
  /** Brightness range (0-15). */
  brightness?: { min?: number; max?: number; adjust_for_weather?: boolean };
  /** Difficulty range. */
  difficulty?: { min?: DifficultyName; max?: DifficultyName };
  /** Distance range. */
  distance?: { min?: number; max?: number };
  /** Height range (y). */
  height?: { min?: number; max?: number };
  /** Biome filter. */
  biomeFilter?: { test?: string; operator?: string; value?: string };
  /** Spawns on a specific block within vertical distance. */
  spawnsAboveBlock?: { blocks: string | string[]; distance?: number };
  /** Blocks the entity can spawn on. */
  spawnsOnBlock?: string | string[];
  /** Blocks that prevent spawning. */
  spawnsOnBlockPrevented?: string | string[];
  /** Density limit. */
  densityLimit?: { surface?: number; underground?: number };
  /** Permute type (mutation chance). */
  permuteType?: Array<{ weight: number; entity_type?: string }>;
  /** Whether the entity spawns in lava. */
  spawnsLava?: boolean;
}

/** Configuration accepted by {@link SpawnRules}. */
export interface SpawnRulesConfig {
  /** The entity identifier this rule applies to. */
  identifier: string;
  /** The population control category. */
  populationControl?: PopulationControl;
  /** The spawn conditions. */
  conditions: SpawnCondition[];
  /** The manifest `format_version`. Defaults to `'1.8.0'`. */
  formatVersion?: string;
}

/** The resolved spawn-rules configuration. */
export interface ResolvedSpawnRulesConfig extends SpawnRulesConfig {
  formatVersion: string;
}

export class SpawnRules {
  readonly config: ResolvedSpawnRulesConfig;

  constructor(config: SpawnRulesConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('SpawnRules requires a non-empty "identifier".');
    }
    if (!config.conditions || config.conditions.length === 0) {
      throw new Error('SpawnRules requires at least one condition.');
    }
    this.config = {
      ...config,
      populationControl: config.populationControl,
      conditions: config.conditions.map((c) => ({ ...c })),
      formatVersion: config.formatVersion ?? '1.8.0',
    };
  }

  /** The entity identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string {
    const idx = this.identifier.indexOf(':');
    return `${idx >= 0 ? this.identifier.slice(idx + 1) : this.identifier}.json`;
  }

  /** Builds the spawn-rules JSON. */
  buildJson(): object {
    const conditions = this.config.conditions.map((c) => this.buildCondition(c));

    return {
      format_version: this.config.formatVersion,
      'minecraft:spawn_rules': {
        description: {
          identifier: this.identifier,
          ...(this.config.populationControl
            ? { population_control: this.config.populationControl }
            : {}),
        },
        conditions,
      },
    };
  }

  /** Builds a single condition bundle from a {@link SpawnCondition}. */
  private buildCondition(c: SpawnCondition): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    if (c.weight !== undefined) out['minecraft:weight'] = { default: c.weight };
    if (c.herd) {
      const herd: Record<string, unknown> = {};
      if (c.herd.min_size !== undefined) herd.min_size = c.herd.min_size;
      if (c.herd.max_size !== undefined) herd.max_size = c.herd.max_size;
      if (c.herd.event) herd.event = c.herd.event;
      if (c.herd.event_skip_count !== undefined) herd.event_skip_count = c.herd.event_skip_count;
      out['minecraft:herd'] = herd;
    }
    if (c.spawnsOnSurface) out['minecraft:spawns_on_surface'] = {};
    if (c.spawnsUnderground) out['minecraft:spawns_underground'] = {};
    if (c.spawnsUnderwater) out['minecraft:spawns_underwater'] = {};
    if (c.spawnsLava) out['minecraft:spawns_lava'] = {};
    if (c.brightness) {
      out['minecraft:brightness_filter'] = { ...c.brightness };
    }
    if (c.difficulty) {
      out['minecraft:difficulty_filter'] = { ...c.difficulty };
    }
    if (c.distance) {
      out['minecraft:distance_filter'] = { ...c.distance };
    }
    if (c.height) {
      out['minecraft:height_filter'] = { ...c.height };
    }
    if (c.biomeFilter) {
      out['minecraft:biome_filter'] = { ...c.biomeFilter };
    }
    if (c.spawnsAboveBlock) {
      out['minecraft:spawns_above_block_filter'] = { ...c.spawnsAboveBlock };
    }
    if (c.spawnsOnBlock) {
      out['minecraft:spawns_on_block_filter'] = {
        blocks: c.spawnsOnBlock,
      };
    }
    if (c.spawnsOnBlockPrevented) {
      out['minecraft:spawns_on_block_prevented_filter'] = c.spawnsOnBlockPrevented;
    }
    if (c.densityLimit) {
      out['minecraft:density_limit'] = { ...c.densityLimit };
    }
    if (c.permuteType && c.permuteType.length > 0) {
      out['minecraft:permute_type'] = c.permuteType;
    }

    return out;
  }
}