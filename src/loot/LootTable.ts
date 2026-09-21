/**
 * The `LootTable` class — generates a behavior-pack loot table.
 *
 * Loot tables are JSON objects with a single required `"pools"` array. Each pool
 * is an isolated construct that selects items via entries. Two pool types exist:
 *  - weighted random pools (`rolls` + entries with `weight`)
 *  - tiered pools (`tiers` object, used for mob equipment)
 *
 * Entries may be `item`, `loot_table` (hierarchical) or `empty`. Loot entries can
 * use `functions` (set_count, set_name, etc.) and pools can use `conditions`.
 *
 * Format per Bedrock Wiki: https://wiki.bedrock.dev/loot/loot-tables
 *
 * @example
 * ```ts
 * const table = new LootTable({
 *   pools: [
 *     {
 *       rolls: { min: 2, max: 4 },
 *       entries: [
 *         { type: 'item', name: 'minecraft:golden_apple', weight: 20 },
 *         { type: 'item', name: 'minecraft:name_tag', weight: 30 },
 *       ],
 *     },
 *   ],
 * });
 * bp.addLootTable('loot_tables/custom/artifacts', table);
 * ```
 */

/** A roll count: integer or { min, max } range. */
export type LootRollCount = number | { min: number; max: number };

/** A loot table reference with `loot_table` type. */
export interface LootTableEntry {
  type: 'loot_table';
  /** Relative path to another loot table (no `.json` extension needed). */
  name: string;
  weight?: number;
  quality?: number;
  functions?: LootFunction[];
  conditions?: LootCondition[];
}

/** An item entry with `item` type. */
export interface LootItemEntry {
  type: 'item';
  /** Item identifier (e.g. `minecraft:apple`). */
  name: string;
  /** The item's data value. */
  data?: number;
  /** Relative weight within the pool. Defaults to 1. */
  weight?: number;
  /** Luck-based weight modifier. */
  quality?: number;
  /** Functions applied to the yielded item (set_count, set_name, ...). */
  functions?: LootFunction[];
  /** Conditions that gate this entry. */
  conditions?: LootCondition[];
}

/** An empty entry yields nothing. */
export interface LootEmptyEntry {
  type: 'empty';
  weight?: number;
  quality?: number;
  conditions?: LootCondition[];
}

/** The union of all entry types. */
export type LootEntry = LootItemEntry | LootTableEntry | LootEmptyEntry;

/** A loot table condition (e.g. `killed_by_player`). */
export interface LootCondition {
  condition: string;
  [key: string]: unknown;
}

/** A loot table function (e.g. `set_count`, `set_name`). */
export interface LootFunction {
  function: string;
  [key: string]: unknown;
}

/** A weighted-random pool definition. */
export interface WeightedLootPool {
  /** The number of yields; either an integer or a `{ min, max }` range. */
  rolls: LootRollCount;
  /** Extra rolls based on the player's luck. */
  bonus_rolls?: number;
  /** Chance (out of 1) each bonus roll succeeds. */
  bonus_chance?: number;
  /** Entries selectable by this pool. */
  entries: LootEntry[];
  /** Conditions that gate the entire pool. */
  conditions?: LootCondition[];
}

/** A tiered pool definition (used for mob equipment). */
export interface TieredLootPool {
  /** The tier selection configuration. */
  tiers: {
    /** Starting random index (defaults to 1). */
    initial_range?: number;
    /** Number of bonus index-increment rolls. */
    bonus_rolls?: number;
    /** Chance (out of 1) each bonus roll succeeds. */
    bonus_chance?: number;
  };
  /** Ordered entries; the selected index maps to an entry. */
  entries: LootEntry[];
  /** Conditions that gate the entire pool. */
  conditions?: LootCondition[];
}

/** Configuration accepted by {@link LootTable}. */
export interface LootTableConfig {
  /** The loot pools (weighted-random and/or tiered). */
  pools: Array<WeightedLootPool | TieredLootPool>;
}

export class LootTable {
  readonly config: LootTableConfig;

  constructor(config: LootTableConfig) {
    if (!config || !config.pools || config.pools.length === 0) {
      throw new Error('LootTable requires at least one pool.');
    }
    this.config = {
      pools: config.pools.map((pool) => ({ ...pool })),
    };
  }

  /** Builds the complete loot table JSON object. */
  buildJson(): object {
    return { pools: this.config.pools };
  }
}

/** Helper: builds a `set_count` function. */
export function setCount(
  count: number | { min: number; max: number }
): LootFunction {
  return { function: 'set_count', count };
}

/** Helper: builds a `set_name` function. */
export function setName(name: string): LootFunction {
  return { function: 'set_name', name };
}

/** Helper: builds the `killed_by_player` condition. */
export function killedByPlayer(): LootCondition {
  return { condition: 'killed_by_player' };
}

/** Helper: builds a `random_chance_with_looting` condition. */
export function randomChanceWithLooting(
  chance: number,
  lootingMultiplier: number
): LootCondition {
  return { condition: 'random_chance_with_looting', chance, looting_multiplier: lootingMultiplier };
}