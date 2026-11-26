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
import runaway from '../../../story/threads/content/runaway.js';
import {RUNAWAY_GATE_RIDERS, RUNAWAY_SIGN, runawayBeat, runawayCanStart, runawayPlace} from '../content/runaway-places.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {distance, sitePosition} from '../site-rule.js';
import dryPump from '../../../story/threads/content/dry-pump.js';
import {mallPlace} from '../content/dry-pump-places.js';
import {DRY_PUMP_HOLD, dryPumpAllowsCamp, dryPumpStep} from './dry-pump.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {placeForThread, radioScene} from '../../../story/scenes/burned-camp.js';

export const OPEN_THREADS = requireSound([burnedCamp, dryPump, runaway], checkThread, 'Open Scablands storylines');
const regionId = view => view.regionId ?? view.groundRegion;
const playerPoint = view => view.player?.position ?? view.player;
const trackId = (thread, record) => `thread:${thread.id}/${record.beat}`;

function withPlaces(context) {
  const {world, view = {}} = context;
  return {...context, placeAt: (place, cast) => {
      const point = runawayPlace(place, cast) ?? mallPlace(place) ?? placeForThread(place, cast, view);
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    signFor: thread => thread === runaway ? RUNAWAY_SIGN : thread.sign,
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
  const available = threads.filter(thread => thread !== runaway ||
    runawayCanStart({...context, view: {...context.view, checkpointsEnabled: true}}));
  return applyThreadDirector(available, withPlaces(context), 'hearth');
}

export function openThreadSigns(context) {
  return liveSigns(OPEN_THREADS.filter(thread => thread !== runaway || context.view?.runawayVisible), withPlaces(context));
}

function localCampVisit({world, view, placeAt}) {
  return SITES.find(({id, kind}) => kind === 'camp' && isFound(world, id) && stageOf(world, id) === 'camp' &&
    !world.ledger.marks.includes(visitId(id, world.ledger.night)) && distanceBetween(playerPoint(view), placeAt(id, {})) <= 40);
}

function outputFor(thread, context, record, state, observed, decision) {
  const isRunaway = thread === runaway;
  const {world, view, seconds, previousEvents} = context;
  const beat = isRunaway ? runawayBeat(record, context) : thread.beats[record.beat];
  const beatId = beat?.id ?? record.beat;
  const opening = beatId === firstBeat(thread);
  const holder = trackId(thread, record);
  const rule = threadRule(thread, context, record, {...state, signSeen: observed});
  const out = {choices: [], events: [], requests: []};
  const choose = (id, effects) => out.choices.push({id: `${thread.id}/${id}`, effects});
  const remember = (kind, id) => mark(threadMark(thread.id, kind, id));
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
  const ignored = isRunaway ? (record.beat === 'prints' || record.beat === 'shed') && (world.ledger.night > record.began || rule.ask(thread.ignored.when)) :
    world.ledger.night - record.began >= thread.ignored.afterNights;
  if (!record.end && !followed && ignored) {
    move('ignored', thread.ignored);
    return out;
  }

  const ownedHold = context.holds.some(hold => hold.holder === holder);
  if (opening && isHeld(context.holds, 'signs') && !ownedHold) return out;
  const approachedCold = !isRunaway && opening && beat.when === 'sign-seen' && !isFresh(thread, record, world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  if (isRunaway && !view.checkpointsEnabled) return out;
  const entered = rule.has('entered', beatId);
  const startingMission = mission && !decision.journey && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && (!isRunaway || mission.by !== 'foot' || view.onFoot) &&
    (!view.combatWrecking || (isRunaway && beatId === 'breakout')) && !view.missionLeaving &&
    !(mission.outing && view.outingAvailable === false);
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

  if (!opening && !isRunaway) (beat.thoughts ?? []).forEach((row, index) => {
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
  const radio = isRunaway ? null : radioScene(thread, beat, rule);
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

  if (isRunaway) {
    if (beatId === 'prints' && rule.has('found', 'handprint')) choose('next/prints', rule.move(beat.next));
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
        night, seen: {}, beatSeconds: {...previous.beatSeconds}, places: {partOfDay: view.partOfDay, sitePositions: view.sitePositions}};
      const enabled = view.checkpointsEnabled === true;
      const availableThreads = enabled ? threads : threads.filter(thread => thread !== dryPump);
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
      const signs = liveSigns(availableThreads.filter(thread => thread !== runaway || runawayVisible),
        {...context, view: {...view, partOfDay: view.partOfDay === 'dawn' ? 'day' : view.partOfDay}});
      const decision = {interact: state.interact && !previous.interact, activeMission: previous.mission, journey: enabled && previous.journey};
      const settled = input.previousEvents.some(event => event.id === previous.mission &&
        (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled'));
      state.mission = settled ? null : previous.mission;
      let hold, release;
      for (const thread of availableThreads) {
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
        if ((record.end && thread !== runaway) || (thread === runaway && !view.checkpointsEnabled)) continue;
        const first = record.beat === firstBeat(thread);
        const sight = first ? witnessSign(signs.find(sign => sign.id === thread.id), view, previous.seen?.[thread.id] ?? 0, dt) : null;
        if (sight?.seconds) state.seen[thread.id] = sight.seconds;
        const details = {beatSeconds: {...state.beatSeconds[thread.id]},
          ...(thread === runaway ? {mendingSince: previous.mendingSince} : {})};
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, context, record, details, sight?.witnessed ?? false, decision);
        if (details.mendingSince !== undefined) state.mendingSince = details.mendingSince;
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
