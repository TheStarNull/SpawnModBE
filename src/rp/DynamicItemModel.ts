/**
 * The `DynamicItemModel` class — generates a dynamic 3D item model using the
 * attachables system.
 *
 * A dynamic item model is composed of three RP files:
 *  - `attachables/<shortName>.json` — the attachable definition (binds the item
 *    to the geometry + runs animations based on conditions)
 *  - `models/entity/<shortName>.geo.json` — the 3D geometry
 *  - `animations/<shortName>.animation.json` — the animation(s) driving it
 *
 * The attachable's `identifier` matches the item/block id so the geometry is
 * displayed when the item is held. Animations can be gated on conditions such as
 * `context.is_first_person`, `query.main_hand_item_use_duration`, etc.
 *
 * This follows the Bedrock Wiki attachables reference:
 * https://wiki.bedrock.dev/items/attachables
 *
 * @example
 * ```ts
 * const chainsaw = new DynamicItemModel({
 *   identifier: 'mymod:chainsaw',
 *   geometry: 'geometry.chainsaw',
 *   texture: 'textures/entity/chainsaw',
 *   material: 'entity_alphatest',
 *   bones: [
 *     { name: 'blade', parent: 'rightItem', pivot: [0, 0, 0],
 *       cubes: [{ origin: [-6, 0, 0], size: [12, 1, 1], uv: [0, 0] }] },
 *   ],
 *   animations: {
 *     spin: {
 *       bone: 'blade',
 *       rotation: ['0', '-q.life_time * 360', '0'],   // spin while held
 *     },
 *   },
 * });
 * rp.addDynamicItemModel(chainsaw);
 * ```
 */

/** A cube (box) in the geometry. */
export interface ModelCube {
  /** The lower corner position. */
  origin: [number, number, number];
  /** The dimensions of the box. */
  size: [number, number, number];
  /** The UV coordinate (top-left of the texture region). */
  uv: [number, number];
  /** Optional UV size override. */
  uvSize?: [number, number];
  /** Whether to mirror the cube (for symmetrical left/right parts). */
  mirror?: boolean;
}

/** A bone in the geometry. */
export interface ModelBone {
  /** The bone name. */
  name: string;
  /** The parent bone name (or `'rightItem'`/`'leftItem'` for the skeleton). */
  parent?: string;
  /** The pivot point. */
  pivot: [number, number, number];
  /** Cubes attached to this bone. */
  cubes?: ModelCube[];
  /** Optional model binding (e.g. `q.item_slot_to_bone_name(context.item_slot)`). */
  binding?: string;
  /** Child bones. */
  children?: ModelBone[];
}

/** A single keyframe-like animation channel applied to a bone. */
export interface BoneAnimation {
  /** The bone to animate. */
  bone: string;
  /** X/Y/Z rotation expressions (Molang). Defaults to `['0','0','0']`. */
  rotation?: [string, string, string];
  /** X/Y/Z translation expressions. Defaults to `['0','0','0']`. */
  position?: [string, string, string];
  /** X/Y/Z scale expressions. Defaults to `['1','1','1']`. */
  scale?: [string, string, string];
}

/** Configuration accepted by {@link DynamicItemModel}. */
export interface DynamicItemModelConfig {
  /**
   * The item/block identifier the attachable binds to, e.g. `'mymod:chainsaw'`.
   * Must match an existing item id. When omitted (e.g. via `Item.dynamicModel`),
   * it inherits the owning item's identifier.
   */
  identifier?: string;
  /** The geometry identifier (e.g. `'geometry.chainsaw'`). Defaults to `geometry.<shortName>`. */
  geometry?: string;
  /** The texture path (`textures/entity/<name>`). Defaults to `textures/entity/<shortName>`. */
  texture?: string;
  /** The default material. Defaults to `'entity_alphatest'`. */
  material?: string;
  /** The enchanted material. Defaults to `'entity_alphatest_glint'`. */
  enchantedMaterial?: string;
  /** The bones of the geometry. */
  bones: ModelBone[];
  /**
   * Optional animations. Each key is an animation identifier suffix; the full
   * identifier becomes `animation.<shortName>.<key>`.
   */
  animations?: Record<string, BoneAnimation>;
  /**
   * Optional `scripts.animate` entries. Each entry is a Molang condition that
   * gates when the animation runs. Keys reference the animation shortnames.
   */
  animateWhen?: Record<string, string>;
  /** The render controller(s). Defaults to `['controller.render.item_default']`. */
  renderControllers?: string[];
  /** The geometry format version. Defaults to `'1.16.0'` (supports binding). */
  geometryFormatVersion?: string;
  /** The attachable/animation format version. Defaults to `'1.10.0'`. */
  formatVersion?: string;
  /**
   * The animation loop duration (seconds) for each generated animation.
   * Only relevant when `animations` is set. Defaults to `1` (a positive value,
   * matching vanilla animation conventions; `0` can break playback).
   */
  animationLength?: number;
}

/** The resolved dynamic item model configuration (all fields filled in). */
export interface ResolvedDynamicItemModelConfig {
  identifier: string;
  geometry: string;
  texture: string;
  material: string;
  enchantedMaterial: string;
  bones: ModelBone[];
  animations?: Record<string, BoneAnimation>;
  animateWhen?: Record<string, string>;
  renderControllers: string[];
  geometryFormatVersion: string;
  formatVersion: string;
  animationLength: number;
}

/** The 3-file set produced by a dynamic item model. */
export interface DynamicItemModelFiles {
  attachable: { path: string; json: object };
  geometry: { path: string; json: object };
  animation: { path: string; json: object } | null;
}

export class DynamicItemModel {
  readonly config: ResolvedDynamicItemModelConfig;

  /** The short name (identifier with namespace stripped). */
  private readonly shortName: string;

  constructor(config: DynamicItemModelConfig) {
    if (!config || !config.bones || config.bones.length === 0) {
      throw new Error('DynamicItemModel requires at least one bone.');
    }
    // The identifier may be omitted when the model is owned by an Item; it is
    // then injected by the Item constructor. When still missing here, it must
    // be supplied explicitly.
    if (!config.identifier || config.identifier.trim() === '') {
      throw new Error(
        'DynamicItemModel requires an "identifier" (or be owned by an Item that provides it).'
      );
    }
    this.shortName = config.identifier.includes(':')
      ? config.identifier.slice(config.identifier.indexOf(':') + 1)
      : config.identifier;
    this.config = {
      identifier: config.identifier,
      geometry: config.geometry ?? `geometry.${this.shortName}`,
      texture: config.texture ?? `textures/entity/${this.shortName}`,
      material: config.material ?? 'entity_alphatest',
      enchantedMaterial: config.enchantedMaterial ?? 'entity_alphatest_glint',
      bones: config.bones,
      animations: config.animations,
      animateWhen: config.animateWhen,
      renderControllers: config.renderControllers ?? ['controller.render.item_default'],
      geometryFormatVersion: config.geometryFormatVersion ?? '1.16.0',
      formatVersion: config.formatVersion ?? '1.10.0',
      animationLength: config.animationLength ?? 1,
    };
  }

  /** The item identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** Builds the attachable JSON. */
  buildAttachableJson(): object {
    const desc: Record<string, unknown> = {
      identifier: this.identifier,
      materials: {
        default: this.config.material,
        enchanted: this.config.enchantedMaterial,
      },
      textures: {
        default: this.config.texture,
        enchanted: 'textures/misc/enchanted_item_glint',
      },
      geometry: {
        default: this.config.geometry,
      },
    };

    const animations: Record<string, string> = {};
    const animate: Array<string | Record<string, string>> = [];
    const animKeys = this.config.animations ?? {};
    for (const key of Object.keys(animKeys)) {
      const animId = `animation.${this.shortName}.${key}`;
      animations[key] = animId;
      const condition = this.config.animateWhen?.[key];
      if (condition) {
        animate.push({ [key]: condition });
      } else {
        animate.push(key);
      }
    }
    if (Object.keys(animations).length > 0) {
      desc.animations = animations;
      desc.scripts = { animate };
    }
    desc.render_controllers = this.config.renderControllers;

    return {
      format_version: this.config.formatVersion,
      'minecraft:attachable': {
        description: desc,
      },
    };
  }

  /** Builds the geometry JSON. */
  buildGeometryJson(): object {
    const bones = this.config.bones.map((b) => this.buildBone(b));
    return {
      format_version: this.config.geometryFormatVersion,
      [this.config.geometry]: {
        visible_bounds_width: 2,
        visible_bounds_height: 2,
        visible_bounds_offset: [0, 0, 0],
        bones,
      },
    };
  }

  /** Builds the animation JSON, or `null` when there are no animations. */
  buildAnimationJson(): object | null {
    const animKeys = this.config.animations ?? {};
    if (Object.keys(animKeys).length === 0) {
      return null;
    }
    const animations: Record<string, unknown> = {};
    for (const [key, anim] of Object.entries(animKeys)) {
      animations[`animation.${this.shortName}.${key}`] = {
        // `loop: true` keeps the animation playing; `animation_length` is the
        // loop duration in seconds (default 0 loops every frame, which suits
        // time-driven Molang like `q.life_time`).
        loop: true,
        animation_length: this.config.animationLength,
        bones: {
          [anim.bone]: {
            ...(anim.rotation
              ? { rotation: anim.rotation }
              : {}),
            ...(anim.position
              ? { position: anim.position }
              : {}),
            ...(anim.scale
              ? { scale: anim.scale }
              : {}),
          },
        },
      };
    }
    return {
      format_version: this.config.formatVersion,
      animations,
    };
  }

  /** Generates the full file set (attachable + geometry + optional animation). */
  buildFiles(): DynamicItemModelFiles {
    return {
      attachable: {
        path: `attachables/${this.shortName}.json`,
        json: this.buildAttachableJson(),
      },
      geometry: {
        path: `models/entity/${this.shortName}.geo.json`,
        json: this.buildGeometryJson(),
      },
      animation: this.buildAnimationJson()
        ? {
            path: `animations/${this.shortName}.animation.json`,
            json: this.buildAnimationJson() as object,
          }
        : null,
    };
  }

  /** Builds a single bone (and its children) into the geometry bone object. */
  private buildBone(bone: ModelBone): Record<string, unknown> {
    const out: Record<string, unknown> = {
      name: bone.name,
      pivot: bone.pivot,
    };
    if (bone.parent) out.parent = bone.parent;
    if (bone.binding) out.binding = bone.binding;
    if (bone.cubes && bone.cubes.length > 0) {
      out.cubes = bone.cubes.map((cube) => {
        const entry: Record<string, unknown> = {
          origin: cube.origin,
          size: cube.size,
          uv: cube.uv,
        };
        if (cube.uvSize) entry.size_uv = cube.uvSize;
        if (cube.mirror) entry.mirror = cube.mirror;
        return entry;
      });
    }
    if (bone.children && bone.children.length > 0) {
      out.children = bone.children.map((c) => this.buildBone(c));
    }
    return out;
  }
}