// The G-force classroom board: a large overhead turn and controls in the
// workshop style used by the other classroom lessons.
import {BOARD, theme, background, text, keyCap, fitBoard, wrap} from '../classroom/board-art.js';

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

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(13,18,20,.91)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill(); ctx.stroke();
}

function button(ctx, [x, y], label, key, enabled) {
  ctx.globalAlpha = enabled ? 1 : .38;
  ctx.fillStyle = '#252c2f'; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - 58, y - 19, 116, 38, 6); ctx.fill(); ctx.stroke();
  text(ctx, label, x + 10, y, {size: 14, weight: 800}); keyCap(ctx, x - 37, y, key);
  ctx.globalAlpha = 1;
}

function arrow(ctx, x1, y1, x2, y2, colour, width = 4) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(angle - .45), y2 - 12 * Math.sin(angle - .45));
  ctx.lineTo(x2 - 12 * Math.cos(angle + .45), y2 - 12 * Math.sin(angle + .45));
  ctx.closePath(); ctx.fill(); ctx.lineCap = 'butt';
}

function car(ctx, x, y, angle, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  const paint = ctx.createLinearGradient(0, -18, 0, 22);
  paint.addColorStop(0, '#e4ded0'); paint.addColorStop(.45, '#b6b1a5'); paint.addColorStop(1, '#727879');
  ctx.fillStyle = paint; ctx.strokeStyle = '#1a2022'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-42, 15); ctx.lineTo(-40, 0); ctx.lineTo(-22, -4); ctx.lineTo(-10, -18); ctx.lineTo(20, -18); ctx.lineTo(34, -2); ctx.lineTo(43, 3); ctx.lineTo(41, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#415159'; ctx.fillRect(-10, -14, 17, 11); ctx.fillRect(10, -14, 12, 11);
  for (const wx of [-26, 27]) { ctx.fillStyle = '#121617'; ctx.beginPath(); ctx.arc(wx, 15, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawTurn(ctx, view) {
  // The largest radius is 200 px, so the full circle stays inside x 100..500 and y 95..495,
  // clear of the heading, controls (x >= 560), and the lower inset (y >= 515).
  const r = radiusPx(view.radiusM), a = view.time * (view.speedKmh / 3.6 / Math.max(1, view.radiusM)) * 1.1 - .6;
  const x = CIRCLE.x + Math.cos(a) * r, y = CIRCLE.y + Math.sin(a) * r;
  ctx.strokeStyle = 'rgba(217,166,64,.22)'; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  // Repeated paint marks make the whole circular route clear from above.
  ctx.strokeStyle = 'rgba(245,240,220,.65)'; ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const t = i * Math.PI / 12, r1 = r - 9, r2 = r + 9; ctx.beginPath(); ctx.moveTo(CIRCLE.x + Math.cos(t) * r1, CIRCLE.y + Math.sin(t) * r1); ctx.lineTo(CIRCLE.x + Math.cos(t) * r2, CIRCLE.y + Math.sin(t) * r2); ctx.stroke(); }
  ctx.strokeStyle = '#e0b451'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(CIRCLE.x, CIRCLE.y); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#d9ae54'; ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#30383b'; ctx.beginPath(); ctx.arc(CIRCLE.x, CIRCLE.y, 5, 0, Math.PI * 2); ctx.fill();
  car(ctx, x, y, a + Math.PI / 2, .82);
  const tangent = a + Math.PI / 2, speedLen = 72;
  arrow(ctx, x + Math.cos(tangent) * 10, y + Math.sin(tangent) * 10,
    x + Math.cos(tangent) * speedLen, y + Math.sin(tangent) * speedLen, '#79bce2', 4);
  const g = view.g ?? view.meterBaseline ?? 0, force = 32 + Math.min(1, Math.max(0, g) / 3) * 70;
  arrow(ctx, x - Math.cos(a) * 8, y - Math.sin(a) * 8, x - Math.cos(a) * force, y - Math.sin(a) * force, '#ef7654', 5);
  // The key stays in the top-left corner, which the circle never reaches, so no label crosses the moving car.
  [['TURN CENTRE', '#d9ae54'], [`RADIUS ${view.radiusM} m`, '#e0b451'], ['SPEED', '#79bce2'], ['SIDEWAYS PUSH', '#ef7654']].forEach(([label, colour], i) => {
    ctx.fillStyle = colour; ctx.fillRect(42, 52 + i * 21, 12, 12);
    text(ctx, label, 62, 58 + i * 21, {size: 13, align: 'left', weight: 900, colour});
  });
}

function drawCordInset(ctx, view) {
  panel(ctx, 35, 515, 275, 140);
  text(ctx, 'THE CORD IN THE CAR', 52, 535, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  const g = view.g ?? view.meterBaseline ?? 0, lean = 8 + Math.min(48, Math.max(0, g) * 17);
  const anchor = [168, 558];
  ctx.strokeStyle = '#9aa2a6'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(anchor[0], anchor[1] + 55); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#e2bd68'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(...anchor); ctx.lineTo(anchor[0] + lean, anchor[1] + 55); ctx.stroke();
  ctx.fillStyle = '#e2bd68'; ctx.beginPath(); ctx.arc(anchor[0] + lean, anchor[1] + 55, 8, 0, Math.PI * 2); ctx.fill();
  car(ctx, 168, 564, 0, .38);
  text(ctx, `Cord leans out at ${Number(g).toFixed(2)} g`, 52, 635, {size: 12, align: 'left', colour: '#dfd8c6'});
}

function drawControls(ctx, view) {
  // Speed panel y=48..178: its label/value line is at 76; button rectangles
  // are x=632..748 and 852..968, y=126..164.
  panel(ctx, 560, 48, 410, 130);
  text(ctx, 'SPEED', 590, 76, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, `${view.speedKmh} km/h`, 790, 76, {size: 27, weight: 900});
  button(ctx, SPEED.down, 'Slower', '←', Boolean(view.keys['←'])); button(ctx, SPEED.up, 'Faster', '→', Boolean(view.keys['→']));

  // Radius panel y=194..324: label/value at 222; buttons occupy y=272..310.
  panel(ctx, 560, 194, 410, 130);
  text(ctx, view.radiusKnown ? 'RADIUS' : 'ARM LENGTH', 590, 222, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, `${view.radiusM} m`, 790, 222, {size: 27, weight: 900});
  button(ctx, RADIUS.down, 'Shorter', '↓', Boolean(view.keys['↓'])); button(ctx, RADIUS.up, 'Wider', '↑', Boolean(view.keys['↑']));

  // Meter panel y=340..442; its meter and scale sit below the label/value row.
  panel(ctx, 560, 340, 410, 102);
  text(ctx, view.accelerationKnown ? 'SIDEWAYS ACCELERATION' : 'SIDEWAYS PUSH', 590, 367, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, view.g == null ? '? g' : `${view.g.toFixed(2)} g`, 880, 369, {size: 25, weight: 900, colour: view.g == null ? theme.text : '#9ee7ab'});
  ctx.fillStyle = '#384344'; ctx.fillRect(590, 405, 350, 8);
  if (view.g != null) { ctx.fillStyle = '#72c888'; ctx.fillRect(590, 405, Math.min(350, Math.max(0, view.g / 3.5 * 350)), 8); }
  text(ctx, '0 g', 590, 430, {size: 11, align: 'left'}); text(ctx, '3.5 g', 940, 430, {size: 11, align: 'right'});
  if (view.keys.Space) button(ctx, RUN, 'Run the turn', 'Sp', true);
}

function drawRows(ctx, view) {
  if (!view.rows.length) return;
  panel(ctx, 330, 515, 640, 140);
  text(ctx, 'RECORDED TURNS', 350, 535, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
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
      ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      arrow(ctx, cx, cy - r, cx + 70, cy - r, '#79bce2', 4);
      arrow(ctx, cx, cy - r, cx, cy - r + 56, '#ef7654', 5);
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
