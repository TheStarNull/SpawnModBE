/**
 * Resource-pack (RP) module barrel export.
 */

export { LangFile } from './LangFile.js';
export type { LangEntry, LangFileConfig } from './LangFile.js';
export { ItemTextureAtlas } from './ItemTextureAtlas.js';
export type { ItemTextureEntry, ItemTextureAtlasConfig, TexturePaths } from './ItemTextureAtlas.js';
export { Attachable } from './Attachable.js';
export type { AttachableConfig, ResolvedAttachableConfig } from './Attachable.js';
export { SoundBatch } from './SoundBatch.js';
export type { SoundBatchConfig, SoundBatchEntry } from './SoundBatch.js';
export { DynamicItemModel } from './DynamicItemModel.js';
export type {
  BoneAnimation,
  DynamicItemModelConfig,
  DynamicItemModelFiles,
  ModelBone,
  ModelCube,
} from './DynamicItemModel.js';
export { FrameSequence } from './FrameSequence.js';
export type {
  FrameSequenceConfig,
  FrameSpec,
  ResolvedFrameSequenceConfig,
} from './FrameSequence.js';
export { FlipbookTextures } from './FlipbookTextures.js';
export type { FlipbookEntry, FlipbookTexturesConfig } from './FlipbookTextures.js';
export { BiomesClient, BIOMES_CLIENT_PATH, buildBiomeClientEntry } from './BiomesClient.js';
export type {
  BiomeClientEntry,
  BiomeClientParticle,
  BiomesClientConfig,
  ClientColor,
  ResolvedBiomeClientEntry,
} from './BiomesClient.js';
export { Material } from './Material.js';
export type { MaterialConfig, ResolvedMaterialConfig } from './Material.js';
export { EntityModel } from './EntityModel.js';
export type { EntityModelConfig, ResolvedEntityModelConfig } from './EntityModel.js';
