// The ember in Cinder's open pot (EVERBURN-REMAKE, Hot Delivery). Pure rules, repeatable from the same inputs, with no
// graphics: the carry step (steps/carry.js) feeds it what the car did this step and keeps the result in its step state.
// The pot holds an ember from 100 down to 0. Cold takes a little all the time, rough ground taken fast takes more, and a
// hard hit takes a lot at once. At 0 the pot is out and must be relit at a brazier.
export const MPH_TO_KMH = 1.609344;

export const EMBER_RULE = Object.freeze({
  start: 100,
  // SCABLANDS-LAND round 4: 0.33 (full to dead in about five minutes) made Hot Delivery impossible for a driver who goes straight at the marker over
  // rock, now that Tin Town is 6 km away (the straight drive takes 610 s at the free speed; the child-pace Easy driver finished 0 of 4 at 0.2 and 4 of 4
  // at 0.15). Full to dead in about eleven minutes with no jolts. Listed for Claude, who sets the play numbers.
  coldPerSecond: 0.15,
  roughPerMetre: 0.003,       // on rock: 0.003 for each km/h over the free speed, for each metre driven (so going faster always costs more a metre)
  roughFreeKmh: 50,           // rock is safe up to this speed
  hitFreeKmh: 8,              // a hit that sheds this much speed or less takes nothing
  hitPerKmh: 1.5,             // ember taken for each km/h shed in a hit
  easyScale: 0.5,             // on Easy, rough ground and hits take half; cold is the same
  scoopKmh: 20,               // the car must be slower than this at a brazier to take a fresh scoop
  brightFrom: 70, aliveFrom: 30,
  pay: Object.freeze({bright: 120, alive: 80, barely: 50, afterRelight: 80}),
});

// What one step of driving takes from the pot. `kmh` is the car's speed, `lostKmh` the speed it shed in this step, `onRoad`
// whether it is on a road. Returns the ember taken by each cause (cold, rough ground, a hit) and the total.
export function emberLoss(rule, {kmh = 0, lostKmh = 0, onRoad = false, difficulty = 'medium', dt = 0} = {}) {
  const scale = difficulty === 'easy' ? rule.easyScale : 1;
  const cold = rule.coldPerSecond * dt;
  const rough = onRoad ? 0 : rule.roughPerMetre * Math.max(0, kmh - rule.roughFreeKmh) * (kmh / 3.6) * dt * scale;
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
