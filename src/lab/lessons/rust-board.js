// The Rust lesson's board (docs/board/cards/LAB-CLASSROOM-RUST.md): Brian's shelf of glass jars, a steel nail in each,
// a wall calendar counting the days; the day dial, the protection switch, the jar buttons and a graph of the rust day by day;
// and below, a close-up of why the rust forms, the results table or Brian's job card. Draws and hit-tests only.
import {BOARD, theme, cardScene, background, shadow, steel, bolt, bezel, shade, blend, grain, timber, labelPlate, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
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
    if (view.jarPick && !view.jarPick.locked && view.best.jar && view.jarPick.jar !== view.best.jar) return JAR_AT[view.best.jar];
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


// A steel nail standing up, `len` long from its head at (x, y). Rust covers `rust` of it in rough orange-brown patches and
// flakes from the tip up; a zinc coat is a pale dull-silver skin, thinner as `coat` (the share left) falls.
export function nail(ctx, x, y, len, {rust = 0, coat = null, width = 8} = {}) {
  const w = width, shaftEnd = y + len - w, tipY = y + len;
  const shaft = (grow = 0) => { ctx.beginPath(); ctx.moveTo(x - w / 2 - grow, y); ctx.lineTo(x + w / 2 + grow, y); ctx.lineTo(x + w / 2 + grow, shaftEnd); ctx.lineTo(x, tipY + grow * .8); ctx.lineTo(x - w / 2 - grow, shaftEnd); ctx.closePath(); };
  // The zinc skin goes on first, a little wider than the steel, with matte specks in it.
  if (coat !== null && coat > 0) {
    const t = (.8 + coat * 3.2) * Math.max(1, w / 8), skin = ctx.createLinearGradient(x - w / 2 - t, 0, x + w / 2 + t, 0);
    skin.addColorStop(0, '#8d989f'); skin.addColorStop(.3, '#d3dce1'); skin.addColorStop(.6, '#aab5bc'); skin.addColorStop(1, '#6f7a82');
    ctx.fillStyle = skin; shaft(t); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - w * 1.3 - t, y - w * .5 - t, w * 2.6 + 2 * t, w * .7 + t, w * .25); ctx.fill();
    ctx.save(); shaft(t); ctx.clip();
    for (let k = 0; k < Math.ceil(len / 3); k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.22)' : 'rgba(40,50,56,.22)'; ctx.fillRect(x - w / 2 - t + grain(k + 11) * (w + 2 * t), y + grain(k + 12) * len, 1.3, 1.2); }
    ctx.restore();
  }
  // The shaft: rolled steel lit from the left, with a bright sheen down it.
  const steelFill = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  steelFill.addColorStop(0, '#6b757b'); steelFill.addColorStop(.28, '#e8eef0'); steelFill.addColorStop(.5, '#aeb8be'); steelFill.addColorStop(1, '#4a535a');
  ctx.fillStyle = steelFill; shaft(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(.8, w * .1); ctx.beginPath(); ctx.moveTo(x - w * .17, y + w * .4); ctx.lineTo(x - w * .17, shaftEnd - 2); ctx.stroke();
  // The head: a flat disc seen from the side, lit on top.
  const head = ctx.createLinearGradient(0, y - w * .5, 0, y + w * .2); head.addColorStop(0, '#f2f6f8'); head.addColorStop(.45, '#9ba6ac'); head.addColorStop(1, '#3d464b');
  ctx.fillStyle = head; ctx.beginPath(); ctx.roundRect(x - w * 1.3, y - w * .5, w * 2.6, w * .7, w * .25); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - w * 1.1, y - w * .46, w * 2.2, Math.max(.8, w * .08));
  if (rust > 0) {
    // A crust from the tip upward over the rusted share, rough at its edge, thinning into separate patches at its top end.
    const span = (len - w) * Math.min(1, rust), top = shaftEnd - span, outline = [];
    for (let k = 0; k <= 10; k++) outline.push([x + w * (.6 + grain(k + 40) * .22), shaftEnd - span * k / 10]);
    const crust = () => {
      ctx.beginPath(); ctx.moveTo(x - w * .7, shaftEnd); ctx.lineTo(x, tipY + w * .22); ctx.lineTo(x + w * .7, shaftEnd);
      for (const [px, py] of outline) ctx.lineTo(px, py);
      for (let k = 10; k >= 0; k--) ctx.lineTo(x - w * (.6 + grain(k + 60) * .22), shaftEnd - span * k / 10);
      ctx.closePath();
    };
    const body = ctx.createLinearGradient(0, shaftEnd, 0, top - 1); body.addColorStop(0, 'rgba(176,84,30,1)'); body.addColorStop(.7, 'rgba(190,96,40,.92)'); body.addColorStop(1, 'rgba(200,110,50,.35)');
    ctx.fillStyle = body; crust(); ctx.fill();
    ctx.save(); crust(); ctx.clip();
    const colours = ['#c4622d', '#8a3d1a', '#e8803a', '#6b3014', '#a2501f'];
    for (let k = 0, n = Math.ceil(span / (w * .35)); k < n; k++) {
      const py = shaftEnd - (k + .5) * span / n + (grain(k + 80) - .5) * w, r = w * (.14 + grain(k + 90) * .22);
      ctx.fillStyle = colours[k % colours.length]; ctx.globalAlpha = .75; ctx.beginPath(); ctx.ellipse(x + (grain(k + 100) - .5) * w * 1.1, py, r, r * .8, grain(k + 110) * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,190,120,.35)'; ctx.fillRect(x - w * .5, top, Math.max(.8, w * .1), span);
    ctx.restore();
    // Flakes standing out from the crust along its edges.
    for (let k = 0, n = Math.floor(span / (w * 1.1)); k < n; k++) {
      const side = k % 2 ? 1 : -1, py = shaftEnd - (k + .5) * span / Math.max(1, n), ex = x + side * w * .7;
      ctx.fillStyle = k % 3 ? '#8a3d1a' : '#c4622d'; ctx.beginPath(); ctx.moveTo(ex, py - w * .25); ctx.lineTo(ex + side * w * (.22 + grain(k + 120) * .2), py); ctx.lineTo(ex, py + w * .25); ctx.closePath(); ctx.fill();
    }
  }
}
// Short lines of small text, broken between words, for the jars' names.
function smallLines(ctx, value, x, y, perLine) {
  const lines = [];
  for (const word of value.split(' ')) { const lineNow = lines.at(-1); if (lineNow && (lineNow + ' ' + word).length <= perLine) lines[lines.length - 1] = lineNow + ' ' + word; else lines.push(word); }
  lines.forEach((line, i) => text(ctx, line, x, y + i * 15, {size: 13}));
}
// The back of a glass jar: its shadow on the shelf, a faint shade inside, and the salt lying at the bottom (before the nail goes in front).
function jarBack(ctx, cx, top, w, h, {salt = false} = {}) {
  const bottom = top + h;
  shadow(ctx, cx, bottom + 3, w * .62, .6);
  ctx.fillStyle = 'rgba(150,180,195,.08)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, h, 8); ctx.fill();
  if (salt) {
    ctx.fillStyle = 'rgba(226,230,228,.55)'; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 3, bottom - 9, w - 6, 8, 3); ctx.fill();
    for (let k = 0; k < Math.round(w / 6); k++) {
      const sx = cx - w / 2 + 6 + grain(k + 200) * (w - 12), sy = bottom - 12 - grain(k + 210) * 6, s = 2.4 + grain(k + 220) * 2.4;
      ctx.fillStyle = k % 2 ? '#f4f6f2' : '#d9dfdc'; ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s, sy); ctx.lineTo(sx, sy + s * .8); ctx.lineTo(sx - s * .9, sy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(sx - s * .4, sy - s * .5, s * .5, s * .35);
    }
  }
}
// The front of the jar: the water over the nail (clear, fresh, or cloudy with salt), its lit surface, the thick glass and the screw lid.
function jarFront(ctx, cx, top, w, h, {water = false, salt = false, waterTop = top + 46, lid = true} = {}) {
  const bottom = top + h, left = cx - w / 2;
  if (water) {
    const tint = ctx.createLinearGradient(0, waterTop, 0, bottom);
    tint.addColorStop(0, salt ? 'rgba(150,185,180,.34)' : 'rgba(110,175,208,.30)'); tint.addColorStop(1, salt ? 'rgba(90,130,128,.46)' : 'rgba(60,120,160,.44)');
    ctx.fillStyle = tint; ctx.beginPath(); ctx.roundRect(left + 1.5, waterTop, w - 3, bottom - waterTop - 1.5, [0, 0, 7, 7]); ctx.fill();
    ctx.fillStyle = 'rgba(235,246,250,.55)'; ctx.fillRect(left + 2, waterTop - .5, w - 4, 1.6);
    ctx.fillStyle = 'rgba(235,246,250,.22)'; ctx.beginPath(); ctx.ellipse(cx, waterTop, w / 2 - 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    if (salt) for (let k = 0; k < Math.round(w / 8); k++) { ctx.fillStyle = 'rgba(245,247,244,.5)'; ctx.fillRect(left + 5 + grain(k + 230) * (w - 10), waterTop + 8 + grain(k + 240) * (bottom - waterTop - 24), 1.4, 1.4); }
  }
  // The glass: a bright left edge, a dark right edge, a thick base and the lamp's reflection.
  ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(left, top, w, h, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(left - 1.5, top - 1.5, w + 3, h + 3, 9); ctx.stroke();
  ctx.fillStyle = 'rgba(205,228,238,.2)'; ctx.beginPath(); ctx.roundRect(left + 2, bottom - 8, w - 4, 7, [0, 0, 6, 6]); ctx.fill();
  const edge = ctx.createLinearGradient(left, 0, left + w, 0); edge.addColorStop(0, 'rgba(255,255,255,.28)'); edge.addColorStop(.12, 'rgba(255,255,255,0)'); edge.addColorStop(.88, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = edge; ctx.beginPath(); ctx.roundRect(left, top, w, h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fillRect(left + w * .12, top + 12, 2.2, h - 36);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(left + w * .2, top + 22, 1.4, h * .3);
  if (lid) {
    steel(ctx, left - 2, top - 8, w + 4, 9, 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let gx = left + 4; gx < left + w - 2; gx += 4) ctx.fillRect(gx, top - 6, 1, 5);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(left, top + 1, w, 3);
  }
}
// One jar on the shelf: glass, water and salt round a nail. Draws what the jar holds before and after the nail.
function jar(ctx, cx, row) {
  const top = 150, bottom = SHELF.plank - 4, wet = jarOf(row.jar)?.water, salty = jarOf(row.jar)?.salt, kit = {water: wet, salt: salty, waterTop: top + 46};
  jarBack(ctx, cx, top, 76, bottom - top, kit);
  nail(ctx, cx, top + 20, bottom - top - 34, {rust: row.rust, coat: row.coat === 'zinc' ? row.left : null});
  jarFront(ctx, cx, top, 76, bottom - top, kit);
  // Its name and reading under the shelf.
  smallLines(ctx, row.name, cx, SHELF.plank + 20, 15);
  text(ctx, row.rate, cx, top - 52, {size: 13, colour: MUTED});
  text(ctx, `rust ${pct(row.shown)}`, cx, top - 34, {size: 16, colour: row.shown > RUST_OK ? BRIGHT_RUST : GREEN, weight: 800});
  if (row.shownLeft !== null && row.coat === 'zinc') text(ctx, `coat ${pct(row.shownLeft)}`, cx, top - 16, {size: 13, colour: ZINC});
}
function calendar(ctx, view) {
  const {x, y, w, h} = CAL, d = Math.floor(view.day + 1e-9);
  // A paper tear-off pad: the sheets under the top one, a red header with two binding rings, and a perforation.
  shadow(ctx, x + w / 2, y + h + 4, w * .62, .55);
  ctx.fillStyle = '#a89f8a'; ctx.beginPath(); ctx.roundRect(x + 3, y + 5, w, h, 6); ctx.fill();
  ctx.fillStyle = '#c9c0aa'; ctx.beginPath(); ctx.roundRect(x + 1.5, y + 2.5, w, h, 6); ctx.fill();
  const paper = ctx.createLinearGradient(0, y, 0, y + h); paper.addColorStop(0, '#fbf6e6'); paper.addColorStop(1, '#e2d8bd');
  ctx.fillStyle = paper; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  const band = ctx.createLinearGradient(0, y, 0, y + 26); band.addColorStop(0, '#f48d6c'); band.addColorStop(1, '#c4563c');
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip(); ctx.fillStyle = band; ctx.fillRect(x, y, w, 26);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + 26, w, 1.4); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, w, 1.4);
  const curl = ctx.createLinearGradient(x + w - 22, y + h - 22, x + w, y + h); curl.addColorStop(0, 'rgba(0,0,0,0)'); curl.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = curl; ctx.fillRect(x + w - 22, y + h - 22, 22, 22);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,40,20,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x + 4, y + 28.5); ctx.lineTo(x + w - 4, y + 28.5); ctx.stroke(); ctx.setLineDash([]);
  for (const rx of [x + 28, x + w - 28]) { ctx.fillStyle = '#15191b'; ctx.beginPath(); ctx.arc(rx, y + 7, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c9d1d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rx, y + 5, 4.6, Math.PI * .1, Math.PI * 1.9); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAY', x + w / 2, y + 13);
  ctx.fillStyle = '#1d2224'; ctx.font = '800 46px "Segoe UI", sans-serif'; ctx.fillText(String(d), x + w / 2, y + 62);
  ctx.font = '700 13px "Segoe UI", sans-serif'; ctx.fillText(view.dayTo ? `of ${view.dayTo}` : 'not started', x + w / 2, y + 94);
  if (view.keys.Space === 'go') { keyCap(ctx, x + 14, y + h + 18, 'Sp'); text(ctx, view.spaceSays ?? 'runs the days', x + 30, y + h + 18, {size: 13, align: 'left'}); }
}
function shelfScene(ctx, view) {
  const {x, y, h, plank} = SHELF, wide = wideOf(view), w = wide ? 930 : SHELF.w, end = x + w - 8;
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  bezel(ctx, x, y, w, h, 10);
  // A worn timber shelf on two steel brackets, with its shadow on the wall behind.
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(196, plank + 12, end - 200, 5);
  for (const bx of [210, end - 26]) {
    steel(ctx, bx, plank + 12, 8, 38, 1.5);
    ctx.strokeStyle = '#4a545a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx + 4, plank + 46); ctx.lineTo(bx - 14, plank + 13); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 3, plank + 45); ctx.lineTo(bx - 14.5, plank + 14); ctx.stroke();
    bolt(ctx, bx + 4, plank + 18, 1.8); bolt(ctx, bx + 4, plank + 44, 1.8);
  }
  timber(ctx, 196, plank, end - 200, 12);
  calendar(ctx, view);
  const n = view.shelf.length;
  view.shelf.forEach((row, i) => jar(ctx, jarX(i, n, wide), row));
  if (view.focus === 'shelf' && n) glowBox(ctx, view, jarX(0, n, wide) - 56, 84, jarX(n - 1, n, wide) - jarX(0, n, wide) + 112, 270);
}
function panel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(26,33,37,.92)'); g.addColorStop(1, 'rgba(11,15,17,.92)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  bezel(ctx, x, y, w, h, 8);
}
function button(ctx, [x, y], label, key, can) {
  ctx.globalAlpha = can ? 1 : .35;
  const g = ctx.createLinearGradient(0, y - 18, 0, y + 18); g.addColorStop(0, '#4b555b'); g.addColorStop(1, '#22282b');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - 60, y - 18, 120, 36, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x - 56, y - 17, 112, 1);
  text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 40, y, key);
  ctx.globalAlpha = 1;
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
    ctx.fillStyle = on ? 'rgba(237,197,87,.16)' : '#232a2e'; ctx.beginPath(); ctx.roundRect(cx - 70, cy - 52, 140, 104, 8); ctx.fill();
    if (on) { ctx.save(); ctx.shadowColor = theme.accent; ctx.shadowBlur = 12; ctx.strokeStyle = theme.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(cx - 70, cy - 52, 140, 104, 8); ctx.stroke(); ctx.restore(); }
    else bezel(ctx, cx - 70, cy - 52, 140, 104, 8);
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
    ctx.fillStyle = on ? 'rgba(237,197,87,.16)' : '#232a2e'; ctx.beginPath(); ctx.roundRect(x - 72, y - 19, 144, 38, 6); ctx.fill();
    ctx.strokeStyle = on ? theme.accent : '#5d676d'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.beginPath(); ctx.roundRect(x - 72, y - 19, 144, 38, 6); ctx.stroke();
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
  // While the player works out a sum, the graph does not draw its answer.
  for (const row of view.noPreview && !running ? [] : view.shelf) {
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
// Water in a rectangle: darker toward the bottom, with a lit surface line along its top edge.
function waterFill(ctx, x, y, w, h, lit = true) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(110,178,212,.34)'); g.addColorStop(1, 'rgba(50,110,150,.55)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (lit) { ctx.fillStyle = 'rgba(235,246,250,.6)'; ctx.fillRect(x, y - .5, w, 1.8); ctx.fillStyle = 'rgba(235,246,250,.16)'; ctx.fillRect(x, y + 1.5, w, 5); }
}
// A slab of brushed steel from its top-left (x, y), light enough to carry dark lettering.
function steelSlab(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d9e0e4'); g.addColorStop(.3, '#aab3b8'); g.addColorStop(1, '#78838a');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let k = 0, n = Math.ceil(w / 14); k < n; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)'; ctx.fillRect(x + grain(k + 300) * w, y + 3 + grain(k + 310) * (h - 6), 30 + grain(k + 320) * 90, 1); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y, w, 1.5); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x, y + h - 1.5, w, 1.5);
}
// Rust growing on a flat surface at `floor`, `thick` deep and `width` across from `left`: a rough crust of patches with flakes along its top.
function rustLayer(ctx, left, floor, width, thick) {
  const edge = k => floor - thick * (.55 + .45 * grain(k + 400)), steps = 22;
  const g = ctx.createLinearGradient(0, floor - thick, 0, floor); g.addColorStop(0, '#d9702f'); g.addColorStop(.5, '#b5561f'); g.addColorStop(1, '#6b3014');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(left, floor);
  for (let k = 0; k <= steps; k++) ctx.lineTo(left + width * k / steps, edge(k) - (k % 2 ? 0 : thick * .12));
  ctx.lineTo(left + width, floor); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(left, floor - thick - 2, width, thick + 2); ctx.clip();
  const colours = ['#e8803a', '#8a3d1a', '#c4622d', '#6b3014'];
  for (let k = 0, n = Math.round(width / 6); k < n; k++) { ctx.fillStyle = colours[k % 4]; ctx.globalAlpha = .6; ctx.beginPath(); ctx.ellipse(left + grain(k + 420) * width, floor - grain(k + 430) * thick, 3 + grain(k + 440) * 8, 1.5 + grain(k + 450) * 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1;
  for (let k = 0; k < steps; k += 3) { const fx = left + width * k / steps, fy = edge(k); ctx.fillStyle = k % 2 ? '#8a3d1a' : '#e8803a'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 5, fy - 3 - grain(k + 460) * 5); ctx.lineTo(fx + 8, fy + 1); ctx.closePath(); ctx.fill(); }
}
// A small shiny sphere: a coloured ball with a bright spot, for oxygen and for the charged particles.
function ball(ctx, x, y, r, colour) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, .5, x, y, r); g.addColorStop(0, shade(colour, .6)); g.addColorStop(.5, colour); g.addColorStop(1, shade(colour, -.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
// How rust forms, close up: oxygen comes down through the water to the steel, and the rust layer grows where they meet.
function closeRust(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'HOW RUST FORMS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: MUTED, weight: 800});
  const left = 70, width = 450, surface = 500, floor = 600, wet = view.shelf.find(r => r.jar === 'fresh'), dry = view.shelf.find(r => r.jar === 'dry'), rust = wet?.rust ?? 0;
  text(ctx, 'The white dots are oxygen from the air.', left + width / 2, 418, {size: 16});
  waterFill(ctx, left, surface, width, floor - surface);
  text(ctx, 'water', left + 38, surface + 16, {size: 15});
  for (let k = 0; k < 8; k++) {
    const x = left + 40 + k * 54 + (k % 2) * 12, y = 440 + (view.time * 18 + k * 37) % (floor - 466);
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 11); glow.addColorStop(0, 'rgba(215,240,255,.4)'); glow.addColorStop(1, 'rgba(215,240,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ball(ctx, x, y, 5, '#d7f0ff');
    ctx.strokeStyle = '#d7f0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 16); ctx.moveTo(x - 3, y + 12); ctx.lineTo(x, y + 16); ctx.lineTo(x + 3, y + 12); ctx.stroke();
  }
  steelSlab(ctx, left, floor, width, 46);
  text(ctx, 'steel, which is mostly iron', left + width / 2, floor + 24, {size: 16, colour: '#1d2224'});
  if (rust > 0) rustLayer(ctx, left, floor, width, 3 + rust * 44);
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
    waterFill(ctx, x, 404, w, 198);
    const side = ctx.createLinearGradient(x, 0, x + w, 0); side.addColorStop(0, 'rgba(255,255,255,.22)'); side.addColorStop(.06, 'rgba(255,255,255,0)'); side.addColorStop(.94, 'rgba(255,255,255,0)'); side.addColorStop(1, 'rgba(0,0,0,.25)');
    ctx.fillStyle = side; ctx.fillRect(x, 404, w, 198);
    ctx.strokeStyle = 'rgba(210,225,232,.7)'; ctx.lineWidth = 2; ctx.strokeRect(x, 404, w, 242);
    steelSlab(ctx, x + 1, 602, w - 2, 43);
    text(ctx, 'steel', x + w / 2, 624, {size: 15, colour: '#1d2224'});
    text(ctx, name, x + w / 2, 422, {size: 17});
    for (let k = 0; k < count; k++) {
      const px = x + 14 + (k * 53 + view.time * 26 * (k % 2 ? 1 : -1) + 4000) % (w - 28), py = 448 + (k * 37) % 116, plus = k % 2 === 0;
      ball(ctx, px, py, 8, plus ? theme.accent : '#7fd0ff');
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
  waterFill(ctx, LOW.x + 20, LOW.y + 28, 520, LOW.h - 40, false);
  // The coat: a pale dull-silver ring, thinner as it wears away.
  const outer = 70 + 34 * left, zinc = ctx.createRadialGradient(cx - 30, cy - 36, 10, cx, cy, outer); zinc.addColorStop(0, '#e1e8ec'); zinc.addColorStop(.7, '#aab5bc'); zinc.addColorStop(1, '#7c878e');
  ctx.fillStyle = zinc; ctx.beginPath(); ctx.arc(cx, cy, outer, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
  for (let k = 0; k < 40; k++) { const a = grain(k + 500) * Math.PI * 2, r = 70 + grain(k + 510) * (outer - 72); if (outer > 72) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.3)' : 'rgba(40,50,56,.3)'; ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 1.4); } }
  // The steel under it, going orange-brown from the outside in as it rusts.
  const core = ctx.createRadialGradient(cx - 24, cy - 28, 6, cx, cy, 70); core.addColorStop(0, rust > 0 ? '#e08a4c' : '#e3eaed'); core.addColorStop(.6, rust > 0 ? '#b5561f' : '#aab3b8'); core.addColorStop(1, rust > 0 ? '#6b3014' : '#5d676d');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
  if (rust > 0) for (let k = 0; k < 30; k++) { const a = grain(k + 520) * Math.PI * 2, r = 30 + grain(k + 530) * 38; ctx.fillStyle = k % 2 ? 'rgba(232,128,58,.5)' : 'rgba(80,36,14,.5)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + grain(k + 540) * 4, 0, Math.PI * 2); ctx.fill(); }
  if (rust > 0 && rust < 1) { const clean = ctx.createRadialGradient(cx - 18, cy - 20, 4, cx, cy, 70 * (1 - rust)); clean.addColorStop(0, '#e3eaed'); clean.addColorStop(1, '#8d979d'); ctx.fillStyle = clean; ctx.beginPath(); ctx.arc(cx, cy, 70 * (1 - rust), 0, Math.PI * 2); ctx.fill(); }
  text(ctx, 'steel', cx, cy, {size: 18, colour: '#1d2224'});
  if (left > 0) {
    // Electrons from the zinc into the steel, moving inward; bits of the zinc drifting off into the water.
    ctx.strokeStyle = '#1f6aa8'; ctx.fillStyle = '#1f6aa8'; ctx.lineWidth = 2.5;
    for (const a of [.5, 2.1, 3.6, 5.2]) {
      const dx = Math.cos(a), dy = Math.sin(a), outerR = 70 + 30 * left, inner = 52;
      ctx.beginPath(); ctx.moveTo(cx + dx * outerR, cy + dy * outerR); ctx.lineTo(cx + dx * inner, cy + dy * inner); ctx.stroke();
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
    text(ctx, 'The blue arrows are electrons.', cx + 158, cy + 112, {size: 14});
  }
  text(ctx, `Coat left ${pct(row?.shownLeft ?? left)}`, 760, 444, {size: 28, colour: ZINC, weight: 800});
  text(ctx, `Steel rusted ${pct(row?.shown ?? rust)}`, 760, 490, {size: 24, colour: rust > RUST_OK ? BRIGHT_RUST : GREEN, weight: 800});
  wrap(ctx, left > 0 ? 'The zinc corrodes first, and its electrons flow into the steel, which protects the iron from rusting.' : 'The coat has gone, so nothing protects the steel, and now the steel rusts.', 760, 540, 340, {size: 17, weight: 600});
}
// The Sirena when it was raised: a car on the sea floor's sand, crusted orange, with weed on the roof and shells on the sills.
function sirena(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 46, 170, 9, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createLinearGradient(0, -58, 0, 24); body.addColorStop(0, '#b9652f'); body.addColorStop(.5, '#8a4b26'); body.addColorStop(1, '#3f2210');
  const shell = () => { ctx.beginPath(); ctx.moveTo(-150, 20); ctx.lineTo(-140, -10); ctx.lineTo(-80, -22); ctx.lineTo(-50, -55); ctx.lineTo(40, -58); ctx.lineTo(80, -25); ctx.lineTo(140, -18); ctx.lineTo(152, 20); ctx.closePath(); };
  ctx.fillStyle = body; shell(); ctx.fill();
  ctx.fillStyle = '#26333a'; ctx.beginPath(); ctx.moveTo(-40, -48); ctx.lineTo(30, -50); ctx.lineTo(62, -24); ctx.lineTo(-62, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(80,120,90,.35)'; ctx.beginPath(); ctx.moveTo(-40, -48); ctx.lineTo(30, -50); ctx.lineTo(62, -24); ctx.lineTo(-62, -22); ctx.closePath(); ctx.fill();
  ctx.save(); shell(); ctx.clip();
  for (let k = 0; k < 26; k++) { ctx.fillStyle = k % 2 ? RUST : RUST_DARK; ctx.beginPath(); ctx.arc(-135 + (k * 53) % 280, -14 + (k * 29) % 32, 4 + k % 4, 0, Math.PI * 2); ctx.fill(); }
  for (let k = 0; k < 18; k++) { ctx.fillStyle = k % 3 ? 'rgba(232,128,58,.55)' : 'rgba(60,28,10,.6)'; ctx.beginPath(); ctx.ellipse(-140 + grain(k + 600) * 290, -50 + grain(k + 610) * 70, 3 + grain(k + 620) * 9, 2 + grain(k + 630) * 4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; shell(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,190,130,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-50, -55); ctx.lineTo(40, -58); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(-8, 18); ctx.moveTo(-100, -14); ctx.lineTo(100, -10); ctx.stroke();
  ctx.strokeStyle = '#2f5a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [wx, lean] of [[-20, -10], [10, 8], [30, 14]]) { ctx.beginPath(); ctx.moveTo(wx, -57); ctx.quadraticCurveTo(wx + lean, -75, wx + lean * 1.6, -92); ctx.stroke(); }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#e6e1d2'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(-130 + k * 30 + grain(k + 640) * 10, 16 + grain(k + 650) * 4, 2 + grain(k + 660) * 1.6, 0, Math.PI * 2); ctx.fill(); }
  for (const wx of [-90, 90]) {
    ctx.fillStyle = '#1b1612'; ctx.beginPath(); ctx.arc(wx, 22, 24, 0, Math.PI * 2); ctx.fill();
    const rim = ctx.createRadialGradient(wx - 3, 19, 1, wx, 22, 11); rim.addColorStop(0, '#d9843f'); rim.addColorStop(1, '#5a2a10'); ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(wx, 22, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * Math.PI * .4; ctx.moveTo(wx, 22); ctx.lineTo(wx + Math.cos(a) * 10, 22 + Math.sin(a) * 10); } ctx.stroke();
  }
  ctx.restore();
}

function sirenaPanel(ctx) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  const sea = ctx.createLinearGradient(0, LOW.y, 0, LOW.y + LOW.h); sea.addColorStop(0, 'rgba(60,110,140,.28)'); sea.addColorStop(1, 'rgba(20,50,70,.5)');
  ctx.fillStyle = sea; ctx.fillRect(LOW.x + 2, LOW.y + 2, LOW.w - 4, LOW.h - 4);
  const sand = ctx.createLinearGradient(0, LOW.y + LOW.h - 60, 0, LOW.y + LOW.h); sand.addColorStop(0, '#9c8860'); sand.addColorStop(1, '#5a4c32');
  ctx.fillStyle = sand; ctx.fillRect(LOW.x + 2, LOW.y + LOW.h - 60, LOW.w - 4, 58);
  for (let k = 0; k < 60; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,240,200,.14)' : 'rgba(0,0,0,.2)'; ctx.fillRect(LOW.x + 6 + grain(k + 700) * (LOW.w - 12), LOW.y + LOW.h - 56 + grain(k + 710) * 50, 2, 1.4); }
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
    waterFill(ctx, 140, 250, 720, 260);
    ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4; ctx.strokeRect(140, 250, 720, 260); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(143, 253, 714, 254);
    sirena(ctx, 500, 440, 1.3);
    text(ctx, 'fresh water, for weeks', 500, 220, {size: 20});
    if (view.reveal) for (let k = 0; k < 6; k++) {
      const x = 260 + k * 95, y0 = 330 - (k % 2) * 30;
      const sy = y0 - (view.time * 40 % 60); ctx.fillStyle = 'rgba(245,247,242,.92)'; ctx.beginPath(); ctx.moveTo(x + 3, sy - 1); ctx.lineTo(x + 7, sy + 3); ctx.lineTo(x + 3, sy + 7); ctx.lineTo(x - 1, sy + 3); ctx.closePath(); ctx.fill();
    }
    if (view.reveal) labelPlate(ctx, 500, 350, 250, 28, .7);
    if (view.reveal) text(ctx, 'salt moving out of the metal', 500, 350, {size: 17, colour: theme.accent});
    return;
  }
  const five = view.scene === 'check-five', x = 360;
  text(ctx, five ? 'A BARE NAIL IN SALT WATER' : 'A ZINC-COATED NAIL IN SALT WATER', 80, 96, {size: 13, align: 'left', colour: MUTED, weight: 800});
  const r = view.reveal, kit = {water: true, salt: true, waterTop: 210, lid: false};
  jarBack(ctx, x, 150, 148, 392, kit);
  nail(ctx, x, 190, 320, {rust: r ? r.rust : 0, coat: five ? null : r ? r.left : 1, width: 16});
  jarFront(ctx, x, 150, 148, 392, kit);
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
    panel(ctx, x, 40, w, 600);
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
  cardScene(ctx, w, h, {floorAt: h});
  if (picture.kind === 'nail') {
    // The nail lies along Brian's shelf plank, lit from the lamp.
    const plank = Math.round(h * .7);
    timber(ctx, 0, plank, w, h - plank);
    shadow(ctx, w / 2, plank + 1, w * .42, .55);
    ctx.save(); ctx.translate(w / 2 + 8, h * .62); ctx.rotate(-Math.PI / 2);
    nail(ctx, 0, -h * .9, h * 1.8 > w * .8 ? w * .8 : h * 1.8, {rust: picture.rust, coat: picture.coat ?? null, width: Math.max(8, h * .14)});
    ctx.restore();
  }
  if (picture.kind === 'soak') {
    // The Sirena standing in the salt water over the sand, as in the board's sea panel.
    waterFill(ctx, 0, h * .36, w, h * .64);
    const sand = ctx.createLinearGradient(0, h - 22, 0, h); sand.addColorStop(0, '#9c8860'); sand.addColorStop(1, '#5a4c32');
    ctx.fillStyle = sand; ctx.fillRect(0, h - 22, w, 22);
    for (let k = 0; k < 24; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,240,200,.14)' : 'rgba(0,0,0,.2)'; ctx.fillRect(grain(k + 700) * w, h - 20 + grain(k + 710) * 18, 2, 2); }
    sirena(ctx, w / 2, h - 36, Math.min(.36, w / 620));
    const say = {salt: 'salt out', wash: 'rust off', stop: 'no more rust'}[picture.what];
    labelPlate(ctx, w / 2, h * .17, 150, 30, .55);
    text(ctx, say, w / 2, h * .17, {size: 22, colour: theme.accent, weight: 800});
  }
}
