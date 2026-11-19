// Rust as a classroom lesson (docs/board/cards/LAB-CLASSROOM-RUST.md, "Claude's script"; its wording and formulas follow
// LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every rust share is the rust bench's own (jarAfter,
// the rule the challenge's rustOf uses); "clean" is the challenge's own line (RUST_OK). The challenge itself is the Lab's parts panel.
import {JARS, RUST, jarAfter} from '../benches/rust.js';
import {RUST_OK, RUST_WEEK} from '../lab-workshop.js';
import {MORE} from '../classroom/brian-text.js';

// The calendar turns a day about every half second; a free test of many days runs faster, so it is not a wait.
export const DAY_S = .45, HOLD_S = .8;
const HELD_GAP_S = .14, FREE_RUN_S = 4;
export const MIN_DAYS = 1, MAX_DAYS = RUST_WEEK;
// The free test's dial reaches past the coat's last day; its jars; how many different settings open Continue.
export const FREE_MAX_DAYS = 30, FREE_TRIES = 3;
export const FREE_JARS = Object.freeze(['dry', 'fresh', 'salt']);
export const jarOf = id => JARS.find(j => j.id === id);
export const shareOf = (jarId, days) => jarAfter(jarOf(jarId), days).rust;
export const coatOf = (jarId, days) => jarAfter(jarOf(jarId), days).zincLeft;
export const pct = share => `${Math.round(share * 100)}%`;
export const PROTECTIONS = Object.freeze(['bare', 'zinc']);
export const PROTECTION_NAME = Object.freeze({bare: 'Bare', zinc: 'Zinc coat'});
// A nail in a jar, with or without a zinc coat: bare in salt water is the salt jar, zinc in salt water the zinc jar;
// zinc anywhere else is that jar with the coat on (the challenge's rustOf).
export const rustAfter = (jarId, protection, days) => jarAfter({...jarOf(jarId), zinc: protection === 'zinc'}, days);
export const weekRust = (jarId, protection) => rustAfter(jarId, protection, RUST_WEEK).rust;
export const clean = share => share <= RUST_OK;
export const bestFor = jarId => clean(weekRust(jarId, 'bare')) ? 'bare' : 'zinc';

// The dial's test counts to this day; the coat's test runs on to the last day.
export const TRY_DAYS = 3, ZINC_TO = 25;
// Brian's job: three things in the yard, each kept like the nail in one of the bench's jars.
export const JOBS = Object.freeze([
  {name: 'The boat trailer', thing: 'the boat trailer', lives: 'It is dunked in the sea at every launch.', where: 'which is dunked in the sea at every launch', jar: 'salt'},
  {name: 'The toolbox', thing: 'the toolbox', lives: 'It sits on the dry shelf in the shed.', where: 'which sits on the dry shelf in the shed', jar: 'dry'},
  {name: 'The garden gate', thing: 'the garden gate', lives: 'It stands out in the rain.', where: 'which stands out in the rain', jar: 'fresh'},
].map(Object.freeze));

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Orange from the sea'},
  {id: 'word-rust', part: 1, title: 'Rust', word: 'rust-rust'},
  {id: 'word-salt', part: 1, title: 'Salt water', word: 'rust-salt-water'},
  {id: 'word-zinc', part: 1, title: 'Zinc coat', word: 'rust-zinc-coat'},
  {id: 'watch', part: 2, title: 'Four jars, one week', voice: 'lab.brian.rust.intro'},
  {id: 'try-days', part: 3, title: 'Three days'},
  {id: 'try-zinc', part: 3, title: 'How long the zinc lasts'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-five', part: 5, title: 'Question 1 of 3'},
  {id: 'check-zinc', part: 5, title: 'Question 2 of 3'},
  {id: 'check-sirena', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.rust.explain'},
].map(Object.freeze));

const W = id => shareOf(id, RUST_WEEK), FRESH_DAY = RUST.freshPerDay, SALT_DAY = RUST.saltPerDay;
const TIMES = Math.round(SALT_DAY / FRESH_DAY), ZINC_DAYS = RUST.zincLastDays;
const whole = share => Math.round(share * 100);
const COAT_PER_DAY = 100 / ZINC_DAYS;
const dayWord = d => `${d} ${d === 1 ? 'day' : 'days'}`;
const isWord = id => id === 'word-rust' || id === 'word-salt' || id === 'word-zinc';
const jarWords = id => jarOf(id).name.toLowerCase();
export const KEY_IDEAS = Object.freeze([
  {id: 'water', text: `Iron rusts when water and oxygen both reach it. After a week a nail in dry air has ${pct(W('dry'))} rust, and a nail in fresh water has ${pct(W('fresh'))} rust.`},
  {id: 'salt', text: `Salt water makes rust form ${TIMES} times as fast, because salt helps the water carry electric charge. That is ${pct(SALT_DAY)} a day against ${pct(FRESH_DAY)} a day, so a nail has ${pct(W('salt'))} rust after a week.`},
  {id: 'zinc', text: `Zinc corrodes before steel, so a zinc coat protects the steel until the coat has gone, which is ${ZINC_DAYS} days in salt water. The Galvanised finish is a zinc coat.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Use zinc where water reaches, and leave a part bare where it stays dry.',
  text: `Pick the protection for each part of the car. A part with more than ${pct(RUST_OK)} rust after a week is not protected.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them (Paint included).
export const WORDS = Object.freeze([
  {id: 'rust-rust', word: 'Rust', meaning: 'The flaky orange material that forms when water and oxygen reach iron. Steel is mostly iron, so steel rusts too.'},
  {id: 'rust-salt-water', word: 'Salt water', meaning: 'Water with salt dissolved in it. Salt helps water carry electric charge, which makes iron rust faster.'},
  {id: 'rust-zinc-coat', word: 'Zinc coat', meaning: 'A thin layer of the metal zinc on steel. The zinc corrodes first, and that protects the steel underneath until the zinc has gone.'},
  {id: 'rust-paint', word: 'Paint', meaning: 'A coating that keeps water and air away from the metal underneath.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DAY_KEYS = Object.freeze({'↑': 'days:up', '↓': 'days:down'});
const COAT_KEYS = Object.freeze({'←': 'coat:bare', '→': 'coat:zinc'});
const JAR_KEYS = Object.freeze({1: 'jar:dry', 2: 'jar:fresh', 3: 'jar:salt'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const RUN = Object.freeze({action: 'go', label: 'Run the days', key: 'Space'});
const TO_GUESS = Object.freeze({action: 'go', label: 'Go to the question', key: 'Space'});

const DAY_GUESSES = Object.freeze([FRESH_DAY * TRY_DAYS, SALT_DAY * TRY_DAYS, W('salt')].map(share => ({share, label: `About ${pct(share)}`})));
const ZINC_GUESSES = Object.freeze([{days: 10, label: 'About 10 days'}, {days: ZINC_DAYS, label: `About ${ZINC_DAYS} days`}, {days: null, label: 'Never, because zinc does not wear away'}]);

// ---- the formulas beside the board (the numbers are the ones on the calendar, the dial and the switch now) ----
const rateOf = id => jarOf(id).water ? (jarOf(id).salt ? SALT_DAY : FRESH_DAY) : 0;
const FULL_NOTE = 'A nail cannot rust more than all the way through, so the rust stops at 100%.';
const rateNote = {
  dry: 'With no water, the rate is 0% a day, so the nail does not rust.',
  fresh: 'The rate is the percentage of the nail that rusts during one day. In this game the rate stays the same every day, which is a simplification.',
  salt: `This rate is ${TIMES} times the rate in fresh water.`,
};
function bareFormula(id, d) {
  const sum = whole(rateOf(id)) * d;
  return {title: `Rust on a bare nail in ${jarWords(id)}`, formula: 'rust = rate × days', worked: `${whole(rateOf(id))}% a day × ${dayWord(d)} = ${sum}%${sum > 100 ? ', which stops at 100%' : ''}`, note: sum > 100 ? FULL_NOTE : rateNote[id]};
}
function coatFormula(id, d) {
  if (!jarOf(id).water) return {title: 'Zinc coat left', worked: 'No water reaches the coat, so 100% of the coat is left.'};
  const sum = 100 - COAT_PER_DAY * d;
  return {title: 'Zinc coat left', formula: `coat left = 100% − ${COAT_PER_DAY}% a day × days`, worked: `100% − ${COAT_PER_DAY}% a day × ${dayWord(d)} = ${sum < 0 ? `−${-sum}` : sum}%${sum <= 0 ? ', so the coat has gone' : ''}`,
    note: id === 'fresh' ? `In this game the coat lasts ${ZINC_DAYS} days in fresh water as well, which is a simplification, because real zinc lasts far longer in fresh water than in salt water.`
      : `In this game the coat wears away by the same amount every day, ${COAT_PER_DAY}% of the coat, which is a simplification.`};
}
function underFormula(id, d) {
  if (!jarOf(id).water) return {title: 'Rust under the coat', worked: 'With no water, the rust stays at 0%.'};
  const rate = whole(rateOf(id)), sum = rate * (d - ZINC_DAYS);
  return {title: 'Rust under the coat', formula: `rust = rate × (days − ${ZINC_DAYS})`, worked: d <= ZINC_DAYS ? `${dayWord(d)} is no more than ${ZINC_DAYS} days, so the rust is 0%.` : `${rate}% a day × (${d} − ${ZINC_DAYS}) days = ${sum}%${sum > 100 ? ', which stops at 100%' : ''}`,
    note: 'The steel starts to rust only when the coat has gone.'};
}
// Before the coat's own test, nothing says how many days the coat lasts, because that test asks.
const coatHolds = () => ({title: 'Rust under the coat', worked: 'While the coat lasts, the rust stays at 0%.', note: 'The steel starts to rust only when the coat has gone.'});
// While the player is working out the 3 days, the sum waits for its answer.
const openSum = (id, d) => ({...bareFormula(id, d), worked: `${whole(rateOf(id))}% a day × ${dayWord(d)} = ?`});
const thingFormulas = (id, coat, d) => coat === 'zinc' ? [coatFormula(id, d), underFormula(id, d)] : [bareFormula(id, d)];
const fasterFormula = () => ({title: 'How much faster salt water is', formula: 'salt water rate ÷ fresh water rate', worked: `${whole(SALT_DAY)}% ÷ ${whole(FRESH_DAY)}% = ${TIMES} times as fast`,
  note: 'These rates belong to this game. They are much faster than the rates of real nails, so that one week shows a clear result.'});
const cleanFormula = rust => ({title: 'The test for clean', formula: `clean means rust of ${pct(RUST_OK)} or less after ${RUST_WEEK} days`, ...(rust === null ? {} : {worked: `${pct(rust)} is ${clean(rust) ? 'not more than' : 'more than'} ${pct(RUST_OK)}, so this is ${clean(rust) ? 'clean' : 'not clean'}.`})});

const S5 = shareOf('salt', 5), Z22 = shareOf('zinc', 22), AFTER = 22 - RUST.zincLastDays;
const CHECKS = {
  'check-five': {
    question: 'A bare nail sits in salt water for 5 days. What percentage of the nail has rusted by then?',
    answers: [0.1, S5, 1].map(share => ({label: pct(share), picture: {kind: 'nail', rust: share}})),
    correct: 1,
    right: () => `Correct. Salt water rusts the nail at ${pct(SALT_DAY)} a day, and ${pct(SALT_DAY)} a day for 5 days gives ${pct(S5)}.`,
    wrong: picked => picked === 0 ? `The rust is greater than that. Salt water rusts the nail at ${pct(SALT_DAY)} a day, so 5 days give ${pct(S5)}, and 10% is less than one day of rust.`
      : `The nail has not rusted all the way through yet, because that needs more than ${Math.floor(1 / SALT_DAY)} days. ${pct(SALT_DAY)} a day for 5 days gives ${pct(S5)}.`,
    hints: [`A bare nail in salt water rusts at ${pct(SALT_DAY)} a day.`, `Multiply ${pct(SALT_DAY)} a day by 5 days.`, `Pick ${pct(S5)}.`],
    before: () => [{title: 'Rust on a bare nail', formula: 'rust = rate × days', worked: `The rate is ${pct(FRESH_DAY)} a day in fresh water and ${pct(SALT_DAY)} a day in salt water.`}],
    after: () => [bareFormula('salt', 5)],
  },
  'check-zinc': {
    question: 'A nail with a zinc coat sits in salt water for 22 days. What do you find when you take the nail out?',
    answers: [{label: 'The nail is clean and still has zinc on it', picture: {kind: 'nail', rust: 0, coat: .1}},
      {label: `The coat has gone and ${pct(Z22)} of the steel has rusted`, picture: {kind: 'nail', rust: Z22, coat: 0}},
      {label: 'The steel is 100% rusted, like a bare nail', picture: {kind: 'nail', rust: 1, coat: 0}}],
    correct: 1,
    right: () => `Correct. The coat lasts ${ZINC_DAYS} days, and then the steel rusts for ${AFTER} days at ${pct(SALT_DAY)} a day, which gives ${pct(Z22)}.`,
    wrong: picked => picked === 0 ? `The coat lasts only ${ZINC_DAYS} days, so by day 22 the coat has gone, and the steel has rusted for ${AFTER} days at ${pct(SALT_DAY)} a day, which gives ${pct(Z22)}.`
      : `The zinc kept the steel clean for ${ZINC_DAYS} days, so the steel has rusted for only ${AFTER} days, which gives ${pct(Z22)} rather than the 100% of a bare nail.`,
    hints: ['How long did the coat last in your test?', `The coat lasts ${ZINC_DAYS} days, and then the steel rusts for ${AFTER} days at ${pct(SALT_DAY)} a day.`, 'Pick the second card.'],
    before: () => [{title: 'Zinc coat left', formula: `coat left = 100% − ${COAT_PER_DAY}% a day × days`}, {title: 'Rust under the coat', formula: `rust = rate × (days − ${ZINC_DAYS})`, note: 'The steel starts to rust only when the coat has gone.'}],
    after: () => [coatFormula('salt', 22), underFormula('salt', 22)],
  },
  'check-sirena': {
    question: 'Before restoring the Sirena, Brian soaks the wreck in fresh water for several weeks. What is the purpose of the soak?',
    answers: [{label: 'To draw the salt out of the metal', picture: {kind: 'soak', what: 'salt'}},
      {label: 'To wash the rust off the metal', picture: {kind: 'soak', what: 'wash'}},
      {label: 'To stop the metal from rusting at all', picture: {kind: 'soak', what: 'stop'}}],
    correct: 0,
    right: () => `Correct. Salt left in the metal would keep the rust forming quickly, at ${pct(SALT_DAY)} a day against ${pct(FRESH_DAY)} a day in fresh water. During the soak, the salt slowly dissolves out into the water.`,
    wrong: picked => picked === 1 ? `Rust is part of the metal now, so water does not wash it off. The soak draws the salt out of the metal, because salt keeps the rust forming at ${pct(SALT_DAY)} a day against ${pct(FRESH_DAY)} a day in fresh water.`
      : `Fresh water still rusts steel, by ${pct(W('fresh'))} in a week, although salt water rusts steel ${TIMES} times as fast. The soak draws the salt out of the metal.`,
    hints: ['Which jar rusted its nail fastest?', 'Sixty years in the sea left salt in the metal of the Sirena.', 'Pick the first card.'],
    before: () => [bareFormula('fresh', RUST_WEEK), bareFormula('salt', RUST_WEEK), fasterFormula()],
    after: () => [bareFormula('fresh', RUST_WEEK), bareFormula('salt', RUST_WEEK), fasterFormula()],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  // The day dial and the switch carry from step to step, as the player left them.
  const set = {days: RUST_WEEK, coat: 'bare', jar: 'salt'};
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', run: null, shelf: [], rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1, job: 0, tries: 0, tested: new Set(), ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.shelf = ['dry', 'salt']; runDays(RUST_WEEK, .6); }
    if (isWord(id)) set.days = RUST_WEEK;
    if (id === 'word-rust') m.shelf = ['dry', 'fresh'];
    if (id === 'word-salt') m.shelf = ['fresh', 'salt'];
    if (id === 'word-zinc') m.shelf = ['salt', 'zinc'];
    if (id === 'watch') { m.shelf = JARS.map(j => j.id); runDays(RUST_WEEK, .6); }
    if (id === 'try-days') { m.shelf = ['salt']; set.days = RUST_WEEK; m.phase = 'set'; }
    if (id === 'try-zinc') { m.shelf = ['zinc']; m.phase = 'guess'; }
    if (id === 'try-free') { set.days = RUST_WEEK; set.coat = 'bare'; set.jar = 'salt'; m.shelf = [set.jar]; m.phase = 'set'; }
    // The job starts bare on every visit, away from the trailer's answer; later things carry the switch.
    if (id === 'alone') { set.days = RUST_WEEK; set.coat = 'bare'; startJob(); }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  function startJob() { m.shelf = [JOBS[m.job].jar]; m.phase = 'set'; m.run = null; }
  // The calendar runs from day 0 to `to`; the shelf's nails rust as the bench says.
  function runDays(to, delay = 0, dayS = DAY_S) { m.run = {day: 0, to, t: -delay, held: 0, dayS}; m.phase = 'running'; }
  const day = () => m.run?.day ?? 0;
  // The days the sums show: the calendar's whole day while it runs or after it stops, otherwise the dial's setting.
  const sumDays = () => m.run ? Math.floor(m.run.day + 1e-9) : set.days;
  const setting = () => ['try-days', 'try-free', 'alone'].includes(step().id) && m.phase === 'set';
  // The word steps stay open after their first run, so the player can go on turning the dial and watching the sums.
  const wordOpen = () => isWord(step().id) && (m.phase === 'ready' || m.phase === 'done');
  const canDays = () => (setting() && step().id !== 'alone') || wordOpen();
  const canCoat = () => setting() && step().id !== 'try-days';
  const canJar = () => setting() && step().id === 'try-free';
  const job = () => JOBS[Math.min(m.job, JOBS.length - 1)];
  // What Show me sets and runs.
  function goal() {
    const id = step().id;
    if (id === 'try-days') return {days: TRY_DAYS, coat: set.coat};
    if (id === 'alone') return {days: set.days, coat: bestFor(job().jar)};
    if (id === 'try-free') return untested();
    return {days: set.days, coat: set.coat};
  }
  const settingKey = (jar, coat, days) => `${jar}/${coat}/${days}`;
  const testedNow = () => m.tested.has(settingKey(set.jar, set.coat, set.days));
  // The settings as they are if they are new; then a few that show the most; then any day not yet tested.
  function untested() {
    const fresh = s => !m.tested.has(settingKey(s.jar, s.coat, s.days));
    if (!testedNow()) return {jar: set.jar, coat: set.coat, days: set.days};
    const shows = [{jar: 'salt', coat: 'zinc', days: 22}, {jar: 'fresh', coat: 'bare', days: RUST_WEEK}, {jar: 'dry', coat: 'bare', days: RUST_WEEK}, {jar: 'fresh', coat: 'zinc', days: 22}];
    for (const s of shows) if (fresh(s)) return s;
    for (let days = MIN_DAYS; days <= FREE_MAX_DAYS; days++) if (fresh({jar: set.jar, coat: set.coat, days})) return {jar: set.jar, coat: set.coat, days};
    return {jar: set.jar, coat: set.coat, days: set.days};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-days') return `I will turn the dial to ${TRY_DAYS} days, and then you can answer the question.`;
    if (id === 'alone') return g.coat === set.coat ? `I will keep ${job().thing} ${g.coat === 'zinc' ? 'with its zinc coat' : 'bare'} and run the week.` : `I will ${g.coat === 'zinc' ? `give ${job().thing} a zinc coat` : `leave ${job().thing} bare`} and then run the week.`;
    if (id === 'try-free') return `I will test ${g.coat === 'zinc' ? 'a nail with a zinc coat' : 'a bare nail'} in ${jarWords(g.jar)} for ${dayWord(g.days)}.`;
    return 'I will run the days now.';
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
    if (kind === 'set' && value === 'best') {
      if (m.auto || !setting()) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'days') return turn(value, held === 'held');
    if (kind === 'coat') return flip(value);
    if (kind === 'jar') return pickJar(value);
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-days' && DAY_GUESSES[picked]) {
        m.guess = picked; runDays(TRY_DAYS);
        m.say = `You chose ${DAY_GUESSES[picked].label.toLowerCase()}. Watch the nail as the days run.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-zinc' && ZINC_GUESSES[picked]) {
        m.guess = picked; m.phase = 'ready';
        m.say = `You chose “${ZINC_GUESSES[picked].label.toLowerCase()}”. Press Space to run the calendar on to day ${ZINC_TO}, and watch the grey coat on the nail.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ one more day, ↓ one fewer, within the dial's range. A press clears the calendar, so the sums show the new setting at once.
  function turn(way, held) {
    if (!canDays() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.days, top = step().id === 'try-free' ? FREE_MAX_DAYS : MAX_DAYS;
    set.days = Math.max(MIN_DAYS, Math.min(top, before + (way === 'up' ? 1 : -1)));
    if (set.days === before) return held ? null : {kind: 'note', say: way === 'up' ? `${top} days is the top of the dial.` : `${MIN_DAYS} day is the bottom of the dial.`};
    m.lastPress = m.time; m.run = null;
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  // ← bare, → zinc coat.
  function flip(to) {
    if (!canCoat() || m.auto || !PROTECTIONS.includes(to)) return null;
    const thing = step().id === 'alone' ? job().name : 'The nail';
    if (set.coat === to) return {kind: 'note', say: to === 'zinc' ? `${thing} already has a zinc coat.` : `${thing} is already bare.`};
    set.coat = to; m.lastPress = m.time; m.run = null;
    return {kind: 'sound', sound: 'lab.clunk'};
  }
  // 1, 2 or 3: which jar the free test's nail sits in.
  function pickJar(to) {
    if (!canJar() || m.auto || !FREE_JARS.includes(to)) return null;
    if (set.jar === to) return {kind: 'note', say: `The nail is already in ${jarWords(to)}.`};
    set.jar = to; m.shelf = [to]; m.lastPress = m.time; m.run = null;
    return {kind: 'sound', sound: 'lab.tick'};
  }

  function go() {
    const id = step().id;
    if (wordOpen()) {
      runDays(set.days);
      m.say = `The calendar is running for ${dayWord(set.days)}. Watch the nails.`;
      return {kind: 'progress', say: m.say};
    }
    if (id === 'try-zinc' && m.phase === 'ready') {
      runDays(ZINC_TO);
      m.say = `The calendar is running on to day ${ZINC_TO}. Watch the grey coat first, and then the steel.`;
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-days') {
      if (set.days !== TRY_DAYS) return {kind: 'note', say: `This test runs for ${TRY_DAYS} days, so press ${set.days > TRY_DAYS ? '↓' : '↑'} until the dial reads ${TRY_DAYS}.`};
      m.phase = 'guess';
      m.say = `A bare nail will sit in salt water for ${TRY_DAYS} days. What percentage of the nail will have rusted by then? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    if (id === 'try-free') {
      runDays(set.days, 0, Math.min(DAY_S, FREE_RUN_S / set.days));
      m.say = 'Watch the nail as the days run.';
      return {kind: 'progress', say: m.say};
    }
    runDays(RUST_WEEK);
    m.say = `The week is running for ${job().thing}.`;
    return {kind: 'progress', say: m.say};
  }

  // The calendar has stopped and the nails have been read: judge.
  function judge() {
    const id = step().id, days = m.run.to, chosen = id === 'alone' || id === 'try-free';
    m.run = {...m.run, done: true};
    const rowOf = jar => {
      const coat = chosen ? set.coat : jar === 'zinc' ? 'zinc' : 'bare', r = chosen ? rustAfter(jar, coat, days) : jarAfter(jarOf(jar), days);
      return {jar, days, coat, rust: r.rust, left: r.zincLeft, label: id === 'try-free' ? `${jarOf(jar).name}, ${PROTECTION_NAME[coat].toLowerCase()}` : null};
    };
    if (id !== 'alone') m.rows = [...m.rows, ...m.shelf.map(rowOf)].slice(-6);
    if (id === 'wonder' || id === 'watch') { m.phase = 'done'; seen.add(id); return null; }
    if (id === 'word-rust') {
      m.phase = 'done'; seen.add(id);
      m.say = `After ${dayWord(days)} the nail in fresh water has ${pct(shareOf('fresh', days))} rust, because water and oxygen both reached the iron. The nail in dry air met oxygen but no water, so it has ${pct(shareOf('dry', days))} rust. In this game the rust grows by the same amount every day, which draws a straight line on the graph. Real rust is less regular than that, and real nails rust far more slowly, so this rule is a simplification that keeps the sums easy to follow. You can choose other days and run them, or press Enter to continue.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-salt') {
      m.phase = 'done'; seen.add(id);
      m.say = `After ${dayWord(days)} the nail in salt water has ${pct(shareOf('salt', days))} rust and the nail in fresh water has ${pct(shareOf('fresh', days))} rust, so the salt water has made ${TIMES} times as much rust. Salt water rusts the nail at ${pct(SALT_DAY)} a day and fresh water at ${pct(FRESH_DAY)} a day, because the salt helps the water carry electric charge.${MORE}You can choose other days and run them, or press Enter to continue.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-zinc') {
      m.phase = 'done'; seen.add(id);
      m.say = `After ${dayWord(days)} the bare nail has ${pct(shareOf('salt', days))} rust, but the nail with the zinc coat has ${pct(shareOf('zinc', days))} rust, and ${pct(coatOf('zinc', days))} of its coat is left. The zinc wears away first, and the steel under it stays free of rust. You can choose other days and run them, or press Enter to continue.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-days') {
      m.phase = 'done'; seen.add(id);
      const got = shareOf('salt', TRY_DAYS), right = m.guess === 1;
      m.say = right ? `Correct. The nail has ${pct(got)} rust, because ${pct(SALT_DAY)} a day for ${TRY_DAYS} days gives ${pct(got)}.`
        : m.guess === 0 ? `The nail has ${pct(got)} rust. You would get ${pct(FRESH_DAY * TRY_DAYS)} in fresh water at ${pct(FRESH_DAY)} a day, but salt water rusts the nail at ${pct(SALT_DAY)} a day, so ${TRY_DAYS} days give ${pct(got)}.`
          : `The nail has ${pct(got)} rust. It needed the whole week to reach ${pct(W('salt'))}, and the rust grows day by day, so ${TRY_DAYS} days give ${pct(got)}.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    if (id === 'try-zinc') {
      m.phase = 'done'; seen.add(id);
      const g = ZINC_GUESSES[m.guess]?.days, end = pct(shareOf('zinc', ZINC_TO));
      m.say = g === ZINC_DAYS ? `Correct. The coat lasted ${ZINC_DAYS} days. After that the bare steel rusted at ${pct(SALT_DAY)} a day, so the nail had ${end} rust by day ${ZINC_TO}.`
        : g === 10 ? `At 10 days, ${pct(coatOf('zinc', 10))} of the coat was still there, so the coat lasted longer than that. It lasted ${ZINC_DAYS} days, and then the steel rusted, reaching ${end} by day ${ZINC_TO}.`
          : `Zinc does wear away, and that is how the coat protects the steel. The coat lasted ${ZINC_DAYS} days, and then the steel rusted, reaching ${end} by day ${ZINC_TO}.`;
      return {kind: g === ZINC_DAYS ? 'right' : 'wrong', say: m.say};
    }
    if (id === 'try-free') {
      m.phase = 'set';
      m.tested.add(settingKey(set.jar, set.coat, days)); m.tries = m.tested.size;
      if (m.tries >= FREE_TRIES) seen.add(id);
      const r = rustAfter(set.jar, set.coat, days), name = set.coat === 'zinc' ? 'nail with a zinc coat' : 'bare nail';
      const coatTold = set.coat !== 'zinc' ? '' : r.zincLeft > 0 ? `, and ${pct(r.zincLeft)} of its coat is left` : ', and its coat has gone';
      const full = r.rust >= 1 ? ' The nail has rusted all the way through, so the rust stops at 100%.' : '';
      m.say = `After ${dayWord(days)} in ${jarWords(set.jar)}, the ${name} has ${pct(r.rust)} rust${coatTold}.${full} ${m.tries >= FREE_TRIES ? 'The table keeps your results. Press Enter when you have tested enough settings.' : 'Change the jar, the days or the protection and test a different setting.'}`;
      return {kind: 'right', say: m.say};
    }
    // Brian's job: clean enough, with no more protection than it needed?
    const thing = JOBS[m.job], rust = weekRust(thing.jar, set.coat), best = bestFor(thing.jar);
    m.rows = [...m.rows, {jar: thing.jar, days, coat: set.coat, rust, left: set.coat === 'zinc' ? rustAfter(thing.jar, 'zinc', days).zincLeft : null, job: thing.name}].slice(-6);
    m.phase = 'set';
    if (!clean(rust)) {
      m.say = `${thing.jar === 'fresh' ? 'Fresh water rusts steel slowly, but left' : 'Left'} bare, ${thing.thing} reaches ${pct(rust)} rust in a week. That is more than ${pct(RUST_OK)}, so it is not clean. Press → to give it a zinc coat, then press Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (set.coat !== best) {
      m.say = `${thing.name} stayed clean, but it would stay just as clean when bare, because a bare nail in ${jarWords(thing.jar)} has ${pct(weekRust(thing.jar, 'bare'))} rust after a week. Keep the zinc for places that water reaches. Press ← to leave it bare, then press Space.`;
      return {kind: 'fail', say: m.say};
    }
    m.job += 1;
    if (m.job >= JOBS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `With a zinc coat, ${thing.thing} has ${pct(rust)} rust after a week. Zinc protects the trailer and the gate, which water reaches, and the toolbox stays bare because it stays dry. That finishes the job.`;
      return {kind: 'pass', say: m.say};
    }
    startJob();
    const next = JOBS[m.job];
    m.say = m.job === 1 ? `Correct. The zinc coat keeps the trailer clean, with ${pct(rust)} rust against ${pct(weekRust(thing.jar, 'bare'))} if it were bare. The next thing is ${next.thing}, ${next.where}.`
      : `Correct. The toolbox stays clean when it is bare, with ${pct(rust)} rust, because no water reaches it. The next thing is ${next.thing}, ${next.where}.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (set.days !== a.days) { set.days += Math.sign(a.days - set.days); m.run = null; return null; }
      if (set.coat !== a.coat) { set.coat = a.coat; m.run = null; return null; }
      if (a.jar && set.jar !== a.jar) { set.jar = a.jar; m.shelf = [a.jar]; m.run = null; return null; }
      m.auto = null;
      return go();
    }
    const r = m.run;
    if (!r || r.done) return null;
    r.t += dt;
    if (r.t < 0) return null;
    r.day = Math.min(r.to, r.t / r.dayS);
    if (r.day < r.to) return null;
    r.held += dt;
    return r.held >= HOLD_S ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The shelf as the board draws it: each jar's nail at the calendar's day. The nail grows smoothly; its reading is the calendar's whole day.
  function shelf() {
    const d = day(), id = step().id, chosen = id === 'alone' || id === 'try-free', at = Math.floor(d + 1e-9);
    return m.shelf.map(jar => {
      const coat = chosen ? set.coat : jar === 'zinc' ? 'zinc' : 'bare';
      const r = rustAfter(jar, coat, d), now = rustAfter(jar, coat, at);
      const subject = id === 'alone' ? job().name : coat === 'zinc' ? `The nail with a zinc coat in ${jar === 'zinc' ? 'salt water' : jarWords(jar)}` : `The bare nail in ${jarWords(jar)}`;
      const rate = coat === 'zinc' ? (jarOf(jar).water ? `coat −${COAT_PER_DAY}% a day` : 'no wear') : `${whole(rateOf(jar))}% a day`;
      return {jar, name: id === 'alone' ? job().name : jarOf(jar).name, subject, rate, coat, rust: r.rust, left: r.zincLeft, shown: now.rust, shownLeft: now.zincLeft};
    });
  }

  function formulas(id) {
    const d = sumDays();
    if (id === 'word-rust') return [bareFormula('fresh', d), bareFormula('dry', d)];
    if (id === 'word-salt') return [bareFormula('fresh', d), bareFormula('salt', d), fasterFormula()];
    if (id === 'word-zinc') return [bareFormula('salt', d), coatFormula('salt', d), coatHolds()];
    if (id === 'watch') return [bareFormula('dry', d), bareFormula('fresh', d), bareFormula('salt', d), coatFormula('salt', d), coatHolds()];
    if (id === 'try-days') return [m.run ? bareFormula('salt', d) : openSum('salt', d)];
    if (id === 'try-zinc') return m.run ? [coatFormula('salt', d), underFormula('salt', d)] : [coatFormula('salt', RUST_WEEK), coatHolds()];
    if (id === 'try-free') return thingFormulas(set.jar, set.coat, d);
    if (id === 'alone') return [...thingFormulas(job().jar, set.coat, d), cleanFormula(m.run?.done ? weekRust(job().jar, set.coat) : null)];
    if (CHECKS[id]) return m.answered === null ? CHECKS[id].before() : CHECKS[id].after();
    if (id === 'recap') return [bareFormula('fresh', RUST_WEEK), bareFormula('salt', RUST_WEEK), coatFormula('salt', RUST_WEEK), underFormula('salt', 22), cleanFormula(RUST_OK)];
    return [];
  }

  function view() {
    const id = step().id;
    const passing = id !== 'wonder' && id !== 'watch' && (m.phase === 'running' || Boolean(m.auto) || (id === 'try-days' && m.phase === 'guess') || (id === 'try-zinc' && m.phase === 'ready'));
    const base = {scene: 'shelf', low: 'table', time: m.time, day: day(), dayTo: m.run?.to ?? null, running: Boolean(m.run && !m.run.done), shelf: m.shelf.length ? shelf() : [],
      dial: null, switch: null, jarPick: null, chart: false, rows: m.rows.map(r => ({...r})), job: null, focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id) && !passing, asking: false, formulas: formulas(id)};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, shelf: [],
        reveal: !answered ? null : id === 'check-five' ? {jar: 'salt', days: 5, rust: S5} : id === 'check-zinc' ? {jar: 'zinc', days: 22, rust: Z22, left: 0} : {soak: true},
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, shelf: [],
      say: `Iron rusts when water and oxygen both reach it, and salt water makes the rust form ${TIMES} times as fast, because salt helps the water carry electric charge. A zinc coat corrodes first and protects the steel under it. Now you can protect three parts of a car.`,
      prompt: 'Press Enter to start the challenge, in which you protect three parts of a car.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'shelf', sirena: true,
        say: done ? `The two nails are made of the same steel and sat for the same week, but the nail in the dry jar has ${pct(W('dry'))} rust and the nail in salt water has ${pct(W('salt'))} rust. What did the salt water do to the nail?`
          : `The Sirena is a car that lay wrecked on the sea floor for sixty years, and it came up crusted in rust, the flaky orange material that forms on iron.${MORE}To find out why, we will watch two nails made of steel, which is mostly iron, for a week, one in a dry jar and one in a jar of salt water. The number above each jar shows how much of its nail has rusted, given as a percentage, which means a number of parts out of every 100. So 50% rust means that 50 parts out of every 100 of the nail have turned to rust, which is half of the nail.`,
        prompt: done ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the nails.',
        hints: ['Watch the two nails.', 'One jar has water in it.', done ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    }
    if (isWord(id)) {
      const open = wordOpen(), ready = m.phase === 'ready', done = m.phase === 'done';
      const intro = {
        'word-rust': `Rust is the flaky orange material that forms when water and oxygen reach iron. Oxygen is a gas in the air, and some of it dissolves in water. Steel is made mostly of iron, which is why a steel nail can rust.${MORE}We measure how quickly a nail rusts by its rate, which is the percentage of the nail that rusts during one day. In fresh water the rate in this game is ${pct(FRESH_DAY)} a day, so the sum is rust = rate × days. Choose the number of days with ↑ and ↓, watch the sum change, then press Space to run the days.`,
        'word-salt': `Salt water is water with salt dissolved in it. Here are two nails, one in fresh water and one in salt water. Choose the days, then press Space.${MORE}Rusting works a little like a very slow battery. Tiny particles called electrons, which carry electric charge, pass from the iron to the oxygen, and electric charge must also travel through the water for the rusting to continue. When salt dissolves, it breaks up into charged particles, which carry electric charge through the water easily, so salt water carries charge far better than fresh water does, and the rust forms faster.`,
        'word-zinc': `A zinc coat is a thin layer of the metal zinc on the steel. Here are a bare nail and a nail with a zinc coat, both in salt water. Choose the days, then press Space.${MORE}To corrode means to be slowly eaten away by a chemical change, and rust is the name for the corrosion of iron. Zinc gives up its electrons more easily than iron does, so while the two metals touch in water, the zinc corrodes instead of the iron. Electrons from the zinc flow into the steel, and that protects the iron from rusting.`,
      }[id];
      return {...base, focus: 'shelf', low: {'word-rust': 'rust', 'word-salt': 'salt', 'word-zinc': 'coat'}[id], chart: true, dial: {days: set.days, locked: !open},
        ...(open ? {keys: {...DAY_KEYS, Space: 'go'}, repeat: ['↑', '↓'], buttons: [RUN]} : {}),
        ...(ready ? {waiting: true, target: 'go', glow: 'calendar'} : {}),
        say: done ? m.say : intro, prompt: ready ? 'Press ↑ or ↓ to choose the days, then press Space to run them, or click the calendar.' : done ? 'Press Enter to continue, or choose other days and press Space.' : 'Watch the nails.',
        hints: done ? DONE : ['The calendar on the wall counts the days.', 'Press Space to run the days.', 'Watch my pointer, which is on the calendar. I will run the days.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], focus: 'shelf',
        say: done ? `After a week the nail in dry air has ${pct(W('dry'))} rust, the nail in fresh water has ${pct(W('fresh'))} rust and the nail in salt water has ${pct(W('salt'))} rust. The nail with a zinc coat in salt water has ${pct(W('zinc'))} rust, and ${pct(coatOf('zinc', RUST_WEEK))} of its coat is left.${MORE}So rust needs water, salt makes the rust form faster, and zinc protects the steel while the coat lasts.`
          : 'Four steel nails will now sit in jars for a week. One is in dry air, one is in fresh water, one is in salt water, and one has a zinc coat and is in salt water. Watch the nails and the table.',
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the nails.',
        hints: ['Watch the orange rust grow on the nails.', 'Which jar rusts its nail fastest, and which does not rust its nail at all?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-days') {
      const setNow = setting() && !m.auto;
      const v = {...base, dial: {days: set.days, locked: !canDays()}, chart: true, noPreview: true, best: goal(),
        keys: setNow ? {...DAY_KEYS, Space: 'go'} : {}, repeat: setNow ? ['↑', '↓'] : [], buttons: setNow ? [TO_GUESS] : [], spaceSays: 'opens the question',
        target: !setNow ? null : set.days === TRY_DAYS ? 'go' : 'set:best', glow: setNow ? 'dial' : null, waiting: setNow || m.phase === 'guess'};
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, target: null, glow: null,
        cards: DAY_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'nail', rust: c.share}, state: null})),
        say: m.say, prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: [`Salt water rusted the nail by ${pct(W('salt'))} in ${RUST_WEEK} days.`, `That is ${pct(SALT_DAY)} a day.`, 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'running') return {...v, focus: 'shelf', say: m.say, prompt: 'Watch the nail.', hints: ['Watch the nail.', 'Count the days on the calendar.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'shelf', mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `Now you can use the sum yourself. A bare nail sits in salt water. Turn the day dial to ${TRY_DAYS} days and work out the sum beside the picture, then press Space to answer a question.`,
        prompt: `The dial reads ${dayWord(set.days)}. Press ↓ for fewer or ↑ for more, then press Space.`,
        hints: ['The day dial is on the right.', set.days === TRY_DAYS ? `The dial reads ${TRY_DAYS}, so press Space.` : `Press ${set.days > TRY_DAYS ? '↓' : '↑'} until the dial reads ${TRY_DAYS}, then press Space.`, 'Watch my pointer. I will turn the dial, and then you can answer the question.']};
    }
    if (id === 'try-zinc') {
      const v = {...base, low: 'coat', focus: 'shelf'};
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, waiting: true,
        cards: ZINC_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'nail', rust: 0, coat: c.days === null ? 1 : .5}, state: null})),
        say: `A week in salt water wore away ${pct(1 - coatOf('zinc', RUST_WEEK))} of the zinc coat. At that rate, when will the whole coat be gone?`,
        prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: [`The nail lost ${pct(1 - coatOf('zinc', RUST_WEEK))} of its coat in ${RUST_WEEK} days.`, 'How many weeks would it need to lose all of the coat?', 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'ready') return {...v, keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'calendar', buttons: [RUN], say: m.say,
        prompt: `Press Space to run the calendar on to day ${ZINC_TO}, or click the calendar.`, hints: ['Watch the grey coat on the nail.', 'Press Space to run the days.', 'Watch my pointer. I will run the days.']};
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the coat.', hints: ['Watch the coat become thinner.', 'What happens when the coat has gone?', 'Wait a moment.']};
      return {...v, mood: ZINC_GUESSES[m.guess]?.days === ZINC_DAYS ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    }
    if (id === 'try-free') {
      const setNow = setting() && !m.auto;
      const v = {...base, dial: {days: set.days, locked: !setNow}, switch: {coat: set.coat, locked: !setNow}, jarPick: {jar: set.jar, locked: !setNow}, best: goal(),
        keys: setNow ? {...DAY_KEYS, ...COAT_KEYS, ...JAR_KEYS, Space: 'go'} : {}, repeat: setNow ? ['↑', '↓'] : [], buttons: setNow ? [RUN] : [], target: !setNow ? null : testedNow() ? 'set:best' : 'go', glow: setNow ? 'set' : null, waiting: setNow && !seen.has(id)};
      if (m.phase === 'running') return {...v, focus: 'shelf', say: m.say, prompt: 'Watch the nail.', hints: ['Watch the nail.', 'Compare this result with the table.', 'Wait a moment.']};
      return {...v, say: m.auto ? autoSay() : m.say || `Now you can experiment. Press 1, 2 or 3 to choose the jar, ↑ and ↓ to choose the days, up to ${FREE_MAX_DAYS}, and ← and → to choose bare steel or a zinc coat. Test at least ${FREE_TRIES} different settings.${MORE}The sums beside the picture change as you change the settings, so you can work out the rust before you press Space. The table keeps your results so that you can compare them.`,
        prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the settings, then press Space to run the days. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Change at least one setting, then press Space to test it.', `Try a zinc coat for more than ${ZINC_DAYS} days, and see what happens after the coat has gone.`, 'Watch my pointer. I will test a setting that you have not tested yet.']};
    }
    // Brian's job.
    const setNow = setting() && !m.auto, at = Math.min(m.job, JOBS.length - 1), thing = JOBS[at], g = goal();
    const jv = {...base, low: 'job', switch: {coat: set.coat, locked: !canCoat()}, best: g,
      job: {n: at + 1, of: JOBS.length, name: thing.name, lives: thing.lives, jar: thing.jar, done: m.phase === 'done'},
      keys: setNow ? {...COAT_KEYS, Space: 'go'} : {}, buttons: setNow ? [RUN] : [],
      target: !setNow ? null : set.coat === g.coat ? 'go' : 'set:best', glow: setNow ? 'set' : null, waiting: setNow};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'running') return {...jv, focus: 'shelf', say: m.say, prompt: 'Watch the week.', hints: ['Watch the nail.', `Clean means ${pct(RUST_OK)} rust or less after a week.`, 'Wait a moment.']};
    const intro = `Here is a job for you. Three things stand in the yard, and each one must stay clean, which means that it has ${pct(RUST_OK)} rust or less after a week. Give each one the least protection that keeps it clean, because a zinc coat costs time and money to put on.${MORE}The first thing is ${thing.thing}, ${thing.where}.`;
    return {...jv,
      say: m.auto ? autoSay() : m.job === 0 && !m.say ? intro : m.say,
      prompt: `${thing.name} ${thing.where.replace('which ', '')}. ${set.coat === 'zinc' ? 'It has a zinc coat.' : 'It is bare.'} Press ← for bare or → for a zinc coat, then press Space to run the week.`,
      hints: [`${thing.name} is like the nail in ${jarWords(thing.jar)}. How much rust did a bare nail have there after a week?`,
        `A bare nail there has ${pct(weekRust(thing.jar, 'bare'))} rust after a week. ${clean(weekRust(thing.jar, 'bare')) ? 'That is clean, so leave it bare.' : `That is more than ${pct(RUST_OK)}, so it needs a zinc coat.`} Then press Space.`,
        'Watch my pointer. I will set the protection and run the week.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'rust', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Start the challenge'});
