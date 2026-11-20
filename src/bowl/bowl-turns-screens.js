// The Turn Show's screens (BOWL-TURNS): picking the players and the night, the
// pass-the-keyboard screen, the card after each go and the night's scoreboard.
// They read the app's turnShowView() and state.bowlNight and never change race
// state; buttons call the app's Turn Show methods. Every word is in bowl-lines.js.
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_RESULTS, BOWL_TURN_LINES as WORDS} from './bowl-lines.js';
import {crushRowName} from './bowl-night.js';
import {TURN_SHOW_RULES} from './bowl-turns.js';
import {BOWL_RIVALS} from './bowl-rivals.js'; // BOWL-RIVALS: the rivals' names on the card between goes

const LEVELS = [['easy', 'EASY'], ['medium', 'MEDIUM'], ['hard', 'HARD']];
const button = (label, action, extra = '', primary = false) =>
  `<button type="button" class="${primary ? 'primary-action' : 'secondary-action'}" data-action="${action}"${extra}>${label}</button>`;
const eventName = type => BOWL_EVENT_NAMES[type] ?? type;

export function createTurnScreens({app, escapeHTML, eventGuide}) {
  let setup = null; // {picked: [ids], level} while the setup panel is open
  const say = text => `<p>${escapeHTML(text)}</p>`;
  const nameOf = (view, id) => view.show.players.find(player => player.id === id)?.name ?? '';

  function board(view, {final = false} = {}) {
    const {board: scores} = view;
    const head = `<tr><th scope="col">${WORDS.boardPlayerHeading}</th>${scores.events.map(type =>
      `<th scope="col">${escapeHTML(eventName(type).toUpperCase())}</th>`).join('')}<th scope="col">${WORDS.boardTotalHeading}</th></tr>`;
    const rows = scores.rows.map(row => `<tr data-player="${escapeHTML(row.id)}"${row.place === 1 && row.played ? ' class="bowl-turns-leader"' : ''}><th scope="row">${escapeHTML(row.name)}</th>${scores.events.map(type => {
      const cell = row.scores[type];
      return `<td>${cell ? `${cell.score.toLocaleString()}${cell.won ? ` <b>${WORDS.boardWonHeading}</b>` : ''}` : ''}</td>`;
    }).join('')}<td>${row.total.toLocaleString()}</td></tr>`).join('');
    const played = scores.rows.some(row => row.played);
    let line = '';
    if (played) {
      const leaders = scores.leaders, top = leaders[0];
      line = leaders.length > 1
        ? (final ? WORDS.boardTie(leaders.map(row => row.name)) : WORDS.boardLevel(leaders.map(row => row.name)))
        : (final ? WORDS.boardWinner : WORDS.boardLeading)(top.name, top.wins, top.total);
    }
    return `<table class="bowl-turns-board"><thead>${head}</thead><tbody>${rows}</tbody></table>${line ? say(line) : ''}`;
  }

  function setupPanel() {
    const choices = app.turnShowChoices?.(setup.picked);
    if (!choices) return '';
    setup.picked = choices.picked;
    setup.level ??= choices.level;
    const enough = choices.players.length >= TURN_SHOW_RULES.minPlayers;
    const players = choices.players.map(player => {
      const order = setup.picked.indexOf(player.id);
      return `<button type="button" class="choice${order >= 0 ? ' on' : ''}" data-action="show-turns-player" data-player="${escapeHTML(player.id)}" aria-pressed="${order >= 0}">${order >= 0 ? `<b>${order + 1}</b> ` : ''}${escapeHTML(player.name)}</button>`;
    }).join('');
    const count = setup.picked.length;
    const ready = count >= TURN_SHOW_RULES.minPlayers;
    const nights = choices.nights.map(entry => {
      const line = entry.state === 'later' ? BOWL_RESULTS.pickNightLater : entry.state === 'open' ? WORDS.setupNightOpen(entry.night)
        : WORDS.setupNightLocked(entry.night);
      const start = ready && entry.state === 'open' ? button(WORDS.setupStartButton(entry.night), 'show-turns-start', ` data-night="${entry.night}"`, true) : '';
      return `<li class="bowl-night-row" data-night-state="${entry.state}"><b>NIGHT ${entry.night}</b>${say(line)}${start}</li>`;
    }).join('');
    const levels = LEVELS.map(([id, label]) =>
      `<button type="button" class="choice${id === setup.level ? ' on' : ''}" data-action="show-turns-level" data-level="${id}" aria-pressed="${id === setup.level}">${label}</button>`).join('');
    const status = !enough ? WORDS.setupTooFew : !ready ? WORDS.setupNeedTwo
      : count >= TURN_SHOW_RULES.maxPlayers ? `${WORDS.setupCount(count)} ${WORDS.setupFull}` : WORDS.setupCount(count);
    return `<section class="bowl-panel bowl-turns" role="dialog" aria-modal="true" aria-labelledby="bowl-title"><header><p class="eyebrow">THE BOWL</p><h2 id="bowl-title">${WORDS.setupTitle}</h2></header>${say(WORDS.setupIntro)}${say(WORDS.setupRules)}${say(WORDS.setupPurse)}${enough ? say(WORDS.setupPick) : ''}<div class="bowl-turns-players" role="group" aria-label="Players">${players}</div><p class="bowl-message" role="status">${escapeHTML(status)}</p><div class="segmented" role="group" aria-label="How hard the show is">${levels}</div><ol class="bowl-nights">${nights}</ol><footer>${button(WORDS.backButton, 'show-turns-back')}</footer></section>`;
  }

  function handoff(view) {
    const turn = view.turn;
    return `<section class="bowl-panel bowl-turns bowl-handoff" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-turn-player="${escapeHTML(turn.playerId)}"><header><p class="eyebrow">NIGHT ${view.show.night} · ${escapeHTML(eventName(turn.event).toUpperCase())}</p><h2 id="bowl-title">${escapeHTML(WORDS.handoffTitle(turn.name))}</h2></header>${say(WORDS.handoffEvent(turn.name, eventName(turn.event)))}${say(WORDS.handoffKey)}${board(view)}${eventGuide?.(turn.event) ?? ''}<footer>${button(WORDS.readyButton, 'show-turns-ready', '', true)}${button(WORDS.leaveButton, 'show-turns-leave')}</footer>${say(WORDS.leaveNote)}</section>`;
  }

  function goCard(view, state) {
    const go = view.lastGo, turn = view.turn, name = nameOf(view, go.playerId), event = eventName(go.event);
    const settled = go.settled ?? {};
    const lines = [WORDS.goScore(name, go.score, event), go.won ? WORDS.goWon : WORDS.goLost];
    // The row's name comes from the course's own crush line (bowlLayout), whatever size the Bowl is.
    if (go.event === 'carCrush') lines.push(WORDS.goRows(name, go.rows > 0 ? crushRowName(app.duel.course, go.rows - 1) : null));
    if (go.event === 'sideBySide') lines.push(WORDS.goRace(name, go.won, BOWL_RIVALS[go.rival]?.name)); // BOWL-RIVALS: the rival by name
    if (go.event === 'lastTruckRolling') lines.push(WORDS.goKnockouts(name, go));
    for (const best of settled.bests || []) lines.push(WORDS.goBest(name, eventName(best)));
    if (settled.wonNight) lines.push(WORDS.goNightWon(name, view.show.night));
    if (settled.purse > 0) lines.push(WORDS.goPurse(name, settled.purse));
    else if (settled.alreadyPaid) lines.push(WORDS.goPurseAlready(name));
    if (settled.saved === false || settled.ok === false) lines.push(WORDS.goUnsaved(name));
    lines.push(turn.next ? WORDS.goNext(turn.next.name, eventName(turn.next.event)) : WORDS.goLastNext);
    const moId = go.won ? 'turn.won' : 'turn.lost';
    const caption = BIG_MO[moId] ? `<p class="bowl-mo">${escapeHTML(BIG_MO[moId])}</p>` : '';
    return `<section class="bowl-panel bowl-result bowl-turns" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="${go.won ? 'won' : 'lost'}" data-turn-go="${go.index}"><header><p class="eyebrow">${escapeHTML(name.toUpperCase())} · ${escapeHTML(event.toUpperCase())}</p><h2 id="bowl-title">${go.won ? WORDS.goWonTitle : WORDS.goLostTitle}</h2></header>${caption}${lines.map(say).join('')}${board(view)}<footer>${button(turn.next ? WORDS.passButton : WORDS.scoreboardButton, 'show-turns-pass', '', true)}${button(WORDS.leaveButton, 'show-turns-leave')}</footer>${turn.next ? say(WORDS.leaveNote) : ''}</section>`;
  }

  function scoreboard(view) {
    return `<section class="bowl-panel bowl-result bowl-turns" role="dialog" aria-modal="true" aria-labelledby="bowl-title" data-bowl-result="turns"><header><p class="eyebrow">NIGHT ${view.show.night} · TURN SHOW</p><h2 id="bowl-title">${WORDS.boardTitle}</h2></header>${board(view, {final: true})}<footer>${button(WORDS.closeButton, 'show-turns-leave', '', true)}</footer></section>`;
  }

  return {
    open() { setup = {picked: [], level: null}; },
    key(state) {
      const view = app.turnShowView?.();
      return `${setup ? `setup:${setup.picked.join(',')}:${setup.level ?? ''}` : ''}:${view ? `${view.show.phase}:${view.show.turn}:${view.show.goes.length}:${view.lastGo?.settled ? 'saved' : ''}` : ''}`;
    },
    // The modal for the Turn Show, or null when it has nothing to show.
    modal(state, {yardActive = false} = {}) {
      const view = app.turnShowView?.();
      if (view) {
        setup = null;
        if (state.status === 'menu' && view.show.phase === 'handoff' && view.turn) return handoff(view);
        if (state.status === 'menu' && view.show.phase === 'complete') return scoreboard(view);
        if (state.status === 'bowl_break' && state.bowlNight?.turn && view.show.phase === 'result' && view.lastGo && view.turn) return goCard(view, state);
        return null;
      }
      if (setup && (state.status === 'menu' || yardActive)) return setupPanel();
      if (setup && state.status !== 'menu' && !yardActive) setup = null;
      return null;
    },
    // A Turn Show button. Returns true when it was one.
    handle(target) {
      const action = target.dataset.action;
      if (!action?.startsWith('show-turns-')) return false;
      if (action === 'show-turns-back') setup = null;
      else if (action === 'show-turns-player' && setup) {
        const id = target.dataset.player, at = setup.picked.indexOf(id);
        if (at >= 0) setup.picked.splice(at, 1);
        else if (setup.picked.length < TURN_SHOW_RULES.maxPlayers) setup.picked.push(id);
      } else if (action === 'show-turns-level' && setup) setup.level = target.dataset.level;
      else if (action === 'show-turns-start' && setup) {
        if (app.startTurnShow?.(Number(target.dataset.night), [...setup.picked], {cpuDifficulty: setup.level})) setup = null;
      } else if (action === 'show-turns-ready') app.beginTurn?.();
      else if (action === 'show-turns-pass') app.passTurnKeyboard?.();
      else if (action === 'show-turns-leave') { setup = null; app.leaveTurnShow?.(); }
      return true;
    },
  };
}
