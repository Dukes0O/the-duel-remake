// The classroom screen (docs/board/cards/LAB-CLASSROOM.md): the progress strip, the lesson's
// board, Brian's tutor panel and one action bar. Reads the session; never writes race state.
// Notebook words go through app.labCommit; challenges go through the Lab's own challenge path.
import {createClassroomSession} from './classroom-frame.js';
import {brianPortrait} from './brian-portrait.js';
import {learnLabWord, labNotebookOf} from '../lab-save.js';
import './classroom.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const kbd = key => `<kbd>${escape(key)}</kbd>`;
const KEY_NAMES = {Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4', Numpad5: '5', Space: 'Space',
  KeyW: 'W', KeyS: 'S', KeyA: 'A', KeyD: 'D', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→'};
const SPARK_COLOURS = ['#ffd27a', '#f0a148', '#fff2c8', '#e8803a'];

export function createClassroomUi({stage, app, lesson, name, onLeave, startChallenge, sayVoice = () => {}, onCue = () => {}}) {
  const doc = stage.ownerDocument, win = doc.defaultView;
  const session = createClassroomSession(lesson), board = lesson.board;
  const root = doc.createElement('section');
  root.className = 'lab-classroom'; root.setAttribute('aria-label', `${name} lesson`);
  root.innerHTML = `<header class="lc-top"><h2>${escape(name)}</h2><ol class="lc-progress"></ol><button type="button" class="lc-leave" data-lc="leave">Leave ${kbd('Esc')}</button></header>
    <div class="lc-main"><div class="lc-board"><h3 class="lc-step"></h3><canvas class="lc-canvas" aria-label="Lesson board"></canvas><p class="lc-hover" hidden></p></div>
    <aside class="lc-brian"><div class="lc-portrait" data-mood="talk"><span>B</span></div><b class="lc-name">Brian</b>
      <p class="lc-bubble" aria-live="polite"></p><div class="lc-cards"></div>
      <button type="button" class="lc-help" data-lc="help">Help me, Brian ${kbd('H')}</button>
      <div class="lc-rungs" aria-label="Help used"><i></i><i></i><i></i></div></aside></div>
    <footer class="lc-bar"><p class="lc-prompt"></p><div class="lc-actions"></div></footer>`;
  stage.append(root);
  const $ = selector => root.querySelector(selector);
  const canvas = $('.lc-canvas'), ctx = canvas.getContext('2d');
  let layout = {scale: 1, left: 0, top: 0}, drag = null, last = {}, voiced = -1, celebrated = null, sparks = [], lastTime = 0, note = '', disposed = false;

  brianPortrait(doc).then(url => {
    if (!url || disposed) return;
    const portrait = $('.lc-portrait');
    portrait.innerHTML = `<img alt="Brian" src="${url}">`;
  });

  function setHtml(element, key, html) { if (last[key] !== html) { element.innerHTML = html; last[key] = html; return true; } return false; }
  function act(action) {
    note = '';
    if (action === 'leave') { onLeave(); return; }
    if (action === 'challenge') {
      const started = startChallenge();
      if (!started?.ok) note = started?.reason ?? 'The challenge is not open yet.';
      return;
    }
    const before = session.view().index;
    session.act(action);
    if (action === 'next' && session.view().index !== before) onCue('lab.tick');
  }
  const boardPoint = event => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left - layout.left) / layout.scale, (event.clientY - rect.top - layout.top) / layout.scale];
  };

  // ---- keys: one keyboard, every control has a key ----
  function onKey(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    // A focused Lab button outside the lesson keeps its own Enter and Space.
    if (!root.contains(event.target) && event.target.closest?.('button,input,select,textarea,a')) return;
    // A lesson button reached with Tab presses on Enter or Space (a mouse-clicked one does not hold the keys).
    if (['Enter', 'NumpadEnter', 'Space'].includes(event.code) && event.target.closest?.('button') && event.target.matches?.(':focus-visible')) return;
    const v = session.view(), name = KEY_NAMES[event.code];
    let action = null;
    if (event.code === 'Escape') action = 'leave';
    else if (event.code === 'Enter' || event.code === 'NumpadEnter') action = v.last ? 'challenge' : v.ready ? 'next' : null;
    else if (event.code === 'KeyH') action = 'help';
    else if (event.code === 'KeyR' && v.actions.includes('replay')) action = 'replay';
    else if (event.code === 'KeyS' && v.actions.includes('slow')) action = 'slow';
    else if (name && v.keys[name]) action = v.keys[name];
    // The walk keys and the Lab's own Esc must not act behind the lesson.
    if (action || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
    // A held key repeats only where the lesson asks for it (the Lift lever), and says it is held.
    if (action && !event.repeat) act(action);
    else if (action && v.repeat?.includes(name)) act(`${action}:held`);
  }
  win.addEventListener('keydown', onKey, true);

  // ---- the board: click a hook, a weight or a string; drag the weight and let go ----
  function onDown(event) {
    const [x, y] = boardPoint(event), hit = board.hitTest(session.view(), x, y);
    if (!hit) return;
    event.preventDefault();
    if (hit.drag) {
      drag = {id: hit.drag, index: session.view().index}; canvas.setPointerCapture?.(event.pointerId);
      // A lever moves to where it is pressed; a pendulum weight waits for the drag.
      if (board.pressMovesDrag) session.act(`hold:${board.dragAngle(session.view(), drag.id, x, y)}`);
      return;
    }
    act(hit.action);
  }
  function onMove(event) {
    const [x, y] = boardPoint(event);
    // A drag ends without letting go if the button came up somewhere we did not see (another window).
    if (drag && event.buttons === 0) drag = null;
    if (drag) { session.act(`hold:${board.dragAngle(session.view(), drag.id, x, y)}`); return; }
    const v = session.view();
    canvas.style.cursor = board.hitTest(v, x, y) ? 'pointer' : 'default';
    // Hovering explains the part under the mouse.
    const tip = $('.lc-hover'), text = board.hoverInfo?.(v, x, y) ?? '';
    if (tip.textContent !== text) tip.textContent = text;
    tip.hidden = !text;
    if (text) { const rect = canvas.getBoundingClientRect(); tip.style.left = `${event.clientX - rect.left + 16}px`; tip.style.top = `${event.clientY - rect.top + canvas.offsetTop + 16}px`; }
  }
  function onUp() { if (!drag) return; drag = null; act('release'); }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('lostpointercapture', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { $('.lc-hover').hidden = true; });
  function onClick(event) {
    const action = event.target.closest?.('[data-lc]')?.dataset.lc;
    if (action) { event.stopPropagation(); act(action); }
  }
  root.addEventListener('click', onClick);

  // ---- painting ----
  function paintDom(v) {
    // Read by the browser scenario (tools/scenarios/lab-classroom.mjs) to know when to press on.
    const state = JSON.stringify({step: v.step.id, ready: v.ready, waiting: v.waiting, help: v.help, cards: v.cards.length, pointer: Boolean(v.pointer)});
    if (root.dataset.classroom !== state) root.dataset.classroom = state;
    setHtml($('.lc-progress'), 'progress', v.parts.map((part, i) =>
      `<li class="${part.done ? 'done' : ''} ${part.current ? 'current' : ''}"><button type="button" ${part.reached && !part.current ? `data-lc="go:${part.first}"` : 'disabled'}>` +
      `<span>${part.done ? '✓' : i + 1}</span>${escape(part.name)}</button></li>`).join(''));
    setHtml($('.lc-step'), 'step', escape(v.step.title));
    const brian = note ? {text: note, mood: 'explain'} : v.brian;
    setHtml($('.lc-bubble'), 'bubble', escape(brian.text));
    const portrait = $('.lc-portrait');
    if (portrait.dataset.mood !== brian.mood) portrait.dataset.mood = brian.mood;
    root.querySelectorAll('.lc-rungs i').forEach((dot, i) => dot.classList.toggle('on', i < v.help));
    if (setHtml($('.lc-cards'), 'cards', v.cards.map(card =>
      `<button type="button" data-lc="${escape(card.id)}" class="lc-card ${card.state ?? ''}" ${card.state !== null || v.cards.some(c => c.state) ? 'disabled' : ''}>` +
      `<canvas width="220" height="110" data-card="${escape(card.id)}"></canvas><span>${kbd(card.key)} ${escape(card.label)}</span>` +
      `${card.state === 'right' ? '<b>Right answer</b>' : card.state === 'wrong' ? '<b>Your pick</b>' : ''}</button>`).join(''))) {
      for (const el of root.querySelectorAll('[data-card]')) {
        const card = v.cards.find(c => c.id === el.dataset.card);
        board.drawPicture(el.getContext('2d'), card.picture, el.width, el.height);
      }
    }
    $('.lc-cards').hidden = v.cards.length === 0;
    root.classList.toggle('lc-asking', v.cards.length > 0);
    setHtml($('.lc-prompt'), 'prompt', `<b>Your move</b> ${escape(v.prompt)}`);
    const button = (action, label, key, {primary = false, disabled = false, pressed = null} = {}) =>
      `<button type="button" data-lc="${action}" class="${primary ? 'primary' : ''}" ${disabled ? 'disabled' : ''} ${pressed === null ? '' : `aria-pressed="${pressed}"`}>${escape(label)} ${kbd(key)}</button>`;
    setHtml($('.lc-actions'), 'actions',
      (v.actions.includes('tap') ? button('tap', 'Tap', 'Space') : '') +
      (v.buttons ?? []).map(b => button(b.action, b.label, b.key)).join('') +
      (v.keys.W ? button('lever:up', 'Lever up', 'W') + button('lever:down', 'Lever down', 'S') : '') +
      (v.actions.includes('replay') ? button('replay', 'Watch again', 'R') : '') +
      (v.actions.includes('slow') ? button('slow', v.slow ? 'Slow motion: on' : 'Slow motion', 'S', {pressed: v.slow}) : '') +
      (v.last ? button('leave', 'Back to the Lab', 'Esc') + button('challenge', lesson.finishLabel ?? 'Try it in the game', 'Enter', {primary: true})
        : button('next', 'Continue', 'Enter', {primary: true, disabled: !v.ready})));
  }

  function paintBoard(v, dt) {
    const rect = canvas.getBoundingClientRect(), dpr = win.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    layout = board.drawBoard(ctx, v, rect.width, rect.height);
    ctx.setTransform(dpr * layout.scale, 0, 0, dpr * layout.scale, dpr * layout.left, dpr * layout.top);
    if (v.slow) {
      ctx.fillStyle = 'rgba(237,197,87,.9)'; ctx.font = '800 18px "Segoe UI", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('SLOW MOTION: half speed', board.BOARD.width - 16, 12);
    }
    if (v.pointer) pointer(v);
    // A right answer throws workshop sparks from where the player was working.
    if (v.celebrate && celebrated !== v.celebrate.at) {
      celebrated = v.celebrate.at;
      const from = board.targetPoint(v, 'release') ?? [board.BOARD.width / 2, board.BOARD.height / 2];
      for (let i = 0; i < (v.celebrate.big ? 90 : 45); i++) {
        const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, speed = 220 + Math.random() * 380;
        sparks.push({x: from[0], y: from[1], vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .7 + Math.random() * .7, colour: SPARK_COLOURS[i % 4]});
      }
    }
    sparks = sparks.filter(s => (s.life -= dt) > 0);
    for (const s of sparks) {
      s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.strokeStyle = s.colour; ctx.globalAlpha = Math.min(1, s.life * 1.6); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .025, s.y - s.vy * .025); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Brian's pointer travels from his side of the screen to the thing to press, then taps on it.
  function pointer(v) {
    const to = board.targetPoint(v, v.pointer.action);
    if (!to) return;
    const k = Math.min(1, v.pointer.age / .9), e = k * k * (3 - 2 * k);
    const x = board.BOARD.width + 40 + (to[0] - board.BOARD.width - 40) * e, y = board.BOARD.height * .45 + (to[1] - board.BOARD.height * .45) * e;
    const tap = k >= 1 ? Math.abs(Math.sin(v.pointer.age * 4)) * 6 : 0;
    if (k >= 1) { ctx.strokeStyle = 'rgba(237,197,87,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(to[0], to[1], 22 + tap * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(x + 6, y + 8 + tap);
    ctx.fillStyle = '#f5f0dc'; ctx.strokeStyle = '#1d2224'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 23); ctx.lineTo(26, 23); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#edc557'; ctx.font = '800 16px "Segoe UI", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Brian', 28, 30);
    ctx.restore();
  }

  function stepEntered(v) {
    if (voiced === v.index) return;
    voiced = v.index;
    if (v.step.voice) sayVoice(v.step.voice);
    // A step teaches one word, or a few that belong together (north, east, south and west).
    for (const id of [v.step.word, ...(v.step.words ?? [])].filter(Boolean))
      if (app.profile && !labNotebookOf(app.profile).includes(id)) app.labCommit?.((p, f) => learnLabWord(p, id, {flags: f}));
  }

  return {
    tick(visible) {
      const now = win.performance.now(), dt = lastTime ? Math.min(.1, (now - lastTime) / 1000) : 0;
      lastTime = now;
      root.hidden = !visible;
      if (!visible) return;
      session.tick(dt);
      for (const event of session.takeEvents()) {
        if (event.sound) onCue(event.sound);
        if (event.kind === 'right' || event.kind === 'pass') onCue('interface.bonus');
      }
      const v = session.view();
      if (drag && drag.index !== v.index) drag = null; // A weight held across a step change is put down, not let go.
      stepEntered(v);
      paintDom(v); paintBoard(v, dt);
    },
    view: () => session.view(),
    act,
    dispose() {
      disposed = true;
      win.removeEventListener('keydown', onKey, true);
      root.removeEventListener('click', onClick);
      root.remove();
    },
  };
}
