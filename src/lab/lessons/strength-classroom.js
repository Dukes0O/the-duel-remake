// Strength against weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-STRENGTH.md, "Claude's script"; its
// wording and formulas follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. Every bar and every hook arm is the strength bench's own run (loadBar and
// hookArm, the challenge's bench), and the hook arm's limits are the bench's ARM.
import {MATERIALS, RIG, ARM, BASE_HOOK_KG, loadBar, hookArm, lightestArm} from '../benches/strength.js';
import {GRAVITY} from '../../heli/heli-flight.js';

export const NAMES = Object.freeze(Object.keys(MATERIALS));
const [ALUMINIUM, STEEL, CARBON] = NAMES;
// The thickness handle moves 10 mm a press; the weights on the hanger are 10 kg each.
export const STEP_MM = 10, MIN_MM = 10, MAX_MM = 120, WEIGHT_KG = 10;
// The lightest arm that holds the car (carbon fibre, 50 mm, 2.4 kg); the bench's goal allows 15% over it.
export const LIGHTEST = lightestArm();
export const inReach = arm => arm.holds && arm.massKg <= LIGHTEST.massKg * 1.15;
// The free test asks for this many different arms before Continue opens.
export const FREE_TRIES = 3;
// What Show me tries on the free test once the arm on the rig has been tested, so that it reaches three different arms.
const FREE_ARMS = Object.freeze([['steel', 80], ['aluminium', 80], ['carbon fibre', 60], ['carbon fibre', 40], ['aluminium', 60]].map(([material, mm]) => Object.freeze({material, mm})));
// A held key turns the handle every so often; the car takes a second to come onto the hook; the ram ramps the load.
const HELD_GAP_S = .14, LOWER_S = 1.1, SETTLE_S = .7, DIP_S = 2.2, WONDER_S = 2.2;
const RAM_FAST = 2, RAM_WATCH = 1, RAM_TOP_KG = 2100;
// The ram's load grows faster and faster, so the light failures and the heavy one all show: 5 (e^kt - 1) kg.
export const ramKg = (t, rate) => Math.min(RAM_TOP_KG, 5 * (Math.exp(rate * t) - 1));

const capital = material => MATERIALS[material].name;
export const pct = share => `${Math.round(share * 100)}%`;
export const mm1 = mm => `${mm.toFixed(1)} mm`;
export const kg1 = kg => `${kg.toFixed(1)} kg`;
const kg0 = kg => `${Math.round(kg).toLocaleString('en-GB')} kg`;
export const CAR_KG = ARM.loadKg, DIP_MM = ARM.maxDropM * 1000;

// How much of its strength a load uses: 100% is where it bends for good (metals) or snaps (carbon fibre).
export const barUsed = (material, kg) => loadBar(material, kg).stressMPa * 1e6 / MATERIALS[material].strength;
export const failKg = material => loadBar(material, 0).loadAtFailureKg;
export const barMm = material => loadBar(material, 0).thicknessMm;
// Brian's safety line: two thirds of its strength for metal, a third for carbon fibre, which snaps without warning.
export const safeLine = material => 1 / (MATERIALS[material].brittle ? ARM.brittleMargin : ARM.ductileMargin);
const lineWords = material => MATERIALS[material].brittle ? `the safety line for carbon fibre of ${pct(safeLine(material))}` : `the safety line for metal of ${pct(safeLine(material))}`;
// The 2,000 kg car on a hook arm: how hard it works, how far it dips, and what it does.
export function armOutcome(material, mm) {
  const arm = hookArm(material, mm), used = arm.stressMPa * 1e6 / MATERIALS[material].strength;
  const state = used < 1 ? 'holds' : MATERIALS[material].brittle ? 'snaps' : 'bends';
  return {material, mm, arm, used, line: safeLine(material), state, holds: arm.holds,
    overLine: state === 'holds' && used > safeLine(material), tooDeep: state === 'holds' && arm.tipDropMm > DIP_MM};
}
// Why an arm did not hold, with its own numbers.
export function whyNot(o) {
  if (o.state === 'snaps') return `The carbon fibre arm at ${o.mm} mm snapped, because the car brought the stress to ${pct(o.used)} of the strength of carbon fibre, which is past 100%, and carbon fibre is brittle.`;
  if (o.state === 'bends') return `The ${o.material} arm at ${o.mm} mm bent for good, because the car brought the stress to ${pct(o.used)} of the strength of ${o.material}, which is past 100%.`;
  const over = o.overLine ? `the car brought the stress to ${pct(o.used)} of the strength of ${o.material}, which is over ${lineWords(o.material)}` : '';
  const deep = o.tooDeep ? `the arm dipped ${mm1(o.arm.tipDropMm)}, which is more than the ${DIP_MM} mm that my rule allows` : '';
  return `The ${o.material} arm at ${o.mm} mm held the car, but ${[over, deep].filter(Boolean).join(', and ')}.`;
}

// Brian's two arms in the wonder and question 3: the steel arm that holds, and the lightest one.
const STEEL_HOLDS = Object.freeze({material: STEEL, mm: 80});
const CARBON_THIN = Object.freeze({material: CARBON, mm: 30});
const SNAP_MM = 20;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Light and strong?'},
  {id: 'word-density', part: 1, title: 'Density'},
  {id: 'word-strength', part: 1, title: 'Strength', word: 'strength-strength'},
  {id: 'word-stiff', part: 1, title: 'Stiff', word: 'strength-stiff'},
  {id: 'word-brittle', part: 1, title: 'Brittle', word: 'strength-brittle'},
  {id: 'watch', part: 2, title: 'Three bars, one weight', voice: 'lab.brian.strength.intro', words: ['strength-aluminium', 'strength-steel', 'strength-carbon-fibre']},
  {id: 'try-snap', part: 3, title: 'Too thin'},
  {id: 'try-steel', part: 3, title: 'Thick enough'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-bars', part: 5, title: 'Question 1 of 3'},
  {id: 'check-snap', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.strength.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'words', text: 'The strength of a material is the greatest stress that it can withstand before it bends for good or breaks. A stiff part dips very little, and a brittle material snaps instead of bending for good.'},
  {id: 'thicker', text: `For the same weight, a less dense material makes a thicker bar, and thickness counts twice in what a bar can carry. Three 1 kg bars gave way at ${kg0(failKg(STEEL))} for steel, ${kg0(failKg(ALUMINIUM))} for aluminium and ${kg0(failKg(CARBON))} for carbon fibre.`},
  {id: 'choose', text: `Choose the material by what the part must do. The arm for the Heavy hook is carbon fibre, ${LIGHTEST.thicknessMm} mm thick and ${kg1(LIGHTEST.massKg)}, because that arm holds the car for the least weight.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'The right material depends on what the part must do.',
  text: `The Heavy hook is now in the Lab shop. With the Heavy hook, the hook on Kestrel One holds ${kg0(CAR_KG)} instead of ${kg0(BASE_HOOK_KG)}.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'strength-strength', word: 'Strength', meaning: 'The strength of a material is the greatest stress that it can withstand before it bends for good or breaks. Stress is the force on each square millimetre of the material.'},
  {id: 'strength-stiff', word: 'Stiff', meaning: 'A stiff part bends very little under a load.'},
  {id: 'strength-brittle', word: 'Brittle', meaning: 'A brittle material snaps instead of bending for good, so it gives no warning before it fails.'},
  {id: 'strength-aluminium', word: 'Aluminium', meaning: 'Aluminium is a light metal, about a third of the weight of steel for the same size. It bends for good before it breaks.'},
  {id: 'strength-steel', word: 'Steel', meaning: 'Steel is a heavy metal made mostly of iron. It bends for good before it breaks.'},
  {id: 'strength-carbon-fibre', word: 'Carbon fibre', meaning: 'Carbon fibre is a material made of thin threads of carbon set in hard plastic. It is very light and strong for its weight, but it is brittle, so it snaps instead of bending for good.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const MATERIAL_KEYS = Object.freeze({1: 'material:0', 2: 'material:1', 3: 'material:2'});
const THICK_KEYS = Object.freeze({'↑': 'thick:up', '↓': 'thick:down'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const HANG = Object.freeze({action: 'go', label: 'Hang the car', key: 'Space'});
const materialButtons = () => NAMES.map((name, i) => ({action: `material:${i}`, label: MATERIALS[name].name, key: String(i + 1)}));
const thickButtons = () => [{action: 'thick:down', label: 'Thinner', key: '↓'}, {action: 'thick:up', label: 'Thicker', key: '↑'}];
const OUTCOMES = Object.freeze([{label: 'The arm holds the car', said: 'hold the car', state: 'holds'}, {label: 'The arm bends for good', said: 'bend for good', state: 'bends'}, {label: 'The arm snaps', said: 'snap', state: 'snaps'}]);

// ---- the sums beside the board, in newtons and millimetres (so a stress reads in N/mm²), each computed from the rounded
// numbers it shows, so that it comes out on a calculator. The rules are the bench's own: loadBar and hookArm. ----
const LENGTH_MM = Math.round(ARM.lengthM * 1000), BAR_WIDE = Math.round(RIG.widthM * 1000), ARM_WIDE = Math.round(ARM.widthM * 1000);
const num = (value, digits = 0) => value.toLocaleString('en-GB', {maximumFractionDigits: digits});
const fixed = (value, digits) => value.toLocaleString('en-GB', {minimumFractionDigits: digits, maximumFractionDigits: digits});
const shownBarMm = material => Number(barMm(material).toFixed(2));
const strengthOf = material => MATERIALS[material].strength / 1e6, stiffnessOf = material => MATERIALS[material].stiffness / 1e6, densityOf = material => MATERIALS[material].density;
const forceOf = kg => Number((kg * GRAVITY).toFixed(1));
const stressOf = (kg, wide, mm) => Number((6 * forceOf(kg) * LENGTH_MM / (wide * mm * mm)).toFixed(1));
const dipOf = (kg, wide, mm, material) => 4 * forceOf(kg) * LENGTH_MM ** 3 / (stiffnessOf(material) * wide * mm ** 3);
const carryOf = (material, wide, mm) => strengthOf(material) * wide * mm * mm / (6 * LENGTH_MM * GRAVITY);
const armKgShown = (material, mm) => Number((densityOf(material) * ARM.lengthM * ARM.widthM * (mm / 1000)).toFixed(2));
const CARRY_FORMULA = 'most load = strength × width × thickness² ÷ (6 × length × 9.81)';

const thicknessSum = material => {
  const mm = shownBarMm(material);
  return {title: `Thickness of the 1 kg ${material} bar`, formula: 'thickness = weight ÷ (density × length × width)',
    worked: `1 kg ÷ (${num(densityOf(material))} kg/m³ × ${RIG.lengthM} m × ${RIG.widthM} m) = ${(mm / 1000).toFixed(5)} m, which is ${mm} mm`};
};
const forceSum = (kg, what) => ({title: `The force of ${what}`, formula: 'force = load × 9.81', worked: `${num(kg)} kg × 9.81 = ${num(forceOf(kg), 1)} N`});
const stressSum = (kg, wide, mm, what, note) => ({title: `Stress in ${what}`, formula: 'stress = 6 × force × length ÷ (width × thickness²)',
  worked: `6 × ${num(forceOf(kg), 1)} N × ${LENGTH_MM} mm ÷ (${wide} mm × (${mm} mm)²) = ${fixed(stressOf(kg, wide, mm), 1)} N/mm²`, note});
const usedSum = (kg, wide, mm, material, note) => {
  const stress = stressOf(kg, wide, mm), strength = strengthOf(material);
  return {title: 'Strength used', formula: 'strength used = stress ÷ strength', worked: `${fixed(stress, 1)} ÷ ${num(strength)} = ${pct(stress / strength)}`, note};
};
const dipSum = (kg, wide, mm, material, title, note) => ({title, formula: 'dip = 4 × force × length³ ÷ (E × width × thickness³)',
  worked: `4 × ${num(forceOf(kg), 1)} N × (${LENGTH_MM} mm)³ ÷ (${num(stiffnessOf(material))} N/mm² × ${wide} mm × (${mm} mm)³) = ${fixed(dipOf(kg, wide, mm, material), 1)} mm`, note});
const carrySum = (material, wide, mm, title, digits = 1, note = undefined) => ({title, formula: CARRY_FORMULA,
  worked: `${num(strengthOf(material))} N/mm² × ${wide} mm × (${mm} mm)² ÷ (6 × ${LENGTH_MM} mm × 9.81) = ${num(carryOf(material, wide, mm), digits)} kg`, note});
const armWeightSum = (material, mm, title = 'Weight of the arm') => ({title, formula: 'weight = density × length × width × thickness',
  worked: `${num(densityOf(material))} kg/m³ × ${ARM.lengthM} m × ${ARM.widthM} m × ${mm / 1000} m = ${fixed(armKgShown(material, mm), 2)} kg`});
const perKgSum = (material, mm) => {
  const carry = Math.round(carryOf(material, ARM_WIDE, mm)), kg = armKgShown(material, mm);
  return {title: '', formula: 'load for each kg of arm = most load ÷ weight', worked: `${num(carry)} kg ÷ ${fixed(kg, 2)} kg = ${num(carry / kg)} kg`, note: 'This is the arm’s strength against its weight.'};
};
const specificSum = () => ({title: 'Strength against weight, for the materials', formula: 'strength ÷ density',
  worked: NAMES.map(name => `${capital(name)} ${num(strengthOf(name))} ÷ ${num(densityOf(name))} = ${(strengthOf(name) / densityOf(name)).toFixed(3)}`).join('; '),
  note: 'A larger number means more strength for each kilogram of material.'});
// The sums for the arm now on the rig, with the car's full weight, so the player can predict before hanging the car.
export function armFormulas(material, mm, {perKg = true, rules = true} = {}) {
  const line = MATERIALS[material].brittle ? 'carbon fibre' : 'metal';
  return [armWeightSum(material, mm), stressSum(CAR_KG, ARM_WIDE, mm, 'the arm', `The force of the car is ${num(CAR_KG)} kg × 9.81 = ${num(forceOf(CAR_KG))} N.`),
    usedSum(CAR_KG, ARM_WIDE, mm, material, `The strength of ${material} is ${num(strengthOf(material))} N/mm².${rules ? ` My safety line for ${line} is ${pct(safeLine(material))}.` : ''}`),
    dipSum(CAR_KG, ARM_WIDE, mm, material, 'Dip at the end of the arm', `E for ${material} is ${num(stiffnessOf(material))} N/mm².${rules ? ` My rule allows ${DIP_MM} mm.` : ''}`),
    ...(perKg ? [carrySum(material, ARM_WIDE, mm, 'What the arm can carry', 0), perKgSum(material, mm)] : [])];
}
// While the player guesses what the car will do, the panel shows the arm's weight and the general sums, and no result that settles the guess.
export const openGuessFormulas = material => [armWeightSum(material, SNAP_MM), forceSum(CAR_KG, 'the car'),
  {title: 'Stress in the arm', formula: 'stress = 6 × force × length ÷ (width × thickness²)'},
  {title: 'Strength used', formula: 'strength used = stress ÷ strength', note: 'These two sums fill in once the car is on the arm.'}];
export const barFormulas = (material, kg) => [forceSum(kg, 'the load'),
  stressSum(kg, BAR_WIDE, shownBarMm(material), 'the bar', 'Thickness is squared because a thicker bar has more material at work, and that material sits further from the middle of the bar, where it acts with more leverage. The 6 comes from the shape of a bar with a rectangular end.'),
  usedSum(kg, BAR_WIDE, shownBarMm(material), material, `The strength of ${material} is ${num(strengthOf(material))} N/mm². At 100% the ${material} gives way.`)];
const stiffFormulas = () => {
  const thin = shownBarMm(STEEL), thick = shownBarMm(CARBON), times = Number((thick / thin).toFixed(2));
  return [forceSum(WEIGHT_KG, 'the load'),
    dipSum(WEIGHT_KG, BAR_WIDE, thin, STEEL, 'Dip of the steel bar', `E is the stiffness of the material, and a larger E means that the material stretches less. E for steel is ${num(stiffnessOf(STEEL))} N/mm².`),
    dipSum(WEIGHT_KG, BAR_WIDE, thick, CARBON, 'Dip of the carbon fibre bar', `E for carbon fibre is ${num(stiffnessOf(CARBON))} N/mm².`),
    {title: 'How much the thickness matters', worked: `${thick} mm ÷ ${thin} mm = ${times} times as thick, and ${times}³ = ${num(times ** 3)} times as stiff if the material were the same`,
      note: 'Steel has the larger E, which reduces this gain, but the carbon fibre bar still dips about 80 times less.'}];
};
const brittleFormulas = kg => {
  const fail = Math.round(failKg(CARBON)), shown = Math.round(kg);
  return [carrySum(CARBON, BAR_WIDE, shownBarMm(CARBON), 'What the carbon fibre bar can carry', 0, 'This is the stress sum turned around, to find the load that brings the stress up to the strength.'),
    {title: 'Strength used', formula: 'strength used = load ÷ most load', worked: `${num(shown)} kg ÷ ${num(fail)} kg = ${pct(shown / fail)}`}];
};
const aluminiumSum = () => {
  const times = Number((shownBarMm(ALUMINIUM) / shownBarMm(STEEL)).toFixed(2)), strengths = `${num(strengthOf(ALUMINIUM))} ÷ ${num(strengthOf(STEEL))}`;
  return {title: 'Why the aluminium bar carries more', worked: `${shownBarMm(ALUMINIUM)} mm ÷ ${shownBarMm(STEEL)} mm = ${times} times as thick, and ${times}² × (${strengths}) = ${(times ** 2 * strengthOf(ALUMINIUM) / strengthOf(STEEL)).toFixed(1)} times the load`,
    note: 'Each bar weighs 1 kg, so each answer above is also the load carried for each kilogram of bar.'};
};
// Until the ram has finished, the panel shows the general sum and not the loads that the player is about to watch.
const generalCarry = note => ({title: 'What a bar can carry', formula: CARRY_FORMULA, note});
const watchFormulas = () => [
  generalCarry(),
  ...NAMES.map(name => ({title: capital(name), worked: carrySum(name, BAR_WIDE, shownBarMm(name), '', 1).worked})),
  aluminiumSum(),
  specificSum()];

// ---- the checks ----
const CHECK_STEEL = armOutcome(STEEL_HOLDS.material, STEEL_HOLDS.mm), CHECK_THIN = armOutcome(CARBON_THIN.material, CARBON_THIN.mm);
const CHECKS = {
  'check-bars': {
    question: 'Three bars weigh 1 kg each, and the load on all three grows steadily. Which bar bends for good first?',
    answers: NAMES.map(name => ({label: `The ${name} bar`, picture: {kind: 'bar', material: name}})),
    correct: 1,
    right: () => `Correct. The steel bar bends for good first, at ${kg0(failKg(STEEL))}. Steel has the highest density of the three, so its 1 kg bar is the thinnest, at ${mm1(barMm(STEEL))}.`,
    wrong: picked => picked === 0 ? `The aluminium bar carried ${kg0(failKg(ALUMINIUM))}, but the steel bar bent for good at ${kg0(failKg(STEEL))}. Steel has the highest density of the three, so its 1 kg bar is the thinnest.`
      : `Carbon fibre never bends for good, because it is brittle. The carbon fibre bar carried ${kg0(failKg(CARBON))} and then snapped. The steel bar bent for good first, at ${kg0(failKg(STEEL))}.`,
    hints: ['Think of the three bars that you watched.', 'Which material made the thinnest 1 kg bar?', 'Pick the steel bar.'],
  },
  'check-snap': {
    question: 'Which of these three materials snaps instead of bending for good?',
    answers: NAMES.map(name => ({label: capital(name), picture: {kind: 'bar', material: name}})),
    correct: 2,
    right: () => 'Correct. Carbon fibre is brittle, so a carbon fibre part springs back right up to the moment that it snaps. Aluminium and steel bend for good first, which gives a warning.',
    wrong: picked => `${capital(NAMES[picked])} is a metal, so it bends for good before it breaks, which gives a warning. Carbon fibre is the brittle material that snaps.`,
    hints: ['A brittle material snaps instead of bending for good.', 'Which bar broke in two when you watched the three bars?', 'Pick carbon fibre.'],
  },
  'check-game': {
    question: `The Heavy hook lets Kestrel One, the helicopter, lift ${kg0(CAR_KG)} instead of ${kg0(BASE_HOOK_KG)}. The arm must hold the car under my two rules and add as little weight as possible. Which arm meets both needs?`,
    answers: [{label: `Steel, ${STEEL_HOLDS.mm} mm thick, weighing ${kg1(CHECK_STEEL.arm.massKg)}`, picture: {kind: 'arm', material: STEEL, mm: STEEL_HOLDS.mm}},
      {label: `Carbon fibre, ${LIGHTEST.thicknessMm} mm thick, weighing ${kg1(LIGHTEST.massKg)}`, picture: {kind: 'arm', material: CARBON, mm: LIGHTEST.thicknessMm}},
      {label: `Carbon fibre, ${CARBON_THIN.mm} mm thick, weighing ${kg1(CHECK_THIN.arm.massKg)}`, picture: {kind: 'arm', material: CARBON, mm: CARBON_THIN.mm}}],
    correct: 1,
    right: () => `Correct. A carbon fibre arm ${LIGHTEST.thicknessMm} mm thick holds the car and weighs ${kg1(LIGHTEST.massKg)}, and every kilogram on the hook is a kilogram that the helicopter must lift.`,
    wrong: picked => picked === 0 ? `The steel arm holds the car, but it weighs ${kg1(CHECK_STEEL.arm.massKg - LIGHTEST.massKg)} more for the helicopter to lift, and it does the same job. A carbon fibre arm ${LIGHTEST.thicknessMm} mm thick holds the car and weighs ${kg1(LIGHTEST.massKg)}.`
      : `${whyNot(CHECK_THIN)} A carbon fibre arm ${LIGHTEST.thicknessMm} mm thick holds the car and weighs ${kg1(LIGHTEST.massKg)}.`,
    hints: ['Think of the job that you just did for me.', 'The arm must hold the car, and every kilogram is one more for the helicopter to lift.', `Pick carbon fibre at ${LIGHTEST.thicknessMm} mm.`],
  },
};
function checkFormulas(id, answered) {
  if (id === 'check-bars') return answered ? watchFormulas()
    : [{title: 'Thickness of a 1 kg bar', formula: 'thickness = weight ÷ (density × length × width)'}, generalCarry('Every bar weighs 1 kg, so its thickness depends on its density.')];
  if (id === 'check-snap') return [{title: 'Strength used', formula: 'strength used = stress ÷ strength', note: 'At 100%, the material gives way.'}];
  return [...CHECKS[id].answers.map(a => armWeightSum(a.picture.material, a.picture.mm, `Weight of the ${a.picture.material} arm at ${a.picture.mm} mm`)),
    {title: 'My two rules', worked: `Strength used must be ${pct(safeLine(STEEL))} or less for metal and ${pct(safeLine(CARBON))} or less for carbon fibre. The dip must be ${DIP_MM} mm or less.`}];
}

// Which way to press from where the handle is now, so that the words are right from every setting.
export function towards(mm, target) {
  if (mm === target) return `The handle already reads ${target} mm, so press Space.`;
  return `Press ${mm < target ? '↑' : '↓'} until the handle reads ${target} mm, then press Space.`;
}

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The steel arm that held in Thick enough: Brian's job starts from it and compares with it.
  let steel = STEEL_HOLDS;
  const steelKg = () => armOutcome(steel.material, steel.mm).arm.massKg;
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', closing: null, material: STEEL, mm: 40, load: 0, ram: null, hang: null, guess: null, answered: null, say: '',
      auto: null, lastPress: -1, held: [], fails: {}, picked: new Set([STEEL]), tested: new Set(), tests: [], ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') m.phase = 'running';
    if (id === 'word-density') m.phase = 'pick';
    if (id === 'word-strength') m.phase = 'load';
    if (id === 'watch') { m.phase = 'ram'; m.ram = {t: -.8, kg: 0}; }
    if (id === 'try-snap') { m.mm = SNAP_MM; m.phase = 'set'; }
    if (id === 'try-steel') m.phase = 'set';
    if (id === 'try-free') { m.material = steel.material; m.mm = steel.mm; m.phase = 'set'; }
    if (id === 'alone') { m.material = steel.material; m.mm = steel.mm; m.phase = 'set'; m.held = [{material: steel.material, mm: steel.mm, kg: steelKg()}]; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  const setting = () => ['try-snap', 'try-steel', 'try-free', 'alone'].includes(step().id) && m.phase === 'set';
  const canPick = () => setting() && step().id !== 'try-steel';
  const canTurn = () => setting() && step().id !== 'try-snap';
  // What the step builds: what Show me picks, turns and hangs.
  function goal() {
    const id = step().id;
    if (id === 'try-free') {
      const tested = arm => m.tested.has(`${arm.material}/${arm.mm}`), now = {material: m.material, mm: m.mm};
      return !tested(now) ? now : FREE_ARMS.find(arm => !tested(arm)) ?? now;
    }
    return id === 'try-snap' ? {material: CARBON, mm: SNAP_MM} : id === 'try-steel' ? STEEL_HOLDS : {material: LIGHTEST.material, mm: LIGHTEST.thicknessMm};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-snap') return 'I will pick carbon fibre, and then you can say what will happen to the arm.';
    if (id === 'try-steel') return `I will make the steel arm ${g.mm} mm thick, and then I will hang the car.`;
    return `I will build a ${g.material} arm ${g.mm} mm thick, and then I will hang the car.`;
  }

  function act(action) {
    const id = step().id, [kind, value, held] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      seen.add(id);
      enter(m.index, {answered: picked});
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (kind === 'build' && value === 'best') {
      if (!setting() || m.auto) return null;
      m.auto = {...goal()}; m.hang = null;
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'material') return id === 'word-density' ? compare(Number(value)) : pick(Number(value));
    if (kind === 'thick') return turn(value, held === 'held');
    if (kind === 'load' && value === 'add') return addWeight(held === 'held');
    if (kind === 'load' && value === 'off') return takeOff();
    if (kind === 'answer' && id === 'try-snap' && m.phase === 'guess') {
      const picked = Number(value);
      if (!OUTCOMES[picked]) return null;
      m.guess = picked; startHang();
      m.say = `You said that the arm will ${OUTCOMES[picked].said}. Here comes the car, so watch the Strength used gauge.`;
      return {kind: 'progress', say: m.say};
    }
    if (kind === 'go') return go();
    return null;
  }

  // Density: 1, 2, 3 (or a click on the rack) show the 1 kg bar in each material, and stay open after all three are seen.
  function compare(i) {
    const name = NAMES[i];
    if (!name) return null;
    m.material = name;
    if (m.phase === 'done') return {kind: 'sound', sound: 'lab.clunk'};
    m.picked.add(name);
    if (m.picked.size === NAMES.length) {
      m.phase = 'done'; seen.add('word-density');
      m.say = `Steel has the highest density of the three, so its 1 kg bar is the thinnest, at ${mm1(barMm(STEEL))}. Aluminium has about a third of the density of steel, so its 1 kg bar is about three times as thick, at ${mm1(barMm(ALUMINIUM))}. Carbon fibre has the lowest density, so its 1 kg bar is the thickest, at ${mm1(barMm(CARBON))}. You can keep pressing 1, 2 and 3 to compare the bars and watch the sum change.`;
      return {kind: 'right', sound: 'lab.clunk', say: m.say};
    }
    const left = NAMES.findIndex(n => !m.picked.has(n));
    m.say = `${capital(name)} has a density of ${num(densityOf(name))} kg/m³, so its 1 kg bar is ${mm1(barMm(name))} thick. Now press ${left + 1} to see the bar in ${NAMES[left]}.`;
    return {kind: 'progress', sound: 'lab.clunk', say: m.say};
  }
  // 1, 2, 3 (or a click on the rack) pick the arm's material; a broken arm is swapped for a fresh one.
  function pick(i) {
    if (!canPick() || m.auto || !NAMES[i]) return null;
    m.material = NAMES[i]; m.hang = null;
    return {kind: 'sound', sound: 'lab.clunk'};
  }
  // ↑ thickens and ↓ thins the arm 10 mm a press, between 10 and 120 mm.
  function turn(way, held) {
    if (!canTurn() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = m.mm;
    m.mm = Math.max(MIN_MM, Math.min(MAX_MM, before + (way === 'up' ? STEP_MM : -STEP_MM)));
    if (m.mm === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_MM} mm is as thick as the handle goes.` : `${MIN_MM} mm is as thin as the handle goes.`};
    m.lastPress = m.time; m.hang = null;
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  // Strength: ↑ hangs another 10 kg weight on the steel bar, until it bends for good.
  function addWeight(held) {
    if (step().id !== 'word-strength' || m.phase !== 'load') return null;
    if (held && m.time - m.lastPress < HELD_GAP_S * 3) return null;
    m.load += WEIGHT_KG; m.lastPress = m.time;
    const used = barUsed(STEEL, m.load), dip = loadBar(STEEL, m.load).tipDropMm;
    if (used >= 1) {
      m.phase = 'done'; seen.add('word-strength');
      m.say = `A load of ${m.load} kg brings the stress to ${pct(used)} of the strength of the steel. That is past 100%, so the bar has bent for good. This thin steel bar can carry only about ${kg0(failKg(STEEL))}.`;
      m.closing = m.say;
      return {kind: 'right', sound: 'lab.creak', say: m.say};
    }
    m.say = `A load of ${m.load} kg brings the stress to ${pct(used)} of the strength of the steel. The end of the bar dips ${mm1(dip)}, but the stress is under 100% of the strength, so the bar would spring back to its first shape if the weight came off. Press ↑ to hang another ${WEIGHT_KG} kg, or ↓ to take the weight off.`;
    return {kind: 'progress', sound: 'lab.clunk', say: m.say};
  }
  // ↓ takes a weight off, and the bar springs back; a bar bent for good can only be swapped for a fresh one.
  function takeOff() {
    if (step().id !== 'word-strength') return null;
    if (m.phase === 'done') {
      m.phase = 'load'; m.load = 0;
      m.say = `I have fitted a fresh steel bar, because the last bar stays bent. Press ↑ to hang ${WEIGHT_KG} kg on the fresh bar.`;
      return {kind: 'progress', sound: 'lab.clunk', say: m.say};
    }
    if (m.load === 0) return {kind: 'note', say: 'There is no weight on the bar to take off.'};
    m.load -= WEIGHT_KG;
    m.say = `With the weight off, the steel bar has sprung back to its first shape, because the stress stayed under 100% of the strength. Press ↑ to hang ${WEIGHT_KG} kg again.`;
    return {kind: 'progress', sound: 'lab.clunk', say: m.say};
  }

  function go() {
    const id = step().id;
    if (id === 'word-stiff' && m.phase === 'ready') { m.phase = 'dipping'; m.ram = {t: 0}; return {kind: 'progress', sound: 'lab.clunk', say: `There are now ${WEIGHT_KG} kg on each bar. Watch how far the end of each bar dips.`}; }
    if (id === 'word-brittle' && m.phase === 'ready') { m.phase = 'ram'; m.ram = {t: 0, kg: 0}; return {kind: 'progress', say: 'The ram is pulling harder and harder. Watch the bar and the gauge.'}; }
    if (!setting() || m.auto) return null;
    if (id === 'try-snap') {
      if (m.material !== CARBON) return {kind: 'note', say: 'This test uses the carbon fibre arm, so press 3 first.'};
      m.phase = 'guess';
      m.say = `The carbon fibre arm is ${m.mm} mm thick. Think about the sums that you have seen so far. What will happen to the arm when the car hangs from it? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    startHang();
    const coming = `The ${m.material} arm is ${m.mm} mm thick. Here comes the car.`;
    if (id !== 'try-free') m.say = coming;
    return {kind: 'progress', say: coming};
  }
  function startHang() {
    m.phase = 'hanging'; m.hang = {material: m.material, mm: m.mm, t: 0, outcome: armOutcome(m.material, m.mm), broke: false};
    runs.push({material: m.material, mm: m.mm});
  }

  // The car is on: the guess is judged (Too thin), or the arm is (Thick enough, the free test, Brian's job).
  function judge() {
    const id = step().id, o = m.hang.outcome;
    if (id === 'try-snap') {
      m.phase = 'done'; seen.add(id);
      const right = OUTCOMES[m.guess].state === o.state;
      m.say = right ? `You were right, because the arm snapped. The car brought the stress to ${pct(o.used)} of the strength of carbon fibre, which is past 100%, and carbon fibre is brittle, so the arm did not bend first.`
        : OUTCOMES[m.guess].state === 'holds' ? `The arm snapped. The car brought the stress to ${pct(o.used)} of the strength of carbon fibre, which is past 100%, so the arm broke. An arm ${o.mm} mm thick is too thin.`
          : `The arm snapped and did not bend, because carbon fibre is brittle and never bends for good. The car brought the stress to ${pct(o.used)} of the strength of carbon fibre.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    m.phase = 'set';
    if (id === 'try-steel') {
      if (o.holds && o.material === STEEL) {
        m.phase = 'done'; seen.add(id); steel = {material: STEEL, mm: o.mm};
        m.say = `A steel arm ${o.mm} mm thick holds the car. The car brings the stress to ${pct(o.used)} of the strength of steel, which is inside the safety line, and the end of the arm dips ${mm1(o.arm.tipDropMm)}. However, the arm weighs ${kg1(o.arm.massKg)}, and the helicopter must lift that weight as well as the car.`;
        return {kind: 'right', say: m.say};
      }
      m.say = `${whyNot(o)} Make the arm thicker with ↑, then hang the car again.`;
      return {kind: 'fail', say: m.say};
    }
    if (id === 'try-free') {
      m.tested.add(`${o.material}/${o.mm}`);
      m.tests = [...m.tests, {material: o.material, mm: o.mm, kg: o.arm.massKg, used: o.used, dipMm: o.arm.tipDropMm, holds: o.holds}].slice(-5);
      if (m.tested.size >= FREE_TRIES) seen.add(id);
      const carry = Math.round(carryOf(o.material, ARM_WIDE, o.mm)), result = o.holds ? `The ${o.material} arm at ${o.mm} mm held the car under both rules, and the arm weighs ${kg1(o.arm.massKg)}.` : whyNot(o);
      m.say = `${result} An arm like this one could carry ${num(carry)} kg before it gave way. ${m.tested.size >= FREE_TRIES ? 'Press Enter when you have tested enough arms.' : 'Change a setting and test a different arm.'}`;
      return {kind: o.holds ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job: the lightest arm that holds.
    if (!o.holds) { m.say = `${whyNot(o)} ${o.state === 'holds' ? 'Make the arm thicker' : 'Make the arm thicker, or try another material'}, then hang the car again.`; return {kind: 'fail', say: m.say}; }
    const kg = o.arm.massKg, lightest = Math.min(...m.held.map(h => h.kg)), again = m.held.some(h => h.material === o.material && h.mm === o.mm);
    if (!again) m.held.push({material: o.material, mm: o.mm, kg});
    if (inReach(o.arm)) {
      m.phase = 'done'; seen.add(id);
      m.say = `A ${o.material} arm ${o.mm} mm thick holds the car and weighs ${kg1(kg)}, which makes it the lightest arm that can. Your steel arm weighed ${kg1(steelKg())}. That finishes the job.`;
      return {kind: 'pass', say: m.say};
    }
    const thinner = 'Could a thinner arm still hold the car?', less = 'Could a less dense material do the job?';
    const next = o.material === CARBON ? thinner : less;
    m.say = again ? `This arm held the car before, at ${kg1(kg)}. ${kg > lightest ? `Your lightest arm so far weighs ${kg1(lightest)}. ` : ''}${next}` : kg < lightest ? `This arm holds the car at ${kg1(kg)}, which is your lightest so far. ${next}`
      : `This arm holds the car at ${kg1(kg)}, but your lightest arm so far weighs ${kg1(lightest)}. ${next}`;
    return {kind: 'fail', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (m.material !== a.material) { m.material = a.material; return {kind: 'sound', sound: 'lab.clunk'}; }
      if (m.mm !== a.mm) { m.mm += Math.sign(a.mm - m.mm) * STEP_MM; return null; }
      m.auto = null;
      return go();
    }
    if (id === 'wonder' && m.time >= WONDER_S && !seen.has(id)) { seen.add(id); return null; }
    if (id === 'word-stiff' && m.phase === 'dipping') {
      m.ram.t += dt;
      if (m.ram.t < DIP_S) return null;
      m.phase = 'done'; seen.add(id);
      m.say = `Under the same ${WEIGHT_KG} kg, the steel bar dipped ${mm1(loadBar(STEEL, WEIGHT_KG).tipDropMm)} and the carbon fibre bar dipped only ${mm1(loadBar(CARBON, WEIGHT_KG).tipDropMm)}, and both bars sprang back when the weights came off. Steel is in fact the stiffer material, but the carbon fibre bar is about five times as thick, because carbon fibre has a much lower density. Thickness counts three times in the sum for the dip, so the thicker bar is far stiffer.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-brittle' && m.phase === 'ram') {
      m.ram.t += dt; m.ram.kg = ramKg(m.ram.t, RAM_FAST);
      if (m.ram.kg < failKg(CARBON)) return null;
      m.ram.kg = failKg(CARBON); m.phase = 'done'; m.ram.snapAt = m.time; seen.add(id);
      m.say = `The carbon fibre bar carried ${kg0(failKg(CARBON))} and would have sprung back all the way, and then it snapped in two. The bar did not bend for good first, because carbon fibre is brittle.`;
      return {kind: 'right', sound: 'lab.snap', say: m.say};
    }
    if (id === 'watch' && m.phase === 'ram') {
      m.ram.t += dt;
      const before = m.ram.kg; m.ram.kg = Math.max(0, ramKg(Math.max(0, m.ram.t), RAM_WATCH));
      let sound = null;
      for (const name of NAMES) if (m.fails[name] == null && m.ram.kg >= failKg(name) && before < failKg(name)) { m.fails[name] = m.time; sound = MATERIALS[name].brittle ? 'lab.snap' : 'lab.creak'; }
      if (m.fails[CARBON] != null) { m.ram.kg = Math.min(m.ram.kg, failKg(CARBON)); m.phase = 'settle'; m.ram.end = m.time; }
      return sound ? {kind: 'sound', sound} : null;
    }
    if (id === 'watch' && m.phase === 'settle' && m.time - m.ram.end >= SETTLE_S) { m.phase = 'done'; seen.add(id); return null; }
    if (m.hang && m.phase === 'hanging') {
      m.hang.t += dt;
      const k = Math.min(1, m.hang.t / LOWER_S), o = m.hang.outcome;
      if (!m.hang.broke && o.state !== 'holds' && k * o.used >= 1) { m.hang.broke = true; m.hang.brokeAt = m.time; return {kind: 'sound', sound: o.state === 'snaps' ? 'lab.snap' : 'lab.creak'}; }
      if (m.hang.t >= LOWER_S + SETTLE_S) return judge();
    }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // ---- what the board draws ----
  // A test bar under hanging weights or the ram; dips and strength used from loadBar at the load on it now.
  function bar(material, kg, broken = null) {
    const used = barUsed(material, kg), state = broken ?? (used >= 1 ? (MATERIALS[material].brittle ? 'snapped' : 'bent') : 'ok');
    return {kind: 'bar', material, mm: barMm(material), massKg: 1, kg, used: Math.min(used, 1.5), dipMm: state === 'ok' ? loadBar(material, kg).tipDropMm : null, state, line: null};
  }
  // A hook arm with the car coming on: the share of its weight on the hook so far moves both gauges.
  function arm(material, mm, k, broke = false, brokeAt = null) {
    const o = armOutcome(material, mm), state = broke ? (o.state === 'snaps' ? 'snapped' : 'bent') : 'ok';
    return {kind: 'arm', material, mm, massKg: o.arm.massKg, kg: CAR_KG * k, lower: k, used: Math.min(o.used * k, 1.5), dipMm: state === 'ok' ? o.arm.tipDropMm * k : null,
      state, line: o.line, brokeAge: brokeAt == null ? null : m.time - brokeAt};
  }
  function rigView() {
    const id = step().id;
    if (id === 'wonder') {
      const k = Math.max(0, Math.min(1, (m.time - .4) / LOWER_S));
      return [arm(STEEL_HOLDS.material, STEEL_HOLDS.mm, k), arm(LIGHTEST.material, LIGHTEST.thicknessMm, k)];
    }
    if (id === 'word-density') return [bar(m.material, 0)];
    if (id === 'word-strength') return [{...bar(STEEL, m.load), weights: m.load / WEIGHT_KG}];
    if (id === 'word-stiff') {
      const on = m.phase === 'dipping' ? Math.min(1, m.ram.t / .5) * (m.ram.t < DIP_S - .5 ? 1 : Math.max(0, (DIP_S - m.ram.t) / .5)) : 0;
      return [STEEL, CARBON].map(name => ({...bar(name, WEIGHT_KG * on), weights: on > 0 ? 1 : 0, weightsReady: m.phase === 'ready', peakMm: m.phase === 'done' ? loadBar(name, WEIGHT_KG).tipDropMm : null}));
    }
    if (id === 'word-brittle') {
      const kg = m.ram?.kg ?? 0;
      return [{...bar(CARBON, kg, m.phase === 'done' ? 'snapped' : null), ram: true, brokeAge: m.ram?.snapAt == null ? null : m.time - m.ram.snapAt}];
    }
    if (id === 'watch') {
      const kg = m.ram.kg;
      return NAMES.map(name => ({...bar(name, Math.min(kg, failKg(name)), m.fails[name] != null ? (MATERIALS[name].brittle ? 'snapped' : 'bent') : null), ram: true,
        brokeAge: m.fails[name] == null ? null : m.time - m.fails[name]}));
    }
    const h = m.hang;
    if (h) return [arm(h.material, h.mm, Math.min(1, h.t / LOWER_S), h.broke, h.brokeAt ?? null)];
    return [arm(m.material, m.mm, 0)];
  }

  function view() {
    const id = step().id;
    const base = {scene: 'rig', time: m.time, rigs: [], rack: null, handle: null, job: null, table: null, tests: null, density: null, section: false, ramKg: null, runs: runs.map(r => ({...r})), formulas: [],
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, formulas: checkFormulas(id, answered),
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        bars: id === 'check-game' ? null : NAMES.map(name => ({material: name, mm: barMm(name), failKg: failKg(name), shown: answered})),
        arms: id === 'check-game' ? check.answers.map(a => armOutcome(a.picture.material, a.picture.mm)) : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or by pressing 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, formulas: [carrySum(STEEL, BAR_WIDE, shownBarMm(STEEL), 'What the 1 kg steel bar can carry'), carrySum(CARBON, BAR_WIDE, shownBarMm(CARBON), 'What the 1 kg carbon fibre bar can carry'), specificSum(), armWeightSum(LIGHTEST.material, LIGHTEST.thicknessMm, 'Weight of the lightest arm')],
      say: 'Aluminium is about a third of the weight of steel for the same size. Carbon fibre is lighter still and very strong for its weight, but it snaps instead of bending for good. For the same weight, a lighter material makes a thicker part, and a thicker part is far stronger and stiffer. Engineers choose the material by what the part has to do.',
      prompt: 'Press Enter to finish the lesson and open the Heavy hook in the Lab shop.', hints: KEY_IDEAS.map(i => i.text)};
    const rigs = rigView();
    if (id === 'wonder') return {...base, rigs, actions: ['replay'],
      say: seen.has(id) ? `Both arms hold the same ${kg0(CAR_KG)} car. The steel arm weighs ${kg1(CHECK_STEEL.arm.massKg)}, but the carbon fibre arm weighs only ${kg1(LIGHTEST.massKg)}. How can the much lighter arm hold just as much?`
        : `Here are two hook arms. A hook arm is the short, strong bar that carries the hook below a helicopter. One arm is steel, a heavy metal made mostly of iron, and the other is carbon fibre, a material made of thin threads of carbon set in hard plastic. The number beside each arm is its thickness in millimetres, written mm, and a millimetre is one thousandth of a metre. I will hang a car of ${num(CAR_KG)} kilograms, written ${kg0(CAR_KG)}, from each arm, so watch what happens.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the two arms.',
      hints: ['Read what each arm is made of and how much each arm weighs.', 'Both arms hold the car, and one arm is much lighter than the other.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch the car come onto the arms, then press Enter.']};
    if (id === 'word-density') {
      const done = m.phase === 'done', left = NAMES.findIndex(n => !m.picked.has(n));
      return {...base, rigs, density: {material: m.material, densities: NAMES.map(name => ({material: name, density: densityOf(name)}))}, rack: {chosen: m.material, locked: false}, keys: MATERIAL_KEYS, buttons: materialButtons(),
        formulas: [thicknessSum(m.material), {title: 'Lengths in metres', worked: `${LENGTH_MM} mm is ${RIG.lengthM} m, and ${BAR_WIDE} mm is ${RIG.widthM} m.`, note: 'Density is in kilograms per cubic metre, so this sum uses metres.'}],
        ...(done ? {} : {waiting: true, target: `material:${left}`}),
        say: m.say || `Density is how heavy a material is for its size. We measure density in kilograms per cubic metre, written kg/m³, which is the weight of a block measuring one metre along each edge. A test bar always weighs 1 kg and is half a metre long and ${BAR_WIDE} mm wide, so a material with a lower density has to make a thicker bar. This 1 kg bar is steel, with a density of ${num(densityOf(STEEL))} kg/m³. Press 1 to see the same bar in aluminium, a light metal, and press 3 to see the bar in carbon fibre.`,
        prompt: done ? 'Press Enter to continue, or keep pressing 1, 2 and 3 to compare the bars.' : `The bar is ${m.material}. Press 1, 2 or 3 to pick a material, or click a material in the rack.`,
        hints: done ? DONE : ['The rack at the bottom of the board holds the three materials.', `Press ${left + 1} to see the bar in ${NAMES[left]}.`, 'Watch my pointer. I will pick the next material.']};
    }
    if (id === 'word-strength') {
      const done = m.phase === 'done', first = !seen.has(id);
      const buttons = [...(done ? [] : [{action: 'load:add', label: `Add ${WEIGHT_KG} kg`, key: '↑'}]), {action: 'load:off', label: done ? 'Fit a fresh bar' : `Take off ${WEIGHT_KG} kg`, key: '↓'}];
      return {...base, rigs, section: true, formulas: barFormulas(STEEL, m.load), keys: done ? {'↓': 'load:off'} : {'↑': 'load:add', '↓': 'load:off'}, repeat: done ? [] : ['↑'], buttons,
        ...(!done && first ? {waiting: true, target: 'load:add', glow: 'weights'} : {}),
        say: m.closing || m.say || `A load is the weight that hangs from a part. A load on the end of this bar bends the bar, which stretches the top of the bar and squeezes the bottom, as the arrows will show. Stress is the force on each square millimetre of the material, and we measure stress in newtons per square millimetre, written N/mm². A newton, written N, is a unit of force, and gravity pulls on each kilogram with a force of 9.81 N. The strength of a material is the greatest stress that it can withstand before it bends for good or breaks, and bending for good means staying bent after the load comes off. The strength of steel is ${num(strengthOf(STEEL))} N/mm². Press ↑ to hang ${WEIGHT_KG} kg on this steel bar, and watch the Strength used gauge, which shows the stress as a percentage of the strength.`,
        prompt: done ? 'Press Enter to continue, or press ↓ to fit a fresh bar and test it again.' : `The load on the bar is ${m.load} kg. Press ↑ to hang another ${WEIGHT_KG} kg, or click the hanger.`,
        hints: done || !first ? DONE : ['The hanger is at the end of the bar.', `Press ↑ to hang ${WEIGHT_KG} kg, and watch the needle.`, 'Watch my pointer. I will hang a weight.']};
    }
    if (id === 'word-stiff') {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      return {...base, rigs, formulas: stiffFormulas(), ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'weights', buttons: [{action: 'go', label: `Hang ${WEIGHT_KG} kg on each`, key: 'Space'}]} : {}),
        say: done ? m.say : `A stiff part bends very little under a load, and the dip is how far the end of the part moves down. Here are a steel bar and a carbon fibre bar, each weighing 1 kg, with a ${WEIGHT_KG} kg weight ready for each one. Press Space to hang the weights, and watch how far each bar dips.`,
        prompt: ready ? `Press Space to hang ${WEIGHT_KG} kg on both bars, or click a weight.` : done ? 'Press Enter to continue.' : 'Watch how far each bar dips.',
        hints: done ? DONE : ['The dip is how far the end of the bar goes down.', 'Press Space, or click a weight.', 'Watch my pointer. I will hang the weights.']};
    }
    if (id === 'word-brittle') {
      const ready = m.phase === 'ready', done = m.phase === 'done', kg = m.ram?.kg ?? 0;
      return {...base, rigs, section: true, ramKg: kg, formulas: brittleFormulas(kg), ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'ram', buttons: [{action: 'go', label: 'Start the ram', key: 'Space'}]} : {}),
        say: done ? m.say : ready ? 'A brittle material snaps instead of bending for good, so it gives no warning before it fails. The ram on the floor is a powerful cylinder that pulls the end of the bar down, harder and harder. Press Space to start the ram on the carbon fibre bar, and watch the bar and the gauge.' : 'The ram is pulling harder and harder. Watch the bar and the gauge.',
        prompt: ready ? 'Press Space to start the ram, or click the ram.' : done ? 'Press Enter to continue.' : 'Watch the bar.',
        hints: done ? DONE : ['The ram is under the end of the bar.', 'Press Space, or click the ram.', 'Watch my pointer. I will start the ram.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      const table = NAMES.map(name => ({material: name, mm: barMm(name), failKg: failKg(name), state: m.fails[name] != null ? (MATERIALS[name].brittle ? 'snapped' : 'bent') : null}));
      return {...base, rigs, table, ramKg: m.ram.kg, actions: ['replay', 'slow'], formulas: done ? watchFormulas() : [generalCarry('The sum fills in for each bar when the ram has finished.')],
        say: done ? `All three bars weigh 1 kg. The steel bar bent for good at ${kg0(failKg(STEEL))}, the aluminium bar bent for good at ${kg0(failKg(ALUMINIUM))}, and the carbon fibre bar carried ${kg0(failKg(CARBON))} and then snapped. The strength of aluminium is about the same as the strength of steel, but its 1 kg bar is about 2.9 times as thick, and thickness counts twice in the sum, so the aluminium bar carries about nine times as much. For the same weight, a lighter material makes a thicker bar, and a thicker bar is far stronger.`
          : 'Here are three bars of the same weight, made of aluminium, steel and carbon fibre. The ram will load all three together until each one bends for good or snaps.',
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the three bars.',
        hints: ['Watch which bar gives way first.', 'Look at how thick each 1 kg bar is.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The hook-arm tries: the rack, the handle and the car.
    const tryId = id, setNow = setting() && !m.auto;
    const rack = tryId === 'try-steel' ? {chosen: m.material, locked: true} : {chosen: m.material, locked: !canPick()};
    const handle = tryId === 'try-snap' ? {mm: m.mm, locked: true, brian: true} : {mm: m.mm, locked: !canTurn(), brian: false};
    const g = goal(), atGoal = m.material === g.material && m.mm === g.mm;
    const target = !setNow ? null : atGoal ? 'go' : 'build:best';
    const keys = !setNow ? {} : {...(canPick() ? MATERIAL_KEYS : {}), ...(canTurn() ? THICK_KEYS : {}), Space: 'go'};
    const buttons = !setNow ? [] : [...(canPick() ? materialButtons() : []), ...(canTurn() ? thickButtons() : []), HANG];
    const now = armOutcome(m.material, m.mm);
    const v = {...base, rigs, rack, handle, keys, repeat: canTurn() && setNow ? ['↑', '↓'] : [], buttons, target, glow: setNow ? 'build' : null, waiting: setNow || m.phase === 'guess',
      best: g, mass: now.arm.massKg, formulas: tryId !== 'try-snap' ? armFormulas(m.material, m.mm) : m.hang ? armFormulas(m.material, m.mm, {perKg: false, rules: false}) : openGuessFormulas(m.material)};
    if (tryId === 'try-snap') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: OUTCOMES.map((o, i) => ({id: `answer:${i}`, key: String(i + 1), label: o.label, picture: {kind: 'outcome', state: o.state}, state: null})),
        say: m.say, prompt: 'Pick a card by clicking it, or by pressing 1, 2 or 3.',
        hints: ['Carbon fibre is brittle, and this arm is thin.', 'A thin arm has a high stress, because thickness is squared in the sum.', 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'hanging') return {...v, say: m.say, prompt: 'Watch the arm.', hints: ['Watch the Strength used gauge.', 'Past 100%, the arm gives way.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: m.guess != null && OUTCOMES[m.guess].state === m.hang.outcome.state ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `Now we leave the test bars and build a hook arm, which is half a metre long and ${ARM_WIDE} mm wide and must carry the ${kg0(CAR_KG)} car. This arm is ${SNAP_MM} mm thick. Press 3 to pick carbon fibre, then press Space to hang the car.`,
        prompt: `The ${m.material} arm is ${m.mm} mm thick. Press 3 for carbon fibre, or click it in the rack, then press Space.`,
        hints: ['The rack has three materials, each with its own key.', 'Press 3 for carbon fibre, then press Space.', 'Watch my pointer. I will pick carbon fibre.']};
    }
    if (tryId === 'try-steel') {
      if (m.phase === 'hanging') return {...v, say: m.say, prompt: 'Watch the gauges.', hints: ['Watch the Strength used gauge.', 'Is the needle inside the green?', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `Now make a steel arm that holds the ${kg0(CAR_KG)} car. I have two rules for a hook arm. The first rule is my safety line, which keeps a metal arm at no more than two thirds (${pct(safeLine(STEEL))}) of its strength, so that a bump on the cable cannot bend the arm for good. The second rule is that the end of the arm may dip no more than ${DIP_MM} mm. The sums beside the picture change with the thickness, so you can work out the answer before you press Space.`,
        prompt: `The steel arm is ${m.mm} mm thick and weighs ${kg1(now.arm.massKg)}. Press ↑ to make the arm thicker or ↓ to make it thinner, then press Space to hang the car.`,
        hints: ['A thicker arm is stronger, and the arrows on the handle change the thickness.', towards(m.mm, STEEL_HOLDS.mm), 'Watch my pointer. I will make the arm thicker and hang the car.']};
    }
    if (tryId === 'try-free') {
      const tests = m.tests.map(t => ({...t})), intro = `Now you can experiment. Press 1, 2 and 3 to change the material, and ↑ and ↓ to change the thickness. The sums change as you do, so predict what will happen before you press Space. A carbon fibre arm has a lower safety line of one third (${pct(safeLine(CARBON))}), because carbon fibre snaps with no warning. Test at least ${FREE_TRIES} different arms. The table keeps your results so that you can compare them.`;
      if (m.phase === 'hanging') return {...v, tests, say: m.say || intro, prompt: 'Watch the gauges.', hints: ['Watch both needles.', 'Compare this arm with the table.', 'Wait a moment.']};
      return {...v, tests, glow: setNow && target === 'go' ? 'build' : null, waiting: setNow && !seen.has(id),
        say: m.say || intro,
        prompt: seen.has(id) ? 'Press Enter to continue, or test another arm.' : `The ${m.material} arm is ${m.mm} mm thick and weighs ${kg1(now.arm.massKg)}. Press Space to hang the car. Different arms tested so far: ${m.tested.size} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the arm as it is.', 'Try a thin arm and a thick arm, and try all three materials.', atGoal ? 'Watch my pointer. I will hang the car on the arm as it is.' : `Watch my pointer. I will build a ${g.material} arm ${g.mm} mm thick and hang the car.`]};
    }
    // Brian's job.
    const job = {held: m.held.map(h => ({...h})), lightest: Math.min(...m.held.map(h => h.kg)), done: m.phase === 'done'};
    if (m.phase === 'done') return {...v, job, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'hanging') return {...v, job, say: m.say, prompt: 'Watch the gauges.', hints: ['Watch both needles.', 'The arm must stay inside the green and dip no more than the line.', 'Wait a moment.']};
    return {...v, job,
      say: m.auto ? autoSay() : m.say || `Here is a job for you. Kestrel One, the helicopter, needs a Heavy hook, so please build the lightest arm that holds the ${kg0(CAR_KG)} car under both of my rules. You may use any material and any thickness. Your steel arm weighs ${kg1(steelKg())}.`,
      prompt: `The ${m.material} arm is ${m.mm} mm thick and weighs ${kg1(now.arm.massKg)}. Press 1, 2 or 3 to pick the material, ↑ or ↓ to change the thickness, and Space to hang the car.`,
      hints: ['Which material has the lowest density? Try that material, thick enough that both needles stay in the green.', `${m.material === CARBON ? '' : 'Press 3 for carbon fibre. '}${towards(m.mm, LIGHTEST.thicknessMm)}`, 'Watch my pointer. I will build the arm and hang the car.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own hook-arm runs, as the bench's challenge reads them: the bench's goal (an arm that holds the car
// within 15% of the lightest) must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(({material, mm}) => ({controls: [{id: 'part'}, {id: 'material'}, {id: 'thicknessMm'}],
  input: {part: 'hook arm', material, thicknessMm: mm}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = `You have passed Strength against weight, and the Heavy hook is now in the Lab shop. With the Heavy hook, the hook on Kestrel One holds ${kg0(CAR_KG)} instead of ${kg0(BASE_HOOK_KG)}.`;

export const lesson = Object.freeze({id: 'strength', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
