// The G-force turning arm and its controls, drawn in the classroom workshop style.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;

const SPEED = Object.freeze({down: [690, 116], up: [910, 116]});
const RADIUS = Object.freeze({down: [690, 233], up: [910, 233]});
const RUN = [800, 354];
const ANSWER = Object.freeze({x: 590, y: 435, w: 350, h: 64, gap: 12});

const hit = (x, y, cx, cy, rx = 66, ry = 28) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;

function answerPoint(index) {
  return [ANSWER.x, ANSWER.y + index * (ANSWER.h + ANSWER.gap)];
}

export function hitTest(view, x, y) {
  if (view.keys.ArrowLeft && hit(x, y, ...SPEED.down)) return {action: 'speed:down'};
  if (view.keys.ArrowRight && hit(x, y, ...SPEED.up)) return {action: 'speed:up'};
  if (view.keys.ArrowDown && hit(x, y, ...RADIUS.down)) return {action: 'radius:down'};
  if (view.keys.ArrowUp && hit(x, y, ...RADIUS.up)) return {action: 'radius:up'};
  if (view.keys.Space && hit(x, y, ...RUN, 110, 30)) return {action: view.keys.Space};
  if (view.asking) {
    for (let index = 0; index < view.cards.length; index++) {
      if (hit(x, y, ...answerPoint(index), 170, 31)) return {action: view.cards[index].id};
    }
  }
  return null;
}

export function hoverInfo(view, x, y) {
  if (hit(x, y, 274, 390, 230, 230)) {
    return `The steel arm measures ${view.radiusM} m from its marked centre to the car.`;
  }
  if (hit(x, y, 415, 255, 100, 100)) {
    return `The cord leans away from the turn's centre. The meter reads ${view.g == null ? 'no result yet' : `${view.g.toFixed(2)} g`}.`;
  }
  if (hit(x, y, ...SPEED.down) || hit(x, y, ...SPEED.up)) {
    return `The speed dial reads ${view.speedKmh.toFixed(1)} km/h. Its arrows change the car's speed.`;
  }
  if (hit(x, y, ...RADIUS.down) || hit(x, y, ...RADIUS.up)) {
    return view.radiusKnown
      ? `The radius is ${view.radiusM} m from the centre of the turn to the car.`
      : 'The arm control moves the car inward or outward along the steel arm.';
  }
  if (hit(x, y, ...RUN, 120, 36)) return 'Run the selected speed and radius, then record the meter reading.';
  if (view.asking) {
    for (let index = 0; index < view.cards.length; index++) {
      if (hit(x, y, ...answerPoint(index), 170, 31)) return view.cards[index].label;
    }
  }
  if (x > 24 && x < 515 && y > 180 && y < 565) {
    return 'The car follows the steel arm around the marked centre.';
  }
  return null;
}

export function targetPoint(view, action) {
  if (action === 'set:best' && view.best) {
    if (view.setting !== view.best.speed) {
      return view.setting < view.best.speed ? SPEED.up : SPEED.down;
    }
    if (view.radiusM !== view.best.radius) {
      return view.radiusM < view.best.radius ? RADIUS.up : RADIUS.down;
    }
  }
  if (action === 'speed:up') return SPEED.up;
  if (action === 'speed:down') return SPEED.down;
  if (action === 'radius:up') return RADIUS.up;
  if (action === 'radius:down') return RADIUS.down;
  if (action === 'run') return RUN;
  if (action?.startsWith('answer:')) return answerPoint(Number(action.split(':')[1]));
  return [420, 250];
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(13,18,20,.91)';
  ctx.strokeStyle = theme.beamLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();
}

function plate(ctx, x, y, width, height, colour = '#333a3d') {
  ctx.fillStyle = colour;
  ctx.strokeStyle = '#8d969c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 7);
  ctx.fill();
  ctx.stroke();
  for (const [dx, dy] of [[11, 11], [width - 11, 11], [11, height - 11], [width - 11, height - 11]]) {
    ctx.fillStyle = theme.rivet;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function button(ctx, point, label, key, enabled) {
  const [x, y] = point;
  ctx.globalAlpha = enabled ? 1 : .38;
  ctx.fillStyle = '#252c2f';
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 58, y - 19, 116, 38, 6);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x + 10, y, {size: 14, weight: 800});
  keyCap(ctx, x - 37, y, key);
  ctx.globalAlpha = 1;
}

function arrow(ctx, x1, y1, x2, y2, colour, width = 4) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 11 * Math.cos(angle - .45), y2 - 11 * Math.sin(angle - .45));
  ctx.lineTo(x2 - 11 * Math.cos(angle + .45), y2 - 11 * Math.sin(angle + .45));
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'butt';
}

function car(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const paint = ctx.createLinearGradient(0, -18, 0, 21);
  paint.addColorStop(0, '#e4ded0');
  paint.addColorStop(.45, '#b6b1a5');
  paint.addColorStop(1, '#727879');
  ctx.fillStyle = paint;
  ctx.strokeStyle = '#1a2022';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-47, 14);
  ctx.lineTo(-45, 0);
  ctx.lineTo(-24, -3);
  ctx.lineTo(-11, -17);
  ctx.lineTo(21, -17);
  ctx.lineTo(34, -2);
  ctx.lineTo(48, 3);
  ctx.lineTo(46, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#415159';
  ctx.beginPath();
  ctx.moveTo(-11, -14);
  ctx.lineTo(0, -14);
  ctx.lineTo(0, -3);
  ctx.lineTo(-22, -3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -14);
  ctx.lineTo(19, -14);
  ctx.lineTo(28, -3);
  ctx.lineTo(4, -3);
  ctx.closePath();
  ctx.fill();
  for (const wheelX of [-29, 29]) {
    ctx.fillStyle = '#121617';
    ctx.beginPath();
    ctx.arc(wheelX, 14, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b3b9b8';
    ctx.beginPath();
    ctx.arc(wheelX, 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArm(ctx, view) {
  const centre = {x: 220, y: 420};
  const radius = 120 + Math.min(80, Math.max(0, view.radiusM - 25) * .55);
  const angle = -.55;
  const carX = centre.x + Math.cos(angle) * radius;
  const carY = centre.y + Math.sin(angle) * radius;

  ctx.strokeStyle = '#495257';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, angle - .44, angle + .44);
  ctx.stroke();
  ctx.strokeStyle = '#92999b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius + 13, angle - .44, angle + .44);
  ctx.stroke();

  ctx.strokeStyle = '#d7ab4f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(centre.x, centre.y);
  ctx.lineTo(carX, carY);
  ctx.stroke();
  ctx.strokeStyle = '#272d30';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(centre.x, centre.y);
  ctx.lineTo(carX, carY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#d9ae54';
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#30383b';
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'TURN CENTRE', centre.x, centre.y + 34, {size: 13, colour: '#f2d58a', weight: 800});

  const midX = (centre.x + carX) / 2;
  const midY = (centre.y + carY) / 2;
  panel(ctx, midX - 43, midY - 30, 92, 28);
  text(ctx, view.radiusKnown ? `${view.radiusM} m radius` : `${view.radiusM} m`, midX + 3, midY - 16, {size: 14, colour: '#f2d58a', weight: 800});

  // The cord slants outward from the turn centre, and its lean grows with the meter.
  const g = view.g == null ? 0 : view.g;
  const cordTop = {x: carX + 3, y: carY + 18};
  const lean = Math.min(48, g * 16);
  const cordEnd = {x: cordTop.x + lean, y: cordTop.y + 88};
  ctx.strokeStyle = '#ddd5c5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cordTop.x, cordTop.y);
  ctx.lineTo(cordTop.x, cordTop.y + 92);
  ctx.stroke();
  ctx.strokeStyle = '#dcae52';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cordTop.x, cordTop.y);
  ctx.lineTo(cordEnd.x, cordEnd.y);
  ctx.stroke();
  ctx.fillStyle = '#dcae52';
  ctx.beginPath();
  ctx.arc(cordEnd.x, cordEnd.y, 10, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'CORD LEAN', cordEnd.x + 28, cordEnd.y + 2, {size: 12, align: 'left', colour: '#f2d58a'});

  car(ctx, carX, carY, angle + .12);
  const speedStart = {x: carX - 11, y: carY - 22};
  arrow(ctx, speedStart.x, speedStart.y, speedStart.x + 78, speedStart.y - 5, '#79bce2', 4);
  text(ctx, 'SPEED', speedStart.x + 45, speedStart.y - 20, {size: 12, colour: '#a8d9f1'});

  // The sideways force points toward the centre; its length follows the g reading.
  const forceScale = view.g == null ? .15 : Math.min(1, view.g / 3);
  const forceLength = 28 + forceScale * 92;
  const forceAngle = angle + Math.PI;
  const forceStart = {x: carX - 2, y: carY + 32};
  arrow(ctx, forceStart.x, forceStart.y,
    forceStart.x + Math.cos(forceAngle) * forceLength,
    forceStart.y + Math.sin(forceAngle) * forceLength,
    '#ef7654', 5);
  text(ctx, 'SIDEWAYS PUSH', forceStart.x - 60, forceStart.y + 30, {size: 12, colour: '#ff9b7e'});
}

function drawSpeedPanel(ctx, view) {
  panel(ctx, 560, 62, 405, 104);
  text(ctx, 'SPEED', 592, 87, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, `${view.speedKmh.toFixed(1)} km/h`, 765, 92, {size: 25, weight: 900});
  button(ctx, SPEED.down, 'Slower', '←', Boolean(view.keys.ArrowLeft));
  button(ctx, SPEED.up, 'Faster', '→', Boolean(view.keys.ArrowRight));
}

function drawRadiusPanel(ctx, view) {
  panel(ctx, 560, 181, 405, 104);
  text(ctx, view.radiusKnown ? 'TURN RADIUS' : 'ARM LENGTH', 592, 206, {size: 14, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, `${view.radiusM} m`, 765, 211, {size: 25, weight: 900});
  button(ctx, RADIUS.down, 'Shorter', '↓', Boolean(view.keys.ArrowDown));
  button(ctx, RADIUS.up, 'Wider', '↑', Boolean(view.keys.ArrowUp));
}

function drawMeter(ctx, view) {
  panel(ctx, 560, 300, 405, 84);
  text(ctx, view.accelerationKnown ? 'SIDEWAYS ACCELERATION' : 'SIDEWAYS PUSH', 590, 323, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  text(ctx, view.g == null ? 'Predict the reading' : `${view.g.toFixed(2)} g`, 797, 342, {
    size: view.g == null ? 19 : 29,
    weight: 900,
    colour: view.g == null ? '#dfd8c6' : '#9ee7ab',
  });
  ctx.fillStyle = '#384344';
  ctx.fillRect(600, 365, 325, 7);
  if (view.g != null) {
    ctx.fillStyle = '#72c888';
    ctx.fillRect(600, 365, Math.min(325, Math.max(0, view.g / 3.5 * 325)), 7);
  }
  text(ctx, '0 g', 600, 376, {size: 11, align: 'left'});
  text(ctx, '3.5 g', 925, 376, {size: 11, align: 'right'});
}

function drawRunButton(ctx, view) {
  if (!view.keys.Space) return;
  button(ctx, RUN, 'Run turn', 'Space', true);
}

function drawAnswers(ctx, view) {
  view.cards.forEach((card, index) => {
    const [x, y] = answerPoint(index);
    const colour = card.state === 'right' ? '#28533a' : card.state === 'wrong' ? '#65352f' : '#252d30';
    panel(ctx, x - ANSWER.w / 2, y - ANSWER.h / 2, ANSWER.w, ANSWER.h);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x - ANSWER.w / 2 + 3, y - ANSWER.h / 2 + 3, ANSWER.w - 6, ANSWER.h - 6, 6);
    ctx.fill();
    wrap(ctx, card.label, x + 5, y, ANSWER.w - 74, {size: 16, line: 19, weight: 700});
    keyCap(ctx, x - ANSWER.w / 2 + 28, y, String(index + 1));
  });
}

function drawResults(ctx, view) {
  panel(ctx, 34, 538, 492, 116);
  text(ctx, 'RECORDED TURNS', 56, 558, {size: 13, align: 'left', weight: 900, colour: '#d6bd79'});
  if (!view.rows.length) {
    text(ctx, 'The table keeps completed turns for comparison.', 56, 594, {size: 14, align: 'left', weight: 600});
    return;
  }
  view.rows.slice(-3).forEach((item, index) => {
    const y = 580 + index * 22;
    const speed = Number(item.speed).toFixed(1);
    const label = `Run ${view.rows.length - Math.min(3, view.rows.length) + index + 1}: ${speed} km/h  ·  ${item.radius} m  ·  ${item.g} g`;
    text(ctx, label, 57, y, {size: 14, align: 'left', weight: 700});
  });
}

function glow(ctx, view) {
  if (!view.glow) return;
  const box = view.glow === 'speed'
    ? [558, 60, 409, 108]
    : view.glow === 'radius'
      ? [558, 179, 409, 108]
      : [558, 58, 410, 330];
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = .55 + .25 * Math.sin(view.time * 5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(...box, 10);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawBoard(ctx, view, width = BOARD.width, height = BOARD.height) {
  return fitBoard(ctx, width, height, () => {
    background(ctx);
    text(ctx, 'TURNING ARM WORKSHOP', 42, 32, {size: 15, align: 'left', weight: 900, colour: '#d5b65f'});
    text(ctx, 'THE CAR TURNS AROUND THE ARM', 274, 144, {size: 13, weight: 800, colour: '#d5b65f'});
    drawArm(ctx, view);
    drawSpeedPanel(ctx, view);
    drawRadiusPanel(ctx, view);
    drawMeter(ctx, view);
    drawRunButton(ctx, view);
    drawResults(ctx, view);
    drawAnswers(ctx, view);
    glow(ctx, view);
    text(ctx, 'The arm runs from its marked centre to the car.', 34, 674, {size: 12, align: 'left', colour: '#d8d3c7'});
  });
}

export function drawPicture(ctx, picture, width, height) {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#343c3f');
  gradient.addColorStop(1, '#1b2224');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#c6a75e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(width * .34, height * .56, Math.min(width, height) * .27, -.7, 1.2);
  ctx.stroke();
  ctx.fillStyle = '#d7ab4f';
  ctx.beginPath();
  ctx.arc(width * .34, height * .56, 7, 0, Math.PI * 2);
  ctx.fill();
  arrow(ctx, width * .54, height * .45, width * .82, height * .45, '#79bce2', 3);
  if (picture.g != null) text(ctx, `${Number(picture.g).toFixed(2)} g`, width * .5, height * .84, {size: 16, weight: 900});
  else wrap(ctx, 'Predict the meter reading.', width * .5, height * .84, width - 24, {size: 12, line: 15, weight: 700});
  ctx.restore();
}
