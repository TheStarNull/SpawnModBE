# SpawnModBE

一个用于 **生成 Minecraft Bedrock Edition（MCBE / 基岩版）Mod** 的 TypeScript 框架。

SpawnModBE 不是"运行时模组"，而是一个 **代码生成器**：你用 TypeScript 声明一个模组的元信息
（名称、介绍、作者、版本、SAPI 入口、UUID 生成参数……），框架自动帮你生成**规范合法**的
资源包（RP）与行为包（BP）manifest、UUID 池和默认包图标，为后续按需堆叠自定义物品、实体、
配方等模块打下基础。

> 项目名 **SpawnModBE** —— *Spawn a Mod for Bedrock Edition*。

---

## ✨ 特性

- 🧩 **统一接线**：`mod.add()` / `mod.define()` 按类型自动路由 BP/RP + 工厂方法（0.3.0）
- 🧩 三大核心类：`ModMain`（整模）、`Behavior`（行为包）、`Resource`（资源包）
- 📦 自动生成 `format_version: 2` 的 RP/BP manifest（header / modules / dependencies）
- 🤖 自动生成 **确定性 UUID 池**：同一 seed 每次构建产出完全相同的 UUID，跨包依赖稳定可靠
- 📜 可选 Script API (SAPI) 模块：自动添加 `script` module 与 `@minecraft/server` 依赖
- 🖼️ 内置默认包图标（`pack_icon.png`）生成器，可自定尺寸与颜色
- 📁 **批量复制本地目录**：`addDirectory()` 递归导入资源并保留目录结构，支持 `prefix` / `ignore`
- 📦 **一键打包**：`pack()` → `.mcpack`，`toMcaddon()` → `.mcaddon`，`writeTo()` → 目录
- 🔊 **声音系统**：`addSound()` / `addRecordSound()` 管理 `sound_definitions.json` + OGG 音频
- 🎒 **物品生成器**：`Item` / `Tools` / `Armor` / `Food` / `Fuel` / `Throwable` / `BlockPlacer` / `EntityPlacer` / `RecordDisc`
- 🛠️ **配方生成器**：`Shapeless` / `Shaped` / `Furnace` / `BrewingMix` / `BrewingContainer`
- 🎁 **战利品表生成器**：`LootTable`（加权随机池 + 层级池 + 函数 + 条件）
- 👾 **实体生成器**：`EntityBP`（行为） / `EntityRP`（资源/渲染） / `RenderController` / `SpawnRules`（生成规则）
- 📝 **RP 模块生成器**：`LangFile`（本地化） / `ItemTextureAtlas`（批量贴图） / `Attachable`（手持附着） / `SoundBatch`（批量声音）
- 🎡 **物品动态模型**：`DynamicItemModel`（3D 几何 + 附着 + 动画，一键生成三文件）
- 🎞️ **实体帧序列动画**：`FrameSequence`（多张贴图按序播放，RC texture 数组 + `query.anim_time` 采样）
- 🧑‍🌾 **村庄交易表**：`TradeTable`（tiers → groups/trades → wants/gives，recipe choice/quantity/multiplier/functions）
- 🧱 **方块生成器**：`Block`（BP 块定义 + states/traits/permutations + RP terrain_texture + tile 本地化）
- 🎞️ **方块纹理动画**：`FlipbookTextures`（`flipbook_textures.json` 动画参数，岩浆/水式动画）
- ✨ **粒子生成器**：`Particle`（BP `particles/*.json` + 发射速率 / 寿命 / 形状 / 外观助手）
- 🌳 **地物生成器**：`Feature` / `FeatureRule`（BP `features/*.json` / `feature_rules/*.json` + `oreFeature` / `singleBlockFeature`）
- 🏞️ **生物群系生成器**：`Biome`（BP `biomes/*.json` + `climate` / `surfaceParameters` / `biomeTags`）
- 🌫️ **雾效生成器**：`Fog`（RP `fogs/*.json`，含 air/water/lava 距离层与体积雾）
- 🔗 **链式 set 方法**：`Item`/`Block`/`EntityBP` 支持 `.setXxx()` 返回自身，一行串多个配置（含 `setLoot` 关联战利品表）
- 🖥️ **JSON UI 生成器**：`UiFile` / `UiDefs` / `UiGlobalVariables`，含完整面向对象控件（`UiLabel`/`UiImage`/`UiButton`/`UiPanel`/`UiStackPanel`/`UiGrid`/`UiScreen`/`UiToggle`/`UiDropdown`/`UiSlider`/`UiEditBox`/`UiScrollView`/`UiFactory`/`UiCustom` 等）自动注册 `_ui_defs.json`
- 🧩 **CLI 脚手架**：`npx spawnmodbe init` 一键生成可编译的 TypeScript 模组工程（零运行时依赖，含 SAPI 入口 / 纯资源包两种模式）
- 🎯 支持 **对象参数** 与 **位置参数** 两种构造方式
- 🔒 全程 `strict` TypeScript，零运行时依赖（构建期仅需 `typescript` 与 `@types/node`）
- ✅ 内置 smoke test，`npm test` 一键验证

---

## 📦 安装

```bash
npm install
npm run build
npm test          # 运行内置冒烟测试
```

> 目前为本地开发库。发布后可通过 `npm install spawnmodbe` 使用。

---

## 🚀 快速上手

### 方式一：对象参数（推荐）

```ts
import { ModMain } from 'spawnmodbe';

const mod = new ModMain({
  name: 'Spawn Mod',
  description: '一只会召唤生物的模组',
  author: 'devx',
  version: [1, 0, 0],
  minEngineVersion: [1, 20, 70],

  // SAPI 脚本入口：此处传入即代表使用 @minecraft/server 脚本 API。
  // 不传 / 传 undefined 则只生成资源包（无行为包）。
  sapi: {
    entry: 'scripts/main.js',
    language: 'javascript',
    runtimeVersion: '1.11.0',
  },

  // UUID 生成参数：seed 相同则生成的 UUID 恒定。
  uuid: {
    seed: 'spawn-mod-demo',
  },
});

const result = mod.build();
console.log(result.behaviorPack);   // 行为包 manifest（无 SAPI 时为 null）
console.log(result.resourcePack);   // 资源包 manifest
```

### 方式二：位置参数

```ts
import { ModMain } from 'spawnmodbe';

const mod = new ModMain(
  'Spawn Mod',           // ① 模组名称
  '一只会召唤生物的模组', // ② 模组介绍
  'devx',                // ③ 作者
  [1, 0, 0],             // ④ 版本 [major, minor, patch]
  [1, 20, 70],           // ⑤ 最低游戏引擎版本
  'scripts/main.js'      // ⑥ SAPI 脚本入口（可为 undefined）
);
```

两种方式完全等价。`sapi` 既可以是字符串（快捷写法，等价于 `{ entry, language: 'javascript' }`），
也可以是对象（可额外指定 `language`、`runtimeVersion`）。

---

## 🧱 核心类

### `ModMain` — 模组总入口

描述整个模组，内部组合一个 `Resource` 与一个（可选的）`Behavior`，并让两者的 UUID 互通。

| 成员 | 说明 |
| --- | --- |
| `config` | 解析后的完整配置（`ResolvedModMainConfig`） |
| `resource` | 模组的资源包实例 |
| `behavior` | 模组的行为包实例（无 SAPI 时为 `null`） |
| `build()` | 返回 `ModBuildResult`（双 manifest + 双实例 + 配置） |
| `buildResourcePackManifest()` | 生成资源包 manifest |
| `buildBehaviorPackManifest()` | 生成行为包 manifest（无 SAPI 时为 `null`） |
| `toString()` | 打印两份格式化的 manifest |

### `Behavior` — 行为包 ✨新增

描述并构建单个行为包。总是包含一个 `data` 模块；传入 `script` 时追加 `script` 模块与
`@minecraft/server` 运行时依赖。

```ts
import { Behavior } from 'spawnmodbe';

const bp = new Behavior({
  name: 'Spawn Mod BP',
  description: '玩法逻辑与脚本',
  author: 'devx',
  version: [1, 0, 0],
  script: { entry: 'scripts/main.js', language: 'javascript' },
  uuid: { seed: 'spawn-mod-bp' },
});

const manifest = bp.buildManifest();
console.log(bp.hasScript);          // true
console.log(bp.dataModuleUuid);     // data 模块 UUID
console.log(bp.scriptModuleUuid);   // script 模块 UUID（无脚本时为 undefined）
```

### `Resource` — 资源包 ✨新增

描述并构建单个资源包。总是包含一个 `resources` 模块，并携带默认包图标。

```ts
import { Resource } from 'spawnmodbe';

const rp = new Resource({
  name: 'Spawn Mod RP',
  description: '贴图、模型与声音',
  author: 'devx',
  version: [1, 0, 0],
  uuid: { seed: 'spawn-mod-rp' },
});

const manifest = rp.buildManifest();
console.log(rp.moduleUuid);          // resources 模块 UUID
console.log(rp.icon);                // 默认 pack_icon PNG（Buffer）
```

---

## 📁 文件管理

`Behavior` 与 `Resource` 都继承自 `PackBase`，支持增删文件、批量复制目录、写盘与打包。

### 单个 / 批量添加文件

```ts
// 单个文件（Buffer 或字符串）
rp.addFile('textures/items/diamond.png', buffer);
bp.addFile('scripts/main.js', 'console.log("hi")');

// 批量（支持 PackFile 对象 或 [path, data] 元组，可混用）
rp.addFiles([
  ['textures/blocks/stone.png', buffer1],
  { path: 'textures/blocks/dirt.png', data: buffer2 },
]);
```

### 从本地目录批量复制 ✅

`addDirectory(sourceDir, options?)` 递归读取本地目录，保留相对目录结构，一次性加入包中。

```ts
// 直接把整个 assets 目录映射进包（textures/items/a.png → textures/items/a.png）
await rp.addDirectory('./assets');

// prefix：把所有文件放到包内子目录下
await rp.addDirectory('./assets', { prefix: 'textures' });

// ignore：跳过文件 / 目录 / 通配符
await rp.addDirectory('./assets', {
  ignore: ['test', '*.map', '**/.DS_Store'],
});

// 返回值可了解导入情况
const { added, skipped, errors, addedFiles } = await rp.addDirectory('./assets');
```

**options**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `prefix` | `string` | 包内目标前缀子目录 |
| `ignore` | `string[]` | 跳过的相对路径，支持目录（整树跳过）与 `*` 通配 |

### 写盘

```ts
// 把包写到磁盘目录（自动创建目录），返回 { directory, filesWritten, files }
await rp.writeTo('./build/rp');            // overwrite 默认 true
await rp.writeTo('./build/rp', { overwrite: false });

// ModMain 会把 BP / RP 分别写入 <name>_BP、<name>_RP 两个文件夹
await mod.writeTo('./build');
```

### 打包

```ts
// 单个包 → .mcpack（zip）Buffer
const rpMcpack = rp.pack();               // 或 mod.packResourcePack()
const bpMcpack = bp.pack();               // 或 mod.packBehaviorPack()

// 整个模组 → .mcaddon（zip）Buffer，内部自动分为 <name>_BP / <name>_RP 两个文件夹
const maddon = mod.toMcaddon();

// 零依赖 ZIP 写入器也可单独使用
import { createZip, buildZip } from 'spawnmodbe';
const z = buildZip([['a.txt', Buffer.from('hello')]]);
```

所有生成的 ZIP 均使用标准 DEFLATE 压缩 + UTF-8 文件名 + CRC32 校验，可直接被 Minecraft
或任何解压工具读取（`unzip -t` 校验通过）。

---

## 🎒 自定义物品

物品系统基于 **Bedrock Wiki**（https://wiki.bedrock.dev/items/item-components）整理的
组件格式，按物品类型分为三个类：

- `Item` — 通用物品（材料、食物、燃料、可投掷物……）
- `Tools` — 工具 / 武器（耐久、挖掘速度、伤害、修复……）
- `Armor` — 护甲（穿戴槽位、保护值、伤害吸收……）

组件全部选用官方最近格式版本（默认 `format_version: 1.26.0`）。

### 通用物品 `Item`

```ts
import { Item } from 'spawnmodbe';

const ruby = new Item({
  identifier: 'mymod:ruby',          // 必填：namespace:name
  name: 'Ruby',                       // 显示名
  description: 'A shiny red gem',     // 介绍
  category: 'items',                  // creative 分类
  rarity: 'rare',                     // common/uncommon/rare/epic
  texturePath: 'textures/items/ruby', // RP 贴图路径（自动生成占位图）
  maxStackSize: 64,
  // 通用组件（全部可选）：
  glint: true,                        // 附魔光泽
  fuelDuration: 8.5,                  // 燃料燃烧秒数
  tags: ['mymod:gem'],                // 物品标签
  cooldown: { category: 'mymod:cd', duration: 0.5 },
  food: { nutrition: 4, saturationModifier: 0.6, canAlwaysEat: true },
  useAnimation: 'eat',
  throwable: { launchPowerScale: 1.4, maxLaunchPower: 2.0 },
  projectile: { projectileEntity: 'arrow' },
  allowOffHand: true,
});
```

### 工具 / 武器 `Tools`

```ts
import { Tools } from 'spawnmodbe';

const dagger = new Tools({
  identifier: 'mymod:dagger',
  name: 'Obsidian Dagger',
  category: 'equipment',
  texturePath: 'textures/items/dagger',
  maxDurability: 512,                        // minecraft:durability
  damage: 8,                                 // minecraft:damage
  enchantableSlot: 'sword',                  // minecraft:enchantable
  enchantableValue: 14,
  repairItems: [{ items: ['minecraft:obsidian'], repairAmount: 128 }], // minecraft:repairable
  destroySpeeds: [                           // minecraft:digger
    { block: { tags: "q.any_tag('minecraft:is_sword_item_destructible')" }, speed: 4 },
  ],
  handEquipped: true,
});
```

### 护甲 `Armor`

```ts
import { Armor } from 'spawnmodbe';

const helmet = new Armor({
  identifier: 'mymod:obsidian_helmet',
  name: 'Obsidian Helmet',
  texturePath: 'textures/items/obsidian_helmet',
  slot: 'slot.armor.head',                   // wearable 槽位
  protection: 6,                             // 护甲值
  maxDurability: 495,
  enchantableSlot: 'armor_head',
  repairItems: ['minecraft:obsidian'],
  absorbedCauses: ['all'],                   // damage_absorption
});
```

### 接入行为包与资源包

```ts
// 行为包：生成 items/<shortName>.json 物品定义
mod.behavior?.addItem(ruby);
mod.behavior?.addItems([dagger, helmet]);

// 资源包：生成 item_texture.json 映射 + 自动占位贴图（16x16 纯色 PNG）
mod.resource.addItemTexture(ruby);
mod.resource.addItemTextures([dagger, helmet]);
```

`Resource.addItemTexture` 会：
1. 把物品的 `iconTexture → texturePath` 写入 `textures/item_texture.json`
2. 在 `texturePath.png` 生成纯色占位贴图（可用 `placeholderColor: [r,g,b]` 自定义颜色），
   也可先用 `addFile`/`addDirectory` 提供真实贴图，占位图会自动跳过。

> 组件格式细节（Digger / Durability Sensor / Kinetic Weapon / Liquid Clipped / Projectile /
> Use Modifiers 等）均以 [Bedrock Wiki](https://wiki.bedrock.dev/items/item-components) 为准。

---

## 🔊 声音系统

`Resource` 支持管理 `sounds/sound_definitions.json` 和打包 OGG 音频资源。

### 注册自定义声音

```ts
// 注册音效事件 + 写入音频文件（sounds/mymod/whoosh.ogg）
rp.addSound(
  'mymod:whoosh',              // 声音事件 ID
  'sounds/mymod/whoosh',       // 音频路径（不含 .ogg）
  { stream: false, volume: 0.7, maxDistance: 24 },
  oggBuffer                    // 可选：OGG 音频字节
);
```

多次调用会**累积**写入同一个 `sound_definitions.json`，不会互相覆盖。

### 唱片音效 `addRecordSound`

唱片（`RecordDisc`）可自带音频，`addRecordSound` 会把声音事件与音频绑定，
并自动采用原版唱片的配置（stream 流式加载、0.5 音量、64 格传播距离）。

```ts
const disc = new RecordDisc({
  identifier: 'mymod:my_disc',
  name: 'Mystery Disc',
  soundEvent: 'record.mystery',
  soundPath: 'sounds/music/records/mystery', // 默认由此推导
  texturePath: 'textures/items/record_mystery',
});

mod.resource.addRecordSound(disc, oggBuffer);  // 注册声音 + 写入 ogg
mod.resource.addItemTexture(disc);             // 注册贴图
mod.behavior?.addItem(disc);                   // 注册物品定义
```

**依赖类型**：`AddSoundOptions`（stream / volume / pitch / maxDistance / loadOnLowMemory）、
`SoundDefinition`、`SoundEventDefinition`。

---

## 🛠️ 配方生成器

配方文件放在 BP 的 `recipes/` 目录。基底类 `Recipe` 提供公共字段
（identifier / tags / group / unlock / priority），各子类补充配方主体。
格式依据 [Bedrock Wiki 配方文档](https://wiki.bedrock.dev/loot/recipes)，
默认 `format_version: 1.17.41`。

### 有序合成 `Shaped`

```ts
import { Shaped } from 'spawnmodbe';

const rubySword = new Shaped({
  identifier: 'mymod:ruby_sword',
  tags: ['crafting_table'],
  pattern: ['X', 'X', 'I'],          // 3×3 网格，空格为空位
  key: { X: 'mymod:ruby', I: 'minecraft:stick' },
  result: 'mymod:ruby_sword',
});
mod.behavior?.addRecipe(rubySword, 'crafting/weapons');
```

### 无序合成 `Shapeless`

```ts
import { Shapeless } from 'spawnmodbe';

const brassKnob = new Shapeless({
  identifier: 'mymod:brass_knob',
  tags: ['crafting_table'],
  group: 'handles',
  ingredients: ['mymod:brass', { item: 'mymod:screw', data: 2 }],
  result: { item: 'mymod:door_knob', data: 3 },
});
mod.behavior?.addRecipe(brassKnob, 'decorations/knobs');
```

### 熔炉 / 加热 `Furnace`

```ts
const magicAsh = new Furnace({
  identifier: 'mymod:magic_ash',
  tags: ['furnace', 'soul_campfire'],
  input: 'mymod:bone_fragments',
  output: { item: 'mymod:magic_ash', count: 4 },
});
```

### 酿造 `BrewingMix` / `BrewingContainer`

```ts
const paralysis = new BrewingMix({
  identifier: 'mymod:paralysis_brew',
  tags: ['brewing_stand'],
  input: 'mymod:flask', reagent: 'mymod:jade', output: 'mymod:paralysis_brew',
});

const illumination = new BrewingContainer({
  identifier: 'mymod:illumination_potion',
  tags: ['brewing_stand'],
  input: 'minecraft:potion', reagent: 'mymod:radiant_berries', output: 'mymod:illumination_potion',
});
```

### 配方接入行为包

```ts
mod.behavior?.addRecipe(rubySword);                     // → recipes/ruby_sword.json
mod.behavior?.addRecipe(rubySword, 'crafting/weapons'); // → recipes/crafting/weapons/ruby_sword.json
mod.behavior?.addRecipes([[rubySword, 'crafting'], brassKnob]); // 批量
```

配方标识符唯一，文件名取自 identifier 去命名空间后，因此同一 identifier 配不同 subPath 不会冲突。

---

## 🎁 战利品表生成器

战利品表挂在 BP 的 `loot_tables/` 目录（也可放在任意路径）。核心是 `LootTable`，
它由一组 **pools** 构成，每个 pool 独立选择产出。格式依据
[Bedrock Wiki 战利品表文档](https://wiki.bedrock.dev/loot/loot-tables)。

### 加权随机池

```ts
import { LootTable, setCount } from 'spawnmodbe';

const artifacts = new LootTable({
  pools: [
    {
      rolls: { min: 2, max: 4 },              // 或整数 `rolls: 1`
      bonus_rolls: 3,
      bonus_chance: 0.095,
      entries: [
        { type: 'item', name: 'minecraft:golden_apple', weight: 20 },
        { type: 'item', name: 'minecraft:name_tag', weight: 30 },
        {
          type: 'item',
          name: 'minecraft:diamond',
          weight: 1,
          functions: [setCount({ min: 1, max: 3 })],  // 随机数量
        },
      ],
      conditions: [killedByPlayer()],
    },
  ],
});
mod.behavior?.addLootTable(artifacts, 'loot_tables/custom/artifacts');
```

### 层级池（用于选装备）

```ts
const armorSets = new LootTable({
  pools: [
    {
      tiers: { initial_range: 2, bonus_rolls: 3, bonus_chance: 0.095 },
      entries: [
        { type: 'loot_table', name: 'loot_tables/entities/armor_set_leather' },
        { type: 'loot_table', name: 'loot_tables/entities/armor_set_iron' },
      ],
    },
  ],
});
```

### 常用辅助函数

- `setCount(count)` → `{ function: 'set_count', count }`
- `setName(name)` → `{ function: 'set_name', name }`
- `killedByPlayer()` → `{ condition: 'killed_by_player' }`
- `randomChanceWithLooting(chance, lootingMult)` → `random_chance_with_looting` 条件

**入口类型**：`item` / `loot_table`（层级引用）/ `empty`（空产出）。

---

## 👾 实体生成器

自定义实体需要同时定义**行为包**（实体逻辑）和**资源包**（实体外观）。

### 行为包 `EntityBP`

行为文件有三大结构：`components`（逻辑组件）、`component_groups`（组件组，可被事件增删）、
`events`（增删组件组）。格式依据
[Bedrock Wiki 实体 BP](https://wiki.bedrock.dev/entities/entity-intro-bp)。

```ts
import { EntityBP } from 'spawnmodbe';

const goblin = new EntityBP({
  identifier: 'mymod:goblin',
  isSpawnable: true,
  components: {
    'minecraft:type_family': { family: ['mymod:goblin', 'monster'] },
    'minecraft:collision_box': { width: 0.6, height: 1.2 },
  },
  componentGroups: {
    'mymod:angry': { 'minecraft:scale': { value: 1.5 } },
  },
  events: {
    'mymod:on_hit': { add: { component_groups: ['mymod:angry'] } },
  },
});
mod.behavior?.addEntity(goblin);  // → entities/goblin.json
```

### 资源 / 客户端实体 `EntityRP`

资源文件持有外观资产的引用：materials / textures / geometry / render_controllers /
animations / scripts / spawn_egg 等。格式依据
[Bedrock Wiki 实体 RP](https://wiki.bedrock.dev/entities/entity-intro-rp)。

```ts
import { EntityRP } from 'spawnmodbe';

const goblinRP = new EntityRP({
  identifier: 'mymod:goblin',
  materials: { default: 'entity_alphatest' },
  textures: { default: 'textures/entity/goblin' },
  geometry: { default: 'geometry.goblin' },
  renderControllers: ['controller.render.goblin'],
  scripts: { initialize: ['v.foo = 1;'], scale: 'v.foo' },
  spawnEgg: { base_color: '#2e6b2e', overlay_color: '#6b2e2e' },
});
mod.resource.addClientEntity(goblinRP);  // → entity/goblin.entity.json
```

### 渲染控制器 `RenderController`

控制实体如何渲染：为每个部件指定几何 / 材质 / 贴图。

```ts
import { RenderController } from 'spawnmodbe';

const rc = new RenderController({
  id: 'controller.render.goblin',
  geometry: 'geometry.default',              // 几何 shortname
  materials: [{ '*': 'material.default' }],  // 所有部件用 default 材质
  textures: ['texture.default'],             // 贴图 shortname
  partVisibility: [{ bone: 'head', condition: 'q.is_on_fire' }],
});
mod.resource.addRenderController(rc);  // → render_controllers/goblin.rc.json
```

### 生成规则 `SpawnRules`

控制生物自然生成（地面/地下/水下、亮度、难度、群落、成群、变形概率等）。

```ts
import { SpawnRules } from 'spawnmodbe';

const goblinSpawns = new SpawnRules({
  identifier: 'mymod:goblin',
  populationControl: 'monster',   // animal / monster / ambient / underwater_animal
  conditions: [
    {
      weight: 100,
      herd: { min_size: 2, max_size: 4 },
      spawnsOnSurface: true,
      brightness: { min: 0, max: 7 },
      difficulty: { min: 'easy', max: 'hard' },
      permuteType: [{ weight: 95 }, { weight: 5, entity_type: 'minecraft:zombie' }],
    },
  ],
});
mod.behavior?.addSpawnRules(goblinSpawns);  // → spawn_rules/goblin.json
```

**入口类型**：`EntityBP`（行为） / `EntityRP`（资源） / `RenderController`（渲染控制） /
`SpawnRules`（生成规则）。

---

## 📝 RP 模块生成器

资源包侧的几类常用模块：本地化、批量贴图、手持附着、批量声音。

### 本地化 `LangFile`

生成 `.lang` 本地化文件（`texts/<locale>.lang`），每行 `key=value`。提供了
物品名 / 实体名 / 刷怪蛋名 / 唱片描述 / 交互标签的快捷方法。

```ts
import { LangFile } from 'spawnmodbe';

const lang = new LangFile({ locale: 'en_US' });
lang.setItemName('mymod:ruby', 'Ruby');
lang.setItemName('mymod:dagger', 'Obsidian Dagger');
lang.setEntityName('mymod:goblin', 'Goblin');
lang.setSpawnEggName('mymod:goblin', 'Goblin Spawn Egg');
lang.setRecordDesc('record.mystery', 'Mystery Music');
mod.resource.addLang(lang);  // → texts/en_US.lang
```

### 批量贴图 `ItemTextureAtlas`

管理 `textures/item_texture.json` 图集。可整体覆盖，也可配合物品自动生成。

```ts
import { ItemTextureAtlas } from 'spawnmodbe';

const atlas = new ItemTextureAtlas();
atlas.set('ruby', 'textures/items/ruby');
atlas.set('axe', ['textures/items/wood_axe', 'textures/items/iron_axe']);
mod.resource.addItemTextureAtlas(atlas);  // → textures/item_texture.json
```

> 说明：单个物品用 `mod.resource.addItemTexture(item)` 更省事（自动写 atlas + 占位图）。

### 手持物品附着 `Attachable`

生成 `attachables/` 定义（物品被手持/穿戴时的外观），参考原版望远镜 / 盾牌。

```ts
import { Attachable } from 'spawnmodbe';

const spyglass = new Attachable({
  identifier: 'mymod:telescope',
  materials: { default: 'entity_alphatest', enchanted: 'entity_alphatest_glint' },
  textures: { default: 'textures/entity/telescope' },
  geometry: { default: 'geometry.telescope' },
  animations: { holding: 'animation.telescope.holding', scoping: 'animation.telescope.scoping' },
  scriptsAnimate: [
    { holding: 'q.main_hand_item_use_duration <= 0.0f' },
    { scoping: 'q.main_hand_item_use_duration > 0.0f' },
  ],
  renderControllers: ['controller.render.item_default'],
});
mod.resource.addAttachable(spyglass);  // → attachables/telescope.json
```

### 批量声音 `SoundBatch`

一次性定义多个声音事件，批量写入 `sound_definitions.json`。

```ts
import { SoundBatch } from 'spawnmodbe';

const batch = new SoundBatch({
  sounds: [
    { soundId: 'mymod:whoosh', soundPath: 'sounds/mymod/whoosh', volume: 0.7 },
    { soundId: 'mymod:ding', soundPath: 'sounds/mymod/ding', stream: true },
  ],
});
mod.resource.applySoundBatch(batch, { 'mymod:whoosh': oggBuffer });
```

### 物品动态模型 `DynamicItemModel`

让物品以自定义 **3D 网格**显示（而非 2D 贴图），并可带**动画**（如电锯锯片旋转、
望远镜伸长）。基于 attachables 系统，一次生成三个关联文件：
`attachables/<name>.json`（绑定）+ `models/entity/<name>.geo.json`（几何）+
`animations/<name>.animation.json`（动画）。

```ts
import { DynamicItemModel } from 'spawnmodbe';

const chainsaw = new DynamicItemModel({
  identifier: 'mymod:chainsaw',
  bones: [
    // 骨架骨（绑定右手），挂上手柄
    { name: 'rightItem', pivot: [0, 24, 0],
      cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] },
    // 锯片（子骨），可被动画驱动
    { name: 'blade', parent: 'rightItem', pivot: [0, 0, 0],
      cubes: [{ origin: [-8, 2, -0.5], size: [16, 1, 1], uv: [0, 8] }] },
  ],
  animations: {
    // 锯片随时间旋转（Molang）
    spin: { bone: 'blade', rotation: ['0', 'q.life_time * 360', '0'] },
  },
  animateWhen: {
    // 手持时播放旋转动画
    spin: 'q.main_hand_item_use_duration > 0.0f',
  },
});

mod.resource.addDynamicItemModel(chainsaw);
```

**要点**
- `identifier` 需匹配已有物品/方块 ID（如电锯物品）。
- `bones` 定义 3D 几何；骨可用 `parent` 挂到 `rightItem`/`leftItem` 或自由骨架。
- `animations`（`rotation`/`position`/`scale` Molang 通道）+ `animateWhen`（条件触发）。
- `Resource.addDynamicItemModel` 自动把 attachable / geometry / animation 三件写入资源包。

### 物品内联动态模型（推荐）

直接在物品配置里传 `dynamicModel`，再用一条龙 `addItemAssets` 一次性接线
（贴图 + 占位图 + 动态模型三件套），无需手动拼装：

```ts
import { Item, Tools } from 'spawnmodbe';

const chainsaw = new Tools({
  identifier: 'mymod:chainsaw',
  name: 'Chainsaw',
  maxDurability: 800,
  damage: 9,
  texturePath: 'textures/items/chainsaw',
  dynamicModel: {
    // identifier/texture 自动继承物品的 identifier/texturePath
    bones: [
      { name: 'rightItem', pivot: [0, 24, 0], cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] },
      { name: 'blade', parent: 'rightItem', pivot: [0, 0, 0], cubes: [{ origin: [-8, 2, -0.5], size: [16, 1, 1], uv: [0, 8] }] },
    ],
    animations: { spin: { bone: 'blade', rotation: ['0', 'q.life_time * 360', '0'] } },
    animateWhen: { spin: 'q.main_hand_item_use_duration > 0.0f' },
  },
});

mod.behavior.addItem(chainsaw);                 // BP 物品定义
mod.resource.addItemAssets(chainsaw);           // RP 一条龙：atlas + 占位图 + attachable/geometry/animation
mod.resource.addItemsAssets([chainsaw, other]); // 批量
```

- `ItemConfig.dynamicModel`：可选的 `DynamicItemModelConfig`（`identifier` 可省略，自动继承物品 ID）。
- `item.dynamicModel` / `item.hasDynamicModel`：查看/判断物品是否携带动态模型。
- `Resource.addItemAssets(item)`：贴图 + 占位图 + 动态模型三件套一次写完（无模型时只写贴图）。

### 实体帧序列动画 `FrameSequence`

让实体的贴图**按序播放**（像翻书一样），例如多帧挥剑动画。原理是在 render
controller 里用 `arrays.textures` 放一个贴图短名数组，再通过 `query.anim_time`
采样索引。这正是**銀弑の刃** 20 帧剑动画的做法。

```ts
import { FrameSequence, EntityRP } from 'spawnmodbe';

// 1. 定义帧序列（8 帧）
const seq = new FrameSequence({
  controllerId: 'controller.render.animated_sword',
  geometry: 'geometry.sword',
  frameTextures: Array.from({ length: 8 }, (_, i) => `texture.frame${i}`),
  // sampleExpression 可自定义：默认 `array.frames[math.floor(query.anim_time * 10) % 8]`
});

// 2. 写入 RC + 帧贴图（含占位图）
mod.resource.addFrameSequence(seq);                          // → render_controllers/animated_sword.rc.json
mod.resource.addFrameTextures(seq);                          // → textures/entity/animated_sword/frameN.png

// 3. 实体 RP 引用该 RC + 帧贴图
const swordRP = new EntityRP({
  identifier: 'mymod:animated_sword',
  materials: { default: 'entity_alphatest' },
  textures: seq.buildTexturesMap(),        // { texture.frame0: 'textures/entity/animated_sword/frame0', ... }
  geometry: { default: 'geometry.sword' },
  renderControllers: ['controller.render.animated_sword'],
});
mod.resource.addClientEntity(swordRP);
```

生成的关键 RC：

```json
"render_controllers": {
  "controller.render.animated_sword": {
    "arrays": { "textures": { "array.frames": ["texture.frame0", "...", "texture.frame7"] } },
    "geometry": "geometry.sword",
    "textures": ["array.frames[math.floor(query.anim_time * 10) % 8]"],
    "filter_lighting": true
  }
}
```

- `Resource.addFrameSequence(seq)`：写 RC。
- `Resource.addFrameTextures(seq, { placeholderColor })`：把每帧路径写入
  `item_texture.json` 并生成占位 PNG（可用 `frameTexturePaths` 指定实际路径）。
- `seq.buildTexturesMap()`：实体 RP 的 `textures` 字典（帧短名 → 路径）。

### 村庄交易表 `TradeTable`

生成村民/商人交易表。交易表是**无版本、无命名空间**的独立对象，顶层是 `tiers`
数组；每个 tier 可按 `groups`（随机选）或直接 `trades` 列出交易；每个 trade 是
`wants → gives` 的交易。格式依据
[Bedrock Wiki 交易表文档](https://wiki.bedrock.dev/loot/trade-tables)。

```ts
import { TradeTable, enchantBookForTrading, enchantWithLevels } from 'spawnmodbe';

const minister = new TradeTable({
  tiers: [
    {
      // 第一层：随机组，每个商人从组里选 1 个交易
      groups: [
        {
          numToSelect: 1,          // 0 = 全选（默认）
          trades: [
            {
              wants: [
                { item: 'wiki:blessing_glyph', quantity: { min: 2, max: 4 }, priceMultiplier: 0.5 },
                { item: 'minecraft:book' },
              ],
              gives: [
                {
                  item: 'minecraft:enchanted_book',
                  functions: [enchantBookForTrading({ baseCost: 4, baseRandomCost: 12 })],
                },
              ],
              maxUses: 7,          // 0=显示但不可用，负数=无限
              traderExp: 3,        // 商人的经验（推动层级解锁）
            },
            {
              wants: [{ item: 'wiki:crystalline_spiritite', quantity: 32 }],
              gives: [
                { item: 'wiki:exalted_blade', functions: [enchantWithLevels({ min: 15, max: 25 }, true)] },
              ],
              maxUses: 2,
              rewardExp: false,    // 不给玩家经验球
              traderExp: 8,
            },
          ],
        },
      ],
    },
    {
      totalExpRequired: 28,        // 商人累计经验达 28 解锁本层
      trades: [
        {
          wants: [
            { choice: [                        // 二选一（随机选一个）
              { item: 'wiki:sacred_stones', quantity: { min: 4, max: 6 } },
              { item: 'wiki:blessed_beads', quantity: { min: 16, max: 24 } },
            ]},
          ],
          gives: [{ item: 'wiki:aeleon_jewels' }],
          maxUses: 2,
        },
      ],
    },
  ],
});

mod.behavior?.addTradeTable(minister, 'trading/wiki/minister'); // → trading/wiki/minister.json
```

**主要类型**
- `TradeTier`：`trades` / `groups` / `totalExpRequired`（负数可冻结层级，首层负数则全解锁）
- `TradeGroup`：`numToSelect` + `trades`（重复 trades 可提高选中概率）
- `Trade`：`wants`(1-2 项) / `gives`(恰好 1 项) / `maxUses` / `rewardExp` / `traderExp`
- `TradeEntry`：`TradeItem`（item/quantity/priceMultiplier/functions）或 `TradeChoice`（choice 数组）
- `TradeFunction`：`enchant_with_levels`、`enchant_book_for_trading` 等（`enchantWithLevels` / `enchantBookForTrading` 辅助函数）

> 注意：`item_texture` 的 trade 数量用 `quantity`（不是 loot 的 `set_count`），
> `set_count`/`furnace_smelt`/`looting_enchant`/`trader_material_type` 在交易表里无效。

---

## 🧱 方块生成器

自定义方块只定义在**行为包**（`BP/blocks/<id>.json`），外观通过
`minecraft:geometry` + `minecraft:material_instances` 组件 + 资源包的
`textures/terrain_texture.json` 地形贴图关联。格式依据
[Bedrock Wiki Block 入门](https://wiki.bedrock.dev/blocks/blocks-intro)，默认
`format_version: 1.26.50`。

```ts
import { Block } from 'spawnmodbe';

const lamp = new Block({
  identifier: 'wiki:lamp',
  category: 'items',                 // construction / nature / equipment / items / none
  group: 'minecraft:itemGroup.name.concrete',   // 可选的可展开分组
  components: {
    'minecraft:light_emission': 15,
    'minecraft:light_dampening': 0,
    'minecraft:map_color': '#ffffff',
    'minecraft:destructible_by_mining': { seconds_to_destroy: 3 },
    'minecraft:geometry': 'minecraft:geometry.full_block',
    'minecraft:material_instances': { '*': { texture: 'wiki:lamp' } },
    'minecraft:sound': { sound: 'grass' },
  },
  permutations: [
    { condition: 'query.block_property("wiki:on") == true', components: { 'minecraft:light_emission': 15 } },
  ],
});

// BP：块定义
mod.behavior?.addBlock(lamp);                    // → blocks/lamp.json

// RP：地形贴图 + 显示名
mod.resource.addBlockTexture(lamp, { placeholderColor: [255, 200, 0] }); // → textures/terrain_texture.json + 占位 PNG
mod.resource.addBlockName(lamp, 'Custom Lamp');  // → tile.wiki:lamp.name=Custom Lamp
```

**要点**
- Block 无资源包实体定义，视觉靠 `material_instances.texture` 短名 → `terrain_texture.json` 关联。
- `addBlockTexture`：写入 `terrain_texture.json` 并生成占位 PNG（可用 `placeholderColor` 自定义）。
- `addBlockName`：写入 `tile.<id>.name` 本地化，重复调用不会产生重复 key。
- 方块可同时搭配 `minecraft:loot` 指定战利品表、用 `permutations` + block states 做条件变体。

### 方块变体（states / traits / permutations）

自定义方块可声明 **states**（布尔/整数/字符串数组或整数范围，首值为默认）、
**traits**（应用原版方向等状态，如 `minecraft:placement_position`）以及
**permutations**（按 `q.block_state` 条件切换组件，支持覆盖 base 组件）：

```ts
const slab = new Block({
  identifier: 'wiki:custom_slab',
  category: 'construction',
  states: {
    'wiki:string_state_example': ['red', 'green', 'blue'],
    'wiki:boolean_state_example': [false, true],
    'wiki:integer_range_state_example': { values: { min: 0, max: 5 } }, // 等价 [0..5]
  },
  traits: { 'minecraft:placement_position': { enabled_states: ['minecraft:vertical_half'] } },
  components: { 'minecraft:geometry': 'minecraft:geometry.full_block' },
  permutations: [
    { condition: "q.block_state('wiki:boolean_state_example')", components: { 'minecraft:friction': 0.8 } },
  ],
});
mod.behavior?.addBlock(slab);
```

> 需 `min_engine_version ≥ 1.20.20`。每 state 最多 16 个值，整数范围 `max ≤ min + 15`。

### 方块纹理动画 `FlipbookTextures`

让方块显示**动画纹理**（岩浆/水/火式翻页）。`flipbook_textures.json` 里给
`terrain_texture.json` 的短名绑定动画参数：

```ts
import { FlipbookTextures } from 'spawnmodbe';

const magma = new FlipbookTextures({
  atlasTile: 'magma',                 // terrain_texture.json 里的短名
  flipbookTexture: 'textures/blocks/magma',
  ticksPerFrame: 10,                  // 20 ticks = 1 秒
  atlasIndex: 1,                      // 纹理数组下标（可选）
  blendFrames: true,                  // 平滑过渡（默认 true）
});
mod.resource.addFlipbookTexture(magma);   // → 追加到 flipbook_textures.json
mod.resource.addFlipbookTextures([a, b]); // 批量
```

把方块 `material_instances` 的 `texture` 设为该短名（如 `'magma'`）即生效。

---

## 🔗 链式 set：模块互相应用

`Item` / `Block` / `EntityBP` 都支持**链式 `.setXxx()`**（返回 `this`），让你在一条表达式里串接多个配置，实现模块间的互相引用（如方块挂战利品表、物品挂组件）。

### 物品 `Item`

```ts
const ruby = new Item({ identifier: 'mymod:ruby' })
  .setName('Ruby')
  .setRarity('rare')
  .setTags(['mymod:gem'])
  .setFuelDuration(8.5)
  .setComponent('minecraft:glint', true)   // 任意自定义组件
  .setComponent('minecraft:food', { nutrition: 4, saturation_modifier: 0.6 });
```

### 方块 `Block`（含挂战利品表）

```ts
const lamp = new Block({ identifier: 'wiki:lamp' })
  .setCategory('items')
  .setComponent('minecraft:light_emission', 15)
  .setComponent('minecraft:geometry', 'minecraft:geometry.full_block')
  .setLoot('loot_tables/blocks/lamp')        // minecraft:loot 关联掉落
  .addState('wiki:on', [false, true])
  .addPermutation({ condition: "q.block_state('wiki:on')", components: { 'minecraft:light_emission': 15 } });

mod.behavior?.addBlock(lamp);
mod.behavior?.addLootTable(lootTable, 'loot_tables/blocks/lamp'); // 配合 setLoot
```

### 实体 `EntityBP`

```ts
const goblin = new EntityBP({ identifier: 'mymod:goblin' })
  .setSpawnable()
  .setSummonable()
  .setComponent('minecraft:type_family', { family: ['goblin'] })
  .addComponentGroup('angry', { 'minecraft:scale': { value: 1.5 } })
  .addEvent('on_hit', { add: { component_groups: ['angry'] } });
```

**常用链式方法**
| 类 | 方法 |
|---|---|
| `Item` | `setName` / `setDescription` / `setCategory` / `setRarity` / `setMaxStackSize` / `setTags` / `setFuelDuration` / `setComponent` / `addComponent` |
| `Block` | `setCategory` / `setGroup` / `setComponent` / **`setLoot`** / `addState` / `addTrait` / `addPermutation` |
| `EntityBP` | `setSpawnable` / `setSummonable` / `setExperimental` / `setComponent` / `addComponentGroup` / `addEvent` |

---

## 🖥️ JSON UI 生成器

Minecraft 游戏界面是数据驱动的，保存在资源包的 `RP/ui/...` 目录。SpawnModBE 提供:

- **`UiFile`** — 生成单个 UI 文件（`namespace` + 元素：label/image/button/panel/stack_panel 等）
- **`UiDefs`** — 生成 `_ui_defs.json`（注册所有 UI 文件）
- **`UiGlobalVariables`** — 生成 `_global_variables.json`（全局常量变量）

### 创建一个自定义界面

```ts
import { UiFile, UiDefs, UiGlobalVariables } from 'spawnmodbe';

// 1) 定义 UI 文件（namespace + 元素）
const myScreen = new UiFile({
  fileName: 'my_screen.json',
  namespace: 'my_screen',
  elements: [
    { name: 'hello_label', type: 'label', text: 'Hello World', color: [1, 1, 1], layer: 1 },
    { name: 'icon', type: 'image', texture: 'textures/ui/icon', size: [16, 16] },
    {
      name: 'root_panel',
      type: 'panel',
      controls: ['hello_label@my_screen.hello_label', 'icon@my_screen.icon'],
    },
  ],
});

// 2) 写入资源包（addUiFile 会自动注册到 _ui_defs.json）
mod.resource.addUiFile(myScreen);                       // → ui/my_screen.json + ui/_ui_defs.json
mod.resource.addGlobalVariables(
  new UiGlobalVariables({ variables: { $info_text_color: [0.8, 0.8, 0.8] } })
);                                                      // → ui/_global_variables.json
```

### 面向对象元素（推荐）

除了纯数据元素，还内置一套 **OOP 风格元素类**（Tkinter 式），支持链式 `.setXxx()`，
自动处理 `controls` 的 `name@namespace.name` 引用：

```ts
import { UiLabel, UiImage, UiPanel, UiFile } from 'spawnmodbe';

const label = new UiLabel({ name: 'hello', text: 'Hello', color: [1, 1, 1] }).setLayer(1);
const icon = new UiImage({ name: 'icon', texture: 'textures/ui/icon' }).setSize([16, 16]);
const panel = new UiPanel({ name: 'root', controls: [label, icon] });
// panel.build() 会把 controls 自动解析为 { 'hello@ns.hello': {} } ...

const ui = new UiFile({ fileName: 'screen.json', namespace: 'ns', elements: [label, icon, panel] });
mod.resource.addUiFile(ui);
```

**元素类**：`UiElement`（基类）+ 基础控件 `UiLabel` / `UiImage` / `UiButton` + 容器
`UiPanel` / `UiStackPanel` / `UiCollectionPanel` / `UiInputPanel` / `UiGrid` / `UiScreen` +
交互控件 `UiToggle` / `UiDropdown` / `UiSlider` / `UiSliderBox` / `UiEditBox` / `UiSelectionWheel` +
滚动 `UiScrollView` / `UiScrollbarTrack` / `UiScrollbarBox` + 特殊 `UiFactory` / `UiCustom`。
所有控件都支持链式 `.setXxx()` 与基类 `addBinding` / `setProperty`。

### 元素能力

`UiElementData`/`UiElement` 支持：`type`（label/image/button/panel/stack_panel/grid/factory/custom/screen）、
`text` / `texture` / `size` / `offset` / `anchor_from` / `anchor_to` / `color` / `alpha` /
`layer` / `visible` / `enabled` / `controls` / `bindings` / `variables`（`$name`）/ `anims`
（`@namespace.anim_name`）/ `extra`（任意额外属性）。

> ⚠️ 注意：JSON UI 正被 Ore UI 取代（资源包将无法修改硬编码的 Ore UI）。新项目请慎重选用。

---

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
  particles: [spark],
  features: [ore],
  featureRules: [oreRule],
  biomes: [plain],
  rp: [fog],
});                                    // 声明式批量，返回 this
```

工厂方法：`mod.item({...})` / `mod.block({...})` / `mod.entityBP({...})` /
`mod.shaped({...})` / `mod.loot(config, path)` / `mod.ui({...})` 等，创建即接线。
LootTable/TradeTable 需显式路径（`[table, path]` 或 `mod.add(table, path)`）。
纯资源包模组添加 BP 侧模块会得到明确报错提示，不会静默漏接。

---

## ✨ 粒子 / 地物 / 群系 / 雾

世界生成与表现层面的四个生成器（0.4.0）：粒子（BP）、地物与地物规则（BP）、
生物群系（BP）、雾效（RP）。全部支持 `mod.add(实例)`、`mod.define({...})` 分组与
工厂方法三种接线方式。

### 粒子 `Particle`

```ts
import { Particle, emitterRateInstant, emitterRateSteady, particleLifetime, tint } from 'spawnmodbe';

const spark = new Particle({
  identifier: 'mymod:ruby_spark',
  components: {
    ...emitterRateInstant(20),
    ...particleLifetime(2),
    ...tint('#ff0000'),
  },
});
mod.particle({ identifier: 'mymod:gem_spark' });       // 工厂：创建即接线 → particles/gem_spark.json
mod.add(spark);                                         // → particles/ruby_spark.json
```

常用助手：`emitterRateInstant` / `emitterRateSteady`（发射速率）、
`emitterLifetimeOnce` / `emitterLifetimeLooping`（发射器寿命）、
`emitterShapePoint` / `emitterShapeSphere`（形状）、`particleLifetime`（粒子寿命）、
`billboard` / `tint`（外观）。

### 地物与规则 `Feature` / `FeatureRule`

```ts
import { Feature, FeatureRule, oreFeature, singleBlockFeature } from 'spawnmodbe';

const ore = oreFeature({
  identifier: 'mymod:ruby_ore',
  count: 8,
  replaceRules: [{ placesBlock: 'mymod:ruby_ore', mayReplace: ['minecraft:stone'] }],
});
const oreRule = new FeatureRule({
  identifier: 'mymod:ruby_ore',
  placesFeature: 'mymod:ruby_ore',
  biomeFilter: { test: 'has_biome_tag', operator: '==', value: 'overworld' },
  distribution: { iterations: 5 },
});
mod.add(ore);       // → features/ruby_ore.json
mod.add(oreRule);   // → feature_rules/ruby_ore.json
```

`Feature` 输出任意官方特性类型（`type` + 宽松 `body`）；`oreFeature` 与
`singleBlockFeature` 是常用捷径。`FeatureRule` 配置用 camelCase
（`coordinateEvalOrder` / `scatterChance`），输出 JSON 为官方 `coordinate_eval_order`
/ `scatter_chance`，分布默认值（`scatter_chance: 100` 等）会自动填好。

### 生物群系 `Biome`

```ts
import { Biome, climate, surfaceParameters, biomeTags } from 'spawnmodbe';

const plain = new Biome({
  identifier: 'mymod:plain',
  components: {
    ...climate(0.5, 0.4, { humidity: 0.3 }),
    ...surfaceParameters({ top: 'minecraft:grass', mid: 'minecraft:dirt', sea: 'minecraft:water', foundation: 'minecraft:stone' }),
    ...biomeTags('overworld', 'ruby'),
  },
});
mod.add(plain);   // → biomes/plain.json
```

### 雾效 `Fog`

```ts
import { Fog } from 'spawnmodbe';

const rubyFog = new Fog({
  identifier: 'mymod:ruby_fog',
  distance: { air: { fog_start: 0, fog_end: 100, fog_color: '#FFAAAA', render_distance_type: 'render' } },
});
mod.add(rubyFog);   // → fogs/ruby_fog.json（RP）
```

`Fog` 落在资源包 `fogs/` 下。要在存档中生效，还需在资源包的
`biomes_client.json` 里把对应的生物群系指派给这团雾（`"fog_identifier"`），例如：

```json
{ "mymod:plain": { "fog_identifier": "mymod:ruby_fog" } }
```

生成的 `Fog` 只提供 `fogs/*.json` 雾定义；`biomes_client.json` 的指派需在
资源包内自行维护。

---

## 🧩 CLI 工具

除了作为库使用，`spawnmodbe` 也提供命令行脚手架，用于一键生成可编译的模组工程：

```bash
# 在当前目录生成一个模组工程
npx spawnmodbe init

# 指定目录、名称、说明、作者，也可不带行为包（纯资源包）
npx spawnmodbe init ./my-mod --name "My Mod" --description "..." --author "devx" --no-sapi

# 常用参数
npx spawnmodbe --version   # 查看版本
npx spawnmodbe --help      # 查看用法
```

`init` 会写入：`package.json`（含 `spawnmodbe` 依赖 + `build`/`pack` 脚本）、`tsconfig.json`、
`src/index.ts`（示例模组 + 可选 SAPI 入口）、`.gitignore`、`README.md`。执行 `npm run pack`
即可编译并把模组打包成 `out/<名称>.mcaddon`。

| 参数 | 说明 |
| --- | --- |
| `<dir>` | 目标目录（默认当前目录；目录非空需配合 `--force`） |
| `--name <name>` | 模组显示名（默认取目录名） |
| `--description <desc>` | 模组说明 |
| `--author <author>` | 作者 |
| `--no-sapi` | 仅生成资源包（不生成行为包 / 脚本入口） |
| `--force` | 在非空目录中覆盖脚手架文件（其它文件不动） |
| `--no-install` | 脚手架完成后跳过 `npm install` |

CLI 零运行时依赖，仅使用 Node 内置模块；`bin` 指向编译后的 `dist/cli.js`。

---

## ⚙️ 配置项

### `ModMainConfig`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | — | 模组显示名称（必填） |
| `description` | `string` | `name` | 模组介绍 |
| `author` | `string` | `'Unknown'` | 作者 |
| `version` | `SemVer` | `[1, 0, 0]` | 模组版本 |
| `minEngineVersion` | `GameVersion` | `[1, 20, 70]` | 最低引擎版本 |
| `sapi` | `SapiConfig \| string \| undefined` | `undefined` | SAPI 入口；缺省则无行为包 |
| `uuid` | `UuidConfig` | 由 `name` 推导的 seed | UUID 生成参数 |

### `SapiConfig`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `entry` | `string` | — | 脚本入口路径，如 `'scripts/main.js'` |
| `language` | `'javascript' \| 'typescript'` | `'javascript'` | 脚本语言 |
| `runtimeVersion` | `string` | `'1.11.0'` | `@minecraft/server` 依赖版本 |

### `UuidConfig`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `seed` | `string` | 确定性种子；相同 seed 产出相同 UUID 集合 |
| `explicit` | `Partial<Record<UuidRole, string>>` | 可显式指定某个角色的 UUID |

所有角色：`resourcePackHeader` / `resourcePackModule` / `behaviorPackHeader` /
`behaviorPackDataModule` / `behaviorPackScriptModule`。

---

## 🧪 测试

```bash
npm test
```

内置冒烟测试覆盖：资源包、行为包（带/不带脚本）、整模组合、跨包依赖、UUID 确定性、
位置参数构造、文件管理、**目录批量复制（prefix / ignore）**、**ZIP 生成与 CRC 校验**、
**写盘**、**各类物品（Item/Tools/Armor/Food/Fuel/Throwable/Placer/RecordDisc）**、
**声音系统（addSound/addRecordSound）**、**五种配方 + 战利品表（加权/层级池）**、
**实体系统（EntityBP/EntityRP/RenderController/SpawnRules）**、
**RP 模块（LangFile/ItemTextureAtlas/Attachable/SoundBatch）**、
**物品动态模型（DynamicItemModel 三文件生成 + 集成）**、
**实体帧序列动画（FrameSequence RC/贴图映射 + 占位帧）**、
**村庄交易表（TradeTable tiers/groups/trades + 附魔函数）**、
**方块（Block BP 定义 + states/traits/permutations + terrain_texture + tile 本地化）**、
**方块纹理动画（FlipbookTextures）**、
**JSON UI（UiFile/UiDefs/UiGlobalVariables + 自动 _ui_defs 注册）**。

---

## 📁 项目结构

```
SpawnModBE/
├── src/
│   ├── index.ts        # 公共出口
│   ├── ModMain.ts      # 模组总入口
│   ├── Behavior.ts     # 行为包
│   ├── Resource.ts     # 资源包
│   ├── pack.ts         # PackBase：文件管理 / 目录复制 / 写盘 / 打包
│   ├── zip.ts          # 零依赖 ZIP 写入器
│   ├── util.ts         # CRC32 / 路径处理 / 文件名清理
│   ├── types.ts        # 全部类型定义
│   ├── uuid.ts         # 确定性 UUID 池
│   ├── assets.ts       # 默认包图标生成
│   ├── cli.ts          # CLI（bin: spawnmodbe init）脚手架
│   ├── routing.ts      # 统一接线路由（add/define/工厂的底层分发）
│   ├── item/           # 物品体系（Item/Tools/Armor/Food/Fuel/Throwable/BlockPlacer/EntityPlacer/RecordDisc）
│   ├── recipe/         # 配方体系（Shaped/Shapeless/Furnace/BrewingMix/BrewingContainer）
│   ├── loot/           # 战利品表（LootTable + 辅助函数）
│   ├── trade/          # 村庄交易表（TradeTable + 附魔函数）
│   ├── block/          # 方块（Block BP 定义）
│   ├── entity/         # 实体体系（EntityBP/EntityRP/RenderController/SpawnRules）
│   ├── ui/             # JSON UI（UiFile/UiDefs/UiGlobalVariables + OO 元素：UiLabel/UiPanel/...）
│   ├── particle/       # 粒子（Particle + 发射器/寿命/形状/外观助手）
│   ├── feature/        # 地物与规则（Feature / FeatureRule + oreFeature / singleBlockFeature）
│   ├── biome/          # 生物群系（Biome + climate / surfaceParameters / biomeTags）
│   ├── fog/            # 雾效（Fog：RP fogs/*.json，air/water/lava 距离层 + 体积雾）
│   └── rp/             # RP 模块（LangFile/ItemTextureAtlas/Attachable/SoundBatch/DynamicItemModel/FrameSequence/FlipbookTextures）
├── example/
│   ├── index.ts             # 带 SAPI + 目录复制 + 打包的示例
│   ├── example-no-sapi.ts   # 纯资源包示例
│   └── mod-src/index.ts     # 示例 SAPI 脚本入口
├── test/
│   ├── smoke.test.ts   # 冒烟测试（69 项）
│   └── fixtures/       # 测试用假资源目录
├── package.json
└── tsconfig.json
```

---

## 🗺️ Roadmap

- [x] 写入磁盘：一键导出 `pack_icon.png` + `manifest.json` 到目录
- [x] 打包为 `.mcaddon` / `.mcpack`
- [x] 从本地目录批量复制资源（`addDirectory`）
- [x] 物品生成器（`Item`/`Tools`/`Armor`/`Food`/`Fuel`/`Throwable`/`Placer`/`RecordDisc`）
- [x] 声音系统（`addSound` / `addRecordSound`）
- [x] 配方生成器（`Shaped`/`Shapeless`/`Furnace`/`BrewingMix`/`BrewingContainer`）
- [x] 战利品表生成器（`LootTable` 加权池/层级池/函数/条件）
- [x] 实体生成器（`EntityBP` / `EntityRP` / `RenderController` / `SpawnRules`）
- [x] RP 模块生成器（`LangFile` / `ItemTextureAtlas` / `Attachable` / `SoundBatch`）
- [x] 物品动态模型（`DynamicItemModel`：3D 几何 + 附着 + 动画）
- [x] 实体帧序列动画（`FrameSequence`：贴图数组 + `query.anim_time` 采样）
- [x] 村庄交易表（`TradeTable`：tiers/groups/trades + 附魔函数）
- [x] 方块生成器（`Block`：BP 定义 + states/traits/permutations + terrain_texture + tile 本地化）
- [x] 方块纹理动画（`FlipbookTextures`：flipbook_textures.json）
- [x] JSON UI 生成器（`UiFile` / `UiDefs` / `UiGlobalVariables`）
- [x] CLI 工具（`npx spawnmodbe init`）
- [x] 统一接线 API（`mod.add` / `mod.define` / 工厂方法）
- [x] 粒子 / 地物 / 群系 / 雾生成器（`Particle` / `Feature` / `Biome` / `Fog`）

---

## 📄 License

MIT © devx
