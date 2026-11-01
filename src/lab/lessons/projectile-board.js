// The Projectile lesson's board (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md): Kestrel One side on over
// the lake, the bucket or a stone on her hook, the falls with their paths, the flag, the buoy and a ruler
// on the water. Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, text, keyCap, helicopter, wrap, fitBoard} from '../classroom/board-art.js';
import {BEST_LET_GO_M, HIGH_M, JOB, RING_M, dropPoint, landing, metres} from './projectile-classroom.js';
import {stoneFallAfter} from '../benches/projectile.js';
export {BOARD};
// Pressing on the water moves the flag there at once.
export const pressMovesDrag = true;

// Metres to board units: the let-go post at x 200, the lake's surface at the ground line.
const POST_X = 200, METRE = 12, WATER_Y = GROUND_Y, HELI = .5, HANG_M = 3.8;
const bx = m => POST_X + m * METRE, by = h => WATER_Y - h * METRE;
const COLOURS = ['#f5f0dc', theme.accent, theme.good];
const WATER_BLUE = '#71c9ff', STONE = '#b9b4a8';

// Where her bucket (or stone) hangs, and where she is, in board units.
const bucketAt = c => [bx(c.x), by(c.h)];
const bodyAt = c => [bx(c.x), by(c.h + HANG_M) - 14];

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'lake') return null;
  if (view.dragFlag && y > WATER_Y - 70 && y < BOARD.height && x > POST_X - 40) return {drag: 'flag', action: 'release'};
  if (view.keys.Space && view.helis.some(c => near(c, x, y))) return {action: view.keys.Space};
  return null;
}
const near = (c, x, y) => { const [hx, hy] = bodyAt(c), [, ky] = bucketAt(c); return Math.abs(x - hx) < 70 && y > hy - 30 && y < ky + 14; };
export function hoverInfo(view, x, y) {
  if (view.scene !== 'lake') return null;
  for (const c of view.helis) {
    const [hx, hy] = bodyAt(c), [kx, ky] = bucketAt(c);
    if (Math.abs(x - kx) < 14 && Math.abs(y - ky) < 14 && c.loads.length) return c.loads.includes('water') ? `The water bucket, ${c.h} m above the lake.` : 'A stone: heavy and small, so the air hardly slows it.';
    if (Math.abs(x - hx) < 66 && Math.abs(y - hy) < 26) return c.speed ? `Kestrel One at ${c.speed} m/s: ${c.speed} metres every second.` : `Kestrel One, hovering ${c.h} m up: no forward speed.`;
  }
  if (view.flag != null && Math.abs(x - bx(view.flag)) < 16 && y > WATER_Y - 60 && y < WATER_Y + 10) return `Your flag, ${metres(view.flag)} from the post: your guess at where it lands.`;
  if (view.buoy != null && Math.abs(x - bx(view.buoy)) < RING_M * METRE + 6 && y > WATER_Y - 30 && y < WATER_Y + 12) return `The buoy. A splash inside its ring hits it.`;
  if (view.post && Math.abs(x - POST_X) < 10 && y > WATER_Y - 60 && y < WATER_Y) return 'The let-go post: she lets go right above it.';
  if (view.ruler && y > WATER_Y + 4 && y < WATER_Y + 40) return view.ruler === 'buoy' ? 'Metres before the buoy.' : 'Metres ahead of the let-go post.';
  for (const d of view.drops) {
    const p = dropPoint(d.kind, d.h, d.v, d.t), dx = bx(d.x0 + p.x), dy = by(p.y);
    if (Math.hypot(x - dx, y - dy) < 14) return d.kind === 'stone' ? 'The stone: the air hardly slows it.' : 'The water: a spray the air slows down.';
  }
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'lake') return null;
  if (action === 'drop' || action === 'drop:best') { const c = view.helis[0]; return c ? (c.loads.length ? bucketAt(c) : bodyAt(c)) : null; }
  if (action === 'release') { const k = view.marks.at(-1); return k ? [bx(k.x), WATER_Y - 6] : view.helis[0] ? bodyAt(view.helis[0]) : null; }
  if (action === 'flag:left' || action === 'flag:right') return view.flag == null ? null : [bx(view.flag), WATER_Y - 30];
  return null;
}
// The flag a drag to (x, y) on the water asks for, in metres from the post.
export function dragAngle(view, id, x) { return (x - POST_X) / METRE; }

// ---- drawing ----
function lake(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, WATER_Y);
  // The far shore: a fir line, the same every frame.
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  for (let i = 0; i < 30; i++) { const x = i * 35 + (i % 3) * 8, h = 26 + (i * 37) % 34; ctx.beginPath(); ctx.moveTo(x - 14, WATER_Y); ctx.lineTo(x, WATER_Y - h); ctx.lineTo(x + 14, WATER_Y); ctx.fill(); }
  const w = ctx.createLinearGradient(0, WATER_Y, 0, BOARD.height);
  w.addColorStop(0, '#3d5f6b'); w.addColorStop(1, '#16272d');
  ctx.fillStyle = w; ctx.fillRect(0, WATER_Y, BOARD.width, BOARD.height - WATER_Y);
  ctx.strokeStyle = 'rgba(220,240,245,.12)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { const x = (i * 83 + time * 9) % (BOARD.width + 60) - 30, y = WATER_Y + 10 + (i * 29) % 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(230,245,250,.35)'; ctx.beginPath(); ctx.moveTo(0, WATER_Y); ctx.lineTo(BOARD.width, WATER_Y); ctx.stroke();
}
function ruler(ctx, view) {
  const toBuoy = view.ruler === 'buoy';
  for (let m = 0; m <= 65; m += 5) {
    const x = bx(m), before = view.buoy - m;
    if (toBuoy && before < 0) break;
    ctx.strokeStyle = 'rgba(245,240,220,.6)'; ctx.lineWidth = m % 10 === 0 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, WATER_Y + 2); ctx.lineTo(x, WATER_Y + (m % 10 === 0 ? 12 : 8)); ctx.stroke();
    const label = toBuoy ? before : m;
    if (label % 10 === 0 || toBuoy) text(ctx, String(label), x, WATER_Y + 24, {size: 14, weight: 600, colour: toBuoy && label === Math.round(JOB.buoyM - BEST_LET_GO_M) ? theme.accent : theme.faint});
  }
  text(ctx, toBuoy ? 'metres before the buoy' : 'metres from the post', toBuoy ? bx(view.buoy) + 70 : BOARD.width - 16, WATER_Y + 50, {size: 14, weight: 600, colour: theme.faint, align: toBuoy ? 'left' : 'right'});
}
function post(ctx) {
  ctx.fillStyle = theme.beamDark; ctx.fillRect(POST_X - 3, WATER_Y - 46, 6, 50);
  ctx.fillStyle = theme.brass[1]; ctx.fillRect(POST_X - 6, WATER_Y - 50, 12, 6);
  text(ctx, 'let-go post', POST_X, WATER_Y - 62, {size: 13, weight: 600, colour: theme.faint});
}
function buoy(ctx, x, time) {
  const cx = bx(x), r = RING_M * METRE;
  ctx.strokeStyle = 'rgba(237,197,87,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.ellipse(cx, WATER_Y + 2, r, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  const bob = Math.sin(time * 2) * 1.5;
  ctx.fillStyle = '#e8613f'; ctx.beginPath(); ctx.arc(cx, WATER_Y + bob, 11, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#f5f0dc'; ctx.fillRect(cx - 11, WATER_Y - 5 + bob, 22, 3);
  ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, WATER_Y - 11 + bob); ctx.lineTo(cx, WATER_Y - 24 + bob); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(cx, WATER_Y - 25 + bob, 3, 0, Math.PI * 2); ctx.fill();
}
function flag(ctx, x, glow, time) {
  const cx = bx(x);
  ctx.fillStyle = '#5d666c'; ctx.beginPath(); ctx.ellipse(cx, WATER_Y + 1, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, WATER_Y); ctx.lineTo(cx, WATER_Y - 46); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(cx, WATER_Y - 46); ctx.lineTo(cx + 20, WATER_Y - 40); ctx.lineTo(cx, WATER_Y - 33); ctx.closePath(); ctx.fill();
  text(ctx, `flag ${metres(x)}`, cx, WATER_Y - 58, {size: 15, colour: theme.accent});
  if (glow) halo(ctx, cx, WATER_Y - 24, 30, time);
}
function bucket(ctx, x, y, full) {
  ctx.fillStyle = '#c9662f'; ctx.beginPath(); ctx.moveTo(x - 8, y - 15); ctx.lineTo(x + 8, y - 15); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  if (full) { ctx.fillStyle = WATER_BLUE; ctx.fillRect(x - 7, y - 15, 14, 3); }
}
function stone(ctx, x, y, r = 6) {
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, r);
  g.addColorStop(0, '#e4e0d6'); g.addColorStop(1, '#6f6a60');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function spray(ctx, x, y, r = 1) {
  ctx.fillStyle = WATER_BLUE;
  for (const [dx, dy, s] of [[0, 0, 5], [-5, -3, 3], [4, -4, 3], [-2, 5, 2.5], [5, 3, 2.5]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, s, 0, Math.PI * 2); ctx.fill(); }
}
// One helicopter with her bucket or stone on the cable, and her speed above her.
function kestrel(ctx, c, view, label = true) {
  ctx.save(); if (c.dim) ctx.globalAlpha = .45;
  const [hx, hy] = bodyAt(c), [kx, ky] = bucketAt(c), stoneOn = c.loads.includes('stone'), waterOn = c.loads.includes('water');
  ctx.strokeStyle = theme.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy + 12); ctx.lineTo(kx, ky - (stoneOn && !waterOn ? 6 : 15)); ctx.stroke();
  if (stoneOn && !waterOn) stone(ctx, kx, ky);
  else if (waterOn || c.carries === 'water') bucket(ctx, kx, ky, waterOn);
  if (stoneOn && waterOn) stone(ctx, kx + 13, ky - 4, 5);
  helicopter(ctx, hx, hy, c.v > .5 ? .08 : 0, view.time, HELI);
  if (label && c.speed) text(ctx, `${c.speed} m/s`, hx, hy - 40, {size: 15, colour: COLOURS[c.colour] ?? theme.text});
  ctx.restore();
}
function path(ctx, kind, h, v, x0, upTo, colour, faint = false) {
  ctx.fillStyle = colour; ctx.globalAlpha = faint ? .35 : .8;
  for (let t = 0; t <= upTo; t += .06) { const p = dropPoint(kind, h, v, t); ctx.beginPath(); ctx.arc(bx(x0 + p.x), by(p.y), faint ? 1.6 : 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drops(ctx, view) {
  for (const g of view.ghosts) {
    const end = landing(g.kind, g.h, g.v);
    path(ctx, g.kind, g.h, g.v, g.x0, end.seconds, theme.text, true);
    text(ctx, `${g.label}: ${metres(end.distanceM)}`, bx(g.x0 + end.distanceM), WATER_Y - 84, {size: 13, weight: 600, colour: theme.faint});
  }
  for (const d of view.drops) {
    const colour = d.kind === 'stone' ? STONE : view.drops.length > 1 && view.helis.length > 1 ? COLOURS[d.colour] : WATER_BLUE;
    path(ctx, d.kind, d.h, d.v, d.x0, d.t, colour);
    if (d.landed) continue;
    const p = dropPoint(d.kind, d.h, d.v, d.t), x = bx(d.x0 + p.x), y = by(p.y);
    if (d.kind === 'stone') stone(ctx, x, y); else spray(ctx, x, y);
  }
}
function marks(ctx, view) {
  view.marks.forEach((k, i) => {
    const x = bx(k.x);
    if (k.age < .8) { ctx.strokeStyle = k.kind === 'stone' ? STONE : WATER_BLUE; ctx.lineWidth = 2.5; ctx.globalAlpha = 1 - k.age / .8;
      ctx.beginPath(); ctx.ellipse(x, WATER_Y, 6 + k.age * 40, 3 + k.age * 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = k.kind === 'stone' ? STONE : WATER_BLUE; ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(245,240,220,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, WATER_Y - 4); ctx.lineTo(x, WATER_Y - 22 - (i % 2) * 22); ctx.stroke();
    const colour = view.helis.length > 1 && view.drops.length > 1 ? COLOURS[k.colour] : k.kind === 'stone' ? STONE : WATER_BLUE;
    text(ctx, k.label, x, WATER_Y - 30 - (i % 2) * 22, {size: 16, colour});
  });
}
const beforeBuoy = b => b > 0 ? `let go ${b} m before` : b < 0 ? `let go ${-b} m after` : 'let go over the buoy';
function letGoMark(ctx, x, label, colour = theme.accent, dy = 52) {
  const cx = bx(x);
  ctx.strokeStyle = colour; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(cx, by(HIGH_M) + 6); ctx.lineTo(cx, WATER_Y - 4); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, label, cx, by(HIGH_M) + dy, {size: 13, colour, weight: 600});
}
function height(ctx, h, x) {
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, WATER_Y); ctx.lineTo(x, by(h)); ctx.moveTo(x - 5, by(h)); ctx.lineTo(x + 5, by(h)); ctx.stroke();
  text(ctx, `${h} m up`, x + 8, (WATER_Y + by(h)) / 2, {size: 14, weight: 600, colour: theme.faint, align: 'left'});
}
// The gravity marks: how far the stone has fallen after one and two seconds.
function fallMarks(ctx, view) {
  const d = view.drops[0];
  if (!d) return;
  for (const s of [1, 2]) {
    if (d.t < s) continue;
    const y = by(d.h - stoneFallAfter(s));
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(POST_X - 20, y); ctx.lineTo(POST_X + 90, y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `after ${s} s: ${metres(stoneFallAfter(s))} fallen`, POST_X + 96, y, {size: 15, align: 'left', colour: theme.accent});
  }
}
function underHer(ctx, view) {
  const c = view.helis[0], d = view.drops[0];
  if (!c || !d || d.landed) return;
  const p = dropPoint(d.kind, d.h, d.v, d.t), x = bx(d.x0 + p.x);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(bx(c.x), by(c.h) + 4); ctx.lineTo(x, by(p.y) - 8); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, 'right under her', x + 10, (by(c.h) + by(p.y)) / 2, {size: 15, align: 'left', colour: theme.accent});
}
function clock(ctx, view) {
  const d = view.drops.find(x => !x.landed) ?? view.drops.at(-1);
  if (!d) return;
  text(ctx, `${Math.min(d.t, landing(d.kind, d.h, d.v).seconds).toFixed(1)} s since letting go`, BOARD.width / 2, 30, {size: 18, colour: theme.text});
}
function table(ctx, rows) {
  const w = 330, h = 18 + rows.length * 30, x = BOARD.width - w - 16, y = 12;
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  rows.forEach((row, i) => {
    text(ctx, row.label, x + 14, y + 24 + i * 30, {size: 16, align: 'left', weight: 600, colour: row.colour != null ? COLOURS[row.colour] : theme.text});
    text(ctx, row.value ?? '…', x + w - 14, y + 24 + i * 30, {size: 18, align: 'right', colour: row.value ? theme.good : theme.faint});
  });
}
// The board's Space cap, wide enough for its word (keyCap fits one letter).
function spaceCap(ctx, x, y) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 26, y - 10, 52, 20, 3); ctx.fill();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Space', x, y + 1);
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function drawLake(ctx, view) {
  lake(ctx, view.time);
  if (view.ruler) ruler(ctx, view);
  if (view.post) post(ctx);
  if (view.buoy != null) buoy(ctx, view.buoy, view.time);
  if (view.ghostLetGo != null) letGoMark(ctx, view.ghostLetGo, 'at 10 m/s', theme.faint, 96);
  if (view.letGo != null) letGoMark(ctx, view.letGo, view.ruler === 'buoy' ? beforeBuoy(Math.round(view.buoy - view.letGo)) : view.ghostLetGo != null ? 'at 20 m/s' : 'let go here');
  if (view.flag != null) flag(ctx, view.flag, view.glow === 'flag', view.time);
  if (view.helis.length && view.helis.every(c => !c.set)) [...new Set(view.helis.map(c => c.h))].forEach((h, i) => height(ctx, h, POST_X + 40 + i * 76));
  drops(ctx, view);
  marks(ctx, view);
  if (view.fallMarks) fallMarks(ctx, view);
  if (view.underHer) underHer(ctx, view);
  for (const c of view.helis) if (c.x > -14 && c.x < 76) kestrel(ctx, c, view);
  if (view.glow === 'drop' || view.glow === 'drop:best') { const at = targetPoint(view, view.glow); if (at) halo(ctx, ...at, 26, view.time); }
  if (view.keys.Space && view.helis[0]) { const [kx, ky] = bucketAt(view.helis[0]); spaceCap(ctx, kx + 46, ky - 6); }
  if (view.dragFlag) { keyCap(ctx, bx(view.flag) - 26, WATER_Y + 52, '←'); keyCap(ctx, bx(view.flag) + 26, WATER_Y + 52, '→'); }
  if (view.clock) clock(ctx, view);
  if (view.table) table(ctx, view.table);
}

function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 410); ctx.clip();
    miniScene(ctx, idea.id, x + 10, 110, w - 20, 380, view.time);
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 528, w - 30);
  });
}
// A small side view for the recap and the cards: a helicopter, falls drawn as dotted arcs, a buoy.
function miniScene(ctx, kind, x, y, w, h, time) {
  const water = y + h - 20, s = Math.min(w / 260, h / 200);
  ctx.fillStyle = 'rgba(61,95,107,.8)'; ctx.fillRect(x, water, w, 20);
  const arc = (fromX, fromY, toX, colour) => {
    ctx.fillStyle = colour;
    for (let i = 0; i <= 16; i++) { const f = i / 16; ctx.beginPath(); ctx.arc(fromX + (toX - fromX) * (1 - (1 - f) ** 2), fromY + (water - fromY) * f * f, 2.2, 0, Math.PI * 2); ctx.fill(); }
  };
  const mini = (hx, hy) => helicopter(ctx, hx, hy, .08, time, .3 * s);
  const buoyAt = bxp => { ctx.fillStyle = '#e8613f'; ctx.beginPath(); ctx.arc(bxp, water, 8 * s, Math.PI, 0); ctx.fill(); };
  if (kind === 'keep') {
    const hx = x + w * .62, hy = y + h * .25;
    mini(hx, hy);
    ctx.strokeStyle = theme.faint; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(hx, hy + 14); ctx.lineTo(hx, water); ctx.stroke(); ctx.setLineDash([]);
    arc(x + w * .15, hy + 14, hx, STONE);
    stone(ctx, hx, y + h * .62, 6);
    text(ctx, 'let go', x + w * .15, hy - 4, {size: 14, colour: theme.faint});
  }
  if (kind === 'faster') {
    const sx = x + w * .24, sy = y + h * .2;
    mini(sx, sy - 14);
    arc(sx, sy, x + w * .45, WATER_BLUE); arc(sx, sy, x + w * .85, STONE);
    text(ctx, 'water', x + w * .45, water - 14, {size: 14, colour: WATER_BLUE}); text(ctx, 'stone', x + w * .85, water - 14, {size: 14, colour: STONE});
  }
  if (kind === 'early') {
    const bxp = x + w * .78, sx = x + w * .38, sy = y + h * .25;
    buoyAt(bxp); mini(sx, sy - 14); arc(sx, sy, bxp, WATER_BLUE);
    text(ctx, 'pour here', sx, sy - 44, {size: 14, colour: theme.accent});
  }
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawLake(ctx, view);
  });
}

// ---- the card pictures ----
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const back = ctx.createLinearGradient(0, 0, 0, h);
  back.addColorStop(0, theme.sky[0]); back.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  const water = h - 14;
  ctx.fillStyle = '#3d5f6b'; ctx.fillRect(0, water, w, 14);
  const arc = (fromX, fromY, toX, colour = WATER_BLUE) => {
    ctx.fillStyle = colour;
    for (let i = 0; i <= 14; i++) { const f = i / 14; ctx.beginPath(); ctx.arc(fromX + (toX - fromX) * (1 - (1 - f) ** 2), fromY + (water - fromY) * f * f, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(toX, water + 1, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  };
  const mini = (x, y) => helicopter(ctx, x, y, .08, .3, .2);
  const buoyAt = x => { ctx.fillStyle = '#e8613f'; ctx.beginPath(); ctx.arc(x, water, 7, Math.PI, 0); ctx.fill(); };
  if (picture.kind === 'landing') {
    const b = w * .45; buoyAt(b); mini(b, 26);
    arc(b, 36, b + {short: -40, on: 0, past: 62}[picture.where]);
  }
  if (picture.kind === 'release') {
    const b = w * .82, from = {further: w * .18, same: w * .42, closer: w * .62}[picture.where];
    buoyAt(b); mini(from, 26); arc(from, 36, from + (b - from) * (picture.where === 'further' ? 1 : .8 + (picture.where === 'closer' ? .5 : 0)));
    text(ctx, '20 m/s', from, 8, {size: 12, colour: theme.accent});
  }
  if (picture.kind === 'height') {
    mini(w * .14, 18); mini(w * .14, 62);
    const low = w * .52, high = {further: w * .9, same: w * .58, shorter: w * .36}[picture.move];
    arc(w * .14, 70, low, theme.accent); arc(w * .14, 28, high, theme.good);
  }
  if (picture.kind === 'game') {
    const b = w * .62;
    buoyAt(b);
    if (picture.what === 'over') { mini(b, 26); arc(b, 36, b + 60); }
    if (picture.what === 'before') { mini(w * .28, 26); arc(w * .28, 36, b); }
    if (picture.what === 'high') { mini(b - 10, 10); arc(b - 10, 20, b + 50); text(ctx, 'very high', b + 40, 10, {size: 12, colour: theme.faint}); }
  }
}
