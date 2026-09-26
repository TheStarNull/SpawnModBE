/**
 * The `EntityBP` class — describes a behavior-pack entity definition.
 *
 * A behavior-pack entity file (BP/entities/<id>.json) has three main parts:
 *  - `components` — hard-coded logical building blocks (size, swimming, ...)
 *  - `component_groups` — named "folders" of components, added/removed by events
 *  - `events` — add/remove component groups when criteria are met
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/entities/entity-intro-bp
 *
 * @example
 * ```ts
 * const goblin = new EntityBP({
 *   identifier: 'mymod:goblin',
 *   is_spawnable: true,
 *   components: {
 *     'minecraft:type_family': { family: ['mymod:goblin'] },
 *     'minecraft:collision_box': { width: 0.6, height: 1.2 },
 *   },
 * });
 * bp.addEntity(goblin);
 * ```
 */

/** A component group: a named set of components. */
export type ComponentGroup = Record<string, unknown>;

/** An event that adds/removes component groups. */
export interface EntityEvent {
  add?: { component_groups: string[] };
  remove?: { component_groups: string[] };
  /** Optional queue setting for the event. */
  queue_command?: boolean;
}

/** The entity's behavior description. */
export interface EntityDescription {
  identifier: string;
  /** Whether the entity can be spawned by summon/spawn egg. Defaults to `false`. */
  is_spawnable?: boolean;
  /** Whether the entity is summonable. */
  is_summonable?: boolean;
  /** Whether the entity is experimental. */
  is_experimental?: boolean;
  /** Entity description scripts (e.g. `animate` list). */
  scripts?: { animate?: Array<string | Record<string, unknown>> };
  /** Entity description animations mapping (shortname → animation id). */
  animations?: Record<string, string>;
}

/** Configuration accepted by {@link EntityBP}. */
export interface EntityBPConfig {
  /** The entity identifier (e.g. `'mymod:goblin'`). */
  identifier: string;
  /** Whether the entity can be spawned. Defaults to `true`. */
  isSpawnable?: boolean;
  /** Whether the entity is summonable. Defaults to `true`. */
  isSummonable?: boolean;
  /** Whether the entity requires an experiment toggle. */
  isExperimental?: boolean;
  /** Entity description scripts (e.g. `animate` list). */
  scripts?: { animate?: Array<string | Record<string, unknown>> };
  /** Entity description animations mapping (shortname → animation id). */
  animations?: Record<string, string>;
  /** The entity's runtime components. */
  components?: Record<string, unknown>;
  /** Named component groups. */
  componentGroups?: Record<string, ComponentGroup>;
  /** Entity events. */
  events?: Record<string, EntityEvent>;
  /** The manifest `format_version`. Defaults to `'1.19.40'`. */
  formatVersion?: string;
}

/** The resolved entity behavior configuration. */
/** The resolved entity behavior configuration (all fields filled in). */
export interface ResolvedEntityBPConfig {
  identifier: string;
  isSpawnable: boolean;
  isSummonable: boolean;
  isExperimental: boolean;
  scripts?: { animate?: Array<string | Record<string, unknown>> };
  animations?: Record<string, string>;
  components: Record<string, unknown>;
  componentGroups: Record<string, ComponentGroup>;
  events: Record<string, EntityEvent>;
  formatVersion: string;
}

export class EntityBP {
  readonly config: ResolvedEntityBPConfig;

  constructor(config: EntityBPConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('EntityBP requires a non-empty "identifier".');
    }
    this.config = {
      ...config,
      isSpawnable: config.isSpawnable ?? true,
      isSummonable: config.isSummonable ?? true,
      isExperimental: config.isExperimental ?? false,
      scripts: config.scripts,
      animations: config.animations,
      components: config.components ?? {},
      componentGroups: config.componentGroups ?? {},
      events: config.events ?? {},
      formatVersion: config.formatVersion ?? '1.19.40',
    };
  }

  /** The entity identifier. */
  get identifier(): string {
    return this.config.identifier;
  }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string {
    const idx = this.identifier.indexOf(':');
    return `${idx >= 0 ? this.identifier.slice(idx + 1) : this.identifier}.json`;
  }

  // ---- 链式 set 方法（mutate `this.config`，返回 `this` 便于串接）----

  /** Sets whether the entity can be spawned. Returns `this` for chaining. */
  setSpawnable(value = true): this {
    this.config.isSpawnable = value;
    return this;
  }

  /** Sets whether the entity is summonable. Returns `this` for chaining. */
  setSummonable(value = true): this {
    this.config.isSummonable = value;
    return this;
  }

  /** Sets whether the entity is experimental. Returns `this` for chaining. */
  setExperimental(value = true): this {
    this.config.isExperimental = value;
    return this;
  }

  /** Sets a runtime component. Returns `this` for chaining. */
  setComponent(name: string, value: unknown): this {
    this.config.components[name] = value;
    return this;
  }

  /** Adds a component group. Returns `this` for chaining. */
  addComponentGroup(name: string, components: Record<string, unknown>): this {
    this.config.componentGroups[name] = components;
    return this;
  }

  /** Adds an event. Returns `this` for chaining. */
  addEvent(name: string, event: EntityEvent): this {
    this.config.events[name] = event;
    return this;
  }

  /** Builds the full behavior-pack entity JSON. */
  buildJson(): object {
    const description: EntityDescription = {
      identifier: this.identifier,
    };
    if (this.config.isSpawnable) description.is_spawnable = true;
    if (this.config.isSummonable) description.is_summonable = true;
    if (this.config.isExperimental) description.is_experimental = true;
    if (this.config.scripts && Object.keys(this.config.scripts).length > 0) {
      description.scripts = this.config.scripts;
    }
    if (this.config.animations && Object.keys(this.config.animations).length > 0) {
      description.animations = this.config.animations;
    }

    return {
      format_version: this.config.formatVersion,
      'minecraft:entity': {
        description,
        components: this.config.components,
        component_groups: this.config.componentGroups,
        events: this.config.events,
      },
    };
  }
}
