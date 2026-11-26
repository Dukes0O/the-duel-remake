// Adapts the authored Market Day scenes to the open roam talk and mission contracts.
import marketDay from '../../story/threads/content/market-day.js';
import {distanceBetween} from '../../story/threads/cast.js';
import {mark, threadMark, threadRule} from '../../story/threads/thread-rule.js';
import {validateTalkScene} from '../../story/talk.js';
import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {STORY_FIGURES} from '../jobs/story-people.js';
import {MARKET_FIGURES, MARKET_GUESTS, MARKET_HOME, MARKET_PLACES} from './content/market-day-places.js';
import {campPeople} from './content/people-sites.js';
import {isHeld} from './holds.js';
import {nameOf, nameRow} from './register.js';
import {residentPose, sitePosition} from './site-rule.js';
import {isFound, stageOf} from './open-record.js';
import {prepareThreadMission} from './parts/missions.js';

const {id, beats} = marketDay;
const range = 2.5;
const yardRadius = 72;
const arrangement = {far: 'bess-shed', beside: 'the-forge-wall'};
const markId = suffix => id + '/' + suffix;
const marked = (world, suffix) => world.ledger.marks.includes(markId(suffix));
const placed = (point, radius = range) => point && {...point, y: scablandsSurfaceHeightAt(point.x, point.z), radius};
const leader = people => nameRow(people)?.leader;
const metGuest = (world, role) => marked(world, 'comes-' + role);
const upcoming = (world, record, role) => record.cast[role] && !metGuest(world, role);

function personHome(person, view, world, seconds) {
  const people = nameRow(person)?.of;
  if (person === 'rell') return view.people?.find(row => row.id === person)?.position ?? MARKET_PLACES.walkers;
  if (['glasshouse', 'radio-hill', 'bus-ring'].includes(people)) {
    const row = campPeople(people).find(row => row.id === person);
    if (row) return residentPose(row, world, {partOfDay: view.partOfDay, routineTime: seconds, ...view.marketSiteState},
      STORY_FIGURES[row.figure].pace).position;
  }
  return MARKET_HOME[people] ?? sitePosition(people, world.open.landSeed);
}

export function allowsMarketCast(role, candidate, cast, world) {
  if (role === 'odd') return candidate === 'bus-ring' && !marked(world, 'quarrel-mended') &&
    MARKET_GUESTS.some(key => cast[key] === 'glasshouse') && !MARKET_GUESTS.some(key => cast[key] === 'bus-ring');
  if (!leader(candidate)) return false;
  if (['glasshouse', 'radio-hill', 'bus-ring'].includes(candidate))
    return isFound(world, candidate) && ['camp', 'outpost', 'town', 'rebuilt'].includes(stageOf(world, candidate));
  return candidate === 'walkers' || !!MARKET_HOME[candidate];
}

const playerAt = view => view.fighter?.position ?? view.player?.position ?? view.player;
const dotPosition = view => {
  const diner = MARKET_PLACES.diner;
  return distanceBetween(playerAt(view), diner) < 100 ? diner : MARKET_PLACES.gate;
};

export function marketStalls(world, record) {
  const stalls = MARKET_GUESTS.filter(role => metGuest(world, role)).map(role => ({
    people: record.cast[role], pitch: marketPitch(world, record.cast[role]),
  })).filter(row => row.people !== 'glasshouse' || !['guest-sent-home', 'glass-broken', 'promise-broken'].some(mark => marked(world, mark)));
  if (marked(world, 'odd-asked') && !marked(world, 'odd-sent-home'))
    stalls.push({people: 'bus-ring', pitch: marketPitch(world, 'bus-ring')});
  return stalls.filter(row => row.people !== 'bus-ring' || !marked(world, 'odd-sent-home'));
}

export function marketPeople(world, view) {
  const record = world.open.threads[id];
  if (!record || record.end) return [];
  const town = LAND.at('tin-town');
  const post = (id, point, {dx = 0, dz = 0, wander = false} = {}) => {
    const at = ['tin-town', point.x - town.x + dx, point.z - town.z + dz];
    return {id, figure: MARKET_FIGURES[id] ?? id, home: 'tin-town', routine: {day: wander ?
      {kind: 'wander', around: at, radius: 1.7, pause: [2, 4]} : {kind: 'post', at, task: 'stand'}}};
  };
  if (record.beat === 'sign' || record.beat === 'asking') {
    const rows = [post('dot', dotPosition(view))];
    const hearth = world.ledger.marks.includes(threadMark(id, 'entered', 'hearth'));
    if (record.beat === 'asking' && !hearth) rows.push(post('auntie-solder', MARKET_PLACES.hearth));
    if (record.beat === 'asking') for (const role of MARKET_GUESTS) {
      if (!upcoming(world, record, role)) continue;
      const person = leader(record.cast[role]), home = MARKET_HOME[record.cast[role]];
      if (home) rows.push(post(person, home));
      if (person === 'rell' && !world.ledger.marks.includes('walkers-inside')) rows.push(post('rell', MARKET_PLACES.walkers));
    }
    return rows;
  }
  if (record.beat === 'stakes') return [post('auntie-solder', MARKET_PLACES.yard)];
  if (!['day', 'rider', 'yard-quarrel', 'glass', 'dusk'].includes(record.beat) ||
      !world.ledger.marks.includes(threadMark(id, 'entered', 'day'))) return [];
  const rows = [post('dot', MARKET_PLACES.gate)];
  const companions = {glasshouse: ['marigold', 'finch'], walkers: ['rell', 'dace', 'wim'],
    'radio-hill': [marked(world, 'bern-came') ? 'bern' : 'hetty']};
  marketStalls(world, record).forEach(({people, pitch}, stall) => {
    const point = MARKET_PLACES[pitch];
    const speaker = people === 'glasshouse' && record.beat === 'yard-quarrel' ?
      MARKET_PLACES[marketPitch(world, 'bus-ring')] : point;
    const residents = companions[people] ?? [leader(people)];
    residents.forEach((person, index) => rows.push(post(person, index ? point : speaker,
      {dx: index * 2.1 + (people === 'glasshouse' && speaker !== point ? 1.3 : 0), dz: index ? stall * .8 : 0, wander: !!index})));
  });
  if (record.beat === 'rider' || marked(world, 'rider-served') || marked(world, 'rider-at-the-fence'))
    rows.push(post('lug', MARKET_PLACES.gate, {dx: 1.2, dz: marked(world, 'rider-served') ? -2 : 0}));
  return rows;
}

function personFor(to, cast) {
  const role = /^\{(first|second|third)\.leader\}$/.exec(to)?.[1];
  return role ? leader(cast[role]) : to;
}

function buildMarketTalkRows() {
  const phases = {dot: ['sign', 'asking'], 'auntie-solder': ['hearth', 'stakes'],
    lug: ['rider'], marigold: ['asking', 'yard-quarrel'], gasket: ['asking', 'yard-quarrel']};
  for (const person of ['rell', 'hetty', 'captain-imre', 'old-smoke', 'sump', 'mrs-vane', 'mr-penny']) phases[person] = ['asking'];
  const rows = Object.fromEntries(Object.entries(phases).map(([person, names]) => [person, names.map(phase => ({
    id: markId(phase + '/' + person), scene: markId(phase + '/' + person),
    needs: {fact: 'thread', id, at: phase === 'hearth' ? 'asking' : phase},
  }))]));
  for (const row of marketDay.later)
    rows[row.by].push({id: markId('later/' + row.by), scene: markId('later/' + row.by), needs: row.when.all[0]});
  return rows;
}

export const MARKET_TALK = buildMarketTalkRows();

function marketMission(world) {
  const beside = marked(world, 'stood-beside');
  const pitch = marked(world, 'stood-far') ? arrangement.far : arrangement.beside;
  const {reachWithin} = beats['yard-quarrel'].notes;
  return {...beats.day.mission, rule: {
    yard: 'yard', gate: 'gate', quarrel: pitch, radius: yardRadius, outsideSeconds: 5,
    opening: 'day', rider: 'rider', dispute: 'yard-quarrel', glass: 'glass', close: 'dusk',
    // Dawn lasts two minutes, then noon is seven minutes into the shared day.
    noon: 9 * 60, quarrelDelay: 60,
    quarrelSeconds: beside ? reachWithin.beside : reachWithin.apart,
    heatedMarks: ['hetty-came', 'rider-served'].map(markId), heatedBy: reachWithin.less,
    glassAtRisk: beside, bell: 'town.gate.bell', voices: beats['yard-quarrel'].cue,
  }};
}

export function marketPitch(world, people) {
  if (people === 'glasshouse') return marked(world, 'stood-in-shade') ? 'the-pump' : 'the-sunny-wall';
  if (people === 'bus-ring') return marked(world, 'stood-far') ? arrangement.far : arrangement.beside;
  return ({walkers: 'beside-the-gate', 'radio-hill': 'news'})[people] ?? 'news';
}

function farewellNight(world) {
  const refused = world.ledger.history.findLast(row => row.type === 'mark' && row.key === threadMark(id, 'chose', 'not-now'));
  return !refused || world.ledger.night >= refused.night + beats.sign.choices[1].again.afterNights;
}

export function marketSignReady(world, record) {
  return record.beat === 'sign' && !record.end &&
    world.ledger.night - record.began < marketDay.ignored.afterNights && farewellNight(world);
}

const due = (world, promise) => world.ledger.obligations.some(row => row.id === markId(promise) && row.due <= world.ledger.night);
const brokePromise = world => marked(world, 'told-no-tinkers') && marked(world, 'odd-asked');
const neighbours = (a, b) => distanceBetween(a, b) <= range;
const arrived = (view, point) => view.onFoot && neighbours(view.fighter?.position ?? view.player?.position ?? view.player, point);

function conditionWithQuestions(rule, when, questions) {
  if (!when) return {available: true, needs: []};
  if (when.all) {
    const parts = when.all.map(part => conditionWithQuestions(rule, part, questions));
    return {available: parts.every(part => part.available), needs: parts.flatMap(part => part.needs)};
  }
  if (when.asked && !rule.has('asked', when.asked) && questions.includes(when.asked))
    return {available: true, needs: [when.asked]};
  return {available: rule.ask(when), needs: []};
}

export function marketDayStep(context, record, previous, interact, activeMission) {
  const {world, view, holds, seconds, previousEvents} = context;
  const {beat, cast} = record;
  const state = {...previous};
  const out = {state, choices: [], requests: [], events: []};
  const rule = threadRule(marketDay, {...context, placeAt: place => MARKET_PLACES[place] ??
    MARKET_PLACES[Array.isArray(place) ? place[1] : '']}, record);
  const write = (key, effects) => out.choices.push({id: markId(key), effects});
  const remember = (kind, key) => mark(threadMark(id, kind, key));
  const move = (key, row, extra = []) => write(key, [...extra, ...rule.effects(row.effects),
    ...rule.move(row.next)]);
  const lines = rows => (rows ?? []).filter(row => rule.ask(row.when)).map(row => ({
    ...row, speaker: personFor(row.speaker, cast), words: rule.line(row.words),
  }));
  const say = (key, rows) => lines(rows).forEach((line, index) => out.requests.push({
    type: 'say', lineId: markId(key + '/' + index), text: (line.as ?? nameOf(line.speaker) ?? line.speaker) + ': ' + line.words,
  }));
  const cue = sound => { if (sound) out.events.push({type: 'threadCue', id, cue: sound}); };
  const marker = point => {
    const next = point && point.x + '/' + point.z;
    if (state.marker === next) return;
    state.marker = next;
    out.requests.push({type: 'marker', place: placed(point)});
  };
  const present = (phase, person, row, questions = row.questions ?? [], options = row.choices ?? []) => {
    const sceneId = markId(phase + '/' + person);
    const offered = questions.filter(question => !rule.has('asked', question.id));
    const known = [...offered.map(question => question.id), ...(view.jobEvents ?? [])
      .filter(event => event.type === 'openTalkQuestion' && event.scene === sceneId).map(event => event.id)];
    const project = rows => rows.flatMap(row => {
      const {available, needs} = conditionWithQuestions(rule, row.when, known);
      return available ? [{id: row.id, words: rule.line(row.words), needs,
        ...(row.thought ? {thought: rule.line(row.thought)} : {})}] : [];
    });
    const visibleQuestions = project(offered).map(option => ({...option,
      lines: lines(questions.find(question => question.id === option.id).lines)}));
    const visibleOptions = project(options);
    const heard = new Set();
    for (const event of view.jobEvents ?? []) {
      if (event.scene !== sceneId || state.offer !== sceneId) continue;
      if (event.type === 'openTalkQuestion') {
        const question = visibleQuestions.find(option => option.id === event.id);
        if (!question || !question.needs.every(needed => heard.has(needed))) continue;
        heard.add(question.id);
        const entry = questions.find(option => option.id === question.id);
        const effects = rule.effects(entry.effects);
        if (phase === 'asking') {
          const role = MARKET_GUESTS.find(role => entry.id.endsWith('-' + role));
          if (role && entry.id === 'ask-glasshouse-' + role && !cast.odd) effects.push(mark(markId('comes-' + role)));
          const entryMark = effects.find(effect => effect.id === markId('comes-' + role));
          if (entryMark) entryMark.text = rule.line('{' + role + '.name} will come to the market.');
        }
        write('question/' + question.id, [remember('asked', question.id), ...effects]);
      }
      if (event.type === 'talkChoice') {
        const chosen = visibleOptions.find(option => option.id === event.id && option.needs.every(needed => heard.has(needed)));
        if (!chosen) continue;
        const option = options.find(row => row.id === chosen.id);
        let effects = [remember('chose', option.id)];
        if (phase === 'sign' && option.id === 'not-now') {
          if (rule.has('chose', option.id)) move('second-refusal', marketDay.ignored);
          else write('first-refusal', effects);
          continue;
        }
        if (phase === 'asking' && option.id !== 'call-market') {
          const role = MARKET_GUESTS.find(role => option.id.endsWith('-' + role));
          effects = [...effects, ...rule.effects(option.effects).map(effect => effect.id === markId('comes-' + role)
            ? {...effect, text: rule.line('{' + role + '.name} will come to the market.')} : effect)];
          move('choose/' + option.id, {...option, effects: []}, effects);
        } else move('choose/' + option.id, option, effects);
        say('answer/' + option.id, option.lines);
      }
    }
    if (view.jobEvents?.some(event => event.scene === sceneId && event.type === 'openTalkClosed' && state.offer === sceneId)) {
      state.offer = null;
      if (phase === 'hearth' && view.jobEvents.some(event => event.scene === sceneId && event.finished))
        write('entered/hearth', [remember('entered', 'hearth')]);
      if (phase === 'later' && view.jobEvents.some(event => event.scene === sceneId && event.finished))
        write('heard/' + row.id, [remember('heard', row.id)]);
    }
    if (!interact) return;
    const heardLines = lines(row.lines);
    if (!visibleOptions.length && !visibleQuestions.length && !heardLines.length) return;
    const scene = {id: sceneId, lines: heardLines, questions: visibleQuestions,
      thoughts: (row.thoughts ?? []).flatMap(thought => typeof thought === 'string' ? [rule.line(thought)]
        : rule.ask(thought.when) ? [rule.line(thought.thought)] : []),
      choices: visibleOptions.length ? visibleOptions : visibleQuestions.length ? [{id: 'close', words: 'I hear you.'}] : []};
    // A talk with conditional final choices must allow the driver to leave it before answering.
    if (scene.choices.length && scene.choices.every(option => option.needs?.length))
      scene.choices.push({id: 'close', words: 'I hear you.'});
    validateTalkScene(scene);
    state.offer = sceneId;
    out.requests.push({type: 'talk', id: sceneId, scene, speaker: person, threadPriority: true});
  };
  const offer = (phase, person, point, row, questions, options) => {
    const sceneId = markId(phase + '/' + person);
    if (!MARKET_TALK[person]?.some(row => row.scene === sceneId)) return;
    if (arrived(view, point) || state.offer === sceneId && view.jobEvents?.length)
      present(phase, person, row, questions, options);
  };

  if (record.end) {
    marker(null);
    for (const row of marketDay.later) {
      if (rule.ask(row.when) && !rule.has('heard', row.id))
        offer('later', row.by, personHome(row.by, view, world, seconds), row);
    }
    return out;
  }

  const missionId = beats.day.mission.id;
  const finished = previousEvents.find(event => event.type === 'threadMissionOutcome' && event.id === missionId);
  if (finished) {
    out.mission = null;
    if (finished.outcome === 'finished') {
      say('dusk', beats.dusk.lines);
      cue(beats.dusk.cue);
      const keepsPromise = !marked(world, 'odd-asked') && world.ledger.obligations.some(row => row.id === markId('no-tinkers'));
      const extras = keepsPromise ? [{type: 'settle', id: markId('no-tinkers')}] : [];
      if (marked(world, 'hetty-came')) {
        const site = ['bus-ring', 'radio-hill', 'glasshouse', 'rats-nest'].find(site => !isFound(world, site) &&
          !world.ledger.marks.includes('rumour/' + site));
        if (site) extras.push({type: 'rumour', site});
      }
      move('dusk', beats.dusk, extras);
    } else move('left', {next: 'calledOff'});
    return out;
  }
  if (beat === 'calledOff' || (!activeMission && due(world, 'hold-market') && beat !== 'sign')) {
    say('called-off', beats.calledOff.lines);
    const extras = world.ledger.obligations.some(row => row.id === markId('no-tinkers')) ?
      [{type: 'settle', id: markId('no-tinkers')}] : [];
    move('called-off', beats.calledOff, extras);
    marker(null);
    return out;
  }
  if (beat === 'sign') {
    if (world.ledger.night - record.began >= marketDay.ignored.afterNights) move('ignored', marketDay.ignored);
    else if (marketSignReady(world, record) && !isHeld(holds, 'signs')) {
      const point = dotPosition(view);
      marker(point);
      offer('sign', marketDay.sign.by, point, beats.sign);
    } else marker(null);
    return out;
  }

  if (beat === 'asking') {
    const {questions, choices} = beats.asking;
    const hearth = !rule.has('entered', 'hearth');
    const here = view.fighter?.position ?? view.player?.position ?? view.player;
    if (!rule.has('entered', beat)) {
      write('entered/' + beat, [remember('entered', beat)]);
      say(beat, [{speaker: 'you', words: beats.asking.thoughts[0]}]);
    }
    const speakers = MARKET_GUESTS.filter(role => upcoming(world, record, role)).map(role => leader(cast[role]));
    if (cast.odd === 'bus-ring' && !rule.has('asked', 'what-tinkers-need')) speakers.push('gasket');
    const contacts = speakers.map(person => ({person, point: personHome(person, view, world, seconds)}))
      .filter(contact => contact.point);
    for (const {person, point} of contacts) {
      const by = questions.filter(question => personFor(question.to, cast) === person);
      const own = choices.filter(choice => by.some(question => choice.when?.asked === question.id ||
        choice.when?.all?.some(when => when.asked === question.id)));
      offer('asking', person, point, {...beats.asking, thoughts: [], lines: person === 'gasket' && !rule.has('asked', 'ask-bus-ring')
        ? beats.asking.lines : []}, by, own);
    }
    if (hearth) offer('hearth', 'auntie-solder', MARKET_PLACES.hearth, beats.hearth);
    const call = choices.find(choice => choice.id === 'call-market');
    const mayCall = !hearth && rule.ask(call.when);
    if (mayCall) offer('asking', 'dot', dotPosition(view), {choices: [call]});
    const target = hearth ? MARKET_PLACES.hearth : mayCall ? dotPosition(view) : contacts
      .filter(({person}) => person !== 'gasket' || cast.odd !== 'bus-ring')
      .sort((a, b) => distanceBetween(a.point, here) - distanceBetween(b.point, here))[0]?.point;
    marker(target ?? null);
    return out;
  }

  if (beat === 'stakes') {
    marker(MARKET_PLACES.yard);
    if (!['dusk', 'dark'].includes(view.partOfDay)) return out;
    if (!rule.has('entered', beat) && arrived(view, MARKET_PLACES.yard)) {
      write('entered/' + beat, [remember('entered', beat)]);
      cue(beats.stakes.cue);
    }
    offer('stakes', 'auntie-solder', MARKET_PLACES.yard, beats.stakes);
    return out;
  }

  if (activeMission && activeMission !== missionId) return out;
  const phase = previousEvents.find(event => event.type === 'threadMissionPhase' && event.id === missionId);
  if (!activeMission && ['day', 'rider', 'yard-quarrel', 'glass', 'dusk'].includes(beat)) {
    marker(MARKET_PLACES.yard);
    const stakes = world.open.journal.findLast(row => row.type === 'thread' && row.key === id && row.after.beat === 'day');
    const opened = rule.has('entered', 'day');
    if (!arrived(view, MARKET_PLACES.yard) || view.combatWrecking || view.missionLeaving ||
        (!opened && (view.partOfDay !== 'dawn' || world.ledger.night <= (stakes?.night ?? record.began)))) return out;
    const mission = marketMission(world);
    const route = prepareThreadMission(mission, place => placed(MARKET_PLACES[place]));
    const holder = 'thread:' + id + '/day';
    out.mission = missionId;
    out.hold = {holder, systems: mission.holds};
    out.events.push({type: 'threadMission', id: missionId, thread: id, beat, holder, mission, route});
    if (!opened) {
      write('entered/day', [remember('entered', 'day')]);
      beats.day.cues.forEach(cue);
      say('day', mission.lines.slice(0, 1));
    }
    return out;
  }
  if (beat === 'day') {
    const linePitches = {'wim': 'beside-the-gate', finch: marketPitch(world, 'glasshouse'), hetty: 'news', bern: 'news', cinder: 'yard'};
    const guests = marketStalls(world, record);
    const linePeople = {wim: 'walkers', finch: 'glasshouse', hetty: 'radio-hill', bern: 'radio-hill'};
    for (const row of beats.day.mission.lines.slice(1)) {
      if ((!linePeople[row.speaker] || guests.some(stall => stall.people === linePeople[row.speaker])) && rule.ask(row.when) && !rule.has('line', row.speaker) &&
          distanceBetween(playerAt(view), MARKET_PLACES[linePitches[row.speaker]]) < 8) {
        write('heard/' + row.speaker, [remember('line', row.speaker)]);
        say('day/' + row.speaker, [row]);
      }
    }
    if (phase?.phase === 'noon') {
      cue(beats.rider.cue);
      move('noon', {next: 'rider'});
    }
  }
  if (beat === 'rider') {
    marker(MARKET_PLACES.gate);
    offer('rider', 'lug', MARKET_PLACES.gate, beats.rider);
  }
  if (beat === 'yard-quarrel') {
    const voices = phase?.phase === 'voices';
    if (voices || rule.has('entered', beat)) {
      if (voices && !rule.has('entered', beat)) write('entered/' + beat, [remember('entered', beat)]);
      const place = MARKET_PLACES[marketPitch(world, 'bus-ring')];
      marker(place);
      if (brokePromise(world)) {
        const reply = beats[beat].choices.find(option => option.id === 'tell-her');
        say('broken-promise', reply.lines.slice(-1));
        move('broken-promise', reply);
      } else if (phase?.phase === 'glass' || phase?.phase === 'missed') {
        move(phase.phase, {next: phase.phase === 'glass' ? 'glass' : 'dusk'});
      } else offer(beat, 'gasket', place, beats[beat]);
    }
  }
  if (beat === 'glass') {
    cue(beats.glass.cue);
    say('glass', beats.glass.lines);
    move('glass-broken', beats.glass);
  }
  if (beat === 'dusk') marker(MARKET_PLACES.yard);
  return out;
}
