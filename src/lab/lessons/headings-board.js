// The Headings lesson's board (docs/board/cards/LAB-CLASSROOM-HEADINGS.md): a map seen from above, north up, in
// boxes of 100 m; Kestrel One on the pad with a compass ring round it and the angle shaded from north; the HEADING
// gauge beside the map; the ruler, the smoke, the flight tracks, and the right-angled triangle that the sums use.
// Draws and hit-tests only.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
import {MAP, RING_M, BOX_M, three, wrap as round} from './headings-classroom.js';
export {BOARD};
// Pressing on the compass ring turns the helicopter to that heading at once; pressing on the ruler moves its end there.
export const pressMovesDrag = true;

const EAST_COLOUR = '#70bfd2', NORTH_COLOUR = '#9ff0b4', PLAIN = 'rgba(245,240,220,.85)';

// Map metres to board units: the pad at (300, 450), 0.6 units a metre (a 100 m box is 60 units).
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
  // The helicopter's body is Space where Space flies it; otherwise it is a dead spot, so a click on it never turns it at random.
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
  if (r < 24) return `This is Kestrel One, seen from above, on heading ${three(view.heli.heading)}.`;
  if (view.compass && r < RING + 18) return 'This is the compass ring. North is 000 at the top, and the number counts up clockwise.';
  if (x > 760 && y > 40 && y < 190) return `The HEADING gauge reads ${view.gauge}, as it would in the helicopter.`;
  if (view.spot?.kind === 'smoke' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < RING_M * SCALE + 14) return `This is the smoke. Within ${RING_M} m of it counts as over it.`;
  if (view.spot?.kind === 'hut' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < 20) return 'This is a hut in the woods.';
  if (view.spot?.kind === 'marker' && Math.hypot(x - bx(view.spot.x), y - by(view.spot.y)) < 20) return 'This is the marker. The arrow keys move it one box at a time.';
  if (view.ruler && onRuler(view, x, y)) return `The ruler reads ${Math.round(view.ruler.length)} m.`;
  if (Math.hypot((x - bx(LAKE.x)) / (LAKE.rx * SCALE), (y - by(LAKE.y)) / (LAKE.ry * SCALE)) < 1) return 'This is the lake, which lies east of the pad.';
  if (x > PLATE.left && x < PLATE.right && y > PLATE.top && y < PLATE.bottom) return `One box of the map stands for ${BOX_M} m on the ground.`;
  return null;
}
export function targetPoint(view, action) {
  if (view.scene !== 'map') return null;
  const [hx, hy] = heliAt(view);
  // Brian taps the ring at the heading he wants, where a click turns the helicopter to it.
  if (action.startsWith('turn')) { const [ux, uy] = nose(view.aim ?? view.heli.heading); return [hx + ux * RING, hy + uy * RING]; }
  if (action.startsWith('ruler')) return view.ruler ? rulerEnd(view) : null;
  if (action.startsWith('marker')) return view.spot ? [bx(view.spot.x), by(view.spot.y)] : null;
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
  // The lake, the trees, then the boxes over them.
  ctx.fillStyle = '#35606b'; ctx.beginPath(); ctx.ellipse(bx(LAKE.x), by(LAKE.y), LAKE.rx * SCALE, LAKE.ry * SCALE, -.2, 0, Math.PI * 2); ctx.fill();
  for (const t of TREES) { ctx.fillStyle = 'rgba(18,34,20,.85)'; ctx.beginPath(); ctx.arc(bx(t.x), by(t.y), t.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = view.grid ? 'rgba(237,197,87,.42)' : 'rgba(227,220,203,.16)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let m = Math.ceil(MAP.west / BOX_M) * BOX_M; m <= MAP.east + BOX_M; m += BOX_M) { ctx.moveTo(bx(m), PLATE.top); ctx.lineTo(bx(m), PLATE.bottom); }
  for (let m = Math.ceil(MAP.south / BOX_M) * BOX_M; m <= MAP.north + BOX_M; m += BOX_M) { ctx.moveTo(PLATE.left, by(m)); ctx.lineTo(PLATE.right, by(m)); }
  ctx.stroke();
  ctx.restore();
  // North arrow and the scale, at the map's corners.
  ctx.fillStyle = theme.text; ctx.beginPath(); ctx.moveTo(52, 34); ctx.lineTo(62, 62); ctx.lineTo(52, 56); ctx.lineTo(42, 62); ctx.closePath(); ctx.fill();
  text(ctx, 'N', 52, 76, {size: 18});
  ctx.fillStyle = 'rgba(10,14,15,.7)'; ctx.beginPath(); ctx.roundRect(PLATE.left + 12, PLATE.bottom - 46, 214, 34, 5); ctx.fill();
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PLATE.left + 24, PLATE.bottom - 22); ctx.lineTo(PLATE.left + 24 + BOX_M * SCALE, PLATE.bottom - 22);
  ctx.moveTo(PLATE.left + 24, PLATE.bottom - 28); ctx.lineTo(PLATE.left + 24, PLATE.bottom - 16); ctx.moveTo(PLATE.left + 24 + BOX_M * SCALE, PLATE.bottom - 28); ctx.lineTo(PLATE.left + 24 + BOX_M * SCALE, PLATE.bottom - 16); ctx.stroke();
  text(ctx, `1 box = ${BOX_M} m`, PLATE.left + 24 + BOX_M * SCALE + 12, PLATE.bottom - 29, {size: 14, align: 'left', colour: view.grid ? theme.accent : theme.text});
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
  if (t.kind === 'marker') {
    ctx.strokeStyle = theme.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.stroke();
    ctx.fillStyle = theme.bad; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 22, y - 27); ctx.lineTo(x, y - 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = theme.bad; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    return;
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
    // Where that flight ended: a cross and how far it went, with its heading on the free test.
    const end = g.at(-1), x = bx(end.x), y = by(end.y), east = end.x - g[0].x, north = end.y - g[0].y, flown = Math.round(Math.hypot(east, north));
    ctx.strokeStyle = theme.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke();
    tag(ctx, view.labelGhosts ? `${three(Math.atan2(east, north) * 180 / Math.PI)}, ${flown} m` : `${flown} m`, x, y - 18, theme.bad);
  }
  line(view.track, theme.accent, 3);
}
// A small label on a dark plate, so that it reads over the map.
function tag(ctx, label, x, y, colour = theme.text, size = 14) {
  const w = label.length * (size * .56) + 10;
  ctx.fillStyle = 'rgba(10,14,15,.78)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 4); ctx.fill();
  text(ctx, label, x, y, {size, colour});
}
// The angle of a heading, shaded from north clockwise round to the heading, with an arrowhead showing which way it is measured.
function angleFromNorth(ctx, x, y, r, deg, label = null) {
  const heading = round(deg), start = -Math.PI / 2, end = start + heading * Math.PI / 180;
  if (heading < .5) return;
  ctx.fillStyle = 'rgba(237,197,87,.22)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, start, end); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, start, end); ctx.stroke();
  // The north line that the angle starts from.
  ctx.strokeStyle = PLAIN; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r); ctx.stroke();
  const [ex, ey] = [x + Math.cos(end) * r, y + Math.sin(end) * r], [tx, ty] = [-Math.sin(end), Math.cos(end)], [ox, oy] = [Math.cos(end), Math.sin(end)], head = Math.min(9, r * .25);
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(ex + tx * head, ey + ty * head); ctx.lineTo(ex + ox * head * .7, ey + oy * head * .7); ctx.lineTo(ex - ox * head * .7, ey - oy * head * .7); ctx.closePath(); ctx.fill();
  if (label) { const middle = start + heading * Math.PI / 360; tag(ctx, label, x + Math.cos(middle) * r, y + Math.sin(middle) * r, theme.accent); }
}
// The right-angled triangle that the sums use: north from the pad, then east, then the straight line back to the pad.
function triangleLines(ctx, view) {
  const t = view.triangle, e = Math.round(t.east), n = Math.round(t.north), x0 = bx(0), y0 = by(0), xe = bx(e), yn = by(n);
  const leg = (x1, y1, x2, y2, colour, width = 4) => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  if (t.line && (e || n)) leg(x0, y0, xe, yn, theme.accent);
  if (n) leg(x0, y0, x0, yn, NORTH_COLOUR);
  if (e) leg(x0, yn, xe, yn, EAST_COLOUR);
  // The mark of the right angle.
  if (e && n) {
    const sx = Math.sign(e) * 11, sy = Math.sign(n) * 11;
    ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + sx, yn); ctx.lineTo(x0 + sx, yn + sy); ctx.lineTo(x0, yn + sy); ctx.stroke();
  }
  if (t.arc && (e || n)) angleFromNorth(ctx, x0, y0, 52, Math.atan2(e, n) * 180 / Math.PI, `${(round(Math.atan2(e, n) * 180 / Math.PI)).toFixed(1)}°`);
}
// The sides' lengths, each beside its own side and away from the triangle, drawn last so that nothing crosses them.
function triangleTags(ctx, view) {
  const t = view.triangle, e = Math.round(t.east), n = Math.round(t.north), x0 = bx(0), y0 = by(0), xe = bx(e), yn = by(n), out = e >= 0 ? -1 : 1;
  if (n) tag(ctx, `${Math.abs(n)} m ${n > 0 ? 'north' : 'south'}`, x0 + out * 72, (y0 + yn) / 2, NORTH_COLOUR);
  if (e) tag(ctx, `${Math.abs(e)} m ${e > 0 ? 'east' : 'west'}`, (x0 + xe) / 2, yn + (n >= 0 ? -16 : 16), EAST_COLOUR);
  if (t.line && e && n) {
    const mx = (x0 + xe) / 2, my = (y0 + yn) / 2, away = Math.hypot(mx - x0, my - yn) || 1;
    tag(ctx, `${Math.hypot(e, n).toFixed(0)} m`, mx + (mx - x0) / away * 34, my + (my - yn) / away * 18, theme.accent);
  }
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
  // On the free test the label goes past the end of the ruler, clear of the compass; elsewhere it stays clear of the hut.
  if (view.plan != null) tag(ctx, `${Math.round(L)} m`, ex + ux * 36, ey + uy * 24, theme.accent);
  else text(ctx, `${Math.round(L)} m`, ex - px * 30 - ux * 52, ey - py * 30 - uy * 52, {size: 18, colour: theme.accent});
}
// Kestrel One from above: its nose along its heading, the rotor a turning disc.
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
  // The angle being measured: from north, clockwise round to the heading.
  angleFromNorth(ctx, x, y, RING - 16, view.heli.heading, `${Math.round(round(view.heli.heading))}°`);
  // The heading itself: the nose line out past the ring, in brass.
  const [ux, uy] = nose(view.heli.heading);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(x + ux * 32, y + uy * 32); ctx.lineTo(x + ux * (RING + 70), y + uy * (RING + 70)); ctx.stroke(); ctx.setLineDash([]);
}
// A dark panel beside the map with a small title.
function sidePanel(ctx, x, y, w, h, title) {
  ctx.fillStyle = '#121617'; ctx.strokeStyle = theme.beamLight; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
  text(ctx, title, x + w / 2, y + 22, {size: 16, colour: theme.faint, weight: 800});
}
// The HEADING gauge, three figures as in the helicopter, what the helicopter has flown, and the keys and results below.
function gauge(ctx, view) {
  const x = 762, w = 222;
  ctx.fillStyle = '#121617'; ctx.strokeStyle = view.glow === 'compass' ? theme.accent : theme.beamLight; ctx.lineWidth = view.glow === 'compass' ? 3 : 2;
  ctx.beginPath(); ctx.roundRect(x, 40, w, 150, 8); ctx.fill(); ctx.stroke();
  text(ctx, 'HEADING', x + w / 2, 66, {size: 16, colour: theme.faint, weight: 800});
  text(ctx, view.gauge, x + w / 2, 128, {size: 72, colour: NORTH_COLOUR, weight: 800});
  text(ctx, 'degrees clockwise from north', x + w / 2, 174, {size: 13, colour: theme.faint});
  if (view.flown != null) {
    sidePanel(ctx, x, 206, w, 92, 'FLOWN');
    text(ctx, `${Math.round(view.flown)} m`, x + w / 2, 268, {size: 40, colour: NORTH_COLOUR, weight: 800});
  } else if (view.plan != null) {
    sidePanel(ctx, x, 206, w, 92, 'FLIGHT LENGTH');
    text(ctx, `${Math.round(view.plan)} m`, x + w / 2, 268, {size: 40, colour: theme.accent, weight: 800});
  } else if (view.marker) {
    const {east, north} = view.marker;
    sidePanel(ctx, x, 206, w, 92, 'MARKER');
    text(ctx, `${Math.abs(east)} m ${east < 0 ? 'west' : 'east'}`, x + w / 2, 250, {size: 24, colour: EAST_COLOUR, weight: 800});
    text(ctx, `${Math.abs(north)} m ${north < 0 ? 'south' : 'north'}`, x + w / 2, 278, {size: 24, colour: NORTH_COLOUR, weight: 800});
  }
  // The keys, with what each one does.
  const row = (y, key, label) => { keyCap(ctx, x + 22, y, key); text(ctx, label, x + 42, y, {size: 14, align: 'left'}); };
  if (view.keys.A) { row(324, 'A', 'turn left: number down'); row(354, 'D', 'turn right: number up'); }
  if (view.keys['→'] === 'ruler:longer') { row(324, '→', 'ruler longer'); row(354, '←', 'ruler shorter'); }
  if (view.keys['→'] === 'length:longer') { row(384, '→', 'longer flight'); row(414, '←', 'shorter flight'); }
  if (view.keys['↑']) { row(324, '↑', 'one box north'); row(354, '↓', 'one box south'); row(384, '→', 'one box east'); row(414, '←', 'one box west'); }
  // The free test's table: where each flight ended up.
  if (view.rows.length) {
    text(ctx, 'YOUR FLIGHTS', x + w / 2, 446, {size: 13, colour: theme.faint, weight: 800});
    view.rows.slice(-5).forEach((flight, i) => {
      const y = 460 + i * 40;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.07)'; ctx.fillRect(x, y, w, 38);
      text(ctx, `Heading ${three(flight.heading)} for ${flight.distance} m`, x + 8, y + 11, {size: 14, align: 'left', weight: 800});
      text(ctx, `${Math.abs(flight.east)} m ${flight.east < 0 ? 'west' : 'east'}, ${Math.abs(flight.north)} m ${flight.north < 0 ? 'south' : 'north'}`, x + 8, y + 28, {size: 13, align: 'left', colour: theme.accent});
    });
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
  if (view.triangle) triangleLines(ctx, view);
  if (view.spot) spot(ctx, view.spot, view.time);
  if (view.compass) compassRing(ctx, view);
  kestrel(ctx, view);
  if (view.triangle) triangleTags(ctx, view);
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
    miniScene(ctx, idea.id, x + w / 2, 195, view.time);
    wrap(ctx, idea.text, x + w / 2, 420, w - 30, {size: 19, weight: 600});
  });
}
function miniCompass(ctx, x, y, r, deg, labels = true) {
  ctx.strokeStyle = 'rgba(245,240,220,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  if (labels) for (const [d, l] of [[0, '000'], [90, '090'], [180, '180'], [270, '270']]) { const [ux, uy] = nose(d); text(ctx, l, x + ux * (r + 24), y + uy * (r + 14), {size: 15}); }
  angleFromNorth(ctx, x, y, r * .72, deg);
  const [ux, uy] = nose(deg);
  ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * r * .9, y + uy * r * .9); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x + ux * r * .9, y + uy * r * .9, Math.min(6, r * .12), 0, Math.PI * 2); ctx.fill();
}
function miniScene(ctx, id, x, y, time) {
  if (id === 'heading') { miniCompass(ctx, x, y, 70, 70); text(ctx, '070', x, y + 124, {size: 30, colour: NORTH_COLOUR}); }
  if (id === 'turn') {
    const deg = round(350 + ((time * 30) % 40));
    miniCompass(ctx, x, y, 70, deg);
    text(ctx, three(deg), x, y + 124, {size: 30, colour: NORTH_COLOUR});
    keyCap(ctx, x - 70, y + 170, 'A'); text(ctx, 'down', x - 54, y + 170, {size: 14, align: 'left', colour: PLAIN});
    keyCap(ctx, x + 30, y + 170, 'D'); text(ctx, 'up', x + 46, y + 170, {size: 14, align: 'left', colour: PLAIN});
  }
  if (id === 'scale') {
    // Three boxes east and four north, the triangle of the sums, at 45 units a box.
    const s = 45, ox = x - 90, oy = y + 90;
    ctx.strokeStyle = 'rgba(237,197,87,.4)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(ox - s / 2 + i * s, oy); ctx.lineTo(ox - s / 2 + i * s, oy - 4 * s); ctx.stroke(); }
    for (let j = 0; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(ox - s / 2, oy - j * s); ctx.lineTo(ox - s / 2 + 4 * s, oy - j * s); ctx.stroke(); }
    const side = (x1, y1, x2, y2, colour) => { ctx.strokeStyle = colour; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    side(ox, oy, ox, oy - 4 * s, NORTH_COLOUR); side(ox, oy - 4 * s, ox + 3 * s, oy - 4 * s, EAST_COLOUR); side(ox, oy, ox + 3 * s, oy - 4 * s, theme.accent);
    tag(ctx, '300 m', ox + 1.5 * s, oy - 4 * s - 14, EAST_COLOUR); tag(ctx, '400 m', ox - 8, oy - 2 * s, NORTH_COLOUR); tag(ctx, '500 m', ox + 2.2 * s, oy - 1.5 * s, theme.accent);
    text(ctx, '1 box = 100 m', x, y + 124, {size: 18, colour: theme.accent});
  }
}

export function drawBoard(ctx, view, width, height) {
  return fitBoard(ctx, width, height, () => {
    if (view.scene === 'recap') { background(ctx); drawRecap(ctx, view); }
    else drawMap(ctx, view);
  });
}
// The answer cards' pictures: a compass with one heading, a turn the short or long way, a distance in boxes.
export function drawPicture(ctx, picture, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#2f3a2c'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  if (picture.kind === 'heading') {
    miniCompass(ctx, cx, cy, 40, picture.deg, false);
    text(ctx, 'N', cx, cy - 47, {size: 14, colour: theme.text});
  }
  if (picture.kind === 'wrap') {
    const r = 40, at = d => [cx + Math.sin(d * Math.PI / 180) * r, cy - Math.cos(d * Math.PI / 180) * r];
    ctx.strokeStyle = 'rgba(245,240,220,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // Only the way the turn sets off from 350, the same length each way, so the picture does not settle which turn is smaller.
    const setOff = dir => {
      const from = (350 - 90) * Math.PI / 180, to = (350 + dir * 14 - 90) * Math.PI / 180, ex = cx + Math.cos(to) * r, ey = cy + Math.sin(to) * r, tx = -Math.sin(to) * dir, ty = Math.cos(to) * dir, ox = Math.cos(to), oy = Math.sin(to);
      ctx.strokeStyle = theme.accent; ctx.fillStyle = theme.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, Math.min(from, to), Math.max(from, to)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + tx * 11, ey + ty * 11); ctx.lineTo(ex + ox * 7, ey + oy * 7); ctx.lineTo(ex - ox * 7, ey - oy * 7); ctx.closePath(); ctx.fill();
    };
    if (picture.way === 'right' || picture.way === 'same') setOff(1);
    if (picture.way === 'left' || picture.way === 'same') setOff(-1);
    for (const [d, l] of [[350, '350'], [10, '010']]) { const [x, y] = at(d); ctx.fillStyle = theme.text; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); text(ctx, l, x + (d === 350 ? -26 : 26), y + 2, {size: 15}); }
  }
  if (picture.kind === 'boxes') {
    const sq = 26, n = picture.m / BOX_M, x0 = 14, y0 = cy;
    ctx.strokeStyle = 'rgba(237,197,87,.45)'; ctx.lineWidth = 1;
    for (let i = 0; i * sq <= w - 28; i++) ctx.strokeRect(x0 + i * sq, y0 - sq / 2, sq, sq);
    const long = Math.min(n * sq, w - 28);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + long, y0); ctx.stroke();
    if (n * sq > w - 28) { ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.moveTo(w - 6, y0); ctx.lineTo(w - 16, y0 - 7); ctx.lineTo(w - 16, y0 + 7); ctx.fill(); }
  }
}
