import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {placeActor, chooseRespawnSlot} from '../src/arena/arena-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {startKnock} from '../src/vehicle-knock.js';

// Review regression: current cover can require more than the venue's original
// six advances. One due native respawn tick exercises the real chooser.
const DT = 1 / 120, failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try {run();} catch (error) {failures.push(name + ': ' + error.message);}
}
for (const mode of ['last-car-rolling', 'fuel-run']) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true, scrapdome: true, 'fuel-run': true}});
  assert.equal(duel.startArenaEvent({mode, car: 'banshee_muscle', seed: 1989,
    opponents: [{car: 'dusthawk_rally', driverId: 'club', brain: 'gunner'}]}), true);
  const state = duel.state, arena = state.arena, props = duel.course.features.crushables;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0});
  arena.phase = 'fight'; state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  placeActor(duel, state, {s: 180, lateral: 0});
  const cpu = state.opponents[0], cpuMember = arena.participants[1];
  placeActor(duel, cpu, arena.spawnSlots[4]);
  const cpuAt = duel.course.worldAt(cpu.s, cpu.lateral);
  Object.assign(cpuMember, {targetId: null, targetHeldSec: -100, reactionSec: Infinity,
    goal: {...cpuAt, speedMph: 0, boost: false}});
  props.forEach((prop, index) => {
    const s = index < 2 ? 40 + index * 20 : 230.4 + 12 * index;
    const lateral = index < 2 ? 9 : index % 2 ? -12 : 12;
    const at = duel.course.groundAt(s, lateral);
    Object.assign(prop, at, {s, prevS: s, lateral, prevLateral: lateral, off: lateral,
      headingError: 0, speedMph: 0, pushVelocity: 0, knock: null});
  });
  // A tiny moving-cover fixture requests the production pose-cache refresh.
  // It cannot move either of the clustered blockers away from slot zero.
  startKnock(props[2], {vx: Math.sin(props[2].heading), vz: Math.cos(props[2].heading),
    spin: 0, severity: 0, heading: props[2].heading, arenaShove: true});
  const depotBefore = structuredClone(arena.fuelRun?.depots);
  state.armor = 1;
  assert.equal(applyArmorDamage(duel, state, 'crossbow', {owner: 'cpu-1'}), 1);
  assert.equal(state.combatWrecking, true);
  // The fixture begins at the end of the authored waiting clock. The native
  // step still expires it, chooses a slot, places the car and protects it.
  state.combatWreckTimer = DT;
  duel.step(DT);
  const clearance = duel.course.def.scrapdome.junkSpawnClearance;
  const clear = pose => props.every(prop => {
    const at = duel.course.worldAt(pose.s, pose.lateral);
    return Math.hypot(prop.x - at.x, prop.z - at.z) >= clearance;
  });
  check(mode + ': every refreshed slot clears clustered current cover', () => {
    for (const slot of arena.spawnSlots) assert.ok(clear(slot),
      'slot ' + slot.index + ' at s=' + slot.s + ' must clear authored ' + clearance + ' m');
  });
  check(mode + ': the actual native respawn clears current cover', () => {
    assert.equal(state.combatWrecking, false, 'native timer expires the actual wreck');
    assert.equal(arena.participants[0].protectedSec, 2, 'native respawn grants protection');
    assert.ok(clear(state), 'the native chooser and placed player must clear current clustered cover');
    assert.ok(clear(chooseRespawnSlot(duel, arena.participants[0])), 'future native chooser remains clear');
  });
  check(mode + ': slot identities and original Fuel depots remain intact', () => {
    assert.deepEqual(arena.spawnSlots.map(slot => slot.index), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(arena.fuelRun?.depots, depotBefore);
  });
}
console.log('Arena junk clustered respawn: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) {console.error(failures.join('\n')); process.exitCode = 1;}
