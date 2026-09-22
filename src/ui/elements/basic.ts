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
  /** Start position of the texture mapping `[u, v]`. */
  uv?: [number, number];
  /** Size of the texture mapping `[width, height]`. */
  uvSize?: [number, number];
  /** Whether to use a nine-slice. */
  nineSlice?: boolean;
  /** Nine-slice size: `n` or `[x0, y0, x1, y1]`. */
  nineSliceSize?: number | [number, number, number, number];
}

export class UiImage extends UiElement {
  texture: string;
  tiled: boolean | undefined;
  uv: [number, number] | undefined;
  uvSize: [number, number] | undefined;
  nineSlice: boolean | undefined;
  nineSliceSize: number | [number, number, number, number] | undefined;

  constructor(options: UiImageOptions) {
    super('image', options);
    if (!options.texture) throw new Error('UiImage requires a "texture".');
    this.texture = options.texture;
    this.tiled = options.tiled;
    this.uv = options.uv;
    this.uvSize = options.uvSize;
    this.nineSlice = options.nineSlice;
    this.nineSliceSize = options.nineSliceSize;
  }

  setTexture(texture: string): this {
    this.texture = texture;
    return this;
  }
  setTiled(tiled: boolean): this {
    this.tiled = tiled;
    return this;
  }
  /** Sets the texture-map start position `[u, v]`. */
  setUV(uv: [number, number]): this {
    this.uv = uv;
    return this;
  }
  /** Sets the texture-map size `[width, height]`. */
  setUVSize(uvSize: [number, number]): this {
    this.uvSize = uvSize;
    return this;
  }
  setNineSlice(nineSlice: boolean): this {
    this.nineSlice = nineSlice;
    return this;
  }
  setNineSliceSize(size: number | [number, number, number, number]): this {
    this.nineSliceSize = size;
    return this;
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    def.texture = this.texture;
    if (this.tiled !== undefined) def.tiled = this.tiled;
    if (this.uv !== undefined) def.uv = this.uv;
    if (this.uvSize !== undefined) def.uv_size = this.uvSize;
    if (this.nineSlice !== undefined) def.nine_slice = this.nineSlice;
    if (this.nineSliceSize !== undefined) def.nineslice_size = this.nineSliceSize;
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
  setFocus(focus: boolean): this {
    this.focus = focus;
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
