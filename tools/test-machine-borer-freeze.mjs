import assert from 'node:assert/strict';
import {borerYardControls, createDigSandbox, stepDigSandbox} from '../src/machines/dig-sandbox.js';
import {stepBorer} from '../src/machines/borer.js';

for (const key of ['ArrowUp', 'ArrowDown', 'KeyA', 'KeyD']) {
  let dig = createDigSandbox({playerId:`v7-${key}`});
  const parked = dig.borer;
  const x = parked.x + 30 * Math.sin(parked.heading);
  const z = parked.z + 30 * Math.cos(parked.heading);
  dig = {...dig, activeMachine:'borer', mode:'work',
    borer:{...parked, x, z, y:dig.ground.heightAt(x,z), lever:1/3}};
  const hold = (keys, seconds) => {
    for (let i=0; i<Math.round(seconds * 60); i++) {
      dig = stepDigSandbox(dig, {controls:borerYardControls(keys)}, 1/60);
      assert.equal(dig.borerFault, undefined, `${key}: the cutter must not throw`);
    }
  };
  // Make a slightly sloping approach, then use the reported keyboard sequence.
  hold({ArrowUp:true}, 14);
  if (key === 'ArrowUp') {
    // Curved cuts are stored as chords, whose total is shorter than the
    // travelled distance. Returning to the face must still land on its end.
    const end = dig.borer.segments.at(-1).end;
    const returning = {...dig.borer, distanceM:dig.borer.distanceM + .01,
      travelM:dig.borer.distanceM + .0099, x:end.x - .01, z:end.z};
    const arrived = stepBorer(returning, {thrust:1/3}, dig.ground, null, 1/120).state;
    assert.ok(Math.hypot(arrived.x-end.x, arrived.z-end.z) < 1e-9,
      'Returning to the face ends at the last segment, even when chords are shorter.');
  }
  dig = {...dig, borer:{...dig.borer, lever:0, rockSeam:{index:0, end:25.7, material:'rock'}}};
  hold({KeyW:true}, 1.3);
  hold({KeyW:true}, 1.5);
  for (let i=0; i<180 && !dig.borer.stalled; i++) hold({KeyW:true}, 1/60);
  assert.equal(dig.borer.stalled, true, `${key}: overload stalls the real cutter`);
  hold({KeyS:true}, 2.8);
  for (let i=0; i<120 && (dig.borer.stalled || dig.borer.travelM >= dig.borer.distanceM); i++) hold({KeyS:true}, 1/60);
  assert.equal(dig.borer.stalled, false);
  assert.ok(dig.borer.travelM < dig.borer.distanceM, 'S backs her away from the face');
  hold({KeyW:true}, 1.32);
  hold({[key]:true}, 45);
  assert.ok(dig.borer.distanceM > 12, `${key}: she cuts beyond 12 m`);
  const segments = dig.tunnels.segments;
  assert.equal(segments.length, dig.borer.segments.length);
  for (let i=1; i<segments.length; i++)
    assert.ok(Math.hypot(segments[i].start.x-segments[i-1].end.x,
      segments[i].start.y-segments[i-1].end.y, segments[i].start.z-segments[i-1].end.z) < 1e-7,
    `${key}: tunnel segments join`);
}

// A cutter error is logged once, stops her and leaves the rest of the Dig running.
{
  let dig = createDigSandbox({playerId:'v7-error'});
  const original = dig.ground.refusal;
  dig = {...dig, activeMachine:'borer', mode:'work',
    ground:{...dig.ground, refusal:() => {throw new Error('test cutter failure');}}};
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    dig = stepDigSandbox(dig, {controls:{forward:1, directLever:true}}, 1/60);
    assert.equal(dig.borer.lever, 0);
    assert.equal(dig.lastMessage, 'Mabel has stopped. Back her up and try again.');
    assert.equal(dig.elapsed, 1/60);
    dig = {...dig, activeMachine:'excavator', ground:{...dig.ground, refusal:original}};
    const before = dig.haul.machines.excavator;
    dig = stepDigSandbox(dig, {controls:{forward:1}}, 1);
    assert.ok(dig.elapsed > 1);
    assert.notEqual(dig.haul.machines.excavator.z, before.z);
    assert.equal(errors.length, 1);
    assert.match(String(errors[0][1]), /test cutter failure/);
    dig = stepDigSandbox({...dig, activeMachine:'borer'}, {controls:{forward:-1}}, 1/60);
    assert.equal(dig.borerFault, false, 'Backing up permits a retry.');
    assert.equal(errors.length, 1);
  } finally { console.error = originalError; }
}
console.log('Mabel stall, reverse, direction changes and error recovery passed.');
