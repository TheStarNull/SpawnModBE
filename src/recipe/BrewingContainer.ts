/**
 * The `BrewingContainer` class — a brewing recipe that carries data values.
 *
 * Brewing container recipes pass the input's data value to the output (used for
 * potions). Only potion-type items are allowed as inputs (`minecraft:potion`,
 * `minecraft:splash_potion`, `minecraft:lingering_potion`, and potion identifier
 * additions). Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/loot/recipes#brewing-containers
 *
 * @example
 * ```ts
 * const illumination = new BrewingContainer({
 *   identifier: 'mymod:illumination_potion',
 *   tags: ['brewing_stand'],
 *   input: 'minecraft:potion',
 *   reagent: 'mymod:radiant_berries',
 *   output: 'mymod:illumination_potion',
 * });
 * ```
 */

import { Recipe, type RecipeConfig, type RecipeItem } from './Recipe.js';

/** Configuration accepted by {@link BrewingContainer}. */
export interface BrewingContainerConfig extends RecipeConfig {
  /** The input potion item (`minecraft:potion` / `splash` / `lingering`). */
  input: RecipeItem;
  /** The reagent/catalyst that drives the transformation. */
  reagent: RecipeItem;
  /** The resulting output (data value carried over from input). */
  output: RecipeItem;
}

export class BrewingContainer extends Recipe {
  /** The resolved brewing-container configuration. */
  readonly brewingConfig: BrewingContainerConfig;

  constructor(config: BrewingContainerConfig) {
    super(config, 'minecraft:recipe_brewing_container');
    if (!config.input || !config.reagent || !config.output) {
      throw new Error('BrewingContainer requires input, reagent and output.');
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