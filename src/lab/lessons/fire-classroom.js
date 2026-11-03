// Fire triangle as a classroom lesson (docs/board/cards/LAB-CLASSROOM-FIRE.md, "Claude's script").
// Teaching state only, no DOM and no saves. The fire pit is the fire bench's own run (its switches and what each
// tool takes away). The forest is the helicopter challenge's practice fire, its size, seed and start cell, spread,
// watered and coated by the game's own fire rules, with the game's 600-litre bucket.
import {fireBench, TAKES_AWAY, FIRE, RETARDANT, BUCKET, RETARDANT_LITRES, cellId, cellIJ, spreadStep, applyWater, applyRetardant} from '../benches/fire.js';
import {CHALLENGE_RULES} from '../lab-challenges.js';

// ---- the numbers ----
const RULE = CHALLENGE_RULES.fire;
export const COLS = RULE.columns, ROWS = RULE.rows, MIDDLE = Math.floor(ROWS / 2);
// The last column of forest is the road's edge (the challenge's roadColumn); the strip goes across the middle.
export const ROAD = COLS - 1, STRIP = 3;
export const BUCKET_L = BUCKET.litres, FLAT_OUT_L = FIRE.litresPerPoint, COAT_L = RETARDANT.litresPerCell, TANK_L = RETARDANT_LITRES;
export const litresFor = percent => Math.round(percent * FIRE.litresPerPoint / 100);
export const MINUTES = RULE.seconds / 60;
// Brian's job starts with the fire three spreads old; the strip and the coat with it one spread old.
export const JOB_HEAD_START = 3, TRY_HEAD_START = 1, TRY_SPREADS = 6;
// One bucket on one cell: the whole load lands inside it.
const DROP_RADIUS = 8;

export const SIDES = Object.freeze(['fuel', 'heat', 'air']);
export const SIDE_NAME = Object.freeze({fuel: 'Fuel', heat: 'Heat', air: 'Oxygen'});
export const SWITCH_NAME = Object.freeze({fuel: 'Wood', heat: 'Gas', air: 'Lid'});
export const litres = value => `${Math.round(value).toLocaleString('en-GB')} litres`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const cellWords = n => n === 1 ? 'one cell' : n === 2 ? 'two cells' : n === 3 ? 'three cells' : `${n} cells`;

// ---- the fire pit: the bench says whether it burns and which sides are gone ----
const PIT_RUNS = new Map();
function pitRun(p) {
  const settings = {heat: p.heat ? 'on' : 'off', fuel: p.fuel ? 'on' : 'off', air: p.air ? 'on' : 'off', putOut: p.putOut};
  const key = JSON.stringify(settings);
  if (!PIT_RUNS.has(key)) PIT_RUNS.set(key, fireBench.run(settings));
  return PIT_RUNS.get(key);
}
export const pitBurning = p => pitRun(p).burning;
export const pitMissing = p => pitRun(p).missing;
const CATCH_S = 1, DIE_S = 1.6, POUR_S = 1.1;
const pit = (on = {}) => ({fuel: true, heat: true, air: true, putOut: 'nothing', flame: 0, outAt: null, pour: null, ...on});
function burn(p, dt, time) {
  const want = pitBurning(p) ? 1 : 0, was = p.flame;
  p.flame = want > p.flame ? Math.min(1, p.flame + dt / CATCH_S) : Math.max(0, p.flame - dt / DIE_S);
  if (was > 0 && p.flame === 0) p.outAt = time;
  if (p.flame > 0) p.outAt = null;
}

// ---- the forest: the challenge's 6 by 3 cells, lit at the near end ----
export function forestGrid({raked = false} = {}) {
  const cells = new Map();
  for (let i = 0; i < COLS; i++) {
    if (raked && i === STRIP) continue;
    for (let j = 0; j < ROWS; j++) cells.set(cellId(i, j), {i, j, x: (i + .5) * FIRE.cell, y: 0, z: (j + .5) * FIRE.cell});
  }
  return {cells};
}
export const litFire = () => ({seed: RULE.seed, steps: 0, burning: [[cellId(0, MIDDLE), FIRE.startPercent]], burnt: [], damp: []});
export function grown(fire, grid, spreads) {
  for (let k = 0; k < spreads; k++) fire = spreadStep(fire, grid, null);
  return fire;
}
const columnOf = cell => cellIJ(cell)[0];
export const reachedRoad = fire => [...fire.burning.map(([cell]) => cell), ...fire.burnt].some(cell => columnOf(cell) >= ROAD);
export const front = fire => Math.max(-1, ...fire.burning.map(([cell]) => columnOf(cell)));
export function cellState(fz, i, j) {
  if (fz.raked && i === STRIP) return {state: 'raked'};
  const id = cellId(i, j), burning = new Map(fz.fire.burning);
  if (burning.has(id)) return {state: 'burning', percent: burning.get(id)};
  if (fz.fire.burnt.includes(id)) return {state: 'burnt'};
  if ((fz.fire.retardant ?? []).some(([cell, l]) => cell === id && l >= COAT_L)) return {state: 'coated'};
  if (fz.fire.damp.some(([cell]) => cell === id)) return {state: 'damp'};
  return {state: 'trees'};
}
// The cell to drop on first: the flames nearest the road, the hottest of those, the middle row on a tie.
export function frontCell(fire) {
  const by = [...fire.burning].map(([cell, percent]) => ({cell, percent, i: columnOf(cell), j: cellIJ(cell)[1]}));
  by.sort((a, b) => b.i - a.i || b.percent - a.percent || Math.abs(a.j - MIDDLE) - Math.abs(b.j - MIDDLE) || a.j - b.j);
  return by[0] ? [by[0].i, by[0].j] : null;
}
export const dropOn = (fire, grid, i, j) => applyWater(fire, grid, [{x: (i + .5) * FIRE.cell, z: (j + .5) * FIRE.cell, litres: BUCKET_L, radius: DROP_RADIUS}]);
export const coatStrip = (fire, grid) => applyRetardant(fire, grid, Array.from({length: ROWS}, (_, j) => ({x: (STRIP + .5) * FIRE.cell, z: (j + .5) * FIRE.cell, litres: COAT_L, radius: DROP_RADIUS})));
// How many spreads the try's fire takes to reach the road with no strip in its way.
export const OPEN_SPREADS = (() => {
  const grid = forestGrid();
  let fire = grown(litFire(), grid, TRY_HEAD_START), n = 0;
  while (!reachedRoad(fire) && n < 20) { fire = spreadStep(fire, grid, null); n++; }
  return n;
})();

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did the lid work?'},
  {id: 'word-fuel', part: 1, title: 'Fuel', word: 'fire-fuel'},
  {id: 'word-heat', part: 1, title: 'Heat', word: 'fire-heat'},
  {id: 'word-oxygen', part: 1, title: 'Oxygen', word: 'fire-oxygen'},
  {id: 'word-triangle', part: 1, title: 'Fire triangle', word: 'fire-fire-triangle'},
  {id: 'watch', part: 2, title: 'Three ways out', voice: 'lab.brian.fire.intro'},
  {id: 'try-water', part: 3, title: 'The water bucket'},
  {id: 'try-sand', part: 3, title: 'The sand bucket'},
  {id: 'try-strip', part: 3, title: 'A cleared strip'},
  {id: 'word-retardant', part: 3, title: 'Retardant', word: 'fire-retardant'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-lid', part: 5, title: 'Question 1 of 3'},
  {id: 'check-coat', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.fire.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'triangle', text: 'A fire needs heat, fuel and oxygen, all three together. Take away any one side and it goes out.'},
  {id: 'tools', text: 'Water takes the heat. Sand or a lid takes the oxygen. A cleared strip takes the fuel.'},
  {id: 'front', text: 'Fight a forest fire at its front: water on the flames nearest the road, retardant on the trees in front.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Take away heat, fuel or air.',
  text: `A practice fire burns by the home lake. Scoop water and drop it on the flames nearest the road. Keep it off the road for ${MINUTES} minutes, or put it out.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'fire-fuel', word: 'Fuel', meaning: 'Fuel is anything that can burn: wood, dry grass, whole trees.'},
  {id: 'fire-heat', word: 'Heat', meaning: 'Heat is what makes things hot enough to start burning.'},
  {id: 'fire-oxygen', word: 'Oxygen', meaning: 'Oxygen is the part of air a fire needs.'},
  {id: 'fire-fire-triangle', word: 'Fire triangle', meaning: 'The fire triangle: a fire needs heat, fuel and oxygen together. Take one away and it goes out.'},
  {id: 'fire-retardant', word: 'Retardant', meaning: 'Retardant is a coat sprayed on plants so they char instead of burning. It goes in front of a fire.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `answer:${i}`]));
const AIM_KEYS = Object.freeze({'←': 'aim:left', '→': 'aim:right', '↑': 'aim:up', '↓': 'aim:down', Space: 'drop'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
// The three guess cards for every try: which side will it take away?
const SIDE_CARDS = SIDES.map(side => ({id: side, label: SIDE_NAME[side], picture: {kind: 'side', side}}));

// ---- the guided tries: what each takes away, and why a wrong guess is wrong ----
const TRIES = {
  'try-water': {tool: 'water', takes: TAKES_AWAY.water,
    ask: 'Here is the water bucket. Which side of the triangle will water take away?',
    why: 'Water soaks up the heat as it turns to steam, and the wood is too cool to burn.',
    wrong: {fuel: 'The wood is still there, wet and black: the fuel was not taken.', air: 'The lid is open and air is all round the pit: the oxygen was not taken.'}},
  'try-sand': {tool: 'sand', takes: TAKES_AWAY.sand,
    ask: 'Now the sand bucket. Which side will sand take away?',
    why: 'The sand covers the wood, so no air can reach it, just as the lid did.',
    wrong: {heat: 'The gas is still on under the sand: the heat was not taken.', fuel: 'The wood is still there, under the sand: the fuel was not taken.'}},
  'try-strip': {tool: 'cleared strip', takes: TAKES_AWAY['cleared strip'],
    ask: 'A raked strip of bare ground. Which side will it take away?',
    why: 'There was nothing in the strip to burn, so the flames could not cross it.',
    wrong: {heat: 'The flames were just as hot when they reached the strip: the heat was not taken.', air: 'Air blows across the strip all the time: the oxygen was not taken.'}},
};

// ---- the checks ----
const SPOTS = {
  front: {label: 'On the trees in front of the flames'}, flames: {label: 'On the flames'}, behind: {label: 'On the burnt ground behind'},
};
const CHECKS = {
  'check-lid': {
    question: 'A pan of oil catches fire on a stove. A lid slid over the pan puts it out. Which side did the lid take away?',
    answers: SIDE_CARDS.map(c => ({label: c.label, picture: c.picture, side: c.id})),
    correct: SIDES.indexOf('air'),
    right: () => 'Yes: oxygen. The stove is still hot and the oil is still in the pan, but the lid shuts out the air, as it did on my pit.',
    wrong: picked => SIDES[picked] === 'heat' ? 'The stove is still hot under the pan: the heat is still there. The lid shuts out the air: oxygen.'
      : 'The oil is still in the pan under the lid: the fuel is still there. The lid shuts out the air: oxygen.',
    hints: ['Think of my lid on the fire pit.', 'Is the stove still hot? Is the oil still there? What can the lid keep out?', 'Pick “Oxygen”.'],
  },
  'check-coat': {
    question: 'You have the Retardant tank, and the fire is creeping toward the road. Where does the retardant go?',
    answers: [{label: SPOTS.front.label, picture: {kind: 'spot', what: 'coat', where: 'front'}},
      {label: SPOTS.flames.label, picture: {kind: 'spot', what: 'coat', where: 'flames'}}, {label: SPOTS.behind.label, picture: {kind: 'spot', what: 'coat', where: 'behind'}}],
    correct: 0,
    right: () => `Yes: in front, where the fire is going. Coated trees cannot catch. The tank’s ${litres(TANK_L)} coat ${TANK_L / COAT_L} cells of forest, ${litres(COAT_L)} each.`,
    wrong: picked => picked === 1 ? 'Retardant never puts out flames that are already burning: it only stops trees catching. So it goes in front, where the fire is going.'
      : 'Behind the flames the forest has burnt already: there is nothing left there to catch. It goes in front, where the fire is going.',
    hints: ['Think of the pink trees in the forest.', 'Retardant stops trees catching. Which trees are about to catch?', 'Pick “On the trees in front of the flames”.'],
  },
  'check-game': {
    question: `In the game you fly the ${BUCKET_L}-litre water bucket to the practice fire. Where does the first load go?`,
    answers: [{label: 'On the flames nearest the road', picture: {kind: 'spot', what: 'water', where: 'flames'}},
      {label: 'On the green trees ahead', picture: {kind: 'spot', what: 'water', where: 'front'}}, {label: 'On the flames at the back, where it started', picture: {kind: 'spot', what: 'water', where: 'back'}}],
    correct: 0,
    right: () => `Yes. A cell burning flat out takes ${litres(FLAT_OUT_L)} to put out, so one full bucket puts out up to ${Math.floor(BUCKET_L / FLAT_OUT_L)}: start with the ones nearest the road.`,
    wrong: picked => picked === 1 ? `Water on trees that are not burning only makes them damp, slower to catch for ${FIRE.dampSteps} spreads, and the flames keep burning and keep coming. Drop on the flames nearest the road.`
      : 'The flames at the back are furthest from the road. While you put them out, the front reaches the road, as in my job. Drop on the flames nearest the road.',
    hints: ['Think of my job in the forest.', 'Which flames will reach the road first?', 'Pick “On the flames nearest the road”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), said = {};
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'set', pit: null, fz: null, guess: null, answered: null, result: null, say: '', doneAt: null, rows: [], lostAt: null};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.pit = pit({flame: 1}); m.phase = 'running'; }
    if (id === 'word-fuel') m.pit = pit({fuel: false, heat: false});
    if (id === 'word-heat') m.pit = pit({heat: false});
    if (id === 'word-oxygen') m.pit = pit({flame: 1});
    if (id === 'word-triangle') m.pit = pit({air: false});
    if (id === 'watch') { m.pit = pit({flame: 1}); m.phase = 'running'; }
    if (id === 'try-water' || id === 'try-sand') { m.pit = pit({flame: 1}); m.phase = 'guess'; }
    if (id === 'try-strip') { const grid = forestGrid(); m.fz = {grid, fire: grown(litFire(), grid, TRY_HEAD_START), raked: false}; m.phase = 'setup'; }
    if (id === 'word-retardant') { const grid = forestGrid(); m.fz = {grid, fire: grown(litFire(), grid, TRY_HEAD_START), raked: false}; }
    if (id === 'alone') startJob();
    if (CHECKS[id]) m.phase = 'ask';
    // A word step done before, visited again with Previous step: it shows what it found.
    if (said[id]) {
      m.say = said[id]; m.phase = 'done';
      if (id === 'word-fuel') m.pit.fuel = true;
      if (id === 'word-heat') { m.pit.heat = true; m.pit.flame = 1; }
      if (id === 'word-oxygen') { m.pit.air = false; m.pit.flame = 0; }
      if (id === 'word-triangle') { m.pit.air = true; m.pit.flame = 1; }
      if (id === 'word-retardant') { m.fz.fire = grown(coatStrip(m.fz.fire, m.fz.grid).fire, m.fz.grid, TRY_SPREADS); }
    }
  }

  function startJob() {
    const grid = forestGrid();
    m.fz = {grid, fire: grown(litFire(), grid, JOB_HEAD_START), raked: false, aim: [0, MIDDLE], trips: 0, splash: null, spreadAt: null};
    m.phase = 'set';
  }

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
    if (m.phase !== 'set' && !TRIES[id] && id !== 'alone') return null;
    const p = m.pit;
    if (id === 'word-fuel' && action === 'wood:in') { p.fuel = true; return finishWord(id, 'Wood in: that is fuel. But it does not burn on its own. It needs heat.', 'lab.clunk'); }
    if (id === 'word-heat' && action === 'gas:on') { p.heat = true; m.phase = 'running'; return {kind: 'progress', sound: 'lab.burner', say: 'Gas on. Watch the wood.'}; }
    if (id === 'word-oxygen' && action === 'lid:shut') { p.air = false; m.phase = 'running'; return {kind: 'progress', sound: 'lab.clunk', say: 'Lid shut. Watch the flames.'}; }
    if (id === 'word-triangle' && action === 'lid:open') { p.air = true; m.phase = 'running'; return {kind: 'progress', sound: 'lab.clunk', say: 'Lid open, and the air comes back in.'}; }
    if (id === 'word-retardant' && action === 'coat') {
      m.fz.fire = coatStrip(m.fz.fire, m.fz.grid).fire; m.phase = 'running'; spreads(TRY_SPREADS);
      return {kind: 'progress', sound: 'lab.fizz', say: 'The trees in front are coated pink. Now watch the flames.'};
    }
    if (TRIES[id]) return tryAct(id, kind, value);
    if (id === 'alone') return jobAct(kind, value, extra);
    return null;
  }
  function finishWord(id, say, sound) {
    m.phase = 'done'; seen.add(id); said[id] = m.say = say;
    return {kind: 'right', sound, say};
  }
  // The forest spreads once every so often while a run is going.
  const SPREAD_S = .7;
  function spreads(n) { m.fz.left = n; m.fz.spreadAt = m.time + .5; }
  function spreadTick() {
    const fz = m.fz;
    if (!fz?.left || m.time < fz.spreadAt) return false;
    fz.fire = spreadStep(fz.fire, fz.grid, null); fz.left -= 1; fz.spreadAt = m.time + SPREAD_S;
    return true;
  }

  function tryAct(id, kind, value) {
    const t = TRIES[id];
    if (m.phase === 'setup') {
      if (kind !== 'rake') return null;
      m.fz.grid = forestGrid({raked: true}); m.fz.raked = true; m.phase = 'guess';
      return {kind: 'progress', sound: 'lab.clunk', say: 'Raked: a strip of bare ground right across the forest, in front of the flames.'};
    }
    if (m.phase === 'guess') {
      const pick = SIDE_CARDS[Number(value)];
      if (kind !== 'answer' || !pick) return null;
      m.guess = pick.id; m.phase = 'tool';
      return {kind: 'progress', say: id === 'try-strip' ? 'Now let it burn: press Space.' : `Now tip the ${t.tool} bucket on the fire: press Space.`};
    }
    if (m.phase !== 'tool') return null;
    if (id === 'try-strip' && kind === 'burn') { m.phase = 'running'; spreads(TRY_SPREADS); return {kind: 'progress', say: 'Watch the flames reach the strip.'}; }
    if (id !== 'try-strip' && kind === 'tip') {
      m.phase = 'running'; m.pit.pour = {tool: t.tool, at: m.time};
      return {kind: 'progress', sound: t.tool === 'water' ? 'lab.splash' : 'lab.clunk', say: `The ${t.tool} goes on. Watch the fire and the triangle.`};
    }
    return null;
  }

  // Brian's job: one bucket a trip on the cell the player picks; the fire spreads once while the helicopter flies back.
  function jobAct(kind, value, extra) {
    const fz = m.fz;
    if (m.phase !== 'set') return null;
    if (kind === 'aim') {
      const [di, dj] = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}[value] ?? [0, 0];
      const i = Math.max(0, Math.min(COLS - 1, fz.aim[0] + di)), j = Math.max(0, Math.min(ROWS - 1, fz.aim[1] + dj));
      if (i === fz.aim[0] && j === fz.aim[1]) return null;
      fz.aim = [i, j]; return {kind: 'sound', sound: 'lab.tick'};
    }
    if (kind !== 'drop') return null;
    if (value !== undefined) {
      const i = Number(value), j = Number(extra);
      if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || i >= COLS || j < 0 || j >= ROWS) return null;
      fz.aim = [i, j];
    }
    const [i, j] = fz.aim, before = cellState(fz, i, j);
    const r = dropOn(fz.fire, fz.grid, i, j);
    fz.fire = r.fire; fz.trips += 1; fz.splash = {i, j, at: m.time};
    const left = fz.fire.burning.length;
    if (!left) {
      m.phase = 'done'; seen.add('alone');
      m.say = `Out! ${fz.trips} trips, and the fire never reached the road. You put out the flames nearest the road first, each time.`;
      return {kind: 'pass', sound: 'lab.splash', say: m.say};
    }
    m.phase = 'running'; fz.spreadAt = m.time + 1;
    if (before.state === 'burning') m.say = r.cellsOut ? `Splash: ${cellWords(r.cellsOut)} out. Small flames take less water; a cell burning flat out takes ${litres(FLAT_OUT_L)}. ${cap(cellWords(left))} still burning.`
      : `Splash: the flames there are lower, but still burning.`;
    else if (before.state === 'burnt') m.say = 'That cell has burnt out already: no heat left to take, so the water did nothing.';
    else m.say = `Those trees are damp now, slower to catch for ${FIRE.dampSteps} spreads. But the flames are still burning.`;
    return {kind: before.state === 'burning' ? 'progress' : 'note', sound: 'lab.splash', say: m.say};
  }
  function jobTick() {
    const fz = m.fz;
    if (m.phase === 'lost' && m.time - m.lostAt >= 2.6) { startJob(); return {kind: 'note', say: 'The job starts again. Aim at the flames nearest the road: ← → ↑ ↓, then Space.'}; }
    if (m.phase !== 'running' || m.time < fz.spreadAt) return null;
    fz.fire = spreadStep(fz.fire, fz.grid, null);
    if (reachedRoad(fz.fire)) {
      m.phase = 'lost'; m.lostAt = m.time;
      return {kind: 'fail', say: 'The fire reached the road. The flames at the front kept spreading while the water fell behind them. Drop on the flames nearest the road first.'};
    }
    m.phase = 'set';
    return {kind: 'note', say: `${m.say} It spread once while you flew back for more water.`};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id, p = m.pit;
    if (id === 'wonder') return wonder(dt);
    if (id === 'watch') return watch(dt);
    if (p) burn(p, dt, m.time);
    if (id === 'word-heat' && m.phase === 'running' && p.flame >= 1) {
      if (m.doneAt == null) m.doneAt = m.time + .5;
      if (m.time >= m.doneAt) return finishWord(id, 'Gas on: heat. The wood is hot enough to burn now, with air all round it.');
    }
    if (id === 'word-oxygen' && m.phase === 'running' && p.flame <= 0 && m.time - p.outAt >= .4)
      return finishWord(id, 'Lid shut: no fresh air, so no oxygen. The fire went out, though the gas is on and the wood is there. That is why my lid worked.');
    if (id === 'word-triangle' && m.phase === 'running' && p.flame >= 1) {
      if (m.doneAt == null) m.doneAt = m.time + .5;
      if (m.time >= m.doneAt) return finishWord(id, 'Heat, fuel and oxygen, all three together: it burns. Take away any one side and it goes out.');
    }
    if ((id === 'try-water' || id === 'try-sand') && m.phase === 'running') {
      if (m.time - p.pour.at >= POUR_S / 2) p.putOut = TRIES[id].tool;
      if (p.flame <= 0 && m.time - p.outAt >= .5) return finishTry(id);
    }
    if (id === 'word-retardant' && m.phase === 'running') {
      spreadTick();
      if (!m.fz.left && m.time >= m.fz.spreadAt)
        return finishWord(id, `The flames reached the pink trees and stopped: coated trees cannot catch. Retardant never puts out flames already burning, so it goes in front, where the fire is going.`, 'lab.tick');
    }
    if (id === 'try-strip' && m.phase === 'running') {
      spreadTick();
      if (!m.fz.left && m.time >= m.fz.spreadAt) return finishTry(id);
    }
    if (id === 'alone') return jobTick();
    return null;
  }

  function finishTry(id) {
    const t = TRIES[id], right = m.guess === t.takes;
    m.phase = 'result'; seen.add(id);
    m.result = {actual: t.takes, right};
    const extra = id === 'try-strip' ? ` With no strip, this fire reaches the road in ${OPEN_SPREADS} spreads.` : '';
    m.say = right ? `Right: ${SIDE_NAME[t.takes].toLowerCase()}. ${t.why}${extra}` : `It took the ${SIDE_NAME[t.takes].toLowerCase()}. ${t.wrong[m.guess]} ${t.why}${extra}`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // The wonder: the pit roars, the lid slams shut and the flames die.
  const SLAM_AT = 1.6;
  function wonder(dt) {
    const p = m.pit;
    if (m.time >= SLAM_AT) p.air = false;
    burn(p, dt, m.time);
    if (m.time >= SLAM_AT + DIE_S + 1 && !seen.has('wonder')) seen.add('wonder');
    return null;
  }
  // The watch: one side at a time, gas off, wood out, lid shut, lighting it again between; a row for each.
  const WATCH = [{side: 'heat', off: .8, on: 3.4}, {side: 'fuel', off: 4.8, on: 7.4}, {side: 'air', off: 8.8, on: null}];
  const WATCH_END = 11.4;
  function watch(dt) {
    const t = m.time, p = m.pit;
    for (const [k, w] of WATCH.entries()) {
      const off = t >= w.off && (w.on === null || t < w.on);
      p[w.side] = !off;
      if (t >= w.off + DIE_S + .3 && !m.rows[k]) m.rows[k] = {side: w.side};
    }
    burn(p, dt, t);
    if (t >= WATCH_END && m.phase !== 'done') { seen.add('watch'); m.phase = 'done'; }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  const drawnPit = p => p && ({fuel: p.fuel, heat: p.heat, air: p.air, putOut: p.putOut, flame: p.flame, burning: pitBurning(p), missing: pitMissing(p),
    smoke: p.outAt != null && m.time - p.outAt < 3.5 ? m.time - p.outAt : null, pour: p.pour ? {tool: p.pour.tool, age: m.time - p.pour.at} : null});
  const drawnForest = fz => fz && ({cells: Array.from({length: COLS * ROWS}, (_, k) => ({i: k % COLS, j: Math.floor(k / COLS), ...cellState(fz, k % COLS, Math.floor(k / COLS))})),
    raked: fz.raked, aim: fz.aim ?? null, trips: fz.trips ?? 0, burning: fz.fire.burning.length, front: front(fz.fire), road: reachedRoad(fz.fire),
    coated: (fz.fire.retardant ?? []).length > 0, splash: fz.splash ? {...fz.splash, age: m.time - fz.splash.at} : null});

  function view() {
    const id = step().id;
    const base = {scene: m.fz ? 'forest' : 'pit', time: m.time, pit: drawnPit(m.pit), forest: drawnForest(m.fz), keys: {}, repeat: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), plates: true, triangle: true, tools: null, table: null, job: null};
    if (id === 'wonder') return {...base, scene: 'wonder', plates: false, triangle: false, actions: ['replay'],
      say: seen.has(id) ? 'My pit was roaring. I shut the lid, no water at all, and the flames died. Why did that work?' : 'Brian’s fire pit, roaring away. Watch what he does.',
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the fire pit.',
      hints: ['Watch the lid.', 'No water, no sand. Only the lid moved.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    if (id === 'word-fuel') return wordView(base, id, {1: 'wood:in'}, 'wood:in',
      'Fuel is anything that can burn: wood, dry grass, whole trees. The pit is empty. Put the wood in.', 'Press 1, or click the Wood switch.',
      ['The switches are under the pit.', 'Press 1: Wood.', 'Watch my pointer: it is on the Wood switch.']);
    if (id === 'word-heat') return wordView(base, id, {2: 'gas:on'}, 'gas:on',
      'Heat is what makes things hot enough to burn. Light the gas under the wood.', 'Press 2, or click the Gas switch.',
      ['The Gas switch is under the pit.', 'Press 2: Gas.', 'Watch my pointer: it is on the Gas switch.']);
    if (id === 'word-oxygen') return wordView(base, id, {3: 'lid:shut'}, 'lid:shut',
      'Oxygen is the part of air a fire needs. The open lid lets air in. Shut the lid.', 'Press 3, or click the Lid switch.',
      ['The Lid switch is under the pit.', 'Press 3: Lid.', 'Watch my pointer: it is on the Lid switch.']);
    if (id === 'word-triangle') return wordView(base, id, {3: 'lid:open'}, 'lid:open',
      'The fire triangle: a fire needs heat, fuel and oxygen together, one side each. The gas and the wood are there. Open the lid again.', 'Press 3, or click the Lid switch.',
      ['Look at the triangle on the right: one side is missing.', 'Press 3: the lid opens.', 'Watch my pointer: it is on the Lid switch.']);
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], table: WATCH.map((w, k) => m.rows[k] ?? null),
        say: done ? 'Gas off took the heat. Wood out took the fuel. The lid took the oxygen. Each time one side went, the fire died.'
          : 'Three switches: gas for heat, wood for fuel, and the lid for air. I take away one side at a time.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the switches and the triangle.',
        hints: ['Watch which switch goes off.', 'And which side of the triangle goes dark.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'word-retardant') {
      const done = m.phase === 'done', set = m.phase === 'set';
      return {...base, plates: false, triangle: false, keys: set ? {Space: 'coat'} : {}, waiting: set, target: set ? 'coat' : null, glow: set ? 'coat' : null, tool: 'coat',
        say: done ? m.say : 'Retardant is a coat sprayed on plants so they char instead of burning. Coat the trees in front of the flames.',
        prompt: done ? 'Press Enter to go on.' : set ? 'Press Space, or click the spray over the trees.' : 'Watch the flames.',
        hints: done ? DONE : ['The spray is over the column of trees in front of the flames.', 'Press Space.', 'Watch my pointer: it is on the spray.']};
    }
    if (TRIES[id]) return tryView(id, base);
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: 'check', plates: false, keys: answered ? {} : PICK_KEYS(3), waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        check: id, answered,
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', plates: false, ready: true, ideas: KEY_IDEAS,
      say: 'Fire needs heat, fuel and air. Take away any one and it dies. Water takes the heat, a lid or sand takes the air, a cleared strip takes the fuel. Fight a forest fire at its front.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function wordView(base, id, keys, target, ask, prompt, hints) {
    const done = m.phase === 'done', set = m.phase === 'set';
    return {...base, keys: set ? keys : {}, waiting: set, target: set ? target : null, glow: set ? target : null,
      say: done ? m.say : m.phase === 'running' ? ({'word-heat': 'Gas on. Watch the wood.', 'word-oxygen': 'Lid shut. Watch the flames.', 'word-triangle': 'Lid open. Watch the flames.'}[id] ?? ask) : ask,
      prompt: done ? 'Press Enter to go on.' : set ? prompt : 'Watch the pit.', hints: done ? DONE : hints};
  }

  function tryView(id, base) {
    const t = TRIES[id], strip = id === 'try-strip';
    const common = {...base, plates: !strip, triangle: true, tools: strip ? null : {inHand: t.tool}, tool: strip ? 'rake' : null, guess: m.guess};
    if (m.phase === 'setup') return {...common, keys: {Space: 'rake'}, waiting: true, target: 'rake', glow: 'rake',
      say: m.say || 'A forest fire is far too big for a lid. This strip of forest is burning at the lake end, and the road is at the other. Rake a strip of bare ground across it, in front of the flames.',
      prompt: 'Press Space, or click the rake.', hints: ['The rake is over the column of trees in front of the flames.', 'Press Space.', 'Watch my pointer: it is on the rake.']};
    if (m.phase === 'guess') return {...common, keys: PICK_KEYS(3), waiting: true,
      cards: SIDE_CARDS.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: c.picture, state: null})),
      say: t.ask, prompt: 'Pick a card: click it, or press 1, 2 or 3.',
      hints: [strip ? 'What is missing in the strip that the flames need?' : `What does ${t.tool} do to the fire?`, 'Heat, fuel or oxygen: which one does it take?', 'Any guess is fine. Pick one, then we test it.']};
    if (m.phase === 'tool') {
      const action = strip ? 'burn' : 'tip';
      return {...common, keys: {Space: action}, waiting: true, target: action, glow: action,
        say: strip ? 'Now let it burn.' : `Now tip the ${t.tool} bucket on the fire.`,
        prompt: strip ? 'Press Space to let the fire burn.' : `Press Space, or click the ${t.tool} bucket.`,
        hints: strip ? ['Press Space and watch.', 'Press Space.', 'Watch my pointer.'] : [`The ${t.tool} bucket is on the left.`, 'Press Space.', `Watch my pointer: it is on the ${t.tool} bucket.`]};
    }
    if (m.phase === 'running') return {...common, say: strip ? 'Watch the flames reach the strip.' : `The ${t.tool} goes on. Watch the fire and the triangle.`, prompt: 'Watch.',
      hints: ['Watch the flames.', 'And watch the triangle.', 'Wait a moment.']};
    return {...common, ready: true, mood: m.result.right ? 'cheer' : 'explain', taken: t.takes,
      cards: SIDE_CARDS.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: c.picture,
        state: c.id === m.result.actual ? 'right' : c.id === m.guess ? 'wrong' : null})),
      say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
  }

  function jobView(base) {
    const fz = m.fz, done = m.phase === 'done';
    const common = {...base, plates: false, triangle: false, job: {trips: fz.trips, bucket: BUCKET_L, flatOut: FLAT_OUT_L, lost: m.phase === 'lost'}};
    if (done) return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'running' || m.phase === 'lost') return {...common, say: m.say, prompt: m.phase === 'lost' ? 'The job starts again in a moment.' : 'The helicopter flies back for more water…',
      hints: ['Watch the flames.', 'Which flames are nearest the road now?', 'Wait a moment.']};
    const [fi, fj] = frontCell(fz.fire), target = `drop:${fi}:${fj}`;
    return {...common, keys: AIM_KEYS, waiting: true, target, glow: target,
      say: fz.trips === 0 && !m.say ? `Brian’s job: the practice fire is coming for the road. Each trip you drop one ${BUCKET_L}-litre bucket, and the fire spreads once while you fly back for more. Put it out before it reaches the road.` : m.say,
      prompt: 'Aim with ← → ↑ ↓ and drop with Space, or click a cell.',
      hints: [`A cell burning flat out takes ${litres(FLAT_OUT_L)} to put out. The bucket holds ${litres(BUCKET_L)}.`, 'Aim at the flames nearest the road, the biggest of those, and drop there.',
        'Watch my pointer: it is on the cell to drop on.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'fire', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
