// The Projectile lesson's board (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md): Kestrel One side on over
// the lake, the bucket or a stone on its hook, the falls with their paths and speed arrows, the marks for each
// second, the flag, the buoy and a ruler on the water. Draws and hit-tests only.
// The wide board (docs/board/cards/LAB-LOOK.md, round 11): the lake takes the whole width of the panel and the scene is drawn larger, at
// one scale in every step but the free test. The clock and the tables of results are in the strip under the board.
import {BOARD, GROUND_Y, theme, background, cardScene, outdoors, waterBody, shadow, cable, steel, bolt, forceArrowTo, grain, text, helicopter, wrap, fitBoard} from '../classroom/board-art.js';
import {BEST_LET_GO_M, HIGH_M, JOB, RING_M, dropPoint, dropSpeed, landing, metres} from './projectile-classroom.js';
import {GRAVITY, stoneFallAfter} from '../benches/projectile.js';
export {BOARD};
export const size = Object.freeze({width: 1320, height: 680});
// Pressing on the water moves the flag there at once.
export const pressMovesDrag = true;

// The lake's surface, and how the metres lay out. The scene is drawn at 16 board units to the metre: the helicopter flies 30 m up, and the board is
// only 680 tall, so the metre cannot be longer without distorting the arcs. The free test lets the helicopter go as high as 40 m, so its scene is
// drawn at 12.5 to the metre. The ruler (0 to 60 m, numbered) is on the board in every step that has one, so its post stands at 300 from the left
// (the free test is centred); the steps with no ruler (the wonder and the questions) put the post where the middle of the step's own travel (in metres
// from the post, below) falls in the middle of the board. Sizes of the helicopter, the post, the buoy and the rest follow the scale (`k`); the words
// keep their sizes.
const WATER_Y = 625, HELI = .5, HANG_M = 3.8;
const MIDDLE = Object.freeze({wonder: 11, 'try-free': 24.5, 'check-over': 13, 'check-faster': 14, 'check-game': 13});
export const geometry = view => {
  const id = view.step?.id, metre = id === 'try-free' ? 12.5 : 16;
  return {post: Object.hasOwn(MIDDLE, id) ? Math.round(size.width / 2 - MIDDLE[id] * metre) : 300, metre, k: metre / 12};
};
let G = geometry({});
const bx = m => G.post + m * G.metre, by = h => WATER_Y - h * G.metre;
// Draws what is in the original small units, grown about (x, y) by the scene's scale.
const grow = (ctx, x, y, draw) => { ctx.save(); ctx.translate(x, y); ctx.scale(G.k, G.k); ctx.translate(-x, -y); draw(); ctx.restore(); };
const COLOURS = ['#f5f0dc', theme.accent, theme.good];
const WATER_BLUE = '#71c9ff', STONE = '#b9b4a8', FORWARD_COLOUR = theme.accent, DOWN_COLOUR = '#ff9a78', SCALE_Y = 104;

// Where the bucket (or stone) hangs, and where the helicopter is, in board units.
const bucketAt = c => [bx(c.x), by(c.h)];
const bodyAt = c => [bx(c.x), by(c.h + HANG_M) - 14 * G.k];

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'lake') return null;
  G = geometry(view);
  if (view.dragFlag && y > WATER_Y - 70 * G.k && y < size.height && x > G.post - 40) return {drag: 'flag', action: 'release'};
  if (view.keys.Space && view.helis.some(c => near(c, x, y))) return {action: view.keys.Space};
  return null;
}
const near = (c, x, y) => { const [hx, hy] = bodyAt(c), [, ky] = bucketAt(c); return Math.abs(x - hx) < 70 * G.k && y > hy - 30 * G.k && y < ky + 14 * G.k; };
export function hoverInfo(view, x, y) {
  if (view.scene !== 'lake') return null;
  G = geometry(view);
  const k = G.k;
  for (const c of view.helis) {
    const [hx, hy] = bodyAt(c), [kx, ky] = bucketAt(c);
    if (Math.abs(x - kx) < 14 * k && Math.abs(y - ky) < 14 * k && c.loads.length) return c.loads.includes('water') ? `The water bucket, ${c.h} m above the lake.` : 'A stone. It is heavy for its size, so the air hardly slows it.';
    if (Math.abs(x - hx) < 66 * k && Math.abs(y - hy) < 26 * k) return c.speed ? `The helicopter at ${c.speed} m/s, which is ${c.speed} metres during every second.` : `The helicopter, hovering ${c.h} m above the lake with no forward speed.`;
  }
  if (view.flag != null && Math.abs(x - bx(view.flag)) < 16 * k && y > WATER_Y - 60 * k && y < WATER_Y + 10) return `Your flag, ${metres(view.flag)} from the post, marks your guess at where the water will land.`;
  if (view.buoy != null && Math.abs(x - bx(view.buoy)) < RING_M * G.metre + 6 && y > WATER_Y - 30 * k && y < WATER_Y + 12) return `The buoy. A splash inside its ring hits it.`;
  if (view.post && Math.abs(x - G.post) < 10 * k && y > WATER_Y - 60 * k && y < WATER_Y) return 'The release post. The helicopter releases its load directly above this post.';
  if (view.ruler && y > WATER_Y + 4 && y < WATER_Y + 40) return view.ruler === 'buoy' ? 'Metres before the buoy.' : 'Metres ahead of the release post.';
  for (const d of view.drops) {
    const p = dropPoint(d.kind, d.h, d.v, d.t), dx = bx(d.x0 + p.x), dy = by(p.y);
    if (Math.hypot(x - dx, y - dy) < 14 * k) return d.kind === 'stone' ? 'The stone. The air hardly slows it.' : 'The water. The air slows these small droplets quickly.';
  }
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'lake') return null;
  G = geometry(view);
  if (action === 'drop' || action === 'drop:best') { const c = view.helis[0]; return c ? (c.loads.length ? bucketAt(c) : bodyAt(c)) : null; }
  if (action === 'release') { const k = view.marks.at(-1); return k ? [bx(k.x), WATER_Y - 6] : view.helis[0] ? bodyAt(view.helis[0]) : null; }
  if (action === 'flag:left' || action === 'flag:right') return view.flag == null ? null : [bx(view.flag), WATER_Y - 30 * G.k];
  return null;
}
// The flag a drag to (x, y) on the water asks for, in metres from the post.
export function dragAngle(view, id, x) { G = geometry(view); return (x - G.post) / G.metre; }

// ---- drawing ----
function lake(ctx, time) {
  // The dusk sky and the firs along the far shore, then the lake in front of them. The sky is painted for a horizon at 600, so it is stretched down
  // to the lake's surface.
  ctx.save(); ctx.scale(1, WATER_Y / GROUND_Y); outdoors(ctx, size.width); ctx.restore();
  waterBody(ctx, WATER_Y, time, size.width);
}
// A short white stake standing out of the water, with a dark band and a lit side.
function stake(ctx, x, h, w = 3.4) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 1, WATER_Y + 2, w + 2.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#f6f2e4'); g.addColorStop(.6, '#cfcabb'); g.addColorStop(1, '#7a776c');
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, WATER_Y - h, w, h + 1);
  ctx.fillStyle = '#1b1d1e'; ctx.fillRect(x - w / 2, WATER_Y - h + 2, w, 2);
  ctx.strokeStyle = 'rgba(235,246,250,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1, w + 1.5, 1.4, 0, 0, Math.PI * 2); ctx.stroke();
}
function ruler(ctx, view) {
  const toBuoy = view.ruler === 'buoy', k = G.k;
  for (let m = 0; m <= 65; m += 5) {
    const x = bx(m), before = view.buoy - m;
    if (toBuoy && before < 0) break;
    if (x > size.width + 30) break;
    grow(ctx, x, WATER_Y, () => stake(ctx, x, m % 10 === 0 ? 15 : 8, m % 10 === 0 ? 4 : 3));
    ctx.strokeStyle = 'rgba(245,240,220,.6)'; ctx.lineWidth = m % 10 === 0 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, WATER_Y + 2); ctx.lineTo(x, WATER_Y + (m % 10 === 0 ? 12 : 8) * k); ctx.stroke();
    const label = toBuoy ? before : m;
    if (label % 10 === 0 || toBuoy) text(ctx, String(label), x, WATER_Y + 24, {size: 16, weight: 600, colour: toBuoy && label === Math.round(JOB.buoyM - BEST_LET_GO_M) ? theme.accent : 'rgba(227,220,203,.6)'});
  }
  text(ctx, toBuoy ? 'metres before the buoy' : 'metres from the post', toBuoy ? bx(view.buoy) + 70 : size.width - 16, WATER_Y + 46, {size: 16, weight: 600, colour: 'rgba(227,220,203,.6)', align: toBuoy ? 'left' : 'right'});
}
// A small dark plate behind a label, so that it stays readable against the sky and the trees.
function plate(ctx, x, y, w, h = 18) { ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 5); ctx.fill(); }
function post(ctx) {
  const x = G.post, k = G.k;
  // A piling driven into the lake bed: weathered timber, iron bands, a brass cap and its reflection.
  grow(ctx, x, WATER_Y, () => {
    const rl = ctx.createLinearGradient(0, WATER_Y + 3, 0, WATER_Y + 32); rl.addColorStop(0, 'rgba(90,70,50,.55)'); rl.addColorStop(1, 'rgba(90,70,50,0)');
    ctx.fillStyle = rl; ctx.fillRect(x - 2.5, WATER_Y + 3, 5, 29);
    const wood = ctx.createLinearGradient(x - 3, 0, x + 3, 0); wood.addColorStop(0, '#8a775c'); wood.addColorStop(.45, '#5a4a37'); wood.addColorStop(1, '#241c14');
    ctx.fillStyle = wood; ctx.fillRect(x - 3, WATER_Y - 46, 6, 50);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 3, WATER_Y - 9, 6, 11);
    for (const dy of [-38, -24, -12]) {
      ctx.fillStyle = '#4c565d'; ctx.fillRect(x - 3.6, WATER_Y + dy, 7.2, 2.6);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - 3.6, WATER_Y + dy, 7.2, .8);
    }
    steel(ctx, x - 6.5, WATER_Y - 51, 13, 6, 2);
    const cap = ctx.createLinearGradient(0, WATER_Y - 51, 0, WATER_Y - 45); cap.addColorStop(0, theme.brass[0]); cap.addColorStop(.5, theme.brass[1]); cap.addColorStop(1, theme.brass[2]);
    ctx.fillStyle = cap; ctx.beginPath(); ctx.roundRect(x - 6, WATER_Y - 50, 12, 6, 2); ctx.fill();
    bolt(ctx, x, WATER_Y - 47, 1.3);
    ctx.strokeStyle = 'rgba(235,246,250,.45)'; ctx.lineWidth = 1.2;
    for (const [rx, ry] of [[8, 2.4], [14, 3.8]]) { ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1.5, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); }
  });
  plate(ctx, x, WATER_Y - 51 * k - 18, 100, 22);
  text(ctx, 'release post', x, WATER_Y - 51 * k - 18, {size: 16, weight: 600, colour: 'rgba(227,220,203,.7)'});
}
function buoy(ctx, x, time) {
  const cx = bx(x), r = RING_M * G.metre, bob = Math.sin(time * 2) * 1.5, k = G.k;
  ctx.strokeStyle = 'rgba(237,197,87,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.ellipse(cx, WATER_Y + 2, r, 7 * k, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  // The buoy's reflection, then its body: a red dome with a white band, a mast and a lamp.
  grow(ctx, cx, WATER_Y, () => {
    const refl = ctx.createLinearGradient(0, WATER_Y + 3, 0, WATER_Y + 30); refl.addColorStop(0, 'rgba(232,97,63,.4)'); refl.addColorStop(1, 'rgba(232,97,63,0)');
    ctx.fillStyle = refl; ctx.fillRect(cx - 9, WATER_Y + 3, 18, 27);
    const dome = ctx.createLinearGradient(cx - 11, 0, cx + 11, 0); dome.addColorStop(0, '#ffa27c'); dome.addColorStop(.4, '#e8613f'); dome.addColorStop(1, '#7d2614');
    ctx.fillStyle = dome; ctx.beginPath(); ctx.arc(cx, WATER_Y + bob, 11, Math.PI, 0); ctx.fill();
    const band = ctx.createLinearGradient(cx - 11, 0, cx + 11, 0); band.addColorStop(0, '#fffaf0'); band.addColorStop(1, '#9d9a8c');
    ctx.fillStyle = band; ctx.fillRect(cx - 10.4, WATER_Y - 5 + bob, 20.8, 3);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, WATER_Y + bob, 11, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(cx - 4, WATER_Y - 7 + bob, 3, 1.6, -.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2c353a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, WATER_Y - 11 + bob); ctx.lineTo(cx, WATER_Y - 24 + bob); ctx.stroke();
    const lamp = ctx.createRadialGradient(cx, WATER_Y - 25 + bob, 1, cx, WATER_Y - 25 + bob, 10); lamp.addColorStop(0, 'rgba(255,214,120,.8)'); lamp.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(cx, WATER_Y - 25 + bob, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(cx, WATER_Y - 25 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(240,248,250,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, WATER_Y + 1.5, 14, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
  });
}
function flag(ctx, x, glow, time) {
  const cx = bx(x), k = G.k;
  // A pole planted in the lake bed: a lit steel pole with a cloth flag, and ripples where it meets the water.
  grow(ctx, cx, WATER_Y, () => {
    ctx.strokeStyle = 'rgba(235,246,250,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, WATER_Y + 1.5, 10, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
    const rf = ctx.createLinearGradient(0, WATER_Y + 3, 0, WATER_Y + 26); rf.addColorStop(0, 'rgba(237,197,87,.35)'); rf.addColorStop(1, 'rgba(237,197,87,0)');
    ctx.fillStyle = rf; ctx.fillRect(cx - 1.5, WATER_Y + 3, 3, 23);
    ctx.strokeStyle = '#d8dee1'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, WATER_Y); ctx.lineTo(cx, WATER_Y - 46); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 1.4, WATER_Y); ctx.lineTo(cx + 1.4, WATER_Y - 46); ctx.stroke();
    const cloth = ctx.createLinearGradient(cx, WATER_Y - 46, cx + 20, WATER_Y - 33); cloth.addColorStop(0, '#fff0b8'); cloth.addColorStop(.5, theme.accent); cloth.addColorStop(1, '#a8801c');
    ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(cx, WATER_Y - 46); ctx.quadraticCurveTo(cx + 12, WATER_Y - 47, cx + 20, WATER_Y - 40); ctx.quadraticCurveTo(cx + 10, WATER_Y - 37, cx, WATER_Y - 33); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, WATER_Y - 40); ctx.quadraticCurveTo(cx + 10, WATER_Y - 41, cx + 18, WATER_Y - 40); ctx.stroke();
    ctx.fillStyle = '#eef2f3'; ctx.beginPath(); ctx.arc(cx, WATER_Y - 47, 1.8, 0, Math.PI * 2); ctx.fill();
  });
  text(ctx, `flag ${metres(x)}`, cx, WATER_Y - 58 * k, {size: 18, colour: theme.accent});
  if (glow) halo(ctx, cx, WATER_Y - 24 * k, 30 * k, time);
}
function bucket(ctx, x, y, full) {
  // A steel pail: a tapering body lit from the left, a rolled band, a dark mouth with the water in it, and a bail.
  ctx.strokeStyle = '#aeb7bc'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 8, y - 15); ctx.quadraticCurveTo(x, y - 24, x + 8, y - 15); ctx.stroke();
  const body = ctx.createLinearGradient(x - 8, 0, x + 8, 0); body.addColorStop(0, '#f0a06a'); body.addColorStop(.35, '#c9662f'); body.addColorStop(1, '#5b2610');
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - 8, y - 15); ctx.lineTo(x + 8, y - 15); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 7.3, y - 8, 14.6, 1.4); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 7.3, y - 9, 14.6, .8);
  ctx.fillStyle = '#1b1210'; ctx.beginPath(); ctx.ellipse(x, y - 15, 8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  if (full) { ctx.fillStyle = WATER_BLUE; ctx.beginPath(); ctx.ellipse(x, y - 14.6, 6.8, 1.7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(x, y - 15, 8, 2.4, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 6, y - 14, 1.3, 12);
}
// A stone: a lumpy rock with a lit face and a dark side, the same shape every time.
function stone(ctx, x, y, r = 6) {
  const lumps = Array.from({length: 9}, (_, i) => r * (.82 + .3 * grain(i * 5 + Math.round(r * 3))));
  const path = () => { ctx.beginPath(); lumps.forEach((rr, i) => { const a = i / 9 * Math.PI * 2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr * .92); }); ctx.closePath(); };
  const g = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r * 1.2); g.addColorStop(0, '#f1ede2'); g.addColorStop(.5, '#a39e92'); g.addColorStop(1, '#3f3b34');
  path(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(x - r * .75, y - r * .1); ctx.lineTo(x - r * .2, y - r * .8); ctx.lineTo(x + r * .3, y - r * .5); ctx.lineTo(x - r * .3, y - r * .1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(x + r * .1, y + r * .1); ctx.lineTo(x + r * .8, y - r * .1); ctx.lineTo(x + r * .5, y + r * .7); ctx.lineTo(x - r * .1, y + r * .6); ctx.closePath(); ctx.fill();
}
// The water a bucket lets go: a sheet that stretches and thins, then breaks up into droplets as the seconds pass.
function waterFall(ctx, x, y, t) {
  const spread = Math.min(1, t / 1.1), sheet = 1 - spread;
  if (sheet > .04) {
    const g = ctx.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, `rgba(190,232,255,${(.85 * sheet).toFixed(2)})`); g.addColorStop(1, `rgba(60,150,215,${(.7 * sheet).toFixed(2)})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 4 + 6 * sheet, 5 + 9 * sheet, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4 + 1, reach = spread * (3 + 10 * grain(i + 30)), dx = Math.cos(a) * reach, dy = Math.sin(a) * reach * 1.25, r = 1.3 + grain(i + 60) * 2.2;
    ctx.fillStyle = WATER_BLUE; ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x + dx - r * .3, y + dy - r * .35, r * .35, 0, Math.PI * 2); ctx.fill();
  }
}
// One helicopter with its bucket or stone on the cable, and its speed above it.
function kestrel(ctx, c, view, label = true) {
  const k = G.k;
  ctx.save(); if (c.dim) ctx.globalAlpha = .45;
  const [hx, hy] = bodyAt(c), [kx, ky] = bucketAt(c), stoneOn = c.loads.includes('stone'), waterOn = c.loads.includes('water');
  shadow(ctx, hx - 10 * k, WATER_Y + 12, 52 * k, Math.max(.12, .34 - c.h * .01));
  cable(ctx, hx, hy + 12 * k, kx, ky - (stoneOn && !waterOn ? 6 : 22) * k, {width: 1.6 * k});
  if (stoneOn && !waterOn) stone(ctx, kx, ky, 6 * k);
  else if (waterOn || c.carries === 'water') grow(ctx, kx, ky, () => bucket(ctx, kx, ky, waterOn));
  if (stoneOn && waterOn) stone(ctx, kx + 13 * k, ky - 4 * k, 5 * k);
  helicopter(ctx, hx, hy, c.v > .5 ? .08 : 0, view.time, HELI * k);
  if (label && c.speed) text(ctx, `${c.speed} m/s`, hx, hy - 40 * k, {size: 17, colour: COLOURS[c.colour] ?? theme.text});
  ctx.restore();
}
function path(ctx, kind, h, v, x0, upTo, colour, faint = false) {
  ctx.fillStyle = colour; ctx.globalAlpha = faint ? .35 : .8;
  for (let t = 0; t <= upTo; t += .06) { const p = dropPoint(kind, h, v, t); ctx.beginPath(); ctx.arc(bx(x0 + p.x), by(p.y), (faint ? 1.6 : 2.2) * G.k, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drops(ctx, view) {
  view.ghosts.forEach((g, i) => {
    const end = landing(g.kind, g.h, g.v);
    path(ctx, g.kind, g.h, g.v, g.x0, end.seconds, theme.text, true);
    text(ctx, `${g.label}: ${metres(end.distanceM)}`, bx(g.x0 + end.distanceM), WATER_Y - 84 * G.k - i * 22, {size: 16, weight: 600, colour: 'rgba(245,240,220,.7)'});
  });
  for (const d of view.drops) {
    const colour = d.kind === 'stone' ? STONE : view.drops.length > 1 && view.helis.length > 1 ? COLOURS[d.colour] : WATER_BLUE;
    path(ctx, d.kind, d.h, d.v, d.x0, d.t, colour);
    if (d.landed) continue;
    const p = dropPoint(d.kind, d.h, d.v, d.t), x = bx(d.x0 + p.x), y = by(p.y);
    if (d.kind === 'stone') stone(ctx, x, y, 6 * G.k); else grow(ctx, x, y, () => waterFall(ctx, x, y, d.t));
    if (view.arrows) speedArrows(ctx, d, x, y, view.drops.length > 1);
  }
}
// The two speeds of a falling thing: the forward arrow and the downward arrow, drawn to the same scale.
const arrow = (ctx, x, y, dx, dy, colour) => forceArrowTo(ctx, x, y, x + dx, y + dy, colour, 4 * G.k);
function speedArrows(ctx, d, x, y, two) {
  const {forward, down} = dropSpeed(d.kind, d.h, d.v, d.t), name = d.kind === 'stone' ? '' : 'water ', low = two && d.kind === 'water', scale = G.metre / 3;
  arrow(ctx, x, y, forward * scale, 0, FORWARD_COLOUR);
  arrow(ctx, x, y, 0, down * scale, DOWN_COLOUR);
  // With a stone and water together, the water's numbers go to its left, behind the stone.
  if (low) {
    if (forward > .05) text(ctx, `water ${forward.toFixed(1)} m/s forward`, x - 14, y - 14, {size: 16, align: 'right', colour: FORWARD_COLOUR});
    if (down > .05) text(ctx, `water ${down.toFixed(1)} m/s down`, x - 14, y + 14, {size: 16, align: 'right', colour: DOWN_COLOUR});
    return;
  }
  if (forward > .05) text(ctx, `${name}${forward.toFixed(1)} m/s forward`, x + Math.max(16, forward * scale + 10), y - 14, {size: 16, align: 'left', colour: FORWARD_COLOUR});
  if (down > .05) text(ctx, `${name}${down.toFixed(1)} m/s down`, x + 12, Math.min(y + Math.max(18, down * scale - 6), size.height - 12), {size: 16, align: 'left', colour: DOWN_COLOUR});
}
// Along the top of the picture, a mark for each second of the fall: how far forward the object has come by then,
// and, on a fall, a line down to where it was at that moment and how far it had fallen.
function secondsScale(ctx, view) {
  const s = view.scale;
  if (!s) return;
  const whole = Math.min(Math.floor(s.t + 1e-6), s.end != null ? Math.floor(s.end) : s.upTo), last = s.end != null ? Math.min(s.t, s.end) : Math.min(s.t, s.upTo);
  const from = bx(s.x0), to = bx(s.x0 + s.v * last);
  ctx.strokeStyle = FORWARD_COLOUR; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(from, SCALE_Y); ctx.lineTo(Math.max(from, to), SCALE_Y); ctx.stroke();
  const tick = (x, label) => { ctx.strokeStyle = FORWARD_COLOUR; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, SCALE_Y - 9); ctx.lineTo(x, SCALE_Y + 9); ctx.stroke(); text(ctx, label, x, SCALE_Y - 24, {size: 18, colour: FORWARD_COLOUR}); };
  tick(from, '0 s');
  for (let k = 1; k <= whole; k++) {
    const x = bx(s.x0 + s.v * k);
    tick(x, `${k} s`);
    text(ctx, `${s.v} m`, (x + bx(s.x0 + s.v * (k - 1))) / 2, SCALE_Y + 20, {size: 16, weight: 600, colour: FORWARD_COLOUR});
    if (s.dots) secondDot(ctx, x, s.h, k);
  }
  if (s.end != null && s.t >= s.end) {
    const x = bx(s.x0 + s.v * s.end);
    tick(x, `${s.end.toFixed(1)} s`);
    ctx.strokeStyle = 'rgba(237,197,87,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x, SCALE_Y + 10); ctx.lineTo(x, WATER_Y - 8); ctx.stroke(); ctx.setLineDash([]);
  }
}
function secondDot(ctx, x, h, k) {
  const fell = stoneFallAfter(k), y = by(h - fell), r = 5 * G.k;
  ctx.strokeStyle = 'rgba(237,197,87,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x, SCALE_Y + 10); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = theme.text; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .3, 0, Math.PI * 2); ctx.fill();
  text(ctx, `${fell.toFixed(1)} m fallen`, x - 12, y + 4, {size: 16, align: 'right', colour: DOWN_COLOUR});
}
function marks(ctx, view) {
  view.marks.forEach((k, i) => {
    const x = bx(k.x), tone = k.kind === 'stone' ? STONE : WATER_BLUE, s = G.k;
    grow(ctx, x, WATER_Y, () => {
      if (k.age < .8) {
        ctx.strokeStyle = tone; ctx.lineWidth = 2.5; ctx.globalAlpha = 1 - k.age / .8;
        ctx.beginPath(); ctx.ellipse(x, WATER_Y, 6 + k.age * 40, 3 + k.age * 8, 0, 0, Math.PI * 2); ctx.stroke();
        // The splash: a crown of droplets thrown up and falling back.
        ctx.fillStyle = 'rgba(225,244,252,.9)';
        for (let n = 0; n < 12; n++) {
          const a = Math.PI * (.12 + .76 * n / 11), speed = 38 + 34 * grain(n + 90), px = x + Math.cos(a) * speed * k.age, py = WATER_Y - Math.sin(a) * speed * 1.5 * k.age + 150 * k.age * k.age;
          ctx.beginPath(); ctx.arc(px, py, 1.4 + 1.4 * grain(n + 120), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = tone; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(235,246,250,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1, 10, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(245,240,220,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, WATER_Y - 4); ctx.lineTo(x, WATER_Y - 22 - (i % 2) * 22); ctx.stroke();
    });
    const colour = view.helis.length > 1 && view.drops.length > 1 ? COLOURS[k.colour] : k.kind === 'stone' ? STONE : WATER_BLUE;
    text(ctx, k.label, x, WATER_Y - (30 + (i % 2) * 22) * s - 4, {size: 18, colour});
  });
}
const beforeBuoy = b => b > 0 ? `released ${b} m before` : b < 0 ? `released ${-b} m after` : 'released above the buoy';
function letGoMark(ctx, x, label, colour = theme.accent, dy = 52) {
  const cx = bx(x);
  ctx.strokeStyle = colour; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(cx, by(HIGH_M) + 6); ctx.lineTo(cx, WATER_Y - 4); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, label, cx, by(HIGH_M) + dy, {size: 16, colour, weight: 600});
}
function height(ctx, h, x) {
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, WATER_Y); ctx.lineTo(x, by(h)); ctx.moveTo(x - 5, by(h)); ctx.lineTo(x + 5, by(h)); ctx.stroke();
  plate(ctx, x + 8 + 38, (WATER_Y + by(h)) / 2, 84, 24);
  text(ctx, `${h} m up`, x + 8, (WATER_Y + by(h)) / 2, {size: 16, weight: 600, colour: 'rgba(227,220,203,.7)', align: 'left'});
}
// The gravity marks: how far the stone has fallen, and how fast it is falling, after each second.
function fallMarks(ctx, view) {
  const d = view.drops[0];
  if (!d) return;
  for (const s of [1, 2]) {
    if (d.t < s) continue;
    const y = by(d.h - stoneFallAfter(s));
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(G.post - 20, y); ctx.lineTo(G.post + 90, y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `after ${s} s: ${stoneFallAfter(s).toFixed(1)} m fallen, moving at ${(GRAVITY * s).toFixed(1)} m/s`, G.post + 98, y, {size: 18, align: 'left', colour: theme.accent});
  }
}
function underHelicopter(ctx, view) {
  const c = view.helis[0], d = view.drops[0];
  if (!c || !d || d.landed) return;
  const p = dropPoint(d.kind, d.h, d.v, d.t), x = bx(d.x0 + p.x);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(bx(c.x), by(c.h) + 4); ctx.lineTo(x, by(p.y) - 8); ctx.stroke(); ctx.setLineDash([]);
}
// A key cap: the letter is 16 units tall, so that it reads on the wide board.
function cap(ctx, x, y, key) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 13, y - 12, 26, 24, 4); ctx.fill();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 16px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x, y + 1);
}
// The board's Space cap, wide enough for its word.
function spaceCap(ctx, x, y) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 30, y - 12, 60, 24, 3); ctx.fill();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 15px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Space', x, y + 1);
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
  if (view.letGo != null) letGoMark(ctx, view.letGo, view.ruler === 'buoy' ? beforeBuoy(Math.round(view.buoy - view.letGo)) : view.ghostLetGo != null ? 'at 20 m/s' : 'released here');
  if (view.flag != null) flag(ctx, view.flag, view.glow === 'flag', view.time);
  if (view.helis.length && view.helis.every(c => !c.set)) [...new Set(view.helis.map(c => c.h))].forEach((h, i) => height(ctx, h, G.post + 44 + i * 96));
  drops(ctx, view);
  marks(ctx, view);
  secondsScale(ctx, view);
  if (view.fallMarks) fallMarks(ctx, view);
  if (view.underHelicopter) underHelicopter(ctx, view);
  for (const c of view.helis) { const hx = bx(c.x); if (hx > -80 && hx < size.width + 80) kestrel(ctx, c, view); }
  if (view.glow === 'drop' || view.glow === 'drop:best') { const at = targetPoint(view, view.glow); if (at) halo(ctx, ...at, 26 * G.k, view.time); }
  if (view.keys.Space && view.helis[0]) { const [kx, ky] = bucketAt(view.helis[0]); spaceCap(ctx, kx + 50 * G.k, ky - 6); }
  if (view.dragFlag) { cap(ctx, bx(view.flag) - 26, WATER_Y + 40, '←'); cap(ctx, bx(view.flag) + 26, WATER_Y + 40, '→'); }
}

// ---- the page under the board: the clock and the tables of results ----
// The board draws none of these. The classroom page (classroom-ui.js) shows what strip() returns, in HTML.
export function strip(view) {
  if (view.scene !== 'lake') return null;
  const out = {readouts: [], parts: [], tables: [], hint: null};
  if (view.clock) {
    const d = view.drops.find(x => !x.landed) ?? view.drops.at(-1);
    if (d) out.readouts.push({label: '', value: `${Math.min(d.t, landing(d.kind, d.h, d.v).seconds).toFixed(1)} s since the release`, tone: null});
  }
  if (view.table) out.tables.push({title: '', rows: view.table.map(row => ({label: row.label, value: row.value ?? '…', tone: row.value ? 'good' : 'faint'}))});
  return out.readouts.length || out.tables.length ? out : null;
}

function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (size.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 340); ctx.clip();
    miniScene(ctx, idea.id, x + 10, 100, w - 20, 320, view.time);
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 460, w - 30, {size: 19, weight: 600});
  });
}
// A small side view for the recap and the cards: a helicopter, falls drawn as dotted arcs, a buoy.
function miniScene(ctx, kind, x, y, w, h, time) {
  const water = y + h - 20, s = Math.min(w / 260, h / 200);
  const sea = ctx.createLinearGradient(0, water, 0, water + 20); sea.addColorStop(0, '#4a7381'); sea.addColorStop(1, '#16282f');
  ctx.fillStyle = sea; ctx.fillRect(x, water, w, 20); ctx.fillStyle = 'rgba(236,246,250,.5)'; ctx.fillRect(x, water - .5, w, 1.4);
  const arc = (fromX, fromY, toX, colour) => {
    ctx.fillStyle = colour;
    for (let i = 0; i <= 16; i++) { const f = i / 16; ctx.beginPath(); ctx.arc(fromX + (toX - fromX) * (1 - (1 - f) ** 2), fromY + (water - fromY) * f * f, 2.2, 0, Math.PI * 2); ctx.fill(); }
  };
  const mini = (hx, hy) => helicopter(ctx, hx, hy, .08, time, .3 * s);
  const buoyAt = bxp => { ctx.fillStyle = '#e8613f'; ctx.beginPath(); ctx.arc(bxp, water, 8 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fffaf0'; ctx.fillRect(bxp - 7.5 * s, water - 4 * s, 15 * s, 2.2 * s); };
  if (kind === 'keep') {
    const hx = x + w * .62, hy = y + h * .25;
    mini(hx, hy);
    ctx.strokeStyle = theme.faint; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(hx, hy + 14); ctx.lineTo(hx, water); ctx.stroke(); ctx.setLineDash([]);
    arc(x + w * .15, hy + 14, hx, STONE);
    stone(ctx, hx, y + h * .62, 6);
    text(ctx, 'released here', x + w * .15, hy - 4, {size: 15, colour: theme.faint});
  }
  if (kind === 'faster') {
    const sx = x + w * .24, sy = y + h * .2;
    mini(sx, sy - 14);
    arc(sx, sy, x + w * .45, WATER_BLUE); arc(sx, sy, x + w * .85, STONE);
    text(ctx, 'water', x + w * .45, water - 14, {size: 15, colour: WATER_BLUE}); text(ctx, 'stone', x + w * .85, water - 14, {size: 15, colour: STONE});
  }
  if (kind === 'early') {
    const bxp = x + w * .78, sx = x + w * .38, sy = y + h * .25;
    buoyAt(bxp); mini(sx, sy - 14); arc(sx, sy, bxp, WATER_BLUE);
    text(ctx, 'start pouring here', sx, sy - 44, {size: 15, colour: theme.accent});
  }
}

export function drawBoard(ctx, view, width, height) {
  G = geometry(view);
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx, size.width); drawRecap(ctx, view); }
    else drawLake(ctx, view);
  }, size);
}

// ---- the card pictures ----
// Each picture is a small view of the lake board: the dusk sky and the lake, Kestrel One with its bucket on the cable, the
// buoy, and the path of the fall in dots.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const water = h - 22;
  cardScene(ctx, w, h, {outdoors: true, floorAt: water});
  ctx.save(); ctx.beginPath(); ctx.rect(0, water, w, h - water); ctx.clip(); waterBody(ctx, water, .5); ctx.restore();
  const arc = (fromX, fromY, toX, colour = WATER_BLUE) => {
    ctx.fillStyle = colour;
    for (let i = 0; i <= 14; i++) { const f = i / 14; ctx.beginPath(); ctx.arc(fromX + (toX - fromX) * (1 - (1 - f) ** 2), fromY + (water - fromY) * f * f, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = colour; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(toX, water + 2, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
  };
  // Kestrel One with the pail hanging from its hook.
  const mini = (x, y, pail = true) => {
    if (pail) { cable(ctx, x, y + 4, x, y + 10, {width: 1.4}); ctx.save(); ctx.translate(x, y + 24); ctx.scale(.7, .7); bucket(ctx, 0, 0, true); ctx.restore(); }
    helicopter(ctx, x, y, .08, .3, .26);
  };
  // A small buoy: a red dome with a white band, a mast and a lit lamp, on the water line.
  const buoyAt = x => {
    const dome = ctx.createLinearGradient(x - 8, 0, x + 8, 0); dome.addColorStop(0, '#ffa27c'); dome.addColorStop(.4, '#e8613f'); dome.addColorStop(1, '#7d2614');
    ctx.strokeStyle = '#2c353a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, water - 8); ctx.lineTo(x, water - 18); ctx.stroke();
    ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x, water - 19, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dome; ctx.beginPath(); ctx.arc(x, water, 8, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - 7.5, water - 4, 15, 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, water, 8, Math.PI, 0); ctx.stroke();
  };
  if (picture.kind === 'landing') {
    const b = w * .45; buoyAt(b); mini(b, 24);
    arc(b, 52, b + {short: -40, on: 0, past: 62}[picture.where]);
  }
  if (picture.kind === 'release') {
    const b = w * .82, from = {further: w * .18, same: w * .42, closer: w * .62}[picture.where];
    buoyAt(b); mini(from, 30); arc(from, 56, from + (b - from) * (picture.where === 'further' ? 1 : .8 + (picture.where === 'closer' ? .5 : 0)));
    text(ctx, '20 m/s', from, 8, {size: 12, colour: theme.accent});
  }
  if (picture.kind === 'height') {
    mini(w * .16, 20, false); mini(w * .16, 54, false);
    const low = w * .52, high = {further: w * .9, same: w * .58, shorter: w * .36}[picture.move];
    arc(w * .16, 66, low, theme.accent); arc(w * .16, 32, high, theme.good);
  }
  if (picture.kind === 'game') {
    const b = w * .62;
    buoyAt(b);
    if (picture.what === 'over') { mini(b, 24); arc(b, 52, b + 60); }
    if (picture.what === 'before') { mini(w * .28, 24); arc(w * .28, 52, b); }
    if (picture.what === 'after') { mini(b + 34, 24); arc(b + 34, 52, b + 80); }
  }
}
