/**
 * The `Recipe` base class — describes a behavior-pack crafting recipe.
 *
 * A recipe file lives under `BP/recipes/` and must have:
 *  - a `format_version`
 *  - a `minecraft:recipe_<type>` root with `description.identifier` + `tags`
 *
 * This base class holds the shared fields and serialization logic. Subclasses
 * (Shapeless, Shaped, Furnace, BrewingMix, BrewingContainer) add their own body
 * fields per the Bedrock Wiki reference:
 * https://wiki.bedrock.dev/loot/recipes
 */

/** A vanilla or custom crafting interface tag. */
export type RecipeTag =
  | 'crafting_table'
  | 'stonecutter'
  | 'furnace'
  | 'blast_furnace'
  | 'smoker'
  | 'campfire'
  | 'soul_campfire'
  | 'brewing_stand'
  | 'cartography_table'
  | 'smithing_table'
  | string;

/** An item descriptor: string (`minecraft:planks` or `minecraft:planks:2`) or object. */
export type RecipeItem = string | { item: string; data?: number | string; count?: number };

/** An unlock criterion: `{ item: ... }`, `{ context: ... }` or an item string. */
export type RecipeUnlock = string | { item: string; data?: number } | { context: string };

/** Configuration for the base recipe. */
export interface RecipeConfig {
  /**
   * Recipe identifier (e.g. `'mymod:ruby_sword'`). Used both as the file base
   * name and the recipe description identifier.
   */
  identifier: string;
  /** The crafting interfaces this recipe applies to. At least one required. */
  tags: RecipeTag[];
  /** Optional recipe group (for recipe-book grouping). */
  group?: string;
  /** Optional unlock criteria. */
  unlock?: RecipeUnlock[];
  /** Priority for recipe selection (lower value wins among identical inputs). */
  priority?: number;
  /** The manifest `format_version` for the recipe file. Defaults to `'1.17.41'`. */
  formatVersion?: string;
}

/** The resolved recipe configuration. */
export interface ResolvedRecipeConfig {
  identifier: string;
  tags: RecipeTag[];
  group: string | undefined;
  unlock: RecipeUnlock[] | undefined;
  priority: number | undefined;
  formatVersion: string;
}

export class Recipe {
  readonly config: ResolvedRecipeConfig;

  /** The recipe schema key root (`minecraft:recipe_shaped` etc.). */
  protected readonly schemaKey: string;

  constructor(config: RecipeConfig, schemaKey: string) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Recipe requires a non-empty "identifier".');
    }
    if (!config.tags || config.tags.length === 0) {
      throw new Error('Recipe requires at least one tag (e.g. "crafting_table").');
    }
    this.schemaKey = schemaKey;
    this.config = {
      identifier: config.identifier,
      tags: config.tags,
      group: config.group,
      unlock: config.unlock,
      priority: config.priority,
      formatVersion: config.formatVersion ?? '1.17.41',
    };
  }

  /** The file base name (identifier without namespace). */
  get fileName(): string {
    const idx = this.config.identifier.indexOf(':');
    return `${idx >= 0 ? this.config.identifier.slice(idx + 1) : this.config.identifier}.json`;
  }

  /** The full recipe identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** Builds the complete recipe JSON object. */
  buildJson(): object {
    const body = this.buildBody();

    return {
      format_version: this.config.formatVersion,
      [this.schemaKey]: body,
    };
  }

  /**
   * Subclasses fill in their recipe-specific body fields (ingredients/pattern/
   * input/reagent/result/etc.) along with the shared description/tags.
   */
  protected buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {
      description: { identifier: this.identifier },
      tags: this.config.tags,
    };
    if (this.config.group) body.group = this.config.group;
    if (this.config.unlock && this.config.unlock.length > 0) {
      body.unlock = this.config.unlock;
    }
    if (this.config.priority !== undefined) body.priority = this.config.priority;
    return body;
  }
}