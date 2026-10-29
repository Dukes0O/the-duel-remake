import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {Duel} from '../src/game.js';
import {stepField, finishGrandPrix} from '../src/race-field.js';
import {EngineAudio} from '../src/audio.js';
import {SUMMIT_TIME_ATTACK} from '../src/circuits/summit-time-attack.js';
import {ffmpeg} from './audio/codec.mjs';
// HELI-HOOKS: the helicopter's own cues joined the bank behind its switch; exactly that list is left out.
import {HELI_CUES} from '../src/heli/heli-audio.js';
const HELI_BANK_CUES = new Set(Object.keys(HELI_CUES));
// SKI-AUDIO: exclude exactly the new, dev-only cues from the historical pre-P4 projection.
import {SKI_CUES} from '../src/ski/ski-lines.js';
const SKI_BANK_CUES = new Set(Object.keys(SKI_CUES));
// DRIVE-LESSON-LINES: the driving instructor's cues joined the bank behind their switch; exactly that list is left out.
import {DRIVE_LESSON_CUES} from '../src/lessons/drive-radio-lines.js';
const DRIVE_BANK_CUES = new Set(Object.keys(DRIVE_LESSON_CUES));
// LAB-RADIO: the Lab's voice and sound cues joined the bank behind the lab switch: every lab.* id and the two Lab cars' sounds.
const LAB_BANK_CUES = {has: id => id.startsWith('lab.') || id === 'car.sputter' || id === 'car.speirling'};
// Skyline adds only these two dev cues. Keep every historical object and hash exact.
const SKYLINE_CUES = new Set(['vehicle.turbo-whistle', 'vehicle.blowoff']);
// KOGANE-PASS-C5 adds the two Kogane ambience beds and the shrine bell behind the dev switch.
const KOGANE_CUES = new Set(['ambience.kogane', 'ambience.kogane-night', 'landmark.shrine-bell']);

const CUES = [
  'race.start.light', 'race.start.go', 'race.position.gain', 'race.lap.final',
  'race.finish.flag', 'pit.limiter', 'pit.wrench', 'pit.go', 'surface.gravel',
  'surface.snow', 'surface.ice', 'avalanche.rumble', 'avalanche.slide',
  'yeti.roar', 'snowman.burst', 'crowd.cheer', 'wind.summit',
  'ambient.harbour-night', 'ambient.forest-morning', 'ambient.mountain-wind',
];
// DEEP-AUDIO and DEEP-GO-LIVE add only these IDs; historical hashes stay exact.
const DEEP_CUES = ['deep.splash', 'deep.engine-muffle', 'deep.bubbles', 'deep.sand-land',
  'deep.logged', 'deep.pearl', 'deep.whale', 'deep.cave',
  'deep.sonar', 'deep.liftbag', 'deep.lift-cancel', 'deep.raised'];
const added = new Set(CUES);
const hash = data => createHash('sha256').update(data).digest('hex');
const hashObject = value => hash(JSON.stringify(value));
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url)));
// Full pre-P4 objects are pinned; no old record or credit can silently change.
assert.equal(hashObject(Object.fromEntries(Object.entries(SOUND_BANK).filter(([id]) => !added.has(id) && !SKI_BANK_CUES.has(id) && !DEEP_CUES.includes(id) && !HELI_BANK_CUES.has(id) && !DRIVE_BANK_CUES.has(id) && !id.startsWith('deep.ana.') && !LAB_BANK_CUES.has(id) &&
  id !== 'vehicle.rival-engine' && id !== 'vehicle.traffic-engine' && !SKYLINE_CUES.has(id) && !KOGANE_CUES.has(id)))),
  'df5cf72de6db8a8f50273c78ae0e6dd349b6ed0ae32ff1ad37627ddbc8a725ba', 'pre-P4 sound bank changed');
assert.equal(hashObject({...catalog, sounds: catalog.sounds.filter(row => !added.has(row.cue) && !SKI_BANK_CUES.has(row.cue) && !DEEP_CUES.includes(row.cue) && !String(row.cue).startsWith('heli.') && !String(row.cue).startsWith('deep.ana.') && !String(row.cue).startsWith('lab.brian.') && !DRIVE_BANK_CUES.has(row.cue) && !SKYLINE_CUES.has(row.cue) && !KOGANE_CUES.has(row.cue))}),
  '772989c2d66e55d6c7c6f795b85cbf3395c30abe4edc8a6cc3a526421a06e8f0', 'pre-P4 catalog changed');

// Real FIELD emits feed the production event handler. Only the audio sink is
// replaced: captured voices expose starts/stops without a device or player saves.
const STEP = 1 / 60;
class CueContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sources = []; }
  param() {
    return {value: 0, setValueAtTime(value, time) { assert.ok(Number.isFinite(value + time)); },
      linearRampToValueAtTime(value, time) { assert.ok(Number.isFinite(value + time)); },
      exponentialRampToValueAtTime(value, time) { assert.ok(value > 0 && Number.isFinite(value + time)); },
      setTargetAtTime(value, time, speed) { assert.ok(Number.isFinite(value + time) && speed > 0); },
      cancelScheduledValues(time) { assert.ok(Number.isFinite(time)); }};
  }
  createGain() { return {gain: this.param(), connect() {}, disconnect() {}}; }
  createBiquadFilter() { return {frequency: this.param(), Q: this.param(), connect() {}, disconnect() {}}; }
  createStereoPanner() { return {pan: this.param(), connect() {}, disconnect() {}}; }
  createOscillator() { return {...this.createBufferSource(), frequency: this.param()}; }
  createBufferSource() {
    const source = {playbackRate: this.param(), connect() {}, disconnect() {},
      start() { this.started = true; }, stop(time) { this.stopAt = time; }};
    this.sources.push(source);
    return source;
  }
}
function eventRig({enabled = true} = {}) {
  const audio = new EngineAudio({flags: {enabled: name => name === 'grand-prix' && enabled}});
  audio.context = new CueContext();
  audio.master = audio.context.createGain();
  audio.muted = false;
  const voices = [];
  audio._playCue = (id, options = {}) => {
    const voice = {id, stopped: 0, stop() { this.stopped++; }, end() { options.onEnd?.(); }};
    voices.push(voice);
    return voice;
  };
  return {audio, voices, ids: () => voices.map(voice => voice.id)};
}
function fieldRace(rig, {duplicate = false, mode = 'grandprix'} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true}});
  const events = [];
  if (rig) duel.onChange((state, ev) => {
    events.push(ev);
    const before = hashObject(state);
    rig.audio.event(ev, state, duel.course);
    if (duplicate) {
      rig.audio.event(ev, state, duel.course);
      rig.audio.event({...ev}, state, duel.course);
    }
    assert.equal(hashObject(state), before, 'audio does not mutate race state during an event');
  });
  duel.startCampaign({mode, startStage: 0, car: 'falcone_f42', seed: 1989,
    fieldSeed: 4242, fieldSize: 7, cpuDifficulty: 'medium', difficulty: 'casual'});
  return {duel, events};
}
function lightsOut(duel) {
  let ticks = 0;
  while (duel.state.status === 'countdown' && ticks++ < 600) duel.step(STEP);
  assert.equal(duel.state.status, 'racing');
}
function gain(duel, time) {
  const s = duel.state;
  s.stageTimeSec = time;
  s.s = 0;
  s.opponents.forEach((r, i) => { r.s = i < 5 ? 20 + i * 5 : -20 - i * 5; });
  stepField(duel, STEP); // sixth place, then pass one real field rival
  s.opponents[4].s = -40;
  stepField(duel, STEP);
}
{
  const rig = eventRig(), {duel, events} = fieldRace(rig, {duplicate: true});
  assert.deepEqual(rig.ids(), [], 'Grand Prix stage loading is silent until its first real light');
  lightsOut(duel);
  assert.deepEqual(rig.ids(), [...Array(5).fill('race.start.light'), 'race.start.go'],
    'five actual lights and go play once, without legacy countdown/go doubles');
  const count = rig.voices.length;
  const firstLight = events.find(ev => ev.startLight === 1);
  rig.audio.event(firstLight, duel.state, duel.course);
  assert.equal(rig.voices.length, count, 'a stale light is ignored after go');
  gain(duel, 10);
  assert.equal(rig.ids().filter(id => id === 'race.position.gain').length, 1);
  const pass = events.find(ev => ev.positionGain);
  gain(duel, 11);
  assert.equal(rig.ids().filter(id => id === 'race.position.gain').length, 2,
    'a genuine later regain of the same place is audible');
  rig.audio.event(pass, duel.state, duel.course);
  assert.equal(rig.ids().filter(id => id === 'race.position.gain').length, 2, 'old pass is not replayed');
  duel.state.completedLaps = duel.state.lapsTotal - 1;
  stepField(duel, STEP);
  stepField(duel, STEP);
  assert.equal(rig.ids().filter(id => id === 'race.lap.final').length, 1);
  // A second-place completed result must use the finish flourish as well.
  duel.state.s = duel.raceLength;
  duel.state.completedLaps = duel.state.lapsTotal;
  duel.state.lapStartedAt = 11;
  duel.state.opponents[0].s = duel.raceLength + 30;
  duel.state.opponents[0].completedLaps = duel.state.lapsTotal;
  duel.state.opponents[0].lapStartedAt = 9;
  finishGrandPrix(duel);
  assert.equal(duel.state.results.won, false);
  assert.equal(rig.ids().filter(id => id === 'race.finish.flag').length, 1);
  assert.ok(!rig.ids().includes('interface.lose') && !rig.ids().includes('interface.win'));
  assert.ok(rig.voices.slice(0, -1).every(voice => voice.stopped === 1), 'finish stops earlier race voices');
  assert.equal(rig.voices.at(-1).stopped, 0, 'finish may play on results');
  rig.audio.event({menu: true}, {...duel.state, status: 'menu'}, duel.course);
  assert.equal(rig.voices.at(-1).stopped, 1, 'menu stops the finish voice');
}
for (const gate of ['muted', 'paused', 'locked', 'statePaused']) {
  const rig = eventRig(), {duel, events} = fieldRace(rig);
  if (gate === 'muted') rig.audio.setMuted(true);
  if (gate === 'paused') rig.audio.setPaused(true);
  if (gate === 'locked') rig.audio.context.state = 'suspended';
  // FIELD events cannot normally advance during a pause. The listener sees the
  // paused state to prove a late event is discarded rather than queued.
  if (gate === 'statePaused') {
    const event = rig.audio.event.bind(rig.audio);
    rig.audio.event = (ev, state, course) => event(ev, {...state, paused: true}, course);
  }
  lightsOut(duel);
  assert.deepEqual(rig.ids(), [], gate + ': old lights/go are consumed silently');
  rig.audio.setMuted(false); rig.audio.setPaused(false); rig.audio.context.state = 'running';
  if (gate === 'statePaused') rig.audio.event = EngineAudio.prototype.event;
  for (const ev of events.filter(ev => ev.startLight || ev.go)) rig.audio.event({...ev}, duel.state, duel.course);
  assert.deepEqual(rig.ids(), [], gate + ': resume does not replay missed signals');
  gain(duel, 12);
  assert.equal(rig.ids().at(-1), 'race.position.gain', gate + ': new live events still play');
}
for (const end of ['mute', 'pause', 'newStage', 'menuUpdate']) {
  const rig = eventRig(), {duel} = fieldRace(rig);
  lightsOut(duel);
  if (end === 'mute') rig.audio.setMuted(true);
  if (end === 'pause') rig.audio.setPaused(true);
  if (end === 'newStage') fieldRace(rig);
  if (end === 'menuUpdate') {
    rig.audio.context.state = 'suspended'; // update exits before the engine graph
    rig.audio.update({...duel.state, status: 'menu'});
  }
  assert.ok(rig.voices.every(voice => voice.stopped === 1), end + ': race voices stop once');
}
{
  const rig = eventRig(), {duel, events} = fieldRace(rig);
  lightsOut(duel);
  rig.voices.forEach(voice => voice.end());
  rig.audio.setPaused(true);
  assert.ok(rig.voices.every(voice => voice.stopped === 0), 'naturally ended voices are released');
  rig.audio.setPaused(false);
  rig.audio.event(events.find(ev => ev.stageLoaded != null), duel.state, duel.course);
  rig.audio.event(events.find(ev => ev.go), duel.state, duel.course);
  assert.equal(rig.voices.length, 6, 'repeated stageLoaded does not reset the same field');
  const next = fieldRace(rig);
  lightsOut(next.duel);
  assert.equal(rig.voices.length, 12, 'a new field gets a fresh five-light start');
}
{
  const rig = eventRig(), {duel} = fieldRace(rig, {mode: 'duel'});
  lightsOut(duel);
  assert.deepEqual(rig.ids(), [...Array(3).fill('interface.countdown'), 'interface.go'], 'ordinary countdown is unchanged');
  rig.audio.event({stageResult: {won: true}}, duel.state, duel.course);
  rig.audio.event({stageResult: {won: false}}, duel.state, duel.course);
  assert.deepEqual(rig.ids().slice(-2), ['interface.win', 'interface.lose']);
  const gp = fieldRace(rig);
  rig.audio.event({stageResult: {won: false, completed: false}}, gp.duel.state, gp.duel.course);
  assert.equal(rig.ids().at(-1), 'interface.lose', 'Grand Prix failure keeps its loss cue');
}
{
  const rig = eventRig({enabled: false}), {duel} = fieldRace(rig);
  lightsOut(duel);
  assert.ok(rig.ids().every(id => !id.startsWith('race.')), 'disabled audio switch plays no new race cue');
}
{
  const a = fieldRace(eventRig(), {duplicate: true}).duel, b = fieldRace().duel;
  for (const duel of [a, b]) {
    lightsOut(duel);
    duel.setInput({throttle: 1, steer: 0});
    for (let n = 0; n < 720; n++) duel.step(STEP);
  }
  assert.equal(hashObject(a.state), hashObject(b.state), 'real seeded race fingerprint is identical with or without audio');
  console.log('P4 native FIELD audio race fingerprint:', hashObject(a.state));
}

// Attack result protocol controls use the same existing event rig. The sink
// records cue requests; this does not claim a native listening verdict.
function attackCueRig(medal='gold') {
  const rig=eventRig({enabled:false});
  rig.audio.flags={enabled:name=>name==='summit-run'};
  rig.audio.cueBuffers['race.finish.flag']={duration:1};
  const result={completed:true,won:medal!==null,medal};
  const state={mode:'timetrial',status:'stage_result',paused:false,results:result};
  return {...rig,result,state,course:{def:SUMMIT_TIME_ATTACK},event:{stageResult:result}};
}
for(const medal of ['gold','silver','bronze',null]) {
  const r=attackCueRig(medal),before=hashObject(r.state);
  r.audio.event(r.event,r.state,r.course);
  r.audio.event({...r.event},r.state,r.course);
  r.audio.event({stageResult:{...r.result}},r.state,r.course);
  r.audio.event({complete:true},r.state,r.course);
  assert.deepEqual(r.ids(),['race.finish.flag',...(medal?['interface.win']:[])],
    'Attack '+medal+': exactly one finish flag, medal-only win, no loss or complete double');
  assert.equal(hashObject(r.state),before,'Attack finish audio never mutates the result or race');
}
for(const gate of ['muted','paused','locked','statePaused']) {
  const r=attackCueRig();
  if(gate==='muted')r.audio.setMuted(true);
  if(gate==='paused')r.audio.setPaused(true);
  if(gate==='locked')r.audio.context.state='suspended';
  if(gate==='statePaused')r.state.paused=true;
  r.audio.event(r.event,r.state,r.course);
  r.audio.setMuted(false);r.audio.setPaused(false);r.audio.context.state='running';r.state.paused=false;
  r.audio.event({...r.event},r.state,r.course);
  assert.deepEqual(r.ids(),[],gate+': missed Attack finish is consumed, never replayed on resume');
}
{
  const r=attackCueRig(null);
  r.result.completed=false;r.result.timeout=true;
  r.audio.event(r.event,r.state,r.course);
  assert.deepEqual(r.ids(),[],'incomplete solo result gets neither finish, win nor loss cue');
}
for(const end of ['decoded','mute','pause','newStage','menu']) {
  const r=attackCueRig();let release;
  delete r.audio.cueBuffers['race.finish.flag'];
  r.audio._loadCueBuffers=options=>{
    assert.deepEqual(options,{summitAttack:true},'only Attack opts into its existing finish recording');
    return new Promise(resolve=>{release=resolve;});
  };
  r.audio.event(r.event,r.state,r.course);
  assert.deepEqual(r.ids(),[],'undecoded Attack finish does not synthesize a substitute');
  if(end==='mute'){r.audio.setMuted(true);r.audio.setMuted(false);}
  if(end==='pause'){r.audio.setPaused(true);r.audio.setPaused(false);}
  if(end==='newStage')r.audio.event({stageLoaded:20},r.state,r.course);
  if(end==='menu'){r.state.status='menu';r.audio.event({menu:true},r.state,r.course);}
  r.audio.cueBuffers['race.finish.flag']={duration:1};release();await Promise.resolve();await Promise.resolve();
  assert.deepEqual(r.ids(),end==='decoded'?['race.finish.flag','interface.win']:[],
    end+': only a still-current completed Attack can play after actual decode completion');
  r.audio.event({...r.event},r.state,r.course);
  assert.deepEqual(r.ids(),end==='decoded'?['race.finish.flag','interface.win']:[],
    end+': late/repeated delivery adds no double');
}
{
  const r=attackCueRig(),started=[];
  r.audio._playCue=EngineAudio.prototype._playCue;
  r.audio._runCue=id=>{started.push(id);return {};};
  assert.equal(r.audio._playCue('race.finish.flag'),null,'GP-off default caller cannot bypass the old finish gate');
  r.audio.event(r.event,r.state,r.course);
  assert.deepEqual(started,['race.finish.flag','interface.win'],'only actual Attack finish admits the existing flag cue with GP off');
}

// Exercise the real loader with memory-only responses; never touch player storage.
const savedFetch = globalThis.fetch;
try {
  for (const enabled of [false, true]) {
    const requested = [];
    globalThis.fetch = async url => {
      requested.push(url);
      return {ok: true, arrayBuffer: async () => new ArrayBuffer(4)};
    };
    const renderer = Object.create(EngineAudio.prototype);
    Object.assign(renderer, {flags: {enabled: name => name === 'grand-prix' && enabled},
      context: {decodeAudioData: async () => ({duration: 1})}, cueBuffers: {}});
    await renderer._loadCueBuffers();
    const p4 = requested.filter(url => url.startsWith('/assets/audio/p4/'));
    assert.equal(p4.length, enabled ? CUES.length : 0, 'disabled P4 performs no asset fetch');
    const count = requested.length;
    await renderer._loadCueBuffers();
    assert.equal(requested.length, count, 'repeated loading does not duplicate requests');
  }
  // Activation extends both settled and in-flight ordinary loads.
  for (const settleBase of [false, true]) {
    let enabled = false;
    const requested = [], releases = [];
    globalThis.fetch = url => {
      requested.push(url);
      return new Promise(resolve => releases.push(() => resolve({ok: true,
        arrayBuffer: async () => new ArrayBuffer(4)})));
    };
    const renderer = Object.create(EngineAudio.prototype);
    Object.assign(renderer, {flags: {enabled: name => name === 'grand-prix' && enabled},
      context: {decodeAudioData: async () => ({duration: 1})}, cueBuffers: {}});
    const ordinaryLoad = renderer._loadCueBuffers();
    const oldRequests = [...requested];
    if (settleBase) {
      for (const release of releases) release();
      await ordinaryLoad;
    }
    enabled = true;
    const activatedLoad = renderer._loadCueBuffers();
    assert.equal(requested.filter(url => url.startsWith('/assets/audio/p4/')).length, CUES.length,
      'activating Grand Prix on an existing renderer loads its 20 assets');
    assert.deepEqual(requested.filter(url => !url.startsWith('/assets/audio/p4/')), oldRequests,
      'activation does not refetch old or in-flight assets');
    assert.equal(renderer._loadCueBuffers(), activatedLoad, 'in-flight activation is memoized');
    enabled = false;
    renderer._loadCueBuffers();
    enabled = true;
    assert.equal(renderer._loadCueBuffers(), activatedLoad, 'off/on does not duplicate requests');
    for (const release of releases) release();
    await Promise.all([ordinaryLoad, activatedLoad]);
    assert.deepEqual(CUES.filter(id => renderer.cueBuffers[id]), CUES, 'all new buffers become available');
  }
  // Attack extends only its actual existing finish asset after the unchanged
  // Summit-only ordinary loader has selected the two avalanche recordings.
  {
    const requested=[];
    globalThis.fetch=async url=>{requested.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
    const audio=Object.create(EngineAudio.prototype);
    Object.assign(audio,{flags:{enabled:name=>name==='summit-run'},
      context:{decodeAudioData:async()=>({duration:1})},cueBuffers:{}});
    await audio._loadCueBuffers();
    assert.deepEqual(requested.filter(url=>url.startsWith('/assets/audio/p4/')).sort(),
      ['/assets/audio/p4/avalanche-rumble.ogg','/assets/audio/p4/avalanche-slide.ogg'],
      'ordinary Summit-only load is unchanged');
    const old=[...requested];await audio._loadCueBuffers({summitAttack:true});
    assert.deepEqual(requested.slice(old.length),['/assets/audio/'+SOUND_BANK['race.finish.flag'].file],
      'Attack adds only the existing flag asset, no old or unrelated P4 refetch');
    const count=requested.length;await audio._loadCueBuffers({summitAttack:true});
    assert.equal(requested.length,count,'Attack finish asset loading remains memoized');
  }
} finally { globalThis.fetch = savedFetch; }

const decodedBuffers = new Map();
const records = catalog.sounds.filter(row => added.has(row.cue));
assert.deepEqual([...new Set(records.map(row => row.cue))].sort(), [...CUES].sort(), 'all 20 cues need source recipes');
for (const id of CUES) {
  const cue = SOUND_BANK[id];
  assert.ok(cue, `${id}: missing bank definition`);
  assert.equal(cue.flag, 'grand-prix', `${id}: behind Grand Prix switch`);
  assert.match(cue.file, /^p4\/[a-z0-9-]+\.ogg$/, `${id}: compressed runtime file`);
  assert.equal(cue.layers, undefined, `${id}: recorded source, no synthetic fallback`);
  const row = records.find(record => record.cue === id);
  for (const field of ['author', 'page', 'licenseUrl', 'file']) assert.ok(row[field], `${id}: ${field}`);
  assert.match(row.license, /^(CC0 1\.0|CC BY [34]\.0)$/);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.processing.script, 'tools/audio/p4-audio.mjs');
  assert.equal(row.runtime.file, `public/assets/audio/${cue.file}`);
  const bytes = readFileSync(new URL(`../${row.runtime.file}`, import.meta.url));
  assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
  assert.equal(hash(bytes), row.runtime.sha256, `${id}: runtime recipe checksum`);
  assert.equal(bytes.length, row.runtime.bytes);
  const pcm = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], {input: bytes});
  const count = pcm.length / 4;
  let peak = 0, squares = 0, maxStep = 0, previous = pcm.readFloatLE(0);
  for (let i = 0; i < count; i++) {
    const sample = pcm.readFloatLE(i * 4);
    assert.ok(Number.isFinite(sample));
    peak = Math.max(peak, Math.abs(sample));
    squares += sample * sample;
    maxStep = Math.max(maxStep, Math.abs(sample - previous));
    previous = sample;
  }
  const duration = count / 48000, rms = Math.sqrt(squares / count);
  decodedBuffers.set(id, {duration, pcm});
  assert.equal(duration, row.runtime.duration, id + ': decoded duration');
  assert.equal(peak, row.runtime.peak, id + ': decoded peak');
  assert.equal(rms, row.runtime.rms, id + ': decoded RMS');
  assert.ok(peak <= .99 && rms > .0001, id + ': real PCM is audible and unclipped');
  if (cue.loop) assert.ok(Math.abs(pcm.readFloatLE(0) - previous) <= .02 + maxStep * 2,
    id + ': loop boundary is within ordinary waveform steps');
  assert.ok(row.runtime.duration > 0.05 && row.runtime.duration <= (cue.loop ? 32 : 8), `${id}: bounded duration`);
  assert.ok(row.runtime.peak <= 0.99 && row.runtime.rms > 0.0001, `${id}: audible and unclipped`);
}
// Follow the real _playCue -> _runCue -> _sample path with decoded recordings.
// The device substitute records Web Audio scheduling; it cannot approve sound.

{
  const rig = eventRig(), ctx = new CueContext();
  rig.audio.context = ctx;
  rig.audio.master = ctx.createGain();
  rig.audio._playCue = EngineAudio.prototype._playCue;
  for (const [id, buffer] of decodedBuffers) rig.audio.cueBuffers[id] = buffer;
  const {duel} = fieldRace(rig, {duplicate: true});
  lightsOut(duel);
  gain(duel, 10);
  duel.state.completedLaps = duel.state.lapsTotal - 1;
  stepField(duel, STEP);
  finishGrandPrix(duel);
  assert.deepEqual(ctx.sources.map(source => CUES.find(id => decodedBuffers.get(id) === source.buffer)),
    [...Array(5).fill('race.start.light'), 'race.start.go', 'race.position.gain', 'race.lap.final', 'race.finish.flag'],
    'native audio schedules the five real recorded race cues without duplicate sources');
  assert.ok(ctx.sources.every(source => source.started && source.buffer.pcm.length > 0));
  rig.audio.setMuted(true);
  assert.ok(ctx.sources.every(source => source.stopAt <= ctx.currentTime + .08), 'native sources stop promptly on mute');
  for (const source of ctx.sources) source.onended();
  assert.equal(rig.audio.activeShots.size, 0, 'native source cleanup releases sample voices');
  assert.equal(rig.audio.grandPrixVoices.size, 0, 'native source cleanup releases race voices');
}
{
  const rig = eventRig(), ctx = new CueContext();
  rig.audio.context = ctx;
  rig.audio.master = ctx.createGain();
  rig.audio._playCue = EngineAudio.prototype._playCue;
  const {duel, events} = fieldRace(rig);
  lightsOut(duel);
  assert.equal(ctx.sources.length, 0, 'undecoded cues do not start synthetic replacements');
  for (const [id, buffer] of decodedBuffers) rig.audio.cueBuffers[id] = buffer;
  for (const ev of events) rig.audio.event({...ev}, duel.state, duel.course);
  assert.equal(ctx.sources.length, 0, 'late decoding does not replay the start');
  gain(duel, 10);
  assert.equal(ctx.sources.length, 1, 'new events play after recording decode completes');
  assert.equal(ctx.sources[0].buffer, decodedBuffers.get('race.position.gain'));
}
console.log('P4 audio: native FIELD cues/lifecycle, all 20 recorded assets, source credits and pre-P4 pins pass.');
