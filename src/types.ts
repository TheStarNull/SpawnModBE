/**
 * Core shared types for the SpawnModBE framework.
 *
 * These types describe:
 *  - Semver tuples used by Minecraft manifests (`[major, minor, patch]`).
 *  - The configuration objects accepted by `ModMain`, `Behavior` and `Resource`.
 *  - The shape of generated behavior-pack / resource-pack manifests.
 *  - The result object produced when a mod is built.
 */

import type { Behavior } from './Behavior.js';
import type { Resource } from './Resource.js';

/** A semantic version as a 3-element tuple, matching Minecraft manifest version arrays. */
export type SemVer = [major: number, minor: number, patch: number];

/** The Minecraft engine (game) version the pack targets. Shorthand alias of {@link SemVer}. */
export type GameVersion = SemVer;

/** Valid values for a manifest module's `type` field. */
export type ManifestModuleType = 'resources' | 'data' | 'script';

/** The script language supported by Minecraft's script module. */
export type ScriptLanguage = 'javascript' | 'typescript';

/** The UUID role each pack needs during manifest generation. */
export type UuidRole =
  | 'resourcePackHeader'
  | 'resourcePackModule'
  | 'behaviorPackHeader'
  | 'behaviorPackDataModule'
  | 'behaviorPackScriptModule';

/** A single manifest module entry. */
export interface ManifestModule {
  type: ManifestModuleType;
  uuid: string;
  version: SemVer;
  description?: string;
  /** Only required when `type` is `'script'`. */
  entry?: string;
  /** Only valid when `type` is `'script'` and the project uses TypeScript. */
  language?: ScriptLanguage;
}

/**
 * A manifest dependency reference. Either a pack reference (`uuid` + version
 * tuple) or a runtime module reference (`module_name` + string version).
 */
export interface ManifestDependency {
  /** UUID of the referenced pack (for pack-to-pack dependencies). */
  uuid?: string;
  /** Pack version tuple, or module version string for `module_name` deps. */
  version: SemVer | string;
  /** Runtime module name (e.g. `@minecraft/server`) for script module deps. */
  module_name?: string;
}

/** The `header` shared by resource and behavior pack manifests. */
export interface ManifestHeader {
  name: string;
  description: string;
  uuid: string;
  version: SemVer;
  min_engine_version: SemVer;
  /** The author(s) of the pack. */
  author?: string;
}

/** The common base manifest layout for both pack types. */
export interface PackManifest {
  format_version: number;
  header: ManifestHeader;
  modules: ManifestModule[];
  dependencies?: ManifestDependency[];
}

/** The full behavior-pack manifest. */
export interface BehaviorPackManifest extends PackManifest {}

/** The full resource-pack manifest. */
export interface ResourcePackManifest extends PackManifest {}

export { BehaviorPackManifest as BehaviorManifest, ResourcePackManifest as ResourceManifest };

/** Fine-grained control over how a pack's UUID pool is generated. */
export interface UuidConfig {
  /**
   * A stable seed string. UUIDs are derived deterministically from this seed so
   * rebuilding a mod always produces the same set of UUIDs (important for
   * cross-pack dependencies and world compatibility).
   */
  seed: string;
  /**
   * Optional explicit UUIDs. When provided, these override the derived values
   * for the given roles. Each value must be a valid UUID string.
   */
  explicit?: Partial<Record<UuidRole, string>>;
}

/** Configuration for the Script API (SAPI) side of a behavior pack. */
export interface SapiConfig {
  /** Path to the script entry file (e.g. `'scripts/main.js'` / `'scripts/main.ts'`). */
  entry: string;
  /** The script language. Defaults to `'javascript'`. */
  language?: ScriptLanguage;
  /** Version range for the `@minecraft/server` module dependency. Defaults to `'1.11.0'`. */
  runtimeVersion?: string;
}

/** Base options accepted by any pack class. */
export interface PackConfig {
  /** The pack's display name. */
  name: string;
  /** A short description of what the pack does. */
  description?: string;
  /** The author(s) of the pack. */
  author?: string;
  /** The pack's semantic version. Defaults to `[1, 0, 0]`. */
  version?: SemVer;
  /** The minimum Minecraft engine (game) version. Defaults to `[1, 20, 70]`. */
  minEngineVersion?: GameVersion;
  /** UUID generation parameters. Defaults to a seed derived from the pack name. */
  uuid?: UuidConfig;
}

/** Options accepted by the {@link Resource} constructor. */
export interface ResourcePackConfig extends PackConfig {}

/** Options accepted by the {@link Behavior} constructor. */
export interface BehaviorPackConfig extends PackConfig {
  /**
   * The Script API (SAPI) entry point. Omit this (or pass `undefined`) to build
   * a behavior pack without a script module.
   */
  script?: SapiConfig | string;
}

/** Everything accepted by the {@link ModMain} constructor. */
export interface ModMainConfig {
  /** The mod's display name (e.g. `'Spawn Mod'`). */
  name: string;
  /** A short description of what the mod does. */
  description?: string;
  /** The author(s) of the mod. */
  author?: string;
  /** The mod's semantic version. Defaults to `[1, 0, 0]`. */
  version?: SemVer;
  /** The minimum Minecraft engine (game) version. Defaults to `[1, 20, 70]`. */
  minEngineVersion?: GameVersion;
  /**
   * The Script API (SAPI) entry point. Omit this (or pass `undefined`) to build
   * a mod without a behavior pack / SAPI.
   */
  sapi?: SapiConfig | string;
  /** UUID generation parameters. Defaults to a seed derived from the mod name. */
  uuid?: UuidConfig;
}

/** A resolved pack config with all optional fields filled in. */
export interface ResolvedPackConfig {
  name: string;
  description: string;
  author: string;
  version: SemVer;
  minEngineVersion: GameVersion;
  uuid: UuidConfig;
}

/** A resolved mod config with all optional fields filled in. */
export interface ResolvedModMainConfig {
  name: string;
  description: string;
  author: string;
  version: SemVer;
  minEngineVersion: GameVersion;
  uuid: UuidConfig;
  sapi: SapiConfig | undefined;
}

/** The result of building a mod. */
export interface ModBuildResult {
  /** The generated behavior-pack manifest JSON (or `null` when no SAPI is used). */
  behaviorPack: BehaviorPackManifest | null;
  /** The generated resource-pack manifest JSON. */
  resourcePack: ResourcePackManifest;
  /** The resolved config that produced this build. */
  config: ResolvedModMainConfig;
  /** The generated {@link Behavior} pack (or `null` when no SAPI is used). */
  behavior: Behavior | null;
  /** The generated {@link Resource} pack. */
  resource: Resource;
}

/** A file that can be placed inside a pack. */
export interface PackFile {
  /** The relative path inside the pack (forward slashes, e.g. `'textures/items/x.png'`). */
  path: string;
  /** The file contents. */
  data: Buffer;
}

/** Options controlling how a pack writes itself to disk. */
export interface WriteToOptions {
  /** Whether to overwrite existing files. Defaults to `true`. */
  overwrite?: boolean;
}

/** The result of writing a pack to disk. */
export interface WriteToResult {
  /** The absolute directory that was written. */
  directory: string;
  /** The number of files written. */
  filesWritten: number;
  /** The list of relative paths written. */
  files: string[];
}

/** Options controlling `addDirectory`. */
export interface AddDirectoryOptions {
  /**
   * If set, files are placed under this path inside the pack
   * (e.g. `'textures'` → `textures/items/diamond.png`).
   */
  prefix?: string;
  /**
   * Glob-like or exact file paths to exclude. When a directory path is given,
   * the whole subtree is skipped. Defaults to none.
   */
  ignore?: string[];
}

/** The result of adding a directory's contents to a pack. */
export interface AddDirectoryResult {
  /** Number of files successfully added. */
  added: number;
  /** Number of files skipped because they already exist (when overwriting is off). */
  skipped: number;
  /** Number of files that failed to read (e.g. permission errors). */
  errors: number;
  /** The relative paths that were added to the pack. */
  addedFiles: string[];
  /** Error messages grouped by path. */
  errorMessages: Record<string, string>;
}

/** A single sound variant inside a `sound_definitions.json` event. */
export interface SoundDefinition {
  /** The sound file path (no `.ogg`), e.g. `'sounds/music/records/my_disc'`. */
  name: string;
  /** Whether the sound streams (used for long music tracks). Defaults to `false`. */
  stream?: boolean;
  /** The volume of the sound. Defaults to `1.0`. */
  volume?: number;
  /** The pitch of the sound. Defaults to `1.0`. */
  pitch?: number;
  /** Whether to preload the sound on low-memory devices. Defaults to `false`. */
  loadOnLowMemory?: boolean;
}

/** The shape of a full `sound_definitions.json` file. */
export interface SoundEventDefinition {
  /** Max distance the sound carries. */
  maxDistance?: number;
  /** The list of sound variants. */
  sounds: SoundDefinition[];
}

/** Options controlling `Resource.addSound`. */
export interface AddSoundOptions {
  /** The maximum distance (in blocks) the sound carries. Defaults to `16`. */
  maxDistance?: number;
  /** Whether to mark the sound for streaming (recommended for music records). */
  stream?: boolean;
  /** The sound volume. Defaults to `1.0`. */
  volume?: number;
  /** The sound pitch. Defaults to `1.0`. */
  pitch?: number;
  /** Whether to load on low-memory devices. */
  loadOnLowMemory?: boolean;
}