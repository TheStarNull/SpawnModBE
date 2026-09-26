/**
 * Example: reproduce the "霜月之刃" (Frost Moon Blade) addon with the
 * SpawnModBE API, upgraded to engine 1.26.50.
 *
 * Recreates the `.mcaddon` shipped in `downloads/[苦力怕论坛][1.21.20++]霜月.mcaddon`:
 *  - `yw:yw_sword` blade item + attachable + 36-frame animated render controller
 *  - a custom `minecraft:player` behavior entity (sword-use events)
 *  - a `yw:lightning` colored-lightning entity (7 variants)
 *  - a SAPI `@minecraft/server` script and command functions
 *
 * Every content type is authored through a framework module: items, behavior
 * entities, resource entities, attachable, render controllers, animations,
 * animation controllers, materials (`Material`), entity geometry models
 * (`EntityModel`), command functions (`McFunction`), the SAPI script
 * (`ScriptFile`), sounds (`addSound`) and pack icons (`setIcon`). Only the
 * binary textures are imported from `example/frostmoon-assets/` via `addDirectory`.
 * The JSON payloads (entity components, animation bodies, controller states,
 * model boxes, material definitions) are read verbatim from the original addon
 * and re-emitted through those modules. Engine is pinned to 1.26.50.
 *
 * Run with: `npm run example:frostmoon`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  Animation,
  AnimationController,
  Attachable,
  EntityBP,
  EntityModel,
  EntityRP,
  Item,
  Material,
  McFunction,
  ModMain,
  RenderController,
  ScriptFile,
  type EntityEvent,
} from '../src/index.js';

const ASSETS = resolve('example/frostmoon-assets');

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(ASSETS, rel), 'utf8')) as T;
}

function readBuffer(rel: string): Buffer {
  return readFileSync(resolve(ASSETS, rel));
}

interface NestedJson {
  format_version?: string;
  animations?: Record<string, Record<string, unknown>>;
  animation_controllers?: Record<string, { initial_state?: string; states: Record<string, unknown> }>;
  'minecraft:entity'?: {
    description: Record<string, unknown>;
    components?: Record<string, unknown>;
    component_groups?: Record<string, Record<string, unknown>>;
    events?: Record<string, unknown>;
  };
  'minecraft:client_entity'?: {
    description: {
      identifier?: string;
      materials?: Record<string, string>;
      textures?: Record<string, string>;
      geometry?: Record<string, string>;
      render_controllers?: Array<string | Record<string, string>>;
      animations?: Record<string, string>;
      scripts?: {
        scale?: string | number;
        initialize?: string[];
        pre_animation?: string[];
        animate?: Array<string | Record<string, unknown>>;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Mod descriptor — engine 1.26.50, SAPI module bound to a 2.x runtime.
// ---------------------------------------------------------------------------
const mod = new ModMain({
  name: '霜月之刃',
  description: '§7§o一把平平无奇的剑与武器',
  author: 'yw',
  version: [1, 0, 1],
  minEngineVersion: [1, 26, 50],
  sapi: {
    entry: 'scripts/yw/main.js',
    language: 'javascript',
    runtimeVersion: '2.10.0',
  },
  uuid: { seed: 'frostmoon-yw' },
});

const rp = mod.resource;
const bp = mod.behavior!;

// ---------------------------------------------------------------------------
// Item: `yw:yw_sword` — the blade.
// ---------------------------------------------------------------------------
const sword = new Item({
  identifier: 'yw:yw_sword',
  name: '霜月之刃',
  displayName: '霜月之刃\n§o§7一把平平无奇的剑\n\n§b+ §1i§3n§5f§7i§9n§8i§6t§4y§3§7攻击伤害',
  category: 'equipment',
  maxStackSize: 1,
  handEquipped: true,
  glint: true,
  allowOffHand: false,
  iconTexture: 'yw',
  texturePath: 'textures/items/sword',
  // The original item only sets `can_always_eat` (no nutrition/saturation).
  // A non-zero `use_duration` is required in 1.21.20+ for `minecraft:food`,
  // and it doubles as the hold-to-charge window the script watches via
  // itemStartUse / itemStopUse (72000 ticks ≈ never completes while held).
  useModifiers: { useDuration: 72000 },
  components: { 'minecraft:food': { can_always_eat: true } },
});
mod.add(sword);

// ---------------------------------------------------------------------------
// Behavior-pack player entity (sword-use events) + colored lightning entity.
// ---------------------------------------------------------------------------
function buildBpEntity(rel: string): EntityBP {
  const doc = readJson<NestedJson>(rel);
  const ent = doc['minecraft:entity']!;
  const d = ent.description;
  return new EntityBP({
    identifier: d.identifier as string,
    isSpawnable: d.is_spawnable === true,
    isSummonable: d.is_summonable !== false,
    isExperimental: d.is_experimental === true,
    scripts: d.scripts as { animate?: Array<string | Record<string, unknown>> },
    animations: d.animations as Record<string, string>,
    components: ent.components ?? {},
    componentGroups: ent.component_groups ?? {},
    events: ent.events as unknown as Record<string, EntityEvent>,
    formatVersion: doc.format_version ?? '1.19.40',
  });
}

const playerBp = buildBpEntity('bp/entities/player.json');
const lightningBp = buildBpEntity('bp/entities/ColoredLightning/Lightning.json');
mod.add(playerBp, lightningBp);

// ---------------------------------------------------------------------------
// Resource-pack client entities (player + colored lightning).
// ---------------------------------------------------------------------------
function buildRpEntity(rel: string): EntityRP {
  const doc = readJson<NestedJson>(rel);
  const d = doc['minecraft:client_entity']!.description;
  return new EntityRP({
    identifier: d.identifier as string,
    materials: d.materials,
    textures: d.textures,
    geometry: d.geometry,
    renderControllers: d.render_controllers,
    animations: d.animations,
    scripts: d.scripts,
    enableAttachables: true,
    formatVersion: doc.format_version ?? '1.10.0',
  });
}

const playerRp = buildRpEntity('rp/entity/player.json');
const lightningRp = buildRpEntity('rp/entity/ColoredLightning/lightning.json');
mod.add(playerRp, lightningRp);

// ---------------------------------------------------------------------------
// Attachable + render controllers for the blade and the lightning.
// ---------------------------------------------------------------------------
const textures: Record<string, string> = { default: 'textures/items/.t/18' };
for (let i = 0; i < 36; i++) {
  textures[`item${i}`] = `textures/items/.t/${i}`;
}

const bladeAttachable = new Attachable({
  identifier: 'yw:yw_sword',
  materials: { default: 'entity_alphatest', enchanted: 'entity_alphatest_glint' },
  textures,
  geometry: { default: 'geometry.sc' },
  animations: { wield: 'animation.wield', charging: 'animation.charging' },
  preAnimation: [
    'variable.charge_amount = math.clamp((query.main_hand_item_max_duration - (query.main_hand_item_use_duration - query.frame_alpha + 1.0)) / 10.0, 0.0, 1.0f);',
  ],
  scriptsAnimate: ['wield', { charging: 'query.main_hand_item_use_duration > 0.0f && c.is_first_person' }],
  renderControllers: ['controller.render.yw.animate'],
});

const bladeRc = new RenderController({
  id: 'controller.render.yw.animate',
  geometry: 'Geometry.default',
  materials: [{ '*': 'Material.default' }],
  textures: ['array.swords[(query.anim_time*12)]'],
  arrays: {
    textures: {
      'array.swords': Array.from({ length: 36 }, (_, i) => `texture.item${i}`),
    },
  },
  formatVersion: '1.8.0',
});

const lightningRc = new RenderController({
  id: 'controller.render.colored.lightning',
  geometry: 'Geometry.default',
  materials: [{ '*': 'Material.default' }],
  textures: ['Array.skins[query.mark_variant]'],
  arrays: {
    textures: {
      'Array.skins': [
        'Texture.air',
        'Texture.red',
        'Texture.orange',
        'Texture.yellow',
        'Texture.green',
        'Texture.blue',
        'Texture.indigo',
        'Texture.purple',
      ],
    },
  },
  overlayColor: { r: 1, g: 1, b: 1, a: 1 },
  lightColorMultiplier: 1.0,
  ignoreLighting: true,
  formatVersion: '1.10.0',
});

mod.add(bladeAttachable, bladeRc, lightningRc);

// ---------------------------------------------------------------------------
// Animations + animation controllers, rebuilt through the API classes.
// ---------------------------------------------------------------------------
function addRpAnimationSources(rel: string): void {
  const doc = readJson<NestedJson>(rel);
  for (const [id, entry] of Object.entries(doc.animations ?? {})) {
    const { loop, animation_length, ...rest } = entry;
    rp.addAnimation(new Animation({
      identifier: id,
      loop: loop as boolean,
      animationLength: animation_length as number | undefined,
      body: rest,
      formatVersion: doc.format_version,
    }), `animations/${rel.split('/').pop()!}`);
  }
}

addRpAnimationSources('rp/animations/sc.json');
addRpAnimationSources('rp/animations/lightning.json');
addRpAnimationSources('rp/animations/player.animation.json');
addRpAnimationSources('rp/animations/player_firstperson.animation.json');

// Behavior-pack animation (`animation.test`) drives the sword-use events.
{
  const doc = readJson<NestedJson>('bp/animations/test.json');
  for (const [id, entry] of Object.entries(doc.animations ?? {})) {
    const { loop, animation_length, ...rest } = entry;
    bp.addAnimation(new Animation({
      identifier: id,
      loop: loop as boolean,
      animationLength: animation_length as number | undefined,
      body: rest,
      formatVersion: doc.format_version,
    }));
  }
}

// Resource-pack animation controllers (player base/root/first-person attack).
{
  const doc = readJson<NestedJson>('rp/animation_controllers/player.json');
  for (const [id, ctl] of Object.entries(doc.animation_controllers ?? {})) {
    rp.addAnimationController(new AnimationController({
      identifier: id,
      initialState: ctl.initial_state ?? 'default',
      states: ctl.states,
      formatVersion: doc.format_version,
    }), 'animation_controllers/player.json');
  }
}

// ---------------------------------------------------------------------------
// Sound: the Java-style lightning impact (OGG + sound definition).
// ---------------------------------------------------------------------------
rp.addSound(
  'ambient.weather.lightning.java.impact',
  'sounds/lightning_java',
  { loadOnLowMemory: true, minDistance: 100.0, category: 'hostile' },
  readBuffer('rp/sounds/lightning_java.ogg'),
);

// ---------------------------------------------------------------------------
// Materials + entity geometry models, rebuilt through the API classes.
// The original `materials/entity.material` and `models/entity/*.json` payloads
// are read verbatim and re-emitted through the Material / EntityModel modules.
// ---------------------------------------------------------------------------
{
  const doc = readJson<{ materials: Record<string, unknown> }>('rp/materials/entity.material');
  const { version, ...defs } = doc.materials;
  const materials: Record<string, Record<string, unknown>> = {};
  for (const [name, def] of Object.entries(defs)) {
    materials[name] = (def ?? {}) as Record<string, unknown>;
  }
  rp.addMaterial(new Material({
    fileName: 'entity.material',
    version: typeof version === 'string' ? version : undefined,
    materials,
  }));
}

for (const rel of ['sc', 'rl', 'lightning']) {
  const doc = readJson<{
    format_version?: string;
    'minecraft:geometry'?: Array<{ description?: Record<string, unknown>; bones?: Record<string, unknown>[] }>;
  }>(`rp/models/entity/${rel}.json`);
  for (const geo of doc['minecraft:geometry'] ?? []) {
    rp.addModel(
      new EntityModel({
        identifier: geo.description?.identifier as string,
        description: geo.description,
        bones: geo.bones ?? [],
        formatVersion: doc.format_version,
      }),
      `models/entity/${rel}.json`
    );
  }
}

// ---------------------------------------------------------------------------
// Command functions (BP) + the SAPI script, through their modules.
// ---------------------------------------------------------------------------
bp.addFunction(new McFunction({
  name: 'yw',
  tick: true,
  commands: ['gamerule keepinventory true', 'gamerule functioncommandlimit 0', 'function yw'],
}));
bp.addScriptFile(new ScriptFile('yw/main.js', readBuffer('bp/scripts/yw/main.js').toString('utf8')));

// ---------------------------------------------------------------------------
// Pack icons from the original addon via the pack API.
// ---------------------------------------------------------------------------
bp.setIcon(readBuffer('bp/pack_icon.png'));
rp.setIcon(readBuffer('rp/pack_icon.png'));

// ---------------------------------------------------------------------------
// Import the remaining binary assets (textures). Everything else is authored
// through the framework modules above.
// ---------------------------------------------------------------------------
await rp.addDirectory(resolve(ASSETS, 'rp'), {
  ignore: ['entity', 'animations', 'animation_controllers', 'materials', 'models', 'sounds', 'pack_icon.png'],
});

// ---------------------------------------------------------------------------
// Write the packs and bundle a `.mcaddon` for engine 1.26.50.
// ---------------------------------------------------------------------------
await mod.writeTo('out/frostmoon');
const addon = mod.toMcaddon();
writeFileSync('out/frostmoon_1.26.50.mcaddon', addon);

console.log('\n=== 霜月之刃 reproduced via SpawnModBE (min_engine_version 1.26.50) ===');
console.log(`Behavior manifest: ${JSON.stringify(mod.buildBehaviorPackManifest(), null, 2)}`);
console.log(`Resource manifest: ${JSON.stringify(mod.buildResourcePackManifest(), null, 2)}`);
console.log(`\nBP files: ${bp.listFilesPublic().map((f) => f.path).length}`);
console.log(`RP files: ${rp.listFilesPublic().map((f) => f.path).length}`);
console.log(`\nWrote out/frostmoon_1.26.50.mcaddon (${addon.length} bytes)`);
