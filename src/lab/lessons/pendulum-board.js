// The pendulum lesson's board (docs/board/cards/LAB-CLASSROOM.md section 4): a 2D teaching
// drawing at true scale and real speed. Draws and hit-tests only; it never changes the lesson.
import {stringPeriod} from '../benches/pendulum.js';
import {HOOK_X, LENGTHS, REFERENCE_X, SWING_RAD, WEIGHTS} from './pendulum-classroom.js';

export const BOARD = Object.freeze({width: 1000, height: 680});
const BEAM_Y = 150, METRE = 18, WATCH_Y = 50, WATCH_R = 28, DIAL_S = 12, PLATE_Y = BEAM_Y - 30;
const SHELF = Object.freeze({light: [78, 618], heavy: [140, 608]});
const radius = kg => kg > 100 ? 26 : 18;
const CABLE_PERIOD = stringPeriod(15);

// The steel workshop look (LAB-CLASSROOM look round 1, picked by Claude): painted steel, brass and iron.
const theme = Object.freeze({back: ['#2a3134', '#161b1d'], grain: 'rgba(255,255,255,.035)', beam: '#626a70', beamLight: '#8d969c', beamDark: '#363c40', rivet: '#a7aeb2',
  line: '#e3dccb', faint: 'rgba(227,220,203,.28)', text: '#f5f0dc', accent: '#edc557', good: '#56d683', bad: '#f07a5a', ghost: 'rgba(190,198,204,.42)',
  brass: ['#ffe9a6', '#d9a640', '#6b4810'], iron: ['#c7cfd4', '#5d666c', '#1f2427'], dial: '#efe7d2', ground: '#2c2a24', sky: ['#3b4a52', '#1d2427'], plate: '#252c29'});

export const bobPoint = (p, angle = p.angle) => [p.x + Math.sin(angle) * p.lengthM * METRE, BEAM_Y + Math.cos(angle) * p.lengthM * METRE];
const pendulumById = (view, id) => view.pendulums.find(p => p.id === id);
const draggable = view => view.pendulums.find(p => p.id === 'you' || p.id === 'bob' && view.labels);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  const near = (point, r) => Math.hypot(x - point[0], y - point[1]) <= r;
  const drag = draggable(view);
  if (drag && view.keys.Space === 'release' && near(bobPoint(drag), radius(drag.weightKg) + 16)) return {drag: drag.id, action: 'release'};
  if (view.keys[4] === 'weight:light') {
    for (const [name, point] of Object.entries(SHELF)) if (near(point, 30)) return {action: `weight:${name}`};
    for (const length of LENGTHS) if (Math.abs(x - HOOK_X[length]) < 34 && y > PLATE_Y - 16 && y < BEAM_Y + length * METRE + 26) return {action: `hook:${length}`};
  }
  if (view.keys[1]?.startsWith('measure:')) {
    for (const p of view.pendulums) if (Math.abs(x - p.x) < 40 && y > BEAM_Y - 20 && y < BEAM_Y + p.lengthM * METRE + 30) return {action: `measure:${p.lengthM}`};
  }
  if (view.keys.Space === 'tap' && x >= 0 && y >= 0 && x <= BOARD.width && y <= BOARD.height) return {action: 'tap'};
  return null;
}
// What the mouse is over, in a few words: hovering explains any part of the picture.
export function hoverInfo(view, x, y) {
  const near = (point, r) => point && Math.hypot(x - point[0], y - point[1]) <= r;
  if (view.scene === 'wonder' || view.scene === 'settle' || view.scene === 'recap') return null;
  for (const p of view.pendulums) {
    const watchX = p.x - 30;
    if ((view.stopwatches || view.lap) && near([watchX, WATCH_Y], WATCH_R + 6)) return 'Stopwatch: it stops after one full swing, out and back.';
    if (near(bobPoint(p), radius(p.weightKg) + 8)) {
      if (p.ghost) return 'The grey weight: 20 kg on 15 m, to compare with yours.';
      return `${p.weightKg} kg weight on a ${p.lengthM} m string.` + (hitTest(view, x, y)?.drag ? ' Drag it aside and let go.' : '');
    }
  }
  if (view.keys[4] === 'weight:light') {
    for (const [name, point] of Object.entries(SHELF)) if (near(point, 30)) return `${WEIGHTS[name]} kg weight. Click it, or press ${name === 'light' ? 4 : 5}, to hang it.`;
    for (const length of LENGTHS) if (Math.abs(x - HOOK_X[length]) < 34 && y > PLATE_Y - 16 && y < BEAM_Y + 30) return `The ${length} m hook. Click it, or press ${LENGTHS.indexOf(length) + 1}, to hang the weight here.`;
  }
  if (y > BEAM_Y - 18 && y < BEAM_Y + 12 && x > 60 && x < 940) return 'The beam: every string hangs from a hook on it.';
  if (view.startMark && near(bobPoint(view.pendulums[0], Math.abs(view.pendulums[0].amplitude ?? SWING_RAD)), 40)) return 'The green start mark: one swing ends when the weight is back here.';
  return null;
}

export function targetPoint(view, action) {
  const [kind, value] = action.split(':');
  if (kind === 'hook') return [HOOK_X[value], PLATE_Y];
  if (kind === 'weight') return SHELF[value];
  if (kind === 'release') { const p = draggable(view); return p ? bobPoint(p) : null; }
  if (kind === 'measure') { const p = view.pendulums.find(q => q.lengthM === Number(value)); return p ? bobPoint(p) : null; }
  if (kind === 'tap') { const p = view.pendulums[0]; return p ? bobPoint(p, Math.abs(p.amplitude ?? SWING_RAD)) : null; }
  return null;
}
// The angle a drag to (x, y) holds the weight at.
export function dragAngle(view, id, x, y) {
  const p = pendulumById(view, id);
  return p ? Math.atan2(x - p.x, Math.max(10, y - BEAM_Y)) : 0;
}

// ---- drawing ----
let grain = null;
function background(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD.height);
  g.addColorStop(0, theme.back[0]); g.addColorStop(1, theme.back[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  // Brushed steel streaks, the same every frame (a fixed pattern, not random each draw).
  if (!grain) {
    grain = {lines: Array.from({length: 150}, (_, i) => [((i * 7919) % 1000), ((i * 104729) % BOARD.height), 30 + (i * 31) % 160])};
  }
  ctx.strokeStyle = theme.grain; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [x, y, w] of grain.lines) { ctx.moveTo(x, y); ctx.lineTo(x + w, y + .5); }
  ctx.stroke();
  const v = ctx.createRadialGradient(500, 340, 200, 500, 340, 640);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
}
function text(ctx, value, x, y, {size = 20, colour = theme.text, align = 'center', weight = 700, baseline = 'middle'} = {}) {
  ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(value, x + 1.5, y + 1.5);
  ctx.fillStyle = colour; ctx.fillText(value, x, y);
}
function beam(ctx, from = 60, to = 940) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(from + 6, BEAM_Y - 10, to - from, 22);
  const g = ctx.createLinearGradient(0, BEAM_Y - 16, 0, BEAM_Y + 8);
  g.addColorStop(0, theme.beamLight); g.addColorStop(.35, theme.beam); g.addColorStop(1, theme.beamDark);
  ctx.fillStyle = g; ctx.fillRect(from, BEAM_Y - 16, to - from, 8); ctx.fillRect(from, BEAM_Y + 2, to - from, 8);
  ctx.fillStyle = theme.beamDark; ctx.fillRect(from, BEAM_Y - 8, to - from, 10);
  ctx.fillStyle = theme.rivet;
  for (let x = from + 14; x < to; x += 36) { ctx.beginPath(); ctx.arc(x, BEAM_Y - 12, 2.2, 0, Math.PI * 2); ctx.arc(x, BEAM_Y + 6, 2.2, 0, Math.PI * 2); ctx.fill(); }
}
function hook(ctx, x, colour = theme.beamLight) {
  ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, BEAM_Y + 10); ctx.lineTo(x, BEAM_Y + 18); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, BEAM_Y + 22, 4, Math.PI * 1.5, Math.PI * 3.2); ctx.stroke();
}
function ball(ctx, x, y, kg, {ghost = false, label = true} = {}) {
  const r = radius(kg), colours = kg > 100 ? theme.iron : theme.brass;
  ctx.save();
  if (ghost) ctx.globalAlpha = .42;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 5, r, r * .92, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r * 1.05);
  g.addColorStop(0, ghost ? '#d9dee2' : colours[0]); g.addColorStop(.45, ghost ? '#9aa2a8' : colours[1]); g.addColorStop(1, ghost ? '#4a5257' : colours[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
  if (label) { ctx.font = `800 ${kg > 100 ? 13 : 12}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(30,20,5,.75)'; ctx.fillText(kg > 100 ? '200' : '20', x, y + 1); }
  ctx.restore();
}
function swingPath(ctx, p, highlight = false, pivotY = BEAM_Y) {
  const r = p.lengthM * METRE, a = Math.abs(p.amplitude ?? SWING_RAD);
  ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = highlight ? theme.accent : theme.faint; ctx.lineWidth = highlight ? 2.5 : 1.5;
  ctx.beginPath(); ctx.arc(p.x, pivotY, r, Math.PI / 2 - a, Math.PI / 2 + a); ctx.stroke(); ctx.restore();
}
function pendulum(ctx, p, {path = p.swinging, glow = false, time = 0} = {}) {
  const [bx, by] = bobPoint(p);
  if (path) swingPath(ctx, p);
  ctx.save();
  if (p.ghost) { ctx.setLineDash([6, 5]); ctx.globalAlpha = .55; }
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + 2, BEAM_Y + 24); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
  ctx.strokeStyle = p.ghost ? theme.ghost : theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, BEAM_Y + 24); ctx.lineTo(bx, by); ctx.stroke();
  ctx.restore();
  hook(ctx, p.x);
  if (glow) halo(ctx, bx, by, radius(p.weightKg) + 10, time);
  ball(ctx, bx, by, p.weightKg, {ghost: p.ghost});
}
function halo(ctx, x, y, r, time) {
  const pulse = .5 + .5 * Math.sin(time * 5);
  ctx.save(); ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .45 * pulse; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r + pulse * 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function stopwatch(ctx, x, y, watch, periodS, {ghost = false, r = WATCH_R, digits = true} = {}) {
  ctx.save();
  if (ghost) ctx.globalAlpha = .55;
  ctx.fillStyle = theme.beamDark; ctx.fillRect(x - 5, y - r - 9, 10, 8);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x + 3, y + 3, r + 4, 0, Math.PI * 2); ctx.fill();
  const bezel = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  bezel.addColorStop(0, theme.beamLight); bezel.addColorStop(1, theme.beamDark);
  ctx.fillStyle = bezel; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.2;
  for (let s = 0; s < DIAL_S * 2; s++) {
    const a = s / (DIAL_S * 2) * Math.PI * 2 - Math.PI / 2, inner = s % 2 ? r - 4 : r - 8;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner); ctx.lineTo(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1)); ctx.stroke();
  }
  const elapsed = watch?.elapsed ?? 0;
  if (watch) {
    // The swept part of the dial, so a short and a long swing can be compared at a glance.
    ctx.fillStyle = watch.done ? 'rgba(86,214,131,.35)' : 'rgba(237,197,87,.3)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r - 9, -Math.PI / 2, -Math.PI / 2 + elapsed / DIAL_S * Math.PI * 2); ctx.closePath(); ctx.fill();
  }
  const a = elapsed / DIAL_S * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5)); ctx.stroke();
  ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (digits) {
    const label = watch ? `${elapsed.toFixed(1)} s` : '0.0 s';
    text(ctx, label, x + r + 12, y, {size: 22, align: 'left', colour: watch?.done ? theme.good : ghost ? theme.ghost : watch ? theme.accent : theme.faint});
    if (watch?.done) text(ctx, 'one swing', x + r + 12, y + 20, {size: 13, align: 'left', colour: theme.good, weight: 600});
  }
}
function plate(ctx, x, y, label, {key = null, chosen = false, glow = false, time = 0} = {}) {
  ctx.font = '800 16px "Segoe UI", sans-serif';
  const w = ctx.measureText(label).width + (key ? 40 : 18), h = 26;
  if (glow) halo(ctx, x, y, w / 2 + 4, time);
  ctx.fillStyle = chosen ? theme.accent : theme.plate; ctx.strokeStyle = chosen ? theme.accent : theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = chosen ? '#1d2224' : theme.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x - (key ? 11 : 0), y + 1);
  if (key) keyCap(ctx, x + w / 2 - 15, y, key, chosen);
}
function keyCap(ctx, x, y, key, dark = false) {
  ctx.fillStyle = dark ? '#1d2224' : '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 10, y - 10, 20, 20, 3); ctx.fill();
  ctx.fillStyle = dark ? '#f5f0dc' : '#1d2224'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x, y + 1);
}
function arrowDown(ctx, x, y, time) {
  const bob = Math.sin(time * 6) * 5;
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(x - 13, y - 26 + bob); ctx.lineTo(x + 13, y - 26 + bob); ctx.lineTo(x, y - 8 + bob); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 4, y - 44 + bob, 8, 20);
}
function tape(ctx, p) {
  const x = p.x + 30, end = BEAM_Y + p.lengthM * METRE;
  ctx.fillStyle = '#e8c547'; ctx.fillRect(x - 7, BEAM_Y + 10, 14, end - BEAM_Y - 10);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1;
  for (let m = 0; m <= p.lengthM; m++) {
    const y = BEAM_Y + m * METRE; if (y < BEAM_Y + 10) continue;
    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 7 + (m % 5 ? 5 : 10), y); ctx.stroke();
  }
  ctx.strokeStyle = theme.accent; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x - 7, end); ctx.lineTo(p.x, end); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, `${p.lengthM} m`, x + 14, (BEAM_Y + end) / 2, {size: 22, align: 'left', colour: theme.accent});
}
function partLabel(ctx, label, x, y, tx, ty) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  text(ctx, label, tx + (tx > x ? 8 : -8), ty, {size: 20, align: tx > x ? 'left' : 'right', colour: theme.accent});
}
function startMark(ctx, p, flash, time) {
  const [x, y] = bobPoint(p, Math.abs(p.amplitude ?? SWING_RAD));
  ctx.fillStyle = theme.good; ctx.strokeStyle = theme.good; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 26, y - 30); ctx.lineTo(x + 26, y + 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 26, y - 30); ctx.lineTo(x + 46, y - 22); ctx.lineTo(x + 26, y - 14); ctx.fill();
  text(ctx, 'start', x + 32, y + 44, {size: 15, colour: theme.good, align: 'left'});
  if (flash) { ctx.save(); ctx.strokeStyle = theme.good; ctx.lineWidth = 4; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, y, 30 + 6 * Math.sin(time * 12), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); text(ctx, 'TAP', x, y - 46, {size: 22, colour: theme.good}); }
}
function outAndBack(ctx, p) {
  const r = p.lengthM * METRE, a = Math.abs(p.amplitude ?? SWING_RAD);
  ctx.save(); ctx.strokeStyle = theme.accent; ctx.lineWidth = 2;
  for (const [from, to, y, label] of [[a, -a, 22, 'out'], [-a, a, 48, 'back']]) {
    const rr = r + y;
    ctx.beginPath(); ctx.arc(p.x, BEAM_Y, rr, Math.PI / 2 - from, Math.PI / 2 - to, from < to); ctx.stroke();
    const end = Math.PI / 2 - to, ex = p.x + Math.cos(end) * rr, ey = BEAM_Y + Math.sin(end) * rr, dir = from < to ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 10 * dir, ey - 8); ctx.lineTo(ex + 10 * dir, ey + 8); ctx.closePath(); ctx.fillStyle = theme.accent; ctx.fill();
    text(ctx, label, p.x, BEAM_Y + rr + 14, {size: 16, colour: theme.accent});
  }
  ctx.restore();
}
function table(ctx, rows, x = 40, y = 450) {
  const w = 230, h = 34 + rows.length * 34;
  ctx.fillStyle = 'rgba(10,14,15,.65)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  text(ctx, 'One full swing', x + 14, y + 18, {size: 16, align: 'left', colour: theme.accent});
  rows.forEach((row, i) => {
    text(ctx, row.label, x + 14, y + 50 + i * 34, {size: 18, align: 'left', weight: 600});
    text(ctx, row.value ?? '…', x + w - 14, y + 50 + i * 34, {size: 20, align: 'right', colour: row.value ? theme.good : theme.faint});
  });
}
function shelf(ctx, chosen, view) {
  ctx.fillStyle = theme.beamDark; ctx.fillRect(40, 636, 140, 10);
  ctx.fillStyle = theme.beam; ctx.fillRect(40, 632, 140, 5);
  for (const [name, [x, y]] of Object.entries(SHELF)) {
    const kg = WEIGHTS[name], here = chosen.weightKg !== kg;
    if (here) ball(ctx, x, y, kg);
    else { ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = theme.faint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, radius(kg), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (view.glow === `weight:${name}`) halo(ctx, x, y, radius(kg) + 8, view.time);
    text(ctx, `${kg} kg`, x, 662, {size: 15, colour: theme.text, weight: 700});
    keyCap(ctx, x, 570, name === 'light' ? '4' : '5');
  }
  text(ctx, 'Weights', 110, 540, {size: 15, colour: theme.faint});
}

function drawPendulumBoard(ctx, view) {
  beam(ctx);
  const you = pendulumById(view, 'you');
  if (view.hooks) {
    for (const length of LENGTHS) {
      const x = HOOK_X[length], chosen = you?.lengthM === length;
      if (!chosen) {
        hook(ctx, x, theme.beam);
        ctx.save(); ctx.setLineDash([2, 8]); ctx.strokeStyle = theme.faint; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, BEAM_Y + 26); ctx.lineTo(x, BEAM_Y + length * METRE); ctx.stroke(); ctx.restore();
      }
      plate(ctx, x, PLATE_Y, `${length} m`, {key: String(LENGTHS.indexOf(length) + 1), chosen, glow: view.glow === `hook:${length}`, time: view.time});
      if (view.glow === `hook:${length}`) arrowDown(ctx, x, PLATE_Y - 16, view.time);
    }
    shelf(ctx, view.chosen, view);
  }
  for (const p of view.pendulums) {
    pendulum(ctx, p, {glow: view.glow === 'release' && p.id === 'you' || view.target === 'release' && view.labels && p.id === 'bob', time: view.time, path: p.swinging || view.outAndBack});
    const showWatch = view.stopwatches || view.lap;
    if (showWatch && !view.lap) stopwatch(ctx, p.x - 30, WATCH_Y, p.stopwatch, p.periodS, {ghost: p.ghost});
    if (p.id === 'reference') text(ctx, 'grey: 15 m, 20 kg', p.x, BEAM_Y + p.lengthM * METRE + 44, {size: 15, colour: theme.ghost});
    if (p.id === 'you' && view.guess) text(ctx, `your guess: ${view.guess === 'same' ? 'the same' : view.guess}`, p.x, BEAM_Y + p.lengthM * METRE + 44, {size: 15, colour: theme.accent});
    if (view.numbered) keyCap(ctx, p.x, BEAM_Y + p.lengthM * METRE + 42, String(LENGTHS.indexOf(p.lengthM) + 1));
  }
  if (view.lap) {
    const p = view.pendulums[0];
    stopwatch(ctx, p.x + 170, 230, {elapsed: view.lap.elapsed, done: false}, p.periodS);
    if (view.lap.last) text(ctx, `last full swing: ${view.lap.last.toFixed(1)} s`, p.x + 140, 290, {size: 17, colour: theme.good, align: 'left'});
  }
  if (view.labels) {
    const p = view.pendulums[0], [bx, by] = bobPoint(p);
    partLabel(ctx, 'hook', p.x + 6, BEAM_Y + 20, p.x + 120, BEAM_Y + 40);
    partLabel(ctx, 'string', (p.x + bx) / 2 - 2, (BEAM_Y + by) / 2, p.x - 120, (BEAM_Y + by) / 2);
    partLabel(ctx, 'weight', bx + 16, by, bx + 120, by + 30);
  }
  if (view.outAndBack) outAndBack(ctx, view.pendulums[0]);
  if (view.startMark) startMark(ctx, view.pendulums[0], view.tapFlash, view.time);
  for (const length of view.tapes ?? []) { const p = view.pendulums.find(q => q.lengthM === length); if (p) tape(ctx, p); }
  if (view.table) table(ctx, view.table, 40, 480);
  if (view.lastTry) text(ctx, `last try: ${view.lastTry.lengthM} m, ${view.lastTry.weightKg} kg took ${view.lastTry.periodS.toFixed(1)} s`, 600, 660, {size: 18, colour: theme.bad});
}

// ---- the helicopter scenes ----
// Kestrel One side on: a light utility helicopter, shaded so it reads against the board.
function helicopter(ctx, x, y, tilt, time, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(scale, scale);
  const body = ctx.createLinearGradient(0, -24, 0, 24);
  body.addColorStop(0, '#9aa596'); body.addColorStop(.45, '#5f6c62'); body.addColorStop(1, '#2b322d');
  ctx.fillStyle = '#4a544c';
  ctx.beginPath(); ctx.moveTo(-36, -8); ctx.lineTo(-118, -4); ctx.lineTo(-118, 4); ctx.lineTo(-36, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-108, -4); ctx.lineTo(-124, -30); ctx.lineTo(-114, -30); ctx.lineTo(-100, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(200,205,195,.25)'; ctx.beginPath(); ctx.arc(-118, -2, 13 * Math.abs(Math.sin(time * 30)) + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.bezierCurveTo(-30, -26, 30, -28, 46, -8); ctx.bezierCurveTo(54, 6, 44, 22, 20, 22); ctx.lineTo(-34, 20); ctx.bezierCurveTo(-46, 16, -48, -6, -40, -14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  const glass = ctx.createLinearGradient(10, -24, 46, 4); glass.addColorStop(0, '#d9e6ea'); glass.addColorStop(1, '#4f6670');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(8, -20); ctx.bezierCurveTo(30, -24, 44, -14, 47, -4); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-40, 6, 78, 5);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-6, 20); ctx.stroke();
  ctx.strokeStyle = '#2e353a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 21); ctx.lineTo(-30, 32); ctx.moveTo(22, 21); ctx.lineTo(26, 32); ctx.moveTo(-46, 32); ctx.lineTo(42, 32); ctx.stroke();
  ctx.fillStyle = '#2e353a'; ctx.fillRect(-4, -34, 8, 10);
  const blade = 128 * Math.abs(Math.cos(time * 22));
  ctx.strokeStyle = 'rgba(210,214,205,.18)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-128, -35); ctx.lineTo(128, -35); ctx.stroke();
  ctx.strokeStyle = '#20262a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-blade, -35); ctx.lineTo(blade, -35); ctx.stroke();
  ctx.restore();
}
// The Dusthawk rally car on its lifting sling.
function car(ctx, x, y, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = theme.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-26, -4); ctx.moveTo(0, -20); ctx.lineTo(26, -4); ctx.stroke();
  const paint = ctx.createLinearGradient(0, -12, 0, 16); paint.addColorStop(0, '#f1ece0'); paint.addColorStop(1, '#8f8a7d');
  ctx.fillStyle = paint; ctx.beginPath(); ctx.moveTo(-38, 14); ctx.lineTo(-38, 2); ctx.lineTo(-20, -1); ctx.lineTo(-11, -12); ctx.lineTo(16, -12); ctx.lineTo(27, -1); ctx.lineTo(39, 2); ctx.lineTo(39, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#2f6b45'; ctx.fillRect(-38, 6, 77, 4);
  ctx.fillStyle = '#34444c'; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(3, -9); ctx.lineTo(3, -1); ctx.lineTo(-15, -1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(14, -9); ctx.lineTo(22, -1); ctx.lineTo(6, -1); ctx.closePath(); ctx.fill();
  for (const wx of [-22, 24]) {
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 15, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 15, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function outdoors(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD.height);
  g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 26; i++) { const x = i * 41 + (i % 3) * 9, h = 40 + (i * 37) % 60; ctx.beginPath(); ctx.moveTo(x - 18, 600); ctx.lineTo(x, 600 - h); ctx.lineTo(x + 18, 600); ctx.fill(); }
  ctx.fillStyle = theme.ground; ctx.fillRect(0, 600, BOARD.width, 80);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(0, 600); ctx.lineTo(BOARD.width, 600); ctx.stroke();
}
const CABLE_PX = 15 * METRE * .8, HELI_Y = 150;
function carOnCable(ctx, hx, angle, time) {
  const cx = hx + Math.sin(angle) * CABLE_PX, cy = HELI_Y + 34 + Math.cos(angle) * CABLE_PX;
  ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, HELI_Y + 34); ctx.lineTo(cx, cy - 18); ctx.stroke();
  car(ctx, cx, cy, angle * .6);
  return [cx, cy];
}
function drawWonder(ctx, view) {
  outdoors(ctx);
  const t = view.time % 16, stopAt = 2.6, ease = k => k * k * (3 - 2 * k);
  const x = t < stopAt ? 140 + 360 * ease(t / stopAt) : 500;
  const tilt = t < stopAt ? .16 * Math.sin(Math.PI * t / stopAt) : -.06 * Math.exp(-(t - stopAt) * 1.5);
  const angle = t < stopAt ? -.18 * Math.sin(Math.PI * t / stopAt) : .34 * Math.sin(2 * Math.PI * (t - stopAt) / CABLE_PERIOD) * Math.exp(-(t - stopAt) * .03);
  carOnCable(ctx, x, angle, view.time);
  helicopter(ctx, x, HELI_Y, tilt, view.time);
  if (t >= stopAt) {
    text(ctx, 'stopped', x, HELI_Y - 64, {size: 18, colour: theme.accent});
    swingPath(ctx, {x, lengthM: CABLE_PX / METRE, amplitude: .34}, true, HELI_Y + 34);
  }
}
function drawSettle(ctx, view) {
  outdoors(ctx);
  const s = view.settle, since = s ? view.time - s.from : 0;
  const amplitude = s ? .3 * Math.exp(-since * .45) : .3;
  carOnCable(ctx, 500, amplitude * Math.sin(2 * Math.PI * view.time / CABLE_PERIOD), view.time);
  helicopter(ctx, 500, HELI_Y, 0, view.time);
  if (s && amplitude < .05) text(ctx, 'settled: safe to set down', 500, 640, {size: 22, colour: theme.good});
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 420); ctx.clip(); ctx.translate(x + w / 2, 0);
    const t = view.time;
    const mini = (id, px, length, kg) => ({id, x: px, lengthM: length, weightKg: kg, ghost: false, swinging: true, amplitude: SWING_RAD,
      angle: SWING_RAD * Math.cos(2 * Math.PI * t / stringPeriod(length))});
    if (idea.id === 'lengths') { beamShort(ctx); for (const p of [mini('a', -60, 5, 20), mini('b', 60, 17, 20)]) pendulum(ctx, p); }
    if (idea.id === 'weights') { beamShort(ctx); for (const p of [mini('a', -60, 15, 20), mini('b', 60, 15, 200)]) pendulum(ctx, p); }
    if (idea.id === 'settle') {
      const k = (t % 10) / 10, amplitude = .3 * Math.exp(-k * 4.5);
      ctx.translate(-500, 0); carOnCable(ctx, 500, amplitude * Math.sin(2 * Math.PI * t / CABLE_PERIOD), t); helicopter(ctx, 500, HELI_Y, 0, t, .8);
    }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 550, w - 30);
  });
}
function beamShort(ctx) { ctx.save(); ctx.translate(-500, 0); beam(ctx, 380, 620); ctx.restore(); }
function wrap(ctx, value, x, y, width) {
  ctx.font = '700 22px "Segoe UI", sans-serif';
  const words = value.split(' '), lines = [];
  let line = '';
  for (const w of words) { const next = line ? `${line} ${w}` : w; if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next; }
  lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * 28, {size: 22}));
}

export function drawBoard(ctx, view, width, height) {
  ctx.save();
  const scale = Math.min(width / BOARD.width, height / BOARD.height);
  ctx.translate((width - BOARD.width * scale) / 2, (height - BOARD.height * scale) / 2); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, BOARD.width, BOARD.height); ctx.clip();
  if (view.scene === 'wonder') drawWonder(ctx, view);
  else if (view.scene === 'settle') drawSettle(ctx, view);
  else { background(ctx); if (view.scene === 'recap') drawRecap(ctx, view); else drawPendulumBoard(ctx, view); }
  ctx.restore();
  return {scale, left: (width - BOARD.width * scale) / 2, top: (height - BOARD.height * scale) / 2};
}

// ---- the card pictures ----
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const back = ctx.createLinearGradient(0, 0, 0, h);
  back.addColorStop(0, picture.kind === 'heli' ? theme.sky[0] : theme.back[0]); back.addColorStop(1, picture.kind === 'heli' ? theme.sky[1] : theme.back[1]);
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'compare') {
    const mine = {quicker: stringPeriod(5), slower: stringPeriod(25), same: stringPeriod(15)}[picture.mine];
    stopwatch(ctx, w * .28, h * .48, {elapsed: stringPeriod(15), done: false}, 0, {ghost: true, r: 30, digits: false});
    stopwatch(ctx, w * .72, h * .48, {elapsed: mine, done: false}, 0, {r: 30, digits: false});
    text(ctx, 'grey', w * .28, h - 14, {size: 14, colour: theme.ghost});
    text(ctx, 'yours', w * .72, h - 14, {size: 14, colour: theme.accent});
    text(ctx, picture.mine === 'quicker' ? '<' : picture.mine === 'slower' ? '>' : '=', w / 2, h * .48, {size: 30, colour: theme.text});
  }
  if (picture.kind === 'watch') {
    stopwatch(ctx, w * .5, h * .5, {elapsed: picture.seconds, done: false}, 0, {r: 38, digits: false});
  }
  if (picture.kind === 'setup') {
    const top = 16, length = picture.lengthM * 3.8, x = w / 2;
    ctx.fillStyle = theme.beam; ctx.fillRect(x - 50, top - 6, 100, 8);
    ctx.strokeStyle = theme.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + length * .2, top + length); ctx.stroke();
    ball(ctx, x + length * .2, top + length, picture.weightKg, {label: false});
  }
  if (picture.kind === 'heli') {
    ctx.save(); ctx.translate(w / 2, 0); ctx.scale(.45, .45); ctx.translate(-500, -60);
    const hx = picture.move === 'forward' ? 560 : 500, tilt = picture.move === 'forward' ? .25 : 0;
    if (picture.move === 'drop') { car(ctx, 500, 470, .5); ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(470, 380); ctx.lineTo(470, 430); ctx.moveTo(530, 380); ctx.lineTo(530, 430); ctx.stroke(); }
    else carOnCable(ctx, hx, picture.move === 'forward' ? -.55 : .05, 0);
    helicopter(ctx, hx, HELI_Y, tilt, .3);
    if (picture.move === 'forward') { ctx.strokeStyle = theme.text; ctx.lineWidth = 4; for (const y of [120, 150, 180]) { ctx.beginPath(); ctx.moveTo(360, y); ctx.lineTo(420, y); ctx.stroke(); } }
    ctx.restore();
  }
}
