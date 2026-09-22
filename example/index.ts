/**
 * Example: building a mod with a Script API entry and packaging it.
 *
 * This script builds a mod, adds files to each pack, then demonstrates:
 *  - writing the pack folders to disk (`writeTo`)
 *  - serializing each pack to a `.mcpack` buffer (`pack()`)
 *  - serializing the whole mod to a `.mcaddon` buffer (`toMcaddon()`)
 *
 * Run with: `npm run example`.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Armor, Item, LootTable, ModMain, RecordDisc, Shaped, Tools } from '../src/index.js';

// Object form (recommended).
const mod = new ModMain({
  name: 'Spawn Mod',
  description: 'A demo mod that spawns mobs.',
  author: 'devx',
  version: [1, 0, 0],
  minEngineVersion: [1, 20, 70],
  sapi: {
    entry: 'scripts/main.js',
    language: 'javascript',
  },
  uuid: {
    seed: 'spawn-mod-demo',
  },
});

// ---- Custom items ----

// A simple material item: fuel + glint + tags.
const ruby = new Item({
  identifier: 'spawnmod:ruby',
  name: 'Spawn Ruby',
  description: 'A shiny red gem from the spawn dimension',
  category: 'items',
  rarity: 'rare',
  texturePath: 'textures/items/ruby',
  fuelDuration: 8.5,
  glint: true,
  tags: ['spawnmod:gem'],
});

// A tool: durability + damage + enchantable + repairable + auto digger.
const dagger = new Tools({
  identifier: 'spawnmod:dagger',
  name: 'Obsidian Dagger',
  category: 'equipment',
  texturePath: 'textures/items/dagger',
  maxDurability: 512,
  damage: 8,
  enchantableSlot: 'sword',
  enchantableValue: 14,
  repairItems: [{ items: ['minecraft:obsidian'], repairAmount: 128 }],
});

// An armor piece: wearable + protection + durability + absorption.
const helmet = new Armor({
  identifier: 'spawnmod:obsidian_helmet',
  name: 'Obsidian Helmet',
  slot: 'slot.armor.head',
  protection: 6,
  maxDurability: 495,
  enchantableSlot: 'armor_head',
  repairItems: ['minecraft:obsidian'],
  texturePath: 'textures/items/obsidian_helmet',
});

// A music disc with its own sound.
const disc = new RecordDisc({
  identifier: 'spawnmod:my_disc',
  name: 'Spawn Disc',
  comparatorSignal: 3,
  duration: 12.5,
  soundEvent: 'record.spawn',
  soundPath: 'sounds/music/records/spawn',
  texturePath: 'textures/items/record_spawn',
});

// ---- Unified wiring: one entry point routes BP/RP automatically ----
mod.define({
  items: [ruby, dagger, helmet, disc],
  recipes: [
    new Shaped({
      identifier: 'spawnmod:dagger_from_obsidian',
      tags: ['crafting_table'],
      pattern: [' O ', ' S '],
      key: { O: 'minecraft:obsidian', S: 'minecraft:stick' },
      result: { item: 'spawnmod:obsidian_dagger' },
    }),
  ],
  loot: [[
    new LootTable({
      pools: [{ rolls: 1, entries: [{ type: 'item', name: 'minecraft:emerald', weight: 1 }] }],
    }),
    'loot_tables/demo',
  ]],
});

// Register the disc's music audio: sound definition above + the OGG file itself.
mod.resource.addRecordSound(disc, Buffer.from('OggS-demo-record-audio', 'utf8'));
console.log('\n=== Custom disc ===');
console.log(
  'record.music sound_definition registered:',
  mod.resource.hasFile('sounds/sound_definitions.json')
);
console.log(
  'record audio file present:',
  mod.resource.hasFile('sounds/music/records/spawn.ogg')
);

console.log('\n=== Custom items ===');
console.log(
  JSON.stringify(ruby.buildBehaviorJson(), null, 2).slice(0, 600) +
    '\n...'
);

// Add custom files to each pack.
// 1) Bulk-copy a local assets directory into the RP, preserving structure.
const dirResult = await mod.resource.addDirectory('test/fixtures', {
  ignore: ['scripts'], // skip scripts which belong to the BP
});
console.log('\n=== addDirectory ===');
console.log(`Copied ${dirResult.added} files into the resource pack`);

// 2) Add the SAPI scripts to the BP via its `scripts/` directory.
if (mod.behavior) {
  await mod.behavior.addDirectory('test/fixtures/scripts', { prefix: 'scripts' });
}

const result = mod.build();

console.log('=== Resolved config ===');
console.log(JSON.stringify(result.config, null, 2));

console.log('\n=== Behavior Pack manifest ===');
console.log(JSON.stringify(result.behaviorPack, null, 2));

console.log('\n=== Resource Pack manifest ===');
console.log(JSON.stringify(result.resourcePack, null, 2));

// Demonstrate deterministic UUIDs.
const mod2 = new ModMain({
  name: 'Spawn Mod',
  sapi: 'scripts/main.js',
  uuid: { seed: 'spawn-mod-demo' },
});
console.log('\n=== Deterministic UUID check ===');
console.log('same header UUID?', mod.behaviorPackUuid === mod2.behaviorPackUuid);

// ---- Packaging ----

const outDir = resolve('out');

// 1) Write the pack folders to disk.
await mod.writeTo(outDir, { overwrite: true });
console.log('\n=== writeTo ===');
console.log(`Wrote mod packs under: ${outDir}`);

// 2) Serialize to .mcpack buffers and save.
const rpMcpack = mod.packResourcePack();
const bpMcpack = mod.packBehaviorPack();
if (bpMcpack) {
  const bpPath = resolve(outDir, `${mod.behavior!.folderName}_BP.mcpack`);
  writeFileSync(bpPath, bpMcpack);
  console.log(`Behavior .mcpack: ${bpPath} (${bpMcpack.length} bytes)`);
}
const rpPath = resolve(outDir, `${mod.resource.folderName}_RP.mcpack`);
writeFileSync(rpPath, rpMcpack);
console.log(`Resource .mcpack: ${rpPath} (${rpMcpack.length} bytes)`);

// 3) Build the whole mod as a single .mcaddon.
const mcaddon = mod.toMcaddon();
const addonPath = resolve(outDir, `${mod.folderName}.mcaddon`);
writeFileSync(addonPath, mcaddon);
console.log(`.mcaddon: ${addonPath} (${mcaddon.length} bytes)`);

console.log('\n=== Signatures (zip magic) ===');
console.log('mcpack starts with PK:', rpMcpack.subarray(0, 2).toString('latin1') === 'PK');
console.log('mcaddon starts with PK:', mcaddon.subarray(0, 2).toString('latin1') === 'PK');
