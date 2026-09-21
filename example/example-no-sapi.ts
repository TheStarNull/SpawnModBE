/**
 * Example: building a resource-pack-only mod (no SAPI entry).
 *
 * Demonstrates that when `sapi` is omitted, the framework produces a resource
 * pack only and no behavior pack. Run with: `npm run example:no-sapi`.
 */

import { ModMain } from '../src/index.js';

const noSapi = new ModMain({
  name: 'Texture Pack',
  description: 'A pure resource pack.',
  author: 'devx',
  version: [1, 0, 0],
  // No `sapi` field -> behavior pack is `null`.
});

const result = noSapi.build();

console.log('Behavior pack (should be null):', result.behaviorPack);
console.log('\nResource pack manifest:');
console.log(JSON.stringify(result.resourcePack, null, 2));
