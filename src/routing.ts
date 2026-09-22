/**
 * Unified wiring router for SpawnModBE.
 *
 * Maps generator instances to the correct side of a mod (behavior pack vs
 * resource pack), so callers use a single entry point: `mod.add(...)`.
 */

import type { ModMain } from './ModMain.js';
import { Block } from './block/index.js';
import { Biome } from './biome/index.js';
import { EntityBP, EntityRP, RenderController, SpawnRules } from './entity/index.js';
import { Feature, FeatureRule } from './feature/index.js';
import { Fog } from './fog/index.js';
import { Item, RecordDisc } from './item/index.js';
import { LootTable } from './loot/index.js';
import { Particle } from './particle/index.js';
import { Recipe } from './recipe/index.js';
import {
  Attachable,
  DynamicItemModel,
  FlipbookTextures,
  FrameSequence,
  ItemTextureAtlas,
  LangFile,
  SoundBatch,
} from './rp/index.js';
import { TradeTable } from './trade/index.js';
import { UiDefs, UiFile, UiGlobalVariables } from './ui/index.js';

/** Anything `mod.add` can wire up: instances, `[instance, path]` tuples, or nested arrays. */
export type Addable =
  | Item
  | Block
  | EntityBP
  | EntityRP
  | RenderController
  | SpawnRules
  | Recipe
  | LootTable
  | TradeTable
  | UiFile
  | UiDefs
  | UiGlobalVariables
  | LangFile
  | ItemTextureAtlas
  | Attachable
  | SoundBatch
  | DynamicItemModel
  | FrameSequence
  | FlipbookTextures
  | Particle
  | Feature
  | FeatureRule
  | Biome
  | Fog
  | [Recipe, string?]
  | [LootTable, string]
  | [TradeTable, string]
  | Addable[];

/** Declarative batch routing spec for `ModMain.define`. */
export interface DefineSpec {
  items?: Item[];
  blocks?: Block[];
  entities?: (EntityBP | EntityRP | RenderController | SpawnRules)[];
  recipes?: (Recipe | [Recipe, string?])[];
  loot?: (LootTable | [LootTable, string])[];
  trades?: (TradeTable | [TradeTable, string])[];
  ui?: (UiFile | UiDefs | UiGlobalVariables)[];
  particles?: Particle[];
  features?: Feature[];
  featureRules?: FeatureRule[];
  biomes?: Biome[];
  rp?: (LangFile | ItemTextureAtlas | Attachable | SoundBatch | DynamicItemModel | FrameSequence | FlipbookTextures | Fog)[];
}

/** Turns a display name or identifier into readable capitalized words. */
export function humanize(identifier: string): string {
  const short = identifier.includes(':') ? identifier.slice(identifier.indexOf(':') + 1) : identifier;
  return short
    .replace(/[_-]+/g, ' ')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function typeLabel(entry: unknown): string {
  if (entry !== null && typeof entry === 'object') {
    const ctor = (entry as { constructor?: { name?: string } }).constructor;
    if (ctor && typeof ctor.name === 'string' && ctor.name.length > 0) return ctor.name;
  }
  return typeof entry;
}

function unsupportedError(entry: unknown): Error {
  return new Error(
    `Unsupported entry for mod.add(): ${typeLabel(entry)}. Supported: items (Item/Tools/Armor/Food/Fuel/Throwable/BlockPlacer/EntityPlacer/RecordDisc), Block, EntityBP/EntityRP/RenderController/SpawnRules, recipes, LootTable/TradeTable (path required), UiFile/UiDefs/UiGlobalVariables, LangFile/ItemTextureAtlas/Attachable/SoundBatch/DynamicItemModel/FrameSequence/FlipbookTextures, Particle, Feature/FeatureRule, Biome, Fog.`
  );
}

function requireBehavior(mod: ModMain, kind: string): void {
  if (!mod.behavior) {
    throw new Error(
      `Cannot add ${kind}: this mod has no behavior pack. Add a "sapi" entry to ModMain (e.g. sapi: 'scripts/main.js').`
    );
  }
}

function requirePath(entry: unknown[]): void {
  if (typeof entry[1] !== 'string' || entry[1].trim() === '') {
    throw new Error(
      'LootTable / TradeTable need an explicit path: mod.add([table, "loot_tables/x"]) or mod.add(table, "loot_tables/x").'
    );
  }
}

/** Routes a single entry to the correct pack(s). Throws for unsupported types / missing requirements. */
export function routeEntry(mod: ModMain, entry: Addable): void {
  // Path tuples and nested arrays.
  if (Array.isArray(entry)) {
    if (entry[0] instanceof Recipe) {
      requireBehavior(mod, 'recipe');
      mod.behavior!.addRecipe(entry[0], entry[1] as string | undefined);
      return;
    }
    if (entry[0] instanceof LootTable) {
      requirePath(entry);
      requireBehavior(mod, 'loot table');
      mod.behavior!.addLootTable(entry[0], entry[1] as string);
      return;
    }
    if (entry[0] instanceof TradeTable) {
      requirePath(entry);
      requireBehavior(mod, 'trade table');
      mod.behavior!.addTradeTable(entry[0], entry[1] as string);
      return;
    }
    for (const child of entry) routeEntry(mod, child as Addable);
    return;
  }

  // Items: behavior definition + resource assets + display name (+ disc sound).
  if (entry instanceof Item) {
    requireBehavior(mod, 'item');
    mod.behavior!.addItem(entry);
    mod.resource.addItemAssets(entry);
    mod.resource.addItemName(entry);
    if (entry instanceof RecordDisc) mod.resource.addRecordSound(entry);
    return;
  }

  if (entry instanceof Block) {
    requireBehavior(mod, 'block');
    mod.behavior!.addBlock(entry);
    mod.resource.addBlockTexture(entry);
    mod.resource.addBlockName(entry, humanize(entry.identifier));
    return;
  }

  if (entry instanceof EntityBP) {
    requireBehavior(mod, 'entity');
    mod.behavior!.addEntity(entry);
    return;
  }
  if (entry instanceof SpawnRules) {
    requireBehavior(mod, 'spawn rules');
    mod.behavior!.addSpawnRules(entry);
    return;
  }
  if (entry instanceof EntityRP) {
    mod.resource.addClientEntity(entry);
    return;
  }
  if (entry instanceof RenderController) {
    mod.resource.addRenderController(entry);
    return;
  }

  if (entry instanceof Recipe) {
    requireBehavior(mod, 'recipe');
    mod.behavior!.addRecipe(entry);
    return;
  }

  if (entry instanceof LootTable || entry instanceof TradeTable) {
    requirePath([entry]);
    return;
  }

  if (entry instanceof UiFile) { mod.resource.addUiFile(entry); return; }
  if (entry instanceof UiDefs) { mod.resource.createUiDefs(entry); return; }
  if (entry instanceof UiGlobalVariables) { mod.resource.addGlobalVariables(entry); return; }
  if (entry instanceof LangFile) { mod.resource.addLang(entry); return; }
  if (entry instanceof ItemTextureAtlas) { mod.resource.addItemTextureAtlas(entry); return; }
  if (entry instanceof Attachable) { mod.resource.addAttachable(entry); return; }
  if (entry instanceof SoundBatch) { mod.resource.applySoundBatch(entry); return; }
  if (entry instanceof DynamicItemModel) { mod.resource.addDynamicItemModel(entry); return; }
  if (entry instanceof FrameSequence) {
    mod.resource.addFrameSequence(entry);
    mod.resource.addFrameTextures(entry);
    return;
  }
  if (entry instanceof FlipbookTextures) { mod.resource.addFlipbookTexture(entry); return; }

  if (entry instanceof Particle) { requireBehavior(mod, 'particle'); mod.behavior!.addParticle(entry); return; }
  if (entry instanceof Feature) { requireBehavior(mod, 'feature'); mod.behavior!.addFeature(entry); return; }
  if (entry instanceof FeatureRule) { requireBehavior(mod, 'feature rule'); mod.behavior!.addFeatureRule(entry); return; }
  if (entry instanceof Biome) { requireBehavior(mod, 'biome'); mod.behavior!.addBiome(entry); return; }
  if (entry instanceof Fog) { mod.resource.addFog(entry); return; }

  throw unsupportedError(entry);
}

/** Routes a (possibly nested) list of entries. */
export function addEntries(mod: ModMain, entries: Addable[]): void {
  for (const entry of entries) routeEntry(mod, entry);
}

/** Pairs consecutive `table, 'path'` args into a `[table, path]` tuple. */
export function pairLootPaths(entries: Array<Addable | string>): Addable[] {
  const out: Addable[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const next = entries[i + 1];
    if ((e instanceof LootTable || e instanceof TradeTable) && typeof next === 'string') {
      out.push([e, next] as Addable);
      i++;   // consume the path arg
    } else {
      out.push(e as Addable);
    }
  }
  return out;
}
