// The Air and altitude lesson's board (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md): the mountain with its
// three places, the collective lever as a share, the weighing pad with Kestrel One and its load, the air jar, the column of
// air that shows why the air thins, and the bars that compare the push with the weight.
// Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, text, keyCap, helicopter, car, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
import {AIR, CAR_KG, CRATE_KG, HEIGHT, MOST, NAME, OWN_KG, RACK, airAt, bestCrates, dots, fuelPerMinute, hoverShare, kg, metres, pct} from './altitude-classroom.js';
export {BOARD};
// Pressing on the lever moves it there at once.
export const pressMovesDrag = true;

// The mountain, side on: Sea level at the foot, Summit Run at the top, drawn to its heights.
const MX0 = 16, MX1 = 236, FOOT_Y = 556, PEAK_Y = 118, PER_M = (FOOT_Y - PEAK_Y) / HEIGHT[2];
const placeY = i => FOOT_Y - HEIGHT[i] * PER_M;
const MARK_X = 206;
// Which place a point is on: its name plate above the line, or the line itself.
const placeAt = y => [0, 1, 2].find(i => y > placeY(i) - 40 && y < placeY(i) + 10);
// The lever: a share from 0 at the bottom to all the way up at the top.
const GX = 300, G0 = 560, G1 = 200;
const leverY = share => G0 - Math.max(0, Math.min(1, share)) * (G0 - G1);
// The pad scene, in its own units (ground at 0, pad centre at x 0).
const PAD_X = 575, PAD_HALF = 150, METRE = 24, CRATE = Object.freeze({w: 38, h: 32}), LOAD_X = 40, CABLE_PX = 80, HOOK = 22;
// The air jar and the readouts, on the right.
const JAR = Object.freeze({x: 772, y: 64, w: 112, h: 150}), SEA_JAR = Object.freeze({x: 906, y: 104, w: 72, h: 96});
const BOX = Object.freeze({x: 762, y: 262, w: 226});
const RACK_X = 760, LIFT_PX = .045, REST_X = -62;
// The keys drawn on the board: 1 and 2 under the rack, Space and lift off under the pad.
const KEY_ONE = [RACK_X + CRATE.w - 14, GROUND_Y + 26], KEY_TWO = [RACK_X + CRATE.w + 14, GROUND_Y + 26], LIFT_OFF = [PAD_X - 40, GROUND_Y + 34];

// ---- where everything is, in the pad's own units ----
function crateSpots(f) {
  const left = f.car ? LOAD_X + 46 : LOAD_X - (f.crates > 1 ? CRATE.w / 2 + 1 : 0) - CRATE.w / 2;
  return Array.from({length: f.crates}, (_, i) => ({x: left + (i % 2) * (CRATE.w + 2) + CRATE.w / 2, y: -8 - CRATE.h / 2 - Math.floor(i / 2) * (CRATE.h + 2)}));
}
function geometry(f) {
  const lift = f.h * METRE, loadedSet = f.crates > 0 || f.car > 0;
  if (!loadedSet) return {hx: 0, hy: -40 - lift, loadedSet, crates: [], carAt: null, ring: null, k: 1};
  const crates = crateSpots(f).map(c => ({...c, y: c.y - lift}));
  const carAt = f.car ? {x: LOAD_X, y: -31 - lift} : null;
  const top = Math.min(carAt ? carAt.y - 12 : 0, ...crates.map(c => c.y - CRATE.h / 2));
  const ringX = carAt ? (crates.length ? LOAD_X + 24 : LOAD_X) : crates.reduce((s, c) => s + c.x, 0) / crates.length;
  const ring = {x: ringX, y: top - 24};
  // The helicopter waits beside the load until the lever comes up, then rises to hold the cable above the load.
  const k = f.h > 0 ? 1 : Math.min(1, f.lever / .15), s = k * k * (3 - 2 * k);
  return {hx: REST_X + (ring.x - REST_X) * s, hy: -40 + (ring.y - CABLE_PX - HOOK + 40) * s, loadedSet, crates, carAt, ring, k: s};
}
const toBoard = (lx, ly) => [PAD_X + lx, GROUND_Y + ly];

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.keys.W && x > GX - 50 && x < GX + 80 && y > G1 - 24 && y < G0 + 20) return {drag: 'lever', action: 'release'};
  if (view.keys['↑'] === 'place:up' && x > MX0 && x < MX1 && placeAt(y) !== undefined) return {action: `place:${placeAt(y)}`};
  if (view.keys.Space === 'scoop' && x > JAR.x - 10 && x < JAR.x + JAR.w + 10 && y > JAR.y - 20 && y < JAR.y + JAR.h + 10) return {action: 'scoop'};
  const f = view.flight;
  if (!f || view.scene !== 'stand') return null;
  const g = geometry(f), lx = x - PAD_X, ly = y - GROUND_Y;
  if (view.keys.Space === 'rotor' && Math.abs(lx - g.hx) < 130 && ly > g.hy - 90 && ly < g.hy + 34) return {action: 'rotor'};
  if (view.keys[2] === 'crate:remove' && f.crates && Math.hypot(x - KEY_TWO[0], y - KEY_TWO[1]) < 14) return {action: 'crate:remove'};
  if (view.keys[1] === 'crate:add' && x > RACK_X - 8 && x < RACK_X + 2 * CRATE.w + 12 && y > GROUND_Y - 3 * CRATE.h - 14 && y < GROUND_Y + 40) return {action: 'crate:add'};
  if (view.keys[2] === 'crate:remove' && g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 + 4 && Math.abs(ly - c.y) < CRATE.h / 2 + 4)) return {action: 'crate:remove'};
  if (view.keys.Space === 'go' && lx > -PAD_HALF - 60 && lx < PAD_HALF + 20 && ly > -6 && ly < 52) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene === 'wonder' || view.scene === 'recap') return null;
  if (view.mountain !== false && x > MX0 && x < MX1 && y > PEAK_Y - 40 && y < FOOT_Y + 20) {
    const i = placeAt(y);
    if (i !== undefined) return `${NAME[i]} is ${metres(HEIGHT[i])} above the sea.` + (view.jar ? ` A jar of air here holds ${dots(AIR[i])} dots, where a jar from ${NAME[0]} holds 100.` : '');
    return `The mountain is drawn to scale, with ${NAME[0]} at the foot and ${NAME[2]} at the top.`;
  }
  if (view.jar && x > JAR.x && x < JAR.x + JAR.w && y > JAR.y && y < JAR.y + JAR.h) return 'This jar holds air from where the stand is. Each dot stands for one hundredth of the air in a jar from Sea level, so more dots mean denser air.';
  if (view.jar?.sea && x > SEA_JAR.x && x < SEA_JAR.x + SEA_JAR.w && y > SEA_JAR.y && y < SEA_JAR.y + SEA_JAR.h) return 'This is the same jar filled at Sea level, drawn with 100 dots.';
  const f = view.flight;
  if (!f) return null;
  if (view.lever && x > GX - 50 && x < GX + 90 && y > G1 - 30 && y < G0 + 20) {
    if (view.lever.red && Math.abs(y - redLineY(f)) < 8) return f.hover <= 1 ? `The red line marks the lever setting that makes the helicopter hover here, which is ${pct(f.hover)}. At that setting the push equals the weight.` : 'The red line is above the top of the lever, so the helicopter cannot lift this weight here.';
    if (view.readouts && !view.readouts.most) return `The collective lever is ${pct(f.lever)} of the way up.`;
    return `The collective lever is ${pct(f.lever)} of the way up, which gives ${kg(f.lift)} of push here. All the way up the rotor pushes ${kg(f.most)}.`;
  }
  if (view.readouts && x > BOX.x && x < BOX.x + BOX.w && y > BOX.y && y < BOX.y + 200) return 'Green shows the push, and the outline shows the most the rotor can give at this place. Red shows the weight, which is the same at every place.';
  const g = geometry(f), lx = x - PAD_X, ly = y - GROUND_Y;
  if (Math.abs(lx - g.hx) < 128 && ly > g.hy - 46 && ly < g.hy - 26) return 'The rotor is the set of long blades that throw air down. The air pushes back and holds the helicopter up.';
  if (Math.abs(lx - g.hx) < 60 && ly > g.hy - 28 && ly < g.hy + 34) return `Kestrel One, with its pilot and a full tank, weighs ${kg(OWN_KG)}.`;
  if (g.carAt && Math.abs(lx - g.carAt.x) < 42 && Math.abs(ly - g.carAt.y) < 26) return `The Dusthawk rally car weighs ${kg(CAR_KG)}.`;
  if (g.crates.some(c => Math.abs(lx - c.x) < CRATE.w / 2 && Math.abs(ly - c.y) < CRATE.h / 2)) return `A crate weighs ${kg(CRATE_KG)}.`;
  if (view.rack && x > RACK_X - 8 && x < RACK_X + 2 * CRATE.w + 12 && y > GROUND_Y - 3 * CRATE.h - 14 && y < GROUND_Y) return `The spare crates weigh ${kg(CRATE_KG)} each.` + (view.keys[1] ? ' Click to load one.' : '');
  return null;
}
const redLineY = f => f.hover <= 1 ? leverY(f.hover) : leverY(1) - 16;
const markerPoint = place => [MARK_X, placeY(place) - 12];
export function targetPoint(view, action) {
  const [kind, value] = action.split(':');
  if (kind === 'place') return markerPoint(Number(value));
  if (action === 'scoop') return [JAR.x + JAR.w / 2, JAR.y + JAR.h / 2];
  const f = view.flight;
  if (!f) return null;
  const g = geometry(f);
  if (action === 'lever:top') return [GX, leverY(1)];
  if (action === 'lever:weight') return [GX, leverY(Math.min(1, f.hover))];
  if (kind === 'lever') return [GX, leverY(f.lever)];
  if (action === 'rotor') return toBoard(g.hx, g.hy - 35);
  if (action === 'crate:add') return [RACK_X + CRATE.w, GROUND_Y - CRATE.h];
  if (action === 'crate:remove') { const c = g.crates.at(-1); return c ? toBoard(c.x, c.y) : null; }
  if (action === 'go' || action === 'set:next') return LIFT_OFF;
  return null;
}
// The lever share a drag to (x, y) asks for.
export function dragAngle(view, id, x, y) { return (G0 - y) / (G0 - G1); }

// ---- drawing ----
function crate(ctx, x, y) {
  const g = ctx.createLinearGradient(x - CRATE.w / 2, y - CRATE.h / 2, x + CRATE.w / 2, y + CRATE.h / 2);
  g.addColorStop(0, '#b98a4e'); g.addColorStop(1, '#6e4b24');
  ctx.fillStyle = g; ctx.fillRect(x - CRATE.w / 2, y - CRATE.h / 2, CRATE.w, CRATE.h);
  ctx.strokeStyle = 'rgba(30,18,6,.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - CRATE.w / 2, y - CRATE.h / 2, CRATE.w, CRATE.h);
  ctx.beginPath(); ctx.moveTo(x - CRATE.w / 2, y - CRATE.h / 2); ctx.lineTo(x + CRATE.w / 2, y + CRATE.h / 2); ctx.moveTo(x + CRATE.w / 2, y - CRATE.h / 2); ctx.lineTo(x - CRATE.w / 2, y + CRATE.h / 2); ctx.stroke();
  ctx.font = '800 10px "Segoe UI", sans-serif'; ctx.fillStyle = '#f5e7c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('500', x, y + 1);
}
function pad(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-PAD_HALF + 5, -4, 2 * PAD_HALF, 12);
  const g = ctx.createLinearGradient(0, -10, 0, 0); g.addColorStop(0, theme.beamLight); g.addColorStop(1, theme.beamDark);
  ctx.fillStyle = g; ctx.fillRect(-PAD_HALF, -10, 2 * PAD_HALF, 10);
  ctx.fillStyle = '#d6a43a'; for (let x = -PAD_HALF + 5; x < PAD_HALF - 5; x += 40) ctx.fillRect(x, -10, 20, 3);
}
function arrow(ctx, x, y, length, up, colour, width = 10) {
  if (length < 2) return;
  const dir = up ? -1 : 1, head = Math.min(16, length * .6);
  ctx.fillStyle = colour;
  ctx.fillRect(x - width / 2, up ? y - length + head : y, width, length - head);
  ctx.beginPath(); ctx.moveTo(x - width * 1.2, y + dir * (length - head)); ctx.lineTo(x + width * 1.2, y + dir * (length - head)); ctx.lineTo(x, y + dir * length); ctx.closePath(); ctx.fill();
}
// Air thrown down by the rotor: one falling dot for each bit of air, so fewer dots where the air is thin.
function air(ctx, hx, hy, share, time) {
  const n = Math.round(44 * share);
  ctx.fillStyle = 'rgba(196,237,223,.75)';
  for (let i = 0; i < n; i++) {
    const x = hx - 104 + ((i * 37) % 44) * (208 / 43), y = hy - 24 + ((time * 110 + i * 29) % 76);
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  }
}
function spaceKey(ctx, x, y) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 26, y - 10, 52, 20, 3); ctx.fill();
  text(ctx, 'Space', x, y + 1, {size: 12, colour: '#1d2224', weight: 800});
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
// One helicopter and its load, in the pad's own units.
function drawSet(ctx, f, time, {strain = false} = {}) {
  const g = geometry(f);
  pad(ctx);
  if (g.loadedSet) {
    ctx.strokeStyle = theme.line; ctx.lineWidth = 1.4;
    for (const c of g.crates) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(c.x, c.y - CRATE.h / 2); ctx.stroke(); }
    if (g.carAt) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x - 26, g.carAt.y - 4); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x + 26, g.carAt.y - 4); ctx.stroke(); }
    const hookX = g.hx, hookY = g.hy + HOOK, sag = (1 - g.k) * 14;
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hookX, hookY);
    ctx.quadraticCurveTo((hookX + g.ring.x) / 2, Math.max(hookY, g.ring.y) + sag, g.ring.x, g.ring.y); ctx.stroke();
    if (g.carAt) car(ctx, g.carAt.x, g.carAt.y, 0);
    for (const c of g.crates) crate(ctx, c.x, c.y);
  }
  const shake = strain ? Math.sin(time * 47) * 1.6 : 0;
  helicopter(ctx, g.hx + shake, g.hy, 0, f.lever > 0 ? time : 0);
  return g;
}

// A rock mountain with a snow cap: its peak at height py, seven tenths of the way from left to right; feet on the ground line gy.
function peak(ctx, py, left, right, gy) {
  const w = right - left, h = gy - py, at = (fx, fy) => [left + fx * w, py + fy * h], top = .7;
  const rock = ctx.createLinearGradient(0, py, 0, gy);
  rock.addColorStop(0, '#6f766c'); rock.addColorStop(1, '#30362f');
  const outline = [[0, 1], [.18, .78], [.3, .7], [.42, .46], [.52, .38], [.62, .2], [top, 0], [.8, .16], [.86, .3], [.93, .5], [1, .62], [1, 1]];
  ctx.fillStyle = rock; ctx.beginPath(); outline.forEach(([fx, fy], i) => ctx[i ? 'lineTo' : 'moveTo'](...at(fx, fy))); ctx.closePath(); ctx.fill();
  // A darker shoulder on the shaded side, then the snow cap with a ragged edge.
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(...at(top, 0)); ctx.lineTo(...at(.8, .16)); ctx.lineTo(...at(.86, .3)); ctx.lineTo(...at(.93, .5)); ctx.lineTo(...at(1, .62)); ctx.lineTo(...at(1, 1)); ctx.lineTo(...at(.74, 1)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e4e8e6'; ctx.beginPath();
  [[.58, .26], [.62, .2], [top, 0], [.8, .16], [.84, .25], [.78, .22], [.74, .29], [.69, .21], [.64, .3]].forEach(([fx, fy], i) => ctx[i ? 'lineTo' : 'moveTo'](...at(fx, fy)));
  ctx.closePath(); ctx.fill();
}
function mountain(ctx, view, place) {
  ctx.fillStyle = 'rgba(10,14,15,.45)'; ctx.beginPath(); ctx.roundRect(MX0 - 6, 40, MX1 - MX0 + 12, FOOT_Y - 10, 8); ctx.fill();
  // The mountain, then the sea at its foot.
  peak(ctx, PEAK_Y - 8, MX0 + 20, MX1 + 4, FOOT_Y);
  ctx.fillStyle = '#2f5a6e'; ctx.fillRect(MX0, FOOT_Y, MX1 - MX0, 14);
  text(ctx, 'Altitude', (MX0 + MX1) / 2, 58, {size: 17, colour: theme.accent});
  for (let i = 0; i < 3; i++) {
    const y = placeY(i), here = i === place;
    ctx.strokeStyle = here ? theme.accent : theme.faint; ctx.lineWidth = here ? 2.5 : 1.2; ctx.setLineDash(here ? [] : [5, 4]);
    ctx.beginPath(); ctx.moveTo(MX0 + 4, y); ctx.lineTo(MX1 - 4, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(10,14,15,.72)'; ctx.beginPath(); ctx.roundRect(MX0 + 2, y - 38, 138, 36, 5); ctx.fill();
    text(ctx, NAME[i], MX0 + 8, y - 26, {size: 16, align: 'left', colour: here ? theme.accent : theme.text});
    text(ctx, metres(HEIGHT[i]), MX0 + 8, y - 9, {size: 14, align: 'left', weight: 600, colour: here ? theme.text : theme.faint});
  }
  if (place != null) {
    const [x, y] = markerPoint(place);
    helicopter(ctx, x, y, 0, 0, .22);
    if (view.glow === 'mountain') halo(ctx, ...markerPoint(2), 26, view.time);
  }
  if (view.keys['↑'] === 'place:up') { keyCap(ctx, MX0 + 40, FOOT_Y + 36, '↑'); text(ctx, 'up', MX0 + 56, FOOT_Y + 36, {size: 14, align: 'left'}); keyCap(ctx, MX0 + 120, FOOT_Y + 36, '↓'); text(ctx, 'down', MX0 + 136, FOOT_Y + 36, {size: 14, align: 'left'}); }
}

// A jar of air: 100 places for a bit of air, filled evenly so thin air shows its gaps.
const SLOTS = Array.from({length: 100}, (_, i) => (i * 37) % 100);
function jar(ctx, box, share, {label, glow = false, time = 0, unknown = false} = {}) {
  ctx.fillStyle = 'rgba(160,200,215,.10)'; ctx.strokeStyle = glow ? theme.accent : 'rgba(200,225,235,.7)'; ctx.lineWidth = glow ? 3 + Math.sin(time * 6) * 1.5 : 2;
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = theme.beamLight; ctx.fillRect(box.x + 6, box.y - 8, box.w - 12, 8);
  const n = Math.round(share * 100), dx = (box.w - 14) / 10, dy = (box.h - 14) / 10, r = Math.min(dx, dy) * .28;
  const shown = new Set(SLOTS.slice(0, n));
  ctx.fillStyle = '#c4eddf';
  for (let i = 0; i < 100; i++) if (shown.has(i)) { ctx.beginPath(); ctx.arc(box.x + 7 + dx * (i % 10 + .5), box.y + 7 + dy * (Math.floor(i / 10) + .5), r, 0, Math.PI * 2); ctx.fill(); }
  if (unknown) text(ctx, '?', box.x + box.w / 2, box.y + box.h / 2, {size: 40, colour: theme.accent});
  if (label) text(ctx, label, box.x + box.w / 2, box.y + box.h + 18, {size: 15, weight: 600});
}
function jars(ctx, view, place) {
  const j = view.jar;
  text(ctx, `${NAME[place]} · ${metres(HEIGHT[place])}`, BOARD.width - 14, 30, {size: 18, colour: theme.accent, align: 'right'});
  const empty = !j.scooping && j.share === 0;
  jar(ctx, JAR, j.share, {label: empty ? 'empty jar' : `${dots(j.share)} dots of air`, glow: view.glow === 'jar', time: view.time, unknown: empty});
  if (j.sea) jar(ctx, SEA_JAR, 1, {label: 'Sea level: 100'});
}
function readouts(ctx, view) {
  const f = view.flight, r = view.readouts;
  const rows = [];
  if (r.most) rows.push(['Most push here', kg(f.most), theme.good]);
  if (r.seaMost) rows.push(['At Sea level', kg(MOST[0]), theme.faint]);
  if (r.weight) rows.push(['Weight', kg(f.weight), theme.bad]);
  if (r.hover) rows.push(['Lever to hover', f.hover <= 1 ? pct(f.hover) : 'over 100%', f.hover <= 1 ? theme.accent : theme.bad]);
  if (r.fuel) rows.push(['Fuel a minute', `${fuelPerMinute(Math.min(1, f.hover)).toFixed(1)} kg`, theme.accent]);
  const h = 18 + rows.length * 34;
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(BOX.x, BOX.y, BOX.w, h, 8); ctx.fill(); ctx.stroke();
  rows.forEach(([label, value, colour], i) => {
    const y = BOX.y + 26 + i * 34;
    text(ctx, label, BOX.x + 12, y, {size: 15, align: 'left', weight: 600});
    text(ctx, value, BOX.x + BOX.w - 12, y, {size: 19, align: 'right', colour});
  });
  if (r.weight) balance(ctx, f, r.most, BOX.y + h + 8);
}
// The push against the weight, to one scale: the helicopter leaves the ground when the green bar passes the red mark.
function balance(ctx, f, showMost, top) {
  const left = BOX.x + 56, full = BOX.w - 60, per = full / 4300, row = (y, label, colour, value) => {
    text(ctx, label, BOX.x + 2, y + 9, {size: 13, align: 'left', weight: 700, colour});
    ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.fillRect(left, y, full, 18);
    ctx.fillStyle = colour; ctx.fillRect(left, y, Math.min(full, value * per), 18);
  };
  row(top, 'Push', theme.good, f.lift);
  row(top + 24, 'Weight', theme.bad, f.weight);
  if (showMost) { ctx.strokeStyle = theme.good; ctx.lineWidth = 2; ctx.strokeRect(left, top, Math.min(full, f.most * per), 18); }
  const x = left + Math.min(full, f.weight * per);
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top - 3); ctx.lineTo(x, top + 21); ctx.stroke();
}
// Why the air thins: a column of the air above the sea, drawn to scale, with its dots from the bench's own air rule.
const COLUMN = Object.freeze({x: 262, y: 40, w: 490, h: 424, left: 284, right: 450, ground: 426, top: 96, topM: 11_000});
function airColumn(ctx, place) {
  const c = COLUMN, yAt = m => c.ground - m / c.topM * (c.ground - c.top), gap = 7;
  ctx.fillStyle = 'rgba(10,14,15,.72)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'Why the air thins with height', c.x + c.w / 2, c.y + 20, {size: 18, colour: theme.accent});
  ctx.fillStyle = 'rgba(160,200,215,.10)'; ctx.fillRect(c.left, c.top, c.right - c.left, c.ground - c.top);
  ctx.fillStyle = '#c4eddf';
  for (let row = 0, y = c.ground - 4; y > c.top; row++, y -= gap) {
    const share = airAt((c.ground - y) / (c.ground - c.top) * c.topM);
    for (let col = 0, x = c.left + 5; x < c.right - 2; col++, x += gap)
      if ((col * 37 + row * 61) % 100 < share * 100) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  // The air above presses down: an arrow at each height, longer where more air is above.
  for (const m of [10_000, 6_000, HEIGHT[2], 0]) {
    const length = 16 + 54 * airAt(m), end = yAt(m);
    arrow(ctx, c.right + 24, end - length, length, false, theme.bad, 6);
  }
  const label = (m, words, here) => {
    ctx.strokeStyle = here ? theme.accent : theme.faint; ctx.lineWidth = here ? 2.5 : 1; ctx.beginPath(); ctx.moveTo(c.left, yAt(m)); ctx.lineTo(c.right + 44, yAt(m)); ctx.stroke();
    text(ctx, words, c.right + 50, yAt(m), {size: 14, align: 'left', weight: 600, colour: here ? theme.accent : theme.text});
  };
  label(c.topM, `${metres(c.topM)}: ${pct(airAt(c.topM))} of the air in a jar`, false);
  [2, 1, 0].forEach(i => label(HEIGHT[i], `${NAME[i]}, ${metres(HEIGHT[i])}`, i === place));
  wrap(ctx, 'Higher up, less air presses from above, so the particles spread out.', c.right + 150, 150, 262, {size: 15, line: 20, weight: 600});
  wrap(ctx, 'Lower down, all of the air above presses down and squeezes the particles together.', c.right + 150, 262, 262, {size: 15, line: 20, weight: 600});
  text(ctx, 'Each arrow is the air above pressing down.', c.x + c.w / 2, c.y + c.h - 12, {size: 13, weight: 600, colour: theme.faint});
}
function lever(ctx, view) {
  const f = view.flight, l = view.lever, interactive = Boolean(view.keys.W);
  text(ctx, 'Collective lever', GX + 10, G1 - 40, {size: 17, colour: theme.accent});
  ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.beginPath(); ctx.roundRect(GX - 12, G1 - 14, 24, G0 - G1 + 28, 10); ctx.fill();
  ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.stroke();
  for (let n = 0; n <= 10; n++) {
    const y = leverY(n / 10), big = n % 5 === 0;
    ctx.strokeStyle = theme.faint; ctx.lineWidth = big ? 2 : 1; ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX - (big ? 30 : 25), y); ctx.stroke();
    if (big) text(ctx, `${n * 10}%`, GX - 38, y, {size: 13, align: 'right', weight: 600, colour: theme.faint});
  }
  ctx.fillStyle = theme.good; ctx.globalAlpha = .55; ctx.fillRect(GX - 6, leverY(f.lever), 12, G0 - leverY(f.lever)); ctx.globalAlpha = 1;
  ctx.fillStyle = theme.beamLight; ctx.fillRect(GX - 18, leverY(1) - 4, 36, 5);
  if (!(l.red && f.hover > 1)) text(ctx, 'all the way up', GX + 22, leverY(1) - 16, {size: 12, align: 'left', colour: theme.faint, weight: 600});
  if (l.ghost != null) {
    const y = leverY(l.ghost);
    ctx.strokeStyle = theme.ghost; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX + 60, y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `${pct(l.ghost)} at Sea level`, GX + 64, y, {size: 13, align: 'left', colour: theme.ghost});
  }
  if (l.unknown) text(ctx, 'red line here: ?', GX + 22, leverY(.75), {size: 14, align: 'left', colour: theme.bad});
  if (l.red) {
    const y = redLineY(f), glow = view.glow === 'lever:weight';
    ctx.strokeStyle = theme.bad; ctx.lineWidth = glow ? 4 + Math.sin(view.time * 6) * 1.5 : 3;
    ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX + 64, y); ctx.stroke();
    text(ctx, f.hover <= 1 ? `hover ${pct(f.hover)}` : 'hover: above the top!', GX + 68, y, {size: 13, align: 'left', colour: theme.bad});
  }
  const y = leverY(f.lever), glow = view.glow === 'lever:top' || view.glow === 'lever:weight';
  ctx.fillStyle = '#20262a'; ctx.fillRect(GX - 3, y, 6, 14);
  const grip = ctx.createLinearGradient(0, y - 12, 0, y + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(GX - 32, y - 10, 64, 16, 7); ctx.fill();
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(view.time * 6) * 1.5 : 1.5; ctx.stroke();
  if (glow && view.glow === 'lever:top') halo(ctx, GX, leverY(1), 34, view.time);
  if (interactive) { keyCap(ctx, GX - 22, G0 + 36, 'W'); text(ctx, 'up', GX - 8, G0 + 36, {size: 14, align: 'left'}); keyCap(ctx, GX + 26, G0 + 36, 'S'); text(ctx, 'down', GX + 40, G0 + 36, {size: 14, align: 'left'}); }
}
function rack(ctx, view) {
  const f = view.flight, spare = RACK - f.crates;
  for (let i = 0; i < spare; i++) crate(ctx, RACK_X + CRATE.w / 2 + (i % 2) * (CRATE.w + 2), GROUND_Y - CRATE.h / 2 - Math.floor(i / 2) * (CRATE.h + 2));
  if (view.glow === 'crate:add' && spare) halo(ctx, RACK_X + CRATE.w, GROUND_Y - CRATE.h, 50, view.time);
  if (view.keys[1]) keyCap(ctx, ...KEY_ONE, '1');
  if (view.keys[2] && f.crates) keyCap(ctx, ...KEY_TWO, '2');
}
function resultsTable(ctx, rows) {
  const x = 352, y = 8, w = 404, cols = [x + 10, x + 136, x + 232, x + 316, x + w - 10];
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, 132, 6); ctx.fill(); ctx.stroke();
  [['Place', 'left'], ['Crates', 'left'], ['Weight', 'right'], ['Most push', 'right'], ['Lever', 'right']].forEach(([h, align], i) => text(ctx, h, cols[i], y + 18, {size: 13, align, colour: theme.faint}));
  if (!rows.length) text(ctx, 'Your results will appear here.', x + w / 2, y + 74, {size: 15, colour: theme.faint});
  rows.slice(-4).forEach((row, i) => {
    const ry = y + 42 + i * 24;
    text(ctx, row.name, cols[0], ry, {size: 14, align: 'left', weight: 600});
    text(ctx, String(row.crates), cols[1], ry, {size: 15, align: 'left', weight: 600});
    text(ctx, kg(row.weight), cols[2], ry, {size: 14, align: 'right', weight: 600, colour: theme.bad});
    text(ctx, kg(row.most), cols[3], ry, {size: 14, align: 'right', weight: 600, colour: theme.good});
    text(ctx, row.hover <= 1 ? pct(row.hover) : 'too heavy', cols[4], ry, {size: 14, align: 'right', colour: row.hover <= 1 ? theme.accent : theme.bad});
  });
}
function table(ctx, rows, {hideAir = false, hideMost = false} = {}) {
  const x = 352, y = 8, w = 404, cols = [x + 12, x + 150, x + 226, x + w - 12];
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, 132, 6); ctx.fill(); ctx.stroke();
  [['Place', 'left'], ['Height', 'left'], ['Air in a jar', 'left'], ['Most push', 'right']].forEach(([h, align], i) => text(ctx, h, cols[i], y + 20, {size: 14, align, colour: theme.faint}));
  rows.forEach((row, i) => {
    const ry = y + 50 + i * 28;
    if (!row) { text(ctx, '…', cols[0], ry, {size: 16, align: 'left', colour: theme.faint}); return; }
    text(ctx, row.name, cols[0], ry, {size: 16, align: 'left', weight: 600});
    text(ctx, metres(row.height), cols[1], ry, {size: 16, align: 'left', weight: 600});
    text(ctx, hideAir ? '?' : `${dots(row.air)} dots`, cols[2], ry, {size: 16, align: 'left', weight: 600});
    text(ctx, hideMost ? '?' : kg(row.most), cols[3], ry, {size: 17, align: 'right', colour: theme.good});
  });
}
const STATUS = {pad: 'On the pad', stays: 'The load stays down', rising: 'Lifting', hovering: 'Hovering', climbing: 'Climbing', sinking: 'Sinking'};
function drawStand(ctx, view) {
  background(ctx);
  const f = view.flight;
  mountain(ctx, view, f?.place);
  if (!f) return;
  ctx.save(); ctx.translate(PAD_X, GROUND_Y);
  const g = drawSet(ctx, f, view.time, {strain: f.status === 'stays'});
  if (view.air) air(ctx, g.hx, g.hy, f.air, view.time);
  if (view.caption) text(ctx, 'air thrown down', g.hx - 62, g.hy + 62, {size: 14, colour: '#c4eddf', weight: 700});
  if (view.glow === 'rotor') halo(ctx, g.hx, g.hy - 35, 70, view.time);
  if (f.lever > 0) {
    arrow(ctx, g.hx + 66, g.hy - 30, f.lift * LIFT_PX, true, theme.good, 9);
    // The label sits to the right of the arrow, or to its left when the readouts leave no room.
    const roomRight = PAD_X + g.hx + 80 + 116 < BOX.x;
    text(ctx, `push ${kg(f.lift)}`, g.hx + (roomRight ? 80 : 52), g.hy - 30 - f.lift * LIFT_PX + 10, {size: 15, align: roomRight ? 'left' : 'right', colour: theme.good});
    if (view.readouts?.seaMost) {
      ctx.strokeStyle = theme.ghost; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      const top = g.hy - 30 - MOST[0] * LIFT_PX; ctx.beginPath(); ctx.moveTo(g.hx + 52, top); ctx.lineTo(g.hx + 80, top); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, `Sea level ${kg(MOST[0])}`, g.hx + 48, top, {size: 13, align: 'right', colour: theme.ghost});
    }
  }
  ctx.restore();
  if (f.lever > 0 || f.h > 0) text(ctx, STATUS[f.status], view.keys.Space === 'go' ? PAD_X + 100 : PAD_X, GROUND_Y + 34, {size: 18, colour: f.status === 'hovering' ? theme.good : theme.accent});
  if (view.keys.Space === 'rotor') spaceKey(ctx, ...toBoard(g.hx, g.hy - 74));
  if (view.keys.Space === 'go') { spaceKey(ctx, ...LIFT_OFF); text(ctx, 'lift off', LIFT_OFF[0] + 34, LIFT_OFF[1], {size: 15, align: 'left'}); if (view.glow === 'go') halo(ctx, LIFT_OFF[0] + 30, LIFT_OFF[1], 50, view.time); }
  if (view.lever) lever(ctx, view);
  if (view.jar) jars(ctx, view, f.place);
  if (view.readouts) readouts(ctx, view);
  if (view.rack) rack(ctx, view);
  if (view.table) table(ctx, view.table);
  if (view.results) resultsTable(ctx, view.results);
  if (view.column) airColumn(ctx, f.place);
  if (view.job) text(ctx, `Delivery ${view.job.delivery} of ${view.job.of}: ${NAME[view.job.delivery - 1]}`, PAD_X, 40, {size: 20, colour: theme.accent});
}
function drawWonder(ctx, view) {
  outdoors(ctx);
  // A snow-capped mountain behind the right pad, so it reads as high up.
  peak(ctx, 170, 470, 1000, GROUND_Y);
  view.sets.forEach((f, i) => {
    const cx = i === 0 ? 270 : 740;
    ctx.save(); ctx.translate(cx, GROUND_Y); ctx.scale(.8, .8);
    const g = drawSet(ctx, f, view.time, {strain: f.status === 'stays'});
    air(ctx, g.hx, g.hy, f.air, view.time);
    ctx.restore();
    text(ctx, `${NAME[f.place]} · ${metres(HEIGHT[f.place])}`, cx, 70, {size: 22, colour: theme.accent});
    if (f.lever > 0) {
      text(ctx, 'lever all the way up', cx, 104, {size: 17});
      if (view.time > 2.4) text(ctx, f.status === 'stays' ? 'the car stays down' : 'the car lifts', cx, 136, {size: 22, colour: f.status === 'stays' ? theme.bad : theme.good});
    }
  });
}
function drawCheck(ctx, view) {
  background(ctx);
  mountain(ctx, {...view, keys: {}}, null);
  // Every place's air and push, for the questions to use. While a question is open, the board keeps back what would settle it.
  const open = !view.answered, hideAir = open && view.check === 'check-why', hideMost = open && view.check === 'check-car';
  table(ctx, [0, 1, 2].map(i => ({name: NAME[i], height: HEIGHT[i], air: AIR[i], most: MOST[i]})), {hideAir, hideMost});
  if (hideAir) text(ctx, 'The answer will appear here once you have picked a card.', 600, 310, {size: 17, colour: theme.faint});
  else {
    jar(ctx, {x: 380, y: 230, w: 130, h: 170}, 1, {label: 'Sea level: 100 dots'});
    jar(ctx, {x: 560, y: 230, w: 130, h: 170}, AIR[2], {label: `${NAME[2]}: ${dots(AIR[2])} dots`});
  }
  text(ctx, `Kestrel One ${kg(OWN_KG)} · Dusthawk ${kg(CAR_KG)} · a crate ${kg(CRATE_KG)}`, 600, 470, {size: 17, colour: theme.faint});
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 320); ctx.clip();
    if (idea.id === 'thin') { jar(ctx, {x: x + 40, y: 150, w: 100, h: 140}, 1, {label: 'Sea level'}); jar(ctx, {x: x + 160, y: 150, w: 100, h: 140}, AIR[2], {label: NAME[2]}); }
    if (idea.id === 'load') [0, 1, 2].forEach(p => {
      const cx = x + 55 + p * 95;
      for (let c = 0; c < bestCrates(p); c++) { ctx.save(); ctx.translate(cx, 350 - c * 36); crate(ctx, 0, 0); ctx.restore(); }
      text(ctx, NAME[p].split(' ')[0], cx, 386, {size: 15, weight: 600});
    });
    if (idea.id === 'fuel') {
      const cx = x + w / 2 - 50, top = 110, bottom = 390, at = s => bottom - s * (bottom - top);
      ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.fillRect(cx - 10, top, 20, bottom - top);
      for (const [s, colour, label] of [[hoverShare(0), theme.ghost, `Sea level ${pct(hoverShare(0))}`], [hoverShare(2), theme.bad, `${NAME[2]} ${pct(hoverShare(2))}`]]) {
        ctx.strokeStyle = colour; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 30, at(s)); ctx.lineTo(cx + 30, at(s)); ctx.stroke();
        text(ctx, label, cx + 36, at(s), {size: 14, align: 'left', colour});
      }
    }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 426, w - 30, {size: 19, weight: 600});
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'wonder') drawWonder(ctx, view);
    else if (view.scene === 'check') drawCheck(ctx, view);
    else if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawStand(ctx, view);
  });
}

// ---- the card pictures ----
const mini = (place, load, lever, h) => ({place, crates: load.crates ?? 0, car: load.car ?? 0, lever, h, status: 'pad'});
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const back = ctx.createLinearGradient(0, 0, 0, h);
  back.addColorStop(0, theme.back[0]); back.addColorStop(1, theme.back[1]);
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  ctx.save();
  if (picture.kind === 'verdict') {
    ctx.translate(w * .48, h - 6); ctx.scale(.42, .42);
    drawSet(ctx, mini(2, {car: 1}, 1, picture.up ? 1.4 : 0), .3);
    ctx.restore(); ctx.save();
    if (picture.up) arrow(ctx, w - 26, h * .7, h * .5, true, theme.good, 8);
    else { ctx.strokeStyle = theme.bad; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w - 40, 22); ctx.lineTo(w - 14, 48); ctx.moveTo(w - 14, 22); ctx.lineTo(w - 40, 48); ctx.stroke(); }
  }
  if (picture.kind === 'lever') {
    const x = w / 2 - 20, y0 = h - 12, y1 = 14, at = s => y0 - s * (y0 - y1);
    ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.fillRect(x - 8, y1 - 4, 16, y0 - y1 + 8);
    ctx.strokeStyle = theme.ghost; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x - 24, at(picture.ghost)); ctx.lineTo(x + 24, at(picture.ghost)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 26, at(picture.at)); ctx.lineTo(x + 26, at(picture.at)); ctx.stroke();
    text(ctx, pct(picture.ghost), x + 30, at(picture.ghost), {size: 12, align: 'left', colour: theme.ghost});
    if (Math.abs(picture.at - picture.ghost) > .01) text(ctx, picture.at > picture.ghost ? 'higher' : 'lower', x + 30, at(picture.at), {size: 13, align: 'left', colour: theme.bad});
  }
  if (picture.kind === 'jars') {
    jar(ctx, {x: w * .18, y: 14, w: w * .26, h: h - 30}, 1, {});
    jar(ctx, {x: w * .56, y: 14, w: w * .26, h: h - 30}, AIR[2], {});
  }
  if (picture.kind === 'heavier') {
    helicopter(ctx, w * .45, h * .55, 0, 0, .5);
    text(ctx, '+ kg ?', w * .8, h * .3, {size: 18, colour: theme.bad});
  }
  if (picture.kind === 'slower') {
    helicopter(ctx, w * .45, h * .6, 0, 0, .5);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * .45, h * .32, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    text(ctx, 'slow?', w * .8, h * .3, {size: 18, colour: theme.accent});
  }
  if (picture.kind === 'places') {
    picture.lifts.forEach((up, i) => {
      const cx = w * (.2 + i * .3), cy = h * .55;
      text(ctx, NAME[i].split(' ')[0], cx, h - 12, {size: 13, weight: 600});
      if (up) arrow(ctx, cx, cy + 18, 36, true, theme.good, 7);
      else { ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 12); ctx.lineTo(cx + 12, cy + 12); ctx.moveTo(cx + 12, cy - 12); ctx.lineTo(cx - 12, cy + 12); ctx.stroke(); }
    });
  }
  if (picture.kind === 'route') {
    const y = h * .55;
    ctx.fillStyle = '#7d8478'; ctx.beginPath(); ctx.moveTo(w * .55, h - 6); ctx.lineTo(w * .82, 16); ctx.lineTo(w - 6, h - 6); ctx.fill();
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.setLineDash(picture.what === 'straight' ? [] : [6, 4]);
    ctx.beginPath(); ctx.moveTo(18, h - 16);
    if (picture.what === 'pump') { ctx.lineTo(w * .32, y); ctx.lineTo(w * .82, 20); } else ctx.lineTo(w * .82, 20);
    ctx.stroke(); ctx.setLineDash([]);
    if (picture.what === 'pump') { ctx.fillStyle = theme.bad; ctx.fillRect(w * .32 - 8, y - 6, 16, 22); }
    if (picture.what === 'lever') { ctx.fillStyle = theme.brass[1]; ctx.fillRect(18, 14, 14, h - 30); ctx.fillStyle = theme.bad; ctx.fillRect(14, 12, 22, 8); }
  }
  ctx.restore();
}
