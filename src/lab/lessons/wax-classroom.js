// Ski wax as a classroom lesson (docs/board/cards/LAB-CLASSROOM-WAX.md, "Claude's script"; its wording and formulas
// follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. Every glide uses the ski rules' own friction on the bench's slope, and
// the snows, their temperature bands and the right wax for each are the ones the game's day draws (snowOfDay).
import {SNOWS, SNOW_DAYS, WAXES, FRICTION, GLIDE, glideAcceleration, glideSeconds, waxRunFacts} from '../benches/wax.js';
import {GRAVITY} from '../../ski/ski-physics.js';

// The test strip, in metres; how long after both skis finish a run counts as over.
export const STRIP_M = 50;
const SETTLE_S = .8, WARM_STEP = 5;
export const COLD_C = SNOWS.powder.celsius;
export const s1 = seconds => `${seconds.toFixed(1)} s`;
const s2 = seconds => `${seconds.toFixed(2)} s`;
const tidy = celsius => `${Math.round(celsius) || 0} °C`;
export const WAX_NAMES = Object.freeze({hard: 'Hard', medium: 'Medium', soft: 'Soft'});
const lower = name => name.toLowerCase();
const snowName = snow => lower(SNOWS[snow].name);
const snowAndHeat = snow => `${snowName(snow)} at ${tidy(SNOWS[snow].celsius)}`;
// The friction a wax gives on a snow: the right one, the wrong one, or none.
export const frictionOf = (wax, snow) => wax == null ? FRICTION.none : SNOWS[snow].wax === wax ? FRICTION.right : FRICTION.wrong;
export const runSeconds = (wax, snow) => glideSeconds(frictionOf(wax, snow), STRIP_M);
// How far down the strip a ski is t seconds after it is released, and how fast it is moving then.
export const metresAt = (wax, snow, t) => Math.min(STRIP_M, glideAcceleration(frictionOf(wax, snow)) * Math.max(0, t) ** 2 / 2);
export const speedAt = (wax, snow, t) => glideAcceleration(frictionOf(wax, snow)) * Math.max(0, t);
// Each snow's band, as the ski menu shows it (whole degrees).
export const band = snow => {
  const {low, high} = SNOW_DAYS[snow];
  return snow === 'powder' ? `${Math.round(high)} °C and colder` : `${Math.round(low)} °C to ${Math.round(high)} °C`;
};
const snowAt = celsius => Math.round(celsius) <= SNOW_DAYS.powder.high ? 'powder' : Math.round(celsius) <= SNOW_DAYS.cold.high ? 'cold' : 'wet';

// Brian's job: three days on the ski menu, in the game's own words (each inside the day's band).
export const DAYS = Object.freeze([{snow: 'powder', celsius: -13}, {snow: 'cold', celsius: -3}, {snow: 'wet', celsius: -1}].map(Object.freeze));
export const todayLine = day => `Today's snow: ${SNOWS[day.snow].name}, ${tidy(day.celsius)}`;
const menuSays = day => `The ski menu reads “${todayLine(day)}”.`;

// The free test asks for this many different settings before Continue opens.
export const FREE_TRIES = 3;
export const SNOW_ORDER = Object.freeze(['powder', 'cold', 'wet']);
// The settings Show me tries on the free test, the first one not yet tested each time.
const FREE_ORDER = Object.freeze([['powder', 'soft'], ['wet', 'hard'], ['cold', 'medium'], ['wet', 'soft'], ['powder', 'hard'], ['cold', 'hard'], ['powder', 'medium'], ['cold', 'soft'], ['wet', 'medium']]);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did one win?'},
  {id: 'word-wax', part: 1, title: 'Wax', word: 'wax-wax'},
  {id: 'word-glide', part: 1, title: 'Glide', word: 'wax-glide'},
  {id: 'word-friction', part: 1, title: 'Friction'},
  {id: 'word-crystals', part: 1, title: 'Snow crystals', word: 'wax-snow-crystals'},
  {id: 'why-cold', part: 2, title: 'Why cold snow needs a hard wax'},
  {id: 'why-wet', part: 2, title: 'Why wet snow needs a soft wax'},
  {id: 'watch', part: 2, title: 'Three snows, three waxes'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-cool', part: 3, title: 'Cool snow'},
  {id: 'try-wet', part: 3, title: 'Wet snow'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-cold', part: 5, title: 'Question 1 of 3'},
  {id: 'check-rule', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.wax.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'rule', text: 'The colder the snow, the harder the wax. Dry powder needs a hard wax, cool snow needs a medium wax, and wet snow needs a soft wax.'},
  {id: 'glide', text: 'A wax that suits the snow glides faster than no wax. In this game, a wax that does not suit the snow glides slower than no wax.'},
  {id: 'game', text: 'In the game, read today’s snow on the ski menu and pick the wax that suits that snow.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Cold snow needs a hard wax, and warm snow needs a soft wax.',
  text: 'Read today’s snow on the ski menu, pick the wax that suits that snow, and finish the slalom.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'wax-wax', word: 'Wax', meaning: 'Wax is a thin coat on the base of a ski that helps the ski slide over snow.'},
  {id: 'wax-glide', word: 'Glide', meaning: 'Glide is how smoothly a ski slides over the snow.'},
  {id: 'wax-snow-crystals', word: 'Snow crystals', meaning: 'Snow crystals are tiny pieces of ice, which are sharp and hard when the snow is very cold, and rounded and wet near 0 °C.'},
].map(Object.freeze));

// ---- the sums beside the board, from the numbers they show, so that each comes out on a calculator ----
const G = GRAVITY, SIN_SHOWN = 0.17365, COS_SHOWN = 0.98481, SLOPE = GLIDE.slopeDeg;
const r3 = value => Number(value.toFixed(3));
const PULL = r3(G * SIN_SHOWN);
export function sumOf(friction) {
  const slowing = r3(friction * G * COS_SHOWN), acceleration = r3(PULL - slowing);
  return {friction, pull: PULL, slowing, acceleration, seconds: Number(Math.sqrt(2 * STRIP_M / acceleration).toFixed(2))};
}
const A3 = value => value.toFixed(3);
const FRICTION_NOTE = `In this game, a wax that suits the snow has ${FRICTION.right}, no wax has ${FRICTION.none}, and a wax that does not suit the snow has ${FRICTION.wrong}. A smaller number leaves more acceleration.`;
const pullFormula = teach => ({title: 'How much gravity pulls the ski along the slope', formula: 'pull = g × sin(slope)', worked: `${G} × ${SIN_SHOWN} = ${A3(PULL)} m/s^2`,
  ...(teach ? {note: `g is the acceleration caused by gravity, ${G} m/s^2 in the ski rules. sin ${SLOPE}° is ${SIN_SHOWN}, the share of gravity that acts along the slope.`} : {})});
const TIME_NOTE = '√ means the square root, the number that gives the number inside when it is multiplied by itself.';
// Every sum for one wax on one snow. The Friction step explains g, sin and cos, and later steps leave those notes out, so the time stays in view.
function sums(wax, snow, teach = false) {
  const s = sumOf(frictionOf(wax, snow)), what = wax ? `${lower(WAX_NAMES[wax])} wax` : 'no wax';
  return [
    {title: `The friction number with ${what} on ${snowName(snow)}`, formula: `friction = ${s.friction}`, note: FRICTION_NOTE},
    pullFormula(teach),
    {title: 'How much friction slows the ski', formula: 'slowing = friction × g × cos(slope)', worked: `${s.friction} × ${G} × ${COS_SHOWN} = ${A3(s.slowing)} m/s^2`, ...(teach ? {note: `cos ${SLOPE}° is ${COS_SHOWN}, the share of the ski’s weight that presses into the snow.`} : {})},
    {title: 'The acceleration that is left', formula: 'acceleration = pull − slowing', worked: `${A3(s.pull)} − ${A3(s.slowing)} = ${A3(s.acceleration)} m/s^2`},
    {title: 'The time down the strip', formula: 'time = √(2 × distance ÷ acceleration)', worked: `√(2 × ${STRIP_M} ÷ ${A3(s.acceleration)}) = ${s2(s.seconds)}`},
  ];
}
// The rule with no wax in it: what shows while a guess or a question is open, because a wax's number would settle it.
const general = () => [
  {title: 'The friction number', formula: `${FRICTION.right}, ${FRICTION.none} or ${FRICTION.wrong}`, note: FRICTION_NOTE},
  pullFormula(),
  {title: 'How much friction slows the ski', formula: 'slowing = friction × g × cos(slope)'},
  {title: 'The acceleration that is left', formula: 'acceleration = pull − slowing'},
  {title: 'The time down the strip', formula: 'time = √(2 × distance ÷ acceleration)'},
];
// The three friction numbers, each with the time it gives.
const threeTimes = () => [['A wax that suits the snow', FRICTION.right], ['No wax', FRICTION.none], ['A wax that does not suit the snow', FRICTION.wrong]].map(([title, friction]) => {
  const s = sumOf(friction);
  return {title, formula: `friction = ${friction}`, worked: `√(2 × ${STRIP_M} ÷ ${A3(s.acceleration)}) = ${s2(s.seconds)}`};
});
// The first word step's sum: the gap between two times on the dry powder of the race.
function gapFormula(pick) {
  const hard = sumOf(FRICTION.right).seconds, other = sumOf(frictionOf(pick ?? 'soft', 'powder')).seconds;
  return [{title: pick ? `${WAX_NAMES[pick]} wax against hard wax on dry powder` : 'The gap in the race you watched', formula: 'gap = other time − hard wax time', worked: `${s2(other)} − ${s2(hard)} = ${s2(other - hard)}`,
    note: 'The stopwatches show one decimal place, and the sums use two.'}];
}
// The glide step's sums, at the whole seconds gone so far.
function glideFormulas(lane) {
  const a = sumOf(FRICTION.right).acceleration;
  const motion = t => {
    const speed = Number((a * t).toFixed(2));
    return [
      {title: 'The speed after each second', formula: 'speed = acceleration × time', worked: `${A3(a)} m/s^2 × ${t} s = ${speed.toFixed(2)} m/s`, note: `In this example the speed grows by ${A3(a)} m/s during every second. The next step shows where that number comes from.`},
      {title: 'The speed in kilometres per hour', formula: 'km/h = m/s × 3.6', worked: `${speed.toFixed(2)} m/s × 3.6 = ${(speed * 3.6).toFixed(1)} km/h`},
    ];
  };
  if (lane.done) {
    const s = sumOf(FRICTION.right);
    return [...motion(s.seconds), {title: 'The time down the strip', formula: 'time = √(2 × distance ÷ acceleration)', worked: `√(2 × ${STRIP_M} ÷ ${A3(a)}) = ${s2(s.seconds)}`, note: `This comes from the sum for distance, which is distance = 0.5 × acceleration × time^2. ${TIME_NOTE}`}];
  }
  const t = Math.floor(lane.t);
  return [...motion(t), {title: 'The distance so far', formula: 'distance = 0.5 × acceleration × time^2', worked: `0.5 × ${A3(a)} × ${t}^2 = ${(.5 * a * t * t).toFixed(1)} m`}];
}
function freezingFormula(celsius) {
  const c = Math.round(celsius) || 0, snow = snowAt(c);
  return [{title: 'How far the tray is below freezing', formula: 'degrees below freezing = 0 − temperature', worked: `0 − (${c}) = ${-c || 0} degrees`,
    note: `The tray now holds ${snowName(snow)}. Dry powder is ${band('powder')}, cool snow is ${band('cold')}, and wet snow is ${band('wet')}.`}];
}

// ---- keys (the screen shows them on its buttons and the board) ----
const PICK_KEYS = Object.freeze({1: 'pick:hard', 2: 'pick:medium', 3: 'pick:soft'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const DONE_REPLAY = Object.freeze(['Press R to watch again.', 'Press Enter to continue.', 'Press Enter to continue.']);
const picking = (go, target) => ({keys: {...PICK_KEYS, ...(go ? {Space: 'go'} : {})}, waiting: true, target, glow: 'tins',
  buttons: go ? [{action: 'go', label: go, key: 'Space'}] : []});

// ---- the checks ----
const CHECKS = {
  'check-cold': {
    question: `The ski menu shows that the snow is dry powder at ${SNOWS.powder.celsius} °C. Which wax should you put on the ski?`,
    answers: WAXES.map(wax => ({label: `${WAX_NAMES[wax]} wax`, picture: {kind: 'tin', wax}})),
    correct: 0, snow: 'powder',
    right: () => 'Correct. Very cold snow has hard, sharp crystals, and a hard wax is too hard for the points of those crystals to press into.',
    wrong: picked => `${WAX_NAMES[WAXES[picked]]} wax suits ${picked === 1 ? 'cool snow' : 'wet snow near 0 °C'}. Very cold snow has hard, sharp crystals, which press into a softer wax, so this snow needs a hard wax. Watch the two skis race.`,
    race: picked => picked === 0 ? 'soft' : WAXES[picked],
    hints: ['Think of the sharp, cold crystals in the magnifier.', 'The colder the snow, the harder the wax.', 'Pick hard wax.'],
  },
  'check-rule': {
    question: 'As the snow gets colder, how should the wax change?',
    answers: [{label: 'The wax should get harder', picture: {kind: 'rule', way: 'harder'}}, {label: 'The wax should get softer', picture: {kind: 'rule', way: 'softer'}}, {label: 'The wax can stay the same', picture: {kind: 'rule', way: 'same'}}],
    correct: 0, snow: null,
    right: () => 'Correct. Cold, sharp crystals need a hard wax, and wet snow near 0 °C needs a soft wax.',
    wrong: picked => picked === 1 ? 'It is the other way round. Cold, sharp crystals need a hard wax, and wet snow near 0 °C needs a soft wax.'
      : `One wax does not suit every snow. On dry powder, the ski with the wax that suits the snow glided the strip in ${s1(runSeconds('hard', 'powder'))}, and the ski with a wax that does not suit the snow glided the strip in ${s1(runSeconds('soft', 'powder'))}. The colder the snow, the harder the wax.`,
    hints: ['Hard wax went on the coldest tray.', 'Cold snow needs a hard wax, and wet snow needs a soft wax.', 'Pick the first card.'],
  },
  'check-game': {
    question: 'Before a ski run in the game, where can you read today’s snow and its temperature?',
    answers: [{label: 'On the ski menu', picture: {kind: 'game', what: 'menu'}}, {label: 'On the paint of the skis', picture: {kind: 'game', what: 'skis'}}, {label: 'In the shop', picture: {kind: 'game', what: 'shop'}}],
    correct: 0, snow: null,
    right: () => 'Correct. The ski menu shows today’s snow and its temperature, so you can pick the wax that suits that snow.',
    wrong: picked => picked === 1 ? 'The paint of the skis is only colour, so the paint shows nothing about the snow. The ski menu shows today’s snow and its temperature, such as “Cool snow, -5 °C”.'
      : 'The shop sells the Wax kit, but the shop does not show today’s snow. The ski menu does, such as “Cool snow, -5 °C”.',
    hints: ['Before the slalom, one screen shows the snow.', 'That screen says “Today’s snow” and gives the temperature.', 'Pick the first card.'],
  },
};
// What the two steps on the reason say once the player has changed to the wax that suits the snow.
const WHY_CLOSING = {
  'why-cold': `A soft wax is soft enough for the sharp points to press into it, so each point catches on the wax as the ski moves, and that adds friction. A hard wax is too hard for the points to press into, so the points stay on the surface and there is less friction. On this snow the friction number is ${FRICTION.wrong} with soft wax and ${FRICTION.right} with hard wax. You can keep changing the wax to compare them.`,
  'why-wet': `A softer wax repels water better, so the water gathers into separate beads instead of spreading into one sheet, and less of a sheet means less suction. The grains here are round, so there are no sharp points to press into the soft wax. On this snow the friction number is ${FRICTION.wrong} with hard wax and ${FRICTION.right} with soft wax. Racing skis also have fine grooves in the base, which let the water escape. You can keep changing the wax to compare them.`,
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const lane = (wax, snow, label) => ({wax, snow, label, setAt: null, t: 0, done: false});
  const raceStrip = (snow, wax) => ({snow, lanes: [lane(wax, snow, 'Your ski'), lane(null, snow, 'No wax')]});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', strips: [], pick: null, snow: null, celsius: COLD_C, warmed: false, day: 0, result: null, answered: null, say: '', autoStart: null, lastDone: null, rows: [], tested: new Set(), tries: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.strips = [{snow: 'powder', lanes: [lane('hard', 'powder', 'Hard wax'), lane('soft', 'powder', 'Soft wax')]}]; m.autoStart = .6; m.phase = 'running'; }
    if (id === 'word-wax') { m.phase = 'pick'; m.strips = [{snow: 'powder', lanes: [lane(null, 'powder', 'Your ski')]}]; }
    if (id === 'word-glide') { m.strips = [{snow: 'powder', lanes: [lane('hard', 'powder', 'Hard wax')]}]; }
    if (id === 'word-friction') { m.phase = 'pick'; m.snow = 'powder'; }
    if (id === 'word-crystals') m.phase = 'warm';
    // Each reason starts on the wax that does not suit the snow, away from its answer.
    if (id === 'why-cold') { m.phase = 'pick'; m.snow = 'powder'; m.pick = 'soft'; }
    if (id === 'why-wet') { m.phase = 'pick'; m.snow = 'wet'; m.pick = 'hard'; }
    if (id === 'watch') {
      m.strips = [['powder', 'hard', 'soft'], ['cold', 'medium', 'hard'], ['wet', 'soft', 'hard']].map(([snow, right, wrong]) =>
        ({snow, lanes: [lane(right, snow, `${WAX_NAMES[right]} wax`), lane(wrong, snow, `${WAX_NAMES[wrong]} wax`)]}));
      m.autoStart = .6; m.phase = 'running';
    }
    if (id === 'try-free') { m.phase = 'set'; m.snow = 'powder'; m.pick = 'hard'; m.strips = [raceStrip(m.snow, m.pick)]; }
    if (id === 'try-cool' || id === 'try-wet') {
      const snow = id === 'try-cool' ? 'cold' : 'wet';
      m.phase = m.result ? 'result' : 'pick';
      m.strips = [raceStrip(snow, m.pick)];
    }
    if (id === 'alone') m.phase = m.day >= DAYS.length ? 'done' : 'pick';
    if (CHECKS[id]) {
      m.phase = m.answered === null ? 'ask' : 'answered';
      const snow = CHECKS[id].snow, answered = m.answered !== null;
      // The tray shows no skis until the answer, so its lanes do not suggest one.
      const other = CHECKS[id].race && answered ? CHECKS[id].race(m.answered) : 'soft';
      m.strips = snow ? [{snow, lanes: answered ? [lane('hard', snow, 'Hard wax'), lane(other, snow, `${WAX_NAMES[other]} wax`)] : []}] : [];
    }
  }
  const lanes = () => m.strips.flatMap(s => s.lanes);
  function release() { for (const l of lanes()) if (l.setAt == null) l.setAt = m.time; }
  const snowNow = () => m.strips[0]?.snow;

  function act(action) {
    const id = step().id, [kind, value] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; seen.add(id);
      enter(m.index, {answered: picked});
      release();
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (id === 'word-wax' && kind === 'pick' && m.phase !== 'running') {
      const wax = value === 'best' ? 'hard' : value;
      if (!WAXES.includes(wax)) return null;
      m.pick = wax; lanes()[0].wax = wax; m.phase = 'result'; seen.add(id);
      m.say = `That is ${wax} wax. The wax goes onto the base of the ski as a thin coat, and the base now shows the colour of the wax. On dry powder, a ski with ${wax} wax glides the ${STRIP_M} m strip in ${s1(runSeconds(wax, 'powder'))}, as the sum beside the picture shows. You can pick another tin to compare.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-glide') {
      if (kind !== 'go' || m.phase !== 'ready') return null;
      m.phase = 'running'; release();
      return {kind: 'progress', say: 'Watch the ski and the stopwatch, which runs at real speed.'};
    }
    if (id === 'word-friction') return frictionAct(kind, value);
    if (id === 'word-crystals') {
      if (m.phase !== 'warm' && m.phase !== 'result') return null;
      if (kind === 'warm' && value === 'best') { m.auto = true; return {kind: 'progress', say: 'Watch the thermometer. I will warm the tray to 0 °C.'}; }
      if (m.auto) return null;
      if (kind === 'warm') { m.celsius = Math.min(0, m.celsius + WARM_STEP); return warmed(); }
      if (kind === 'cool') { m.celsius = Math.max(COLD_C, m.celsius - WARM_STEP); return null; }
      return null;
    }
    if (id === 'why-cold' || id === 'why-wet') return whyAct(id, kind, value);
    if (id === 'try-free') return freeAct(kind, value);
    if (id === 'try-cool' || id === 'try-wet') return tryAct(id, kind, value);
    if (id === 'alone') return jobAct(kind, value);
    return null;
  }
  function warmed() {
    if (m.celsius < 0 || m.warmed) return null;
    m.warmed = true; m.phase = 'result'; seen.add('word-crystals');
    m.say = `At ${SNOWS.wet.celsius} °C the crystals are rounded and wet, because the ice has begun to melt. At ${COLD_C} °C the crystals are sharp and hard. You can keep changing the temperature to watch them change.`;
    return {kind: 'right', say: m.say};
  }
  // Friction: any tin, or no wax, moves the arrows and the sums. The first change closes the word and the tins stay free.
  function frictionAct(kind, value) {
    if (kind !== 'pick') return null;
    const wax = value === 'best' ? 'hard' : value === 'none' ? null : value;
    if (wax !== null && !WAXES.includes(wax)) return null;
    m.pick = wax;
    if (m.phase === 'done') return {kind: 'sound', sound: 'lab.tick'};
    m.phase = 'done'; seen.add('word-friction');
    m.say = 'The sums beside the picture follow the rule. Gravity’s pull along the slope stays the same, and friction’s slowing depends on the friction number. The acceleration is what remains of the pull after the slowing is subtracted. A smaller friction number leaves more acceleration, so the ski reaches the finish sooner. You can keep changing the wax to watch the arrows and the sums change.';
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  }
  // The reasons: any tin changes the close-up and the sums, and the wax that suits the snow closes the step.
  function whyAct(id, kind, value) {
    if (kind !== 'pick') return null;
    const best = SNOWS[m.snow].wax, wax = value === 'best' ? best : value;
    if (!WAXES.includes(wax)) return null;
    m.pick = wax;
    if (m.phase === 'done' || wax !== best) return {kind: 'sound', sound: 'lab.tick'};
    m.phase = 'done'; seen.add(id); m.say = WHY_CLOSING[id];
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  }

  // The free test: any snow with any tin. The sums follow each press, and Space races the setting against a ski with no wax.
  function freeAct(kind, value) {
    if (m.phase === 'running') return null;
    if (kind === 'pick') {
      if (!WAXES.includes(value)) return null;
      m.pick = value; m.strips = [raceStrip(m.snow, m.pick)];
      return {kind: 'progress', sound: 'lab.tick'};
    }
    if (kind === 'snow') {
      const at = SNOW_ORDER.indexOf(m.snow), next = value === 'colder' ? SNOW_ORDER[at - 1] : value === 'warmer' ? SNOW_ORDER[at + 1] : SNOW_ORDER.includes(value) ? value : undefined;
      if (!next) return value === 'colder' ? {kind: 'note', say: 'Dry powder is the coldest snow in this test.'} : value === 'warmer' ? {kind: 'note', say: 'Wet snow is the warmest snow in this test.'} : null;
      m.snow = next; m.strips = [raceStrip(m.snow, m.pick)];
      return {kind: 'progress', sound: 'lab.tick'};
    }
    if (kind === 'free') {
      const [snow, wax] = FREE_ORDER.find(([s, w]) => !m.tested.has(`${s}/${w}`)) ?? FREE_ORDER[0];
      m.snow = snow; m.pick = wax;
      return freeRace(`I will test ${wax} wax on ${snowAndHeat(snow)}. Watch the stopwatches.`);
    }
    if (kind === 'go') return freeRace(`You are testing ${m.pick} wax on ${snowAndHeat(m.snow)}. Watch the stopwatches.`);
    return null;
  }
  function freeRace(say) {
    m.strips = [raceStrip(m.snow, m.pick)];
    m.phase = 'running'; release(); m.say = say;
    return {kind: 'progress', say};
  }
  function judgeFree() {
    const {snow, pick} = m, sum = sumOf(frictionOf(pick, snow)), plain = sumOf(FRICTION.none), right = SNOWS[snow].wax === pick;
    m.phase = 'set'; m.tested.add(`${snow}/${pick}`); m.tries = m.tested.size;
    m.rows = [...m.rows, {snow, name: SNOWS[snow].name, celsius: SNOWS[snow].celsius, wax: pick, friction: sum.friction, acceleration: sum.acceleration, seconds: sum.seconds, none: plain.seconds}];
    if (m.tries >= FREE_TRIES) seen.add('try-free');
    const told = `${WAX_NAMES[pick]} wax on ${snowAndHeat(snow)} has a friction number of ${sum.friction}, so the ski reached the finish in ${s1(runSeconds(pick, snow))}, and the ski with no wax reached the finish in ${s1(runSeconds(null, snow))}.`;
    const why = right ? 'This wax suits this snow, so the ski reached the finish before the ski with no wax.' : 'This wax does not suit this snow, so the ski was slower than the ski with no wax.';
    m.say = `${told} ${why} ${m.tries >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change the snow or the wax and test a different setting.'}`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // The tries: pick a tin (and change it), Space races it against a plain ski with no wax.
  function tryAct(id, kind, value) {
    const snow = snowNow();
    if (m.phase === 'running') return null;
    if (kind === 'pick') {
      const wax = value === 'best' ? SNOWS[snow].wax : value;
      if (!WAXES.includes(wax)) return null;
      if (m.phase === 'result') m.strips = [raceStrip(snow, wax)];
      m.pick = wax; lanes()[0].wax = wax; m.phase = 'pick';
      if (value === 'best') return race();
      return null;
    }
    if (kind === 'go') {
      if (!m.pick) return {kind: 'note', say: 'Pick a tin first by pressing 1, 2 or 3.'};
      if (m.phase === 'result') m.strips = [raceStrip(snow, m.pick)];
      return race();
    }
    return null;
  }
  function race() { m.phase = 'running'; release(); return {kind: 'progress', say: `The ski with ${m.pick} wax now races the ski with no wax. Watch the stopwatches.`}; }

  function judgeTry(id) {
    const snow = snowNow(), right = SNOWS[snow].wax === m.pick, mine = runSeconds(m.pick, snow), plain = runSeconds(null, snow), heat = tidy(SNOWS[snow].celsius);
    m.phase = 'result'; seen.add(id); m.result = {right};
    if (right) m.say = `Correct. ${WAX_NAMES[m.pick]} wax suits ${snowName(snow)} at ${heat}. The ski with ${m.pick} wax reached the finish in ${s1(mine)}, and the ski with no wax reached the finish in ${s1(plain)}.`;
    else m.say = `${WAX_NAMES[m.pick]} wax suits ${m.pick === 'hard' ? 'snow at -10 °C and colder' : m.pick === 'medium' ? 'cool snow, from -9 °C to -2 °C' : 'wet snow at -1 °C or 0 °C'}, and this snow is at ${heat}. The ski with ${m.pick} wax reached the finish in ${s1(mine)}, and the ski with no wax reached the finish in ${s1(plain)}, so this wax was slower than no wax at all. ${SNOWS[snow].name} needs ${SNOWS[snow].wax} wax, so press ${1 + WAXES.indexOf(SNOWS[snow].wax)} and then Space.`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // Brian's job: the day's snow, as the ski menu says it; pick and Space. A wrong pick tries that day again.
  function jobAct(kind, value) {
    if (m.phase !== 'pick') return null;
    const day = DAYS[m.day], wax = kind === 'pick' && value === 'best' ? SNOWS[day.snow].wax : kind === 'pick' ? value : null;
    if (kind === 'pick') {
      if (!WAXES.includes(wax)) return null;
      m.pick = wax;
      if (value !== 'best') return null;
    } else if (kind !== 'go') return null;
    if (!m.pick) return {kind: 'note', say: 'Pick a tin first by pressing 1, 2 or 3.'};
    if (SNOWS[day.snow].wax !== m.pick) {
      m.say = `${menuSays(day)} ${SNOWS[day.snow].name} is ${band(day.snow)}, so this snow needs ${SNOWS[day.snow].wax} wax, not ${m.pick} wax. Pick again and press Space.`;
      return {kind: 'fail', say: m.say};
    }
    const fitted = SNOWS[day.snow].wax;
    m.day += 1; m.pick = null;
    if (m.day >= DAYS.length) {
      m.phase = 'done'; seen.add('alone');
      const {right, wrong} = slalomTimes();
      m.say = `You have picked the right wax for all three days, which finishes the job. On the slalom, the right wax reaches the finish about ${(wrong - right).toFixed(1)} s sooner than the wrong wax.`;
      return {kind: 'pass', say: m.say};
    }
    m.say = `Correct. ${WAX_NAMES[fitted]} wax suits that snow. On the next day, the ski menu reads “${todayLine(DAYS[m.day])}”.`;
    return {kind: 'right', say: m.say};
  }
  const slalomTimes = () => {
    const {seconds} = waxRunFacts();
    return {right: Number(seconds.right.toFixed(1)), wrong: Number(seconds.wrong.toFixed(1))};
  };

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.autoStart != null && m.time >= m.autoStart) { m.autoStart = null; release(); }
    if (m.auto && id === 'word-crystals') {
      m.celsius = Math.min(0, m.celsius + 12 * dt);
      if (m.celsius >= 0) { m.auto = false; return warmed(); }
      return null;
    }
    let landed = false;
    for (const l of lanes()) {
      if (l.setAt == null || l.done) continue;
      l.t = m.time - l.setAt;
      if (l.t >= runSeconds(l.wax, l.snow)) { l.t = runSeconds(l.wax, l.snow); l.done = true; landed = true; }
    }
    if (landed && lanes().every(l => l.done)) m.lastDone = m.time;
    const settled = lanes().length > 0 && lanes().every(l => l.done) && m.lastDone != null && m.time - m.lastDone >= SETTLE_S;
    if (!settled || m.phase !== 'running') return landed ? {kind: 'sound', sound: 'lab.tick'} : null;
    if (id === 'try-free') return judgeFree();
    if (id === 'try-cool' || id === 'try-wet') return judgeTry(id);
    m.phase = 'done'; seen.add(id);
    if (id === 'word-glide') {
      const s = sumOf(FRICTION.right), finish = Number((s.acceleration * s.seconds).toFixed(2));
      m.say = `The ski glided ${STRIP_M} m in ${s1(runSeconds('hard', 'powder'))}. The marks on the strip show where the ski was at the end of each second, and the marks grow further apart because the ski moves faster during each second. With hard wax on this snow, the speed grew by ${A3(s.acceleration)} m/s during every second, so the ski reached ${finish.toFixed(2)} m/s at the finish, which is ${(finish * 3.6).toFixed(1)} km/h.`;
      return {kind: 'right', say: m.say};
    }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') { enter(m.index); return null; }
    if (id === 'word-glide' && m.phase === 'done') { enter(m.index); m.phase = 'running'; release(); return null; }
    if ((id === 'try-cool' || id === 'try-wet') && m.phase === 'result') { const snow = snowNow(); m.strips = [raceStrip(snow, m.pick)]; return race(); }
    if (CHECKS[id] && m.phase === 'answered') { enter(m.index, {answered: m.answered}); release(); return null; }
    return null;
  }

  function view() {
    const id = step().id;
    // The tin Brian's pointer goes to: the wax that suits the snow on the board (hard, on the steps that only show a wax).
    const best = id === 'word-wax' || id === 'word-friction' ? 'hard' : id === 'alone' ? SNOWS[DAYS[Math.min(m.day, DAYS.length - 1)].snow].wax
      : m.snow ? SNOWS[m.snow].wax : m.strips[0] ? SNOWS[m.strips[0].snow].wax : null;
    const base = {scene: 'trays', time: m.time, celsius: m.celsius, pick: m.pick, best, tins: true, menu: null, formulas: [], rows: m.rows.map(r => ({...r})),
      strips: m.strips.map(s => {
        const fastest = Math.min(...s.lanes.map(l => runSeconds(l.wax, l.snow))), won = s.lanes.length > 1 && s.lanes.some(l => l.done && runSeconds(l.wax, l.snow) === fastest);
        return {snow: s.snow, name: SNOWS[s.snow].name, celsius: s.celsius ?? SNOWS[s.snow].celsius, lanes: s.lanes.map(l => ({...l, metres: metresAt(l.wax, l.snow, l.t), seconds: l.done ? runSeconds(l.wax, l.snow) : l.setAt == null ? null : l.t,
          winner: won && runSeconds(l.wax, l.snow) === fastest, behindM: won && runSeconds(l.wax, l.snow) > fastest ? STRIP_M - metresAt(l.wax, l.snow, fastest) : null}))};
      }),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), magnifier: false};
    if (id === 'wonder') return {...base, tins: false, actions: ['replay'],
      say: m.phase === 'done' ? `The ski with hard wax reached the finish first, in ${s1(runSeconds('hard', 'powder'))}, and the ski with soft wax followed in ${s1(runSeconds('soft', 'powder'))}. The skis, the slope and the snow were the same, so the difference came from the wax. How can such a thin coat change the time, and why did hard wax give the shorter time on this snow?`
        : `Here are two skis on a test strip of snow that is ${STRIP_M} metres long, written ${STRIP_M} m. The snow is dry powder at ${COLD_C} °C, and that temperature is read as “minus 15 degrees Celsius”. Water freezes at 0 °C, and the minus sign means below freezing. The two skis are the same except for a thin coat on the base, which is the underside of the ski that touches the snow. One ski has a coat of hard wax and the other has a coat of soft wax. Each stopwatch counts seconds, written s. Watch which ski reaches the finish first.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the two skis.',
      hints: ['Watch which ski is in front.', 'The only difference between the skis is the wax on the base.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch until both skis stop, then press Enter.']};
    if (id === 'word-wax') {
      const done = m.phase === 'result';
      return {...base, formulas: gapFormula(m.pick), ...(done ? {keys: PICK_KEYS} : picking(null, 'pick:best')),
        say: done ? m.say : 'Wax is a thin coat that is rubbed onto the base of a ski to help the ski slide over snow. Ski wax is made in different hardnesses. A hard wax is firm, like a candle, and a soft wax is easy to mark with a fingernail. The three tins hold a hard wax, a medium wax and a soft wax.',
        prompt: done ? 'Press Enter to continue, or pick another tin by pressing 1, 2 or 3.' : 'Pick a tin by pressing 1, 2 or 3, or by clicking the tin.',
        hints: done ? DONE : ['The three tins are at the bottom of the picture.', 'Press 1, 2 or 3, or click a tin.', 'Watch my pointer. I will pick the hard wax.']};
    }
    if (id === 'word-glide') {
      const ready = m.phase === 'ready', l = m.strips[0].lanes[0], t = l.done ? runSeconds(l.wax, l.snow) : l.t;
      return {...base, tins: false, formulas: glideFormulas(l), glide: {speed: speedAt(l.wax, l.snow, t), marks: Array.from({length: Math.floor(t)}, (_, k) => ({second: k + 1, metres: metresAt(l.wax, l.snow, k + 1)}))},
        ...(ready ? {keys: {Space: 'go'}, buttons: [{action: 'go', label: 'Release', key: 'Space'}], waiting: true, target: 'go', glow: 'ski'} : {}),
        actions: m.phase === 'done' ? ['replay'] : [],
        say: m.phase === 'done' ? m.say : m.phase === 'running' ? 'Watch the ski and the stopwatch, which runs at real speed.'
          : `Glide is how smoothly a ski slides over the snow, and we measure the glide by timing the ski down the test strip. The ski starts at rest. Gravity, which is the pull of the Earth, pulls the ski down the slope of ${SLOPE} degrees, so the ski moves faster and faster. We give speed in metres per second, written m/s, which is the number of metres travelled during each second. The game’s own screens show kilometres per hour, written km/h. To change m/s into km/h you multiply by 3.6, because an hour has 3,600 seconds and a kilometre has 1,000 metres. How quickly the speed grows is called acceleration, and we give acceleration in metres per second, per second, written m/s². An acceleration of 1 m/s² adds 1 m/s to the speed during every second.`,
        prompt: ready ? 'Press Space to release the ski.' : m.phase === 'running' ? 'Watch the stopwatch.' : 'Press Enter to continue, or press R to watch again.',
        hints: ready ? ['The ski waits at the top of the strip.', 'Press Space, or click the ski.', 'Watch my pointer. I will release the ski.'] : m.phase === 'running' ? ['Watch the ski.', 'Watch the stopwatch.', 'Wait a moment.'] : DONE_REPLAY};
    }
    if (id === 'word-friction') {
      const done = m.phase === 'done';
      return {...base, forces: {...sumOf(frictionOf(m.pick, m.snow)), wax: m.pick, snow: m.snow}, formulas: sums(m.pick, m.snow, true),
        ...(done ? {} : picking(null, 'pick:best')), keys: {...PICK_KEYS, 4: 'pick:none'}, buttons: [{action: 'pick:none', label: 'No wax', key: '4'}],
        say: done ? m.say : `Friction is the force that resists when one surface slides over another, and it is the resistance you feel when you rub your hands together. Two things act on the ski on this slope. Gravity pulls the ski down the slope, and friction acts up the slope and holds the ski back. The friction number shows how strong the friction is compared with the weight of the ski pressing on the snow, so a smaller number means less friction. The ski on the board has no wax, and its friction number on this snow is ${FRICTION.none}. Put a wax on the ski, and watch the arrows and the sums.`,
        prompt: done ? 'Press Enter to continue, or change the wax with 1, 2, 3 or 4.' : 'Press 1, 2 or 3 to put a wax on the ski, or click a tin.',
        hints: done ? DONE : ['The red arrow shows friction, and the green arrow shows gravity’s pull.', 'Press 1, 2 or 3.', 'Watch my pointer. I will put the hard wax on the ski.']};
    }
    if (id === 'word-crystals') {
      const done = m.phase === 'result';
      return {...base, tins: false, magnifier: true, formulas: freezingFormula(m.celsius), keys: m.auto ? {} : {'→': 'warm', '←': 'cool'}, repeat: m.auto ? [] : ['→', '←'],
        buttons: m.auto ? [] : [{action: 'cool', label: 'Colder', key: '←'}, {action: 'warm', label: 'Warmer', key: '→'}],
        ...(done ? {} : {waiting: !m.auto, target: m.auto ? null : 'warm:best', glow: 'thermometer'}),
        say: done ? m.say : m.auto ? 'Watch the thermometer. I will warm the tray to 0 °C.' : `Snow crystals are tiny pieces of ice. Look at them through the magnifier while the tray is at ${COLD_C} °C, and then warm the tray to 0 °C, which is the temperature at which ice begins to melt.`,
        prompt: m.auto ? 'Watch the thermometer.' : done ? `The tray is at ${tidy(m.celsius)}. Press Enter to continue, or ${m.celsius >= 0 ? 'press ← to cool the tray' : m.celsius <= COLD_C ? 'press → to warm the tray' : 'press → to warm the tray and ← to cool the tray'}.` : `The tray is at ${tidy(m.celsius)}. Press → to warm the tray, or click the thermometer, until the tray reads 0 °C.`,
        hints: done ? DONE : ['Watch the crystals in the magnifier.', 'Press → until the thermometer reads 0 °C.', 'Watch my pointer. I will warm the tray.']};
    }
    if (id === 'why-cold' || id === 'why-wet') {
      const done = m.phase === 'done', cold = id === 'why-cold', key = 1 + WAXES.indexOf(best);
      const setup = cold
        ? `When a ski slides, the rubbing warms the snow a little and melts a very thin film of water under the base, and that film helps the ski to slide. At ${COLD_C} °C the snow is so cold that almost no water melts, so the hard, sharp points of the crystals press directly against the wax. The picture is a close-up of the base and the snow, and the ski now has soft wax on the base. Change to hard wax, and watch the points of the crystals.`
        : 'At 0 °C the snow is already wet and the crystals have rounded into grains, so there is too much water rather than too little. The water spreads into one sheet between the base and the snow, and the sheet holds the ski to the snow by suction. Suction is the same pull that makes a wet glass hard to lift from a smooth table. The ski now has hard wax on the base. Change to soft wax, and watch the water.';
      return {...base, closeup: {snow: m.snow, wax: m.pick}, formulas: sums(m.pick, m.snow), ...(done ? {keys: PICK_KEYS} : picking(null, 'pick:best')),
        say: done ? m.say : setup,
        prompt: done ? 'Press Enter to continue, or change the wax with 1, 2 or 3.' : `Press ${key} to change to ${best} wax, or click the tin.`,
        hints: done ? DONE : [cold ? 'Watch how far the points of the crystals press into the wax.' : 'Watch the blue water between the base and the snow.', `Press ${key}.`, `Watch my pointer. I will change to ${best} wax.`]};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, tins: false, formulas: threeTimes(), actions: ['replay', 'slow'],
        say: done ? `On every tray, the ski with the wax that suits the snow finished first, which was hard wax on dry powder, medium wax on cool snow and soft wax on wet snow. Cool snow lies between the other two, because the crystals are less sharp and there is a little water, so a wax of medium hardness suits that snow. The colder the snow, the harder the wax. In this game, every wax that suits its snow has a friction number of ${FRICTION.right} and every wax that does not suit its snow has ${FRICTION.wrong}, which is why all three trays show the same two times, ${s1(glideSeconds(FRICTION.right, STRIP_M))} and ${s1(glideSeconds(FRICTION.wrong, STRIP_M))}.`
          : `Here are three trays, with dry powder at ${SNOWS.powder.celsius} °C, cool snow at ${SNOWS.cold.celsius} °C and wet snow at ${SNOWS.wet.celsius} °C. On each tray, a ski with the wax that suits the snow races a ski with a wax that does not. Watch which ski finishes first on each tray.`,
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the three races.',
        hints: ['Watch which ski finishes first on each tray.', 'Hard wax finishes first on the coldest tray, and soft wax finishes first on the wet tray.', 'Press R to watch again.']};
    }
    if (id === 'try-free') {
      const running = m.phase === 'running';
      const free = {...base, compact: true, closeup: {snow: m.snow, wax: m.pick}, snowTabs: {current: m.snow, open: !running}, formulas: sums(m.pick, m.snow)};
      if (running) return {...free, say: m.say, prompt: 'Watch the stopwatches.', hints: ['Watch the two skis.', 'Compare the time with the sum beside the picture.', 'Wait a moment.']};
      return {...free, keys: {...PICK_KEYS, '←': 'snow:colder', '→': 'snow:warmer', Space: 'go'}, target: 'free:next', waiting: !seen.has(id),
        buttons: [{action: 'snow:colder', label: 'Colder snow', key: '←'}, {action: 'snow:warmer', label: 'Warmer snow', key: '→'}, {action: 'go', label: 'Race', key: 'Space'}],
        say: m.say || `Now you can experiment with any snow and any wax. Press ← and → to change the snow, and press 1, 2 or 3 to change the wax. The sums beside the picture change as you do, so you can work out the time before you race. Your ski then races a ski with no wax, and the table keeps your results so that you can compare them. Test at least ${FREE_TRIES} different settings, and try a wax on a snow that it does not suit.`,
        prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the snow or the wax, then press Space to race. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the settings as they are.', 'Try soft wax on dry powder, and hard wax on wet snow.', m.tested.size < FREE_ORDER.length ? 'Watch my pointer. I will test a setting that you have not tested yet.' : 'Watch my pointer. You have tested every setting, so I will race the first one again.']};
    }
    if (id === 'try-cool' || id === 'try-wet') {
      const snow = snowNow(), name = `${SNOWS[snow].name} at ${tidy(SNOWS[snow].celsius)}`;
      if (m.phase === 'pick') return {...base, formulas: general(), ...picking('Race', 'pick:best'),
        say: `Now you can use what you have found. ${name} is on the strip. Pick the wax that suits this snow, then race your ski against a ski with no wax.`,
        prompt: m.pick ? `${WAX_NAMES[m.pick]} wax is on the ski. Press Space to race, or pick another tin.` : 'Pick a tin by pressing 1, 2 or 3, then press Space to race.',
        hints: [snow === 'cold' ? 'Cool snow is in the middle, because it is neither the coldest snow nor wet.' : 'Wet snow is the warmest snow, near 0 °C.', `The colder the snow, the harder the wax. Press ${1 + WAXES.indexOf(SNOWS[snow].wax)}, then Space.`, 'Watch my pointer. I will pick the wax and race the ski.']};
      if (m.phase === 'running') return {...base, formulas: sums(m.pick, snow), say: `The ski with ${m.pick} wax now races the ski with no wax. Watch the stopwatches.`, prompt: 'Watch the stopwatches.', hints: ['Watch the two skis.', 'Which ski is in front?', 'Wait a moment.']};
      return {...base, formulas: sums(m.pick, snow), ...picking('Race again', null), waiting: false, actions: ['replay'], mood: m.result?.right ? 'cheer' : 'explain', say: m.say,
        prompt: m.result?.right ? 'Press Enter to continue, or press R to watch again.' : 'Press Enter to continue, or pick a tin and press Space to race again.', hints: DONE};
    }
    if (id === 'alone') {
      const day = DAYS[Math.min(m.day, DAYS.length - 1)], menu = {line: todayLine(day), day: Math.min(m.day, DAYS.length - 1) + 1, of: DAYS.length}, scene = {celsius: day.celsius, magnifier: true};
      if (m.phase === 'done') {
        const {right, wrong} = slalomTimes();
        return {...base, ...scene, menu: {...menu, done: true}, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE,
          formulas: [...general(), {title: 'The gap on the slalom', formula: 'gap = time with the wrong wax − time with the right wax', worked: `${wrong.toFixed(1)} s − ${right.toFixed(1)} s = ${(wrong - right).toFixed(1)} s`}]};
      }
      return {...base, ...scene, formulas: general(), menu, ...picking('Ski', 'pick:best'),
        say: m.day === 0 && !m.say ? `Here is a job for you, over three days. Each day the ski menu shows the day’s snow and its temperature. Read the menu, pick the wax that suits that snow, and press Space to ski. ${menuSays(day)}` : m.say,
        prompt: m.pick ? `${WAX_NAMES[m.pick]} wax is on the ski. Press Space to ski, or pick another tin.` : 'Read today’s snow, pick a tin by pressing 1, 2 or 3, then press Space.',
        hints: [`${SNOWS[day.snow].name} is ${band(day.snow)}.`, `The colder the snow, the harder the wax, so ${snowName(day.snow)} needs ${SNOWS[day.snow].wax} wax. Press ${1 + WAXES.indexOf(SNOWS[day.snow].wax)}, then Space.`, 'Watch my pointer. I will pick the wax for you.']};
    }
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null, game = id === 'check-game';
      return {...base, tins: id === 'check-cold', rule: id === 'check-rule', ruleTins: answered, asking: !answered,
        // The ski menu is Question 3's answer, so the board shows the menu only after the answer.
        menu: game && answered ? {line: todayLine({snow: 'cold', celsius: -5}), example: true} : null, where: game && !answered, ...(game && answered ? {magnifier: true, celsius: -5} : {}),
        formulas: !answered ? general() : id === 'check-cold' ? sums('hard', 'powder') : id === 'check-rule' ? threeTimes() : general(),
        keys: answered ? {} : ANSWER_KEYS, actions: answered && check.snow ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, formulas: [...threeTimes(), ...general().slice(1)],
      say: 'Very cold, dry snow has hard, sharp crystals that press into a soft wax, so very cold snow needs a hard wax. Cool snow lies in the middle, so cool snow needs a medium wax. Warm, wet snow holds a ski by suction through a sheet of water, so wet snow needs a softer wax, which breaks the water into beads. Less friction leaves more acceleration, so the ski reaches the finish sooner.',
      prompt: 'Press Enter to go to the helicopter. Then fly to a ski drop, choose the slalom, and pick the wax for today’s snow.', hints: KEY_IDEAS.map(i => i.text)};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'wax', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
