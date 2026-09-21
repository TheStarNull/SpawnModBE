/**
 * The `LangFile` class — generates a Minecraft `.lang` localization file.
 *
 * Lang files live in the RP under `texts/<language>.lang` (e.g. `texts/en_US.lang`).
 * Each line is a `key=value` pair. Common keys include:
 *  - `item.<identifier>.name` — item display name
 *  - `entity.<identifier>.name` — entity display name
 *  - `item.spawn_egg.entity.<id>.name` — spawn egg display name
 *  - `item.record_<id>.desc` — music disc description
 *  - `action.interact.<label>` — interaction labels
 *
 * The file may include `##` comments. Lines starting with `#` are comments too.
 */

/** A single key-value entry. */
export interface LangEntry {
  key: string;
  value: string;
}

/** Configuration accepted by {@link LangFile}. */
export interface LangFileConfig {
  /** The locale code, e.g. `'en_US'`. Defaults to `'en_US'`. */
  locale?: string;
  /** Initial entries. */
  entries?: Array<LangEntry | [string, string]>;
}

export class LangFile {
  readonly locale: string;
  private readonly entries: Map<string, string> = new Map();

  constructor(config?: LangFileConfig) {
    this.locale = config?.locale ?? 'en_US';
    for (const entry of config?.entries ?? []) {
      if (Array.isArray(entry)) {
        this.set(entry[0], entry[1]);
      } else {
        this.set(entry.key, entry.value);
      }
    }
  }

  /** Sets a key-value pair, overwriting any existing value. */
  set(key: string, value: string): this {
    this.entries.set(key, value);
    return this;
  }

  /** Sets many entries at once. */
  setAll(entries: Array<LangEntry | [string, string]>): this {
    for (const entry of entries) {
      if (Array.isArray(entry)) this.set(entry[0], entry[1]);
      else this.set(entry.key, entry.value);
    }
    return this;
  }

  /** Returns the value for a key, or `undefined`. */
  get(key: string): string | undefined {
    return this.entries.get(key);
  }

  /** Removes a key. Returns `true` if it existed. */
  remove(key: string): boolean {
    return this.entries.delete(key);
  }

  /**
   * Convenience: sets the display-name entry for an item.
   * `item.<identifier>.name`
   */
  setItemName(identifier: string, name: string): this {
    return this.set(`item.${identifier}.name`, name);
  }

  /**
   * Convenience: sets the display-name entry for an entity.
   * `entity.<identifier>.name`
   */
  setEntityName(identifier: string, name: string): this {
    return this.set(`entity.${identifier}.name`, name);
  }

  /**
   * Convenience: sets the spawn-egg name for an entity.
   * `item.spawn_egg.entity.<shortId>.name`
   */
  setSpawnEggName(identifier: string, name: string): this {
    const short = identifier.includes(':')
      ? identifier.slice(identifier.indexOf(':') + 1)
      : identifier;
    return this.set(`item.spawn_egg.entity.${short}.name`, name);
  }

  /** Convenience: sets a music-disc description (`item.record_<id>.desc`). */
  setRecordDesc(soundEvent: string, description: string): this {
    const dots = soundEvent.lastIndexOf('.');
    const id = dots >= 0 ? soundEvent.slice(dots + 1) : soundEvent;
    return this.set(`item.record_${id}.desc`, description);
  }

  /** Convenience: sets an interaction label. */
  setInteract(key: string, label: string): this {
    return this.set(`action.interact.${key}`, label);
  }

  /**
   * Serializes the file to the `.lang` text format.
   * Entries are sorted by key for deterministic output.
   */
  toString(): string {
    const lines: string[] = [];
    for (const [key, value] of [...this.entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`${key}=${value}`);
    }
    return lines.length > 0 ? lines.join('\n') + '\n' : '';
  }

  /** Returns the RP file path (`texts/<locale>.lang`). */
  get filePath(): string {
    return `texts/${this.locale}.lang`;
  }

  /** Number of entries. */
  get size(): number {
    return this.entries.size;
  }
}