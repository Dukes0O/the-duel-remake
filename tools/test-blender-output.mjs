import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generators = [
  { script: 'tools/blender/rook-p2.py', args: ['--stage', 'neutral'], glb: [] },
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
  { script: 'tools/blender/muddy-hollow-props.py', args: [], glb: [], json: ['src/generated/muddy-hollow-props.json'] },
];
// Private fitted candidates have no editable Blend or runtime installation.
// Register them separately so the established runtime assertions stay intact.
const privateGenerators = [
  { script: 'tools/blender/convoy-tanker.py', fit: 'tools/art/tanker-fit.json',
    glb: ['tanker.glb'], json: ['manifest.json'],
    embeddedAtlas: ['tanker-local-wear-and-hazard-atlas'] },
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


// Execute the actual command-line entry point in standard-library-only Python.
// The audit guard catches an attempted import/read/write before it can touch any
// Blender dependency, licensed input or output. It does not replace recipe code.
const privatePlanAudit = String.raw`
import json, os, runpy, sys
from pathlib import Path
script = Path(sys.argv[1]).resolve()
arguments = sys.argv[2:]
fit = Path(arguments[arguments.index('--fit-config') + 1]).resolve()
stdlib = Path(sys.base_prefix).resolve()
record = {'reads': [], 'imports': [], 'denied': []}
def deny(message):
    record['denied'].append(message)
    raise RuntimeError(message)
def audit(event, arguments):
    if event == 'import':
        name = arguments[0]
        record['imports'].append(name)
        if name.split('.')[0] in ('bpy', 'mathutils', 'numpy'):
            deny('paths-only attempted forbidden import: ' + name)
    elif event == 'open' and isinstance(arguments[0], (str, bytes)):
        path = Path(os.fsdecode(arguments[0])).resolve()
        mode, flags = arguments[1:3]
        if (isinstance(mode, str) and any(letter in mode for letter in 'wax+')) or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND):
            deny('paths-only attempted file write: ' + str(path))
        record['reads'].append(str(path))
        if path not in (script, fit) and not path.is_relative_to(stdlib):
            deny('paths-only attempted unapproved input read: ' + str(path))
    elif event in ('os.mkdir', 'os.remove', 'os.rmdir', 'os.rename', 'os.symlink', 'os.link', 'os.truncate'):
        deny('paths-only attempted filesystem mutation: ' + event)
sys.addaudithook(audit)
sys.argv = [str(script)] + arguments
try:
    runpy.run_path(str(script), run_name='__main__')
finally:
    print('DUEL_PATH_AUDIT=' + json.dumps(record), file=sys.stderr)
`;
function privatePlanCall(generator, fixtureRoot, output) {
  const call = spawnSync('python', ['-I', '-B', '-S', '-c', privatePlanAudit,
    join(root, generator.script), '--', '--root', fixtureRoot,
    '--output-dir', output, '--fit-config', join(root, generator.fit),
    '--seed', '1989', '--paths-only'],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(call.error, undefined, call.error?.message);
  const receiptLine = call.stderr.split(/\r?\n/).find(line => line.startsWith('DUEL_PATH_AUDIT='));
  assert.ok(receiptLine, 'plain Python must retain the filesystem/import audit receipt');
  return { ...call, audit: JSON.parse(receiptLine.slice('DUEL_PATH_AUDIT='.length)) };
}
function fixtureTree(folder) {
  const entries = [];
  function visit(parent) {
    for (const entry of readdirSync(parent).sort()) {
      const path = join(parent, entry), info = lstatSync(path);
      const name = relative(folder, path).split(sep).join('/');
      if (info.isSymbolicLink()) entries.push([name, 'link', readlinkSync(path)]);
      else if (info.isDirectory()) { entries.push([name, 'directory']); visit(path); }
      else entries.push([name, 'file', readFileSync(path).toString('base64')]);
    }
  }
  visit(folder);
  return entries;
}
function privateRelativePlan(generator, fixtureRoot, output) {
  const before = fixtureTree(fixtureRoot);
  const call = privatePlanCall(generator, fixtureRoot, output);
  assert.deepEqual(fixtureTree(fixtureRoot), before, 'private planning created or changed output');
  assert.equal(call.status, 0, generator.script + ' --paths-only failed: ' + call.stderr.trim());
  assert.deepEqual(call.audit.denied, [], 'private planning attempted a forbidden dependency or filesystem operation');
  let plan;
  try { plan = JSON.parse(call.stdout); }
  catch { assert.fail('private --paths-only must print one JSON object; got ' + JSON.stringify(call.stdout.trim())); }
  assert.ok(plan && typeof plan === 'object' && !Array.isArray(plan), 'private path plan must be an object');
  assert.deepEqual(plan.blend, [], 'a private fitting recipe never writes editable Blender files');
  assert.deepEqual(plan.atlas, [], 'the worn atlas is packed in the GLB, never an external output');
  assert.deepEqual(plan.embeddedAtlas, generator.embeddedAtlas, 'the genuine packed worn atlas is included in the plan');
  const model = relativePaths(output, plan.glb, '.glb');
  const manifest = relativePaths(output, plan.json, '.json');
  assert.deepEqual(model, generator.glb, 'private model must remain tanker.glb');
  assert.deepEqual(manifest, generator.json, 'private manifest must remain manifest.json');
  const allOutputs = [...plan.blend, ...plan.glb, ...plan.json, ...plan.atlas];
  assert.equal(new Set(allOutputs).size, allOutputs.length, 'private plan contains duplicate output destinations');
  const relativeOutput = relative(fixtureRoot, output).split(sep).join('/');
  assert.ok(relativeOutput.startsWith('.qa-dist/') || relativeOutput.startsWith('.evidence/'), 'private output must stay inside requested root');
  return { blend: plan.blend, glb: relativePaths(fixtureRoot, plan.glb, '.glb'),
    json: relativePaths(fixtureRoot, plan.json, '.json'), atlas: plan.atlas, embeddedAtlas: plan.embeddedAtlas };
}
function rejectsPrivateOutput(generator, fixtureRoot, output) {
  const before = fixtureTree(fixtureRoot), call = privatePlanCall(generator, fixtureRoot, output);
  assert.deepEqual(fixtureTree(fixtureRoot), before, 'rejected private output changed the fixture tree');
  assert.notEqual(call.status, 0, 'unsafe output path was accepted');
  assert.deepEqual(call.audit.denied, [], 'unsafe output must be rejected before Blender imports, cache reads or filesystem writes');
  const diagnostic = call.stderr.split(/\r?\n/).filter(line => !line.startsWith('DUEL_PATH_AUDIT=')).join('\n');
  assert.match(diagnostic, /private|\.qa-dist|\.evidence|escape|outside/i, 'CLI must explain private-output rejection');
  assert.equal(call.stdout.trim(), '', 'rejected output must not claim a valid plan');
}

check('all Blender asset generators are covered', () => {
  const actual = readdirSync(join(root, 'tools/blender')).filter(name => name.endsWith('.py') && name !== 'fidelity-sheet.py')
    .map(name => `tools/blender/${name}`);
  assert.deepEqual(actual.sort(), [...generators.filter(item => item.script.startsWith('tools/blender/')), ...reviewHelpers, ...privateGenerators].map(item => item.script).sort());
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

  for (const generator of privateGenerators) {
    check(generator.script + ' plans private model, manifest and packed atlas without Blender, licensed reads or writes', () => {
      const plans = fixtureRoots.map(fixtureRoot => privateRelativePlan(generator, fixtureRoot, join(fixtureRoot, '.qa-dist', 'tanker-private')));
      assert.deepEqual(plans[0], plans[1], 'same private recipe produced different relative plans');
      fixtureRoots.forEach(fixtureRoot => assert.deepEqual(readdirSync(fixtureRoot), [], 'private planning created an output directory'));
    });
    check(generator.script + ' also permits a dedicated private evidence destination', () => {
      privateRelativePlan(generator, fixtureRoots[0], join(fixtureRoots[0], '.evidence', 'tanker-private'));
    });
    for (const [label, output] of [
      ['public runtime output', join(fixtureRoots[0], 'public', 'assets', 'models', 'tanker')],
      ['an escaping root', join(fixtureRoots[1], '.qa-dist', 'outside-the-requested-root')],
      ['traversal into public', join(fixtureRoots[0], '.qa-dist') + sep + '..' + sep + 'public' + sep + 'tanker'],
      ['a private-looking sibling', join(fixtureRoots[0], '.qa-dist-other', 'tanker')],
    ]) check(generator.script + ' rejects ' + label + ' before imports, reads and writes', () => {
      rejectsPrivateOutput(generator, fixtureRoots[0], output);
      assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'unsafe planning changed the outside destination');
    });
    check(generator.script + ' rejects a linked private directory that escapes the requested root', () => {
      const privateRoot = join(fixtureRoots[0], '.qa-dist'), link = join(privateRoot, 'linked-output');
      mkdirSync(privateRoot);
      symlinkSync(fixtureRoots[1], link, process.platform === 'win32' ? 'junction' : 'dir');
      try {
        rejectsPrivateOutput(generator, fixtureRoots[0], join(link, 'tanker-private'));
        assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'linked planning changed the outside directory');
      } finally {
        // Unlink only the exact fixture link; never recursively delete its target.
        assert.ok(lstatSync(link).isSymbolicLink(), 'fixture link unexpectedly changed');
        unlinkSync(link);
        rmdirSync(privateRoot);
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
