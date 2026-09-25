import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generators = [
  { script: 'tools/blender/armor-kits.py', args: [], glb: ['falcone_f42','stuttgart_959s','falcone_heritage','aurora_gt','dusthawk_rally','banshee_muscle','viper_proto','titan_monster','koenigsegg_jesko'].map(name => `public/assets/models/wasteland/kits/${name}.glb`) },
  { script: 'tools/blender/scrapdome-yard.py', args: ['--round', '1'], glb: ['public/assets/models/wasteland/scrapdome/yard.glb'] },
  { script: 'tools/blender/test-fighter.py', args: [], glb: ['public/assets/models/wasteland/test-fighter.glb'] },
  { script: 'tools/blender/crew-fighters.py', args: [], glb: ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'].map(name => `public/assets/models/wasteland/crew/${name}.glb`) },
  { script: 'tools/blender/first-person-gear.py', args: ['--round', '1'], glb: [
    'public/assets/models/wasteland/first-person/wrench.glb',
    'public/assets/models/wasteland/first-person/rpg.glb',
    ...['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'].map(name => `public/assets/models/wasteland/first-person/hands/${name}.glb`),
  ] },
  { script: 'tools/blender/rustwall.py', args: ['--round', '1'], glb: ['wall', 'wash'].map(name => `public/assets/models/wasteland/rustwall/${name}.glb`) },
  { script: 'tools/build-course-landmarks.py', args: [], glb: [], json: ['src/generated/course-landmarks.json'] },
];
const reviewHelpers = [
  {script:'tools/blender/kit-review.py', args:['--','--car','falcone_f42'], render:true},
  {script:'tools/blender/kit-sheet.py', args:['--round','1','--blender','missing-blender.png','--high','missing-high.png','--performance','missing-performance.png'], render:false},
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
  const paths = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) paths.push(...filesBelow(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}
function relativePaths(folder, paths, extension) {
  assert.ok(Array.isArray(paths) && paths.length > 0, `${extension} output list is empty`);
  return paths.map(path => {
    assert.equal(typeof path, 'string', `${extension} output path must be a string`);
    assert.ok(isAbsolute(path), `${path} must be absolute`);
    const rel = relative(folder, resolve(path)).split(sep).join('/');
    assert.ok(rel && !rel.startsWith('../') && rel !== '..', `${path} escapes the requested root`);
    assert.equal(extname(rel), extension, `${path} has the wrong extension`);
    return rel;
  }).sort();
}
function pathPlan(generator, fixtureRoot) {
  const call = spawnSync('python', [join(root, generator.script), '--', '--root', fixtureRoot, ...generator.args, '--paths-only'],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(call.error, undefined, call.error?.message);
  assert.equal(call.status, 0, `${generator.script} --paths-only failed: ${(call.stderr || call.stdout || '').trim()}`);
  let plan;
  try { plan = JSON.parse(call.stdout); }
  catch { assert.fail(`${generator.script} --paths-only must print one JSON object; got ${JSON.stringify(call.stdout.trim())}`); }
  assert.ok(plan && typeof plan === 'object' && !Array.isArray(plan), 'path plan must be an object');
  assert.ok(Array.isArray(plan.blend), 'path plan must include blend array');
  assert.ok(Array.isArray(plan.glb), 'path plan must include glb array');
  return plan;
}

check('all Blender asset generators are covered', () => {
  const actual = readdirSync(join(root, 'tools/blender')).filter(name => name.endsWith('.py') && name !== 'fidelity-sheet.py')
    .map(name => `tools/blender/${name}`);
  assert.deepEqual(actual.sort(), [...generators.filter(item => item.script.startsWith('tools/blender/')), ...reviewHelpers].map(item => item.script).sort());
});

const fixtureRoots = [mkdtempSync(join(tmpdir(), 'duel-blender-paths-a-')), mkdtempSync(join(tmpdir(), 'duel-blender-paths-b-'))];
try {
  for (const generator of generators) {
    let plans;
    check(`${generator.script} supports a Blender-free output plan`, () => {
      plans = fixtureRoots.map(fixtureRoot => pathPlan(generator, fixtureRoot));
      fixtureRoots.forEach(fixtureRoot => assert.deepEqual(readdirSync(fixtureRoot), [], 'path planning created output files'));
    });
    if (!plans) continue;
    check(`${generator.script} keeps editable sources in ignored art-build`, () => {
      for (const [index, plan] of plans.entries()) {
        const blends = relativePaths(fixtureRoots[index], plan.blend, '.blend');
        assert.ok(blends.every(path => path.startsWith('art-build/')), `Blend outputs outside art-build: ${blends.join(', ')}`);
        assert.equal(new Set(blends).size, blends.length, 'duplicate Blend output');
      }
    });
    check(`${generator.script} keeps runtime outputs at reproducible paths`, () => {
      const relativePlans = plans.map((plan, index) => ({
        blend: relativePaths(fixtureRoots[index], plan.blend, '.blend'),
        glb: plan.glb.length ? relativePaths(fixtureRoots[index], plan.glb, '.glb') : [],
        json: plan.json?.length ? relativePaths(fixtureRoots[index], plan.json, '.json') : [],
      }));
      assert.deepEqual(relativePlans[0], relativePlans[1], 'same recipe produced different relative paths');
      assert.deepEqual(relativePlans[0].glb, [...generator.glb].sort(), 'runtime GLB location changed');
      assert.deepEqual(relativePlans[0].json, [...(generator.json || [])].sort(), 'runtime landmark JSON location changed');
      assert.equal(relativePlans[0].blend.length, generator.glb.length || 1, 'one editable Blend per exported model is expected');
      for (const runtimePath of [...relativePlans[0].glb, ...relativePlans[0].json]) {
        assert.ok(existsSync(join(root, runtimePath)), `${runtimePath} is missing from the runtime recipe`);
      }
    });
  }
  for (const helper of reviewHelpers) check(helper.script + ' has a side-effect-free review output plan', () => {
    for (const fixtureRoot of fixtureRoots) {
      const args = [...helper.args, '--root', fixtureRoot, '--paths-only'];
      if(helper.render) args.push('--out', join(fixtureRoot,'.evidence','kits','review.png'));
      const call=spawnSync('python',[join(root,helper.script),...args],
        {cwd:root,encoding:'utf8',windowsHide:true,timeout:10000});
      assert.equal(call.error,undefined);assert.equal(call.status,0,call.stderr||call.stdout);
      const plan=JSON.parse(call.stdout);
      assert.deepEqual(plan.glb,[],'review helper never emits a runtime model');
      assert.deepEqual(plan.blend,[],'review helper never authors a model source');
      assert.deepEqual(plan.evidence,helper.render?[join(fixtureRoot,'.evidence','kits','review.png')]:[]);
      assert.deepEqual(plan.summary,helper.render?[]:[join(fixtureRoot,'docs','board','looks','kits','round-1.jpg')]);
      assert.deepEqual(readdirSync(fixtureRoot),[],'planning creates no output');
    }
  });
} finally {
  for (const fixtureRoot of fixtureRoots) rmSync(fixtureRoot, { recursive: true, force: true });
}

check('art-build is ignored as a directory', () => {
  const ignored = spawnSync('git', ['check-ignore', 'art-build/placement-probe.txt'], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(ignored.status, 0, 'art-build is not Git-ignored');
});
for (const folder of ['public', 'dist']) {
  check(`${folder} contains no editable Blender files`, () => {
    const blendFiles = filesBelow(join(root, folder)).filter(path => /\.blend\d*$/i.test(path));
    assert.deepEqual(blendFiles.map(path => relative(root, path)), [], `${folder} contains Blender sources`);
  });
}
check('established replay fingerprints remain available', () => {
  for (const fixture of ['expected-fingerprints.json', 'combat-fingerprints.json']) {
    assert.ok(existsSync(join(root, 'tools/replays', fixture)), `missing ${fixture}`);
  }
});

console.log(`Blender output placement: ${checks} checks; ${failures.length} failed.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
}
