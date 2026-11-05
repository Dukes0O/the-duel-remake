// The Fire triangle lesson's board (docs/board/cards/LAB-CLASSROOM-FIRE.md): Brian's fire pit with one switch plate
// per side of the triangle, the triangle itself, the water and sand buckets, and the practice fire's forest seen from
// above. Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, text, keyCap, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
import {COLS, ROWS, STRIP, ROAD, CELL_M, SIDES, SIDE_NAME, SWITCH_NAME, BUCKET_L, FLAT_OUT_L, COAT_L, TANK_L, WOOD_BURNS_C, WATER_BOILS_C, GROW, SPREAD_FROM, litres, litresFor, strengthOf} from './fire-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const SIDE_COLOUR = Object.freeze({fuel: '#edc557', heat: '#f06464', air: '#71c9ff'});
// ---- the pit scene ----
const PIT_X = 470, RIM_Y = 468, RIM_RX = 135, RIM_RY = 26;
// One plate per side, in the order the words come: Wood (fuel) 1, Gas (heat) 2, Lid (air) 3.
const PLATE_Y = 612, PLATE_H = 56, PLATE_W = 200;
const PLATE_X = Object.freeze({fuel: 250, heat: 470, air: 690});
const PLATE_ACTION = Object.freeze({fuel: ['wood:in', 'wood:out'], heat: ['gas:on', 'gas:off'], air: ['lid:shut', 'lid:open']});
const SIDE_LOWER = Object.freeze({fuel: 'fuel', heat: 'heat', air: 'oxygen'});
const PLATE_KEY = Object.freeze({fuel: '1', heat: '2', air: '3'});
const BUCKET_AT = Object.freeze({water: [96, 596], sand: [184, 596]}), BUCKET_W = 58, BUCKET_H = 64;
const POUR_AT = [PIT_X - 96, 352];
// The triangle: its top, and its base's ends.
const TRI = Object.freeze({x: 850, top: 84, base: 276, half: 108});
const TABLE = Object.freeze({x: 728, y: 330, w: 262});
// The thermometer beside the pit: the height of 0 degrees, and how many board units a degree is.
const THERMO = Object.freeze({x: 60, base: 440, perC: .62, top: 130});
// The words over the pit, one sentence for each side the fire has lost.
const PIT_WORDS = Object.freeze({x: 40, y: 40});
// ---- the forest scene, from above ----
const FX = 60, FY = 196, CELL = 100;
const ROAD_X = FX + COLS * CELL + 8, ROAD_W = 56;
const TOOL_AT = [FX + (STRIP + .5) * CELL, FY - 52];
const BURN_KEY = [FX + 3 * CELL, FY + ROWS * CELL + 46], DROP_KEY = [FX + 220, FY + ROWS * CELL + 50];
const cellAt = (x, y) => {
  const i = Math.floor((x - FX) / CELL), j = Math.floor((y - FY) / CELL);
  return i >= 0 && i < COLS && j >= 0 && j < ROWS ? [i, j] : null;
};
const cellCentre = (i, j) => [FX + (i + .5) * CELL, FY + (j + .5) * CELL];
const inBox = (x, y, x0, y0, w, h) => x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h;
const plateBox = side => [PLATE_X[side] - PLATE_W / 2, PLATE_Y, PLATE_W, PLATE_H];
const bucketBox = tool => [BUCKET_AT[tool][0] - BUCKET_W / 2 - 6, BUCKET_AT[tool][1] - BUCKET_H - 10, BUCKET_W + 12, BUCKET_H + 14];

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  const actions = Object.values(view.keys);
  if (view.scene === 'pit' && view.plates) for (const side of SIDES) {
    const action = PLATE_ACTION[side].find(a => actions.includes(a));
    if (action && inBox(x, y, ...plateBox(side))) return {action};
  }
  if (view.keys.Space === 'tip') {
    const tool = view.tools?.inHand;
    if (tool && (inBox(x, y, ...bucketBox(tool)) || Math.hypot(x - BUCKET_AT[tool][0], y - (BUCKET_AT[tool][1] - BUCKET_H - 70)) < 30 || Math.abs(x - PIT_X) < RIM_RX && y > 250 && y < GROUND_Y)) return {action: 'tip'};
  }
  if (view.scene !== 'forest') return null;
  if (view.keys.Space === 'rake' || view.keys.Space === 'coat') {
    const c = cellAt(x, y);
    if (Math.hypot(x - TOOL_AT[0], y - TOOL_AT[1]) < 46 || Math.hypot(x - TOOL_AT[0] - 72, y - TOOL_AT[1] - 12) < 30 || c?.[0] === STRIP) return {action: view.keys.Space};
  }
  if ((view.keys.Space === 'burn' || view.keys.Space === 'spread') && (cellAt(x, y) || Math.hypot(x - BURN_KEY[0], y - BURN_KEY[1]) < 40)) return {action: view.keys.Space};
  if (view.keys.Space === 'drop') {
    const c = cellAt(x, y);
    if (c) return {action: `drop:${c[0]}:${c[1]}`};
    if (Math.hypot(x - DROP_KEY[0], y - DROP_KEY[1]) < 30) return {action: 'drop'};
  }
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene === 'wonder' || view.scene === 'recap' || view.scene === 'check') return null;
  if (view.triangle && Math.abs(x - TRI.x) < TRI.half + 30 && y > TRI.top - 20 && y < TRI.base + 30)
    return 'This is the fire triangle, with one side each for heat, fuel and oxygen. A side is lit while the fire has it, and when any side is removed the fire goes out.';
  if (view.scene === 'pit') {
    if (view.plates) for (const side of SIDES) if (inBox(x, y, ...plateBox(side)))
      return view.known.includes(side) ? `The ${SWITCH_NAME[side]} switch controls the ${SIDE_LOWER[side]}.` : `This is the ${SWITCH_NAME[side]} switch.`;
    for (const tool of ['water', 'sand']) if (view.tools && inBox(x, y, ...bucketBox(tool)))
      return tool === 'water' ? 'This is a bucket of water.' : 'This is a bucket of dry sand.';
    if (Math.abs(x - PIT_X) < RIM_RX && y > RIM_Y - 30 && y < GROUND_Y) return 'This steel fire pit has a gas burner under the wood and a lid on a hinge.';
    return null;
  }
  const c = cellAt(x, y);
  if (!c || !view.forest) return x >= ROAD_X && x <= ROAD_X + ROAD_W && y > FY - 20 ? 'This is the road, and the fire must not reach it.' : x < FX && y > FY ? 'This is the lake, where the bucket is filled.' : null;
  const cell = view.forest.cells.find(k => k.i === c[0] && k.j === c[1]);
  const road = c[0] === ROAD ? ' This cell is beside the road.' : '';
  if (cell.state === 'burning') return `This cell is burning at a strength of ${strengthOf(cell.percent)}, so it needs ${litres(litresFor(cell.percent))} of water to go out.${road}`;
  if (cell.state === 'burnt') return `This cell is out, and nothing is burning here now.${road}`;
  if (cell.state === 'raked') return 'This is the raked strip of bare ground.';
  if (cell.state === 'coated') return `These trees are coated with ${litres(COAT_L)} of retardant, so they cannot catch fire.`;
  if (cell.state === 'damp') return `These trees are damp, so they are slower to catch fire for a while.${road}`;
  return `This is a cell of forest, ${CELL_M} metres across, with trees in it.${road}`;
}
export function targetPoint(view, action) {
  const [kind, a, b] = action.split(':');
  for (const side of SIDES) if (PLATE_ACTION[side].includes(action)) return [PLATE_X[side], PLATE_Y + PLATE_H / 2];
  if (action === 'tip') { const t = view.tools?.inHand; return t ? [BUCKET_AT[t][0], BUCKET_AT[t][1] - BUCKET_H / 2] : null; }
  if (action === 'rake' || action === 'coat') return TOOL_AT;
  if (action === 'burn' || action === 'spread') return BURN_KEY;
  if (kind === 'drop' && a !== undefined) return cellCentre(Number(a), Number(b));
  return null;
}
export function dragAngle() { return 0; }

// ---- drawing: shared pieces ----
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function spaceKey(ctx, x, y) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 26, y - 10, 52, 20, 3); ctx.fill();
  text(ctx, 'Space', x, y + 1, {size: 12, colour: '#1d2224', weight: 800});
}
// One flame: a teardrop that flickers, its foot at (x, y).
function flame(ctx, x, y, w, h, time, seed) {
  const flick = 1 + .12 * Math.sin(time * 9 + seed * 3.1) + .06 * Math.sin(time * 17 + seed);
  const top = y - h * flick, lean = Math.sin(time * 3 + seed) * w * .15;
  const g = ctx.createLinearGradient(0, y, 0, top);
  g.addColorStop(0, '#f2551f'); g.addColorStop(.55, '#f59a2a'); g.addColorStop(1, 'rgba(255,226,120,.85)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w / 2, y - h * .45, x + lean - w * .2, top + h * .25, x + lean, top);
  ctx.bezierCurveTo(x + lean + w * .2, top + h * .25, x + w / 2, y - h * .45, x + w / 2, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,170,.75)'; ctx.beginPath(); ctx.ellipse(x + lean * .4, y - h * .22, w * .16, h * .2, 0, 0, Math.PI * 2); ctx.fill();
}
function puffs(ctx, x, y, age, colour, n = 6, spread = 80) {
  for (let k = 0; k < n; k++) {
    const t = (age * .7 + k / n) % 1, px = x + Math.sin(k * 2.7) * spread * .5 * (1 + t), py = y - t * 170, r = 14 + t * 30;
    ctx.fillStyle = colour.replace('A', String(Math.max(0, .5 * (1 - t)))); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}
// The fire triangle: each side in its colour while the fire has it, dark with a cross once it is gone.
function triangle(ctx, {x, top, base, half}, gone, {burning = false, labels = true, size = 18, width = 9, time = 0} = {}) {
  const pts = {top: [x, top], left: [x - half, base], right: [x + half, base]};
  const sides = {fuel: [pts.top, pts.left], heat: [pts.left, pts.right], air: [pts.right, pts.top]};
  for (const side of SIDES) {
    const [a, b] = sides[side], off = gone.includes(side);
    ctx.strokeStyle = off ? 'rgba(120,128,132,.5)' : SIDE_COLOUR[side]; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.setLineDash(off ? [width, width * 1.2] : []); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]);
    if (off) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, r = width * 1.4;
      ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = width * .45; ctx.beginPath(); ctx.moveTo(mx - r, my - r); ctx.lineTo(mx + r, my + r); ctx.moveTo(mx + r, my - r); ctx.lineTo(mx - r, my + r); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  if (labels) {
    const h = base - top;
    text(ctx, SIDE_NAME.fuel, x - half * .5 - width * 3.6, top + h * .5, {size, align: 'right', colour: gone.includes('fuel') ? theme.faint : SIDE_COLOUR.fuel});
    text(ctx, SIDE_NAME.heat, x, base + size + width * 1.6, {size, colour: gone.includes('heat') ? theme.faint : SIDE_COLOUR.heat});
    text(ctx, SIDE_NAME.air, x + half * .5 + width * 3.6, top + h * .5, {size, align: 'left', colour: gone.includes('air') ? theme.faint : SIDE_COLOUR.air});
  }
  const cy = top + (base - top) * .64;
  if (burning) flame(ctx, x, cy + size * 1.1, size * 1.3, size * 2.4, time, 1);
  else text(ctx, 'OUT', x, cy, {size: size * .9, colour: theme.faint});
}

// ---- the fire pit, drawn round the middle of its rim ----
function bucket(ctx, x, y, tool, {glow = false, time = 0, tilt = 0, empty = false} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  const g = ctx.createLinearGradient(-BUCKET_W / 2, 0, BUCKET_W / 2, 0);
  g.addColorStop(0, theme.iron[1]); g.addColorStop(.5, theme.iron[0]); g.addColorStop(1, theme.iron[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-BUCKET_W / 2, -BUCKET_H); ctx.lineTo(BUCKET_W / 2, -BUCKET_H); ctx.lineTo(BUCKET_W / 2 - 7, 0); ctx.lineTo(-BUCKET_W / 2 + 7, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(time * 6) * 1.5 : 1.5; ctx.stroke();
  if (!empty) { ctx.fillStyle = tool === 'water' ? '#4f9fd1' : '#d4b57c'; ctx.beginPath(); ctx.ellipse(0, -BUCKET_H + 2, BUCKET_W / 2 - 3, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = theme.iron[1]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -BUCKET_H, BUCKET_W / 2, Math.PI, 0); ctx.stroke();
  ctx.restore();
}
function drawPit(ctx, p, time, {scale = 1} = {}) {
  ctx.save(); ctx.translate(PIT_X, RIM_Y); ctx.scale(scale, scale);
  // Legs, the bowl and the gas pipe with its valve.
  ctx.strokeStyle = theme.iron[2]; ctx.lineWidth = 7;
  for (const lx of [-96, 96]) { ctx.beginPath(); ctx.moveTo(lx, 60); ctx.lineTo(lx * 1.12, GROUND_Y - RIM_Y); ctx.stroke(); }
  ctx.strokeStyle = p.heat ? '#c94c3c' : theme.iron[1]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-250, 70); ctx.lineTo(-112, 70); ctx.stroke();
  ctx.fillStyle = p.heat ? '#c94c3c' : theme.iron[1]; ctx.beginPath(); ctx.arc(-200, 70, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-210, p.heat ? 70 : 60); ctx.lineTo(-190, p.heat ? 70 : 80); ctx.stroke();
  const body = ctx.createLinearGradient(-RIM_RX, 0, RIM_RX, 0);
  body.addColorStop(0, '#3a4146'); body.addColorStop(.45, '#7d868c'); body.addColorStop(1, '#262c30');
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-RIM_RX, 0); ctx.lineTo(-RIM_RX + 22, 92); ctx.lineTo(RIM_RX - 22, 92); ctx.lineTo(RIM_RX, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  // Inside the rim: the burner, the logs, and what was tipped on them.
  ctx.fillStyle = '#121618'; ctx.beginPath(); ctx.ellipse(0, 0, RIM_RX - 6, RIM_RY - 4, 0, 0, Math.PI * 2); ctx.fill();
  if (p.heat && p.putOut !== 'sand') for (let k = -4; k <= 4; k++) {
    ctx.fillStyle = 'rgba(90,150,255,.85)'; ctx.beginPath(); ctx.ellipse(k * 22, 4, 5, 9 + 3 * Math.sin(time * 14 + k), 0, 0, Math.PI * 2); ctx.fill();
  }
  if (p.fuel) {
    const wet = p.putOut === 'water';
    for (const [lx, ly, a] of [[-38, -2, .25], [34, -2, -.25], [0, -10, 0]]) {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
      ctx.fillStyle = wet ? '#2a211a' : p.flame > .2 || p.smoke != null ? '#3b2716' : '#8a5a32'; ctx.beginPath(); ctx.roundRect(-58, -9, 116, 18, 9); ctx.fill();
      ctx.fillStyle = wet ? '#3a3029' : '#c79a64'; ctx.beginPath(); ctx.ellipse(58, 0, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (wet) { ctx.fillStyle = 'rgba(120,180,220,.35)'; ctx.beginPath(); ctx.ellipse(0, 6, RIM_RX - 20, 10, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (p.putOut === 'sand') { ctx.fillStyle = '#c9ab72'; ctx.beginPath(); ctx.ellipse(0, -6, RIM_RX - 14, 22, 0, Math.PI, 0); ctx.ellipse(0, 0, RIM_RX - 10, RIM_RY - 6, 0, 0, Math.PI); ctx.fill(); }
  // The flames, as tall as the fire is strong.
  if (p.flame > 0) for (let k = 0; k < 7; k++) {
    const fx = (k - 3) * 30, h = (90 + 90 * Math.sin(k * 1.7) ** 2) * p.flame, w = 46 * Math.max(.35, p.flame);
    flame(ctx, fx, 4, w, h, time, k);
  }
  ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, RIM_RX, RIM_RY, 0, 0, Math.PI * 2); ctx.stroke();
  // The lid: standing open on its hinge at the back right, or shut over the rim.
  const lid = ctx.createLinearGradient(0, -RIM_RY, 0, RIM_RY); lid.addColorStop(0, '#9aa3a8'); lid.addColorStop(1, '#3e464b');
  ctx.fillStyle = lid; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
  if (p.air) {
    ctx.beginPath(); ctx.ellipse(RIM_RX + 18, -RIM_RX + 6, 20, RIM_RX, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.iron[2]; ctx.fillRect(RIM_RX + 30, -RIM_RX, 12, 30);
  } else {
    ctx.beginPath(); ctx.ellipse(0, -4, RIM_RX + 6, RIM_RY + 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.iron[2]; ctx.beginPath(); ctx.roundRect(-26, -30, 52, 14, 6); ctx.fill();
  }
  if (p.smoke != null) puffs(ctx, 0, -20, p.smoke, 'rgba(150,150,150,A)', 7, 90);
  if (p.putOut === 'water' && p.pour) puffs(ctx, 0, -10, p.pour.age, 'rgba(235,240,245,A)', 8, 120);
  ctx.restore();
}
// An arrow from (x0, y0) to (x1, y1), with a dot running along it so the picture shows which way things move.
function flowArrow(ctx, x0, y0, x1, y1, colour, time, {width = 4, dot = true} = {}) {
  const a = Math.atan2(y1 - y0, x1 - x0), head = width * 3;
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * .7, y1 - Math.sin(a) * head * .7); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - .5) * head, y1 - Math.sin(a - .5) * head); ctx.lineTo(x1 - Math.cos(a + .5) * head, y1 - Math.sin(a + .5) * head); ctx.closePath(); ctx.fill();
  if (dot) { const t = (time * .8) % 1; ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width * .7, 0, Math.PI * 2); ctx.fill(); }
}
function blockedMark(ctx, x, y, size = 9) {
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size); ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size); ctx.stroke(); ctx.lineCap = 'butt';
}
// The pit's three sides as things the player can see: fresh air moving in or stopped, heat rising from the burner, steam carrying heat away.
function mechanism(ctx, p, time) {
  const blocked = !p.air || p.putOut === 'sand', air = SIDE_COLOUR.air;
  [[300, 300], [340, 262]].forEach(([x, y], k) => {
    const endX = PIT_X - 110 + k * 50, endY = blocked ? RIM_Y - 74 : RIM_Y - 22;
    flowArrow(ctx, x, y, endX, endY, blocked ? 'rgba(113,201,255,.45)' : air, time + k * .4, {dot: !blocked});
    if (blocked) blockedMark(ctx, endX + 8, endY + 16);
  });
  text(ctx, blocked ? 'Fresh air is stopped' : 'Fresh air', 270, 236, {size: 15, colour: blocked ? theme.faint : air});
  if (p.heat && p.putOut !== 'sand' && p.putOut !== 'water') {
    for (const dx of [-60, 0, 60]) flowArrow(ctx, PIT_X + dx, RIM_Y + 82, PIT_X + dx, RIM_Y + 26, SIDE_COLOUR.heat, time + dx * .01, {width: 3});
    text(ctx, 'Heat from the gas', PIT_X - 248, RIM_Y + 100, {size: 14, align: 'left', colour: SIDE_COLOUR.heat});
  }
  if (p.putOut === 'water' && p.pour?.age > .6) {
    for (const dx of [-70, 0, 70]) flowArrow(ctx, PIT_X + dx, RIM_Y - 40, PIT_X + dx * 1.3, RIM_Y - 170, 'rgba(235,240,245,.85)', time + dx * .01, {width: 3});
    text(ctx, 'Steam carries the heat away', PIT_X, RIM_Y - 190, {size: 16, colour: '#f5f0dc'});
  }
}
// One sentence over the pit for each side the fire has lost, or the one sentence that says why it burns.
function pitWords(ctx, p, known) {
  const words = {heat: p.putOut === 'water' ? 'The water soaks up heat and turns to steam, so the wood is too cool to burn.' : 'With the gas off, nothing keeps the wood hot enough to burn.',
    fuel: 'With no wood in the pit, there is nothing to burn.', air: p.putOut === 'sand' ? 'The sand lies over the wood, so fresh air cannot reach the flames.' : 'The shut lid keeps fresh air out, so the fire has no oxygen.'};
  const lines = p.missing.length ? p.missing.map(side => words[side]) : [known.includes('air') ? 'The wood has heat, fuel and oxygen all at once, so it burns.' : 'The wood is hot enough, so it burns.'];
  lines.forEach((line, k) => text(ctx, line, PIT_WORDS.x, PIT_WORDS.y + k * 28, {size: 17, align: 'left', weight: 600, colour: p.missing.length ? theme.text : theme.good}));
}
// The thermometer: the wood's temperature rising past the line where wood burns, or falling to where water boils.
function thermometer(ctx, p) {
  const {x, base, perC, top} = THERMO, wet = p.putOut === 'water';
  const degrees = wet ? WATER_BOILS_C + (450 - WATER_BOILS_C) * p.flame : 20 + 430 * p.flame, level = base - degrees * perC;
  ctx.fillStyle = 'rgba(10,14,15,.8)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - 11, top, 22, base - top + 14, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = degrees >= WOOD_BURNS_C ? '#f2551f' : '#d9a640'; ctx.fillRect(x - 6, level, 12, base - level + 6);
  ctx.beginPath(); ctx.arc(x, base + 14, 16, 0, Math.PI * 2); ctx.fill();
  for (const [c, label, colour] of [[WOOD_BURNS_C, `Wood burns above ${WOOD_BURNS_C} °C`, '#f2a15a'], [WATER_BOILS_C, `Water boils at ${WATER_BOILS_C} °C`, '#8cc8f0']]) {
    const y = base - c * perC;
    ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 20, y); ctx.stroke();
    text(ctx, label, x + 26, y, {size: 14, align: 'left', colour});
  }
  text(ctx, 'Wood', x, top - 16, {size: 15});
}
function plates(ctx, view) {
  const p = view.pit, actions = Object.values(view.keys);
  for (const side of SIDES) {
    const [x, y, w, h] = plateBox(side), on = p[side], action = PLATE_ACTION[side].find(a => actions.includes(a));
    ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.strokeStyle = on ? SIDE_COLOUR[side] : 'rgba(120,128,132,.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
    const left = action ? x + 44 : x + 14;
    if (action) keyCap(ctx, x + 22, y + h / 2, PLATE_KEY[side]);
    text(ctx, SWITCH_NAME[side], left, y + 18, {size: 17, align: 'left'});
    if (view.known.includes(side)) text(ctx, SIDE_LOWER[side], left, y + 40, {size: 14, align: 'left', weight: 600, colour: on ? SIDE_COLOUR[side] : theme.faint});
    const state = side === 'fuel' ? (on ? 'IN' : 'OUT') : side === 'heat' ? (on ? 'ON' : 'OFF') : (on ? 'OPEN' : 'SHUT');
    text(ctx, state, x + w - 14, y + h / 2, {size: 20, align: 'right', colour: on ? theme.good : theme.bad});
    if (view.glow === action) halo(ctx, x + w / 2, y + h / 2, w / 2 + 6, view.time);
  }
}
function tools(ctx, view) {
  const inHand = view.tools?.inHand, pour = view.pit.pour;
  for (const tool of ['water', 'sand']) {
    const [x, y] = BUCKET_AT[tool];
    // A tipped bucket comes back to its place, empty.
    if (pour?.tool !== tool) bucket(ctx, x, y, tool, {glow: inHand === tool && view.glow === 'tip', time: view.time});
    else if (pour.age >= 2.2) bucket(ctx, x, y, tool, {empty: true});
    text(ctx, tool === 'water' ? 'Water' : 'Sand', x, y - BUCKET_H - 44, {size: 15, colour: inHand === tool ? theme.accent : theme.faint});
  }
  if (view.keys.Space === 'tip') { spaceKey(ctx, BUCKET_AT[inHand][0], BUCKET_AT[inHand][1] - BUCKET_H - 70); if (view.glow === 'tip') halo(ctx, BUCKET_AT[inHand][0], BUCKET_AT[inHand][1] - BUCKET_H / 2, 46, view.time); }
}
// Tipping: the bucket swings over the pit and pours.
function pouring(ctx, pour) {
  if (pour && pour.age < 2.2) {
    const k = Math.min(1, pour.age / .35), [x0, y0] = BUCKET_AT[pour.tool];
    const x = x0 + (POUR_AT[0] - x0) * k, y = y0 + (POUR_AT[1] - y0) * k, tilt = 1.9 * k;
    if (pour.age > .3 && pour.age < 1.4) {
      ctx.fillStyle = pour.tool === 'water' ? 'rgba(90,170,230,.8)' : 'rgba(212,181,124,.9)';
      for (let s = 0; s < 14; s++) { const t = (pour.age * 3 + s / 14) % 1; ctx.beginPath(); ctx.arc(x + 46 + t * 70 + Math.sin(s) * 6, y - 30 + t * 120, pour.tool === 'water' ? 6 : 4, 0, Math.PI * 2); ctx.fill(); }
    }
    bucket(ctx, x, y, pour.tool, {tilt, empty: pour.age > 1});
  }
}
function watchTable(ctx, rows, time) {
  const {x, y, w} = TABLE, h = 40 + 3 * 46;
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  text(ctx, 'Remove one side…', x + 12, y + 20, {size: 14, align: 'left', colour: theme.faint});
  text(ctx, 'and the fire', x + w - 12, y + 20, {size: 14, align: 'right', colour: theme.faint});
  const said = {heat: 'Gas off', fuel: 'Wood out', air: 'Lid shut'};
  ['heat', 'fuel', 'air'].forEach((side, k) => {
    const ry = y + 58 + k * 46, row = rows[k];
    if (!row) { text(ctx, '…', x + 12, ry, {size: 16, align: 'left', colour: theme.faint}); return; }
    text(ctx, said[side], x + 12, ry - 8, {size: 16, align: 'left'});
    text(ctx, `no ${SIDE_LOWER[side]}`, x + 12, ry + 12, {size: 14, align: 'left', weight: 600, colour: SIDE_COLOUR[side]});
    text(ctx, 'goes out', x + w - 12, ry, {size: 17, align: 'right', colour: theme.good});
  });
}
// The free test's results: one row for each setting tried, with what the flame did and why.
function freeTable(ctx, rows) {
  const {x, y, w} = TABLE, h = 34 + Math.max(1, rows.length) * 28;
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  const at = [x + 10, x + 52, x + 88], result = x + w - 10;
  ['Wood', 'Gas', 'Lid'].forEach((label, k) => text(ctx, label, at[k], y + 17, {size: 13, align: 'left', colour: theme.accent}));
  text(ctx, 'Result', result, y + 17, {size: 13, align: 'right', colour: theme.accent});
  if (!rows.length) text(ctx, 'No settings tested yet', x + w / 2, y + 48, {size: 14, colour: theme.faint});
  rows.forEach((row, k) => {
    const ry = y + 48 + k * 28;
    [[row.fuel ? 'In' : 'Out', row.fuel], [row.heat ? 'On' : 'Off', row.heat], [row.air ? 'Open' : 'Shut', row.air]].forEach(([label, on], n) =>
      text(ctx, label, at[n], ry, {size: 14, align: 'left', weight: 600, colour: on ? theme.text : theme.bad}));
    const why = row.burning ? 'burns' : `no ${row.missing.map(side => SIDE_LOWER[side]).join(', ')}`;
    text(ctx, why, result, ry, {size: row.missing.length > 1 ? 11 : 14, align: 'right', colour: row.burning ? theme.good : theme.bad});
  });
}
function drawPitScene(ctx, view) {
  background(ctx);
  const p = view.pit;
  if (view.tools) tools(ctx, view);
  drawPit(ctx, p, view.time);
  pouring(ctx, p.pour);
  mechanism(ctx, p, view.time);
  pitWords(ctx, p, view.known);
  if (view.thermometer) thermometer(ctx, p);
  if (view.plates) plates(ctx, view);
  if (view.triangle) {
    text(ctx, 'Fire triangle', TRI.x, 34, {size: 18, colour: theme.accent});
    triangle(ctx, TRI, p.missing, {burning: p.flame > .5, time: view.time});
    if (view.removed) text(ctx, `The ${view.tools?.inHand ?? ''} removed the ${SIDE_LOWER[view.removed]}.`, TRI.x, TRI.base + 70, {size: 16, colour: SIDE_COLOUR[view.removed]});
  }
  if (view.table) watchTable(ctx, view.table, view.time);
  if (view.freeRows) freeTable(ctx, view.freeRows);
}

// ---- the forest, from above ----
const TREE_SPOTS = [[-24, -20], [22, -12], [-6, 22]];
function forestCell(ctx, cell, time) {
  const x = FX + cell.i * CELL, y = FY + cell.j * CELL, cx = x + CELL / 2, cy = y + CELL / 2;
  const ground = {raked: '#6b5236', burnt: '#1d1b19', coated: '#4a3438'}[cell.state] ?? '#2d3a26';
  ctx.fillStyle = ground; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  if (cell.state === 'raked') {
    ctx.strokeStyle = 'rgba(40,28,16,.7)'; ctx.lineWidth = 2;
    for (let k = 12; k < CELL; k += 14) { ctx.beginPath(); ctx.moveTo(x + 8, y + k); ctx.lineTo(x + CELL - 8, y + k); ctx.stroke(); }
    return;
  }
  if (cell.state === 'burnt') {
    ctx.fillStyle = 'rgba(120,120,115,.35)'; for (const [dx, dy] of TREE_SPOTS) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#0d0c0b'; for (const [dx, dy] of TREE_SPOTS) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 5, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  const crown = {coated: '#d8768a', damp: '#3f7d78', burning: '#3c3320'}[cell.state] ?? '#3f7a45';
  for (const [dx, dy] of TREE_SPOTS) {
    ctx.fillStyle = crown; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(cx + dx - 5, cy + dy - 6, 8, 0, Math.PI * 2); ctx.fill();
  }
  if (cell.state === 'damp') { ctx.fillStyle = 'rgba(140,200,240,.8)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + 14 + (k * 29) % 76, y + 14 + (k * 41) % 72, 3, 0, Math.PI * 2); ctx.fill(); } }
  if (cell.state === 'burning') {
    const s = cell.percent / 100;
    TREE_SPOTS.forEach(([dx, dy], k) => flame(ctx, cx + dx, cy + dy + 14, 22 + 14 * s, 20 + 46 * s, time, cell.i * 3 + cell.j + k));
  }
}
// A burning cell's strength, on a dark plate so that it reads over the flames.
function strengthPlate(ctx, cell) {
  const x = FX + cell.i * CELL, y = FY + cell.j * CELL;
  ctx.fillStyle = 'rgba(10,14,15,.82)'; ctx.beginPath(); ctx.roundRect(x + 30, y + 36, 40, 26, 5); ctx.fill();
  text(ctx, String(strengthOf(cell.percent)), x + 50, y + 49, {size: 18, colour: '#ffd27a', weight: 800});
}
// Where the flames can go at the next spread: an arrow to each touching cell of trees, and a cross where nothing can catch fire.
export function spreadTargets(cells) {
  const at = new Map(cells.map(c => [`${c.i},${c.j}`, c])), found = [];
  for (const cell of cells) {
    // A cell lights its neighbours only if it reaches the game's limit after growing.
    if (cell.state !== 'burning' || cell.percent + GROW < SPREAD_FROM) continue;
    for (const di of [-1, 0, 1]) for (const dj of [-1, 0, 1]) {
      const to = at.get(`${cell.i + di},${cell.j + dj}`);
      if (!to || !['trees', 'damp', 'raked', 'coated'].includes(to.state)) continue;
      found.push({from: cell, di, dj, stopped: to.state === 'raked' || to.state === 'coated'});
    }
  }
  return found;
}
function spreadArrows(ctx, cells, time) {
  for (const {from, di, dj, stopped} of spreadTargets(cells)) {
    const [x, y] = cellCentre(from.i, from.j), gx = x + di * CELL / 2, gy = y + dj * CELL / 2;
    // A corner arrow stays in its own cell and ends at the corner, so two arrows meeting there do not cross.
    const corner = di !== 0 && dj !== 0, reach = stopped || corner ? (corner ? -2 : 2) : 16, back = corner ? 26 : 14;
    flowArrow(ctx, gx - di * back, gy - dj * back, gx + di * reach, gy + dj * reach, stopped ? 'rgba(255,190,110,.6)' : '#ffb35a', time, {width: 3, dot: false});
    if (stopped) blockedMark(ctx, gx + di * 14, gy + dj * 14, 7);
  }
}
function forest(ctx, view) {
  const f = view.forest;
  // The lake on the left and the road on the right.
  ctx.fillStyle = '#2f5a6e'; ctx.fillRect(0, FY - 10, FX - 6, ROWS * CELL + 20);
  ctx.strokeStyle = 'rgba(200,230,240,.3)'; ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) { const wy = FY + 20 + k * 48; ctx.beginPath(); ctx.moveTo(8, wy); ctx.quadraticCurveTo(26, wy - 6, 44, wy); ctx.stroke(); }
  ctx.fillStyle = '#3c3f40'; ctx.fillRect(ROAD_X, FY - 10, ROAD_W, ROWS * CELL + 20);
  ctx.strokeStyle = '#d9c46a'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(ROAD_X + ROAD_W / 2, FY - 6); ctx.lineTo(ROAD_X + ROAD_W / 2, FY + ROWS * CELL + 8); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, 'Lake', (FX - 6) / 2, FY - 26, {size: 15, colour: theme.faint});
  text(ctx, 'Road', ROAD_X + ROAD_W / 2, FY - 26, {size: 15, colour: theme.bad});
  for (const cell of f.cells) forestCell(ctx, cell, view.time);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(FX + i * CELL, FY); ctx.lineTo(FX + i * CELL, FY + ROWS * CELL); ctx.stroke(); }
  for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(FX, FY + j * CELL); ctx.lineTo(FX + COLS * CELL, FY + j * CELL); ctx.stroke(); }
  if (view.numbers) for (const cell of f.cells) if (cell.state === 'burning') strengthPlate(ctx, cell);
  if (view.arrows) spreadArrows(ctx, f.cells, view.time);
  // The trees by the road: once the fire is in them, it has reached the road.
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.strokeRect(FX + ROAD * CELL + 2, FY + 2, CELL - 4, ROWS * CELL - 4); ctx.setLineDash([]);
  text(ctx, 'by the road', FX + (ROAD + .5) * CELL, FY + ROWS * CELL + 18, {size: 13, colour: theme.bad, weight: 600});
  if (f.splash && f.splash.age < 1.2) {
    const [x, y] = cellCentre(f.splash.i, f.splash.j), a = f.splash.age;
    ctx.strokeStyle = `rgba(140,200,245,${1 - a / 1.2})`; ctx.lineWidth = 5;
    for (const r of [a * 60, a * 40]) { ctx.beginPath(); ctx.arc(x, y, 10 + r, 0, Math.PI * 2); ctx.stroke(); }
  }
}
function tool(ctx, view) {
  const [x, y] = TOOL_AT, kind = view.tool, set = view.keys.Space === kind;
  // Where it will go: the column of trees in front of the flames.
  if (set) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(FX + STRIP * CELL + 3, FY + 3, CELL - 6, ROWS * CELL - 6); ctx.setLineDash([]); }
  ctx.save(); ctx.translate(x, y);
  if (kind === 'rake') {
    ctx.strokeStyle = '#a0784a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-34, -24); ctx.lineTo(16, 14); ctx.stroke();
    ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(32, -2); ctx.stroke();
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 6, 22 - k * 6); ctx.lineTo(12 + k * 6, 28 - k * 6); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#c95b6f'; ctx.beginPath(); ctx.roundRect(-14, -26, 28, 40, 6); ctx.fill();
    ctx.fillStyle = theme.iron[1]; ctx.fillRect(-4, 14, 8, 14);
    if (!set && view.forest.coated) { ctx.fillStyle = 'rgba(216,118,138,.45)'; ctx.beginPath(); ctx.moveTo(-6, 28); ctx.lineTo(-40, 64); ctx.lineTo(40, 64); ctx.lineTo(6, 28); ctx.fill(); }
  }
  ctx.restore();
  text(ctx, kind === 'rake' ? 'Rake' : 'Retardant', x + 46, y - 14, {size: 15, align: 'left', colour: kind === 'rake' ? theme.text : '#e58ea0'});
  if (set) { spaceKey(ctx, x + 72, y + 12); if (view.glow === kind) halo(ctx, x, y, 44, view.time); }
}
function legend(ctx, view, x0, y0) {
  const states = new Set(view.forest.cells.map(c => c.state));
  const rows = [['trees', 'Trees', '#3f7a45'], ['burning', 'Burning', '#f2551f'], ['burnt', 'Out', '#1d1b19'], ['damp', 'Damp', '#3f7d78'],
    ['raked', 'Raked bare', '#6b5236'], ['coated', 'Retardant', '#d8768a']].filter(([s]) => states.has(s));
  rows.forEach(([, label, colour], k) => {
    const y = y0 + k * 28;
    ctx.fillStyle = colour; ctx.fillRect(x0, y - 9, 18, 18); ctx.strokeStyle = theme.faint; ctx.lineWidth = 1; ctx.strokeRect(x0, y - 9, 18, 18);
    text(ctx, label, x0 + 28, y, {size: 15, align: 'left', weight: 600});
  });
  return y0 + rows.length * 28;
}
function drawForestScene(ctx, view) {
  background(ctx);
  const f = view.forest, px = 770;
  forest(ctx, view);
  if (view.tool) tool(ctx, view);
  if (view.triangle) {
    const small = {x: 878, top: 52, base: 186, half: 72};
    triangle(ctx, small, view.removed ? [view.removed] : [], {burning: f.burning > 0, size: 15, width: 7, time: view.time});
    if (view.removed) { text(ctx, 'The strip has no fuel,', 878, 234, {size: 15, colour: SIDE_COLOUR.fuel}); text(ctx, 'so the flames cannot cross it.', 878, 254, {size: 15, colour: SIDE_COLOUR.fuel}); }
  }
  let y = view.triangle ? 300 : 60;
  if (view.spread) {
    ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(px, 40, 212, 116, 8); ctx.fill(); ctx.stroke();
    text(ctx, 'Spreads', px + 12, 66, {size: 15, align: 'left', weight: 600}); text(ctx, String(view.spread.steps), px + 200, 66, {size: 18, align: 'right', colour: theme.accent});
    text(ctx, 'Time', px + 12, 98, {size: 15, align: 'left', weight: 600}); text(ctx, `${view.spread.seconds} s`, px + 200, 98, {size: 18, align: 'right', colour: theme.accent});
    text(ctx, 'Burning cells', px + 12, 130, {size: 15, align: 'left', weight: 600}); text(ctx, String(f.burning), px + 200, 130, {size: 18, align: 'right', colour: theme.bad});
    y = 196;
  }
  if (view.marked) {
    const [mx, my] = [FX + view.marked[0] * CELL, FY + view.marked[1] * CELL];
    ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.strokeRect(mx + 5, my + 5, CELL - 10, CELL - 10); ctx.setLineDash([]);
    text(ctx, 'marked cell', mx + CELL / 2, my + CELL + 16, {size: 13});
  }
  if (view.job) {
    const j = view.job;
    ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(px, 40, 212, 150, 8); ctx.fill(); ctx.stroke();
    text(ctx, 'Bucket', px + 12, 66, {size: 15, align: 'left', weight: 600}); text(ctx, litres(j.bucket), px + 200, 66, {size: 16, align: 'right', colour: '#8cc8f0'});
    text(ctx, 'A cell at 100%', px + 12, 100, {size: 15, align: 'left', weight: 600}); text(ctx, litres(j.flatOut), px + 200, 100, {size: 16, align: 'right', colour: theme.bad});
    text(ctx, 'Trips', px + 12, 134, {size: 15, align: 'left', weight: 600}); text(ctx, String(j.trips), px + 200, 134, {size: 18, align: 'right', colour: theme.accent});
    text(ctx, 'Burning', px + 12, 166, {size: 15, align: 'left', weight: 600}); text(ctx, String(f.burning), px + 200, 166, {size: 18, align: 'right', colour: theme.bad});
    y = 230;
  }
  legend(ctx, view, px + 4, y);
  if (f.aim && view.keys.Space === 'drop') {
    const [x, y2] = [FX + f.aim[0] * CELL, FY + f.aim[1] * CELL];
    ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = 4;
    for (const [cx, cy, dx, dy] of [[x + 4, y2 + 4, 1, 1], [x + CELL - 4, y2 + 4, -1, 1], [x + 4, y2 + CELL - 4, 1, -1], [x + CELL - 4, y2 + CELL - 4, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy + dy * 22); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * 22, cy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,150,210,.9)'; ctx.beginPath(); ctx.arc(x + CELL / 2, y2 + 20, 13, 0, Math.PI * 2); ctx.fill();
    text(ctx, String(BUCKET_L), x + CELL / 2, y2 + 21, {size: 10, weight: 800});
  }
  if (view.glow?.startsWith('drop:')) { const [, i, j] = view.glow.split(':'); halo(ctx, ...cellCentre(Number(i), Number(j)), 56, view.time); }
  const under = FY + ROWS * CELL + 50;
  if (view.keys.Space === 'drop') {
    ['←', '→', '↑', '↓'].forEach((k, n) => keyCap(ctx, FX + 30 + n * 26, under, k));
    text(ctx, 'aim', FX + 140, under, {size: 15, align: 'left'});
    spaceKey(ctx, ...DROP_KEY); text(ctx, 'drop the bucket', FX + 254, under, {size: 15, align: 'left'});
  }
  if (view.keys.Space === 'burn' || view.keys.Space === 'spread') { const action = view.keys.Space; spaceKey(ctx, ...BURN_KEY); text(ctx, action === 'burn' ? 'let it burn' : 'run one spread', BURN_KEY[0] + 34, BURN_KEY[1], {size: 15, align: 'left'}); if (view.glow === action) halo(ctx, ...BURN_KEY, 40, view.time); }
  if (f.raked && view.removed) text(ctx, 'Nothing here can burn.', FX + (STRIP + .5) * CELL - 20, FY + ROWS * CELL + 22, {size: 15, colour: '#d9b58a'});
  if (f.coated) text(ctx, 'These trees cannot catch fire.', FX + (STRIP + .5) * CELL + 40, FY + ROWS * CELL + 22, {size: 15, colour: '#e58ea0'});
  if (f.road) text(ctx, 'The fire reached the road.', FX + COLS * CELL / 2, 70, {size: 26, colour: theme.bad});
  else if (view.job) text(ctx, f.burning ? `Trip ${view.job.trips + 1}` : 'The fire is out.', FX + COLS * CELL / 2, 70, {size: 24, colour: f.burning ? theme.accent : theme.good});
}

// ---- the wonder, the checks and the recap ----
function drawWonder(ctx, view) {
  outdoors(ctx);
  drawPit(ctx, view.pit, view.time);
  text(ctx, 'Brian’s fire pit', PIT_X, 70, {size: 24, colour: theme.accent});
  if (!view.pit.air) text(ctx, 'The lid is shut, and no water was used.', PIT_X, 110, {size: 20});
  if (!view.pit.air && view.pit.flame === 0) text(ctx, 'The fire is out. Why?', PIT_X, 146, {size: 22, colour: theme.bad});
}
function drawCheck(ctx, view) {
  background(ctx);
  text(ctx, 'Fire triangle', 250, 70, {size: 20, colour: theme.accent});
  triangle(ctx, {x: 250, top: 120, base: 400, half: 140}, [], {burning: true, size: 22, width: 11, time: view.time});
  if (view.check === 'check-lid') { panOnStove(ctx, 690, 350, view.answered, view.time); return; }
  miniForest(ctx, 560, 160, 64, view.check === 'check-coat' ? 'coat' : 'water', null, view.time);
  text(ctx, 'Lake', 530, 140, {size: 14, colour: theme.faint}); text(ctx, 'Road', 560 + 6 * 64 + 28, 140, {size: 14, colour: theme.bad});
  text(ctx, view.check === 'check-coat' ? `Retardant tank ${litres(TANK_L)} · one cell needs ${litres(COAT_L)}` : `Water bucket ${litres(BUCKET_L)} · a cell at full strength needs ${litres(FLAT_OUT_L)}`, 500, 520, {size: 17, colour: theme.faint});
}
// Question 1's kitchen: oil burning in a pan on a stove, with the lid above it, then over it once the question is answered.
function panOnStove(ctx, x, y, shut, time) {
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(x - 170, y + 44, 340, 22); ctx.fillStyle = theme.iron[2]; ctx.fillRect(x - 150, y + 66, 300, 96);
  for (const dx of [-60, -20, 20, 60]) { ctx.fillStyle = 'rgba(90,150,255,.85)'; ctx.beginPath(); ctx.ellipse(x + dx, y + 38, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3a4146'; ctx.fillRect(x - 96, y - 6, 192, 36); ctx.fillStyle = '#1d2224'; ctx.fillRect(x + 96, y + 2, 76, 10);
  ctx.fillStyle = '#c9a23a'; ctx.fillRect(x - 90, y - 6, 180, 8);
  if (!shut) for (let k = 0; k < 5; k++) flame(ctx, x - 72 + k * 36, y - 4, 38, 90 + 30 * Math.sin(k * 1.7) ** 2, time, k);
  const lidY = shut ? y - 16 : y - 170;
  ctx.fillStyle = theme.iron[0]; ctx.beginPath(); ctx.roundRect(x - 102, lidY, 204, 12, 5); ctx.fill(); ctx.fillStyle = theme.iron[2]; ctx.fillRect(x - 18, lidY - 12, 36, 12);
  text(ctx, shut ? 'The lid keeps fresh air out.' : 'A lid', x, shut ? y - 60 : lidY - 30, {size: 17});
}
// A small forest for the questions: burning at the lake end, the road at the far end, and a mark where something goes.
function miniForest(ctx, x0, y0, size, what, where, time) {
  const states = what === 'coat' ? ['burnt', 'burning', 'burning', 'trees', 'trees', 'trees'] : ['burning', 'burning', 'burning', 'trees', 'trees', 'trees'];
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const s = states[i], x = x0 + i * size, y = y0 + j * size;
    ctx.fillStyle = s === 'burnt' ? '#1d1b19' : s === 'burning' ? '#3c3320' : '#2d3a26'; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    if (s === 'trees' || s === 'burning') { ctx.fillStyle = s === 'trees' ? '#3f7a45' : '#3c3320'; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size * .3, 0, Math.PI * 2); ctx.fill(); }
    if (s === 'burning') flame(ctx, x + size / 2, y + size * .78, size * .4, size * .6, time, i + j);
  }
  ctx.fillStyle = '#2f5a6e'; ctx.fillRect(x0 - size * .35, y0, size * .3, ROWS * size);
  ctx.fillStyle = '#3c3f40'; ctx.fillRect(x0 + COLS * size + 4, y0, size * .45, ROWS * size);
  if (where) {
    const col = {front: 3, flames: 2, behind: 0, back: 0}[where], colour = what === 'coat' ? 'rgba(216,118,138,.75)' : 'rgba(110,180,235,.75)';
    ctx.fillStyle = colour; ctx.fillRect(x0 + col * size + 3, y0 + 3, size - 6, ROWS * size - 6);
    ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = 3; ctx.strokeRect(x0 + col * size + 3, y0 + 3, size - 6, ROWS * size - 6);
  }
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, 90, w - 4, 340); ctx.clip();
    if (idea.id === 'triangle') triangle(ctx, {x: x + w / 2, top: 130, base: 350, half: 84}, [], {burning: true, size: 18, time: view.time});
    if (idea.id === 'tools') [['water', 'heat', 'Water cools', 'and removes the heat'], ['sand', 'air', 'Sand smothers', 'and removes the oxygen'], ['rake', 'fuel', 'A raked strip', 'removes the fuel']].forEach(([t, side, label, what], k) => {
      const y = 150 + k * 96;
      if (t === 'rake') { ctx.fillStyle = '#6b5236'; ctx.fillRect(x + 30, y - 40, 60, 50); } else bucket(ctx, x + 60, y + 10, t);
      text(ctx, label, x + 104, y - 22, {size: 16, align: 'left'});
      text(ctx, what, x + 104, y, {size: 15, align: 'left', colour: SIDE_COLOUR[side]});
    });
    if (idea.id === 'front') { miniForest(ctx, x + 30, 190, 40, 'water', 'flames', view.time); ctx.fillStyle = 'rgba(216,118,138,.75)'; ctx.fillRect(x + 30 + 3 * 40 + 3, 193, 34, 114); }
    ctx.restore();
    wrap(ctx, idea.text, x + w / 2, 450, w - 30, {size: 19, weight: 600});
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'wonder') drawWonder(ctx, view);
    else if (view.scene === 'check') drawCheck(ctx, view);
    else if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else if (view.scene === 'forest') drawForestScene(ctx, view);
    else drawPitScene(ctx, view);
  });
}

// ---- the card pictures ----
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  const back = ctx.createLinearGradient(0, 0, 0, h);
  back.addColorStop(0, theme.back[0]); back.addColorStop(1, theme.back[1]);
  ctx.fillStyle = back; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'side') triangle(ctx, {x: w / 2, top: 14, base: h - 30, half: Math.min(w * .3, (h - 44) * .62)}, [picture.side], {size: 14, width: 7, labels: true});
  if (picture.kind === 'spot') { const size = Math.min((w - 40) / COLS, (h - 16) / ROWS); miniForest(ctx, (w - COLS * size) / 2, (h - ROWS * size) / 2, size, picture.what, picture.where, .4); }
}
