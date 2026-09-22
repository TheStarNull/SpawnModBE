/**
 * The entry point of the SpawnModBE framework.
 *
 * `ModMain` is the top-level descriptor for a Minecraft Bedrock Edition (MCBE)
 * mod. It composes one {@link Resource} pack and (optionally) one {@link Behavior}
 * pack, and knows how to turn that description into valid addon artifacts.
 *
 * It can be constructed with a single options object, or with positional
 * arguments for convenience:
 *
 * ```ts
 * // Object form (recommended)
 * const mod = new ModMain({
 *   name: 'Spawn Mod',
 *   description: 'Spawns mobs.',
 *   author: 'Dev',
 *   version: [1, 0, 0],
 *   minEngineVersion: [1, 20, 70],
 *   sapi: 'scripts/main.js',
 *   uuid: { seed: 'spawn-mod' },
 * });
 *
 * // Positional form
 * const mod = new ModMain('Spawn Mod', 'Spawns mobs.', 'Dev', [1, 0, 0], 'scripts/main.js');
 * ```
 */

import { resolve } from 'node:path';

import { Behavior } from './Behavior.js';
import { packFolderName } from './pack.js';
import { Resource } from './Resource.js';
import type {
  BehaviorPackManifest,
  ModBuildResult,
  ModMainConfig,
  ResolvedModMainConfig,
  ResourcePackManifest,
  SapiConfig,
  SemVer,
  WriteToOptions,
  WriteToResult,
} from './types.js';
import { UuidPool } from './uuid.js';
import { createZip } from './zip.js';
import { sanitizeFileName } from './util.js';
import { addEntries, pairLootPaths, type Addable } from './routing.js';

/** Fills in every optional field so downstream logic can rely on concrete values. */
function resolveConfig(config: ModMainConfig): ResolvedModMainConfig {
  return {
    name: config.name,
    description: config.description ?? config.name,
    author: config.author ?? 'Unknown',
    version: config.version ?? [1, 0, 0],
    minEngineVersion: config.minEngineVersion ?? [1, 20, 70],
    sapi:
      typeof config.sapi === 'string'
        ? { entry: config.sapi, language: 'javascript' }
        : config.sapi && typeof config.sapi === 'object'
          ? { ...config.sapi, language: config.sapi.language ?? 'javascript' }
          : undefined,
    uuid: config.uuid ?? { seed: `spawnmodbe:${config.name}` },
  };
}

export class ModMain {
  /** The fully-resolved mod configuration. */
  readonly config: ResolvedModMainConfig;

  /** The pool of UUIDs shared by both packs. */
  readonly uuids: UuidPool;

  /** The resource pack of this mod. */
  readonly resource: Resource;

  /** The behavior pack of this mod, or `null` when no Script API is used. */
  readonly behavior: Behavior | null;

  /**
   * Creates a new ModMain descriptor from an options object.
   *
   * @param config An options object describing the mod.
   */
  constructor(config: ModMainConfig);

  /**
   * Creates a new ModMain descriptor from positional arguments.
   *
   * @param name The mod's display name.
   * @param description The mod's description.
   * @param author The mod's author.
   * @param version The mod's semantic version (`[major, minor, patch]`).
   * @param minEngineVersion The minimum Minecraft engine version.
   * @param sapi The SAPI entry path, or `undefined` to omit a behavior pack.
   */
  constructor(
    name: string,
    description?: string,
    author?: string,
    version?: SemVer,
    minEngineVersion?: SemVer,
    sapi?: SapiConfig | string
  );

  constructor(
    configOrName: ModMainConfig | string,
    maybeDescription?: string,
    maybeAuthor?: string,
    maybeVersion?: SemVer,
    maybeMinEngine?: SemVer,
    maybeSapi?: SapiConfig | string
  ) {
    let config: ModMainConfig;

    if (typeof configOrName === 'string') {
      config = {
        name: configOrName,
        description: maybeDescription,
        author: maybeAuthor,
        version: maybeVersion,
        minEngineVersion: maybeMinEngine,
        sapi: maybeSapi,
      };
    } else {
      config = configOrName;
    }

    if (!config || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('ModMain requires a non-empty "name".');
    }

    // Validate SAPI runtime version if provided through a config seed lookup.
    this.config = resolveConfig(config);
    this.uuids = new UuidPool(this.config.uuid.seed, this.config.uuid.explicit);

    // Build the two sub-packs, sharing the mod's UUID seed and explicit values so
    // cross-pack dependencies reference the same stable UUIDs.
    this.resource = new Resource({
      name: this.config.name,
      description: this.config.description,
      author: this.config.author,
      version: this.config.version,
      minEngineVersion: this.config.minEngineVersion,
      uuid: this.config.uuid,
    });

    this.behavior = this.config.sapi
      ? new Behavior({
          name: this.config.name,
          description: this.config.description,
          author: this.config.author,
          version: this.config.version,
          minEngineVersion: this.config.minEngineVersion,
          script: this.config.sapi,
          uuid: this.config.uuid,
        })
      : null;
  }

  /** The behavior-pack header UUID. */
  get behaviorPackUuid(): string {
    return this.behavior?.uuid ?? this.uuids.get('behaviorPackHeader');
  }

  /** The resource-pack header UUID. */
  get resourcePackUuid(): string {
    return this.resource.uuid;
  }

  /** Builds the behavior-pack manifest, or `null` when there is no SAPI entry. */
  buildBehaviorPackManifest(): BehaviorPackManifest | null {
    if (!this.behavior) {
      return null;
    }
    // A behavior pack does not depend on the resource pack; it only declares
    // its own script-runtime modules (added by `Behavior.buildManifest`). The
    // resource pack is the one that references the behavior pack via
    // `dependencies` (RP 依赖 BP), which avoids a circular dependency.
    return this.behavior.buildManifest();
  }

  /** Builds the resource-pack manifest. */
  buildResourcePackManifest(): ResourcePackManifest {
    return this.resource.buildManifest({
      dependencies: this.behavior
        ? [{ uuid: this.behavior.uuid, version: this.config.version, module_name: this.config.name }]
        : undefined,
    });
  }

  /**
   * Generates the complete set of printable artifacts for this mod.
   *
   * @returns A {@link ModBuildResult} containing both manifests and the resolved config.
   */
  build(): ModBuildResult {
    return {
      behaviorPack: this.buildBehaviorPackManifest(),
      resourcePack: this.buildResourcePackManifest(),
      config: this.config,
      behavior: this.behavior,
      resource: this.resource,
    };
  }

  /** A sanitized base folder name for this mod (e.g. for a `.mcaddon` bundle). */
  get folderName(): string {
    return sanitizeFileName(this.config.name);
  }

  /** Returns a JSON string representation of both manifests (pretty-printed). */
  toString(): string {
    const result = this.build();
    return [
      '// Behavior Pack manifest',
      JSON.stringify(result.behaviorPack, null, 2),
      '',
      '// Resource Pack manifest',
      JSON.stringify(result.resourcePack, null, 2),
    ].join('\n');
  }

  /**
   * Writes the mod's pack(s) to disk as folders.
   *
   * The behavior pack (when present) is written to `<dir>/<name>_BP` and the
   * resource pack to `<dir>/<name>_RP`, so both can coexist when re-packed.
   *
   * @param directory The parent directory to write the pack folders into.
   * @param options Optional write options (`overwrite` defaults to `true`).
   */
  async writeTo(directory: string, options?: WriteToOptions): Promise<WriteToResult[]> {
    const base = resolve(directory);
    const results: WriteToResult[] = [];

    if (this.behavior) {
      const bpResult = await this.behavior.writeTo(
        resolve(base, `${packFolderName(this.behavior.config)}_BP`),
        options
      );
      results.push(bpResult);
    }

    const rpResult = await this.resource.writeTo(
      resolve(base, `${packFolderName(this.resource.config)}_RP`),
      options
    );
    results.push(rpResult);

    return results;
  }

  /** Serializes the behavior pack into a `.mcpack` buffer, or `null` when absent. */
  packBehaviorPack(): Buffer | null {
    return this.behavior ? this.behavior.pack() : null;
  }

  /** Serializes the resource pack into a `.mcpack` buffer. */
  packResourcePack(): Buffer {
    return this.resource.pack();
  }

  /**
   * Serializes the entire mod into a single `.mcaddon` archive.
   *
   * Inside the archive the behavior pack lives in a `<name>_BP` folder and the
   * resource pack in a `<name>_RP` folder, avoiding name collisions when both
   * packs have the same display name.
   */
  toMcaddon(): Buffer {
    const entries: Array<{ path: string; data: Buffer }> = [];

    if (this.behavior) {
      const bp = `${packFolderName(this.behavior.config)}_BP`;
      for (const file of this.behavior.listFilesPublic()) {
        entries.push({ path: `${bp}/${file.path}`, data: file.data });
      }
    }

    const rp = `${packFolderName(this.resource.config)}_RP`;
    for (const file of this.resource.listFilesPublic()) {
      entries.push({ path: `${rp}/${file.path}`, data: file.data });
    }

    return createZip(entries);
  }

  /**
   * Unified wiring: routes any supported generator to the correct pack(s).
   *
   * Accepts instances, `[recipe/loot/trade, path]` tuples, nested arrays, and
   * `add(table, path)` two-arg forms for loot/trade. Returns `this` for chaining.
   */
  add(...entries: Array<Addable | string>): this {
    addEntries(this, pairLootPaths(entries));
    return this;
  }
}
