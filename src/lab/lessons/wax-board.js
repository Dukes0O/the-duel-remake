// The Wax lesson's board (docs/board/cards/LAB-CLASSROOM-WAX.md): snow trays side on, a 50 m test strip at 10
// degrees with a stopwatch on each ski, three labelled wax tins on the workbench, the thermometer and magnifier, the
// arrows and bars of the friction sum, a close-up of the base on the snow, the results table of the free test, and the
// ski menu's line for Brian's job. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {STRIP_M, WAX_NAMES, SNOW_ORDER, s1, metresAt, runSeconds} from './wax-classroom.js';
import {SNOWS, WAXES} from '../benches/wax.js';
export {BOARD};
export const pressMovesDrag = false;

// Cold to warm: blue for hard, violet for medium, red for soft (the usual ski wax colours).
export const WAX_COLOURS = Object.freeze({hard: '#3f86d8', medium: '#9466d6', soft: '#d9573f'});
const LABEL = '#aab2ad', PLAIN = '#9aa3a8', PULL_COLOUR = '#9ff0b4', SLOW_COLOUR = '#f07a5a', LEFT_COLOUR = '#edc557', WATER = '#58b4e6';
const SLOPE = Math.tan(10 * Math.PI / 180);
const TINS = Object.freeze(WAXES.map((wax, i) => ({wax, x: 330 + i * 170, y: 600})));
// The free test's three snow tabs, along the top right of the board.
const TABS = Object.freeze(SNOW_ORDER.map((snow, i) => ({snow, x: 560 + i * 140, y: 16, w: 130, h: 34})));
const inTab = (t, x, y) => x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h;

// A strip's geometry: its top-left, its run across the board, and how far apart its lanes are.
function stripGeometry(view, i) {
  if (view.strips.length > 1) return {x: 170, y: 70 + i * 190, w: 560, lane: 40, scale: .8};
  if (view.compact) return {x: 170, y: 76, w: 560, lane: 40, scale: .8};
  return {x: 110, y: 170, w: 640, lane: 64, scale: 1};
}
const along = (g, metres) => metres / STRIP_M * g.w;
const surface = (g, laneIndex, px) => [g.x + px, g.y + px * SLOPE + laneIndex * g.lane];
const skiAt = (view, i, j) => { const g = stripGeometry(view, i), l = view.strips[i].lanes[j]; return surface(g, j, 30 * g.scale + along(g, l.metres)); };

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'trays') return null;
  if (view.snowTabs?.open) for (const t of TABS) if (inTab(t, x, y)) return {action: `snow:${t.snow}`};
  if (view.tins && view.keys['1']) for (const t of TINS) if (Math.abs(x - t.x) < 60 && Math.abs(y - t.y) < 50) return {action: view.keys[String(1 + WAXES.indexOf(t.wax))]};
  if (view.keys.Space && view.strips.length && view.strips[0].lanes.length) { const [sx, sy] = skiAt(view, 0, 0); if (Math.abs(x - sx) < 50 && Math.abs(y - sy) < 30) return {action: view.keys.Space}; }
  if (view.magnifier && view.keys['→'] && x > 90 && x < 160 && y > 140 && y < 560) return {action: y < 400 ? view.keys['→'] : view.keys['←']};
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene !== 'trays') return null;
  // A tin says only its name, because a tin's use would answer a guess or a question.
  if (view.tins) for (const t of TINS) if (Math.abs(x - t.x) < 60 && Math.abs(y - t.y) < 50) return `${WAX_NAMES[t.wax]} wax.`;
  if (view.snowTabs) for (const t of TABS) if (inTab(t, x, y)) return `${SNOWS[t.snow].name} is at ${SNOWS[t.snow].celsius} °C.`;
  if (view.closeup && inCloseUp(view, x, y)) return 'This is a close-up of the base of the ski sliding over the snow.';
  if (view.magnifier && Math.hypot(x - 640, y - 330) < 150) return 'These are snow crystals seen through the magnifier.';
  if (view.magnifier && x > 80 && x < 170 && y > 150 && y < 540) return `The thermometer reads ${Math.round(view.celsius) || 0} °C.`;
  if (view.forces && y > 60 && y < 280) return 'The green arrow shows gravity’s pull along the slope, and the red arrow shows friction’s slowing.';
  if (view.forces && y >= 300 && y < 540) return 'The red bar is subtracted from the green bar, and the gold bar is the acceleration that is left.';
  for (const [i, s] of view.strips.entries()) {
    const g = stripGeometry(view, i);
    for (const [j, l] of s.lanes.entries()) {
      const [sx, sy] = skiAt(view, i, j);
      if (Math.abs(x - sx) < 50 && Math.abs(y - sy) < 24) return l.wax ? `This ski has ${l.wax} wax on the base.` : 'This plain ski has no wax.';
    }
    if (x > g.x && x < g.x + g.w && y > g.y - 30 && y < g.y + g.w * SLOPE + g.lane * s.lanes.length + 30) return `This is ${s.name.toLowerCase()} at ${s.celsius} °C, on a test strip ${STRIP_M} m long at a slope of 10 degrees.`;
  }
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'trays') return null;
  if (action === 'pick:best' && view.best) { const t = TINS.find(t => t.wax === view.best); return [t.x, t.y - 10]; }
  if (action === 'warm:best') return [125, 300];
  if (view.strips.length && view.strips[0].lanes.length) return skiAt(view, 0, 0);
  return [BOARD.width / 2, BOARD.height / 2];
}
export function dragAngle() { return 0; }

// ---- drawing ----
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(14,20,24,.9)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
}
// An arrow from (x0, y0) to (x1, y1).
function arrow(ctx, x0, y0, x1, y1, colour, width = 5) {
  const length = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / length, uy = (y1 - y0) / length, head = Math.min(14, length * .6);
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head * .8, y1 - uy * head * .8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * head * .55, y1 - uy * head + ux * head * .55); ctx.lineTo(x1 - ux * head + uy * head * .55, y1 - uy * head - ux * head * .55); ctx.closePath(); ctx.fill();
}
function strip(ctx, view, i) {
  const s = view.strips[i], g = stripGeometry(view, i), n = Math.max(1, s.lanes.length);
  // The tray: wood under a snow surface, one lane a ski.
  for (let j = 0; j < n; j++) {
    const [x0, y0] = surface(g, j, 0), [x1, y1] = surface(g, j, g.w);
    ctx.fillStyle = '#5a4430'; ctx.beginPath(); ctx.moveTo(x0, y0 + 4); ctx.lineTo(x1, y1 + 4); ctx.lineTo(x1, y1 + 20 * g.scale); ctx.lineTo(x0, y0 + 20 * g.scale); ctx.closePath(); ctx.fill();
    const snow = s.snow === 'wet' ? '#cfdde0' : s.snow === 'cold' ? '#e6eef1' : '#f6fbfd';
    ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(x0, y0 - 2); ctx.lineTo(x1, y1 - 2); ctx.lineTo(x1, y1 + 6); ctx.lineTo(x0, y0 + 6); ctx.closePath(); ctx.fill();
    if (s.snow === 'wet') { ctx.fillStyle = 'rgba(80,140,170,.45)'; for (let k = 0; k < 14; k++) { const [px, py] = surface(g, j, 30 + k * g.w / 15); ctx.beginPath(); ctx.ellipse(px, py + 1, 6, 2, SLOPE, 0, Math.PI * 2); ctx.fill(); } }
  }
  // Start and finish lines, and the metres.
  for (const [m, label] of [[0, 'start'], [STRIP_M, `${STRIP_M} m`]]) {
    const [x, y] = surface(g, 0, 30 * g.scale + along(g, m));
    ctx.strokeStyle = m ? theme.accent : 'rgba(245,240,220,.6)'; ctx.lineWidth = 2; ctx.setLineDash(m ? [] : [5, 4]);
    ctx.beginPath(); ctx.moveTo(x, y - 42 * g.scale); ctx.lineTo(x, y + (n - 1) * g.lane + 22); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, label, x, m ? y - 52 * g.scale : y + (n - 1) * g.lane + 34, {size: 13 * g.scale + 2, colour: m ? theme.accent : LABEL});
  }
  // The snow: its name and temperature, with a small thermometer.
  const [lx, ly] = surface(g, 0, 0);
  thermometer(ctx, lx - 30, ly - 50 * g.scale, 70 * g.scale, s.celsius, false);
  text(ctx, `${s.name}, ${s.celsius} °C`, lx - 10, ly - 62 * g.scale, {size: 18 * g.scale + 2, align: 'left', colour: theme.text});
  if (view.glide) secondMarks(ctx, view, g);
  for (const [j, l] of s.lanes.entries()) ski(ctx, view, i, j, l, g);
}
// Where the ski was at the end of each second: the marks grow further apart because the ski moves faster.
function secondMarks(ctx, view, g) {
  for (const {second, metres} of view.glide.marks) {
    const [x, y] = surface(g, 0, 30 * g.scale + along(g, metres));
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 26); ctx.stroke();
    text(ctx, `${second} s`, x, y + 37, {size: 13, colour: theme.accent, weight: 800});
    if (second >= 3) text(ctx, `${metres.toFixed(1)} m`, x, y + 53, {size: 12, colour: theme.text});
  }
}
// The glide step's reading of the ski's speed, in both units, with the arrow's scale under it.
function speedBox(ctx, view) {
  const speed = view.glide.speed;
  panel(ctx, 110, 470, 640, 130);
  text(ctx, 'THE SPEED OF THE SKI NOW', 130, 492, {size: 13, align: 'left', colour: LABEL, weight: 800});
  text(ctx, `${speed.toFixed(1)} m/s`, 130, 540, {size: 40, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, `${(speed * 3.6).toFixed(0)} km/h`, 400, 540, {size: 40, align: 'left', weight: 800});
  text(ctx, 'The yellow marks show where the ski was at the end of each second.', 130, 582, {size: 15, align: 'left', colour: theme.text});
}
function ski(ctx, view, i, j, l, g) {
  const [x, y] = skiAt(view, i, j), len = 78 * g.scale, a = Math.atan(SLOPE);
  ctx.save(); ctx.translate(x, y - 4); ctx.rotate(a);
  ctx.fillStyle = l.wax ? WAX_COLOURS[l.wax] : PLAIN; ctx.beginPath(); ctx.roundRect(-len / 2, -2, len, 5, 2); ctx.fill();
  ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.roundRect(-len / 2, -9, len, 7, 3); ctx.fill();
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(len / 2 - 2, -5); ctx.quadraticCurveTo(len / 2 + 10, -6, len / 2 + 12, -16); ctx.stroke();
  ctx.fillStyle = '#2b3236'; ctx.fillRect(-8, -16, 16, 7);
  ctx.restore();
  // A finished ski's name moves clear of the finish line: beyond its stopwatch where the lanes are close together, otherwise before the line.
  const named = !l.done ? {x, y: y - 26 * g.scale, align: 'center'} : g.scale < 1 ? {x: surface(g, j, 30 * g.scale + along(g, STRIP_M) + 60 * g.scale)[0] + 108, y: surface(g, j, 30 * g.scale + along(g, STRIP_M) + 60 * g.scale)[1] - 11, align: 'left'} : {x: x - 12, y: y - 26 * g.scale, align: 'right'};
  text(ctx, l.label, named.x, named.y, {size: 13 * g.scale + 2, align: named.align, colour: l.wax ? WAX_COLOURS[l.wax] : LABEL});
  // The ski's speed as an arrow along the slope: the arrow grows as the ski speeds up.
  if (view.glide && view.glide.speed > .1) {
    const length = view.glide.speed * 8, ux = Math.cos(a), uy = Math.sin(a), ax = x + 50 * ux, ay = y - 22 + 50 * uy;
    arrow(ctx, ax, ay, ax + length * ux, ay + length * uy, theme.accent, 4);
  }
  if (l.behindM != null) {
    const [bx, by] = surface(g, j, 30 * g.scale + along(g, STRIP_M - l.behindM));
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by - 14); ctx.lineTo(bx, by + 10); ctx.stroke();
    text(ctx, `${l.behindM.toFixed(1)} m behind`, bx - 8, by + 22 * g.scale, {size: 13 * g.scale + 2, align: 'right', colour: theme.bad});
  }
  // Its stopwatch, at real seconds, by the finish.
  if (l.seconds != null) {
    const [fx, fy] = surface(g, j, 30 * g.scale + along(g, STRIP_M) + 60 * g.scale);
    ctx.fillStyle = 'rgba(10,14,15,.8)'; ctx.beginPath(); ctx.roundRect(fx - 4, fy - 24, (l.winner ? 118 : 82) * g.scale + 10, 26, 5); ctx.fill();
    text(ctx, `${s1(l.seconds)}${l.winner ? '  first' : ''}`, fx + 2, fy - 11, {size: 17 * g.scale + 2, align: 'left', colour: !l.done ? theme.text : l.winner ? '#9ff0b4' : l.behindM != null ? theme.bad : '#9ff0b4'});
  }
}
function thermometer(ctx, x, y, h, celsius, big) {
  const k = Math.max(0, Math.min(1, (celsius + 15) / 15)), w = big ? 22 : 9;
  ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, w / 2); ctx.fill();
  ctx.fillStyle = k > .8 ? '#d9573f' : k > .4 ? '#9466d6' : '#3f86d8';
  ctx.beginPath(); ctx.roundRect(x - w / 2 + 2, y + 2 + (h - 4) * (1 - k), w - 4, (h - 4) * k + 1, w / 2 - 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y + h + w * .4, w * .8, 0, Math.PI * 2); ctx.fill();
  if (big) for (const c of [0, -5, -10, -15]) { const ty = y + 2 + (h - 4) * (1 - (c + 15) / 15); ctx.strokeStyle = theme.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w / 2, ty); ctx.lineTo(x + w / 2 + 10, ty); ctx.stroke(); text(ctx, `${c} °C`, x + w / 2 + 16, ty, {size: 15, align: 'left'}); }
}
// Snow crystals: sharp six-armed stars when cold, rounding into wet grains near 0 °C.
function crystals(ctx, cx, cy, r, celsius, time) {
  const warm = Math.max(0, Math.min(1, (celsius + 15) / 15));
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = warm > .9 ? '#c9dbe2' : '#e8f1f5'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
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
  ctx.restore();
  ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = theme.brass[2]; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(cx + r * .72, cy + r * .72); ctx.lineTo(cx + r * 1.05, cy + r * 1.05); ctx.stroke();
  text(ctx, warm > .9 ? 'Rounded and wet' : warm < .2 ? 'Sharp and hard' : 'Softening', cx, cy - r - 22, {size: 18, colour: theme.text});
}
function tin(ctx, x, y, wax, picked, keyName, glow, time) {
  const w = 104, h = 70, lift = picked ? 10 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 6, w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = WAX_COLOURS[wax]; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2 - lift, w, h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - w / 2 + 6, y - h / 2 - lift + 4, w - 12, 10);
  ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 40, y - 12 - lift, 80, 26, 4); ctx.fill();
  ctx.fillStyle = '#1d2224'; ctx.font = '800 16px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(WAX_NAMES[wax].toUpperCase(), x, y + 1 - lift);
  if (keyName) keyCap(ctx, x - w / 2 + 2, y - h / 2 - lift - 2, keyName);
  if (picked) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - w / 2 - 6, y - h / 2 - lift - 6, w + 12, h + 12, 10); ctx.stroke(); }
  if (glow && !picked) { ctx.strokeStyle = theme.accent; ctx.globalAlpha = .35 + .3 * Math.sin(time * 6); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 9); ctx.stroke(); ctx.globalAlpha = 1; }
}
function bench(ctx, view) {
  ctx.fillStyle = theme.plate; ctx.fillRect(170, 640, 680, 16);
  ctx.fillStyle = theme.beamDark; ctx.fillRect(170, 652, 680, 6);
  for (const t of TINS) tin(ctx, t.x, t.y, t.wax, view.pick === t.wax, view.keys['1'] ? String(1 + WAXES.indexOf(t.wax)) : null, view.glow === 'tins', view.time);
}
// The ski menu's line, as the game shows it, on a card.
function menu(ctx, m) {
  const x = 560, y = 30, w = 420, h = m.example ? 70 : 96;
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
  text(ctx, m.example ? 'THE SKI MENU' : `THE SKI MENU · DAY ${m.day} OF ${m.of}${m.done ? ' · DONE' : ''}`, x + 18, y + 20, {size: 13, align: 'left', colour: LABEL, weight: 800});
  text(ctx, m.line, x + 18, y + 50, {size: 21, align: 'left', colour: theme.text});
  if (!m.example) text(ctx, 'Hard wax · Medium wax · Soft wax', x + 18, y + 78, {size: 14, align: 'left', colour: LABEL});
}
function ruleScene(ctx, tins) {
  // Three snows, cold to warm; once answered, each over the wax that suits it.
  [['powder', 'hard'], ['cold', 'medium'], ['wet', 'soft']].forEach(([snow, wax], i) => {
    const x = 260 + i * 240;
    thermometer(ctx, x - 60, 150, 220, SNOWS[snow].celsius, true);
    text(ctx, `${SNOWS[snow].name}`, x + 20, 420, {size: 18});
    if (tins) tin(ctx, x + 20, 500, wax, false, null, false, 0);
  });
}

// ---- the friction sum: the two arrows on the slope, then the same numbers as bars ----
const ARROW_SCALE = 150, BAR_SCALE = 300, BAR_X = 260;
function forces(ctx, view) {
  const f = view.forces, x0 = 90, y0 = 112, length = 660, ux = Math.cos(Math.atan(SLOPE)), uy = Math.sin(Math.atan(SLOPE));
  const what = f.wax ? `${WAX_NAMES[f.wax]} wax` : 'No wax';
  text(ctx, `${what} on ${SNOWS[f.snow].name.toLowerCase()}, friction number ${f.friction}`, 60, 46, {size: 24, align: 'left', colour: theme.accent, weight: 800});
  ctx.fillStyle = '#5a4430'; ctx.beginPath(); ctx.moveTo(x0, y0 + 6); ctx.lineTo(x0 + length, y0 + length * SLOPE + 6); ctx.lineTo(x0 + length, y0 + length * SLOPE + 32); ctx.lineTo(x0, y0 + 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6fbfd'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + length, y0 + length * SLOPE); ctx.lineTo(x0 + length, y0 + length * SLOPE + 8); ctx.lineTo(x0, y0 + 8); ctx.closePath(); ctx.fill();
  // The ski in the middle of the slope.
  const sx = x0 + 280, sy = y0 + 280 * SLOPE;
  ctx.save(); ctx.translate(sx, sy - 4); ctx.rotate(Math.atan(SLOPE));
  ctx.fillStyle = f.wax ? WAX_COLOURS[f.wax] : PLAIN; ctx.beginPath(); ctx.roundRect(-70, -2, 140, 6, 2); ctx.fill();
  ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.roundRect(-70, -11, 140, 9, 3); ctx.fill();
  ctx.fillStyle = '#2b3236'; ctx.fillRect(-12, -20, 24, 9);
  ctx.restore();
  // Gravity's pull down the slope, friction's slowing up the slope, to one scale.
  const ay = sy - 36, pull = f.pull * ARROW_SCALE, slow = f.slowing * ARROW_SCALE;
  arrow(ctx, sx, ay, sx + pull * ux, ay + pull * uy, PULL_COLOUR, 6);
  arrow(ctx, sx, ay, sx - slow * ux, ay - slow * uy, SLOW_COLOUR, 6);
  text(ctx, 'gravity’s pull', sx + pull * ux + 12, ay + pull * uy - 14, {size: 17, align: 'left', colour: PULL_COLOUR, weight: 800});
  text(ctx, 'friction', sx - slow * ux - 10, ay - slow * uy - 8, {size: 17, align: 'right', colour: SLOW_COLOUR, weight: 800});
  // The same numbers as bars, with the slowing cut off the end of the pull.
  panel(ctx, 40, 296, 920, 240);
  text(ctx, 'THE PULL, THE SLOWING AND WHAT IS LEFT', 60, 318, {size: 13, align: 'left', colour: LABEL, weight: 800});
  const row = (y, label, from, value, colour) => {
    text(ctx, label, 60, y + 18, {size: 18, align: 'left', colour});
    ctx.fillStyle = colour; ctx.fillRect(BAR_X + from * BAR_SCALE, y, value * BAR_SCALE, 36);
    text(ctx, `${value.toFixed(3)} m/s²`, BAR_X + f.pull * BAR_SCALE + 16, y + 18, {size: 20, align: 'left', colour, weight: 800});
  };
  row(340, 'Gravity’s pull', 0, f.pull, PULL_COLOUR);
  row(400, 'Friction’s slowing', f.acceleration, f.slowing, SLOW_COLOUR);
  row(460, 'Acceleration left', 0, f.acceleration, LEFT_COLOUR);
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
const closeBox = view => view.compact ? {x: 690, y: 246, w: 280, h: 290} : {x: 60, y: 30, w: 880, h: 500};
const inCloseUp = (view, x, y) => { const b = closeBox(view); return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; };
function closeUp(ctx, view) {
  const {snow, wax} = view.closeup, {x, y, w, h} = closeBox(view), small = w < 400;
  panel(ctx, x, y, w, h);
  text(ctx, small ? 'CLOSE-UP' : 'A CLOSE-UP OF THE BASE ON THE SNOW', x + 16, y + 18, {size: 13, align: 'left', colour: LABEL, weight: 800});
  const areaTop = y + 34, areaH = h * (small ? .62 : .74) - 34, skiH = areaH * .2, waxH = areaH * .16, under = areaTop + skiH + waxH, ground = areaTop + areaH;
  ctx.save(); ctx.beginPath(); ctx.rect(x + 2, areaTop, w - 4, areaH); ctx.clip();
  ctx.fillStyle = '#33434d'; ctx.fillRect(x, areaTop, w, areaH);
  // The snow under the ski, sliding backwards past the base because the ski moves forward.
  ctx.fillStyle = snow === 'wet' ? '#b9ced5' : snow === 'cold' ? '#d6e3e8' : '#e8f1f5'; ctx.fillRect(x, under + areaH * .17, w, ground - under);
  const spacing = small ? 46 : 74, tall = areaH * .24, press = PRESS[snow][wax] * waxH * .85, sharp = SHARP[snow], shift = (view.time * 28) % spacing;
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
      const period = small ? 60 : 96, length = period * wetShare, moved = (view.time * 28) % period;
      for (let px = x - period - moved; px < x + w + period; px += period) { ctx.beginPath(); ctx.ellipse(px + length / 2, under + film * .45, length / 2, film * .45, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // The wax over the points that press into it, and the ski over the wax.
  ctx.fillStyle = WAX_COLOURS[wax]; ctx.fillRect(x, under - waxH, w, waxH);
  if (press > 0) {
    ctx.fillStyle = '#f7fbfd'; ctx.strokeStyle = '#6d9bb3'; ctx.lineWidth = 2;
    for (let px = x - shift; px < x + w + spacing; px += spacing) { const half = spacing * .36 * press / (tall + press) * (sharp === 1 ? 1 : .8); ctx.beginPath(); ctx.moveTo(px, under - press); ctx.lineTo(px + half, under); ctx.lineTo(px - half, under); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x, areaTop, w, skiH);
  ctx.restore();
  const labelSize = small ? 13 : 17;
  text(ctx, 'ski', x + 16, areaTop + skiH / 2, {size: labelSize, align: 'left', colour: '#1d2224', weight: 800});
  ctx.fillStyle = WAX_COLOURS[wax]; ctx.fillRect(x + 8, under - waxH + 2, small ? 74 : 104, waxH - 4);
  text(ctx, `${WAX_NAMES[wax]} wax`, x + 16, under - waxH / 2, {size: labelSize, align: 'left', colour: '#fff', weight: 800});
  // The direction of travel, and the suction where water spreads.
  arrow(ctx, x + w - (small ? 90 : 160), areaTop + skiH / 2, x + w - 16, areaTop + skiH / 2, '#1d2224', 4);
  if (!small) text(ctx, 'the ski moves', x + w - 172, areaTop + skiH / 2, {size: 15, align: 'right', colour: '#1d2224', weight: 800});
  if (WET[snow][wax] >= .5) for (let k = 1; k <= (WET[snow][wax] >= 1 ? 5 : 2); k++) {
    const ax = x + w * (k / (WET[snow][wax] >= 1 ? 6 : 3));
    arrow(ctx, ax, under - waxH * .6, ax, under + areaH * .08, theme.bad, 3);
  }
  wrap(ctx, CLOSE_CAPTIONS[snow][wax], x + w / 2, areaTop + areaH + (small ? 22 : 36), w - 30, {size: small ? 15 : 24, weight: 600});
}

// ---- the free test: its snow tabs and the table of results ----
function snowTabs(ctx, view) {
  for (const t of TABS) {
    const on = view.snowTabs.current === t.snow;
    ctx.fillStyle = on ? theme.accent : 'rgba(14,20,24,.9)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 6); ctx.fill(); ctx.stroke();
    text(ctx, SNOWS[t.snow].name, t.x + t.w / 2, t.y + t.h / 2, {size: 15, colour: on ? '#1d2224' : theme.text, weight: 800});
  }
}
function resultsTable(ctx, view) {
  const x = 30, y = 246, w = 650, h = 290;
  panel(ctx, x, y, w, h);
  text(ctx, 'YOUR RESULTS', x + 14, y + 16, {size: 13, align: 'left', colour: LABEL, weight: 800});
  const columns = [[x + 14, 'Snow', 'left'], [x + 186, 'Wax', 'left'], [x + 322, 'Friction', 'right'], [x + 442, 'Acceleration', 'right'], [x + 512, 'Time', 'right'], [x + 636, 'Against no wax', 'right']];
  for (const [cx, label, align] of columns) text(ctx, label, cx, y + 40, {size: 13, align, colour: LABEL, weight: 800});
  if (!view.rows.length) text(ctx, 'There are no results yet. Press Space to race.', x + w / 2, y + 130, {size: 18, colour: LABEL});
  view.rows.slice(-6).forEach((row, i) => {
    const ry = y + 70 + i * 36, gap = row.none - row.seconds, faster = gap > 0, colour = faster ? '#9ff0b4' : theme.bad;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(x + 8, ry - 16, w - 16, 32);
    text(ctx, `${row.name}, ${row.celsius} °C`, x + 14, ry, {size: 14, align: 'left'});
    text(ctx, WAX_NAMES[row.wax], x + 186, ry, {size: 16, align: 'left', colour: WAX_COLOURS[row.wax], weight: 800});
    text(ctx, String(row.friction), x + 322, ry, {size: 16, align: 'right'});
    text(ctx, `${row.acceleration.toFixed(3)} m/s²`, x + 442, ry, {size: 15, align: 'right'});
    text(ctx, `${row.seconds.toFixed(2)} s`, x + 512, ry, {size: 16, align: 'right', weight: 800});
    text(ctx, `${Math.abs(gap).toFixed(2)} s ${faster ? 'faster' : 'slower'}`, x + 636, ry, {size: 15, align: 'right', colour});
  });
}
function drawTrays(ctx, view) {
  background(ctx);
  if (view.rule) ruleScene(ctx, view.ruleTins);
  if (view.magnifier) {
    thermometer(ctx, 125, 160, 340, view.celsius, true);
    text(ctx, `${Math.round(view.celsius) || 0} °C`, 125, 560, {size: 28, colour: theme.accent});
    crystals(ctx, 640, 330, 150, view.celsius, view.time);
    if (view.glow === 'thermometer') { ctx.strokeStyle = theme.accent; ctx.globalAlpha = .55 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(95, 140, 60, 400, 30); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  if (view.forces) forces(ctx, view);
  view.strips.forEach((_, i) => strip(ctx, view, i));
  if (view.glide) speedBox(ctx, view);
  if (view.closeup) closeUp(ctx, view);
  if (view.snowTabs) { snowTabs(ctx, view); resultsTable(ctx, view); }
  if (view.menu) menu(ctx, view.menu);
  // Question 3 shows no screen until the answer, because the screen is the answer.
  if (view.where) { text(ctx, '?', 500, 300, {size: 150, colour: theme.faint}); text(ctx, 'The ski run is about to start.', 500, 430, {size: 22, colour: theme.text}); }
  if (view.tins) bench(ctx, view);
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'rule') ['hard', 'medium', 'soft'].forEach((wax, k) => { thermometer(ctx, x + 50 + k * 90, 120, 150, [-15, -5, 0][k], false); ctx.save(); ctx.translate(x + 60 + k * 90, 360); ctx.scale(.78, .78); tin(ctx, 0, 0, wax, false, null, false, 0); ctx.restore(); });
    if (idea.id === 'glide') {
      // How far each ski had travelled when the first ski finished, from the rule itself.
      const first = runSeconds('hard', 'powder');
      wrap(ctx, 'How far each ski had travelled when the first ski finished', x + w / 2, 104, w - 40, {size: 15, weight: 600});
      [['Right wax', '#9ff0b4', 'hard'], ['No wax', theme.text, null], ['Wrong wax', theme.bad, 'soft']].forEach(([label, colour, wax], r) => {
        const metres = metresAt(wax, 'powder', first);
        ctx.fillStyle = colour; ctx.fillRect(x + 30, 160 + r * 80, (w - 60) * metres / STRIP_M, 16);
        text(ctx, `${label}, ${metres.toFixed(1)} m`, x + 30, 150 + r * 80, {size: 15, align: 'left', colour});
      });
    }
    if (idea.id === 'game') menuMini(ctx, x + 20, 200, w - 40);
    wrap(ctx, idea.text, x + w / 2, 460, w - 30, {size: 19, weight: 600});
  });
}
function menuMini(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 120, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'Today’s snow:', x + 14, y + 26, {size: 16, align: 'left', colour: LABEL});
  text(ctx, 'Cool snow, -5 °C', x + 14, y + 56, {size: 20, align: 'left'});
  ['hard', 'medium', 'soft'].forEach((wax, k) => { ctx.fillStyle = WAX_COLOURS[wax]; ctx.beginPath(); ctx.roundRect(x + 14 + k * 76, y + 78, 68, 26, 5); ctx.fill(); if (wax === 'medium') { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); } });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawTrays(ctx, view);
  });
}
// The answer cards' pictures: a tin, the cold-to-warm rule, and where the game says the snow.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'tin') tin(ctx, w / 2, h / 2 + 4, picture.wax, false, null, false, 0);
  if (picture.kind === 'rule') {
    thermometer(ctx, 40, 14, 66, -15, false);
    text(ctx, '→', 82, 52, {size: 26});
    const wax = {harder: 'hard', softer: 'soft', same: null}[picture.way];
    if (wax) tin(ctx, 150, 56, wax, false, null, false, 0);
    else text(ctx, 'any wax', 150, 56, {size: 18});
  }
  if (picture.kind === 'game') {
    if (picture.what === 'menu') { ctx.fillStyle = 'rgba(14,20,24,.95)'; ctx.fillRect(14, 22, w - 28, 66); text(ctx, 'Today’s snow:', 24, 40, {size: 14, align: 'left', colour: theme.faint}); text(ctx, 'Cool snow, -5 °C', 24, 66, {size: 17, align: 'left'}); }
    if (picture.what === 'skis') [0, 1].forEach(k => { ctx.fillStyle = k ? WAX_COLOURS.soft : WAX_COLOURS.hard; ctx.beginPath(); ctx.roundRect(30, 38 + k * 26, w - 60, 10, 4); ctx.fill(); });
    if (picture.what === 'shop') { ctx.fillStyle = '#5a4430'; ctx.fillRect(60, 40, w - 120, 50); ctx.fillStyle = theme.accent; ctx.fillRect(50, 26, w - 100, 18); text(ctx, 'SHOP', w / 2, 66, {size: 18}); }
  }
}
