// The Lab screen (docs/LAB.md sections 2 to 4): a lesson board, a bench for each lesson with its dials, Run button and
// readout, Brian's lines with a caption strip, the workshop challenges, the shop, and the G-force lap's strip in races.
// Drawing and buttons only. The rules are src/lab/lab-model.js, lab-save.js and lab-shop.js; every change to the player's
// save goes through app.labCommit, and nothing here touches a race or a flight except the one call that starts a flight.
import {boardRows, openBench, setControl, runBench, goalMet, readoutRows, challengeState, passIn, buyIn, ringIn, cableIn,
  shopRows, choiceRows, lessonName, lineId, lineText, CHALLENGE_KIND, challengeKindOf} from './lab-model.js';
import {headerMarkup, boardMarkup, benchMarkup, shopMarkup, captionMarkup, gforceStripMarkup, restoreOfferMarkup, restoreRunMarkup, restoreSaltText, restoreWeeksText} from './lab-markup.js';
import {restoreOffer, restoreSirena, restoreStageAt, RUNNING_SECONDS, BODY_SECONDS} from './restore.js';
import {getPaintState} from '../paint-presets.js';
import {checkProtections} from './lab-workshop.js';
import {labOf} from './lab-save.js';
import {LAB_LINES} from './lab-lines.js';
import {createSceneKeeper, createLabScene} from './lab-scene.js';
// LAB-FAN-VIEW: secret pages; all saved transitions still go through labCommit.
import {fanView, fanEntry, fanMarkup, fanLoad, tunnelLesson, createFanSound} from './fan-view.js';
import {markReverse, buildFan} from './lab-fan.js';
import {doorBoardMarkup} from './lab-walk-room.js';
import {LAB_UPGRADES} from './lab-shop.js';
import {TUNE_SETTING_OF} from './lab-lessons.js';
import './lab-walk.css';
import {createLessonUi} from './lesson-ui.js';

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
  const fanSound = createFanSound(app); // LAB-FAN-VIEW

  let shown = false, disposed = false;
  let ui = freshState(), caption = null, lastTop = '', lastSide = '', lastCaption = '', lastStrip = '';

  function freshState() { return {tab: 'lessons', bench: null, message: '', protect: null, explained: false, restore: null, walkPanel: null, lastMachine: 'lift',
    fanPage: false, fanSetting: 0, fanStarted: null, fanLine: -1}; }
  const flags = () => app._switches();
  const profile = () => app.profile ?? {};
  const now = () => (win?.performance ?? performance).now() / 1000;
  const walking = () => flags().enabled('lab-2') === true;
  const walkRows = () => boardRows(profile(), flags()).map(row => ({...row,
    reward: (row.id === 'rust' ? 'Restore the Sirena, ' : '') + (LAB_UPGRADES.filter(u => u.lesson === row.id).map(u => u.name).join(', ') ||
      (TUNE_SETTING_OF[row.id] ? `${TUNE_SETTING_OF[row.id]} tuning` : 'the next discovery')),
  }));
  const escapeWalk = text => String(text).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  function useWalk(target) {
    if (target.kind === 'machine' && target.ids.length === 1) {
      const row = walkRows().find(r => r.id === target.ids[0]);
      if (row?.open) { openLesson(row.id); return; }
    }
    ui.walkPanel = target;
    render();
    side.querySelector('button')?.focus({preventScroll: true});
  }
  const walkPaused = () => Boolean(teaching.active() || ui.bench || ui.walkPanel || ui.restore || ui.fanPage || ui.tab !== 'lessons');
  const walkBack = '<button type="button" data-lab="walk-back">Back to walking</button>';
  function walkPanelMarkup() {
    const panel = ui.walkPanel, rows = walkRows();
    if (panel.kind === 'board') return walkBack + doorBoardMarkup(rows);
    if (panel.kind === 'brian') {
      const lesson = rows.find(r => r.id === panel.id), next = rows.find(r => r.open && !r.done);
      const answer = panel.answer === 'next' ? (next ? `Try ${next.name}. It opens ${next.reward}.` : 'You have passed every open lesson. Check the door board for what opens next.') :
        panel.answer === 'machine' ? lineText(panel.id, 'intro') : '';
      return `${walkBack}<section class="lab-brian"><h3>Ask Brian</h3><p>Beside ${escapeWalk(lesson?.name ?? 'the Lift bench')}.</p>` +
        '<button type="button" data-lab="brian-next">What should I try next?</button><button type="button" data-lab="brian-machine">Tell me about this machine.</button>' +
        `${answer ? `<p role="status">${escapeWalk(answer)}</p>` : ''}</section>`;
    }
    return `${walkBack}<section class="lab-machine-choice"><h3>${panel.ids.length > 1 ? 'Wind tunnel' : 'This machine'}</h3>${rows.filter(r => panel.ids.includes(r.id)).map(r =>
      `<p>${escapeWalk(r.name)}${r.done ? ' ✓' : ''}</p>${r.open ? `<button type="button" data-lab-lesson="start:${r.id}">Use the ${escapeWalk(r.name)} bench</button>` : `<p>${escapeWalk(r.note)}</p>`}`).join('')}</section>`;
  }

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
    return challengeState(bench.lessonId, {profile: profile(), flags: flags(), met: ui.lessonReady === true || goalMet(bench), helicopterOn: flags().enabled('helicopter') === true && app.heliAvailable?.() === true});
  };
  // LAB-RESTORE: the sequence in hand, as the stage object the room and the panel are drawn from.
  const restoreView = () => {
    const run = ui.restore, seconds = Math.min(run.kind === 'body' ? BODY_SECONDS : RUNNING_SECONDS, Math.max(0, now() - run.startedAt));
    return {...restoreStageAt(seconds, run.kind), first: run.first, skippable: !run.first, unsaved: app.profileSaved === false};
  };
  function sideMarkup() {
    if (walking() && ui.walkPanel) return walkPanelMarkup();
    if (ui.restore) return restoreRunMarkup(restoreView());
    // LAB-FAN-VIEW
    if (ui.fanPage) return fanMarkup(fanView(profile(), flags()), ui.fanSetting, ui.message);
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
    section.classList.toggle('lab-walking', walking());
    section.classList.toggle('lab-walk-panel', walking() && walkPaused());
    fanSound.bench(ui.fanPage ? ui.fanSetting : null); // LAB-FAN-VIEW
    const topHtml = headerMarkup({credits: profile().credits, tab: ui.tab});
    if (topHtml !== lastTop) { top.innerHTML = topHtml; lastTop = topHtml; }
    const sideHtml = sideMarkup() + (ui.restore || ui.fanPage || ui.tab !== 'lessons' ? '' : fanEntry(fanView(profile(), flags()), ui.bench?.lessonId, ui.fanStarted === null ? null : now() - ui.fanStarted));
    if (sideHtml !== lastSide) {
      const key = focusKey();
      side.innerHTML = sideHtml;
      lastSide = sideHtml;
      restoreFocus(key);
    }
    keeper.scene?.show(ui.tab === 'lessons' && ui.bench ? ui.bench.lessonId : null, ui.bench?.result ?? null);
    keeper.scene?.walk?.({rows: walkRows(), paused: walkPaused(), last: ui.lastMachine});
    keeper.scene?.restore(ui.restore ? restoreView() : null);
    // LAB-FAN-VIEW: only drawing state enters the room.
    keeper.scene?.fan?.({...fanView(profile(), flags()), page: ui.fanPage, setting: ui.fanSetting, tunnel: tunnelLesson(ui.bench?.lessonId),
      elapsed: ui.fanStarted === null ? null : now() - ui.fanStarted});
    teaching.decorate();
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
    if (walking() && !walkRows().find(r => r.id === id)?.open) return;
    if (walking() && teaching.open(id)) {
      ui = {...ui, bench: null, walkPanel: null, tab: 'lessons', lastMachine: id};
      voice.stop(); caption = null; paintCaption(); render(); return;
    }
    const bench = openBench(id);
    if (!bench) return;
    ui = {...ui, tab: 'lessons', bench, lessonReady: false, message: '', protect: null, explained: false, fanPage: false, walkPanel: null, lastMachine: id};
    say(id, 'intro');
    render();
    if (walking()) side.querySelector('button')?.focus({preventScroll: true});
  }
  function backToBoard() {
    teaching.close();
    if (ui.restore) endRestore();
    ui = {...ui, bench: null, message: '', protect: null, walkPanel: null};
    voice.stop(); caption = null; paintCaption();
    render();
    if (walking()) keeper.scene?.canvas.focus({preventScroll: true});
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
    if (challengeKindOf(id, flags()) !== 'bench' || !goalMet(ui.bench) || labOf(profile()).done[id] === true) return;
    commitPass(id);
  }
  function commitPass(id) {
    const result = app.labCommit((p, f) => passIn(p, id, f));
    if (result.ok) {
      // LAB-TUNE-VIEW: a wind-tunnel lesson opens a tuning setting, not a shop item.
      ui.message = CHALLENGE_KIND[id] === 'tuning' ? `${lessonName(id)} passed. Its setting is open on the Tune page in the garage.`
        : `${lessonName(id)} passed. Check the shop for what it opens.`;
      bing('interface.bonus');
      say(id, 'pass');
    } else ui.message = result.reason;
    return result;
  }
  function takeChallenge() {
    if (!ui.bench) return;
    const id = ui.bench.lessonId, kind = challengeKindOf(id, flags()), state = challengeFor();
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
  // New lessons enter the same existing challenge path only after their checks.
  const teaching = createLessonUi({section, stage, host, app, room: () => keeper.scene,
    onBack: backToBoard, onPause: render, onCue: bing, sayVoice: id => { if (id) voice.say(id); },
    onChallenge: (id, lesson) => {
      let bench = openBench(id);
      if (!bench) return false;
      // Completion of a teaching sequence is not a passed lesson or a reward.
      ui.bench = bench;
      ui.lessonReady = true;
      const state = challengeFor();
      if (state.state !== 'ready') { ui.bench = null; ui.lessonReady = false; return {reason: state.note}; }
      if (state.kind === 'bench') {
        ui.bench = null; ui.lessonReady = false;
        if (!lesson.challenging) return 'inline';
        // Bind lesson machine controls to the existing bench rules. No teaching
        // evaluator can grant a reward without that bench's real goal passing.
        for (const attempt of lesson.attempts) {
          for (const c of attempt.controls) if (Object.hasOwn(attempt.input, c.id)) bench = setControl(bench, c.setting ?? c.id, attempt.input[c.id]);
          bench = runBench(bench);
        }
        if (!goalMet(bench)) return {ok: false, reason: 'The machine has not reached its goal. Try another run.'};
        return commitPass(id);
      }
      if (state.kind === 'ski') {
        app.closeLab();
        if (!app.visitHeli()) { app.openLab(); return {reason: 'The helicopter could not start.'}; }
        let seenRun = false;
        const session = app.heliSession;
        const view = () => session?.view?.();
        return {active: () => { const ski = view()?.ski?.run; if (ski?.run === 'slalom') seenRun = true; return ski?.run === 'slalom' && !ski.finished; },
          done: () => app.heliSession !== session || view()?.phase === 'idle' || seenRun && !view()?.ski?.run || labOf(profile()).done[id] === true};
      }
      takeChallenge();
      if (state.kind === 'fly') {
        const session = app.heliSession;
        let seen = false;
        const active = () => { const running = session?.view?.()?.challenge?.id === id; if (running) seen = true; return running; };
        return {active, done: () => app.heliSession !== session || seen && !active() || Boolean(session?.view?.()?.challenge && !active())};
      }
      if (state.kind === 'lap') { const active = () => Boolean(app.labLap?.waiting || app.labLap?.view?.()); return {active, done: () => !active()}; }
      if (state.kind === 'protect') { const active = () => app.labOpen && Boolean(ui.protect) && !ui.protect.result?.passed; return {active, done: () => !active()}; }
      return false;
    }});
  // ---- the Sirena's restoration (LAB-RESTORE) ----
  // The 1,000 and the car go in one saved step at the start, so closing the Lab mid-sequence loses neither.
  function startRestore() {
    if (ui.restore) return;   // a second press while the sequence runs does nothing (and charges nothing)
    const result = app.labCommit((p, f) => restoreSirena(p, {flags: f}));
    if (!result.ok) { ui.message = result.reason; render(); return; }
    ui = {...ui, message: '', restore: {kind: 'running', first: true, startedAt: now(), done: false, index: 0}};
    bing('lab.fizz');
    say('restore', 'start');
    render();
  }
  function watchAgain() {
    if (restoreOffer(profile(), flags()).state !== 'again') return;
    const kind = getPaintState(profile(), 'falcone_sirena', {labEnabled:true, deepEnabled:true}).selected === 'restored-1966' ? 'body' : 'running';
    ui = {...ui, message: '', restore: {kind, first: false, startedAt: now(), done: false, index: kind === 'body' ? 3 : 0}};
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
      if (run.first && run.kind === 'body') say('restore', 'done');
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

  // LAB-FAN-VIEW: no purchase arithmetic or save mutation in the screen.
  function reverseFan() {
    if (!fanView(profile(), flags()).open || fanView(profile(), flags()).reverse) return;
    const result = app.labCommit((p, f) => markReverse(p, {flags: f}));
    ui.message = result.reason;
    if (result.ok) {
      voice.stop(); caption = null;
      ui.fanStarted = now(); ui.fanLine = -1;
      fanSound.reverse();
    }
    render();
  }
  function tickFan() {
    if (ui.fanStarted === null) return;
    const elapsed = now() - ui.fanStarted;
    const scales = side.querySelector('[data-lab-reverse-scales]');
    const scaleText = `${Math.round(1000 + 2000 * Math.max(0, Math.min(1, (elapsed - 1.5) / 1.5))).toLocaleString('en-US')} kg`;
    if (scales && scales.textContent !== scaleText) scales.textContent = scaleText;
    keeper.scene?.fan?.({...fanView(profile(), flags()), page: ui.fanPage, setting: ui.fanSetting, tunnel: tunnelLesson(ui.bench?.lessonId), elapsed});
    if (elapsed < 3 || (caption && caption.until > now())) return;
    const steps = ['reverse', '1970', '1978', '2022'];
    ui.fanLine++;
    if (ui.fanLine === 0) render();
    if (ui.fanLine < steps.length) say('secret', steps[ui.fanLine]);
    else ui.fanStarted = null;
  }

  // ---- buttons ----
  function onClick(event) {
    const target = event.target.closest?.('[data-lab],[data-lab-tab],[data-lab-lesson],[data-lab-buy],[data-lab-ring],[data-lab-cable]');
    if (!target || !section.contains(target)) return;
    const d = target.dataset;
    if (d.labTab) { if (ui.restore) endRestore(); ui = {...ui, tab: d.labTab, message: '', fanPage: false}; if (d.labTab === 'lessons' && ui.bench === null) caption = null; render(); return; }
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
      case 'walk-back': ui.walkPanel = null; render(); keeper.scene?.canvas.focus({preventScroll: true}); break;
      case 'brian-next': ui.walkPanel.answer = 'next'; render(); break;
      case 'brian-machine': ui.walkPanel.answer = 'machine'; say(ui.lastMachine, 'intro'); render(); break;
      // LAB-FAN-VIEW
      case 'fan-reverse': reverseFan(); break;
      case 'fan-blueprint':
        if (fanView(profile(), flags()).reverse) { ui.fanPage = true; ui.message = ''; render(); }
        break;
      case 'fan-back': ui.fanPage = false; render(); break;
      case 'fan-build': {
        const result = app.labCommit((p, f) => buildFan(p, {flags: f}));
        ui.message = result.ok ? 'The Spéirling is yours.' : result.reason;
        if (result.ok) bing('interface.bonus');
        render(); break;
      }
      case 'close': app.closeLab(); break;
      case 'back': backToBoard(); break;
      case 'run': run(); break;
      case 'again': if (ui.bench) { ui.explained = true; say(ui.bench.lessonId, 'explain'); render(); } break;
      case 'challenge': takeChallenge(); break;
      case 'protect-check': checkProtect(); break;
      case 'restore': startRestore(); break;
      case 'restore-again': watchAgain(); break;
      case 'restore-skip': if (ui.restore && !ui.restore.first) ui.restore.startedAt = now() - (ui.restore.kind === 'body' ? BODY_SECONDS : RUNNING_SECONDS); break;
      case 'restore-close': endRestore(); break;
      default: break;
    }
  }
  // Dials: the number beside a slider follows it as it moves; the setting is kept when it is let go.
  function onInput(event) {
    const el = event.target;
    // LAB-FAN-VIEW: a local demonstration, never saved as a car tune.
    if (el.hasAttribute('data-lab-fan-setting') && ui.fanPage) {
      ui.fanSetting = Math.max(0, Math.min(100, Number(el.value) || 0));
      fanSound.bench(ui.fanSetting);
      el.parentElement.querySelector('output').textContent = `${ui.fanSetting}%`;
      side.querySelector('[data-lab-fan-scales]').textContent = `${fanLoad(ui.fanSetting).toLocaleString('en-US')} kg`;
      keeper.scene?.fan?.({...fanView(profile(), flags()), page: true, setting: ui.fanSetting, elapsed: null});
      return;
    }
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
    if (walking()) { app.closeLab(); return; }
    if (ui.restore) { endRestore(); return; } // nothing is lost: the car was made the player's when the sequence began
    if (ui.fanPage) { ui.fanPage = false; render(); return; } // LAB-FAN-VIEW
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
    sceneOptions: () => walking() ? {walking: true, onUse: useWalk, onLessonControl: id => teaching.control(id)} : {},
    onRoom: room => { room.show(ui.bench ? ui.bench.lessonId : null, ui.bench?.result ?? null); room.restore(ui.restore ? restoreView() : null);
      room.walk?.({rows: walkRows(), paused: walkPaused(), last: ui.lastMachine});
      if (walking()) room.canvas.focus({preventScroll: true});
      room.fan?.({...fanView(profile(), flags()), page: ui.fanPage, setting: ui.fanSetting, tunnel: tunnelLesson(ui.bench?.lessonId), elapsed: ui.fanStarted === null ? null : now() - ui.fanStarted}); },
    // No 3D room (no graphics, or the models did not load): the board and benches still work.
    onPlain: () => stage.classList.add('lab-stage-plain')});
  const startScene = () => keeper.start();
  function stopScene() {
    keeper.stop();
    stage.classList.remove('lab-stage-plain');
  }

  function onOpen() {
    ui = freshState();
    if (app._labRestoreBody === true) {
      app._labRestoreBody = false;
      ui.restore = {kind: 'body', first: true, startedAt: now(), done: false, index: 3};
    }
    caption = null; lastSide = lastTop = lastCaption = '';
    doc.addEventListener('keydown', onKey);
    render();
    startScene();
    section.querySelector('.lab-close')?.focus({preventScroll: true});
  }
  function onClose() {
    teaching.close();
    fanSound.stop(); // LAB-FAN-VIEW: late loads and loops cannot outlive the room.
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
        fanSound.bench(ui.fanPage ? ui.fanSetting : null); // Resume after unmuting; one owned loop.
        const wallet = headerMarkup({credits: profile().credits, tab: ui.tab});
        if (wallet !== lastTop) { top.innerHTML = wallet; lastTop = wallet; }
        paintCaption();
        tickRestore();
        tickFan(); // LAB-FAN-VIEW
      }
      updateStrip();
      teaching.tick(open);
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
      teaching.dispose();
    },
  };
}
