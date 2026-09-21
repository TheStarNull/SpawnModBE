/**
 * The `Fuel` class — describes an item that can be used as furnace fuel.
 *
 * On top of the base {@link Item}, fuel items get:
 *  - `minecraft:fuel` — burn duration in seconds
 *
 * Component format follows the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#fuel).
 *
 * @example
 * ```ts
 * const coalChunk = new Fuel({
 *   identifier: 'mymod:coal_chunk',
 *   name: 'Coal Chunk',
 *   duration: 12.5,
 *   texturePath: 'textures/items/coal_chunk',
 * });
 * ```
 */

import type { ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** Configuration accepted by {@link Fuel}. */
export interface FuelConfig extends ItemConfig {
  /** The time duration (in seconds) that this item fuels furnaces for. */
  duration: number;
}

/** The fully-resolved fuel configuration. */
export interface ResolvedFuelConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  duration: number;
}

export class Fuel extends Item {
  /** The fully-normalized fuel configuration. */
  declare readonly config: ResolvedFuelConfig;

  constructor(config: FuelConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      duration: config.duration,
    } as ResolvedFuelConfig;
  }

  /** Builds the base components plus the fuel component. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    comps['minecraft:fuel'] = { duration: this.config.duration };
    return comps;
  }
}