// WASTE-TRUCKS-FIT: the Workshop's two heavy trucks, parked against a solid wall on a Wasteland outing and rammed side-on by a car,
// stay on their own side of the wall. The trucks go out only on Wasteland outings (Kyle, 27 November 2026; app.js allows a
// Workshop machine only in the `world-job` mode), so the check drives the real world-job step on the Scablands with the truck as
// the player's car and a computer car as the attacker. The walls are real solids: Tin Town's gate fence (20 cm thick, both faces),
// a Dead Mall wall (1.6 m thick) and a Boneyard wreck that stands at an angle.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {CARS} from '../src/config.js';
import {SOLID_GRID} from '../src/world/scablands-solids.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {vehicleContactEnvelope} from '../src/npc-yielding.js';

const DT = 1 / 120, SEED = 1989, TICKS = 210, GAP = .05;
const TRUCKS = ['longhaul', 'bully'];
const ATTACKERS = Object.keys(CARS).filter(car => !CARS[car].workshop);
const WALLS = [['tin-town-gate-fence-left', 1], ['tin-town-gate-fence-left', -1], ['dead-mall-wall-71', -1], ['boneyard-wreck-north-2', 1]];
const SOLIDS = new Map([...SOLID_GRID.near(-1e5, -1e5, 1e5, 1e5, 0)].map(solid => [solid.id, solid]));
const JOB = {id: 'truck-wall-check', seed: SEED, steps: [{kind: 'reach', lineId: 'start', place: {position: {x: 500, z: 500}}, radius: 1}]};

function place(duel, actor, at, heading, speedMph = 0) {
  const road = duel._roadPosition(at, actor.s), frame = duel.course.at(road.s);
  Object.assign(actor, {s: road.s, prevS: road.s, lateral: road.lateral, prevLateral: road.lateral,
    headingError: heading - frame.heading, speedMph, yawVelocity: 0, pushVelocity: 0, slipAngle: 0, airHeight: 0,
    prevAirHeight: 0, airborne: false, contactCooldown: 0, damageCooldown: 0, impactTimer: 0, knock: null});
}

// Parks `truck` along one face of `wallId` with a 5 cm gap, puts `attacker` square on to its open side and drives it in at `mph`.
// Returns the closest the truck's middle came to the wall and the attacker's closing speed at contact.
function ramAgainstWall(truck, attacker, wallId, face, mph) {
  const duel = new Duel({seed: SEED});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: truck, seed: SEED,
    opponents: [{car: attacker, driverId: 'club', brain: 'gunner'}], job: JOB}), true, 'a Workshop truck starts a world job');
  const state = duel.state, rammer = state.opponents[0];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  const wall = SOLIDS.get(wallId), c = Math.cos(wall.heading || 0), s = Math.sin(wall.heading || 0);
  // The wall's own frame: local x runs along the face, local z out of it; `face` picks the side.
  const at = (along, out) => ({x: wall.x + along * c + face * out * s, z: wall.z - along * s + face * out * c});
  const normal = {x: face * s, z: face * c};
  const spec = duel._vehicleSpec(state);
  const outFromWall = actor => {
    const pose = worldPose(duel, actor);
    return (pose.x - wall.x) * normal.x + (pose.z - wall.z) * normal.z;
  };
  place(duel, state, at(0, wall.halfZ + spec.halfWidth + GAP), Math.atan2(c, -s));
  const envelope = vehicleContactEnvelope(rammer, state, duel._vehicleSpec(rammer), spec);
  const inward = Math.atan2(-normal.x, -normal.z);
  place(duel, rammer, at(0, wall.halfZ + spec.halfWidth + GAP + envelope.width + .02), inward, mph + 1.1);
  const participant = state.arena.participants.find(p => p.id === rammer.arenaId);
  let closest = outFromWall(state), closingMph = 0, shoved = false;
  for (let tick = 0; tick < TICKS; tick++) {
    if (participant) Object.assign(participant, {targetId: null, reactionSec: 10});
    const before = rammer.speedMph;
    duel.step(DT);
    if (tick === 0) closingMph = before;
    shoved ||= !!state.knock || Math.abs(state.pushVelocity || 0) > 1e-6 || before - rammer.speedMph > 5;
    closest = Math.min(closest, outFromWall(state));
  }
  return {closest, faceToMiddle: wall.halfZ + spec.halfWidth, closingMph, shoved, status: state.status};
}

let runs = 0;
const failures = [];
for (const truck of TRUCKS) for (const [wallId, face] of WALLS) for (const mph of [20, 40]) for (const attacker of ATTACKERS) {
  const r = ramAgainstWall(truck, attacker, wallId, face, mph), name = `${truck} at ${wallId} (face ${face}) rammed by ${attacker} at ${mph} mph`;
  runs++;
  if (!(r.closingMph >= mph)) failures.push(`${name}: the attacker reached only ${r.closingMph.toFixed(1)} mph`);
  if (!r.shoved) failures.push(`${name}: the ram never reached the truck`);
  // The truck's side may press 5 cm into the face (the contact solver's own allowance) and never further.
  if (r.closest < r.faceToMiddle - GAP) failures.push(`${name}: the truck's middle came to ${r.closest.toFixed(3)} m from the wall's middle; its side needs ${r.faceToMiddle.toFixed(3)} m`);
}
assert.deepEqual(failures, [], `${failures.length} of ${runs} rams fail; first: ${failures[0]}`);
console.log(`PASS: ${runs} rams; the Longhaul and the Bully stay on their own side of a solid wall on a Wasteland outing.`);
