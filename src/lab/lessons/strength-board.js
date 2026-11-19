// The Strength lesson's board (docs/board/cards/LAB-CLASSROOM-STRENGTH.md): a vice clamping a test bar or a hook arm
// side on, drawn to scale, with its load at the tip (10 kg weights, the ram, or the 2,000 kg car on its sling); the
// Strength used and Dips gauges; arrows that show the top of the part stretched and the bottom squeezed; the end of the
// part drawn to scale; the rack of three materials and the thickness handle; the free test's table and Brian's job card.
// Draws and hit-tests only.
import {BOARD, theme, background, floor, cardScene, shadow, rope, cable, steel, bolt, bezel, lcd, shade, grain, text, keyCap, wrap, fitBoard, helicopter, car as slungCar} from '../classroom/board-art.js';
import {NAMES, LIGHTEST, CAR_KG, DIP_MM, WEIGHT_KG, pct, mm1, kg1, failKg, barMm} from './strength-classroom.js';
import {GRAVITY, MATERIALS} from '../benches/strength.js';
export {BOARD};
export const pressMovesDrag = false;

// Board units per millimetre: every bar and arm is 500 mm long, 380 units, and as thick as it really is.
const PX = .76, ROOT_X = 120, LEN = 500 * PX, TIP_X = ROOT_X + LEN, FLOOR = 580;
const SINGLE_Y = 220;
const rowsY = n => n === 1 ? [SINGLE_Y] : n === 2 ? [190, 420] : [150, 320, 490];
// The bottom strip: the rack of materials on the left, the thickness handle on the right.
const RACK_Y = 636, RACK_X = Object.freeze([150, 300, 450]);
const HANDLE = Object.freeze({down: [660, 636], up: [900, 636]});
const PANEL_X = 580;
const STRETCH = '#f07a5a', SQUEEZE = '#70bfd2', LABEL = 'rgba(227,220,203,.72)';
const name = material => MATERIALS[material].name;
const kg0 = kg => `${Math.round(kg).toLocaleString('en-GB')} kg`;

const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const rigScene = view => view.scene === 'rig';
const single = view => view.rigs.length === 1;
// Where the tip of a rig is now: the bar's end, lowered by its dip (drawn to scale) or its bend.
const BENT = Object.freeze({single: 140, compact: 70});
const SECTION = Object.freeze({x: 700, y: 296, w: 260, h: 276});
function tipOf(rig, y, compact = false) {
  const dip = rig.state === 'bent' ? (compact ? BENT.compact : BENT.single) * bendShare(rig) : rig.dipMm == null ? 0 : Math.min(rig.dipMm * PX, 160);
  return [TIP_X, y + dip];
}
const bendShare = rig => rig.brokeAge == null ? 1 : Math.min(1, rig.brokeAge * 4);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!rigScene(view)) return null;
  for (const [i, rx] of RACK_X.entries()) if (view.keys[String(i + 1)] === `material:${i}` && inBox(x, y, [rx, RACK_Y], 130, 60)) return {action: `material:${i}`};
  if (view.keys['↑'] === 'thick:up' && inBox(x, y, HANDLE.up, 120, 54)) return {action: 'thick:up'};
  if (view.keys['↓'] === 'thick:down' && inBox(x, y, HANDLE.down, 120, 54)) return {action: 'thick:down'};
  if (view.keys['↑'] === 'load:add' && x > TIP_X - 60 && x < TIP_X + 60 && y > SINGLE_Y && y < FLOOR) return {action: 'load:add'};
  if (view.keys.Space === 'go' && x > TIP_X - 110 && x < TIP_X + 70 && y > 100 && y < FLOOR + 6) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!rigScene(view)) return null;
  if (view.rack) for (const [i, rx] of RACK_X.entries()) if (inBox(x, y, [rx, RACK_Y], 130, 60))
    return {aluminium: 'Aluminium is a light metal that bends for good before it breaks.', steel: 'Steel is a heavy metal that bends for good before it breaks.', 'carbon fibre': 'Carbon fibre is very light and strong for its weight, but it is brittle, so it snaps.'}[NAMES[i]];
  if (view.handle && (inBox(x, y, HANDLE.up, 120, 54) || inBox(x, y, HANDLE.down, 120, 54))) return view.handle.locked ? 'Brian has set the thickness handle for this test.' : 'Each press of the thickness handle makes the arm 10 mm thicker or thinner.';
  if (x > 40 && x < ROOT_X + 4 && y > 80 && y < FLOOR) return 'The vice holds one end of the part still.';
  if (view.density && x > PANEL_X && y > 50 && y < FLOOR) return 'Every bar here weighs 1 kg, so a material with a lower density makes a thicker bar.';
  if (view.section && x > SECTION.x && y > SECTION.y) return 'This is the end of the bar. The top half is stretched and the bottom half is squeezed.';
  if (x > PANEL_X && y > 50 && y < 300 && single(view)) return x < 780 ? 'The Strength used gauge shows the stress as a percentage of the strength. Past 100%, a metal bends for good and a brittle material snaps.' : 'The Dips gauge shows how far the end of the part goes down under the load.';
  if (view.rigs[0]?.kind === 'arm' && x > TIP_X - 110 && x < TIP_X + 110 && y > 300 && y < FLOOR) return `The car weighs ${kg0(CAR_KG)}.`;
  if (x > ROOT_X && x < TIP_X + 10 && y > 80 && y < FLOOR) return 'This part is half a metre long, and it is drawn as thick as it really is.';
  return null;
}
export function targetPoint(view, action) {
  if (!rigScene(view)) return null;
  const [y0] = rowsY(view.rigs.length);
  if (action === 'build:best' && view.best && view.rack) {
    if (view.rack.chosen !== view.best.material) return [RACK_X[NAMES.indexOf(view.best.material)], RACK_Y - 6];
    if (view.handle) return view.handle.mm < view.best.mm ? HANDLE.up : HANDLE.down;
  }
  if (action?.startsWith('material:')) return [RACK_X[Number(action.slice(9))], RACK_Y - 6];
  if (action === 'thick:up') return HANDLE.up;
  if (action === 'thick:down') return HANDLE.down;
  if (action === 'load:add') return [TIP_X, y0 + 70];
  if (action === 'go') return view.ramKg != null && single(view) ? [TIP_X, FLOOR - 70] : single(view) ? [TIP_X, FLOOR - 50] : [TIP_X, y0 + 90];
  // Sparks fly from the tip of the bar or arm.
  const rig = view.rigs[0];
  return rig ? tipOf(rig, y0) : [BOARD.width / 2, BOARD.height / 2];
}
export function dragAngle() { return 0; }

// ---- pieces ----
function glowBox(ctx, view, x, y, w, h) {
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke(); ctx.globalAlpha = 1;
}
// The material's look, for the rectangle (x, y, w, h), which is the stretch from u0 to u0 + w along a bar `total` long:
// aluminium pale and brushed, steel darker with a blue-grey sheen, carbon fibre black with a woven twill.
function fillMaterial(ctx, material, x, y, w, h, u0 = 0, total = w) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (material === 'aluminium') { g.addColorStop(0, '#fafcfc'); g.addColorStop(.2, '#e1e8eb'); g.addColorStop(.6, '#aab5bb'); g.addColorStop(1, '#78838a'); }
  else if (material === 'steel') { g.addColorStop(0, '#ced9e0'); g.addColorStop(.14, '#8d9ca8'); g.addColorStop(.5, '#4e5d69'); g.addColorStop(.85, '#2c3843'); g.addColorStop(1, '#18202a'); }
  else { g.addColorStop(0, '#474f56'); g.addColorStop(.25, '#262b30'); g.addColorStop(1, '#101214'); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (h < 3) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (material === 'carbon fibre') {
    // A twill weave: two sets of fine diagonals, lined up along the whole bar.
    const step = 6, from = -Math.ceil(h / step) * step - (u0 % step);
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath();
    for (let k = from; k < w; k += step) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); }
    ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.beginPath();
    for (let k = from; k < w; k += step) { ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x, y + h * .14, w, Math.max(1, h * .06));
  } else {
    // Fine lines along the metal where it was brushed or rolled: each one runs for part of the bar.
    const lines = Math.max(3, Math.min(36, Math.round(h / 2.2)));
    ctx.lineWidth = .8;
    for (let k = 0; k < lines; k++) {
      const a = grain(k * 3 + 1) * total * .6, b = a + total * (.25 + .5 * grain(k * 3 + 2)), from = Math.max(a, u0), to = Math.min(b, u0 + w);
      if (to <= from) continue;
      ctx.strokeStyle = grain(k + 50) > .5 ? 'rgba(255,255,255,.2)' : 'rgba(30,40,50,.12)';
      const ly = y + (k + .5) / lines * h; ctx.beginPath(); ctx.moveTo(x + from - u0, ly); ctx.lineTo(x + to - u0, ly); ctx.stroke();
    }
    ctx.fillStyle = material === 'steel' ? 'rgba(225,238,248,.30)' : 'rgba(255,255,255,.45)'; ctx.fillRect(x, y + h * .12, w, Math.max(1, h * .05));
  }
  ctx.restore();
}
// The frame the rigs are bolted to: a steel upright from the first vice down to the floor, on a base plate.
function frame(ctx, ys) {
  const top = ys[0] - 84;
  steel(ctx, 34, top, 24, FLOOR - top, 3);
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(48, top + 2, 8, FLOOR - top - 2);
  for (let y = top + 16; y < FLOOR - 20; y += 52) bolt(ctx, 41, y, 2.6);
  steel(ctx, 24, FLOOR - 9, 56, 9, 2); bolt(ctx, 31, FLOOR - 4.5, 2); bolt(ctx, 73, FLOOR - 4.5, 2);
}
// A clamp: a steel block on the frame, and two toothed jaws that grip the bar top and bottom.
function vice(ctx, y, t) {
  steel(ctx, 56, y - 70, 64, 140, 4);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(62, y - 62, 52, 124);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(62, y - 62, 52, 1);
  for (const dy of [-50, 50]) { bolt(ctx, 88, y + dy, 5); bolt(ctx, 70, y + dy, 3.2); }
  // The jaws close on the bar, each with a row of teeth against it and a screw through it.
  for (const [jy, dir] of [[y - t / 2 - 20, 1], [y + t / 2, -1]]) {
    steel(ctx, ROOT_X - 26, jy, 30, 20, 2);
    const face = dir > 0 ? jy + 20 : jy;
    ctx.fillStyle = '#12171a'; ctx.beginPath(); ctx.moveTo(ROOT_X - 24, face);
    for (let k = 0; k < 7; k++) { ctx.lineTo(ROOT_X - 24 + k * 4 + 2, face - dir * 3); ctx.lineTo(ROOT_X - 24 + (k + 1) * 4, face); }
    ctx.closePath(); ctx.fill();
    bolt(ctx, ROOT_X - 14, jy + 10, 3.6);
  }
}
// A bar or arm along a cantilever's curve: dip at the tip, d(s) = dip s^2 (3 - s) / 2 along its length. It is cut into
// thin slices that each follow the slope of the curve, so that the metal's lines and weave bend with the bar.
function beam(ctx, material, y, t, dip, from = 0, to = 1) {
  const n = 24, top = [], bottom = [], at = s => dip * s * s * (3 - s) / 2;
  for (let i = 0; i <= n; i++) {
    const s = from + (to - from) * i / n, d = at(s), x = ROOT_X + s * LEN;
    top.push([x, y - t / 2 + d]); bottom.push([x, y + t / 2 + d]);
  }
  // The bar's shadow on the wall behind it.
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(top[0][0] + 3, top[0][1] + 6);
  for (const p of top.slice(1)) ctx.lineTo(p[0] + 3, p[1] + 6);
  for (const p of [...bottom].reverse()) ctx.lineTo(p[0] + 3, p[1] + 6);
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < n; i++) {
    const s0 = from + (to - from) * i / n, s1 = from + (to - from) * (i + 1) / n, dx = (s1 - s0) * LEN, slope = (at(s1) - at(s0)) / dx;
    ctx.save(); ctx.transform(1, slope, 0, 1, ROOT_X + s0 * LEN, y - t / 2 + at(s0));
    fillMaterial(ctx, material, 0, 0, dx + .8, t, s0 * LEN, LEN);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(...top[0]);
  for (const p of top.slice(1)) ctx.lineTo(...p);
  for (const p of [...bottom].reverse()) ctx.lineTo(...p);
  ctx.closePath(); ctx.stroke();
  if (t > 3) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1] + .8); for (const p of top.slice(1)) ctx.lineTo(p[0], p[1] + .8); ctx.stroke(); }
}
// The broken faces of a snapped bar: teeth along the break, deeper than the bar is thin, that fit one into the other.
const toothDepth = t => Math.min(9, 3 + t * .25), teeth = t => Math.max(3, Math.round(t / 5));
function breakEdge(ctx, t, x, side) {
  // The points down a break at x, top to bottom; side 1 for the stub, whose teeth reach out to the right, and -1 for the piece.
  const n = teeth(t), depth = toothDepth(t), points = [];
  for (let k = 0; k <= n; k++) points.push([x + (side > 0 ? (k % 2 ? 0 : depth) : (k % 2 ? depth : 0)), -t / 2 + t * k / n]);
  return points;
}
// Fibres and splinters thrown off at the break, spreading as the pieces part.
function splinters(ctx, material, x, y, t, spread) {
  const colour = material === 'carbon fibre' ? '#cfcab8' : '#e8edf0';
  for (let k = 0; k < 9; k++) {
    const a = (grain(k + 900) - .5) * 1.6, reach = (4 + 12 * grain(k + 910)) * (.4 + .6 * spread), sx = x + 4 + Math.cos(a) * reach, sy = y + (grain(k + 920) - .5) * t + Math.sin(a) * reach + 9 * spread * spread * grain(k + 930);
    ctx.strokeStyle = colour; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y + (grain(k + 920) - .5) * t); ctx.lineTo(sx, sy); ctx.stroke();
    if (k % 3 === 0) { ctx.fillStyle = material === 'carbon fibre' ? '#1b1e21' : '#9aa5ab'; ctx.beginPath(); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx + 3.5, sy + 1.5); ctx.lineTo(sx - 1, sy + 2); ctx.closePath(); ctx.fill(); }
  }
}
function rig(ctx, view, r, y, {compact = false} = {}) {
  const t = Math.max(2, r.mm * PX);
  vice(ctx, y, t);
  if (r.state === 'snapped') {
    // Snapped at the vice: a stub stays, the rest turns over and falls to the floor.
    const age = r.brokeAge ?? 9, fall = Math.min(1, age * 2.2);
    beam(ctx, r.material, y, t, 0, 0, .04);
    const px = ROOT_X + .04 * LEN, py = y + (compact ? 40 : FLOOR - 14 - y) * fall * fall;
    // The stub keeps teeth where it broke; the rest of the bar turns over and falls with the matching teeth.
    const stub = breakEdge(ctx, t, px - .5, 1);
    ctx.save(); ctx.translate(0, y); ctx.beginPath(); ctx.moveTo(px - 1, -t / 2); for (const q of stub) ctx.lineTo(...q); ctx.lineTo(px - 1, t / 2); ctx.closePath(); ctx.clip();
    ctx.translate(0, -y); fillMaterial(ctx, r.material, px - 1, y - t / 2, toothDepth(t) + 2, t, .04 * LEN - 1, LEN); ctx.restore();
    ctx.save(); ctx.translate(0, y); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (const [i, q] of stub.entries()) ctx[i ? 'lineTo' : 'moveTo'](...q); ctx.stroke(); ctx.restore();
    if (!compact) shadow(ctx, px + LEN * .5, FLOOR + 8, LEN * .5, .4 * fall);
    ctx.save();
    ctx.translate(px, py); ctx.rotate((compact ? .1 : .12) * fall); ctx.globalAlpha = compact ? 1 - fall * .45 : 1;
    const piece = breakEdge(ctx, t, 0, -1), end = LEN * .96;
    ctx.beginPath(); piece.forEach(([qx, qy], i) => ctx[i ? 'lineTo' : 'moveTo'](qx, qy)); ctx.lineTo(end, t / 2); ctx.lineTo(end, -t / 2); ctx.closePath();
    ctx.save(); ctx.clip(); fillMaterial(ctx, r.material, 0, -t / 2, end, t, .04 * LEN, LEN); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
    splinters(ctx, r.material, px, y, t, Math.min(1, fall * 1.4));
  } else beam(ctx, r.material, y, t, r.state === 'bent' ? (compact ? BENT.compact : BENT.single) * bendShare(r) : Math.min((r.dipMm ?? 0) * PX, 160));
  const label = r.kind === 'arm' ? `${name(r.material)} · ${r.mm} mm thick · ${kg1(r.massKg)}` : `${name(r.material)} · ${mm1(r.mm)} thick · 1 kg`;
  text(ctx, label, ROOT_X + LEN / 2, y - t / 2 - (compact ? 20 : 50), {size: compact ? 17 : 20, colour: theme.text});
  if (!compact) {
    lengthMark(ctx, y - t / 2 - 78);
    if (r.state === 'ok') strain(ctx, y, t, Math.min((r.dipMm ?? 0) * PX, 160), r.used);
  }
  const [tx, ty] = tipOf(r, y, compact);
  if (r.weights != null) weights(ctx, view, r, tx, ty, y, compact);
  if (r.ram) ram(ctx, view, r, tx, ty, y, compact);
  if (r.kind === 'arm') hangingCar(ctx, r, tx, ty, y, compact);
}
// The length of the part, as the sums use it.
function lengthMark(ctx, y) {
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ROOT_X, y); ctx.lineTo(TIP_X, y); ctx.moveTo(ROOT_X, y - 6); ctx.lineTo(ROOT_X, y + 6); ctx.moveTo(TIP_X, y - 6); ctx.lineTo(TIP_X, y + 6); ctx.stroke();
  ctx.fillStyle = theme.back[1]; ctx.fillRect(ROOT_X + LEN / 2 - 32, y - 9, 64, 18);
  text(ctx, '500 mm', ROOT_X + LEN / 2, y, {size: 14, colour: theme.ghost});
}
// How the load works the part: the top is stretched and the bottom squeezed, most of all at the vice. The arrows grow with the load.
function strain(ctx, y, t, dip, used) {
  if (used < .005) return;
  const pair = (x, ay, half, outward, colour) => {
    ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - half, ay); ctx.lineTo(x + half, ay); ctx.stroke();
    // Stretched arrows point away from each other; squeezed arrows point towards each other.
    for (const side of [-1, 1]) {
      const tip = outward ? x + side * half : x + side * 2, back = outward ? -side : side;
      ctx.beginPath(); ctx.moveTo(tip, ay); ctx.lineTo(tip + back * 7, ay - 4); ctx.lineTo(tip + back * 7, ay + 4); ctx.closePath(); ctx.fill();
    }
  };
  for (const s of [.09, .27, .45]) {
    const x = ROOT_X + s * LEN, d = dip * s * s * (3 - s) / 2, half = 10 + 20 * Math.min(1, used) * (1 - s);
    pair(x, y - t / 2 + d - 10, half, true, STRETCH);
    pair(x, y + t / 2 + d + 10, half, false, SQUEEZE);
  }
  text(ctx, 'top stretched', ROOT_X + 8, y - t / 2 - 26, {size: 14, align: 'left', colour: STRETCH, weight: 800});
  text(ctx, 'bottom squeezed', ROOT_X + 8, y + t / 2 + 28, {size: 14, align: 'left', colour: SQUEEZE, weight: 800});
}
// The end of a part, drawn to scale, with its top half stretched and its bottom half squeezed as the load grows.
function endOf(ctx, material, cx, cy, wide, thick, scale, used) {
  const w = wide * scale, h = thick * scale, x = cx - w / 2, y = cy - h / 2;
  fillMaterial(ctx, material, x, y, w, h);
  if (used > 0) {
    ctx.globalAlpha = Math.min(.75, used * .75);
    ctx.fillStyle = STRETCH; ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = SQUEEZE; ctx.fillRect(x, y + h / 2, w, h / 2);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(245,240,220,.65)'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
  return {x, y, w, h};
}
function sectionPanel(ctx, r) {
  const {x, y, w, h} = SECTION, cx = x + w / 2, cy = y + 132;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); bezel(ctx, x, y, w, h);
  text(ctx, 'THE END OF THE BAR', x + 14, y + 18, {size: 12, align: 'left', colour: LABEL, weight: 800});
  const box = endOf(ctx, r.material, cx, cy, 40, r.mm, 5, r.state === 'ok' ? r.used : 0);
  if (r.state === 'ok' && r.used > 0) {
    text(ctx, 'stretched', cx, box.y - 13, {size: 14, colour: STRETCH, weight: 800});
    text(ctx, 'squeezed', cx, box.y + box.h + 13, {size: 14, colour: SQUEEZE, weight: 800});
  }
  text(ctx, `40 mm wide, ${mm1(r.mm)} thick`, cx, y + h - 20, {size: 15});
}
// Density: the end of the 1 kg bar to scale, and how the three densities compare.
function densityPanel(ctx, view) {
  const x = PANEL_X, y = 40, w = 380, {material, densities} = view.density, mm = barMm(material), cx = x + 150, cy = y + 140;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, 530, 8); ctx.fill(); bezel(ctx, x, y, w, 530);
  text(ctx, 'THE END OF THE 1 KG BAR, DRAWN TO SCALE', x + 16, y + 20, {size: 12, align: 'left', colour: LABEL, weight: 800});
  const box = endOf(ctx, material, cx, cy, 40, mm, 5, 0);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(box.x + box.w + 14, box.y); ctx.lineTo(box.x + box.w + 14, box.y + box.h); ctx.moveTo(box.x + box.w + 8, box.y); ctx.lineTo(box.x + box.w + 20, box.y); ctx.moveTo(box.x + box.w + 8, box.y + box.h); ctx.lineTo(box.x + box.w + 20, box.y + box.h); ctx.stroke();
  text(ctx, mm1(mm), box.x + box.w + 28, cy, {size: 22, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, '40 mm wide', cx, y + 244, {size: 15});
  text(ctx, 'DENSITY, IN KILOGRAMS PER CUBIC METRE', x + 16, y + 290, {size: 12, align: 'left', colour: LABEL, weight: 800});
  const most = Math.max(...densities.map(d => d.density));
  densities.forEach((d, i) => {
    const rowY = y + 330 + i * 46, on = d.material === material, length = 130 * d.density / most;
    text(ctx, name(d.material), x + 16, rowY, {size: 17, align: 'left', colour: on ? theme.accent : theme.text});
    fillMaterial(ctx, d.material, x + 130, rowY - 9, length, 18);
    text(ctx, `${d.density.toLocaleString('en-GB')} kg/m³`, x + 138 + length, rowY, {size: 16, align: 'left', colour: on ? theme.accent : theme.text});
  });
  text(ctx, 'For the same weight, a lower density makes a thicker bar.', x + w / 2, y + 494, {size: 15, colour: theme.text});
}
// The weight hanger: 10 kg discs under the tip; ready on the floor below until they go on.
function weights(ctx, view, r, tx, ty, y, compact) {
  const n = r.weights, ready = r.weightsReady && !n;
  const top = ready ? y + (compact ? 70 : 150) : ty + 6;
  const rodTop = ready ? ty + 4 : ty, rodBottom = ready ? ty + 26 : top + 18;
  const rod = ctx.createLinearGradient(tx - 6, 0, tx - 2, 0); rod.addColorStop(0, '#f2f6f7'); rod.addColorStop(1, '#6b757b');
  ctx.fillStyle = rod; ctx.fillRect(tx - 5.5, rodTop, 3.2, Math.max(0, rodBottom - rodTop));
  ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(tx - 4, rodTop - 1, 3, 0, Math.PI * 2); ctx.stroke();
  const discs = Math.max(n, ready ? 1 : 0);
  for (let i = 0; i < discs; i++) {
    const dy = top + 20 + i * 20;
    // A cast iron disc with a lit top edge, a brass ring painted round it and a slot for the hanger.
    const iron = ctx.createLinearGradient(0, dy, 0, dy + 18); iron.addColorStop(0, '#79848a'); iron.addColorStop(.3, '#414a4f'); iron.addColorStop(1, '#15191b');
    ctx.fillStyle = iron; ctx.beginPath(); ctx.roundRect(tx - 40, dy, 72, 18, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(tx - 37, dy + 1, 66, 1);
    const band = ctx.createLinearGradient(0, dy + 7, 0, dy + 11); band.addColorStop(0, theme.brass[0]); band.addColorStop(.5, theme.brass[1]); band.addColorStop(1, theme.brass[2]);
    ctx.fillStyle = band; ctx.fillRect(tx - 40, dy + 7, 72, 4);
    ctx.fillStyle = '#050607'; ctx.fillRect(tx - 6.5, dy, 5, 18);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(tx - 40, dy, 72, 18, 4); ctx.stroke();
  }
  if (discs) text(ctx, `${discs * WEIGHT_KG} kg`, tx + 42, top + 20 + discs * 10, {size: 17, align: 'left', colour: theme.text});
  if (n && !compact) text(ctx, `${(n * WEIGHT_KG * GRAVITY).toFixed(1)} N`, tx + 42, top + 40 + discs * 10, {size: 15, align: 'left', colour: theme.accent});
  if (view.glow === 'weights' && !compact) glowBox(ctx, view, tx - 60, ty - 10, 150, Math.max(120, discs * 20 + 70));
  if (view.glow === 'weights' && compact) glowBox(ctx, view, tx - 40, y + 40, 120, 80);
}
// The ram: a hydraulic cylinder on the floor pulling the tip down, with its load on a readout.
function ram(ctx, view, r, tx, ty, y, compact) {
  if (compact) {
    if (r.state !== 'snapped') {
      const rod = ctx.createLinearGradient(tx - 8, 0, tx, 0); rod.addColorStop(0, '#f2f6f7'); rod.addColorStop(1, '#5d676d');
      ctx.fillStyle = rod; ctx.fillRect(tx - 7, ty, 6, 36);
    }
    return;
  }
  const body = FLOOR - 120;
  shadow(ctx, tx, FLOOR + 6, 60, .5);
  // The piston rod, polished chrome, comes out of the red cylinder, which stands on a bolted base plate.
  const rod = ctx.createLinearGradient(tx - 7, 0, tx + 1, 0); rod.addColorStop(0, '#6b757b'); rod.addColorStop(.35, '#f4f8f9'); rod.addColorStop(.7, '#9aa4aa'); rod.addColorStop(1, '#3d464b');
  ctx.fillStyle = rod; ctx.fillRect(tx - 7, ty, 8, Math.max(0, body - ty));
  ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx - 3, ty - 2, 3.6, 0, Math.PI * 2); ctx.stroke();
  const paint = ctx.createLinearGradient(tx - 26, 0, tx + 18, 0); paint.addColorStop(0, '#d3604a'); paint.addColorStop(.3, '#a8412e'); paint.addColorStop(1, '#4b1d13');
  ctx.fillStyle = paint; ctx.beginPath(); ctx.roundRect(tx - 26, body, 44, 120, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(tx - 22, body + 6, 3, 100);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(tx - 26, body + 40, 44, 2); ctx.fillRect(tx - 26, body + 80, 44, 2);
  steel(ctx, tx - 29, body - 6, 50, 9, 2); steel(ctx, tx - 34, FLOOR - 10, 60, 10, 2);
  bolt(ctx, tx - 29, FLOOR - 5, 2.4); bolt(ctx, tx + 21, FLOOR - 5, 2.4);
  // The hose to the pump's readout.
  ctx.strokeStyle = '#0e1214'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx + 18, body + 78); ctx.quadraticCurveTo(tx + 30, body + 90, tx + 34, body + 56); ctx.stroke();
  ctx.fillStyle = '#050a07'; ctx.beginPath(); ctx.roundRect(tx + 34, body + 20, 150, 50, 5); ctx.fill();
  lcd(ctx, tx + 34, body + 20, 150, 50, '#56d683'); bezel(ctx, tx + 32, body + 18, 154, 54, 6);
  text(ctx, 'RAM', tx + 109, body + 8, {size: 12, colour: LABEL, weight: 800});
  text(ctx, kg0(view.ramKg ?? 0), tx + 109, body + 46, {size: 24, colour: '#9ff0b4', weight: 800});
  if (view.glow === 'ram') glowBox(ctx, view, tx - 40, body - 10, 236, 140);
}
// The 2,000 kg car on its sling: on the floor with the cable slack, lifted as its weight comes onto the arm.
function hangingCar(ctx, r, tx, ty, y, compact) {
  // The car's wheels stand on the floor: they reach 23 units below its middle at scale 1.
  const scale = compact ? 1.25 : 2, ground = compact ? y + 120 : FLOOR - 23 * scale;
  const broke = r.state !== 'ok', lift = broke ? 0 : r.lower * (compact ? 14 : 26);
  const cy = ground - lift, top = cy - 20 * scale;
  if (!compact) shadow(ctx, tx - 4, FLOOR + 6, 52 * scale, Math.max(.2, .6 - lift * .01));
  if (r.state !== 'snapped') {
    const slack = broke ? 1 : 1 - r.lower;
    rope(ctx, tx - 4, ty + 4, tx - 4 + 40 * slack, (ty + top) / 2, tx - 4, top, 2);
    ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx - 4, ty + 8, 4.2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.save(); ctx.translate(tx - 4, cy); ctx.scale(scale, scale); slungCar(ctx, 0, 0, 0); ctx.restore();
  text(ctx, kg0(CAR_KG), tx - 4 - 46 * scale, cy - 4, {size: compact ? 14 : 18, align: 'right', colour: theme.text});
}
// A half-dial in a steel bezel: 0 at the left, its top at the right; green up to the safety line, red past the limit.
// The coloured bands are lit bars on dark glass, and the reading shows on a lit window under the dial.
function dial(ctx, cx, cy, r, {title, value, max, green = null, amber = null, red = null, reading, colour}) {
  const o = r + 16, rim = ctx.createLinearGradient(0, cy - o, 0, cy);
  rim.addColorStop(0, '#c4ccd1'); rim.addColorStop(.35, '#79838a'); rim.addColorStop(1, '#2e353a');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 3, o, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, o, Math.PI, 0); ctx.closePath(); ctx.fill();
  steel(ctx, cx - o, cy - 1, 2 * o, 9, 2);
  ctx.fillStyle = '#05090b'; ctx.beginPath(); ctx.arc(cx, cy, r + 9, Math.PI, 0); ctx.closePath(); ctx.fill();
  bolt(ctx, cx - o + 7, cy - 6, 2.4); bolt(ctx, cx + o - 7, cy - 6, 2.4);
  const at = v => Math.PI + Math.min(1, v / max) * Math.PI;
  const arc = (from, to, c) => {
    ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r - 6, at(from), at(to)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 9.5, at(from), at(to)); ctx.stroke();
  };
  arc(0, max, '#222b30');
  if (green != null) arc(0, green, '#3f9a5f');
  if (amber != null) arc(amber[0], amber[1], '#b8942f');
  if (red != null) arc(red, max, '#b44c3d');
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2;
  for (const v of [0, max / 3, max * 2 / 3, max]) { const a = at(v); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)); ctx.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10)); ctx.stroke(); }
  const a = at(Math.max(0, value));
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 1.5, cy + 2); ctx.lineTo(cx + Math.cos(a) * (r - 4) + 1.5, cy + Math.sin(a) * (r - 4) + 2); ctx.stroke();
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); ctx.stroke(); ctx.lineCap = 'butt';
  const hub = ctx.createRadialGradient(cx - 2, cy - 3, 1, cx, cy, 8); hub.addColorStop(0, '#f2f6f7'); hub.addColorStop(1, '#4a5257');
  ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.ellipse(cx - r * .3, cy - r * .55, r * .5, r * .16, -.5, 0, Math.PI * 2); ctx.fill();
  lcd(ctx, cx - o + 4, cy + 12, 2 * o - 8, 32, '#56d683'); bezel(ctx, cx - o + 4, cy + 12, 2 * o - 8, 32, 5);
  text(ctx, title, cx, cy - 108, {size: 14, colour: LABEL, weight: 800});
  text(ctx, reading, cx, cy + 28, {size: 24, colour, weight: 800});
}
// The two gauges for the one bar or arm on the rig.
function gauges(ctx, r, rules = true) {
  const broken = r.state !== 'ok', over = r.used >= 1 || broken, line = rules ? r.line : null;
  const usedColour = over ? theme.bad : line != null && r.used > line ? theme.accent : '#9ff0b4';
  dial(ctx, 680, 200, 82, {title: 'STRENGTH USED', value: broken ? 1.5 : r.used, max: 1.5, green: line ?? null, amber: line != null ? [line, 1] : null, red: 1,
    reading: broken ? (r.state === 'snapped' ? 'snapped' : 'bent for good') : pct(r.used), colour: usedColour});
  if (line != null) text(ctx, `safe up to ${pct(line)}`, 680, 268, {size: 14, colour: LABEL});
  else text(ctx, 'at 100% it gives way', 680, 268, {size: 14, colour: LABEL});
  const dip = r.dipMm ?? 0, ruled = rules && r.kind === 'arm', deep = ruled && dip > DIP_MM;
  dial(ctx, 880, 200, 70, {title: 'DIPS', value: broken ? 50 : dip, max: 30, green: ruled ? DIP_MM : null, red: ruled ? DIP_MM : null,
    reading: broken ? '–' : mm1(dip), colour: broken || deep ? theme.bad : '#9ff0b4'});
  text(ctx, ruled ? `the rule allows ${DIP_MM} mm` : 'under 100% it springs back', 880, 268, {size: 14, colour: LABEL});
}
// A row's gauges, side by side with its bar: strength used as a strip, the dip, and what happened.
function rowGauges(ctx, r, y) {
  const x = PANEL_X + 20, w = 300, broken = r.state !== 'ok';
  text(ctx, 'Strength used', x, y - 42, {size: 13, align: 'left', colour: LABEL, weight: 800});
  ctx.fillStyle = '#05090b'; ctx.fillRect(x, y - 30, w, 18);
  const used = broken ? 1.5 : r.used, lit = used >= 1 ? '#c4513f' : r.line != null && used > r.line ? '#c9a23a' : '#46aa68';
  const fill = ctx.createLinearGradient(0, y - 30, 0, y - 12); fill.addColorStop(0, shade(lit, .3)); fill.addColorStop(.5, lit); fill.addColorStop(1, shade(lit, -.35));
  ctx.fillStyle = fill; ctx.fillRect(x, y - 30, w * Math.min(1, used / 1.5), 18);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y - 29, w * Math.min(1, used / 1.5), 1.4);
  ctx.strokeStyle = '#7f8a90'; ctx.lineWidth = 1.6; ctx.strokeRect(x - .8, y - 30.8, w + 1.6, 19.6);
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 1.5, y - 36); ctx.lineTo(x + w / 1.5, y - 6); ctx.stroke();
  if (r.line != null) { ctx.strokeStyle = '#9ff0b4'; ctx.beginPath(); ctx.moveTo(x + w * r.line / 1.5, y - 36); ctx.lineTo(x + w * r.line / 1.5, y - 6); ctx.stroke(); }
  text(ctx, broken ? '' : pct(used), x + w + 12, y - 21, {size: 16, align: 'left'});
  const state = r.state === 'bent' ? `bent for good at ${kg0(failKg(r.material))}` : r.state === 'snapped' ? `snapped at ${kg0(failKg(r.material))}` : r.peakMm != null ? `dipped ${mm1(r.peakMm)}, then sprang back` : `dips ${mm1(r.dipMm ?? 0)}`;
  text(ctx, state, x, y + 10, {size: 18, align: 'left', colour: broken ? theme.bad : theme.text});
}
// The bottom strip: the rack (1, 2, 3) and the thickness handle (↓, ↑).
function rack(ctx, view) {
  const chosen = view.rack.chosen;
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.fillRect(40, RACK_Y - 36, 520, 72); bezel(ctx, 40, RACK_Y - 36, 520, 72, 4);
  text(ctx, 'RACK', 52, RACK_Y - 26, {size: 11, align: 'left', colour: LABEL, weight: 800});
  NAMES.forEach((material, i) => {
    const x = RACK_X[i], on = material === chosen, can = view.keys[String(i + 1)] === `material:${i}`;
    ctx.globalAlpha = on || can ? 1 : .4;
    fillMaterial(ctx, material, x - 50, RACK_Y - 14, 100, 16);
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - 50, RACK_Y - 14, 100, 16);
    text(ctx, name(material), x, RACK_Y + 18, {size: 15, colour: on ? theme.accent : theme.text});
    if (can) keyCap(ctx, x - 62, RACK_Y - 6, String(i + 1));
    ctx.globalAlpha = 1;
    if (on) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x - 66, RACK_Y - 30, 132, 62, 6); ctx.stroke(); }
    if (view.glow === 'build' && view.target === 'build:best' && can && view.best?.material === material && !on) glowBox(ctx, view, x - 70, RACK_Y - 34, 140, 70);
  });
}
function handle(ctx, view) {
  const h = view.handle, can = !h.locked && view.keys['↑'] === 'thick:up';
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.fillRect(PANEL_X, RACK_Y - 36, 380, 72); bezel(ctx, PANEL_X, RACK_Y - 36, 380, 72, 4);
  text(ctx, 'THICKNESS', 780, RACK_Y - 24, {size: 11, colour: LABEL, weight: 800});
  text(ctx, `${h.mm} mm`, 780, RACK_Y + 6, {size: 28, colour: theme.text, weight: 800});
  for (const [way, label, key] of [['down', 'Thinner', '↓'], ['up', 'Thicker', '↑']]) {
    const [x, y] = HANDLE[way];
    ctx.globalAlpha = can ? 1 : .35;
    steel(ctx, x - 58, y - 24, 116, 48, 6);
    ctx.fillStyle = 'rgba(14,20,24,.55)'; ctx.beginPath(); ctx.roundRect(x - 55, y - 21, 110, 42, 4); ctx.fill();
    text(ctx, label, x + 10, y, {size: 16});
    keyCap(ctx, x - 38, y, key);
    ctx.globalAlpha = 1;
    if (can && view.glow === 'build' && view.target === 'build:best' && view.rack?.chosen === view.best?.material && (way === 'up') === (h.mm < view.best.mm)) glowBox(ctx, view, x - 62, y - 28, 124, 56);
  }
  if (h.brian) text(ctx, 'set by Brian', 780, RACK_Y + 28, {size: 12, colour: LABEL});
}
// The arm card: what it is and what it weighs; or Brian's job: every arm that held, lightest marked.
function armCard(ctx, view) {
  const x = PANEL_X, y = 320, w = 380, r = view.rigs[0];
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, 240, 8); ctx.fill(); bezel(ctx, x, y, w, 240);
  if (view.job) {
    text(ctx, `BRIAN’S JOB · THE HEAVY HOOK${view.job.done ? ' · DONE' : ''}`, x + 16, y + 22, {size: 13, align: 'left', colour: LABEL, weight: 800});
    text(ctx, `The lightest arm that holds ${kg0(CAR_KG)}`, x + 16, y + 52, {size: 19, align: 'left'});
    text(ctx, 'Arms that held:', x + 16, y + 86, {size: 14, align: 'left', colour: LABEL});
    const rows = [...view.job.held].sort((a, b) => a.kg - b.kg).slice(0, 5);
    rows.forEach((h, i) => {
      const best = h.kg === view.job.lightest;
      text(ctx, `${name(h.material)}, ${h.mm} mm`, x + 24, y + 114 + i * 26, {size: 17, align: 'left', colour: best ? theme.accent : theme.text});
      text(ctx, `${kg1(h.kg)}${best ? '  lightest' : ''}`, x + w - 18, y + 114 + i * 26, {size: 17, align: 'right', colour: best ? theme.accent : theme.text});
    });
    return;
  }
  text(ctx, 'THE ARM', x + 16, y + 22, {size: 13, align: 'left', colour: LABEL, weight: 800});
  text(ctx, `${name(r.material)}, ${r.mm} mm`, x + 16, y + 62, {size: 26, align: 'left', colour: theme.accent});
  text(ctx, `weighs ${kg1(r.massKg)}`, x + 16, y + 104, {size: 22, align: 'left'});
  endOf(ctx, r.material, x + w - 62, y + 76, 60, r.mm, .9, r.state === 'ok' ? r.used : 0);
  text(ctx, 'the end of the arm', x + w - 62, y + 142, {size: 12, colour: LABEL});
  text(ctx, view.handle?.brian ? `The arm is half a metre long and 60 mm wide.` : `To hold the ${kg0(CAR_KG)} car, the arm must stay`, x + 16, y + 168, {size: 15, align: 'left', colour: theme.text});
  if (!view.handle?.brian) text(ctx, `inside the green, up to ${pct(r.line)} of its strength,`, x + 16, y + 192, {size: 15, align: 'left', colour: theme.text});
  if (!view.handle?.brian) text(ctx, `and dip ${DIP_MM} mm or less.`, x + 16, y + 216, {size: 15, align: 'left', colour: theme.text});
}
// The free test's table: every arm tried so far, to compare.
function testsCard(ctx, view) {
  const x = PANEL_X, y = 320, w = 380;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, 240, 8); ctx.fill(); bezel(ctx, x, y, w, 240);
  text(ctx, `YOUR TESTS WITH THE ${kg0(CAR_KG)} CAR`, x + 16, y + 20, {size: 13, align: 'left', colour: LABEL, weight: 800});
  const cols = [['Arm', x + 12, 'left'], ['Weight', x + 214, 'right'], ['Used', x + 266, 'right'], ['Dip', x + 322, 'right'], ['Result', x + 372, 'right']];
  for (const [label, cx, align] of cols) text(ctx, label, cx, y + 46, {size: 13, align, colour: LABEL, weight: 800});
  if (!view.tests.length) text(ctx, 'There are no tests yet. Press Space to test.', x + w / 2, y + 120, {size: 16, colour: LABEL});
  view.tests.forEach((t, i) => {
    const rowY = y + 74 + i * 32, colour = t.holds ? theme.text : theme.bad;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(x + 6, rowY - 15, w - 12, 30);
    text(ctx, `${name(t.material)}, ${t.mm} mm`, x + 12, rowY, {size: 15, align: 'left', colour});
    text(ctx, kg1(t.kg), x + 214, rowY, {size: 15, align: 'right', colour});
    text(ctx, pct(t.used), x + 266, rowY, {size: 15, align: 'right', colour});
    text(ctx, t.used >= 1 ? '–' : `${t.dipMm.toFixed(1)}`, x + 322, rowY, {size: 15, align: 'right', colour});
    text(ctx, t.holds ? 'holds' : 'fails', x + 372, rowY, {size: 15, align: 'right', colour: t.holds ? '#9ff0b4' : theme.bad, weight: 800});
  });
}
function drawRig(ctx, view) {
  background(ctx); floor(ctx, FLOOR);
  const ys = rowsY(view.rigs.length), one = single(view);
  frame(ctx, ys);
  if (view.ramKg != null && !one) text(ctx, `Ram load on each bar, ${kg0(view.ramKg)}`, 320, 40, {size: 24, colour: '#9ff0b4', weight: 800});
  view.rigs.forEach((r, i) => rig(ctx, view, r, ys[i], {compact: !one}));
  if (view.density) densityPanel(ctx, view);
  else if (one) gauges(ctx, view.rigs[0], !view.handle?.brian);
  else view.rigs.forEach((r, i) => r.kind === 'arm' ? armRow(ctx, r, ys[i]) : rowGauges(ctx, r, ys[i]));
  if (view.rack) rack(ctx, view);
  if (view.handle) handle(ctx, view);
  if (view.section && one) sectionPanel(ctx, view.rigs[0]);
  if (view.tests) testsCard(ctx, view);
  else if (one && view.rigs[0].kind === 'arm' && (view.rack || view.job)) armCard(ctx, view);
  if (view.glow === 'build' && view.target === 'go') glowBox(ctx, view, TIP_X - 90, 312, 160, FLOOR - 302);
  if (view.keys.Space === 'go' && !view.handle?.brian && view.rigs[0]?.kind === 'arm' && view.rigs[0].lower === 0) text(ctx, 'Press Space to hang the car', TIP_X - 16, 296, {size: 15, align: 'right', colour: LABEL});
}
// The wonder's arms: each holds the car; what it is and what it weighs, big.
function armRow(ctx, r, y) {
  text(ctx, `${name(r.material)}, ${r.mm} mm`, PANEL_X + 20, y - 20, {size: 24, align: 'left', colour: theme.text});
  text(ctx, `weighs ${kg1(r.massKg)}`, PANEL_X + 20, y + 16, {size: 30, align: 'left', colour: theme.accent, weight: 800});
  if (r.lower >= 1) text(ctx, `holds the ${kg0(CAR_KG)} car`, PANEL_X + 20, y + 52, {size: 17, align: 'left', colour: '#9ff0b4'});
}

// The questions: three plain bars (they give way once answered), and Kestrel One with the Heavy hook.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.bars) {
    const ys = rowsY(3);
    floor(ctx, FLOOR); frame(ctx, ys);
    view.bars.forEach((b, i) => {
      const state = !b.shown ? 'ok' : MATERIALS[b.material].brittle ? 'snapped' : 'bent';
      rig(ctx, view, {kind: 'bar', material: b.material, mm: b.mm, dipMm: 0, state, brokeAge: null}, ys[i], {compact: true});
      if (b.shown) text(ctx, `${state === 'snapped' ? 'snapped' : 'bent for good'} at ${kg0(b.failKg)}`, PANEL_X + 20, ys[i], {size: 20, align: 'left', colour: state === 'snapped' ? theme.bad : theme.text});
    });
    return;
  }
  floor(ctx, 412);
  shadow(ctx, 500, 434, 100, .5); shadow(ctx, 440, 452, 230, .3);
  helicopter(ctx, 500, 120, 0, view.time, 1.6);
  cable(ctx, 500, 172, 500, 330, {width: 3});
  ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(500, 174, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.translate(500, 360); ctx.scale(2, 2); slungCar(ctx, 0, 0, 0); ctx.restore();
  text(ctx, `Heavy hook, ${kg0(CAR_KG)}`, 600, 300, {size: 20, align: 'left', colour: theme.accent});
  if (view.answered) view.arms.forEach((o, i) => {
    const words = o.holds ? `holds, ${kg1(o.arm.massKg)}` : o.state !== 'holds' ? `${o.state === 'snaps' ? 'snaps' : 'bends for good'}` : `over its line (${pct(o.used)}), dips ${mm1(o.arm.tipDropMm)}`;
    text(ctx, `${name(o.material)}, ${o.mm} mm, ${words}`, 500, 480 + i * 34, {size: 19, colour: o.holds ? (o.arm.massKg === LIGHTEST.massKg ? '#9ff0b4' : theme.text) : theme.bad});
  });
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'words') {
      fillMaterial(ctx, 'steel', x + 40, 150, 220, 10); ctx.save(); ctx.translate(x + 40, 260); ctx.rotate(.25); fillMaterial(ctx, 'steel', 0, 0, 220, 10); ctx.restore();
      text(ctx, 'a stiff part dips very little', x + w / 2, 128, {size: 16}); text(ctx, 'past its strength, it bends for good', x + w / 2, 340, {size: 16, colour: theme.bad});
    }
    if (idea.id === 'thicker') NAMES.forEach((material, k) => {
      // Each 1 kg bar's end, to scale: 40 mm wide, as thick as it is.
      const t = barMm(material) * 3, cx = x + 60 + k * 90;
      fillMaterial(ctx, material, cx - 30, 300 - t, 60, t);
      text(ctx, name(material), cx, 320, {size: 13}); text(ctx, mm1(barMm(material)), cx, 300 - t - 14, {size: 13, colour: theme.accent});
    });
    if (idea.id === 'choose') {
      fillMaterial(ctx, 'carbon fibre', x + 30, 150, 200, LIGHTEST.thicknessMm * .5);
      ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 226, 176); ctx.lineTo(x + 226, 236); ctx.stroke();
      ctx.save(); ctx.translate(x + 226, 270); ctx.scale(1.4, 1.4); slungCar(ctx, 0, 0, 0); ctx.restore();
      text(ctx, kg1(LIGHTEST.massKg), x + 110, 210, {size: 22, colour: theme.accent});
    }
    wrap(ctx, idea.text, x + w / 2, 390, w - 30, {size: 19, weight: 600});
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'rig') drawRig(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: an arm that holds, bends or snaps; a plain bar; an arm with the car.
// Each picture is a small view of the board: the workshop wall and floor, the steel vice, a bar or arm of its real material,
// the weight, and the Dusthawk on its sling.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const floorAt = cardScene(ctx, w, h, {floorAt: h - 18});
  // The vice that clamps the root of the part at height y, a part t thick.
  const miniVice = (y, t) => {
    steel(ctx, 6, y - 22, 24, 44, 3); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(10, y - 18, 16, 36);
    bolt(ctx, 18, y - 14, 2.8); bolt(ctx, 18, y + 14, 2.8);
    steel(ctx, 26, y - t / 2 - 9, 14, 9, 2); steel(ctx, 26, y + t / 2, 14, 9, 2); bolt(ctx, 33, y - t / 2 - 4.5, 2); bolt(ctx, 33, y + t / 2 + 4.5, 2);
  };
  // The car on its sling, hanging from (x, top) or standing with its tyres on the floor.
  const carAt = (x, cy, s = .85) => { ctx.save(); ctx.translate(x, cy); ctx.scale(s, s); slungCar(ctx, 0, 0, 0); ctx.restore(); };
  const rest = (x, s = .85) => { shadow(ctx, x, floorAt + 3, 34, .5); carAt(x, floorAt + 2 - 24 * s, s); };
  if (picture.kind === 'outcome') {
    const y = 22, x0 = 38, len = 126, t = 10;
    miniVice(y, t);
    if (picture.state === 'holds') {
      fillMaterial(ctx, 'carbon fibre', x0, y - t / 2, len, t);
      cable(ctx, x0 + len - 4, y + t / 2, x0 + len - 4, y + 36, {width: 1.8}); carAt(x0 + len - 4, y + 54);
    }
    if (picture.state === 'bends') {
      ctx.save(); ctx.translate(x0, y); ctx.rotate(.3); fillMaterial(ctx, 'carbon fibre', 0, -t / 2, 108, t); ctx.restore();
      const tx = x0 + 108 * Math.cos(.3), ty = y + 108 * Math.sin(.3);
      cable(ctx, tx, ty, tx, ty + 10, {width: 1.8}); rest(tx + 2);
    }
    if (picture.state === 'snaps') {
      fillMaterial(ctx, 'carbon fibre', x0, y - t / 2, 12, t);
      ctx.strokeStyle = '#f2f0e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 12, y - t / 2); ctx.lineTo(x0 + 16, y - 1); ctx.lineTo(x0 + 11, y + t / 2); ctx.stroke();
      ctx.save(); ctx.translate(x0 + 18, floorAt - 8); ctx.rotate(.05); fillMaterial(ctx, 'carbon fibre', 0, -t / 2, 86, t); ctx.restore();
      rest(x0 + len + 18);
    }
  }
  if (picture.kind === 'bar') {
    const t = Math.max(3, barMm(picture.material) * 1.6), y = h * .4, tip = w - 34;
    miniVice(y, t); fillMaterial(ctx, picture.material, 38, y - t / 2, tip - 38, t);
    // A 1 kg weight hangs from the tip.
    cable(ctx, tip, y + t / 2, tip, y + t / 2 + 14, {width: 1.8});
    steel(ctx, tip - 9, y + t / 2 + 14, 18, 16, 3);
    text(ctx, '1 kg', tip - 36, y + t / 2 + 22, {size: 14, colour: theme.text});
  }
  if (picture.kind === 'arm') {
    const t = Math.max(3, picture.mm * .5), y = 20;
    miniVice(y, t); fillMaterial(ctx, picture.material, 38, y - t / 2, 130, t);
    cable(ctx, 164, y + t / 2, 164, y + 34, {width: 1.8}); carAt(164, y + 52, .8);
    text(ctx, `${picture.mm} mm`, 84, y + t / 2 + 18, {size: 14, colour: theme.accent});
  }
}
