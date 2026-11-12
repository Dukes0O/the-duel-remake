// The Downforce lesson's board (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md): the wind tunnel, with the fan blowing
// smoke past the Falcone F42 on its scale, a wing over its back and a rope at its nose with a drag gauge; the fan dial
// and the wing panel; and below, a close-up, the runs table or Brian's course. Draws and hit-tests only.
import {BOARD, theme, background, forceArrow, forceArrowTo, roadCar, ROAD_CAR_TOP, tarmac, steel, bolt, lcd, shade, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {WINGS, WING_NAME, CAR_KG, kg, kmh, pushKg, topOf} from './downforce-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const CAR = '#c8402f', GREEN = '#9ff0b4', ORANGE = '#f0a24a';
// The pictures' scales. The bars run to PUSH_TOP kg, a little over the steep wing's push at the top of the dial, and the
// rope's gauge runs to DRAG_TOP kg. The arrows in the tunnel are PUSH_PX and DRAG_PX board units long for each kilogram.
const PUSH_TOP = 200, DRAG_TOP = 120, PUSH_PX = .5, DRAG_PX = .78;
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
  if (view.dial && x > DIAL.x && x < DIAL.x + DIAL.w && y > DIAL.y && y < DIAL.y + DIAL.h) return view.dial.locked ? 'Brian has set the fan dial for this run.' : 'The fan dial sets how fast the fan blows the air past the car.';
  if (view.wingPanel && x > WINGP.x && x < WINGP.x + WINGP.w && y > WINGP.y && y < WINGP.y + WINGP.h) return view.wingPanel.locked ? 'Brian has set the wing for this run.' : 'Each press tilts the wing one notch: flat, tilted or steep.';
  if (Math.hypot(x - FAN.x, y - FAN.y) < FAN.r + 10) return 'The fan blows the air past the car at the speed on the dial.';
  if (x > ROPE_BOX.x && x < ROPE_BOX.x + ROPE_BOX.w && y > ROPE_BOX.y && y < ROPE_BOX.y + ROPE_BOX.h) return view.dragKnown ? 'The gauge on the rope reads how hard the air pushes the car back, which is the drag.' : 'The gauge on the rope reads how hard the air pushes the car back.';
  if (x > SCALE_BOX.x && x < SCALE_BOX.x + SCALE_BOX.w && y > SCALE_BOX.y && y < SCALE_BOX.y + SCALE_BOX.h) return 'The scale reads the car’s own kilograms and the push of the air together.';
  if (x > WING_AT.x - 60 && x < WING_AT.x + 60 && y > WING_AT.y - 40 && y < WING_AT.y + 40) return 'The wing stands on two struts over the back of the car.';
  if (x > CAR_AT.nose && x < CAR_AT.nose + 92 * CAR_AT.scale && y > carGround() - 60 && y < TUNNEL.floor) return `This Falcone F42 stands on the scale, and the car alone reads ${kg(CAR_KG)}.`;
  if (view.rows?.length && y > 376 && x < 960) return 'This table lists each run of the fan, with what the scale and the rope read.';
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
  if (view.focus === 'dial') return [DIAL.x + DIAL.w / 2, DIAL.y + 52];
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
function car(ctx, nose, y, scale = 1, {angle = 0, facing = 1, floorShadow = true} = {}) {
  roadCar(ctx, nose, y, {scale, colour: CAR, angle, facing, shadow: floorShadow});
}
// A racing wing side on, drawn with its true profile: an aeroplane wing upside down (the curved side underneath), thick
// near the front and thin at the back, its back edge raised by the tilt and a small lip on that edge.
function wingShape(ctx, x, y, chord, tilt, {fill = '#66737b', edge = theme.iron[0]} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt);
  const top = [], bottom = [], n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n, th = 5 * .135 * (.2969 * Math.sqrt(u) - .126 * u - .3516 * u * u + .2843 * u ** 3 - .1015 * u ** 4);
    const camber = u < .4 ? .05 / .16 * (.8 * u - u * u) : .05 / .36 * (.2 + .8 * u - u * u), px = -chord / 2 + u * chord, cy = (camber - .018) * chord;
    top.push([px, cy - th * chord]); bottom.push([px, cy + th * chord]);
  }
  const path = () => {
    ctx.beginPath(); ctx.moveTo(...top[0]);
    for (const p of top) ctx.lineTo(...p);
    ctx.lineTo(top[n][0] + chord * .012, top[n][1] - chord * .035);
    ctx.lineTo(bottom[n][0] + chord * .012, bottom[n][1]);
    for (let i = n; i >= 0; i--) ctx.lineTo(...bottom[i]);
    ctx.closePath();
  };
  const body = ctx.createLinearGradient(0, -chord * .1, 0, chord * .12);
  body.addColorStop(0, shade(fill, .45)); body.addColorStop(.35, fill); body.addColorStop(1, shade(fill, -.6));
  path(); ctx.fillStyle = body; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = Math.max(1, chord * .008); ctx.stroke();
  // The lamp's light along the upper surface, and the pivot the wing turns on.
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, chord * .01); ctx.beginPath();
  top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] + chord * .004) : ctx.moveTo(p[0], p[1] + chord * .004)); ctx.stroke();
  bolt(ctx, 0, 0, Math.max(1.2, chord * .018));
  ctx.restore();
}
// A label with a dark strip behind it, so that a smoke line running behind it does not cross the words.
function label(ctx, value, x, y, {size = 15, align = 'left', weight = 700, colour = theme.text} = {}) {
  ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
  const width = ctx.measureText(value).width, left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  ctx.fillStyle = 'rgba(14,20,24,.88)'; ctx.fillRect(left - 5, y - size * .75, width + 10, size * 1.5);
  text(ctx, value, x, y, {size, align, weight, colour});
}
function arrowLine(ctx, x0, y0, x1, y1, colour, width = 6) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 4) return;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, head = Math.min(16, len * .6);
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head * .8, y1 - uy * head * .8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * head * .6, y1 - uy * head + ux * head * .6); ctx.lineTo(x1 - ux * head + uy * head * .6, y1 - uy * head - ux * head * .6); ctx.closePath(); ctx.fill();
}
// Smoke lines from the fan, moving with the air. `rows` are heights above (negative) and below the wing. Each line arrives
// level and parts round the wing; a tilted wing turns the lines near it upward and they leave rising, so the picture shows
// the air being turned. A flat wing leaves every line level.
function smoke(ctx, view, {x0, x1, rows, wingX, wingY, chord, tilt, clip, most = chord * .55, hug = null}) {
  const r = view.rig, slope = Math.tan(tilt), half = chord / 2, frontX = wingX - half * Math.cos(tilt), frontY = wingY + half * Math.sin(tilt), reach = chord * 1.1;
  // The air is a set of streaks: the faster the fan, the longer and brighter they are and the faster they run.
  const live = r.on && r.ms > 0, share = Math.min(1, r.ms / 50), dash = live ? 10 + share * 34 : 22, gap = live ? 16 : 14;
  ctx.save(); ctx.beginPath(); ctx.rect(...clip); ctx.clip();
  ctx.lineCap = 'round'; ctx.setLineDash([dash, gap]);
  ctx.lineDashOffset = -(view.time * r.ms * 11.6) % (dash + gap);
  const stroke = path => {
    if (live) { ctx.strokeStyle = 'rgba(190,225,245,.10)'; ctx.lineWidth = 6; path(); ctx.strokeStyle = `rgba(224,241,250,${(.5 + share * .3).toFixed(2)})`; ctx.lineWidth = 2.2; path(); }
    else { ctx.strokeStyle = 'rgba(225,232,236,.12)'; ctx.lineWidth = 2.5; path(); }
  };
  for (const row of rows) {
    const above = row < 0, near = Math.max(0, 1 - Math.abs(row) / reach), from = above ? frontX - chord * .3 : wingX - chord * .1, ease = chord * .7;
    // A line under the wing dips round its low front edge first.
    const dip = above ? 0 : Math.max(0, frontY + chord * .06 - (wingY + row));
    stroke(() => {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) {
        const past = x - from, rise = past <= 0 ? 0 : past < ease ? past * past / (2 * ease) : past - ease / 2;
        const y = wingY + row - Math.min(most, near * slope * rise) + dip * Math.exp(-(((x - frontX) / (chord * .45)) ** 2));
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }
  // A line that hugs the car, rising over its roof and falling behind it (the caller gives its height).
  if (hug) stroke(() => { ctx.beginPath(); for (let x = x0; x <= x1; x += 6) x === x0 ? ctx.moveTo(x, hug(x)) : ctx.lineTo(x, hug(x)); ctx.stroke(); });
  ctx.restore();
}
// The air that hugs the car: level ahead of it, over the roof, and down behind it. x is a position in the tunnel.
function hugHeight(x) {
  const base = carGround() - 11 * CAR_AT.scale, sample = u => {
    const px = -(u - CAR_AT.nose) / CAR_AT.scale;
    if (px > 1.5 || px < -93.2) return base;
    for (let i = 1; i < ROAD_CAR_TOP.length; i++) if (px >= ROAD_CAR_TOP[i][0]) {
      const [x0, y0] = ROAD_CAR_TOP[i - 1], [x1, y1] = ROAD_CAR_TOP[i], k = (px - x0) / (x1 - x0);
      return Math.min(base, carGround() + (y0 + (y1 - y0) * k) * CAR_AT.scale - 7);
    }
    return base;
  };
  let sum = 0, count = 0;
  for (let d = -30; d <= 30; d += 6) { sum += sample(x + d); count++; }
  return sum / count;
}
// The tunnel's fan: a steel cowling on a stand, a duct, stator struts, seven blades and a hub. The blades smear into a disc
// as the fan speeds up.
function fan(ctx, view) {
  const {x, y, r} = FAN, on = view.rig.on && view.rig.ms > 0, speed = on ? Math.min(1, view.rig.ms / 50) : 0, turn = on ? view.time * view.rig.ms * .43 : 0;
  steel(ctx, x - 62, y + r - 12, 9, TUNNEL.floor - y - r + 14, 1.5); steel(ctx, x + 53, y + r - 12, 9, TUNNEL.floor - y - r + 14, 1.5);
  steel(ctx, x - 74, TUNNEL.floor - 4, 148, 6, 2);
  const ring = ctx.createLinearGradient(x - r, y - r, x + r, y + r); ring.addColorStop(0, '#c6ced3'); ring.addColorStop(.45, '#6d777d'); ring.addColorStop(1, '#262d31');
  ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  const duct = ctx.createRadialGradient(x, y, 8, x, y, r - 8); duct.addColorStop(0, '#0b0f11'); duct.addColorStop(.75, '#1a2024'); duct.addColorStop(1, '#394147');
  ctx.fillStyle = duct; ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 10; k++) bolt(ctx, x + Math.cos(k * Math.PI / 5) * (r - 4), y + Math.sin(k * Math.PI / 5) * (r - 4), 1.8);
  ctx.save(); ctx.translate(x, y);
  // The stator struts that hold the hub, behind the blades.
  ctx.strokeStyle = '#2d353a'; ctx.lineWidth = 3.5; ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (r - 9), Math.sin(a) * (r - 9)); } ctx.stroke();
  ctx.rotate(turn);
  if (speed > .3) {
    const disc = ctx.createRadialGradient(0, 0, 8, 0, 0, r - 10); disc.addColorStop(0, `rgba(200,212,220,${(.10 * speed).toFixed(2)})`); disc.addColorStop(1, `rgba(200,212,220,${(.28 * speed).toFixed(2)})`);
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(0, 0, r - 10, 0, Math.PI * 2); ctx.fill();
  }
  for (let k = 0; k < 7; k++) {
    ctx.save(); ctx.rotate(k * Math.PI * 2 / 7); ctx.globalAlpha = 1 - speed * .6;
    const blade = ctx.createLinearGradient(0, -r * .85, 0, 0); blade.addColorStop(0, '#9aa5ab'); blade.addColorStop(1, '#4b555b');
    ctx.fillStyle = blade; ctx.beginPath(); ctx.moveTo(-3.5, -10); ctx.bezierCurveTo(-13, -r * .4, -15, -r * .7, -8, -r + 14); ctx.bezierCurveTo(-1, -r + 11, 4, -r * .6, 6, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -r * .65); ctx.bezierCurveTo(-11, -r * .6, -8, -r * .8, -7, -r + 16); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.restore();
  const hub = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, 13); hub.addColorStop(0, theme.brass[0]); hub.addColorStop(.5, theme.brass[1]); hub.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - 3, y - 5, 4, 2.2, -.5, 0, Math.PI * 2); ctx.fill();
  label(ctx, on ? `FAN ${view.rig.kmh} km/h` : 'FAN OFF', x, y + r + 20, {size: 13, align: 'center', colour: on ? theme.accent : theme.faint, weight: 800});
  if (view.keys.Space === 'go') {
    ctx.fillStyle = '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 64, y - r - 26, 54, 22, 3); ctx.fill();
    ctx.fillStyle = '#1d2224'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Space', x - 37, y - r - 14);
    text(ctx, view.spaceWords ?? 'runs the fan', x - 2, y - r - 15, {size: 13, align: 'left'});
  }
}
// The steel frame round the tunnel's window, with a flange bolt at each corner and a glint of glass across it.
function tunnelFrame(ctx) {
  const {x, y, w, h} = TUNNEL;
  const edge = ctx.createLinearGradient(x, y, x, y + h); edge.addColorStop(0, '#8b959b'); edge.addColorStop(.5, '#4d565b'); edge.addColorStop(1, '#232a2d');
  ctx.strokeStyle = edge; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 8); ctx.stroke();
  for (const [bx, by] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10], [x + w / 2, y]]) bolt(ctx, bx, by, 2.4);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 8); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.beginPath(); ctx.moveTo(x + 60, y); ctx.lineTo(x + 130, y); ctx.lineTo(x + 40, y + h); ctx.lineTo(x - 30, y + h); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// A readout under the tunnel: a steel bezel round a dark lit window.
function readoutPanel(ctx, {x, y, w, h}) {
  steel(ctx, x - 3, y - 3, w + 6, h + 6, 6);
  lcd(ctx, x, y, w, h, '#9ff0b4');
  for (const [bx, by] of [[x - 0.5, y - 0.5], [x + w + .5, y - .5], [x - .5, y + h + .5], [x + w + .5, y + h + .5]]) bolt(ctx, bx, by, 1.4);
}
function tunnelScene(ctx, view) {
  const r = view.rig, {x, y, w, floor} = TUNNEL, tilt = TILT[r.wing];
  // The test section: a dark window with a grid on the back wall, the lamp's glow from above and the lit sheen of glass.
  const back = ctx.createLinearGradient(0, y, 0, y + TUNNEL.h); back.addColorStop(0, '#1a2429'); back.addColorStop(1, '#0c1215');
  ctx.fillStyle = back; ctx.beginPath(); ctx.roundRect(x, y, w, TUNNEL.h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let gx = x + 40; gx < x + w; gx += 40) { ctx.moveTo(gx, y + 6); ctx.lineTo(gx, floor); }
  for (let gy = y + 40; gy < floor; gy += 40) { ctx.moveTo(x + 6, gy); ctx.lineTo(x + w - 6, gy); }
  ctx.stroke();
  const lamp = ctx.createRadialGradient(x + w / 2, y, 10, x + w / 2, y, 330); lamp.addColorStop(0, 'rgba(255,226,170,.16)'); lamp.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = lamp; ctx.fillRect(x, y, w, floor - y);
  // The floor, and the weighing platform the car stands on: a steel plate set flush in the floor on its load cells.
  const slab = ctx.createLinearGradient(0, floor, 0, floor + 8); slab.addColorStop(0, '#3b4348'); slab.addColorStop(1, '#171b1d');
  ctx.fillStyle = slab; ctx.fillRect(x + 4, floor, w - 8, 8);
  const tail = CAR_AT.nose + 92 * CAR_AT.scale;
  ctx.fillStyle = '#0b0d0e'; ctx.fillRect(CAR_AT.nose - 10, floor - 3, tail - CAR_AT.nose + 20, 12);
  steel(ctx, CAR_AT.nose - 8, floor - 1, tail - CAR_AT.nose + 16, 8, 1.5);
  for (const bx of [CAR_AT.nose + 2, tail - 2]) bolt(ctx, bx, floor + 3, 1.6);
  ctx.strokeStyle = '#15181a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CAR_AT.nose + 70, floor + 7); ctx.quadraticCurveTo(CAR_AT.nose + 72, floor + 11, SCALE_BOX.x + SCALE_BOX.w / 2 - 10, SCALE_BOX.y); ctx.stroke();
  smoke(ctx, view, {x0: FAN.x + FAN.r + 6, x1: x + w - 10, rows: [-98, -64, -30, 24], wingX: WING_AT.x, wingY: WING_AT.y, chord: WING_AT.chord, tilt, clip: [x + 2, y + 2, w - 4, floor - y - 4], hug: hugHeight});
  fan(ctx, view);
  // The rope: from the post to the car's nose, with its gauge.
  const noseY = carGround() - 2;
  steel(ctx, POST_X - 5, noseY - 18, 10, floor - noseY + 18, 2); steel(ctx, POST_X - 12, floor - 4, 24, 5, 2);
  ctx.strokeStyle = '#1b1e20'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(POST_X, noseY - 7, 3.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#d8c79a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(POST_X, noseY - 6); ctx.lineTo(CAR_AT.nose, noseY); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,44,20,.55)'; ctx.lineWidth = 3; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(POST_X, noseY - 6); ctx.lineTo(CAR_AT.nose, noseY); ctx.stroke(); ctx.setLineDash([]);
  const gx = (POST_X + CAR_AT.nose) / 2, gy = noseY - 3, rim = ctx.createLinearGradient(gx - 9, gy - 9, gx + 9, gy + 9);
  rim.addColorStop(0, theme.brass[0]); rim.addColorStop(.5, theme.brass[1]); rim.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(gx, gy, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8402e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 4, gy - 4.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(gx - 2, gy - 3.5, 3.5, 1.8, -.6, 0, Math.PI * 2); ctx.fill();
  // The wing's two struts from the back of the car, then the car, then the wing.
  const deck = carGround() - 8 * CAR_AT.scale;
  for (const sx of [WING_AT.x - 18, WING_AT.x + 18]) { steel(ctx, sx - 2.5, WING_AT.y + 4, 5, deck - WING_AT.y - 4, 1.5); }
  car(ctx, CAR_AT.nose, carGround(), CAR_AT.scale, {facing: -1});
  wingShape(ctx, WING_AT.x, WING_AT.y, WING_AT.chord, tilt);
  // The air leaving the wing, the push down from the wing and the drag back from the tail. The push and the drag arrows are
  // drawn to scale, so four times the push is an arrow four times as long. The white arrow rises behind the wing and carries
  // its own name, "air". The green push arrow points down onto the car, and its label sits beside its head, below the wing,
  // so that the word "push" cannot be read as the name of the rising white arrow.
  if (r.on && r.ms > 0 && tilt > 0) {
    const tx = WING_AT.x + WING_AT.chord / 2 * Math.cos(tilt), ty = WING_AT.y - WING_AT.chord / 2 * Math.sin(tilt) - 4, rise = 42 * Math.tan(tilt) * 1.3;
    arrowLine(ctx, tx + 2, ty, tx + 42, ty - rise, 'rgba(240,244,246,.95)', 3);
    label(ctx, 'air', tx + 50, ty - rise, {weight: 600});
  }
  if (r.push > .5) {
    forceArrow(ctx, WING_AT.x, WING_AT.y + 14, r.push * PUSH_PX, false, theme.good, 8);
    label(ctx, `push ${kg(r.push)}`, WING_AT.x + 28, WING_AT.y + 46, {colour: GREEN});
  }
  if (r.drag > .5 && view.dragKnown) {
    const ay = carGround() - 8;
    forceArrowTo(ctx, tail + 6, ay, Math.min(x + w - 6, tail + 6 + r.drag * DRAG_PX), ay, ORANGE, 7);
    text(ctx, 'drag', tail + 10, ay + 18, {size: 15, align: 'left', colour: ORANGE});
  }
  tunnelFrame(ctx);
  // The readouts, each in a steel bezel round a lit window.
  readoutPanel(ctx, ROPE_BOX);
  text(ctx, view.dragKnown ? 'ROPE · DRAG' : 'ROPE', ROPE_BOX.x + 12, ROPE_BOX.y + 14, {size: 11, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, kg(r.drag), ROPE_BOX.x + ROPE_BOX.w / 2, ROPE_BOX.y + 34, {size: 22, colour: ORANGE, weight: 800});
  readoutPanel(ctx, SCALE_BOX);
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
  text(ctx, `${d.kmh} km/h`, DIAL.x + DIAL.w / 2 - 54, DIAL.y + 52, {size: 30, weight: 800});
  text(ctx, `${d.ms.toFixed(2)} m/s`, DIAL.x + DIAL.w / 2 + 96, DIAL.y + 54, {size: 18, colour: theme.faint});
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
  const r = view.rig, tilt = TILT[r.wing], cx = 500, cy = 516, chord = 240, tx = cx + chord / 2 * Math.cos(tilt), ty = cy - chord / 2 * Math.sin(tilt);
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'THE WING CLOSE UP', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  smoke(ctx, view, {x0: LOW.x + 6, x1: LOW.x + LOW.w - 6, rows: [-104, -68, -34, 34, 68, 104], wingX: cx, wingY: cy, chord, tilt, clip: [LOW.x + 2, LOW.y + 30, LOW.w - 4, LOW.h - 32]});
  wingShape(ctx, cx, cy, chord, tilt);
  // The air arrives level and leaves turned upward; the air pushes back on the wing, down.
  arrowLine(ctx, LOW.x + 30, cy, LOW.x + 150, cy, 'rgba(240,244,246,.95)', 5);
  label(ctx, 'The air arrives level.', LOW.x + 30, cy - 22);
  if (tilt > 0) {
    arrowLine(ctx, tx + 10, ty - 6, tx + 100, ty - 6 - 90 * Math.tan(tilt), 'rgba(240,244,246,.95)', 5);
    label(ctx, 'The wing turns the air upward.', LOW.x + LOW.w - 16, LOW.y + 18, {align: 'right'});
    forceArrow(ctx, cx, cy + 34, r.push * 4.1, false, theme.good, 10);
    label(ctx, 'The air pushes the wing down.', cx + 20, cy + 62, {colour: GREEN});
    label(ctx, `push ${kg(r.push)}`, cx + 20, cy + 88, {size: 20, colour: GREEN, weight: 800});
  } else label(ctx, 'The flat wing does not turn the air, so the air does not push the wing down.', cx, LOW.y + LOW.h - 22, {size: 16, align: 'center'});
}
// The fan speed in km/h and in m/s, and a tape that shows how far the air moves during each second.
function closeSpeed(ctx, view) {
  const d = view.dial, x0 = 90, x1 = 910, most = 50, at = m => x0 + m / most * (x1 - x0), y = 590, flown = (view.time % 1) * d.ms;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, 'WHAT THE SPEED MEANS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, `${d.kmh} km/h`, 300, LOW.y + 56, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, 'is about the same as', 500, LOW.y + 58, {size: 16});
  text(ctx, `${d.ms.toFixed(2)} m/s`, 700, LOW.y + 56, {size: 34, colour: theme.accent, weight: 800});
  text(ctx, `During each second, the air moves ${d.ms.toFixed(2)} metres.`, 500, LOW.y + 104, {size: 18});
  ctx.fillStyle = '#d9b24a'; ctx.fillRect(x0, y - 4, x1 - x0, 8);
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1.5;
  for (let k = 0; k <= most; k += 10) { ctx.beginPath(); ctx.moveTo(at(k), y - 4); ctx.lineTo(at(k), y + 6); ctx.stroke(); text(ctx, `${k} m`, at(k), y + 22, {size: 14}); }
  arrowLine(ctx, at(0), y - 30, at(d.ms), y - 30, GREEN, 5);
  text(ctx, 'one second of air', at(d.ms / 2), y - 50, {size: 15, colour: GREEN});
  ctx.fillStyle = 'rgba(240,244,246,.9)'; ctx.beginPath(); ctx.arc(at(flown), y - 12, 7, 0, Math.PI * 2); ctx.fill();
}
function closeReadout(ctx, view, kind) {
  const r = view.rig;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  if (kind === 'rope') {
    text(ctx, 'THE ROPE’S GAUGE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
    const cx = 330, cy = 530, rad = 100, share = Math.min(1, r.drag / DRAG_TOP);
    ctx.fillStyle = theme.dial; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b3236'; ctx.lineWidth = 2;
    for (let k = 0; k <= 6; k++) { const a = Math.PI * (.75 + 1.5 * k / 6); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rad * .8, cy + Math.sin(a) * rad * .8); ctx.lineTo(cx + Math.cos(a) * rad * .95, cy + Math.sin(a) * rad * .95); ctx.stroke(); text(ctx, String(k * DRAG_TOP / 6), cx + Math.cos(a) * rad * .64, cy + Math.sin(a) * rad * .64, {size: 13, colour: '#2b3236'}); }
    const a = Math.PI * (.75 + 1.5 * share);
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rad * .85, cy + Math.sin(a) * rad * .85); ctx.stroke();
    text(ctx, 'kg', cx, cy + 40, {size: 14, colour: '#2b3236'});
    text(ctx, `Drag: ${kg(r.drag)}`, 640, 500, {size: 32, colour: ORANGE, weight: 800});
    text(ctx, 'the air pushing the car back', 640, 544, {size: 18, colour: theme.text});
    text(ctx, `Top speed with this wing: ${r.top} km/h`, 640, 590, {size: 20});
    return;
  }
  text(ctx, 'THE SCALE', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, kg(r.scale), 500, 470, {size: 54, weight: 800});
  const barW = 700, x0 = 150, carW = barW * CAR_KG / (CAR_KG + PUSH_TOP);
  ctx.fillStyle = theme.iron[1]; ctx.fillRect(x0, 540, carW, 34);
  text(ctx, `the car ${kg(CAR_KG)}`, x0 + carW / 2, 557, {size: 16});
  if (r.push > .5) {
    const pw = barW * r.push / (CAR_KG + PUSH_TOP);
    ctx.fillStyle = theme.good; ctx.fillRect(x0 + carW, 540, pw, 34);
    text(ctx, `+ push ${kg(r.push)}`, x0 + carW + pw + 10, 557, {size: 16, align: 'left', colour: GREEN});
  }
  text(ctx, r.push > .5 ? 'Only the air is pressing down on the car.' : r.on && r.ms > 0 ? 'A flat wing turns no air, so the scale reads the car alone.' : 'The fan is off, so the scale reads the car alone.', 500, 616, {size: 17});
}
function table(ctx, view) {
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  const cols = [[90, 'Fan', 'left'], [250, 'Wing', 'left'], [520, 'Push down', 'right'], [700, 'Drag', 'right'], [900, 'Top speed', 'right']];
  text(ctx, 'THE RUNS', LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.faint, weight: 800});
  for (const [x, label, align] of cols) text(ctx, label, x, LOW.y + 48, {size: 15, align, colour: theme.faint, weight: 800});
  if (!view.rows.length) text(ctx, 'There are no runs yet.', 500, LOW.y + 130, {size: 18, colour: theme.faint});
  const first = view.rows[0]?.push;
  view.rows.slice(-6).forEach((row, i) => {
    const y = LOW.y + 86 + i * 34;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(LOW.x + 10, y - 16, LOW.w - 20, 32);
    text(ctx, `${row.kmh} km/h`, 90, y, {size: 18, align: 'left'});
    text(ctx, WING_NAME[row.wing], 250, y, {size: 18, align: 'left'});
    text(ctx, kg(row.push), 520, y, {size: 18, align: 'right', colour: GREEN});
    if (view.times && first > 0 && row.push !== first) text(ctx, `about × ${Math.round(row.push / first)}`, 534, y, {size: 18, align: 'left', colour: theme.accent, weight: 800});
    text(ctx, kg(row.drag), 700, y, {size: 18, align: 'right', colour: ORANGE});
    text(ctx, `${row.top} km/h`, 900, y, {size: 18, align: 'right'});
  });
}
// Brian's course: its card on the left, and the car driving the bend (holding, or sliding wide) or the straight.
function course(ctx, view) {
  const j = view.job, wing = view.wingPanel.wing;
  panel(ctx, LOW.x, LOW.y, LOW.w, LOW.h);
  text(ctx, `BRIAN’S JOB · COURSE ${j.course} OF ${j.of}${j.done ? ' · DONE' : ''}`, LOW.x + 16, LOW.y + 18, {size: 12, align: 'left', colour: theme.accent, weight: 800});
  text(ctx, j.bend ? `A bend at ${j.kmh} km/h` : 'One long straight', LOW.x + 24, LOW.y + 60, {size: 26, align: 'left'});
  text(ctx, j.bend ? `It needs ${kg(j.needKg)} of push.` : 'There is no bend, so only top speed matters.', LOW.x + 24, LOW.y + 96, {size: 18, align: 'left', colour: theme.accent});
  text(ctx, `Your wing: ${WING_NAME[wing].toLowerCase()}`, LOW.x + 24, LOW.y + 150, {size: 18, align: 'left'});
  text(ctx, `push at ${j.kmh} km/h: ${kg(pushKg(j.speed, wing))}`, LOW.x + 24, LOW.y + 182, {size: 17, align: 'left', colour: GREEN});
  text(ctx, `top speed: ${topOf(wing)} km/h`, LOW.x + 24, LOW.y + 212, {size: 17, align: 'left'});
  // The course picture: x 470 to 950.
  ctx.save(); ctx.beginPath(); ctx.rect(462, LOW.y + 6, 492, LOW.h - 12); ctx.clip();
  // The ground round the road: dry earth, darker toward the bottom, with stones.
  const earth = ctx.createLinearGradient(0, LOW.y + 6, 0, LOW.y + LOW.h - 6); earth.addColorStop(0, '#4b4331'); earth.addColorStop(1, '#2b2619');
  ctx.fillStyle = earth; ctx.fillRect(462, LOW.y + 6, 492, LOW.h - 12);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = i % 3 ? 'rgba(0,0,0,.16)' : 'rgba(255,240,200,.07)'; ctx.fillRect(462 + (i * 53) % 492, LOW.y + 8 + (i * 37) % (LOW.h - 16), 2 + i % 3, 2); }
  const d = j.drive, u = d ? d.t : 0;
  if (j.bend) {
    const cx = 708, cy = LOW.y + LOW.h + 40, rad = 200;
    const bend = (width, colour, dash = []) => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(cx, cy, rad, Math.PI, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); };
    bend(64, '#4d4a43'); bend(58, '#2a2c2f'); bend(14, 'rgba(0,0,0,.2)');
    for (const edge of [-25, 25]) { ctx.strokeStyle = 'rgba(235,230,214,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, rad + edge, Math.PI, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.arc(cx, cy, rad, Math.PI, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `${j.kmh} km/h`, cx, cy - rad + 70, {size: 20, colour: theme.accent});
    // Holding, the car follows the middle of the road; short of push it runs wide off the outside of the bend.
    const slide = d && !d.holds ? Math.max(0, u - .3) ** 1.4 * 140 : 0;
    const a = Math.PI + u * Math.PI * .75, r = rad + slide;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2 - (slide > 0 ? .5 * Math.min(1, slide / 80) : 0)); car(ctx, 26, 0, .56, {floorShadow: false}); ctx.restore();
    if (d && u >= 1) text(ctx, d.holds ? 'The car held the bend.' : 'The car slid wide.', cx, cy - rad - 40 < LOW.y + 30 ? LOW.y + 40 : cy - rad - 40, {size: 22, colour: d.holds ? GREEN : theme.bad, weight: 800});
  } else {
    const y = LOW.y + 150;
    tarmac(ctx, 462, y - 30, 492, 60);
    ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(462, y); ctx.lineTo(954, y); ctx.stroke(); ctx.setLineDash([]);
    car(ctx, 540 + u * 380, y + 4, .7);
    if (d) text(ctx, `${Math.round(topOf(d.wing) * Math.min(1, u * 1.3))} km/h`, 708, y + 70, {size: 26, colour: theme.accent, weight: 800});
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
  else if (view.low === 'speed') closeSpeed(ctx, view);
  else if (view.low === 'scale' || view.low === 'rope') closeReadout(ctx, view, view.low);
  else table(ctx, view);
  // The glow on what to use next.
  if (view.glow === 'fan' || view.glow === 'set' && view.target === 'go') glowBox(ctx, view, FAN.x - FAN.r - 8, FAN.y - FAN.r - 8, 2 * FAN.r + 16, 2 * FAN.r + 16);
  const wingNext = view.wingPanel && !view.wingPanel.locked && view.best && view.wingPanel.wing !== view.best.wing;
  if (view.glow === 'wing' || view.glow === 'set' && view.target === 'set:best' && wingNext) glowBox(ctx, view, WINGP.x - 4, WINGP.y - 4, WINGP.w + 8, WINGP.h + 8);
  else if (view.glow === 'dial' || view.glow === 'set' && view.target === 'set:best' && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
}

// The questions: two pushes (shown once answered), three bends, and the Tune page's row.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.pushes) {
    view.pushes.forEach((p, i) => {
      const y = 240 + i * 150;
      text(ctx, `The steep wing at ${p.kmh} km/h`, 60, y - 50, {size: 20, align: 'left'});
      ctx.fillStyle = '#23272a'; ctx.fillRect(60, y - 24, 880, 48);
      if (view.answered) { ctx.fillStyle = theme.good; ctx.fillRect(60, y - 24, 880 * p.kg / PUSH_TOP, 48); text(ctx, kg(p.kg), 70 + 880 * p.kg / PUSH_TOP, y, {size: 20, align: 'left', colour: GREEN}); }
      else text(ctx, '?', 500, y, {size: 26, colour: theme.faint});
    });
    return;
  }
  if (view.bends) {
    view.bends.forEach((b, i) => {
      const x = 180 + i * 320, y = 300;
      panel(ctx, x - 140, y - 140, 280, 260);
      text(ctx, `${b.name} at ${b.kmh} km/h`, x, y - 110, {size: 20});
      bendPicture(ctx, x, y + 40, [46, 72, 100][i]);
      if (view.answered) { arrowLine(ctx, x, y - 70, x, y - 60 + b.kg * PUSH_PX, theme.good); text(ctx, `push ${kg(b.kg)}`, x, y + 100, {size: 20, colour: GREEN}); }
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
  ctx.strokeStyle = '#4d4a43'; ctx.lineWidth = size * .3 + 4; ctx.beginPath(); ctx.arc(x, y + size * .3, size * .8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = '#2a2c2f'; ctx.lineWidth = size * .3; ctx.beginPath(); ctx.arc(x, y + size * .3, size * .8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
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
      // The steep wing's push at the watch's three speeds, to the same scale.
      [50, 100, 150].forEach((speed, k) => {
        const y = 130 + k * 70, kgNow = pushKg(speed, 'big');
        ctx.fillStyle = theme.good; ctx.fillRect(x + 30, y, kgNow * 240 / PUSH_TOP, 16);
        text(ctx, `${kmh(speed)} km/h: ${kg(kgNow)}`, x + 30, y - 14, {size: 15, align: 'left'});
      });
    }
    if (idea.id === 'drag') {
      WINGS.forEach((wing, k) => {
        const y = 140 + k * 66;
        wingShape(ctx, x + 70, y, 70, TILT[wing]);
        text(ctx, `${topOf(wing)} km/h`, x + 150, y, {size: 20, align: 'left'});
      });
    }
    if (idea.id === 'choose') {
      bendPicture(ctx, x + 85, 230, 70);
      text(ctx, 'more wing', x + 85, 290, {size: 15, colour: GREEN});
      tarmac(ctx, x + 160, 200, 120, 30);
      ctx.strokeStyle = 'rgba(245,240,220,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(x + 160, 215); ctx.lineTo(x + 280, 215); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'fast bends', x + 85, 170, {size: 14, colour: theme.faint}); text(ctx, 'long straights', x + 220, 170, {size: 14, colour: theme.faint});
      text(ctx, 'less wing', x + 220, 290, {size: 15, colour: theme.accent});
    }
    wrap(ctx, idea.text, x + w / 2, 380, w - 30, {size: 19, weight: 600});
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
    // Up to PUSH_TOP kg across the card.
    const per = (w - 40) / PUSH_TOP;
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
    text(ctx, `${picture.kmh} km/h`, w / 2, h * .62, {size: 15, colour: theme.accent});
  }
  if (picture.kind === 'game') {
    car(ctx, w / 2 + 50, h / 2 + 8, 1.1);
    if (picture.what === 'trade') { text(ctx, 'grip +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'speed −', w - 44, 30, {size: 16, colour: theme.bad}); }
    if (picture.what === 'both') { text(ctx, 'grip +', 40, 30, {size: 16, colour: GREEN}); text(ctx, 'speed +', w - 44, 30, {size: 16, colour: GREEN}); }
    if (picture.what === 'same') text(ctx, 'no change', w / 2, 30, {size: 16, colour: theme.faint});
  }
}
