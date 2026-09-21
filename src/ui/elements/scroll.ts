/**
 * Container / scroll / special JSON UI element classes:
 * `UiCollectionPanel`, `UiInputPanel`, `UiScrollView`, `UiScrollbarTrack`,
 * `UiScrollbarBox`, `UiFactory`, `UiCustom`.
 */

import {
  UiElement,
  type UiControl,
  type UiElementOptions,
  type UiElementType,
} from './UiElement.js';
import { UiContainer, type UiContainerOptions } from './containers.js';

/** A collection panel (like stack_panel but no orientation). */
export interface UiCollectionPanelOptions extends UiContainerOptions {}

export class UiCollectionPanel extends UiContainer {
  constructor(options: UiCollectionPanelOptions) {
    super('collection_panel', options);
  }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

/** An input panel (a panel that accepts input). */
export interface UiInputPanelOptions extends UiContainerOptions {
  /** Whether the input is modal. */
  modal?: boolean;
  /** Whether to always listen to input. */
  alwaysListenToInput?: boolean;
  /** Whether hover is enabled. */
  hoverEnabled?: boolean;
}

export class UiInputPanel extends UiContainer {
  modal: boolean | undefined;
  alwaysListenToInput: boolean | undefined;
  hoverEnabled: boolean | undefined;

  constructor(options: UiInputPanelOptions) {
    super('input_panel', options);
    this.modal = options.modal;
    this.alwaysListenToInput = options.alwaysListenToInput;
    this.hoverEnabled = options.hoverEnabled;
  }

  setModal(modal: boolean): this { this.modal = modal; return this; }
  setAlwaysListenToInput(v: boolean): this { this.alwaysListenToInput = v; return this; }
  setHoverEnabled(v: boolean): this { this.hoverEnabled = v; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.modal !== undefined) def.modal = this.modal;
    if (this.alwaysListenToInput !== undefined) def.always_listen_to_input = this.alwaysListenToInput;
    if (this.hoverEnabled !== undefined) def.hover_enabled = this.hoverEnabled;
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

/** A scrolling panel. */
export interface UiScrollViewOptions extends UiContainerOptions {
  /** Scrolling speed. */
  scrollSpeed?: number;
  /** Always handle scrolling. */
  alwaysHandleScrolling?: boolean;
  /** Name of the child control that behaves as the content root parent. */
  scrollContent?: string;
  /** Name of the child control that behaves as the view port. */
  scrollViewPort?: string;
  /** Name of the child control that behaves as the scrollbar thumb. */
  scrollbarBox?: string;
  /** Name of the child control that behaves as the scrollbar track. */
  scrollbarTrack?: string;
}

export class UiScrollView extends UiContainer {
  scrollSpeed: number | undefined;
  alwaysHandleScrolling: boolean | undefined;
  scrollContent: string | undefined;
  scrollViewPort: string | undefined;
  scrollbarBox: string | undefined;
  scrollbarTrack: string | undefined;

  constructor(options: UiScrollViewOptions) {
    super('scroll_view', options);
    this.scrollSpeed = options.scrollSpeed;
    this.alwaysHandleScrolling = options.alwaysHandleScrolling;
    this.scrollContent = options.scrollContent;
    this.scrollViewPort = options.scrollViewPort;
    this.scrollbarBox = options.scrollbarBox;
    this.scrollbarTrack = options.scrollbarTrack;
  }

  setScrollSpeed(speed: number): this { this.scrollSpeed = speed; return this; }
  setAlwaysHandleScrolling(v: boolean): this { this.alwaysHandleScrolling = v; return this; }
  setScrollContent(control: string): this { this.scrollContent = control; return this; }
  setScrollViewPort(control: string): this { this.scrollViewPort = control; return this; }
  setScrollbarBox(control: string): this { this.scrollbarBox = control; return this; }
  setScrollbarTrack(control: string): this { this.scrollbarTrack = control; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.scrollSpeed !== undefined) def.scroll_speed = this.scrollSpeed;
    if (this.alwaysHandleScrolling !== undefined) def.always_handle_scrolling = this.alwaysHandleScrolling;
    if (this.scrollContent !== undefined) def.scroll_content = this.scrollContent;
    if (this.scrollViewPort !== undefined) def.scroll_view_port = this.scrollViewPort;
    if (this.scrollbarBox !== undefined) def.scrollbar_box = this.scrollbarBox;
    if (this.scrollbarTrack !== undefined) def.scrollbar_track = this.scrollbarTrack;
    if (this.controls.length > 0) def.controls = this.buildControls();
    return def;
  }
}

/** A scrollbar track. */
export interface UiScrollbarTrackOptions extends UiElementOptions {
  /** The track button action id. */
  trackButton?: string;
}

export class UiScrollbarTrack extends UiElement {
  trackButton: string | undefined;
  constructor(options: UiScrollbarTrackOptions) {
    super('scrollbar_track', options);
    this.trackButton = options.trackButton;
  }
  setTrackButton(id: string): this { this.trackButton = id; return this; }
  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.trackButton !== undefined) def.scrollbar_track_button = this.trackButton;
    return def;
  }
}

/** A scrollbar thumb (box). */
export interface UiScrollbarBoxOptions extends UiElementOptions {
  /** The touch button action id. */
  touchButton?: string;
}

export class UiScrollbarBox extends UiElement {
  touchButton: string | undefined;
  constructor(options: UiScrollbarBoxOptions) {
    super('scrollbar_box', options);
    this.touchButton = options.touchButton;
  }
  setTouchButton(id: string): this { this.touchButton = id; return this; }
  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.touchButton !== undefined) def.scrollbar_touch_button = this.touchButton;
    return def;
  }
}

/** A factory element (generates elements). */
export interface UiFactoryOptions extends UiElementOptions {
  /** The factory name. */
  factoryName?: string;
  /** The control id overrides passed to the factory. */
  controlId?: Record<string, string>;
}

export class UiFactory extends UiElement {
  factoryName: string | undefined;
  controlId: Record<string, string> | undefined;

  constructor(options: UiFactoryOptions) {
    super('factory', options);
    this.factoryName = options.factoryName;
    this.controlId = options.controlId;
  }

  setFactoryName(name: string): this { this.factoryName = name; return this; }
  setControlId(controlId: Record<string, string>): this { this.controlId = controlId; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.factoryName !== undefined) def.name = this.factoryName;
    if (this.controlId !== undefined) def.control_ids = this.controlId;
    return def;
  }
}

/** A custom renderer element (uses a hardcoded renderer). */
export interface UiCustomOptions extends UiElementOptions {
  /** The renderer name (e.g. `'hotbar_renderer'`). */
  renderer?: string;
}

export class UiCustom extends UiElement {
  renderer: string | undefined;
  constructor(options: UiCustomOptions) {
    super('custom', options);
    this.renderer = options.renderer;
  }
  setRenderer(renderer: string): this { this.renderer = renderer; return this; }
  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.renderer !== undefined) def.renderer = this.renderer;
    return def;
  }
}

export type { UiControl, UiElementType };
