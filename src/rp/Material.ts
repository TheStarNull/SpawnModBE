/**
 * The `Material` class — a resource-pack material definition file.
 *
 * Material files live at `RP/materials/<fileName>` and map material names to
 * shader/rendering definitions (e.g. custom entity materials extending
 * `entity_emissive_alpha`). The generated JSON wraps the mapping under a
 * `materials` node with a `version`, matching the vanilla schema.
 */

/** Configuration accepted by {@link Material}. */
export interface MaterialConfig {
  /**
   * The file name under `materials/`, e.g. `'entity.material'`.
   */
  fileName: string;
  /**
   * Material name → definition. Definitions are passed through loosely: an
   * empty object means "inherit the same-named vanilla material", while a map
   * may carry shader directives like `{ '+defines': ['USE_ONLY_EMISSIVE'] }`.
   */
  materials: Record<string, Record<string, unknown>>;
  /** The materials schema version. Defaults to `'1.0.0'`. */
  version?: string;
}

/** The resolved material configuration (defaults filled in). */
export interface ResolvedMaterialConfig {
  fileName: string;
  materials: Record<string, Record<string, unknown>>;
  version: string;
}

/** A resource-pack `materials/*.material` file. */
export class Material {
  /** The fully-resolved configuration. */
  readonly config: ResolvedMaterialConfig;

  constructor(config: MaterialConfig) {
    if (!config || typeof config.fileName !== 'string' || config.fileName.trim() === '') {
      throw new Error('Material requires a non-empty "fileName".');
    }
    if (!config.materials || Object.keys(config.materials).length === 0) {
      throw new Error('Material requires at least one material definition.');
    }
    const materials: Record<string, Record<string, unknown>> = {};
    for (const [name, def] of Object.entries(config.materials)) {
      materials[name] = { ...def };
    }
    this.config = {
      fileName: config.fileName.replace(/^\/+/, ''),
      materials,
      version: config.version ?? '1.0.0',
    };
  }

  /** The file name under `materials/`. */
  get fileName(): string {
    return this.config.fileName;
  }

  /** The material names defined in this file. */
  get names(): string[] {
    return Object.keys(this.config.materials);
  }

  /** Builds the `materials/<fileName>` JSON body. */
  buildJson(): Record<string, unknown> {
    return {
      materials: {
        version: this.config.version,
        ...this.config.materials,
      },
    };
  }
}
