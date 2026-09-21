/**
 * SpawnModBE — a TypeScript framework for generating Minecraft Bedrock Edition
 * (MCBE) mods/addons via the Script API (SAPI).
 *
 * @packageDocumentation
 */

export { ModMain } from './ModMain.js';
export { Behavior } from './Behavior.js';
export { Resource } from './Resource.js';
export {
  Item,
  Tools,
  Armor,
  Food,
  Fuel,
  Throwable,
  BlockPlacer,
  EntityPlacer,
  RecordDisc,
  itemShortName,
  type UseAnimation,
} from './item/index.js';
export {
  Block,
} from './block/index.js';
export type {
  BlockBox,
  BlockBoxVec,
  BlockCategory,
  BlockConfig,
  BlockMaterialInstance,
  BlockPermutation,
  BlockStates,
  BlockStateValues,
  BlockTraits,
  ResolvedBlockConfig,
} from './block/index.js';
export {
  Recipe,
  Shapeless,
  Shaped,
  Furnace,
  BrewingMix,
  BrewingContainer,
} from './recipe/index.js';
export type {
  RecipeConfig,
  RecipeItem,
  RecipeTag,
  RecipeUnlock,
  ShapelessConfig,
  RecipeKeyMap,
  ShapedConfig,
  FurnaceConfig,
  BrewingMixConfig,
  BrewingContainerConfig,
} from './recipe/index.js';
export {
  LootTable,
  setCount,
  setName,
  killedByPlayer,
  randomChanceWithLooting,
} from './loot/index.js';
export { TradeTable, enchantBookForTrading, enchantWithLevels } from './trade/index.js';
export type {
  Trade,
  TradeChoice,
  TradeEntry,
  TradeFunction,
  TradeGroup,
  TradeItem,
  TradePrice,
  TradeQuantity,
  TradeTableConfig,
  TradeTier,
} from './trade/index.js';
export {
  EntityBP,
  EntityRP,
  RenderController,
  SpawnRules,
} from './entity/index.js';
export {
  LangFile,
  ItemTextureAtlas,
  Attachable,
  SoundBatch,
  DynamicItemModel,
  FrameSequence,
  FlipbookTextures,
} from './rp/index.js';
export type {
  LangEntry,
  LangFileConfig,
  ItemTextureEntry,
  ItemTextureAtlasConfig,
  TexturePaths,
  AttachableConfig,
  ResolvedAttachableConfig,
  SoundBatchConfig,
  SoundBatchEntry,
  BoneAnimation,
  DynamicItemModelConfig,
  DynamicItemModelFiles,
  ModelBone,
  ModelCube,
  FrameSequenceConfig,
  FrameSpec,
  ResolvedFrameSequenceConfig,
  FlipbookEntry,
  FlipbookTexturesConfig,
} from './rp/index.js';
export {
  UiFile,
  UiDefs,
  UiGlobalVariables,
  UiElement,
  UiLabel,
  UiImage,
  UiButton,
  UiPanel,
  UiStackPanel,
  UiGrid,
  UiScreen,
} from './ui/index.js';
export type {
  UiAnchor,
  UiButtonOptions,
  UiColor,
  UiContainerOptions,
  UiControl,
  UiElementData,
  UiElementInput,
  UiElementOptions,
  UiElementType,
  UiFileConfig,
  UiGridOptions,
  UiImageOptions,
  UiLabelOptions,
  UiPanelOptions,
  UiPair,
  UiStackPanelOptions,
  UiValue,
  UiDefsConfig,
  UiGlobalVariablesConfig,
} from './ui/index.js';
export type {
  ComponentGroup,
  EntityBPConfig,
  EntityDescription,
  EntityEvent,
  EntityRPConfig,
  EggColor,
  MaterialBinding,
  RenderControllerConfig,
  DifficultyName,
  PopulationControl,
  SpawnCondition,
  SpawnRulesConfig,
} from './entity/index.js';
export type {
  LootCondition,
  LootEmptyEntry,
  LootEntry,
  LootFunction,
  LootItemEntry,
  LootRollCount,
  LootTableConfig,
  LootTableEntry,
  TieredLootPool,
  WeightedLootPool,
} from './loot/index.js';
export type {
  ItemCategory,
  ItemConfig,
  ItemRarity,
  ResolvedItemConfig,
  DestroySpeedSpec,
  EnchantSlot,
  RepairItemSpec,
  ResolvedToolsConfig,
  ToolsConfig,
  ArmorConfig,
  ArmorSlot,
  DamageCause,
  ResolvedArmorConfig,
  FoodConfig,
  ResolvedFoodConfig,
  FuelConfig,
  ResolvedFuelConfig,
  AmmunitionSpec,
  ResolvedThrowableConfig,
  ThrowableConfig,
  BlockDescriptorSpec,
  BlockPlacerConfig,
  ResolvedBlockPlacerConfig,
  EntityPlacerConfig,
  ResolvedEntityPlacerConfig,
  RecordDiscConfig,
  ResolvedRecordDiscConfig,
} from './item/index.js';
export { DEFAULT_PACK_ICON, EMPTY_PACK_ICON, buildIconPng } from './assets.js';
export { UUID_ROLES, UuidPool, deriveUuid, generateUuid, isValidUuid } from './uuid.js';
export { createZip, buildZip } from './zip.js';
export { crc32, normalizeZipPath, sanitizeFileName } from './util.js';
export type {
  AddDirectoryOptions,
  AddDirectoryResult,
  AddSoundOptions,
  SoundDefinition,
  SoundEventDefinition,
  BehaviorManifest,
  BehaviorPackConfig,
  BehaviorPackManifest,
  GameVersion,
  ManifestDependency,
  ManifestHeader,
  ManifestModule,
  ManifestModuleType,
  ModBuildResult,
  ModMainConfig,
  PackConfig,
  PackFile,
  PackManifest,
  ResourceManifest,
  ResourcePackConfig,
  ResourcePackManifest,
  ResolvedModMainConfig,
  ResolvedPackConfig,
  SapiConfig,
  ScriptLanguage,
  SemVer,
  UuidConfig,
  UuidRole,
  WriteToOptions,
  WriteToResult,
} from './types.js';
