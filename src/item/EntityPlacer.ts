/**
 * The `EntityPlacer` class — describes an item that places an entity (spawn egg).
 *
 * On top of the base {@link Item}, entity placer items get:
 *  - `minecraft:entity_placer` — which entity is placed, and on which blocks
 *
 * Component format follows the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#entity-placer).
 *
 * @example
 * ```ts
 * const spiderEgg = new EntityPlacer({
 *   identifier: 'mymod:spider_egg',
 *   name: 'Spider Egg',
 *   entity: 'minecraft:spider',
 *   texturePath: 'textures/items/spider_egg',
 *   canPlaceOn: ['minecraft:dirt'],
 * });
 * ```
 */

import type { BlockDescriptorSpec, ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** Re-export the shared block descriptor type for convenience. */
export type { BlockDescriptorSpec };

/** Configuration accepted by {@link EntityPlacer}. */
export interface EntityPlacerConfig extends ItemConfig {
  /**
   * The entity to place, e.g. `'minecraft:spider'`.
   * May include a custom spawn event: `'wiki:entity<wiki:event>'`.
   */
  entity: string;
  /** Blocks the item can be placed onto (defaults to any block). */
  canPlaceOn?: BlockDescriptorSpec[];
  /** Blocks the item can be dispensed onto (defaults to any block). */
  canDispenseOn?: BlockDescriptorSpec[];
}

/** The fully-resolved entity-placer configuration. */
export interface ResolvedEntityPlacerConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  entity: string;
  canPlaceOn: BlockDescriptorSpec[];
  canDispenseOn: BlockDescriptorSpec[];
}

export class EntityPlacer extends Item {
  /** The fully-normalized entity-placer configuration. */
  declare readonly config: ResolvedEntityPlacerConfig;

  constructor(config: EntityPlacerConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      entity: config.entity,
      canPlaceOn: config.canPlaceOn ?? [],
      canDispenseOn: config.canDispenseOn ?? [],
    } as ResolvedEntityPlacerConfig;
  }

  /** Builds the base components plus the entity placer component. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    const component: Record<string, unknown> = {
      entity: c.entity,
    };
    if (c.canPlaceOn.length > 0) component.use_on = c.canPlaceOn;
    if (c.canDispenseOn.length > 0) component.dispense_on = c.canDispenseOn;

    comps['minecraft:entity_placer'] = component;
    return comps;
  }
}