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
  /** Optional per-part visibility expressions. */
  partVisibility?: Array<{ bone: string; condition?: string }>;
  /** Optional color tint applied to the geometry. */
  color?: Record<string, unknown>;
  /** The manifest `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
}

/** The resolved render-controller configuration (all fields filled in). */
export interface ResolvedRenderControllerConfig {
  id: string;
  geometry: string;
  materials: MaterialBinding[];
  textures: string[];
  partVisibility: Array<{ bone: string; condition?: string }>;
  color: Record<string, unknown> | undefined;
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
      partVisibility: config.partVisibility ?? [],
      color: config.color,
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

    return {
      format_version: this.config.formatVersion,
      render_controllers: {
        [this.id]: controller,
      },
    };
  }
}