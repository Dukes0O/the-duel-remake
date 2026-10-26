import {createLessonSession, lessonDefinition, registeredWords, entryForWord, registerLesson} from './lesson-frame.js';
import {labNotebookOf, learnLabWord} from './lab-save.js';
import './lesson-ui.css';

// Later lessons add a data packet and animation module; no screen edits needed.
for (const packet of Object.values(import.meta.glob('./lessons/*-lesson.js', {eager: true}))) {
  if (!lessonDefinition(packet.definition.id)) registerLesson(packet.definition, packet.hooks);
}

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const button = (action, text, disabled = false) => `<button type="button" data-teach="${action}"${disabled ? ' disabled' : ''}>${escape(text)}</button>`;

// Uses app.labCommit for notebook writes; challenge rewards stay in the existing game.
export function createLessonUi({section, stage, host, app, room, onBack, onChallenge, sayVoice, onPause, onCue}) {
  const doc = section.ownerDocument;
  const panel = doc.createElement('section'); panel.className = 'lab-teaching'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Lesson'); stage.append(panel);
  const card = doc.createElement('aside'); card.className = 'lab-key-idea'; card.hidden = true; host.append(card);
  const notebookButton = doc.createElement('button'); notebookButton.className = 'lab-notebook-button'; notebookButton.textContent = 'Notebook'; notebookButton.hidden = true; stage.append(notebookButton);
  let session = null, entry = null, last = '', hover = null, notebook = false, wordVoice = '', challengeActive = null, lastTime = 0, feedback = '', wasPaused = false;
  const flags = () => app._switches();
  const on = () => flags().enabled('lab-2') === true;
  const learned = () => labNotebookOf(app.profile);
  const knownWords = () => registeredWords().filter(w => learned().includes(w.id));
  const lookup = id => knownWords().find(w => w.id === id);
  const held = new Set();
  function leverKey(event) {
    if (!session || hover || notebook || !['ArrowUp', 'ArrowDown'].includes(event.code)) return;
    if (!session.view().controls.some(c => c.keyboard === 'vertical')) return;
    event.preventDefault();
    if (event.type === 'keydown') held.add(event.code); else held.delete(event.code);
  }
  const clearHeld = () => held.clear();
  doc.addEventListener('keydown', leverKey); doc.addEventListener('keyup', leverKey); doc.defaultView.addEventListener('blur', clearHeld);
  function textMarkup(text, words = knownWords(), interactive = true) {
    const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
    if (!sorted.length) return escape(text);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${sorted.map(w => w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
    let html = '', start = 0;
    for (const match of String(text).matchAll(re)) {
      const word = sorted.find(w => w.word.toLowerCase() === match[0].toLowerCase());
      html += escape(text.slice(start, match.index)) + (interactive ? `<button type="button" class="lab-word" data-word="${word.id}">${escape(match[0])}</button>` : `<u class="lab-word" data-word="${word.id}">${escape(match[0])}</u>`);
      start = match.index + match[0].length;
    }
    return html + escape(text.slice(start));
  }
  function paint() {
    const v = session?.view();
    const pause = Boolean(v || hover || notebook);
    if (pause !== wasPaused) { wasPaused = pause; onPause?.(); }
    panel.hidden = !v && !notebook && !hover;
    section.classList.toggle('lab-has-lesson', Boolean(v || hover || notebook));
    let html = '';
    if (hover) html = `<h3><u class="lab-word">${escape(hover.word)}</u></h3><p>${escape(hover.meaning)}</p>${button('meaning-close', 'Back')}`;
    else if (notebook) html = `<h3>My Lab notebook</h3><div class="lab-notebook-words">${knownWords().map(w => `<button type="button" class="lab-word" data-word="${w.id}">${escape(w.word)}</button>`).join('') || '<p>New words will go here as you learn.</p>'}</div>${button('notebook-close', 'Close notebook')}`;
    else if (v) {
      const word = v.stage === 1 ? entry.definition.words[v.index] : null;
      const showPictures = v.question && (v.stage === 4 || !v.selected || v.result);
      const answers = showPictures ? v.question.answers : [];
      html = `<div class="lab-teaching-heading"><span>${v.stage + 1} / 5</span><h3>${escape(v.title)}</h3>${button('back', 'Leave machine')}</div>` +
        (v.name ? `<h4>${textMarkup(v.name, v.words)}</h4>` : '') + `<p aria-live="polite">${textMarkup(feedback || v.text, v.words)}</p>` +
        (answers.length ? `<div class="lab-picture-answers">${answers.map(a => `<button type="button" data-teach="answer:${a.id}" ${v.checkAnswer || v.result ? 'disabled' : ''} class="${(v.stage === 4 && v.checkAnswer ? v.question.correct === a.id : v.selected === a.id) ? 'picked' : ''}"><canvas width="260" height="125" data-picture="${escape(a.picture)}"></canvas><span>${textMarkup(a.label, v.words, false)}</span>${v.result?.actual === a.id ? '<b>What happened</b>' : ''}${v.selected === a.id ? '<b>Your prediction</b>' : ''}</button>`).join('')}</div>` : '') +
        (v.controls.length ? `<div class="lab-machine-controls ${v.support}">${v.controls.map(c => `<button type="button" data-teach="control:${c.id}">${v.input[c.id] !== undefined ? '✓ ' : ''}${textMarkup(c.label, v.words, false)}</button>`).join('')}</div>` : '') +
        `<div class="lab-teaching-actions">${v.stage === 2 ? button('pause', v.paused ? 'Play' : 'Pause') + button('step', 'Step') + button('replay', 'Replay') : ''}` +
        `${word ? button(`word:${word.id}`, 'Replay word') : ''}${v.stage === 3 && v.selected && !v.running && !v.result ? button('run', 'Run the machine') : ''}` +
        `${v.retry ? button('retry', 'Try again') : ''}${v.showMe ? button('show', 'Show me') : ''}` +
        `${v.challenge ? button('challenge', 'Try it in the game') : v.challenging && !v.showing ? (v.result?.passed ? button('finish', 'Finish challenge') : '') : button('next', v.showing && v.index === entry.definition.worked.length - 1 ? 'Now you do it' : 'Continue', !v.canNext)}</div>`;
    }
    if (html !== last) {
      const focus = doc.activeElement?.getAttribute('data-teach');
      panel.innerHTML = html; last = html;
      if (focus) [...panel.querySelectorAll('[data-teach]')].find(el => el.dataset.teach === focus)?.focus({preventScroll: true});
      for (const canvas of panel.querySelectorAll('[data-picture]')) entry.hooks.pictures[canvas.dataset.picture](canvas.getContext('2d'), canvas.width, canvas.height);
    }
    if (v && !hover && !notebook) {
      for (const w of v.words) if (!learned().includes(w.id)) app.labCommit((p, f) => learnLabWord(p, w.id, {flags: f}));
      const voice = `${v.stage}:${v.index}:${v.showing}`;
      if (voice !== wordVoice) {
        wordVoice = voice;
        const d = entry.definition;
        sayVoice((v.stage === 0 ? d.wonder : v.stage === 1 ? d.words[v.index] : v.stage === 2 ? d.worked[v.index] : null)?.voice);
      }
    }
  }
  function openMeaning(id) {
    const w = lookup(id); if (!w || hover?.id === id) return;
    hover = {...w, startedAt: performance.now()}; lastTime = performance.now(); paint();
  }
  const point = event => { const el = event.target.closest?.('[data-word]'); if (on() && el && section.contains(el)) openMeaning(el.dataset.word); };
  function click(event) {
    if (!on()) return;
    const word = event.target.closest?.('[data-word]'); if (word) { openMeaning(word.dataset.word); return; }
    const action = event.target.closest?.('[data-teach]')?.dataset.teach;
    if (!action) return;
    const [kind, id] = action.split(':');
    onCue?.(kind === 'control' ? 'lab.clunk' : 'lab.tick');
    if (kind === 'back') { close(); onBack(); return; }
    if (kind === 'meaning-close') { hover = null; if (!session) room()?.lesson?.(null); paint(); return; }
    if (kind === 'notebook-close') { notebook = false; if (!session) room()?.lesson?.(null); paint(); return; }
    if (!session || hover || notebook) return;
    feedback = '';
    if (kind === 'next') session.next();
    if (kind === 'pause') session.pause();
    if (kind === 'step') session.step();
    if (kind === 'replay') session.replay();
    if (kind === 'word') { openMeaning(id); return; }
    if (kind === 'answer') { if (session.view().stage === 3) session.predict(id); else session.answer(id); }
    if (kind === 'control') session.control(id);
    if (kind === 'run') session.run();
    if (kind === 'retry') session.retry();
    if (kind === 'show') session.showMe();
    if (kind === 'challenge') {
      const d = entry.definition;
      const started = onChallenge(d.id, session.view());
      if (started === 'inline') session.startChallenge();
      else if (started?.active) { challengeActive = started; card.innerHTML = `<b>${escape(d.challenge.title ?? 'Key idea')}</b><p>${escape(d.challenge.text)}</p>`; close(); }
      else feedback = started?.reason ?? 'The challenge is not open yet.';
    }
    if (kind === 'finish') {
      const result = onChallenge(entry.definition.id, session.view());
      if (result?.ok) { close(); onBack(); return; }
      feedback = result?.reason ?? 'The machine has not reached its goal. Try another run.';
      session.challengeRetry();
    }
    paint();
  }
  function close() { session = null; entry = null; hover = null; notebook = false; feedback = ''; last = ''; panel.hidden = true; section.classList.remove('lab-has-lesson'); room()?.lesson?.(null); }
  notebookButton.onclick = () => { notebook = !notebook; hover = null; paint(); };
  section.addEventListener('click', click); section.addEventListener('pointerover', point); section.addEventListener('focusin', point);
  // Underline learned words in all Lab prose, including Brian and the shop.
  function decorate() {
    if (!on()) return;
    for (const el of section.querySelectorAll('.lab-side,.lab-caption')) {
      const walker = doc.createTreeWalker(el, 4), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (node.parentElement.closest('[data-word],select,script,style')) continue;
        const html = textMarkup(node.textContent, knownWords(), !node.parentElement.closest('button'));
        if (html === escape(node.textContent)) continue;
        const span = doc.createElement('span'); span.innerHTML = html; node.replaceWith(span);
      }
    }
  }
  return {
    open(id) {
      const found = lessonDefinition(id); if (!on() || !found) return false;
      close(); entry = found; session = createLessonSession(entry); wordVoice = ''; lastTime = performance.now(); paint(); return true;
    },
    active: () => Boolean(session || hover || notebook),
    control(id, value) { if (!session || hover || notebook) return; if (value === undefined) onCue?.('lab.clunk'); session.control(id, value); paint(); },
    decorate,
    tick(visible) {
      notebookButton.hidden = !visible || !on();
      const now = performance.now(), dt = lastTime ? (now - lastTime) / 1000 : 0; lastTime = now;
      if (session && visible) {
        const v = session.view(), lever = v.controls.find(c => c.keyboard === 'vertical');
        if (lever && !hover && !notebook && held.size) session.control(lever.id,
          (v.input[lever.id] ?? lever.initial ?? lever.min) + ((held.has('ArrowUp') ? 1 : 0) - (held.has('ArrowDown') ? 1 : 0)) * Math.min(dt, .1) * (lever.rate ?? .5));
        if (!lever || hover || notebook) held.clear();
        if (!hover && !notebook) session.tick(dt);
        const view = session.view(); entry.hooks.sound?.(view, app.audio);
        if (hover) { view.animation = hover.animation; view.time = (now - hover.startedAt) / 1000; }
        room()?.lesson?.(view, hover ? entryForWord(hover.id) : entry); paint();
      } else if (hover && visible) {
        room()?.lesson?.({animation: hover.animation, time: (now - hover.startedAt) / 1000, input: {}}, entryForWord(hover.id));
      }
      const idea = !hover && !notebook && !feedback ? session?.view().keyIdea : null;
      if (idea) card.innerHTML = `<b>Key idea</b><p>${escape(idea)}</p>`;
      const active = challengeActive?.active?.() === true;
      card.hidden = !on() || !(idea || active);
      if (challengeActive?.done?.() === true) challengeActive = null;
    },
    close,
    dispose() { close(); doc.removeEventListener('keydown', leverKey); doc.removeEventListener('keyup', leverKey); doc.defaultView.removeEventListener('blur', clearHeld); section.removeEventListener('click', click); section.removeEventListener('pointerover', point); section.removeEventListener('focusin', point); panel.remove(); card.remove(); notebookButton.remove(); },
  };
}
