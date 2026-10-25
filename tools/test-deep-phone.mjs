// DEEP-RADIO: Ana's sixteen lines on the through-water phone and the phone chain
// (docs/THE_DEEP.md section 6.7).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {DEEP_PHONE_LINES, DEEP_PHONE_CUES, DEEP_PHONE_VOICE} from '../src/deep/deep-phone-lines.js';
import {createDeepPhoneChain, bubbleBedSamples, warbleSwingSeconds, DEEP_PHONE_WARBLE, DEEP_PHONE_BED, DEEP_PHONE_FILTER} from '../src/deep/deep-phone.js';
import {HELI_RADIO_VOICE, RADIO_FILTER} from '../src/lessons/radio-voice.js';
import {DRIVE_RADIO_LINES} from '../src/lessons/drive-radio-lines.js';
import {SOUND_BANK, BUS_NAMES} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';
import {copyDeepPhoneVoices} from './audio/build-deep-phone.mjs';
import {decodeMono, renderThroughChain, measureSamples} from './audio/render-deep-phone.mjs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); checks++; };
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(read('tools/audio/catalog.json'));

// Every line in the design has a take, with the design's exact words.
const design = String(read('docs/THE_DEEP.md'));
const section = design.slice(design.indexOf('### 6.7'), design.indexOf('### 6.8'));
const table = Object.fromEntries([...section.matchAll(/^\| `(deep\.ana\.[a-z]+)` \| (.+?) \|$/gm)].map(m => [m[1], m[2]]));
same(Object.keys(table).length, 16, 'the design lists sixteen lines');
same(Object.fromEntries(Object.entries(DEEP_PHONE_LINES).map(([id, line]) => [id, line.text])), table, 'the lines match the design word for word');
ok(Object.values(DEEP_PHONE_LINES).every(line => !/credit|price|dollar|\$/i.test(line.text)), 'no line names a price');

// A fourth voice: Bella, warm, not used by anyone else in the catalog.
ok(DEEP_PHONE_VOICE.voiceId !== HELI_RADIO_VOICE.voiceId, 'not the helicopter radio or the instructor');
const others = new Set(catalog.sounds.filter(row => row.source === 'elevenlabs' && !row.cue?.startsWith('deep.ana.')).map(row => row.voiceId));
ok(!others.has(DEEP_PHONE_VOICE.voiceId), 'no crew member, radio or instructor uses her voice');
ok(others.size >= 3, 'the other voices were found for the comparison');

// One kept take per line: catalog record, hash, runtime copy, the same settings as the helicopter lines.
const heliSettings = catalog.sounds.find(row => row.cue === 'heli.radio.liftoff.hold').settings;
let creditsUsed = 0, runtimeBytes = 0;
for (const [id, line] of Object.entries(DEEP_PHONE_LINES)) {
  const records = catalog.sounds.filter(row => row.cue === id);
  same(records.length, 1, `${id}: one catalog record`);
  const [record] = records;
  ok(record.source === 'elevenlabs' && record.text === line.text && record.file === `audio-src/voices/${line.file}`, `${id}: text and file recorded`);
  ok(record.voiceId === DEEP_PHONE_VOICE.voiceId && record.model === 'eleven_multilingual_v2', `${id}: Bella, same model`);
  same(record.settings, heliSettings, `${id}: the helicopter lines' settings`);
  const take = read(record.file), runtime = `public/assets/audio/voices/${line.file}`;
  same(sha(take), record.sha256, `${id}: the kept take matches its hash`);
  ok(existsSync(new URL(runtime, root)) && sha(read(runtime)) === record.sha256, `${id}: the runtime file is the kept take, unchanged`);
  creditsUsed += record.creditsUsed; runtimeBytes += take.length;
}
ok(creditsUsed > 0 && creditsUsed <= 2000, `voice credits within budget (${creditsUsed})`);
ok(runtimeBytes < 1.5e6, `the sixteen lines stay small (${runtimeBytes} bytes)`);
same(copyDeepPhoneVoices().lines, 16, 'the build step finds all sixteen kept takes');

// The bank: sixteen cues behind the-deep, on the voice bus, playing like the helicopter's radio.
same(Object.keys(DEEP_PHONE_CUES).length, 16, 'sixteen phone cues');
const heli = SOUND_BANK['heli.radio.liftoff.hold'];
for (const [id, cue] of Object.entries(DEEP_PHONE_CUES)) {
  ok(SOUND_BANK[id] === cue, `${id}: in the sound bank`);
  ok(cue.flag === 'the-deep' && BUS_NAMES.includes(cue.bus), `${id}: behind its switch on a real bus`);
  same({bus: cue.bus, priority: cue.priority, limit: cue.limit, duck: cue.duck}, {bus: heli.bus, priority: heli.priority, limit: heli.limit, duck: heli.duck},
    `${id}: plays like the helicopter's radio lines`);
}

// Start-up loading leaves the phone lines out, with the switch off or on: the Deep loads its own sounds.
const phoneFiles = new Set(Object.values(DEEP_PHONE_CUES).map(cue => '/assets/audio/' + cue.file));
for (const on of [false, true]) {
  const audio = Object.create(EngineAudio.prototype), requested = [];
  Object.assign(audio, {flags: {enabled: name => on && name === 'the-deep'}, cueBuffers: {},
    context: {decodeAudioData: async () => ({}), state: 'running'}, muted: false, paused: false});
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async url => { requested.push(url); return {ok: true, arrayBuffer: async () => new ArrayBuffer(1)}; };
  try { await audio._loadCueBuffers(); } finally { globalThis.fetch = fetchBefore; }
  ok(requested.length > 0, `start-up loads the ordinary cues (switch ${on ? 'on' : 'off'})`);
  ok(!requested.some(url => phoneFiles.has(url)), `start-up loads no phone line (switch ${on ? 'on' : 'off'})`);
}

// The warble: about 0.3% at about 2 Hz. The pitch changes fastest at 2*pi*f*swing.
same([DEEP_PHONE_WARBLE.hz, DEEP_PHONE_WARBLE.depth], [2, .003], 'the warble is 0.3% at 2 Hz');
near(2 * Math.PI * DEEP_PHONE_WARBLE.hz * warbleSwingSeconds(), .003, 1e-9, 'the delay swing gives a 0.3% pitch wobble');
ok(warbleSwingSeconds() < .001 && DEEP_PHONE_WARBLE.baseDelay > warbleSwingSeconds() * 2, 'the delay stays positive');
ok(DEEP_PHONE_FILTER.lowpass < RADIO_FILTER.lowpass && DEEP_PHONE_FILTER.highpass === RADIO_FILTER.highpass, 'the phone is the radio filter, a little duller');

// The bubble bed: repeatable, peak exactly one, a real mix of quiet and loud, no jump at the loop seam.
{
  const a = bubbleBedSamples(48000), b = bubbleBedSamples(48000);
  ok(a.every((value, index) => value === b[index]), 'the bed is the same every time');
  same(a.length, 48000 * DEEP_PHONE_BED.seconds, 'the bed is four seconds');
  near(a.reduce((top, value) => Math.max(top, Math.abs(value)), 0), 1, 1e-6, 'the bed peaks at exactly one');
  let sumSquares = 0;
  for (const value of a) sumSquares += value * value;
  const rms = Math.sqrt(sumSquares / a.length);
  ok(rms > .02 && rms < .3, `sparse bubbles, not a wall of noise (rms ${rms.toFixed(3)})`);
  let biggestStep = 0;
  for (let index = 0; index < a.length; index++) biggestStep = Math.max(biggestStep, Math.abs(a[(index + 1) % a.length] - a[index]));
  ok(biggestStep < .5, `no jump at the loop seam or inside it (${biggestStep.toFixed(3)})`);
  ok(DEEP_PHONE_BED.level <= .1, 'the bed is soft');
}

// The chain's graph, with a recording context: input -> warble delay -> radio chain; the slow
// oscillator drives the delay time; the bed joins beside the voice; key on and off start and fade it.
{
  const nodes = [];
  const param = (value = 0) => ({value, events: [], setValueAtTime(v, t) { this.events.push(['set', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); }, cancelScheduledValues() {}});
  const make = (kind, extra = {}) => { const node = {kind, connected: [], stopped: false, started: false, connect(to) { this.connected.push(to); return to; }, disconnect() { this.disconnected = true; }, ...extra}; nodes.push(node); return node; };
  const context = {
    sampleRate: 48000, currentTime: 0,
    createGain: () => make('gain', {gain: param(1)}),
    createDelay: max => make('delay', {max, delayTime: param(0)}),
    createOscillator: () => make('osc', {frequency: param(440), start() { this.started = true; }, stop() { this.stopped = true; }}),
    createBiquadFilter: () => make('biquad', {frequency: param(350), Q: param(1)}),
    createWaveShaper: () => make('shaper'),
    createBuffer: (channels, length) => { const data = new Float32Array(length); return {length, getChannelData: () => data}; },
    createBufferSource: () => make('source', {start() { this.started = true; }, stop() { this.stopped = true; }}),
  };
  const destination = {kind: 'destination'};
  const phone = createDeepPhoneChain(context, destination);
  const delay = nodes.find(node => node.kind === 'delay'), osc = nodes.find(node => node.kind === 'osc');
  ok(osc.started && osc.type === 'sine' && osc.frequency.value === DEEP_PHONE_WARBLE.hz, 'the slow oscillator runs at the warble rate');
  ok(delay.delayTime.value === DEEP_PHONE_WARBLE.baseDelay, 'the delay sits at its base time');
  const swing = osc.connected[0];
  ok(swing.kind === 'gain' && swing.gain.value === warbleSwingSeconds() && swing.connected.includes(delay.delayTime), 'the oscillator swings the delay time by the warble depth');
  ok(phone.input.connected.includes(delay), 'the voice enters through the warble');
  const bed = nodes.filter(node => node.kind === 'gain' && node.gain.value === 0).at(-1);
  ok(bed && bed.connected.length === 1, 'the bed has its own level, starting silent');
  same([phone.keyed, phone.keyOn(), phone.keyed], [false, true, true], 'key on');
  const source = nodes.filter(node => node.kind === 'source').find(node => node.connected.includes(bed));
  ok(source && source.started && source.loop === true, 'the looping bubble bed starts');
  ok(bed.gain.events.some(([kind, value]) => kind === 'ramp' && value === DEEP_PHONE_BED.level), 'the bed fades in to its level');
  ok(phone.keyOn() === false, 'a second key on does nothing');
  same([phone.keyOff(), phone.keyed], [true, false], 'key off');
  ok(bed.gain.events.some(([kind, value]) => kind === 'ramp' && value === 0), 'the bed fades out');
  ok(source.stopped, 'the bubble source is stopped');
  ok(phone.keyOff() === false, 'a second key off does nothing');
  phone.keyOn();
  phone.dispose(); phone.dispose();
  ok(osc.stopped && delay.disconnected, 'dispose stops the oscillator and releases the nodes');
  ok(phone.keyOn() === false, 'a disposed phone stays quiet');
}

const PHONE_TARGET_LUFS = -14.7;
// The Node render: every line through the chain. Peaks of the takes at most -1 dBTP, and the phone plays at
// the level of the helicopter's radio and the instructor's (the same chain), within 2 LU on average.
{
  const load = file => decodeMono(readFileSync(new URL('public/assets/audio/voices/' + file, root)));
  const average = list => list.reduce((sum, value) => sum + value, 0) / list.length;
  const ana = Object.values(DEEP_PHONE_LINES).map(line => {
    const samples = load(line.file), take = measureSamples(samples), phone = measureSamples(renderThroughChain(samples.map(value => value * line.volume)));
    ok(take.available && take.truePeakDbtp <= -1, `${line.file}: take peak ${take.truePeakDbtp} dBTP is under -1`);
    ok(phone.available && Number.isFinite(phone.integratedLufs) && Number.isFinite(phone.truePeakDbtp), `${line.file}: renders through the phone`);
    near(phone.integratedLufs, PHONE_TARGET_LUFS, 0.5, `${line.file}: leaves the phone at the target level`);
    return {take, phone};
  });
  ok(Object.entries(DEEP_PHONE_LINES).every(([id, line]) => line.volume > 0 && line.volume <= 1 && DEEP_PHONE_CUES[id].volume === line.volume), 'each cue plays at its fitted level');
  const plain = {warble: null, bed: null, filter: RADIO_FILTER};
  const radioLevel = files => average(files.map(file => measureSamples(renderThroughChain(load(file), plain)).integratedLufs));
  const heliFiles = catalog.sounds.filter(row => row.cue?.startsWith('heli.radio.') && row.file?.startsWith('audio-src/voices/')).map(row => row.file.split('/').pop());
  ok(heliFiles.length >= 8, 'helicopter radio takes found for the comparison');
  const driveFiles = Object.values(DRIVE_RADIO_LINES).map(line => line.file);
  const phoneLevel = average(ana.map(item => item.phone.integratedLufs));
  near(phoneLevel, radioLevel(heliFiles), 1.5, 'the phone plays at the helicopter radio level');
  near(phoneLevel, radioLevel(driveFiles), 1.5, 'the phone plays at the instructor level');
}

console.log(`test-deep-phone: ${checks} checks passed (${creditsUsed} voice credits, ${runtimeBytes} bytes)`);
