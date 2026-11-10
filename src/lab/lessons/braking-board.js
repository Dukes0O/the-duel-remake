// The Braking lesson's board (docs/board/cards/LAB-CLASSROOM-BRAKING.md): the car close up on two weighing pads (the
// share of its weight on each end, the back tyre red when it locks), the speed dial and the brake lever, and an 80 m
// test strip where cars to scale arrive, brake at the line at real speed and stop, with a tape giving the metres.
// The word steps add a mark for each second, a mark for each half second of braking, and gold blocks of energy that
// disappear along the road. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {m1, pct, kmh, msOf, metresFrom, S_SLOW, SLOW, FAST, SPEED_STEP, FRONT_LOAD, REAR_LOAD, STEADY_FRONT, MIN_FRONT, MAX_FRONT} from './braking-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const CAR = '#c8402f', GOLD = '#edc557', GREEN = '#9ff0b4';
// The close-up car (nose to the right) and its pads; the dial and the lever (or the car chooser) on the right.
const CLOSE = Object.freeze({nose: 470, ground: 250, scale: 3.2});
const DIAL = Object.freeze({x: 600, y: 52, w: 360, h: 120, down: [680, 140], up: [880, 140]});
const LEVER = Object.freeze({x: 600, y: 186, w: 360, h: 140, back: [650, 300], front: [910, 300], track: [660, 900], trackY: 262});
const LEFT = Object.freeze({x: 40, y: 40, w: 540, h: 310});
// The strip: brakes on at 0 m, a mark every 10 m, 80 m long.
const STRIP = Object.freeze({x0: 130, perM: 10, metres: 80, top: 400, bottom: 650});
const stripX = metres => STRIP.x0 + metres * STRIP.perM;
const laneY = (i, n) => n >= 3 ? 440 + i * 80 : 450 + i * 110;
// The energy step's road: the longest stop the dial can give still fits.
const ROAD = Object.freeze({x0: 130, perM: 7.4, y: [460, 570]});
const rig = view => view.scene === 'rig';
const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
// A number stays on one line with its unit when text wraps.
const together = value => value.replace(/(\d) (m|km\/h)(?=[ .,]|$)/g, '$1\u00A0$2');
const leverX = front => LEVER.track[0] + (front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * (LEVER.track[1] - LEVER.track[0]);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!rig(view)) return null;
  if (view.keys['↑'] === 'speed:up' && inBox(x, y, DIAL.up, 120, 52)) return {action: 'speed:up'};
  if (view.keys['↓'] === 'speed:down' && inBox(x, y, DIAL.down, 120, 52)) return {action: 'speed:down'};
  if (view.keys['→'] === 'car:next') {
    if (inBox(x, y, LEVER.front, 100, 44)) return {action: 'car:next'};
    if (inBox(x, y, LEVER.back, 100, 44)) return {action: 'car:prev'};
  }
  if (view.keys['→'] === 'lever:front' && view.lever) {
    if (inBox(x, y, LEVER.front, 100, 44)) return {action: 'lever:front'};
    if (inBox(x, y, LEVER.back, 100, 44)) return {action: 'lever:back'};
    // A click on the track moves the lever one step toward where it was clicked.
    if (x > LEVER.track[0] - 20 && x < LEVER.track[1] + 20 && Math.abs(y - LEVER.trackY) < 30) return {action: x > leverX(view.lever.front) ? 'lever:front' : 'lever:back'};
  }
  if (view.keys.Space === 'go' && x > 90 && x < 950 && y > STRIP.top && y < STRIP.bottom) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!rig(view)) return null;
  if (view.dial && inRect(x, y, DIAL)) return view.dial.locked ? 'This is the speed dial, and Brian has set it for this test.' : `This is the speed dial. Each press makes the speed ${SPEED_STEP} km/h faster or slower.`;
  if (view.car && inRect(x, y, LEVER)) return 'These buttons choose the car. Each car has its own brake strength, which changes its deceleration.';
  if (view.lever && inRect(x, y, LEVER)) return view.lever.locked ? 'This is the brake lever, and Brian has set it for this test.' : 'This is the brake lever. It divides the braking between the front and back brakes, and each press moves it 10%.';
  if (view.close && !view.close.plain && y > CLOSE.ground - 8 && y < CLOSE.ground + 92 && x > 100 && x < 520) return 'These weighing pads show the share of the car’s weight on each pair of tyres.';
  if (view.close && x > 150 && x < 500 && y > 110 && y < CLOSE.ground) return 'This is the Falcone F42 close up.';
  if (view.table && inRect(x, y, LEFT)) return 'This table keeps the result of each test.';
  if (view.energy && inRect(x, y, LEFT)) return `Each gold block is the energy of motion of this car at ${kmh(SLOW)} km/h.`;
  if (view.energy && x > 90 && x < 950 && y > STRIP.top && y < STRIP.bottom) return 'Each numbered stretch of road is the length that the brakes need to remove one block of energy.';
  if (x > 90 && x < 950 && y > STRIP.top && y < STRIP.bottom) return 'This test strip is 80 m long and drawn to scale. The brakes go on at the yellow line, and there is a mark every 10 m.';
  return null;
}
export function targetPoint(view, action) {
  if (!rig(view)) return null;
  if (action === 'set:best' && view.best) {
    if (view.lever && !view.lever.locked && view.lever.front !== view.best.front) return view.lever.front < view.best.front ? LEVER.front : LEVER.back;
    if (view.dial && !view.dial.locked && view.dial.speed !== view.best.speed) return view.dial.speed < view.best.speed ? DIAL.up : DIAL.down;
  }
  if (action === 'speed:up') return DIAL.up;
  if (action === 'speed:down') return DIAL.down;
  if (action === 'lever:front' || action === 'car:next') return LEVER.front;
  if (action === 'lever:back' || action === 'car:prev') return LEVER.back;
  if (action === 'go') return [stripX(4), laneY(0, Math.max(1, view.lanes.length))];
  // Sparks fly from the first car on the strip, or the car close up.
  const l = view.lanes[0];
  if (l && !view.energy) return [stripX(Math.max(0, l.metres)), laneY(0, view.lanes.length)];
  if (view.energy) return [LEFT.x + LEFT.w / 2, LEFT.y + LEFT.h / 2];
  return [CLOSE.nose - 140, CLOSE.ground - 60];
}
export function dragAngle() { return 0; }

// ---- pieces ----
function glowBox(ctx, view, x, y, w, h) {
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke(); ctx.globalAlpha = 1;
}
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(14,20,24,.9)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
}
function arrow(ctx, x0, y0, x1, y1, colour, width = 5) {
  const length = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / length, uy = (y1 - y0) / length;
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * 10, y1 - uy * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * 13 - uy * 8, y1 - uy * 13 + ux * 8); ctx.lineTo(x1 - ux * 13 + uy * 8, y1 - uy * 13 - ux * 8); ctx.closePath(); ctx.fill();
}
// A car side on, nose to the right; x is the nose. locked: the back tyre red.
function car(ctx, nose, y, scale = 1, {angle = 0, locked = false} = {}) {
  ctx.save(); ctx.translate(nose, y); ctx.rotate(-angle); ctx.scale(scale, scale);
  ctx.fillStyle = CAR; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, -4); ctx.lineTo(-30, -9); ctx.lineTo(-44, -20); ctx.lineTo(-66, -20); ctx.lineTo(-80, -9); ctx.lineTo(-92, -7); ctx.lineTo(-92, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c3a42'; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-46, -18); ctx.lineTo(-64, -18); ctx.lineTo(-74, -10); ctx.closePath(); ctx.fill();
  for (const wx of [-20, -74]) {
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 7, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 7, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (locked) { ctx.strokeStyle = theme.bad; ctx.lineWidth = 2.5 / scale + .8; ctx.beginPath(); ctx.arc(-74, 7, 10.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
// The car close up on its two pads, each with the share of the weight it carries and an arrow sized to it.
function closeUp(ctx, view) {
  const c = view.close, {nose, ground, scale} = CLOSE, front = c.front, back = 1 - front;
  const wheel = wx => nose + wx * scale;
  // Before weight shift has been explained, the car stands alone, with no pads or shares.
  if (!c.plain) for (const [wx, share, name] of [[-20, front, 'Front'], [-74, back, 'Back']]) {
    const x = wheel(wx);
    ctx.fillStyle = theme.iron[1]; ctx.fillRect(x - 46, ground + 30, 92, 12);
    ctx.fillStyle = '#0d1a12'; ctx.beginPath(); ctx.roundRect(x - 52, ground + 48, 104, 40, 5); ctx.fill();
    text(ctx, `${name} ${pct(share)}`, x, ground + 68, {size: 20, colour: name === 'Back' && c.locked ? theme.bad : GREEN, weight: 800});
    // The weight on this end pressing down.
    const len = 30 + 120 * share;
    ctx.strokeStyle = theme.accent; ctx.fillStyle = theme.accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, ground - 70 - len); ctx.lineTo(x, ground - 76); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 11, ground - 80); ctx.lineTo(x + 11, ground - 80); ctx.lineTo(x, ground - 64); ctx.closePath(); ctx.fill();
  }
  car(ctx, nose, ground + 2, scale, {angle: c.braking ? .03 : 0, locked: c.locked});
  // Why the weight moves: the mass carries on forward above the road while the tyres slow the car at the road.
  if (view.forces && c.braking) {
    arrow(ctx, 270, 160, 370, 160, '#f5f0dc');
    text(ctx, 'mass carries on', 320, 138, {size: 14, colour: '#f5f0dc'});
    arrow(ctx, 350, ground + 34, 290, ground + 34, theme.bad, 4);
    text(ctx, 'tyres slow', 320, ground + 56, {size: 13, colour: theme.bad});
    text(ctx, 'the car', 320, ground + 72, {size: 13, colour: theme.bad});
  }
  if (c.locked) text(ctx, 'back tyre locked', wheel(-74), ground - 76 - 30 - 120 * back - 16, {size: 16, colour: theme.bad});
  text(ctx, c.braking ? 'BRAKING' : 'STANDING', 120, 70, {size: 14, align: 'left', colour: c.braking ? theme.accent : theme.faint, weight: 800});
  // The lever's share against the weight on the back tyres, in the same words as the sum.
  if (view.balance && view.lever) {
    const backBrakes = 100 - view.lever.front, steady = view.lever.front >= STEADY_FRONT;
    text(ctx, `The back brakes do ${backBrakes}% of the braking, and the back tyres carry ${pct(REAR_LOAD)} of the weight.`, 310, 30, {size: 14, colour: steady ? GREEN : theme.bad});
  }
}
function dial(ctx, view) {
  const d = view.dial, can = view.keys['↑'] === 'speed:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'SPEED DIAL', DIAL.x + DIAL.w / 2, DIAL.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, `${d.kmh} km/h`, DIAL.x + DIAL.w / 2, DIAL.y + 50, {size: 30, weight: 800});
  text(ctx, `${d.ms.toFixed(2)} m/s`, DIAL.x + DIAL.w / 2, DIAL.y + 88, {size: 15, colour: theme.accent});
  for (const [way, label, key] of [['down', 'Slower', '↓'], ['up', 'Faster', '↑']]) {
    const [x, y] = DIAL[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 56, y - 22, 112, 44, 6); ctx.fill();
    text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 36, y, key);
    ctx.globalAlpha = 1;
  }
  if (d.locked) text(ctx, 'set by Brian', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: theme.faint});
}
function lever(ctx, view) {
  const l = view.lever, can = view.keys['→'] === 'lever:front', [x0, x1] = LEVER.track, y = LEVER.trackY;
  panel(ctx, LEVER.x, LEVER.y, LEVER.w, LEVER.h);
  text(ctx, 'BRAKE LEVER', LEVER.x + LEVER.w / 2, LEVER.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, `Back ${100 - l.front}%`, LEVER.x + 14, LEVER.y + 44, {size: 17, align: 'left', weight: 800});
  text(ctx, `Front ${l.front}%`, LEVER.x + LEVER.w - 14, LEVER.y + 44, {size: 17, align: 'right', weight: 800});
  // The track, a mark at every step, and the steady side (70% front and more) in green.
  ctx.fillStyle = '#2b3236'; ctx.fillRect(x0, y - 5, x1 - x0, 10);
  ctx.fillStyle = 'rgba(86,214,131,.35)'; ctx.fillRect(leverX(STEADY_FRONT), y - 5, x1 - leverX(STEADY_FRONT), 10);
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2;
  for (let f = MIN_FRONT; f <= MAX_FRONT; f += 10) { ctx.beginPath(); ctx.moveTo(leverX(f), y + 8); ctx.lineTo(leverX(f), y + 16); ctx.stroke(); }
  const kx = leverX(l.front);
  ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = theme.brass[2]; ctx.lineWidth = 2; ctx.stroke();
  for (const [way, label, key] of [['back', 'Back', '←'], ['front', 'Front', '→']]) {
    const [x, by] = LEVER[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 46, by - 18, 92, 36, 6); ctx.fill();
    text(ctx, label, x + 10, by, {size: 15}); keyCap(ctx, x - 28, by, key);
    ctx.globalAlpha = 1;
  }
}
// The free test's chooser, where the lever would be: the car's name and its deceleration.
function carPanel(ctx, view) {
  const c = view.car, can = view.keys['→'] === 'car:next';
  panel(ctx, LEVER.x, LEVER.y, LEVER.w, LEVER.h);
  text(ctx, 'CAR', LEVER.x + LEVER.w / 2, LEVER.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, c.name, LEVER.x + LEVER.w / 2, LEVER.y + 48, {size: 22, weight: 800});
  text(ctx, `deceleration ${c.a.toFixed(2)} m/s²`, LEVER.x + LEVER.w / 2, LEVER.y + 78, {size: 15, colour: theme.accent});
  for (const [way, label, key] of [['back', 'Car', '←'], ['front', 'Car', '→']]) {
    const [x, by] = LEVER[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 46, by - 18, 92, 36, 6); ctx.fill();
    text(ctx, label, x + 10, by, {size: 15}); keyCap(ctx, x - 28, by, key);
    ctx.globalAlpha = 1;
  }
}
// The free test's results, where the close-up would be.
function resultsTable(ctx, view) {
  const {x, y, w, h} = LEFT;
  panel(ctx, x, y, w, h);
  text(ctx, 'YOUR TESTS', x + 14, y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cols = [[x + 14, 'Car', 'left'], [x + 250, 'Speed', 'right'], [x + 350, 'Deceleration', 'right'], [x + 440, 'Sum', 'right'], [x + 526, 'Tape', 'right']];
  for (const [cx, label, align] of cols) text(ctx, label, cx, y + 46, {size: 14, align, colour: theme.faint, weight: 800});
  if (!view.table.length) text(ctx, 'There are no tests yet. Press Space to brake.', x + w / 2, y + 130, {size: 17, colour: theme.faint});
  view.table.forEach((row, i) => {
    const ry = y + 80 + i * 36;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(x + 8, ry - 16, w - 16, 32);
    text(ctx, row.car, cols[0][0], ry, {size: 15, align: 'left'});
    text(ctx, `${row.kmh} km/h`, cols[1][0], ry, {size: 15, align: 'right'});
    text(ctx, `${row.a.toFixed(2)} m/s²`, cols[2][0], ry, {size: 15, align: 'right'});
    text(ctx, `${row.sum.toFixed(2)} m`, cols[3][0], ry, {size: 15, align: 'right', colour: theme.accent});
    text(ctx, m1(row.strip), cols[4][0], ry, {size: 15, align: 'right', colour: GREEN});
  });
}
function laneName(ctx, label, y) {
  ctx.font = '700 15px "Segoe UI", sans-serif';
  ctx.fillStyle = '#23272a'; ctx.fillRect(44, y - 38, ctx.measureText(label).width + 10, 20);
  text(ctx, label, 48, y - 28, {size: 15, align: 'left', colour: theme.text});
}
// The strip: lanes, the brake line, a mark every 10 m, the line or corner, each car with its tape and skid marks.
function strip(ctx, view) {
  const lanes = (view.lanes.length ? view.lanes : view.dial ? [{label: `${view.dial.kmh} km/h`, waiting: true, metres: -6, ms: view.dial.ms, slide: 0}] : [])
    // A car waiting to start sits just before the brake line, where it can be seen.
    .map(l => l.waiting ? {...l, metres: -6} : l);
  const n = Math.max(1, lanes.length), top = laneY(0, n) - 40, bottom = laneY(n - 1, n) + 34;
  ctx.fillStyle = '#23272a'; ctx.fillRect(40, top, 920, bottom - top);
  for (let i = 1; i < n; i++) { ctx.strokeStyle = 'rgba(245,240,220,.35)'; ctx.setLineDash([16, 12]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, laneY(i, n) - 40); ctx.lineTo(960, laneY(i, n) - 40); ctx.stroke(); ctx.setLineDash([]); }
  for (let mm = 10; mm <= STRIP.metres; mm += 10) {
    ctx.strokeStyle = 'rgba(245,240,220,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(stripX(mm), top); ctx.lineTo(stripX(mm), bottom); ctx.stroke();
    text(ctx, `${mm} m`, stripX(mm), bottom + 14, {size: 12, colour: theme.faint});
  }
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(stripX(0), top); ctx.lineTo(stripX(0), bottom); ctx.stroke();
  text(ctx, 'brakes on', stripX(0), bottom + 14, {size: 12, colour: theme.accent});
  if (view.line != null) {
    const x = stripX(view.line);
    for (let k = 0; k * 10 < bottom - top; k++) { ctx.fillStyle = k % 2 ? '#eee' : theme.bad; ctx.fillRect(x - 4, top + k * 10, 8, 10); }
    text(ctx, view.job ? `corner, ${view.line} m` : 'the line', x, top - 12, {size: 14, colour: theme.bad});
  }
  ctx.save(); ctx.beginPath(); ctx.rect(40, top, 920, bottom - top); ctx.clip();
  lanes.forEach((l, i) => {
    const y = laneY(i, n), x = stripX(l.metres);
    // Skid marks behind a sliding back, from the brake line to where the back is now.
    if (l.slide > 0) { ctx.strokeStyle = 'rgba(10,10,10,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(stripX(0) - 40, y + 10); ctx.quadraticCurveTo(x - 40, y + 10, x - 44, y + 10 - 26 * l.slide); ctx.stroke(); }
    car(ctx, x, y + 4, .48, {angle: .35 * l.slide, locked: l.slide > 0});
    if (l.done) {
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(stripX(0), y - 22); ctx.lineTo(x, y - 22); ctx.stroke();
      for (const tx of [stripX(0), x]) { ctx.beginPath(); ctx.moveTo(tx, y - 28); ctx.lineTo(tx, y - 16); ctx.stroke(); }
    }
  });
  ctx.restore();
  // Speed: a mark for each second, as far as the car would travel at the speed on the dial.
  if (view.perSecond) {
    const y = laneY(0, 1) + 14;
    for (let k = 1; k * view.perSecond <= STRIP.metres; k++) {
      const x = stripX(k * view.perSecond);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      text(ctx, `${k} s`, x, y, {size: 15, colour: GOLD, weight: 800, align: 'right'});
    }
    text(ctx, `In each second, the car travels ${view.perSecond.toFixed(2)} m.`, 500, bottom + 50, {size: 20, colour: GOLD});
  }
  // Deceleration: where the car was at each half second, and its speed then. The speed falls by the same amount each time.
  if (view.timeMarks) {
    const y0 = laneY(0, 1);
    view.timeMarks.forEach(k => {
      const x = stripX(k.metres);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y0 - 40); ctx.lineTo(x, y0 + 60); ctx.stroke();
      text(ctx, `${k.t.toFixed(1)} s`, x, y0 + 74, {size: 14, colour: GOLD, weight: 800});
      text(ctx, `${k.ms.toFixed(1)} m/s`, x, y0 + 94 + (k.t * 2 % 2) * 20, {size: 14, colour: theme.text});
    });
    if (view.timeMarks.length) text(ctx, 'The marks show the car at each half second.', 500, 610, {size: 20, colour: GOLD});
  }
  lanes.forEach((l, i) => {
    const y = laneY(i, n);
    laneName(ctx, l.label, y);
    const reading = l.waiting ? 'ready' : l.done ? `stopped in ${m1(l.stopMetres)}${l.slides ? ', and the back slid' : ''}` : `${Math.round(l.ms * 3.6)} km/h`;
    text(ctx, reading, 952, y - 28, {size: 15, align: 'right', colour: l.done ? (l.slides ? theme.bad : GREEN) : theme.text});
    // A stop far along the strip sits under the reading on the right, which already gives the distance.
    if (l.done && (l.stopMetres > STRIP.metres || stripX(l.metres) < 700)) text(ctx, l.stopMetres > STRIP.metres ? `${m1(l.stopMetres)}, past the end ▶` : m1(l.stopMetres), Math.min(stripX(l.metres), 900) + 12, y - 22, {size: 15, align: l.stopMetres > STRIP.metres ? 'right' : 'left', colour: theme.accent});
  });
  if (view.keys.Space === 'go' && !view.lanes.length && !view.perSecond) text(ctx, 'Press Space to brake', stripX(20), laneY(0, 1) + 4, {size: 15, align: 'left', colour: theme.faint});
}
// Energy of motion: gold blocks, one for the energy of the car at the lower speed, and the road they take to remove. As a
// car brakes, its blocks empty in step with the road it covers.
function blocks(ctx, x, y, count, left) {
  const w = 50, h = 44, gap = 4;
  for (let i = 0; i < Math.ceil(count - 1e-6); i++) {
    const bx = x + i * (w + gap), size = Math.min(1, count - i), full = Math.max(0, Math.min(size, left - i));
    ctx.strokeStyle = 'rgba(237,197,87,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, y, w * size, h);
    if (full > 0) { ctx.fillStyle = GOLD; ctx.fillRect(bx, y, w * full, h); }
  }
}
function energyScene(ctx, view) {
  const {x, y, w, h} = LEFT, d = view.dial, slowKmh = kmh(SLOW), slowMs = msOf(SLOW);
  const rows = [{label: `${slowKmh} km/h`, ms: slowMs, stop: S_SLOW, lane: view.lanes[0]}, {label: `${d.kmh} km/h`, ms: d.ms, stop: metresFrom(d.speed), lane: view.lanes[1]}];
  if (view.lanes[1]) { rows[1].label = view.lanes[1].label.replace('From ', ''); rows[1].ms = msOf(view.lanes[1].speed); rows[1].stop = view.lanes[1].stopMetres; }
  panel(ctx, x, y, w, h);
  text(ctx, 'ENERGY OF MOTION', x + 14, y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  rows.forEach((row, i) => {
    const ry = y + 44 + i * 128, count = (row.ms / slowMs) ** 2, l = row.lane;
    const share = l && !l.waiting ? (l.ms / l.startMs) ** 2 : 1;
    text(ctx, row.label, x + 14, ry + 8, {size: 18, align: 'left'});
    text(ctx, `${count.toFixed(2)} times the energy of the car at ${slowKmh} km/h`, x + 110, ry + 8, {size: 14, align: 'left', colour: 'rgba(245,240,220,.75)'});
    blocks(ctx, x + 14, ry + 28, count, count * share);
  });
  wrap(ctx, together(`Each block needs the same ${m1(S_SLOW)} of road.`), LEVER.x + LEVER.w / 2, 230, LEVER.w - 30, {size: 22});
  // The road: one numbered stretch for each block.
  rows.forEach((row, i) => {
    const ry = ROAD.y[i], l = row.lane, stretch = S_SLOW * ROAD.perM, count = row.stop / S_SLOW;
    ctx.fillStyle = '#23272a'; ctx.fillRect(40, ry - 40, 920, 74);
    for (let k = 0; k < Math.ceil(count - 1e-3); k++) {
      const sx = ROAD.x0 + k * stretch, sw = Math.min(stretch, ROAD.x0 + row.stop * ROAD.perM - sx);
      ctx.fillStyle = k % 2 ? 'rgba(237,197,87,.16)' : 'rgba(237,197,87,.32)'; ctx.fillRect(sx, ry - 16, sw, 30);
      if (sw > 24) text(ctx, String(k + 1), sx + sw / 2, ry + 26, {size: 13, colour: GOLD});
    }
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ROAD.x0, ry - 40); ctx.lineTo(ROAD.x0, ry + 34); ctx.stroke();
    const metres = l && !l.waiting ? l.metres : -6;
    ctx.save(); ctx.beginPath(); ctx.rect(40, ry - 40, 920, 74); ctx.clip();
    car(ctx, ROAD.x0 + metres * ROAD.perM, ry + 4, .48);
    ctx.restore();
    laneName(ctx, `From ${row.label}`, ry);
    text(ctx, l?.done ? `stopped in ${m1(row.stop)}` : `needs ${m1(row.stop)}`, 952, ry - 28, {size: 15, align: 'right', colour: l?.done ? GREEN : theme.text});
  });
}
function drawRig(ctx, view) {
  background(ctx);
  if (view.close) closeUp(ctx, view);
  if (view.table) resultsTable(ctx, view);
  if (view.dial) dial(ctx, view);
  if (view.lever) lever(ctx, view);
  if (view.car) carPanel(ctx, view);
  if (view.job) {
    const j = view.job;
    text(ctx, `BRIAN’S JOB · CORNER ${j.corner} OF ${j.of}${j.done ? ' · DONE' : ''} · the marker is ${j.gap} m before the corner`, 48, 366, {size: 15, align: 'left', colour: theme.accent, weight: 800});
  }
  if (view.energy) { energyScene(ctx, view); return; }
  strip(ctx, view);
  // The glow on what to use next.
  if (view.glow === 'strip' || view.glow === 'set' && view.target === 'go') glowBox(ctx, view, 44, laneY(0, Math.max(1, view.lanes.length)) - 44, 912, 82);
  if (view.glow === 'lever' || view.glow === 'set' && view.target === 'set:best' && view.lever && !view.lever.locked && view.lever.front !== view.best?.front) glowBox(ctx, view, LEVER.x - 4, LEVER.y - 4, LEVER.w + 8, LEVER.h + 8);
  else if (view.glow === 'dial' || view.glow === 'set' && view.target === 'set:best' && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
}

// The questions: two stops (where they stop shows once answered), three levers, and the Tune page's row.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.stops) {
    view.stops.forEach((s, i) => {
      const y = 250 + i * 150;
      ctx.fillStyle = '#23272a'; ctx.fillRect(40, y - 44, 920, 80);
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(stripX(0), y - 44); ctx.lineTo(stripX(0), y + 36); ctx.stroke();
      text(ctx, `From ${s.kmh} km/h`, 48, y - 56, {size: 17, align: 'left'});
      const at = view.answered ? s.metres : 0;
      car(ctx, stripX(at), y + 4, .48);
      if (view.answered) text(ctx, m1(s.metres), stripX(s.metres) + 14, y - 20, {size: 18, align: 'left', colour: theme.accent});
    });
    return;
  }
  if (view.balances) {
    view.balances.forEach((b, i) => {
      const x = 180 + i * 320, y = 300;
      panel(ctx, x - 140, y - 110, 280, 220);
      text(ctx, `${b.front}% front`, x, y - 80, {size: 22});
      ctx.fillStyle = '#2b3236'; ctx.fillRect(x - 110, y - 5, 220, 10);
      const kx = x - 110 + (b.front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220;
      ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, y - 20, 11, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'back', x - 110, y + 26, {size: 13, colour: theme.faint}); text(ctx, 'front', x + 110, y + 26, {size: 13, colour: theme.faint});
      if (view.answered) text(ctx, b.slides ? 'the back slides' : 'the back stays in line', x, y + 72, {size: 19, colour: b.slides ? theme.bad : GREEN});
    });
    return;
  }
  const x = 170, y = 150, w = 660;
  panel(ctx, x, y, w, 260);
  text(ctx, 'THE TUNE PAGE · IN THE GARAGE', x + 20, y + 24, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, 'Brake balance', x + 20, y + 62, {size: 26, align: 'left'});
  [-2, -1, 0, 1, 2].forEach((stepNo, i) => {
    const bx = x + 20 + i * 126, on = stepNo === 2;
    ctx.fillStyle = on ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(bx, y + 90, 114, 44, 6); ctx.fill();
    if (on) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); }
    text(ctx, stepNo === 0 ? '0' : stepNo > 0 ? `+${stepNo}` : String(stepNo), bx + 57, y + 112, {size: 18});
  });
  text(ctx, 'toward the front', x + 20, y + 150, {size: 13, align: 'left', colour: theme.faint}); text(ctx, 'toward the rear', x + w - 20, y + 150, {size: 13, align: 'right', colour: theme.faint});
  if (view.tune.effect) wrap(ctx, view.tune.effect, x + w / 2, y + 200, w - 40);
  else text(ctx, 'Two steps toward the rear', x + w / 2, y + 205, {size: 20, colour: theme.faint});
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'four') {
      // Each stop to the same scale, 3.2 board units a metre, one stretch of road for each block of energy.
      for (const [k, speed] of [[0, SLOW], [1, FAST]]) {
        const y = 170 + k * 90, metres = metresFrom(speed), stretches = Math.round(metres / S_SLOW), one = metres * 3.2 / stretches;
        for (let n = 0; n < stretches; n++) { ctx.fillStyle = n % 2 ? '#b38f3a' : theme.accent; ctx.fillRect(x + 30 + n * one, y, one, 14); }
        text(ctx, `${kmh(speed)} km/h: ${m1(metres)}`, x + 30, y - 16, {size: 15, align: 'left'});
      }
    }
    if (idea.id === 'weight') {
      car(ctx, x + 250, 250, 2.2);
      text(ctx, `front ${pct(FRONT_LOAD)}`, x + 206, 300, {size: 16, colour: GREEN}); text(ctx, `back ${pct(REAR_LOAD)}`, x + 87, 300, {size: 16, colour: GREEN});
    }
    if (idea.id === 'balance') {
      ctx.fillStyle = '#2b3236'; ctx.fillRect(x + 40, 230, 220, 10);
      ctx.fillStyle = 'rgba(86,214,131,.35)'; ctx.fillRect(x + 40 + (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 230, 220 - (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 10);
      ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(x + 40 + (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 215, 11, 0, Math.PI * 2); ctx.fill();
      text(ctx, `${STEADY_FRONT}% front or more stays in line`, x + w / 2, 280, {size: 15, colour: GREEN});
    }
    wrap(ctx, together(idea.text), x + w / 2, 360, w - 30, {size: 19, weight: 600});
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'rig') drawRig(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: two stops on a little strip, a lever, and the race trade.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'stops') {
    // 160 m across the card, the brake line on the left.
    const x0 = 22, per = (w - 40) / 160;
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 14); ctx.lineTo(x0, h - 10); ctx.stroke();
    picture.metres.forEach((metres, i) => {
      const y = 36 + i * 44;
      ctx.fillStyle = '#23272a'; ctx.fillRect(x0, y - 16, w - 30, 32);
      car(ctx, x0 + metres * per, y + 4, .3);
      ctx.fillStyle = theme.accent; ctx.fillRect(x0, y + 12, metres * per, 3);
    });
  }
  if (picture.kind === 'lever') {
    ctx.fillStyle = '#2b3236'; ctx.fillRect(30, h / 2, w - 60, 8);
    const kx = 30 + (picture.front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * (w - 60);
    ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, h / 2 - 10, 10, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'back', 30, h / 2 + 26, {size: 13, colour: theme.faint}); text(ctx, 'front', w - 30, h / 2 + 26, {size: 13, colour: theme.faint});
  }
  if (picture.kind === 'game') {
    car(ctx, w / 2 + 50, h / 2 + 8, 1.1);
    if (picture.what === 'trade') { text(ctx, 'stops +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'turns −', w - 40, 30, {size: 16, colour: theme.bad}); }
    if (picture.what === 'both') { text(ctx, 'stops +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'turns +', w - 40, 30, {size: 16, colour: GREEN}); }
    if (picture.what === 'same') text(ctx, 'no change', w / 2, 30, {size: 16, colour: theme.faint});
  }
}
