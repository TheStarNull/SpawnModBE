/**
 * The `UiDefs` class — generates `RP/ui/_ui_defs.json`.
 *
 * The `_ui_defs.json` file references all custom JSON UI files in an array. Each
 * entry is the file path relative to the resource pack root, e.g. `'ui/my_screen.json'`.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/json-ui/json-ui-intro#ui-defs
 */

export interface UiDefsConfig {
  /** The UI file paths to register (e.g. `['ui/my_screen.json']`). */
  defs: string[];
}

export class UiDefs {
  readonly config: UiDefsConfig;

  constructor(config: UiDefsConfig) {
    if (!config || !Array.isArray(config.defs)) {
      throw new Error('UiDefs requires a "defs" array.');
    }
    this.config = { defs: [...config.defs] };
  }

  /** The full path under `RP/ui/`. */
  get path(): string {
    return 'ui/_ui_defs.json';
  }

  /** Adds a file path to the defs list. Returns `this` for chaining. */
  add(path: string): this {
    this.config.defs.push(path);
    return this;
  }

  /** Builds the `_ui_defs.json` object. */
  buildJson(): object {
    // Sort alphabetically for stability (vanilla convention).
    return { ui_defs: [...this.config.defs].sort() };
  }

  /** Serializes to a pretty-printed JSON string. */
  toString(): string {
    return JSON.stringify(this.buildJson(), null, 2);
  }
}