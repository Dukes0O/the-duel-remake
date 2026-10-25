// The Lab screen (docs/LAB.md sections 2 to 4): a lesson board, a bench for each lesson with its dials, Run button and
// readout, Brian's lines with a caption strip, the workshop challenges, the shop, and the G-force lap's strip in races.
// Drawing and buttons only. The rules are src/lab/lab-model.js, lab-save.js and lab-shop.js; every change to the player's
// save goes through app.labCommit, and nothing here touches a race or a flight except the one call that starts a flight.
import {boardRows, openBench, setControl, runBench, goalMet, readoutRows, challengeState, passIn, buyIn, ringIn, cableIn,
  shopRows, choiceRows, lessonName, lineId, lineText, CHALLENGE_KIND} from './lab-model.js';
import {headerMarkup, boardMarkup, benchMarkup, shopMarkup, captionMarkup, gforceStripMarkup, restoreOfferMarkup, restoreRunMarkup, restoreSaltText, restoreWeeksText} from './lab-markup.js';
import {restoreOffer, restoreSirena, stageAt, RESTORE_SECONDS} from './restore.js';
import {checkProtections} from './lab-workshop.js';
import {labOf} from './lab-save.js';
import {LAB_LINES} from './lab-lines.js';
import {createSceneKeeper, createLabScene} from './lab-scene.js';

const CAPTION_MIN_SECONDS = 4;
const defaultManifest = () => fetch('/assets/models/lab/manifest.json').then(response => {
  if (!response.ok) throw new Error('The Lab manifest is unavailable');
  return response.json();
});

// Brian's voice, one line at a time: a new line cuts the old one. Lines load when first asked for.
function createLineVoice(app) {
  const loading = new Map();
  let ticket = 0, current = null;
  const ready = id => {
    const audio = app.audio;
    if (!audio?.context || !LAB_LINES[id]) return Promise.resolve(false);
    if (audio.cueBuffers?.[id]) return Promise.resolve(true);
    if (!loading.has(id)) {
      loading.set(id, fetch(`/assets/audio/voices/${LAB_LINES[id].file}`)
        .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error('Brian is not here')))
        .then(bytes => audio.context.decodeAudioData(bytes))
        .then(buffer => { audio.cueBuffers[id] = buffer; return true; })
        .catch(() => false)
        .finally(() => loading.delete(id)));
    }
    return loading.get(id);
  };
  return {
    // Resolves to the line's length in seconds when it played (0 when there is no sound).
    say(id) {
      const mine = ++ticket;
      current?.stop?.();
      current = null;
      return ready(id).then(ok => {
        if (!ok || mine !== ticket || app.audio.muted) return 0;
        try { current = app.audio._playCue(id); } catch { return 0; }
        return app.audio.cueBuffers[id]?.duration ?? 0;
      });
    },
    stop() { ticket++; current?.stop?.(); current = null; },
  };
}

export function createLabUi({host, app, sceneFactory = createLabScene, loadManifest = defaultManifest}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const section = doc.createElement('section');
  section.className = 'lab-panel';
  section.hidden = true;
  section.setAttribute('role', 'dialog');
  section.setAttribute('aria-modal', 'true');
  section.setAttribute('aria-labelledby', 'lab-title');
  section.innerHTML = '<div class="lab-top"></div><div class="lab-main"><div class="lab-stage"><div class="lab-caption" aria-live="polite"></div></div><div class="lab-side"></div></div>';
  const strip = doc.createElement('div');
  strip.className = 'lab-gforce-strip';
  strip.hidden = true;
  host.append(section, strip);
  const top = section.querySelector('.lab-top'), stage = section.querySelector('.lab-stage');
  const captionEl = section.querySelector('.lab-caption'), side = section.querySelector('.lab-side');
  const voice = createLineVoice(app);

  let shown = false, disposed = false;
  let ui = freshState(), caption = null, lastTop = '', lastSide = '', lastCaption = '', lastStrip = '';

  function freshState() { return {tab: 'lessons', bench: null, message: '', protect: null, explained: false, restore: null}; }
  const flags = () => app._switches();
  const profile = () => app.profile ?? {};
  const now = () => (win?.performance ?? performance).now() / 1000;

  // ---- Brian ----
  function say(lessonId, step) {
    const id = lineId(lessonId, step), text = lineText(lessonId, step);
    if (!text) return;
    caption = {text, until: now() + Math.max(CAPTION_MIN_SECONDS, text.length / 13)};
    voice.say(id).then(seconds => { if (seconds > 0 && caption?.text === text) caption.until = now() + seconds + 1.5; });
    paintCaption();
  }
  function paintCaption() {
    const html = caption && caption.until > now() ? captionMarkup(caption.text) : '';
    if (html !== lastCaption) { captionEl.innerHTML = html; lastCaption = html; }
    captionEl.hidden = html === '';
  }
  function bing(id) {
    const audio = app.audio;
    if (!audio?.context || audio.muted) return;
    try { audio._playCue(id); } catch { /* a sound that is not there is not a fault */ }
  }

  // ---- what the side panel shows ----
  const challengeFor = () => {
    const bench = ui.bench;
    return challengeState(bench.lessonId, {profile: profile(), flags: flags(), met: goalMet(bench), helicopterOn: flags().enabled('helicopter') === true && app.heliAvailable?.() === true});
  };
  // LAB-RESTORE: the sequence in hand, as the stage object the room and the panel are drawn from.
  const restoreView = () => {
    const run = ui.restore, seconds = Math.min(RESTORE_SECONDS, Math.max(0, now() - run.startedAt));
    return {...stageAt(seconds), first: run.first, skippable: !run.first};
  };
  function sideMarkup() {
    if (ui.restore) return restoreRunMarkup(restoreView());
    if (ui.tab === 'shop') {
      return shopMarkup({rows: shopRows(profile(), flags()), choices: choiceRows(profile()), wallet: profile().credits, message: ui.message});
    }
    if (ui.bench) {
      const bench = ui.bench;
      return benchMarkup({lessonId: bench.lessonId, name: lessonName(bench.lessonId), controls: bench.bench.controls, settings: bench.settings,
        readout: bench.result ? readoutRows(bench.lessonId, bench.result) : [], challenge: challengeFor(),
        protect: ui.protect, hasRun: bench.result !== null, explained: ui.explained, message: ui.message,
        restore: bench.lessonId === 'rust' ? restoreOfferMarkup(restoreOffer(profile(), flags())) : ''});
    }
    return boardMarkup({rows: boardRows(profile(), flags()), message: ui.message});
  }
  function render() {
    const topHtml = headerMarkup({credits: profile().credits, tab: ui.tab});
    if (topHtml !== lastTop) { top.innerHTML = topHtml; lastTop = topHtml; }
    const sideHtml = sideMarkup();
    if (sideHtml !== lastSide) {
      const key = focusKey();
      side.innerHTML = sideHtml;
      lastSide = sideHtml;
      restoreFocus(key);
    }
    keeper.scene?.show(ui.tab === 'lessons' && ui.bench ? ui.bench.lessonId : null, ui.bench?.result ?? null);
    keeper.scene?.restore(ui.restore ? restoreView() : null);
  }
  const focusKey = () => {
    const el = doc.activeElement;
    if (!el || !side.contains(el)) return null;
    for (const attr of ['data-lab', 'data-lab-lesson', 'data-lab-buy', 'data-lab-control', 'data-lab-protect', 'data-lab-ring', 'data-lab-cable'])
      if (el.hasAttribute(attr)) return `[${attr}="${el.getAttribute(attr)}"]`;
    return null;
  };
  const restoreFocus = key => { if (key) side.querySelector(key)?.focus({preventScroll: true}); };

  // ---- the experiments ----
  function openLesson(id) {
    const bench = openBench(id);
    if (!bench) return;
    ui = {...ui, tab: 'lessons', bench, message: '', protect: null, explained: false};
    say(id, 'intro');
    render();
  }
  function backToBoard() {
    if (ui.restore) endRestore();
    ui = {...ui, bench: null, message: '', protect: null};
    voice.stop(); caption = null; paintCaption();
    render();
  }
  function run() {
    if (!ui.bench) return;
    ui.bench = runBench(ui.bench);
    ui.message = '';
    const cue = ui.bench.result.cue ?? ui.bench.bench.cues[0];
    if (cue) bing(cue);
    if (!ui.explained) { ui.explained = true; say(ui.bench.lessonId, 'explain'); }
    maybePass();
    render();
  }
  // A bench challenge passes the moment its goal is met (launch and strength); the others wait for their button.
  function maybePass() {
    const id = ui.bench.lessonId;
    if (CHALLENGE_KIND[id] !== 'bench' || !goalMet(ui.bench) || labOf(profile()).done[id] === true) return;
    commitPass(id);
  }
  function commitPass(id) {
    const result = app.labCommit((p, f) => passIn(p, id, f));
    if (result.ok) {
      ui.message = `${lessonName(id)} passed. Check the shop for what it opens.`;
      bing('interface.bonus');
      say(id, 'pass');
    } else ui.message = result.reason;
    return result;
  }
  function takeChallenge() {
    if (!ui.bench) return;
    const id = ui.bench.lessonId, kind = CHALLENGE_KIND[id], state = challengeFor();
    if (state.state !== 'ready') return;
    if (kind === 'protect') {
      ui.protect = ui.protect ?? {picks: {underbody: 'bare', exhaust: 'bare', armour: 'bare'}, result: null};
      render();
    } else if (kind === 'fly') {
      app.closeLab();
      if (!app.visitHeli()) { app.openLab(); ui.message = 'The helicopter could not start.'; render(); return; }
      const started = app.heliSession.startChallenge(id);
      app._heliEvents(app.heliSession.takeEvents());
      if (!started.ok) app.heliChallengeNote = started.reason;
    } else if (kind === 'lap') {
      app.labLap.arm();
      app.closeLab();
    } else if (kind === 'ski') {
      ui.message = 'At the ski drop, choose the slalom run and your wax. Passing it passes this lesson.';
      render();
    }
  }
  // ---- the Sirena's restoration (LAB-RESTORE) ----
  // The 2,500 and the car go in one saved step at the start, so closing the Lab mid-sequence loses neither.
  function startRestore() {
    const result = app.labCommit((p, f) => restoreSirena(p, {flags: f}));
    if (!result.ok) { ui.message = result.reason; render(); return; }
    ui = {...ui, message: '', restore: {first: true, startedAt: now(), done: false, index: 0}};
    bing('lab.fizz');
    say('restore', 'start');
    render();
  }
  function watchAgain() {
    if (restoreOffer(profile(), flags()).state !== 'again') return;
    ui = {...ui, message: '', restore: {first: false, startedAt: now(), done: false, index: 0}};
    bing('lab.fizz');
    render();
  }
  function endRestore() {
    ui = {...ui, restore: null};
    keeper.scene?.restore(null);
    render();
  }
  function tickRestore() {
    const run = ui.restore;
    if (!run) return;
    const view = restoreView();
    keeper.scene?.restore(view);
    if (view.done && !run.done) {
      run.done = true;
      if (run.first) say('restore', 'done');
      lastSide = ''; render();
      return;
    }
    if (view.index !== run.index) { run.index = view.index; if (view.stage === 'current') bing('lab.fizz'); lastSide = ''; render(); return; }
    // The readouts change in place, so a press on a button is never lost to a rebuild.
    const set = (id, text) => { const el = side.querySelector(id); if (el && el.textContent !== text) el.textContent = text; };
    set('#lab-restore-salt', restoreSaltText(view)); set('#lab-restore-weeks', restoreWeeksText(view));
    const bar = side.querySelector('#lab-restore-bar');
    if (bar) bar.style.width = `${Math.round(view.overall * 100)}%`;
  }
  function checkProtect() {
    if (!ui.protect) return;
    const verdict = checkProtections(ui.protect.picks);
    ui.protect = {...ui.protect, result: verdict};
    if (verdict.passed) commitPass('rust');
    else ui.message = 'Not yet: the red rows say what rusts.';
    render();
  }

  // ---- the shop ----
  function buy(id) {
    const result = app.labCommit((p, f) => buyIn(p, id, f));
    ui.message = result.ok ? `Bought ${shopRows(profile(), flags()).find(item => item.id === id)?.name ?? id}.` : result.reason;
    if (result.ok) bing('interface.bonus');
    render();
  }

  // ---- buttons ----
  function onClick(event) {
    const target = event.target.closest?.('[data-lab],[data-lab-tab],[data-lab-lesson],[data-lab-buy],[data-lab-ring],[data-lab-cable]');
    if (!target || !section.contains(target)) return;
    const d = target.dataset;
    if (d.labTab) { if (ui.restore) endRestore(); ui = {...ui, tab: d.labTab, message: ''}; if (d.labTab === 'lessons' && ui.bench === null) caption = null; render(); return; }
    if (d.labLesson) { openLesson(d.labLesson.replace(/^start:/, '')); return; }
    if (d.labBuy) { buy(d.labBuy); return; }
    if (d.labRing !== undefined) {
      const result = app.labCommit((p, f) => ringIn(p, Number(d.labRing), f));
      ui.message = result.ok ? '' : result.reason; render(); return;
    }
    if (d.labCable !== undefined) {
      const result = app.labCommit((p, f) => cableIn(p, Number(d.labCable), f));
      ui.message = result.ok ? '' : result.reason; render(); return;
    }
    switch (d.lab) {
      case 'close': app.closeLab(); break;
      case 'back': backToBoard(); break;
      case 'run': run(); break;
      case 'again': if (ui.bench) { ui.explained = true; say(ui.bench.lessonId, 'explain'); render(); } break;
      case 'challenge': takeChallenge(); break;
      case 'protect-check': checkProtect(); break;
      case 'restore': startRestore(); break;
      case 'restore-again': watchAgain(); break;
      case 'restore-skip': if (ui.restore && !ui.restore.first) ui.restore.startedAt = now() - RESTORE_SECONDS; break;
      case 'restore-close': endRestore(); break;
      default: break;
    }
  }
  // Dials: the number beside a slider follows it as it moves; the setting is kept when it is let go.
  function onInput(event) {
    const el = event.target;
    if (!ui.bench || el.dataset.labControl === undefined) return;
    ui.bench = setControl(ui.bench, el.dataset.labControl, el.value);
    const out = el.parentElement?.querySelector('output');
    const row = ui.bench.bench.controls.find(item => item.id === el.dataset.labControl);
    if (out && row) out.textContent = `${el.value}${row.unit ? ` ${row.unit}` : ''}`;
  }
  function onChange(event) {
    const el = event.target;
    if (el.dataset.labProtect !== undefined && ui.protect) {
      ui.protect = {...ui.protect, picks: {...ui.protect.picks, [el.dataset.labProtect]: el.value}, result: null};
      lastSide = ''; render(); return;
    }
    if (!ui.bench || el.dataset.labControl === undefined) return;
    ui.bench = setControl(ui.bench, el.dataset.labControl, el.value);
  }
  function onKey(event) {
    if (!shown) return;
    // The menu behind the Lab is not reachable by Tab: focus wraps inside the panel.
    if (event.code === 'Tab') {
      const items = [...section.querySelectorAll('button:not(:disabled),select,input')];
      const first = items[0], last = items.at(-1);
      if (!first) return;
      if (!section.contains(doc.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.code !== 'Escape') return;
    event.preventDefault();
    if (ui.restore) { endRestore(); return; } // nothing is lost: the car was made the player's when the sequence began
    if (ui.bench) backToBoard(); else app.closeLab();
  }
  section.addEventListener('click', onClick);
  section.addEventListener('input', onInput);
  section.addEventListener('change', onChange);
  strip.addEventListener('click', event => {
    if (event.target.closest?.('[data-lab="disarm"]')) { app.labLap.disarm(); lastStrip = ''; }
  });

  // ---- the room ----
  const keeper = createSceneKeeper({stage, loadManifest, sceneFactory,
    onRoom: room => { room.show(ui.bench ? ui.bench.lessonId : null, ui.bench?.result ?? null); room.restore(ui.restore ? restoreView() : null); },
    // No 3D room (no graphics, or the models did not load): the board and benches still work.
    onPlain: () => stage.classList.add('lab-stage-plain')});
  const startScene = () => keeper.start();
  function stopScene() {
    keeper.stop();
    stage.classList.remove('lab-stage-plain');
  }

  function onOpen() {
    ui = freshState(); caption = null; lastSide = lastTop = lastCaption = '';
    doc.addEventListener('keydown', onKey);
    render();
    startScene();
    section.querySelector('.lab-close')?.focus({preventScroll: true});
  }
  function onClose() {
    doc.removeEventListener('keydown', onKey);
    voice.stop();
    stopScene();
    caption = null; captionEl.innerHTML = ''; lastCaption = '';
  }

  function updateStrip() {
    const racing = app.duel?.state?.status === 'racing';
    const view = racing ? app.labLap?.view?.() : null;
    let html = '';
    if (view) html = gforceStripMarkup(view);
    else if (app.labLap?.waiting && app.duel?.state?.status === 'menu' && app.labOpen !== true)
      html = '<div class="lab-gforce" role="status"><b>G-FORCE LAP</b><em>Armed: start a race on a course you own, and take three corners at 2 g without leaving the road.</em><button type="button" data-lab="disarm">Cancel</button></div>';
    if (html !== lastStrip) { strip.innerHTML = html; lastStrip = html; }
    strip.hidden = html === '';
  }

  return {
    update() {
      if (disposed) return null;
      const open = app.labOpen === true && app.duel?.state?.status === 'menu';
      if (open !== shown) {
        shown = open;
        section.hidden = !open;
        if (open) onOpen(); else onClose();
      }
      if (open) {
        const wallet = headerMarkup({credits: profile().credits, tab: ui.tab});
        if (wallet !== lastTop) { top.innerHTML = wallet; lastTop = wallet; }
        paintCaption();
        tickRestore();
      }
      updateStrip();
      return open ? {open: true} : null;
    },
    // For tests.
    state: () => ({tab: ui.tab, lesson: ui.bench?.lessonId ?? null, message: ui.message, scene: keeper.scene !== null}),
    dispose() {
      if (disposed) return;
      if (shown) { shown = false; onClose(); }
      disposed = true;
      section.removeEventListener('click', onClick);
      section.removeEventListener('input', onInput);
      section.removeEventListener('change', onChange);
      section.remove();
      strip.remove();
    },
  };
}
