/**
 * The `Shapeless` class — a shapeless crafting recipe.
 *
 * Shapeless recipes simply bind a collection of inputs to a single output on a
 * crafting grid. Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/loot/recipes#shapeless-recipes
 *
 * @example
 * ```ts
 * const brassKnob = new Shapeless({
 *   identifier: 'mymod:brass_knob',
 *   tags: ['crafting_table'],
 *   ingredients: ['mymod:brass'],
 *   result: 'mymod:brass_knob',
 * });
 * ```
 */

import { Recipe, type RecipeConfig, type RecipeItem } from './Recipe.js';

/** Configuration accepted by {@link Shapeless}. */
export interface ShapelessConfig extends RecipeConfig {
  /** The items required as inputs (may include counts in object form). */
  ingredients: RecipeItem[];
  /** The resulting item (may be an array of a single descriptor). */
  result: RecipeItem;
}

export class Shapeless extends Recipe {
  /** The resolved shapeless configuration. */
  readonly shapelessConfig: ShapelessConfig;

  constructor(config: ShapelessConfig) {
    super(config, 'minecraft:recipe_shapeless');
    if (!config.ingredients || config.ingredients.length === 0) {
      throw new Error('Shapeless requires at least one ingredient.');
    }
    if (!config.result) {
      throw new Error('Shapeless requires a result.');
    }
    this.shapelessConfig = config;
  }

  protected override buildBody(): Record<string, unknown> {
    const body = super.buildBody();
    body.ingredients = this.shapelessConfig.ingredients;
    body.result = this.shapelessConfig.result;
    return body;
  }
}