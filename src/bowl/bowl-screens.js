// Show Night's screens (BOWL-HOOKS): the night picker, the HUD with the crowd
// meter and Big Mo's caption, the card between events and the night's results.
// They read the app and state.bowlNight and never change race state; buttons
// call the app's Show Night methods.
import {SHOW_NIGHTS} from './bowl-show.js';
import {bowlHudView, crushRowName} from './bowl-night.js';
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_RESULTS as WORDS, BOWL_TURN_LINES} from './bowl-lines.js';
import {createTurnScreens} from './bowl-turns-screens.js'; // BOWL-TURNS: the Turn Show
import {BOWL_RIVALS} from './bowl-rivals.js';
import {BOWL_TRICK_GUIDE, bowlOpeningLines, bowlResultReady, bowlStrip, bowlTrickEntryMarkup, createBowlHud, playBowlHudCue} from './bowl-hud.js';
import './bowl-screens.css';

const LEVELS = [['easy', 'EASY'], ['medium', 'MEDIUM'], ['hard', 'HARD']];
const button = (label, action, extra = '', primary = false) =>
  `<button type="button" class="${primary ? 'primary-action' : 'secondary-action'}" data-action="${action}"${extra}>${label}</button>`;
export function createBowlScreens({app, ui, escapeHTML, projectPlayer}) {
  let pickerFrom = null, level = null, openingNight = null, help = null;
  const renderHud = createBowlHud({stage: ui.stage, app, projectPlayer});
  const turns = createTurnScreens({app, escapeHTML});
  const say = text => `<p>${escapeHTML(text)}</p>`;
  // A card shows Big Mo's line for what just happened, whatever he is still saying aloud.
  const moLine = id => BIG_MO[id] ? `<p class="bowl-mo">${escapeHTML(BIG_MO[id])}</p>` : '';
  const night = () => app.duel.state.bowlNight ?? null;

  const eventIsRunning = state => !!state.bowlNight?.event && ['countdown', 'racing'].includes(state.status);
  function closeHelp() {
    const opened = help;
    help = null;
    if (opened?.resume && app.duel.state === opened.state && opened.state.paused) app.togglePause();
  }
  ui.stage.ownerDocument.defaultView.addEventListener('keydown', event => {
    const state = app.duel.state;
    const showing = help?.state === state && state.paused;
    if (!eventIsRunning(state) || event.code !== 'KeyH' && !(event.code === 'Escape' && showing)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (showing) return closeHelp();
    help = {state, resume: !state.paused};
    if (help.resume) app.togglePause();
    playBowlHudCue(app, 'bowl.card.open');
  }, {capture: true, signal: app._inputEvents?.signal});

  function trickCard(state) {
    const landed = state.bowlNight.trickKinds;
    return `<section class="bowl-panel bowl-trick-card" role="dialog" aria-modal="true" aria-labelledby="bowl-title">
      <h2 id="bowl-title">Trick card</h2>
      <ul>${BOWL_TRICK_GUIDE.map(entry => `<li>${bowlTrickEntryMarkup(entry, landed.includes(entry.kind))}</li>`).join('')}</ul>
      <footer>${button(help.resume ? 'Keep driving' : 'Back to pause', 'show-night-tricks-close', '', true)}</footer>
    </section>`;
  }

  function openingCard() {
    const choices = app.showNightChoices?.();
    return `<section class="bowl-panel bowl-opening" role="dialog" aria-modal="true" aria-labelledby="bowl-title">
      <h2 id="bowl-title">Night ${openingNight}</h2>
      ${bowlOpeningLines(openingNight, choices?.lent).map(line => `<p class="bowl-mo">${escapeHTML(line)}</p>`).join('')}
      <footer>${button('Start the night', 'show-night-confirm', '', true)}${button('Back to nights', 'show-night-back')}</footer>
    </section>`;
  }

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

  function rexGuide() {
    const truck='<path fill="#e2d2aa" d="M8 35h14l4-9h16l8 9h5v8H8z"/><g fill="#252522" stroke="#e2d2aa"><circle cx="18" cy="43" r="5"/><circle cx="44" cy="43" r="5"/></g>';
    const box='<rect x="77" y="21" width="21" height="15" fill="#e8ab38"/><circle cx="88" cy="17" r="5" fill="none" stroke="#ddd5bb" stroke-width="3"/>';
    const pictures=[
      [truck+'<path d="M101 40L57 28l3 21z" fill="#ff832d"/>','Get out of the orange before it breathes fire.'],
      [truck+box+'<path d="M52 32L86 17" stroke="#e8d181" stroke-dasharray="3 2"/>','When it sags, face the glowing box and press F to hook it.'],
      ['<g transform="translate(66 0) scale(-1 1)">'+truck+'</g>'+box+'<path d="M56 35l30-18" stroke="#e8d181" stroke-width="2"/>','Drive away and keep pulling until the box comes out.'],
    ];
    return '<div class="bowl-rex-guide">'+pictures.map(([picture,line])=>
      '<p><svg width="108" height="52" viewBox="0 0 108 52" aria-hidden="true">'+picture+'</svg> '+escapeHTML(line)+'</p>').join('')+'</div>';
  }

  function eventCard(state) {
    const show = state.bowlNight, result = show.lastResult, name = BOWL_EVENT_NAMES[result.event] ?? result.event;
    const next = BOWL_EVENT_NAMES[SHOW_NIGHTS[show.night - 1].events[show.show.eventIndex]];
    const lines = [result.event === 'sideBySide' ? WORDS.eventRace(result.won, BOWL_RIVALS[result.rival]?.name)
      : result.event === 'lastTruckRolling' ? WORDS.eventKnockouts(result) // BOWL-RIVALS
        : result.event === 'carCrush' ? WORDS.eventRows(result.rows > 0 ? crushRowName(app.duel.course, result.rows - 1) : null) : null,
      WORDS.eventScore(result.score), result.won ? WORDS.eventNext(next) : WORDS.eventRetry(name)].filter(Boolean);

    if (result.event === 'scrapasaurus') lines.unshift(...WORDS.eventRex(result)); // BOWL-REX-FIGHT
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="${result.won ? 'won' : 'lost'}"><header><p class="eyebrow">NIGHT ${show.night} Â· ${escapeHTML(name.toUpperCase())}</p><h2 id="bowl-title">${result.won ? WORDS.eventWonTitle : WORDS.eventLostTitle}</h2></header>${moLine(`event.${result.won ? 'won' : 'lost'}.${result.event}`)}${lines.map(say).join('')}${(result.won ? SHOW_NIGHTS[show.night-1].events[show.show.eventIndex] : result.event)==='scrapasaurus' ? rexGuide() : ''}<footer>${button(result.won ? WORDS.nextButton : WORDS.retryButton, 'show-night-next', '', true)}${button(WORDS.leaveButton, 'show-night-leave', ` data-to="${app.showNightRun?.()?.from === 'yard' ? 'yard' : 'menu'}"`)}</footer>${say(WORDS.leaveNote)}</section>`;
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
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="night"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.nightTitle(result.night)}</h2></header>${moLine('night.won')}${moLine(`rex.seen.${result.night}`)}<ul class="bowl-scores">${result.events.map(entry => `<li><span>${escapeHTML(BOWL_EVENT_NAMES[entry.event] ?? entry.event)}</span><b>${entry.score.toLocaleString()}</b></li>`).join('')}</ul>${lines.map(say).join('')}<footer>${button(WORDS.pickButton, 'show-night-pick', '', true)}${leaveButtons()}</footer></section>`;
  }

  return {
    // The parts of the screen that change what the modal layer shows.
    key(state) {
      const show = night();
      return `${pickerFrom ?? ''}:${openingNight ?? ''}:${level ?? ''}:${show?.phase ?? ''}:${show?.attempts.length ?? ''}:${app.showNightRun?.()?.settled ? 'paid' : ''}:${bowlResultReady(show)}:${help?.state === state}:${turns.key(state)}`;
    },
    modal(state, {yardActive = false} = {}) {
      if (eventIsRunning(state) && state.paused && help?.state === state) return trickCard(state);
      if (state.bowlNight && state.status === 'bowl_break' && !bowlResultReady(state.bowlNight)) return '';
      // BOWL-TURNS: a Turn Show, or its setup, has its own screens.
      const turn = turns.modal(state, {yardActive});
      if (turn) { pickerFrom = null; return turn; }
      if (state.bowlNight?.turn || app.turnShowView?.()) return null;
      if (state.bowlNight && state.status === 'bowl_break')
        return state.bowlNight.phase === 'complete' ? nightCard(state) : eventCard(state);
      if (pickerFrom && (state.status === 'menu' || yardActive)) return openingNight ? openingCard() : picker();
      if (pickerFrom && state.status !== 'menu' && !yardActive) { pickerFrom = null; openingNight = null; }
      return null;
    },
    // The race HUD's Show Night part, drawn every frame from the state.
    hud(state) {
      const show = state.bowlNight;
      if (help && (help.state !== state || !state.paused)) help = null;
      const active = !!show && state.status !== 'menu';
      ui.stage.classList.toggle('bowl-night-active', active);
      const watchingFinish = state.status === 'bowl_break' && !bowlResultReady(show);
      const course = app.duel.course;
      const view = !state.paused && (eventIsRunning(state) || watchingFinish) ? bowlHudView(state, course) : null;
      renderHud(state, course, bowlStrip(state, view, id => BOWL_RIVALS[id]?.name));
    },
    // A Show Night button. Returns true when it was one.
    handle(target) {
      const action = target.dataset.action;
      if (action === 'show-turns-open') { pickerFrom = null; openingNight = null; turns.open(); return true; }
      if (turns.handle(target)) return true;
      if (!action?.startsWith('show-night-')) return false;
      if (action === 'show-night-open') {
        pickerFrom = target.dataset.from === 'yard' ? 'yard' : 'menu';
        openingNight = level = null;
        app.clearShowNightMessage?.();
      } else if (action === 'show-night-close') { pickerFrom = null; openingNight = null; }
      else if (action === 'show-night-level') level = target.dataset.level;
      else if (action === 'show-night-start') openingNight = Number(target.dataset.night);
      else if (action === 'show-night-back') openingNight = null;
      else if (action === 'show-night-confirm' && openingNight) {
        if (app.startShowNight?.(openingNight, {from: pickerFrom ?? 'menu', cpuDifficulty: level})) {
          pickerFrom = null;
          openingNight = null;
        }
      } else if (action === 'show-night-tricks-close') closeHelp();
      else if (action === 'show-night-next') app.continueShowNight?.();
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
