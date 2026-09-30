import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { EngineAudio, combatAudioSpace } from '../src/audio.js';
import { SOUND_BANK } from '../src/sound-bank.js';

// CRASH-02 audio and EGG-03 audio (Claude, 26 September 2026): a smash sounds
// as hard as the hit, from where it happened; the Muddy Hollow pond splashes
// and its mud squelches and churns.
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

function makeAudio(enabled = ['muddy-hollow']) {
  const audio = new EngineAudio({ flags: { enabled: name => enabled.includes(name) } });
  const calls = [];
  audio.context = { state: 'running', currentTime: 10 };
  audio.muted = false; audio.paused = false;
  audio._syncMixer = () => {};
  audio._spatialOutput = event => ({ level: {}, space: combatAudioSpace(event,
    { s: 0, lateral: 0 }, { groundAt: () => ({ x: 0, y: 0, z: 0, heading: 0 }) }),
    disconnect: () => {} });
  audio._playCue = (id, options = {}) => { calls.push({ id, scale: options.scale ?? 1 }); return {}; };
  audio._recordedImpact = id => { calls.push({ id, recorded: true }); return {}; };
  audio._runCue = id => { calls.push({ id, synth: true }); return {}; };
  audio.context.createBiquadFilter = () => ({ type: '', frequency: { value: 0 }, Q: { value: 0 },
    connect() {}, disconnect() {} });
  return { audio, calls };
}
const smash = (dvMph, point = { x: 30, z: 0 }) => ({ vehicleSmash: { severity: 'smashed',
  dvMph, point, traffic: true } });

// Cues and files.
for (const id of ['vehicle.crash-impact', 'world.muddy-hollow-splash', 'world.muddy-hollow-mud']) {
  check(SOUND_BANK[id], `${id} is in the sound bank`);
}
check(SOUND_BANK['vehicle.crash-impact'].flag === undefined &&
  SOUND_BANK['vehicle.crash-impact'].buffersFrom === 'vehicle.crash.recorded',
'the permanent smash reuses the recorded crashes without a switch');
for (const id of ['world.muddy-hollow-splash', 'world.muddy-hollow-mud']) {
  check(SOUND_BANK[id].flag === 'muddy-hollow', `${id} is behind the muddy-hollow switch`);
  for (const file of SOUND_BANK[id].files)
    check(existsSync(new URL(`../public/assets/audio/${file}`, import.meta.url)), `${file} exists`);
}
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
for (const key of ['442773', '462117', '389460']) {
  const entry = catalog.sounds.find(sound => sound.key === key);
  check(entry && entry.license === 'CC0 1.0' && entry.processing?.script === 'tools/audio/build-hollow.mjs',
    `Freesound ${key} is catalogued as CC0 with its build recipe`);
}
const credits = readFileSync(new URL('../public/assets/audio/CREDITS.md', import.meta.url), 'utf8');
for (const name of ['qubodup', 'barion', 'lzmraul']) check(credits.includes(name), `${name} is credited`);

// Smash impacts scale with the change in velocity and come from the hit.
{
  const { audio, calls } = makeAudio();
  audio.event(smash(12), {}, null);
  audio.context.currentTime += 1;
  audio.event(smash(48), {}, null);
  const hits = calls.filter(call => call.id === 'vehicle.crash-impact');
  check(hits.length === 2, 'each smash plays one impact');
  check(hits[1].scale > hits[0].scale * 1.6, `a 48 mph hit is much louder than a 12 mph hit (${hits.map(h => h.scale.toFixed(2))})`);
  check(hits[0].scale >= .35 && hits[1].scale <= 1.4, 'impact loudness stays in its range');
  const space = combatAudioSpace(smash(20, { x: 60, z: 0 }), { s: 0, lateral: 0 },
    { groundAt: () => ({ x: 0, y: 0, z: 0, heading: 0 }) });
  check(space.distance > 55 && space.pan > .3, 'the impact is placed at the hit, to the side');
}
{
  const { audio, calls } = makeAudio([]);
  audio.event(smash(40), {}, null);
  check(calls.filter(call => call.id === 'vehicle.crash-impact').length === 1,
    'released smash sound plays with every development switch off');
}
{
  const { audio, calls } = makeAudio();
  audio.event({ crash: true, strength: 1 }, { mode: 'duel' }, null);
  audio.event(smash(40), {}, null);
  check(!calls.some(call => call.id === 'vehicle.crash-impact'),
    'the same collision does not play a second crash on top of the player crash');
}

// Pond splashes scale with speed.
{
  const { audio, calls } = makeAudio();
  audio.event({ muddyHollowSplash: { depth: .6, speedMph: 12, position: { x: 0, y: 0, z: 0 } } }, {}, null);
  audio.event({ muddyHollowSplash: { depth: .6, speedMph: 55, position: { x: 0, y: 0, z: 0 } } }, {}, null);
  const splashes = calls.filter(call => call.id === 'world.muddy-hollow-splash');
  check(splashes.length === 2 && splashes[1].scale > splashes[0].scale, 'a faster entry splashes louder');
}

// Mud: a squelch on entering, splats while the wheels spin, a churn loop.
{
  const { audio, calls } = makeAudio();
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  audio.mud = { filter: { frequency: param() }, gain: { gain: param() } };
  const st = { status: 'exploring', paused: false, airborne: false, airHeight: 0,
    speedMph: 30, surfaceMud: 0, mudWheelSpin: 0 };
  audio._updateMud(st, 10, true);
  check(!calls.length && audio.mud.gain.gain.value === 0, 'dry ground: silent');
  st.surfaceMud = .8;
  audio._updateMud(st, 10.05, true);
  check(calls.filter(call => call.id === 'world.muddy-hollow-mud').length === 1, 'entering mud squelches once');
  check(audio.mud.gain.gain.value > 0, 'driving in mud churns');
  audio._updateMud(st, 10.1, true);
  check(calls.filter(call => call.id === 'world.muddy-hollow-mud').length === 1, 'no repeat squelch while cruising');
  st.mudWheelSpin = .8;
  for (let t = 10.2; t < 11.2; t += .05) audio._updateMud(st, t, true);
  const splats = calls.filter(call => call.id === 'world.muddy-hollow-mud').length - 1;
  check(splats >= 2 && splats <= 4, `spinning wheels splat a few times a second (${splats})`);
  st.surfaceMud = 0;
  audio._updateMud(st, 11.3, true);
  check(audio.mud.gain.gain.value === 0, 'leaving the mud stops the churn');
  const off = makeAudio([]);
  off.audio.mud = { filter: { frequency: param() }, gain: { gain: param() } };
  off.audio._updateMud({ ...st, surfaceMud: 1 }, 10, true);
  check(!off.calls.length && off.audio.mud.gain.gain.value === 0, 'switch off: no mud sound');
}

console.log(`Crash and Muddy Hollow audio: ${checks} checks passed.`);
