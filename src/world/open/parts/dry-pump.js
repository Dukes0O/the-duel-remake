// Bind the authored Dry Pump graph to open-land input. The content file remains the source of its dialogue and effects.
import dryPump from '../../../story/threads/content/dry-pump.js';
import {firstBeat, mark, threadMark, threadRule} from '../../../story/threads/thread-rule.js';
import {visitId} from '../../../story/threads/director.js';
import {isFresh} from '../../../story/threads/signs.js';
import {nameOf, nameRow} from '../register.js';
import {distance, hasSiteServices, residentPose, siteSpot} from '../site-rule.js';
import {stageOf} from '../open-record.js';
import {campPeople} from '../content/people-sites.js';
import {STORY_FIGURES} from '../../jobs/story-people.js';
import {distanceToPerson, TALK_RANGE} from './people.js';
import {isHeld} from '../holds.js';
import {DRY_PUMP_MISSIONS, DRY_PUMP_SOLIDS, DRY_PUMP_SPOTS, DRY_PUMP_TALK} from '../content/dry-pump-places.js';
import {inheritThreadMission, prepareThreadMission} from './missions.js';

const ID = dryPump.id;
export const DRY_PUMP_HOLD = 'thread:dry-pump/mall';
const trip = new Set(['mall-outside', 'gallery', 'hall', 'penny', 'his-pipe', 'shoe-shop', 'tunnel', 'road-out', 'penny-owed']);
const campTalk = new Set(['asking', 'fitting', 'promise-broken']);
const entrances = {'front-doors': DRY_PUMP_SPOTS['east-front'], roof: DRY_PUMP_SPOTS['north-side'], tunnel: DRY_PUMP_SPOTS['tunnel-door']};
const reached = (world, beat) => world.open.journal.findLast(row => row.key === ID && row.type === 'thread' && row.after.beat === beat);
const opening = firstBeat(dryPump);
const onFootAt = (view, point, within) => view.onFoot && distance(view.fighter?.position ?? view.player?.position, point) <= within;
const bankedSinceVisit = (world, id) => !world.ledger.marks.includes(visitId(id, world.ledger.night));
const owing = (world, id) => world.ledger.obligations.find(row => row.type === 'promise' && row.id === `${ID}/${id}`);
const atCampPump = (world, record, placeAt) => siteSpot(record.cast.camp, world.open.landSeed, 'pump') ?? placeAt('@camp', record.cast);
const spentOuting = view => view.outingCostsGasRun === true;
const mission = beat => ({...beat.mission, ...DRY_PUMP_MISSIONS[beat.mission.id]});
const parent = mission(dryPump.beats['mall-outside']);
const alarmed = (world, attemptNight) => world.ledger.marks.includes(`${ID}/alarm/${attemptNight}`) || world.ledger.history.some(row => row.type === 'mark' &&
  row.key === `${ID}/seen-in-the-mall` && row.night >= attemptNight) ||
  world.open.journal.some(row => row.type === 'thread' && row.key === ID && row.choiceId.includes('/seen/') && row.night >= attemptNight);

export const dryPumpAllowsCamp = (world, id, here, camp) => bankedSinceVisit(world, id) && distance(here, camp) > 40;

export function dryPumpStep(context, record, previous, dt, decision) {
  const {world, view, seconds, previousEvents, placeAt, holds} = context;
  const point = view.player?.position ?? view.player;
  const beatId = record.beat;
  const beat = dryPump.beats[beatId];
  const night = world.ledger.night;
  const mall = !record.end && trip.has(beatId) || record.end && previous.phase === 'second-trip';
  const state = previous.beat === beatId && previous.ended === record.end ? {...previous} :
    {beat: beatId, ended: record.end, mall: previous.mall, mallClock: previous.mallClock, phase: previous.phase, pendingPenny: previous.pendingPenny, secondTried: previous.secondTried};
  const out = {state, choices: [], requests: [], events: []};
  const rule = threadRule(dryPump, context, record);
  const at = place => placeAt(place, record.cast);
  const camp = at('@camp');
  const pump = atCampPump(world, record, placeAt);
  const campId = record.cast.camp;
  const leader = nameRow(campId)?.leader;
  const resident = view.onFoot && distance(point, camp) <= 42 && hasSiteServices(stageOf(world, campId))
    ? campPeople(campId).find(row => row.id === leader) : null;
  // The camp layer draws this same routine. Use the last displayed pose, which stays fixed during talk.
  const campSpeaker = resident && residentPose(resident, world, {site: campId, ...view.campSiteState},
    STORY_FIGURES[resident.figure].pace);
  const nearLeader = campSpeaker && distanceToPerson(campSpeaker, view.fighter?.position ?? point) <= TALK_RANGE;
  const attemptNight = reached(world, 'mall-outside')?.night ?? night;
  const talkEvents = view.jobEvents ?? [];
  const viewReady = view.openRoam && !view.missionLeaving && !context.leave;
  const askingOptions = rows => rows.filter(row => rule.ask(row.when) &&
    (!['go-today', 'go-late'].includes(row.id) || view.outingAvailable !== false));
  const askingThoughts = asking => [asking.notes.thoughtsWhen[spentOuting(view) ? 0 : 1].thought, ...asking.thoughts];
  const chose = id => talkEvents.some(event => event.type === 'talkChoice' && event.id === id);
  const choice = (id, effects) => out.choices.push({id: `${ID}/${id}`, effects});
  const remembered = (kind, id) => mark(threadMark(ID, kind, id));
  const say = (id, text) => out.requests.push({type: 'say', lineId: `${ID}/${id}`, text: rule.line(text)});
  const cue = (id, sound) => { if (sound) out.events.push({type: 'threadCue', id, cue: sound}); };
  const lines = (rows = []) => rows.filter(row => rule.ask(row.when)).map(row => {
    const speaker = row.speaker === 'ash-man' ? 'The Ash Man' : row.speaker === 'trader' ? 'The trader' : rule.line(row.speaker);
    const id = row.speaker === '{camp.leader}' ? leader : row.speaker === '{friend.leader}' ?
      nameRow(record.cast.friend)?.leader ?? 'you' : row.speaker;
    return {...row, speaker: id, words: rule.line(row.words), display: nameOf(id) ?? speaker};
  });
  const captions = (id, rows) => lines(rows).forEach((row, i) => say(`${id}/${i}`, `${row.display}: ${row.words}`));
  const thoughts = (rows = []) => rows.flatMap(row => typeof row === 'string' ? [rule.line(row)] :
    rule.ask(row.when) ? [rule.line(row.thought)] : []);
  const move = (id, next, effects = []) => choice(id, [...effects, ...rule.move(next)]);
  const marker = (place, radius = 2) => out.requests.push({type: 'marker', place: place && {...place, radius}});

  const setMall = active => {
    if (active === !!previous.mall) return;
    state.mall = active;
    if (active) {
      state.mallClock = seconds;
      out.hold = {holder: DRY_PUMP_HOLD, systems: parent.holds};
    } else {
      out.release = DRY_PUMP_HOLD;
      state.mallClock = undefined;
    }
    out.requests.push({type: 'solids', id: ID, solids: active ? DRY_PUMP_SOLIDS : []});
  };
  const beginMission = (authored, options = {}) => {
    if (decision.activeMission || (view.combatWrecking && !options.alarmed)) return false;
    const prepared = inheritThreadMission({...mission({mission: authored}), ...options}, parent);
    const route = prepared && prepareThreadMission(prepared, at);
    if (!route) return false;
    out.mission = prepared.id;
    decision.activeMission = prepared.id;
    out.events.push({type: 'threadMission', id: prepared.id, thread: ID, beat: beatId, holder: DRY_PUMP_HOLD,
      keepHold: true, runAfterEnd: !!record.end, mission: prepared, route});
    return true;
  };
  const finish = (authored, ended) => {
    out.mission = null;
    const outcome = authored.outcomes[ended.outcome];
    if (!outcome || (ended.outcome !== 'clear' && !rule.ask(outcome.when))) return;
    captions(`${authored.id}/${ended.outcome}`, outcome.lines);
    if (!ended.alarmPlayed) cue(authored.id, outcome.cue);
    const effects = rule.effects(outcome.effects);
    if (ended.outcome === 'ran-out') effects.push(mark(`${ID}/alarm/${night}`));
    // A failed escape cannot deliver the valve. The authored route goes back to promised.
    move(`mission/${attemptNight}/${authored.id}/${ended.outcome}/result`, outcome.next, effects);
  };
  const completed = authored => previousEvents.find(event => event.id === authored.id &&
    ['threadMissionOutcome', 'threadMissionCancelled'].includes(event.type));

  function talk(id, by, {openingLines = [], thoughtRows = [], questions = [], options = []} = {}) {
    if (!decision.interact) return false;
    const scene = {id, lines: lines(openingLines), thoughts: thoughts(thoughtRows),
      choices: options.map(row => ({id: `${id}/${row.id}`, words: rule.line(row.words),
        ...(row.plain ? {detail: rule.line(row.plain)} : {}), ...(row.thought ? {thought: rule.line(row.thought)} : {})})),
      questions: questions.filter(row => rule.ask(row.when) || row.when?.asked).map(row => ({id: row.id,
        words: rule.line(row.words), lines: lines(row.lines), ...(row.when?.asked ? {needs: [row.when.asked]} : {})}))};
    if (!scene.lines.length && !scene.thoughts.length && !scene.choices.length) return false;
    const asked = scene.questions.filter(row => rule.has('asked', row.id)).map(row => row.id);
    out.requests.push({type: 'talk', id, scene, speaker: by, asked, threadPriority: true,
      ...(by === leader && campSpeaker ? {position: campSpeaker.position} : {})});
    decision.interact = false;
    return true;
  }

  function decide(options, by, near, extra) {
    const id = `${ID}/${beatId}/decision`;
    for (const event of talkEvents) if (event.type === 'openTalkQuestion' && event.scene === id && !rule.has('asked', event.id))
      choice(`asked/${event.id}`, [remembered('asked', event.id)]);
    const selected = options.find(row => chose(`${id}/${row.id}`));
    if (selected && near) {
      if (selected.by === 'do' && entrances[selected.id] && !onFootAt(view, entrances[selected.id], 4)) return false;
      captions(`choice/${selected.id}`, selected.lines);
      cue(selected.id, selected.cue);
      move(`choice/${selected.id}/${night}`, selected.next ?? beat.next,
        [remembered('chose', selected.id), ...rule.effects(selected.effects)]);
      return true;
    }
    if (near && options.length) talk(id, by, {...extra, options});
    return false;
  }

  function mend(row, site, after) {
    const near = onFootAt(view, site, 2.5);
    if (!state.targetSet) { marker(site); state.targetSet = true; }
    state.work = near && view.wrench ? (state.work ?? 0) + dt : 0;
    if (state.work + 1e-9 < row.wrenchSeconds) return;
    marker(null);
    cue(row.id, row.cue);
    captions(row.id, after ?? row.after);
    choice(`mend/${row.id}`, rule.effects(row.effects));
    state.mended = true;
  }

  function explore(rows, locations) {
    for (const item of rows ?? []) {
      if (rule.has('found', item.id) || !onFootAt(view, locations[item.id], 3) || !rule.ask(item.when)) continue;
      choice(`found/${item.id}`, [remembered('found', item.id), ...rule.effects(item.effects)]);
      say(`clue/${item.id}`, item.thought);
      cue(item.id, item.cue);
    }
  }

  if (!viewReady) { setMall(false); return out; }
  if (mall && decision.activeMission && !decision.activeMission.startsWith(`${ID}/`)) return out;
  setMall(mall);
  if (record.end) {
    const promise = owing(world, 'penny-valve');
    const pennyBeat = dryPump.beats['penny-owed'];
    const finished = completed(pennyBeat.mission);
    const attempt = state.phase === 'second-trip';
    if (finished && attempt) {
      finish(pennyBeat.mission, finished);
      state.phase = null;
      setMall(false);
    } else if (!attempt && promise) {
      const atDoor = onFootAt(view, DRY_PUMP_SPOTS['tunnel-door'], 3);
      if (atDoor && decision.interact && (night >= promise.due || view.outingAvailable !== false && state.secondTried !== night)) {
        decision.interact = false;
        state.pendingPenny = true;
        if (beatId !== 'penny-owed') move('penny-owed/' + night, 'penny-owed');
      }
      if (beatId === 'penny-owed' && state.pendingPenny && atDoor) {
        if (night >= promise.due) {
          const broken = pennyBeat.mission.outcomes.broken;
          captions('penny/broken', broken.lines);
          move('penny/broken', broken.next, rule.effects(broken.effects));
          state.pendingPenny = false;
        } else if (beginMission(pennyBeat.mission, {elapsed: 0, cue: 'open.mall.alarm'})) {
          state.phase = 'second-trip';
          state.secondTried = night;
          state.pendingPenny = false;
          setMall(true);
          captions('penny/second-trip', pennyBeat.mission.lines);
        }
      }
    }
    if (state.phase !== 'second-trip') {
      for (const row of DRY_PUMP_TALK) {
        const by = row.by === '{camp.leader}' ? leader : row.by === 'trader' ? 'nan-tallow' : row.by;
        if (rule.has('later', row.id) || !rule.ask(row.when)) continue;
        if (row.id === 'the-camp-went-themselves' && night < record.began + dryPump.sign.lastsNights + 9) continue;
        if (row.id === 'the-hearth-that-night' && (!spentOuting(view) || (view.partOfDay ?? 'day') === 'day')) continue;
        const position = row.at ? at(row.at) : view.people?.find(person => person.id === by)?.position ??
          (row.id === 'the-hearth-that-night' ? at(['tin-town', 'hearth']) : null);
        if ((by === leader ? nearLeader : onFootAt(view, position, 3)) && talk(`${ID}/later/${row.id}`, by, {openingLines: row.lines}))
          state.later = `${ID}/later/${row.id}`;
        if (talkEvents.some(event => event.type === 'openTalkClosed' && event.finished && event.scene === `${ID}/later/${row.id}`))
          choice(`later/${row.id}`, [remembered('later', row.id), ...rule.effects(row.effects)]);
      }
    }
    return out;
  }

  if (beatId === opening) {
    if (!isFresh(dryPump, record, night)) move('ignored', dryPump.ignored.next, rule.effects(dryPump.ignored.effects));
    else if (!isHeld(holds, 'signs')) {
      if (distance(point, camp) <= dryPump.sign.seenWithin && !rule.has('seen', opening)) {
        thoughts(beat.thoughts).forEach((text, i) => say(`sign/${i}`, text));
        cue(ID, dryPump.sign.cue);
        choice('saw-dry-pump', [remembered('seen', opening)]);
      }
      if (nearLeader && decision.interact) {
        const asking = dryPump.beats.asking;
        talk(`${ID}/asking/decision`, leader, {openingLines: asking.lines, thoughtRows: askingThoughts(asking),
          questions: asking.questions, options: askingOptions(asking.choices)});
        move('heard-sign', beat.next, [remembered('entered', opening)]);
      }
    }
    return out;
  }

  if (beatId === 'left-dry' || beatId === 'promised') {
    const since = reached(world, 'asking')?.night ?? record.began;
    const promise = owing(world, 'valve');
    if (beatId === 'left-dry' && night - since >= 4) move('left-dry', beat.next, rule.effects(beat.effects));
    if (beatId === 'promised' && promise && night >= promise.due) move('promise-due', 'promise-broken');
    else if (beatId === 'promised' && night - since >= 4) move('water-ran-out', 'left-dry');
    else if (beatId === 'promised' && night > (reached(world, 'came-home-empty')?.night ?? 0))
      decide(beat.choices, leader, nearLeader && view.outingAvailable !== false);
    return out;
  }

  if (beatId === 'friends-away') {
    if (rule.ask(beat.when)) {
      const odds = beat.lines[0].when;
      const success = rule.ask(record.cast.friend === 'walkers' ? odds : odds.any[1]);
      const {when: _when, ...line} = beat.lines[success ? 0 : 1];
      const effects = (success ? beat.effects.slice(0, 2) : beat.effects.slice(2)).map(({when, ...effect}) => effect);
      captions(beatId, [line]);
      move('friends-returned', beat.next[success ? 0 : 1].to, rule.effects(effects));
    }
    return out;
  }

  if (beat.mission?.partOf) {
    const finished = completed(beat.mission);
    if (finished) {
      finish(beat.mission, finished);
      state.phase = null;
      return out;
    }
    if (beatId === 'road-out' && view.onFoot && !state.targetSet) {
      marker(DRY_PUMP_SPOTS['car-park'], 12);
      state.targetSet = true;
    }
    if (!state.phase && (beatId === 'road-out' ? !view.onFoot && rule.ask(beat.when) : view.onFoot) &&
        beginMission(beat.mission, {elapsed: seconds - (state.mallClock ?? seconds),
          alarmed: beatId === 'road-out' && alarmed(world, attemptNight), cue: 'open.mall.alarm'})) {
      state.phase = beat.mission.id;
      thoughts(beat.thoughts).forEach((text, i) => say(`${beatId}/thought/${i}`, text));
    }
    if (beatId === 'shoe-shop') {
      const pickup = previousEvents.some(event => event.type === 'threadMissionPickup' && event.id === beat.mission.id);
      explore(beat.explore.filter(item => item.id !== 'the-valve' || pickup),
        {'ash-store': DRY_PUMP_SPOTS['shoe-shop'], 'the-valve': DRY_PUMP_SPOTS['shoe-shop']});
    }
    return out;
  }

  if (beatId === 'mall-outside') {
    if (!state.targetSet) { marker(DRY_PUMP_SPOTS['car-park'], 12); state.targetSet = true; }
    if (distance(point, at('dead-mall')) > 85) return out;
    if (!state.arrived) {
      state.arrived = true;
      thoughts(beat.thoughts).forEach((text, i) => say(`${beatId}/thought/${i}`, text));
    }
    explore(beat.explore, DRY_PUMP_SPOTS);
    const options = beat.choices.filter(row => rule.ask(row.when) && onFootAt(view, entrances[row.id], 4));
    decide(options, 'you', !!options.length, {questions: beat.questions});
    return out;
  }

  if (beatId === 'gallery') {
    if (!state.targetSet) { marker(DRY_PUMP_SPOTS.gallery); state.targetSet = true; }
    if (onFootAt(view, DRY_PUMP_SPOTS.gallery, 3)) {
      explore(beat.explore, Object.fromEntries(beat.explore.map(row => [row.id, DRY_PUMP_SPOTS.gallery])));
      move('enter-gallery/' + night, beat.next);
    }
    return out;
  }

  if (beatId === 'tunnel' || beatId === 'came-home-empty') {
    const target = beatId === 'tunnel' ? DRY_PUMP_SPOTS['tunnel-door'] : null;
    if (target && !state.targetSet) { marker(target); state.targetSet = true; }
    if (!target || onFootAt(view, target, 3)) {
      marker(null);
      captions(beatId, beat.lines);
      thoughts(beat.thoughts).forEach((text, i) => say(`${beatId}/thought/${i}`, text));
      cue(beatId, beat.cue);
      move(`${beatId}/${night}`, beat.next, rule.effects(beat.effects));
    }
    return out;
  }

  const wrench = beat.mend;
  const mended = state.mended || world.ledger.marks.includes(beatId === 'his-pipe' ? `${ID}/took-penny-valve` : `${ID}/water-back`);
  const spot = beatId === 'his-pipe' ? DRY_PUMP_SPOTS['penny-pipe'] : DRY_PUMP_SPOTS['staff-door'];
  const person = campTalk.has(beatId) ? leader : 'mr-penny';
  if (wrench && !mended) {
    const after = beatId === 'fitting' && night >= (reached(world, 'asking')?.night ?? night) + 2 ?
      wrench.after.filter(row => row.speaker !== 'marigold') : wrench.after;
    mend(wrench, beatId === 'fitting' ? pump : spot, after);
    return out;
  }
  const near = campTalk.has(beatId) ? nearLeader : onFootAt(view, spot, 3.5);
  if (beatId === 'fitting' && !rule.has('entered', beatId))
    choice('fitting-word', [remembered('entered', beatId), ...rule.effects(beat.effects)]);
  if (near && beatId === 'promise-broken' && !rule.has('entered', beatId))
    choice('broke-camp-promise', [remembered('entered', beatId), ...rule.effects(beat.effects)]);
  const options = askingOptions(beat.choices);
  const openingLines = beatId === 'penny' && rule.has('chose', 'tunnel') ? beat.lines.slice(2) : beat.lines;
  if (decide(options, person, near, {openingLines,
    thoughtRows: beatId === 'asking' ? askingThoughts(beat) : beat.thoughts, questions: beat.questions})) {
    if (beatId === 'penny' && !world.ledger.marks.includes(`${ID}/signed-the-book`)) {
      const signing = beat.notes.signing;
      choice('signed-the-book', signing.effects);
      say('book', signing.thought);
      cue(ID, signing.cue);
    }
    if (beatId === 'fitting') marker(null);
  }
  return out;
}
