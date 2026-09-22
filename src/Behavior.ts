/**
 * The `Behavior` class — describes and builds a Minecraft Bedrock behavior pack.
 *
 * A behavior pack (BP) holds the gameplay logic of a mod: entities, items,
 * commands, and (optionally) Script API (SAPI) scripts. `Behavior` lets you
 * configure a valid behavior pack manifest, add its scripts and data files, and
 * package it (write to disk or zip).
 *
 * @example
 * ```ts
 * const bp = new Behavior({
 *   name: 'Spawn Mod BP',
 *   description: 'Gameplay logic and scripts.',
 *   author: 'Dev',
 *   version: [1, 0, 0],
 *   script: { entry: 'scripts/main.js', language: 'javascript' },
 *   uuid: { seed: 'spawn-mod-bp' },
 * });
 * const manifest = bp.buildManifest();
 * const buffer = bp.pack(); // .mcpack zip
 * await bp.writeTo('./out/SpawnMod_BP');
 * ```
 */

import { type Block } from './block/Block.js';
import { type EntityBP } from './entity/EntityBP.js';
import { type SpawnRules } from './entity/SpawnRules.js';
import { itemShortName, type Item } from './item/Item.js';
import { type LootTable } from './loot/LootTable.js';
import { type TradeTable } from './trade/TradeTable.js';
import { buildHeader, packFolderName, PackBase, resolvePackConfig } from './pack.js';
import { type Biome } from './biome/index.js';
import { type Feature, type FeatureRule } from './feature/index.js';
import { type Recipe } from './recipe/Recipe.js';
import type {
  BehaviorPackConfig,
  BehaviorPackManifest,
  ManifestDependency,
  ManifestModule,
  ResolvedPackConfig,
  SapiConfig,
} from './types.js';
import { UuidPool } from './uuid.js';

/** The default `@minecraft/server` runtime version listed in the dependency. */
const DEFAULT_SAPI_RUNTIME = '1.11.0';

/** Resolves the SAPI config from either a string or an object. */
function resolveSapi(sapi: SapiConfig | string | undefined): SapiConfig | undefined {
  if (typeof sapi === 'string') {
    return { entry: sapi, language: 'javascript' };
  }
  if (sapi && typeof sapi === 'object') {
    return { ...sapi, language: sapi.language ?? 'javascript' };
  }
  return undefined;
}

export class Behavior extends PackBase {
  /** The fully-resolved pack configuration. */
  readonly config: ResolvedPackConfig;

  /** The pool of UUIDs used by this pack's manifest. */
  readonly uuids: UuidPool;

  /** The pack's header UUID. */
  readonly uuid: string;

  /** The resolved SAPI config, or `undefined` when the pack has no script module. */
  readonly sapi: SapiConfig | undefined;

  constructor(config: BehaviorPackConfig) {
    if (!config || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Behavior requires a non-empty "name".');
    }
    super();
    this.config = resolvePackConfig(config);
    this.uuids = new UuidPool(this.config.uuid.seed, this.config.uuid.explicit);
    this.uuid = this.uuids.get('behaviorPackHeader');
    this.sapi = resolveSapi(config.script);
  }

  get name(): string {
    return this.config.name;
  }

  /** The behavior-pack data module (type `data`) UUID. */
  get dataModuleUuid(): string {
    return this.uuids.get('behaviorPackDataModule');
  }

  /** The behavior-pack script module (type `script`) UUID, if applicable. */
  get scriptModuleUuid(): string | undefined {
    return this.sapi ? this.uuids.get('behaviorPackScriptModule') : undefined;
  }

  /** Returns `true` when the pack contains a Script API script module. */
  get hasScript(): boolean {
    return this.sapi !== undefined;
  }

  /**
   * Adds a custom item to the behavior pack.
   *
   * The item's behavior JSON is written to `items/<shortName>.json`, so the pack
   * knows the item identifier and its components when installed in-game.
   *
   * @param item The item (base {@link Item} or a subclass like {@link Tools}/{@link Armor}).
   * @returns The pack-relative path that was written.
   */
  addItem(item: Item): string {
    const path = `items/${itemShortName(item.identifier)}.json`;
    this.addNewFile(path, JSON.stringify(item.buildBehaviorJson(), null, 2), `Item ${item.identifier}`);
    return path;
  }

  /** Adds several items at once, returning their written paths. */
  addItems(items: Item[]): string[] {
    return items.map((item) => this.addItem(item));
  }

  /**
   * Adds a crafting recipe to the behavior pack.
   *
   * Writes the recipe JSON to `recipes/<fileName>`. The file name derives from
   * the recipe identifier (namespace prefix stripped), so multiple recipes with
   * unique identifiers never collide.
   *
   * @param recipe A {@link Recipe} subclass (Shapeless/Shaped/Furnace/BrewingMix/BrewingContainer).
   * @param subPath Optional subdirectory under `recipes/` (e.g. `'crafting/weapons'`).
   * @returns The pack-relative path that was written.
   */
  addRecipe(recipe: Recipe, subPath?: string): string {
    const base = subPath ? `${subPath.replace(/(^\/|\/$)/g, '')}/` : '';
    const path = `recipes/${base}${recipe.fileName}`;
    this.addNewFile(path, JSON.stringify(recipe.buildJson(), null, 2), `Recipe ${recipe.identifier}`);
    return path;
  }

  /** Adds several recipes at once, returning their written paths. */
  addRecipes(recipes: Array<Recipe | [Recipe, string?]>): string[] {
    return recipes.map((entry) =>
      Array.isArray(entry) ? this.addRecipe(entry[0], entry[1]) : this.addRecipe(entry)
    );
  }

  /**
   * Adds a loot table to the behavior pack.
   *
   * Writes the loot table JSON to `<path>.json` under `loot_tables/` by default,
   * or to the exact relative path if it already starts with `loot_tables/`.
   *
   * @param lootTable The loot table definition.
   * @param path The BP-relative path (without `.json`), e.g. `'loot_tables/custom/artifacts'`.
   * @returns The pack-relative path that was written.
   */
  addLootTable(lootTable: LootTable, path: string): string {
    const normalized = path.startsWith('loot_tables/')
      ? path
      : `loot_tables/${path.replace(/^\/+/, '')}`;
    const filePath = `${normalized}.json`;
    this.addNewFile(filePath, JSON.stringify(lootTable.buildJson(), null, 2), `LootTable ${filePath}`);
    return filePath;
  }

  /**
   * Adds a behavior-pack entity definition.
   *
   * Writes the entity JSON to `entities/<shortName>.json`.
   *
   * @param entity The entity behavior definition.
   * @returns The pack-relative path that was written.
   */
  addEntity(entity: EntityBP): string {
    const path = `entities/${entity.fileName}`;
    this.addNewFile(path, JSON.stringify(entity.buildJson(), null, 2), `Entity ${entity.identifier}`);
    return path;
  }

  /**
   * Adds a spawn rule for an entity.
   *
   * Writes the spawn-rules JSON to `spawn_rules/<shortName>.json`.
   *
   * @param rules The spawn rules definition.
   * @returns The pack-relative path that was written.
   */
  addSpawnRules(rules: SpawnRules): string {
    const path = `spawn_rules/${rules.fileName}`;
    this.addNewFile(path, JSON.stringify(rules.buildJson(), null, 2), `SpawnRules ${rules.identifier}`);
    return path;
  }

  /**
   * Adds a trade table to the behavior pack.
   *
   * Trade tables live under `trading/` by convention. The path should be
   * pack-relative (without `.json`), e.g. `'trading/wiki/minister'`.
   *
   * @param table The trade table definition.
   * @param path The BP-relative path (without `.json`).
   * @returns The pack-relative path that was written.
   */
  addTradeTable(table: TradeTable, path: string): string {
    const normalized = path.startsWith('trading/')
      ? path
      : `trading/${path.replace(/^\/+/, '')}`;
    const filePath = `${normalized}.json`;
    this.addNewFile(filePath, JSON.stringify(table.buildJson(), null, 2), `TradeTable ${filePath}`);
    return filePath;
  }

  /**
   * Adds a custom block definition to the behavior pack.
   *
   * Writes the block JSON to `blocks/<shortName>.json`.
   *
   * @param block The block definition.
   * @returns The pack-relative path that was written.
   */
  addBlock(block: Block): string {
    const path = `blocks/${block.fileName}`;
    this.addNewFile(path, JSON.stringify(block.buildJson(), null, 2), `Block ${block.identifier}`);
    return path;
  }

  /**
   * Adds a feature to the behavior pack.
   * Writes the feature JSON to `features/<shortName>.json`.
   * @param feature The feature definition.
   * @returns The pack-relative path that was written.
   */
  addFeature(feature: Feature): string {
    const path = `features/${feature.fileName}`;
    this.addNewFile(path, JSON.stringify(feature.buildJson(), null, 2), `Feature ${feature.identifier}`);
    return path;
  }

  /**
   * Adds a feature rule to the behavior pack.
   * Writes the rule JSON to `feature_rules/<shortName>.json`.
   * @param rule The feature-rule definition.
   * @returns The pack-relative path that was written.
   */
  addFeatureRule(rule: FeatureRule): string {
    const path = `feature_rules/${rule.fileName}`;
    this.addNewFile(path, JSON.stringify(rule.buildJson(), null, 2), `FeatureRule ${rule.identifier}`);
    return path;
  }

  /**
   * Adds a biome to the behavior pack.
   * Writes the biome JSON to `biomes/<shortName>.json`.
   * @param biome The biome definition.
   * @returns The pack-relative path that was written.
   */
  addBiome(biome: Biome): string {
    const path = `biomes/${biome.fileName}`;
    this.addNewFile(path, JSON.stringify(biome.buildJson(), null, 2), `Biome ${biome.identifier}`);
    return path;
  }

  /**
   * Builds the behavior-pack manifest.
   *
   * @param options Optional add-ons to the manifest.
   * @param options.dependencies Extra dependencies to append (e.g. a resource pack).
   */
  buildManifest(options?: {
    dependencies?: ManifestDependency[];
  }): BehaviorPackManifest {
    const modules: ManifestModule[] = [];

    // A behavior pack always needs a data module that holds its gameplay content.
    modules.push({
      type: 'data',
      uuid: this.dataModuleUuid,
      version: this.config.version,
      description: this.config.description,
    });

    // If a Script API entry is present, add the script module and its runtime dep.
    if (this.sapi) {
      const scriptModule: ManifestModule = {
        type: 'script',
        uuid: this.uuids.get('behaviorPackScriptModule'),
        version: this.config.version,
        description: this.config.description,
        entry: this.sapi.entry,
      };
      if (this.sapi.language) {
        scriptModule.language = this.sapi.language;
      }
      modules.push(scriptModule);
    }

    const manifest: BehaviorPackManifest = {
      format_version: 2,
      header: buildHeader(this.config, this.uuid),
      modules,
    };

    // Build the final dependency list: caller-supplied deps, plus the @minecraft/server
    // runtime dependency when scripts are present.
    const deps: ManifestDependency[] = [...(options?.dependencies ?? [])];
    // Script runtime dependencies are referenced by `module_name`, not `uuid`.
    if (this.sapi) {
      deps.push({
        version: this.sapi.runtimeVersion ?? DEFAULT_SAPI_RUNTIME,
        module_name: '@minecraft/server',
      });
    }
    if (deps.length > 0) {
      manifest.dependencies = deps;
    }

    return manifest;
  }

  /** A sanitized folder name for this pack (e.g. for a `.mcaddon` bundle). */
  get folderName(): string {
    return packFolderName(this.config);
  }

  /** Returns a pretty-printed JSON string of the manifest. */
  override toString(): string {
    return JSON.stringify(this.buildManifest(), null, 2);
  }
}
