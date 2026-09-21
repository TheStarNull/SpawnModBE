/**
 * The `Attachable` class — generates an `attachables/` entry for item-with-hand
 * rendering (held-item visuals, armor trims, head slots, etc.).
 *
 * Attachables live in RP/attachables/<id>.json and describe how an item looks
 * when held/worn by an entity. The vanilla spyglass and shield are attachables.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/items/attachables
 *
 * @example
 * ```ts
 * const spyglass = new Attachable({
 *   identifier: 'mymod:telescope',
 *   materials: { default: 'entity_alphatest', enchanted: 'entity_alphatest_glint' },
 *   textures: { default: 'textures/entity/telescope' },
 *   geometry: { default: 'geometry.telescope' },
 *   animations: { holding: 'animation.telescope.holding' },
 *   scriptsAnimate: ['holding'],
 *   renderControllers: ['controller.render.item_default'],
 * });
 * rp.addAttachable(spyglass);
 * ```
 */

/** A Molang script string (e.g. `"q.main_hand_item_use_duration > 0.0f"`). */
export type Molang = string;

/** Configuration accepted by {@link Attachable}. */
export interface AttachableConfig {
  /**
   * The attachable identifier. Usually equals the item identifier
   * (e.g. `'mymod:telescope'`).
   */
  identifier: string;
  /** Material shortnames, e.g. `{ default: 'entity_alphatest' }`. */
  materials?: Record<string, string>;
  /** Texture shortnames, e.g. `{ default: 'textures/entity/telescope' }`. */
  textures?: Record<string, string>;
  /** Geometry shortnames, e.g. `{ default: 'geometry.telescope' }`. */
  geometry?: Record<string, string>;
  /** Animation shortnames (both animations and animation controllers). */
  animations?: Record<string, string>;
  /** Script initialization lines. */
  initialize?: string[];
  /** Script pre-animation lines. */
  preAnimation?: string[];
  /** Script animate list (mapped to animation shortnames). */
  scriptsAnimate?: Array<string | { [shortname: string]: Molang }>;
  /** Render controller identifiers used. */
  renderControllers?: string[];
  /** The manifest `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
}

/** The resolved attachable configuration. */
export interface ResolvedAttachableConfig {
  identifier: string;
  materials: Record<string, string>;
  textures: Record<string, string>;
  geometry: Record<string, string>;
  animations: Record<string, string>;
  initialize: string[];
  preAnimation: string[];
  scriptsAnimate: Array<string | { [shortname: string]: Molang }>;
  renderControllers: string[];
  formatVersion: string;
}

export class Attachable {
  readonly config: ResolvedAttachableConfig;

  constructor(config: AttachableConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Attachable requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      materials: config.materials ?? {},
      textures: config.textures ?? {},
      geometry: config.geometry ?? {},
      animations: config.animations ?? {},
      initialize: config.initialize ?? [],
      preAnimation: config.preAnimation ?? [],
      scriptsAnimate: config.scriptsAnimate ?? [],
      renderControllers: config.renderControllers ?? [],
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The attachable identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The file base name (`<shortName>.json`). */
  get fileName(): string {
    const idx = this.identifier.indexOf(':');
    const short = idx >= 0 ? this.identifier.slice(idx + 1) : this.identifier;
    return `${short}.json`;
  }

  /** Builds the full attachable JSON. */
  buildJson(): object {
    const desc: Record<string, unknown> = {
      identifier: this.identifier,
    };
    if (Object.keys(this.config.materials).length > 0) {
      desc.materials = this.config.materials;
    }
    if (Object.keys(this.config.textures).length > 0) {
      desc.textures = this.config.textures;
    }
    if (Object.keys(this.config.geometry).length > 0) {
      desc.geometry = this.config.geometry;
    }
    if (Object.keys(this.config.animations).length > 0) {
      desc.animations = this.config.animations;
    }

    const scripts: Record<string, unknown> = {};
    if (this.config.initialize.length > 0) scripts.initialize = this.config.initialize;
    if (this.config.preAnimation.length > 0) scripts.pre_animation = this.config.preAnimation;
    if (this.config.scriptsAnimate.length > 0) scripts.animate = this.config.scriptsAnimate;
    if (Object.keys(scripts).length > 0) desc.scripts = scripts;

    if (this.config.renderControllers.length > 0) {
      desc.render_controllers = this.config.renderControllers;
    }

    return {
      format_version: this.config.formatVersion,
      'minecraft:attachable': {
        description: desc,
      },
    };
  }
}