/**
 * Script API (SAPI) helper library.
 *
 * These helpers produce plain JavaScript source strings for the behavior pack's
 * `scripts/` folder. They are thin wrappers around `@minecraft/server` — the
 * framework does not execute or type-check the generated code, it just lays down
 * valid script files that the Minecraft runtime loads.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';

/** The default `@minecraft/server` module specifier. */
export const SERVER_MODULE = '@minecraft/server';

/** A script file to be written under the behavior pack's `scripts/` folder. */
export class ScriptFile {
  /** The pack-relative path under `scripts/` (e.g. `'helpers/trace.js'`). */
  readonly path: string;
  /** The script source. */
  readonly source: string;

  constructor(path: string, source: string) {
    if (!path || path.trim() === '') {
      throw new Error('ScriptFile requires a non-empty "path".');
    }
    this.path = path;
    this.source = source;
  }

  /** The file name (last path segment). */
  get fileName(): string { return basename(this.path); }

  /** Returns the script source. */
  toString(): string { return this.source; }
}

/** Options accepted by {@link ScriptApiSource}. */
export interface ScriptApiSourceOptions {
  /** The module to import from (default `'@minecraft/server'`). */
  moduleName?: string;
  /** Prefix each import with `// @ts-ignore` (default `true`). */
  tsIgnore?: boolean;
}

/** The resolved {@link ScriptApiSource} options. */
export interface ResolvedScriptApiSourceOptions {
  moduleName: string;
  tsIgnore: boolean;
}

/**
 * Builds a JavaScript source that imports symbols from `@minecraft/server`.
 *
 * @example
 * ```ts
 * const src = new ScriptApiSource();
 * const { world } = src.import('world');
 * const script = src.buildJs(`world.sendMessage('hi')`);
 * ```
 */
export class ScriptApiSource {
  /** The fully-resolved options. */
  readonly config: ResolvedScriptApiSourceOptions;
  private readonly imported = new Set<string>();

  constructor(options?: ScriptApiSourceOptions) {
    this.config = {
      moduleName: options?.moduleName ?? SERVER_MODULE,
      tsIgnore: options?.tsIgnore ?? true,
    };
  }

  /**
   * Declares a named import from the configured module and returns the symbol
   * name so it can be used directly in the body passed to {@link buildJs}.
   */
  import(name: string): string {
    if (!name || name.trim() === '') {
      throw new Error('ScriptApiSource.import requires a non-empty "name".');
    }
    this.imported.add(name);
    return name;
  }

  /** Builds the script source (imports + optional body). */
  buildJs(body = ''): string {
    const names = Array.from(this.imported).sort();
    let header = '';
    if (names.length > 0) {
      const stmt = `const { ${names.join(', ')} } = require('${this.config.moduleName}');`;
      header = this.config.tsIgnore ? `// @ts-ignore\n${stmt}` : stmt;
    }
    const sections = [header, body].filter((s) => s.trim().length > 0);
    return sections.join('\n\n');
  }

  /** Internal alias of {@link buildJs}. */
  toJs(body = ''): string { return this.buildJs(body); }
}

/**
 * Recursively reads a local directory and returns every file matching the given
 * extension as a {@link ScriptFile}, with paths relative to `dir`.
 *
 * @param dir The directory to scan (e.g. `'sapi'`).
 * @param extension The file extension to match (default `'.js'`).
 */
export async function fetchScriptsOfType(dir: string, extension = '.js'): Promise<ScriptFile[]> {
  const out: ScriptFile[] = [];
  const walk = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        out.push(new ScriptFile(relative(dir, full), await readFile(full, 'utf8')));
      }
    }
  };
  await walk(dir);
  return out;
}
