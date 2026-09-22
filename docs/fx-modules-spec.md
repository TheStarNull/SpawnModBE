# SpawnModBE 生成器模块扩展 — 粒子 / 地物 / 生物群系 / 雾效 设计规格

- 状态：**待评审**（评审通过后才进入实施计划）
- 目标版本：0.4.0
- 范围：新增四个生成器模块族 —— 粒子（Particle）、地物（Feature）+ 地物规则（FeatureRule）、
  生物群系（Biome）、雾效（Fog），并接入统一接线（`mod.add` / `mod.define` / 工厂方法）

---

## 1. 背景与目标

0.3.0 建立了统一接线 API（`mod.add` / `mod.define` / 工厂方法），但目前生成器品类仍集中在
物品 / 方块 / 实体 / 配方 / 战利品 / 交易 / UI / RP 模块。世界生成与视觉特效侧（粒子、地物、
群系、雾）只能靠用户手写 JSON 或用 `addFile` 裸塞，没有类型辅助也没有接线入口。

目标：

1. **补齐高频生成器品类**：粒子、地物 + 地物规则、生物群系、雾效四个模块族，全部遵循现有
   「核心字段强类型 + 组件体宽松」的类设计风格。
2. **零门槛接入统一接线**：每个新品类都能 `mod.add(实例)`、`mod.define({...})`、
   `mod.xxx(config)` 工厂创建即接线。
3. **完全向后兼容**：现有 API 全部保留，本改动只做加法，不删不改旧方法、不改已有测试语义。

## 2. 范围

做：

- `src/particle/Particle.ts`：粒子效果生成器（BP 侧 `particles/<短名>.json`）
- `src/feature/Feature.ts` + `src/feature/FeatureRule.ts`：
  地物（BP 侧 `features/<短名>.json`）与地物规则（BP 侧 `feature_rules/<短名>.json`）
- `src/biome/Biome.ts`：生物群系生成器（BP 侧 `biomes/<短名>.json`）
- `src/fog/Fog.ts`：雾效生成器（RP 侧 `fogs/<短名>.json`）
- 每个模块族的高频小助手函数（与 `setCount` / `killedByPlayer` 同风格）
- `Behavior` / `Resource` 挂接方法、`routing.ts` 路由分支、`DefineSpec` 新分组、
  `ModMain` 5 个新工厂、`src/index.ts` 导出
- 冒烟测试、README、CHANGELOG、版本 0.4.0

不做（本版本）：

- 全量枚举 MCBE 官方组件表面（粒子/群系组件体保持 `Record<string, unknown>` 宽松，
  仅高频字段强类型）
- 粒子贴图资源生成（用户自备 `textures/particle/*.png`）
- `client_biome.json` 雾效指派联动（本版本只生成 `fogs/*.json`，指派方式在 README 说明）
- Molang 表达式校验 / 地物放置合法性的运行时检查
- 删除或重命名任何现有方法

## 3. 模块 API 设计

四个模块族统一约定：

- 类名为单数大写（`Particle` / `Feature` / `FeatureRule` / `Biome` / `Fog`），构造器收一个
  `*Config` 对象，`readonly config` 保存**已填充默认值**的配置。
- `identifier` 必填且非空；文件短名 = 去掉 `namespace:` 前缀（与 `EntityBP.fileName` 同规则，
  抽到 `util.ts` 的 `shortName(identifier)` 复用）。
- 各生成 `buildJson(): object`，返回完整文件体；`formatVersion` 可覆盖，默认值符合官方格式版本。

### 3.1 粒子 Particle（BP）

生成文件：`particles/<短名>.json`，官方格式 `format_version: "1.10.0"`：

```json
{
  "format_version": "1.10.0",
  "particle_effect": {
    "description": {
      "identifier": "mymod:ruby_spark",
      "basic_render_parameters": {
        "material": "particles_alpha",
        "texture": "textures/particle/particles"
      }
    },
    "components": {}
  }
}
```

```ts
export interface ParticleConfig {
  /** 粒子标识符，如 `'mymod:ruby_spark'`。 */
  identifier: string;
  /** 渲染贴图路径，默认 `'textures/particle/particles'`。 */
  texture?: string;
  /** 渲染材质，默认 `'particles_alpha'`（可选 `particles_blend` / `particles_opaque`）。 */
  material?: string;
  /** 发射器 / 寿命 / 形状 / 外观组件体（宽松）。 */
  components?: Record<string, unknown>;
  /** 覆盖格式版本，默认 `'1.10.0'`。 */
  formatVersion?: string;
}
```

高频助手（返回组件体片段，可展开进 `components`）：

| 助手 | 生成的组件 |
| --- | --- |
| `emitterRateInstant(numParticles)` | `minecraft:emitter_rate_instant` |
| `emitterRateSteady(rate, maxParticles)` | `minecraft:emitter_rate_steady` |
| `emitterLifetimeOnce(activeTime)` | `minecraft:emitter_lifetime_once` |
| `emitterLifetimeLooping(activeTime, sleepTime?)` | `minecraft:emitter_lifetime_looping` |
| `emitterShapePoint(offset)` | `minecraft:emitter_shape_point` |
| `emitterShapeSphere(radius, options?)` | `minecraft:emitter_shape_sphere` |
| `particleLifetime(maxLifetime)` | `minecraft:particle_lifetime_expression` |
| `billboard(size, options?)` | `minecraft:particle_appearance_billboard`（含 uv/flipbook/朝向） |
| `tint(color)` | `minecraft:particle_appearance_tinting` |

### 3.2 地物 Feature + 地物规则 FeatureRule（BP）

生成文件：`features/<短名>.json` 与 `feature_rules/<短名>.json`，官方格式
`format_version: "1.13.0"`：

```json
{
  "format_version": "1.13.0",
  "minecraft:ore_feature": {
    "description": { "identifier": "mymod:ruby_ore" },
    "count": 8,
    "replace_rules": [
      { "places_block": "mymod:ruby_ore", "may_replace": ["minecraft:stone"] }
    ]
  }
}
```

```ts
export interface FeatureConfig {
  /** 地物标识符，如 `'mymod:ruby_ore'`。 */
  identifier: string;
  /** 地物类型键，如 `'minecraft:ore_feature'` / `'minecraft:tree_feature'`。 */
  type: string;
  /** 类型专属载荷（count / replace_rules / canopy / trunk ...）。 */
  body: Record<string, unknown>;
  formatVersion?: string; // 默认 '1.13.0'
}
```

地物助手：`oreFeature({ identifier, count, replaceRules })`、
`singleBlockFeature({ identifier, placesBlock, mayReplace? })` —— 构造即返回 `Feature` 实例。

```ts
export interface FeatureRuleConfig {
  /** 规则标识符（可与地物标识符同名，如 `'mymod:ruby_ore'`）。 */
  identifier: string;
  /** 该规则放置的地物标识符。 */
  placesFeature: string;
  /** 放置阶段，默认 `'surface_pass'`。 */
  placementPass?: string;
  /** 生物群系过滤（宽松），如 `{ test: 'has_biome_tag', operator: '==', value: 'overworld' }`。 */
  biomeFilter?: unknown;
  /** 分布参数。 */
  distribution?: {
    iterations?: number;              // 默认 1
    coordinateEvalOrder?: 'xyz' | 'zyx'; // 默认 'xyz'
    x?: number | string;              // 默认 0
    y?: number | string;              // 默认 'query.heightmap(variable.worldx, variable.worldz)'
    z?: number | string;              // 默认 0
    scatterChance?: number;           // 默认 100
  };
  formatVersion?: string;             // 默认 '1.13.0'
}
```

### 3.3 生物群系 Biome（BP）

生成文件：`biomes/<短名>.json`，官方格式 `format_version: "1.13.0"`：

```json
{
  "format_version": "1.13.0",
  "minecraft:biome": {
    "description": { "identifier": "mymod:ruby_plains" },
    "components": {
      "minecraft:climate": { "temperature": 0.5, "downfall": 0.4 },
      "minecraft:surface_parameters": {
        "top_material": "minecraft:grass",
        "mid_material": "minecraft:dirt",
        "sea_material": "minecraft:water",
        "foundation_material": "minecraft:stone"
      }
    }
  }
}
```

```ts
export interface BiomeConfig {
  /** 群系标识符，如 `'mymod:ruby_plains'`。 */
  identifier: string;
  /** 群系组件体（climate / surface_parameters / tags / 生成规则 ...），宽松。 */
  components?: Record<string, unknown>;
  formatVersion?: string; // 默认 '1.13.0'
}
```

高频助手：`climate(temperature, downfall, options?)`（`minecraft:climate`）、
`surfaceParameters({ top, mid, sea, foundation })`（`minecraft:surface_parameters`）、
`biomeTags(...tags)`（`minecraft:tags`）。

### 3.4 雾效 Fog（RP）

生成文件：`fogs/<短名>.json`，官方格式 `format_version: "1.16.100"`：

```json
{
  "format_version": "1.16.100",
  "minecraft:fog_settings": {
    "description": { "identifier": "mymod:ruby_fog" },
    "distance": {
      "air": {
        "fog_start": 0.0,
        "fog_end": 100.0,
        "fog_color": "#FFAAAA",
        "render_distance_type": "render",
        "transition_fog_start": 5.0,
        "transition_fog_end": 10.0
      }
    },
    "volumetric": {}
  }
}
```

```ts
export interface FogDistanceLayer {
  fog_start: number;
  fog_end: number;
  fog_color: string;                     // '#RRGGBB' 或 '#RRGGBBAA'
  render_distance_type?: 'fixed' | 'render'; // 默认 'fixed'
  transition_fog_start?: number;
  transition_fog_end?: number;
}

export interface FogConfig {
  /** 雾效标识符，如 `'mymod:ruby_fog'`。 */
  identifier: string;
  /** 三类介质距离雾（空气 / 水 / 岩浆），至少提供一层。 */
  distance?: { air?: FogDistanceLayer; water?: FogDistanceLayer; lava?: FogDistanceLayer };
  /** 体积雾（density / media_coefficients），宽松。 */
  volumetric?: Record<string, unknown>;
  formatVersion?: string;               // 默认 '1.16.100'
}
```

## 4. 集成改动

### 4.1 Behavior / Resource 挂接

`Behavior` 新增（全部走 `addFile` + `buildJson`，返回写入路径）：

| 方法 | 写入路径 |
| --- | --- |
| `addParticle(p: Particle): string` | `particles/<短名>.json` |
| `addFeature(f: Feature): string` | `features/<短名>.json` |
| `addFeatureRule(r: FeatureRule): string` | `feature_rules/<短名>.json` |
| `addBiome(b: Biome): string` | `biomes/<短名>.json` |

`Resource` 新增：

| 方法 | 写入路径 |
| --- | --- |
| `addFog(f: Fog): string` | `fogs/<短名>.json` |

### 4.2 routing.ts

`Addable` 追加 5 个类与对应 `DefineSpec` 分组：

| 输入 | 行为包侧 | 资源包侧 |
| --- | --- | --- |
| Particle | `addParticle` | — |
| Feature | `addFeature` | — |
| FeatureRule | `addFeatureRule` | — |
| Biome | `addBiome` | — |
| Fog | — | `addFog` |

四个 BP 侧模块沿用现有 `requireBehavior` 校验（纯 RP 模组添加时报「没有行为包」）。
`unsupportedError` 文案补上新类型。

### 4.3 define / 工厂

```ts
export interface DefineSpec {
  // ...现有分组不变...
  particles?: Particle[];
  features?: Feature[];
  featureRules?: FeatureRule[];
  biomes?: Biome[];
  rp?: (LangFile | ItemTextureAtlas | Attachable | SoundBatch
      | DynamicItemModel | FrameSequence | FlipbookTextures | Fog)[];
}
```

`ModMain` 新增 5 个工厂：`particle(config)` / `feature(config)` / `featureRule(config)` /
`biome(config)` / `fog(config)`，全部走现有 `addAndReturn`（创建即接线、返回实例可链式）。

### 4.4 导出

`src/particle/index.ts`、`src/feature/index.ts`、`src/biome/index.ts`、`src/fog/index.ts`
四个桶文件；`src/index.ts` 追加类与类型导出（与现有块结构一致）。

文件短名抽公共助手：`src/util.ts` 新增 `export function shortName(identifier: string): string`
（语义与 `itemShortName` 一致：去掉 `namespace:` 前缀），新类统一使用；`itemShortName` 保留不动。

## 5. 兼容性

- 只增不改：现有 `Behavior` / `Resource` / `ModMain` / `routing.ts` 行为零变化，
  既有 65 项测试断言全部原样通过。
- 新增导入全部走正树 `src/*/index.js` 桶导出，不引入循环依赖。
- 零运行时依赖（仅 Node 内置模块），strict TS + `noUnusedLocals` / `noUnusedParameters`。

## 6. 测试

沿用 `test/smoke.test.ts` 原生 assert 风格，每个测试打印一行 `[ok]` 并在底部运行列表追加：

1. `testParticle()` —— 构造 + `buildJson` 关键字段、`Behavior.addParticle` 落盘路径、
   `mod.particle` 工厂自动接线、`define({ particles })`、helper 片段形状。
2. `testFeatureAndFeatureRule()` —— 地物/规则 `buildJson`、落盘路径、`oreFeature` 助手、
   工厂与 `define({ features, featureRules })`。
3. `testBiome()` —— `buildJson`、落盘路径、`climate` / `surfaceParameters` / `biomeTags`
   助手、工厂与 `define({ biomes })`。
4. `testFog()` —— `buildJson` 关键字段、`Resource.addFog` 落盘路径、`mod.fog` 工厂、
   `define({ rp: [fog] })`。
5. 错误语义补 1 个断言：纯 RP 模组 `mod.add(new Particle(...))` 抛「没有行为包」。

冒烟测试计数 65 → **69**（4 个新 `[ok]`）。

## 7. 版本与文档

- `npm version 0.4.0 --no-git-tag-version`（同步 `package-lock.json`）
- `CHANGELOG.md` 新增 0.4.0 段落
- `README.md`：特性列表追加 4 项；新增「✨ 粒子 / 地物 / 群系 / 雾」章节（含最短可用示例与
  雾效指派说明）；项目结构追加 4 个目录；Roadmap 勾选；测试数 65 → 69
- 全部任务绿后推送 `origin/main`

## 8. 评审焦点（实现时逐条核对）

1. 四个 BP 侧模块在纯 RP 模组上添加 → 抛明确「没有行为包」错误（不静默）。
2. `shortName` 公共助手与 `itemShortName` 语义一致；三个现有类行为不受影响。
3. 所有新类默认值可序列化、不产生 `undefined` 键（`buildJson` 只输出已填字段）。
4. `mod.add()` 无参 / 空 `define` 分组保持 no-op；重复添加不产生重复文件（`addFile` 覆盖语义）。
5. 任何新助手都不依赖框架外部状态，纯函数可单测。
