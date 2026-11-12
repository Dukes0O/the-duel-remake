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
