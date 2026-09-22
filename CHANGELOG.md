# Changelog

本项目的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
