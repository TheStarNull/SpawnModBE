/**
 * The `EntityRP` class — describes a resource-pack (client) entity definition.
 *
 * A resource-pack entity file (RP/entity/<id>.entity.json) holds references to
 * the visual assets of the entity: materials, textures, geometry, render
 * controllers, animations, scripts, spawn egg, etc. The keys are mostly
 * "shortname definitions" that map a short name to an asset.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/entities/entity-intro-rp
 *
 * @example
 * ```ts
 * const goblinRP = new EntityRP({
 *   identifier: 'mymod:goblin',
 *   materials: { default: 'entity_alphatest' },
 *   textures: { default: 'textures/entity/goblin' },
 *   geometry: { default: 'geometry.goblin' },
 *   renderControllers: ['controller.render.goblin'],
 *   spawnEgg: { base_color: '#2e6b2e', overlay_color: '#6b2e2e' },
 * });
 * rp.addClientEntity(goblinRP);
 * ```
 */

/** A color string (`#rrggbb`) or Minecraft color name. */
export type EggColor = string;

/** Configuration accepted by {@link EntityRP}. */
export interface EntityRPConfig {
  /** The entity identifier (must match the BP entity). */
  identifier: string;
  /** Material shortname definitions, e.g. `{ default: 'entity_alphatest' }`. */
  materials?: Record<string, string>;
  /** Texture shortname definitions, e.g. `{ default: 'textures/entity/goblin' }`. */
  textures?: Record<string, string>;
  /** Geometry shortname definitions, e.g. `{ default: 'geometry.goblin' }`. */
  geometry?: Record<string, string>;
  /** Render controller identifiers used by this entity. */
  renderControllers?: string[];
  /** Animation shortname definitions. */
  animations?: Record<string, string>;
  /** Animation controller shortnames. */
  animationControllers?: Record<string, string>;
  /** Molang scripts (initialize/pre_animation/animate/scale). */
  scripts?: {
    initialize?: string[];
    pre_animation?: string[];
    animate?: Array<string | Record<string, unknown>>;
    scale?: string | number;
    scaleX?: string | number;
    scaleY?: string | number;
    scaleZ?: string | number;
  };
  /** Sound effect shortnames. */
  soundEffects?: Record<string, string>;
  /** Particle effect shortnames. */
  particleEffects?: Record<string, string>;
  /** Spawn egg settings (omit to skip). */
  spawnEgg?: {
    /** Solid base color (`#rrggbb`). */
    base_color?: EggColor;
    /** Overlay / spots color. */
    overlay_color?: EggColor;
    /** A texture shortname (from item_texture.json) instead of colors. */
    texture?: string;
  };
  /** Whether attachables can be attached to this entity. Defaults to `true`. */
  enableAttachables?: boolean;
  /** Whether to hide armor when the entity wears it. Defaults to `false`. */
  hideArmor?: boolean;
  /** The manifest `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
}

/** The resolved entity resource-pack configuration (all fields filled in). */
export interface ResolvedEntityRPConfig {
  identifier: string;
  materials: Record<string, string>;
  textures: Record<string, string>;
  geometry: Record<string, string>;
  renderControllers: string[];
  animations: Record<string, string>;
  animationControllers: Record<string, string>;
  scripts: EntityRPConfig['scripts'];
  soundEffects: Record<string, string>;
  particleEffects: Record<string, string>;
  spawnEgg: EntityRPConfig['spawnEgg'];
  enableAttachables: boolean;
  hideArmor: boolean;
  formatVersion: string;
}

export class EntityRP {
  readonly config: ResolvedEntityRPConfig;

  constructor(config: EntityRPConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('EntityRP requires a non-empty "identifier".');
    }
    this.config = {
      ...config,
      materials: config.materials ?? {},
      textures: config.textures ?? {},
      geometry: config.geometry ?? {},
      renderControllers: config.renderControllers ?? [],
      animations: config.animations ?? {},
      animationControllers: config.animationControllers ?? {},
      scripts: config.scripts,
      soundEffects: config.soundEffects ?? {},
      particleEffects: config.particleEffects ?? {},
      spawnEgg: config.spawnEgg,
      enableAttachables: config.enableAttachables ?? true,
      hideArmor: config.hideArmor ?? false,
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The entity identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The file base name (`<shortName>.entity.json`). */
  get fileName(): string {
    const idx = this.identifier.indexOf(':');
    const short = idx >= 0 ? this.identifier.slice(idx + 1) : this.identifier;
    return `${short}.entity.json`;
  }

  /** Builds the full resource-pack client-entity JSON. */
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
    if (this.config.renderControllers.length > 0) {
      desc.render_controllers = this.config.renderControllers;
    }
    if (Object.keys(this.config.animations).length > 0) {
      desc.animations = this.config.animations;
    }
    if (Object.keys(this.config.animationControllers).length > 0) {
      desc.animation_controllers = this.config.animationControllers;
    }
    if (this.config.scripts) {
      desc.scripts = { ...this.config.scripts };
    }
    if (Object.keys(this.config.soundEffects).length > 0) {
      desc.sound_effects = this.config.soundEffects;
    }
    if (Object.keys(this.config.particleEffects).length > 0) {
      desc.particle_effects = this.config.particleEffects;
    }
    if (this.config.spawnEgg) {
      desc.spawn_egg = { ...this.config.spawnEgg };
    }
    if (this.config.enableAttachables === false) desc.enable_attachables = false;
    if (this.config.hideArmor) desc.hide_armor = true;

    return {
      format_version: this.config.formatVersion,
      'minecraft:client_entity': {
        description: desc,
      },
    };
  }
}