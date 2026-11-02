// Strength against weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-STRENGTH.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every bar and every hook arm is the strength bench's own run (loadBar and
// hookArm, the challenge's bench), and the hook arm's limits are the bench's ARM.
import {MATERIALS, ARM, BASE_HOOK_KG, loadBar, hookArm, lightestArm} from '../benches/strength.js';

export const NAMES = Object.freeze(Object.keys(MATERIALS));
const [ALUMINIUM, STEEL, CARBON] = NAMES;
// The thickness handle moves 10 mm a press; the weights on the hanger are 10 kg each.
export const STEP_MM = 10, MIN_MM = 10, MAX_MM = 120, WEIGHT_KG = 10;
// The lightest arm that holds the car (carbon fibre, 50 mm, 2.4 kg); the bench's goal allows 15% over it.
export const LIGHTEST = lightestArm();
export const inReach = arm => arm.holds && arm.massKg <= LIGHTEST.massKg * 1.15;
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
const lineWords = material => MATERIALS[material].brittle ? `carbon fibre’s line of ${pct(safeLine(material))}` : `the line for metal, two thirds (${pct(safeLine(material))})`;
// The 2,000 kg car on a hook arm: how hard it works, how far it dips, and what it does.
export function armOutcome(material, mm) {
  const arm = hookArm(material, mm), used = arm.stressMPa * 1e6 / MATERIALS[material].strength;
  const state = used < 1 ? 'holds' : MATERIALS[material].brittle ? 'snaps' : 'bends';
  return {material, mm, arm, used, line: safeLine(material), state, holds: arm.holds,
    overLine: state === 'holds' && used > safeLine(material), tooDeep: state === 'holds' && arm.tipDropMm > DIP_MM};
}
// Why an arm did not hold, with its own numbers.
export function whyNot(o) {
  if (o.state === 'snaps') return `${capital(o.material)} at ${o.mm} mm: the car used ${pct(o.used)} of its strength, past 100%. Carbon fibre is brittle, so it snapped.`;
  if (o.state === 'bends') return `${capital(o.material)} at ${o.mm} mm: the car used ${pct(o.used)} of its strength, past 100%, so it bent for good.`;
  const over = o.overLine ? `used ${pct(o.used)} of its strength, over ${lineWords(o.material)}` : '';
  const deep = o.tooDeep ? `dipped ${mm1(o.arm.tipDropMm)}, more than the ${DIP_MM} mm the hook may dip` : '';
  return `${capital(o.material)} at ${o.mm} mm held, but ${[over, deep].filter(Boolean).join(', and ')}.`;
}

// Brian's two arms in the wonder and question 3: the steel arm that holds, and the lightest one.
const STEEL_HOLDS = Object.freeze({material: STEEL, mm: 80});
const CARBON_THIN = Object.freeze({material: CARBON, mm: 30});
const SNAP_MM = 20;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Light and strong?'},
  {id: 'word-strength', part: 1, title: 'Strength', word: 'strength-strength'},
  {id: 'word-stiff', part: 1, title: 'Stiff', word: 'strength-stiff'},
  {id: 'word-brittle', part: 1, title: 'Brittle', word: 'strength-brittle'},
  {id: 'watch', part: 2, title: 'Three bars, one weight', voice: 'lab.brian.strength.intro', words: ['strength-aluminium', 'strength-steel', 'strength-carbon-fibre']},
  {id: 'try-snap', part: 3, title: 'Too thin'},
  {id: 'try-steel', part: 3, title: 'Thick enough'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-bars', part: 5, title: 'Question 1 of 3'},
  {id: 'check-snap', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.strength.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'words', text: 'Strength is the load a part takes before it bends for good or breaks. Stiff means it bends very little.'},
  {id: 'thicker', text: `Same weight: a lighter material makes a thicker part, and thicker is far stronger. Three 1 kg bars: steel bent at ${kg0(failKg(STEEL))}, aluminium at ${kg0(failKg(ALUMINIUM))}.`},
  {id: 'choose', text: `Carbon fibre is light and stiff but brittle: it snaps. Choose by the job: the Heavy hook’s arm is carbon fibre, ${LIGHTEST.thicknessMm} mm, ${kg1(LIGHTEST.massKg)}.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Pick by what the part must do: strong, light or tough.',
  text: `The Heavy hook is in the Lab shop: Kestrel One’s hook holds ${kg0(CAR_KG)}, up from ${kg0(BASE_HOOK_KG)}.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'strength-strength', word: 'Strength', meaning: 'Strength is how much load a part can take before it bends for good or breaks.'},
  {id: 'strength-stiff', word: 'Stiff', meaning: 'Stiff means it bends very little.'},
  {id: 'strength-brittle', word: 'Brittle', meaning: 'Brittle means it snaps instead of bending.'},
  {id: 'strength-aluminium', word: 'Aluminium', meaning: 'Aluminium is a light metal, about a third the weight of steel, that bends before it breaks.'},
  {id: 'strength-steel', word: 'Steel', meaning: 'Steel is a heavy, tough metal that bends before it breaks.'},
  {id: 'strength-carbon-fibre', word: 'Carbon fibre', meaning: 'Carbon fibre is very light and stiff, but brittle: it snaps instead of bending.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const MATERIAL_KEYS = Object.freeze({1: 'material:0', 2: 'material:1', 3: 'material:2'});
const THICK_KEYS = Object.freeze({'↑': 'thick:up', '↓': 'thick:down'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const HANG = Object.freeze({action: 'go', label: 'Hang the car', key: 'Space'});
const materialButtons = () => NAMES.map((name, i) => ({action: `material:${i}`, label: MATERIALS[name].name, key: String(i + 1)}));
const thickButtons = () => [{action: 'thick:down', label: 'Thinner', key: '↓'}, {action: 'thick:up', label: 'Thicker', key: '↑'}];
const OUTCOMES = Object.freeze([{label: 'It holds', state: 'holds'}, {label: 'It bends for good', state: 'bends'}, {label: 'It snaps', state: 'snaps'}]);

// ---- the checks ----
const CHECK_STEEL = armOutcome(STEEL_HOLDS.material, STEEL_HOLDS.mm), CHECK_THIN = armOutcome(CARBON_THIN.material, CARBON_THIN.mm);
const CHECKS = {
  'check-bars': {
    question: 'Three bars weigh 1 kg each. The load grows. Which one bends for good first?',
    answers: NAMES.map(name => ({label: capital(name), picture: {kind: 'bar', material: name}})),
    correct: 1,
    right: () => `Yes: steel, at ${kg0(failKg(STEEL))}. Steel is the heaviest for its size, so its 1 kg bar is the thinnest, ${mm1(barMm(STEEL))}.`,
    wrong: picked => picked === 0 ? `The aluminium bar held ${kg0(failKg(ALUMINIUM))}; the steel bar bent at ${kg0(failKg(STEEL))}. Steel is heaviest for its size, so its 1 kg bar is the thinnest.`
      : `Carbon fibre never bends for good: it held ${kg0(failKg(CARBON))}, then snapped. The steel bar bent first, at ${kg0(failKg(STEEL))}.`,
    hints: ['Think of the three bars in the Watch.', 'Which material made the thinnest 1 kg bar?', 'Pick “Steel”.'],
  },
  'check-snap': {
    question: 'Which one snaps instead of bending?',
    answers: NAMES.map(name => ({label: capital(name), picture: {kind: 'bar', material: name}})),
    correct: 2,
    right: () => 'Yes. Carbon fibre is brittle: it springs back right up to the moment it snaps. Aluminium and steel bend for good first, which gives a warning.',
    wrong: picked => `${capital(NAMES[picked])} is a metal: it bends for good before it breaks, which gives a warning. Carbon fibre is brittle: it snaps.`,
    hints: ['Brittle means it snaps instead of bending.', 'Which bar broke in two in the Watch?', 'Pick “Carbon fibre”.'],
  },
  'check-game': {
    question: `The Heavy hook lets Kestrel One lift ${kg0(CAR_KG)}, up from ${kg0(BASE_HOOK_KG)}. Which arm would you fit?`,
    answers: [{label: `Steel, ${STEEL_HOLDS.mm} mm: ${kg1(CHECK_STEEL.arm.massKg)}`, picture: {kind: 'arm', material: STEEL, mm: STEEL_HOLDS.mm}},
      {label: `Carbon fibre, ${LIGHTEST.thicknessMm} mm: ${kg1(LIGHTEST.massKg)}`, picture: {kind: 'arm', material: CARBON, mm: LIGHTEST.thicknessMm}},
      {label: `Carbon fibre, ${CARBON_THIN.mm} mm: ${kg1(CHECK_THIN.arm.massKg)}`, picture: {kind: 'arm', material: CARBON, mm: CARBON_THIN.mm}}],
    correct: 1,
    right: () => `Yes. It holds the car and weighs ${kg1(LIGHTEST.massKg)}: every kilogram on the hook is one the helicopter must lift.`,
    wrong: picked => picked === 0 ? `It holds, but it weighs ${kg1(CHECK_STEEL.arm.massKg - LIGHTEST.massKg)} more for the helicopter to lift, for the same job. Carbon fibre at ${LIGHTEST.thicknessMm} mm holds it at ${kg1(LIGHTEST.massKg)}.`
      : `${whyNot(CHECK_THIN)} Carbon fibre at ${LIGHTEST.thicknessMm} mm holds it at ${kg1(LIGHTEST.massKg)}.`,
    hints: ['Think of Brian’s job.', 'It must hold the car, and every kilogram is one more for the helicopter to lift.', `Pick carbon fibre at ${LIGHTEST.thicknessMm} mm.`],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The steel arm that held in Thick enough: Brian's job starts from it and compares with it.
  let steel = STEEL_HOLDS;
  const steelKg = () => armOutcome(steel.material, steel.mm).arm.massKg;
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', material: STEEL, mm: 40, load: 0, ram: null, hang: null, guess: null, answered: null, say: '',
      auto: null, lastPress: -1, held: [], fails: {}, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') m.phase = 'running';
    if (id === 'word-strength') m.phase = 'load';
    if (id === 'watch') { m.phase = 'ram'; m.ram = {t: -.8, kg: 0}; }
    if (id === 'try-snap') { m.mm = SNAP_MM; m.phase = 'set'; }
    if (id === 'try-steel') m.phase = 'set';
    if (id === 'alone') { m.material = steel.material; m.mm = steel.mm; m.phase = 'set'; m.held = [{material: steel.material, mm: steel.mm, kg: steelKg()}]; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  const setting = () => ['try-snap', 'try-steel', 'alone'].includes(step().id) && m.phase === 'set';
  const canPick = () => setting() && step().id !== 'try-steel';
  const canTurn = () => setting() && step().id !== 'try-snap';
  // What the step builds: what Show me picks, turns and hangs.
  function goal() {
    const id = step().id;
    return id === 'try-snap' ? {material: CARBON, mm: SNAP_MM} : id === 'try-steel' ? STEEL_HOLDS : {material: LIGHTEST.material, mm: LIGHTEST.thicknessMm};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-snap') return 'Watch: I pick carbon fibre, then hang the car.';
    if (id === 'try-steel') return `Watch: I thicken the steel arm to ${g.mm} mm, then hang the car.`;
    return `Watch: carbon fibre, ${g.mm} mm, then I hang the car.`;
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
    if (kind === 'material') return pick(Number(value));
    if (kind === 'thick') return turn(value, held === 'held');
    if (kind === 'load' && value === 'add') return addWeight(held === 'held');
    if (kind === 'answer' && id === 'try-snap' && m.phase === 'guess') {
      const picked = Number(value);
      if (!OUTCOMES[picked]) return null;
      m.guess = picked; startHang();
      return {kind: 'progress', say: `You said: ${OUTCOMES[picked].label.toLowerCase()}. Here comes the car.`};
    }
    if (kind === 'go') return go();
    return null;
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
      m.say = `${m.load} kg used ${pct(used)} of the bar’s strength: past 100%, so it bent for good. This steel bar’s strength is about ${kg0(failKg(STEEL))}.`;
      return {kind: 'right', sound: 'lab.creak', say: m.say};
    }
    m.say = `${m.load} kg uses ${pct(used)} of its strength. It dips ${mm1(dip)}, but it is under 100%, so it would spring back. Press ↑ for another ${WEIGHT_KG} kg.`;
    return {kind: 'progress', sound: 'lab.clunk', say: m.say};
  }

  function go() {
    const id = step().id;
    if (id === 'word-stiff' && m.phase === 'ready') { m.phase = 'dipping'; m.ram = {t: 0}; return {kind: 'progress', sound: 'lab.clunk', say: `${WEIGHT_KG} kg on each bar. Watch the Dips gauges.`}; }
    if (id === 'word-brittle' && m.phase === 'ready') { m.phase = 'ram'; m.ram = {t: 0, kg: 0}; return {kind: 'progress', say: 'The ram pulls harder and harder. Watch the bar.'}; }
    if (!setting() || m.auto) return null;
    if (id === 'try-snap') {
      if (m.material !== CARBON) return {kind: 'note', say: 'This try is the carbon fibre arm: press 3 first.'};
      m.phase = 'guess';
      return {kind: 'progress', say: `Carbon fibre, ${m.mm} mm. Before the car goes on: will it hold, bend for good or snap? Pick a card.`};
    }
    startHang();
    return {kind: 'progress', say: `${capital(m.material)}, ${m.mm} mm: here comes the car.`};
  }
  function startHang() {
    m.phase = 'hanging'; m.hang = {material: m.material, mm: m.mm, t: 0, outcome: armOutcome(m.material, m.mm), broke: false};
    runs.push({material: m.material, mm: m.mm});
  }

  // The car is on: the guess is judged (Too thin), or the arm is (Thick enough, Brian's job).
  function judge() {
    const id = step().id, o = m.hang.outcome;
    if (id === 'try-snap') {
      m.phase = 'done'; seen.add(id);
      const right = OUTCOMES[m.guess].state === o.state;
      m.say = right ? `Right: it snapped. The car used ${pct(o.used)} of its strength, past 100%, and carbon fibre is brittle: no bend first.`
        : OUTCOMES[m.guess].state === 'holds' ? `It snapped. The car used ${pct(o.used)} of its strength: past 100%, so it broke. At ${o.mm} mm it is too thin.`
          : `It snapped, not bent: carbon fibre is brittle, so it never bends for good. The car used ${pct(o.used)} of its strength.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    m.phase = 'set';
    if (id === 'try-steel') {
      if (o.holds && o.material === STEEL) {
        m.phase = 'done'; seen.add(id); steel = {material: STEEL, mm: o.mm};
        m.say = `${o.mm} mm of steel holds the car: ${pct(o.used)} of its strength, inside the line, and it dips ${mm1(o.arm.tipDropMm)}. But it weighs ${kg1(o.arm.massKg)}.`;
        return {kind: 'right', say: m.say};
      }
      m.say = `${whyNot(o)} Thicker: press ↑, then hang it again.`;
      return {kind: 'fail', say: m.say};
    }
    // Brian's job: the lightest arm that holds.
    if (!o.holds) { m.say = `${whyNot(o)} ${o.state === 'holds' ? 'Make it thicker' : 'Make it thicker, or try another material'}, then hang it again.`; return {kind: 'fail', say: m.say}; }
    const kg = o.arm.massKg, lightest = Math.min(...m.held.map(h => h.kg)), again = m.held.some(h => h.material === o.material && h.mm === o.mm);
    if (!again) m.held.push({material: o.material, mm: o.mm, kg});
    if (inReach(o.arm)) {
      m.phase = 'done'; seen.add(id);
      m.say = `${capital(o.material)} at ${o.mm} mm holds the car and weighs ${kg1(kg)}: the lightest arm that can. Your steel arm weighed ${kg1(steelKg())}. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    const next = o.material === CARBON ? 'Can a thinner one still hold?' : 'Try a lighter material.';
    m.say = again ? `This arm held before, at ${kg1(kg)}. ${kg > lightest ? `Your lightest so far is ${kg1(lightest)}. ` : ''}${next}` : kg < lightest ? `It holds at ${kg1(kg)}, your lightest yet. ${o.material === CARBON ? 'Can a thinner one still hold?' : 'Can a lighter material do it?'}`
      : `It holds at ${kg1(kg)}, but your lightest so far is ${kg1(lightest)}. ${o.material === CARBON ? 'Can a thinner one still hold?' : 'Try a lighter material.'}`;
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
      m.say = `Same ${WEIGHT_KG} kg: the steel bar dipped ${mm1(loadBar(STEEL, WEIGHT_KG).tipDropMm)}, the carbon fibre bar ${mm1(loadBar(CARBON, WEIGHT_KG).tipDropMm)}, and both sprang back. The carbon fibre bar is far stiffer.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-brittle' && m.phase === 'ram') {
      m.ram.t += dt; m.ram.kg = ramKg(m.ram.t, RAM_FAST);
      if (m.ram.kg < failKg(CARBON)) return null;
      m.ram.kg = failKg(CARBON); m.phase = 'done'; m.ram.snapAt = m.time; seen.add(id);
      m.say = `It held ${kg0(failKg(CARBON))} and sprang back all the way, then snapped in two. No bending for good first: carbon fibre is brittle.`;
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
    if (id === 'word-strength') return [{...bar(STEEL, m.load), weights: m.load / WEIGHT_KG}];
    if (id === 'word-stiff') {
      const on = m.phase === 'dipping' ? Math.min(1, m.ram.t / .5) * (m.ram.t < DIP_S - .5 ? 1 : Math.max(0, (DIP_S - m.ram.t) / .5)) : 0;
      return [STEEL, CARBON].map(name => ({...bar(name, WEIGHT_KG * on), weights: on > 0 ? 1 : 0, weightsReady: m.phase === 'ready'}));
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
    const base = {scene: 'rig', time: m.time, rigs: [], rack: null, handle: null, job: null, table: null, ramKg: null, runs: runs.map(r => ({...r})),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        bars: id === 'check-game' ? null : NAMES.map(name => ({material: name, mm: barMm(name), failKg: failKg(name), shown: answered})),
        arms: id === 'check-game' ? check.answers.map(a => armOutcome(a.picture.material, a.picture.mm)) : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'Aluminium is about a third the weight of steel, size for size. Carbon fibre is lighter still and very stiff, but it snaps instead of bending. Engineers choose by what the part has to do.',
      prompt: 'Enter finishes the lesson and opens the Heavy hook in the Lab shop.', hints: KEY_IDEAS.map(i => i.text)};
    const rigs = rigView();
    if (id === 'wonder') return {...base, rigs, actions: ['replay'],
      say: seen.has(id) ? `Both arms hold the same ${kg0(CAR_KG)} car. One weighs ${kg1(CHECK_STEEL.arm.massKg)}, the other ${kg1(LIGHTEST.massKg)}. How can the light one hold as much?`
        : `Two hook arms, and a ${kg0(CAR_KG)} car on each. Watch.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the two arms.',
      hints: ['Read what each arm is made of, and what it weighs.', 'Both hold the car. One is much lighter.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch the car go on, then press Enter.']};
    if (id === 'word-strength') {
      const done = m.phase === 'done';
      return {...base, rigs, ...(done ? {} : {keys: {'↑': 'load:add'}, repeat: ['↑'], waiting: true, target: 'load:add', glow: 'weights', buttons: [{action: 'load:add', label: `Add ${WEIGHT_KG} kg`, key: '↑'}]}),
        say: done || m.load ? m.say : 'Strength is how much load a part takes before it bends for good or breaks. Hang weights on this steel bar and watch the Strength used gauge.',
        prompt: done ? 'Press Enter to go on.' : `${m.load} kg on the bar. Press ↑ to hang another ${WEIGHT_KG} kg, or click the hanger.`,
        hints: done ? DONE : ['The hanger is at the end of the bar.', `Press ↑ to hang ${WEIGHT_KG} kg, and watch the needle.`, 'Watch my pointer: I hang a weight.']};
    }
    if (id === 'word-stiff') {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      return {...base, rigs, ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'weights', buttons: [{action: 'go', label: `Hang ${WEIGHT_KG} kg on each`, key: 'Space'}]} : {}),
        say: done ? m.say : `Stiff means it bends very little. A steel bar and a carbon fibre bar, ${WEIGHT_KG} kg ready for each.`,
        prompt: ready ? `Press Space to hang ${WEIGHT_KG} kg on both bars, or click a weight.` : done ? 'Press Enter to go on.' : 'Watch the Dips gauges.',
        hints: done ? DONE : ['The Dips gauge says how far the end of the bar goes down.', 'Press Space, or click a weight.', 'Watch my pointer: I hang them.']};
    }
    if (id === 'word-brittle') {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      return {...base, rigs, ramKg: m.ram?.kg ?? 0, ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'ram', buttons: [{action: 'go', label: 'Start the ram', key: 'Space'}]} : {}),
        say: done ? m.say : ready ? 'Brittle means it snaps instead of bending. The ram pulls the carbon fibre bar down, harder and harder.' : 'Watch the bar and the needle.',
        prompt: ready ? 'Press Space to start the ram, or click it.' : done ? 'Press Enter to go on.' : 'Watch the bar.',
        hints: done ? DONE : ['The ram is under the end of the bar.', 'Press Space, or click the ram.', 'Watch my pointer: I start it.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      const table = NAMES.map(name => ({material: name, mm: barMm(name), failKg: failKg(name), state: m.fails[name] != null ? (MATERIALS[name].brittle ? 'snapped' : 'bent') : null}));
      return {...base, rigs, table, ramKg: m.ram.kg, actions: ['replay', 'slow'],
        say: done ? `Same 1 kg each. Steel bent for good at ${kg0(failKg(STEEL))}, aluminium at ${kg0(failKg(ALUMINIUM))}, and carbon fibre held ${kg0(failKg(CARBON))}, then snapped. The lighter the material, the thicker its 1 kg bar, and a thicker bar is far stronger.`
          : `Three bars, each 1 kg: aluminium, steel and carbon fibre. Steel is heaviest for its size, so its bar is the thinnest. The ram loads all three.`,
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the three bars.',
        hints: ['Watch which bar gives first.', 'Look at how thick each 1 kg bar is.', done ? 'Press R to watch again.' : 'Wait a moment.']};
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
      best: g, mass: now.arm.massKg};
    if (tryId === 'try-snap') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: OUTCOMES.map((o, i) => ({id: `answer:${i}`, key: String(i + 1), label: o.label, picture: {kind: 'outcome', state: o.state}, state: null})),
        say: m.say || 'Will it hold, bend for good or snap?', prompt: 'Pick a card: click it, or press 1, 2 or 3.',
        hints: ['Carbon fibre is brittle. And this arm is thin.', 'Brittle means it snaps instead of bending.', 'Pick a card; any guess goes on.']};
      if (m.phase === 'hanging') return {...v, say: m.say, prompt: 'Watch the arm.', hints: ['Watch the Strength used gauge.', 'Past 100%, it gives.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: m.guess != null && OUTCOMES[m.guess].state === m.hang.outcome.state ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.say || `This arm is ${SNAP_MM} mm thick. Pick carbon fibre, then hang the ${kg0(CAR_KG)} car on it.`,
        prompt: `${capital(m.material)}, ${m.mm} mm. Press 3 for carbon fibre (or click it in the rack), then Space.`,
        hints: ['The rack has three materials, each with its key.', 'Press 3 for carbon fibre, then Space.', 'Watch my pointer: I pick it.']};
    }
    if (tryId === 'try-steel') {
      if (m.phase === 'hanging') return {...v, say: m.say, prompt: 'Watch the gauges.', hints: ['Watch the Strength used gauge.', 'Is the needle inside the green?', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `Make a steel arm that holds the ${kg0(CAR_KG)} car. Both needles must stay in the green.`,
        prompt: `Steel, ${m.mm} mm, ${kg1(now.arm.massKg)}. Press ↑ to thicken it, ↓ to thin it, Space to hang the car.`,
        hints: ['Thicker is stronger. The handle’s arrows thicken and thin the arm.', `Press ↑ until it reads ${STEEL_HOLDS.mm} mm, then Space.`, 'Watch my pointer: I thicken it and hang the car.']};
    }
    // Brian's job.
    const job = {held: m.held.map(h => ({...h})), lightest: Math.min(...m.held.map(h => h.kg)), done: m.phase === 'done'};
    if (m.phase === 'done') return {...v, job, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'hanging') return {...v, job, say: m.say, prompt: 'Watch the gauges.', hints: ['Watch both needles.', 'Green holds; past the lines does not.', 'Wait a moment.']};
    return {...v, job,
      say: m.auto ? autoSay() : m.say || `Brian’s job: the Heavy hook. Build the lightest arm that holds the ${kg0(CAR_KG)} car. Any material, any thickness. Your steel arm weighs ${kg1(steelKg())}.`,
      prompt: `${capital(m.material)}, ${m.mm} mm, ${kg1(now.arm.massKg)}. 1, 2, 3 pick the material; ↑ and ↓ the thickness; Space hangs the car.`,
      hints: ['Which material is lightest for its size? Try it, thick enough that both needles stay green.', `Carbon fibre (press 3), then ↓ to ${LIGHTEST.thicknessMm} mm, then Space.`, 'Watch my pointer: I build it and hang the car.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own hook-arm runs, as the bench's challenge reads them: the bench's goal (an arm that holds the car
// within 15% of the lightest) must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(({material, mm}) => ({controls: [{id: 'part'}, {id: 'material'}, {id: 'thicknessMm'}],
  input: {part: 'hook arm', material, thicknessMm: mm}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = `Strength passed! The Heavy hook is in the Lab shop: with it Kestrel One’s hook holds ${kg0(CAR_KG)}, up from ${kg0(BASE_HOOK_KG)}.`;

export const lesson = Object.freeze({id: 'strength', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
