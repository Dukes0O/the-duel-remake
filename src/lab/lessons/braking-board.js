// The Braking lesson's board (docs/board/cards/LAB-CLASSROOM-BRAKING.md): the car close up on two weighing pads (the
// share of its weight on each end, the back tyre red when it locks), the speed dial and the brake lever, and an 80 m
// test strip where cars to scale arrive, brake at the line at real speed and stop, with a tape giving the metres.
// Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {m1, pct, metresFrom, FRONT_LOAD, REAR_LOAD, STEADY_FRONT, MIN_FRONT, MAX_FRONT} from './braking-classroom.js';
export {BOARD};
export const pressMovesDrag = false;

const CAR = '#c8402f';
// The close-up car (nose to the right) and its pads; the dial and the lever on the right.
const CLOSE = Object.freeze({nose: 470, ground: 250, scale: 3.2});
const DIAL = Object.freeze({x: 600, y: 52, w: 360, h: 120, down: [680, 140], up: [880, 140]});
const LEVER = Object.freeze({x: 600, y: 186, w: 360, h: 140, back: [650, 300], front: [910, 300], track: [660, 900], trackY: 262});
// The strip: brakes on at 0 m, a mark every 10 m, 80 m long.
const STRIP = Object.freeze({x0: 130, perM: 10, metres: 80, top: 400, bottom: 650});
const stripX = metres => STRIP.x0 + metres * STRIP.perM;
const laneY = (i, n) => n >= 3 ? 440 + i * 80 : 450 + i * 110;
const rig = view => view.scene === 'rig';
const inBox = (x, y, [cx, cy], w, h) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2;
const leverX = front => LEVER.track[0] + (front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * (LEVER.track[1] - LEVER.track[0]);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (!rig(view)) return null;
  if (view.keys['↑'] === 'speed:up' && inBox(x, y, DIAL.up, 120, 52)) return {action: 'speed:up'};
  if (view.keys['↓'] === 'speed:down' && inBox(x, y, DIAL.down, 120, 52)) return {action: 'speed:down'};
  if (view.keys['→'] === 'lever:front' && view.lever) {
    if (inBox(x, y, LEVER.front, 100, 44)) return {action: 'lever:front'};
    if (inBox(x, y, LEVER.back, 100, 44)) return {action: 'lever:back'};
    // A click on the track moves the lever one step toward where it was clicked.
    if (x > LEVER.track[0] - 20 && x < LEVER.track[1] + 20 && Math.abs(y - LEVER.trackY) < 30) return {action: x > leverX(view.lever.front) ? 'lever:front' : 'lever:back'};
  }
  if (view.keys.Space === 'go' && x > 90 && x < 950 && y > STRIP.top && y < STRIP.bottom) return {action: 'go'};
  return null;
}
export function hoverInfo(view, x, y) {
  if (!rig(view)) return null;
  if (view.dial && x > DIAL.x && x < DIAL.x + DIAL.w && y > DIAL.y && y < DIAL.y + DIAL.h) return view.dial.locked ? 'The speed dial: Brian has set it for this try.' : 'The speed dial: 10 mph faster or slower a press.';
  if (view.lever && x > LEVER.x && x < LEVER.x + LEVER.w && y > LEVER.y && y < LEVER.y + LEVER.h) return view.lever.locked ? 'The brake lever: Brian has set it for this try.' : 'The brake lever: how much of the braking the front and back brakes do, 10% a press.';
  if (view.close && y > CLOSE.ground - 8 && y < CLOSE.ground + 70 && x > 100 && x < 520) return 'Weighing pads: the share of the car’s weight on each end.';
  if (view.close && x > 150 && x < 500 && y > 110 && y < CLOSE.ground) return 'The car close up: a Falcone F42.';
  if (x > 90 && x < 950 && y > STRIP.top && y < STRIP.bottom) return 'The test strip, 80 m, drawn to scale: brakes on at the yellow line, a mark every 10 m.';
  return null;
}
export function targetPoint(view, action) {
  if (!rig(view)) return null;
  if (action === 'set:best' && view.best) {
    if (view.lever && !view.lever.locked && view.lever.front !== view.best.front) return view.lever.front < view.best.front ? LEVER.front : LEVER.back;
    if (view.dial && !view.dial.locked && view.dial.speed !== view.best.speed) return view.dial.speed < view.best.speed ? DIAL.up : DIAL.down;
  }
  if (action === 'speed:up') return DIAL.up;
  if (action === 'speed:down') return DIAL.down;
  if (action === 'lever:front') return LEVER.front;
  if (action === 'lever:back') return LEVER.back;
  if (action === 'go') return [stripX(4), laneY(0, Math.max(1, view.lanes.length))];
  // Sparks fly from the first car on the strip, or the car close up.
  const l = view.lanes[0];
  if (l) return [stripX(Math.max(0, l.metres)), laneY(0, view.lanes.length)];
  return [CLOSE.nose - 140, CLOSE.ground - 60];
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
// A Falcone F42 side on, nose to the right; x is the nose. locked: the back tyre red.
function car(ctx, nose, y, scale = 1, {angle = 0, locked = false} = {}) {
  ctx.save(); ctx.translate(nose, y); ctx.rotate(-angle); ctx.scale(scale, scale);
  ctx.fillStyle = CAR; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, -4); ctx.lineTo(-30, -9); ctx.lineTo(-44, -20); ctx.lineTo(-66, -20); ctx.lineTo(-80, -9); ctx.lineTo(-92, -7); ctx.lineTo(-92, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c3a42'; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-46, -18); ctx.lineTo(-64, -18); ctx.lineTo(-74, -10); ctx.closePath(); ctx.fill();
  for (const wx of [-20, -74]) {
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 7, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 7, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (locked) { ctx.strokeStyle = theme.bad; ctx.lineWidth = 2.5 / scale + .8; ctx.beginPath(); ctx.arc(-74, 7, 10.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
// The car close up on its two pads, each with the share of the weight it carries and an arrow sized to it.
function closeUp(ctx, view) {
  const c = view.close, {nose, ground, scale} = CLOSE, front = c.front, back = 1 - front;
  const wheel = wx => nose + wx * scale;
  for (const [wx, share, name] of [[-20, front, 'Front'], [-74, back, 'Back']]) {
    const x = wheel(wx);
    ctx.fillStyle = theme.iron[1]; ctx.fillRect(x - 46, ground + 30, 92, 12);
    ctx.fillStyle = '#0d1a12'; ctx.beginPath(); ctx.roundRect(x - 52, ground + 48, 104, 40, 5); ctx.fill();
    text(ctx, `${name} ${pct(share)}`, x, ground + 68, {size: 20, colour: name === 'Back' && c.locked ? theme.bad : '#9ff0b4', weight: 800});
    // The weight on this end pressing down.
    const len = 30 + 120 * share;
    ctx.strokeStyle = theme.accent; ctx.fillStyle = theme.accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, ground - 70 - len); ctx.lineTo(x, ground - 76); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 11, ground - 80); ctx.lineTo(x + 11, ground - 80); ctx.lineTo(x, ground - 64); ctx.closePath(); ctx.fill();
  }
  car(ctx, nose, ground + 2, scale, {angle: c.braking ? .03 : 0, locked: c.locked});
  if (c.locked) text(ctx, 'back tyre locked', wheel(-74), ground - 76 - 30 - 120 * back - 16, {size: 16, colour: theme.bad});
  text(ctx, c.braking ? 'BRAKING' : 'STANDING', 120, 70, {size: 14, align: 'left', colour: c.braking ? theme.accent : theme.faint, weight: 800});
}
function dial(ctx, view) {
  const d = view.dial, can = view.keys['↑'] === 'speed:up';
  panel(ctx, DIAL.x, DIAL.y, DIAL.w, DIAL.h);
  text(ctx, 'SPEED DIAL', DIAL.x + DIAL.w / 2, DIAL.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, `${d.speed} mph`, DIAL.x + DIAL.w / 2, DIAL.y + 50, {size: 30, weight: 800});
  for (const [way, label, key] of [['down', 'Slower', '↓'], ['up', 'Faster', '↑']]) {
    const [x, y] = DIAL[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 56, y - 22, 112, 44, 6); ctx.fill();
    text(ctx, label, x + 10, y, {size: 15}); keyCap(ctx, x - 36, y, key);
    ctx.globalAlpha = 1;
  }
  if (d.locked) text(ctx, 'set by Brian', DIAL.x + DIAL.w / 2, DIAL.y + 88, {size: 12, colour: theme.faint});
}
function lever(ctx, view) {
  const l = view.lever, can = view.keys['→'] === 'lever:front', [x0, x1] = LEVER.track, y = LEVER.trackY;
  panel(ctx, LEVER.x, LEVER.y, LEVER.w, LEVER.h);
  text(ctx, 'BRAKE LEVER', LEVER.x + LEVER.w / 2, LEVER.y + 18, {size: 12, colour: theme.faint, weight: 800});
  text(ctx, `Back ${100 - l.front}%`, LEVER.x + 14, LEVER.y + 44, {size: 17, align: 'left', weight: 800});
  text(ctx, `Front ${l.front}%`, LEVER.x + LEVER.w - 14, LEVER.y + 44, {size: 17, align: 'right', weight: 800});
  // The track, a mark at every step, and the steady side (70% front and more) in green.
  ctx.fillStyle = '#2b3236'; ctx.fillRect(x0, y - 5, x1 - x0, 10);
  ctx.fillStyle = 'rgba(86,214,131,.35)'; ctx.fillRect(leverX(STEADY_FRONT), y - 5, x1 - leverX(STEADY_FRONT), 10);
  ctx.strokeStyle = theme.faint; ctx.lineWidth = 2;
  for (let f = MIN_FRONT; f <= MAX_FRONT; f += 10) { ctx.beginPath(); ctx.moveTo(leverX(f), y + 8); ctx.lineTo(leverX(f), y + 16); ctx.stroke(); }
  const kx = leverX(l.front);
  ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = theme.brass[2]; ctx.lineWidth = 2; ctx.stroke();
  for (const [way, label, key] of [['back', 'Back', '←'], ['front', 'Front', '→']]) {
    const [x, by] = LEVER[way];
    ctx.globalAlpha = can ? 1 : .35;
    ctx.fillStyle = '#2b3236'; ctx.beginPath(); ctx.roundRect(x - 46, by - 18, 92, 36, 6); ctx.fill();
    text(ctx, label, x + 10, by, {size: 15}); keyCap(ctx, x - 28, by, key);
    ctx.globalAlpha = 1;
  }
}
// The strip: lanes, the brake line, a mark every 10 m, the line or corner, each car with its tape and skid marks.
function strip(ctx, view) {
  const lanes = (view.lanes.length ? view.lanes : view.dial ? [{label: `${view.dial.speed} mph`, waiting: true, metres: -6, mph: view.dial.speed, slide: 0}] : [])
    // A car waiting to start sits just before the brake line, where it can be seen.
    .map(l => l.waiting ? {...l, metres: -6} : l);
  const n = Math.max(1, lanes.length), top = laneY(0, n) - 40, bottom = laneY(n - 1, n) + 34;
  ctx.fillStyle = '#23272a'; ctx.fillRect(40, top, 920, bottom - top);
  for (let i = 1; i < n; i++) { ctx.strokeStyle = 'rgba(245,240,220,.35)'; ctx.setLineDash([16, 12]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, laneY(i, n) - 40); ctx.lineTo(960, laneY(i, n) - 40); ctx.stroke(); ctx.setLineDash([]); }
  for (let mm = 10; mm <= STRIP.metres; mm += 10) {
    ctx.strokeStyle = 'rgba(245,240,220,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(stripX(mm), top); ctx.lineTo(stripX(mm), bottom); ctx.stroke();
    text(ctx, `${mm} m`, stripX(mm), bottom + 14, {size: 12, colour: theme.faint});
  }
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(stripX(0), top); ctx.lineTo(stripX(0), bottom); ctx.stroke();
  text(ctx, 'brakes on', stripX(0), bottom + 14, {size: 12, colour: theme.accent});
  if (view.line != null) {
    const x = stripX(view.line);
    for (let k = 0; k * 10 < bottom - top; k++) { ctx.fillStyle = k % 2 ? '#eee' : theme.bad; ctx.fillRect(x - 4, top + k * 10, 8, 10); }
    text(ctx, view.job ? `corner, ${view.line} m` : 'the line', x, top - 12, {size: 14, colour: theme.bad});
  }
  ctx.save(); ctx.beginPath(); ctx.rect(40, top, 920, bottom - top); ctx.clip();
  lanes.forEach((l, i) => {
    const y = laneY(i, n), x = stripX(l.metres);
    // Skid marks behind a sliding back, from the brake line to where the back is now.
    if (l.slide > 0) { ctx.strokeStyle = 'rgba(10,10,10,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(stripX(0) - 40, y + 10); ctx.quadraticCurveTo(x - 40, y + 10, x - 44, y + 10 - 26 * l.slide); ctx.stroke(); }
    car(ctx, x, y + 4, .48, {angle: .35 * l.slide, locked: l.slide > 0});
    if (l.done) {
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(stripX(0), y - 22); ctx.lineTo(x, y - 22); ctx.stroke();
      for (const tx of [stripX(0), x]) { ctx.beginPath(); ctx.moveTo(tx, y - 28); ctx.lineTo(tx, y - 16); ctx.stroke(); }
    }
  });
  ctx.restore();
  lanes.forEach((l, i) => {
    const y = laneY(i, n);
    text(ctx, l.label, 48, y - 28, {size: 15, align: 'left', colour: theme.text});
    const reading = l.waiting ? 'ready' : l.done ? `stopped: ${m1(l.stopMetres)}${l.slides ? ', back slid' : ''}` : `${Math.round(l.mph)} mph`;
    text(ctx, reading, 952, y - 28, {size: 15, align: 'right', colour: l.done ? (l.slides ? theme.bad : '#9ff0b4') : theme.text});
    if (l.done) text(ctx, m1(l.stopMetres), (stripX(0) + stripX(l.metres)) / 2, y - 34, {size: 15, colour: theme.accent});
  });
  if (view.keys.Space === 'go' && !view.lanes.length) text(ctx, 'Space brakes', stripX(20), laneY(0, 1) + 4, {size: 15, align: 'left', colour: theme.faint});
}
function drawRig(ctx, view) {
  background(ctx);
  if (view.close) closeUp(ctx, view);
  if (view.dial) dial(ctx, view);
  if (view.lever) lever(ctx, view);
  if (view.job) {
    const j = view.job;
    text(ctx, `BRIAN’S JOB · CORNER ${j.corner} OF ${j.of}${j.done ? ' · DONE' : ''} · the marker is ${j.gap} m before the corner`, 48, 366, {size: 15, align: 'left', colour: theme.accent, weight: 800});
  }
  strip(ctx, view);
  // The glow on what to use next.
  if (view.glow === 'strip' || view.glow === 'set' && view.target === 'go') glowBox(ctx, view, 44, laneY(0, Math.max(1, view.lanes.length)) - 44, 912, 82);
  if (view.glow === 'lever' || view.glow === 'set' && view.target === 'set:best' && view.lever && !view.lever.locked && view.lever.front !== view.best?.front) glowBox(ctx, view, LEVER.x - 4, LEVER.y - 4, LEVER.w + 8, LEVER.h + 8);
  else if (view.glow === 'set' && view.target === 'set:best' && view.dial && !view.dial.locked) glowBox(ctx, view, DIAL.x - 4, DIAL.y - 4, DIAL.w + 8, DIAL.h + 8);
}

// The questions: two stops (where they stop shows once answered), three levers, and the Tune page's row.
function drawCheck(ctx, view) {
  background(ctx);
  if (view.stops) {
    view.stops.forEach((s, i) => {
      const y = 250 + i * 150;
      ctx.fillStyle = '#23272a'; ctx.fillRect(40, y - 44, 920, 80);
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(stripX(0), y - 44); ctx.lineTo(stripX(0), y + 36); ctx.stroke();
      text(ctx, `From ${s.speed} mph`, 48, y - 56, {size: 17, align: 'left'});
      const at = view.answered ? s.metres : 0;
      car(ctx, stripX(at), y + 4, .48);
      if (view.answered) text(ctx, m1(s.metres), stripX(s.metres) + 14, y - 20, {size: 18, align: 'left', colour: theme.accent});
    });
    return;
  }
  if (view.balances) {
    view.balances.forEach((b, i) => {
      const x = 180 + i * 320, y = 300;
      panel(ctx, x - 140, y - 110, 280, 220);
      text(ctx, `${b.front}% front`, x, y - 80, {size: 22});
      ctx.fillStyle = '#2b3236'; ctx.fillRect(x - 110, y - 5, 220, 10);
      const kx = x - 110 + (b.front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220;
      ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, y - 20, 11, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'back', x - 110, y + 26, {size: 13, colour: theme.faint}); text(ctx, 'front', x + 110, y + 26, {size: 13, colour: theme.faint});
      if (view.answered) text(ctx, b.slides ? 'the back slides' : 'steady', x, y + 72, {size: 20, colour: b.slides ? theme.bad : '#9ff0b4'});
    });
    return;
  }
  const x = 170, y = 150, w = 660;
  panel(ctx, x, y, w, 260);
  text(ctx, 'THE TUNE PAGE · IN THE GARAGE', x + 20, y + 24, {size: 13, align: 'left', colour: theme.faint, weight: 800});
  text(ctx, 'Brake balance', x + 20, y + 62, {size: 26, align: 'left'});
  [-2, -1, 0, 1, 2].forEach((stepNo, i) => {
    const bx = x + 20 + i * 126, on = stepNo === 2;
    ctx.fillStyle = on ? '#5b4a1c' : '#2b3236'; ctx.beginPath(); ctx.roundRect(bx, y + 90, 114, 44, 6); ctx.fill();
    if (on) { ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.stroke(); }
    text(ctx, stepNo === 0 ? '0' : stepNo > 0 ? `+${stepNo}` : String(stepNo), bx + 57, y + 112, {size: 18});
  });
  text(ctx, 'toward the front', x + 20, y + 150, {size: 13, align: 'left', colour: theme.faint}); text(ctx, 'toward the rear', x + w - 20, y + 150, {size: 13, align: 'right', colour: theme.faint});
  if (view.tune.effect) wrap(ctx, view.tune.effect, x + w / 2, y + 200, w - 40);
  else text(ctx, 'Two steps toward the rear', x + w / 2, y + 205, {size: 20, colour: theme.faint});
}
function drawRecap(ctx, view) {
  background(ctx);
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    if (idea.id === 'four') {
      // Each stop to the same scale: 4.8 board units a metre.
      for (const [k, speed] of [[0, 50], [1, 100]]) {
        const y = 170 + k * 90, metres = metresFrom(speed);
        ctx.fillStyle = theme.accent; ctx.fillRect(x + 30, y, metres * 4.8, 14);
        text(ctx, `${speed} mph: ${m1(metres)}`, x + 30, y - 16, {size: 15, align: 'left'});
      }
    }
    if (idea.id === 'weight') {
      car(ctx, x + 250, 250, 2.2);
      text(ctx, `front ${pct(FRONT_LOAD)}`, x + 206, 300, {size: 16, colour: '#9ff0b4'}); text(ctx, `back ${pct(REAR_LOAD)}`, x + 87, 300, {size: 16, colour: '#9ff0b4'});
    }
    if (idea.id === 'balance') {
      ctx.fillStyle = '#2b3236'; ctx.fillRect(x + 40, 230, 220, 10);
      ctx.fillStyle = 'rgba(86,214,131,.35)'; ctx.fillRect(x + 40 + (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 230, 220 - (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 10);
      ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(x + 40 + (STEADY_FRONT - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * 220, 215, 11, 0, Math.PI * 2); ctx.fill();
      text(ctx, `${STEADY_FRONT}% front and more: steady`, x + w / 2, 280, {size: 15, colour: '#9ff0b4'});
    }
    wrap(ctx, idea.text, x + w / 2, 400, w - 30);
  });
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') drawRecap(ctx, view);
    else if (view.scene === 'rig') drawRig(ctx, view);
    else drawCheck(ctx, view);
  });
}
// The answer cards' pictures: two stops on a little strip, a lever, and the race trade.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.plate; ctx.fillRect(0, 0, w, h);
  if (picture.kind === 'stops') {
    // 100 m across the card, the brake line on the left.
    const x0 = 22, per = (w - 40) / 100;
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 14); ctx.lineTo(x0, h - 10); ctx.stroke();
    picture.metres.forEach((metres, i) => {
      const y = 36 + i * 44;
      ctx.fillStyle = '#23272a'; ctx.fillRect(x0, y - 16, w - 30, 32);
      car(ctx, x0 + metres * per, y + 4, .3);
      ctx.fillStyle = theme.accent; ctx.fillRect(x0, y + 12, metres * per, 3);
    });
  }
  if (picture.kind === 'lever') {
    ctx.fillStyle = '#2b3236'; ctx.fillRect(30, h / 2, w - 60, 8);
    const kx = 30 + (picture.front - MIN_FRONT) / (MAX_FRONT - MIN_FRONT) * (w - 60);
    ctx.fillStyle = theme.brass[1]; ctx.beginPath(); ctx.arc(kx, h / 2 - 10, 10, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'back', 30, h / 2 + 26, {size: 13, colour: theme.faint}); text(ctx, 'front', w - 30, h / 2 + 26, {size: 13, colour: theme.faint});
  }
  if (picture.kind === 'game') {
    car(ctx, w / 2 + 50, h / 2 + 8, 1.1);
    if (picture.what === 'trade') { text(ctx, 'stops +', 40, 30, {size: 16, colour: '#9ff0b4'}); text(ctx, 'turns −', w - 40, 30, {size: 16, colour: theme.bad}); }
    if (picture.what === 'both') { text(ctx, 'stops +', 40, 30, {size: 16, colour: '#9ff0b4'}); text(ctx, 'turns +', w - 40, 30, {size: 16, colour: '#9ff0b4'}); }
    if (picture.what === 'same') text(ctx, 'no change', w / 2, 30, {size: 16, colour: theme.faint});
  }
}
