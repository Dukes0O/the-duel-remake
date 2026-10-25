import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HELI_RADIO_LINES, HELI_RADIO_VOICE, HELI_VOICES} from '../src/heli/heli-radio-lines.js';
import {
  HELI_CUES, HELI_LIBRARY_CUES, HELI_TONE_CUES, HELI_RADIO_CUES, HELI_EVENT_CUES, HELI_EVENT_LINES, RADIO_FILTER,
  createHeliAudio, createRadioChain, rotorVoice, softClipCurve, windVoice, WILDLIFE_CUE_IDS,
} from '../src/heli/heli-audio.js';
import {HELI_RECIPES, heliRuntimeName} from './audio/build-heli.mjs';
import {measureLoudness} from './audio/measurements.mjs';
// test-reads: public/assets/audio/heli/ public/assets/audio/voices/ audio-src/voices/ tools/audio/catalog.json src/heli/heli-audio.js

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(read('tools/audio/catalog.json'));

// ---- The cue table ---------------------------------------------------------
const lineIds = Object.keys(HELI_RADIO_LINES);
assert.equal(lineIds.length, 83, 'twenty-seven H1 lines, nineteen H2 Fire lines, twenty-eight H4 Rescue lines and nine H3 Wildlife lines');
assert.equal(HELI_RADIO_VOICE.name, 'Brian');
// Three stock voices with the same settings (docs/HELI_FIRE.md section 10).
assert.deepEqual(Object.fromEntries(Object.entries(HELI_VOICES).map(([key, voice]) => [key, [voice.name, voice.voiceId]])), {
  brian: ['Brian', 'nPczCjzI2devNBz1zQrb'], sarah: ['Sarah', 'EXAVITQu4vr4xnSDxMaL'], roger: ['Roger', 'CwhRBWXzGAHq8TQ4Fs17']});
assert.equal(HELI_RADIO_VOICE, HELI_VOICES.brian);
const FIRE_LINES = {
  'heli.radio.fire.call': ['roger', 'Calling all pilots, calling all pilots. Smoke and flames reported in the forest. Kestrel One, can you take it?'],
  'heli.radio.fire.answer': ['roger', 'Thank you, Kestrel One. Fit the bucket at the pad. The lake is your water.'],
  'heli.radio.fire.later': ['roger', 'Understood. Call us back when you can. It will not wait forever.'],
  'heli.radio.fire.reminder': ['roger', 'Kestrel One, that fire is still burning, and it is growing.'],
  'heli.radio.wind.calm': ['roger', 'Wind is light today.'],
  'heli.radio.wind.breeze': ['roger', 'There is a breeze. Watch where the water drifts.'],
  'heli.radio.wind.strong': ['roger', 'It is windy out there. The fire runs with the wind, so hit the downwind side first.'],
  'heli.radio.fire.half': ['roger', 'Good work, Kestrel One. It is half out.'],
  'heli.radio.fire.out': ['roger', 'That is the last of it. Fire is out. Great flying, Kestrel One.'],
  'heli.radio.fire.lost': ['roger', 'We have lost those woods. The course is closed. Nobody was hurt.'],
  'heli.radio.fire.thanks': ['sarah', 'From all of us at the park, thank you. The animals thank you too.'],
  'heli.radio.burn.reopen': ['sarah', 'The burnt woods are open again. All black for now, but it will come back.'],
  'heli.radio.burn.shoots': ['sarah', 'Green shoots are coming up in the burn.'],
  'heli.radio.burn.fireweed': ['sarah', 'Fireweed is blooming in the burn. It is always the first flower back after a fire.'],
  'heli.radio.bucket.first': ['brian', 'That is the bucket. Hover low and slow over the lake and let it sink and fill.'],
  'heli.radio.bucket.full': ['brian', 'Bucket is full. She is heavier now, so give her more collective.'],
  'heli.radio.bucket.fast': ['brian', 'Too fast over the water. Slow down or you will tear the bucket.'],
  'heli.radio.drop.tip': ['brian', 'Hold H to let the water go. Drop low, and a little short. The water keeps moving as it falls.'],
  'heli.radio.bucket.dented': ['brian', 'You dented the bucket. It will leak until the shop fixes it.'],
};
for (const [id, [voice, text]] of Object.entries(FIRE_LINES))
  assert.deepEqual([HELI_RADIO_LINES[id]?.voice, HELI_RADIO_LINES[id]?.text], [voice, text], id + ' as the packet writes it');
// H4 Rescue (docs/HELI_RESCUE.md section 8): every line in its voice, as written.
const RESCUE_VOICES = {avalanche: 'roger', hoist: 'roger', supply: 'roger', rescue: 'roger', beacon: 'roger', season: 'roger',
  hiker: 'sarah', line: 'brian'};
const rescueIds = lineIds.filter(id => /^heli\.radio\.(avalanche|hoist|supply|hiker|rescue|beacon|season|line)\./.test(id));
assert.equal(rescueIds.length, 28, 'twenty-eight rescue lines (four added by RESCUE-HURT)');
for (const id of rescueIds) assert.equal(HELI_RADIO_LINES[id].voice, RESCUE_VOICES[id.split('.')[2]], id + ' voice');
assert.equal(HELI_RADIO_LINES['heli.radio.rescue.done'].text, 'Safe and sound. Great work, Kestrel One.');
// Every rescue line's voice and words exactly as the packet's table has them.
{
  const table = new Map([...readFileSync(new URL('../docs/HELI_RESCUE.md', import.meta.url), 'utf8')
    .matchAll(/^\| `(heli\.radio\.[a-z.]+)` \| (\w+) \| (.+?) \|$/gm)].map(m => [m[1], {voice: m[2].toLowerCase(), text: m[3]}]));
  assert.deepEqual([...table.keys()].sort(), [...rescueIds].sort(), 'the packet lists the same 28 lines');
  for (const id of rescueIds) assert.deepEqual({voice: HELI_RADIO_LINES[id].voice, text: HELI_RADIO_LINES[id].text}, table.get(id), id + ' as written');
}
// H3 Wildlife (docs/HELI_WILDLIFE.md section 8): every line in its voice, as written.
const wildIds = lineIds.filter(id => /^heli\.radio\.(survey|skin|wash)\./.test(id));
assert.equal(wildIds.length, 9, 'nine wildlife and skin lines');
{
  const table = new Map([...readFileSync(new URL('../docs/HELI_WILDLIFE.md', import.meta.url), 'utf8')
    .matchAll(/^\| `(heli\.radio\.[a-z.]+)` \| (\w+) \| (.+?) \|$/gm)].map(m => [m[1], {voice: m[2].toLowerCase(), text: m[3]}]));
  assert.deepEqual([...table.keys()].sort(), [...wildIds].sort(), 'the packet lists the same 9 lines');
  for (const id of wildIds) assert.deepEqual({voice: HELI_RADIO_LINES[id].voice, text: HELI_RADIO_LINES[id].text}, table.get(id), id + ' as written');
}
assert.equal(HELI_RADIO_LINES['heli.radio.hiker.spotted'].text, 'That is them! There is a clearing close by. Land there and they will walk over.');
for (const id of lineIds) if (!Object.hasOwn(FIRE_LINES, id) && !rescueIds.includes(id) && !wildIds.includes(id)) assert.equal(HELI_RADIO_LINES[id].voice, 'brian', id + ' stays the instructor');
// Every take plays within the H1 lines' loudness: measured level plus its gain.
{
  const played = id => {
    const m = measureLoudness(read('public/assets/audio/voices/' + HELI_RADIO_LINES[id].file));
    return m.available ? m.integratedLufs + 20 * Math.log10(HELI_RADIO_LINES[id].gain || 1) : null;
  };
  const checked = [...Object.keys(FIRE_LINES), ...wildIds];
  const h1 = lineIds.filter(id => !checked.includes(id)).map(played).filter(v => v !== null);
  if (h1.length) {
    const low = Math.min(...h1) - 1.5, high = Math.max(...h1) + 1.5;
    for (const id of checked) {
      const level = played(id);
      assert(level === null || level >= low && level <= high, id + ' plays at ' + level?.toFixed(1) + ' LUFS, outside ' + low.toFixed(1) + ' to ' + high.toFixed(1));
    }
  }
}
for (const [id, line] of Object.entries(HELI_RADIO_LINES)) {
  assert(id.startsWith('heli.radio.'), id);
  assert(line.text.length > 10 && !line.text.includes(String.fromCharCode(8212)), id + ' has plain words');
  const cue = HELI_CUES[id];
  assert(cue, id + ' has a cue');
  assert.equal(cue.bus, 'voice');
  assert.equal(cue.file, 'voices/' + line.file);
  assert.equal(cue.volume, line.gain || 1, id + ' plays at its gain');
  const bytes = read('public/assets/audio/' + cue.file);
  const take = read('audio-src/voices/' + line.file);
  assert(bytes.length > 8000, id + ' has a real recording');
  assert.equal(hash(bytes), hash(take), id + ' runtime copy is the kept take');
  const row = catalog.sounds.find(item => item.cue === id);
  assert(row, id + ' has a catalog row');
  assert.equal(row.source, 'elevenlabs');
  assert.equal(row.voiceId, HELI_VOICES[line.voice].voiceId, id + ' is recorded in its own voice');
  assert.deepEqual(row.settings, {stability: .4, similarity_boost: .8, style: .35, use_speaker_boost: true}, id + ' uses the same settings');
  assert.equal(row.text, line.text);
  assert.equal(row.file, 'audio-src/voices/' + line.file);
  assert.equal(row.sha256, hash(take));
  assert(row.license.includes('ElevenLabs'));
}

assert.deepEqual(Object.keys(HELI_LIBRARY_CUES).sort(), [
  'heli.cable.creak', 'heli.engine.start', 'heli.engine.stop', 'heli.hook.release',
  'heli.rotor', 'heli.setdown.thud', 'heli.wind',
  'heli.fire.crackle', 'heli.bucket.scoop', 'heli.bucket.pour', 'heli.bucket.dent', 'heli.fire.hiss',
  'heli.flare', 'heli.snow.dig', 'heli.rescue.clip',
  'heli.survey.click', 'heli.wash', 'heli.winch', ...['moose', 'wolf', 'bear', 'kookaburra', 'cockatoo', 'sheep', 'marmot', 'raven'].map(s => 'heli.animal.' + s)].sort());
assert.deepEqual([...WILDLIFE_CUE_IDS].sort(), Object.keys(HELI_LIBRARY_CUES).filter(id =>
  ['heli.survey.click', 'heli.wash', 'heli.winch'].includes(id) || id.startsWith('heli.animal.')).sort(), 'the eleven wildlife recordings load together');
assert.equal(WILDLIFE_CUE_IDS.length, 11);
assert.deepEqual(Object.keys(HELI_TONE_CUES).sort(), [
  'heli.fuel.low', 'heli.radio.click', 'heli.radio.hiss', 'heli.rotor.low',
  'heli.fire.alert', 'heli.aim.lock', 'heli.badge', 'heli.beacon.beep', 'heli.clock.tick', 'heli.buoy-hit', 'heli.retardant', 'heli.found'].sort());
assert.equal(HELI_CUES['heli.fire.crackle'].volume, .5, 'the crackle sits under the rotor');
// The alert stays no louder than the low-fuel chime: the click cue it was first
// matched to is never played (the radio chain makes its own click).
const peak = id => HELI_CUES[id].volume * Math.max(...HELI_CUES[id].layers.map(layer => layer.volume));
assert(peak('heli.fire.alert') <= peak('heli.fuel.low') && HELI_CUES['heli.fire.alert'].layers.every(layer => layer.type !== 'square'),
  'the alert is no louder than the low-fuel chime');
for (const id of ['heli.fire.alert', 'heli.aim.lock', 'heli.badge'])
  assert(HELI_CUES[id].layers.every(layer => layer.kind === 'tone'), id + ' is made from tones');
assert.deepEqual(HELI_RECIPES.map(spec => spec.id).sort(), Object.keys(HELI_LIBRARY_CUES).sort());
const buses = {
  'heli.rotor': 'engine', 'heli.engine.start': 'engine', 'heli.engine.stop': 'engine',
  'heli.wind': 'ambience', 'heli.radio.hiss': 'ambience',
  'heli.cable.creak': 'vehicle', 'heli.hook.release': 'vehicle', 'heli.setdown.thud': 'vehicle',
  'heli.fuel.low': 'interface', 'heli.rotor.low': 'interface', 'heli.radio.click': 'interface',
  'heli.fire.crackle': 'ambience', 'heli.fire.hiss': 'ambience', 'heli.bucket.scoop': 'vehicle', 'heli.bucket.pour': 'vehicle',
  'heli.bucket.dent': 'vehicle', 'heli.fire.alert': 'interface', 'heli.aim.lock': 'interface', 'heli.badge': 'interface', 'heli.found': 'interface',
  'heli.flare': 'ambience', 'heli.snow.dig': 'vehicle', 'heli.rescue.clip': 'vehicle', 'heli.beacon.beep': 'interface', 'heli.clock.tick': 'interface',
  'heli.survey.click': 'interface', 'heli.wash': 'vehicle', 'heli.winch': 'vehicle',
  ...Object.fromEntries(['moose', 'wolf', 'bear', 'kookaburra', 'cockatoo', 'sheep', 'marmot', 'raven'].map(s => ['heli.animal.' + s, 'ambience'])),
};
// The beeps sit above the rotor (they are the instrument you fly by), the ticks under it.
assert(HELI_CUES['heli.beacon.beep'].volume > HELI_CUES['heli.clock.tick'].volume, 'beeps above ticks');
let libraryBytes = 0;
for (const [id, bus] of Object.entries(buses)) {
  assert.equal(HELI_CUES[id].bus, bus, id + ' bus');
  assert.equal(HELI_CUES[id].loop === true, ['heli.rotor', 'heli.wind', 'heli.radio.hiss',
    'heli.fire.crackle', 'heli.bucket.scoop', 'heli.bucket.pour', 'heli.snow.dig', 'heli.winch'].includes(id), id + ' loop');
}
for (const [id, def] of Object.entries(HELI_LIBRARY_CUES)) {
  const spec = HELI_RECIPES.find(item => item.id === id);
  assert.equal(def.file, heliRuntimeName(spec), id + ' file follows the recipe');
  assert.equal(spec.loop, def.loop === true, id + ' recipe loop matches the cue');
  const bytes = read('public/assets/audio/' + def.file);
  libraryBytes += bytes.length;
  assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
  const row = catalog.sounds.find(item => item.cue === id);
  assert(row, id + ' has a catalog row');
  assert.equal(row.source, 'freesound');
  assert.equal(row.key, spec.source);
  assert(['CC0 1.0', 'CC BY 4.0'].includes(row.license), id + ' has a licence: ' + row.license);
  assert.match(row.page, /^https:\/\/freesound.org\/people\//);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.runtime.file, 'public/assets/audio/' + def.file);
  assert.equal(row.runtime.sha256, hash(bytes));
  assert.equal(row.runtime.bytes, bytes.length);
  const measured = measureLoudness(bytes);
  assert(!measured.available || measured.truePeakDbtp <= -1, id + ' encoded peak');
  if (spec.loop) assert(row.runtime.loopSeam?.pass, id + ' loop seam');
  if (row.license !== 'CC0 1.0') {
    const credits = readFileSync(new URL('public/assets/audio/CREDITS.md', root), 'utf8');
    assert(credits.includes(row.page), id + ' credit is on the credits page');
  }
}
// H4 Rescue's three recordings (about 64 KB) raised the cap from 400 to 480 KB;
// H3 Wildlife's eleven (about 233 KB, loaded only with wildlife) to 720 KB.
assert(libraryBytes < 720 * 1024, 'helicopter library sounds stay small: ' + libraryBytes);
for (const def of Object.values(HELI_TONE_CUES)) assert(def.layers.length > 0 && !def.file, 'made from tones or noise');
for (const [id, def] of Object.entries(HELI_CUES)) {
  assert.equal(def.flag, 'helicopter', id + ' flag');
  for (const field of ['bus', 'volume', 'priority', 'limit', 'pitchRange', 'volumeRange', 'spatial', 'duck'])
    assert(field in def, id + ' carries ' + field);
  assert(def.volume > 0 && def.volume <= 1.5 && def.limit >= 1 && def.priority > 0, id);
}
assert(Object.isFrozen(HELI_CUES));
assert(!/from '\.\.\/sound-bank/.test(readFileSync(new URL('src/heli/heli-audio.js', root), 'utf8')),
  'heli-audio.js does not import the sound bank, which will import it');
for (const type of ['touchdown', 'liftoff', 'lowFuel', 'engineOut', 'lowRotor', 'crash', 'hooked',
  'releasedHigh', 'released', 'setDown', 'drop', 'cargoHit'])
  assert.equal(typeof HELI_EVENT_CUES[type], 'function', type + ' has a sound rule');
for (const type of Object.keys(HELI_EVENT_CUES))
  for (const [id] of HELI_EVENT_CUES[type]({sink: 2, result: 'good'})) assert(HELI_CUES[id], id);

assert.deepEqual(Object.keys(HELI_RADIO_CUES), lineIds, 'one cue per line, in the lines table order');
for (const [type, rule] of Object.entries(HELI_EVENT_LINES))
  for (const result of ['good', 'hard', 'crash']) {
    const line = rule({type, result});
    assert(line === null || HELI_RADIO_LINES[line], type + ' names a real line');
  }

// ---- The radio filter ------------------------------------------------------
assert.equal(RADIO_FILTER.highpass, 300);
assert.equal(RADIO_FILTER.lowpass, 3000);
assert(RADIO_FILTER.drive > 1 && RADIO_FILTER.drive < 6);
assert(RADIO_FILTER.hiss > 0 && RADIO_FILTER.hiss <= .06, 'the hiss is faint');
assert(RADIO_FILTER.clickMs >= 5 && RADIO_FILTER.clickMs <= 40);
assert(Object.isFrozen(RADIO_FILTER));

for (const drive of [.5, 1, RADIO_FILTER.drive, 5]) {
  const curve = softClipCurve(1025, drive);
  assert.equal(curve.length, 1025);
  for (let i = 0; i < curve.length; i++) {
    assert(Math.abs(curve[i]) <= 1, 'bounded');
    assert(Math.abs(curve[i] + curve[curve.length - 1 - i]) < 1e-6, 'odd');
    if (i) assert(curve[i] > curve[i - 1], 'rises all the way');
  }
  assert.equal(curve[512], 0);
  assert.equal(curve[0], -1);
  assert.equal(curve.at(-1), 1);
  assert(curve[700] > (700 / 512 - 1) * 1.0, 'rounds off toward the edges: bends upward faster than a straight line near zero');
}
assert.equal(softClipCurve(2).length, 3, 'a curve always has a middle');

// ---- Rotor and wind --------------------------------------------------------
const base = {rotorPct: 100, weightKg: 1630, airspeedKts: 0, engine: true};
const light = rotorVoice(base), loaded = rotorVoice(base, {loadKg: 1200}), full = rotorVoice(base, {loadKg: 1500});
assert(loaded.rate < light.rate && full.rate < loaded.rate, 'a heavier load sounds deeper');
assert(loaded.gain > light.gain, 'and a little louder');
const slow = rotorVoice({...base, rotorPct: 60}), slower = rotorVoice({...base, rotorPct: 30});
assert(slow.rate < light.rate && slower.rate < slow.rate, 'a slowing rotor falls in pitch');
assert(slower.lowpass < slow.lowpass && slow.lowpass < light.lowpass, 'and dulls');
assert.equal(rotorVoice({...base, rotorPct: 0}).gain, 0, 'silent when the rotor is stopped');
assert.equal(rotorVoice({...base, rotorPct: 1}).gain, 0);
assert.equal(rotorVoice({}).gain, 0, 'a missing readout is silent');
let previousGain = -1;
for (const pct of [0, 1, 2, 3, 5, 10, 20, 35, 60, 100]) {
  const gain = rotorVoice({...base, rotorPct: pct}).gain;
  assert(gain >= previousGain, 'the rotor fades out as it stops: ' + pct);
  previousGain = gain;
}
assert(rotorVoice({...base, rotorPct: 100}, {loadKg: -50}).rate === light.rate, 'a negative load counts as none');
for (const pct of [3, 10, 50, 100, 110, 400]) {
  const voice = rotorVoice({...base, rotorPct: pct}, {loadKg: 3000});
  assert(voice.rate >= .25 && voice.rate <= 1.2 && voice.gain >= 0 && voice.gain <= 1, 'bounded at ' + pct);
}
const speeds = [0, 10, 20, 40, 60, 80, 120].map(knots => windVoice({airspeedKts: knots * 1.943844}));
assert.equal(speeds[0].gain, 0, 'no wind at a standstill');
for (let i = 1; i < 5; i++) assert(speeds[i].gain > speeds[i - 1].gain, 'wind rises with speed');
assert.equal(speeds[5].gain, speeds[4].gain, 'and stops rising at 60 m/s');
assert.equal(speeds[6].gain, speeds[4].gain);
assert(speeds[4].gain <= 1 && speeds[4].rate > speeds[0].rate && speeds[4].lowpass > speeds[0].lowpass);

// ---- A small pretend AudioContext -----------------------------------------
class Param {
  constructor(value = 0) { this.value = value; this.calls = []; }
  setValueAtTime(value, time) { this.value = value; this.calls.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.calls.push(['ramp', value, time]); }
  setTargetAtTime(value, time) { this.value = value; this.calls.push(['target', value, time]); }
  cancelScheduledValues() { this.calls.push(['cancel']); }
}
class FakeNode {
  constructor(context, kind) {
    this.context = context; this.kind = kind; this.targets = [];
    this.gain = new Param(1); this.frequency = new Param(); this.Q = new Param(); this.playbackRate = new Param(1);
    this.started = []; this.stopped = []; this.disconnected = false;
  }
  connect(node) { this.targets.push(node); return node; }
  disconnect() { this.targets = []; this.disconnected = true; }
  start(when = 0) { this.started.push(when); this.context.sources.push(this); }
  stop(when = 0) { this.stopped.push(when); }
  get running() { return this.started.length > 0 && this.stopped.length === 0; }
}
function fakeContext() {
  const context = {currentTime: 0, state: 'running', sampleRate: 8000, nodes: [], sources: [], destination: {kind: 'destination'}};
  const make = kind => () => { const node = new FakeNode(context, kind); context.nodes.push(node); return node; };
  Object.assign(context, {
    createGain: make('gain'), createBiquadFilter: make('biquad'), createWaveShaper: make('shaper'),
    createBufferSource: make('buffer'), createOscillator: make('osc'),
    createBuffer: (channels, length, rate) => ({channels, length, rate, duration: length / rate, data: new Float32Array(length),
      getChannelData() { return this.data; }}),
    decodeAudioData: async bytes => ({decoded: true, duration: bytes.byteLength / 1000}),
  });
  return context;
}
const ofKind = (context, kind) => context.nodes.filter(node => node.kind === kind);

// The chain: two filters, a soft clip, and clicks and hiss on the key.
{
  const context = fakeContext(), out = {kind: 'bus'};
  const chain = createRadioChain(context, out);
  const [high, low] = ofKind(context, 'biquad');
  assert.equal(high.type, 'highpass'); assert.equal(high.frequency.value, 300);
  assert.equal(low.type, 'lowpass'); assert.equal(low.frequency.value, 3000);
  const [shaper] = ofKind(context, 'shaper');
  assert(shaper.curve instanceof Float32Array && shaper.curve.length >= 256);
  assert(chain.input.targets.includes(high) && high.targets.includes(low) && low.targets.includes(shaper));
  assert(chain.output.targets.includes(out), 'the chain ends at the voice bus');
  assert.equal(context.sources.length, 0, 'nothing sounds until the radio keys');
  assert.equal(chain.keyOn(), true);
  assert.equal(context.sources.length, 2, 'a click and the hiss');
  const [click, hiss] = context.sources;
  assert.equal(click.buffer.duration <= .06, true);
  assert.equal(hiss.loop, true);
  assert.equal(chain.keyOn(), false, 'keying twice does nothing');
  assert.equal(chain.keyed, true);
  context.currentTime = 1;
  assert.equal(chain.keyOff(), true);
  assert.equal(context.sources.length, 3, 'a click on the way off');
  assert(hiss.stopped.length > 0, 'the hiss stops');
  assert.equal(chain.keyOff(), false);
  assert.equal(chain.keyed, false);
  chain.keyOn();
  const keyedHiss = context.sources.at(-1);
  chain.dispose();
  assert(keyedHiss.stopped.length > 0, 'dispose stops the hiss');
  assert.equal(chain.keyOn(), false, 'a disposed chain stays quiet');
  assert.equal(chain.input.disconnected, true);
}

// The player.
function setup({flag = true} = {}) {
  const context = fakeContext();
  const buses = Object.fromEntries(['engine', 'vehicle', 'weapons', 'impacts', 'ambience', 'music', 'voice', 'interface']
    .map(name => [name, {kind: 'bus', name, connect() {}, disconnect() {}}]));
  const audio = {context, buses, master: {kind: 'master'}, muted: false, paused: false,
    flags: {enabled: name => name === 'helicopter' && audio.on}, on: flag};
  const requested = [];
  const fetchImpl = async url => {
    requested.push(url);
    const id = Object.entries(HELI_CUES).find(([, def]) => '/assets/audio/' + def.file === url)?.[0];
    const seconds = id?.startsWith('heli.radio.') ? 2 : 3;
    return {ok: true, arrayBuffer: async () => new ArrayBuffer(seconds * 1000)};
  };
  const heli = createHeliAudio({audio, fetchImpl});
  return {context, audio, heli, requested};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const voices = context => context.sources.filter(source => source.buffer?.decoded && source.running);

// Lines come one at a time, in order, through the chain.
{
  const {context, audio, heli, requested} = setup();
  heli.update({rotorPct: 0, engine: false, weightKg: 1630, airspeedKts: 0});
  await flush();
  assert(requested.length >= 7, 'library sounds load on the first update');
  assert(!requested.some(url => url.includes('/voices/')), 'lines load when asked for');
  assert.equal(heli.say('heli.radio.nonsense'), false, 'unknown lines are ignored');
  assert.equal(heli.say('heli.radio.welcome'), true);
  await flush();
  assert.equal(heli.say('heli.radio.controls'), true);
  assert.equal(heli.say('heli.radio.controls'), false, 'a queued line is not queued twice');
  assert.equal(heli.say('heli.radio.liftoff.start'), true);
  await flush();
  assert.equal(voices(context).filter(s => !s.loop).length, 1, 'one line at a time');
  assert.equal(heli.subtitle().id, 'heli.radio.welcome');
  assert.equal(heli.subtitle().text, HELI_RADIO_LINES['heli.radio.welcome'].text);
  assert.deepEqual(heli.queued, ['heli.radio.controls', 'heli.radio.liftoff.start']);
  assert(heli.busy);
  const first = voices(context)[0];
  assert.equal(first.targets[0].targets.length, 1, 'the line passes through one gain');
  // The line is wired into the radio chain, which is wired to the voice bus.
  const chainInput = first.targets[0].targets[0];
  assert.equal(chainInput.kind, 'gain');
  assert(ofKind(context, 'shaper').length === 1);
  // It ends; a breath later the next line starts.
  first.stopped.push(0);
  first.onended();
  assert.equal(heli.subtitle(), null);
  heli.update();
  assert.equal(voices(context).filter(s => !s.loop).length, 0, 'the radio is quiet for a breath between lines');
  context.currentTime += .5;
  heli.update();
  await flush();
  assert.equal(heli.subtitle().id, 'heli.radio.controls');
  assert.equal(voices(context).filter(s => !s.loop && s.stopped.length === 0).length, 1, 'only the second line sounds');
  // Skip.
  assert.equal(heli.skip(), true);
  context.currentTime += .5;
  heli.update();
  await flush();
  assert.equal(heli.subtitle().id, 'heli.radio.liftoff.start', 'skip moves on to the next line');
  assert.equal(heli.skip(), true);
  assert.equal(heli.skip(), false, 'nothing left to skip');
  // A line just said is not repeated at once.
  assert.equal(heli.say('heli.radio.controls'), false);
  context.currentTime += 10;
  assert.equal(heli.say('heli.radio.controls'), true);
  heli.clearRadio();
  assert.equal(heli.busy, false);
  // A line running out of time frees the radio even if the browser never reports its end.
  context.currentTime += 10;
  assert.equal(heli.say('heli.radio.retry'), true);
  await flush();
  assert.equal(heli.subtitle().id, 'heli.radio.retry');
  context.currentTime += 5;
  heli.update();
  assert.equal(heli.subtitle(), null, 'the radio frees itself when the line has run its length');
  heli.dispose();
}

// Lines wait for no sound when the game is muted, paused or switched off.
{
  const {audio, heli} = setup();
  audio.muted = true;
  assert.equal(heli.say('heli.radio.welcome'), false);
  audio.muted = false; audio.paused = true;
  assert.equal(heli.say('heli.radio.welcome'), false);
  audio.paused = false; audio.on = false;
  assert.equal(heli.say('heli.radio.welcome'), false, 'switch off');
  audio.on = true; audio.context.state = 'suspended';
  assert.equal(heli.say('heli.radio.welcome'), false);
  heli.dispose();
}
{
  const unset = createHeliAudio({audio: {context: fakeContext(), flags: {enabled() { throw Error('Unknown feature'); }}}});
  assert.equal(unset.say('heli.radio.welcome'), false, 'until the switch exists, nothing plays');
  unset.update({rotorPct: 100});
  unset.dispose();
}

// Rotor and wind follow the readout; engine start and stop follow the engine.
{
  const {context, audio, heli} = setup();
  const readout = {rotorPct: 0, engine: false, weightKg: 1630, airspeedKts: 0};
  heli.update(readout);
  await flush();
  heli.update(readout);
  assert.equal(voices(context).length, 0, 'a stopped rotor makes no sound');
  heli.update({...readout, engine: true});
  await flush();
  const starts = voices(context);
  assert.equal(starts.length, 1, 'the engine start sounds when the engine turns on');
  heli.update({...readout, engine: true, rotorPct: 100});
  const rotor = voices(context).filter(s => s.loop);
  assert.equal(rotor.length, 1, 'the rotor loop starts');
  const rate = rotor[0].playbackRate.value;
  heli.update({...readout, engine: true, rotorPct: 100}, {loadKg: 1400});
  assert(rotor[0].playbackRate.value < rate, 'the loop deepens with the load');
  heli.update({...readout, engine: true, rotorPct: 50}, {loadKg: 1400});
  assert(rotor[0].playbackRate.value < rate * .9, 'and slows with the rotor');
  assert.equal(voices(context).filter(s => s.loop).length, 1, 'wind waits for airspeed');
  heli.update({...readout, engine: true, rotorPct: 100, airspeedKts: 80});
  assert.equal(voices(context).filter(s => s.loop).length, 2, 'wind joins the rotor');
  // Engine off: the stop sound plays.
  const before = context.sources.length;
  heli.update({...readout, engine: false, rotorPct: 100, airspeedKts: 0});
  assert.equal(context.sources.length, before + 1, 'the engine stop sounds');
  heli.update({...readout, engine: false, rotorPct: 0});
  assert.equal(voices(context).filter(s => s.loop).length, 0, 'loops end when the rotor stops');
  // Switching the game off stops everything.
  heli.update({...readout, engine: true, rotorPct: 100});
  assert(voices(context).some(s => s.loop));
  audio.on = false;
  heli.update({...readout, engine: true, rotorPct: 100});
  assert.equal(voices(context).filter(s => s.loop).length, 0, 'switch off stops the loops');
  heli.dispose();
}

// Events make their sounds; a crash silences the loops until the next start.
{
  const {context, audio, heli} = setup();
  const readout = {rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 30};
  heli.update({...readout, engine: false});
  await flush();
  heli.update(readout);
  await flush();
  const count = () => context.sources.length;
  const fire = (event, state) => { const before = count(); heli.event(event, state); return count() - before; };
  assert.equal(fire({type: 'liftoff'}), 0, 'lift-off is carried by the loops');
  assert.equal(fire({type: 'unknownThing'}), 0);
  assert.equal(fire(null), 0);
  assert(fire({type: 'hooked'}) >= 1);
  assert(fire({type: 'released'}) >= 1);
  assert(fire({type: 'releasedHigh'}) >= 1);
  assert(fire({type: 'setDown'}) >= 1);
  assert(fire({type: 'drop'}) >= 1);
  assert(fire({type: 'cargoHit'}) >= 2, 'a creak and a thud');
  const soft = {type: 'touchdown', sink: .5, result: 'good'}, hard = {type: 'touchdown', sink: 2.5, result: 'hard'};
  assert.equal(fire(soft), 1);
  assert.equal(fire(hard), 1);
  const thuds = context.sources.slice(-2).map(source => source.targets[0].gain.value);
  assert(thuds[1] > thuds[0], 'a hard landing is louder');
  const same = {type: 'drop'};
  heli.event(same);
  const after = count();
  heli.event(same);
  assert.equal(count(), after, 'one event sounds once');
  // The chime and the horn are tones.
  const tonesBefore = ofKind(context, 'osc').length;
  heli.event({type: 'lowFuel', fuelKg: 50});
  assert.equal(ofKind(context, 'osc').length - tonesBefore, HELI_TONE_CUES['heli.fuel.low'].layers.length);
  const horns = ofKind(context, 'osc').length;
  heli.event({type: 'lowRotor'});
  assert.equal(ofKind(context, 'osc').length - horns, HELI_TONE_CUES['heli.rotor.low'].layers.length);
  heli.event({type: 'lowRotor'});
  assert.equal(ofKind(context, 'osc').length - horns, HELI_TONE_CUES['heli.rotor.low'].layers.length, 'the horn is not repeated at once');
  // The instructor reacts to a hard landing and a low fuel warning.
  await flush();
  assert(heli.busy || heli.subtitle(), 'the instructor speaks after the warnings');
  heli.clearRadio();
  // Crash, the way the session sends it: a touchdown event and a crash event, the
  // engine still on, the readout frozen; then a respawn that announces itself.
  assert.equal(fire({type: 'touchdown', result: 'crash', sink: 6}), 0, 'a crash on touchdown sounds once');
  assert(fire({type: 'crash', cause: 'touchdown'}) >= 1, 'from the crash event');
  heli.update(readout);
  heli.update(readout);
  assert.equal(voices(context).filter(s => s.loop).length, 0, 'loops stay off after a crash');
  heli.event({type: 'entered', courseId: 'tremblant-woods', arrived: false});
  heli.update(readout);
  assert(voices(context).filter(s => s.loop).length >= 1, 'the entered event brings the rotor back');
  // Without that event, a readout that is no longer the frozen one does the same.
  fire({type: 'crash', cause: 'rotor'});
  heli.update(readout);
  heli.update(readout);
  assert.equal(voices(context).filter(s => s.loop).length, 0, 'a second crash silences them again');
  heli.update({...readout, fuelKg: 123});
  assert(voices(context).filter(s => s.loop).length >= 1, 'a fresh readout brings them back');
  // Several events at once.
  heli.event([{type: 'setDown'}, {type: 'released'}]);
  heli.dispose();
}

// The beacon's beep: rate sets its pitch (900 to 1,400 Hz from the 1,000 Hz cue).
{
  const {context, heli} = setup();
  heli.update({rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 0});
  await flush();
  const pitch = rate => {
    const before = ofKind(context, 'osc').length;
    heli.play('heli.beacon.beep', {rate});
    return ofKind(context, 'osc').slice(before).map(node => node.frequency.calls.find(call => call[0] === 'set')?.[1]);
  };
  assert.deepEqual(pitch(1.4), [1400], 'on top of the beacon: 1,400 Hz');
  context.currentTime += 1;
  assert.deepEqual(pitch(.9), [900], 'at the edge of range: 900 Hz');
  context.currentTime += 1;
  assert.deepEqual(pitch(undefined), [1000], 'no rate plays the cue as made');
  heli.dispose();
}

// A flight loads its own sounds; the wildlife recordings only when asked.
{
  const {heli, requested} = setup();
  await heli.load();
  const wildFiles = WILDLIFE_CUE_IDS.map(id => '/assets/audio/' + HELI_CUES[id].file);
  assert(!requested.some(url => wildFiles.includes(url)), 'an ordinary flight never fetches the wildlife sounds');
  await heli.preloadWildlife();
  assert.deepEqual(wildFiles.filter(url => requested.includes(url)).sort(), [...wildFiles].sort(), 'preloadWildlife fetches all eleven');
  heli.dispose();
}

// The mission loops: the winch and the snow dig hold while their level is up.
{
  const {context, heli} = setup();
  const readout = {rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 0};
  heli.update(readout);
  await heli.preloadWildlife();
  await heli.load(['heli.snow.dig']);
  await flush();
  const before = voices(context).filter(s => s.loop).length;
  heli.missionBeds({winch: 1, dig: .6});
  assert.equal(voices(context).filter(s => s.loop).length, before + 2, 'the winch and the dig loop start');
  heli.missionBeds({winch: 1, dig: .6});
  assert.equal(voices(context).filter(s => s.loop).length, before + 2, 'and hold, never doubled');
  heli.missionBeds({});
  await flush();
  heli.missionBeds({});
  assert(voices(context).filter(s => s.loop).length <= before, 'a level of 0 lets them go');
  heli.dispose();
}

// Dispose stops everything and nothing sounds afterward.
{
  const {context, audio, heli} = setup();
  const readout = {rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 60};
  heli.update({...readout, engine: false});
  await flush();
  heli.update(readout);
  heli.say('heli.radio.welcome');
  await flush();
  assert(voices(context).length >= 3, 'a line and two loops are sounding');
  heli.dispose();
  assert.equal(voices(context).length, 0, 'dispose stops every voice');
  assert(ofKind(context, 'osc').every(node => node.stopped.length > 0));
  const total = context.sources.length;
  heli.update(readout);
  heli.event({type: 'drop'});
  assert.equal(heli.say('heli.radio.retry'), false);
  assert.equal(heli.play('heli.setdown.thud'), null);
  await heli.load();
  assert.equal(context.sources.length, total, 'a disposed player stays silent');
  heli.dispose();
}

// A new audio context starts the player over.
{
  const {audio, heli} = setup();
  heli.update({rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 0});
  await flush();
  heli.update({rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 0});
  const old = audio.context;
  assert(voices(old).some(source => source.loop), 'the rotor loop is sounding on the first context');
  audio.context = fakeContext();
  const hum = {rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 0};
  heli.update(hum);
  await flush();
  heli.update(hum);
  assert(voices(audio.context).some(source => source.loop), 'the loops start again on the new context');
  assert.equal(voices(old).length, 0, 'the old context is left quiet');
  heli.dispose();
}

// A file that will not load is asked for once, not every frame.
{
  const {audio} = setup();
  const urls = [];
  const heli = createHeliAudio({audio, fetchImpl: async url => {
    urls.push(url);
    return url.endsWith('rotor.ogg') ? {ok: false} : {ok: true, arrayBuffer: async () => new ArrayBuffer(3000)};
  }});
  const readout = {rotorPct: 100, engine: true, weightKg: 1630, airspeedKts: 40};
  for (let frame = 0; frame < 8; frame++) { heli.update(readout); await flush(); }
  assert.equal(urls.filter(url => url.endsWith('rotor.ogg')).length, 1, 'the missing rotor file is fetched once');
  assert(voices(audio.context).some(source => source.loop), 'the wind still plays');
  heli.dispose();
}

// A parked helicopter with a stopped rotor is silent.
{
  const {context, heli} = setup();
  const stopped = {rotorPct: 0, engine: false, weightKg: 1630, airspeedKts: 0};
  for (let frame = 0; frame < 4; frame++) { heli.update(stopped); await flush(); }
  assert.equal(voices(context).length, 0, 'nothing sounds on a parked helicopter with a stopped rotor');
  heli.dispose();
}

// Nothing in the recorded files is silent or clipped beyond the build's own checks.
for (const [id, def] of Object.entries(HELI_LIBRARY_CUES))
  assert(statSync(new URL('public/assets/audio/' + def.file, root)).size > 4000, id + ' is a real sound');
assert(existsSync(new URL('tools/audio/build-heli.mjs', root)));
console.log('Helicopter audio checks passed.');
