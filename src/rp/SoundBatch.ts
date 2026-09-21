/**
 * The `SoundBatch` class — describes a batch of sound events to register at once.
 *
 * This is a declarative way to define several sounds (event ID → sound path +
 * options) and register them together into the RP's `sounds/sound_definitions.json`
 * via `Resource.applySoundBatch(batch, audioDataMap?)`.
 *
 * Unlike calling `addSound` repeatedly, a batch keeps the definitions in one
 * place and is easy to persist / share.
 */

/** A single sound definition inside a batch. */
export interface SoundBatchEntry {
  /** The sound event identifier (e.g. `'mymod:whoosh'`). */
  soundId: string;
  /** The RP-relative path to the sound file (no `.ogg`). */
  soundPath: string;
  /** Whether the sound streams (used for long music tracks). */
  stream?: boolean;
  /** The sound volume. Defaults to `1.0`. */
  volume?: number;
  /** The sound pitch. Defaults to `1.0`. */
  pitch?: number;
  /** The max distance the sound carries. */
  maxDistance?: number;
  /** Whether to preload the sound on low-memory devices. */
  loadOnLowMemory?: boolean;
}

/** Configuration accepted by {@link SoundBatch}. */
export interface SoundBatchConfig {
  /** The sound entries to register. */
  sounds: SoundBatchEntry[];
}

export class SoundBatch {
  readonly sounds: SoundBatchEntry[];

  constructor(config: SoundBatchConfig) {
    if (!config || !config.sounds || config.sounds.length === 0) {
      throw new Error('SoundBatch requires at least one sound entry.');
    }
    this.sounds = config.sounds.map((s) => ({ ...s }));
  }

  /**
   * Builds an options map that can be passed to `Resource.addSound`.
   * Each entry becomes `{ soundId, soundPath, options? }`.
   */
  toAddSoundCalls(): Array<{
    soundId: string;
    soundPath: string;
    options: Record<string, unknown>;
  }> {
    return this.sounds.map((s) => {
      const options: Record<string, unknown> = {};
      if (s.stream !== undefined) options.stream = s.stream;
      if (s.volume !== undefined) options.volume = s.volume;
      if (s.pitch !== undefined) options.pitch = s.pitch;
      if (s.maxDistance !== undefined) options.maxDistance = s.maxDistance;
      if (s.loadOnLowMemory !== undefined) options.loadOnLowMemory = s.loadOnLowMemory;
      return { soundId: s.soundId, soundPath: s.soundPath, options };
    });
  }
}