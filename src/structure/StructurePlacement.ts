/**
 * The `StructurePlacement` class — a behavior-pack structure placement feature.
 *
 * It emits a `minecraft:structure_template_feature` JSON (BP `features/`) that
 * references a structure by `structure_name` so the structure can be placed in
 * the world (e.g. via a feature rule or a `/placefeature` command).
 */

import { shortName } from '../util.js';

/** The rotation / mirror transform applied when placing the structure. */
export interface StructureTransform {
  /** Rotation in degrees (one of `0 | 90 | 180 | 270`). */
  rotation?: 0 | 90 | 180 | 270;
  /** Mirror direction (one of `'none' | 'x' | 'z' | 'xz'`). */
  mirror?: 'none' | 'x' | 'z' | 'xz';
}

/** Configuration accepted by {@link StructurePlacement}. */
export interface StructurePlacementConfig {
  /** The feature identifier, e.g. `'mymod:castle_placement'`. */
  identifier: string;
  /** The referenced structure id (defaults to `identifier`). */
  structureName?: string;
  /** The structure adjustment radius (default `8`). */
  adjustmentRadius?: number;
  /** Rotation / mirror transform to apply. */
  transform?: StructureTransform;
  /** Commands run when the structure is initialized. */
  structureAnimationInitializationCommands?: string[];
  /** Commands run on each tick of the structure animation. */
  structureAnimationTickCommands?: string[];
  /** The manifest `format_version` (default `'1.13.0'`). */
  formatVersion?: string;
}

/** The resolved structure-placement configuration (all defaults filled in). */
export interface ResolvedStructurePlacementConfig {
  identifier: string;
  structureName: string;
  adjustmentRadius: number;
  transform: StructureTransform;
  structureAnimationInitializationCommands: string[];
  structureAnimationTickCommands: string[];
  formatVersion: string;
}

export class StructurePlacement {
  /** The fully-resolved configuration. */
  readonly config: ResolvedStructurePlacementConfig;

  constructor(config: StructurePlacementConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('StructurePlacement requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      structureName: config.structureName ?? config.identifier,
      adjustmentRadius: config.adjustmentRadius ?? 8,
      transform: { ...(config.transform ?? {}) },
      structureAnimationInitializationCommands: [...(config.structureAnimationInitializationCommands ?? [])],
      structureAnimationTickCommands: [...(config.structureAnimationTickCommands ?? [])],
      formatVersion: config.formatVersion ?? '1.13.0',
    };
  }

  /** The feature identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  /** Builds the `minecraft:structure_template_feature` JSON. */
  buildJson(): Record<string, unknown> {
    const feature: Record<string, unknown> = {
      structure_name: this.config.structureName,
      adjustment_radius: this.config.adjustmentRadius,
    };
    if (this.config.transform.rotation !== undefined) feature.rotation = this.config.transform.rotation;
    if (this.config.transform.mirror !== undefined) feature.mirror = this.config.transform.mirror;
    if (this.config.structureAnimationInitializationCommands.length > 0) {
      feature.structure_animation_initialization_commands = this.config.structureAnimationInitializationCommands;
    }
    if (this.config.structureAnimationTickCommands.length > 0) {
      feature.structure_animation_tick_commands = this.config.structureAnimationTickCommands;
    }
    return {
      format_version: this.config.formatVersion,
      'minecraft:structure_template_feature': {
        description: { identifier: this.config.identifier },
        ...feature,
      },
    };
  }
}
