// Show Night's screens (BOWL-HOOKS): the night picker, the HUD with the crowd
// meter and Big Mo's caption, the card between events and the night's results.
// They read the app and state.bowlNight and never change race state; buttons
// call the app's Show Night methods.
import {SHOW_NIGHTS} from './bowl-show.js';
import {bowlHudView, featuredBowlTricks} from './bowl-night.js';
import {BOWL_SCHOOL_LESSONS} from './bowl-school.js';
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_RESULTS as WORDS, BOWL_TURN_LINES} from './bowl-lines.js';
import {createTurnScreens} from './bowl-turns-screens.js'; // BOWL-TURNS: the Turn Show
import {chooseShowWeapon, SHOW_WEAPONS} from './bowl-weapons.js';
import {WEAPON_PICTURES} from './bowl-weapons-view.js'; // BOWL-WEAPONS-LOOK: the weapons as drawn
import {BOWL_RIVALS} from './bowl-rivals.js';
import {arenaTrickStrip, secretCardMarkup, BOWL_TRICK_GUIDE, bowlOpeningLines, bowlResultReady, bowlStrip, bowlTrickEntryMarkup, createBowlHud, playBowlHudCue} from './bowl-hud.js';
import './bowl-screens.css';

const LEVELS = [['easy', 'EASY'], ['medium', 'MEDIUM'], ['hard', 'HARD']];
const button = (label, action, extra = '', primary = false) =>
  `<button type="button" class="${primary ? 'primary-action' : 'secondary-action'}" data-action="${action}"${extra}>${label}</button>`;
export function createBowlScreens({app, ui, escapeHTML, projectPlayer}) {
  let pickerFrom = null, level = null, openingNight = null, help = null, schoolPanel = null, renderedLesson = null;
  const renderHud = createBowlHud({stage: ui.stage, app, projectPlayer});
  const turns = createTurnScreens({app, escapeHTML, eventGuide});
  const say = text => `<p>${escapeHTML(text)}</p>`;
  // A card shows Big Mo's line for what just happened, whatever he is still saying aloud.
  const moLine = id => BIG_MO[id] ? `<p class="bowl-mo">${escapeHTML(BIG_MO[id])}</p>` : '';
  const night = () => app.duel.state.bowlNight ?? null;
  let fallenEvent=null, firstFallFrame=0;
  function resultReady(show){
    const event=show?.event;
    if(event?.rex?.phase==='fallen'){
      if(fallenEvent!==event){fallenEvent=event;firstFallFrame=performance.now();}
      if(performance.now()-firstFallFrame<10000)return false;
    }else fallenEvent=null;
    return bowlResultReady(show);
  }

  const arenaShow = state => app.duel.course?.def?.tricks && !app.duel.course.def.bowl &&
    app.duel.featureFlags?.enabled('arena-tricks') ? state.arenaTrickShow : null;
  const eventIsRunning = state => !!(state.bowlNight?.event || arenaShow(state)) && ['countdown', 'racing'].includes(state.status);
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
    const show = state.bowlNight ?? arenaShow(state);
    const landed = show.trickKinds;
    return `<section class="bowl-panel bowl-trick-card" role="dialog" aria-modal="true" aria-labelledby="bowl-title">
      <h2 id="bowl-title">Trick card</h2>
      <ul>${BOWL_TRICK_GUIDE.map(entry => `<li>${bowlTrickEntryMarkup(entry, landed.includes(entry.kind))}</li>`).join('')}</ul>
      ${secretCardMarkup(show.foundTricks)}
      <footer>${button(help.resume ? 'Keep driving' : 'Back to pause', 'show-night-tricks-close', '', true)}</footer>
    </section>`;
  }

  function openingCard() {
    const choices = app.showNightChoices?.(), offer = choices?.offerSchool && openingNight === 1;
    const featured = featuredBowlTricks(openingNight);
    const illustrations = featured.flatMap(kind => BOWL_TRICK_GUIDE.filter(entry => entry.kind === kind))
      .map(entry => `<li>${bowlTrickEntryMarkup({...entry, points: ''})}</li>`).join('');
    return `<section class="bowl-panel bowl-opening" role="dialog" aria-modal="true" aria-labelledby="bowl-title">
      <h2 id="bowl-title">Night ${openingNight}</h2>
      ${bowlOpeningLines(openingNight, choices?.lent).map(line => `<p class="bowl-mo">${escapeHTML(line)}</p>`).join('')}
      ${featured.length ? say('These tricks pay double tonight.') : ''}
      ${illustrations ? `<ul>${illustrations}</ul>` : ''}
      ${featured.includes('doubles') ? say('Hold the trick key through the second turn to earn double points.') : ''}
      ${offer ? say('First time here? Come to Trick School first.') : ''}
      <footer>${offer ? button('Trick School', 'show-night-school', '', true) : ''}
        ${button(offer ? 'Not now' : 'Start the night', 'show-night-confirm', '', !offer)}
        ${button('Back to nights', 'show-night-back')}</footer>
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
    return `<section class="bowl-panel" role="dialog" aria-modal="true" aria-labelledby="bowl-title"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.pickTitle}</h2></header>${say(WORDS.pickIntro)}${say(choices.lent ? WORDS.pickTruckLent : WORDS.pickTruckOwned)}<div class="segmented" role="group" aria-label="How hard the show is">${levels}</div><ol class="bowl-nights">${rows}</ol>${choices.message ? `<p class="bowl-message" role="status">${escapeHTML(choices.message)}</p>` : ''}${say(BOWL_TURN_LINES.pickerNote)}<footer>${button('Trick School', 'show-night-school')}${button(BOWL_TURN_LINES.pickerButton, 'show-turns-open')}${button(WORDS.closeButton, 'show-night-close')}</footer></section>`;
  }

  function lessonPanel(state, visible) {
    if (!visible) {
      if (schoolPanel) { schoolPanel.hidden = true; schoolPanel.style.display = 'none'; }
      return;
    }
    if (!schoolPanel) {
      schoolPanel = ui.stage.ownerDocument.createElement('section');
      schoolPanel.className = 'bowl-hud bowl-panel bowl-school-lesson';
      schoolPanel.setAttribute('aria-label', 'Trick School');
      Object.assign(schoolPanel.style, {left: '14px', transform: 'none',
        width: 'min(340px, 47vw)', minWidth: '0', padding: '10px 14px', zIndex: '5'});
      ui.stage.append(schoolPanel);
    }
    schoolPanel.hidden = false;
    schoolPanel.style.display = 'block';
    const show = state.bowlNight, {lesson: kind, schoolReason} = show.event;
    const lesson = BOWL_SCHOOL_LESSONS.find(item => item.kind === kind);
    const guide = BOWL_TRICK_GUIDE.find(entry => entry.kind === kind);
    const done = BOWL_SCHOOL_LESSONS.filter(item => show.school.completed.includes(item.kind))
      .map(item => BOWL_TRICK_GUIDE.find(entry => entry.kind === item.kind).name);
    const why = schoolReason?.until > show.clock ? schoolReason.text : '';
    const key = [kind, done.join(','), why, state.bowlSchoolSavePending].join('|');
    if (renderedLesson === key) return;
    renderedLesson = key;
    const content = lesson && guide
      ? `<div class="bowl-school-move">${bowlTrickEntryMarkup({...guide, points: ''})}</div>${say(lesson.meaning)}${say(lesson.how)}`
      : moLine('school.done');
    schoolPanel.innerHTML = `<b class="bowl-hud-event">TRICK SCHOOL</b>${content}
      ${done.length ? `<small aria-label="Completed lessons">${done.map(name => '✓ ' + escapeHTML(name)).join(' · ')}</small>` : ''}
      ${why ? `<p role="status">${escapeHTML(why)}</p>` : ''}
      ${state.bowlSchoolSavePending ? say('Your lesson progress is waiting to be saved.') : ''}
      <footer>${button('Back to nights', 'show-night-pick')}</footer>`;
  }

  function leaveButtons() {
    const run = app.showNightRun?.();
    return (run?.from === 'yard' ? button(WORDS.yardButton, 'show-night-leave', ' data-to="yard"') : '') +
      button(WORDS.menuButton, 'show-night-leave', ' data-to="menu"');
  }

  function eventGuide(event) {
    if(event!=='scrapasaurus')return '';
    const truck='<path fill="#e2d2aa" d="M8 35h14l4-9h16l8 9h5v8H8z"/><g fill="#252522" stroke="#e2d2aa"><circle cx="18" cy="43" r="5"/><circle cx="44" cy="43" r="5"/></g>';
    const box='<rect x="77" y="21" width="21" height="15" fill="#e8ab38"/><circle cx="88" cy="17" r="5" fill="none" stroke="#ddd5bb" stroke-width="3"/>';
    const pictures=[
      [truck+'<path d="M101 40L57 28l3 21z" fill="#ff832d"/>','Get out of the orange before it breathes fire.'],
      [truck+box+'<path d="M52 32L86 17" stroke="#e8d181" stroke-dasharray="3 2"/>','When it sags, face the glowing box and press F to hook it.'],
      ['<g transform="translate(66 0) scale(-1 1)">'+truck+'</g>'+box+'<path d="M56 35l30-18" stroke="#e8d181" stroke-width="2"/>','Drive away and pull, holding Space when it pulls you back.'],
    ];
    return '<div class="bowl-rex-guide">'+pictures.map(([picture,line])=>
      '<p><svg width="108" height="52" viewBox="0 0 108 52" aria-hidden="true">'+picture+'</svg> '+escapeHTML(line)+'</p>').join('')+'</div>';
  }

  function eventCard(state) {
    const show = state.bowlNight, result = show.lastResult, name = BOWL_EVENT_NAMES[result.event] ?? result.event;
    const next = BOWL_EVENT_NAMES[SHOW_NIGHTS[show.night - 1].events[show.show.eventIndex]];
    const lines = [result.event === 'sideBySide' ? WORDS.eventRace(result.won, BOWL_RIVALS[result.rival]?.name)
      : result.event === 'lastTruckRolling' ? WORDS.eventKnockouts(result) // BOWL-RIVALS
        : result.event === 'carCrush' ? WORDS.eventCrush(result) : null,
      result.fullHouse ? WORDS.eventFullHouse(result.fullHouseBonus) : null, WORDS.eventScore(result.score), result.won ? WORDS.eventNext(next) : WORDS.eventRetry(name)].filter(Boolean);

    if (result.event === 'scrapasaurus') lines.unshift(...WORDS.eventRex(result)); // BOWL-REX-FIGHT
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="${result.won ? 'won' : 'lost'}"><header><p class="eyebrow">NIGHT ${show.night} · ${escapeHTML(name.toUpperCase())}</p><h2 id="bowl-title">${result.won ? WORDS.eventWonTitle : WORDS.eventLostTitle}</h2></header>${moLine(`event.${result.won ? 'won' : 'lost'}.${result.event}`)}${lines.map(say).join('')}${eventGuide(result.won ? SHOW_NIGHTS[show.night-1].events[show.show.eventIndex] : result.event)}<footer>${button(result.won ? WORDS.nextButton : WORDS.retryButton, 'show-night-next', '', true)}${button(WORDS.leaveButton, 'show-night-leave', ` data-to="${app.showNightRun?.()?.from === 'yard' ? 'yard' : 'menu'}"`)}</footer>${say(WORDS.leaveNote)}</section>`;
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
    if (state.bowlNight.secretHint) lines.push('Secret trick hint: ' + state.bowlNight.secretHint);
    if (state.bowlNight.foundTricks?.length === 7) lines.push('You found all seven secret tricks.');
    if (result.lent) lines.push(WORDS.nightTruckBack);

    if (result.events.some(entry => entry.event === 'scrapasaurus')) lines.push(WORDS.eventRexYard); // BOWL-REX-FIGHT
    return `<section class="bowl-panel bowl-result" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="night"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.nightTitle(result.night)}</h2></header>${moLine('night.won')}${moLine(`rex.seen.${result.night}`)}<ul class="bowl-scores">${result.events.map(entry => `<li><span>${escapeHTML(BOWL_EVENT_NAMES[entry.event] ?? entry.event)}</span><b>${entry.score.toLocaleString()}</b></li>`).join('')}</ul>${lines.map(say).join('')}<footer>${button(WORDS.pickButton, 'show-night-pick', '', true)}${leaveButtons()}</footer></section>`;
  }

  return {
    // The parts of the screen that change what the modal layer shows.
    key(state) {
      const show = night();
      return `${state.status}:${pickerFrom ?? ''}:${openingNight ?? ''}:${level ?? ''}:${show?.phase ?? ''}:${show?.attempts.length ?? ''}:${app.showNightRun?.()?.settled ? 'paid' : ''}:${resultReady(show)}:${help?.state === state}:${turns.key(state)}`;
    },
    modal(state, {yardActive = false} = {}) {
      if (state.status === 'bowl_weapon_pick') {
        const picks = state.bowlNight.event.weaponChoices.map(id => {
          const weapon = SHOW_WEAPONS[id];
          return `<li><span aria-hidden="true">${WEAPON_PICTURES[id] ?? weapon.picture}</span> ${button(weapon.name, 'show-night-weapon', ` data-weapon="${id}"`)}${say(weapon.line)}</li>`;
        });
        return `<section class="bowl-panel" role="dialog" aria-modal="true" aria-labelledby="bowl-title"><h2 id="bowl-title">Choose your show weapon</h2><p>Use F in Last Truck Rolling.</p><ul class="bowl-weapon-picks">${picks.join('')}</ul></section>`;
      }
      if (eventIsRunning(state) && state.paused && help?.state === state) return trickCard(state);
      if (state.bowlNight && state.status === 'bowl_break' && !resultReady(state.bowlNight)) return '';
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
      const watchingFinish = state.status === 'bowl_break' && !resultReady(show);
      const course = app.duel.course;
      const view = !state.paused && (eventIsRunning(state) || watchingFinish) ? bowlHudView(state, course) : null;
      const arenaHud = !state.paused && arenaShow(state) && eventIsRunning(state);
      lessonPanel(state, !!show?.school && !!view);
      const strip = arenaHud ? arenaTrickStrip(state) : bowlStrip(state, show?.school ? null : view, id => BOWL_RIVALS[id]?.name);
      if (strip && view?.event === 'lastTruckRolling' && state.bowlWeapon?.kind) {
        const weapon = state.bowlWeapon, warning = state.opponents.find(rival => rival.bowlWeapon?.phase === 'tell');
        const ready = weapon.phase === 'rest' ? ` · ${Math.max(0,weapon.time).toFixed(1)} s` : '';
        strip.gapLabel = warning ? `${BOWL_RIVALS[warning.bowlRival].name}: ${warning.bowlWeapon.kind}!`
          : `F · ${SHOW_WEAPONS[weapon.kind].name}${ready}`;
      }
      renderHud(state, course, strip);
    },
    // A Show Night button. Returns true when it was one.
    handle(target) {
      const action = target.dataset.action;
      if (action === 'show-night-weapon') return chooseShowWeapon(app.duel, target.dataset.weapon);
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
      else if (action === 'show-night-school') {
        if (app.startBowlSchool?.({from: pickerFrom ?? 'menu'})) {
          pickerFrom = null;
          openingNight = null;
        }
      } else if (action === 'show-night-confirm' && openingNight) {
        if (openingNight === 1 && app.showNightChoices?.()?.offerSchool) app.skipBowlSchoolOffer?.();
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
