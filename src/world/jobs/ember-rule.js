// The ember in Cinder's open pot (EVERBURN-REMAKE, Hot Delivery). Pure rules, repeatable from the same inputs, with no
// graphics: the carry step (steps/carry.js) feeds it what the car did this step and keeps the result in its step state.
// The pot holds an ember from 100 down to 0. Cold takes a little all the time, ground taken faster than it is safe takes more, and a
// hard hit takes a lot at once. At 0 the pot is out and must be relit at a brazier. How fast a ground is safe is the ground's own
// (src/world/scablands-regions.js: any speed on a road, the salt pan and the sand, 90 km/h on the flats, 70 in the river bed, 50 on
// the scab plates), and the carry step reads it for the point the car is on.
export const MPH_TO_KMH = 1.609344;

export const EMBER_RULE = Object.freeze({
  start: 100,
  // SCABLANDS-LAND round 4, slice 2a: 0.14 a second (full to dead in about twelve minutes with no jolts). A clean drive along the East Road
  // (7.7 km, about three minutes) arrives bright; the straight drive across the scab plates held at 50 km/h takes about seven minutes and
  // arrives alive; a car that never passes 30 km/h goes out before Tin Town by any way (6 km takes it twelve minutes).
  coldPerSecond: 0.14,
  roughPerMetre: 0.003,       // ground driven faster than it is safe: 0.003 for each km/h over the safe speed, for each metre driven (so going faster always costs more a metre)
  hitFreeKmh: 8,              // a hit that sheds this much speed or less takes nothing
  hitPerKmh: 1.5,             // ember taken for each km/h shed in a hit
  easyScale: 0.5,             // on Easy, rough ground and hits take half; cold is the same
  scoopKmh: 20,               // the car must be slower than this at a brazier to take a fresh scoop
  brightFrom: 70, aliveFrom: 30,
  pay: Object.freeze({bright: 120, alive: 80, barely: 50, afterRelight: 80}),
});

// What one step of driving takes from the pot. `kmh` is the car's speed, `lostKmh` the speed it shed in this step, `safeKmh` the speed
// the ground under the car is safe at (Infinity when it takes nothing at any speed). Returns the ember taken by each cause (cold, rough
// ground, a hit) and the total.
export function emberLoss(rule, {kmh = 0, lostKmh = 0, safeKmh = Infinity, difficulty = 'medium', coldFactor = 1, dt = 0} = {}) {
  const scale = difficulty === 'easy' ? rule.easyScale : 1;
  const cold = rule.coldPerSecond * coldFactor * dt;
  const rough = rule.roughPerMetre * Math.max(0, kmh - safeKmh) * (kmh / 3.6) * dt * scale;
  const hit = lostKmh > rule.hitFreeKmh ? rule.hitPerKmh * lostKmh * scale : 0;
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
