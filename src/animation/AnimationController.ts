/**
 * The `AnimationController` class — a behavior-pack animation controller
 * generator.
 *
 * Controllers live at BP/animation_controllers/<shortName>.json and are wrapped
 * under an `animation_controllers` node keyed by the controller identifier
 * (e.g. `controller.animation.mymod.walk`).
 */

import { animationShortName } from './Animation.js';

/** Builds a transition map entry: `{ [target]: condition }`. */
export function transition(target: string, condition: string): Record<string, string> {
  return { [target]: condition };
}

/** Options accepted by {@link state}. */
export interface StateOptions {
  /** Animation bindings for the state (`animations`). */
  animations?: Record<string, unknown>;
  /** Commands run on entering the state (`on_entry`). */
  onEntry?: string[];
  /** Commands run on leaving the state (`on_exit`). */
  onExit?: string[];
  /** Transitions to other states, e.g. from {@link transition}. */
  transitions?: Record<string, string>;
  /** Extra state body (loose, passed through as-is). */
  body?: Record<string, unknown>;
}

/** Builds a single animation-controller state object keyed by its name. */
export function state(name: string, options?: StateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { ...(options?.body ?? {}) };
  if (options?.animations) body.animations = options.animations;
  if (options?.onEntry) body.on_entry = options.onEntry;
  if (options?.onExit) body.on_exit = options.onExit;
  if (options?.transitions) body.transitions = options.transitions;
  return { [name]: body };
}

/** Configuration accepted by {@link AnimationController}. */
export interface AnimationControllerConfig {
  /**
   * The controller identifier, e.g. `'controller.animation.mymod.walk'`. This is
   * the key under `animation_controllers` and drives the file name.
   */
  identifier: string;
  /** The initial state name (default `'default'`). */
  initialState?: string;
  /** The controller's states map (built with {@link state}). */
  states: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.10.0'`). */
  formatVersion?: string;
}

/** The resolved animation-controller configuration (all defaults filled in). */
export interface ResolvedAnimationControllerConfig {
  identifier: string;
  initialState: string;
  states: Record<string, unknown>;
  formatVersion: string;
}

export class AnimationController {
  /** The fully-resolved configuration. */
  readonly config: ResolvedAnimationControllerConfig;

  constructor(config: AnimationControllerConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('AnimationController requires a non-empty "identifier".');
    }
    if (!config.states || typeof config.states !== 'object' || Array.isArray(config.states)) {
      throw new Error('AnimationController requires a "states" object.');
    }
    this.config = {
      identifier: config.identifier,
      initialState: config.initialState ?? 'default',
      states: { ...config.states },
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The controller identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier stripped to its last segment). */
  get fileName(): string { return `${animationShortName(this.identifier)}.json`; }

  /** Builds the animation-controller JSON. */
  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      animation_controllers: {
        [this.config.identifier]: {
          initial_state: this.config.initialState,
          states: this.config.states,
        },
      },
    };
  }
}
