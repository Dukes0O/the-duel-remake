// The Lift lesson's board (docs/board/cards/LAB-CLASSROOM-LIFT.md): the collective lever with its
// kilogram scale, the weighing pad, Kestrel One and her load. Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, text, keyCap, helicopter, car, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
import {BAND_M, CAR_KG, CRATE_KG, MAX_CRATES, MOST_KG, OWN_KG, kg, weightOf} from './lift-classroom.js';
export {BOARD};
// Pressing on the lever moves it there at once.
export const pressMovesDrag = true;

// The lever: a kilogram scale from 0 at the bottom to 4,000 kg at the top.
const GX = 100, G0 = 575, G1 = 150, SCALE_KG = 4000, PER_KG = (G0 - G1) / SCALE_KG;
const leverY = kgValue => G0 - Math.max(0, Math.min(SCALE_KG, kgValue)) * PER_KG;
// The pad scene is drawn 1.2 times its own units, so Kestrel One reads at a glance.
const PAD_X = 505, SCENE = 1.2, PAD_HALF = 225, METRE = 24, CRATE = Object.freeze({w: 38, h: 32}), LOAD_X = 60, CABLE_PX = 90, HOOK = 22;
const BOX = Object.freeze({x: 770, y: 14, w: 216, h: 236});
const STOCK_X = 805, PARKED_CAR_X = 935;

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
  return {hx: -150 + (tautX + 150) * k, hy: -40 + (tautY + 40) * k, loadedSet, crates, carAt, ring, k};
}
const local = (view, x, y) => [(x - PAD_X) / SCENE, (y - GROUND_Y) / SCENE];
const toBoard = (lx, ly) => [PAD_X + lx * SCENE, GROUND_Y + ly * SCENE];
const bandY = metres => GROUND_Y - (8 + metres * METRE) * SCENE;

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  const f = view.flight;
  if (view.keys.W && x > GX - 50 && x < GX + 80 && y > G1 - 24 && y < G0 + 20) return {drag: 'lever', action: 'release'};
  if (!f || view.scene !== 'pad') return null;
  const [lx, ly] = local(view, x, y), g = setGeometry(f);
  if (view.keys.Space === 'rotor' && Math.abs(lx - g.hx) < 130 && ly > g.hy - 60 && ly < g.hy + 34) return {action: 'rotor'};
  if (view.keys[1] === 'crate:add' && x > STOCK_X - 8 && x < STOCK_X + 2 * CRATE.w + 12 && y > GROUND_Y - 3 * CRATE.h - 10 && y < GROUND_Y + 4) return {action: 'crate:add'};
  if (view.keys[2] === 'crate:remove' && g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 + 4 && Math.abs(ly - c.y) < CRATE.h / 2 + 4)) return {action: 'crate:remove'};
  if (view.keys[3] === 'car') {
    if (!f.car && Math.abs(x - PARKED_CAR_X) < 44 && y > GROUND_Y - 50 && y < GROUND_Y + 4) return {action: 'car'};
    if (g.carAt && Math.abs(lx - g.carAt.x) < 42 && Math.abs(ly - g.carAt.y) < 26) return {action: 'car'};
  }
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene === 'wonder' || view.scene === 'recap') return null;
  const f = view.flight;
  if (view.gauge || view.keys.W) {
    if (Math.abs(y - leverY(f.most)) < 7 && x > GX - 40 && x < GX + 60) return `The top stop: the most her rotor can push, ${kg(Math.floor(f.most))}.`;
    if (view.gauge === 'weight' && Math.abs(y - redLineY(f)) < 8 && x > GX - 30 && x < GX + 150) return `The red line is her weight, ${kg(f.weight)}. With the lever here, lift is the same as weight.`;
    if (x > GX - 50 && x < GX + 80 && y > G1 - 24 && y < G0 + 30) return `The collective lever: ${kg(f.lift)} of lift now. Up means more lift. Drag it, or use W and S.`;
  }
  if (view.readouts && x > BOX.x && y > BOX.y && x < BOX.x + BOX.w && y < BOX.y + BOX.h) return 'Green is lift, the rotor’s push up. Red is weight, the Earth’s pull down.';
  if (view.band && y < bandY(BAND_M[0]) && y > bandY(BAND_M[1])) return `The game’s band: hold the car ${BAND_M[0]} to ${BAND_M[1]} m off the ground for 10 seconds.`;
  if (!f || view.scene !== 'pad') return null;
  const [lx, ly] = local(view, x, y), g = setGeometry(f);
  if (Math.abs(lx - g.hx) < 128 && ly > g.hy - 46 && ly < g.hy - 26) return 'The rotor: long blades that spin and throw air down. The air pushes her up: that push is lift.';
  if (Math.abs(lx - g.hx) < 60 && ly > g.hy - 28 && ly < g.hy + 34) return `Kestrel One, with her pilot and a full tank: ${kg(OWN_KG)}.`;
  if (g.carAt && Math.abs(lx - g.carAt.x) < 42 && Math.abs(ly - g.carAt.y) < 26) return `The Dusthawk rally car: ${kg(CAR_KG)}.`;
  if (g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 && Math.abs(ly - c.y) < CRATE.h / 2)) return `A crate: ${kg(CRATE_KG)}.`;
  if (view.stock && x > STOCK_X - 8 && x < STOCK_X + 2 * CRATE.w + 12 && y > GROUND_Y - 3 * CRATE.h - 10 && y < GROUND_Y) return `Spare crates, ${kg(CRATE_KG)} each.` + (view.keys[1] ? ' Click to load one.' : '');
  if (view.stock === 'all' && !f.car && Math.abs(x - PARKED_CAR_X) < 44 && y > GROUND_Y - 50 && y < GROUND_Y) return `The Dusthawk: ${kg(CAR_KG)}.` + (view.keys[3] ? ' Click to hook it.' : '');
  if (y > GROUND_Y && Math.abs(x - PAD_X) < 50) return 'The weighing pad’s dial: what the pad feels, her weight less the rotor’s lift.';
  if (y > GROUND_Y - 10 && y < GROUND_Y + 20 && Math.abs(x - PAD_X) < PAD_HALF * SCENE) return 'The weighing pad: it weighs whatever rests on it.';
  return null;
}
const redLineY = f => f.weight <= f.most ? leverY(f.weight) : Math.min(leverY(f.weight), leverY(f.most) - 16);
export function targetPoint(view, action) {
  const f = view.flight;
  if (!f) return null;
  const g = setGeometry(f);
  if (action === 'lever:up' || action === 'lever:down') return [GX, leverY(f.lift)];
  if (action === 'lever:weight') return [GX, leverY(Math.min(f.weight, f.most))];
  if (action === 'lever:top') return [GX, leverY(f.most)];
  if (action === 'crate:add') return [STOCK_X + CRATE.w, GROUND_Y - CRATE.h];
  if (action === 'crate:remove') { const c = g.crates.at(-1); return c ? toBoard(c.x, c.y) : null; }
  if (action === 'car') return f.car ? toBoard(g.carAt.x, g.carAt.y) : [PARKED_CAR_X, GROUND_Y - 22];
  if (action === 'rotor') return toBoard(g.hx, g.hy - 35);
  if (action === 'release') return toBoard(g.hx, g.hy);
  return null;
}
// The lift a drag to (x, y) on the lever asks for.
export function dragAngle(view, id, x, y) { return (G0 - y) / PER_KG; }

// ---- drawing ----
function crate(ctx, x, y, {ghost = false} = {}) {
  ctx.save(); if (ghost) ctx.globalAlpha = .45;
  const g = ctx.createLinearGradient(x - CRATE.w / 2, y - CRATE.h / 2, x + CRATE.w / 2, y + CRATE.h / 2);
  g.addColorStop(0, '#b98a4e'); g.addColorStop(1, '#6e4b24');
  ctx.fillStyle = g; ctx.fillRect(x - CRATE.w / 2, y - CRATE.h / 2, CRATE.w, CRATE.h);
  ctx.strokeStyle = 'rgba(30,18,6,.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - CRATE.w / 2, y - CRATE.h / 2, CRATE.w, CRATE.h);
  ctx.beginPath(); ctx.moveTo(x - CRATE.w / 2, y - CRATE.h / 2); ctx.lineTo(x + CRATE.w / 2, y + CRATE.h / 2); ctx.moveTo(x + CRATE.w / 2, y - CRATE.h / 2); ctx.lineTo(x - CRATE.w / 2, y + CRATE.h / 2); ctx.stroke();
  ctx.font = '800 10px "Segoe UI", sans-serif'; ctx.fillStyle = '#f5e7c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('500', x, y + 1);
  ctx.restore();
}
function pad(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-PAD_HALF + 5, -4, 2 * PAD_HALF, 12);
  const g = ctx.createLinearGradient(0, -10, 0, 0); g.addColorStop(0, theme.beamLight); g.addColorStop(1, theme.beamDark);
  ctx.fillStyle = g; ctx.fillRect(-PAD_HALF, -10, 2 * PAD_HALF, 10);
  ctx.fillStyle = '#d6a43a'; for (let x = -PAD_HALF + 5; x < PAD_HALF - 5; x += 40) ctx.fillRect(x, -10, 20, 3);
}
function dial(ctx, feels, x, y) {
  ctx.fillStyle = theme.dial; ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 1.2;
  for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + i * Math.PI * .15; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); ctx.lineTo(x + Math.cos(a) * 25, y + Math.sin(a) * 25); ctx.stroke(); }
  const a = Math.PI * .75 + Math.min(1, feels / 5000) * Math.PI * 1.5;
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.stroke();
  text(ctx, `the pad feels ${kg(feels)}`, x + 40, y, {size: 17, align: 'left'});
}
function air(ctx, hx, hy, liftKg, time) {
  const n = Math.round(Math.min(1, liftKg / MOST_KG) * 6);
  ctx.strokeStyle = 'rgba(200,225,235,.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const x = hx - 100 + i * (200 / Math.max(1, n - 1)), y = hy - 20 + ((time * 120 + i * 37) % 80);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 4, y + 10); ctx.moveTo(x, y + 16); ctx.lineTo(x + 4, y + 10); ctx.stroke();
  }
}
function arrow(ctx, x, y, length, up, colour, width = 10) {
  if (length < 2) return;
  const dir = up ? -1 : 1, head = Math.min(16, length * .6);
  ctx.fillStyle = colour;
  ctx.fillRect(x - width / 2, up ? y - length + head : y, width, length - head);
  ctx.beginPath(); ctx.moveTo(x - width * 1.2, y + dir * (length - head)); ctx.lineTo(x + width * 1.2, y + dir * (length - head)); ctx.lineTo(x, y + dir * length); ctx.closePath(); ctx.fill();
}
// One helicopter and its load, in the pad's own units.
function drawSet(ctx, f, time, {rest = true, strain = false} = {}) {
  const g = setGeometry(f, {rest});
  pad(ctx);
  if (f.dropped) crate(ctx, LOAD_X + 120, -8 - CRATE.h / 2);
  if (g.loadedSet) {
    // Slings from the ring to the load, and the cable from her hook, slack until she takes it up.
    ctx.strokeStyle = theme.line; ctx.lineWidth = 1.4;
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
  text(ctx, `top ${Math.floor(f.most).toLocaleString('en-GB')}`, GX + 22, top - 14, {size: 13, align: 'left', colour: theme.text, weight: 600});
  if (view.mark) {
    const y = leverY(view.mark);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(GX - 18, y); ctx.lineTo(GX + 60, y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, kg(view.mark), GX + 64, y, {size: 14, align: 'left', colour: theme.accent});
  }
  if (view.gauge === 'weight') {
    const y = redLineY(f), glow = view.glow === 'lever:weight';
    ctx.strokeStyle = theme.bad; ctx.lineWidth = glow ? 4 + Math.sin(view.time * 6) * 1.5 : 3;
    ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX + 64, y); ctx.stroke();
    text(ctx, f.weight <= f.most ? 'her weight' : 'weight: above the top!', GX + 68, y, {size: 13, align: 'left', colour: theme.bad});
  }
  // The handle: a T grip the player drags.
  const y = leverY(lift), glow = view.glow === 'lever:up' || view.glow === 'lever:top';
  ctx.fillStyle = '#20262a'; ctx.fillRect(GX - 3, y, 6, 14);
  const grip = ctx.createLinearGradient(0, y - 12, 0, y + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(GX - 32, y - 10, 64, 16, 7); ctx.fill();
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(view.time * 6) * 1.5 : 1.5; ctx.stroke();
  if (interactive) { keyCap(ctx, GX - 22, G0 + 34, 'W'); text(ctx, 'up', GX - 8, G0 + 34, {size: 14, align: 'left'}); keyCap(ctx, GX + 26, G0 + 34, 'S'); text(ctx, 'down', GX + 40, G0 + 34, {size: 14, align: 'left'}); }
}
const STATUS = {pad: 'On the pad', taut: 'Cable tight: the load is still down', rising: 'Lifting', hovering: 'Hovering: holding still', climbing: 'Climbing', high: 'Still climbing', sinking: 'Sinking'};
function readouts(ctx, view) {
  const f = view.flight, kind = view.readouts;
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(BOX.x, BOX.y, BOX.w, BOX.h, 8); ctx.fill(); ctx.stroke();
  let y = BOX.y + 24;
  const row = (label, value, colour) => { text(ctx, label, BOX.x + 14, y, {size: 17, align: 'left', weight: 600}); text(ctx, value, BOX.x + BOX.w - 14, y, {size: 21, align: 'right', colour}); y += 30; };
  if (kind === 'lift' || kind === 'both') row('Lift', kg(f.lift), theme.good);
  if (kind === 'weight' || kind === 'both') row('Weight', kg(f.weight), theme.bad);
  if (kind === 'weight') for (const part of f.parts) { text(ctx, part, BOX.x + 14, y, {size: 14, align: 'left', weight: 600, colour: theme.faint}); y += 22; }
  if (kind === 'both') {
    // The two arrows side by side, on one scale: when they are the same length, she hovers.
    const mid = BOX.y + 150, per = 62 / SCALE_KG;
    ctx.strokeStyle = theme.faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(BOX.x + 40, mid); ctx.lineTo(BOX.x + BOX.w - 40, mid); ctx.stroke();
    arrow(ctx, BOX.x + 80, mid, f.lift * per, true, theme.good);
    arrow(ctx, BOX.x + 136, mid, f.weight * per, false, theme.bad);
    text(ctx, 'lift', BOX.x + 56, mid - 12, {size: 13, colour: theme.good, align: 'right'});
    text(ctx, 'weight', BOX.x + 156, mid + 12, {size: 13, colour: theme.bad, align: 'left'});
    text(ctx, STATUS[f.status], BOX.x + BOX.w / 2, BOX.y + BOX.h - 16, {size: 15, colour: f.status === 'hovering' ? theme.good : theme.accent});
  }
}
function stock(ctx, view) {
  const f = view.flight, spare = MAX_CRATES - f.crates;
  for (let i = 0; i < spare; i++) crate(ctx, STOCK_X + CRATE.w / 2 + (i % 2) * (CRATE.w + 2), GROUND_Y - CRATE.h / 2 - Math.floor(i / 2) * (CRATE.h + 2));
  if (view.glow === 'crate:add' && spare) halo(ctx, STOCK_X + CRATE.w, GROUND_Y - CRATE.h, 50, view.time);
  if (view.keys[1]) keyCap(ctx, STOCK_X + CRATE.w, GROUND_Y + 26, '1');
  if (view.keys[2] && f.crates) { keyCap(ctx, STOCK_X + CRATE.w + 26, GROUND_Y + 26, '2'); }
  if (view.stock === 'all') {
    if (!f.car) car(ctx, PARKED_CAR_X, GROUND_Y - 23, 0);
    if (view.glow === 'car') halo(ctx, ...(f.car ? toBoard(LOAD_X, -33) : [PARKED_CAR_X, GROUND_Y - 22]), 50, view.time);
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
  text(ctx, `${BAND_M[0]} to ${BAND_M[1]} m: the game’s band`, x1 - 5, y0 - 12, {size: 14, align: 'right', colour: theme.good});
}
function table(ctx, rows, x = 230, y = 20) {
  const w = 330, h = 30 + rows.length * 30;
  ctx.fillStyle = 'rgba(10,14,15,.65)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  rows.forEach((row, i) => {
    text(ctx, row.label, x + 14, y + 26 + i * 30, {size: 16, align: 'left', weight: 600});
    text(ctx, row.value ?? '…', x + w - 14, y + 26 + i * 30, {size: 18, align: 'right', colour: row.value ? theme.good : theme.faint});
  });
}
function drawPad(ctx, view) {
  background(ctx);
  const f = view.flight;
  if (view.band) band(ctx);
  ctx.save(); ctx.translate(PAD_X, GROUND_Y); ctx.scale(SCENE, SCENE);
  const g = drawSet(ctx, f, view.time, {strain: f.status === 'taut' && f.lift >= f.most - .5});
  if (view.air) air(ctx, g.hx, g.hy, f.lift, view.time);
  if (view.glow === 'rotor') halo(ctx, g.hx, g.hy - 35, 70, view.time);
  // Lift on the rotor, as an arrow: the same scale as the readout.
  if (view.readouts === 'lift' || view.readouts === 'both') arrow(ctx, g.hx, g.hy - 44, f.lift * .035, true, theme.good, 8);
  ctx.restore();
  dial(ctx, f.pad, PAD_X - 140, GROUND_Y + 42);
  if (view.stock) stock(ctx, view);
  if (view.gauge) gauge(ctx, view);
  if (view.readouts) readouts(ctx, view);
  if (view.table) table(ctx, view.table);
  if (view.keys.Space === 'rotor') keyCap(ctx, ...toBoard(g.hx, g.hy - 70), 'Space');
}
function drawThree(ctx, view) {
  background(ctx);
  const columns = [180, 500, 820];
  view.sets.forEach((f, i) => {
    ctx.save(); ctx.translate(columns[i] + 22, GROUND_Y - 40); ctx.scale(.62, .62);
    drawSet(ctx, f, view.time, {strain: f.status === 'taut' && f.lift >= f.most - .5});
    ctx.restore();
    if (!view.hideWeights) text(ctx, `weighs ${kg(f.weight)}`, columns[i], GROUND_Y + 2, {size: 19, colour: theme.bad});
    if (f.lift > 0) {
      const top = f.lift >= f.most - .5 && f.weight > f.most;
      text(ctx, top ? `lever at the top: ${kg(Math.floor(f.most))}` : `lift ${kg(f.lift)}`, columns[i], GROUND_Y + 30, {size: 17, colour: theme.good});
      text(ctx, f.status === 'hovering' ? 'hovers' : f.status === 'taut' ? 'stays down' : STATUS[f.status].toLowerCase(), columns[i], GROUND_Y + 58, {size: 20, colour: f.status === 'hovering' ? theme.good : theme.accent});
    }
  });
  text(ctx, `The most her rotor can push: ${kg(Math.floor(MOST_KG))}`, BOARD.width / 2, 40, {size: 20, colour: theme.accent});
}
function drawWonder(ctx, view) {
  outdoors(ctx);
  const f = view.flight;
  ctx.save(); ctx.translate(PAD_X, GROUND_Y); ctx.scale(SCENE, SCENE);
  const g = drawSet(ctx, f, view.time, {strain: f.status === 'taut'});
  air(ctx, g.hx, g.hy, f.lift, view.time);
  ctx.restore();
  if (f.status === 'taut') text(ctx, 'lever all the way up', ...toBoard(g.hx, g.hy - 62), {size: 18, colour: theme.accent});
  if (f.dropped && f.h > 0) text(ctx, 'one crate left behind', ...toBoard(LOAD_X + 120, -46), {size: 16, colour: theme.accent});
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 420); ctx.clip();
    ctx.translate(x + w / 2 - 20, 430); ctx.scale(.55, .55);
    const t = view.time;
    if (idea.id === 'match') { const f = mini({}, OWN_KG, 1.5 + Math.sin(t * 1.4) * .06); drawSet(ctx, f, t); arrow(ctx, 0, -40 - f.h * METRE - 44, OWN_KG * .04, true, theme.good, 10); arrow(ctx, 0, -40 - f.h * METRE + 40, OWN_KG * .04, false, theme.bad, 10); }
    if (idea.id === 'most') drawSet(ctx, mini({car: 1, crates: 2}, MOST_KG, 0, 1), t, {strain: true});
    if (idea.id === 'ease') { ctx.fillStyle = 'rgba(86,214,131,.14)'; ctx.fillRect(-PAD_HALF, -8 - BAND_M[1] * METRE, 2 * PAD_HALF, (BAND_M[1] - BAND_M[0]) * METRE); drawSet(ctx, mini({car: 1}, weightOf({car: 1}), 3.2 + Math.sin(t * 1.2) * .1, 1), t); }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 550, w - 30);
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
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const back = ctx.createLinearGradient(0, 0, 0, h);
  back.addColorStop(0, theme.back[0]); back.addColorStop(1, theme.back[1]);
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  ctx.save();
  if (picture.kind === 'verdict') {
    ctx.translate(w * .45, h - 6); ctx.scale(.42, .42);
    drawSet(ctx, mini({car: 1}, MOST_KG, picture.up ? 1.4 : 0, 1), .3);
    ctx.restore(); ctx.save();
    if (picture.up) arrow(ctx, w - 26, h * .7, h * .5, true, theme.good, 8);
    else { ctx.strokeStyle = theme.bad; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w - 40, 22); ctx.lineTo(w - 14, 48); ctx.moveTo(w - 14, 22); ctx.lineTo(w - 40, 48); ctx.stroke(); }
  }
  if (picture.kind === 'load') {
    ctx.translate(w * .42, h - 14); ctx.scale(.62, .62);
    const f = {crates: picture.crates ?? 0, car: picture.car ?? 0, h: 0, taut: 0, lift: 0};
    pad(ctx);
    const g = setGeometry(f);
    if (g.carAt) car(ctx, g.carAt.x, g.carAt.y, 0);
    for (const c of g.crates) crate(ctx, c.x, c.y);
  }
  if (picture.kind === 'motion') {
    ctx.translate(w * .42, h + 4); ctx.scale(.42, .42);
    drawSet(ctx, mini({car: 1}, weightOf({car: 1}), 1.5, 1), .3);
    ctx.restore(); ctx.save();
    if (picture.move === 'climb') arrow(ctx, w - 30, h * .78, h * .56, true, theme.good, 9);
    if (picture.move === 'sink') arrow(ctx, w - 30, h * .22, h * .56, false, theme.bad, 9);
    if (picture.move === 'hover') { ctx.fillStyle = theme.accent; ctx.fillRect(w - 44, h * .44, 28, 5); ctx.fillRect(w - 44, h * .56, 28, 5); }
  }
  if (picture.kind === 'lever') {
    const x = w / 2, y0 = h - 14, y1 = 16, at = {top: y1, match: (y0 + y1) / 2 + 6, bottom: y0}[picture.at];
    ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.fillRect(x - 8, y1 - 4, 16, y0 - y1 + 8);
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 30, (y0 + y1) / 2 + 6); ctx.lineTo(x + 30, (y0 + y1) / 2 + 6); ctx.stroke();
    const grip = ctx.createLinearGradient(0, at - 8, 0, at + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(1, theme.brass[2]);
    ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(x - 26, at - 7, 52, 13, 6); ctx.fill();
    text(ctx, 'weight', x + 36, (y0 + y1) / 2 + 6, {size: 13, colour: theme.bad, align: 'left'});
  }
  ctx.restore();
}
