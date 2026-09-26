/**
 * The `EntityModel` class — a resource-pack entity geometry model.
 *
 * Geometry files live at `RP/models/entity/<shortName>.json` and wrap one or
 * more `minecraft:geometry` entries (description + bones). Bones are passed
 * through loosely so any vanilla-style geometry (cubes, per-face UV objects,
 * `texture_meshes`, locators, etc.) can be reproduced without schema loss.
 */

import { shortName } from '../util.js';

/** Configuration accepted by {@link EntityModel}. */
export interface EntityModelConfig {
  /** The geometry identifier, e.g. `'geometry.sc'`. */
  identifier: string;
  /**
   * The geometry description fields (e.g. `texture_width`, `texture_height`,
   * `visible_bounds_width`, `visible_bounds_offset`). Passed through as-is.
   */
  description?: Record<string, unknown>;
  /** The model bones (loose bodies: `name`, `pivot`, `cubes`, `texture_meshes`…). */
  bones: Record<string, unknown>[];
  /** The manifest `format_version`. Defaults to `'1.16.0'`. */
  formatVersion?: string;
}

/** The resolved model configuration (defaults filled in). */
export interface ResolvedEntityModelConfig {
  identifier: string;
  description: Record<string, unknown>;
  bones: Record<string, unknown>[];
  formatVersion: string;
}

/** A resource-pack entity geometry model. */
export class EntityModel {
  /** The fully-resolved configuration. */
  readonly config: ResolvedEntityModelConfig;

  constructor(config: EntityModelConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('EntityModel requires a non-empty "identifier".');
    }
    if (!Array.isArray(config.bones)) {
      throw new Error('EntityModel requires a "bones" array.');
    }
    this.config = {
      identifier: config.identifier,
      description: { ...(config.description ?? {}) },
      bones: config.bones.map((b) => ({ ...b })),
      formatVersion: config.formatVersion ?? '1.16.0',
    };
  }

  /** The geometry identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The file base name (identifier stripped to its last segment, e.g. `sc.json`). */
  get fileName(): string {
    const parts = this.identifier.split('.').filter((p) => p.length > 0);
    return `${parts.length > 0 ? parts[parts.length - 1] : shortName(this.identifier)}.json`;
  }

  /** Builds the `models/entity/<shortName>.json` body. */
  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      'minecraft:geometry': [
        {
          description: { identifier: this.identifier, ...this.config.description },
          bones: this.config.bones,
        },
      ],
    };
  }
}
