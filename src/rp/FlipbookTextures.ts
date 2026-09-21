/**
 * The `FlipbookTextures` class — generates animated (flipbook) block textures.
 *
 * Flipbook textures map a `terrain_texture.json` shortname to animation
 * parameters stored in `RP/textures/flipbook_textures.json`. Minecraft applies
 * these animated textures to blocks whose `material_instances` use the shortname.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/blocks/flipbook-textures
 *
 * @example
 * ```ts
 * const magmaFlip = new FlipbookTextures({
 *   atlasTile: 'magma',
 *   flipbookTexture: 'textures/blocks/magma',
 *   ticksPerFrame: 10,
 * });
 * rp.addFlipbookTexture(magmaFlip);
 * ```
 */

/** A single flipbook texture animation entry. */
export interface FlipbookTexturesConfig {
  /** The shortname defined in `terrain_texture.json` (e.g. `'magma'`). */
  atlasTile: string;
  /** The path to the animated texture (e.g. `'textures/blocks/magma'`). */
  flipbookTexture: string;
  /** The index of the texture array inside that shortname's definition. */
  atlasIndex?: number;
  /** The variant of the block's texture array (0-based). */
  atlasTileVariant?: number;
  /** How fast frames change. 20 ticks = 1 second. Defaults to `10`. */
  ticksPerFrame?: number;
  /** Frame index list, or the total number of frames to repeat. */
  frames?: number | number[];
  /** Sets the size of pixels. Defaults to `1`. */
  replicate?: number;
  /** Whether frame transitions are smooth. Defaults to `true`. */
  blendFrames?: boolean;
}

export class FlipbookTextures {
  readonly config: FlipbookTexturesConfig;

  constructor(config: FlipbookTexturesConfig) {
    if (!config || !config.atlasTile || !config.flipbookTexture) {
      throw new Error('FlipbookTextures requires "atlasTile" and "flipbookTexture".');
    }
    this.config = {
      ...config,
      ticksPerFrame: config.ticksPerFrame ?? 10,
      blendFrames: config.blendFrames ?? true,
    };
  }

  /** Builds the flipbook entry JSON object. */
  buildJson(): object {
    const entry: Record<string, unknown> = {
      atlas_tile: this.config.atlasTile,
      flipbook_texture: this.config.flipbookTexture,
      ticks_per_frame: this.config.ticksPerFrame,
    };
    if (this.config.atlasIndex !== undefined) entry.atlas_index = this.config.atlasIndex;
    if (this.config.atlasTileVariant !== undefined) {
      entry.atlas_tile_variant = this.config.atlasTileVariant;
    }
    if (this.config.frames !== undefined) entry.frames = this.config.frames;
    if (this.config.replicate !== undefined) entry.replicate = this.config.replicate;
    if (this.config.blendFrames !== undefined) entry.blend_frames = this.config.blendFrames;
    return entry;
  }
}

/** A single flipbook entry (alias). */
export type FlipbookEntry = FlipbookTexturesConfig;