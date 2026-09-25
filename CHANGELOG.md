# Changelog

本项目的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-09-25

### Added

- 动画生成器（`Animation`：BP `animations/*.json`，`loop` / `animation_length` / 骨骼 `bones` 体）
- 动画控制器生成器（`AnimationController`：BP `animation_controllers/*.json`，
  `initial_state` + `states`，配套 `state()` / `transition()` 助手与
  `on_entry` / `on_exit` / `animations` / `transitions` 选项）
- NPC 对话生成器（`Dialogue`：BP `dialogue/*.json`，`minecraft:npc_dialogue`
  场景列表，配套 `scene()` / `dialogueButton()` 助手）
- 结构生成器（`Structure`：BP `structures/<namespace>/<name>.mcstructure`，
  零依赖手写**小端 NBT** 编码器，与真实 `.mcstructure` 导出字节级一致；
  支持 `size` / `origin` / `blocks` / `blockStates` / `defaultBlock`）
- 结构放置器（`StructurePlacement`：`minecraft:structure_template_feature`
  JSON，`structure_name` / `adjustment_radius` / `transform.rotation`(0|90|180|270) /
  `transform.mirror`(none|x|z|xz) / `structure_animation_initialization_commands` /
  `structure_animation_tick_commands`）
- Script API 辅助库（`ScriptApiSource`：从 `@minecraft/server` 生成带
  `// @ts-ignore` 的 CommonJS 解构导入；`ScriptFile`：`scripts/*` 文件描述；
  `fetchScriptsOfType()`：递归读取本地目录中的脚本；常量 `SERVER_MODULE`）
- 统一接线扩展：`mod.add(实例)` / `mod.define({ animations, animationControllers,
  dialogues, structures, structurePlacements, scripts })` /
  `mod.animation` / `mod.animationController` / `mod.dialogue` / `mod.scriptApi` /
  `mod.structure` / `mod.structurePlacement` 工厂
- `Behavior.addAnimation` / `addAnimationController` / `addDialogue` /
  `addStructure` / `addStructurePlacement` / `addScriptFile`
- 冒烟测试 71 → 78（动画 / 动画控制器 / 对话 / 结构二进制 / 结构放置 / 脚本辅助 / 目录采集）

## [0.5.0] - 2026-09-25

### Added

- 生物群系客户端视觉生成器（`BiomesClient`：RP `biomes_client.json`，
  把雾 / 天空 / 水 / 草 / 树叶颜色、环境粒子、落尘颜色、环境光强与群系音乐指派给自定义群系，
  补上 `Fog` 只写 `fogs/*.json` 雾定义而无法指派给群系的缺口）
- `BiomeClientEntry` 字段（camelCase 输入 → snake_case 输出）：
  `fogIdentifier` / `fogIds` / `waterFogColor` / `waterFogDistance` / `skyColor` /
  `waterColor` / `grassColor` / `foliageColor` / `fallDustColor` / `ambientLight` /
  `particle`（含 `particleColor`）/ `biomeMusic` / `biomeMusicVolume`；
  设置颜色时自动补写 `override_*_color: true`（可显式覆盖）
- 实例链式 API：`set(biomeId, entry)` / `setFog(biomeId, fog)`（接受 `Fog` 实例或雾 id）/
  `remove(biomeId)`；常量 `BIOMES_CLIENT_PATH` 与辅助函数 `buildBiomeClientEntry(entry)` 一并导出
- `Resource.addBiomesClient(client)`：追加/合并写入 `biomes_client.json`（多次调用共存）
- 统一接线扩展：`mod.add(实例)` / `mod.define({ biomesClient })` / `mod.biomesClient(config)` 工厂
- 冒烟测试 69 → 71（`BiomesClient` 构建 + 合并写入 + 统一接线 + 工厂）

## [0.4.0] - 2026-09-22

### Added

- 粒子生成器（`Particle`：RP `particles/*.json` + 发射器/寿命/形状/外观助手）
- 地物与地物规则（`Feature` / `FeatureRule`：BP `features/*.json` / `feature_rules/*.json` + `oreFeature` / `singleBlockFeature`）
- 生物群系生成器（`Biome`：BP `biomes/*.json` + `climate` / `surfaceParameters` / `biomeTags`）
- 雾效生成器（`Fog`：RP `fogs/*.json`，含 air/water/lava 距离层与体积雾）
- 统一接线扩展：`mod.add(实例)` / `mod.define({ particles, features, featureRules, biomes })` / `mod.particle` 等 5 个工厂
- 公共助手 `shortName()`（去命名空间短名，与 `itemShortName` 语义一致）
- 冒烟测试 65 → 69

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
- 冒烟测试 57 → 65；example 与 README 改为统一接线写法

## [0.2.0] - 2026-09-22

### Added

- CLI 工具：`spawnmodbe init` 一键生成可编译的 TypeScript 模组工程
  - 生成的工程包含 `package.json`（`spawnmodbe` 依赖 + `build`/`pack` 脚本）、
    `tsconfig.json`、`src/index.ts`（示例模组 + 可选 SAPI 入口）、`.gitignore`、`README.md`
  - 支持 `--name` / `--description` / `--author` / `--no-sapi` / `--force` / `--no-install`
  - 执行 `npm run pack` 即可产出 `out/<名称>.mcaddon`
  - 零运行时依赖，仅使用 Node 内置模块；`bin` 指向 `dist/cli.js`
- 修复发布入口：`main` / `exports` / `types` 指向扁平构建目录 `dist/index.js`（此前指向仅在测试构建存在的 `dist/src/`）
- 冒烟测试新增 5 项 CLI 用例（init no-sapi / 默认名 + sapi / 非空目录拒绝 / `--force` 覆盖 / `--version`+`--help`），共 57 项

## [0.1.0] - 2026-09-21

### Added

- SpawnModBE 框架首个可用版本：核心类（`ModMain` / `Behavior` / `Resource`）、
  确定性 UUID 池、零依赖 ZIP 写入、目录批量复制、写盘与 `.mcpack` / `.mcaddon` 打包
- 物品 / 工具 / 护甲 / 食物 / 燃料 / 可投掷 / 放置器 / 唱片（RecordDisc）
- 配方（无型 / 有型 / 熔炉 / 酿造混合 / 酿造容器）与战利品表（加权池 + 层级池 + 函数 + 条件）
- 实体体系（`EntityBP` / `EntityRP` / `RenderController` / `SpawnRules`）
- RP 模块（`LangFile` / `ItemTextureAtlas` / `Attachable` / `SoundBatch`）
- 物品动态模型（`DynamicItemModel`：几何 + 附着 + 动画三文件）、实体帧序列动画（`FrameSequence`）
- 村庄交易表（`TradeTable` + 附魔函数）、方块生成器（states/traits/permutations）、方块纹理动画（`FlipbookTextures`）
- JSON UI 生成器（`UiFile` / `UiDefs` / `UiGlobalVariables`）+ 面向对象元素系统
- 链式 set 方法（`Item` / `Block` / `EntityBP`）
