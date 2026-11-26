// The Voice on Radio Hill uses the land's existing terrain. All offsets are
// measured from the named places in the site table.
import voice from '../../../story/threads/content/radio-hill-voice.js';
import {LAND} from '../../scablands-names.js';
import {HILLS} from '../../scablands-height.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {threadRule} from '../../../story/threads/thread-rule.js';
import {isFound} from '../open-record.js';

export const RADIO_ID = voice.id;
export const POCKET_ID = 'the-pocket';
export const PARROT_TALK = RADIO_ID + '/parrot';
const parrotQuestion = voice.beats['on-the-air'].questions.find(row => row.id === 'what-sump-wants');
export const PARROT_SCENE = {id: PARROT_TALK, questions: [{
  ...parrotQuestion, lines: parrotQuestion.lines.map(row => ({...row, radio: false})),
}], choices: [{id: 'leave', words: 'End the conversation.'}]};
export const POCKET_POSITIONS = [
  ['boneyard', 1000, -300], ['tin-town', 300, -1700], ['tin-town', -2600, 700],
];
export const RADIO_MARK = {
  watched: RADIO_ID + '/twice-the-watch',
  fuel: RADIO_ID + '/fuel',
  drum: RADIO_ID + '/fuel-in-the-car',
  fuelKept: RADIO_ID + '/first-drum',
  peace: RADIO_ID + '/two-voices',
};
export const radioMarked = (world, id) => world.ledger.marks.includes(id);
export function radioPhase(world, view, seconds) {
  if (!view.freeRoamDaylight) return view.partOfDay;
  const waiting = world.open.threads[RADIO_ID]?.beat === 'by-day' &&
    world.open.journal.findLast(row => row.type === 'thread' && row.key === RADIO_ID && row.after?.beat === 'by-day');
  if (waiting && world.ledger.night > waiting.night) return 'day';
  return seconds - (view.nightStartedAt ?? 0) >= 45 ? 'dark' : 'day';
}
const offset = (origin, x, z) => LAND.at('tin-town', origin.x - LAND.place('tin-town').x + x, origin.z + z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function pocketOpposite(gate, hill, candidates) {
  const score = point => ((point.x - gate.x) * (hill.x - gate.x) + (point.z - gate.z) * (hill.z - gate.z)) / gap(point, gate);
  return candidates.reduce((best, point) => score(point) < score(best) ? point : best);
}

const CLIMB = [
  ['ramp-foot', 1, 0], ['bend-1', .8, -.045], ['bend-2', .57, .055],
  ['broken-ledge', .39, .04], ['last-rise', .17, -.045], ['top', 0, 0],
];

export function radioRamp(hill) {
  const ground = HILLS.find(row => gap(row, hill) < 1);
  const mesa = ground.kind === 'mesa';
  const heading = mesa ? ground.rampAngle : Math.PI * 1.1;
  return CLIMB.map(([name, share, bend]) => {
    const distance = name === 'top' ? 29 : mesa ? ground.radius + ground.ramp * share : 270 * share;
    return {name, point: offset(hill, Math.cos(heading + bend) * distance, Math.sin(heading + bend) * distance)};
  });
}

const SPOTS = {
  mouth: [0, 29], lamp: [-2, 11], 'set': [0, -6], park: [0, 229],
  tracks: [0, 35], pole: [1, 13], wheels: [7, 23], heap: [-10, 16], inside: [0, 4],
  'buggy-1': [-8, -8], 'buggy-2': [8, -8], 'buggy-3': [9, 8],
  'buggy-4': [-9, 9], 'buggy-5': [-1, -15],
};

export function radioPlace(place, hill, pocket) {
  if (!Array.isArray(place)) return null;
  const [site, spot] = place;
  if (site === POCKET_ID && Object.hasOwn(SPOTS, spot)) return offset(pocket, ...SPOTS[spot]);
  if (site !== 'radio-hill') return null;
  if (spot === 'hut') return offset(hill, -7, 7.8);
  return radioRamp(hill).find(row => row.name === spot)?.point ?? null;
}

const pocketRows = [
  ...[-14, -7, 0, 7, 14].map(x => [x, -19, Math.PI / 2]),
  ...[-12, -5, 2, 9, 16, 23].flatMap(z => [[-16, z, 0], [16, z, 0]]),
];
export function pocketWrecks(pocket) {
  return pocketRows.map(([x, z, heading], i) => {
    const point = offset(pocket, x, z);
    return {...point, id: POCKET_ID + '/wreck-' + i, kind: 'wreck', shape: 'box', heading,
      base: scablandsSurfaceHeightAt(point.x, point.z), halfX: 1.9, halfZ: 3.1, height: 3.1};
  });
}

export function radioPeople(world, pocket) {
  const record = world.open.threads[RADIO_ID];
  if (!record && !isFound(world, POCKET_ID)) return [];
  const post = (id, figure, spot, action) => {
    const {x, z} = offset(pocket, ...SPOTS[spot]);
    const at = ['tin-town', x - LAND.place('tin-town').x, z];
    const plan = {kind: 'post', at, action};
    return {id, figure, home: POCKET_ID, routine: {day: plan, dusk: plan, dark: plan}};
  };
  return [{...post('parrot', 'road-rat-lookout', radioMarked(world, RADIO_ID + '/saw-parrot') ? 'pole' : 'set', 'sit'),
      talk: 'parrot'},
    post('pocket-lamp-rat', 'road-rat-lamp', 'lamp', 'carry-lamp')];
}

const hillPlace = spot => ['radio-hill', spot];
const pocketPlace = spot => [POCKET_ID, spot];
const at = (place, within) => ({reach: place, within});
const hillFound = {fact: 'found', site: 'radio-hill'};
const trusted = {fact: 'mark', id: RADIO_ID + '/stopped-for-hetty'};

export function radioMission(mission, context, record) {
  const {world} = context;
  const {rule} = mission;
  if (mission.kind === 'reach') {
    const ask = threadRule(voice, context, record).ask;
    return {...mission, lines: mission.lines.filter(row => ask(row.when)).map(row =>
      row.speaker === 'parrot' ? {...row, cue: rule.cutInCue} : row),
      rule: {...rule, destination: hillPlace('top'), within: 12, wrecked: 'over-the-edge', success: 'up',
        moments: rule.moments.map((id, i, rows) => ({id, at: hillPlace(id), within: i === rows.length - 1 ? 12 : 14})),
        edgeDrop: 4, edgeWidth: 30, recoverAt: hillPlace('top')}};
  }
  const atWar = threadRule(voice, context, record).ask(voice.beats['pocket-fight'].mission.rule.atWar);
  const cars = atWar ? 5 : 3;
  const starts = Array.from({length: cars}, (_, i) => pocketPlace('buggy-' + (i + 1)));
  if (mission.kind === 'rider-fight') {
    return {...mission, enemy: 'road-rats', cars, rule: {...rule, riderStarts: starts, boxedInSeconds: rule.boxedSeconds,
      success: 'out', wrecked: 'boxed-in', recoveryShare: 1 / 3, escape: pocketPlace('park'), escapeWithin: 35,
      ramDamageScale: threadRule(voice, context, record).ask(trusted) ? .5 : 1}};
  }
  const doubled = radioMarked(world, RADIO_MARK.watched);
  return {...mission, enemy: 'road-rats', cars, cue: 'open.trap.sprung', rule: {...rule,
    destination: pocketPlace('park'), pickup: pocketPlace('set'), pickupWrenchSeconds: rule.wrenchSeconds,
    pickupCue: rule.cue, wrenchSeconds: 0, within: 5, lamps: [{at: pocketPlace('lamp'), turnsIn: doubled ? 12 : 24, phase: 0}],
    cover: pocketPlace('heap'), coverRadius: 3.5, range: doubled ? 31 : 25, coneDegrees: 50, seenSeconds: rule.seenAfterSecondsInLamp,
    caught: 'caught', boxedInSeconds: rule.boxedSeconds, riders: starts,
    delivery: hillPlace('hut'), deliveryWithin: 24, success: 'out-with-the-set', spotted: 'out-with-the-set', escape: 'left-without-the-set',
    recovery: true}, outcomes: {...mission.outcomes, 'left-without-the-set': {next: 'other-voice'}}};
}

export function radioBeat(beatId, world) {
  const beat = voice.beats[beatId];
  if (beatId === 'first-call' && isFound(world, 'radio-hill')) {
    const [parrotCall] = beat.lines;
    return {...beat, lines: [{...parrotCall, when: undefined}], thoughts: [], choices: [], next: 'second-voice'};
  }
  if (beatId === 'ramp' && isFound(world, 'radio-hill'))
    return {when: at(hillPlace('hut'), 25), next: 'other-voice'};
  if (beatId === 'by-day') return {...beat, when: {all: [
    {after: 'ramp'}, {nights: 1}, {reach: 'radio-hill', within: 30}, {part: 'day'},
  ]}};
  if (beatId === 'other-voice') return {...beat, when: {all: [
    at(hillPlace('hut'), 5), {nights: 1}, hillFound, beat.when.all.at(-1),
  ]}};
  if (beatId === 'pocket') return {...beat, when: at(pocketPlace('mouth'), 42)};
  if (beatId === 'take-set') return {...beat, when: {all: [
    at(pocketPlace('park'), 16), {any: [{part: 'dusk'}, {part: 'dark'}]},
  ]},
    effects: [{type: 'find', site: POCKET_ID}]};
  return beat;
}

export function radioDestination(beat, id) {
  if (beat === 'second-voice') return {'to-the-red-lamp': hillPlace('ramp-foot'), 'to-the-white-lamp': pocketPlace('mouth')}[id];
  if (beat === 'pocket') return {'drive-in': pocketPlace('inside'), 'back-out': hillPlace('ramp-foot')}[id];
  return null;
}

export function radioFuel(world, view, locate) {
  const {ledger} = world;
  const promise = ledger.obligations.find(item => item.id === RADIO_MARK.fuel);
  if (!promise) return null;
  const repair = voice.beats['talking-over'].notes.fuel;
  const tag = type => RADIO_ID + '/fuel/' + type + '/' + promise.due;
  // A mark records the purchase. The due date in its choice id ties a drum to one promise.
  const hasDrum = world.open.journal.some(row => row.choiceId === tag('buy'));
  if (ledger.night >= promise.due)
    return {choice: {id: tag('broken'), effects: [{type: 'settle', id: promise.id}, ...repair.brokenCosts]}};
  if (!view.onFoot) return null;
  const point = view.player?.position ?? view.player;
  if (!point) return null;
  const moss = view.people?.find(row => row.id === 'moss');
  if (!hasDrum && moss && gap(point, moss.position) <= 2.5 && world.scrap >= repair.drumScrap)
    return {id: tag('buy'), point: moss.position, speaker: 'moss', words: 'Buy a drum of fuel for 25 scrap.',
      effects: [{type: 'scrap', by: -repair.drumScrap}, {type: 'mark', id: RADIO_MARK.drum}]};
  const hut = locate(hillPlace('hut'));
  if (hasDrum && gap(point, hut) <= 3)
    return {id: tag('deliver'), point: hut, speaker: 'bern', words: 'Give Bern the drum of fuel.',
      effects: [{type: 'settle', id: promise.id}, {...promise, type: 'promise', due: promise.due + repair.nightsADrum},
        ...(!radioMarked(world, RADIO_MARK.fuelKept) ? [...repair.firstDrumGives, {type: 'mark', id: RADIO_MARK.fuelKept}] : [])]};
  return null;
}
