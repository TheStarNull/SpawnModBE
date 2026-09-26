/**
 * The `McFunction` class — a behavior-pack command function.
 *
 * Functions are plain `.mcfunction` text files under `BP/functions/`, one
 * command per line. A function can also be registered as a tick function: its
 * name is then added to `BP/functions/tick.json` so the game runs it every
 * tick (e.g. for looping entity events or gamerules).
 */

import { basename } from 'node:path';

/** Configuration accepted by {@link McFunction}. */
export interface McFunctionConfig {
  /**
   * The function name (relative path under `functions/`, no `.mcfunction`
   * extension), e.g. `'yw'` or `'boss/phase1'`.
   */
  name: string;
  /** The commands to run, one per line (a single string or an array of lines). */
  commands: string | string[];
  /**
   * When `true`, the function name is registered in `functions/tick.json` so
   * the game executes it every tick.
   */
  tick?: boolean;
}

/** A behavior-pack command function. */
export class McFunction {
  /** The function name (normalized, no `.mcfunction` extension). */
  readonly name: string;
  /** The command lines to write. */
  readonly commands: string[];
  /** Whether the function is registered as a tick function. */
  readonly tick: boolean;

  constructor(config: McFunctionConfig) {
    if (!config || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('McFunction requires a non-empty "name".');
    }
    this.name = config.name.replace(/\.mcfunction$/i, '').replace(/^\/+/, '');
    this.commands = Array.isArray(config.commands)
      ? config.commands
      : config.commands.split('\n');
    this.tick = config.tick ?? false;
  }

  /** The file name (last path segment). */
  get fileName(): string {
    return basename(this.name);
  }

  /** The `.mcfunction` source text (commands joined by newlines). */
  get source(): string {
    return this.commands.join('\n').trim() + '\n';
  }

  /** The function name. */
  toString(): string {
    return this.name;
  }
}
