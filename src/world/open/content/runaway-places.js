import runaway from '../../../story/threads/content/runaway.js';
import {LAND} from '../../scablands-names.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {distance} from '../site-rule.js';
import {isTrue} from '../facts.js';
import {feudOf, isFound} from '../open-record.js';

const town = LAND.at('tin-town');
const townPoint = ({x, z}) => LAND.at('tin-town', x - town.x, z - town.z);
const fork = LAND.between('tin-town', 'boneyard', .055);
const atFork = (east, south) => LAND.at('tin-town', fork.x - town.x + east, fork.z - town.z + south);
export const RUNAWAY_PLACES = Object.freeze({
  'footprints': LAND.at('tin-town', -66, 10),
  'wire': townPoint(NIGHT_2_SITES.westGap.position),
  'bowl': LAND.at('tin-town', 26.7, 49),
  'handprint': LAND.at('tin-town', 25.5, 48.5),
  'in-the-shed': LAND.at('tin-town', 26, 47.1),
  'in-the-loft': LAND.at('tin-town', -7.5, -42),
  'in-the-woodpile': LAND.at('tin-town', 34, 7),
  'among-the-walkers': LAND.at('tin-town', -13, -34),
  hearth: townPoint(NIGHT_2_SITES.hearthApproach.position),
  gate: townPoint(NIGHT_2_SITES.gateTalk.position),
  'west-entry': townPoint(NIGHT_2_SITES.westGap.position),
  'defence-1': LAND.at('tin-town', -57, 9),
  'defence-2': LAND.at('tin-town', -52, 15),
  'defence-3': LAND.at('tin-town', -63, 19),
  'defence-4': LAND.at('tin-town', -50, 23),
  'defence-5': LAND.at('tin-town', -59, 28),
  'defence-6': LAND.at('tin-town', -47, 30),
  'gate-entry': townPoint(NIGHT_2_SITES.gateOutside.position),
  walkers: townPoint(NIGHT_2_SITES.washApproach.position),
  'deck-folk': LAND.at('ships-in-sand', -120, 80),
  'bus-ring': LAND.at('boneyard', 1800, 400),
  nobody: LAND.between('tin-town', 'boneyard', .83, -28, 36),
  'fork-east': atFork(16, 0),
  'fork-west': atFork(-16, 4),
  'pursuit-east': atFork(24, -20),
  'pursuit-west': atFork(-24, 20),
});

export const RUNAWAY_GATE_RIDERS = Object.freeze(Array.from({length: 5}, (_, index) => ({
  ...LAND.at('tin-town', 6 + index * 5, 70 + (index % 2) * 5), heading: Math.PI,
})));
export const RUNAWAY_CLUE_RANGE = 3;
export const RUNAWAY_SIGN = {...runaway.sign, seenWithin: 22, points: ['footprints', 'wire', 'bowl', 'handprint']};
const has = id => ({fact: 'mark', id: 'runaway/' + id});
const friendly = of => ({fact: 'word', of, atLeast: 'Friendly'});
const near = (point, within = 5) => ({reach: point, within});
const hiding = runaway.beats.hiding;
const placesHidden = hiding.choices.map(choice => choice.id);
const road = runaway.beats['road-out'].mission;
const defence = runaway.beats['wall-fight'].mission;
const breakout = runaway.beats.surrounded.notes.choices['break-out'];
const foundEffects = runaway.beats.found.choices[0].effects;
const noLamps = runaway.beats.search.mission.outcomes['not-found'];
const drawing = runaway.beats['what-he-leaves'];
const positionOfHaven = id => RUNAWAY_PLACES[id] ? 'runaway:' + id : id;
const playerPoint = view => view.player?.position ?? view.player;

const raiding = {fact: 'feud', of: 'ash-men', atLeast: 'Raiding'};
const safeTownEnds = ['kept', 'paid', 'hidden'];
const noFriend = (world, id) => !isTrue(friendly(id), world) ||
  (id === 'walkers' ? isTrue({fact: 'mark', id: 'walkers-inside'}, world) :
    id !== 'deck-folk' && !isFound(world, id));

export function runawayPlace(place, cast) {
  if (place === '@haven' && cast.haven) return RUNAWAY_PLACES[cast.haven] ?? null;
  if (typeof place === 'string' && place.startsWith('runaway:')) return RUNAWAY_PLACES[place.slice(8)] ?? null;
  return null;
}

export function runawayCanStart(context) {
  const {view} = context;
  return view.checkpointsEnabled && view.partOfDay === 'dawn' &&
    distance(playerPoint(view), town) <= 120;
}

export function runawayBeat(record, context) {
  const {beat: id, end} = record;
  const {world} = context;
  if (end) {
    const ended = world.open.journal.findLast(row => row.type === 'thread' && row.key === 'runaway' && row.after.end === end)?.night;
    if (safeTownEnds.includes(end) && world.ledger.night > (ended ?? record.began)) return {id: 'what-he-leaves', ...drawing,
      when: {all: [{part: 'dawn'}, near('runaway:hearth', 7)]}, next: undefined};
    if (end === 'sent-on' && record.cast.haven) return {id: 'drawn-at-the-haven', ...runaway.beats['drawn-at-the-haven'],
      when: near('@haven', 18), next: undefined};
    return null;
  }
  const beat = runaway.beats[id];
  switch (id) {
    case 'prints': return {...beat, explore: beat.explore.map(item => ({...item, when: near('runaway:' + item.id, RUNAWAY_CLUE_RANGE)})),
      next: [{when: {found: 'handprint'}, to: 'shed'}]};
    case 'shed': return {...beat, when: near('runaway:in-the-shed', 4)};
    case 'hearth': {
      const next = beat.next.map((to, index) => ({id: to, by: 'go', next: to,
        when: near(['runaway:in-the-woodpile', 'runaway:in-the-shed', 'runaway:gate'][index], 5)}));
      return {...beat, when: near('runaway:hearth', 7), walked: next};
    }
    case 'hiding': return {...beat, choices: beat.choices.map(choice => ({...choice,
      when: {all: [choice.when, near('runaway:' + choice.id)].filter(Boolean)}}))};
    case 'gate': return {...beat, when: {all: [{part: 'dusk'}, near('runaway:gate', 8)]},
      effects: [{type: 'mark', id: 'runaway/raiding-at-gate', when: raiding}], choices: beat.choices.map(choice => {
      if (choice.id === 'no-boy') return {...choice, next: [{when: has('wim-told'), to: 'gate'}, {to: 'search-asked'}]};
      if (choice.id === 'hand-back' && feudOf(world, 'ash-men') === 'Watching')
        return {...choice, effects: choice.effects.filter(effect => effect.type !== 'feud')};
      return choice;
    })};
    case 'search-asked': return {...beat, when: {all: [{part: 'dark'}, near('runaway:gate', 15)]}};
    case 'search': {
      const {mission} = beat;
      return {...beat, mission: {...mission, rule: {...mission.rule,
        places: Object.fromEntries(placesHidden.map(key => [key, 'runaway:' + key])),
        entrances: ['runaway:west-entry', 'runaway:gate-entry'],
        hiding: placesHidden.find(key => isTrue(has(key), world)) ?? placesHidden[0],
        delay: isTrue(has('wire-mended'), world) ? mission.rule.wireMendedDelaySeconds : 0,
        whistle: isTrue(mission.rule.whistleWhen, world),
      }}};
    }
    case 'search-slept': {
      const index = placesHidden.findIndex(key => isTrue(has(key), world));
      const {name, foundChanceBySearchOrder} = runaway.beats['search-asked'].notes.choices['his-chance'].draw;
      const chance = foundChanceBySearchOrder[index === 3 ? 0 : Math.max(index + 1, 1)];
      const found = isTrue({fact: 'draw', name, chance}, world, {draw: 'runaway/night-' + world.ledger.night});
      return {...beat, mission: undefined, when: {part: 'dawn'}, lines: [beat.lines[Number(found)]].map(row => ({...row, when: undefined})),
        effects: found ? foundEffects : noLamps.effects, next: found ? 'taken' : 'hidden'};
    }
    case 'found': return {...beat, choices: beat.choices.map(choice => ({
      ...choice, effects: choice.effects.map(effect => effect.id === 'runaway/found-in-search' ? foundEffects[1] : effect),
    }))};
    case 'wall-fight': return {...beat, mission: {...defence, rule: {...defence.rule,
      at: 'runaway:west-entry', entries: Array.from({length: 6}, (_, i) => 'runaway:defence-' + (i + 1)),
      count: isTrue(has('raiding-at-gate'), world) ?
        defence.rule.searchersWhenRaiding : defence.rule.searchers,
    }}};
    case 'road-out': {
      const havens = runaway.cast.haven.among.filter(id => !noFriend(world, id));
      return {...beat, when: {any: [{part: 'day'}, {part: 'dawn'}]}, lines: isTrue(has('broke-out'), world) ? [] : beat.lines, mission: {...road, enemy: 'ash-men', rule: {...road.rule, within: 35,
        destinations: (havens.length ? havens : ['nobody']).map(id => ({id, at: positionOfHaven(id)})),
        lookoutSpots: ['runaway:fork-east', 'runaway:fork-west'],
        riderStarts: ['runaway:pursuit-east', 'runaway:pursuit-west'],
        lookouts: road.rule.riderCarsAtFirstFork, riders: road.rule.riderCarsAtFirstFork,
        range: road.rule.lookedIntoWithinMetres, seenAfterSeconds: road.rule.lookedIntoAfterSeconds,
        escaped: isTrue(has('broke-out'), world),
      }}};
    }
    case 'surrounded': return {...beat, choices: beat.choices.map(choice => choice.id === 'break-out' ?
      {...choice, next: 'breakout'} : choice)};
    case 'breakout': return {mission: {...road, id: 'runaway/the-breakout', enemy: 'ash-men', outing: false,
      rule: {breakout: true, riderStarts: ['runaway:pursuit-east', 'runaway:pursuit-west',
        'runaway:fork-east', 'runaway:fork-west']}, outcomes: {
        won: {effects: [...breakout.won, {type: 'mark', id: 'runaway/broke-out'}], next: 'road-out'},
        lost: {effects: breakout.lost, next: breakout.lostNext},
      }}};
    default: return beat;
  }
}


// Reuse the Tin Town, Clinker and rider figures until the authored look has a card.
const standing = (id, figure, point, talk) => ({id, figure, talk,
  ...(point ? {position: point} : {})});
export function runawayPeople(world, search, sitePositions, part) {
  const record = world.open.threads.runaway;
  if (!record) return [];
  const {beat, end, cast} = record;
  const rows = [];
  const hiddenAt = placesHidden.find(key => isTrue(has(key), world));
  if (search?.target) rows.push(standing('slack', 'tin-child', search.target, 'slack'));
  else if (safeTownEnds.includes(end)) rows.push(standing('slack', 'tin-child', RUNAWAY_PLACES.hearth, 'slack'));
  else if (end === 'sent-on' && cast.haven) {
    const at = RUNAWAY_PLACES[cast.haven] ?? sitePositions?.[cast.haven]?.position ?? sitePositions?.[cast.haven];
    if (at) rows.push(standing('slack', 'tin-child', at, 'slack'));
  } else if (!end && ['shed', 'hearth', 'hiding', 'gate', 'search-asked', 'found', 'wall-fight'].includes(beat)) {
    const at = isTrue(has('sent-on'), world) || isTrue(has('sent-alone'), world) ? null :
      beat === 'hearth' ? RUNAWAY_PLACES.hearth : RUNAWAY_PLACES[hiddenAt ?? 'in-the-shed'];
    if (at) rows.push(standing('slack', 'tin-child', at, 'slack'));
  }
  if ((!end && ['search-asked', 'search', 'found', 'wall-fight'].includes(beat)) ||
      (part === 'dusk' && (beat === 'gate' || beat === 'prints'))) {
    const at = RUNAWAY_PLACES['gate-entry'];
    rows.push(standing('clinker', 'clinker', at, 'clinker'));
  }
  for (const [index, lamp] of (search?.lamps ?? []).entries())
    rows.push({...standing('runaway-searcher-' + index, 'road-rat-lamp', lamp, null), yaw: lamp.heading});
  if (cast.haven === 'deck-folk')
    rows.push(standing('captain-imre', 'walker-1', RUNAWAY_PLACES['deck-folk'], 'captain-imre'));
  if (cast.haven === 'bus-ring') rows.push(standing('gasket', 'walker-3', RUNAWAY_PLACES['bus-ring'], 'gasket'));
  if (cast.haven === 'walkers' && !isTrue({fact: 'mark', id: 'walkers-inside'}, world))
    rows.push(standing('rell', 'rell', RUNAWAY_PLACES.walkers, 'rell'));
  return rows;
}
