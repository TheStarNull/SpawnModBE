/**
 * The `UiGlobalVariables` class — generates `RP/ui/_global_variables.json`.
 *
 * Global variables are constant `$name: value` pairs shared across all JSON UI
 * files. Each entry can be an array, number, string, boolean, or color tuple.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/json-ui/json-ui-intro#global-variables
 */

export interface UiGlobalVariablesConfig {
  /** `$name: value` entries (the `$` prefix is added automatically if missing). */
  variables: Record<string, unknown>;
}

export class UiGlobalVariables {
  readonly config: UiGlobalVariablesConfig;

  constructor(config: UiGlobalVariablesConfig) {
    if (!config || typeof config.variables !== 'object' || config.variables === null) {
      throw new Error('UiGlobalVariables requires a "variables" object.');
    }
    this.config = { variables: { ...config.variables } };
  }

  /** The full path under `RP/ui/`. */
  get path(): string {
    return 'ui/_global_variables.json';
  }

  /** Sets a variable. Returns `this` for chaining. */
  set(name: string, value: unknown): this {
    this.config.variables[name.startsWith('$') ? name : `$${name}`] = value;
    return this;
  }

  /** Builds the `_global_variables.json` object. */
  buildJson(): object {
    const out: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(this.config.variables)) {
      out[name.startsWith('$') ? name : `$${name}`] = value;
    }
    return out;
  }

  /** Serializes to a pretty-printed JSON string. */
  toString(): string {
    return JSON.stringify(this.buildJson(), null, 2);
  }
}