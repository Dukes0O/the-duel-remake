// Fire triangle (docs/LAB.md 4.1): a steel fire pit with three switches (heat, fuel, air) and three ways to put
// it out. The practice fire uses the game's own spread rules (heli-fire.js spreadStep on a grid of 20 m cells):
// a cleared strip is a column of cells with no forest in it, which a fire cannot cross without wind.
import {FIRE, RETARDANT, cellId, spreadStep} from '../../heli/heli-fire.js';
import {choice, makeBench} from './bench-core.js';

const ON_OFF = ['on', 'off'];
const controls = [
  choice('heat', 'Gas (heat)', ON_OFF, 'on'), choice('fuel', 'Wood (fuel)', ON_OFF, 'on'), choice('air', 'Lid (air)', ON_OFF, 'on'),
  choice('putOut', 'Put it out with', ['nothing', 'water', 'sand', 'cleared strip'], 'nothing'),
];

// What each way takes away from the triangle.
export const TAKES_AWAY = Object.freeze({water: 'heat', sand: 'air', 'cleared strip': 'fuel'});

// A strip of forest 9 cells long and 5 wide, lit at one end; optionally one column cleared.
const COLUMNS = 9, ROWS = 5, CLEARED_COLUMN = 4;
export function practiceFire({cleared = false, treated = false, details = false, steps = 14} = {}) {
  const cells = new Map();
  for (let i = 0; i < COLUMNS; i++) {
    if (cleared && i === CLEARED_COLUMN) continue;
    for (let j = 0; j < ROWS; j++) cells.set(cellId(i, j), {i, j, x: (i + 0.5) * FIRE.cell, y: 0, z: (j + 0.5) * FIRE.cell});
  }
  const grid = {cells};
  let fire = {seed: 1989, steps: 0, burning: [[cellId(0, 2), FIRE.startPercent]], burnt: [], damp: []};
  if (treated) fire.retardant = [...cells.values()].filter(c => c.i === CLEARED_COLUMN).map(c => [cellId(c.i, c.j), RETARDANT.litresPerCell]);
  for (let step = 0; step < steps; step++) fire = spreadStep(fire, grid, null);
  const reached = fire.burning.some(([cell]) => Math.floor(cell / 1024) - 512 > CLEARED_COLUMN);
  return {burningCells: fire.burning.length, forestCells: cells.size, reachedFarSide: reached,
    ...(details ? {cells: [...cells.values()], burning: fire.burning, burnt: fire.burnt} : {})};
}

export const fireBench = makeBench({
  id: 'fire', controls, cues: ['lab.burner'],
  run({heat, fuel, air, putOut}) {
    const has = {heat: heat === 'on', fuel: fuel === 'on', air: air === 'on'};
    if (putOut !== 'nothing') has[TAKES_AWAY[putOut]] = false;
    const missing = Object.keys(has).filter(name => !has[name]);
    return {burning: missing.length === 0, missing, putOut, practice: practiceFire({cleared: putOut === 'cleared strip'})};
  },
  // The goal: the fire has been put out with water, with sand and with a cleared strip.
  goalMet: history => Object.keys(TAKES_AWAY).every(way => history.some(({result}) => result.putOut === way && !result.burning)),
  facts: () => ({uncleared: practiceFire(), cleared: practiceFire({cleared: true})}),
});
