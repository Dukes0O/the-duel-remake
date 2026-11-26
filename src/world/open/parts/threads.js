import {checkThread, requireSound} from '../check-tables.js';
import {isHeld, USUAL_HOLDS} from '../holds.js';
import {resolveRoles} from '../roles.js';
import {prepareThreadMission} from './missions.js';
import {isFound, stageOf} from '../open-record.js';
import {SITES, nameOf} from '../register.js';
import {distanceBetween} from '../../../story/threads/cast.js';
import {applyThreadDirector, directThreads, visitId} from '../../../story/threads/director.js';
import {isFresh, liveSigns, witnessSign, signRecord} from '../../../story/threads/signs.js';
import {firstBeat, mark, threadMark, threadRule} from '../../../story/threads/thread-rule.js';
import dryPump from '../../../story/threads/content/dry-pump.js';
import {mallPlace} from '../content/dry-pump-places.js';
import {DRY_PUMP_HOLD, dryPumpAllowsCamp, dryPumpStep} from './dry-pump.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {placeForThread, radioScene} from '../../../story/scenes/burned-camp.js';
import strandedHauler from '../../../story/threads/content/stranded-hauler.js';
import {HAULER_ID, haulerPlaces, haulerStop, haulerMission, haulerReading, haulerAction, haulerGate,
  haulerAtGate, haulerMarked, haulerIsTrap} from '../content/stranded-hauler-places.js';
import {haulerTalkScene, haulerGateNews} from '../content/talk-hauler.js';
import {haulerVisitor} from '../content/stranded-hauler-places.js';
import {flagStory, FLAG_ID, FLAG_SCENES, FLAG_LATER_PLACES, FLAG_TALK_ROWS, stagedFlag, flagSolids} from '../content/somebody-elses-flag-places.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {residentPose} from '../site-rule.js';
import {campPeople} from '../content/people-sites.js';

export const OPEN_THREADS = requireSound([burnedCamp, strandedHauler, flagStory, dryPump], checkThread, 'Open Scablands storylines');
const regionId = view => view.regionId ?? view.groundRegion;
const playerPoint = view => view.player?.position ?? view.player;
const trackId = (thread, record) => `thread:${thread.id}/${record.beat}`;

function withPlaces(context) {
  const {world, view = {}} = context;
  return {...context, placeAt: (place, cast) => {
      const hauler = haulerPlaces(world);
      if (place?.checkpoint?.who === 'traders') return hauler.sign ?? null;
      if (typeof place === 'string' && Object.hasOwn(hauler, place)) return hauler[place];
      const point = mallPlace(place) ?? placeForThread(place, cast, {...view, landSeed: world.open.landSeed});
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    allowsCast: (thread, role, id) => role === 'camp' && thread === dryPump ?
      dryPumpAllowsCamp(world, id, playerPoint(view), placeForThread(id, {}, view)) : thread !== burnedCamp || role !== 'camp' ||
      (!world.ledger.marks.includes(visitId(id, world.ledger.night)) &&
        distanceBetween(playerPoint(view), placeForThread(id, {}, view)) > 40),
    startsEffects: (thread, cast) => thread === burnedCamp ?
      threadRule(thread, context, {cast}).effects(thread.beats.sign.effects.filter(effect => effect.type === 'site')) : [],
  };
}

// `threads` narrows the director to some storylines, so that one storyline's checks are not changed by which others
// happen to be loaded; the game always passes none and directs every loaded storyline.
export function threadsAtBankedHearth(context, threads = OPEN_THREADS) {
  return applyThreadDirector(threads, withPlaces(context), 'hearth');
}

export function openThreadSigns(context) {
  return liveSigns(OPEN_THREADS.filter(thread => thread.id !== HAULER_ID || context.view?.checkpointsEnabled !== false), withPlaces(context));
}

function localCampVisit({world, view, placeAt}) {
  return SITES.find(({id, kind}) => kind === 'camp' && isFound(world, id) && stageOf(world, id) === 'camp' &&
    !world.ledger.marks.includes(visitId(id, world.ledger.night)) && distanceBetween(playerPoint(view), placeAt(id, {})) <= 40);
}

function outputFor(thread, context, record, state, observed, decision, dt) {
  const {world, view, seconds, previousEvents} = context;
  const {beat: beatId} = record;
  const beat = thread.beats[beatId];
  const hauling = thread.id === HAULER_ID;
  const visit = hauling && haulerMarked(world, 'second-truck') ? '/again' : '';
  if (state.visit !== visit) { state.reading = {}; state.mending = 0; state.lifting = false; }
  state.visit = visit;
  const opening = beatId === firstBeat(thread);
  const holder = trackId(thread, record);
  const rule = threadRule(thread, context, record, {...state, signSeen: observed});
  const out = {choices: [], events: [], requests: []};
  const choose = (id, effects) => out.choices.push({id: `${thread.id}/${id}`, effects});
  const remember = (kind, id) => mark(threadMark(thread.id, kind, id + state.visit));
  const once = (kind, id, effects = []) => choose(`${kind}/${id}`, [remember(kind, id), ...effects]);
  const text = (id, words) => out.requests.push({type: 'say', lineId: `open/${thread.id}/${id}`, text: rule.line(words)});
  const line = (id, row) => text(id, `${row.as ?? nameOf(row.speaker) ?? rule.line(row.speaker)}: ${row.words}`);
  const cue = (id, sound) => { if (sound) out.events.push({type: 'threadCue', id, cue: sound}); };
  const move = (id, row, effects = []) => {
    const cast = row.cast ? {...record.cast, ...row.cast} : undefined;
    choose(id, [...effects, ...rule.effects(row.effects, cast), ...rule.move(row.next, cast)]);
  };

  if (!beat) return out;
  if (hauling && beatId === 'between' && !haulerMarked(world, 'second-truck')) {
    if (!state.clearedLookouts) {
      out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats', posts: []});
      state.clearedLookouts = true;
    }
    const waiting = world.open.journal.findLast(row => row.type === 'thread' && row.key === thread.id && row.after?.beat === 'between');
    if (waiting && world.ledger.night - waiting.night >= thread.sign.again.afterNights) {
      choose('second-truck', [mark(HAULER_ID + '/second-truck'), ...rule.move('sign')]);
    }
    return out;
  }
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
  const unhelped = hauling && !haulerMarked(world, 'helped') && beatId !== 'between';
  const ignored = [thread.ignored].flat().find(row => rule.ask(row.when) && (
    ((!followed || unhelped) && world.ledger.night - signRecord(thread, record, world).began >=
      (row.afterNights ?? thread.sign.lastsNights ?? Infinity)) ||
    (row.afterChoice && rule.has('chose', row.afterChoice.id))));
  if (ignored) {
    if (hauling) out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats', posts: []});
    move('ignored', ignored);
    return out;
  }

  const ownedHold = context.holds.some(hold => hold.holder === holder);
  const entered = rule.has('entered', beatId);
  const staging = thread.id === FLAG_ID && FLAG_SCENES[beatId];
  const atTalk = !staging || view.onFoot === staging.foot && rule.ask({reach: staging.at, within: staging.within});
  if (thread.id === FLAG_ID && entered && beat.choices?.some(row => row.by === 'go') && !view.onFoot &&
      !rule.ask({reach: thread.sign.at, within: 60})) {
    const option = beat.choices.find(row => row.by === 'go');
    if (option.thought) text(`choice/${option.id}`, option.thought);
    move(`choice/${option.id}`, option, [remember('chose', option.id)]);
    return out;
  }
  const exploring = entered && view.onFoot && beat.explore?.length && rule.ask({reach: thread.sign.at, within: 45});
  if (staging && !atTalk && !exploring) return out;
  if (opening && isHeld(context.holds, 'signs') && !ownedHold) return out;
  const approachedCold = opening && beat.when === 'sign-seen' && !isFresh(thread, signRecord(thread, record, world), world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  if (hauling && beatId === 'gate' && !entered &&
      (!haulerAtGate(world) || distanceBetween(playerPoint(view), haulerGate) > 40)) return out;
  const startingMission = mission && !decision.journey && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && !view.combatWrecking && !view.missionLeaving && !(mission.outing && view.outingAvailable === false);
  if ((!entered || startingMission) && (approachedCold || rule.ask(beat.when))) {
    if (mission) {
      if (!startingMission) return out;
      const authored = hauling ? haulerMission(mission, world) : {...mission, enemy: resolveRoles(mission.enemy, record.cast)};
      const route = prepareThreadMission(authored, place => context.placeAt(place, record.cast));
      if (!route) return out;
      decision.activeMission = mission.id;
      out.mission = mission.id;
      const systems = mission.holds ?? USUAL_HOLDS;
      if (systems.length) out.hold = {holder, systems};
      out.events.push({type: 'threadMission', id: mission.id, thread: thread.id, beat: beatId, holder, mission: authored, route});
      if (hauling) out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats', posts: []});
      if (entered) return out;
    }
    state.beatSeconds[beatId] = seconds;
    if (hauling && (opening || beatId === 'ridge')) {
      const stop = haulerStop(world);
      out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats',
        posts: (beatId === 'ridge' || haulerIsTrap(world)) ? stop.starts : []});
    }
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

  const roadThoughtsReady = !hauling || !beatId.endsWith('-road') || state.reading?.verge?.seconds >= 2 ||
    seconds - state.beatSeconds[beatId] >= 30;
  if (!opening && roadThoughtsReady) (beat.thoughts ?? []).forEach((row, index) => {
    const thought = typeof row === 'string' ? {thought: row} : row, id = `${beatId}-${index}`;
    if (rule.has('thought', id) || !rule.ask(thought.when)) return;
    once('thought', id);
    text(`${beatId}/thought/${index}`, thought.thought);
  });
  for (const item of beat.explore ?? []) {
    if (hauling ? !haulerReading(beat, item, context, state, dt) : !view.onFoot) continue;
    if (rule.has('found', item.id) || !rule.ask(item.when)) continue;
    once('found', item.id, rule.effects(item.effects));
    if (item.thought) text(`clue/${item.id}`, item.thought);
    cue(item.id, item.cue ?? beat.cue);
  }
  if (hauling && beatId === 'trap-road' && state.reading?.['high-ground']?.seconds >= 8) {
    move('lookout-spotted', {next: 'trap-fight'});
    cue('lookout-spotted', 'open.trap.sprung');
    return out;
  }

  const completed = (view.jobEvents ?? []).filter(event => event.type === 'talkChoice');
  const radio = radioScene(thread, beat, rule);
  const asked = new Set([
    ...(completed.find(event => event.id === `${thread.id}/radio-done`)?.asked ?? []),
    ...(view.jobEvents ?? []).filter(event => event.type === 'openTalkQuestion' && event.scene === radio?.id).map(event => event.id),
  ]);
  for (const question of radio?.questions ?? []) if (asked.has(question.id)) {
    const authored = beat.questions.find(row => row.id === question.id);
    once('asked', question.id, rule.effects(authored.effects));
  }
  if (!asked.size && radio && atTalk && rule.ask(beat.when) && (view.onFoot || hauling && beatId.endsWith('-road')) && decision.interact) {
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
      if (!row.moment && rule.ask(row.when) && !rule.has('line', id)) { once('line', id); line(id, row); }
    });
    (beat.mission.thoughts ?? []).forEach((row, index) => {
      const thought = typeof row === 'string' ? {thought: row} : row, id = `${beatId}-mission-${index}`;
      if (rule.ask(thought.when) && !rule.has('thought', id)) { once('thought', id); text(id, thought.thought); }
    });
    return out;
  }

  if (hauling && beat.mend) {
    const close = view.onFoot && view.wrench && distanceBetween(playerPoint(view), context.placeAt('hauler-axle', record.cast)) <= 3;
    state.mending = close ? (state.mending ?? 0) + dt : 0;
    if (close && !state.lifting) { (beat.mend.during ?? []).forEach((row, i) => line('mend/during/' + i, row)); state.lifting = true; }
    if (!close) state.lifting = false;
    if (state.mending + 1e-9 >= beat.mend.wrenchSeconds) {
      (beat.mend.after ?? []).forEach((row, i) => line('mend/after/' + i, row));
      cue(beat.mend.id, beat.mend.cue);
      move('mended', {...beat.mend, next: beat.next});
    }
    return out;
  }

  const available = beat.choices?.filter(row => (!rule.has('chose', row.id) || !hauling && row.by === 'do' && row.next) && rule.ask(row.when)) ?? [];
  const spoken = available.filter(row => row.by === 'say' || !hauling && row.by === 'do' || !row.by);
  if (spoken.length && atTalk && view.onFoot && view.openRoam && view.checkpointsEnabled && decision.interact) {
    decision.interact = false;
    const id = `${thread.id}/${beatId}/decision`;
    const choices = spoken.map(row => ({id: `${id}/${row.id}`, words: rule.line(row.words).replace(/([^.!?])$/, '$1.'),
      ...(row.plain ? {detail: rule.line(row.plain)} : {})}));
    out.requests.push({type: 'talk', id, scene: {id, choices}, speaker: 'you'});
  }
  const option = available.find(row => hauling && row.by === 'do' ? haulerAction(row, context) : row.by === 'go' ? !view.onFoot :
    ['say', 'do', undefined].includes(row.by) ? atTalk && view.onFoot && completed.some(event => event.id === `${thread.id}/${beatId}/decision/${row.id}`) :
      completed.some(event => event.id === row.id));
  if (!beat.choices?.length && beat.next && (hauling || !beat.questions?.length || completed.some(event => event.id === `${thread.id}/radio-done`))) {
    const waitingGate = hauling && beatId === 'gate' &&
      (!haulerAtGate(world) || distanceBetween(playerPoint(view), haulerGate) <= 45);
    const effects = waitingGate ? [] : rule.move(beat.next);
    if (effects.length) choose(`next/${beatId}`, effects);
  }
  if (option) {
    cue(option.id, option.cue);
    if (option.thought) {
      const thought = typeof option.thought === 'string' ? {thought: option.thought} : option.thought;
      if (rule.ask(thought.when)) text(`choice/${option.id}`, thought.thought);
    }
    (option.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`choice/${option.id}/${index}`, row));
    const count = option.by === 'do' ? world.open.journal.filter(change => change.type === 'thread' &&
      change.choiceId.startsWith(`${thread.id}/choice/${option.id}/`)).length : null;
    move(`choice/${option.id}${count === null ? '' : '/' + count}`, option, [remember('chose', option.id)]);
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
        night, seen: {}, beatSeconds: {...previous.beatSeconds}, places: {partOfDay: view.partOfDay,
          sitePositions: view.sitePositions, checkpointsEnabled: view.checkpointsEnabled === true}};
      const enabled = view.checkpointsEnabled === true;
      const availableThreads = enabled ? threads : threads.filter(thread => thread !== dryPump && thread.id !== FLAG_ID && thread.id !== HAULER_ID);
      if (enabled) state.places.dryPumpEnabled = true;
      const region = regionId(view);
      const visit = localCampVisit(context);
      const choices = visit ? [{id: visitId(visit.id, night), effects: [mark(visitId(visit.id, night))]}] : [];
      if (!isHeld(holds, 'signs') && region && !state.regions.includes(region)) {
        choices.push(...directThreads(availableThreads, context, `region-${region}`));
        state.regions.push(region);
      }
      const events = [], requests = [];
      const flagKey = view.checkpointsEnabled && world.open.threads[FLAG_ID] ?
        world.open.threads[FLAG_ID].end ?? 'company' : '';
      state.flagSite = flagKey;
      if (flagKey !== (previous.flagSite ?? '')) requests.push({type: 'solids', id: FLAG_ID,
        solids: flagKey ? flagSolids(world, scablandsSurfaceHeightAt) : []});
      const signs = liveSigns(availableThreads, context);
      const decision = {interact: state.interact && !previous.interact, activeMission: previous.mission, journey: enabled && previous.journey};
      const settled = input.previousEvents.some(event => event.id === previous.mission &&
        (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled'));
      state.mission = settled ? null : previous.mission;
      let hold, release;
      for (const source of availableThreads) {
        const thread = source.id === FLAG_ID ? stagedFlag(world) : source;
        const record = world.open.threads[thread.id];
        if (!record) continue;
        if (thread === dryPump) {
          const out = dryPumpStep(context, record, previous.dryPump ?? {}, dt, decision);
          state.dryPump = out.state;
          if (out.state.mall) state.journey = {holder: DRY_PUMP_HOLD};
          choices.push(...out.choices);
          events.push(...out.events);
          requests.push(...out.requests);
          if (out.mission !== undefined) state.mission = out.mission;
          hold ??= out.hold;
          release ??= out.release;
          continue;
        }
        const struck = thread.notes?.sign?.struck;
        const waterStruck = !record.end && struck && night - record.began >= struck.afterNights;
        if (waterStruck)
          choices.push({id: `${thread.id}/water-struck`, effects: struck.effects});
        // A choice on the first tick of the new morning must already see the new price.
        const threadContext = waterStruck ? {...context, world: {...world, ledger: {...world.ledger,
          marks: [...world.ledger.marks, ...struck.effects.filter(row => row.type === 'mark').map(row => row.id)]}}} : context;
        const laterRule = threadRule(thread, threadContext, record);
        const laterRows = thread.id === FLAG_ID ? FLAG_TALK_ROWS : thread.later ?? [];
        const later = laterRows.find(row => {
          if (!view.onFoot || !laterRule.ask(row.when) || laterRule.has('later', row.id)) return false;
          if (thread.id === FLAG_ID && (!record.end || night - (world.open.journal.findLast(change =>
            change.type === 'thread' && change.key === thread.id && change.after.end)?.night ?? night) < row.afterNights)) return false;
          const at = row.at ?? (thread.id === FLAG_ID && FLAG_LATER_PLACES[row.by]);
          if (at) return laterRule.ask({reach: at, within: 3});
          const speaker = laterRule.line(row.by);
          const person = view.people?.find(person => person.id === row.by || nameOf(person.id) === speaker);
          const resident = record.cast.camp && campPeople(record.cast.camp).find(person => person.id === row.by || nameOf(person.id) === speaker);
          const position = person?.position ?? (resident && residentPose(resident, world,
            {partOfDay: view.partOfDay, routineTime: context.seconds}).position);
          return distanceBetween(playerPoint(view), position) <= 2.5;
        });
        if (later && decision.interact) {
          decision.interact = false;
          const id = `${thread.id}/later/${later.id}`;
          requests.push({type: 'talk', id, speaker: later.by, scene: {id,
            lines: later.lines.filter(row => laterRule.ask(row.when)).map(row => ({...row, speaker: laterRule.line(row.speaker), words: laterRule.line(row.words)})),
            choices: [{id, words: 'I hear you.'}]}});
        }
        for (const row of laterRows) if (view.jobEvents?.some(event => event.type === 'talkChoice' && event.id === `${thread.id}/later/${row.id}`) && later?.id === row.id)
          choices.push({id: `${thread.id}/later/${row.id}`, effects: [mark(threadMark(thread.id, 'later', row.id)), ...laterRule.effects(row.effects)]});
        if (record.end) continue;
        const first = record.beat === firstBeat(thread);
        const sight = first ? witnessSign(signs.find(sign => sign.id === thread.id), view, previous.seen?.[thread.id] ?? 0, dt) : null;
        if (sight?.seconds) state.seen[thread.id] = sight.seconds;
        const details = {...previous.progress?.[thread.id], beatSeconds: {...state.beatSeconds[thread.id]},
          reading: {...previous.progress?.[thread.id]?.reading}};
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, threadContext, record, details, sight?.witnessed ?? false, decision, dt);
        (state.progress ??= {})[thread.id] = details;
        if (Object.keys(details.beatSeconds).length) state.beatSeconds[thread.id] = details.beatSeconds;
        choices.push(...out.choices);
        events.push(...out.events);
        requests.push(...out.requests);
        if (out.mission !== undefined) state.mission = out.mission;
        hold ??= out.hold;
        release ??= out.release;
      }
      const hauler = threads.find(thread => thread.id === HAULER_ID);
      const haulerRecord = hauler && world.open.threads[HAULER_ID];
      if (haulerRecord && view.checkpointsEnabled) {
        const roadside = !haulerRecord.end && !['between', 'escort', 'alone', 'parted', 'gate'].includes(haulerRecord.beat);
        const stop = haulerStop(world), key = roadside ? stop.checkpoint : '';
        state.stoppedTruck = key;
        if (previous.stoppedTruck !== key) requests.push({type: 'solids', id: HAULER_ID + '/stopped', solids: roadside ? [
          {id: HAULER_ID + '/stopped', kind: 'wreck', shape: 'box', x: stop.truck.x, z: stop.truck.z,
            halfX: 1.5, halfZ: 4, height: 3.4, heading: stop.truck.heading,
            base: (view.missionHeightAt ?? scablandsSurfaceHeightAt)(stop.truck.x, stop.truck.z)},
        ] : []});
      }
      if (haulerRecord?.end && view.checkpointsEnabled && view.openRoam) {
        const visitor = haulerVisitor(world, context.seconds), atGate = haulerAtGate(world);
        const present = atGate || !haulerMarked(world, 'gate-open');
        if (present && distanceBetween(playerPoint(view), visitor) <= (view.onFoot ? 4 : 60)) {
          for (const event of view.jobEvents ?? []) {
            const later = hauler.later.find(row => event.id?.startsWith(HAULER_ID + '/later/' + row.id));
            const scene = event.scene === HAULER_ID + '/gate-news' && atGate ? haulerGateNews(context) :
              later ? haulerTalkScene(HAULER_ID + '/later/' + later.id, context) : null;
            if (!scene) continue;
            const row = event.type === 'openTalkQuestion' ? scene.questions?.find(row => row.id === event.id) :
              event.type === 'talkChoice' ? scene.choices.find(row => row.id === event.id) : null;
            if (row?.effects?.length) choices.push({id: scene.id + '/' +
              (event.type === 'openTalkQuestion' ? 'ask/' : 'choose/') + event.id, effects: row.effects});
          }
        }
      }
      if (haulerRecord?.end && view.checkpointsEnabled && view.openRoam && decision.interact && !requests.some(row => row.type === 'talk')) {
        const visitor = haulerVisitor(world, context.seconds), atGate = haulerAtGate(world);
        const here = playerPoint(view);
        const present = atGate || !haulerMarked(world, 'gate-open');
        if (present && distanceBetween(here, visitor) <= (view.onFoot ? 4 : 60)) {
          const later = hauler.later.filter(row => row.by === 'tally')
            .map(row => haulerTalkScene(HAULER_ID + '/later/' + row.id, context)).find(Boolean);
          const scene = later ?? (atGate ? haulerGateNews(context) : null);
          if (scene) requests.push({type: 'talk', id: scene.id, scene, speaker: 'tally', radio: !view.onFoot || !atGate});
        }
      }
      return {state, choices, events, requests, hold, release};
    },
  };
}

export const threadsPart = createThreadsPart(OPEN_THREADS);
