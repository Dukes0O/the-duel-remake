// A rear view of the suspension rig, with the car body leaning by its measured
// body-roll angle. The fixed key stays in the corner while the rig moves.
import {BOARD, theme, background, text, keyCap, fitBoard, wrap} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const SOFT = [650, 205];
const STIFF = [850, 205];
const BUMPY = [650, 300];
const SMOOTH = [850, 300];
const RUN = [750, 392];
const hit = (x, y, [cx, cy], rx = 78, ry = 25) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
const within = (x, y, cx, cy, rx, ry) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;

export function hitTest(view, x, y) {
  if (view.asking) return null;
  for (const [point, action, key] of [
    [SOFT, 'spring:soft', '←'], [STIFF, 'spring:stiff', '→'],
    [BUMPY, 'road:bumpy', '↓'], [SMOOTH, 'road:smooth', '↑'], [RUN, 'run', 'Space'],
  ]) {
    if (hit(x, y, point, point === RUN ? 88 : 78, point === RUN ? 22 : 24) && view.keys[key]) return {action};
  }
  return null;
}

export function hoverInfo(view, x, y) {
  if (within(x, y, 275, 342, 185, 205)) return 'The outside spring compresses while the inside spring extends as the car body rolls.';
  if (hit(x, y, SOFT) || hit(x, y, STIFF)) return `The selected spring is ${view.setup.spring}. Choose spring stiffness for this run.`;
  if (hit(x, y, BUMPY) || hit(x, y, SMOOTH)) return `The selected road is ${view.setup.road}. Choose a road surface for this run.`;
  if (hit(x, y, RUN)) return 'Run the car over the selected road and record its readings.';
  return null;
}

export function targetPoint(view, action) {
  if (action?.startsWith('answer:')) return null;
  if (action === 'spring:soft') return SOFT;
  if (action === 'spring:stiff') return STIFF;
  if (action === 'road:bumpy') return BUMPY;
  if (action === 'road:smooth') return SMOOTH;
  if (action === 'run' || action === 'show') return RUN;
  return [275, 342];
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(13,18,20,.91)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill(); ctx.stroke();
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

function fixedKey(ctx) {
  const entries = [['BODY', '#e5decd'], ['COMPRESS', '#edc557'], ['EXTEND', '#79bce2'], ['SIDEWAYS PUSH', '#ef7654']];
  entries.forEach(([label, colour], index) => {
    const y = 62 + index * 23;
    ctx.fillStyle = colour; ctx.fillRect(38, y - 6, 12, 12);
    text(ctx, label, 60, y, {size: 12, align: 'left', weight: 900, colour});
  });
}

function spring(ctx, x, top, bottom, colour, coils = 7) {
  const height = bottom - top;
  ctx.strokeStyle = '#202729'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, top);
  for (let i = 1; i < coils * 2; i++) ctx.lineTo(x + (i % 2 ? 13 : -13), top + height * i / (coils * 2));
  ctx.lineTo(x, bottom); ctx.stroke();
  ctx.fillStyle = '#8f999b'; ctx.fillRect(x - 18, top - 4, 36, 7); ctx.fillRect(x - 18, bottom - 3, 36, 7);
}

function carFromBehind(ctx, view) {
  const centreX = 275, baseY = 435;
  const rollDegrees = Number(view.rollDeg ?? view.result?.leanDeg ?? 0);
  const roll = Math.min(8, Math.max(0, rollDegrees)) * Math.PI / 180;
  const roadBounce = view.setup.road === 'bumpy' ? Math.sin(view.time * 7) * 3 : Math.sin(view.time * 2) * .7;
  const bodyY = 272 + roadBounce;
  const wheelY = 414 + (view.setup.spring === 'soft' ? roadBounce * .6 : roadBounce * .25);
  const leftShift = Math.tan(roll) * 62;
  const rightShift = Math.tan(roll) * -62;
  const leftBody = bodyY + leftShift;
  const rightBody = bodyY + rightShift;
  const leftWheel = wheelY;
  const rightWheel = wheelY;

  // Roll changes spring length on each side: the left side compresses and the right side extends.
  spring(ctx, centreX - 90, leftBody + 62, leftWheel - 28, '#edc557', 7);
  spring(ctx, centreX + 90, rightBody + 62, rightWheel - 28, '#79bce2', 7);
  ctx.fillStyle = '#1b2022'; ctx.fillRect(centreX - 151, wheelY - 7, 302, 15);
  for (const x of [centreX - 90, centreX + 90]) {
    ctx.fillStyle = '#111617'; ctx.beginPath(); ctx.roundRect(x - 24, wheelY - 35, 48, 69, 12); ctx.fill();
    ctx.fillStyle = '#596266'; ctx.fillRect(x - 15, wheelY - 27, 30, 53);
    ctx.strokeStyle = '#adb3b2'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, wheelY - 27, 30, 53);
  }

  ctx.save(); ctx.translate(centreX, bodyY + 30); ctx.rotate(roll);
  const paint = ctx.createLinearGradient(0, -48, 0, 56);
  paint.addColorStop(0, '#e8e0cf'); paint.addColorStop(.45, '#b4ada0'); paint.addColorStop(1, '#626b6d');
  ctx.fillStyle = paint; ctx.strokeStyle = '#171c1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-142, -47, 284, 95, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#33434a'; ctx.beginPath(); ctx.roundRect(-90, -38, 180, 42, 13); ctx.fill();
  ctx.fillStyle = '#ec5443'; ctx.fillRect(-126, 20, 38, 12); ctx.fillRect(88, 20, 38, 12);
  ctx.fillStyle = '#3b6646'; ctx.fillRect(-142, 36, 284, 8);
  ctx.restore();

  const push = 24 + rollDegrees * 2.2;
  arrow(ctx, centreX - 175, bodyY + 100, centreX - 175 - push, bodyY + 100, '#ef7654', 5);
  arrow(ctx, centreX + 175, bodyY + 100, centreX + 175 + push, bodyY + 100, '#ef7654', 5);
  text(ctx, `BODY ROLL ${rollDegrees.toFixed(1)}°`, centreX, 165, {size: 14, weight: 900, colour: '#edc557'});
  text(ctx, 'LEFT SPRING COMPRESSES', centreX - 105, 493, {size: 11, weight: 900, colour: '#edc557'});
  text(ctx, 'RIGHT SPRING EXTENDS', centreX + 105, 493, {size: 11, weight: 900, colour: '#79bce2'});
  fixedKey(ctx);
}

function button(ctx, [x, y], label, key, selected, enabled) {
  const width = 156, height = 44;
  ctx.globalAlpha = enabled ? 1 : .42;
  ctx.fillStyle = selected ? '#654c27' : '#252c2f'; ctx.strokeStyle = selected ? theme.accent : '#778083'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - height / 2, width, height, 6); ctx.fill(); ctx.stroke();
  text(ctx, label, x + 10, y, {size: 13, weight: 800}); keyCap(ctx, x - 50, y, key); ctx.globalAlpha = 1;
}

function controls(ctx, view) {
  panel(ctx, 530, 72, 425, 278);
  text(ctx, 'CHOOSE THE TEST SETTINGS', 552, 97, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  text(ctx, 'SPRING', 552, 135, {size: 12, align: 'left', weight: 900});
  button(ctx, SOFT, 'Soft', '←', view.setup.spring === 'soft', Boolean(view.keys['←']));
  button(ctx, STIFF, 'Stiff', '→', view.setup.spring === 'stiff', Boolean(view.keys['→']));
  text(ctx, 'ROAD', 552, 245, {size: 12, align: 'left', weight: 900});
  button(ctx, BUMPY, 'Bumpy', '↓', view.setup.road === 'bumpy', Boolean(view.keys['↓']));
  button(ctx, SMOOTH, 'Smooth', '↑', view.setup.road === 'smooth', Boolean(view.keys['↑']));
  if (view.result && !view.asking) {
    text(ctx, `${view.setup.spring.toUpperCase()} SPRING · ${view.setup.road.toUpperCase()} ROAD`, 742, 338, {size: 11, weight: 900, colour: theme.accent});
  }
}

function runButton(ctx, view) {
  button(ctx, RUN, 'Run the rig', 'Sp', false, Boolean(view.keys.Space));
}

function results(ctx, view) {
  panel(ctx, 530, 435, 425, 220);
  text(ctx, 'RECORDED RUNS', 552, 461, {size: 13, align: 'left', weight: 900, colour: '#d5b65f'});
  const lines = view.rows.slice(-4);
  if (!lines.length) {
    text(ctx, 'Run a setting pair to start the table.', 552, 505, {size: 13, align: 'left'});
    text(ctx, 'Shake · roll · tyre contact', 552, 531, {size: 12, align: 'left', colour: '#b8c2c3'});
    return;
  }
  lines.forEach((row, index) => {
    const y = 490 + index * 37;
    text(ctx, `${row.spring} · ${row.road}`, 552, y, {size: 13, align: 'left', weight: 800});
    text(ctx, `${row.shake} m/s²  |  ${row.roll}°  |  ${row.contact}%`, 552, y + 18, {size: 12, align: 'left', colour: '#a9d9aa'});
  });
}

function glow(ctx, view) {
  const box = view.glow === 'settings' ? [526, 68, 433, 286] : view.glow === 'spring' ? [565, 170, 370, 70] : null;
  if (!box) return;
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .6 + .2 * Math.sin(view.time * 5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(...box, 10); ctx.stroke(); ctx.globalAlpha = 1;
}

function recap(ctx, view) {
  const width = 300, gap = 24, left = 26;
  view.ideas.forEach((idea, index) => {
    const x = left + index * (width + gap);
    panel(ctx, x, 40, width, 600);
    text(ctx, String(index + 1), x + 25, 70, {size: 25, colour: theme.accent});
    wrap(ctx, idea.text, x + width / 2, 108, width - 42, {size: 17, weight: 600, line: 23});
    if (idea.id === 'spring') {
      text(ctx, 'SOFT · BUMPY', x + width / 2, 374, {size: 14, weight: 900});
      text(ctx, '4.09 m/s² body shake', x + width / 2, 410, {size: 16, colour: '#a9d9aa'});
      text(ctx, 'STIFF · BUMPY', x + width / 2, 466, {size: 14, weight: 900});
      text(ctx, '4.77 m/s² body shake', x + width / 2, 502, {size: 16, colour: '#a9d9aa'});
    }
    if (idea.id === 'transfer') {
      arrow(ctx, x + 78, 398, x + 128, 398, '#ef7654', 5);
      arrow(ctx, x + 222, 398, x + 172, 398, '#ef7654', 5);
      text(ctx, 'SIDEWAYS PUSH', x + width / 2, 438, {size: 13, weight: 900, colour: '#ef7654'});
      text(ctx, 'OUTSIDE LOAD INCREASES', x + width / 2, 492, {size: 14, weight: 900, colour: '#edc557'});
    }
    if (idea.id === 'tradeoff') {
      text(ctx, 'SOFT · THIS BEND', x + width / 2, 374, {size: 14, weight: 900});
      text(ctx, '6.5° body roll', x + width / 2, 410, {size: 17, colour: '#a9d9aa'});
      text(ctx, 'STIFF · THIS BEND', x + width / 2, 466, {size: 14, weight: 900});
      text(ctx, '2.2° body roll', x + width / 2, 502, {size: 17, colour: '#a9d9aa'});
    }
  });
}

export function drawBoard(ctx, view, width = BOARD.width, height = BOARD.height) {
  return fitBoard(ctx, width, height, () => {
    background(ctx);
    if (view.scene === 'recap') { recap(ctx, view); return; }
    text(ctx, 'SUSPENSION · REAR VIEW', 40, 29, {size: 15, align: 'left', weight: 900, colour: '#d5b65f'});
    carFromBehind(ctx, view); controls(ctx, view); runButton(ctx, view); results(ctx, view); glow(ctx, view);
  });
}

export function drawPicture(ctx, picture, width, height) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#343c3f'); gradient.addColorStop(1, '#1b2224');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  const cx = width * .5, cy = height * .48;
  const unknown = picture.shake == null || picture.roll == null;
  const tilt = unknown ? .12 : Math.min(.2, Number(picture.roll) * Math.PI / 180);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  ctx.fillStyle = '#b6b1a5'; ctx.strokeStyle = '#202729'; ctx.lineWidth = 2; ctx.fillRect(-60, -20, 120, 40); ctx.strokeRect(-60, -20, 120, 40);
  ctx.restore();
  text(ctx, unknown ? 'Reading?' : `${picture.shake.toFixed(2)} m/s²`, width * .5, height * .8, {size: 13, weight: 900});
  text(ctx, unknown ? 'Predict' : `${picture.roll.toFixed(1)}° roll`, width * .5, height * .18, {size: 12, weight: 900, colour: '#d9a640'});
  ctx.restore();
}
