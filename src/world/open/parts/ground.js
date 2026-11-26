// The host applies the choice. Walking, waiting and returning to known ground leave the world alone.
import {isDriven, squareAt} from '../open-record.js';

export const groundPart = {
  id: 'ground',
  step(state, {view, world}) {
    const car = view.carPosition;
    if (view.onFoot || !Number.isFinite(car?.x) || !Number.isFinite(car?.z)) return;
    const square = squareAt(car.x, car.z);
    if (square === state.lastSquare) return;
    const next = {lastSquare: square};
    if (square === null || isDriven(world, square)) return {state: next};
    return {state: next, choices: [{id: 'ground/' + square, effects: [{type: 'ground', square}]}]};
  },
};
