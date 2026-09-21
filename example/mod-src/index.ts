/**
 * Example SAPI behavior-pack entry.
 *
 * This is the file the generated behavior pack will point at via its `entry`
 * manifest field. It is intentionally a minimal "hello world" that listens for
 * the world load event and prints a message.
 */

import { world } from '@minecraft/server';

world.afterEvents.worldLoad.subscribe(() => {
  world.sendMessage('§aSpawn Mod loaded!');
});
