import {makeRng} from '../rng.js';

const turn = Math.PI * 2;
const pose = (pitch = 0, yaw = 0, roll = 0) => ({pitch: pitch * turn, yaw: yaw * turn, roll: roll * turn});
const secret = (id, name, code, points, duration, draw) => Object.freeze({
  id, name, code: Object.freeze(code.split(' ').filter(Boolean)), points, duration,
  pose: t => t <= 0 || t >= 1 ? pose() : draw(t),
});
export const SECRETS = Object.freeze([
  secret('yoYo', 'The Yo-Yo', '', 100, 0, t => pose(-Math.sin(Math.PI * t))),
  secret('corkscrew', 'The Corkscrew', 'Up Up Down Down', 300, 1, t => pose(-2*t, 0, 2*t)),
  secret('tornado', 'The Tornado', 'Left Left Right Right', 300, 1, t => pose(0, 4*t)),
  secret('rockingHorse', 'The Rocking Horse', 'Down Up Down Up', 300, 1,
    t => pose(t < .5 ? .22*Math.sin(8*Math.PI*t) : 2*t-1)),
  secret('gyro', 'The Gyro', 'Up Right Down Left', 350, 1, t => pose(t, t, t)),
  secret('tumbleDryer', 'The Tumble Dryer', 'Up Up Up Down Up', 400, 1,
    t => pose(t < .6 ? -3.5*t/.6 : t < .75 ? -3.5 : -3.5 + 1.5*(t-.75)/.25)),
  secret('fullWorks', 'The Full Works', 'Up Up Down Down Left Right Left Right', 1000, 1.2,
    t => pose(-2*t, 3*t, 2*t)),
]);
export const secretOf = id => SECRETS.find(trick => trick.id === id);
export function readCode(buffer, key, time, ground) {
  if (buffer.length && time - buffer.at(-1).time > (ground ? .6 : .4) + 1e-8) buffer.length = 0;
  buffer.push({key, time});
  if (buffer.length > 8) buffer.shift();
  return SECRETS.filter(s => s.code.length && (s.id === 'fullWorks') === ground &&
    s.code.length <= buffer.length && s.code.every((k, i) => buffer[buffer.length-s.code.length+i].key === k))
    .sort((a, b) => b.code.length - a.code.length)[0];
}
export function secretHint(seed, known) {
  const choices = SECRETS.filter(t => t.code.length && !known.includes(t.id));
  if (!choices.length) return '';
  const rng = makeRng(seed ?? 1989);
  const trick = choices[Math.floor(rng.float() * choices.length)];
  const hide = Math.floor(rng.float() * trick.code.length);
  return trick.code.map((key, i) => i === hide ? '?' : key).join(' ');
}
