// The Turn Show (BOWL-TURNS; docs/WASTELAND_WORLD.md section 7): two to four
// named players share one keyboard and take one go each at every event of a
// Show Night, event by event, in the order they were picked. Only one player
// drives at a time: every go starts from a "pass the keyboard" screen that
// waits for that player's key press.
//
// Pure data and rules: no DOM, no storage, no race state. The app keeps the
// show between goes, runs each go as a one-event Show Night (bowl-night.js,
// `turn: true`), and settles each go into the driver's own profile only.
import {BOWL_EVENTS, SHOW_NIGHTS} from './bowl-show.js';
import {BOWL_PURSE, SAVE_EVENT_IDS, bowlNightPlayable, settleShowNight} from './bowl-night.js';
import {recordBowlScore} from './bowl-save.js';

export const TURN_SHOW_RULES = Object.freeze({minPlayers: 2, maxPlayers: 4});
const LEVELS = ['easy', 'medium', 'hard'];
const PHASES = ['handoff', 'driving', 'result', 'complete'];

const wonNights = profile => new Set((Array.isArray(profile?.bowl?.nightsWon) ? profile.bowl.nightsWon : [])
  .filter(Number.isSafeInteger));

// A night is open for a player when it is night one, or they have won the night before it (or this one).
export function nightOpenFor(profile, night) {
  const won = wonNights(profile);
  return Number.isSafeInteger(night) && night >= 1 && night <= SHOW_NIGHTS.length &&
    (night === 1 || won.has(night) || won.has(night - 1));
}

// The nights a Turn Show can play for these players: playable, and open for every one of them.
export function turnShowNights(profiles) {
  const list = Array.isArray(profiles) ? profiles : [];
  return SHOW_NIGHTS.map(({night}) => ({night,
    state: !bowlNightPlayable(night) ? 'later' : list.length && list.every(profile => nightOpenFor(profile, night)) ? 'open' : 'locked'}));
}

// Starts a show. players: [{id, name, profile}] in the order they were picked.
// Returns {ok: true, show} or {ok: false, reason}.
export function createTurnShow({night, players, cpuDifficulty = 'medium', hostId = null} = {}) {
  const picked = Array.isArray(players) ? players : [];
  const ids = picked.map(player => player?.id);
  if (picked.length < TURN_SHOW_RULES.minPlayers) return {ok: false, reason: 'tooFew'};
  if (picked.length > TURN_SHOW_RULES.maxPlayers) return {ok: false, reason: 'tooMany'};
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length ||
      picked.some(player => typeof player.name !== 'string' || !player.name.trim())) return {ok: false, reason: 'players'};
  if (!Number.isSafeInteger(night) || !bowlNightPlayable(night)) return {ok: false, reason: 'night'};
  if (!picked.every(player => nightOpenFor(player.profile, night))) return {ok: false, reason: 'locked'};
  return {ok: true, show: Object.freeze({
    version: 1, night, cpuDifficulty: LEVELS.includes(cpuDifficulty) ? cpuDifficulty : 'medium',
    hostId: typeof hostId === 'string' ? hostId : null,
    players: Object.freeze(picked.map(({id, name}) => Object.freeze({id, name: name.trim()}))),
    turn: 0, phase: 'handoff', goes: Object.freeze([]),
  })};
}

const events = show => SHOW_NIGHTS[show.night - 1].events;

// Every go of the night, in order: each event in turn, each player in turn.
export function turnOrder(show) {
  return events(show).flatMap((event, eventIndex) => show.players.map(player =>
    ({eventIndex, event, playerId: player.id, name: player.name})));
}

// The go that is up now, or the one just played while its result is on screen.
export function currentTurn(show) {
  if (!show || !PHASES.includes(show.phase) || show.phase === 'complete') return null;
  const order = turnOrder(show), turn = order[show.turn];
  if (!turn) return null;
  return {...turn, index: show.turn, count: order.length, last: turn.eventIndex === events(show).length - 1,
    next: order[show.turn + 1] ?? null};
}

// The pass-the-keyboard screen has had its key press: the go may start.
export function beginGo(show) {
  if (show?.phase !== 'handoff') return {ok: false, show};
  return {ok: true, show: Object.freeze({...show, phase: 'driving'})};
}

// A finished go. The result must be the go that is up: the same player, event and place in the night.
export function recordGo(show, result) {
  const turn = currentTurn(show);
  if (show?.phase !== 'driving' || !turn || result?.playerId !== turn.playerId || result.event !== turn.event ||
      result.eventIndex !== turn.eventIndex || !Number.isSafeInteger(result.score) || result.score < 0)
    return {ok: false, show};
  const go = Object.freeze({index: turn.index, playerId: turn.playerId, event: turn.event, eventIndex: turn.eventIndex,
    won: result.won === true, score: result.score, lent: result.lent === true,
    ...(turn.event === 'carCrush' && Number.isSafeInteger(result.count) ? {crush: Object.freeze({
      count: result.count, total: result.total, fullHouse: result.fullHouse === true, fullHouseBonus: result.fullHouseBonus,
    })} : {}),
    // BOWL-RIVALS: who the go raced in Side by Side, and how Last Truck Rolling ended.
    rival: result.rival ?? null, knockouts: result.knockouts ?? 0, timeUp: result.timeUp === true, settled: null});
  return {ok: true, go, show: Object.freeze({...show, phase: 'result', goes: Object.freeze([...show.goes, go])})};
}

// Notes what the driver's save made of a go (the purse, new bests, whether it saved), for the screens.
export function noteSettled(show, index, settled) {
  if (!show?.goes[index]) return show;
  const goes = show.goes.map(go => go.index === index ? Object.freeze({...go, settled: Object.freeze({...settled})}) : go);
  return Object.freeze({...show, goes: Object.freeze(goes)});
}

// The result card has been read: hand over to the next player, or end the show.
export function passKeyboard(show) {
  if (show?.phase !== 'result') return {ok: false, show};
  const turn = show.turn + 1;
  return {ok: true, show: Object.freeze({...show, turn,
    phase: turn >= turnOrder(show).length ? 'complete' : 'handoff'})};
}

// The scoreboard for the night: one row per player in picked order, and the
// standing (most events won first, then points). Tied players share a place.
export function turnScoreboard(show) {
  const rows = show.players.map(player => {
    const goes = show.goes.filter(go => go.playerId === player.id);
    const scores = Object.fromEntries(events(show).map(event => {
      const go = goes.find(entry => entry.event === event);
      return [event, go ? {score: go.score, won: go.won} : null];
    }));
    return {id: player.id, name: player.name, scores, wins: goes.filter(go => go.won).length,
      total: goes.reduce((sum, go) => sum + go.score, 0), played: goes.length};
  });
  const better = (a, b) => b.wins - a.wins || b.total - a.total;
  const standing = [...rows].sort(better);
  for (const row of rows) row.place = 1 + rows.filter(other => better(other, row) < 0).length;
  const leaders = standing.filter(row => row.place === 1);
  return {events: [...events(show)], rows, standing, leaders};
}

// A player's whole night, when every event was won on their own goes, in the
// shape settleShowNight takes. Null until then.
export function playerNightResult(show, playerId) {
  const goes = show.goes.filter(go => go.playerId === playerId);
  if (goes.length !== events(show).length || !goes.every(go => go.won)) return null;
  const bests = {};
  for (const go of goes) bests[go.event] = Math.max(bests[go.event] ?? 0, go.score);
  return {night: show.night, won: true, score: goes.reduce((sum, go) => sum + go.score, 0),
    events: goes.map(go => ({event: go.event, score: go.score})), bests,
    purse: BOWL_PURSE[show.night - 1], lent: goes.some(go => go.lent), playerId};
}

// One go into its driver's own profile: the event's best score, and on their
// last go of a night won on every event, the night and its purse (paid once per
// save by bowl-save.js). The profile must be the driver's; nothing else is read.
export function settleTurnGo(profile, show, go, profileId) {
  const none = reason => ({ok: false, changed: false, profile, purse: 0, bests: [], wonNight: false, reason});
  if (!go || !show?.goes.includes(go) || profileId !== go.playerId) return none('notTheirs');
  let next = profile;
  const bests = [];
  const fightFinale = go.event === BOWL_EVENTS.SCRAPASAURUS && events(show)[go.eventIndex] === go.event;
  // The finale counts towards the night. Its trophy serves as the record.
  if (!fightFinale) {
    const recorded = recordBowlScore(next, SAVE_EVENT_IDS[go.event], go.score);
    if (!recorded.ok) return none(recorded.reason);
    if (recorded.changed) bests.push(go.event);
    next = recorded.profile;
  }
  const night = go.eventIndex === events(show).length - 1 ? playerNightResult(show, go.playerId) : null;
  let purse = 0, alreadyPaid = false;
  if (night) {
    const settled = settleShowNight(next, night);
    if (!settled.ok) return none(settled.reason);
    next = settled.profile; purse = settled.purse; alreadyPaid = settled.alreadyPaid === true;
  }
  return {ok: true, changed: next !== profile, profile: next, purse, alreadyPaid, bests, wonNight: !!night};
}
