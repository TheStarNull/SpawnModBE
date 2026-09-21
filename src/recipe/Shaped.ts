/**
 * The `Shaped` class — a shaped (pattern-based) crafting recipe.
 *
 * Shaped recipes enforce that the ingredients used during crafting conform to a
 * strict shape, described by a pattern grid and a key map. Format per Bedrock
 * Wiki: https://wiki.bedrock.dev/loot/recipes#shaped-recipes
 *
 * @example
 * ```ts
 * const rubySword = new Shaped({
 *   identifier: 'mymod:ruby_sword',
 *   tags: ['crafting_table'],
 *   pattern: ['X', 'X', 'I'],
 *   key: {
 *     X: 'mymod:ruby',
 *     I: 'minecraft:stick',
 *   },
 *   result: 'mymod:ruby_sword',
 * });
 * ```
 */

import { Recipe, type RecipeConfig, type RecipeItem } from './Recipe.js';

/** The key map for a shaped pattern: char → item descriptor. */
export type RecipeKeyMap = Record<string, RecipeItem>;

/** Configuration accepted by {@link Shaped}. */
export interface ShapedConfig extends RecipeConfig {
  /**
   * The shape grid. Each string is a row (max 3×3). Spaces mean empty slots;
   * rows may be normalized (shorter rows are padded with spaces).
   */
  pattern: string[];
  /** Maps each pattern character to the item descriptor it represents. */
  key: RecipeKeyMap;
  /** The resulting item(s): an item descriptor or an array of descriptors. */
  result: RecipeItem | RecipeItem[];
}

export class Shaped extends Recipe {
  /** The resolved shaped configuration. */
  readonly shapedConfig: ShapedConfig;

  constructor(config: ShapedConfig) {
    super(config, 'minecraft:recipe_shaped');
    if (!config.pattern || config.pattern.length === 0) {
      throw new Error('Shaped requires a non-empty pattern.');
    }
    if (config.pattern.length > 3 || config.pattern.some((r) => r.length > 3)) {
      throw new Error('Shaped pattern must be at most 3×3.');
    }
    if (!config.key || Object.keys(config.key).length === 0) {
      throw new Error('Shaped requires a key map.');
    }
    if (!config.result) {
      throw new Error('Shaped requires a result.');
    }
    this.shapedConfig = config;
  }

  protected override buildBody(): Record<string, unknown> {
    const body = super.buildBody();
    body.pattern = this.shapedConfig.pattern;
    body.key = this.shapedConfig.key;
    body.result = this.shapedConfig.result;
    return body;
  }
}