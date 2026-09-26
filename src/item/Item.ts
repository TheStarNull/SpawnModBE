/**
 * The `Item` class — describes a custom item and generates its behavior-pack
 * definition (and optionally its resource-pack icon mapping).
 *
 * Minecraft Bedrock custom items are defined in a behavior pack under
 * `items/<id>.json`, keyed by an identifier (`namespace:name`) and a set of
 * components. The icon component must reference a texture name that the resource
 * pack maps to an actual texture via `textures/item_texture.json`.
 *
 * This is the base class and supports the full set of generic item components
 * documented on the Bedrock Wiki:
 * https://wiki.bedrock.dev/items/item-components
 *
 * Use {@link Tools} or {@link Armor} for tool-like or armor-like items, which
 * add their own component groups on top of these generic ones.
 *
 * An item can also carry a {@link DynamicItemModel} (3D attachable + geometry +
 * animation). Pass `dynamicModel` in the config; then
 * `Resource.addItemAssets(item)` writes the texture, placeholder icon, and the
 * dynamic model files all at once.
 *
 * @example
 * ```ts
 * const ruby = new Item({
 *   identifier: 'mymod:ruby',
 *   name: 'Ruby',
 *   description: 'A shiny red gem',
 *   category: 'items',
 *   texturePath: 'textures/items/ruby',
 *   maxStackSize: 64,
 *   fuelDuration: 8.5,
 *   glint: true,
 *   tags: ['mymod:gem'],
 * });
 *
 * bp.addItem(ruby);        // → behavior pack: items/ruby.json
 * rp.addItemTexture(ruby); // → resource pack: item_texture.json entry + icon
 * ```
 */

import { DynamicItemModel, type DynamicItemModelConfig } from '../rp/DynamicItemModel.js';

/** Valid creative-menu categories for a custom item (1.20.70+). */
export type ItemCategory = 'equipment' | 'items' | 'nature' | 'none' | 'construction';

/** The item's rarity, which tints the display name. */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

/** The `minecraft:use_animation` value. */
export type UseAnimation =
  | 'eat'
  | 'drink'
  | 'bow'
  | 'block'
  | 'camera'
  | 'crossbow'
  | 'none'
  | 'brush'
  | 'spear'
  | 'spyglass';

/** The `minecraft:cooldown` trigger type. */
export type CooldownType = 'use' | 'attack';

/** The `minecraft:use_modifiers` `start_using` value. */
export type StartUsing = 'always' | 'if_first';

/** A block descriptor for `use_on` / `dispense_on` component arrays. */
export type BlockDescriptorSpec =
  | string
  | { name: string; states: Record<string, unknown> }
  | { tags: string };

/** Configuration for `minecraft:food`. */
export interface FoodComponentConfig {
  /** Nutrition value added on consumption (may be negative). */
  nutrition?: number;
  /** Saturation modifier (> 0). Saturates as `nutrition * saturation_modifier * 2`. */
  saturationModifier?: number;
  /** Whether the item can be eaten even when full. */
  canAlwaysEat?: boolean;
  /** The item id this converts to when used (e.g. `minecraft:bowl`). */
  usingConvertsTo?: string;
}

/** Configuration for `minecraft:throwable`. */
export interface ThrowableComponentConfig {
  /** Whether to use the swing animation when thrown. */
  doSwingAnimation?: boolean;
  /** Minimum draw duration (seconds) before release. */
  minDrawDuration?: number;
  /** Maximum draw duration (seconds) before auto-release. */
  maxDrawDuration?: number;
  /** Scale at which launch power increases. */
  launchPowerScale?: number;
  /** Maximum launch power. */
  maxLaunchPower?: number;
  /** Whether power increases with draw duration. */
  scalePowerByDrawDuration?: boolean;
}

/** Configuration for `minecraft:projectile`. */
export interface ProjectileComponentConfig {
  /** The projectile entity type (e.g. `arrow`). */
  projectileEntity: string;
  /** Time (seconds) a projectile must charge to deal critical damage. */
  minimumCriticalPower?: number;
}

/** Configuration for `minecraft:durability_sensor` thresholds. */
export interface DurabilityThresholdSpec {
  /** Emit the effect when durability <= this value. */
  durability: number;
  /** Vanilla particle type to spawn. */
  particleType?: string;
  /** Vanilla sound event to trigger. */
  soundEvent?: string;
}

/** Configuration accepted by {@link Item}. */
export interface ItemConfig {
  /**
   * The item identifier, e.g. `'mymod:ruby'`. Must contain a namespace.
   * The short name (after the `:`) is used for the generated file name.
   */
  identifier: string;
  /** Display name shown in-game. Defaults to the item's short name. */
  name?: string;
  /**
   * The value written to `minecraft:display_name`. When set, this is used
   * verbatim (and may contain newlines/format codes). Defaults to `name`,
   * then to the item's short name.
   */
  displayName?: string;
  /** A tooltip / description line. */
  description?: string;
  /** Creative menu category. Defaults to `'items'`. */
  category?: ItemCategory;
  /** The item's rarity. Defaults to `'common'`. */
  rarity?: ItemRarity;
  /**
   * The texture name used by the `minecraft:icon` component. When omitted but
   * `texturePath` is given, this defaults to the item's short name.
   */
  iconTexture?: string;
  /**
   * The resource-pack texture path (no `.png` extension), e.g.
   * `'textures/items/ruby'`. Pass this to `Resource.addItemTexture` so the pack
   * maps the icon texture to the actual image.
   */
  texturePath?: string;
  /** Maximum stack size. Defaults to 64. */
  maxStackSize?: number;

  // ---- Generic components (all optional) ----
  /** Whether the item has the enchanted glint effect. */
  glint?: boolean;
  /** Whether the item can be equipped into the off-hand slot. */
  allowOffHand?: boolean;
  /** Whether the item can destroy blocks in creative mode. */
  canDestroyInCreative?: boolean;
  /** Whether the item renders hand-equipped like a tool in third person. */
  handEquipped?: boolean;
  /** Whether the item interacts with liquid blocks on use. */
  liquidClipped?: boolean;
  /** Tags to apply via `minecraft:tags`. */
  tags?: string[];
  /** Fuel duration (seconds) for `minecraft:fuel`. */
  fuelDuration?: number;
  /** Cooldown config for `minecraft:cooldown`. */
  cooldown?: { category: string; duration: number; type?: CooldownType };
  /** Compost chance (0-100) for `minecraft:compostable`. */
  compostingChance?: number;
  /** Food config for `minecraft:food`. */
  food?: FoodComponentConfig;
  /** Use animation for `minecraft:use_animation`. */
  useAnimation?: UseAnimation;
  /** Use modifiers for `minecraft:use_modifiers`. */
  useModifiers?: {
    useDuration: number;
    movementModifier?: number;
    emitVibrations?: boolean;
    startSound?: string;
    startUsing?: StartUsing;
  };
  /** Throwable config for `minecraft:throwable`. */
  throwable?: ThrowableComponentConfig;
  /** Projectile config for `minecraft:projectile`. */
  projectile?: ProjectileComponentConfig;
  /** Durability sensor thresholds for `minecraft:durability_sensor`. */
  durabilitySensor?: DurabilityThresholdSpec[];
  /** A dyeable default color (hex) for `minecraft:dyeable`. */
  dyeableDefaultColor?: string;
  /** Whether the item should despawn when stacked by data. */
  shouldDespawn?: boolean;
  /** Whether the item is stored by its data. */
  stackedByData?: boolean;
  /** Swing duration (seconds) for `minecraft:swing_duration`. */
  swingDuration?: number;
  /**
   * Swing sounds for `minecraft:swing_sounds`.
   * Either `{ attackMiss, attackHit, attackCriticalHit }` or a string array
   * `[attack_miss, attack_hit, attack_critical_hit]` (any elements optional).
   */
  swingSounds?:
    | { attackMiss?: string; attackHit?: string; attackCriticalHit?: string }
    | string[];

  /** Extra custom components merged into the generated JSON. */
  components?: Record<string, unknown>;
  /** The manifest `format_version` for the generated item file. Defaults to `'1.20.70'`. */
  formatVersion?: string;

  /**
   * When set, the item gets a 3D dynamic model (attachable + geometry +
   * animation). Passed to {@link DynamicItemModel}. The `identifier` of the
   * dynamic model defaults to this item's identifier, and the texture defaults
   * to `textures/entity/<shortName>`.
   */
  dynamicModel?: DynamicItemModelConfig;
}

const CATEGORIES: readonly ItemCategory[] = [
  'equipment',
  'items',
  'nature',
  'none',
  'construction',
];

const RARITIES: readonly ItemRarity[] = ['common', 'uncommon', 'rare', 'epic'];

const USE_ANIMATIONS: readonly UseAnimation[] = [
  'eat',
  'drink',
  'bow',
  'block',
  'camera',
  'crossbow',
  'none',
  'brush',
  'spear',
  'spyglass',
];

/**
 * The identifier pattern: `namespace:name`. Minecraft Bedrock identifiers are
 * lowercase, so uppercase is rejected here to avoid generating files that pass
 * validation yet silently fail to load in-game.
 */
const IDENTIFIER_PATTERN = /^[a-z0-9_]+:[a-z0-9_]+$/;

/** Derives a valid item short name from a namespace-qualified identifier. */
export function itemShortName(identifier: string): string {
  const index = identifier.indexOf(':');
  return index >= 0 ? identifier.slice(index + 1) : identifier;
}

/** The fully-resolved item configuration. */
export interface ResolvedItemConfig extends ItemConfig {
  identifier: string;
  category: ItemCategory;
  rarity: ItemRarity;
  maxStackSize: number;
  formatVersion: string;
}

export class Item {
  /** The fully-normalized configuration. */
  readonly config: ResolvedItemConfig;

  /**
   * The item's dynamic 3D model (attachable + geometry + animation), or `null`
   * when the item was built without `dynamicModel`.
   */
  readonly dynamicModel: DynamicItemModel | null;

  constructor(config: ItemConfig) {
    if (!config || typeof config.identifier !== 'string') {
      throw new Error('Item requires a string "identifier".');
    }
    if (!IDENTIFIER_PATTERN.test(config.identifier)) {
      throw new Error(
        `Item identifier must be lowercase "namespace:name", got: ${config.identifier}`
      );
    }
    const category = config.category ?? 'items';
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Unknown item category: ${category}`);
    }
    const rarity = config.rarity ?? 'common';
    if (!RARITIES.includes(rarity)) {
      throw new Error(`Unknown item rarity: ${rarity}`);
    }
    if (config.useAnimation && !USE_ANIMATIONS.includes(config.useAnimation)) {
      throw new Error(`Unknown use animation: ${config.useAnimation}`);
    }
    if (config.maxStackSize !== undefined && config.maxStackSize < 1) {
      throw new Error('Item maxStackSize must be >= 1.');
    }
    this.config = {
      ...config,
      identifier: config.identifier,
      category,
      rarity,
      maxStackSize: config.maxStackSize ?? 64,
      formatVersion: config.formatVersion ?? '1.26.0',
    };

    // Build the dynamic model (if requested), defaulting identifier/texture to
    // the item's own values so the attachable binds to this item automatically.
    this.dynamicModel = config.dynamicModel
      ? new DynamicItemModel({
          ...config.dynamicModel,
          identifier: config.dynamicModel.identifier ?? config.identifier,
          texture:
            config.dynamicModel.texture ??
            config.texturePath ??
            `textures/entity/${this.shortName}`,
        })
      : null;
  }

  /** Returns `true` when the item has a dynamic 3D model. */
  get hasDynamicModel(): boolean {
    return this.dynamicModel !== null;
  }

  /** The full identifier (`namespace:name`). */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The part after the namespace separator. */
  get shortName(): string {
    return itemShortName(this.identifier);
  }

  /** The in-game display name. */
  get displayName(): string {
    return this.config.displayName ?? this.config.name ?? this.shortName;
  }

  /** The texture name used by the icon component. */
  get iconTexture(): string {
    return this.config.iconTexture ?? this.shortName;
  }

  /** Returns the texture mapping to register in the RP, or `null` when absent. */
  get textureMapping(): { textureName: string; texturePath: string } | null {
    if (!this.config.texturePath) return null;
    return { textureName: this.iconTexture, texturePath: this.config.texturePath };
  }

  // ---- 链式 set 方法（mutate `this.config`，返回 `this` 便于串接）----

  /** Sets the in-game display name. Returns `this` for chaining. */
  setName(name: string): this {
    this.config.name = name;
    return this;
  }

  /** Sets the description. Returns `this` for chaining. */
  setDescription(description: string): this {
    this.config.description = description;
    return this;
  }

  /** Sets the creative category. Returns `this` for chaining. */
  setCategory(category: ItemCategory): this {
    this.config.category = category;
    return this;
  }

  /** Sets the rarity. Returns `this` for chaining. */
  setRarity(rarity: ItemRarity): this {
    this.config.rarity = rarity;
    return this;
  }

  /** Sets the maximum stack size. Returns `this` for chaining. */
  setMaxStackSize(size: number): this {
    this.config.maxStackSize = size;
    return this;
  }

  /** Sets the item tags (`minecraft:tags`). Returns `this` for chaining. */
  setTags(tags: string[]): this {
    this.config.tags = tags;
    return this;
  }

  /** Sets the fuel duration (seconds). Returns `this` for chaining. */
  setFuelDuration(seconds: number): this {
    this.config.fuelDuration = seconds;
    return this;
  }

  /** Sets a custom component value. Returns `this` for chaining. */
  setComponent(name: string, value: unknown): this {
    this.config.components = this.config.components ?? {};
    this.config.components[name] = value;
    return this;
  }

  /** Adds a raw component to the item (e.g. `minecraft:loot` for block-drops). */
  addComponent(name: string, value: unknown): this {
    return this.setComponent(name, value);
  }

  /**
   * Builds the behavior-pack item JSON.
   */
  buildBehaviorJson(): object {
    return {
      format_version: this.config.formatVersion,
      'minecraft:item': {
        description: {
          identifier: this.identifier,
          menu_category: { category: this.config.category },
        },
        components: this.components(),
      },
    };
  }

  /**
   * The base component set for this item. Tools/Armor subclasses extend this.
   */
  protected components(): Record<string, unknown> {
    const c = this.config;
    const comps: Record<string, unknown> = {
      'minecraft:icon': this.iconComponent(),
      'minecraft:display_name': { value: this.displayName },
      'minecraft:max_stack_size': c.maxStackSize,
    };

    if (c.rarity !== 'common') comps['minecraft:rarity'] = c.rarity;
    if (c.glint) comps['minecraft:glint'] = true;
    if (c.allowOffHand) comps['minecraft:allow_off_hand'] = true;
    if (c.canDestroyInCreative === false) {
      comps['minecraft:can_destroy_in_creative'] = false;
    }
    if (c.handEquipped) comps['minecraft:hand_equipped'] = true;
    if (c.liquidClipped) comps['minecraft:liquid_clipped'] = true;
    if (c.fuelDuration !== undefined) {
      comps['minecraft:fuel'] = { duration: c.fuelDuration };
    }
    if (c.cooldown) {
      comps['minecraft:cooldown'] = {
        category: c.cooldown.category,
        duration: c.cooldown.duration,
        ...(c.cooldown.type ? { type: c.cooldown.type } : {}),
      };
    }
    if (c.compostingChance !== undefined) {
      comps['minecraft:compostable'] = { composting_chance: c.compostingChance };
    }
    if (c.food) {
      const foodBody: Record<string, unknown> = {};
      if (c.food.nutrition !== undefined) foodBody.nutrition = c.food.nutrition;
      if (c.food.saturationModifier !== undefined) {
        foodBody.saturation_modifier = c.food.saturationModifier;
      }
      if (c.food.canAlwaysEat !== undefined) {
        foodBody.can_always_eat = c.food.canAlwaysEat;
      }
      if (c.food.usingConvertsTo) {
        foodBody.using_converts_to = c.food.usingConvertsTo;
      }
      comps['minecraft:food'] = foodBody;
    }
    if (c.useAnimation) comps['minecraft:use_animation'] = c.useAnimation;
    if (c.useModifiers) {
      comps['minecraft:use_modifiers'] = {
        use_duration: c.useModifiers.useDuration,
        ...(c.useModifiers.movementModifier !== undefined
          ? { movement_modifier: c.useModifiers.movementModifier }
          : {}),
        ...(c.useModifiers.emitVibrations !== undefined
          ? { emit_vibrations: c.useModifiers.emitVibrations }
          : {}),
        ...(c.useModifiers.startSound
          ? { start_sound: c.useModifiers.startSound }
          : {}),
        ...(c.useModifiers.startUsing
          ? { start_using: c.useModifiers.startUsing }
          : {}),
      };
    }
    if (c.throwable) {
      comps['minecraft:throwable'] = {
        do_swing_animation: c.throwable.doSwingAnimation ?? false,
        min_draw_duration: c.throwable.minDrawDuration ?? 0.0,
        max_draw_duration: c.throwable.maxDrawDuration ?? 0.0,
        launch_power_scale: c.throwable.launchPowerScale ?? 1.0,
        max_launch_power: c.throwable.maxLaunchPower ?? 1.0,
        scale_power_by_draw_duration: c.throwable.scalePowerByDrawDuration ?? false,
      };
    }
    if (c.projectile) {
      comps['minecraft:projectile'] = {
        projectile_entity: c.projectile.projectileEntity,
        ...(c.projectile.minimumCriticalPower !== undefined
          ? { minimum_critical_power: c.projectile.minimumCriticalPower }
          : {}),
      };
    }
    if (c.durabilitySensor && c.durabilitySensor.length > 0) {
      comps['minecraft:durability_sensor'] = {
        durability_thresholds: c.durabilitySensor.map((d) => ({
          durability: d.durability,
          ...(d.particleType ? { particle_type: d.particleType } : {}),
          ...(d.soundEvent ? { sound_event: d.soundEvent } : {}),
        })),
      };
    }
    if (c.dyeableDefaultColor) {
      comps['minecraft:dyeable'] = { default_color: c.dyeableDefaultColor };
    }
    if (c.shouldDespawn) comps['minecraft:should_despawn'] = true;
    if (c.stackedByData) comps['minecraft:stacked_by_data'] = true;
    if (c.swingDuration !== undefined) {
      comps['minecraft:swing_duration'] = { value: c.swingDuration };
    }
    if (c.swingSounds) {
      comps['minecraft:swing_sounds'] = this.buildSwingSounds(c.swingSounds);
    }
    if (c.tags && c.tags.length > 0) {
      comps['minecraft:tags'] = { tags: c.tags };
    }

    // Caller-supplied components win over defaults.
    Object.assign(comps, c.components);
    return comps;
  }

  /** The icon component value (string shorthand, or object with textures). */
  private iconComponent(): string | Record<string, unknown> {
    const texture = this.iconTexture;
    return texture.includes(':') ? { textures: { default: texture } } : texture;
  }

  /**
   * Builds `minecraft:swing_sounds` from either the object form
   * `{ attackMiss, attackHit, attackCriticalHit }` or an array shortcut
   * `[attack_miss, attack_hit, attack_critical_hit]`.
   */
  private buildSwingSounds(
    sounds: Exclude<NonNullable<ItemConfig['swingSounds']>, undefined>
  ): { attack_miss?: string; attack_hit?: string; attack_critical_hit?: string } {
    if (Array.isArray(sounds)) {
      const out: { attack_miss?: string; attack_hit?: string; attack_critical_hit?: string } = {};
      if (sounds[0] !== undefined) out.attack_miss = sounds[0];
      if (sounds[1] !== undefined) out.attack_hit = sounds[1];
      if (sounds[2] !== undefined) out.attack_critical_hit = sounds[2];
      return out;
    }
    const out: { attack_miss?: string; attack_hit?: string; attack_critical_hit?: string } = {};
    if (sounds.attackMiss) out.attack_miss = sounds.attackMiss;
    if (sounds.attackHit) out.attack_hit = sounds.attackHit;
    if (sounds.attackCriticalHit) out.attack_critical_hit = sounds.attackCriticalHit;
    return out;
  }
}
