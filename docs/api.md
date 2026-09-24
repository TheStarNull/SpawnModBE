# SpawnModBE API 参考

- 版本：0.4.0
- 定位：面向使用者的**形式化 API 参考**，覆盖所有可从 `spawnmodbe` 包导入的公开符号。
- 与其它文档的关系：
  - [README.md](../README.md) 提供教程式讲解与完整示例（推荐入门先读）。
  - [unified-api-spec.md](./unified-api-spec.md) / [fx-modules-spec.md](./fx-modules-spec.md) 是设计规格，描述决策过程，不一定与最终 API 完全一致（**粒子实际归资源包**，见 [§11](#11-粒子--地物--群系--雾)，两处 spec 仍写作 BP）。

> 本文按「公开导出」组织：`src/index.ts` 列出的类、函数、常量、类型。签名以 TypeScript 为准，默认值在注释中说明。

---

## 目录

1. [安装与导入](#1-安装与导入)
2. [核心词条](#2-核心词条)
3. [统一接线](#3-统一接线)
4. [物品](#4-物品)
5. [方块](#5-方块)
6. [配方](#6-配方)
7. [战利品表](#7-战利品表)
8. [交易表](#8-交易表)
9. [实体](#9-实体)
10. [RP 模块](#10-rp-模块)
11. [粒子 / 地物 / 群系 / 雾](#11-粒子--地物--群系--雾)
12. [JSON UI](#12-json-ui)
13. [工具与库函数](#13-工具与库函数)
14. [配置与共享类型](#14-配置与共享类型)
15. [CLI](#15-cli)

---

## 1. 安装与导入

```bash
npm install spawnmodbe
```

```ts
import { ModMain, Behavior, Resource } from 'spawnmodbe';
import * as spawnmodbe from 'spawnmodbe';
```

包为 ESM（`"type": "module"`），入口 `dist/index.js`，类型 `dist/index.d.ts`。

---

## 2. 核心词条

### `ModMain` — 模组总入口

`ModMain` 组合一个资源包（`Resource`）与可选的行为包（`Behavior`），并负责打包为 `.mcpack` / `.mcaddon`。配置了 `sapi` 才会创建行为包。

**构造函数**

```ts
constructor(config: ModMainConfig);
constructor(name: string, description?: string, author?: string, version?: SemVer, minEngineVersion?: SemVer, sapi?: SapiConfig | string);
```

`config.name` 必填非空。

```ts
const mod = new ModMain({
  name: 'Spawn Mod',
  description: 'Spawns mobs.',
  author: 'Dev',
  version: [1, 0, 0],
  minEngineVersion: [1, 20, 70],
  sapi: 'scripts/main.js',
  uuid: { seed: 'spawn-mod' },
});
```

**实例属性**

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `config` | `ResolvedModMainConfig` | 已填默认值的配置 |
| `uuids` | `UuidPool` | 两包共用的 UUID 池 |
| `resource` | `Resource` | 资源包 |
| `behavior` | `Behavior \| null` | 行为包；无 `sapi` 时为 `null` |

**实例方法**

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `behaviorPackUuid` | `get: string` | 行为包头 UUID |
| `resourcePackUuid` | `get: string` | 资源包头 UUID |
| `folderName` | `get: string` | 消毒后的模组文件夹名 |
| `build()` | `() => ModBuildResult` | 生成两份 manifest 与配置 |
| `buildBehaviorPackManifest()` | `() => BehaviorPackManifest \| null` | 行为包 manifest |
| `buildResourcePackManifest()` | `() => ResourcePackManifest` | 资源包 manifest |
| `toString()` | `() => string` | 两份 manifest 的 JSON 字符串 |
| `writeTo(dir, options?)` | `async () => Promise<WriteToResult[]>` | 写盘 |
| `packBehaviorPack()` | `() => Buffer \| null` | `.mcpack` 缓冲 |
| `packResourcePack()` | `() => Buffer` | `.mcpack` 缓冲 |
| `toMcaddon()` | `() => Buffer` | 打包为 `.mcaddon` |
| `add(...entries)` | `(...) => this` | 统一接线 |
| `define(spec)` | `(spec: DefineSpec) => this` | 声明式批量接线 |
| 工厂方法（`item`/`block`/`entityBP`/…） | `(config) => 实例` | 创建即接线 |

**依赖方向**：资源包 manifest 依赖行为包（给出 BP 的 `uuid` + 版本元组）；行为包不依赖资源包，避免循环。

### `Behavior` — 行为包

```ts
constructor(config: BehaviorPackConfig);
```

`BehaviorPackConfig` 在 `PackConfig` 基础上增加可选 `script`（`SapiConfig | string`）。

**实例属性**：`config` / `uuids` / `uuid` / `sapi` / `folderName` / `dataModuleUuid` / `scriptModuleUuid` / `hasScript`。

**实例方法**（均返回写入的包内路径 `string`，除 `addItems`/`addRecipes` 返回 `string[]`）

| 方法 | 说明 |
| --- | --- |
| `addItem(item)` / `addItems(items)` | 写 `items/<短名>.json` |
| `addRecipe(recipe, subPath?)` / `addRecipes(entries)` | 写 `recipes/<...>.json` |
| `addLootTable(table, path)` | 战利品表（缺省置于 `loot_tables/`） |
| `addTradeTable(table, path)` | 交易表（缺省置于 `trading/`） |
| `addEntity(entity)` | 写 `entities/<短名>.json` |
| `addSpawnRules(rules)` | 写 `spawn_rules/<短名>.json` |
| `addBlock(block)` | 写 `blocks/<短名>.json` |
| `addFeature(feature)` | 写 `features/<短名>.json` |
| `addFeatureRule(rule)` | 写 `feature_rules/<短名>.json` |
| `addBiome(biome)` | 写 `biomes/<短名>.json` |
| `buildManifest(options?)` | 构建 manifest，自动加脚本依赖 |
| `toString()` | manifest 的 JSON 字符串 |

`Behavior` 继承 `PackBase`。当传入 `subPath` 时，配方会写入该子目录。

### `Resource` — 资源包

```ts
constructor(config: ResourcePackConfig);
```

`ResourcePackConfig` 即 `PackConfig`。

**实例访问器**：`config` / `uuids` / `uuid` / `moduleUuid` / `folderName`。

**实例方法**

| 方法 | 说明 |
| --- | --- |
| `addItemTexture(item, options?)` | 注册贴图到 `item_texture.json`，无贴图时生成占位 PNG |
| `addItemTextures(items, options?)` | 批量，返回 `string[]` |
| `addItemAssets(item, options?)` | 一键贴图 + 动态模型（若有），返回 `string[]` |
| `addItemsAssets(items, options?)` | 批量 |
| `addSound(soundId, soundPath, options?, audioData?)` | 注册音效事件 + 可选 OGG |
| `addRecordSound(disc, audioData?)` | 唱片音效（流式、0.5 音量、64 格距离） |
| `addClientEntity(entity)` | 写 `entity/<短名>.entity.json` |
| `addRenderController(controller)` | 写 `render_controllers/<短名>.rc.json` |
| `addLang(lang)` | 写 `texts/<locale>.lang`，合并已有条目 |
| `addUiFile(ui)` / `addUiFiles(files)` | 写 UI 文件并登记到 `ui/_ui_defs.json` |
| `createUiDefs(defs)` | 覆写 `ui/_ui_defs.json` |
| `addGlobalVariables(vars)` | 写 `ui/_global_variables.json` |
| `addBlockTexture(block, options?)` | 注册方块贴图到 `terrain_texture.json` |
| `addBlockName(block, name, options?)` | 写 `tile.<id>.name` |
| `addItemName(item, name?, options?)` | 写 `item.<id>.name`，`name` 省略时回退物品短名 |
| `addFlipbookTexture(flip)` / `addFlipbookTextures(flips)` | 追加 `flipbook_textures.json` |
| `addFog(fog)` | 写 `fogs/<短名>.json` |
| `addParticle(particle)` | 写 `particles/<短名>.json`（**资源包侧**） |
| `addItemTextureAtlas(atlas)` | 覆写 `item_texture.json` |
| `addAttachable(attachable)` | 写 `attachables/<短名>.json` |
| `applySoundBatch(batch, audioDataMap?)` | 批量注册音效，返回 `string[]` |
| `addDynamicItemModel(model)` | 写 attachable/geometry/animation 三件套 |
| `addFrameSequence(sequence)` | 写 render controller |
| `addFrameTextures(sequence, options?)` | 注册帧贴图到 `item_texture.json` |
| `buildManifest(options?)` | 构建资源包 manifest |
| `toString()` | manifest 的 JSON 字符串 |

`Resource` 同样继承 `PackBase`。

---

## 3. 统一接线

### 相关类型

```ts
type Addable =
  | Item | Block
  | EntityBP | EntityRP | RenderController | SpawnRules
  | Recipe | LootTable | TradeTable
  | UiFile | UiDefs | UiGlobalVariables
  | LangFile | ItemTextureAtlas | Attachable | SoundBatch
  | DynamicItemModel | FrameSequence | FlipbookTextures
  | [Recipe, string?] | [LootTable, string] | [TradeTable, string]
  | Addable[];

interface DefineSpec {
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
```

### `ModMain.add(...entries)`

接受任意个参数（实例 / `[实例, 路径]` 元组 / 嵌套数组），按类型自动路由到正确的包一侧并返回 `this` 供链式。需要显式路径的只有配方（可选子目录）、战利品表和交易表。

```ts
mod.add(
  new Item({ identifier: 'mymod:ruby', name: 'Ruby', texturePath: 'textures/items/ruby' }),
  new Block({ identifier: 'wiki:lamp' }),
  [swordRecipe, 'weapons'],
  [lootTable, 'loot_tables/cave'],
);
```

**路由行为**：

| 输入 | 行为包侧 | 资源包侧 |
| --- | --- | --- |
| `Item` 系 | `addItem` | `addItemAssets` + `addItemName` |
| `RecordDisc` | `addItem` | `addItemAssets` + `addItemName` + `addRecordSound` |
| `Block` | `addBlock` | `addBlockTexture` + `addBlockName` |
| `EntityBP` | `addEntity` | — |
| `SpawnRules` | `addSpawnRules` | — |
| `EntityRP` | — | `addClientEntity` |
| `RenderController` | — | `addRenderController` |
| `Recipe` | `addRecipe` | — |
| `LootTable` / `TradeTable` | `addLootTable` / `addTradeTable` | — |
| `UiFile` / `UiDefs` / `UiGlobalVariables` | — | `addUiFile` / `createUiDefs` / `addGlobalVariables` |
| `LangFile` / `ItemTextureAtlas` / `Attachable` / `SoundBatch` / `DynamicItemModel` / `FrameSequence` / `FlipbookTextures` | — | 对应 `addXxx` |
| `Particle` | — | `addParticle` |
| `Feature` / `FeatureRule` / `Biome` | `addFeature` / `addFeatureRule` / `addBiome` | — |
| `Fog` | — | `addFog` |

### `ModMain.define(spec)`

声明式批量接线，返回 `this`。`loot` / `trades` / `recipes` 可传 `[实例, 路径]` 元组。

```ts
mod.define({
  items: [ruby, sword],
  blocks: [lamp],
  entities: [goblinBP, goblinRP],
  recipes: [[swordRecipe, 'weapons']],
  loot: [[table, 'loot_tables/cave']],
  trades: [[trades, 'trading/trader']],
  ui: [screen],
  particles: [spark],
  features: [ore],
  featureRules: [oreRule],
  biomes: [plains],
  rp: [atlas, attachable],
});
```

### 工厂方法

`ModMain` 提供创建即接线的工厂，返回构造出的实例供继续链式配置：`item` / `block` / `entityBP` / `entityRP` / `renderController` / `spawnRules` / `shaped` / `shapeless` / `furnace` / `brewingMix` / `brewingContainer` / `loot(config, path)` / `trade(config, path)` / `ui` / `particle` / `feature` / `featureRule` / `biome` / `fog`。

---

## 4. 物品

### `Item`

通用物品基类，生成 `items/<短名>.json` 并（可）注册资源包贴图。

```ts
constructor(config: ItemConfig);
```

**核心字段 `ItemConfig`**

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `identifier` | `string` | 必填 | 小写 `namespace:name` |
| `name` | `string?` | 短名 | 游戏内显示名 |
| `description` | `string?` | — | 描述 |
| `category` | `ItemCategory` | `'items'` | 创意分类 |
| `rarity` | `ItemRarity` | `'common'` | 稀有度 |
| `iconTexture` | `string?` | 短名 | 图标纹理名 |
| `texturePath` | `string?` | — | 纹理路径（无 `.png`），提供则自动注册占位 PNG |
| `maxStackSize` | `number` | `64` | 最大堆叠 |
| `glint` | `boolean?` | — | 附魔光泽 |
| `allowOffHand` / `canDestroyInCreative` / `handEquipped` / `liquidClipped` | `boolean?` | — | 各类开关 |
| `tags` | `string[]?` | — | 应用 `minecraft:tags` |
| `fuelDuration` | `number?` | — | 燃烧时长（秒） |
| `cooldown` | `{category, duration, type?}` | — | 冷却 |
| `compostingChance` | `number?` | — | 堆肥概率（0-100） |
| `food` | `FoodComponentConfig?` | — | 食物 |
| `useAnimation` | `UseAnimation?` | — | 使用动画 |
| `useModifiers` | `{useDuration, ...}` | — | 使用修饰 |
| `throwable` / `projectile` | 各配置 | — | 投掷 / 抛射物 |
| `durabilitySensor` | `DurabilityThresholdSpec[]?` | — | 耐久阈值 |
| `dyeableDefaultColor` / `shouldDespawn` / `stackedByData` / `swingDuration` / `swingSounds` | 各配置 | — | 各类组件 |
| `components` | `Record<string, unknown>?` | — | 额外组件，合并并覆盖默认值 |
| `formatVersion` | `string` | `'1.26.0'` | 生成文件版本 |
| `dynamicModel` | `DynamicItemModelConfig?` | — | 3D 动态模型 |

**实例 getter**：`identifier` / `shortName` / `displayName` / `iconTexture` / `textureMapping` / `hasDynamicModel` / `dynamicModel`。

**实例方法**：`setName` / `setDescription` / `setCategory` / `setRarity` / `setMaxStackSize` / `setTags` / `setFuelDuration` / `setComponent(name, value)` / `addComponent(name, value)` / `buildBehaviorJson()`。标识符用 `/^[a-z0-9_]+:[a-z0-9_]+$/` 校验，大写被拒绝。

### 子类

各子类在 `ItemConfig` 上追加字段并重写 `components()`：

- **`Tools`**（工具/武器）：`maxDurability`、`damage`、`enchantableSlot`、`enchantableValue`、`destroySpeeds`、`useEfficiency`、`repairItems`、`handEquipped`（默认 `true`）。有耐久但未给 `destroySpeeds` 时自动生成默认挖掘速度。总是写入 `minecraft:damage`（1.26.0+ 组件）。
- **`Armor`**（护甲）：`slot`（默认 `slot.armor.chest`）、`protection`（默认 1）、`maxDurability`、`enchantableSlot`、`enchantableValue`（默认 10）、`hidePlayerLocation`、`absorbedCauses`（默认 `['all']`）、`repairItems`。强制 `max_stack_size=1`。
- **`Food`**（食物）：`nutrition`、`saturationModifier`、`canAlwaysEat`、`usingConvertsTo`、`eatDuration`（默认 1.6）、`drinkInsteadOfEat`、`movementModifier`（默认 0.4）。
- **`Fuel`**（燃料）：`duration`。
- **`Throwable`**（投掷/射手）：`projectileEntity`（必填）、`minimumCriticalPower`、`doSwingAnimation`、`minDrawDuration`、`maxDrawDuration`、`launchPowerScale`、`maxLaunchPower`、`scalePowerByDrawDuration`、`ammunition`、`chargeOnDraw`、`useDuration`。
- **`BlockPlacer`**（放方块物品）：`block`（必填）、`replaceBlockItem`、`alignedPlacement`、`canPlaceOn`。
- **`EntityPlacer`**（放置实体/生成蛋）：`entity`（必填）、`canPlaceOn`、`canDispenseOn`。
- **`RecordDisc`**（唱片）：`comparatorSignal`、`duration`（默认 5）、`soundEvent`（必填）、`soundPath`。`soundEvent` 必须是 vanilla 音效事件（如 `record.cat` / `record.13`）——`minecraft:record.sound_event` 绑定 `LevelSoundEvent` 枚举，自定义音效名会被游戏拒绝。如通过 `Resource.addRecordSound` 注册自定义音频，需同时提供 `soundPath`，且注意覆盖同名 vanilla 音效的影响。

### `itemShortName(identifier)`

```ts
function itemShortName(identifier: string): string;
```

去掉 `namespace:` 前缀，返回短名。

---

## 5. 方块

### `Block`

生成 `blocks/<短名>.json`。方块没有独立 RP 定义，视觉通过 `minecraft:geometry` + `minecraft:material_instances` + `terrain_texture.json` 接线。

```ts
constructor(config: BlockConfig);
```

**核心字段**：`identifier`（必填）、`category`（默认 `'construction'`）、`group`、`isHiddenInCommands`、`components`、`states`、`traits`、`permutations`、`formatVersion`（默认 `'1.26.50'`）。

**实例 getter**：`identifier` / `shortName` / `fileName` / `textureName` / `renderTextureName`（读取 `material_instances['*'].texture`，供 `addBlockTexture` 对齐）。

**实例方法**：`setCategory` / `setGroup` / `setComponent` / `setLoot` / `addPermutation` / `addState` / `addTrait` / `buildJson`。

```ts
const lamp = new Block({
  identifier: 'wiki:lamp',
  category: 'items',
  components: {
    'minecraft:light_emission': 15,
    'minecraft:geometry': 'minecraft:geometry.full_block',
    'minecraft:material_instances': { '*': { texture: 'wiki:lamp' } },
  },
});
```

`setLoot(path)` 会把 `minecraft:loot` 设为 `<path>.json`（若未以 `.json` 结尾则补全）。

---

## 6. 配方

### `Recipe`（基类）

```ts
constructor(config: RecipeConfig, schemaKey: string);
```

`RecipeConfig` 含 `identifier`（必填）、`tags`（至少 1 个）、`group`、`unlock`、`priority`、`formatVersion`（默认 `'1.17.41'`）。公共 getter：`identifier` / `fileName`；方法：`buildJson()`。

### 子类

| 类 | 构造字段 | schema 键 |
| --- | --- | --- |
| `Shaped` | `pattern`（≤3×3）、`key`、`result` | `minecraft:recipe_shaped` |
| `Shapeless` | `ingredients`、`result` | `minecraft:recipe_shapeless` |
| `Furnace` | `input`、`output` | `minecraft:recipe_furnace` |
| `BrewingMix` | `input`、`reagent`、`output` | `minecraft:recipe_brewing_mix` |
| `BrewingContainer` | `input`、`reagent`、`output`（`input` 需为药水类型） | `minecraft:recipe_brewing_container` |

```ts
const sword = new Shaped({
  identifier: 'mymod:ruby_sword',
  tags: ['crafting_table'],
  pattern: ['X', 'X', 'I'],
  key: { X: 'mymod:ruby', I: 'minecraft:stick' },
  result: 'mymod:ruby_sword',
});
```

---

## 7. 战利品表

### `LootTable`

```ts
constructor(config: LootTableConfig);
```

`pools` 为池数组（必填），池类型为 `WeightedLootPool | TieredLootPool`。方法：`buildJson()`（返回 `{ pools }`）。

### 辅助函数

| 函数 | 说明 |
| --- | --- |
| `setCount(count)` | `set_count` 函数（`count` 为数字或 `{min,max}`） |
| `setName(name)` | `set_name` 函数 |
| `killedByPlayer()` | `killed_by_player` 条件 |
| `randomChanceWithLooting(chance, lootingMultiplier)` | 掠夺加成随机条件 |

```ts
const table = new LootTable({
  pools: [{
    rolls: { min: 2, max: 4 },
    entries: [
      { type: 'item', name: 'minecraft:golden_apple', weight: 20 },
      { type: 'item', name: 'minecraft:name_tag', weight: 30 },
    ],
  }],
});
```

---

## 8. 交易表

### `TradeTable`

```ts
constructor(config: TradeTableConfig);
```

`tiers` 为层级数组（必填）。方法：`buildJson()`。

### 辅助函数

| 函数 | 说明 |
| --- | --- |
| `enchantWithLevels(levels, treasure = false)` | `enchant_with_levels` 函数 |
| `enchantBookForTrading(options?)` | `enchant_book_for_trading` 函数（`baseCost` / `baseRandomCost` / `perLevelCost` / `perLevelRandomCost`） |

```ts
const minister = new TradeTable({
  tiers: [
    { groups: [{ numToSelect: 1, trades: [
      { wants: [{ item: 'minecraft:emerald' }], gives: [{ item: 'wiki:aeleon_jewels' }] },
    ] }] },
  ],
});
```

---

## 9. 实体

### `EntityBP` — 行为包实体

```ts
constructor(config: EntityBPConfig);
```

字段：`identifier`（必填）、`isSpawnable`（默认 `true`）、`isSummonable`（默认 `true`）、`isExperimental`、`components`、`componentGroups`、`events`、`formatVersion`（默认 `'1.19.40'`）。方法：`setSpawnable` / `setSummonable` / `setExperimental` / `setComponent` / `addComponentGroup` / `addEvent` / `buildJson`。

### `EntityRP` — 资源包（客户端）实体

```ts
constructor(config: EntityRPConfig);
```

字段：`identifier`、`materials`、`textures`、`geometry`、`renderControllers`、`animations`、`animationControllers`、`scripts`、`soundEffects`、`particleEffects`、`spawnEgg`、`enableAttachables`（默认 `true`）、`hideArmor`、`formatVersion`（默认 `'1.10.0'`）。方法：`buildJson()`。

### `RenderController` — 渲染控制器

```ts
constructor(config: RenderControllerConfig);
```

字段：`id`（必填）、`geometry`（必填）、`materials`（≥1）、`textures`（≥1）、`partVisibility`、`color`、`formatVersion`（默认 `'1.10.0'`）。方法：`buildJson()`。`fileName` 取 `id` 最后一个 `.` 后的部分。

### `SpawnRules` — 生成规则

```ts
constructor(config: SpawnRulesConfig);
```

字段：`identifier`（必填）、`populationControl`、`conditions`（≥1）、`formatVersion`（默认 `'1.8.0'`）。`condition` 支持 `weight`、`herd`、`spawnsOnSurface`、`spawnsUnderground`、`spawnsUnderwater`、`brightness`、`difficulty`、`distance`、`height`、`biomeFilter`、`spawnsAboveBlock`、`spawnsOnBlock`、`spawnsOnBlockPrevented`、`densityLimit`、`permuteType`、`spawnsLava`。方法：`buildJson()`。

---

## 10. RP 模块

### `LangFile`

```ts
constructor(config?: LangFileConfig);
```

`locale`（默认 `en_US`）、`entries`（`LangEntry | [key, value]`）。方法：`set` / `setAll` / `get` / `remove` / `load` / `setItemName` / `setEntityName` / `setSpawnEggName` / `setRecordDesc` / `setInteract` / `toString` / `filePath`。`toString()` 按 key 排序输出。

### `ItemTextureAtlas`

```ts
constructor(config?: ItemTextureAtlasConfig);
```

`resourcePackName`（默认 `my_pack`）、`textureName`（默认 `atlas.items`）、`entries`。方法：`set` / `setAll` / `get` / `remove` / `buildJson` / `toString`。

### `Attachable`

```ts
constructor(config: AttachableConfig);
```

字段：`identifier`（必填）、`materials`、`textures`、`geometry`、`animations`、`initialize`、`preAnimation`、`scriptsAnimate`、`renderControllers`、`formatVersion`（默认 `'1.10.0'`）。方法：`buildJson()`。

### `SoundBatch`

```ts
constructor(config: SoundBatchConfig);
```

`sounds`（≥1）。方法：`toAddSoundCalls()`，返回数组供 `Resource.applySoundBatch` 使用。

### `DynamicItemModel`

```ts
constructor(config: DynamicItemModelConfig);
```

需要 `bones`（≥1）与 `identifier`（或由 `Item.dynamicModel` 注入）。字段：`geometry`、`texture`、`material`、`enchantedMaterial`、`animations`、`animateWhen`、`renderControllers`（默认 `['controller.render.item_default']`）、`geometryFormatVersion`（默认 `1.16.0`）、`formatVersion`（默认 `1.10.0`）、`animationLength`（默认 1）。方法：`buildAttachableJson` / `buildGeometryJson` / `buildAnimationJson` / `buildFiles`。

### `FrameSequence`

```ts
constructor(config: FrameSequenceConfig);
```

`controllerId`（必填）、`geometry`（必填）、`material`、`materialBinding`、`arrayName`、`sampleExpression`、`frameTextures`（≥1）、`frameTexturePaths`、`formatVersion`。方法：`buildRenderControllerJson` / `buildTexturesMap` / `buildFrames`。

### `FlipbookTextures`

```ts
constructor(config: FlipbookTexturesConfig);
```

`atlasTile`、`flipbookTexture`（均必填）、`atlasIndex`、`atlasTileVariant`、`ticksPerFrame`（默认 10）、`frames`、`replicate`、`blendFrames`（默认 `true`）。方法：`buildJson()`。

---

## 11. 粒子 / 地物 / 群系 / 雾

### `Particle`

```ts
constructor(config: ParticleConfig);
```

字段：`identifier`（必填）、`texture`（默认 `textures/particle/particles`）、`material`（默认 `particles_alpha`）、`components`、`formatVersion`（默认 `1.10.0`）。方法：`buildJson()`。

> **粒子归属资源包**：粒子是客户端定义，位于 `RP/particles/`，由 `Resource.addParticle` / `mod.add`（`Particle` 走 RP）接线。早期设计规格 `fx-modules-spec.md` 写作行为包（BP）属过时描述，以代码与本文件为准。

**辅助函数**：`emitterRateInstant` / `emitterRateSteady` / `emitterLifetimeOnce` / `emitterLifetimeLooping` / `emitterShapePoint` / `emitterShapeSphere` / `particleLifetime` / `billboard` / `tint`。

### `Feature` / 辅助

```ts
constructor(config: FeatureConfig);
```

`identifier`（必填）、`type`（必填，如 `minecraft:ore_feature`）、`body`、`formatVersion`（默认 `1.13.0`）。方法：`buildJson()`。辅助：`oreFeature({identifier, count, replaceRules, formatVersion?})` 与 `singleBlockFeature({identifier, placesBlock, mayReplace?, formatVersion?})`。

### `FeatureRule`

```ts
constructor(config: FeatureRuleConfig);
```

`identifier`（必填）、`placesFeature`（必填）、`placementPass`（默认 `surface_pass`）、`biomeFilter`、`distribution`（迭代次数等）、`formatVersion`（默认 `1.13.0`）。方法：`buildJson()`。

### `Biome` / 辅助

```ts
constructor(config: BiomeConfig);
```

`identifier`（必填）、`components`、`formatVersion`（默认 `1.13.0`）。方法：`buildJson()`。辅助：`climate(temperature, downfall, options?)` / `surfaceParameters({top, mid, sea, foundation})` / `biomeTags(...tags)`。

### `Fog`

```ts
constructor(config: FogConfig);
```

`identifier`（必填）、`distance`（`air`/`water`/`lava` 各层）、`volumetric`、`formatVersion`（默认 `1.16.100`）。方法：`buildJson()`。每个距离层 `render_distance_type` 默认 `fixed`。

---

## 12. JSON UI

### `UiFile`

```ts
constructor(config: UiFileConfig);
```

`fileName`（必填）、`namespace`（必填）、`elements`（必填）。方法：`path` / `uiDefPath` / `buildJson` / `toString`。构建时会收集容器 `controls` 中的 OO 子元素并把 `controls` 规范化为 `{ "ref": {} }` 形式。

### `UiDefs`

```ts
constructor(config: UiDefsConfig);
```

`defs` 数组。方法：`add` / `buildJson` / `toString` / `path`。

### `UiGlobalVariables`

```ts
constructor(config: UiGlobalVariablesConfig);
```

`variables` 对象。方法：`set` / `buildJson` / `toString` / `path`。

### `UiElement` 与子类

基类 `UiElement` 构造器 `(type: UiElementType, options: UiElementOptions)` 要求 `options.name` 非空。提供链式 set：`setSize` / `setOffset` / `setAnchor` / `setAlpha` / `setLayer` / `setVisible` / `setEnabled` / `setVariable` / `addAnim` / `setExtra` / `setNamespace` / `addBinding` / `setBindings` / `setProperty` / `build` / `ref` / `static controlToEntry`。

| 类 | type | 关键字段 |
| --- | --- | --- |
| `UiLabel` | `label` | `text` / `color` / `localize` |
| `UiImage` | `image` | `texture`（必填）/ `tiled` / `uv` / `uvSize` / `nineSlice` / `nineSliceSize` |
| `UiButton` | `button` | `text` / `texture` / `focus` |
| `UiPanel` | `panel` | `texture` / `clip`（→`clips_children`） |
| `UiStackPanel` | `stack_panel` | `orientation`（默认 `vertical`） |
| `UiGrid` | `grid` | `dimensions` / `gridDimensions` |
| `UiScreen` | `screen` | 容器 |
| `UiCollectionPanel` | `collection_panel` | 容器 |
| `UiInputPanel` | `input_panel` | `modal` / `alwaysListenToInput` / `hoverEnabled` |
| `UiToggle` | `toggle` | `toggleName` / `defaultState` / `groupForcedIndex` / `groupDefaultSelected` / `checkedControl` / `uncheckedControl` |
| `UiDropdown` | `dropdown` | `dropdownName` / `contentControl` / `area` |
| `UiSlider` | `slider` | `sliderName` / `steps` / `direction` / `boxControl` / `backgroundControl` / `progressControl` |
| `UiSliderBox` | `slider_box` | `defaultControl` / `hoverControl` / `lockedControl` |
| `UiEditBox` | `edit_box` | `textBoxName` / `maxLength` / `textType` / `enabledNewline` / `textControl` / `placeholderControl` |
| `UiSelectionWheel` | `selection_wheel` | 传入的未识别选项透传 |
| `UiScrollView` | `scroll_view` | `scrollSpeed` / `alwaysHandleScrolling` / `scrollContent` / `scrollViewPort` / `scrollbarBox` / `scrollbarTrack` |
| `UiScrollbarTrack` | `scrollbar_track` | `trackButton` |
| `UiScrollbarBox` | `scrollbar_box` | `touchButton` |
| `UiFactory` | `factory` | `factoryName`（→`name`）/ `controlId`（→`control_ids`） |
| `UiCustom` | `custom` | `renderer` |

---

## 13. 工具与库函数

### `PackBase`（抽象基类，`Behavior` / `Resource` 继承）

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `addFile(path, data)` | `(string, Buffer \| string) => void` | 写文件，覆盖已有；拒绝 `manifest.json` |
| `addNewFile(path, data, label)` | `(string, Buffer \| string, string) => void` | 不同内容则抛错（防命名冲突）；相同内容幂等 |
| `addFiles(entries)` | `(...) => void` | 批量（`PackFile` 或 `[path, data]`） |
| `addDirectory(src, options?)` | `async () => Promise<AddDirectoryResult>` | 递归复制目录，支持 `prefix` / `ignore` |
| `setIcon(data?)` | `(Buffer?) => void` | 设置图标，缺省用默认图标 |
| `hasFile(path)` / `getFile(path)` / `removeFile(path)` | — | 文件查询 / 读取 / 删除 |
| `listFilesPublic()` | `() => PackEntry[]` | 全部条目（manifest + icon + 文件） |
| `writeTo(dir, options?)` | `async () => Promise<WriteToResult>` | 写盘，`overwrite` 默认 `true` |
| `pack()` | `() => Buffer` | 生成 `.mcpack` |
| `fileCount` | `get: number` | 条目数 |

### `uuid` 模块

`UUID_ROLES` / `UuidPool(seed, explicit?)`（`get(role)` / `toObject()`）/ `deriveUuid(seedText)` / `generateUuid()` / `isValidUuid(value)`。

### `zip` 模块

`createZip(entries)` / `buildZip(files)`。

### `util` 模块

`crc32(buf)` / `normalizeZipPath(p)` / `sanitizeFileName(name)`。

### `assets` 模块

`buildIconPng(size, color)` / `DEFAULT_PACK_ICON` / `EMPTY_PACK_ICON`。

---

## 14. 配置与共享类型

来自 `types.ts`。

```ts
type SemVer = [major, minor, patch];
type GameVersion = SemVer;
type ScriptLanguage = 'javascript' | 'typescript';
type ManifestModuleType = 'resources' | 'data' | 'script';
type UuidRole = 'resourcePackHeader' | 'resourcePackModule' | 'behaviorPackHeader' | 'behaviorPackDataModule' | 'behaviorPackScriptModule';
```

### 配置对象

```ts
interface PackConfig {
  name: string;
  description?: string;
  author?: string;
  version?: SemVer;             // [1,0,0]
  minEngineVersion?: GameVersion; // [1,20,70]
  uuid?: UuidConfig;
}
interface ResourcePackConfig extends PackConfig {}
interface BehaviorPackConfig extends PackConfig { script?: SapiConfig | string; }
interface ModMainConfig {
  name: string;
  description?: string;
  author?: string;
  version?: SemVer;
  minEngineVersion?: GameVersion;
  sapi?: SapiConfig | string;
  uuid?: UuidConfig;
}
interface SapiConfig { entry: string; language?: ScriptLanguage; runtimeVersion?: string; }
interface UuidConfig { seed: string; explicit?: Partial<Record<UuidRole, string>>; }
```

### Manifest 相关

```ts
type ManifestModule = { type; uuid; version; description?; entry?; language? };
type ManifestDependency = { uuid?; version: SemVer | string; module_name? };
type ManifestHeader = { name; description; uuid; version; min_engine_version; author? };
type PackManifest = { format_version: 2; header; modules; dependencies? };
type BehaviorPackManifest = PackManifest;
type ResourcePackManifest = PackManifest;
```

> 依赖对象两种互斥形式：打包依赖 `{ uuid, version: [x,y,z] }`，或模块依赖 `{ module_name, version: "x.y.z" }`。不要把两者混在一个对象里。

### 结果 / 选项

```ts
type ModBuildResult = { behaviorPack: BehaviorPackManifest | null; resourcePack: ResourcePackManifest; config: ResolvedModMainConfig; behavior: Behavior | null; resource: Resource; };
type WriteToOptions = { overwrite?: boolean };
type WriteToResult = { directory: string; filesWritten: number; files: string[] };
type AddDirectoryOptions = { prefix?: string; ignore?: string[] };
type AddDirectoryResult = { added: number; skipped: number; errors: number; addedFiles: string[]; errorMessages: Record<string, string> };
type PackFile = { path: string; data: Buffer };
type AddSoundOptions = { maxDistance?; stream?; volume?; pitch?; loadOnLowMemory? };
type SoundDefinition = { name: string; stream?; volume?; pitch?; loadOnLowMemory? };
type SoundEventDefinition = { maxDistance?; sounds: SoundDefinition[] };
```

---

## 15. CLI

```bash
spawnmodbe init [<dir>] [options]
spawnmodbe --version
spawnmodbe --help
```

`init` 脚手架一个 TypeScript 工程（`package.json` / `tsconfig.json` / `src/index.ts` / `README.md` / `.gitignore`），随后（未传 `--no-install` 时）执行 `npm install`。

| 参数 | 说明 |
| --- | --- |
| `--name <n>` | 模组显示名（默认取目录名） |
| `--description <d>` | 描述 |
| `--author <a>` | 作者 |
| `--no-sapi` | 纯资源包工程 |
| `--force` | 在非空目录覆盖脚手架文件 |
| `--no-install` | 跳过 `npm install` |

---

## 附：常见陷阱

- **粒子归资源包**：`mod.add(new Particle(...))` 写入 `RP/particles/`，不是行为包。`fx-modules-spec.md` 写作 BP 属过时描述。
- **显示名缺省**：物品不传 `name` 时显示名回退为物品短名（语言文件不会写 `undefined`）。
- **图标缺省**：物品不传 `texturePath` 时，框架为裸短名图标生成占位 PNG 并注册到 `item_texture.json`；带命名空间的图标（如 `minecraft:diamond`）交给其它包解析。
- **命名冲突**：`addNewFile` 拒绝同路径不同内容的第二次写入；跨命名空间共用短名会抛错。
- **依赖方向**：资源包依赖行为包；行为包不依赖资源包。
