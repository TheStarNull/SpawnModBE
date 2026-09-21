/**
 * The `Tools` class — describes a tool/weapon-like custom item.
 *
 * Tools add the following components on top of the base {@link Item}:
 *  - `minecraft:hand_equipped` — rendered like a tool in third person
 *  - `minecraft:durability` — max durability + damage chance
 *  - `minecraft:enchantable` — enchant slot + enchantability value
 *  - `minecraft:digger` — block destroy speeds
 *  - `minecraft:damage` — attack damage (format 1.26.0+)
 *  - `minecraft:repairable` — repair materials
 *
 * Component formats follow the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components).
 *
 * @example
 * ```ts
 * const dagger = new Tools({
 *   identifier: 'mymod:dagger',
 *   name: 'Obsidian Dagger',
 *   category: 'equipment',
 *   maxDurability: 512,
 *   damage: 8,
 *   enchantableSlot: 'sword',
 *   enchantableValue: 14,
 *   destroySpeeds: [
 *     { block: { tags: 'q.any_tag(\'minecraft:is_sword_item_destructible\')' }, speed: 4 },
 *   ],
 *   repairItems: ['minecraft:obsidian'],
 * });
 * ```
 */

import type { ItemConfig, ResolvedItemConfig } from './Item.js';
import { Item } from './Item.js';

/** A single destroy-speed entry for `minecraft:digger`. */
export interface DestroySpeedSpec {
  /**
   * A block descriptor: a plain block identifier string, or `{ tags: '<molang>' }`.
   */
  block: string | { tags: string };
  /** Mining speed for the block. `0` means the block cannot be broken. */
  speed: number;
  /** Whether the Efficiency enchantment affects this speed. Defaults to `false`. */
  useEfficiency?: boolean;
}

/** A repair-material entry for `minecraft:repairable`. */
export interface RepairItemSpec {
  /** The item(s) used to repair (identifiers). */
  items: string[];
  /**
   * How much durability is repaired. Either an integer, or a molang expression
   * string (e.g. `'query.max_durability * 0.25'`).
   */
  repairAmount?: number | string;
}

/** A valid enchantable slot. */
export type EnchantSlot =
  | 'all'
  | 'armor_feet'
  | 'armor_torso'
  | 'armor_head'
  | 'armor_legs'
  | 'axe'
  | 'bow'
  | 'carrot_stick'
  | 'cosmetic_head'
  | 'crossbow'
  | 'elytra'
  | 'fishing_rod'
  | 'flintsteel'
  | 'g_armor'
  | 'g_digging'
  | 'hoe'
  | 'pickaxe'
  | 'shears'
  | 'shield'
  | 'shovel'
  | 'spear'
  | 'sword';

/** Configuration accepted by {@link Tools}. */
export interface ToolsConfig extends ItemConfig {
  /** Maximum durability. Omit to disable the durability component. */
  maxDurability?: number;
  /** Attack damage value. Defaults to 1. */
  damage?: number;
  /** Enchant slot. Omit to disable the enchantable component. */
  enchantableSlot?: EnchantSlot;
  /** Enchantability (0-255). Defaults to 10 when an enchant slot is set. */
  enchantableValue?: number;
  /**
   * Destroy speeds for `minecraft:digger`. When omitted, the digger component
   * is not added unless `defaultDigger` is `true`.
   */
  destroySpeeds?: DestroySpeedSpec[];
  /** Whether to add `use_efficiency: true` to the digger. Defaults to `false`. */
  useEfficiency?: boolean;
  /** Repair materials for `minecraft:repairable`. */
  repairItems?: Array<RepairItemSpec | string>;
  /** Whether the item renders hand-equipped. Defaults to `true`. */
  handEquipped?: boolean;
}

/** The fully-resolved tool configuration. */
export interface ResolvedToolsConfig extends ResolvedItemConfig {
  maxDurability: number | undefined;
  damage: number;
  enchantableSlot: EnchantSlot | undefined;
  enchantableValue: number;
  destroySpeeds: DestroySpeedSpec[];
  useEfficiency: boolean;
  repairItems: Array<RepairItemSpec | string>;
  handEquipped: boolean;
}

/** The default destroy-speed spec for a generic tool. */
const DEFAULT_TOOL_DIGGER: DestroySpeedSpec[] = [
  {
    block: { tags: `q.any_tag('minecraft:is_pickaxe_item_destructible')` },
    speed: 6,
  },
  {
    block: { tags: `q.any_tag('minecraft:is_shovel_item_destructible')` },
    speed: 6,
  },
];

export class Tools extends Item {
  /** The fully-normalized tool configuration. */
  declare readonly config: ResolvedToolsConfig;

  constructor(config: ToolsConfig) {
    // Base Item validates identifier/category/rarity.
    super(config);

    const damage = config.damage ?? 1;
    const enchantableValue = config.enchantableValue ?? 10;
    const destroySpeeds = config.destroySpeeds ?? [];
    const useEfficiency = config.useEfficiency ?? false;
    const handEquipped = config.handEquipped ?? true;

    this.config = {
      ...this.config,
      maxDurability: config.maxDurability,
      damage,
      enchantableSlot: config.enchantableSlot,
      enchantableValue,
      destroySpeeds,
      useEfficiency,
      repairItems: config.repairItems ?? [],
      handEquipped,
    } as ResolvedToolsConfig;
  }

  /** Whether this tool has durability. */
  get hasDurability(): boolean {
    return (this.config.maxDurability ?? 0) > 0;
  }

  /** Builds the base components plus tool-specific ones. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    if (c.handEquipped) {
      comps['minecraft:hand_equipped'] = true;
    }

    if (this.hasDurability) {
      comps['minecraft:durability'] = {
        damage_chance: { min: 0, max: 100 },
        max_durability: c.maxDurability,
      };
    }

    if (c.enchantableSlot) {
      comps['minecraft:enchantable'] = {
        slot: c.enchantableSlot,
        value: c.enchantableValue,
      };
    }

    if (c.destroySpeeds.length > 0) {
      comps['minecraft:digger'] = {
        use_efficiency: c.useEfficiency,
        destroy_speeds: c.destroySpeeds.map(
          ({ block, speed, useEfficiency: perEntry }) => {
            const entry: Record<string, unknown> = {
              block:
                typeof block === 'string'
                  ? block
                  : { tags: block.tags },
              speed,
            };
            if (perEntry !== undefined) entry.use_efficiency = perEntry;
            return entry;
          }
        ),
      };
    } else if (this.hasDurability) {
      // A durable tool with no explicit speeds gets the default tool digger.
      comps['minecraft:digger'] = {
        use_efficiency: true,
        destroy_speeds: DEFAULT_TOOL_DIGGER,
      };
    }

    if (c.repairItems.length > 0) {
      comps['minecraft:repairable'] = {
        repair_items: c.repairItems.map((spec) => {
          if (typeof spec === 'string') {
            return { items: [spec] };
          }
          const entry: Record<string, unknown> = { items: spec.items };
          if (spec.repairAmount !== undefined) entry.repair_amount = spec.repairAmount;
          return entry;
        }),
      };
    }

    // Attack damage (requires format 1.26.0+ per wiki; fall back gracefully).
    comps['minecraft:damage'] = c.damage;

    return comps;
  }
}