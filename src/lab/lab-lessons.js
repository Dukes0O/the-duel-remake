// The Lab's sixteen lessons and when each opens (docs/LAB.md sections 3 and 4).
// Pure rules: a profile and the switches go in, rows for the shared lesson board
// (src/lessons/lesson-board.js) come out. Nothing here draws, saves or reads a clock.
import {HELI_LESSONS, heliOf} from '../heli/heli-save.js';
import {normalizeDrivingLessons} from '../lessons/drive-lesson-save.js';

export const LAB_GROUPS = Object.freeze(['Flying', 'Workshop', 'Wind tunnel', 'Snow']);

const lesson = (id, name, group) => Object.freeze({id, name, group});
// Each group lists its lessons in this order; any open lesson can be taken in any order.
export const LAB_LESSONS = Object.freeze([
  lesson('lift', 'Lift and weight', 'Flying'), lesson('projectile', 'Projectile motion', 'Flying'),
  lesson('fire', 'Fire triangle', 'Flying'), lesson('pendulum', 'Pendulums', 'Flying'),
  lesson('altitude', 'Air and altitude', 'Flying'),
  lesson('strength', 'Strength against weight', 'Workshop'), lesson('rust', 'Rust', 'Workshop'),
  lesson('gforce', 'G-force', 'Workshop'), lesson('headings', 'Headings and maps', 'Workshop'),
  lesson('grip', 'Grip', 'Wind tunnel'), lesson('downforce', 'Downforce', 'Wind tunnel'),
  lesson('braking', 'Braking', 'Wind tunnel'), lesson('suspension', 'Suspension', 'Wind tunnel'),
  lesson('fuel', 'Fuel', 'Wind tunnel'),
  lesson('launch', 'Launch angles', 'Snow'), lesson('wax', 'Ski wax', 'Snow'),
]);

// Rewards that cost nothing are granted the moment the lesson is passed.
export const FREE_REWARDS = Object.freeze({launch: Object.freeze(['aerials'])});

// Each wind-tunnel lesson opens one tuning setting, free (section 5.1).
export const TUNE_SETTING_OF = Object.freeze({grip: 'pressure', downforce: 'wing', braking: 'brakes', suspension: 'springs', fuel: 'fuel'});
export const TUNNEL_LESSONS = Object.freeze(Object.keys(TUNE_SETTING_OF));

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const doneOf = profile => {
  const lab = profile?.lab;
  return isObject(lab) && lab.version === 1 && isObject(lab.done) ? lab.done : {};
};

// {open, note}: note says why a shut lesson is shut, and is '' when it is open.
export function lessonOpenState(profile, id, flags) {
  const row = LAB_LESSONS.find(item => item.id === id);
  if (!row) return {open: false, note: 'That lesson does not exist.'};
  const on = name => flags?.enabled?.(name) === true;
  if (!on('lab')) return {open: false, note: 'The Lab is not available yet.'};
  // A driving-lesson field from a newer game is not read, and never makes the board fail.
  const driving = profile?.drivingLessons;
  const taught = isObject(driving) && driving.version === 1 && normalizeDrivingLessons(driving).done.corner === true;
  if (row.group === 'Flying') {
    if (!on('helicopter')) return {open: false, note: 'Opens with the helicopter'};
    const flown = heliOf(profile).lessons;
    return HELI_LESSONS.every(name => flown[name] === true)
      ? {open: true, note: ''} : {open: false, note: 'Finish the helicopter lessons first'};
  }
  if (row.group === 'Snow')
    return on('helicopter') && on('heli-skiing') ? {open: true, note: ''} : {open: false, note: 'Opens with heli-skiing'};
  if ((row.group === 'Wind tunnel' || row.id === 'gforce') && !taught)
    return {open: false, note: 'Opens after driving lesson 1'};
  return {open: true, note: ''};
}

// Rows for the shared board: {group, id, name, open, done, note}. Empty while the Lab is off.
export function lessonRows(profile, flags) {
  if (flags?.enabled?.('lab') !== true) return [];
  const done = doneOf(profile);
  return LAB_LESSONS.map(({id, name, group}) => {
    const {open, note} = lessonOpenState(profile, id, flags);
    return {group, id, name, open, done: done[id] === true, note};
  });
}
