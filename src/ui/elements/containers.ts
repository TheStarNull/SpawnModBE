/**
 * Container JSON UI element classes: `UiPanel`, `UiStackPanel`, `UiGrid`, `UiScreen`.
 *
 * Containers hold `controls` (child elements), which may be:
 *  - a {@link UiElement} instance (auto-converted to a `name@namespace.name` reference)
 *  - a raw control string (e.g. `'hello@ns.hello'`)
 *  - a raw object (for inline overrides)
 */

import { UiElement, type UiControl, type UiElementOptions, type UiElementType } from './UiElement.js';

/** Options for container elements. */
export interface UiContainerOptions extends UiElementOptions {
  /** Child controls. */
  controls?: UiControl[];
}

/** A container base: holds children controls. */
export abstract class UiContainer extends UiElement {
  /** Child controls. */
  controls: UiControl[];

  constructor(type: UiElementType, options: UiContainerOptions) {
    super(type, options);
    this.controls = options.controls ?? [];
  }

  /** Adds a child control (element / string / object). Returns `this`. */
  add(child: UiControl): this {
    this.controls.push(child);
    return this;
  }

  /** Adds several children at once. Returns `this`. */
  addAll(children: UiControl[]): this {
    this.controls.push(...children);
    return this;
  }

  /** Builds the `controls` array using the element's namespace. */
  protected buildControls(): Array<Record<string, unknown>> {
    return this.controls.map((c) => UiElement.controlToEntry(c, this.namespace));
  }
}

/** A plain panel (absolute-positioned children). */
export interface UiPanelOptions extends UiContainerOptions {
  /** Background texture (if any). */
  texture?: string;
  /** Whether children clip to the panel bounds. */
  clip?: boolean;
}

export class UiPanel extends UiContainer {
  texture: string | undefined;
  clip: boolean | undefined;

  constructor(options: UiPanelOptions) {
    super('panel', options);
    this.texture = options.texture;
    this.clip = options.clip;
  }

  setTexture(texture: string): this {
    this.texture = texture;
    return this;
  }
  setClip(clip: boolean): this {
    this.clip = clip;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.texture !== undefined) def.texture = this.texture;
    if (this.clip !== undefined) def.clip = this.clip;
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

/** A vertical/horizontal stack panel (children laid out without overlap). */
export interface UiStackPanelOptions extends UiPanelOptions {
  /** Stack orientation: `'vertical'` (default) or `'horizontal'`. */
  orientation?: 'vertical' | 'horizontal';
}

export class UiStackPanel extends UiPanel {
  override type: 'stack_panel';
  orientation: 'vertical' | 'horizontal';

  constructor(options: UiStackPanelOptions) {
    super(options);
    this.type = 'stack_panel';
    this.orientation = options.orientation ?? 'vertical';
  }

  setOrientation(orientation: 'vertical' | 'horizontal'): this {
    this.orientation = orientation;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    def.orientation = this.orientation;
    return def;
  }
}

/** A grid (lays out children in rows/columns). */
export interface UiGridOptions extends UiContainerOptions {
  /** Grid dimensions `[columns, rows]`. */
  dimensions?: [string | number, string | number];
  /** Cell spacing. */
  gridDimensions?: [number, number];
}

export class UiGrid extends UiContainer {
  dimensions: [string | number, string | number] | undefined;
  gridDimensions: [number, number] | undefined;

  constructor(options: UiGridOptions) {
    super('grid', options);
    this.dimensions = options.dimensions;
    this.gridDimensions = options.gridDimensions;
  }

  setDimensions(dimensions: [string | number, string | number]): this {
    this.dimensions = dimensions;
    return this;
  }
  setGridDimensions(gridDimensions: [number, number]): this {
    this.gridDimensions = gridDimensions;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.dimensions !== undefined) def.dimensions = this.dimensions;
    if (this.gridDimensions !== undefined) def.grid_dimensions = this.gridDimensions;
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

/** A full-screen root element. */
export class UiScreen extends UiContainer {
  constructor(options: UiPanelOptions) {
    super('screen', options);
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

export type { UiElementType };