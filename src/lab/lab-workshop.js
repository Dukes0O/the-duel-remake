// The workshop's two rules that have no bench of their own (docs/LAB.md 4.2): which protection each part of a car needs,
// worked out from the rust bench's own jars. Pure: a pick goes in, a verdict comes out.
import {JARS, jarAfter} from './benches/rust.js';

// More rust than this after the bench's week and the part is not protected.
export const RUST_OK = 0.1;
export const RUST_WEEK = 7;
export const PROTECTIONS = Object.freeze([
  Object.freeze({id: 'bare', name: 'Leave it bare'}),
  Object.freeze({id: 'zinc', name: 'Zinc coat'}),
]);
// jar: the bench jar that is how the part lives (the game does not wear armour out, so these are the lesson's own words).
const part = (id, name, jar, lives) => Object.freeze({id, name, jar, lives});
export const RUST_PARTS = Object.freeze([
  part('underbody', 'Underbody', 'salt', 'Splashed with salt water from the road all winter.'),
  part('exhaust', 'Exhaust', 'dry', 'Tucked up inside the car, where no water reaches it.'),
  part('armour', 'Armour plate', 'fresh', 'Out in the rain, in fresh water.'),
]);

// The rust after a week for a part with a protection: the bench's jars, with the zinc coat on or off.
export function rustOf(partId, protection) {
  const row = RUST_PARTS.find(item => item.id === partId), jar = JARS.find(item => item.id === row?.jar);
  if (!row || !jar || !PROTECTIONS.some(item => item.id === protection)) return null;
  return jarAfter({...jar, zinc: protection === 'zinc'}, RUST_WEEK).rust;
}

// The least protection that keeps the part clean: zinc only where the bare part would rust.
export function rightProtection(partId) {
  const bare = rustOf(partId, 'bare');
  return bare === null ? null : bare > RUST_OK ? 'zinc' : 'bare';
}

// picks: {underbody, exhaust, armour} -> {passed, rows: [{part, name, pick, right, ok, rust, bareRust}]}
export function checkProtections(picks) {
  const rows = RUST_PARTS.map(item => {
    const pick = picks?.[item.id] ?? null, right = rightProtection(item.id);
    return {part: item.id, name: item.name, pick, right, ok: pick === right, rust: rustOf(item.id, pick), bareRust: rustOf(item.id, 'bare')};
  });
  return {passed: rows.every(row => row.ok), rows};
}
