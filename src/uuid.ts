/**
 * UUID helpers.
 *
 * Minecraft manifests require a `uuid` on the header and on every module. When
 * building an addon that spans multiple packs (resource + behavior), those UUIDs
 * must be stable so that dependency references between packs keep working across
 * rebuilds. This module derives a deterministic, version-4-style UUID set from a
 * seed string, while still allowing callers to pin explicit UUIDs.
 */

import { createHash, randomUUID } from 'node:crypto';

import type { UuidConfig, UuidRole } from './types.js';

/** A canonical UUID v4 pattern. */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** All UUID roles a mod can need, in a stable derivation order. */
export const UUID_ROLES: readonly UuidRole[] = [
  'resourcePackHeader',
  'resourcePackModule',
  'behaviorPackHeader',
  'behaviorPackDataModule',
  'behaviorPackScriptModule',
] as const;

/** Returns `true` if `value` is a valid canonical UUID v4 string. */
export function isValidUuid(value: string): boolean {
  return UUID_V4_PATTERN.test(value);
}

/**
 * Derives a version-4 UUID from `seedText` by hashing it (SHA-256) and writing
 * the required version/variant nibbles into the hash bytes. Two distinct seeds
 * produce distinct UUIDs; the same seed always produces the same UUID.
 */
export function deriveUuid(seedText: string): string {
  const digest = createHash('sha256').update(seedText).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));

  // Set the version nibble (4) in the most significant 4 bits of byte 6.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set the variant nibble (10xx) in the most significant 4 bits of byte 8.
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * A pool of UUIDs, one per role. Built deterministically from a seed so that
 * repeated builds of the same mod are byte-identical.
 */
export class UuidPool {
  private readonly byRole: Map<UuidRole, string>;

  constructor(seed: string, explicit?: UuidConfig['explicit']) {
    this.byRole = new Map();
    for (const role of UUID_ROLES) {
      const provided = explicit?.[role];
      if (provided !== undefined) {
        if (!isValidUuid(provided)) {
          throw new Error(`Invalid explicit UUID for "${role}": ${provided}`);
        }
        this.byRole.set(role, provided);
      } else {
        this.byRole.set(role, deriveUuid(`${seed}::${role}`));
      }
    }
  }

  /** Returns the UUID for the given role. */
  get(role: UuidRole): string {
    const value = this.byRole.get(role);
    if (value === undefined) {
      throw new Error(`UUID role "${role}" is not part of the pool.`);
    }
    return value;
  }

  /** Returns all derived UUIDs as a plain object keyed by role. */
  toObject(): Record<UuidRole, string> {
    return Object.fromEntries(this.byRole.entries()) as Record<UuidRole, string>;
  }
}

/** Generates a random, valid version-4 UUID (used when a seed is not desired). */
export function generateUuid(): string {
  return randomUUID();
}
