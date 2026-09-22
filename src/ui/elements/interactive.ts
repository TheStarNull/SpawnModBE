/**
 * Interactive JSON UI element classes: `UiToggle`, `UiDropdown`, `UiSlider`,
 * `UiSliderBox`, `UiEditBox`, `UiSelectionWheel`.
 *
 * These elements accept user input and mostly expose string/number/boolean
 * properties (e.g. `toggle_name`, `slider_steps`, `text_box_name`).
 *
 * Format per Bedrock Wiki:
 * https://wiki.bedrock.dev/json-ui/json-ui-documentation
 */

import { UiElement, type UiElementOptions } from './UiElement.js';

/** A toggle element (2 states: checked/unchecked, each with hover/locked variants). */
export interface UiToggleOptions extends UiElementOptions {
  /** Identifier for the toggle group it belongs to. */
  toggleName?: string;
  /** Default state (checked or not). */
  defaultState?: boolean;
  /** Index of the toggle in its group. */
  groupForcedIndex?: number;
  /** Index of the default toggle of its group. */
  groupDefaultSelected?: number;
  /** Name of the child control shown in the checked state. */
  checkedControl?: string;
  /** Name of the child control shown in the unchecked state. */
  uncheckedControl?: string;
}

export class UiToggle extends UiElement {
  toggleName: string | undefined;
  defaultState: boolean | undefined;
  groupForcedIndex: number | undefined;
  groupDefaultSelected: number | undefined;
  checkedControl: string | undefined;
  uncheckedControl: string | undefined;

  constructor(options: UiToggleOptions) {
    super('toggle', options);
    this.toggleName = options.toggleName;
    this.defaultState = options.defaultState;
    this.groupForcedIndex = options.groupForcedIndex;
    this.groupDefaultSelected = options.groupDefaultSelected;
    this.checkedControl = options.checkedControl;
    this.uncheckedControl = options.uncheckedControl;
  }

  setToggleName(name: string): this { this.toggleName = name; return this; }
  setDefaultState(state: boolean): this { this.defaultState = state; return this; }
  setCheckedControl(control: string): this { this.checkedControl = control; return this; }
  setUncheckedControl(control: string): this { this.uncheckedControl = control; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.toggleName !== undefined) def.toggle_name = this.toggleName;
    if (this.defaultState !== undefined) def.toggle_default_state = this.defaultState;
    if (this.groupForcedIndex !== undefined) def.toggle_group_forced_index = this.groupForcedIndex;
    if (this.groupDefaultSelected !== undefined) def.toggle_group_default_selected = this.groupDefaultSelected;
    if (this.checkedControl !== undefined) def.checked_control = this.checkedControl;
    if (this.uncheckedControl !== undefined) def.unchecked_control = this.uncheckedControl;
    return def;
  }
}

/** A dropdown element (a toggle for dropdown purposes). */
export interface UiDropdownOptions extends UiElementOptions {
  /** Identifier for the dropdown. */
  dropdownName?: string;
  /** Child control that behaves as the root content panel. */
  contentControl?: string;
  /** Child control that behaves as the inside content. */
  area?: string;
}

export class UiDropdown extends UiElement {
  dropdownName: string | undefined;
  contentControl: string | undefined;
  area: string | undefined;

  constructor(options: UiDropdownOptions) {
    super('dropdown', options);
    this.dropdownName = options.dropdownName;
    this.contentControl = options.contentControl;
    this.area = options.area;
  }

  setDropdownName(name: string): this { this.dropdownName = name; return this; }
  setContentControl(control: string): this { this.contentControl = control; return this; }
  setArea(area: string): this { this.area = area; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.dropdownName !== undefined) def.dropdown_name = this.dropdownName;
    if (this.contentControl !== undefined) def.dropdown_content_control = this.contentControl;
    if (this.area !== undefined) def.dropdown_area = this.area;
    return def;
  }
}

/** A slider element (range input). */
export interface UiSliderOptions extends UiElementOptions {
  /** Identifier for the slider. */
  sliderName?: string;
  /** How many steps (values) the slider has. */
  steps?: number;
  /** Orientation: `'vertical'` or `'horizontal'`. */
  direction?: 'vertical' | 'horizontal';
  /** Name of the child control that behaves as the slider thumb. */
  boxControl?: string;
  /** Name of the child control that behaves as the background. */
  backgroundControl?: string;
  /** Name of the child control that behaves as the progress overlay. */
  progressControl?: string;
}

export class UiSlider extends UiElement {
  sliderName: string | undefined;
  steps: number | undefined;
  direction: 'vertical' | 'horizontal' | undefined;
  boxControl: string | undefined;
  backgroundControl: string | undefined;
  progressControl: string | undefined;

  constructor(options: UiSliderOptions) {
    super('slider', options);
    this.sliderName = options.sliderName;
    this.steps = options.steps;
    this.direction = options.direction;
    this.boxControl = options.boxControl;
    this.backgroundControl = options.backgroundControl;
    this.progressControl = options.progressControl;
  }

  setSliderName(name: string): this { this.sliderName = name; return this; }
  setSteps(steps: number): this { this.steps = steps; return this; }
  setDirection(direction: 'vertical' | 'horizontal'): this { this.direction = direction; return this; }
  setBoxControl(control: string): this { this.boxControl = control; return this; }
  setBackgroundControl(control: string): this { this.backgroundControl = control; return this; }
  setProgressControl(control: string): this { this.progressControl = control; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.sliderName !== undefined) def.slider_name = this.sliderName;
    if (this.steps !== undefined) def.slider_steps = this.steps;
    if (this.direction !== undefined) def.slider_direction = this.direction;
    if (this.boxControl !== undefined) def.slider_box_control = this.boxControl;
    if (this.backgroundControl !== undefined) def.background_control = this.backgroundControl;
    if (this.progressControl !== undefined) def.progress_control = this.progressControl;
    return def;
  }
}

/** The slider thumb ("box") element. */
export interface UiSliderBoxOptions extends UiElementOptions {
  defaultControl?: string;
  hoverControl?: string;
  lockedControl?: string;
}

export class UiSliderBox extends UiElement {
  defaultControl: string | undefined;
  hoverControl: string | undefined;
  lockedControl: string | undefined;

  constructor(options: UiSliderBoxOptions) {
    super('slider_box', options);
    this.defaultControl = options.defaultControl;
    this.hoverControl = options.hoverControl;
    this.lockedControl = options.lockedControl;
  }

  setDefaultControl(control: string): this { this.defaultControl = control; return this; }
  setHoverControl(control: string): this { this.hoverControl = control; return this; }
  setLockedControl(control: string): this { this.lockedControl = control; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.defaultControl !== undefined) def.default_control = this.defaultControl;
    if (this.hoverControl !== undefined) def.hover_control = this.hoverControl;
    if (this.lockedControl !== undefined) def.locked_control = this.lockedControl;
    return def;
  }
}

/** A text field (edit box) element. */
export interface UiEditBoxOptions extends UiElementOptions {
  /** Identifier for the text box. */
  textBoxName?: string;
  /** Max characters allowed. */
  maxLength?: number;
  /** Allowed character types: `'ExtendedASCII'`, `'IdentifierChars'`, `'NumberChars'`. */
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
  /** Allows multiline text. */
  enabledNewline?: boolean;
  /** Name of the child control that displays the text. */
  textControl?: string;
  /** Name of the child control that shows placeholder text. */
  placeholderControl?: string;
}

export class UiEditBox extends UiElement {
  textBoxName: string | undefined;
  maxLength: number | undefined;
  textType: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars' | undefined;
  enabledNewline: boolean | undefined;
  textControl: string | undefined;
  placeholderControl: string | undefined;

  constructor(options: UiEditBoxOptions) {
    super('edit_box', options);
    this.textBoxName = options.textBoxName;
    this.maxLength = options.maxLength;
    this.textType = options.textType;
    this.enabledNewline = options.enabledNewline;
    this.textControl = options.textControl;
    this.placeholderControl = options.placeholderControl;
  }

  setTextBoxName(name: string): this { this.textBoxName = name; return this; }
  setMaxLength(maxLength: number): this { this.maxLength = maxLength; return this; }
  setTextType(textType: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars'): this { this.textType = textType; return this; }
  setEnabledNewline(enabled: boolean): this { this.enabledNewline = enabled; return this; }
  setTextControl(control: string): this { this.textControl = control; return this; }
  setPlaceholderControl(control: string): this { this.placeholderControl = control; return this; }

  override build(): Record<string, unknown> {
    const def = super.build();
    if (this.textBoxName !== undefined) def.text_box_name = this.textBoxName;
    if (this.maxLength !== undefined) def.max_length = this.maxLength;
    if (this.textType !== undefined) def.text_type = this.textType;
    if (this.enabledNewline !== undefined) def.enabled_newline = this.enabledNewline;
    if (this.textControl !== undefined) def.text_control = this.textControl;
    if (this.placeholderControl !== undefined) def.place_holder_control = this.placeholderControl;
    return def;
  }
}

/** A selection wheel element. */
export interface UiSelectionWheelOptions extends UiElementOptions {
  /** Any selection-wheel specific property (passed through to output). */
  [k: string]: unknown;
}

/** Base option fields already consumed by `UiElement`. */
const KNOWN_OPTION_KEYS = new Set([
  'name', 'size', 'offset', 'anchorFrom', 'anchorTo', 'alpha', 'layer',
  'visible', 'enabled', 'variables', 'anims', 'bindings', 'extra',
]);

export class UiSelectionWheel extends UiElement {
  constructor(options: UiSelectionWheelOptions) {
    super('selection_wheel', options);
    // Pass through any selection-wheel-specific property that is not a base
    // option, so fields like `button_mappings` are not silently dropped.
    for (const [key, value] of Object.entries(options)) {
      if (!KNOWN_OPTION_KEYS.has(key)) this.setProperty(key, value);
    }
  }
}