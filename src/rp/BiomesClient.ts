/**
 * The `BiomesClient` class — generates `RP/biomes_client.json`.
 *
 * `biomes_client.json` is the resource-pack file that maps every biome to its
 * CLIENT-side visuals: which fog applies (`fog_identifier`), sky / water /
 * grass / foliage colors, ambient particles, fall-dust color, ambient light
 * and biome music.
 *
 * It complements the {@link Fog} generator: `Fog` writes the fog *definitions*
 * into `RP/fogs/*.json`, while `BiomesClient` is the file that *assigns* those
 * fog settings to (custom) biomes. Without it a custom biome keeps looking at
 * the vanilla fog / colors.
 *
 * Format (vanilla `biomes_client.json`):
 * ```json
 * { "biomes": { "mymod:ruby_plains": { "fog_identifier": "mymod:ruby_fog" } } }
 * ```
 *
 * @example
 * ```ts
 * import { BiomesClient, Fog } from 'spawnmodbe';
 *
 * const rubyFog = new Fog({
 *   identifier: 'mymod:ruby_fog',
 *   distance: { air: { fog_start: 0, fog_end: 100, fog_color: '#FFAAAA' } },
 * });
 * const client = new BiomesClient({
 *   biomes: {
 *     'mymod:ruby_plains': {
 *       fogIdentifier: rubyFog.identifier,
 *       skyColor: '#66aaff',
 *       waterColor: '#2244aa',
 *       particle: { probability: 0.05, particle: 'mymod:ruby_spark', particleColor: [255, 0, 0] },
 *     },
 *   },
 * });
 * rp.addFog(rubyFog);
 * rp.addBiomesClient(client); // → RP/biomes_client.json
 * ```
 */

import type { Fog } from '../fog/index.js';

/** The pack-relative path of the generated file. */
export const BIOMES_CLIENT_PATH = 'biomes_client.json';

/** A hex color literal accepted by the game, e.g. `'#66aaff'`. */
export type ClientColor = string;

/** Ambient particle settings for a biome. */
export interface BiomeClientParticle {
  /** Spawn probability 0–1 (each tick). */
  probability?: number;
  /** A fully-resolved particle identifier (e.g. `'minecraft:ash_particle'`). */
  particle?: string;
  /** Particle tint as `[r, g, b]` (0–255). */
  particleColor?: [number, number, number];
}

/** Per-biome CLIENT-side visual overrides for `biomes_client.json`. */
export interface BiomeClientEntry {
  /**
   * The resource-pack fog to apply to this biome. This is the
   * `minecraft:fog_settings` identifier of a {@link Fog} (or a vanilla
   * fog identifier like `'minecraft:fog_plains'`).
   */
  fogIdentifier?: string;
  /** Extra fog identifiers to stack on top of `fog_identifier`. */
  fogIds?: string[];
  /** Underwater fog color, `#RRGGBB`. */
  waterFogColor?: ClientColor;
  /** Distance at which underwater fog ends. */
  waterFogDistance?: number;
  /** Sky color, `#RRGGBB`. */
  skyColor?: ClientColor;
  /** Water color, `#RRGGBB`. */
  waterColor?: ClientColor;
  /** Also write `override_water_color` (default `true` when `waterColor` set). */
  overrideWaterColor?: boolean;
  /** Grass color, `#RRGGBB`. */
  grassColor?: ClientColor;
  /** Also write `override_grass_color` (default `true` when `grassColor` set). */
  overrideGrassColor?: boolean;
  /** Foliage color, `#RRGGBB`. */
  foliageColor?: ClientColor;
  /** Also write `override_foliage_color` (default `true` when `foliageColor` set). */
  overrideFoliageColor?: boolean;
  /** Color of the block fall / break dust particles, `#RRGGBB`. */
  fallDustColor?: ClientColor;
  /** Ambient light multiplier applied inside the biome. */
  ambientLight?: number;
  /** Ambient particle effect shown in the biome (e.g. cherry-blossom petals). */
  particle?: BiomeClientParticle;
  /** Music to play while in the biome (a sound event from `sound_definitions`). */
  biomeMusic?: string;
  /** Volume for `biomeMusic` (0–1). */
  biomeMusicVolume?: number;
}

/** A resolved `biomes_client.json` entry (loose map for forward compatibility). */
export type ResolvedBiomeClientEntry = Record<string, unknown>;

/**
 * Renders a camelCase {@link BiomeClientEntry} into the snake_case keys the
 * game expects (or `{}` when `entry` is `undefined`).
 */
export function buildBiomeClientEntry(entry: BiomeClientEntry | undefined): ResolvedBiomeClientEntry {
  if (!entry) return {};
  const out: ResolvedBiomeClientEntry = {};

  if (entry.fogIdentifier !== undefined) out.fog_identifier = entry.fogIdentifier;
  if (entry.fogIds !== undefined) out.fog_ids = [...entry.fogIds];
  if (entry.waterFogColor !== undefined) out.water_fog_color = entry.waterFogColor;
  if (entry.waterFogDistance !== undefined) out.water_fog_distance = entry.waterFogDistance;
  if (entry.skyColor !== undefined) out.sky_color = entry.skyColor;

  if (entry.waterColor !== undefined) {
    out.water_color = entry.waterColor;
    out.override_water_color = entry.overrideWaterColor ?? true;
  } else if (entry.overrideWaterColor !== undefined) {
    out.override_water_color = entry.overrideWaterColor;
  }

  if (entry.grassColor !== undefined) {
    out.grass_color = entry.grassColor;
    out.override_grass_color = entry.overrideGrassColor ?? true;
  } else if (entry.overrideGrassColor !== undefined) {
    out.override_grass_color = entry.overrideGrassColor;
  }

  if (entry.foliageColor !== undefined) {
    out.foliage_color = entry.foliageColor;
    out.override_foliage_color = entry.overrideFoliageColor ?? true;
  } else if (entry.overrideFoliageColor !== undefined) {
    out.override_foliage_color = entry.overrideFoliageColor;
  }

  if (entry.fallDustColor !== undefined) out.fall_dust_color = entry.fallDustColor;
  if (entry.ambientLight !== undefined) out.ambient_light = entry.ambientLight;

  if (entry.particle !== undefined) {
    const p: Record<string, unknown> = {};
    if (entry.particle.probability !== undefined) p.probability = entry.particle.probability;
    if (entry.particle.particle !== undefined) p.particle = entry.particle.particle;
    if (entry.particle.particleColor !== undefined) {
      p.particle_color = [...entry.particle.particleColor];
    }
    out.particle = p;
  }

  if (entry.biomeMusic !== undefined) out.biome_music = entry.biomeMusic;
  if (entry.biomeMusicVolume !== undefined) out.biome_music_volume = entry.biomeMusicVolume;

  return out;
}

/** Configuration accepted by {@link BiomesClient}. */
export interface BiomesClientConfig {
  /** Biome identifier → client-side visual overrides. */
  biomes: Record<string, BiomeClientEntry>;
}

export class BiomesClient {
  /** The resolved configuration (entries shallow-copied). */
  readonly config: BiomesClientConfig;

  constructor(config: BiomesClientConfig) {
    if (
      !config ||
      typeof config !== 'object' ||
      !config.biomes ||
      typeof config.biomes !== 'object'
    ) {
      throw new Error('BiomesClient requires a non-empty "biomes" object.');
    }
    const biomes: Record<string, BiomeClientEntry> = {};
    for (const [id, entry] of Object.entries(config.biomes)) {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new Error('BiomesClient requires biome ids to be non-empty strings.');
      }
      biomes[id] = { ...entry };
    }
    this.config = { biomes };
  }

  /** The biome identifiers registered in this client file. */
  get biomeIds(): string[] {
    return Object.keys(this.config.biomes);
  }

  /** The pack-relative path of the generated file (`biomes_client.json`). */
  get filePath(): string {
    return BIOMES_CLIENT_PATH;
  }

  /**
   * Sets (or replaces) the client entry for a biome. Returns `this` for
   * chaining.
   */
  set(biomeId: string, entry: BiomeClientEntry): this {
    if (!biomeId || biomeId.trim() === '') {
      throw new Error('BiomesClient.set requires a non-empty biome id.');
    }
    this.config.biomes[biomeId] = { ...entry };
    return this;
  }

  /**
   * Convenience: assigns a fog to a biome (accepts a {@link Fog} instance or a
   * raw fog identifier). Returns `this` for chaining.
   */
  setFog(biomeId: string, fog: string | Fog): this {
    const fogId = typeof fog === 'string' ? fog : fog.identifier;
    const current = this.config.biomes[biomeId] ?? {};
    this.config.biomes[biomeId] = { ...current, fogIdentifier: fogId };
    return this;
  }

  /** Removes a biome entry. Returns `true` when it existed. */
  remove(biomeId: string): boolean {
    if (!(biomeId in this.config.biomes)) return false;
    return delete this.config.biomes[biomeId];
  }

  /** Builds the raw `{ "biomes": {...} }` JSON object for `biomes_client.json`. */
  buildJson(): Record<string, unknown> {
    const biomes: Record<string, unknown> = {};
    for (const [id, entry] of Object.entries(this.config.biomes)) {
      biomes[id] = buildBiomeClientEntry(entry);
    }
    return { biomes };
  }

  /** Returns the pretty-printed `biomes_client.json` content. */
  toString(): string {
    return JSON.stringify(this.buildJson(), null, 2);
  }
}