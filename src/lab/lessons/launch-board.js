// The Launch angles lesson's board (docs/board/cards/LAB-CLASSROOM-LAUNCH.md): Brian's launcher side on, its ramp
// tilting about the lip, a skier flying its arc over a landing deck with a tape and a flag; the ramp panel and the
// speed dial; and below, a close-up, the launches table or Brian's mark card. Draws and hit-tests only.
import {BOARD, theme, background, shadow, steel, bolt, bezel, lcd, brassDial, glassGlare, tarmac, roadPost, groundFlag, forceArrowTo, shade, grain, labelPlate, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {pathOf, distanceOf, kmh, m1, deg, SHOW_MS, SLOW_MS} from './launch-classroom.js';
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
  if (view.ramp && inRect(x, y, RAMP)) return view.ramp.locked ? 'Brian has set the angle of the ramp for this launch.' : 'Each press tilts the ramp 5 degrees steeper or flatter.';
  if (view.dial && inRect(x, y, DIAL)) return view.dial.locked ? 'Brian has set the speed dial for this launch.' : 'The speed dial sets how fast the skier leaves the ramp.';
  if (inRect(x, y, TAPE_BOX)) return 'The tape shows how far from the end of the ramp the last skier landed.';
  if (view.flag && Math.abs(x - (LIP.x + view.flag * PX)) < 16 && y > DECK_Y - 50 && y < DECK_Y + 4) return `The flag stands ${view.flag} m from the end of the ramp.`;
  if (x > SCENE.x && x < LIP.x + 10 && y > DECK_Y - 60 && y < SCENE.y + SCENE.h) return `The ramp of the launcher is at ${deg(view.rig.angle)}, and its spring is set to ${view.rig.kmh} km/h.`;
  if (x > LIP.x && x < SCENE.x + SCENE.w && y > DECK_Y - 8 && y < DECK_Y + 22) return 'The landing deck is level with the end of the ramp and carries a tape marked in metres.';
  if (y > LOW.y && x < LOW.x + LOW.w) return view.job ? 'This card shows the flag to reach and what Brian has fixed.' : 'This table lists each launch with its angle, speed and distance.';
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
// A skier figure side on, flying along `dir` (radians, screen up is negative y): cream skis, boots, navy trousers, a blue jacket,
// a red helmet with goggles, and a pole held back along the body.
function skier(ctx, x, y, dir, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-dir); ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, colour, w) => {
    const trace = (dx, dy) => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)); ctx.stroke(); };
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = w + 1.6; trace(0, 0);
    ctx.strokeStyle = colour; ctx.lineWidth = w; trace(0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(.7, w * .25); trace(-w * .22, -w * .22);
  };
  ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(-14, 1); ctx.stroke();
  line([[-16, 4], [14, 4], [19, 1]], '#e8ecee', 2.6);
  ctx.fillStyle = '#1d2427'; ctx.beginPath(); ctx.roundRect(-5, -1, 9, 5, 1.5); ctx.fill();
  line([[-2, 2], [-4, -8]], '#26394d', 4.2);
  line([[-4, -8], [0, -16]], '#3d7fc2', 5.6);
  line([[-1, -13], [8, -9]], '#2f6aa6', 3);
  ctx.fillStyle = '#1d2427'; ctx.beginPath(); ctx.arc(8.4, -9, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0c27a'; ctx.beginPath(); ctx.arc(2, -21, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d84a36'; ctx.beginPath(); ctx.arc(1.6, -21.4, 4.9, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#15191b'; ctx.fillRect(3.4, -22.4, 3.4, 2.6); ctx.fillStyle = 'rgba(140,200,235,.8)'; ctx.fillRect(4, -22, 1.6, 1);
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-.5, -24.5, 1.6, .8, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.restore();
}
function flagPole(ctx, x, groundY, label) {
  groundFlag(ctx, x, groundY, FLAG, 44);
  if (label) text(ctx, label, x, groundY - 54, {size: 14, colour: FLAG, weight: 800});
}
// A flight's path in board units, from an origin and a scale.
const toBoard = (points, ox, oy, px) => points.map(([x, y, t]) => [ox + x * px, oy - y * px, t]);
function strokePath(ctx, pts, colour, width, dash = null) {
  if (pts.length < 2) return;
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash ?? []);
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
}
// The launcher: a steel frame with an engraved brass protractor behind its hinge, a steel ramp pivoting about its lip at the
// deck's edge, and a strut with its spring that sets the angle.
function launcher(ctx, angle) {
  const a = angle * Math.PI / 180, back = [LIP.x - ARM * Math.cos(a), LIP.y + ARM * Math.sin(a)], floorY = SCENE.y + SCENE.h - 6, R = 44;
  // The protractor: a quarter disc of brass under the hinge, engraved every 5 degrees from level to straight down.
  ctx.save(); ctx.translate(LIP.x, LIP.y);
  const brass = ctx.createRadialGradient(-12, 12, 4, 0, 0, R); brass.addColorStop(0, theme.brass[0]); brass.addColorStop(.6, theme.brass[1]); brass.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = brass; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,4,.7)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(40,24,4,.8)'; ctx.lineWidth = .9; ctx.beginPath();
  for (let d = 0; d <= 90; d += 5) { const c = Math.cos(d * Math.PI / 180), s = Math.sin(d * Math.PI / 180), len = d % 15 === 0 ? 10 : d % 5 === 0 ? 6 : 3; ctx.moveTo(-c * R, s * R); ctx.lineTo(-c * (R - len), s * (R - len)); }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R - 14, Math.PI / 2, Math.PI); ctx.stroke();
  ctx.restore();
  // The frame: a steel post on a base plate with two bolted feet, and a hinge lug at the top.
  shadow(ctx, LIP.x, floorY + 3, 52, .55);
  steel(ctx, LIP.x - 34, floorY - 8, 66, 8, 2); bolt(ctx, LIP.x - 28, floorY - 4, 2); bolt(ctx, LIP.x + 26, floorY - 4, 2);
  steel(ctx, LIP.x - 8, LIP.y + 4, 14, floorY - LIP.y - 12, 2);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(LIP.x + 2, LIP.y + 6, 4, floorY - LIP.y - 14);
  for (const by of [LIP.y + 14, LIP.y + 34, LIP.y + 54]) bolt(ctx, LIP.x - 1, by, 1.8);
  // The strut: a steel tube, a chrome rod and a brass spring, from the post to the middle of the ramp.
  const sx = LIP.x - 3, sy = floorY - 30, ex = (LIP.x + back[0]) / 2, ey = (LIP.y + back[1]) / 2, span = Math.hypot(ex - sx, ey - sy);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(ey - sy, ex - sx));
  const rod = ctx.createLinearGradient(0, -2, 0, 2); rod.addColorStop(0, '#f1f5f7'); rod.addColorStop(1, '#6d777d');
  ctx.fillStyle = rod; ctx.fillRect(span * .3, -1.8, span * .7, 3.6);
  for (let k = 0; k < 7; k++) { const cx = span * (.34 + k * .075); ctx.strokeStyle = 'rgba(40,24,4,.8)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(cx, -5.2); ctx.lineTo(cx + 3, 5.2); ctx.stroke(); ctx.strokeStyle = theme.brass[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, -5); ctx.lineTo(cx + 3, 5); ctx.stroke(); ctx.strokeStyle = 'rgba(255,240,190,.6)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(cx + .5, -4.6); ctx.lineTo(cx + 2, -1); ctx.stroke(); }
  steel(ctx, 0, -4.5, span * .3, 9, 2); bolt(ctx, 3, 0, 1.8);
  ctx.restore();
  bolt(ctx, ex, ey, 2.4);
  // The ramp: a steel plate with a lit top edge, grip ridges, a yellow and black lip and a hinge barrel at the pivot.
  ctx.save(); ctx.translate(LIP.x, LIP.y); ctx.rotate(-a);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-ARM + 2, 1.5, ARM, 4);
  steel(ctx, -ARM, -3.5, ARM, 7, 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let rx = -ARM + 6; rx < -10; rx += 6) ctx.fillRect(rx, -3.2, 1.4, 2);
  ctx.save(); ctx.beginPath(); ctx.rect(-12, -3.5, 12, 7); ctx.clip(); ctx.fillStyle = '#e0b23c'; ctx.fillRect(-12, -3.5, 12, 7);
  ctx.fillStyle = '#1a1c1d'; for (let rx = -16; rx < 0; rx += 6) { ctx.beginPath(); ctx.moveTo(rx, 3.5); ctx.lineTo(rx + 3, 3.5); ctx.lineTo(rx + 7, -3.5); ctx.lineTo(rx + 4, -3.5); ctx.closePath(); ctx.fill(); } ctx.restore();
  ctx.restore();
  const hinge = ctx.createRadialGradient(LIP.x - 1.5, LIP.y - 1.5, .5, LIP.x, LIP.y, 6.5); hinge.addColorStop(0, theme.brass[0]); hinge.addColorStop(.6, theme.brass[1]); hinge.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = hinge; ctx.beginPath(); ctx.arc(LIP.x, LIP.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.stroke(); bolt(ctx, LIP.x, LIP.y, 2);
}
// The ramp divides the speed: the forward arrow and the upward arrow at the end of the ramp, to one scale.
function splitArrows(ctx, angle, ms) {
  const a = angle * Math.PI / 180, forward = ms * Math.cos(a), upward = ms * Math.sin(a), scale = 6, x = LIP.x + 6, y = LIP.y - 8;
  forceArrowTo(ctx, x, y, x + forward * scale, y, TRAIL, 6);
  forceArrowTo(ctx, x, y, x, y - upward * scale, GREEN, 6);
  text(ctx, `forward ${forward.toFixed(1)} m/s`, LIP.x + 14 + forward * scale, LIP.y - 8, {size: 15, align: 'left', colour: TRAIL, weight: 800});
  text(ctx, `upward ${upward.toFixed(1)} m/s`, LIP.x + 14, LIP.y - 14 - upward * scale, {size: 15, align: 'left', colour: GREEN, weight: 800});
}
// The landing strip: tarmac with a painted yellow edge, white marks every 5 metres, a small post at every 10, and the metres.
function deck(ctx, view) {
  const right = SCENE.x + SCENE.w - 8;
  tarmac(ctx, LIP.x + 6, DECK_Y + 2, right - LIP.x - 6, 18);
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(LIP.x + 6, DECK_Y - 2, right - LIP.x - 6, 4); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(LIP.x + 6, DECK_Y - 2, right - LIP.x - 6, 1);
  ctx.strokeStyle = 'rgba(245,240,220,.8)'; ctx.lineWidth = 1.5;
  for (let d = 0; LIP.x + d * PX <= right; d += 5) {
    const x = LIP.x + d * PX;
    ctx.beginPath(); ctx.moveTo(x, DECK_Y + 2); ctx.lineTo(x, DECK_Y + (d % 10 ? 5 : 8)); ctx.stroke();
    if (d % 10 === 0 && d > 0) { roadPost(ctx, x, DECK_Y - 2, 9); text(ctx, `${d}`, x, DECK_Y + 13, {size: 11, colour: theme.text}); }
  }
  if (view.flag) flagPole(ctx, LIP.x + view.flag * PX, DECK_Y - 2, `${view.flag} m`);
}
// The scene's window: a cold dusk sky with hills and a line of firs behind the strip, over the dark of the launcher's pit.
function sceneBack(ctx) {
  const {x, y, w, h} = SCENE;
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 10); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, DECK_Y); sky.addColorStop(0, '#16222f'); sky.addColorStop(.6, '#2c3b50'); sky.addColorStop(.9, '#5a5062'); sky.addColorStop(1, '#8a6a6c');
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, DECK_Y - y);
  for (let k = 0; k < 18; k++) { ctx.fillStyle = `rgba(255,255,255,${(.15 + (k % 4) * .08).toFixed(2)})`; ctx.fillRect(x + 10 + grain(k + 800) * (w - 20), y + 6 + grain(k + 810) * 90, 1.3, 1.3); }
  const range = (base, height, colour, seed) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(x, DECK_Y); for (let hx = x; hx <= x + w; hx += 8) ctx.lineTo(hx, base - height * (.5 + .5 * Math.sin(hx * .021 + seed) * Math.cos(hx * .008 + seed * 2))); ctx.lineTo(x + w, DECK_Y); ctx.closePath(); ctx.fill(); };
  range(DECK_Y - 18, 56, '#4a4a66', 1.7); range(DECK_Y - 4, 34, '#262c3c', 4.3);
  ctx.fillStyle = '#0e1512';
  for (let k = 0; k < 24; k++) { const fx = x + 10 + k * 23 + (k % 3) * 5, fh = 20 + (k * 37) % 18; for (let tier = 0; tier < 3; tier++) { const ty = DECK_Y - 2 - fh + tier * fh * .26, tw = fh * .13 * (.6 + tier * .35); ctx.beginPath(); ctx.moveTo(fx, ty); ctx.lineTo(fx - tw, ty + fh * .42); ctx.lineTo(fx + tw, ty + fh * .42); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
  bezel(ctx, x, y, w, h, 10);
}
function launchScene(ctx, view) {
  const r = view.rig;
  sceneBack(ctx);
  deck(ctx, view);
  ctx.save(); ctx.beginPath(); ctx.rect(SCENE.x + 2, SCENE.y + 2, SCENE.w - 4, DECK_Y - SCENE.y); ctx.clip();
  // This step's earlier launches, faded, each marked where it landed with a small flag in the ground.
  for (const t of r.trails) {
    const pts = toBoard(pathOf(t.angle, t.ms), LIP.x, LIP.y, PX), top = pts.reduce((a, b) => b[1] < a[1] ? b : a);
    strokePath(ctx, pts, OLD, 2, [6, 6]);
    groundFlag(ctx, pts.at(-1)[0], DECK_Y - 2, '#8b959b', 20);
    text(ctx, deg(t.angle), top[0], top[1] - 10, {size: 13, colour: theme.ghost, weight: 800});
  }
  const f = r.flight;
  if (f) {
    const pts = toBoard(pathOf(f.angle, f.ms), LIP.x, LIP.y, PX).filter(p => p[2] <= f.t);
    ctx.save(); ctx.shadowColor = TRAIL; ctx.shadowBlur = 8; strokePath(ctx, pts, TRAIL, 3); ctx.restore();
    const at = pts.at(-1) ?? [LIP.x, LIP.y], before = pts.at(-2) ?? [LIP.x - Math.cos(f.angle * Math.PI / 180), LIP.y + Math.sin(f.angle * Math.PI / 180)];
    const dir = f.landed ? 0 : Math.atan2(-(at[1] - before[1]), at[0] - before[0]);
    if (f.landed) groundFlag(ctx, at[0], DECK_Y - 2, TRAIL, 24);
    skier(ctx, at[0], at[1] - 4, dir, .9);
    if (f.landed) text(ctx, m1(f.distance), at[0], at[1] - 40, {size: 16, colour: theme.accent, weight: 800});
  } else skier(ctx, LIP.x - 4, LIP.y - 6, r.angle * Math.PI / 180, .9);
  ctx.restore();
  launcher(ctx, f ? f.angle : r.angle);
  if (view.split && !f) splitArrows(ctx, r.angle, r.ms);
  text(ctx, `${deg(f ? f.angle : r.angle)} · ${f ? kmh(f.ms) : r.kmh} km/h`, LIP.x - 40, SCENE.y + 22, {size: 14, colour: theme.faint, weight: 800});
  if (view.keys.Space === 'go') {
    keyCap(ctx, SCENE.x + 30, SCENE.y + 48, 'Sp');
    text(ctx, 'Press Space to launch', SCENE.x + 46, SCENE.y + 48, {size: 13, align: 'left'});
  }
  // The tape's reading: the skier now landed, or the last one. The box is a tape measure's case with its steel tape along the top.
  panel(ctx, TAPE_BOX.x, TAPE_BOX.y, TAPE_BOX.w, TAPE_BOX.h);
  ctx.save(); ctx.beginPath(); ctx.roundRect(TAPE_BOX.x + 3, TAPE_BOX.y + 3, TAPE_BOX.w - 6, 5, 2); ctx.clip();
  const band = ctx.createLinearGradient(0, TAPE_BOX.y + 3, 0, TAPE_BOX.y + 8); band.addColorStop(0, '#f3d374'); band.addColorStop(1, '#b48d28');
  ctx.fillStyle = band; ctx.fillRect(TAPE_BOX.x + 3, TAPE_BOX.y + 3, TAPE_BOX.w - 6, 5);
  ctx.fillStyle = '#1d2224'; for (let tx = TAPE_BOX.x + 8; tx < TAPE_BOX.x + TAPE_BOX.w - 4; tx += 6) ctx.fillRect(tx, TAPE_BOX.y + 3, 1, (tx - TAPE_BOX.x) % 30 < 6 ? 4 : 2);
  ctx.restore();
  steel(ctx, TAPE_BOX.x + 2, TAPE_BOX.y + 2, 4, 7, 1.5);
  text(ctx, 'TAPE', TAPE_BOX.x + 12, TAPE_BOX.y + 14, {size: 11, align: 'left', colour: theme.faint, weight: 800});
  const last = f?.landed ? f.distance : f ? null : r.trails.at(-1)?.distance ?? null;
  text(ctx, last === null ? (f ? 'in the air' : '–') : m1(last), TAPE_BOX.x + 12, TAPE_BOX.y + 34, {size: 22, align: 'left', weight: 800, colour: last === null ? theme.faint : theme.text});
  if (view.flag && last !== null) {
    const diff = last - view.flag, on = Math.abs(diff) <= 2;
    text(ctx, on ? 'on the flag' : `${m1(Math.abs(diff))} ${diff < 0 ? 'short' : 'beyond'}`, TAPE_BOX.x + TAPE_BOX.w - 12, TAPE_BOX.y + 34, {size: 16, align: 'right', colour: on ? GREEN : theme.bad, weight: 800});
  } else if (view.flag) text(ctx, `flag at ${view.flag} m`, TAPE_BOX.x + TAPE_BOX.w - 12, TAPE_BOX.y + 34, {size: 15, align: 'right', colour: FLAG});
  if (view.focus === 'tape') glowBox(ctx, view, TAPE_BOX.x - 4, TAPE_BOX.y - 4, TAPE_BOX.w + 8, TAPE_BOX.h + 8);
}
// An engraved brass arc round (ox, oy) from level to `to` radians, with a tick every 15 degrees; the small ramp's angle in the panel.
function engravedArc(ctx, ox, oy, r, to) {
  const g = ctx.createLinearGradient(ox, oy - r, ox + r, oy); g.addColorStop(0, theme.brass[0]); g.addColorStop(.5, theme.brass[1]); g.addColorStop(1, theme.brass[2]);
  ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oy, r, -to, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,18,4,.8)'; ctx.lineWidth = .9; ctx.beginPath();
  for (let d = 0; d <= 90; d += 15) { const t = d * Math.PI / 180; if (t > to + .001) break; ctx.moveTo(ox + Math.cos(t) * (r - 5), oy - Math.sin(t) * (r - 5)); ctx.lineTo(ox + Math.cos(t) * (r + 2), oy - Math.sin(t) * (r + 2)); }
  ctx.stroke();
}
function rampPanel(ctx, view) {
  const p = view.ramp, can = view.keys['↑'] === 'angle:up', a = p.angle * Math.PI / 180;
  panel(ctx, RAMP.x, RAMP.y, RAMP.w, RAMP.h);
  text(ctx, 'RAMP ANGLE', RAMP.x + 16, RAMP.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  // A small ramp over a level line, with its angle marked on an engraved brass arc.
  const ox = RAMP.x + 40, oy = RAMP.y + 96;
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 76, oy); ctx.stroke();
  engravedArc(ctx, ox, oy, 40, Math.PI / 2);
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(-a); steel(ctx, 0, -3.5, 58, 7, 2); ctx.fillStyle = '#e0b23c'; ctx.fillRect(48, -3.5, 10, 7); ctx.restore();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 26, -a, 0); ctx.stroke();
  bolt(ctx, ox, oy, 3);
  lcd(ctx, RAMP.x + 240 - 62, RAMP.y + 40, 124, 60, '#edc557');
  text(ctx, deg(p.angle), RAMP.x + 240, RAMP.y + 76, {size: 40, weight: 800});
  button(ctx, RAMP.down, 'Flatter', '↓', can);
  button(ctx, RAMP.up, 'Steeper', '↑', can);
  if (p.locked) text(ctx, 'set by Brian', RAMP.x + RAMP.w - 12, RAMP.y + 18, {size: 12, align: 'right', colour: theme.faint});
}
function dialPanel(ctx, view) {
  const d = view.dial, can = view.keys['→'] === 'speed:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'SPEED DIAL', DIAL.x + 16, DIAL.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  lcd(ctx, DIAL.x + DIAL.w / 2 - 92, DIAL.y + 31, 184, 48, '#56d683');
  text(ctx, `${d.kmh} km/h`, DIAL.x + DIAL.w / 2, DIAL.y + 56, {size: 34, weight: 800});
  button(ctx, DIAL.down, 'Slower', '←', can);
  button(ctx, DIAL.up, 'Faster', '→', can);
  if (d.locked) text(ctx, 'set by Brian', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: theme.faint});
}

// ---- the lower half: a close-up for the words, the launches table, or Brian's mark ----
function closeAngle(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE LAUNCH ANGLE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cx = 330, cy = 630, rad = 210, a = view.ramp.angle * Math.PI / 180;
  tarmac(ctx, cx, cy, rad + 30, 12);
  const band = ctx.createLinearGradient(cx, cy - rad, cx + rad, cy); band.addColorStop(0, theme.brass[0]); band.addColorStop(.5, theme.brass[1]); band.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = band; ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, 0); ctx.arc(cx, cy, rad - 18, 0, -Math.PI / 2, true); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,4,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(30,18,4,.85)'; ctx.lineWidth = 1;
  for (let d = 0; d <= 90; d += 5) { const t = d * Math.PI / 180, len = d % 15 === 0 ? 14 : 7; ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * rad, cy - Math.sin(t) * rad); ctx.lineTo(cx + Math.cos(t) * (rad - len), cy - Math.sin(t) * (rad - len)); ctx.stroke(); }
  for (let d = 0; d <= 90; d += 15) { const t = d * Math.PI / 180; text(ctx, `${d}°`, cx + Math.cos(t) * (rad + 22), cy - Math.sin(t) * (rad + 18), {size: 13, colour: theme.faint}); }
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rad + 30, cy); ctx.stroke();
  text(ctx, 'level ground', cx + rad - 40, cy - 12, {size: 14, colour: theme.faint});
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a); shadow(ctx, rad / 2, 12, rad * .5, .3); steel(ctx, 0, -6, rad, 12, 3);
  ctx.fillStyle = '#e0b23c'; ctx.fillRect(rad - 22, -6, 22, 12); ctx.fillStyle = '#1a1c1d'; for (let rx = rad - 26; rx < rad; rx += 8) { ctx.beginPath(); ctx.moveTo(rx, 6); ctx.lineTo(rx + 4, 6); ctx.lineTo(rx + 10, -6); ctx.lineTo(rx + 6, -6); ctx.closePath(); ctx.fill(); }
  for (let rx = 20; rx < rad - 30; rx += 10) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(rx, -5.5, 1.6, 3); }
  ctx.restore();
  bolt(ctx, cx, cy, 5);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 70, -a, 0); ctx.stroke();
  text(ctx, `${view.ramp.angle} degrees`, 720, 500, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, 'how far the ramp points up', 720, 544, {size: 18});
  text(ctx, '0 is level; 90 is straight up', 720, 576, {size: 16, colour: theme.faint});
}
function closeSpeed(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE SPEED DIAL', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  const cx = 330, cy = 540, rad = 110, share = Math.min(1, view.dial.kmh / 90);
  brassDial(ctx, cx, cy, rad, 9);
  ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 2;
  for (let k = 0; k <= 6; k++) {
    const t = Math.PI * (.75 + 1.5 * k / 6);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * rad * .8, cy + Math.sin(t) * rad * .8); ctx.lineTo(cx + Math.cos(t) * rad * .95, cy + Math.sin(t) * rad * .95); ctx.stroke();
    text(ctx, String(k * 15), cx + Math.cos(t) * rad * .64, cy + Math.sin(t) * rad * .64, {size: 13, colour: '#2b3236'});
  }
  const t = Math.PI * (.75 + 1.5 * share);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 2, cy + 3); ctx.lineTo(cx + 2 + Math.cos(t) * rad * .85, cy + 3 + Math.sin(t) * rad * .85); ctx.stroke();
  ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * rad * .85, cy + Math.sin(t) * rad * .85); ctx.stroke();
  const hub = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8); hub.addColorStop(0, theme.brass[0]); hub.addColorStop(.6, theme.brass[1]); hub.addColorStop(1, theme.brass[2]); ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); bolt(ctx, cx, cy, 2);
  glassGlare(ctx, cx, cy, rad * .9);
  text(ctx, 'km/h', cx, cy + 44, {size: 14, colour: '#2b3236'});
  text(ctx, `${view.dial.kmh} km/h`, 680, 500, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, 'how fast the skier leaves the ramp', 680, 544, {size: 18});
}
function closeTape(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE TAPE CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  // 25 m to 45 m across the panel, a mark every metre.
  const x0 = 130, x1 = 870, from = 25, to = 45, at = d => x0 + (d - from) / (to - from) * (x1 - x0), y = 520;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x0 - 46, y - 20, x1 - x0 + 100, 52);
  const tape = ctx.createLinearGradient(0, y - 26, 0, y + 26); tape.addColorStop(0, '#f6d978'); tape.addColorStop(.45, '#d9b24a'); tape.addColorStop(1, '#8f6d1c');
  ctx.fillStyle = tape; ctx.fillRect(x0 - 50, y - 26, x1 - x0 + 100, 52); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0 - 50, y - 26, x1 - x0 + 100, 1.4); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 - 50, y + 24.6, x1 - x0 + 100, 1.4);
  steel(ctx, x0 - 62, y - 28, 12, 56, 2); steel(ctx, x1 + 50, y - 28, 12, 56, 2);
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
  if (!view.rows.length) text(ctx, 'There are no launches yet. Press Space to launch.', 500, LOW.y + 130, {size: 18, colour: theme.faint});
  const best = view.rows.length > 2 ? Math.max(...view.rows.map(r => r.distance)) : null;
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, deg(row.angle), 110, y, {size: 18, align: 'left'});
    text(ctx, `${row.speed} km/h`, 300, y, {size: 18, align: 'left'});
    text(ctx, m1(row.distance), 560, y, {size: 18, align: 'right', colour: row.distance === best ? theme.accent : theme.text, weight: row.distance === best ? 800 : 700});
    if (view.flag) {
      const diff = row.distance - view.flag, on = Math.abs(diff) <= 2;
      text(ctx, on ? 'on the flag' : `${m1(Math.abs(diff))} ${diff < 0 ? 'short' : 'beyond'}`, 880, y, {size: 17, align: 'right', colour: on ? GREEN : theme.bad});
    }
  });
}
// Brian's mark: the card on the left, this job's last launches on the right.
function jobCard(ctx, view) {
  const j = view.job;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · MARK ${j.mark} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, `A flag at ${j.flag} m`, LOW.x + 24, LOW.y + 62, {size: 28, align: 'left'});
  const fixed = j.fixed === 'angle' ? `The ramp is fixed at ${deg(view.ramp.angle)}.` : j.fixed === 'speed' ? `The speed is fixed at ${view.dial.kmh} km/h.` : 'Angle and speed are yours.';
  text(ctx, fixed, LOW.x + 24, LOW.y + 100, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, j.fixed === 'angle' ? 'Set the speed.' : j.fixed === 'speed' ? 'Set the angle.' : 'Set both.', LOW.x + 24, LOW.y + 130, {size: 18, align: 'left'});
  text(ctx, 'Within 2 m of the flag counts.', LOW.x + 24, LOW.y + 172, {size: 15, align: 'left', colour: theme.faint});
  text(ctx, 'Your launches', 500, LOW.y + 48, {size: 15, align: 'left', colour: theme.faint, weight: 800});
  const rows = view.rows.slice(-5);
  if (!rows.length) text(ctx, 'There are no launches yet. Press Space to launch.', 500, LOW.y + 90, {size: 17, align: 'left', colour: theme.faint});
  rows.forEach((row, i) => {
    const y = LOW.y + 84 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(490, y - 16, 460, 32);
    text(ctx, `${deg(row.angle)}, ${row.speed} km/h`, 500, y, {size: 17, align: 'left'});
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
  steel(ctx, ox - 70, oy, 70, 590 - oy, 3); for (const by of [oy + 14, oy + 60, oy + 106]) if (by < 580) bolt(ctx, ox - 60, by, 2.4);
  tarmac(ctx, ox, landY - 2, 760, 12);
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(ox, landY - 2, 760, 3);
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
  text(ctx, `${kmh(SHOW_MS)} km/h`, ox - 35, oy - 20, {size: 15, colour: theme.faint});
}
// The Aerials kicker side on: the inrun down to a flat, the kicker rising to a lip that throws at about 50 degrees, and
// the landing hill falling away below it. (x, y) is the lip; pose is the skier's on the inrun: tuck, lean or stand.
function kicker(ctx, x, y, s, {pose = 'stand', flight = false} = {}) {
  const base = y + 30 * s, top = [x - 250 * s, y - 150 * s], foot = [x - 64 * s, base];
  const snowFill = ctx.createLinearGradient(0, top[1], 0, base + 200 * s); snowFill.addColorStop(0, '#f6fafc'); snowFill.addColorStop(.35, '#d6e3ea'); snowFill.addColorStop(1, '#8fa6b4');
  ctx.fillStyle = snowFill;
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
  view.kicker.arcs.forEach((arc, i) => text(ctx, `On the launcher at 50°, ${kmh(arc.ms)} km/h lands ${m1(arc.distance)}`, 920, 110 + i * 34, {size: 18, align: 'right', colour: i ? GREEN : theme.text}));
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, 40, w, 600);
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    const ox = x + 30, oy = 320, px = 6;
    if (idea.id === 'angle') [15, 30, 45, 60, 75].forEach(angle => strokePath(ctx, toBoard(pathOf(angle, SHOW_MS), ox, oy, px), angle === 45 ? TRAIL : OLD, angle === 45 ? 3 : 2));
    if (idea.id === 'speed') [SLOW_MS, SHOW_MS, 22].forEach((ms, k) => {
      const pts = toBoard(pathOf(45, ms), ox, oy, px * .9), end = pts.at(-1);
      strokePath(ctx, pts, ARC_COLOURS[k], 3);
      ctx.fillStyle = ARC_COLOURS[k]; ctx.beginPath(); ctx.arc(end[0], end[1], 4, 0, Math.PI * 2); ctx.fill();
      text(ctx, `${kmh(ms)} km/h: ${m1(distanceOf(45, ms))}`, x + w / 2, oy + 22 + k * 20, {size: 15, colour: ARC_COLOURS[k], weight: 800});
    });
    if (idea.id === 'lower') kicker(ctx, x + 150, 230, .5, {pose: 'tuck', flight: true});
    if (idea.id !== 'lower') { ctx.fillStyle = '#d9b24a'; ctx.fillRect(ox, oy - 1, w - 50, 3); }
    wrap(ctx, idea.text, x + w / 2, 440, w - 30, {size: 19, weight: 600});
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
    text(ctx, '72 km/h', at(before), y - 34, {size: 12, colour: theme.ghost});
    ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(at(guess), y + 10); ctx.lineTo(at(guess) - 8, y + 26); ctx.lineTo(at(guess) + 8, y + 26); ctx.closePath(); ctx.fill();
    text(ctx, `${guess} m?`, at(guess), y + 38, {size: 13, colour: theme.accent, weight: 800});
  }
  if (picture.kind === 'kicker') {
    kicker(ctx, w * .5, h * .42, Math.min(.32, h / 330), {pose: {tuck: 'tuck', lean: 'lean', slow: 'stand'}[picture.what]});
  }
}

