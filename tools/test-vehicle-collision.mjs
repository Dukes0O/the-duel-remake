import assert from 'node:assert/strict';
import test from 'node:test';
import {boxContact, solveVehicleImpact, yawInertia, impactSeverity, CRASH_TUNING} from '../src/vehicle-collision.js';

// docs/CRASH_PHYSICS.md: the solver behaves like real rigid bodies.
const MPH = CRASH_TUNING.mphToMps;
function car({x = 0, z = 0, heading = 0, mph = 0, mass = 1450, halfLength = 2.25, halfWidth = .95, spin = 0} = {}) {
  return {x, z, heading, mass, halfLength, halfWidth, spin, inertia: yawInertia(mass, halfLength, halfWidth),
    vx: Math.sin(heading) * mph * MPH, vz: Math.cos(heading) * mph * MPH};
}
const momentum = (a, b, ra = a, rb = b) => ({x: a.mass * ra.vx + b.mass * rb.vx, z: a.mass * ra.vz + b.mass * rb.vz});
const energy = (a, b, ra = a, rb = b) => .5 * a.mass * (ra.vx ** 2 + ra.vz ** 2) + .5 * a.inertia * ra.spin ** 2 +
  .5 * b.mass * (rb.vx ** 2 + rb.vz ** 2) + .5 * b.inertia * rb.spin ** 2;

test('momentum is conserved and energy never increases', () => {
  for (const [a, b] of [
    [car({z: -4.4, mph: 60}), car({mph: 20})],
    [car({x: -3.0, heading: Math.PI / 2, mph: 50}), car({mph: 30})],
    [car({x: .8, z: -4.3, mph: 45, mass: 4700, halfLength: 2.6, halfWidth: 1.4}), car({mph: 0})],
  ]) {
    const r = solveVehicleImpact(a, b);
    const before = momentum(a, b), after = momentum(a, b, r.a, r.b);
    assert.ok(Math.abs(before.x - after.x) < 1e-6 && Math.abs(before.z - after.z) < 1e-6, 'momentum conserved');
    assert.ok(energy(a, b, r.a, r.b) <= energy(a, b) + 1e-6, 'no energy is created');
  }
});

test('a rear hit shoves the struck car forward with little spin', () => {
  const attacker = car({z: -4.45, mph: 60}), target = car({mph: 20});
  const r = solveVehicleImpact(attacker, target);
  assert.ok(r.b.vz > target.vz + 10 * MPH, 'target lurches forward');
  assert.ok(Math.abs(r.b.spin) < .2, 'little spin from a square rear hit');
  assert.ok(r.a.vz < attacker.vz, 'attacker slows');
});

test('a side hit shoves the struck car sideways and turns it', () => {
  // Attacker drives along +x into the target's left flank, ahead of its centre.
  const attacker = car({x: -3.1, z: 1.0, heading: Math.PI / 2, mph: 50}), target = car({mph: 25});
  const r = solveVehicleImpact(attacker, target);
  assert.ok(r.b.vx > 8 * MPH, 'struck car slides sideways, away from the hit');
  assert.ok(Math.abs(r.b.spin) > .5, 'an off-centre side hit turns it');
});

test('clipping a rear corner spins the struck car (the pursuit trick)', () => {
  const attacker = car({x: 1.6, z: -4.3, mph: 50}), target = car({mph: 40});
  const r = solveVehicleImpact(attacker, target);
  assert.ok(Math.abs(r.b.spin) > Math.abs(solveVehicleImpact(car({z: -4.45, mph: 50}), car({mph: 40})).b.spin) + .3,
    'an offset rear hit spins the car far more than a square one');
});

test('a heavy car smashes a light one out of the way and barely slows', () => {
  const titan = car({z: -4.8, mph: 60, mass: 4700, halfLength: 2.6, halfWidth: 1.4}), sedan = car({mph: 0});
  const r = solveVehicleImpact(titan, sedan);
  assert.ok(r.b.dvMph > 3 * r.a.dvMph, `sedan Δv ${r.b.dvMph.toFixed(1)} vs Titan ${r.a.dvMph.toFixed(1)}`);
  assert.ok(r.a.dvMph < CRASH_TUNING.playerCrashDvMph, 'the Titan does not crash');
  assert.equal(impactSeverity(r.b.dvMph, {attackerMass: 4700, mass: 1450}), 'launched');
  const light = car({z: -4.45, mph: 60, mass: 940}), stopped = car({mph: 0, mass: 1450});
  assert.ok(solveVehicleImpact(light, stopped).a.dvMph >= CRASH_TUNING.playerCrashDvMph,
    'a light car rear-ending a stopped car at 60 mph crashes');
});

test('the contact normal points from the struck car toward the attacker, on the struck face', () => {
  const attacker = car({x: -3.0, heading: Math.PI / 2}), target = car();
  const contact = boxContact(attacker, target);
  assert.ok(contact.normal.x < -.9, 'normal points back toward the attacker (from B to A)');
  assert.ok(Math.abs(contact.point.x + .95) < .6, 'contact on the target\'s left face');
});

test('severity follows the change in velocity', () => {
  assert.equal(impactSeverity(3), 'nudge');
  assert.equal(impactSeverity(12), 'knocked');
  assert.equal(impactSeverity(30), 'smashed');
  assert.equal(impactSeverity(50, {attackerMass: 1450, mass: 1450}), 'launched');
  assert.equal(impactSeverity(50, {attackerMass: 940, mass: 4700}), 'smashed', 'a light car cannot launch a heavy one');
});
