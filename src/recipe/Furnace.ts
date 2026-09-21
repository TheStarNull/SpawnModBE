/**
 * The `Furnace` class — a heating/smelting recipe (furnace, blast furnace,
 * smoker, campfires).
 *
 * Furnace recipes bind exactly one input item to exactly one output item over a
 * heat source. Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/loot/recipes#heating
 *
 * @example
 * ```ts
 * const magicAsh = new Furnace({
 *   identifier: 'mymod:magic_ash',
 *   tags: ['soul_campfire'],
 *   input: 'mymod:bone_fragments',
 *   output: { item: 'mymod:magic_ash', count: 4 },
 * });
 * ```
 */

import { Recipe, type RecipeConfig, type RecipeItem } from './Recipe.js';

/** Configuration accepted by {@link Furnace}. */
export interface FurnaceConfig extends RecipeConfig {
  /** The item to be heated (count is ignored by the game). */
  input: RecipeItem;
  /** The resulting item after heating (count applies). */
  output: RecipeItem;
}

export class Furnace extends Recipe {
  /** The resolved furnace configuration. */
  readonly furnaceConfig: FurnaceConfig;

  constructor(config: FurnaceConfig) {
    super(config, 'minecraft:recipe_furnace');
    if (!config.input || !config.output) {
      throw new Error('Furnace requires both an input and an output.');
    }
    this.furnaceConfig = config;
  }

  protected override buildBody(): Record<string, unknown> {
    const body = super.buildBody();
    body.input = this.furnaceConfig.input;
    body.output = this.furnaceConfig.output;
    return body;
  }
}