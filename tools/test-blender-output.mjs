import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const wildlifeIds = ['white-tailed-deer', 'moose', 'black-bear', 'beaver', 'eastern-wolf'];
const wildlifeGenerators = wildlifeIds.map(id => ({
  script: `tools/blender/wildlife/${id}.py`, args: [],
  glb: [`public/assets/wildlife/${id}.glb`],
}));
// WILD-ART-SRC round 1, Western mountains and Australia. The donor species keep
// every donor clip; the original recipes have their own rigs. Birds fly.
const westWildlife = [
  ['mule-deer', 'Walk', 'white-tailed-deer'], ['elk', 'Walk', 'white-tailed-deer'],
  ['bighorn-sheep', 'Walk', 'white-tailed-deer'], ['cougar', 'Walk', 'eastern-wolf'],
  ['coyote', 'Walk', 'eastern-wolf'], ['yellow-bellied-marmot', 'Walk'], ['eastern-grey-kangaroo', 'Walk'],
  ['echidna', 'Walk'], ['raven', 'Fly'], ['sulphur-crested-cockatoo', 'Fly'], ['kookaburra', 'Fly'],
  // Europe round 1.
  ['roe-deer', 'Walk', 'white-tailed-deer'], ['red-deer', 'Walk', 'white-tailed-deer'],
  ['chamois', 'Walk', 'white-tailed-deer'], ['ibex', 'Walk', 'white-tailed-deer'], ['red-fox', 'Walk', 'eastern-wolf'],
  ['wildcat', 'Walk', 'eastern-wolf'], ['wild-boar', 'Walk'], ['alpine-marmot', 'Walk'],
  ['black-stork', 'Fly'], ['golden-eagle', 'Fly'], ['gull', 'Fly'],
].map(([id, motion, donor]) => ({ id, motion, donor, script: `tools/blender/wildlife/${id}.py`, args: [],
  glb: [`public/assets/wildlife/${id}.glb`], budget: motion === 'Fly' ? 2000 : 5000 }));
// Species whose art did not pass (WILD-ART-SRC Europe round 3: the wildcat).
// Its recipe stays for a later card; its GLB stays out of public/.
const artCandidates = new Set(['wildcat']);
function jpegDimensions(bytes, start, length) {
  assert.equal(bytes[start], 0xff, 'JPEG starts with SOI');
  assert.equal(bytes[start + 1], 0xd8, 'JPEG starts with SOI');
  const end = start + length;
  let offset = start + 2;
  while (offset + 9 < end) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7)};
    }
    offset += 2 + segmentLength;
  }
  assert.fail('JPEG has no frame-size marker');
}

const generators = [
  {id:'town-dome',script:'tools/blender/town-dome.py',args:[],evidence:'.qa-dist/town-dome',
    glb:['public/assets/models/wasteland/town/dome.glb'],budget:30000,maxBytes:3000000},
  {id:'town-homes',script:'tools/blender/town-homes.py',args:[],
    glb:['public/assets/models/wasteland/town/homes.glb'],budget:60000,maxBytes:3000000},
  {id:'town-sample',script:'tools/blender/town-sample.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/town/sample.glb'],budget:15000,maxBytes:2500000},
  {id:'town-trucks-1',script:'tools/blender/town-trucks-1.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/town/trucks-1.glb'],budget:48000,maxBytes:8000000},
  {id:'town-trucks-2',script:'tools/blender/town-trucks-2.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/town/trucks-2.glb'],budget:12000,maxBytes:3000000},
  {id:'town-stages',script:'tools/blender/town-stages.py',args:[],candidate:true,evidence:'.evidence/2026-11-06/TOWN-ART-STAGES/round-5',
    glb:['public/assets/models/wasteland/town/stages.glb'],budget:60000,maxBytes:3000000},

  {id:'town-water',script:'tools/blender/town-water.py',args:['--round','4'],candidate:true,
    glb:['public/assets/models/wasteland/town/water.glb'],budget:30000,maxBytes:3000000},
  {id:'town-vane',script:'tools/blender/town-vane.py',args:['--round','3'],candidate:true,
    glb:['public/assets/models/wasteland/town/vane.glb'],budget:40000,maxBytes:3000000},
  {id:'town-sanitation',script:'tools/blender/town-sanitation.py',args:['--round','2'],candidate:true,recipeOnly:true,
    glb:['public/assets/models/wasteland/town/sanitation.glb'],budget:14000,maxBytes:3000000},
  {id:'town-machines-1',script:'tools/blender/town-machines-1.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/town/machines-1.glb'],budget:60000,maxBytes:3000000},
  {id:'ww-art-rail',script:'tools/blender/rail-trains.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/rail/rail-trains.glb'],budget:80000,maxBytes:5000000},
  {id:'ww-art-rail-props',script:'tools/blender/rail-props.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/rail/rail-props.glb'],budget:80000,maxBytes:5000000},
  {id:'ww-art-whites',script:'tools/blender/rail-whites.py',args:['--through','vane-fence'],candidate:true,
    glb:['public/assets/models/wasteland/rail/whites.glb'],budget:60000,maxBytes:5000000},
  {id:'ww-art-dam',script:'tools/blender/scablands-dam.py',args:[],candidate:true,
    glb:['public/assets/models/wasteland/scablands/dam.glb'],budget:60000,maxBytes:3*1024*1024},

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
  { script: 'tools/blender/armor-kits.py', args: [], glb: ['falcone_f42','stuttgart_959s','falcone_heritage','aurora_gt','dusthawk_rally','banshee_muscle','viper_proto','titan_monster','koenigsegg_jesko','ferrari_enzo','mclaren_f1','bugatti_bolide','falcone_sirena','mcmurtry_speirling','nissan_skyline_gtr_r34'].map(name => `public/assets/models/wasteland/kits/${name}.glb`) },
  { script: 'tools/blender/scrapdome-yard.py', args: ['--round', '1'], glb: ['public/assets/models/wasteland/scrapdome/yard.glb'] },
  { script: 'tools/blender/scablands-tintown.py', args: [], glb: ['public/assets/models/wasteland/scablands/tintown.glb'], budget: 60000 },
  { script: 'tools/blender/scablands-boneyard.py', args: ['--round', '2'], glb: ['public/assets/models/wasteland/scablands/boneyard.glb'] },
  { script: 'tools/blender/crew-favours.py', args: [], candidate: true, budget: 40000, maxBytes: 4*1024*1024,
    glb: ['public/assets/models/wasteland/scablands/crew-favours.glb'] },
  { script: 'tools/blender/scablands-folk.py', args: ['--round', '2'], glb: ['public/assets/models/wasteland/scablands/folk.glb'], budget: 56000 },
  { script: 'tools/blender/scablands-everburn.py', args: [], glb: ['public/assets/models/wasteland/scablands/everburn.glb'] },
  { script: 'tools/blender/bowl-stadium.py', args: [], glb: ['public/assets/models/wasteland/bowl/stadium.glb'], budget: 80000 },
  { script: 'tools/blender/bowl-crush.py', args: [], glb: ['public/assets/models/wasteland/bowl/crush.glb'], budget: 20000 },
  { script: 'tools/blender/water-works.py', args: [], glb: ['public/assets/models/wasteland/scrapdome/water-works.glb'] },
  { script: 'tools/blender/magnus-magnet.py', args: [], glb: ['public/assets/models/wasteland/kits/magnus-magnet.glb'] },
  { script: 'tools/blender/scablands-kit.py', args: [], glb: ['public/assets/models/wasteland/scablands/kit.glb'], budget: 30000, maxBytes: 1500000 },
  { id: 'bowl-trucks', script: 'tools/blender/bowl-trucks.py', args: [], glb: ['public/assets/models/wasteland/bowl/trucks.glb'], budget: 8000 },
  // Candidate art is generated and read back in its lane, then waits for Claude's look verdict.
  // The public candidate is installed only when a later scene card wires it into gameplay.
  { script: 'tools/blender/bowl-scrapasaurus.py', args: ['--round', '2'], candidate: true,
    budget: 60000, glb: ['public/assets/models/wasteland/bowl/scrapasaurus.glb'] },
  // CAR-ART-SCARAB: round-3 candidate waits for Claude's look verdict and a later install card.
  { script: 'tools/blender/scarab.py', args: [], candidate: true,
    budget: 25000, glb: ['public/assets/models/wasteland/cars/scarab.glb'] },
  { script: 'tools/blender/test-fighter.py', args: [], glb: ['public/assets/models/wasteland/test-fighter.glb'] },
  { script: 'tools/blender/crew-fighters.py', args: [], glb: ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'].map(name => `public/assets/models/wasteland/crew/${name}.glb`) },
  { script: 'tools/blender/first-person-gear.py', args: ['--round', '1'], glb: [
    'public/assets/models/wasteland/first-person/wrench.glb',
    'public/assets/models/wasteland/first-person/rpg.glb',
    ...['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'].map(name => `public/assets/models/wasteland/first-person/hands/${name}.glb`),
  ] },
  { script: 'tools/blender/rustwall.py', args: ['--round', '1'], glb: ['wall', 'wash'].map(name => `public/assets/models/wasteland/rustwall/${name}.glb`) },
  { script: 'tools/blender/scablands-vehicles.py', args: [], glb: ['public/assets/models/wasteland/scablands/vehicles.glb'] },
  { script: 'tools/blender/rattler-photo.py', args: [], glb: ['public/assets/models/wasteland/cars/rattler.glb'], budget: 25000, maxBytes: 8000000 },
  { id: 'longhaul', script: 'tools/blender/longhaul.py', args: [], glb: ['public/assets/models/wasteland/cars/longhaul.glb'], budget: 25000, maxBytes: 8000000 },
  // WW-SCENE owns installation; this card keeps its generated GLB out of public/.
    { script: 'tools/blender/scablands-mall.py', args: [], glb: ['public/assets/models/wasteland/scablands/mall.glb'] },
  { script: 'tools/build-course-landmarks.py', args: [], glb: [], json: ['src/generated/course-landmarks.json'] },
  { script: 'tools/blender/muddy-hollow-props.py', args: [], glb: [], json: ['src/generated/muddy-hollow-props.json'] },
  { script: 'tools/blender/speirling-tries.py', args: [], recipeOnly: true, glb: ['public/assets/models/unlocks/mcmurtry_speirling.glb'] },
  { script: 'tools/blender/sirena-wreck.py', args: [], recipeOnly: true, glb: ['public/assets/models/sirena/sea-wreck.glb'] },
  { script: 'tools/blender/kestrel-one.py', args: [], glb: ['public/assets/heli/kestrel-one.glb'] },
  { script: 'tools/blender/lab-brian.py', args: [], recipeOnly: true, glb: ['public/assets/models/lab/brian.glb'] },
  { script: 'tools/blender/lab-workshop-props.py', args: [], recipeOnly: true, glb: ['public/assets/models/lab/workshop-lesson-props.glb'] },
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
  {script: 'tools/blender/wildlife-north-woods.py', test: 'tools/test-blender-output.mjs'},
  {script: 'tools/blender/ardennes-landmarks.py', test: 'tools/test-circuit-ardennes.mjs'},
  {script: 'tools/blender/ardennes-beech.py', test: 'tools/test-circuit-ardennes.mjs'},
];
// Circuit kits plan directories rather than one editable Blend per model.
const kitGenerators = [{ script: 'tools/blender/p4-kits.py', round: 3 }];
const reviewHelpers = [
  {script:'tools/blender/town-sheet.py',args:[],render:false,summary:['docs','board','looks','town-art-base','round-3.jpg']},
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

// Beaver has an explicit private PNG contract; it never uses the tanker's
// fit-config or changes that recipe's embedded-only atlas assertions.
function beaverPlanCall(fixtureRoot, output, model = 'beaver', viewOnly = false, sourceViews = [], fitOnly = false) {
  const before = fixtureTree(fixtureRoot);
  const call = spawnSync('python', ['-I', '-B', '-S', '-c', kitPlanAudit,
    join(root, 'tools/blender/wildlife-north-woods.py'), '--', '--root', fixtureRoot,
    '--model', model, '--output-dir', output, '--paths-only', ...(viewOnly ? ['--view-only'] : []),
    ...sourceViews.flatMap(name => ['--source-view', name]), ...(fitOnly ? ['--fit-only'] : [])],
    {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000});
  assert.equal(call.error, undefined, call.error?.message);
  assert.deepEqual(fixtureTree(fixtureRoot), before, 'beaver planning changed its temporary root');
  const receipt = call.stderr.split(/\r?\n/).find(line => line.startsWith('DUEL_KIT_PATH_AUDIT='));
  assert.ok(receipt, 'actual beaver CLI retains the existing filesystem/import audit');
  const audit = JSON.parse(receipt.slice('DUEL_KIT_PATH_AUDIT='.length));
  assert.deepEqual(audit.denied, [], 'beaver planning attempted input/config/donor access, imports or writes');
  assert.ok(audit.imports.every(name => !['bpy', 'bmesh', 'mathutils', 'numpy'].includes(name.split('.')[0])),
    'beaver planning imported a Blender or array dependency');
  return call;
}
check('all Blender asset generators are covered', () => {
  const actual = readdirSync(join(root, 'tools/blender')).filter(name => name.endsWith('.py') && !['fidelity-sheet.py','town_base.py','photo_model.py','hull_model.py'].includes(name))
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
  for (const generator of wildlifeGenerators) {
    check(generator.script + ' plans only its runtime candidate without Blender or writes', () => {
      for (const fixtureRoot of fixtureRoots) {
        const plan = pathPlan(generator, fixtureRoot);
        assert.deepEqual(plan.blend, []);
        assert.deepEqual(relativePaths(fixtureRoot, plan.glb, '.glb'), generator.glb);
        assert.deepEqual(plan.evidence, []);
        assert.deepEqual(plan.json, []);
        const review = pathPlan({...generator, args: ['--review']}, fixtureRoot);
        assert.deepEqual(review.glb, []);
        assert.deepEqual(review.blend, []);
        const id = generator.glb[0].split('/').pop().replace('.glb', '');
        assert.deepEqual(review.evidence, ['side', 'three-quarter', 'idle-25', 'idle-75', 'walk-25', 'walk-75']
          .map(view => join(fixtureRoot, '.qa-dist/wildlife-round-1', `${id}-${view}.png`)));
        assert.deepEqual(review.json, [join(fixtureRoot, '.qa-dist/wildlife-round-1', `${id}-inspection.json`)]);
        assert.deepEqual(readdirSync(fixtureRoot), []);
      }
    });
    check(generator.script + ' exports a bounded coloured skinned animal with idle and gait', () => {
      const bytes = readFileSync(join(root, generator.glb[0]));
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
      assert.equal(bytes.readUInt32LE(4), 2);
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
      const triangles = primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
      assert.ok(triangles > 100 && triangles <= 5000, `${triangles} triangles`);
      assert.ok(gltf.skins?.length > 0);
      assert.equal(gltf.images?.length, 1, 'one embedded natural coat map');
      const binStart = 28 + bytes.readUInt32LE(12);
      const imageView = gltf.bufferViews[gltf.images[0].bufferView];
      const imageStart = binStart + (imageView.byteOffset || 0);
      assert.equal(gltf.images[0].mimeType, 'image/png');
      assert.ok(bytes.readUInt32BE(imageStart + 16) <= 1024);
      assert.ok(bytes.readUInt32BE(imageStart + 20) <= 1024);
      for (const p of primitives) {
        for (const attribute of ['COLOR_0', 'JOINTS_0', 'WEIGHTS_0']) {
          assert.ok(Number.isInteger(p.attributes[attribute]), `missing ${attribute}`);
        }
      }
      for (const name of ['Idle', 'Walk']) {
        const clip = gltf.animations.find(a => a.name === name);
        assert.ok(clip, `missing ${name}`);
        assert.ok(clip.channels.some(channel => gltf.skins.some(skin => skin.joints.includes(channel.target.node))),
          `${name} must animate actual skin joints`);
        assert.ok(clip.samplers.some(s => gltf.accessors[s.input].count > 2));
      }
      if (['white-tailed-deer', 'moose', 'eastern-wolf'].includes(generator.script.split('/').at(-1).slice(0, -3))) {
        const sources = JSON.parse(readFileSync(join(root, 'tools/blender/wildlife/sources.json'), 'utf8'));
        const source = sources[generator.script.split('/').at(-1).slice(0, -3)];
        for (const name of source.clips) {
          assert.ok(gltf.animations.some(a => a.name === name), `lost donor clip ${name}`);
        }
      }
    });
  }
  for (const generator of westWildlife) {
    check(generator.script + ' plans its runtime animal and review views without Blender or writes', () => {
      for (const fixtureRoot of fixtureRoots) {
        const plan = pathPlan(generator, fixtureRoot);
        assert.deepEqual(plan.blend, []);
        assert.deepEqual(relativePaths(fixtureRoot, plan.glb, '.glb'), generator.glb);
        assert.deepEqual(plan.evidence, []);
        const review = pathPlan({...generator, args: ['--review']}, fixtureRoot);
        assert.deepEqual(review.glb, []);
        const motion = generator.motion.toLowerCase();
        assert.deepEqual(review.evidence, ['side', 'three-quarter', 'idle-25', 'idle-75', `${motion}-25`, `${motion}-75`,
          'close-idle', `close-${motion}`].map(view => join(fixtureRoot, '.qa-dist/wildlife-round-1', `${generator.id}-${view}.png`)));
        assert.deepEqual(review.json, [join(fixtureRoot, '.qa-dist/wildlife-round-1', `${generator.id}-inspection.json`)]);
        assert.deepEqual(readdirSync(fixtureRoot), []);
      }
    });
    if (generator.id === 'town-machines-1') check('TOWN-ART-MACHINES-1 runtime GLB keeps its family, joints and per-machine budgets', () => {
      const path = join(root, generator.glb[0]);
      const bytes = readFileSync(path);
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
      assert.equal(bytes.readUInt32LE(4), 2);
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      assert.ok(bytes.length <= 3_000_000, `${bytes.length} bytes exceeds 3 MB`);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      const texturedMaterials = gltf.materials.filter(material => material.pbrMetallicRoughness?.baseColorTexture);
      const textureIndexes = texturedMaterials.map(material => material.pbrMetallicRoughness.baseColorTexture.index);
      assert.ok(texturedMaterials.length > 0, 'runtime materials carry photo textures');
      assert.equal(new Set(textureIndexes).size, texturedMaterials.length, 'each textured material owns a distinct texture');
      const imageIndexes = textureIndexes.map(index => gltf.textures[index]?.source);
      assert.ok(imageIndexes.every(Number.isInteger), 'every material texture resolves to an embedded image');
      assert.equal(new Set(imageIndexes).size, texturedMaterials.length, 'each textured material owns a distinct image');
      assert.equal(gltf.images?.length, texturedMaterials.length, 'GLB contains only the per-material pictures it uses');
      for (const index of imageIndexes) assert.equal(gltf.images[index].mimeType, 'image/jpeg', 'material pictures use compact JPEG');
      for (const material of gltf.materials) {
        const metallic = material.pbrMetallicRoughness?.metallicFactor ?? 1;
        assert.ok(metallic <= 0.3, `${material.name || 'unnamed material'} metallicFactor ${metallic} exceeds 0.3`);
      }
      const names = gltf.nodes.map(node => node.name || '');
      const ids = ['trencher', 'excavator', 'dump-truck', 'dozer'];
      assert.ok(names.includes('town-machines-1'), 'one family root');
      for (const id of ids) assert.ok(names.includes(id), `${id} root is missing`);
      const requiredJoints = ['trencher:boom','trencher:chain','excavator:cab','excavator:boom','excavator:arm',
        'excavator:bucket','dump-truck:bed','dump-truck:load','dozer:blade'];
      for (const name of requiredJoints) assert.ok(names.includes(name), `${name} pivot node is missing`);
      const children = gltf.nodes.map(node => node.children || []);
      const nodeByName = new Map(gltf.nodes.map((node, index) => [node.name, index]));
      const familyChildren = children[nodeByName.get('town-machines-1')];
      assert.deepEqual(familyChildren.map(index => gltf.nodes[index].name).sort(), [...ids].sort(), 'one direct child root per machine');
      const descendants = (index) => [index, ...children[index].flatMap(descendants)];
      const primitiveCount = (nodeIndex) => {
        const meshIds = new Set(descendants(nodeIndex).map(index => gltf.nodes[index].mesh).filter(Number.isInteger));
        return [...meshIds].reduce((sum, meshId) => sum + gltf.meshes[meshId].primitives.reduce((partial, primitive) =>
          partial + gltf.accessors[primitive.indices].count / 3, 0), 0);
      };
      for (const id of ids) {
        const triangles = primitiveCount(nodeByName.get(id));
        assert.ok(triangles > 1000 && triangles <= 15000, `${id}: ${triangles} triangles`);
      }
    });
    if (artCandidates.has(generator.id)) {
      // Not passed: built only under the ignored .qa-dist (--candidate),
      // never in public/, so the game's model table and the disk agree. Its
      // export checks return when it passes and moves into public/.
      check(generator.script + ' keeps its candidate out of the runtime folder until it passes', () => {
        assert.ok(!existsSync(join(root, generator.glb[0])), `${generator.glb[0]} is published before passing`);
      });
      continue;
    }
    check(generator.script + ` exports a bounded coloured skinned animal with Idle and ${generator.motion}`, () => {
      const bytes = readFileSync(join(root, generator.glb[0]));
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
      const triangles = primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
      assert.ok(triangles > 300 && triangles <= generator.budget, `${triangles} triangles`);
      assert.ok(gltf.skins?.length > 0);
      assert.equal(gltf.images?.length, 1, 'one embedded natural coat map');
      const imageView = gltf.bufferViews[gltf.images[0].bufferView];
      const imageStart = 28 + bytes.readUInt32LE(12) + (imageView.byteOffset || 0);
      assert.equal(gltf.images[0].mimeType, 'image/png');
      assert.ok(bytes.readUInt32BE(imageStart + 16) <= 1024 && bytes.readUInt32BE(imageStart + 20) <= 1024);
      for (const p of primitives) {
        for (const attribute of ['COLOR_0', 'JOINTS_0', 'WEIGHTS_0']) assert.ok(Number.isInteger(p.attributes[attribute]), `missing ${attribute}`);
      }
      for (const name of ['Idle', generator.motion]) {
        const clip = gltf.animations.find(a => a.name === name);
        assert.ok(clip, `missing ${name}`);
        assert.ok(clip.channels.some(channel => gltf.skins.some(skin => skin.joints.includes(channel.target.node))),
          `${name} must animate actual skin joints`);
        assert.ok(clip.samplers.some(s => gltf.accessors[s.input].count > 2));
      }
      const sources = JSON.parse(readFileSync(join(root, 'tools/blender/wildlife/sources.json'), 'utf8'));
      assert.ok(sources[generator.id], 'source and credit row');
      if (generator.donor) {
        assert.equal(sources[generator.id].sha256, sources[generator.donor].sha256, 'same licensed donor');
        for (const name of sources[generator.donor].clips) assert.ok(gltf.animations.some(a => a.name === name), `lost donor clip ${name}`);
      }
    });
  }
  check('tools/art/wolf-tracks.py plans and keeps its tiling snow decal', () => {
    for (const fixtureRoot of fixtureRoots) {
      const call = spawnSync('python', [join(root, 'tools/art/wolf-tracks.py'), '--root', fixtureRoot, '--paths-only'],
        { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
      assert.equal(call.status, 0, call.stderr);
      assert.deepEqual(JSON.parse(call.stdout).textures, [join(fixtureRoot, 'public/assets/wildlife/wolf-tracks.png')]);
      assert.deepEqual(readdirSync(fixtureRoot), []);
    }
    const png = readFileSync(join(root, 'public/assets/wildlife/wolf-tracks.png'));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.ok(png.readUInt32BE(16) <= 512 && png.readUInt32BE(20) <= 512, 'at most 512');
    assert.equal(png[25], 6, 'RGBA, transparent where the snow is untouched');
  });
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
        if (artCandidates.has(generator.id) && runtimePath.startsWith('public/')) {
          assert.ok(!existsSync(join(root, runtimePath)), `${runtimePath} is published before art approval`);
        } else {
          assert.ok(existsSync(join(root, runtimePath)), `${runtimePath} is missing from the runtime recipe`);
        }
        if (!generator.candidate) assert.ok(existsSync(join(root, runtimePath)), `${runtimePath} is missing from the runtime recipe`);
      }
    });
    if (generator.candidate) check(`${generator.script} candidate GLB stays within its art budget when present`, () => {
      const path = join(root, generator.glb[0]);
      if (!existsSync(path)) return; // Claude's approved look is installed by the scene card.
      const bytes = readFileSync(path);
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
      assert.equal(bytes.readUInt32LE(4), 2);
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      const jsonLength = bytes.readUInt32LE(12);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
      const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
        .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
      assert.ok(triangles > 1000 && triangles <= generator.budget, `${triangles} triangles`);
      const maxBytes = generator.maxBytes ?? 2_500_000;
      assert.ok(bytes.length <= maxBytes, `${bytes.length} bytes exceeds ${maxBytes} bytes`);
      if (generator.id === 'town-stages') {
        const names = gltf.nodes.map(node => node.name || '');
        assert.ok(names.includes('town-stages'), 'named family root');
        for (const id of ['scaffold-1','scaffold-2','scaffold-3','scaffold-4',
          'rubble-1','rubble-2','rubble-3','rubble-4','burnt-1','burnt-2','burnt-3','burnt-4',
          'street-lamp','barrel-fire','crate-stack','barrels','washing-line','bench','bin','signpost','sandbags','junk-pile','dead-tree']) {
          assert.ok(names.includes(id), `missing building ${id}`);
        }
        const binaryOffset = 20 + jsonLength + 8;
        for (const primitive of gltf.meshes.flatMap(mesh => mesh.primitives)) {
          const texCoords = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
          assert.deepEqual(texCoords, ['TEXCOORD_0'], 'town material meshes use only TEXCOORD_0');
          const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
          assert.ok(uv && uv.type === 'VEC2' && uv.componentType === 5126, 'town UV accessor uses float pairs');
          const view = gltf.bufferViews[uv.bufferView];
          const start = binaryOffset + (view.byteOffset ?? 0) + (uv.byteOffset ?? 0);
          const stride = view.byteStride ?? 8;
          const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
          for (let i = 0; i < uv.count; i++) for (let axis = 0; axis < 2; axis++) {
            const value = bytes.readFloatLE(start + i * stride + axis * 4);
            min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
          }
          assert.ok(min[0] < max[0] && min[1] < max[1], 'town UVs cover a range of values');
        }
      }
      if (generator.id === 'ww-art-rail') {
        const names = new Set(gltf.nodes.map(node => node.name));
        assert.ok(names.has('the-2-15-engine'), 'named dug-out engine node');
        assert.ok(names.has('the-2-15-drift'), 'separate named salt drift node');
        assert.ok(names.has('the-2-15-van'), 'separate named guard van node');
        assert.ok(names.has('wednesday'), 'separate named Wednesday engine node');
        for (const heap of ['coal-heap-full', 'coal-heap-half', 'coal-heap-low']) {
          assert.ok(names.has(heap), `separate named ${heap} node`);
        }
        const binaryOffset = 20 + jsonLength + 8;
        for (const primitive of gltf.meshes.flatMap(mesh => mesh.primitives)) {
          const coordinates = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
          assert.deepEqual(coordinates, ['TEXCOORD_0'], `${primitive.material} has only TEXCOORD_0`);
          const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
          assert.ok(uv && uv.type === 'VEC2' && uv.componentType === 5126, 'UV accessor uses float pairs');
          const view = gltf.bufferViews[uv.bufferView];
          const start = binaryOffset + (view.byteOffset ?? 0) + (uv.byteOffset ?? 0);
          const stride = view.byteStride ?? 8;
          const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
          for (let i = 0; i < uv.count; i++) for (let axis = 0; axis < 2; axis++) {
            const value = bytes.readFloatLE(start + i * stride + axis * 4);
            min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
          }
          assert.ok(min[0] < max[0] && min[1] < max[1], 'TEXCOORD_0 covers a range');
        }
        for (const material of gltf.materials) {
          assert.ok((material.pbrMetallicRoughness?.metallicFactor ?? 0) <= .3,
            `${material.name} metallicFactor exceeds 0.3`);
        }
      }
      if (generator.id === 'ww-art-whites') {
        const binaryOffset = 20 + jsonLength + 8;
        for (const primitive of gltf.meshes.flatMap(mesh => mesh.primitives)) {
          const coordinates = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
          assert.deepEqual(coordinates, ['TEXCOORD_0'], 'Whites models use only TEXCOORD_0');
          const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
          assert.ok(uv && uv.type === 'VEC2' && uv.componentType === 5126, 'UV accessor uses float pairs');
          const view = gltf.bufferViews[uv.bufferView];
          const start = binaryOffset + (view.byteOffset ?? 0) + (uv.byteOffset ?? 0);
          const stride = view.byteStride ?? 8;
          const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
          for (let i = 0; i < uv.count; i++) for (let axis = 0; axis < 2; axis++) {
            const value = bytes.readFloatLE(start + i * stride + axis * 4);
            min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
          }
          assert.ok(min[0] < max[0] && min[1] < max[1], 'TEXCOORD_0 covers a range');
        }
        for (const material of gltf.materials) {
          assert.ok((material.pbrMetallicRoughness?.metallicFactor ?? 0) <= .3,
            `${material.name} metallicFactor exceeds 0.3`);
        }
      }
    });
  }
  check('TOWN-ART-WATER family exports six grounded nodes and its per-material photos', () => {
    const bytes = readFileSync(join(root, 'public/assets/models/wasteland/town/water.glb'));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 3_000_000, `${bytes.length} bytes exceeds the card\'s 3 MB limit`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const coordinates = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
      assert.deepEqual(coordinates, ['TEXCOORD_0'], `${mesh.name} has one exported picture-coordinate set`);
      const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
      const view = gltf.bufferViews[uv.bufferView];
      const stride = view.byteStride ?? 8;
      const start = 28 + jsonLength + (view.byteOffset ?? 0) + (uv.byteOffset ?? 0);
      const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
      for (let vertex = 0; vertex < uv.count; vertex++) for (let axis = 0; axis < 2; axis++) {
        const value = bytes.readFloatLE(start + vertex * stride + axis * 4);
        min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
      }
      assert.ok(max.some((value, axis) => value > min[axis]), `${mesh.name} TEXCOORD_0 covers a range`);
    }
    const nodes = new Set(gltf.nodes.map(node => node.name));
    for (const name of ['town-water','hand-well','standpipe','water-tower','pump-house','treatment-plant','reservoir',
      'water-tower:fill-1','water-tower:fill-2','water-tower:fill-3','pump-house:flywheel',
      'treatment-plant:settle','treatment-plant:filter','treatment-plant:boil','treatment-plant:clean','reservoir:water']) {
      assert.ok(nodes.has(name), `missing scene node ${name}`);
    }
    const budgets = {'hand-well':1800,'standpipe':1800,'water-tower':5000,'pump-house':5000,
      'treatment-plant':14000,'reservoir':14000};
    const familyTriangles = Object.fromEntries(Object.keys(budgets).map(name => [name,0]));
    for (const node of gltf.nodes) {
      if (!Number.isInteger(node.mesh)) continue;
      const family = node.name.split(':')[0];
      if (familyTriangles[family] === undefined) continue;
      familyTriangles[family] += gltf.meshes[node.mesh].primitives.reduce((sum, primitive) =>
        sum + gltf.accessors[primitive.indices].count / 3, 0);
    }
    for (const [family, budget] of Object.entries(budgets)) {
      assert.ok(familyTriangles[family] > 0, `${family} has no mesh geometry`);
      assert.ok(familyTriangles[family] <= budget, `${family} has ${familyTriangles[family]} triangles; budget ${budget}`);
    }
    assert.ok(gltf.images?.length >= 5, 'timber, tin, concrete, earth and water have their own pictures');
    for (const image of gltf.images) {
      assert.equal(image.mimeType, 'image/jpeg', 'each photo is exported as JPEG');
      assert.ok(Number.isInteger(image.bufferView), 'each photo is embedded in the GLB');
      const view = gltf.bufferViews[image.bufferView];
      const start = 28 + jsonLength + (view.byteOffset || 0);
      assert.equal(bytes.toString('ascii', start + 6, start + 10), 'JFIF', 'embedded texture is JPEG');
      const {width, height} = jpegDimensions(bytes, start, view.byteLength);
      assert.ok(width <= 512 && height <= 512, `${width}x${height} texture exceeds the per-material 512 px limit`);
    }
    for (const material of gltf.materials || []) {
      assert.ok((material.pbrMetallicRoughness?.metallicFactor ?? 0) <= 0.3,
        `${material.name} metallic factor exceeds the reflection limit`);
    }
  });
  check('TOWN-ART-SANITATION exports all five named buildings with sampled UV textures', () => {
    const bytes=readFileSync(join(root,'public/assets/models/wasteland/town/sanitation.glb'));
    assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
    const names=new Set(gltf.nodes.map(node=>node.name));
    for(const id of ['town-sanitation','latrine','bathhouse','reed-bed','trash-sorter','compost-heap']) assert.ok(names.has(id),`missing ${id}`);
    const total=gltf.meshes.flatMap(mesh=>mesh.primitives).reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0);
    assert.ok(total>300&&total<=14000,`${total} triangles`);assert.ok(bytes.length<=3_000_000,`${bytes.length} bytes`);
    for(const mesh of gltf.meshes) for(const primitive of mesh.primitives){
      assert.deepEqual(Object.keys(primitive.attributes).filter(key=>key.startsWith('TEXCOORD_')),['TEXCOORD_0'],'one readable UV channel per primitive');
      const uv=gltf.accessors[primitive.attributes.TEXCOORD_0],view=gltf.bufferViews[uv.bufferView],stride=view.byteStride??8;
      assert.ok(uv.count>3,'UVs contain multiple vertices');const start=28+bytes.readUInt32LE(12)+(view.byteOffset??0)+(uv.byteOffset??0);
      const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
      for(let vertex=0;vertex<uv.count;vertex++)for(let axis=0;axis<2;axis++){const value=bytes.readFloatLE(start+vertex*stride+axis*4);min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}
      assert.ok(max[0]-min[0]>.01&&max[1]-min[1]>.01,'UVs cover a visible texture range');
    }
  });
  check('TOWN-ART-VANE exports six named buildings, a separate beacon, valid UVs and per-building budgets', () => {
    const bytes=readFileSync(join(root,'public/assets/models/wasteland/town/vane.glb'));
    assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
    assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(bytes.length<=3_000_000,`${bytes.length} bytes exceeds 3 MB`);
    const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
    const names=new Set(gltf.nodes.map(node=>node.name));
    for(const id of ['town-vane','vane-kiosk','vane-tank','vane-depot','vane-fence','vane-billboard','vane-tower','vane-tower:lamp'])
      assert.ok(names.has(id),`missing named Vane node ${id}`);
    const budgets={'vane-kiosk':1800,'vane-tank':5000,'vane-depot':9000,'vane-fence':1800,'vane-billboard':1800,'vane-tower':14000};
    const triangles=Object.fromEntries(Object.keys(budgets).map(id=>[id,0]));
    const binStart=20+jsonLength+8;
    for(const node of gltf.nodes){
      if(!Number.isInteger(node.mesh))continue;
      const owner=node.name.split(':')[0];if(triangles[owner]===undefined)continue;
      for(const primitive of gltf.meshes[node.mesh].primitives){
        triangles[owner]+=gltf.accessors[primitive.indices].count/3;
        const keys=Object.keys(primitive.attributes).filter(key=>key.startsWith('TEXCOORD_'));
        assert.deepEqual(keys,['TEXCOORD_0'],`${node.name} has only TEXCOORD_0`);
        const uv=gltf.accessors[primitive.attributes.TEXCOORD_0];
        assert.ok(uv && uv.type==='VEC2' && uv.componentType===5126,`${node.name} UVs are float pairs`);
        const view=gltf.bufferViews[uv.bufferView],start=binStart+(view.byteOffset??0)+(uv.byteOffset??0),stride=view.byteStride??8;
        const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
        for(let i=0;i<uv.count;i++)for(let axis=0;axis<2;axis++){const value=bytes.readFloatLE(start+i*stride+axis*4);min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}
        assert.ok(max.some((value,axis)=>value-min[axis]>.01),`${node.name} UVs have a usable range`);
      }
    }
    for(const [id,budget] of Object.entries(budgets))assert.ok(triangles[id]>0&&triangles[id]<=budget,`${id}: ${triangles[id]} triangles; budget ${budget}`);
    for(const entry of gltf.materials||[])assert.ok((entry.pbrMetallicRoughness?.metallicFactor??0)<=.3,`${entry.name} metallic exceeds .3`);
  });
  check('TOWN-ART-DOME GLB keeps both structures, separate picture materials and card budgets', () => {
    const path = join(root, 'public/assets/models/wasteland/town/dome.glb');
    if (!existsSync(path)) return; // Generated and read back in the art lane; not a runtime asset yet.
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 3_000_000, `${bytes.length} bytes exceeds 3 MB`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    const binStart = 20 + jsonLength + 8;
    for (const [meshIndex, mesh] of gltf.meshes.entries()) {
      for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
        const label = `${mesh.name || `mesh ${meshIndex}`} primitive ${primitiveIndex}`;
        const uvNames = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
        assert.deepEqual(uvNames, ['TEXCOORD_0'], `${label} has only TEXCOORD_0`);
        const uvAccessor = gltf.accessors[primitive.attributes.TEXCOORD_0];
        assert.equal(uvAccessor?.componentType, 5126, `${label} TEXCOORD_0 stores float values`);
        assert.equal(uvAccessor?.type, 'VEC2', `${label} TEXCOORD_0 stores UV pairs`);
        const view = gltf.bufferViews[uvAccessor.bufferView];
        const stride = view.byteStride || 8;
        const start = binStart + (view.byteOffset || 0) + (uvAccessor.byteOffset || 0);
        const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
        for (let i = 0; i < uvAccessor.count; i++) {
          for (let axis = 0; axis < 2; axis++) {
            const value = bytes.readFloatLE(start + i * stride + axis * 4);
            min[axis] = Math.min(min[axis], value);
            max[axis] = Math.max(max[axis], value);
          }
        }
        assert.ok(min.some((value, axis) => value < max[axis]),
          `${label} TEXCOORD_0 is not a single repeated point`);
      }
    }
    const names = gltf.nodes.map(node => node.name);
    for (const name of ['town-dome', 'dome-outer', 'dome-gate', 'dome-outer:lamp', 'dome-gate:SCRAPDOME-lettering']) {
      assert.ok(names.includes(name), `missing named town node ${name}`);
    }
    assert.ok(gltf.nodes.find(node => node.name === 'town-dome').children?.length >= 2, 'both buildings are children of the family root');
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 1000 && triangles <= 30_000, `${triangles} triangles`);
    assert.ok(gltf.images.length >= 8, `${gltf.images.length} separate texture pictures`);
    assert.ok(!gltf.images.some(image => /atlas/i.test(image.name || image.uri || '')), 'no packed atlas');
    for (const material of gltf.materials) {
      const metallic = material.pbrMetallicRoughness?.metallicFactor ?? 1;
      assert.ok(metallic <= 0.3, `${material.name || 'material'} metallic ${metallic} exceeds 0.3`);
    }
    const lettering = gltf.nodes.find(node => node.name === 'dome-gate:SCRAPDOME-lettering');
    assert.ok(lettering && lettering.mesh === undefined, 'painted sign has no computer-font mesh');
    for (const image of gltf.images) {
      assert.equal(image.mimeType, 'image/jpeg', `${image.name || 'picture'} is a JPEG`);
      const view = gltf.bufferViews[image.bufferView];
      const jpeg = bytes.subarray(binStart + view.byteOffset, binStart + view.byteOffset + view.byteLength);
      assert.equal(jpeg[0], 0xff, `${image.name || 'picture'} JPEG start`);
      assert.equal(jpeg[1], 0xd8, `${image.name || 'picture'} JPEG marker`);
    }
  });
  check('TOWN-ART-TRUCKS-1 reads back four named work trucks, movable parts and per-truck budgets', () => {
    const candidateSuffix = `-readback-${process.pid}-${randomUUID()}`;
    const modelPath = join(root, '.qa-dist/art-candidates', `town-trucks-1${candidateSuffix}.glb`);
    try {
      const blender = process.env.BLENDER_BIN ||
        'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
      const build = spawnSync(blender, ['-b', '--python-exit-code', '1', '--python',
        join(root, 'tools/blender/town-trucks-1.py'), '--', '--root', root, '--export-only',
        `--candidate-suffix=${candidateSuffix}`],
      { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(build.error, undefined, build.error?.message);
      assert.equal(build.status, 0, `truck candidate build failed: ${(build.stderr || build.stdout || '').slice(-4000)}`);
      assert.ok(existsSync(modelPath), 'fresh truck candidate build must produce the GLB before readback');
    const bytes = readFileSync(modelPath);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 8_000_000, `${bytes.length} bytes exceeds 8 MB`);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    const names = gltf.nodes.map(node => node.name || '');
    for (const name of ['town-trucks-1', 'fire-truck', 'water-tanker', 'supply-truck', 'tow-rig',
      'fire-truck:cannon', 'supply-truck:load', 'tow-rig:hook',
      'fire-truck:spin-front-left', 'fire-truck:steer-front-left',
      'fire-truck:lamp', 'water-tanker:lamp', 'supply-truck:lamp', 'tow-rig:lamp']) {
      assert.ok(names.includes(name), `missing named truck part ${name}`);
    }
    const parentByIndex = new Map();
    gltf.nodes.forEach((node, parent) => (node.children || []).forEach(child => parentByIndex.set(child, parent)));
    const byName = new Map(names.map((name, index) => [name, index]));
    const lampMaterial = gltf.materials.find(material => material.name === 'Aged amber lamp lens');
    assert.ok(lampMaterial?.emissiveFactor?.some(value => value > 0), 'lamp lens material must emit light');
    for (const id of ['fire-truck', 'water-tanker', 'supply-truck', 'tow-rig']) {
      const group = gltf.nodes[byName.get(`${id}:lamp`)];
      const children = (group.children || []).map(index => names[index]);
      assert.deepEqual(children.sort(), [`${id}:headlamp-left`, `${id}:headlamp-right`]);
    }
    assert.ok(gltf.images?.length >= 16, 'four measured photo views for each truck are embedded');
    assert.ok(gltf.images.every(image => image.mimeType === 'image/jpeg'), 'photo sources embed as JPEG');
    const materialNames = new Set(gltf.materials.map(material => material.name));
    for (const view of ['side','front','rear','overhead']) {
      assert.ok([...materialNames].some(name => name.includes(`fire-engine-${view}`)), `embedded ${view} photo material`);
    }
    const remainingPaints = gltf.materials.filter(material => material.name?.endsWith('/ photo paint'));
    assert.equal(remainingPaints.length, 0, 'the retired camera-projected truck paints are removed');
    for (const [stem, id] of [['tanker','water-tanker'],['supply','supply-truck'],['tow','tow-rig']]) {
      for (const view of ['side','front','rear','overhead']) {
        assert.ok(materialNames.has(`Photo / ${stem}-${view}`), `${id} measured ${view} picture material`);
      }
    }
    for (const material of gltf.materials) {
      assert.ok((material.pbrMetallicRoughness?.metallicFactor ?? 0) <= .3,
        `${material.name || 'material'} metallic factor exceeds 0.3`);
    }
    const jsonLength = bytes.readUInt32LE(12);
    const binaryOffset = 28 + jsonLength;
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const texCoords = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
      assert.deepEqual(texCoords, ['TEXCOORD_0'], `${mesh.name} has only TEXCOORD_0`);
      const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
      assert.ok(uv && uv.type === 'VEC2' && uv.componentType === 5126, 'UV coordinates are float pairs');
      const view = gltf.bufferViews[uv.bufferView], stride = view.byteStride ?? 8;
      const start = binaryOffset + (view.byteOffset ?? 0) + (uv.byteOffset ?? 0);
      const min=[Infinity,Infinity], max=[-Infinity,-Infinity];
      for (let i=0;i<uv.count;i++) for (let axis=0;axis<2;axis++) {
        const value=bytes.readFloatLE(start+i*stride+axis*4);
        min[axis]=Math.min(min[axis],value); max[axis]=Math.max(max[axis],value);
      }
      assert.ok(min[0]<max[0] && min[1]<max[1], `${mesh.name} UVs do not cover a range`);
    }
    const familyIndex = byName.get('town-trucks-1');
    const familyChildren = (gltf.nodes[familyIndex].children || []).map(index => names[index]);
    assert.deepEqual(familyChildren.sort(), ['fire-truck', 'supply-truck', 'tow-rig', 'water-tanker']);
    for (const id of ['fire-truck', 'water-tanker', 'supply-truck', 'tow-rig']) {
      for (const side of ['left', 'right']) {
        const spinName = `${id}:spin-front-${side}`;
        const steerName = `${id}:steer-front-${side}`;
        const spinIndex = byName.get(spinName);
        const steerIndex = byName.get(steerName);
        assert.ok(Number.isInteger(spinIndex) && Number.isInteger(steerIndex), `${id} ${side} steering pivots`);
        assert.equal(parentByIndex.get(spinIndex), steerIndex, `${spinName} follows its steering pivot`);
        const localPosition = gltf.nodes[spinIndex].translation || [0, 0, 0];
        assert.ok(localPosition.every(value => Math.abs(value) <= 0.001), `${spinName} stays at its steering pivot`);
      }
    }
    const countTruck = id => {
      let total = 0;
      const visit = index => {
        const node = gltf.nodes[index];
        if (Number.isInteger(node.mesh)) {
          total += gltf.meshes[node.mesh].primitives.reduce((sum, primitive) =>
            sum + gltf.accessors[primitive.indices].count / 3, 0);
        }
        for (const child of node.children || []) visit(child);
      };
      visit(byName.get(id));
      return total;
    };
    for (const id of ['fire-truck', 'water-tanker', 'supply-truck', 'tow-rig']) {
      const triangles = countTruck(id);
      assert.ok(triangles > 500 && triangles <= 12_000, `${id}: ${triangles} triangles`);
    }
    } finally {
      rmSync(modelPath, { force: true });
    }
  });
  check('TOWN-ART-TRUCKS-2 round 1 reads back the measured dozer, lifting blade and grounded wheel pivots', () => {
    const candidateSuffix = `-readback-${process.pid}-${randomUUID()}`;
    const modelPath = join(root, '.qa-dist/art-candidates', `town-trucks-2${candidateSuffix}.glb`);
    try {
      const blender = process.env.BLENDER_BIN ||
        'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
      const build = spawnSync(blender, ['-b', '--python-exit-code', '1', '--python',
        join(root, 'tools/blender/town-trucks-2.py'), '--', '--root', root, '--export-only',
        `--candidate-suffix=${candidateSuffix}`],
      { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(build.error, undefined, build.error?.message);
      assert.equal(build.status, 0, `dozer candidate build failed: ${(build.stderr || build.stdout || '').slice(-4000)}`);
      assert.ok(existsSync(modelPath), 'fresh dozer candidate build must produce the GLB before readback');
      const bytes = readFileSync(modelPath);
      assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      assert.ok(bytes.length <= 3_000_000, `${bytes.length} bytes exceeds 3 MB`);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      const names = gltf.nodes.map(node => node.name || '');
      for (const name of ['town-trucks-2', 'dozer', 'dozer:body', 'dozer:blade',
        'dozer:spin-front-left', 'dozer:steer-front-left', 'dozer:spin-front-right',
        'dozer:steer-front-right', 'dozer:spin-rear-left', 'dozer:spin-rear-right']) {
        assert.ok(names.includes(name), `missing dozer part ${name}`);
      }
      const familyIndex = names.indexOf('town-trucks-2');
      assert.deepEqual((gltf.nodes[familyIndex].children || []).map(index => names[index]), ['dozer'],
        'one complete vehicle is the only direct child in this first round');
      const bladeIndex = names.indexOf('dozer:blade');
      const bladeChildren = gltf.nodes[bladeIndex].children || [];
      assert.ok(bladeChildren.some(index => names[index].includes(':blade:curved-welded-face')),
        'lifting blade pivot owns its curved photo-painted face');
      const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
        .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
      assert.ok(triangles > 1000 && triangles <= 12000, `${triangles} triangles`);
      assert.ok(gltf.images?.length >= 4, 'all four measured photo views are embedded');
      assert.ok(gltf.images.every(image => image.mimeType === 'image/jpeg'), 'photo sources embed as JPEG');
      for (const material of gltf.materials) {
        assert.ok((material.pbrMetallicRoughness?.metallicFactor ?? 0) <= .3,
          `${material.name || 'material'} metallic factor exceeds 0.3`);
      }
      const parentByIndex = new Map();
      gltf.nodes.forEach((node, parent) => (node.children || []).forEach(child => parentByIndex.set(child, parent)));
      for (const side of ['left', 'right']) {
        const spin = names.indexOf(`dozer:spin-front-${side}`);
        const steer = names.indexOf(`dozer:steer-front-${side}`);
        assert.equal(parentByIndex.get(spin), steer, 'front wheel spin follows the steering pivot');
        assert.ok((gltf.nodes[spin].translation || [0,0,0]).every(value => Math.abs(value) <= .001),
          'front wheel stays centered on its steering pivot');
      }
      const binaryOffset = 28 + bytes.readUInt32LE(12);
      for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        const coordinates = Object.keys(primitive.attributes).filter(name => name.startsWith('TEXCOORD_'));
        assert.deepEqual(coordinates, ['TEXCOORD_0'], `${mesh.name} has only TEXCOORD_0`);
        const uv = gltf.accessors[primitive.attributes.TEXCOORD_0];
        assert.ok(uv?.count, `${mesh.name} has picture coordinates`);
        const view = gltf.bufferViews[uv.bufferView];
        const start = binaryOffset + (view.byteOffset || 0) + (uv.byteOffset || 0);
        const stride = view.byteStride || 8;
        const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
        for (let i=0;i<uv.count;i++) for (let axis=0;axis<2;axis++) {
          const value = bytes.readFloatLE(start + i*stride + axis*4);
          min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
        }
        assert.ok(min[0] < max[0] && min[1] < max[1], `${mesh.name} UVs have a range`);
      }
    } finally {
      rmSync(modelPath, { force: true });
    }
  });
  check('scablands-tintown exports its bounded named walkable town model', () => {
    const path = join(root, 'public/assets/models/wasteland/scablands/tintown.glb');
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 2500000, `${bytes.length} bytes exceeds 2.5 MB`);
    const length = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 300 && triangles <= 60000, `${triangles} triangles`);
    const names = gltf.nodes.map(node => node.name);
    assert.ok(names.includes('tintown-root'), 'named root empty');
    for (const id of [1, 2, 3]) {
      assert.ok(names.includes(`forge-lamp-${id}-glass-lit`), `lit forge lamp ${id}`);
      assert.ok(names.includes(`forge-lamp-${id}-glass-unlit`), `unlit forge lamp ${id}`);
    }
    for (const alley of ['main-alley','cross-alley','forge-court']) {
      assert.ok(names.includes(`walkable-ground-${alley}-collision`), `${alley} collision box`);
    }
  });

  check('TOWN-ART-HOMES exports separate compact material pictures, named homes and per-plot budgets', () => {
    const path=join(root,'public/assets/models/wasteland/town/homes.glb');const bytes=readFileSync(path);
    assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
    assert.ok(bytes.length<=3_000_000,`${bytes.length} bytes exceeds 3 MB`);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));const nodes=gltf.nodes||[];
      const imageIndexes=(gltf.textures||[]).map(texture=>texture.source);
      assert.ok(gltf.images?.length>1,'separate pictures replace the shared atlas');
      assert.equal(new Set(imageIndexes).size,imageIndexes.length,'materials do not sample a shared atlas image');
      assert.equal(gltf.images.length,imageIndexes.length,'every material picture resolves to its own image');
      assert.ok(gltf.images.every(image=>image.mimeType==='image/jpeg'),'material pictures use JPEG');
      const binStart=28+bytes.readUInt32LE(12);let texturePixels=0;
      for(const image of gltf.images){
        const view=gltf.bufferViews[image.bufferView];const start=binStart+(view.byteOffset||0);let width=0,height=0,offset=start+2;
        while(offset+9<start+view.byteLength){
          if(bytes[offset]!==0xff){offset++;continue;}
          const marker=bytes[offset+1];const length=bytes.readUInt16BE(offset+2);
          if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
            height=bytes.readUInt16BE(offset+5);width=bytes.readUInt16BE(offset+7);break;
          }
          if(length<2)break;offset+=2+length;
        }
        assert.ok(width>0&&height>0&&width<=256&&height<=256,`${width}x${height} material exceeds 256 px`);
        texturePixels+=width*height;
      }
      assert.ok(texturePixels<=1024*1024,`${texturePixels} total texture pixels exceed the 1K atlas budget`);
      for(const material of gltf.materials){
        const metallic=material.pbrMetallicRoughness?.metallicFactor??0;
        assert.ok(metallic<=.3,`${material.name} metallic factor ${metallic} exceeds .3`);
      }
    const names=nodes.map(node=>node.name||'');assert.ok(names.includes('town-homes'),'named family root');
    const ids=['tent-a','tent-b','shack-a','shack-b','shack-c','stack-a','stack-b','block-a','block-b','terrace-a'];
    const parent=new Map();nodes.forEach((node,index)=>(node.children||[]).forEach(child=>parent.set(child,index)));
    const find=id=>nodes.findIndex(node=>node.name===id);const familyRoot=find('town-homes');
    for(const id of ids){
      const home=find(id),lamp=find(`${id}:lamp`);assert.ok(home>=0,`missing ${id}`);assert.ok(lamp>=0,`missing named lamp ${id}`);
      assert.equal(parent.get(home),familyRoot,`${id} must be a direct family child`);assert.equal(parent.get(lamp),home,`${id}:lamp must be a direct home child`);
      const descendants=[];const visit=index=>{descendants.push(index);for(const child of nodes[index].children||[])visit(child);};visit(home);
      const triangles=descendants.reduce((sum,index)=>{const mesh=nodes[index].mesh;if(mesh===undefined)return sum;return sum+gltf.meshes[mesh].primitives.reduce((n,primitive)=>n+gltf.accessors[primitive.indices].count/3,0);},0);
      const budget=id.startsWith('block-')||id==='terrace-a'?5000:1800;
      assert.ok(triangles>100&&triangles<=budget,`${id}: ${triangles} triangles exceeds its ${budget} plot budget`);
    }
  });

  check('Scablands kit candidate stays inside its triangle and file budgets with named prop parts', () => {
    const bytes = readFileSync(join(root, 'public/assets/models/wasteland/scablands/kit.glb'));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 1_500_000, `${bytes.length} bytes`);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 0 && triangles <= 30_000, `${triangles} triangles`);
    const names = gltf.nodes.map(node => node.name || '');
    for (const part of ['scablands-kit', 'basalt-rock-1', 'basalt-cliff-face-1', 'sign-post',
      'sign-painted-ash-road', 'sign-painted-well-6', 'mast-leg', 'yard-lamp-glass-1',
      'barricade-whole-salvage-slat', 'barricade-whole-ballast-tyre',
      'barricade-burnt-salvage-slat', 'ember-pot-drum', 'side-job-flag-weathered-cloth']) {
      assert.ok(names.includes(part), `missing named prop part ${part}`);
    }
  });

  check('WW-ART-EVERBURN exports a bounded well with selectable capped and burning parts', () => {
    const path = join(root, 'public/assets/models/wasteland/scablands/everburn.glb');
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 1024 * 1024, `${bytes.length} bytes exceeds 1 MB`);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 500 && triangles <= 20000, `${triangles} triangles`);
    const names = gltf.nodes.map(node => node.name);
    for (const part of ['everburn-root', 'everburn-hand-wheel', 'everburn-cap-plate',
      'everburn-flame-outer', 'everburn-flame-core', 'everburn-flare-stack']) {
      assert.ok(names.includes(part), `missing named part ${part}`);
    }
    const materials = gltf.materials.map(item => item.name);
    for (const name of ['everburn-flame-orange', 'everburn-flame-core', 'everburn-ash-men-cap']) {
      assert.ok(materials.includes(name), `missing state material ${name}`);
    }
  });

  check('Bowl stadium GLB stays under its triangle and file budgets with named scene parts', () => {
    const path = join(root, 'public/assets/models/wasteland/bowl/stadium.glb');
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length <= 3_000_000, `${bytes.length} bytes exceeds the 3 MB target`);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 10_000 && triangles <= 80_000, `${triangles} triangles`);
    const names = new Set(gltf.nodes.map(node => node.name));
    for (const part of ['bowl-stadium', 'bowl-dirt-floor', 'bowl-concrete-terraces', 'bowl-scoreboard-frame',
      'bowl-podium-welded-cap', 'bowl-ramp-0-flame-jet-housings', 'bowl-floodlight-1-24-legs']) {
      assert.ok(names.has(part), `missing named stadium part ${part}`);
    }
  });

  check('Bowl crush GLB stays within its 20,000-triangle and 1 MB card budget', () => {
    const bytes = readFileSync(join(root, 'public/assets/models/wasteland/bowl/crush.glb'));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'valid GLB header');
    assert.ok(bytes.length <= 1_000_000, `${bytes.length} bytes`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trim());
    const triangles = (gltf.meshes || []).flatMap(mesh => mesh.primitives || [])
      .reduce((sum, primitive) => sum + (gltf.accessors[primitive.indices]?.count || 0) / 3, 0);
    assert.ok(triangles > 100 && triangles <= 20_000, `${triangles} triangles`);
  });

  for (const generator of kitGenerators) check(generator.script + ' plans exact kit/evidence homes without Blender, donor reads or writes', () => {
    const plans = fixtureRoots.map(fixtureRoot => kitPathPlan(generator, fixtureRoot));
    assert.deepEqual(plans[0], plans[1], 'same KITS recipe changed relative paths between roots');
    fixtureRoots.forEach(fixtureRoot => assert.deepEqual(readdirSync(fixtureRoot), [], 'planning created files'));
  });

  check('beaver plans only its exact private unfitted GLB, PNG and manifest on both empty roots', () => {
    const relativePlans = fixtureRoots.map(fixtureRoot => {
      const output = join(fixtureRoot, '.qa-dist', 'beaver-private');
      const call = beaverPlanCall(fixtureRoot, output);
      assert.equal(call.status, 0, call.stderr || call.stdout);
      const plan = JSON.parse(call.stdout);
      assert.deepEqual(plan, {blend: [], glb: [join(output, 'beaver-source-unfitted.glb')],
        json: [join(output, 'manifest.json')], atlas: [join(output, 'beaver-colour.png')], evidence: [], summary: []});
      const outputs = [...plan.glb, ...plan.json, ...plan.atlas];
      assert.equal(new Set(outputs).size, 3, 'private model, image and manifest destinations are distinct');
      assert.deepEqual(readdirSync(fixtureRoot), [], 'actual planning created no files or directories');
      return outputs.map(path => relative(fixtureRoot, path).split(sep).join('/'));
    });
    assert.deepEqual(relativePlans[0], relativePlans[1], 'beaver relative outputs are independent of planning root');
  });
  check('beaver permits its same exact private evidence paths without source/config reads', () => {
    const output = join(fixtureRoots[0], '.evidence', 'beaver-private');
    const call = beaverPlanCall(fixtureRoots[0], output);
    assert.equal(call.status, 0, call.stderr || call.stdout);
    assert.deepEqual(JSON.parse(call.stdout), {blend: [], glb: [join(output, 'beaver-source-unfitted.glb')],
      json: [join(output, 'manifest.json')], atlas: [join(output, 'beaver-colour.png')], evidence: [], summary: []});
  });
  check('beaver refuses an unavailable animal before source/config reads or Blender imports', () => {
    const call = beaverPlanCall(fixtureRoots[0], join(fixtureRoots[0], '.qa-dist', 'beaver-private'), 'moose');
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '', 'unavailable animal cannot claim a model plan');
    assert.match(call.stderr, /invalid choice.*moose/i);
  });
  for (const [label, output] of [
    ['public runtime output', join(fixtureRoots[0], 'public', 'assets', 'wildlife', 'beaver')],
    ['another planning root', join(fixtureRoots[1], '.qa-dist', 'beaver-private')],
    ['traversal into public', join(fixtureRoots[0], '.qa-dist') + sep + '..' + sep + 'public' + sep + 'beaver'],
    ['a private-looking sibling', join(fixtureRoots[0], '.qa-dist-other', 'beaver')],
  ]) check('beaver refuses ' + label + ' before input reads or writes', () => {
    const call = beaverPlanCall(fixtureRoots[0], output);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '', 'unsafe output cannot claim a valid plan');
    assert.match(call.stderr, /private child|supplied root/i);
    assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'rejected plan changed the other root');
  });
  check('beaver refuses a linked private-directory escape without touching its target', () => {
    const privateRoot = join(fixtureRoots[0], '.qa-dist'), link = join(privateRoot, 'linked-beaver');
    mkdirSync(privateRoot);
    symlinkSync(fixtureRoots[1], link, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      const call = beaverPlanCall(fixtureRoots[0], join(link, 'beaver-private'));
      assert.notEqual(call.status, 0);
      assert.equal(call.stdout.trim(), '');
      assert.match(call.stderr, /private child|supplied root/i);
      assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'linked planning changed its target');
    } finally {
      assert.ok(lstatSync(link).isSymbolicLink(), 'fixture link unexpectedly changed');
      unlinkSync(link);
      rmdirSync(privateRoot);
    }
  });
  check('beaver view-only plans six source-axis pictures and one inspection manifest on both empty roots', () => {
    const names = ['plus-x', 'minus-x', 'plus-z', 'minus-z', 'plus-y', 'minus-y'];
    const plans = fixtureRoots.map(fixtureRoot => {
      const output = join(fixtureRoot, '.qa-dist', 'beaver-source-views');
      const call = beaverPlanCall(fixtureRoot, output, 'beaver', true);
      assert.equal(call.status, 0, call.stderr || call.stdout);
      const plan = JSON.parse(call.stdout);
      assert.deepEqual(plan, {blend: [], glb: [], json: [join(output, 'inspection-manifest.json')],
        atlas: [], evidence: names.map(name => join(output, name + '.png')), summary: []});
      const outputs = [...plan.json, ...plan.evidence];
      assert.equal(new Set(outputs).size, 7, 'source views never export models, atlases or Blend files');
      assert.deepEqual(readdirSync(fixtureRoot), [], 'view planning created no files or directories');
      return outputs.map(path => relative(fixtureRoot, path).split(sep).join('/'));
    });
    assert.deepEqual(plans[0], plans[1], 'source view paths do not depend on the empty fixture root');
  });
  check('beaver view-only can plan only the two cropped source views on both empty roots', () => {
    const plans = fixtureRoots.map(fixtureRoot => {
      const output = join(fixtureRoot, '.qa-dist', 'beaver-top-underside');
      const call = beaverPlanCall(fixtureRoot, output, 'beaver', true, ['plus-y', 'minus-y']);
      assert.equal(call.status, 0, call.stderr || call.stdout);
      const plan = JSON.parse(call.stdout);
      assert.deepEqual(plan, {blend: [], glb: [], json: [join(output, 'inspection-manifest.json')],
        atlas: [], evidence: [join(output, 'plus-y.png'), join(output, 'minus-y.png')], summary: []});
      assert.deepEqual(readdirSync(fixtureRoot), [], 'selected view planning created no output');
      return [...plan.json, ...plan.evidence].map(path => relative(fixtureRoot, path).split(sep).join('/'));
    });
    assert.deepEqual(plans[0], plans[1], 'selected view output stays independent of fixture root');
  });
  for (const [label, viewOnly, views, message] of [
    ['without view-only', false, ['plus-y'], /source-view.*view-only/i],
    ['duplicate view', true, ['plus-y', 'plus-y'], /duplicate.*source-view/i],
    ['unknown view', true, ['front'], /invalid choice.*front/i],
  ]) check('beaver rejects source-view ' + label + ' before inputs, Blender imports or writes', () => {
    const call = beaverPlanCall(fixtureRoots[0], join(fixtureRoots[0], '.qa-dist', 'beaver-selected'),
      'beaver', viewOnly, views);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '');
    assert.match(call.stderr, message);
  });
  check('beaver fit-only plans one private fitted GLB and measured manifest without reading either donor', () => {
    const plans = fixtureRoots.map(fixtureRoot => {
      const output = join(fixtureRoot, '.qa-dist', 'beaver-fit');
      const call = beaverPlanCall(fixtureRoot, output, 'beaver', false, [], true);
      assert.equal(call.status, 0, call.stderr || call.stdout);
      const plan = JSON.parse(call.stdout);
      assert.deepEqual(plan, {blend: [], glb: [join(output, 'beaver-source-fitted.glb')],
        json: [join(output, 'fit-manifest.json')], atlas: [], evidence: [], summary: []});
      assert.deepEqual(readdirSync(fixtureRoot), [], 'fit planning created no files or directories');
      return [...plan.glb, ...plan.json].map(path => relative(fixtureRoot, path).split(sep).join('/'));
    });
    assert.deepEqual(plans[0], plans[1], 'private fit plan is independent of fixture root');
  });
  for (const [label, viewOnly, views, model, message] of [
    ['combined with view-only', true, [], 'beaver', /fit-only.*exclusive/i],
    ['combined with source-view', false, ['plus-y'], 'beaver', /fit-only.*exclusive/i],
    ['unknown animal', false, [], 'moose', /invalid choice.*moose/i],
  ]) check('beaver fit-only rejects ' + label + ' before reads, imports or writes', () => {
    const call = beaverPlanCall(fixtureRoots[0], join(fixtureRoots[0], '.qa-dist', 'beaver-fit'),
      model, viewOnly, views, true);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '');
    assert.match(call.stderr, message);
  });
  for (const [label, output] of [
    ['public output', join(fixtureRoots[0], 'public', 'beaver-fit')],
    ['another root', join(fixtureRoots[1], '.qa-dist', 'beaver-fit')],
    ['traversal', join(fixtureRoots[0], '.qa-dist') + sep + '..' + sep + 'public' + sep + 'beaver-fit'],
    ['private-looking sibling', join(fixtureRoots[0], '.qa-dist-other', 'beaver-fit')],
  ]) check('beaver fit-only rejects ' + label + ' before donor reads or writes', () => {
    const call = beaverPlanCall(fixtureRoots[0], output, 'beaver', false, [], true);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '');
    assert.match(call.stderr, /private child|supplied root/i);
  });
  check('beaver fit-only refuses a linked private-directory escape', () => {
    const privateRoot = join(fixtureRoots[0], '.qa-dist'), link = join(privateRoot, 'linked-beaver-fit');
    mkdirSync(privateRoot);
    symlinkSync(fixtureRoots[1], link, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      const call = beaverPlanCall(fixtureRoots[0], join(link, 'fit'), 'beaver', false, [], true);
      assert.notEqual(call.status, 0);
      assert.equal(call.stdout.trim(), '');
      assert.match(call.stderr, /private child|supplied root/i);
      assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'linked fit planning changed its target');
    } finally {
      assert.ok(lstatSync(link).isSymbolicLink(), 'fit fixture link unexpectedly changed');
      unlinkSync(link);
      rmdirSync(privateRoot);
    }
  });
  check('beaver view-only refuses another animal before donor reads or Blender imports', () => {
    const call = beaverPlanCall(fixtureRoots[0], join(fixtureRoots[0], '.qa-dist', 'beaver-views'), 'moose', true);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '');
    assert.match(call.stderr, /invalid choice.*moose/i);
  });
  for (const [label, output] of [
    ['public output', join(fixtureRoots[0], 'public', 'beaver-views')],
    ['another root', join(fixtureRoots[1], '.qa-dist', 'beaver-views')],
    ['traversal', join(fixtureRoots[0], '.qa-dist') + sep + '..' + sep + 'public' + sep + 'beaver-views'],
    ['private-looking sibling', join(fixtureRoots[0], '.qa-dist-other', 'beaver-views')],
  ]) check('beaver view-only rejects ' + label + ' before input reads or writes', () => {
    const call = beaverPlanCall(fixtureRoots[0], output, 'beaver', true);
    assert.notEqual(call.status, 0);
    assert.equal(call.stdout.trim(), '');
    assert.match(call.stderr, /private child|supplied root/i);
    assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'rejected view plan changed another root');
  });
  check('beaver view-only refuses a linked private-directory escape', () => {
    const privateRoot = join(fixtureRoots[0], '.qa-dist'), link = join(privateRoot, 'linked-beaver-view');
    mkdirSync(privateRoot);
    symlinkSync(fixtureRoots[1], link, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      const call = beaverPlanCall(fixtureRoots[0], join(link, 'views'), 'beaver', true);
      assert.notEqual(call.status, 0);
      assert.equal(call.stdout.trim(), '');
      assert.match(call.stderr, /private child|supplied root/i);
      assert.deepEqual(readdirSync(fixtureRoots[1]), [], 'linked view planning changed its target');
    } finally {
      assert.ok(lstatSync(link).isSymbolicLink(), 'view fixture link unexpectedly changed');
      unlinkSync(link);
      rmdirSync(privateRoot);
    }
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

check('BOWL-ART-TRUCKS GLB meets its five-rival file and triangle budgets', () => {
  const path = join(root, 'public/assets/models/wasteland/bowl/trucks.glb');
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= 1024 * 1024, `GLB is ${bytes.length} bytes; budget is 1 MB`);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  const parts = new Map();
  for (const node of gltf.nodes) {
    const rival = node.name?.split('-').slice(0, 2).join('-');
    if (!['rust-rhino','big-kettle','tin-lizard','old-bess','dragon-wagon'].includes(rival) || node.mesh === undefined) continue;
    const tris = gltf.meshes[node.mesh].primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
    parts.set(rival, (parts.get(rival) || 0) + tris);
  }
  assert.deepEqual([...parts.keys()].sort(), ['big-kettle','dragon-wagon','old-bess','rust-rhino','tin-lizard']);
  for (const [name, triangles] of parts) assert.ok(triangles > 0 && triangles <= 8000, `${name}: ${triangles} triangles`);
});

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
