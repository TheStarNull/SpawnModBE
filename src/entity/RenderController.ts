/**
 * The `RenderController` class — a resource-pack render controller.
 *
 * Render controllers control how an entity is rendered: which geometry, material
 * and texture are used for each part, optionally conditioned on Molang/other
 * expressions. They live at RP/render_controllers/<id>.rc.json.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/entities/render-controllers
 *
 * @example
 * ```ts
 * const rc = new RenderController({
 *   id: 'controller.render.goblin',
 *   geometry: 'geometry.default',
 *   materials: [{ '*': 'material.default' }],
 *   textures: ['texture.default'],
 * });
 * rp.addRenderController(rc);
 * ```
 */

/** A material binding: `'*'` for all bones, or a bone name → material shortname. */
export type MaterialBinding = Record<string, string>;

/** Configuration accepted by {@link RenderController}. */
export interface RenderControllerConfig {
  /** The render controller identifier (e.g. `'controller.render.goblin'`). */
  id: string;
  /** The geometry shortname (e.g. `'geometry.default'`). */
  geometry: string;
  /** The material bindings, e.g. `[{ '*': 'material.default' }]`. */
  materials: MaterialBinding[];
  /** The texture shortnames to use, e.g. `['texture.default']`. */
  textures: string[];
  /** Named arrays for animated texture / geometry / material selection. */
  arrays?: {
    textures?: Record<string, string[]>;
    geometries?: Record<string, string[]>;
    materials?: Record<string, string[]>;
  };
  /** Optional per-part visibility expressions. */
  partVisibility?: Array<{ bone: string; condition?: string }>;
  /** Optional color tint applied to the geometry. */
  color?: Record<string, unknown>;
  /** Flat overlay color `{ r, g, b, a }`. */
  overlayColor?: Record<string, unknown>;
  /** Multiplier applied to light color. */
  lightColorMultiplier?: number;
  /** Whether to ignore lighting when rendering. */
  ignoreLighting?: boolean;
  /** The manifest `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
}

/** The resolved render-controller configuration (all fields filled in). */
export interface ResolvedRenderControllerConfig {
  id: string;
  geometry: string;
  materials: MaterialBinding[];
  textures: string[];
  arrays: RenderControllerConfig['arrays'];
  partVisibility: Array<{ bone: string; condition?: string }>;
  color: Record<string, unknown> | undefined;
  overlayColor: Record<string, unknown> | undefined;
  lightColorMultiplier: number | undefined;
  ignoreLighting: boolean | undefined;
  formatVersion: string;
}

export class RenderController {
  readonly config: ResolvedRenderControllerConfig;

  constructor(config: RenderControllerConfig) {
    if (!config || typeof config.id !== 'string' || config.id.trim() === '') {
      throw new Error('RenderController requires a non-empty "id".');
    }
    if (!config.materials || config.materials.length === 0) {
      throw new Error('RenderController requires at least one material binding.');
    }
    if (!config.textures || config.textures.length === 0) {
      throw new Error('RenderController requires at least one texture.');
    }
    this.config = {
      id: config.id,
      geometry: config.geometry,
      materials: config.materials,
      textures: config.textures,
      arrays: config.arrays,
      partVisibility: config.partVisibility ?? [],
      color: config.color,
      overlayColor: config.overlayColor,
      lightColorMultiplier: config.lightColorMultiplier,
      ignoreLighting: config.ignoreLighting,
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The render controller identifier. */
  get id(): string {
    return this.config.id;
  }

  /** The file name (`<shortName>.rc.json`). */
  get fileName(): string {
    const idx = this.id.lastIndexOf('.');
    const short = idx >= 0 ? this.id.slice(idx + 1) : this.id;
    return `${short}.rc.json`;
  }

  /** Builds the render controller JSON. */
  buildJson(): object {
    const controller: Record<string, unknown> = {
      geometry: this.config.geometry,
      materials: this.config.materials,
      textures: this.config.textures,
    };
    if (this.config.arrays && Object.keys(this.config.arrays).length > 0) {
      controller.arrays = this.config.arrays;
    }
    if (this.config.partVisibility.length > 0) {
      const vis: Record<string, unknown> = {};
      for (const pv of this.config.partVisibility) {
        vis[pv.bone] = pv.condition ?? '';
      }
      controller.part_visibility = vis;
    }
    if (this.config.color) {
      controller.color = this.config.color;
    }
    if (this.config.overlayColor) {
      controller.overlay_color = this.config.overlayColor;
    }
    if (this.config.lightColorMultiplier !== undefined) {
      controller.light_color_multiplier = this.config.lightColorMultiplier;
    }
    if (this.config.ignoreLighting !== undefined) {
      controller.ignore_lighting = this.config.ignoreLighting;
    }

    return {
      format_version: this.config.formatVersion,
      render_controllers: {
        [this.id]: controller,
      },
    };
  }
}
