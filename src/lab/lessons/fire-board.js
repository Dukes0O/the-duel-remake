// The Fire triangle lesson's board (docs/board/cards/LAB-CLASSROOM-FIRE.md): Brian's fire pit with one switch plate
// per side of the triangle, the triangle itself, the water and sand buckets, and the practice fire's forest seen from
// above. Draws and hit-tests only.
import {BOARD, GROUND_Y, theme, background, floor, shadow, steel, bolt, bezel, shade, blend, grain, tarmac, flameTongue, glassTube, text, keyCap, outdoors, wrap, fitBoard} from '../classroom/board-art.js';
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
// A colour as rgba(), for lit edges and glows in a lesson's own colours.
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
// A steel-framed readout plate: a dark glass face under a bezel.
function panel(ctx, x, y, w, h, alpha = .78) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(26,32,35,${alpha})`); g.addColorStop(1, `rgba(10,14,15,${alpha})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  bezel(ctx, x, y, w, h, 8);
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function spaceKey(ctx, x, y) {
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 26, y - 10, 52, 20, 3); ctx.fill();
  text(ctx, 'Space', x, y + 1, {size: 12, colour: '#1d2224', weight: 800});
}
// One flame: the shared layered tongue, its foot at (x, y).
function flame(ctx, x, y, w, h, time, seed) { flameTongue(ctx, x, y, w, h, time, seed); }
function puffs(ctx, x, y, age, colour, n = 6, spread = 80, strength = 1) {
  for (let k = 0; k < n; k++) {
    const t = (age * .7 + k / n) % 1, px = x + Math.sin(k * 2.7) * spread * .5 * (1 + t), py = y - t * 170, r = 14 + t * 30, a = Math.max(0, .5 * (1 - t)) * strength;
    const g = ctx.createRadialGradient(px - r * .2, py - r * .2, 1, px, py, r);
    g.addColorStop(0, colour.replace('A', a.toFixed(3))); g.addColorStop(1, colour.replace('A', '0'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}
// One side of the triangle as a lit steel bar in its own colour. Once the fire has lost that side, the bar is dull,
// broken in the middle and cracked.
function triBar(ctx, a, b, colour, width, off) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), w = width, gap = w * .9;
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
  const pieces = off ? [[0, len * .5 - gap], [len * .5 + gap, len]] : [[0, len]];
  if (!off) { ctx.lineCap = 'round'; ctx.strokeStyle = rgba(colour, .22); ctx.lineWidth = w * 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.lineCap = 'butt'; }
  for (const [s0, s1] of pieces) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(s0 + 1.5, -w / 2 + 3, s1 - s0, w, w * .3); ctx.fill();
    ctx.fillStyle = '#1d2326'; ctx.beginPath(); ctx.roundRect(s0 - 1.5, -w / 2 - 1.5, s1 - s0 + 3, w + 3, w * .35); ctx.fill();
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    if (off) { g.addColorStop(0, '#59636a'); g.addColorStop(.5, '#3a4247'); g.addColorStop(1, '#22282b'); }
    else { g.addColorStop(0, shade(colour, .55)); g.addColorStop(.35, colour); g.addColorStop(1, shade(colour, -.5)); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(s0, -w / 2, s1 - s0, w, w * .3); ctx.fill();
    ctx.fillStyle = off ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.55)'; ctx.fillRect(s0 + w * .3, -w / 2 + 1, Math.max(0, s1 - s0 - w * .6), 1.4);
  }
  if (off) {
    // Jagged ends where the bar snapped, and hairline cracks running back along each piece.
    ctx.strokeStyle = 'rgba(6,8,9,.95)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const [x, dir] of [[len * .5 - gap, 1], [len * .5 + gap, -1]]) { ctx.moveTo(x, -w / 2); ctx.lineTo(x + dir * w * .3, -w * .15); ctx.lineTo(x - dir * w * .1, w * .12); ctx.lineTo(x + dir * w * .25, w / 2); }
    ctx.moveTo(len * .5 - gap, -w * .1); ctx.lineTo(len * .36, w * .2); ctx.lineTo(len * .3, -w * .12); ctx.moveTo(len * .5 + gap, w * .12); ctx.lineTo(len * .66, -w * .22); ctx.lineTo(len * .74, w * .1);
    ctx.stroke();
  }
  ctx.restore();
}
// The fire triangle: each side a lit bar in its colour while the fire has it, dull and broken with a cross once it is gone.
function triangle(ctx, {x, top, base, half}, gone, {burning = false, labels = true, size = 18, width = 9, time = 0} = {}) {
  const pts = {top: [x, top], left: [x - half, base], right: [x + half, base]};
  const sides = {fuel: [pts.top, pts.left], heat: [pts.left, pts.right], air: [pts.right, pts.top]};
  for (const side of SIDES) {
    const [a, b] = sides[side], off = gone.includes(side);
    triBar(ctx, a, b, SIDE_COLOUR[side], width, off);
    if (off) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, r = width * 1.4;
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = width * .45 + 2.5; ctx.beginPath(); ctx.moveTo(mx - r, my - r); ctx.lineTo(mx + r, my + r); ctx.moveTo(mx + r, my - r); ctx.lineTo(mx - r, my + r); ctx.stroke();
      ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = width * .45; ctx.beginPath(); ctx.moveTo(mx - r, my - r); ctx.lineTo(mx + r, my + r); ctx.moveTo(mx + r, my - r); ctx.lineTo(mx - r, my + r); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }
  // Steel gusset plates at the three corners.
  for (const [px, py] of Object.values(pts)) { const plate = ctx.createRadialGradient(px - width * .25, py - width * .25, 1, px, py, width * .95); plate.addColorStop(0, '#d5dce0'); plate.addColorStop(1, '#4a5257'); ctx.fillStyle = plate; ctx.beginPath(); ctx.arc(px, py, width * .8, 0, Math.PI * 2); ctx.fill(); bolt(ctx, px, py, Math.max(1.4, width * .22)); }
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
  if (!tilt) shadow(ctx, x, y + 3, BUCKET_W * .75, .55);
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  const top = -BUCKET_H, hw = BUCKET_W / 2;
  // The bail behind the rim, then the galvanised body lit from the left, with its rolled rings and a painted band.
  ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, top, hw + 1, Math.PI, 0); ctx.stroke();
  const g = ctx.createLinearGradient(-hw, 0, hw, 0);
  g.addColorStop(0, '#454f55'); g.addColorStop(.3, '#cdd5d9'); g.addColorStop(.55, '#8a949a'); g.addColorStop(1, '#262d31');
  const outline = () => { ctx.beginPath(); ctx.moveTo(-hw, top); ctx.lineTo(hw, top); ctx.lineTo(hw - 7, 0); ctx.quadraticCurveTo(0, 7, -hw + 7, 0); ctx.closePath(); };
  ctx.fillStyle = g; outline(); ctx.fill();
  ctx.strokeStyle = glow ? theme.accent : 'rgba(0,0,0,.5)'; ctx.lineWidth = glow ? 3 + Math.sin(time * 6) * 1.5 : 1.5; ctx.stroke();
  ctx.save(); outline(); ctx.clip();
  ctx.fillStyle = tool === 'water' ? 'rgba(61,134,184,.75)' : 'rgba(176,138,58,.75)'; ctx.fillRect(-hw, top + 24, BUCKET_W, 14);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-hw, top + 24, BUCKET_W, 1);
  ctx.restore();
  for (const ry of [top + 16, top + 44]) { ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-hw + 3, ry); ctx.quadraticCurveTo(0, ry + 4, hw - 3, ry); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-hw + 3, ry + 2); ctx.quadraticCurveTo(0, ry + 6, hw - 3, ry + 2); ctx.stroke(); }
  // The mouth, and what is in it: water with a lit surface, or a heap of dry sand.
  ctx.fillStyle = '#15191b'; ctx.beginPath(); ctx.ellipse(0, top, hw, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (!empty) {
    if (tool === 'water') { ctx.fillStyle = '#4f9fd1'; ctx.beginPath(); ctx.ellipse(0, top + 1.5, hw - 3, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-6, top + .5, 9, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = '#d4b57c'; ctx.beginPath(); ctx.ellipse(0, top - 1, hw - 3, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(120,90,40,.5)'; for (let k = 0; k < 7; k++) ctx.fillRect(-hw + 8 + grain(k + 900) * (BUCKET_W - 16), top - 3 + grain(k + 910) * 5, 1.6, 1.4); }
  }
  ctx.strokeStyle = '#dfe5e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, top, hw, 6, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
  bolt(ctx, -hw + 1, top + 4, 1.8); bolt(ctx, hw - 1, top + 4, 1.8);
  ctx.restore();
}
// The log positions in the pit: two lying at an angle and one across the top.
const LOGS = Object.freeze([[-38, -2, .25], [34, -2, -.25], [0, -10, 0]]);
function drawPit(ctx, p, time, {scale = 1} = {}) {
  ctx.save(); ctx.translate(PIT_X, RIM_Y); ctx.scale(scale, scale);
  const ground = GROUND_Y - RIM_Y, burning = p.flame > .05, hot = p.flame > .2 || p.smoke != null;
  // How brightly the wood glows: full while it burns, then fading with the smoke after the fire is put out.
  const glowK = burning ? Math.min(1, p.flame) : p.smoke != null ? Math.max(0, 1 - p.smoke / 2.6) * .55 : 0;
  shadow(ctx, 0, ground + 4, 190, .6);
  // Legs: angle iron on steel pads.
  for (const lx of [-96, 96]) {
    ctx.lineCap = 'butt'; ctx.strokeStyle = '#13171a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(lx, 60); ctx.lineTo(lx * 1.12, ground - 3); ctx.stroke();
    ctx.strokeStyle = '#59636a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(lx - 1.5, 60); ctx.lineTo(lx * 1.12 - 1.5, ground - 3); ctx.stroke();
    steel(ctx, lx * 1.12 - 12, ground - 4, 24, 6, 2);
  }
  // The gas pipe, painted red while the gas is on, with its collars and a brass valve on a lever.
  const paint = p.heat ? '#c94c3c' : '#7d868c', pipe = ctx.createLinearGradient(0, 66, 0, 74);
  pipe.addColorStop(0, shade(paint, .5)); pipe.addColorStop(.4, paint); pipe.addColorStop(1, shade(paint, -.55));
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-250, 75, 134, 2.5);
  ctx.fillStyle = pipe; ctx.fillRect(-250, 66, 134, 8);
  for (const cx of [-247, -150, -130]) steel(ctx, cx - 3, 63, 6, 14, 1.5);
  const brass = ctx.createRadialGradient(-203, 66, 1, -200, 70, 14); brass.addColorStop(0, theme.brass[0]); brass.addColorStop(.55, theme.brass[1]); brass.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = brass; ctx.beginPath(); ctx.arc(-200, 70, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.translate(-200, 70); ctx.rotate(p.heat ? 0 : -Math.PI / 2);
  ctx.fillStyle = '#1d2224'; ctx.beginPath(); ctx.roundRect(-17, -3, 34, 6, 3); ctx.fill();
  ctx.fillStyle = p.heat ? '#e0604c' : '#aab4ba'; ctx.beginPath(); ctx.roundRect(-16, -2.2, 32, 3.2, 1.6); ctx.fill();
  ctx.fillStyle = '#d8dee1'; ctx.beginPath(); ctx.arc(16, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  bolt(ctx, -200, 70, 2.6);
  // The drum: rolled steel lit from the lamp, with two rolling rings, soot down from the rim and rust at the foot.
  const bodyPath = () => { ctx.beginPath(); ctx.moveTo(-RIM_RX, 0); ctx.lineTo(-RIM_RX + 22, 92); ctx.ellipse(0, 92, RIM_RX - 22, 14, 0, Math.PI, 0, true); ctx.lineTo(RIM_RX, 0); ctx.closePath(); };
  const drum = ctx.createLinearGradient(-RIM_RX, 0, RIM_RX, 0);
  [[0, '#1f2528'], [.1, '#4a545a'], [.3, '#9aa5ab'], [.45, '#8a959b'], [.7, '#4d575d'], [1, '#171b1d']].forEach(([at, c]) => drum.addColorStop(at, c));
  bodyPath(); ctx.fillStyle = drum; ctx.fill();
  ctx.save(); bodyPath(); ctx.clip();
  const soot = ctx.createLinearGradient(0, 0, 0, 62); soot.addColorStop(0, 'rgba(10,8,6,.62)'); soot.addColorStop(1, 'rgba(10,8,6,0)');
  ctx.fillStyle = soot; ctx.fillRect(-RIM_RX, 0, 2 * RIM_RX, 62);
  for (let i = 0; i < 14; i++) {
    const sx = -RIM_RX + 14 + grain(i + 5000) * (2 * RIM_RX - 28), sh = 16 + grain(i + 5100) * 38, sg = ctx.createLinearGradient(0, 0, 0, sh);
    sg.addColorStop(0, 'rgba(8,6,4,.5)'); sg.addColorStop(1, 'rgba(8,6,4,0)'); ctx.fillStyle = sg; ctx.fillRect(sx, 0, 2 + grain(i + 5200) * 5, sh);
  }
  if (glowK > 0) { const heat = ctx.createLinearGradient(0, 0, 0, 34); heat.addColorStop(0, rgba('#ff7828', .3 * glowK)); heat.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = heat; ctx.fillRect(-RIM_RX, 0, 2 * RIM_RX, 34); }
  const rust = ctx.createLinearGradient(0, 58, 0, 108); rust.addColorStop(0, 'rgba(140,76,36,0)'); rust.addColorStop(1, 'rgba(140,76,36,.45)'); ctx.fillStyle = rust; ctx.fillRect(-RIM_RX, 58, 2 * RIM_RX, 52);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(150,80,36,.3)'; ctx.beginPath(); ctx.ellipse(-100 + grain(i + 5300) * 200, 70 + grain(i + 5310) * 24, 5 + grain(i + 5320) * 9, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const ry of [30, 62]) {
    const half = RIM_RX - 22 * ry / 92, deep = 26 - 12 * ry / 92;
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, ry, half, deep, 0, .08, Math.PI - .08); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, ry + 2.5, half, deep, 0, .08, Math.PI - .08); ctx.stroke();
  }
  ctx.restore();
  bodyPath(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  steel(ctx, -RIM_RX + 14, 64, 8, 12, 2);
  // Inside the rim: the dark of the drum, the glow of the wood, the burner ring and the grate.
  const inner = () => { ctx.beginPath(); ctx.ellipse(0, 0, RIM_RX - 6, RIM_RY - 4, 0, 0, Math.PI * 2); };
  inner(); ctx.fillStyle = '#0e1113'; ctx.fill();
  ctx.save(); inner(); ctx.clip();
  const wall = ctx.createLinearGradient(0, -RIM_RY, 0, RIM_RY); wall.addColorStop(0, 'rgba(120,112,100,.5)'); wall.addColorStop(.45, 'rgba(60,54,48,.25)'); wall.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wall; ctx.fillRect(-RIM_RX, -RIM_RY, 2 * RIM_RX, RIM_RY * 2);
  if (p.fuel && glowK > 0) { const bed = ctx.createRadialGradient(0, 4, 4, 0, 4, 125); bed.addColorStop(0, rgba('#ff9632', .75 * glowK)); bed.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = bed; ctx.fillRect(-RIM_RX, -RIM_RY, 2 * RIM_RX, RIM_RY * 2); }
  ctx.strokeStyle = '#2f363a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 8, 74, 12, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#7b868c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 6.5, 74, 12, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.fillStyle = '#0a0c0d'; for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 74, 8 + Math.sin(a) * 12, 1.1, 0, Math.PI * 2); ctx.fill(); }
  for (let k = -5; k <= 5; k++) { ctx.fillStyle = '#1a1e20'; ctx.fillRect(k * 22 - 1.5, -RIM_RY, 3, RIM_RY * 2); ctx.fillStyle = 'rgba(120,135,145,.55)'; ctx.fillRect(k * 22 - 1.5, -RIM_RY, 1, RIM_RY * 2); }
  for (const ry of [-8, 12]) { ctx.fillStyle = '#23292c'; ctx.fillRect(-RIM_RX, ry, 2 * RIM_RX, 3.2); ctx.fillStyle = 'rgba(140,155,165,.5)'; ctx.fillRect(-RIM_RX, ry, 2 * RIM_RX, .9); }
  ctx.restore();
  // The back half of the rim goes behind the wood and the flames, the front half in front of them.
  const rimGrad = ctx.createLinearGradient(-RIM_RX, 0, RIM_RX, 0); [[0, '#6b757b'], [.3, '#e4eaed'], [.55, '#9aa5ab'], [1, '#454e54']].forEach(([at, c]) => rimGrad.addColorStop(at, c));
  const rim = (from, to) => {
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 1.5, RIM_RX, RIM_RY, 0, from, to); ctx.stroke();
    ctx.strokeStyle = rimGrad; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, RIM_RX, RIM_RY, 0, from, to); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,14,8,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, RIM_RX - 3, RIM_RY - 3, 0, from, to); ctx.stroke();
  };
  rim(Math.PI, Math.PI * 2);
  // The burner: a ring of small blue flames with a pale core.
  if (p.heat && p.putOut !== 'sand') for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, fx = Math.cos(a) * 74, fy = 8 + Math.sin(a) * 12, fh = 9 + 3 * Math.sin(time * 14 + k);
    const blue = ctx.createRadialGradient(fx, fy - fh * .5, 1, fx, fy - fh * .5, 12); blue.addColorStop(0, 'rgba(110,170,255,.35)'); blue.addColorStop(1, 'rgba(90,150,255,0)');
    ctx.fillStyle = blue; ctx.beginPath(); ctx.arc(fx, fy - fh * .5, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(90,150,255,.9)'; ctx.beginPath(); ctx.ellipse(fx, fy - fh * .4, 3.4, fh * .62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8ecff'; ctx.beginPath(); ctx.ellipse(fx, fy - fh * .25, 1.5, fh * .32, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (p.fuel) {
    const wet = p.putOut === 'water', colours = wet ? ['#4a3a2c', '#2c2119', '#14100c'] : hot ? ['#6a4a2e', '#3a2616', '#140c06'] : ['#c79a64', '#8a5a32', '#4a2c15'];
    for (const [lx, ly, a] of LOGS) {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(-58, 3, 116, 14, 7); ctx.fill();
      const lg = ctx.createLinearGradient(0, -9, 0, 9); lg.addColorStop(0, colours[0]); lg.addColorStop(.5, colours[1]); lg.addColorStop(1, colours[2]);
      ctx.fillStyle = lg; ctx.beginPath(); ctx.roundRect(-58, -9, 116, 18, 9); ctx.fill();
      ctx.strokeStyle = hot || wet ? 'rgba(0,0,0,.5)' : 'rgba(30,16,6,.45)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const bx = -50 + grain(i + lx * 3 + 300) * 100, by = -6 + grain(i + lx * 3 + 330) * 12; ctx.moveTo(bx, by); ctx.lineTo(bx + 6 + grain(i + 360) * 8, by + (grain(i + 390) - .5) * 2); }
      ctx.stroke();
      if (hot && !wet) for (let i = 0; i < 6; i++) { const cx = -44 + i * 18 + grain(i + lx) * 6; ctx.strokeStyle = rgba('#ff7828', .12 + .6 * glowK * (.8 + .2 * Math.sin(time * 5 + i + lx))); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, -6); ctx.lineTo(cx + 3, 0); ctx.lineTo(cx - 1, 6); ctx.stroke(); }
      if (wet) { ctx.fillStyle = 'rgba(180,215,235,.25)'; ctx.fillRect(-50, -8, 100, 1.6); }
      ctx.fillStyle = 'rgba(255,236,200,.22)'; ctx.fillRect(-46, -8, 92, 1.2);
      ctx.fillStyle = wet ? '#3a3029' : hot ? blend('#3a2616', '#ff9a3a', glowK * .85) : '#d7ae78'; ctx.beginPath(); ctx.ellipse(58, 0, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,10,.5)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(58, 0, 2.4, 4.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (wet) { const pool = ctx.createLinearGradient(0, -4, 0, 16); pool.addColorStop(0, 'rgba(150,200,230,.45)'); pool.addColorStop(1, 'rgba(60,110,150,.3)'); ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(0, 6, RIM_RX - 20, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(235,246,250,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 5, RIM_RX - 24, 8, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  }
  if (p.putOut === 'sand') {
    const heap = ctx.createLinearGradient(0, -28, 0, 6); heap.addColorStop(0, '#e6cd96'); heap.addColorStop(1, '#a98a52');
    ctx.fillStyle = heap; ctx.beginPath(); ctx.ellipse(0, -6, RIM_RX - 14, 22, 0, Math.PI, 0); ctx.ellipse(0, 0, RIM_RX - 10, RIM_RY - 6, 0, 0, Math.PI); ctx.fill();
    for (let k = 0; k < 40; k++) { ctx.fillStyle = k % 2 ? 'rgba(110,80,36,.45)' : 'rgba(255,240,200,.35)'; ctx.fillRect(-110 + grain(k + 950) * 220, -22 + grain(k + 990) * 26, 1.6, 1.4); }
  }
  // The flames, as tall as the fire is strong, with embers lifting off them.
  if (p.flame > 0) for (let k = 0; k < 7; k++) {
    const fx = (k - 3) * 30, h = (90 + 90 * Math.sin(k * 1.7) ** 2) * p.flame, w = 46 * Math.max(.35, p.flame);
    flame(ctx, fx, 4, w, h, time, k);
  }
  if (p.flame > .15 && p.fuel && p.air) for (let i = 0; i < 14; i++) {
    const t = (time * .35 + i * .137) % 1, ex = Math.sin(i * 12.9) * 100 + Math.sin(time * 2 + i) * 8, ey = -t * (120 + 120 * p.flame);
    ctx.fillStyle = rgba('#ffaa46', (1 - t) * Math.min(1, p.flame)); ctx.beginPath(); ctx.arc(ex, ey, 1.5 - t * .5, 0, Math.PI * 2); ctx.fill();
  }
  rim(0, Math.PI);
  // The lid: a heavy domed lid with a thick lip, rivets and a bar handle, shut over the rim, or standing open on its hinge at the back right.
  if (p.air) {
    const ox = RIM_RX + 18, oy = -RIM_RX + 6;
    steel(ctx, RIM_RX - 4, -7, 16, 11, 2); bolt(ctx, RIM_RX + 4, -1.5, 1.8);
    ctx.fillStyle = '#242b2f'; ctx.beginPath(); ctx.ellipse(ox + 5, oy, 20, RIM_RX, 0, 0, Math.PI * 2); ctx.fill();
    const face = ctx.createLinearGradient(ox - 20, 0, ox + 20, 0); face.addColorStop(0, '#c7d0d5'); face.addColorStop(.5, '#8a959b'); face.addColorStop(1, '#3d464b');
    ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(ox, oy, 20, RIM_RX, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(ox, oy, 14, RIM_RX - 14, 0, 0, Math.PI * 2); ctx.stroke();
    for (let k = -3; k <= 3; k++) bolt(ctx, ox - 8, oy + k * 34, 1.8);
    steel(ctx, ox + 12, -RIM_RX, 14, 30, 3);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 3, RIM_RX + 8, RIM_RY + 8, 0, 0, Math.PI * 2); ctx.fill();
    const lip = ctx.createLinearGradient(-RIM_RX, 0, RIM_RX, 0); lip.addColorStop(0, '#454e54'); lip.addColorStop(.35, '#8a959b'); lip.addColorStop(1, '#2a3136');
    ctx.fillStyle = lip; ctx.beginPath(); ctx.ellipse(0, -1, RIM_RX + 6, RIM_RY + 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.stroke();
    const dome = ctx.createRadialGradient(-50, -22, 6, -10, -6, RIM_RX + 10); dome.addColorStop(0, '#e1e8ec'); dome.addColorStop(.5, '#9aa5ab'); dome.addColorStop(1, '#46505a');
    ctx.fillStyle = dome; ctx.beginPath(); ctx.ellipse(0, -6, RIM_RX + 3, RIM_RY + 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -6, RIM_RX - 18, RIM_RY - 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -7.2, RIM_RX - 18, RIM_RY - 6, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; bolt(ctx, Math.cos(a) * (RIM_RX - 8), -6 + Math.sin(a) * (RIM_RY - 3), 2); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-62, -20, 34, 5, -.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, -10, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
    steel(ctx, -25, -25, 8, 11, 1.5); steel(ctx, 17, -25, 8, 11, 1.5); steel(ctx, -30, -32, 60, 9, 4);
  }
  if (p.smoke != null) puffs(ctx, 0, -20, p.smoke, 'rgba(150,150,150,A)', 7, 90, Math.max(.15, 1 - p.smoke / 3.5));
  else if (burning && p.air) puffs(ctx, 0, -40, time * .5, 'rgba(70,70,70,A)', 4, 70, .3 * p.flame);
  if (p.putOut === 'water' && p.pour) puffs(ctx, 0, -10, p.pour.age, 'rgba(235,240,245,A)', 8, 120);
  ctx.restore();
}
// An arrow from (x0, y0) to (x1, y1), with a dot running along it so the picture shows which way things move.
// Air is drawn as three pale streaks, and the others as one glowing line.
function flowArrow(ctx, x0, y0, x1, y1, colour, time, {width = 4, dot = true, streaks = false} = {}) {
  const a = Math.atan2(y1 - y0, x1 - x0), head = width * 3, length = Math.hypot(x1 - x0, y1 - y0), tx = x1 - Math.cos(a) * head * .7, ty = y1 - Math.sin(a) * head * .7;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = colour; ctx.fillStyle = colour;
  if (streaks) {
    for (const off of [-6, 0, 6]) {
      const nx = -Math.sin(a) * off, ny = Math.cos(a) * off;
      ctx.globalAlpha = off ? .4 : .75; ctx.lineWidth = off ? 1.6 : 2.6; ctx.setLineDash([length * .24, length * .1]); ctx.lineDashOffset = dot ? -time * length * .35 - off * 3 : 0;
      ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(tx + nx, ty + ny); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  } else {
    ctx.shadowColor = colour; ctx.shadowBlur = 8; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(tx, ty); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, width * .3); ctx.beginPath(); ctx.moveTo(x0 + Math.sin(a) * width * .2, y0 - Math.cos(a) * width * .2); ctx.lineTo(tx + Math.sin(a) * width * .2, ty - Math.cos(a) * width * .2); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - .5) * head, y1 - Math.sin(a - .5) * head); ctx.lineTo(x1 - Math.cos(a + .5) * head, y1 - Math.sin(a + .5) * head); ctx.closePath(); ctx.fill();
  if (dot) { const t = (time * .8) % 1; ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width * .7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function blockedMark(ctx, x, y, size = 9) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size); ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size); ctx.stroke();
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size); ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size); ctx.stroke(); ctx.lineCap = 'butt';
}
// The pit's three sides as things the player can see: fresh air moving in or stopped, heat rising from the burner, steam carrying heat away.
function mechanism(ctx, p, time) {
  const blocked = !p.air || p.putOut === 'sand', air = SIDE_COLOUR.air;
  [[300, 300], [340, 262]].forEach(([x, y], k) => {
    const endX = PIT_X - 110 + k * 50, endY = blocked ? RIM_Y - 74 : RIM_Y - 22;
    flowArrow(ctx, x, y, endX, endY, blocked ? 'rgba(113,201,255,.55)' : air, time + k * .4, {dot: !blocked, streaks: true});
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
  ctx.fillStyle = 'rgba(10,14,15,.8)'; ctx.beginPath(); ctx.roundRect(x - 17, top - 8, 34, base - top + 44, 15); ctx.fill();
  steel(ctx, x - 15, top - 4, 30, 6, 2);
  glassTube(ctx, x, top, base + 14, {width: 22, bulbR: 16, bulbY: base + 14, levelY: level, spirit: degrees >= WOOD_BURNS_C ? '#f2551f' : '#d9a640'});
  for (const [c, label, colour] of [[WOOD_BURNS_C, `Wood burns above ${WOOD_BURNS_C} °C`, '#f2a15a'], [WATER_BOILS_C, `Water boils at ${WATER_BOILS_C} °C`, '#8cc8f0']]) {
    const y = base - c * perC;
    ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 20, y); ctx.stroke();
    text(ctx, label, x + 26, y, {size: 14, align: 'left', colour});
  }
  text(ctx, 'Wood', x, top - 16, {size: 15});
}
// One panel switch for each side of the triangle: a steel bezel round a dark face that lights in the side's colour while the fire has it.
function plates(ctx, view) {
  const p = view.pit, actions = Object.values(view.keys);
  for (const side of SIDES) {
    const [x, y, w, h] = plateBox(side), on = p[side], action = PLATE_ACTION[side].find(a => actions.includes(a)), colour = SIDE_COLOUR[side];
    const face = ctx.createLinearGradient(0, y, 0, y + h); face.addColorStop(0, '#2c3438'); face.addColorStop(1, '#13181a');
    ctx.fillStyle = face; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    if (on) { const lit = ctx.createLinearGradient(0, y + h, 0, y); lit.addColorStop(0, rgba(colour, .34)); lit.addColorStop(1, rgba(colour, 0)); ctx.fillStyle = lit; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); }
    bezel(ctx, x, y, w, h, 8);
    ctx.save(); ctx.strokeStyle = on ? colour : 'rgba(120,128,132,.6)'; ctx.lineWidth = on ? 2.5 : 1.5;
    if (on) { ctx.shadowColor = colour; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 5); ctx.stroke(); ctx.restore();
    const lamp = ctx.createRadialGradient(x + w - 22, y + 9, .5, x + w - 22, y + 9, 7); lamp.addColorStop(0, on ? '#ffffff' : '#555e63'); lamp.addColorStop(.35, on ? colour : '#2c3438'); lamp.addColorStop(1, on ? rgba(colour, 0) : 'rgba(0,0,0,0)');
    ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(x + w - 22, y + 9, 7, 0, Math.PI * 2); ctx.fill();
    const left = action ? x + 44 : x + 14;
    if (action) keyCap(ctx, x + 22, y + h / 2, PLATE_KEY[side]);
    text(ctx, SWITCH_NAME[side], left, y + 18, {size: 17, align: 'left'});
    if (view.known.includes(side)) text(ctx, SIDE_LOWER[side], left, y + 40, {size: 14, align: 'left', weight: 600, colour: on ? colour : theme.faint});
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
  panel(ctx, x, y, w, h, .82);
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
  panel(ctx, x, y, w, h, .85);
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
  background(ctx); floor(ctx);
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
// A tree seen from above: a soft shadow, a crown lit from the top left, and leaf clumps round its edge.
function crown(ctx, cx, cy, r, colour) {
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(cx + 4, cy + 6, r, r * .85, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, 1, cx, cy, r * 1.05); g.addColorStop(0, shade(colour, .35)); g.addColorStop(.55, colour); g.addColorStop(1, shade(colour, -.5));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + cx * .1; ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx - r * .3, cy - r * .35, r * .3, 0, Math.PI * 2); ctx.fill();
}
function forestCell(ctx, cell, time) {
  const x = FX + cell.i * CELL, y = FY + cell.j * CELL, cx = x + CELL / 2, cy = y + CELL / 2, seed = cell.i * 50 + cell.j * 7;
  const ground = {raked: '#6b5236', burnt: '#1d1b19', coated: '#4a3438'}[cell.state] ?? '#2d3a26';
  const base = ctx.createLinearGradient(x, y, x + CELL, y + CELL); base.addColorStop(0, shade(ground, .08)); base.addColorStop(1, shade(ground, -.18));
  ctx.fillStyle = base; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  for (let k = 0; k < 22; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)'; ctx.fillRect(x + 4 + grain(seed + k) * (CELL - 8), y + 4 + grain(seed + k + 99) * (CELL - 8), 2, 2); }
  if (cell.state === 'raked') {
    for (let k = 12; k < CELL; k += 14) { ctx.strokeStyle = 'rgba(40,28,16,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + k); ctx.lineTo(x + CELL - 8, y + k); ctx.stroke(); ctx.strokeStyle = 'rgba(255,226,180,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y + k + 2); ctx.lineTo(x + CELL - 8, y + k + 2); ctx.stroke(); }
    return;
  }
  if (cell.state === 'burnt') {
    TREE_SPOTS.forEach(([dx, dy], k) => {
      const ash = ctx.createRadialGradient(cx + dx, cy + dy, 1, cx + dx, cy + dy, 17); ash.addColorStop(0, 'rgba(130,130,124,.5)'); ash.addColorStop(1, 'rgba(120,120,115,0)');
      ctx.fillStyle = ash; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d0c0b'; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba('#ff6e28', .2 + .15 * Math.sin(time * 2 + k * 2 + seed)); ctx.beginPath(); ctx.arc(cx + dx + 1, cy + dy - 1, 1.8, 0, Math.PI * 2); ctx.fill();
    });
    return;
  }
  const crownColour = {coated: '#d8768a', damp: '#3f7d78', burning: '#3c3320'}[cell.state] ?? '#3f7a45';
  if (cell.state === 'burning') {
    const s = cell.percent / 100, scorch = ctx.createRadialGradient(cx, cy, 4, cx, cy, CELL * .62); scorch.addColorStop(0, rgba('#ff6e1e', .25 + .3 * s)); scorch.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = scorch; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }
  for (const [dx, dy] of TREE_SPOTS) crown(ctx, cx + dx, cy + dy, 19, crownColour);
  if (cell.state === 'damp') { for (let k = 0; k < 6; k++) { const dx = x + 14 + (k * 29) % 76, dy = y + 14 + (k * 41) % 72; ctx.fillStyle = 'rgba(140,200,240,.8)'; ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(dx - 1, dy - 1, 1, 0, Math.PI * 2); ctx.fill(); } }
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
  // The lake on the left, with its shore and ripples, and the road on the right, a strip of tarmac turned to run down the board.
  const lake = ctx.createLinearGradient(0, 0, FX - 6, 0); lake.addColorStop(0, '#1c3f50'); lake.addColorStop(1, '#3b7088');
  ctx.fillStyle = lake; ctx.fillRect(0, FY - 10, FX - 6, ROWS * CELL + 20);
  ctx.fillStyle = '#5b5a40'; ctx.fillRect(FX - 12, FY - 10, 6, ROWS * CELL + 20);
  ctx.strokeStyle = 'rgba(200,230,240,.3)'; ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) { const wy = FY + 20 + k * 48; ctx.beginPath(); ctx.moveTo(8, wy); ctx.quadraticCurveTo(26, wy - 6, 44, wy); ctx.stroke(); }
  ctx.save(); ctx.translate(ROAD_X + ROAD_W, FY - 10); ctx.rotate(Math.PI / 2); tarmac(ctx, 0, 0, ROWS * CELL + 20, ROAD_W); ctx.restore();
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
    ctx.strokeStyle = rgba('#8cc8f5', 1 - a / 1.2); ctx.lineWidth = 5;
    for (const r of [a * 60, a * 40]) { ctx.beginPath(); ctx.arc(x, y, 10 + r, 0, Math.PI * 2); ctx.stroke(); }
  }
}
function tool(ctx, view) {
  const [x, y] = TOOL_AT, kind = view.tool, set = view.keys.Space === kind;
  // Where it will go: the column of trees in front of the flames.
  if (set) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(FX + STRIP * CELL + 3, FY + 3, CELL - 6, ROWS * CELL - 6); ctx.setLineDash([]); }
  ctx.save(); ctx.translate(x, y);
  if (kind === 'rake') {
    // A timber handle and a steel head with its tines.
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-33, -22); ctx.lineTo(17, 16); ctx.stroke();
    ctx.strokeStyle = '#a0784a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-34, -24); ctx.lineTo(16, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,190,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-35, -26); ctx.lineTo(14, 12); ctx.stroke();
    ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(32, -2); ctx.stroke();
    ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(32, -2); ctx.stroke();
    ctx.lineWidth = 2.4; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 6, 22 - k * 6); ctx.lineTo(12 + k * 6, 29 - k * 6); ctx.stroke(); }
    ctx.lineCap = 'butt';
  } else {
    // A pink retardant tank with a banded body and a steel nozzle.
    const tank = ctx.createLinearGradient(-14, 0, 14, 0); tank.addColorStop(0, '#e9a3b2'); tank.addColorStop(.4, '#c95b6f'); tank.addColorStop(1, '#6e2a38');
    ctx.fillStyle = tank; ctx.beginPath(); ctx.roundRect(-14, -26, 28, 40, 6); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-14, -10, 28, 3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-14, -11, 28, 1);
    steel(ctx, -4, 14, 8, 14, 2); steel(ctx, -9, -30, 18, 6, 2);
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
    panel(ctx, px, 40, 212, 116, .82);
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
    panel(ctx, px, 40, 212, 150, .82);
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
  shadow(ctx, x, y + 166, 200, .55);
  steel(ctx, x - 170, y + 44, 340, 22, 4);
  const front = ctx.createLinearGradient(0, y + 66, 0, y + 162); front.addColorStop(0, '#3a4348'); front.addColorStop(1, '#14191b');
  ctx.fillStyle = front; ctx.fillRect(x - 150, y + 66, 300, 96); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 150, y + 66, 300, 1.2);
  for (const dx of [-105, -35, 35, 105]) { const knob = ctx.createRadialGradient(x + dx - 3, y + 100, 1, x + dx, y + 104, 12); knob.addColorStop(0, '#e6ecef'); knob.addColorStop(1, '#3d464b'); ctx.fillStyle = knob; ctx.beginPath(); ctx.arc(x + dx, y + 104, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + dx, y + 104); ctx.lineTo(x + dx, y + 95); ctx.stroke(); }
  for (const dx of [-60, -20, 20, 60]) { ctx.fillStyle = 'rgba(90,150,255,.9)'; ctx.beginPath(); ctx.ellipse(x + dx, y + 38, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8ecff'; ctx.beginPath(); ctx.ellipse(x + dx, y + 41, 2.4, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  const pan = ctx.createLinearGradient(0, y - 6, 0, y + 30); pan.addColorStop(0, '#59636a'); pan.addColorStop(.5, '#2f373b'); pan.addColorStop(1, '#14181a');
  ctx.fillStyle = pan; ctx.beginPath(); ctx.roundRect(x - 96, y - 6, 192, 36, 4); ctx.fill();
  steel(ctx, x + 96, y + 2, 76, 10, 4); bolt(ctx, x + 104, y + 7, 2);
  const oil = ctx.createLinearGradient(0, y - 6, 0, y + 2); oil.addColorStop(0, '#e0b54a'); oil.addColorStop(1, '#9a7222'); ctx.fillStyle = oil; ctx.fillRect(x - 90, y - 6, 180, 8);
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x - 86, y - 5, 60, 1.4);
  if (!shut) for (let k = 0; k < 5; k++) flame(ctx, x - 72 + k * 36, y - 4, 38, 90 + 30 * Math.sin(k * 1.7) ** 2, time, k);
  const lidY = shut ? y - 16 : y - 170;
  shadow(ctx, x, lidY + 22, 100, shut ? .5 : .25);
  const lid = ctx.createLinearGradient(0, lidY, 0, lidY + 12); lid.addColorStop(0, '#e1e8ec'); lid.addColorStop(.45, '#9aa5ab'); lid.addColorStop(1, '#46505a');
  ctx.fillStyle = lid; ctx.beginPath(); ctx.roundRect(x - 102, lidY, 204, 12, 5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
  steel(ctx, x - 22, lidY - 12, 44, 9, 4); steel(ctx, x - 18, lidY - 5, 6, 6, 1); steel(ctx, x + 12, lidY - 5, 6, 6, 1);
  text(ctx, shut ? 'The lid keeps fresh air out.' : 'A lid', x, shut ? y - 60 : lidY - 30, {size: 17});
}
// A small forest for the questions: burning at the lake end, the road at the far end, and a mark where something goes.
function miniForest(ctx, x0, y0, size, what, where, time) {
  const states = what === 'coat' ? ['burnt', 'burning', 'burning', 'trees', 'trees', 'trees'] : ['burning', 'burning', 'burning', 'trees', 'trees', 'trees'];
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const s = states[i], x = x0 + i * size, y = y0 + j * size, ground = s === 'burnt' ? '#1d1b19' : s === 'burning' ? '#3c3320' : '#2d3a26';
    const base = ctx.createLinearGradient(x, y, x + size, y + size); base.addColorStop(0, shade(ground, .08)); base.addColorStop(1, shade(ground, -.18));
    ctx.fillStyle = base; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    if (s === 'burning') { const scorch = ctx.createRadialGradient(x + size / 2, y + size / 2, 2, x + size / 2, y + size / 2, size * .6); scorch.addColorStop(0, 'rgba(255,110,30,.45)'); scorch.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = scorch; ctx.fillRect(x + 1, y + 1, size - 2, size - 2); }
    if (s === 'trees' || s === 'burning') crown(ctx, x + size / 2, y + size / 2, size * .3, s === 'trees' ? '#3f7a45' : '#3c3320');
    if (s === 'burning') flame(ctx, x + size / 2, y + size * .78, size * .4, size * .6, time, i + j);
  }
  const lake = ctx.createLinearGradient(x0 - size * .35, 0, x0 - size * .05, 0); lake.addColorStop(0, '#1c3f50'); lake.addColorStop(1, '#3b7088');
  ctx.fillStyle = lake; ctx.fillRect(x0 - size * .35, y0, size * .3, ROWS * size);
  ctx.fillStyle = '#2f3234'; ctx.fillRect(x0 + COLS * size + 4, y0, size * .45, ROWS * size);
  ctx.fillStyle = 'rgba(235,230,214,.5)'; for (let j = 0; j < ROWS * 2; j++) ctx.fillRect(x0 + COLS * size + 4 + size * .22 - 1, y0 + j * size * .5 + 3, 2, size * .28);
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
    panel(ctx, x, 40, w, 600, .6);
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
