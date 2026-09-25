/**
 * The `Dialogue` class — a behavior-pack NPC dialogue generator.
 *
 * Dialogue files live at BP/dialogue/<shortName>.json and are wrapped under the
 * `minecraft:npc_dialogue` node, which lists a set of `scenes` keyed by
 * `scene_tag`.
 */

import { shortName } from '../util.js';

/** Builds a dialogue button entry. */
export function dialogueButton(
  name: string,
  commands?: string[],
  body?: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { name };
  if (commands && commands.length > 0) out.commands = commands;
  if (body) Object.assign(out, body);
  return out;
}

/** Options accepted by {@link scene}. */
export interface SceneOptions {
  /** The NPC display name (`npc_name`). */
  npcName?: string;
  /** The dialogue text (`text`). */
  text?: string;
  /** The button list (built with {@link dialogueButton}). */
  buttons?: Array<Record<string, unknown>>;
  /** Extra scene fields (loose, passed through as-is). */
  body?: Record<string, unknown>;
}

/** Builds a single dialogue scene object keyed by `scene_tag`. */
export function scene(tag: string, options?: SceneOptions): Record<string, unknown> {
  const out: Record<string, unknown> = { scene_tag: tag };
  if (options?.npcName) out.npc_name = options.npcName;
  if (options?.text) out.text = options.text;
  if (options?.buttons && options.buttons.length > 0) out.buttons = options.buttons;
  if (options?.body) Object.assign(out, options.body);
  return out;
}

/** Configuration accepted by {@link Dialogue}. */
export interface DialogueConfig {
  /** The dialogue identifier (used for the file name). */
  identifier: string;
  /** The list of scenes (built with {@link scene}). */
  scenes: Array<Record<string, unknown>>;
  /** The manifest `format_version` (default `'1.17.0'`). */
  formatVersion?: string;
}

/** The resolved dialogue configuration (all defaults filled in). */
export interface ResolvedDialogueConfig {
  identifier: string;
  scenes: Array<Record<string, unknown>>;
  formatVersion: string;
}

export class Dialogue {
  /** The fully-resolved configuration. */
  readonly config: ResolvedDialogueConfig;

  constructor(config: DialogueConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Dialogue requires a non-empty "identifier".');
    }
    if (!Array.isArray(config.scenes)) {
      throw new Error('Dialogue requires a "scenes" array.');
    }
    this.config = {
      identifier: config.identifier,
      scenes: config.scenes,
      formatVersion: config.formatVersion ?? '1.17.0',
    };
  }

  /** The dialogue identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  /** Builds the NPC dialogue JSON. */
  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      'minecraft:npc_dialogue': { scenes: this.config.scenes },
    };
  }
}
