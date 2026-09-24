import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtimeModels = 'public/assets/models/wasteland';
const families = [
  { name: 'crew', script: 'crew-fighters.py', args: [], keyModel: 'crew/rook.glb' },
  { name: 'first-person', script: 'first-person-gear.py', args: ['--round', '1'], keyModel: 'first-person/rpg.glb' },
  { name: 'rustwall', script: 'rustwall.py', args: ['--round', '1'], keyModel: 'rustwall/wall.glb' },
];
const failures = [];
let checks = 0;

function check(label, action) {
  checks++;
  try { action(); }
  catch (error) { failures.push(`${label}: ${error.message}`); }
}

function filesBelow(folder) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesBelow(path) : entry.isFile() ? [path] : [];
  });
}

function relativeOutput(path, extension) {
  assert.equal(typeof path, 'string', 'planned path must be a string');
  assert.ok(isAbsolute(path), `${path} is not absolute`);
  const output = relative(root, resolve(path)).split(sep).join('/');
  assert.ok(output && output !== '..' && !output.startsWith('../'), `${path} escapes the repository`);
  assert.equal(extname(output).toLowerCase(), extension, `${path} has the wrong extension`);
  return output;
}

function planFor(family) {
  const result = spawnSync('python', [join(root, 'tools/blender', family.script), '--', '--root', root, ...family.args, '--paths-only'],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${family.script} path plan failed: ${(result.stderr || result.stdout || '').trim()}`);
  let plan;
  try { plan = JSON.parse(result.stdout); }
  catch { assert.fail(`${family.script} must print one JSON path plan`); }
  assert.ok(plan && typeof plan === 'object' && !Array.isArray(plan), 'path plan must be an object');
  return plan;
}

function inspectGlb(path) {
  const bytes = readFileSync(path);
  assert.ok(bytes.length >= 28, `${path} is too short for a GLB`);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', `${path} is not a GLB`);
  assert.equal(bytes.readUInt32LE(4), 2, `${path} must be glTF 2`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${path} has an invalid declared length`);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${path} has no JSON chunk`);
  assert.ok(20 + jsonLength <= bytes.length, `${path} JSON chunk exceeds file length`);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  assert.ok(Array.isArray(gltf.images) && gltf.images.length > 0, `${path} has no embedded textures`);
  assert.ok(Array.isArray(gltf.bufferViews), `${path} has no buffer views`);
  for (const image of gltf.images) {
    assert.equal(image.uri, undefined, `${path} references an external image`);
    assert.ok(Number.isInteger(image.bufferView), `${path} has an image without a buffer view`);
    assert.ok(gltf.bufferViews[image.bufferView], `${path} references a missing image buffer view`);
    assert.match(image.mimeType || '', /^image\/(png|jpeg|webp)$/, `${path} has no supported image MIME type`);
  }
  for (const buffer of gltf.buffers || []) {
    assert.equal(buffer.uri, undefined, `${path} references an external buffer`);
  }
}

for (const family of families) {
  let plan;
  check(`${family.name} declares runtime and editable texture outputs`, () => {
    plan = planFor(family);
    assert.ok(Array.isArray(plan.glb) && plan.glb.length > 0, 'GLB output plan is empty');
    assert.ok(Array.isArray(plan.textures) && plan.textures.length > 0,
      `${family.script} must declare generated PNGs in a textures array`);
  });

  check(`${family.name} has no standalone generated PNGs in public`, () => {
    const folder = join(root, runtimeModels, family.name);
    const pngs = filesBelow(folder).filter(path => extname(path).toLowerCase() === '.png')
      .map(path => relative(root, path).split(sep).join('/'));
    assert.equal(pngs.length, 0,
      `${pngs.length} standalone runtime PNGs remain, including ${pngs.slice(0, 3).join(', ')}`);
  });

  if (!plan) continue;
  check(`${family.name} keeps editable PNGs under ignored art-build`, () => {
    const texturePaths = plan.textures.map(path => relativeOutput(path, '.png'));
    assert.equal(new Set(texturePaths).size, texturePaths.length, 'duplicate planned texture output');
    assert.ok(texturePaths.every(path => path.startsWith(`art-build/${family.name}/`)),
      `editable textures belong in art-build/${family.name}: ${texturePaths.join(', ')}`);
    for (const path of texturePaths) {
      const ignored = spawnSync('git', ['check-ignore', path], { cwd: root, encoding: 'utf8', windowsHide: true });
      assert.equal(ignored.status, 0, `${path} is not Git-ignored`);
    }
  });

  check(`${family.name} keeps self-contained GLBs at runtime paths`, () => {
    const glbs = plan.glb.map(path => relativeOutput(path, '.glb'));
    assert.ok(glbs.every(path => path.startsWith(`${runtimeModels}/${family.name}/`)),
      `GLBs moved out of the runtime family: ${glbs.join(', ')}`);
    assert.ok(glbs.includes(`${runtimeModels}/${family.keyModel}`), `${family.keyModel} runtime path changed`);
    for (const path of glbs) {
      assert.ok(existsSync(join(root, path)), `${path} is missing`);
      inspectGlb(join(root, path));
    }
  });
}

console.log(`Runtime art sources: ${checks} checks; ${failures.length} failed.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
}
