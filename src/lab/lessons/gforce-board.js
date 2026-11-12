// The G-force classroom board: a large overhead turn and controls in the
// workshop style used by the other classroom lessons.
import {BOARD, theme, background, text, keyCap, fitBoard, wrap, steelPanel, steel, bolt, lcd, forceArrowTo, roadCarTop, labelPlate, grain} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const SPEED = Object.freeze({down: [690, 145], up: [910, 145]});
const RADIUS = Object.freeze({down: [690, 291], up: [910, 291]});
const RUN = [800, 490];
const CIRCLE = Object.freeze({x: 300, y: 295});
const hit = (x, y, cx, cy, rx = 66, ry = 28) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
const radiusPx = metres => 120 + metres * .4;

export function hitTest(view, x, y) {
  if (view.keys['←'] && hit(x, y, ...SPEED.down)) return {action: 'speed:down'};
  if (view.keys['→'] && hit(x, y, ...SPEED.up)) return {action: 'speed:up'};
  if (view.keys['↓'] && hit(x, y, ...RADIUS.down)) return {action: 'radius:down'};
  if (view.keys['↑'] && hit(x, y, ...RADIUS.up)) return {action: 'radius:up'};
  if (view.keys.Space && hit(x, y, ...RUN, 110, 30)) return {action: view.keys.Space};
  return null;
}

export function hoverInfo(view, x, y) {
  if (hit(x, y, CIRCLE.x, CIRCLE.y, 205, 205)) return `The car follows the marked circle. The radius from the centre is ${view.radiusM} m.`;
  if (hit(x, y, ...SPEED.down) || hit(x, y, ...SPEED.up)) return `The speed dial reads ${view.speedKmh} km/h.`;
  if (hit(x, y, ...RADIUS.down) || hit(x, y, ...RADIUS.up)) return `The radius is ${view.radiusM} m from the turn centre to the car.`;
  if (hit(x, y, ...RUN, 120, 36) && view.keys.Space) return 'Run the turn and record the meter reading.';
  return null;
}

export function targetPoint(view, action) {
  if (action === 'set:best' && view.best) {
    if (view.setting !== view.best.speed) return view.setting < view.best.speed ? SPEED.up : SPEED.down;
    if (view.radiusM !== view.best.radius) return view.radiusM < view.best.radius ? RADIUS.up : RADIUS.down;
  }
  if (action === 'speed:up') return SPEED.up;
  if (action === 'speed:down') return SPEED.down;
  if (action === 'radius:up') return RADIUS.up;
  if (action === 'radius:down') return RADIUS.down;
  if (action === 'run') return RUN;
  // Answer cards live in the classroom UI outside this canvas.
  if (action?.startsWith('answer:')) return null;
  if (view.focus === 'speed') return [765, 95];
  if (view.focus === 'radius') return [765, 240];
  return [CIRCLE.x, CIRCLE.y];
}

function panel(ctx, x, y, width, height) { steelPanel(ctx, x, y, width, height); }

function button(ctx, [x, y], label, key, enabled) {
  ctx.globalAlpha = enabled ? 1 : .38;
  const face = ctx.createLinearGradient(0, y - 19, 0, y + 19); face.addColorStop(0, '#3a4448'); face.addColorStop(.5, '#272f33'); face.addColorStop(1, '#161c1f');
  ctx.fillStyle = face; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - 58, y - 19, 116, 38, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x - 52, y - 17.5, 104, 1);
  text(ctx, label, x + 10, y, {size: 14, weight: 800}); keyCap(ctx, x - 37, y, key);
  ctx.globalAlpha = 1;
}

// A lit arrow along any direction; `width` is the shaft's width as the old flat arrows had it.
function arrow(ctx, x1, y1, x2, y2, colour, width = 4) { forceArrowTo(ctx, x1, y1, x2, y2, colour, width * 1.5); }

// The test yard seen from above, painted once for each radius and copied: a concrete pad, the tarmac lane round it with its
// worn edge lines, the dashed brass centre line and the paint marks across it. Where there is no page (the tests) it is
// painted straight onto the board.
const yards = new Map(), LANE = 22, PAD_EDGE = 38;
function paintYard(ctx, cx, cy, r) {
  const outer = r + PAD_EDGE;
  ctx.fillStyle = 'rgba(0,0,0,.20)'; ctx.beginPath(); ctx.arc(cx + 4, cy + 6, outer + 3, 0, Math.PI * 2); ctx.fill();
  const slab = ctx.createRadialGradient(cx - outer * .3, cy - outer * .35, 20, cx, cy, outer);
  slab.addColorStop(0, '#585b57'); slab.addColorStop(.6, '#42464a'); slab.addColorStop(1, '#2c3033');
  ctx.fillStyle = slab; ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.clip();
  // Slab joints and oil stains on the concrete.
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (const k of [-.55, -.1, .4]) { ctx.moveTo(cx - outer, cy + k * outer); ctx.lineTo(cx + outer, cy + k * outer - 30); }
  for (const k of [-.4, .15, .6]) { ctx.moveTo(cx + k * outer, cy - outer); ctx.lineTo(cx + k * outer + 24, cy + outer); }
  ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(cx + (grain(i + 30) - .5) * outer * 1.5, cy + (grain(i + 40) - .5) * outer * 1.5, 12 + grain(i + 50) * 22, 5 + grain(i + 60) * 8, grain(i) * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,236,200,.14)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, outer - 1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, outer + 1, 0, Math.PI * 2); ctx.stroke();
  // The lane.
  const road = ctx.createRadialGradient(cx, cy, r - LANE, cx, cy, r + LANE); road.addColorStop(0, '#26282b'); road.addColorStop(.5, '#2c2e31'); road.addColorStop(1, '#222427');
  ctx.fillStyle = road; ctx.beginPath(); ctx.arc(cx, cy, r + LANE, 0, Math.PI * 2); ctx.arc(cx, cy, r - LANE, 0, Math.PI * 2, true); ctx.fill();
  for (let i = 0, n = Math.min(1100, Math.round(r * 5)); i < n; i++) {
    const a = grain(i * 3) * Math.PI * 2, d = r - LANE + grain(i * 3 + 1) * LANE * 2;
    ctx.fillStyle = grain(i * 3 + 2) > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.2)'; ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5, 1.2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3; for (const d of [-LANE, LANE]) { ctx.beginPath(); ctx.arc(cx, cy, r + d, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(235,230,214,.55)'; ctx.lineWidth = 2; ctx.setLineDash([46, 5, 30, 4, 60, 7]);
  for (const d of [-LANE + 3, LANE - 3]) { ctx.beginPath(); ctx.arc(cx, cy, r + d, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]);
  // The brass centre line, and a paint mark across the lane every 15 degrees.
  ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(245,240,220,.6)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 24; i++) { const t = i * Math.PI / 12; ctx.moveTo(cx + Math.cos(t) * (r - 9), cy + Math.sin(t) * (r - 9)); ctx.lineTo(cx + Math.cos(t) * (r + 9), cy + Math.sin(t) * (r + 9)); }
  ctx.stroke();
}
function yard(ctx, r) {
  if (typeof document === 'undefined') { paintYard(ctx, CIRCLE.x, CIRCLE.y, r); return; }
  const half = Math.ceil(r + PAD_EDGE + 8), key = Math.round(r);
  let layer = yards.get(key);
  if (!layer) { layer = document.createElement('canvas'); layer.width = layer.height = half * 2; paintYard(layer.getContext('2d'), half, half, r); yards.set(key, layer); }
  ctx.drawImage(layer, CIRCLE.x - half, CIRCLE.y - half);
}

// The turning arm: a bolted centre post, a steel arm with a counterweight on the far side, and the car at its end.
function arm(ctx, a, r) {
  const {x, y} = CIRCLE;
  ctx.save(); ctx.translate(x + 4, y + 7); ctx.rotate(a); ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(-74, -6, r + 74, 12); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  steel(ctx, -62, -5, r + 62, 10, 3);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let k = -40; k < r - 40; k += 44) ctx.fillRect(k - 6, -5, 1, 10);
  for (let k = -40; k < r - 30; k += 44) bolt(ctx, k, 0, 1.9);
  // The counterweight: a cast iron block with hazard paint on its face.
  const iron = ctx.createLinearGradient(0, -13, 0, 13); iron.addColorStop(0, '#6b747a'); iron.addColorStop(.5, '#3b4348'); iron.addColorStop(1, '#171c1f');
  ctx.fillStyle = iron; ctx.beginPath(); ctx.roundRect(-80, -13, 30, 26, 3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(-80, -13, 30, 26); ctx.clip();
  ctx.fillStyle = 'rgba(224,178,60,.9)'; for (let k = -92; k < -40; k += 12) { ctx.beginPath(); ctx.moveTo(k, 13); ctx.lineTo(k + 6, 13); ctx.lineTo(k + 18, -13); ctx.lineTo(k + 12, -13); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect(-80, -13, 30, 26, 3); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-78, -12, 26, 1); bolt(ctx, -76, -9, 1.6); bolt(ctx, -76, 9, 1.6);
  ctx.restore();
}
function post(ctx) {
  const {x, y} = CIRCLE;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 8, 24, 20, 0, 0, Math.PI * 2); ctx.fill();
  const plate = ctx.createRadialGradient(x - 8, y - 9, 2, x, y, 22); plate.addColorStop(0, '#c7d0d5'); plate.addColorStop(.6, '#6c767c'); plate.addColorStop(1, '#2f3639');
  ctx.fillStyle = plate; ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  for (let k = 0; k < 6; k++) bolt(ctx, x + Math.cos(k * Math.PI / 3 + .3) * 16.5, y + Math.sin(k * Math.PI / 3 + .3) * 16.5, 2);
  const column = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, 11); column.addColorStop(0, '#f1f4f5'); column.addColorStop(.5, '#a0aab0'); column.addColorStop(1, '#4a5358');
  ctx.fillStyle = column; ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#30383b'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - 1.4, y - 1.6, 1.4, 0, Math.PI * 2); ctx.fill();
}

function drawTurn(ctx, view) {
  // The largest radius is 200 px, so the full circle stays inside x 100..500 and y 95..495,
  // clear of the heading, controls (x >= 560), and the lower inset (y >= 515).
  const r = radiusPx(view.radiusM), a = view.time * (view.speedKmh / 3.6 / Math.max(1, view.radiusM)) * 1.1 - .6;
  const x = CIRCLE.x + Math.cos(a) * r, y = CIRCLE.y + Math.sin(a) * r;
  yard(ctx, r);
  // The tyres' marks trail behind the car and darken with speed.
  const speed = Math.min(1, view.speedKmh / 130), trail = (70 + speed * 170) / r, steps = 26;
  ctx.lineCap = 'round';
  for (let i = 0; i < steps; i++) {
    const fade = Math.pow(1 - i / steps, 1.3), from = a - 46 / r - i * trail / steps, to = from - trail / steps - .02;
    ctx.strokeStyle = `rgba(8,9,10,${((.08 + speed * .55) * fade).toFixed(3)})`; ctx.lineWidth = 3 + speed * 1.4;
    for (const d of [-10, 10]) { ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, r + d, to, from); ctx.stroke(); }
  }
  ctx.lineCap = 'butt';
  arm(ctx, a, r);
  post(ctx);
  roadCarTop(ctx, x, y, {scale: .95, angle: a + Math.PI / 2, steer: .3});
  ctx.fillStyle = '#9aa4aa'; ctx.beginPath(); ctx.arc(x, y, 4.4, 0, Math.PI * 2); ctx.fill(); bolt(ctx, x, y, 3);
  const tangent = a + Math.PI / 2, g = view.g ?? view.meterBaseline ?? 0, force = 52 + Math.min(1, Math.max(0, g) / 3) * 70;
  arrow(ctx, x + Math.cos(tangent) * 50, y + Math.sin(tangent) * 50, x + Math.cos(tangent) * 108, y + Math.sin(tangent) * 108, '#79bce2', 4);
  arrow(ctx, x - Math.cos(a) * 19, y - Math.sin(a) * 19, x - Math.cos(a) * force, y - Math.sin(a) * force, '#ef7654', 5);
  // The key stays in the top-left corner, which the circle never reaches, so no label crosses the moving car.
  labelPlate(ctx, 118, 95, 168, 98, .6);
  [['TURN CENTRE', '#d9ae54'], [`RADIUS ${view.radiusM} m`, '#e0b451'], ['SPEED', '#79bce2'], ['SIDEWAYS PUSH', '#ef7654']].forEach(([label, colour], i) => {
    ctx.fillStyle = colour; ctx.fillRect(42, 52 + i * 21, 12, 12);
    text(ctx, label, 62, 58 + i * 21, {size: 13, align: 'left', weight: 900, colour});
  });
}

// The inside of a car's cabin from the side: roof lining, the glass, the pillars and the sill, with the cord hanging from
// the roof and a brass weight on its end.
function drawCordInset(ctx, view) {
  panel(ctx, 35, 515, 275, 140);
  text(ctx, 'THE CORD IN THE CAR', 52, 535, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  const g = view.g ?? view.meterBaseline ?? 0, lean = 8 + Math.min(48, Math.max(0, g) * 17);
  const anchor = [168, 558];
  // The cabin: glass with the dusk in it, a seat back on the left, red pillars and a dark sill.
  const glass = ctx.createLinearGradient(0, 559, 0, 623); glass.addColorStop(0, '#6a8a98'); glass.addColorStop(.55, '#2d4552'); glass.addColorStop(1, '#13202a');
  ctx.fillStyle = glass; ctx.fillRect(100, 559, 136, 64);
  ctx.save(); ctx.beginPath(); ctx.rect(100, 559, 136, 64); ctx.clip();
  ctx.fillStyle = 'rgba(8,12,14,.6)'; ctx.beginPath(); ctx.roundRect(104, 574, 17, 15, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(101, 592); ctx.lineTo(127, 592); ctx.lineTo(133, 623); ctx.lineTo(100, 623); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(190, 559); ctx.lineTo(210, 559); ctx.lineTo(184, 623); ctx.lineTo(164, 623); ctx.closePath(); ctx.fill();
  ctx.restore();
  const pillar = ctx.createLinearGradient(0, 547, 0, 628); pillar.addColorStop(0, '#d8604c'); pillar.addColorStop(1, '#6b2218');
  ctx.fillStyle = pillar; ctx.fillRect(90, 547, 10, 81); ctx.fillRect(236, 547, 10, 81);
  const lining = ctx.createLinearGradient(0, 547, 0, 559); lining.addColorStop(0, '#cfc8b6'); lining.addColorStop(1, '#7a7569');
  ctx.fillStyle = lining; ctx.fillRect(90, 547, 156, 12);
  ctx.fillStyle = '#1b2022'; ctx.fillRect(90, 623, 156, 5);
  ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.2; ctx.strokeRect(90, 547, 156, 81);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(92, 548, 152, 1);
  // The vertical reference, then the cord, its twist, and the brass weight.
  ctx.strokeStyle = '#9aa2a6'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(anchor[0], anchor[1] + 55); ctx.stroke(); ctx.setLineDash([]);
  const [bx, by] = [anchor[0] + lean, anchor[1] + 55];
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(anchor[0] + 1.5, anchor[1] + 1.5); ctx.lineTo(bx + 1.5, by + 1.5); ctx.stroke();
  ctx.strokeStyle = '#e3c97a'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(...anchor); ctx.lineTo(bx, by); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.setLineDash([1.5, 2.5]); ctx.strokeStyle = 'rgba(60,36,6,.6)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(...anchor); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
  steel(ctx, anchor[0] - 6, anchor[1] - 12, 12, 6, 2); bolt(ctx, anchor[0] - 3, anchor[1] - 9, 1.2); bolt(ctx, anchor[0] + 3, anchor[1] - 9, 1.2);
  ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(anchor[0], anchor[1], 3, 0, Math.PI * 2); ctx.fill();
  const brass = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9); brass.addColorStop(0, '#fff2b8'); brass.addColorStop(.45, '#dcaa44'); brass.addColorStop(1, '#5b3d0e');
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(bx + 2, by + 3, 8.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(bx, by, 8.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(40,24,4,.7)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#b88a30'; ctx.fillRect(bx - 2.4, by - 10, 4.8, 3);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(bx - 3, by - 3.4, 2.4, 1.4, -.7, 0, Math.PI * 2); ctx.fill();
  text(ctx, `Cord leans out at ${Number(g).toFixed(2)} g`, 52, 635, {size: 12, align: 'left', colour: '#dfd8c6'});
}

function drawControls(ctx, view) {
  // Speed panel y=48..178: its label/value line is at 76; button rectangles
  // are x=632..748 and 852..968, y=126..164.
  panel(ctx, 560, 48, 410, 130);
  text(ctx, 'SPEED', 590, 76, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  lcd(ctx, 714, 53, 152, 46, '#79bce2');
  text(ctx, `${view.speedKmh} km/h`, 790, 76, {size: 27, weight: 900});
  button(ctx, SPEED.down, 'Slower', '←', Boolean(view.keys['←'])); button(ctx, SPEED.up, 'Faster', '→', Boolean(view.keys['→']));

  // Radius panel y=194..324: label/value at 222; buttons occupy y=272..310.
  panel(ctx, 560, 194, 410, 130);
  text(ctx, view.radiusKnown ? 'RADIUS' : 'ARM LENGTH', 590, 222, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  lcd(ctx, 714, 199, 152, 46, '#e0b451');
  text(ctx, `${view.radiusM} m`, 790, 222, {size: 27, weight: 900});
  button(ctx, RADIUS.down, 'Shorter', '↓', Boolean(view.keys['↓'])); button(ctx, RADIUS.up, 'Wider', '↑', Boolean(view.keys['↑']));

  // Meter panel y=340..442; its meter and scale sit below the label/value row.
  panel(ctx, 560, 340, 410, 102);
  text(ctx, view.accelerationKnown ? 'SIDEWAYS ACCELERATION' : 'SIDEWAYS PUSH', 590, 367, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  lcd(ctx, 818, 347, 126, 44, '#72c888');
  text(ctx, view.g == null ? '? g' : `${view.g.toFixed(2)} g`, 880, 369, {size: 25, weight: 900, colour: view.g == null ? theme.text : '#9ee7ab'});
  ctx.fillStyle = '#05100a'; ctx.beginPath(); ctx.roundRect(588, 403, 354, 12, 4); ctx.fill();
  ctx.fillStyle = '#384344'; ctx.fillRect(590, 405, 350, 8);
  if (view.g != null) {
    const fill = Math.min(350, Math.max(0, view.g / 3.5 * 350)), lit = ctx.createLinearGradient(0, 405, 0, 413); lit.addColorStop(0, '#a6f0b4'); lit.addColorStop(1, '#3e9858');
    ctx.fillStyle = lit; ctx.fillRect(590, 405, fill, 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 1; k < 7; k++) ctx.fillRect(590 + k * 50 - .5, 405, 1, 8);
  text(ctx, '0 g', 590, 430, {size: 11, align: 'left'}); text(ctx, '3.5 g', 940, 430, {size: 11, align: 'right'});
  if (view.keys.Space) button(ctx, RUN, 'Run the turn', 'Sp', true);
}

function drawRows(ctx, view) {
  if (!view.rows.length) return;
  panel(ctx, 330, 515, 640, 140);
  text(ctx, 'RECORDED TURNS', 350, 535, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  lcd(ctx, 346, 547, 608, 92, '#72c888');
  view.rows.slice(-3).forEach((item, i) => {
    const rowNumber = view.rows.length - Math.min(3, view.rows.length) + i + 1;
    text(ctx, `Run ${rowNumber}: ${item.speed} km/h  ·  ${item.radius} m  ·  ${item.g} g`, 352, 563 + i * 25, {size: 14, align: 'left', weight: 700});
  });
}

function glow(ctx, view) {
  const box = view.glow === 'speed' ? [558, 46, 414, 134] : view.glow === 'radius' ? [558, 192, 414, 134] : view.glow ? [558, 46, 414, 400] : null;
  if (!box) return;
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .55 + .25 * Math.sin(view.time * 5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(...box, 10); ctx.stroke(); ctx.globalAlpha = 1;
}

// The recap's three cards: each key idea in words, with the readings that show it.
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, 40, w, 600);
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    wrap(ctx, idea.text, x + w / 2, 110, w - 44, {size: 19, weight: 600});
    if (idea.id === 'turning') {
      const cx = x + w / 2, cy = 440, r = 80;
      ctx.strokeStyle = '#2b2d30'; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,230,214,.5)'; ctx.lineWidth = 1.5; for (const d of [-13, 13]) { ctx.beginPath(); ctx.arc(cx, cy, r + d, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      roadCarTop(ctx, cx, cy - r, {scale: .48, steer: .3});
      arrow(ctx, cx + 25, cy - r, cx + 70, cy - r, '#79bce2', 4);
      arrow(ctx, cx, cy - r + 11, cx, cy - r + 56, '#ef7654', 5);
      text(ctx, 'SPEED', cx + 40, cy - r - 16, {size: 13, weight: 900, colour: '#a8d9f1'});
      text(ctx, 'SIDEWAYS PUSH', cx, cy + 16, {size: 13, weight: 900, colour: '#ff9b7e'});
    }
    (view.ideaRows?.[idea.id] ?? []).forEach((line, k) => text(ctx, line, x + w / 2, 420 + k * 34, {size: 18, weight: 800, colour: '#9ee7ab'}));
  });
}

export function drawBoard(ctx, view, width = BOARD.width, height = BOARD.height) {
  return fitBoard(ctx, width, height, () => {
    background(ctx);
    if (view.scene === 'recap') { drawRecap(ctx, view); return; }
    text(ctx, 'TURNING ARM WORKSHOP', 42, 30, {size: 15, align: 'left', weight: 900, colour: '#d5b65f'});
    drawTurn(ctx, view); drawControls(ctx, view); drawCordInset(ctx, view); drawRows(ctx, view); glow(ctx, view);
  });
}

export function drawPicture(ctx, picture, width, height) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#343c3f'); gradient.addColorStop(1, '#1b2224');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  const cx = width * .34, cy = height * .53, r = Math.min(width, height) * .30;
  ctx.strokeStyle = '#c6a75e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#d7ab4f'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  const g = picture.g == null || !Number.isFinite(Number(picture.g)) ? null : Number(picture.g);
  const lean = g == null ? 5 : 5 + Math.min(22, g * 8);
  ctx.strokeStyle = '#e2bd68'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r + lean, cy + 29); ctx.stroke();
  ctx.fillStyle = '#e2bd68'; ctx.beginPath(); ctx.arc(cx + r + lean, cy + 29, 4, 0, Math.PI * 2); ctx.fill();
  arrow(ctx, cx + r + 4, cy - 8, cx + r + 30, cy - 8, '#79bce2', 2);
  text(ctx, g == null ? 'Reading?' : `${g.toFixed(2)} g`, width * .72, height * .52, {size: 16, weight: 900});
  text(ctx, 'sideways push', width * .72, height * .74, {size: 10, colour: '#ff9b7e'});
  ctx.restore();
}
