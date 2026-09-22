#!/usr/bin/env node
/**
 * SpawnModBE CLI — scaffold a new Minecraft Bedrock Edition mod project.
 *
 * Zero runtime dependencies (mirrors the framework's build-time-only tooling).
 * The core command is `spawnmodbe init <dir>`, which generates a TypeScript
 * project that imports `spawnmodbe` and can be built into a `.mcaddon`.
 *
 * @packageDocumentation
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Boolean (no-value) CLI flags. */
const BOOLEAN_FLAGS = new Set(['force', 'no-sapi', 'no-install', 'help', 'version']);

/** CLI flags that take a value. */
const VALUE_FLAGS = new Set(['name', 'description', 'author']);

/** The files `init` is responsible for writing (used for the --force guard). */
const MANAGED_FILES = ['package.json', 'tsconfig.json', 'src/index.ts', 'README.md', '.gitignore'] as const;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Map<string, string | true>;
}

/** Splits raw argv into a command, positional arguments, and a flag map. */
function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? '';
  const positional: string[] = [];
  const flags = new Map<string, string | true>();

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      if (VALUE_FLAGS.has(name)) {
        const value = eq !== -1 ? arg.slice(eq + 1) : argv[++i];
        if (value === undefined) throw new Error(`Missing value for --${name}`);
        flags.set(name, value);
      } else if (BOOLEAN_FLAGS.has(name)) {
        flags.set(name, true);
      } else {
        throw new Error(`Unknown flag: --${name}`);
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

/** Walks up from the compiled file to find the package's own `version`. */
async function findPackageVersion(): Promise<string> {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as { version?: string };
      if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
    } catch {
      // Keep climbing toward the package root.
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}

/** Prints the installed framework version. */
async function printVersion(): Promise<number> {
  console.log(await findPackageVersion());
  return 0;
}

/** Prints usage information. */
function printHelp(): number {
  console.log([
    'SpawnModBE — scaffold Minecraft Bedrock Edition addons with TypeScript.',
    '',
    'Usage:',
    '  spawnmodbe init [<dir>] [options]   Scaffold a new mod project',
    '  spawnmodbe --version                Print the installed version',
    '  spawnmodbe --help                   Show this help',
    '',
    'Options (init):',
    '  --name <name>          Mod display name (default: directory name)',
    '  --description <desc>   Mod description',
    '  --author <author>      Mod author (default: "Your Name")',
    '  --no-sapi              Resource-pack-only mod (no behavior pack / scripts)',
    '  --force                Overwrite scaffolded files in a non-empty directory',
    '  --no-install           Skip `npm install` after scaffolding',
  ].join('\n'));
  return 0;
}

/** A valid npm package name derived from an arbitrary mod display name. */
function npmName(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'spawnmodbe-mod';
}

function asString(flags: Map<string, string | true>, key: string): string | undefined {
  const v = flags.get(key);
  return typeof v === 'string' ? v : undefined;
}

/** The zero-config SAPI entry that is scaffolded when a behavior pack is used. */
const SAPI_ENTRY = [
  "import { world } from '@minecraft/server';",
  'world.afterEvents.worldInitialize.subscribe(() => {',
  "  console.warn('SpawnModBE mod loaded!');",
  '});',
].join('\n');

/** Builds the scaffolded `src/index.ts` mod entry point. */
function buildIndexTs(modName: string, includeSapi: boolean): string {
  const sapiBlock = includeSapi
    ? ['  sapi: {', "    entry: 'scripts/main.js',", "    language: 'javascript',", '  },'].join('\n')
    : '  // Resource-pack only: no behavior pack is produced.';
  // Serialize the JS string so embedded quotes / newlines are escaped safely.
  const scriptLiteral = JSON.stringify(SAPI_ENTRY);
  const scriptBlock = includeSapi
    ? [
        '',
        '// A zero-config SAPI entry so the behavior pack works out of the box.',
        `mod.behavior!.addFile('scripts/main.js', ${scriptLiteral});`,
      ].join('\n')
    : '';

  return [
    '/**',
    ` * ${modName} — SpawnModBE mod entry point.`,
    ' *',
    ' * Run `npm run pack` to build the mod and write `out/<name>.mcaddon`.',
    ' */',
    "import { mkdirSync, writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "import { pathToFileURL } from 'node:url';",
    "import { ModMain } from 'spawnmodbe';",
    '',
    'const mod = new ModMain({',
    `  name: '${modName}',`,
    "  description: 'A Minecraft Bedrock Edition mod generated by SpawnModBE.',",
    "  author: 'Your Name',",
    '  version: [1, 0, 0],',
    '  minEngineVersion: [1, 20, 70],',
    sapiBlock,
    `  uuid: { seed: '${npmName(modName)}' },`,
    '});',
    scriptBlock,
    '',
    '// Only build when this file is executed directly.',
    'const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;',
    'if (isMain) {',
    "  mkdirSync('out', { recursive: true });",
    '  const addon = mod.toMcaddon();',
    "  const artifact = join('out', `${mod.folderName}.mcaddon`);",
    '  writeFileSync(artifact, addon);',
    '  console.log(`[ok] wrote ${artifact}`);',
    '}',
    '',
  ].join('\n');
}

/** Builds the scaffolded `package.json`. */
function buildPackageJson(modName: string, description: string, author: string, frameworkVersion: string): string {
  return JSON.stringify(
    {
      name: npmName(modName),
      version: '0.1.0',
      private: true,
      description,
      author,
      type: 'module',
      scripts: {
        build: 'tsc',
        pack: 'npm run build && node dist/index.js',
      },
      devDependencies: {
        '@types/node': '^26.6.2',
        typescript: '^5.7.3',
      },
      dependencies: {
        spawnmodbe: `^${frameworkVersion}`,
      },
    },
    null,
    2,
  );
}

/** Builds the scaffolded `tsconfig.json`. */
function buildTsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2021',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2021'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: 'dist',
        rootDir: 'src',
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  );
}

/** Builds the scaffolded `.gitignore`. */
function buildGitignore(): string {
  return ['node_modules/', 'dist/', 'out/', '*.mcaddon', '*.mcpack'].join('\n') + '\n';
}

/** Builds the scaffolded `README.md`. */
function buildReadme(modName: string): string {
  return [
    `# ${modName}`,
    '',
    'A Minecraft Bedrock Edition (MCBE) addon generated with [SpawnModBE](https://github.com/devx/SpawnModBE).',
    '',
    '## Develop',
    '',
    '```bash',
    'npm install',
    'npm run pack   # writes out/<name>.mcaddon',
    '```',
    '',
    '## Install',
    '',
    'Import `out/<name>.mcaddon` into Minecraft Bedrock, or drop it into your',
    'world\'s `behavior_packs` / `resource_packs` folders.',
    '',
    'Remember to enable the **Beta APIs** experiment when the mod uses the Script API.',
    '',
  ].join('\n');
}

/** Runs `npm install` in a directory, ignoring success/failure (best-effort). */
function runNpmInstall(dir: string): Promise<void> {
  return new Promise((resolveInstall) => {
    const child = spawn('npm', ['install', '--no-fund', '--no-audit'], { cwd: dir, stdio: 'inherit' });
    child.on('error', () => resolveInstall());
    child.on('close', () => resolveInstall());
  });
}

/** The `init` command: scaffold a new mod project into a directory. */
async function cmdInit(positional: string[], flags: Map<string, string | true>): Promise<number> {
  const target = resolvePath(process.cwd(), positional[0] ?? '.');
  const dirName = basename(target);
  const modName = asString(flags, 'name')?.trim() || dirName;
  const description = asString(flags, 'description')?.trim() || 'A Minecraft Bedrock Edition mod generated by SpawnModBE.';
  const author = asString(flags, 'author')?.trim() || 'Your Name';
  const includeSapi = !flags.has('no-sapi');
  const force = flags.has('force');
  const noInstall = flags.has('no-install');
  const frameworkVersion = await findPackageVersion();

  let existing: string[] = [];
  try {
    existing = await readdir(target);
  } catch {
    // Target does not exist yet — fine, we will create it.
  }

  const conflicts = existing.filter((entry) => (MANAGED_FILES as readonly string[]).includes(entry) || entry === 'src');
  if (existing.length > 0 && !force) {
    console.error(`Directory is not empty: ${target}`);
    console.error('Rerun with --force to overwrite the scaffolded files (other files are left untouched).');
    if (conflicts.length > 0) console.error(`Would conflict with: ${conflicts.join(', ')}`);
    return 1;
  }

  await mkdir(join(target, 'src'), { recursive: true });
  await writeFile(join(target, 'package.json'), buildPackageJson(modName, description, author, frameworkVersion) + '\n');
  await writeFile(join(target, 'tsconfig.json'), buildTsconfig() + '\n');
  await writeFile(join(target, 'src/index.ts'), buildIndexTs(modName, includeSapi));
  await writeFile(join(target, '.gitignore'), buildGitignore());
  await writeFile(join(target, 'README.md'), buildReadme(modName));

  console.log(`[ok] scaffolded "${modName}" in ${target}`);
  if (!noInstall) {
    console.log('Installing dependencies…');
    await runNpmInstall(target);
  }
  console.log('Next steps:');
  console.log(`  cd ${target}`);
  console.log('  npm run pack   # writes out/<name>.mcaddon');
  return 0;
}

/** Entry bridge used by tests: runs the CLI against `argv` and returns an exit code. */
export async function runCli(argv: string[]): Promise<number> {
  try {
    const { command, positional, flags } = parseArgs(argv);
    if (command === '--version' || command === 'version') return printVersion();
    if (command === '' || command === '--help' || command === 'help') return printHelp();
    if (command === 'init') return cmdInit(positional, flags);
    console.error(`Unknown command: ${command}`);
    console.error('Run "spawnmodbe --help" for usage.');
    return 2;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

// Execute directly: `node dist/cli.js ...`.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
