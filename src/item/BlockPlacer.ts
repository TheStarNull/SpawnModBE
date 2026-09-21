/**
 * The `BlockPlacer` class — describes an item that places a block when used.
 *
 * On top of the base {@link Item}, block placer items get:
 *  - `minecraft:block_placer` — which block is placed and where it can be used
 *
 * Component format follows the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#block-placer).
 *
 * @example
 * ```ts
 * const netheriteIngot = new BlockPlacer({
 *   identifier: 'mymod:structure_block',
 *   name: 'Handheld Structure Block',
 *   block: 'mymod:custom_block',
 *   texturePath: 'textures/items/structure_block',
 *   canPlaceOn: ['minecraft:dirt', 'minecraft:stone'],
 *   replaceBlockItem: false,
 * });
 * ```
 */

import type { BlockDescriptorSpec, ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** Re-export the shared block descriptor type for convenience. */
export type { BlockDescriptorSpec };

/** Configuration accepted by {@link BlockPlacer}. */
export interface BlockPlacerConfig extends ItemConfig {
  /** The identifier of the block to place. */
  block: string;
  /** Replaces the block's own item with this one when set. Defaults to `false`. */
  replaceBlockItem?: boolean;
  /** Uses aligned placement while the place input is held. Defaults to `false`. */
  alignedPlacement?: boolean;
  /** Blocks (descriptors or identifiers) the item can be used on. Defaults to any. */
  canPlaceOn?: BlockDescriptorSpec[];
}

/** The fully-resolved block-placer configuration. */
export interface ResolvedBlockPlacerConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  block: string;
  replaceBlockItem: boolean;
  alignedPlacement: boolean;
  canPlaceOn: BlockDescriptorSpec[];
}

export class BlockPlacer extends Item {
  /** The fully-normalized block-placer configuration. */
  declare readonly config: ResolvedBlockPlacerConfig;

  constructor(config: BlockPlacerConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      block: config.block,
      replaceBlockItem: config.replaceBlockItem ?? false,
      alignedPlacement: config.alignedPlacement ?? false,
      canPlaceOn: config.canPlaceOn ?? [],
    } as ResolvedBlockPlacerConfig;
  }

  /** Builds the base components plus the block placer component. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    const component: Record<string, unknown> = {
      block: c.block,
    };
    if (c.replaceBlockItem) component.replace_block_item = true;
    if (c.alignedPlacement) component.aligned_placement = true;
    if (c.canPlaceOn.length > 0) component.use_on = c.canPlaceOn;

    comps['minecraft:block_placer'] = component;
    return comps;
  }
}