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
// LAB-OPEN-DOOR: a lesson is shut only when its switch is off. A player's helicopter lessons and driving lessons are not
// read here; they are the conditions of the lesson's game challenge (challengeOpenState below).
export function lessonOpenState(profile, id, flags) {
  const row = LAB_LESSONS.find(item => item.id === id);
  if (!row) return {open: false, note: 'That lesson does not exist.'};
  const on = name => flags?.enabled?.(name) === true;
  if (!on('lab')) return {open: false, note: 'The Lab is not available yet.'};
  if (row.group === 'Flying') return on('helicopter') ? {open: true, note: ''} : {open: false, note: 'Opens with the helicopter'};
  if (row.group === 'Snow')
    return on('helicopter') && on('heli-skiing') ? {open: true, note: ''} : {open: false, note: 'Opens with heli-skiing'};
  return {open: true, note: ''};
}

// What a lesson's challenge needs from the player. A Flying challenge flies Kestrel One, so it needs the four helicopter
// lessons; a Wind tunnel challenge and the G-force lap are driven, so they need driving lesson 1. Both are one plain
// sentence that also says where to go.
export const CHALLENGE_NEEDS_HELI = 'This challenge needs the four helicopter lessons, so finish them first, at the HELIPAD button on the main menu.';
export const CHALLENGE_NEEDS_DRIVING = 'This challenge needs driving lesson 1, so pass it first, at the INSTRUCTOR button on the main menu.';

// {open, note}: the lesson's own state first, then the player's lessons. Passing a lesson also asks this, so a challenge
// that is shut cannot pass a lesson.
export function challengeOpenState(profile, id, flags) {
  const state = lessonOpenState(profile, id, flags);
  if (!state.open) return state;
  const row = LAB_LESSONS.find(item => item.id === id);
  if (row.group === 'Flying') {
    const flown = heliOf(profile).lessons;
    return HELI_LESSONS.every(name => flown[name] === true) ? state : {open: false, note: CHALLENGE_NEEDS_HELI};
  }
  if (row.group === 'Wind tunnel' || row.id === 'gforce') {
    // A driving-lesson field from a newer game is not read, and never makes the board fail.
    const driving = profile?.drivingLessons;
    const taught = isObject(driving) && driving.version === 1 && normalizeDrivingLessons(driving).done.corner === true;
    if (!taught) return {open: false, note: CHALLENGE_NEEDS_DRIVING};
  }
  return state;
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
