// The Strength lesson's board (docs/board/cards/LAB-CLASSROOM-STRENGTH.md): a vice clamping a test bar or a hook arm
// side on, drawn to scale, with its load at the tip (10 kg weights, the ram, or the 2,000 kg car on its sling); the
// Strength used and Dips gauges; arrows that show the top of the part stretched and the bottom squeezed; the end of the
// part drawn to scale; the rack of three materials and the thickness handle; the free test's table and Brian's job card.
// Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard, helicopter, car as slungCar} from '../classroom/board-art.js';
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
const COLOURS = Object.freeze({aluminium: ['#dfe5e8', '#9aa5ab'], steel: ['#8f989e', '#4d555a'], 'carbon fibre': ['#3a3f44', '#16191b']});
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
// The material's look: aluminium bright, steel dark grey, carbon fibre black with its woven pattern.
function fillMaterial(ctx, material, x, y, w, h) {
  const [light, dark] = COLOURS[material], g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (material !== 'carbon fibre' || h < 3) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 2;
  for (let k = -h; k < w; k += 9) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); ctx.stroke(); }
  ctx.restore();
}
function vice(ctx, y, t) {
  ctx.fillStyle = theme.beamDark; ctx.fillRect(56, y - 70, 64, 140);
  ctx.fillStyle = theme.beam; ctx.fillRect(56, y - 70, 64, 10); ctx.fillRect(56, y + 60, 64, 10);
  // The jaws close on the bar.
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(ROOT_X - 26, y - t / 2 - 22, 30, 20); ctx.fillRect(ROOT_X - 26, y + t / 2 + 2, 30, 20);
  ctx.fillStyle = theme.rivet; for (const dy of [-50, 50]) { ctx.beginPath(); ctx.arc(88, y + dy, 5, 0, Math.PI * 2); ctx.fill(); }
}
// A bar or arm along a cantilever's curve: dip at the tip, d(s) = dip s^2 (3 - s) / 2 along its length.
function beam(ctx, material, y, t, dip, from = 0, to = 1) {
  const n = 24, top = [], bottom = [];
  for (let i = 0; i <= n; i++) {
    const s = from + (to - from) * i / n, d = dip * s * s * (3 - s) / 2, x = ROOT_X + s * LEN;
    top.push([x, y - t / 2 + d]); bottom.push([x, y + t / 2 + d]);
  }
  const [light, dark] = COLOURS[material], g = ctx.createLinearGradient(0, y - t / 2, 0, y + t / 2 + dip);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...top[0]);
  for (const p of top.slice(1)) ctx.lineTo(...p);
  for (const p of bottom.reverse()) ctx.lineTo(...p);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
}
function rig(ctx, view, r, y, {compact = false} = {}) {
  const t = Math.max(2, r.mm * PX);
  vice(ctx, y, t);
  if (r.state === 'snapped') {
    // Snapped at the vice: a stub stays, the rest turns over and falls to the floor.
    const age = r.brokeAge ?? 9, fall = Math.min(1, age * 2.2);
    beam(ctx, r.material, y, t, 0, 0, .04);
    ctx.save();
    const px = ROOT_X + .04 * LEN, py = y + (compact ? 40 : FLOOR - 14 - y) * fall * fall;
    ctx.translate(px, py); ctx.rotate((compact ? .1 : .12) * fall); ctx.globalAlpha = compact ? 1 - fall * .45 : 1;
    fillMaterial(ctx, r.material, 0, -t / 2, LEN * .96, t);
    ctx.strokeStyle = '#f2f0e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -t / 2);
    for (let k = 1; k <= 4; k++) ctx.lineTo(k % 2 ? 6 : -2, -t / 2 + t * k / 4);
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
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
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
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
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, 530, 8); ctx.fill(); ctx.stroke();
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
  ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 4, ready ? ty + 4 : ty); ctx.lineTo(tx - 4, ready ? ty + 26 : top + 18); ctx.stroke();
  const discs = Math.max(n, ready ? 1 : 0);
  for (let i = 0; i < discs; i++) {
    const dy = top + 20 + i * 20;
    ctx.fillStyle = '#3c4246'; ctx.beginPath(); ctx.roundRect(tx - 40, dy, 72, 18, 4); ctx.fill();
    ctx.fillStyle = theme.brass[1]; ctx.fillRect(tx - 40, dy + 7, 72, 4);
  }
  if (discs) text(ctx, `${discs * WEIGHT_KG} kg`, tx + 42, top + 20 + discs * 10, {size: 17, align: 'left', colour: theme.text});
  if (n && !compact) text(ctx, `${(n * WEIGHT_KG * GRAVITY).toFixed(1)} N`, tx + 42, top + 40 + discs * 10, {size: 15, align: 'left', colour: theme.accent});
  if (view.glow === 'weights' && !compact) glowBox(ctx, view, tx - 60, ty - 10, 150, Math.max(120, discs * 20 + 70));
  if (view.glow === 'weights' && compact) glowBox(ctx, view, tx - 40, y + 40, 120, 80);
}
// The ram: a hydraulic cylinder on the floor pulling the tip down, with its load on a readout.
function ram(ctx, view, r, tx, ty, y, compact) {
  if (compact) { if (r.state !== 'snapped') { ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx - 4, ty + 36); ctx.stroke(); } return; }
  const body = FLOOR - 120;
  ctx.fillStyle = theme.iron[0]; ctx.fillRect(tx - 7, ty, 8, Math.max(0, body - ty));
  ctx.fillStyle = '#7c3a2a'; ctx.beginPath(); ctx.roundRect(tx - 26, body, 44, 120, 5); ctx.fill();
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(tx - 34, FLOOR - 10, 60, 10);
  ctx.fillStyle = '#0d1a12'; ctx.beginPath(); ctx.roundRect(tx + 34, body + 20, 150, 50, 5); ctx.fill();
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
  if (r.state !== 'snapped') {
    ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 4, ty + 4);
    const slack = broke ? 1 : 1 - r.lower;
    ctx.quadraticCurveTo(tx - 4 + 40 * slack, (ty + top) / 2, tx - 4, top); ctx.stroke();
    ctx.fillStyle = theme.iron[0]; ctx.beginPath(); ctx.arc(tx - 4, ty + 8, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.translate(tx - 4, cy); ctx.scale(scale, scale); slungCar(ctx, 0, 0, 0); ctx.restore();
  text(ctx, kg0(CAR_KG), tx - 4 - 46 * scale, cy - 4, {size: compact ? 14 : 18, align: 'right', colour: theme.text});
}
// A half-dial: 0 at the left, its top at the right; green up to the safety line, red past the limit.
function dial(ctx, cx, cy, r, {title, value, max, green = null, amber = null, red = null, reading, colour}) {
  ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.beginPath(); ctx.arc(cx, cy, r + 14, Math.PI, 0); ctx.closePath(); ctx.fill();
  const at = v => Math.PI + Math.min(1, v / max) * Math.PI;
  const arc = (from, to, c) => { ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r - 6, at(from), at(to)); ctx.stroke(); };
  arc(0, max, '#3a4246');
  if (green != null) arc(0, green, '#3f8f5a');
  if (amber != null) arc(amber[0], amber[1], '#a8862f');
  if (red != null) arc(red, max, '#a8473a');
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2;
  for (const v of [0, max / 3, max * 2 / 3, max]) { const a = at(v); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)); ctx.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10)); ctx.stroke(); }
  const a = at(Math.max(0, value));
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); ctx.stroke();
  ctx.fillStyle = theme.iron[0]; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
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
  ctx.fillStyle = '#2b3236'; ctx.fillRect(x, y - 30, w, 18);
  const used = broken ? 1.5 : r.used;
  ctx.fillStyle = used >= 1 ? '#a8473a' : r.line != null && used > r.line ? '#a8862f' : '#3f8f5a';
  ctx.fillRect(x, y - 30, w * Math.min(1, used / 1.5), 18);
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 1.5, y - 36); ctx.lineTo(x + w / 1.5, y - 6); ctx.stroke();
  if (r.line != null) { ctx.strokeStyle = '#9ff0b4'; ctx.beginPath(); ctx.moveTo(x + w * r.line / 1.5, y - 36); ctx.lineTo(x + w * r.line / 1.5, y - 6); ctx.stroke(); }
  text(ctx, broken ? '' : pct(used), x + w + 12, y - 21, {size: 16, align: 'left'});
  const state = r.state === 'bent' ? `bent for good at ${kg0(failKg(r.material))}` : r.state === 'snapped' ? `snapped at ${kg0(failKg(r.material))}` : r.peakMm != null ? `dipped ${mm1(r.peakMm)}, then sprang back` : `dips ${mm1(r.dipMm ?? 0)}`;
  text(ctx, state, x, y + 10, {size: 18, align: 'left', colour: broken ? theme.bad : theme.text});
}
// The bottom strip: the rack (1, 2, 3) and the thickness handle (↓, ↑).
function rack(ctx, view) {
  const chosen = view.rack.chosen;
  ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.fillRect(40, RACK_Y - 36, 520, 72);
  text(ctx, 'RACK', 52, RACK_Y - 26, {size: 11, align: 'left', colour: LABEL, weight: 800});
  NAMES.forEach((material, i) => {
    const x = RACK_X[i], on = material === chosen, can = view.keys[String(i + 1)] === `material:${i}`;
    ctx.globalAlpha = on || can ? 1 : .4;
    fillMaterial(ctx, material, x - 50, RACK_Y - 14, 100, 16);
    text(ctx, name(material), x, RACK_Y + 18, {size: 15, colour: on ? theme.accent : theme.text});
    if (can) keyCap(ctx, x - 62, RACK_Y - 6, String(i + 1));
    ctx.globalAlpha = 1;
    if (on) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x - 66, RACK_Y - 30, 132, 62, 6); ctx.stroke(); }
    if (view.glow === 'build' && view.target === 'build:best' && can && view.best?.material === material && !on) glowBox(ctx, view, x - 70, RACK_Y - 34, 140, 70);
  });
}
function handle(ctx, view) {
  const h = view.handle, can = !h.locked && view.keys['↑'] === 'thick:up';
  ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.fillRect(PANEL_X, RACK_Y - 36, 380, 72);
  text(ctx, 'THICKNESS', 780, RACK_Y - 24, {size: 11, colour: LABEL, weight: 800});
  text(ctx, `${h.mm} mm`, 780, RACK_Y + 6, {size: 28, colour: theme.text, weight: 800});
  for (const [way, label, key] of [['down', 'Thinner', '↓'], ['up', 'Thicker', '↑']]) {
    const [x, y] = HANDLE[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 58, y - 24, 116, 48, 6); ctx.fill();
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
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 240, 8); ctx.fill(); ctx.stroke();
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
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 240, 8); ctx.fill(); ctx.stroke();
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
  background(ctx);
  ctx.fillStyle = theme.ground; ctx.fillRect(40, FLOOR, 520, 8);
  const ys = rowsY(view.rigs.length), one = single(view);
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
    view.bars.forEach((b, i) => {
      const state = !b.shown ? 'ok' : MATERIALS[b.material].brittle ? 'snapped' : 'bent';
      rig(ctx, view, {kind: 'bar', material: b.material, mm: b.mm, dipMm: 0, state, brokeAge: null}, ys[i], {compact: true});
      if (b.shown) text(ctx, `${state === 'snapped' ? 'snapped' : 'bent for good'} at ${kg0(b.failKg)}`, PANEL_X + 20, ys[i], {size: 20, align: 'left', colour: state === 'snapped' ? theme.bad : theme.text});
    });
    return;
  }
  helicopter(ctx, 500, 120, 0, view.time, 1.6);
  ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500, 172); ctx.lineTo(500, 330); ctx.stroke();
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
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  const wall = () => { ctx.fillStyle = theme.beamDark; ctx.fillRect(10, 14, 22, h - 28); };
  const carAt = (x, y, s = .9) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); slungCar(ctx, 0, 0, 0); ctx.restore(); };
  if (picture.kind === 'outcome') {
    wall(); ctx.fillStyle = theme.ground; ctx.fillRect(10, h - 10, w - 20, 4);
    const y = 30, x0 = 32, len = 150, t = 12;
    if (picture.state === 'holds') { fillMaterial(ctx, 'carbon fibre', x0, y - t / 2, len, t); ctx.strokeStyle = theme.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + len - 4, y + t / 2); ctx.lineTo(x0 + len - 4, y + 34); ctx.stroke(); carAt(x0 + len - 4, y + 56, 1.15); }
    if (picture.state === 'bends') {
      ctx.save(); ctx.translate(x0, y); ctx.rotate(.42); fillMaterial(ctx, 'carbon fibre', 0, -t / 2, len - 30, t); ctx.restore();
      carAt(x0 + (len - 30) * .91 + 2, h - 26, 1.15);
    }
    if (picture.state === 'snaps') {
      fillMaterial(ctx, 'carbon fibre', x0, y - t / 2, 12, t);
      ctx.strokeStyle = '#f2f0e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 12, y - t / 2); ctx.lineTo(x0 + 16, y - 1); ctx.lineTo(x0 + 11, y + t / 2); ctx.stroke();
      ctx.save(); ctx.translate(x0 + 18, h - 18); ctx.rotate(.05); fillMaterial(ctx, 'carbon fibre', 0, -t / 2, len - 40, t); ctx.restore();
      carAt(x0 + len + 10, h - 26, 1.15);
    }
  }
  if (picture.kind === 'bar') {
    const t = Math.max(3, barMm(picture.material) * 1.6);
    wall(); fillMaterial(ctx, picture.material, 32, h / 2 - t / 2, w - 60, t);
    text(ctx, '1 kg', w - 40, h / 2 - t / 2 - 14, {size: 14, colour: theme.text});
  }
  if (picture.kind === 'arm') {
    const t = Math.max(3, picture.mm * .5);
    wall(); fillMaterial(ctx, picture.material, 32, 30 - t / 2, 140, t);
    ctx.strokeStyle = theme.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(168, 30 + t / 2); ctx.lineTo(168, 62); ctx.stroke();
    carAt(168, 80, .8);
    text(ctx, `${picture.mm} mm`, 80, 30 + t / 2 + 16, {size: 14, colour: theme.accent});
  }
}
