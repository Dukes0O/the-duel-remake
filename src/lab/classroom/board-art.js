// Shared drawing for the classroom boards (docs/board/cards/LAB-CLASSROOM.md section 3): the workshop
// wall and floor, text, key caps, force arrows, and Kestrel One and the Dusthawk drawn side on. Draws only.
export const BOARD = Object.freeze({width: 1000, height: 680});
export const GROUND_Y = 600;

// The steel workshop look (LAB-CLASSROOM look round 1, picked by Claude): painted steel, brass and iron.
export const theme = Object.freeze({back: ['#2a3134', '#161b1d'], grain: 'rgba(255,255,255,.035)', beam: '#626a70', beamLight: '#8d969c', beamDark: '#363c40', rivet: '#a7aeb2',
  line: '#e3dccb', faint: 'rgba(227,220,203,.28)', text: '#f5f0dc', accent: '#edc557', good: '#56d683', bad: '#f07a5a', ghost: 'rgba(190,198,204,.42)',
  brass: ['#ffe9a6', '#d9a640', '#6b4810'], iron: ['#c7cfd4', '#5d666c', '#1f2427'], dial: '#efe7d2', ground: '#2c2a24', sky: ['#3b4a52', '#1d2427'], plate: '#252c29'});

// The workshop wall behind every board (LAB-LOOK round 1): corrugated steel under one hanging lamp. It never
// changes, so it is painted once into a spare canvas and copied each frame. Where there is no page (the tests)
// it is painted directly.
let wall = null;
function paintWall(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD.height);
  g.addColorStop(0, '#2b3a44'); g.addColorStop(.55, '#1c262c'); g.addColorStop(1, '#101518');
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  // Corrugated sheets: a light and a dark side to every rib, with a seam every fifth rib.
  for (let x = 0, i = 0; x < BOARD.width; x += 20, i++) {
    ctx.fillStyle = 'rgba(255,255,255,.028)'; ctx.fillRect(x, 0, 7, BOARD.height);
    ctx.fillStyle = 'rgba(0,0,0,.10)'; ctx.fillRect(x + 11, 0, 7, BOARD.height);
    if (i % 5 === 0) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, 0, 1.5, BOARD.height); }
  }
  // Rust and damp creeping down from the sheets' top edge and up from the floor, the same every time.
  for (let i = 0; i < 46; i++) {
    const x = (i * 7919) % BOARD.width, top = i % 3 !== 0, len = 40 + (i * 131) % 150, w = 3 + (i * 17) % 9;
    const r = ctx.createLinearGradient(0, top ? 0 : BOARD.height, 0, top ? len : BOARD.height - len);
    r.addColorStop(0, i % 2 ? 'rgba(150,84,40,.20)' : 'rgba(0,0,0,.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r; ctx.fillRect(x, top ? 0 : BOARD.height - len, w, len);
  }
  // The lamp's pool of warm light, and the dark the lamp does not reach.
  const lamp = ctx.createRadialGradient(500, -60, 40, 500, 120, 620);
  lamp.addColorStop(0, 'rgba(255,214,150,.26)'); lamp.addColorStop(.45, 'rgba(255,200,130,.07)'); lamp.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lamp; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  const v = ctx.createRadialGradient(500, 300, 260, 500, 340, 700);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
}
export function background(ctx) {
  if (typeof document === 'undefined') { paintWall(ctx); return; }
  if (!wall) { wall = document.createElement('canvas'); wall.width = BOARD.width; wall.height = BOARD.height; paintWall(wall.getContext('2d')); }
  ctx.drawImage(wall, 0, 0);
}
// A concrete workshop floor from `y` down, with a worn edge where it meets the wall.
export function floor(ctx, y = GROUND_Y) {
  const g = ctx.createLinearGradient(0, y, 0, BOARD.height);
  g.addColorStop(0, '#4a4d49'); g.addColorStop(.12, '#35383a'); g.addColorStop(1, '#17191b');
  ctx.fillStyle = g; ctx.fillRect(0, y, BOARD.width, BOARD.height - y);
  ctx.fillStyle = 'rgba(255,236,200,.10)'; ctx.fillRect(0, y, BOARD.width, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, y - 3, BOARD.width, 3);
  // Slab joints and oil stains, the same every time.
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let x = -40; x < BOARD.width + 200; x += 170) { ctx.moveTo(x, y); ctx.lineTo(x - 60, BOARD.height); }
  ctx.stroke();
  for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse((i * 271 + 90) % BOARD.width, y + 18 + (i * 23) % 50, 26 + (i * 13) % 30, 5 + (i * 7) % 6, 0, 0, Math.PI * 2); ctx.fill(); }
}
// A soft shadow on the floor under something that stands or hangs above it.
export function shadow(ctx, x, y, halfWidth, strength = .5) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, halfWidth);
  g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .16); ctx.translate(-x, -y);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, halfWidth, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
// A force drawn as a lit arrow from (x, y), `length` long, up or down: green for lift, red for weight.
export function forceArrow(ctx, x, y, length, up, colour, width = 10) {
  if (length < 2) return;
  const dir = up ? -1 : 1, head = Math.min(18, length * .6), tip = y + dir * length, neck = y + dir * (length - head);
  ctx.save();
  ctx.shadowColor = colour; ctx.shadowBlur = 14;
  ctx.fillStyle = colour; ctx.beginPath();
  ctx.moveTo(x - width / 2, y); ctx.lineTo(x + width / 2, y); ctx.lineTo(x + width / 2, neck); ctx.lineTo(x + width * 1.35, neck);
  ctx.lineTo(x, tip); ctx.lineTo(x - width * 1.35, neck); ctx.lineTo(x - width / 2, neck); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
  // A bright edge down one side, so the arrow reads as a solid thing in the lamp's light.
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - width / 2, Math.min(y, neck), width * .28, Math.abs(neck - y));
  ctx.restore();
}
export function text(ctx, value, x, y, {size = 20, colour = theme.text, align = 'center', weight = 700, baseline = 'middle'} = {}) {
  ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(value, x + 1.5, y + 1.5);
  ctx.fillStyle = colour; ctx.fillText(value, x, y);
}
export function keyCap(ctx, x, y, key, dark = false) {
  ctx.fillStyle = dark ? '#1d2224' : '#f5f0dc'; ctx.beginPath(); ctx.roundRect(x - 10, y - 10, 20, 20, 3); ctx.fill();
  ctx.fillStyle = dark ? '#f5f0dc' : '#1d2224'; ctx.font = '800 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(key, x, y + 1);
}
// Kestrel One side on, nose to the right: a light utility helicopter in the workshop lamp's light. The rotor is at
// y -35, the skids at y 32, the tail reaches x -124. A `time` of 0 means the rotor is stopped.
export function helicopter(ctx, x, y, tilt, time, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(scale, scale);
  const spinning = time !== 0;
  // Skids and their struts, behind the body.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#161a1c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-26, 20); ctx.lineTo(-31, 32); ctx.moveTo(22, 20); ctx.lineTo(27, 32); ctx.stroke();
  ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(-50, 32); ctx.lineTo(40, 32); ctx.quadraticCurveTo(48, 32, 52, 27); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,200,205,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-49, 31); ctx.lineTo(40, 31); ctx.stroke();
  ctx.lineCap = 'butt';
  // Tail boom, fin and stabiliser.
  const boom = ctx.createLinearGradient(0, -9, 0, 9); boom.addColorStop(0, '#8a9783'); boom.addColorStop(.5, '#56624f'); boom.addColorStop(1, '#262c25');
  ctx.fillStyle = boom; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-119, -4.5); ctx.lineTo(-119, 3.5); ctx.lineTo(-34, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6a43a'; ctx.beginPath(); ctx.moveTo(-84, -6.6); ctx.lineTo(-92, -6.1); ctx.lineTo(-92, 4.6); ctx.lineTo(-84, 5.4); ctx.closePath(); ctx.fill();
  const fin = ctx.createLinearGradient(-124, -32, -100, 0); fin.addColorStop(0, '#7f8c79'); fin.addColorStop(1, '#353d34');
  ctx.fillStyle = fin; ctx.beginPath(); ctx.moveTo(-106, -4); ctx.lineTo(-126, -32); ctx.lineTo(-113, -32); ctx.lineTo(-97, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f372f'; ctx.beginPath(); ctx.moveTo(-104, 2); ctx.lineTo(-121, 12); ctx.lineTo(-115, 12); ctx.lineTo(-98, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#343c36'; ctx.fillRect(-78, -2, 24, 3);
  // Tail rotor: a blurred disc while it spins, one blade when it is stopped.
  if (spinning) {
    const disc = ctx.createRadialGradient(-119, -1, 1, -119, -1, 17); disc.addColorStop(0, 'rgba(225,230,225,.30)'); disc.addColorStop(.8, 'rgba(225,230,225,.12)'); disc.addColorStop(1, 'rgba(225,230,225,0)');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(-119, -1, 17, 0, Math.PI * 2); ctx.fill();
    const a = time * 40; ctx.strokeStyle = 'rgba(20,24,26,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-119 - Math.cos(a) * 15, -1 - Math.sin(a) * 15); ctx.lineTo(-119 + Math.cos(a) * 15, -1 + Math.sin(a) * 15); ctx.stroke();
  } else { ctx.strokeStyle = '#1b2022'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-119, -16); ctx.lineTo(-119, 14); ctx.stroke(); }
  ctx.fillStyle = '#15191b'; ctx.beginPath(); ctx.arc(-119, -1, 2.6, 0, Math.PI * 2); ctx.fill();
  // The cabin.
  const body = ctx.createLinearGradient(0, -28, 0, 24);
  body.addColorStop(0, '#b9c4ab'); body.addColorStop(.22, '#8d9a82'); body.addColorStop(.62, '#56634f'); body.addColorStop(1, '#20261f');
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.bezierCurveTo(-30, -26, 30, -28, 46, -8); ctx.bezierCurveTo(54, 6, 44, 22, 20, 22); ctx.lineTo(-34, 20); ctx.bezierCurveTo(-46, 16, -48, -6, -40, -14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
  // Engine cowl and exhaust on the roof behind the mast.
  const cowl = ctx.createLinearGradient(0, -31, 0, -20); cowl.addColorStop(0, '#a5b09a'); cowl.addColorStop(1, '#4b5646');
  ctx.fillStyle = cowl; ctx.beginPath(); ctx.moveTo(-36, -18); ctx.quadraticCurveTo(-30, -31, -14, -30); ctx.lineTo(8, -27); ctx.lineTo(8, -22); ctx.lineTo(-36, -18); ctx.fill();
  ctx.fillStyle = '#131617'; ctx.beginPath(); ctx.ellipse(-31, -21, 4.2, 2.6, -.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.30)'; for (let i = 0; i < 4; i++) ctx.fillRect(-24 + i * 5, -27, 2.4, 5);
  // The gold band, the door and its window, panel lines and rivets.
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-42, 5, 86, 5.5);
  ctx.fillStyle = 'rgba(0,0,0,.30)'; ctx.fillRect(-42, 10.5, 86, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-42, 5, 86, 1.1);
  ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-8, -23); ctx.lineTo(-8, 19); ctx.moveTo(-30, -19); ctx.lineTo(-30, 18); ctx.stroke();
  const pane = ctx.createLinearGradient(-28, -18, -10, 0); pane.addColorStop(0, '#9fb7c2'); pane.addColorStop(1, '#2a3a44');
  ctx.fillStyle = pane; ctx.beginPath(); ctx.roundRect(-27, -17, 16, 14, 3); ctx.fill();
  ctx.fillStyle = 'rgba(15,18,16,.5)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-38 + i * 9.5, 16.5, .9, 0, Math.PI * 2); ctx.fill(); }
  // The windscreen, with the pilot's helmet behind it and the lamp reflected in it.
  const glass = ctx.createLinearGradient(6, -26, 48, 4); glass.addColorStop(0, '#e6f1f4'); glass.addColorStop(.45, '#8fb0bd'); glass.addColorStop(1, '#263843');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.bezierCurveTo(22, -26, 42, -17, 48, -4); ctx.lineTo(-4, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(18,22,24,.72)'; ctx.beginPath(); ctx.arc(17, -10, 6.2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(10, -5, 14, 4);
  ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.beginPath(); ctx.moveTo(2, -20.5); ctx.lineTo(14, -22); ctx.lineTo(6, -4); ctx.lineTo(-1, -4); ctx.closePath(); ctx.fill();
  // The lamp's light along the roof, and the shade under the belly.
  ctx.strokeStyle = 'rgba(255,244,214,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-36, -17); ctx.bezierCurveTo(-26, -26, 28, -27.5, 43, -11); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(-36, 17); ctx.lineTo(22, 19); ctx.bezierCurveTo(34, 19, 44, 14, 48, 6); ctx.bezierCurveTo(46, 18, 36, 22, 20, 22); ctx.lineTo(-34, 20); ctx.closePath(); ctx.fill();
  // The cargo hook under the belly, a red light on the fin and a white one under the nose.
  ctx.strokeStyle = '#15191b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 21); ctx.lineTo(0, 25); ctx.stroke();
  const blink = spinning && Math.sin(time * 6) > .2;
  ctx.fillStyle = blink ? '#ff5a46' : '#7c2a22'; ctx.beginPath(); ctx.arc(-120, -32, 2.2, 0, Math.PI * 2); ctx.fill();
  if (blink) { ctx.fillStyle = 'rgba(255,90,70,.28)'; ctx.beginPath(); ctx.arc(-120, -32, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#f4f1e4'; ctx.beginPath(); ctx.arc(40, 17, 1.8, 0, Math.PI * 2); ctx.fill();
  // The mast, the hub and the rotor: a blurred disc with two ghost blades while it spins, one drooping blade when stopped.
  ctx.fillStyle = '#1c2123'; ctx.fillRect(-3.5, -34, 7, 9);
  ctx.fillStyle = '#30383b'; ctx.beginPath(); ctx.ellipse(0, -35, 9, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  if (spinning) {
    const disc = ctx.createLinearGradient(-130, 0, 130, 0);
    disc.addColorStop(0, 'rgba(226,230,222,0)'); disc.addColorStop(.12, 'rgba(226,230,222,.20)'); disc.addColorStop(.5, 'rgba(226,230,222,.34)'); disc.addColorStop(.88, 'rgba(226,230,222,.20)'); disc.addColorStop(1, 'rgba(226,230,222,0)');
    ctx.fillStyle = disc; ctx.beginPath(); ctx.ellipse(0, -35, 130, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    for (const phase of [0, 1.9]) {
      const reach = 128 * Math.cos(time * 22 + phase);
      ctx.strokeStyle = 'rgba(20,24,26,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-reach, -35); ctx.lineTo(reach, -35); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,250,235,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-96, -37.5); ctx.lineTo(-30, -38.5); ctx.stroke();
  } else {
    ctx.strokeStyle = '#1b2022'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-128, -31); ctx.quadraticCurveTo(0, -38, 128, -31); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,208,205,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-126, -32.5); ctx.quadraticCurveTo(0, -39.5, 126, -32.5); ctx.stroke();
  }
  ctx.restore();
}
// The Dusthawk rally car on its lifting sling, nose to the right.
export function car(ctx, x, y, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = '#c9c2b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-26, -4); ctx.moveTo(0, -20); ctx.lineTo(26, -4); ctx.stroke();
  // The wheels first, so that the body sits over them.
  for (const wx of [-22, 24]) {
    ctx.fillStyle = '#0c0e0f'; ctx.beginPath(); ctx.arc(wx, 15, 8.6, 0, Math.PI * 2); ctx.fill();
    const rim = ctx.createRadialGradient(wx - 1, 14, .5, wx, 15, 5); rim.addColorStop(0, '#f1f3f2'); rim.addColorStop(.6, '#8d949a'); rim.addColorStop(1, '#3b4044');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(wx, 15, 4.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,22,24,.8)'; ctx.lineWidth = .9; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * Math.PI * .4; ctx.moveTo(wx, 15); ctx.lineTo(wx + Math.cos(a) * 4.6, 15 + Math.sin(a) * 4.6); } ctx.stroke();
  }
  const paint = ctx.createLinearGradient(0, -13, 0, 15); paint.addColorStop(0, '#fbf7ea'); paint.addColorStop(.5, '#d9d2c0'); paint.addColorStop(1, '#7c776b');
  ctx.fillStyle = paint; ctx.beginPath();
  ctx.moveTo(-38, 13); ctx.lineTo(-38, 3); ctx.quadraticCurveTo(-37, 0, -21, -1.5); ctx.lineTo(-12, -12); ctx.quadraticCurveTo(-10, -13.5, -6, -13.5); ctx.lineTo(13, -13.5); ctx.quadraticCurveTo(17, -13, 19, -10.5);
  ctx.lineTo(27, -1.5); ctx.quadraticCurveTo(38, 0, 39, 3.5); ctx.lineTo(39, 13);
  ctx.lineTo(33.5, 13); ctx.arc(24, 15, 9.6, -.2, Math.PI + .2, true); ctx.lineTo(-12.5, 13); ctx.arc(-22, 15, 9.6, -.2, Math.PI + .2, true); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.1; ctx.stroke();
  // The green band, the windows, the door line, a roof scoop, lamps and mud flaps.
  ctx.fillStyle = '#2f7a4c'; ctx.fillRect(-37.5, 4.5, 76, 4.2);
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-37.5, 8.7, 76, 1.3);
  const win = ctx.createLinearGradient(0, -12, 0, -1); win.addColorStop(0, '#8fb0bd'); win.addColorStop(1, '#22323b');
  ctx.fillStyle = win; ctx.beginPath(); ctx.moveTo(-9, -10.5); ctx.lineTo(2.5, -10.5); ctx.lineTo(2.5, -1.5); ctx.lineTo(-17, -1.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5.5, -10.5); ctx.lineTo(13, -10.5); ctx.lineTo(21.5, -1.5); ctx.lineTo(5.5, -1.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(4, 12); ctx.stroke();
  ctx.fillStyle = '#3a3f41'; ctx.fillRect(-2, -16.2, 9, 2.8);
  ctx.fillStyle = '#ffe9a6'; ctx.fillRect(36.6, 1.5, 2.6, 3); ctx.fillStyle = '#c0392b'; ctx.fillRect(-38.4, 1.5, 2.2, 3);
  ctx.fillStyle = '#17191a'; ctx.fillRect(-33, 13, 2, 7); ctx.fillRect(14, 13, 2, 7);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-10, -13, 22, .9);
  ctx.restore();
}
// The pad outside the hangar at dusk: sky, the hills behind Tremblant Woods, a line of firs and the apron.
let dusk = null;
function paintDusk(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#16222f'); sky.addColorStop(.5, '#3a4860'); sky.addColorStop(.82, '#a8736a'); sky.addColorStop(1, '#f0a85e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, BOARD.width, GROUND_Y);
  const sun = ctx.createRadialGradient(760, GROUND_Y - 30, 4, 760, GROUND_Y - 30, 380);
  sun.addColorStop(0, 'rgba(255,226,170,.75)'); sun.addColorStop(.25, 'rgba(255,170,100,.30)'); sun.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, BOARD.width, GROUND_Y);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${.15 + (i % 5) * .08})`; ctx.fillRect((i * 613) % BOARD.width, (i * 197) % 240, 1.4, 1.4); }
  // Long thin clouds catching the last light.
  for (let i = 0; i < 6; i++) {
    const cx = (i * 331 + 120) % BOARD.width, cy = 150 + (i * 53) % 230, c = ctx.createLinearGradient(cx - 150, 0, cx + 150, 0);
    c.addColorStop(0, 'rgba(255,190,140,0)'); c.addColorStop(.5, 'rgba(255,190,140,.22)'); c.addColorStop(1, 'rgba(255,190,140,0)');
    ctx.fillStyle = c; ctx.fillRect(cx - 150, cy, 300, 5 + (i % 3) * 3);
  }
  // Two ranges of hills, the far one paler.
  const range = (base, height, step, colour, seed) => {
    ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= BOARD.width; x += step) ctx.lineTo(x, base - height * (.5 + .5 * Math.sin(x * .011 + seed) * Math.cos(x * .0043 + seed * 2)) - 14 * Math.sin(x * .05 + seed));
    ctx.lineTo(BOARD.width, GROUND_Y); ctx.closePath(); ctx.fill();
  };
  range(GROUND_Y - 70, 150, 10, '#4f4c66', 1.3); range(GROUND_Y - 30, 100, 8, '#2b3040', 4.1);
  // Firs, darker and taller toward the viewer.
  for (let row = 0; row < 2; row++) for (let i = 0; i < 44; i++) {
    const x = i * 24 + (i % 3) * 7 + row * 11, h = (row ? 58 : 38) + (i * 37) % (row ? 44 : 26), w = h * .23;
    ctx.fillStyle = row ? '#0e1512' : '#1a2420';
    for (let tier = 0; tier < 3; tier++) { const ty = GROUND_Y - h + tier * h * .26, tw = w * (.55 + tier * .3); ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x - tw, ty + h * .42); ctx.lineTo(x + tw, ty + h * .42); ctx.closePath(); ctx.fill(); }
  }
  // The apron: tarmac with the low sun raking across it.
  const apron = ctx.createLinearGradient(0, GROUND_Y, 0, BOARD.height); apron.addColorStop(0, '#3a3836'); apron.addColorStop(1, '#141414');
  ctx.fillStyle = apron; ctx.fillRect(0, GROUND_Y, BOARD.width, BOARD.height - GROUND_Y);
  const rake = ctx.createLinearGradient(400, 0, 1000, 0); rake.addColorStop(0, 'rgba(255,170,100,0)'); rake.addColorStop(1, 'rgba(255,170,100,.16)');
  ctx.fillStyle = rake; ctx.fillRect(0, GROUND_Y, BOARD.width, 14);
  ctx.fillStyle = 'rgba(255,236,200,.22)'; ctx.fillRect(0, GROUND_Y, BOARD.width, 1.5);
  const v = ctx.createRadialGradient(500, 320, 300, 500, 340, 720); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
}
export function outdoors(ctx) {
  if (typeof document === 'undefined') { paintDusk(ctx); return; }
  if (!dusk) { dusk = document.createElement('canvas'); dusk.width = BOARD.width; dusk.height = BOARD.height; paintDusk(dusk.getContext('2d')); }
  ctx.drawImage(dusk, 0, 0);
}
// ---- LAB-BOARDS-1: shared pieces for the car lessons (Braking, Downforce, Fuel) ----
// A hex colour (#rrggbb) lightened toward white (t > 0) or darkened toward black (t < 0).
export function shade(colour, t) {
  const n = parseInt(colour.slice(1), 16), target = t > 0 ? 255 : 0, k = Math.abs(t);
  const mixed = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v + (target - v) * k));
  return `rgb(${mixed[0]},${mixed[1]},${mixed[2]})`;
}
// A colour a fraction t of the way from hex colour a to hex colour b.
export function blend(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), pick = (n, s) => n >> s & 255;
  const at = s => Math.round(pick(x, s) + (pick(y, s) - pick(x, s)) * t);
  return `rgb(${at(16)},${at(8)},${at(0)})`;
}
// The same number every time for the same i, so that wear and grain never flicker.
const noise = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// A force arrow along any direction, from (x0, y0) to (x1, y1).
export function forceArrowTo(ctx, x0, y0, x1, y1, colour, width = 10) {
  const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy);
  if (length < 2) return;
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan2(-dx, dy));
  forceArrow(ctx, 0, 0, length, false, colour, width);
  ctx.restore();
}
// A steel bar lit from above: a bright top edge, a darker body and a dark underside.
export function steel(ctx, x, y, w, h, r = 2) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#c9d1d6'); g.addColorStop(.2, '#8d979d'); g.addColorStop(.65, '#586166'); g.addColorStop(1, '#2a3135');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  if (w > 4 && h > 3) { ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.fillRect(x + r, y + .6, w - 2 * r, 1); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + r, y + h - 1.3, w - 2 * r, 1.3); }
}
export function bolt(ctx, x, y, r = 2.2) {
  const g = ctx.createRadialGradient(x - r * .3, y - r * .3, .3, x, y, r);
  g.addColorStop(0, '#dde3e6'); g.addColorStop(1, '#4a5257');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x - r * .6, y + r * .2); ctx.lineTo(x + r * .6, y - r * .2); ctx.stroke();
}
// A dark glass readout window with a glow inside it, for the weighing scales' numbers.
export function lcd(ctx, x, y, w, h, colour = '#56d683') {
  ctx.fillStyle = '#05100a'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * .6);
  g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 3, y + 2, w - 6, 1.4);
}

// Tarmac for a road drawn into the rectangle (x, y, w, h): grain, patches and cracks, a gravel verge and a worn white
// edge line along the top and the bottom. Painted once per size and copied (the tests, with no page, paint it directly).
const roads = new Map();
function paintTarmac(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2d2f32'); g.addColorStop(.5, '#2a2c2f'); g.addColorStop(1, '#202224');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0, n = Math.min(2400, w * h / 70); i < n; i++) {
    ctx.fillStyle = noise(i * 3 + 2) > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.17)';
    ctx.fillRect(noise(i * 3) * w, noise(i * 3 + 1) * h, 1.5, 1.2);
  }
  // Patched repairs, a shade lighter or darker than the road round them, and a few hairline cracks.
  for (let i = 0; i < Math.ceil(w / 140); i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.10)';
    ctx.fillRect(noise(i * 5 + 90) * w, 8 + noise(i * 5 + 91) * h * .5, 40 + noise(i * 5 + 92) * 90, 6 + noise(i * 5 + 93) * h * .3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < Math.ceil(w / 220); i++) {
    let cx = noise(i * 7 + 400) * w, cy = 8 + noise(i * 7 + 401) * (h - 16);
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 5; k++) { cx += 6 + noise(i * 11 + k) * 10; cy += (noise(i * 13 + k + 3) - .5) * 9; ctx.lineTo(cx, cy); }
  }
  ctx.stroke();
  if (h < 46) return;
  // The gravel verge, its shadow, and the white edge line with worn gaps.
  ctx.fillStyle = '#4d4a43'; ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 3, w, 2); ctx.fillRect(0, h - 5, w, 2);
  ctx.fillStyle = 'rgba(235,230,214,.55)';
  for (let x = 0, i = 0; x < w; i++) {
    const len = 30 + noise(i + 600) * 70; ctx.fillRect(x, 8, len, 2.2); ctx.fillRect(x + 11, h - 10, len, 2.2); x += len + noise(i + 700) * 14;
  }
}
export function tarmac(ctx, x, y, w, h) {
  if (typeof document === 'undefined') { ctx.save(); ctx.translate(x, y); paintTarmac(ctx, w, h); ctx.restore(); return; }
  const key = `${Math.round(w)}x${Math.round(h)}`;
  let road = roads.get(key);
  if (!road) {
    road = document.createElement('canvas'); road.width = Math.round(w); road.height = Math.round(h);
    paintTarmac(road.getContext('2d'), road.width, road.height);
    roads.set(key, road);
  }
  ctx.drawImage(road, x, y);
}
// A stripe painted across the road at x, from top to bottom, with chips worn out of it and a lit edge.
export function paintStripe(ctx, x, top, bottom, width, colour) {
  ctx.fillStyle = colour; ctx.fillRect(x - width / 2, top, width, bottom - top);
  for (let y = top, i = 0; y < bottom; y += 5, i++) if (noise(i * 7 + x) > .62) {
    ctx.fillStyle = 'rgba(30,32,34,.55)'; ctx.fillRect(x - width / 2 + noise(i + x) * width * .5, y, width * (.2 + noise(i * 3 + x) * .4), 2 + noise(i * 5 + x) * 3);
  }
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - width / 2, top, 1, bottom - top);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + width / 2 - 1, top, 1, bottom - top);
}
// A white roadside post with a dark band and a red reflector, standing with its foot at (x, y).
export function roadPost(ctx, x, y, height = 16) {
  shadow(ctx, x + 2, y + 1, 7, .5);
  const g = ctx.createLinearGradient(x - 2.5, 0, x + 2.5, 0); g.addColorStop(0, '#f2eee0'); g.addColorStop(.6, '#cfcabb'); g.addColorStop(1, '#7d7a70');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - 2.5, y - height, 5, height, 1.5); ctx.fill();
  ctx.fillStyle = '#1b1d1e'; ctx.fillRect(x - 2.5, y - height + 3, 5, 3);
  ctx.fillStyle = '#d4402c'; ctx.fillRect(x - 1.4, y - height + 8, 2.8, 2.6);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 2, y - height + 1, 1, height - 2);
}

// The red road car (a Falcone F42) side on, nose to the right, drawn at the size and anchor the lessons' flat car had:
// the nose is at (x, y), the car is 92 long, the wheel centres are 20 and 74 behind the nose, 7 below y, 9 in radius, and
// the road is 16 below y. Options: scale; colour; angle (turns the whole car about its nose, tail down); facing (-1
// points it left); pitch (the body dips its nose, in radians, the wheels stay on the road); spin (how far the wheels
// have turned, in radians); blur (0 to 1, spokes smear when the wheels turn fast); locked (the back wheel has stopped
// turning: red, smoking); heat and rearHeat (0 to 1, how brightly the front and the back brake discs glow);
// braking (the tail lamps are bright); lights (the headlamp throws a beam); shadow (the floor shadow); detail
// (spokes, discs, door and handle, off by default for small cars).
export const ROAD_CAR = Object.freeze({length: 92, wheels: [-20, -74], wheelY: 7, wheelR: 9});
// The car's top edge, nose to tail, for air that has to pass over it.
export const ROAD_CAR_TOP = Object.freeze([[1.5, -1.5], [-3, -4.4], [-14, -6.3], [-26, -7.7], [-36, -8.6], [-44, -12.6], [-52, -18.6], [-60, -20.4], [-68, -19.6], [-74, -17.2], [-82, -13.6], [-91, -8.8], [-93.2, -6]]);
function topEdge(ctx) {
  ctx.quadraticCurveTo(2, -3.4, -3, -4.4);
  ctx.bezierCurveTo(-14, -6, -26, -7.6, -36, -8.6);
  ctx.bezierCurveTo(-41, -10, -47, -16.5, -52, -18.6);
  ctx.bezierCurveTo(-58, -20.8, -68, -20.2, -74, -17.2);
  ctx.bezierCurveTo(-82, -13.6, -87, -10.2, -91, -8.8);
}
function bodyPath(ctx) {
  ctx.beginPath(); ctx.moveTo(1, 7); ctx.lineTo(2, .5);
  topEdge(ctx);
  ctx.quadraticCurveTo(-93.2, -8.2, -93.2, -4); ctx.lineTo(-93, 5.5); ctx.quadraticCurveTo(-92.6, 8, -90, 8); ctx.lineTo(-85, 8);
  ctx.arc(-74, 7, 11, Math.PI - .09, Math.PI * 2 + .09); ctx.lineTo(-31, 8);
  ctx.arc(-20, 7, 11, Math.PI - .09, Math.PI * 2 + .09); ctx.lineTo(-4, 8.5); ctx.closePath();
}
function glassPath(ctx) {
  ctx.beginPath(); ctx.moveTo(-38, -8.7);
  ctx.bezierCurveTo(-42.5, -10.2, -47.5, -15.6, -52, -17.4);
  ctx.bezierCurveTo(-58, -19.4, -67.5, -18.8, -73, -16.1);
  ctx.bezierCurveTo(-80, -13, -84, -11.4, -87, -10.3);
  ctx.lineTo(-84, -8.9); ctx.closePath();
}
function carWheel(ctx, cx, cy, scale, {spin, blur, locked, heat, detail}) {
  ctx.fillStyle = '#0b0d0e'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
  const wall = ctx.createRadialGradient(cx, cy, 5.2, cx, cy, 9);
  wall.addColorStop(0, '#30373b'); wall.addColorStop(.5, '#191d1f'); wall.addColorStop(1, '#0a0b0c');
  ctx.fillStyle = wall; ctx.beginPath(); ctx.arc(cx, cy, 8.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI * 1.05, Math.PI * 1.65); ctx.stroke();
  if (locked) {
    ctx.fillStyle = 'rgba(240,122,90,.26)'; ctx.beginPath(); ctx.arc(cx, cy, 8.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = theme.bad; ctx.lineWidth = Math.min(3, 2.5 / scale + .8); ctx.beginPath(); ctx.arc(cx, cy, 10.4, 0, Math.PI * 2); ctx.stroke();
  }
  const rim = ctx.createRadialGradient(cx - 1.4, cy - 1.8, .5, cx, cy, 6.2);
  rim.addColorStop(0, '#f6f8f8'); rim.addColorStop(.55, '#9ba4aa'); rim.addColorStop(1, '#3f464b');
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, 6.1, 0, Math.PI * 2); ctx.fill();
  if (!detail) { ctx.fillStyle = '#2a2e31'; ctx.beginPath(); ctx.arc(cx, cy, 1.9, 0, Math.PI * 2); ctx.fill(); return; }
  // The brake disc shows between the spokes, and glows orange as the brakes work.
  if (heat > .02) {
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 9); glow.addColorStop(0, `rgba(255,150,60,${(.7 * heat).toFixed(2)})`); glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = blend('#444c52', '#ff8a3a', Math.min(1, heat)); ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  if (blur < .5) {
    ctx.strokeStyle = '#d3dadd'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const a = spin + k * Math.PI * .4; ctx.moveTo(cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4); ctx.lineTo(cx + Math.cos(a) * 5.6, cy + Math.sin(a) * 5.6); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .5; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const a = spin + k * Math.PI * .4 + .07; ctx.moveTo(cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4); ctx.lineTo(cx + Math.cos(a) * 5.6, cy + Math.sin(a) * 5.6); }
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(214,220,224,.26)'; ctx.beginPath(); ctx.arc(cx, cy, 5.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,234,236,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(spin) * 5, cy + Math.sin(spin) * 5); ctx.lineTo(cx - Math.cos(spin) * 5, cy - Math.sin(spin) * 5); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#d8a32a'; ctx.lineWidth = 2.1; ctx.beginPath(); ctx.arc(cx, cy, 4, -1.25, -.3); ctx.stroke();
  ctx.fillStyle = '#23272a'; ctx.beginPath(); ctx.arc(cx, cy, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(cx, cy, 6.1, 0, Math.PI * 2); ctx.stroke();
}
export function roadCar(ctx, x, y, {scale = 1, colour = '#c8402f', angle = 0, facing = 1, pitch = 0, spin = 0, blur = 0, locked = false, heat = 0, rearHeat = heat, braking = false, lights = false, shadow: dropShadow = true, detail = scale >= .7} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.rotate(-angle); ctx.scale(scale, scale);
  if (dropShadow) { shadow(ctx, -46.5, 16.6, 62, .6); shadow(ctx, -20, 16.4, 13, .75); shadow(ctx, -74, 16.4, 13, .75); }
  const tilt = () => { ctx.translate(-47, 16); ctx.rotate(pitch); ctx.translate(47, -16); };
  // The wheel wells, then the wheels (which stay on the road), then the body over them.
  ctx.save(); tilt();
  ctx.fillStyle = '#06080a'; for (const wx of ROAD_CAR.wheels) { ctx.beginPath(); ctx.arc(wx, 7, 11, Math.PI, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ROAD_CAR.wheels.forEach((wx, i) => carWheel(ctx, wx, 7, scale, {spin, blur, locked: locked && i === 1, heat: i ? rearHeat : heat, detail}));
  if (locked) for (const [dx, r, a] of [[-12, 8, .30], [-26, 11, .20], [-42, 13, .12]]) {
    const smoke = ctx.createRadialGradient(-74 + dx, 12, 1, -74 + dx, 12, r); smoke.addColorStop(0, `rgba(215,215,215,${a})`); smoke.addColorStop(1, 'rgba(215,215,215,0)');
    ctx.fillStyle = smoke; ctx.beginPath(); ctx.arc(-74 + dx, 12, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); tilt();
  // Paint: lit on top, dark under the sills.
  const paint = ctx.createLinearGradient(0, -21, 0, 9);
  paint.addColorStop(0, shade(colour, .5)); paint.addColorStop(.2, shade(colour, .22)); paint.addColorStop(.48, colour); paint.addColorStop(.78, shade(colour, -.38)); paint.addColorStop(1, shade(colour, -.62));
  bodyPath(ctx); ctx.fillStyle = paint; ctx.fill();
  ctx.save(); bodyPath(ctx); ctx.clip();
  // The shoulder catching the lamp, the long dark sill, the lamp's reflection across the doors.
  ctx.strokeStyle = 'rgba(255,236,214,.34)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -3.4); ctx.bezierCurveTo(-30, -6.4, -60, -6.6, -91, -7.4); ctx.stroke();
  const flank = ctx.createLinearGradient(0, -8, 0, 8); flank.addColorStop(0, 'rgba(255,255,255,.14)'); flank.addColorStop(.35, 'rgba(255,255,255,0)'); flank.addColorStop(1, 'rgba(0,0,0,.34)');
  ctx.fillStyle = flank; ctx.fillRect(-94, -9, 97, 18);
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(-62, 5, 30, 3.5);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.1; bodyPath(ctx); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,244,214,.6)'; ctx.lineWidth = 1.2; ctx.save(); ctx.translate(0, 1.1); ctx.beginPath(); ctx.moveTo(-3, -4.4); ctx.bezierCurveTo(-14, -6, -26, -7.6, -36, -8.6); ctx.bezierCurveTo(-41, -10, -47, -16.5, -52, -18.6); ctx.bezierCurveTo(-58, -20.8, -68, -20.2, -74, -17.2); ctx.stroke(); ctx.restore();
  // Glass with the sky in it, and the driver's head behind it.
  const glass = ctx.createLinearGradient(-60, -20, -50, -8); glass.addColorStop(0, '#bcd5df'); glass.addColorStop(.45, '#5f8291'); glass.addColorStop(1, '#16252d');
  glassPath(ctx); ctx.fillStyle = glass; ctx.fill();
  ctx.save(); glassPath(ctx); ctx.clip();
  if (detail) { ctx.fillStyle = 'rgba(12,16,18,.62)'; ctx.beginPath(); ctx.ellipse(-48.5, -12.6, 3, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-52, -10, 8, 3); }
  ctx.fillStyle = 'rgba(255,255,255,.36)'; ctx.beginPath(); ctx.moveTo(-44, -20); ctx.lineTo(-37, -20); ctx.lineTo(-49, -8); ctx.lineTo(-56, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-57, -20); ctx.lineTo(-67, -8); ctx.lineTo(-70, -8); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = .9; glassPath(ctx); ctx.stroke();
  ctx.strokeStyle = shade(colour, -.55); ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(-59, -19); ctx.lineTo(-59, -8.7); ctx.stroke();
  if (detail) {
    // The door, its handle and the mirror.
    ctx.strokeStyle = 'rgba(0,0,0,.42)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-36, -8.4); ctx.lineTo(-35.2, 7.4); ctx.moveTo(-64.5, -8.6); ctx.lineTo(-64.5, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.roundRect(-61, -5.6, 5.5, 1.5, .7); ctx.fill();
    ctx.fillStyle = shade(colour, -.45); ctx.beginPath(); ctx.moveTo(-38, -9.3); ctx.lineTo(-41.8, -9.7); ctx.lineTo(-41.2, -7.6); ctx.lineTo(-38, -8.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(colour, -.5); ctx.fillRect(-92.6, -9.5, 7, 1.2);
    ctx.fillStyle = '#101314'; ctx.beginPath(); ctx.roundRect(-4.5, 2.6, 5.5, 3.6, 1); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(-3.6, 3.9); ctx.lineTo(.4, 3.9); ctx.moveTo(-3.6, 5.1); ctx.lineTo(.4, 5.1); ctx.stroke();
    ctx.fillStyle = '#25292c'; ctx.beginPath(); ctx.ellipse(-92.2, 5.8, 1.3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#14181a'; ctx.beginPath(); ctx.moveTo(1, 7); ctx.lineTo(-9, 8.6); ctx.lineTo(-9, 7.2); ctx.lineTo(.6, 5.6); ctx.closePath(); ctx.fill();
  // Lamps: the head lamp, and the tail lamp, which glows while the brakes are on.
  const head = ctx.createLinearGradient(2, -3, -8, -1); head.addColorStop(0, '#fffbe6'); head.addColorStop(1, '#bda760');
  ctx.fillStyle = head; ctx.beginPath(); ctx.moveTo(1.9, -.2); ctx.lineTo(-2.4, -3.3); ctx.lineTo(-9, -3.7); ctx.lineTo(-6.4, -.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = braking ? '#ff4d38' : '#972317'; ctx.beginPath(); ctx.moveTo(-93.2, -6.9); ctx.lineTo(-89, -7.5); ctx.lineTo(-89.4, -3.6); ctx.lineTo(-93.1, -3.3); ctx.closePath(); ctx.fill();
  if (braking) { const glow = ctx.createRadialGradient(-93, -5, 1, -93, -5, 11); glow.addColorStop(0, 'rgba(255,70,50,.55)'); glow.addColorStop(1, 'rgba(255,70,50,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(-93, -5, 11, 0, Math.PI * 2); ctx.fill(); }
  if (lights) { const beam = ctx.createLinearGradient(2, 0, 40, 0); beam.addColorStop(0, 'rgba(255,244,200,.35)'); beam.addColorStop(1, 'rgba(255,244,200,0)'); ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(40, -9); ctx.lineTo(40, 8); ctx.lineTo(2, 1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}

// ---- LAB-BOARDS-2: shared pieces for the Pendulums, Projectile, Altitude and Strength boards ----
// The same number every time for the same i (the boards use it for rock, ripples and wear).
export const grain = noise;
// A cable under load from (x0, y0) to (x1, y1): a dark shadow, a steel body twisted from fine strands, and a lit edge.
export function cable(ctx, x0, y0, x1, y1, {width = 2.4, alpha = 1} = {}) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, side = dy - dx > 0 ? 1 : -1, nx = -dy / len * side, ny = dx / len * side;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = width + 1; ctx.beginPath(); ctx.moveTo(x0 + 2, y0 + 2); ctx.lineTo(x1 + 2, y1 + 2); ctx.stroke();
  ctx.strokeStyle = '#737c82'; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.setLineDash([1.3, 2.7]); ctx.strokeStyle = 'rgba(12,16,18,.5)'; ctx.lineWidth = width * .75;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(236,243,245,.85)'; ctx.lineWidth = Math.max(.8, width * .34);
  ctx.beginPath(); ctx.moveTo(x0 + nx * width * .26, y0 + ny * width * .26); ctx.lineTo(x1 + nx * width * .26, y1 + ny * width * .26); ctx.stroke();
  ctx.restore();
}
// A cable with some slack in it: a dark shadow, a steel body and a lit edge along a curve.
export function rope(ctx, ax, ay, qx, qy, bx, by, width) {
  const trace = (dx, dy) => { ctx.beginPath(); ctx.moveTo(ax + dx, ay + dy); ctx.quadraticCurveTo(qx + dx, qy + dy, bx + dx, by + dy); ctx.stroke(); };
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = width + 1; trace(2, 2);
  ctx.strokeStyle = '#737c82'; ctx.lineWidth = width; trace(0, 0);
  ctx.strokeStyle = 'rgba(236,243,245,.8)'; ctx.lineWidth = Math.max(.8, width * .34); trace(-.6, -.6);
  ctx.lineCap = 'butt';
}
// A hanging bracket bolted under a beam, then a swivel and a ring to hook a cable on: the bracket's top is at (x, y)
// and the ring's centre is 24 below it.
export function swivelHook(ctx, x, y, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  steel(ctx, x - 9, y, 18, 6, 1.5); bolt(ctx, x - 5.5, y + 3, 1.3); bolt(ctx, x + 5.5, y + 3, 1.3);
  ctx.strokeStyle = '#aeb7bc'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y + 10, 3.4, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y + 10, 3.4, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  steel(ctx, x - 2.8, y + 13, 5.6, 8, 1.2);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 2.8, y + 16.6, 5.6, .8);
  ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y + 24, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// The glass over a dial: a soft reflection of the lamp.
export function glassGlare(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,.30)'; ctx.beginPath(); ctx.ellipse(x - r * .3, y - r * .42, r * .46, r * .17, -.6, 0, Math.PI * 2); ctx.fill();
}
// A brass-rimmed dial with a cream face (no ticks or needle): the rim is `rim` wide outside radius r.
export function brassDial(ctx, x, y, r, rim = 4) {
  const o = r + rim, g = ctx.createLinearGradient(x - o, y - o, x + o, y + o);
  g.addColorStop(0, theme.brass[0]); g.addColorStop(.5, theme.brass[1]); g.addColorStop(1, theme.brass[2]);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, o, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, o, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(x, y, o - .5, 0, Math.PI * 2); ctx.stroke();
  const face = ctx.createRadialGradient(x - r * .3, y - r * .38, 2, x, y, r * 1.02); face.addColorStop(0, '#fffaf0'); face.addColorStop(1, '#d9cfb6');
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,10,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}
// A rolled steel I-beam from x0 to x1 whose top edge is at `top`: lit top flange, recessed web, bolted flanges, end caps.
export function steelBeam(ctx, x0, x1, top, height = 26) {
  const w = x1 - x0, fl = Math.round(height * .27), web = height - 2 * fl;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(x0 + 8, top + 7, w, height);
  const upper = ctx.createLinearGradient(0, top, 0, top + fl); upper.addColorStop(0, '#dce3e7'); upper.addColorStop(.4, '#9aa4aa'); upper.addColorStop(1, '#5d676d');
  ctx.fillStyle = upper; ctx.fillRect(x0, top, w, fl);
  const lower = ctx.createLinearGradient(0, top + height - fl, 0, top + height); lower.addColorStop(0, '#838d93'); lower.addColorStop(.5, '#4f585e'); lower.addColorStop(1, '#22282c');
  ctx.fillStyle = lower; ctx.fillRect(x0, top + height - fl, w, fl);
  const middle = ctx.createLinearGradient(0, top + fl, 0, top + fl + web); middle.addColorStop(0, '#2b3237'); middle.addColorStop(.5, '#444d53'); middle.addColorStop(1, '#2d353a');
  ctx.fillStyle = middle; ctx.fillRect(x0, top + fl, w, web);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0, top, w, 1);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x0, top + fl, w, 1.6); ctx.fillRect(x0, top + height - 1.2, w, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x0, top + height - fl, w, .9);
  // Rolling marks along the steel and a few patches of rust.
  for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x0 + noise(i * 3 + 700) * w * .7, top + 1.5 + noise(i + 710) * (fl - 3), 40 + noise(i + 720) * 120, 1); }
  for (let i = 0; i < Math.ceil(w / 90); i++) { ctx.fillStyle = 'rgba(140,80,40,.22)'; ctx.beginPath(); ctx.ellipse(x0 + 10 + noise(i + 740) * (w - 20), top + height - fl / 2, 4 + noise(i + 750) * 6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let x = x0 + 14; x < x1; x += 36) { bolt(ctx, x, top + fl / 2, 2.2); bolt(ctx, x, top + height - fl / 2, 2.2); }
  ctx.fillStyle = '#3a4248'; ctx.fillRect(x0 - 3, top - 1, 4, height + 2); ctx.fillRect(x1 - 1, top - 1, 4, height + 2);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x0 - 3, top - 1, 4, 1); ctx.fillRect(x1 - 1, top - 1, 4, 1);
}
// A dark glass plate with a steel frame and four corner bolts, for the boards' readout panels.
export function bezel(ctx, x, y, w, h, r = 8) {
  ctx.save(); ctx.strokeStyle = '#8b959b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 1.6, y + 1.6, w - 3.2, h - 3.2, Math.max(0, r - 1.6)); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5); ctx.stroke();
  ctx.restore();
  for (const [bx, by] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) bolt(ctx, bx, by, 1.9);
}
// Water from y down: a dark body that catches the dusk, a lit surface line, ripples that drift, and the sun's glitter.
export function waterBody(ctx, y, time = 0) {
  const g = ctx.createLinearGradient(0, y, 0, BOARD.height);
  g.addColorStop(0, '#6d6a6c'); g.addColorStop(.04, '#37606f'); g.addColorStop(.3, '#1e3c49'); g.addColorStop(1, '#0b171c');
  ctx.fillStyle = g; ctx.fillRect(0, y, BOARD.width, BOARD.height - y);
  const glitter = ctx.createRadialGradient(760, y, 4, 760, y, 260); glitter.addColorStop(0, 'rgba(255,190,120,.2)'); glitter.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.save(); ctx.beginPath(); ctx.rect(0, y, BOARD.width, BOARD.height - y); ctx.clip(); ctx.translate(760, y); ctx.scale(1, .32); ctx.translate(-760, -y);
  ctx.fillStyle = glitter; ctx.fillRect(500, y - 10, 520, 400); ctx.restore();
  for (let i = 0; i < 26; i++) {
    const depth = noise(i + 800), ry = y + 8 + depth * 62, rx = (noise(i + 810) * (BOARD.width + 80) + time * (3 + depth * 5)) % (BOARD.width + 80) - 40, half = 10 + depth * 26;
    ctx.strokeStyle = `rgba(200,228,238,${(.08 + depth * .12).toFixed(2)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(rx, ry, half, 1.6 + depth * 2, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    const warm = Math.abs(rx - 760) < 190;
    ctx.fillStyle = warm ? 'rgba(255,208,150,.35)' : 'rgba(225,242,248,.16)'; ctx.fillRect(rx - half * .4, ry - 2.2, half * .8, 1.2);
  }
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, y + 1.5, BOARD.width, 2);
  ctx.fillStyle = 'rgba(236,246,250,.5)'; ctx.fillRect(0, y - .5, BOARD.width, 1.6);
}
// A planked crate, centred on (x, y), with steel corners and its weight stencilled on the front.
export function plankCrate(ctx, x, y, w, h, label) {
  const l = x - w / 2, t = y - h / 2, g = ctx.createLinearGradient(l, t, l, t + h);
  g.addColorStop(0, '#c99a5c'); g.addColorStop(.5, '#a37640'); g.addColorStop(1, '#5e3f1d');
  ctx.fillStyle = g; ctx.fillRect(l, t, w, h);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.10)' : 'rgba(255,240,210,.07)'; ctx.fillRect(l + i * w / 5, t, w / 5, h); ctx.fillStyle = 'rgba(30,18,6,.45)'; ctx.fillRect(l + i * w / 5, t, .8, h); }
  ctx.fillStyle = '#7d5529'; ctx.fillRect(l, t, w, 5); ctx.fillRect(l, t + h - 5, w, 5); ctx.fillRect(l, t, 4, h); ctx.fillRect(l + w - 4, t, 4, h);
  ctx.fillStyle = 'rgba(255,236,200,.28)'; ctx.fillRect(l, t, w, 1);
  ctx.fillStyle = '#5c646a'; for (const [cx, cy] of [[l, t], [l + w - 5, t], [l, t + h - 5], [l + w - 5, t + h - 5]]) ctx.fillRect(cx, cy, 5, 5);
  ctx.strokeStyle = 'rgba(20,12,4,.8)'; ctx.lineWidth = 1.2; ctx.strokeRect(l, t, w, h);
  if (label) {
    ctx.font = '800 10px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,12,4,.7)'; ctx.fillText(label, x + .8, y + 1.8); ctx.fillStyle = '#f7ead0'; ctx.fillText(label, x, y + 1);
  }
}
// A steel weighing pad, `half` wide each side of its centre, standing on the ground line at y = 0 of the current drawing.
export function weighingPad(ctx, half) {
  shadow(ctx, 0, 6, half + 30, .55);
  ctx.fillStyle = '#15181a'; for (const x of [-half + 14, -half / 3, half / 3, half - 26]) ctx.fillRect(x, -2, 12, 9);
  const g = ctx.createLinearGradient(0, -11, 0, 0); g.addColorStop(0, '#a9b2b7'); g.addColorStop(.3, '#6c757b'); g.addColorStop(1, '#2c3236');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-half, -11, 2 * half, 11, 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(-half, -11, 2 * half, 4); ctx.clip();
  ctx.fillStyle = '#e0b23c'; ctx.fillRect(-half, -11, 2 * half, 4);
  ctx.fillStyle = '#1a1c1d'; for (let x = -half - 8; x < half; x += 16) { ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x + 6, -11); ctx.lineTo(x + 12, -11); ctx.lineTo(x + 6, -7); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-half, -11, 2 * half, .9);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = -half + 10; x < half; x += 30) { ctx.beginPath(); ctx.arc(x, -3, 1.1, 0, Math.PI * 2); ctx.fill(); }
}

// ---- LAB-BOARDS-3: shared pieces for the Fire, Rust, Wax and Launch boards ----
// One flame with its foot at (x, y): an outer body that is orange low down and red at the tip, a brighter middle, a pale
// core and two small side licks, all flickering with `time`; the glow behind it lights what stands near.
export function flameTongue(ctx, x, y, w, h, time, seed) {
  const flick = 1 + .12 * Math.sin(time * 9 + seed * 3.1) + .06 * Math.sin(time * 17 + seed), height = h * flick, lean = Math.sin(time * 3 + seed) * w * .15;
  const gy = y - height * .38, gr = Math.max(8, height * .75);
  ctx.save();
  const glow = ctx.createRadialGradient(x, gy, 1, x, gy, gr); glow.addColorStop(0, 'rgba(255,160,60,.34)'); glow.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, gy, gr, 0, Math.PI * 2); ctx.fill();
  const tongue = (cx, fw, fh, bend, stops) => {
    const top = y - fh, g = ctx.createLinearGradient(0, y, 0, top);
    stops.forEach(([at, colour]) => g.addColorStop(at, colour));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - fw / 2, y);
    ctx.bezierCurveTo(cx - fw / 2, y - fh * .45, cx + bend - fw * .2, top + fh * .25, cx + bend, top);
    ctx.bezierCurveTo(cx + bend + fw * .2, top + fh * .25, cx + fw / 2, y - fh * .45, cx + fw / 2, y); ctx.closePath(); ctx.fill();
  };
  const red = [[0, '#f7a62c'], [.45, '#ee5a1c'], [1, 'rgba(190,34,22,.85)']];
  for (const side of [-1, 1]) tongue(x + side * w * .36, w * .42, height * (.5 + .08 * Math.sin(time * 11 + seed * 5 + side)), lean * .6 + side * w * .05, red);
  tongue(x, w, height, lean, red);
  tongue(x + lean * .12, w * .68, height * .72, lean * .8, [[0, '#ffd24a'], [.6, '#ffa028'], [1, 'rgba(255,150,40,.7)']]);
  tongue(x + lean * .2, w * .32, height * .45, lean * .5, [[0, '#fffbe0'], [1, 'rgba(255,236,150,.5)']]);
  ctx.restore();
}
// A glass thermometer: a tube from `top` to `bottom` with its bulb centred at `bulbY` (the bottom, unless it says
// otherwise), and red spirit from `levelY` down to the bulb.
export function glassTube(ctx, x, top, bottom, {width = 10, bulbR = width * .8, bulbY = bottom, levelY = bottom, spirit = '#d8402c'} = {}) {
  const w = width;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(x - w / 2 + 2, top + 2, w, bottom - top, w / 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2, bulbY + 2, bulbR, 0, Math.PI * 2); ctx.fill();
  const glass = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); glass.addColorStop(0, 'rgba(240,248,250,.5)'); glass.addColorStop(.35, 'rgba(210,226,232,.22)'); glass.addColorStop(1, 'rgba(120,140,150,.45)');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, bottom - top, w / 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, bulbY, bulbR, 0, Math.PI * 2); ctx.fill();
  const red = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); red.addColorStop(0, shade(spirit, .35)); red.addColorStop(.5, spirit); red.addColorStop(1, shade(spirit, -.45));
  ctx.fillStyle = red; ctx.beginPath(); ctx.arc(x, bulbY, bulbR - 1.6, 0, Math.PI * 2); ctx.fill();
  if (levelY < bulbY) ctx.fillRect(x - w * .2, levelY, w * .4, bulbY - levelY);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x - w / 2, top, w, bottom - top, w / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, bulbY, bulbR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - w * .3, top + w * .6); ctx.lineTo(x - w * .3, bottom - w * .3); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - bulbR * .35, bulbY - bulbR * .35, bulbR * .22, bulbR * .13, -.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// A flag planted in the ground with its foot at (x, y): a lit pole on a small footing and a cloth with a fold in it.
export function groundFlag(ctx, x, y, colour = '#ef7a59', height = 34) {
  shadow(ctx, x + 3, y + 1, 9, .5);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 4.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  const pole = ctx.createLinearGradient(x - 1.4, 0, x + 1.4, 0); pole.addColorStop(0, '#eef2f3'); pole.addColorStop(1, '#6d777d');
  ctx.fillStyle = pole; ctx.fillRect(x - 1.3, y - height, 2.6, height);
  const cloth = ctx.createLinearGradient(x, y - height, x + 20, y - height * .6); cloth.addColorStop(0, shade(colour, .35)); cloth.addColorStop(.5, colour); cloth.addColorStop(1, shade(colour, -.4));
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(x + 1.3, y - height); ctx.quadraticCurveTo(x + 12, y - height - 2, x + 21, y - height * .82); ctx.quadraticCurveTo(x + 11, y - height * .76, x + 1.3, y - height * .6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + 1.3, y - height * .8); ctx.quadraticCurveTo(x + 11, y - height * .84, x + 18, y - height * .82); ctx.stroke();
  ctx.fillStyle = '#eef2f3'; ctx.beginPath(); ctx.arc(x, y - height - 1, 1.8, 0, Math.PI * 2); ctx.fill();
}
// A small dark plate behind a label, centred on (x, y), so that the words stay readable over a busy picture.
export function labelPlate(ctx, x, y, w, h = 20, alpha = .6) {
  ctx.fillStyle = `rgba(10,14,15,${alpha})`; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 5); ctx.fill();
}
// A worn timber board with its top-left at (x, y): a lit top edge, a darker underside, grain, a few knots and nail heads.
export function timber(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#a07a4c'); g.addColorStop(.25, '#80603a'); g.addColorStop(.8, '#5a4128'); g.addColorStop(1, '#2f2113');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let i = 0, n = Math.ceil(w / 9); i < n; i++) {
    ctx.fillStyle = noise(i * 3 + x) > .5 ? 'rgba(20,10,2,.22)' : 'rgba(255,230,190,.07)';
    ctx.fillRect(x + noise(i * 3 + x + 1) * w, y + 2 + noise(i * 3 + x + 2) * (h - 4), 14 + noise(i + x + 9) * 60, 1);
  }
  for (let i = 0, n = Math.ceil(w / 160); i < n; i++) {
    const kx = x + 30 + noise(i * 7 + x + 40) * (w - 60), ky = y + 3 + noise(i * 7 + x + 41) * (h - 6);
    ctx.fillStyle = 'rgba(30,16,6,.5)'; ctx.beginPath(); ctx.ellipse(kx, ky, 4.5, Math.min(2.6, h / 4), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,6,.3)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(kx, ky, 8, Math.min(4, h / 3), 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,236,200,.35)'; ctx.fillRect(x, y, w, 1.2);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + h - 1.5, w, 1.5);
  if (h > 8) for (const nx of [x + 8, x + w - 8]) bolt(ctx, nx, y + h / 2, 1.5);
}

// ---- LAB-BOARDS-4: shared pieces for the G-force, Grip, Headings and Suspension boards ----
// A readout panel: a steel frame round dark glass, a faint sheen and four corner bolts. The glass fills (x, y, w, h)
// exactly, so the lessons' own panel sizes and tests keep working; the frame is 3 wide outside it.
export function steelPanel(ctx, x, y, w, h, r = 8) {
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.roundRect(x - 2, y + 2, w + 6, h + 6, r + 3); ctx.fill();
  const frame = ctx.createLinearGradient(0, y - 3, 0, y + h + 3);
  frame.addColorStop(0, '#b4bec4'); frame.addColorStop(.3, '#737d83'); frame.addColorStop(1, '#2b3235');
  ctx.fillStyle = frame; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, r + 3); ctx.fill();
  const glass = ctx.createLinearGradient(0, y, 0, y + h); glass.addColorStop(0, '#111a1e'); glass.addColorStop(1, '#0a1013');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.beginPath(); ctx.moveTo(x + w * .08, y); ctx.lineTo(x + w * .08 + 70, y); ctx.lineTo(x + 40 - 30, y + h); ctx.lineTo(x - 30, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + r, y + .6, w - 2 * r, 1);
  ctx.restore();
  for (const [bx, by] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) bolt(ctx, bx, by, 1.8);
}
// A coil spring from `top` to `bottom` at x: `coils` turns of lit wire, the far side of each turn darker, and a steel seat
// at each end. Squeezing it (a shorter span) bunches the turns, stretching it opens them.
export function coilSpring(ctx, x, top, bottom, {radius = 15, coils = 7, wire = 3.6, colour = '#edc557'} = {}) {
  const length = bottom - top;
  if (length < 6) return;
  const steps = coils * 16, point = i => { const t = i / steps, a = t * coils * Math.PI * 2 + .5; return [x + Math.sin(a) * radius, top + 3 + (length - 6) * t, Math.cos(a), Math.sin(a)]; };
  ctx.save(); ctx.lineCap = 'round';
  for (const front of [false, true]) {
    if (front) { ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = wire + 1.8; ctx.beginPath(); for (let i = 0; i < steps; i++) { const a = point(i), b = point(i + 1); if (a[2] + b[2] > 0) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } } ctx.stroke(); }
    for (let i = 0; i < steps; i++) {
      const a = point(i), b = point(i + 1), facing = (a[2] + b[2]) / 2;
      if ((facing > 0) !== front) continue;
      ctx.strokeStyle = front ? shade(colour, .32 - (a[3] + 1) * .38) : shade(colour, -.62); ctx.lineWidth = front ? wire : wire * .75;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }
  ctx.restore();
  steel(ctx, x - radius - 3, top - 3, radius * 2 + 6, 5, 1.5); steel(ctx, x - radius - 3, bottom - 2, radius * 2 + 6, 5, 1.5);
}
// A damper: a lit steel tube standing on its lower mount and a chrome rod coming out of its top, with eyelets at both ends.
export function damper(ctx, x, top, bottom, {tube = 7, rod = 3.2} = {}) {
  const length = bottom - top, tubeTop = bottom - Math.max(14, length * .58);
  const lit = (half, a, b, c) => { const g = ctx.createLinearGradient(x - half, 0, x + half, 0); g.addColorStop(0, a); g.addColorStop(.35, b); g.addColorStop(1, c); return g; };
  ctx.fillStyle = lit(rod, '#e6ecef', '#9aa4aa', '#4a5257'); ctx.fillRect(x - rod, top + 2, rod * 2, Math.max(0, tubeTop - top));
  ctx.fillStyle = lit(tube, '#6f7a80', '#39434a', '#101417'); ctx.beginPath(); ctx.roundRect(x - tube, tubeTop, tube * 2, Math.max(6, bottom - tubeTop - 2), 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - tube + 1.5, tubeTop + 2, 1.2, Math.max(2, bottom - tubeTop - 7));
  ctx.fillStyle = '#1a1f22'; ctx.fillRect(x - tube - 1, tubeTop - 1, tube * 2 + 2, 3);
  for (const ey of [top, bottom]) { ctx.strokeStyle = '#c3cbd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, ey, 3.4, 0, Math.PI * 2); ctx.stroke(); }
}
// The red road car seen from straight above, nose to the right: a bonnet, glass, a lit roof, mirrors, and four wheels
// showing at the arches. It is 92 long and 38 wide at scale 1, centred on (x, y). Options: scale; colour; angle (turns
// the whole car, in radians); steer (turns the front wheels); shadow (a soft shadow thrown down and to the right, the
// same whichever way the car points); braking (the tail lamps are bright).
export function roadCarTop(ctx, x, y, {scale = 1, colour = '#c8402f', angle = 0, steer = 0, shadow: dropShadow = true, braking = false} = {}) {
  const outline = () => {
    ctx.beginPath(); ctx.moveTo(46, 0);
    ctx.bezierCurveTo(46, -7, 43, -13, 35, -16.5); ctx.bezierCurveTo(26, -18.6, 14, -18.6, 0, -18.8);
    ctx.bezierCurveTo(-20, -18.8, -34, -18.2, -41, -16); ctx.bezierCurveTo(-45, -13, -46.5, -7, -46.5, 0);
    ctx.bezierCurveTo(-46.5, 7, -45, 13, -41, 16); ctx.bezierCurveTo(-34, 18.2, -20, 18.8, 0, 18.8);
    ctx.bezierCurveTo(14, 18.6, 26, 18.6, 35, 16.5); ctx.bezierCurveTo(43, 13, 46, 7, 46, 0); ctx.closePath();
  };
  if (dropShadow) {
    for (const [grow, alpha] of [[7, .10], [3.5, .16], [0, .30]]) {
      ctx.save(); ctx.translate(x + 5 * scale, y + 7 * scale); ctx.rotate(angle); ctx.scale(scale, scale);
      outline(); ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fill(); if (grow) { ctx.strokeStyle = `rgba(0,0,0,${alpha})`; ctx.lineWidth = grow; ctx.stroke(); }
      ctx.restore();
    }
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  // The wheels, tucked under the body at the arches so that only their outer edge shows.
  const wheel = (cx, cy, turn) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(turn);
    const tyre = ctx.createLinearGradient(0, -3.8, 0, 3.8); tyre.addColorStop(0, '#2b3134'); tyre.addColorStop(.5, '#111517'); tyre.addColorStop(1, '#050607');
    ctx.fillStyle = tyre; ctx.beginPath(); ctx.roundRect(-8.4, -3.8, 16.8, 7.6, 2.6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = .6; ctx.beginPath(); for (let k = -6; k <= 6; k += 3) { ctx.moveTo(k, -3.4); ctx.lineTo(k + 1.2, 3.4); } ctx.stroke();
    ctx.restore();
  };
  for (const side of [-1, 1]) {
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    for (const wx of [29, -29]) { ctx.beginPath(); ctx.ellipse(wx, side * 16.2, 10.4, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
    wheel(29, side * 19.4, steer); wheel(-29, side * 19.4, 0);
  }
  // Paint: lit on the side the workshop lamp is, darker down the other.
  const paint = ctx.createLinearGradient(0, -19, 0, 19);
  paint.addColorStop(0, shade(colour, .42)); paint.addColorStop(.3, shade(colour, .08)); paint.addColorStop(.62, shade(colour, -.2)); paint.addColorStop(1, shade(colour, -.52));
  outline(); ctx.fillStyle = paint; ctx.fill();
  ctx.save(); outline(); ctx.clip();
  // The bonnet: a centre crease, two vents and a lit shoulder; the boot lip at the tail.
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(16, 0); ctx.moveTo(15.5, -14.5); ctx.lineTo(15.5, 14.5); ctx.moveTo(-31.5, -13.2); ctx.lineTo(-31.5, 13.2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(33, s * 4.2); ctx.lineTo(25, s * 4.6); ctx.lineTo(25, s * 6.6); ctx.lineTo(33, s * 6.2); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,240,220,.5)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(40, -13.4); ctx.bezierCurveTo(30, -16.2, 14, -16.4, 0, -16.4); ctx.bezierCurveTo(-20, -16.4, -32, -15.6, -39, -13.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-40, -12); ctx.lineTo(-40, 12); ctx.stroke();
  // The glass of the cabin, with the sky in it.
  const glass = ctx.createLinearGradient(0, -14.5, 0, 14.5); glass.addColorStop(0, '#a9c6d1'); glass.addColorStop(.4, '#4f7080'); glass.addColorStop(1, '#101c23');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(15.5, -14.5); ctx.lineTo(-30, -13.4); ctx.quadraticCurveTo(-33.5, 0, -30, 13.4); ctx.lineTo(15.5, 14.5); ctx.quadraticCurveTo(12.5, 0, 15.5, -14.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(14, -13); ctx.lineTo(9, -13); ctx.lineTo(7.5, 1); ctx.lineTo(12.5, 1); ctx.closePath(); ctx.fill();
  // The roof, lit along its top edge.
  const roof = ctx.createLinearGradient(0, -11.6, 0, 11.6); roof.addColorStop(0, shade(colour, .5)); roof.addColorStop(.3, shade(colour, .15)); roof.addColorStop(1, shade(colour, -.35));
  ctx.fillStyle = roof; ctx.beginPath(); ctx.roundRect(-21, -11.6, 26, 23.2, 4.5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-18, -10.2, 20, .9);
  // The seats' headrests, dark behind the glass.
  ctx.fillStyle = 'rgba(8,12,14,.55)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(-27.6, s * 6.4 - 2.6, 3.4, 5.2, 1.4); ctx.fill(); }
  // Lamps: the head lamps, the grille slot, and the tail lamps (bright when the brakes are on).
  ctx.fillStyle = '#10141a'; ctx.beginPath(); ctx.roundRect(44.6, -4.6, 1.8, 9.2, .8); ctx.fill();
  for (const s of [-1, 1]) {
    const lamp = ctx.createLinearGradient(36, 0, 44, 0); lamp.addColorStop(0, '#fffbe6'); lamp.addColorStop(1, '#c4ad66');
    ctx.fillStyle = lamp; ctx.beginPath(); ctx.moveTo(43.4, s * 7.2); ctx.lineTo(37, s * 13.2); ctx.lineTo(34.8, s * 11.6); ctx.lineTo(41.6, s * 6.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = braking ? '#ff4d38' : '#a32a1c'; ctx.beginPath(); ctx.roundRect(-46.4, s * 11.4 - 3.4, 3, 6.8, 1); ctx.fill();
    if (braking) { const glow = ctx.createRadialGradient(-46, s * 11.4, 1, -46, s * 11.4, 11); glow.addColorStop(0, 'rgba(255,70,50,.5)'); glow.addColorStop(1, 'rgba(255,70,50,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(-46, s * 11.4, 11, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.1; outline(); ctx.stroke();
  // The mirrors, standing out from the front doors.
  for (const s of [-1, 1]) {
    ctx.fillStyle = shade(colour, s < 0 ? .12 : -.35); ctx.beginPath(); ctx.ellipse(10.5, s * 20.4, 3.6, 2.2, s * .35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = .7; ctx.stroke();
  }
  ctx.restore();
}
// Kestrel One from straight above, its nose along `heading` (in radians, 0 is up the board): skids, the tail boom with
// its fin and stabiliser, the cabin glass, and the rotor as a blurred disc with its two blades turning with `time`. The
// rotor disc is 76 across and the tail reaches 62 behind the centre at scale 1; the shadow falls down and to the right.
export function helicopterTop(ctx, x, y, heading, time, scale = 1, {shadow: dropShadow = true} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const fuselage = () => { ctx.beginPath(); ctx.ellipse(0, -1, 13.5, 24, 0, 0, Math.PI * 2); };
  if (dropShadow) {
    ctx.save(); ctx.translate(12, 17); ctx.rotate(heading);
    ctx.fillStyle = 'rgba(0,0,0,.30)'; fuselage(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4.5, 16); ctx.lineTo(-2, 62); ctx.lineTo(2, 62); ctx.lineTo(4.5, 16); ctx.closePath(); ctx.fill(); ctx.fillRect(-12, 56, 24, 5);
    ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.beginPath(); ctx.arc(0, -1, 38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.rotate(heading);
  // Skids with their cross tubes, lit along the outer edge.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#161a1c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-15, -21); ctx.lineTo(-15, 17); ctx.moveTo(15, -21); ctx.lineTo(15, 17); ctx.moveTo(-15, -9); ctx.lineTo(15, -9); ctx.moveTo(-15, 8); ctx.lineTo(15, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,208,212,.5)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-15.9, -20); ctx.lineTo(-15.9, 16); ctx.moveTo(14.1, -20); ctx.lineTo(14.1, 16); ctx.stroke();
  ctx.lineCap = 'butt';
  // The tail boom, with the stabiliser and the fin along its end.
  const boom = ctx.createLinearGradient(-4.5, 0, 4.5, 0); boom.addColorStop(0, '#a3ae9a'); boom.addColorStop(.5, '#66725f'); boom.addColorStop(1, '#2c332b');
  ctx.fillStyle = boom; ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(-2.2, 62); ctx.lineTo(2.2, 62); ctx.lineTo(5, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-3.8, 34, 7.6, 5);
  const stab = ctx.createLinearGradient(-12, 0, 12, 0); stab.addColorStop(0, '#9aa592'); stab.addColorStop(1, '#4a5446');
  ctx.fillStyle = stab; ctx.beginPath(); ctx.moveTo(-13, 57); ctx.lineTo(13, 57); ctx.lineTo(11, 62.5); ctx.lineTo(-11, 62.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
  ctx.fillStyle = '#2e362d'; ctx.fillRect(-1.2, 50, 2.4, 17);
  // The tail rotor: a small blurred disc with one blade turning.
  const tail = ctx.createRadialGradient(4.6, 63, 1, 4.6, 63, 10); tail.addColorStop(0, 'rgba(225,230,225,.34)'); tail.addColorStop(1, 'rgba(225,230,225,0)');
  ctx.fillStyle = tail; ctx.beginPath(); ctx.arc(4.6, 63, 10, 0, Math.PI * 2); ctx.fill();
  const tb = time * 40; ctx.strokeStyle = 'rgba(20,24,26,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4.6, 63 + Math.sin(tb) * 9); ctx.lineTo(4.6, 63 - Math.sin(tb) * 9); ctx.stroke();
  // The cabin, lit from the left, with the glass at the nose and the gold band behind it.
  const body = ctx.createLinearGradient(-14, 0, 14, 0); body.addColorStop(0, '#7f8a7b'); body.addColorStop(.3, '#e9eee4'); body.addColorStop(.65, '#b2bcae'); body.addColorStop(1, '#505a4d');
  ctx.fillStyle = body; fuselage(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.save(); fuselage(); ctx.clip();
  const glass = ctx.createLinearGradient(-10, -22, 10, -2); glass.addColorStop(0, '#d8e8ee'); glass.addColorStop(.5, '#6f93a2'); glass.addColorStop(1, '#22343d');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.quadraticCurveTo(0, -30, 11, -9); ctx.quadraticCurveTo(0, -12, -11, -9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(-8, -15); ctx.lineTo(-4, -17.6); ctx.lineTo(-5, -11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-14, 5, 28, 3.4); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-14, 8.4, 28, 1);
  const cowl = ctx.createLinearGradient(-7, 0, 7, 0); cowl.addColorStop(0, '#9aa590'); cowl.addColorStop(1, '#4a5446');
  ctx.fillStyle = cowl; ctx.beginPath(); ctx.roundRect(-7.5, 9.5, 15, 13, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.32)'; for (let i = 0; i < 3; i++) ctx.fillRect(-5, 12 + i * 3.4, 10, 1.1);
  ctx.restore();
  // The rotor: a soft disc with a bright rim, two ghost blades and the sharper pair on top, and the hub.
  const disc = ctx.createRadialGradient(0, 0, 4, 0, 0, 38); disc.addColorStop(0, 'rgba(226,230,222,.05)'); disc.addColorStop(.8, 'rgba(226,230,222,.14)'); disc.addColorStop(1, 'rgba(226,230,222,.26)');
  ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill();
  const b = time * 24; ctx.lineCap = 'round';
  for (const [lag, alpha] of [[.5, .10], [.25, .2], [0, .55]]) {
    ctx.strokeStyle = `rgba(18,22,24,${alpha})`; ctx.lineWidth = lag ? 4 : 3.2; ctx.beginPath();
    ctx.moveTo(Math.cos(b - lag) * 38, Math.sin(b - lag) * 38); ctx.lineTo(-Math.cos(b - lag) * 38, -Math.sin(b - lag) * 38); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(238,200,90,.8)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(Math.cos(b) * 38, Math.sin(b) * 38); ctx.lineTo(Math.cos(b) * 32, Math.sin(b) * 32); ctx.moveTo(-Math.cos(b) * 38, -Math.sin(b) * 38); ctx.lineTo(-Math.cos(b) * 32, -Math.sin(b) * 32); ctx.stroke();
  ctx.lineCap = 'butt';
  const hub = ctx.createRadialGradient(-1, -1, .5, 0, 0, 5); hub.addColorStop(0, '#dde3e6'); hub.addColorStop(1, '#3a4247');
  ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.restore();
}

export function wrap(ctx, value, x, y, width, {size = 22, line: gap = size + 6, weight = 700} = {}) {
  ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
  const words = value.split(' '), lines = [];
  let line = '';
  for (const w of words) { const next = line ? `${line} ${w}` : w; if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next; }
  lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * gap, {size, weight}));
}


// Fits the 1000 x 680 board into the canvas, clipped, and draws it; answers where it went.
export function fitBoard(ctx, width, height, draw) {
  ctx.save();
  const scale = Math.min(width / BOARD.width, height / BOARD.height), left = (width - BOARD.width * scale) / 2, top = (height - BOARD.height * scale) / 2;
  // Where the board does not fill its panel, the workshop wall carries on behind it and the board hangs in a thin brass frame.
  if (left > 2 || top > 2) {
    if (wall) ctx.drawImage(wall, 0, 0, width, height);
    ctx.fillStyle = 'rgba(8,11,13,.55)'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(left - 2, top + 5, BOARD.width * scale + 9, BOARD.height * scale);
    ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = 3; ctx.strokeRect(left - 1.5, top - 1.5, BOARD.width * scale + 3, BOARD.height * scale + 3);
  }
  ctx.translate(left, top); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, BOARD.width, BOARD.height); ctx.clip();
  draw();
  ctx.restore();
  return {scale, left, top};
}
