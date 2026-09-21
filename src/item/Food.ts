/**
 * The `Food` class — describes an edible custom item.
 *
 * On top of the base {@link Item}, food items get:
 *  - `minecraft:food` — nutrition, saturation
 *  - `minecraft:use_modifiers` — consumption duration
 *  - `minecraft:use_animation` — `"eat"` by default (`"drink"` for potions/drinks)
 *
 * Component formats follow the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#food).
 *
 * @example
 * ```ts
 * const apple = new Food({
 *   identifier: 'mymod:chocolate_apple',
 *   name: 'Chocolate Apple',
 *   nutrition: 6,
 *   saturationModifier: 0.8,
 *   texturePath: 'textures/items/chocolate_apple',
 *   canAlwaysEat: true,
 *   eatDuration: 1.6,
 * });
 * ```
 */

import type { ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** Configuration accepted by {@link Food}. */
export interface FoodConfig extends ItemConfig {
  /** Nutrition value added on consumption (may be negative). */
  nutrition: number;
  /** Saturation modifier (> 0). Saturates as `nutrition * saturation_modifier * 2`. */
  saturationModifier: number;
  /** Whether the item can be eaten even when the player is full. */
  canAlwaysEat?: boolean;
  /** The item this converts to when used (e.g. `minecraft:bowl`). */
  usingConvertsTo?: string;
  /** Time (seconds) to hold use before the item is consumed. Defaults to 1.6. */
  eatDuration?: number;
  /** Whether to play the drinking animation instead of eating. Defaults to `false`. */
  drinkInsteadOfEat?: boolean;
  /** Movement modifier (0.0-1.0) applied while eating. Defaults to `0.4`. */
  movementModifier?: number;
}

/** The fully-resolved food configuration. */
export interface ResolvedFoodConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  nutrition: number;
  saturationModifier: number;
  canAlwaysEat: boolean;
  usingConvertsTo: string | undefined;
  eatDuration: number;
  drinkInsteadOfEat: boolean;
  movementModifier: number;
}

export class Food extends Item {
  /** The fully-normalized food configuration. */
  declare readonly config: ResolvedFoodConfig;

  constructor(config: FoodConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      nutrition: config.nutrition,
      saturationModifier: config.saturationModifier,
      canAlwaysEat: config.canAlwaysEat ?? false,
      usingConvertsTo: config.usingConvertsTo,
      eatDuration: config.eatDuration ?? 1.6,
      drinkInsteadOfEat: config.drinkInsteadOfEat ?? false,
      movementModifier: config.movementModifier ?? 0.4,
    } as ResolvedFoodConfig;
  }

  /** Builds the base components plus food components. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    comps['minecraft:food'] = {
      nutrition: c.nutrition,
      saturation_modifier: c.saturationModifier,
      ...(c.canAlwaysEat ? { can_always_eat: true } : {}),
      ...(c.usingConvertsTo ? { using_converts_to: c.usingConvertsTo } : {}),
    };

    comps['minecraft:use_modifiers'] = {
      use_duration: c.eatDuration,
      movement_modifier: c.movementModifier,
    };

    comps['minecraft:use_animation'] = c.drinkInsteadOfEat ? 'drink' : 'eat';

    return comps;
  }
}