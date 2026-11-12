// The pendulum lesson's board (docs/board/cards/LAB-CLASSROOM.md section 4; wording: LAB-CLASSROOM-LANGUAGE.md): a 2D
// teaching drawing at true scale and real speed. Draws and hit-tests only; it never changes the lesson.
import {stringPeriod} from '../benches/pendulum.js';
import {GUESS_CAPTIONS, HOOK_X, LENGTHS, REFERENCE_X, SWING_RAD, WEIGHTS, tripMetres} from './pendulum-classroom.js';
import {BOARD, theme, background, floor, shadow, forceArrow, cable, swivelHook, brassDial, glassGlare, steelBeam, steel, bolt, text, keyCap, helicopter, car, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
export {BOARD};

const BEAM_Y = 150, METRE = 18, WATCH_Y = 50, WATCH_R = 28, DIAL_S = 12, PLATE_Y = BEAM_Y - 30, FLOOR_Y = 622;
const SHELF = Object.freeze({light: [78, 618], heavy: [140, 608]});
const radius = kg => kg > 100 ? 26 : 18;
const CABLE_PERIOD = stringPeriod(15);
// The free test's pull-back buttons, on the left of the beam.
const PULL_BUTTONS = Object.freeze({'pull:up': [100, 285], 'pull:down': [100, 325]});

export const bobPoint = (p, angle = p.angle) => [p.x + Math.sin(angle) * p.lengthM * METRE, BEAM_Y + Math.cos(angle) * p.lengthM * METRE];
const pendulumById = (view, id) => view.pendulums.find(p => p.id === id);
const draggable = view => view.pendulums.find(p => p.id === 'you' || p.id === 'bob' && view.labels);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  const near = (point, r) => Math.hypot(x - point[0], y - point[1]) <= r;
  const drag = draggable(view);
  if (drag && view.keys.Space === 'release' && near(bobPoint(drag), radius(drag.weightKg) + 16)) return {drag: drag.id, action: 'release'};
  if (view.pull && view.keys['↑']) for (const [action, [bx, by]] of Object.entries(PULL_BUTTONS)) if (Math.abs(x - bx) < 62 && Math.abs(y - by) < 17) return {action};
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
    if ((view.stopwatches || view.lap) && near([watchX, WATCH_Y], WATCH_R + 6)) return 'This stopwatch stops after one full swing, out and back.';
    if (near(bobPoint(p), radius(p.weightKg) + 8)) {
      if (p.ghost) return 'This grey weight is 20 kg on a 15 m string, so that you can compare your weight with it.';
      if (view.labels) return `This is the weight. ${hitTest(view, x, y)?.drag ? 'Drag it sideways and let go.' : 'It is swinging on its string.'}`;
      return `This is a ${p.weightKg} kg weight on a ${p.lengthM} m string.` + (hitTest(view, x, y)?.drag ? ' Drag it sideways and let go.' : '');
    }
  }
  if (view.pull && view.keys['↑'] && x > 38 && x < 162 && y > 190 && y < 345) return 'The pull-back is the angle between the string and straight down. A larger pull-back makes a longer trip.';
  if (view.keys[4] === 'weight:light') {
    for (const [name, point] of Object.entries(SHELF)) if (near(point, 30)) return `This is the ${WEIGHTS[name]} kg weight. Click it, or press ${name === 'light' ? 4 : 5}, to hang it.`;
    for (const length of LENGTHS) if (Math.abs(x - HOOK_X[length]) < 34 && y > PLATE_Y - 16 && y < BEAM_Y + 30) return `This is the ${length} m hook. Click it, or press ${LENGTHS.indexOf(length) + 1}, to hang the weight here.`;
  }
  if (y > BEAM_Y - 18 && y < BEAM_Y + 12 && x > 60 && x < 940) return 'This is the steel beam, and every string hangs from a hook on it.';
  if (view.startMark && near(bobPoint(view.pendulums[0], Math.abs(view.pendulums[0].amplitude ?? SWING_RAD)), 40)) return 'This green flag is where the weight starts, and one swing ends when the weight is back here.';
  return null;
}

export function targetPoint(view, action) {
  const [kind, value] = action.split(':');
  if (kind === 'set') { const p = draggable(view); return p ? bobPoint(p) : null; }
  if (kind === 'pull') return PULL_BUTTONS[action];
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
function beam(ctx, from = 60, to = 940) {
  // Two plates bolted to the wall hold the beam up.
  for (const bx of [from + 12, to - 12]) { steel(ctx, bx - 8, BEAM_Y - 27, 16, 62, 2); bolt(ctx, bx, BEAM_Y - 21, 2.2); bolt(ctx, bx, BEAM_Y + 27, 2.2); }
  steelBeam(ctx, from, to, BEAM_Y - 16, 26);
}
// The hanging bracket and swivel that a string hooks on; a dim one is a hook the weight is not on.
function hook(ctx, x, dim = false) { swivelHook(ctx, x, BEAM_Y + 10, dim ? .5 : 1); }
// A weight: a cast ball with a lifting eye, a lit side, a seam and its mass stencilled on. The light 20 kg weight is bronze
// and the heavy 200 kg weight is cast iron. `angle` is how far the string leans, so that the eye sits where the string joins.
function ball(ctx, x, y, kg, {ghost = false, label = true, angle = 0} = {}) {
  const r = radius(kg), heavy = kg > 100;
  ctx.save();
  if (ghost) ctx.globalAlpha = .42;
  const ex = x - Math.sin(angle) * (r + 2.5), ey = y - Math.cos(angle) * (r + 2.5);
  ctx.strokeStyle = ghost ? '#8c949a' : '#252b2f'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(ex, ey, 3, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
  const g = ctx.createRadialGradient(x - r * .4, y - r * .44, r * .05, x + r * .12, y + r * .12, r * 1.12);
  g.addColorStop(0, ghost ? '#d9dee2' : heavy ? '#929da3' : '#ffeeb0'); g.addColorStop(.38, ghost ? '#9aa2a8' : heavy ? '#444d52' : '#cf9a38'); g.addColorStop(1, ghost ? '#4a5257' : heavy ? '#0d1012' : '#4f3409');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // Warm light thrown back from the floor along the lower edge, and the seam where the two halves of the mould met.
  ctx.strokeStyle = 'rgba(255,196,130,.28)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, r - 1.4, Math.PI * .12, Math.PI * .55); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r, r * .24, -angle, .1, Math.PI - .1); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * .42, y - r * .46, r * .24, r * .14, -.75, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(x - r * .46, y - r * .5, r * .07, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  if (label) {
    ctx.font = `800 ${heavy ? 13 : 12}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = heavy ? 'rgba(235,228,205,.88)' : 'rgba(40,24,4,.8)'; ctx.fillText(heavy ? '200' : '20', x, y + 2);
  }
  ctx.restore();
}
// The soft shadow a weight throws on the floor: wider and fainter the higher the weight hangs.
function weightShadow(ctx, p) {
  const [bx, by] = bobPoint(p), up = Math.max(0, FLOOR_Y - by);
  shadow(ctx, bx, FLOOR_Y + 22, radius(p.weightKg) * (2.2 + up / 200), Math.max(.22, (p.ghost ? .4 : .75) - up / 800));
}
function swingPath(ctx, p, highlight = false, pivotY = BEAM_Y) {
  const r = p.lengthM * METRE, a = Math.abs(p.amplitude ?? SWING_RAD);
  ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = highlight ? theme.accent : theme.faint; ctx.lineWidth = highlight ? 2.5 : 1.5;
  ctx.beginPath(); ctx.arc(p.x, pivotY, r, Math.PI / 2 - a, Math.PI / 2 + a); ctx.stroke(); ctx.restore();
}
function pendulum(ctx, p, {path = p.swinging, glow = false, time = 0} = {}) {
  const [bx, by] = bobPoint(p), r = radius(p.weightKg), lean = Math.atan2(bx - p.x, by - BEAM_Y);
  if (path) swingPath(ctx, p);
  // The cable runs from the ring on the hook to the lifting eye on the weight.
  cable(ctx, p.x, BEAM_Y + 34, bx - Math.sin(lean) * (r + 5.5), by - Math.cos(lean) * (r + 5.5), {width: 2.2, alpha: p.ghost ? .5 : 1});
  hook(ctx, p.x);
  if (glow) halo(ctx, bx, by, r + 10, time);
  ball(ctx, bx, by, p.weightKg, {ghost: p.ghost, angle: lean});
}
function halo(ctx, x, y, r, time) {
  const pulse = .5 + .5 * Math.sin(time * 5);
  ctx.save(); ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .45 * pulse; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r + pulse * 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function stopwatch(ctx, x, y, watch, periodS, {ghost = false, r = WATCH_R, digits = true} = {}) {
  ctx.save();
  if (ghost) ctx.globalAlpha = .55;
  // The crown, then the brass case, the face, the ticks, the swept part, the hand and the glass.
  steel(ctx, x - 4, y - r - 12, 8, 8, 1.5);
  ctx.strokeStyle = '#b7bfc3'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y - r - 14, 3.4, Math.PI * .1, Math.PI * .9, true); ctx.stroke();
  brassDial(ctx, x, y, r);
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
  ctx.lineCap = 'round'; ctx.strokeStyle = '#c8402e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5)); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  glassGlare(ctx, x, y, r);
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
  const face = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  if (chosen) { face.addColorStop(0, '#ffe08a'); face.addColorStop(1, '#d9a640'); } else { face.addColorStop(0, '#39424a'); face.addColorStop(1, '#1d2326'); }
  ctx.fillStyle = face; ctx.strokeStyle = chosen ? theme.accent : theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - w / 2 + 4, y - h / 2 + 2, w - 8, 1);
  ctx.fillStyle = chosen ? '#1d2224' : theme.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x - (key ? 11 : 0), y + 1);
  if (key) keyCap(ctx, x + w / 2 - 15, y, key, chosen);
}
function arrowDown(ctx, x, y, time) {
  const bob = Math.sin(time * 6) * 5;
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(x - 13, y - 26 + bob); ctx.lineTo(x + 13, y - 26 + bob); ctx.lineTo(x, y - 8 + bob); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 4, y - 44 + bob, 8, 20);
}
function tape(ctx, p) {
  const x = p.x + 30, end = BEAM_Y + p.lengthM * METRE;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 4, BEAM_Y + 13, 14, end - BEAM_Y - 10);
  const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0); g.addColorStop(0, '#f6de80'); g.addColorStop(.45, '#e8c547'); g.addColorStop(1, '#a98a1e');
  ctx.fillStyle = g; ctx.fillRect(x - 7, BEAM_Y + 10, 14, end - BEAM_Y - 10);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 6.5, BEAM_Y + 10, 1.2, end - BEAM_Y - 10);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1;
  for (let m = 0; m <= p.lengthM; m++) {
    const y = BEAM_Y + m * METRE; if (y < BEAM_Y + 10) continue;
    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 7 + (m % 5 ? 5 : 10), y); ctx.stroke();
  }
  steel(ctx, x - 8, end - 1, 16, 4, 1);
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
  ctx.strokeStyle = '#c9d1d6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 26, y - 30); ctx.lineTo(x + 26, y + 30); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 27.6, y - 30); ctx.lineTo(x + 27.6, y + 30); ctx.stroke();
  const cloth = ctx.createLinearGradient(x + 26, y - 30, x + 46, y - 14); cloth.addColorStop(0, '#9ff5bf'); cloth.addColorStop(.5, theme.good); cloth.addColorStop(1, '#2c9a59');
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(x + 26, y - 30); ctx.lineTo(x + 46, y - 22); ctx.lineTo(x + 26, y - 14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 26, y - 22); ctx.lineTo(x + 46, y - 22); ctx.stroke();
  ctx.fillStyle = theme.good;
  text(ctx, 'start', x + 52, y - 22, {size: 15, colour: theme.good, align: 'left'});
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
function table(ctx, rows, x = 40, y = 450, w = 230) {
  const h = 34 + rows.length * 34;
  ctx.fillStyle = 'rgba(10,14,15,.65)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  text(ctx, 'One full swing', x + 14, y + 18, {size: 16, align: 'left', colour: theme.accent});
  rows.forEach((row, i) => {
    text(ctx, row.label, x + 14, y + 50 + i * 34, {size: 18, align: 'left', weight: 600});
    text(ctx, row.value ?? '…', x + w - 14, y + 50 + i * 34, {size: 20, align: 'right', colour: row.value ? theme.good : theme.faint});
  });
}
// A label under a weight that says how far one swing travels, at the angle the weight was pulled back.
function tripLabel(ctx, p, y) {
  const deg = Math.round(Math.abs(p.held ? p.angle : p.amplitude ?? SWING_RAD) * 180 / Math.PI);
  text(ctx, `one swing travels ${tripMetres(p.lengthM, deg).toFixed(1)} m`, p.x, y, {size: 15, colour: p.ghost ? theme.ghost : theme.accent});
}
// The pull of gravity on a weight: a longer arrow for the heavier weight, and the sum under it.
function pullArrow(ctx, p) {
  const [bx, by] = bobPoint(p), from = by + radius(p.weightKg) + 2, to = from + (p.weightKg > 100 ? 110 : 22);
  forceArrow(ctx, bx, from, to + 3 - from, false, theme.bad, 6);
  const pull = (p.weightKg * 9.81).toFixed(1);
  text(ctx, `pull of gravity: ${pull} newtons`, p.x, 578, {size: 16, colour: theme.bad});
  text(ctx, `${pull} ÷ ${p.weightKg} kg = 9.81 m/s²`, p.x, 602, {size: 16, colour: theme.good});
}
// The free test's pull-back: the angle on the string while the weight is held, and its two buttons.
function pullAngle(ctx, p) {
  const r = Math.min(70, p.lengthM * METRE * .6), a = p.angle, py = BEAM_Y + 10;
  ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = theme.faint; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p.x, py); ctx.lineTo(p.x, BEAM_Y + p.lengthM * METRE); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(p.x, py, r, Math.PI / 2 - Math.max(a, 0), Math.PI / 2 - Math.min(a, 0)); ctx.stroke();
}
function pullPanel(ctx, view, time) {
  text(ctx, 'Pull-back', 100, 205, {size: 16, colour: theme.text});
  text(ctx, `${view.pull.deg}°`, 100, 243, {size: 34, colour: theme.accent});
  plate(ctx, ...PULL_BUTTONS['pull:up'], 'More', {key: '↑', time});
  plate(ctx, ...PULL_BUTTONS['pull:down'], 'Less', {key: '↓', time});
}
// A sense of size for a metre: a grown-up beside a 1 m bar, at the same scale as the strings.
function metreScale(ctx) {
  const x = 870, foot = 620, head = foot - 1.8 * METRE;
  shadow(ctx, x, foot + 6, 20, .5);
  // The grown-up is a lit silhouette: head, shoulders and body, two legs.
  const body = ctx.createLinearGradient(x - 7, 0, x + 7, 0); body.addColorStop(0, '#e9e3cf'); body.addColorStop(1, '#8e8a7b');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, head + 4, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - 7, head + 9, 14, 13, 4); ctx.fill();
  ctx.fillRect(x - 5.5, head + 20, 4.6, foot - head - 20); ctx.fillRect(x + .9, head + 20, 4.6, foot - head - 20);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + .2, head + 22, .8, foot - head - 22);
  const tape = ctx.createLinearGradient(x + 22, 0, x + 28, 0); tape.addColorStop(0, '#f6de80'); tape.addColorStop(1, '#a98a1e');
  ctx.fillStyle = tape; ctx.fillRect(x + 22, foot - METRE, 6, METRE);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 22, foot - METRE); ctx.lineTo(x + 28, foot - METRE); ctx.moveTo(x + 22, foot - METRE / 2); ctx.lineTo(x + 25, foot - METRE / 2); ctx.stroke();
  text(ctx, '1 m', x + 36, foot - METRE / 2, {size: 16, align: 'left', colour: theme.accent});
  text(ctx, 'a grown-up, to scale', x + 8, foot + 20, {size: 15, colour: theme.text, weight: 600});
}
function shelf(ctx, chosen, view) {
  steel(ctx, 40, 632, 140, 10, 2);
  for (const bx of [58, 162]) { steel(ctx, bx - 4, 642, 8, 14, 1); bolt(ctx, bx, 636.5, 1.6); }
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
  floor(ctx, FLOOR_Y);
  for (const p of view.pendulums) weightShadow(ctx, p);
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
  if (view.pull && view.keys.Space) pullPanel(ctx, view, view.time);
  if (view.freeRows?.length) table(ctx, view.freeRows.slice(-5), 690, 172, 290);
  if (view.scale) metreScale(ctx);
  for (const p of view.pendulums) {
    pendulum(ctx, p, {glow: view.glow === 'release' && p.id === 'you' || view.target === 'release' && view.labels && p.id === 'bob', time: view.time, path: p.swinging || view.outAndBack});
    const showWatch = view.stopwatches || view.lap;
    if (showWatch && !view.lap) stopwatch(ctx, p.x - 30, WATCH_Y, p.stopwatch, p.periodS, {ghost: p.ghost});
    const captionY = view.pulls ? 636 : BEAM_Y + p.lengthM * METRE + 44;
    if (p.id === 'reference') text(ctx, 'grey: 15 m, 20 kg', p.x, captionY, {size: 15, colour: theme.ghost});
    if (p.id === 'you' && view.guess) text(ctx, `your guess: ${GUESS_CAPTIONS[view.guess]}`, p.x, captionY, {size: 15, colour: theme.accent});
    if (view.trips && (p.id === 'you' || p.id === 'reference')) tripLabel(ctx, p, BEAM_Y + p.lengthM * METRE + (view.guess || p.ghost ? 64 : 44));
    if (view.pulls && (p.id === 'you' || p.id === 'reference')) pullArrow(ctx, p);
    if (view.pull && p.id === 'you' && p.held) pullAngle(ctx, p);
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
  if (view.lastTry) text(ctx, `last try: ${view.lastTry.lengthM} m and ${view.lastTry.weightKg} kg needed ${view.lastTry.periodS.toFixed(1)} s`, 600, 660, {size: 18, colour: theme.bad});
}

// ---- the helicopter scenes ----
const CABLE_PX = 15 * METRE * .8, HELI_Y = 150, SETTLE_RATE = Math.log(3) / 16;
function carOnCable(ctx, hx, angle, time, ground = true) {
  const cx = hx + Math.sin(angle) * CABLE_PX, cy = HELI_Y + 34 + Math.cos(angle) * CABLE_PX;
  if (ground) { shadow(ctx, cx, 646, 54, .32); shadow(ctx, hx, 660, 110, .26); }
  cable(ctx, hx, HELI_Y + 34, cx, cy - 18, {width: 2.4});
  ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx, HELI_Y + 36, 2.6, 0, Math.PI * 2); ctx.stroke();
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
    text(ctx, 'the helicopter has stopped', x, HELI_Y - 64, {size: 18, colour: theme.accent});
    if (t < stopAt + CABLE_PERIOD / 2) text(ctx, 'the car is still moving', x, HELI_Y + 34 + CABLE_PX + 70, {size: 18, colour: theme.accent});
    swingPath(ctx, {x, lengthM: CABLE_PX / METRE, amplitude: .34}, true, HELI_Y + 34);
  }
}
function drawSettle(ctx, view) {
  outdoors(ctx);
  const s = view.settle, since = s ? s.since : 0;
  // The game's own rate: a swing of 3 m to one side on the 15 m cable falls below 1 m in about 16 seconds (heli-cable.js).
  const swingM = s ? 3 * Math.exp(-since * SETTLE_RATE) : 3, amplitude = Math.asin(swingM / 15);
  carOnCable(ctx, 500, amplitude * Math.sin(2 * Math.PI * view.time / CABLE_PERIOD), view.time);
  helicopter(ctx, 500, HELI_Y, 0, view.time);
  if (s) text(ctx, swingM < 1 ? 'the swing is under 1 m, so the car is safe to set down' : `the swing reaches ${swingM.toFixed(1)} m to each side`, 500, 640, {size: 22, colour: swingM < 1 ? theme.good : theme.accent});
}
const RECAP_SWING = .2;
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 400); ctx.clip(); ctx.translate(x + w / 2, 0);
    const t = view.time;
    // A smaller swing than the real 20 degrees, so that the weights stay inside their card.
    const mini = (id, px, length, kg) => ({id, x: px, lengthM: length, weightKg: kg, ghost: false, swinging: true, amplitude: RECAP_SWING,
      angle: RECAP_SWING * Math.cos(2 * Math.PI * t / stringPeriod(length))});
    if (idea.id === 'lengths') { beamShort(ctx); for (const p of [mini('a', -60, 5, 20), mini('b', 55, 15, 20)]) pendulum(ctx, p); }
    if (idea.id === 'weights') { beamShort(ctx); for (const p of [mini('a', -60, 15, 20), mini('b', 55, 15, 200)]) pendulum(ctx, p); }
    if (idea.id === 'settle') {
      const k = (t % 10) / 10, amplitude = .3 * Math.exp(-k * 4.5);
      ctx.translate(-500, 0); carOnCable(ctx, 500, amplitude * Math.sin(2 * Math.PI * t / CABLE_PERIOD), t, false); helicopter(ctx, 500, HELI_Y, 0, t, .8);
    }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 505, w - 30, {size: 19, weight: 600});
  });
}
function beamShort(ctx) { ctx.save(); ctx.translate(-500, 0); beam(ctx, 380, 620); ctx.restore(); }
export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'wonder') drawWonder(ctx, view);
    else if (view.scene === 'settle') drawSettle(ctx, view);
    else { background(ctx); if (view.scene === 'recap') drawRecap(ctx, view); else drawPendulumBoard(ctx, view); }
  });
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
    text(ctx, picture.mine === 'quicker' ? '>' : picture.mine === 'slower' ? '<' : '=', w / 2, h * .48, {size: 30, colour: theme.text});
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
    else carOnCable(ctx, hx, picture.move === 'forward' ? -.55 : .05, 0, false);
    helicopter(ctx, hx, HELI_Y, tilt, .3);
    if (picture.move === 'forward') { ctx.strokeStyle = theme.text; ctx.lineWidth = 4; for (const y of [120, 150, 180]) { ctx.beginPath(); ctx.moveTo(360, y); ctx.lineTo(420, y); ctx.stroke(); } }
    ctx.restore();
  }
}
