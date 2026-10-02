import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {EngineAudio} from '../src/audio.js';
import {SoundMixer} from '../src/sound-mixer.js';
import * as bank from '../src/sound-bank.js';
import {hazardsFor, stepHazards} from '../src/arsenal/hazards.js';
import {carEffect} from '../src/arsenal/car-effects.js';
import {decodeAudioBytes} from './audio/codec.mjs';

// Only the three new runtime files are decoded. No network, existing recordings,
// player storage, private future helper or substitute arsenal event is used.
const CUES = ['weapon.oil.deploy', 'weapon.oil.slip', 'weapon.smoke.deploy'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
  createBiquadFilter() {return this.node('filter', {frequency: 350, Q: 1});}
  createOscillator() {return this.node('oscillator', {frequency: 440});}
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({length: channels}, () => new Float32Array(length));
    return {duration: length / sampleRate, length, sampleRate,
      numberOfChannels: channels, getChannelData: index => data[index]};
  }
}
function recordedBuffer(context, file) {
  assert.ok(typeof file === 'string' && file.startsWith('arsenal-core/') && !file.includes('..'),
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
function audio() {
  const context = new Context(), flags = {enabled: name => ['wasteland2', 'arsenal'].includes(name)};
  const renderer = new EngineAudio({flags});
  renderer.context = context; renderer.master = context.createGain(); renderer.muted = false;
  renderer.vehicleBus = context.createGain();
  renderer.mixer = new SoundMixer(context, renderer.master, {enabled: true, vehicle: renderer.vehicleBus});
  renderer.buses = renderer.mixer.buses;
  for (const id of CUES) {
    const cue = bank.SOUND_BANK[id];
    if (!cue) continue;
    const files = cue.files || (cue.file ? [cue.file] : []);
    const buffers = files.map(file => recordedBuffer(context, file));
    renderer.cueBuffers[id] = cue.files ? buffers : buffers[0];
  }
  return {renderer, context};
}
function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
    headingError: 0, yawVelocity: 0, pushVelocity: 0, airHeight: 0, combatShield: 0});
}
function nativeEvents() {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {wasteland2: true, arsenal: true}});
  const duel = new Duel({seed: 1989, featureFlags: flags});
  duel.startCampaign({mode: 'wasteland', discoveredGate: true, seed: 1989,
    car: 'falcone_f42', opponentCount: 1, arsenalRank: 6, weaponLoadout: ['oil', 'smoke', 'crossbow', 'bomb']});
  Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  place(duel.state, 500); place(duel.state.rival, 600);
  const events = [];
  duel.onChange((state, event) => {if (event.arsenalCue) events.push(event);});
  assert.equal(duel.fireWeapon('oil'), true, 'real Oil launch succeeds');
  const oil = hazardsFor(duel).find(hazard => hazard.kind === 'oil');
  assert.ok(oil, 'actual Oil launch creates a registered hazard');
  const at = duel.course.nearest(oil.x, oil.z, duel.state.rival.s);
  place(duel.state.rival, at.s, at.lateral);
  stepHazards(duel, 1 / 120);
  assert.ok(carEffect(duel.state.rival, 'slick'), 'actual opponent body slips');
  stepHazards(duel, 1 / 120);
  assert.equal(duel.fireWeapon('smoke'), true, 'real Smoke launch succeeds');
  return {duel, events};
}
check('existing sound-bank entries and all other exports stay exact', () => {
  assert.equal(hash(Object.fromEntries(Object.entries(bank.SOUND_BANK).filter(([id]) => !CUES.includes(id)))),
    'cc6d14d4b734baeff5104526ef4e3841fa24c6cc3051e59c37f488f5734afeb9');
  assert.equal(hash(Object.fromEntries(Object.entries(bank).filter(([key]) => key !== 'SOUND_BANK'))),
    '8bed9e05cbd48321670c377483bc87c841b01eac228a6237889b8ce5602a2b38');
});
check('existing catalog records and metadata stay exact', () => {
  assert.equal(hash({...catalog, sounds: catalog.sounds.filter(row => !CUES.includes(row.cue))}),
    '104e9dafe12aa861857d055e73685a315a6fb809ee56db2f25a60990a283f1c5');
});
for (const id of CUES) {
  check(id + ' has a recorded runtime bank cue', () => {
    const cue = bank.SOUND_BANK[id];
    assert.ok(cue, 'missing runtime bank cue ' + id);
    assert.ok(cue.file || cue.files?.length, 'new cue uses recorded runtime audio');
    assert.equal(cue.bus, 'weapons', 'new weapon cue uses the existing weapons bus');
    const context = new Context();
    for (const file of cue.files || [cue.file]) recordedBuffer(context, file);
  });
  check(id + ' has a free CC0 source and rebuild recipe', () => {
    const rows = catalog.sounds.filter(row => row.cue === id);
    assert.ok(rows.length, 'missing catalog source recipe ' + id);
    for (const row of rows) {
      assert.match(row.license, /CC0/i, 'source is recorded CC0');
      assert.notEqual(row.source, 'elevenlabs', 'no paid generation');
      assert.equal(row.creditsUsed || 0, 0, 'no paid credits');
      assert.ok(row.file && row.sha256 && row.page, 'source identity and attribution are recorded');
      assert.ok(row.processing?.script && row.processing?.recipe, 'recipe names the committed rebuild script');
    }
  });
  check(id + ' is emitted by genuine native weapon/contact behavior', () => {
    const {duel, events} = nativeEvents(), matching = events.filter(event => event.arsenalCue === id);
    assert.equal(matching.length, 1, 'the native action emits its cue once');
    assert.ok(matching[0].actor && matching[0].hazard, 'cue retains actual native actor and hazard');
    assert.ok(Object.values(matching[0].hitPosition).every(Number.isFinite), 'cue has a genuine finite event position');
    if (id.endsWith('.slip')) assert.equal(matching[0].actor, duel.state.rival, 'slip cue belongs to the victim body');
  });
  check(id + ' is consumed by actual EngineAudio.event', () => {
    const {duel, events} = nativeEvents(), event = events.find(row => row.arsenalCue === id);
    assert.ok(event, 'the native event exists before rendering');
    const {renderer, context} = audio();
    const before = hash({state: duel.state, events: events.map(({actor, hazard, ...row}) => row)});
    renderer.event(event, duel.state, duel.course);
    const sources = context.nodes.filter(node => node.type === 'source' && node.started != null);
    assert.equal(sources.length, 1, 'native ' + id + ' event starts exactly one recorded source');
    assert.ok(sources[0].buffer?.duration > 0, 'actual runtime recording is used');
    assert.equal(hash({state: duel.state, events: events.map(({actor, hazard, ...row}) => row)}), before,
      'audio leaves native state and cue events unchanged');
  });
}
console.log('Arsenal core audio: ' + checks + ' checks, ' + failures.length + ' failures.');
for (const failure of failures) console.error(failure);
if (failures.length) process.exitCode = 1;
