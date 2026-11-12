// The Air and altitude lesson's board (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md): the mountain with its
// three places, the collective lever as a share, the weighing pad with Kestrel One and its load, the air jar, the column of
// air that shows why the air thins, and the bars that compare the push with the weight.
// Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, floor, shade, shadow, rope, forceArrow, steel, bolt, bezel, plankCrate, weighingPad, grain, text, keyCap, helicopter, car, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
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
function crate(ctx, x, y) { plankCrate(ctx, x, y, CRATE.w, CRATE.h, '500'); }
function pad(ctx) { weighingPad(ctx, PAD_HALF); }
const arrow = forceArrow;
// Air thrown down by the rotor: a streak for each stream of air, so that there are fewer where the air is thin.
function air(ctx, hx, hy, share, time) {
  const n = Math.round(22 * share), fall = 76;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = hx - 104 + ((i * 37) % 44) * (208 / 43), travel = (time * 110 + i * 29) % fall, y = hy - 24 + travel, len = Math.min(16, fall - travel);
    if (len < 4) continue;
    const g = ctx.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, 'rgba(170,236,215,0)'); g.addColorStop(1, 'rgba(196,237,223,.8)');
    ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    ctx.fillStyle = 'rgba(205,244,230,.85)'; ctx.beginPath(); ctx.moveTo(x - 3.2, y + len - 4.5); ctx.lineTo(x + 3.2, y + len - 4.5); ctx.lineTo(x, y + len + 2); ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = 'butt';
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
  // The helicopter's shadow on the pad: smaller and fainter as it climbs.
  shadow(ctx, g.hx - 20, -12, 110 - Math.min(55, f.h * 12), Math.max(.12, .45 - f.h * .08));
  if (g.loadedSet) {
    ctx.strokeStyle = '#d8d0bc'; ctx.lineWidth = 1.4;
    for (const c of g.crates) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(c.x, c.y - CRATE.h / 2); ctx.stroke(); }
    if (g.carAt) { ctx.beginPath(); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x - 26, g.carAt.y - 4); ctx.moveTo(g.ring.x, g.ring.y); ctx.lineTo(g.carAt.x + 26, g.carAt.y - 4); ctx.stroke(); }
    const hookX = g.hx, hookY = g.hy + HOOK, sag = (1 - g.k) * 14;
    rope(ctx, hookX, hookY, (hookX + g.ring.x) / 2, Math.max(hookY, g.ring.y) + sag, g.ring.x, g.ring.y, 2.2);
    ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(g.ring.x, g.ring.y, 3.2, 0, Math.PI * 2); ctx.stroke();
    if (g.carAt) car(ctx, g.carAt.x, g.carAt.y, 0);
    for (const c of g.crates) crate(ctx, c.x, c.y);
  }
  const shake = strain ? Math.sin(time * 47) * 1.6 : 0;
  helicopter(ctx, g.hx + shake, g.hy, 0, f.lever > 0 ? time : 0);
  return g;
}

// A rock mountain with a snow cap: its peak at height py, seven tenths of the way from left to right; feet on the ground line gy.
// The left faces catch the lamp, the right faces are in shade, and the far ridges fade into haze.
const PEAK_LEFT = [[0, 1], [.1, .9], [.18, .78], [.24, .76], [.3, .7], [.36, .58], [.42, .46], [.47, .44], [.52, .38], [.57, .3], [.62, .2], [.66, .1], [.7, 0]];
const PEAK_RIGHT = [[.7, 0], [.75, .1], [.8, .16], [.83, .24], [.86, .3], [.9, .42], [.93, .5], [.97, .56], [1, .62], [1, 1]];
const PEAK_RIDGE = [[.7, 0], [.69, .15], [.73, .3], [.68, .45], [.72, .6], [.67, .78], [.7, 1]];
const SNOW_EDGE = [[.505, .4], [.545, .34], [.57, .42], [.61, .33], [.64, .4], [.68, .3], [.71, .38], [.75, .28], [.79, .36], [.83, .27], [.86, .3]];
function peak(ctx, py, left, right, gy) {
  const w = right - left, h = gy - py, at = ([fx, fy]) => [left + fx * w, py + fy * h];
  const trace = (points, first = 'moveTo') => points.forEach((point, i) => ctx[i ? 'lineTo' : first](...at(point)));
  // Two far ridges behind, each paler than the one before it.
  for (const [colour, pts] of [['rgba(150,166,182,.22)', [[-.06, 1], [.04, .72], [.14, .6], [.26, .68], [.4, .5], [.52, .64], [.6, 1]]], ['rgba(110,126,140,.32)', [[.3, 1], [.42, .78], [.5, .66], [.58, .74], [.66, .5], [.78, .6], [.9, .48], [1.04, .7], [1.04, 1]]]]) {
    ctx.fillStyle = colour; ctx.beginPath(); trace(pts); ctx.closePath(); ctx.fill();
  }
  ctx.save();
  ctx.beginPath(); trace(PEAK_LEFT); trace(PEAK_RIGHT.slice(1), 'lineTo'); ctx.closePath(); ctx.clip();
  const lit = ctx.createLinearGradient(0, py, 0, gy); lit.addColorStop(0, '#b8bdb0'); lit.addColorStop(.5, '#757c70'); lit.addColorStop(1, '#3f463e');
  ctx.fillStyle = lit; ctx.fillRect(left - 2, py - 2, w + 4, h + 4);
  // The shaded faces: right of the ridge that runs down from the summit.
  const dark = ctx.createLinearGradient(0, py, 0, gy); dark.addColorStop(0, '#7e877e'); dark.addColorStop(.5, '#4a524a'); dark.addColorStop(1, '#262d27');
  ctx.fillStyle = dark; ctx.beginPath(); trace(PEAK_RIGHT); trace([...PEAK_RIDGE].reverse().slice(0, -1), 'lineTo'); ctx.closePath(); ctx.fill();
  // Gullies and cracks in the rock, the same every time.
  for (let i = 0; i < 18; i++) {
    const fx = .28 + .66 * grain(i + 300), fy = .1 + .62 * grain(i + 320), shaded = fx > .7 - .02 * fy;
    ctx.strokeStyle = shaded ? 'rgba(0,0,0,.28)' : 'rgba(20,26,20,.24)'; ctx.lineWidth = 1.2; ctx.beginPath();
    let cx = fx, cy = fy; ctx.moveTo(...at([cx, cy]));
    for (let k = 0; k < 4; k++) { cx += (grain(i * 7 + k + 340) - .5) * .06; cy += .035 + grain(i * 5 + k + 360) * .05; ctx.lineTo(...at([cx, cy])); }
    ctx.stroke();
    ctx.strokeStyle = shaded ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.14)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(...at([fx + .012, fy])); ctx.lineTo(...at([fx + .012 + (grain(i + 380) - .5) * .05, fy + .12])); ctx.stroke();
  }
  // The snow cap: bright on the lit side, blue-grey in shade, with a ragged lower edge and wind-scoured streaks.
  const snow = ctx.createLinearGradient(0, py, 0, py + h * .4); snow.addColorStop(0, '#ffffff'); snow.addColorStop(1, '#d3dde2');
  ctx.fillStyle = snow; ctx.beginPath(); trace([[.505, .4], ...PEAK_LEFT.slice(-5, -1), [.7, 0], ...PEAK_RIGHT.slice(1, 5)]); trace([...SNOW_EDGE].reverse(), 'lineTo'); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(95,120,160,.42)'; ctx.beginPath(); trace([[.7, 0], ...PEAK_RIGHT.slice(1, 5), [.83, .27], [.79, .36], [.75, .28], [.71, .38], [.68, .3], [.69, .15]]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.4; ctx.beginPath(); trace(SNOW_EDGE); ctx.stroke();
  ctx.strokeStyle = 'rgba(130,150,185,.45)'; ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const fx = .56 + .28 * grain(i + 400), fy = .05 + .22 * grain(i + 420); ctx.beginPath(); ctx.moveTo(...at([fx, fy])); ctx.lineTo(...at([fx + .05 + grain(i + 440) * .03, fy + .018])); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) ctx.fillRect(...at([.58 + .1 * grain(i + 460), .04 + .22 * grain(i + 480)]), 1.6, 1.6);
  // The tree line: firs thinning out as the mountain climbs.
  const scale = Math.max(1, h / 400);
  for (let row = 0; row < 4; row++) for (let x = left + w * (.07 + row * .03) + (row % 2) * 3.5, i = 0; x < right - 3; x += 7, i++) {
    if (grain(i + row * 50 + 500) > .86 - row * .22) continue;
    const size = (9 + 9 * grain(i + row * 40 + 600)) * scale, base = gy - 1 - row * (h * .03 + 3);
    ctx.fillStyle = row ? '#202c24' : '#141d17';
    ctx.beginPath(); ctx.moveTo(x, base - size); ctx.lineTo(x - size * .32, base - size * .45); ctx.lineTo(x - size * .18, base - size * .45); ctx.lineTo(x - size * .4, base); ctx.lineTo(x + size * .4, base); ctx.lineTo(x + size * .18, base - size * .45); ctx.lineTo(x + size * .32, base - size * .45); ctx.closePath(); ctx.fill();
  }
  // Haze gathers at the foot of the mountain.
  const haze = ctx.createLinearGradient(0, gy - h * .4, 0, gy); haze.addColorStop(0, 'rgba(170,190,205,0)'); haze.addColorStop(1, 'rgba(170,190,205,.32)');
  ctx.fillStyle = haze; ctx.fillRect(left - 2, gy - h * .4, w + 4, h * .4 + 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,244,214,.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); trace(PEAK_LEFT.slice(4)); ctx.stroke();
}
// A small flag on a pole, standing on the line that marks a place.
function marker(ctx, x, y, here) {
  ctx.strokeStyle = '#d8dee1'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 24); ctx.stroke();
  ctx.fillStyle = here ? theme.accent : '#c9c2b0'; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + 13, y - 20); ctx.lineTo(x, y - 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(x, y - 19.5); ctx.lineTo(x + 13, y - 20); ctx.lineTo(x, y - 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4c565d'; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
}
function mountain(ctx, view, place) {
  ctx.fillStyle = 'rgba(10,14,15,.45)'; ctx.beginPath(); ctx.roundRect(MX0 - 6, 40, MX1 - MX0 + 12, FOOT_Y - 10, 8); ctx.fill();
  // The mountain, then the sea at its foot.
  peak(ctx, PEAK_Y - 8, MX0 + 20, MX1 + 4, FOOT_Y);
  const sea = ctx.createLinearGradient(0, FOOT_Y, 0, FOOT_Y + 14); sea.addColorStop(0, '#3f7488'); sea.addColorStop(1, '#14303c');
  ctx.fillStyle = sea; ctx.fillRect(MX0, FOOT_Y, MX1 - MX0, 14);
  ctx.fillStyle = 'rgba(235,246,250,.55)'; ctx.fillRect(MX0, FOOT_Y - .5, MX1 - MX0, 1.4);
  ctx.strokeStyle = 'rgba(210,235,245,.25)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const x = MX0 + 8 + i * 36; ctx.beginPath(); ctx.moveTo(x, FOOT_Y + 5 + (i % 2) * 4); ctx.lineTo(x + 14, FOOT_Y + 5 + (i % 2) * 4); ctx.stroke(); }
  text(ctx, 'Altitude', (MX0 + MX1) / 2, 58, {size: 17, colour: theme.accent});
  for (let i = 0; i < 3; i++) {
    const y = placeY(i), here = i === place;
    ctx.strokeStyle = here ? theme.accent : theme.faint; ctx.lineWidth = here ? 2.5 : 1.2; ctx.setLineDash(here ? [] : [5, 4]);
    ctx.beginPath(); ctx.moveTo(MX0 + 4, y); ctx.lineTo(MX1 - 4, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(10,14,15,.72)'; ctx.beginPath(); ctx.roundRect(MX0 + 2, y - 38, 138, 36, 5); ctx.fill();
    text(ctx, NAME[i], MX0 + 8, y - 26, {size: 16, align: 'left', colour: here ? theme.accent : theme.text});
    text(ctx, metres(HEIGHT[i]), MX0 + 8, y - 9, {size: 14, align: 'left', weight: 600, colour: here ? theme.text : theme.faint});
    marker(ctx, MX0 + 148, y, here);
  }
  if (place != null) {
    const [x, y] = markerPoint(place);
    helicopter(ctx, x, y, 0, 0, .22);
    if (view.glow === 'mountain') halo(ctx, ...markerPoint(2), 26, view.time);
  }
  if (view.keys['↑'] === 'place:up') { keyCap(ctx, MX0 + 40, FOOT_Y + 36, '↑'); text(ctx, 'up', MX0 + 56, FOOT_Y + 36, {size: 14, align: 'left'}); keyCap(ctx, MX0 + 120, FOOT_Y + 36, '↓'); text(ctx, 'down', MX0 + 136, FOOT_Y + 36, {size: 14, align: 'left'}); }
}

// A jar of air: 100 places for a bit of air, filled evenly so thin air shows its gaps. It is glass with a brass lid.
const SLOTS = Array.from({length: 100}, (_, i) => (i * 37) % 100);
function jar(ctx, box, share, {label, glow = false, time = 0, unknown = false} = {}) {
  const {x, y, w, h} = box;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + w / 2 + 4, y + h + 3, w / 2 + 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  const glass = ctx.createLinearGradient(x, 0, x + w, 0);
  glass.addColorStop(0, 'rgba(190,226,240,.30)'); glass.addColorStop(.14, 'rgba(160,200,215,.12)'); glass.addColorStop(.6, 'rgba(160,200,215,.07)'); glass.addColorStop(.9, 'rgba(160,200,215,.14)'); glass.addColorStop(1, 'rgba(190,226,240,.30)');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  const base = ctx.createLinearGradient(0, y + h - 10, 0, y + h); base.addColorStop(0, 'rgba(120,170,190,0)'); base.addColorStop(1, 'rgba(120,170,190,.35)');
  ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(x + 2, y + h - 10, w - 4, 9, 6); ctx.fill();
  const n = Math.round(share * 100), dx = (w - 14) / 10, dy = (h - 14) / 10, r = Math.min(dx, dy) * .28;
  const shown = new Set(SLOTS.slice(0, n));
  for (let i = 0; i < 100; i++) if (shown.has(i)) {
    const cx = x + 7 + dx * (i % 10 + .5), cy = y + 7 + dy * (Math.floor(i / 10) + .5);
    ctx.fillStyle = '#c4eddf'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(cx - r * .55, cy - r * .55, r * .5, r * .5);
  }
  ctx.strokeStyle = glow ? theme.accent : 'rgba(200,225,235,.7)'; ctx.lineWidth = glow ? 3 + Math.sin(time * 6) * 1.5 : 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
  // The lamp's reflection down the glass.
  ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.beginPath(); ctx.roundRect(x + 6, y + 10, 4, h * .55, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.roundRect(x + w - 10, y + 14, 2.4, h * .3, 1.2); ctx.fill();
  // The lid: a brass cap with a knurled edge on a steel ring.
  steel(ctx, x + 4, y - 3, w - 8, 4, 1.5);
  const lid = ctx.createLinearGradient(0, y - 12, 0, y - 2); lid.addColorStop(0, theme.brass[0]); lid.addColorStop(.45, theme.brass[1]); lid.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = lid; ctx.beginPath(); ctx.roundRect(x + 2, y - 12, w - 4, 10, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,4,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = x + 6; k < x + w - 4; k += 5) { ctx.moveTo(k, y - 11); ctx.lineTo(k, y - 3); } ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 5, y - 11.5, w - 10, 1);
  if (unknown) text(ctx, '?', x + w / 2, y + h / 2, {size: 40, colour: theme.accent});
  if (label) text(ctx, label, x + w / 2, y + h + 18, {size: 15, weight: 600});
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
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(BOX.x, BOX.y, BOX.w, h, 8); ctx.fill(); bezel(ctx, BOX.x, BOX.y, BOX.w, h);
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
    // A lit bar in a steel trough, like the lever's.
    ctx.fillStyle = '#060a0b'; ctx.fillRect(left, y, full, 18);
    const fill = ctx.createLinearGradient(0, y, 0, y + 18); fill.addColorStop(0, shade(colour, .35)); fill.addColorStop(.5, colour); fill.addColorStop(1, shade(colour, -.35));
    const len = Math.min(full, value * per); ctx.fillStyle = fill; ctx.fillRect(left, y, len, 18);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(left, y + 1, len, 1.4);
    ctx.strokeStyle = '#7f8a90'; ctx.lineWidth = 1.6; ctx.strokeRect(left - .8, y - .8, full + 1.6, 19.6);
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
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 8); ctx.fill(); bezel(ctx, c.x, c.y, c.w, c.h);
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
  // The lever's rail: a dark slot in a steel frame.
  ctx.fillStyle = 'rgba(6,9,10,.82)'; ctx.beginPath(); ctx.roundRect(GX - 12, G1 - 14, 24, G0 - G1 + 28, 10); ctx.fill();
  ctx.strokeStyle = '#7f8a90'; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(GX - 10.6, G1 - 12.6, 21.2, G0 - G1 + 25.2, 8.6); ctx.stroke();
  for (let n = 0; n <= 10; n++) {
    const y = leverY(n / 10), big = n % 5 === 0;
    ctx.strokeStyle = theme.faint; ctx.lineWidth = big ? 2 : 1; ctx.beginPath(); ctx.moveTo(GX - 20, y); ctx.lineTo(GX - (big ? 30 : 25), y); ctx.stroke();
    if (big) text(ctx, `${n * 10}%`, GX - 38, y, {size: 13, align: 'right', weight: 600, colour: theme.faint});
  }
  const lit = ctx.createLinearGradient(GX - 6, 0, GX + 6, 0); lit.addColorStop(0, '#9af5ba'); lit.addColorStop(.5, '#3fbd70'); lit.addColorStop(1, '#217a46');
  ctx.fillStyle = lit; ctx.globalAlpha = .7; ctx.fillRect(GX - 6, leverY(f.lever), 12, G0 - leverY(f.lever)); ctx.globalAlpha = 1;
  const stop = leverY(1);
  steel(ctx, GX - 18, stop - 4, 36, 5, 1.5); bolt(ctx, GX - 13, stop - 1.5, 1.2); bolt(ctx, GX + 13, stop - 1.5, 1.2);
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
  // The handle: a steel shaft and a ridged brass grip.
  const y = leverY(f.lever), glow = view.glow === 'lever:top' || view.glow === 'lever:weight';
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(GX - 31, y - 6, 64, 16, 7); ctx.fill();
  steel(ctx, GX - 3, y, 6, 14, 1);
  const grip = ctx.createLinearGradient(0, y - 12, 0, y + 6); grip.addColorStop(0, theme.brass[0]); grip.addColorStop(.45, theme.brass[1]); grip.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = grip; ctx.beginPath(); ctx.roundRect(GX - 32, y - 10, 64, 16, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(60,36,6,.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = GX - 24; k <= GX + 24; k += 6) { ctx.moveTo(k, y - 8); ctx.lineTo(k, y + 4); } ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(GX - 26, y - 9, 52, 1.2);
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(view.time * 6) * 1.5 : 1.5; ctx.beginPath(); ctx.roundRect(GX - 32, y - 10, 64, 16, 7); ctx.stroke();
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
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(x, y, w, 132, 6); ctx.fill(); bezel(ctx, x, y, w, 132, 6);
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
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(x, y, w, 132, 6); ctx.fill(); bezel(ctx, x, y, w, 132, 6);
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
  background(ctx); floor(ctx, GROUND_Y + 8);
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
  background(ctx); floor(ctx, GROUND_Y + 8);
  mountain(ctx, {...view, keys: {}}, null);
  // Every place's air and push, for the questions to use. While a question is open, the board keeps back what would settle it.
  const open = !view.answered, hideAir = open && view.check === 'check-why', hideMost = open && view.check === 'check-car';
  table(ctx, [0, 1, 2].map(i => ({name: NAME[i], height: HEIGHT[i], air: AIR[i], most: MOST[i]})), {hideAir, hideMost});
  const plate = (x, y, w) => { ctx.fillStyle = 'rgba(10,14,15,.6)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 15, w, 30, 6); ctx.fill(); };
  if (hideAir) { plate(600, 310, 470); text(ctx, 'The answer will appear here once you have picked a card.', 600, 310, {size: 17, colour: 'rgba(227,220,203,.6)'}); }
  else {
    jar(ctx, {x: 380, y: 230, w: 130, h: 170}, 1, {label: 'Sea level: 100 dots'});
    jar(ctx, {x: 560, y: 230, w: 130, h: 170}, AIR[2], {label: `${NAME[2]}: ${dots(AIR[2])} dots`});
  }
  plate(600, 470, 500);
  text(ctx, `Kestrel One ${kg(OWN_KG)} · Dusthawk ${kg(CAR_KG)} · a crate ${kg(CRATE_KG)}`, 600, 470, {size: 17, colour: 'rgba(227,220,203,.6)'});
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
