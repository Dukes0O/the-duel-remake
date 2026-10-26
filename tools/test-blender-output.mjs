import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generators = [
  {script:'tools/blender/lab-tunnel-parts.py',args:[],recipeOnly:true,glb:['public/assets/models/lab/tunnel-parts.glb']},
  {script:'tools/blender/summit-finish.py',args:[],recipeOnly:true,
    glb:['public/assets/models/circuits/kits/summit-finish.glb','public/assets/models/circuits/kits/summit-finish-lod.glb']},
  { script: 'tools/blender/deep-art-fit.py', args: [],
    evidence: '.evidence/2026-10-12/DEEP-ART-SRC/round-2-native',
    glb: ['silver-school','reef-fish','turtle','ray','manta','sea-lion','otter','crab',
      'moray','grouper','reef-shark','jellyfish','whale','octopus','wreck-hull','giant-clam','anchor','sunken-boat']
      .map(name => `public/assets/models/deep/${name}.glb`),
    json: ['public/assets/models/deep/manifest.json'] },
  { script: 'tools/blender/rook-p2.py', args: ['--stage', 'neutral'], glb: [] },
  { script: 'tools/blender/armor-kits.py', args: [], glb: ['falcone_f42','stuttgart_959s','falcone_heritage','aurora_gt','dusthawk_rally','banshee_muscle','viper_proto','titan_monster','koenigsegg_jesko','ferrari_enzo','mclaren_f1','bugatti_bolide','falcone_sirena','mcmurtry_speirling'].map(name => `public/assets/models/wasteland/kits/${name}.glb`) },
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
  { script: 'tools/blender/speirling-tries.py', args: [], recipeOnly: true, glb: ['public/assets/models/unlocks/mcmurtry_speirling.glb'] },
  { script: 'tools/blender/sirena-wreck.py', args: [], recipeOnly: true, glb: ['public/assets/models/sirena/sea-wreck.glb'] },
  { script: 'tools/blender/kestrel-one.py', args: [], glb: ['public/assets/heli/kestrel-one.glb'] },
  { script: 'tools/blender/lab-brian.py', args: [], recipeOnly: true, glb: ['public/assets/models/lab/brian.glb'] },
  { script: 'tools/blender/heli-accessories.py', args: [], recipeOnly: true,
    glb: ['cargo-hook', 'helipad', 'fuel-pump'].map(name => `public/assets/heli/${name}.glb`) },
  { script: 'tools/blender/skin-gear.py', args: [], glb: ['public/assets/heli/gear/drop-sight.glb', 'public/assets/heli/gear/heat-camera.glb', 'public/assets/heli/gear/zoom-camera.glb', 'public/assets/heli/gear/nose-camera.glb', 'public/assets/heli/gear/cargo-net.glb', 'public/assets/heli/gear/main-rotor-quiet.glb'] },
  { script: 'tools/blender/rescue-props.py', args: [], glb: ['public/assets/heli/rescue/winch.glb', 'public/assets/heli/rescue/stretcher.glb', 'public/assets/heli/rescue/searchlight.glb', 'public/assets/heli/rescue/beacon.glb', 'public/assets/heli/rescue/crate-food.glb', 'public/assets/heli/rescue/crate-medicine.glb', 'public/assets/heli/rescue/crate-fuel.glb'] },
  { script: 'tools/blender/rescue-people.py', args: [], glb: ['public/assets/heli/people/rescuer-hanging.glb', 'public/assets/heli/people/rescuer-casualty-hanging.glb', 'public/assets/heli/people/hiker-standing.glb', 'public/assets/heli/people/skier-standing.glb', 'public/assets/heli/people/driver-standing.glb', 'public/assets/heli/people/hiker-sitting.glb', 'public/assets/heli/people/skier-sitting.glb', 'public/assets/heli/people/driver-lying.glb', 'public/assets/heli/people/hiker-walking.glb', 'public/assets/heli/people/paramedic-1-walking.glb', 'public/assets/heli/people/paramedic-2-walking.glb'] },
  { script: 'tools/blender/fire-bucket.py', args: [], glb: ['public/assets/heli/fire-bucket.glb'] },
  { script: 'tools/blender/ski.py', args: [], glb: ['skier-stand', 'skier-crouch', 'skier-lean-left', 'skier-lean-right', 'skier-tuck', 'skier-air', 'skier-tumble', 'guide', 'guest-1', 'guest-2', 'guest-3', 'guest-4', 'pole-red', 'pole-blue', 'gate-red', 'gate-blue', 'arch-start', 'arch-finish', 'flag-drop', 'flag-pickup', 'kicker', 'netting'].map(name => `public/assets/models/ski/${name}.glb`) },
  { script: 'tools/blender/pilot-map-props.py', args: [], glb: ['sign-logging-arrows', 'sign-start-grid', 'sign-fire-pits', 'sign-chalk-line', 'sign-lighthouse-window', 'table-mesa', 'table-lookout', 'table-plane-wreck', 'table-logbook'].map(name => `public/assets/models/pilot-map/${name}.glb`) },
  { script: 'tools/blender/burnt-forest.py', args: [], glb: ['public/assets/burnt/tremblant-woods/burnt-props.glb'] },
];
// Private fitted candidates have no editable Blend or runtime installation.
// Register them separately so the established runtime assertions stay intact.
const privateGenerators = [
  { script: 'tools/blender/convoy-tanker.py', fit: 'tools/art/tanker-fit.json',
    glb: ['tanker.glb'], json: ['manifest.json'],
    embeddedAtlas: ['tanker-local-wear-and-hazard-atlas', 'tanker-dark-roof-and-warning-border'] },
];
// Vesper's original native suite covers its donor-validating private CLI.
const nativeGenerators = [
  {script: 'tools/blender/heli-logbook-paints.py', test: 'tools/test-heli-rank-paint.mjs',
    png: ['rank-student', 'rank-private', 'rank-commercial', 'rank-mountain', 'rank-chief']
      .map(id => `public/assets/heli/skins/${id}.png`)},
  {script: 'tools/blender/vesper-blackiron.py', test: 'tools/test-vesper-art.mjs'},
  {script: 'tools/blender/salt-flats.py', test: 'tools/test-salt-flats-output.mjs'},
  {script: 'tools/blender/ardennes-landmarks.py', test: 'tools/test-circuit-ardennes.mjs'},
  {script: 'tools/blender/ardennes-beech.py', test: 'tools/test-circuit-ardennes.mjs'},
];
// Circuit kits plan directories rather than one editable Blend per model.
const kitGenerators = [{ script: 'tools/blender/p4-kits.py', round: 3 }];
const reviewHelpers = [
  {script:'tools/blender/deep-art-sheet.py',args:[],render:false,summary:['docs','board','looks','deep-art','round-2.jpg']},
  {script:'tools/blender/kit-review.py', args:['--','--car','falcone_f42'], render:true},
  // EARN-CAR-3: four review renders of a code-built car into one evidence folder.
  {script:'tools/blender/car-review.py', args:['--','--glb','missing.glb'], render:'folder',
    views:['front-three-quarter','side','rear-three-quarter','front-close']},
  // SIRENA-ART: any-size look renders of the wreck, parts, bag and abalone.
  {script:'tools/blender/sirena-review.py', args:['--','--glb','missing.glb','--views','three-quarter,side'], render:'folder',
    views:['three-quarter','side']},
  // LAB-ART: the whole Lab from named cameras, or one bench on its own.
  {script:'tools/blender/lab-review.py', args:['--','--glb','missing.glb','--views','overview,three-quarter'], render:'folder',
    views:['overview','three-quarter']},
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
  const call = spawnSync('python', [join(root, generator.script), '--', '--root', fixtureRoot, ...generator.args, ...(generator.evidence ? ['--evidence', join(fixtureRoot, generator.evidence)] : []), '--paths-only'],
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

// Run the actual KITS entry point under an audit guard. Planning must neither
// load Blender/licensed donors nor mutate any file, including outside the root.
const kitPlanAudit = String.raw`
import json, os, runpy, sys
from pathlib import Path
script = Path(sys.argv[1]).resolve()
stdlib = Path(sys.base_prefix).resolve()
record = {'reads': [], 'imports': [], 'denied': []}
def deny(message):
    record['denied'].append(message)
    raise RuntimeError(message)
def audit(event, arguments):
    if event == 'import':
        name = arguments[0]
        record['imports'].append(name)
        if name.split('.')[0] in ('bpy', 'bmesh', 'mathutils', 'numpy'):
            deny('paths-only attempted forbidden import: ' + name)
    elif event == 'open' and isinstance(arguments[0], (str, bytes)):
        path = Path(os.fsdecode(arguments[0])).resolve()
        mode, flags = arguments[1:3]
        if (isinstance(mode, str) and any(letter in mode for letter in 'wax+')) or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND):
            deny('paths-only attempted file write: ' + str(path))
        record['reads'].append(str(path))
        if path != script and not path.is_relative_to(stdlib):
            deny('paths-only attempted donor or other input read: ' + str(path))
    elif event in ('os.mkdir', 'os.remove', 'os.rmdir', 'os.rename', 'os.symlink', 'os.link', 'os.truncate'):
        deny('paths-only attempted filesystem mutation: ' + event)
sys.addaudithook(audit)
sys.argv = [str(script)] + sys.argv[2:]
try:
    runpy.run_path(str(script), run_name='__main__')
finally:
    print('DUEL_KIT_PATH_AUDIT=' + json.dumps(record), file=sys.stderr)
`;
function kitPathPlan(generator, fixtureRoot) {
  const before = fixtureTree(fixtureRoot);
  const call = spawnSync('python', ['-I', '-B', '-S', '-c', kitPlanAudit,
    join(root, generator.script), '--', '--root', fixtureRoot,
    '--round', String(generator.round), '--paths-only'],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(call.error, undefined, call.error?.message);
  assert.deepEqual(fixtureTree(fixtureRoot), before, 'KITS planning changed its temporary root');
  assert.equal(call.status, 0, generator.script + ' planning failed: ' + call.stderr.trim());
  const receipt = call.stderr.split(/\r?\n/).find(line => line.startsWith('DUEL_KIT_PATH_AUDIT='));
  assert.ok(receipt, 'actual CLI must retain its filesystem/import audit');
  const audit = JSON.parse(receipt.slice('DUEL_KIT_PATH_AUDIT='.length));
  assert.deepEqual(audit.denied, [], 'KITS planning attempted forbidden imports, input reads or writes');
  assert.ok(audit.imports.every(name => !['bpy', 'bmesh', 'mathutils', 'numpy'].includes(name.split('.')[0])),
    'planning imported a Blender or array dependency');
  const plan = JSON.parse(call.stdout);
  assert.deepEqual(Object.keys(plan).sort(), ['evidence', 'runtime'], 'complete KITS directory plan');
  assert.ok(isAbsolute(plan.runtime) && isAbsolute(plan.evidence), 'planned directories must be absolute');
  assert.equal(resolve(plan.runtime), join(fixtureRoot, 'public/assets/models/circuits/kits'), 'exact runtime kit home');
  const evidence = relative(fixtureRoot, resolve(plan.evidence)).split(sep).join('/');
  assert.match(evidence, /^\.evidence\/\d{4}-\d{2}-\d{2}\/P4-KITS\/round-3$/, 'exact ignored evidence family and round');
  return {runtime: relative(fixtureRoot, resolve(plan.runtime)).split(sep).join('/'), evidence};
}

check('all Blender asset generators are covered', () => {
  const actual = readdirSync(join(root, 'tools/blender')).filter(name => name.endsWith('.py') && name !== 'fidelity-sheet.py')
    .map(name => `tools/blender/${name}`);
  assert.deepEqual(actual.sort(), [...generators.filter(item => item.script.startsWith('tools/blender/')), ...reviewHelpers, ...privateGenerators, ...nativeGenerators, ...kitGenerators].map(item => item.script).sort());
});

for (const generator of nativeGenerators) check(`${generator.script} retains its native CLI suite`, () => {
  assert.ok(existsSync(join(root, generator.test)), 'missing native CLI suite');
  if (generator.png) {
    const call = spawnSync('python', ['-I', '-B', '-S', join(root, generator.script), '--root', root, '--paths-only'],
      {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000});
    assert.equal(call.error, undefined);
    assert.equal(call.status, 0, 'PNG planning must run with standard-library-only Python: ' + call.stderr);
    const plan = JSON.parse(call.stdout);
    assert.deepEqual(plan.blend, [], 'paint variants author no editable model');
    assert.deepEqual(plan.glb, [], 'paint variants do not replace the airframe');
    assert.deepEqual(relativePaths(root, plan.png, '.png'), [...generator.png].sort(), 'exact runtime paint output homes');
    assert.deepEqual(plan.evidence, [], 'planning without --render creates no review output');
  }
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
    check(`${generator.script} keeps editable sources in ignored ${generator.evidence || 'art-build'}`, () => {
      for (const [index, plan] of plans.entries()) {
        let blends;
        if (generator.recipeOnly) {
          assert.deepEqual(plan.blend, [], 'recipe-only exports plan no editable Blend files');
          blends = [];
        } else {
          blends = relativePaths(fixtureRoots[index], plan.blend, '.blend');
        }
        assert.ok(blends.every(path => path.startsWith((generator.evidence || 'art-build') + '/')), `Blend outputs outside ${generator.evidence || 'art-build'}: ${blends.join(', ')}`);
        if (generator.evidence) assert.deepEqual(blends, generator.glb.map(path => `${generator.evidence}/${path.split('/').pop().replace(/\.glb$/, '.blend')}`).sort(), 'exact Deep editable source paths');
        assert.equal(new Set(blends).size, blends.length, 'duplicate Blend output');
      }
    });
    check(`${generator.script} keeps runtime outputs at reproducible paths`, () => {
      const relativePlans = plans.map((plan, index) => ({
        blend: generator.recipeOnly ? [] : relativePaths(fixtureRoots[index], plan.blend, '.blend'),
        glb: plan.glb.length ? relativePaths(fixtureRoots[index], plan.glb, '.glb') : [],
        json: plan.json?.length ? relativePaths(fixtureRoots[index], plan.json, '.json') : [],
      }));
      assert.deepEqual(relativePlans[0], relativePlans[1], 'same recipe produced different relative paths');
      assert.deepEqual(relativePlans[0].glb, [...generator.glb].sort(), 'runtime GLB location changed');
      assert.deepEqual(relativePlans[0].json, [...(generator.json || [])].sort(), 'runtime landmark JSON location changed');
      assert.equal(relativePlans[0].blend.length, generator.recipeOnly ? 0 : generator.glb.length || 1,
        generator.recipeOnly ? 'recipe-only exports plan no editable Blend files' : 'one editable Blend per exported model is expected');
      for (const runtimePath of [...relativePlans[0].glb, ...relativePlans[0].json]) {
        assert.ok(existsSync(join(root, runtimePath)), `${runtimePath} is missing from the runtime recipe`);
      }
    });
  }

  for (const generator of kitGenerators) check(generator.script + ' plans exact kit/evidence homes without Blender, donor reads or writes', () => {
    const plans = fixtureRoots.map(fixtureRoot => kitPathPlan(generator, fixtureRoot));
    assert.deepEqual(plans[0], plans[1], 'same KITS recipe changed relative paths between roots');
    fixtureRoots.forEach(fixtureRoot => assert.deepEqual(readdirSync(fixtureRoot), [], 'planning created files'));
  });

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
      const folder = join(fixtureRoot,'.evidence','cars','review');
      if(helper.render === 'folder') args.push('--out', folder);
      else if(helper.render) args.push('--out', join(fixtureRoot,'.evidence','kits','review.png'));
      const call=spawnSync('python',[join(root,helper.script),...args],
        {cwd:root,encoding:'utf8',windowsHide:true,timeout:10000});
      assert.equal(call.error,undefined);assert.equal(call.status,0,call.stderr||call.stdout);
      const plan=JSON.parse(call.stdout);
      assert.deepEqual(plan.glb,[],'review helper never emits a runtime model');
      assert.deepEqual(plan.blend,[],'review helper never authors a model source');
      assert.deepEqual(plan.evidence,helper.render === 'folder' ? helper.views.map(view => join(folder, view + '.png'))
        : helper.render?[join(fixtureRoot,'.evidence','kits','review.png')]:[]);
      assert.deepEqual(plan.summary,helper.render?[]:[join(fixtureRoot,...(helper.summary || ['docs','board','looks','kits','round-1.jpg']))]);
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
