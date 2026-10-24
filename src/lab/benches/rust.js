// Rust (docs/LAB.md 4.2): four steel nails in jars for a week, fast-forwarded: dry air, fresh water, salt water,
// and a zinc-coated nail in salt water. A scripted time-lapse, not a simulation: iron rusts when water AND oxygen
// reach it, salt water much faster, and a zinc coat is used up first and keeps the steel clean while it lasts.
import {control, makeBench} from './bench-core.js';

// Share of the nail rusted per day (fresh water, salt water), and the days a zinc coat lasts in salt water.
export const RUST = Object.freeze({freshPerDay: 0.02, saltPerDay: 0.12, zincLastDays: 20});
export const JARS = Object.freeze([
  Object.freeze({id: 'dry', name: 'Dry air', water: false, salt: false, zinc: false}),
  Object.freeze({id: 'fresh', name: 'Fresh water', water: true, salt: false, zinc: false}),
  Object.freeze({id: 'salt', name: 'Salt water', water: true, salt: true, zinc: false}),
  Object.freeze({id: 'zinc', name: 'Zinc coat in salt water', water: true, salt: true, zinc: true}),
]);

export function jarAfter(jar, days) {
  if (!jar.water) return {id: jar.id, rust: 0, zincLeft: jar.zinc ? 1 : null};
  const perDay = jar.salt ? RUST.saltPerDay : RUST.freshPerDay;
  if (!jar.zinc) return {id: jar.id, rust: Math.min(1, perDay * days), zincLeft: null};
  // The zinc corrodes first; the steel only starts to rust when it is gone.
  const zincLeft = Math.max(0, 1 - days / RUST.zincLastDays);
  return {id: jar.id, rust: zincLeft > 0 ? 0 : Math.min(1, perDay * (days - RUST.zincLastDays)), zincLeft};
}

const controls = [control('days', 'Days', 'days', 0, 7, 1, 0)];

export const rustBench = makeBench({
  id: 'rust', controls, cues: ['lab.fizz'],
  run: ({days}) => ({days, jars: JARS.map(jar => jarAfter(jar, days))}),
  goalMet: history => history.some(({result}) => result.days === 7),
  facts: () => ({daySeven: Object.fromEntries(JARS.map(jar => [jar.id, jarAfter(jar, 7)])),
    saltOverFresh: RUST.saltPerDay / RUST.freshPerDay}),
});
