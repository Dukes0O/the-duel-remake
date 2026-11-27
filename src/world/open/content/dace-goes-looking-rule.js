import story from '../../../story/threads/content/dace-goes-looking.js';
import {mark, threadMark, threadRule} from '../../../story/threads/thread-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {daySecondsOf} from '../day-rule.js';
import {isHeld} from '../holds.js';
import {nameOf, nameRow, siteRow} from '../register.js';
import {prepareThreadMission} from '../parts/missions.js';
import {distance, sitePosition} from '../site-rule.js';
import {DACE_ASKING, DACE_LATER} from './talk-dace.js';
import {DACE_ID, DACE_PLACES as places, daceMark, daceMarked, daceMorning, daceRescuePlaces} from './dace-goes-looking-places.js';

const USE_RANGE = 2.5;
const NOON_SECONDS = 9 * 60;

const atPlayer = view => view.player?.position ?? view.player;
const ageOfBeat = (world, beat) => world.ledger.night -
  (world.open.journal.findLast(row => row.type === 'thread' && row.key === DACE_ID && row.after?.beat === beat)?.night ?? world.ledger.night);
const word = (id, atLeast) => ({fact: 'word', of: id, atLeast});

export const daceSignIsOut = ({world, view, seconds = 0}) => daceMorning(view.partOfDay) &&
  (!view.dayClock || daySecondsOf(world) + seconds < NOON_SECONDS);

export function daceCanCast(id, world) {
  return story.notes.siteKinds.includes(siteRow(id)?.kind) &&
    id !== 'bell-buoy' && !!sitePosition(id, world.open.landSeed);
}

export function daceDriveMission() {
  const {mission, effects, next} = story.beats.together;
  const points = [places['first-fork'], '@site', places['gate-at-dusk']];
  const ranges = [36, 100, 24];
  return {...mission, by: 'car', outing: true,
    rule: {success: 'arrived', moments: mission.rule.moments.map((id, index) => ({id, at: points[index], within: ranges[index]}))},
    outcomes: {arrived: {effects, next}}};
}

function rescueMission(rescue) {
  const {mission} = story.beats.search;
  return {...mission, by: 'car', outing: true, rule: {home: places['gate-at-dusk'], pickup: rescue.at,
    seats: 1, people: 1, foundWithinMetres: 10, loadBelowMph: 2, homeWithin: 30, markRoute: true, pickupMoment: 'dace-aboard',
    success: 'brought-home', wrecked: 'car-wrecked'}};
}

function talkAt(beat) {
  if (beat === 'hearth' || beat === 'late' || ['he-took-it', 'he-stayed', 'key-was-taken'].includes(beat)) return places.hearth;
  return beat === 'key' ? places.key : places.dace;
}

function talkSpeaker(beat) {
  if (beat === 'late') return 'rell';
  if (beat === 'he-took-it') return 'moss';
  return beat === 'key' ? 'you' : 'dace';
}

export function daceStep(context, record, previous = {}, decision, dt) {
  const {world, view, seconds, holds, previousEvents} = context;
  const {beat, cast} = record;
  const row = story.beats[beat];
  const day = view.partOfDay ?? 'day';
  const daybreak = day === 'dawn' || !view.dayClock && day === 'day';
  const daySeconds = daySecondsOf(world) + seconds;
  const dusk = day === 'dusk' || day === 'dark';
  const here = atPlayer(view);
  const near = (position, within = USE_RANGE) => view.onFoot && distance(here, position) <= within;
  const site = () => {
    const at = view.sitePositions?.[cast.site];
    return at?.position ?? at ?? sitePosition(cast.site, world.open.landSeed);
  };
  const placeAt = value => value === '@site' ? site() : value;
  const rule = threadRule(story, context, record);
  const state = previous.beat === beat ? {...previous} : {beat, rescue: previous.rescue};
  const out = {state, choices: [], events: [], requests: []};
  const remember = (kind, key) => mark(threadMark(DACE_ID, kind, key));
  const choose = (id, effects = []) => out.choices.push({id: daceMark(id), effects});
  const move = (id, entry, extras = []) => choose(id, [...extras, ...rule.effects(entry.effects), ...rule.move(entry.next)]);
  const atGround = point => ({...point, y: (view.missionHeightAt ?? scablandsSurfaceHeightAt)(point.x, point.z)});
  const cue = (id, sound, position) => {
    if (sound) out.events.push({type: 'threadCue', id: daceMark(id), cue: sound, position});
  };
  const text = (id, words) => out.requests.push({type: 'say', lineId: daceMark(id), text: rule.line(words)});
  const lines = (id, rows = []) => rows.filter(line => rule.ask(line.when)).forEach((line, index) => {
    text(id + '/' + index, (nameOf(line.speaker) ?? rule.line(line.speaker)) + ': ' + line.words);
    cue(id + '/' + index, line.cue);
  });
  const thought = (id, value) => {
    const entry = typeof value === 'string' ? {thought: value} : value;
    if (entry && rule.ask(entry.when)) text(id, entry.thought);
  };
  const publicLines = (rows = []) => rows.filter(line => rule.ask(line.when)).map(line => {
    const name = rule.line(line.speaker);
    return {...line, speaker: name === line.speaker ? name : siteRow(cast.site)?.people && nameRow(siteRow(cast.site).people)?.leader || name,
      words: rule.line(line.words)};
  });
  const settled = id => (view.jobEvents ?? []).find(event => event.type === 'talkChoice' && event.scene === id);

  function talk(id, entry, speaker, position, {radio = false, interact = true, ack} = {}) {
    const choice = settled(id);
    // A question can be asked, and its answer remembered, even if the player walks away.
    for (const event of view.jobEvents ?? []) {
      if (event.type !== 'openTalkQuestion' || event.scene !== id || rule.has('asked', event.id)) continue;
      const question = entry.questions?.find(row => row.id === event.id);
      if (question) choose('ask/' + question.id, [remember('asked', question.id), ...rule.effects(question.effects)]);
    }
    if (choice || !view.openRoam || !interact ||
        (view.jobEvents ?? []).some(event => event.type === 'openTalkSkipped' && event.scene === id)) return choice;
    const choices = entry.choices?.filter(option => rule.ask(option.when)).map(option => ({
      id: id + '/' + option.id, words: rule.line(option.words),
    })) ?? [];
    if (ack) choices.push({id: ack, words: 'I hear you.'});
    const questions = entry.questions?.filter(question => question.when?.asked || rule.ask(question.when)).map(question => ({
      id: question.id, words: rule.line(question.words), lines: publicLines(question.lines),
      needs: question.when?.asked && !rule.has('asked', question.when.asked) ? [question.when.asked] : [],
    }));
    const thoughts = entry.thoughts?.filter(row => rule.ask(row.when)).map(row => rule.line(row.thought ?? row));
    const scene = {id, lines: publicLines(entry.lines), thoughts, questions, choices};
    decision.interact = false;
    out.requests.push({type: 'talk', id, speaker, scene, radio, threadPriority: true,
      ...(position && {position: atGround(position), at: position, anchorPosition: true}),
      asked: questions?.filter(question => rule.has('asked', question.id)).map(question => question.id) ?? []});
  }

  function report() {
    const row = DACE_LATER.find(entry => {
      if (!rule.ask(entry.when) || rule.has('later', entry.id)) return false;
      if (entry.id === 'the-rats-have-the-pickup') return view.roadEncounter?.group === 'road-rats';
      if (entry.id === 'rell-on-dace-waiting') return world.ledger.night - record.began >= story.sign.lastsNights + 2 && near(places.gate);
      if (entry.id === 'moss-fetches-the-pickup') return daceMorning(day) && ageOfBeat(world, 'hearth') >= 1 &&
        near(view.people?.find(person => person.id === 'moss')?.position);
      const camp = siteRow(cast.site);
      const speaker = nameRow(camp?.people)?.leader;
      return camp?.kind === 'camp' && near(view.people?.find(person => person.id === speaker)?.position);
    });
    if (!row) return;
    const id = row.scene;
    const finish = () => choose('later/' + row.id, [remember('later', row.id),
      ...rule.effects(row.effects).filter(effect => effect.type !== 'word' || !rule.ask(word(effect.person, 'Friendly')))]);
    if (row.by === 'sumps-rider') {
      lines('later/' + row.id, row.lines);
      finish();
      return;
    }
    const speaker = row.at ? nameRow(siteRow(cast.site)?.people)?.leader : row.by;
    const point = row.id === 'rell-on-dace-waiting' ? places.gate : view.people?.find(person => person.id === speaker)?.position;
    if (talk(id, row, speaker, point, {interact: decision.interact, ack: id})) finish();
  }

  if (!view.openRoam) return out;
  if (record.end) {
    report();
    return out;
  }

  if (beat === 'sign' || beat === 'asking') {
    if (beat === 'sign') {
      if (world.ledger.night - record.began >= story.sign.lastsNights) {
        move('ignored', story.ignored);
        return out;
      }
      if (!daceSignIsOut(context) || isHeld(holds, 'signs')) return out;
      if (!rule.has('seen', 'pickup') && distance(here, places.pickup) <= story.sign.seenWithin) {
        row.thoughts.forEach((words, index) => thought('sign/' + index, words));
        choose('seen/pickup', [remember('seen', 'pickup')]);
      }
    }
    const choice = talk(DACE_ASKING, story.beats.asking, 'dace', places.dace,
      {interact: decision.interact && near(places.dace)});
    const option = story.beats.asking.choices.find(row => choice?.id === DACE_ASKING + '/' + row.id);
    if (option && beat === 'asking') playChoice('asking', option);
    else if (beat === 'sign' && out.requests.some(request => request.type === 'talk'))
      move('entered/sign', row, [remember('entered', 'sign')]);
    return out;
  }

  function playChoice(beatId, option, extras = []) {
    const id = 'choice/' + option.id;
    cue(id, option.cue);
    thought(id, option.thought);
    lines(id, option.lines);
    move(id, option, [remember('entered', beatId), remember('chose', option.id), ...extras]);
  }

  if (beat === 'ready') {
    const mend = row.mends.find(item => {
      const id = item.id.split('/').at(-1);
      return !rule.has('mended', id) && near(places[id], 1.1);
    });
    if (mend && view.wrench && world.scrap >= mend.scrap) {
      state.wrenchSeconds = (state.mend === mend.id ? state.wrenchSeconds : 0) + dt;
      state.mend = mend.id;
      if (state.wrenchSeconds + 1e-9 >= mend.wrenchSeconds) {
        const id = mend.id.split('/').at(-1);
        choose('mended/' + id, [remember('mended', id), {type: 'scrap', by: -mend.scrap}, ...rule.effects(mend.effects)]);
        lines('mended/' + id, mend.after);
        cue('mended/' + id, mend.cue, places[id]);
      }
      return out;
    }
    state.mend = null;
    if (mend && mend.id !== previous.nearMend) text('at/' + mend.id, mend.what);
    state.nearMend = mend?.id;
    if (decision.interact && near(places.dace)) {
      decision.interact = false;
      move('ready', row, [remember('entered', beat)]);
    }
    return out;
  }

  if (beat === 'away') {
    const after = daceMarked(world, 'took-it-in-the-night') ? 'he-took-it' : 'leaving';
    const age = ageOfBeat(world, after);
    const radio = daceMarked(world, 'radio-mended'), checked = daceMarked(world, 'radio-check');
    const relayed = rule.ask(word('radio-hill', 'Friendly'));
    const noon = day === 'noon' || day === 'day' && daySeconds >= NOON_SECONDS;
    const trouble = row.lines.slice(3, 7).find(line => rule.ask(line.when));
    const early = trouble && row.lines.indexOf(trouble) < 5;
    const canHear = radio && !view.onFoot && (view.onRoad || relayed || checked || distance(here, places.hearth) <= 80);
    if (canHear && trouble && age >= (early ? 0 : 1) && (dusk || age > (early ? 0 : 1) || (checked || relayed) && noon)) {
      move('away/distress', {next: 'call'}, [remember('entered', 'away')]);
      return out;
    }
    if (canHear && checked && !trouble) {
      const i = age === 0 ? dusk ? 1 : noon ? 0 : -1 : age === 1 && (noon || dusk) ? 2 : -1;
      const entry = row.lines[i];
      const part = i === 1 ? 'dusk' : 'noon';
      const scheduled = threadRule(story, {...context, view: {...view, partOfDay: part}}, record);
      if (entry && !rule.has('heard', 'schedule-' + i) && scheduled.ask(entry.when)) {
        choose('heard/schedule-' + i, [remember('heard', 'schedule-' + i)]);
        lines('schedule/' + i, [{...entry, when: undefined}]);
      }
    }
    if ((age >= 1 && dusk) || age >= 2) {
      const next = rule.ask(row.next[0].when) ? 'hearth' : 'late';
      move('away/return', {next}, [remember('entered', 'away')]);
    }
    return out;
  }

  if (beat === 'call') {
    const away = story.beats.away.lines;
    const trouble = away.slice(3, 7).find(line => rule.ask(line.when));
    const report = trouble === away[5] ? [trouble] : [trouble, away.at(-1)].filter(Boolean);
    const id = daceMark('call/decision');
    const choice = talk(id, {...row, lines: report}, 'dace', null, {radio: true, interact: !view.onFoot});
    const option = row.choices.find(row => choice?.id === id + '/' + row.id);
    if (option) playChoice(beat, option);
    else if (out.requests.some(request => request.type === 'talk') && !rule.has('heard', 'distress')) {
      const rescue = daceRescuePlaces(rule, site());
      choose('heard/distress', [remember('heard', 'distress')]);
      cue('distress', trouble?.cue, rescue.truck);
      if (rescue.truck) out.requests.push({type: 'marker', place: {...atGround(rescue.truck), radius: 300}});
    }
    return out;
  }

  if (beat === 'together' || beat === 'search') {
    const rescue = beat === 'search' ? daceRescuePlaces(rule, site()) : null;
    const mission = rescue ? rescueMission(rescue) : daceDriveMission();
    if (rescue) state.rescue = rescue;
    const holder = 'thread:' + DACE_ID + '/' + beat;
    const running = decision.activeMission === mission.id;
    const events = previousEvents.filter(event => event.id === mission.id);
    const finished = events.find(event => event.type === 'threadMissionOutcome' || event.type === 'threadMissionCancelled');
    if (finished) {
      out.mission = null;
      out.release = holder;
      if (finished.outcome) {
        const outcome = mission.outcomes[finished.outcome];
        const effects = rescue ? rule.effects(row.effects) : [];
        const left = finished.outcome === 'car-wrecked';
        const stopped = ['hill', 'stones', 'the-place'].includes(rescue?.reason);
        if (rescue && (left || stopped) && !effects.some(effect => effect.id === daceMark('pickup-left-out')))
          effects.push(story.beats.search.effects.find(effect => effect.id === daceMark('pickup-left-out')));
        move('mission/' + beat + '/' + finished.outcome, outcome, effects.map(({when, ...effect}) => effect));
        if (!rescue) {
          out.dusk = true;
          cue('found', 'open.site.found', site());
        }
      }
      return out;
    }
    if (!running && !decision.activeMission && !decision.journey && !view.onFoot && !view.combatWrecking &&
        view.outingAvailable !== false && (!rescue || !daceMarked(world, 'left-until-morning') || ageOfBeat(world, 'search') >= 1)) {
      const route = prepareThreadMission(mission, placeAt);
      if (!route) return out;
      out.hold = {holder, systems: mission.holds};
      out.mission = decision.activeMission = mission.id;
      out.events.push({type: 'threadMission', id: mission.id, thread: DACE_ID, beat, holder, mission, route});
      if (!rule.has('entered', beat)) choose('entered/' + beat, [remember('entered', beat),
        ...(!rescue ? [{type: 'rumour', site: cast.site}] : [])]);
    }
    if (rescue && running) {
      if (events.some(event => event.moment === 'dace-aboard')) {
        const starting = row.mission.lines;
        const arrival = starting.slice(0, 5).find(line => rule.ask(line.when));
        lines('found-dace', [arrival, ...starting.slice(5)].filter(Boolean));
      }
      const clues = [places['his-tracks'], rescue.reason === 'rocks' ? null : rescue.truck, places.walking];
      for (const [index, item] of row.explore.entries()) {
        if (!rule.has('found', item.id) && rule.ask(item.when) &&
            (index === 1 ? distance(here, clues[index]) <= 100 : near(clues[index], 5))) {
          choose('found/' + item.id, [remember('found', item.id), ...rule.effects(item.effects)]);
          thought('clue/' + item.id, item.thought);
          cue(item.id, item.cue, clues[index]);
        }
      }
      const questions = row.questions.filter(question => !rule.has('asked', question.id) && rule.ask(question.when));
      if (questions.length) talk(daceMark('search/questions'), {...row, questions}, 'rell', null,
        {radio: true, interact: decision.interact && !view.onFoot, ack: daceMark('search/ack')});
    }
    return out;
  }

  if (beat === 'night-after') {
    if (rule.ask(row.when)) move('night-after', row, [remember('entered', beat)]);
    return out;
  }

  const id = daceMark(beat + '/decision');
  const position = talkAt(beat);
  const reportBeat = ['leaving', 'hearth', 'he-stayed', 'key-was-taken'].includes(beat);
  const waitsForDusk = beat === 'late' || beat === 'hearth';
  const ready = (!waitsForDusk || dusk || !view.dayClock && day === 'day') && (beat !== 'leaving' || daybreak || day === 'day');
  const choice = talk(id, row, talkSpeaker(beat), position, {
    interact: decision.interact && ready && near(position), ack: reportBeat ? id : undefined,
  });
  if (choice) {
    const option = row.choices?.find(row => choice.id === id + '/' + row.id);
    if (option) {
      if (row.cue) cue(beat, row.cue, position);
      playChoice(beat, {...option, effects: [...(row.effects ?? []), ...(option.effects ?? [])]});
    } else if (reportBeat && choice.id === id) {
      cue(beat, row.cue, position);
      const effects = [];
      if (beat === 'hearth') {
        const writing = rule.effects(row.effects);
        const found = writing.some(effect => effect.type === 'find');
        if (found) {
          cue('site-found', 'open.site.found', site());
          const people = siteRow(cast.site)?.people;
          if (people && !rule.ask(word(people, 'Friendly'))) effects.push({type: 'word', person: people, set: 'Friendly'});
        }
        if (writing.some(effect => effect.id === daceMark('square')))
          effects.push(...world.ledger.obligations.filter(item => item.type === 'debt' && item.owedBy === 'dace')
            .map(item => ({type: 'settle', id: item.id})));
      }
      move('end/' + beat, row, [remember('entered', beat), ...effects]);
    }
  }
  return out;
}
