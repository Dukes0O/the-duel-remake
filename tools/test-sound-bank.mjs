import assert from 'node:assert/strict';
import { SOUND_BANK, BUS_NAMES } from '../src/sound-bank.js';
import { SoundMixer, spatialMotion } from '../src/sound-mixer.js';

class Param {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(value, time) {
    assert(Number.isFinite(value + time));
    this.value = value;
    this.events.push([value, time]);
  }
  setTargetAtTime(value, time, constant) {
    assert(constant > 0);
    this.setValueAtTime(value, time);
  }
  cancelScheduledValues() {}
}
class Node {
  constructor() {
    this.connections = [];
    this.gain = new Param(1);
    this.positionX = new Param();
    this.positionY = new Param();
    this.positionZ = new Param();
  }
  connect(node) {
    this.connections.push(node);
    return node;
  }
  disconnect(destination) {
    this.connections = destination
      ? this.connections.filter((node) => node !== destination)
      : [];
  }
}
const context = {
  currentTime: 0,
  createGain: () => new Node(),
  createPanner: () => new Node(),
};
assert.deepEqual(BUS_NAMES, [
  'engine',
  'vehicle',
  'weapons',
  'impacts',
  'ambience',
  'music',
  'voice',
  'interface',
]);
for (const [id, cue] of Object.entries(SOUND_BANK)) {
  assert(BUS_NAMES.includes(cue.bus), id + ' names a bus');
  assert(
    Number.isInteger(cue.limit) && cue.limit > 0,
    id + ' has a finite voice limit',
  );
  assert(
    Number.isFinite(cue.priority) && cue.volume >= 0,
    id + ' has priority and gain',
  );
  assert(
    Array.isArray(cue.pitchRange) && Array.isArray(cue.volumeRange),
    id + ' declares variation',
  );
}
for (const id of [
  'engine.idle',
  'vehicle.tires',
  'weapon.crossbow.fire',
  'combat.blast',
  'interface.countdown',
  'music.sequence',
  'gate.drum',
])
  assert(SOUND_BANK[id], id);
const master = new Node(),
  vehicle = new Node();
const mixer = new SoundMixer(context, master, { vehicle });
for (const bus of BUS_NAMES)
  assert.equal(mixer.buses[bus].gain.value, 1, 'migration buses are unity');
const enabledRouting = new SoundMixer(context, master, {
  vehicle,
  enabled: true,
});
assert(enabledRouting.buses.engine.connections.includes(vehicle));
assert(enabledRouting.buses.vehicle.connections.includes(vehicle));
assert(enabledRouting.buses.ambience.connections.includes(master));
mixer.duck('voice', 1);
assert.equal(mixer.buses.music.gain.value, 1, 'default mix does not duck');
mixer.enabled = true;
mixer.duck('voice', 1);
assert(mixer.buses.music.gain.value < 1 && mixer.buses.ambience.gain.value < 1);
context.currentTime = 0.8;
mixer.duck('blast', 1);
context.currentTime = 1.1;
mixer.update();
assert(mixer.buses.music.gain.value < 1, 'overlapping requests hold ducking');
context.currentTime = 2;
mixer.update();
assert.equal(mixer.buses.music.gain.value, 1, 'ducking releases');
let stopped = 0;
for (let i = 0; i < 20; i++)
  mixer.track('weapon.crossbow.fire', { stop: () => stopped++ });
assert(
  mixer.voices.get('weapon.crossbow.fire').size <=
    SOUND_BANK['weapon.crossbow.fire'].limit,
);
assert(stopped > 0, 'old cues retire at the voice limit');
mixer.stopAll();
assert.equal(
  [...mixer.voices.values()].reduce((n, set) => n + set.size, 0),
  0,
);
const listener = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0 };
const source = { x: 20, y: 0, z: 0, vx: -30, vy: 0, vz: 0 };
const original = structuredClone(source);
const approaching = spatialMotion(source, listener);
const retreating = spatialMotion({ ...source, vx: 30 }, listener);
assert(
  approaching.rate > 1 && retreating.rate < 1,
  'radial speed changes pitch in the correct direction',
);
assert(
  approaching.x > 0 && spatialMotion({ ...source, x: -20 }, listener).x < 0,
  'left and right are preserved',
);
assert.deepEqual(source, original, 'positioning never writes race state');
assert(
  Number.isFinite(spatialMotion(listener, listener).rate),
  'coincident positions stay finite',
);
context.createBufferSource = () => {
  const node = new Node();
  node.playbackRate = new Param(1);
  node.start = () => {};
  node.stop = () => {
    node.stopped = true;
    node.onended?.();
  };
  return node;
};
const moving = mixer.playMoving(
  'engine.high',
  { duration: 1 },
  source,
  listener,
);
assert(
  moving.source.connections.includes(moving.gain),
  'moving PCM feeds its gain',
);
assert(
  moving.gain.connections.includes(moving.output.input),
  'moving gain feeds HRTF distance panner',
);
assert(
  moving.output.input.positionX.value > 0,
  'moving source starts on right',
);
moving.update({ ...source, x: -20, vx: 30 }, listener);
assert(
  moving.output.input.positionX.value < 0,
  'moving panner follows source across listener',
);
assert(
  moving.source.playbackRate.value > 1,
  'approaching sound pitch is raised',
);
moving.stop();
assert.equal(moving.source.connections.length, 0, 'stopped source disconnects');
assert.equal(
  moving.output.input.connections.length,
  0,
  'stopped source releases panner',
);
assert.equal(
  mixer.voices.get('engine.high').size,
  0,
  'stopped source releases its budget',
);
mixer.stopAll();
let lowStops = 0;
for (const id of [
  'interface.countdown',
  'interface.go',
  'interface.bonus',
  'interface.near-miss',
  'interface.win',
  'interface.lose',
])
  for (let i = 0; i < 12; i++) mixer.track(id, { stop: () => lowStops++ });
assert(
  [...mixer.voices.values()].reduce((n, set) => n + set.size, 0) <= 64,
  'global cue budget is bounded',
);
const before = lowStops;
mixer.track('combat.blast', { stop: () => {} });
assert(
  lowStops > before,
  'higher-priority blast displaces a low-priority voice at budget',
);
console.log('Sound bank and mixer acceptance passed.');

assert.equal(
  mixer.output('combat.blast'),
  mixer.buses.impacts,
  'impacts route through their bus',
);
assert(
  mixer.output('engine.shift-fallback').connections.includes(master),
  'missing-sample shift fallback retains its original dry path',
);
assert(
  !mixer.output('engine.shift-fallback').connections.includes(vehicle),
  'fallback must not gain camera attenuation or tunnel echoes',
);

// Flat compatibility routing retains original leaf destinations.
const flatMaster = new Node(),
  flatVehicle = new Node();
const flat = new SoundMixer(context, flatMaster, { vehicle: flatVehicle });
const leaf = new Node();
flat.connect(leaf, flat.buses.engine);
assert(
  !flat.buses.engine.connections.includes(flatVehicle),
  'disabled bus must not regroup audible engine inputs',
);
let route = [...flat.routes][0];
assert.equal(route.directConnected, true);
assert(leaf.connections.includes(flatVehicle));
flat.enabled = true;
flat.update();
assert(flat.buses.engine.connections.includes(flatVehicle));
assert.equal(route.directConnected, false);
flat.enabled = false;
flat.update();
assert(!flat.buses.engine.connections.includes(flatVehicle));
assert.equal(route.directConnected, true);
flat.voiceEnabled = true;
flat.update();
assert(
  flat.buses.voice.connections.includes(flatMaster),
  'Hidden Road alone needs a physical voice bus',
);
flat.voiceEnabled = false;
flat.update();
const group = new Node(),
  external = new Node(),
  shot = new Node();
flat.registerGroup(group, 'weapon.crossbow.fire', external);
flat.connect(shot, group);
assert(
  !group.connections.includes(external),
  'flat external group must not double its bypass leaves',
);
const shotRoute = [...flat.routes].find((r) => r.input === shot);
assert(shot.connections.includes(external));
flat.enabled = true;
flat.update();
assert(group.connections.includes(external));
assert.equal(shotRoute.directConnected, false);
flat.fadeGroup(group);
flat.enabled = false;
flat.update();
assert.equal(
  shotRoute.directConnected,
  false,
  'fading sound cannot reopen during a switch',
);
flat.releaseGroup(group);
assert(!flat.groups.has(group));
assert.equal(flat.routes.size, 1);
flat.disconnect(leaf);
assert.equal(flat.routes.size, 0, 'ended leaf releases routing bookkeeping');
