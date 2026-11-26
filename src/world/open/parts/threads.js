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
import {residentPose, sitePosition} from '../site-rule.js';
import {campPeople} from '../content/people-sites.js';
import radioHillVoice from '../../../story/threads/content/radio-hill-voice.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {ROAD_REQUEST} from '../encounter-rule.js';
import {RADIO_ID, POCKET_ID, RADIO_MARK, radioMarked, radioPlace, radioBeat,
  radioMission, radioDestination, pocketWrecks, radioFuel} from '../content/radio-hill-voice-places.js';

export const OPEN_THREADS = requireSound([burnedCamp, strandedHauler, flagStory, dryPump, radioHillVoice], checkThread, 'Open Scablands storylines');
const regionId = view => view.regionId ?? view.groundRegion;
const playerPoint = view => view.player?.position ?? view.player;
const trackId = (thread, record) => `thread:${thread.id}/${record.beat}`;

function withPlaces(context) {
  const {world, view = {}} = context;
  const position = id => view.sitePositions?.[id]?.position ?? view.sitePositions?.[id] ?? sitePosition(id, world.open.landSeed);
  return {...context, contextCall: thread => thread.id === RADIO_ID ? {
    range: thread.notes.sign.onRoadWithin,
    anywhere: world.open.found.includes('radio-hill') && ['Friendly', 'Sworn'].includes(world.ledger.words['radio-hill']),
  } : undefined, placeAt: (place, cast) => {
      const hauler = haulerPlaces(world);
      if (place?.checkpoint?.who === 'traders') return hauler.sign ?? null;
      if (typeof place === 'string' && Object.hasOwn(hauler, place)) return hauler[place];
      const radio = view.checkpointsEnabled && Array.isArray(place) && ['radio-hill', POCKET_ID].includes(place[0])
        && radioPlace(place, position('radio-hill'), position(POCKET_ID));
      const point = radio || mallPlace(place) || placeForThread(place, cast, {...view, landSeed: world.open.landSeed});
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    allowsStart: thread => thread.id !== RADIO_ID || view.checkpointsEnabled && view.openRoam && view.partOfDay === 'dark' &&
      !view.onFoot && view.onRoad && witnessSign({sign: thread.sign, at: position('radio-hill'), call: {range: thread.notes.sign.onRoadWithin}}, view, 0, 0).witnessed,
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
  return liveSigns(OPEN_THREADS.filter(thread => thread.id === RADIO_ID ? context.view?.checkpointsEnabled === true :
    thread.id !== HAULER_ID || context.view?.checkpointsEnabled !== false), withPlaces(context));
}

function localCampVisit({world, view, placeAt}) {
  return SITES.find(({id, kind}) => kind === 'camp' && isFound(world, id) && stageOf(world, id) === 'camp' &&
    !world.ledger.marks.includes(visitId(id, world.ledger.night)) && distanceBetween(playerPoint(view), placeAt(id, {})) <= 40);
}


function radioTalkLine(row) {
  return {...row, speaker: ['hetty', 'bern', 'parrot', 'you', 'moss', 'cinder', 'rell', 'auntie-solder'].includes(row.speaker)
    ? row.speaker : row.as ?? row.speaker};
}

function radioTalkPoint(beat, {view, placeAt}, {cast}) {
  if (beat === 'second-voice' || beat === 'ramp' || beat === 'trap') return {speaker: 'hetty'};
  if (beat === 'pocket')
    return distanceBetween(playerPoint(view), placeAt([POCKET_ID, 'mouth'], cast)) <= 42 ? {speaker: 'parrot'} : null;
  if (!['other-voice', 'set-asked', 'on-the-air'].includes(beat) || !view.onFoot) return null;
  const position = placeAt(['radio-hill', 'hut'], cast);
  if (distanceBetween(playerPoint(view), position) > 2.5) return null;
  const speaker = beat === 'set-asked' ? 'bern' : 'hetty';
  // Use the hut door as the talk anchor even while the sisters follow their routines.
  return {speaker, position};
}

const voiceAtWar = radioHillVoice.beats['pocket-fight'].mission.rule.atWar;

function outputFor(thread, context, record, state, observed, decision, dt) {
  const {world, view, seconds, previousEvents} = context;
  const {beat: beatId} = record;
  const hill = thread.id === RADIO_ID;
  const beat = hill ? radioBeat(beatId, world) : thread.beats[beatId];
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
  const line = (id, row) => {
    text(id, `${row.as ?? nameOf(row.speaker) ?? rule.line(row.speaker)}: ${row.words}`);
    if (hill) cue(id, row.cue);
  };
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
  if (hill && beatId === 'take-set' && previousEvents.some(event => event.type === 'threadMissionAlert' && event.id === mission.id)) {
    mission.outcomes.seen.lines.forEach((row, index) => line('seen/' + index, row));
  }
  if (mission && decision.activeMission === mission.id) {
    const finished = previousEvents.find(event =>
      (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled') && event.id === mission.id);
    if (finished) {
      out.mission = null;
      out.release = holder;
      const outcomes = hill ? radioMission(mission, context, record).outcomes : mission.outcomes;
      const outcome = Object.hasOwn(outcomes ?? {}, finished.outcome) && outcomes[finished.outcome];
      if (outcome && rule.ask(outcome.when)) {
        (outcome.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`${beatId}/outcome/${index}`, row));
        cue(beatId, outcome.cue);
        const effects = hill && finished.outcome === 'caught' ? [mark(RADIO_MARK.watched),
          radioHillVoice.beats['wheels-off'].effects.find(row => row.type === 'mark')] : [];
        const num = hill ? '/' + (state.missionCount ?? 1) : '';
        move(`mission/${beatId}/${finished.outcome}${num}`, outcome, effects);
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

  const followed = hill ? ['ramp', 'pocket'].some(id => rule.has('entered', id)) :
    Object.keys(thread.beats).some(id => id !== firstBeat(thread) && rule.has('entered', id));
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

  if (hill && (!mission || decision.activeMission !== mission.id)) {
    const hillFound = world.open.found.includes('radio-hill');
    const homeFirst = (beatId === 'by-day' || beatId === 'other-voice') && !rule.has('entered', beatId) && !rule.ask({nights: 1});
    const destination = homeFirst ? ['tin-town', 'hearth'] : ({
      ramp: ['radio-hill', hillFound ? 'hut' : 'ramp-foot'], 'by-day': 'radio-hill',
      'other-voice': ['radio-hill', 'hut'], 'take-set': [POCKET_ID, 'park'],
    })[beatId];
    const markerKey = [].concat(destination ?? []).join('/');
    if (state.markerKey !== markerKey && (destination || state.markerKey)) {
      const at = destination && context.placeAt(destination, record.cast);
      if (!mission || at) out.requests.push({type: 'marker',
        place: at ? {...at, y: scablandsSurfaceHeightAt(at.x, at.z), radius: 5} : null});
      state.markerKey = markerKey;
    }
  }
  const ownedHold = context.holds.some(hold => hold.holder === holder);
  const entered = rule.has('entered', beatId);
  const staging = thread.id === FLAG_ID && FLAG_SCENES[beatId];
  const atTalk = hill ? radioTalkPoint(beatId, context, record) :
    !staging || view.onFoot === staging.foot && rule.ask({reach: staging.at, within: staging.within});
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
  const approachedCold = !hill && opening && beat.when === 'sign-seen' && !isFresh(thread, signRecord(thread, record, world), world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  if (hauling && beatId === 'gate' && !entered &&
      (!haulerAtGate(world) || distanceBetween(playerPoint(view), haulerGate) > 40)) return out;
  const carParked = !hill || beatId !== 'take-set' ||
    distanceBetween(view.carPosition, context.placeAt([POCKET_ID, 'park'], record.cast)) <= 16;
  const startingMission = mission && carParked && !decision.journey && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && !view.combatWrecking && !view.missionLeaving && !(mission.outing && view.outingAvailable === false);
  const returning = hill && state.returning && ['after-pocket', 'wheels-off', 'talking-over'].includes(beatId);
  const returningToRadio = hill && beatId === 'second-voice' && !state.beatSeconds['first-call'] && rule.has('entered', 'first-call');
  const ready = approachedCold || returningToRadio || rule.ask(beat.when);
  if ((!entered || startingMission || returning) && ready) {
    if (mission) {
      if (!startingMission) return out;
      const authored = hill ? radioMission(mission, context, record) : hauling ? haulerMission(mission, world) :
        {...mission, enemy: resolveRoles(mission.enemy, record.cast)};
      const route = prepareThreadMission(authored, place => context.placeAt(place, record.cast));
      if (!route) return out;
      decision.activeMission = mission.id;
      out.mission = mission.id;
      const systems = mission.holds ?? USUAL_HOLDS;
      if (systems.length) out.hold = {holder, systems};
      out.events.push({type: 'threadMission', id: mission.id, thread: thread.id, beat: beatId, holder, mission: authored, route});
      if (hauling) out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats', posts: []});
      if (hill) state.missionCount = (state.missionCount ?? 0) + 1;
      if (entered) return out;
    }
    state.beatSeconds[beatId] = seconds;
    if (hauling && (opening || beatId === 'ridge')) {
      const stop = haulerStop(world);
      out.requests.push({type: 'missionLookouts', id: HAULER_ID + '/sign', group: 'road-rats',
        posts: (beatId === 'ridge' || haulerIsTrap(world)) ? stop.starts : []});
    }
    state.returning = false;
    const entry = [remember('entered', beatId), ...rule.effects(beat.effects)];
    if (hill && mission) (mission.lines ?? []).filter(row => !row.moment && rule.ask(row.when))
      .forEach((row, i) => line(beatId + '/mission/' + i, row));
    if (hill && beatId === 'wheels-off' && !view.combatWrecking)
      out.requests.push({type: ROAD_REQUEST, action: 'mission-loss', id: RADIO_ID});
    (beat.lines ?? []).filter(row => rule.ask(row.when) && !(opening && thread.sign.kind === 'smoke' && row.radio)).forEach((row, index) => line(`${beatId}/${index}`, row));
    if (!approachedCold) cue(beatId, beat.cue ?? (opening && !(hill && !beat.choices?.length) ? thread.sign.cue : undefined));
    if (beat.next && !beat.choices?.length && !beat.mission && !beat.explore?.length && !beat.questions?.length && !beat.mend && !beat.mends?.length)
      entry.push(...rule.move(beat.next));
    const enteredId = hill ? beatId + '/' + world.open.journal.filter(row => row.type === 'thread' && row.key === RADIO_ID).length : beatId;
    choose(`entered/${enteredId}`, entry);
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
    if (hill ? !view.onFoot || !rule.ask({reach: [POCKET_ID, item.id], within: 4}) :
      hauling ? !haulerReading(beat, item, context, state, dt) : !view.onFoot) continue;
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
  if (hill) {
    if (mission) return out;
    const moveRadio = option => {
      if (option.id !== 'read-the-news' || !rule.ask(voiceAtWar)) cue(option.id, option.cue);
      if (option.thought) text('choice/' + option.id, option.thought);
      (option.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line('choice/' + option.id + '/' + index, row));
      const effects = [remember('chose', option.id)];
      if (option.id === 'threaten') effects.push(mark(RADIO_MARK.watched));
      const next = {'by-day': 'by-day', 'talk-over-her': 'talking-over'}[option.id];
      const attempt = world.open.journal.filter(row => row.type === 'thread' && row.key === thread.id).length;
      move('choice/' + option.id + '/' + attempt, next ? {...option, next} : option, effects);
    };
    if (opening) {
      if (!beat.choices?.length) return out;
      if (view.onFoot) return out;
      const elapsed = seconds - state.beatSeconds[beatId];
      state.stopped = Math.abs(view.carSpeedMph ?? 0) < .5 ? (state.stopped ?? 0) + dt : 0;
      if (state.stopped + 1e-9 >= beat.notes.choices.stop.stoppedSeconds) moveRadio(beat.choices[0]);
      else if (elapsed >= 12) moveRadio(beat.choices[1]);
      return out;
    }
    if (beatId === 'take-set') return out;
    if (beatId === 'second-voice' && !followed && state.callNight !== world.ledger.night && view.partOfDay === 'dark' &&
        witnessSign({sign: thread.sign, at: context.placeAt(thread.sign.at, record.cast),
          call: context.contextCall(thread)}, view, 0, dt).witnessed) {
      state.callNight = world.ledger.night;
      const began = world.open.journal.findLast(row => row.key === RADIO_ID && row.after?.beat === beatId)?.night;
      if (world.ledger.night > began) {
        const first = radioBeat('first-call', world);
        first.lines.filter(row => rule.ask(row.when)).forEach((row, index) => line('repeat/' + world.ledger.night + '/' + index, row));
        cue(beatId, first.cue ?? thread.sign.cue);
      }
    }
    const options = (beat.choices ?? []).filter(row => rule.ask(row.when));
    const chooseByDriving = options.find(row => {
      const at = radioDestination(beatId, row.id);
      return at && !view.onFoot && rule.ask({reach: at, within: beatId === 'second-voice' ? 34 : 15}) &&
        !(row.id === 'to-the-red-lamp' && view.partOfDay !== 'dark' && !world.open.found.includes('radio-hill'));
    });
    if (chooseByDriving) { moveRadio(chooseByDriving); return out; }
    if (beatId === 'pocket') {
      const waiting = state.waiting;
      if (waiting !== undefined) {
        if (!rule.ask({reach: [POCKET_ID, 'mouth'], within: 42}) || Math.abs(view.carSpeedMph ?? 0) >= .5) delete state.waiting;
        else if (seconds - waiting >= 20) {
          delete state.waiting;
          moveRadio(options.find(row => row.id === 'wait-dark'));
          const sawParrot = beat.thoughts.find(row => row.slot === 'after' && row.when?.chose === 'wait-dark');
          if (sawParrot) text('pocket/saw-parrot', sawParrot.thought);
          return out;
        }
      }
    }
    const spoken = options.filter(row => row.by !== 'go');
    const id = RADIO_ID + '/' + beatId + '/decision';
    for (const question of beat.questions ?? []) if (!rule.has('asked', question.id) &&
      (view.jobEvents ?? []).some(event => event.type === 'openTalkQuestion' && event.scene === id && event.id === question.id)) {
      const tested = radioHillVoice.beats['second-voice'].questions[0].effects[0];
      const effects = rule.effects(question.effects).map(effect => effect.id === tested.id ? tested : effect);
      once('asked', question.id, effects);
      cue(question.id, question.cue);
    }
    const picked = completed.find(event => event.scene === id);
    const selected = spoken.find(row => picked?.id === row.id);
    if (selected && atTalk) {
      if (selected.id === 'wait-dark') state.waiting = seconds;
      else moveRadio(selected);
      return out;
    }
    if (atTalk && view.openRoam && decision.interact) {
      const questions = (beat.questions ?? []).filter(row => !rule.has('asked', row.id) && rule.ask(row.when)).map(row => ({
        id: row.id, words: row.words, lines: row.lines.filter(line => rule.ask(line.when)).map(radioTalkLine),
      }));
      const choices = spoken.map(row => ({id: row.id, words: row.words, detail: row.plain, thought: row.thought}));
      if (questions.length) choices.push({id: 'leave', words: 'End the conversation.'});
      if (choices.length) {
        decision.interact = false;
        out.requests.push({type: 'talk', threadPriority: true, id, speaker: atTalk.speaker, position: atTalk.position,
          anchorPosition: !!atTalk.position,
          radio: !atTalk.position, scene: {id, questions, choices}});
      }
    }
    return out;
  }
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
      const availableThreads = enabled ? threads : threads.filter(thread => thread !== dryPump && thread.id !== FLAG_ID && thread.id !== HAULER_ID && thread.id !== RADIO_ID);
      if (enabled) state.places.dryPumpEnabled = true;
      const region = regionId(view);
      const visit = localCampVisit(context);
      const choices = visit ? [{id: visitId(visit.id, night), effects: [mark(visitId(visit.id, night))]}] : [];
      if (!isHeld(holds, 'signs') && region && !state.regions.includes(region)) {
        choices.push(...directThreads(availableThreads, context, `region-${region}`));
        state.regions.push(region);
      }
      // The radio has its own opportunity when dusk gives way to darkness, even in
      // a region already visited by day. Recheck on a road until the nightly draw runs.
      const radioReady = availableThreads.includes(radioHillVoice) && context.allowsStart(radioHillVoice) &&
        !world.open.threads[RADIO_ID] && !isHeld(holds, 'signs') && previous.radioNight !== night;
      if (radioReady && !choices.some(choice => choice.effects.some(effect => effect.type === 'thread')))
        choices.push(...directThreads(availableThreads, context, 'radio-dark'));
      if (enabled) state.radioNight = radioReady ? night : previous.radioNight;
      const pocket = enabled && availableThreads.includes(radioHillVoice) &&
        (world.open.threads[RADIO_ID] || world.open.found.includes(POCKET_ID))
        ? sitePosition(POCKET_ID, world.open.landSeed) : null;
      const events = [], requests = [];
      if (pocket) state.pocketSeed = world.open.landSeed;
      if (state.pocketSeed !== previous.pocketSeed)
        requests.push({type: 'solids', id: POCKET_ID, solids: pocket ? pocketWrecks(pocket) : []});
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
        if (thread.id === RADIO_ID) {
          const fuel = radioFuel(world, view, at => context.placeAt(at, record.cast));
          if (fuel?.choice) choices.push(fuel.choice);
          if (fuel?.id) {
            const used = view.jobEvents?.some(event => event.type === 'talkChoice' && event.scene === fuel.id && event.id === fuel.id);
            if (used) choices.push({id: fuel.id, effects: fuel.effects});
            else if (view.openRoam && decision.interact) {
              decision.interact = false;
              requests.push({type: 'talk', threadPriority: true, id: fuel.id, speaker: fuel.speaker, position: fuel.point,
                scene: {id: fuel.id, choices: [{id: fuel.id, words: fuel.words}]}});
            }
          }
        }
        const laterRule = threadRule(thread, threadContext, record);
        const laterRows = thread.id === FLAG_ID ? FLAG_TALK_ROWS : thread.later ?? [];
        const later = laterRows.find(row => {
          if (!view.onFoot || !laterRule.ask(row.when) || laterRule.has('later', row.id)) return false;
          if (thread.id === FLAG_ID && (!record.end || night - (world.open.journal.findLast(change =>
            change.type === 'thread' && change.key === thread.id && change.after.end)?.night ?? night) < row.afterNights)) return false;
          if (thread.id === RADIO_ID && row.by === 'road-rats') return false;
          if (thread.id === RADIO_ID && row.by === 'dot') {
            const aged = world.open.journal.findLast(change => change.type === 'thread' && change.key === RADIO_ID && change.after.end);
            if (!aged || night - aged.night < 2) return false;
            const dot = view.people?.find(person => person.id === 'dot')?.position;
            return distanceBetween(playerPoint(view), dot) <= 2.5 || distanceBetween(playerPoint(view), NIGHT_2_SITES.gate) <= 3;
          }
          const at = row.at ?? (thread.id === FLAG_ID && FLAG_LATER_PLACES[row.by]);
          if (at) return laterRule.ask({reach: thread.id === RADIO_ID ? ['radio-hill', 'hut'] : at, within: 3});
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
          requests.push({type: 'talk', id, speaker: later.by, threadPriority: thread.id === RADIO_ID,
            ...(thread.id === RADIO_ID ? {position: playerPoint(view)} : {}),
            scene: {id,
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
        if (thread.id === RADIO_ID && details.lastBeat !== record.beat) {
          details.lastBeat = record.beat;
          details.returning = true;
          details.stopped = 0;
          details.beatSeconds[record.beat] = context.seconds;
        }
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, threadContext, record, details, sight?.witnessed ?? false, decision, dt);
        (state.progress ??= {})[thread.id] = details;
        if (thread.id === RADIO_ID) {
          state.radioDark = view.partOfDay === 'dark' || view.partOfDay === 'dusk';
          if (events.some(event => event.cue === 'open.lamp.blink') || out.events.some(event => event.cue === 'open.lamp.blink'))
            details.blinkedAt = context.seconds;
        }
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
