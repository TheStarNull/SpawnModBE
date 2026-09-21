/**
 * The `FrameSequence` class — generates a multi-frame texture animation for an
 * entity (frame-sequence sprite playback).
 *
 * This is the "entity texture frame sequence" technique:
 *  - N texture entries (`texture.frame0` ... `texture.frameN-1`) are registered.
 *  - A render controller arrays `textures` and samples by `query.anim_time`,
 *    so the entity plays the frames in sequence like a flipbook.
 *
 * It produces:
 *  - the atlas entries (for `Resource.addItemTextureAtlas` / an existing atlas)
 *  - the render-controller JSON (for `Resource.addRenderController`)
 *  - an optional set of placeholder frame PNGs (via `Resource.addFrameTextures`)
 *
 * Based on the exact format used in the 銀弑の刃 sword animation (20-frame
 * texture array + `array.sword[(query.anim_time * 10)]` sampling).
 */

/** A single frame's texture name + path. */
export interface FrameSpec {
  /** The texture shortname (e.g. `texture.frame0`). */
  textureName: string;
  /** The RP texture path (no `.png`), e.g. `textures/entity/sword/frame0`. */
  texturePath: string;
}

/** Configuration accepted by {@link FrameSequence}. */
export interface FrameSequenceConfig {
  /** The render-controller identifier, e.g. `'controller.render.animated_item'`. */
  controllerId: string;
  /** The geometry shortname the controller uses (e.g. `'geometry.default'`). */
  geometry: string;
  /** The material shortnames used (e.g. `'entity_alphatest'`). */
  material?: string;
  /**
   * The material binding for the default state, e.g. `'material.default'`.
   * Defaults to `'material.default'`.
   */
  materialBinding?: string;
  /** The texture array name inside the RC (e.g. `'array.frames'`). */
  arrayName?: string;
  /**
   * A Molang expression that indexes into the array, using `query.anim_time`.
   * e.g. `'array.frames[query.anim_time * 10]'`. The default derives indexes
   * from `query.anim_time` with a configured fps.
   */
  sampleExpression?: string;
  /** The texture shortnames for each frame. Defaults to `texture.frame0..N-1`. */
  frameTextures?: string[];
  /**
   * The RP texture paths (no `.png`) for each frame. Defaults to
   * `textures/entity/<shortName>/frame<i>`. Used by `buildTexturesMap` and
   * `Resource.addFrameTextures`.
   */
  frameTexturePaths?: string[];
  /** The render controller's `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
}

/** The resolved frame-sequence configuration. */
export interface ResolvedFrameSequenceConfig {
  controllerId: string;
  geometry: string;
  material: string;
  materialBinding: string;
  arrayName: string;
  sampleExpression: string;
  frameTextures: string[];
  frameTexturePaths: string[];
  formatVersion: string;
}

export class FrameSequence {
  readonly config: ResolvedFrameSequenceConfig;

  constructor(config: FrameSequenceConfig) {
    if (!config || typeof config.controllerId !== 'string' || config.controllerId.trim() === '') {
      throw new Error('FrameSequence requires a non-empty "controllerId".');
    }
    if (!config.geometry) {
      throw new Error('FrameSequence requires a "geometry" shortname.');
    }
    const frameCount = config.frameTextures?.length ?? 0;
    if (frameCount === 0) {
      throw new Error('FrameSequence requires at least one frame texture.');
    }

    const arrayName = config.arrayName ?? 'array.frames';
    const fps = 10; // frames per second at which anim_time is sampled (vanilla sword style)
    const sampleExpression =
      config.sampleExpression ??
      `${arrayName}[math.floor(query.anim_time * ${fps}) % ${frameCount}]`;

    // Default frame texture names/paths:
    // texture.frame0..N-1  and  textures/entity/<shortName>/frame0..N-1 (no .png)
    const shortId = FrameSequence.shortId(config.controllerId);
    const defaultNames: string[] = [];
    const defaultPaths: string[] = [];
    for (let i = 0; i < frameCount; i++) {
      defaultNames.push(`texture.frame${i}`);
      defaultPaths.push(`textures/entity/${shortId}/frame${i}`);
    }

    this.config = {
      controllerId: config.controllerId,
      geometry: config.geometry,
      material: config.material ?? 'entity_alphatest',
      materialBinding: config.materialBinding ?? 'material.default',
      arrayName,
      sampleExpression,
      frameTextures: config.frameTextures ?? defaultNames,
      frameTexturePaths: config.frameTexturePaths ?? defaultPaths,
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** Extracts a short id (last dotted segment) from a controller/entity id. */
  private static shortId(controllerId: string): string {
    const idx = controllerId.lastIndexOf('.');
    return idx >= 0 ? controllerId.slice(idx + 1) : controllerId;
  }

  /** The number of frames. */
  get frameCount(): number {
    return this.config.frameTextures.length;
  }

  /**
   * Builds the render-controller JSON that plays the frame sequence.
   */
  buildRenderControllerJson(): object {
    return {
      format_version: this.config.formatVersion,
      render_controllers: {
        [this.config.controllerId]: {
          arrays: {
            textures: {
              [this.config.arrayName]: this.config.frameTextures,
            },
          },
          geometry: this.config.geometry,
          materials: [
            {
              '*': this.config.materialBinding,
            },
          ],
          textures: [this.config.sampleExpression],
          filter_lighting: true,
        },
      },
    };
  }

  /** The render-controller file name (`<shortName>.rc.json`). */
  get fileName(): string {
    const idx = this.config.controllerId.lastIndexOf('.');
    const short = idx >= 0 ? this.config.controllerId.slice(idx + 1) : this.config.controllerId;
    return `${short}.rc.json`;
  }

  /**
   * The per-frame `textures` map for the entity's client definition, keyed by
   * texture shortname. e.g. `{ texture.frame0: 'textures/entity/x/frame0', ... }`.
   */
  buildTexturesMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (let i = 0; i < this.config.frameTextures.length; i++) {
      map[this.config.frameTextures[i]] = this.config.frameTexturePaths[i] ?? this.config.frameTextures[i];
    }
    return map;
  }

  /**
   * The ordered frame specs `[{ textureName, texturePath }, ...]` — useful for
   * wiring into an `ItemTextureAtlas` (texture_data) or writing placeholder PNGs.
   */
  buildFrames(): FrameSpec[] {
    return this.config.frameTextures.map((name, i) => ({
      textureName: name,
      texturePath: this.config.frameTexturePaths[i] ?? name,
    }));
  }
}