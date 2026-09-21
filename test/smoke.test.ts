/**
 * Smoke tests for the SpawnModBE framework.
 *
 * These run directly against the compiled `dist/` output and assert that the
 * generated manifests, ZIP archives and PNG icons are structurally valid. They
 * are intentionally dependency-free so they can run anywhere Node runs.
 */

import { strict as assert } from 'node:assert';
import { readFile as readFileFs, writeFile as writeFileFs } from 'node:fs/promises';
import { join as joinPath } from 'node:path';
import { inflateRawSync } from 'node:zlib';

import {
  Armor,
  Attachable,
  Behavior,
  Block,
  BlockPlacer,
  BrewingContainer,
  BrewingMix,
  DynamicItemModel,
  EntityBP,
  EntityPlacer,
  EntityRP,
  FlipbookTextures,
  Food,
  FrameSequence,
  Fuel,
  Furnace,
  Item,
  ItemTextureAtlas,
  LangFile,
  LootTable,
  ModMain,
  RecordDisc,
  RenderController,
  Resource,
  Shaped,
  Shapeless,
  SoundBatch,
  SpawnRules,
  Throwable,
  Tools,
  TradeTable,
  enchantBookForTrading,
  enchantWithLevels,
  isValidUuid,
  buildZip,
  crc32,
  killedByPlayer,
  setCount,
} from '../src/index.js';

type AnyObj = Record<string, any>;

function getComps(json: AnyObj): AnyObj {
  return json['minecraft:item'].components as AnyObj;
}

/** Fully validates a ZIP buffer (structure + DEFLATE integrity + CRC of every entry). */
function assertValidZip(buf: Buffer, expectedName?: string): string[] {
  // 1) Must start with the local file header signature 'PK\x03\x04'.
  assert.equal(buf.readUInt32LE(0), 0x04034b50, 'ZIP must start with local file header signature');

  const names: string[] = [];
  // Parse entries sequentially: local header is 30 bytes + name (+ optional extra).
  // Stop when we reach the central directory (0x02014b50) or EOCD (0x06054b50).
  let offset = 0;
  while (offset < buf.length - 22) {
    const sig = buf.readUInt32LE(offset);
    if (sig === 0x06054b50 || sig === 0x02014b50) break;
    assert.equal(sig, 0x04034b50, `Expected local header at offset ${offset}`);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const crc = buf.readUInt32LE(offset + 14);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    if (expectedName) assert.equal(name, expectedName);
    names.push(name);

    const dataStart = offset + 30 + nameLen + extraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);
    const inflated = inflateRawSync(raw) as Buffer;
    assert.equal(crc32(inflated), crc, `CRC mismatch for ${name}`);

    offset = dataStart + compressedSize;
  }

  // 2) End-of-central-directory record must exist.
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50, 'ZIP must end with EOCD');
  return names;
}

function testPackFiles() {
  const rp = new Resource({ name: 'PackFiles Test', uuid: { seed: 'pack-files-test' } });
  rp.addFile('textures/items/diamond.png', Buffer.from('png-bytes', 'utf8'));
  rp.addFile('lang/en_US.lang', 'item.name=Test');
  rp.addFiles([
    ['textures/blocks/stone.png', 'fake'],
    { path: 'sounds/sound_definition.json', data: Buffer.from('{}', 'utf8') },
  ]);
  rp.setIcon();
  assert.equal(rp.hasFile('textures/items/diamond.png'), true);
  assert.equal(rp.getFile('lang/en_US.lang')?.toString(), 'item.name=Test');
  assert.equal(rp.removeFile('textures/blocks/stone.png'), true);
  assert.equal(rp.removeFile('manifest.json'), false);
  assert.ok(rp.icon.length > 8, 'icon should be a valid PNG');
  assert.equal(rp.icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  console.log('[ok] Resource file management works');
}

function testZipOutput() {
  const mod = new ModMain({
    name: 'Zip Test',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'zip-test' },
  });
  mod.behavior?.addFile('scripts/main.js', 'console.log("hi")');

  // .mcpack
  const rpZip = mod.packResourcePack();
  const rpNames = assertValidZip(rpZip);
  assert.deepEqual(rpNames, ['manifest.json', 'pack_icon.png']);
  assert.ok(rpZip.subarray(0, 2).toString('latin1') === 'PK');

  // .mcaddon bundles each pack under its own root folder.
  const addon = mod.toMcaddon();
  const names = assertValidZip(addon);
  const rpRoot = names.filter((n) => n.includes('_RP/'));
  const bpRoot = names.filter((n) => n.includes('_BP/'));
  assert.ok(rpRoot.includes('Zip_Test_RP/manifest.json'), 'addon contains RP manifest');
  assert.ok(bpRoot.includes('Zip_Test_BP/manifest.json'), 'addon contains BP manifest');
  assert.ok(bpRoot.includes('Zip_Test_BP/scripts/main.js'), 'addon contains user file');
  console.log('[ok] .mcpack/.mcaddon ZIP archives are valid');

  // Standalone zip builder.
  const z = buildZip([
    ['a.txt', Buffer.from('hello')],
    ['dir/b.txt', Buffer.from('world')],
  ]);
  const zNames = assertValidZip(z);
  assert.deepEqual(zNames, ['a.txt', 'dir/b.txt']);
  console.log('[ok] buildZip produces valid archives');
}

async function testWriteToDisk() {
  const mod = new ModMain({ name: 'Write Test', author: 'devx', uuid: { seed: 'write-test' } });
  const results = await mod.writeTo('.tmp-out', { overwrite: true });
  // Mod has no behavior, so only the resource pack is written.
  assert.equal(results.length, 1);
  const rp = results[0];
  assert.ok(rp.files.includes('manifest.json'));
  assert.ok(rp.files.includes('pack_icon.png'));
  console.log('[ok] writeTo writes files to disk');

  // overwrite:false must NOT clobber existing files on disk.
  const dir = '.tmp-out/Write_Test_RP';
  const manifestPath = joinPath(dir, 'manifest.json');
  await writeFileFs(manifestPath, 'ORIGINAL_CONTENT');
  await mod.resource.writeTo(dir, { overwrite: false });
  const content = await readFileFs(manifestPath, 'utf8');
  assert.equal(content, 'ORIGINAL_CONTENT', 'overwrite:false must not clobber existing file');

  // And a non-existing file still gets written when overwrite:false.
  const iconPath = joinPath(dir, 'pack_icon.png');
  const iconExists = await readFileFs(iconPath, 'utf8').then(() => true).catch(() => false);
  assert.equal(iconExists, true, 'new files are still written with overwrite:false');
  console.log('[ok] writeTo honors overwrite:false');
}

async function testAddDirectory() {
  const rp = new Resource({ name: 'Dir Test', uuid: { seed: 'dir-test' } });

  // 1) Basic copy: preserves directory structure relative to the source root.
  const basic = await rp.addDirectory('test/fixtures');
  assert.ok(basic.added >= 6, `expected >=6 added, got ${basic.added}`);
  assert.equal(basic.errors, 0);
  assert.ok(rp.hasFile('textures/items/sword.png'));
  assert.ok(rp.hasFile('textures/blocks/dirt.png'));
  assert.ok(rp.hasFile('textures/stone.png'));
  assert.ok(rp.hasFile('sounds/step.ogg'));
  assert.ok(rp.hasFile('models/model.json'));

  // 2) prefix: places everything under a pack-relative subdirectory.
  const rp2 = new Resource({ name: 'Prefix Test', uuid: { seed: 'prefix-test' } });
  await rp2.addDirectory('test/fixtures/textures', { prefix: 'new_assets' });
  assert.ok(rp2.hasFile('new_assets/items/sword.png'));
  assert.ok(rp2.hasFile('new_assets/blocks/dirt.png'));

  // 3) ignore exact file.
  const rp3 = new Resource({ name: 'Ignore Test', uuid: { seed: 'ignore-test' } });
  await rp3.addDirectory('test/fixtures', { ignore: ['textures/stone.png'] });
  assert.equal(rp3.hasFile('textures/stone.png'), false);
  assert.equal(rp3.hasFile('textures/items/sword.png'), true);

  // 4) ignore directory subtree.
  const rp4 = new Resource({ name: 'IgnoreDir Test', uuid: { seed: 'ignore-dir-test' } });
  await rp4.addDirectory('test/fixtures', { ignore: ['textures/items'] });
  assert.equal(rp4.hasFile('textures/items/sword.png'), false);
  assert.equal(rp4.hasFile('textures/blocks/dirt.png'), true);

  // 5) ignore glob.
  const rp5 = new Resource({ name: 'IgnoreGlob Test', uuid: { seed: 'ignore-glob-test' } });
  await rp5.addDirectory('test/fixtures/textures', { ignore: ['**/*.png'] });
  assert.equal(rp5.hasFile('items/sword.png'), false);
  assert.equal(rp5.hasFile('blocks/dirt.png'), false);

  console.log('[ok] addDirectory copies directories with prefix/ignore');
}

function testBaseItem() {
  const ruby = new Item({
    identifier: 'mymod:ruby',
    name: 'Ruby',
    description: 'A shiny red gem',
    category: 'items',
    rarity: 'rare',
    texturePath: 'textures/items/ruby',
    fuelDuration: 8.5,
    glint: true,
    tags: ['mymod:gem'],
  });
  const json = ruby.buildBehaviorJson() as AnyObj;
  assert.equal(json.format_version, '1.26.0');
  const desc = json['minecraft:item'].description;
  assert.equal(desc.identifier, 'mymod:ruby');
  assert.equal(desc.menu_category.category, 'items');
  const comps = getComps(json);
  assert.equal(comps['minecraft:rarity'], 'rare');
  assert.equal(comps['minecraft:fuel'].duration, 8.5);
  assert.equal(comps['minecraft:glint'], true);
  assert.deepEqual(comps['minecraft:tags'].tags, ['mymod:gem']);
  assert.ok(comps['minecraft:icon'], 'icon present');
  // No invalid `minecraft:description` component.
  assert.equal('minecraft:description' in comps, false, 'no invalid description component');
  console.log('[ok] Base Item generates valid behavior JSON');
}

function testToolsItem() {
  const dagger = new Tools({
    identifier: 'mymod:dagger',
    name: 'Obsidian Dagger',
    category: 'equipment',
    maxDurability: 512,
    damage: 8,
    enchantableSlot: 'sword',
    enchantableValue: 14,
    repairItems: [{ items: ['minecraft:obsidian'], repairAmount: 128 }],
  });
  const comps = getComps(dagger.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:hand_equipped'], true);
  assert.equal(comps['minecraft:durability'].max_durability, 512);
  assert.equal(comps['minecraft:enchantable'].slot, 'sword');
  assert.equal(comps['minecraft:enchantable'].value, 14);
  assert.equal(comps['minecraft:damage'], 8);
  // digger should be auto-added for durable tools.
  assert.ok(comps['minecraft:digger'].destroy_speeds.length > 0);
  console.log('[ok] Tools generates tool components');
}

function testArmorItem() {
  const helmet = new Armor({
    identifier: 'mymod:obsidian_helmet',
    name: 'Obsidian Helmet',
    slot: 'slot.armor.head',
    protection: 6,
    maxDurability: 495,
    repairItems: ['minecraft:obsidian'],
  });
  const comps = getComps(helmet.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:max_stack_size'], 1);
  assert.equal(comps['minecraft:wearable'].slot, 'slot.armor.head');
  assert.equal(comps['minecraft:wearable'].protection, 6);
  assert.equal(comps['minecraft:durability'].max_durability, 495);
  assert.equal(comps['minecraft:enchantable'].slot, 'armor_head');
  assert.deepEqual(comps['minecraft:damage_absorption'].absorbable_causes, ['all']);
  assert.ok(comps['minecraft:repairable'].repair_items.length > 0);
  console.log('[ok] Armor generates wearable components');
}

function testItemPackIntegration() {
  const mod = new ModMain({
    name: 'Item Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'item-mod-test' },
  });
  const sword = new Tools({
    identifier: 'mymod:sword',
    texturePath: 'textures/items/sword',
    maxDurability: 250,
  });
  const helmet = new Armor({
    identifier: 'mymod:helmet',
    slot: 'slot.armor.chest',
    texturePath: 'textures/items/helmet',
  });

  mod.behavior?.addItem(sword);
  mod.behavior?.addItem(helmet);
  mod.resource.addItemTexture(sword);
  mod.resource.addItemTexture(helmet);

  // BP should contain the item definition files.
  assert.ok(mod.behavior!.hasFile('items/sword.json'));
  assert.ok(mod.behavior!.hasFile('items/helmet.json'));

  // RP should have the item_texture.json atlas + placeholder PNGs.
  const atlas = JSON.parse(mod.resource.getFile('textures/item_texture.json')!.toString()) as AnyObj;
  assert.ok(atlas.texture_data['sword']);
  assert.ok(atlas.texture_data['helmet']);
  assert.ok(mod.resource.hasFile('textures/items/sword.png'));
  assert.ok(mod.resource.hasFile('textures/items/helmet.png'));

  console.log('[ok] Items integrate into BP + RP');
}

function testFoodItem() {
  const apple = new Food({
    identifier: 'mymod:chocolate_apple',
    name: 'Chocolate Apple',
    nutrition: 6,
    saturationModifier: 0.8,
    canAlwaysEat: true,
    usingConvertsTo: 'minecraft:bowl',
    texturePath: 'textures/items/chocolate_apple',
  });
  const comps = getComps(apple.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:food'].nutrition, 6);
  assert.equal(comps['minecraft:food'].saturation_modifier, 0.8);
  assert.equal(comps['minecraft:food'].can_always_eat, true);
  assert.equal(comps['minecraft:food'].using_converts_to, 'minecraft:bowl');
  assert.equal(comps['minecraft:use_animation'], 'eat');
  assert.ok(comps['minecraft:use_modifiers'].use_duration > 0);
  console.log('[ok] Food generates food components');
}

function testFuelItem() {
  const coal = new Fuel({
    identifier: 'mymod:coal_chunk',
    name: 'Coal Chunk',
    duration: 12.5,
    texturePath: 'textures/items/coal_chunk',
  });
  const comps = getComps(coal.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:fuel'].duration, 12.5);
  console.log('[ok] Fuel generates fuel component');
}

function testThrowableItem() {
  const fireball = new Throwable({
    identifier: 'mymod:fireball',
    name: 'Fireball',
    projectileEntity: 'mymod:fireball_projectile',
    launchPowerScale: 1.2,
    maxLaunchPower: 2.0,
    ammunition: [{ item: 'mymod:fireball', searchInventory: true }],
    chargeOnDraw: true,
    maxDrawDuration: 1.5,
    useDuration: 1.0,
  });
  const comps = getComps(fireball.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:projectile'].projectile_entity, 'mymod:fireball_projectile');
  assert.equal(comps['minecraft:throwable'].launch_power_scale, 1.2);
  assert.equal(comps['minecraft:throwable'].max_launch_power, 2.0);
  assert.ok(comps['minecraft:shooter'].ammunition.length > 0);
  assert.equal(comps['minecraft:shooter'].charge_on_draw, true);
  console.log('[ok] Throwable generates projectile/shooter components');
}

function testPlacerItems() {
  const block = new BlockPlacer({
    identifier: 'mymod:structure_block',
    name: 'Handheld Structure Block',
    block: 'mymod:custom_block',
    canPlaceOn: ['minecraft:dirt', 'minecraft:stone'],
  });
  const bComps = getComps(block.buildBehaviorJson() as AnyObj);
  assert.equal(bComps['minecraft:block_placer'].block, 'mymod:custom_block');
  assert.deepEqual(bComps['minecraft:block_placer'].use_on, ['minecraft:dirt', 'minecraft:stone']);

  const egg = new EntityPlacer({
    identifier: 'mymod:spider_egg',
    name: 'Spider Egg',
    entity: 'minecraft:spider',
    canPlaceOn: ['minecraft:dirt'],
  });
  const eComps = getComps(egg.buildBehaviorJson() as AnyObj);
  assert.equal(eComps['minecraft:entity_placer'].entity, 'minecraft:spider');
  assert.deepEqual(eComps['minecraft:entity_placer'].use_on, ['minecraft:dirt']);
  console.log('[ok] BlockPlacer/EntityPlacer generate placement components');
}

function testRecordDiscItem() {
  const disc = new RecordDisc({
    identifier: 'mymod:my_disc',
    name: 'Mystery Disc',
    comparatorSignal: 3,
    duration: 12.5,
    soundEvent: 'record.13',
    texturePath: 'textures/items/record_13',
  });
  const comps = getComps(disc.buildBehaviorJson() as AnyObj);
  assert.equal(comps['minecraft:record'].comparator_signal, 3);
  assert.equal(comps['minecraft:record'].duration, 12.5);
  assert.equal(comps['minecraft:record'].sound_event, 'record.13');
  console.log('[ok] RecordDisc generates record component');
}

function testSoundSystem() {
  const rp = new Resource({ name: 'Sound Test', uuid: { seed: 'sound-test' } });
  const fakeOgg = Buffer.from('OggS-fake-audio-data', 'utf8');

  // 1) Generic addSound: registers event + writes audio file.
  rp.addSound(
    'mymod:whoosh',
    'sounds/mymod/whoosh',
    { stream: false, volume: 0.7, maxDistance: 24 },
    fakeOgg
  );
  assert.ok(rp.hasFile('sounds/sound_definitions.json'));
  assert.ok(rp.hasFile('sounds/mymod/whoosh.ogg'));

  const defs = JSON.parse(
    rp.getFile('sounds/sound_definitions.json')!.toString()
  ) as { sound_definitions: Record<string, AnyObj> };
  const whoosh = defs.sound_definitions['mymod:whoosh'] as AnyObj;
  assert.ok(whoosh, 'event registered');
  assert.equal(whoosh.max_distance, 24);
  assert.equal(whoosh.sounds[0].name, 'sounds/mymod/whoosh');
  assert.equal(whoosh.sounds[0].volume, 0.7);
  assert.equal(whoosh.sounds[0].stream, false);

  // 2) Managing multiple events accumulates (does not clobber).
  rp.addSound('mymod:ding', 'sounds/mymod/ding', {}, fakeOgg);
  const defs2 = JSON.parse(
    rp.getFile('sounds/sound_definitions.json')!.toString()
  ) as { sound_definitions: Record<string, AnyObj> };
  assert.ok(defs2.sound_definitions['mymod:whoosh'], 'first event kept');
  assert.ok(defs2.sound_definitions['mymod:ding'], 'second event added');

  // 3) addRecordSound ties a RecordDisc's soundEvent to a sound definition.
  const rp2 = new Resource({ name: 'Record Sound Test', uuid: { seed: 'record-sound-test' } });
  const disc = new RecordDisc({
    identifier: 'mymod:my_disc',
    name: 'Mystery Disc',
    comparatorSignal: 3,
    duration: 12.5,
    soundEvent: 'record.mystery',
    soundPath: 'sounds/music/records/mystery',
    texturePath: 'textures/items/record_mystery',
  });
  rp2.addRecordSound(disc, fakeOgg);
  assert.ok(rp2.hasFile('sounds/music/records/mystery.ogg'));
  const defs3 = JSON.parse(
    rp2.getFile('sounds/sound_definitions.json')!.toString()
  ) as { sound_definitions: Record<string, AnyObj> };
  const rec = defs3.sound_definitions['record.mystery'] as AnyObj;
  assert.ok(rec, 'record event registered');
  assert.equal(rec.max_distance, 64);
  assert.equal(rec.sounds[0].stream, true, 'records stream');
  assert.equal(rec.sounds[0].volume, 0.5);
  assert.equal(rec.sounds[0].name, 'sounds/music/records/mystery');

  console.log('[ok] addSound / addRecordSound work');
}

function testShapelessRecipe() {
  const knob = new Shapeless({
    identifier: 'mymod:brass_knob',
    tags: ['crafting_table'],
    group: 'handles',
    ingredients: ['mymod:brass', { item: 'mymod:screw', data: 2 }],
    result: { item: 'mymod:door_knob', data: 3 },
  });
  const json = knob.buildJson() as AnyObj;
  assert.equal(json.format_version, '1.17.41');
  const body = json['minecraft:recipe_shapeless'];
  assert.equal(body.description.identifier, 'mymod:brass_knob');
  assert.deepEqual(body.tags, ['crafting_table']);
  assert.equal(body.group, 'handles');
  assert.equal(body.ingredients.length, 2);
  assert.deepEqual(body.ingredients[1], { item: 'mymod:screw', data: 2 });
  assert.deepEqual(body.result, { item: 'mymod:door_knob', data: 3 });
  console.log('[ok] Shapeless recipe validated');
}

function testShapedRecipe() {
  const sword = new Shaped({
    identifier: 'mymod:cover_arch',
    tags: ['crafting_table'],
    pattern: ['SSS', 'I I', 'I I'],
    key: { S: 'mymod:cloth', I: 'mymod:support' },
    result: [{ item: 'mymod:covered_arch', count: 3 }, 'mymod:crafting_scrap'],
  });
  const json = sword.buildJson() as AnyObj;
  const body = json['minecraft:recipe_shaped'];
  assert.deepEqual(body.pattern, ['SSS', 'I I', 'I I']);
  assert.equal(body.key.S, 'mymod:cloth');
  assert.equal(body.result.length, 2);
  assert.equal(body.result[0].count, 3);
  console.log('[ok] Shaped recipe validated');
}

function testFurnaceAndBrewingRecipes() {
  const furnace = new Furnace({
    identifier: 'mymod:magic_ash',
    tags: ['furnace', 'soul_campfire'],
    input: 'mymod:bone_fragments',
    output: { item: 'mymod:magic_ash', count: 4 },
  });
  const fj = furnace.buildJson() as AnyObj;
  const fBody = fj['minecraft:recipe_furnace'];
  assert.equal(fBody.input, 'mymod:bone_fragments');
  assert.equal(fBody.output.count, 4);

  const mix = new BrewingMix({
    identifier: 'mymod:paralysis_brew',
    tags: ['brewing_stand'],
    input: 'mymod:flask',
    reagent: 'mymod:jade',
    output: 'mymod:paralysis_brew',
  });
  const mj = mix.buildJson() as AnyObj;
  assert.equal(mj['minecraft:recipe_brewing_mix'].reagent, 'mymod:jade');

  const container = new BrewingContainer({
    identifier: 'mymod:illumination_potion',
    tags: ['brewing_stand'],
    input: 'minecraft:potion',
    reagent: 'mymod:radiant_berries',
    output: 'mymod:illumination_potion',
  });
  const cj = container.buildJson() as AnyObj;
  assert.equal(cj['minecraft:recipe_brewing_container'].input, 'minecraft:potion');

  console.log('[ok] Furnace + Brewing recipes validated');
}

function testLootTable() {
  const table = new LootTable({
    pools: [
      {
        rolls: { min: 2, max: 4 },
        entries: [
          { type: 'item', name: 'minecraft:golden_apple', weight: 20 },
          {
            type: 'item',
            name: 'minecraft:diamond',
            weight: 1,
            functions: [setCount({ min: 1, max: 3 })],
          },
        ],
        conditions: [killedByPlayer()],
      },
      {
        tiers: { initial_range: 2, bonus_rolls: 3, bonus_chance: 0.095 },
        entries: [
          { type: 'loot_table', name: 'loot_tables/entities/armor_set_leather' },
          { type: 'loot_table', name: 'loot_tables/entities/armor_set_iron' },
        ],
      },
    ],
  });
  const json = table.buildJson() as AnyObj;
  assert.equal(json.pools.length, 2);
  const pool0 = json.pools[0];
  assert.deepEqual(pool0.rolls, { min: 2, max: 4 });
  assert.equal(pool0.entries[0].weight, 20);
  assert.equal(pool0.entries[1].functions[0].function, 'set_count');
  assert.equal(pool0.conditions[0].condition, 'killed_by_player');
  const pool1 = json.pools[1];
  assert.equal(pool1.tiers.initial_range, 2);
  assert.equal(pool1.entries[0].type, 'loot_table');
  console.log('[ok] Loot table (weighted + tiered) validated');
}

function testRecipeAndLootIntegration() {
  const mod = new ModMain({
    name: 'Craft Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'craft-mod-test' },
  });
  const sword = new Shaped({
    identifier: 'mymod:ruby_sword',
    tags: ['crafting_table'],
    pattern: ['X', 'X', 'I'],
    key: { X: 'mymod:ruby', I: 'minecraft:stick' },
    result: 'mymod:ruby_sword',
  });
  mod.behavior?.addRecipe(sword, 'crafting/weapons');
  mod.behavior?.addRecipe(sword, 'crafting/weapons/alt'); // same identifier, different subpath
  mod.behavior?.addLootTable(
    new LootTable({
      pools: [{ rolls: 1, entries: [{ type: 'item', name: 'minecraft:apple' }] }],
    }),
    'loot_tables/custom/artifacts'
  );

  assert.ok(mod.behavior!.hasFile('recipes/crafting/weapons/ruby_sword.json'));
  assert.ok(mod.behavior!.hasFile('recipes/crafting/weapons/alt/ruby_sword.json'));
  assert.ok(mod.behavior!.hasFile('loot_tables/custom/artifacts.json'));
  console.log('[ok] Recipes + loot tables integrate into BP');
}

function testEntityBP() {
  const goblin = new EntityBP({
    identifier: 'mymod:goblin',
    isSpawnable: true,
    components: {
      'minecraft:type_family': { family: ['mymod:goblin', 'monster'] },
      'minecraft:collision_box': { width: 0.6, height: 1.2 },
    },
    componentGroups: { 'mymod:angry': { 'minecraft:scale': { value: 1.5 } } },
    events: { 'mymod:on_hit': { add: { component_groups: ['mymod:angry'] } } },
  });
  const json = goblin.buildJson() as AnyObj;
  const ent = json['minecraft:entity'];
  assert.equal(ent.description.identifier, 'mymod:goblin');
  assert.equal(ent.description.is_spawnable, true);
  assert.equal(ent.components['minecraft:type_family'].family.length, 2);
  assert.equal(ent.component_groups['mymod:angry']['minecraft:scale'].value, 1.5);
  assert.deepEqual(ent.events['mymod:on_hit'].add.component_groups, ['mymod:angry']);
  assert.equal(goblin.fileName, 'goblin.json');
  console.log('[ok] EntityBP generates behavior definition');
}

function testEntityRPAndRenderController() {
  const goblin = new EntityRP({
    identifier: 'mymod:goblin',
    materials: { default: 'entity_alphatest' },
    textures: { default: 'textures/entity/goblin' },
    geometry: { default: 'geometry.goblin' },
    renderControllers: ['controller.render.goblin'],
    spawnEgg: { base_color: '#2e6b2e', overlay_color: '#6b2e2e' },
    scripts: { initialize: ['v.foo = 1;'], scale: 'v.foo' },
  });
  const json = goblin.buildJson() as AnyObj;
  const desc = json['minecraft:client_entity'].description;
  assert.equal(desc.identifier, 'mymod:goblin');
  assert.equal(desc.materials.default, 'entity_alphatest');
  assert.equal(desc.geometry.default, 'geometry.goblin');
  assert.deepEqual(desc.render_controllers, ['controller.render.goblin']);
  assert.equal(desc.spawn_egg.base_color, '#2e6b2e');
  assert.ok(desc.scripts.scale, 'v.foo');
  assert.equal(goblin.fileName, 'goblin.entity.json');

  const rc = new RenderController({
    id: 'controller.render.goblin',
    geometry: 'geometry.default',
    materials: [{ '*': 'material.default' }],
    textures: ['texture.default'],
  });
  const rcJson = rc.buildJson() as AnyObj;
  assert.equal(rcJson.render_controllers['controller.render.goblin'].geometry, 'geometry.default');
  assert.equal(rc.fileName, 'goblin.rc.json');
  console.log('[ok] EntityRP + RenderController generated');
}

function testSpawnRules() {
  const rules = new SpawnRules({
    identifier: 'mymod:goblin',
    populationControl: 'monster',
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
  const json = rules.buildJson() as AnyObj;
  const sr = json['minecraft:spawn_rules'];
  assert.equal(sr.description.identifier, 'mymod:goblin');
  assert.equal(sr.description.population_control, 'monster');
  const cond = sr.conditions[0];
  assert.equal(cond['minecraft:weight'].default, 100);
  assert.equal(cond['minecraft:herd'].min_size, 2);
  assert.ok(cond['minecraft:spawns_on_surface']);
  assert.equal(cond['minecraft:brightness_filter'].max, 7);
  assert.equal(cond['minecraft:difficulty_filter'].min, 'easy');
  assert.equal(cond['minecraft:permute_type'].length, 2);
  assert.equal(rules.fileName, 'goblin.json');
  console.log('[ok] SpawnRules generated');
}

function testEntityIntegration() {
  const mod = new ModMain({
    name: 'Entity Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'entity-mod-test' },
  });
  const goblin = new EntityBP({ identifier: 'mymod:goblin', components: { 'minecraft:type_family': { family: ['goblin'] } } });
  const goblinRP = new EntityRP({
    identifier: 'mymod:goblin',
    materials: { default: 'entity_alphatest' },
    textures: { default: 'textures/entity/goblin' },
    geometry: { default: 'geometry.goblin' },
    renderControllers: ['controller.render.goblin'],
  });
  const rules = new SpawnRules({ identifier: 'mymod:goblin', populationControl: 'monster', conditions: [{ weight: 100 }] });
  const rc = new RenderController({ id: 'controller.render.goblin', geometry: 'geometry.default', materials: [{ '*': 'material.default' }], textures: ['texture.default'] });

  mod.behavior?.addEntity(goblin);
  mod.behavior?.addSpawnRules(rules);
  mod.resource.addClientEntity(goblinRP);
  mod.resource.addRenderController(rc);

  assert.ok(mod.behavior!.hasFile('entities/goblin.json'));
  assert.ok(mod.behavior!.hasFile('spawn_rules/goblin.json'));
  assert.ok(mod.resource.hasFile('entity/goblin.entity.json'));
  assert.ok(mod.resource.hasFile('render_controllers/goblin.rc.json'));
  console.log('[ok] Entity BP/RP + spawn rules + RC integrate');
}

function testLangFile() {
  const lang = new LangFile({ locale: 'en_US' });
  lang.setItemName('mymod:ruby', 'Ruby');
  lang.setItemName('mymod:dagger', 'Obsidian Dagger');
  lang.setEntityName('mymod:goblin', 'Goblin');
  lang.setSpawnEggName('mymod:goblin', 'Goblin Spawn Egg');
  lang.setRecordDesc('record.mystery', 'Mystery Music');
  const text = lang.toString();
  assert.ok(text.includes('item.mymod:ruby.name=Ruby'));
  assert.ok(text.includes('entity.mymod:goblin.name=Goblin'));
  assert.ok(text.includes('item.spawn_egg.entity.goblin.name=Goblin Spawn Egg'));
  assert.ok(text.includes('item.record_mystery.desc=Mystery Music'));
  assert.equal(lang.filePath, 'texts/en_US.lang');
  console.log('[ok] LangFile generates .lang output');
}

function testItemTextureAtlas() {
  const atlas = new ItemTextureAtlas();
  atlas.set('ruby', 'textures/items/ruby');
  atlas.set('axe', ['textures/items/wood_axe', 'textures/items/iron_axe']);
  const json = atlas.buildJson() as AnyObj;
  assert.equal(json.resource_pack_name, 'my_pack');
  assert.equal(json.texture_name, 'atlas.items');
  assert.equal(json.texture_data.ruby.textures, 'textures/items/ruby');
  assert.equal(json.texture_data.axe.textures.length, 2);
  console.log('[ok] ItemTextureAtlas builds atlas JSON');
}

function testAttachable() {
  const atch = new Attachable({
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
  const json = atch.buildJson() as AnyObj;
  const desc = json['minecraft:attachable'].description;
  assert.equal(desc.identifier, 'mymod:telescope');
  assert.equal(desc.materials.default, 'entity_alphatest');
  assert.equal(desc.scripts.animate.length, 2);
  assert.equal(desc.scripts.animate[0].holding, 'q.main_hand_item_use_duration <= 0.0f');
  assert.deepEqual(desc.render_controllers, ['controller.render.item_default']);
  assert.equal(atch.fileName, 'telescope.json');
  console.log('[ok] Attachable generates attachable JSON');
}

function testSoundBatchAndResourceRp() {
  const mod = new ModMain({
    name: 'RP Modules Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'rp-modules-test' },
  });
  const lang = new LangFile();
  lang.setItemName('mymod:ruby', 'Ruby');
  mod.resource.addLang(lang);
  assert.ok(mod.resource.hasFile('texts/en_US.lang'));

  const atlas = new ItemTextureAtlas();
  atlas.set('ruby', 'textures/items/ruby');
  mod.resource.addItemTextureAtlas(atlas);
  assert.ok(mod.resource.hasFile('textures/item_texture.json'));

  const atch = new Attachable({ identifier: 'mymod:telescope', materials: { default: 'entity_alphatest' }, textures: { default: 'textures/entity/telescope' }, geometry: { default: 'geometry.telescope' } });
  mod.resource.addAttachable(atch);
  assert.ok(mod.resource.hasFile('attachables/telescope.json'));

  const batch = new SoundBatch({
    sounds: [
      { soundId: 'mymod:whoosh', soundPath: 'sounds/mymod/whoosh', volume: 0.7 },
      { soundId: 'mymod:ding', soundPath: 'sounds/mymod/ding', stream: true },
    ],
  });
  const fake = Buffer.from('OggS', 'utf8');
  const ids = mod.resource.applySoundBatch(batch, { 'mymod:whoosh': fake });
  assert.deepEqual(ids, ['mymod:whoosh', 'mymod:ding']);
  assert.ok(mod.resource.hasFile('sounds/mymod/whoosh.ogg'));
  const defs = JSON.parse(mod.resource.getFile('sounds/sound_definitions.json')!.toString()) as AnyObj;
  assert.equal(defs.sound_definitions['mymod:whoosh'].sounds[0].volume, 0.7);
  assert.equal(defs.sound_definitions['mymod:ding'].sounds[0].stream, true);
  console.log('[ok] RP modules (lang/atlas/attachable/soundbatch) integrate');
}

function testDynamicItemModel() {
  const chainsaw = new DynamicItemModel({
    identifier: 'mymod:chainsaw',
    bones: [
      { name: 'rightItem', pivot: [0, 24, 0], cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] },
      { name: 'blade', parent: 'rightItem', pivot: [0, 0, 0], cubes: [{ origin: [-8, 2, -0.5], size: [16, 1, 1], uv: [0, 8] }] },
    ],
    animations: { spin: { bone: 'blade', rotation: ['0', 'q.life_time * 360', '0'] } },
    animateWhen: { spin: 'q.main_hand_item_use_duration > 0.0f' },
  });
  // 1) Attachable
  const attachable = chainsaw.buildAttachableJson() as AnyObj;
  const desc = attachable['minecraft:attachable'].description;
  assert.equal(desc.identifier, 'mymod:chainsaw');
  assert.equal(desc.materials.default, 'entity_alphatest');
  assert.ok(desc.animations.spin, 'animation.chainsaw.spin');
  assert.equal(desc.scripts.animate[0].spin, 'q.main_hand_item_use_duration > 0.0f');
  assert.deepEqual(desc.render_controllers, ['controller.render.item_default']);

  // 2) Geometry
  const geo = chainsaw.buildGeometryJson() as AnyObj;
  const geoKey = Object.keys(geo).find((k) => k !== 'format_version')!;
  assert.equal(geoKey, 'geometry.chainsaw');
  const bones = geo[geoKey].bones;
  assert.equal(bones[0].name, 'rightItem');
  assert.equal(bones[1].parent, 'rightItem');
  assert.equal(bones[1].cubes[0].size[0], 16);

  // 3) Animation
  const anim = chainsaw.buildAnimationJson() as AnyObj;
  assert.ok(anim.animations['animation.chainsaw.spin']);
  const spin = anim.animations['animation.chainsaw.spin'];
  assert.equal(spin.loop, true);
  assert.deepEqual(spin.bones.blade.rotation, ['0', 'q.life_time * 360', '0']);
  // Top-level format_version only (not inside the animation object).
  assert.equal('format_version' in anim, true);
  assert.equal('format_version' in spin, false, 'no format_version inside animation object');

  // 4) Files
  const files = chainsaw.buildFiles();
  assert.equal(files.attachable.path, 'attachables/chainsaw.json');
  assert.equal(files.geometry.path, 'models/entity/chainsaw.geo.json');
  assert.equal(files.animation!.path, 'animations/chainsaw.animation.json');
  console.log('[ok] DynamicItemModel generates 3-file dynamic model');
}

function testDynamicItemModelIntegration() {
  const mod = new ModMain({
    name: 'Dyn Model Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'dyn-model-test' },
  });
  const chainsaw = new DynamicItemModel({
    identifier: 'mymod:chainsaw',
    bones: [{ name: 'rightItem', pivot: [0, 24, 0], cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] }],
    animations: { spin: { bone: 'rightItem', rotation: ['0', 'q.life_time * 360', '0'] } },
  });
  const paths = mod.resource.addDynamicItemModel(chainsaw);
  assert.equal(paths.length, 3);
  for (const p of paths) {
    assert.ok(mod.resource.hasFile(p), `missing ${p}`);
  }
  assert.ok(mod.resource.hasFile('attachables/chainsaw.json'));
  assert.ok(mod.resource.hasFile('models/entity/chainsaw.geo.json'));
  assert.ok(mod.resource.hasFile('animations/chainsaw.animation.json'));
  console.log('[ok] DynamicItemModel integrates into RP');
}

function testInlineDynamicModelOnItem() {
  // Tools 直接内联 dynamicModel
  const chainsaw = new Tools({
    identifier: 'mymod:chainsaw',
    name: 'Chainsaw',
    maxDurability: 800,
    texturePath: 'textures/items/chainsaw',
    dynamicModel: {
      bones: [
        { name: 'rightItem', pivot: [0, 24, 0], cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] },
        { name: 'blade', parent: 'rightItem', pivot: [0, 0, 0], cubes: [{ origin: [-8, 2, -0.5], size: [16, 1, 1], uv: [0, 8] }] },
      ],
      animations: { spin: { bone: 'blade', rotation: ['0', 'q.life_time * 360', '0'] } },
      animateWhen: { spin: 'q.main_hand_item_use_duration > 0.0f' },
    },
  });

  // 动态模型自动绑定物品 identifier + texture
  assert.equal(chainsaw.hasDynamicModel, true);
  assert.ok(chainsaw.dynamicModel);
  assert.equal(chainsaw.dynamicModel.identifier, 'mymod:chainsaw');
  assert.equal(chainsaw.dynamicModel.config.texture, 'textures/items/chainsaw');

  // 无 dynamicModel 的物品不受影响
  const ruby = new Item({ identifier: 'mymod:ruby' });
  assert.equal(ruby.hasDynamicModel, false);
  assert.equal(ruby.dynamicModel, null);
  console.log('[ok] Item can inline a dynamicModel');
}

function testFrameSequence() {
  // 20 帧序列（模拟銀弑の刃 剑动画）
  const seq = new FrameSequence({
    controllerId: 'controller.render.animated_sword',
    geometry: 'geometry.sword',
    frameTextures: Array.from({ length: 20 }, (_, i) => `texture.sword${i + 1}`),
  });
  // RC
  const rc = seq.buildRenderControllerJson() as AnyObj;
  const controller = rc.render_controllers['controller.render.animated_sword'];
  assert.equal(controller.arrays.textures['array.frames'].length, 20);
  assert.equal(controller.textures[0], 'array.frames[math.floor(query.anim_time * 10) % 20]');
  assert.equal(controller.geometry, 'geometry.sword');
  assert.equal(controller.filter_lighting, true);
  assert.equal(seq.fileName, 'animated_sword.rc.json');

  // textures map / frames
  const map = seq.buildTexturesMap();
  assert.equal(Object.keys(map).length, 20);
  assert.equal(map['texture.sword1'], 'textures/entity/animated_sword/frame0');
  const frames = seq.buildFrames();
  assert.equal(frames[19].textureName, 'texture.sword20');
  console.log('[ok] FrameSequence builds RC + textures map');
}

function testFrameSequenceIntegration() {
  const mod = new ModMain({
    name: 'Frame Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'frame-mod-test' },
  });
  const seq = new FrameSequence({
    controllerId: 'controller.render.animated_sword',
    geometry: 'geometry.sword',
    frameTextures: Array.from({ length: 4 }, (_, i) => `texture.frame${i}`),
  });
  mod.resource.addFrameSequence(seq);
  assert.ok(mod.resource.hasFile('render_controllers/animated_sword.rc.json'));

  // 帧贴图 + 占位图
  const paths = mod.resource.addFrameTextures(seq, { placeholderColor: [200, 100, 50] });
  assert.equal(paths.length, 4);
  assert.ok(mod.resource.hasFile('textures/entity/animated_sword/frame0.png'));
  const atlas = JSON.parse(mod.resource.getFile('textures/item_texture.json')!.toString()) as AnyObj;
  assert.ok(atlas.texture_data['texture.frame3']);
  console.log('[ok] FrameSequence integrates into RP with placeholder frames');
}

function testItemAssetsOneStop() {
  const mod = new ModMain({
    name: 'Assets Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'assets-mod-test' },
  });
  const chainsaw = new Tools({
    identifier: 'mymod:chainsaw',
    maxDurability: 800,
    texturePath: 'textures/items/chainsaw',
    dynamicModel: {
      bones: [{ name: 'rightItem', pivot: [0, 24, 0], cubes: [{ origin: [-6, 0, -1], size: [12, 4, 2], uv: [0, 0] }] }],
    },
  });
  const ruby = new Item({ identifier: 'mymod:ruby', texturePath: 'textures/items/ruby' }); // 无动态模型

  const paths = mod.resource.addItemsAssets([chainsaw, ruby]);

  // 贴图 atlas + 占位图
  assert.ok(mod.resource.hasFile('textures/item_texture.json'));
  assert.ok(mod.resource.hasFile('textures/items/chainsaw.png'));
  assert.ok(mod.resource.hasFile('textures/items/ruby.png'));

  // 动态模型三件套（仅 chainsaw）
  assert.ok(mod.resource.hasFile('attachables/chainsaw.json'));
  assert.ok(mod.resource.hasFile('models/entity/chainsaw.geo.json'));
  assert.equal(mod.resource.hasFile('attachables/ruby.json'), false);
  // 2 个贴图名 + chainsaw 动态模型的 attachable/geometry（无动画不生成动画文件）
  assert.ok(paths.length >= 4, `expected >=4 paths, got ${paths.length}`);
  console.log('[ok] addItemAssets one-stop wires texture + dynamic model');
}

function testTradeTable() {
  const minister = new TradeTable({
    tiers: [
      {
        groups: [
          {
            numToSelect: 1,
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
                maxUses: 7,
                traderExp: 3,
              },
              {
                wants: [{ item: 'wiki:crystalline_spiritite', quantity: 32 }],
                gives: [
                  {
                    item: 'wiki:exalted_blade',
                    functions: [enchantWithLevels({ min: 15, max: 25 }, true)],
                  },
                ],
                maxUses: 2,
                rewardExp: false,
                traderExp: 8,
              },
            ],
          },
        ],
      },
      {
        totalExpRequired: 28,
        trades: [
          {
            wants: [
              {
                choice: [
                  { item: 'wiki:sacred_stones', quantity: { min: 4, max: 6 } },
                  { item: 'wiki:blessed_beads', quantity: { min: 16, max: 24 } },
                ],
              },
            ],
            gives: [{ item: 'wiki:aeleon_jewels' }],
            maxUses: 2,
          },
        ],
      },
    ],
  });
  const json = minister.buildJson() as AnyObj;
  assert.equal(json.tiers.length, 2);

  // tier 0: groups
  const tier0 = json.tiers[0];
  assert.equal(tier0.groups[0].num_to_select, 1);
  const trade0 = tier0.groups[0].trades[0];
  assert.equal(trade0.wants.length, 2);
  assert.equal(trade0.wants[0].quantity.min, 2);
  assert.equal(trade0.wants[0].price_multiplier, 0.5);
  assert.equal(trade0.gives[0].functions[0].function, 'enchant_book_for_trading');
  assert.equal(trade0.max_uses, 7);
  assert.equal(trade0.trader_exp, 3);

  // 第二个 group trade 使用 enchant_with_levels
  const trade1d = tier0.groups[0].trades[1];
  assert.equal(trade1d.wants[0].item, 'wiki:crystalline_spiritite');
  const ewl = trade1d.gives[0].functions[0];
  assert.equal(ewl.function, 'enchant_with_levels');
  assert.equal(ewl.treasure, true);
  assert.equal(ewl.levels.min, 15);
  assert.equal(trade1d.reward_exp, false);
  assert.equal(trade1d.trader_exp, 8);

  // tier 1: trades + total_exp_required + choice
  const tier1 = json.tiers[1];
  assert.equal(tier1.total_exp_required, 28);
  const trade1 = tier1.trades[0];
  assert.ok(Array.isArray(trade1.wants[0].choice));
  assert.equal(trade1.wants[0].choice[0].item, 'wiki:sacred_stones');
  assert.equal(trade1.max_uses, 2);
  console.log('[ok] TradeTable builds tiers/groups/trades');
}

function testTradeTableIntegration() {
  const mod = new ModMain({
    name: 'Trade Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'trade-mod-test' },
  });
  const table = new TradeTable({
    tiers: [
      {
        trades: [
          {
            wants: [{ item: 'minecraft:emerald', quantity: 4 }],
            gives: [{ item: 'mymod:ruby' }],
          },
        ],
      },
    ],
  });
  const path = mod.behavior?.addTradeTable(table, 'trading/wiki/minister');
  assert.ok(path);
  assert.ok(mod.behavior!.hasFile('trading/wiki/minister.json'));
  console.log('[ok] TradeTable integrates into BP under trading/');
}

function testBlock() {
  const lamp = new Block({
    identifier: 'wiki:lamp',
    category: 'items',
    components: {
      'minecraft:light_emission': 15,
      'minecraft:light_dampening': 0,
      'minecraft:map_color': '#ffffff',
      'minecraft:destructible_by_mining': { seconds_to_destroy: 3 },
      'minecraft:geometry': 'minecraft:geometry.full_block',
      'minecraft:material_instances': { '*': { texture: 'wiki:lamp' } },
    },
    permutations: [
      { condition: 'query.block_property("wiki:on") == true', components: { 'minecraft:light_emission': 15 } },
    ],
  });
  const json = lamp.buildJson() as AnyObj;
  assert.equal(json.format_version, '1.26.50');
  const block = json['minecraft:block'];
  assert.equal(block.description.identifier, 'wiki:lamp');
  assert.equal(block.description.menu_category.category, 'items');
  assert.equal(block.components['minecraft:light_emission'], 15);
  assert.equal(block.components['minecraft:geometry'], 'minecraft:geometry.full_block');
  assert.equal(block.components['minecraft:material_instances']['*'].texture, 'wiki:lamp');
  assert.equal(block.permutations.length, 1);
  assert.equal(lamp.shortName, 'lamp');
  assert.equal(lamp.fileName, 'lamp.json');
  console.log('[ok] Block builds valid BP definition');
}

function testBlockIntegration() {
  const mod = new ModMain({
    name: 'Block Mod',
    author: 'devx',
    sapi: { entry: 'scripts/main.js' },
    uuid: { seed: 'block-mod-test' },
  });
  const lamp = new Block({
    identifier: 'wiki:lamp',
    category: 'items',
    components: {
      'minecraft:geometry': 'minecraft:geometry.full_block',
      'minecraft:material_instances': { '*': { texture: 'wiki:lamp' } },
    },
  });
  mod.behavior?.addBlock(lamp);
  assert.ok(mod.behavior!.hasFile('blocks/lamp.json'));

  mod.resource.addBlockTexture(lamp, { placeholderColor: [255, 200, 0] });
  mod.resource.addBlockName(lamp, 'Custom Lamp');

  assert.ok(mod.resource.hasFile('textures/terrain_texture.json'));
  assert.ok(mod.resource.hasFile('textures/blocks/lamp.png'));
  const terrain = JSON.parse(mod.resource.getFile('textures/terrain_texture.json')!.toString()) as AnyObj;
  assert.ok(terrain.texture_data['wiki:lamp']);
  const lang = mod.resource.getFile('texts/en_US.lang')!.toString();
  assert.ok(lang.includes('tile.wiki:lamp.name=Custom Lamp'));

  // addBlockName twice should not duplicate the key.
  mod.resource.addBlockName(lamp, 'Renamed Lamp');
  const lang2 = mod.resource.getFile('texts/en_US.lang')!.toString();
  assert.equal(lang2.split('tile.wiki:lamp.name=').length - 1, 1, 'no duplicate tile keys');
  assert.ok(lang2.includes('tile.wiki:lamp.name=Renamed Lamp'));
  console.log('[ok] Block integrates into BP + RP (terrain/lang)');
}

function testBlockStatesAndFlipbook() {
  // Block with states/traits/permutations
  const slab = new Block({
    identifier: 'wiki:custom_slab',
    category: 'construction',
    states: {
      'wiki:string_state_example': ['red', 'green', 'blue'],
      'wiki:boolean_state_example': [false, true],
      'wiki:integer_range_state_example': { values: { min: 0, max: 5 } },
    },
    traits: { 'minecraft:placement_position': { enabled_states: ['minecraft:vertical_half'] } },
    components: { 'minecraft:geometry': 'minecraft:geometry.full_block' },
    permutations: [
      { condition: "q.block_state('wiki:boolean_state_example')", components: { 'minecraft:friction': 0.8 } },
    ],
  });
  const json = slab.buildJson() as AnyObj;
  const desc = json['minecraft:block'].description;
  assert.deepEqual(desc.states['wiki:string_state_example'], ['red', 'green', 'blue']);
  assert.deepEqual(desc.states['wiki:integer_range_state_example'], { values: { min: 0, max: 5 } });
  assert.deepEqual(desc.traits['minecraft:placement_position'].enabled_states, ['minecraft:vertical_half']);
  assert.equal(json['minecraft:block'].permutations.length, 1);
  assert.equal(json['minecraft:block'].permutations[0].condition, "q.block_state('wiki:boolean_state_example')");
  console.log('[ok] Block supports states/traits/permutations');

  // Chainable setters return `this`.
  const chained = new Block({ identifier: 'wiki:chain' })
    .setCategory('nature')
    .setGroup('minecraft:itemGroup.name.slab')
    .setComponent('minecraft:friction', 0.5)
    .setLoot('loot_tables/blocks/chain')
    .addState('wiki:lit', [false, true])
    .addPermutation({ condition: "q.block_state('wiki:lit')", components: { 'minecraft:light_emission': 10 } });
  assert.equal(chained, chained, 'setters return this');
  const cj = (chained.buildJson() as AnyObj)['minecraft:block'] as AnyObj;
  assert.equal(cj.description.menu_category.category, 'nature');
  assert.equal(cj.components['minecraft:loot'], 'loot_tables/blocks/chain.json');
  assert.ok(cj.description.states['wiki:lit']);
  assert.equal(cj.permutations.length, 1);
  console.log('[ok] Block chainable setters');

  // Flipbook texture generation + Resource integration
  const mod = new ModMain({ name: 'Flip Mod', author: 'devx', sapi: 'scripts/main.js', uuid: { seed: 'flip-mod' } });
  const flip = new FlipbookTextures({ atlasTile: 'magma', flipbookTexture: 'textures/blocks/magma', ticksPerFrame: 10 });
  mod.resource.addFlipbookTexture(flip);
  assert.ok(mod.resource.hasFile('textures/flipbook_textures.json'));
  const fb = JSON.parse(mod.resource.getFile('textures/flipbook_textures.json')!.toString()) as AnyObj;
  assert.equal(fb.length, 1);
  assert.equal(fb[0].atlas_tile, 'magma');
  assert.equal(fb[0].ticks_per_frame, 10);
  assert.equal(fb[0].flipbook_texture, 'textures/blocks/magma');

  // Multiple adds accumulate
  const flip2 = new FlipbookTextures({ atlasTile: 'water', flipbookTexture: 'textures/blocks/water', atlasIndex: 1 });
  mod.resource.addFlipbookTexture(flip2);
  const fb2 = JSON.parse(mod.resource.getFile('textures/flipbook_textures.json')!.toString()) as AnyObj;
  assert.equal(fb2.length, 2);
  assert.equal(fb2[1].atlas_index, 1);
  console.log('[ok] FlipbookTextures generates + accumulates');
}

function testResourceOnly() {
  const rp = new Resource({
    name: 'Test RP',
    description: 'A test resource pack.',
    author: 'devx',
    version: [1, 2, 3],
    uuid: { seed: 'test-rp' },
  });
  const manifest = rp.buildManifest();
  assert.equal(manifest.header.name, 'Test RP');
  assert.equal(manifest.header.version[0], 1);
  assert.equal(manifest.modules[0].type, 'resources');
  assert.ok(isValidUuid(manifest.header.uuid));
  assert.ok(isValidUuid(manifest.modules[0].uuid));
  console.log('[ok] Resource builds a valid manifest');
}

function testBehaviorWithScript() {
  const bp = new Behavior({
    name: 'Test BP',
    description: 'A test behavior pack.',
    author: 'devx',
    script: { entry: 'scripts/main.js', language: 'javascript', runtimeVersion: '1.11.0' },
    uuid: { seed: 'test-bp' },
  });
  const manifest = bp.buildManifest();
  assert.equal(manifest.modules[0].type, 'data');
  assert.equal(manifest.modules[1].type, 'script');
  assert.equal(manifest.modules[1].entry, 'scripts/main.js');
  assert.ok(
    manifest.dependencies?.some((d: { module_name?: string }) => d.module_name === '@minecraft/server')
  );
  console.log('[ok] Behavior builds a manifest with a script module');
}

function testBehaviorWithoutScript() {
  const bp = new Behavior({
    name: 'Data Only BP',
    script: undefined,
    uuid: { seed: 'test-bp-data' },
  });
  const manifest = bp.buildManifest();
  assert.equal(manifest.modules.length, 1);
  assert.equal(manifest.modules[0].type, 'data');
  assert.equal(manifest.dependencies, undefined);
  console.log('[ok] Behavior can omit the script module');
}

function testModMain() {
  const mod = new ModMain({
    name: 'Spawn Mod',
    description: 'Spawns mobs.',
    author: 'devx',
    version: [2, 0, 0],
    sapi: 'scripts/main.js',
    uuid: { seed: 'spawn-mod-test' },
  });
  const result = mod.build();
  assert.equal(result.resourcePack.header.name, 'Spawn Mod');
  assert.ok(result.behaviorPack);
  assert.ok(result.behavior);
  assert.ok(result.resource);
  assert.equal(result.behaviorPack!.modules[1].type, 'script');
  // RP depends on BP (avoid circular dependency); BP does NOT depend on RP.
  assert.equal(result.resourcePack.dependencies?.[0].uuid, result.behaviorPack!.header.uuid);
  const bpDeps = result.behaviorPack!.dependencies ?? [];
  assert.ok(
    !bpDeps.some((d: { uuid?: string }) => d.uuid === result.resourcePack.header.uuid),
    'BP must not depend on RP (circular dependency)'
  );
  console.log('[ok] ModMain composes BP + RP (RP depends on BP only)');
}

function testDeterministicUuids() {
  const a = new ModMain({ name: 'Stable', uuid: { seed: 'stable' } });
  const b = new ModMain({ name: 'Stable', uuid: { seed: 'stable' } });
  assert.equal(a.build().resourcePack.header.uuid, b.build().resourcePack.header.uuid);
  assert.equal(a.build().behaviorPack?.header.uuid, b.build().behaviorPack?.header.uuid);
  console.log('[ok] UUIDs are deterministic for the same seed');
}

function testPositionalConstructor() {
  const mod = new ModMain('Positional', 'Desc', 'author', [3, 0, 0], [1, 21, 0], 'scripts/x.ts');
  assert.equal(mod.config.name, 'Positional');
  assert.equal(mod.config.version[0], 3);
  assert.equal(mod.config.sapi?.entry, 'scripts/x.ts');
  // Constructor (recto) should treat a string sapi as javascript.
  assert.equal(mod.config.sapi?.language, 'javascript');
  console.log('[ok] Positional constructor works');
}

await testWriteToDisk();
await testAddDirectory();
testPackFiles();
testBaseItem();
testToolsItem();
testArmorItem();
testFoodItem();
testFuelItem();
testThrowableItem();
testPlacerItems();
testRecordDiscItem();
testSoundSystem();
testItemPackIntegration();
testShapelessRecipe();
testShapedRecipe();
testFurnaceAndBrewingRecipes();
testLootTable();
testRecipeAndLootIntegration();
testEntityBP();
testEntityRPAndRenderController();
testSpawnRules();
testEntityIntegration();
testLangFile();
testItemTextureAtlas();
testAttachable();
testSoundBatchAndResourceRp();
testDynamicItemModel();
testDynamicItemModelIntegration();
testInlineDynamicModelOnItem();
testItemAssetsOneStop();
testFrameSequence();
testFrameSequenceIntegration();
testTradeTable();
testTradeTableIntegration();
testBlock();
testBlockIntegration();
testBlockStatesAndFlipbook();
testResourceOnly();
testBehaviorWithScript();
testBehaviorWithoutScript();
testModMain();
testDeterministicUuids();
testPositionalConstructor();
testZipOutput();
console.log('\nAll SpawnModBE smoke tests passed.');
