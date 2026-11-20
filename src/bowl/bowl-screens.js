// Show Night's screens (BOWL-HOOKS): the night picker, the HUD with the crowd
// meter and Big Mo's caption, the card between events and the night's results.
// They read the app and state.bowlNight and never change race state; buttons
// call the app's Show Night methods.
import {SHOW_NIGHTS} from './bowl-show.js';
import {bowlHudView, crushRowName} from './bowl-night.js';
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_RESULTS as WORDS, BOWL_TURN_LINES} from './bowl-lines.js';
import {createTurnScreens} from './bowl-turns-screens.js'; // BOWL-TURNS: the Turn Show
import {BOWL_RIVALS} from './bowl-rivals.js';
import './bowl-screens.css';

const LEVELS = [['easy', 'EASY'], ['medium', 'MEDIUM'], ['hard', 'HARD']];
const button = (label, action, extra = '', primary = false) =>
  `<button type="button" class="${primary ? 'primary-action' : 'secondary-action'}" data-action="${action}"${extra}>${label}</button>`;
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function createBowlScreens({app, ui, escapeHTML}) {
  let pickerFrom = null, level = null, hudElement = null, hudKey = '';
  const turns = createTurnScreens({app, escapeHTML});
  const say = text => `<p>${escapeHTML(text)}</p>`;
  // A card shows Big Mo's line for what just happened, whatever he is still saying aloud.
  const moLine = id => BIG_MO[id] ? `<p class="bowl-mo">${escapeHTML(BIG_MO[id])}</p>` : '';
  const night = () => app.duel.state.bowlNight ?? null;

  function picker() {
    const choices = app.showNightChoices?.();
    if (!choices) return '';
    level ??= choices.level;
    const rows = choices.nights.map(entry => {
      const line = entry.state === 'won' ? WORDS.pickNightWon(entry.night) : entry.state === 'open' ? WORDS.pickNightOpen(entry.night)
        : entry.state === 'locked' ? WORDS.pickNightLocked(entry.night) : WORDS.pickNightLater;
      const start = ['open', 'won'].includes(entry.state)
        ? button(WORDS.pickStart(entry.night), 'show-night-start', ` data-night="${entry.night}"`, entry.state === 'open') : '';
      return `<li class="bowl-night-row" data-night-state="${entry.state}"><b>NIGHT ${entry.night}</b>${say(line)}${start}</li>`;
    }).join('');
    const levels = LEVELS.map(([id, label]) =>
      `<button type="button" class="choice${id === level ? ' on' : ''}" data-action="show-night-level" data-level="${id}" aria-pressed="${id === level}">${label}</button>`).join('');
    return `<section class="bowl-panel" role="dialog" aria-modal="true" aria-labelledby="bowl-title"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.pickTitle}</h2></header>${say(WORDS.pickIntro)}${say(choices.lent ? WORDS.pickTruckLent : WORDS.pickTruckOwned)}<div class="segmented" role="group" aria-label="How hard the show is">${levels}</div><ol class="bowl-nights">${rows}</ol>${choices.message ? `<p class="bowl-message" role="status">${escapeHTML(choices.message)}</p>` : ''}${say(BOWL_TURN_LINES.pickerNote)}<footer>${button(BOWL_TURN_LINES.pickerButton, 'show-turns-open')}${button(WORDS.closeButton, 'show-night-close')}</footer></section>`;
  }

  function leaveButtons() {
    const run = app.showNightRun?.();
    return (run?.from === 'yard' ? button(WORDS.yardButton, 'show-night-leave', ' data-to="yard"') : '') +
      button(WORDS.menuButton, 'show-night-leave', ' data-to="menu"');
  }

  function eventCard(state) {
    const show = state.bowlNight, result = show.lastResult, name = BOWL_EVENT_NAMES[result.event] ?? result.event;
    const next = BOWL_EVENT_NAMES[SHOW_NIGHTS[show.night - 1].events[show.show.eventIndex]];
    const lines = [result.event === 'sideBySide' ? WORDS.eventRace(result.won, BOWL_RIVALS[result.rival]?.name)
      : result.event === 'lastTruckRolling' ? WORDS.eventKnockouts(result) // BOWL-RIVALS
        : result.event === 'carCrush' ? WORDS.eventRows(result.rows > 0 ? crushRowName(app.duel.course, result.rows - 1) : null) : null,
      WORDS.eventScore(result.score), result.won ? WORDS.eventNext(next) : WORDS.eventRetry(name)].filter(Boolean);

    if (result.event === 'scrapasaurus') lines.unshift(...WORDS.eventRex(result)); // BOWL-REX-FIGHT
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="${result.won ? 'won' : 'lost'}"><header><p class="eyebrow">NIGHT ${show.night} · ${escapeHTML(name.toUpperCase())}</p><h2 id="bowl-title">${result.won ? WORDS.eventWonTitle : WORDS.eventLostTitle}</h2></header>${moLine(`event.${result.won ? 'won' : 'lost'}.${result.event}`)}${lines.map(say).join('')}<footer>${button(result.won ? WORDS.nextButton : WORDS.retryButton, 'show-night-next', '', true)}${button(WORDS.leaveButton, 'show-night-leave', ` data-to="${app.showNightRun?.()?.from === 'yard' ? 'yard' : 'menu'}"`)}</footer>${say(WORDS.leaveNote)}</section>`;
  }

  function nightCard(state) {
    const result = state.bowlNight.result, settled = app.showNightRun?.()?.settled, last = state.bowlNight.lastResult;
    // The night ends on its last event, so its results also say how that event ended (BOWL-RIVALS).
    const lines = [...(last?.event === 'lastTruckRolling' ? [WORDS.eventKnockouts(last)]
      : last?.event === 'sideBySide' ? [WORDS.eventRace(true, BOWL_RIVALS[last.rival]?.name)] : []), WORDS.nightTotal(result.score)];
    if (settled?.purse > 0) lines.push(WORDS.nightPurse(settled.purse));
    else if (settled?.alreadyPaid) lines.push(WORDS.nightPurseAlready);
    if (settled?.purse > 0 && settled.saved === false) lines.push(WORDS.nightPurseUnsaved);
    for (const event of settled?.bests || []) lines.push(WORDS.nightBest(BOWL_EVENT_NAMES[event] ?? event));
    if (result.lent) lines.push(WORDS.nightTruckBack);

    if (result.events.some(entry => entry.event === 'scrapasaurus')) lines.push(WORDS.eventRexYard); // BOWL-REX-FIGHT
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="night"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.nightTitle(result.night)}</h2></header>${moLine('night.won')}<ul class="bowl-scores">${result.events.map(entry => `<li><span>${escapeHTML(BOWL_EVENT_NAMES[entry.event] ?? entry.event)}</span><b>${entry.score.toLocaleString()}</b></li>`).join('')}</ul>${lines.map(say).join('')}<footer>${button(WORDS.pickButton, 'show-night-pick', '', true)}${leaveButtons()}</footer></section>`;
  }

  return {
    // The parts of the screen that change what the modal layer shows.
    key(state) {
      const show = night();
      return `${pickerFrom ?? ''}:${level ?? ''}:${show?.phase ?? ''}:${show?.attempts.length ?? ''}:${app.showNightRun?.()?.settled ? 'paid' : ''}:${state.status === 'bowl_break'}:${turns.key(state)}`;
    },
    modal(state, {yardActive = false} = {}) {
      // BOWL-TURNS: a Turn Show, or its setup, has its own screens.
      const turn = turns.modal(state, {yardActive});
      if (turn) { pickerFrom = null; return turn; }
      if (state.bowlNight?.turn || app.turnShowView?.()) return null;
      if (state.bowlNight && state.status === 'bowl_break')
        return state.bowlNight.phase === 'complete' ? nightCard(state) : eventCard(state);
      if (pickerFrom && (state.status === 'menu' || yardActive)) return picker();
      if (pickerFrom && state.status !== 'menu' && !yardActive) pickerFrom = null;
      return null;
    },
    // The race HUD's Show Night part, drawn every frame from the state.
    hud(state) {
      const view = ['countdown', 'racing'].includes(state.status) && !state.paused ? bowlHudView(state, app.duel.course) : null;
      ui.stage.classList.toggle('bowl-night-active', !!state.bowlNight && state.status !== 'menu');
      if (!hudElement) {
        hudElement = document.createElement('section');
        hudElement.className = 'bowl-hud'; hudElement.setAttribute('aria-label', 'Show Night');
        hudElement.innerHTML = '<p class="bowl-hud-event"></p><p class="bowl-hud-goal"></p><div class="bowl-hud-numbers"><span class="bowl-hud-score"></span><span class="bowl-hud-clock"></span></div><label class="bowl-hud-crowd">CROWD <meter min="0" max="100" value="0"></meter></label><p class="bowl-hud-mo" role="status"></p>';
        ui.stage.append(hudElement);
      }
      hudElement.hidden = !view;
      if (!view) return;
      const key = [view.driver, view.eventNumber, view.name, view.goal, view.score, view.target, view.timeLeft == null ? '' : Math.ceil(view.timeLeft), view.crowd, view.caption].join('|');
      if (key === hudKey) return;
      hudKey = key;
      hudElement.querySelector('.bowl-hud-event').textContent = `${view.driver ? `${BOWL_TURN_LINES.hudDriver(view.driver)} · ` : ''}EVENT ${view.eventNumber} OF ${view.eventCount} · ${view.name.toUpperCase()}`;
      hudElement.querySelector('.bowl-hud-goal').textContent = view.goal;
      hudElement.querySelector('.bowl-hud-score').textContent = `${view.score.toLocaleString()} POINTS`;
      hudElement.querySelector('.bowl-hud-clock').textContent = view.timeLeft == null ? '' : clock(Math.ceil(view.timeLeft));
      hudElement.querySelector('meter').value = view.crowd;
      hudElement.querySelector('.bowl-hud-mo').textContent = view.caption ? `BIG MO: ${view.caption}` : '';
    },
    // A Show Night button. Returns true when it was one.
    handle(target) {
      const action = target.dataset.action;
      if (action === 'show-turns-open') { pickerFrom = null; turns.open(); return true; }
      if (turns.handle(target)) return true;
      if (!action?.startsWith('show-night-')) return false;
      if (action === 'show-night-open') { pickerFrom = target.dataset.from === 'yard' ? 'yard' : 'menu'; level = null; app.clearShowNightMessage?.(); }
      else if (action === 'show-night-close') pickerFrom = null;
      else if (action === 'show-night-level') level = target.dataset.level;
      else if (action === 'show-night-start') {
        if (app.startShowNight?.(Number(target.dataset.night), {from: pickerFrom ?? 'menu', cpuDifficulty: level})) pickerFrom = null;
      } else if (action === 'show-night-next') app.continueShowNight?.();
      else if (action === 'show-night-leave') { pickerFrom = null; app.leaveShowNight?.(target.dataset.to); }
      else if (action === 'show-night-pick') {
        const from = app.showNightRun?.()?.from ?? 'menu';
        app.leaveShowNight?.(from);
        pickerFrom = from; level = null;
      }
      return true;
    },
  };
}
