/**
 * Basic JSON UI element classes: `UiLabel`, `UiImage`, `UiButton`.
 */

import { UiElement, type UiColor, type UiElementOptions, type UiPair } from './UiElement.js';

/** A text label element. */
export interface UiLabelOptions extends UiElementOptions {
  /** The text to display (may use `$variables` / `#bindings`). */
  text?: string;
  /** Text color. */
  color?: UiColor;
  /** Whether to localize the text. */
  localize?: boolean;
}

export class UiLabel extends UiElement {
  /** Text content. */
  text: string | undefined;
  /** Text color. */
  color: UiColor | undefined;
  /** Whether to localize. */
  localize: boolean | undefined;

  constructor(options: UiLabelOptions & { text?: string }) {
    super('label', options);
    this.text = options.text;
    this.color = options.color;
    this.localize = options.localize;
  }

  setText(text: string): this {
    this.text = text;
    return this;
  }
  setColor(color: UiColor): this {
    this.color = color;
    return this;
  }
  setLocalize(localize: boolean): this {
    this.localize = localize;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.text !== undefined) def.text = this.text;
    if (this.color !== undefined) def.color = this.color;
    if (this.localize !== undefined) def.localize = this.localize;
    return def;
  }
}

/** An image element. */
export interface UiImageOptions extends UiElementOptions {
  /** The texture path. */
  texture: string;
  /** Whether the image tiles. */
  tiled?: boolean;
  /** UV bounds `[u, v, u2, v2]`. */
  uv?: [number, number, number, number];
  /** Whether to use a nine-slice. */
  nineSlice?: boolean;
}

export class UiImage extends UiElement {
  texture: string;
  tiled: boolean | undefined;
  uv: [number, number, number, number] | undefined;
  nineSlice: boolean | undefined;

  constructor(options: UiImageOptions) {
    super('image', options);
    if (!options.texture) throw new Error('UiImage requires a "texture".');
    this.texture = options.texture;
    this.tiled = options.tiled;
    this.uv = options.uv;
    this.nineSlice = options.nineSlice;
  }

  setTexture(texture: string): this {
    this.texture = texture;
    return this;
  }
  setTiled(tiled: boolean): this {
    this.tiled = tiled;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    def.texture = this.texture;
    if (this.tiled !== undefined) def.tiled = this.tiled;
    if (this.uv !== undefined) def.uv = this.uv;
    if (this.nineSlice !== undefined) def.nine_slice = this.nineSlice;
    return def;
  }
}

/** A button element. */
export interface UiButtonOptions extends UiElementOptions {
  /** The button label text. */
  text?: string;
  /** The default button texture. */
  texture?: string;
  /** Whether the button is focused. */
  focus?: boolean;
}

export class UiButton extends UiElement {
  text: string | undefined;
  texture: string | undefined;
  focus: boolean | undefined;

  constructor(options: UiButtonOptions) {
    super('button', options);
    this.text = options.text;
    this.texture = options.texture;
    this.focus = options.focus;
  }

  setText(text: string): this {
    this.text = text;
    return this;
  }
  setTexture(texture: string): this {
    this.texture = texture;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.text !== undefined) def.text = this.text;
    if (this.texture !== undefined) def.texture = this.texture;
    if (this.focus !== undefined) def.focus = this.focus;
    return def;
  }
}

export type { UiPair as _UiPair };
