/**
 * Internal helpers and the shared pack base class.
 */

import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { DEFAULT_PACK_ICON } from './assets.js';
import type {
  AddDirectoryOptions,
  AddDirectoryResult,
  ManifestHeader,
  PackConfig,
  PackFile,
  ResolvedPackConfig,
  SemVer,
  WriteToOptions,
  WriteToResult,
} from './types.js';
import { createZip } from './zip.js';
import { normalizeZipPath, sanitizeFileName } from './util.js';

export const DEFAULT_VERSION: SemVer = [1, 0, 0];
export const DEFAULT_MIN_ENGINE: SemVer = [1, 20, 70];
export const MANIFEST_FILENAME = 'manifest.json';
export const ICON_FILENAME = 'pack_icon.png';

/** Fills in every optional field so downstream logic can rely on concrete values. */
export function resolvePackConfig(config: PackConfig): ResolvedPackConfig {
  return {
    name: config.name,
    description: config.description ?? config.name,
    author: config.author ?? 'Unknown',
    version: config.version ?? DEFAULT_VERSION,
    minEngineVersion: config.minEngineVersion ?? DEFAULT_MIN_ENGINE,
    uuid: config.uuid ?? { seed: `spawnmodbe:${config.name}` },
  };
}

/** Builds a manifest header for a specific pack, embedding its UUID. */
export function buildHeader(
  config: ResolvedPackConfig,
  packUuid: string
): ManifestHeader {
  const header: ManifestHeader = {
    name: config.name,
    description: config.description,
    uuid: packUuid,
    version: config.version,
    min_engine_version: config.minEngineVersion,
  };
  if (config.author) {
    header.author = config.author;
  }
  return header;
}

/** A sanitized file name derived from a pack's config name. */
export function packFolderName(config: ResolvedPackConfig): string {
  return sanitizeFileName(config.name);
}

/** Escapes regex special characters in a string (used for glob matching). */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A file entry within a pack.
 */
export interface PackEntry {
  path: string;
  data: Buffer;
}

/**
 * Shared implementation for a pack that owns a set of files and can serialize
 * them to disk or into a zip archive.
 */
export abstract class PackBase {
  private readonly files: Map<string, Buffer> = new Map();

  /** Adds a file to the pack, overwriting any existing file at the same path. */
  addFile(path: string, data: Buffer | string): void {
    const normalized = normalizeZipPath(path);
    if (normalized === MANIFEST_FILENAME) {
      throw new Error(`"${MANIFEST_FILENAME}" is managed by the framework.`);
    }
    this.files.set(
      normalized,
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data
    );
  }

  /**
   * Adds a generated content file, refusing to silently overwrite an existing
   * file that holds DIFFERENT content. Two generators (e.g. two items that share
   * a short name across namespaces) must not clobber one another. Re-adding
   * identical content is idempotent; state files that are meant to be
   * read-modify-written should keep using {@link addFile}.
   *
   * @param path The pack-relative path.
   * @param data The file bytes or UTF-8 string.
   * @param label A human-readable description of the generator for the error.
   */
  addNewFile(path: string, data: Buffer | string, label: string): void {
    const normalized = normalizeZipPath(path);
    const incoming = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const existing = this.files.get(normalized);
    if (existing !== undefined) {
      if (!existing.equals(incoming)) {
        throw new Error(
          `Pack path "${normalized}" already exists with different content (${label}). ` +
            `Use a unique identifier or a namespaced short name to avoid a colliding filename.`
        );
      }
      // Identical content → idempotent; nothing to do.
      return;
    }
    this.addFile(normalized, incoming);
  }

  /**
   * Adds many files at once. Accepts either `PackFile` objects, `[path, data]`
   * tuples, or a mix of both.
   */
  addFiles(
    entries: Array<PackFile | [string, Buffer | string]>
  ): void {
    for (const entry of entries) {
      if (Array.isArray(entry)) {
        this.addFile(entry[0], entry[1]);
      } else {
        this.addFile(entry.path, entry.data);
      }
    }
  }

  /**
   * Recursively copies the contents of a local directory into the pack,
   * preserving the directory structure (relative to `sourceDir`, minus any
   * leading path components).
   *
   * @param sourceDir The local directory to read.
   * @param options Optional behavior.
   * @param options.prefix A pack-relative subdirectory to place files under.
   * @param options.ignore Paths to skip (file, directory or glob `*` patterns).
   * @returns A summary of what was added / skipped / errored.
   *
   * @example
   * ```ts
   * await rp.addDirectory('./assets/textures');
   * // → textures/items/stone.png, textures/blocks/dirt.png ...
   *
   * await rp.addDirectory('./assets', { prefix: 'new_assets' });
   * // → new_assets/items/stone.png ...
   * ```
   */
  async addDirectory(
    sourceDir: string,
    options?: AddDirectoryOptions
  ): Promise<AddDirectoryResult> {
    const result: AddDirectoryResult = {
      added: 0,
      skipped: 0,
      errors: 0,
      addedFiles: [],
      errorMessages: {},
    };

    const root = resolve(sourceDir);
    const ignore = options?.ignore ?? [];
    const prefix = options?.prefix;
    if (prefix !== undefined && prefix.trim() === '') {
      throw new Error('addDirectory: "prefix" must not be an empty string.');
    }

    const isIgnored = (relPath: string): boolean =>
      ignore.some((pattern) => {
        const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
        const normalizedRel = relPath.replace(/\\/g, '/');
        if (normalizedPattern.includes('*')) {
          const re = new RegExp(
            '^' +
              normalizedPattern.split('*').map(escapeRegex).join('.*') +
              '$'
          );
          return re.test(normalizedRel);
        }
        return (
          normalizedRel === normalizedPattern ||
          normalizedRel.startsWith(normalizedPattern + '/')
        );
      });

    /** Recursively walks `dir`, adding matching files. */
    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        result.errors += 1;
        result.errorMessages[relative(root, dir)] =
          err instanceof Error ? err.message : String(err);
        return;
      }

      for (const entry of entries) {
        const full = join(dir, entry.name);
        const rel = relative(root, full).split(sep).join('/');
        if (isIgnored(rel)) continue;

        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          let data: Buffer;
          try {
            data = await readFile(full);
          } catch (err) {
            result.errors += 1;
            result.errorMessages[rel] =
              err instanceof Error ? err.message : String(err);
            continue;
          }
          const target = prefix ? `${prefix.replace(/\/+$/, '')}/${rel}` : rel;
          if (this.hasFile(target)) {
            result.skipped += 1;
            continue;
          }
          this.addFile(target, data);
          result.added += 1;
          result.addedFiles.push(target);
        }
      }
    };

    await walk(root);
    return result;
  }

  /** Sets the pack icon using the given bytes, or resets to the default icon. */
  setIcon(data?: Buffer): void {
    this.files.set(ICON_FILENAME, data ?? DEFAULT_PACK_ICON);
  }

  /** The current pack icon bytes (defaults to {@link DEFAULT_PACK_ICON}). */
  get icon(): Buffer {
    return this.files.get(ICON_FILENAME) ?? DEFAULT_PACK_ICON;
  }

  /** Returns `true` if a file with the given path exists in the pack. */
  hasFile(path: string): boolean {
    return this.files.has(normalizeZipPath(path));
  }

  /** Returns the raw bytes of a file in the pack, or `undefined`. */
  getFile(path: string): Buffer | undefined {
    return this.files.get(normalizeZipPath(path));
  }

  /** Removes a file from the pack (the manifest/icon cannot be removed). */
  removeFile(path: string): boolean {
    const normalized = normalizeZipPath(path);
    if (normalized === MANIFEST_FILENAME || normalized === ICON_FILENAME) {
      return false;
    }
    return this.files.delete(normalized);
  }

  /**
   * All pack entries: the generated manifest, the icon, then user files.
   * Public so higher-level compositors (e.g. `ModMain`) can wrap each pack in a
   * folder when building a `.mcaddon` bundle.
   */
  listFilesPublic(): PackEntry[] {
    const manifest = JSON.stringify(this.buildManifest(), null, 2);
    const icon = this.files.get(ICON_FILENAME) ?? DEFAULT_PACK_ICON;
    const entries: PackEntry[] = [
      { path: MANIFEST_FILENAME, data: Buffer.from(manifest, 'utf8') },
      { path: ICON_FILENAME, data: icon },
    ];
    for (const [path, data] of this.files) {
      if (path === MANIFEST_FILENAME || path === ICON_FILENAME) continue;
      entries.push({ path, data });
    }
    return entries;
  }

  /**
   * Writes the pack to a directory on disk, creating it if needed.
   *
   * @param directory The target directory.
   * @param options Optional write options (`overwrite` defaults to `true`).
   */
  async writeTo(
    directory: string,
    options?: WriteToOptions
  ): Promise<WriteToResult> {
    const overwrite = options?.overwrite ?? true;
    const target = resolve(directory);
    const files = this.listFilesPublic();
    const written: string[] = [];

    await mkdir(target, { recursive: true });
    for (const file of files) {
      const dest = resolve(target, file.path);
      // When overwrite is disabled, skip files that already exist on disk.
      if (!overwrite) {
        try {
          await access(dest);
          continue; // file exists → leave it untouched
        } catch {
          // does not exist → safe to write
        }
      }
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, file.data);
      written.push(file.path);
    }

    return { directory: target, filesWritten: written.length, files: written };
  }

  /**
   * Serializes the pack into a zip-based archive (`.mcpack`) buffer.
   */
  pack(): Buffer {
    return createZip(this.listFilesPublic());
  }

  /** The number of files this pack will contain (manifest + icon + added files). */
  get fileCount(): number {
    return this.listFilesPublic().length;
  }

  /** Abstract: build this pack's manifest. */
  abstract buildManifest(): object;

  /** Abstract: this pack's display name. */
  abstract get name(): string;
}
