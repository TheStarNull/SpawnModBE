/**
 * The `Animation` class — a behavior-pack skeletal animation generator.
 *
 * Entity animation files live at BP/animations/<shortName>.json and wrap a
 * single animation under an `animations` node keyed by the animation
 * identifier (e.g. `animation.mymod.wave`).
 */

/** Strips a longer key down to its last path segment for the file name. */
export function animationShortName(identifier: string): string {
  const colon = identifier.indexOf(':');
  const core = colon >= 0 ? identifier.slice(colon + 1) : identifier;
  const parts = core.split('.').filter((p) => p.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : core;
}

/** Configuration accepted by {@link Animation}. */
export interface AnimationConfig {
  /**
   * The animation key / identifier, e.g. `'animation.mymod.wave'`. This is the
   * key under `animations` and is also used as the file name.
   */
  identifier: string;
  /** The animation length in seconds (written as `animation_length`). */
  animationLength?: number;
  /** Whether the animation loops (`loop`). */
  loop?: boolean;
  /** The `bones` / `molang` animation body (loose, passed through as-is). */
  body?: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.10.0'`). */
  formatVersion?: string;
}

/** The resolved animation configuration (all defaults filled in). */
export interface ResolvedAnimationConfig {
  identifier: string;
  loop: boolean;
  animationLength: number | undefined;
  body: Record<string, unknown>;
  formatVersion: string;
}

export class Animation {
  /** The fully-resolved configuration. */
  readonly config: ResolvedAnimationConfig;

  constructor(config: AnimationConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Animation requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      loop: config.loop ?? false,
      animationLength: config.animationLength,
      body: { ...(config.body ?? {}) },
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The animation identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier stripped to its last segment). */
  get fileName(): string { return `${animationShortName(this.identifier)}.json`; }

  /** Builds the animation JSON wrapped under the `animations` node. */
  buildJson(): Record<string, unknown> {
    const entry: Record<string, unknown> = { loop: this.config.loop };
    if (this.config.animationLength !== undefined) entry.animation_length = this.config.animationLength;
    Object.assign(entry, this.config.body);
    return {
      format_version: this.config.formatVersion,
      animations: { [this.identifier]: entry },
    };
  }
}
