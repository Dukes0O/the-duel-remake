// The Rust lesson's board (docs/board/cards/LAB-CLASSROOM-RUST.md): Brian's shelf of glass jars, a steel nail in each,
// a wall calendar counting the days; the day dial, the protection switch, the jar buttons and a graph of the rust day by day;
// and below, a close-up of why the rust forms, the results table or Brian's job card. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {FREE_JARS, MAX_DAYS, PROTECTION_NAME, pct, jarOf, shareOf, coatOf, rustAfter} from './rust-classroom.js';
import {RUST as RUST_RULE} from '../benches/rust.js';
import {RUST_OK, RUST_WEEK} from '../lab-workshop.js';
export {BOARD};
export const pressMovesDrag = false;

const RUST = '#c4622d', RUST_DARK = '#8a3d1a', BRIGHT_RUST = '#e8803a', STEEL = '#aab3b8', ZINC = '#cfd9df', WATER = 'rgba(96,160,205,.38)', GREEN = '#9ff0b4';
const SHELF = Object.freeze({x: 30, y: 30, w: 560, h: 330, plank: 300});
const CAL = Object.freeze({x: 50, y: 52, w: 120, h: 108});
const DIAL = Object.freeze({x: 610, y: 40, w: 350, h: 120, down: [690, 128], up: [880, 128]});
const SWITCH = Object.freeze({x: 610, y: 176, w: 350, h: 160, bare: [700, 262], zinc: [870, 262]});
const MUTED = '#aab2ad';
const CHART = Object.freeze({x: 610, y: 176, w: 350, h: 184});
const LOW = Object.freeze({x: 40, y: 376, w: 920, h: 284});
// The free test's jar buttons, under the calendar.
const JAR_AT = Object.freeze({dry: [115, 232], fresh: [115, 276], salt: [115, 320]});
const LINE = Object.freeze({dry: GREEN, fresh: '#70bfd2', salt: BRIGHT_RUST, zinc: ZINC});
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
  if (view.jarPick && view.keys[1]) for (const jar of FREE_JARS) if (inBox(x, y, JAR_AT[jar], 150, 40)) return {action: `jar:${jar}`};
  if (view.keys.Space === 'go' && (inRect(x, y, CAL) || inRect(x, y, {x: 200, y: 140, w: wideOf(view) ? 760 : 390, h: 170}))) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!scene(view)) return null;
  if (view.dial && inRect(x, y, DIAL)) return view.dial.locked ? 'The day dial is locked for now.' : 'The day dial sets how many days the nail sits in its jar.';
  if (view.switch && inRect(x, y, SWITCH)) return view.switch.locked ? 'The protection is locked for now.' : 'This switch leaves the steel bare or gives it a zinc coat.';
  if (view.chart && inRect(x, y, CHART)) return 'This graph shows the rust growing day by day. Each line is straight, because in this game the rate stays the same every day.';
  if (inRect(x, y, CAL)) return 'The calendar counts the days as they run.';
  if (view.jarPick && x > 40 && x < 190 && y > 208 && y < 345) return 'These buttons choose the jar that the nail sits in.';
  const n = view.shelf.length;
  for (const [i, jar] of view.shelf.entries()) if (Math.abs(x - jarX(i, n, wideOf(view))) < 44 && y > 140 && y < 350) return `${jar.subject} has ${pct(jar.shown)} rust${jar.shownLeft === null ? '' : `, and ${pct(jar.shownLeft)} of its zinc coat is left`}.`;
  if (y > LOW.y && x < LOW.x + LOW.w) return view.job ? 'This card shows the thing to protect, where it is kept, and your runs.' : view.low === 'table' ? 'This table lists each nail with its days and its rust.' : 'This close-up shows why the rust forms, or why it does not.';
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
  if (action.startsWith('jar:')) return JAR_AT[action.slice(4)];
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
function jar(ctx, cx, row) {
  const top = 150, bottom = SHELF.plank - 4, wet = jarOf(row.jar)?.water, salty = jarOf(row.jar)?.salt;
  // Glass, water and salt.
  if (wet) { ctx.fillStyle = WATER; ctx.fillRect(cx - 36, top + 46, 72, bottom - top - 46); }
  if (salty) { ctx.fillStyle = 'rgba(245,245,240,.85)'; for (let k = 0; k < 9; k++) ctx.fillRect(cx - 30 + (k * 23) % 60, bottom - 6 - (k % 3) * 3, 4, 4); }
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(cx - 38, top, 76, bottom - top, 8); ctx.stroke();
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(cx - 40, top - 8, 80, 9);
  nail(ctx, cx, top + 20, bottom - top - 34, {rust: row.rust, coat: row.coat === 'zinc' ? row.left : null});
  // Its name and reading under the shelf.
  smallLines(ctx, row.name, cx, SHELF.plank + 20, 15);
  text(ctx, row.rate, cx, top - 52, {size: 13, colour: MUTED});
  text(ctx, `rust ${pct(row.shown)}`, cx, top - 34, {size: 16, colour: row.shown > RUST_OK ? BRIGHT_RUST : GREEN, weight: 800});
  if (row.shownLeft !== null && row.coat === 'zinc') text(ctx, `coat ${pct(row.shownLeft)}`, cx, top - 16, {size: 13, colour: ZINC});
}
function calendar(ctx, view) {
  const {x, y, w, h} = CAL, d = Math.floor(view.day + 1e-9);
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = theme.bad; ctx.fillRect(x, y, w, 26);
  ctx.fillStyle = '#fff'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', x + w / 2, y + 13);
  ctx.fillStyle = '#1d2224'; ctx.font = '800 46px "Segoe UI", sans-serif'; ctx.fillText(String(d), x + w / 2, y + 62);
  ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.fillText(view.dayTo ? `of ${view.dayTo}` : 'not started', x + w / 2, y + 94);
  if (view.keys.Space === 'go') { keyCap(ctx, x + 14, y + h + 18, 'Sp'); text(ctx, view.spaceSays ?? 'runs the days', x + 30, y + h + 18, {size: 13, align: 'left'}); }
}
function shelfScene(ctx, view) {
  const {x, y, h, plank} = SHELF, wide = wideOf(view), w = wide ? 930 : SHELF.w, end = x + w - 8;
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6b4f33'; ctx.fillRect(196, plank, end - 200, 10); ctx.fillStyle = theme.iron[2]; ctx.fillRect(210, plank + 10, 8, 40); ctx.fillRect(end - 26, plank + 10, 8, 40);
  calendar(ctx, view);
  const n = view.shelf.length;
  view.shelf.forEach((row, i) => jar(ctx, jarX(i, n, wide), row));
  if (view.focus === 'shelf' && n) glowBox(ctx, view, jarX(0, n, wide) - 56, 84, jarX(n - 1, n, wide) - jarX(0, n, wide) + 112, 270);
}
function dialPanel(ctx, view) {
  const d = view.dial, can = view.keys['↑'] === 'days:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'DAY DIAL', DIAL.x + 16, DIAL.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  text(ctx, `${d.days} ${d.days === 1 ? 'day' : 'days'}`, DIAL.x + DIAL.w / 2, DIAL.y + 56, {size: 32, weight: 800});
  button(ctx, DIAL.down, 'Fewer', '↓', can); button(ctx, DIAL.up, 'More', '↑', can);
  if (d.locked) text(ctx, 'locked', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: MUTED});
}
function switchPanel(ctx, view) {
  const s = view.switch, can = view.keys['→'] === 'coat:zinc';
  panel(ctx, SWITCH.x, SWITCH.y, SWITCH.w, SWITCH.h);
  text(ctx, 'PROTECTION', SWITCH.x + 16, SWITCH.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
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
// The free test's jar buttons: 1, 2 and 3 under the calendar.
function jarPicker(ctx, view) {
  const can = view.keys[1] === 'jar:dry';
  text(ctx, 'JAR', 115, 202, {size: 12, colour: MUTED, weight: 800});
  for (const [i, id] of FREE_JARS.entries()) {
    const [x, y] = JAR_AT[id], on = view.jarPick.jar === id;
    ctx.globalAlpha = can || on ? 1 : .4;
    ctx.fillStyle = on ? 'rgba(237,197,87,.16)' : '#232a2e'; ctx.strokeStyle = on ? theme.accent : theme.beamDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 72, y - 19, 144, 38, 6); ctx.fill(); ctx.stroke();
    keyCap(ctx, x - 54, y, String(i + 1));
    text(ctx, jarOf(id).name, x + 12, y, {size: 14, colour: on ? theme.accent : theme.text});
    ctx.globalAlpha = 1;
  }
}
// The graph: rust against days. A dashed line shows what the sum predicts for the dial's days; the solid line follows the calendar.
function chart(ctx, view) {
  const {x, y, w, h} = CHART, left = x + 46, right = x + w - 76, top = y + 32, bottom = y + h - 28;
  const px = d => left + (right - left) * d / MAX_DAYS, py = share => bottom - (bottom - top) * Math.min(1, share);
  panel(ctx, x, y, w, h);
  text(ctx, 'RUST DAY BY DAY', x + 16, y + 16, {size: 12, align: 'left', colour: MUTED, weight: 800});
  ctx.lineWidth = 1;
  for (const share of [0, .5, 1]) {
    ctx.strokeStyle = 'rgba(227,220,203,.18)'; ctx.beginPath(); ctx.moveTo(left, py(share)); ctx.lineTo(right, py(share)); ctx.stroke();
    text(ctx, pct(share), left - 8, py(share), {size: 12, align: 'right', colour: MUTED});
  }
  for (let d = 0; d <= MAX_DAYS; d++) text(ctx, String(d), px(d), bottom + 12, {size: 12, colour: MUTED});
  text(ctx, 'days', right + 10, bottom + 12, {size: 12, align: 'left', colour: MUTED});
  const upTo = view.dial?.days ?? MAX_DAYS, running = view.dayTo != null, now = running ? Math.min(view.day, MAX_DAYS) : upTo, labels = [];
  for (const row of view.shelf) {
    const at = d => py(rustAfter(row.jar, row.coat, d).rust), colour = LINE[row.jar];
    ctx.strokeStyle = colour; ctx.lineWidth = 1.5; ctx.globalAlpha = .55; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(px(0), at(0)); ctx.lineTo(px(upTo), at(upTo)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (running) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(0), at(0)); ctx.lineTo(px(now), at(now)); ctx.stroke(); }
    ctx.fillStyle = colour;
    if (running) for (let d = 0; d <= Math.floor(now + 1e-9); d++) { ctx.beginPath(); ctx.arc(px(d), at(d), 3, 0, Math.PI * 2); ctx.fill(); }
    const reached = rustAfter(row.jar, row.coat, Math.floor(now + 1e-9)).rust;
    labels.push({said: `${row.jar} ${pct(reached)}`, y: at(now), colour});
  }
  // Lowest first, each at least a line above the one below it.
  labels.sort((a, b) => b.y - a.y);
  labels.forEach((label, i) => {
    const y = i ? Math.min(label.y, labels[i - 1].y - 15) : label.y - 7;
    label.y = y;
    text(ctx, label.said, px(now) + 8, y, {size: 13, align: 'left', colour: label.colour, weight: 800});
  });
}

// ---- the lower half ----
function table(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE NAILS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  const cols = [[80, 'Jar', 'left'], [420, 'Days', 'right'], [620, 'Rust', 'right'], [880, 'Zinc coat left', 'right']];
  for (const [x, label, align] of cols) text(ctx, label, x, LOW.y + 48, {size: 15, align, colour: MUTED, weight: 800});
  if (!view.rows.length) text(ctx, view.running ? 'The days are running.' : 'There are no runs yet.', 500, LOW.y + 130, {size: 18, colour: MUTED});
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, row.job ?? row.label ?? jarOf(row.jar).name, 80, y, {size: 17, align: 'left'});
    text(ctx, String(row.days), 420, y, {size: 17, align: 'right'});
    text(ctx, pct(row.rust), 620, y, {size: 17, align: 'right', colour: row.rust > RUST_OK ? BRIGHT_RUST : GREEN, weight: 800});
    text(ctx, row.left === null || row.left === undefined ? '–' : pct(row.left), 880, y, {size: 17, align: 'right', colour: ZINC});
  });
}
// How rust forms, close up: oxygen comes down through the water to the steel, and the rust layer grows where they meet.
function closeRust(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'HOW RUST FORMS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  const left = 70, width = 450, surface = 500, floor = 600, wet = view.shelf.find(r => r.jar === 'fresh'), dry = view.shelf.find(r => r.jar === 'dry'), rust = wet?.rust ?? 0;
  text(ctx, 'white dots: oxygen from the air', left + width / 2, 418, {size: 16});
  ctx.fillStyle = WATER; ctx.fillRect(left, surface, width, floor - surface);
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(left, surface); ctx.lineTo(left + width, surface); ctx.stroke();
  text(ctx, 'water', left + 38, surface + 16, {size: 15});
  for (let k = 0; k < 8; k++) {
    const x = left + 40 + k * 54 + (k % 2) * 12, y = 440 + (view.time * 18 + k * 37) % (floor - 466);
    ctx.fillStyle = '#d7f0ff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d7f0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 16); ctx.moveTo(x - 3, y + 12); ctx.lineTo(x, y + 16); ctx.lineTo(x + 3, y + 12); ctx.stroke();
  }
  ctx.fillStyle = STEEL; ctx.fillRect(left, floor, width, 46);
  text(ctx, 'steel, which is mostly iron', left + width / 2, floor + 24, {size: 16, colour: '#1d2224'});
  if (rust > 0) {
    const thick = 3 + rust * 44;
    ctx.fillStyle = RUST; ctx.beginPath(); ctx.moveTo(left, floor);
    for (let k = 0; k <= 18; k++) ctx.lineTo(left + width * k / 18, floor - thick * (k % 2 ? 1 : .72));
    ctx.lineTo(left + width, floor); ctx.closePath(); ctx.fill();
  }
  text(ctx, 'iron + water + oxygen → rust', 745, 432, {size: 22, colour: theme.accent, weight: 800});
  if (wet) text(ctx, `The nail in fresh water has ${pct(wet.shown)} rust.`, 745, 484, {size: 18});
  if (dry) text(ctx, `The nail in dry air has ${pct(dry.shown)} rust.`, 745, 516, {size: 18});
  wrap(ctx, 'Without water or without oxygen, iron does not rust.', 745, 572, 370, {size: 17, weight: 600});
}
// Why salt water is faster, close up: many charged particles carry electric charge through salt water, and few carry it through fresh water.
function closeSalt(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'WHY SALT WATER IS FASTER', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  const tank = (x, w, name, count, said) => {
    ctx.fillStyle = WATER; ctx.fillRect(x, 404, w, 198);
    ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2; ctx.strokeRect(x, 404, w, 242);
    ctx.fillStyle = STEEL; ctx.fillRect(x + 1, 602, w - 2, 43);
    text(ctx, 'steel', x + w / 2, 624, {size: 15, colour: '#1d2224'});
    text(ctx, name, x + w / 2, 422, {size: 17});
    for (let k = 0; k < count; k++) {
      const px = x + 14 + (k * 53 + view.time * 26 * (k % 2 ? 1 : -1) + 4000) % (w - 28), py = 448 + (k * 37) % 116, plus = k % 2 === 0;
      ctx.fillStyle = plus ? theme.accent : '#7fd0ff'; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
      text(ctx, plus ? '+' : '−', px, py, {size: 14, colour: '#1d2224', weight: 800});
    }
    text(ctx, said, x + w / 2, 588, {size: 14, colour: theme.text});
  };
  tank(60, 230, 'fresh water', 3, 'few charged particles');
  tank(310, 230, 'salt water', 16, 'many charged particles');
  const salt = view.shelf.find(r => r.jar === 'salt'), fresh = view.shelf.find(r => r.jar === 'fresh'), rate = share => Math.round(share * 100);
  text(ctx, `${rate(RUST_RULE.saltPerDay)}% ÷ ${rate(RUST_RULE.freshPerDay)}% = ${rate(RUST_RULE.saltPerDay) / rate(RUST_RULE.freshPerDay)} times as fast`, 750, 436, {size: 22, colour: theme.accent, weight: 800});
  wrap(ctx, 'The charged particles carry electric charge through the water, so the rusting runs faster in salt water.', 750, 484, 370, {size: 17, weight: 600});
  if (fresh) text(ctx, `The nail in fresh water has ${pct(fresh.shown)} rust.`, 750, 590, {size: 17});
  if (salt) text(ctx, `The nail in salt water has ${pct(salt.shown)} rust.`, 750, 620, {size: 17});
}
// The zinc coat close up: a slice through the nail, the grey skin round the steel thinning as the days run, and electrons flowing from the zinc into the steel.
function closeCoat(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE ZINC COAT CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  const row = view.shelf.find(r => r.coat === 'zinc'), cx = 300, cy = 525;
  const left = row ? row.left ?? 0 : 1, rust = row ? row.rust : 0;
  ctx.fillStyle = WATER; ctx.fillRect(LOW.x + 20, LOW.y + 28, 520, LOW.h - 40);
  ctx.fillStyle = ZINC; ctx.beginPath(); ctx.arc(cx, cy, 70 + 34 * left, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rust > 0 ? RUST : STEEL; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
  if (rust > 0 && rust < 1) { ctx.fillStyle = STEEL; ctx.beginPath(); ctx.arc(cx, cy, 70 * (1 - rust), 0, Math.PI * 2); ctx.fill(); }
  text(ctx, 'steel', cx, cy, {size: 18, colour: '#1d2224'});
  if (left > 0) {
    // Electrons from the zinc into the steel, moving inward; bits of the zinc drifting off into the water.
    ctx.strokeStyle = '#1f6aa8'; ctx.fillStyle = '#1f6aa8'; ctx.lineWidth = 2.5;
    for (const a of [.5, 2.1, 3.6, 5.2]) {
      const dx = Math.cos(a), dy = Math.sin(a), outer = 70 + 30 * left, inner = 52;
      ctx.beginPath(); ctx.moveTo(cx + dx * outer, cy + dy * outer); ctx.lineTo(cx + dx * inner, cy + dy * inner); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + dx * (inner - 6), cy + dy * (inner - 6)); ctx.lineTo(cx + dx * inner - dy * 6, cy + dy * inner + dx * 6); ctx.lineTo(cx + dx * inner + dy * 6, cy + dy * inner - dx * 6); ctx.closePath(); ctx.fill();
    }
    if (view.running) {
      ctx.save(); ctx.beginPath(); ctx.rect(LOW.x + 20, LOW.y + 28, 520, LOW.h - 40); ctx.clip();
      for (let k = 0; k < 8; k++) {
        const a = k * .79, r = 74 + 34 * left + (view.time * 22 + k * 19) % 60;
        ctx.fillStyle = ZINC; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    text(ctx, 'zinc coat', cx + 170, cy - 96, {size: 15});
    text(ctx, 'blue arrows: electrons', cx + 158, cy + 112, {size: 14});
  }
  text(ctx, `Coat left: ${pct(row?.shownLeft ?? left)}`, 760, 444, {size: 28, colour: ZINC, weight: 800});
  text(ctx, `Steel rusted: ${pct(row?.shown ?? rust)}`, 760, 490, {size: 24, colour: rust > RUST_OK ? BRIGHT_RUST : GREEN, weight: 800});
  wrap(ctx, left > 0 ? 'The zinc corrodes first, and its electrons flow into the steel, which protects the iron from rusting.' : 'The coat has gone, so nothing protects the steel, and now the steel rusts.', 760, 540, 340, {size: 17, weight: 600});
}
// The Sirena when it was raised: a car on the sea floor's sand, crusted orange.
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
  text(ctx, 'after sixty years in salt water', 760, LOW.y + 112, {size: 17, colour: MUTED});
}
function jobCard(ctx, view) {
  const j = view.job;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · ${j.n} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, j.name, LOW.x + 24, LOW.y + 60, {size: 28, align: 'left'});
  text(ctx, j.lives, LOW.x + 24, LOW.y + 98, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, `It is like the nail in ${jarOf(j.jar).name.toLowerCase()}.`, LOW.x + 24, LOW.y + 130, {size: 17, align: 'left'});
  text(ctx, `Clean means ${pct(RUST_OK)} rust or less after a week.`, LOW.x + 24, LOW.y + 172, {size: 15, align: 'left', colour: MUTED});
  text(ctx, 'Use the least protection that keeps it clean.', LOW.x + 24, LOW.y + 198, {size: 15, align: 'left', colour: MUTED});
  text(ctx, 'Your runs', 520, LOW.y + 48, {size: 15, align: 'left', colour: MUTED, weight: 800});
  const rows = view.rows.filter(r => r.job).slice(-5);
  if (!rows.length) text(ctx, 'There are no runs yet. Press Space to run the week.', 500, LOW.y + 90, {size: 17, align: 'left', colour: MUTED});
  rows.forEach((row, i) => {
    const y = LOW.y + 84 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(510, y - 16, 440, 32);
    text(ctx, `${row.job}, ${PROTECTION_NAME[row.coat].toLowerCase()}`, 520, y, {size: 16, align: 'left'});
    text(ctx, pct(row.rust), 930, y, {size: 16, align: 'right', colour: row.rust > RUST_OK ? RUST : GREEN, weight: 800});
  });
}

function drawShelf(ctx, view) {
  background(ctx);
  shelfScene(ctx, view);
  if (view.dial) dialPanel(ctx, view);
  if (view.switch) switchPanel(ctx, view);
  if (view.jarPick) jarPicker(ctx, view);
  if (view.chart) chart(ctx, view);
  if (view.low === 'job' && view.job) jobCard(ctx, view);
  else if (view.sirena) sirenaPanel(ctx);
  else if (view.low === 'coat') closeCoat(ctx, view);
  else if (view.low === 'rust') closeRust(ctx, view);
  else if (view.low === 'salt') closeSalt(ctx, view);
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
    text(ctx, 'THE SIRENA’S SOAK', 80, 96, {size: 13, align: 'left', colour: MUTED, weight: 800});
    ctx.fillStyle = 'rgba(96,160,205,.3)'; ctx.fillRect(140, 250, 720, 260);
    ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4; ctx.strokeRect(140, 250, 720, 260);
    sirena(ctx, 500, 440, 1.3);
    text(ctx, 'fresh water, for weeks', 500, 220, {size: 20});
    if (view.reveal) for (let k = 0; k < 6; k++) {
      const x = 260 + k * 95, y0 = 330 - (k % 2) * 30;
      ctx.fillStyle = 'rgba(245,245,240,.9)'; ctx.fillRect(x, y0 - (view.time * 40 % 60), 6, 6);
    }
    if (view.reveal) text(ctx, 'salt moving out of the metal', 500, 350, {size: 17, colour: theme.accent});
    return;
  }
  const five = view.scene === 'check-five', x = 360;
  text(ctx, five ? 'A BARE NAIL IN SALT WATER' : 'A ZINC-COATED NAIL IN SALT WATER', 80, 96, {size: 13, align: 'left', colour: MUTED, weight: 800});
  ctx.fillStyle = WATER; ctx.fillRect(x - 70, 210, 140, 330);
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 74, 150, 148, 392, 10); ctx.stroke();
  const r = view.reveal;
  nail(ctx, x, 190, 320, {rust: r ? r.rust : 0, coat: five ? null : r ? r.left : 1, width: 16});
  text(ctx, five ? '5 days' : '22 days', 680, 220, {size: 40, weight: 800});
  if (r) {
    text(ctx, `rust ${pct(r.rust)}`, 680, 300, {size: 34, colour: BRIGHT_RUST, weight: 800});
    if (!five) text(ctx, `coat gone by day ${RUST_RULE.zincLastDays}`, 680, 350, {size: 20, colour: ZINC});
  } else text(ctx, '?', 680, 320, {size: 60, colour: MUTED});
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'water') {
      nail(ctx, x + 100, 140, 170, {rust: shareOf('dry', RUST_WEEK), width: 12}); nail(ctx, x + 200, 140, 170, {rust: shareOf('fresh', RUST_WEEK), width: 12});
      text(ctx, 'dry', x + 100, 340, {size: 15}); text(ctx, 'fresh water', x + 200, 340, {size: 15});
    }
    if (idea.id === 'salt') {
      nail(ctx, x + 100, 140, 170, {rust: shareOf('fresh', RUST_WEEK), width: 12}); nail(ctx, x + 200, 140, 170, {rust: shareOf('salt', RUST_WEEK), width: 12});
      text(ctx, 'fresh', x + 100, 340, {size: 15}); text(ctx, 'salt', x + 200, 340, {size: 15});
    }
    if (idea.id === 'zinc') { nail(ctx, x + 150, 140, 170, {coat: coatOf('zinc', RUST_WEEK), width: 14}); text(ctx, 'zinc coat', x + 150, 340, {size: 15, colour: ZINC}); }
    wrap(ctx, idea.text, x + w / 2, 386, w - 30, {size: 19, weight: 600});
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
    const say = {salt: 'salt out', wash: 'rust off', stop: 'no more rust'}[picture.what];
    text(ctx, say, w / 2, h * .17, {size: 22, colour: theme.accent, weight: 800});
  }
}
