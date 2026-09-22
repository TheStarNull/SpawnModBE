/**
 * The `Particle` class — a behavior-pack particle effect generator.
 *
 * Particles live at BP/particles/<shortName>.json and are wrapped in a
 * `particle_effect` node. This class keeps the high-frequency render fields
 * strongly typed and lets the rest flow through a loose `components` object.
 */
import { shortName } from '../util.js';

/** Configuration accepted by {@link Particle}. */
export interface ParticleConfig {
  /** The particle identifier, e.g. `'mymod:ruby_spark'`. */
  identifier: string;
  /** The render texture path (default `'textures/particle/particles'`). */
  texture?: string;
  /** The render material (default `'particles_alpha'`). */
  material?: string;
  /** Loose emitter / lifetime / shape / appearance components. */
  components?: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.10.0'`). */
  formatVersion?: string;
}

/** The resolved particle configuration (all defaults filled in). */
export interface ResolvedParticleConfig {
  identifier: string;
  texture: string;
  material: string;
  components: Record<string, unknown>;
  formatVersion: string;
}

/** Options accepted by {@link billboard}. */
export interface BillboardOptions {
  /** Texture UV rectangle `[u, v, width, height]`. */
  uv?: [number, number, number, number];
  /** Texture UV size `[width, height]`. */
  textureSize?: [number, number];
  /** Face mode, e.g. `'camera_emitter'` (default `'rotate_xyz'`). */
  orientation?: string;
}

/** Builds a `minecraft:emitter_rate_instant` component. */
export function emitterRateInstant(numParticles: number): Record<string, unknown> {
  return { 'minecraft:emitter_rate_instant': { num_particles: numParticles } };
}

/** Builds a `minecraft:emitter_rate_steady` component. */
export function emitterRateSteady(rate: number, maxParticles: number): Record<string, unknown> {
  return { 'minecraft:emitter_rate_steady': { rate, max_particles: maxParticles } };
}

/** Builds a `minecraft:emitter_lifetime_once` component. */
export function emitterLifetimeOnce(activeTime: number): Record<string, unknown> {
  return { 'minecraft:emitter_lifetime_once': { active_time: activeTime } };
}

/** Builds a `minecraft:emitter_lifetime_looping` component. */
export function emitterLifetimeLooping(activeTime: number, sleepTime?: number): Record<string, unknown> {
  const body: Record<string, unknown> = { active_time: activeTime };
  if (sleepTime !== undefined) body.sleep_time = sleepTime;
  return { 'minecraft:emitter_lifetime_looping': body };
}

/** Builds a `minecraft:emitter_shape_point` component. */
export function emitterShapePoint(offset: [number, number, number]): Record<string, unknown> {
  return { 'minecraft:emitter_shape_point': { offset: [...offset] } };
}

/** Options accepted by {@link emitterShapeSphere}. */
export interface EmitterShapeSphereOptions { direction?: 'inward' | 'outward'; axis?: string; }

/** Builds a `minecraft:emitter_shape_sphere` component. */
export function emitterShapeSphere(radius: number, options?: EmitterShapeSphereOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { radius: radius, direction: options?.direction ?? 'inward' };
  if (options?.axis) body.axis = options.axis;
  return { 'minecraft:emitter_shape_sphere': body };
}

/** Builds a `minecraft:particle_lifetime_expression` component. */
export function particleLifetime(maxLifetime: number): Record<string, unknown> {
  return { 'minecraft:particle_lifetime_expression': { max_lifetime: maxLifetime } };
}

/** Builds a `minecraft:particle_appearance_billboard` component. */
export function billboard(size: [number, number], options?: BillboardOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    size: size.map((n) => [n, n]),
    facing_camera_mode: options?.orientation ?? 'rotate_xyz',
  };
  const w = options?.textureSize?.[0] ?? size[0] * 16;
  const h = options?.textureSize?.[1] ?? size[1] * 16;
  body.uv = { texture_width: w, texture_height: h, uv: options?.uv ?? [0, 0, size[0], size[1]] };
  return { 'minecraft:particle_appearance_billboard': body };
}

/** Builds a `minecraft:particle_appearance_tinting` component. */
export function tint(color: string | [number, number, number, number]): Record<string, unknown> {
  const value = typeof color === 'string' ? color : { r: color[0], g: color[1], b: color[2], a: color[3] };
  return { 'minecraft:particle_appearance_tinting': { color: value } };
}

export class Particle {
  /** The fully-resolved configuration. */
  readonly config: ResolvedParticleConfig;

  constructor(config: ParticleConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Particle requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      texture: config.texture ?? 'textures/particle/particles',
      material: config.material ?? 'particles_alpha',
      components: { ...(config.components ?? {}) },
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The particle identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  /** Builds the particle-effect JSON. */
  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      particle_effect: {
        description: {
          identifier: this.identifier,
          basic_render_parameters: { material: this.config.material, texture: this.config.texture },
        },
        components: { ...this.config.components },
      },
    };
  }
}
