import {arenaTeams} from './arena/arena-event.js';
import {teamTotal} from './arena/warlord-event.js';
import {WARLORDS} from './warlords.js';
import {CARS} from './config.js';
import {arenaVenueAvailable} from './wasteland-access.js';

// Screens for Scrapdome events (docs/SCRAPDOME.md sections 3 and 6). The
// presentation functions are pure so they can be tested without a browser.

const STYLE_LABELS = Object.freeze({rammer: 'RAMMER', gunner: 'GUNNER', brawler: 'BRAWLER', collector: 'COLLECTOR', hunter: 'HUNTER'});
const ORDINALS = ['1ST', '2ND', '3RD', '4TH'];

export function arenaStyleLabel(participant) {
  return STYLE_LABELS[participant?.brain] || '';
}

// Everything the in-fight display needs, from the event state alone.
export function arenaHud(state) {
  const arena = state?.arena;
  if (!arena) return null;
  if (arena.mode === 'ambush-alley') {
    const alley = arena.ambushAlley;
    const living = (state.raids?.zones || []).flatMap(zone => zone.raiders)
      .filter(raider => !raider.knockedDown).length;
    const buggy = state.opponents.some(actor => actor.arenaRole === 'ambush-buggy' &&
      actor.ambushWave === alley.wave && !actor.combatWrecking);
    return {ambush: true, phase: arena.phase, modeLabel: 'AMBUSH ALLEY',
      timeLabel: alley.gapLeftSec > 0 ? 'NEXT WAVE' : 'FORT HEALTH',
      remainingSec: alley.gapLeftSec, fortHealth: Math.ceil(alley.fort.health),
      progress: alley.fort.health / alley.fort.maxHealth,
      place: alley.wave, field: 5, placeText: String(alley.wave),
      leaderText: `SURVIVED ${alley.completedWaves} / 5`,
      scoreText: `WAVE ${alley.wave} / 5`, huntedBy: [], respawnSec: 0,
      enemyText: `${living} RAIDERS${buggy ? ' + BUGGY' : ''}`, rows: []};
  }
  const fuel = arena.mode === 'fuel-run';
  const bounty = arena.mode === 'bounty-hunt';
  const convoy = arena.mode === 'convoy-raid' || arena.format === 'convoy-raid';
  const suddenDeath = arena.phase === 'sudden-death';
  const remainingSec = fuel && suddenDeath ? 0 : Math.max(0, suddenDeath ? arena.suddenDeathLimitSec - arena.suddenDeathSec
    : arena.timeLimitSec - arena.clockSec);
  // Places count sides, so a warlord's two cars are one.
  const ranking = arenaTeams(arena);
  const place = ranking.findIndex(participant => participant.id === 'player') + 1;
  const me = arena.participants.find(participant => participant.id === 'player');
  const hunters = arena.participants.filter(participant => participant.kind === 'cpu' && !participant.decoy && participant.targetId === 'player');
  const leader = ranking[0], net = participant => bounty ? participant.bountyPoints : fuel ? participant.fuelDelivered : arena.mode === 'warlord' ?
    teamTotal(arena, participant, 'wrecks') : participant.wrecks - participant.wrecked;
  const tiedAtTop = ranking.length > 1 && net(ranking[0]) === net(ranking[1]) &&
    (fuel || bounty || arena.mode === 'warlord' || ranking[0].wrecks === ranking[1].wrecks);
  return {
    phase: arena.phase,
    fuel,
    bounty,
    convoy,
    markedId: arena.bountyHunt?.pendingVictimId ? null : arena.bountyHunt?.markedId,
    modeLabel: convoy ? 'CONVOY RAID' : bounty ? 'BOUNTY HUNT · MOST POINTS' : fuel ? 'FUEL RUN · FIRST TO FIVE' : arena.mode === 'warlord' ? 'FIRST TO THREE WRECKS' : 'LAST CAR ROLLING',
    timeLabel: suddenDeath ? fuel ? 'SUDDEN DEATH · NEXT DELIVERY WINS' : 'SUDDEN DEATH · NEXT WRECK WINS' : 'TIME LEFT',
    remainingSec,
    place, field: ranking.length,
    placeText: ORDINALS[place - 1] || String(place),
    leaderText: tiedAtTop ? 'LEVEL AT THE TOP' : leader.id === 'player' ? 'YOU LEAD' : `${leader.name} LEADS`,
    scoreText: convoy ? arena.convoy.chargePlanted ? 'CHARGE PLANTED' : arena.convoy.boardingLeftSec > 0 ?
      `BOARDING WINDOW ${Math.ceil(arena.convoy.boardingLeftSec)} s` : `VALVES ${arena.convoy.valves.filter(hp=>hp===0).length} / 3` :
      bounty ? `POINTS ${me.bountyPoints} · ${arena.bountyHunt.markedId === 'player' && !arena.bountyHunt.pendingVictimId ? 'YOU CARRY THE BOUNTY' : 'HUNT THE BEACON'}` : fuel ? `DELIVERED ${me.fuelDelivered} / 5 · ${me.fuelCanisterId ? 'CARRYING FUEL' : 'FIND FUEL'}` : `WRECKS ${me.wrecks} · WRECKED ${me.wrecked}`,
    huntedBy: hunters.map(participant => participant.name),
    respawnSec: state.combatWrecking ? Math.max(1, Math.ceil(state.combatWreckTimer || 0)) : 0,
    // A warlord's pair is one row: the warlord's name and the pair's totals.
    rows: ranking.map((participant, index) => {
      const pair = arena.mode === 'warlord' && WARLORDS[arena.warlordId]?.team &&
        participant.team === `warlord:${arena.warlordId}`;
      const side = arena.participants.filter(other => !other.decoy &&
        (other.team ?? other.id) === (participant.team ?? participant.id));
      return {
        id: participant.id, name: pair ? WARLORDS[arena.warlordId].name.toUpperCase() : participant.name,
        style: arenaStyleLabel(participant),
        delivered: participant.fuelDelivered, carrying: !!participant.fuelCanisterId,
        points: participant.bountyPoints,
        marked: bounty && arena.bountyHunt.markedId === participant.id && !arena.bountyHunt.pendingVictimId,
        wrecks: pair ? teamTotal(arena, participant, 'wrecks') : participant.wrecks,
        wrecked: pair ? teamTotal(arena, participant, 'wrecked') : participant.wrecked, place: index + 1,
        you: participant.id === 'player',
        hunting: side.some(other => other.kind === 'cpu' && other.targetId === 'player'),
        protected: participant.protectedSec > 0,
      };
    }),
  };
}

// The floating label over a computer car.
export function arenaMarker(state, opponent) {
  const participant = state?.arena?.participants.find(p => p.id === opponent?.arenaId);
  if (!participant) return null;
  return {heading: participant.name, style: arenaStyleLabel(participant),
    marked: state.arena.mode === 'bounty-hunt' && state.arena.bountyHunt.markedId === participant.id &&
      !state.arena.bountyHunt.pendingVictimId,
    hunting: participant.targetId === 'player', protected: participant.protectedSec > 0};
}

export function arenaBoardMarkup(hud, escapeHTML) {
  if (!hud) return '';
  if (hud.ambush) return `<li class="arena-board-head"><span>${escapeHTML(hud.enemyText)}</span></li>`;
  if (hud.bounty) return '<li class="arena-board-head"><b></b><span>DRIVER</span><em></em><strong>MARK</strong><i>POINTS</i></li>' +
    hud.rows.map(row => `<li class="arena-board-row${row.you ? ' is-you' : ''}${row.marked ? ' is-marked' : ''}">` +
      `<b>${row.place}</b><span>${escapeHTML(row.name)}</span><em>${row.hunting ? 'HUNTING YOU' : ''}</em>` +
      `<strong>${row.marked ? '◆' : '—'}</strong><i>${row.points}</i></li>`).join('');
  if (hud.fuel) return '<li class="arena-board-head"><b></b><span>DRIVER</span><em></em><strong>FUEL</strong><i>DELIVERED</i></li>' +
    hud.rows.map(row => `<li class="arena-board-row${row.you ? ' is-you' : ''}${row.hunting ? ' is-hunting' : ''}">` +
      `<b>${row.place}</b><span>${escapeHTML(row.name)}<small>${row.style}</small></span>` +
      `<em>${row.hunting ? 'HUNTING YOU' : ''}</em><strong>${row.carrying ? '●' : '—'}</strong><i>${row.delivered}</i></li>`).join('');
  return '<li class="arena-board-head"><b></b><span>DRIVER</span><em></em><strong>WRECKS</strong><i>WRECKED</i></li>' + hud.rows.map(row => `<li class="arena-board-row${row.you ? ' is-you' : ''}${row.hunting ? ' is-hunting' : ''}${row.protected ? ' is-protected' : ''}">` +
    `<b>${row.place}</b><span>${escapeHTML(row.name)}${row.style ? `<small>${row.style}</small>` : ''}</span>` +
    `<em>${row.hunting ? 'HUNTING YOU' : row.protected ? 'RESPAWNED' : ''}</em>` +
    `<strong>${row.wrecks}</strong><i>${row.wrecked}</i></li>`).join('');
}

// The SCRAPDOME panel inside the yard.
export function arenaYardPanel({opponents = 3, difficulty = 'medium', mode = 'last-car-rolling', venueId = 'scrapdome', profile, featureFlags} = {}) {
  const choice = count => `<button type="button" class="choice${count === opponents ? ' on' : ''}" data-arena-opponents="${count}" aria-pressed="${count === opponents}">${count} ${count === 1 ? 'CAR' : 'CARS'}</button>`;
  const available = profile?.wasteland?.discoveredGate === true && profile.wasteland.rank >= 6 &&
    featureFlags?.enabled('fuel-run') === true;
  const bountyAvailable = profile?.wasteland?.discoveredGate === true && profile.wasteland.rank >= 9 &&
    featureFlags?.enabled('bounty-hunt') === true;
  const ambushAvailable = profile?.wasteland?.discoveredGate === true && profile.wasteland.rank >= 12 &&
    featureFlags?.enabled('ambush-alley') === true;
  const saltAvailable = arenaVenueAvailable(featureFlags, profile, 'salt-flats');
  const convoyAvailable = saltAvailable && profile?.wasteland?.territories?.tollkeeper?.hold > 0 &&
    featureFlags?.enabled('convoy-raid') === true;
  const ambush = ambushAvailable && mode === 'ambush-alley';
  const venues = ambush ? ['pit', ...(saltAvailable ? ['salt-flats'] : [])] : ['scrapdome', 'salt-flats'];
  const selectedVenue = saltAvailable && venueId === 'salt-flats' ? 'salt-flats' : ambush ? 'pit' : 'scrapdome';
  const venueChoice = saltAvailable ? '<div class="segmented" role="group" aria-label="Arena venue">' +
    venues.map(id => `<button type="button" class="choice${id === selectedVenue ? ' on' : ''}" data-arena-venue="${id}" aria-pressed="${id === selectedVenue}">${id === 'salt-flats' ? 'SALT FLATS' : id === 'pit' ? 'THE PIT' : 'SCRAPDOME'}</button>`).join('') + '</div>' : '';
  const enterLabel = selectedVenue === 'salt-flats' ? 'ENTER THE SALT FLATS' : ambush ? 'ENTER THE PIT' : 'ENTER THE SCRAPDOME';
  const fuel = available && mode === 'fuel-run';
  const bounty = bountyAvailable && mode === 'bounty-hunt';
  const convoy = convoyAvailable && mode === 'convoy-raid';
  const selectedMode = convoy ? 'convoy-raid' : ambush ? 'ambush-alley' : bounty ? 'bounty-hunt' : fuel ? 'fuel-run' : 'last-car-rolling';
  const choices = ['last-car-rolling', ...(available ? ['fuel-run'] : []), ...(bountyAvailable ? ['bounty-hunt'] : []),
    ...(ambushAvailable ? ['ambush-alley'] : []), ...(convoyAvailable ? ['convoy-raid'] : [])];
  const modes = choices.length > 1 ? '<div class="segmented" role="group" aria-label="Scrapdome mode">' +
    choices.map(id => `<button type="button" class="choice${selectedMode === id ? ' on' : ''}" data-arena-mode="${id}" aria-pressed="${selectedMode === id}">${id === 'convoy-raid' ? 'CONVOY RAID' : id === 'ambush-alley' ? 'AMBUSH ALLEY' : id === 'fuel-run' ? 'FUEL RUN' : id === 'bounty-hunt' ? 'BOUNTY HUNT' : 'LAST CAR ROLLING'}</button>`).join('') + '</div>' : '';
  if (convoy) return `<div class="yard-home-intro arena-yard">${modes}
    <p class="arena-yard-mode">CONVOY RAID · SALT FLATS · 5:00</p>
    <p class="arena-yard-difficulty">TANKER + TWO ESCORTS · ${String(difficulty).toUpperCase()}</p>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>ENTER THE SALT FLATS</span></button></div>`;
  if (ambush) return `<div class="yard-home-intro arena-yard">${modes}${venueChoice}
    <p class="arena-yard-mode">AMBUSH ALLEY / FIVE WAVES</p>
    <p class="arena-yard-difficulty">Difficulty ${String(difficulty).toUpperCase()}</p>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>${enterLabel}</span></button></div>`;
  if (bounty) return `<div class="yard-home-intro arena-yard">${modes}${venueChoice}
    <p class="arena-yard-mode">BOUNTY HUNT · MOST POINTS · 3:00</p>
    <div class="arena-yard-setup"><span class="field-label">COMPUTER CARS</span>
    <div class="segmented" role="group" aria-label="Number of computer cars">${[1, 2, 3].map(choice).join('')}</div>
    <p class="arena-yard-difficulty">Difficulty ${String(difficulty).toUpperCase()} · change it on the main menu</p></div>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>${enterLabel}</span></button>
    <ul class="arena-yard-rules"><li>Follow the amber beacon and arrow to the marked car.</li>
    <li>Wreck the marked car for 20 points and take its bounty.</li>
    <li>Carry the bounty to earn one point each second. Stay ahead of the hunters.</li>
    <li>Most points at 3:00 wins. A tie means next wreck wins.</li></ul></div>`;
  if (fuel) return `<div class="yard-home-intro arena-yard">${modes}${venueChoice}
    <p class="arena-yard-mode">FUEL RUN · FIRST TO FIVE · 3:00</p>
    <div class="arena-yard-setup"><span class="field-label">COMPUTER CARS</span>
    <div class="segmented" role="group" aria-label="Number of computer cars">${[1, 2, 3].map(choice).join('')}</div>
    <p class="arena-yard-difficulty">Difficulty ${String(difficulty).toUpperCase()} · change it on the main menu</p></div>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>${enterLabel}</span></button>
    <ul class="arena-yard-rules"><li>Drive over fuel on the four yellow pads. Carry one at a time.</li>
    <li>Bring it to your blue depot. First to five deliveries wins.</li>
    <li>A wreck or a heavy hit drops your fuel. Anyone can take it.</li>
    <li>Hold F to leave your car. Carrying fuel slows your walking.</li>
    <li>Most deliveries at 3:00 wins. A tie means next delivery wins.</li></ul></div>`;
  // The choice and the button come first, so nobody has to scroll to play.
  return `<div class="yard-home-intro arena-yard">
    ${modes}${venueChoice}<p class="arena-yard-mode">LAST CAR ROLLING · EVERY CAR FOR ITSELF · 2:30</p>
    <div class="arena-yard-setup"><span class="field-label">COMPUTER CARS</span>
    <div class="segmented" role="group" aria-label="Number of computer cars">${[1, 2, 3].map(choice).join('')}</div>
    <p class="arena-yard-difficulty">Difficulty ${String(difficulty).toUpperCase()} · change it on the main menu</p></div>
    <button type="button" class="start-button arena-start" data-action="arena-start"><span>${enterLabel}</span></button>
    <ul class="arena-yard-rules"><li>Wreck the others. Every wreck you cause is a point.</li>
    <li>Get wrecked and you are back in the fight in four seconds.</li>
    <li>A red HUNTING YOU tag shows who is coming for you.</li>
    <li>Most wrecks when the clock runs out wins. A tie goes to sudden death.</li></ul></div>`;
}

const REASONS = Object.freeze({fuel: 'First to five deliveries.', 'three-wrecks': 'First to three wrecks.', time: 'Decided when the clock ran out.',
  'sudden-death': 'Decided in sudden death.', damage: 'No wreck in sudden death: decided on damage dealt.'});

export function arenaResultsScreen(state, {metric, action, escapeHTML}) {
  const arena = state.arena, result = arena?.result;
  if (!result) return null;
  if (arena.mode === 'ambush-alley') {
    const won = result.winnerId === 'player', waves = arena.ambushAlley.completedWaves;
    return {eyebrow: `AMBUSH ALLEY / ${won ? 'VICTORY' : 'FORT LOST'}`,
      title: won ? 'FORT<br>HELD.' : 'THE FORT<br>FELL.',
      description: result.settlementRetryable ? 'Could not save this result. Retry before leaving.' :
        `${waves} of 5 waves survived.`,
      metrics: metric('WAVES SURVIVED', `${waves} / 5`, true) +
        metric('SCRAP EARNED', `+${result.scrapEarned || 0}`) + metric('HOLD', `${result.hold || 0} / 100`),
      extra: '', actions: (result.settlementRetryable ? action('RETRY SAVE', 'warlord-retry-save', true) : '') +
        action('REMATCH', 'arena-rematch', !result.settlementRetryable) +
        action('BACK TO THE YARD', 'arena-yard') + action('MAIN MENU', 'menu')};
  }
  const byId = Object.fromEntries(arena.participants.map(p => [p.id, p]));
  // The first car listed for each side sets that side's place.
  const sideOf = id => byId[id]?.team ?? id;
  const sides = result.placings.filter((id, index) => result.placings.findIndex(other =>
    sideOf(other) === sideOf(id)) === index);
  const place = sides.indexOf('player') + 1, me = byId.player, won = result.winnerId === 'player';
  const winner = byId[result.winnerId];
  const fuel = arena.mode === 'fuel-run';
  const bounty = arena.mode === 'bounty-hunt';
  const convoy = arena.mode === 'convoy-raid';
  const warlord = arena.mode === 'warlord' ? WARLORDS[arena.warlordId] : null;
  const title = warlord?.victoryTitle && won ? escapeHTML(warlord.victoryTitle) : convoy ? won ? 'CONVOY<br>STOPPED.' : 'CONVOY<br>ESCAPED.' : warlord ? won ? 'YOU WIN.' : 'TRY AGAIN.' :
    won ? bounty ? 'BOUNTY<br>CLAIMED.' : fuel ? 'FUEL<br>DELIVERED.' : 'LAST CAR<br>ROLLING.' : place === 2 ? 'SO CLOSE.' : 'BACK TO<br>THE HEAP.';
  let description = convoy ? won ? 'The boarding charge stopped the tanker.' : 'The tanker escaped before you planted the charge.' : warlord
    ? `${won ? `You beat ${escapeHTML(warlord.name)}.` : `${escapeHTML(warlord.name)} won. Losing costs nothing.`} ${REASONS[result.reason] || ''}`
    : bounty ? `${won ? 'You claimed the bounty.' : `${escapeHTML(winner.name)} won the bounty.`} ${REASONS[result.reason] || ''}`
    : fuel ? `${won ? 'You brought home the fuel.' : `${escapeHTML(winner.name)} delivered the most fuel.`} ${REASONS[result.reason] || ''}`
    : `${won ? 'You wrecked them more than they wrecked you.' : `${escapeHTML(winner.name)} took the Scrapdome.`} ${REASONS[result.reason] || ''}`;
  if ((warlord || fuel || bounty || convoy) && result.settlementRetryable) {
    description += ' Could not save this result. Retry before leaving.';
  } else if (warlord && result.settlementSaved && result.kitEarned === 'side-saws') {
    description += ' Side Saws unlocked and equipped on this car. Free on every car you own.';
  } else if (warlord && result.settlementSaved && result.weaponEarned) {
    description += ` ${escapeHTML(warlord.reward)} earned. Equip it in the Armory.`;
  } else if (warlord && result.settlementSaved && result.kitEarned === 'warlord') {
    description += ' Warlord kit fitted to your Titan Monster, and Tusk joins your crew when his gear is ready.';
  } else if (warlord && result.settlementSaved && result.gearEarned === 'grapple-reach') {
    description += " Jax's grapple will reach 10 m farther once he joins your crew.";
  }
  if (warlord && result.settlementSaved && typeof result.rewardReason === 'string') {
    description += ' ' + escapeHTML(result.rewardReason);
  }
  if (warlord && result.settlementSaved && result.titleEarned) {
    description += ' ' + escapeHTML(result.titleEarned) + '. ' + escapeHTML(warlord.reward) + ' earned.';
  }
  const metrics = metric('PLACE', `${ORDINALS[place - 1]} / ${arenaTeams(arena).length}`, true) +
    (bounty ? metric('BOUNTY POINTS', me.bountyPoints) : fuel ? metric('FUEL DELIVERED', me.fuelDelivered) : '') + metric('WRECKS', me.wrecks) + metric('WRECKED', me.wrecked) + metric('DAMAGE DEALT', Math.round(me.damageDealt)) +
    (warlord && !Number.isSafeInteger(result.scrapEarned) ? '' :
      metric('SCRAP EARNED', `+${Number.isSafeInteger(result.scrapEarned) ? result.scrapEarned : 0}`) +
      metric('HOLD', `${Number.isSafeInteger(result.hold) ? result.hold : 0} / 100`));
  const table = `<ol class="arena-results"><li class="arena-results-head"><b></b><span>DRIVER</span><strong>${bounty ? 'BOUNTY POINTS' : fuel ? 'FUEL DELIVERED' : 'WRECKS / WRECKED'}</strong></li>${result.placings.map((id, index) => {
    const p = byId[id];
    return `<li class="${id === 'player' ? 'is-you' : ''}"><b>${ORDINALS[index]}</b><span>${escapeHTML(p.name)}${arenaStyleLabel(p) ? ` · ${arenaStyleLabel(p)}` : ''}</span><strong>${bounty ? p.bountyPoints : fuel ? p.fuelDelivered : `${p.wrecks} / ${p.wrecked}`}</strong></li>`;
  }).join('')}</ol>`;
  return {eyebrow: `SCRAPDOME / ${convoy ? 'CONVOY RAID' : warlord ? escapeHTML(warlord.name.toUpperCase()) : bounty ? 'BOUNTY HUNT' : fuel ? 'FUEL RUN' : 'LAST CAR ROLLING'} / ${won ? 'VICTORY' : ORDINALS[place - 1]}`, title, description,
    metrics, extra: table,
    actions: ((warlord || fuel || bounty || convoy) && result.settlementRetryable ? action('RETRY SAVE', 'warlord-retry-save', true) : '') +
      action('REMATCH', 'arena-rematch', !result.settlementRetryable) +
      action('BACK TO THE YARD', 'arena-yard') + action('MAIN MENU', 'menu')};
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

// The clock and cars stay frozen while the player reads this card.
export function warlordIntroScreen(state, {metric, action, escapeHTML}) {
  const arena = state.arena;
  const warlord = arena?.mode === 'warlord' ? WARLORDS[arena.warlordId] : null;
  if (!warlord || state.status !== 'warlord_intro') return null;
  return {
    eyebrow: `${arena.venueId === 'salt-flats' ? 'SALT FLATS' : arena.venueId === 'pit' ? 'THE PIT' : 'SCRAPDOME'} / WARLORD DUEL`,
    title: escapeHTML(warlord.name.toUpperCase()),
    description: escapeHTML(warlord.taunt),
    metrics: metric('CAR', escapeHTML((warlord.vehicleName || CARS[warlord.car].name).toUpperCase()), true) +
      metric('WIN', arena.format === 'convoy-raid' ? 'BOARDING CHARGE' : 'FIRST TO THREE WRECKS') +
      metric('TIME', arena.format === 'convoy-raid' ? '5:00' : '4:00 + SUDDEN DEATH'),
    extra: '',
    actions: action('BEGIN FIGHT', 'warlord-begin', true) +
      action('BACK TO THE YARD', 'arena-yard'),
  };
}
