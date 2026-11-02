// Ski wax as a classroom lesson (docs/board/cards/LAB-CLASSROOM-WAX.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every glide uses the ski rules' own friction on the bench's slope, and
// the snows, their temperature bands and the right wax for each are the ones the game's day draws (snowOfDay).
import {SNOWS, SNOW_DAYS, WAXES, FRICTION, glideAcceleration, glideSeconds, waxRunFacts} from '../benches/wax.js';

// The test strip, in metres; how long after both skis finish a run counts as over.
export const STRIP_M = 50;
const SETTLE_S = .8, WARM_STEP = 5;
export const COLD_C = SNOWS.powder.celsius;
export const s1 = seconds => `${seconds.toFixed(1)} s`;
const tidy = celsius => `${Math.round(celsius) || 0} °C`;
export const WAX_NAMES = Object.freeze({hard: 'Hard', medium: 'Medium', soft: 'Soft'});
// The friction a wax gives on a snow: the right one, the wrong one, or none.
export const frictionOf = (wax, snow) => wax == null ? FRICTION.none : SNOWS[snow].wax === wax ? FRICTION.right : FRICTION.wrong;
export const runSeconds = (wax, snow) => glideSeconds(frictionOf(wax, snow), STRIP_M);
// How far down the strip a ski is t seconds after it is let go.
export const metresAt = (wax, snow, t) => Math.min(STRIP_M, glideAcceleration(frictionOf(wax, snow)) * Math.max(0, t) ** 2 / 2);
// Each snow's band, as the ski menu shows it (whole degrees).
export const band = snow => {
  const {low, high} = SNOW_DAYS[snow];
  return snow === 'powder' ? `${Math.round(high)} °C and colder` : `${Math.round(low)} °C to ${Math.round(high)} °C`;
};
const why = snow => ({powder: 'Very cold snow has hard, sharp crystals: hard wax.', cold: 'Cool snow wants a medium wax.', wet: 'Wet snow near 0 °C sticks: soft wax.'})[snow];

// Brian's job: three days on the ski menu, in the game's own words (each inside the day's band).
export const DAYS = Object.freeze([{snow: 'powder', celsius: -13}, {snow: 'cold', celsius: -3}, {snow: 'wet', celsius: -1}].map(Object.freeze));
export const todayLine = day => `Today's snow: ${SNOWS[day.snow].name}, ${tidy(day.celsius)}`;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did one win?'},
  {id: 'word-wax', part: 1, title: 'Wax', word: 'wax-wax'},
  {id: 'word-glide', part: 1, title: 'Glide', word: 'wax-glide'},
  {id: 'word-crystals', part: 1, title: 'Snow crystals', word: 'wax-snow-crystals'},
  {id: 'watch', part: 2, title: 'Three snows, three waxes'},
  {id: 'try-cool', part: 3, title: 'Cool snow'},
  {id: 'try-wet', part: 3, title: 'Wet snow'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-cold', part: 5, title: 'Question 1 of 3'},
  {id: 'check-rule', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.wax.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'rule', text: 'The colder the snow, the harder the wax: hard for dry powder, medium for cool snow, soft for wet snow.'},
  {id: 'glide', text: 'The right wax glides faster than none. The wrong wax glides slower than none.'},
  {id: 'game', text: 'In the game, read today’s snow on the ski menu and pick the wax that suits it.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Hard wax for cold, soft wax for warm.',
  text: 'Read today’s snow on the ski menu, pick the wax that suits it, and finish the slalom.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'wax-wax', word: 'Wax', meaning: 'Wax is a thin coat on the ski’s base that helps it slide over snow.'},
  {id: 'wax-glide', word: 'Glide', meaning: 'Glide is how smoothly a ski slides over the snow.'},
  {id: 'wax-snow-crystals', word: 'Snow crystals', meaning: 'Snow crystals are tiny bits of ice: sharp and hard when cold, rounded and wet near 0 °C.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const PICK_KEYS = Object.freeze({1: 'pick:hard', 2: 'pick:medium', 3: 'pick:soft'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE_HINTS = Object.freeze(['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']);
const picking = (go, target) => ({keys: {...PICK_KEYS, ...(go ? {Space: 'go'} : {})}, waiting: true, target, glow: 'tins',
  buttons: go ? [{action: 'go', label: go, key: 'Space'}] : []});

// ---- the checks ----
const CHECKS = {
  'check-cold': {
    question: `${SNOWS.powder.celsius} °C dry powder: which wax?`,
    answers: WAXES.map(wax => ({label: `${WAX_NAMES[wax]} wax`, picture: {kind: 'tin', wax}})),
    correct: 0, snow: 'powder',
    right: () => 'Yes. Very cold snow has hard, sharp crystals: hard wax.',
    wrong: picked => `${WAX_NAMES[WAXES[picked]]} wax is for ${picked === 1 ? 'cool snow' : 'wet snow near 0 °C'}. Very cold snow has hard, sharp crystals: hard wax. Watch them race.`,
    race: picked => picked === 0 ? 'soft' : WAXES[picked],
    hints: ['Think of the sharp, cold crystals in the magnifier.', 'The colder the snow, the harder the wax.', 'Pick hard wax.'],
  },
  'check-rule': {
    question: 'The colder the snow, the ... the wax?',
    answers: [{label: 'Harder', picture: {kind: 'rule', way: 'harder'}}, {label: 'Softer', picture: {kind: 'rule', way: 'softer'}}, {label: 'It does not matter', picture: {kind: 'rule', way: 'same'}}],
    correct: 0, snow: null,
    right: () => 'Yes. Cold, sharp crystals need a hard wax; wet snow near 0 °C needs a soft one.',
    wrong: picked => picked === 1 ? 'The other way round: cold, sharp crystals need a hard wax, and wet snow near 0 °C a soft one.'
      : `It matters: the right wax took ${s1(runSeconds('hard', 'powder'))} on cold powder, the wrong one ${s1(runSeconds('soft', 'powder'))}. The colder the snow, the harder the wax.`,
    hints: ['Hard wax went on the coldest tray.', 'Cold snow: hard wax. Wet snow: soft wax.', 'Pick “Harder”.'],
  },
  'check-game': {
    question: 'In the game, how do you know which wax to pick?',
    answers: [{label: 'Today’s snow on the ski menu', picture: {kind: 'game', what: 'menu'}}, {label: 'The colour of the skis', picture: {kind: 'game', what: 'skis'}}, {label: 'The shop', picture: {kind: 'game', what: 'shop'}}],
    correct: 0, snow: null,
    right: () => 'Yes. The ski menu says today’s snow and its temperature: pick the wax that suits it.',
    wrong: picked => picked === 1 ? 'The colour of the skis is only paint: it does not tell you the snow. The ski menu says today’s snow and its temperature, like “Cool snow, -5 °C”.'
      : 'The shop sells the Wax kit, but it does not tell you today’s snow. The ski menu does, like “Cool snow, -5 °C”.',
    hints: ['Before the slalom, the ski menu tells you something about the snow.', 'It says “Today’s snow” and the temperature.', 'Pick “Today’s snow on the ski menu”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const lane = (wax, snow, label) => ({wax, snow, label, setAt: null, t: 0, done: false});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', strips: [], pick: null, celsius: COLD_C, warmed: false, day: 0, result: null, answered: null, say: '', autoStart: null, lastDone: null, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.strips = [{snow: 'powder', lanes: [lane('hard', 'powder', 'Hard wax'), lane('soft', 'powder', 'Soft wax')]}]; m.autoStart = .6; m.phase = 'running'; }
    if (id === 'word-wax') { m.phase = 'pick'; m.strips = [{snow: 'powder', lanes: [lane(null, 'powder', 'Your ski')]}]; }
    if (id === 'word-glide') { m.strips = [{snow: 'powder', lanes: [lane('hard', 'powder', 'Hard wax')]}]; }
    if (id === 'word-crystals') m.phase = 'warm';
    if (id === 'watch') {
      m.strips = [['powder', 'hard', 'soft'], ['cold', 'medium', 'hard'], ['wet', 'soft', 'hard']].map(([snow, right, wrong]) =>
        ({snow, lanes: [lane(right, snow, `${WAX_NAMES[right]} wax`), lane(wrong, snow, `${WAX_NAMES[wrong]} wax`)]}));
      m.autoStart = .6; m.phase = 'running';
    }
    if (id === 'try-cool' || id === 'try-wet') {
      const snow = id === 'try-cool' ? 'cold' : 'wet';
      m.phase = m.result ? 'result' : 'pick';
      m.strips = [{snow, lanes: [lane(m.pick, snow, 'Your ski'), lane(null, snow, 'No wax')]}];
    }
    if (id === 'alone') m.phase = m.day >= DAYS.length ? 'done' : 'pick';
    if (CHECKS[id]) {
      m.phase = m.answered === null ? 'ask' : 'answered';
      const snow = CHECKS[id].snow;
      const other = CHECKS[id].race && m.answered !== null ? CHECKS[id].race(m.answered) : 'soft';
      m.strips = snow ? [{snow, lanes: [lane('hard', snow, 'Hard wax'), lane(other, snow, `${WAX_NAMES[other]} wax`)]}] : [];
    }
  }
  const lanes = () => m.strips.flatMap(s => s.lanes);
  function letGo() { for (const l of lanes()) if (l.setAt == null) l.setAt = m.time; }
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
      letGo();
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (id === 'word-wax' && kind === 'pick' && m.phase !== 'running') {
      const wax = value === 'best' ? 'hard' : value;
      if (!WAXES.includes(wax)) return null;
      m.pick = wax; lanes()[0].wax = wax; m.phase = 'result'; seen.add(id);
      m.say = `That is ${wax} wax. It goes on the ski’s base as a thin coat, and the base turns its colour.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-glide') {
      if (kind !== 'go' || m.phase !== 'ready') return null;
      m.phase = 'running'; letGo();
      return {kind: 'progress', say: 'Watch the stopwatch: real seconds.'};
    }
    if (id === 'word-crystals') {
      if (m.phase !== 'warm' && m.phase !== 'result') return null;
      if (kind === 'warm' && value === 'best') { m.auto = true; return {kind: 'progress', say: 'Watch: I warm the tray to 0 °C.'}; }
      if (kind === 'warm') { m.celsius = Math.min(0, m.celsius + WARM_STEP); return warmed(); }
      if (kind === 'cool') { m.celsius = Math.max(COLD_C, m.celsius - WARM_STEP); return null; }
      return null;
    }
    if (id === 'try-cool' || id === 'try-wet') return tryAct(id, kind, value);
    if (id === 'alone') return jobAct(kind, value);
    return null;
  }
  function warmed() {
    if (m.celsius < 0 || m.warmed) return null;
    m.warmed = true; m.phase = 'result'; seen.add('word-crystals');
    m.say = `At ${SNOWS.wet.celsius} °C the crystals are rounded and wet. At ${COLD_C} °C they were sharp and hard.`;
    return {kind: 'right', say: m.say};
  }

  // The tries: pick a tin (and change it), Space races it against a plain ski with no wax.
  function tryAct(id, kind, value) {
    const snow = snowNow();
    if (m.phase === 'running') return null;
    if (kind === 'pick') {
      const wax = value === 'best' ? SNOWS[snow].wax : value;
      if (!WAXES.includes(wax)) return null;
      if (m.phase === 'result') m.strips = [{snow, lanes: [lane(wax, snow, 'Your ski'), lane(null, snow, 'No wax')]}];
      m.pick = wax; lanes()[0].wax = wax; m.phase = 'pick';
      if (value === 'best') return race();
      return null;
    }
    if (kind === 'go') {
      if (!m.pick) return {kind: 'note', say: 'Pick a tin first: press 1, 2 or 3.'};
      if (m.phase === 'result') m.strips = [{snow, lanes: [lane(m.pick, snow, 'Your ski'), lane(null, snow, 'No wax')]}];
      return race();
    }
    return null;
  }
  function race() { m.phase = 'running'; letGo(); return {kind: 'progress', say: `${WAX_NAMES[m.pick]} wax against no wax. Watch the stopwatches.`}; }

  function judgeTry(id) {
    const snow = snowNow(), right = SNOWS[snow].wax === m.pick, mine = runSeconds(m.pick, snow), plain = runSeconds(null, snow);
    m.phase = 'result'; seen.add(id); m.result = {right};
    if (right) m.say = `Right! ${WAX_NAMES[m.pick]} wax suits ${SNOWS[snow].name.toLowerCase()} at ${tidy(SNOWS[snow].celsius)}: ${s1(mine)}, faster than no wax, ${s1(plain)}.`;
    else m.say = `${WAX_NAMES[m.pick]} wax is for ${m.pick === 'hard' ? 'snow at -10 °C and colder' : m.pick === 'medium' ? 'cool snow, -9 °C to -2 °C' : 'wet snow, -1 °C or 0 °C'}: at ${tidy(SNOWS[snow].celsius)} it lost to no wax, ${s1(mine)} against ${s1(plain)}. ${SNOWS[snow].name} wants ${SNOWS[snow].wax} wax: press ${1 + WAXES.indexOf(SNOWS[snow].wax)}, then Space.`;
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
    if (!m.pick) return {kind: 'note', say: 'Pick a tin first: press 1, 2 or 3.'};
    if (SNOWS[day.snow].wax !== m.pick) {
      m.say = `${todayLine(day)}. ${SNOWS[day.snow].name} is ${band(day.snow)}, so it wants ${SNOWS[day.snow].wax} wax, not ${m.pick}. Pick again and press Space.`;
      return {kind: 'fail', say: m.say};
    }
    m.day += 1; m.pick = null;
    if (m.day >= DAYS.length) {
      m.phase = 'done'; seen.add('alone');
      const slalom = waxRunFacts().seconds;
      m.say = `Three days, three right waxes. On the slalom the right wax is about ${s1(slalom.wrong - slalom.right)} faster than the wrong one. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    const next = DAYS[m.day];
    m.say = `Right: ${SNOWS[day.snow].wax} wax. Next day. ${todayLine(next)}.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.autoStart != null && m.time >= m.autoStart) { m.autoStart = null; letGo(); }
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
    if (id === 'try-cool' || id === 'try-wet') return judgeTry(id);
    m.phase = 'done'; seen.add(id);
    if (id === 'word-glide') { m.say = `It glided ${STRIP_M} m in ${s1(runSeconds('hard', 'powder'))}. The stopwatch ran at real speed.`; return {kind: 'right', say: m.say}; }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') { enter(m.index); return null; }
    if (id === 'word-glide' && m.phase === 'done') { enter(m.index); m.phase = 'running'; letGo(); return null; }
    if ((id === 'try-cool' || id === 'try-wet') && m.phase === 'result') { const snow = snowNow(); m.strips = [{snow, lanes: [lane(m.pick, snow, 'Your ski'), lane(null, snow, 'No wax')]}]; return race(); }
    if (CHECKS[id] && m.phase === 'answered') { enter(m.index, {answered: m.answered}); letGo(); return null; }
    return null;
  }

  function view() {
    const id = step().id;
    // The tin Brian's pointer goes to: the wax that suits the snow on the board (hard, on the Wax step).
    const best = id === 'word-wax' ? 'hard' : id === 'alone' ? SNOWS[DAYS[Math.min(m.day, DAYS.length - 1)].snow].wax : m.strips[0] ? SNOWS[m.strips[0].snow].wax : null;
    const base = {scene: 'trays', time: m.time, celsius: m.celsius, pick: m.pick, best, tins: true, menu: null,
      strips: m.strips.map(s => {
        const fastest = Math.min(...s.lanes.map(l => runSeconds(l.wax, l.snow))), won = s.lanes.length > 1 && s.lanes.some(l => l.done && runSeconds(l.wax, l.snow) === fastest);
        return {snow: s.snow, name: SNOWS[s.snow].name, celsius: s.celsius ?? SNOWS[s.snow].celsius, lanes: s.lanes.map(l => ({...l, metres: metresAt(l.wax, l.snow, l.t), seconds: l.done ? runSeconds(l.wax, l.snow) : l.setAt == null ? null : l.t,
          winner: won && runSeconds(l.wax, l.snow) === fastest, behindM: won && runSeconds(l.wax, l.snow) > fastest ? STRIP_M - metresAt(l.wax, l.snow, fastest) : null}))};
      }),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), magnifier: false};
    if (id === 'wonder') return {...base, tins: false, actions: ['replay'],
      say: seen.has(id) ? `Same skis, same slope, same snow, ${COLD_C} °C dry powder. The hard-waxed ski glided past: ${s1(runSeconds('hard', 'powder'))} against ${s1(runSeconds('soft', 'powder'))}. Why?`
        : 'Same skis, same slope, same snow. Watch the two skis.',
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the two skis.',
      hints: ['Watch which ski is in front.', 'The only difference is the wax on their bases.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch until both stop, then press Enter.']};
    if (id === 'word-wax') {
      const done = m.phase === 'result';
      return {...base, ...(done ? {} : picking(null, 'pick:best')),
        say: done ? m.say : 'Wax is a thin coat on the ski’s base that helps it slide over snow. Here are three: hard, medium and soft.',
        prompt: done ? 'Press Enter to go on.' : 'Pick a tin: press 1, 2 or 3, or click it.',
        hints: done ? ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.'] : ['The three tins are on the bench.', 'Press 1, 2 or 3, or click a tin.', 'Watch my pointer: I pick the hard wax.']};
    }
    if (id === 'word-glide') {
      const ready = m.phase === 'ready';
      return {...base, tins: false, ...(ready ? {keys: {Space: 'go'}, buttons: [{action: 'go', label: 'Let go', key: 'Space'}], waiting: true, target: 'go', glow: 'ski'} : {}),
        actions: m.phase === 'done' ? ['replay'] : [],
        say: m.phase === 'done' ? m.say : m.phase === 'running' ? 'Watch the ski and the stopwatch: real seconds.' : `Glide is how smoothly a ski slides. The test strip is ${STRIP_M} m long, and the stopwatch times the ski down it.`,
        prompt: ready ? 'Press Space to let the ski go.' : m.phase === 'running' ? 'Watch the stopwatch.' : 'Press Enter to go on, or R to watch again.',
        hints: ready ? ['The ski waits at the top of the strip.', 'Press Space, or click the ski.', 'Watch my pointer: I let it go.'] : m.phase === 'running' ? ['Watch the ski.', 'Watch the stopwatch.', 'Wait a moment.'] : DONE_HINTS};
    }
    if (id === 'word-crystals') {
      const done = m.phase === 'result';
      return {...base, tins: false, magnifier: true, ...(done ? {} : {keys: {'→': 'warm', '←': 'cool'}, repeat: ['→', '←'], waiting: !m.auto, target: m.auto ? null : 'warm:best', glow: 'thermometer',
        buttons: m.auto ? [] : [{action: 'cool', label: 'Colder', key: '←'}, {action: 'warm', label: 'Warmer', key: '→'}]}),
        say: done ? m.say : m.auto ? 'Watch: I warm the tray to 0 °C.' : 'Snow crystals are tiny bits of ice. Look through the magnifier, then warm the tray up to 0 °C.',
        prompt: done ? 'Press Enter to go on.' : m.auto ? 'Watch the thermometer.' : 'Press → to warm the tray (or click the thermometer), until it reads 0 °C.',
        hints: done ? ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.'] : ['Watch the crystals in the magnifier.', 'Press → a few times, up to 0 °C.', 'Watch my pointer: I warm it.']};
    }
    if (id === 'watch') {
      const done = seen.has(id);
      return {...base, tins: false, actions: ['replay', 'slow'],
        say: done ? 'On every tray the wax that suits the snow won: hard on the coldest, medium in the middle, soft on the wet. The colder the snow, the harder the wax.'
          : 'Three trays: dry powder, cool snow and wet snow. On each, the wax that suits it races one that does not.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the three races.',
        hints: ['Watch which ski wins on each tray.', 'Hard wins on the coldest, soft on the wet.', 'Press R to watch again.']};
    }
    if (id === 'try-cool' || id === 'try-wet') {
      const snow = snowNow(), name = `${SNOWS[snow].name}, ${tidy(SNOWS[snow].celsius)}`;
      if (m.phase === 'pick') return {...base, ...picking('Race', 'pick:best'),
        say: `${name}. Pick the wax that suits it, then race it against a ski with no wax.`,
        prompt: m.pick ? `${WAX_NAMES[m.pick]} wax is on. Press Space to race, or pick another tin.` : 'Pick a tin (1, 2 or 3), then press Space to race.',
        hints: [snow === 'cold' ? 'Cool snow is in the middle: not the coldest, not wet.' : 'Wet snow is the warmest, near 0 °C.', `The colder the snow, the harder the wax. Press ${1 + WAXES.indexOf(SNOWS[snow].wax)}, then Space.`, 'Watch my pointer: I pick the wax and race it.']};
      if (m.phase === 'running') return {...base, say: `${WAX_NAMES[m.pick]} wax against no wax.`, prompt: 'Watch the stopwatches.', hints: ['Watch the two skis.', 'Which one is in front?', 'Wait a moment.']};
      return {...base, ...picking('Race again', null), waiting: false, actions: ['replay'], mood: m.result?.right ? 'cheer' : 'explain', say: m.say,
        prompt: m.result?.right ? 'Press Enter to go on, or R to watch again.' : 'Press Enter to go on, or pick a tin and press Space to race again.', hints: ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']};
    }
    if (id === 'alone') {
      const day = DAYS[Math.min(m.day, DAYS.length - 1)], menu = {line: todayLine(day), day: Math.min(m.day, DAYS.length - 1) + 1, of: DAYS.length};
      if (m.phase === 'done') return {...base, menu: {...menu, done: true}, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']};
      return {...base, menu, ...picking('Ski', 'pick:best'),
        say: m.day === 0 && !m.say ? `Your job: the ski menu, three days running. Read today’s snow and pick the wax that suits it. ${todayLine(day)}.` : m.say,
        prompt: m.pick ? `${WAX_NAMES[m.pick]} wax is on. Press Space to ski, or pick another tin.` : 'Read today’s snow, pick a tin (1, 2 or 3), then press Space.',
        hints: [`${SNOWS[day.snow].name} is ${band(day.snow)}.`, `The colder the snow, the harder the wax: ${SNOWS[day.snow].name.toLowerCase()} wants ${SNOWS[day.snow].wax} wax. Press ${1 + WAXES.indexOf(SNOWS[day.snow].wax)}, then Space.`, 'Watch my pointer: I pick it for you.']};
    }
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, tins: id === 'check-cold', rule: id === 'check-rule', ruleTins: answered, asking: !answered, menu: id === 'check-game' ? {line: todayLine({snow: 'cold', celsius: -5}), example: true} : null,
        keys: answered ? {} : ANSWER_KEYS, actions: answered && check.snow ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.'] : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'Very cold, dry snow has hard, sharp crystals, so it needs a hard wax. Cool snow wants a medium wax. Warm, wet snow needs a soft wax.',
      prompt: 'Enter takes you to the helicopter: take a ski drop, choose the slalom, and the wax for today’s snow.', hints: KEY_IDEAS.map(i => i.text)};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'wax', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
