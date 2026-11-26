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
import {allowsMarketCast, marketDayStep, marketSignReady} from '../market-day-rule.js';
import marketDay from '../../../story/threads/content/market-day.js';
import runaway from '../../../story/threads/content/runaway.js';
import {RUNAWAY_GATE_RIDERS, RUNAWAY_SIGN, runawayBeat, runawayCanStart, runawayPlace} from '../content/runaway-places.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {distance, residentPose, sitePosition} from '../site-rule.js';
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
import {campPeople} from '../content/people-sites.js';

export const OPEN_THREADS = requireSound([burnedCamp, strandedHauler, flagStory, dryPump, marketDay, runaway], checkThread, 'Open Scablands storylines');
const regionId = view => view.regionId ?? view.groundRegion;
const playerPoint = view => view.player?.position ?? view.player;
const trackId = (thread, record) => `thread:${thread.id}/${record.beat}`;

function withPlaces(context) {
  const {world, view = {}} = context;
  return {...context, placeAt: (place, cast) => {
      const hauler = haulerPlaces(world);
      if (place?.checkpoint?.who === 'traders') return hauler.sign ?? null;
      if (typeof place === 'string' && Object.hasOwn(hauler, place)) return hauler[place];
      const point = runawayPlace(place, cast) ?? mallPlace(place) ?? placeForThread(place, cast, {...view, landSeed: world.open.landSeed});
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    signFor: thread => thread === runaway ? RUNAWAY_SIGN : thread.sign,
    allowsCast: (thread, role, id, cast) => thread === marketDay ? allowsMarketCast(role, id, cast, world) :
      role === 'camp' && thread === dryPump ?
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
  const available = threads.filter(thread => thread !== runaway ||
    runawayCanStart({...context, view: {...context.view, checkpointsEnabled: true}}));
  return applyThreadDirector(available, withPlaces(context), 'hearth');
}

export function openThreadSigns(context) {
  const threads = OPEN_THREADS.filter(thread => (thread !== runaway || context.view?.runawayVisible) &&
    (thread.id !== HAULER_ID || context.view?.checkpointsEnabled !== false) &&
    (thread !== marketDay ||
      (context.world.open.threads[marketDay.id] && marketSignReady(context.world, context.world.open.threads[marketDay.id]))));
  return liveSigns(threads, withPlaces(context));
}

function localCampVisit({world, view, placeAt}) {
  return SITES.find(({id, kind}) => kind === 'camp' && isFound(world, id) && stageOf(world, id) === 'camp' &&
    !world.ledger.marks.includes(visitId(id, world.ledger.night)) && distanceBetween(playerPoint(view), placeAt(id, {})) <= 40);
}

function outputFor(thread, context, record, state, observed, decision, dt) {
  const isRunaway = thread === runaway;
  const {world, view, seconds, previousEvents} = context;
  const beat = isRunaway ? runawayBeat(record, context) : thread.beats[record.beat];
  const beatId = beat?.id ?? record.beat;
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
  const speaker = row => row.as ?? (isRunaway && row.speaker === 'slack' && rule.ask({asked: 'his-name'}) ? 'Nat' :
    nameOf(row.speaker) ?? rule.line(row.speaker));
  const line = (id, row) => text(id, `${speaker(row)}: ${row.words}`);
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

  const followed = isRunaway ? rule.ask({fact: 'mark', id: 'runaway/found-him'}) :
    Object.keys(thread.beats).some(id => id !== firstBeat(thread) && rule.has('entered', id));
  const unhelped = hauling && !haulerMarked(world, 'helped') && beatId !== 'between';
  const ignored = isRunaway ? (!record.end && !followed && ['prints', 'shed'].includes(record.beat) &&
    (world.ledger.night > record.began || rule.ask(thread.ignored.when)) ? thread.ignored : null) :
    [thread.ignored].flat().find(row => rule.ask(row.when) && (
    ((!followed || unhelped) && world.ledger.night - signRecord(thread, record, world).began >=
      (row.afterNights ?? thread.sign.lastsNights ?? Infinity)) ||
    (row.afterChoice && rule.has('chose', row.afterChoice.id))));
  if (ignored) {
    if (hauling) out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats', posts: []});
    move('ignored', ignored);
    return out;
  }

  const ownedHold = context.holds.some(hold => hold.holder === holder);
  if (isRunaway && !view.checkpointsEnabled) return out;
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
  const approachedCold = !isRunaway && opening && beat.when === 'sign-seen' && !isFresh(thread, signRecord(thread, record, world), world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  if (hauling && beatId === 'gate' && !entered &&
      (!haulerAtGate(world) || distanceBetween(playerPoint(view), haulerGate) > 40)) return out;
  const startingMission = mission && !decision.journey && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && (!isRunaway || mission.by !== 'foot' || view.onFoot) &&
    (!view.combatWrecking || (isRunaway && beatId === 'breakout')) && !view.missionLeaving &&
    !(mission.outing && view.outingAvailable === false);
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
    (beat.lines ?? []).filter(row => (!isRunaway || !(beat.walked || beat.choices?.some(choice => choice.by !== 'go'))) && rule.ask(row.when) && !(opening && thread.sign.kind === 'smoke' && row.radio)).forEach((row, index) => line(`${beatId}/${index}`, row));
    if (!approachedCold) cue(beatId, beat.cue ?? (opening ? thread.sign.cue : undefined));
    if (!beat.walked && beat.next && !beat.choices?.length && !beat.mission && !beat.explore?.length && !beat.questions?.length && !beat.mend && !beat.mends?.length)
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
  if (isRunaway) {
    if (record.end) return out;
    const sceneId = `${thread.id}/${beatId}/decision`;
    const talkEvents = (view.jobEvents ?? []).filter(event => event.scene === sceneId);
    for (const event of talkEvents) if (event.type === 'openTalkQuestion' && !rule.has('asked', event.id)) {
      const question = beat.questions?.find(row => row.id === event.id);
      if (question) once('asked', question.id, rule.effects(question.effects));
    }
    const chosen = talkEvents.find(event => event.type === 'talkChoice');
    const justAsked = new Set(chosen?.asked ?? talkEvents.filter(event => event.type === 'openTalkQuestion').map(event => event.id));
    const ask = when => askWithQuestions(when, rule, justAsked);
    const available = (beat.choices ?? beat.walked ?? []).filter(row =>
      !rule.has('chose', row.id) && ask(row.when) &&
      !(beatId === 'gate' && rule.ask({fact: 'mark', id: 'runaway/wim-told'}) &&
        !['keep', 'hand-back'].includes(row.id)));
    const option = available.find(row => row.by === 'go' ? view.onFoot && decision.interact :
      chosen?.id === sceneId + '/' + row.id);
    if (option) {
      decision.interact = false;
      const wim = thread.beats.gate.notes.choices['no-boy'].wimSpeaks;
      const discovered = option.id === 'no-boy' && !ask({asked: wim.when.notAsked}) &&
        rule.ask({fact: 'mark', id: 'runaway/among-the-walkers'});
      const extra = discovered ? wim.effects : [];
      (option.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`choice/${option.id}/${index}`, row));
      if (discovered) wim.lines.forEach((row, index) => line(`choice/wim/${index}`, row));
      cue(option.id, option.cue);
      (beat.thoughts ?? []).filter(row => row.slot === 'after' && row.when?.chose === option.id)
        .forEach((row, index) => text(`choice/${option.id}/after/${index}`, row.thought));
      if (option.thought) text(`choice/${option.id}/thought`, option.thought);
      move(`choice/${option.id}`, discovered ? {...option, next: 'gate'} : option, [remember('chose', option.id), ...extra]);
      return out;
    }
    if (chosen?.id === sceneId + '/leave-hearth' && !rule.has('heard', 'hearth-after')) {
      once('heard', 'hearth-after');
      beat.lines.filter(row => row.slot === 'after').forEach((row, i) => line('hearth/after/' + i, row));
    }
    const here = playerPoint(view);
    if (beatId === 'gate' && view.onFoot && decision.interact &&
        rule.ask({fact: 'mark', id: 'runaway/among-the-walkers'}) && !rule.has('asked', 'wim-secret')) {
      const question = thread.beats.hiding.notes.choices['among-the-walkers'].questions[0];
      if (distance(here, runawayPlace('runaway:among-the-walkers', {})) <= 5) {
        decision.interact = false;
        once('asked', question.id);
        question.lines.forEach((row, index) => line(`ask/${question.id}/${index}`, row));
      }
    }
    const mendBeat = thread.beats.shed;
    const mend = ['shed', 'hiding', 'hearth', 'gate'].includes(beatId) ? mendBeat.mend : null;
    if (mend && rule.has('asked', mendBeat.notes.mendOfferedWith.question) && world.scrap >= mend.scrap &&
        !rule.ask({fact: 'mark', id: 'runaway/wire-mended'}) && view.onFoot && view.wrench &&
        distance(here, runawayPlace('runaway:wire', {})) <= 3) {
      if (seconds - (state.mendingSince ?? seconds) >= mend.wrenchSeconds)
        choose('mended-wire', rule.effects(mend.effects));
      state.mendingSince ??= seconds;
    } else state.mendingSince = undefined;

    const spoken = (beat.choices ?? (beat.walked ? [{id: 'leave-hearth', words: 'I hear you.'}] : [])).filter(row => row.by !== 'go' && !rule.has('chose', row.id) &&
      !(beatId === 'gate' && rule.ask({fact: 'mark', id: 'runaway/wim-told'}) && !['keep', 'hand-back'].includes(row.id)));
    if (spoken.length && decision.interact && view.openRoam && (view.onFoot || beatId === 'surrounded') &&
        rule.ask(beat.when)) {
      const talkLine = row => ({...row, speaker: speaker(row), words: rule.line(row.words)});
      const questions = (beat.questions ?? []).filter(row => !rule.has('asked', row.id) && askWithQuestions(row.when, rule, null))
        .map(row => ({id: row.id, words: rule.line(row.words), needs: pendingQuestions(row.when, rule),
          lines: row.lines.map(talkLine)}));
      const choices = spoken.filter(row => askWithQuestions(row.when, rule, null)).map(row => ({
        id: sceneId + '/' + row.id, words: rule.line(row.words),
        thought: typeof row.thought === 'string' ? rule.line(row.thought) : undefined,
        needs: pendingQuestions(row.when, rule), detail: row.plain && rule.line(row.plain),
      }));
      if (choices.length) {
        decision.interact = false;
        const scene = {id: sceneId, lines: beat.lines?.filter(row => row.slot !== 'after' && rule.ask(row.when)).map(talkLine), questions, choices,
          thoughts: (beat.thoughts ?? []).filter(row => typeof row === 'string' || row.slot !== 'after' && rule.ask(row.when))
            .map(row => rule.line(typeof row === 'string' ? row : row.thought))};
        const person = beatId === 'shed' ? 'slack' : beatId === 'gate' ? 'clinker' : beatId === 'hearth' ? 'auntie-solder' : 'you';
        out.requests.push({type: 'talk', id: sceneId, scene, speaker: person, radio: true});
        return out;
      }
    }
    if (beatId === 'prints') for (const row of thread.notes.sign.lines) {
      const spot = row.at === 'hearth' ? 'hearth' : 'in-the-shed';
      if (view.onFoot && !rule.has('heard', row.at) && distance(here, runawayPlace('runaway:' + spot, {})) <= 5) {
        once('heard', row.at);
        line('heard/' + row.at, row);
      }
    }
  }

  const roadThoughtsReady = !hauling || !beatId.endsWith('-road') || state.reading?.verge?.seconds >= 2 ||
    seconds - state.beatSeconds[beatId] >= 30;
  if (!opening && !isRunaway && roadThoughtsReady) (beat.thoughts ?? []).forEach((row, index) => {
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
  const radio = isRunaway ? null : radioScene(thread, beat, rule);
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

  if (isRunaway) {
    if (beatId === 'prints' && rule.has('found', 'handprint')) choose('next/prints', rule.move(beat.next));
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

function askWithQuestions(when, rule, answers) {
  if (when?.all) return when.all.every(row => askWithQuestions(row, rule, answers));
  if (when?.asked) return answers === null || answers.has(when.asked) || rule.ask(when);
  return rule.ask(when);
}

function pendingQuestions(when, rule) {
  if (when?.all) return when.all.flatMap(row => pendingQuestions(row, rule));
  return when?.asked && !rule.ask(when) ? [when.asked] : [];
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
      const availableThreads = enabled ? threads : threads.filter(thread => thread !== dryPump && thread.id !== FLAG_ID && thread.id !== HAULER_ID && thread !== marketDay);
      if (enabled) state.places.dryPumpEnabled = true;
      const canStartRunaway = runawayCanStart(context);
      const region = canStartRunaway ? 'runaway-tin-town' : regionId(view);
      const visit = localCampVisit(context);
      const choices = visit ? [{id: visitId(visit.id, night), effects: [mark(visitId(visit.id, night))]}] : [];
      if (!isHeld(holds, 'signs') && region && !state.regions.includes(region)) {
        choices.push(...directThreads(availableThreads.filter(thread => thread !== runaway || canStartRunaway), context, `region-${region}`));
        state.regions.push(region);
      }
      const events = [], requests = [];
      if (view.checkpointsEnabled && view.onFoot && world.ledger.marks.includes('rumour/grey-camp') &&
          !isFound(world, 'grey-camp') && distance(playerPoint(view), sitePosition('grey-camp', world.open.landSeed)) <= 30) {
        choices.push({id: 'runaway/discovered-grey-camp', effects: [{type: 'find', site: 'grey-camp'}]});
        events.push({type: 'threadCue', id: 'runaway/grey-camp', cue: 'open.clue.found'});
      }
      const gateRecord = world.open.threads.runaway;
      const gateCars = !!view.checkpointsEnabled && gateRecord?.beat === 'gate' && !gateRecord.end && view.partOfDay === 'dusk';
      if (gateCars !== !!previous.runawayGateCars) {
        const count = runaway.beats.gate.notes.rule;
        const raiding = threadRule(runaway, context, gateRecord ?? {}).ask({fact: 'feud', of: 'ash-men', atLeast: 'Raiding'});
        requests.push({type: 'missionLookouts', group: 'ash-men', id: 'runaway/gate-party',
          posts: gateCars ? RUNAWAY_GATE_RIDERS.slice(0, raiding ? count.riderCarsWhenRaiding : count.riderCars)
            .map(at => ({...at, y: scablandsSurfaceHeightAt(at.x, at.z)})) : []});
      }
      state.runawayGateCars = gateCars;
      const runawayVisible = !!view.checkpointsEnabled && ['day', 'dawn'].includes(view.partOfDay ?? 'day');
      state.places.runawayVisible = runawayVisible;
      if (view.partOfDay === 'dawn' && runawayVisible) state.places.partOfDay = 'day';
      const flagKey = view.checkpointsEnabled && world.open.threads[FLAG_ID] ?
        world.open.threads[FLAG_ID].end ?? 'company' : '';
      state.flagSite = flagKey;
      if (flagKey !== (previous.flagSite ?? '')) requests.push({type: 'solids', id: FLAG_ID,
        solids: flagKey ? flagSolids(world, scablandsSurfaceHeightAt) : []});
      const signs = liveSigns(availableThreads.filter(thread => thread !== runaway || runawayVisible),
        {...context, view: {...view, partOfDay: view.partOfDay === 'dawn' ? 'day' : view.partOfDay}});
      const decision = {interact: state.interact && !previous.interact, activeMission: previous.mission, journey: enabled && previous.journey};
      const settled = input.previousEvents.some(event => event.id === previous.mission &&
        (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled'));
      state.mission = settled ? null : previous.mission;
      let hold, release;
      for (const source of availableThreads) {
        const thread = source.id === FLAG_ID ? stagedFlag(world) : source;
        const record = world.open.threads[thread.id];
        if (!record) continue;
        if (thread === marketDay) {
          if (!view.openRoam) continue;
          const out = marketDayStep(context, record, previous.market, decision.interact, state.mission);
          state.market = out.state;
          choices.push(...out.choices);
          events.push(...out.events);
          requests.push(...out.requests);
          if (out.requests.some(request => request.type === 'talk')) decision.interact = false;
          if (out.mission !== undefined) state.mission = decision.activeMission = out.mission;
          hold ??= out.hold;
          continue;
        }
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
        if (thread === runaway && !view.checkpointsEnabled) continue;
        const struck = thread.notes?.sign?.struck;
        const waterStruck = !record.end && struck && night - record.began >= struck.afterNights;
        if (waterStruck)
          choices.push({id: `${thread.id}/water-struck`, effects: struck.effects});
        // A choice on the first tick of the new morning must already see the new price.
        const threadContext = waterStruck ? {...context, world: {...world, ledger: {...world.ledger,
          marks: [...world.ledger.marks, ...struck.effects.filter(row => row.type === 'mark').map(row => row.id)]}}} : context;
        const laterRule = threadRule(thread, threadContext, record);
        const laterRows = thread === runaway ? [] : thread.id === FLAG_ID ? FLAG_TALK_ROWS : thread.later ?? [];
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
        if (record.end && thread !== runaway) continue;
        const first = record.beat === firstBeat(thread);
        const sight = first ? witnessSign(signs.find(sign => sign.id === thread.id), view, previous.seen?.[thread.id] ?? 0, dt) : null;
        if (sight?.seconds) state.seen[thread.id] = sight.seconds;
        const details = {...previous.progress?.[thread.id], beatSeconds: {...state.beatSeconds[thread.id]},
          reading: {...previous.progress?.[thread.id]?.reading},
          ...(thread === runaway ? {mendingSince: previous.mendingSince} : {})};
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, threadContext, record, details, sight?.witnessed ?? false, decision, dt);
        if (details.mendingSince !== undefined) state.mendingSince = details.mendingSince;
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
