# 统一接线 API（mod.add / mod.define / 工厂）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `mod.add(...)` / `mod.define({...})` / 工厂方法自动把各生成器接线到正确的行为包/资源包，使用更简洁。

**Architecture:** 在 `src/routing.ts` 中实现纯函数路由（按 `instanceof` 分类分发），`ModMain.add/define/工厂` 委托给路由；新增 `Resource.addItemName` 对称补齐物品本地化；example 与 README 改为新写法。

**Tech Stack:** TypeScript（strict）、Node >=18 内置模块、无运行时依赖；测试复用 `test/smoke.test.ts` 原生 assert 风格。

**Spec:** [docs/unified-api-spec.md](../../unified-api-spec.md)（评审通过的 0.3.0 设计规格）

## Global Constraints

- 严格只增不改：现有 `Behavior.addXxx()` / `Resource.addYyy()` 方法全部保留，任何已有测试断言不得修改语义。
- strict TS + `noUnusedLocals`/`noUnusedParameters`：新增代码不允许出现未使用的导入/变量。
- 零运行时依赖（仅 Node 内置模块）；构建 `npm run build`（扁平 `dist/`），测试 `npm test`（`tsc -p tsconfig.test.json` → `dist/src` + `dist/test`）。
- 冒烟测试全部写在 `test/smoke.test.ts`，每个测试打印一行 `[ok] ...`，并在文件底部运行列表追加调用；新导入加在文件顶部 import 块。
- 提交/推送约定：每个任务绿后提交一个 commit；全部完成后版本 0.3.0（`npm version 0.3.0 --no-git-tag-version` 同步 lock）、CHANGELOG 新增段落、推送 GitHub `origin/main`。
- `dist/` 不入库；入库产物 = `src/`、`test/`、`docs/`、`example/`、`README.md`、`CHANGELOG.md`、`package.json`、`package-lock.json`。

## Review Focus

1. `mod.add()` 收到非框架对象（如普通对象 / 纯字符串）→ 抛 `Unsupported entry` 并列出支持类型（Task 3 钉住）。
2. 纯资源包模组（无 sapi）上添加 Item/Block/Recipe/Loot/EntityBP/SpawnRules → 抛「没有行为包，请加 sapi」错误，而不是静默跳过（Task 2/3 钉住）。
3. LootTable / TradeTable 路径缺失或为空 → 抛带用法的错误（Task 3 钉住）。
4. 同一物品重复 `mod.add` → 本地化文件仍只有一条 key（Task 1 的合并逻辑被路由复用；Task 2 断言）。
5. `mod.add()` 无参数 / `define` 全空字段 → 静默 no-op 并返回 `this`（Task 2/4 钉住）。

---

### Task 1: `Resource.addItemName` —— 物品显示名本地化

**Files:**
- Modify: `src/Resource.ts`（在 `addBlockName` 之后新增方法，约 537 行后）
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: `Item`（`get identifier`、`config.name`），`Resource.getFile(path)` / `addFile(path, data)`
- Produces: `Resource.addItemName(item: Item, name?: string, options?: { locale?: string }): string` —— 写 `item.<identifier>.name` 到 `texts/<locale>.lang`，默认 `locale='en_US'`、`name=item.config.name`，同 key 合并去重

**步骤：**

- [ ] **Step 1: 写失败测试**（追加到 `test/smoke.test.ts`，并在底部运行列表 `await testCliVersionAndHelp();` 之后加一行 `testAddItemName();`）

```ts
function testAddItemName() {
  const rp = new Resource({ name: 'RP', author: 'a', version: [1, 0, 0] });
  const ruby = new Item({ identifier: 'route:ruby', name: 'Ruby' });
  const path = rp.addItemName(ruby);
  assert.equal(path, 'texts/en_US.lang');
  let lang = rp.getFile('texts/en_US.lang')!.toString('utf8');
  assert.ok(lang.includes('item.route:ruby.name=Ruby'), 'writes item.<id>.name');
  rp.addItemName(ruby, 'Renamed');
  lang = rp.getFile('texts/en_US.lang')!.toString('utf8');
  assert.ok(lang.includes('item.route:ruby.name=Renamed'), 'overwrites same key');
  assert.equal(lang.match(/item\.route:ruby\.name=/g)!.length, 1, 'no duplicate keys');
  console.log('[ok] Resource.addItemName merges item display names');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -15`
Expected: `error TS2339: Property 'addItemName' does not exist on type 'Resource'`

- [ ] **Step 3: 最小实现**（`src/Resource.ts` 中 `addBlockName` 方法体之后插入）

```ts
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
    const value = name ?? item.config.name;
    const existing = this.getFile(langPath)?.toString('utf8') ?? '';
    const lines = existing.length > 0 ? existing.split('\n') : [];
    const filtered = lines.filter((l) => !l.startsWith(`${key}=`));
    filtered.push(`${key}=${value}`);
    this.addFile(langPath, filtered.join('\n') + '\n');
    return langPath;
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全部通过，末尾 `All SpawnModBE smoke tests passed.`，含新 `[ok] Resource.addItemName merges item display names`

- [ ] **Step 5: Commit**

```bash
git add src/Resource.ts test/smoke.test.ts
git commit -m "feat(routing): add Resource.addItemName for item display names"
```

---

### Task 2: 路由模块 + `ModMain.add`（实例路由）

**Files:**
- Create: `src/routing.ts`
- Modify: `src/ModMain.ts`（imports + `add` 方法，放在 `toMcaddon()` 之后）
- Modify: `src/index.ts`（导出 `Addable` / `DefineSpec`）
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: 全部生成器类（`Item`、`RecordDisc`、`Block`、`EntityBP`、`EntityRP`、`RenderController`、`SpawnRules`、`Recipe`、`LootTable`、`TradeTable`、`UiFile`、`UiDefs`、`UiGlobalVariables`、`LangFile`、`ItemTextureAtlas`、`Attachable`、`SoundBatch`、`DynamicItemModel`、`FrameSequence`、`FlipbookTextures`）、`ModMain.behavior` / `ModMain.resource`
- Produces:
  - `src/routing.ts` 导出：`type Addable`、`interface DefineSpec`、`addEntries(mod, entries)`、`routeEntry(mod, entry)`、`pairLootPaths(entries)`、`humanize(identifier)`
  - `ModMain.add(...entries: Array<Addable | string>): this`
  - `src/index.ts` 追加 `export type { Addable, DefineSpec } from './routing.js';`

**步骤：**

- [ ] **Step 1: 写失败测试**（运行列表追加 `testRoutingItems(); testRoutingEntities(); testRoutingRpModules();`）

```ts
function testRoutingItems() {
  const mod = new ModMain({ name: 'Route', sapi: 'scripts/main.js', uuid: { seed: 'route-items' } });
  const ruby = new Item({ identifier: 'route:ruby', name: 'Route Ruby', texturePath: 'textures/items/route_ruby' });
  const chainsaw = new Tools({
    identifier: 'route:chainsaw',
    name: 'Chainsaw',
    texturePath: 'textures/items/chainsaw',
    dynamicModel: {
      bones: [{ name: 'blade', pivot: [0, 0, 0], cubes: [{ origin: [-1, 0, -1], size: [2, 1, 2], uv: [0, 0] }] }],
    },
  });
  const disc = new RecordDisc({ identifier: 'route:disc', name: 'Route Disc', comparatorSignal: 1, duration: 3, soundEvent: 'record.route' });
  const ret = mod.add([ruby, chainsaw, disc]);
  assert.equal(ret, mod, 'add returns this for chaining');
  assert.ok(mod.behavior!.hasFile('items/route_ruby.json'));
  assert.ok(mod.behavior!.hasFile('items/chainsaw.json'));
  assert.ok(mod.behavior!.hasFile('items/disc.json'));
  assert.ok(mod.resource.hasFile('textures/items/route_ruby.png'));
  assert.ok(mod.resource.hasFile('attachables/chainsaw.json'));
  assert.ok(mod.resource.hasFile('models/entity/chainsaw.geo.json'));
  assert.ok(mod.resource.hasFile('animations/chainsaw.animation.json'));
  const defs = JSON.parse(mod.resource.getFile('sounds/sound_definitions.json')!.toString('utf8')) as AnyObj;
  assert.ok(defs.sound_definitions['record.route'], 'record disc sound auto-registered');
  const lang = mod.resource.getFile('texts/en_US.lang')!.toString('utf8');
  assert.ok(lang.includes('item.route:ruby.name=Route Ruby'));
  mod.add(ruby);
  const lang2 = mod.resource.getFile('texts/en_US.lang')!.toString('utf8');
  assert.equal(lang2.match(/item\.route:ruby\.name=/g)!.length, 1, 'no duplicate lang keys');
  console.log('[ok] mod.add routes items (BP + RP assets + sound + lang)');
}

function testRoutingEntities() {
  const mod = new ModMain({ name: 'Route', sapi: 'scripts/main.js', uuid: { seed: 'route-entities' } });
  const bp = new EntityBP({ identifier: 'route:goblin', components: { 'minecraft:type_family': { family: ['goblin'] } } });
  const rp = new EntityRP({ identifier: 'route:goblin' });
  const rc = new RenderController({ id: 'controller.render.goblin', geometry: 'geometry.goblin', materials: [{ '*': 'material.default' }], textures: ['texture.default'] });
  const rules = new SpawnRules({ identifier: 'route:goblin', populationControl: 'monster', conditions: [{ weight: 100 }] });
  mod.add(bp, rp, rc, rules);
  assert.ok(mod.behavior!.hasFile('entities/goblin.json'));
  assert.ok(mod.resource.hasFile('entity/goblin.entity.json'));
  assert.ok(mod.resource.hasFile('render_controllers/goblin.rc.json'));
  assert.ok(mod.behavior!.hasFile('spawn_rules/goblin.json'));
  console.log('[ok] mod.add routes entity quartet to the right packs');
}

function testRoutingRpModules() {
  const mod = new ModMain({ name: 'Route', uuid: { seed: 'route-rp' } });
  const lang = new LangFile({ locale: 'en_US', entries: [['item.route:gem.name', 'Gem']] });
  const atlas = new ItemTextureAtlas();
  atlas.set('gem', 'textures/items/gem');
  const atch = new Attachable({
    identifier: 'route:telescope',
    materials: { default: 'entity_alphatest' },
    textures: { default: 'textures/entity/telescope' },
    geometry: { default: 'geometry.telescope' },
  });
  const batch = new SoundBatch({ sounds: [{ soundId: 'route:whoosh', soundPath: 'sounds/route/whoosh' }] });
  const model = new DynamicItemModel({ identifier: 'route:wand', bones: [{ name: 'stick', pivot: [0, 0, 0], cubes: [{ origin: [0, 0, 0], size: [1, 1, 1], uv: [0, 0] }] }] });
  const seq = new FrameSequence({ controllerId: 'controller.render.frames', geometry: 'geometry.frames', frameTextures: ['texture.frame0', 'texture.frame1'] });
  const flip = new FlipbookTextures({ atlasTile: 'magma', flipbookTexture: 'textures/blocks/magma' });
  const uiFile = new UiFile({ fileName: 'route.json', namespace: 'route', elements: [{ name: 'lbl', type: 'label', text: 'hi' }] });
  const uiDefs = new UiDefs({ defs: ['ui/route.json'] });
  const uiVars = new UiGlobalVariables({ variables: { foo: 'bar' } });
  mod.add(lang, atlas, atch, batch, model, seq, flip, uiFile, uiDefs, uiVars);
  assert.ok(mod.resource.hasFile('texts/en_US.lang'));
  assert.ok(mod.resource.hasFile('textures/item_texture.json'));
  assert.ok(mod.resource.hasFile('attachables/telescope.json'));
  assert.ok(mod.resource.hasFile('sounds/sound_definitions.json'));
  assert.ok(mod.resource.hasFile('models/entity/wand.geo.json'));
  assert.ok(mod.resource.hasFile('render_controllers/frames.rc.json'));
  const atlasJson = JSON.parse(mod.resource.getFile('textures/item_texture.json')!.toString('utf8')) as AnyObj;
  assert.ok(atlasJson.texture_data['texture.frame0'], 'frame textures registered');
  assert.ok(mod.resource.hasFile('textures/flipbook_textures.json'));
  assert.ok(mod.resource.hasFile('ui/route.json'));
  assert.ok(mod.resource.hasFile('ui/_ui_defs.json'));
  assert.ok(mod.resource.hasFile('ui/_global_variables.json'));
  mod.add();
  console.log('[ok] mod.add routes RP modules (lang/atlas/attachable/sound/model/sequence/flipbook/ui)');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -15`
Expected: `error TS2339: Property 'add' does not exist on type 'ModMain'`

- [ ] **Step 3: 实现路由模块**（新建 `src/routing.ts`，完整内容如下）

```ts
/**
 * Unified wiring router for SpawnModBE.
 *
 * Maps generator instances to the correct side of a mod (behavior pack vs
 * resource pack), so callers use a single entry point: `mod.add(...)`.
 */

import type { ModMain } from './ModMain.js';
import { Block } from './block/index.js';
import { EntityBP, EntityRP, RenderController, SpawnRules } from './entity/index.js';
import { Item, RecordDisc } from './item/index.js';
import { LootTable } from './loot/index.js';
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
  rp?: (LangFile | ItemTextureAtlas | Attachable | SoundBatch | DynamicItemModel | FrameSequence | FlipbookTextures)[];
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
    `Unsupported entry for mod.add(): ${typeLabel(entry)}. Supported: items (Item/Tools/Armor/Food/Fuel/Throwable/BlockPlacer/EntityPlacer/RecordDisc), Block, EntityBP/EntityRP/RenderController/SpawnRules, recipes, LootTable/TradeTable (path required), UiFile/UiDefs/UiGlobalVariables, LangFile/ItemTextureAtlas/Attachable/SoundBatch/DynamicItemModel/FrameSequence/FlipbookTextures.`
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
      mod.behavior!.addRecipe(entry[0], entry[1]);
      return;
    }
    if (entry[0] instanceof LootTable) {
      requirePath(entry);
      requireBehavior(mod, 'loot table');
      mod.behavior!.addLootTable(entry[0], entry[1]);
      return;
    }
    if (entry[0] instanceof TradeTable) {
      requirePath(entry);
      requireBehavior(mod, 'trade table');
      mod.behavior!.addTradeTable(entry[0], entry[1]);
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
      i++;
    } else {
      out.push(e as Addable);
    }
  }
  return out;
}
```

- [ ] **Step 4: 接上 `ModMain.add`**

`src/ModMain.ts` 顶部 import 追加：

```ts
import { addEntries, pairLootPaths, type Addable, type DefineSpec } from './routing.js';
```

`src/ModMain.ts` 在 `toMcaddon()` 右花括号后追加：

```ts
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
```

`src/index.ts` 追加：

```ts
export type { Addable, DefineSpec } from './routing.js';
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test 2>&1 | tail -25`
Expected: 全部通过，末尾 `All SpawnModBE smoke tests passed.`，含三个新 `[ok]`

- [ ] **Step 6: Commit**

```bash
git add src/routing.ts src/ModMain.ts src/index.ts test/smoke.test.ts
git commit -m "feat(routing): mod.add routes generators to the correct packs"
```

---

### Task 3: 路径元组 / `(table, path)` 双写形式 + 错误语义

**Files:**
- Modify: `src/routing.ts`（Task 2 已实现；本任务只钉住行为）
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: `ModMain.add`（Task 2 产物）
- Produces: 无新接口；钉死元组/双参路径与三种错误消息

**步骤：**

- [ ] **Step 1: 写失败测试**（顶部 import 追加 `import type { Addable as AddableType } from '../src/routing.js';`；运行列表追加 `testRoutingPathsAndErrors();`）

```ts
function testRoutingPathsAndErrors() {
  const mod = new ModMain({ name: 'Route', sapi: 'scripts/main.js', uuid: { seed: 'route-paths' } });
  const sword = new Shaped({
    identifier: 'route:sword',
    tags: ['crafting_table'],
    pattern: ['X'],
    key: { X: 'minecraft:diamond' },
    result: { item: 'route:sword' },
  });
  mod.add([sword, 'weapons']);
  assert.ok(mod.behavior!.hasFile('recipes/weapons/sword.json'), 'recipe tuple subpath works');
  const table = new LootTable({
    pools: [{ entries: [{ type: 'item', name: 'minecraft:diamond', weight: 1 }] }],
  });
  mod.add([table, 'loot_tables/cave']);
  assert.ok(mod.behavior!.hasFile('loot_tables/cave.json'), 'loot tuple path works');
  const trades = new TradeTable({
    tiers: [{
      groups: [{
        numToSelect: 1,
        trades: [{ wants: [{ item: 'minecraft:emerald' }], gives: [{ item: 'route:sword' }] }],
      }],
    }],
  });
  mod.add(trades, 'trading/trader');
  assert.ok(mod.behavior!.hasFile('trading/trader.json'), 'add(table, path) works');
  console.log('[ok] add() handles tuple paths and (table, path) pairs');
}

function testRoutingErrors() {
  const rpOnly = new ModMain({ name: 'RP Only', uuid: { seed: 'rp-only' } });
  assert.throws(() => rpOnly.add(new Item({ identifier: 'x:y', name: 'Y' })), /behavior pack/);
  const mod = new ModMain({ name: 'M', sapi: 'scripts/main.js', uuid: { seed: 'route-err' } });
  assert.throws(() => mod.add({ whatever: 1 } as unknown as AddableType), /Unsupported entry/);
  assert.throws(() => mod.add(new LootTable({ pools: [] })), /explicit path/);
  console.log('[ok] add() errors are explicit (no-sapi / unsupported / missing path)');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -25`
Expected: 若 `pairLootPaths` 已实现则本任务测试可能直接全绿；**为保证 TDD 红先行**，临时删除 `src/routing.ts` 中 `pairLootPaths` 的 `i++;` 一行并保存，再运行：
Expected: `add(trades, 'trading/trader')` 断言失败（trading/trader.json 不存在）

- [ ] **Step 3: 恢复实现**

恢复 `src/routing.ts` `pairLootPaths`：

```ts
    if ((e instanceof LootTable || e instanceof TradeTable) && typeof next === 'string') {
      out.push([e, next] as Addable);
      i++;   // consume the path arg
    } else {
      out.push(e as Addable);
    }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -25`
Expected: 全部通过（含 `[ok] add() handles tuple paths ...` 与 `[ok] add() errors are explicit ...`）

- [ ] **Step 5: Commit**

```bash
git add src/routing.ts test/smoke.test.ts
git commit -m "test(routing): pin tuple paths and explicit error semantics"
```

---

### Task 4: `ModMain.define` 声明式批量

**Files:**
- Modify: `src/ModMain.ts`（`define` 方法，放在 `add` 之后）
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: `addEntries`、`DefineSpec`（Task 2）
- Produces: `ModMain.define(spec: DefineSpec): this`

**步骤：**

- [ ] **Step 1: 写失败测试**（运行列表追加 `testDefine();`）

```ts
function testDefine() {
  const mod = new ModMain({ name: 'Define', sapi: 'scripts/main.js', uuid: { seed: 'define-all' } });
  const ruby = new Item({ identifier: 'route:ruby', name: 'Ruby', texturePath: 'textures/items/ruby' });
  const lamp = new Block({ identifier: 'route:lamp', components: { 'minecraft:material_instances': { '*': { texture: 'route_lamp' } } } });
  const goblin = new EntityBP({ identifier: 'route:goblin', components: { 'minecraft:type_family': { family: ['goblin'] } } });
  const sword = new Shaped({ identifier: 'route:sword', tags: ['crafting_table'], pattern: ['X'], key: { X: 'minecraft:diamond' }, result: { item: 'route:sword' } });
  const table = new LootTable({ pools: [{ entries: [{ type: 'item', name: 'minecraft:diamond', weight: 1 }] }] });
  const trades = new TradeTable({ tiers: [{ trades: [{ wants: [{ item: 'minecraft:emerald' }], gives: [{ item: 'route:sword' }] }] }] });
  const screen = new UiFile({ fileName: 'settings.json', namespace: 'settings', elements: [{ name: 'lbl', type: 'label', text: 'hi' }] });
  const ret = mod.define({
    items: [ruby],
    blocks: [lamp],
    entities: [goblin],
    recipes: [[sword, 'weapons']],
    loot: [[table, 'loot_tables/cave']],
    trades: [[trades, 'trading/trader']],
    ui: [screen],
  });
  assert.equal(ret, mod, 'define returns this');
  assert.ok(mod.behavior!.hasFile('items/ruby.json'));
  assert.ok(mod.behavior!.hasFile('blocks/lamp.json'));
  assert.ok(mod.behavior!.hasFile('entities/goblin.json'));
  assert.ok(mod.behavior!.hasFile('recipes/weapons/sword.json'));
  assert.ok(mod.behavior!.hasFile('loot_tables/cave.json'));
  assert.ok(mod.behavior!.hasFile('trading/trader.json'));
  assert.ok(mod.resource.hasFile('ui/settings.json'));
  assert.ok(mod.resource.hasFile('texts/en_US.lang'));
  mod.define({});
  console.log('[ok] define() wires a full declarative batch');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -15`
Expected: `error TS2339: Property 'define' does not exist on type 'ModMain'`

- [ ] **Step 3: 最小实现**（`src/ModMain.ts`，`add` 方法之后）

```ts
  /**
   * Declarative batch wiring: routes grouped generator arrays to the correct packs.
   * Returns `this` for chaining (e.g. `.define({...}).writeTo('out')`).
   */
  define(spec: DefineSpec): this {
    addEntries(this, [
      ...(spec.items ?? []),
      ...(spec.blocks ?? []),
      ...(spec.entities ?? []),
      ...(spec.recipes ?? []),
      ...(spec.loot ?? []),
      ...(spec.trades ?? []),
      ...(spec.ui ?? []),
      ...(spec.rp ?? []),
    ]);
    return this;
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -25`
Expected: 全部通过，含 `[ok] define() wires a full declarative batch`

- [ ] **Step 5: Commit**

```bash
git add src/ModMain.ts test/smoke.test.ts
git commit -m "feat(routing): add ModMain.define declarative batch wiring"
```

---

### Task 5: 工厂方法

**Files:**
- Modify: `src/ModMain.ts`（工厂方法 + `addAndReturn` 私有助手 + 类型导入）
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: `Item`/`Block`/`EntityBP`/`EntityRP`/`RenderController`/`SpawnRules`/`Shaped`/`Shapeless`/`Furnace`/`BrewingMix`/`BrewingContainer`/`LootTable`/`TradeTable`/`UiFile` 及其 `*Config` 类型（均已在 `src/*/index.ts` 导出）
- Produces: `ModMain` 上 14 个工厂方法与私有 `addAndReturn<T extends object>(instance: T, path?: string): T`

**步骤：**

- [ ] **Step 1: 写失败测试**（运行列表追加 `testFactories();`）

```ts
function testFactories() {
  const mod = new ModMain({ name: 'Factory', sapi: 'scripts/main.js', uuid: { seed: 'factories' } });
  const ruby = mod.item({ identifier: 'route:ruby', name: 'Ruby', texturePath: 'textures/items/ruby' });
  assert.ok(ruby instanceof Item && mod.behavior!.hasFile('items/ruby.json') && mod.resource.hasFile('textures/items/ruby.png'));
  const lamp = mod.block({ identifier: 'route:lamp', components: { 'minecraft:material_instances': { '*': { texture: 'route_lamp' } } } });
  assert.ok(mod.behavior!.hasFile('blocks/lamp.json'));
  const sword = mod.shaped({ identifier: 'route:sword', tags: ['crafting_table'], pattern: ['X'], key: { X: 'minecraft:diamond' }, result: { item: 'route:sword' } });
  assert.ok(mod.behavior!.hasFile('recipes/sword.json'));
  const loot = mod.loot({ pools: [{ entries: [{ type: 'item', name: 'minecraft:diamond', weight: 1 }] }] }, 'loot_tables/factory');
  assert.ok(mod.behavior!.hasFile('loot_tables/factory.json'));
  const screen = mod.ui({ fileName: 'factory.json', namespace: 'factory', elements: [{ name: 'l', type: 'label', text: 'x' }] });
  assert.ok(mod.resource.hasFile('ui/factory.json'));
  console.log('[ok] factories construct and auto-wire');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -15`
Expected: `error TS2339: Property 'item' does not exist on type 'ModMain'`

- [ ] **Step 3: 实现**（`src/ModMain.ts`：值导入 + 类型导入 + 方法块）

值/类型导入：

```ts
import { Block } from './block/index.js';
import { EntityBP, EntityRP, RenderController, SpawnRules } from './entity/index.js';
import { Item } from './item/index.js';
import { BrewingContainer, BrewingMix, Furnace, Shaped, Shapeless } from './recipe/index.js';
import { LootTable } from './loot/index.js';
import { TradeTable } from './trade/index.js';
import { UiFile } from './ui/index.js';
import type { ItemConfig } from './item/index.js';
import type { BlockConfig } from './block/index.js';
import type { EntityBPConfig, EntityRPConfig, RenderControllerConfig, SpawnRulesConfig } from './entity/index.js';
import type { BrewingContainerConfig, BrewingMixConfig, FurnaceConfig, ShapedConfig, ShapelessConfig } from './recipe/index.js';
import type { LootTableConfig } from './loot/index.js';
import type { TradeTableConfig } from './trade/index.js';
import type { UiFileConfig } from './ui/index.js';
```

`define` 方法之后追加方法块：

```ts
  /** Constructs + wires an {@link Item}. Returns the instance for further chaining. */
  item(config: ItemConfig): Item { return this.addAndReturn(new Item(config)); }
  /** Constructs + wires a {@link Block}. */
  block(config: BlockConfig): Block { return this.addAndReturn(new Block(config)); }
  /** Constructs + wires an {@link EntityBP}. */
  entityBP(config: EntityBPConfig): EntityBP { return this.addAndReturn(new EntityBP(config)); }
  /** Constructs + wires an {@link EntityRP}. */
  entityRP(config: EntityRPConfig): EntityRP { return this.addAndReturn(new EntityRP(config)); }
  /** Constructs + wires a {@link RenderController}. */
  renderController(config: RenderControllerConfig): RenderController { return this.addAndReturn(new RenderController(config)); }
  /** Constructs + wires {@link SpawnRules}. */
  spawnRules(config: SpawnRulesConfig): SpawnRules { return this.addAndReturn(new SpawnRules(config)); }
  /** Constructs + wires a {@link Shaped} recipe. */
  shaped(config: ShapedConfig): Shaped { return this.addAndReturn(new Shaped(config)); }
  /** Constructs + wires a {@link Shapeless} recipe. */
  shapeless(config: ShapelessConfig): Shapeless { return this.addAndReturn(new Shapeless(config)); }
  /** Constructs + wires a {@link Furnace} recipe. */
  furnace(config: FurnaceConfig): Furnace { return this.addAndReturn(new Furnace(config)); }
  /** Constructs + wires a {@link BrewingMix} recipe. */
  brewingMix(config: BrewingMixConfig): BrewingMix { return this.addAndReturn(new BrewingMix(config)); }
  /** Constructs + wires a {@link BrewingContainer} recipe. */
  brewingContainer(config: BrewingContainerConfig): BrewingContainer { return this.addAndReturn(new BrewingContainer(config)); }
  /** Constructs + wires a {@link LootTable} at `path`. */
  loot(config: LootTableConfig, path: string): LootTable { return this.addAndReturn(new LootTable(config), path); }
  /** Constructs + wires a {@link TradeTable} at `path`. */
  trade(config: TradeTableConfig, path: string): TradeTable { return this.addAndReturn(new TradeTable(config), path); }
  /** Constructs + wires a {@link UiFile}. */
  ui(config: UiFileConfig): UiFile { return this.addAndReturn(new UiFile(config)); }

  private addAndReturn<T extends object>(instance: T, path?: string): T {
    if (path !== undefined) this.add(instance as Addable, path);
    else this.add(instance as Addable);
    return instance;
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -25`
Expected: 全部通过，含 `[ok] factories construct and auto-wire`

- [ ] **Step 5: Commit**

```bash
git add src/ModMain.ts test/smoke.test.ts
git commit -m "feat(routing): add ModMain factory methods (item/block/entity/recipe/loot/trade/ui)"
```

---

### Task 6: example 重写 + README + 版本 0.3.0 + CHANGELOG + 最终验证与推送

**Files:**
- Modify: `example/index.ts`（主路径使用 `define` + 工厂）
- Modify: `README.md`（特性列表、新增「🧩 统一接线」章节、项目结构加 `routing.ts`、Roadmap 勾选、测试数 57 → 62）
- Modify: `package.json` / `package-lock.json`（版本 0.3.0）
- Modify: `CHANGELOG.md`（0.3.0 段落）

**Interfaces:**
- Consumes: Task 1-5 全部产物
- Produces: 0.3.0 发布版本 + 文档

**步骤：**

- [ ] **Step 1: 重写 `example/index.ts` 主路径**

顶部 import 追加 `Shaped`、`LootTable`；把「Add items」段的两行接线替换为：

```ts
// ---- 统一接线：一个入口，自动路由 BP/RP ----
mod.define({
  items: [ruby, dagger, helmet, disc],
  recipes: [
    new Shaped({
      identifier: 'spawnmod:dagger_from_obsidian',
      pattern: [' O ', ' S '],
      key: { O: 'minecraft:obsidian', S: 'minecraft:stick' },
      result: { item: 'spawnmod:obsidian_dagger' },
    }),
  ],
  loot: [[
    new LootTable({
      pools: [{ entries: [{ type: 'item', name: 'minecraft:emerald', weight: 1 }] }],
    }),
    'loot_tables/demo',
  ]],
});
mod.resource.addRecordSound(disc, Buffer.from('OggS-demo-record-audio', 'utf8'));
```

删除 `mod.behavior?.addItems([ruby, dagger, helmet, disc]);` 与 `mod.resource.addItemTextures([...]);` 两行。

- [ ] **Step 2: 更新 README**

在「🧩 CLI 工具」章节之前插入新章节：

````markdown
## 🧩 统一接线（推荐）

从 0.3.0 起不再需要手动记住 BP/RP 归属：`mod.add(...)` 会按类型自动路由，
一个调用完成全部接线（物品 = BP 定义 + RP 贴图占位 + 动态模型 + 本地化名称；
方块 = BP + 地形纹理 + tile 名称；唱片 = 物品 + 声音定义；实体四件套各归其位）。

```ts
mod.add(ruby);                        // BP + RP 一次接完
mod.add([dagger, helmet, disc]);      // 数组批量
mod.add(chainsaw);                    // 自动含动态模型三文件
mod.define({
  items: [ruby, dagger],
  blocks: [lamp],
  entities: [goblinBp, goblinRp, goblinRc, goblinSpawn],
  recipes: [[sword, 'weapons']],
  loot: [[table, 'loot_tables/cave']],
});                                    // 声明式批量，返回 this
```

工厂方法：`mod.item({...})` / `mod.block({...})` / `mod.entityBP({...})` /
`mod.shaped({...})` / `mod.loot(config, path)` / `mod.ui({...})` 等，创建即接线。
LootTable/TradeTable 需显式路径（`[table, path]` 或 `mod.add(table, path)`）。
纯资源包模组添加 BP 侧模块会得到明确报错提示，不会静默漏接。
````

特性列表头部追加：

```md
- 🧩 **统一接线**：`mod.add()` / `mod.define()` 按类型自动路由 BP/RP + 工厂方法（0.3.0）
```

项目结构树 `src/` 下追加：

```md
│   ├── routing.ts      # 统一接线路由（add/define/工厂的底层分发）
```

Roadmap 追加一行：

```md
- [x] 统一接线 API（`mod.add` / `mod.define` / 工厂方法）
```

测试数：`grep -n '57' README.md` 定位并改为 62。

- [ ] **Step 3: 版本与 CHANGELOG**

```bash
npm version 0.3.0 --no-git-tag-version
```

`CHANGELOG.md` 顶部插入：

```md
## [0.3.0] - 2026-09-22

### Added

- 统一接线 API：`mod.add(...)` 按类型自动路由到行为包/资源包（物品、方块、实体四件套、
  配方、战利品表、交易表、JSON UI、RP 模块），支持嵌套数组与 `[table, path]` 元组
- `mod.define({...})` 声明式批量接线，返回 `this` 可链式
- 工厂方法：`mod.item` / `mod.block` / `mod.entityBP` / `mod.entityRP` /
  `mod.renderController` / `mod.spawnRules` / `mod.shaped` / `mod.shapeless` /
  `mod.furnace` / `mod.brewingMix` / `mod.brewingContainer` / `mod.loot` /
  `mod.trade` / `mod.ui`（创建即接线）
- `Resource.addItemName()`：物品显示名本地化（`item.<id>.name`，与 `addBlockName` 对称合并）
- 明确错误语义：不支持类型 / 纯 RP 模组接 BP 模块 / loot·trade 缺路径均抛出带提示的错误
- 冒烟测试 57 → 62；example 与 README 改为统一接线写法
```

- [ ] **Step 4: 全量验证**

Run: `npm test 2>&1 | tail -30`
Expected: 全部通过，末尾 `All SpawnModBE smoke tests passed.`
Run: `npm run build 2>&1 | tail -5 && node dist/cli.js --version`
Expected: build 无错误；输出 `0.3.0`

- [ ] **Step 5: 提交与推送**

```bash
git add -A
git commit -m "feat(routing): unified add/define + factories (0.3.0)

- mod.add routes generators to BP/RP by type; define() batches declaratively
- 14 factory methods construct-and-wire in one call
- Resource.addItemName; explicit error semantics; example/README rewritten
- version 0.2.0 -> 0.3.0; CHANGELOG; 57 -> 62 smoke tests"
git push origin main
```

## Self-Review（静态核对已完成）

- **Spec 覆盖**：3.1 类型（Task 2）、3.2 add 路由表（Task 2/3）、3.3 define（Task 4）、3.4 工厂（Task 5）、3.5 错误（Task 3）、3.6 addItemName（Task 1）、第 6 节文档/版本（Task 6）。
- **占位符扫描**：无 TBD /「加适当校验」类占位；每步含实际代码与命令。
- **类型一致性**：`Addable`/`DefineSpec`/`addEntries`/`routeEntry`/`pairLootPaths`/`humanize` 在 Task 2 定义并在后续任务原样复用；工厂返回类型与 `src/*/index.ts` 导出一致。
- **Review Focus 映射**：⑤ no-arg/空 define → Task 2/4；② no-sapi 报错 → Task 3；① 不支持类型 → Task 3；③ 缺路径 → Task 3；④ 重复 add 去重 → Task 2（Task 1 实现保证）。
