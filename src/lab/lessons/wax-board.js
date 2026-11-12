// The Wax lesson's board (docs/board/cards/LAB-CLASSROOM-WAX.md): snow trays side on, a 50 m test strip at 10
// degrees with a stopwatch on each ski, three labelled wax tins on the workbench, the thermometer and magnifier, the
// arrows and bars of the friction sum, a close-up of the base on the snow, the results table of the free test, and the
// ski menu's line for Brian's job. Draws and hit-tests only.
// It is a wide board (docs/board/cards/LAB-LOOK.md, round 11): the stopwatches and the table of results are in the strip under
// the board, and no text on it is smaller than 15 board units.
import {BOARD, theme, cardScene, labelPlate, background, shadow, steel, bezel, shade, grain, timber, glassTube, glassGlare, forceArrowTo, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {STRIP_M, WAX_NAMES, SNOW_ORDER, s1, metresAt, runSeconds} from './wax-classroom.js';
import {SNOWS, WAXES} from '../benches/wax.js';
export {BOARD};
export const size = Object.freeze({width: 1320, height: 680});
export const pressMovesDrag = false;
const W = size.width;

// Cold to warm: blue for hard, violet for medium, red for soft (the usual ski wax colours).
export const WAX_COLOURS = Object.freeze({hard: '#3f86d8', medium: '#9466d6', soft: '#d9573f'});
const THERMOMETER_FILL = '#55666f', LABEL = '#aab2ad', PLAIN = '#9aa3a8', PULL_COLOUR = '#9ff0b4', SLOW_COLOUR = '#f07a5a', LEFT_COLOUR = '#edc557', WATER = '#58b4e6';
const SLOPE = Math.tan(10 * Math.PI / 180);
// The tins on the workbench, a quarter larger than the usual board's.
const TIN_SCALE = 1.25;
const TINS = Object.freeze(WAXES.map((wax, i) => ({wax, x: W / 2 - 230 + i * 230, y: 596})));
const onTin = (t, x, y) => Math.abs(x - t.x) < 58 * TIN_SCALE && Math.abs(y - t.y) < 46 * TIN_SCALE;
// The free test's three snow tabs, along the top right of the board.
const TABS = Object.freeze(SNOW_ORDER.map((snow, i) => ({snow, x: 880 + i * 135, y: 16, w: 125, h: 34})));
const inTab = (t, x, y) => x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h;
// The magnifier step: the thermometer on the left of the lens, both larger than on the usual board.
const THERMO = Object.freeze({x: 330, y: 120, h: 330}), LENS = Object.freeze({x: 800, y: 345, r: 150, k: 1.35});

// A strip's geometry: its top-left, its run across the board, and how far apart its lanes are. The strips run across the wide board.
function stripGeometry(view, i) {
  if (view.strips.length > 1) return {x: 220, y: 80 + i * 180, w: 780, lane: 56, scale: 1.1};
  if (view.compact) return {x: 70, y: 80, w: 800, lane: 56, scale: 1};
  return {x: 60, y: 235, w: 1150, lane: 110, scale: 1.6};
}
const along = (g, metres) => metres / STRIP_M * g.w;
const surface = (g, laneIndex, px) => [g.x + px, g.y + px * SLOPE + laneIndex * g.lane];
const skiAt = (view, i, j) => { const g = stripGeometry(view, i), l = view.strips[i].lanes[j]; return surface(g, j, 30 * g.scale + along(g, l.metres)); };

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'trays') return null;
  if (view.snowTabs?.open) for (const t of TABS) if (inTab(t, x, y)) return {action: `snow:${t.snow}`};
  if (view.tins && view.keys['1']) for (const t of TINS) if (onTin(t, x, y)) return {action: view.keys[String(1 + WAXES.indexOf(t.wax))]};
  if (view.keys.Space && view.strips.length && view.strips[0].lanes.length) { const [sx, sy] = skiAt(view, 0, 0); if (Math.abs(x - sx) < 50 * stripGeometry(view, 0).scale && Math.abs(y - sy) < 30 * stripGeometry(view, 0).scale) return {action: view.keys.Space}; }
  if (view.magnifier && view.keys['→'] && inThermometer(x, y)) return {action: y < THERMO.y + THERMO.h / 2 ? view.keys['→'] : view.keys['←']};
  return null;
}
const inThermometer = (x, y) => Math.abs(x - THERMO.x) < 45 && y > THERMO.y - 20 && y < THERMO.y + THERMO.h + 40;
export function hoverInfo(view, x, y) {
  if (view.scene !== 'trays') return null;
  // A tin says only its name, because a tin's use would answer a guess or a question.
  if (view.tins) for (const t of TINS) if (onTin(t, x, y)) return `${WAX_NAMES[t.wax]} wax.`;
  if (view.snowTabs) for (const t of TABS) if (inTab(t, x, y)) return `${SNOWS[t.snow].name} is at ${SNOWS[t.snow].celsius} °C.`;
  if (view.closeup && inCloseUp(view, x, y)) return 'This is a close-up of the base of the ski sliding over the snow.';
  if (view.magnifier && Math.hypot(x - LENS.x, y - LENS.y) < LENS.r * LENS.k) return 'These are snow crystals seen through the magnifier.';
  if (view.magnifier && inThermometer(x, y)) return `The thermometer reads ${Math.round(view.celsius) || 0} °C.`;
  if (view.forces && y > 60 && y < 290) return 'The green arrow shows gravity’s pull along the slope, and the red arrow shows friction’s slowing.';
  if (view.forces && y >= 300 && y < 540) return 'The red bar is subtracted from the green bar, and the gold bar is the acceleration that is left.';
  for (const [i, s] of view.strips.entries()) {
    const g = stripGeometry(view, i);
    for (const [j, l] of s.lanes.entries()) {
      const [sx, sy] = skiAt(view, i, j);
      if (Math.abs(x - sx) < 50 * g.scale && Math.abs(y - sy) < 24 * g.scale) return l.wax ? `This ski has ${l.wax} wax on the base.` : 'This plain ski has no wax.';
    }
    if (x > g.x && x < g.x + g.w && y > g.y - 30 && y < g.y + g.w * SLOPE + g.lane * s.lanes.length + 30) return `This is ${s.name.toLowerCase()} at ${s.celsius} °C, on a test strip ${STRIP_M} m long.`;
  }
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'trays') return null;
  if (action === 'pick:best' && view.best) { const t = TINS.find(t => t.wax === view.best); return [t.x, t.y - 10]; }
  if (action === 'warm:best') return [THERMO.x, THERMO.y + THERMO.h / 2 - 20];
  if (view.strips.length && view.strips[0].lanes.length) return skiAt(view, 0, 0);
  return [size.width / 2, size.height / 2];
}
export function dragAngle() { return 0; }

// ---- drawing ----
function panel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(26,33,37,.92)'); g.addColorStop(1, 'rgba(11,15,17,.92)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  bezel(ctx, x, y, w, h, 8);
}
// A lit arrow from (x0, y0) to (x1, y1).
function arrow(ctx, x0, y0, x1, y1, colour, width = 5) { forceArrowTo(ctx, x0, y0, x1, y1, colour, width * 1.4); }
// A band of snow along the slope, in the slope's own frame: its top edge at y 0, `thick` deep and `L` long. Powder is soft and
// bumpy with glints in it, cool snow is smooth with a firm sheen, and wet snow is grey-blue and glossy with meltwater lying on it.
function snowBand(ctx, kind, L, thick) {
  const g = ctx.createLinearGradient(0, -3, 0, thick);
  if (kind === 'wet') { g.addColorStop(0, '#d6e3e7'); g.addColorStop(.35, '#b4c8d0'); g.addColorStop(1, '#7f98a4'); }
  else if (kind === 'cold') { g.addColorStop(0, '#f0f6f8'); g.addColorStop(.4, '#d5e3ea'); g.addColorStop(1, '#9db4c2'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(.4, '#eaf4f9'); g.addColorStop(1, '#bcd2de'); }
  const bump = kind === 'wet' ? 1.2 : kind === 'cold' ? .8 : 2.6;
  const path = () => { ctx.beginPath(); ctx.moveTo(0, thick); for (let x = 0; x <= L; x += 6) ctx.lineTo(x, -2 - bump * (.5 + .5 * Math.sin(x * .09 + grain(Math.floor(x / 6) + 20) * 6))); ctx.lineTo(L, thick); ctx.closePath(); };
  ctx.fillStyle = g; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  if (kind === 'powder') for (let k = 0, n = Math.ceil(L / 8); k < n; k++) {
    const gx = grain(k + 30) * L, gy = -1 + grain(k + 40) * (thick - 3);
    ctx.fillStyle = 'rgba(150,185,205,.3)'; ctx.fillRect(gx, gy + 1.5, 4 + grain(k + 45) * 5, 1.4);
    if (k % 2) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(gx - 2, gy); ctx.lineTo(gx + 2, gy); ctx.moveTo(gx, gy - 2); ctx.lineTo(gx, gy + 2); ctx.stroke(); }
  }
  if (kind === 'cold') {
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, -1.6, L, 1.3);
    ctx.strokeStyle = 'rgba(110,145,165,.35)'; ctx.lineWidth = .8; ctx.beginPath();
    for (let k = 0, n = Math.ceil(L / 70); k < n; k++) { const cx = grain(k + 50) * L; ctx.moveTo(cx, 1); ctx.lineTo(cx + 8, 4); ctx.lineTo(cx + 5, thick - 1); }
    ctx.stroke();
  }
  if (kind === 'wet') {
    for (let k = 0, n = Math.ceil(L / 46); k < n; k++) {
      const px = 14 + grain(k + 60) * (L - 28), pw = 8 + grain(k + 70) * 12;
      ctx.fillStyle = 'rgba(96,160,190,.75)'; ctx.beginPath(); ctx.ellipse(px, 1.2, pw, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(px - pw * .5, .2, pw * .7, .9);
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(0, -1.8, L, 1);
  }
  ctx.fillStyle = 'rgba(30,50,65,.35)'; ctx.fillRect(0, thick - 2, L, 2);
  ctx.restore();
}
// A ski side on, nose to the right and centred on the origin, `len` long: a cream top sheet with a dark stripe, a steel edge, a
// base in the wax's colour, a tip that curves up and a small upturn at the tail.
function skiShape(ctx, len, baseColour) {
  const h = len / 2, shape = () => {
    ctx.beginPath(); ctx.moveTo(-h + 1, 3); ctx.lineTo(h - 12, 3); ctx.quadraticCurveTo(h + 6, 3, h + 14, -9);
    ctx.quadraticCurveTo(h + 4, -5, h - 14, -4.5); ctx.lineTo(-h + 4, -4.5); ctx.quadraticCurveTo(-h - 3, -4.5, -h - 3, -1.5); ctx.closePath();
  };
  const top = ctx.createLinearGradient(0, -4.5, 0, 3); top.addColorStop(0, '#fbf6e6'); top.addColorStop(.6, '#d4ccb6'); top.addColorStop(1, '#8d8777');
  ctx.fillStyle = top; shape(); ctx.fill();
  ctx.save(); shape(); ctx.clip();
  ctx.fillStyle = 'rgba(30,36,40,.75)'; ctx.fillRect(-h + 8, -3, len - 30, 1.3);
  ctx.fillStyle = baseColour; ctx.fillRect(-h - 4, 1.2, len + 8, 3);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-h - 4, 1.2, len + 8, .7);
  ctx.fillStyle = '#b5bfc5'; ctx.fillRect(-h - 4, .3, len + 8, .9);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = .9; shape(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-h + 3, -4.2); ctx.lineTo(h - 14, -4.2); ctx.quadraticCurveTo(h + 2, -4.6, h + 11, -8); ctx.stroke();
}
// The ski's binding: a dark plate with a toe piece and a heel piece.
function binding(ctx, scale = 1) {
  ctx.save(); ctx.scale(scale, scale); ctx.translate(0, 4);
  ctx.fillStyle = '#1d2427'; ctx.beginPath(); ctx.roundRect(-9, -11, 18, 4, 1.5); ctx.fill();
  ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(-9, -16, 6, 6, 1.5); ctx.fill(); ctx.beginPath(); ctx.roundRect(3, -14, 6, 4, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-8, -16, 4, .9); ctx.fillRect(4, -14, 4, .9);
  ctx.restore();
}
function drawStrip(ctx, view, i) {
  const s = view.strips[i], g = stripGeometry(view, i), n = Math.max(1, s.lanes.length);
  // The tray: timber under a snow surface, one lane a ski.
  for (let j = 0; j < n; j++) {
    const [x0, y0] = surface(g, j, 0), [x1, y1] = surface(g, j, g.w), length = Math.hypot(x1 - x0, y1 - y0);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan(SLOPE));
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 20 * g.scale, length, 4);
    timber(ctx, 0, 4, length, 16 * g.scale);
    snowBand(ctx, s.snow, length, 12);
    ctx.restore();
  }
  // Start and finish lines, with a small flag on a pole at the top of each, and the metres.
  for (const [m, label] of [[0, 'start'], [STRIP_M, `${STRIP_M} m`]]) {
    const [x, y] = surface(g, 0, 30 * g.scale + along(g, m)), top = y - 42 * g.scale;
    ctx.strokeStyle = m ? theme.accent : 'rgba(245,240,220,.6)'; ctx.lineWidth = 2; ctx.setLineDash(m ? [] : [5, 4]);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, y + (n - 1) * g.lane + 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#d8dee1'; ctx.fillRect(x - 1, top - 2, 2, 14 * g.scale + 4);
    if (m) { for (let c = 0; c < 6; c++) { ctx.fillStyle = ((c % 3) + (c > 2 ? 1 : 0)) % 2 ? '#15191b' : '#f5f0dc'; ctx.fillRect(x + 1 + (c % 3) * 5 * g.scale, top + (c > 2 ? 5 : 0) * g.scale, 5 * g.scale, 5 * g.scale); } }
    else { ctx.fillStyle = '#56d683'; ctx.beginPath(); ctx.moveTo(x + 1, top); ctx.lineTo(x + 16 * g.scale, top + 5 * g.scale); ctx.lineTo(x + 1, top + 10 * g.scale); ctx.closePath(); ctx.fill(); }
    text(ctx, label, x, y - 52 * g.scale, {size: 13 * g.scale + 2, colour: m ? theme.accent : LABEL});
  }
  // The snow: its name and temperature, with a small thermometer.
  const [lx, ly] = surface(g, 0, 0);
  thermometer(ctx, lx - 30, ly - 50 * g.scale, 70 * g.scale, s.celsius, false);
  // Three strips are close together, so each name sits over its own strip, right of the start flag, where the strip above has dropped away.
  const stacked = view.strips.length > 1;
  text(ctx, `${s.name}, ${s.celsius} °C`, stacked ? lx + 62 : lx - 10, ly - (stacked ? 26 : 80) * g.scale, {size: 18 * g.scale + 2, align: 'left', colour: theme.text});
  if (view.glide) secondMarks(ctx, view, g);
  for (const [j, l] of s.lanes.entries()) ski(ctx, view, i, j, l, g);
}


// Where the ski was at the end of each second: the marks grow further apart because the ski moves faster.
function secondMarks(ctx, view, g) {
  for (const {second, metres} of view.glide.marks) {
    const [x, y] = surface(g, 0, 30 * g.scale + along(g, metres));
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 26); ctx.stroke();
    text(ctx, `${second} s`, x, y + 40, {size: 17, colour: theme.accent, weight: 800});
    if (second >= 3) text(ctx, `${metres.toFixed(1)} m`, x, y + 62, {size: 16, colour: theme.text});
  }
}
// The glide step's reading of the ski's speed, in both units, with the arrow's scale under it.
function speedBox(ctx, view) {
  const speed = view.glide.speed;
  panel(ctx, 70, 500, 1000, 140);
  text(ctx, 'THE SPEED OF THE SKI NOW', 92, 524, {size: 15, align: 'left', colour: LABEL, weight: 800});
  text(ctx, `${speed.toFixed(1)} m/s`, 92, 574, {size: 44, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, `${(speed * 3.6).toFixed(0)} km/h`, 440, 574, {size: 44, align: 'left', weight: 800});
  text(ctx, 'The yellow marks show where the ski was at the end of each second.', 92, 618, {size: 17, align: 'left', colour: theme.text});
}
function ski(ctx, view, i, j, l, g) {
  const [x, y] = skiAt(view, i, j), len = 78 * g.scale, a = Math.atan(SLOPE), snow = view.strips[i].snow;
  ctx.save(); ctx.translate(x, y - 4 * g.scale); ctx.rotate(a);
  // While the ski runs, loose snow (or spray, on wet snow) is thrown up behind it.
  if (l.setAt != null && !l.done) for (let k = 0; k < 8; k++) {
    const t = (view.time * 2.2 + k / 8) % 1, px = -len / 2 - 4 - t * 34 * g.scale, py = 3 - t * (6 + 8 * grain(k + 5)) - grain(k + 9) * 3, r = (snow === 'wet' ? 1.6 : 2.6 + grain(k + 13) * 2.4) * g.scale * (1 + t * .6);
    ctx.fillStyle = snow === 'wet' ? `rgba(150,200,225,${(.7 * (1 - t)).toFixed(2)})` : `rgba(255,255,255,${(.75 * (1 - t)).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  shadow(ctx, 0, 7, len * .55, .4);
  skiShape(ctx, len, l.wax ? WAX_COLOURS[l.wax] : PLAIN);
  binding(ctx, g.scale);
  ctx.restore();
  // The ski's name rides over it, and sits before the finish line once the ski has finished. Its stopwatch is in the strip under the board.
  const named = !l.done ? {x, y: y - 26 * g.scale, align: 'center'} : {x: x - 12, y: y - 26 * g.scale, align: 'right'};
  text(ctx, l.label, named.x, named.y, {size: 13 * g.scale + 2, align: named.align, colour: l.wax ? WAX_COLOURS[l.wax] : LABEL});
  // The ski's speed as an arrow along the slope: the arrow grows as the ski speeds up.
  if (view.glide && view.glide.speed > .1) {
    const length = view.glide.speed * 8 * g.scale, ux = Math.cos(a), uy = Math.sin(a), ax = x + 50 * g.scale * ux, ay = y - 22 * g.scale + 50 * g.scale * uy;
    arrow(ctx, ax, ay, ax + length * ux, ay + length * uy, theme.accent, 4);
  }
  if (l.behindM != null) {
    const [bx, by] = surface(g, j, 30 * g.scale + along(g, STRIP_M - l.behindM));
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by - 14); ctx.lineTo(bx, by + 10); ctx.stroke();
    text(ctx, `${l.behindM.toFixed(1)} m behind`, bx - 8, by + 22 * g.scale, {size: 13 * g.scale + 2, align: 'right', colour: theme.bad});
  }
}
function thermometer(ctx, x, y, h, celsius, big) {
  const k = Math.max(0, Math.min(1, (celsius + 15) / 15)), w = big ? 22 : 9;
  // Glass round a column of one colour at every temperature, because a colour that changed would answer an open pick.
  const level = y + 2 + (h - 4) * (1 - k), bulbY = y + h + w * .4;
  glassTube(ctx, x, y, y + h, {width: w, bulbR: w * .8, bulbY, levelY: bulbY, spirit: THERMOMETER_FILL});
  ctx.fillStyle = THERMOMETER_FILL; ctx.beginPath(); ctx.roundRect(x - w * .2, level, w * .4, bulbY - level, w * .2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w * .12, level, Math.max(.8, w * .08), bulbY - level);
  if (big) for (const c of [0, -5, -10, -15]) { const ty = y + 2 + (h - 4) * (1 - (c + 15) / 15); ctx.strokeStyle = theme.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w / 2, ty); ctx.lineTo(x + w / 2 + 10, ty); ctx.stroke(); text(ctx, `${c} °C`, x + w / 2 + 16, ty, {size: 15, align: 'left'}); }
}
// Snow crystals: sharp six-armed stars when cold, rounding into wet grains near 0 °C.
function crystals(ctx, cx, cy, r, celsius, time) {
  const warm = Math.max(0, Math.min(1, (celsius + 15) / 15));
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const lens = ctx.createRadialGradient(cx - r * .25, cy - r * .3, r * .1, cx, cy, r); lens.addColorStop(0, warm > .9 ? '#d6e5ea' : '#f4fafc'); lens.addColorStop(1, warm > .9 ? '#a9c2cd' : '#c3d8e2');
  ctx.fillStyle = lens; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  for (let i = 0; i < 9; i++) {
    const x = cx + ((i * 97) % 220) - 110 + Math.sin(i * 1.7) * 12, y = cy + ((i * 61) % 200) - 100, size = 26 + (i % 3) * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(i * .5 + time * .05);
    ctx.strokeStyle = '#6d9bb3'; ctx.fillStyle = 'rgba(160,200,220,.7)'; ctx.lineWidth = 3 - warm * 1.5;
    if (warm < .85) {
      for (let a = 0; a < 6; a++) {
        const arm = size * (1 - warm * .7);
        ctx.save(); ctx.rotate(a * Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(arm, 0); ctx.moveTo(arm * .55, 0); ctx.lineTo(arm * .8, arm * .22); ctx.moveTo(arm * .55, 0); ctx.lineTo(arm * .8, -arm * .22); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, 6 + warm * size * .5, 0, Math.PI * 2); ctx.fill();
    if (warm > .7) { ctx.fillStyle = 'rgba(70,130,170,.55)'; ctx.beginPath(); ctx.arc(size * .4, size * .3, 4 + warm * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  const edge = ctx.createRadialGradient(cx, cy, r * .62, cx, cy, r); edge.addColorStop(0, 'rgba(20,40,55,0)'); edge.addColorStop(1, 'rgba(20,40,55,.4)');
  ctx.fillStyle = edge; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
  ctx.lineCap = 'round'; ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(cx + r * .72, cy + r * .72); ctx.lineTo(cx + r * 1.12, cy + r * 1.12); ctx.stroke();
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(cx + r * .72, cy + r * .72); ctx.lineTo(cx + r * 1.12, cy + r * 1.12); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,190,.3)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx + r * .72 - 4, cy + r * .72 - 3); ctx.lineTo(cx + r * 1.12 - 4, cy + r * 1.12 - 3); ctx.stroke(); ctx.lineCap = 'butt';
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rim.addColorStop(0, theme.brass[0]); rim.addColorStop(.5, theme.brass[1]); rim.addColorStop(1, theme.brass[2]);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = rim; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,244,210,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2); ctx.stroke();
  glassGlare(ctx, cx, cy, r * .9);
  text(ctx, warm > .9 ? 'Rounded and wet' : warm < .2 ? 'Sharp and hard' : 'Softening', cx, cy - r - 22, {size: 18, colour: theme.text});
}
function tin(ctx, x, y, wax, picked, keyName, glow, time) {
  const w = 104, h = 70, lift = picked ? 10 : 0, colour = WAX_COLOURS[wax], top = y - h / 2 - lift;
  shadow(ctx, x, y + h / 2 + 6, w * .62, .6);
  // A tin of wax: a body in the wax's colour lit from the left, steel rims, and a paper label.
  const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); body.addColorStop(0, shade(colour, -.4)); body.addColorStop(.2, shade(colour, .35)); body.addColorStop(.5, colour); body.addColorStop(1, shade(colour, -.55));
  ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, h, 8); ctx.fill();
  steel(ctx, x - w / 2 - 2, top, w + 4, 9, 3); steel(ctx, x - w / 2 - 2, top + h - 9, w + 4, 9, 3);
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x - w / 2 + 10, top + 14, 3, h - 28);
  const paper = ctx.createLinearGradient(0, y - 12 - lift, 0, y + 14 - lift); paper.addColorStop(0, '#fbf6e6'); paper.addColorStop(1, '#ddd5bc');
  ctx.fillStyle = paper; ctx.beginPath(); ctx.roundRect(x - 40, y - 12 - lift, 80, 26, 4); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 16px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(WAX_NAMES[wax].toUpperCase(), x, y + 1 - lift);
  if (keyName) keyCap(ctx, x - w / 2 + 2, y - h / 2 - lift - 2, keyName);
  if (picked) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - w / 2 - 6, y - h / 2 - lift - 6, w + 12, h + 12, 10); ctx.stroke(); }
  if (glow && !picked) { ctx.strokeStyle = theme.accent; ctx.globalAlpha = .35 + .3 * Math.sin(time * 6); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 9); ctx.stroke(); ctx.globalAlpha = 1; }
}
function bench(ctx, view) {
  const x = W / 2 - 400;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 6, 656, 788, 6);
  timber(ctx, x, 638, 800, 18);
  for (const t of TINS) tinAt(ctx, t.x, t.y, t.wax, view.pick === t.wax, view.keys['1'] ? String(1 + WAXES.indexOf(t.wax)) : null, view.glow === 'tins', view.time);
}
// A tin at the wide board's size.
function tinAt(ctx, x, y, wax, picked, keyName, glow, time, k = TIN_SCALE) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  tin(ctx, 0, 0, wax, picked, keyName, glow, time);
  ctx.restore();
}

// The ski menu's line, as the game shows it, on a card.
function menu(ctx, m) {
  const x = 470, y = 8, w = 700, h = m.example ? 76 : 90;
  panel(ctx, x, y, w, h);
  text(ctx, m.example ? 'THE SKI MENU' : `THE SKI MENU · DAY ${m.day} OF ${m.of}${m.done ? ' · DONE' : ''}`, x + 20, y + 19, {size: 15, align: 'left', colour: LABEL, weight: 800});
  text(ctx, m.line, x + 20, y + 48, {size: 24, align: 'left', colour: theme.text});
  if (!m.example) text(ctx, 'Hard wax · Medium wax · Soft wax', x + 20, y + 74, {size: 16, align: 'left', colour: LABEL});
}
function ruleScene(ctx, tins) {
  // Three snows, cold to warm; once answered, each over the wax that suits it.
  [['powder', 'hard'], ['cold', 'medium'], ['wet', 'soft']].forEach(([snow, wax], i) => {
    const x = 330 + i * 330;
    thermometer(ctx, x - 60, 130, 250, SNOWS[snow].celsius, true);
    text(ctx, `${SNOWS[snow].name}`, x + 20, 430, {size: 20});
    if (tins) tinAt(ctx, x + 20, 520, wax, false, null, false, 0);
  });
}

// ---- the friction sum: the two arrows on the slope, then the same numbers as bars ----
const ARROW_SCALE = 200, BAR_SCALE = 480, BAR_X = 330;
function forces(ctx, view) {
  const f = view.forces, x0 = 150, y0 = 90, length = 900, ux = Math.cos(Math.atan(SLOPE)), uy = Math.sin(Math.atan(SLOPE));
  const what = f.wax ? `${WAX_NAMES[f.wax]} wax` : 'No wax';
  text(ctx, `${what} on ${SNOWS[f.snow].name.toLowerCase()}, friction number ${f.friction}`, 60, 40, {size: 26, align: 'left', colour: theme.accent, weight: 800});
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan(SLOPE));
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, 32, length / ux, 4); timber(ctx, 0, 6, length / ux, 26); snowBand(ctx, f.snow, length / ux, 12);
  ctx.restore();
  // The ski in the middle of the slope.
  const sx = x0 + 420, sy = y0 + 420 * SLOPE;
  ctx.save(); ctx.translate(sx, sy - 4); ctx.rotate(Math.atan(SLOPE));
  shadow(ctx, 0, 7, 76, .4); skiShape(ctx, 140, f.wax ? WAX_COLOURS[f.wax] : PLAIN); binding(ctx, 1.6);
  ctx.restore();
  // Gravity's pull down the slope, friction's slowing up the slope, to one scale.
  const ay = sy - 36, pull = f.pull * ARROW_SCALE, slow = f.slowing * ARROW_SCALE;
  arrow(ctx, sx, ay, sx + pull * ux, ay + pull * uy, PULL_COLOUR, 6);
  arrow(ctx, sx, ay, sx - slow * ux, ay - slow * uy, SLOW_COLOUR, 6);
  text(ctx, 'gravity’s pull', sx + pull * ux + 12, ay + pull * uy - 14, {size: 19, align: 'left', colour: PULL_COLOUR, weight: 800});
  text(ctx, 'friction', sx - slow * ux - 10, ay - slow * uy - 10, {size: 19, align: 'right', colour: SLOW_COLOUR, weight: 800});
  // The same numbers as bars, with the slowing cut off the end of the pull.
  panel(ctx, 40, 306, 1240, 230);
  text(ctx, 'THE PULL, THE SLOWING AND WHAT IS LEFT', 60, 330, {size: 15, align: 'left', colour: LABEL, weight: 800});
  const row = (y, label, from, value, colour) => {
    text(ctx, label, 60, y + 20, {size: 20, align: 'left', colour});
    ctx.fillStyle = colour; ctx.fillRect(BAR_X + from * BAR_SCALE, y, value * BAR_SCALE, 40);
    text(ctx, `${value.toFixed(3)} m/s²`, BAR_X + f.pull * BAR_SCALE + 18, y + 20, {size: 22, align: 'left', colour, weight: 800});
  };
  row(350, 'Gravity’s pull', 0, f.pull, PULL_COLOUR);
  row(410, 'Friction’s slowing', f.acceleration, f.slowing, SLOW_COLOUR);
  row(470, 'Acceleration left', 0, f.acceleration, LEFT_COLOUR);
}

// ---- the close-up: the base of the ski sliding over the snow, from the side ----
// How far the points press into each wax (a share of the wax's depth), and how much of the gap the water fills.
const PRESS = Object.freeze({powder: {hard: 0, medium: .4, soft: 1}, cold: {hard: 0, medium: .1, soft: .7}, wet: {hard: 0, medium: 0, soft: 0}});
const WET = Object.freeze({powder: {hard: 0, medium: 0, soft: 0}, cold: {hard: .55, medium: .2, soft: .2}, wet: {hard: 1, medium: .55, soft: .2}});
const SHARP = Object.freeze({powder: 1, cold: .5, wet: 0});
export const CLOSE_CAPTIONS = Object.freeze({
  powder: {hard: 'The sharp points stay on the surface of the hard wax.', medium: 'The sharp points press a little way into the medium wax.', soft: 'The sharp points press into the soft wax and catch.'},
  cold: {hard: 'The points stay out, but water clings under the hard wax.', medium: 'The points stay out, and the water stays in small beads.', soft: 'The points press into the soft wax and catch.'},
  wet: {hard: 'One sheet of water holds the ski to the snow by suction.', medium: 'Part of the water still spreads into a sheet, so some suction remains.', soft: 'The water gathers into beads, so there is little suction.'},
});
// The close-up fills the board on the steps that are about it, and sits under the strip on the free test.
const closeBox = view => view.compact ? {x: 300, y: 308, w: 720, h: 240} : {x: 60, y: 30, w: 1200, h: 500};
const inCloseUp = (view, x, y) => { const b = closeBox(view); return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; };
function closeUp(ctx, view) {
  const {snow, wax} = view.closeup, {x, y, w, h} = closeBox(view), small = Boolean(view.compact);
  panel(ctx, x, y, w, h);
  text(ctx, small ? 'CLOSE-UP' : 'A CLOSE-UP OF THE BASE ON THE SNOW', x + 16, y + 18, {size: 15, align: 'left', colour: LABEL, weight: 800});
  const areaTop = y + 34, areaH = h * (small ? .62 : .74) - 34, skiH = areaH * .2, waxH = areaH * .16, under = areaTop + skiH + waxH, ground = areaTop + areaH;
  ctx.save(); ctx.beginPath(); ctx.rect(x + 2, areaTop, w - 4, areaH); ctx.clip();
  const back = ctx.createLinearGradient(0, areaTop, 0, areaTop + areaH); back.addColorStop(0, '#2c3b45'); back.addColorStop(1, '#3d5160');
  ctx.fillStyle = back; ctx.fillRect(x, areaTop, w, areaH);
  // The snow under the ski, sliding backwards past the base because the ski moves forward.
  const bed = ctx.createLinearGradient(0, under + areaH * .17, 0, ground); const bedTop = snow === 'wet' ? '#b9ced5' : snow === 'cold' ? '#d6e3e8' : '#e8f1f5'; bed.addColorStop(0, bedTop); bed.addColorStop(1, shade(bedTop, -.28));
  ctx.fillStyle = bed; ctx.fillRect(x, under + areaH * .17, w, ground - under);
  const spacing = small ? 60 : 74, tall = areaH * .24, press = PRESS[snow][wax] * waxH * .85, sharp = SHARP[snow], shift = (view.time * 28) % spacing;
  for (let px = x - shift; px < x + w + spacing; px += spacing) {
    const half = spacing * .36, tip = under - press, foot = under + tall;
    ctx.fillStyle = snow === 'wet' ? '#d7e6ec' : '#f7fbfd'; ctx.strokeStyle = '#6d9bb3'; ctx.lineWidth = 2;
    if (sharp === 1) { ctx.beginPath(); ctx.moveTo(px, tip); ctx.lineTo(px + half, foot); ctx.lineTo(px - half, foot); ctx.closePath(); }
    else if (sharp > 0) { ctx.beginPath(); ctx.moveTo(px - half * .3, tip + 3); ctx.quadraticCurveTo(px, tip - 3, px + half * .3, tip + 3); ctx.lineTo(px + half, foot); ctx.lineTo(px - half, foot); ctx.closePath(); }
    else { ctx.beginPath(); ctx.arc(px, under + tall * .62, half * .9, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke();
  }
  // The water between the base and the snow: one sheet, or separate beads.
  const wetShare = WET[snow][wax];
  if (wetShare > 0) {
    ctx.fillStyle = WATER;
    const film = areaH * .1;
    if (wetShare >= 1) ctx.fillRect(x, under, w, film);
    else {
      const period = small ? 80 : 96, length = period * wetShare, moved = (view.time * 28) % period;
      for (let px = x - period - moved; px < x + w + period; px += period) { ctx.beginPath(); ctx.ellipse(px + length / 2, under + film * .45, length / 2, film * .45, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // The wax over the points that press into it, and the ski over the wax.
  const layer = ctx.createLinearGradient(0, under - waxH, 0, under); layer.addColorStop(0, shade(WAX_COLOURS[wax], .3)); layer.addColorStop(.4, WAX_COLOURS[wax]); layer.addColorStop(1, shade(WAX_COLOURS[wax], -.35));
  ctx.fillStyle = layer; ctx.fillRect(x, under - waxH, w, waxH); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, under - 1.5, w, 1.2);
  if (press > 0) {
    ctx.fillStyle = '#f7fbfd'; ctx.strokeStyle = '#6d9bb3'; ctx.lineWidth = 2;
    for (let px = x - shift; px < x + w + spacing; px += spacing) { const half = spacing * .36 * press / (tall + press) * (sharp === 1 ? 1 : .8); ctx.beginPath(); ctx.moveTo(px, under - press); ctx.lineTo(px + half, under); ctx.lineTo(px - half, under); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  const body = ctx.createLinearGradient(0, areaTop, 0, areaTop + skiH); body.addColorStop(0, '#fbf6e6'); body.addColorStop(1, '#cfc7b0');
  ctx.fillStyle = body; ctx.fillRect(x, areaTop, w, skiH); ctx.fillStyle = '#9aa5ab'; ctx.fillRect(x, areaTop + skiH - 2, w, 2);
  ctx.restore();
  text(ctx, 'ski', x + 16, areaTop + skiH / 2, {size: 17, align: 'left', colour: '#1d2224', weight: 800});
  ctx.fillStyle = WAX_COLOURS[wax]; ctx.fillRect(x + 8, under - waxH + 2, 104, waxH - 4);
  text(ctx, `${WAX_NAMES[wax]} wax`, x + 16, under - waxH / 2, {size: 17, align: 'left', colour: '#fff', weight: 800});
  // The direction of travel, and the suction where water spreads.
  arrow(ctx, x + w - 160, areaTop + skiH / 2, x + w - 16, areaTop + skiH / 2, '#1d2224', 4);
  text(ctx, 'the ski moves', x + w - 172, areaTop + skiH / 2, {size: 15, align: 'right', colour: '#1d2224', weight: 800});
  if (WET[snow][wax] >= .5) for (let k = 1; k <= (WET[snow][wax] >= 1 ? 5 : 2); k++) {
    const ax = x + w * (k / (WET[snow][wax] >= 1 ? 6 : 3));
    arrow(ctx, ax, under - waxH * .6, ax, under + areaH * .08, theme.bad, 3);
  }
  wrap(ctx, CLOSE_CAPTIONS[snow][wax], x + w / 2, areaTop + areaH + (small ? 28 : 36), w - 30, {size: small ? 20 : 24, line: small ? 26 : 30, weight: 600});
}

// ---- the free test: its snow tabs (its table of results is in the strip) ----
function snowTabs(ctx, view) {
  for (const t of TABS) {
    const on = view.snowTabs.current === t.snow;
    const face = ctx.createLinearGradient(0, t.y, 0, t.y + t.h); face.addColorStop(0, on ? '#ffe08a' : '#3a444a'); face.addColorStop(1, on ? '#c9a03c' : '#161c1f');
    ctx.fillStyle = face; ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 6); ctx.fill();
    ctx.strokeStyle = on ? '#fff2c2' : '#8b959b'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(t.x + 5, t.y + 1.5, t.w - 10, 1);
    text(ctx, SNOWS[t.snow].name, t.x + t.w / 2, t.y + t.h / 2, {size: 16, colour: on ? '#1d2224' : theme.text, weight: 800});
  }
}
function drawTrays(ctx, view) {
  background(ctx, W);
  if (view.rule) ruleScene(ctx, view.ruleTins);
  if (view.magnifier) {
    thermometer(ctx, THERMO.x, THERMO.y, THERMO.h, view.celsius, true);
    text(ctx, `${Math.round(view.celsius) || 0} °C`, THERMO.x, THERMO.y + THERMO.h + 72, {size: 30, colour: theme.accent});
    ctx.save(); ctx.translate(LENS.x, LENS.y); ctx.scale(LENS.k, LENS.k); crystals(ctx, 0, 0, LENS.r, view.celsius, view.time); ctx.restore();
    if (view.glow === 'thermometer') { ctx.strokeStyle = theme.accent; ctx.globalAlpha = .55 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(THERMO.x - 32, THERMO.y - 20, 64, THERMO.h + 70, 30); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  if (view.forces) forces(ctx, view);
  view.strips.forEach((_, i) => drawStrip(ctx, view, i));
  if (view.glide) speedBox(ctx, view);
  if (view.closeup) closeUp(ctx, view);
  if (view.snowTabs) snowTabs(ctx, view);
  if (view.menu) menu(ctx, view.menu);
  // Question 3 shows no screen until the answer, because the screen is the answer.
  if (view.where) { text(ctx, '?', W / 2, 290, {size: 170, colour: theme.faint}); text(ctx, 'The ski run is about to start.', W / 2, 430, {size: 26, colour: theme.text}); }
  if (view.tins) bench(ctx, view);
}
function drawRecap(ctx, view) {
  // Each card is a little wider than the usual board's, with its drawing in the middle at the usual size.
  const w = 380, gap = 40, x0 = (W - 3 * w - 2 * gap) / 2, pad = (w - 300) / 2;
  view.ideas.forEach((idea, i) => {
    const cardX = x0 + i * (w + gap), x = cardX + pad;
    panel(ctx, cardX, 40, w, 600);
    text(ctx, String(i + 1), cardX + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'rule') ['hard', 'medium', 'soft'].forEach((wax, k) => { thermometer(ctx, x + 46 + k * 104, 120, 150, [-15, -5, 0][k], false); tinAt(ctx, x + 52 + k * 104, 360, wax, false, null, false, 0, .95); });
    if (idea.id === 'glide') {
      // How far each ski had travelled when the first ski finished, from the rule itself.
      const first = runSeconds('hard', 'powder');
      wrap(ctx, 'How far each ski had travelled when the first ski finished', cardX + w / 2, 104, w - 40, {size: 16, weight: 600});
      [['Right wax', '#9ff0b4', 'hard'], ['No wax', theme.text, null], ['Wrong wax', theme.bad, 'soft']].forEach(([label, colour, wax], r) => {
        const metres = metresAt(wax, 'powder', first);
        ctx.fillStyle = colour; ctx.fillRect(x + 30, 160 + r * 80, (300 - 60) * metres / STRIP_M, 16);
        text(ctx, `${label}, ${metres.toFixed(1)} m`, x + 30, 150 + r * 80, {size: 16, align: 'left', colour});
      });
    }
    if (idea.id === 'game') menuMini(ctx, x + 20, 200, 260);
    wrap(ctx, idea.text, cardX + w / 2, 460, w - 40, {size: 19, weight: 600});
  });
}
function menuMini(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 120, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'Today’s snow:', x + 14, y + 26, {size: 16, align: 'left', colour: LABEL});
  text(ctx, 'Cool snow, -5 °C', x + 14, y + 56, {size: 20, align: 'left'});
  ['hard', 'medium', 'soft'].forEach((wax, k) => { ctx.fillStyle = WAX_COLOURS[wax]; ctx.beginPath(); ctx.roundRect(x + 14 + k * 76, y + 78, 68, 26, 5); ctx.fill(); if (wax === 'medium') { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); } });
}

// ---- the page under the board: the stopwatches and the table of results ----
// The board draws none of these. The classroom page (classroom-ui.js) shows what strip() returns, in HTML.
export function strip(view) {
  if (view.scene !== 'trays') return null;
  const out = {readouts: [], parts: [], tables: [], hint: null};
  for (const s of view.strips) for (const l of s.lanes) {
    const faster = l.winner || l.behindM == null;
    out.readouts.push({label: view.strips.length > 1 ? `${s.name} · ${l.label}` : l.label, value: l.seconds == null ? '' : `${s1(l.seconds)}${l.winner ? '  first' : ''}`, tone: l.seconds == null || !l.done ? null : faster ? 'good' : 'bad'});
  }
  if (view.snowTabs) {
    const rows = view.rows.slice(-TABLE_ROWS).map(row => {
      const gap = row.none - row.seconds;
      return {label: `${row.name}, ${row.celsius} °C, ${WAX_NAMES[row.wax]} wax, friction ${row.friction}`, value: `acceleration ${row.acceleration.toFixed(3)} m/s², time ${row.seconds.toFixed(2)} s, ${Math.abs(gap).toFixed(2)} s ${gap > 0 ? 'faster' : 'slower'} against no wax`, tone: gap > 0 ? 'good' : 'bad'};
    });
    out.tables.push({title: 'YOUR RESULTS', rows: rows.length ? rows : [{label: 'There are no results yet. Press Space to race.', value: '', tone: 'faint'}]});
  }
  return out.readouts.length || out.tables.length ? out : null;
}
const TABLE_ROWS = 3;

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx, W); drawRecap(ctx, view); }
    else drawTrays(ctx, view);
  }, size);
}
// The answer cards' pictures: a tin, the cold-to-warm rule, and where the game says the snow.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  cardScene(ctx, w, h, {floorAt: h});
  // The workbench the tins stand on, as on the board.
  const bench = () => { const top = h - 20; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, top - 2, w, 3); timber(ctx, 0, top, w, 20); };
  if (picture.kind === 'tin') { bench(); tin(ctx, w / 2, h - 55, picture.wax, false, null, false, 0); }
  if (picture.kind === 'rule') {
    bench();
    thermometer(ctx, 40, 10, 62, -15, false);
    text(ctx, '→', 82, 48, {size: 30});
    const wax = {harder: 'hard', softer: 'soft', same: null}[picture.way];
    if (wax) tin(ctx, 150, h - 55, wax, false, null, false, 0);
    else { labelPlate(ctx, 150, 52, 92, 34, .6); text(ctx, 'any wax', 150, 52, {size: 18}); }
  }
  if (picture.kind === 'game') {
    if (picture.what === 'menu') {
      // The ski menu's line in its steel-framed panel.
      const g = ctx.createLinearGradient(0, 20, 0, 90); g.addColorStop(0, 'rgba(26,33,37,.95)'); g.addColorStop(1, 'rgba(11,15,17,.95)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(14, 20, w - 28, 70, 6); ctx.fill(); bezel(ctx, 14, 20, w - 28, 70, 6);
      text(ctx, 'Today’s snow:', 28, 42, {size: 14, align: 'left', colour: LABEL}); text(ctx, 'Cool snow, -5 °C', 28, 68, {size: 17, align: 'left'});
    }
    if (picture.what === 'skis') [0, 1].forEach(k => { ctx.save(); ctx.translate(w / 2, 40 + k * 34); ctx.scale(1.7, 1.7); const paint = k ? WAX_COLOURS.soft : WAX_COLOURS.hard; skiShape(ctx, 90, paint); ctx.fillStyle = paint; ctx.beginPath(); ctx.roundRect(-46, 3.6, 92, 3.4, 1.5); ctx.fill(); ctx.restore(); });
    if (picture.what === 'shop') {
      // A shop counter with its striped awning and sign.
      bench();
      timber(ctx, 40, 52, w - 80, 36);
      for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#d9c9a0' : theme.accent; ctx.beginPath(); ctx.moveTo(34 + k * (w - 68) / 8, 24); ctx.lineTo(34 + (k + 1) * (w - 68) / 8, 24); ctx.lineTo(40 + (k + 1) * (w - 80) / 8, 50); ctx.lineTo(40 + k * (w - 80) / 8, 50); ctx.closePath(); ctx.fill(); }
      steel(ctx, w / 2 - 36, 56, 72, 26, 4); text(ctx, 'SHOP', w / 2, 70, {size: 18, colour: '#1d2224'});
    }
  }
}
