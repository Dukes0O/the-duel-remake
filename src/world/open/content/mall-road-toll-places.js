// Staging and rule inputs for the approved storyline. Its spoken lines stay in the story file.
import story from '../../../story/threads/content/mall-road-toll.js';
import {LAND} from '../../scablands-names.js';
import {ROAD_NET, roadPointFrom} from '../../scablands-road.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {stageOf} from '../open-record.js';
import {nameRow, siteRow} from '../register.js';
import {distanceBetween} from '../../../story/threads/cast.js';

export const TOLL_ID = story.id;
export const TOLL_GATE = story.sign.at;
const road = ROAD_NET.road(story.notes.signStands.road);
const first = road.points[0];
const gate = roadPointFrom(road, first.x, first.z, road.length * story.notes.signStands.share);
const mall = LAND.at('dead-mall');
const before = roadPointFrom(road, gate.x, gate.z, -10);
const after = roadPointFrom(road, gate.x, gate.z, 10);
const heading = Math.atan2(after.x - before.x, after.z - before.z);
const local = (side, along) => ['dead-mall',
  gate.x - mall.x + side * Math.cos(heading) + along * Math.sin(heading),
  gate.z - mall.z - side * Math.sin(heading) + along * Math.cos(heading)];
export const tollPosition = (side, along) => ({...LAND.at(...local(side, along)), heading});
export const TOLL_SITE = {...siteRow(TOLL_GATE), where: [{at: local(0, 0)}], needs: [],
  foundWithin: 160, tell: 'wreckage', tellWithin: 600, storyChoices: true};
export const TOLL_WRECKS = [-24, -18, -12, 12, 18, 24].map(side => tollPosition(side, 0));

const spots = {
  approach: tollPosition(0, -240), pole: tollPosition(0, 0), through: tollPosition(0, 20),
  sump: tollPosition(-6, -4), nan: tollPosition(8, 17), rider: tollPosition(-65, -352),
  turn: tollPosition(-75, -440), west: tollPosition(-380, -165), buggy: tollPosition(-570, 35),
  rejoin: tollPosition(-4, 240), lookout: {...tollPosition(-215, -70), eye: 2.8, range: 360},
  'fire-left': tollPosition(-12, 19), 'fire-right': tollPosition(14, 18), 'fire-back': tollPosition(10, 34),
  'hill-rider': tollPosition(-95, -40), 'extra-left': tollPosition(-24, 30), 'extra-right': tollPosition(24, 30),
};
const at = spot => [TOLL_GATE, spot];
export function tollPlace(place) {
  if (place === TOLL_GATE) return spots.pole;
  return Array.isArray(place) && place[0] === TOLL_GATE ? spots[place[1]] : null;
}

const diner = ['tin-town', 16, 19];
const wash = ['the-wash', 25, -38];
const post = (id, figure, at, home) => ({id, figure, home, talk: null,
  routine: {day: {kind: 'post', at, action: 'stand'}}});

export const TOLL_PEOPLE = [
  post('sump', 'sump', local(-6, -4), TOLL_GATE),
  post('nan-tallow', 'moss', local(8, 17), TOLL_GATE),
  post('sumps-rider', 'road-rat-lookout', local(-65, -352), TOLL_GATE),
  post('dot', 'hetty', diner, 'tin-town'),
  post('rell', 'rell', wash, 'the-wash'),
];

export const TOLL_TALK_ROWS = story.later;
const marked = (world, id) => world.ledger.marks.includes(TOLL_ID + '/' + id);
const promised = (world, id) => world.ledger.obligations.some(row => row.type === 'promise' && row.id === TOLL_ID + '/guard-' + id);
export function tollGateStanding(world) {
  const record = world.open.threads[TOLL_ID];
  return !!record && stageOf(world, TOLL_GATE) !== 'empty';
}

export function tollIgnored(world, record) {
  if (record.end || marked(world, 'stood-called') || ['round', 'caught', 'break', 'shut'].includes(record.beat)) return false;
  const sight = world.open.journal.find(change => change.type === 'thread' && change.key === TOLL_ID && change.after.beat === 'gate');
  return world.ledger.night - (sight?.night ?? record.began) >= story.ignored.afterNights;
}

const cartRows = [
  ['dot', -36], ['camp', -52], ['camp-second', -63], ['walkers', -76], ['nan', -94],
];

function tollFreeWeek(world) {
  const freeAt = world.ledger.history.findLast(change => change.type === 'mark' && change.key === TOLL_ID + '/free-week')?.night;
  return freeAt !== undefined && world.ledger.night < freeAt + story.beats.gate.notes.choiceNumbers['spend-favour'].freeNights;
}

export function stagedToll(world) {
  const beats = {...story.beats};
  const amount = marked(world, 'paid-three') ? 12 : 8;
  const freeWeek = tollFreeWeek(world);
  beats.gate = {...beats.gate, choices: beats.gate.choices.map(row => {
    if (row.id === 'pay') return {...row, when: freeWeek ? {not: {fact: 'night', atLeast: 0}} : {fact: 'scrap', atLeast: amount}};
    if (row.id === 'spend-favour') return {...row, next: undefined};
    return row;
  })};
  const guard = {at: TOLL_GATE, riderStarts: ['fire-left', 'fire-right', 'fire-back', 'hill-rider'].map(at)};
  const escalated = marked(world, 'shot-first');
  if (escalated) guard.riderStarts.push(at('extra-left'), at('extra-right'));
  beats.break = {...beats.break, when: {reach: TOLL_GATE, within: 80}, mission: {...beats.break.mission,
    cars: guard.riderStarts.length, rule: {...beats.break.mission.rule, ...guard, winWrecks: escalated ? 5 : 3,
      recoveryShare: .5, poleCue: story.beats.break.mission.outcomes.won.cue, startWithin: 10, bountyPerWreck: 4}}};

  beats.round = {...beats.round, mission: {...beats.round.mission, enemy: 'road-rats',
    rule: {...beats.round.mission.rule, via: at('west'), viaWithin: 65, destination: at('rejoin'), within: 44,
      lookoutSpots: [at('lookout')], turnsIn: 24, coneDegrees: 155, riderStarts: [at('turn'), at('hill-rider')]}}};
  const buggyChoices = beats.round.choices.map(row => ({...row,
    ...(row.id === 'strip' ? {by: 'wrench'} : {}),
    ...(row.id === 'tell-sump' ? {by: 'say', when: {all: [row.when, {not: {fact: 'mark', id: TOLL_ID + '/buggy-told'}}]}} : {}),
  }));
  beats.gate.choices = [...beats.gate.choices, buggyChoices.find(row => row.id === 'tell-sump')];
  beats.round = {...beats.round, choices: buggyChoices};
  beats.caught = {...beats.caught, choices: beats.caught.choices.map(row =>
    row.id === 'fight-on-the-slope' ? {...row, next: 'slope-fight'} :
      row.id === 'outrun' ? {...row, next: 'slope-run'} : {...row, effects: [
        ...row.effects.filter(effect => effect.id !== TOLL_ID + '/knows-the-round'),
        story.beats.round.mission.outcomes['not-seen'].effects[0],
      ]})};
  const slopeRule = {at: at('rider'), riderStarts: [at('turn'), at('extra-left')], boxedInSeconds: 6, recoveryShare: .5};
  beats['slope-fight'] = {mission: {id: TOLL_ID + '/slope-fight', kind: 'fight', by: 'car', enemy: 'road-rats',
    cars: 2, rule: {...slopeRule, winWrecks: 2}, outcomes: {
      won: {effects: [story.beats.round.mission.outcomes['not-seen'].effects[0]], next: 'gate'},
      lost: {next: 'gate'},
    }}};
  beats['slope-run'] = {mission: {id: TOLL_ID + '/slope-run', kind: 'lookout', by: 'car', enemy: 'road-rats',
    rule: {...beats.round.mission.rule, lookoutSpots: [], pursuit: true, wrecked: 'wrecked'}, outcomes: {
      'not-seen': {effects: [story.beats.round.mission.outcomes['not-seen'].effects[0]], next: 'gate'},
      wrecked: {next: 'gate'},
    }}};

  const carts = cartRows.filter(([id]) => marked(world, id === 'camp-second' ? 'camp-two-carts' : 'stands-' + id))
    .map(([id, along]) => ({id, at: tollPosition(0, along), car: 'falcone_heritage',
      promise: promised(world, id), priority: id === 'nan'}));
  if (['Friendly', 'Sworn'].includes(world.ledger.words.traders)) carts.push({
    id: 'traders', at: tollPosition(0, -112), car: 'falcone_heritage', promise: false,
  });
  const standing = 1 + carts.filter(row => row.id !== 'camp-second').length;
  const called = world.open.journal.findLast(change => change.type === 'thread' && change.key === TOLL_ID && change.after.beat === 'stand');
  beats.stand = {...beats.stand, when: {all: [{reach: TOLL_GATE, within: 115},
    {any: [story.beats.stand.when, {fact: 'night', atLeast: (called?.night ?? world.ledger.night) + 1}]}]},
    mission: {...beats.stand.mission, enemy: 'road-rats', rule: {...beats.stand.mission.rule,
      at: TOLL_GATE, carts, standing, offerAfter: 60, offerWithin: 24, passage: at('through'),
      warned: marked(world, 'sump-warned'), start: at('approach')}},
  };
  if (world.ledger.marks.includes('burned-camp/toll-promised')) {
    const wage = beats['wage-offer'];
    beats['wage-offer'] = {...wage, choices: wage.choices.map(row => row.id === 'no-wage' ? {...row,
      effects: [...row.effects, {type: 'mark', id: TOLL_ID + '/promise-broken'},
        {type: 'feud', of: 'road-rats', by: 1}, {type: 'roadWord', by: 1},
        {type: 'settle', id: 'burned-camp/toll-promised'}]} : row)};
  }
  const nanStood = marked(world, 'stands-nan');
  if (nanStood) for (const [name, id] of [['wage-offer', 'no-wage'], ['wage-offer', 'wage'], ['stand', 'drive-through']]) {
    const beat = beats[name];
    beats[name] = {...beat, choices: beat.choices.map(row => row.id === id ? {...row,
      effects: [...row.effects, {type: 'word', person: 'nan-tallow', by: id === 'drive-through' ? -1 : 1}]} : row)};
  }
  return {...story, beats};
}

export function tollVisitPosition(id, cast, view, placeAt) {
  if (id === 'nan-tallow') return spots.nan;
  if (id === 'sump') return spots.sump;
  if (id === 'rell') return view.people?.find(row => row.id === id)?.position ?? LAND.at(...wash);
  if (id === '{camp.leader}') return placeAt([cast.camp, 'door'], cast) ?? placeAt(cast.camp, cast);
  if (id === 'auntie-solder') return placeAt(['tin-town', 'hearth'], cast);
  if (id === 'sumps-rider') return spots.rider;
  if (id === 'dot') return view.people?.find(row => row.id === id)?.position ?? LAND.at(...diner);
  return null;
}

export const atTollPerson = (context, record, id, within = 3) => distanceBetween(
  context.view.player?.position ?? context.view.player, tollVisitPosition(id, record.cast, context.view, context.placeAt, context.world)) <= within;

export function tollGateSolids(pole, heightAt) {
  const rows = [...TOLL_WRECKS.map((at, index) => ({...at, id: TOLL_ID + '/wreck/' + index,
    halfX: 2.65, halfZ: 2, height: 2})),
  ...(pole ? [{...spots.pole, id: TOLL_ID + '/pole', halfX: 8.8, halfZ: .22, height: 1.05}] : [])];
  return rows.map(row => ({...row, kind: 'prop', shape: 'box', base: heightAt(row.x, row.z)}));
}

export function unusedTollPass(world) {
  const receipt = world.ledger.history.findLast(row => row.type === 'mark' && row.night === world.ledger.night &&
    (row.key.startsWith(TOLL_ID + '/paid-') || row.key.startsWith(TOLL_ID + '/pass-paid-')));
  const used = receipt && 'pass-used-' + receipt.key.slice(TOLL_ID.length + 1);
  return used && !marked(world, used) ? TOLL_ID + '/' + used : null;
}

export function tollPoleUp(world, record) {
  return record.beat === 'stand' || !!unusedTollPass(world) || tollFreeWeek(world) || record.end === 'sold';
}

export function pastTollPole(point) {
  const along = point && (point.x - gate.x) * Math.sin(heading) + (point.z - gate.z) * Math.cos(heading);
  return along >= 15 && distanceBetween(point, gate) <= 80;
}

export function tollParkedCars(world, record, fighting) {
  if (!tollGateStanding(world) || record.beat === 'stand' || fighting) return [];
  const nan = {...tollPosition(11, 23), car: 'falcone_heritage'};
  return [nan, ...[spots['fire-left'], spots['fire-right'], spots['fire-back'], spots['hill-rider']]];
}

export function tollAfterEnd(context, record, interact) {
  if (!['stands', 'paid', 'kept', 'closed'].includes(record.end)) return {};
  const {world, view} = context;
  const apology = record.end === 'closed' && !marked(world, 'road-reopened');
  const amount = apology ? 30 : record.end === 'kept' ? 1 : 12;
  const id = TOLL_ID + '/regular-payment';
  const hasPass = !!unusedTollPass(world) || tollFreeWeek(world);
  if (hasPass || world.scrap < amount || !view.onFoot || !atTollPerson(context, record, 'sump', 2.5)) return {};
  if (view.jobEvents?.some(event => event.type === 'talkChoice' && event.id === id)) {
    const number = world.ledger.history.filter(row => row.key.startsWith(TOLL_ID + '/pass-paid-')).length;
    return {choices: [{id: id + '/' + number, effects: [{type: 'scrap', by: -amount},
      {type: 'mark', id: TOLL_ID + '/pass-paid-' + number},
      ...(apology ? [{type: 'mark', id: TOLL_ID + '/road-reopened'}] : [])]}],
    events: ['open.toll.bucket', 'open.toll.pole'].map(cue => ({type: 'threadCue', id, cue}))};
  }
  if (!interact || !view.openRoam) return {};
  const words = apology ? story.beats.shut.choices[0].words :
    record.end === 'kept' ? 'Pay one scrap.' : 'Pay twelve scrap.';
  return {request: {type: 'talk', threadPriority: true, id, speaker: 'sump', asked: [], scene: {id,
    choices: [{id, words}, {id: id + '/leave', words: 'I will call again if I need you.'}]}}};
}

const lineFor = (row, rule) => ({...row, speaker: rule.line(row.speaker), words: rule.line(row.words)});
const visitOwners = {'promise-dot': 'dot', 'no-promise-dot': 'dot', 'promise-camp': '{camp.leader}',
  'no-promise-camp': '{camp.leader}', 'send-word': 'auntie-solder', 'not-yet': 'auntie-solder'};
const repeatable = new Set(['pay', 'round', 'break', 'home', 'round-again', 'home-again', 'sorry-bucket']);
export function tollTalk(context, record, beat, rule) {
  const {view} = context, {beat: beatId} = record;
  const id = TOLL_ID + '/' + beatId + '/decision';
  const people = beatId === 'visits' ? ['dot', '{camp.leader}', 'rell', 'nan-tallow', 'auntie-solder'] :
    beatId === 'gate' ? ['sump', 'nan-tallow'] : beatId === 'caught' ? ['sumps-rider'] :
      ['shut', 'wage-offer'].includes(beatId) ? ['sump'] : [];
  const permitted = (row, who) => beatId === 'visits' ? visitOwners[row.id] === who : who !== 'nan-tallow';
  const options = (beat.choices ?? []).filter(row => (repeatable.has(row.id) || !rule.has('chose', row.id)) && rule.ask(row.when));
  const available = (beat.questions ?? []).filter(row => (!rule.has('asked', row.id) ||
    row.id === 'ask-nan' && !marked(context.world, 'stands-nan')) && rule.ask(row.when));
  const completed = (view.jobEvents ?? []).find(event => event.type === 'talkChoice' && event.scene === id);
  const asked = (view.jobEvents ?? []).filter(event => event.type === 'openTalkQuestion' && event.scene === id)
    .map(event => (beat.questions ?? []).find(row => row.id === event.id)).filter(Boolean);
  if (completed || asked.length) return {asked, option: options.find(row => completed?.id === id + '/' + row.id)};
  if (!view.openRoam || !view.onFoot) return {};
  const who = people.find(person => atTollPerson(context, record, person, 2.5));
  if (!who) return {};
  const questions = available.filter(row => row.to === who).map(row => ({id: row.id, words: rule.line(row.words),
    lines: row.lines.filter(line => rule.ask(line.when)).map(line => lineFor(line, rule))}));
  if (who === 'nan-tallow' && beatId === 'gate' && questions.some(row => row.id === 'nan-hello') &&
      !questions.some(row => row.id === 'why-pay')) {
    const follow = beat.questions.find(row => row.id === 'why-pay');
    questions.push({id: follow.id, words: follow.words, needs: ['nan-hello'],
      lines: follow.lines.map(line => lineFor(line, rule))});
  }
  const choices = options.filter(row => permitted(row, who)).map(row => ({
    id: id + '/' + row.id, words: rule.line(row.words),
    ...(row.id === 'pay' && marked(context.world, 'paid-three') ? {detail: '12 scrap'} : {}),
  }));
  if (!questions.length && !choices.length) return {};
  const at = tollVisitPosition(who, record.cast, view, context.placeAt);
  const speaker = who === '{camp.leader}' ? nameRow(record.cast.camp)?.leader : who;
  return {request: {type: 'talk', threadPriority: true, id, speaker,
    position: {...at, y: at.y ?? scablandsSurfaceHeightAt(at.x, at.z)},
    asked: [], scene: {id, questions, choices: [...choices, {id: id + '/leave', words: 'I will call again if I need you.'}]}}};
}

export function tollOffer(mission, beat, rule) {
  const id = mission.id + '/offer';
  const line = mission.lines.find(row => row.moment === 'afterSeconds');
  return {type: 'talk', threadPriority: true, radio: true, id, speaker: line.speaker, asked: [],
    scene: {id, lines: [lineFor(line, rule)], thoughts: mission.thoughts.map(row => rule.line(row.thought)),
      choices: beat.choices.map(row => ({id: mission.id + '/' + row.id, words: row.words}))}};
}

export function tollMissionResult(beat, outcome, result, world) {
  if (beat !== 'stand') return [];
  if (outcome === 'shooting-first') return [{type: 'mark', id: TOLL_ID + '/shot-first'}];
  const broken = outcome === 'sold' ? ['dot', 'camp'].filter(id => promised(world, id)) : result?.broken ?? [];
  return broken.flatMap(id => [{type: 'settle', id: TOLL_ID + '/guard-' + id},
    {type: 'mark', id: TOLL_ID + '/promise-broken'},
    ...(outcome !== 'sold' ? [{type: 'word', person: id === 'camp' ? '@camp.people' : id, by: -1}] : [])]);
}
