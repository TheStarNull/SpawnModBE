import { shortName } from '../util.js';

/** Configuration accepted by {@link Biome}. */
export interface BiomeConfig {
  /** The biome identifier, e.g. `'mymod:ruby_plains'`. */
  identifier: string;
  /** Loose biome components (climate / surface_parameters / tags ...). */
  components?: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.13.0'`). */
  formatVersion?: string;
}

/** The resolved biome configuration. */
export interface ResolvedBiomeConfig { identifier: string; components: Record<string, unknown>; formatVersion: string; }

/** Options accepted by {@link climate}. */
export interface ClimateOptions { humidity?: number; temperatureModifier?: 'frozen' | 'none'; }

/** Builds a `minecraft:climate` component. */
export function climate(temperature: number, downfall: number, options?: ClimateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { temperature, downfall };
  if (options?.humidity !== undefined) body.humidity = options.humidity;
  if (options?.temperatureModifier !== undefined) body.temperature_modifier = options.temperatureModifier;
  return { 'minecraft:climate': body };
}

/** Builds a `minecraft:surface_parameters` component. */
export function surfaceParameters(config: { top: string; mid: string; sea: string; foundation: string }): Record<string, unknown> {
  return {
    'minecraft:surface_parameters': {
      top_material: config.top,
      mid_material: config.mid,
      sea_material: config.sea,
      foundation_material: config.foundation,
    },
  };
}

/** Builds a `minecraft:tags` component. */
export function biomeTags(...tags: string[]): Record<string, unknown> {
  return { 'minecraft:tags': { tags: [...tags] } };
}

export class Biome {
  readonly config: ResolvedBiomeConfig;

  constructor(config: BiomeConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Biome requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      components: { ...(config.components ?? {}) },
      formatVersion: config.formatVersion ?? '1.13.0',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      'minecraft:biome': {
        description: { identifier: this.identifier },
        components: { ...this.config.components },
      },
    };
  }
}
