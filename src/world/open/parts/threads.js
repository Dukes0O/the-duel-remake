import {checkThread, requireSound} from '../check-tables.js';
import {isHeld, USUAL_HOLDS} from '../holds.js';
import {resolveRoles} from '../roles.js';
import {prepareThreadMission} from './missions.js';
import {isFound, stageOf} from '../open-record.js';
import {SITES, nameOf} from '../register.js';
import {distanceBetween} from '../../../story/threads/cast.js';
import {applyThreadDirector, directThreads, visitId} from '../../../story/threads/director.js';
import {isFresh, liveSigns, witnessSign} from '../../../story/threads/signs.js';
import {firstBeat, mark, threadMark, threadRule} from '../../../story/threads/thread-rule.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {placeForThread, radioScene} from '../../../story/scenes/burned-camp.js';

export const OPEN_THREADS = requireSound([burnedCamp], checkThread, 'Open Scablands storylines');
const regionId = view => view.regionId ?? view.groundRegion;
const playerPoint = view => view.player?.position ?? view.player;
const trackId = (thread, record) => `thread:${thread.id}/${record.beat}`;

function withPlaces(context) {
  const {world, view = {}} = context;
  return {...context, placeAt: (place, cast) => {
      const point = placeForThread(place, cast, view);
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    allowsCast: (thread, role, id) => thread !== burnedCamp || role !== 'camp' ||
      (!world.ledger.marks.includes(visitId(id, world.ledger.night)) &&
        distanceBetween(playerPoint(view), placeForThread(id, {}, view)) > 40),
    startsEffects: (thread, cast) => thread === burnedCamp ?
      threadRule(thread, context, {cast}).effects(thread.beats.sign.effects.filter(effect => effect.type === 'site')) : [],
  };
}

export function threadsAtBankedHearth(context) {
  return applyThreadDirector(OPEN_THREADS, withPlaces(context), 'hearth');
}

export function openThreadSigns(context) {
  return liveSigns(OPEN_THREADS, withPlaces(context));
}

function localCampVisit({world, view, placeAt}) {
  return SITES.find(({id, kind}) => kind === 'camp' && isFound(world, id) && stageOf(world, id) === 'camp' &&
    !world.ledger.marks.includes(visitId(id, world.ledger.night)) && distanceBetween(playerPoint(view), placeAt(id, {})) <= 40);
}

function outputFor(thread, context, record, state, observed, decision) {
  const {world, view, seconds, previousEvents} = context;
  const {beat: beatId} = record;
  const beat = thread.beats[beatId];
  const opening = beatId === firstBeat(thread);
  const holder = trackId(thread, record);
  const rule = threadRule(thread, context, record, {...state, signSeen: observed});
  const out = {choices: [], events: [], requests: []};
  const choose = (id, effects) => out.choices.push({id: `${thread.id}/${id}`, effects});
  const remember = (kind, id) => mark(threadMark(thread.id, kind, id));
  const once = (kind, id, effects = []) => choose(`${kind}/${id}`, [remember(kind, id), ...effects]);
  const text = (id, words) => out.requests.push({type: 'say', lineId: `open/${thread.id}/${id}`, text: rule.line(words)});
  const line = (id, row) => text(id, `${row.as ?? nameOf(row.speaker) ?? rule.line(row.speaker)}: ${row.words}`);
  const cue = (id, sound) => { if (sound) out.events.push({type: 'threadCue', id, cue: sound}); };
  const move = (id, row, effects = []) => {
    const cast = row.cast ? {...record.cast, ...row.cast} : undefined;
    choose(id, [...effects, ...rule.effects(row.effects, cast), ...rule.move(row.next, cast)]);
  };

  if (!beat) return out;
  const mission = beat.mission;
  if (mission && decision.activeMission === mission.id) {
    const finished = previousEvents.find(event =>
      (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled') && event.id === mission.id);
    if (finished) {
      out.mission = null;
      out.release = holder;
      const outcome = Object.hasOwn(mission.outcomes ?? {}, finished.outcome) && mission.outcomes[finished.outcome];
      if (outcome && rule.ask(outcome.when)) {
        (outcome.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`${beatId}/outcome/${index}`, row));
        cue(beatId, outcome.cue);
        move(`mission/${beatId}/${finished.outcome}`, outcome);
      }
      return out;
    }
  }
  if (opening && thread.sign.kind === 'smoke' && isFresh(thread, record, world.ledger.night) && !rule.has('entered', beatId) && !isHeld(context.holds, 'signs')) {
    const warning = beat.lines?.filter(row => row.radio && rule.ask(row.when)) ?? [];
    if (warning.length && !rule.has('warned', beatId)) {
      warning.forEach((row, index) => line(`warning/${index}`, row));
      once('warned', beatId);
      return out;
    }
  }

  const followed = Object.keys(thread.beats).some(id => id !== firstBeat(thread) && rule.has('entered', id));
  if (!followed && world.ledger.night - record.began >= thread.ignored.afterNights) {
    move('ignored', thread.ignored);
    return out;
  }

  const ownedHold = context.holds.some(hold => hold.holder === holder);
  if (opening && isHeld(context.holds, 'signs') && !ownedHold) return out;
  const approachedCold = opening && beat.when === 'sign-seen' && !isFresh(thread, record, world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  const entered = rule.has('entered', beatId);
  const startingMission = mission && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && !view.combatWrecking && !view.missionLeaving && !(mission.outing && view.outingAvailable === false);
  if ((!entered || startingMission) && (approachedCold || rule.ask(beat.when))) {
    if (mission) {
      if (!startingMission) return out;
      const authored = {...mission, enemy: resolveRoles(mission.enemy, record.cast)};
      const route = prepareThreadMission(authored, place => context.placeAt(place, record.cast));
      if (!route) return out;
      decision.activeMission = mission.id;
      out.mission = mission.id;
      const systems = mission.holds ?? USUAL_HOLDS;
      if (systems.length) out.hold = {holder, systems};
      out.events.push({type: 'threadMission', id: mission.id, thread: thread.id, beat: beatId, holder, mission: authored, route});
      if (entered) return out;
    }
    state.beatSeconds[beatId] = seconds;
    const entry = [remember('entered', beatId), ...rule.effects(beat.effects)];
    (beat.lines ?? []).filter(row => rule.ask(row.when) && !(opening && thread.sign.kind === 'smoke' && row.radio)).forEach((row, index) => line(`${beatId}/${index}`, row));
    if (!approachedCold) cue(beatId, beat.cue ?? (opening ? thread.sign.cue : undefined));
    if (beat.next && !beat.choices?.length && !beat.mission && !beat.explore?.length && !beat.questions?.length && !beat.mend && !beat.mends?.length)
      entry.push(...rule.move(beat.next));
    choose(`entered/${beatId}`, entry);
    if (opening && !approachedCold) (beat.thoughts ?? []).forEach((row, index) => {
      const thought = typeof row === 'string' ? {thought: row} : row;
      if (rule.ask(thought.when)) text(`${beatId}/thought/${index}`, thought.thought);
    });
    return out;
  }
  if (!rule.has('entered', beatId)) return out;
  state.beatSeconds[beatId] ??= seconds;

  if (!opening) (beat.thoughts ?? []).forEach((row, index) => {
    const thought = typeof row === 'string' ? {thought: row} : row, id = `${beatId}-${index}`;
    if (rule.has('thought', id) || !rule.ask(thought.when)) return;
    once('thought', id);
    text(`${beatId}/thought/${index}`, thought.thought);
  });
  if (view.onFoot) for (const item of beat.explore ?? []) {
    if (rule.has('found', item.id) || !rule.ask(item.when)) continue;
    once('found', item.id, rule.effects(item.effects));
    if (item.thought) text(`clue/${item.id}`, item.thought);
    cue(item.id, item.cue ?? beat.cue);
  }

  const completed = (view.jobEvents ?? []).filter(event => event.type === 'talkChoice');
  const radio = radioScene(thread, beat, rule);
  const asked = new Set([
    ...(completed.find(event => event.id === `${thread.id}/radio-done`)?.asked ?? []),
    ...(view.jobEvents ?? []).filter(event => event.type === 'openTalkQuestion' && event.scene === radio?.id).map(event => event.id),
  ]);
  for (const question of radio?.questions ?? []) if (asked.has(question.id)) once('asked', question.id);
  if (!asked.size && radio && rule.ask(beat.when) && view.onFoot && decision.interact) {
    decision.interact = false;
    if (view.openRoam) out.requests.push({type: 'talk', id: radio.id, scene: radio, speaker: radio.questions[0].lines[0]?.speaker, radio: true});
    else {
      // OPEN-SHARED can carry the words to the caption queue before the roam talk adapter lands.
      const [question] = radio.questions;
      text(`radio/${question.id}/ask`, question.words);
      question.lines.forEach((row, index) => line(`radio/${question.id}/${index}`, row));
      once('asked', question.id);
    }
  }

  if (beat.mission) {
    (beat.mission.lines ?? []).forEach((row, index) => {
      const id = `${beatId}-mission-${index}`;
      if (rule.ask(row.when) && !rule.has('line', id)) { once('line', id); line(id, row); }
    });
    (beat.mission.thoughts ?? []).forEach((row, index) => {
      const thought = typeof row === 'string' ? {thought: row} : row, id = `${beatId}-mission-${index}`;
      if (rule.ask(thought.when) && !rule.has('thought', id)) { once('thought', id); text(id, thought.thought); }
    });
    return out;
  }

  const available = beat.choices?.filter(row => !rule.has('chose', row.id) && rule.ask(row.when)) ?? [];
  const spoken = available.filter(row => row.by === 'say');
  if (spoken.length && view.onFoot && view.openRoam && view.checkpointsEnabled && decision.interact) {
    decision.interact = false;
    const id = `${thread.id}/${beatId}/decision`;
    const choices = spoken.map(row => ({id: `${id}/${row.id}`, words: rule.line(row.words),
      ...(row.plain ? {detail: rule.line(row.plain)} : {})}));
    out.requests.push({type: 'talk', id, scene: {id, choices}, speaker: 'you'});
  }
  const option = available.find(row => row.by === 'go' ? !view.onFoot :
    row.by === 'say' ? view.onFoot && completed.some(event => event.id === `${thread.id}/${beatId}/decision/${row.id}`) :
      completed.some(event => event.id === row.id));
  if (!beat.choices?.length && beat.next) {
    const effects = rule.move(beat.next);
    if (effects.length) choose(`next/${beatId}`, effects);
  }
  if (option) {
    cue(option.id, option.cue);
    if (option.thought) text(`choice/${option.id}`, option.thought);
    (option.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`choice/${option.id}/${index}`, row));
    move(`choice/${option.id}`, option, [remember('chose', option.id)]);
  }
  return out;
}

export function createThreadsPart(threads) {
  return {
    id: 'threads',
    step(previous, input, dt) {
      const context = withPlaces(input);
      const {world, view, holds} = context, night = world.ledger.night;
      const state = {interact: !!view.interact, regions: previous.night === night ? [...(previous.regions ?? [])] : [],
        night, seen: {}, beatSeconds: {...previous.beatSeconds}, places: {partOfDay: view.partOfDay, sitePositions: view.sitePositions}};
      const region = regionId(view);
      const visit = localCampVisit(context);
      const choices = visit ? [{id: visitId(visit.id, night), effects: [mark(visitId(visit.id, night))]}] : [];
      if (!isHeld(holds, 'signs') && region && !state.regions.includes(region)) {
        choices.push(...directThreads(threads, context, `region-${region}`));
        state.regions.push(region);
      }
      const events = [], requests = [];
      const signs = liveSigns(threads, context);
      const decision = {interact: state.interact && !previous.interact, activeMission: previous.mission};
      const settled = input.previousEvents.some(event => event.id === previous.mission &&
        (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled'));
      state.mission = settled ? null : previous.mission;
      let hold, release;
      for (const thread of threads) {
        const record = world.open.threads[thread.id];
        if (!record || record.end) continue;
        const first = record.beat === firstBeat(thread);
        const sight = first ? witnessSign(signs.find(sign => sign.id === thread.id), view, previous.seen?.[thread.id] ?? 0, dt) : null;
        if (sight?.seconds) state.seen[thread.id] = sight.seconds;
        const details = {beatSeconds: {...state.beatSeconds[thread.id]}};
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, context, record, details, sight?.witnessed ?? false, decision);
        if (Object.keys(details.beatSeconds).length) state.beatSeconds[thread.id] = details.beatSeconds;
        choices.push(...out.choices);
        events.push(...out.events);
        requests.push(...out.requests);
        if (out.mission !== undefined) state.mission = out.mission;
        hold ??= out.hold;
        release ??= out.release;
      }
      return {state, choices, events, requests, hold, release};
    },
  };
}

export const threadsPart = createThreadsPart(OPEN_THREADS);
