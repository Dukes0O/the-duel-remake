import { readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const DEFAULT_TARGETS = Object.freeze({
  schema: 1, mergeAddedBytes: 5_000_000, ordinaryTrackedFileBytes: 2_000_000,
  buildBytes: 250_000_000, wastelandAssetBytes: 60_000_000,
  runtimeFileBytes: 8_000_000, lookSheetBytes: 500_000, lookDirectoryBytes: 20_000_000,
});
const ROOT_FILES = new Set([
  '.gitattributes', '.gitignore', 'AGENTS.md', 'DECISIONS.md', 'README.md',
  'SPEC.md', 'game-icon.ico', 'index.html', 'package-lock.json',
  'package.json', 'start-game.bat', 'vite.config.js',
]);
const SKIP_FOLDERS = new Set(['.git', 'node_modules', 'dist', 'dist-next', 'dist-previous',
  '.qa-dist', '.qa-blender', '.qa-art', '.evidence', 'art-build', '.lanes']);
const RAW_EVIDENCE = new Set(['.png', '.webm', '.mp4', '.wav', '.mp3', '.flac', '.ogg']);
const IMAGE_EVIDENCE = new Set(['.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
const SOURCE_ASSETS = new Set(['.blend', '.blend1', '.py', '.psd', '.kra', '.xcf', '.svgz', '.exr']);

function walk(root, base = '') {
  const found = [];
  for (const entry of readdirSync(join(root, base), { withFileTypes: true })) {
    const name = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory() && !SKIP_FOLDERS.has(entry.name)) found.push(...walk(root, name));
    else if (entry.isFile()) found.push(name);
  }
  return found;
}

export function projectFiles(root) {
  const result = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8', shell: false, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.status === 0) return [...new Set(result.stdout.split('\0').filter(Boolean).map(path => path.replaceAll('\\', '/')))];
  return walk(root);
}

function folderBytes(root, name) {
  try {
    return walk(join(root, name)).reduce((sum, path) => sum + statSync(join(root, name, path)).size, 0);
  } catch { return null; }
}

export function inspectRepository(root = PROJECT_ROOT, files = projectFiles(root)) {
  const failures = [];
  let settings = DEFAULT_TARGETS;
  try { settings = { ...DEFAULT_TARGETS, ...JSON.parse(readFileSync(join(root, 'tools/size-targets.json'), 'utf8')) }; }
  catch { /* A fixture may omit targets; the repository keeps its checked-in copy. */ }
  const fileSizes = [];
  for (const path of files) {
    const name = path.replaceAll('\\', '/');
    const extension = extname(name).toLowerCase();
    let bytes;
    try { bytes = statSync(join(root, name)).size; } catch { continue; }
    fileSizes.push({ path: name, bytes });
    if (!name.includes('/') && !ROOT_FILES.has(name)) failures.push(`${name}: unexpected repository-root file`);
    if (name.startsWith('.evidence/') || name.startsWith('art-build/') || name.startsWith('.qa-dist/'))
      failures.push(`${name}: generated or review output must stay out of Git`);
    if (name.startsWith('public/') && (SOURCE_ASSETS.has(extension) || ['.mp4', '.webm'].includes(extension)))
      failures.push(`${name}: source or review asset is in the runtime public folder`);
    const roundSheet = extension === '.jpg' && /^docs\/board\/looks\/[^/]+\/round-\d+\.jpg$/.test(name);
    if (!name.startsWith('public/') && !roundSheet && (RAW_EVIDENCE.has(extension) || IMAGE_EVIDENCE.has(extension)))
      failures.push(`${name}: raw capture belongs in ignored .evidence, not the repository`);
  }
  const advisory = {
    buildBytes: folderBytes(root, 'dist'),
    publicBytes: folderBytes(root, 'public'),
    wastelandAssetBytes: folderBytes(root, 'public/assets/models/wasteland'),
    lookDirectoryBytes: folderBytes(root, 'docs/board/looks'),
    oversizedRuntimeFiles: fileSizes.filter(file => file.path.startsWith('public/') && file.bytes > settings.runtimeFileBytes),
    oversizedOrdinaryFiles: fileSizes.filter(file => !file.path.startsWith('public/') && file.bytes > settings.ordinaryTrackedFileBytes),
    oversizedLookSheets: fileSizes.filter(file => file.path.startsWith('docs/board/looks/') && file.path.endsWith('.jpg') && file.bytes > settings.lookSheetBytes),
  };
  return { failures, targets: { limits: settings, advisory } };
}

function parseArgs(args) {
  let root = PROJECT_ROOT, json = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--root' && args[index + 1]) root = resolve(args[++index]);
    else if (args[index] === '--json') json = true;
    else throw Error(`Unknown hygiene argument: ${args[index]}`);
  }
  return { root, json };
}

export function main(args = process.argv.slice(2)) {
  const { root, json } = parseArgs(args);
  const result = inspectRepository(root);
  if (json) console.log(JSON.stringify(result));
  else {
    for (const failure of result.failures) console.error('PLACEMENT ' + failure);
    console.log(`Repository placement: ${result.failures.length ? 'failed' : 'passed'}; size targets are advisory.`);
    console.log(`Size targets: ${JSON.stringify(result.targets.advisory)}`);
  }
  return result.failures.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
