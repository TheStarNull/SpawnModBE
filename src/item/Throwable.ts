/**
 * The `Throwable` class — describes a throwable / shooter weapon item.
 *
 * Combines the related components:
 *  - `minecraft:projectile` — which projectile entity is fired
 *  - `minecraft:throwable` — throw configuration
 *  - `minecraft:shooter` — ammunition-based shooting (bows/crossbows)
 *
 * Component formats follow the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#throwable).
 *
 * @example
 * ```ts
 * const snowball = new Throwable({
 *   identifier: 'mymod:fireball',
 *   name: 'Fireball',
 *   projectileEntity: 'mymod:fireball_projectile',
 *   launchPowerScale: 1.2,
 *   maxLaunchPower: 2.0,
 *   doSwingAnimation: true,
 *   scalePowerByDrawDuration: true,
 *   // add shooter ammo + charge draw like a bow:
 *   ammunition: [{ item: 'mymod:fireball', searchInventory: true }],
 *   maxDrawDuration: 1.5,
 * });
 * ```
 */

import type { ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** A single ammunition entry for `minecraft:shooter`. */
export interface AmmunitionSpec {
  /** The item identifier that serves as ammunition. Must have a projectile component. */
  item: string;
  /** Whether inventory slots can be searched for this ammunition. Defaults to `true`. */
  searchInventory?: boolean;
  /** Whether this ammunition is used by default in creative mode. */
  useInCreative?: boolean;
  /** Whether this ammunition can be used from the off-hand slot. */
  useOffhand?: boolean;
}

/** Configuration accepted by {@link Throwable}. */
export interface ThrowableConfig extends ItemConfig {
  /** The projectile entity type (e.g. `arrow`). */
  projectileEntity: string;
  /** Time (seconds) to charge for critical damage. */
  minimumCriticalPower?: number;
  /** Whether to use the swing animation when thrown. Defaults to `false`. */
  doSwingAnimation?: boolean;
  /** Minimum draw duration (seconds) before release. Defaults to 0. */
  minDrawDuration?: number;
  /** Maximum draw duration (seconds) before auto-release. Defaults to 0. */
  maxDrawDuration?: number;
  /** Scale at which launch power increases. Defaults to 1. */
  launchPowerScale?: number;
  /** Maximum launch power. Defaults to 1. */
  maxLaunchPower?: number;
  /** Whether power increases with draw duration. Defaults to `false`. */
  scalePowerByDrawDuration?: boolean;
  /** Ammunition list to enable `minecraft:shooter` (bow-like) behavior. */
  ammunition?: AmmunitionSpec[];
  /** Whether ammunition is charged when drawn (crossbow-like). Requires `use_duration`. */
  chargeOnDraw?: boolean;
  /** Use duration (seconds) required for `minecraft:use_modifiers`. */
  useDuration?: number;
}

/** The fully-resolved throwable configuration. */
export interface ResolvedThrowableConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  projectileEntity: string;
  minimumCriticalPower: number | undefined;
  doSwingAnimation: boolean;
  minDrawDuration: number;
  maxDrawDuration: number;
  launchPowerScale: number;
  maxLaunchPower: number;
  scalePowerByDrawDuration: boolean;
  ammunition: AmmunitionSpec[];
  chargeOnDraw: boolean;
  useDuration: number;
}

export class Throwable extends Item {
  /** The fully-normalized throwable configuration. */
  declare readonly config: ResolvedThrowableConfig;

  constructor(config: ThrowableConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      projectileEntity: config.projectileEntity,
      minimumCriticalPower: config.minimumCriticalPower,
      doSwingAnimation: config.doSwingAnimation ?? false,
      minDrawDuration: config.minDrawDuration ?? 0,
      maxDrawDuration: config.maxDrawDuration ?? 0,
      launchPowerScale: config.launchPowerScale ?? 1.0,
      maxLaunchPower: config.maxLaunchPower ?? 1.0,
      scalePowerByDrawDuration: config.scalePowerByDrawDuration ?? false,
      ammunition: config.ammunition ?? [],
      chargeOnDraw: config.chargeOnDraw ?? false,
      useDuration: config.useDuration ?? 0,
    } as ResolvedThrowableConfig;
  }

  /** Builds the base components plus throwable components. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    // Projectile: which entity is fired.
    comps['minecraft:projectile'] = {
      projectile_entity: c.projectileEntity,
      ...(c.minimumCriticalPower !== undefined
        ? { minimum_critical_power: c.minimumCriticalPower }
        : {}),
    };

    // Throwable: how the projectile is launched by using the item.
    comps['minecraft:throwable'] = {
      do_swing_animation: c.doSwingAnimation,
      min_draw_duration: c.minDrawDuration,
      max_draw_duration: c.maxDrawDuration,
      launch_power_scale: c.launchPowerScale,
      max_launch_power: c.maxLaunchPower,
      scale_power_by_draw_duration: c.scalePowerByDrawDuration,
    };

    // Shooter: bow/crossbow-like behavior with ammunition.
    if (c.ammunition.length > 0) {
      comps['minecraft:shooter'] = {
        ammunition: c.ammunition.map((a) => ({
          item: a.item,
          ...(a.searchInventory !== undefined
            ? { search_inventory: a.searchInventory }
            : { search_inventory: true }),
          ...(a.useInCreative !== undefined ? { use_in_creative: a.useInCreative } : {}),
          ...(a.useOffhand !== undefined ? { use_offhand: a.useOffhand } : {}),
        })),
        charge_on_draw: c.chargeOnDraw,
        max_draw_duration: c.maxDrawDuration,
        scale_power_by_draw_duration: c.scalePowerByDrawDuration,
      };
    }

    // Use modifiers (needed for chargeable weapons).
    comps['minecraft:use_modifiers'] = {
      use_duration: c.useDuration,
    };

    return comps;
  }
}