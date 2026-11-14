// EVERBURN-PLAY-FIXES, part B: where things start and where the camera stands.
//  1. The start check: for all six jobs, both gas runs and the battle, the car starts 3 m clear of every solid and so does the camera's place
//     behind it, and it starts where and facing the way the card says.
//  2. Job 5's "Leave the car outside" is heard before the mall is reached; job 4 says its own result line.
//  3. Job 6's raiders: none appears within 60 m of the car, the first wave comes after Cinder's opening line, and no raider is left when
//     the defence ends.
//  4. The camera rule (src/world-job-camera.js) and the boxes it reads (src/world/scablands-scene.js).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {GAS_RUN_START_BEHIND_METRES, fieldBattleJob, gasRunJob} from '../src/world/jobs/gas-run.js';
import {ESCORT_START_BEHIND_METRES, ESCORT_START_RIGHT_METRES} from '../src/world/jobs/steps/escort.js';
import {BIG_MACHINE_BOXES, SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {scablandsRoadDistance} from '../src/world/scablands-ground.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {facingChaseView, insideMachine, machineLift, easeMachineLift, machineLookBlend, MACHINE_CLEARANCE_METRES} from '../src/world-job-camera.js';
import '../src/story/ember-lines.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const near = (a, b, tolerance, message) => check(Math.abs(a - b) <= tolerance, `${message} (got ${a}, wanted ${b})`);

// ---- 1. The start check -------------------------------------------------------------------------------------------------------------
const CHASE_BACK = 8.7; // the chase camera's own distance behind the car (src/render3d.js)
// Tin Town's own model (its footprint is 582.5 to 615.4 by -16.4 to 15.1, read from the model) and the gate's fence line (62 m north
// of the town's centre, src/world/tin-town-shacks.js OFF_LIMITS) are drawn but are not in the solids list, so they are checked here too.
const DRAWN = [{id: 'tin-town-model', x0: 582.5, x1: 615.4, z0: -16.4, z1: 15.1}, {id: 'tin-town-gate-fence', x0: 553, x1: 597, z0: 58, z1: 66}];
const boxGap = (x, z, x0, x1, z0, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
function clearance(x, z) {
  let worst = {gap: Infinity, id: ''};
  for (const solid of SCABLANDS_SOLIDS) {
    const [cx, , cz] = solid.center, [width, , depth] = solid.size, gap = boxGap(x, z, cx - width / 2, cx + width / 2, cz - depth / 2, cz + depth / 2);
    if (gap < worst.gap) worst = {gap, id: solid.id};
  }
  for (const box of DRAWN) { const gap = boxGap(x, z, box.x0, box.x1, box.z0, box.z1); if (gap < worst.gap) worst = {gap, id: box.id}; }
  return worst;
}
function start(job, options = {}) {
  const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 1, opponents: [], job, ...options}), true);
  return duel;
}
function carAt(duel) {
  const state = duel.state, at = duel.course.worldAt(state.s, state.lateral), heading = duel.course.at(state.s).heading + state.headingError;
  return {x: at.x, z: at.z, heading, forward: {x: Math.sin(heading), z: Math.cos(heading)}};
}
const facingAngle = (car, toward) => Math.acos(Math.max(-1, Math.min(1, car.forward.x * (toward.x - car.x) / Math.hypot(toward.x - car.x, toward.z - car.z) +
  car.forward.z * (toward.z - car.z) / Math.hypot(toward.x - car.x, toward.z - car.z))));
const at = place => place.position ?? place;

const starts = [
  ...EVERBURN_JOBS.map(job => [`job ${job.number}, ${job.name}`, job]),
  ['gas run, long road', gasRunJob({road: 'long'})], ['gas run, Boneyard road', gasRunJob({road: 'boneyard'})],
  ['the battle on the Boneyard road', fieldBattleJob()],
  // The notice board's three jobs start the same way (go-live, 13 November 2026).
  ...EVERBURN_SIDE_JOBS.map(job => [`side job, ${job.name}`, job]),
];
for (const [name, job] of starts) {
  const duel = start(job), car = carAt(duel);
  const camera = {x: car.x - car.forward.x * CHASE_BACK, z: car.z - car.forward.z * CHASE_BACK};
  const underCar = clearance(car.x, car.z), underCamera = clearance(camera.x, camera.z);
  check(underCar.gap >= 3, `${name}: the car starts at least 3 m clear of every solid (${underCar.gap.toFixed(1)} m from ${underCar.id})`);
  check(underCamera.gap >= 3, `${name}: the camera's place behind it is at least 3 m clear too (${underCamera.gap.toFixed(1)} m from ${underCamera.id})`);
  // No junk car lies within 40 m ahead of the car's nose, in the direction it faces (the Scablands road carries pairs of them, and a car driven
  // straight at one stops against it). New in the go-live round; every start is held to it.
  const junkAhead = duel.course.features.crushables.filter(junk => junk.kind === 'junkCar').map(junk => {
    const dx = junk.x - car.x, dz = junk.z - car.z;
    return {id: junk.id, distance: Math.hypot(dx, dz), ahead: dx * car.forward.x + dz * car.forward.z};
  }).filter(junk => junk.distance < 40 && junk.ahead > 0);
  check(junkAhead.length === 0, `${name}: no junk car within 40 m ahead of the car's nose (${junkAhead.map(junk => `${junk.id} at ${junk.distance.toFixed(0)} m`).join(', ') || 'none'})`);
  console.log(`${name}: car at (${car.x.toFixed(1)}, ${car.z.toFixed(1)}) ${underCar.gap.toFixed(1)} m clear; camera ${underCamera.gap.toFixed(1)} m clear`);
  const step = job.steps[0];
  // Where a named start is, the car is there to the centimetre (a start is a point on the ground, not a place on the oval).
  if (step.carStart) {
    near(car.x, step.carStart.x, .05, `${name}: the car starts where the step says (x)`);
    near(car.z, step.carStart.z, .05, `${name}: the car starts where the step says (z)`);
    near(facingAngle(car, {x: car.x + Math.sin(step.carStart.heading), z: car.z + Math.cos(step.carStart.heading)}), 0, .001, `${name}: the car faces the way the step says`);
  }
  // An escort starts beside what it escorts: behind her and to her right, facing along her road. Her own start is where her road
  // begins, or the start the actor names (the gas roads and the battle begin inside the well's box, so she starts down the road).
  if (step.kind === 'escort') {
    const truckStart = step.actor?.start ? at(step.actor.start) : at(step.path[0]);
    const from = truckStart, to = at(step.path[1]), length = Math.hypot(to.x - from.x, to.z - from.z);
    const forward = {x: (to.x - from.x) / length, z: (to.z - from.z) / length}, right = {x: -forward.z, z: forward.x};
    const along = (car.x - from.x) * forward.x + (car.z - from.z) * forward.z, across = (car.x - from.x) * right.x + (car.z - from.z) * right.z;
    const behind = job.run === true ? GAS_RUN_START_BEHIND_METRES : ESCORT_START_BEHIND_METRES;
    near(-along, behind, .15, `${name}: the car starts ${behind} m behind Big Bess`);
    near(across, ESCORT_START_RIGHT_METRES, .15, `${name}: the car starts ${ESCORT_START_RIGHT_METRES} m to her right`);
    check(facingAngle(car, {x: car.x + forward.x, z: car.z + forward.z}) < .001, `${name}: the car faces along her road`);
    // Big Bess herself starts clear of every solid: every point of her outline (her box, read from her model) is at least 3 m from each.
    const box = BIG_MACHINE_BOXES['big-bess'];
    let tightest = {gap: Infinity, id: ''};
    for (let side = -1; side <= 1; side++) for (let step4 = 0; step4 <= 4; step4++) {
      const u = side * box.halfX, v = box.minZ + (box.maxZ - box.minZ) * step4 / 4;
      const point = clearance(from.x + forward.x * v + right.x * u, from.z + forward.z * v + right.z * u);
      if (point.gap < tightest.gap) tightest = point;
    }
    check(tightest.gap >= 3, `${name}: Big Bess starts at least 3 m clear of every solid (${tightest.gap.toFixed(1)} m from ${tightest.id})`);
    // And on her road: her start lies on the road's first piece, and the piece is the one she is facing along.
    const first = at(step.path[0]);
    const onRoad = Math.abs((from.x - first.x) * forward.z - (from.z - first.z) * forward.x) < .06 && (from.x - first.x) * forward.x + (from.z - first.z) * forward.z >= -.06;
    check(onRoad, `${name}: Big Bess starts on her road`);
  }
}
{
  // Job 2 starts inside Tin Town's gate on open ground, facing the forge. Job 5 starts on the road 124 m short of the Dead Mall, facing it:
  // it was 150 m, 9 m behind a pair of junk cars on the road; the new start is past them (the go-live round).
  const job2 = start(EVERBURN_JOBS[1]), car2 = carAt(job2), forge = at(EVERBURN_JOBS[1].steps[0].places[0]);
  check(car2.z < 62 && car2.z > 25 && Math.abs(car2.x - 575) < 20, 'job 2: the car is inside Tin Town, just in from the gate');
  check(facingAngle(car2, {x: 625, z: 14}) < .02, 'job 2: the car faces the forge');
  check(Math.hypot(forge.x - car2.x, forge.z - car2.z) > 40, 'job 2: the first lamp is a walk from the car');
  const job5 = start(EVERBURN_JOBS[4]), car5 = carAt(job5), mall = {x: 0, z: 430};
  near(Math.hypot(car5.x - mall.x, car5.z - mall.z), 124, 2, 'job 5: the car starts 124 m short of the Dead Mall, past the junk cars on the road');
  check(scablandsRoadDistance(car5.x, car5.z) < 1, 'job 5: the car starts on the road');
  check(facingAngle(car5, mall) < .02, 'job 5: the car faces the Dead Mall');
  // Cinder's "Leave the car outside" is Cinder's start line, heard at once; her line for inside the mall waits until the car is within
  // 22 m of the valve room, and the car starts well outside that.
  const step5 = EVERBURN_JOBS[4].steps[0], cue = step5.sayNear[0];
  check(step5.startLineId === 'story.ember.cinder.11', 'job 5: the start line is "Leave the car outside"');
  check(Math.hypot(car5.x - cue.place.position.x, car5.z - cue.place.position.z) - cue.radius > 100, 'job 5: the mall\'s own line is not heard for the first 100 m');
  // Job 6: the derrick is straight ahead (the camera turns to the car's facing, part 4).
  const job6 = start(EVERBURN_JOBS[5]), car6 = carAt(job6);
  check(facingAngle(car6, at(EVERBURN_JOBS[5].steps[0].place)) < .01, 'job 6: the car faces the derrick');
  // Job 4 says its own result line when Big Bess is in Tin Town.
  const result = arenaResultsScreen({arena: {mode: 'world-job', result: {winnerId: 'player'}, worldJob: {definition: EVERBURN_JOBS[3]}}},
    {metric: () => '', action: () => '', escapeHTML: String});
  check(result.description === 'The gas is in Tin Town and the forge is lit.', 'job 4: the result line is the gas in Tin Town and the forge lit');
}

// ---- 3. Job 6's raiders ----------------------------------------------------------------------------------------------------------------
const raidersOf = duel => duel.state.arena.worldJob.actors.filter(actor => Number.isFinite(actor.x) && Number.isFinite(actor.z) && !actor.furnace);
const DT = 1 / 60;
function begin(job) {
  const duel = start(job);
  duel.state.countdown = 0;
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: false});
  duel.step(DT);
  return duel;
}
{
  // The first wave comes after Cinder's opening line (said at once, for 2.2 s) and none appears within 60 m of the car.
  const duel = begin(EVERBURN_JOBS[5]), car = carAt(duel);
  let firstRaider = null, lineAt = null;
  for (let tick = 0; tick < 6 * 60 && firstRaider === null; tick++) {
    duel.step(DT);
    if (lineAt === null && /Hold them off/.test(duel.state.callout ?? '')) lineAt = duel.state.stageTimeSec;
    if (raidersOf(duel).length) firstRaider = duel.state.stageTimeSec;
  }
  check(lineAt !== null && lineAt < .2, 'job 6: Cinder\'s opening line is said at once');
  check(firstRaider !== null && firstRaider >= lineAt + 2.2, `job 6: the first wave comes after the opening line (at ${firstRaider?.toFixed(2)} s)`);
  const closest = Math.min(...raidersOf(duel).map(raider => Math.hypot(raider.x - car.x, raider.z - car.z)));
  check(closest >= 60, `job 6: the first wave appears at least 60 m from the car (${closest.toFixed(1)} m)`);
  console.log(`job 6: first wave at ${firstRaider.toFixed(2)} s, ${closest.toFixed(1)} m from the car`);
}
{
  // Wherever the car stands, no wave appears within 60 m of it (the car at the well, at each place a wave may come from, and out on the flats).
  const well = {x: -424, z: 304}, spots = [well, {x: well.x, z: well.z + 64}, {x: well.x + 64, z: well.z}, {x: well.x, z: well.z - 64},
    {x: well.x - 64, z: well.z}, {x: well.x + 45, z: well.z + 45}, {x: well.x - 150, z: well.z + 20}, {x: 0, z: 0}];
  for (const spot of spots) {
    const duel = begin(EVERBURN_JOBS[5]), state = duel.state, pose = duel.course.nearest(spot.x, spot.z);
    state.s = state.prevS = pose.s; state.lateral = state.prevLateral = pose.lateral;
    for (let tick = 0; tick < 6 * 60 && !raidersOf(duel).length; tick++) duel.step(DT);
    const car = carAt(duel), closest = Math.min(...raidersOf(duel).map(raider => Math.hypot(raider.x - car.x, raider.z - car.z)));
    check(raidersOf(duel).length > 0 && closest >= 60, `job 6: with the car at (${spot.x}, ${spot.z}) the first wave appears ${closest.toFixed(1)} m away, at least 60`);
  }
}
{
  // Every wave, the second and third too, keeps 60 m from the car; and when the defence ends no raider is left, standing or not.
  const duel = begin(EVERBURN_JOBS[5]), worldJob = duel.state.arena.worldJob, seen = new Set();
  let closest = Infinity, left = null;
  for (let tick = 0; tick < 240 * 60 && worldJob.job.stepIndex === 0; tick++) {
    const car = carAt(duel), current = `0:${worldJob.job.stepState.wave ?? 0}`;
    for (const raider of raidersOf(duel)) {
      if (!seen.has(raider)) { seen.add(raider); closest = Math.min(closest, Math.hypot(raider.x - car.x, raider.z - car.z)); }
      // The raiders of the wave being fought are put down at once; those of earlier waves stand where they are, not walking in.
      if (worldJob.waveZones?.[current]?.raiders.includes(raider)) { raider.knockedDown = true; raider.knockdownRemaining = 99; } else raider.approachSpeed = 0;
    }
    duel.step(DT);
  }
  check(worldJob.job.stepIndex === 1, 'job 6: the three waves are cleared and the chase begins');
  check(seen.size >= 5, `job 6: the waves brought their raiders (${seen.size})`);
  check(closest >= 60, `job 6: every wave appeared at least 60 m from the car (${closest.toFixed(1)} m)`);
  left = raidersOf(duel).length;
  check(left === 0, `job 6: no raider is left at the well once the defence has ended (${left} left)`);
  check(!(duel.state.raids?.zones ?? []).some(zone => zone.raiders?.length), 'job 6: no raider camp is left to fire or warn');
  check(Object.keys(worldJob.waveZones ?? {}).length === 0, 'job 6: no wave is left on the books');
  console.log(`job 6: ${seen.size} raiders in all, the nearest wave ${closest.toFixed(1)} m from the car, ${left} left at the chase`);
}

// ---- 4. The camera ---------------------------------------------------------------------------------------------------------------------
{
  // The camera stands behind the car along the car's own facing, whichever way the oval runs.
  for (const heading of [0, 1, -2.4, 3.03]) {
    const view = facingChaseView({x: 100, y: 5, z: -40}, heading, {back: CHASE_BACK, height: 3.65});
    near(Math.hypot(view.position.x - 100, view.position.z + 40), CHASE_BACK, 1e-9, `facing ${heading}: the camera is 8.7 m from the car`);
    near((view.position.x - 100) * Math.sin(heading) + (view.position.z + 40) * Math.cos(heading), -CHASE_BACK, 1e-9, `facing ${heading}: and behind it`);
    near(view.position.y, 8.65, 1e-9, `facing ${heading}: and 3.65 m up`);
    near((view.target.x - 100) * Math.sin(heading) + (view.target.z + 40) * Math.cos(heading), 26, 1e-9, `facing ${heading}: it looks 26 m ahead of the car`);
  }
  // Job 6 at its first frame: the derrick is in the picture (inside a 55 degree half-angle of the camera's aim, and ahead of it).
  const duel = start(EVERBURN_JOBS[5]), car = carAt(duel), view = facingChaseView({x: car.x, y: 0, z: car.z}, car.heading, {back: CHASE_BACK, height: 3.65});
  const aim = Math.atan2(view.target.x - view.position.x, view.target.z - view.position.z), derrick = Math.atan2(-424 - view.position.x, 304 - view.position.z);
  check(Math.abs(Math.atan2(Math.sin(aim - derrick), Math.cos(aim - derrick))) < .2, 'job 6: the derrick is straight ahead of the camera at the first frame');
}
{
  // The rule: inside a machine's box plus 1 m the camera rises to 2 m above its top and looks down; outside it is untouched; with no machine nothing changes.
  const furnace = {id: 'old-smoke-furnace', x: 100, y: 3, z: 200, heading: .7, ...BIG_MACHINE_BOXES['old-smoke-furnace']};
  const bess = {id: 'big-bess', x: -50, y: 0, z: 20, heading: -2, ...BIG_MACHINE_BOXES['big-bess']};
  const world = (machine, across, along, up) => ({x: machine.x + across * Math.cos(machine.heading) + along * Math.sin(machine.heading), y: machine.y + up,
    z: machine.z - across * Math.sin(machine.heading) + along * Math.cos(machine.heading)});
  const top = machine => machine.y + machine.height;
  for (const machine of [furnace, bess]) {
    const middle = world(machine, 0, (machine.minZ + machine.maxZ) / 2, 2);
    check(insideMachine(machine, middle), `${machine.id}: a place in its middle is inside`);
    near(middle.y + machineLift(middle, [machine]), top(machine) + MACHINE_CLEARANCE_METRES, 1e-9, `${machine.id}: from the middle the camera rises to 2 m above its top`);
    for (const [label, across, along] of [['its side, 0.9 m out', machine.halfX + .9, 0], ['its rear, 0.9 m out', 0, machine.minZ - .9], ['its front, 0.9 m out', 0, machine.maxZ + .9]]) {
      const place = world(machine, across, along, 1.5);
      check(machineLift(place, [machine]) > 0, `${machine.id}: ${label} is still inside the box plus 1 m, so the camera rises`);
    }
    for (const [label, across, along, up] of [['its side, 1.1 m out', machine.halfX + 1.1, 0, 1.5], ['its rear, 1.1 m out', 0, machine.minZ - 1.1, 1.5],
      ['its front, 1.1 m out', 0, machine.maxZ + 1.1, 1.5], ['more than 1 m over its top', 0, 0, machine.height + 1.2]]) {
      check(machineLift(world(machine, across, along, up), [machine]) === 0, `${machine.id}: ${label} is clear, so the camera is untouched`);
    }
  }
  check(machineLift(world(furnace, 0, 0, 2), []) === 0 && machineLift(world(furnace, 0, 0, 2), undefined) === 0, 'with no machine in the job the camera does not change');
  check(machineLift(world(furnace, 0, 0, 2), [bess]) === 0, 'a place inside the furnace but far from Big Bess is untouched when only she is there');
  // Up at once, down smoothly: the lift stays above zero for some frames after the camera is clear, never rises on its own, and ends at zero.
  let lift = easeMachineLift(0, 4.5, 1 / 60);
  near(lift, 4.5, 1e-9, 'the camera rises at once');
  const frames = [];
  for (let frame = 0; frame < 120 && lift > 0; frame++) { const next = easeMachineLift(lift, 0, 1 / 60); check(next < lift, 'each frame lowers the camera'); lift = next; frames.push(lift); }
  check(frames.length > 20 && frames.length < 120 && lift === 0, `the camera comes down smoothly over ${frames.length} frames and ends on the ground`);
  check(frames[0] > 4, 'the first frame of the descent is a small step, not a drop');
  near(easeMachineLift(4.5, 2, 1 / 60), 4.5 + (2 - 4.5) * (1 - Math.exp(-3.5 / 60)), 1e-9, 'it eases toward a lower need as well');
  check(machineLookBlend(0) === 0 && machineLookBlend(1) === .5 && machineLookBlend(2) === 1 && machineLookBlend(9) === 1, 'the look turns down to the car as the camera rises');
}
{
  // The boxes are the models' own extents (the furnace is drawn 1.5 times its stored size), so the camera keeps out of what is drawn.
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'), THREE = await import('three');
  globalThis.self ??= globalThis;
  // The loader complains, after this test is done, that it has no picture for each texture; only those complaints are dropped.
  for (const name of ['warn', 'error', 'log']) { const keep = console[name]; console[name] = (...message) => { if (!/^THREE.GLTFLoader/.test(String(message[0]))) keep(...message); }; }
  {
    for (const [file, part, scale, id] of [['old-smoke', "Old Smoke's rolling furnace", 1.5, 'old-smoke-furnace'], ['big-bess', 'Big Bess gas truck', 1, 'big-bess']]) {
      const buffer = readFileSync(new URL(`../public/assets/models/wasteland/scablands/${file}.glb`, import.meta.url));
      const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '', resolve, reject));
      gltf.scene.updateMatrixWorld(true);
      let found = null; gltf.scene.traverse(node => { if (!found && node.name.replace(/_/g, ' ') === part) found = node; });
      const box = new THREE.Box3().setFromObject(found), mine = BIG_MACHINE_BOXES[id];
      check(mine.halfX >= Math.max(-box.min.x, box.max.x) * scale - .02 && mine.halfX <= Math.max(-box.min.x, box.max.x) * scale + .1, `${id}: the box's half width is the model's`);
      check(Math.abs(mine.minZ - box.min.z * scale) <= .1 && Math.abs(mine.maxZ - box.max.z * scale) <= .1, `${id}: the box's length is the model's`);
      check(Math.abs(mine.height - box.max.y * scale) <= .1, `${id}: the box's height is the model's`);
    }
  }
}
// ---- 5. Big Bess's start in a real job, and Tin Town's solid (EVERBURN-PLAY-FIXES, fourth round) -------------------------------------------
for (const [name, job] of starts.filter(([, job]) => job.steps[0].kind === 'escort')) {
  const duel = begin(job), worldJob = duel.state.arena.worldJob, step = job.steps[0];
  duel.step(DT); duel.step(DT); // the job puts her on the road in its second tick
  const truck = worldJob.actors.find(actor => actor.id === 'big-bess'), named = at(step.actor.start ?? step.path[0]);
  check(truck && Math.hypot(truck.position.x - named.x, truck.position.z - named.z) < .5, `${name}: the truck stands at her start in the real job`);
  check(truck.pathIndex === 1 || !step.actor.start && truck.pathIndex === undefined, `${name}: she sets off for the road's second place, never back to its first`);
  for (let tick = 0; tick < 120; tick++) duel.step(DT);
  const moved = Math.hypot(truck.position.x - named.x, truck.position.z - named.z), to = at(step.path[1]);
  check(moved > 15 && moved < 21 && Math.hypot(to.x - truck.position.x, to.z - truck.position.z) < Math.hypot(to.x - named.x, to.z - named.z),
    `${name}: two seconds on she has driven ${moved.toFixed(1)} m toward the second place (9 m a second)`);
}
{
  // The solid called tin-town-shell stands on the town as it is drawn: wholly inside the drawn model's footprint, round the place (600, 0).
  const shell = SCABLANDS_SOLIDS.find(solid => solid.id === 'tin-town-shell'), [cx, , cz] = shell.center, [width, , depth] = shell.size;
  const model = DRAWN[0];
  check(cx - width / 2 >= model.x0 && cx + width / 2 <= model.x1 && cz - depth / 2 >= model.z0 && cz + depth / 2 <= model.z1, 'the Tin Town solid lies inside the footprint of the drawn town');
  near(cx, 600, 1, 'the Tin Town solid is centred on the town (x)'); near(cz, 0, 1, 'the Tin Town solid is centred on the town (z)');
  // No job's start, car start, safe point or road comes inside it, except the places a job is meant to end at (the town's own centre for
  // job 1 and the roads, the notice board for Hot Soup), and those can be reached from outside it, the car's own half length (2.4 m) allowed.
  const jobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS, gasRunJob({road: 'long'}), gasRunJob({road: 'boneyard'}), fieldBattleJob()];
  const x0 = cx - width / 2, x1 = cx + width / 2, z0 = cz - depth / 2, z1 = cz + depth / 2;
  const inside = point => point.x > x0 && point.x < x1 && point.z > z0 && point.z < z1;
  const pieceGap = (a, b) => { let closest = Infinity; const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let metres = 0; metres <= length; metres += .25) closest = Math.min(closest, boxGap(a.x + (b.x - a.x) * metres / length, a.z + (b.z - a.z) * metres / length, x0, x1, z0, z1));
    return closest; };
  const townCentre = {x: 600, z: 0};
  for (const job of jobs) for (const step of job.steps) {
    for (const key of ['carStart', 'origin']) if (step[key]) check(!inside(at(step[key])), `${job.id}: its ${key} is outside the Tin Town solid`);
    for (const point of step.safePoints ?? []) check(!inside(at(point)), `${job.id}: its safe point is outside the Tin Town solid`);
    for (const point of step.places ?? []) check(!inside(at(point)), `${job.id}: its place ${point.id} is outside the Tin Town solid`);
    for (const key of ['path', 'returnPath']) {
      const points = (step[key] ?? []).map(at);
      points.forEach((point, index) => {
        if (index < points.length - 1 || !inside(point)) return;
        check(point.x === townCentre.x && point.z === townCentre.z, `${job.id}: a road may end inside the Tin Town solid only at the town's own centre`);
      });
      for (let piece = 1; piece < points.length; piece++) {
        const endsInTown = piece === points.length - 1 && inside(points[piece]);
        check(endsInTown || pieceGap(points[piece - 1], points[piece]) >= 8, `${job.id}: ${key} piece ${piece} keeps 8 m from the Tin Town solid unless it ends in the town`);
      }
    }
    if (step.destination && inside(at(step.destination))) {
      const goal = at(step.destination), radius = step.destination.radius ?? step.radius;
      check(boxGap(goal.x, goal.z, x0, x1, z0, z1) === 0 && Math.min(goal.x - x0, x1 - goal.x, goal.z - z0, z1 - goal.z) <= radius - 2.4,
        `${job.id}: its goal inside the town can be reached from the edge of the solid (${radius} m, the car's half length allowed)`);
    }
  }
}
console.log(`everburn play start (part B and fourth round): ${checks} checks passed`);
