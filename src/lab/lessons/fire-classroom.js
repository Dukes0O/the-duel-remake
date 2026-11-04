// Fire triangle as a classroom lesson (docs/board/cards/LAB-CLASSROOM-FIRE.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. The fire pit is the fire bench's own run (its switches and which side each
// tool removes). The forest is the helicopter challenge's practice fire, its size, seed and start cell, spread,
// watered and coated by the game's own fire rules, with the game's 600-litre bucket.
import {fireBench, TAKES_AWAY as REMOVES, FIRE, RETARDANT, BUCKET, RETARDANT_LITRES, cellId, cellIJ, spreadStep, applyWater, applyRetardant} from '../benches/fire.js';
import {CHALLENGE_RULES} from '../lab-challenges.js';

// ---- the numbers ----
const RULE = CHALLENGE_RULES.fire;
export const COLS = RULE.columns, ROWS = RULE.rows, MIDDLE = Math.floor(ROWS / 2);
// The last column of forest is the road's edge (the challenge's roadColumn); the strip goes across the middle.
export const ROAD = COLS - 1, STRIP = 3;
export const BUCKET_L = BUCKET.litres, FLAT_OUT_L = FIRE.litresPerPoint, COAT_L = RETARDANT.litresPerCell, TANK_L = RETARDANT_LITRES;
export const CELL_M = FIRE.cell, GROW = FIRE.growPercent, LIT = FIRE.litPercent, CHANCE = FIRE.baseChance, DAMP = FIRE.damp;
export const SPREAD_EVERY_S = RULE.spreadEvery, CHALLENGE_S = RULE.seconds, CHALLENGE_SPREADS = RULE.seconds / RULE.spreadEvery;
// The board and the sums show a cell's strength as a whole number, so the sums come out from what is on the screen.
export const strengthOf = percent => Math.max(1, Math.round(percent));
const tidy = value => Number(value.toFixed(2));
export const litresFor = percent => tidy(strengthOf(percent) * FIRE.litresPerPoint / 100);
export const MINUTES = RULE.seconds / 60;
// Brian's job starts with the fire three spreads old; the spread, the strip and the coat with it one spread old.
export const JOB_HEAD_START = 3, TRY_HEAD_START = 1, TRY_SPREADS = 6;
// One bucket on one cell: the whole load lands inside it.
const DROP_RADIUS = 8;
// The free test asks for this many different settings before Continue opens.
export const FREE_TRIES = 3;
// The cell the spread step marks, so the player can follow its strength from press to press: lit at 25 by the head start.
export const MARKED_CELL = Object.freeze([1, ROWS - 1]);
// Facts about real fires, not game rules: the temperature at which wood catches fire and at which water boils.
export const WOOD_BURNS_C = 300, WATER_BOILS_C = 100;

export const SIDES = Object.freeze(['fuel', 'heat', 'air']);
export const SIDE_NAME = Object.freeze({fuel: 'Fuel', heat: 'Heat', air: 'Oxygen'});
export const SWITCH_NAME = Object.freeze({fuel: 'Wood', heat: 'Gas', air: 'Lid'});
export const litres = value => `${tidy(value).toLocaleString('en-GB')} litres`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const count = (n, one) => `${NUMBER_WORDS[n] ?? n} ${one}${n === 1 ? '' : 's'}`;
const lower = side => SIDE_NAME[side].toLowerCase();

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
const CATCH_S = 1, DIE_S = 1.6, POUR_S = 1.1, SETTLE_S = .45;
const pit = (on = {}) => ({fuel: true, heat: true, air: true, putOut: 'nothing', flame: 0, outAt: null, pour: null, ...on});
function burn(p, dt, time) {
  const want = pitBurning(p) ? 1 : 0, was = p.flame;
  p.flame = want ? Math.min(1, p.flame + dt / CATCH_S) : Math.max(0, p.flame - dt / DIE_S);
  if (was > 0 && p.flame === 0) p.outAt = time;
  if (p.flame > 0) p.outAt = null;
}
// The free test's words for any of the eight settings of the three switches: what is set, what the flame does, and why.
export function freeReason({fuel, heat, air}) {
  const missing = pitMissing({fuel, heat, air, putOut: 'nothing'});
  const state = `The wood is ${fuel ? 'in' : 'out'}, the gas is ${heat ? 'on' : 'off'} and the lid is ${air ? 'open' : 'shut'}.`;
  if (!missing.length) return `${state} The fire has fuel, heat and oxygen all at once, so it burns.`;
  const reasons = [!fuel && 'there is no wood in the pit to burn', !heat && 'the gas burner, the only source of heat in this pit, is off', !air && 'the shut lid keeps fresh air out, so the fire has no oxygen'].filter(Boolean);
  const blue = !fuel && heat && air ? ' The small blue flames are the gas burner itself, and they have no wood to light.' : '';
  const enough = reasons.length > 1 ? ' Any one of these would be enough to stop the fire.' : '';
  return `${state} There is no fire, because ${reasons.join(', and ')}.${enough}${blue}`;
}
const settingKey = p => `${p.fuel ? 1 : 0}${p.heat ? 1 : 0}${p.air ? 1 : 0}`;
const SWITCH_ACTIONS = Object.freeze({fuel: ['wood:in', 'wood:out'], heat: ['gas:on', 'gas:off'], air: ['lid:open', 'lid:shut']});
const switchAction = (p, side) => SWITCH_ACTIONS[side][p[side] ? 1 : 0];

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
// How many spreads the try's fire needs to reach the road with no strip in its way.
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
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-water', part: 3, title: 'The water bucket'},
  {id: 'try-sand', part: 3, title: 'The sand bucket'},
  {id: 'try-spread', part: 3, title: 'How a forest fire spreads'},
  {id: 'try-strip', part: 3, title: 'A raked strip'},
  {id: 'word-retardant', part: 3, title: 'Retardant', word: 'fire-retardant'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-lid', part: 5, title: 'Question 1 of 3'},
  {id: 'check-coat', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.fire.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'triangle', text: 'A fire needs heat, fuel and oxygen, all three at the same time. When any one of them is removed, the fire goes out.'},
  {id: 'tools', text: 'Water cools the fire, which removes the heat. Sand or a lid smothers the fire, which removes the oxygen. A raked strip removes the fuel.'},
  {id: 'front', text: 'To fight a forest fire, drop water on the flames nearest the road, which are the front of the fire, and spray retardant on the trees in front of those flames.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Remove heat, fuel or oxygen, and the fire goes out.',
  text: `A practice fire is burning on the shore of the home lake. The bucket is already on the hook. Fill it by lowering it into the lake, then fly to the flames nearest the road and hold H to pour. Keep the fire off the road for ${MINUTES} minutes, or put it out.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'fire-fuel', word: 'Fuel', meaning: 'Fuel is anything that can burn, such as wood, dry grass or a whole tree.'},
  {id: 'fire-heat', word: 'Heat', meaning: 'Heat is the energy that makes something hot. A fuel burns only once heat has brought it to a high enough temperature.'},
  {id: 'fire-oxygen', word: 'Oxygen', meaning: 'Oxygen is a gas that makes up about one fifth of the air. Burning combines fuel with oxygen, so a fire needs fresh air.'},
  {id: 'fire-fire-triangle', word: 'Fire triangle', meaning: 'The fire triangle is a picture of what a fire needs: heat, fuel and oxygen, all at the same time. When any one of them is removed, the fire goes out.'},
  {id: 'fire-retardant', word: 'Retardant', meaning: 'Retardant is a chemical sprayed on plants so that they char, which means blacken slowly, instead of burning. It goes on the plants in front of a fire.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `answer:${i}`]));
const AIM_KEYS = Object.freeze({'←': 'aim:left', '→': 'aim:right', '↑': 'aim:up', '↓': 'aim:down', Space: 'drop'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
// The three guess cards for every try: which side will it remove?
const SIDE_CARDS = SIDES.map(side => ({id: side, label: SIDE_NAME[side], picture: {kind: 'side', side}}));

// ---- the guided tries: which side each removes, why, and why a wrong guess is wrong ----
const TRIES = {
  'try-water': {tool: 'water', name: 'water', removes: REMOVES.water,
    ask: 'Here is the water bucket, with the fire burning and the gas still on. Which side of the triangle will the water remove?',
    why: `Water cools a fire by soaking up a great deal of heat as it warms and turns to steam, faster than the gas burner can supply it. While the wood is wet it stays near ${WATER_BOILS_C} degrees Celsius, far below the ${WOOD_BURNS_C} degrees Celsius or so that it needs in order to burn.`,
    wrong: {fuel: 'The wood is still in the pit, wet and black, so the fuel was not removed.', air: 'The lid is open and air surrounds the pit, so the oxygen was not removed.'}},
  'try-sand': {tool: 'sand', name: 'sand', removes: REMOVES.sand,
    ask: 'Now here is the sand bucket. Which side of the triangle will the sand remove?',
    why: 'The sand lies over the wood in a thick layer, so fresh air cannot reach the flames, and the burning soon uses up the oxygen that is left. This is called smothering, and it is also how my lid worked.',
    wrong: {heat: 'The gas is still on under the sand, so the heat was not removed.', fuel: 'The wood is still there under the sand, so the fuel was not removed.'}},
  'try-strip': {tool: 'cleared strip', name: 'raked strip', removes: REMOVES['cleared strip'],
    ask: 'Here is the raked strip of bare ground. Which side of the triangle will the strip remove?',
    why: 'A flame can light only a cell that touches it, and the strip is a whole cell wide with nothing in it to burn, so the flames stopped at its edge.',
    wrong: {heat: 'The flames were just as hot when they reached the strip, so the heat was not removed.', air: 'Air moves across the strip all the time, so the oxygen was not removed.'}},
};

// ---- the checks ----
const SPOTS = {
  front: {label: 'On the trees in front of the flames'}, flames: {label: 'On the flames'}, behind: {label: 'On the burnt ground behind the flames'},
};
const CHECKS = {
  'check-lid': {
    question: 'A pan of oil catches fire on a stove. You slide a lid over the pan and the fire goes out. Which side of the fire triangle did the lid remove?',
    answers: SIDE_CARDS.map(c => ({label: c.label, picture: c.picture, side: c.id})),
    correct: SIDES.indexOf('air'),
    right: () => 'Correct, the lid removed the oxygen. The stove is still hot and the oil is still in the pan, but the lid keeps fresh air out, just as my lid did on the fire pit.',
    wrong: picked => SIDES[picked] === 'heat' ? 'The stove is still hot under the pan, so the heat was not removed. The lid keeps fresh air out, so it removed the oxygen.'
      : 'The oil is still in the pan under the lid, so the fuel was not removed. The lid keeps fresh air out, so it removed the oxygen.',
    hints: ['Think of my lid on the fire pit.', 'Is the stove still hot? Is the oil still in the pan? What can the lid keep out?', 'Pick “Oxygen”.'],
  },
  'check-coat': {
    question: 'You have the retardant tank, and the fire is spreading toward the road. Where should you spray the retardant?',
    answers: [{label: SPOTS.front.label, picture: {kind: 'spot', what: 'coat', where: 'front'}},
      {label: SPOTS.flames.label, picture: {kind: 'spot', what: 'coat', where: 'flames'}}, {label: SPOTS.behind.label, picture: {kind: 'spot', what: 'coat', where: 'behind'}}],
    correct: 0,
    right: () => `Correct, it goes in front of the flames, because those are the trees that would catch fire next, and coated trees cannot catch fire. The tank’s ${litres(TANK_L)} coat ${TANK_L / COAT_L} cells of forest, ${litres(COAT_L)} each.`,
    wrong: picked => picked === 1 ? 'Retardant never puts out flames that are already burning, because it only stops trees from catching fire. So it goes in front of the flames, on the trees that would catch fire next.'
      : 'Behind the flames the forest has burnt already, so there is nothing left there to catch fire. The retardant goes in front of the flames, on the trees that would catch fire next.',
    hints: ['Think of the pink trees in the forest.', 'Retardant stops trees from catching fire. Which trees would catch fire next?', 'Pick “On the trees in front of the flames”.'],
  },
  'check-game': {
    question: `In the game you fly the ${BUCKET_L}-litre water bucket to the practice fire. Where should you drop the first load of water?`,
    answers: [{label: 'On the flames nearest the road', picture: {kind: 'spot', what: 'water', where: 'flames'}},
      {label: 'On the green trees in front of the flames', picture: {kind: 'spot', what: 'water', where: 'front'}}, {label: 'On the flames at the back, where the fire started', picture: {kind: 'spot', what: 'water', where: 'back'}}],
    correct: 0,
    right: () => `Correct. A cell burning at full strength needs ${litres(FLAT_OUT_L)} to go out, so one full bucket puts out ${Math.floor(BUCKET_L / FLAT_OUT_L)} such cells, and weaker flames need less water. Start with the flames nearest the road, because those will reach the road first.`,
    wrong: picked => picked === 1 ? `Water on trees that are not burning only makes them damp, slower to catch for ${FIRE.dampSteps} spreads, and the flames keep burning and keep spreading. Drop the water on the flames nearest the road.`
      : 'The flames at the back are furthest from the road. While you put them out, the front reaches the road, as you saw in the job. Drop the water on the flames nearest the road.',
    hints: ['Think of the job you did in the forest.', 'Which flames will reach the road first?', 'Pick “On the flames nearest the road”.'],
  },
};

// ---- the formulas beside the board (the numbers are the ones on the board now) ----
const yesNo = has => has ? 'yes' : 'no';
const RULE_WORDS = 'fire = fuel and heat and oxygen';
function ruleFormula(p, note = 'One “no” is enough to stop the fire.') {
  const gone = pitMissing(p);
  return {title: 'The rule of the fire triangle', formula: RULE_WORDS,
    worked: `Fuel ${yesNo(!gone.includes('fuel'))}, heat ${yesNo(!gone.includes('heat'))}, oxygen ${yesNo(!gone.includes('air'))}, so ${gone.length ? 'no fire' : 'fire'}.`, note};
}
// The three word steps build the rule one side at a time, and each reads its own switch.
function soFarFormula(p, sides) {
  const reads = {fuel: `Fuel: ${p.fuel ? 'the wood is in' : 'no wood in the pit'}.`, heat: `Heat: ${p.heat ? 'the gas is on' : 'the gas is off'}.`, air: `Oxygen: ${p.air ? 'the lid is open' : 'the lid is shut'}.`};
  return {title: 'What a fire needs, so far', formula: `fire needs ${sides.map(lower).join(' and ')}`, worked: sides.map(side => reads[side]).join(' ')};
}
const celsiusNote = 'A temperature in degrees Celsius, written °C, is measured on the scale where water freezes at 0 and boils at 100.';
const bucketFormula = {title: 'One full bucket', formula: 'cells put out = litres in the bucket ÷ litres for one cell', worked: `${BUCKET_L} ÷ ${FLAT_OUT_L} = ${(BUCKET_L / FLAT_OUT_L).toFixed(2)} cells at full strength`, note: `So one bucket puts out ${Math.floor(BUCKET_L / FLAT_OUT_L)} cells at full strength, with ${BUCKET_L % FLAT_OUT_L} litres left over. These are the game’s own numbers.`};
const tankFormula = {title: 'How much the tank coats', formula: 'cells coated = litres in the tank ÷ litres for one cell', worked: `${TANK_L} ÷ ${COAT_L} = ${TANK_L / COAT_L} cells`};
const stripCoatFormula = {title: 'Coating the strip across this forest', formula: 'litres needed = cells × litres for one cell', worked: `${ROWS} × ${COAT_L} = ${ROWS * COAT_L} litres`, note: `The tank holds ${TANK_L} litres, so it can coat the whole strip. In this game a coated cell cannot catch fire for the rest of that fire.`};
const challengeFormula = {title: 'Spreads during the challenge', formula: 'spreads = time ÷ time between spreads', worked: `${CHALLENGE_S} s ÷ ${SPREAD_EVERY_S} s = ${CHALLENGE_SPREADS} spreads`, note: `${MINUTES} minutes is ${CHALLENGE_S} seconds, written s.`};

function spreadFormulas(fz, lit) {
  const steps = fz.fire.steps, far = front(fz.fire), distance = far * CELL_M, time = steps * SPREAD_EVERY_S;
  const marked = cellState(fz, ...MARKED_CELL), s = strengthOf(marked.percent ?? 0);
  return [
    {title: 'Strength of the marked cell', formula: `next strength = strength + ${GROW}, up to 100`, worked: s + GROW <= 100 ? `${s} + ${GROW} = ${s + GROW}` : `${s} + ${GROW} is more than 100, so the cell stays at 100.`,
      note: 'The strength of a cell is a percentage, which means a number out of 100.'},
    {title: 'Chance of catching fire', formula: `chance = ${CHANCE} from each burning cell it touches`, worked: `${CHANCE} is ${Math.round(CHANCE * 100)} chances in 100. ${lit === null ? 'Press Space to see how many cells catch fire.' : `${cap(count(lit, 'cell'))} caught fire at the last spread.`}`,
      note: `This is the game’s rule on level ground with no wind. A cell that catches fire starts at ${LIT} and can light its neighbours from the next spread. A cell weaker than ${FIRE.spreadFrom} after growing cannot light them.`},
    {title: 'How fast the front moves', formula: 'speed = distance ÷ time', worked: `${far} × ${CELL_M} m = ${distance} m, and ${steps} × ${SPREAD_EVERY_S} s = ${time} s, so ${distance} ÷ ${time} = ${(distance / time).toFixed(2)} m/s`,
      note: `m stands for metres and s for seconds. m/s means metres per second, the number of metres travelled during each second. The front is the line of flames nearest the road, and it moves at most one cell, ${CELL_M} m, at each spread.`},
  ];
}
function stripFormulas(fz) {
  const columns = fz.raked ? STRIP : COLS;
  return [
    {title: 'Cells the fire can reach', formula: 'cells = columns × rows', worked: `${columns} × ${ROWS} = ${columns * ROWS} cells`, note: fz.raked ? `A column is a line of cells running from the top of the picture to the bottom. Only the ${STRIP} columns before the strip can burn now. ${fz.fire.burning.length} of those cells are burning.` : `A column is a line of cells running from the top of the picture to the bottom. With no strip, the fire can reach all ${COLS} columns.`},
    {title: 'Chance of catching fire', formula: `chance = ${CHANCE} if the cell has trees, 0 if it has none`, worked: fz.raked ? 'The strip has no trees, so its chance is 0.' : `The trees in the strip have a chance of ${CHANCE}.`},
  ];
}
function jobFormulas(fz) {
  const strengths = fz.fire.burning.map(([, percent]) => strengthOf(percent)), total = strengths.reduce((a, b) => a + b, 0), need = tidy(total * FLAT_OUT_L / 100);
  const aimed = fz.aim ? cellState(fz, ...fz.aim) : {state: 'none'}, s = strengthOf(aimed.percent ?? 0);
  return [
    {title: 'Water for the cell you are aiming at', formula: `litres = strength × ${FLAT_OUT_L} ÷ 100`, worked: aimed.state === 'burning' ? `${s} × ${FLAT_OUT_L} ÷ 100 = ${litresFor(s)} litres` : 'That cell is not burning, so it needs no water.',
      note: `A cell at full strength, which is 100, needs ${FLAT_OUT_L} litres to go out. This is the game’s own rule.`},
    {title: 'Water for all the flames now', formula: `total = strengths added together × ${FLAT_OUT_L} ÷ 100`, worked: strengths.length ? `(${strengths.join(' + ')}) × ${FLAT_OUT_L} ÷ 100 = ${need} litres` : 'No cell is burning, so no more water is needed.'},
    {title: 'The fewest trips left', formula: `trips = total ÷ ${BUCKET_L}, rounded up`, worked: strengths.length ? `${need} ÷ ${BUCKET_L} = ${(need / BUCKET_L).toFixed(2)}, so ${count(Math.ceil(need / BUCKET_L), 'trip')}` : 'No more trips are needed.',
      note: `This is the count if the fire stopped growing now. It does not stop, because each burning cell gains ${GROW} at every spread, so waiting costs more water and more trips.`},
    {title: 'Damp trees', formula: `chance of catching = ${CHANCE} × ${DAMP}`, worked: `${CHANCE} × ${DAMP} = ${tidy(CHANCE * DAMP)}`, note: `Water on trees that are not burning makes them damp for ${FIRE.dampSteps} spreads, which lowers their chance of catching fire but does not put out any flames.`},
  ];
}

export function createModel() {
  let m = null;
  const seen = new Set(), said = {};
  // The free test's results stay on the board for the whole lesson.
  const tested = new Map();
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'set', pit: null, fz: null, guess: null, answered: null, result: null, say: '', doneAt: null, rows: [], lostAt: null, pending: null, lit: null};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.pit = pit({flame: 1}); m.phase = 'running'; }
    if (id === 'word-fuel') m.pit = pit({fuel: false, heat: false});
    if (id === 'word-heat') m.pit = pit({heat: false});
    if (id === 'word-oxygen') m.pit = pit({flame: 1});
    if (id === 'word-triangle') m.pit = pit({air: false});
    if (id === 'watch') { m.pit = pit({flame: 1}); m.phase = 'running'; }
    if (id === 'try-free') m.pit = pit({flame: 1});
    if (id === 'try-water' || id === 'try-sand') { m.pit = pit({flame: 1}); m.phase = 'guess'; }
    if (id === 'try-spread') { const grid = forestGrid(); m.fz = {grid, fire: grown(litFire(), grid, TRY_HEAD_START), raked: false}; }
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
    m.fz = {grid, fire: grown(litFire(), grid, JOB_HEAD_START), raked: false, aim: [0, MIDDLE], trips: 0, splash: null, spreadAt: null, allFront: true};
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
    if (id === 'try-free') return freeAct(action);
    if (id === 'try-spread') return spreadAct(kind);
    if (m.phase !== 'set' && !TRIES[id] && id !== 'alone') return null;
    const p = m.pit;
    if (id === 'word-fuel' && action === 'wood:in') { p.fuel = true; return finishWord(id, 'The wood is in the pit, so the fire now has its fuel. The wood does not burn by itself, because it is not hot enough. It needs heat.', 'lab.clunk'); }
    if (id === 'word-heat' && action === 'gas:on') { p.heat = true; m.phase = 'running'; return {kind: 'progress', sound: 'lab.burner', say: RUNNING_SAY[id]}; }
    if (id === 'word-oxygen' && action === 'lid:shut') { p.air = false; m.phase = 'running'; return {kind: 'progress', sound: 'lab.clunk', say: RUNNING_SAY[id]}; }
    if (id === 'word-triangle' && action === 'lid:open') { p.air = true; m.phase = 'running'; return {kind: 'progress', sound: 'lab.clunk', say: RUNNING_SAY[id]}; }
    if (id === 'word-retardant' && action === 'coat') {
      m.fz.fire = coatStrip(m.fz.fire, m.fz.grid).fire; m.phase = 'running'; spreads(TRY_SPREADS);
      return {kind: 'progress', sound: 'lab.fizz', say: 'The trees in front of the flames are now coated pink. Watch what the flames do when they reach them.'};
    }
    if (TRIES[id]) return tryAct(id, kind, value);
    if (id === 'alone') return jobAct(kind, value, extra);
    return null;
  }
  function finishWord(id, say, sound) {
    m.phase = 'done'; seen.add(id); said[id] = m.say = say;
    return {kind: 'right', sound, say};
  }

  // The free test: any switch, any time. The flame answers, and once it has settled Brian says why and the table keeps the result.
  function freeAct(action) {
    const p = m.pit, side = SIDES.find(s => SWITCH_ACTIONS[s].includes(action));
    if (!side || action !== switchAction(p, side)) return null;
    p[side] = !p[side]; m.pending = m.time;
    return {kind: 'sound', sound: side === 'heat' ? 'lab.burner' : 'lab.clunk'};
  }
  function freeTick() {
    const p = m.pit;
    if (m.pending === null || m.time - m.pending < SETTLE_S || p.flame !== (pitBurning(p) ? 1 : 0)) return null;
    m.pending = null;
    const key = settingKey(p), fresh = !tested.has(key);
    if (fresh) tested.set(key, {fuel: p.fuel, heat: p.heat, air: p.air, burning: pitBurning(p), missing: pitMissing(p)});
    if (tested.size >= FREE_TRIES) seen.add('try-free');
    m.say = `${freeReason(p)} ${tested.size >= FREE_TRIES ? 'Press Enter when you have tested enough settings, or change a switch and test another.' : 'Change a switch and test a different setting.'}`;
    return fresh ? {kind: 'right', say: m.say} : {kind: 'note', say: m.say};
  }

  // The spread step: one press, one spread, until the fire reaches the trees by the road.
  function spreadAct(kind) {
    if (kind !== 'spread' || m.phase !== 'set') return null;
    const fz = m.fz, before = fz.fire.burning.length;
    fz.fire = spreadStep(fz.fire, fz.grid, null);
    const lit = fz.fire.burning.length - before;
    m.lit = lit;
    const caught = lit ? `${cap(count(lit, 'new cell'))} caught fire, and each one started at ${LIT}.` : `No new cell caught fire this time, because each touching cell has only a ${Math.round(CHANCE * 100)} percent chance.`;
    if (reachedRoad(fz.fire)) {
      m.phase = 'done'; seen.add('try-spread');
      const far = front(fz.fire) * CELL_M, time = fz.fire.steps * SPREAD_EVERY_S;
      m.say = `That spread carried the fire into the trees beside the road, ${fz.fire.steps} spreads after it was lit. ${caught} In the challenge a spread comes every ${SPREAD_EVERY_S} seconds, so ${fz.fire.steps} spreads last ${time} seconds, which is less than the ${CHALLENGE_S} seconds of the challenge. The front travelled ${far} metres in that time, which is ${(far / time).toFixed(2)} metres per second, written m/s. So a fire left alone reaches the road, and we must remove a side of the triangle somewhere in its path.`;
      return {kind: 'right', sound: 'lab.tick', say: m.say};
    }
    m.say = `Every burning cell grew stronger by ${GROW}, up to 100. ${caught} Press Space to run the next spread.`;
    return {kind: 'progress', sound: 'lab.tick', say: m.say};
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
      return {kind: 'progress', sound: 'lab.clunk', say: t.ask};
    }
    if (m.phase === 'guess') {
      const pick = SIDE_CARDS[Number(value)];
      if (kind !== 'answer' || !pick) return null;
      m.guess = pick.id; m.phase = 'tool';
      return {kind: 'progress', say: id === 'try-strip' ? 'Now let the fire burn by pressing Space.' : `Now tip the ${t.name} bucket onto the fire by pressing Space.`};
    }
    if (m.phase !== 'tool') return null;
    if (id === 'try-strip' && kind === 'burn') { m.phase = 'running'; spreads(TRY_SPREADS); return {kind: 'progress', say: 'Watch the flames reach the strip.'}; }
    if (id !== 'try-strip' && kind === 'tip') {
      m.phase = 'running'; m.pit.pour = {tool: t.tool, at: m.time};
      return {kind: 'progress', sound: t.tool === 'water' ? 'lab.splash' : 'lab.clunk', say: `The ${t.name} is going on. Watch the fire and the triangle.`};
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
    const [i, j] = fz.aim, before = cellState(fz, i, j), best = frontCell(fz.fire);
    if (best[0] !== i || best[1] !== j) fz.allFront = false;
    const r = dropOn(fz.fire, fz.grid, i, j);
    fz.fire = r.fire; fz.trips += 1; fz.splash = {i, j, at: m.time};
    const left = fz.fire.burning.length, trips = count(fz.trips, 'trip');
    if (!left) {
      m.phase = 'done'; seen.add('alone');
      m.say = fz.allFront ? `The fire is out after ${trips}, and it never reached the road. You dropped the water on the flames nearest the road every time, and those were the flames that would have reached the road first.`
        : `The fire is out after ${trips}, and it never reached the road. Next time, start with the flames nearest the road, because those will reach the road first.`;
      return {kind: 'pass', sound: 'lab.splash', say: m.say};
    }
    m.phase = 'running'; fz.spreadAt = m.time + 1;
    if (before.state === 'burning') m.say = r.cellsOut ? `The water put out ${count(r.cellsOut, 'cell')}. A cell burning at full strength needs ${litres(FLAT_OUT_L)} to go out and weaker flames need less, and the water left over ran on to the burning cells next to it. ${cap(count(left, 'cell'))} ${left === 1 ? 'is' : 'are'} still burning.`
      : 'The flames in that cell are weaker now, but the cell is still burning.';
    else if (before.state === 'burnt') m.say = 'That cell is out already. Nothing is burning there, so the water did nothing.';
    else m.say = `Those trees are damp now, so they are slower to catch fire for ${FIRE.dampSteps} spreads. But the flames are still burning.`;
    return {kind: before.state === 'burning' ? 'progress' : 'note', sound: 'lab.splash', say: m.say};
  }
  function jobTick() {
    const fz = m.fz;
    if (m.phase === 'lost' && m.time - m.lostAt >= 2.6) { startJob(); return {kind: 'note', say: 'The job starts again. Aim at the flames nearest the road with ← → ↑ ↓, then press Space.'}; }
    if (m.phase !== 'running' || m.time < fz.spreadAt) return null;
    fz.fire = spreadStep(fz.fire, fz.grid, null);
    if (reachedRoad(fz.fire)) {
      m.phase = 'lost'; m.lostAt = m.time;
      return {kind: 'fail', say: 'The fire reached the road, because the flames at the front kept spreading while the water fell behind them. Drop the water on the flames nearest the road first.'};
    }
    m.phase = 'set';
    return {kind: 'note', say: `${m.say} The fire spread once while you flew back for more water.`};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id, p = m.pit;
    if (id === 'wonder') return wonder(dt);
    if (id === 'watch') return watch(dt);
    if (p) burn(p, dt, m.time);
    if (id === 'try-free') return freeTick();
    if (id === 'word-heat' && m.phase === 'running' && p.flame >= 1) {
      if (m.doneAt == null) m.doneAt = m.time + .5;
      if (m.time >= m.doneAt) return finishWord(id, 'The gas burner heated the wood to the temperature at which it burns, and the open lid let in the oxygen it needs. Burning gives off heat as well, so a fire helps to keep itself hot.');
    }
    if (id === 'word-oxygen' && m.phase === 'running' && p.flame <= 0 && m.time - p.outAt >= .4)
      return finishWord(id, 'The lid shut out the fresh air, and the burning soon used up the oxygen under the lid, so the fire went out even though the gas is on and the wood is still there. That is why my lid worked.');
    if (id === 'word-triangle' && m.phase === 'running' && p.flame >= 1) {
      if (m.doneAt == null) m.doneAt = m.time + .5;
      if (m.time >= m.doneAt) return finishWord(id, 'Fresh air reached the wood again and the gas burner lit it. With heat, fuel and oxygen all three together, the fire burns. When any one side is removed, the fire goes out.');
    }
    if ((id === 'try-water' || id === 'try-sand') && m.phase === 'running') {
      if (m.time - p.pour.at >= POUR_S / 2) p.putOut = TRIES[id].tool;
      if (p.flame <= 0 && m.time - p.outAt >= .5) return finishTry(id);
    }
    if (id === 'word-retardant' && m.phase === 'running') {
      spreadTick();
      if (!m.fz.left && m.time >= m.fz.spreadAt)
        return finishWord(id, 'The flames reached the pink trees and stopped, because coated trees cannot catch fire. Retardant never puts out flames already burning, so it goes in front of them, on the trees that would catch fire next.', 'lab.tick');
    }
    if (id === 'try-strip' && m.phase === 'running') {
      spreadTick();
      if (!m.fz.left && m.time >= m.fz.spreadAt) return finishTry(id);
    }
    if (id === 'alone') return jobTick();
    return null;
  }

  function finishTry(id) {
    const t = TRIES[id], right = m.guess === t.removes;
    m.phase = 'result'; seen.add(id);
    m.result = {actual: t.removes, right};
    const extra = id === 'try-strip' ? ` Without the strip, this same fire reached the road after ${OPEN_SPREADS} more spreads.` : '';
    m.say = right ? `You were right, the ${t.name} removed the ${lower(t.removes)}. ${t.why}${extra}` : `The ${t.name} removed the ${lower(t.removes)}, not the ${lower(m.guess)}. ${t.wrong[m.guess]} ${t.why}${extra}`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // The wonder: the pit burns strongly, the lid slams shut and the flames go out.
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
    raked: fz.raked, aim: fz.aim ?? null, trips: fz.trips ?? 0, burning: fz.fire.burning.length, front: front(fz.fire), road: reachedRoad(fz.fire), steps: fz.fire.steps,
    coated: (fz.fire.retardant ?? []).length > 0, splash: fz.splash ? {...fz.splash, age: m.time - fz.splash.at} : null});

  function view() {
    const id = step().id;
    const base = {scene: m.fz ? 'forest' : 'pit', time: m.time, pit: drawnPit(m.pit), forest: drawnForest(m.fz), keys: {}, repeat: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), plates: true, triangle: true, tools: null, table: null, job: null, formulas: [], thermometer: false, arrows: false, numbers: false, spread: null, freeRows: null};
    if (id === 'wonder') return {...base, scene: 'wonder', plates: false, triangle: false, actions: ['replay'],
      say: seen.has(id) ? 'The fire was burning strongly. I shut the lid without using any water at all, and the flames went out. Why did shutting a lid work?' : 'This is my fire pit, and the fire in it is burning strongly. Watch what I do to it.',
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the fire pit.',
      hints: ['Watch the lid.', 'I used no water and no sand. Only the lid moved.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch, and then press Enter.']};
    if (id === 'word-fuel') return wordView({...base, formulas: [soFarFormula(m.pit, ['fuel'])]}, id, {1: 'wood:in'}, 'wood:in',
      'Fuel is anything that can burn, such as wood, dry grass or a whole tree. The fire pit is empty at the moment, so it has nothing to burn. Put the wood in.', 'Press 1, or click the Wood switch.',
      ['The switches are under the pit.', 'Press 1 for the Wood switch.', 'Watch my pointer, which is on the Wood switch.']);
    if (id === 'word-heat') return wordView({...base, thermometer: true, formulas: [soFarFormula(m.pit, ['fuel', 'heat']),
      {title: 'The temperature wood needs', formula: `wood burns above about ${WOOD_BURNS_C} °C`, note: `${celsiusNote} This is a fact about real wood, not a rule of the game.`}]}, id, {2: 'gas:on'}, 'gas:on',
      `Heat is the energy that makes something hot. Wood does not catch fire until it reaches about ${WOOD_BURNS_C} degrees Celsius, so it needs a source of heat first. Degrees Celsius, written °C, are measured on the scale where water freezes at 0 and boils at 100. The gas burner under the wood is the source of heat here. Light the gas, and watch the thermometer on the left.`, 'Press 2, or click the Gas switch.',
      ['The Gas switch is under the pit.', 'Press 2 for the Gas switch.', 'Watch my pointer, which is on the Gas switch.']);
    if (id === 'word-oxygen') return wordView({...base, formulas: [soFarFormula(m.pit, ['fuel', 'heat', 'air'])]}, id, {3: 'lid:shut'}, 'lid:shut',
      'Oxygen is a gas that makes up about one fifth of the air. Burning is a chemical change in which the fuel combines with oxygen and gives off heat and light, so a fire uses up oxygen all the time and needs fresh air to replace it. The open lid lets fresh air reach the flames. Shut the lid.', 'Press 3, or click the Lid switch.',
      ['The Lid switch is under the pit.', 'Press 3 for the Lid switch.', 'Watch my pointer, which is on the Lid switch.']);
    if (id === 'word-triangle') return wordView({...base, formulas: [ruleFormula(m.pit)]}, id, {3: 'lid:open'}, 'lid:open',
      'The fire triangle is a picture of what every fire needs. Its three sides are heat, fuel and oxygen, and a fire burns only when all three are present at the same time. The gas and the wood are in place, but the lid is shut, so the oxygen side is missing. Open the lid again.', 'Press 3, or click the Lid switch.',
      ['Look at the triangle on the right, where one side is missing.', 'Press 3, and the lid will open.', 'Watch my pointer, which is on the Lid switch.']);
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], table: WATCH.map((w, k) => m.rows[k] ?? null), formulas: [ruleFormula(m.pit)],
        say: done ? 'Turning the gas off removed the heat, lifting the wood out removed the fuel, and shutting the lid removed the oxygen. Each time one side was removed, the fire went out. In this pit the gas burner is the only source of heat. A large fire in real life makes so much heat of its own that turning off a burner would not stop it, which is why firefighters use water to cool it.'
          : 'This pit has three switches. The gas controls the heat, the wood controls the fuel, and the lid controls the oxygen. I will remove one side of the triangle at a time. Watch the switches and the triangle.',
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the switches and the triangle.',
        hints: ['Watch which switch changes.', 'Then watch which side of the triangle goes dark.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-free') return freeView(base);
    if (id === 'try-spread') return spreadView(base);
    if (id === 'word-retardant') {
      const done = m.phase === 'done', set = m.phase === 'set';
      return {...base, plates: false, triangle: false, arrows: true, numbers: true, formulas: [tankFormula, stripCoatFormula], keys: set ? {Space: 'coat'} : {}, waiting: set, target: set ? 'coat' : null, glow: set ? 'coat' : null, tool: 'coat',
        say: done ? m.say : `Retardant is a chemical sprayed on trees and other plants before a fire reaches them. When a coated plant is heated it chars, which means that it blackens slowly and gives off almost no gas that can burn, so flames cannot spread through it. In this way retardant removes the fuel while the trees are still standing. We measure retardant in litres. A litre is a measure of volume, and one litre of water weighs one kilogram. In this game ${COAT_L} litres coat one cell. Coat the trees in front of the flames.`,
        prompt: done ? 'Press Enter to continue.' : set ? 'Press Space, or click the spray over the trees.' : 'Watch the flames.',
        hints: done ? DONE : ['The spray is over the column of trees in front of the flames.', 'Press Space.', 'Watch my pointer, which is on the spray.']};
    }
    if (TRIES[id]) return tryView(id, base);
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      // The sums beside a question never give its answer away.
      const formulas = id === 'check-lid' ? [answered ? {title: 'The rule of the fire triangle', formula: RULE_WORDS, worked: 'Oil yes, a hot stove yes, oxygen no, so no fire.'} : {title: 'The rule of the fire triangle', formula: RULE_WORDS}]
        : id === 'check-coat' ? [tankFormula, stripCoatFormula] : [bucketFormula, challengeFormula];
      return {...base, scene: 'check', plates: false, keys: answered ? {} : PICK_KEYS(3), waiting: !answered, formulas,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        check: id, answered,
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', plates: false, ready: true, ideas: KEY_IDEAS, formulas: [{title: 'The rule of the fire triangle', formula: RULE_WORDS, note: 'One “no” is enough to stop the fire.'}, bucketFormula, tankFormula, challengeFormula],
      say: 'A fire needs heat, fuel and oxygen, all at the same time, and it goes out when any one of them is removed. Water cools the fire, which removes the heat. Sand or a lid smothers the fire, which removes the oxygen. A raked strip removes the fuel, because it leaves nothing to burn. Retardant is sprayed on the trees in front of a fire, so that those trees char instead of burning. To fight a forest fire, start with the flames nearest the road.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  const RUNNING_SAY = {'word-heat': 'The gas is on. Watch the wood and the thermometer.', 'word-oxygen': 'The lid is shut. Watch the flames.', 'word-triangle': 'The lid is open. Watch the flames.'};
  function wordView(base, id, keys, target, ask, prompt, hints) {
    const done = m.phase === 'done', set = m.phase === 'set';
    return {...base, keys: set ? keys : {}, waiting: set, target: set ? target : null, glow: set ? target : null,
      say: done ? m.say : m.phase === 'running' ? (RUNNING_SAY[id] ?? ask) : ask,
      prompt: done ? 'Press Enter to continue.' : set ? prompt : 'Watch the pit.', hints: done ? DONE : hints};
  }

  function freeView(base) {
    const p = m.pit, keys = {1: switchAction(p, 'fuel'), 2: switchAction(p, 'heat'), 3: switchAction(p, 'air')};
    // Show me presses a switch that leads to a setting not tested yet.
    const untested = SIDES.find(side => !tested.has(settingKey({...p, [side]: !p[side]}))) ?? 'fuel';
    const target = switchAction(p, untested);
    return {...base, keys, target, glow: seen.has('try-free') ? null : target, waiting: !seen.has('try-free'), freeRows: [...tested.values()],
      formulas: [ruleFormula(p, 'In this pit the gas burner is the only source of heat. A large fire in real life makes enough heat of its own to keep burning when a burner is turned off.')],
      say: m.say || `Now you can experiment. Press 1 for the wood, 2 for the gas and 3 for the lid, in any order and any combination. Each switch changes the rule beside the picture at once, so predict what the flame will do and then watch it. I will tell you the reason each time, and the table keeps your results. Test at least ${FREE_TRIES} different settings.`,
      prompt: seen.has('try-free') ? 'Press Enter to continue, or change a switch and test another setting.' : `Press 1, 2 or 3, or click a switch. Different settings tested so far: ${tested.size} of ${FREE_TRIES}.`,
      hints: ['Press any of the switches, 1, 2 or 3, and watch the flame.', 'Try removing two sides at once, and then put one back. Does the fire return?', 'Watch my pointer, which is on a switch you have not tried from here.']};
  }

  function spreadView(base) {
    const done = m.phase === 'done';
    const opening = `A forest fire is far too big for a lid, so let us look at how one grows. This picture shows a patch of forest from above, with the lake on the left and the road on the right. The game divides the forest into square patches called cells, each ${CELL_M} metres across. The number on a burning cell is its strength. Fire moves in jumps called spreads, and in the helicopter challenge one spread comes every ${SPREAD_EVERY_S} seconds. At each spread, every burning cell grows stronger by ${GROW}, up to 100, and each cell of trees touching a burning cell has a ${Math.round(CHANCE * 100)} percent chance of catching fire. Press Space to run one spread.`;
    return {...base, plates: false, triangle: false, arrows: !done, numbers: true, marked: MARKED_CELL, spread: {steps: m.fz.fire.steps, seconds: m.fz.fire.steps * SPREAD_EVERY_S},
      formulas: spreadFormulas(m.fz, m.lit), keys: done ? {} : {Space: 'spread'}, waiting: !done, target: done ? null : 'spread', glow: done ? null : 'spread',
      say: m.say || opening, prompt: done ? 'Press Enter to continue.' : 'Press Space to run one spread.',
      hints: done ? DONE : ['Press Space and watch the numbers on the cells.', 'Press Space to run the next spread.', 'Watch my pointer, which is on the Space key.']};
  }

  function tryView(id, base) {
    const t = TRIES[id], strip = id === 'try-strip';
    const formulas = strip ? stripFormulas(m.fz) : id === 'try-water' ? [ruleFormula(m.pit, 'While the wood is wet the heat side is missing, even with the gas on.'),
      {title: 'Why water cools the wood', formula: `wet wood stays near ${WATER_BOILS_C} °C`, worked: `${WATER_BOILS_C} °C is less than ${WOOD_BURNS_C} °C, so the wood cannot burn.`, note: 'These temperatures are facts about real wood and water, not rules of the game.'}]
      : [ruleFormula(m.pit, 'While the sand covers the wood the oxygen side is missing, even with the lid open.')];
    const common = {...base, plates: !strip, triangle: true, tools: strip ? null : {inHand: t.tool}, tool: strip ? 'rake' : null, guess: m.guess, formulas, thermometer: id === 'try-water', arrows: strip, numbers: strip};
    if (m.phase === 'setup') return {...common, keys: {Space: 'rake'}, waiting: true, target: 'rake', glow: 'rake',
      say: m.say || 'Here is the same fire again, burning at the lake end of the forest with the road at the other end. Raking means scraping away every tree, bush and dry leaf until only bare ground is left. Rake a strip of bare ground across the forest, one cell wide, in front of the flames.',
      prompt: 'Press Space, or click the rake.', hints: ['The rake is over the column of trees in front of the flames.', 'Press Space.', 'Watch my pointer, which is on the rake.']};
    if (m.phase === 'guess') return {...common, keys: PICK_KEYS(3), waiting: true,
      cards: SIDE_CARDS.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: c.picture, state: null})),
      say: t.ask, prompt: 'Pick a card: click it, or press 1, 2 or 3.',
      hints: [strip ? 'What is missing in the strip that the flames need?' : `What does ${t.name} do to the fire?`, 'Which one of heat, fuel and oxygen does it remove?', 'Any guess is fine. Pick one, and then we will test it.']};
    if (m.phase === 'tool') {
      const action = strip ? 'burn' : 'tip';
      return {...common, keys: {Space: action}, waiting: true, target: action, glow: action,
        say: strip ? 'Now let the fire burn by pressing Space.' : `Now tip the ${t.name} bucket onto the fire by pressing Space.`,
        prompt: strip ? 'Press Space to let the fire burn.' : `Press Space, or click the ${t.name} bucket.`,
        hints: strip ? ['Press Space and watch.', 'Press Space.', 'Watch my pointer.'] : [`The ${t.name} bucket is on the left.`, 'Press Space.', `Watch my pointer, which is on the ${t.name} bucket.`]};
    }
    if (m.phase === 'running') return {...common, say: strip ? 'Watch the flames reach the strip.' : `The ${t.name} is going on. Watch the fire and the triangle.`, prompt: 'Watch.',
      hints: ['Watch the flames.', 'Now watch the triangle.', 'Wait a moment.']};
    return {...common, ready: true, mood: m.result.right ? 'cheer' : 'explain', removed: t.removes,
      cards: SIDE_CARDS.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: c.picture,
        state: c.id === m.result.actual ? 'right' : c.id === m.guess ? 'wrong' : null})),
      say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
  }

  function jobView(base) {
    const fz = m.fz, done = m.phase === 'done';
    const common = {...base, plates: false, triangle: false, arrows: !done, numbers: true, formulas: jobFormulas(fz), job: {trips: fz.trips, bucket: BUCKET_L, flatOut: FLAT_OUT_L, lost: m.phase === 'lost'}};
    if (done) return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'running' || m.phase === 'lost') return {...common, say: m.say, prompt: m.phase === 'lost' ? 'The job starts again in a moment.' : 'The helicopter is flying back for more water.',
      hints: ['Watch the flames.', 'Which flames are nearest the road now?', 'Wait a moment.']};
    const [fi, fj] = frontCell(fz.fire), target = `drop:${fi}:${fj}`;
    return {...common, keys: AIM_KEYS, waiting: true, target, glow: target,
      say: fz.trips === 0 && !m.say ? `Here is a job for you. The practice fire is spreading toward the road. On each trip you drop one ${BUCKET_L}-litre bucket of water, and the fire spreads once while you fly back for more. Put the fire out before it reaches the road. The sums beside the picture follow the cell you aim at.` : m.say,
      prompt: 'Aim with ← → ↑ ↓ and drop with Space, or click a cell.',
      hints: [`A cell burning at full strength, which is 100, needs ${litres(FLAT_OUT_L)} to go out. The bucket holds ${litres(BUCKET_L)}.`, 'Aim at the flames nearest the road, the strongest of those, and drop the water there.',
        'Watch my pointer, which is on the cell to drop on.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'fire', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
