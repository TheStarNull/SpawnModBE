/**
 * The `BrewingMix` class — a brewing recipe that does not carry data values.
 *
 * Brewing mixes transform an input item using a reagent catalyst into an output.
 * The output does not inherit the input's data value. Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/loot/recipes#brewing-mixes
 *
 * @example
 * ```ts
 * const paralysisBrew = new BrewingMix({
 *   identifier: 'mymod:paralysis_brew',
 *   tags: ['brewing_stand'],
 *   input: 'mymod:amberglass_flask',
 *   reagent: 'mymod:viporfly_poison',
 *   output: 'mymod:paralysis_brew',
 * });
 * ```
 */

import { Recipe, type RecipeConfig, type RecipeItem } from './Recipe.js';

/** Configuration accepted by {@link BrewingMix}. */
export interface BrewingMixConfig extends RecipeConfig {
  /** The input flask/item to transform. */
  input: RecipeItem;
  /** The reagent/catalyst that drives the transformation. */
  reagent: RecipeItem;
  /** The resulting output item. */
  output: RecipeItem;
}

export class BrewingMix extends Recipe {
  /** The resolved brewing-mix configuration. */
  readonly brewingConfig: BrewingMixConfig;

  constructor(config: BrewingMixConfig) {
    super(config, 'minecraft:recipe_brewing_mix');
    if (!config.input || !config.reagent || !config.output) {
      throw new Error('BrewingMix requires input, reagent and output.');
    }
    this.brewingConfig = config;
  }

  protected override buildBody(): Record<string, unknown> {
    const body = super.buildBody();
    body.input = this.brewingConfig.input;
    body.reagent = this.brewingConfig.reagent;
    body.output = this.brewingConfig.output;
    return body;
  }
}