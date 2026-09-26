import {arenaRanking} from './arena/arena-event.js';

// Screens for Scrapdome events (docs/SCRAPDOME.md sections 3 and 6). The
// presentation functions are pure so they can be tested without a browser.

const STYLE_LABELS = Object.freeze({rammer: 'RAMMER', gunner: 'GUNNER', brawler: 'BRAWLER'});
const ORDINALS = ['1ST', '2ND', '3RD', '4TH'];

export function arenaStyleLabel(participant) {
  return STYLE_LABELS[participant?.brain] || '';
}

// Everything the in-fight display needs, from the event state alone.
export function arenaHud(state) {
  const arena = state?.arena;
  if (!arena) return null;
  const suddenDeath = arena.phase === 'sudden-death';
  const remainingSec = Math.max(0, suddenDeath ? arena.suddenDeathLimitSec - arena.suddenDeathSec
    : arena.timeLimitSec - arena.clockSec);
  const ranking = arenaRanking(arena);
  const place = ranking.findIndex(participant => participant.id === 'player') + 1;
  const me = arena.participants.find(participant => participant.id === 'player');
  const hunters = arena.participants.filter(participant => participant.kind === 'cpu' && participant.targetId === 'player');
  const leader = ranking[0], net = participant => participant.wrecks - participant.wrecked;
  const tiedAtTop = ranking.length > 1 && net(ranking[0]) === net(ranking[1]) && ranking[0].wrecks === ranking[1].wrecks;
  return {
    phase: arena.phase,
    timeLabel: suddenDeath ? 'SUDDEN DEATH · NEXT WRECK WINS' : 'TIME LEFT',
    remainingSec,
    place, field: arena.participants.length,
    placeText: ORDINALS[place - 1] || String(place),
    leaderText: tiedAtTop ? 'LEVEL AT THE TOP' : leader.id === 'player' ? 'YOU LEAD' : `${leader.name} LEADS`,
    scoreText: `WRECKS ${me.wrecks} · WRECKED ${me.wrecked}`,
    huntedBy: hunters.map(participant => participant.name),
    respawnSec: state.combatWrecking ? Math.max(1, Math.ceil(state.combatWreckTimer || 0)) : 0,
    rows: ranking.map((participant, index) => ({
      id: participant.id, name: participant.name, style: arenaStyleLabel(participant),
      wrecks: participant.wrecks, wrecked: participant.wrecked, place: index + 1,
      you: participant.id === 'player',
      hunting: participant.kind === 'cpu' && participant.targetId === 'player',
      protected: participant.protectedSec > 0,
    })),
  };
}

// The floating label over a computer car.
export function arenaMarker(state, opponent) {
  const participant = state?.arena?.participants.find(p => p.id === opponent?.arenaId);
  if (!participant) return null;
  return {heading: participant.name, style: arenaStyleLabel(participant),
    hunting: participant.targetId === 'player', protected: participant.protectedSec > 0};
}

export function arenaBoardMarkup(hud, escapeHTML) {
  if (!hud) return '';
  return '<li class="arena-board-head"><b></b><span>DRIVER</span><em></em><strong>WRECKS</strong><i>WRECKED</i></li>' + hud.rows.map(row => `<li class="arena-board-row${row.you ? ' is-you' : ''}${row.hunting ? ' is-hunting' : ''}${row.protected ? ' is-protected' : ''}">` +
    `<b>${row.place}</b><span>${escapeHTML(row.name)}${row.style ? `<small>${row.style}</small>` : ''}</span>` +
    `<em>${row.hunting ? 'HUNTING YOU' : row.protected ? 'RESPAWNED' : ''}</em>` +
    `<strong>${row.wrecks}</strong><i>${row.wrecked}</i></li>`).join('');
}

// The SCRAPDOME panel inside the yard.
export function arenaYardPanel({opponents = 3, difficulty = 'medium'} = {}) {
  const choice = count => `<button type="button" class="choice${count === opponents ? ' on' : ''}" data-arena-opponents="${count}" aria-pressed="${count === opponents}">${count} ${count === 1 ? 'CAR' : 'CARS'}</button>`;
  // The choice and the button come first, so nobody has to scroll to play.
  return `<div class="yard-home-intro arena-yard">
    <p class="arena-yard-mode">LAST CAR ROLLING · EVERY CAR FOR ITSELF · 2:30</p>
    <div class="arena-yard-setup"><span class="field-label">COMPUTER CARS</span>
    <div class="segmented" role="group" aria-label="Number of computer cars">${[1, 2, 3].map(choice).join('')}</div>
    <p class="arena-yard-difficulty">Difficulty ${String(difficulty).toUpperCase()} · change it on the main menu</p></div>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>ENTER THE SCRAPDOME</span></button>
    <ul class="arena-yard-rules"><li>Wreck the others. Every wreck you cause is a point.</li>
    <li>Get wrecked and you are back in the fight in four seconds.</li>
    <li>A red HUNTING YOU tag shows who is coming for you.</li>
    <li>Most wrecks when the clock runs out wins. A tie goes to sudden death.</li></ul></div>`;
}

const REASONS = Object.freeze({time: 'Decided when the clock ran out.',
  'sudden-death': 'Decided in sudden death.', damage: 'Still level after sudden death: decided on damage dealt.'});

export function arenaResultsScreen(state, {metric, action, escapeHTML}) {
  const arena = state.arena, result = arena?.result;
  if (!result) return null;
  const byId = Object.fromEntries(arena.participants.map(p => [p.id, p]));
  const place = result.placings.indexOf('player') + 1, me = byId.player, won = result.winnerId === 'player';
  const winner = byId[result.winnerId];
  const title = won ? 'LAST CAR<br>ROLLING.' : place === 2 ? 'SO CLOSE.' : 'BACK TO<br>THE HEAP.';
  const description = `${won ? 'You wrecked them more than they wrecked you.' : `${escapeHTML(winner.name)} took the Scrapdome.`} ${REASONS[result.reason] || ''}`;
  const metrics = metric('PLACE', `${ORDINALS[place - 1]} / ${arena.participants.length}`, true) +
    metric('WRECKS', me.wrecks) + metric('WRECKED', me.wrecked) + metric('DAMAGE DEALT', Math.round(me.damageDealt));
  const table = `<ol class="arena-results"><li class="arena-results-head"><b></b><span>DRIVER</span><strong>WRECKS / WRECKED</strong></li>${result.placings.map((id, index) => {
    const p = byId[id];
    return `<li class="${id === 'player' ? 'is-you' : ''}"><b>${ORDINALS[index]}</b><span>${escapeHTML(p.name)}${arenaStyleLabel(p) ? ` · ${arenaStyleLabel(p)}` : ''}</span><strong>${p.wrecks} / ${p.wrecked}</strong></li>`;
  }).join('')}</ol>`;
  return {eyebrow: `SCRAPDOME / LAST CAR ROLLING / ${won ? 'VICTORY' : ORDINALS[place - 1]}`, title, description,
    metrics, extra: table,
    actions: action('REMATCH', 'arena-rematch', true) + action('BACK TO THE YARD', 'arena-yard') + action('MAIN MENU', 'menu')};
}

export function arenaPauseScreen(state, {metric, action, time}) {
  const hud = arenaHud(state);
  if (!hud) return null;
  return {eyebrow: 'SCRAPDOME / PAUSED', title: 'FIGHT<br>ON HOLD.',
    description: 'The clock is paused. Pick up where you left off.',
    metrics: metric(hud.phase === 'sudden-death' ? 'SUDDEN DEATH' : 'TIME LEFT', time(hud.remainingSec), true) +
      metric('PLACE', `${hud.placeText} / ${hud.field}`) + metric('SCORE', hud.scoreText.replace(' · ', ' / ')),
    extra: '', actions: action('BACK TO THE FIGHT', 'resume', true) + action('REMATCH', 'arena-rematch') + action('BACK TO THE YARD', 'arena-yard')};
}
