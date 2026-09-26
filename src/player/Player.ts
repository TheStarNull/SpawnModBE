/**
 * The `Player` module — a high-level wrapper for overriding `minecraft:player`.
 *
 * Bedrock treats a behavior-pack `entities/player.json` and a resource-pack
 * `entity/player.entity.json` as **full replace** of the vanilla player. To
 * add/modify just a few pieces you normally have to copy the whole vanilla
 * definition. `Player` gives you a single, chainable façade over that:
 *
 *  - `behavior` — the behavior-pack side (`components`, `component_groups`,
 *    `events`, `description.scripts.animate`, `description.animations`).
 *  - `client` — the resource-pack side (`materials`, `textures`, `geometry`,
 *    `render_controllers`, `animations`, `animation_controllers`, `scripts`,
 *    `sound_effects`, `particle_effects`, `enable_attachables`, ...).
 *
 * Mutators **deep-merge**: object fields merge recursively, arrays append and
 * de-duplicate, scalars override. So calling `setComponent` twice does not
 * wipe the first value, and `addPreAnimation` accumulates lines.
 *
 * It wraps {@link EntityBP} + {@link EntityRP} (both pinned to
 * `minecraft:player`), so `mod.add(player)` writes both packs at once.
 *
 * @example
 * ```ts
 * const player = new Player({
 *   behavior: {
 *     components: { 'minecraft:type_family': { family: ['player'] } },
 *     events: { 'mymod:on_jump': { add: { component_groups: ['mymod:boost'] } } },
 *   },
 *   client: {
 *     materials: { default: 'entity_alphatest' },
 *     textures: { default: 'textures/entity/steve' },
 *     geometry: { default: 'geometry.humanoid.custom' },
 *     scripts: { pre_animation: ['variable.my = 1.0;'] },
 *   },
 * });
 * mod.add(player);
 * ```
 */

import { EntityBP, EntityRP } from '../entity/index.js';
import type { ComponentGroup, EntityBPConfig, EntityEvent, EntityRPConfig } from '../entity/index.js';

/** A component group: a named set of components. */
export type PlayerComponentGroup = ComponentGroup;

/** Behavior-pack player override (BP `entities/player.json`). */
export interface PlayerBehaviorConfig {
  /** The manifest `format_version`. Defaults to `'1.19.40'`. */
  formatVersion?: string;
  /** Whether the player can be spawned. Defaults to `true`. */
  isSpawnable?: boolean;
  /** Whether the player is summonable. Defaults to `true`. */
  isSummonable?: boolean;
  /** Whether the player is experimental. Defaults to `false`. */
  isExperimental?: boolean;
  /** Entity description scripts (e.g. `animate` list). */
  scripts?: { animate?: Array<string | Record<string, unknown>> };
  /** Entity description animations mapping (shortname → animation id). */
  animations?: Record<string, string>;
  /** Runtime components to set. */
  components?: Record<string, unknown>;
  /** Named component groups. */
  componentGroups?: Record<string, ComponentGroup>;
  /** Entity events. */
  events?: Record<string, EntityEvent>;
}

/** Client scripts (Molang) for the player resource-pack entity. */
export interface PlayerClientScripts {
  initialize?: string[];
  pre_animation?: string[];
  animate?: Array<string | Record<string, unknown>>;
  scale?: string | number;
  scaleX?: string | number;
  scaleY?: string | number;
  scaleZ?: string | number;
}

/** Resource-pack player override (RP `entity/player.entity.json`). */
export interface PlayerClientConfig {
  /** The manifest `format_version`. Defaults to `'1.10.0'`. */
  formatVersion?: string;
  /** Material shortname definitions, e.g. `{ default: 'entity_alphatest' }`. */
  materials?: Record<string, string>;
  /** Texture shortname definitions, e.g. `{ default: 'textures/entity/steve' }`. */
  textures?: Record<string, string>;
  /** Geometry shortname definitions, e.g. `{ default: 'geometry.humanoid.custom' }`. */
  geometry?: Record<string, string>;
  /** Render controller identifiers/conditions used by this player. */
  renderControllers?: Array<string | Record<string, string>>;
  /** Animation shortname definitions. */
  animations?: Record<string, string>;
  /** Animation controller shortnames. */
  animationControllers?: Record<string, string>;
  /** Molang scripts. */
  scripts?: PlayerClientScripts;
  /** Sound effect shortnames. */
  soundEffects?: Record<string, string>;
  /** Particle effect shortnames. */
  particleEffects?: Record<string, string>;
  /** Whether attachables can be attached. Defaults to `true`. */
  enableAttachables?: boolean;
  /** Whether to hide armor. Defaults to `false`. */
  hideArmor?: boolean;
}

/** The resolved behavior-pack player config (all fields filled in). */
export interface ResolvedPlayerBehaviorConfig {
  identifier: string;
  formatVersion: string;
  isSpawnable: boolean;
  isSummonable: boolean;
  isExperimental: boolean;
  scripts: PlayerBehaviorConfig['scripts'];
  animations: Record<string, string>;
  components: Record<string, unknown>;
  componentGroups: Record<string, ComponentGroup>;
  events: Record<string, EntityEvent>;
}

/** The resolved resource-pack player config (all fields filled in). */
export interface ResolvedPlayerClientConfig {
  identifier: string;
  formatVersion: string;
  materials: Record<string, string>;
  textures: Record<string, string>;
  geometry: Record<string, string>;
  renderControllers: Array<string | Record<string, string>>;
  animations: Record<string, string>;
  animationControllers: Record<string, string>;
  scripts: PlayerClientScripts;
  soundEffects: Record<string, string>;
  particleEffects: Record<string, string>;
  enableAttachables: boolean;
  hideArmor: boolean;
}

/** Configuration accepted by {@link Player}. */
export interface PlayerConfig {
  /** Behavior-pack player override. */
  behavior?: PlayerBehaviorConfig;
  /** Resource-pack player override. */
  client?: PlayerClientConfig;
}

/** Returns `true` for plain (non-array) objects. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Deep-clones JSON-serializable config data (keeps ES2021-only deps). */
function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Deep-merges `base` with `value`:
 *  - plain objects merge recursively;
 *  - arrays append (de-duplicating by JSON string);
 *  - scalars are replaced by `value`.
 */
function mergeValue(base: unknown, value: unknown): unknown {
  if (Array.isArray(base) && Array.isArray(value)) {
    const out: unknown[] = [...base];
    for (const item of value) {
      const key = JSON.stringify(item);
      if (!out.some((e) => JSON.stringify(e) === key)) out.push(item);
    }
    return out;
  }
  if (isPlainObject(base) && isPlainObject(value)) {
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(value)) {
      out[k] = k in out ? mergeValue(out[k], v) : v;
    }
    return out;
  }
  return value;
}

export class Player {
  /** The resolved behavior-pack player config. */
  readonly behavior: ResolvedPlayerBehaviorConfig;
  /** The resolved resource-pack player config. */
  readonly client: ResolvedPlayerClientConfig;

  constructor(config: PlayerConfig = {}) {
    const b = config.behavior ?? {};
    const c = config.client ?? {};
    this.behavior = {
      identifier: 'minecraft:player',
      formatVersion: b.formatVersion ?? '1.19.40',
      isSpawnable: b.isSpawnable ?? true,
      isSummonable: b.isSummonable ?? true,
      isExperimental: b.isExperimental ?? false,
      scripts: b.scripts ? { animate: [...(b.scripts.animate ?? [])] } : undefined,
      animations: { ...(b.animations ?? {}) },
      components: clone(b.components ?? {}),
      componentGroups: clone(b.componentGroups ?? {}),
      events: clone(b.events ?? {}),
    };
    this.client = {
      identifier: 'minecraft:player',
      formatVersion: c.formatVersion ?? '1.10.0',
      materials: { ...(c.materials ?? {}) },
      textures: { ...(c.textures ?? {}) },
      geometry: { ...(c.geometry ?? {}) },
      renderControllers: [...(c.renderControllers ?? [])],
      animations: { ...(c.animations ?? {}) },
      animationControllers: { ...(c.animationControllers ?? {}) },
      scripts: {
        initialize: [...(c.scripts?.initialize ?? [])],
        pre_animation: [...(c.scripts?.pre_animation ?? [])],
        animate: [...(c.scripts?.animate ?? [])],
        scale: c.scripts?.scale,
        scaleX: c.scripts?.scaleX,
        scaleY: c.scripts?.scaleY,
        scaleZ: c.scripts?.scaleZ,
      },
      soundEffects: { ...(c.soundEffects ?? {}) },
      particleEffects: { ...(c.particleEffects ?? {}) },
      enableAttachables: c.enableAttachables ?? true,
      hideArmor: c.hideArmor ?? false,
    };
  }

  // ---- 行为包（BP）侧 mutate ----

  /** Sets whether the player can be spawned. Returns `this`. */
  setSpawnable(value = true): this { this.behavior.isSpawnable = value; return this; }
  /** Sets whether the player is summonable. Returns `this`. */
  setSummonable(value = true): this { this.behavior.isSummonable = value; return this; }
  /** Sets whether the player is experimental. Returns `this`. */
  setExperimental(value = true): this { this.behavior.isExperimental = value; return this; }

  /** Deep-merges a runtime component. Returns `this`. */
  setComponent(name: string, value: unknown): this {
    if (name in this.behavior.components) {
      this.behavior.components[name] = mergeValue(this.behavior.components[name], value);
    } else {
      this.behavior.components[name] = value;
    }
    return this;
  }

  /** Deep-merges a component group. Returns `this`. */
  addComponentGroup(name: string, components: Record<string, unknown>): this {
    if (name in this.behavior.componentGroups) {
      this.behavior.componentGroups[name] = mergeValue(
        this.behavior.componentGroups[name],
        components
      ) as Record<string, unknown>;
    } else {
      this.behavior.componentGroups[name] = components;
    }
    return this;
  }

  /** Deep-merges an entity event. Returns `this`. */
  addEvent(name: string, event: EntityEvent): this {
    if (name in this.behavior.events) {
      this.behavior.events[name] = mergeValue(this.behavior.events[name], event) as EntityEvent;
    } else {
      this.behavior.events[name] = event;
    }
    return this;
  }

  /** Sets a behavior animation mapping (shortname → id). Returns `this`. */
  addBehaviorAnimation(shortname: string, animationId: string): this {
    this.behavior.animations[shortname] = animationId;
    return this;
  }

  /** Appends an entry to `description.scripts.animate`. Returns `this`. */
  addBehaviorAnimate(entry: string | Record<string, unknown>): this {
    if (!this.behavior.scripts) this.behavior.scripts = { animate: [] };
    if (!this.behavior.scripts.animate) this.behavior.scripts.animate = [];
    this.behavior.scripts.animate = mergeValue(this.behavior.scripts.animate, [entry]) as Array<
      string | Record<string, unknown>
    >;
    return this;
  }

  // ---- 资源包（RP）侧 mutate ----

  /** Sets a material shortname. Returns `this`. */
  setMaterial(name: string, id: string): this { this.client.materials[name] = id; return this; }
  /** Sets a texture shortname. Returns `this`. */
  setTexture(name: string, path: string): this { this.client.textures[name] = path; return this; }
  /** Sets a geometry shortname. Returns `this`. */
  setGeometry(name: string, geoId: string): this { this.client.geometry[name] = geoId; return this; }

  /** Appends a render controller identifier/condition. Returns `this`. */
  addRenderController(idOrCond: string | Record<string, string>): this {
    this.client.renderControllers = mergeValue(this.client.renderControllers, [idOrCond]) as Array<
      string | Record<string, string>
    >;
    return this;
  }

  /** Sets a client animation mapping (shortname → id). Returns `this`. */
  addClientAnimation(shortname: string, animationId: string): this {
    this.client.animations[shortname] = animationId;
    return this;
  }

  /** Sets a client animation-controller mapping (shortname → id). Returns `this`. */
  addClientAnimationController(shortname: string, controllerId: string): this {
    this.client.animationControllers[shortname] = controllerId;
    return this;
  }

  /** Appends a `scripts.initialize` Molang line. Returns `this`. */
  addInitialize(line: string): this {
    this.client.scripts.initialize = mergeValue(this.client.scripts.initialize, [line]) as string[];
    return this;
  }

  /** Appends a `scripts.pre_animation` Molang line. Returns `this`. */
  addPreAnimation(line: string): this {
    this.client.scripts.pre_animation = mergeValue(this.client.scripts.pre_animation, [line]) as string[];
    return this;
  }

  /** Appends an entry to `scripts.animate`. Returns `this`. */
  addAnimate(entry: string | Record<string, unknown>): this {
    this.client.scripts.animate = mergeValue(this.client.scripts.animate, [entry]) as Array<
      string | Record<string, unknown>
    >;
    return this;
  }

  /** Sets `scripts.scale`. Returns `this`. */
  setScale(value: string | number): this { this.client.scripts.scale = value; return this; }
  /** Sets `scripts.scaleX`. Returns `this`. */
  setScaleX(value: string | number): this { this.client.scripts.scaleX = value; return this; }
  /** Sets `scripts.scaleY`. Returns `this`. */
  setScaleY(value: string | number): this { this.client.scripts.scaleY = value; return this; }
  /** Sets `scripts.scaleZ`. Returns `this`. */
  setScaleZ(value: string | number): this { this.client.scripts.scaleZ = value; return this; }

  /** Sets a sound effect shortname. Returns `this`. */
  setSoundEffect(name: string, id: string): this { this.client.soundEffects[name] = id; return this; }
  /** Sets a particle effect shortname. Returns `this`. */
  setParticleEffect(name: string, id: string): this { this.client.particleEffects[name] = id; return this; }

  /** Sets whether attachables can be attached. Returns `this`. */
  setEnableAttachables(value = true): this { this.client.enableAttachables = value; return this; }
  /** Sets whether armor is hidden. Returns `this`. */
  setHideArmor(value = true): this { this.client.hideArmor = value; return this; }

  // ---- 输出 ----

  /** Behavior-pack file base name (`player.json`). */
  get behaviorFileName(): string { return 'player.json'; }
  /** Resource-pack file base name (`player.entity.json`). */
  get clientFileName(): string { return 'player.entity.json'; }

  /** Whether any client script field has content. */
  private hasClientScripts(): boolean {
    const s = this.client.scripts;
    return Boolean(
      (s.initialize && s.initialize.length > 0) ||
        (s.pre_animation && s.pre_animation.length > 0) ||
        (s.animate && s.animate.length > 0) ||
        s.scale !== undefined ||
        s.scaleX !== undefined ||
        s.scaleY !== undefined ||
        s.scaleZ !== undefined
    );
  }

  /** Builds the behavior-pack entity ({@link EntityBP}) for `minecraft:player`. */
  toEntityBP(): EntityBP {
    const cfg: EntityBPConfig = {
      identifier: 'minecraft:player',
      isSpawnable: this.behavior.isSpawnable,
      isSummonable: this.behavior.isSummonable,
      isExperimental: this.behavior.isExperimental,
      components: this.behavior.components,
      componentGroups: this.behavior.componentGroups,
      events: this.behavior.events,
      formatVersion: this.behavior.formatVersion,
    };
    if (this.behavior.scripts && (this.behavior.scripts.animate?.length ?? 0) > 0) {
      cfg.scripts = this.behavior.scripts;
    }
    if (Object.keys(this.behavior.animations).length > 0) {
      cfg.animations = this.behavior.animations;
    }
    return new EntityBP(cfg);
  }

  /** Builds the resource-pack entity ({@link EntityRP}) for `minecraft:player`. */
  toEntityRP(): EntityRP {
    const cfg: EntityRPConfig = {
      identifier: 'minecraft:player',
      materials: this.client.materials,
      textures: this.client.textures,
      geometry: this.client.geometry,
      renderControllers: this.client.renderControllers,
      animations: this.client.animations,
      animationControllers: this.client.animationControllers,
      soundEffects: this.client.soundEffects,
      particleEffects: this.client.particleEffects,
      enableAttachables: this.client.enableAttachables,
      hideArmor: this.client.hideArmor,
      formatVersion: this.client.formatVersion,
    };
    if (this.hasClientScripts()) {
      cfg.scripts = this.client.scripts;
    }
    return new EntityRP(cfg);
  }

  /** Builds the behavior-pack player JSON. */
  buildBehaviorJson(): object { return this.toEntityBP().buildJson(); }
  /** Builds the resource-pack player JSON. */
  buildClientJson(): object { return this.toEntityRP().buildJson(); }
}
