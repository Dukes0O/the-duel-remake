// Lessons rebuilt on the classroom pattern (docs/board/cards/LAB-CLASSROOM.md). A lesson listed
// here opens as a classroom when the `lab-classroom` switch is on; the rest keep the five-step frame.
import {lesson as pendulum} from '../lessons/pendulum-classroom.js';
import * as pendulumBoard from '../lessons/pendulum-board.js';
import {lesson as lift} from '../lessons/lift-classroom.js';
import * as liftBoard from '../lessons/lift-board.js';
import {lesson as projectile} from '../lessons/projectile-classroom.js';
import * as projectileBoard from '../lessons/projectile-board.js';
import {lesson as headings} from '../lessons/headings-classroom.js';
import * as headingsBoard from '../lessons/headings-board.js';
import {lesson as wax} from '../lessons/wax-classroom.js';
import * as waxBoard from '../lessons/wax-board.js';
import {lesson as fuel} from '../lessons/fuel-classroom.js';
import * as fuelBoard from '../lessons/fuel-board.js';
import {lesson as strength} from '../lessons/strength-classroom.js';
import * as strengthBoard from '../lessons/strength-board.js';

export const CLASSROOM_LESSONS = Object.freeze({
  pendulum: Object.freeze({...pendulum, name: 'Pendulums', board: pendulumBoard}),
  lift: Object.freeze({...lift, name: 'Lift and weight', board: liftBoard}),
  projectile: Object.freeze({...projectile, name: 'Projectile motion', board: projectileBoard}),
  headings: Object.freeze({...headings, name: 'Headings and maps', board: headingsBoard}),
  wax: Object.freeze({...wax, name: 'Ski wax', board: waxBoard}),
  fuel: Object.freeze({...fuel, name: 'Fuel and weight', board: fuelBoard}),
  strength: Object.freeze({...strength, name: 'Strength against weight', board: strengthBoard}),
});
