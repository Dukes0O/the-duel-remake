// The Rust lesson's board (docs/board/cards/LAB-CLASSROOM-RUST.md): Brian's shelf of glass jars, a steel nail in each,
// a wall calendar counting the days; the day dial and the protection switch; and below, a close-up, the results table or
// Brian's job card. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {PROTECTION_NAME, pct, jarOf} from './rust-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const RUST = '#c4622d', RUST_DARK = '#8a3d1a', STEEL = '#aab3b8', ZINC = '#cfd9df', WATER = 'rgba(96,160,205,.38)', GREEN = '#9ff0b4';
const SHELF = Object.freeze({x: 30, y: 30, w: 560, h: 330, plank: 300});
const CAL = Object.freeze({x: 50, y: 52, w: 120, h: 108});
const DIAL = Object.freeze({x: 610, y: 40, w: 350, h: 120, down: [690, 128], up: [880, 128]});
const SWITCH = Object.freeze({x: 610, y: 176, w: 350, h: 160, bare: [700, 262], zinc: [870, 262]});
const LOW = Object.freeze({x: 40, y: 376, w: 920, h: 284});
const scene = view => view.scene === 'shelf';
const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
const calCentre = [CAL.x + CAL.w / 2, CAL.y + CAL.h / 2];
// Jar centres: up to four along the shelf, right of the calendar.
const jarX = (i, n, wide = false) => wide ? 560 + (i - (n - 1) / 2) * 170 : 380 + (i - (n - 1) / 2) * 104;
const wideOf = view => !view.dial && !view.switch;

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!scene(view)) return null;
  if (view.keys['↑'] === 'days:up') {
    if (inBox(x, y, DIAL.up, 130, 44)) return {action: 'days:up'};
    if (inBox(x, y, DIAL.down, 130, 44)) return {action: 'days:down'};
  }
  if (view.keys['→'] === 'coat:zinc') {
    if (inBox(x, y, SWITCH.bare, 150, 110)) return {action: 'coat:bare'};
    if (inBox(x, y, SWITCH.zinc, 150, 110)) return {action: 'coat:zinc'};
  }
  if (view.keys.Space === 'go' && (inRect(x, y, CAL) || inRect(x, y, {x: 200, y: 140, w: wideOf(view) ? 760 : 390, h: 170}))) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!scene(view)) return null;
  if (view.dial && inRect(x, y, DIAL)) return view.dial.locked ? 'The day dial: set for this run.' : 'The day dial: how many days the nail sits in its jar.';
  if (view.switch && inRect(x, y, SWITCH)) return view.switch.locked ? 'The protection: set for this run.' : 'The protection: bare steel, or a zinc coat.';
  if (inRect(x, y, CAL)) return 'The calendar: it counts the days as they run.';
  const n = view.shelf.length;
  for (const [i, jar] of view.shelf.entries()) if (Math.abs(x - jarX(i, n, wideOf(view))) < 44 && y > 140 && y < 350) return `${jar.name}: ${pct(jar.rust)} rust${jar.left === null ? '' : `, ${pct(jar.left)} of the zinc coat left`}.`;
  if (y > LOW.y && x < LOW.x + LOW.w) return view.job ? 'Brian’s job: the thing to protect, where it lives, and your runs.' : 'The results: each nail, its days and its rust.';
  return null;
}
export function targetPoint(view, action) {
  if (!scene(view)) return null;
  if (action === 'set:best' && view.best) {
    if (view.dial && !view.dial.locked && view.dial.days !== view.best.days) return view.dial.days < view.best.days ? DIAL.up : DIAL.down;
    if (view.switch && !view.switch.locked && view.switch.coat !== view.best.coat) return SWITCH[view.best.coat];
  }
  if (action === 'days:up') return DIAL.up;
  if (action === 'days:down') return DIAL.down;
  if (action === 'coat:bare') return SWITCH.bare;
  if (action === 'coat:zinc') return SWITCH.zinc;
  if (action === 'go') return calCentre;
  return [jarX(0, Math.max(1, view.shelf.length), wideOf(view)), 230];
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
function button(ctx, [x, y], label, key, can) {
  ctx.globalAlpha = can ? 1 : .35;
  ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 60, y - 18, 120, 36, 6); ctx.fill();
  text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 40, y, key);
  ctx.globalAlpha = 1;
}
// A steel nail standing up, `len` long from its head at (x, y). Rust covers `rust` of it in fixed patches from the tip up;
// a zinc coat is a pale skin, thinner as `coat` (the share left) falls.
export function nail(ctx, x, y, len, {rust = 0, coat = null, width = 8} = {}) {
  const w = width;
  ctx.fillStyle = STEEL; ctx.fillRect(x - w / 2, y, w, len - w);
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + len - w); ctx.lineTo(x, y + len); ctx.lineTo(x + w / 2, y + len - w); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - w * 1.3, y - w * .5, w * 2.6, w * .7);
  if (coat !== null && coat > 0) {
    ctx.strokeStyle = ZINC; ctx.lineWidth = 1 + coat * 4; ctx.globalAlpha = .9;
    ctx.strokeRect(x - w / 2 - ctx.lineWidth / 2, y, w + ctx.lineWidth, len - w); ctx.globalAlpha = 1;
  }
  if (rust > 0) {
    // A crust from the tip upward over the rusted share, rough at its edge, with fixed flakes so it does not flicker.
    const span = (len - w) * Math.min(1, rust), bottom = y + len - w;
    ctx.fillStyle = RUST;
    ctx.beginPath(); ctx.moveTo(x - w * .7, bottom); ctx.lineTo(x, y + len - w * .3); ctx.lineTo(x + w * .7, bottom);
    for (let k = 0; k <= 8; k++) ctx.lineTo(x + w * (.62 + (k % 2) * .14), bottom - span * k / 8);
    for (let k = 8; k >= 0; k--) ctx.lineTo(x - w * (.62 + ((k + 1) % 2) * .14), bottom - span * k / 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = RUST_DARK;
    for (let k = 0; k < Math.max(1, Math.round(span / (w * 1.6))); k++) {
      const py = bottom - (k + .5) * w * 1.6, side = k % 2 ? 1 : -1;
      if (py < bottom - span) break;
      ctx.beginPath(); ctx.ellipse(x + side * w * .3, py, w * .32, w * .22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}
// Short lines of small text, broken between words, for the jars' names.
function smallLines(ctx, value, x, y, perLine) {
  const lines = [];
  for (const word of value.split(' ')) { const lineNow = lines.at(-1); if (lineNow && (lineNow + ' ' + word).length <= perLine) lines[lines.length - 1] = lineNow + ' ' + word; else lines.push(word); }
  lines.forEach((line, i) => text(ctx, line, x, y + i * 15, {size: 13}));
}
function jar(ctx, cx, row, view) {
  const top = 150, bottom = SHELF.plank - 4, wet = jarOf(row.jar)?.water, salty = jarOf(row.jar)?.salt;
  // Glass, water and salt.
  if (wet) { ctx.fillStyle = WATER; ctx.fillRect(cx - 36, top + 46, 72, bottom - top - 46); }
  if (salty) { ctx.fillStyle = 'rgba(245,245,240,.85)'; for (let k = 0; k < 9; k++) ctx.fillRect(cx - 30 + (k * 23) % 60, bottom - 6 - (k % 3) * 3, 4, 4); }
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(cx - 38, top, 76, bottom - top, 8); ctx.stroke();
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(cx - 40, top - 8, 80, 9);
  nail(ctx, cx, top + 20, bottom - top - 34, {rust: row.rust, coat: row.coat === 'zinc' ? row.left : null});
  // Its name and reading under the shelf.
  smallLines(ctx, row.name, cx, SHELF.plank + 20, 15);
  text(ctx, `rust ${pct(row.rust)}`, cx, top - 34, {size: 16, colour: row.rust > .1 ? RUST : GREEN, weight: 800});
  if (row.left !== null && row.coat === 'zinc') text(ctx, `coat ${pct(row.left)}`, cx, top - 16, {size: 13, colour: ZINC});
}
function calendar(ctx, view) {
  const {x, y, w, h} = CAL, d = Math.floor(view.day + 1e-9);
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = theme.bad; ctx.fillRect(x, y, w, 26);
  ctx.fillStyle = '#fff'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', x + w / 2, y + 13);
  ctx.fillStyle = '#1d2224'; ctx.font = '800 46px "Segoe UI", sans-serif'; ctx.fillText(String(d), x + w / 2, y + 62);
  ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.fillText(view.dayTo ? `of ${view.dayTo}` : 'not started', x + w / 2, y + 94);
  if (view.keys.Space === 'go') { keyCap(ctx, x + 14, y + h + 18, 'Sp'); text(ctx, 'runs the days', x + 30, y + h + 18, {size: 13, align: 'left'}); }
}
function shelfScene(ctx, view) {
  const {x, y, h, plank} = SHELF, wide = wideOf(view), w = wide ? 930 : SHELF.w, end = x + w - 8;
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6b4f33'; ctx.fillRect(196, plank, end - 200, 10); ctx.fillStyle = theme.iron[2]; ctx.fillRect(210, plank + 10, 8, 40); ctx.fillRect(end - 26, plank + 10, 8, 40);
  calendar(ctx, view);
  const n = view.shelf.length;
  view.shelf.forEach((row, i) => jar(ctx, jarX(i, n, wide), row, view));
  if (view.focus === 'shelf' && n) glowBox(ctx, view, jarX(0, n, wide) - 56, 100, jarX(n - 1, n, wide) - jarX(0, n, wide) + 112, 254);
}
function dialPanel(ctx, view) {
  const d = view.dial, can = view.keys['↑'] === 'days:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'DAY DIAL', DIAL.x + 16, DIAL.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, `${d.days} ${d.days === 1 ? 'day' : 'days'}`, DIAL.x + DIAL.w / 2, DIAL.y + 56, {size: 32, weight: 800});
  button(ctx, DIAL.down, 'Fewer', '↓', can); button(ctx, DIAL.up, 'More', '↑', can);
  if (d.locked) text(ctx, 'set', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: theme.faint});
}
function switchPanel(ctx, view) {
  const s = view.switch, can = view.keys['→'] === 'coat:zinc';
  panel(ctx, SWITCH.x, SWITCH.y, SWITCH.w, SWITCH.h);
  text(ctx, 'PROTECTION', SWITCH.x + 16, SWITCH.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  for (const [coat, key] of [['bare', '←'], ['zinc', '→']]) {
    const [cx, cy] = SWITCH[coat], on = s.coat === coat;
    ctx.globalAlpha = can || on ? 1 : .4;
    ctx.fillStyle = on ? 'rgba(237,197,87,.16)' : '#232a2e'; ctx.strokeStyle = on ? theme.accent : theme.beamDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 70, cy - 52, 140, 104, 8); ctx.fill(); ctx.stroke();
    nail(ctx, cx - 36, cy - 36, 70, {coat: coat === 'zinc' ? 1 : null, width: 7});
    text(ctx, PROTECTION_NAME[coat], cx + 16, cy - 6, {size: 16, colour: on ? theme.accent : theme.text});
    keyCap(ctx, cx + 16, cy + 26, key);
    ctx.globalAlpha = 1;
  }
}

// ---- the lower half ----
function table(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE NAILS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cols = [[80, 'Jar', 'left'], [420, 'Days', 'right'], [620, 'Rust', 'right'], [880, 'Zinc coat left', 'right']];
  for (const [x, label, align] of cols) text(ctx, label, x, LOW.y + 48, {size: 15, align, colour: theme.faint, weight: 800});
  if (!view.rows.length) text(ctx, 'No runs yet: Space runs the days.', 500, LOW.y + 130, {size: 18, colour: theme.faint});
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, row.job ?? jarOf(row.jar).name, 80, y, {size: 17, align: 'left'});
    text(ctx, String(row.days), 420, y, {size: 17, align: 'right'});
    text(ctx, pct(row.rust), 620, y, {size: 17, align: 'right', colour: row.rust > .1 ? RUST : GREEN, weight: 800});
    text(ctx, row.left === null || row.left === undefined ? '–' : pct(row.left), 880, y, {size: 17, align: 'right', colour: ZINC});
  });
}
// The zinc coat close up: a slice through the nail, the grey skin round the steel thinning as the days run.
function closeCoat(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE ZINC COAT CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const row = view.shelf.find(r => r.coat === 'zinc'), cx = 300, cy = 525;
  const left = row ? row.left ?? 0 : 1, rust = row ? row.rust : 0;
  ctx.fillStyle = WATER; ctx.fillRect(LOW.x + 20, LOW.y + 40, 520, LOW.h - 60);
  ctx.fillStyle = ZINC; ctx.beginPath(); ctx.arc(cx, cy, 70 + 34 * left, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rust > 0 ? RUST : STEEL; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
  if (rust > 0 && rust < 1) { ctx.fillStyle = STEEL; ctx.beginPath(); ctx.arc(cx, cy, 70 * (1 - rust), 0, Math.PI * 2); ctx.fill(); }
  text(ctx, 'steel', cx, cy, {size: 18, colour: '#1d2224'});
  if (left > 0) text(ctx, 'zinc', cx, cy - 70 - 17 * left, {size: 15, colour: '#1d2224'});
  text(ctx, `Coat left: ${pct(left)}`, 760, 480, {size: 30, colour: ZINC, weight: 800});
  text(ctx, `Steel rusted: ${pct(rust)}`, 760, 530, {size: 26, colour: rust > .1 ? RUST : GREEN, weight: 800});
  text(ctx, left > 0 ? 'The zinc wears away first.' : 'The coat is gone: now the steel rusts.', 760, 580, {size: 17});
}
// The Sirena as she came up: a car on the sea floor's sand, crusted orange.
function sirena(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#8a4b26';
  ctx.beginPath(); ctx.moveTo(-150, 20); ctx.lineTo(-140, -10); ctx.lineTo(-80, -22); ctx.lineTo(-50, -55); ctx.lineTo(40, -58); ctx.lineTo(80, -25); ctx.lineTo(140, -18); ctx.lineTo(152, 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.moveTo(-40, -48); ctx.lineTo(30, -50); ctx.lineTo(62, -24); ctx.lineTo(-62, -22); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 26; k++) { ctx.fillStyle = k % 2 ? RUST : RUST_DARK; ctx.beginPath(); ctx.arc(-135 + (k * 53) % 280, -14 + (k * 29) % 32, 4 + k % 4, 0, Math.PI * 2); ctx.fill(); }
  for (const wx of [-90, 90]) { ctx.fillStyle = '#1b1612'; ctx.beginPath(); ctx.arc(wx, 22, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = RUST_DARK; ctx.beginPath(); ctx.arc(wx, 22, 10, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function sirenaPanel(ctx) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  ctx.fillStyle = 'rgba(40,80,100,.35)'; ctx.fillRect(LOW.x + 2, LOW.y + 2, LOW.w - 4, LOW.h - 4);
  ctx.fillStyle = '#7c6a48'; ctx.fillRect(LOW.x + 2, LOW.y + LOW.h - 60, LOW.w - 4, 58);
  sirena(ctx, 360, LOW.y + LOW.h - 70, 1.15);
  text(ctx, 'The Sirena, raised from the sea floor', 760, LOW.y + 80, {size: 20});
  text(ctx, 'after sixty years in salt water', 760, LOW.y + 112, {size: 17, colour: theme.faint});
}
function jobCard(ctx, view) {
  const j = view.job;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · ${j.n} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, j.name, LOW.x + 24, LOW.y + 60, {size: 28, align: 'left'});
  text(ctx, j.lives, LOW.x + 24, LOW.y + 98, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, `Like the ${jarOf(j.jar).name.toLowerCase()} jar.`, LOW.x + 24, LOW.y + 130, {size: 17, align: 'left'});
  text(ctx, 'Clean: 10% rust or less in a week.', LOW.x + 24, LOW.y + 172, {size: 15, align: 'left', colour: theme.faint});
  text(ctx, 'Least protection that keeps it clean.', LOW.x + 24, LOW.y + 198, {size: 15, align: 'left', colour: theme.faint});
  text(ctx, 'Your runs', 520, LOW.y + 48, {size: 15, align: 'left', colour: theme.faint, weight: 800});
  const rows = view.rows.filter(r => r.job).slice(-5);
  if (!rows.length) text(ctx, 'None yet: Space runs the week.', 520, LOW.y + 90, {size: 17, align: 'left', colour: theme.faint});
  rows.forEach((row, i) => {
    const y = LOW.y + 84 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(510, y - 16, 440, 32);
    text(ctx, `${row.job}, ${PROTECTION_NAME[row.coat].toLowerCase()}`, 520, y, {size: 16, align: 'left'});
    text(ctx, pct(row.rust), 930, y, {size: 16, align: 'right', colour: row.rust > .1 ? RUST : GREEN, weight: 800});
  });
}

function drawShelf(ctx, view) {
  background(ctx);
  shelfScene(ctx, view);
  if (view.dial) dialPanel(ctx, view);
  if (view.switch) switchPanel(ctx, view);
  if (view.low === 'job' && view.job) jobCard(ctx, view);
  else if (view.sirena) sirenaPanel(ctx);
  else if (view.low === 'coat') closeCoat(ctx, view);
  else table(ctx, view);
  if (view.glow === 'calendar' || view.glow === 'set' && view.target === 'go' || view.glow === 'dial' && view.target === 'go') glowBox(ctx, view, CAL.x - 6, CAL.y - 6, CAL.w + 12, CAL.h + 12);
  else if ((view.glow === 'dial' || view.glow === 'set') && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
  else if (view.glow === 'set' && view.switch && !view.switch.locked) glowBox(ctx, view, SWITCH.x - 4, SWITCH.y - 4, SWITCH.w + 8, SWITCH.h + 8);
}

// ---- the questions: a nail after its days, and the Sirena's soak ----
function drawCheck(ctx, view) {
  background(ctx);
  panel(ctx, 60, 70, 880, 520);
  if (view.scene === 'check-sirena') {
    text(ctx, 'THE SIRENA’S SOAK', 80, 96, {size: 13, align: 'left', colour: theme.faint, weight: 800});
    ctx.fillStyle = 'rgba(96,160,205,.3)'; ctx.fillRect(140, 250, 720, 260);
    ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4; ctx.strokeRect(140, 250, 720, 260);
    sirena(ctx, 500, 440, 1.3);
    text(ctx, 'fresh water, for weeks', 500, 220, {size: 20});
    if (view.reveal) for (let k = 0; k < 6; k++) {
      const x = 260 + k * 95, y0 = 330 - (k % 2) * 30;
      ctx.fillStyle = 'rgba(245,245,240,.9)'; ctx.fillRect(x, y0 - (view.time * 40 % 60), 6, 6);
      text(ctx, k === 2 ? 'salt out' : '', x + 20, 300, {size: 16, colour: theme.accent});
    }
    return;
  }
  const five = view.scene === 'check-five', x = 360;
  text(ctx, five ? 'A BARE NAIL IN SALT WATER' : 'A ZINC-COATED NAIL IN SALT WATER', 80, 96, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  ctx.fillStyle = WATER; ctx.fillRect(x - 70, 210, 140, 330);
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 74, 150, 148, 392, 10); ctx.stroke();
  const r = view.reveal;
  nail(ctx, x, 190, 320, {rust: r ? r.rust : 0, coat: five ? null : r ? r.left : .5, width: 16});
  text(ctx, five ? '5 days' : '22 days', 680, 220, {size: 40, weight: 800});
  if (r) {
    text(ctx, `rust ${pct(r.rust)}`, 680, 300, {size: 34, colour: RUST, weight: 800});
    if (!five) text(ctx, 'coat gone at day 20', 680, 350, {size: 20, colour: ZINC});
  } else text(ctx, '?', 680, 320, {size: 60, colour: theme.faint});
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'water') {
      nail(ctx, x + 100, 140, 170, {width: 12}); nail(ctx, x + 200, 140, 170, {rust: .14, width: 12});
      text(ctx, 'dry', x + 100, 340, {size: 15}); text(ctx, 'fresh water', x + 200, 340, {size: 15});
    }
    if (idea.id === 'salt') {
      nail(ctx, x + 100, 140, 170, {rust: .14, width: 12}); nail(ctx, x + 200, 140, 170, {rust: .84, width: 12});
      text(ctx, 'fresh', x + 100, 340, {size: 15}); text(ctx, 'salt', x + 200, 340, {size: 15});
    }
    if (idea.id === 'zinc') { nail(ctx, x + 150, 140, 170, {coat: .65, width: 14}); text(ctx, 'zinc coat', x + 150, 340, {size: 15, colour: ZINC}); }
    wrap(ctx, idea.text, x + w / 2, 410, w - 30);
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'shelf') drawShelf(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: a nail with its rust and coat, or the Sirena's soak.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'nail') {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2);
    nail(ctx, 0, -h * .9, h * 1.8 > w * .8 ? w * .8 : h * 1.8, {rust: picture.rust, coat: picture.coat ?? null, width: Math.max(8, h * .14)});
    ctx.restore();
  }
  if (picture.kind === 'soak') {
    ctx.fillStyle = WATER; ctx.fillRect(10, h * .35, w - 20, h * .6);
    sirena(ctx, w / 2, h * .8, Math.min(.35, w / 700));
    const say = {salt: 'salt out', wash: 'rust off?', stop: 'no rust?'}[picture.what];
    text(ctx, say, w / 2, h * .18, {size: 14, colour: theme.accent, weight: 800});
  }
}
