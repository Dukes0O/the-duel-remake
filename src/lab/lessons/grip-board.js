// A rolling-road demonstration of the game's tyre grip curve.
import {gripBench, slipAtAngle, bestSlideDegrees} from '../benches/tunnel.js';
import {tyreSlipGrip} from '../../config.js';
import {BOARD, theme, background, text, keyCap, fitBoard, wrap, steelPanel, lcd, forceArrowTo, tarmac, bolt, labelPlate} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const DOWN = [755, 210], UP = [905, 210], RUN = [820, 515];
const hit = (x, y, cx, cy, rx = 60, ry = 26) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
const graph = Object.freeze({left: 92, right: 630, top: 180, bottom: 452});
const px = degree => graph.left + degree / 12 * (graph.right - graph.left);
const py = percent => graph.bottom - (percent - 88) / 12 * (graph.bottom - graph.top);

function makeGripCurvePoints() {
  const points = [];
  for (let slideDeg = 0; slideDeg <= 12.001; slideDeg += .01) {
    const slip = slipAtAngle(slideDeg * Math.PI / 180);
    const grip = tyreSlipGrip(slip, 'casual');
    points.push({slideDeg, x: px(slideDeg), y: py(grip * 100)});
  }
  return points;
}
const GRIP_CURVE_POINTS = makeGripCurvePoints();
export const gripCurvePoints = () => GRIP_CURVE_POINTS;

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

function panel(ctx, x, y, w, h) { steelPanel(ctx, x, y, w, h); }

function button(ctx, [x, y], label, key, enabled, width = 112) {
  ctx.globalAlpha = enabled ? 1 : .38;
  const face = ctx.createLinearGradient(0, y - 19, 0, y + 19); face.addColorStop(0, '#3a4448'); face.addColorStop(.5, '#272f33'); face.addColorStop(1, '#161c1f');
  ctx.fillStyle = face; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - 19, width, 38, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x - width / 2 + 6, y - 17.5, width - 12, 1);
  if (key) keyCap(ctx, x - width / 2 + 14, y, key);
  text(ctx, label, x + 8, y, {size: 14, weight: 800});
  ctx.globalAlpha = 1;
}

// A brass pointer standing on the axis and pointing up at `x`.
function brassPointer(ctx, x, y) {
  const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0); g.addColorStop(0, '#ffe9a6'); g.addColorStop(.5, '#d9a640'); g.addColorStop(1, '#6b4810');
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.moveTo(x + 1.5, y + 1.5); ctx.lineTo(x + 8.5, y + 15); ctx.lineTo(x - 5.5, y + 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y + 13.5); ctx.lineTo(x - 7, y + 13.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,4,.8)'; ctx.lineWidth = 1; ctx.stroke();
  bolt(ctx, x, y + 9, 1.5);
}

function drawGraph(ctx, view) {
  panel(ctx, 54, 48, 610, 465);
  text(ctx, 'GRIP AS THE ANGLE CHANGES', 78, 78, {size: 16, align: 'left', weight: 900, colour: '#d5b65f'});
  const limit = bestSlideDegrees();
  // The plot is a lit glass screen: dark blue-green, with a faint grid a degree across.
  const screen = ctx.createLinearGradient(0, graph.top - 30, 0, graph.bottom + 10); screen.addColorStop(0, '#0e2228'); screen.addColorStop(1, '#08141a');
  ctx.fillStyle = screen; ctx.beginPath(); ctx.roundRect(graph.left - 6, graph.top - 30, graph.right - graph.left + 18, graph.bottom - graph.top + 42, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  const lamp = ctx.createRadialGradient((graph.left + graph.right) / 2, graph.top, 20, (graph.left + graph.right) / 2, graph.top + 40, 380); lamp.addColorStop(0, 'rgba(120,200,215,.13)'); lamp.addColorStop(1, 'rgba(120,200,215,0)');
  ctx.fillStyle = lamp; ctx.beginPath(); ctx.roundRect(graph.left - 6, graph.top - 30, graph.right - graph.left + 18, graph.bottom - graph.top + 42, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(120,190,205,.09)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let d = 1; d < 12; d++) { ctx.moveTo(px(d), graph.top - 20); ctx.lineTo(px(d), graph.bottom); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,215,230,.32)'; ctx.lineWidth = 1;
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
    brassPointer(ctx, px(limit), graph.bottom + 2);

    // The grip curve: a soft blue glow, the blue line, and a bright core.
    const points = gripCurvePoints();
    for (const [width, colour] of [[10, 'rgba(104,183,229,.16)'], [6.5, 'rgba(104,183,229,.3)'], [3.6, '#68b7e5'], [1.3, '#d6f0ff']]) {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.beginPath();
      points.forEach((point, index) => { if (index === 0) ctx.moveTo(point.x, point.y); else if (index % 4 === 0 || index === points.length - 1) ctx.lineTo(point.x, point.y); });
      ctx.stroke();
    }

    const current = gripBench.run({slideDeg: view.slideDeg, driver: 'casual'});
    const cx = px(view.slideDeg), cy = py(current.grip * 100);
    const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24); halo.addColorStop(0, 'rgba(255,214,110,.45)'); halo.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
    const knob = ctx.createRadialGradient(cx - 2.5, cy - 3, 1, cx, cy, 8.5); knob.addColorStop(0, '#fff2b8'); knob.addColorStop(.5, '#e0b13f'); knob.addColorStop(1, '#6b4810');
    ctx.fillStyle = knob; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,4,.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#f1cf66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
  }
  for (const value of [0, 3, 4, 4.5, 9, 12]) {
    const x = px(value); ctx.strokeStyle = '#c5c2b7'; ctx.beginPath(); ctx.moveTo(x, graph.bottom); ctx.lineTo(x, graph.bottom + 6); ctx.stroke();
    text(ctx, `${value}°`, x, graph.bottom + 23, {size: 11, colour: '#d1caba'});
  }
  text(ctx, 'SIDEWAYS SLIDE ANGLE', (graph.left + graph.right) / 2, graph.bottom + 47, {size: 12, weight: 900, colour: '#b8c7cb'});
}

// The tyre from above, long side along the way it points: a worn rubber body with tread blocks and a lit sidewall.
function tyreFromAbove(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(-31, -9, 66, 24, 8); ctx.fill();
  const rubber = ctx.createLinearGradient(0, -12, 0, 12); rubber.addColorStop(0, '#3a4144'); rubber.addColorStop(.35, '#1b2022'); rubber.addColorStop(1, '#07090a');
  ctx.fillStyle = rubber; ctx.beginPath(); ctx.roundRect(-33, -12, 66, 24, 9); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-33, -12, 66, 24, 9); ctx.clip();
  // Three rows of tread blocks (shoulders and a centre rib), each block a slanted slab with a lit edge.
  for (const [top, bottom] of [[-10, -4.4], [-2.6, 2.6], [4.4, 10]]) {
    for (let i = -7; i <= 7; i++) {
      const bx = i * 4.3;
      ctx.fillStyle = '#292f32'; ctx.beginPath(); ctx.moveTo(bx - 1.6, top); ctx.lineTo(bx + 1.8, top); ctx.lineTo(bx + 1.8 + (bottom > 0 ? -1 : 1), bottom); ctx.lineTo(bx - 1.6 + (bottom > 0 ? -1 : 1), bottom); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(bx - 1.6, top, 3.4, .7);
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect(-33, -12, 66, 24, 9); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(26, -12); ctx.stroke();
}

// The rolling road: a belt of tarmac between two steel rollers, a turntable plate under the tyre, the tyre, and the marks it leaves.
function drawTyre(ctx, view) {
  panel(ctx, 54, 522, 610, 155);
  text(ctx, 'VIEW FROM ABOVE', 76, 546, {size: 12, align: 'left', weight: 900, colour: '#d5b65f'});
  const x = 355, y = 608, angle = view.slideDeg * Math.PI / 180;
  tarmac(ctx, 80, 582, 530, 52);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(80, 582, 530, 3); ctx.fillRect(80, 631, 530, 3);
  ctx.strokeStyle = 'rgba(213,182,95,.75)'; ctx.lineWidth = 1.6; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(84, y); ctx.lineTo(606, y); ctx.stroke(); ctx.setLineDash([]);
  for (const rx of [66, 610]) {
    const drum = ctx.createLinearGradient(rx, 0, rx + 14, 0); drum.addColorStop(0, '#e2e8eb'); drum.addColorStop(.3, '#9aa4aa'); drum.addColorStop(1, '#262d31');
    ctx.fillStyle = drum; ctx.beginPath(); ctx.roundRect(rx, 576, 14, 64, 3); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
    bolt(ctx, rx + 7, 584, 1.6); bolt(ctx, rx + 7, 632, 1.6);
  }

  // The marks the tyre leaves behind it: they grow longer and darker past the best angle.
  const beyondBest = Math.max(0, view.slideDeg - 4.3);
  const markLength = 4 + beyondBest * 3;
  ctx.lineCap = 'round';
  for (let mark = 0; mark < 3; mark++) {
    const startX = x - 58 - mark * 14, startY = y - 18 + mark * 10;
    for (const [width, colour] of [[4.4 + beyondBest * .35, 'rgba(4,4,5,.3)'], [2 + beyondBest * .35, '#0e1011']]) {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(startX - markLength, startY - 8); ctx.lineTo(startX + markLength, startY + 8); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // The turntable turns the tyre with the angle; a notch and bolts show how far.
  const K = 1.35;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-angle); ctx.scale(K, K);
  const plate = ctx.createRadialGradient(-8, -9, 2, 0, 0, 33); plate.addColorStop(0, '#aab4ba'); plate.addColorStop(.7, '#59636a'); plate.addColorStop(1, '#262d31');
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(2, 4, 33, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = plate; ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.3; ctx.stroke();
  for (let k = 0; k < 8; k++) bolt(ctx, Math.cos(k * Math.PI / 4 + .39) * 27, Math.sin(k * Math.PI / 4 + .39) * 27, 1.7);
  ctx.fillStyle = '#d6a43a'; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(24, -3.5); ctx.lineTo(24, 3.5); ctx.closePath(); ctx.fill();
  // The contact patch smears along the road as the angle grows: the rubber the tyre drags sideways across it.
  ctx.restore();
  const smear = Math.min(24, Math.round(view.slideDeg * 2));
  ctx.save(); ctx.translate(x, y);
  for (let k = smear; k >= 0; k--) {
    ctx.save(); ctx.translate(-k * 1.9, 0); ctx.rotate(-angle); ctx.scale(K, K);
    ctx.fillStyle = `rgba(6,7,8,${(.4 * (1 - k / (smear + 4))).toFixed(3)})`; ctx.fillRect(-15, -9, 30, 18);
    ctx.restore();
  }
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-angle); ctx.scale(K, K); tyreFromAbove(ctx); ctx.restore();

  function arrow(x1, y1, x2, y2, colour, label, labelY) {
    forceArrowTo(ctx, x1, y1, x2, y2, colour, 5);
    text(ctx, label, x2 + 2, labelY, {size: 11, weight: 800, colour});
  }
  arrow(x + 52, y - 4, x + 122, y - 4, '#69c5eb', 'TRAVEL', y + 31);
  arrow(x + 52 * Math.cos(angle), y - 4 - 52 * Math.sin(angle), x + 122 * Math.cos(angle), y - 4 - 122 * Math.sin(angle), '#e3c56f', 'TYRE POINTS', y - 36);
  ctx.strokeStyle = 'rgba(30,14,2,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 4, 56, -angle, 0); ctx.stroke();
  ctx.strokeStyle = '#f0b36c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 4, 56, -angle, 0); ctx.stroke();
  labelPlate(ctx, x + 70, y - 16, 38, 16, .55);
  text(ctx, `${view.slideDeg.toFixed(1)}°`, x + 70, y - 16, {size: 11, weight: 900, colour: '#f0b36c'});
}

function drawControls(ctx, view) {
  panel(ctx, 690, 48, 280, 205);
  text(ctx, 'SLIDE ANGLE', 720, 78, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  lcd(ctx, 744, 104, 172, 58, '#e3c56f');
  text(ctx, `${view.slideDeg.toFixed(1)}°`, 830, 133, {size: 36, weight: 900});
  button(ctx, DOWN, 'Lower', '↓', Boolean(view.keys['↓']));
  button(ctx, UP, 'Raise', '↑', Boolean(view.keys['↑']));
  panel(ctx, 690, 270, 280, 148);
  text(ctx, 'GRIP READING', 720, 298, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  lcd(ctx, 744, 320, 172, 54, '#a8dba6');
  text(ctx, view.percent == null ? '—' : `${view.percent}%`, 830, 351, {size: 34, weight: 900, colour: view.percent == null ? theme.text : '#a8dba6'});
  text(ctx, 'of full grip', 830, 383, {size: 13, colour: '#c7c1b2'});
  if (view.keys.Space) button(ctx, RUN, 'Run the tyre', 'Sp', true, 142);
}

function drawRows(ctx, view) {
  const rows = view.rows.slice(-3);
  if (!rows.length) return;
  panel(ctx, 690, 435, 280, 212);
  text(ctx, 'RECORDED SETTINGS', 712, 463, {size: 13, align: 'left', weight: 900, colour: '#d5b65f'});
  lcd(ctx, 704, 478, 252, 150, '#a8dba6');
  rows.forEach((item, index) => {
    text(ctx, `Run ${index + 1}: ${item.slideDeg}°  ·  ${item.percent}% grip`, 714, 500 + index * 35, {
      size: 14, align: 'left', weight: 700,
    });
  });
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
      ctx.fillStyle = '#08141a'; ctx.beginPath(); ctx.roundRect(gx - 106, gy - 22, 212, 148, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(120,190,205,.14)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k <= 12; k += 3) { ctx.moveTo(gx - 90 + k / 12 * 180, gy - 14); ctx.lineTo(gx - 90 + k / 12 * 180, gy + 118); } ctx.stroke();
      const trace = () => {
        ctx.beginPath();
        for (let value = 0; value <= 12; value += .25) {
          const r = gripBench.run({slideDeg: value, driver: 'casual'});
          const px = gx - 90 + value / 12 * 180, py = gy + (100 - r.grip * 100) * 8;
          if (value === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      };
      for (const [width, colour] of [[9, 'rgba(103,181,227,.2)'], [4, '#67b5e3'], [1.2, '#d6f0ff']]) { ctx.strokeStyle = colour; ctx.lineWidth = width; trace(); ctx.stroke(); }
      text(ctx, 'SLIDE ANGLE', gx, 555, {size: 12, weight: 900, colour: '#c2d3d8'});
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
  for (let i = -1; i <= 1; i++) {
    ctx.strokeStyle = '#9ba4a3';
    ctx.beginPath();
    ctx.moveTo(x - radius * .3, y + i * 9);
    ctx.lineTo(x + radius * .3, y + i * 9);
    ctx.stroke();
  }
  text(ctx, percent == null ? 'Grip?' : `${percent}%`, width * .78, height * .5, {size: 16, weight: 900});
  text(ctx, 'tyre on road', width * .78, height * .72, {size: 10, colour: '#d2cbbd'});
  ctx.restore();
}
