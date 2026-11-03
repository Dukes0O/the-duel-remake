// The Downforce lesson's board (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md): the wind tunnel, with the fan blowing
// smoke past the Falcone F42 on its scale, a wing over its back and a rope at its nose with a drag gauge; the fan dial
// and the wing panel; and below, a close-up, the runs table or Brian's course. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {WINGS, WING_NAME, CAR_KG, kg, pushKg, topOf} from './downforce-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const CAR = '#c8402f', GREEN = '#9ff0b4', ORANGE = '#f0a24a';
// The tunnel: the fan on the left, the car facing it (nose left) on its scale, the post its rope is tied to.
const TUNNEL = Object.freeze({x: 30, y: 30, w: 560, h: 330, floor: 292});
const FAN = Object.freeze({x: 96, y: 178, r: 70});
const CAR_AT = Object.freeze({nose: 250, scale: 2.5});
const WING_AT = Object.freeze({x: 450, y: 168, chord: 92});
const POST_X = 196;
const TILT = Object.freeze({flat: 0, small: .2, big: .4});
const DIAL = Object.freeze({x: 610, y: 40, w: 350, h: 120, down: [690, 128], up: [880, 128]});
const WINGP = Object.freeze({x: 610, y: 176, w: 350, h: 170, flatter: [680, 314], steeper: [890, 314], at: [670, 785, 900], picY: 240});
// The readouts under the tunnel floor: the rope's gauge and the scale.
const ROPE_BOX = Object.freeze({x: 44, y: 304, w: 190, h: 50});
const SCALE_BOX = Object.freeze({x: 256, y: 304, w: 320, h: 50});
const tunnel = view => view.scene === 'tunnel';
const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const carGround = () => TUNNEL.floor - 16 * CAR_AT.scale;

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!tunnel(view)) return null;
  if (view.keys['↑'] === 'speed:up' && inBox(x, y, DIAL.up, 130, 48)) return {action: 'speed:up'};
  if (view.keys['↓'] === 'speed:down' && inBox(x, y, DIAL.down, 130, 48)) return {action: 'speed:down'};
  if (view.keys['→'] === 'wing:steeper' && view.wingPanel) {
    if (inBox(x, y, WINGP.steeper, 130, 40)) return {action: 'wing:steeper'};
    if (inBox(x, y, WINGP.flatter, 130, 40)) return {action: 'wing:flatter'};
    // A click on one of the three wings moves one notch toward it.
    const at = WINGS.indexOf(view.wingPanel.wing);
    const picked = WINGP.at.findIndex(cx => Math.abs(x - cx) < 55 && Math.abs(y - WINGP.picY) < 50);
    if (picked >= 0 && picked !== at) return {action: picked > at ? 'wing:steeper' : 'wing:flatter'};
  }
  if (view.keys.Space === 'go' && x > TUNNEL.x && x < TUNNEL.x + TUNNEL.w && y > TUNNEL.y && y < TUNNEL.floor) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!tunnel(view)) return null;
  if (view.dial && x > DIAL.x && x < DIAL.x + DIAL.w && y > DIAL.y && y < DIAL.y + DIAL.h) return view.dial.locked ? 'The fan dial: Brian has set it for this run.' : 'The fan dial: the wind 10 mph faster or slower a press.';
  if (view.wingPanel && x > WINGP.x && x < WINGP.x + WINGP.w && y > WINGP.y && y < WINGP.y + WINGP.h) return view.wingPanel.locked ? 'The wing: Brian has set it for this run.' : 'The wing: flat, tilted or steep, one notch a press.';
  if (Math.hypot(x - FAN.x, y - FAN.y) < FAN.r + 10) return 'The fan: it blows the wind past the car, as fast as the dial says.';
  if (x > ROPE_BOX.x && x < ROPE_BOX.x + ROPE_BOX.w && y > ROPE_BOX.y && y < ROPE_BOX.y + ROPE_BOX.h) return 'The rope’s gauge: how hard the air pushes the car back. That is drag.';
  if (x > SCALE_BOX.x && x < SCALE_BOX.x + SCALE_BOX.w && y > SCALE_BOX.y && y < SCALE_BOX.y + SCALE_BOX.h) return 'The scale: the car’s weight and the air pushing it down.';
  if (x > WING_AT.x - 60 && x < WING_AT.x + 60 && y > WING_AT.y - 40 && y < WING_AT.y + 40) return 'The wing on its stand over the back of the car.';
  if (x > CAR_AT.nose && x < CAR_AT.nose + 92 * CAR_AT.scale && y > carGround() - 60 && y < TUNNEL.floor) return `A Falcone F42 on the scale: ${kg(CAR_KG)}.`;
  if (view.rows?.length && y > 376 && x < 960) return 'The runs: each one the fan made, with what the scale and the rope read.';
  return null;
}
export function targetPoint(view, action) {
  if (!tunnel(view)) return null;
  if (action === 'set:best' && view.best) {
    const w = view.wingPanel;
    if (w && !w.locked && w.wing !== view.best.wing) return WINGS.indexOf(w.wing) < WINGS.indexOf(view.best.wing) ? WINGP.steeper : WINGP.flatter;
    if (view.dial && !view.dial.locked && view.dial.speed !== view.best.speed) return view.dial.speed < view.best.speed ? DIAL.up : DIAL.down;
  }
  if (action === 'speed:up') return DIAL.up;
  if (action === 'speed:down') return DIAL.down;
  if (action === 'wing:steeper') return WINGP.steeper;
  if (action === 'wing:flatter') return WINGP.flatter;
  if (action === 'go') return [FAN.x, FAN.y];
  // Sparks fly from what the step is about.
  if (view.focus === 'rope') return [ROPE_BOX.x + ROPE_BOX.w / 2, ROPE_BOX.y + 20];
  if (view.focus === 'wing') return [WING_AT.x, WING_AT.y];
  return [SCALE_BOX.x + SCALE_BOX.w / 2, SCALE_BOX.y + 20];
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
// A Falcone F42 side on; x is the nose. facing -1 points it left (into the tunnel's wind).
function car(ctx, nose, y, scale = 1, {angle = 0, facing = 1} = {}) {
  ctx.save(); ctx.translate(nose, y); ctx.scale(facing, 1); ctx.rotate(-angle); ctx.scale(scale, scale);
  ctx.fillStyle = CAR; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, -4); ctx.lineTo(-30, -9); ctx.lineTo(-44, -20); ctx.lineTo(-66, -20); ctx.lineTo(-80, -9); ctx.lineTo(-92, -7); ctx.lineTo(-92, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c3a42'; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-46, -18); ctx.lineTo(-64, -18); ctx.lineTo(-74, -10); ctx.closePath(); ctx.fill();
  for (const wx of [-20, -74]) {
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 7, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 7, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// A racing wing side on: an aeroplane wing upside down (the curved side underneath), its back edge raised by the tilt.
function wingShape(ctx, x, y, chord, tilt, {fill = '#3a4349', edge = theme.iron[0]} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt);
  const h = chord * .16;
  ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-chord / 2, 0);
  ctx.quadraticCurveTo(-chord / 2, -h * .5, -chord / 4, -h * .45); ctx.lineTo(chord / 2, -h * .1);
  ctx.lineTo(chord / 2, h * .05); ctx.quadraticCurveTo(-chord / 6, h * 1.6, -chord / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function arrowLine(ctx, x0, y0, x1, y1, colour, width = 6) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 4) return;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, head = Math.min(16, len * .6);
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head * .8, y1 - uy * head * .8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * head * .6, y1 - uy * head + ux * head * .6); ctx.lineTo(x1 - ux * head + uy * head * .6, y1 - uy * head - ux * head * .6); ctx.closePath(); ctx.fill();
}
// Smoke lines from the fan, moving with the wind; behind a tilted wing the lines near it bend up.
function smoke(ctx, view, {x0, x1, rows, wingX, wingY, chord, tilt, clip}) {
  const r = view.rig, mph = r.mph;
  ctx.save(); ctx.beginPath(); ctx.rect(...clip); ctx.clip();
  ctx.lineWidth = 2.5; ctx.setLineDash([22, 14]);
  ctx.lineDashOffset = -(view.time * mph * 3.2) % 36;
  for (const y0 of rows) {
    const near = Math.max(0, 1 - Math.abs(y0 - wingY) / 70);
    ctx.strokeStyle = mph > 0 ? 'rgba(225,232,236,.55)' : 'rgba(225,232,236,.12)';
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let x = x0; x <= x1; x += 8) {
      const past = x - (wingX - chord / 2);
      const lift = past > 0 ? near * Math.tan(tilt) * Math.min(past, chord * 1.5) * .7 : 0;
      ctx.lineTo(x, y0 - lift);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function fan(ctx, view) {
  const {x, y, r} = FAN, on = view.rig.on && view.rig.mph > 0;
  ctx.fillStyle = '#1b2023'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(on ? view.time * view.rig.mph * .12 : 0);
  ctx.fillStyle = theme.iron[1];
  for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -r * .48, r * .15, r * .42, .35, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  text(ctx, on ? `FAN ${Math.round(view.rig.mph)} mph` : 'FAN OFF', x, y + r + 14, {size: 13, colour: on ? theme.accent : theme.faint, weight: 800});
  if (view.keys.Space === 'go') {
    ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 64, y - r - 26, 54, 22, 3); ctx.fill();
    ctx.fillStyle = '#1d2224'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Space', x - 37, y - r - 14);
    text(ctx, 'runs the fan', x - 2, y - r - 15, {size: 13, align: 'left'});
  }
}
function tunnelScene(ctx, view) {
  const r = view.rig, {x, y, w, floor} = TUNNEL, tilt = TILT[r.wing];
  ctx.fillStyle = 'rgba(10,14,16,.55)'; ctx.strokeStyle = theme.beamDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, TUNNEL.h, 10); ctx.fill(); ctx.stroke();
  // The floor and the scale's plate.
  ctx.fillStyle = theme.iron[2]; ctx.fillRect(x + 4, floor, w - 8, 8);
  const tail = CAR_AT.nose + 92 * CAR_AT.scale;
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(CAR_AT.nose - 6, floor - 6, tail - CAR_AT.nose + 12, 8);
  smoke(ctx, view, {x0: FAN.x + FAN.r + 6, x1: x + w - 10, rows: [70, 104, 138, 172, 206], wingX: WING_AT.x, wingY: WING_AT.y, chord: WING_AT.chord, tilt, clip: [x + 2, y + 2, w - 4, floor - y - 4]});
  fan(ctx, view);
  // The rope: from the post to the car's nose, with its gauge.
  const noseY = carGround() - 2;
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(POST_X - 5, noseY - 18, 10, floor - noseY + 18);
  ctx.strokeStyle = '#d8c79a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(POST_X, noseY - 6); ctx.lineTo(CAR_AT.nose, noseY); ctx.stroke();
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc((POST_X + CAR_AT.nose) / 2, noseY - 3, 9, 0, Math.PI * 2); ctx.fill();
  // The wing's two struts from the back of the car, then the car, then the wing.
  const deck = carGround() - 8 * CAR_AT.scale;
  ctx.strokeStyle = theme.iron[0]; ctx.lineWidth = 4;
  for (const sx of [WING_AT.x - 18, WING_AT.x + 18]) { ctx.beginPath(); ctx.moveTo(sx, deck); ctx.lineTo(sx, WING_AT.y + 4); ctx.stroke(); }
  car(ctx, CAR_AT.nose, carGround(), CAR_AT.scale, {facing: -1});
  wingShape(ctx, WING_AT.x, WING_AT.y, WING_AT.chord, tilt);
  // The push down from the wing, the drag back from the tail.
  if (r.push > .5) {
    const len = 14 + r.push * .2;
    arrowLine(ctx, WING_AT.x + 54, WING_AT.y - 30, WING_AT.x + 54, WING_AT.y - 30 + len, theme.good);
    text(ctx, `push ${kg(r.push)}`, WING_AT.x + 66, WING_AT.y - 40, {size: 15, align: 'left', colour: GREEN});
  }
  if (r.drag > .5) {
    const len = 14 + r.drag * .3, ay = carGround() - 22;
    arrowLine(ctx, tail + 6, ay, Math.min(x + w - 6, tail + 6 + len), ay, ORANGE);
    text(ctx, 'drag', tail + 10, ay - 18, {size: 15, align: 'left', colour: ORANGE});
  }
  // The readouts.
  panel(ctx, ROPE_BOX.x, ROPE_BOX.y, ROPE_BOX.w, ROPE_BOX.h);
  text(ctx, 'ROPE · DRAG', ROPE_BOX.x + 12, ROPE_BOX.y + 14, {size: 11, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, kg(r.drag), ROPE_BOX.x + ROPE_BOX.w / 2, ROPE_BOX.y + 34, {size: 22, colour: ORANGE, weight: 800});
  panel(ctx, SCALE_BOX.x, SCALE_BOX.y, SCALE_BOX.w, SCALE_BOX.h);
  text(ctx, 'SCALE', SCALE_BOX.x + 12, SCALE_BOX.y + 14, {size: 11, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, kg(r.scale), SCALE_BOX.x + 12, SCALE_BOX.y + 34, {size: 22, align: 'left', weight: 800});
  text(ctx, r.push > .5 ? `car ${kg(CAR_KG)} + push ${kg(r.push)}` : `the car, ${kg(CAR_KG)}`, SCALE_BOX.x + SCALE_BOX.w - 10, SCALE_BOX.y + 36, {size: 13, align: 'right', colour: r.push > .5 ? GREEN : theme.faint});
  if (view.focus === 'scale') glowBox(ctx, view, SCALE_BOX.x - 4, SCALE_BOX.y - 4, SCALE_BOX.w + 8, SCALE_BOX.h + 8);
  if (view.focus === 'rope') glowBox(ctx, view, ROPE_BOX.x - 4, ROPE_BOX.y - 4, ROPE_BOX.w + 8, ROPE_BOX.h + 8);
  if (view.focus === 'wing') glowBox(ctx, view, WING_AT.x - 64, WING_AT.y - 44, 128, 84);
}
function dial(ctx, view) {
  const d = view.dial, can = view.keys['↑'] === 'speed:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'FAN DIAL', DIAL.x + DIAL.w / 2, DIAL.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, `${d.speed} mph`, DIAL.x + DIAL.w / 2, DIAL.y + 52, {size: 30, weight: 800});
  for (const [way, label, key] of [['down', 'Slower', '↓'], ['up', 'Faster', '↑']]) {
    const [x, y] = DIAL[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 60, y - 20, 120, 40, 6); ctx.fill();
    text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 40, y, key);
    ctx.globalAlpha = 1;
  }
  if (d.locked) text(ctx, 'set by Brian', DIAL.x + DIAL.w - 12, DIAL.y + 18, {size: 12, align: 'right', colour: theme.faint});
}
function wingPanel(ctx, view) {
  const p = view.wingPanel, can = view.keys['→'] === 'wing:steeper';
  panel(ctx, WINGP.x, WINGP.y, WINGP.w, WINGP.h);
  text(ctx, 'WING', WINGP.x + WINGP.w / 2, WINGP.y + 18, {size: 12, colour: theme.faint, weight: 800});
  WINGS.forEach((wing, i) => {
    const cx = WINGP.at[i], on = wing === p.wing;
    if (on) { ctx.fillStyle = 'rgba(237,197,87,.16)'; ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(cx - 52, WINGP.picY - 34, 104, 82, 8); ctx.fill(); ctx.stroke(); }
    wingShape(ctx, cx, WINGP.picY, 64, TILT[wing], on ? {fill: theme.brass[2], edge: theme.brass[1]} : {});
    text(ctx, WING_NAME[wing], cx, WINGP.picY + 32, {size: 15, colour: on ? theme.accent : theme.text});
  });
  for (const [way, label, key] of [['flatter', 'Flatter', '←'], ['steeper', 'Steeper', '→']]) {
    const [x, y] = WINGP[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 60, y - 18, 120, 36, 6); ctx.fill();
    text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 40, y, key);
    ctx.globalAlpha = 1;
  }
  if (p.locked) text(ctx, 'set by Brian', WINGP.x + WINGP.w - 12, WINGP.y + 18, {size: 12, align: 'right', colour: theme.faint});
}

// ---- the lower half: a close-up for the words, the runs table, or Brian's course ----
const LOW = Object.freeze({x: 40, y: 376, w: 920, h: 284});
function closeWing(ctx, view) {
  const tilt = TILT[view.rig.wing], cx = 500, cy = 520;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE WING CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  smoke(ctx, view, {x0: LOW.x + 30, x1: LOW.x + LOW.w - 20, rows: [440, 480, 520, 560, 600], wingX: cx, wingY: cy, chord: 240, tilt, clip: [LOW.x + 2, LOW.y + 30, LOW.w - 4, LOW.h - 32]});
  wingShape(ctx, cx, cy, 240, tilt);
  text(ctx, 'wind →', LOW.x + 60, LOW.y + 44, {size: 15, colour: theme.text});
  if (tilt > 0) {
    arrowLine(ctx, cx + 170, cy - 30, cx + 240, cy - 30 - 120 * Math.tan(tilt), 'rgba(225,232,236,.85)', 4);
    text(ctx, 'air thrown up', cx + 250, cy - 50 - 120 * Math.tan(tilt), {size: 15, align: 'left'});
    arrowLine(ctx, cx, cy + 30, cx, cy + 30 + 60 * tilt / TILT.big + 14, theme.good);
    text(ctx, 'wing pushed down', cx + 14, cy + 72, {size: 15, align: 'left', colour: GREEN});
  } else text(ctx, 'Flat: the air goes straight past.', cx, cy + 80, {size: 17, colour: theme.faint});
}
function closeReadout(ctx, view, kind) {
  const r = view.rig;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  if (kind === 'rope') {
    text(ctx, 'THE ROPE’S GAUGE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
    const cx = 330, cy = 530, rad = 100, share = Math.min(1, r.drag / 60);
    ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 2;
    for (let k = 0; k <= 6; k++) { const a = Math.PI * (.75 + 1.5 * k / 6); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rad * .8, cy + Math.sin(a) * rad * .8); ctx.lineTo(cx + Math.cos(a) * rad * .95, cy + Math.sin(a) * rad * .95); ctx.stroke(); text(ctx, String(k * 10), cx + Math.cos(a) * rad * .64, cy + Math.sin(a) * rad * .64, {size: 13, colour: '#2b3236'}); }
    const a = Math.PI * (.75 + 1.5 * share);
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rad * .85, cy + Math.sin(a) * rad * .85); ctx.stroke();
    text(ctx, 'kg', cx, cy + 40, {size: 14, colour: '#2b3236'});
    text(ctx, `Drag: ${kg(r.drag)}`, 640, 500, {size: 32, colour: ORANGE, weight: 800});
    text(ctx, 'the air pushing the car back', 640, 544, {size: 18, colour: theme.text});
    return;
  }
  text(ctx, 'THE SCALE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, kg(r.scale), 500, 470, {size: 54, weight: 800});
  const barW = 700, x0 = 150, carW = barW * CAR_KG / (CAR_KG + 520);
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(x0, 540, carW, 34);
  text(ctx, `the car ${kg(CAR_KG)}`, x0 + carW / 2, 557, {size: 16});
  if (r.push > .5) {
    const pw = barW * r.push / (CAR_KG + 520);
    ctx.fillStyle = theme.good; ctx.fillRect(x0 + carW, 540, pw, 34);
    text(ctx, `+ push ${kg(r.push)}`, x0 + carW + pw + 10, 557, {size: 16, align: 'left', colour: GREEN});
  }
  text(ctx, r.push > .5 ? 'Only the air touches the car.' : 'The fan is off: the scale reads the car alone.', 500, 616, {size: 17, colour: theme.faint});
}
function table(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  const cols = [[90, 'Fan', 'left'], [250, 'Wing', 'left'], [520, 'Push down', 'right'], [700, 'Drag', 'right'], [900, 'Top speed', 'right']];
  text(ctx, 'THE RUNS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  for (const [x, label, align] of cols) text(ctx, label, x, LOW.y + 48, {size: 15, align, colour: theme.faint, weight: 800});
  if (!view.rows.length) text(ctx, 'No runs yet: Space runs the fan.', 500, LOW.y + 130, {size: 18, colour: theme.faint});
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, `${row.speed} mph`, 90, y, {size: 18, align: 'left'});
    text(ctx, WING_NAME[row.wing], 250, y, {size: 18, align: 'left'});
    text(ctx, kg(row.push), 520, y, {size: 18, align: 'right', colour: GREEN});
    text(ctx, kg(row.drag), 700, y, {size: 18, align: 'right', colour: ORANGE});
    text(ctx, `${row.top} mph`, 900, y, {size: 18, align: 'right'});
  });
}
// Brian's course: its card on the left, and the car driving the bend (holding, or sliding wide) or the straight.
function course(ctx, view) {
  const j = view.job, wing = view.wingPanel.wing;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · COURSE ${j.course} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, j.bend ? `A ${j.mph} mph bend` : 'One long straight', LOW.x + 24, LOW.y + 60, {size: 26, align: 'left'});
  text(ctx, j.bend ? `It needs ${kg(j.needKg)} of push.` : 'No bend: top speed is all.', LOW.x + 24, LOW.y + 96, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, `Your wing: ${WING_NAME[wing]}`, LOW.x + 24, LOW.y + 150, {size: 18, align: 'left'});
  text(ctx, `push at ${j.mph} mph: ${kg(pushKg(j.mph, wing))}`, LOW.x + 24, LOW.y + 182, {size: 17, align: 'left', colour: GREEN});
  text(ctx, `top speed: ${topOf(wing)} mph`, LOW.x + 24, LOW.y + 212, {size: 17, align: 'left'});
  // The course picture: x 470 to 950.
  ctx.save(); ctx.beginPath(); ctx.rect(462, LOW.y + 6, 492, LOW.h - 12); ctx.clip();
  ctx.fillStyle = '#3b3527'; ctx.fillRect(462, LOW.y + 6, 492, LOW.h - 12);
  const d = j.drive, u = d ? d.t : 0;
  if (j.bend) {
    const cx = 708, cy = LOW.y + LOW.h + 40, rad = 200;
    ctx.strokeStyle = '#23272a'; ctx.lineWidth = 56; ctx.beginPath(); ctx.arc(cx, cy, rad, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.arc(cx, cy, rad, Math.PI, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `${j.mph} mph`, cx, cy - rad + 70, {size: 20, colour: theme.accent});
    // Holding, the car follows the middle of the road; short of push it runs wide off the outside of the bend.
    const slide = d && !d.holds ? Math.max(0, u - .3) ** 1.4 * 140 : 0;
    const a = Math.PI + u * Math.PI * .75, r = rad + slide;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2 - (slide > 0 ? .5 * Math.min(1, slide / 80) : 0)); car(ctx, 26, 0, .56); ctx.restore();
    if (d && u >= 1) text(ctx, d.holds ? 'held its line' : 'slid wide', cx, cy - rad - 40 < LOW.y + 30 ? LOW.y + 40 : cy - rad - 40, {size: 22, colour: d.holds ? GREEN : theme.bad, weight: 800});
  } else {
    const y = LOW.y + 150;
    ctx.fillStyle = '#23272a'; ctx.fillRect(462, y - 30, 492, 60);
    ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(462, y); ctx.lineTo(954, y); ctx.stroke(); ctx.setLineDash([]);
    car(ctx, 540 + u * 380, y + 4, .7);
    if (d) text(ctx, `${Math.round(topOf(d.wing) * Math.min(1, u * 1.3))} mph`, 708, y + 70, {size: 26, colour: theme.accent, weight: 800});
  }
  ctx.restore();
}

function drawTunnel(ctx, view) {
  background(ctx);
  tunnelScene(ctx, view);
  if (view.dial) dial(ctx, view);
  if (view.wingPanel) wingPanel(ctx, view);
  if (view.low === 'course' && view.job) course(ctx, view);
  else if (view.low === 'wing') closeWing(ctx, view);
  else if (view.low === 'scale' || view.low === 'rope') closeReadout(ctx, view, view.low);
  else table(ctx, view);
  // The glow on what to use next.
  if (view.glow === 'fan' || view.glow === 'set' && view.target === 'go') glowBox(ctx, view, FAN.x - FAN.r - 8, FAN.y - FAN.r - 8, 2 * FAN.r + 16, 2 * FAN.r + 16);
  const wingNext = view.wingPanel && !view.wingPanel.locked && view.best && view.wingPanel.wing !== view.best.wing;
  if (view.glow === 'wing' || view.glow === 'set' && view.target === 'set:best' && wingNext) glowBox(ctx, view, WINGP.x - 4, WINGP.y - 4, WINGP.w + 8, WINGP.h + 8);
  else if (view.glow === 'set' && view.target === 'set:best' && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
}

// The questions: two pushes (shown once answered), three bends, and the Tune page's row.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.pushes) {
    view.pushes.forEach((p, i) => {
      const y = 240 + i * 150;
      text(ctx, `Steep wing at ${p.speed} mph`, 60, y - 50, {size: 20, align: 'left'});
      ctx.fillStyle = '#23272a'; ctx.fillRect(60, y - 24, 880, 48);
      if (view.answered) { ctx.fillStyle = theme.good; ctx.fillRect(60, y - 24, 880 * p.kg / 520, 48); text(ctx, kg(p.kg), 70 + 880 * p.kg / 520, y, {size: 20, align: 'left', colour: GREEN}); }
      else text(ctx, '?', 500, y, {size: 26, colour: theme.faint});
    });
    return;
  }
  if (view.bends) {
    view.bends.forEach((b, i) => {
      const x = 180 + i * 320, y = 300;
      panel(ctx, x - 140, y - 140, 280, 260);
      text(ctx, `${b.mph} mph`, x, y - 110, {size: 22});
      bendPicture(ctx, x, y + 40, 90 - i * 0);
      if (view.answered) { arrowLine(ctx, x, y - 70, x, y - 60 + b.kg * .2, theme.good); text(ctx, `push ${kg(b.kg)}`, x, y + 100, {size: 20, colour: GREEN}); }
    });
    return;
  }
  const x = 170, y = 150, w = 660;
  panel(ctx, x, y, w, 260);
  text(ctx, 'THE TUNE PAGE · IN THE GARAGE', x + 20, y + 24, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, 'Wing angle', x + 20, y + 62, {size: 26, align: 'left'});
  [-2, -1, 0, 1, 2].forEach((stepNo, i) => {
    const bx = x + 20 + i * 126, on = stepNo === 2;
    ctx.fillStyle = on ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(bx, y + 90, 114, 44, 6); ctx.fill();
    if (on) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); }
    text(ctx, stepNo === 0 ? '0' : stepNo > 0 ? `+${stepNo}` : String(stepNo), bx + 57, y + 112, {size: 18});
  });
  text(ctx, 'Less wing', x + 20, y + 150, {size: 13, align: 'left', colour: theme.faint}); text(ctx, 'More wing', x + w - 20, y + 150, {size: 13, align: 'right', colour: theme.faint});
  if (view.tune.effect) wrap(ctx, view.tune.effect, x + w / 2, y + 200, w - 40);
  else text(ctx, 'Two steps toward More wing', x + w / 2, y + 205, {size: 20, colour: theme.faint});
}
// A bend seen from above, curving away, for the questions and the cards.
function bendPicture(ctx, x, y, size) {
  ctx.strokeStyle = '#23272a'; ctx.lineWidth = size * .3; ctx.beginPath(); ctx.arc(x, y + size * .3, size * .8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.arc(x, y + size * .3, size * .8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.setLineDash([]);
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'push') {
      // The steep wing's push at 50, 100 and 150 mph, to the same scale.
      [50, 100, 150].forEach((mph, k) => {
        const y = 130 + k * 70, kgNow = pushKg(mph, 'big');
        ctx.fillStyle = theme.good; ctx.fillRect(x + 30, y, kgNow * .46, 16);
        text(ctx, `${mph} mph: ${kg(kgNow)}`, x + 30, y - 14, {size: 15, align: 'left'});
      });
    }
    if (idea.id === 'drag') {
      WINGS.forEach((wing, k) => {
        const y = 140 + k * 66;
        wingShape(ctx, x + 70, y, 70, TILT[wing]);
        text(ctx, `${topOf(wing)} mph`, x + 150, y, {size: 20, align: 'left'});
      });
    }
    if (idea.id === 'choose') {
      bendPicture(ctx, x + 85, 230, 70);
      text(ctx, 'more wing', x + 85, 290, {size: 15, colour: GREEN});
      ctx.fillStyle = '#23272a'; ctx.fillRect(x + 160, 200, 120, 30);
      ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(x + 160, 215); ctx.lineTo(x + 280, 215); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'fast bends', x + 85, 170, {size: 14, colour: theme.faint}); text(ctx, 'long straights', x + 220, 170, {size: 14, colour: theme.faint});
      text(ctx, 'less wing', x + 220, 290, {size: 15, colour: theme.accent});
    }
    wrap(ctx, idea.text, x + w / 2, 400, w - 30);
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'tunnel') drawTunnel(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: two pushes as bars, a wing, a bend, and the race trade.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'push') {
    // Up to 520 kg across the card.
    const per = (w - 40) / 520;
    picture.kg.forEach((value, i) => {
      const y = 34 + i * 42;
      ctx.fillStyle = '#23272a'; ctx.fillRect(20, y - 13, w - 40, 26);
      ctx.fillStyle = i ? theme.accent : theme.good; ctx.fillRect(20, y - 13, Math.min(w - 40, value * per), 26);
    });
  }
  if (picture.kind === 'wing') {
    for (const y0 of [h * .3, h * .5, h * .7]) { ctx.strokeStyle = 'rgba(225,232,236,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, y0); ctx.lineTo(w - 10, y0); ctx.stroke(); }
    wingShape(ctx, w / 2, h / 2, Math.min(120, w * .55), TILT[picture.wing]);
  }
  if (picture.kind === 'bend') {
    bendPicture(ctx, w / 2, h * .62, Math.min(60, h * .55));
    text(ctx, `${picture.mph} mph`, w / 2, h * .62, {size: 15, colour: theme.accent});
  }
  if (picture.kind === 'game') {
    car(ctx, w / 2 + 50, h / 2 + 8, 1.1);
    if (picture.what === 'trade') { text(ctx, 'grip +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'speed −', w - 44, 30, {size: 16, colour: theme.bad}); }
    if (picture.what === 'both') { text(ctx, 'grip +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'speed +', w - 44, 30, {size: 16, colour: GREEN}); }
    if (picture.what === 'same') text(ctx, 'no change', w / 2, 30, {size: 16, colour: theme.faint});
  }
}
