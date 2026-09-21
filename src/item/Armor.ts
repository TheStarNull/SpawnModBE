/**
 * The `Armor` class — describes an armor-like custom item.
 *
 * Armor items add the following components on top of the base {@link Item}:
 *  - `minecraft:wearable` — equip slot + protection points
 *  - `minecraft:durability` — max durability + damage chance
 *  - `minecraft:enchantable` — enchant slot + enchantability value
 *  - `minecraft:repairable` — repair materials (e.g. iron ingots)
 *  - `minecraft:damage_absorption` — which damage causes the armor absorbs
 *
 * Component formats follow the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components).
 *
 * @example
 * ```ts
 * const helmet = new Armor({
 *   identifier: 'mymod:obsidian_helmet',
 *   name: 'Obsidian Helmet',
 *   slot: 'slot.armor.head',
 *   protection: 6,
 *   maxDurability: 495,
 *   enchantableSlot: 'armor_head',
 *   repairItems: ['minecraft:obsidian'],
 * });
 * ```
 */

import type { ItemConfig } from './Item.js';
import { Item } from './Item.js';
import type { EnchantSlot, RepairItemSpec } from './Tools.js';

/** The valid armor equip slots for `minecraft:wearable`. */
export type ArmorSlot =
  | 'slot.armor.head'
  | 'slot.armor.chest'
  | 'slot.armor.legs'
  | 'slot.armor.feet'
  | 'slot.armor.body';

/** Valid damage causes accepted by `minecraft:damage_absorption`. */
export type DamageCause =
  | 'all'
  | 'contact'
  | 'entity_attack'
  | 'entity_sweep_attack'
  | 'projectile'
  | 'suffocation'
  | 'fall'
  | 'fire'
  | 'fire_tick'
  | 'lava'
  | 'drowning'
  | 'explosion'
  | 'magic'
  | 'wither'
  | 'anvil'
  | 'falling_block'
  | 'stalactite'
  | 'stalagmite'
  | 'starve'
  | 'temperature'
  | 'freezing'
  | 'void'
  | 'sonic_boom'
  | 'self_destruct'
  | 'soul_campfire'
  | 'ram_attack'
  | 'thorns'
  | 'lightning'
  | 'campfire'
  | 'mob_attack'
  | 'mob_attack_no_damage';

/** The default damage causes absorbed by armor. */
const DEFAULT_ABSORBED_CAUSES: DamageCause[] = ['all'];

/** Configuration accepted by {@link Armor}. */
export interface ArmorConfig extends ItemConfig {
  /** The armor slot this item equips into. Defaults to `slot.armor.chest`. */
  slot?: ArmorSlot;
  /** Armor points contributed when worn. Defaults to 1. */
  protection?: number;
  /** Maximum durability. Omit to disable the durability component. */
  maxDurability?: number;
  /** Enchant slot. Defaults to based on the armor slot. */
  enchantableSlot?: EnchantSlot;
  /** Enchantability (0-255). Defaults to 10. */
  enchantableValue?: number;
  /** Whether the item hides player location from locator bars. Defaults to `false`. */
  hidePlayerLocation?: boolean;
  /** Damage causes absorbed by this armor. Defaults to `['all']`. */
  absorbedCauses?: DamageCause[];
  /** Repair materials for `minecraft:repairable`. */
  repairItems?: Array<RepairItemSpec | string>;
}

/** The fully-resolved armor configuration. */
export interface ResolvedArmorConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  slot: ArmorSlot;
  protection: number;
  maxDurability: number | undefined;
  enchantableSlot: EnchantSlot;
  enchantableValue: number;
  hidePlayerLocation: boolean;
  absorbedCauses: DamageCause[];
  repairItems: Array<RepairItemSpec | string>;
}

/** Maps an armor slot to its default enchant slot. */
function defaultEnchantSlot(slot: ArmorSlot): EnchantSlot {
  switch (slot) {
    case 'slot.armor.head':
      return 'armor_head';
    case 'slot.armor.chest':
    case 'slot.armor.body':
      return 'armor_torso';
    case 'slot.armor.legs':
      return 'armor_legs';
    case 'slot.armor.feet':
      return 'armor_feet';
  }
}

export class Armor extends Item {
  /** The fully-normalized armor configuration. */
  declare readonly config: ResolvedArmorConfig;

  constructor(config: ArmorConfig) {
    super(config);
    const slot = config.slot ?? 'slot.armor.chest';
    this.config = {
      ...this.config,
      slot,
      protection: config.protection ?? 1,
      maxDurability: config.maxDurability,
      enchantableSlot: config.enchantableSlot ?? defaultEnchantSlot(slot),
      enchantableValue: config.enchantableValue ?? 10,
      hidePlayerLocation: config.hidePlayerLocation ?? false,
      absorbedCauses: config.absorbedCauses ?? DEFAULT_ABSORBED_CAUSES,
      repairItems: config.repairItems ?? [],
    } as ResolvedArmorConfig;
  }

  /** Whether this armor has durability. */
  get hasDurability(): boolean {
    return (this.config.maxDurability ?? 0) > 0;
  }

  /** The armor slot this item equips into. */
  get slot(): ArmorSlot {
    return this.config.slot;
  }

  /** Builds the base components plus armor-specific ones. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    // Armor slots force max_stack_size to 1 by default; be explicit anyway.
    comps['minecraft:max_stack_size'] = 1;

    comps['minecraft:wearable'] = {
      protection: c.protection,
      slot: c.slot,
    };
    if (c.hidePlayerLocation) {
      (comps['minecraft:wearable'] as Record<string, unknown>).hides_player_location =
        true;
    }

    if (this.hasDurability) {
      comps['minecraft:durability'] = {
        damage_chance: { min: 0, max: 100 },
        max_durability: c.maxDurability,
      };
    }

    comps['minecraft:enchantable'] = {
      slot: c.enchantableSlot,
      value: c.enchantableValue,
    };

    comps['minecraft:damage_absorption'] = {
      absorbable_causes: c.absorbedCauses,
    };

    if (c.repairItems.length > 0) {
      comps['minecraft:repairable'] = {
        repair_items: c.repairItems.map((spec) =>
          typeof spec === 'string' ? { items: [spec] } : spec
        ),
      };
    }

    return comps;
  }
}