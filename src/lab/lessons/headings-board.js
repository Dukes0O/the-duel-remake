// The Headings lesson's board (docs/board/cards/LAB-CLASSROOM-HEADINGS.md): a map seen from above, north up, in
// squares of 100 m; Kestrel One on the pad with a compass ring round her, the HEADING gauge beside the map, the
// ruler, the smoke, her tracks. Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {MAP, RING_M, SQUARE_M, pointAt, three, wrap as round} from './headings-classroom.js';
export {BOARD};
// Pressing on the compass ring turns her to that heading at once; pressing on the ruler moves its end there.
export const pressMovesDrag = true;

// Map metres to board units: the pad at (300, 450), 0.6 units a metre (a 100 m square is 60 units).
const PAD = Object.freeze({x: 300, y: 450}), SCALE = .6, RING = 74;
const PLATE = Object.freeze({left: 16, top: 16, right: 740, bottom: 664});
const bx = x => PAD.x + x * SCALE, by = y => PAD.y - y * SCALE;
const heliAt = view => [bx(view.heli.x), by(view.heli.y)];
const nose = deg => [Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180)];
const LAKE = Object.freeze({x: 520, y: 30, rx: 150, ry: 110});
// Fir trees in the woods, the same every frame, kept off the pad, the lake and the smoke.
const TREES = Array.from({length: 120}, (_, i) => ({x: MAP.west + ((i * 7919) % 1000) / 1000 * (MAP.east - MAP.west), y: MAP.south + ((i * 104729) % 997) / 997 * (MAP.north - MAP.south), r: 7 + (i * 31) % 6}))
  .filter(t => Math.hypot(t.x, t.y) > 90 && Math.hypot((t.x - LAKE.x) / (LAKE.rx + 30), (t.y - LAKE.y) / (LAKE.ry + 30)) > 1);

// ---- hit testing and Brian's pointer, in board units ----
export function hitTest(view, x, y) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view), r = Math.hypot(x - hx, y - hy);
  if (view.dragRuler && view.ruler) { const [ex, ey] = rulerEnd(view); if (Math.hypot(x - ex, y - ey) < 34 || onRuler(view, x, y)) return {drag: 'ruler', action: 'release'}; }
  // Her body is Space where Space flies her; otherwise it is a dead spot, so a click on her never turns her at random.
  if (r < 24) return view.keys.Space ? {action: view.keys.Space} : null;
  if (view.dragCompass && r < RING + 26) return {drag: 'compass', action: 'release'};
  return null;
}
const rulerEnd = view => { const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading); return [hx + ux * view.ruler.length * SCALE, hy + uy * view.ruler.length * SCALE]; };
function onRuler(view, x, y) {
  const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading), along = (x - hx) * ux + (y - hy) * uy, across = Math.abs((x - hx) * uy - (y - hy) * ux);
  return along > 30 && along < view.ruler.length * SCALE + 30 && across < 22;
}
export function hoverInfo(view, x, y) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view), r = Math.hypot(x - hx, y - hy);
  if (r < 24) return `Kestrel One, seen from above, pointing ${three(view.heli.heading)}.`;
  if (view.compass && r < RING + 18) return 'Her compass ring: 000 north at the top, counting up to the right.';
  if (x > 760 && y > 40 && y < 190) return `The HEADING gauge, as in the helicopter: ${view.gauge}.`;
  if (view.spot?.kind === 'smoke' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < RING_M * SCALE + 14) return `The smoke. Within ${RING_M} m of it counts as over it.`;
  if (view.spot?.kind === 'hut' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < 20) return 'A hut in the woods.';
  if (view.ruler && onRuler(view, x, y)) return `The ruler: ${Math.round(view.ruler.length)} m.`;
  if (Math.hypot((x - bx(LAKE.x)) / (LAKE.rx * SCALE), (y - by(LAKE.y)) / (LAKE.ry * SCALE)) < 1) return 'The lake, east of the pad.';
  if (x > PLATE.left && x < PLATE.right && y > PLATE.top && y < PLATE.bottom) return `One square of the map is ${SQUARE_M} m on the ground.`;
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view);
  // Brian taps the ring at the heading he wants, where a click turns her to it.
  if (action.startsWith('turn')) { const [ux, uy] = nose(view.aim ?? view.heli.heading); return [hx + ux * RING, hy + uy * RING]; }
  if (action.startsWith('ruler')) return view.ruler ? rulerEnd(view) : null;
  return [hx, hy];
}
// What a drag to (x, y) asks for: a heading on the compass ring, or the ruler's length in metres.
export function dragAngle(view, id, x, y) {
  const [hx, hy] = heliAt(view);
  if (id === 'ruler') { const [ux, uy] = nose(view.ruler.heading); return ((x - hx) * ux + (y - hy) * uy) / SCALE; }
  return round(Math.atan2(x - hx, hy - y) * 180 / Math.PI);
}

// ---- drawing ----
function plate(ctx, view) {
  ctx.fillStyle = '#2f3a2c'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(PLATE.left, PLATE.top, PLATE.right - PLATE.left, PLATE.bottom - PLATE.top, 6); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(PLATE.left, PLATE.top, PLATE.right - PLATE.left, PLATE.bottom - PLATE.top); ctx.clip();
  // The lake, the trees, then the squares over them.
  ctx.fillStyle = '#35606b'; ctx.beginPath(); ctx.ellipse(bx(LAKE.x), by(LAKE.y), LAKE.rx * SCALE, LAKE.ry * SCALE, -.2, 0, Math.PI * 2); ctx.fill();
  for (const t of TREES) { ctx.fillStyle = 'rgba(18,34,20,.85)'; ctx.beginPath(); ctx.arc(bx(t.x), by(t.y), t.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = view.squares ? 'rgba(237,197,87,.42)' : 'rgba(227,220,203,.16)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let m = Math.ceil(MAP.west / SQUARE_M) * SQUARE_M; m <= MAP.east + SQUARE_M; m += SQUARE_M) { ctx.moveTo(bx(m), PLATE.top); ctx.lineTo(bx(m), PLATE.bottom); }
  for (let m = Math.ceil(MAP.south / SQUARE_M) * SQUARE_M; m <= MAP.north + SQUARE_M; m += SQUARE_M) { ctx.moveTo(PLATE.left, by(m)); ctx.lineTo(PLATE.right, by(m)); }
  ctx.stroke();
  ctx.restore();
  // North arrow and the scale, at the map's corners.
  ctx.fillStyle = theme.text; ctx.beginPath(); ctx.moveTo(52, 34); ctx.lineTo(62, 62); ctx.lineTo(52, 56); ctx.lineTo(42, 62); ctx.closePath(); ctx.fill();
  text(ctx, 'N', 52, 76, {size: 18});
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.beginPath(); ctx.roundRect(PLATE.left + 12, PLATE.bottom - 46, 196, 34, 5); ctx.fill();
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PLATE.left + 24, PLATE.bottom - 22); ctx.lineTo(PLATE.left + 24 + SQUARE_M * SCALE, PLATE.bottom - 22);
  ctx.moveTo(PLATE.left + 24, PLATE.bottom - 28); ctx.lineTo(PLATE.left + 24, PLATE.bottom - 16); ctx.moveTo(PLATE.left + 24 + SQUARE_M * SCALE, PLATE.bottom - 28); ctx.lineTo(PLATE.left + 24 + SQUARE_M * SCALE, PLATE.bottom - 16); ctx.stroke();
  text(ctx, `1 square = ${SQUARE_M} m`, PLATE.left + 140, PLATE.bottom - 29, {size: 14, align: 'center', colour: view.squares ? theme.accent : theme.text});
}
function pad(ctx, label) {
  ctx.fillStyle = '#4a4f4b'; ctx.strokeStyle = theme.text; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(PAD.x, PAD.y, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  text(ctx, 'H', PAD.x, PAD.y + 1, {size: 22, colour: 'rgba(245,240,220,.55)'});
  if (label) text(ctx, 'Woods pad', PAD.x, PAD.y + 42, {size: 14, colour: theme.faint});
}
function spot(ctx, t, time) {
  const x = bx(t.x), y = by(t.y);
  if (t.kind === 'smoke') {
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(245,240,220,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, RING_M * SCALE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 7; i++) {
      const k = (time * .5 + i / 7) % 1;
      ctx.fillStyle = `rgba(205,205,200,${.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.3 + time) * 6 + k * 16, y - k * 46, 7 + k * 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e8803a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (t.kind === 'hut') {
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(x - 11, y - 30, 22, 16);
    ctx.fillStyle = '#5b3f2a'; ctx.beginPath(); ctx.moveTo(x - 14, y - 29); ctx.lineTo(x, y - 40); ctx.lineTo(x + 14, y - 29); ctx.closePath(); ctx.fill();
  }
  if (t.kind !== 'lake') text(ctx, t.label, x, y + 28, {size: 15, colour: theme.text});
  else text(ctx, t.label, bx(LAKE.x), by(LAKE.y), {size: 16, colour: 'rgba(245,240,220,.8)'});
}
function tracks(ctx, view) {
  const line = (track, colour, width, dash = []) => {
    if (track.length < 2) return;
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(bx(track[0].x), by(track[0].y)); for (const p of track) ctx.lineTo(bx(p.x), by(p.y)); ctx.stroke(); ctx.setLineDash([]);
  };
  for (const g of view.ghosts) {
    line(g, 'rgba(240,122,90,.85)', 3, [9, 6]);
    // Where that try ended: a cross and how far she flew.
    const end = g.at(-1), x = bx(end.x), y = by(end.y), flown = Math.round(Math.hypot(end.x - g[0].x, end.y - g[0].y));
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke();
    text(ctx, `${flown} m`, x, y - 18, {size: 14, colour: theme.bad});
  }
  line(view.track, theme.accent, 3);
}
function ruler(ctx, view) {
  const [hx, hy] = heliAt(view), [ux, uy] = nose(view.ruler.heading), [px, py] = [-uy, ux], L = view.ruler.length;
  ctx.save(); ctx.translate(hx, hy);
  ctx.fillStyle = 'rgba(239,231,210,.92)'; ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(px * 9, py * 9); ctx.lineTo(px * 9 + ux * L * SCALE, py * 9 + uy * L * SCALE); ctx.lineTo(-px * 9 + ux * L * SCALE, -py * 9 + uy * L * SCALE); ctx.lineTo(-px * 9, -py * 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let m = 0; m <= L; m += 50) { const k = m % 100 === 0 ? 9 : 5; ctx.beginPath(); ctx.moveTo(ux * m * SCALE + px * 9, uy * m * SCALE + py * 9); ctx.lineTo(ux * m * SCALE + px * (9 - k), uy * m * SCALE + py * (9 - k)); ctx.stroke(); }
  ctx.restore();
  const [ex, ey] = rulerEnd(view);
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
  text(ctx, `${Math.round(L)} m`, ex - px * 30 - ux * 20, ey - py * 30 - uy * 20, {size: 18, colour: theme.accent});
}
// Kestrel One from above: nose to her heading, the rotor a turning disc.
function kestrel(ctx, view) {
  const [x, y] = heliAt(view), a = view.heli.heading * Math.PI / 180;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(5, 8, 15, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfd6cb'; ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(-3, 8, 6, 34); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-12, 38, 24, 5); ctx.fill(); ctx.stroke();
  const body = ctx.createLinearGradient(-14, 0, 14, 0); body.addColorStop(0, '#8d988a'); body.addColorStop(.5, '#e4e9df'); body.addColorStop(1, '#8d988a');
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -2, 14, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5f8796'; ctx.beginPath(); ctx.ellipse(0, -14, 9, 9, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-14, 3, 28, 4);
  ctx.strokeStyle = 'rgba(245,240,220,.28)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -2, 36, 0, Math.PI * 2); ctx.stroke();
  const b = view.time * 24;
  ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(Math.cos(b) * 36, -2 + Math.sin(b) * 36); ctx.lineTo(-Math.cos(b) * 36, -2 - Math.sin(b) * 36); ctx.stroke();
  ctx.restore();
}
function compassRing(ctx, view) {
  const [x, y] = heliAt(view);
  ctx.strokeStyle = 'rgba(245,240,220,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, RING, 0, Math.PI * 2); ctx.stroke();
  for (let d = 0; d < 360; d += 30) {
    const [ux, uy] = nose(d), big = d % 90 === 0;
    ctx.beginPath(); ctx.moveTo(x + ux * (RING - (big ? 10 : 6)), y + uy * (RING - (big ? 10 : 6))); ctx.lineTo(x + ux * RING, y + uy * RING); ctx.stroke();
    if (big) {
      const label = view.rose ? `${'NESW'[d / 90]} ${three(d)}` : three(d), lx = x + ux * (RING + 30), ly = y + uy * (RING + 16), w = label.length * 9 + 10;
      ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(lx - w / 2, ly - 11, w, 22, 4); ctx.fill();
      text(ctx, label, lx, ly, {size: 14, colour: theme.text});
    }
  }
  // Her heading: the nose line out past the ring, in brass.
  const [ux, uy] = nose(view.heli.heading);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(x + ux * 32, y + uy * 32); ctx.lineTo(x + ux * (RING + 70), y + uy * (RING + 70)); ctx.stroke(); ctx.setLineDash([]);
}
// The HEADING gauge, three figures as in the helicopter, and what she has flown.
function gauge(ctx, view) {
  const x = 762, w = 222;
  ctx.fillStyle = '#121617'; ctx.strokeStyle = view.glow === 'compass' ? theme.accent : theme.beamLight; ctx.lineWidth = view.glow === 'compass' ? 3 : 2;
  ctx.beginPath(); ctx.roundRect(x, 40, w, 150, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'HEADING', x + w / 2, 66, {size: 16, colour: theme.faint, weight: 800});
  text(ctx, view.gauge, x + w / 2, 128, {size: 72, colour: '#9ff0b4', weight: 800});
  text(ctx, 'degrees from north', x + w / 2, 174, {size: 13, colour: theme.faint});
  if (view.flown != null) {
    ctx.fillStyle = '#121617'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, 206, w, 92, 8); ctx.fill(); ctx.stroke();
    text(ctx, 'FLOWN', x + w / 2, 228, {size: 16, colour: theme.faint, weight: 800});
    text(ctx, `${Math.round(view.flown)} m`, x + w / 2, 268, {size: 40, colour: '#9ff0b4', weight: 800});
  }
  // The turn keys, with the way the number goes.
  if (view.keys.A) {
    const y = 336;
    keyCap(ctx, x + 22, y, 'A'); text(ctx, 'turn left: number down', x + 42, y, {size: 14, align: 'left'});
    keyCap(ctx, x + 22, y + 34, 'D'); text(ctx, 'turn right: number up', x + 42, y + 34, {size: 14, align: 'left'});
  }
  if (view.keys['→']) {
    const y = 336;
    keyCap(ctx, x + 22, y, '→'); text(ctx, 'ruler longer', x + 42, y, {size: 14, align: 'left'});
    keyCap(ctx, x + 22, y + 34, '←'); text(ctx, 'ruler shorter', x + 42, y + 34, {size: 14, align: 'left'});
  }
}
function halo(ctx, x, y, r, time) {
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.globalAlpha = .55 + .35 * Math.sin(time * 6);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
}
function drawMap(ctx, view) {
  background(ctx);
  plate(ctx, view);
  ctx.save(); ctx.beginPath(); ctx.rect(PLATE.left, PLATE.top, PLATE.right - PLATE.left, PLATE.bottom - PLATE.top); ctx.clip();
  pad(ctx, Math.hypot(view.heli.x, view.heli.y) > 150);
  tracks(ctx, view);
  if (view.ruler) ruler(ctx, view);
  if (view.spot) spot(ctx, view.spot, view.time);
  if (view.compass) compassRing(ctx, view);
  kestrel(ctx, view);
  if (view.glow === 'compass') { const [x, y] = heliAt(view); halo(ctx, x, y, RING + 8, view.time); }
  if (view.glow === 'ruler' && view.ruler) { const [x, y] = rulerEnd(view); halo(ctx, x, y, 18, view.time); }
  ctx.restore();
  gauge(ctx, view);
}

// ---- the recap ----
function drawRecap(ctx, view) {
  const w = 300, gap = 25, x0 = (BOARD.width - 3 * w - 2 * gap) / 2;
  view.ideas.forEach((idea, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = 'rgba(10,14,15,.55)'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 40, w, 600, 8); ctx.fill(); ctx.stroke();
    text(ctx, String(i + 1), x + 26, 70, {size: 26, colour: theme.accent});
    miniScene(ctx, idea.id, x + w / 2, 290, view.time);
    wrap(ctx, idea.text, x + w / 2, 528, w - 30);
  });
}
function miniCompass(ctx, x, y, r, deg, labels = true) {
  ctx.strokeStyle = 'rgba(245,240,220,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  if (labels) for (const [d, l] of [[0, '000'], [90, '090'], [180, '180'], [270, '270']]) { const [ux, uy] = nose(d); text(ctx, l, x + ux * (r + 24), y + uy * (r + 14), {size: 15}); }
  const [ux, uy] = nose(deg);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * r * .9, y + uy * r * .9); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x + ux * r * .9, y + uy * r * .9, 6, 0, Math.PI * 2); ctx.fill();
}
function miniScene(ctx, id, x, y, time) {
  if (id === 'heading') { miniCompass(ctx, x, y, 90, 70); text(ctx, '070', x, y + 150, {size: 34, colour: '#9ff0b4'}); }
  if (id === 'turn') {
    const deg = round(350 + ((time * 30) % 40));
    miniCompass(ctx, x, y, 90, deg);
    text(ctx, three(deg), x, y + 150, {size: 34, colour: '#9ff0b4'});
    keyCap(ctx, x - 40, y + 190, 'A'); keyCap(ctx, x + 40, y + 190, 'D');
    text(ctx, 'down', x - 40, y + 214, {size: 13, colour: theme.faint}); text(ctx, 'up', x + 40, y + 214, {size: 13, colour: theme.faint});
  }
  if (id === 'scale') {
    ctx.strokeStyle = 'rgba(237,197,87,.5)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x - 120 + i * 60, y - 90); ctx.lineTo(x - 120 + i * 60, y + 90); ctx.stroke(); }
    for (let j = 0; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(x - 120, y - 90 + j * 60); ctx.lineTo(x + 120, y - 90 + j * 60); ctx.stroke(); }
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 120, y + 30); ctx.lineTo(x + 60, y + 30); ctx.stroke();
    text(ctx, '3 squares = 300 m', x, y + 130, {size: 20, colour: theme.accent});
  }
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawMap(ctx, view);
  });
}
// The answer cards' pictures: a compass with one heading, a turn the short or long way, a distance in squares.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#2f3a2c'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  if (picture.kind === 'heading') {
    miniCompass(ctx, cx, cy, 40, picture.deg, false);
    text(ctx, 'N', cx, cy - 46, {size: 13, colour: theme.faint});
  }
  if (picture.kind === 'wrap') {
    const r = 40, at = d => [cx + Math.sin(d * Math.PI / 180) * r, cy - Math.cos(d * Math.PI / 180) * r];
    ctx.strokeStyle = 'rgba(245,240,220,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const arc = (from, to, colour) => { ctx.strokeStyle = colour; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r, (from - 90) * Math.PI / 180, (to - 90) * Math.PI / 180); ctx.stroke(); };
    if (picture.way === 'right' || picture.way === 'same') arc(350, 370, theme.accent);
    if (picture.way === 'left' || picture.way === 'same') arc(10, 350, picture.way === 'same' ? theme.good : theme.accent);
    for (const [d, l] of [[350, '350'], [10, '010']]) { const [x, y] = at(d); ctx.fillStyle = theme.text; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); text(ctx, l, x + (d === 350 ? -26 : 26), y + 2, {size: 15}); }
  }
  if (picture.kind === 'squares') {
    const sq = 26, n = picture.m / SQUARE_M, x0 = 14, y0 = cy;
    ctx.strokeStyle = 'rgba(237,197,87,.45)'; ctx.lineWidth = 1;
    for (let i = 0; i * sq <= w - 28; i++) ctx.strokeRect(x0 + i * sq, y0 - sq / 2, sq, sq);
    const long = Math.min(n * sq, w - 28);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + long, y0); ctx.stroke();
    if (n * sq > w - 28) { ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(w - 6, y0); ctx.lineTo(w - 16, y0 - 7); ctx.lineTo(w - 16, y0 + 7); ctx.fill(); }
  }
}
