// Playable places and routes for the authored Lights on the Whites scenes.
import story from '../../../story/threads/content/lights-on-the-whites.js';
import {LAND} from '../../scablands-names.js';
import {ROAD_NET, roadPointFrom} from '../../scablands-road.js';
import {WHITES_LADDER} from '../../deck-plates.js';
import {distance, sitePosition} from '../site-rule.js';

export const LIGHTS_ID = story.id;
const ships = 'ships-in-sand';
const here = LAND.at(ships);
const offset = (at, x, z) => LAND.at(ships, at.x - here.x + x, at.z - here.z + z);
const mix = (a, b, share) => offset(a, (b.x - a.x) * share, (b.z - a.z) * share);
const lifted = (at, y) => ({...at, y});

const road = ROAD_NET.road('salt-road');
const rail = lifted(LAND.at(ships, 12, 4), 5.5);
const home = LAND.at(ships, 28, 17);
const places = {
  'whites-road-home': roadPointFrom(road, here.x, here.z, -230),
  'whites-road-start': roadPointFrom(road, here.x, here.z, -1050),
  'whites-ship-side': home,
  'whites-boat': rail,
  'whites-basket': lifted(LAND.at(ships, 12, 4), 18),
  'whites-galley': lifted(LAND.at(ships, 4, -3), 4),
  'whites-chart': lifted(LAND.at(ships, 12, 3), 4),
  'whites-bridge-wing': lifted(LAND.at(ships, 15, 7), 4),
};

export const lightsRoad = point => story.notes.sign.seenFromRoads.includes(ROAD_NET.nearest(point?.x, point?.z)?.road.id);

export function lightsPlaces(landSeed) {
  const buoy = sitePosition('bell-buoy', landSeed);
  const crew = mix(here, buoy, 1 - story.notes.sign.shareOfTheWayBack);
  return {...places, 'whites-crew': crew, 'whites-meeting': mix(crew, home, .5)};
}

export function lightsPlace(place, landSeed) {
  if (Array.isArray(place) && place[0] === ships) {
    if (place[1] === 'patience-ladder') return WHITES_LADDER.top;
    place = place[1];
  }
  if (typeof place !== 'string' || !place.startsWith('whites-')) return null;
  return places[place] ?? lightsPlaces(landSeed)[place] ?? null;
}

export const LIGHTS_LADDER_MARK = 'way/patience-ladder';
export const lightsMark = (world, id) => world.ledger.marks.includes(LIGHTS_ID + '/' + id);
const basket = world => lightsMark(world, 'lit-the-basket');
const near = (reach, within) => ({reach: reach.startsWith('whites-') ? [ships, reach] : reach, within});
const away = (reach, within) => ({not: near(reach, within)});
const routeChoice = (row, when, next = row.next) => ({...row, when: row.when ? {all: [row.when, when]} : when, next});

const B = story.beats, salt = B.salt.mission, buoy = B.buoy.mission, rescue = B['two-trips'].mission, walk = B['walk-in'].mission;
const cues = story.notes.haze;
const lamp = story.notes.lamps;
const sounding = B.buoy.notes.outcomes.sounded;
const atShip = near('whites-ship-side', 55);
const towardLights = {not: atShip};
const hasLadder = {fact: 'made', id: LIGHTS_LADDER_MARK};
const firstReturn = {...B['all-hands-home'], when: atShip, next: 'aboard'};
const giveEmber = B.ships.choices.find(row => row.id === 'give-ember');

export const lightsStory = {
  ...story,
  starts: {...story.starts, all: story.starts.all.map(condition => condition.not ?
    {any: [condition, {fact: 'thread', id: LIGHTS_ID, at: 'shelved'}]} : condition)},
  sign: {...story.sign, at: [ships, 'whites-crew'], again: {afterNights: 1}},
  ignored: [
    {when: {fact: 'mark', id: LIGHTS_ID + '/entered/sign'}, afterNights: 1,
      effects: B.sign.choices.find(row => row.id === 'drive-on').effects, next: 'passed-by'},
    {when: {not: {fact: 'mark', id: LIGHTS_ID + '/entered/sign'}}, afterNights: 1, next: 'shelved'},
  ],
  beats: {
    ...B,
    sign: {...B.sign, choices: [
      routeChoice(B.sign.choices[1], atShip),
      routeChoice(B.sign.choices[0], towardLights),
      B.sign.choices[2],
    ]},
    ships: {...B.ships, when: atShip, choices: [
      {...giveEmber, next: 'basket'},
      routeChoice(B.ships.choices[2], near('whites-road-home', 80)),
      routeChoice(B.ships.choices[1], away('whites-ship-side', 85)),
    ]},
    basket: {next: [{when: near('whites-road-home', 70), to: 'home-by-the-basket'},
      {when: away('whites-ship-side', 85), to: 'salt'}, {when: {seconds: 180}, to: 'home-by-the-basket'}]},
    salt: {mission: {...salt, rule: {...salt.rule, destination: 'whites-crew',
      within: salt.rule.foundWithinMetres, success: 'found', failure: 'lost',
      limitSeconds: salt.rule.seconds + salt.rule.searchSecondsAfterLastLamp, timedMoments: [
        {name: 'first-lamp-out', after: 1, cue: lamp.outCue},
        {name: 'haze-down', after: cues.downAfterSecondsOffRoad, cue: cues.cue},
        {name: 'last-lamp-out', after: salt.rule.seconds, cue: lamp.outCue},
      ]}}},
    buoy: {mission: {...buoy, rule: {...buoy.rule, destination: 'bell-buoy', within: 24, success: 'sounded',
      nearCue: {within: buoy.rule.bellHeardMetres, cue: buoy.rule.bellCue}},
    outcomes: {sounded: {...buoy.outcomes.sounded, next: 'sounding'}}}},
    sounding: {thoughts: sounding.thoughts, questions: sounding.questions,
      next: [{when: away('bell-buoy', 60), to: 'back-to-cart'}]},
    'back-to-cart': {mission: {id: LIGHTS_ID + '/back-to-cart', kind: 'reach', by: 'car',
      rule: {destination: 'whites-crew', within: 70, marker: false, success: 'back',
        limitSeconds: 270, failure: 'lost'},
      outcomes: {back: {lines: sounding.backAtTheCart, next: 'crew-after-sounding'}, lost: salt.outcomes.lost}}},
    'crew-after-sounding': {...B.crew, lines: undefined},
    'two-trips': {mission: {...rescue, rule: {...rescue.rule, home: 'whites-ship-side', pickup: 'whites-crew',
      people: 4, startLoaded: true, success: 'found', failure: 'not-found', lampSeconds: lamp.secondsEach,
      lampOutCue: lamp.outCue}}},
    'walk-in': {mission: {...walk, rule: {...walk.rule, pickup: 'whites-crew', home: 'whites-ship-side',
      success: 'all-in', walkedIn: 'sprat-walked', moments: [...walk.rule.moments, 'between-stretches']},
    thoughts: [{thought: B['walk-in'].notes.between.text, moment: 'between-stretches'}]}},
    'all-hands-home': firstReturn,
    'home-by-the-basket': {...B['home-by-the-basket'], next: 'aboard'},
    'two-at-dawn': {...B['two-at-dawn'], when: atShip, next: 'two-at-dawn'},
    'in-at-dawn': {...B['in-at-dawn'], when: atShip, next: 'in-at-dawn'},
    aboard: {...B.aboard, when: {all: [hasLadder, {nights: 1}]},
      lines: B.aboard.lines.slice(0, 1), notes: {...B.aboard.notes, watch: B.aboard.lines.slice(-1)},
      explore: B.aboard.explore.map(row => ({...row, when: near('whites-chart', 3)}))},
    shelved: {next: 'sign'},
  },
  // These authored names denote both a scene and its eventual result. Enter
  // the scene first. Only its own closing hop records the end.
  ends: story.ends,
};

export function lightsMission(mission, world, state, seconds) {
  if (mission.kind === 'rescue') {
    const guided = lightsMark(world, 'sprat-led');
    const meeting = guided || basket(world) ? {at: 'whites-meeting', outcome: guided ? 'met-on-the-way' : 'met-by-the-basket'} : undefined;
    const lampAge = Math.max(0, seconds - (state.beatSeconds.crew ?? seconds));
    return {...mission, rule: {...mission.rule, meeting, lampAge,
      lampSeconds: guided ? lamp.secondsEachWithoutWick : mission.rule.lampSeconds}};
  }
  if (mission.kind === 'escort') return {...mission, rule: {...mission.rule,
    guide: lightsMark(world, 'asked/sprat-knows')}};
  if (mission.id === B.salt.mission.id && lightsMark(world, 'entered/ships')) return {...mission,
    rule: {...mission.rule, timedMoments: mission.rule.timedMoments.filter(row => row.name !== 'first-lamp-out')}};
  return mission;
}

export function lightsGo(choice, point, landSeed) {
  if (choice.id !== 'follow') return true;
  const p = lightsPlaces(landSeed);
  const toCrew = distance(point, p['whites-crew']);
  const roadHome = p['whites-road-home'];
  const toShip = distance(point, p['whites-ship-side']);
  return !lightsRoad(point) && toCrew < distance(p['whites-crew'], roadHome) - 40 && toShip > 85;
}

export const LIGHTS_HAZE = Object.freeze({
  fogNear: 6, fogFar: story.notes.haze.sightMetres, fogColor: 0xd7d4c8, exposure: .67,
  domeRadius: 4500, dustBox: 46, dustCount: 900, windX: 5.5, windZ: 2, beam: false,
});
const onSalt = new Set(['salt', 'crew', 'crew-after-sounding', 'buoy', 'sounding', 'back-to-cart', 'two-trips', 'walk-in']);
export function lightsWeather(open) {
  if (!open?.parts?.threads?.places?.checkpointsEnabled) return null;
  const record = open.world.open.threads[LIGHTS_ID];
  const offAt = open.parts.threads.beatSeconds?.[LIGHTS_ID]?.salt;
  return record && !record.end && onSalt.has(record.beat) &&
    open.seconds - offAt >= story.notes.haze.downAfterSecondsOffRoad ? LIGHTS_HAZE : null;
}

const crewIds = ['fathom', 'sprat', 'kedge', 'wick'];
export const LIGHTS_PEOPLE = crewIds.map((id, index) => ({
  id, figure: ['walker-1', 'tin-child', 'walker-3', 'tin-cook'][index], home: ships, talk: id,
  routine: {day: {kind: 'post', at: [ships, 4 + index * 2, -3 + index], action: 'stand'}},
}));

export function lightsCrew(world, active, partOfDay) {
  const record = world.open.threads[LIGHTS_ID];
  if (!record) return [];
  const mission = active?.thread === LIGHTS_ID ? active : null;
  const p = lightsPlaces(world.open.landSeed);
  const at = p['whites-crew'];
  const role = id => crewIds.indexOf(id);
  const row = (id, point, aboveDeck = false) => ({id, position: offset(point, (role(id) % 2) * 2.4, Math.floor(role(id) / 2) * 3),
    ...(aboveDeck && {deckHeight: 4})});
  if (!onSalt.has(record.beat)) {
    return world.ledger.made.includes(LIGHTS_LADDER_MARK) ? [
      {id: 'sprat', position: WHITES_LADDER.top, deckHeight: 4},
      {id: 'wick', position: p['whites-galley'], deckHeight: 4},
      {id: 'fathom', position: p['whites-chart'], deckHeight: 4},
      row('kedge', p['whites-bridge-wing'], true),
    ] : [];
  }
  if (record.beat === 'walk-in') {
    const walkers = mission?.state.walkers ?? at;
    return ['fathom', 'wick', 'sprat'].filter(id => id !== 'sprat' || !mission?.state.riderPickedUp)
      .map(id => row(id, walkers));
  }
  if (record.beat === 'two-trips') {
    if (mission?.state.reunion) return [];
    const guided = lightsMark(world, 'sprat-led');
    const meeting = mission?.state.route.meeting ?? at;
    const t = mission?.state.phase === 'search' ? 1 : Math.min(1, (mission?.state.lampAge ?? 0) / 60);
    const rest = mix(at, meeting, t);
    return (guided ? ['fathom', 'sprat'] : ['fathom', 'wick']).map(id => row(id, rest));
  }
  if (['buoy', 'sounding', 'back-to-cart'].includes(record.beat))
    return ['sprat', 'kedge', 'wick'].map(id => row(id, at)).concat(record.beat === 'sounding'
      ? [row('fathom', sitePosition('bell-buoy', world.open.landSeed))] : []);
  return record.beat === 'salt' && partOfDay !== 'dark' ? [] : crewIds.map(id => row(id, at));
}
