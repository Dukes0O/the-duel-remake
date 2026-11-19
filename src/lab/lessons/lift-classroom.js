// Lift and weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-LIFT.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every weight and lift on screen
// comes from padForces(), which reads the helicopter's own flight rules (heliMass, availableThrust) with a full tank.
import {GRAVITY, KESTREL, PAD, padForces} from '../benches/lift-pad.js';
import {MORE} from '../classroom/brian-text.js';

const forces = load => padForces({fuel: KESTREL.tankKg, crates: load.crates ?? 0, car: load.car ?? 0}, 0);
export const weightOf = load => forces(load).massKg;
export const OWN_KG = weightOf({});
// The most the rotor can push close to the ground, with the lever all the way up.
export const MOST_KG = forces({}).maximumN / GRAVITY;
export const CRATE_KG = PAD.crateKg, CAR_KG = PAD.carKg, MAX_CRATES = PAD.maxCrates;
// The lever moves a notch at a time; a notch is one crate's worth of lift.
export const NOTCH_KG = PAD.crateKg;
const SNAP_KG = 150;
export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
const MOST = kg(Math.floor(MOST_KG));
const MOST_SHOWN = Math.floor(MOST_KG);
const over = load => Math.ceil(weightOf(load) - MOST_KG);
// The most crates the helicopter can lift with the Dusthawk on the cable: the answer to Brian's job.
export const BEST_CRATES = Math.floor((MOST_KG - weightOf({car: 1})) / CRATE_KG);
// Heights in metres above the pad: the hover mark, the board's top, the game challenge's band and hold.
export const HOVER_M = 1, CEILING_M = 10, BAND_M = Object.freeze([2, 5]), HOLD_S = 10;
// The free test keeps the helicopter low, so that it stays clear of the table of results.
const FREE_TOP_M = 2;
// The free test asks for this many different settings before Continue opens.
export const FREE_TRIES = 3;
const TAUT_S = 1.2, SETTLE_S = 1.6;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why won’t the load rise?'},
  {id: 'word-weight', part: 1, title: 'Mass and weight', word: 'lift-weight'},
  {id: 'word-lift', part: 1, title: 'The rotor and lift', word: 'lift-lift'},
  {id: 'word-collective', part: 1, title: 'The collective lever', word: 'lift-collective'},
  {id: 'word-hover', part: 1, title: 'Hovering', word: 'lift-hover'},
  {id: 'watch-lever', part: 2, title: 'Less lift, equal lift and more lift'},
  {id: 'watch-loads', part: 2, title: 'Three loads', voice: 'lab.brian.lift.intro'},
  {id: 'try-car', part: 3, title: 'The Dusthawk'},
  {id: 'try-heavy', part: 3, title: 'Two more crates'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-heavy', part: 5, title: 'Question 1 of 3'},
  {id: 'check-more', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.lift.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'match', text: 'Lift is the rotor’s push upward, and weight is the Earth’s pull downward. When the two are equal, they cancel each other, and the helicopter hovers.'},
  {id: 'most', text: `Every rotor has a limit to how hard it can push, and near the ground the limit of this rotor is ${MOST}. When the total weight is greater than that, the load stays on the ground, even with the lever at the top.`},
  {id: 'ease', text: 'To hold the Dusthawk at one height, lift must come back to equal weight. In Assisted flying, letting go of W does that for you. In Real flying, W and S move the lever itself, so press S a little at a time until the helicopter holds still.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Lift must match weight.',
  text: `Lift the Dusthawk and hold it between ${BAND_M[0]} and ${BAND_M[1]} m above the pad for ${HOLD_S} seconds. In Assisted flying, let go of W when the Dusthawk is high enough. In Real flying, press S a little at a time until the helicopter holds still.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'lift-weight', word: 'Weight', meaning: 'Mass is how much matter an object contains, measured in kilograms, written kg. Weight is how hard the Earth pulls on that mass. It is a force, measured in newtons, written N, and each kilogram is pulled with 9.81 N. This game gives a weight in kilograms, meaning the pull on that many kilograms.'},
  {id: 'lift-rotor', word: 'Rotor', meaning: 'The rotor is the set of long blades on top of a helicopter. As the rotor spins, the tilted blades throw air downward.'},
  {id: 'lift-lift', word: 'Lift', meaning: 'Lift is the upward push that the air gives the rotor, because the rotor pushes the air down. The game gives lift in kilograms, so that it can be compared with weight: a lift of 500 kg could hold up a mass of 500 kg.'},
  {id: 'lift-collective', word: 'Collective', meaning: 'The collective is the lever by the pilot’s left hand. Raising it tilts all of the blades more steeply at the same moment, so the rotor throws more air down and the lift grows. In Real flying W raises it and S lowers it. In Assisted flying W and S ask for a climb or a descent, and the helicopter moves the lever for you.'},
  {id: 'lift-hover', word: 'Hover', meaning: 'To hover is to stay still in the air, which happens when lift is exactly as great as weight.'},
].map(Object.freeze));

// ---- the flight on the pad: the load, the lever and where the helicopter is ----
// h: how high the lifted set is above the pad (the load's bottom, or the skids with no load).
// taut: 0 to 1, how far the helicopter has risen to take up the slack in the cable.
const flight = (load = {}, liftKg = 0) => ({crates: load.crates ?? 0, car: load.car ?? 0, lift: liftKg, h: 0, taut: 0, dropped: 0, top: CEILING_M});
const loaded = f => f.crates > 0 || f.car > 0;
function want(f) {
  const w = weightOf(f);
  return f.lift > w + .5 ? 'climb' : f.lift >= w - .5 ? 'hover' : 'down';
}
function fly(f, dt) {
  const w = weightOf(f), mode = want(f), freeToRise = !loaded(f) || f.taut >= 1;
  if (loaded(f)) {
    if (f.lift >= OWN_KG - .5) f.taut = Math.min(1, f.taut + dt / TAUT_S);
    else if (f.h <= 0) f.taut = Math.max(0, f.taut - dt / TAUT_S);
  } else f.taut = 0;
  if (mode === 'climb' && freeToRise) f.h = Math.min(f.top, f.h + Math.min(4, .8 + (f.lift - w) / 250) * dt);
  if (mode === 'hover' && freeToRise && f.h < HOVER_M) f.h = Math.min(HOVER_M, f.h + dt);
  if (mode === 'down') f.h = Math.max(0, f.h - 2.5 * dt);
}
// Where the helicopter is, in a few words, for the board and Brian.
export function status(f) {
  const mode = want(f);
  if (f.h <= 0 && (!loaded(f) || f.taut <= 0)) return mode === 'down' ? 'pad' : 'rising';
  if (loaded(f) && f.h <= 0) return mode === 'down' ? 'taut' : 'rising';
  if (mode === 'down') return 'sinking';
  if (mode === 'climb') return f.h >= f.top ? 'high' : 'climbing';
  return f.h >= HOVER_M - .01 ? 'hovering' : 'rising';
}
// What the pad's dial reads: everything still resting on the pad, less the rotor's push.
const padReads = f => f.h > 0 ? 0 : Math.max(0, weightOf(f) - f.lift);
function levels(f) {
  const out = [0], w = weightOf(f);
  for (let n = NOTCH_KG; n < MOST_KG; n += NOTCH_KG) out.push(n);
  if (w < MOST_KG) out.push(w);
  out.push(MOST_KG);
  return [...new Set(out)].sort((a, b) => a - b);
}
// One notch up or down. A held key stops at the red line; a fresh press goes past it.
function notch(f, dir, held) {
  const w = weightOf(f);
  if (held && Math.abs(f.lift - w) < .5) return false;
  const all = levels(f), next = dir > 0 ? all.find(n => n > f.lift + .5) : [...all].reverse().find(n => n < f.lift - .5);
  if (next === undefined) return false;
  f.lift = next; return true;
}
// A drag sets the lever anywhere, and it clicks onto the red line or the top stop when close.
function setLever(f, value) {
  const w = weightOf(f);
  let lift = Math.max(0, Math.min(MOST_KG, Number.isFinite(value) ? value : 0));
  if (w <= MOST_KG && Math.abs(lift - w) <= SNAP_KG) lift = w;
  else if (MOST_KG - lift <= SNAP_KG / 2) lift = MOST_KG;
  else lift = Math.round(lift / 10) * 10;
  if (Math.abs(lift - f.lift) < .5) return false;
  f.lift = lift; return true;
}

// ---- the lever as a share, and the sums beside the board (every worked line comes out on a calculator) ----
export const leverShare = lift => Math.min(1, Math.round(lift) / MOST_SHOWN);
export const leverPct = lift => Math.round(leverShare(lift) * 100);
const whole = value => Math.round(value).toLocaleString('en-GB');
const newtons = massKg => (massKg * GRAVITY).toLocaleString('en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const BASE_SHOWN = (KESTREL.maxThrust / GRAVITY).toLocaleString('en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 1}), GROUND = 1 + KESTREL.groundEffect;
const general = ({title, formula}) => ({title, formula});
function massSum(f, note = false) {
  const load = [...(f.car ? [whole(CAR_KG)] : []), ...(f.crates === 1 ? [whole(CRATE_KG)] : f.crates ? [`${f.crates} × ${whole(CRATE_KG)}`] : [])];
  return {title: 'The total mass', formula: 'mass = helicopter + pilot + fuel + load',
    worked: `${whole(KESTREL.emptyKg)} + ${KESTREL.pilotKg} + ${KESTREL.tankKg} + ${load.length ? load.join(' + ') : '0'} = ${kg(weightOf(f))}`,
    note: note ? 'Mass is how much matter there is. Masses add together, so a heavier load means a greater total.' : null};
}
const WEIGHT_NOTE = 'Force is a push or a pull, measured in newtons, written N. The letter g stands for the 9.81 N with which the Earth pulls on each kilogram.';
const newtonSum = (f, note = false) => ({title: 'The weight in newtons', formula: 'weight = mass × g', worked: `${whole(weightOf(f))} kg × ${GRAVITY} = ${newtons(weightOf(f))} N`, note: note ? WEIGHT_NOTE : null});
const kgPushSum = f => ({title: 'A force in kilograms', formula: 'kilograms of push = newtons ÷ g', worked: `${newtons(f.lift)} N ÷ ${GRAVITY} = ${kg(f.lift)}`,
  note: 'The game gives each force in kilograms, so that lift and weight can be compared directly. A lift of 500 kg is a push that could hold up a mass of 500 kg.'});
const padSum = f => ({title: 'What the pad’s dial reads', formula: 'dial = weight − lift',
  worked: f.h > 0 ? 'The helicopter is off the pad, so the dial reads 0 kg' : f.lift >= weightOf(f) - .5 ? `${whole(weightOf(f))} − ${whole(f.lift)} is not above 0, so the dial reads 0 kg` : `${whole(weightOf(f))} − ${whole(f.lift)} = ${kg(weightOf(f) - f.lift)}`});
const mostSum = (note = false) => ({title: 'The most the rotor can push', formula: `most push = ${BASE_SHOWN} kg × ${GROUND}`, worked: `${BASE_SHOWN} × ${GROUND} = ${MOST}`,
  note: note ? `${BASE_SHOWN} kg is the most the rotor can push when the helicopter is well above the ground. Close to the ground the air thrown down cannot get away so easily, which gives 15% more push, so we multiply by ${GROUND}. Every push in this lesson is measured close to the pad.` : null});
const pushSum = (f, note = false) => ({title: 'The lift at this lever setting', formula: 'push = lever × most push', worked: `${leverShare(f.lift).toFixed(4)} × ${MOST} = ${kg(f.lift)}`,
  note: note ? 'Lift is the rotor’s push. The lever’s percentage says how much of the most push is being used, and a lever at 50% is the same as 0.50, because % means “out of every hundred”. In this game the push grows in step with the lever.' : null});
const HOVER_NOTE = 'The helicopter hovers when the push equals the weight. The push is lever × most push, so the helicopter hovers with the lever at weight ÷ most push.';
function hoverSum(f, {note = false, title = 'The lever needed to hover'} = {}) {
  const w = weightOf(f), share = w / MOST_SHOWN;
  return {title, formula: 'lever to hover = weight ÷ most push', worked: `${kg(w)} ÷ ${MOST} = ${share.toFixed(4)}, which is ${Math.round(share * 100)}%${share > 1 ? ', so the lever cannot reach it' : ''}`, note: note ? HOVER_NOTE : null};
}
function extraSum(f, note = false) {
  const lift = Math.round(f.lift), w = weightOf(f), extra = lift - w;
  const what = extra > 0 ? 'so the helicopter is pushed upward' : extra === 0 ? 'so the two forces cancel and the helicopter holds its height'
    : f.h > 0 ? 'so the helicopter sinks' : loaded(f) ? 'so the load stays on the pad' : 'so the helicopter stays on the pad';
  return {title: 'The force left over', formula: 'extra push = lift − weight', worked: `${whole(lift)} − ${whole(w)} = ${extra < 0 ? '−' : ''}${kg(Math.abs(extra))}, ${what}`,
    note: note ? 'With the lever on the red line, this test raises the helicopter gently to one metre, written 1 m, and holds it there. A pilot moves the lever a little past the line to rise, then back to the line to stop rising.' : null};
}

const parts = f => [`Kestrel One ${kg(OWN_KG)}`, ...(f.car ? [`Dusthawk ${kg(CAR_KG)}`] : []), ...(f.crates ? [`${f.crates} crate${f.crates > 1 ? 's' : ''} ${kg(f.crates * CRATE_KG)}`] : [])];
function drawn(f) {
  return {crates: f.crates, car: f.car, lift: f.lift, weight: weightOf(f), most: MOST_KG, h: f.h, taut: f.taut, dropped: f.dropped,
    status: status(f), pad: padReads(f), parts: parts(f), lever: leverPct(f.lift)};
}

// ---- keys (the screen shows them on its buttons and the board) ----
const LEVER_KEYS = Object.freeze({W: 'lever:up', '↑': 'lever:up', S: 'lever:down', '↓': 'lever:down'});
const REPEAT = Object.freeze(['W', '↑', 'S', '↓']);
const LOAD_KEYS = Object.freeze({1: 'crate:add', 2: 'crate:remove', 3: 'car'});
const FREE_BUTTONS = Object.freeze([{action: 'crate:add', label: 'Add a crate', key: '1'}, {action: 'crate:remove', label: 'Take a crate off', key: '2'},
  {action: 'car', label: 'The Dusthawk on or off', key: '3'}, {action: 'go', label: 'Test this setting', key: 'Space'}]);
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `${n === 2 ? 'guess' : 'answer'}:${i}`]));
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const GUESSES = Object.freeze([
  {id: 'yes', label: 'Yes, the helicopter can lift it', picture: {kind: 'verdict', up: true}},
  {id: 'no', label: 'No, the load is too heavy', picture: {kind: 'verdict', up: false}},
]);
const GUESS_PROMPT = 'Pick a card by clicking it, or press 1 or 2.', ANSWER_PROMPT = 'Pick a card by clicking it, or press 1, 2 or 3.';

// ---- the guided tries ----
const TRIES = {
  'try-car': {
    start: {},
    goal: f => f.car === 1 && f.crates === 0,
    target: 'car',
    setupSay: 'Now it is your turn. Hang the Dusthawk rally car from the helicopter’s cable.',
    setupPrompt: () => 'Click the Dusthawk, or press 3.',
    wrongSetup: f => f.crates > 0 ? 'This test is for the Dusthawk alone, with no crates. Take the crate off by pressing 2.' : 'This test is for the Dusthawk alone. Hang the Dusthawk from the cable by pressing 3.',
    setupHints: ['The Dusthawk is the white rally car parked on the right.', 'Click the Dusthawk, or press 3.', 'Watch my pointer. I will hang the Dusthawk from the cable.'],
    guessSay: () => `With the Dusthawk on the cable, the total weight is ${kg(weightOf({car: 1}))}. The most that the rotor can push is ${MOST}. Can the helicopter lift this load off the pad?`,
    guessHints: [`Compare the two numbers, a weight of ${kg(weightOf({car: 1}))} and a push of at most ${MOST}.`, 'When the rotor can push more than the weight, the helicopter can lift the load.', 'Any guess is fine. Pick one, and then we will test it.'],
    leverTarget: 'lever:weight',
    leverSay: 'Now pull the lever up to the red line, which marks the total weight.',
    leverPrompt: 'Hold W (or ↑), or drag the lever, up to the red line.',
    actual: 'yes',
    right: () => `Correct. The helicopter hovers with ${kg(weightOf({car: 1}))} of lift and the lever at ${leverPct(weightOf({car: 1}))}%, and the rotor still has ${kg(MOST_KG - weightOf({car: 1}))} of push to spare.`,
    wrong: () => `The helicopter can lift this load, because the total weight of ${kg(weightOf({car: 1}))} is less than the ${MOST} that the rotor can push. The rotor still has ${kg(MOST_KG - weightOf({car: 1}))} of push to spare.`,
  },
  'try-heavy': {
    start: {car: 1},
    goal: f => f.car === 1 && f.crates === 2,
    target: 'crate:add',
    setupSay: 'Now add two crates to the Dusthawk.',
    setupPrompt: f => f.crates ? 'Click the crates, or press 1, to add the second crate.' : 'Click the crates, or press 1, until two crates are on the cable.',
    wrongSetup: (f, kind) => kind === 'car' ? 'Keep the Dusthawk on the cable, because we are adding crates to it.' : 'This test needs two crates. Add a crate by pressing 1.',
    setupHints: ['The crates are stacked on the right, and each one weighs 500 kg.', 'Click the crates, or press 1, until two crates are on the cable.', 'Watch my pointer. I will add a crate.'],
    guessSay: () => `The total weight is now ${kg(weightOf({car: 1, crates: 2}))}. The most that the rotor can push is ${MOST}. Can the helicopter lift this load off the pad?`,
    guessHints: [`Compare the two numbers, a weight of ${kg(weightOf({car: 1, crates: 2}))} and a push of at most ${MOST}.`, 'When the weight is more than the rotor can push, the helicopter cannot lift the load.', 'Any guess is fine. Pick one, and then we will test it.'],
    leverTarget: 'lever:top',
    leverSay: 'Now pull the lever all the way up, as far as it goes.',
    leverPrompt: 'Hold W (or ↑), or drag the lever, all the way to the top.',
    actual: 'no',
    right: () => `Correct. The total weight of ${kg(weightOf({car: 1, crates: 2}))} is ${kg(over({car: 1, crates: 2}))} more than the ${MOST} that the rotor can push, so the load stays on the pad.`,
    wrong: () => `With the lever at the top, the rotor pushes ${MOST} and the total weight is ${kg(weightOf({car: 1, crates: 2}))}, so the load is ${kg(over({car: 1, crates: 2}))} too heavy and stays on the pad.`,
  },
};
const LEVER_HINTS = (target, f) => ['The lever is on the left of the board, and the red line on its scale marks the total weight.',
  target === 'lever:top' ? 'Hold W until the lever stops at the top.' : f.lift > f.weight + .5 ? 'Press S until the lever comes back down to the red line.' : 'Hold W until the lever reaches the red line, where it stops for you.',
  target === 'lever:top' ? 'Watch my pointer. I will move the lever to the top.' : 'Watch my pointer. I will move the lever to the red line.'];

// ---- the checks ----
const CHECKS = {
  'check-heavy': {
    question: 'Which of these three loads stays on the ground, even with the lever all the way up?',
    answers: [{car: 1}, {crates: 3}, {car: 1, crates: 2}].map(load => ({label: `${[load.car ? 'The Dusthawk' : '', load.crates ? `${load.crates} crates` : ''].filter(Boolean).join(' and ')} (${kg(weightOf(load) - OWN_KG)})`, picture: {kind: 'load', ...load}, load})),
    correct: 2,
    right: () => `Correct. With the Dusthawk and two crates, the total weight of ${kg(weightOf({car: 1, crates: 2}))} is more than the ${MOST} that the rotor can push.`,
    wrong: picked => { const load = CHECKS['check-heavy'].answers[picked].load; return `That load weighs ${kg(weightOf(load) - OWN_KG)}, and with Kestrel One’s ${kg(OWN_KG)} the total is ${kg(weightOf(load))}, which is less than the ${MOST} that the rotor can push. The Dusthawk and two crates make a total of ${kg(weightOf({car: 1, crates: 2}))}, which is too heavy.`; },
    hints: [`Add Kestrel One’s own ${kg(OWN_KG)} to each load.`, `Which total comes to more than ${MOST}?`, 'Pick the Dusthawk and two crates.'],
  },
  'check-more': {
    question: 'The helicopter is hovering with the Dusthawk on its cable, and you pull the lever up a little more. What does the helicopter do next?',
    answers: [{label: 'The helicopter climbs', picture: {kind: 'motion', move: 'climb'}}, {label: 'The helicopter stays still', picture: {kind: 'motion', move: 'hover'}}, {label: 'The helicopter sinks', picture: {kind: 'motion', move: 'sink'}}],
    correct: 0,
    right: () => 'Correct. A higher lever gives more lift, and with more lift than weight there is a force left over that pushes the helicopter upward.',
    wrong: () => 'A higher lever gives more lift, and with more lift than weight there is a force left over that pushes the helicopter upward, so the helicopter climbs.',
    hints: ['When the helicopter is hovering, lift and weight are equal.', 'A higher lever gives more lift. What does more lift than weight do?', 'Pick “The helicopter climbs”.'],
  },
  'check-game': {
    question: `In the helicopter challenge you must hold the Dusthawk between ${BAND_M[0]} and ${BAND_M[1]} metres, written m, above the ground for ${HOLD_S} seconds. Once the Dusthawk is high enough, what must happen to the lift so that the helicopter stays at that height?`,
    answers: [{label: 'The lift must stay greater than the weight', picture: {kind: 'lever', at: 'top'}}, {label: 'The lift must come back to equal the weight', picture: {kind: 'lever', at: 'match'}}, {label: 'The lift must fall to nothing', picture: {kind: 'lever', at: 'bottom'}}],
    correct: 1,
    right: () => `Correct. When lift equals weight, the helicopter holds still between ${BAND_M[0]} and ${BAND_M[1]} m. In Assisted flying the helicopter does this for you when you let go of W. In Real flying you press S a little at a time until the helicopter holds still.`,
    wrong: picked => picked === 0 ? `While lift is greater than weight, the helicopter keeps climbing and rises above ${BAND_M[1]} m. Lift must come back to equal the weight of ${kg(weightOf({car: 1}))}. In Assisted flying, letting go of W does that, and in Real flying you press S a little at a time.`
      : `With no lift, the helicopter would fall. Lift must come back only as far as the weight of ${kg(weightOf({car: 1}))}. In Assisted flying, letting go of W does that, and in Real flying you press S a little at a time.`,
    hints: ['To stay at one height, the helicopter must hover.', 'Hovering needs lift equal to weight, and too much lift makes the helicopter climb.', 'Pick “The lift must come back to equal the weight”.'],
  },
};

// The free test's Show me: settings to try in turn, each with its lift.
const SHOW_SETTINGS = Object.freeze([
  {load: {}, lift: load => weightOf(load)}, {load: {car: 1}, lift: load => weightOf(load)}, {load: {car: 1, crates: 2}, lift: () => MOST_KG},
  {load: {crates: 1}, lift: () => 1000}, {load: {}, lift: () => 2500}, {load: {crates: 4}, lift: load => weightOf(load)},
].map(Object.freeze));
const settingKey = f => `${f.car}/${f.crates}/${Math.round(f.lift)}`;
const shortLoad = f => f.car ? `Dusthawk${f.crates ? ` + ${f.crates} crate${f.crates > 1 ? 's' : ''}` : ''}` : f.crates ? `${f.crates} crate${f.crates > 1 ? 's' : ''}` : 'No load';
const outcome = f => {
  const mode = want(f);
  return mode === 'hover' ? 'hovers' : mode === 'climb' ? 'climbs' : f.h > 0 ? 'sinks' : 'stays down';
};
function freeResult(f) {
  const w = weightOf(f), lift = Math.round(f.lift), mode = want(f), start = `${loadedWith(f)}, the total weight is ${kg(w)}. The lever is at ${leverPct(f.lift)}%, which gives a lift of ${kg(lift)}.`;
  if (mode === 'hover') return `${start} Lift and weight are equal, so the two forces cancel and the helicopter hovers.`;
  if (mode === 'climb') return `${start} That is ${kg(lift - w)} more than the weight, so the force left over pushes the helicopter upward.`;
  if (f.lift >= MOST_KG - .5) return `${start} Even with the lever at the top, that is ${kg(w - lift)} less than the weight, so the load is too heavy to leave the pad.`;
  return `${start} That is ${kg(w - lift)} less than the weight, so ${f.h > 0 ? 'the helicopter sinks' : loaded(f) ? 'the load stays on the pad' : 'the helicopter stays on the pad'}.`;
}

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'setup', guess: null, result: null, settleAt: null, answered: null, script: null, f: null, sets: null, best: null, rows: [], tested: new Set(), say: ''};
    const id = STEPS[index].id;
    if (id === 'wonder') m.f = flight({car: 1, crates: 3}, MOST_KG);
    if (id === 'word-weight' || id === 'word-lift') m.f = flight();
    if (id === 'word-collective') m.f = flight({}, NOTCH_KG);
    if (id === 'word-hover') m.f = flight({}, 3 * NOTCH_KG);
    if (id === 'watch-lever') m.f = flight();
    if (id === 'watch-loads') m.sets = [{crates: 1}, {crates: 3}, {crates: 4}].map(load => flight(load));
    if (id === 'try-free') { m.f = flight(); m.f.top = FREE_TOP_M; }
    if (TRIES[id]) m.f = flight(TRIES[id].start);
    if (id === 'alone') m.f = flight({car: 1});
    if (id === 'check-heavy') { m.phase = 'ask'; m.sets = CHECKS[id].answers.map(a => flight(a.load)); }
    if (id === 'check-more' || id === 'check-game') { m.phase = 'ask'; m.f = flight({car: 1}, weightOf({car: 1})); m.f.taut = 1; m.f.h = id === 'check-game' ? 3 : HOVER_M; }
  }

  function act(action) {
    const id = step().id, [kind, value, extra] = action.split(':');
    if (kind === 'replay') return replay();
    if (id === 'word-weight') {
      if (kind !== 'crate' || value !== 'add' || m.f.crates) return null;
      m.f.crates = 1; seen.add(id);
      return {kind: 'right', sound: 'lab.clunk', say: `The dial went from ${kg(OWN_KG)} to ${kg(weightOf({crates: 1}))}, because the crate has a mass of ${kg(CRATE_KG)}. The weights of separate objects add together, so a heavier load means a greater pull from the Earth.`};
    }
    if (id === 'word-lift') {
      if (kind !== 'rotor' || m.f.lift > 0) return null;
      m.f.lift = NOTCH_KG; seen.add(id);
      return {kind: 'right', say: `The blades are throwing air downward, so the air pushes the rotor upward with ${kg(NOTCH_KG)} of lift. The pad now holds up only the rest of the weight, so its dial reads ${kg(OWN_KG - NOTCH_KG)} instead of ${kg(OWN_KG)}.`};
    }
    if (id === 'word-collective' || id === 'word-hover') return leverWord(id, kind, value, extra);
    if (id === 'try-free') return freeAct(kind, value, extra);
    if (TRIES[id] || id === 'alone') return tryAct(id, kind, value, extra);
    if (CHECKS[id] && kind === 'answer' && m.phase === 'ask') {
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      showAnswer(id);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    return null;
  }

  function moveLever(kind, value, extra) {
    if (kind === 'lever' && value === 'up') return notch(m.f, 1, extra === 'held');
    if (kind === 'lever' && value === 'down') return notch(m.f, -1, extra === 'held');
    if (kind === 'lever' && value === 'weight') return setLever(m.f, Math.min(weightOf(m.f), MOST_KG));
    if (kind === 'lever' && value === 'top') return setLever(m.f, MOST_KG);
    if (kind === 'lever' && value === 'mark') return setLever(m.f, 2 * NOTCH_KG);
    if (kind === 'hold') { setLever(m.f, Number(value)); return false; }
    return kind === 'release';
  }

  // The closing words are in the past tense, so they stay true while the player goes on moving the lever.
  function leverWord(id, kind, value, extra) {
    const moved = moveLever(kind, value, extra);
    if (!moved || seen.has(id)) return null;
    const f = m.f;
    if (id === 'word-collective') {
      if (f.lift < 2 * NOTCH_KG - .5) return null;
      seen.add(id);
      return {kind: 'right', say: f.lift >= OWN_KG - .5 ? `The higher lever tilted the blades more steeply, which gave ${kg(f.lift)} of lift. That was enough to raise the helicopter off the pad, because the helicopter weighs ${kg(OWN_KG)}.`
        : `The higher lever tilted the blades more steeply, which gave ${kg(f.lift)} of lift. The dial on the pad fell to ${kg(OWN_KG - f.lift)}, because the rotor was holding up more of the weight.`};
    }
    const mode = want(f);
    if (mode === 'hover') { seen.add(id); return {kind: 'right', say: `With the lever on the red line, the lift of ${kg(f.lift)} equalled the weight of ${kg(OWN_KG)}. The upward push and the downward pull cancelled each other, so no force was left over to move the helicopter, and it hovered.`}; }
    if (mode === 'climb') return {kind: 'fail', say: `A lift of ${kg(f.lift)} is more than the helicopter’s weight of ${kg(OWN_KG)}, so the helicopter climbs. Bring the lever back down to the red line.`};
    return null;
  }

  // The free test: any load, any lever. Space writes the setting down; only different settings count.
  function freeAct(kind, value, extra) {
    const f = m.f;
    if (kind === 'crate' || kind === 'car') {
      if (kind === 'crate' && value === 'add' && f.crates >= MAX_CRATES) return {kind: 'note', say: `All ${MAX_CRATES} crates are already on the cable.`};
      if (kind === 'crate' && value === 'remove' && f.crates <= 0) return {kind: 'note', say: 'There are no crates on the cable to take off.'};
      if (kind === 'crate') f.crates += value === 'add' ? 1 : -1;
      else f.car = f.car ? 0 : 1;
      f.lift = 0; f.h = 0; f.taut = 0;
      return {kind: 'sound', sound: 'lab.clunk'};
    }
    if (kind === 'go') return testSetting();
    if (kind === 'set' && value === 'best') {
      const pick = SHOW_SETTINGS.find(s => !m.tested.has(settingKey({car: s.load.car ?? 0, crates: s.load.crates ?? 0, lift: s.lift(s.load)})));
      if (!pick) return null;
      Object.assign(f, {car: pick.load.car ?? 0, crates: pick.load.crates ?? 0, lift: pick.lift(pick.load), h: 0, taut: 0});
      return testSetting();
    }
    moveLever(kind, value, extra);
    return null;
  }
  function testSetting() {
    const f = m.f, key = settingKey(f);
    if (m.tested.has(key)) return {kind: 'note', say: 'You have already tested this setting. Change the load or the lever first.'};
    m.tested.add(key);
    m.rows = [...m.rows, {label: `${shortLoad(f)} at ${leverPct(f.lift)}%`, value: outcome(f)}].slice(-5);
    if (m.tested.size >= FREE_TRIES) seen.add('try-free');
    m.say = `${freeResult(f)} ${m.tested.size >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.'}`;
    return {kind: 'right', say: m.say};
  }

  function tryAct(id, kind, value, extra) {
    const f = m.f, guided = TRIES[id];
    if (m.phase === 'setup' && (kind === 'crate' || kind === 'car')) {
      if (kind === 'crate' && value === 'add' && f.crates >= MAX_CRATES) return null;
      if (kind === 'crate' && value === 'remove' && f.crates <= 0) return null;
      if (kind === 'car' && id === 'try-heavy') return {kind: 'fail', say: guided.wrongSetup(f, 'car')};
      if (kind === 'crate') f.crates += value === 'add' ? 1 : -1;
      else f.car = f.car ? 0 : 1;
      // Loading happens on the pad, so the helicopter sets down first.
      f.lift = 0; f.h = 0; f.taut = 0;
      if (!guided) return {kind: 'run', sound: 'lab.clunk', say: `${loadedWith(f)}, the total weight is ${kg(weightOf(f))}. Now move the lever.`};
      if (guided.goal(f)) { m.phase = 'guess'; return {kind: 'progress', sound: 'lab.clunk', say: guided.guessSay()}; }
      if (id === 'try-heavy' && kind === 'crate' && value === 'add' && f.crates < 2) return {kind: 'progress', sound: 'lab.clunk', say: 'One crate is on the cable. Add one more.'};
      return {kind: 'fail', sound: 'lab.clunk', say: guided.wrongSetup(f, kind)};
    }
    if (m.phase === 'guess' && kind === 'guess') {
      const pick = GUESSES[Number(value)];
      if (!pick) return null;
      m.guess = pick.id; m.phase = 'lever';
      return {kind: 'progress', say: guided.leverSay};
    }
    const canFly = guided ? m.phase === 'lever' : m.phase === 'setup';
    if (!canFly || !moveLever(kind, value, extra)) return null;
    const w = weightOf(f), mode = want(f);
    if (guided) {
      if (mode === 'climb') return {kind: 'fail', say: `The lever has gone past the red line, so the lift of ${kg(f.lift)} is more than the weight of ${kg(w)} and the helicopter climbs. Bring the lever back to the line.`};
      if (mode === 'hover' || f.lift >= MOST_KG - .5) { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'Watch the load.'}; }
      return null;
    }
    if (mode === 'climb') return {kind: 'note', say: `A lift of ${kg(f.lift)} is more than the weight of ${kg(w)}, so the helicopter climbs. Bring the lever back to the red line.`};
    if (mode === 'hover' || f.lift >= MOST_KG - .5 && mode === 'down') { m.settleAt = m.time + SETTLE_S; m.phase = 'running'; return {kind: 'run'}; }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    // Watch again on a try: the helicopter sets down, then the lever goes back where the player left it.
    if (m.replayAt != null && m.time - m.replayAt >= .3) { m.f.lift = m.replayLift; m.replayAt = null; }
    if (m.f) fly(m.f, dt);
    for (const f of m.sets ?? []) fly(f, dt);
    if (id === 'wonder') wonder();
    if (id === 'watch-lever') watchLever();
    if (id === 'watch-loads') watchLoads();
    // A run ends once the helicopter has settled: hovering, or held down on a tight cable (or after a few seconds more).
    if (m.phase === 'running' && m.time >= m.settleAt && (['hovering', 'taut', 'pad', 'high'].includes(status(m.f)) || m.time >= m.settleAt + 3)) return finishRun(id);
    return null;
  }

  // The wonder: full power and the load will not come up; two crates come off, and up it goes.
  function wonder() {
    const t = m.time % 11, f = m.f;
    if (t < m.lastWonder) Object.assign(f, flight({car: 1, crates: 3}, MOST_KG));
    m.lastWonder = t;
    if (t >= 4.5 && f.crates === 3) { f.crates = 1; f.dropped = 2; }
    if (t >= 7.5) f.lift = weightOf(f);
    if (m.time >= 8) seen.add('wonder');
  }
  const LEVER_SCRIPT = [[0, 0], [1, 2 * NOTCH_KG], [3.5, OWN_KG], [6, 5 * NOTCH_KG], [7.5, OWN_KG], [10, 2 * NOTCH_KG]];
  function watchLever() {
    const t = m.time;
    m.f.lift = [...LEVER_SCRIPT].reverse().find(([at]) => t >= at)[1];
    m.best ??= {};
    const s = status(m.f);
    if (s === 'pad' && t > 1.5) m.best.down = true;
    if (s === 'hovering') m.best.hover = true;
    if (s === 'climbing') m.best.climb = true;
    if (t >= 13.5) seen.add('watch-lever');
  }
  function watchLoads() {
    m.sets.forEach((f, i) => { if (m.time >= .8 + i * 2.2) f.lift = Math.min(weightOf(f), MOST_KG); });
    if (m.time >= .8 + 2 * 2.2 + 2.4) seen.add('watch-loads');
  }

  function showAnswer(id) {
    if (id === 'check-heavy') m.sets.forEach(f => { f.lift = Math.min(weightOf(f), MOST_KG); });
    if (id === 'check-more') m.f.lift = weightOf(m.f) + NOTCH_KG;
    if (id === 'check-game') m.f.lift = weightOf(m.f);
    m.answerAt = m.time;
  }

  function finishRun(id) {
    const f = m.f, w = weightOf(f), guided = TRIES[id];
    m.phase = 'result'; m.settleAt = null;
    if (guided) {
      seen.add(id);
      m.result = {actual: guided.actual, right: m.guess === guided.actual};
      return m.result.right ? {kind: 'right', say: guided.right()} : {kind: 'wrong', say: guided.wrong()};
    }
    if (want(f) === 'hover' && f.car && f.crates === BEST_CRATES) { seen.add(id); return {kind: 'pass', say: jobDone(w)}; }
    m.phase = 'setup';
    if (want(f) === 'hover' && !f.car) return {kind: 'fail', say: 'The helicopter hovers, but this job needs the Dusthawk on the cable. Hang the Dusthawk from the cable by pressing 3.'};
    if (want(f) === 'hover') return {kind: 'fail', say: `The helicopter hovers with a total weight of ${kg(w)}, and the rotor can push ${MOST}, which leaves room for ${kg(MOST_KG - w)} more. A crate weighs ${kg(CRATE_KG)}, so add one by pressing 1.`};
    return {kind: 'fail', say: `A total weight of ${kg(w)} is ${kg(w - MOST_KG)} more than the ${MOST} that the rotor can push, so the load stays on the pad. Take a crate off by pressing 2.`};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch-lever') { enter(m.index); return null; }
    if (id === 'watch-loads') { m.sets.forEach(f => Object.assign(f, flight(f))); m.time = 0; return null; }
    if (CHECKS[id] && m.phase === 'answered') { const answered = m.answered; enter(m.index); m.answered = answered; m.phase = 'answered'; showAnswer(id); return null; }
    if ((TRIES[id] || id === 'alone') && m.phase === 'result' && m.replayAt == null) {
      const f = m.f, lift = f.lift;
      Object.assign(f, {lift: 0, h: 0, taut: 0});
      m.replayAt = m.time; m.replayLift = lift;
      return null;
    }
    return null;
  }

  function view({help = 0} = {}) {
    const s = step(), id = s.id;
    const base = {scene: 'pad', time: m.time, flight: m.f ? drawn(m.f) : null, sets: m.sets?.map(drawn) ?? null, formulas: [], keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), gauge: false, readouts: false, stock: false, leverRow: true, blade: false};
    if (id === 'wonder') return {...base, scene: 'wonder', actions: ['replay'],
      say: `This helicopter is called Kestrel One. A load is whatever hangs from the helicopter’s cable, and here the load is a rally car called the Dusthawk and three crates. The engine is at full power, but the load does not leave the ground.${MORE}Then two crates are taken off, and the rest of the load rises. Why did taking crates off make the difference?`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the load on the pad.',
      hints: ['Watch what happens when the crates come off.', 'With two crates fewer, the load is lighter, and the helicopter can lift it.', 'Press Enter when you are ready to find out why.']};
    if (id === 'word-weight') {
      const done = m.f.crates > 0;
      return {...base, readouts: 'weight', stock: 'crates', keys: done ? {} : {1: 'crate:add'}, waiting: !done, target: done ? null : 'crate:add', glow: done ? null : 'crate:add', leverRow: false,
        formulas: [massSum(m.f, true), newtonSum(m.f, true)],
        say: `Mass is how much matter an object contains, and we measure it in kilograms, written kg. Weight is how hard the Earth pulls on that mass. Weight is a force, which means a push or a pull, and scientists measure forces in newtons, written N.${MORE}The Earth pulls on each kilogram with a force of 9.81 N, so a greater mass has a greater weight. The pull on every kilogram is the same, so a weighing scale can show a weight in kilograms, and this game does that too. When we say that a helicopter weighs ${kg(OWN_KG)}, we mean the pull of the Earth on ${kg(OWN_KG)} of mass. That is the weight of Kestrel One with its pilot and a full tank of fuel, standing on this weighing pad.`,
        prompt: done ? 'Press Enter to continue.' : 'Click the crates to put one on the weighing pad, or press 1.',
        hints: done ? DONE : ['The crates are stacked on the right of the pad.', 'Click the crates, or press 1.', 'Watch my pointer. I will put a crate on the pad.']};
    }
    if (id === 'word-lift') {
      const done = m.f.lift > 0;
      return {...base, readouts: 'lift', keys: done ? {} : {Space: 'rotor'}, waiting: !done, target: done ? null : 'rotor', glow: done ? null : 'rotor', air: done, forces: done, blade: true, leverRow: false,
        formulas: [kgPushSum(m.f), padSum(m.f)],
        say: `The rotor is the set of long blades on top of the helicopter. Each blade is tilted a little, like a hand held out of a car window, so the spinning blades throw air downward. The rotor pushes the air down, so the air pushes the rotor up, and that upward push is called lift.${MORE}When one object pushes on another, the second object pushes back just as hard in the opposite direction, which is a rule of physics called Newton’s third law. We give lift in kilograms too, so that we can compare it with weight. A lift of 500 kg is a push that could hold up a mass of 500 kg.`,
        prompt: done ? 'Press Enter to continue.' : 'Click the rotor to start it, or press Space.',
        hints: done ? DONE : ['The rotor is on top of Kestrel One.', 'Click the rotor, or press Space.', 'Watch my pointer. I will start the rotor.']};
    }
    if (id === 'word-collective') {
      const done = seen.has(id);
      return {...base, readouts: 'lift', gauge: 'plain', air: true, forces: true, blade: true, keys: LEVER_KEYS, repeat: REPEAT, waiting: !done, target: done ? null : 'lever:mark', glow: done ? null : 'lever:up', mark: 2 * NOTCH_KG,
        formulas: [pushSum(m.f, true), mostSum(), padSum(m.f)],
        say: `The collective lever, which we will simply call the lever, sits by the pilot’s left hand, and the pilot uses it to control the lift. Raising the lever tilts every blade of the rotor more steeply, all at the same moment, which is why it is called collective.${MORE}A more steeply tilted blade throws more air down each second, so the air pushes back harder and the lift grows. Lowering the lever flattens the blades, and the lift falls. The engine supplies the extra power that this needs. The scale beside the lever shows the lift in kilograms, and at the top stop the rotor is pushing as hard as it can. In this lesson, W raises the lever and S lowers it, and the same is true in the helicopter’s Real flying. In its Assisted flying, W asks for a climb, S asks for a descent, and the helicopter moves the lever for you.`,
        prompt: done ? 'Press Enter to continue, or keep moving the lever with W and S and watch the sums change.' : `Pull the lever up to the ${kg(2 * NOTCH_KG)} mark by dragging it, or press W (or ↑).`,
        hints: done ? DONE : ['The lever is on the left of the board, with kilograms up its side.', `Press W until the lever reaches the ${kg(2 * NOTCH_KG)} mark, or drag the handle up to it.`, 'Watch my pointer. I will move the lever to the mark.']};
    }
    if (id === 'word-hover') {
      const done = seen.has(id), above = m.f.lift > OWN_KG + .5;
      return {...base, readouts: 'both', gauge: 'weight', air: true, forces: true, keys: LEVER_KEYS, repeat: REPEAT, waiting: !done, target: done ? null : 'lever:weight', glow: done ? null : 'lever:weight',
        formulas: [pushSum(m.f), hoverSum(m.f, {note: true}), extraSum(m.f, true)],
        say: `To hover is to stay still in the air. Two forces act on the helicopter, lift pushing it up and weight pulling it down. The red line on the lever’s scale marks the helicopter’s weight, so with the lever on that line, lift equals weight.${MORE}When lift is exactly as great as weight, the two forces cancel each other, so no force is left over to move the helicopter, and it stays where it is.`,
        prompt: done ? 'Press Enter to continue, or keep moving the lever with W and S and watch the sums change.' : 'Move the lever onto the red line. Press W (or ↑) to raise it, press S (or ↓) to lower it, or drag it.',
        hints: done ? DONE : ['Find the red line on the lever’s scale, which marks the helicopter’s weight.', above ? 'Press S until the lever comes back down to the red line.' : 'Press W until the lever reaches the red line, or drag the handle onto it.', 'Watch my pointer. I will move the lever to the red line.']};
    }
    if (id === 'watch-lever') {
      const st = status(m.f), b = m.best ?? {}, ended = seen.has(id);
      return {...base, readouts: 'both', gauge: 'weight', air: true, forces: true, actions: ['replay', 'slow'],
        formulas: [pushSum(m.f), extraSum(m.f), hoverSum(m.f)],
        table: [{label: 'Less lift than weight', value: b.down ? 'stays down' : null}, {label: 'Lift equal to weight', value: b.hover ? 'hovers' : null}, {label: 'More lift than weight', value: b.climb ? 'climbs' : null}],
        say: ended ? 'With less lift than weight, the helicopter stayed on the pad. With lift equal to weight, the helicopter rose to a hover and stayed there. With more lift than weight, the force left over pushed the helicopter upward. When the lever came back to the line, the helicopter stopped climbing and held its new height. With less lift again, the helicopter sank back to the pad.'
          : `I will now move the lever up and down myself, with the helicopter weighing ${kg(OWN_KG)}. Watch the lift and the weight, and watch what the helicopter does.`,
        prompt: ended ? 'Press Enter to continue, or press R to watch again.' : caption(st, m.f),
        hints: ['Watch the green lift number and the red weight number.', 'When the two numbers are equal, the helicopter hovers.', ended ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'watch-loads') {
      const ended = seen.has(id), words = ['One crate', 'Three crates', 'Four crates'];
      return {...base, scene: 'three', actions: ['replay', 'slow'],
        formulas: [...m.sets.map((f, i) => hoverSum(f, {title: `The lever to hover with ${words[i].toLowerCase()}`})), mostSum(true)],
        say: ended ? `Each heavier load needed the lever further up, at ${leverPct(weightOf({crates: 1}))}%, ${leverPct(weightOf({crates: 3}))}% and ${leverPct(weightOf({crates: 4}))}%. The lever stops at the top, because the engine can supply only so much power, and at that stop the rotor pushes ${MOST}. A greater weight than that cannot leave the ground.`
          : 'Here are three loads, and each time the lever goes up until the lift equals the weight of that load. Watch how far the lever has to go.',
        prompt: ended ? 'Press Enter to continue, or press R to watch again.' : 'Watch each load in turn.',
        hints: ['Watch the lever number under each load.', 'A heavier load needs a higher lever.', ended ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-free') {
      const f = m.f, ended = seen.has(id);
      return {...base, readouts: 'both', gauge: 'weight', air: f.lift > 0, forces: true, stock: 'all', keys: {...LOAD_KEYS, ...LEVER_KEYS, Space: 'go'}, repeat: REPEAT, buttons: FREE_BUTTONS, target: 'set:best', waiting: !ended,
        formulas: [massSum(f), newtonSum(f), pushSum(f), extraSum(f), hoverSum(f)], freeTable: m.rows,
        say: m.say || `Now you can experiment. Press 1 and 2 to add and remove crates, press 3 to hang the Dusthawk from the cable or take it off, and press W and S to move the lever. Test at least ${FREE_TRIES} different settings, so that you can compare them.${MORE}Watch the sums change as you do, and predict what the helicopter will do. Then press Space to write the result in the table.`,
        prompt: ended ? 'Press Enter to continue, or test another setting.' : `Change the load or the lever, then press Space to test the setting. Different settings tested so far: ${m.tested.size} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the setting as it is now.', 'Try a load at the red line, then the same load with the lever above or below the line.', 'Watch my pointer. I will set a load and a lever that you have not tested yet, and test them.']};
    }
    if (TRIES[id] || id === 'alone') return tryView(id, base, help);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null, rest = m.f ?? flight({car: 1, crates: 2}, MOST_KG);
      const sums = id === 'check-heavy' ? [answered ? hoverSum(flight({car: 1, crates: 2}), {title: 'The lever to hover with the Dusthawk and two crates'}) : hoverSum(flight()), mostSum()]
        : [pushSum(rest), extraSum(rest), hoverSum(rest)];
      return {...base, scene: id === 'check-heavy' ? 'three' : 'pad', band: id === 'check-game', readouts: id === 'check-heavy' ? false : answered && 'both', gauge: id !== 'check-heavy' && answered && 'weight',
        keys: answered ? {} : PICK_KEYS(3), actions: answered ? ['replay'] : [], waiting: !answered, hideWeights: id === 'check-heavy' && !answered, forces: answered, air: answered,
        formulas: answered ? sums : sums.map(general),
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : ANSWER_PROMPT, hints: answered ? DONE : check.hints};
    }
    const example = flight({car: 1}, weightOf({car: 1}));
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, formulas: [pushSum(example), hoverSum(example), extraSum(example), mostSum()],
      say: 'To hover, the rotor has to throw air down hard enough that the air pushes back as hard as the Earth pulls the helicopter down. A greater weight needs more push, which means a higher lever, and every rotor has a limit to how hard it can push.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function tryView(id, base, help) {
    const guided = TRIES[id], f = m.f, shown = drawn(f);
    const common = {...base, readouts: 'both', gauge: 'weight', air: f.lift > 0, forces: f.lift > 0, stock: 'all',
      formulas: [massSum(f), mostSum(), pushSum(f), extraSum(f), hoverSum(f)]};
    if (m.phase === 'setup' && guided) {
      const target = f.crates > (id === 'try-heavy' ? 2 : 0) ? 'crate:remove' : guided.target;
      return {...common, keys: LOAD_KEYS, waiting: true, target, glow: target,
        formulas: [massSum(f), mostSum()],
        say: guided.setupSay, prompt: target === 'crate:remove' ? 'Click a crate on the cable, or press 2, to take it off.' : guided.setupPrompt(f),
        hints: target === 'crate:remove' ? ['Only the Dusthawk belongs on the cable for this test.', 'Click the crate on the cable, or press 2.', 'Watch my pointer. I will take the crate off.'] : guided.setupHints};
    }
    if (m.phase === 'setup') {
      const target = !f.car ? 'car' : f.crates < BEST_CRATES ? 'crate:add' : f.crates > BEST_CRATES ? 'crate:remove' : 'lever:weight';
      return {...common, keys: {...LOAD_KEYS, ...LEVER_KEYS}, repeat: REPEAT, waiting: true, target,
        formulas: [massSum(f), mostSum(), pushSum(f), hoverSum(f), general({title: 'The crates the rotor can hold up', formula: `crates = (most push − helicopter − Dusthawk) ÷ ${kg(CRATE_KG)}, rounded down`})],
        say: 'Here is a job for you. Lift the Dusthawk with as many crates as the rotor can hold up on this test pad, and hover with them. Load the crates first, and then move the lever.',
        prompt: `Press 1 to add a crate and 2 to take one off. Then ${f.lift > weightOf(f) + .5 ? 'press S (or ↓), or drag the lever, back down to the red line' : 'hold W, or drag the lever, up to the red line'}.`,
        hints: [`The rotor can push ${MOST}. How much room is left with the Dusthawk on the cable?`, `With the Dusthawk the total weight is ${kg(weightOf({car: 1}))}, and each crate adds ${kg(CRATE_KG)}. How many crates fit under ${MOST}?`,
          target === 'lever:weight' ? 'Watch my pointer. I will move the lever to the red line.' : target === 'car' ? 'Watch my pointer. I will hang the Dusthawk from the cable.' : target === 'crate:add' ? 'Watch my pointer. I will add a crate.' : 'Watch my pointer. I will take a crate off.']};
    }
    // While the guess is open, the panel gives only the general sums, and the red line on the lever is not shown.
    if (m.phase === 'guess') return {...common, gauge: 'plain', keys: PICK_KEYS(2), waiting: true,
      formulas: [massSum(f), mostSum(), general(pushSum(f)), general(hoverSum(f))],
      cards: GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
      say: guided.guessSay(), prompt: GUESS_PROMPT, hints: guided.guessHints};
    if (m.phase === 'lever') return {...common, keys: LEVER_KEYS, repeat: REPEAT, waiting: true, target: guided.leverTarget, glow: guided.leverTarget, guess: m.guess,
      say: guided.leverSay, prompt: guided.leverTarget === 'lever:weight' && f.lift > weightOf(f) + .5 ? 'Press S (or ↓), or drag the lever, back down to the red line.' : guided.leverPrompt, hints: LEVER_HINTS(guided.leverTarget, shown)};
    if (m.phase === 'running') return {...common, guess: m.guess, say: 'Watch the load.', prompt: 'Watch the load on the pad.', hints: ['Watch the load.', 'Watch the lift and the weight.', 'Wait a moment.']};
    const right = guided ? m.result.right : true;
    return {...common, actions: ['replay'], guess: m.guess, ready: true, mood: right ? 'cheer' : 'explain',
      cards: guided ? GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})) : [],
      say: guided ? (right ? guided.right() : guided.wrong()) : jobDone(weightOf(f)),
      prompt: 'Press Enter to continue, or press R to watch again.', hints: ['Press R to watch it again.', 'Press Enter to continue.', 'Press Enter to continue.']};
  }

  return {enter, act, tick, view, state: () => m};
}

function loadedWith(f) {
  if (f.car) return `With the Dusthawk${f.crates ? ` and ${f.crates} crate${f.crates > 1 ? 's' : ''}` : ''} on the cable`;
  return f.crates ? `With ${f.crates} crate${f.crates > 1 ? 's' : ''} on the cable` : 'With no load on the cable';
}
const jobDone = w => `With the Dusthawk and ${BEST_CRATES} crate${BEST_CRATES > 1 ? 's' : ''} on the cable, the total weight is ${kg(w)} and the helicopter hovers. One more crate would be more than the rotor can hold up, so the job is done. This test measures only the rotor. The hook on the real helicopter has a separate limit, and it refuses a load of more than ${kg(KESTREL.hookLimitKg)} until you own the Lab’s Heavy hook.`;
// What Brian says under the board about where the helicopter is, during his lever demonstration.
function caption(st, f) {
  if (st === 'pad') return f.lift > 0 ? `A lift of ${kg(f.lift)} is less than the weight, so the helicopter stays on the pad.` : 'The lever is all the way down, so there is no lift.';
  if (st === 'hovering') return `A lift of ${kg(f.lift)} equals the weight, so the helicopter hovers.`;
  if (st === 'climbing' || st === 'high') return `A lift of ${kg(f.lift)} is more than the weight, so the helicopter climbs.`;
  if (st === 'sinking') return `A lift of ${kg(f.lift)} is less than the weight, so the helicopter sinks.`;
  return 'Lift and weight are now equal, and the helicopter is rising to its hover.';
}

export const lesson = Object.freeze({id: 'lift', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
