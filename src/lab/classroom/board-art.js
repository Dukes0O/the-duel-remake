// Shared drawing for the classroom boards (docs/board/cards/LAB-CLASSROOM.md section 3): the steel
// workshop look, text, key caps, and Kestrel One and the Dusthawk drawn side on. Draws only.
export const BOARD = Object.freeze({width: 1000, height: 680});
export const GROUND_Y = 600;

// The steel workshop look (LAB-CLASSROOM look round 1, picked by Claude): painted steel, brass and iron.
export const theme = Object.freeze({back: ['#2a3134', '#161b1d'], grain: 'rgba(255,255,255,.035)', beam: '#626a70', beamLight: '#8d969c', beamDark: '#363c40', rivet: '#a7aeb2',
  line: '#e3dccb', faint: 'rgba(227,220,203,.28)', text: '#f5f0dc', accent: '#edc557', good: '#56d683', bad: '#f07a5a', ghost: 'rgba(190,198,204,.42)',
  brass: ['#ffe9a6', '#d9a640', '#6b4810'], iron: ['#c7cfd4', '#5d666c', '#1f2427'], dial: '#efe7d2', ground: '#2c2a24', sky: ['#3b4a52', '#1d2427'], plate: '#252c29'});

let grain = null;
export function background(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD.height);
  g.addColorStop(0, theme.back[0]); g.addColorStop(1, theme.back[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  // Brushed steel streaks, the same every frame (a fixed pattern, not random each draw).
  if (!grain) {
    grain = {lines: Array.from({length: 150}, (_, i) => [((i * 7919) % 1000), ((i * 104729) % BOARD.height), 30 + (i * 31) % 160])};
  }
  ctx.strokeStyle = theme.grain; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [x, y, w] of grain.lines) { ctx.moveTo(x, y); ctx.lineTo(x + w, y + .5); }
  ctx.stroke();
  const v = ctx.createRadialGradient(500, 340, 200, 500, 340, 640);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
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
// Kestrel One side on: a light utility helicopter, shaded so it reads against the board.
export function helicopter(ctx, x, y, tilt, time, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(scale, scale);
  const body = ctx.createLinearGradient(0, -24, 0, 24);
  body.addColorStop(0, '#9aa596'); body.addColorStop(.45, '#5f6c62'); body.addColorStop(1, '#2b322d');
  ctx.fillStyle = '#4a544c';
  ctx.beginPath(); ctx.moveTo(-36, -8); ctx.lineTo(-118, -4); ctx.lineTo(-118, 4); ctx.lineTo(-36, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-108, -4); ctx.lineTo(-124, -30); ctx.lineTo(-114, -30); ctx.lineTo(-100, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(200,205,195,.25)'; ctx.beginPath(); ctx.arc(-118, -2, 13 * Math.abs(Math.sin(time * 30)) + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.bezierCurveTo(-30, -26, 30, -28, 46, -8); ctx.bezierCurveTo(54, 6, 44, 22, 20, 22); ctx.lineTo(-34, 20); ctx.bezierCurveTo(-46, 16, -48, -6, -40, -14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  const glass = ctx.createLinearGradient(10, -24, 46, 4); glass.addColorStop(0, '#d9e6ea'); glass.addColorStop(1, '#4f6670');
  ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(8, -20); ctx.bezierCurveTo(30, -24, 44, -14, 47, -4); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d6a43a'; ctx.fillRect(-40, 6, 78, 5);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-6, 20); ctx.stroke();
  ctx.strokeStyle = '#2e353a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 21); ctx.lineTo(-30, 32); ctx.moveTo(22, 21); ctx.lineTo(26, 32); ctx.moveTo(-46, 32); ctx.lineTo(42, 32); ctx.stroke();
  ctx.fillStyle = '#2e353a'; ctx.fillRect(-4, -34, 8, 10);
  const blade = 128 * Math.abs(Math.cos(time * 22));
  ctx.strokeStyle = 'rgba(210,214,205,.18)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-128, -35); ctx.lineTo(128, -35); ctx.stroke();
  ctx.strokeStyle = '#20262a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-blade, -35); ctx.lineTo(blade, -35); ctx.stroke();
  ctx.restore();
}
// The Dusthawk rally car on its lifting sling.
export function car(ctx, x, y, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = theme.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-26, -4); ctx.moveTo(0, -20); ctx.lineTo(26, -4); ctx.stroke();
  const paint = ctx.createLinearGradient(0, -12, 0, 16); paint.addColorStop(0, '#f1ece0'); paint.addColorStop(1, '#8f8a7d');
  ctx.fillStyle = paint; ctx.beginPath(); ctx.moveTo(-38, 14); ctx.lineTo(-38, 2); ctx.lineTo(-20, -1); ctx.lineTo(-11, -12); ctx.lineTo(16, -12); ctx.lineTo(27, -1); ctx.lineTo(39, 2); ctx.lineTo(39, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#2f6b45'; ctx.fillRect(-38, 6, 77, 4);
  ctx.fillStyle = '#34444c'; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(3, -9); ctx.lineTo(3, -1); ctx.lineTo(-15, -1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(14, -9); ctx.lineTo(22, -1); ctx.lineTo(6, -1); ctx.closePath(); ctx.fill();
  for (const wx of [-22, 24]) {
    ctx.fillStyle = '#121516'; ctx.beginPath(); ctx.arc(wx, 15, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d949a'; ctx.beginPath(); ctx.arc(wx, 15, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
export function outdoors(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD.height);
  g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD.width, BOARD.height);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 26; i++) { const x = i * 41 + (i % 3) * 9, h = 40 + (i * 37) % 60; ctx.beginPath(); ctx.moveTo(x - 18, GROUND_Y); ctx.lineTo(x, GROUND_Y - h); ctx.lineTo(x + 18, GROUND_Y); ctx.fill(); }
  ctx.fillStyle = theme.ground; ctx.fillRect(0, GROUND_Y, BOARD.width, 80);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(BOARD.width, GROUND_Y); ctx.stroke();
}
export function wrap(ctx, value, x, y, width) {
  ctx.font = '700 22px "Segoe UI", sans-serif';
  const words = value.split(' '), lines = [];
  let line = '';
  for (const w of words) { const next = line ? `${line} ${w}` : w; if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next; }
  lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * 28, {size: 22}));
}


// Fits the 1000 x 680 board into the canvas, clipped, and draws it; answers where it went.
export function fitBoard(ctx, width, height, draw) {
  ctx.save();
  const scale = Math.min(width / BOARD.width, height / BOARD.height), left = (width - BOARD.width * scale) / 2, top = (height - BOARD.height * scale) / 2;
  ctx.translate(left, top); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, BOARD.width, BOARD.height); ctx.clip();
  draw();
  ctx.restore();
  return {scale, left, top};
}
