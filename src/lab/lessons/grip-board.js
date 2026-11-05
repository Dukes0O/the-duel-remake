// A rolling-road demonstration of the game's tyre grip curve.
import {gripBench, bestSlideDegrees} from '../benches/tunnel.js';
import {BOARD, theme, background, text, keyCap, fitBoard, wrap} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const DOWN = [755, 210], UP = [905, 210], RUN = [820, 515];
const hit = (x, y, cx, cy, rx = 60, ry = 26) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
const graph = Object.freeze({left: 92, right: 630, top: 180, bottom: 452});
const px = degree => graph.left + degree / 12 * (graph.right - graph.left);
const py = percent => graph.bottom - (percent - 88) / 12 * (graph.bottom - graph.top);

export function hitTest(view, x, y) {
  if (view.keys['↓'] && hit(x, y, ...DOWN)) return {action: 'slide:down'};
  if (view.keys['↑'] && hit(x, y, ...UP)) return {action: 'slide:up'};
  if (view.keys.Space && hit(x, y, ...RUN, 96, 30)) return {action: view.keys.Space};
  return null;
}

export function hoverInfo(view, x, y) {
  if (hit(x, y, 350, 330, 280, 170)) return 'The blue line shows how much grip the tyre keeps at each slide angle.';
  if (hit(x, y, ...DOWN) || hit(x, y, ...UP)) return `The slide dial reads ${view.slideDeg} degrees.`;
  if (hit(x, y, ...RUN, 100, 34) && view.keys.Space) return 'Run the tyre at the selected angle and record its grip reading.';
  return null;
}

export function targetPoint(view, action) {
  if (action === 'set:best') {
    const target = view.bestSlideDeg;
    if (Math.abs(view.slideDeg - target) < .001) return RUN;
    return view.slideDeg < target ? UP : DOWN;
  }
  if (action === 'slide:up') return UP;
  if (action === 'slide:down') return DOWN;
  if (action === 'run') return RUN;
  if (action?.startsWith('answer:')) return null;
  if (action === 'replay') return [350, 330];
  if (action === 'continue') return [820, 620];
  return null;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(13,18,20,.93)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
}

function button(ctx, [x, y], label, key, enabled, width = 112) {
  ctx.globalAlpha = enabled ? 1 : .38;
  ctx.fillStyle = '#252c2f'; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - 19, width, 38, 6); ctx.fill(); ctx.stroke();
  if (key) keyCap(ctx, x - width / 2 + 14, y, key);
  text(ctx, label, x + 8, y, {size: 14, weight: 800});
  ctx.globalAlpha = 1;
}

function drawGraph(ctx, view) {
  panel(ctx, 54, 48, 610, 465);
  text(ctx, 'GRIP AS THE ANGLE CHANGES', 78, 78, {size: 16, align: 'left', weight: 900, colour: '#d5b65f'});
  const limit = bestSlideDegrees();
  ctx.strokeStyle = '#4c5658'; ctx.lineWidth = 1;
  for (const value of [90, 95, 100]) {
    const y = py(value); ctx.beginPath(); ctx.moveTo(graph.left, y); ctx.lineTo(graph.right, y); ctx.stroke();
    text(ctx, `${value}%`, 78, y + 4, {size: 12, align: 'right', colour: '#c7c1b2'});
  }
  ctx.strokeStyle = '#abb1b0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(graph.left, graph.top); ctx.lineTo(graph.left, graph.bottom); ctx.lineTo(graph.right, graph.bottom); ctx.stroke();
  if (!view.predictionPending) {
    ctx.strokeStyle = '#dfb84e'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(px(limit), graph.top); ctx.lineTo(px(limit), graph.bottom); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, 'BEST ANGLE ABOUT 4.3°', px(limit), graph.top - 13, {size: 11, align: 'center', weight: 900, colour: '#e4c56d'});

    ctx.strokeStyle = '#68b7e5'; ctx.lineWidth = 4; ctx.beginPath();
    for (let value = 0; value <= 12.001; value += .05) {
      const reading = gripBench.run({slideDeg: value, driver: 'casual'});
      const point = [px(value), py(reading.grip * 100)];
      if (value === 0) ctx.moveTo(...point); else ctx.lineTo(...point);
    }
    ctx.stroke();

    const current = gripBench.run({slideDeg: view.slideDeg, driver: 'casual'});
    const cx = px(view.slideDeg), cy = py(current.grip * 100);
    ctx.fillStyle = '#f1cf66'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f1cf66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
  }
  for (const value of [0, 3, 4, 4.5, 9, 12]) {
    const x = px(value); ctx.strokeStyle = '#c5c2b7'; ctx.beginPath(); ctx.moveTo(x, graph.bottom); ctx.lineTo(x, graph.bottom + 6); ctx.stroke();
    text(ctx, `${value}°`, x, graph.bottom + 23, {size: 11, colour: '#d1caba'});
  }
  text(ctx, 'SIDEWAYS SLIDE ANGLE', (graph.left + graph.right) / 2, graph.bottom + 47, {size: 12, weight: 900, colour: '#b8c7cb'});
}

function drawTyre(ctx, view) {
  panel(ctx, 54, 522, 610, 155);
  text(ctx, 'VIEW FROM ABOVE', 76, 546, {size: 12, align: 'left', weight: 900, colour: '#d5b65f'});
  ctx.strokeStyle = '#687477'; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(90, 608); ctx.lineTo(625, 608); ctx.stroke();
  ctx.strokeStyle = '#d5b65f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(90, 608); ctx.lineTo(625, 608); ctx.stroke();
  const x = 355, y = 608;
  const angle = view.slideDeg * Math.PI / 180;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = '#202526'; ctx.strokeStyle = '#aeb5b3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-21, -31, 42, 62, 9); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#808988'; ctx.lineWidth = 2;
  for (let mark = -1; mark <= 1; mark++) {
    ctx.beginPath(); ctx.moveTo(-13, mark * 12); ctx.lineTo(13, mark * 12); ctx.stroke();
  }
  ctx.restore();

  function arrow(x1, y1, x2, y2, colour, label, labelY) {
    ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const head = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(head - .45), y2 - 10 * Math.sin(head - .45));
    ctx.lineTo(x2 - 10 * Math.cos(head + .45), y2 - 10 * Math.sin(head + .45));
    ctx.closePath(); ctx.fill();
    text(ctx, label, x2 + 2, labelY, {size: 11, weight: 800, colour});
  }
  arrow(x, y - 4, x + 102, y - 4, '#69c5eb', 'TRAVEL', y + 31);
  arrow(x, y - 4, x + 102 * Math.cos(angle), y - 4 - 102 * Math.sin(angle), '#e3c56f', 'TYRE POINTS', y - 36);
  ctx.strokeStyle = '#f0b36c'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.arc(x, y - 4, 25, -angle, 0); ctx.stroke();
  text(ctx, `${view.slideDeg.toFixed(1)}°`, x + 34, y - 14, {size: 11, weight: 900, colour: '#f0b36c'});

  const beyondBest = Math.max(0, view.slideDeg - 4.3);
  const markLength = 4 + beyondBest * 3;
  ctx.strokeStyle = '#433d35'; ctx.lineWidth = 2 + beyondBest * .35;
  for (let mark = 0; mark < 3; mark++) {
    const startX = x - 27 - mark * 12, startY = y - 18 + mark * 10;
    ctx.beginPath(); ctx.moveTo(startX - markLength, startY - 8); ctx.lineTo(startX + markLength, startY + 8); ctx.stroke();
  }
}

function drawControls(ctx, view) {
  panel(ctx, 690, 48, 280, 205);
  text(ctx, 'SLIDE ANGLE', 720, 78, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  text(ctx, `${view.slideDeg.toFixed(1)}°`, 830, 133, {size: 36, weight: 900});
  button(ctx, DOWN, 'Lower', '↓', Boolean(view.keys['↓']));
  button(ctx, UP, 'Raise', '↑', Boolean(view.keys['↑']));
  panel(ctx, 690, 270, 280, 148);
  text(ctx, 'GRIP READING', 720, 298, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  text(ctx, view.percent == null ? '—' : `${view.percent}%`, 830, 351, {size: 34, weight: 900, colour: view.percent == null ? theme.text : '#a8dba6'});
  text(ctx, 'of full grip', 830, 383, {size: 13, colour: '#c7c1b2'});
  if (view.keys.Space) button(ctx, RUN, 'Run the tyre', 'Sp', true, 142);
}

function drawRows(ctx, view) {
  const rows = view.rows.slice(-3);
  if (!rows.length) return;
  panel(ctx, 690, 435, 280, 212);
  text(ctx, 'RECORDED SETTINGS', 712, 463, {size: 13, align: 'left', weight: 900, colour: '#d5b65f'});
  rows.forEach((item, index) => text(ctx, `Run ${index + 1}: ${item.slideDeg}°  ·  ${item.percent}% grip`, 714, 500 + index * 35, {size: 14, align: 'left', weight: 700}));
}

function glow(ctx, view) {
  if (!view.glow) return;
  const rect = view.glow === 'slide' ? [688, 46, 284, 210] : [688, 46, 284, 374];
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .62 + .18 * Math.sin(view.time * 5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(...rect, 10); ctx.stroke(); ctx.globalAlpha = 1;
}

function drawRecap(ctx, view) {
  const width = 276, gap = 25, x0 = (BOARD.width - 3 * width - 2 * gap) / 2;
  view.ideas.forEach((idea, index) => {
    const x = x0 + index * (width + gap);
    panel(ctx, x, 55, width, 570);
    text(ctx, String(index + 1), x + 26, 88, {size: 25, colour: theme.accent});
    wrap(ctx, idea.text, x + width / 2, 128, width - 42, {size: 18, weight: 650});
    if (idea.id === 'sideways') {
      const gx = x + width / 2, gy = 430;
      ctx.strokeStyle = '#67b5e3'; ctx.lineWidth = 4; ctx.beginPath();
      for (let value = 0; value <= 12; value += .25) {
        const r = gripBench.run({slideDeg: value, driver: 'casual'});
        const px = gx - 90 + value / 12 * 180, py = gy + (100 - r.grip * 100) * 8;
        if (value === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); text(ctx, 'SLIDE ANGLE', gx, 555, {size: 12, weight: 900, colour: '#c2d3d8'});
    }
    if (idea.id === 'limit') {
      text(ctx, 'ABOUT 4.3°', x + width / 2, 430, {size: 23, weight: 900, colour: '#e3c56f'});
      text(ctx, 'best grip in this game', x + width / 2, 462, {size: 13});
    }
    if (idea.id === 'target') {
      text(ctx, '3° and 4°  →  100%', x + width / 2, 420, {size: 15, weight: 900, colour: '#a8dba6'});
      text(ctx, '4.5°  →  99.7%', x + width / 2, 460, {size: 15, weight: 900, colour: '#e0b368'});
    }
  });
}

export function drawBoard(ctx, view, width = BOARD.width, height = BOARD.height) {
  return fitBoard(ctx, width, height, () => {
    background(ctx);
    if (view.scene === 'recap') { drawRecap(ctx, view); return; }
    text(ctx, 'TYRE GRIP WORKSHOP', 42, 30, {size: 15, align: 'left', weight: 900, colour: '#d5b65f'});
    drawGraph(ctx, view); drawTyre(ctx, view); drawControls(ctx, view);
    drawRows(ctx, view);
    glow(ctx, view);
  });
}

export function drawPicture(ctx, picture, width, height) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#343c3f'); gradient.addColorStop(1, '#1b2224');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  const percent = picture.percent == null || !Number.isFinite(Number(picture.percent)) ? null : Number(picture.percent);
  const x = width * .45, y = height * .52, radius = Math.min(width, height) * .25;
  ctx.strokeStyle = '#d4bc73'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#202526'; ctx.beginPath(); ctx.roundRect(x - radius * .42, y - radius * .82, radius * .84, radius * 1.64, 7); ctx.fill();
  for (let i = -1; i <= 1; i++) { ctx.strokeStyle = '#9ba4a3'; ctx.beginPath(); ctx.moveTo(x - radius * .3, y + i * 9); ctx.lineTo(x + radius * .3, y + i * 9); ctx.stroke(); }
  text(ctx, percent == null ? 'Grip?' : `${percent}%`, width * .78, height * .5, {size: 16, weight: 900});
  text(ctx, 'tyre on road', width * .78, height * .72, {size: 10, colour: '#d2cbbd'});
  ctx.restore();
}
