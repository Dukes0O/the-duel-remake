// The Headings lesson's board (docs/board/cards/LAB-CLASSROOM-HEADINGS.md): a map seen from above, north up, in
// boxes of 100 m; Kestrel One on the pad with a compass ring round it and the angle shaded from north; the HEADING
// gauge beside the map; the ruler, the smoke, the flight tracks, and the right-angled triangle that the sums use.
// Draws and hit-tests only.
import {BOARD, theme, background, cardScene, text, keyCap, wrap, fitBoard, steelPanel, lcd, bezel, bolt, timber, labelPlate, groundFlag, helicopterTop, grain} from '../classroom/board-art.js';
import {MAP, RING_M, BOX_M, three, wrap as round} from './headings-classroom.js';
export {BOARD};
// Pressing on the compass ring turns the helicopter to that heading at once; pressing on the ruler moves its end there.
export const pressMovesDrag = true;

const EAST_COLOUR = '#70bfd2', NORTH_COLOUR = '#9ff0b4', PLAIN = 'rgba(245,240,220,.85)';

// Map metres to board units: the pad at (300, 450), 0.6 units a metre (a 100 m box is 60 units).
const PAD = Object.freeze({x: 300, y: 450}), SCALE = .6, RING = 74;
const PLATE = Object.freeze({left: 16, top: 16, right: 740, bottom: 664});
const bx = x => PAD.x + x * SCALE, by = y => PAD.y - y * SCALE;
const heliAt = view => [bx(view.heli.x), by(view.heli.y)];
const nose = deg => [Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180)];
const LAKE = Object.freeze({x: 520, y: 30, rx: 150, ry: 110});
// Fir trees in the woods, the same every frame, kept off the pad, the lake and the smoke.
const TREES = Array.from({length: 120}, (_, i) => ({x: MAP.west + ((i * 7919) % 1000) / 1000 * (MAP.east - MAP.west), y: MAP.south + ((i * 104729) % 997) / 997 * (MAP.north - MAP.south), r: 7 + (i * 31) % 6}))
  .filter(t => Math.hypot(t.x, t.y) > 90 && Math.hypot((t.x - LAKE.x) / (LAKE.rx + 30), (t.y - LAKE.y) / (LAKE.ry + 30)) > 1);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view), r = Math.hypot(x - hx, y - hy);
  if (view.dragRuler && view.ruler) { const [ex, ey] = rulerEnd(view); if (Math.hypot(x - ex, y - ey) < 34 || onRuler(view, x, y)) return {drag: 'ruler', action: 'release'}; }
  // The helicopter's body is Space where Space flies it; otherwise it is a dead spot, so a click on it never turns it at random.
  if (r < 24) return view.keys.Space ? {action: view.keys.Space} : null;
  if (view.dragCompass && r < RING + 26) return {drag: 'compass', action: 'release'};
  return null;
}
const rulerEnd = view => { const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading); return [hx + ux * view.ruler.length * SCALE, hy + uy * view.ruler.length * SCALE]; };
function onRuler(view, x, y) {
  const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading), along = (x - hx) * ux + (y - hy) * uy, across = Math.abs((x - hx) * uy - (y - hy) * ux);
  return along > 30 && along < view.ruler.length * SCALE + 30 && across < 22;
}
export function hoverInfo(view, x, y) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view), r = Math.hypot(x - hx, y - hy);
  if (r < 24) return `This is Kestrel One, seen from above, on heading ${three(view.heli.heading)}.`;
  if (view.compass && r < RING + 18) return 'This is the compass ring. North is 000 at the top, and the number counts up clockwise.';
  if (x > 760 && y > 40 && y < 190) return `The HEADING gauge reads ${view.gauge}, as it would in the helicopter.`;
  if (view.spot?.kind === 'smoke' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < RING_M * SCALE + 14) return `This is the smoke. Within ${RING_M} m of it counts as over it.`;
  if (view.spot?.kind === 'hut' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < 20) return 'This is a hut in the woods.';
  if (view.spot?.kind === 'marker' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < 20) return 'This is the marker. The arrow keys move it one box at a time.';
  if (view.ruler && onRuler(view, x, y)) return `The ruler reads ${Math.round(view.ruler.length)} m.`;
  if (Math.hypot((x - bx(LAKE.x)) / (LAKE.rx * SCALE), (y - by(LAKE.y)) / (LAKE.ry * SCALE)) < 1) return 'This is the lake, which lies east of the pad.';
  if (x > PLATE.left && x < PLATE.right && y > PLATE.top && y < PLATE.bottom) return `One box of the map stands for ${BOX_M} m on the ground.`;
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view);
  // Brian taps the ring at the heading he wants, where a click turns the helicopter to it.
  if (action.startsWith('turn')) { const [ux, uy] = nose(view.aim ?? view.heli.heading); return [hx + ux * RING, hy + uy * RING]; }
  if (action.startsWith('ruler')) return view.ruler ? rulerEnd(view) : null;
  if (action.startsWith('marker')) return view.spot ? [bx(view.spot.x), by(view.spot.y)] : null;
  return [hx, hy];
}
// What a drag to (x, y) asks for: a heading on the compass ring, or the ruler's length in metres.
export function dragAngle(view, id, x, y) {
  const [hx, hy] = heliAt(view);
  if (id === 'ruler') { const [ux, uy] = nose(view.ruler.heading); return ((x - hx) * ux + (y - hy) * uy) / SCALE; }
  return round(Math.atan2(x - hx, hy - y) * 180 / Math.PI);
}

// ---- drawing ----
// The chart on its table: three worn boards, a sheet of aged paper with fold lines and a printed border, contour lines,
// the forest as small fir symbols with a little relief shading, and the lake with its shore. None of it ever changes, so
// it is painted once and copied each frame; where there is no page (the tests) it is painted directly.
const INK = 'rgba(58,42,20,';
let chartLayer = null;
const fir = (ctx, x, y, r) => {
  const hh = r * 2.5, tw = r * .85, top = y - hh * .55;
  ctx.fillStyle = 'rgba(30,26,10,.26)'; ctx.beginPath(); ctx.ellipse(x + r * .5, y + hh * .42, r * .95, r * .3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a3520'; ctx.fillRect(x - 1, y + hh * .3, 2, hh * .18);
  for (let tier = 0; tier < 3; tier++) {
    const ty = top + tier * hh * .27, th = hh * .42, w = tw * (.55 + tier * .3);
    ctx.fillStyle = '#6f9a58'; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x - w, ty + th); ctx.lineTo(x, ty + th); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2e4b29'; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty + th); ctx.lineTo(x, ty + th); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(14,30,10,.5)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x - w, ty + th); ctx.lineTo(x, ty); ctx.lineTo(x + w, ty + th); ctx.closePath(); ctx.stroke();
  }
};
const FIRS = [...TREES].sort((a, b) => b.y - a.y);
// A rounded, uneven closed shape: the lake's shore and the hills' contour lines.
function blob(ctx, cx, cy, rx, ry, rot, seed) {
  ctx.beginPath();
  for (let i = 0; i <= 56; i++) {
    const t = i / 56 * Math.PI * 2, k = 1 + .05 * Math.sin(3 * t + seed) + .035 * Math.sin(5 * t + seed * 2), px = Math.cos(t) * rx * k, py = Math.sin(t) * ry * k;
    const x = cx + px * Math.cos(rot) - py * Math.sin(rot), y = cy + px * Math.sin(rot) + py * Math.cos(rot);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function paintChart(ctx) {
  const {left, top, right, bottom} = PLATE, w = right - left, h = bottom - top, cx = (left + right) / 2, cy = (top + bottom) / 2;
  // The table.
  for (let i = 0; i < 3; i++) timber(ctx, 2, 2 + i * 225, 752, 224);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(left + 4, top + 7, w, h);
  // The paper, worn darker at its edges.
  const paper = ctx.createLinearGradient(left, top, right, bottom); paper.addColorStop(0, '#cbbe92'); paper.addColorStop(.5, '#bbae83'); paper.addColorStop(1, '#a89b6f');
  ctx.fillStyle = paper; ctx.beginPath(); ctx.roundRect(left, top, w, h, 4); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(left, top, w, h, 4); ctx.clip();
  for (let i = 0; i < 220; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,246,214,.05)' : 'rgba(110,86,36,.05)'; ctx.beginPath(); ctx.arc(left + grain(i * 3) * w, top + grain(i * 3 + 1) * h, 6 + grain(i * 3 + 2) * 26, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 320; i++) { ctx.fillStyle = i % 3 ? 'rgba(90,66,28,.10)' : 'rgba(255,250,230,.12)'; ctx.fillRect(left + grain(i * 5 + 9) * w, top + grain(i * 5 + 10) * h, 3 + grain(i * 5 + 11) * 8, .8); }
  // Contour lines round four hills, every second one heavier.
  for (const [hx, hy, ring] of [[-300, 450, [40, 72, 104, 138]], [540, -230, [36, 66, 96]], [-380, -190, [34, 66]], [610, 560, [38, 74, 108]]]) {
    ring.forEach((rr, i) => { ctx.strokeStyle = i % 2 ? 'rgba(124,80,36,.42)' : 'rgba(124,80,36,.28)'; ctx.lineWidth = i % 2 ? 1.3 : 1; blob(ctx, bx(hx), by(hy), rr * SCALE * 1.15, rr * SCALE * .9, .4 + hx * .001, hx * .01 + i); ctx.stroke(); });
  }
  // The forest: a green wash under each tree, so the woods read as one stand.
  for (const t of FIRS) { const g = ctx.createRadialGradient(bx(t.x), by(t.y), 2, bx(t.x), by(t.y), 34); g.addColorStop(0, 'rgba(70,112,52,.16)'); g.addColorStop(1, 'rgba(70,112,52,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx(t.x), by(t.y), 34, 0, Math.PI * 2); ctx.fill(); }
  // The lake, its sandy shore and the sun on it.
  const lx = bx(LAKE.x), ly = by(LAKE.y), lrx = LAKE.rx * SCALE, lry = LAKE.ry * SCALE;
  ctx.fillStyle = 'rgba(40,30,10,.22)'; blob(ctx, lx + 3, ly + 4, lrx, lry, -.2, 1.3); ctx.fill();
  const water = ctx.createRadialGradient(lx - lrx * .3, ly - lry * .35, 6, lx, ly, lrx * 1.05); water.addColorStop(0, '#7db0b8'); water.addColorStop(.6, '#4f8693'); water.addColorStop(1, '#2f6070');
  ctx.fillStyle = water; blob(ctx, lx, ly, lrx, lry, -.2, 1.3); ctx.fill();
  ctx.strokeStyle = 'rgba(226,208,150,.7)'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = 'rgba(28,66,78,.85)'; ctx.lineWidth = 1.3; blob(ctx, lx, ly, lrx - 2.5, lry - 2.5, -.2, 1.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(220,240,244,.35)'; ctx.lineWidth = 1.1; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const rx = lx - lrx * .6 + grain(i + 70) * lrx * 1.2, ry = ly - lry * .55 + grain(i + 80) * lry * 1.1; ctx.moveTo(rx - 9, ry); ctx.quadraticCurveTo(rx - 4.5, ry - 3, rx, ry); ctx.quadraticCurveTo(rx + 4.5, ry + 3, rx + 9, ry); }
  ctx.stroke();
  for (const t of FIRS) fir(ctx, bx(t.x), by(t.y), t.r);
  // Fold lines and the light and shade across them, then the paper's own light.
  for (const [fx, vertical] of [[cx, true], [cy, false]]) {
    const g = vertical ? ctx.createLinearGradient(fx - 30, 0, fx + 30, 0) : ctx.createLinearGradient(0, fx - 30, 0, fx + 30);
    g.addColorStop(0, 'rgba(255,248,225,0)'); g.addColorStop(.46, 'rgba(255,248,225,.11)'); g.addColorStop(.5, 'rgba(40,28,10,.24)'); g.addColorStop(.54, 'rgba(40,28,10,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; if (vertical) ctx.fillRect(fx - 30, top, 60, h); else ctx.fillRect(left, fx - 30, w, 60);
    ctx.strokeStyle = 'rgba(255,246,220,.4)'; ctx.lineWidth = 1; ctx.beginPath(); if (vertical) { ctx.moveTo(fx + 1.2, top); ctx.lineTo(fx + 1.2, bottom); } else { ctx.moveTo(left, fx + 1.2); ctx.lineTo(right, fx + 1.2); } ctx.stroke();
  }
  const relief = ctx.createLinearGradient(left, top, right, bottom); relief.addColorStop(0, 'rgba(255,246,214,.12)'); relief.addColorStop(1, 'rgba(30,22,8,.18)');
  ctx.fillStyle = relief; ctx.fillRect(left, top, w, h);
  const wear = ctx.createRadialGradient(cx, cy, w * .3, cx, cy, w * .78); wear.addColorStop(0, 'rgba(78,58,24,0)'); wear.addColorStop(1, 'rgba(78,58,24,.42)');
  ctx.fillStyle = wear; ctx.fillRect(left, top, w, h);
  // The printed border, two lines with a tick at every box.
  ctx.strokeStyle = `${INK}.7)`; ctx.lineWidth = 1.6; ctx.strokeRect(left + 7, top + 7, w - 14, h - 14); ctx.lineWidth = .8; ctx.strokeRect(left + 11, top + 11, w - 22, h - 22);
  ctx.restore();
  // Tape at the corners.
  for (const [tx, ty, rot] of [[left + 8, top + 8, -.78], [right - 8, top + 8, .78], [right - 8, bottom - 8, -.78]]) {
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot); ctx.fillStyle = 'rgba(236,226,190,.62)'; ctx.fillRect(-18, -6, 36, 12); ctx.strokeStyle = 'rgba(120,100,50,.45)'; ctx.lineWidth = .8; ctx.strokeRect(-18, -6, 36, 12); ctx.restore();
  }
}
function chart(ctx) {
  if (typeof document === 'undefined') { paintChart(ctx); return; }
  if (!chartLayer) { chartLayer = document.createElement('canvas'); chartLayer.width = BOARD.width; chartLayer.height = BOARD.height; paintChart(chartLayer.getContext('2d')); }
  ctx.drawImage(chartLayer, 0, 0);
}
function plate(ctx, view) {
  chart(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(PLATE.left, PLATE.top, PLATE.right - PLATE.left, PLATE.bottom - PLATE.top); ctx.clip();
  // The printed boxes over the trees: fine ink lines, and red ink when the lesson is pointing at them.
  ctx.strokeStyle = view.grid ? 'rgba(176,56,30,.62)' : `${INK}.30)`; ctx.lineWidth = view.grid ? 1.3 : 1;
  ctx.beginPath();
  for (let m = Math.ceil(MAP.west / BOX_M) * BOX_M; m <= MAP.east + BOX_M; m += BOX_M) { ctx.moveTo(bx(m), PLATE.top); ctx.lineTo(bx(m), PLATE.bottom); }
  for (let m = Math.ceil(MAP.south / BOX_M) * BOX_M; m <= MAP.north + BOX_M; m += BOX_M) { ctx.moveTo(PLATE.left, by(m)); ctx.lineTo(PLATE.right, by(m)); }
  ctx.stroke();
  ctx.restore();
  // The north arrow, printed in two tones, and the scale bar, at the map's corners.
  ctx.fillStyle = '#2a2216'; ctx.beginPath(); ctx.moveTo(52, 34); ctx.lineTo(52, 56); ctx.lineTo(42, 62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#efe5c4'; ctx.beginPath(); ctx.moveTo(52, 34); ctx.lineTo(62, 62); ctx.lineTo(52, 56); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a2216'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(52, 34); ctx.lineTo(62, 62); ctx.lineTo(52, 56); ctx.lineTo(42, 62); ctx.closePath(); ctx.stroke();
  labelPlate(ctx, 52, 76, 26, 22, .7);
  text(ctx, 'N', 52, 76, {size: 18});
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(PLATE.left + 12, PLATE.bottom - 46, 214, 34, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(176,138,58,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
  const sx = PLATE.left + 24, sw = BOX_M * SCALE;
  ctx.fillStyle = '#f1ead2'; ctx.fillRect(sx, PLATE.bottom - 25, sw / 2, 6); ctx.fillStyle = '#14181a'; ctx.fillRect(sx + sw / 2, PLATE.bottom - 25, sw / 2, 6);
  ctx.strokeStyle = theme.text; ctx.lineWidth = 1.4; ctx.strokeRect(sx, PLATE.bottom - 25, sw, 6);
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, PLATE.bottom - 29); ctx.lineTo(sx, PLATE.bottom - 16); ctx.moveTo(sx + sw, PLATE.bottom - 29); ctx.lineTo(sx + sw, PLATE.bottom - 16); ctx.moveTo(sx + sw / 2, PLATE.bottom - 27); ctx.lineTo(sx + sw / 2, PLATE.bottom - 18); ctx.stroke();
  text(ctx, `1 box = ${BOX_M} m`, sx + sw + 12, PLATE.bottom - 29, {size: 14, align: 'left', colour: view.grid ? theme.accent : theme.text});
}
// The helipad: a concrete disc with its painted ring and H.
function pad(ctx, label) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(PAD.x + 3, PAD.y + 4, 27, 0, Math.PI * 2); ctx.fill();
  const slab = ctx.createRadialGradient(PAD.x - 8, PAD.y - 9, 3, PAD.x, PAD.y, 27); slab.addColorStop(0, '#9a9d97'); slab.addColorStop(1, '#5b5e5a');
  ctx.fillStyle = slab; ctx.beginPath(); ctx.arc(PAD.x, PAD.y, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(245,240,220,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(PAD.x, PAD.y, 21, 0, Math.PI * 2); ctx.stroke();
  text(ctx, 'H', PAD.x, PAD.y + 1, {size: 22, colour: 'rgba(245,240,220,.8)'});
  if (label) { labelPlate(ctx, PAD.x, PAD.y + 42, 90, 20, .6); text(ctx, 'Woods pad', PAD.x, PAD.y + 42, {size: 14, colour: theme.faint}); }
}
function spot(ctx, t, time) {
  const x = bx(t.x), y = by(t.y);
  if (t.kind === 'smoke') {
    ctx.fillStyle = 'rgba(176,56,30,.07)'; ctx.beginPath(); ctx.arc(x, y, RING_M * SCALE, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(176,56,30,.9)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(x, y, RING_M * SCALE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 7; i++) {
      const k = (time * .5 + i / 7) % 1, px = x + Math.sin(i * 2.3 + time) * 6 + k * 16, py = y - k * 46, pr = 7 + k * 14;
      const puff = ctx.createRadialGradient(px - pr * .25, py - pr * .25, 1, px, py, pr); puff.addColorStop(0, `rgba(226,222,214,${(.7 * (1 - k)).toFixed(2)})`); puff.addColorStop(1, `rgba(120,116,110,${(.35 * (1 - k)).toFixed(2)})`);
      ctx.fillStyle = puff; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
    const ember = ctx.createRadialGradient(x, y, 1, x, y, 9); ember.addColorStop(0, 'rgba(255,200,90,.9)'); ember.addColorStop(1, 'rgba(232,128,58,0)');
    ctx.fillStyle = ember; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8803a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (t.kind === 'hut') {
    // A log hut: planked walls, a two-tone roof, a chimney, a door with a brass knob and a lit window.
    ctx.fillStyle = 'rgba(30,22,8,.3)'; ctx.beginPath(); ctx.ellipse(x + 4, y - 12, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    const wall = ctx.createLinearGradient(0, y - 30, 0, y - 14); wall.addColorStop(0, '#a88056'); wall.addColorStop(1, '#6a4a2c');
    ctx.fillStyle = wall; ctx.fillRect(x - 11, y - 30, 22, 16);
    ctx.strokeStyle = 'rgba(30,16,6,.45)'; ctx.lineWidth = .8; ctx.beginPath(); for (const k of [-26, -22, -18]) { ctx.moveTo(x - 11, y + k); ctx.lineTo(x + 11, y + k); } ctx.stroke();
    ctx.fillStyle = '#3a2616'; ctx.fillRect(x - 3, y - 25, 6, 11); ctx.fillStyle = '#e0b23c'; ctx.beginPath(); ctx.arc(x + 1.6, y - 19, .9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2d98a'; ctx.fillRect(x + 5.4, y - 27, 4, 4);
    ctx.fillStyle = '#6b6560'; ctx.fillRect(x + 4, y - 44, 4, 8);
    ctx.fillStyle = '#7c4f35'; ctx.beginPath(); ctx.moveTo(x - 14, y - 29); ctx.lineTo(x, y - 41); ctx.lineTo(x, y - 29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4d2f1f'; ctx.beginPath(); ctx.moveTo(x + 14, y - 29); ctx.lineTo(x, y - 41); ctx.lineTo(x, y - 29); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,4,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 14, y - 29); ctx.lineTo(x, y - 41); ctx.lineTo(x + 14, y - 29); ctx.closePath(); ctx.stroke();
  }
  if (t.kind === 'marker') {
    ctx.fillStyle = theme.bad; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(20,8,4,.7)'; ctx.lineWidth = 1; ctx.stroke();
    groundFlag(ctx, x, y, theme.bad, 34);
    return;
  }
  if (t.kind !== 'lake') { labelPlate(ctx, x, y + 28, String(t.label ?? '').length * 8.6 + 14, 22, .62); text(ctx, t.label, x, y + 28, {size: 15, colour: theme.text}); }
  else { labelPlate(ctx, bx(LAKE.x), by(LAKE.y), String(t.label ?? '').length * 9 + 16, 24, .4); text(ctx, t.label, bx(LAKE.x), by(LAKE.y), {size: 16, colour: 'rgba(245,240,220,.9)'}); }
}
function tracks(ctx, view) {
  // A flown track is pencil: a graphite line a little uneven in its darkness, with a soft smudge under it.
  const pencil = (track, colour, width, smudge) => {
    if (track.length < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = smudge; ctx.lineWidth = width + 3; ctx.beginPath(); ctx.moveTo(bx(track[0].x), by(track[0].y)); for (const p of track) ctx.lineTo(bx(p.x), by(p.y)); ctx.stroke();
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(bx(track[0].x), by(track[0].y)); for (const p of track) ctx.lineTo(bx(p.x), by(p.y)); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  };
  const dashed = (track, colour, width, dash) => {
    if (track.length < 2) return;
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(bx(track[0].x), by(track[0].y)); for (const p of track) ctx.lineTo(bx(p.x), by(p.y)); ctx.stroke(); ctx.setLineDash([]);
  };
  for (const g of view.ghosts) {
    dashed(g, 'rgba(176,52,34,.9)', 3, [9, 6]);
    // Where that flight ended: a cross and how far it went, with its heading on the free test.
    const end = g.at(-1), x = bx(end.x), y = by(end.y), east = end.x - g[0].x, north = end.y - g[0].y, flown = Math.round(Math.hypot(east, north));
    ctx.strokeStyle = 'rgba(20,8,4,.7)'; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke();
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke();
    tag(ctx, view.labelGhosts ? `${three(Math.atan2(east, north) * 180 / Math.PI)}, ${flown} m` : `${flown} m`, x, y - 18, theme.bad);
  }
  pencil(view.track, 'rgba(44,44,52,.95)', 2.6, 'rgba(30,24,12,.28)');
  // The pencil line ends in a small arrowhead, pointing the way the helicopter went.
  if (view.track.length >= 2) {
    const a = view.track.at(-2), b = view.track.at(-1), ex = bx(b.x), ey = by(b.y), dir = Math.atan2(by(b.y) - by(a.y), bx(b.x) - bx(a.x));
    if (Math.hypot(ex - bx(a.x), ey - by(a.y)) > .01) {
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(dir); ctx.fillStyle = 'rgba(44,44,52,.95)'; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(-10, -5.5); ctx.lineTo(-7, 0); ctx.lineTo(-10, 5.5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
// A small label on a dark plate, so that it reads over the map.
function tag(ctx, label, x, y, colour = theme.text, size = 14) {
  const w = label.length * (size * .56) + 10;
  ctx.fillStyle = 'rgba(10,14,15,.82)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 4); ctx.fill();
  text(ctx, label, x, y, {size, colour});
}
// The angle of a heading, shaded from north clockwise round to the heading, with an arrowhead showing which way it is measured.
function angleFromNorth(ctx, x, y, r, deg, label = null) {
  const heading = round(deg), start = -Math.PI / 2, end = start + heading * Math.PI / 180;
  if (heading < .5) return;
  ctx.fillStyle = 'rgba(237,197,87,.26)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, start, end); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(24,16,4,.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r, start, end); ctx.stroke();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, start, end); ctx.stroke();
  // The north line that the angle starts from.
  ctx.strokeStyle = 'rgba(24,16,4,.7)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.strokeStyle = PLAIN; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r); ctx.stroke();
  const [ex, ey] = [x + Math.cos(end) * r, y + Math.sin(end) * r], [tx, ty] = [-Math.sin(end), Math.cos(end)], [ox, oy] = [Math.cos(end), Math.sin(end)], head = Math.min(9, r * .25);
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(ex + tx * head, ey + ty * head); ctx.lineTo(ex + ox * head * .7, ey + oy * head * .7); ctx.lineTo(ex - ox * head * .7, ey - oy * head * .7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(24,16,4,.7)'; ctx.lineWidth = 1; ctx.stroke();
  if (label) { const middle = start + heading * Math.PI / 360; tag(ctx, label, x + Math.cos(middle) * r, y + Math.sin(middle) * r, theme.accent); }
}
// The right-angled triangle that the sums use: north from the pad, then east, then the straight line back to the pad.
function triangleLines(ctx, view) {
  const t = view.triangle, e = Math.round(t.east), n = Math.round(t.north), x0 = bx(0), y0 = by(0), xe = bx(e), yn = by(n);
  const leg = (x1, y1, x2, y2, colour, width = 4) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(14,12,6,.72)'; ctx.lineWidth = width + 3.4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineCap = 'butt';
  };
  if (t.line && (e || n)) leg(x0, y0, xe, yn, theme.accent);
  if (n) leg(x0, y0, x0, yn, NORTH_COLOUR);
  if (e) leg(x0, yn, xe, yn, EAST_COLOUR);
  // The mark of the right angle.
  if (e && n) {
    const sx = Math.sign(e) * 11, sy = Math.sign(n) * 11;
    ctx.beginPath(); ctx.moveTo(x0 + sx, yn); ctx.lineTo(x0 + sx, yn + sy); ctx.lineTo(x0, yn + sy);
    ctx.strokeStyle = 'rgba(14,12,6,.72)'; ctx.lineWidth = 4.4; ctx.stroke(); ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.stroke();
  }
  if (t.arc && (e || n)) angleFromNorth(ctx, x0, y0, 52, Math.atan2(e, n) * 180 / Math.PI, `${(round(Math.atan2(e, n) * 180 / Math.PI)).toFixed(1)}°`);
}
// The sides' lengths, each beside its own side and away from the triangle, drawn last so that nothing crosses them.
function triangleTags(ctx, view) {
  const t = view.triangle, e = Math.round(t.east), n = Math.round(t.north), x0 = bx(0), y0 = by(0), xe = bx(e), yn = by(n), out = e >= 0 ? -1 : 1;
  if (n) tag(ctx, `${Math.abs(n)} m ${n > 0 ? 'north' : 'south'}`, x0 + out * 72, (y0 + yn) / 2, NORTH_COLOUR);
  if (e) tag(ctx, `${Math.abs(e)} m ${e > 0 ? 'east' : 'west'}`, (x0 + xe) / 2, yn + (n >= 0 ? -16 : 16), EAST_COLOUR);
  if (t.line && e && n) {
    const mx = (x0 + xe) / 2, my = (y0 + yn) / 2, away = Math.hypot(mx - x0, my - yn) || 1;
    tag(ctx, `${Math.hypot(e, n).toFixed(0)} m`, mx + (mx - x0) / away * 34, my + (my - yn) / away * 18, theme.accent);
  }
}
// The ruler: a strip of boxwood with a dark edge and engraved ticks, ending in a brass knob.
function ruler(ctx, view) {
  const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading), [px, py] = [-uy, ux], L = view.ruler.length;
  ctx.save(); ctx.translate(hx, hy);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(px * 9 + 3, py * 9 + 4); ctx.lineTo(px * 9 + ux * L * SCALE + 3, py * 9 + uy * L * SCALE + 4); ctx.lineTo(-px * 9 + ux * L * SCALE + 3, -py * 9 + uy * L * SCALE + 4); ctx.lineTo(-px * 9 + 3, -py * 9 + 4); ctx.closePath(); ctx.fill();
  const wood = ctx.createLinearGradient(px * 9, py * 9, -px * 9, -py * 9); wood.addColorStop(0, '#f0e2b0'); wood.addColorStop(.5, '#e2cf96'); wood.addColorStop(1, '#bba46a');
  ctx.fillStyle = wood; ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(px * 9, py * 9); ctx.lineTo(px * 9 + ux * L * SCALE, py * 9 + uy * L * SCALE); ctx.lineTo(-px * 9 + ux * L * SCALE, -py * 9 + uy * L * SCALE); ctx.lineTo(-px * 9, -py * 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let m = 0; m <= L; m += 50) { const k = m % 100 === 0 ? 9 : 5; ctx.beginPath(); ctx.moveTo(ux * m * SCALE + px * 9, uy * m * SCALE + py * 9); ctx.lineTo(ux * m * SCALE + px * (9 - k), uy * m * SCALE + py * (9 - k)); ctx.stroke(); }
  ctx.restore();
  const [ex, ey] = rulerEnd(view);
  const knob = ctx.createRadialGradient(ex - 3, ey - 3, 1, ex, ey, 10); knob.addColorStop(0, '#fff2b8'); knob.addColorStop(.5, '#e0b13f'); knob.addColorStop(1, '#6b4810');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(ex + 2, ey + 3, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = knob; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(40,24,4,.8)'; ctx.lineWidth = 1; ctx.stroke();
  // On the free test the label goes past the end of the ruler, clear of the compass; elsewhere it stays clear of the hut.
  if (view.plan != null) tag(ctx, `${Math.round(L)} m`, ex + ux * 36, ey + uy * 24, theme.accent);
  else { const lx = ex - px * 30 - ux * 52, ly = ey - py * 30 - uy * 52; labelPlate(ctx, lx, ly, `${Math.round(L)} m`.length * 11 + 14, 26, .62); text(ctx, `${Math.round(L)} m`, lx, ly, {size: 18, colour: theme.accent}); }
}
// Kestrel One from above: its nose along its heading, the rotor a turning disc, its shadow on the chart.
function kestrel(ctx, view) {
  const [x, y] = heliAt(view);
  helicopterTop(ctx, x, y, view.heli.heading * Math.PI / 180, view.time, 1.05);
}
// An engraved brass compass: a brass bezel round a dark glass dial with fine ticks, every tenth degree.
function compassFace(ctx, x, y, r) {
  ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x + 2, y + 4, r - 1, 0, Math.PI * 2); ctx.stroke();
  const brass = ctx.createLinearGradient(x - r, y - r, x + r, y + r); brass.addColorStop(0, '#ffe9a6'); brass.addColorStop(.45, '#d9a640'); brass.addColorStop(1, '#6b4810');
  ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.arc(x, y, r - 5, 0, Math.PI * 2, true); ctx.fill();
  ctx.fillStyle = 'rgba(12,20,22,.46)'; ctx.beginPath(); ctx.arc(x, y, r - 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,4,.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r - 5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,220,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 1.6, Math.PI * 1.1, Math.PI * 1.65); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,236,200,.85)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let d = 0; d < 360; d += 10) { const [ux, uy] = nose(d), long = d % 90 === 0 ? 11 : d % 30 === 0 ? 8 : 4; ctx.moveTo(x + ux * (r - 5), y + uy * (r - 5)); ctx.lineTo(x + ux * (r - 5 - long), y + uy * (r - 5 - long)); }
  ctx.stroke();
}
function compassRing(ctx, view) {
  const [x, y] = heliAt(view);
  compassFace(ctx, x, y, RING);
  for (let d = 0; d < 360; d += 90) {
    const [ux, uy] = nose(d);
    const label = view.rose ? `${'NESW'[d / 90]} ${three(d)}` : three(d), lx = x + ux * (RING + 30), ly = y + uy * (RING + 16), w = label.length * 9 + 10;
    ctx.fillStyle = 'rgba(10,14,15,.82)'; ctx.beginPath(); ctx.roundRect(lx - w / 2, ly - 11, w, 22, 4); ctx.fill();
    text(ctx, label, lx, ly, {size: 14, colour: theme.text});
  }
  // The angle being measured: from north, clockwise round to the heading.
  angleFromNorth(ctx, x, y, RING - 16, view.heli.heading, `${Math.round(round(view.heli.heading))}°`);
  // The heading itself: a brass needle across the dial, and its line carried on past the ring.
  const [ux, uy] = nose(view.heli.heading), [vx, vy] = [-uy, ux];
  ctx.strokeStyle = 'rgba(24,16,4,.7)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(x + ux * (RING + 8), y + uy * (RING + 8)); ctx.lineTo(x + ux * (RING + 70), y + uy * (RING + 70)); ctx.stroke();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + ux * (RING + 8), y + uy * (RING + 8)); ctx.lineTo(x + ux * (RING + 70), y + uy * (RING + 70)); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x + ux * (RING - 6), y + uy * (RING - 6)); ctx.lineTo(x + ux * 40 + vx * 3.6, y + uy * 40 + vy * 3.6); ctx.lineTo(x + ux * 26, y + uy * 26); ctx.lineTo(x + ux * 40 - vx * 3.6, y + uy * 40 - vy * 3.6); ctx.closePath();
  const needle = ctx.createLinearGradient(x - vx * 4, y - vy * 4, x + vx * 4, y + vy * 4); needle.addColorStop(0, '#ffe9a6'); needle.addColorStop(1, '#a8761c');
  ctx.fillStyle = needle; ctx.fill(); ctx.strokeStyle = 'rgba(30,18,2,.8)'; ctx.lineWidth = 1; ctx.stroke();
}
// A steel-framed panel beside the map with a small title.
function sidePanel(ctx, x, y, w, h, title) {
  steelPanel(ctx, x, y, w, h);
  text(ctx, title, x + w / 2, y + 22, {size: 16, colour: theme.faint, weight: 800});
}
// The HEADING gauge, three figures as in the helicopter, what the helicopter has flown, and the keys and results below.
function gauge(ctx, view) {
  const x = 762, w = 222;
  steelPanel(ctx, x, 40, w, 150);
  if (view.glow === 'compass') { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 1, 39, w + 2, 152, 8); ctx.stroke(); }
  text(ctx, 'HEADING', x + w / 2, 66, {size: 16, colour: theme.faint, weight: 800});
  lcd(ctx, x + 16, 84, w - 32, 78, NORTH_COLOUR);
  text(ctx, view.gauge, x + w / 2, 128, {size: 72, colour: NORTH_COLOUR, weight: 800});
  text(ctx, 'degrees clockwise from north', x + w / 2, 174, {size: 13, colour: theme.faint});
  if (view.flown != null) {
    sidePanel(ctx, x, 206, w, 92, 'FLOWN');
    lcd(ctx, x + 20, 236, w - 40, 62, NORTH_COLOUR);
    text(ctx, `${Math.round(view.flown)} m`, x + w / 2, 268, {size: 40, colour: NORTH_COLOUR, weight: 800});
  } else if (view.plan != null) {
    sidePanel(ctx, x, 206, w, 92, 'FLIGHT LENGTH');
    lcd(ctx, x + 20, 236, w - 40, 62, theme.accent);
    text(ctx, `${Math.round(view.plan)} m`, x + w / 2, 268, {size: 40, colour: theme.accent, weight: 800});
  } else if (view.marker) {
    const {east, north} = view.marker;
    sidePanel(ctx, x, 206, w, 92, 'MARKER');
    lcd(ctx, x + 14, 234, w - 28, 56, EAST_COLOUR);
    text(ctx, `${Math.abs(east)} m ${east < 0 ? 'west' : 'east'}`, x + w / 2, 250, {size: 24, colour: EAST_COLOUR, weight: 800});
    text(ctx, `${Math.abs(north)} m ${north < 0 ? 'south' : 'north'}`, x + w / 2, 278, {size: 24, colour: NORTH_COLOUR, weight: 800});
  }
  // The keys, with what each one does.
  const row = (y, key, label) => { keyCap(ctx, x + 22, y, key); text(ctx, label, x + 42, y, {size: 14, align: 'left'}); };
  if (view.keys.A) { row(324, 'A', 'turn left: number down'); row(354, 'D', 'turn right: number up'); }
  if (view.keys['→'] === 'ruler:longer') { row(324, '→', 'ruler longer'); row(354, '←', 'ruler shorter'); }
  if (view.keys['→'] === 'length:longer') { row(384, '→', 'longer flight'); row(414, '←', 'shorter flight'); }
  if (view.keys['↑']) { row(324, '↑', 'one box north'); row(354, '↓', 'one box south'); row(384, '→', 'one box east'); row(414, '←', 'one box west'); }
  // The free test's table: where each flight ended up.
  if (view.rows.length) {
    text(ctx, 'YOUR FLIGHTS', x + w / 2, 446, {size: 13, colour: theme.faint, weight: 800});
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, 456, w, 204, 6); ctx.clip(); ctx.fillStyle = 'rgba(8,16,14,.82)'; ctx.fillRect(x, 456, w, 204); ctx.restore();
    bezel(ctx, x, 456, w, 204, 6);
    view.rows.slice(-5).forEach((flight, i) => {
      const y = 460 + i * 40;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.07)'; ctx.fillRect(x, y, w, 38);
      text(ctx, `Heading ${three(flight.heading)} for ${flight.distance} m`, x + 8, y + 11, {size: 14, align: 'left', weight: 800});
      text(ctx, `${Math.abs(flight.east)} m ${flight.east < 0 ? 'west' : 'east'}, ${Math.abs(flight.north)} m ${flight.north < 0 ? 'south' : 'north'}`, x + 8, y + 28, {size: 13, align: 'left', colour: theme.accent});
    });
  }
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function drawMap(ctx, view) {
  background(ctx);
  plate(ctx, view);
  ctx.save(); ctx.beginPath(); ctx.rect(PLATE.left, PLATE.top, PLATE.right - PLATE.left, PLATE.bottom - PLATE.top); ctx.clip();
  pad(ctx, Math.hypot(view.heli.x, view.heli.y) > 150);
  tracks(ctx, view);
  if (view.ruler) ruler(ctx, view);
  if (view.triangle) triangleLines(ctx, view);
  if (view.spot) spot(ctx, view.spot, view.time);
  if (view.compass) compassRing(ctx, view);
  kestrel(ctx, view);
  if (view.triangle) triangleTags(ctx, view);
  if (view.glow === 'compass') { const [x, y] = heliAt(view); halo(ctx, x, y, RING + 8, view.time); }
  if (view.glow === 'ruler' && view.ruler) { const [x, y] = rulerEnd(view); halo(ctx, x, y, 18, view.time); }
  ctx.restore();
  gauge(ctx, view);
}

// ---- the recap ----
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    steelPanel(ctx, x, 40, w, 600);
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    miniScene(ctx, idea.id, x + w / 2, 195, view.time);
    wrap(ctx, idea.text, x + w / 2, 420, w - 30, {size: 19, weight: 600});
  });
}
function miniCompass(ctx, x, y, r, deg, labels = true) {
  compassFace(ctx, x, y, r);
  if (labels) for (const [d, l] of [[0, '000'], [90, '090'], [180, '180'], [270, '270']]) { const [ux, uy] = nose(d); text(ctx, l, x + ux * (r + 24), y + uy * (r + 14), {size: 15}); }
  angleFromNorth(ctx, x, y, r * .72, deg);
  const [ux, uy] = nose(deg);
  ctx.strokeStyle = 'rgba(24,16,4,.7)'; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * r * .9, y + uy * r * .9); ctx.stroke();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * r * .9, y + uy * r * .9); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x + ux * r * .9, y + uy * r * .9, Math.min(6, r * .12), 0, Math.PI * 2); ctx.fill();
  bolt(ctx, x, y, 3.4);
}
function miniScene(ctx, id, x, y, time) {
  if (id === 'heading') { miniCompass(ctx, x, y, 70, 70); text(ctx, '070', x, y + 124, {size: 30, colour: NORTH_COLOUR}); }
  if (id === 'turn') {
    const deg = round(350 + ((time * 30) % 40));
    miniCompass(ctx, x, y, 70, deg);
    text(ctx, three(deg), x, y + 124, {size: 30, colour: NORTH_COLOUR});
    keyCap(ctx, x - 70, y + 170, 'A'); text(ctx, 'down', x - 54, y + 170, {size: 14, align: 'left', colour: PLAIN});
    keyCap(ctx, x + 30, y + 170, 'D'); text(ctx, 'up', x + 46, y + 170, {size: 14, align: 'left', colour: PLAIN});
  }
  if (id === 'scale') {
    // Three boxes east and four north, the triangle of the sums, at 45 units a box, on a scrap of the chart.
    const s = 45, ox = x - 90, oy = y + 90;
    const scrap = ctx.createLinearGradient(ox - s, oy - 4 * s - 14, ox + 4 * s, oy + 14); scrap.addColorStop(0, '#cbbe92'); scrap.addColorStop(1, '#a89b6f');
    ctx.fillStyle = scrap; ctx.beginPath(); ctx.roundRect(ox - s, oy - 4 * s - 14, 5 * s + 14, 4 * s + 28, 4); ctx.fill();
    ctx.strokeStyle = `${INK}.4)`; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(ox - s / 2 + i * s, oy); ctx.lineTo(ox - s / 2 + i * s, oy - 4 * s); ctx.stroke(); }
    for (let j = 0; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(ox - s / 2, oy - j * s); ctx.lineTo(ox - s / 2 + 4 * s, oy - j * s); ctx.stroke(); }
    const side = (x1, y1, x2, y2, colour) => { ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(14,12,6,.72)'; ctx.lineWidth = 7.4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineCap = 'butt'; };
    side(ox, oy, ox, oy - 4 * s, NORTH_COLOUR); side(ox, oy - 4 * s, ox + 3 * s, oy - 4 * s, EAST_COLOUR); side(ox, oy, ox + 3 * s, oy - 4 * s, theme.accent);
    tag(ctx, '300 m', ox + 1.5 * s, oy - 4 * s - 14, EAST_COLOUR); tag(ctx, '400 m', ox - 8, oy - 2 * s, NORTH_COLOUR); tag(ctx, '500 m', ox + 2.2 * s, oy - 1.5 * s, theme.accent);
    text(ctx, '1 box = 100 m', x, y + 124, {size: 18, colour: theme.accent});
  }
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawMap(ctx, view);
  });
}
// The answer cards' pictures: a compass with one heading, a turn the short or long way, a distance in boxes.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  // A scrap of the chart pinned on the workshop wall, as in the recap.
  cardScene(ctx, w, h, {floorAt: h});
  const scrap = ctx.createLinearGradient(0, 0, w, h); scrap.addColorStop(0, '#cbbe92'); scrap.addColorStop(1, '#a89b6f');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(8, 9, w - 12, h - 12, 3); ctx.fill();
  ctx.fillStyle = scrap; ctx.beginPath(); ctx.roundRect(5, 5, w - 10, h - 10, 3); ctx.fill();
  ctx.strokeStyle = `${INK}.55)`; ctx.lineWidth = 1; ctx.stroke();
  for (const [bx, by] of [[11, 11], [w - 11, 11], [11, h - 11], [w - 11, h - 11]]) bolt(ctx, bx, by, 2);
  const cx = w / 2, cy = h / 2;
  if (picture.kind === 'heading') {
    miniCompass(ctx, cx, cy + 6, 37, picture.deg, false);
    tag(ctx, 'N', cx, 11, theme.text);
  }
  if (picture.kind === 'wrap') {
    const r = 40, at = d => [cx + Math.sin(d * Math.PI / 180) * r, cy - Math.cos(d * Math.PI / 180) * r];
    compassFace(ctx, cx, cy, r);
    // Only the way the turn sets off from 350, the same length each way, so the picture does not settle which turn is smaller.
    const setOff = dir => {
      const from = (350 - 90) * Math.PI / 180, to = (350 + dir * 14 - 90) * Math.PI / 180, ex = cx + Math.cos(to) * r, ey = cy + Math.sin(to) * r, tx = -Math.sin(to) * dir, ty = Math.cos(to) * dir, ox = Math.cos(to), oy = Math.sin(to);
      ctx.strokeStyle = theme.accent; ctx.fillStyle = theme.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, Math.min(from, to), Math.max(from, to)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + tx * 11, ey + ty * 11); ctx.lineTo(ex + ox * 7, ey + oy * 7); ctx.lineTo(ex - ox * 7, ey - oy * 7); ctx.closePath(); ctx.fill();
    };
    if (picture.way === 'right' || picture.way === 'same') setOff(1);
    if (picture.way === 'left' || picture.way === 'same') setOff(-1);
    for (const [d, l] of [[350, '350'], [10, '010']]) { const [x, y] = at(d); ctx.fillStyle = theme.text; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); tag(ctx, l, x + (d === 350 ? -28 : 28), y + 2, theme.text, 15); }
  }
  if (picture.kind === 'boxes') {
    const sq = 26, n = picture.m / BOX_M, x0 = 14, y0 = cy;
    ctx.strokeStyle = `${INK}.5)`; ctx.lineWidth = 1;
    for (let i = 0; i * sq <= w - 28; i++) ctx.strokeRect(x0 + i * sq, y0 - sq / 2, sq, sq);
    const long = Math.min(n * sq, w - 28);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(14,12,6,.75)'; ctx.lineWidth = 7.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + long, y0); ctx.stroke();
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + long, y0); ctx.stroke(); ctx.lineCap = 'butt';
    if (n * sq > w - 28) { ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(w - 6, y0); ctx.lineTo(w - 16, y0 - 7); ctx.lineTo(w - 16, y0 + 7); ctx.fill(); }
  }
}
