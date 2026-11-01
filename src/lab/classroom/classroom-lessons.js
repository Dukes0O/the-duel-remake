// Lessons rebuilt on the classroom pattern (docs/board/cards/LAB-CLASSROOM.md). A lesson listed
// here opens as a classroom when the `lab-classroom` switch is on; the rest keep the five-step frame.
import {lesson as pendulum} from '../lessons/pendulum-classroom.js';
import * as pendulumBoard from '../lessons/pendulum-board.js';
import {lesson as lift} from '../lessons/lift-classroom.js';
import * as liftBoard from '../lessons/lift-board.js';

export const CLASSROOM_LESSONS = Object.freeze({
  pendulum: Object.freeze({...pendulum, name: 'Pendulums', board: pendulumBoard}),
  lift: Object.freeze({...lift, name: 'Lift and weight', board: liftBoard}),
});
