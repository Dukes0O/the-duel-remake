import {checkThread, requireSound} from '../check-tables.js';
import {applyEffects} from '../open-effects.js';
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
import {canFindSite, distance, residentPose, sitePosition} from '../site-rule.js';
import {ransomEffects, ransomTerms, settleRoadRatsRansom, claimRoadRatsSurcharge, roadRatsPrice} from '../ransom-rule.js';
import {availableRescueHelpers, buyBackPrice, commitParty, currentParty, growersHome, partyAttempt, rescueEffects,
  rescueMission, heldGrowers, rescuePage} from '../burned-rescue-rule.js';
import {nobodyComes, raisedPriceLine} from '../../../story/scenes/burned-camp-home.js';
import dryPump from '../../../story/threads/content/dry-pump.js';
import {mallPlace} from '../content/dry-pump-places.js';
import {DRY_PUMP_HOLD, dryPumpAllowsCamp, dryPumpStep} from './dry-pump.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {placeForThread, radioScene} from '../../../story/scenes/burned-camp.js';
import {scoutGullyRoute} from '../content/burned-scout.js';
import strandedHauler from '../../../story/threads/content/stranded-hauler.js';
import {HAULER_ID, haulerPlaces, haulerStop, haulerMission, haulerReading, haulerAction, haulerGate,
  haulerAtGate, haulerMarked, haulerIsTrap} from '../content/stranded-hauler-places.js';
import {haulerTalkScene, haulerGateNews} from '../content/talk-hauler.js';
import {haulerVisitor} from '../content/stranded-hauler-places.js';
import {flagStory, FLAG_ID, FLAG_SCENES, FLAG_LATER_PLACES, FLAG_TALK_ROWS, stagedFlag, flagSolids} from '../content/somebody-elses-flag-places.js';
import radioHillVoice from '../../../story/threads/content/radio-hill-voice.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {ROAD_REQUEST} from '../encounter-rule.js';
import {RADIO_ID, POCKET_ID, RADIO_MARK, radioMarked, radioPlace, radioBeat,
  radioMission, radioDestination, pocketWrecks, radioFuel} from '../content/radio-hill-voice-places.js';

import {MALL_ROAD_TALK} from '../content/talk-threads.js';
import {campPeople} from '../content/people-sites.js';
import mallRoadToll from '../../../story/threads/content/mall-road-toll.js';
import {TOLL_GATE, TOLL_ID, TOLL_SITE, stagedToll, tollPlace, tollTalk, tollOffer, tollMissionResult,
  tollGateStanding, tollGateSolids, tollIgnored, tollPoleUp, atTollPerson,
  tollAfterEnd, tollParkedCars, unusedTollPass, pastTollPole} from '../content/mall-road-toll-places.js';

import {lightsLater} from '../content/talk-lights.js';
import {LIGHTS_ID, lightsStory, lightsPlace, lightsRoad, lightsGo, lightsMission} from '../content/lights-on-the-whites-places.js';

import daceStory from '../../../story/threads/content/dace-goes-looking.js';
import {DACE_ID, DACE_PLACES} from '../content/dace-goes-looking-places.js';
import {daceCanCast, daceSignIsOut, daceStep} from '../content/dace-goes-looking-rule.js';

export const OPEN_THREADS = requireSound([burnedCamp, strandedHauler, flagStory, dryPump, marketDay, runaway, mallRoadToll, radioHillVoice, lightsStory, daceStory], checkThread, 'Open Scablands storylines');
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
      if (Array.isArray(place) && place[0] === 'tin-town' && place[1] === 'forge-yard') return DACE_PLACES.pickup;
      const hauler = haulerPlaces(world);
      if (Array.isArray(place) && place[0] === 'rats-nest' && place[1] === 'rescue-gully') return [...scoutGullyRoute].reverse();
      if (Array.isArray(place) && place[0] === 'grey-camp' && place[1]?.startsWith('rescue-')) {
        const centre = position('grey-camp');
        if (!centre) return null;
        const offset = {'rescue-lookout': [-25, 32], 'rescue-pen': [9, 5], 'rescue-tip': [12, -31], 'rescue-riders': [-34, 45]}[place[1]];
        return offset && {x: centre.x + offset[0], z: centre.z + offset[1]};
      }
      if (place?.checkpoint?.who === 'traders') return hauler.sign ?? null;
      if (typeof place === 'string' && Object.hasOwn(hauler, place)) return hauler[place];
      const toll = tollPlace(place);
      if (toll) return toll;
      const radio = view.checkpointsEnabled && Array.isArray(place) && ['radio-hill', POCKET_ID].includes(place[0])
        && radioPlace(place, position('radio-hill'), position(POCKET_ID));
      const point = lightsPlace(place, world.open.landSeed) || radio || runawayPlace(place, cast) || mallPlace(place) || placeForThread(place, cast, {...view, landSeed: world.open.landSeed});
      if (!point || !Array.isArray(place)) return point;
      const spot = view.sitePositions?.[place[0]]?.spots?.[place[1]];
      return spot ? {...point, heading: spot.heading, halfAngle: spot.halfAngle, eye: spot.eye,
        range: spot.range, heap: spot.heap} : point;
    },
    allowsStart: thread => (thread.id !== DACE_ID || (view.checkpointsEnabled === true || context.bankedHearth && view.checkpointsEnabled !== false) && daceSignIsOut({...context, view})) &&
      (thread.id !== LIGHTS_ID || (view.checkpointsEnabled && view.openRoam && !view.missionActive && view.outingAvailable !== false &&
      view.partOfDay === 'dark' && !view.onFoot && lightsRoad(playerPoint(view)) && !context.holds?.some(hold => hold.holder.startsWith('thread:')))) &&
      (thread.id !== RADIO_ID || view.checkpointsEnabled && view.openRoam && view.partOfDay === 'dark' &&
      !view.onFoot && view.onRoad && witnessSign({sign: thread.sign, at: position('radio-hill'), call: {range: thread.notes.sign.onRoadWithin}}, view, 0, 0).witnessed),
    dormant: (thread, record) => thread.id === LIGHTS_ID && record?.beat === 'shelved',
    signFor: thread => thread === runaway ? RUNAWAY_SIGN : thread.sign,
    allowsCast: (thread, role, id, cast) => thread.id === DACE_ID ? daceCanCast(id, world) : thread === marketDay ? allowsMarketCast(role, id, cast, world) :
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
  const banked = applyThreadDirector(available, withPlaces({...context, bankedHearth: true}), 'hearth');
  if (!available.includes(burnedCamp) || !banked.ledger.marks.includes('burned-camp/stayed-inside') ||
      banked.ledger.marks.includes('burned-camp/bean-bed-ready')) return banked;
  const moved = banked.ledger.history.findLast(row => row.type === 'mark' && row.key === 'burned-camp/stayed-inside');
  if (!moved || banked.ledger.night - moved.night < 3) return banked;
  return applyEffects(banked, {id: 'burned-camp/first-beans', effects: rescuePage([
    {type: 'mark', id: 'burned-camp/bean-bed-ready', text: 'The beans by the south fence are feeding Tin Town.'},
  ])}).world;
}

export function openThreadSigns(context) {
  const threads = OPEN_THREADS.filter(thread => (thread !== runaway || context.view?.runawayVisible) &&
    (thread.id !== DACE_ID || context.view?.checkpointsEnabled === true && daceSignIsOut(context)) &&
    (thread.id !== LIGHTS_ID || context.view?.checkpointsEnabled === true) &&
    (thread.id !== RADIO_ID || context.view?.checkpointsEnabled === true) &&
    (thread.id !== HAULER_ID || context.view?.checkpointsEnabled !== false) &&
    (thread.id !== TOLL_ID || context.view?.checkpointsEnabled === true) &&
    (thread !== marketDay ||
      (context.world.open.threads[marketDay.id] && marketSignReady(context.world, context.world.open.threads[marketDay.id]))));
  return liveSigns(threads, withPlaces(context));
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
  return {speaker, position: {...position, y: scablandsSurfaceHeightAt(position.x, position.z)}};
}

const voiceAtWar = radioHillVoice.beats['pocket-fight'].mission.rule.atWar;

function outputFor(thread, context, record, state, observed, decision, dt) {
  const isRunaway = thread === runaway;
  const burned = thread === burnedCamp;
  const {world, view, seconds, previousEvents} = context;
  const hill = thread.id === RADIO_ID;
  const beat = isRunaway ? runawayBeat(record, context) : hill ? radioBeat(record.beat, world) : thread.beats[record.beat];
  const beatId = beat?.id ?? record.beat;
  const rescue = burned && beatId === 'rescue';
  const hearth = burned && ['home', 'party'].includes(beatId);
  const campGate = burned && beatId === 'gate';
  const attempt = (hearth || rescue) ? partyAttempt(world) : 0;
  const attemptSuffix = hearth || rescue ? '/' + attempt : '';
  const atCampGate = () => rule.ask({reach: ['tin-town', 'gate'], within: 100});
  const priceDrive = burned && beatId === 'buy-back-drive';
  const captive = thread.id + '/pen';
  const outingKey = `${beatId}-start/${attempt}/night-${world.ledger.night}`;
  const outingStarted = (rescue || priceDrive) && world.ledger.marks.includes(thread.id + '/' + outingKey);
  const hauling = thread.id === HAULER_ID;
  const lights = thread.id === LIGHTS_ID;
  const atDeck = view.onFoot && view.fighter?.deckPlate === 'whites-patience-deck';
  const byCar = lights && !view.onFoot && beatId !== 'aboard';
  const visit = hauling && haulerMarked(world, 'second-truck') ? '/again' : '';
  if (state.visit !== visit) { state.reading = {}; state.mending = 0; state.lifting = false; }
  state.visit = visit;
  const toll = thread.id === TOLL_ID;
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
  const line = (id, row) => {
    text(id, `${speaker(row)}: ${row.words}`);
    if (hill) cue(id, row.cue);
  };
  const cue = (id, sound) => { if (sound) out.events.push({type: 'threadCue', id, cue: sound}); };
  const move = (id, row, effects = [], authoredEffects = row.effects) => {
    const cast = row.cast ? {...record.cast, ...row.cast} : undefined;
    const next = rule.move(row.next, cast);
    // Some authored end names also have a report scene on the way out.
    const travel = lights ? next.map(effect => effect.end && effect.end !== beatId && thread.beats[effect.end] ?
      {type: 'thread', id: thread.id, to: effect.end} : effect) : next;
    const written = [...effects, ...rule.effects(authoredEffects, cast), ...travel];
    choose(id, burned && (hearth || rescue || campGate || beatId === 'haul-glass') ? rescuePage(written) : written);
  };

  if (!beat) return out;
  if ((hearth || campGate || rescue || burned && ['buy-back-drive', 'buy-back-ransom', 'haul-glass'].includes(beatId))
      && !view.checkpointsEnabled) return out;
  if (lights && beatId === 'shelved') return out;
  // A beat that `takes` the player holds them on foot at one spot and the car at another for as long as the storyline
  // stands there, and takes them back there in any roam that meets it again. The day is brought on to dusk.
  if (beat.takes && !state.taken && view.openRoam && view.checkpointsEnabled && rule.ask(beat.when)) {
    const foot = context.placeAt(beat.takes.foot, record.cast), car = context.placeAt(beat.takes.car, record.cast);
    if (foot && car) {
      state.taken = true;
      state.heldCar = {x: car.x, z: car.z};
      out.dusk = true;
      out.requests.push({type: 'threadTaken', id: thread.id, held: true, foot, car});
    }
  }
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
    if (toll && previousEvents.some(event => event.type === 'threadMissionOffer' && event.id === mission.id))
      out.requests.push(tollOffer(mission, beat, rule));
    if (toll && beatId === 'stand') {
      const selected = (view.jobEvents ?? []).find(event => event.type === 'talkChoice' && event.scene === mission.id + '/offer');
      const option = beat.choices.find(row => selected?.id === mission.id + '/' + row.id);
      if (option) {
        if (option.thought) text('choice/' + option.id, option.thought);
        (option.lines ?? []).forEach((row, index) => line('choice/' + option.id + '/' + index, row));
      }
    }
    const finished = previousEvents.find(event =>
      (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled') && event.id === mission.id);
    if (finished) {
      out.mission = null;
      out.release = holder;
      const outcomes = hill ? radioMission(mission, context, record).outcomes : mission.outcomes;
      const sold = toll && finished.outcome === 'sold';
      const outcome = sold ? beat.choices.find(row => row.id === 'drive-through') :
        Object.hasOwn(outcomes ?? {}, finished.outcome) && outcomes[finished.outcome];
      if (outcome && rule.ask(outcome.when)) {
        if (!rescue || finished.outcome !== 'none-home' || currentParty(world).some(row => row.id === 'rell'))
          (outcome.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line(`${beatId}/outcome/${index}`, row));
        if (!(toll && beatId === 'break')) cue(beatId, outcome.cue);
        if (toll) {
          const extra = tollMissionResult(beatId, finished.outcome, finished.result, world);
          const written = (outcome.effects ?? []).filter(effect => beatId !== 'stand' ||
            finished.outcome !== 'held' || finished.result?.kept?.some(id => effect.id?.endsWith('guard-' + id) ||
              effect.person === (id === 'camp' ? '@camp.people' : id)));
          move(`mission/${beatId}/${finished.outcome}`, outcome, sold ? [remember('chose', 'drive-through')] : [],
            [...written, ...extra]);
        } else {
          const effects = hill && finished.outcome === 'caught' ? [mark(RADIO_MARK.watched),
            radioHillVoice.beats['wheels-off'].effects.find(row => row.type === 'mark')] : [];
          const num = hill ? '/' + (state.missionCount ?? 1) : attemptSuffix;
          if (rescue) effects.push(...rescueEffects(world, finished.outcome, finished.result));
          move(`mission/${beatId}/${finished.outcome}${num}`, outcome, effects);
        }
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
    isRunaway ? rule.ask({fact: 'mark', id: 'runaway/found-him'}) :
    Object.keys(thread.beats).some(id => id !== firstBeat(thread) && rule.has('entered', id));
  const unhelped = hauling && !haulerMarked(world, 'helped') && beatId !== 'between';
  const ignored = toll ? (tollIgnored(world, record) ? thread.ignored : null) :
    isRunaway ? (!record.end && !followed && ['prints', 'shed'].includes(record.beat) &&
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
  if (isRunaway && !view.checkpointsEnabled) return out;
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
  const approachedCold = !lights && !hill && !isRunaway && opening && beat.when === 'sign-seen' && !isFresh(thread, signRecord(thread, record, world), world.ledger.night) &&
    rule.ask({reach: thread.sign.at});
  if (hauling && beatId === 'gate' && !entered &&
      (!haulerAtGate(world) || distanceBetween(playerPoint(view), haulerGate) > 40)) return out;
  const carParked = !hill || beatId !== 'take-set' ||
    distanceBetween(view.carPosition, context.placeAt([POCKET_ID, 'park'], record.cast)) <= 16;
  const startingMission = mission && carParked && !decision.journey && !decision.activeMission && view.openRoam && view.checkpointsEnabled &&
    (mission.by !== 'car' || !view.onFoot) && (!isRunaway || mission.by !== 'foot' || view.onFoot) &&
    (!view.combatWrecking || (isRunaway && beatId === 'breakout')) && !view.missionLeaving &&
    !(mission.outing && view.outingAvailable === false && !outingStarted) &&
    (!priceDrive || !view.dayClock || outingStarted || view.partOfDay === 'dawn') &&
    (!rescue || atCampGate() && (!view.dayClock || outingStarted ||
      view.partOfDay === 'dusk' && world.ledger.history.some(row => row.key === thread.id + '/party/' + attempt &&
        row.night < world.ledger.night)));
  const returning = hill && state.returning && ['after-pocket', 'wheels-off', 'talking-over'].includes(beatId);
  const returningToRadio = hill && beatId === 'second-voice' && !state.beatSeconds['first-call'] && rule.has('entered', 'first-call');
  const tollPayment = toll && beatId === 'paying';
  const ready = approachedCold || returningToRadio || rule.ask(beat.when);
  if ((!entered || startingMission || returning || tollPayment) && (!lights || beatId !== 'aboard' || atDeck) && ready) {
    if (mission) {
      if (!startingMission) return out;
      const authored = rescue ? rescueMission(mission, world, record.cast, rule.ask) :
        hill ? radioMission(mission, context, record) : hauling ? haulerMission(mission, world) :
        lights ? lightsMission(mission, world, state, seconds) :
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
      if ((rescue || priceDrive) && !outingStarted) {
        choose(outingKey, [mark(thread.id + '/' + outingKey)]);
        if (rescue) cue(beatId, 'open.party.ride');
      }
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
    // A ransom is paid on entry, from what the world holds now (ransom-rule.js). The choice's id names the ransom, so
    // that a store left short is read as a loss by the apprentice run.
    if (beat.ransom) entry.push(...(beat.ransom.roadRats ? settleRoadRatsRansom(beat.ransom, world, rule.ask, captive)
      : ransomEffects(ransomTerms(beat.ransom, world, rule.ask))));
    if (burned && beatId === 'buy-back-ransom' && heldGrowers(world).length)
      entry.push(...ransomEffects(ransomTerms({price: [{scrap: buyBackPrice(world)}]}, world)), ...growersHome(world));
    if (burned && beatId === 'pen') {
      const claim = claimRoadRatsSurcharge(world, captive);
      if (claim.length) {
        entry.push(...claim);
        line('next-ransom', raisedPriceLine);
      }
    }
    if (beat.leaves) out.leave = {to: beat.leaves, night: world.ledger.night};
    // `frees` lets go of both; a spot (the held car's) puts the player beside the car to drive it home.
    if (beat.frees && state.taken) {
      const car = typeof beat.frees === 'string' ? state.heldCar : null;
      out.requests.push({type: 'threadTaken', id: thread.id, held: false, ...(car ? {foot: {x: car.x + 3, z: car.z}} : {})});
      state.taken = false;
    }
    if (hill && mission) (mission.lines ?? []).filter(row => !row.moment && rule.ask(row.when))
      .forEach((row, i) => line(beatId + '/mission/' + i, row));
    if (hill && beatId === 'wheels-off' && !view.combatWrecking)
      out.requests.push({type: ROAD_REQUEST, action: 'mission-loss', id: RADIO_ID});
    (beat.oneTalk && (hearth || campGate) ? [] : beat.lines ?? []).filter(row => (!isRunaway || !(beat.walked || beat.choices?.some(choice => choice.by !== 'go'))) && rule.ask(row.when) && !(opening && thread.sign.kind === 'smoke' && row.radio)).forEach((row, index) => line(`${beatId}/${index}`, row));
    if (!approachedCold) cue(beatId, beat.cue ?? (opening && !(hill && !beat.choices?.length) ? thread.sign.cue : undefined));
    if (toll) (beat.cues ?? []).forEach((sound, index) => cue(beatId + '/' + index, sound));
    if (!lights && !beat.walked && beat.next && !beat.choices?.length && !beat.mission && !beat.explore?.length && !beat.questions?.length && !beat.mend && !beat.mends?.length)
      entry.push(...rule.move(beat.next));
    const paidCount = tollPayment ? world.ledger.marks.filter(id => id.startsWith(TOLL_ID + '/paid-')).length : 0;
    const enteredId = hill ? beatId + '/' + world.open.journal.filter(row => row.type === 'thread' && row.key === RADIO_ID).length : beatId + (tollPayment ? '/' + paidCount : '');
    choose(`entered/${enteredId}`, burned && beatId === 'buy-back-ransom' ? rescuePage(entry) : entry);
    if (opening && !approachedCold) (beat.thoughts ?? []).forEach((row, index) => {
      const thought = typeof row === 'string' ? {thought: row} : row;
      if (rule.ask(thought.when)) text(`${beatId}/thought/${index}`, thought.thought);
    });
    return out;
  }
  if (!rule.has('entered', beatId)) return out;
  if ((hearth || campGate) && !rule.ask(beat.when)) return out;
  if (hearth && view.dayClock && !['dusk', 'dark'].includes(view.partOfDay)) return out;
  if (campGate && view.dayClock && view.partOfDay !== 'dawn') return out;
  if (burned && beatId === 'party') {
    const id = trackId(thread, record).slice('thread:'.length) + '/decision';
    const helpers = availableRescueHelpers(world, record.cast, rule.ask);
    const picked = state.party ?? [];
    const selected = (view.jobEvents ?? []).find(event => event.type === 'talkChoice' && event.scene === id &&
      event.id?.startsWith(id + '/'))?.id.slice(id.length + 1);
    const helper = helpers.find(row => row.id === selected);
    if (helper) {
      const nextParty = picked.includes(selected) ? picked.filter(id => id !== selected) : [...picked, selected];
      if (commitParty(world, helpers, nextParty)) state.party = nextParty;
    } else if (selected === 'ride' || selected === 'back') {
      const option = beat.choices.find(row => row.id === selected);
      const effects = selected === 'ride' ? commitParty(world, helpers, picked) : [];
      if (effects) {
        const visit = world.open.journal.filter(row => row.type === 'thread' && row.key === thread.id).length;
        move('choice/' + selected + '/' + visit, option, effects);
        state.party = [];
        return out;
      }
    }
    if (view.onFoot && view.openRoam && (decision.interact || helper)) {
      decision.interact = false;
      const picked = state.party ?? [];
      const choices = helpers.filter(row => picked.includes(row.id) || commitParty(world, helpers, [...picked, row.id])).map(row => ({
        id: id + '/' + row.id, words: picked.includes(row.id) ? 'Let ' + (row.as ?? nameOf(row.person)) + ' stay.' : row.pick,
      }));
      choices.push(...beat.choices.map(row => ({id: id + '/' + row.id, words: row.words})));
      out.requests.push({type: 'talk', id, scene: {id, lines: !helpers.length ? [nobodyComes] : [], choices},
        speaker: 'auntie-solder', threadPriority: true, radio: true});
    }
    return out;
  }
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
  if (!opening && !isRunaway && !beat.oneTalk && roadThoughtsReady) (beat.thoughts ?? []).forEach((row, index) => {
    const thought = typeof row === 'string' ? {thought: row} : row, id = `${beatId}-${index}`;
    if (rule.has('thought', id) || !rule.ask(thought.when)) return;
    once('thought', id);
    text(`${beatId}/thought/${index}`, thought.thought);
  });
  for (const item of beat.explore ?? []) {
    if (hill ? !view.onFoot || !rule.ask({reach: [POCKET_ID, item.id], within: 4}) :
      hauling ? !haulerReading(beat, item, context, state, dt) : !view.onFoot) continue;
    if (rule.has('found', item.id) || !rule.ask(item.when) ||
        toll && distanceBetween(playerPoint(view), tollPlace([TOLL_GATE, 'buggy'])) > 3) continue;
    once('found', item.id, rule.effects(item.effects));
    if (item.thought) text(`clue/${item.id}`, item.thought);
    cue(item.id, item.cue ?? beat.cue);
  }
  if (hauling && beatId === 'trap-road' && state.reading?.['high-ground']?.seconds >= 8) {
    move('lookout-spotted', {next: 'trap-fight'});
    cue('lookout-spotted', 'open.trap.sprung');
    return out;
  }

  if (toll) {
    const {request, asked = [], option: spokenOption} = tollTalk(context, record, beat, rule);
    const at = playerPoint(view);
    const driving = beatId === 'gate' && !view.onFoot && view.openRoam && (view.carSpeedMph ?? 0) > 4;
    const driveChoice = driving && [
      ['round', distanceBetween(at, tollPlace([TOLL_GATE, 'turn'])) <= 22],
      ['break', !tollPoleUp(world, record) && distanceBetween(at, tollPlace(TOLL_GATE)) <= 18 &&
        (view.speedKmh ?? 0) >= 50],
      ['home', rule.ask({reach: ['tin-town', 'hearth'], within: 55})],
    ].find(([, reached]) => reached)?.[0];
    const option = spokenOption ?? beat.choices?.find(row => row.id === driveChoice);
    if (request && decision.interact) {
      decision.interact = false;
      out.requests.push(request);
    }
    for (const row of asked) {
      const suffix = rule.has('asked', row.id) ? '/again' : '';
      choose('asked/' + row.id + suffix, [remember('asked', row.id), ...rule.effects(row.effects)]);
    }
    if (option) {
      cue(option.id, option.cue);
      const thought = typeof option.thought === 'string' ? {thought: option.thought} : option.thought;
      if (thought && rule.ask(thought.when)) text('choice/' + option.id, thought.thought);
      (option.lines ?? []).filter(row => rule.ask(row.when)).forEach((row, index) => line('choice/' + option.id + '/' + index, row));
      const count = world.open.journal.filter(change => change.type === 'thread' && change.key === TOLL_ID).length;
      const occurrence = world.ledger.marks.filter(id => id.startsWith(TOLL_ID + '/paid-')).length;
      move('choice/' + option.id + '/' + count + '/' + occurrence, option, [remember('chose', option.id),
        ...(option.id === 'send-word' ? [mark(TOLL_ID + '/stood-called')] : [])]);
    }
    if (beatId === 'round' && view.onFoot && view.wrench &&
        distanceBetween(playerPoint(view), tollPlace([TOLL_GATE, 'buggy'])) <= 3) {
      state.wrench = (state.wrench ?? 0) + dt;
      const strip = beat.choices.find(row => row.id === 'strip');
      if (state.wrench >= beat.notes.choiceNumbers.strip.wrenchSeconds && rule.ask(strip.when)) {
        text('choice/strip', strip.thought);
        move('choice/strip', strip, [remember('chose', strip.id)]);
      }
    } else state.wrench = 0;
    if (mission) for (const [index, row] of (mission.lines ?? []).entries()) {
      const id = beatId + '-mission-' + index;
      if (row.moment !== 'afterSeconds' && rule.ask(row.when) && !rule.has('line', id)) {
        once('line', id);
        line(id, row);
      }
    }
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
  const radio = isRunaway || beat.oneTalk ? null : radioScene(thread, beat, rule);
  // One talk (`oneTalk`): a question asked in the decision's own talk is written down as a radio question is.
  const decisionId = `${thread.id}/${beatId}/decision`;
  if (beat.oneTalk && !hearth) for (const event of view.jobEvents ?? []) {
    const question = event.type === 'openTalkQuestion' && event.scene === decisionId && !rule.has('asked', event.id) &&
      beat.questions?.find(row => row.id === event.id);
    if (question) once('asked', question.id, rule.effects(question.effects));
  }
  const radioChoice = completed.find(event => event.id === `${thread.id}/radio-done` || radio && event.scene === radio.id);
  const asked = new Set([
    ...(radioChoice?.asked ?? []),
    ...(view.jobEvents ?? []).filter(event => event.type === 'openTalkQuestion' && event.scene === radio?.id).map(event => event.id),
  ]);
  for (const question of radio?.questions ?? []) if (asked.has(question.id)) {
    const authored = beat.questions.find(row => row.id === question.id);
    once('asked', question.id, rule.effects(authored.effects));
  }
  let questionTalk;
  if (!asked.size && radio && atTalk && rule.ask(beat.when) && (view.onFoot || hauling && beatId.endsWith('-road')) && decision.interact && !lights) {
    decision.interact = false;
    if (view.openRoam) {
      questionTalk = {type: 'talk', id: radio.id, scene: radio, speaker: radio.questions[0].lines[0]?.speaker, radio: true};
      out.requests.push(questionTalk);
    } else {
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
      if ((!lights || !thought.moment) && rule.ask(thought.when) && !rule.has('thought', id)) { once('thought', id); text(id, thought.thought); }
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

  const available = beat.choices?.filter(row => (hearth || !rule.has('chose', row.id) || !hauling && row.by === 'do' && row.next) && rule.ask(row.when)) ?? [];
  const spoken = available.filter(row => row.by === 'say' || !hauling && row.by === 'do' || !row.by);
  const lightsTalk = lights && (byCar || atDeck && rule.ask({reach: ['ships-in-sand', 'whites-bridge-wing'], within: 4})) && (beatId !== 'ships' || rule.ask(beat.when)) &&
    (beatId !== 'crew' && beatId !== 'crew-after-sounding' || rule.ask({reach: ['ships-in-sand', 'whites-crew'], within: 100}));
  if ((spoken.length || lightsTalk && radio) && atTalk && (lights ? lightsTalk : view.onFoot) && view.openRoam &&
      view.checkpointsEnabled && (decision.interact || questionTalk)) {
    decision.interact = false;
    const id = decisionId;
    const choices = spoken.map(row => ({id: `${id}/${row.id}`, words: lights ? rule.line(row.words) : rule.line(row.words).replace(/([^.!?])$/, '$1.'),
      ...(row.plain ? {detail: rule.line(row.plain)} : {})}));
    if (burned && beatId === 'pen') {
      const terms = roadRatsPrice(thread.beats.ransom.ransom, world, rule.ask, captive);
      const wait = choices.find(row => row.id.endsWith('/wait'));
      if (wait && terms.extra) {
        const fuel = terms.asked === 1 ? ' and one ember' : terms.asked ? ' and ' + terms.asked + ' embers' : '';
        wait.detail = 'Sump is asking ' + terms.scrap + ' scrap' + fuel + '.';
      }
    }
    if (questionTalk || lights && radio) {
      choices.push(...radio.choices);
      const scene = {...radio, choices};
      if (questionTalk) questionTalk.scene = scene;
      else out.requests.push({type: 'talk', id: radio.id, scene,
        speaker: 'you', radio: true, threadPriority: true});
    } else {
      const campTalk = hearth || campGate;
      const lines = campTalk ? beat.lines.filter(row => rule.ask(row.when)).map(row => ({...row, words: rule.line(row.words)})) :
        lights && beatId === 'aboard' ? beat.notes.watch : undefined;
      const scene = {id, choices, ...(lines && {lines})};
      if (beat.oneTalk) {
        const offered = hearth ? new Set(availableRescueHelpers(world, record.cast, rule.ask).map(row => row.id)) : null;
        scene.questions = (beat.questions ?? []).filter(row => (hearth || !rule.has('asked', row.id)) && rule.ask(row.when) &&
          (!offered || row.id === 'who-tally' || offered.has(row.id.replace(/^(?:rats-)?who-/, '')))).map(row => ({
          id: row.id, words: rule.line(row.words),
          lines: row.lines.filter(line => rule.ask(line.when)).map(line => ({...line, speaker: line.as ?? line.speaker, words: rule.line(line.words)}))}));
        scene.thoughts = (beat.thoughts ?? []).map(row => typeof row === 'string' ? {thought: row} : row)
          .filter(row => rule.ask(row.when)).map(row => rule.line(row.thought));
      }
      out.requests.push({type: 'talk', id, scene, speaker: campTalk ? (hearth ? 'auntie-solder' : 'marigold') : 'you',
        ...(campTalk || lights ? {radio: true, threadPriority: true} : {})});
    }
  }
  const option = available.find(row => hauling && row.by === 'do' ? haulerAction(row, context) : row.by === 'go' ? !view.onFoot &&
      (!lights || lightsGo(row, playerPoint(view), world.open.landSeed)) :
    ['say', 'do', undefined].includes(row.by) ? atTalk && (lights ? lightsTalk : view.onFoot) && completed.some(event => event.id === `${thread.id}/${beatId}/decision/${row.id}`) :
      completed.some(event => event.id === row.id));
  if (lights && !beat.choices?.length && beat.next) move('next/' + beatId, {next: beat.next});
  if (!lights && !beat.choices?.length && beat.next && (hauling || !beat.questions?.length || completed.some(event => event.id === `${thread.id}/radio-done`))) {
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
    const count = hearth ? world.open.journal.filter(row => row.type === 'thread' && row.key === thread.id).length :
      option.by === 'do' ? world.open.journal.filter(change => change.type === 'thread' &&
      change.choiceId.startsWith(`${thread.id}/choice/${option.id}/`)).length : null;
    move(`choice/${option.id}${count === null ? attemptSuffix : '/' + count}`, option, [remember('chose', option.id)]);
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
          sitePositions: view.sitePositions, dayClock: view.dayClock, checkpointsEnabled: view.checkpointsEnabled === true}};
      const enabled = view.checkpointsEnabled === true;
      const availableThreads = enabled ? threads : threads.filter(thread => thread !== dryPump && thread.id !== FLAG_ID &&
        thread.id !== DACE_ID && thread.id !== HAULER_ID && thread.id !== LIGHTS_ID && thread.id !== RADIO_ID && thread.id !== TOLL_ID && thread !== marketDay && thread !== runaway);
      if (enabled) state.places.dryPumpEnabled = true;
      const canStartRunaway = runawayCanStart(context);
      const region = canStartRunaway ? 'runaway-tin-town' : regionId(view);
      const visit = localCampVisit(context);
      const choices = visit ? [{id: visitId(visit.id, night), effects: [mark(visitId(visit.id, night))]}] : [];
      const lightsRecord = world.open.threads[LIGHTS_ID];
      const roadVisit = enabled && availableThreads.includes(lightsStory) && (!lightsRecord || context.dormant(lightsStory, lightsRecord)) &&
        context.allowsStart(lightsStory);
      if (!isHeld(holds, 'signs') && (roadVisit || region && !state.regions.includes(region))) {
        choices.push(...directThreads(availableThreads.filter(thread => thread !== runaway || canStartRunaway), context, roadVisit ? 'salt-road' : `region-${region}`));
        if (region && !state.regions.includes(region)) state.regions.push(region);
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
      const tollRecord = enabled && world.open.threads[TOLL_ID];
      const gateStanding = tollRecord && tollGateStanding(world);
      const poleUp = gateStanding && (tollPoleUp(world, tollRecord) || tollRecord.beat === 'break' && previous.tollPoleDown);
      const tollKey = gateStanding ? (poleUp ? 'open' : 'shut') : '';
      state.tollPoleDown = tollRecord?.beat === 'break' && (previous.tollPoleDown ||
        input.previousEvents.some(event => event.type === 'threadMissionPoleDown' && event.id === TOLL_ID + '/break'));
      state.tollGate = tollKey;
      if (tollKey !== (previous.tollGate ?? '')) requests.push({type: 'solids', id: TOLL_GATE,
        solids: tollKey ? tollGateSolids(!poleUp, scablandsSurfaceHeightAt) : []});
      if (gateStanding && !isFound(world, TOLL_GATE) &&
          canFindSite(TOLL_SITE, playerPoint(view), tollPlace(TOLL_GATE), view.onFoot)) {
        choices.push({id: 'open/site-found/' + TOLL_GATE, effects: [{type: 'find', site: TOLL_GATE},
          {type: 'met', person: 'road-rats', text: "You found Sump's Gate across the Mall Road on night " + night + '.'}]});
        requests.push({type: 'say', lineId: 'open/site-found/' + TOLL_GATE, text: "Sump's Gate is on your map."});
        events.push({type: 'threadCue', id: TOLL_GATE, position: tollPlace(TOLL_GATE), cue: 'open.site.found'});
      }
      state.places.tollGate = tollKey;
      const fighting = !!state.tollPoleDown || tollRecord?.beat === 'stand';
      const showParked = gateStanding && !fighting;
      if (!!previous.tollParked !== !!showParked) requests.push({type: 'missionLookouts', id: TOLL_ID + '/gate',
        group: 'road-rats', posts: showParked ? tollParkedCars(world, tollRecord, fighting) : []});
      state.tollParked = !!showParked;
      const pass = gateStanding && unusedTollPass(world);
      if (pass && !view.onFoot && pastTollPole(view.carPosition)) choices.push({id: pass, effects: [mark(pass)]});
      const signs = liveSigns(availableThreads.filter(thread => thread !== runaway || runawayVisible),
        {...context, view: {...view, partOfDay: view.partOfDay === 'dawn' ? 'day' : view.partOfDay}});
      const decision = {interact: state.interact && !previous.interact, activeMission: previous.mission, journey: enabled && previous.journey};
      const settled = input.previousEvents.some(event => event.id === previous.mission &&
        (event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled'));
      state.mission = settled ? null : previous.mission;
      let hold, release, leave, dusk = false;
      for (const source of availableThreads) {
        const record = world.open.threads[source.id];
        if (!record) continue;
        const thread = source.id === FLAG_ID ? stagedFlag(world) : source.id === TOLL_ID ? stagedToll(world) : source;
        if (thread.id === DACE_ID) {
          const out = daceStep(context, record, previous.dace, decision, dt);
          state.dace = out.state;
          choices.push(...out.choices);
          events.push(...out.events);
          requests.push(...out.requests);
          if (out.mission !== undefined) state.mission = out.mission;
          hold ??= out.hold;
          release ??= out.release;
          dusk ||= out.dusk === true;
          continue;
        }
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
        if (thread.id === RADIO_ID) {
          const fuel = radioFuel(world, view, at => context.placeAt(at, record.cast));
          if (fuel?.choice) choices.push(fuel.choice);
          if (fuel?.id) {
            const used = view.jobEvents?.some(event => event.type === 'talkChoice' && event.scene === fuel.id && event.id === fuel.id);
            if (used) choices.push({id: fuel.id, effects: fuel.effects});
            else if (view.openRoam && decision.interact) {
              decision.interact = false;
              requests.push({type: 'talk', threadPriority: true, id: fuel.id, speaker: fuel.speaker, anchorPosition: true,
                position: {...fuel.point, y: fuel.point.y ?? scablandsSurfaceHeightAt(fuel.point.x, fuel.point.z)},
                scene: {id: fuel.id, choices: [{id: fuel.id, words: fuel.words}]}});
            }
          }
        }
        const laterRule = threadRule(thread, threadContext, record);
        if (thread.id === LIGHTS_ID) {
          const report = lightsLater(world, playerPoint(view), view, signs, distanceBetween, context.placeAt);
          if (report) {
            report.lines.forEach((row, index) => requests.push({type: 'say', lineId: LIGHTS_ID + '/' + report.id + '/' + index,
              text: (row.as ?? nameOf(row.speaker) ?? row.speaker) + ': ' + row.words}));
            choices.push({id: LIGHTS_ID + '/later/' + report.id, effects: [mark(threadMark(LIGHTS_ID, 'later', report.id))]});
          }
        }
        const laterRows = thread === runaway || thread.id === LIGHTS_ID ? [] : thread.id === FLAG_ID ? FLAG_TALK_ROWS : thread.id === TOLL_ID ? MALL_ROAD_TALK : thread.later ?? [];
        const later = laterRows.find(row => {
          // Sump's rider speaks at a checkpoint, not on foot: the toll's row below, the others in parts/checkpoints.js.
          if (row.by === 'sumps-rider') return false;
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
          if (thread === burnedCamp && row.id === 'trader-bolts') {
            const left = world.ledger.history.findLast(change => change.key === thread.id + '/left-at-rats-nest');
            const trader = view.people?.find(person => ['tally', 'nan-tallow'].includes(person.id));
            return !!left && night - left.night >= 2 &&
              distanceBetween(playerPoint(view), trader?.position ?? NIGHT_2_SITES.gate) <= 4;
          }
          if (thread.id === TOLL_ID) return atTollPerson(threadContext, record, row.by, 2.5);
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
          requests.push({type: 'talk', id, speaker: later.by, threadPriority: thread.id === RADIO_ID || thread.id === TOLL_ID,
            ...(thread.id === RADIO_ID ? {position: playerPoint(view), anchorPosition: true} : {}),
            ...(thread === burnedCamp && later.id === 'trader-bolts' ? {radio: true} : {}),
            scene: {id,
            lines: later.lines.filter(row => laterRule.ask(row.when)).map(row => ({...row, speaker: laterRule.line(row.speaker), words: laterRule.line(row.words)})),
            choices: [{id, words: later.words ?? 'I hear you.'}]}});
        }
        for (const row of laterRows) if (view.jobEvents?.some(event => event.type === 'talkChoice' && event.id === `${thread.id}/later/${row.id}`) && later?.id === row.id)
          choices.push({id: `${thread.id}/later/${row.id}`, effects: [mark(threadMark(thread.id, 'later', row.id)), ...laterRule.effects(row.effects)]});
        if (thread.id === TOLL_ID && !view.onFoot && view.roadEncounter?.group === 'road-rats' &&
            view.roadEncounter.phase === 'fight' && laterRule.has('later', 'rider-collects') === false) {
          const rider = laterRows.find(row => row.by === 'sumps-rider' && laterRule.ask(row.when));
          if (rider) {
            choices.push({id: TOLL_ID + '/later/' + rider.id, effects: [mark(threadMark(TOLL_ID, 'later', rider.id))]});
            rider.lines.forEach((row, i) => requests.push({type: 'say', lineId: TOLL_ID + '/later/' + rider.id + '/' + i,
              text: nameOf(row.speaker) + ': ' + laterRule.line(row.words)}));
          }
        }
        if (record.end && thread !== runaway) {
          if (thread.id === TOLL_ID) {
            const service = tollAfterEnd(threadContext, record, decision.interact);
            choices.push(...(service.choices ?? []));
            events.push(...(service.events ?? []));
            if (service.request) { requests.push(service.request); decision.interact = false; }
          }
          continue;
        }
        const first = record.beat === firstBeat(thread);
        const sight = first ? witnessSign(signs.find(sign => sign.id === thread.id), {...view, seconds: context.seconds}, previous.seen?.[thread.id] ?? 0, dt) : null;
        if (sight?.seconds) state.seen[thread.id] = sight.seconds;
        const details = {...previous.progress?.[thread.id], beatSeconds: {...state.beatSeconds[thread.id]},
          reading: {...previous.progress?.[thread.id]?.reading},
          ...(thread === runaway ? {mendingSince: previous.mendingSince} : {})};
        if (thread.id === RADIO_ID && details.lastBeat !== record.beat) {
          details.lastBeat = record.beat;
          details.returning = true;
          details.stopped = 0;
          details.beatSeconds[record.beat] = context.seconds;
        }
        details.beatSeconds[record.beat] ??= context.seconds;
        const out = outputFor(thread, threadContext, record, details, sight?.witnessed ?? false, decision, dt);
        if (details.mendingSince !== undefined) state.mendingSince = details.mendingSince;
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
        leave ??= out.leave;
        dusk ||= out.dusk === true;
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
      return {state, choices, events, requests, hold, release, ...(leave ? {leave} : {}), ...(dusk ? {dusk} : {})};
    },
  };
}

export const threadsPart = createThreadsPart(OPEN_THREADS);
