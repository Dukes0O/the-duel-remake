// The Fuel lesson's board (docs/board/cards/LAB-CLASSROOM-FUEL.md): the car's see-through tank on a platform scale
// with a litres gauge, the pump nozzle that pours in and the tap that pours out into a jerry can, a drag strip of
// Falcone F42s timed to 60 mph with a photo finish, the litre jug, and the job card for Brian's job. Draws and
// hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {HALF, WEIGH_KG, kg1, kg2, s2, pct, gapWords} from './fuel-classroom.js';
import {TANK_LITRES, POUR_LITRES, PETROL_KG_PER_LITRE, WATER_KG_PER_LITRE, GRAND_PRIX} from '../benches/fuel.js';
export {BOARD};
export const pressMovesDrag = false;

const PETROL = '#e0a63a', WATER = '#5a9fd6', CAR = '#c8402f';
// The tank and its scale, on the left.
const TANK = Object.freeze({x: 95, y: 190, w: 170, h: 240});
const NOZZLE = Object.freeze([180, 150]), TAP = Object.freeze([300, 418]), CAN = Object.freeze({x: 318, y: 470, w: 80, h: 92});
// The drag strip: 46 m across, on the right beside the tank, or the whole board on its own.
const STRIP = Object.freeze({metres: 46, top: 160, gap: 100});
const RIGHT = Object.freeze({x: 450, w: 510}), WIDE = Object.freeze({x: 80, w: 840});
const stripOf = view => view.tank || view.job ? RIGHT : WIDE;
const JUGS = Object.freeze({water: [300, 400], petrol: [700, 400]});
const ON_SCALE = Object.freeze([500, 400]);

const inBox = (x, y, [cx, cy], r) => Math.hypot(x - cx, y - cy) < r;
const laneY = i => STRIP.top + i * STRIP.gap;
const stripX = (g, metres) => g.x + 110 + metres / STRIP.metres * (g.w - 130);
const shop = view => view.scene === 'shop';

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!shop(view)) return null;
  if (view.tank && view.keys['↑'] && inBox(x, y, NOZZLE, 48)) return {action: view.keys['↑']};
  if (view.tank && view.keys['↓'] && inBox(x, y, TAP, 40)) return {action: view.keys['↓']};
  if (view.keys.Space === 'fill' && view.jug && x > 530 && x < 670 && y > 270 && y < 470) return {action: 'fill'};
  if (view.keys.Space === 'go' && goArea(view, x, y)) return {action: 'go'};
  if (view.jugs && view.keys['1']) for (const [what, key] of [['water', '1'], ['petrol', '2']]) if (onJug(view, what, x, y)) return {action: view.keys[key]};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!shop(view)) return null;
  if (view.tank) {
    if (inBox(x, y, NOZZLE, 48)) return 'The pump nozzle: it pours petrol into the tank, 5 litres at a time.';
    if (inBox(x, y, TAP, 40)) return 'The tap: it lets petrol out into the jerry can, 5 litres at a time.';
    if (x > CAN.x && x < CAN.x + CAN.w && y > CAN.y && y < CAN.y + CAN.h) return 'The jerry can: the petrol you poured out. It is off the scale, so it does not count.';
    if (x > TANK.x && x < TANK.x + TANK.w && y > TANK.y && y < TANK.y + TANK.h) return view.covered ? 'The gauge is covered: read the scale.' : `The car’s tank: ${Math.round(view.litres)} of ${TANK_LITRES} litres.`;
    if (view.scale && x > 70 && x < 290 && y > 430 && y < 545) return `The scale: it weighs the tank’s petrol. ${kg1(view.kg)} now.`;
  }
  if (view.jug && x > 530 && x < 670 && y > 270 && y < 470) return 'A one litre jug. The line shows one litre.';
  if (view.jugs) for (const what of ['water', 'petrol']) if (onJug(view, what, x, y)) return `One litre of ${what}.`;
  const g = stripOf(view);
  if (view.job && x > g.x && x < g.x + g.w && y > 30 && y < 240) return 'The race card: how far this race goes, and how far your petrol lasts.';
  for (const [i, l] of view.lanes.entries()) if (y > laneY(i) - 40 && y < laneY(i) + 30 && x > g.x && x < g.x + g.w)
    return `A Falcone F42 with ${l.litres} litres of petrol, ${kg1(l.kg)}, timed from 0 to 60 mph.`;
  return null;
}
export function targetPoint(view, action) {
  if (!shop(view)) return null;
  if (action === 'pour:in' || action === 'pour:best' && view.best > view.litres) return [NOZZLE[0], NOZZLE[1] - 6];
  if (action === 'pour:out' || action === 'pour:best') return TAP;
  if (action === 'go') return view.covered ? SCALE : view.job ? [RIGHT.x + 60, 330] : [stripX(RIGHT, 0) - 40, laneY(0)];
  if (action === 'fill') return [600, 360];
  if (action === 'weigh:best' && view.bestJug) return jugAt(view, view.bestJug);
  // Sparks fly from the winning car, the jug or the tank.
  const winner = view.lanes.findIndex(l => l.winner);
  if (winner >= 0) return [stripX(stripOf(view), view.lanes[winner].metres) - 40, laneY(winner)];
  if (view.jug) return [600, 320];
  if (view.jugs) return ON_SCALE;
  if (view.tank) return [TANK.x + TANK.w / 2, TANK.y + 40];
  return [BOARD.width / 2, BOARD.height / 2];
}
export function dragAngle() { return 0; }
const jugAt = (view, what) => view.jugs?.on === what ? ON_SCALE : JUGS[what];
// A jug as it is drawn: 110 wide, standing on y 470, 150 tall.
const onJug = (view, what, x, y) => Math.abs(x - jugAt(view, what)[0]) < 60 && y > 310 && y < 475;
// Space by mouse: the scale weighs (By weight), the job's race track or the strip's lanes race.
const SCALE = Object.freeze([180, 505]);
function goArea(view, x, y) {
  if (view.covered) return x > 70 && x < 290 && y > 440 && y < 545;
  if (view.job) return x > RIGHT.x && x < RIGHT.x + RIGHT.w && y > 290 && y < 370;
  return x > RIGHT.x && x < RIGHT.x + RIGHT.w && y > laneY(0) - 50 && y < laneY(Math.max(1, view.lanes.length - 1)) + 32;
}

// ---- pieces ----
function glowBox(ctx, view, x, y, w, h) {
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .45 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke(); ctx.globalAlpha = 1;
}
function scaleBody(ctx, cx, top, w, reading, on = true) {
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(cx - w / 2, top, w, 16);
  ctx.fillStyle = theme.iron[0]; ctx.fillRect(cx - w / 2, top, w, 4);
  ctx.fillStyle = theme.beamDark; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 12, top + 16, w - 24, 84, 6); ctx.fill();
  if (!on) return;
  ctx.fillStyle = '#0d1a12'; ctx.beginPath(); ctx.roundRect(cx - 74, top + 32, 148, 50, 5); ctx.fill();
  text(ctx, reading, cx, top + 58, {size: 30, colour: '#9ff0b4', weight: 800});
}
function tank(ctx, view) {
  const {x, y, w, h} = TANK, k = Math.max(0, Math.min(1, view.level / TANK_LITRES));
  // The stand or the scale under it.
  scaleBody(ctx, x + w / 2, y + h + 10, 230, kg1(view.kg), view.scale);
  if (view.scale) text(ctx, 'SCALE', x + w / 2, y + h + 118, {size: 13, colour: theme.faint, weight: 800});
  // Glass, petrol and the steel frame.
  ctx.fillStyle = 'rgba(200,220,230,.08)'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, y + h * (1 - k), 0, y + h); g.addColorStop(0, '#f2c25a'); g.addColorStop(1, '#a8701e');
  ctx.fillStyle = g; ctx.globalAlpha = .88; ctx.fillRect(x + 3, y + h * (1 - k), w - 6, h * k); ctx.globalAlpha = 1;
  if (k > 0) { ctx.fillStyle = 'rgba(255,240,190,.55)'; ctx.fillRect(x + 3, y + h * (1 - k), w - 6, 3); }
  ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 5; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = theme.beam; ctx.fillRect(x + w / 2 - 22, y - 12, 44, 14);
  // The gauge: a mark every 10 litres, the half line when the step asks for it.
  for (let l = 0; l <= TANK_LITRES; l += 10) {
    const ty = y + h * (1 - l / TANK_LITRES);
    ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, ty); ctx.lineTo(x, ty); ctx.stroke();
    text(ctx, String(l), x - 18, ty, {size: 14, align: 'right', colour: theme.text});
  }
  text(ctx, 'litres', x - 18, y - 22, {size: 13, align: 'right', colour: theme.faint});
  if (view.half) {
    const hy = y + h / 2;
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(x - 4, hy); ctx.lineTo(x + w + 4, hy); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `half: ${HALF}`, x + w - 8, hy - 12, {size: 15, align: 'right', colour: theme.accent});
  }
  text(ctx, `${Math.round(view.litres)} litres`, x + w / 2, y + 26, {size: 24, colour: theme.text, weight: 800});
  // A cloth over the tank when the step asks for the scale alone.
  if (view.covered) {
    ctx.fillStyle = '#6b5236'; ctx.beginPath(); ctx.moveTo(x - 62, y - 34); ctx.lineTo(x + w + 10, y - 34); ctx.lineTo(x + w + 16, y + h + 6); ctx.quadraticCurveTo(x + w / 2, y + h, x - 66, y + h + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 20 + i * 40, y - 14); ctx.lineTo(x - 26 + i * 42, y + h); ctx.stroke(); }
    text(ctx, 'Gauge covered:', x + w / 2 - 8, y + h / 2 - 14, {size: 18}); text(ctx, 'read the scale', x + w / 2 - 8, y + h / 2 + 12, {size: 18});
  }
  nozzle(ctx, view); tap(ctx, view); jerryCan(ctx, view);
}
// A pump nozzle side on: the hose, a green grip with its lever, and the spout pointing down; (tx, ty) is the spout's tip.
function pumpNozzle(ctx, tx, ty) {
  ctx.strokeStyle = '#1f2427'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx - 150, ty - 120); ctx.bezierCurveTo(tx - 110, ty - 140, tx - 80, ty - 60, tx - 52, ty - 46); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.save(); ctx.translate(tx, ty);
  ctx.fillStyle = '#2f6b45'; ctx.beginPath(); ctx.moveTo(-56, -52); ctx.lineTo(-12, -44); ctx.lineTo(-8, -26); ctx.lineTo(-50, -32); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1f2427'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-46, -28); ctx.quadraticCurveTo(-34, -12, -16, -22); ctx.stroke();
  ctx.fillStyle = theme.iron[0]; ctx.beginPath(); ctx.moveTo(-12, -42); ctx.lineTo(4, -38); ctx.lineTo(4, 0); ctx.lineTo(-3, 0); ctx.lineTo(-3, -30); ctx.lineTo(-10, -30); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function nozzle(ctx, view) {
  const [nx, ny] = NOZZLE;
  pumpNozzle(ctx, nx, ny + 26);
  if (view.keys['↑']) keyCap(ctx, nx - 66, ny - 30, '↑');
  // Petrol running while the level rises.
  if (view.level < view.litres - .2) { ctx.fillStyle = PETROL; ctx.fillRect(nx - 2, ny + 26, 5, TANK.y + TANK.h * (1 - view.level / TANK_LITRES) - ny - 26); }
  if (view.glow === 'nozzle' || view.glow === 'pour' && view.keys['↑']) glowBox(ctx, view, nx - 76, ny - 42, 96, 76);
}
function tap(ctx, view) {
  const [tx, ty] = TAP;
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(TANK.x + TANK.w, ty - 6, tx - TANK.x - TANK.w + 14, 12);
  ctx.fillStyle = '#b8402f'; ctx.beginPath(); ctx.arc(tx - 6, ty - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(tx + 6, ty - 6, 8, 26);
  if (view.keys['↓']) keyCap(ctx, tx + 34, ty - 18, '↓');
  if (view.level > view.litres + .2) { ctx.fillStyle = PETROL; ctx.fillRect(tx + 8, ty + 20, 5, CAN.y - ty - 8); }
  if (view.glow === 'pour' && view.keys['↓']) glowBox(ctx, view, tx - 22, ty - 26, 64, 56);
}
function jerryCan(ctx, view) {
  const {x, y, w, h} = CAN, k = Math.max(0, Math.min(1, view.can / TANK_LITRES));
  ctx.fillStyle = '#7b2a22'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(224,166,58,.35)'; ctx.fillRect(x + 6, y + h - 6 - (h - 14) * k, w - 12, (h - 14) * k);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + w - 8, y + h - 10); ctx.moveTo(x + w - 8, y + 10); ctx.lineTo(x + 8, y + h - 10); ctx.stroke();
  ctx.fillStyle = '#7b2a22'; ctx.fillRect(x + 12, y - 12, 26, 12); ctx.fillRect(x + w - 26, y - 8, 14, 8);
}
// A Falcone F42 side on, nose to the right; x is the nose.
function car(ctx, nose, y, scale = 1, colour = CAR) {
  ctx.save(); ctx.translate(nose, y); ctx.scale(scale, scale);
  ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, -4); ctx.lineTo(-30, -9); ctx.lineTo(-44, -20); ctx.lineTo(-66, -20); ctx.lineTo(-80, -9); ctx.lineTo(-92, -7); ctx.lineTo(-92, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c3a42'; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-46, -18); ctx.lineTo(-64, -18); ctx.lineTo(-74, -10); ctx.closePath(); ctx.fill();
  for (const wx of [-20, -74]) { ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 7, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 7, 3.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// A little tank gauge by a lane's name: how full that car is.
function miniTank(ctx, x, y, litres) {
  ctx.strokeStyle = theme.text; ctx.lineWidth = 1.5; ctx.strokeRect(x, y - 14, 12, 26);
  const k = litres / TANK_LITRES; ctx.fillStyle = PETROL; ctx.fillRect(x + 2, y + 10 - 22 * k, 8, 22 * k);
}
function strip(ctx, view) {
  const n = view.lanes.length, g = stripOf(view);
  ctx.fillStyle = '#23272a'; ctx.fillRect(g.x, laneY(0) - 50, g.w, (n - 1) * STRIP.gap + 82);
  for (let i = 1; i < n; i++) { ctx.strokeStyle = 'rgba(245,240,220,.35)'; ctx.setLineDash([16, 12]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, laneY(i) - 50); ctx.lineTo(g.x + g.w, laneY(i) - 50); ctx.stroke(); ctx.setLineDash([]); }
  ctx.strokeStyle = theme.text; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i < n; i++) { ctx.moveTo(stripX(g, 0), laneY(i) - 14); ctx.lineTo(stripX(g, 0), laneY(i) + 28); }
  ctx.stroke();
  text(ctx, 'start', stripX(g, 0), laneY(n - 1) + 46, {size: 13, colour: theme.faint});
  for (const m of [10, 20, 30, 40]) text(ctx, `${m} m`, stripX(g, m), laneY(n - 1) + 46, {size: 12, colour: theme.faint});
  text(ctx, 'Nought to 60 mph, timed at real speed', g.x + g.w / 2, laneY(0) - 84, {size: 16, colour: theme.faint});
  view.lanes.forEach((l, i) => {
    const y = laneY(i);
    // The car's nose is where it has got to; the stopwatch and the speed ride above the lane, clear of the car.
    car(ctx, stripX(g, l.metres), y + 6);
    miniTank(ctx, g.x + 12, y - 28, l.litres);
    text(ctx, `${l.label} · ${l.litres} L · ${kg1(l.kg)}`, g.x + 32, y - 28, {size: 15, align: 'left', colour: theme.text});
    const sx = g.x + g.w - 8;
    if (l.seconds != null) {
      ctx.fillStyle = 'rgba(10,14,15,.85)'; ctx.beginPath(); ctx.roundRect(sx - 118, y - 42, 118, 26, 5); ctx.fill();
      text(ctx, `${s2(l.seconds)}${l.winner ? '  first' : ''}`, sx - 6, y - 29, {size: 16, align: 'right', colour: !l.done ? theme.text : l.winner || l.behindM == null ? '#9ff0b4' : theme.bad});
      text(ctx, `${Math.round(l.mph)} mph`, sx - 128, y - 29, {size: 14, align: 'right', colour: theme.faint});
    }
  });
  photo(ctx, view, g);
}
// The photo finish: the moment the first car reached 60 mph, close up, with the gap in centimetres.
function photo(ctx, view, g) {
  const lanes = view.lanes.filter(l => l.photoM != null);
  if (!lanes.length) return;
  const w = Math.min(g.w, 560), x = g.x + (g.w - w) / 2, y = laneY(view.lanes.length - 1) + 64, h = 40 + lanes.length * 36;
  if (y + h > BOARD.height - 4) return;
  const lead = Math.max(...lanes.map(l => l.photoM)), gap = Math.max(...lanes.map(l => lead - l.photoM)), noseX = x + w - 130;
  // Close up: a metre is 150 board units, or less so the furthest car still fits behind its name.
  const perM = Math.min(150, (noseX - x - 200) / Math.max(gap, .01));
  ctx.fillStyle = 'rgba(10,14,15,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  text(ctx, 'PHOTO FINISH: the moment the first car reached 60 mph', x + 12, y + 16, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  lanes.forEach((l, i) => {
    const cy = y + 54 + i * 36, nx = noseX - (lead - l.photoM) * perM;
    text(ctx, l.label, x + 14, cy - 2, {size: 14, align: 'left'});
    car(ctx, nx, cy, .7);
    if (l.behindM != null) {
      ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx + 2, cy - 12); ctx.lineTo(noseX, cy - 12); ctx.stroke();
      text(ctx, `${gapWords(l.behindM)} behind`, noseX + 10, cy - 2, {size: 15, align: 'left', colour: theme.bad});
    } else text(ctx, 'first', noseX + 10, cy - 2, {size: 15, align: 'left', colour: '#9ff0b4'});
  });
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(noseX, y + 28); ctx.lineTo(noseX, y + h - 4); ctx.stroke(); ctx.setLineDash([]);
}
function jug(ctx, cx, bottom, fill, liquid, {label = null, key = null, w = 110, h = 150, mark = true} = {}) {
  const x = cx - w / 2, y = bottom - h;
  ctx.fillStyle = liquid; ctx.globalAlpha = .85; ctx.fillRect(x + 4, bottom - 4 - (h * .8 - 4) * fill, w - 8, (h * .8 - 4) * fill); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, bottom); ctx.lineTo(x + w, bottom); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w, y + 20); ctx.quadraticCurveTo(x + w + 34, y + 30, x + w, y + 70); ctx.stroke();
  const line = bottom - h * .8;
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, line); ctx.lineTo(x + w * .45, line); ctx.stroke();
  if (mark) text(ctx, '1 litre', x - 12, line, {size: 14, align: 'right', colour: theme.accent});
  if (label) text(ctx, label, cx, y - 22, {size: 17});
  if (key) keyCap(ctx, x - 14, y - 22, key);
}
function litreStep(ctx, view) {
  const fill = view.jug.fill;
  pumpNozzle(ctx, 600, 200);
  if (fill < 1 && fill > 0) { ctx.fillStyle = PETROL; ctx.fillRect(598, 200, 5, 466 - 156 * fill - 200); }
  jug(ctx, 600, 470, fill, PETROL, {w: 140, h: 200});
  text(ctx, 'One litre jug', 600, 496, {size: 17});
  if (view.glow === 'jug') glowBox(ctx, view, 510, 250, 200, 240);
  // Done: the tank holds seventy of them.
  if (fill >= 1) {
    for (let i = 0; i < TANK_LITRES; i++) { const gx = 790 + (i % 7) * 24, gy = 200 + Math.floor(i / 7) * 30; ctx.fillStyle = PETROL; ctx.fillRect(gx, gy, 16, 22); ctx.strokeStyle = '#d7e3e8'; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, 16, 22); }
    text(ctx, `${TANK_LITRES} litres: the car’s tank`, 870, 520, {size: 17});
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
// Brian's job: the race card, how far the petrol lasts against how far the race goes, and the race itself.
function jobCard(ctx, view) {
  const j = view.job, x = RIGHT.x, w = RIGHT.w;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, 30, w, 200, 8); ctx.fill(); ctx.stroke();
  text(ctx, `BRIAN’S JOB · RACE ${j.day} OF ${j.of}${j.done ? ' · DONE' : ''}`, x + 18, 52, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, j.name, x + 18, 84, {size: 24, align: 'left'});
  text(ctx, `It needs petrol for ${pct(j.share)} of a Grand Prix.`, x + 18, 116, {size: 17, align: 'left', colour: theme.text});
  // The bar: 0 to 110% of a Grand Prix, the race's line, and how far the tank lasts.
  const bx = x + 18, bw = w - 36, by = 150, at = share => bx + share / GRAND_PRIX.fullTankShare * bw;
  ctx.fillStyle = '#2b3236'; ctx.fillRect(bx, by, bw, 24);
  ctx.fillStyle = j.lasts >= j.share ? '#56a86f' : '#b55a3f'; ctx.fillRect(bx, by, at(Math.min(j.lasts, GRAND_PRIX.fullTankShare)) - bx, 24);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(at(j.share), by - 8); ctx.lineTo(at(j.share), by + 32); ctx.stroke();
  text(ctx, 'the race', at(j.share), by + 46, {size: 13, colour: theme.accent});
  text(ctx, `The tank lasts ${pct(j.lasts)}`, bx, by - 12, {size: 14, align: 'left', colour: theme.text});
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(at(1), by + 24); ctx.lineTo(at(1), by + 34); ctx.stroke();
  text(ctx, 'a whole Grand Prix', at(1), by + 62, {size: 12, colour: theme.faint});
  // The race: start to flag, the car stopping where the petrol runs out.
  const ty = 330, tx0 = x + 40, tx1 = x + w - 30;
  ctx.fillStyle = '#23272a'; ctx.fillRect(x, ty - 36, w, 64);
  ctx.strokeStyle = theme.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx0, ty - 30); ctx.lineTo(tx0, ty + 22); ctx.stroke();
  for (let k = 0; k < 6; k++) for (let r = 0; r < 2; r++) { ctx.fillStyle = (k + r) % 2 ? '#111' : '#eee'; ctx.fillRect(tx1 + r * 8, ty - 30 + k * 8, 8, 8); }
  const race = j.race, carX = tx0 + 92 + (tx1 - tx0 - 92) * (race ? race.at : 0);
  car(ctx, carX, ty, 1);
  if (race?.dry) { text(ctx, 'out of petrol', carX - 46, ty - 34, {size: 15, colour: theme.bad}); for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(120,120,120,${.5 - i * .14})`; ctx.beginPath(); ctx.arc(carX - 100 - i * 14, ty - 4 - i * 6, 7 + i * 3, 0, Math.PI * 2); ctx.fill(); } }
  if (race?.over && !race.dry) text(ctx, 'finished', carX - 46, ty - 34, {size: 15, colour: '#9ff0b4'});
  if (view.keys.Space && !race) text(ctx, 'Space races it', tx0 + 110, ty - 4, {size: 15, align: 'left', colour: theme.faint});
  if (view.glow === 'pour' && view.target === 'go') glowBox(ctx, view, x + 4, ty - 40, w - 8, 72);
  text(ctx, `${Math.round(view.litres)} litres lasts ${pct(j.lasts)} of a Grand Prix`, TANK.x + TANK.w / 2 + 40, 640, {size: 17, colour: theme.text});
}
// Try 2's card: the weight wanted, the scale now, and what one pour weighs.
function weighCard(ctx, view) {
  const x = 520, y = 200, w = 400;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 230, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'THE JOB', x + 20, y + 26, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, `Petrol weighing ${kg1(WEIGH_KG)}`, x + 20, y + 64, {size: 26, align: 'left', colour: theme.accent});
  text(ctx, `On the scale now: ${kg1(view.kg)}`, x + 20, y + 120, {size: 22, align: 'left'});
  text(ctx, `One press pours ${POUR_LITRES} litres: ${kg1(POUR_LITRES * PETROL_KG_PER_LITRE)}`, x + 20, y + 170, {size: 18, align: 'left', colour: theme.text});
  text(ctx, 'Space (or a click on the scale) weighs it', x + 20, y + 204, {size: 15, align: 'left', colour: theme.faint});
  if (view.target === 'go') glowBox(ctx, view, 64, 436, 232, 112);
}
function drawShop(ctx, view) {
  background(ctx);
  if (view.tank) tank(ctx, view);
  if (view.jug) litreStep(ctx, view);
  if (view.jugs) kilogramStep(ctx, view);
  if (view.covered) weighCard(ctx, view);
  if (view.job) jobCard(ctx, view);
  else if (view.lanes.length) strip(ctx, view);
  else if (view.tank && view.keys.Space === 'go') {
    // Before the first race: the strip waits with its start line.
    const g = RIGHT;
    ctx.fillStyle = '#23272a'; ctx.fillRect(g.x, laneY(0) - 50, g.w, STRIP.gap + 82);
    car(ctx, stripX(g, 0), laneY(0) + 6); car(ctx, stripX(g, 0), laneY(1) + 6);
    text(ctx, `Your tank · ${view.litres} L`, g.x + 14, laneY(0) - 28, {size: 15, align: 'left'}); text(ctx, `Full tank · ${TANK_LITRES} L`, g.x + 14, laneY(1) - 28, {size: 15, align: 'left'});
    text(ctx, 'Space races them', stripX(g, 0) + 40, laneY(0) + 6, {size: 15, align: 'left', colour: theme.faint});
    if (view.glow === 'pour' && view.target === 'go') glowBox(ctx, view, g.x + 4, laneY(0) - 46, g.w - 8, STRIP.gap + 74);
  }
}
// The questions: the jugs (weighed once answered), the race, and the Tune page's Fuel load row.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.scene === 'check-water') {
    for (const [what, liquid, cx] of [['water', WATER, 330], ['petrol', PETROL, 670]]) {
      if (view.answered) scaleBody(ctx, cx, 470, 230, kg2(what === 'water' ? WATER_KG_PER_LITRE : PETROL_KG_PER_LITRE));
      jug(ctx, cx, 470, 1, liquid, {label: `One litre of ${what}`});
    }
  }
  if (view.scene === 'check-race') strip(ctx, view);
  if (view.scene === 'check-game') {
    const x = 170, y = 150, w = 660;
    ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 250, 8); ctx.fill(); ctx.stroke();
    text(ctx, 'THE TUNE PAGE · IN THE GARAGE', x + 20, y + 24, {size: 13, align: 'left', colour: theme.faint, weight: 800});
    text(ctx, 'Fuel load', x + 20, y + 62, {size: 26, align: 'left'});
    ['Full tank', 'Three-quarter', 'Half tank'].forEach((label, i) => {
      const bx = x + 20 + i * 210; ctx.fillStyle = i === view.tune.picked ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(bx, y + 90, 196, 48, 6); ctx.fill();
      if (i === view.tune.picked) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); }
      text(ctx, label, bx + 98, y + 114, {size: 19});
    });
    if (view.tune.effect) wrap(ctx, view.tune.effect, x + w / 2, y + 180, w - 40);
    else text(ctx, 'Race: a Grand Prix', x + w / 2, y + 190, {size: 20, colour: theme.faint});
  }
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'weight') { jug(ctx, x + 80, 330, 1, PETROL, {w: 80, h: 120, label: `1 litre: ${PETROL_KG_PER_LITRE} kg`}); text(ctx, `× ${TANK_LITRES}`, x + 200, 250, {size: 22}); text(ctx, `= ${kg1(PETROL_KG_PER_LITRE * TANK_LITRES)}`, x + 200, 290, {size: 24, colour: theme.accent}); }
    if (idea.id === 'quicker') { car(ctx, x + 262, 210, 1.4); text(ctx, 'half tank: first', x + 150, 250, {size: 15, colour: '#9ff0b4'}); car(ctx, x + 212, 320, 1.4); text(ctx, 'full tank', x + 120, 360, {size: 15}); ctx.strokeStyle = theme.accent; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 262, 170); ctx.lineTo(x + 262, 340); ctx.stroke(); ctx.setLineDash([]); }
    if (idea.id === 'game') ['Full tank', 'Three-quarter', 'Half tank'].forEach((label, k) => { ctx.fillStyle = k === 2 ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(x + 30, 150 + k * 60, w - 60, 44, 6); ctx.fill(); text(ctx, label, x + w / 2, 172 + k * 60, {size: 18}); });
    wrap(ctx, idea.text, x + w / 2, 440, w - 30);
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'shop') drawShop(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: a jug, two jugs, a car with its tank, two cars, and the game's three outcomes.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'jug') jug(ctx, w / 2, h - 18, 1, picture.what === 'water' ? WATER : PETROL, {w: 60, h: 80, mark: false});
  if (picture.kind === 'jugs') { jug(ctx, w / 2 - 50, h - 18, 1, WATER, {w: 50, h: 70, mark: false}); text(ctx, '=', w / 2 + 6, h / 2 + 8, {size: 26}); jug(ctx, w / 2 + 66, h - 18, 1, PETROL, {w: 50, h: 70, mark: false}); }
  if (picture.kind === 'car') { car(ctx, w - 30, h / 2 + 10, 1.3); miniTank(ctx, 20, h / 2 + 2, picture.litres); text(ctx, `${picture.litres} L`, 40, h / 2 + 2, {size: 15, align: 'left'}); }
  if (picture.kind === 'cars') { car(ctx, w - 20, h / 2 - 12, .9); car(ctx, w - 20, h / 2 + 30, .9); ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w - 20, 10); ctx.lineTo(w - 20, h - 8); ctx.stroke(); }
  if (picture.kind === 'game') {
    if (picture.what === 'pit') { car(ctx, w / 2 + 10, h / 2 + 18, 1); ctx.fillStyle = '#2f6b45'; ctx.fillRect(w - 50, 26, 30, 56); ctx.fillStyle = theme.text; ctx.fillRect(w - 44, 34, 18, 12); text(ctx, 'PIT', 40, 30, {size: 18, colour: theme.accent}); }
    if (picture.what === 'flag') for (let k = 0; k < 6; k++) for (let r = 0; r < 4; r++) { ctx.fillStyle = (k + r) % 2 ? '#111' : '#eee'; ctx.fillRect(w / 2 - 36 + k * 12, 24 + r * 12, 12, 12); }
    if (picture.what === 'slow') { car(ctx, w / 2 + 40, h / 2 + 10, 1); text(ctx, 'slow', w / 2 - 70, h / 2 + 10, {size: 20, colour: theme.bad}); }
  }
}
