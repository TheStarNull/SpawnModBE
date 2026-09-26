/**
 * The `Resource` class — describes and builds a Minecraft Bedrock resource pack.
 *
 * A resource pack (RP) holds the visual assets of a mod: textures, models,
 * sounds, UI, etc. `Resource` makes it easy to configure and serialize a valid
 * resource pack manifest, add files, and package it (write to disk or zip).
 *
 * @example
 * ```ts
 * const rp = new Resource({
 *   name: 'Spawn Mod RP',
 *   description: 'Textures and models.',
 *   author: 'Dev',
 *   version: [1, 0, 0],
 *   minEngineVersion: [1, 20, 70],
 *   uuid: { seed: 'spawn-mod-rp' },
 * });
 * const manifest = rp.buildManifest();
 * const buffer = rp.pack(); // .mcpack zip
 * await rp.writeTo('./out/SpawnMod_RP');
 * ```
 */

import { buildIconPng } from './assets.js';
import { type Block } from './block/Block.js';
import { type EntityRP } from './entity/EntityRP.js';
import { type RenderController } from './entity/RenderController.js';
import { type RecordDisc } from './item/Record.js';
import type { Item } from './item/Item.js';
import { type Attachable } from './rp/Attachable.js';
import { type BiomesClient } from './rp/BiomesClient.js';
import { type DynamicItemModel } from './rp/DynamicItemModel.js';
import { type EntityModel } from './rp/EntityModel.js';
import { type FlipbookTextures } from './rp/FlipbookTextures.js';
import { type FrameSequence } from './rp/FrameSequence.js';
import { type ItemTextureAtlas } from './rp/ItemTextureAtlas.js';
import { type LangFile } from './rp/LangFile.js';
import { type Material } from './rp/Material.js';
import { type SoundBatch } from './rp/SoundBatch.js';
import { type Fog } from './fog/index.js';
import { type Particle } from './particle/index.js';
import { type Animation, type AnimationController } from './animation/index.js';
import { type UiDefs } from './ui/UiDefs.js';
import { type UiFile } from './ui/UiFile.js';
import { type UiGlobalVariables } from './ui/UiGlobalVariables.js';
import { buildHeader, packFolderName, PackBase, resolvePackConfig } from './pack.js';
import type {
  AddSoundOptions,
  ManifestDependency,
  ManifestModule,
  ResolvedPackConfig,
  ResourcePackConfig,
  ResourcePackManifest,
  SoundDefinition,
  SoundEventDefinition,
} from './types.js';
import { UuidPool } from './uuid.js';

/** Required keys for the RP `textures/item_texture.json` atlas file. */
const ITEM_TEXTURE_PATH = 'textures/item_texture.json';
const ATLAS_NAMES = { resource_pack_name: 'my_pack', texture_name: 'atlas.items' } as const;

/** The RP path of the block terrain texture atlas. */
const TERRAIN_TEXTURE_PATH = 'textures/terrain_texture.json';

/** The RP path of the flipbook (animated) texture definitions. */
const FLIPBOOK_TEXTURE_PATH = 'textures/flipbook_textures.json';

/** The RP path of the sound definitions file. */
const SOUND_DEFINITIONS_PATH = 'sounds/sound_definitions.json';

/** The RP root path of the biome client settings file. */
const BIOMES_CLIENT_PATH = 'biomes_client.json';

export class Resource extends PackBase {
  /** The fully-resolved pack configuration. */
  readonly config: ResolvedPackConfig;

  /** The pool of UUIDs used by this pack's manifest. */
  readonly uuids: UuidPool;

  /** The pack's header UUID. */
  readonly uuid: string;

  constructor(config: ResourcePackConfig) {
    if (!config || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Resource requires a non-empty "name".');
    }
    super();
    this.config = resolvePackConfig(config);
    this.uuids = new UuidPool(this.config.uuid.seed, this.config.uuid.explicit);
    this.uuid = this.uuids.get('resourcePackHeader');
  }

  get name(): string {
    return this.config.name;
  }

  /** The resource-pack module (type `resources`) UUID. */
  get moduleUuid(): string {
    return this.uuids.get('resourcePackModule');
  }

  /**
   * Builds the resource-pack manifest.
   *
   * @param options Optional add-ons to the manifest.
   * @param options.dependencies Extra dependencies to append (e.g. a behavior pack).
   */
  buildManifest(options?: {
    dependencies?: ManifestDependency[];
  }): ResourcePackManifest {
    const modules: ManifestModule[] = [
      {
        type: 'resources',
        uuid: this.moduleUuid,
        version: this.config.version,
        description: this.config.description,
      },
    ];

    const manifest: ResourcePackManifest = {
      format_version: 2,
      header: buildHeader(this.config, this.uuid),
      modules,
    };

    if (options?.dependencies && options.dependencies.length > 0) {
      manifest.dependencies = options.dependencies;
    }

    return manifest;
  }

  /** A sanitized folder name for this pack (e.g. for a `.mcaddon` bundle). */
  get folderName(): string {
    return packFolderName(this.config);
  }

  /**
   * Registers an item's icon texture in `textures/item_texture.json`.
   *
   * If the item has a `texturePath`, a solid-color placeholder texture is also
   * generated at that path so the item renders with a visible (non-missing)
   * texture in-game without the caller supplying art yet.
   *
   * @param item The item to register.
   * @param options Optional behavior.
   * @param options.placeholderColor A `[r,g,b]` color for the placeholder texture.
   * @returns The texture name that was registered.
   */
  addItemTexture(item: Item, options?: { placeholderColor?: [number, number, number] }): string {
    const mapping = item.textureMapping;
    if (!mapping) {
      // No texture path. For a bare shortname icon, register a placeholder so
      // the atlas key exists and the item renders visibly. A namespaced icon
      // (e.g. 'minecraft:diamond') is expected to resolve from another pack.
      const icon = item.iconTexture;
      if (!icon.includes(':')) {
        this.registerItemTexture(icon, `textures/items/${icon}`, options?.placeholderColor);
      }
      return item.iconTexture;
    }
    this.registerItemTexture(mapping.textureName, mapping.texturePath, options?.placeholderColor);
    return mapping.textureName;
  }

  /**
   * Registers a single item icon in `textures/item_texture.json` and writes a
   * solid-color placeholder PNG if the texture is not already present in the pack.
   */
  private registerItemTexture(
    textureName: string,
    texturePath: string,
    placeholderColor?: [number, number, number]
  ): void {
    const atlas = this.readItemTextureAtlas();
    atlas.texture_data[textureName] = { textures: texturePath };
    this.writeItemTextureAtlas(atlas);

    const texturePngPath = `${texturePath}.png`;
    if (!this.hasFile(texturePngPath)) {
      this.addFile(texturePngPath, buildIconPng(16, placeholderColor ?? [180, 60, 255]));
    }
  }

  /** Adds several item textures at once. */
  addItemTextures(items: Item[], options?: { placeholderColor?: [number, number, number] }): string[] {
    return items.map((item) => this.addItemTexture(item, options));
  }

  /**
   * One-stop shop for an item's resource-pack assets:
   *  - registers the icon texture (atlas + placeholder PNG when `texturePath` set)
   *  - when the item carries a `dynamicModel`, writes the attachable + geometry +
   *    animation files automatically
   *
   * @param item The item to wire up in the resource pack.
   * @param options Optional behavior.
   * @param options.placeholderColor A `[r,g,b]` color for the placeholder texture.
   * @param options.skipDynamicModel Set `true` to skip the dynamic model even if present.
   * @returns The list of pack-relative paths that were written.
   */
  addItemAssets(
    item: Item,
    options?: { placeholderColor?: [number, number, number]; skipDynamicModel?: boolean }
  ): string[] {
    const paths: string[] = [];
    paths.push(this.addItemTexture(item, { placeholderColor: options?.placeholderColor }));

    if (item.dynamicModel && !options?.skipDynamicModel) {
      const dynPaths = this.addDynamicItemModel(item.dynamicModel);
      for (const p of dynPaths) paths.push(p);
    }
    return paths;
  }

  /** Wires up several items at once via {@link Resource.addItemAssets}. */
  addItemsAssets(
    items: Item[],
    options?: { placeholderColor?: [number, number, number]; skipDynamicModel?: boolean }
  ): string[] {
    const paths: string[] = [];
    for (const item of items) {
      paths.push(...this.addItemAssets(item, options));
    }
    return paths;
  }

  /**
   * Registers a sound event in `sounds/sound_definitions.json`.
   *
   * Optionally also adds the audio asset (`sounds/<soundPath>.ogg`) to the pack
   * when `audioData` is provided. The `soundPath` is the RP-relative path without
   * the `.ogg` extension (e.g. `'sounds/music/records/my_disc'`).
   *
   * @param soundId The sound event identifier (e.g. `'record.my_disc'`).
   * @param soundPath The RP-relative path to the sound file (no `.ogg`).
   * @param options Optional behavior (stream/volume/maxDistance).
   * @param audioData Optional OGG audio bytes to write into the pack.
   * @returns The registered sound event identifier.
   */
  addSound(
    soundId: string,
    soundPath: string,
    options?: AddSoundOptions,
    audioData?: Buffer
  ): string {
    const events = this.readSoundDefinitions();
    const sound: SoundDefinition = {
      name: soundPath.replace(/\.ogg$/i, ''),
      ...(options?.stream !== undefined ? { stream: options.stream } : {}),
      ...(options?.volume !== undefined ? { volume: options.volume } : {}),
      ...(options?.pitch !== undefined ? { pitch: options.pitch } : {}),
    };

    const event: SoundEventDefinition = {
      ...(options?.maxDistance !== undefined
        ? { max_distance: options.maxDistance }
        : {}),
      ...(options?.minDistance !== undefined
        ? { min_distance: options.minDistance }
        : {}),
      ...(options?.category !== undefined ? { category: options.category } : {}),
      ...(options?.loadOnLowMemory !== undefined
        ? { load_on_low_memory: options.loadOnLowMemory }
        : {}),
      sounds: [sound],
    };

    events[soundId] = event;
    this.writeSoundDefinitions(events);

    // If audio data is supplied, write the .ogg file into the pack.
    if (audioData) {
      const oggPath = `${sound.name}.ogg`.replace(/^\//, '');
      this.addFile(oggPath, audioData);
    }

    return soundId;
  }

  /**
   * Registers a music-disc sound and (optionally) its audio asset for a
   * {@link RecordDisc}.
   *
   * This ties the disc's `soundEvent` to a sound definition, and when the disc
   * has a `soundPath` the audio is placed under that path. Music records are
   * streamed, at 50% volume and with a 64-block max distance, matching vanilla.
   *
   * @param disc The record disc item.
   * @param audioData Optional OGG bytes for the disc's music track.
   * @returns The registered sound event identifier.
   */
  addRecordSound(disc: RecordDisc, audioData?: Buffer): string {
    const options: AddSoundOptions = {
      stream: true,
      volume: 0.5,
      maxDistance: 64,
      loadOnLowMemory: true,
    };
    const soundPath = disc.soundPath ?? `sounds/music/records/${disc.shortName}`;
    return this.addSound(disc.config.soundEvent, soundPath, options, audioData);
  }

  /** Reads the current `sounds/sound_definitions.json` map, or a fresh one. */
  private readSoundDefinitions(): Record<string, SoundEventDefinition> {
    const file = this.getFile(SOUND_DEFINITIONS_PATH);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as {
          sound_definitions?: Record<string, SoundEventDefinition>;
        };
        // The file wraps events in a top-level "sound_definitions" object.
        if (parsed && typeof parsed === 'object' && parsed.sound_definitions) {
          return parsed.sound_definitions;
        }
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return {};
  }

  /** Writes the sound definitions back to `sounds/sound_definitions.json`. */
  private writeSoundDefinitions(events: Record<string, SoundEventDefinition>): void {
    this.addFile(SOUND_DEFINITIONS_PATH, JSON.stringify({ sound_definitions: events }, null, 2));
  }

  /** Reads the current `textures/item_texture.json` map, or a fresh one. */
  private readItemTextureAtlas(): {
    resource_pack_name: string;
    texture_name: string;
    texture_data: Record<string, unknown>;
  } {
    const file = this.getFile(ITEM_TEXTURE_PATH);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as Record<string, unknown>;
        const atlas = {
          resource_pack_name:
            (parsed.resource_pack_name as string) ?? ATLAS_NAMES.resource_pack_name,
          texture_name: (parsed.texture_name as string) ?? ATLAS_NAMES.texture_name,
          texture_data: (parsed.texture_data as Record<string, unknown>) ?? {},
        };
        return atlas;
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return {
      resource_pack_name: ATLAS_NAMES.resource_pack_name,
      texture_name: ATLAS_NAMES.texture_name,
      texture_data: {},
    };
  }

  /** Writes the item texture atlas back to `textures/item_texture.json`. */
  private writeItemTextureAtlas(atlas: {
    resource_pack_name: string;
    texture_name: string;
    texture_data: Record<string, unknown>;
  }): void {
    this.addFile(ITEM_TEXTURE_PATH, JSON.stringify(atlas, null, 2));
  }

  /** Reads the current `textures/terrain_texture.json` map, or a fresh one. */
  private readTerrainTexture(): Record<string, { textures: string }> {
    const file = this.getFile(TERRAIN_TEXTURE_PATH);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as {
          texture_data?: Record<string, { textures: string }>;
        };
        if (parsed && typeof parsed === 'object' && parsed.texture_data) {
          return parsed.texture_data;
        }
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return {};
  }

  /** Writes the terrain texture map back to `textures/terrain_texture.json`. */
  private writeTerrainTexture(textureData: Record<string, { textures: string }>): void {
    this.addFile(TERRAIN_TEXTURE_PATH, JSON.stringify({ texture_data: textureData }, null, 2));
  }

  /** Reads the current `textures/flipbook_textures.json` array, or a fresh one. */
  private readFlipbookTextures(): Array<Record<string, unknown>> {
    const file = this.getFile(FLIPBOOK_TEXTURE_PATH);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8'));
        if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return [];
  }

  /** Writes the flipbook texture definitions back. */
  private writeFlipbookTextures(entries: Array<Record<string, unknown>>): void {
    this.addFile(FLIPBOOK_TEXTURE_PATH, JSON.stringify(entries, null, 2));
  }

  /**
   * Adds a resource-pack (client) entity definition.
   *
   * Writes the client-entity JSON to `entity/<shortName>.entity.json`.
   *
   * @param entity The entity resource-pack definition.
   * @returns The pack-relative path that was written.
   */
  addClientEntity(entity: EntityRP): string {
    const path = `entity/${entity.fileName}`;
    this.addNewFile(path, JSON.stringify(entity.buildJson(), null, 2), `EntityRP ${entity.identifier}`);
    return path;
  }

  /**
   * Adds a render controller to the resource pack.
   *
   * Writes the render-controller JSON to `render_controllers/<shortName>.rc.json`.
   *
   * @param controller The render controller definition.
   * @returns The pack-relative path that was written.
   */
  addRenderController(controller: RenderController): string {
    const path = `render_controllers/${controller.fileName}`;
    this.addNewFile(path, JSON.stringify(controller.buildJson(), null, 2), `RenderController ${controller.id}`);
    return path;
  }

  /**
   * Adds a material definition file to the resource pack.
   *
   * Writes the material JSON to `materials/<fileName>` (e.g. `entity.material`).
   * Multiple {@link Material} instances targeting the same file name merge their
   * definitions (later calls win per material name), so a shared
   * `materials/entity.material` can be extended from several places.
   *
   * @param material The material definitions.
   * @returns The pack-relative path that was written.
   */
  addMaterial(material: Material): string {
    const path = `materials/${material.fileName}`;
    const build = material.buildJson() as { materials: Record<string, unknown> };
    const merged: Record<string, unknown> = { ...build.materials };
    const existing = this.getFile(path);
    if (existing) {
      try {
        const parsed = JSON.parse(existing.toString('utf8')) as {
          materials?: Record<string, unknown>;
        };
        if (parsed && typeof parsed === 'object' && parsed.materials) {
          Object.assign(merged, parsed.materials);
        }
      } catch {
        // Malformed existing file → replace with the incoming definitions.
      }
    }
    this.addFile(path, JSON.stringify({ materials: merged }, null, 2));
    return path;
  }

  /**
   * Adds an entity geometry model to the resource pack.
   *
   * Writes the geometry JSON to `models/entity/<shortName>.json`.
   *
   * @param model The geometry model.
   * @param targetPath Optional explicit pack path (defaults to
   * `'models/entity/<shortName>.json'`).
   * @returns The pack-relative path that was written.
   */
  addModel(model: EntityModel, targetPath?: string): string {
    const path = targetPath ?? `models/entity/${model.fileName}`;
    this.addNewFile(path, JSON.stringify(model.buildJson(), null, 2), `EntityModel ${model.identifier}`);
    return path;
  }

  /**
   * Adds an entity / attachable animation to the resource pack.
   *
   * Writes the animation JSON to `animations/<fileName>`. When `targetPath` is
   * given (e.g. `'animations/sc.json'`) the animation is merged into that file
   * under its identifier, so several animations can share one vanilla-style
   * animation file.
   *
   * @param animation The animation definition.
   * @param targetPath Optional explicit pack path (defaults to
   * `'animations/<shortName>.json'`).
   * @returns The pack-relative path that was written.
   */
  addAnimation(animation: Animation, targetPath?: string): string {
    const path = targetPath ?? `animations/${animation.fileName}`;
    const [merged, formatVersion] = this.readNamedMap(path, 'animations', animation.config.formatVersion);
    const built = animation.buildJson().animations as Record<string, unknown>;
    merged[animation.identifier] = built[animation.identifier];
    this.addFile(path, JSON.stringify({ format_version: formatVersion, animations: merged }, null, 2));
    return path;
  }

  /**
   * Adds an animation controller to the resource pack.
   *
   * Writes the controller JSON to `animation_controllers/<fileName>`. When
   * `targetPath` is given the controller is merged into that file under its
   * identifier.
   *
   * @param controller The animation controller definition.
   * @param targetPath Optional explicit pack path (defaults to
   * `'animation_controllers/<shortName>.json'`).
   * @returns The pack-relative path that was written.
   */
  addAnimationController(controller: AnimationController, targetPath?: string): string {
    const path = targetPath ?? `animation_controllers/${controller.fileName}`;
    const [merged, formatVersion] = this.readNamedMap(
      path,
      'animation_controllers',
      controller.config.formatVersion
    );
    const built = controller.buildJson().animation_controllers as Record<string, unknown>;
    merged[controller.identifier] = built[controller.identifier];
    this.addFile(
      path,
      JSON.stringify({ format_version: formatVersion, animation_controllers: merged }, null, 2)
    );
    return path;
  }

  /**
   * Reads a `{ format_version, <key>: {…} }` map file, or a fresh map when the
   * file is missing. Keeps the existing `format_version` when present.
   */
  private readNamedMap(
    path: string,
    key: string,
    fallbackFormatVersion: string
  ): [Record<string, unknown>, string] {
    const file = this.getFile(path);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as {
          format_version?: string;
          [k: string]: unknown;
        };
        if (parsed && typeof parsed === 'object') {
          const map = (parsed[key] ?? {}) as Record<string, unknown>;
          return [map, parsed.format_version ?? fallbackFormatVersion];
        }
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return [{}, fallbackFormatVersion];
  }

  /**
   * Adds a `.lang` localization file to the pack.
   *
   * Lang files go under `texts/<locale>.lang`.
   *
   * @param lang The lang file to add.
   * @returns The pack-relative path that was written.
   */
  addLang(lang: LangFile): string {
    const path = lang.filePath;
    // Merge with any existing lang file so keys written by other helpers
    // (e.g. `addBlockName`) are preserved instead of being clobbered.
    const existing = this.getFile(path)?.toString('utf8');
    if (existing) lang.load(existing);
    this.addFile(path, lang.toString());
    return path;
  }

  /**
   * Adds a JSON UI file to the pack and registers it in `ui/_ui_defs.json`.
   *
   * @param ui The UI file to add.
   * @returns The pack-relative path that was written.
   */
  addUiFile(ui: UiFile): string {
    // Write the UI file, then merge its def-path into _ui_defs.json.
    this.addFile(ui.path, ui.toString());
    const defs = this.readUiDefs();
    if (!defs.includes(ui.uiDefPath)) {
      defs.push(ui.uiDefPath);
    }
    this.addFile('ui/_ui_defs.json', JSON.stringify({ ui_defs: defs.sort() }, null, 2));
    return ui.path;
  }

  /** Adds several JSON UI files at once. */
  addUiFiles(files: UiFile[]): string[] {
    return files.map((f) => this.addUiFile(f));
  }

  /** Writes a complete `_ui_defs.json` (replacing any existing defs). */
  createUiDefs(defs: UiDefs): string {
    this.addFile(defs.path, defs.toString());
    return defs.path;
  }

  /** Writes `_global_variables.json`. */
  addGlobalVariables(vars: UiGlobalVariables): string {
    this.addFile(vars.path, vars.toString());
    return vars.path;
  }

  /** Reads the current `ui/_ui_defs.json` array, or a fresh one. */
  private readUiDefs(): string[] {
    const file = this.getFile('ui/_ui_defs.json');
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as { ui_defs?: string[] };
        if (Array.isArray(parsed.ui_defs)) return parsed.ui_defs;
      } catch {
        // Malformed → start fresh.
      }
    }
    return [];
  }

  /**
   * Registers a block's texture in `textures/terrain_texture.json`, writing a
   * solid-color placeholder PNG if the texture is not already present.
   *
   * Blocks do NOT have an RP definition; their visuals come from
   * `minecraft:material_instances` (texture shortname) + `terrain_texture.json`.
   *
   * @param block The block to register its texture shortname.
   * @param options.placeholderColor The `[r,g,b]` color for the placeholder PNG.
   * @returns The registered texture shortname.
   */
  addBlockTexture(
    block: Block,
    options?: { placeholderColor?: [number, number, number] }
  ): string {
    const atlas = this.readTerrainTexture();
    // Key the terrain entry by the texture shortname the block actually
    // references, and derive the PNG name from that same shortname, so the
    // generated texture resolves instead of leaving a missing block texture.
    const texName = block.renderTextureName;
    const texShort = texName.includes(':') ? texName.slice(texName.indexOf(':') + 1) : texName;
    atlas[texName] = { textures: `textures/blocks/${texShort}` };
    this.writeTerrainTexture(atlas);

    const pngPath = `textures/blocks/${texShort}.png`;
    if (!this.hasFile(pngPath)) {
      this.addFile(
        pngPath,
        buildIconPng(16, options?.placeholderColor ?? [140, 140, 160])
      );
    }
    return texName;
  }

  /**
   * Writes the block's display name into a `.lang` file, keyed as
   * `tile.<identifier>.name`.
   *
   * @param block The block.
   * @param name The display name.
   * @param options.locale The locale. Defaults to `'en_US'`.
   * @returns The lang file path that was written.
   */
  addBlockName(
    block: Block,
    name: string,
    options?: { locale?: string }
  ): string {
    const locale = options?.locale ?? 'en_US';
    const langPath = `texts/${locale}.lang`;
    const key = `tile.${block.identifier}.name`;
    const existing = this.getFile(langPath)?.toString('utf8') ?? '';
    const lines = existing.length > 0 ? existing.split('\n') : [];
    // Remove any existing entry for the key, then append the new one.
    const filtered = lines.filter((l) => !l.startsWith(`${key}=`));
    filtered.push(`${key}=${name}`);
    this.addFile(langPath, filtered.join('\n') + '\n');
    return langPath;
  }

  /**
   * Writes the item display name into `texts/<locale>.lang` as
   * `item.<identifier>.name`. Repeated calls overwrite the same key (no duplicates).
   *
   * @param item The item to name.
   * @param name The display name (defaults to `item.config.name`).
   * @param options.locale The language file locale (default `'en_US'`).
   * @returns The lang file path that was written.
   */
  addItemName(item: Item, name?: string, options?: { locale?: string }): string {
    const locale = options?.locale ?? 'en_US';
    const langPath = `texts/${locale}.lang`;
    const key = `item.${item.identifier}.name`;
    // The `.lang` entry takes the simple item name. The rich display text
    // (`minecraft:display_name`, which may contain newlines/format codes) is
    // handled by the item component, not the localization file.
    const value = name ?? item.config.name ?? item.shortName;
    const existing = this.getFile(langPath)?.toString('utf8') ?? '';
    const lines = existing.length > 0 ? existing.split('\n') : [];
    const filtered = lines.filter((l) => !l.startsWith(`${key}=`));
    filtered.push(`${key}=${value}`);
    this.addFile(langPath, filtered.join('\n') + '\n');
    return langPath;
  }

  /**
   * Adds a flipbook (animated) block texture entry to
   * `textures/flipbook_textures.json`. The `atlasTile` must reference a shortname
   * registered in `terrain_texture.json` (e.g. via `addBlockTexture`).
   *
   * @param flip The flipbook texture animation definition.
   * @returns The pack-relative path that was written.
   */
  addFlipbookTexture(flip: FlipbookTextures): string {
    const entries = this.readFlipbookTextures();
    entries.push(flip.buildJson() as Record<string, unknown>);
    this.writeFlipbookTextures(entries);
    return FLIPBOOK_TEXTURE_PATH;
  }

  /** Adds several flipbook texture entries at once. */
  addFlipbookTextures(flips: FlipbookTextures[]): string {
    const entries = this.readFlipbookTextures();
    for (const flip of flips) {
      entries.push(flip.buildJson() as Record<string, unknown>);
    }
    this.writeFlipbookTextures(entries);
    return FLIPBOOK_TEXTURE_PATH;
  }

  /**
   * Adds a fog definition to the resource pack.
   * Writes the fog JSON to `fogs/<shortName>.json`.
   * @param fog The fog definition.
   * @returns The pack-relative path that was written.
   */
  addFog(fog: Fog): string {
    const path = `fogs/${fog.fileName}`;
    this.addNewFile(path, JSON.stringify(fog.buildJson(), null, 2), `Fog ${fog.identifier}`);
    return path;
  }

  /**
   * Adds biome client-side visual settings to `biomes_client.json`.
   *
   * The file sits at the resource-pack root and maps each biome to its client
   * visuals (fog, sky / water / grass / foliage colors, ambient particles,
   * fall-dust color, ambient light, biome music). Repeated calls MERGE their
   * `biomes` map into the file, so fog assignments for multiple biomes (or
   * multiple {@link BiomesClient} instances) coexist instead of overwriting one
   * another.
   *
   * @param client The biome client settings.
   * @returns The pack-relative path that was written (`biomes_client.json`).
   */
  addBiomesClient(client: BiomesClient): string {
    const existing = this.readBiomesClient();
    const merged: Record<string, unknown> = { ...existing };
    for (const [id, entry] of Object.entries(client.buildJson()['biomes'] as Record<string, unknown>)) {
      merged[id] = entry;
    }
    this.addFile(BIOMES_CLIENT_PATH, JSON.stringify({ biomes: merged }, null, 2));
    return BIOMES_CLIENT_PATH;
  }

  /** Reads the current `biomes_client.json` biome map, or a fresh one. */
  private readBiomesClient(): Record<string, unknown> {
    const file = this.getFile(BIOMES_CLIENT_PATH);
    if (file) {
      try {
        const parsed = JSON.parse(file.toString('utf8')) as {
          biomes?: Record<string, unknown>;
        };
        if (parsed && typeof parsed === 'object' && parsed.biomes) {
          return parsed.biomes;
        }
      } catch {
        // Malformed existing file → start fresh.
      }
    }
    return {};
  }

  /**
   * Adds a particle effect to the resource pack.
   * Writes the particle JSON to `particles/<shortName>.json`.
   *
   * Particles are client-side definitions that reference RP textures, so they
   * belong in the resource pack (`RP/particles`), not the behavior pack.
   *
   * @param particle The particle definition.
   * @returns The pack-relative path that was written.
   */
  addParticle(particle: Particle): string {
    const path = `particles/${particle.fileName}`;
    this.addNewFile(path, JSON.stringify(particle.buildJson(), null, 2), `Particle ${particle.identifier}`);
    return path;
  }

  /**
   * Overwrites `textures/item_texture.json` with a full atlas built from an
   * {@link ItemTextureAtlas}. Use this for bulk/manual texture mapping.
   *
   * @param atlas The atlas to write.
   * @returns The pack-relative path that was written.
   */
  addItemTextureAtlas(atlas: ItemTextureAtlas): string {
    this.writeItemTextureAtlas(atlas.buildJson() as {
      resource_pack_name: string;
      texture_name: string;
      texture_data: Record<string, unknown>;
    });
    return ITEM_TEXTURE_PATH;
  }

  /**
   * Adds an attachable definition (held-item visuals, armor trim, head items).
   *
   * Writes to `attachables/<shortName>.json`.
   *
   * @param attachable The attachable definition.
   * @returns The pack-relative path that was written.
   */
  addAttachable(attachable: Attachable): string {
    const path = `attachables/${attachable.fileName}`;
    this.addNewFile(path, JSON.stringify(attachable.buildJson(), null, 2), `Attachable ${attachable.identifier}`);
    return path;
  }

  /**
   * Registers a batch of sound events at once.
   *
   * Each entry in the batch registers a `sound_definitions` entry; when
   * `audioDataMap` is provided the corresponding OGG bytes are written to the
   * pack (keyed by `soundId`).
   *
   * @param batch The sound batch to apply.
   * @param audioDataMap Optional map of soundId → OGG bytes.
   * @returns The list of registered sound event identifiers.
   */
  applySoundBatch(batch: SoundBatch, audioDataMap?: Record<string, Buffer>): string[] {
    const ids: string[] = [];
    for (const call of batch.toAddSoundCalls()) {
      const audio = audioDataMap?.[call.soundId];
      ids.push(
        this.addSound(
          call.soundId,
          call.soundPath,
          call.options as AddSoundOptions,
          audio
        )
      );
    }
    return ids;
  }

  /**
   * Adds a dynamic 3D item model to the resource pack.
   *
   * This writes the three files produced by a {@link DynamicItemModel}:
   *  - `attachables/<shortName>.json` — the attachable definition
   *  - `models/entity/<shortName>.geo.json` — the 3D geometry
   *  - `animations/<shortName>.animation.json` — the animation (if any)
   *
   * @param model The dynamic item model.
   * @returns The list of pack-relative paths that were written.
   */
  addDynamicItemModel(model: DynamicItemModel): string[] {
    const files = model.buildFiles();
    const paths: string[] = [];
    this.addFile(files.attachable.path, JSON.stringify(files.attachable.json, null, 2));
    paths.push(files.attachable.path);
    this.addFile(files.geometry.path, JSON.stringify(files.geometry.json, null, 2));
    paths.push(files.geometry.path);
    if (files.animation) {
      this.addFile(files.animation.path, JSON.stringify(files.animation.json, null, 2));
      paths.push(files.animation.path);
    }
    return paths;
  }

  /**
   * Writes the render controller for a frame-sequence animation and (optionally)
   * registers its frame paths in `textures/item_texture.json` so they resolve.
   *
   * The entity that uses this animation should register the frame textures via
   * `addFrameTextures` (below) or wire `sequence.buildTexturesMap()` into its
   * client-entity `textures`.
   *
   * @param sequence The frame-sequence definition.
   * @returns The render-controller path that was written.
   */
  addFrameSequence(sequence: FrameSequence): string {
    const path = `render_controllers/${sequence.fileName}`;
    this.addFile(path, JSON.stringify(sequence.buildRenderControllerJson(), null, 2));
    return path;
  }

  /**
   * Registers the frame texture paths of a {@link FrameSequence} into
   * `textures/item_texture.json`, writing solid-color placeholder PNGs for any
   * frame that is not already present in the pack.
   *
   * @param sequence The frame sequence whose frames to wire.
   * @param options.placeholderColor The `[r,g,b]` color for placeholder frames.
   * @returns The list of texture paths that were registered.
   */
  addFrameTextures(
    sequence: FrameSequence,
    options?: { placeholderColor?: [number, number, number] }
  ): string[] {
    const atlas = this.readItemTextureAtlas();
    const paths: string[] = [];
    for (const frame of sequence.buildFrames()) {
      atlas.texture_data[frame.textureName] = { textures: frame.texturePath };
      const pngPath = `${frame.texturePath}.png`;
      if (!this.hasFile(pngPath)) {
        this.addFile(
          pngPath,
          buildIconPng(64, options?.placeholderColor ?? [120, 120, 200])
        );
      }
      paths.push(frame.texturePath);
    }
    this.writeItemTextureAtlas(atlas);
    return paths;
  }

  /** Returns a pretty-printed JSON string of the manifest. */
  override toString(): string {
    return JSON.stringify(this.buildManifest(), null, 2);
  }
}
