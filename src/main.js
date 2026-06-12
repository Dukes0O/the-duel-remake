// main.js — The Duel: menu, HUD overlay, and boot. The 3D view (render3d.js)
// draws into a full-bleed canvas; DOM panels overlay it.

import './style.css';
import { App } from './app.js';
import { CARS, DIFFICULTY, COURSE } from './config.js';

const root = document.querySelector('#app');
const app = new App();
let renderHandle = null;

// layout: a canvas host + an overlay layer
root.innerHTML = `
  <div id="stage"><div id="view3d"></div><div id="overlay"></div></div>
`;
const view3d = root.querySelector('#view3d');
const overlay = root.querySelector('#overlay');

async function ensureRenderer() {
  if (renderHandle) return;
  try {
    const mod = await import(/* @vite-ignore */ './render3d.js');
    renderHandle = mod.attachRenderer(view3d, app);
    view3d.classList.add('live');
  } catch (e) { /* 3D failed; HUD still drives the game */ }
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) e.append(kid?.nodeType ? kid : document.createTextNode(kid ?? ''));
  return e;
}

// ---- screens -----------------------------------------------------------
function renderOverlay() {
  const s = app.duel.state;
  overlay.innerHTML = '';
  if (s.status === 'menu') return overlay.append(menuScreen());
  // in-stage HUD always visible while racing/countdown
  overlay.append(hud(s));
  if (s.status === 'countdown') overlay.append(countdown(s));
  if (s.status === 'ticket') overlay.append(ticketScreen(s));
  if (s.status === 'stage_result') overlay.append(resultScreen(s));
  if (s.status === 'gameover') overlay.append(gameoverScreen(s));
  if (s.status === 'complete') overlay.append(completeScreen(s));
}

let menuChoice = { car: 'falcone_f42', difficulty: 'casual', mode: 'duel' };
function menuScreen() {
  const m = el('div', { class: 'panel menu' });
  m.append(el('h1', {}, 'THE DUEL'), el('p', { class: 'sub' }, 'Point-to-point road racing · pass in the oncoming lane · beat the rival · don’t get caught'));

  m.append(el('h3', {}, 'Car'));
  const cars = el('div', { class: 'row' });
  for (const [key, c] of Object.entries(CARS)) {
    cars.append(el('button', { class: 'chip' + (menuChoice.car === key ? ' on' : ''), onclick: () => { menuChoice.car = key; renderOverlay(); } },
      `${c.name}`, el('small', {}, ` ${c.topSpeed} mph · ${c.gears.length}-spd`)));
  }
  m.append(cars);

  m.append(el('h3', {}, 'Difficulty'));
  const diffs = el('div', { class: 'row' });
  for (const [key, d] of Object.entries(DIFFICULTY)) {
    diffs.append(el('button', { class: 'chip' + (menuChoice.difficulty === key ? ' on' : ''), onclick: () => { menuChoice.difficulty = key; renderOverlay(); } },
      d.name, el('small', {}, d.autoShift ? ' auto' : ' manual')));
  }
  m.append(diffs);

  m.append(el('h3', {}, 'Mode'));
  const modes = el('div', { class: 'row' });
  for (const [key, label] of [['duel', 'Duel (vs rival)'], ['timetrial', 'Time Trial']]) {
    modes.append(el('button', { class: 'chip' + (menuChoice.mode === key ? ' on' : ''), onclick: () => { menuChoice.mode = key; renderOverlay(); } }, label));
  }
  m.append(modes);

  m.append(el('div', { class: 'controls-help' }, '↑ throttle · ↓ brake · ←/→ steer · Q/E shift (manual)'));
  m.append(el('button', { class: 'go', onclick: startGame }, '▶ START'));
  return m;
}

function startGame() {
  app.duel.startCampaign(menuChoice);
  ensureRenderer();
  renderOverlay();
}

function hud(s) {
  const car = app.duel.car;
  const h = el('div', { class: 'hud' });
  // top bar
  h.append(el('div', { class: 'hud-top' },
    el('span', { class: 'stage' }, app.duel.stageDef.name),
    el('span', { class: 'lives' }, '❤ '.repeat(Math.max(0, s.lives)).trim() || '—'),
    el('span', { class: 'timer' }, `${s.stageTimeSec.toFixed(1)}s` + (s.penaltySec ? `  +${Math.round(s.penaltySec)}s` : '')),
  ));
  // speedo + tach + gear
  const tachPct = Math.min(1, s.revs) * 100;
  const redline = s.revs > 0.92;
  h.append(el('div', { class: 'hud-bot' },
    el('div', { class: 'gauge' }, el('b', {}, String(Math.round(s.speedMph))), el('small', {}, 'MPH')),
    el('div', { class: 'tach' + (redline ? ' red' : '') }, el('i', { style: `width:${tachPct}%` }), el('span', {}, `GEAR ${s.gear + 1}/${car.gears.length}`)),
    radarWidget(s),
  ));
  if (s.rival) {
    const gap = Math.round(s.rival.s - s.s);
    h.append(el('div', { class: 'rival-tag' }, gap >= 0 ? `RIVAL ahead ${gap}u` : `RIVAL behind ${-gap}u`));
  }
  if (s.crashFlash > 0) h.append(el('div', { class: 'crashflash' }, s.lastCrashReason === 'engine_blew' ? 'ENGINE BLOWN!' : s.lastCrashReason === 'traffic' ? 'CRASH!' : 'OFF ROAD!'));
  return h;
}

function radarWidget(s) {
  const p = s.police;
  const w = el('div', { class: 'radar' });
  const beepPct = Math.round(p.beep * 100);
  w.append(el('div', { class: 'radar-bar' + (p.beep > 0.66 ? ' hot' : p.beep > 0.2 ? ' warm' : '') }, el('i', { style: `width:${beepPct}%` })));
  w.append(el('small', {}, p.pursuit && p.pursuit.active ? '🚓 PURSUIT' : p.beep > 0.05 ? 'RADAR' : 'clear'));
  return w;
}

function countdown(s) {
  const n = Math.ceil(s.countdown);
  return el('div', { class: 'big-center' }, n > 0 ? String(n) : 'GO!');
}

function ticketScreen(s) {
  const t = s.police.ticket;
  const p = el('div', { class: 'panel center' });
  p.append(el('h2', {}, '🚓 PULLED OVER'));
  p.append(el('p', {}, t.offense));
  p.append(el('p', {}, `Clocked at ${t.speedMph} mph in a ${t.limitMph} zone.`));
  p.append(el('p', { class: 'pen' }, `+${t.penaltySec}s penalty · $${t.fine} fine`));
  p.append(el('button', { class: 'go', onclick: () => { app.duel.ackTicket(); renderOverlay(); } }, 'Pay & continue →'));
  return p;
}

function resultScreen(s) {
  const r = s.results;
  const p = el('div', { class: 'panel center' });
  p.append(el('h2', {}, r.cleanStage ? '✅ STAGE CLEAR' : '⚠ STATION MISSED'));
  p.append(el('p', {}, `${r.stageName} — ${r.stageTimeSec.toFixed(2)}s`));
  if (r.best != null) p.append(el('p', { class: 'best' }, `Best: ${r.best.toFixed(2)}s`));
  if (r.beatRival != null) p.append(el('p', {}, r.beatRival ? '🏆 You beat the rival!' : 'The rival got there first.'));
  p.append(el('p', {}, `Time bonus ${r.timeBonus} · Lives ${r.lives} · Score ${r.score}`));
  p.append(el('button', { class: 'go', onclick: () => { app.duel.nextStage(); ensureRenderer(); renderOverlay(); } },
    s.stageIndex + 1 >= COURSE.length ? 'Finish →' : 'Next stage →'));
  return p;
}

function gameoverScreen(s) {
  const p = el('div', { class: 'panel center' });
  p.append(el('h2', {}, '💥 GAME OVER'));
  p.append(el('p', {}, `You ran out of lives on ${app.duel.stageDef.name}.`));
  p.append(el('p', {}, `Total time incl. penalties: ${Math.round(s.totalTimeSec)}s`));
  p.append(el('button', { class: 'go', onclick: () => location.reload() }, 'Try again'));
  return p;
}

function completeScreen(s) {
  const p = el('div', { class: 'panel center' });
  p.append(el('h2', {}, '🏁 CAMPAIGN COMPLETE'));
  p.append(el('p', {}, `All ${COURSE.length} stages cleared with ${s.results.lives} lives to spare.`));
  p.append(el('p', {}, `Total time incl. penalties: ${s.results.totalTimeSec}s`));
  p.append(el('button', { class: 'go', onclick: () => location.reload() }, 'Race again'));
  return p;
}

// ---- boot --------------------------------------------------------------
let lastStatus = null;
app.onFrame = (s) => {
  // re-render the overlay on status change or every frame while racing (cheap)
  if (s.status !== lastStatus) { lastStatus = s.status; renderOverlay(); if (s.status !== 'menu') ensureRenderer(); }
  else if (s.status === 'racing' || s.status === 'countdown') updateHudLive(s);
};

// lightweight live HUD update without rebuilding the DOM tree every frame
function updateHudLive(s) {
  const car = app.duel.car;
  const set = (sel, txt) => { const e = overlay.querySelector(sel); if (e && txt != null) e.textContent = txt; };
  set('.gauge b', String(Math.round(s.speedMph)));
  set('.timer', `${s.stageTimeSec.toFixed(1)}s` + (s.penaltySec ? `  +${Math.round(s.penaltySec)}s` : ''));
  set('.lives', '❤ '.repeat(Math.max(0, s.lives)).trim() || '—');
  const tach = overlay.querySelector('.tach i'); if (tach) tach.style.width = `${Math.min(1, s.revs) * 100}%`;
  const tachBox = overlay.querySelector('.tach'); if (tachBox) tachBox.classList.toggle('red', s.revs > 0.92);
  set('.tach span', `GEAR ${s.gear + 1}/${car.gears.length}`);
  const rb = overlay.querySelector('.radar-bar i'); if (rb) rb.style.width = `${Math.round(s.police.beep * 100)}%`;
  // countdown / crash flash need structural change — fall back to full render
  if (s.status === 'countdown' || s.crashFlash > 0 || (s.police.pursuit && s.police.pursuit.active)) renderOverlay();
}

renderOverlay();
app.start();
