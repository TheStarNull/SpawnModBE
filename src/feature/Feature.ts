import { shortName } from '../util.js';

/** Configuration accepted by {@link Feature}. */
export interface FeatureConfig {
  /** The feature identifier, e.g. `'mymod:ruby_ore'`. */
  identifier: string;
  /** The feature type key, e.g. `'minecraft:ore_feature'`. */
  type: string;
  /** Type-specific payload (count / replace_rules / canopy ...). */
  body: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.13.0'`). */
  formatVersion?: string;
}

/** The resolved feature configuration. */
export interface ResolvedFeatureConfig extends FeatureConfig { formatVersion: string; }

export class Feature {
  readonly config: ResolvedFeatureConfig;

  constructor(config: FeatureConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Feature requires a non-empty "identifier".');
    }
    if (!config.type || config.type.trim() === '') {
      throw new Error('Feature requires a non-empty "type".');
    }
    this.config = { ...config, formatVersion: config.formatVersion ?? '1.13.0' };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      [this.config.type]: {
        description: { identifier: this.identifier },
        ...this.config.body,
      },
    };
  }
}

/** Builds an ore feature ({@link Feature}) from common options. */
export function oreFeature(config: {
  identifier: string;
  count: number;
  replaceRules: Array<{ placesBlock: string; mayReplace?: string[] }>;
  formatVersion?: string;
}): Feature {
  return new Feature({
    identifier: config.identifier,
    type: 'minecraft:ore_feature',
    body: {
      count: config.count,
      replace_rules: config.replaceRules.map((r) => ({
        places_block: r.placesBlock,
        ...(r.mayReplace ? { may_replace: r.mayReplace } : {}),
      })),
    },
    formatVersion: config.formatVersion,
  });
}

/** Builds a single-block feature ({@link Feature}) from common options. */
export function singleBlockFeature(config: {
  identifier: string;
  placesBlock: string;
  mayReplace?: string[];
  formatVersion?: string;
}): Feature {
  const body: Record<string, unknown> = { places_block: config.placesBlock };
  if (config.mayReplace) body.may_replace = config.mayReplace;
  return new Feature({ identifier: config.identifier, type: 'minecraft:single_block_feature', body, formatVersion: config.formatVersion });
}
