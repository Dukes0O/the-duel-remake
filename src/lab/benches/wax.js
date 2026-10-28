// Ski wax (docs/LAB.md 4.3): skis on three snow samples with three waxes, timed down a glide. The friction numbers
// are the ski rules' own (ski-physics.js SKI.wax: 0.045 for the right wax, 0.06 for the wrong one). The game knows
// only "right" and "wrong"; which wax is right for which snow is the lesson: hard for the dry powder at -15 C,
// medium for the cool snow at -5 C, soft for the wet snow at 0 C (the colder the snow, the harder the wax).
import {SKI, GRAVITY} from '../../ski/ski-physics.js';
import {skiZone, zoneGuide} from '../../ski/runs/summit-zones.js';
import {guideRun} from '../../ski/ski-guide.js';
import {medalTimes} from '../../ski/ski-score.js';
import {makeRng} from '../../rng.js';
import {heliHash} from '../../heli/heli-save.js';
import {choice, makeBench} from './bench-core.js';

export const SNOWS = Object.freeze({powder: Object.freeze({name: 'Dry powder', celsius: -15, wax: 'hard'}),
  cold: Object.freeze({name: 'Cool snow', celsius: -5, wax: 'medium'}), wet: Object.freeze({name: 'Wet snow', celsius: 0, wax: 'soft'})});
export const WAXES = Object.freeze(['hard', 'medium', 'soft']);
// A 10 degree slope, 100 m of glide, from rest, ignoring the air (the same on every sample).
export const GLIDE = Object.freeze({slopeDeg: 10, distanceM: 100});

export function glideSeconds(friction) {
  const slope = GLIDE.slopeDeg * Math.PI / 180, acceleration = GRAVITY * (Math.sin(slope) - friction * Math.cos(slope));
  return Math.sqrt(2 * GLIDE.distanceM / acceleration);
}
const controls = [choice('snow', 'Snow', Object.keys(SNOWS), 'powder'), choice('wax', 'Wax', WAXES, 'hard')];

export const waxBench = makeBench({
  id: 'wax', controls, cues: [],
  run({snow, wax}) {
    const right = SNOWS[snow].wax === wax, friction = right ? SKI.wax.right : SKI.wax.wrong;
    return {snow, wax, right, friction, glideS: glideSeconds(friction), bestGlideS: glideSeconds(SKI.wax.right)};
  },
  goalMet: history => Object.keys(SNOWS).every(snow => history.some(({result}) => result.snow === snow && result.right)),
  facts: () => ({rightFriction: SKI.wax.right, wrongFriction: SKI.wax.wrong, rightS: glideSeconds(SKI.wax.right), wrongS: glideSeconds(SKI.wax.wrong)}),
});

// ---- The day's snow, the wax kit's pick and the wax run (docs/LAB.md 4.3) ---------------------------------------
// The play day draws the snow: one of the three samples, and a temperature inside its band (the seeded generator, so
// the same day always has the same snow). The band is why the sample's wax is the right one that day.
export const SNOW_DAYS = Object.freeze({powder: Object.freeze({low: -18, high: -10}), cold: Object.freeze({low: -9, high: -2}),
  wet: Object.freeze({low: -1, high: 0})});

export function snowOfDay(day) {
  const key = typeof day === 'string' || (typeof day === 'number' && Number.isFinite(day)) ? String(day) : 'no day';
  const rng = makeRng(heliHash('snow', key)), snow = rng.pick(Object.keys(SNOWS)), band = SNOW_DAYS[snow];
  return Object.freeze({snow, name: SNOWS[snow].name, celsius: Math.round(rng.range(band.low, band.high) * 10) / 10 + 0, wax: SNOWS[snow].wax});
}

// What the skier is told (createSkier({wax})): the right wax is friction 0.045 and the wrong wax 0.06; no pick, or
// a pick that is not one of the three waxes, leaves the plain snow's 0.05 (null).
export function waxSetting(pick, day) {
  if (!WAXES.includes(pick)) return null;
  return snowOfDay(day).wax === pick ? 'right' : 'wrong';
}

// The wax run teaches wax choice. Gate penalties still count in the ordinary ski result.
export const WAX_RUN = Object.freeze({run: 'slalom'});
export const waxRunSilverS = () => medalTimes(zoneGuide(WAX_RUN.run).time).silver;

// `time` must be a run skied with that pick (skiWaxFor(...) as the skier's wax), with the missed-gate penalty added.
export function waxRunResult({day, pick, time} = {}) {
  const today = snowOfDay(day), silverS = waxRunSilverS();
  const base = {snow: today.snow, rightWax: today.wax, silverS};
  if (!WAXES.includes(pick)) return {...base, pass: false, reason: 'Pick a wax first.'};
  if (pick !== today.wax) return {...base, pass: false, reason: `That wax does not suit ${today.name.toLowerCase()}.`};
  if (!(Number.isFinite(time) && time > 0)) return {...base, pass: false, reason: 'The run did not finish.'};
  return {...base, pass: true, reason: ''};
}

// What the wax does on the slalom, from the guide's best line on the ski rules: seconds with each setting and the
// shares the Wax kit's line quotes. Worked out once.
let measured = null;
export function waxRunFacts() {
  if (!measured) {
    const zone = skiZone(WAX_RUN.run), seconds = {};
    for (const wax of [null, 'right', 'wrong']) seconds[wax ?? 'none'] = guideRun({line: zone.line, world: zone, wax, ...(zone.guide ? {lookAhead: zone.guide} : {})}).bestTime;
    const share = (slow, fast) => Math.round((1 - fast / slow) * 1000) / 10;
    measured = Object.freeze({seconds: Object.freeze(seconds), rightVsWrongPercent: share(seconds.wrong, seconds.right),
      rightVsNonePercent: share(seconds.none, seconds.right), wrongVsNonePercent: share(seconds.wrong, seconds.none)});
  }
  return measured;
}
