// The Launch angles lesson's board (docs/board/cards/LAB-CLASSROOM-LAUNCH.md): Brian's launcher side on, its ramp
// tilting about the lip, a skier flying its arc over a landing deck with a tape and a flag; the ramp panel and the
// speed dial; and below, a close-up, the launches table or Brian's mark card. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {pathOf, distanceOf, mph, m1, deg, SHOW_MS, SLOW_MS} from './launch-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const TRAIL = '#edc557', OLD = 'rgba(190,198,204,.45)', FLAG = '#ef7a59', GREEN = '#9ff0b4';
// The scene: the launcher on the left, the landing deck level with its lip, metres to pixels the same both ways.
const SCENE = Object.freeze({x: 30, y: 30, w: 560, h: 330});
const DECK_Y = 268, LIP = Object.freeze({x: 118, y: DECK_Y}), PX = 9, ARM = 54;
const RAMP = Object.freeze({x: 610, y: 40, w: 350, h: 150, down: [690, 160], up: [880, 160]});
const DIAL = Object.freeze({x: 610, y: 206, w: 350, h: 130, down: [690, 304], up: [880, 304]});
const TAPE_BOX = Object.freeze({x: 176, y: 304, w: 400, h: 50});
const LOW = Object.freeze({x: 40, y: 376, w: 920, h: 284});
const scene = view => view.scene === 'launcher';
const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const inRect = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
const GO_AT = [LIP.x - 24, LIP.y - 34];

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!scene(view)) return null;
  if (view.keys['↑'] === 'angle:up') {
    if (inBox(x, y, RAMP.up, 130, 40)) return {action: 'angle:up'};
    if (inBox(x, y, RAMP.down, 130, 40)) return {action: 'angle:down'};
  }
  if (view.keys['→'] === 'speed:up') {
    if (inBox(x, y, DIAL.up, 130, 40)) return {action: 'speed:up'};
    if (inBox(x, y, DIAL.down, 130, 40)) return {action: 'speed:down'};
  }
  if (view.keys.Space === 'go' && x > SCENE.x && x < SCENE.x + SCENE.w && y > SCENE.y && y < DECK_Y + 20) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!scene(view)) return null;
  if (view.ramp && inRect(x, y, RAMP)) return view.ramp.locked ? 'The ramp: Brian has set its angle for this launch.' : 'The ramp: 5 degrees steeper or flatter a press.';
  if (view.dial && inRect(x, y, DIAL)) return view.dial.locked ? 'The speed dial: Brian has set it for this launch.' : 'The speed dial: how fast the skier leaves the ramp.';
  if (inRect(x, y, TAPE_BOX)) return 'The tape’s reading: how far the last skier landed from the end of the ramp.';
  if (view.flag && Math.abs(x - (LIP.x + view.flag * PX)) < 16 && y > DECK_Y - 50 && y < DECK_Y + 4) return `The flag: ${view.flag} m from the end of the ramp.`;
  if (x > SCENE.x && x < LIP.x + 10 && y > DECK_Y - 60 && y < SCENE.y + SCENE.h) return `The launcher: its ramp at ${deg(view.rig.angle)}, its spring set to ${view.rig.mph} mph.`;
  if (x > LIP.x && x < SCENE.x + SCENE.w && y > DECK_Y - 8 && y < DECK_Y + 22) return 'The landing deck, level with the end of the ramp, with a tape in metres.';
  if (y > LOW.y && x < LOW.x + LOW.w) return view.job ? 'Brian’s mark: the flag to reach, and what he has fixed.' : 'The launches: each one with its angle, speed and distance.';
  return null;
}
export function targetPoint(view, action) {
  if (!scene(view)) return null;
  if (action === 'set:best' && view.best) {
    const r = view.ramp, d = view.dial;
    if (r && !r.locked && r.angle !== view.best.angle) return r.angle < view.best.angle ? RAMP.up : RAMP.down;
    if (d && !d.locked && d.ms !== view.best.ms) return d.ms < view.best.ms ? DIAL.up : DIAL.down;
  }
  if (action === 'angle:up') return RAMP.up;
  if (action === 'angle:down') return RAMP.down;
  if (action === 'speed:up') return DIAL.up;
  if (action === 'speed:down') return DIAL.down;
  if (action === 'go') return GO_AT;
  // Sparks fly from what the step is about.
  if (view.focus === 'ramp') return [RAMP.x + RAMP.w / 2, RAMP.y + 60];
  if (view.focus === 'dial') return [DIAL.x + DIAL.w / 2, DIAL.y + 60];
  return [TAPE_BOX.x + TAPE_BOX.w / 2, TAPE_BOX.y + 20];
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
// A skier figure side on, flying along `dir` (radians, screen up is negative y).
function skier(ctx, x, y, dir, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-dir); ctx.scale(scale, scale);
  ctx.strokeStyle = '#d8dde0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(14, 4); ctx.stroke();
  ctx.strokeStyle = '#3d7fc2'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-4, -8); ctx.lineTo(0, -16); ctx.stroke();
  ctx.fillStyle = '#f0c27a'; ctx.beginPath(); ctx.arc(2, -21, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3d7fc2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -13); ctx.lineTo(8, -9); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.restore();
}
function flagPole(ctx, x, groundY, label) {
  ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - 44); ctx.stroke();
  ctx.fillStyle = FLAG; ctx.beginPath(); ctx.moveTo(x, groundY - 44); ctx.lineTo(x + 20, groundY - 37); ctx.lineTo(x, groundY - 30); ctx.closePath(); ctx.fill();
  if (label) text(ctx, label, x, groundY - 54, {size: 14, colour: FLAG, weight: 800});
}
// A flight's path in board units, from an origin and a scale.
const toBoard = (points, ox, oy, px) => points.map(([x, y, t]) => [ox + x * px, oy - y * px, t]);
function strokePath(ctx, pts, colour, width, dash = null) {
  if (pts.length < 2) return;
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash ?? []);
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
}
// The launcher: a post, and the ramp's arm pivoting about its lip at the deck's edge.
function launcher(ctx, angle) {
  const a = angle * Math.PI / 180, back = [LIP.x - ARM * Math.cos(a), LIP.y + ARM * Math.sin(a)], floor = SCENE.y + SCENE.h - 6;
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(LIP.x - 8, LIP.y + 4, 14, floor - LIP.y - 4);
  ctx.fillStyle = theme.iron[2]; ctx.fillRect(LIP.x - 34, floor - 8, 66, 8);
  // The spring under the arm, from the post to the middle of the arm.
  const mid = [(LIP.x + back[0]) / 2, (LIP.y + back[1]) / 2];
  ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 2;
  ctx.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8, x = mid[0] + (LIP.x - 3 - mid[0]) * u + (k % 2 ? 5 : -5), y = mid[1] + (floor - 30 - mid[1]) * u; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(back[0], back[1]); ctx.lineTo(LIP.x, LIP.y); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = theme.iron[0]; ctx.beginPath(); ctx.arc(LIP.x, LIP.y, 5, 0, Math.PI * 2); ctx.fill();
}
function deck(ctx, view) {
  const right = SCENE.x + SCENE.w - 8;
  ctx.fillStyle = theme.iron[2]; ctx.fillRect(LIP.x + 6, DECK_Y + 2, right - LIP.x - 6, 18);
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(LIP.x + 6, DECK_Y - 2, right - LIP.x - 6, 5);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1.5;
  for (let d = 0; LIP.x + d * PX <= right; d += 5) {
    const x = LIP.x + d * PX;
    ctx.beginPath(); ctx.moveTo(x, DECK_Y - 2); ctx.lineTo(x, DECK_Y + (d % 10 ? 3 : 6)); ctx.stroke();
    if (d % 10 === 0 && d > 0) text(ctx, `${d}`, x, DECK_Y + 13, {size: 11, colour: theme.text});
  }
  if (view.flag) flagPole(ctx, LIP.x + view.flag * PX, DECK_Y - 2, `${view.flag} m`);
}
function launchScene(ctx, view) {
  const r = view.rig, {x, y, w, h} = SCENE;
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  deck(ctx, view);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, w - 4, DECK_Y - y); ctx.clip();
  // This step's earlier launches, faded, each marked where it landed.
  for (const t of r.trails) {
    const pts = toBoard(pathOf(t.angle, t.ms), LIP.x, LIP.y, PX), top = pts.reduce((a, b) => b[1] < a[1] ? b : a);
    strokePath(ctx, pts, OLD, 2, [6, 6]);
    text(ctx, deg(t.angle), top[0], top[1] - 10, {size: 13, colour: theme.ghost, weight: 800});
  }
  const f = r.flight;
  if (f) {
    const pts = toBoard(pathOf(f.angle, f.ms), LIP.x, LIP.y, PX).filter(p => p[2] <= f.t);
    strokePath(ctx, pts, TRAIL, 3);
    const at = pts.at(-1) ?? [LIP.x, LIP.y], before = pts.at(-2) ?? [LIP.x - Math.cos(f.angle * Math.PI / 180), LIP.y + Math.sin(f.angle * Math.PI / 180)];
    const dir = f.landed ? 0 : Math.atan2(-(at[1] - before[1]), at[0] - before[0]);
    skier(ctx, at[0], at[1] - 4, dir, .9);
    if (f.landed) text(ctx, m1(f.distance), at[0], at[1] - 40, {size: 16, colour: theme.accent, weight: 800});
  } else skier(ctx, LIP.x - 4, LIP.y - 6, r.angle * Math.PI / 180, .9);
  ctx.restore();
  launcher(ctx, f ? f.angle : r.angle);
  text(ctx, `${deg(f ? f.angle : r.angle)} · ${f ? mph(f.ms) : r.mph} mph`, LIP.x - 40, SCENE.y + 22, {size: 14, colour: theme.faint, weight: 800});
  if (view.keys.Space === 'go') {
    keyCap(ctx, SCENE.x + 30, SCENE.y + 48, 'Sp');
    text(ctx, 'Space launches', SCENE.x + 46, SCENE.y + 48, {size: 13, align: 'left'});
  }
  // The tape's reading: the skier now landed, or the last one.
  panel(ctx, TAPE_BOX.x, TAPE_BOX.y, TAPE_BOX.w, TAPE_BOX.h);
  text(ctx, 'TAPE', TAPE_BOX.x + 12, TAPE_BOX.y + 14, {size: 11, align: 'left', colour: theme.faint, weight: 800});
  const last = f?.landed ? f.distance : f ? null : r.trails.at(-1)?.distance ?? null;
  text(ctx, last === null ? (f ? 'in the air' : '–') : m1(last), TAPE_BOX.x + 12, TAPE_BOX.y + 34, {size: 22, align: 'left', weight: 800, colour: last === null ? theme.faint : theme.text});
  if (view.flag && last !== null) {
    const diff = last - view.flag, on = Math.abs(diff) <= 2;
    text(ctx, on ? 'on the flag' : `${m1(Math.abs(diff))} ${diff < 0 ? 'short' : 'past'}`, TAPE_BOX.x + TAPE_BOX.w - 12, TAPE_BOX.y + 34, {size: 16, align: 'right', colour: on ? GREEN : theme.bad, weight: 800});
  } else if (view.flag) text(ctx, `flag at ${view.flag} m`, TAPE_BOX.x + TAPE_BOX.w - 12, TAPE_BOX.y + 34, {size: 15, align: 'right', colour: FLAG});
  if (view.focus === 'tape') glowBox(ctx, view, TAPE_BOX.x - 4, TAPE_BOX.y - 4, TAPE_BOX.w + 8, TAPE_BOX.h + 8);
}
function rampPanel(ctx, view) {
  const p = view.ramp, can = view.keys['↑'] === 'angle:up', a = p.angle * Math.PI / 180;
  panel(ctx, RAMP.x, RAMP.y, RAMP.w, RAMP.h);
  text(ctx, 'RAMP ANGLE', RAMP.x + 16, RAMP.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  // A small ramp over a level line, with its angle marked.
  const ox = RAMP.x + 40, oy = RAMP.y + 96;
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 76, oy); ctx.stroke();
  ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 58 * Math.cos(a), oy - 58 * Math.sin(a)); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 26, -a, 0); ctx.stroke();
  text(ctx, deg(p.angle), RAMP.x + 240, RAMP.y + 76, {size: 40, weight: 800});
  button(ctx, RAMP.down, 'Flatter', '↓', can);
  button(ctx, RAMP.up, 'Steeper', '↑', can);
  if (p.locked) text(ctx, 'set by Brian', RAMP.x + RAMP.w - 12, RAMP.y + 18, {size: 12, align: 'right', colour: theme.faint});
}
function dialPanel(ctx, view) {
  const d = view.dial, can = view.keys['→'] === 'speed:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'SPEED DIAL', DIAL.x + 16, DIAL.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, `${d.mph} mph`, DIAL.x + DIAL.w / 2, DIAL.y + 56, {size: 34, weight: 800});
  button(ctx, DIAL.down, 'Slower', '←', can);
  button(ctx, DIAL.up, 'Faster', '→', can);
  if (d.locked) text(ctx, 'set by Brian', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: theme.faint});
}

// ---- the lower half: a close-up for the words, the launches table, or Brian's mark ----
function closeAngle(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE LAUNCH ANGLE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cx = 330, cy = 630, rad = 210, a = view.ramp.angle * Math.PI / 180;
  ctx.strokeStyle = 'rgba(227,220,203,.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, 0); ctx.stroke();
  for (let d = 0; d <= 90; d += 15) {
    const t = d * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * rad, cy - Math.sin(t) * rad); ctx.lineTo(cx + Math.cos(t) * (rad - 14), cy - Math.sin(t) * (rad - 14)); ctx.stroke();
    text(ctx, `${d}°`, cx + Math.cos(t) * (rad + 22), cy - Math.sin(t) * (rad + 18), {size: 13, colour: theme.faint});
  }
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rad + 30, cy); ctx.stroke();
  text(ctx, 'level ground', cx + rad - 40, cy - 12, {size: 14, colour: theme.faint});
  ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rad, cy - Math.sin(a) * rad); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 70, -a, 0); ctx.stroke();
  text(ctx, `${view.ramp.angle} degrees`, 720, 500, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, 'how far the ramp points up', 720, 544, {size: 18});
  text(ctx, '0 is level; 90 is straight up', 720, 576, {size: 16, colour: theme.faint});
}
function closeSpeed(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE SPEED DIAL', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cx = 330, cy = 540, rad = 110, share = Math.min(1, view.dial.mph / 60);
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 2;
  for (let k = 0; k <= 6; k++) {
    const t = Math.PI * (.75 + 1.5 * k / 6);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * rad * .8, cy + Math.sin(t) * rad * .8); ctx.lineTo(cx + Math.cos(t) * rad * .95, cy + Math.sin(t) * rad * .95); ctx.stroke();
    text(ctx, String(k * 10), cx + Math.cos(t) * rad * .64, cy + Math.sin(t) * rad * .64, {size: 13, colour: '#2b3236'});
  }
  const t = Math.PI * (.75 + 1.5 * share);
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * rad * .85, cy + Math.sin(t) * rad * .85); ctx.stroke();
  text(ctx, 'mph', cx, cy + 44, {size: 14, colour: '#2b3236'});
  text(ctx, `${view.dial.mph} mph`, 680, 500, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, 'how fast the skier leaves the ramp', 680, 544, {size: 18});
}
function closeTape(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE TAPE CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  // 25 m to 45 m across the panel, a mark every metre.
  const x0 = 130, x1 = 870, from = 25, to = 45, at = d => x0 + (d - from) / (to - from) * (x1 - x0), y = 520;
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(x0 - 50, y - 26, x1 - x0 + 100, 52);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1.5;
  for (let d = from; d <= to; d++) {
    ctx.beginPath(); ctx.moveTo(at(d), y - 26); ctx.lineTo(at(d), y - 26 + (d % 5 ? 12 : 22)); ctx.stroke();
    if (d % 5 === 0) { ctx.fillStyle = '#1d2224'; ctx.font = '800 15px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${d} m`, at(d), y + 12); }
  }
  const f = view.rig.flight, landed = f?.landed ? f.distance : !f ? view.rig.trails.at(-1)?.distance : null;
  if (landed != null) {
    const x = at(Math.max(from, Math.min(to, landed)));
    ctx.fillStyle = theme.bad; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x - 10, y - 50); ctx.lineTo(x + 10, y - 50); ctx.closePath(); ctx.fill();
    text(ctx, `landed ${m1(landed)}`, x, y - 66, {size: 22, colour: theme.accent, weight: 800});
  } else text(ctx, 'from the end of the ramp, in metres', 500, y + 70, {size: 17, colour: theme.faint});
}
function table(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  const cols = [[110, 'Angle', 'left'], [300, 'Speed', 'left'], [560, 'Distance', 'right'], [880, view.flag ? 'Against the flag' : '', 'right']];
  text(ctx, 'THE LAUNCHES', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  for (const [x, label, align] of cols) text(ctx, label, x, LOW.y + 48, {size: 15, align, colour: theme.faint, weight: 800});
  if (!view.rows.length) text(ctx, 'No launches yet: Space launches.', 500, LOW.y + 130, {size: 18, colour: theme.faint});
  const best = view.rows.length > 2 ? Math.max(...view.rows.map(r => r.distance)) : null;
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, deg(row.angle), 110, y, {size: 18, align: 'left'});
    text(ctx, `${row.speed} mph`, 300, y, {size: 18, align: 'left'});
    text(ctx, m1(row.distance), 560, y, {size: 18, align: 'right', colour: row.distance === best ? theme.accent : theme.text, weight: row.distance === best ? 800 : 700});
    if (view.flag) {
      const diff = row.distance - view.flag, on = Math.abs(diff) <= 2;
      text(ctx, on ? 'on the flag' : `${m1(Math.abs(diff))} ${diff < 0 ? 'short' : 'past'}`, 880, y, {size: 17, align: 'right', colour: on ? GREEN : theme.bad});
    }
  });
}
// Brian's mark: the card on the left, this job's last launches on the right.
function jobCard(ctx, view) {
  const j = view.job;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · MARK ${j.mark} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, `A flag at ${j.flag} m`, LOW.x + 24, LOW.y + 62, {size: 28, align: 'left'});
  const fixed = j.fixed === 'angle' ? `The ramp is fixed at ${deg(view.ramp.angle)}.` : j.fixed === 'speed' ? `The speed is fixed at ${view.dial.mph} mph.` : 'Angle and speed are yours.';
  text(ctx, fixed, LOW.x + 24, LOW.y + 100, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, j.fixed === 'angle' ? 'Set the speed.' : j.fixed === 'speed' ? 'Set the angle.' : 'Set both.', LOW.x + 24, LOW.y + 130, {size: 18, align: 'left'});
  text(ctx, 'Within 2 m of the flag counts.', LOW.x + 24, LOW.y + 172, {size: 15, align: 'left', colour: theme.faint});
  text(ctx, 'Your launches', 500, LOW.y + 48, {size: 15, align: 'left', colour: theme.faint, weight: 800});
  const rows = view.rows.slice(-5);
  if (!rows.length) text(ctx, 'None yet: Space launches.', 500, LOW.y + 90, {size: 17, align: 'left', colour: theme.faint});
  rows.forEach((row, i) => {
    const y = LOW.y + 84 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(490, y - 16, 460, 32);
    text(ctx, `${deg(row.angle)}, ${row.speed} mph`, 500, y, {size: 17, align: 'left'});
    text(ctx, m1(row.distance), 760, y, {size: 17, align: 'right'});
  });
}

function drawLauncher(ctx, view) {
  background(ctx);
  launchScene(ctx, view);
  if (view.ramp) rampPanel(ctx, view);
  if (view.dial) dialPanel(ctx, view);
  if (view.low === 'job' && view.job) jobCard(ctx, view);
  else if (view.low === 'angle' && view.ramp) closeAngle(ctx, view);
  else if (view.low === 'speed' && view.dial) closeSpeed(ctx, view);
  else if (view.low === 'tape') closeTape(ctx, view);
  else table(ctx, view);
  // The glow on what to use next.
  const launcherBox = () => glowBox(ctx, view, SCENE.x + 8, DECK_Y - 90, LIP.x - SCENE.x + 20, SCENE.y + SCENE.h - DECK_Y + 84);
  if (view.glow === 'launcher' || view.glow === 'set' && view.target === 'go') launcherBox();
  const rampNext = view.ramp && !view.ramp.locked && view.best && view.ramp.angle !== view.best.angle;
  if (view.glow === 'ramp' || view.glow === 'set' && view.target === 'set:best' && rampNext) glowBox(ctx, view, RAMP.x - 4, RAMP.y - 4, RAMP.w + 8, RAMP.h + 8);
  else if (view.glow === 'dial' || view.glow === 'set' && view.target === 'set:best' && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
}

// ---- the questions: arcs from one launcher, a lower landing, and the Aerials kicker ----
const ARC_COLOURS = ['#edc557', '#70bfd2', '#b8a1e3', '#eb927e'];
function arcsPicture(ctx, view, lower) {
  const ox = 170, oy = lower ? 300 : 460, px = 14, landY = oy + (lower ? 10 * px : 0);
  panel(ctx, 60, 70, 880, 520);
  // The ramp's edge and the landing.
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(ox - 70, oy, 70, 590 - oy);
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(ox, landY - 2, 760, 5);
  if (lower) {
    ctx.strokeStyle = theme.faint; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 760, oy); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox + 30, oy + 4); ctx.lineTo(ox + 30, landY - 6); ctx.stroke();
    text(ctx, '10 m lower', ox + 40, (oy + landY) / 2, {size: 16, align: 'left', colour: theme.accent});
  }
  for (let d = 10; d <= 50; d += 10) text(ctx, `${d} m`, ox + d * px, landY + 18, {size: 13, colour: theme.faint});
  if (!view.arcs.length) text(ctx, '?', 560, oy - 120, {size: 60, colour: theme.faint});
  view.arcs.forEach((arc, i) => {
    const pts = toBoard(pathOf(arc.angle, arc.ms, arc.lower), ox, oy, px), end = pts.at(-1);
    const colour = ARC_COLOURS[i % ARC_COLOURS.length];
    strokePath(ctx, pts, colour, 3);
    ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(end[0], end[1], 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(700, 102 + i * 32, 26, 4);
    text(ctx, `${deg(arc.angle)} lands ${m1(arc.distance)}`, 736, 104 + i * 32, {size: 18, align: 'left', colour, weight: 800});
  });
  text(ctx, `${mph(SHOW_MS)} mph`, ox - 35, oy - 20, {size: 15, colour: theme.faint});
}
// The Aerials kicker side on: the inrun down to a flat, the kicker rising to a lip that throws at about 50 degrees, and
// the landing hill falling away below it. (x, y) is the lip; pose is the skier's on the inrun: tuck, lean or stand.
function kicker(ctx, x, y, s, {pose = 'stand', flight = false} = {}) {
  const base = y + 30 * s, top = [x - 250 * s, y - 150 * s], foot = [x - 64 * s, base];
  ctx.fillStyle = '#dfe7ec';
  ctx.beginPath(); ctx.moveTo(...top); ctx.lineTo(...foot); ctx.lineTo(x - 44 * s, base);
  ctx.quadraticCurveTo(x - 25 * s, base, x, y);
  ctx.lineTo(x + 14 * s, base + 6 * s); ctx.lineTo(x + 40 * s, base + 10 * s); ctx.lineTo(x + 250 * s, base + 168 * s); ctx.lineTo(x + 300 * s, base + 175 * s);
  ctx.lineTo(x + 300 * s, base + 200 * s); ctx.lineTo(top[0], base + 200 * s); ctx.closePath(); ctx.fill();
  if (flight) {
    const pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30 * 1.6; pts.push([x + 110 * s * t, y - 110 * s * t * 1.19 + 95 * s * t * t]); }
    strokePath(ctx, pts, TRAIL, 3, [7, 6]);
  }
  // A skier on the inrun, along its slope.
  const along = .45, px = top[0] + (foot[0] - top[0]) * along, py = top[1] + (foot[1] - top[1]) * along;
  ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(foot[1] - top[1], foot[0] - top[0])); ctx.scale(s * 1.4, s * 1.4);
  ctx.strokeStyle = '#d8dde0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(14, -2); ctx.stroke();
  const body = pose === 'tuck' ? [[0, -4], [6, -10], [12, -12]] : pose === 'lean' ? [[0, -4], [-4, -14], [-10, -22]] : [[0, -4], [0, -14], [0, -24]];
  ctx.strokeStyle = '#3d7fc2'; ctx.lineWidth = 5; ctx.beginPath(); body.forEach(([bx, by], i) => i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)); ctx.stroke();
  const head = body.at(-1);
  ctx.fillStyle = '#f0c27a'; ctx.beginPath(); ctx.arc(head[0] + (pose === 'tuck' ? 4 : 0), head[1] - 5, 5, 0, Math.PI * 2); ctx.fill();
  if (pose === 'tuck') { ctx.strokeStyle = 'rgba(227,220,203,.6)'; ctx.lineWidth = 2; for (const ly of [-8, -14, -20]) { ctx.beginPath(); ctx.moveTo(-34, ly); ctx.lineTo(-20, ly); ctx.stroke(); } }
  ctx.restore();
}
function drawCheck(ctx, view) {
  background(ctx);
  if (view.arcs) { arcsPicture(ctx, view, view.scene === 'check-lower'); return; }
  panel(ctx, 60, 70, 880, 520);
  text(ctx, 'THE AERIALS RUN', 80, 96, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  kicker(ctx, 420, 300, 1.2, {flight: true});
  text(ctx, 'about 50°', 462, 305, {size: 18, colour: theme.accent, align: 'left'});
  text(ctx, 'inrun', 260, 150, {size: 16, colour: theme.text});
  text(ctx, 'landing hill', 660, 440, {size: 16, colour: theme.text});
  view.kicker.arcs.forEach((arc, i) => text(ctx, `At 50°, ${mph(arc.ms)} mph lands ${m1(arc.distance)}`, 920, 110 + i * 34, {size: 18, align: 'right', colour: i ? GREEN : theme.text}));
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    const ox = x + 30, oy = 320, px = 6;
    if (idea.id === 'angle') [15, 30, 45, 60, 75].forEach(angle => strokePath(ctx, toBoard(pathOf(angle, SHOW_MS), ox, oy, px), angle === 45 ? TRAIL : OLD, angle === 45 ? 3 : 2));
    if (idea.id === 'speed') [SLOW_MS, SHOW_MS, 22].forEach((ms, k) => {
      const pts = toBoard(pathOf(45, ms), ox, oy, px * .9), end = pts.at(-1);
      strokePath(ctx, pts, ARC_COLOURS[k], 3);
      ctx.fillStyle = ARC_COLOURS[k]; ctx.beginPath(); ctx.arc(end[0], end[1], 4, 0, Math.PI * 2); ctx.fill();
      text(ctx, `${mph(ms)} mph: ${m1(distanceOf(45, ms))}`, x + w / 2, oy + 22 + k * 20, {size: 15, colour: ARC_COLOURS[k], weight: 800});
    });
    if (idea.id === 'lower') kicker(ctx, x + 150, 230, .5, {pose: 'tuck', flight: true});
    if (idea.id !== 'lower') { ctx.fillStyle = '#d9b24a'; ctx.fillRect(ox, oy - 1, w - 50, 3); }
    wrap(ctx, idea.text, x + w / 2, 430, w - 30);
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'launcher') drawLauncher(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: a ramp at an angle (over a lower landing too), a way to tilt, a guess on the tape, the kicker.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'ramp' || picture.kind === 'tilt') {
    const ox = w * .32, oy = h * (picture.lower ? .5 : .78), a = (picture.angle ?? 45) * Math.PI / 180, len = Math.min(70, h * .55);
    ctx.fillStyle = '#d9b24a'; ctx.fillRect(ox, (picture.lower ? h * .86 : oy) - 1, w - ox - 10, 3);
    if (picture.lower) { ctx.strokeStyle = theme.faint; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(w - 10, oy); ctx.stroke(); ctx.setLineDash([]); }
    // The ramp drawn rising to its lip at (ox, oy), pointing up at its angle.
    const draw = (t, colour) => { ctx.strokeStyle = colour; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ox - len * Math.cos(t), oy + len * Math.sin(t)); ctx.lineTo(ox, oy); ctx.stroke(); ctx.lineCap = 'butt'; };
    if (picture.kind === 'ramp') {
      draw(a, theme.brass[1]);
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 30 * Math.cos(a), oy - 30 * Math.sin(a)); ctx.stroke();
      text(ctx, `${picture.angle}°`, ox + 60, oy - 30, {size: 18, colour: theme.accent, weight: 800});
    } else {
      const ways = picture.way === 'either' ? [60, 30] : [picture.way === 'steeper' ? 60 : 30];
      draw(Math.PI / 4, OLD);
      for (const angle of ways) draw(angle * Math.PI / 180, theme.brass[1]);
      text(ctx, picture.way === 'either' ? '↑ or ↓' : picture.way === 'steeper' ? '↑' : '↓', ox + 70, oy - 40, {size: 22, colour: theme.accent, weight: 800});
    }
  }
  if (picture.kind === 'tape') {
    const x0 = 14, x1 = w - 14, at = d => x0 + d / 40 * (x1 - x0), y = h * .55;
    ctx.fillStyle = '#d9b24a'; ctx.fillRect(x0, y - 8, x1 - x0, 16);
    ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1;
    for (let d = 0; d <= 40; d += 5) { ctx.beginPath(); ctx.moveTo(at(d), y - 8); ctx.lineTo(at(d), y + (d % 10 ? 0 : 6)); ctx.stroke(); }
    const [before, guess] = picture.at;
    ctx.fillStyle = OLD; ctx.beginPath(); ctx.moveTo(at(before), y - 10); ctx.lineTo(at(before) - 7, y - 24); ctx.lineTo(at(before) + 7, y - 24); ctx.closePath(); ctx.fill();
    text(ctx, '45 mph', at(before), y - 34, {size: 12, colour: theme.ghost});
    ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(at(guess), y + 10); ctx.lineTo(at(guess) - 8, y + 26); ctx.lineTo(at(guess) + 8, y + 26); ctx.closePath(); ctx.fill();
    text(ctx, `${guess} m?`, at(guess), y + 38, {size: 13, colour: theme.accent, weight: 800});
  }
  if (picture.kind === 'kicker') {
    kicker(ctx, w * .5, h * .42, Math.min(.32, h / 330), {pose: {tuck: 'tuck', lean: 'lean', slow: 'stand'}[picture.what]});
  }
}

