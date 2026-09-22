import { shortName } from '../util.js';

/** A single distance-fog layer for one medium (air / water / lava). */
export interface FogDistanceLayer {
  fog_start: number;
  fog_end: number;
  fog_color: string;
  render_distance_type?: 'fixed' | 'render';
  transition_fog_start?: number;
  transition_fog_end?: number;
}

/** The resolved distance-fog layer (defaults filled in). */
export interface ResolvedFogDistanceLayer extends FogDistanceLayer { render_distance_type: 'fixed' | 'render'; }

/** Configuration accepted by {@link Fog}. */
export interface FogConfig {
  identifier: string;
  distance?: { air?: FogDistanceLayer; water?: FogDistanceLayer; lava?: FogDistanceLayer };
  volumetric?: Record<string, unknown>;
  formatVersion?: string;
}

/** The resolved fog configuration. */
export interface ResolvedFogConfig {
  identifier: string;
  distance?: { air?: ResolvedFogDistanceLayer; water?: ResolvedFogDistanceLayer; lava?: ResolvedFogDistanceLayer };
  volumetric: Record<string, unknown>;
  formatVersion: string;
}

function resolveLayer(layer: FogDistanceLayer | undefined): ResolvedFogDistanceLayer | undefined {
  if (!layer) return undefined;
  return { ...layer, render_distance_type: layer.render_distance_type ?? 'fixed' };
}

export class Fog {
  readonly config: ResolvedFogConfig;

  constructor(config: FogConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Fog requires a non-empty "identifier".');
    }
    const distance = config.distance
      ? {
          air: resolveLayer(config.distance.air),
          water: resolveLayer(config.distance.water),
          lava: resolveLayer(config.distance.lava),
        }
      : undefined;
    this.config = {
      identifier: config.identifier,
      distance,
      volumetric: { ...(config.volumetric ?? {}) },
      formatVersion: config.formatVersion ?? '1.16.100',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    const distance: Record<string, unknown> = {};
    const d = this.config.distance;
    if (d?.air) distance.air = this.buildLayer(d.air);
    if (d?.water) distance.water = this.buildLayer(d.water);
    if (d?.lava) distance.lava = this.buildLayer(d.lava);
    const settings: Record<string, unknown> = { description: { identifier: this.identifier } };
    if (Object.keys(distance).length > 0) settings.distance = distance;
    if (Object.keys(this.config.volumetric).length > 0) settings.volumetric = this.config.volumetric;
    return { format_version: this.config.formatVersion, 'minecraft:fog_settings': settings };
  }

  private buildLayer(layer: ResolvedFogDistanceLayer): Record<string, unknown> {
    const out: Record<string, unknown> = {
      fog_start: layer.fog_start,
      fog_end: layer.fog_end,
      fog_color: layer.fog_color,
      render_distance_type: layer.render_distance_type,
    };
    if (layer.transition_fog_start !== undefined) out.transition_fog_start = layer.transition_fog_start;
    if (layer.transition_fog_end !== undefined) out.transition_fog_end = layer.transition_fog_end;
    return out;
  }
}
