// What the Lab screen shows and does, as plain data (docs/LAB.md sections 2 to 4). Pure: a profile and the switches go in,
// rows, readouts and next profiles come out. src/lab/lab-view.js draws them; nothing here draws, plays or saves.
import {LAB_LESSONS, lessonRows, lessonOpenState} from './lab-lessons.js';
import {labOf, passLesson, setRing, setCable} from './lab-save.js';
import {LAB_UPGRADES, buyUpgrade} from './lab-shop.js';
import {LAB_LINES} from './lab-lines.js';
import {liftBench} from './benches/lift.js';
import {projectileBench} from './benches/projectile.js';
import {fireBench} from './benches/fire.js';
import {pendulumBench} from './benches/pendulum.js';
import {altitudeBench} from './benches/altitude.js';
import {strengthBench} from './benches/strength.js';
import {rustBench} from './benches/rust.js';
import {gforceBench} from './benches/gforce.js';
import {headingsBench} from './benches/headings.js';
import {TUNNEL_BENCHES} from './benches/tunnel.js';
import {launchBench} from './benches/launch.js';
import {waxBench} from './benches/wax.js';
import {CHALLENGE_IDS} from './lab-challenges.js';

export const BENCH_OF = Object.freeze({
  lift: liftBench, projectile: projectileBench, fire: fireBench, pendulum: pendulumBench, altitude: altitudeBench,
  strength: strengthBench, rust: rustBench, gforce: gforceBench, headings: headingsBench,
  ...TUNNEL_BENCHES, launch: launchBench, wax: waxBench,
});

// What each lesson's challenge is, and where it is taken:
// bench: passes on the bench the moment its goal is met; protect: the rust parts; fly: a helicopter challenge on the pad;
// lap: the G-force lap in a race; ski: the wax run at the ski drop; tuning: the first tuned lap (LAB-TUNE).
export const CHALLENGE_KIND = Object.freeze({
  launch: 'bench', strength: 'bench', rust: 'protect', gforce: 'lap', wax: 'ski',
  ...Object.fromEntries(CHALLENGE_IDS.map(id => [id, 'fly'])),
  grip: 'tuning', downforce: 'tuning', braking: 'tuning', suspension: 'tuning', fuel: 'tuning',
});

// LAB-TUNE-VIEW: with the tuning switch on, a wind-tunnel lesson is passed on its bench like Launch angles and Strength (the
// setting it opens is what the Tune page then offers); with the switch off the five keep reading "Opens with tuning".
export const challengeKindOf = (lessonId, flags) =>
  CHALLENGE_KIND[lessonId] === 'tuning' && flags?.enabled?.('lab-tuning') === true ? 'bench' : CHALLENGE_KIND[lessonId];

export const lessonName = id => LAB_LESSONS.find(item => item.id === id)?.name ?? id;

// The board's rows, with the reason a shut lesson is shut in the row's own words (the shared board prints `note`).
export const boardRows = (profile, flags) => lessonRows(profile, flags);

// ---- Brian's lines (docs/LAB.md 8.1) ----
export const LINE_STEPS = Object.freeze(['intro', 'explain', 'pass']);
export const lineId = (lessonId, step) => `lab.brian.${lessonId}.${step}`;
export const lineText = (lessonId, step) => LAB_LINES[lineId(lessonId, step)]?.text ?? '';
export const lineIdsOf = lessonId => LINE_STEPS.map(step => lineId(lessonId, step)).filter(id => Object.hasOwn(LAB_LINES, id));

// ---- the bench's readout: the numbers of one run, in words and units ----
const num = (value, digits = 1) => Number.isFinite(value) ? (Math.round(value * 10 ** digits) / 10 ** digits).toString() : '-';
const pct = share => `${Math.round(share * 100)}%`;
const row = (label, value, tone = null) => ({label, value, tone});

// settings of the run are on the result (result.settings); every row quotes the bench's own numbers.
export function readoutRows(id, result) {
  if (!result || typeof result !== 'object') return [];
  switch (id) {
    case 'lift': return [row('Weight', `${num(result.massKg, 0)} kg`), row('Most lift', `${num(result.maxLiftN / 9.81, 0)} kg`),
      row('Pushing up now', `${num(result.liftN / 9.81, 0)} kg`),
      row('Hook limit', `${num(result.hookLimitKg, 0)} kg${result.overHookLimit ? ' - too much on the hook' : ''}`),
      row('Result', result.leavesGround ? 'She leaves the ground' : 'She stays on the pad', result.leavesGround ? 'good' : 'bad')];
    case 'projectile': return [row('Water lands', `${num(result.water.distanceM)} m ahead`), row('A stone lands', `${num(result.stone.distanceM)} m ahead`),
      row('Water falls short by', `${num(result.waterShorterByM)} m`), row('Target', `${num(result.target.distanceM, 0)} m, ${num(result.target.radiusM, 0)} m ring`),
      row('Result', result.hit ? 'On target' : `Missed by ${num(result.miss)} m`, result.hit ? 'good' : 'bad')];
    case 'fire': return [row('Heat', result.settings.heat === 'on' ? 'on' : 'off'), row('Fuel', result.settings.fuel === 'on' ? 'on' : 'off'),
      row('Air', result.settings.air === 'on' ? 'on' : 'off'), row('Put out with', result.putOut),
      row('Result', result.burning ? 'Still burning' : `Out: it lost its ${result.missing.join(' and ')}`, result.burning ? 'bad' : 'good'),
      row('Practice forest', `${result.practice.burningCells} of ${result.practice.forestCells} trees burning`)];
    case 'pendulum': return [row('String', `${num(result.lengthM, 0)} m ${result.kind}`), row('Weight', `${num(result.weightKg, 0)} kg`),
      row('One swing takes', `${num(result.periodS, 2)} s`), row('Formula says', `${num(result.formulaS, 2)} s`)];
    case 'altitude': return [row('Where', result.site), row('Height', `${num(result.altitudeM, 0)} m`), row('Air (true)', pct(result.trueShare)),
      row('Air (game)', pct(result.gameShare)), row('Lift', `${num(result.liftKg ?? result.liftN / 9.81, 0)} kg`), row('Share of sea-level lift', pct(result.liftShare))];
    case 'strength':
      if (result.part === 'hook arm') return [row('Arm', `${result.arm.material}, ${num(result.arm.thicknessMm, 0)} mm`), row('Weighs', `${num(result.arm.massKg, 2)} kg`),
        row('Under 2,000 kg', result.arm.holds ? 'Holds' : 'Does not hold', result.arm.holds ? 'good' : 'bad'),
        row('Bends', `${num(result.arm.tipDropMm, 1)} mm`), row('Goal', result.withinReach ? 'Light enough' : 'Hold the load for the least weight', result.withinReach ? 'good' : null)];
      return result.bars.map(bar => row(`${bar.material} (${num(bar.thicknessMm, 1)} mm)`, `${bar.state}, breaks at ${num(bar.loadAtFailureKg, 0)} kg`, bar.state === 'snapped' ? 'bad' : null));
    case 'rust': return result.jars.map(jar => row(jar.id, `${pct(jar.rust)} rusted${jar.zincLeft === null ? '' : `, ${pct(jar.zincLeft)} zinc left`}`, jar.rust > 0.5 ? 'bad' : null));
    case 'gforce': return [row('Push', `${num(result.g, 2)} g`), row('Weight leans', `${num(result.leanDegrees, 0)} degrees`),
      row('Goal', result.g >= 2 ? 'Past 2 g' : 'Reach 2 g', result.g >= 2 ? 'good' : null)];
    case 'headings': return [row('You say', `${num(result.settings.headingDeg, 0)} degrees, ${num(result.settings.rulerUnits)} units`),
      row('True heading', `${num(result.truth.headingDeg, 0)} degrees`), row('True distance', `${num(result.truth.distanceUnits)} units (${num(result.truth.distanceUnits * 1000, 0)} m)`),
      row('Off by', `${num(result.headingOffDeg, 0)} degrees`), row('Result', result.correct ? 'Right' : 'Not yet', result.correct ? 'good' : 'bad')];
    case 'grip': return [row('Slide', `${num(result.settings.slideDeg)} degrees`), row('Grip kept', pct(result.grip)), row('Sound', result.squeal > 0 ? (result.squeal > 1 ? 'long screech' : 'short squeal') : 'quiet'),
      row('Best slide', `${num(result.bestSlideDeg)} degrees`)];
    case 'downforce': return [row('Push down', `${num(result.downforceKg, 0)} kg`), row('Drag', `${num(result.dragN, 0)} N`), row('Top speed kept', pct(result.topSpeedShare))];
    case 'braking': return [row('Stops in', `${num(result.stopMetres, 1)} m`), row('Takes', `${num(result.stopSeconds, 2)} s`), row('Front tyres carry', pct(result.frontLoadShare)),
      row('Rear brake', pct(result.rearBrakeShare)), row('Back end', result.rearSlides ? 'slides' : 'holds', result.rearSlides ? 'bad' : 'good')];
    case 'suspension': return [row('Tyre on the road', pct(result.contactShare)), row('Body shake', num(result.bodyShake, 1)), row('Leans in a corner', `${num(result.leanDeg, 1)} degrees`)];
    case 'fuel': return [row('Fuel', `${num(result.fuelKg, 1)} kg`), row('Car and fuel', `${num(result.carMassKg, 0)} kg`), row('0 to 60 mph', `${num(result.zeroToSixtyS, 2)} s`)];
    case 'launch': return [row('Lands', `${num(result.rangeM)} m away`), row('In the air', `${num(result.seconds, 1)} s`), row('Mark', `${result.target.rangeM} m, within ${result.target.withinM} m`),
      row('Result', result.hit ? 'On the mark' : 'Not yet', result.hit ? 'good' : 'bad')];
    case 'wax': return [row('Snow', result.snow), row('Wax', result.wax), row('Right wax', result.right ? 'Yes' : 'No', result.right ? 'good' : 'bad'),
      row('Glide', `${num(result.glideS, 2)} s`), row('Best glide', `${num(result.bestGlideS, 2)} s`)];
    default: return [];
  }
}

// ---- a bench in use: settings, runs so far and the readout of the last ----
export function openBench(lessonId) {
  const bench = BENCH_OF[lessonId];
  if (!bench) return null;
  return {lessonId, bench, settings: Object.fromEntries(bench.controls.map(c => [c.id, c.value])), history: [], result: null, explained: false};
}
export function setControl(state, controlId, value) {
  const control = state.bench.controls.find(c => c.id === controlId);
  if (!control) return state;
  const wanted = control.options ? value : Number(value);
  return {...state, settings: {...state.settings, [controlId]: wanted}};
}
// Runs the bench once with the settings on the dial. The result's own `settings` (clamped) become the dial.
export function runBench(state) {
  const result = state.bench.run(state.settings);
  return {...state, settings: {...result.settings}, result, history: [...state.history, {settings: result.settings, result}].slice(-200)};
}
export const goalMet = state => state.bench.goalMet(state.history);

// ---- the challenge button under a bench ----
// {kind, state: 'locked'|'waiting'|'ready'|'passed', label, note}: waiting until the bench's goal is met.
export function challengeState(lessonId, {profile, flags, met, helicopterOn = false}) {
  const kind = challengeKindOf(lessonId, flags) ?? 'bench'; // LAB-TUNE-VIEW
  const open = lessonOpenState(profile, lessonId, flags);
  const passed = labOf(profile).done[lessonId] === true;
  if (!open.open) return {kind, state: 'locked', label: '', note: open.note};
  const base = {kind, passed};
  if (kind === 'tuning') return {...base, state: 'waiting', label: 'Opens with tuning', note: 'Its challenge is a tuned lap, which comes with tuning.'};
  if (!met) return {...base, state: 'waiting', label: 'Finish the experiment', note: kind === 'bench' ? 'Meet the goal on the bench and the lesson is passed.' : 'Do the experiment first, then take the challenge.'};
  if (kind === 'fly' && !helicopterOn) return {...base, state: 'waiting', label: 'Opens with the helicopter', note: 'This challenge is flown in Kestrel One.'};
  const labels = {bench: 'Pass the lesson', protect: 'Try the challenge', fly: 'Try the challenge', lap: 'Try the challenge', ski: 'Try the challenge'};
  const notes = {fly: 'Starts at the helipad.', lap: 'Drive a lap of a course you own: 2 g in three corners, on the road.', ski: 'Taken at the ski drop: choose the slalom run and pick your wax there.'};
  return {...base, state: 'ready', label: labels[kind], note: notes[kind] ?? ''};
}

// ---- saving: the Lab's own calls, each returning {ok, reason, profile} ----
export const passIn = (profile, lessonId, flags, ring) => passLesson(profile, lessonId, {flags, ring});
export const buyIn = (profile, id, flags) => buyUpgrade(profile, id, {flags});
export const ringIn = (profile, index, flags) => setRing(profile, index, {flags});
export const cableIn = (profile, metres, flags) => setCable(profile, metres, {flags});

// ---- the shop ----
export const RING_NAMES = Object.freeze(['12 m ring', '8 m ring', '5 m ring', 'No ring']);
// One row per upgrade the board lists (the Spéirling is built on the fan bench, never listed here).
export function shopRows(profile, flags) {
  const lab = labOf(profile);
  const credits = Number.isFinite(profile?.credits) ? Math.floor(profile.credits) : 0;
  return LAB_UPGRADES.filter(item => item.lesson !== null).map(item => {
    const owned = lab.owned[item.id] === true;
    const lessonDone = lab.done[item.lesson] === true;
    const needsOwned = !item.needs || lab.owned[item.needs] === true;
    let note = '';
    if (!owned && !lessonDone) note = `Pass ${lessonName(item.lesson)} first`;
    else if (!owned && !needsOwned) note = `Buy ${LAB_UPGRADES.find(u => u.id === item.needs).name} first`;
    else if (!owned && credits < item.price) note = `${item.price - credits} more credits`;
    const free = item.price === 0;
    return {id: item.id, name: item.name, price: item.price, lesson: item.lesson, lessonName: lessonName(item.lesson), owned, free,
      canBuy: !owned && lessonDone && needsOwned && credits >= item.price && !free, note: owned ? '' : note};
  }).filter(item => !(item.free && !item.owned && !labOf(profile).done[item.lesson]));
}
export function choiceRows(profile) {
  const lab = labOf(profile);
  return {
    ring: Array.from({length: lab.ringBest + 1}, (_, index) => ({index, name: RING_NAMES[index], chosen: lab.ring === index})),
    cable: [15, ...(lab.owned['long-cable'] === true ? [25] : [])].map(metres => ({metres, name: `${metres} m cable`, chosen: lab.cable === metres})),
    showRing: lab.done.projectile === true, showCable: lab.owned['long-cable'] === true,
  };
}
