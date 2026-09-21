/**
 * The base `UiElement` class — the root of the JSON UI element hierarchy.
 *
 * This is the Tkinter-style foundation: every UI element is a class that holds a
 * name, a type, and properties, and can produce a JSON definition via `build()`.
 * Elements can be composed / nested and converted to reference strings for use
 * in a screen's `controls` array.
 *
 * A `namespace` may be attached to an element (usually by `UiFile`) so that
 * container elements can resolve child references as `name@namespace.name`.
 */

/** A JSON UI `anchor` (e.g. `'top_left'`, `'center'`, `'center_top'`). */
export type UiAnchor = string;

/** Size/offset values are numbers or expression strings. */
export type UiValue = string | number;

/** A `[x, y]` pair of size/offset values. */
export type UiPair = [UiValue, UiValue];

/** A color as `[r, g, b]` floats 0-1. */
export type UiColor = [number, number, number];

/** The set of JSON UI element types. */
export type UiElementType =
  | 'label'
  | 'image'
  | 'button'
  | 'panel'
  | 'stack_panel'
  | 'collection_panel'
  | 'grid'
  | 'label'
  | 'image'
  | 'button'
  | 'toggle'
  | 'dropdown'
  | 'slider'
  | 'slider_box'
  | 'edit_box'
  | 'input_panel'
  | 'scroll_view'
  | 'scrollbar_track'
  | 'scrollbar_box'
  | 'factory'
  | 'custom'
  | 'screen'
  | 'selection_wheel';

/** Common per-element options shared by all element classes. */
export interface UiElementOptions {
  /** Element name (unique within its namespace). */
  name: string;
  /** Size `[width, height]`. */
  size?: UiPair;
  /** Offset from the anchor. */
  offset?: UiPair;
  /** Anchor the element starts from. */
  anchorFrom?: UiAnchor;
  /** Anchor the element ends at. */
  anchorTo?: UiAnchor;
  /** Opacity (0-1). */
  alpha?: number;
  /** Z-order layer. */
  layer?: number;
  /** Visibility expression. */
  visible?: string;
  /** Whether the element is enabled. */
  enabled?: boolean;
  /** Element-scoped `$variables`. */
  variables?: Record<string, unknown>;
  /** Animation references (`@namespace.anim`). */
  anims?: string[];
  /** Data bindings. */
  bindings?: Array<Record<string, unknown>>;
  /** Extra/raw properties. */
  extra?: Record<string, unknown>;
}

/** The base class for all JSON UI elements. */
export abstract class UiElement {
  /** Element name (unique within the namespace). */
  name: string;
  /** Element type. */
  type: UiElementType;
  /** The namespace this element lives in (usually set by `UiFile`). */
  namespace: string;
  /** Common properties. */
  protected opts: UiElementOptions;

  constructor(type: UiElementType, options: UiElementOptions) {
    if (!options || typeof options.name !== 'string' || options.name.trim() === '') {
      throw new Error('UiElement requires a non-empty "name".');
    }
    this.type = type;
    this.name = options.name;
    this.namespace = options.variables?.['__namespace__'] as string | undefined ?? '';
    this.opts = { ...options };
  }

  // ---- 链式 setter ----
  setSize(size: UiPair): this {
    this.opts.size = size;
    return this;
  }
  setOffset(offset: UiPair): this {
    this.opts.offset = offset;
    return this;
  }
  setAnchor(from: UiAnchor, to?: UiAnchor): this {
    this.opts.anchorFrom = from;
    if (to !== undefined) this.opts.anchorTo = to;
    return this;
  }
  setAlpha(alpha: number): this {
    this.opts.alpha = alpha;
    return this;
  }
  setLayer(layer: number): this {
    this.opts.layer = layer;
    return this;
  }
  setVisible(visible: string): this {
    this.opts.visible = visible;
    return this;
  }
  setEnabled(enabled: boolean): this {
    this.opts.enabled = enabled;
    return this;
  }
  setVariable(name: string, value: unknown): this {
    this.opts.variables = this.opts.variables ?? {};
    this.opts.variables[name] = value;
    return this;
  }
  addAnim(anim: string): this {
    this.opts.anims = this.opts.anims ?? [];
    this.opts.anims.push(anim);
    return this;
  }
  setExtra(extra: Record<string, unknown>): this {
    this.opts.extra = extra;
    return this;
  }

  /** Sets the owning namespace (used by `ref()` / container resolution). */
  setNamespace(namespace: string): this {
    this.namespace = namespace;
    return this;
  }

  /** Adds a data binding. Returns `this` for chaining. */
  addBinding(binding: Record<string, unknown>): this {
    this.opts.bindings = this.opts.bindings ?? [];
    this.opts.bindings.push(binding);
    return this;
  }

  /** Sets all data bindings. Returns `this` for chaining. */
  setBindings(bindings: Array<Record<string, unknown>>): this {
    this.opts.bindings = bindings;
    return this;
  }

  /** Sets an arbitrary property on the element. Returns `this` for chaining. */
  setProperty(name: string, value: unknown): this {
    this.opts.extra = this.opts.extra ?? {};
    this.opts.extra[name] = value;
    return this;
  }

  /**
   * Builds the JSON definition object for this element.
   * Subclasses extend the base definition with their own properties.
   */
  build(): Record<string, unknown> {
    const def: Record<string, unknown> = { type: this.type };
    const o = this.opts;
    if (o.size !== undefined) def.size = o.size;
    if (o.offset !== undefined) def.offset = o.offset;
    if (o.anchorFrom !== undefined) def.anchor_from = o.anchorFrom;
    if (o.anchorTo !== undefined) def.anchor_to = o.anchorTo;
    if (o.alpha !== undefined) def.alpha = o.alpha;
    if (o.layer !== undefined) def.layer = o.layer;
    if (o.visible !== undefined) def.visible = o.visible;
    if (o.enabled !== undefined) def.enabled = o.enabled;
    if (o.variables !== undefined) Object.assign(def, o.variables);
    if (o.anims !== undefined && o.anims.length > 0) def.anims = o.anims;
    if (o.bindings !== undefined && o.bindings.length > 0) def.bindings = o.bindings;
    if (o.extra !== undefined) Object.assign(def, o.extra);
    return def;
  }

  /** Returns the reference string `name@namespace.name` (namespace may be empty). */
  ref(namespace = this.namespace): string {
    return namespace ? `${this.name}@${namespace}.${this.name}` : this.name;
  }

  /** Converts a control entry (element/string/object) to the `{ ref: {} }` form. */
  static controlToEntry(c: UiControl, namespace = ''): Record<string, unknown> {
    if (c instanceof UiElement) return { [c.ref(namespace)]: {} };
    if (typeof c === 'string') return { [c]: {} };
    return c as Record<string, unknown>;
  }
}

/** A control reference: an element, a raw string, or a raw object. */
export type UiControl = UiElement | string | Record<string, unknown>;