// The ember in Cinder's open pot (EVERBURN-REMAKE, Hot Delivery). Pure rules, repeatable from the same inputs, with no
// graphics: the carry step (steps/carry.js) feeds it what the car did this step and keeps the result in its step state.
// The pot holds an ember from 100 down to 0. Cold takes a little all the time, ground taken faster than it is safe takes more, and a
// hard hit takes a lot at once. At 0 the pot is out and must be relit at a brazier. How fast a ground is safe is the ground's own
// (src/world/scablands-regions.js: any speed on a road, the salt pan and the sand, 90 km/h on the flats, 80 in the river bed, 50 on
// the scab plates), and the carry step reads it for the point the car is on.
import {makeRng} from '../../rng.js';

export const MPH_TO_KMH = 1.609344;
export const BED_MIST = Object.freeze({
  seed:1989, seedSalt:0x4d495354, lengthMin:30, lengthMax:50,
  lengthShare:.29, halfWidth:20, sideMetres:28, plainCold:1, mistCold:5,
  drawLift:.35,
});

// The river's own measured line supplies the hollows. Each patch occupies
// one side of the bed, leaving its middle and opposite side open.
export function bedMistFor(river, seed = BED_MIST.seed) {
  const start = river.crossings.find(item => item.id === 'the-wash').along;
  const end = river.crossings.find(item => item.id === 'the-steps').along;
  const from = Math.min(start, end), span = Math.abs(end - start);
  const count = Math.max(1, Math.round(span * BED_MIST.lengthShare /
    ((BED_MIST.lengthMin + BED_MIST.lengthMax) / 2)));
  const length = span * BED_MIST.lengthShare / count;
  const rng = makeRng(seed ^ BED_MIST.seedSalt);
  return Array.from({length:count}, (_, index) => {
    const along = from + span * (index + .5) / count;
    let i = 1;
    while (i < river.line.along.length - 1 && river.line.along[i] < along) i++;
    const a = river.line.points[i - 1], b = river.line.points[i];
    const distance = river.line.along[i] - river.line.along[i - 1];
    const tx = (b.x - a.x) / distance, tz = (b.z - a.z) / distance;
    const offset = (rng.chance(.5) ? -1 : 1) * BED_MIST.sideMetres;
    const share = (along - river.line.along[i - 1]) / distance;
    return Object.freeze({id:`bed-mist-${index + 1}`, along, length, offset,
      x:a.x + (b.x - a.x) * share + tz * offset,
      z:a.z + (b.z - a.z) * share - tx * offset,
      tx, tz, halfWidth:BED_MIST.halfWidth});
  });
}

export function inBedMist(point, patch) {
  const dx = point.x - patch.x, dz = point.z - patch.z;
  return Math.abs(dx * patch.tx + dz * patch.tz) <= patch.length / 2 &&
    Math.abs(dx * patch.tz - dz * patch.tx) <= patch.halfWidth;
}

export function bedMistCorners(patch) {
  return [[-1,-1], [-1,1], [1,1], [1,-1]].map(([along, across]) => ({
    x:patch.x + patch.tx * along * patch.length / 2 + patch.tz * across * patch.halfWidth,
    z:patch.z + patch.tz * along * patch.length / 2 - patch.tx * across * patch.halfWidth,
  }));
}

export function bedColdFactor(point, patches) {
  return patches.some(patch => inBedMist(point, patch)) ? BED_MIST.mistCold : BED_MIST.plainCold;
}
export const EMBER_SCOOP = Object.freeze({seconds:3, radius:8, stoppedKmh:1, yardFill:100, roadFill:60});

export const BESS_GREETING_RADIUS = 40;
export const EMBER_CAPTION_SECONDS = 3;
export const SALT_RIDERS = Object.freeze({
  sightMetres:700,
  pipeClearMetres:60,
  chaseSeconds:120,
  easySlowerKmh:5,
});

// Solve |car + velocity * t - rider| = riderSpeed * t. Pick the first
// meeting in the future. With no meeting, aim at the car's present place.
// Speeds are metres per second; the caller supplies the car's own pan limit.
export function saltIntercept(rider, car, velocity, riderSpeed) {
  const dx = car.x - rider.x, dz = car.z - rider.z;
  const a = velocity.x ** 2 + velocity.z ** 2 - riderSpeed ** 2;
  const b = 2 * (dx * velocity.x + dz * velocity.z);
  const c = dx ** 2 + dz ** 2;
  let seconds = null;
  if (c === 0) seconds = 0;
  else if (riderSpeed > 0) {
    if (a === 0) {
      if (b < 0) seconds = -c / b;
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        // This form avoids cancellation when one root is much larger.
        const q = -.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant));
        const first = q / a, second = q === 0 ? -b / (2 * a) : c / q;
        const future = [first, second].filter(time => Number.isFinite(time) && time >= 0);
        if (future.length) seconds = Math.min(...future);
      }
    }
  }
  return seconds === null ? {x:car.x, z:car.z, seconds:null}
    : {x:car.x + velocity.x * seconds, z:car.z + velocity.z * seconds, seconds};
}

export function saltRiderSpeed(panTopKmh, difficulty) {
  return Math.max(0, panTopKmh - (difficulty === 'easy' ? SALT_RIDERS.easySlowerKmh : 0)) / 3.6;
}

// The Pipe's near end is a boundary for riders, even while the car is still
// on the pan. Returning is final for this chase and never reset by sight.
export function saltRidersTurnHome({car, rider, pipeMouth, onPan, chaseSeconds}) {
  const near = point => Math.hypot(point.x - pipeMouth.x, point.z - pipeMouth.z) <= SALT_RIDERS.pipeClearMetres;
  return !onPan || chaseSeconds >= SALT_RIDERS.chaseSeconds || near(car) || near(rider);
}

export const BRAZIER_NAMES = Object.freeze({
  'yard-brazier': "Cinder's brazier",
  'halfway-brazier': 'the Halfway Camp',
  'wash-brazier': 'the Wash camp',
});

export const EMBER_RULE = Object.freeze({
  start: 100,
  // The Director's larger-land ruling: a full pot cools to zero in fifteen minutes without jolts.
  coldPerSecond: 100 / 900,
  roughPerMetre: 0.003,       // ground driven faster than it is safe: 0.003 for each km/h over the safe speed, for each metre driven (so going faster always costs more a metre)
  hitFreeKmh: 8,              // a hit that sheds this much speed or less takes nothing
  hitPerKmh: 0.3,             // ember taken for each km/h shed in a hit
  hitCap: 15, severeHitCap: 40,
  easyScale: 0.5,             // on Easy, rough ground and hits take half; cold is the same
  scoopKmh: 20,               // the car must be slower than this at a brazier to take a fresh scoop
  brightFrom: 70, aliveFrom: 30,
  pay: Object.freeze({bright: 120, alive: 80, barely: 50, afterRelight: 80}),
});

// What one step of driving takes from the pot. `kmh` is the car's speed, `lostKmh` the speed it shed in this step, `safeKmh` the speed
// the ground under the car is safe at (Infinity when it takes nothing at any speed). Returns the ember taken by each cause (cold, rough
// ground, a hit) and the total.
export function emberLoss(rule, {kmh = 0, lostKmh = 0, safeKmh = Infinity, difficulty = 'medium', coldFactor = 1, severeHit = false, dt = 0} = {}) {
  const scale = difficulty === 'easy' ? rule.easyScale : 1;
  const cold = rule.coldPerSecond * coldFactor * dt;
  const rough = rule.roughPerMetre * Math.max(0, kmh - safeKmh) * (kmh / 3.6) * dt * scale;
  const hit = lostKmh > rule.hitFreeKmh ? Math.min(rule.hitPerKmh * (lostKmh - rule.hitFreeKmh), severeHit ? rule.severeHitCap : rule.hitCap) * scale : 0;
  return {cold, rough, hit, total: cold + rough + hit};
}

export function emberGrade(rule, ember) {
  return ember >= rule.brightFrom ? 'bright' : ember >= rule.aliveFrom ? 'alive' : 'barely';
}

// Pay in scrap at arrival: by grade, and never above the cap once the pot has been relit.
export function emberPay(rule, ember, relights) {
  const pay = rule.pay[emberGrade(rule, ember)];
  return relights > 0 ? Math.min(pay, rule.pay.afterRelight) : pay;
}

// The one plain sentence the results screen shows.
export function emberSentence(rule, ember, relights) {
  const grade = emberGrade(rule, ember);
  const how = grade === 'bright' ? 'The ember arrived bright.' : grade === 'alive' ? 'The ember arrived alive.' : 'The ember arrived barely alive.';
  return relights > 0 ? `${how} You had to relight it, so it pays less.` : how;
}
