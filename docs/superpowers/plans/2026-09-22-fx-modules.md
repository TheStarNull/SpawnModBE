# FX 模块（粒子 / 地物 / 群系 / 雾）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `Particle` / `Feature` / `FeatureRule` / `Biome` / `Fog` 五个生成器模块，并接入统一接线（`mod.add` / `mod.define` / 工厂方法），产品代码通过 TDD 逐步落地，最后升到 0.4.0。

**Architecture:** 每个模块族一个单文件生成器类（核心字段强类型 + `components`/`body` 宽松），统一走 `readonly config` 保存已填默认值、`fileName` 去命名空间短名、`buildJson()` 输出文件体。BP 侧入 `Behavior`（particle/feature/featureRule/biome），RP 侧入 `Resource`（fog）；`routing.ts` 加类型与分支，`ModMain` 加 5 个工厂，`src/index.ts` 桶导出。

**Tech Stack:** TypeScript（strict + `noUnusedLocals`/`noUnusedParameters`）、ESM（`"type":"module"` + `.js` 导入后缀）、Node 内置 assert 冒烟测试。

**Spec:** `docs/fx-modules-spec.md`

## Global Constraints

- 只增不改：现有 `Behavior` / `Resource` / `ModMain` / `routing.ts` 行为零变化，既有 65 项断言原样通过。
- 严格 TS + `noUnusedLocals` / `noUnusedParameters`；零运行时依赖（仅 Node 内置模块）。
- 导入一律走正树桶导出（`src/*/index.js`），不引入循环依赖；`routing.ts` 对 `ModMain` 仅做类型导入。
- 文件短名 = 去 `namespace:` 前缀，统一用 `src/util.ts` 新增的 `shortName(identifier)`；`itemShortName` 保留不动。
- 默认值可序列化、`buildJson` 不输出 `undefined` 键；只输出已填字段 + 已解析默认值。
- 格式版本默认值：Particle `'1.10.0'`、Feature `'1.13.0'`、FeatureRule `'1.13.0'`、Biome `'1.13.0'`、Fog `'1.16.100'`。
- 纯 RP 模组添加 BP 侧模块（Particle/Feature/FeatureRule/Biome）必须抛「没有行为包」错误。
- README 测试数 65 → 69；`CHANGELOG.md` 新增 0.4.0；版本 0.3.0 → 0.4.0（`package.json` + `package-lock.json`）。

## Review Focus

1. 纯 RP 模组 `mod.add(new Particle(...))` 抛「没有行为包」而非「Unsupported」→ 由 Task 5 在 `testRoutingErrors` 中补断言钉住。
2. `shortName` 与 `itemShortName` 语义一致，现有类不受影响 → Task 1 在 `testParticle` 中钉住 `fileName`。
3. 默认值可序列化、不产生 `undefined` 键 → 各模块 `buildJson` 单测钉住关键键存在且不 `undefined`。
4. `mod.add()` 无参 / 空 `define` 分组保持 no-op；重复添加不产生重复文件（`addFile` 覆盖语义）→ 由 Task 1-5 已有测试与 Task 6 扩展共同保证。
5. 新助手为纯函数、不依赖框架外部状态 → 各模块 helper 形状断言钉住。

---

### Task 1: `shortName` + `Particle` 生成器 + `Behavior.addParticle`

**Files:**
- Modify: `src/util.ts`（在 `normalizeZipPath` 之后追加 `shortName`）
- Create: `src/particle/Particle.ts`
- Create: `src/particle/index.ts`
- Modify: `src/Behavior.ts`（顶部 import + 新增 `addParticle`）
- Modify: `src/index.ts`（导出 `Particle` 及助手/类型）
- Test: `test/smoke.test.ts`（imports + `testParticle` + 底部运行列表）

**Interfaces:**
- Consumes: `shortName`（本任务定义）、`Behavior.addFile` / `Behavior.hasFile`
- Produces: `Particle` 类（`identifier`/`fileName`/`buildJson`）、`ParticleConfig` / `ResolvedParticleConfig` / `BillboardOptions` 类型、helper `emitterRateInstant` / `emitterRateSteady` / `emitterLifetimeOnce` / `emitterLifetimeLooping` / `emitterShapePoint` / `emitterShapeSphere` / `particleLifetime` / `billboard` / `tint`、`Behavior.addParticle(p: Particle): string`

- [ ] **Step 1: 写失败测试**（追加到 `test/smoke.test.ts`，在 import 列表 `setCount,` 之后加 `Particle,` `emitterRateInstant,` `emitterRateSteady,` `particleLifetime,` `tint,`；在底部运行列表 `testAddItemName();` 之前加 `testParticle();`）

```ts
function testParticle() {
  const particle = new Particle({
    identifier: 'mymod:ruby_spark',
    components: { ...emitterRateInstant(20), ...particleLifetime(2) },
  });
  assert.equal(particle.fileName, 'ruby_spark.json', 'shortName strips namespace');
  const json = particle.buildJson() as AnyObj;
  const eff = json.particle_effect as AnyObj;
  assert.equal(eff.description.identifier, 'mymod:ruby_spark');
  assert.equal(eff.description.basic_render_parameters.texture, 'textures/particle/particles');
  assert.equal(eff.description.basic_render_parameters.material, 'particles_alpha');
  assert.equal((eff.components as AnyObj)['minecraft:emitter_rate_instant'].num_particles, 20);
  assert.deepStrictEqual(emitterRateInstant(20), { 'minecraft:emitter_rate_instant': { num_particles: 20 } });
  assert.ok((emitterRateSteady(5, 100) as AnyObj)['minecraft:emitter_rate_steady']);
  assert.ok((tint('#ff0000') as AnyObj)['minecraft:particle_appearance_tinting']);

  const bp = new Behavior({ name: 'FX', author: 'a', version: [1, 0, 0], uuid: { seed: 'fx-bp' } });
  const path = bp.addParticle(particle);
  assert.equal(path, 'particles/ruby_spark.json');
  assert.ok(bp.hasFile('particles/ruby_spark.json'));
  console.log('[ok] Particle generates and lands on the behavior pack');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run build:test 2>&1 | tail -15`
Expected: `error TS2305: Module '.../src/index.js' has no exported member 'Particle'`（或 `TS2339` `addParticle` 不存在）

- [ ] **Step 3: 最小实现**

`src/util.ts` 末尾追加：
```ts
/** Strips the `namespace:` prefix from an identifier, returning the short name. */
export function shortName(identifier: string): string {
  const idx = identifier.indexOf(':');
  return idx >= 0 ? identifier.slice(idx + 1) : identifier;
}
```

新建 `src/particle/Particle.ts`（完整内容见下方）：
```ts
/**
 * The `Particle` class — a behavior-pack particle effect generator.
 *
 * Particles live at BP/particles/<shortName>.json and are wrapped in a
 * `particle_effect` node. This class keeps the high-frequency render fields
 * strongly typed and lets the rest flow through a loose `components` object.
 */
import { shortName } from '../util.js';

/** Configuration accepted by {@link Particle}. */
export interface ParticleConfig {
  /** The particle identifier, e.g. `'mymod:ruby_spark'`. */
  identifier: string;
  /** The render texture path (default `'textures/particle/particles'`). */
  texture?: string;
  /** The render material (default `'particles_alpha'`). */
  material?: string;
  /** Loose emitter / lifetime / shape / appearance components. */
  components?: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.10.0'`). */
  formatVersion?: string;
}

/** The resolved particle configuration (all defaults filled in). */
export interface ResolvedParticleConfig {
  identifier: string;
  texture: string;
  material: string;
  components: Record<string, unknown>;
  formatVersion: string;
}

/** Options accepted by {@link billboard}. */
export interface BillboardOptions {
  /** Texture UV rectangle `[u, v, width, height]`. */
  uv?: [number, number, number, number];
  /** Texture UV size `[width, height]`. */
  textureSize?: [number, number];
  /** Face mode, e.g. `'camera_emitter'` (default `'rotate_xyz'`). */
  orientation?: string;
}

/** Builds a `minecraft:emitter_rate_instant` component. */
export function emitterRateInstant(numParticles: number): Record<string, unknown> {
  return { 'minecraft:emitter_rate_instant': { num_particles: numParticles } };
}

/** Builds a `minecraft:emitter_rate_steady` component. */
export function emitterRateSteady(rate: number, maxParticles: number): Record<string, unknown> {
  return { 'minecraft:emitter_rate_steady': { rate, max_particles: maxParticles } };
}

/** Builds a `minecraft:emitter_lifetime_once` component. */
export function emitterLifetimeOnce(activeTime: number): Record<string, unknown> {
  return { 'minecraft:emitter_lifetime_once': { active_time: activeTime } };
}

/** Builds a `minecraft:emitter_lifetime_looping` component. */
export function emitterLifetimeLooping(activeTime: number, sleepTime?: number): Record<string, unknown> {
  const body: Record<string, unknown> = { active_time: activeTime };
  if (sleepTime !== undefined) body.sleep_time = sleepTime;
  return { 'minecraft:emitter_lifetime_looping': body };
}

/** Builds a `minecraft:emitter_shape_point` component. */
export function emitterShapePoint(offset: [number, number, number]): Record<string, unknown> {
  return { 'minecraft:emitter_shape_point': { offset: [...offset] } };
}

/** Options accepted by {@link emitterShapeSphere}. */
export interface EmitterShapeSphereOptions { direction?: 'inward' | 'outward'; axis?: string; }

/** Builds a `minecraft:emitter_shape_sphere` component. */
export function emitterShapeSphere(radius: number, options?: EmitterShapeSphereOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { radius: radius, direction: options?.direction ?? 'inward' };
  if (options?.axis) body.axis = options.axis;
  return { 'minecraft:emitter_shape_sphere': body };
}

/** Builds a `minecraft:particle_lifetime_expression` component. */
export function particleLifetime(maxLifetime: number): Record<string, unknown> {
  return { 'minecraft:particle_lifetime_expression': { max_lifetime: maxLifetime } };
}

/** Builds a `minecraft:particle_appearance_billboard` component. */
export function billboard(size: [number, number], options?: BillboardOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    size: size.map((n) => [n, n]),
    facing_camera_mode: options?.orientation ?? 'rotate_xyz',
  };
  const w = options?.textureSize?.[0] ?? size[0] * 16;
  const h = options?.textureSize?.[1] ?? size[1] * 16;
  body.uv = { texture_width: w, texture_height: h, uv: options?.uv ?? [0, 0, size[0], size[1]] };
  return { 'minecraft:particle_appearance_billboard': body };
}

/** Builds a `minecraft:particle_appearance_tinting` component. */
export function tint(color: string | [number, number, number, number]): Record<string, unknown> {
  const value = typeof color === 'string' ? color : { r: color[0], g: color[1], b: color[2], a: color[3] };
  return { 'minecraft:particle_appearance_tinting': { color: value } };
}

export class Particle {
  /** The fully-resolved configuration. */
  readonly config: ResolvedParticleConfig;

  constructor(config: ParticleConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Particle requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      texture: config.texture ?? 'textures/particle/particles',
      material: config.material ?? 'particles_alpha',
      components: { ...(config.components ?? {}) },
      formatVersion: config.formatVersion ?? '1.10.0',
    };
  }

  /** The particle identifier. */
  get identifier(): string { return this.config.identifier; }

  /** The file base name (identifier with namespace stripped). */
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  /** Builds the particle-effect JSON. */
  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      particle_effect: {
        description: {
          identifier: this.identifier,
          basic_render_parameters: { material: this.config.material, texture: this.config.texture },
        },
        components: { ...this.config.components },
      },
    };
  }
}
```

新建 `src/particle/index.ts`：
```ts
export { Particle } from './Particle.js';
export type { ParticleConfig, ResolvedParticleConfig, BillboardOptions } from './Particle.js';
export {
  emitterRateInstant,
  emitterRateSteady,
  emitterLifetimeOnce,
  emitterLifetimeLooping,
  emitterShapePoint,
  emitterShapeSphere,
  particleLifetime,
  billboard,
  tint,
} from './Particle.js';
```

`src/Behavior.ts`：在 import 区加 `import { type Particle } from './particle/index.js';`，并在 `addBlock` 之后追加：
```ts
  /**
   * Adds a particle effect to the behavior pack.
   * Writes the particle JSON to `particles/<shortName>.json`.
   * @param particle The particle definition.
   * @returns The pack-relative path that was written.
   */
  addParticle(particle: Particle): string {
    const path = `particles/${particle.fileName}`;
    this.addFile(path, JSON.stringify(particle.buildJson(), null, 2));
    return path;
  }
```

`src/index.ts`：在 `export { Block } from './block/index.js';` 之后追加：
```ts
export { Particle } from './particle/index.js';
export type { ParticleConfig, ResolvedParticleConfig, BillboardOptions } from './particle/index.js';
export {
  emitterRateInstant,
  emitterRateSteady,
  emitterLifetimeOnce,
  emitterLifetimeLooping,
  emitterShapePoint,
  emitterShapeSphere,
  particleLifetime,
  billboard,
  tint,
} from './particle/index.js';
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，末尾 `All SpawnModBE smoke tests passed.`，含 `[ok] Particle generates and lands on the behavior pack`

- [ ] **Step 5: Commit**

```bash
git add src/util.ts src/particle src/Behavior.ts src/index.ts test/smoke.test.ts
git commit -m "feat(fx): Particle generator + Behavior.addParticle + shortName"
```

---

### Task 2: `Feature` + `FeatureRule` 生成器 + `Behavior.addFeature` / `addFeatureRule`

**Files:**
- Create: `src/feature/Feature.ts`
- Create: `src/feature/FeatureRule.ts`
- Create: `src/feature/index.ts`
- Modify: `src/Behavior.ts`（imports + 两个方法）
- Modify: `src/index.ts`（导出）
- Test: `test/smoke.test.ts`（imports + `testFeatureAndFeatureRule` + 运行列表）

**Interfaces:**
- Consumes: `shortName`、`Behavior.addFile` / `hasFile`
- Produces: `Feature` / `FeatureRule` 类、`FeatureConfig` / `FeatureRuleConfig` / `FeatureRuleDistribution` 类型、工厂助手 `oreFeature` / `singleBlockFeature`、`Behavior.addFeature(f): string` / `Behavior.addFeatureRule(r): string`

- [ ] **Step 1: 写失败测试**（imports 加 `Feature,` `FeatureRule,` `oreFeature,`；底部运行列表加 `testFeatureAndFeatureRule();`，置于 `testParticle();` 之后）

```ts
function testFeatureAndFeatureRule() {
  const ore = oreFeature({
    identifier: 'mymod:ruby_ore',
    count: 8,
    replaceRules: [{ placesBlock: 'mymod:ruby_ore', mayReplace: ['minecraft:stone'] }],
  });
  assert.ok(ore instanceof Feature, 'oreFeature returns a Feature');
  const fj = ore.buildJson() as AnyObj;
  assert.equal((fj['minecraft:ore_feature'] as AnyObj).description.identifier, 'mymod:ruby_ore');
  const rr = (fj['minecraft:ore_feature'] as AnyObj).replace_rules as AnyObj[];
  assert.equal(rr[0].places_block, 'mymod:ruby_ore');

  const rule = new FeatureRule({
    identifier: 'mymod:ruby_ore',
    placesFeature: 'mymod:ruby_ore',
    biomeFilter: { test: 'has_biome_tag', operator: '==', value: 'overworld' },
    distribution: { iterations: 5 },
  });
  assert.equal(rule.fileName, 'ruby_ore.json');
  const rj = rule.buildJson() as AnyObj;
  const cond = (rj['minecraft:feature_rules'] as AnyObj).condition as AnyObj;
  assert.equal(cond.iterations, 5);
  assert.equal(cond.scatter_chance, 100, 'distribution default scatter_chance');
  assert.equal(cond.coordinate_eval_order ?? cond.coordinateEvalOrder, 'xyz');
  assert.ok(cond['minecraft:biome_filter'], 'biome filter carried');

  const bp = new Behavior({ name: 'FX', author: 'a', version: [1, 0, 0], uuid: { seed: 'fx-bp2' } });
  assert.equal(bp.addFeature(ore), 'features/ruby_ore.json');
  assert.equal(bp.addFeatureRule(rule), 'feature_rules/ruby_ore.json');
  assert.ok(bp.hasFile('features/ruby_ore.json'));
  assert.ok(bp.hasFile('feature_rules/ruby_ore.json'));
  console.log('[ok] Feature/FeatureRule generate and land on the behavior pack');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run build:test 2>&1 | tail -15`
Expected: `error TS2305: ... has no exported member 'Feature'` 或 `TS2339: Property 'addFeature' does not exist`

- [ ] **Step 3: 最小实现**

新建 `src/feature/Feature.ts`：
```ts
import { shortName } from '../util.js';

/** Configuration accepted by {@link Feature}. */
export interface FeatureConfig {
  /** The feature identifier, e.g. `'mymod:ruby_ore'`. */
  identifier: string;
  /** The feature type key, e.g. `'minecraft:ore_feature'`. */
  type: string;
  /** Type-specific payload (count / replace_rules / canopy ...). */
  body: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.13.0'`). */
  formatVersion?: string;
}

/** The resolved feature configuration. */
export interface ResolvedFeatureConfig extends FeatureConfig { formatVersion: string; }

export class Feature {
  readonly config: ResolvedFeatureConfig;

  constructor(config: FeatureConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Feature requires a non-empty "identifier".');
    }
    if (!config.type || config.type.trim() === '') {
      throw new Error('Feature requires a non-empty "type".');
    }
    this.config = { ...config, formatVersion: config.formatVersion ?? '1.13.0' };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      [this.config.type]: {
        description: { identifier: this.identifier },
        ...this.config.body,
      },
    };
  }
}

/** Builds an ore feature ({@link Feature}) from common options. */
export function oreFeature(config: {
  identifier: string;
  count: number;
  replaceRules: Array<{ placesBlock: string; mayReplace?: string[] }>;
  formatVersion?: string;
}): Feature {
  return new Feature({
    identifier: config.identifier,
    type: 'minecraft:ore_feature',
    body: {
      count: config.count,
      replace_rules: config.replaceRules.map((r) => ({
        places_block: r.placesBlock,
        ...(r.mayReplace ? { may_replace: r.mayReplace } : {}),
      })),
    },
    formatVersion: config.formatVersion,
  });
}

/** Builds a single-block feature ({@link Feature}) from common options. */
export function singleBlockFeature(config: {
  identifier: string;
  placesBlock: string;
  mayReplace?: string[];
  formatVersion?: string;
}): Feature {
  const body: Record<string, unknown> = { places_block: config.placesBlock };
  if (config.mayReplace) body.may_replace = config.mayReplace;
  return new Feature({ identifier: config.identifier, type: 'minecraft:single_block_feature', body, formatVersion: config.formatVersion });
}
```

新建 `src/feature/FeatureRule.ts`：
```ts
import { shortName } from '../util.js';

/** Distribution parameters for a feature rule. Config keys are camelCase; JSON uses snake_case. */
export interface FeatureRuleDistribution {
  iterations?: number;
  coordinateEvalOrder?: 'xyz' | 'zyx';
  x?: number | string;
  y?: number | string;
  z?: number | string;
  scatterChance?: number;
}

/** Configuration accepted by {@link FeatureRule}. */
export interface FeatureRuleConfig {
  identifier: string;
  placesFeature: string;
  placementPass?: string;
  biomeFilter?: unknown;
  distribution?: FeatureRuleDistribution;
  formatVersion?: string;
}

/** The resolved feature-rule configuration (defaults filled in). */
export interface ResolvedFeatureRuleConfig extends FeatureRuleConfig {
  placementPass: string;
  distribution: {
    iterations: number;
    coordinateEvalOrder: 'xyz' | 'zyx';
    x: number | string;
    y: number | string;
    z: number | string;
    scatterChance: number;
  };
  formatVersion: string;
}

export class FeatureRule {
  readonly config: ResolvedFeatureRuleConfig;

  constructor(config: FeatureRuleConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('FeatureRule requires a non-empty "identifier".');
    }
    if (!config.placesFeature || config.placesFeature.trim() === '') {
      throw new Error('FeatureRule requires a non-empty "placesFeature".');
    }
    const d = config.distribution ?? {};
    this.config = {
      ...config,
      placementPass: config.placementPass ?? 'surface_pass',
      distribution: {
        iterations: d.iterations ?? 1,
        coordinateEvalOrder: d.coordinateEvalOrder ?? 'xyz',
        x: d.x ?? 0,
        y: d.y ?? 'query.heightmap(variable.worldx, variable.worldz)',
        z: d.z ?? 0,
        scatterChance: d.scatterChance ?? 100,
      },
      formatVersion: config.formatVersion ?? '1.13.0',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    const d = this.config.distribution;
    const condition: Record<string, unknown> = {
      iterations: d.iterations,
      coordinate_eval_order: d.coordinateEvalOrder,
      x: d.x,
      y: d.y,
      z: d.z,
      scatter_chance: d.scatterChance,
    };
    if (this.config.biomeFilter !== undefined) {
      condition['minecraft:biome_filter'] = this.config.biomeFilter;
    }
    return {
      format_version: this.config.formatVersion,
      'minecraft:feature_rules': {
        description: { identifier: this.identifier },
        placement_pass: this.config.placementPass,
        condition,
      },
    };
  }
}
```

新建 `src/feature/index.ts`：
```ts
export { Feature, oreFeature, singleBlockFeature } from './Feature.js';
export type { FeatureConfig, ResolvedFeatureConfig } from './Feature.js';
export { FeatureRule } from './FeatureRule.js';
export type { FeatureRuleConfig, FeatureRuleDistribution, ResolvedFeatureRuleConfig } from './FeatureRule.js';
```

`src/Behavior.ts`：import 区加 `import { type Feature, type FeatureRule } from './feature/index.js';`；在 `addParticle` 之后追加：
```ts
  addFeature(feature: Feature): string {
    const path = `features/${feature.fileName}`;
    this.addFile(path, JSON.stringify(feature.buildJson(), null, 2));
    return path;
  }

  addFeatureRule(rule: FeatureRule): string {
    const path = `feature_rules/${rule.fileName}`;
    this.addFile(path, JSON.stringify(rule.buildJson(), null, 2));
    return path;
  }
```

`src/index.ts`：在 Particle 导出之后追加：
```ts
export { Feature, oreFeature, singleBlockFeature } from './feature/index.js';
export type { FeatureConfig, ResolvedFeatureConfig } from './feature/index.js';
export { FeatureRule } from './feature/index.js';
export type { FeatureRuleConfig, FeatureRuleDistribution, ResolvedFeatureRuleConfig } from './feature/index.js';
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，含 `[ok] Feature/FeatureRule generate and land on the behavior pack`

- [ ] **Step 5: Commit**

```bash
git add src/feature src/Behavior.ts src/index.ts test/smoke.test.ts
git commit -m "feat(fx): Feature + FeatureRule generators + BP hooks"
```

---

### Task 3: `Biome` 生成器 + `Behavior.addBiome`

**Files:**
- Create: `src/biome/Biome.ts`
- Create: `src/biome/index.ts`
- Modify: `src/Behavior.ts`（imports + `addBiome`）
- Modify: `src/index.ts`（导出）
- Test: `test/smoke.test.ts`（imports + `testBiome` + 运行列表）

**Interfaces:**
- Consumes: `shortName`、`Behavior.addFile` / `hasFile`
- Produces: `Biome` 类、`BiomeConfig` / `ResolvedBiomeConfig` / `ClimateOptions` 类型、helper `climate` / `surfaceParameters` / `biomeTags`、`Behavior.addBiome(b): string`

- [ ] **Step 1: 写失败测试**（imports 加 `Biome,` `climate,` `surfaceParameters,` `biomeTags,`；底部运行列表在 `testFeatureAndFeatureRule();` 之后加 `testBiome();`）

```ts
function testBiome() {
  const biome = new Biome({
    identifier: 'mymod:ruby_plains',
    components: {
      ...climate(0.5, 0.4, { humidity: 0.3 }),
      ...surfaceParameters({ top: 'minecraft:grass', mid: 'minecraft:dirt', sea: 'minecraft:water', foundation: 'minecraft:stone' }),
      ...biomeTags('overworld', 'ruby'),
    },
  });
  assert.equal(biome.fileName, 'ruby_plains.json');
  const bj = biome.buildJson() as AnyObj;
  const comps = (bj['minecraft:biome'] as AnyObj).components as AnyObj;
  assert.equal(comps['minecraft:climate'].temperature, 0.5);
  assert.equal(comps['minecraft:surface_parameters'].top_material, 'minecraft:grass');
  assert.deepStrictEqual(comps['minecraft:tags'].tags, ['overworld', 'ruby']);
  assert.ok((biomeTags('a') as AnyObj)['minecraft:tags'], 'biomeTags helper shape');

  const bp = new Behavior({ name: 'FX', author: 'a', version: [1, 0, 0], uuid: { seed: 'fx-bp3' } });
  assert.equal(bp.addBiome(biome), 'biomes/ruby_plains.json');
  assert.ok(bp.hasFile('biomes/ruby_plains.json'));
  console.log('[ok] Biome generates and lands on the behavior pack');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run build:test 2>&1 | tail -15`
Expected: `error TS2305: ... has no exported member 'Biome'` 或 `TS2339: Property 'addBiome' does not exist`

- [ ] **Step 3: 最小实现**

新建 `src/biome/Biome.ts`：
```ts
import { shortName } from '../util.js';

/** Configuration accepted by {@link Biome}. */
export interface BiomeConfig {
  /** The biome identifier, e.g. `'mymod:ruby_plains'`. */
  identifier: string;
  /** Loose biome components (climate / surface_parameters / tags ...). */
  components?: Record<string, unknown>;
  /** The manifest `format_version` (default `'1.13.0'`). */
  formatVersion?: string;
}

/** The resolved biome configuration. */
export interface ResolvedBiomeConfig { identifier: string; components: Record<string, unknown>; formatVersion: string; }

/** Options accepted by {@link climate}. */
export interface ClimateOptions { humidity?: number; temperatureModifier?: 'frozen' | 'none'; }

/** Builds a `minecraft:climate` component. */
export function climate(temperature: number, downfall: number, options?: ClimateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { temperature, downfall };
  if (options?.humidity !== undefined) body.humidity = options.humidity;
  if (options?.temperatureModifier !== undefined) body.temperature_modifier = options.temperatureModifier;
  return { 'minecraft:climate': body };
}

/** Builds a `minecraft:surface_parameters` component. */
export function surfaceParameters(config: { top: string; mid: string; sea: string; foundation: string }): Record<string, unknown> {
  return {
    'minecraft:surface_parameters': {
      top_material: config.top,
      mid_material: config.mid,
      sea_material: config.sea,
      foundation_material: config.foundation,
    },
  };
}

/** Builds a `minecraft:tags` component. */
export function biomeTags(...tags: string[]): Record<string, unknown> {
  return { 'minecraft:tags': { tags: [...tags] } };
}

export class Biome {
  readonly config: ResolvedBiomeConfig;

  constructor(config: BiomeConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Biome requires a non-empty "identifier".');
    }
    this.config = {
      identifier: config.identifier,
      components: { ...(config.components ?? {}) },
      formatVersion: config.formatVersion ?? '1.13.0',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    return {
      format_version: this.config.formatVersion,
      'minecraft:biome': {
        description: { identifier: this.identifier },
        components: { ...this.config.components },
      },
    };
  }
}
```

新建 `src/biome/index.ts`：
```ts
export { Biome, climate, surfaceParameters, biomeTags } from './Biome.js';
export type { BiomeConfig, ResolvedBiomeConfig, ClimateOptions } from './Biome.js';
```

`src/Behavior.ts`：import 区加 `import { type Biome } from './biome/index.js';`；在 `addFeatureRule` 之后追加：
```ts
  addBiome(biome: Biome): string {
    const path = `biomes/${biome.fileName}`;
    this.addFile(path, JSON.stringify(biome.buildJson(), null, 2));
    return path;
  }
```

`src/index.ts`：在 Feature 导出之后追加：
```ts
export { Biome, climate, surfaceParameters, biomeTags } from './biome/index.js';
export type { BiomeConfig, ResolvedBiomeConfig, ClimateOptions } from './biome/index.js';
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，含 `[ok] Biome generates and lands on the behavior pack`

- [ ] **Step 5: Commit**

```bash
git add src/biome src/Behavior.ts src/index.ts test/smoke.test.ts
git commit -m "feat(fx): Biome generator + helpers + Behavior.addBiome"
```

---

### Task 4: `Fog` 生成器 + `Resource.addFog`

**Files:**
- Create: `src/fog/Fog.ts`
- Create: `src/fog/index.ts`
- Modify: `src/Resource.ts`（imports + `addFog`）
- Modify: `src/index.ts`（导出）
- Test: `test/smoke.test.ts`（imports + `testFog` + 运行列表）

**Interfaces:**
- Consumes: `shortName`、`Resource.addFile` / `hasFile`
- Produces: `Fog` 类、`FogConfig` / `FogDistanceLayer` / `ResolvedFogConfig` 类型、`Resource.addFog(f): string`

- [ ] **Step 1: 写失败测试**（imports 加 `Fog,`；底部运行列表在 `testBiome();` 之后加 `testFog();`）

```ts
function testFog() {
  const fog = new Fog({
    identifier: 'mymod:ruby_fog',
    distance: { air: { fog_start: 0, fog_end: 100, fog_color: '#FFAAAA', render_distance_type: 'render' } },
  });
  assert.equal(fog.fileName, 'ruby_fog.json');
  const fj = fog.buildJson() as AnyObj;
  const settings = fj['minecraft:fog_settings'] as AnyObj;
  assert.equal(settings.description.identifier, 'mymod:ruby_fog');
  const air = settings.distance.air as AnyObj;
  assert.equal(air.fog_color, '#FFAAAA');
  assert.equal(air.render_distance_type, 'render');
  const waterDefault = new Fog({ identifier: 'mymod:w_fog', distance: { water: { fog_start: 1, fog_end: 2, fog_color: '#0000FF' } } }).buildJson() as AnyObj;
  assert.equal(((waterDefault['minecraft:fog_settings'] as AnyObj).distance.water as AnyObj).render_distance_type, 'fixed', 'render_distance_type defaults to fixed');

  const rp = new Resource({ name: 'FX RP', author: 'a', version: [1, 0, 0], uuid: { seed: 'fx-rp' } });
  assert.equal(rp.addFog(fog), 'fogs/ruby_fog.json');
  assert.ok(rp.hasFile('fogs/ruby_fog.json'));
  console.log('[ok] Fog generates and lands on the resource pack');
}
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run build:test 2>&1 | tail -15`
Expected: `error TS2305: ... has no exported member 'Fog'` 或 `TS2339: Property 'addFog' does not exist`

- [ ] **Step 3: 最小实现**

新建 `src/fog/Fog.ts`：
```ts
import { shortName } from '../util.js';

/** A single distance-fog layer for one medium (air / water / lava). */
export interface FogDistanceLayer {
  fog_start: number;
  fog_end: number;
  fog_color: string;
  render_distance_type?: 'fixed' | 'render';
  transition_fog_start?: number;
  transition_fog_end?: number;
}

/** The resolved distance-fog layer (defaults filled in). */
export interface ResolvedFogDistanceLayer extends FogDistanceLayer { render_distance_type: 'fixed' | 'render'; }

/** Configuration accepted by {@link Fog}. */
export interface FogConfig {
  identifier: string;
  distance?: { air?: FogDistanceLayer; water?: FogDistanceLayer; lava?: FogDistanceLayer };
  volumetric?: Record<string, unknown>;
  formatVersion?: string;
}

/** The resolved fog configuration. */
export interface ResolvedFogConfig {
  identifier: string;
  distance?: { air?: ResolvedFogDistanceLayer; water?: ResolvedFogDistanceLayer; lava?: ResolvedFogDistanceLayer };
  volumetric: Record<string, unknown>;
  formatVersion: string;
}

function resolveLayer(layer: FogDistanceLayer | undefined): ResolvedFogDistanceLayer | undefined {
  if (!layer) return undefined;
  return { ...layer, render_distance_type: layer.render_distance_type ?? 'fixed' };
}

export class Fog {
  readonly config: ResolvedFogConfig;

  constructor(config: FogConfig) {
    if (!config || typeof config.identifier !== 'string' || config.identifier.trim() === '') {
      throw new Error('Fog requires a non-empty "identifier".');
    }
    const distance = config.distance
      ? {
          air: resolveLayer(config.distance.air),
          water: resolveLayer(config.distance.water),
          lava: resolveLayer(config.distance.lava),
        }
      : undefined;
    this.config = {
      identifier: config.identifier,
      distance,
      volumetric: { ...(config.volumetric ?? {}) },
      formatVersion: config.formatVersion ?? '1.16.100',
    };
  }

  get identifier(): string { return this.config.identifier; }
  get fileName(): string { return `${shortName(this.identifier)}.json`; }

  buildJson(): Record<string, unknown> {
    const distance: Record<string, unknown> = {};
    const d = this.config.distance;
    if (d?.air) distance.air = this.buildLayer(d.air);
    if (d?.water) distance.water = this.buildLayer(d.water);
    if (d?.lava) distance.lava = this.buildLayer(d.lava);
    const settings: Record<string, unknown> = { description: { identifier: this.identifier } };
    if (Object.keys(distance).length > 0) settings.distance = distance;
    if (Object.keys(this.config.volumetric).length > 0) settings.volumetric = this.config.volumetric;
    return { format_version: this.config.formatVersion, 'minecraft:fog_settings': settings };
  }

  private buildLayer(layer: ResolvedFogDistanceLayer): Record<string, unknown> {
    const out: Record<string, unknown> = {
      fog_start: layer.fog_start,
      fog_end: layer.fog_end,
      fog_color: layer.fog_color,
      render_distance_type: layer.render_distance_type,
    };
    if (layer.transition_fog_start !== undefined) out.transition_fog_start = layer.transition_fog_start;
    if (layer.transition_fog_end !== undefined) out.transition_fog_end = layer.transition_fog_end;
    return out;
  }
}
```

新建 `src/fog/index.ts`：
```ts
export { Fog } from './Fog.js';
export type { FogConfig, FogDistanceLayer, ResolvedFogConfig, ResolvedFogDistanceLayer } from './Fog.js';
```

`src/Resource.ts`：import 区加 `import { type Fog } from './fog/index.js';`；在 `addFlipbookTexture` 之后追加：
```ts
  /**
   * Adds a fog definition to the resource pack.
   * Writes the fog JSON to `fogs/<shortName>.json`.
   * @param fog The fog definition.
   * @returns The pack-relative path that was written.
   */
  addFog(fog: Fog): string {
    const path = `fogs/${fog.fileName}`;
    this.addFile(path, JSON.stringify(fog.buildJson(), null, 2));
    return path;
  }
```

`src/index.ts`：在 Biome 导出之后追加：
```ts
export { Fog } from './fog/index.js';
export type { FogConfig, FogDistanceLayer, ResolvedFogConfig, ResolvedFogDistanceLayer } from './fog/index.js';
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，含 `[ok] Fog generates and lands on the resource pack`

- [ ] **Step 5: Commit**

```bash
git add src/fog src/Resource.ts src/index.ts test/smoke.test.ts
git commit -m "feat(fx): Fog generator + Resource.addFog"
```

---

### Task 5: `routing.ts` 新类型 / define 分组 / 分支 + index 导出收尾

**Files:**
- Modify: `src/routing.ts`（imports、`Addable`、`DefineSpec`、`routeEntry` 分支、`unsupportedError`）
- Test: `test/smoke.test.ts`（`testRoutingErrors` 补纯 RP 断言）

**Interfaces:**
- Consumes: `Particle` / `Feature` / `FeatureRule` / `Biome` / `Fog`（前序任务）、`ModMain.behavior` / `ModMain.resource`
- Produces: `Addable` 扩充、`DefineSpec.particles/features/featureRules/biomes` + `rp` 加入 `Fog`、`routeEntry` 5 个分支、更新后的 `unsupportedError` 文案

- [ ] **Step 1: 写失败测试**（在 `testRoutingErrors()` 中、`console.log` 之前追加一行）

```ts
  const rpParticle = new ModMain({ name: 'RP Particle', uuid: { seed: 'rp-particle' } });
  assert.throws(() => rpParticle.add(new Particle({ identifier: 'x:y' })), /no behavior pack/);
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test 2>&1 | tail -15`
Expected: 失败于新增断言（当前 `mod.add(new Particle(...))` 抛的是「Unsupported entry」，不匹配 `/no behavior pack/`）

- [ ] **Step 3: 实现**

`src/routing.ts`：import 区追加：
```ts
import { Particle } from './particle/index.js';
import { Feature, FeatureRule } from './feature/index.js';
import { Biome } from './biome/index.js';
import { Fog } from './fog/index.js';
```

`Addable` union 追加（在 `| FlipbookTextures` 之后）：
```ts
  | Particle
  | Feature
  | FeatureRule
  | Biome
  | Fog
```

`DefineSpec` 新增分组（在 `ui?` 之后）：
```ts
  particles?: Particle[];
  features?: Feature[];
  featureRules?: FeatureRule[];
  biomes?: Biome[];
```
并将 `rp?` 行改为：
```ts
  rp?: (LangFile | ItemTextureAtlas | Attachable | SoundBatch | DynamicItemModel | FrameSequence | FlipbookTextures | Fog)[];
```

`routeEntry` 中、`if (entry instanceof FlipbookTextures) { ... }` 之后、`throw unsupportedError(entry);` 之前追加：
```ts
  if (entry instanceof Particle) { requireBehavior(mod, 'particle'); mod.behavior!.addParticle(entry); return; }
  if (entry instanceof Feature) { requireBehavior(mod, 'feature'); mod.behavior!.addFeature(entry); return; }
  if (entry instanceof FeatureRule) { requireBehavior(mod, 'feature rule'); mod.behavior!.addFeatureRule(entry); return; }
  if (entry instanceof Biome) { requireBehavior(mod, 'biome'); mod.behavior!.addBiome(entry); return; }
  if (entry instanceof Fog) { mod.resource.addFog(entry); return; }
```

`unsupportedError` 文案更新为（补充新类型）：
```ts
    `Unsupported entry for mod.add(): ${typeLabel(entry)}. Supported: items (Item/Tools/Armor/Food/Fuel/Throwable/BlockPlacer/EntityPlacer/RecordDisc), Block, EntityBP/EntityRP/RenderController/SpawnRules, recipes, LootTable/TradeTable (path required), UiFile/UiDefs/UiGlobalVariables, LangFile/ItemTextureAtlas/Attachable/SoundBatch/DynamicItemModel/FrameSequence/FlipbookTextures, Particle, Feature/FeatureRule, Biome, Fog.`
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，`testRoutingErrors` 新增断言通过

- [ ] **Step 5: Commit**

```bash
git add src/routing.ts test/smoke.test.ts
git commit -m "feat(fx): route Particle/Feature/FeatureRule/Biome/Fog in mod.add/define"
```

---

### Task 6: `ModMain` 工厂 + `define` 分组展开 + 接线扩展断言

**Files:**
- Modify: `src/ModMain.ts`（imports、`define` 分组展开、5 个工厂）
- Test: `test/smoke.test.ts`（在 `testParticle` / `testFeatureAndFeatureRule` / `testBiome` / `testFog` 中追加工厂与 `define` 断言）

**Interfaces:**
- Consumes: 5 个新类与 `*Config` 类型、`addAndReturn`
- Produces: `mod.particle` / `mod.feature` / `mod.featureRule` / `mod.biome` / `mod.fog` 工厂

- [ ] **Step 1: 写失败测试**（在 4 个测试函数的 `console.log` 之前各自追加）

`testParticle` 追加：
```ts
  const mod = new ModMain({ name: 'PFactory', sapi: 'scripts/main.js', uuid: { seed: 'p-factory' } });
  const fp = mod.particle({ identifier: 'mymod:gem_spark' });
  assert.ok(fp instanceof Particle && mod.behavior!.hasFile('particles/gem_spark.json'), 'particle factory wires');
  mod.define({ particles: [new Particle({ identifier: 'mymod:xyz' })] });
  assert.ok(mod.behavior!.hasFile('particles/xyz.json'), 'define({ particles }) routes');
```

`testFeatureAndFeatureRule` 追加：
```ts
  const mod = new ModMain({ name: 'FFactory', sapi: 'scripts/main.js', uuid: { seed: 'f-factory' } });
  const ff = mod.feature({ identifier: 'mymod:tree', type: 'minecraft:tree_feature', body: {} });
  assert.ok(ff instanceof Feature && mod.behavior!.hasFile('features/tree.json'), 'feature factory wires');
  const fr = mod.featureRule({ identifier: 'mymod:tree', placesFeature: 'mymod:tree' });
  assert.ok(fr instanceof FeatureRule && mod.behavior!.hasFile('feature_rules/tree.json'), 'featureRule factory wires');
  mod.define({ features: [ff], featureRules: [fr] });
```

`testBiome` 追加：
```ts
  const mod = new ModMain({ name: 'BFactory', sapi: 'scripts/main.js', uuid: { seed: 'b-factory' } });
  const fb = mod.biome({ identifier: 'mymod:plains' });
  assert.ok(fb instanceof Biome && mod.behavior!.hasFile('biomes/plains.json'), 'biome factory wires');
  mod.define({ biomes: [new Biome({ identifier: 'mymod:desert' })] });
  assert.ok(mod.behavior!.hasFile('biomes/desert.json'), 'define({ biomes }) routes');
```

`testFog` 追加：
```ts
  const mod = new ModMain({ name: 'FogFactory', sapi: 'scripts/main.js', uuid: { seed: 'fog-factory' } });
  const ff = mod.fog({ identifier: 'mymod:night_fog' });
  assert.ok(ff instanceof Fog && mod.resource.hasFile('fogs/night_fog.json'), 'fog factory wires');
  mod.define({ rp: [new Fog({ identifier: 'mymod:day_fog' })] });
  assert.ok(mod.resource.hasFile('fogs/day_fog.json'), 'define({ rp: [fog] }) routes');
```

- [ ] **Step 2: 运行确认失败**

Run: `npm run build:test 2>&1 | tail -15`
Expected: `error TS2339: Property 'particle' does not exist on type 'ModMain'`（或对应各工厂）

- [ ] **Step 3: 实现**

`src/ModMain.ts`：import 区追加：
```ts
import { Particle } from './particle/index.js';
import { Feature, FeatureRule } from './feature/index.js';
import { Biome } from './biome/index.js';
import { Fog } from './fog/index.js';
import type { ParticleConfig } from './particle/index.js';
import type { FeatureConfig, FeatureRuleConfig } from './feature/index.js';
import type { BiomeConfig } from './biome/index.js';
import type { FogConfig } from './fog/index.js';
```

`define` 方法体更新（把新分组展开在 `...(spec.rp ?? [])` 之前）：
```ts
      ...(spec.particles ?? []),
      ...(spec.features ?? []),
      ...(spec.featureRules ?? []),
      ...(spec.biomes ?? []),
```

`ui(config)` 之后追加 5 个工厂：
```ts
  /** Constructs + wires a {@link Particle}. */
  particle(config: ParticleConfig): Particle { return this.addAndReturn(new Particle(config)); }
  /** Constructs + wires a {@link Feature}. */
  feature(config: FeatureConfig): Feature { return this.addAndReturn(new Feature(config)); }
  /** Constructs + wires a {@link FeatureRule}. */
  featureRule(config: FeatureRuleConfig): FeatureRule { return this.addAndReturn(new FeatureRule(config)); }
  /** Constructs + wires a {@link Biome}. */
  biome(config: BiomeConfig): Biome { return this.addAndReturn(new Biome(config)); }
  /** Constructs + wires a {@link Fog}. */
  fog(config: FogConfig): Fog { return this.addAndReturn(new Fog(config)); }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test 2>&1 | tail -15`
Expected: 全绿，末尾 `All SpawnModBE smoke tests passed.`（69 项，含 4 个新 `[ok]`）

- [ ] **Step 5: Commit**

```bash
git add src/ModMain.ts test/smoke.test.ts
git commit -m "feat(fx): ModMain factories (particle/feature/featureRule/biome/fog) + define groups"
```

---

### Task 7: README / CHANGELOG / 版本 0.4.0 / 全量验证 / 提交与推送

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` / `package-lock.json`（0.4.0）
- Test: 全量 `npm test` / `npm run build` / `cli --version`

**Interfaces:**
- Consumes: Task 1-6 全部产物
- Produces: 0.4.0 发布版本 + 文档

- [ ] **Step 1: 版本与 CHANGELOG**

```bash
npm version 0.4.0 --no-git-tag-version
```

`CHANGELOG.md` 顶部插入：
```md
## [0.4.0] - 2026-09-22

### Added

- 粒子生成器（`Particle`：BP `particles/*.json` + 发射器/寿命/形状/外观助手）
- 地物与地物规则（`Feature` / `FeatureRule`：BP `features/*.json` / `feature_rules/*.json` + `oreFeature` / `singleBlockFeature`）
- 生物群系生成器（`Biome`：BP `biomes/*.json` + `climate` / `surfaceParameters` / `biomeTags`）
- 雾效生成器（`Fog`：RP `fogs/*.json`，含 air/water/lava 距离层与体积雾）
- 统一接线扩展：`mod.add(实例)` / `mod.define({ particles, features, featureRules, biomes })` / `mod.particle` 等 5 个工厂
- 公共助手 `shortName()`（去命名空间短名，与 `itemShortName` 语义一致）
- 冒烟测试 65 → 69
```

- [ ] **Step 2: README**

- 特性列表追加 4 项（粒子 / 地物 / 群系 / 雾）。
- 项目结构树 `src/` 下追加 `particle/`、`feature/`、`biome/`、`fog/` 4 个目录。
- 新增「✨ 粒子 / 地物 / 群系 / 雾」章节，含最短可用示例与雾效 `client_biome.json` 指派说明。
- 冒烟测试数 65 → 69（`grep -n '65' README.md` 定位并改）。
- Roadmap 追加 `- [x] 粒子 / 地物 / 群系 / 雾生成器（Particle / Feature / Biome / Fog）`。

- [ ] **Step 3: 全量验证**

Run: `npm test 2>&1 | tail -30`
Expected: 全绿，末尾 `All SpawnModBE smoke tests passed.`
Run: `npm run build 2>&1 | tail -5 && node dist/cli.js --version`
Expected: build 无错误；输出 `0.4.0`

- [ ] **Step 4: 提交与推送**

```bash
git add -A
git commit -m "feat(fx): particle/feature/biome/fog modules (0.4.0)

- Particle/Feature/FeatureRule/Biome/Fog generators + helpers
- mod.add/define/5 factories route the new generators
- shortName helper; README/CHANGELOG; 65 -> 69 smoke tests"
git push origin main
```

---

## Self-Review（静态核对已完成）

- **Spec 覆盖**：3.1 粒子（Task 1）、3.2 地物+规则（Task 2）、3.3 群系（Task 3）、3.4 雾效（Task 4）、4.1 挂接（Task 1-4）、4.2 路由（Task 5）、4.3 define/工厂（Task 5-6）、4.4 导出（Task 1-4）、5 兼容（Task 1-7）、6 测试（Task 1-6）、7 版本/文档（Task 7）。
- **占位符扫描**：无 TBD /「加适当校验」类占位；每个代码步骤含实际代码与命令。
- **类型一致性**：`shortName`（Task 1）被 Particle/Feature/FeatureRule/Biome/Fog 复用；`ParticleConfig` 等类型在 Task 1-4 定义并在 Task 6 工厂复用；`Addable` / `DefineSpec` 在 Task 5 扩充；`rp` 类型加入 `Fog`。
- **Review Focus 映射**：① 纯 RP 报错 → Task 5 断言；② `shortName` 一致 → Task 1；③ 默认值可序列化 → 各模块 `buildJson` 断言；④ no-op / 去重 → Task 1-5 已有测试 + Task 6 扩展；⑤ helper 纯函数 → 各模块 helper 形状断言。
- **关键裁决（明示）**：`FeatureRule` 配置属性用 camelCase（`coordinateEvalOrder` / `scatterChance`），但输出 JSON 用官方 snake_case（`coordinate_eval_order` / `scatter_chance`），与规格示例（`replace_rules` / `places_block` / `fog_start`）一致；分布默认值一律解析并输出（「已填充默认值」语义）。
