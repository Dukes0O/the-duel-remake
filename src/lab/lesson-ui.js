import {labNotebookOf, learnLabWord} from './lab-save.js';
import {sentenceMarkup, LEFT_WHOLE} from './word-links.js';
import './lesson-ui.css';
import {CLASSROOM_LESSONS} from './classroom/classroom-lessons.js';
import {createClassroomUi} from './classroom/classroom-ui.js';

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const button = (action, text) => `<button type="button" data-teach="${action}">${escape(text)}</button>`;

// Opens the classrooms, the notebook and the word meanings. Uses app.labCommit for notebook writes; challenge rewards stay in the existing game.
export function createLessonUi({section, stage, host, app, onBack, onChallenge, sayVoice, onPause, onCue}) {
  const doc = section.ownerDocument;
  const panel = doc.createElement('section'); panel.className = 'lab-teaching'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Lesson'); stage.append(panel);
  const card = doc.createElement('aside'); card.className = 'lab-key-idea'; card.hidden = true; host.append(card);
  const notebookButton = doc.createElement('button'); notebookButton.className = 'lab-notebook-button'; notebookButton.textContent = 'Notebook'; notebookButton.hidden = true; stage.append(notebookButton);
  let classroom = null, last = '', hover = null, notebook = false, challengeActive = null, wasPaused = false;
  const flags = () => app._switches();
  const on = () => flags().enabled('lab-2') === true;
  const learned = () => labNotebookOf(app.profile);
  // The classroom lessons carry their own notebook words.
  const allWords = Object.values(CLASSROOM_LESSONS).flatMap(l => l.words ?? []);
  const knownWords = () => allWords.filter(w => learned().includes(w.id));
  const lookup = id => knownWords().find(w => w.id === id);
  function paint() {
    const pause = Boolean(hover || notebook || classroom);
    if (pause !== wasPaused) { wasPaused = pause; onPause?.(); }
    panel.hidden = !notebook && !hover;
    section.classList.toggle('lab-has-lesson', pause);
    let html = '';
    if (hover) html = `<h3><u class="lab-word">${escape(hover.word)}</u></h3><p>${escape(hover.meaning)}</p>${button('meaning-close', 'Back')}`;
    else if (notebook) html = `<h3>My Lab notebook</h3><div class="lab-notebook-words">${knownWords().map(w => `<button type="button" class="lab-word" data-word="${w.id}">${escape(w.word)}</button>`).join('') || '<p>New words will go here as you learn.</p>'}</div>${button('notebook-close', 'Close notebook')}`;
    if (html !== last) {
      const focus = doc.activeElement?.getAttribute('data-teach');
      panel.innerHTML = html; last = html;
      if (focus) [...panel.querySelectorAll('[data-teach]')].find(el => el.dataset.teach === focus)?.focus({preventScroll: true});
    }
  }
  function openMeaning(id) {
    const w = lookup(id); if (!w || hover?.id === id) return;
    hover = w; paint();
  }
  const point = event => { const el = event.target.closest?.('[data-word]'); if (on() && el && section.contains(el)) openMeaning(el.dataset.word); };
  function click(event) {
    if (!on()) return;
    const word = event.target.closest?.('[data-word]'); if (word) { openMeaning(word.dataset.word); return; }
    const action = event.target.closest?.('[data-teach]')?.dataset.teach;
    if (!action) return;
    const [kind] = action.split(':');
    onCue?.('lab.tick');
    if (kind === 'meaning-close') { hover = null; paint(); return; }
    if (kind === 'notebook-close') { notebook = false; paint(); return; }
  }
  function close() {
    classroom?.dispose(); classroom = null; hover = null; notebook = false; last = ''; panel.hidden = true; section.classList.remove('lab-has-lesson');
    // Leaving a lesson un-pauses the walk at once, so a later pause is seen as a change.
    if (wasPaused) { wasPaused = false; onPause?.(); }
  }
  notebookButton.onclick = () => { notebook = !notebook; hover = null; paint(); };
  section.addEventListener('click', click); section.addEventListener('pointerover', point); section.addEventListener('focusin', point);
  // Underline learned words in all Lab prose, including Brian and the shop.
  function decorate() {
    if (!on()) return;
    for (const el of section.querySelectorAll('.lab-side,.lab-caption')) {
      const walker = doc.createTreeWalker(el, 4), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (node.parentElement.closest(LEFT_WHOLE)) continue;
        const html = sentenceMarkup(node.textContent, knownWords(), !node.parentElement.closest('button'));
        if (html === escape(node.textContent)) continue;
        const span = doc.createElement('span'); span.innerHTML = html; node.replaceWith(span);
      }
    }
  }
  return {
    open(id) {
      // LAB-CLASSROOM: a rebuilt lesson opens as a classroom while its switch is on.
      const lesson = CLASSROOM_LESSONS[id];
      if (on() && lesson && flags().enabled('lab-classroom') === true) {
        close();
        classroom = createClassroomUi({stage, app, lesson, name: lesson.name, onCue, sayVoice,
          onLeave: () => { close(); onBack(); },
          startChallenge: () => {
            const started = onChallenge(id, {challenging: false, attempts: []});
            // A bench-kind challenge ('inline') passes on the lesson's own machine runs (Fuel's races), through the
            // bench's own goal; a lesson that has none sends the player to the machine.
            if (started === 'inline') {
              if (!lesson.benchAttempts) return {ok: false, reason: 'This challenge runs on the bench. Leave the lesson and use the machine.'};
              const passed = onChallenge(id, {challenging: true, attempts: lesson.benchAttempts(classroom.view())});
              if (!passed?.ok) return {ok: false, reason: passed?.reason};
              // The classroom stays open so Brian can say what the pass opened; leaving keeps the board's message.
              return {ok: true, passed: lesson.passSay ?? `${lesson.name} passed.`};
            }
            if (!started?.active) return {ok: false, reason: started?.reason};
            challengeActive = started;
            card.innerHTML = `<b>${escape(lesson.challengeCard.title)}</b><p>${escape(lesson.challengeCard.text)}</p>`;
            close(); return {ok: true};
          }});
        paint(); return true;
      }
      return false;
    },
    active: () => Boolean(classroom || hover || notebook),
    decorate,
    tick(visible) {
      notebookButton.hidden = !visible || !on() || Boolean(classroom);
      classroom?.tick(visible);
      const active = !hover && !notebook && challengeActive?.active?.() === true;
      card.hidden = !on() || !active;
      if (challengeActive?.done?.() === true) challengeActive = null;
    },
    close,
    dispose() { close(); section.removeEventListener('click', click); section.removeEventListener('pointerover', point); section.removeEventListener('focusin', point); panel.remove(); card.remove(); notebookButton.remove(); },
  };
}
