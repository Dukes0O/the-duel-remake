// A rear view of the suspension rig, with the car body leaning by its measured
// body-roll angle. The fixed key stays in the corner while the rig moves.
import {BOARD, theme, background, text, keyCap, fitBoard, wrap, steelPanel, steel, bolt, lcd, coilSpring, damper, forceArrowTo, tarmac, shadow} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const SOFT = [650, 205];
const STIFF = [850, 205];
const BUMPY = [650, 300];
const SMOOTH = [850, 300];
const RUN = [750, 392];
const hit = (x, y, [cx, cy], rx = 78, ry = 25) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
const within = (x, y, cx, cy, rx, ry) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;

export function hitTest(view, x, y) {
  if (view.asking) return null;
  for (const [point, action, key] of [
    [SOFT, 'spring:soft', '←'], [STIFF, 'spring:stiff', '→'],
    [BUMPY, 'road:bumpy', '↓'], [SMOOTH, 'road:smooth', '↑'], [RUN, 'run', 'Space'],
  ]) {
    if (hit(x, y, point, point === RUN ? 88 : 78, point === RUN ? 22 : 24) && view.keys[key]) return {action};
  }
  return null;
}

export function hoverInfo(view, x, y) {
  if (within(x, y, 275, 342, 185, 205)) return 'The outside spring compresses while the inside spring extends as the car body rolls.';
  if (hit(x, y, SOFT) || hit(x, y, STIFF)) return `The selected spring is ${view.setup.spring}. Choose spring stiffness for this run.`;
  if (hit(x, y, BUMPY) || hit(x, y, SMOOTH)) return `The selected road is ${view.setup.road}. Choose a road surface for this run.`;
  if (hit(x, y, RUN)) return 'Run the car over the selected road and record its readings.';
  return null;
}

export function targetPoint(view, action) {
  if (action?.startsWith('answer:')) return null;
  if (action === 'spring:soft') return SOFT;
  if (action === 'spring:stiff') return STIFF;
  if (action === 'road:bumpy') return BUMPY;
  if (action === 'road:smooth') return SMOOTH;
  if (action === 'run' || action === 'show') return RUN;
  return [275, 342];
}

function panel(ctx, x, y, width, height) { steelPanel(ctx, x, y, width, height); }

// A lit arrow along any direction; `width` is the shaft's width as the old flat arrows had it.
function arrow(ctx, x1, y1, x2, y2, colour, width = 4) { forceArrowTo(ctx, x1, y1, x2, y2, colour, width * 1.6); }

function fixedKey(ctx) {
  const entries = [['BODY', '#e5decd'], ['COMPRESS', '#edc557'], ['EXTEND', '#79bce2'], ['SIDEWAYS PUSH', '#ef7654']];
  entries.forEach(([label, colour], index) => {
    const y = 62 + index * 23;
    ctx.fillStyle = colour; ctx.fillRect(38, y - 6, 12, 12);
    text(ctx, label, 60, y, {size: 12, align: 'left', weight: 900, colour});
  });
}

// A steel suspension arm from (x1, y1) to (x2, y2): dark edge, lit steel body, a bright line along its top, a bolt at each end.
function suspensionArm(ctx, x1, y1, x2, y2) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x1 + 1.5, y1 + 2.5); ctx.lineTo(x2 + 1.5, y2 + 2.5); ctx.stroke();
  ctx.strokeStyle = '#69737a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = 'rgba(226,233,237,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y1 - 1.6); ctx.lineTo(x2, y2 - 1.6); ctx.stroke();
  ctx.lineCap = 'butt';
  bolt(ctx, x1, y1, 3); bolt(ctx, x2, y2, 3);
}

// The tyre seen end on: its tread face with the grooves and blocks of the pattern, lit from the left.
function tyreEndOn(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(x - 22, y - 33, 48, 69, 12); ctx.fill();
  const rubber = ctx.createLinearGradient(x - 24, 0, x + 24, 0); rubber.addColorStop(0, '#3b4346'); rubber.addColorStop(.4, '#1b2022'); rubber.addColorStop(1, '#07090a');
  ctx.fillStyle = rubber; ctx.beginPath(); ctx.roundRect(x - 24, y - 35, 48, 69, 12); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x - 24, y - 35, 48, 69, 12); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.65)'; for (const gx of [-12, 0, 12]) ctx.fillRect(x + gx - 1.3, y - 35, 2.6, 69);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let row = -33; row < 34; row += 6) for (const gx of [-18, -6, 6, 18]) ctx.fillRect(x + gx - 3.6, y + row, 7.2, 3.4);
  const crown = ctx.createLinearGradient(0, y - 35, 0, y + 34); crown.addColorStop(0, 'rgba(255,255,255,.18)'); crown.addColorStop(.25, 'rgba(255,255,255,0)'); crown.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = crown; ctx.fillRect(x - 24, y - 35, 48, 69);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(x - 24, y - 35, 48, 69, 12); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 18, y - 33.5); ctx.lineTo(x + 8, y - 34.5); ctx.stroke();
}

// The Dusthawk from behind: a cream body with a green band, tail lamps, number plate, exhausts and a glass cabin.
function bodyFromBehind(ctx) {
  const lower = () => { ctx.beginPath(); ctx.roundRect(-142, -22, 284, 58, [10, 10, 18, 18]); };
  const cabin = () => {
    ctx.beginPath(); ctx.moveTo(-126, -22); ctx.lineTo(-102, -78); ctx.quadraticCurveTo(-98, -88, -86, -88); ctx.lineTo(86, -88); ctx.quadraticCurveTo(98, -88, 102, -78); ctx.lineTo(126, -22); ctx.closePath();
  };
  const paint = ctx.createLinearGradient(0, -88, 0, 36); paint.addColorStop(0, '#f6f0df'); paint.addColorStop(.3, '#d9d2c0'); paint.addColorStop(.7, '#aaa393'); paint.addColorStop(1, '#5b574e');
  ctx.fillStyle = paint; cabin(); ctx.fill(); lower(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2.2; cabin(); ctx.stroke(); lower(); ctx.stroke();
  // The glass: the sky and the lamp in it, the headrests dark behind it.
  const glass = ctx.createLinearGradient(0, -80, 0, -26); glass.addColorStop(0, '#9fbac5'); glass.addColorStop(.5, '#4d6a79'); glass.addColorStop(1, '#16252d');
  const glassPath = () => { ctx.beginPath(); ctx.moveTo(-112, -27); ctx.lineTo(-92, -73); ctx.quadraticCurveTo(-89, -79, -80, -79); ctx.lineTo(80, -79); ctx.quadraticCurveTo(89, -79, 92, -73); ctx.lineTo(112, -27); ctx.closePath(); };
  ctx.fillStyle = glass; glassPath(); ctx.fill();
  ctx.save(); glassPath(); ctx.clip();
  ctx.fillStyle = 'rgba(12,16,18,.6)'; for (const hx of [-44, 44]) { ctx.beginPath(); ctx.roundRect(hx - 15, -64, 30, 22, 8); ctx.fill(); ctx.fillRect(hx - 5, -44, 10, 20); }
  ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.beginPath(); ctx.moveTo(-70, -80); ctx.lineTo(-46, -80); ctx.lineTo(-76, -26); ctx.lineTo(-100, -26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(-34, -80); ctx.lineTo(-24, -80); ctx.lineTo(-54, -26); ctx.lineTo(-64, -26); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2; glassPath(); ctx.stroke();
  ctx.fillStyle = '#f4efe0'; ctx.fillRect(-84, -88, 168, 1.4);
  // The shoulder catching the lamp, the green band with its gold line, the boot seam.
  ctx.strokeStyle = 'rgba(255,248,230,.5)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-132, -21); ctx.lineTo(132, -21); ctx.stroke();
  ctx.save(); lower(); ctx.clip();
  ctx.fillStyle = '#3b6646'; ctx.fillRect(-142, 22, 284, 5); ctx.fillStyle = '#d6a43a'; ctx.fillRect(-142, 27, 284, 1.6);
  ctx.fillStyle = '#17191a'; ctx.fillRect(-142, 29.6, 284, 8);
  ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let fx = -118; fx < 120; fx += 14) ctx.fillRect(fx, 30, 1.2, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-136, -4); ctx.lineTo(136, -4); ctx.moveTo(0, -22); ctx.lineTo(0, -4); ctx.stroke();
  ctx.restore();
  // The tail lamps: red lenses with a lighter band, a dark housing round each.
  for (const s of [-1, 1]) {
    const lx = s < 0 ? -136 : 76;
    ctx.fillStyle = '#18090a'; ctx.beginPath(); ctx.roundRect(lx - 1.5, -2.5, 63, 22, 4); ctx.fill();
    const lens = ctx.createLinearGradient(0, -1, 0, 17); lens.addColorStop(0, '#ff6a52'); lens.addColorStop(1, '#8c1d12');
    ctx.fillStyle = lens; ctx.beginPath(); ctx.roundRect(lx, -1, 60, 18, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,190,.5)'; ctx.fillRect(lx + 3, 2, 54, 2);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(lx + 30, -1, 1.4, 18);
  }
  // The number plate, with a few dark characters, and the two chrome exhaust tips.
  ctx.fillStyle = '#e8dd9a'; ctx.beginPath(); ctx.roundRect(-30, 0, 60, 22, 2.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(30,28,16,.75)'; for (let k = 0; k < 6; k++) ctx.fillRect(-24 + k * 8.6, 6, 5.4, 9);
  for (const ex of [-76, 76]) {
    const tip = ctx.createRadialGradient(ex - 1.5, 33, 1, ex, 34, 7); tip.addColorStop(0, '#f4f7f8'); tip.addColorStop(.6, '#8a949a'); tip.addColorStop(1, '#2d3336');
    ctx.fillStyle = tip; ctx.beginPath(); ctx.arc(ex, 33, 6.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0b0d0e'; ctx.beginPath(); ctx.arc(ex, 33, 3.6, 0, Math.PI * 2); ctx.fill();
  }
}

function carFromBehind(ctx, view) {
  const centreX = 275;
  const rollDegrees = Number(view.rollDeg ?? view.result?.leanDeg ?? 0);
  const roll = Math.min(8, Math.max(0, rollDegrees)) * Math.PI / 180;
  const roadBounce = view.setup.road === 'bumpy' ? Math.sin(view.time * 7) * 3 : Math.sin(view.time * 2) * .7;
  const bodyY = 272 + roadBounce;
  const wheelY = 414 + (view.setup.spring === 'soft' ? roadBounce * .6 : roadBounce * .25);
  // The body leans so that its left side drops: the left spring is the one that compresses, as the labels say. The body's
  // underside mounts (the springs' tops, the arms' pivots) move with it.
  const centreY = bodyY + 52, tilt = -roll;
  const at = (px, py) => [centreX + px * Math.cos(tilt) - py * Math.sin(tilt), centreY + px * Math.sin(tilt) + py * Math.cos(tilt)];

  // The wheels first, then the road over their feet, with the bumps the setting names and the car's shadow on it.
  for (const s of [-1, 1]) tyreEndOn(ctx, centreX + s * 90, wheelY);
  const roadTop = 446;
  tarmac(ctx, 70, roadTop, 410, 32);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(70, roadTop, 410, 2);
  if (view.setup.road === 'bumpy') {
    for (const [hx, hw, hh] of [[112, 20, 5], [236, 16, 4], [322, 22, 6], [436, 18, 5]]) {
      const hump = ctx.createLinearGradient(0, roadTop - hh, 0, roadTop + 3); hump.addColorStop(0, '#41444a'); hump.addColorStop(1, '#2a2c2f');
      ctx.fillStyle = hump; ctx.beginPath(); ctx.moveTo(hx - hw, roadTop + 2); ctx.quadraticCurveTo(hx, roadTop - hh * 2 + 2, hx + hw, roadTop + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - hw + 3, roadTop + 1); ctx.quadraticCurveTo(hx, roadTop - hh * 2 + 3, hx + hw - 3, roadTop + 1); ctx.stroke();
    }
  }
  steel(ctx, 64, roadTop - 2, 8, 36, 2); steel(ctx, 478, roadTop - 2, 8, 36, 2);
  shadow(ctx, centreX, roadTop + 6, 175, .6);

  // The axle: a differential housing and a drive shaft out to each hub.
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#20262a'; ctx.fillRect(Math.min(centreX + s * 18, centreX + s * 66), wheelY - 4, 48, 8);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(Math.min(centreX + s * 18, centreX + s * 66), wheelY - 4, 48, 1.4);
  }
  const diff = ctx.createRadialGradient(centreX - 8, wheelY - 8, 2, centreX, wheelY, 26); diff.addColorStop(0, '#8d979d'); diff.addColorStop(.6, '#434b50'); diff.addColorStop(1, '#171c1f');
  ctx.fillStyle = diff; ctx.beginPath(); ctx.ellipse(centreX, wheelY, 24, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.3; ctx.stroke();
  for (let k = 0; k < 6; k++) bolt(ctx, centreX + Math.cos(k * Math.PI / 3 + .5) * 15, wheelY + Math.sin(k * Math.PI / 3 + .5) * 10.5, 1.8);

  // The sub-frame under the body, then each side's lower arm, damper and spring, hub, and upper arm.
  ctx.save(); ctx.translate(centreX, centreY); ctx.rotate(tilt);
  steel(ctx, -74, 38, 148, 18, 3); for (const bx of [-62, -20, 20, 62]) bolt(ctx, bx, 47, 2.4);
  ctx.restore();
  for (const s of [-1, 1]) {
    const hubX = centreX + s * 68, [lowX, lowY] = at(s * 20, 52), [upX, upY] = at(s * 20, 40);
    const hubLow = wheelY + 16, hubUp = wheelY - 18;
    steel(ctx, hubX - 4, wheelY - 26, 8, 52, 2); bolt(ctx, hubX, wheelY - 20, 2); bolt(ctx, hubX, wheelY + 20, 2);
    suspensionArm(ctx, lowX, lowY, hubX, hubLow);
    // The spring and damper stand between the body's underside and the lower arm, a little inside the wheel.
    const t = (46 - 20) / (68 - 20), sx = centreX + s * 46, top = at(s * 46, 34)[1], bottom = lowY + t * (hubLow - lowY);
    damper(ctx, sx, top, bottom, {tube: 5.2, rod: 2.4});
    coilSpring(ctx, sx, top, bottom, {radius: 12, coils: 6, wire: 3.1, colour: s < 0 ? '#edc557' : '#79bce2'});
    suspensionArm(ctx, upX, upY, hubX, hubUp);
  }

  // The body, tilted by the roll.
  ctx.save(); ctx.translate(centreX, centreY); ctx.rotate(tilt);
  bodyFromBehind(ctx);
  ctx.restore();

  const push = 24 + rollDegrees * 2.2;
  arrow(ctx, centreX - 175, bodyY + 100, centreX - 175 - push, bodyY + 100, '#ef7654', 5);
  arrow(ctx, centreX + 175, bodyY + 100, centreX + 175 + push, bodyY + 100, '#ef7654', 5);
  text(ctx, `BODY ROLL ${rollDegrees.toFixed(1)}°`, centreX, 165, {size: 14, weight: 900, colour: '#edc557'});
  text(ctx, 'LEFT SPRING COMPRESSES', centreX - 105, 493, {size: 11, weight: 900, colour: '#edc557'});
  text(ctx, 'RIGHT SPRING EXTENDS', centreX + 105, 493, {size: 11, weight: 900, colour: '#79bce2'});
  fixedKey(ctx);
}

function button(ctx, [x, y], label, key, selected, enabled) {
  const width = 156, height = 44;
  ctx.globalAlpha = enabled ? 1 : .42;
  const face = ctx.createLinearGradient(0, y - height / 2, 0, y + height / 2);
  if (selected) { face.addColorStop(0, '#8a6a34'); face.addColorStop(.5, '#654c27'); face.addColorStop(1, '#3d2c12'); } else { face.addColorStop(0, '#3a4448'); face.addColorStop(.5, '#272f33'); face.addColorStop(1, '#161c1f'); }
  ctx.fillStyle = face; ctx.strokeStyle = selected ? theme.accent : '#778083'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - height / 2, width, height, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x - width / 2 + 6, y - height / 2 + 1.6, width - 12, 1);
  text(ctx, label, x + 10, y, {size: 13, weight: 800}); keyCap(ctx, x - 50, y, key); ctx.globalAlpha = 1;
}

function controls(ctx, view) {
  panel(ctx, 530, 72, 425, 278);
  text(ctx, 'CHOOSE THE TEST SETTINGS', 552, 97, {size: 14, align: 'left', weight: 900, colour: '#d5b65f'});
  text(ctx, 'SPRING', 552, 135, {size: 12, align: 'left', weight: 900});
  button(ctx, SOFT, 'Soft', '←', view.setup.spring === 'soft', Boolean(view.keys['←']));
  button(ctx, STIFF, 'Stiff', '→', view.setup.spring === 'stiff', Boolean(view.keys['→']));
  text(ctx, 'ROAD', 552, 245, {size: 12, align: 'left', weight: 900});
  button(ctx, BUMPY, 'Bumpy', '↓', view.setup.road === 'bumpy', Boolean(view.keys['↓']));
  button(ctx, SMOOTH, 'Smooth', '↑', view.setup.road === 'smooth', Boolean(view.keys['↑']));
  if (view.result && !view.asking) {
    lcd(ctx, 600, 327, 284, 20, theme.accent);
    text(ctx, `${view.setup.spring.toUpperCase()} SPRING · ${view.setup.road.toUpperCase()} ROAD`, 742, 338, {size: 11, weight: 900, colour: theme.accent});
  }
}

function runButton(ctx, view) {
  button(ctx, RUN, 'Run the rig', 'Sp', false, Boolean(view.keys.Space));
}

function results(ctx, view) {
  panel(ctx, 530, 435, 425, 220);
  text(ctx, 'RECORDED RUNS', 552, 461, {size: 13, align: 'left', weight: 900, colour: '#d5b65f'});
  lcd(ctx, 546, 474, 393, 166, '#a9d9aa');
  const lines = view.rows.slice(-4);
  if (!lines.length) {
    text(ctx, 'Run a setting pair to start the table.', 552, 505, {size: 13, align: 'left'});
    text(ctx, 'Shake · roll · tyre contact', 552, 531, {size: 12, align: 'left', colour: '#b8c2c3'});
    return;
  }
  lines.forEach((row, index) => {
    const y = 490 + index * 37;
    text(ctx, `${row.spring} · ${row.road}`, 552, y, {size: 13, align: 'left', weight: 800});
    text(ctx, `${row.shake} m/s²  |  ${row.roll}°  |  ${row.contact}%`, 552, y + 18, {size: 12, align: 'left', colour: '#a9d9aa'});
  });
}

function glow(ctx, view) {
  const box = view.glow === 'settings' ? [526, 68, 433, 286] : view.glow === 'spring' ? [565, 170, 370, 70] : null;
  if (!box) return;
  ctx.strokeStyle = theme.accent; ctx.globalAlpha = .6 + .2 * Math.sin(view.time * 5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(...box, 10); ctx.stroke(); ctx.globalAlpha = 1;
}

function recap(ctx, view) {
  const width = 300, gap = 24, left = 26;
  view.ideas.forEach((idea, index) => {
    const x = left + index * (width + gap);
    panel(ctx, x, 40, width, 600);
    text(ctx, String(index + 1), x + 25, 70, {size: 25, colour: theme.accent});
    wrap(ctx, idea.text, x + width / 2, 108, width - 42, {size: 17, weight: 600, line: 23});
    if (idea.id === 'spring') {
      lcd(ctx, x + 40, 352, width - 80, 78, '#a9d9aa'); lcd(ctx, x + 40, 444, width - 80, 78, '#a9d9aa');
      text(ctx, 'SOFT · BUMPY', x + width / 2, 374, {size: 14, weight: 900});
      text(ctx, '4.09 m/s² body shake', x + width / 2, 410, {size: 16, colour: '#a9d9aa'});
      text(ctx, 'STIFF · BUMPY', x + width / 2, 466, {size: 14, weight: 900});
      text(ctx, '4.77 m/s² body shake', x + width / 2, 502, {size: 16, colour: '#a9d9aa'});
    }
    if (idea.id === 'transfer') {
      arrow(ctx, x + 78, 398, x + 128, 398, '#ef7654', 5);
      arrow(ctx, x + 222, 398, x + 172, 398, '#ef7654', 5);
      text(ctx, 'SIDEWAYS PUSH', x + width / 2, 438, {size: 13, weight: 900, colour: '#ef7654'});
      text(ctx, 'OUTSIDE LOAD INCREASES', x + width / 2, 492, {size: 14, weight: 900, colour: '#edc557'});
    }
    if (idea.id === 'tradeoff') {
      lcd(ctx, x + 40, 352, width - 80, 78, '#a9d9aa'); lcd(ctx, x + 40, 444, width - 80, 78, '#a9d9aa');
      text(ctx, 'SOFT · THIS BEND', x + width / 2, 374, {size: 14, weight: 900});
      text(ctx, '6.5° body roll', x + width / 2, 410, {size: 17, colour: '#a9d9aa'});
      text(ctx, 'STIFF · THIS BEND', x + width / 2, 466, {size: 14, weight: 900});
      text(ctx, '2.2° body roll', x + width / 2, 502, {size: 17, colour: '#a9d9aa'});
    }
  });
}

export function drawBoard(ctx, view, width = BOARD.width, height = BOARD.height) {
  return fitBoard(ctx, width, height, () => {
    background(ctx);
    if (view.scene === 'recap') { recap(ctx, view); return; }
    text(ctx, 'SUSPENSION · REAR VIEW', 40, 29, {size: 15, align: 'left', weight: 900, colour: '#d5b65f'});
    carFromBehind(ctx, view); controls(ctx, view); runButton(ctx, view); results(ctx, view); glow(ctx, view);
  });
}

export function drawPicture(ctx, picture, width, height) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#343c3f'); gradient.addColorStop(1, '#1b2224');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  const cx = width * .5, cy = height * .48;
  const unknown = picture.shake == null || picture.roll == null;
  const tilt = unknown ? .12 : Math.min(.2, Number(picture.roll) * Math.PI / 180);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  ctx.fillStyle = '#b6b1a5'; ctx.strokeStyle = '#202729'; ctx.lineWidth = 2; ctx.fillRect(-60, -20, 120, 40); ctx.strokeRect(-60, -20, 120, 40);
  ctx.restore();
  text(ctx, unknown ? 'Reading?' : `${picture.shake.toFixed(2)} m/s²`, width * .5, height * .8, {size: 13, weight: 900});
  text(ctx, unknown ? 'Predict' : `${picture.roll.toFixed(1)}° roll`, width * .5, height * .18, {size: 12, weight: 900, colour: '#d9a640'});
  ctx.restore();
}
