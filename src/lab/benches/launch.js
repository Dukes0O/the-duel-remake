// Launch angles (docs/LAB.md 4.3): a small launcher with an angle, a speed and a tape measure. With no air it is the
// textbook throw (45 degrees goes furthest on flat ground); with air the skier flies through the ski rules' own air
// (ski-physics.js: SKI.massKg, SKI.standingArea and airDensity, force = 0.5 x density x area x speed squared).
// The landing can be level with the launch or 10 m lower. The air is the sea level's, the thickest there is: on the
// aerials hill, high on the mountain, the thinner air carries a launch a few percent further (about 6% at 2,500 m).
// The bench is always a little short of the skier's flight: the skier lands on the first step below the snow.
import {SKI, SKI_STEP, GRAVITY, airDensity} from '../../ski/ski-physics.js';
import {SCORE} from '../../ski/ski-score.js';
import {skiZone} from '../../ski/runs/summit-zones.js';
import {control, choice, makeBench} from './bench-core.js';

export const TARGET = Object.freeze({rangeM: 30, withinM: 2});
const LOWER_M = 10;
export const launchDragAcceleration = speedMs => 0.5 * airDensity(0) * SKI.standingArea / SKI.massKg * speedMs * speedMs;
const controls = [
  control('angleDeg', 'Angle', 'degrees', 15, 75, 1, 45), control('speedMs', 'Speed', 'm/s', 5, 40, 1, 20),
  choice('air', 'Air', ['no air', 'air'], 'no air'), choice('landing', 'Landing', ['level', '10 m lower'], 'level'),
];

export function rangeOf(angleDeg, speedMs, {air = false, lower = false, points} = {}) {
  const a = angleDeg * Math.PI / 180, drop = lower ? LOWER_M : 0, up = speedMs * Math.sin(a), along = speedMs * Math.cos(a);
  if (!air) {
    const seconds = (up + Math.sqrt(up * up + 2 * GRAVITY * drop)) / GRAVITY;
    if (points) for (let i = 0; i <= 100; i++) { const t = seconds * i / 100; points.push([along * t, up * t - GRAVITY * t * t / 2, t]); }
    return {rangeM: along * seconds, seconds};
  }
  // Fixed-step flight under gravity and the skier's air drag, until the height reaches the landing.
  const k = 0.5 * airDensity(0) * SKI.standingArea / SKI.massKg;
  let x = 0, y = drop, vx = along, vy = up, t = 0;
  points?.push([0, 0, 0]);
  while (t < 60) {
    const speed = Math.hypot(vx, vy), lastX = x, lastY = y;
    vx -= k * speed * vx * SKI_STEP; vy -= (GRAVITY + k * speed * vy) * SKI_STEP;
    x += vx * SKI_STEP; y += vy * SKI_STEP; t += SKI_STEP;
    // The step that crosses the landing height: place the landing on that step by interpolation.
    if (y <= 0 && vy < 0) { const share = lastY / (lastY - y), rangeM = lastX + (x - lastX) * share, seconds = t - SKI_STEP * (1 - share); points?.push([rangeM, -drop, seconds]); return {rangeM, seconds}; }
    points?.push([x, y - drop, t]);
  }
  return {rangeM: x, seconds: t};
}
// The angle that goes furthest, in tenths of a degree from 15 to 75.
export function bestAngle(speedMs, options) {
  let best = 15;
  for (let step = 0; step <= 600; step++) {
    const angle = 15 + step / 10;
    if (rangeOf(angle, speedMs, options).rangeM > rangeOf(best, speedMs, options).rangeM) best = angle;
  }
  return best;
}

export const launchBench = makeBench({
  id: 'launch', controls, cues: ['lab.splash'],
  run({angleDeg, speedMs, air, landing}) {
    const hit = rangeOf(angleDeg, speedMs, {air: air === 'air', lower: landing === '10 m lower'});
    return {...hit, target: TARGET, hit: Math.abs(hit.rangeM - TARGET.rangeM) <= TARGET.withinM};
  },
  goalMet: history => history.some(({result}) => result.hit),
  facts: () => ({speedMs: 30, flatNoAir: bestAngle(30, {}), withAir: bestAngle(30, {air: true}), lowerNoAir: bestAngle(30, {lower: true}),
    lowerWithAir: bestAngle(30, {air: true, lower: true})}),
});

// The landing score is softened by the path's steepness up to this angle (ski-score.js divides by 20; the test checks it).
const SOFT_AT = 20;

// The aerials tips the free Aerials reward opens: the judges' rules for the kicker run, from the ski rules' own numbers.
export function aerialsTips() {
  const zone = skiZone('aerials'), aim = zone.scoring, share = SCORE.aerials, percent = value => `${Math.round(value * 100)}%`;
  const axis = aim.axis === 'flip' ? 'flip' : 'spin', other = axis === 'flip' ? 'spin' : 'flip', degrees = Math.round(SKI.safeRotation * 180 / Math.PI);
  return Object.freeze([
    `The judges give ${percent(share.air)} for the air, ${percent(share.form)} for form and ${percent(share.landing)} for the landing.`,
    `Air adds up the height (against ${aim.height} m) and the distance (against ${aim.distance} m), half each; clearing both gets full marks.`,
    `Form is half for the ${axis} done (a whole turn earns all of it) and half for staying steady on the ${other}: ${SCORE.steadyMargin} degrees of ${other} or more earns none of that half.`,
    `Both the spin and the flip must be back within ${degrees} degrees of a whole turn when you land, or you tumble.`,
    `A landing is safe if your path meets the snow at no more than ${zone.safePathAngle} degrees; a drop that is too steep tumbles and scores nothing for landing, and a gentler landing scores more (${Math.round((1 - SCORE.softLanding) * 100)} of 100 at ${SOFT_AT} degrees or steeper, up to 100).`,
    `Past the best angle (about ${Math.round(bestAngle(30, {air: true}))} degrees with air at 30 m/s), a steeper take-off gives more height and less distance: the launch bench shows it.`,
  ]);
}
