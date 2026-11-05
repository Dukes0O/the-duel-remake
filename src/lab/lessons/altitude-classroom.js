// Air and altitude as a classroom lesson (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every push is the altitude bench's
// own run (altitudeBench, the challenge's bench, which reads the helicopter's thrust at each place), and every weight is
// the Lift lesson's pad.
import {altitudeBench, SITES, trueAirShare} from '../benches/altitude.js';
import {GRAVITY, KESTREL, PAD, padForces} from '../benches/lift-pad.js';

// The three places, foot of the mountain to the top, and what the stand measures at each.
export const PLACES = Object.freeze(Object.keys(SITES));
const RUNS = PLACES.map(site => altitudeBench.run({site}));
export const NAME = Object.freeze(PLACES.map(p => SITES[p].name));
export const HEIGHT = Object.freeze(RUNS.map(r => r.altitudeM));
// The most the rotor pushes near the ground at each place, as the Lift lesson's 3,887 kg at sea level.
export const MOST = Object.freeze(RUNS.map(r => r.liftKg));
// The air a jar holds at each place, of Sea level's 100 dots (the true air), and the rotor's push against Sea level's.
export const AIR = Object.freeze(RUNS.map(r => r.trueShare));
export const LIFT_SHARE = Object.freeze(RUNS.map(r => r.liftShare));
export const airAt = trueAirShare;
const SEA = 0, RIDGE = 1, SUMMIT = 2;

export const OWN_KG = padForces({fuel: KESTREL.tankKg}, 0).massKg;
export const CRATE_KG = PAD.crateKg, CAR_KG = PAD.carKg;
// The rack holds one crate more than the helicopter can lift at Sea level, so too many can be tried everywhere.
export const RACK = 5;
export const weightOf = ({crates = 0, car = 0} = {}) => OWN_KG + crates * CRATE_KG + car * CAR_KG;
// How far up the lever has to go to hover: the weight over the most the rotor can push there.
export const hoverShare = (place, load = {}) => weightOf(load) / MOST[place];
export const bestCrates = place => Math.floor((MOST[place] - OWN_KG) / CRATE_KG);
// The flight rule's burn: a little with the lever down, more for every bit of lever.
export const fuelPerMinute = lever => (KESTREL.burnIdle + KESTREL.burnPerCollective * Math.min(1, lever)) * 60;
// The challenge's crate (lab-challenges.js, CHALLENGE_RULES.altitude).
export const GAME_CRATE_KG = 300;
// The free test asks for this many different settings before Continue opens.
export const FREE_TRIES = 3;

export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
export const pct = share => `${Math.round(share * 100)}%`;
export const metres = value => `${value.toLocaleString('en-GB')} m`;
export const dots = share => Math.round(share * 100);
const perMinute = value => `${value.toFixed(1)} kg a minute`;
const CAR_W = weightOf({car: 1}), HOVER_SEA = hoverShare(SEA), HOVER_TOP = hoverShare(SUMMIT);
const GAME_LOAD = {crates: GAME_CRATE_KG / CRATE_KG}, GAME_SEA = hoverShare(SEA, GAME_LOAD), GAME_TOP = hoverShare(SUMMIT, GAME_LOAD);
const CRATE_WORDS = ['no crates', 'one crate', 'two crates', 'three crates', 'four crates', 'five crates'];
const crateWords = n => CRATE_WORDS[n] ?? `${n} crates`;
const onCable = n => n === 1 ? 'there is one crate on the cable' : `there are ${crateWords(n)} on the cable`;
const cap = s => s[0].toUpperCase() + s.slice(1);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'The same car at two heights'},
  {id: 'word-altitude', part: 1, title: 'Altitude', word: 'altitude-altitude'},
  {id: 'word-density', part: 1, title: 'Air density', word: 'altitude-air-density'},
  {id: 'word-thin', part: 1, title: 'Thin air', word: 'altitude-thin-air'},
  {id: 'watch', part: 2, title: 'Three places', voice: 'lab.brian.altitude.intro'},
  {id: 'try-car', part: 3, title: 'The Dusthawk at Summit Run'},
  {id: 'try-lever', part: 3, title: 'The lever at Summit Run'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-why', part: 5, title: 'Question 1 of 3'},
  {id: 'check-car', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.altitude.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'thin', text: `Higher up there is less air above to press down, so the air is thinner. At ${NAME[SUMMIT]}, ${metres(HEIGHT[SUMMIT])} up, a jar holds ${dots(AIR[SUMMIT])} dots of air where a jar from ${NAME[SEA]} holds 100.`},
  {id: 'load', text: `Thinner air gives the rotor less to push against, so the most push falls from ${kg(MOST[SEA])} at ${NAME[SEA]} to ${kg(MOST[SUMMIT])} at ${NAME[SUMMIT]}. The helicopter can carry ${bestCrates(SEA)} crates at ${NAME[SEA]}, but only ${bestCrates(SUMMIT)} at ${NAME[SUMMIT]}.`},
  {id: 'fuel', text: `At ${NAME[SUMMIT]} the helicopter needs more lever just to hover, ${pct(HOVER_TOP)} by the pad instead of ${pct(HOVER_SEA)}, so the helicopter burns fuel faster. Fly straight to where you are going.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Thinner air gives the rotor less to push against.',
  text: `Carry a ${GAME_CRATE_KG} kg crate up to ${NAME[SUMMIT]} and land with 30% of the tank left. Fly straight there, because at high altitude every minute burns more fuel.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'altitude-altitude', word: 'Altitude', meaning: 'Altitude is how high a place is above the sea, measured in metres, written m. Sea level is 0 m.'},
  {id: 'altitude-air-density', word: 'Air density', meaning: 'Air density is how much air is packed into one space, such as one jar. Air is densest at sea level, where all of the air above presses down on it.'},
  {id: 'altitude-thin-air', word: 'Thin air', meaning: 'Thin air is air with a low density, as at high altitude. In thin air a rotor has less air to throw down, so the rotor pushes less.'},
].map(Object.freeze));

// ---- the flight on the pad: where the helicopter is, its load and the lever (0 to 1, as the game's collective) ----
export const HOVER_M = 1, CEILING_M = 4;
const SETTLE_S = 1.6, LEVER_RATE = .8;
const flight = (place, load = {}) => ({place, crates: load.crates ?? 0, car: load.car ?? 0, lever: 0, h: 0});
const loaded = f => f.crates > 0 || f.car > 0;
const liftOf = f => f.lever * MOST[f.place];
function motion(f) {
  const w = weightOf(f), lift = liftOf(f);
  return lift > w + .5 ? 'climb' : lift >= w - .5 ? 'hover' : 'down';
}
function fly(f, dt) {
  const mode = motion(f), w = weightOf(f);
  if (mode === 'climb') f.h = Math.min(CEILING_M, f.h + Math.min(3, .8 + (liftOf(f) - w) / 600) * dt);
  else if (mode === 'hover') f.h = f.h < HOVER_M ? Math.min(HOVER_M, f.h + dt) : Math.max(HOVER_M, f.h - dt);
  else f.h = Math.max(0, f.h - 2.5 * dt);
}
export function status(f) {
  const mode = motion(f);
  if (mode === 'down') return f.h > 0 ? 'sinking' : f.lever > 0 && loaded(f) ? 'stays' : 'pad';
  if (mode === 'hover') return f.h >= HOVER_M - .01 ? 'hovering' : 'rising';
  return 'climbing';
}
// Notches of a tenth, the red line and the top. A held key stops at the red line; a fresh press goes past it.
function levels(f) {
  const out = Array.from({length: 11}, (_, i) => i / 10), r = hoverShare(f.place, f);
  if (r < 1) out.push(r);
  return [...new Set(out)].sort((a, b) => a - b);
}
function notch(f, dir, held) {
  if (held && Math.abs(f.lever - hoverShare(f.place, f)) < 1e-6) return false;
  const all = levels(f), next = dir > 0 ? all.find(n => n > f.lever + 1e-6) : [...all].reverse().find(n => n < f.lever - 1e-6);
  if (next === undefined) return false;
  f.lever = next; return true;
}
// A drag sets the lever anywhere; the lever clicks onto the red line or the top stop when close.
function setLever(f, value) {
  const r = hoverShare(f.place, f);
  let lever = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  if (r <= 1 && Math.abs(lever - r) <= .04) lever = r;
  else if (1 - lever <= .03) lever = 1;
  else lever = Math.round(lever * 100) / 100;
  if (Math.abs(lever - f.lever) < 1e-6) return false;
  f.lever = lever; return true;
}

// ---- the sums beside the board: each comes out on a calculator from exactly the numbers it shows ----
const whole = value => Math.round(value).toLocaleString('en-GB');
const BASE_KG = KESTREL.maxThrust / GRAVITY, GROUND = 1 + KESTREL.groundEffect, SCALE_M = KESTREL.airScaleHeight;
const BASE_SHOWN = BASE_KG.toLocaleString('en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const IDLE_SHOWN = Math.round(KESTREL.burnIdle * 60), BURN_SHOWN = Math.round(KESTREL.burnPerCollective * 60);
// A lever on a round number shows two decimals; one on the red line shows four, so that the sums still come out.
const leverShown = lever => Math.abs(Number(lever.toFixed(2)) - lever) < 1e-9 ? lever.toFixed(2) : lever.toFixed(4);
// The push the board and the panel both show: the lever as shown, times the most push as shown.
export const pushAt = (place, lever) => Number(leverShown(lever)) * Math.round(MOST[place]);
const airShown = place => Math.pow(1 - .0065 * HEIGHT[place] / 288.15, 4.256).toFixed(2);
const shareShown = place => Math.pow(2.718, -HEIGHT[place] / SCALE_M).toFixed(4);
// While a guess or a question is open, a sum shows only its general formula.
const general = ({title, formula}) => ({title, formula});
const altitudeSum = place => ({title: 'Altitude', formula: 'altitude = height of the place − height of the sea', worked: `${whole(HEIGHT[place])} m − 0 m = ${whole(HEIGHT[place])} m`,
  note: 'The surface of the sea is counted as 0 m, so the altitude of a place is its height above the sea in metres.'});
const airSum = (place, note = false) => ({title: 'Air density at this height', formula: 'air share = (1 − 0.0065 × height ÷ 288.15) ^ 4.256',
  worked: `(1 − 0.0065 × ${whole(HEIGHT[place])} ÷ 288.15) ^ 4.256 = ${airShown(place)}, which is ${dots(AIR[place])} dots in the jar`,
  note: note ? 'The mark ^ means “to the power of”. Air cools by 0.0065 degrees for each metre of height, and 288.15 is the temperature at Sea level, counted in degrees from the coldest temperature possible. Pilots use this rule as the average for the real air.' : null});
const shareSum = (place, note = false) => ({title: 'How much of the push remains', formula: `push share = 2.718 ^ (−height ÷ ${whole(SCALE_M)})`, worked: `2.718 ^ (−${whole(HEIGHT[place])} ÷ ${whole(SCALE_M)}) = ${shareShown(place)}`,
  note: note ? `In this game one rule covers both effects of thin air, the smaller amount of air thrown down and the weaker engine. Every ${whole(SCALE_M)} m of height divides the push by 2.718, so the push falls a little faster than the air in the jar.` : null});
const mostSum = (place, note = false) => ({title: 'The most the rotor can push', formula: `most push = ${BASE_SHOWN} kg × ${GROUND} × push share`, worked: `${BASE_SHOWN} × ${GROUND} × ${shareShown(place)} = ${kg(MOST[place])}`,
  note: note ? `${BASE_SHOWN} kg is the most the rotor can push at Sea level when the helicopter is well above the ground. Close to the ground the air thrown down cannot get away so easily, which gives 15% more push, so we multiply by ${GROUND}. Every push in this lesson is measured on the pad, close to the ground.` : null});
const pushSum = (f, note = false) => ({title: 'The push at this lever setting', formula: 'push = lever × most push', worked: `${leverShown(f.lever)} × ${kg(MOST[f.place])} = ${kg(pushAt(f.place, f.lever))}`,
  note: note ? 'The lever’s percentage says how much of the most push is being used. A lever at 70% is the same as 0.70, because % means “out of every hundred”.' : null});
const loadWords = f => f.car ? kg(CAR_KG) : `${f.crates} × ${kg(CRATE_KG)}`;
const weightSum = (f, note = false) => ({title: 'The total weight', formula: 'weight = helicopter + load', worked: `${kg(OWN_KG)} + ${loadWords(f)} = ${kg(weightOf(f))}`,
  note: note ? `The helicopter’s ${kg(OWN_KG)} includes the pilot and a full tank. The load leaves the ground only when the push is greater than the weight.` : null});
const HOVER_NOTE = 'The helicopter hovers when the push equals the weight. The push is lever × most push, so the helicopter hovers with the lever at weight ÷ most push.';
function hoverSum(place, weight, {note = false, title = 'The lever needed to hover', before = ''} = {}) {
  const share = weight / Math.round(MOST[place]), reach = Math.round(weight / MOST[place] * 100);
  return {title, formula: 'lever to hover = weight ÷ most push', worked: `${before}${kg(weight)} ÷ ${kg(MOST[place])} = ${share.toFixed(4)}, which is ${reach}%${share > 1 ? ', so the lever cannot reach it' : ''}`, note: note ? HOVER_NOTE : null};
}
function cratesSum(place, hidden = false) {
  const room = (Math.round(MOST[place]) - OWN_KG) / CRATE_KG;
  return {title: 'The crates the helicopter can carry', formula: `crates = (most push − helicopter) ÷ ${kg(CRATE_KG)}, rounded down`,
    worked: `(${kg(MOST[place])} − ${kg(OWN_KG)}) ÷ ${kg(CRATE_KG)} = ${hidden ? '?' : `${room.toFixed(2)}, so ${Math.floor(room)} crates`}`};
}
function fuelSum(lever, note = false) {
  const shown = leverShown(Math.min(1, lever));
  return {title: 'Fuel burned each minute', formula: `fuel = ${IDLE_SHOWN} kg + ${BURN_SHOWN} kg × lever`, worked: `${IDLE_SHOWN} + ${BURN_SHOWN} × ${shown} = ${(IDLE_SHOWN + BURN_SHOWN * Number(shown)).toFixed(1)} kg a minute`,
    note: note ? `The engine burns ${IDLE_SHOWN} kg each minute with the lever all the way down, and up to ${BURN_SHOWN} kg more as the lever rises. The game weighs its fuel in kilograms, and a full tank holds ${kg(KESTREL.tankKg)}.` : null};
}

const drawn = f => f && ({place: f.place, crates: f.crates, car: f.car, lever: f.lever, lift: pushAt(f.place, f.lever), weight: weightOf(f), most: MOST[f.place],
  hover: hoverShare(f.place, f), h: f.h, status: status(f), air: AIR[f.place], name: NAME[f.place], height: HEIGHT[f.place]});

// ---- keys (the screen shows them on its buttons and the board) ----
const PLACE_KEYS = Object.freeze({'↑': 'place:up', '↓': 'place:down'});
const LEVER_KEYS = Object.freeze({W: 'lever:up', '↑': 'lever:up', S: 'lever:down', '↓': 'lever:down'});
const LEVER_REPEAT = Object.freeze(['W', '↑', 'S', '↓']);
const LOAD_KEYS = Object.freeze({1: 'crate:add', 2: 'crate:remove', Space: 'go'});
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `${n === 2 ? 'guess' : 'answer'}:${i}`]));
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const UP_HINTS = [`The mountain is on the left, with ${NAME[SEA]} at the foot and ${NAME[SUMMIT]} at the top.`, `Press ↑ until the stand is at ${NAME[SUMMIT]}, or click ${NAME[SUMMIT]}.`, `Watch my pointer, which is on ${NAME[SUMMIT]}.`];
const WAIT = 'Please wait a moment.', ANY_GUESS = 'Any guess is fine, so pick one and then we will test it.';
const MOVE_ON = 'You can move the stand with ↑ and ↓ to compare the places.';

// ---- the guided tries ----
const CAR_GUESSES = Object.freeze([
  {id: 'up', label: 'Yes, the helicopter lifts the car', picture: {kind: 'verdict', up: true}},
  {id: 'down', label: 'No, the car stays on the ground', picture: {kind: 'verdict', up: false}},
]);
const LEVER_GUESSES = Object.freeze([
  {id: 'lower', label: `Lower than ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: .3, ghost: HOVER_SEA}},
  {id: 'same', label: `At the same place, ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: HOVER_SEA, ghost: HOVER_SEA}},
  {id: 'higher', label: `Higher than ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: .8, ghost: HOVER_SEA}},
]);
const tooHeavy = kg(CAR_W - MOST[SUMMIT]);
const leverWhy = `The air is thinner, so the rotor needs more lever just to hover, and more lever burns more fuel, at ${perMinute(fuelPerMinute(HOVER_TOP))} at ${NAME[SUMMIT]} against ${perMinute(fuelPerMinute(HOVER_SEA))} at ${NAME[SEA]}.`;

// ---- the checks ----
const CHECKS = {
  'check-why': {
    question: `Why can the rotor push less at ${NAME[SUMMIT]} than at ${NAME[SEA]}?`,
    answers: [{label: 'Because the air is thinner, so each sweep of the blades throws less air down', picture: {kind: 'jars'}},
      {label: `Because the helicopter is heavier at ${NAME[SUMMIT]}`, picture: {kind: 'heavier'}}, {label: `Because the rotor spins more slowly at ${NAME[SUMMIT]}`, picture: {kind: 'slower'}}],
    correct: 0,
    right: () => `Correct. A jar of air at ${NAME[SUMMIT]} holds ${dots(AIR[SUMMIT])} dots where a jar from ${NAME[SEA]} holds 100, so each sweep of the blades has less air to throw down.`,
    wrong: picked => picked === 1 ? `The helicopter weighs ${kg(OWN_KG)} at ${NAME[SEA]} and at ${NAME[SUMMIT]}. What changes is the air, which has ${dots(AIR[SUMMIT])} dots in a jar instead of 100.`
      : `The rotor spins just as fast at ${NAME[SUMMIT]}. What changes is the air, because each sweep of the blades has ${dots(AIR[SUMMIT])} dots of air to throw down where ${NAME[SEA]} has 100.`,
    hints: ['Think about the two jars from the Air density step.', 'The weight of the helicopter and the speed of the rotor are the same at every place. What is different?', 'Pick the first card, which says that the air is thinner.'],
  },
  'check-car': {
    question: `Kestrel One and the Dusthawk together weigh ${kg(CAR_W)}. At which places can the helicopter lift the car?`,
    answers: [{label: `Only at ${NAME[SEA]}`, lifts: [true, false, false]}, {label: `At ${NAME[SEA]} and at ${NAME[RIDGE]}`, lifts: [true, true, false]}, {label: 'At all three places', lifts: [true, true, true]}]
      .map(a => ({...a, picture: {kind: 'places', lifts: a.lifts}})),
    correct: 1,
    right: () => `Correct. A weight of ${kg(CAR_W)} is less than the ${kg(MOST[SEA])} at ${NAME[SEA]} and the ${kg(MOST[RIDGE])} at ${NAME[RIDGE]}, but more than the ${kg(MOST[SUMMIT])} that the rotor can push at ${NAME[SUMMIT]}.`,
    wrong: picked => picked === 0 ? `At ${NAME[RIDGE]} the rotor can still push ${kg(MOST[RIDGE])}, which is more than ${kg(CAR_W)}, so the helicopter lifts the car there too. Only ${NAME[SUMMIT]} is too high.`
      : `At ${NAME[SUMMIT]} the rotor can push only ${kg(MOST[SUMMIT])}, which is ${tooHeavy} short of ${kg(CAR_W)}, so the car stays on the ground there.`,
    hints: [`The most the rotor can push is ${kg(MOST[SEA])} at ${NAME[SEA]}, ${kg(MOST[RIDGE])} at ${NAME[RIDGE]} and ${kg(MOST[SUMMIT])} at ${NAME[SUMMIT]}.`, `Which of those pushes are more than ${kg(CAR_W)}?`, `Pick the second card, which says ${NAME[SEA]} and ${NAME[RIDGE]}.`],
  },
  'check-game': {
    question: `In the challenge you carry a ${GAME_CRATE_KG} kg crate up to ${NAME[SUMMIT]} without refuelling on the way, and you must land with 30% of the tank left. Which plan gives you the best chance of doing that?`,
    answers: [{label: 'Fly straight there and land', picture: {kind: 'route', what: 'straight'}},
      {label: 'Keep the lever all the way up for the whole flight', picture: {kind: 'route', what: 'lever'}}, {label: 'Fill the tank at a pump on the way', picture: {kind: 'route', what: 'pump'}}],
    correct: 0,
    right: () => `Correct. With the crate on the cable, hovering by the pad at ${NAME[SUMMIT]} needs ${pct(GAME_TOP)} of the lever, against ${pct(GAME_SEA)} at ${NAME[SEA]}, and flying away from the ground needs more still. More lever burns more fuel every minute, so do not stay at ${NAME[SUMMIT]} for longer than you need.`,
    wrong: picked => picked === 1 ? `Keeping the lever all the way up burns the most fuel, ${perMinute(fuelPerMinute(1))}. Use only the lever that the helicopter needs, and fly straight there.`
      : 'Refuelling once the crate is on the cable does not count in this challenge, because the crate must be carried on one tank. Fly straight there.',
    hints: [`At ${NAME[SUMMIT]} every minute burns more fuel than at ${NAME[SEA]}.`, 'More lever burns more fuel, and this challenge allows no refuelling on the way.', 'Pick the first card, which says to fly straight there and land.'],
  },
};

// The settings Show me tries on the free test, as [place, crates].
const SHOW_ORDER = Object.freeze([[SEA, 0], [SEA, 2], [SUMMIT, 2], [SUMMIT, 4], [SEA, 4], [RIDGE, 3]]);

export function createModel() {
  let m = null;
  const seen = new Set(), said = {};
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'set', f: null, sets: null, guess: null, answered: null, result: null, say: '', settleAt: null, scoop: null, rows: [], results: [], tested: new Set(), delivery: 0};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.sets = [flight(SEA, {car: 1}), flight(SUMMIT, {car: 1})]; m.phase = 'running'; }
    if (id === 'word-altitude') m.f = flight(SEA);
    if (id === 'word-density' || id === 'word-thin') m.f = flight(SUMMIT);
    if (id === 'watch') { m.f = flight(SEA); m.phase = 'running'; }
    if (id === 'try-car') { m.f = flight(SEA, {car: 1}); m.phase = 'setup'; }
    if (id === 'try-lever') { m.f = flight(SEA); m.phase = 'setup'; }
    if (id === 'try-free' || id === 'alone') m.f = flight(SEA);
    if (CHECKS[id]) m.phase = 'ask';
    // A word step done before, visited again with Previous step: it shows what it found.
    if (said[id]) {
      m.say = said[id]; m.phase = 'done';
      if (id === 'word-altitude') m.f.place = SUMMIT;
      if (id === 'word-thin') m.f.lever = 1;
    }
  }

  // ↑ and ↓ move the stand a place up or down the mountain; a click goes straight to a place.
  function move(kind, value, keepLever = false) {
    const f = m.f, to = value === 'up' ? f.place + 1 : value === 'down' ? f.place - 1 : Number(value);
    if (!Number.isInteger(to)) return null;
    if (to < SEA) return {kind: 'note', say: `${NAME[SEA]} is as low as the stand goes, at 0 m.`};
    if (to > SUMMIT) return {kind: 'note', say: `${NAME[SUMMIT]} is as high as the stand goes, at ${metres(HEIGHT[SUMMIT])}.`};
    if (to === f.place) return null;
    f.place = to; f.h = 0;
    if (!keepLever) f.lever = 0;
    return {kind: 'sound', sound: 'lab.tick'};
  }
  const climbing = place => place === RIDGE ? `${NAME[RIDGE]} is ${metres(HEIGHT[RIDGE])} above the sea. Keep going, up to ${NAME[SUMMIT]}.` : `${NAME[SEA]} is 0 m above the sea. Now go up to ${NAME[SUMMIT]}.`;

  function act(action) {
    const id = step().id, [kind, value, extra] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (id === 'word-altitude') {
      if (kind !== 'place') return null;
      const wasDone = seen.has(id), moved = move(kind, value);
      if (moved?.kind !== 'sound' || wasDone) return moved;
      if (m.f.place === SUMMIT) {
        seen.add(id);
        said[id] = m.say = `${NAME[SUMMIT]} is ${metres(HEIGHT[SUMMIT])} above the sea, so its altitude is ${metres(HEIGHT[SUMMIT])}. ${NAME[RIDGE]} is lower, with an altitude of ${metres(HEIGHT[RIDGE])}. ${MOVE_ON}`;
        return {kind: 'right', sound: 'lab.tick', say: m.say};
      }
      return {kind: 'progress', sound: 'lab.tick', say: climbing(m.f.place)};
    }
    if (id === 'word-density') {
      if (kind === 'place' && m.phase === 'done') return move(kind, value);
      if (kind !== 'scoop' || m.phase !== 'set') return null;
      m.phase = 'running'; m.scoop = {at: m.time};
      return {kind: 'progress', say: `The lid comes off, the jar fills with the air at ${NAME[SUMMIT]}, and the lid goes back on.`};
    }
    if (id === 'word-thin') {
      if (kind === 'place' && m.phase === 'done') return move(kind, value, true);
      if (kind !== 'rotor' || m.phase !== 'set') return null;
      m.phase = 'running'; m.settleAt = null;
      return {kind: 'progress', say: 'The rotor is starting and the lever is going all the way up. Watch the green arrow, which shows the push.'};
    }
    if (id === 'try-car' || id === 'try-lever') return tryAct(id, kind, value, extra);
    if (id === 'try-free') {
      if (m.phase !== 'set') return null;
      if (kind === 'place') return move(kind, value);
      if (kind === 'crate') return load(value);
      if (kind === 'go') return liftOff();
      if (kind === 'set' && value === 'next') return testNext();
      return null;
    }
    if (id === 'alone' && kind === 'crate') return load(value);
    if (id === 'alone' && kind === 'go') return liftOff();
    return null;
  }

  function moveLever(kind, value, extra) {
    const f = m.f;
    if (kind === 'lever' && value === 'up') return notch(f, 1, extra === 'held');
    if (kind === 'lever' && value === 'down') return notch(f, -1, extra === 'held');
    if (kind === 'lever' && value === 'top') return setLever(f, 1);
    if (kind === 'lever' && value === 'weight') return setLever(f, hoverShare(f.place, f));
    if (kind === 'hold') return setLever(f, Number(value));
    return false;
  }

  function tryAct(id, kind, value, extra) {
    const f = m.f, car = id === 'try-car';
    if (m.phase === 'setup') {
      if (kind !== 'place') return null;
      const moved = move(kind, value);
      if (moved?.kind !== 'sound') return moved;
      if (f.place !== SUMMIT) return {kind: 'progress', sound: 'lab.tick', say: climbing(f.place)};
      m.phase = 'guess';
      return {kind: 'progress', sound: 'lab.tick', say: car ? GUESS_CAR : GUESS_LEVER};
    }
    if (m.phase === 'guess') {
      const picks = car ? CAR_GUESSES : LEVER_GUESSES, kindOf = car ? 'guess' : 'answer', pick = picks[Number(value)];
      if (kind !== kindOf || !pick) return null;
      m.guess = pick.id; m.phase = 'lever';
      return {kind: 'progress', say: car ? 'Now pull the lever all the way up by holding W.' : `Here is the answer: the red line is at ${pct(HOVER_TOP)}. Pull the lever up to the line by holding W.`};
    }
    if (m.phase !== 'lever' || !moveLever(kind, value, extra)) return null;
    if (car) {
      if (f.lever >= 1 - 1e-6) { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'The lever is all the way up. Watch the Dusthawk.'}; }
      return null;
    }
    const mode = motion(f);
    if (mode !== 'climb') m.past = false;
    else if (m.past) return null;
    if (mode === 'climb') { m.past = true; return {kind: 'fail', say: `The lever has gone past the red line, so the push of ${kg(pushAt(f.place, f.lever))} is more than the weight of ${kg(OWN_KG)} and the helicopter climbs. Bring the lever back to the line with S.`}; }
    if (mode === 'hover') { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'The lever is on the red line. Watch the helicopter.'}; }
    return null;
  }
  const GUESS_CAR = `${NAME[SUMMIT]} is ${metres(HEIGHT[SUMMIT])} above the sea, and the air there is thinner. Kestrel One and the Dusthawk still weigh ${kg(CAR_W)} together. Will the helicopter lift the car at ${NAME[SUMMIT]}?`;
  const GUESS_LEVER = `At ${NAME[SEA]} the red line is at ${pct(HOVER_SEA)}. Kestrel One weighs the same at ${NAME[SUMMIT]}, where the air is thinner. Where will the red line be at ${NAME[SUMMIT]}?`;

  // The free test and Brian's job load the same crates. Brian's job asks for one delivery at each place,
  // with as many crates as the helicopter can lift and still hover.
  function load(way) {
    const f = m.f;
    if (m.phase !== 'set') return null;
    if (way === 'add' && f.crates >= RACK) return {kind: 'note', say: `All ${RACK} crates are on the cable.`};
    if (way === 'remove' && f.crates <= 0) return {kind: 'note', say: 'There are no crates on the cable to take off.'};
    f.crates += way === 'add' ? 1 : -1; f.lever = 0; f.h = 0;
    return {kind: 'sound', sound: 'lab.clunk'};
  }
  function liftOff() {
    if (m.phase !== 'set') return null;
    m.phase = 'running'; m.settleAt = null; m.f.lever = 0; m.f.h = 0;
    return {kind: 'progress', say: goingUp(m.f)};
  }
  // With no crates there is no load to name.
  const weighing = f => f.crates ? `the helicopter and its load weigh ${kg(weightOf(f))}` : `the helicopter weighs ${kg(weightOf(f))} by itself`;
  const goingUp = f => `With ${crateWords(f.crates)} on the cable, ${weighing(f)}. The lever is going up, so watch what happens.`;
  const settingKey = f => `${f.place}/${f.crates}`;
  // Show me on the free test: the first setting not tested yet. The order changes the crates and then the place in turn,
  // so that the comparison teaches both, and every other setting follows it.
  function testNext() {
    const f = m.f, all = [...SHOW_ORDER, ...PLACES.flatMap((_, place) => Array.from({length: RACK + 1}, (_, crates) => [place, crates]))];
    const next = all.find(([place, crates]) => !m.tested.has(`${place}/${crates}`));
    if (next) [f.place, f.crates] = next;
    return liftOff();
  }

  function judgeFree() {
    const f = m.f, w = weightOf(f), most = MOST[f.place], here = NAME[f.place], fresh = !m.tested.has(settingKey(f)), hover = w <= most + .5;
    m.settleAt = null; m.phase = 'set';
    m.tested.add(settingKey(f));
    if (fresh) m.results = [...m.results, {name: here, crates: f.crates, weight: w, most, hover: hoverShare(f.place, f)}];
    if (m.tested.size >= FREE_TRIES) seen.add('try-free');
    if (!hover) { f.lever = 0; f.h = 0; }
    const what = hover ? `so the helicopter hovers with the lever at ${pct(hoverShare(f.place, f))}, and ${kg(most - w)} of push is left to spare.`
      : `so the load stays on the ground, because the load is ${kg(w - most)} too heavy.`;
    const then = seen.has('try-free') ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.';
    m.say = `At ${here} with ${crateWords(f.crates)}, ${weighing(f)} and the rotor can push ${kg(most)}, ${what} ${then}`;
    return {kind: 'right', say: m.say};
  }

  function judgeJob() {
    const f = m.f, w = weightOf(f), most = MOST[f.place], best = bestCrates(f.place), here = NAME[f.place];
    m.settleAt = null;
    const reset = () => { m.phase = 'set'; f.lever = 0; f.h = 0; };
    if (w > most + .5) { reset(); m.say = `A weight of ${kg(w)} is ${kg(w - most)} more than the ${kg(most)} that the rotor can push at ${here}, so the load stays on the ground. Take a crate off by pressing 2.`; return {kind: 'fail', say: m.say}; }
    if (f.crates < best) { reset(); m.say = `The helicopter hovers with a weight of ${kg(w)}, and at ${here} the rotor can push ${kg(most)}, which leaves room for ${kg(most - w)} more. A crate weighs ${kg(CRATE_KG)}, so add one by pressing 1.`; return {kind: 'fail', say: m.say}; }
    m.delivery += 1;
    if (m.delivery >= PLACES.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `You carried ${crateWords(bestCrates(SEA))} at ${NAME[SEA]}, ${crateWords(bestCrates(RIDGE))} at ${NAME[RIDGE]} and ${crateWords(bestCrates(SUMMIT))} at ${NAME[SUMMIT]}, which finishes the job. The higher the place, the thinner the air, and the fewer crates the helicopter can carry.`;
      return {kind: 'pass', say: m.say};
    }
    m.say = `Correct. ${cap(crateWords(f.crates))} bring the weight to ${kg(w)} and the helicopter hovers, and one more crate would be too heavy. The next delivery is at ${NAME[m.delivery]}, ${metres(HEIGHT[m.delivery])} above the sea.`;
    m.f = flight(m.delivery); m.phase = 'set';
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    for (const f of m.sets ?? []) fly(f, dt);
    if (id === 'wonder') return wonder();
    if (id === 'watch') return watch(dt);
    if (m.f) fly(m.f, dt);
    if (id === 'word-density' && m.phase === 'running' && m.time - m.scoop.at >= 1.4) {
      m.phase = 'done'; seen.add(id);
      said[id] = m.say = `The same jar holds only ${dots(AIR[SUMMIT])} dots of air at ${NAME[SUMMIT]}, where the jar from ${NAME[SEA]} holds 100. There is less air packed into the same space, so the air density at ${NAME[SUMMIT]} is lower, at ${pct(AIR[SUMMIT])} of the density at ${NAME[SEA]}. The mark % means “out of every hundred”. ${MOVE_ON}`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-thin' && m.phase === 'running') {
      if (m.f.lever < 1) { m.f.lever = Math.min(1, m.f.lever + LEVER_RATE * dt); if (m.f.lever >= 1) m.settleAt = m.time + 1; return null; }
      if (m.time < m.settleAt) return null;
      m.phase = 'done'; seen.add(id);
      said[id] = m.say = `With the lever all the way up at ${NAME[SUMMIT]}, the rotor pushes ${kg(MOST[SUMMIT])}, against ${kg(MOST[SEA])} at ${NAME[SEA]}, which is ${pct(LIFT_SHARE[SUMMIT])} as much. The blades spin just as fast, but each sweep catches less air because the air is thinner, and throwing less air down makes a smaller push. The engine also burns its fuel with air from outside, so thin air gives the engine less power. This game uses one rule for both effects, shown in the physics panel, which is why the push falls to ${pct(LIFT_SHARE[SUMMIT])} while the air in the jar falls to ${pct(AIR[SUMMIT])}. ${MOVE_ON}`;
      return {kind: 'right', say: m.say};
    }
    if ((id === 'alone' || id === 'try-free') && m.phase === 'running') {
      const goal = Math.min(1, hoverShare(m.f.place, m.f));
      if (m.f.lever < goal) { m.f.lever = Math.min(goal, m.f.lever + LEVER_RATE * dt); if (m.f.lever >= goal) m.settleAt = m.time + SETTLE_S; return null; }
      if (m.settleAt == null) m.settleAt = m.time + SETTLE_S;
      if (m.time >= m.settleAt) return id === 'alone' ? judgeJob() : judgeFree();
      return null;
    }
    if ((id === 'try-car' || id === 'try-lever') && m.phase === 'running' && m.time >= m.settleAt) return finishTry(id);
    return null;
  }

  function finishTry(id) {
    m.phase = 'result'; m.settleAt = null; seen.add(id);
    if (id === 'try-car') {
      const right = m.guess === 'down';
      m.result = {actual: 'down', right};
      const why = 'The load did not change between the two places, but the air did.';
      m.say = right ? `Correct. The weight of ${kg(CAR_W)} is more than the ${kg(MOST[SUMMIT])} that the rotor can push at ${NAME[SUMMIT]}, so the load is ${tooHeavy} too heavy and the car stays on the ground. ${why}`
        : `The car stays on the ground. The weight of ${kg(CAR_W)} is more than the ${kg(MOST[SUMMIT])} that the rotor can push at ${NAME[SUMMIT]}, so the load is ${tooHeavy} too heavy. At ${NAME[SEA]} the rotor can push ${kg(MOST[SEA])}. ${why}`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    const right = m.guess === 'higher';
    m.result = {actual: 'higher', right};
    m.say = right ? `Correct, the red line is at ${pct(HOVER_TOP)}. ${leverWhy}` : `The red line went higher, to ${pct(HOVER_TOP)}, not ${m.guess === 'same' ? pct(HOVER_SEA) : `below ${pct(HOVER_SEA)}`}. ${leverWhy}`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // The wonder: the same load, the lever all the way up at both places; the car lifts at Sea level and stays down up high.
  function wonder() {
    const t = m.time;
    if (t >= .6) for (const f of m.sets) f.lever = 1;
    if (t >= 4.5 && !seen.has('wonder')) seen.add('wonder');
    return null;
  }
  // The watch: the stand visits each place in turn, the lever goes all the way up, and the table fills in.
  const WATCH_AT = [.6, 3.8, 7], WATCH_END = 10.2;
  function watch(dt) {
    const t = m.time, f = m.f, at = WATCH_AT.findLastIndex(a => t >= a);
    if (at >= 0 && f.place !== at) { f.place = at; f.lever = 0; f.h = 0; }
    if (at >= 0 && t >= WATCH_AT[at] + .5) f.lever = Math.min(1, f.lever + LEVER_RATE * dt);
    fly(f, dt);
    for (let i = 0; i < PLACES.length; i++) if (t >= WATCH_AT[i] + 2.3 && !m.rows[i]) m.rows[i] = {name: NAME[i], height: HEIGHT[i], air: AIR[i], most: MOST[i]};
    if (t >= WATCH_END && m.phase !== 'done') { seen.add('watch'); m.phase = 'done'; }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The sums for this step: only what has been explained so far, with the numbers now on the board. While a guess or a
  // question is open, the panel shows general formulas and numbers that do not settle it.
  function sums() {
    const id = step().id, f = m.f, place = f?.place ?? SUMMIT, answered = m.answered !== null;
    if (id === 'wonder') return [];
    if (id === 'word-altitude') return [altitudeSum(place)];
    if (id === 'word-density') return [airSum(place, true)];
    if (id === 'word-thin') return [airSum(place), shareSum(place, true), mostSum(place, true), pushSum(f, true)];
    if (id === 'watch') return [airSum(place), shareSum(place), mostSum(place), pushSum(f)];
    if (id === 'try-car') return m.phase === 'guess' ? [general(mostSum(place)), weightSum(f, true)] : [mostSum(place), weightSum(f, true), pushSum(f)];
    if (id === 'try-lever') {
      if (m.phase === 'setup' || m.phase === 'guess') return [{...mostSum(SEA), title: `The most the rotor can push at ${NAME[SEA]}`}, weightSum(f), hoverSum(SEA, OWN_KG, {note: true, before: `At ${NAME[SEA]}, `})];
      return [mostSum(place), weightSum(f), hoverSum(place, weightOf(f), {note: true}), pushSum(f), ...(m.phase === 'result' ? [fuelSum(hoverShare(place, f), true)] : [])];
    }
    if (id === 'try-free') return [shareSum(place), mostSum(place), weightSum(f), hoverSum(place, weightOf(f)), cratesSum(place), fuelSum(hoverShare(place, f))];
    if (id === 'alone') return [mostSum(place), weightSum(f), hoverSum(place, weightOf(f)), cratesSum(place, m.phase !== 'done')];
    if (id === 'check-why') return answered ? [airSum(SUMMIT), shareSum(SUMMIT), mostSum(SUMMIT)] : [general(mostSum(SUMMIT)), general(pushSum(flight(SEA)))];
    if (id === 'check-car') return answered ? [weightSum({car: 1, crates: 0}), mostSum(SEA), mostSum(RIDGE), mostSum(SUMMIT)] : [weightSum({car: 1, crates: 0}), general(mostSum(SEA))];
    if (id === 'check-game') return answered ? [hoverSum(SEA, weightOf(GAME_LOAD), {title: `With the crate at ${NAME[SEA]}`}), hoverSum(SUMMIT, weightOf(GAME_LOAD), {title: `With the crate at ${NAME[SUMMIT]}`}), fuelSum(1, true)]
      : [{...general(weightSum({})), worked: `${kg(OWN_KG)} + ${kg(GAME_CRATE_KG)} = ${kg(weightOf(GAME_LOAD))}`}, general(hoverSum(SUMMIT, OWN_KG))];
    return [airSum(SUMMIT), shareSum(SUMMIT), mostSum(SUMMIT), hoverSum(SUMMIT, OWN_KG), cratesSum(SUMMIT), fuelSum(Number(leverShown(HOVER_TOP)))];
  }

  function view() { return {...viewNow(), formulas: sums()}; }

  function viewNow() {
    const id = step().id;
    const base = {scene: 'stand', time: m.time, flight: drawn(m.f), sets: m.sets?.map(drawn) ?? null, keys: {}, repeat: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), mountain: true, jar: null, readouts: null, lever: null, table: null, results: null, rack: false, column: false, caption: false};
    const here = m.f?.place ?? SEA;
    if (id === 'wonder') return {...base, scene: 'wonder', actions: ['replay'],
      say: seen.has(id) ? `The two helicopters and the two cars are identical, and both levers are all the way up. At ${NAME[SEA]} the helicopter lifts the car, but at ${NAME[SUMMIT]} the car does not leave the ground. What is different at ${NAME[SUMMIT]}?`
        : `This helicopter is called Kestrel One, and a rally car called the Dusthawk hangs under the helicopter on a cable. One helicopter stands at ${NAME[SEA]} and an identical one stands at ${NAME[SUMMIT]}, which is high on the mountain. Both pilots will pull the control lever all the way up. Watch the two cars.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the two cars.',
      hints: ['Watch the two cars.', 'The helicopter and the car are the same in both pictures, and only the place is different.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch, and then press Enter.']};
    if (id === 'word-altitude') {
      const done = seen.has(id);
      return {...base, keys: PLACE_KEYS, waiting: !done, target: done ? null : 'place:2', glow: done ? null : 'mountain',
        say: done ? m.say : `Altitude is how high a place is above the sea. We measure height in metres, written m, and one metre is about the length of a long stride. ${NAME[SEA]}, the height of the surface of the sea, is 0 m. Kestrel One is on its test stand, a pad where we can measure the helicopter, and the stand is at ${NAME[SEA]}. Move the stand up the mountain to ${NAME[SUMMIT]}.`,
        prompt: done ? 'Press Enter to continue, or keep moving the stand with ↑ and ↓.' : `Press ↑ to move the stand up the mountain, or click ${NAME[SUMMIT]}.`, hints: done ? DONE : UP_HINTS};
    }
    if (id === 'word-density') {
      const done = m.phase === 'done', filling = m.phase === 'running';
      const fill = done ? AIR[here] : filling ? AIR[SUMMIT] * Math.min(1, (m.time - m.scoop.at) / 1.2) : 0;
      return {...base, column: true, jar: {share: fill, sea: true, scooping: filling}, keys: m.phase === 'set' ? {Space: 'scoop'} : done ? PLACE_KEYS : {}, waiting: m.phase === 'set', target: m.phase === 'set' ? 'scoop' : null, glow: m.phase === 'set' ? 'jar' : null,
        say: done ? m.say : `Air density is how much air is packed into one space, such as one jar. Air is made of tiny particles, far too small to see, and gravity pulls them towards the ground, so air has weight. The air at ${NAME[SEA]} has all of the air above pressing down on it, which squeezes the particles close together. Higher up there is less air above to press down, so the particles spread apart, as the tall column in the picture shows. The jar on the right was filled at ${NAME[SEA]}, and we draw it with 100 dots. Fill the empty jar with the air at ${NAME[SUMMIT]}.`,
        prompt: done ? 'Press Enter to continue, or keep moving the stand with ↑ and ↓.' : filling ? 'Watch the jar.' : 'Press Space to fill the jar, or click the empty jar.',
        hints: done ? DONE : [`The empty jar is on the right, beside the jar from ${NAME[SEA]}.`, 'Press Space.', 'Watch my pointer, which is on the jar.']};
    }
    if (id === 'word-thin') {
      const done = m.phase === 'done', set = m.phase === 'set';
      return {...base, jar: {share: AIR[here]}, readouts: {most: true, seaMost: true}, lever: {red: false}, air: !set, caption: !set,
        keys: set ? {Space: 'rotor'} : done ? PLACE_KEYS : {}, waiting: set, target: set ? 'rotor' : null, glow: set ? 'rotor' : null,
        say: done ? m.say : `Thin air is air with a low density, as the air at ${NAME[SUMMIT]} has. To see what thin air does, we need the rotor, which is the set of long blades on top of Kestrel One. The spinning blades throw air down, and the air pushes back up on the blades with an equal force. We call that force the push. A litre of water weighs one kilogram, written kg, and we measure the push in kilograms too, because one kilogram of push can hold up one kilogram of weight. The collective lever, on the left of the picture, sets how much of the rotor’s greatest push the pilot is using. A lever at 0% gives no push, and a lever at 100% gives the most push the rotor can make at that place. Start the rotor, and the lever will go all the way up to 100%.`,
        prompt: done ? 'Press Enter to continue, or keep moving the stand with ↑ and ↓.' : set ? 'Press Space to start the rotor, or click the rotor.' : 'Watch the green arrow.',
        hints: done ? DONE : ['The rotor is the set of long blades on top of Kestrel One.', 'Press Space.', 'Watch my pointer, which is on the rotor.']};
    }
    if (id === 'watch') {
      const done = seen.has(id);
      return {...base, jar: {share: AIR[here]}, readouts: {most: true}, lever: {red: false}, air: m.f.lever > 0, caption: m.f.lever > 0, actions: ['replay', 'slow'],
        table: PLACES.map((_, i) => m.rows[i] ?? null),
        say: m.phase === 'done' ? `The higher the place, the less air a jar holds, and the less the rotor can push. The most push is ${kg(MOST[SEA])} at ${NAME[SEA]}, ${kg(MOST[RIDGE])} at ${NAME[RIDGE]} and ${kg(MOST[SUMMIT])} at ${NAME[SUMMIT]}.`
          : 'Now the stand will visit each place in turn. At each place the lever goes all the way up, and we write down the most that the rotor can push.',
        prompt: m.phase === 'done' ? 'Press Enter to continue, or press R to watch again.' : 'Watch the jar and the green arrow.',
        hints: ['Watch the jar at each place.', 'Then watch the most that the rotor can push.', done ? 'Press R to watch again.' : WAIT]};
    }
    if (id === 'try-car' || id === 'try-lever') return tryView(id, base);
    if (id === 'try-free') return freeView(base);
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: 'check', mountain: false, keys: answered ? {} : PICK_KEYS(3), waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        check: id, answered,
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', mountain: false, ready: true, ideas: KEY_IDEAS,
      say: `Higher up there is less air above to press down, so the air is thinner. The rotor then has less air to throw down, and the engine has less air to burn its fuel with. At ${NAME[SUMMIT]} a jar holds about three quarters of the air that it holds at ${NAME[SEA]}, and in this game the rotor pushes ${pct(LIFT_SHARE[SUMMIT])} as much. So plan your load for the height where you will land, and fly straight there, because at high altitude the helicopter burns fuel faster.`,
      prompt: 'Press Enter to try this in the helicopter, or press Esc to go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function tryView(id, base) {
    const f = m.f, car = id === 'try-car', asking = m.phase === 'guess';
    // While the guess is open, the board keeps the most push at this place to itself.
    const common = {...base, jar: {share: AIR[f.place]}, readouts: {most: !asking, weight: true, hover: !car && m.phase !== 'setup' && !asking},
      lever: {red: !car && m.phase !== 'setup' && !asking, ghost: car ? null : HOVER_SEA, unknown: !car && (m.phase === 'setup' || asking)}, air: f.lever > 0};
    if (m.phase === 'setup') return {...common, keys: PLACE_KEYS, waiting: true, target: 'place:2', glow: 'mountain',
      say: m.say || (car ? `With the Dusthawk on the cable, Kestrel One and the car weigh ${kg(CAR_W)} together. That is less than the ${kg(MOST[SEA])} that the rotor can push at ${NAME[SEA]}, so the helicopter can lift the car there. Now move the stand, with the Dusthawk, up to ${NAME[SUMMIT]}.`
        : `Now there is no load on the cable. To hover means to stay still in the air, which happens when the push exactly equals the weight. The red line on the lever marks the setting that makes the helicopter hover. At ${NAME[SEA]} the red line is at ${pct(HOVER_SEA)}, because the helicopter’s ${kg(OWN_KG)} is ${pct(HOVER_SEA)} of the ${kg(MOST[SEA])} that the rotor can push. Move the stand up to ${NAME[SUMMIT]}.`),
      prompt: `Press ↑ to move the stand up, or click ${NAME[SUMMIT]}.`, hints: UP_HINTS};
    if (asking) {
      const picks = car ? CAR_GUESSES : LEVER_GUESSES;
      return {...common, keys: PICK_KEYS(picks.length), waiting: true,
        cards: picks.map((g, i) => ({id: `${car ? 'guess' : 'answer'}:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
        say: car ? GUESS_CAR : GUESS_LEVER,
        prompt: `Pick a card by clicking it, or press 1${picks.length === 3 ? ', 2 or 3' : ' or 2'}.`,
        hints: car ? [`Think back to the table in the Three places step, and compare the weight of ${kg(CAR_W)} with the most push at ${NAME[SUMMIT]}.`, 'If the weight is greater than the most push, the car stays on the ground.', ANY_GUESS]
          : [`At ${NAME[SUMMIT]} each sweep of the blades throws less air.`, 'The same lever gives less push here, so to match the weight, should the lever be higher or lower?', ANY_GUESS]};
    }
    if (m.phase === 'lever') {
      const target = car ? 'lever:top' : 'lever:weight', above = !car && f.lever > hoverShare(f.place, f) + 1e-6;
      return {...common, keys: LEVER_KEYS, repeat: LEVER_REPEAT, waiting: true, target, glow: target, guess: m.guess,
        say: car ? 'Now pull the lever all the way up.' : `The red line is at ${pct(HOVER_TOP)}. Bring the lever to the line.`,
        prompt: car ? 'Hold W or ↑, or drag the lever, all the way to the top.' : above ? 'Hold S or ↓, or drag the lever, down to the red line.' : 'Hold W or ↑, or drag the lever, up to the red line.',
        hints: car ? ['The lever is on the left of the pad.', 'Hold W until the lever stops at the top.', 'Watch my pointer, which is on the top of the lever.']
          : ['The red line marks the lever setting at which the helicopter hovers at this place.', `Hold ${above ? 'S' : 'W'} until the lever reaches the red line, and the lever will stop there for you.`, 'Watch my pointer, which is on the red line.']};
    }
    if (m.phase === 'running') return {...common, guess: m.guess, say: car ? 'The lever is all the way up. Watch the Dusthawk.' : 'The lever is on the red line. Watch the helicopter.', prompt: 'Watch the pad.', hints: ['Watch the load.', 'Watch the push and the weight.', WAIT]};
    const picks = car ? CAR_GUESSES : LEVER_GUESSES;
    return {...common, ready: true, mood: m.result.right ? 'cheer' : 'explain', guess: m.guess, readouts: {...common.readouts, fuel: !car},
      cards: picks.map((g, i) => ({id: `${car ? 'guess' : 'answer'}:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})),
      say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
  }

  function freeView(base) {
    const f = m.f, id = 'try-free', tested = m.tested.has(settingKey(f));
    const common = {...base, jar: {share: AIR[f.place]}, readouts: {most: true, weight: true, hover: true}, lever: {red: true}, rack: true, air: f.lever > 0, results: m.results};
    if (m.phase === 'running') return {...common, say: goingUp(f), prompt: 'Watch the pad.', hints: ['Watch the push and the weight.', 'Compare this result with the table.', WAIT]};
    return {...common, keys: {...PLACE_KEYS, ...LOAD_KEYS}, target: tested ? 'set:next' : 'go', waiting: !seen.has(id),
      say: m.say || `Now you can experiment. Press ↑ and ↓ to move the stand between the three places, and press 1 and 2 to add or remove a crate of ${kg(CRATE_KG)}. Watch the physics panel change as you do, and predict what the helicopter will do before you press Space to test it. Test at least ${FREE_TRIES} different settings. The table keeps your results so that you can compare them.`,
      prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the place or the crates, then press Space to test. Different settings tested so far: ${m.tested.size} of ${FREE_TRIES}.`,
      hints: ['Press Space to test the settings as they are.', 'Try a heavy load at the top of the mountain, and the same load at the bottom.', tested ? 'Watch my pointer. I will choose a different setting and test it.' : 'Watch my pointer. I will test the settings as they are.']};
  }

  function jobView(base) {
    const f = m.f, best = bestCrates(f.place), done = m.phase === 'done';
    const job = {delivery: Math.min(m.delivery, PLACES.length - 1) + 1, of: PLACES.length, done};
    const common = {...base, jar: {share: AIR[f.place]}, readouts: {most: true, weight: true}, lever: {red: true}, rack: true, job, air: f.lever > 0};
    if (done) return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'running') return {...common, say: goingUp(f), prompt: 'Watch the pad.', hints: ['Does the helicopter lift the crates?', 'Does the helicopter hover with no room for another crate?', WAIT]};
    const target = f.crates < best ? 'crate:add' : f.crates > best ? 'crate:remove' : 'go';
    return {...common, keys: LOAD_KEYS, waiting: true, target, glow: target,
      say: m.say || `Here is my job for you, which is three deliveries, one to each place. At each place, load as many crates as the helicopter can lift and still hover, and then lift off. Each crate weighs ${kg(CRATE_KG)}. The first delivery is at ${NAME[SEA]}.`,
      prompt: `At ${NAME[f.place]} ${onCable(f.crates)}, so the weight is ${kg(weightOf(f))}. Press 1 to add a crate, 2 to take one off, or Space to lift off.`,
      hints: [`At this place the rotor can push ${kg(MOST[f.place])}. The helicopter weighs ${kg(OWN_KG)} by itself, and each crate weighs ${kg(CRATE_KG)}.`,
        `${kg(MOST[f.place])} minus ${kg(OWN_KG)} leaves ${kg(MOST[f.place] - OWN_KG)}. How many crates of ${kg(CRATE_KG)} fit into that?`,
        target === 'go' ? 'Watch my pointer, which is on the pad. I will lift off.' : target === 'crate:add' ? 'Watch my pointer, which is on the crates. I will add one crate.' : 'Watch my pointer, which is on the last crate. I will take that crate off.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'altitude', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
