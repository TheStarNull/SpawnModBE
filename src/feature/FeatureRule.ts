import { shortName } from '../util.js';

/** Distribution parameters for a feature rule. Config keys are camelCase; JSON uses snake_case. */
export interface FeatureRuleDistribution {
  iterations?: number;
  coordinateEvalOrder?: 'xyz' | 'zyx';
  x?: number | string;
  y?: number | string;
  z?: number | string;
  scatterChance?: number;
}

/** Configuration accepted by {@link FeatureRule}. */
export interface FeatureRuleConfig {
  identifier: string;
  placesFeature: string;
  placementPass?: string;
  biomeFilter?: unknown;
  distribution?: FeatureRuleDistribution;
  formatVersion?: string;
}

/** The resolved feature-rule configuration (defaults filled in). */
export interface ResolvedFeatureRuleConfig extends FeatureRuleConfig {
  placementPass: string;
  distribution: {
    iterations: number;
    coordinateEvalOrder: 'xyz' | 'zyx';
    x: number | string;
    y: number | string;
    z: number | string;
    scatterChance: number;
  };
  formatVersion: string;
}

export class FeatureRule {
  readonly config: ResolvedFeatureRuleConfig;

  constructor(config: FeatureRuleConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('FeatureRule requires a non-empty "identifier".');
    }
    if (!config.placesFeature || config.placesFeature.trim() === '') {
      throw new Error('FeatureRule requires a non-empty "placesFeature".');
    }
    const d = config.distribution ?? {};
    this.config = {
      ...config,
      placementPass: config.placementPass ?? 'surface_pass',
      distribution: {
        iterations: d.iterations ?? 1,
        coordinateEvalOrder: d.coordinateEvalOrder ?? 'xyz',
        x: d.x ?? 0,
        y: d.y ?? 'query.heightmap(variable.worldx, variable.worldz)',
        z: d.z ?? 0,
        scatterChance: d.scatterChance ?? 100,
      },
      formatVersion: config.formatVersion ?? '1.13.0',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    const d = this.config.distribution;
    const condition: Record<string, unknown> = {
      iterations: d.iterations,
      coordinate_eval_order: d.coordinateEvalOrder,
      x: d.x,
      y: d.y,
      z: d.z,
      scatter_chance: d.scatterChance,
    };
    if (this.config.biomeFilter !== undefined) {
      condition['minecraft:biome_filter'] = this.config.biomeFilter;
    }
    return {
      format_version: this.config.formatVersion,
      'minecraft:feature_rules': {
        description: { identifier: this.identifier },
        placement_pass: this.config.placementPass,
        condition,
      },
    };
  }
}
