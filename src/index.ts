/**
 * SpawnModBE — a TypeScript framework for generating Minecraft Bedrock Edition
 * (MCBE) mods/addons via the Script API (SAPI).
 *
 * @packageDocumentation
 */

export { ModMain } from './ModMain.js';
export type { Addable, DefineSpec } from './routing.js';
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
export { Feature, oreFeature, singleBlockFeature } from './feature/index.js';
export type { FeatureConfig, ResolvedFeatureConfig } from './feature/index.js';
export { FeatureRule } from './feature/index.js';
export type { FeatureRuleConfig, FeatureRuleDistribution, ResolvedFeatureRuleConfig } from './feature/index.js';
export { Biome, climate, surfaceParameters, biomeTags } from './biome/index.js';
export type { BiomeConfig, ResolvedBiomeConfig, ClimateOptions } from './biome/index.js';
export { Fog } from './fog/index.js';
export type { FogConfig, FogDistanceLayer, ResolvedFogConfig, ResolvedFogDistanceLayer } from './fog/index.js';
export { Animation, animationShortName } from './animation/index.js';
export type { AnimationConfig, ResolvedAnimationConfig } from './animation/index.js';
export { AnimationController, state, transition } from './animation/index.js';
export type { AnimationControllerConfig, ResolvedAnimationControllerConfig, StateOptions } from './animation/index.js';
export { Dialogue, dialogueButton, scene } from './dialogue/index.js';
export type { DialogueConfig, ResolvedDialogueConfig, SceneOptions } from './dialogue/index.js';
export { Structure } from './structure/index.js';
export type { PaletteBlock, ResolvedStructureConfig, StructureConfig } from './structure/index.js';
export { StructurePlacement } from './structure/index.js';
export type { ResolvedStructurePlacementConfig, StructurePlacementConfig, StructureTransform } from './structure/index.js';
export { SERVER_MODULE, ScriptApiSource, ScriptFile, fetchScriptsOfType } from './script/index.js';
export type { ResolvedScriptApiSourceOptions, ScriptApiSourceOptions } from './script/index.js';
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
  BiomesClient,
  BIOMES_CLIENT_PATH,
  buildBiomeClientEntry,
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
  BiomeClientEntry,
  BiomeClientParticle,
  BiomesClientConfig,
  ClientColor,
  ResolvedBiomeClientEntry,
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
  UiToggle,
  UiDropdown,
  UiSlider,
  UiSliderBox,
  UiEditBox,
  UiSelectionWheel,
  UiCollectionPanel,
  UiInputPanel,
  UiScrollView,
  UiScrollbarTrack,
  UiScrollbarBox,
  UiFactory,
  UiCustom,
} from './ui/index.js';
export type {
  UiAnchor,
  UiButtonOptions,
  UiColor,
  UiCollectionPanelOptions,
  UiContainerOptions,
  UiControl,
  UiCustomOptions,
  UiDropdownOptions,
  UiEditBoxOptions,
  UiElementData,
  UiElementInput,
  UiElementOptions,
  UiElementType,
  UiFactoryOptions,
  UiFileConfig,
  UiGridOptions,
  UiImageOptions,
  UiInputPanelOptions,
  UiLabelOptions,
  UiPanelOptions,
  UiPair,
  UiScrollbarBoxOptions,
  UiScrollbarTrackOptions,
  UiScrollViewOptions,
  UiSelectionWheelOptions,
  UiSliderBoxOptions,
  UiSliderOptions,
  UiStackPanelOptions,
  UiToggleOptions,
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
