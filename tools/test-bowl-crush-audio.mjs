// BOWL-SOUND-CRUSH (Claude, 20 November 2026): a crush in the Bowl is a set of sounds, not one. Each of the nine
// cues is in the bank with its recorded takes; two car crushes in a row never play the same take; a bus, a stack, a
// pancake and a second run over a wreck each sound their own way; any other course keeps the old crush; and the
// sound reads the race without changing it.
// test-reads: public/assets/audio/bowl/ tools/audio/catalog.json tools/audio/build-bowl-crush.mjs src/bowl/bowl-lines.js
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {BOWL_SOUND_CUES, bowlCrushCues, bowlCrushKind} from '../src/bowl/bowl-lines.js';
import {BOWL_CRUSH_FILES} from './audio/build-bowl-crush.mjs';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const CUES = ['car', 'bus', 'stack', 'glass', 'groan', 'off', 'flat', 'pancake', 'ooh'].map(name => `bowl.crush.${name}`);

// The bank, the files and their recipes.
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
for (const id of CUES) {
  const cue = SOUND_BANK[id];
  check(cue && cue.flag === 'titan-bowl', `${id} is in the bank behind titan-bowl`);
  check(BOWL_SOUND_CUES[id] === id, `${id} is named among the Show Night sounds`);
  assert.deepEqual(cue.files, BOWL_CRUSH_FILES[id], `${id} plays the takes its recipe builds`);
  for (const file of cue.files) {
    const path = new URL(`../public/assets/audio/${file}`, import.meta.url);
    check(existsSync(path) && statSync(path).size < 60000, `${file} is a small compressed take`);
    const row = catalog.sounds.find(item => item.cue === id && item.runtime?.some?.(take => take.file === `public/assets/audio/${file}`));
    check(row?.license === 'CC0 1.0' && Number.isFinite(row.runtime.find(take => take.file.endsWith(file)).integratedLufs),
      `${file} has a CC0 recipe with its measured loudness`);
  }
}
check(SOUND_BANK['bowl.crush.car'].files.length === 4, 'the car bite has four takes');
check(!catalog.sounds.some(row => row.cue === 'bowl.crush.candidate'), 'no candidate rows are left in the catalog');

// Which sounds a crush makes.
check(['junkCar', 'bowlBus', 'bowlRv', 'bowlBurningHeap', 'busPile'].map(bowlCrushKind).join() === 'car,bus,bus,stack,pile',
  'each piece of the line is a car, a bus, a stack or the pile');
const names = cues => cues.map(item => item.cue.slice(11)).join();
check(names(bowlCrushCues({kind: 'junkCar'})) === 'car,glass', 'a car: the bite, then the windows');
check(names(bowlCrushCues({kind: 'bowlRv'})) === 'bus,glass,ooh', 'the RV: the deep bite, the windows and the crowd');
check(names(bowlCrushCues({kind: 'bowlBurningHeap'})) === 'stack,ooh', 'a burning stack has no windows');
check(names(bowlCrushCues({kind: 'busPile'})) === 'bus,glass,ooh', 'the Bus Pile sounds like its buses, with the crowd');
check(names(bowlCrushCues({kind: 'junkCar', pancake: true})) === 'pancake,glass', 'a pancake on a car is the heavier bite');
check(names(bowlCrushCues({kind: 'bowlBus', pancake: true})) === 'bus,pancake,glass,ooh', 'a pancake on a bus lands under its bite');
check(names(bowlCrushCues({kind: 'junkCar', flat: true})) === 'flat', 'a wreck run over again is the flat crunch alone');
const glass = bowlCrushCues({kind: 'junkCar'}).find(item => item.cue === 'bowl.crush.glass');
check(glass.at === .25, 'the windows go a quarter of a second after the bite');

// The audio, with the recorded takes stood in by labelled buffers.
const bowlLine = [...Array.from({length: 9}, (_, i) => ({id: `bowl-crush-${i}`, kind: 'junkCar', sourceKind: 'junkCar',
  s: 165 + 7 * Math.floor(i / 3), off: [9.4, 13.8, 18.2][i % 3], halfX: 1.06, halfZ: 2.25, height: 1.3})),
  {id: 'bowl-crush-9', kind: 'junkCar', sourceKind: 'bowlBus', s: 190, off: 9.4, halfX: 1.42, halfZ: 4.2, height: 1.65},
  {id: 'bowl-crush-12', kind: 'junkCar', sourceKind: 'bowlBurningHeap', s: 203, off: 9.4, halfX: 1.42, halfZ: 4.2, height: 1.65}];
const course = (bowl = true) => ({def: {bowl}, closed: true, length: 400, phase: s => ((s % 400) + 400) % 400,
  features: {crushables: bowlLine}});
function makeAudio({flag = true, loaded = true} = {}) {
  const audio = new EngineAudio({flags: {enabled: id => flag && id === 'titan-bowl'}});
  const played = [], stopped = [], old = [];
  audio.context = {state: 'running', currentTime: 10};
  audio.muted = false; audio.paused = false;
  audio._syncMixer = () => {};
  audio.fightVoices = {event() {}, update() {}};
  audio._crushImpact = strength => { old.push(strength); return {}; };
  audio._sample = (buffer, volume, rate) => { played.push({...buffer, volume, rate}); return {}; };
  audio._runCue = (id, action) => { const before = played.length; action(); return played.length > before ? {stop: () => stopped.push(id)} : null; };
  if (loaded) for (const id of CUES) audio.cueBuffers[id] = SOUND_BANK[id].files.map(file => ({cue: id, file}));
  return {audio, played, stopped, old};
}
const truck = (props = {}) => ({status: 'racing', paused: false, s: 100, lateral: 0, airborne: false, airHeight: 0,
  _verticalSpeed: 0, crushedProps: [], ...props});
const crush = (audio, st, id, strength = .8) => {
  st.crushedProps.push(id);
  audio.event({propCrushed: {id, byPlayer: true, strength}}, st, course());
};

{
  // Down the line: nine cars, then the bus and the stack.
  const {audio, played, old} = makeAudio(), st = truck();
  for (let i = 0; i < 9; i++) crush(audio, st, `bowl-crush-${i}`);
  const bites = played.filter(item => item.cue === 'bowl.crush.car');
  check(bites.length === 9 && bites.every((item, i) => i === 0 || item.file !== bites[i - 1].file),
    'two car crushes one after the other never play the same take');
  check(new Set(bites.map(item => `${item.file}@${item.rate}`)).size === 9, 'the nine cars of the line are nine different sounds');
  check(bites.every(item => item.volume > SOUND_BANK['bowl.crush.car'].volume * .9), 'a firm crush plays near full weight');
  check(old.length === 0, 'the Bowl does not also play the old crush');
  audio.context.currentTime += .3;
  audio._updateBowlCrush(st, course());
  check(played.filter(item => item.cue === 'bowl.crush.glass').length === 9, 'the windows go after each car');
  crush(audio, st, 'bowl-crush-9');
  audio.context.currentTime += .4;
  audio._updateBowlCrush(st, course());
  check(played.some(item => item.cue === 'bowl.crush.bus') && played.at(-1).cue === 'bowl.crush.ooh', 'the bus booms and the crowd says ooh');
  const before = played.length;
  crush(audio, st, 'bowl-crush-12');
  audio.context.currentTime += .4;
  audio._updateBowlCrush(st, course());
  check(names(played.slice(before)) === 'stack,ooh', 'the burning stack is its own deep sound, with no glass');
}
{
  // A pancake: the truck comes down out of the air onto a car.
  const {audio, played} = makeAudio(), st = truck({airborne: true, airHeight: 2.4, _verticalSpeed: -6});
  audio._updateBowlCrush(st, course());
  audio.context.currentTime += 1 / 60;
  crush(audio, st, 'bowl-crush-0');
  check(played[0].cue === 'bowl.crush.pancake', 'a car crushed from the air is a pancake');
  audio.context.currentTime += 2;
  crush(audio, truck(), 'bowl-crush-1');
  check(played.at(-1).cue === 'bowl.crush.car', 'a crush from the ground later is an ordinary bite');
}
{
  // The wheels on the wreck: groan while on, a clank coming off, and the flat crunch on a second run.
  const {audio, played, stopped} = makeAudio(), st = truck({s: 160, lateral: 9.4});
  crush(audio, st, 'bowl-crush-0');
  st.s = 165;
  audio._updateBowlCrush(st, course());
  check(played.at(-1).cue === 'bowl.crush.groan', 'the metal groans while the wheels are on the wreck');
  st.s = 170;
  audio._updateBowlCrush(st, course());
  check(!stopped.length, 'a moment off the edge is not yet off the wreck');
  audio.context.currentTime += .15;
  audio._updateBowlCrush(st, course());
  check(stopped.includes('bowl.crush.groan') && played.at(-1).cue === 'bowl.crush.off', 'the groan lets go and the truck clanks off');
  audio.context.currentTime += 5;
  st.s = 164;
  audio._updateBowlCrush(st, course());
  check(names(played.slice(-2)) === 'flat,groan' && played.at(-1).volume < SOUND_BANK['bowl.crush.groan'].volume,
    'running over the wreck again is the flat crunch and a lighter groan');
  check(!played.some(item => item.cue === 'bowl.crush.flat' && played.indexOf(item) < played.length - 2), 'the first run is not a flat crunch');
}
{
  // A pause on the wreck: the groan stops with no clank, and driving on from the same wreck makes no sound.
  const {audio, played, stopped} = makeAudio(), st = truck({s: 165, lateral: 9.4});
  crush(audio, st, 'bowl-crush-0');
  audio._updateBowlCrush(st, course());
  const heard = played.length;
  audio.context.currentTime += .3;
  st.paused = true;
  audio._updateBowlCrush(st, course());
  check(stopped.includes('bowl.crush.groan') && played.length === heard, 'pausing on a wreck stops the groan with no clank and no glass');
  audio.context.currentTime += 5;
  st.paused = false;
  audio._updateBowlCrush(st, course());
  check(played.length === heard, 'unpausing on the same wreck plays nothing');
}
{
  // A ramp landing on the ground and then a crush is an ordinary bite, not a pancake.
  const {audio, played} = makeAudio(), st = truck({airborne: true, airHeight: 3, _verticalSpeed: -8});
  audio._updateBowlCrush(st, course());
  audio.context.currentTime += 1 / 60;
  Object.assign(st, {airborne: false, airHeight: 0, _verticalSpeed: 0});
  audio._updateBowlCrush(st, course());
  audio.context.currentTime += .1;
  crush(audio, st, 'bowl-crush-0');
  check(played[0].cue === 'bowl.crush.car', 'a crush just after a landing is the ordinary bite');
}
{
  // Bouncing on a wreck's edge, and two pieces crushed in one frame.
  const {audio, played} = makeAudio(), st = truck({s: 165, lateral: 9.4});
  crush(audio, st, 'bowl-crush-0');
  crush(audio, st, 'bowl-crush-1');
  audio._updateBowlCrush(st, course());
  for (let i = 0; i < 6; i++) {
    audio.context.currentTime += 1 / 30;
    st.s = i % 2 ? 165 : 168.2;
    audio._updateBowlCrush(st, course());
  }
  check(!played.some(item => item.cue === 'bowl.crush.off' || item.cue === 'bowl.crush.flat'), 'a bounce on the edge is no clank and no crunch');
  st.lateral = 13.8;
  audio.context.currentTime += .05;
  audio._updateBowlCrush(st, course());
  check(!played.some(item => item.cue === 'bowl.crush.flat'), 'a second piece crushed in the same frame is not a second run');
}
{
  // A bite that did not play brings no glass or crowd after the old crush.
  const {audio, played, old} = makeAudio();
  delete audio.cueBuffers['bowl.crush.bus'];
  crush(audio, truck(), 'bowl-crush-9');
  audio.context.currentTime += .5;
  audio._updateBowlCrush(truck(), course());
  check(old.length === 1 && played.length === 0, 'the old crush stands in alone when the bite cannot play');
}
{
  // Everywhere else, and before the takes load, the old crush plays.
  const other = makeAudio(), st = truck();
  st.crushedProps.push('bowl-crush-0');
  other.audio.event({propCrushed: {id: 'bowl-crush-0', byPlayer: true, strength: .8}}, st, course(false));
  check(other.old.length === 1 && other.played.length === 0, 'a crush on another course keeps vehicle.crush');
  const off = makeAudio({flag: false});
  off.audio.event({propCrushed: {id: 'bowl-crush-0', byPlayer: true, strength: .8}}, truck(), course());
  check(off.old.length === 1 && off.played.length === 0, 'with titan-bowl off the Bowl keeps vehicle.crush');
  const loading = makeAudio({loaded: false});
  loading.audio.event({propCrushed: {id: 'bowl-crush-0', byPlayer: true, strength: .8}}, truck(), course());
  check(loading.old.length === 1, 'before the takes load the old crush stands in');
}
{
  // Sound never changes the race.
  const {audio} = makeAudio(), st = truck({s: 160, lateral: 9.4}), line = course();
  const snapshot = () => JSON.stringify({st, line: line.features.crushables});
  const before = snapshot();
  st.crushedProps.push('bowl-crush-0');
  const after = snapshot();
  audio.event({propCrushed: {id: 'bowl-crush-0', byPlayer: true, strength: .8}}, st, line);
  for (const s of [163, 165, 168, 171]) { st.s = s; const frame = snapshot(); audio._updateBowlCrush(st, line); check(snapshot() === frame, 'a frame of crush sound leaves the race as it was'); }
  st.s = 160;
  check(snapshot() === after && before !== after, 'the crush sound reads the truck and the wreck and writes nothing');
}
console.log(`Bowl crush audio: ${checks} checks passed.`);
