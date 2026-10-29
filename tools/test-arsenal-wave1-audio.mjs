import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {EngineAudio, combatAudioSpace} from '../src/audio.js';
import {SoundMixer} from '../src/sound-mixer.js';
import * as bank from '../src/sound-bank.js';
import {hazardsFor, stepHazards} from '../src/arsenal/hazards.js';
import {carEffect} from '../src/arsenal/car-effects.js';
import {point, fireWeapon} from '../src/combat-weapons.js';
import {spatialMotion} from '../src/sound-mixer.js';
import {decodeAudioBytes} from './audio/codec.mjs';

// ARS-01 audio acceptance. Use genuine launches, swept hits and tether breaks.
// Only the six new recordings are decoded; no network or player storage is used.
const CUES = ['weapon.harpoon.fire', 'weapon.harpoon.flight', 'weapon.harpoon.hit',
  'weapon.harpoon.break', 'weapon.caltrops.deploy', 'weapon.caltrops.hit'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Retired switches leave no flag field on the cues they once guarded.
const OLD_WASTELAND_CUES = new Set([
  'raider.shot', 'weapon.ufo.fire', 'weapon.bomb.fire',
  'weapon.crossbow.fire', 'weapon.star.fire', 'weapon.rpg.fire',
  'weapon.bomb.flight', 'weapon.rpg.flight', 'weapon.crossbow.flight',
  'combat.hit-confirm', 'combat.blast.recorded', 'vehicle.crash.recorded',
]);
const OLD_RELEASED_CUES = new Map([
  ...['world.muddy-hollow-splash', 'world.muddy-hollow-mud',
    'world.muddy-hollow-churn'].map(id => [id, 'muddy-hollow']),
  ...['arena.tell', 'arena.respawn', 'arena.wreck-credit',
    'arena.sal-saw'].map(id => [id, 'scrapdome']),
]);
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try {run();} catch (error) {failures.push(name + ': ' + error.message);}
}
class Param {
  constructor(value = 0) {this.value = value;}
  setValueAtTime(value) {assert.ok(Number.isFinite(value)); this.value = value;}
  linearRampToValueAtTime(value) {this.setValueAtTime(value);}
  exponentialRampToValueAtTime(value) {this.setValueAtTime(value);}
  setTargetAtTime(value) {this.setValueAtTime(value);}
  cancelScheduledValues() {}
}
class AudioNode {
  constructor(context, type) {this.context = context; this.type = type; this.connections = []; context.nodes.push(this);}
  connect(destination) {assert.ok(destination); this.connections.push(destination); return destination;}
  disconnect(destination) {this.connections = destination ? this.connections.filter(node => node !== destination) : [];}
  start(time = this.context.currentTime) {this.started = time;}
  stop(time = this.context.currentTime) {this.stopAt = time;}
}
class Context {
  constructor() {this.currentTime = 0; this.state = 'running'; this.nodes = [];}
  node(type, params) {
    const node = new AudioNode(this, type);
    for (const [key, value] of Object.entries(params)) node[key] = new Param(value);
    return node;
  }
  createGain() {return this.node('gain', {gain: 1});}
  createBufferSource() {return this.node('source', {playbackRate: 1});}
  createStereoPanner() {return this.node('panner', {pan: 0});}
  createPanner() {return this.node('moving-panner', {positionX: 0, positionY: 0, positionZ: 0});}
  createBiquadFilter() {return this.node('filter', {frequency: 350, Q: 1});}
  createOscillator() {return this.node('oscillator', {frequency: 440});}
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({length: channels}, () => new Float32Array(length));
    return {duration: length / sampleRate, length, sampleRate,
      numberOfChannels: channels, getChannelData: index => data[index]};
  }
}
function recordedBuffer(context, file) {
  assert.ok(typeof file === 'string' && file.startsWith('arsenal-wave1/') && !file.includes('..'),
    'only a new Arsenal recording is read');
  const bytes = readFileSync(new URL('../public/assets/audio/' + file, import.meta.url));
  const wave = decodeAudioBytes(bytes);
  let format, pcm;
  for (let offset = 12; offset + 8 <= wave.length;) {
    const size = wave.readUInt32LE(offset + 4), id = wave.toString('ascii', offset, offset + 4);
    if (id === 'fmt ') format = {channels: wave.readUInt16LE(offset + 10),
      rate: wave.readUInt32LE(offset + 12), bits: wave.readUInt16LE(offset + 22)};
    if (id === 'data') pcm = wave.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  assert.ok(format && pcm?.length, 'new recorded cue decodes to real nonempty PCM');
  assert.equal(format.channels, 1, 'new runtime cue is mono');
  assert.ok([16, 24].includes(format.bits), 'supported native PCM');
  const width = format.bits / 8, buffer = context.createBuffer(1, pcm.length / width, format.rate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = pcm.readIntLE(i * width, width) / 2 ** (format.bits - 1);
  assert.ok(samples.some(value => value !== 0), 'the recording contains sound');
  return buffer;
}

function audio({disabled = [], muted = false, paused = false} = {}) {
  const context = new Context(), flags = {enabled: name =>
    name === 'arsenal' && !disabled.includes(name)};
  const renderer = new EngineAudio({flags});
  renderer.context = context; renderer.master = context.createGain(); renderer.muted = muted;
  renderer.paused = paused; renderer.vehicleBus = context.createGain();
  renderer.mixer = new SoundMixer(context, renderer.master, {enabled: true,
    vehicle: renderer.vehicleBus});
  renderer.buses = renderer.mixer.buses;
  // Minimal Web Audio graph for public update(); engine and world recordings stay unloaded.
  renderer.engine = []; renderer.engineFilter = context.createBiquadFilter();
  renderer.engineGain = context.createGain(); renderer.tunnelWet = context.createGain();
  for (const key of ['wind', 'tires', 'gravel', 'boost', 'mud'])
    renderer[key] = {gain: context.createGain(), filter: context.createBiquadFilter()};
  renderer.siren = context.createOscillator(); renderer.sirenHarmony = context.createOscillator();
  renderer.sirenGain = context.createGain(); renderer.nextBeat = Infinity;
  for (const id of CUES) {
    const cue = bank.SOUND_BANK[id];
    if (!cue) continue;
    const buffers = (cue.files || [cue.file]).map(file => recordedBuffer(context, file));
    renderer.cueBuffers[id] = cue.files ? buffers : buffers[0];
  }
  return {renderer, context};
}
function place(actor, s, lateral = 0, headingError = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
    headingError, yawVelocity: 0, pushVelocity: 0, slipAngle: 0, airHeight: 0,
    prevAirHeight: 0, airborne: false, combatShield: 0, contactCooldown: 0});
}
function race({cpu = false, enabled = true} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {arsenal: enabled}});
  const duel = new Duel({seed: 1989, featureFlags: flags});
  duel.startCampaign({mode: 'wasteland', discoveredGate: true, seed: 1989,
    car: 'falcone_f42', opponentCount: 1, arsenalRank: 6,
    weaponLoadout: ['harpoon', 'caltrops', 'oil', 'smoke']});
  Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  duel.state.combat.aiTimer = duel.state.combat.pickupTimer = Infinity;
  const shooter = cpu ? duel.state.rival : duel.state, target = cpu ? duel.state : duel.state.rival;
  place(shooter, 500, 2);
  const from = point(duel, shooter), bearing = from.heading - 3 * Math.PI / 180;
  const at = duel.course.nearest(from.x + Math.sin(bearing) * 35,
    from.z + Math.cos(bearing) * 35, shooter.s);
  place(target, at.s, at.lateral, from.heading - duel.course.at(at.s).heading);
  if (cpu) shooter.weaponLoadout = ['harpoon', 'caltrops', 'oil', 'smoke'];
  const events = [];
  duel.onChange((_state, event) => {if (event.arsenalCue) events.push(event);});
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  return {duel, shooter, target, events, cpu};
}
function launch(options) {
  const run = race(options);
  assert.equal(run.cpu ? fireWeapon(run.duel, 'harpoon', true, run.shooter) :
    run.duel.fireWeapon('harpoon'), true, 'real native Harpoon launches');
  run.projectile = run.duel.state.combat.projectiles.find(row => row.kind === 'harpoon');
  assert.ok(run.projectile, 'real launch creates its flight product');
  return run;
}
function finish(run) {
  const {duel, target, shooter, events, cpu} = run;
  for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) duel.step(1 / 120);
  assert.ok(carEffect(target, 'tether'), 'real swept flight hits and tethers the target');
  place(shooter, target.s - 100);
  assert.ok(Math.hypot(point(duel, shooter).x - point(duel, target).x,
    point(duel, shooter).z - point(duel, target).z) > 60, 'cars are beyond the native tether range');
  duel.step(1 / 120);
  assert.equal(carEffect(target, 'tether'), null, 'native separation counter breaks the tether');
  assert.equal(cpu ? fireWeapon(duel, 'caltrops', true, shooter) :
    duel.fireWeapon('caltrops'), true, 'real native Caltrops deploys');
  const hazard = hazardsFor(duel).find(row => row.kind === 'caltrops');
  assert.ok(hazard, 'native deployment creates its strip');
  const at = duel.course.nearest(hazard.x, hazard.z, target.s);
  place(target, at.s, at.lateral); place(shooter, shooter.s + 100);
  stepHazards(duel, 1 / 120); stepHazards(duel, 1 / 120);
  assert.ok(carEffect(target, 'grip'), 'real victim touches the actual strip');
  return run;
}
function snapshot(run) {
  return hash({state: run.duel.state,
    events: run.events.map(({actor, hazard, ...event}) => event)});
}
const sources = context => context.nodes.filter(node => node.type === 'source' && node.started != null);
const environment = run => {
  const at = point(run.duel, run.duel.state);
  return {listener: {...at, heading: at.heading + run.duel.state.headingError, vx: 0, vy: 0, vz: 0}};
};
function dispatch(rig, run, event) {
  rig.renderer.event(event, run.duel.state, run.duel.course);
  if (event.arsenalCue === 'weapon.harpoon.flight')
    rig.renderer.update(run.duel.state, environment(run));
}
function reaches(node, target, visited = new Set()) {
  if (node === target) return true;
  if (visited.has(node)) return false;
  visited.add(node);
  return node.connections.some(next => reaches(next, target, visited));
}
check('retired switches leave no flag on their cues', () => {
  for (const id of [...OLD_WASTELAND_CUES, ...OLD_RELEASED_CUES.keys()])
    assert.equal(Object.hasOwn(bank.SOUND_BANK[id] ?? {}, 'flag'), false, id + ' retains retired flag');
});
check('released sound-bank entries and other exports stay exact', () => {
  assert.equal(hash(bank.CAR_VOICES.mclaren_f1),
    '1c9f009e1c81b1a75b9804fd7d004dbcc5a79167693424b232e250b01af43699',
    'F1 uses its own existing-sample voice while historical exports remain pinned');
  // The released cues themselves are pinned once, in test-p4-audio, which covers every cue this
  // snapshot did. This suite keeps the other bank exports and the F1 voice.
  assert.equal(hash(Object.fromEntries(Object.entries(bank).filter(([key]) => key !== 'SOUND_BANK').map(([key, value]) =>
    // The medal cars' engine voices (EARN-CAR-1, 2 and 3) are new entries;
    // LAB-LIVE-FIX adds the Speirling to this pin, with every earlier voice unchanged.
    // Skyline is new; its exact row is checked by test-audio. Keep this old hash.
    [key, key === 'CAR_VOICES' ? Object.fromEntries(Object.entries(value).filter(([id]) => !['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide', 'falcone_sirena', 'nissan_skyline_gtr_r34'].includes(id))) : value]))),
    '4f41cdd93762f37b875ab7d52675a32c67cfd2335775b697503a934f48010a6b',
    'existing sound-bank exports remain exact');
});
// The released catalog records are pinned once, in test-p4-audio.
for (const id of CUES) {
  check(id + ' has a real recorded runtime bank cue', () => {
    const cue = bank.SOUND_BANK[id];
    assert.ok(cue, 'missing runtime bank cue ' + id);
    assert.ok(cue.file || cue.files?.length, 'new cue uses recorded runtime audio');
    assert.equal(cue.bus, 'weapons', 'new weapon cue uses the existing weapons bus');
    const context = new Context();
    for (const file of cue.files || [cue.file]) recordedBuffer(context, file);
  });
  check(id + ' has a free CC0 source and committed rebuild recipe', () => {
    const rows = catalog.sounds.filter(row => row.cue === id);
    assert.ok(rows.length, 'missing catalog source recipe ' + id);
    for (const row of rows) {
      assert.equal(row.source, 'freesound', 'new cues come from Freesound');
      assert.match(row.license, /CC0/i, 'source is recorded CC0');
      assert.equal(row.creditsUsed || 0, 0, 'no paid credits');
      assert.ok(row.file && row.sha256 && row.page, 'source identity and attribution are recorded');
      assert.ok(row.processing?.script && row.processing?.recipe, 'recipe names its rebuild script');
      assert.ok(!row.processing.script.includes('..'), 'build script stays in the repository');
      readFileSync(new URL('../' + row.processing.script, import.meta.url));
    }
  });
  check(id + ' is emitted once by a genuine native action', () => {
    const run = finish(launch()), matching = run.events.filter(event => event.arsenalCue === id);
    assert.equal(matching.length, 1, 'native action emits its cue exactly once');
    const event = matching[0];
    assert.equal(event.actor, id.endsWith('.hit') || id.endsWith('.break') ? run.target : run.shooter,
      'cue belongs to its genuine shooter or victim');
    assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(event.hitPosition?.[axis])),
      'cue carries a finite native world position');
    if (id.startsWith('weapon.caltrops.')) assert.ok(event.hazard, 'cue retains its native strip');
    else if (!id.endsWith('.break')) assert.equal(event.projectile, run.projectile, 'cue retains its flight product');
  });
  check(id + ' plays through the actual spatial audio consumer', () => {
    const run = id.endsWith('.flight') ? launch() : finish(launch());
    const event = run.events.find(row => row.arsenalCue === id);
    assert.ok(event, 'genuine event exists before rendering');
    const rig = audio(), before = snapshot(run);
    dispatch(rig, run, event);
    const played = sources(rig.context);
    assert.equal(played.length, 1, 'native ' + id + ' starts exactly one recorded source');
    assert.ok(played[0].buffer?.duration > 0, 'actual runtime recording is used');
    assert.ok(reaches(played[0], rig.renderer.buses.weapons), 'native cue reaches the weapons bus');
    if (id.endsWith('.flight')) {
      const panner = rig.context.nodes.find(node => node.type === 'moving-panner');
      assert.ok(panner, 'moving flight has a spatial output');
      const motion = spatialMotion(run.projectile, environment(run).listener);
      for (const axis of ['X', 'Y', 'Z'])
        assert.ok(Math.abs(panner['position' + axis].value - motion[axis.toLowerCase()]) < 1e-7,
          'flight follows the genuine projectile position on ' + axis);
    } else {
      const panner = rig.context.nodes.find(node => node.type === 'panner');
      assert.ok(panner, 'one-shot uses a spatial output');
      const expected = combatAudioSpace({...event, combatHit: true}, run.duel.state, run.duel.course);
      assert.ok(Math.abs(panner.pan.value - expected.pan) < 1e-7, 'pan follows the native event world position');
      assert.ok(rig.context.nodes.some(node => node.type === 'gain' && node.connections.includes(panner) &&
        Math.abs(node.gain.value - expected.gain) < 1e-7), 'distance gain follows the native event position');
    }
    assert.equal(snapshot(run), before, 'audio leaves native state and events unchanged');
  });
}
check('native computer weapon events retain their genuine source and victim', () => {
  const run = finish(launch({cpu: true}));
  assert.deepEqual(run.events.map(event => event.arsenalCue), CUES, 'computer emits all six legal cues once');
  assert.equal(run.events[0].actor, run.duel.state.rival);
  assert.equal(run.events[2].actor, run.duel.state);
});
for (const control of ['arsenal off', 'muted', 'paused']) {
  check(control + ' blocks all native wave-one audio', () => {
    const run = finish(launch()), flightRun = launch();
    const rig = audio({disabled: control.endsWith('off') ? [control.split(' ')[0]] : [],
      muted: control === 'muted', paused: control === 'paused'});
    if (control === 'paused') {run.duel.state.paused = true; flightRun.duel.state.paused = true;}
    for (const event of run.events.filter(event => !event.arsenalCue.endsWith('.flight')))
      dispatch(rig, run, event);
    dispatch(rig, flightRun, flightRun.events.find(event => event.arsenalCue.endsWith('.flight')));
    assert.equal(sources(rig.context).length, 0, 'blocked cues start no recorded sources');
  });
}
check('arsenal-off native producer emits no new cues', () => {
  const run = race({enabled: false});
  assert.equal(run.duel.fireWeapon('harpoon'), false);
  assert.equal(run.duel.fireWeapon('caltrops'), false);
  assert.equal(run.events.length, 0, 'no wave-one cue bypasses the native switch');
});
check('future arsenal cues remain silent', () => {
  const run = race(), rig = audio();
  for (const id of ['weapon.mortar.fire',
    'weapon.tesla.pulse', 'weapon.decoy.burst'])
    rig.renderer.event({arsenalCue: id}, run.duel.state, run.duel.course);
  assert.equal(sources(rig.context).length, 0, 'unsettled later-wave events do not start audio');
});
check('live Harpoon flight follows motion without duplicate playback and retires after hit', () => {
  const run = launch(), rig = audio(), event = run.events.find(row => row.arsenalCue.endsWith('.flight'));
  dispatch(rig, run, event);
  assert.equal(sources(rig.context).length, 1, 'live flight starts one actual recorded source');
  const source = sources(rig.context)[0], panner = rig.context.nodes.find(node => node.type === 'moving-panner');
  for (let i = 0; i < 8; i++) run.duel.step(1 / 120);
  const before = snapshot(run);
  rig.context.currentTime += 8 / 120;
  rig.renderer.update(run.duel.state, environment(run));
  assert.equal(sources(rig.context).length, 1, 'another frame reuses the moving flight voice');
  const expected = spatialMotion(run.projectile, environment(run).listener);
  assert.ok(Math.abs(panner.positionX.value - expected.x) < 1e-7 &&
    Math.abs(panner.positionZ.value - expected.z) < 1e-7, 'flight output moves with the actual product');
  assert.equal(snapshot(run), before, 'frame audio leaves native motion unchanged');
  for (let i = 0; i < 180 && run.duel.state.combat.projectiles.includes(run.projectile); i++)
    run.duel.step(1 / 120);
  assert.ok(!run.duel.state.combat.projectiles.includes(run.projectile), 'real projectile retires');
  rig.renderer.update(run.duel.state, environment(run));
  assert.ok(Number.isFinite(source.stopAt), 'retired projectile stops its recorded flight');
});
// Synthetic recordings exercise native short-cue analysis without library files.
import {ffmpeg} from './audio/codec.mjs';
import {measureLoudness} from './audio/measurements.mjs';
import * as waveOneBuilder from './build-arsenal-wave1-audio.mjs';
function encodedMeasurementTone(seconds) {
  const rate = 48000, pcm = Buffer.alloc(Math.round(seconds * rate) * 4);
  for (let i = 0; i < pcm.length / 4; i++) {
    const fade = Math.min(1, i / (rate * .003), (pcm.length / 4 - 1 - i) / (rate * .003));
    pcm.writeFloatLE(.65 * Math.sin(i * 2 * Math.PI * 2100 / rate) * fade, i * 4);
  }
  return ffmpeg(['-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0',
    '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: pcm});
}
function decodedMeasurementPcm(bytes) {
  return ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], {input: bytes});
}
check('short native Arsenal cue measurement pads analysis only and keeps real codec peak', () => {
  for (const seconds of [.36, .16, .38]) {
    const bytes = encodedMeasurementTone(seconds), before = Buffer.from(bytes);
    const decoded = decodedMeasurementPcm(bytes);
    assert.ok(decoded.some(value => value !== 0), 'synthetic short recording contains real decoded signal');
    const duration = decoded.length / 4 / 48000;
    assert.ok(duration < .4 && Math.abs(duration - seconds) < .02, 'encoded cue retains its short playback duration');
    const referenceWave = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', '48000',
      '-af', 'apad=whole_dur=1', '-c:a', 'pcm_f32le', '-f', 'wav', 'pipe:1'], {input: bytes});
    const reference = measureLoudness(referenceWave);
    assert.equal(reference.available, true, 'independently decoded, silence-padded native reference is measurable');
    // Until Source exports the helper, this is the exact native path the builder uses now.
    const measured = (waveOneBuilder.measureArsenalWaveOneCue ?? measureLoudness)(bytes);
    assert.equal(measured.available, true, seconds + ' s non-silent encoded cue must be measurable');
    assert.ok(Number.isFinite(measured.truePeakDbtp) && Math.abs(measured.truePeakDbtp - reference.truePeakDbtp) <= .12,
      'analysis padding preserves actual decoded true peak: ' + measured.truePeakDbtp + ' versus ' + reference.truePeakDbtp);
    assert.ok(measured.truePeakDbtp < -1.5 && measured.truePeakDbtp > -8,
      'available peak retains the real synthetic signal headroom');
    assert.ok(measured.analysisPaddingSec > 0 && measured.analysisDurationSec >= 1,
      'measurement report clearly labels its analysis-only silence padding');
    assert.ok(Math.abs(measured.analysisDurationSec - measured.analysisPaddingSec - duration) < .001,
      'reported analysis duration excludes padding from the actual cue duration');
    assert.deepEqual(bytes, before, 'measurement leaves every encoded runtime byte unchanged');
    assert.deepEqual(decodedMeasurementPcm(bytes), decoded, 'measurement never lengthens or changes decoded playback');
  }
});
check('ordinary longer native Arsenal cue retains direct measurement and encoded playback', () => {
  const bytes = encodedMeasurementTone(1.2), before = Buffer.from(bytes), decoded = decodedMeasurementPcm(bytes);
  const reference = measureLoudness(bytes);
  assert.equal(reference.available, true, 'ordinary longer encoded control is measurable without padding');
  const measured = (waveOneBuilder.measureArsenalWaveOneCue ?? measureLoudness)(bytes);
  assert.equal(measured.available, true, 'long-cue control keeps its available native measurement');
  assert.ok(Math.abs(measured.truePeakDbtp - reference.truePeakDbtp) <= .12,
    'long-cue control keeps actual codec true peak');
  assert.ok(Math.abs(measured.integratedLufs - reference.integratedLufs) <= .12,
    'long-cue control keeps direct loudness without analysis padding');
  assert.deepEqual(bytes, before, 'long-cue analysis leaves encoded bytes unchanged');
  assert.deepEqual(decodedMeasurementPcm(bytes), decoded, 'long-cue analysis leaves playback unchanged');
});
check('complete native launch streams play wave-one cues once and keep released Crossbow audio', () => {
  const actual = [];
  for (const weapon of ['harpoon', 'caltrops', 'crossbow']) {
    const released = weapon === 'crossbow';
    const run = race({enabled: !released}), rig = audio({disabled: released ? ['arsenal'] : []});
    const events = [];
    // Capture every native event, including weaponFired; do not prefilter the consumer input.
    run.duel.onChange((_state, event) => events.push(event));
    assert.equal(run.duel.fireWeapon(weapon), true, 'genuine ' + weapon + ' launches');
    assert.equal(events.filter(event => event.weaponFired === weapon).length, 1,
      'complete ' + weapon + ' stream includes its native generic launch event');
    const before = snapshot(run);
    for (const event of events) dispatch(rig, run, event);
    assert.equal(snapshot(run), before, 'complete launch playback leaves native state unchanged');
    const played = sources(rig.context);
    const tones = rig.context.nodes.filter(node => node.frequency && node.started != null);
    const fireId = 'weapon.' + weapon + (weapon === 'caltrops' ? '.deploy' : '.fire');
    const buffers = id => {
      const value = rig.renderer.cueBuffers[id];
      return Array.isArray(value) ? value : value ? [value] : [];
    };
    actual.push({weapon,
      sources: played.length,
      launchRecordings: played.filter(node => buffers(fireId).includes(node.buffer)).length,
      flightRecordings: played.filter(node => buffers('weapon.harpoon.flight').includes(node.buffer)).length,
      flightLoops: played.filter(node => node.loop === true).length,
      tones: tones.map(node => node.frequency.value)});
  }
  assert.deepEqual(actual, [
    {weapon: 'harpoon', sources: 2, launchRecordings: 1, flightRecordings: 1, flightLoops: 1, tones: []},
    {weapon: 'caltrops', sources: 1, launchRecordings: 1, flightRecordings: 0, flightLoops: 0, tones: []},
    {weapon: 'crossbow', sources: 1, launchRecordings: 0, flightRecordings: 0, flightLoops: 0, tones: [260, 175]},
  ], 'whole native streams need one correct launch recording, one moving flight where applicable, no duplicate or fallback tone, and unchanged released Crossbow layers');
});
console.log('Arsenal wave-one audio: ' + checks + ' checks, ' + failures.length + ' failures.');
for (const failure of failures) console.error(failure);
if (failures.length) process.exitCode = 1;
