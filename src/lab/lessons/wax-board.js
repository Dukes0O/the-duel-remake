// The Wax lesson's board (docs/board/cards/LAB-CLASSROOM-WAX.md): snow trays side on, a 50 m test strip at 10
// degrees with a stopwatch on each ski, three labelled wax tins on the bench, the thermometer and magnifier, and the
// ski menu's line for Brian's job. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {STRIP_M, WAX_NAMES, s1} from './wax-classroom.js';
import {SNOWS, WAXES} from '../benches/wax.js';
export {BOARD};
export const pressMovesDrag = false;

// Cold to warm: blue for hard, violet for medium, red for soft (the usual ski wax colours).
export const WAX_COLOURS = Object.freeze({hard: '#3f86d8', medium: '#9466d6', soft: '#d9573f'});
const PLAIN = '#9aa3a8';
const SLOPE = Math.tan(10 * Math.PI / 180);
const TINS = Object.freeze(WAXES.map((wax, i) => ({wax, x: 330 + i * 170, y: 600})));

// A strip's geometry: its top-left, its run across the board, and how far apart its lanes are.
function stripGeometry(view, i) {
  if (view.strips.length > 1) return {x: 170, y: 70 + i * 190, w: 560, lane: 40, scale: .8};
  return {x: 110, y: 170, w: 640, lane: 64, scale: 1};
}
const along = (g, metres) => metres / STRIP_M * g.w;
const surface = (g, laneIndex, px) => [g.x + px, g.y + px * SLOPE + laneIndex * g.lane];
const skiAt = (view, i, j) => { const g = stripGeometry(view, i), l = view.strips[i].lanes[j]; return surface(g, j, 30 * g.scale + along(g, l.metres)); };

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'trays') return null;
  if (view.tins && view.keys['1']) for (const t of TINS) if (Math.abs(x - t.x) < 60 && Math.abs(y - t.y) < 50) return {action: view.keys[String(1 + WAXES.indexOf(t.wax))]};
  if (view.keys.Space && view.strips.length) { const [sx, sy] = skiAt(view, 0, 0); if (Math.abs(x - sx) < 50 && Math.abs(y - sy) < 30) return {action: view.keys.Space}; }
  return null;
}
export function hoverInfo(view, x, y) {
  if (view.scene !== 'trays') return null;
  if (view.tins) for (const t of TINS) if (Math.abs(x - t.x) < 60 && Math.abs(y - t.y) < 50) return `${WAX_NAMES[t.wax]} wax${t.wax === 'hard' ? ': for very cold snow' : t.wax === 'soft' ? ': for wet snow near 0 °C' : ': for cool snow'}.`;
  if (view.magnifier && Math.hypot(x - 640, y - 330) < 150) return 'Snow crystals through the magnifier.';
  if (view.magnifier && x > 80 && x < 170 && y > 150 && y < 540) return `The thermometer: ${Math.round(view.celsius)} °C.`;
  for (const [i, s] of view.strips.entries()) {
    const g = stripGeometry(view, i);
    for (const [j, l] of s.lanes.entries()) {
      const [sx, sy] = skiAt(view, i, j);
      if (Math.abs(x - sx) < 50 && Math.abs(y - sy) < 24) return l.wax ? `A ski with ${l.wax} wax on its base.` : 'A plain ski: no wax.';
    }
    if (x > g.x && x < g.x + g.w && y > g.y - 30 && y < g.y + g.w * SLOPE + g.lane * s.lanes.length) return `${s.name} at ${s.celsius} °C: a ${STRIP_M} m test strip at 10 degrees.`;
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
    ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y + (n - 1) * g.lane + 22); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, label, x, y - 36, {size: 13 * g.scale + 2, colour: m ? theme.accent : theme.faint});
  }
  // The snow: its name and temperature, with a small thermometer.
  const [lx, ly] = surface(g, 0, 0);
  thermometer(ctx, lx - 30, ly - 50 * g.scale, 70 * g.scale, s.celsius, false);
  text(ctx, `${s.name}, ${s.celsius} °C`, lx - 10, ly - 62 * g.scale, {size: 18 * g.scale + 2, align: 'left', colour: theme.text});
  for (const [j, l] of s.lanes.entries()) ski(ctx, view, i, j, l, g);
}
function ski(ctx, view, i, j, l, g) {
  const [x, y] = skiAt(view, i, j), len = 78 * g.scale, a = Math.atan(SLOPE);
  ctx.save(); ctx.translate(x, y - 4); ctx.rotate(a);
  ctx.fillStyle = l.wax ? WAX_COLOURS[l.wax] : PLAIN; ctx.beginPath(); ctx.roundRect(-len / 2, -2, len, 5, 2); ctx.fill();
  ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.roundRect(-len / 2, -9, len, 7, 3); ctx.fill();
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(len / 2 - 2, -5); ctx.quadraticCurveTo(len / 2 + 10, -6, len / 2 + 12, -16); ctx.stroke();
  ctx.fillStyle = '#2b3236'; ctx.fillRect(-8, -16, 16, 7);
  ctx.restore();
  text(ctx, l.label, x - len / 2 - 6, y - 22, {size: 13 * g.scale + 1, align: 'right', colour: l.wax ? WAX_COLOURS[l.wax] : theme.faint});
  // Its stopwatch, at real seconds, by the finish.
  if (l.seconds != null) {
    const [fx, fy] = surface(g, j, 30 * g.scale + along(g, STRIP_M) + 60 * g.scale);
    ctx.fillStyle = 'rgba(10,14,15,.8)'; ctx.beginPath(); ctx.roundRect(fx - 4, fy - 24, 82 * g.scale + 10, 26, 5); ctx.fill();
    text(ctx, s1(l.seconds), fx + 2, fy - 11, {size: 17 * g.scale + 2, align: 'left', colour: l.done ? '#9ff0b4' : theme.text});
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
  text(ctx, warm >= 1 ? 'Rounded and wet' : warm < .2 ? 'Sharp and hard' : 'Softening', cx, cy - r - 22, {size: 18, colour: theme.text});
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
  text(ctx, m.example ? 'THE SKI MENU' : `THE SKI MENU · DAY ${m.day} OF ${m.of}${m.done ? ' · DONE' : ''}`, x + 18, y + 20, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, m.line, x + 18, y + 50, {size: 21, align: 'left', colour: theme.text});
  if (!m.example) text(ctx, 'Hard wax · Medium wax · Soft wax', x + 18, y + 78, {size: 14, align: 'left', colour: theme.faint});
}
function table(ctx, rows) {
  const x = 800, y = 110;
  text(ctx, 'Right wax · wrong wax', x + 90, y - 20, {size: 14, colour: theme.faint});
  rows.forEach((r, i) => {
    const ry = y + 34 + i * 190;
    text(ctx, r.right, x, ry, {size: 17, align: 'left', colour: '#9ff0b4'});
    text(ctx, r.wrong, x, ry + 26, {size: 17, align: 'left', colour: theme.bad});
  });
}
function ruleScene(ctx) {
  // Three snows, cold to warm, each over the wax that suits it.
  [['powder', 'hard'], ['cold', 'medium'], ['wet', 'soft']].forEach(([snow, wax], i) => {
    const x = 260 + i * 240;
    thermometer(ctx, x - 60, 150, 220, SNOWS[snow].celsius, true);
    text(ctx, `${SNOWS[snow].name}`, x + 20, 420, {size: 18});
    tin(ctx, x + 20, 500, wax, false, null, false, 0);
  });
}
function drawTrays(ctx, view) {
  background(ctx);
  if (view.rule) ruleScene(ctx);
  if (view.magnifier) {
    thermometer(ctx, 125, 160, 340, view.celsius, true);
    text(ctx, `${Math.round(view.celsius)} °C`, 125, 560, {size: 28, colour: theme.accent});
    crystals(ctx, 640, 330, 150, view.celsius, view.time);
    if (view.glow === 'thermometer') { ctx.strokeStyle = theme.accent; ctx.globalAlpha = .55 + .35 * Math.sin(view.time * 6); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(95, 140, 60, 400, 30); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  view.strips.forEach((_, i) => strip(ctx, view, i));
  if (view.table) table(ctx, view.table);
  if (view.menu) menu(ctx, view.menu);
  if (view.tins) bench(ctx, view);
}
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'rule') ['hard', 'medium', 'soft'].forEach((wax, k) => { thermometer(ctx, x + 50 + k * 90, 120, 150, [-15, -5, 0][k], false); tin(ctx, x + 60 + k * 90, 360, wax, false, null, false, 0); });
    if (idea.id === 'glide') [['Right wax', '#9ff0b4', 1], ['No wax', theme.text, .82], ['Wrong wax', theme.bad, .62]].forEach(([label, colour, k], r) => {
      ctx.fillStyle = colour; ctx.fillRect(x + 30, 160 + r * 80, (w - 60) * k, 16); text(ctx, label, x + 30, 150 + r * 80, {size: 15, align: 'left', colour});
    });
    if (idea.id === 'game') menuMini(ctx, x + 20, 200, w - 40);
    wrap(ctx, idea.text, x + w / 2, 500, w - 30);
  });
}
function menuMini(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(14,20,24,.92)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 120, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'Today’s snow:', x + 14, y + 26, {size: 16, align: 'left', colour: theme.faint});
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
