/**
 * The `UiFile` class — generates a Minecraft Bedrock JSON UI file.
 *
 * JSON UI is a data-driven UI system: the game's interface is stored as JSON in
 * `RP/ui/...`. A UI file contains a `namespace` (identifier for cross-file
 * references) and a set of *elements* — `label`, `image`, `button`, `panel`,
 * `stack_panel`, `grid`, `factory`, `screen`, and animation elements.
 *
 * UI files must be registered in `RP/ui/_ui_defs.json` via `ui_defs`.
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/json-ui/json-ui-intro
 *
 * @example
 * ```ts
 * const myFile = new UiFile({
 *   fileName: 'my_screen.json',
 *   namespace: 'my_screen',
 *   elements: [
 *     { name: 'hello_label', type: 'label', text: 'Hello World', color: [1, 1, 1] },
 *     { name: 'root_panel', type: 'panel', controls: ['hello_label@my_screen.hello_label'] },
 *   ],
 * });
 * rp.addUiFile(myFile);
 * ```
 */

/** Valid JSON UI element types. */
export type UiElementType =
  | 'label'
  | 'image'
  | 'button'
  | 'panel'
  | 'stack_panel'
  | 'grid'
  | 'factory'
  | 'custom'
  | 'screen';

import { UiElement as UiElementInstance, type UiControl } from './elements/UiElement.js';

/** A UI element as plain data (name → definition).
 * The `controls` array can reference other elements by `name@namespace.element`.
 */
export interface UiElementData {
  /** Element name (unique within the namespace). */
  name: string;
  /** The element type. */
  type: UiElementType;
  /** Text content (for labels/buttons). May use `$variables` / `#bindings`. */
  text?: string;
  /** The texture path (for images). */
  texture?: string;
  /** Size: `[width, height]` with numbers or expressions like `"100% - 8px"`. */
  size?: [string | number, string | number];
  /** Offset from the anchor point. */
  offset?: [string | number, string | number];
  /** Anchor points (e.g. `'center'`, `'top_left'`). */
  anchor_from?: string;
  anchor_to?: string;
  /** Color (`[r,g,b]` floats 0-1) — for labels/text. */
  color?: [number, number, number];
  /** Opacity (0-1). */
  alpha?: number;
  /** Z-order layer. */
  layer?: number;
  /** Visibility expression (e.g. `(not ($v = 'x'))`). */
  visible?: string;
  /** Whether the element is enabled. */
  enabled?: boolean;
  /** Child elements (by `name@namespace.element` reference or inline def). */
  controls?: Array<string | Record<string, unknown>>;
  /** Bindings array. */
  bindings?: Array<Record<string, unknown>>;
  /** Element-scoped variables (`$name: value`). */
  variables?: Record<string, unknown>;
  /** Animations applied to this element (`@namespace.anim_name`). */
  anims?: string[];
  /** Any extra properties (uv, tiling, etc.). */
  extra?: Record<string, unknown>;
}

/** A UI element entry — either plain data or an OO {@link UiElementInstance}. */
export type UiElementInput = UiElementData | UiElementInstance;

/** Configuration for a JSON UI file. */
export interface UiFileConfig {
  /** The file name under `RP/ui/` (e.g. `'my_screen.json'`). */
  fileName: string;
  /** The namespace used by this file (unique across all UI files). */
  namespace: string;
  /** The elements defined in this file. */
  elements: UiElementInput[];
}

export class UiFile {
  readonly config: UiFileConfig;

  constructor(config: UiFileConfig) {
    if (!config || typeof config.fileName !== 'string' || config.fileName.trim() === '') {
      throw new Error('UiFile requires a non-empty "fileName".');
    }
    if (!config.namespace || config.namespace.trim() === '') {
      throw new Error('UiFile requires a "namespace".');
    }
    if (!config.elements) {
      throw new Error('UiFile requires an "elements" array.');
    }
    this.config = {
      fileName: config.fileName,
      namespace: config.namespace,
      elements: config.elements,
    };
  }

  /** The full path under `RP/ui/` (always a single `ui/` prefix). */
  get path(): string {
    const base = this.config.fileName.replace(/^ui\//, '');
    return `ui/${base}`;
  }

  /** The plain UI path (relative to pack root) referenced by `_ui_defs.json`. */
  get uiDefPath(): string {
    const base = this.config.fileName.replace(/^ui\//, '');
    return `ui/${base}`;
  }

  /**
   * Builds the JSON UI file object: `{ "namespace": "...", ...elements }`.
   *
   * - Every top-level element becomes a key. OO elements have their namespace
   *   set to this file's namespace (unless they already have one).
   * - Any OO child control referenced by a container's `controls` is also
   *   collected into the output (so definitions are never lost).
   * - `controls` entries are normalized to the required object form
   *   `{ "ref": {} }` regardless of how they were provided.
   */
  buildJson(): object {
    const out: Record<string, unknown> = { namespace: this.config.namespace };
    const defined = new Set<string>();
    const register = (name: string, def: unknown, namespace: string): void => {
      const key = namespace ? `${namespace}.${name}` : name;
      if (!defined.has(key)) {
        defined.add(key);
        out[name] = def;
      }
    };

    // 1) Register explicitly-listed top-level elements first.
    for (const el of this.config.elements) {
      if (this.isElementInstance(el)) {
        // Set only if not already given an explicit namespace, so a child's own
        // `shared`/other namespace is preserved.
        if (!el.namespace) el.setNamespace(this.config.namespace);
        register(el.name, el.build(), el.namespace);
      } else {
        register(el.name, this.buildElement(el), this.config.namespace);
      }
    }

    // 2) Collect any OO child controls that were referenced by containers but
    //    not registered above (so their definitions are not lost).
    for (const el of this.config.elements) {
      if (this.isElementInstance(el)) this.collectChildControls(el, register);
      else this.collectChildControlsData(el, register);
    }

    return out;
  }

  /** Returns `true` if the entry is an OO {@link UiElementInstance}. */
  private isElementInstance(el: UiElementInput): el is UiElementInstance {
    return typeof (el as UiElementInstance).build === 'function';
  }

  /** Recursively registers OO child controls reachable from a container. */
  private collectChildControls(el: UiElementInstance, register: (n: string, d: unknown, ns: string) => void): void {
    // Containers store controls on their build output; peek via the opts.
    const controls = (el as unknown as { controls?: UiControl[] }).controls;
    if (!controls) return;
    for (const c of controls) {
      if (c instanceof UiElementInstance) {
        if (!c.namespace) c.setNamespace(el.namespace);
        register(c.name, c.build(), c.namespace);
        this.collectChildControls(c, register);
      }
    }
  }

  /** Recursively registers OO child controls from plain-data elements. */
  private collectChildControlsData(el: UiElementData, register: (n: string, d: unknown, ns: string) => void): void {
    const controls = el.controls;
    if (!controls) return;
    for (const c of controls) {
      if (c instanceof UiElementInstance) {
        if (!c.namespace) c.setNamespace(this.config.namespace);
        register(c.name, c.build(), c.namespace);
        this.collectChildControls(c, register);
      }
    }
  }

  /** Normalizes a `controls` array to the required `{ "ref": {} }` object form. */
  private normalizeControls(controls: Array<UiControl | UiElementData>): Array<Record<string, unknown>> {
    return controls.map((c) => {
      if (c instanceof UiElementInstance) {
        return { [c.ref(c.namespace || this.config.namespace)]: {} };
      }
      if (typeof c === 'string') return { [c]: {} };
      return c as Record<string, unknown>;
    });
  }

  /** Builds a plain-data element definition. */
  private buildElement(el: UiElementData): Record<string, unknown> {
    const def: Record<string, unknown> = { type: el.type };
    if (el.text !== undefined) def.text = el.text;
    if (el.texture !== undefined) def.texture = el.texture;
    if (el.size !== undefined) def.size = el.size;
    if (el.offset !== undefined) def.offset = el.offset;
    if (el.anchor_from !== undefined) def.anchor_from = el.anchor_from;
    if (el.anchor_to !== undefined) def.anchor_to = el.anchor_to;
    if (el.color !== undefined) def.color = el.color;
    if (el.alpha !== undefined) def.alpha = el.alpha;
    if (el.layer !== undefined) def.layer = el.layer;
    if (el.visible !== undefined) def.visible = el.visible;
    if (el.enabled !== undefined) def.enabled = el.enabled;
    if (el.controls !== undefined && el.controls.length > 0) {
      def.controls = this.normalizeControls(el.controls as Array<UiControl | UiElementData>);
    }
    if (el.bindings !== undefined && el.bindings.length > 0) def.bindings = el.bindings;
    if (el.variables !== undefined) Object.assign(def, el.variables);
    if (el.anims !== undefined && el.anims.length > 0) def.anims = el.anims;
    if (el.extra !== undefined) Object.assign(def, el.extra);
    return def;
  }

  /** Serializes to a pretty-printed JSON string. */
  toString(): string {
    return JSON.stringify(this.buildJson(), null, 2);
  }
}