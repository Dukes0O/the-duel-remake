// The Lift lesson's board (docs/board/cards/LAB-CLASSROOM-LIFT.md): the collective lever with its
// kilogram scale, the weighing pad, Kestrel One and its load. Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, floor, cardScene, shadow, forceArrow, plankCrate, weighingPad, text, keyCap, helicopter, car, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
import {BAND_M, CAR_KG, CRATE_KG, HOLD_S, MAX_CRATES, MOST_KG, OWN_KG, kg, leverPct, weightOf} from './lift-classroom.js';
export {BOARD};
// Pressing on the lever moves it there at once.
export const pressMovesDrag = true;

// The lever: a kilogram scale from 0 at the bottom to 4,000 kg at the top.
const GX = 80, G0 = 575, G1 = 150, SCALE_KG = 4000, PER_KG = (G0 - G1) / SCALE_KG;
const leverY = kgValue => G0 - Math.max(0, Math.min(SCALE_KG, kgValue)) * PER_KG;
// The stage step (docs/board/cards/LAB-LOOK.md): the board holds the picture only, so the pad scene is drawn 1.55 times
// its own units, which is as large as Kestrel One, its load, the lever and the stock of crates and the Dusthawk fit across
// the board together. The numbers and tables are on the page under the board (strip, below). The spare crates and the parked
// Dusthawk are drawn at the same scale, so a crate is the same size in the stock and on the hook.
const PAD_X = 517, SCENE = 1.55, PAD_HALF = 172, WONDER_PAD_HALF = 225, METRE = 20, CRATE = Object.freeze({w: 38, h: 32}), LOAD_X = 45, PARK_X = -125, CABLE_PX = 90, HOOK = 22;
// Lift and weight arrows are on one scale, in the pad's own units per kilogram.
const ARROW = .022;
const STOCK_X = 796, STOCK_W = CRATE.w * SCENE, PARKED_CAR_X = 925, DIAL_X = PAD_X - 140, DIAL_Y = GROUND_Y + 42;

// ---- where everything is, in the pad's own units (ground at 0, pad centre at x 0) ----
function crateSpots(f) {
  const left = f.car ? LOAD_X + 46 : LOAD_X - (f.crates > 1 ? CRATE.w / 2 + 1 : 0) - CRATE.w / 2;
  return Array.from({length: f.crates}, (_, i) => ({x: left + (i % 2) * (CRATE.w + 2) + CRATE.w / 2, y: -8 - CRATE.h / 2 - Math.floor(i / 2) * (CRATE.h + 2)}));
}
function setGeometry(f, {rest = true} = {}) {
  const lift = f.h * METRE, loadedSet = f.crates > 0 || f.car > 0;
  if (!loadedSet) return {hx: 0, hy: -40 - lift, loadedSet, crates: [], carAt: null, ring: null};
  const crates = crateSpots(f).map(c => ({...c, y: c.y - lift}));
  const carAt = f.car ? {x: LOAD_X, y: -31 - lift} : null;
  const top = Math.min(carAt ? carAt.y - 12 : 0, ...crates.map(c => c.y - CRATE.h / 2));
  const ringX = carAt ? (crates.length ? LOAD_X + 24 : LOAD_X) : crates.reduce((s, c) => s + c.x, 0) / crates.length;
  const ring = {x: ringX, y: top - 24};
  const tautX = ring.x, tautY = ring.y - CABLE_PX - HOOK;
  const k = rest ? f.taut * f.taut * (3 - 2 * f.taut) : 1;
  return {hx: PARK_X + (tautX - PARK_X) * k, hy: -40 + (tautY + 40) * k, loadedSet, crates, carAt, ring, k};
}
const local = (view, x, y) => [(x - PAD_X) / SCENE, (y - GROUND_Y) / SCENE];
const toBoard = (lx, ly) => [PAD_X + lx * SCENE, GROUND_Y + ly * SCENE];
const bandY = metres => GROUND_Y - (8 + metres * METRE) * SCENE;
// The stock of spare crates stands in one column at the right, the parked Dusthawk beyond it, both on the floor line.
const spareCrates = f => MAX_CRATES - f.crates;
const stockTop = f => GROUND_Y - spareCrates(f) * (CRATE.h + 2) * SCENE;
const inStock = (f, x, y, margin = 0) => spareCrates(f) > 0 && x > STOCK_X - margin && x < STOCK_X + STOCK_W + margin && y > stockTop(f) - margin && y < GROUND_Y + 4;
const onParkedCar = (x, y) => Math.abs(x - PARKED_CAR_X) < 42 * SCENE && y > GROUND_Y - 46 * SCENE && y < GROUND_Y + 4;

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  const f = view.flight;
  if (view.keys.W && x > GX - 50 && x < GX + 80 && y > G1 - 24 && y < G0 + 20) return {drag: 'lever', action: 'release'};
  if (!f || view.scene !== 'pad') return null;
  const [lx, ly] = local(view, x, y), g = setGeometry(f);
  if (view.keys.Space === 'rotor' && Math.abs(lx - g.hx) < 130 && ly > g.hy - 60 && ly < g.hy + 34) return {action: 'rotor'};
  if (view.keys[1] === 'crate:add' && inStock(f, x, y, 8)) return {action: 'crate:add'};
  if (view.keys[2] === 'crate:remove' && g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 + 4 && Math.abs(ly - c.y) < CRATE.h / 2 + 4)) return {action: 'crate:remove'};
  if (view.keys[3] === 'car') {
    if (!f.car && onParkedCar(x, y)) return {action: 'car'};
    if (g.carAt && Math.abs(lx - g.carAt.x) < 42 && Math.abs(ly - g.carAt.y) < 26) return {action: 'car'};
  }
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene === 'wonder' || view.scene === 'recap') return null;
  const f = view.flight;
  if (view.gauge || view.keys.W) {
    if (Math.abs(y - leverY(f.most)) < 7 && x > GX - 40 && x < GX + 60) return `The top stop is the most that the rotor can push, ${kg(Math.floor(f.most))}.`;
    if (view.gauge === 'weight' && Math.abs(y - redLineY(f)) < 8 && x > GX - 30 && x < GX + 150) return `The red line marks the total weight, ${kg(f.weight)}. With the lever here, lift equals weight.`;
    if (x > GX - 50 && x < GX + 80 && y > G1 - 24 && y < G0 + 30) return `This is the collective lever, now giving ${kg(f.lift)} of lift. Raising it tilts the blades more steeply, which gives more lift. Drag it, or use W and S.`;
  }
  if (view.band && y < bandY(BAND_M[0]) && y > bandY(BAND_M[1])) return `In the challenge you hold the Dusthawk inside this strip, ${BAND_M[0]} to ${BAND_M[1]} m above the ground, for ${HOLD_S} seconds.`;
  if (!f || view.scene !== 'pad') return null;
  const [lx, ly] = local(view, x, y), g = setGeometry(f);
  if (Math.abs(lx - g.hx) < 128 && ly > g.hy - 46 && ly < g.hy - 26) return 'The rotor is the set of long blades that spin and throw air down. The air pushes the rotor up, and that push is lift.';
  if (Math.abs(lx - g.hx) < 60 && ly > g.hy - 28 && ly < g.hy + 34) return `Kestrel One, with its pilot and a full tank of fuel, weighs ${kg(OWN_KG)}.`;
  if (g.carAt && Math.abs(lx - g.carAt.x) < 42 && Math.abs(ly - g.carAt.y) < 26) return `The Dusthawk rally car weighs ${kg(CAR_KG)}.`;
  if (g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 && Math.abs(ly - c.y) < CRATE.h / 2)) return `This crate weighs ${kg(CRATE_KG)}.`;
  if (view.stock && inStock(f, x, y, 8) && y < GROUND_Y) return `These are spare crates, ${kg(CRATE_KG)} each.` + (view.keys[1] ? ' Click them to load one.' : '');
  if (view.stock === 'all' && !f.car && onParkedCar(x, y) && y < GROUND_Y) return `The Dusthawk weighs ${kg(CAR_KG)}.` + (view.keys[3] ? ' Click it to hang it from the cable.' : '');
  if (Math.hypot(x - DIAL_X, y - DIAL_Y) < 32) return 'This dial shows the weight still resting on the pad, which is the total weight less the rotor’s lift.';
  if (y > GROUND_Y - 10 && y < GROUND_Y + 20 && Math.abs(x - PAD_X) < PAD_HALF * SCENE) return 'The weighing pad weighs whatever rests on it.';
  return null;
}
const redLineY = f => f.weight <= f.most ? leverY(f.weight) : Math.min(leverY(f.weight), leverY(f.most) - 16);
export function targetPoint(view, action) {
  const f = view.flight;
  if (!f) return null;
  const g = setGeometry(f);
  if (action === 'lever:up' || action === 'lever:down' || action === 'set:best') return [GX, leverY(f.lift)];
  if (action === 'lever:weight') return [GX, leverY(Math.min(f.weight, f.most))];
  if (action === 'lever:mark') return [GX, leverY(view.mark)];
  if (action === 'lever:top') return [GX, leverY(f.most)];
  if (action === 'crate:add') return [STOCK_X + STOCK_W / 2, GROUND_Y - CRATE.h * SCENE / 2];
  if (action === 'crate:remove') { const c = g.crates.at(-1); return c ? toBoard(c.x, c.y) : null; }
  if (action === 'car') return f.car ? toBoard(g.carAt.x, g.carAt.y) : [PARKED_CAR_X, GROUND_Y - 22 * SCENE];
  if (action === 'rotor') return toBoard(g.hx, g.hy - 35);
  if (action === 'release') return toBoard(g.hx, g.hy);
  return null;
}
// The lift a drag to (x, y) on the lever asks for.
export function dragAngle(view, id, x, y) { return (G0 - y) / PER_KG; }

// ---- drawing ----
// The crate and the weighing pad are drawn once, in board-art.js. Each crate shows its weight, 500 kg, on the side.
function crate(ctx, x, y) { plankCrate(ctx, x, y, CRATE.w, CRATE.h, '500'); }
function pad(ctx, half = PAD_HALF) { weighingPad(ctx, half, 70); }
// The pad's dial: a brass-rimmed gauge whose needle shows the weight still resting on the pad.
function dial(ctx, reads, x, y) {
  const rim = ctx.createLinearGradient(x - 30, y - 30, x + 30, y + 30); rim.addColorStop(0, theme.brass[0]); rim.addColorStop(.5, theme.brass[1]); rim.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(x, y, 31, 0, Math.PI * 2); ctx.fill();
  const face = ctx.createRadialGradient(x - 8, y - 10, 2, x, y, 27); face.addColorStop(0, '#fffaf0'); face.addColorStop(1, '#d9cfb6');
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(x, y, 26.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a3a34';
  for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + i * Math.PI * .15; ctx.lineWidth = i % 5 === 0 ? 2 : 1.1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (i % 5 === 0 ? 18 : 20.5), y + Math.sin(a) * (i % 5 === 0 ? 18 : 20.5)); ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); ctx.stroke(); }
  const a = Math.PI * .75 + Math.min(1, reads / 5000) * Math.PI * 1.5;
  ctx.strokeStyle = '#c8402e'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#2a2a26'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - 8, y - 12, 12, 5, -.6, 0, Math.PI * 2); ctx.fill();
  text(ctx, `the pad reads ${kg(reads)}`, x + 44, y, {size: 17, align: 'left'});
}
// The air the rotor throws down: soft streaks that are longer, faster and more numerous as the lift grows, and
// dust blown outward along the pad once the rotor is working hard.
function air(ctx, hx, hy, liftKg, time) {
  const share = Math.min(1, liftKg / MOST_KG), n = Math.max(3, Math.round(share * 12)), fall = -12 - (hy - 28);
  if (fall < 30) return;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = hx - 116 + (i + .5) * (232 / n) + Math.sin(i * 12.9) * 6, travel = (time * (80 + share * 150) + i * 53) % fall;
    const y = hy - 28 + travel, len = Math.min(14 + share * 30, fall - travel);
    if (len < 4) continue;
    const g = ctx.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, 'rgba(170,220,245,0)'); g.addColorStop(1, `rgba(170,220,245,${.35 + share * .5})`);
    ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    ctx.fillStyle = `rgba(190,230,250,${.5 + share * .4})`; ctx.beginPath(); ctx.moveTo(x - 3.6, y + len - 5); ctx.lineTo(x + 3.6, y + len - 5); ctx.lineTo(x, y + len + 2); ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
  if (share > .3) for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1, age = (time * (.5 + share * .6) + i * .137) % 1, reach = 30 + age * (90 + share * 110);
    const px = hx + side * reach, py = -15 - age * 16, r = 9 + age * 24, puff = ctx.createRadialGradient(px, py, 1, px, py, r);
    puff.addColorStop(0, `rgba(222,208,178,${(1 - age) * (share - .3) * .55})`); puff.addColorStop(1, 'rgba(222,208,178,0)');
    ctx.fillStyle = puff; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}
const arrow = forceArrow;
// One helicopter and its load, in the pad's own units.
function drawSet(ctx, f, time, {rest = true, strain = false, padHalf = PAD_HALF} = {}) {
  const g = setGeometry(f, {rest});
  pad(ctx, padHalf);
  // The helicopter's shadow on the pad: smaller and fainter as it climbs.
  shadow(ctx, g.hx - 20, -12, 120 - Math.min(60, f.h * 12), Math.max(.12, .5 - f.h * .08));
  for (let i = 0; i < (f.dropped ?? 0); i++) crate(ctx, LOAD_X + 100 + i * (CRATE.w + 2), -8 - CRATE.h / 2);
  if (g.loadedSet) {
    // Slings from the ring to the load, and the cable from the helicopter's hook, slack until the helicopter rises.
    ctx.strokeStyle = '#d8d0bc'; ctx.lineWidth = 1.4;
    for (const c of g.crates) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(c.x, c.y - CRATE.h / 2); ctx.stroke(); }
    if (g.carAt) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x - 26, g.carAt.y - 4); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x + 26, g.carAt.y - 4); ctx.stroke(); }
    const hookX = g.hx, hookY = g.hy + HOOK, sag = (1 - (g.k ?? 1)) * 60;
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hookX, hookY);
    ctx.quadraticCurveTo((hookX + g.ring.x) / 2, Math.max(hookY, g.ring.y) + sag, g.ring.x, g.ring.y); ctx.stroke();
    if (g.carAt) car(ctx, g.carAt.x, g.carAt.y, 0);
    for (const c of g.crates) crate(ctx, c.x, c.y);
  }
  const shake = strain ? Math.sin(time * 47) * 1.6 : 0;
  helicopter(ctx, g.hx + shake, g.hy, 0, f.lift > 0 ? time : 0);
  return g;
}
function gauge(ctx, view) {
  const f = view.flight, lift = f.lift, interactive = Boolean(view.keys.W);
  text(ctx, 'Collective lever', GX - 10, G1 - 44, {size: 17, colour: theme.accent});
  ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.beginPath(); ctx.roundRect(GX - 12, G1 - 14, 24, G0 - G1 + 28, 10); ctx.fill();
  ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.stroke();
  for (let n = 0; n <= SCALE_KG; n += 500) {
    const y = leverY(n), big = n % 1000 === 0;
    ctx.strokeStyle = theme.faint; ctx.lineWidth = big ? 2 : 1; ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX - (big ? 30 : 25), y); ctx.stroke();
    if (big) text(ctx, n.toLocaleString('en-GB'), GX - 34, y, {size: 14, align: 'right', weight: 600, colour: theme.faint});
  }
  ctx.fillStyle = theme.good; ctx.globalAlpha = .55; ctx.fillRect(GX - 6, leverY(lift), 12, G0 - leverY(lift)); ctx.globalAlpha = 1;
  // The top stop: as far as the lever goes.
  const top = leverY(f.most);
  ctx.fillStyle = theme.beamLight; ctx.fillRect(GX - 18, top - 4, 36, 5);
  // Above the stop when the red line is below it; under the stop when the weight is above the top.
  const above = !(view.gauge === 'weight' && f.weight > f.most);
  text(ctx, `top ${Math.floor(f.most).toLocaleString('en-GB')}`, GX + 22, above ? top - 14 : top + 14, {size: 13, align: 'left', colour: theme.text, weight: 600});
  if (view.mark) {
    const y = leverY(view.mark);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(GX - 18, y); ctx.lineTo(GX + 60, y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, kg(view.mark), GX + 64, y, {size: 14, align: 'left', colour: theme.accent});
  }
  if (view.gauge === 'weight') {
    const y = redLineY(f), glow = view.glow === 'lever:weight';
    ctx.strokeStyle = theme.bad; ctx.lineWidth = glow ? 4 + Math.sin(view.time * 6) * 1.5 : 3;
    ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX + 64, y); ctx.stroke();
    text(ctx, f.weight <= f.most ? 'weight' : 'weight above top', GX + 68, y, {size: 13, align: 'left', colour: theme.bad});
  }
  // The handle: a T grip the player drags.
  const y = leverY(lift), glow = view.glow === 'lever:up' || view.glow === 'lever:top';
  ctx.fillStyle = '#20262a'; ctx.fillRect(GX - 3, y, 6, 14);
  const grip = ctx.createLinearGradient(0, y - 12, 0, y + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(GX - 32, y - 10, 64, 16, 7); ctx.fill();
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(view.time * 6) * 1.5 : 1.5; ctx.stroke();
  if (interactive) { keyCap(ctx, GX - 22, G0 + 34, 'W'); text(ctx, 'up', GX - 8, G0 + 34, {size: 14, align: 'left'}); keyCap(ctx, GX + 26, G0 + 34, 'S'); text(ctx, 'down', GX + 40, G0 + 34, {size: 14, align: 'left'}); }
}
const STATUS = {pad: 'On the pad', taut: 'Load still on the pad', rising: 'Lifting', hovering: 'Hovering', climbing: 'Climbing', high: 'Still climbing', sinking: 'Sinking'};
// ---- the page under the board: the readouts and the tables ----
// The board draws none of these. The classroom page (classroom-ui.js) shows what strip() returns, in HTML.
const TONES = {lift: 'good', weight: 'bad', lever: 'accent'};
export function strip(view) {
  const f = view.flight, kind = view.scene === 'pad' ? view.readouts : false;
  const readouts = [], out = {readouts, parts: [], tables: [], hint: null};
  if (kind) {
    if (kind === 'lift' || kind === 'both') readouts.push({label: 'Lift', value: kg(f.lift), tone: TONES.lift});
    if (kind === 'weight' || kind === 'both') readouts.push({label: 'Weight', value: kg(f.weight), tone: TONES.weight});
    if ((kind === 'lift' || kind === 'both') && view.leverRow) readouts.push({label: 'Lever', value: `${f.lever}%`, tone: TONES.lever});
    if (kind === 'both') readouts.push({label: null, value: STATUS[f.status], tone: f.status === 'hovering' ? 'good' : 'accent'});
    if (kind === 'weight') out.parts = f.parts;
    out.hint = 'Green shows lift, the rotor’s push upward. Red shows weight, the Earth’s pull downward.';
  }
  const rows = list => list.map(row => ({label: row.label, value: row.value ?? '…', tone: row.value ? 'good' : 'faint'}));
  if (view.scene === 'pad' && view.table) out.tables.push({title: null, rows: rows(view.table)});
  if (view.scene === 'pad' && view.freeTable?.length) out.tables.push({title: 'Your results', rows: rows(view.freeTable)});
  return readouts.length || out.parts.length || out.tables.length ? out : null;
}
// The two small pictures that stay on the board, in its empty top right corner, with no numbers: lift and weight as arrows side
// by side on one scale (when they are the same length, the helicopter hovers), and one blade seen end on, drawn large (a higher
// lever tilts the blade more steeply, and more air goes down).
const CORNER = Object.freeze({x: 800, y: 14, w: 186, h: 112});
function cornerPanel(ctx, w = CORNER.w) {
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(CORNER.x, CORNER.y, w, CORNER.h, 8); ctx.fill(); ctx.stroke();
}
function arrowsPicture(ctx, f) {
  const x = CORNER.x, mid = CORNER.y + 56, per = 40 / SCALE_KG;
  cornerPanel(ctx, 150);
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 14, mid); ctx.lineTo(x + 136, mid); ctx.stroke();
  arrow(ctx, x + 52, mid, f.lift * per, true, theme.good, 8);
  arrow(ctx, x + 98, mid, f.weight * per, false, theme.bad, 8);
  text(ctx, 'lift', x + 38, mid - 18, {size: 15, colour: theme.good, align: 'right'});
  text(ctx, 'weight', x + 112, mid + 18, {size: 15, colour: theme.bad, align: 'left'});
}
function bladePicture(ctx, f, time) {
  const x = CORNER.x + CORNER.w / 2, y = CORNER.y + 42, share = Math.min(1, f.lift / f.most), tilt = (3 + share * 22) * Math.PI / 180;
  cornerPanel(ctx);
  text(ctx, 'One blade, seen end on', x, CORNER.y + 18, {size: 14, colour: theme.accent});
  ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt);
  ctx.fillStyle = theme.iron[0]; ctx.strokeStyle = theme.iron[2]; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 44, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  const n = f.lift > 0 ? Math.max(1, Math.round(share * 5)) : 0;
  ctx.strokeStyle = 'rgba(170,220,245,.85)'; ctx.lineWidth = 2.2;
  for (let i = 0; i < n; i++) {
    const ax = x - 40 + (n === 1 ? 40 : i * (80 / (n - 1))), ay = y + 10 + (time * (30 + share * 50) + i * 13) % 16;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + 22); ctx.lineTo(ax - 4, ay + 16); ctx.moveTo(ax, ay + 22); ctx.lineTo(ax + 4, ay + 16); ctx.stroke();
  }
  text(ctx, f.lift > 0 ? 'air thrown down' : 'rotor stopped', x, CORNER.y + CORNER.h - 14, {size: 14, colour: f.lift > 0 ? 'rgba(170,220,245,.95)' : theme.faint});
}
function stock(ctx, view) {
  const f = view.flight, spare = spareCrates(f);
  ctx.save(); ctx.translate(STOCK_X, GROUND_Y); ctx.scale(SCENE, SCENE);
  for (let i = 0; i < spare; i++) crate(ctx, CRATE.w / 2, -CRATE.h / 2 - i * (CRATE.h + 2));
  ctx.restore();
  if (view.glow === 'crate:add' && spare) halo(ctx, STOCK_X + STOCK_W / 2, (GROUND_Y + stockTop(f)) / 2, 64, view.time);
  if (view.keys[1]) keyCap(ctx, STOCK_X + STOCK_W / 2 - 14, GROUND_Y + 26, '1');
  if (view.keys[2] && f.crates) { keyCap(ctx, STOCK_X + STOCK_W / 2 + 14, GROUND_Y + 26, '2'); }
  if (view.stock === 'all') {
    if (!f.car) { ctx.save(); ctx.translate(PARKED_CAR_X, GROUND_Y); ctx.scale(SCENE, SCENE); car(ctx, 0, -23, 0); ctx.restore(); }
    if (view.glow === 'car') halo(ctx, ...(f.car ? toBoard(LOAD_X, -33) : [PARKED_CAR_X, GROUND_Y - 22 * SCENE]), 64, view.time);
    if (view.keys[3]) keyCap(ctx, PARKED_CAR_X, GROUND_Y + 26, '3');
  }
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function band(ctx) {
  const y0 = bandY(BAND_M[1]), y1 = bandY(BAND_M[0]), x0 = PAD_X - PAD_HALF * SCENE, x1 = PAD_X + PAD_HALF * SCENE;
  ctx.fillStyle = 'rgba(86,214,131,.12)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(86,214,131,.6)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  for (const y of [y0, y1]) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  ctx.setLineDash([]);
  // The label sits just under the strip's lower edge, clear of the load that hangs inside it.
  text(ctx, `${BAND_M[0]} to ${BAND_M[1]} m above the ground`, x1 - 5, y1 + 14, {size: 14, align: 'right', colour: theme.good});
}
function drawPad(ctx, view) {
  background(ctx); floor(ctx, GROUND_Y + 8);
  const f = view.flight;
  if (view.band) band(ctx);
  ctx.save(); ctx.translate(PAD_X, GROUND_Y); ctx.scale(SCENE, SCENE);
  const g = drawSet(ctx, f, view.time, {strain: f.status === 'taut' && f.lift >= f.most - .5});
  if (view.air) air(ctx, g.hx, g.hy, f.lift, view.time);
  if (view.glow === 'rotor') halo(ctx, g.hx, g.hy - 35, 70, view.time);
  // Lift on the rotor and weight on the helicopter, as arrows on one scale, so that equal arrows mean a hover.
  if (view.readouts === 'lift' || view.readouts === 'both') arrow(ctx, g.hx, g.hy - 44, f.lift * ARROW, true, theme.good, 8);
  // The label sits on the side of the arrow that has more room: toward the middle of the board.
  if (view.forces && f.lift > 0) text(ctx, 'air pushes the rotor up', g.hx + (g.hx > 20 ? -14 : 14), g.hy - 44 - Math.max(16, f.lift * ARROW * .85), {size: 12, align: g.hx > 20 ? 'right' : 'left', colour: theme.good});
  if (view.forces && view.readouts === 'both') {
    arrow(ctx, g.hx + 74, g.hy - 12, f.weight * ARROW, false, theme.bad, 8);
    text(ctx, 'weight', g.hx + 86, g.hy + 4, {size: 12, align: 'left', colour: theme.bad});
  }
  ctx.restore();
  dial(ctx, f.pad, DIAL_X, DIAL_Y);
  if (view.stock) stock(ctx, view);
  if (view.gauge) gauge(ctx, view);
  if (view.blade) bladePicture(ctx, f, view.time);
  if (view.readouts === 'both') arrowsPicture(ctx, f);
  if (view.keys.Space === 'rotor') keyCap(ctx, ...toBoard(g.hx, g.hy - 70), 'Space');
}
function drawThree(ctx, view) {
  background(ctx); floor(ctx, GROUND_Y - 36);
  const columns = [180, 500, 820];
  view.sets.forEach((f, i) => {
    ctx.save(); ctx.translate(columns[i] + 22, GROUND_Y - 40); ctx.scale(.62, .62);
    drawSet(ctx, f, view.time, {strain: f.status === 'taut' && f.lift >= f.most - .5});
    ctx.restore();
    if (!view.hideWeights) text(ctx, `weighs ${kg(f.weight)}`, columns[i], GROUND_Y + 2, {size: 19, colour: theme.bad});
    if (f.lift > 0) {
      const top = f.lift >= f.most - .5 && f.weight > f.most;
      text(ctx, top ? `lever at the top, ${kg(Math.floor(f.most))}` : `lift ${kg(f.lift)}, lever ${leverPct(f.lift)}%`, columns[i], GROUND_Y + 30, {size: 17, colour: theme.good});
      text(ctx, f.status === 'hovering' ? 'hovers' : f.status === 'taut' ? 'stays down' : STATUS[f.status].toLowerCase(), columns[i], GROUND_Y + 58, {size: 20, colour: f.status === 'hovering' ? theme.good : theme.accent});
    }
  });
  text(ctx, `The most that the rotor can push is ${kg(Math.floor(MOST_KG))}.`, BOARD.width / 2, 40, {size: 20, colour: theme.accent});
}
function drawWonder(ctx, view) {
  outdoors(ctx);
  const f = view.flight;
  ctx.save(); ctx.translate(PAD_X, GROUND_Y); ctx.scale(SCENE, SCENE);
  const g = drawSet(ctx, f, view.time, {strain: f.status === 'taut', padHalf: WONDER_PAD_HALF});
  air(ctx, g.hx, g.hy, f.lift, view.time);
  ctx.restore();
  if (f.status === 'taut') text(ctx, 'engine at full power', ...toBoard(g.hx, g.hy - 62), {size: 18, colour: theme.accent});
  if (f.dropped && f.h > 0) text(ctx, 'two crates left behind', ...toBoard(LOAD_X + 120, -56), {size: 16, colour: theme.accent});
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 300); ctx.clip();
    ctx.translate(x + w / 2 - 20, 372); ctx.scale(.72, .72);
    const t = view.time;
    if (idea.id === 'match') { const f = mini({}, OWN_KG, 1.5 + Math.sin(t * 1.4) * .06); drawSet(ctx, f, t); arrow(ctx, 0, -40 - f.h * METRE - 44, OWN_KG * .04, true, theme.good, 10); arrow(ctx, 0, -40 - f.h * METRE + 40, OWN_KG * .04, false, theme.bad, 10); }
    if (idea.id === 'most') drawSet(ctx, mini({car: 1, crates: 2}, MOST_KG, 0, 1), t, {strain: true});
    if (idea.id === 'ease') { ctx.fillStyle = 'rgba(86,214,131,.14)'; ctx.fillRect(-PAD_HALF, -8 - BAND_M[1] * METRE, 2 * PAD_HALF, (BAND_M[1] - BAND_M[0]) * METRE); drawSet(ctx, mini({car: 1}, weightOf({car: 1}), 3.2 + Math.sin(t * 1.2) * .1, 1), t); }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 416, w - 30, {size: 19, weight: 600});
  });
}
const mini = (load, lift, h, taut = 0) => {
  const f = {crates: load.crates ?? 0, car: load.car ?? 0, lift, h, taut, dropped: 0};
  return {...f, weight: weightOf(f), most: MOST_KG};
};

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'wonder') drawWonder(ctx, view);
    else if (view.scene === 'three') drawThree(ctx, view);
    else if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawPad(ctx, view);
  });
}

// ---- the card pictures ----
// Each picture is a small view of the pad: the same wall and floor, pad, car, crates, helicopter, lever and lit arrows.
const cross = (ctx, x, y, r) => {
  ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = theme.bad; ctx.shadowBlur = 10; ctx.strokeStyle = theme.bad; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); ctx.restore();
};
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const floorAt = picture.kind === 'lever' ? h : h - 18;
  cardScene(ctx, w, h, {floorAt});
  ctx.save();
  if (picture.kind === 'verdict') {
    ctx.translate(w * .42, floorAt + 8); ctx.scale(.37, .37);
    drawSet(ctx, mini({car: 1}, MOST_KG, picture.up ? 1.4 : 0, 1), .3);
    ctx.restore(); ctx.save();
    if (picture.up) arrow(ctx, w - 28, h * .78, h * .56, true, theme.good, 10);
    else cross(ctx, w - 28, h * .42, 15);
  }
  if (picture.kind === 'load') {
    ctx.translate(w * .42, floorAt + 4); ctx.scale(.62, .62);
    const f = {crates: picture.crates ?? 0, car: picture.car ?? 0, h: 0, taut: 0, lift: 0};
    pad(ctx);
    const g = setGeometry(f);
    if (g.carAt) car(ctx, g.carAt.x, g.carAt.y, 0);
    for (const c of g.crates) crate(ctx, c.x, c.y);
  }
  if (picture.kind === 'motion') {
    ctx.translate(w * .42, floorAt + 8); ctx.scale(.37, .37);
    drawSet(ctx, mini({car: 1}, weightOf({car: 1}), 1.5, 1), .3);
    ctx.restore(); ctx.save();
    if (picture.move === 'climb') arrow(ctx, w - 28, h * .8, h * .56, true, theme.good, 10);
    if (picture.move === 'sink') arrow(ctx, w - 28, h * .2, h * .56, false, theme.bad, 10);
    if (picture.move === 'hover') for (const y of [h * .4, h * .56]) { ctx.shadowColor = theme.accent; ctx.shadowBlur = 8; ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.roundRect(w - 46, y, 34, 7, 3); ctx.fill(); }
  }
  if (picture.kind === 'lever') {
    // The collective lever's slot with its handle at the top, level with the red weight line, or at the bottom.
    const x = w / 2 - 16, y0 = h - 16, y1 = 18, mid = (y0 + y1) / 2 + 6, at = {top: y1, match: mid, bottom: y0}[picture.at];
    ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.beginPath(); ctx.roundRect(x - 10, y1 - 10, 20, y0 - y1 + 20, 9); ctx.fill();
    ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = theme.good; ctx.globalAlpha = .55; ctx.fillRect(x - 5, at, 10, y0 - at); ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x - 26, mid); ctx.lineTo(x + 40, mid); ctx.stroke();
    text(ctx, 'weight', x + 46, mid, {size: 13, colour: theme.bad, align: 'left'});
    ctx.fillStyle = '#20262a'; ctx.fillRect(x - 3, at, 6, 12);
    const grip = ctx.createLinearGradient(0, at - 10, 0, at + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(1, theme.brass[2]);
    ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(x - 28, at - 9, 56, 15, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}
