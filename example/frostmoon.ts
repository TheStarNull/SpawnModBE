/**
 * Example: reproduce the "霜月之刃" (Frost Moon Blade) addon **mainly through
 * the SpawnModBE API**, upgraded to engine 1.26.50.
 *
 * Recreates the `.mcaddon` shipped in `downloads/[苦力怕论坛][1.21.20++]霜月.mcaddon`:
 *  - `yw:yw_sword` blade item + attachable + 36-frame animated render controller
 *  - a custom `minecraft:player` behavior entity (sword-use events)
 *  - a `yw:lightning` colored-lightning entity (7 variants)
 *  - a SAPI `@minecraft/server` script and command functions
 *
 * Authoring style:
 *  - Everything is emitted through framework modules; nothing is copied into
 *    the output packs by hand.
 *  - Custom content is authored **inline with the API**: the item, the player
 *    override (`Player`), the lightning behavior + client entities (its color /
 *    variant component groups are generated in a loop), the blade attachable +
 *    render controllers, the blade / attack animations, the materials and the
 *    blade / humanoid geometry models.
 *  - The player override goes through the high-level `Player` module
 *    (`minecraft:player`, BP + RP in one object).
 *  - Only genuinely external / bulky inputs are loaded from
 *    `example/frostmoon-assets/` and re-emitted through the modules: the two
 *    vanilla-derived player baseline files (a full player override must ship
 *    them wholesale or vanilla behavior is lost), the lightning keyframe
 *    animations, the player animation-controller dump, the lightning-bolt
 *    geometry, the SAPI script and the binary textures / sound / icons.
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
  Material,
  McFunction,
  ModMain,
  Player,
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
    description: {
      identifier?: string;
      is_spawnable?: boolean;
      is_summonable?: boolean;
      is_experimental?: boolean;
      scripts?: { animate?: Array<string | Record<string, unknown>> };
      animations?: Record<string, string>;
    };
    components?: Record<string, unknown>;
    component_groups?: Record<string, Record<string, unknown>>;
    events?: Record<string, unknown>;
  };
  'minecraft:client_entity'?: {
    description: {
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
// Item: `yw:yw_sword` — the blade (factory, auto-wired).
// ---------------------------------------------------------------------------
mod.item({
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

// ---------------------------------------------------------------------------
// Player override via the `Player` module — one object for both packs.
// The vanilla-derived definitions are loaded as baseline payloads and the
// module writes BP `entities/player.json` + RP `entity/player.entity.json`.
// ---------------------------------------------------------------------------
const playerBpDoc = readJson<NestedJson>('bp/entities/player.json');
const playerBpEnt = playerBpDoc['minecraft:entity']!;
const playerBpDesc = playerBpEnt.description;
const playerRpDoc = readJson<NestedJson>('rp/entity/player.json');
const playerRpDesc = playerRpDoc['minecraft:client_entity']!.description;

const player = new Player({
  behavior: {
    formatVersion: playerBpDoc.format_version ?? '1.8.0',
    isSpawnable: playerBpDesc.is_spawnable === true,
    isSummonable: playerBpDesc.is_summonable !== false,
    isExperimental: playerBpDesc.is_experimental === true,
    scripts: playerBpDesc.scripts,
    animations: playerBpDesc.animations,
    components: playerBpEnt.components ?? {},
    componentGroups: playerBpEnt.component_groups ?? {},
    events: playerBpEnt.events as unknown as Record<string, EntityEvent>,
  },
  client: {
    formatVersion: playerRpDoc.format_version ?? '1.10.0',
    materials: playerRpDesc.materials,
    textures: playerRpDesc.textures,
    geometry: playerRpDesc.geometry,
    renderControllers: playerRpDesc.render_controllers,
    animations: playerRpDesc.animations,
    scripts: playerRpDesc.scripts,
    enableAttachables: true,
  },
});

// Chain mutators are available on top of the baseline (deep-merge semantics) —
// e.g. `player.addPreAnimation('variable.extra = 1.0;')` when tweaking the
// addon later without touching the vanilla payload.
mod.add(player);

// ---------------------------------------------------------------------------
// Colored lightning entity: `yw:lightning`.
// The behavior entity is authored directly through the `EntityBP` API — the
// color / variant component groups are generated in a loop instead of loading
// a source file. The resource side is likewise written inline via `EntityRP`.
// ---------------------------------------------------------------------------
const LIGHTNING_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple'] as const;

const lightningComponentGroups: Record<string, Record<string, unknown>> = {
  del: { 'minecraft:explode': { fuseLength: 0.0, power: 0, fuseLit: true, causes_fire: false } },
};
for (let i = 0; i < LIGHTNING_COLORS.length; i++) {
  lightningComponentGroups[LIGHTNING_COLORS[i]] = { 'minecraft:mark_variant': { value: i + 1 } };
}
for (let i = 2; i <= 6; i++) {
  lightningComponentGroups[`variant${i}`] = { 'minecraft:variant': { value: i - 1 } };
}

const lightningBp = new EntityBP({
  identifier: 'yw:lightning',
  isSpawnable: false,
  isSummonable: true,
  isExperimental: false,
  formatVersion: '1.13.0',
  components: {
    'minecraft:health': { value: 1, max: 1, min: 1 },
    'minecraft:collision_box': { width: 0, height: 0 },
    'minecraft:type_family': { family: ['inanimate', 'player'] },
    'minecraft:behavior.eat_mob': { priority: 0, run_speed: 10, eat_animation_time: 0.05, pull_in_force: 10, reach_mob_distance: 512 },
    'minecraft:variant': { value: 0 },
    'minecraft:mark_variant': { value: 0 },
    'minecraft:explode': { fuseLength: 0.75, power: 0, fuseLit: true, causes_fire: false },
    'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
    'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: false }] },
    'minecraft:knockback_resistance': { value: 1, max: 1 },
    'minecraft:fire_immune': true,
    'minecraft:follow_range': { value: 512, max: 512 },
    'minecraft:behavior.nearest_attackable_target': {
      priority: 2,
      entity_types: [
        {
          filters: { all_of: [{ test: 'is_family', subject: 'other', operator: '!=', value: 'player' }] },
          max_dist: 512,
        },
      ],
    },
    'minecraft:behavior.float': { priority: 3 },
    'minecraft:navigation.walk': { avoid_damage_blocks: true },
    'minecraft:movement': { value: 0 },
    'minecraft:jump.static': {},
    'minecraft:can_climb': {},
    'minecraft:movement.basic': {},
    'minecraft:physics': { has_gravity: false, has_collision: false },
  },
  componentGroups: lightningComponentGroups,
  events: {
    'minecraft:kill_entity': { add: { component_groups: ['del'] } },
    'minecraft:entity_spawned': {
      sequence: [
        {
          randomize: ['variant', 'variant2', 'variant3', 'variant4', 'variant5', 'variant6'].map((g) => ({
            weight: 1,
            add: { component_groups: [g] },
          })),
        },
        {
          randomize: LIGHTNING_COLORS.map((c) => ({ weight: 1, add: { component_groups: [c] } })),
        },
      ],
    },
  } as unknown as Record<string, EntityEvent>,
});

const lightningRp = new EntityRP({
  identifier: 'yw:lightning',
  materials: { default: 'charged_creeper' },
  textures: {
    air: 'textures/entity/air',
    red: 'textures/entity/red',
    orange: 'textures/entity/orange',
    yellow: 'textures/entity/yellow',
    green: 'textures/entity/green',
    blue: 'textures/entity/blue',
    indigo: 'textures/entity/indigo',
    purple: 'textures/entity/purple',
  },
  geometry: { default: 'geometry.colored.lightning' },
  renderControllers: ['controller.render.colored.lightning'],
  animations: {
    variant: 'animation.colored.lightning',
    variant2: 'animation.colored.lightning2',
    variant3: 'animation.colored.lightning3',
    variant4: 'animation.colored.lightning4',
    variant5: 'animation.colored.lightning5',
    variant6: 'animation.colored.lightning6',
  },
  scripts: {
    animate: [
      { variant: 'query.variant==0' },
      { variant2: 'query.variant==1' },
      { variant3: 'query.variant==2' },
      { variant4: 'query.variant==3' },
      { variant5: 'query.variant==4' },
      { variant6: 'query.variant==5' },
    ],
  },
});

mod.add(lightningBp, lightningRp);

// ---------------------------------------------------------------------------
// Attachable + render controllers for the blade and the lightning (pure API).
// ---------------------------------------------------------------------------
const bladeTextures: Record<string, string> = { default: 'textures/items/.t/18' };
for (let i = 0; i < 36; i++) {
  bladeTextures[`item${i}`] = `textures/items/.t/${i}`;
}

const bladeAttachable = new Attachable({
  identifier: 'yw:yw_sword',
  materials: { default: 'entity_alphatest', enchanted: 'entity_alphatest_glint' },
  textures: bladeTextures,
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
// Resource-pack animations, authored through the `Animation` module.
// The custom blade / attack animations are written inline; the shared Molang
// body is defined once and reused. Only the huge lightning keyframe dump is
// loaded verbatim and re-emitted.
// ---------------------------------------------------------------------------
rp.addAnimation(new Animation({
  identifier: 'animation.wield',
  loop: true,
  formatVersion: '1.8.0',
  body: {
    bones: {
      rightitem: {
        position: ['c.is_first_person ? -5.0 : 1.5', 'c.is_first_person ? -2.5 : -1.75', 'c.is_first_person ? -3.5 : -8.75'],
        rotation: ['c.is_first_person ? 38.0 : 12.5', 'c.is_first_person ? -120.0 : 180.0', 'c.is_first_person ? -63.0 : -4.5'],
        scale: 0.9,
      },
    },
  },
}), 'animations/sc.json');

rp.addAnimation(new Animation({
  identifier: 'animation.charging',
  loop: true,
  formatVersion: '1.8.0',
  body: {
    bones: {
      rightitem: {
        position: [
          '-1.5 - variable.charge_amount',
          '-1.5 + ( variable.charge_amount>= 1.0 ? math.sin( (q.life_time) * 1000.0 * 1.3) * 0.1 - math.sin(q.life_time * 45.0) * 0.5 : 0.0)',
          -4.8,
        ],
        rotation: [-53.0, 8.0, 35.0],
      },
    },
  },
}), 'animations/sc.json');

rp.addAnimation(new Animation({
  identifier: 'animation.player.sneaking',
  loop: true,
  formatVersion: '1.8.0',
  body: {
    bones: {
      rightItem: {
        rotation: ['variable.is_first_person ? 0.0 : 30', 'variable.is_first_person ? -50 : -45', 'variable.is_first_person ? -120 : -45'],
        position: ['variable.is_first_person ? 0.0 : -1.6', 'variable.is_first_person ? 0.0 : 0.0', 'variable.is_first_person ? 0.0 : -0.8'],
      },
      rightarm: {
        rotation: ['variable.is_first_person ? 0.0 : -30.0', 'variable.is_first_person ? 0.0 : 0.0', 'variable.is_first_person ? 0.0 : 0.0'],
        position: ['variable.is_first_person ? -3.0 : 0.0', 'variable.is_first_person ? 2.0 : 0.0', 'variable.is_first_person ? -1.0 : 0.0'],
      },
    },
  },
}), 'animations/sc.json');

// The first-person attack rotation body is shared by two output files
// (`player.animation.json` and `player_firstperson.animation.json`).
const FIRST_PERSON_ATTACK_BODY = {
  override_previous_animation: true,
  bones: {
    rightitem: {
      rotation: [
        'Math.sin(variable.first_person_rotation_factor * (1.0 - variable.attack_time) * (1.0 - variable.attack_time) * 200.0) * 30',
        'Math.sin(variable.first_person_rotation_factor * (1.0 - variable.attack_time) * (1.0 - variable.attack_time) * 200.0) * -42',
        'Math.sin(variable.first_person_rotation_factor * (1.0 - variable.attack_time) * (1.0 - variable.attack_time) * 200.0) * -78',
      ],
      position: [
        'Math.clamp(-15.5 * Math.sin(variable.first_person_rotation_factor * variable.attack_time * 112.0), 12, 999.0) * Math.sin(variable.first_person_rotation_factor * variable.attack_time * 112.0)',
        'Math.clamp(2 * Math.sin(variable.first_person_rotation_factor * variable.attack_time * 112.0), 3, 999.0) * Math.sin(variable.first_person_rotation_factor * variable.attack_time * 112.0)',
        'Math.sin(variable.first_person_rotation_factor * (1.0 - variable.attack_time) * (1.0 - variable.attack_time) * 280.0) * -11',
      ],
    },
  },
};

rp.addAnimation(new Animation({
  identifier: 'animation.player.attack.rotations',
  loop: true,
  formatVersion: '1.8.0',
  body: {
    bones: {
      body: { rotation: [0, 'variable.attack_body_rot_y', 0] },
      leftarm: {
        rotation: ['-(Math.sin((1 - Math.pow((1 - variable.attack_time), 4)) * 180) * 1.2 + Math.sin(variable.attack_time * 180)) * 10.0', 0, 0],
      },
      rightarm: {
        rotation: [
          '-(Math.sin((1 - Math.pow((1 - variable.attack_time), 4)) * 180) * 1.2 + Math.sin(variable.attack_time * 180)) * 20.0',
          '-(Math.sin((1 - Math.pow((1 - variable.attack_time), 4)) * 180) ? (-90.0 * Math.sin((1 - Math.pow((1 - variable.attack_time), 4)) * 180)) + 30.0 : 0.0)',
          0,
        ],
      },
    },
  },
}), 'animations/player.animation.json');

rp.addAnimation(new Animation({
  identifier: 'animation.player.first_person.attack_rotation_item',
  loop: true,
  formatVersion: '1.8.0',
  body: FIRST_PERSON_ATTACK_BODY,
}), 'animations/player.animation.json');

rp.addAnimation(new Animation({
  identifier: 'animation.player.first_person.attack_rotation_item',
  loop: true,
  formatVersion: '1.8.0',
  body: FIRST_PERSON_ATTACK_BODY,
}), 'animations/player_firstperson.animation.json');

// Lightning keyframes: large verbatim dump (6 variants × 6 bones × unique
// keyframe tables) — loaded and re-emitted through the module.
{
  const doc = readJson<NestedJson>('rp/animations/lightning.json');
  for (const [id, entry] of Object.entries(doc.animations ?? {})) {
    const { loop, animation_length, ...rest } = entry;
    rp.addAnimation(new Animation({
      identifier: id,
      loop: loop as boolean,
      animationLength: animation_length as number | undefined,
      body: rest,
      formatVersion: doc.format_version,
    }), 'animations/lightning.json');
  }
}

// Behavior-pack animation (`animation.test`) drives the sword-use events.
// The payload is small and custom, so it is authored inline through the API.
bp.addAnimation(new Animation({
  identifier: 'animation.test',
  loop: true,
  animationLength: 0.00001,
  formatVersion: '1.8.0',
  body: {
    timeline: {
      '0.0': Array(10).fill(
        '/event entity @s[hywitem={item=yw:yw_sword,location=slot.weapon.mainhand}] yw'
      ),
    },
  },
}));

// Resource-pack animation controllers (player base/root/first-person attack).
// Large vanilla-derived template; loaded verbatim and re-emitted via module.
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
// Materials + entity geometry models through the API classes.
// `entity.material` and the blade geometry are small and custom → inline.
// The lightning / armor-stand templates are loaded and re-emitted.
// ---------------------------------------------------------------------------
rp.addMaterial(new Material({
  fileName: 'entity.material',
  version: '1.0.0',
  materials: {
    'script_entity:entity_emissive_alpha': {},
    'script_entity2:entity_emissive_alpha': { '+defines': ['USE_ONLY_EMISSIVE'] },
    'script_charged:charged_creeper': {},
  },
}));

rp.addModel(new EntityModel({
  identifier: 'geometry.sc',
  description: { texture_width: 16.0, texture_height: 16.0 },
  bones: [
    {
      name: 'rightitem',
      texture_meshes: [
        {
          local_pivot: [6.0, 0.0, 6.0],
          position: [2.0, 1.0, -2.0],
          rotation: [0.0, -135.0, 90.0],
          texture: 'default',
        },
      ],
    },
  ],
  formatVersion: '1.16.0',
}));

// The humanoid armature (`geometry.tca`, target `models/entity/rl.json`) is
// authored inline through `EntityModel`.
rp.addModel(new EntityModel({
  identifier: 'geometry.tca',
  description: {
    texture_width: 64,
    texture_height: 64,
    visible_bounds_width: 2,
    visible_bounds_height: 3.5,
    visible_bounds_offset: [0, 1.25, 0],
  },
  formatVersion: '1.12.0',
  bones: [
    { name: 'waist', pivot: [0, 0, 0] },
    {
      name: 'Head',
      parent: 'waist',
      pivot: [0, 24, 0],
      cubes: [
        { origin: [-4, 24, -4], size: [8, 8, 8], uv: [0, 0] },
        { origin: [-4, 24, -4], size: [8, 8, 8], inflate: 0.5, uv: [32, 0] },
      ],
    },
    {
      name: 'Body',
      parent: 'waist',
      pivot: [0, 24, 0],
      cubes: [
        { origin: [-4, 12, -2], size: [8, 12, 4], uv: [16, 16] },
        { origin: [-4, 12, -2], size: [8, 12, 4], inflate: 0.25, uv: [16, 32] },
      ],
    },
    {
      name: 'RightArm',
      parent: 'waist',
      pivot: [-5, 21.5, 0],
      cubes: [
        { origin: [-7, 11.5, -2], size: [3, 12, 4], uv: [40, 16] },
        { origin: [-7, 11.5, -2], size: [3, 12, 4], inflate: 0.25, uv: [40, 32] },
      ],
    },
    {
      name: 'LeftArm',
      parent: 'waist',
      pivot: [5, 21.5, 0],
      cubes: [
        { origin: [4, 11.5, -2], size: [3, 12, 4], uv: [32, 48] },
        { origin: [4, 11.5, -2], size: [3, 12, 4], inflate: 0.25, uv: [48, 48] },
      ],
    },
    {
      name: 'RightLeg',
      parent: 'waist',
      pivot: [-1.9, 12, 0],
      cubes: [
        { origin: [-3.9, 0, -2], size: [4, 12, 4], uv: [0, 16] },
        { origin: [-3.9, 0, -2], size: [4, 12, 4], inflate: 0.25, uv: [0, 32] },
      ],
    },
    {
      name: 'LeftLeg',
      parent: 'waist',
      pivot: [1.9, 12, 0],
      cubes: [
        { origin: [-0.1, 0, -2], size: [4, 12, 4], uv: [16, 48] },
        { origin: [-0.1, 0, -2], size: [4, 12, 4], inflate: 0.25, uv: [0, 48] },
      ],
    },
  ],
}), 'models/entity/rl.json');

// The colored-lightning bolt geometry is a large verbatim bone dump — loaded
// and re-emitted through the module.
{
  const doc = readJson<{
    format_version?: string;
    'minecraft:geometry'?: Array<{ description?: Record<string, unknown>; bones?: Record<string, unknown>[] }>;
  }>('rp/models/entity/lightning.json');
  for (const geo of doc['minecraft:geometry'] ?? []) {
    rp.addModel(
      new EntityModel({
        identifier: geo.description?.identifier as string,
        description: geo.description,
        bones: geo.bones ?? [],
        formatVersion: doc.format_version,
      }),
      'models/entity/lightning.json'
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
