# SpawnModBE 统一接线 API — 设计规格

- 状态：**待评审**（评审通过后才进入实施计划）
- 目标版本：0.3.0
- 范围：统一入口 `mod.add` / `mod.define` + 工厂方法（方案 A + 工厂）

---

## 1. 背景与目标

现状：每个生成器都要用户**记住归属**并分别接线。一个物品需要
`mod.behavior.addItem(...)` + `mod.resource.addItemTextures(...)`（带动态模型还要
`addItemAssets`）；方块、实体（BP/RP/RC/SpawnRules 四件）、唱片（物品 + 声音 + 音频）
同理。模块之间的“关联”全靠人肉维护，容易漏接、接错侧。

目标：

1. **相互链接**：`mod.add(任意生成器)` 自动按类型路由到行为包/资源包的正确一侧，
   一个调用完成全部接线。
2. **简洁明了**：新增 `mod.define({...})` 声明式批量接线与工厂方法（创建即接线），
   example 的主路径从“记住 8 行接线”压缩为 1 行。
3. **完全向后兼容**：现有的 `behavior.addXxx()` / `resource.addYyy()` 全部保留，
   语义不变；本改动只做加法，不删不改旧 API。

## 2. 范围

做：

- `ModMain.add(...entries): this`（含数组展开、`[实例, 路径]` 元组）
- `ModMain.define(spec): this`（声明式批量；分组清晰、返回 `this` 可链式）
- 工厂方法：`item` / `block` / `entityBP` / `entityRP` / `renderController` /
  `spawnRules` / `shaped` / `shapeless` / `furnace` / `brewingMix` /
  `brewingContainer` / `loot` / `trade` / `ui`
- 新增 `Resource.addItemName(item, name?, { locale? })`（与 `addBlockName` 对称）
- 类型导出：`Addable`、`DefineSpec`

不做（本版本）：

- 构造器注入（`new ModMain({ ..., items: [...] })`）——先看 `define` 的使用效果
- 合并 EntityBP/EntityRP 成组合类——保持现有类正交
- 删除或重命名任何现有方法

## 3. API 设计

### 3.1 类型

```ts
/** 可被 mod.add() 接受的一切：生成器实例、[实例, 路径] 元组、或它们的数组（可嵌套）。 */
export type Addable =
  // 物品（含全部子类）、方块
  | Item | Block
  // 实体四件套
  | EntityBP | EntityRP | RenderController | SpawnRules
  // 配方 / 战利品表 / 交易表
  | Recipe | LootTable | TradeTable
  // JSON UI
  | UiFile | UiDefs | UiGlobalVariables
  // RP 模块
  | LangFile | ItemTextureAtlas | Attachable | SoundBatch
  | DynamicItemModel | FrameSequence | FlipbookTextures
  // 需要显式路径的：[实例, 路径]
  | [Recipe, string?] | [LootTable, string] | [TradeTable, string]
  // 嵌套数组
  | Addable[];

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
```

### 3.2 `ModMain.add(...entries)`

`add` 接受任意个参数（实例 / 元组 / 嵌套数组），按类型自动路由；整体执行完毕后
返回 `this`，可继续链式调用。

| 输入 | 行为包侧 | 资源包侧 | 说明 |
| --- | --- | --- | --- |
| Item 系（Item/Tools/Armor/Food/Fuel/Throwable/BlockPlacer/EntityPlacer/RecordDisc） | `addItem` | `addItemAssets` + `addItemName` | `addItemAssets` 已含贴图占位；有 `dynamicModel` 时自动写三文件；`addItemName` 写 `item.<id>.name` 本地化 |
| RecordDisc（额外） | — | `addRecordSound` | 自动注册唱片声音定义（无音频字节时仅注册定义） |
| Block | `addBlock` | `addBlockTexture` + `addBlockName` | 占位纹理 + `tile.<id>.name` 本地化 |
| EntityBP | `addEntity` | — | |
| EntityRP | — | `addClientEntity` | |
| RenderController | — | `addRenderController` | |
| SpawnRules | `addSpawnRules` | — | |
| Recipe 系 | `addRecipe(recipe, subPath?)` | — | 元组 `[recipe, 'crafting/weapons']` 可传子目录 |
| LootTable | `addLootTable(table, path)` | — | **路径必填**（无 identifier 可推导） |
| TradeTable | `addTradeTable(table, path)` | — | **路径必填** |
| UiFile / UiDefs / UiGlobalVariables | — | `addUiFile` / `createUiDefs` / `addGlobalVariables` | |
| LangFile / ItemTextureAtlas / Attachable / SoundBatch | — | `addLang` / `addItemTextureAtlas` / `addAttachable` / `applySoundBatch` | |
| DynamicItemModel | — | `addDynamicItemModel` | |
| FrameSequence | — | `addFrameSequence` + `addFrameTextures` | 一步写 RC + 占位帧贴图 |
| FlipbookTextures | — | `addFlipbookTexture` | |

### 3.3 `ModMain.define(spec)`

声明式批量接线，内部等价于逐组调用 `add`：

```ts
mod.define({
  items: [ruby, chainsaw],
  blocks: [obsidianBlock],
  entities: [goblinBp, goblinRp, goblinRc, goblinSpawn],
  recipes: [swordRecipe, [smeltRecipe, 'smelting']],
  loot: [[rubyLoot, 'loot_tables/ruby']],
  trades: [[wandererTrades, 'trading/wanderer']],
  ui: [settingsScreen],
  rp: [itemAtlas, attachable],
}).writeTo('out');
```

### 3.4 工厂方法

每个工厂 = 构造对应生成器 → 自动 `add` 接线 → 返回实例（可继续 `.setXxx()` 链式）。
Item 子类（Tools/Armor/...）仍用 `new Tools(...)` + `mod.add(tools)`，不受影响。

| 工厂 | 签名 | 返回 |
| --- | --- | --- |
| `item` | `(config: ItemConfig)` | `Item` |
| `block` | `(config: BlockConfig)` | `Block` |
| `entityBP` | `(config: EntityBPConfig)` | `EntityBP` |
| `entityRP` | `(config: EntityRPConfig)` | `EntityRP` |
| `renderController` | `(config: RenderControllerConfig)` | `RenderController` |
| `spawnRules` | `(config: SpawnRulesConfig)` | `SpawnRules` |
| `shaped` / `shapeless` | `(config: ShapedConfig / ShapelessConfig)` | 对应 Recipe |
| `furnace` / `brewingMix` / `brewingContainer` | `(config: 对应 Config)` | 对应 Recipe |
| `loot` | `(config: LootTableConfig, path: string)` | `LootTable` |
| `trade` | `(config: TradeTableConfig, path: string)` | `TradeTable` |
| `ui` | `(config: UiFileConfig)` | `UiFile` |

### 3.5 错误语义

- 未知 / 不支持的类型：抛错并列出支持的类别清单（防拼错、防漏接）。
- 纯资源包模组（无 `behavior`）上添加 BP 侧模块（Item/Block/Recipe/Loot/Trade/
  EntityBP/SpawnRules）：抛错并提示“需要给 `ModMain` 配置 `sapi` 入口”。
- `LootTable` / `TradeTable` 未带路径：抛错提示用 `[table, path]` 元组或 `define`。
- 嵌套数组自动展平；同一实例重复 `add` 允许（与现有 `add*` 语义一致，靠既有
  lang/key 合并去重，不产生重复条目）。

### 3.6 新增 `Resource.addItemName`

```ts
addItemName(item: Item, name?: string, options?: { locale?: string }): string
```

实现与 `addBlockName` 对称：读 `texts/<locale>.lang` → 过滤 `item.<identifier>.name` 旧键
→ 追加新键（默认 `item.config.name`）。返回 lang 路径。

## 4. 向后兼容

- 不删除、不重命名任何公开方法 / 类型 / 类。
- `example/index.ts` 改为新写法（作为推荐用法样板），`behavior.*` / `resource.*`
  直连方式仍完全可用。
- 现有 57 项测试的断言不变；新增路由测试只做加法。

## 5. 测试计划（TDD，先红后绿）

1. `add(item)` → BP 有 `items/*.json`；RP 有 `item_texture.json` 条目、占位 PNG、
   `texts/en_US.lang` 的 `item.<id>.name`。
2. `add(item带dynamicModel)` → 额外写 attachable/geometry/animation 三文件。
3. `add(recordDisc)` → 额外注册唱片声音定义。
4. `add(block)` → BP 块文件 + terrain_texture + tile lang。
5. `add(entityBP / entityRP / renderController / spawnRules)` → 各归正确侧。
6. `add([recipe, 'dir'])` 元组与嵌套数组展平。
7. `add(lootTable, 'path')` / `add([tradeTable, 'path'])` → BP 下对应路径。
8. `add(ui / lang / attachable / dynamicModel / frameSequence / flipbook)` → RP。
9. `define({...})` 全量接线且返回 `this`。
10. 工厂方法：`mod.item(...)` 返回实例且已接线；`mod.shaped(...)` 同理。
11. 错误语义：未知类型 / 纯 RP 模组加 BP 模块 / loot 缺路径 → 均抛带提示的错误。

## 6. 文档与版本

- README：新增「🧩 统一接线（add / define / 工厂）」章节 + 特性列表条目；
  `example/index.ts` 重写为新写法。
- 版本 0.2.0 → 0.3.0（`npm version --no-git-tag-version` 同步 lock）。
- CHANGELOG 新增 0.3.0 段落。
- 全套通过后提交并推送 GitHub（沿用项目规则）。

## 7. 待确认假设

1. 物品自动接线**默认**生成占位贴图 + 本地化名称（真实贴图后续用 `addDirectory`
   覆盖即可）；如不希望自动生成，可在评审时改为“仅写已配置部分”。
2. Loot/Trade 路径统一走显式传参（`add(table, path)` / 元组），不在配置里新增
   `path` 字段（避免侵入生成器 config / buildJson）。
