// The Fuel lesson's board (docs/board/cards/LAB-CLASSROOM-FUEL.md): the car's see-through tank on a platform scale
// with a litres gauge, the pump nozzle that pours in and the tap that pours out into a jerry can, a drag strip of cars
// timed to the lesson's speed with a photo finish, force and speed arrows and each car's sum, a graph of the speed, the
// litre jug and its box, the free test's car, and the job card for Brian's job. Draws and hit-tests only.
// It is a wide board (docs/board/cards/LAB-LOOK.md, round 11): the stopwatches and the table of tests are in the strip under
// the board, and no text on it is smaller than 15 board units.
import {BOARD, theme, background, floor, cardScene, shadow, forceArrowTo, roadCar, tarmac, paintStripe, steel, bolt, lcd, shade, text, wrap, fitBoard} from '../classroom/board-art.js';
import {HALF, WEIGH_KG, TARGET_TEXT, TARGET_KMH, TARGET_MS, kg1, kg2, s2, pct, pctAbout, gapWords} from './fuel-classroom.js';
import {TANK_LITRES, POUR_LITRES, PETROL_KG_PER_LITRE, WATER_KG_PER_LITRE, GRAND_PRIX} from '../benches/fuel.js';
export {BOARD};
export const size = Object.freeze({width: 1320, height: 680});
export const pressMovesDrag = false;
const W = size.width;

const PETROL = '#e0a63a', WATER = '#5a9fd6', CAR = '#c8402f', GREEN = '#9ff0b4';
// The theme's faint colour is for lines; a caption the player has to read uses this.
const DIM = 'rgba(227,220,203,.72)';
const n0 = value => value.toLocaleString('en-GB', {maximumFractionDigits: 0}), n1 = value => value.toLocaleString('en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 2});
// The shared key cap writes its key at 13; the wide board draws its own at 15.
function keyCap(ctx, x, y, key) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 12, y - 12, 24, 24, 3); ctx.fill();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 15px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x, y + 1);
}

// ---- where things stand on the wide board ----
// A layout drawn for the usual 1000 x 680 board, scaled by s about its own point (ox, oy), which lands on (cx, cy) of the wide board.
const place = (s, ox, oy, cx, cy) => Object.freeze({s, ox, oy, cx, cy});
const inPlace = (p, ctx, draw) => { ctx.save(); ctx.translate(p.cx, p.cy); ctx.scale(p.s, p.s); ctx.translate(-p.ox, -p.oy); draw(); ctx.restore(); };
const toLocal = (p, x, y) => p ? [p.ox + (x - p.cx) / p.s, p.oy + (y - p.cy) / p.s] : [x, y];
const toBoard = (p, [x, y]) => p ? [p.cx + (x - p.ox) * p.s, p.cy + (y - p.oy) * p.s] : [x, y];
// The litre step, the jugs and the Tune page's card stand in the middle, larger than on the usual board.
const LITRE = place(1.25, 535, 315, W / 2, 340), JUGS_AT = place(1.5, 490, 434, W / 2, 340), CHECK_JUGS = place(1.5, 500, 434, W / 2, 340), TUNE = place(1.5, 500, 275, W / 2, 340);
const groupOf = view => view.jug ? LITRE : view.jugs ? JUGS_AT : null;
const floorAt = (p, y) => p.cy + (y - p.oy) * p.s;
// The tank, its scale, the nozzle, the tap, the jerry can and the free test's car box: beside the road, or on their own in the
// middle (the word step), or left of the card in the weighing try.
const SIDE = place(1.15, 30, 56, 36, 30), SIDE_FREE = place(1.05, 30, 56, 40, 34), MIDDLE = place(1.25, 230, 309, W / 2, 340), WEIGH = place(1.2, 230, 309, 400, 340);
function clusterOf(view) {
  if (!view.tank) return null;
  if (view.covered) return WEIGH;
  return view.lanes.length || view.job || view.keys.Space === 'go' ? view.free ? SIDE_FREE : SIDE : MIDDLE;
}
// The tank and its scale, in the cluster's own units.
const TANK = Object.freeze({x: 95, y: 190, w: 170, h: 240});
const NOZZLE = Object.freeze([180, 150]), TAP = Object.freeze([300, 418]), CAN = Object.freeze({x: 318, y: 470, w: 80, h: 92});
const JUGS = Object.freeze({water: [300, 400], petrol: [700, 400]});
const ON_SCALE = Object.freeze([500, 400]);
const SCALE = Object.freeze([180, 505]);
// The free test's car panel, under the tank and the jerry can.
const CAR_BOX = Object.freeze({x: 30, y: 572, w: 400, h: 94, prev: [116, 640], next: [344, 640]});
const inButton = (x, y, [cx, cy]) => Math.abs(x - cx) < 80 && Math.abs(y - cy) < 18;
const inBox = (x, y, [cx, cy], r) => Math.hypot(x - cx, y - cy) < r;
const shop = view => view.scene === 'shop';

// The drag strip: 50 m across. Beside the tank it takes the right of the board; on its own it takes the whole width, 40 clear at each end.
export const STRIP = Object.freeze({metres: 50});
// top: the first lane's middle; gap: lane to lane; cs: the cars' scale. A lone lane has a road as tall as `gap`.
const ROADS = Object.freeze({
  beside: [null, {top: 372, gap: 250, cs: 2}, {top: 215, gap: 170, cs: 1.45}, {top: 148, gap: 118, cs: 1.2}],
  across: [null, {top: 168, gap: 150, cs: 1.5}, {top: 200, gap: 200, cs: 1.9}, {top: 200, gap: 200, cs: 1.9}],
});
function roadOf(view, lanes = view.lanes.length) {
  const beside = Boolean(view.tank || view.job), n = Math.min(3, Math.max(1, lanes));
  const rect = beside ? {x: 530, w: 750} : {x: 40, w: 1240}, g = ROADS[beside ? 'beside' : 'across'][n];
  // Room behind the start line for the force arrow behind the car.
  return {...rect, ...g, n, lead: 136 * g.cs + 18};
}
const laneY = (r, i) => r.top + i * r.gap;
const roadTop = r => r.top - r.gap / 2, roadBottom = r => laneY(r, r.n - 1) + r.gap / 2 - 4;
const stripX = (r, metres) => r.x + r.lead + metres / STRIP.metres * (r.w - r.lead - 20);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!shop(view)) return null;
  const [cx, cy] = toLocal(clusterOf(view), x, y), [gx, gy] = toLocal(groupOf(view), x, y);
  if (view.tank && view.keys['↑'] && inBox(cx, cy, NOZZLE, 48)) return {action: view.keys['↑']};
  if (view.tank && view.keys['↓'] && inBox(cx, cy, TAP, 40)) return {action: view.keys['↓']};
  if (view.free && view.keys['→'] && inButton(cx, cy, CAR_BOX.next)) return {action: 'car:next'};
  if (view.free && view.keys['←'] && inButton(cx, cy, CAR_BOX.prev)) return {action: 'car:prev'};
  if (view.keys.Space === 'fill' && view.jug && gx > 530 && gx < 670 && gy > 270 && gy < 470) return {action: 'fill'};
  if (view.keys.Space === 'go' && goArea(view, x, y)) return {action: 'go'};
  if (view.jugs && view.keys['1']) for (const [what, key] of [['water', '1'], ['petrol', '2']]) if (onJug(view, what, gx, gy)) return {action: view.keys[key]};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!shop(view)) return null;
  const [cx, cy] = toLocal(clusterOf(view), x, y), [gx, gy] = toLocal(groupOf(view), x, y);
  if (view.tank) {
    if (inBox(cx, cy, NOZZLE, 48)) return 'The pump nozzle pours petrol into the tank, 5 litres at a time.';
    if (inBox(cx, cy, TAP, 40)) return 'The tap lets petrol out into the jerry can, 5 litres at a time.';
    if (cx > CAN.x && cx < CAN.x + CAN.w && cy > CAN.y && cy < CAN.y + CAN.h) return 'The jerry can holds the petrol you poured out. It is off the scale, so its mass does not count.';
    if (cx > TANK.x && cx < TANK.x + TANK.w && cy > TANK.y && cy < TANK.y + TANK.h) return view.covered ? 'The gauge is covered, so read the scale.' : `The car’s tank holds ${Math.round(view.litres)} of ${TANK_LITRES} litres.`;
    if (view.scale && cx > 70 && cx < 290 && cy > 430 && cy < 545) return `The scale reads the mass of the petrol in the tank, which is ${kg1(view.kg)} now.`;
    if (view.free && cx > CAR_BOX.x && cx < CAR_BOX.x + CAR_BOX.w && cy > CAR_BOX.y) return 'Press ← or → to choose a different car for this test.';
  }
  if (view.jug && gx > 530 && gx < 670 && gy > 270 && gy < 470) return 'This jug has a line that shows one litre.';
  if (view.jugs) for (const what of ['water', 'petrol']) if (onJug(view, what, gx, gy)) return `One litre of ${what}.`;
  const r = roadOf(view);
  if (view.job && x > JOB.x && x < JOB.x + JOB.w && y > JOB.y && y < JOB.y + JOB.h) return 'The race card shows how far this race goes and how far your petrol lasts.';
  for (const [i, l] of view.lanes.entries()) if (y > laneY(r, i) - r.gap / 2 && y < laneY(r, i) + r.gap / 2 && x > r.x && x < r.x + r.w)
    return `This ${l.carName} carries ${l.litres} litres of petrol, which is ${kg1(l.kg)}, and is timed from a standstill to ${TARGET_TEXT}.`;
  return null;
}
export function targetPoint(view, action) {
  if (!shop(view)) return null;
  const cluster = clusterOf(view), r = roadOf(view);
  if (action === 'pour:in' || action === 'pour:best' && view.best > view.litres) return toBoard(cluster, [NOZZLE[0], NOZZLE[1] - 6]);
  if (action === 'pour:out' || action === 'pour:best') return toBoard(cluster, TAP);
  if (action === 'go') return view.covered ? toBoard(cluster, SCALE) : view.job ? [JOB.x + 80, TRACK.y] : [stripX(roadOf(view, view.lanes.length || 2), 0) - 40, laneY(roadOf(view, view.lanes.length || 2), 0)];
  if (action === 'fill') return toBoard(LITRE, [600, 360]);
  if (action === 'weigh:best' && view.bestJug) return toBoard(JUGS_AT, jugAt(view, view.bestJug));
  // Sparks fly from the winning car, the jug or the tank.
  const winner = view.lanes.findIndex(l => l.winner);
  if (winner >= 0) return [stripX(r, view.lanes[winner].metres) - 40, laneY(r, winner)];
  if (view.jug) return toBoard(LITRE, [600, 320]);
  if (view.jugs) return toBoard(JUGS_AT, ON_SCALE);
  if (view.tank) return toBoard(cluster, [TANK.x + TANK.w / 2, TANK.y + 40]);
  return [size.width / 2, size.height / 2];
}
// A point in the middle of lane i of the road, where hovering names the car.
export function lanePoint(view, i) { const r = roadOf(view); return [r.x + r.w / 2, laneY(r, i)]; }
export function dragAngle() { return 0; }
const jugAt = (view, what) => view.jugs?.on === what ? ON_SCALE : JUGS[what];
// A jug as it is drawn: 110 wide, standing on y 470, 150 tall (in the group's own units).
const onJug = (view, what, x, y) => Math.abs(x - jugAt(view, what)[0]) < 60 && y > 310 && y < 475;
// Space by mouse: the scale weighs (By weight), the job's race track or the strip's lanes race.
function goArea(view, x, y) {
  if (view.covered) { const [cx, cy] = toLocal(WEIGH, x, y); return cx > 70 && cx < 290 && cy > 440 && cy < 545; }
  if (view.job) return x > JOB.x && x < JOB.x + JOB.w && y > TRACK.y - 72 && y < TRACK.y + 68;
  const r = roadOf(view, view.lanes.length || (view.graph ? 1 : 2));
  return x > r.x && x < r.x + r.w && y > roadTop(r) - 4 && y < roadBottom(r) + 4;
}

// ---- pieces ----
function glowBox(ctx, view, x, y, w, h) {
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke(); ctx.globalAlpha = 1;
}
// A platform scale: a steel platform on a housing with four feet, and a lit window for the reading.
function scaleBody(ctx, cx, top, w, reading, on = true) {
  shadow(ctx, cx, top + 104, w * .56, .6);
  const house = ctx.createLinearGradient(0, top + 16, 0, top + 100); house.addColorStop(0, '#3d474e'); house.addColorStop(1, '#14181a');
  ctx.fillStyle = house; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 12, top + 16, w - 24, 84, 6); ctx.fill();
  ctx.fillStyle = '#0b0d0e'; for (const fx of [cx - w / 2 + 18, cx + w / 2 - 36]) ctx.fillRect(fx, top + 99, 18, 5);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(cx - w / 2 + 14, top + 18, w - 28, 1.5);
  steel(ctx, cx - w / 2, top, w, 16, 3);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let tx = cx - w / 2 + 14; tx < cx + w / 2 - 10; tx += 12) { ctx.beginPath(); ctx.moveTo(tx, top + 11); ctx.lineTo(tx + 5, top + 4); ctx.lineTo(tx + 7, top + 4); ctx.lineTo(tx + 2, top + 11); ctx.closePath(); ctx.fill(); }
  for (const bx of [cx - w / 2 + 6, cx + w / 2 - 6]) bolt(ctx, bx, top + 8, 2);
  if (!on) return;
  lcd(ctx, cx - 74, top + 32, 148, 50);
  text(ctx, reading, cx, top + 58, {size: 30, colour: '#9ff0b4', weight: 800});
}
// The tank, the nozzle, the tap and the can, in the cluster's own units; the caller places them.
function tank(ctx, view, hose) {
  const {x, y, w, h} = TANK, k = Math.max(0, Math.min(1, view.level / TANK_LITRES));
  // The stand or the scale under it.
  scaleBody(ctx, x + w / 2, y + h + 10, 230, kg1(view.kg), view.scale);
  if (view.scale) text(ctx, 'SCALE', x + w / 2, y + h + 118, {size: 15, colour: DIM, weight: 800});
  // Glass, petrol (with its surface and the meniscus where it climbs the glass) and the steel frame.
  const pane = ctx.createLinearGradient(x, 0, x + w, 0); pane.addColorStop(0, 'rgba(200,222,232,.16)'); pane.addColorStop(.5, 'rgba(200,222,232,.05)'); pane.addColorStop(1, 'rgba(200,222,232,.13)');
  ctx.fillStyle = pane; ctx.fillRect(x, y, w, h);
  const sy = y + h * (1 - k);
  if (k > 0) {
    const g = ctx.createLinearGradient(0, sy, 0, y + h); g.addColorStop(0, '#f6c85e'); g.addColorStop(.35, '#d99a2a'); g.addColorStop(1, '#8a5712');
    ctx.fillStyle = g; ctx.globalAlpha = .9; ctx.fillRect(x + 3, sy, w - 6, h * k); ctx.globalAlpha = 1;
    const tint = ctx.createLinearGradient(0, sy, 0, sy + 22); tint.addColorStop(0, 'rgba(255,240,180,.35)'); tint.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = tint; ctx.fillRect(x + 3, sy, w - 6, Math.min(22, h * k));
    ctx.strokeStyle = 'rgba(255,246,210,.95)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x + 3, sy - 4); ctx.quadraticCurveTo(x + 9, sy + 1, x + 17, sy + 1); ctx.lineTo(x + w - 17, sy + 1); ctx.quadraticCurveTo(x + w - 9, sy + 1, x + w - 3, sy - 4); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x + 12, y + 8, 7, h - 16); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x + w - 22, y + 8, 4, h - 16);
  steel(ctx, x - 3, y - 3, w + 6, 6, 2); steel(ctx, x - 3, y + h - 3, w + 6, 6, 2); steel(ctx, x - 3, y, 6, h, 2); steel(ctx, x + w - 3, y, 6, h, 2);
  for (const [bx, by] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) bolt(ctx, bx, by, 2.4);
  steel(ctx, x + w / 2 - 22, y - 12, 44, 14, 3); bolt(ctx, x + w / 2 - 14, y - 5, 1.6); bolt(ctx, x + w / 2 + 14, y - 5, 1.6);
  // The gauge: a mark every 10 litres, the half line when the step asks for it.
  for (let l = 0; l <= TANK_LITRES; l += 10) {
    const ty = y + h * (1 - l / TANK_LITRES);
    ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, ty); ctx.lineTo(x, ty); ctx.stroke();
    text(ctx, String(l), x - 18, ty, {size: 15, align: 'right', colour: theme.text});
  }
  text(ctx, 'litres', x - 18, y - 22, {size: 15, align: 'right', colour: DIM});
  if (view.half) {
    const hy = y + h / 2;
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(x - 4, hy); ctx.lineTo(x + w + 4, hy); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `half, ${HALF} litres`, x + w + 10, hy, {size: 15, align: 'left', colour: theme.accent, weight: 800});
  }
  if (!view.covered) text(ctx, `${Math.round(view.litres)} litres`, x + w / 2, y + 26, {size: 24, colour: theme.text, weight: 800});
  // A cloth over the tank when the step asks for the scale alone.
  if (view.covered) {
    ctx.fillStyle = '#6b5236'; ctx.beginPath(); ctx.moveTo(x - 62, y - 34); ctx.lineTo(x + w + 10, y - 34); ctx.lineTo(x + w + 16, y + h + 6); ctx.quadraticCurveTo(x + w / 2, y + h, x - 66, y + h + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 20 + i * 40, y - 14); ctx.lineTo(x - 26 + i * 42, y + h); ctx.stroke(); }
    text(ctx, 'The gauge is covered,', x + w / 2 - 8, y + h / 2 - 14, {size: 17}); text(ctx, 'so read the scale.', x + w / 2 - 8, y + h / 2 + 12, {size: 17});
  }
  nozzle(ctx, view, hose); tap(ctx, view); jerryCan(ctx, CAN, view.can / TANK_LITRES);
}
// A pump nozzle side on: the hose, a green grip with its lever, and the spout pointing down; (tx, ty) is the spout's tip, and the hose
// comes from `from`.
function pumpNozzle(ctx, tx, ty, from = [tx - 150, ty - 120]) {
  // The hose, ribbed and lit along its top, then the green rubber grip with its trigger, then the steel spout.
  const hose = () => { ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.bezierCurveTo(tx - 110, ty - 140, tx - 80, ty - 60, tx - 52, ty - 46); ctx.stroke(); };
  ctx.lineCap = 'round'; ctx.strokeStyle = '#14181a'; ctx.lineWidth = 11; hose();
  ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 8; hose();
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.save(); ctx.translate(-2, -2); hose(); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 8; ctx.setLineDash([2, 6]); hose(); ctx.setLineDash([]); ctx.lineCap = 'butt';
  ctx.save(); ctx.translate(tx, ty);
  const grip = ctx.createLinearGradient(0, -52, 0, -26); grip.addColorStop(0, '#4c9a69'); grip.addColorStop(.5, '#2f6b45'); grip.addColorStop(1, '#15301f');
  ctx.fillStyle = grip; ctx.beginPath(); ctx.moveTo(-56, -52); ctx.lineTo(-12, -44); ctx.lineTo(-8, -26); ctx.lineTo(-50, -32); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-54, -50); ctx.lineTo(-13, -42.5); ctx.stroke();
  ctx.strokeStyle = '#aab3b8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-46, -28); ctx.quadraticCurveTo(-34, -12, -16, -22); ctx.stroke();
  const spout = ctx.createLinearGradient(-12, 0, 4, 0); spout.addColorStop(0, '#e1e7ea'); spout.addColorStop(.5, '#9aa4a9'); spout.addColorStop(1, '#4a5257');
  ctx.fillStyle = spout; ctx.beginPath(); ctx.moveTo(-12, -42); ctx.lineTo(4, -38); ctx.lineTo(4, 0); ctx.lineTo(-3, 0); ctx.lineTo(-3, -30); ctx.lineTo(-10, -30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.restore();
}
// A falling stream of petrol, lit down one side, that splashes where it lands.
function stream(ctx, x, top, length) {
  if (length < 1) return;
  const g = ctx.createLinearGradient(x, 0, x + 5, 0); g.addColorStop(0, '#f8d37a'); g.addColorStop(.5, '#d99a2a'); g.addColorStop(1, '#8a5712');
  ctx.fillStyle = g; ctx.fillRect(x, top, 5, length);
  ctx.fillStyle = 'rgba(255,248,214,.7)'; ctx.fillRect(x + .8, top, 1.2, length);
  const splash = ctx.createRadialGradient(x + 2.5, top + length, 1, x + 2.5, top + length, 11); splash.addColorStop(0, 'rgba(255,230,150,.6)'); splash.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = splash; ctx.beginPath(); ctx.ellipse(x + 2.5, top + length, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
}
function nozzle(ctx, view, hose) {
  const [nx, ny] = NOZZLE;
  pumpNozzle(ctx, nx, ny + 26, hose);
  if (view.keys['↑']) keyCap(ctx, nx - 66, ny - 30, '↑');
  // Petrol running while the level rises.
  if (view.level < view.litres - .2) stream(ctx, nx - 2, ny + 26, TANK.y + TANK.h * (1 - view.level / TANK_LITRES) - ny - 26);
  if (view.glow === 'nozzle' || view.glow === 'pour' && view.keys['↑']) glowBox(ctx, view, nx - 76, ny - 42, 96, 76);
}
function tap(ctx, view) {
  const [tx, ty] = TAP;
  steel(ctx, TANK.x + TANK.w, ty - 6, tx - TANK.x - TANK.w + 14, 12, 3);
  // The tap's red hand wheel, with its spokes, and the spout under the pipe.
  const wheel = ctx.createRadialGradient(tx - 8, ty - 13, 1, tx - 6, ty - 10, 10); wheel.addColorStop(0, '#e8705a'); wheel.addColorStop(1, '#7d261b');
  ctx.fillStyle = wheel; ctx.beginPath(); ctx.arc(tx - 6, ty - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let a = 0; a < 3; a++) { ctx.moveTo(tx - 6 + Math.cos(a * 1.047) * 8, ty - 10 + Math.sin(a * 1.047) * 8); ctx.lineTo(tx - 6 - Math.cos(a * 1.047) * 8, ty - 10 - Math.sin(a * 1.047) * 8); } ctx.stroke();
  steel(ctx, tx + 6, ty - 6, 8, 26, 2);
  if (view.keys['↓']) keyCap(ctx, tx + 34, ty - 18, '↓');
  if (view.level > view.litres + .2) stream(ctx, tx + 8, ty + 20, CAN.y - ty - 8);
  if (view.glow === 'pour' && view.keys['↓']) glowBox(ctx, view, tx - 22, ty - 26, 64, 56);
}
// A red steel jerry can of any size: a chamfered top, a handle slot, a spout with its cap, the pressed cross and a sight window
// that shows how full it is (k, from 0 to 1).
function jerryCan(ctx, {x, y, w, h}, k) {
  k = Math.max(0, Math.min(1, k));
  shadow(ctx, x + w / 2, y + h + 2, w * .7, .6);
  const body = ctx.createLinearGradient(x, 0, x + w, 0); body.addColorStop(0, '#c4463a'); body.addColorStop(.35, '#9c2f25'); body.addColorStop(1, '#4c1511');
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w - 6, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 6); ctx.lineTo(x + w, y + h - 6); ctx.quadraticCurveTo(x + w, y + h, x + w - 6, y + h); ctx.lineTo(x + 6, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - 6); ctx.lineTo(x, y + 14); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x + 16, y + 1, w - 26, 1.5);
  ctx.fillStyle = '#2a0d0b'; ctx.beginPath(); ctx.roundRect(x + 24, y + 7, 34, 9, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 10, y + 24); ctx.lineTo(x + w - 20, y + h - 10); ctx.moveTo(x + w - 20, y + 24); ctx.lineTo(x + 10, y + h - 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,190,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 11, y + 22.5); ctx.lineTo(x + w - 19, y + h - 11.5); ctx.moveTo(x + w - 19, y + 22.5); ctx.lineTo(x + 11, y + h - 11.5); ctx.stroke();
  steel(ctx, x + w - 26, y - 8, 14, 8, 2); steel(ctx, x + w - 30, y - 12, 22, 5, 2);
  // The sight window down the right side shows how much petrol is in the can.
  ctx.fillStyle = 'rgba(10,6,4,.7)'; ctx.beginPath(); ctx.roundRect(x + w - 14, y + 20, 9, h - 34, 3); ctx.fill();
  if (k > 0) { const lit = Math.max(1.5, (h - 38) * k); ctx.fillStyle = '#e8b04a'; ctx.fillRect(x + w - 13, y + h - 17 - lit, 7, lit); ctx.fillStyle = 'rgba(255,246,210,.8)'; ctx.fillRect(x + w - 13, y + h - 17 - lit, 7, 1.2); }
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + w - 14, y + 20, 9, h - 34, 3); ctx.stroke();
}
// The pump the nozzle's hose comes from, and two spare cans, which stand beside the tank when it has the middle of the board to itself.
const PUMP = Object.freeze({x: -230, y: 60, w: 120, h: 470, hose: [-118, 120]});
function pump(ctx) {
  const {x, y, w, h} = PUMP;
  shadow(ctx, x + w / 2, y + h + 6, w * .8, .6);
  const body = ctx.createLinearGradient(x, 0, x + w, 0); body.addColorStop(0, '#3c8a5c'); body.addColorStop(.3, '#2f6b45'); body.addColorStop(1, '#14301f');
  ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 8, y + 10, 5, h - 20);
  steel(ctx, x - 6, y - 8, w + 12, 14, 4); steel(ctx, x - 8, y + h - 8, w + 16, 14, 4);
  lcd(ctx, x + 16, y + 40, w - 32, 56); lcd(ctx, x + 16, y + 112, w - 32, 34, '#e0a63a');
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.roundRect(x + 14, y + 190, w - 28, 120, 6); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 20, y + 204 + i * 26, w - 40, 3); }
  for (const [bx, by] of [[x + 12, y + 14], [x + w - 12, y + 14], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) bolt(ctx, bx, by, 2.4);
  // The hook that the nozzle hangs from, where the hose leaves the pump.
  steel(ctx, x + w - 4, y + 96, 18, 10, 3);
}
const SPARE = Object.freeze([{x: 470, y: 440, w: 86, h: 98}, {x: 570, y: 458, w: 80, h: 92}]);

// A Falcone F42 side on, nose to the right; x is the nose.
function car(ctx, nose, y, scale = 1, colour = CAR, extra = {}) {
  roadCar(ctx, nose, y, {scale, colour, ...extra});
}
// A little tank gauge by a lane's name: how full that car is.
function miniTank(ctx, x, y, litres) {
  ctx.fillStyle = 'rgba(200,222,232,.14)'; ctx.fillRect(x, y - 14, 12, 26);
  const k = litres / TANK_LITRES;
  if (k > 0) { const g = ctx.createLinearGradient(0, y + 10 - 22 * k, 0, y + 10); g.addColorStop(0, '#f6c85e'); g.addColorStop(1, '#a8701e'); ctx.fillStyle = g; ctx.fillRect(x + 2, y + 10 - 22 * k, 8, 22 * k); ctx.fillStyle = 'rgba(255,246,210,.9)'; ctx.fillRect(x + 2, y + 10 - 22 * k, 8, 1); }
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x + 1.5, y - 12, 2, 22);
  ctx.strokeStyle = theme.text; ctx.lineWidth = 1.5; ctx.strokeRect(x, y - 14, 12, 26);
}
// An arrow along the road from x to x + length, pointing forward.
function roadArrow(ctx, x, y, length, colour, width = 5) { forceArrowTo(ctx, x, y, x + length, y, colour, width); }
// A chequered finish line across the road from top to bottom, and the board that stands over it.
function finishLine(ctx, x, top, bottom) {
  for (let r = 0, py = top; py < bottom; r++, py += 8) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#141516' : '#ecebe4'; ctx.fillRect(x - 8 + c * 8, py, 8, Math.min(8, bottom - py)); }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 7, top, 1, bottom - top);
}
function finishBoard(ctx, x, base) {
  shadow(ctx, x, base + 1, 14, .5);
  steel(ctx, x - 2, base - 40, 4, 40, 1);
  ctx.fillStyle = '#101213'; ctx.beginPath(); ctx.roundRect(x - 20, base - 62, 40, 26, 3); ctx.fill();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { ctx.fillStyle = (r + c) % 2 ? '#141516' : '#ecebe4'; ctx.fillRect(x - 17 + c * 7, base - 59 + r * 7, 7, 7); }
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x - 20, base - 62, 40, 26, 3); ctx.stroke();
}
// The drag strip's road: tarmac, a dashed line between lanes, a painted start line in each lane (as tall as the car, so that it
// does not cross the car's name or its sum), and the chequered finish line with its board standing over the road's far end.
function roadBlock(ctx, r) {
  tarmac(ctx, r.x, roadTop(r), r.w, roadBottom(r) - roadTop(r));
  for (let i = 1; i < r.n; i++) { ctx.strokeStyle = 'rgba(245,240,220,.5)'; ctx.setLineDash([22, 14]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r.x, laneY(r, i) - r.gap / 2); ctx.lineTo(r.x + r.w, laneY(r, i) - r.gap / 2); ctx.stroke(); ctx.setLineDash([]); }
  for (let i = 0; i < r.n; i++) { paintStripe(ctx, stripX(r, 0), carY(r, i) - 21 * r.cs - 2, carY(r, i) + 18 * r.cs + 4, 5, theme.text); finishLine(ctx, stripX(r, STRIP.metres), laneY(r, i) - r.gap / 2 + 8, laneY(r, i) + r.gap / 2 - 12); }
  ctx.save(); ctx.translate(stripX(r, STRIP.metres) + 4, roadTop(r)); ctx.scale(1.4, 1.4); finishBoard(ctx, 0, 0); ctx.restore();
}
// Where a lane's car stands on the road: its wheels and the labels over and under it follow the car's scale.
const carY = (r, i) => laneY(r, i) + 5 * r.cs;
function raceRoad(ctx, view, lanes = view.lanes.length) {
  const r = roadOf(view, lanes), n = r.n, below = roadBottom(r) + 20;
  roadBlock(ctx, r);
  text(ctx, 'start', stripX(r, 0), below, {size: 15, colour: DIM});
  for (const m of [10, 20, 30, 40]) text(ctx, `${m} m`, stripX(r, m), below, {size: 15, colour: DIM});
  text(ctx, `From a standstill to ${TARGET_TEXT}, timed at real speed`, r.x + r.w / 2, roadTop(r) - 22, {size: 18, colour: DIM});
  const perM = (r.w - r.lead - 20) / STRIP.metres;
  view.lanes.forEach((l, i) => {
    const nose = stripX(r, l.metres), cy = carY(r, i), top = cy - 21 * r.cs, bottom = cy + 18 * r.cs;
    // The car's nose is where it has got to; its name rides above the lane, clear of the car.
    car(ctx, nose, cy, r.cs, CAR, {spin: l.metres * perM / (8.5 * r.cs), blur: Math.min(1, (l.kmh ?? 0) / 70)});
    miniTank(ctx, r.x + 12, top - 14, l.litres);
    text(ctx, view.plain ? l.label : `${l.label} · ${l.litres} L · ${kg1(l.kg)}`, r.x + 32, top - 14, {size: 17, align: 'left', colour: theme.text});
    // The force is the same push on the car from start to finish; the speed arrow grows as the car accelerates.
    if (view.laneSums) {
      const ay = cy - 4 * r.cs, from = nose - 92 * r.cs - 46 * r.cs;
      roadArrow(ctx, from, ay, 46 * r.cs, theme.accent, 5 * r.cs);
      text(ctx, 'force', from + 23 * r.cs, ay + 14 + 3 * r.cs, {size: 15, colour: theme.accent, weight: 800});
      const sum = `${n0(l.sums.force)} N ÷ ${n1(l.sums.total)} kg = ${l.sums.accel.toFixed(3)} m/s²`;
      ctx.font = '700 15px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(14,18,20,.85)'; const sw = ctx.measureText(sum).width + 12;
      ctx.fillRect(r.x + 8, bottom + 6, sw, 22);
      text(ctx, sum, r.x + 14, bottom + 17, {size: 15, align: 'left', colour: theme.accent});
    }
    if (l.seconds != null && l.kmh > 3) roadArrow(ctx, nose + 4, cy - 4 * r.cs, Math.max(12, 44 * r.cs * l.kmh / TARGET_KMH), GREEN, 5 * r.cs);
  });
  // On the graph's race, the road marks where the car was at the end of each second: the gaps grow because the car is speeding up.
  if (view.graph) {
    const y = laneY(r, 0), a = TARGET_MS / view.graph.seconds, bottom = carY(r, 0) + 18 * r.cs;
    for (const second of [1, 2, 3]) if (view.graph.t >= second) {
      const x = stripX(r, a * second * second / 2);
      ctx.strokeStyle = GREEN; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, bottom - 6); ctx.lineTo(x, bottom + 24); ctx.stroke();
      text(ctx, `${second} s`, x + 6, bottom + 15, {size: 15, align: 'left', colour: GREEN, weight: 800});
    }
    if (view.keys.Space === 'go') text(ctx, 'Press Space to race', stripX(r, 0) + 40, y + 6, {size: 18, align: 'left', colour: DIM});
    if (view.glow === 'strip') glowBox(ctx, view, r.x + 4, roadTop(r) + 4, r.w - 8, roadBottom(r) - roadTop(r) - 8);
  }
  photo(ctx, view, r);
}
// The speed against the time: a straight line, because the same force gives the same acceleration all the way.
function speedGraph(ctx, view) {
  const g = view.graph, x0 = 130, x1 = 1170, top = 362, bottom = 606, at = t => x0 + t / 3.5 * (x1 - x0), up = v => bottom - v / 30 * (bottom - top);
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(40, 288, 1240, 380, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'HOW THE SPEED GROWS', 58, 310, {size: 15, align: 'left', colour: DIM, weight: 800});
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, top - 6); ctx.lineTo(x0, bottom); ctx.lineTo(x1, bottom); ctx.stroke();
  for (const v of [10, 20, 30]) { ctx.strokeStyle = theme.faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, up(v)); ctx.lineTo(x1, up(v)); ctx.stroke(); text(ctx, String(v), x0 - 10, up(v), {size: 16, align: 'right'}); }
  text(ctx, 'speed in m/s', x0 - 10, top - 24, {size: 16, align: 'left', colour: theme.text});
  for (const second of [1, 2, 3]) text(ctx, String(second), at(second), bottom + 18, {size: 16});
  text(ctx, 'time in seconds', (x0 + x1) / 2, bottom + 44, {size: 16});
  const t = Math.min(g.t, g.seconds), rate = TARGET_MS / g.seconds;
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(at(0), up(0)); ctx.lineTo(at(t), up(rate * t)); ctx.stroke();
  for (const second of [1, 2, 3]) if (g.t >= second) {
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(at(second), bottom); ctx.lineTo(at(second), up(rate * second)); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `${(g.rise * second).toFixed(2)} m/s`, at(second) - 10, up(rate * second) - 14, {size: 17, align: 'right', colour: GREEN, weight: 800});
  }
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(at(t), up(rate * t), 6, 0, Math.PI * 2); ctx.fill();
  if (g.t >= g.seconds) text(ctx, `${s2(g.seconds)}, ${TARGET_MS} m/s`, x1 + 90, up(TARGET_MS) + 26, {size: 16, align: 'right', colour: theme.accent, weight: 800});
}
// The free test's car, in the cluster's own units. Its table of results is in the strip.
function carPanel(ctx, view) {
  const b = CAR_BOX, can = view.keys['→'] === 'car:next';
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'THE CAR', b.x + 14, b.y + 16, {size: 15, align: 'left', colour: DIM, weight: 800});
  text(ctx, view.free.car, b.x + b.w / 2, b.y + 36, {size: 22, colour: theme.accent, weight: 800});
  for (const [at, label, key] of [[b.prev, 'Previous car', '←'], [b.next, 'Next car', '→']]) {
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(at[0] - 80, at[1] - 16, 160, 32, 6); ctx.fill();
    text(ctx, label, at[0] + 12, at[1], {size: 15}); keyCap(ctx, at[0] - 62, at[1], key);
    ctx.globalAlpha = 1;
  }
}
// The photo finish: the moment the first car reached the speed, close up, with the gap in centimetres.
function photo(ctx, view, r) {
  const lanes = view.lanes.filter(l => l.photoM != null);
  if (!lanes.length) return;
  const w = Math.min(r.w, 700), x = r.x + (r.w - w) / 2, pitch = 40, y = roadBottom(r) + 38, h = 42 + lanes.length * pitch;
  if (y + h > size.height - 4) return;
  const lead = Math.max(...lanes.map(l => l.photoM)), gap = Math.max(...lanes.map(l => lead - l.photoM)), noseX = x + w - 150;
  // Close up: a metre is 190 board units, or less so the furthest car still fits behind its name.
  const perM = Math.min(190, (noseX - x - 230) / Math.max(gap, .01));
  ctx.fillStyle = 'rgba(10,14,15,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  text(ctx, `PHOTO FINISH, when the first car reached ${TARGET_TEXT}`, x + 12, y + 17, {size: 15, align: 'left', colour: DIM, weight: 800});
  lanes.forEach((l, i) => {
    const cy = y + 62 + i * pitch, nx = noseX - (lead - l.photoM) * perM;
    text(ctx, l.label, x + 14, cy - 4, {size: 16, align: 'left'});
    car(ctx, nx, cy, .85);
    if (l.behindM != null) {
      ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx + 2, cy - 16); ctx.lineTo(noseX, cy - 16); ctx.stroke();
      text(ctx, `${gapWords(l.behindM)} behind`, noseX + 12, cy - 4, {size: 17, align: 'left', colour: theme.bad});
    } else text(ctx, 'first', noseX + 12, cy - 4, {size: 17, align: 'left', colour: GREEN});
  });
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(noseX, y + 30); ctx.lineTo(noseX, y + h - 4); ctx.stroke(); ctx.setLineDash([]);
}
function jug(ctx, cx, bottom, fill, liquid, {label = null, key = null, w = 110, h = 150, mark = true} = {}) {
  const x = cx - w / 2, y = bottom - h;
  shadow(ctx, cx, bottom + 1, w * .8, .55);
  // Glass, the liquid in it with a surface and a meniscus, and the glass's highlights.
  ctx.fillStyle = 'rgba(200,225,235,.10)'; ctx.fillRect(x, y, w, h);
  const level = bottom - 4 - (h * .8 - 4) * fill;
  if (fill > 0) {
    const g = ctx.createLinearGradient(0, level, 0, bottom); g.addColorStop(0, shade(liquid, .3)); g.addColorStop(.4, liquid); g.addColorStop(1, shade(liquid, -.45));
    ctx.fillStyle = g; ctx.globalAlpha = .88; ctx.fillRect(x + 4, level, w - 8, bottom - 4 - level); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(x + 4, level - 3); ctx.quadraticCurveTo(x + 9, level + 1, x + 15, level + 1); ctx.lineTo(x + w - 15, level + 1); ctx.quadraticCurveTo(x + w - 9, level + 1, x + w - 4, level - 3); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 8, y + 6, 6, h - 14);
  ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, bottom); ctx.lineTo(x + w, bottom); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, bottom - 2); ctx.lineTo(x + w - 2, bottom - 2); ctx.lineTo(x + w - 2, y); ctx.stroke();
  ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + w, y + 20); ctx.quadraticCurveTo(x + w + 34, y + 30, x + w, y + 70); ctx.stroke();
  const line = bottom - h * .8;
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, line); ctx.lineTo(x + w * .45, line); ctx.stroke();
  if (mark) text(ctx, '1 litre', x - 12, line, {size: 15, align: 'right', colour: theme.accent});
  if (label) text(ctx, label, cx, y - 22, {size: 17});
  if (key) keyCap(ctx, x - 24, y - 22, key);
}
// One litre as a box: 10 cm wide, 10 cm deep and 10 cm tall, drawn beside the jug.
function litreBox(ctx) {
  const x = 150, y = 300, a = 150, d = 56;
  ctx.fillStyle = 'rgba(224,166,58,.28)'; ctx.fillRect(x, y, a, a);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + a + d, y - d); ctx.lineTo(x + a, y); ctx.closePath(); ctx.fillStyle = 'rgba(224,166,58,.18)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + a, y); ctx.lineTo(x + a + d, y - d); ctx.lineTo(x + a + d, y + a - d); ctx.lineTo(x + a, y + a); ctx.closePath(); ctx.fillStyle = 'rgba(224,166,58,.12)'; ctx.fill();
  ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, a, a);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + a + d, y - d); ctx.lineTo(x + a, y); ctx.moveTo(x + a + d, y - d); ctx.lineTo(x + a + d, y + a - d); ctx.lineTo(x + a, y + a); ctx.stroke();
  text(ctx, '10 cm', x + a / 2, y + a + 18, {size: 16});
  text(ctx, '10 cm', x - 30, y + a / 2, {size: 16});
  text(ctx, '10 cm', x + a + d / 2 + 26, y + a - d / 2 + 10, {size: 16});
  text(ctx, 'This box holds one litre.', x + a / 2 + 20, y + a + 50, {size: 17});
}
function litreStep(ctx, view) {
  const fill = view.jug.fill;
  litreBox(ctx);
  pumpNozzle(ctx, 600, 200);
  if (fill < 1 && fill > 0) { ctx.fillStyle = PETROL; ctx.fillRect(598, 200, 5, 466 - 156 * fill - 200); }
  jug(ctx, 600, 470, fill, PETROL, {w: 140, h: 200});
  text(ctx, 'One litre jug', 600, 496, {size: 17});
  if (view.glow === 'jug') glowBox(ctx, view, 510, 250, 200, 240);
  // Done: the tank holds seventy of them.
  if (fill >= 1) {
    for (let i = 0; i < TANK_LITRES; i++) { const gx = 790 + (i % 7) * 24, gy = 200 + Math.floor(i / 7) * 30; ctx.fillStyle = PETROL; ctx.fillRect(gx, gy, 16, 22); ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, 16, 22); }
    text(ctx, `The car’s tank holds ${TANK_LITRES} litres.`, 870, 520, {size: 17});
  }
}
function kilogramStep(ctx, view) {
  const {weighed, on} = view.jugs;
  scaleBody(ctx, ON_SCALE[0], 470, 260, on ? kg2(on === 'water' ? WATER_KG_PER_LITRE : PETROL_KG_PER_LITRE) : '0.00 kg');
  for (const [what, liquid, key] of [['water', WATER, '1'], ['petrol', PETROL, '2']]) {
    const [cx] = jugAt(view, what);
    jug(ctx, cx, 470, 1, liquid, {label: `${what === 'water' ? 'Water' : 'Petrol'}${weighed.includes(what) ? `: ${kg2(what === 'water' ? WATER_KG_PER_LITRE : PETROL_KG_PER_LITRE)}` : ''}`, key: view.keys[key] ? key : null});
    if (view.glow === 'jugs' && view.bestJug === what) glowBox(ctx, view, cx - 70, 300, 140, 200);
  }
}
// Brian's job: the race card, how far the petrol lasts against how far the race goes, and the race itself, on the right of the board.
const JOB = Object.freeze({x: 530, y: 34, w: 750, h: 236});
const TRACK = Object.freeze({y: 455});
function jobCard(ctx, view) {
  const j = view.job, x = JOB.x, w = JOB.w;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, JOB.y, w, JOB.h, 8); ctx.fill(); ctx.stroke();
  text(ctx, `BRIAN’S JOB · RACE ${j.day} OF ${j.of}${j.done ? ' · DONE' : ''}`, x + 20, JOB.y + 24, {size: 15, align: 'left', colour: DIM, weight: 800});
  text(ctx, j.name, x + 20, JOB.y + 58, {size: 28, align: 'left'});
  text(ctx, `This race is ${pct(j.share)} of a Grand Prix.`, x + 20, JOB.y + 94, {size: 20, align: 'left', colour: theme.text});
  // The bar: 0 to 110% of a Grand Prix, the race's line, and how far the tank lasts.
  const bx = x + 20, bw = w - 40, by = JOB.y + 144, at = share => bx + share / GRAND_PRIX.fullTankShare * bw;
  ctx.fillStyle = '#2b3236'; ctx.fillRect(bx, by, bw, 28);
  ctx.fillStyle = j.lasts >= j.share ? '#56a86f' : '#b55a3f'; ctx.fillRect(bx, by, at(Math.min(j.lasts, GRAND_PRIX.fullTankShare)) - bx, 28);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(at(j.share), by - 8); ctx.lineTo(at(j.share), by + 36); ctx.stroke();
  text(ctx, 'the race', at(j.share), by + 50, {size: 16, colour: theme.accent});
  text(ctx, `The tank lasts ${pctAbout(j.lasts)}`, bx, by - 14, {size: 17, align: 'left', colour: theme.text});
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(at(1), by + 28); ctx.lineTo(at(1), by + 38); ctx.stroke();
  text(ctx, 'a whole Grand Prix', at(1), by + 68, {size: 15, colour: DIM});
  // The race: start to flag, the car stopping where the petrol runs out.
  const ty = TRACK.y, tx0 = x + 50, tx1 = x + w - 40, cs = 1.9;
  tarmac(ctx, x, ty - 72, w, 140);
  paintStripe(ctx, tx0, ty - 62, ty + 56, 5, theme.text);
  for (let k = 0; k < 12; k++) for (let r = 0; r < 2; r++) { ctx.fillStyle = (k + r) % 2 ? '#111' : '#eee'; ctx.fillRect(tx1 + r * 8, ty - 62 + k * 9.6, 8, 9.6); }
  ctx.save(); ctx.translate(tx1 + 8, ty - 72); ctx.scale(1.4, 1.4); finishBoard(ctx, 0, 0); ctx.restore();
  const race = j.race, carX = tx0 + 190 + (tx1 - tx0 - 190) * (race ? race.at : 0);
  car(ctx, carX, ty + 10, cs);
  if (race?.dry) { text(ctx, 'out of petrol', carX - 70, ty - 56, {size: 17, colour: theme.bad}); for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(120,120,120,${.5 - i * .14})`; ctx.beginPath(); ctx.arc(carX - 200 - i * 20, ty - 4 - i * 8, 9 + i * 4, 0, Math.PI * 2); ctx.fill(); } }
  if (race?.over && !race.dry) text(ctx, 'finished', carX - 70, ty - 56, {size: 17, colour: '#9ff0b4'});
  if (view.keys.Space && !race) text(ctx, 'Press Space to race', tx0 + 240, ty + 6, {size: 18, align: 'left', colour: DIM});
  if (view.glow === 'pour' && view.target === 'go') glowBox(ctx, view, x + 4, ty - 76, w - 8, 148);
}
// Try 2's card: the mass wanted, the scale now, and the mass of one pour.
function weighCard(ctx, view) {
  const x = 760, y = 190, w = 500;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 270, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'THE JOB', x + 24, y + 30, {size: 15, align: 'left', colour: DIM, weight: 800});
  text(ctx, `Pour until the scale reads ${kg1(WEIGH_KG)}.`, x + 24, y + 76, {size: 26, align: 'left', colour: theme.accent});
  text(ctx, `The scale reads ${kg1(view.kg)} now.`, x + 24, y + 140, {size: 26, align: 'left'});
  text(ctx, `Each press pours ${POUR_LITRES} litres, which is ${kg1(POUR_LITRES * PETROL_KG_PER_LITRE)}.`, x + 24, y + 196, {size: 20, align: 'left', colour: theme.text});
  text(ctx, 'Press Space or click the scale to weigh the petrol.', x + 24, y + 236, {size: 17, align: 'left', colour: DIM});
}
function drawShop(ctx, view) {
  background(ctx, W);
  const cluster = clusterOf(view);
  // The workshop floor: the tank's scale and the jerry can stand on it; the jugs stand on it too.
  if (view.tank) floor(ctx, cluster.cy + (522 - cluster.oy) * cluster.s, W); else if (view.jug) floor(ctx, floorAt(LITRE, 480), W); else if (view.jugs) floor(ctx, floorAt(JUGS_AT, 462), W);
  if (view.tank) {
    inPlace(cluster, ctx, () => {
      if (cluster === MIDDLE) { pump(ctx); for (const c of SPARE) jerryCan(ctx, c, 0); }
      tank(ctx, view, cluster === MIDDLE ? PUMP.hose : undefined);
      if (view.free) carPanel(ctx, view);
    });
  }
  if (view.jug) inPlace(LITRE, ctx, () => litreStep(ctx, view));
  if (view.jugs) inPlace(JUGS_AT, ctx, () => kilogramStep(ctx, view));
  if (view.covered) { weighCard(ctx, view); if (view.target === 'go') { const [x, y] = toBoard(WEIGH, [64, 436]); glowBox(ctx, view, x, y, 232 * WEIGH.s, 112 * WEIGH.s); } }
  if (view.graph) { raceRoad(ctx, view); speedGraph(ctx, view); }
  else if (view.job) jobCard(ctx, view);
  else if (view.lanes.length) raceRoad(ctx, view);
  else if (view.tank && view.keys.Space === 'go' && !view.covered) {
    // Before the first race: the strip waits with its start line.
    const r = roadOf(view, 2);
    roadBlock(ctx, r);
    car(ctx, stripX(r, 0), carY(r, 0), r.cs); car(ctx, stripX(r, 0), carY(r, 1), r.cs);
    for (const [i, label] of [[0, `Your tank · ${view.litres} L`], [1, `Full tank · ${TANK_LITRES} L`]]) text(ctx, label, r.x + 14, carY(r, i) - 21 * r.cs - 14, {size: 17, align: 'left'});
    text(ctx, 'Press Space to race', stripX(r, 0) + 60, carY(r, 0) - 4, {size: 18, align: 'left', colour: DIM});
    if (view.glow === 'pour' && view.target === 'go') glowBox(ctx, view, r.x + 4, roadTop(r) + 4, r.w - 8, roadBottom(r) - roadTop(r) - 8);
  }
}
// The questions: the jugs (weighed once answered), the race, and the Tune page's Fuel load row.
function drawCheck(ctx, view) {
  background(ctx, W);
  if (view.scene === 'check-water') {
    floor(ctx, floorAt(CHECK_JUGS, 462), W);
    inPlace(CHECK_JUGS, ctx, () => {
      for (const [what, liquid, cx] of [['water', WATER, 330], ['petrol', PETROL, 670]]) {
        if (view.answered) scaleBody(ctx, cx, 470, 230, kg2(what === 'water' ? WATER_KG_PER_LITRE : PETROL_KG_PER_LITRE));
        jug(ctx, cx, 470, 1, liquid, {label: `One litre of ${what}`});
      }
    });
  }
  if (view.scene === 'check-race') raceRoad(ctx, view);
  if (view.scene === 'check-game') inPlace(TUNE, ctx, () => {
    const x = 170, y = 150, w = 660;
    ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 250, 8); ctx.fill(); ctx.stroke();
    text(ctx, 'THE TUNE PAGE · IN THE GARAGE', x + 20, y + 24, {size: 15, align: 'left', colour: DIM, weight: 800});
    text(ctx, 'Fuel load', x + 20, y + 62, {size: 26, align: 'left'});
    ['Full tank', 'Three-quarter', 'Half tank'].forEach((label, i) => {
      const bx = x + 20 + i * 210; ctx.fillStyle = i === view.tune.picked ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(bx, y + 90, 196, 48, 6); ctx.fill();
      if (i === view.tune.picked) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); }
      text(ctx, label, bx + 98, y + 114, {size: 19});
    });
    if (view.tune.effect) wrap(ctx, view.tune.effect, x + w / 2, y + 180, w - 40);
    else text(ctx, 'The race is a Grand Prix.', x + w / 2, y + 190, {size: 20, colour: DIM});
  });
}
function drawRecap(ctx, view) {
  background(ctx, W);
  // Each card is a little wider than the usual board's, with its drawing in the middle at the usual size.
  const w = 380, gap = 40, x0 = (W - 3 * w - 2 * gap) / 2, pad = (w - 300) / 2;
  view.ideas.forEach((idea, i) => {
    const cardX = x0 + i * (w + gap), x = cardX + pad;
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cardX, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), cardX + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'weight') { jug(ctx, x + 112, 330, 1, PETROL, {w: 80, h: 120, label: `1 litre, ${PETROL_KG_PER_LITRE} kg`}); text(ctx, `× ${TANK_LITRES}`, x + 228, 250, {size: 22}); text(ctx, `= ${kg1(PETROL_KG_PER_LITRE * TANK_LITRES)}`, x + 228, 290, {size: 22, colour: theme.accent}); }
    if (idea.id === 'quicker') { car(ctx, x + 262, 210, 1.4); text(ctx, 'half tank, first', x + 150, 250, {size: 15, colour: GREEN}); roadArrow(ctx, x + 262 - 129 - 44, 212, 42, theme.accent); roadArrow(ctx, x + 212 - 129 - 44, 322, 42, theme.accent); text(ctx, 'the same force', x + 110, 130, {size: 15, colour: theme.accent}); car(ctx, x + 212, 320, 1.4); text(ctx, 'full tank', x + 120, 360, {size: 15}); ctx.strokeStyle = theme.accent; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 262, 170); ctx.lineTo(x + 262, 340); ctx.stroke(); ctx.setLineDash([]); }
    if (idea.id === 'game') ['Full tank', 'Three-quarter', 'Half tank'].forEach((label, k) => { ctx.fillStyle = k === 2 ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(x + 30, 150 + k * 60, 240, 44, 6); ctx.fill(); text(ctx, label, x + 150, 172 + k * 60, {size: 18}); });
    wrap(ctx, idea.text, cardX + w / 2, 440, w - 40, {size: 19, weight: 600});
  });
}

// ---- the page under the board: the stopwatches, the table of tests and Brian's job's litres ----
// The board draws none of these. The classroom page (classroom-ui.js) shows what strip() returns, in HTML.
export function strip(view) {
  if (view.scene === 'recap') return null;
  const out = {readouts: [], parts: [], tables: [], hint: null};
  for (const l of view.lanes) {
    const reading = l.seconds == null ? '' : `${s2(l.seconds)}${l.winner ? '  first' : ''}  ${Math.round(l.kmh)} km/h`;
    out.readouts.push({label: l.label, value: reading, tone: l.seconds == null ? null : !l.done ? null : l.winner || l.behindM == null ? 'good' : 'bad'});
  }
  if (view.job) out.readouts.push({label: '', value: `${Math.round(view.litres)} litres lasts ${pctAbout(view.job.lasts)} of a Grand Prix.`, tone: null});
  if (view.free) {
    const rows = view.free.rows.slice(-TABLE_ROWS).map(r => ({label: `${r.car}, petrol ${r.litres} L, total mass ${n1(r.total)} kg`, value: `acceleration ${r.accel.toFixed(3)} m/s², time ${s2(r.seconds)}`, tone: 'good'}));
    out.tables.push({title: 'YOUR TESTS', rows: rows.length ? rows : [{label: 'There are no tests yet. Press Space to race.', value: '', tone: 'faint'}]});
  }
  return out.readouts.length || out.tables.length ? out : null;
}
const TABLE_ROWS = 3;

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'shop') drawShop(ctx, view);
    else drawCheck(ctx, view);
  }, size);
}
// The answer cards' pictures: a jug, two jugs, a car with its tank, two cars, and the game's three outcomes.
// A word on a small dark plate, so that it stays readable over the workshop wall.
function tag(ctx, value, x, y, colour, size = 16, align = 'center') {
  ctx.font = `800 ${size}px "Segoe UI", sans-serif`;
  const width = (ctx.measureText?.(value)?.width ?? value.length * size * .6) + 12, left = align === 'left' ? x - 6 : x - width / 2;
  ctx.fillStyle = 'rgba(10,14,15,.72)'; ctx.beginPath(); ctx.roundRect(left, y - size * .75, width, size * 1.5, 5); ctx.fill();
  text(ctx, value, align === 'left' ? x : x, y, {size, colour, align});
}
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const ground = cardScene(ctx, w, h, {floorAt: h - 22});
  if (picture.kind === 'jug') jug(ctx, w / 2, ground + 3, 1, picture.what === 'water' ? WATER : PETROL, {w: 60, h: 80, mark: false});
  if (picture.kind === 'jugs') { jug(ctx, w / 2 - 50, ground + 3, 1, WATER, {w: 50, h: 70, mark: false}); text(ctx, '=', w / 2 + 6, h / 2 + 8, {size: 26}); jug(ctx, w / 2 + 66, ground + 3, 1, PETROL, {w: 50, h: 70, mark: false}); }
  if (picture.kind === 'car') {
    car(ctx, w - 30, ground - 16 * 1.3, 1.3);
    steel(ctx, 16, h / 2 - 20, 20, 36, 3); miniTank(ctx, 20, h / 2 - 2, picture.litres);
    tag(ctx, `${picture.litres} L`, 44, h / 2 - 2, theme.text, 15, 'left');
  }
  if (picture.kind === 'cars') {
    // Two cars side by side on two lanes, both at the chequered line.
    cardScene(ctx, w, h, {floorAt: h});
    for (const y of [30, 76]) { tarmac(ctx, 6, y - 20, w - 12, 40); car(ctx, w - 30, y + 3, .8); }
    finishLine(ctx, w - 22, 10, h - 10);
  }
  if (picture.kind === 'game') {
    if (picture.what === 'pit') {
      car(ctx, w / 2 + 10, ground - 16, 1);
      // The pump in the pit lane: a green housing with a lit readout.
      ctx.fillStyle = '#2f6b45'; ctx.beginPath(); ctx.roundRect(w - 50, ground - 58, 30, 58, 3); ctx.fill();
      steel(ctx, w - 53, ground - 62, 36, 6, 2); lcd(ctx, w - 45, ground - 50, 20, 14);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(w - 50, ground - 8, 30, 8);
      tag(ctx, 'PIT', 40, 28, theme.accent, 18);
    }
    if (picture.what === 'flag') {
      steel(ctx, w / 2 - 44, ground - 76, 4, 78, 1);
      for (let k = 0; k < 6; k++) for (let r = 0; r < 4; r++) { ctx.fillStyle = (k + r) % 2 ? '#111' : '#eee'; ctx.fillRect(w / 2 - 36 + k * 12, 24 + r * 12, 12, 12); }
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(w / 2 - 36, 24, 72, 48);
    }
    if (picture.what === 'slow') { car(ctx, w / 2 + 70, ground - 16, 1); tag(ctx, 'slow', w / 2 - 56, h / 2 + 4, theme.bad, 18); }
  }
}
