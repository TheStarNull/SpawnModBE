/**
 * The `RecordDisc` class — describes a music disc (record) item.
 *
 * On top of the base {@link Item}, record items get:
 *  - `minecraft:record` — jukebox playback config
 *
 * Component format follows the Bedrock Wiki reference
 * (https://wiki.bedrock.dev/items/item-components#record).
 *
 * @example
 * ```ts
 * const myDisc = new RecordDisc({
 *   identifier: 'mymod:my_disc',
 *   name: 'Mystery Disc',
 *   comparatorSignal: 3,
 *   duration: 12.5,
 *   soundEvent: 'record.13',
 *   texturePath: 'textures/items/record_13',
 *   rarity: 'rare',
 * });
 * ```
 */

import type { ItemConfig } from './Item.js';
import { Item } from './Item.js';

/** Configuration accepted by {@link RecordDisc}. */
export interface RecordDiscConfig extends ItemConfig {
  /** Redstone comparator power (0-15) emitted by a jukebox holding the disc. */
  comparatorSignal?: number;
  /** Playback duration (seconds) in the jukebox. Defaults to 5. */
  duration?: number;
  /** The sound event played when inserted into a jukebox. */
  soundEvent: string;
  /**
   * Optional RP-relative path to the music file (without `.ogg`),
   * e.g. `'sounds/music/records/my_disc'`. When set, both the sound
   * definition and the audio asset can be registered with
   * {@link Resource.addSound}.
   */
  soundPath?: string;
}

/** The fully-resolved record configuration. */
export interface ResolvedRecordDiscConfig {
  [key: string]: unknown;
  identifier: string;
  category: NonNullable<ItemConfig['category']>;
  rarity: NonNullable<ItemConfig['rarity']>;
  maxStackSize: number;
  formatVersion: string;
  comparatorSignal: number;
  duration: number;
  soundEvent: string;
  soundPath: string | undefined;
}

export class RecordDisc extends Item {
  /** The fully-normalized record configuration. */
  declare readonly config: ResolvedRecordDiscConfig;

  constructor(config: RecordDiscConfig) {
    super(config as ItemConfig);
    this.config = {
      ...this.config,
      comparatorSignal: config.comparatorSignal ?? 0,
      duration: config.duration ?? 5,
      soundEvent: config.soundEvent,
      soundPath: config.soundPath,
    } as ResolvedRecordDiscConfig;
  }

  /** The RP-relative music file path (without `.ogg`), if provided. */
  get soundPath(): string | undefined {
    return this.config.soundPath;
  }

  /** Builds the base components plus the record component. */
  protected override components(): Record<string, unknown> {
    const comps = super.components();
    const c = this.config;

    comps['minecraft:record'] = {
      comparator_signal: c.comparatorSignal,
      duration: c.duration,
      sound_event: c.soundEvent,
    };

    return comps;
  }
}
