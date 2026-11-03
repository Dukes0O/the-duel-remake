// Rust as a classroom lesson (docs/board/cards/LAB-CLASSROOM-RUST.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every rust share is the rust bench's own (jarAfter, the rule the challenge's
// rustOf uses); "clean" is the challenge's own line (RUST_OK). The challenge itself is the Lab's parts panel.
import {JARS, RUST, jarAfter} from '../benches/rust.js';
import {RUST_OK, RUST_WEEK} from '../lab-workshop.js';

// The calendar turns a day about every half second.
export const DAY_S = .45, HOLD_S = .8;
const HELD_GAP_S = .14;
export const MIN_DAYS = 1, MAX_DAYS = RUST_WEEK;
export const jarOf = id => JARS.find(j => j.id === id);
export const shareOf = (jarId, days) => jarAfter(jarOf(jarId), days).rust;
export const coatOf = (jarId, days) => jarAfter(jarOf(jarId), days).zincLeft;
export const pct = share => `${Math.round(share * 100)}%`;
export const PROTECTIONS = Object.freeze(['bare', 'zinc']);
export const PROTECTION_NAME = Object.freeze({bare: 'Bare', zinc: 'Zinc coat'});
// The jar a thing lives in, with or without a zinc coat: bare in salt water is the salt jar, zinc in salt water the zinc
// jar; zinc anywhere else is that jar with the coat on (the challenge's rustOf).
export const weekRust = (jarId, protection) => jarAfter({...jarOf(jarId), zinc: protection === 'zinc'}, RUST_WEEK).rust;
export const clean = share => share <= RUST_OK;
export const bestFor = jarId => clean(weekRust(jarId, 'bare')) ? 'bare' : 'zinc';

// Try 1 counts to this day; try 2 runs the zinc nail on to the last day.
export const TRY_DAYS = 3, ZINC_TO = 25;
// Brian's job: three things in the yard, each living in one of the bench's jars.
export const JOBS = Object.freeze([
  {name: 'The boat trailer', lives: 'Dunked in the sea at every launch.', jar: 'salt'},
  {name: 'The toolbox', lives: 'On the dry shelf in the shed.', jar: 'dry'},
  {name: 'The garden gate', lives: 'Out in the rain.', jar: 'fresh'},
].map(Object.freeze));

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Orange from the sea'},
  {id: 'word-rust', part: 1, title: 'Rust', word: 'rust-rust'},
  {id: 'word-salt', part: 1, title: 'Salt water', word: 'rust-salt-water'},
  {id: 'word-zinc', part: 1, title: 'Zinc coat', word: 'rust-zinc-coat'},
  {id: 'watch', part: 2, title: 'Four jars, one week', voice: 'lab.brian.rust.intro'},
  {id: 'try-days', part: 3, title: 'Three days'},
  {id: 'try-zinc', part: 3, title: 'How long the zinc lasts'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-five', part: 5, title: 'Question 1 of 3'},
  {id: 'check-zinc', part: 5, title: 'Question 2 of 3'},
  {id: 'check-sirena', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.rust.explain'},
].map(Object.freeze));

const W = id => shareOf(id, RUST_WEEK), FRESH_DAY = RUST.freshPerDay, SALT_DAY = RUST.saltPerDay;
const TIMES = Math.round(SALT_DAY / FRESH_DAY), ZINC_DAYS = RUST.zincLastDays;
export const KEY_IDEAS = Object.freeze([
  {id: 'water', text: `Iron rusts when water and air reach it. In a week a dry nail stays clean (${pct(W('dry'))}); one in fresh water gets ${pct(W('fresh'))}.`},
  {id: 'salt', text: `Salt water rusts ${TIMES} times as fast: ${pct(SALT_DAY)} a day, ${pct(W('salt'))} in a week.`},
  {id: 'zinc', text: `A zinc coat wears away first and saves the steel: ${ZINC_DAYS} days in salt water. The Galvanised finish is a zinc coat.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Zinc where water reaches; bare where it stays dry.',
  text: `Pick the protection for each part of the car. More than ${pct(RUST_OK)} rust after a week is not protected.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them (Paint included).
export const WORDS = Object.freeze([
  {id: 'rust-rust', word: 'Rust', meaning: 'Rust is iron turning flaky orange when water and air reach it.'},
  {id: 'rust-salt-water', word: 'Salt water', meaning: 'Salt water is water with salt in it, which makes iron rust faster.'},
  {id: 'rust-zinc-coat', word: 'Zinc coat', meaning: 'A zinc coat is a thin layer of zinc that wears away first to save the steel underneath.'},
  {id: 'rust-paint', word: 'Paint', meaning: 'Paint is a skin that keeps water and air out.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DAY_KEYS = Object.freeze({'↑': 'days:up', '↓': 'days:down'});
const COAT_KEYS = Object.freeze({'←': 'coat:bare', '→': 'coat:zinc'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const RUN = Object.freeze({action: 'go', label: 'Run the days', key: 'Space'});

const DAY_GUESSES = Object.freeze([[FRESH_DAY, 'like fresh water'], [SALT_DAY, `${pct(SALT_DAY)} a day`], [null, 'a whole week']].map(([perDay, why]) => {
  const share = perDay === null ? W('salt') : perDay * TRY_DAYS;
  return {share, label: `About ${pct(share)}: ${why}`};
}));
const ZINC_GUESSES = Object.freeze([{days: 10, label: 'About 10 days'}, {days: ZINC_DAYS, label: `About ${ZINC_DAYS} days`}, {days: null, label: 'Never: zinc does not wear away'}]);

const S5 = shareOf('salt', 5), Z22 = shareOf('zinc', 22);
const CHECKS = {
  'check-five': {
    question: 'A bare nail in salt water for 5 days. How rusty is it?',
    answers: [0.1, S5, 1].map(share => ({label: pct(share), picture: {kind: 'nail', rust: share}})),
    correct: 1,
    right: () => `Yes: ${pct(SALT_DAY)} a day for 5 days is ${pct(S5)}.`,
    wrong: picked => picked === 0 ? `More: salt water rusts ${pct(SALT_DAY)} a day, so 5 days is ${pct(S5)}. 10% is less than one day’s rust.`
      : `Not yet: it takes more than 8 days to rust right through. ${pct(SALT_DAY)} a day for 5 days is ${pct(S5)}.`,
    hints: [`Salt water: ${pct(SALT_DAY)} a day.`, `5 days of ${pct(SALT_DAY)}: what is that?`, `Pick ${pct(S5)}.`],
  },
  'check-zinc': {
    question: 'A zinc-coated nail in salt water for 22 days. What do you find?',
    answers: [{label: 'Clean, with zinc still on it', picture: {kind: 'nail', rust: 0, coat: .1}},
      {label: `The coat gone and the steel ${pct(Z22)} rusty`, picture: {kind: 'nail', rust: Z22, coat: 0}},
      {label: '100% rusty, like a bare nail', picture: {kind: 'nail', rust: 1, coat: 0}}],
    correct: 1,
    right: () => `Yes: the coat lasts ${ZINC_DAYS} days, then the steel gets 2 days of ${pct(SALT_DAY)}: ${pct(Z22)}.`,
    wrong: picked => picked === 0 ? `The coat lasts ${ZINC_DAYS} days: by day 22 it is gone, and the steel has had 2 days of ${pct(SALT_DAY)}: ${pct(Z22)}.`
      : `The zinc kept it clean for ${ZINC_DAYS} days; only 2 days of rust since: ${pct(Z22)}, not the bare nail’s 100%.`,
    hints: [`How long did the coat last in the try?`, `${ZINC_DAYS} days of zinc, then 2 days of ${pct(SALT_DAY)}.`, 'Pick the second card.'],
  },
  'check-sirena': {
    question: 'Before he restores the Sirena, Brian soaks her in fresh water for weeks. Why?',
    answers: [{label: 'To draw the salt out of her metal', picture: {kind: 'soak', what: 'salt'}},
      {label: 'To wash the rust off', picture: {kind: 'soak', what: 'wash'}},
      {label: 'Because fresh water stops rust', picture: {kind: 'soak', what: 'stop'}}],
    correct: 0,
    right: () => `Yes. Salt left in her metal keeps it rusting fast, ${pct(SALT_DAY)} a day against fresh water’s ${pct(FRESH_DAY)}. The soak draws it out.`,
    wrong: picked => picked === 1 ? `Rust is part of the metal now; water does not wash it off. The soak draws the salt out: salt rusts ${pct(SALT_DAY)} a day, fresh water ${pct(FRESH_DAY)}.`
      : `Fresh water still rusts steel, ${pct(W('fresh'))} in a week, but ${TIMES} times slower than salt. The soak draws the salt out.`,
    hints: ['Which jar rusted fastest?', 'Sixty years in the sea left salt in her metal.', 'Pick the first card.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  // The day dial and the switch carry from step to step, as the player left them.
  const set = {days: RUST_WEEK, coat: 'bare'};
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', run: null, shelf: [], rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1, job: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.shelf = ['dry', 'salt']; runDays(RUST_WEEK, .6); }
    if (id === 'word-rust') m.shelf = ['fresh'];
    if (id === 'word-salt') m.shelf = ['fresh', 'salt'];
    if (id === 'word-zinc') m.shelf = ['salt', 'zinc'];
    if (id === 'watch') { m.shelf = JARS.map(j => j.id); runDays(RUST_WEEK, .6); }
    if (id === 'try-days') { m.shelf = ['salt']; set.days = RUST_WEEK; m.phase = 'set'; }
    if (id === 'try-zinc') { m.shelf = ['zinc']; m.phase = 'guess'; }
    if (id === 'alone') startJob();
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  function startJob() { m.shelf = [JOBS[m.job].jar]; m.phase = 'set'; m.run = null; }
  // The calendar runs from day 0 to `to`; the shelf's nails rust as the bench says.
  function runDays(to, delay = 0) { m.run = {day: 0, to, t: -delay, held: 0}; m.phase = 'running'; }
  const day = () => m.run?.day ?? 0;
  const setting = () => ['try-days', 'alone'].includes(step().id) && m.phase === 'set';
  const canDays = () => setting() && step().id === 'try-days';
  const canCoat = () => setting() && step().id === 'alone';
  // What Show me sets and runs.
  function goal() {
    const id = step().id;
    if (id === 'try-days') return {days: TRY_DAYS, coat: set.coat};
    if (id === 'alone') return {days: set.days, coat: bestFor(JOBS[Math.min(m.job, JOBS.length - 1)].jar)};
    return {days: set.days, coat: set.coat};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-days') return `Watch: I turn the dial to ${TRY_DAYS} days. Then you guess.`;
    if (id === 'alone') return g.coat === set.coat ? `Watch: ${PROTECTION_NAME[g.coat].toLowerCase()}, then I run the week.` : `Watch: I switch to ${PROTECTION_NAME[g.coat].toLowerCase()}, then run the week.`;
    return 'Watch: I run the week.';
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
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-days' && DAY_GUESSES[picked]) {
        m.guess = picked; runDays(TRY_DAYS);
        m.say = `You said: ${DAY_GUESSES[picked].label.toLowerCase()}. Watch the nail.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-zinc' && ZINC_GUESSES[picked]) {
        m.guess = picked; m.phase = 'ready';
        m.say = `You said: ${ZINC_GUESSES[picked].label.toLowerCase()}. Press Space to run the days on to day ${ZINC_TO} and watch the grey coat.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ one more day, ↓ one fewer, between 1 and 7.
  function turn(way, held) {
    if (!canDays() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.days;
    set.days = Math.max(MIN_DAYS, Math.min(MAX_DAYS, before + (way === 'up' ? 1 : -1)));
    if (set.days === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_DAYS} days, a week, is the top of the dial.` : `${MIN_DAYS} day is the bottom of the dial.`};
    m.lastPress = m.time;
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  // ← bare, → zinc coat.
  function flip(to) {
    if (!canCoat() || m.auto || !PROTECTIONS.includes(to)) return null;
    if (set.coat === to) return {kind: 'note', say: to === 'zinc' ? 'It already has a zinc coat.' : 'It is already bare.'};
    set.coat = to; m.lastPress = m.time; m.run = null;
    return {kind: 'sound', sound: 'lab.clunk'};
  }

  function go() {
    const id = step().id;
    if (['word-rust', 'word-salt', 'word-zinc'].includes(id) && m.phase === 'ready') {
      runDays(RUST_WEEK);
      m.say = 'The week is running. Watch the nails.';
      return {kind: 'progress', say: m.say};
    }
    if (id === 'try-zinc' && m.phase === 'ready') {
      runDays(ZINC_TO);
      m.say = `Running on to day ${ZINC_TO}. Watch the grey coat, then the steel.`;
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-days') {
      if (set.days !== TRY_DAYS) return {kind: 'note', say: `This try is ${TRY_DAYS} days: press ↓ until the dial reads ${TRY_DAYS}.`};
      m.phase = 'guess';
      m.say = `A bare nail in salt water for ${TRY_DAYS} days. How rusty will it be? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    runDays(RUST_WEEK);
    m.say = `${JOBS[m.job].name}, ${PROTECTION_NAME[set.coat].toLowerCase()}: the week is running.`;
    return {kind: 'progress', say: m.say};
  }

  // The calendar has stopped and the nails have been read: judge.
  function judge() {
    const id = step().id, days = m.run.to;
    m.run = {...m.run, done: true};
    const rowOf = jar => ({jar, days, coat: id === 'alone' ? set.coat : jar === 'zinc' ? 'zinc' : 'bare',
      rust: id === 'alone' ? jarAfter({...jarOf(jar), zinc: set.coat === 'zinc'}, days).rust : shareOf(jar, days),
      left: id === 'alone' ? (set.coat === 'zinc' ? jarAfter({...jarOf(jar), zinc: true}, days).zincLeft : null) : coatOf(jar, days)});
    if (id !== 'alone') m.rows = [...m.rows, ...m.shelf.map(rowOf)].slice(-6);
    if (id === 'wonder' || id === 'watch') { m.phase = 'done'; seen.add(id); return null; }
    if (id === 'word-rust') {
      m.phase = 'done'; seen.add(id);
      m.say = `${pct(W('fresh'))} rust after a week: water and air reached the iron. The dry nail had air but no water: ${pct(W('dry'))}.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-salt') {
      m.phase = 'done'; seen.add(id);
      m.say = `${pct(W('salt'))} against ${pct(W('fresh'))}: ${TIMES} times as much. Salt water rusts ${pct(SALT_DAY)} a day, fresh water ${pct(FRESH_DAY)}.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-zinc') {
      m.phase = 'done'; seen.add(id);
      m.say = `Rust ${pct(W('zinc'))}, and ${pct(coatOf('zinc', RUST_WEEK))} of the coat is left. The zinc wears away first, and the steel under it stays clean.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-days') {
      m.phase = 'done'; seen.add(id);
      const got = shareOf('salt', TRY_DAYS), right = m.guess === 1;
      m.say = right ? `Right: ${pct(got)}. ${pct(SALT_DAY)} a day for ${TRY_DAYS} days.`
        : m.guess === 0 ? `It is ${pct(got)}. ${pct(FRESH_DAY)} a day is fresh water; salt water rusts ${pct(SALT_DAY)} a day, so ${TRY_DAYS} days is ${pct(got)}.`
          : `It is ${pct(got)}. ${pct(W('salt'))} took the whole week; rust grows day by day, so ${TRY_DAYS} days is ${pct(got)}.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    if (id === 'try-zinc') {
      m.phase = 'done'; seen.add(id);
      const g = ZINC_GUESSES[m.guess]?.days, end = pct(shareOf('zinc', ZINC_TO));
      m.say = g === ZINC_DAYS ? `Right: the coat lasted ${ZINC_DAYS} days. Then the bare steel rusted ${pct(SALT_DAY)} a day: ${end} by day ${ZINC_TO}.`
        : g === 10 ? `At 10 days half the coat was still there, ${pct(coatOf('zinc', 10))}. It lasted ${ZINC_DAYS} days; then the steel rusted: ${end} by day ${ZINC_TO}.`
          : `Wearing away is the zinc’s job: it went first, for ${ZINC_DAYS} days, and then the steel rusted: ${end} by day ${ZINC_TO}.`;
      return {kind: g === ZINC_DAYS ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job: clean enough, with no more protection than it needed?
    const job = JOBS[m.job], rust = weekRust(job.jar, set.coat), best = bestFor(job.jar);
    m.rows = [...m.rows, {jar: job.jar, days, coat: set.coat, rust, left: set.coat === 'zinc' ? jarAfter({...jarOf(job.jar), zinc: true}, days).zincLeft : null, job: job.name}].slice(-6);
    m.phase = 'set';
    if (!clean(rust)) {
      m.say = job.jar === 'fresh' ? `Fresh water is slow, ${pct(rust)} in a week, but that is more than ${pct(RUST_OK)}: not clean. Press → for zinc, then Space.`
        : `Bare in ${job.jar === 'salt' ? 'salt water' : 'water'}: ${pct(rust)} in a week. More than ${pct(RUST_OK)} is not clean: press → for zinc, then Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (set.coat !== best) {
      m.say = `It stayed clean, but so would bare: ${jarOf(job.jar).name.toLowerCase()} rusts it ${pct(weekRust(job.jar, 'bare'))}. Save the zinc for where water reaches: press ←, then Space.`;
      return {kind: 'fail', say: m.say};
    }
    m.job += 1;
    if (m.job >= JOBS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `The gate with zinc: ${pct(rust)}. Zinc for the trailer and the gate, where water reaches; the toolbox stays bare in the dry. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    startJob();
    const next = JOBS[m.job];
    m.say = m.job === 1 ? `Right: zinc keeps the trailer clean, ${pct(rust)} against ${pct(weekRust(job.jar, 'bare'))} bare. Next: ${next.name.toLowerCase()}, ${next.lives.toLowerCase()}`
      : `Right: the toolbox stays bare and clean, ${pct(rust)}: no water, no rust. Next: ${next.name.toLowerCase()}, ${next.lives.toLowerCase()}`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (set.days !== a.days) { set.days += Math.sign(a.days - set.days); return null; }
      if (set.coat !== a.coat) { set.coat = a.coat; m.run = null; return null; }
      m.auto = null;
      return go();
    }
    const r = m.run;
    if (!r || r.done) return null;
    r.t += dt;
    if (r.t < 0) return null;
    r.day = Math.min(r.to, r.t / DAY_S);
    if (r.day < r.to) return null;
    r.held += dt;
    return r.held >= HOLD_S ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The shelf as the board draws it: each jar's nail at the calendar's day.
  function shelf() {
    const d = day(), id = step().id;
    return m.shelf.map(jar => {
      const coat = id === 'alone' ? set.coat : jar === 'zinc' ? 'zinc' : 'bare';
      const r = jarAfter({...jarOf(jar), zinc: coat === 'zinc'}, d);
      return {jar, name: id === 'alone' ? JOBS[Math.min(m.job, JOBS.length - 1)].name : jarOf(jar).name, coat, rust: r.rust, left: r.zincLeft};
    });
  }

  function view() {
    const id = step().id;
    const base = {scene: 'shelf', low: 'table', time: m.time, day: day(), dayTo: m.run?.to ?? null, running: Boolean(m.run && !m.run.done), shelf: m.shelf.length ? shelf() : [],
      dial: null, switch: null, rows: m.rows.map(r => ({...r})), job: null, focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, shelf: [],
        reveal: !answered ? null : id === 'check-five' ? {jar: 'salt', days: 5, rust: S5} : id === 'check-zinc' ? {jar: 'zinc', days: 22, rust: Z22, left: 0} : {soak: true},
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, shelf: [],
      say: `Water and air make rust; salt water makes it ${TIMES} times as fast. A zinc coat wears away first and saves the steel. Now protect three parts of a car.`,
      prompt: 'Enter starts the challenge: protect three parts of a car.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'shelf', sirena: true,
        say: done ? `Same steel, same week: the dry nail is clean, ${pct(W('dry'))}; the one in salt water is ${pct(W('salt'))} rust. What did the water do?`
          : 'The Sirena lay on the sea floor for sixty years and came up crusted orange. Here are two steel nails: one in a dry jar, one in salt water. Watch a week.',
        prompt: done ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the nails.',
        hints: ['Watch the two nails.', 'One jar has water in it.', done ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    }
    if (['word-rust', 'word-salt', 'word-zinc'].includes(id)) {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      const intro = {'word-rust': 'Rust is iron turning flaky orange when water and air reach it. Here is a nail in fresh water: run a week.',
        'word-salt': 'Salt water is water with salt in it. The same nail in salt water, beside the fresh water one: run a week.',
        'word-zinc': 'A zinc coat is a thin layer of zinc on the steel. A bare nail and a coated nail, both in salt water: run a week.'}[id];
      return {...base, focus: 'shelf', low: id === 'word-zinc' ? 'coat' : 'calendar',
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'calendar', buttons: [RUN]} : {}),
        say: done ? m.say : intro, prompt: ready ? 'Press Space to run the week, or click the calendar.' : done ? 'Press Enter to go on.' : 'Watch the nails.',
        hints: done ? DONE : ['The calendar on the wall counts the days.', 'Press Space.', 'Watch my pointer: I run the week.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], focus: 'shelf',
        say: done ? `Dry ${pct(W('dry'))}, fresh water ${pct(W('fresh'))}, salt water ${pct(W('salt'))}, and the zinc-coated nail ${pct(W('zinc'))} with ${pct(coatOf('zinc', RUST_WEEK))} of its coat left.`
          : 'Four nails for a week: dry air, fresh water, salt water, and a zinc coat in salt water. Watch the nails and the table.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the nails.',
        hints: ['Watch the orange grow.', 'Which jar rusts fastest? Which not at all?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-days') {
      const setNow = setting() && !m.auto;
      const v = {...base, dial: {days: set.days, locked: !canDays()}, low: 'calendar', best: goal(),
        keys: setNow ? {...DAY_KEYS, Space: 'go'} : {}, repeat: setNow ? ['↑', '↓'] : [], buttons: setNow ? [RUN] : [],
        target: !setNow ? null : set.days === TRY_DAYS ? 'go' : 'set:best', glow: setNow ? 'dial' : null, waiting: setNow || m.phase === 'guess'};
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, target: null, glow: null,
        cards: DAY_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'nail', rust: c.share}, state: null})),
        say: m.say, prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`Salt water rusted ${pct(W('salt'))} in ${RUST_WEEK} days.`, `That is ${pct(SALT_DAY)} a day.`, 'Pick a card; any guess goes on.']};
      if (m.phase === 'running') return {...v, focus: 'shelf', say: m.say, prompt: 'Watch the nail.', hints: ['Watch the nail.', 'Count the days on the calendar.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'shelf', mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `A bare nail in salt water. The day dial reads ${set.days}: turn it to ${TRY_DAYS}, then run and guess.`,
        prompt: `${set.days} ${set.days === 1 ? 'day' : 'days'}. Press ↓ for fewer, ↑ for more, Space to run.`,
        hints: ['The day dial is on the right.', `Press ↓ until it reads ${TRY_DAYS}, then Space.`, 'Watch my pointer: I turn it.']};
    }
    if (id === 'try-zinc') {
      const v = {...base, low: 'coat', focus: 'shelf'};
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, waiting: true,
        cards: ZINC_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'nail', rust: 0, coat: c.days === null ? 1 : .5}, state: null})),
        say: `The zinc lost ${pct(1 - coatOf('zinc', RUST_WEEK))} of its coat in a week. When will it all be gone?`,
        prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`${pct(1 - coatOf('zinc', RUST_WEEK))} of the coat went in ${RUST_WEEK} days.`, 'How many weeks for all of it?', 'Pick a card; any guess goes on.']};
      if (m.phase === 'ready') return {...v, keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'calendar', buttons: [RUN], say: m.say,
        prompt: `Press Space to run on to day ${ZINC_TO}, or click the calendar.`, hints: ['Watch the grey coat on the nail.', 'Press Space.', 'Watch my pointer: I run the days.']};
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the coat.', hints: ['Watch the coat thin.', 'What happens when it is gone?', 'Wait a moment.']};
      return {...v, mood: ZINC_GUESSES[m.guess]?.days === ZINC_DAYS ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    }
    // Brian's job.
    const setNow = setting() && !m.auto, at = Math.min(m.job, JOBS.length - 1), job = JOBS[at], g = goal();
    const jv = {...base, low: 'job', switch: {coat: set.coat, locked: !canCoat()}, best: g,
      job: {n: at + 1, of: JOBS.length, name: job.name, lives: job.lives, jar: job.jar, done: m.phase === 'done'},
      keys: setNow ? {...COAT_KEYS, Space: 'go'} : {}, buttons: setNow ? [RUN] : [],
      target: !setNow ? null : set.coat === g.coat ? 'go' : 'set:best', glow: setNow ? 'set' : null, waiting: setNow};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'running') return {...jv, focus: 'shelf', say: m.say, prompt: 'Watch the week.', hints: ['Watch the nail.', `Clean is ${pct(RUST_OK)} or less.`, 'Wait a moment.']};
    const intro = `Brian’s job: three things in the yard. Give each the least protection that keeps it clean, ${pct(RUST_OK)} or less in a week, since zinc costs work. 1: ${job.name.toLowerCase()}, ${job.lives.toLowerCase()}`;
    return {...jv,
      say: m.auto ? autoSay() : m.job === 0 && !m.say ? intro : m.say,
      prompt: `${job.name}: ${job.lives} ${PROTECTION_NAME[set.coat]}. ← bare, → zinc coat, Space to run the week.`,
      hints: [`It lives in ${jarOf(job.jar).name.toLowerCase()}. How much did that rust a bare nail in a week?`,
        `Bare there: ${pct(weekRust(job.jar, 'bare'))}. ${clean(weekRust(job.jar, 'bare')) ? 'That is clean: leave it bare.' : `More than ${pct(RUST_OK)}: zinc.`} Then Space.`,
        'Watch my pointer: I set it and run the week.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'rust', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Start the challenge'});
