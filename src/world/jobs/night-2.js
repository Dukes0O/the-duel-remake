import {applyChoice, bankHearth, createLedger, ledgerPageData, namedThrow, plainStockChange} from '../../story/ledger.js';
import {NIGHT_2_EFFECTS, NIGHT_2_SCENES, night2Count} from '../../story/scenes/night-2.js';
import {sweepObstacle} from '../../collision.js';
import {createJobSolidGrid} from '../scablands-solids.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {sees} from '../scablands-ways.js';
import {createBrandWays} from './brand-ways.js';
import {BRAND_RULE} from './brand-rule.js';
import {EMBER_RULE} from './ember-rule.js';
import {NIGHT_2_SITES as sites, night2Cast, night2Point} from './night-2-sites.js';
import {createStoryPeople, setStoryPersonAction} from './story-people.js';

export const NIGHT_2_ID = 'story-night-2';
const hearthStart = {...sites.hearthFront.position, heading: Math.PI};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const riders = [
  {id: 'wash-rider-1', start: {x: sites.camp.position.x + 42, z: 236}, heading: .8, renderCar: 'dusthawk_rally'},
  {id: 'wash-rider-2', start: {x: sites.camp.position.x + 31, z: 210}, heading: 2, renderCar: 'falcone_f42'},
  {id: 'wash-rider-3', start: {x: sites.camp.position.x + 48, z: 264}, heading: -.6, renderCar: 'dusthawk_rally'},
];
const points = [sites.hearth, sites.pump, sites.gateTalk, sites.gateOutside, sites.westGap, sites.scoutWall, sites.scoutGate, sites.hearthApproach, sites.watchPost, sites.storeApproach];
const at = place => place.position ?? place;

const talk = (id, set, options = {}) => ({id, kind: 'talk', scene: NIGHT_2_SCENES[id], set, ...options});
const walk = (id, place, what) => ({id, kind: 'reach', onFoot: true, place, radius: place.radius, what});

export function night2Opening(seed) {
  return {seed: seed >>> 0, night: 2, embers: 4};
}

export function night2Job(seed) {
  return {id: NIGHT_2_ID, name: 'Strangers at the gate', title: 'Strangers at the gate', seed,
    steps: [
      talk('hearth', 'hearth', {carStart: sites.car, footStart: hearthStart}),
      walk('walk-to-gate', sites.gateTalk, 'Walk to the gate.'),
      talk('gate', 'gate'),
      talk('gift', 'gate'), talk('salt', 'salt'), talk('theft', 'hearth'),
      walk('reach-store', sites.storeApproach, 'Go to the store. Look for Dace with the stolen embers.'),
      {id: 'chase', kind: 'night-2-action', action: 'chase',
        what: 'Catch Dace before the Wash. Follow the west alleys or cut him off by the gate.'},
      talk('caught', 'caught'), talk('take-dace-to-rell', 'rell-at-gate'), talk('send-away', 'rell-at-gate'),
      talk('escaped', 'rell-at-gate'), talk('watch', 'gate'),
      walk('walk-watch-post', sites.watchPost, 'Walk to the watch by the pump.'), talk('whistle', 'scout'),
      {id: 'scout', kind: 'night-2-action', action: 'scout', what: 'Turn the Ash scout with fire. Drive him out of the gate.', lentWeapon: 'cinders-hand-flamer'},
      talk('scout-stopped', 'scout'), talk('scout-escaped', 'scout'),
      talk('inside', 'gate'), talk('lamp', 'gate'),
      {id: 'light-pump', kind: 'onfoot', brand: true, hearth: sites.hearth,
        places: [sites.pump], ashEntries: [], wayAround: sites.around, what: 'Light the pump lamp for the Walkers.'},
      walk('back-to-hearth', sites.hearthApproach, 'Walk back to the hearth.'), talk('at-hearth', 'sleep'),
      talk('refuse', 'gate'), talk('tell-mall', 'gate'), talk('tower', 'camp'),
      talk('tower-outcome', 'camp'),
      {id: 'pot', kind: 'carry', load: 'everburn-ember-pot', ember: EMBER_RULE, destination: sites.camp,
        radius: sites.camp.radius, origin: sites.car, stopAtDestination: true, what: 'Get in the car and take the ember to the Walkers at the Wash.',
        waitingActors: riders, pickup: {atCar: true, place: sites.car, radius: 4, lines: []}, braziers: [{id: 'tin-town-brazier', radius: 5, position: night2Point(sites.car.x + 5, sites.car.z)}]},
      talk('delivery', 'camp'), talk('close', 'hearth'),
    ]};
}

export function createNight2(definition, grid) {
  const opening = night2Opening(definition.seed);
  const paths = createJobSolidGrid(grid);
  paths.setTownGate(sites.gate, 1);
  paths.setBrandLamps([...sites.lamps, ...sites.chaseLamps]);
  return {opening, ledger: createLedger(opening), journal: [], set: null, evening: .65, night: false,
    ways: createBrandWays({places: points, around: sites.around, grid: paths, reach: place => place.radius ?? (place === sites.hearth ? BRAND_RULE.relightRadius : BRAND_RULE.lampRadius), strict: true}),
    lamps: {}, scrap: 0, props: {}, routes: []};
}

const memoryLines = {
  'gave-rell-an-ember': 'You gave Rell an ember and asked nothing.',
  'dace-kept-watch': 'Dace kept a watch nobody asked for.',
  'dace-secret': 'You and Dace have a secret.',
  'dace-sent-away': 'You sent Dace away.',
  'changed-mind-in-night': 'You changed your mind in the night.',
};

const presentPeople = (people, words) => people.map(person => ({type: 'met', person, text: words}));
function record(chapter, id, effects) {
  const choice = {id, effects};
  const next = applyChoice(chapter.ledger, choice);
  chapter.ledger = next.ledger;
  if (next.changes.length) chapter.journal.push(choice);
}

export function night2Odds(chapter) {
  return {
    theft: chapter.ledger.marks.includes('dace-knows-the-count') ? .22 : .5,
    refuseClinker: chapter.ledger.marks.includes('told-walkers-of-mall') ? .75 : .5,
  };
}

function sceneFor(step, chapter) {
  const scene = step.id === 'close' ? night2Count(chapter.ledger.stocks.embers)
    : step.id === 'tower-outcome' ? NIGHT_2_SCENES[chapter.watchOutcome] : step.scene;
  const options = scene.choices?.map(choice => ({...choice,
    plain: plainStockChange(chapter.ledger, choice),
    ...(choice.id === 'watch-clinker' ? {detail: night2Odds(chapter).refuseClinker > .5
      ? 'Rell will probably turn Clinker down.' : 'Rell might take Clinker’s offer or turn it down.'} : {}),
  }));
  return {...scene, choices: options, stocks: {embers: chapter.ledger.stocks.embers}};
}

export function night2Page(ledger) {
  const page = ledgerPageData(ledger);
  if (!page) return null;
  const tonight = ledger.history.filter(change => change.night === 2);
  const known = new Set(tonight.filter(change => change.type === 'mark').map(change => change.key));
  const memories = Object.entries(memoryLines).filter(([id]) => known.has(id)).map(([, line]) => line);
  return {...page, memories, saltScrap: known.has('dace-kept-watch') ? 10 : 0, tonight: ledger.night === 3 ? {
    supplies: tonight.some(change => change.type === 'stock'),
    people: tonight.filter(change => change.type === 'met').map(change => change.key),
    obligations: tonight.some(change => ['debt', 'promise'].includes(change.type)),
  } : null};
}

function close(chapter) {
  const bank = bankHearth(chapter.ledger);
  chapter.ledger = bank.ledger;
  chapter.bank = {burned: bank.burned, needed: bank.needed};
  chapter.page = night2Page(chapter.ledger);
}

function routeFrom(chapter, from, via) {
  const path = chapter.ways.path(from, via.id);
  if (!path) throw new Error('No clear Night 2 route to ' + via.id);
  return path;
}

function beginChase(worldJob) {
  const chapter = worldJob.night2;
  const path = [...routeFrom(chapter, at(sites.store), sites.westGap), at(sites.westCut), at(sites.campWalk)];
  const dace = worldJob.storyPeople.find(person => person.id === 'dace');
  dace.pace = 7.05;
  setStoryPersonAction(dace, 'run', path);
  chapter.chasePath = path;
}

const worldRellAtGate = night2Point(sites.gate.x, sites.gate.z + 4.8);

function dressing(chapter, step) {
  chapter.props.salt = step.id === 'salt';
  chapter.props.ladle = ['chase', 'caught'].includes(step.id);
  chapter.props.shawl = step.id === 'at-hearth';
  chapter.props.shelter = ['camp', 'caught', 'chase', 'pump', 'sleep'].includes(chapter.set);
  chapter.props.campLights = ['tower', 'tower-outcome', 'pot', 'delivery'].includes(step.id);
  const cut = (look, x, z) => ({
    position: {...night2Point(look.x + x, look.z + z), y: look.y + 1.8},
    target: {...look, y: look.y + 1.35}, fov: 49,
  });
  const fire = sites.hearth.position;
  const hearthShot = speaker => ({
    position: night2Point(fire.x - 3.3, fire.z + 10.2),
    target: {x: (fire.x + speaker.x) / 2, y: fire.y + 1, z: (fire.z + speaker.z) / 2}, fov: 55,
  });
  if (['hearth', 'at-hearth', 'close'].includes(step.id)) {
    chapter.camera = hearthShot(sites.auntie.position);
    chapter.camera.position.y += 2.35;
  } else if (step.id === 'gate') chapter.camera = sites.gateView;
  else if (['tower', 'tower-outcome'].includes(step.id)) chapter.camera = sites.tower;
  else if (['escaped', 'take-dace-to-rell', 'send-away'].includes(step.id))
    chapter.camera = cut(worldRellAtGate, 2, -4);
  else chapter.camera = null;
}

// Authored cuts change the cast, light and camera. The player’s position
// stays under the fighter or car controls throughout the chapter.
export function enterNight2Step(worldJob) {
  const chapter = worldJob.night2, step = worldJob.job.steps[worldJob.job.stepIndex];
  chapter.routes = [];
  chapter.daceTrack = null;
  if (!step) return {};
  if (step.id === 'close' && !chapter.bank) {
    if (chapter.answer !== 'watch') record(chapter, 'unseen-scout', NIGHT_2_EFFECTS['unseen-scout']);
    close(chapter);
  }
  chapter.holstered = step.id !== 'scout';
  if (step.kind === 'talk') step.scene = sceneFor(step, chapter);
  const set = step.set ?? {chase: 'chase', 'walk-to-gate': 'gate', 'walk-watch-post': 'scout', 'light-pump': 'pump'}[step.id];
  if (set && set !== chapter.set) {
    const dace = worldJob.storyPeople?.find(person => person.id === 'dace');
    chapter.set = set;
    worldJob.storyPeople = createStoryPeople(night2Cast(set, set === 'caught' ? {...dace.position} : at(sites.store)));
    worldJob.solidGrid.setStoryPeople(worldJob.storyPeople);
  }
  dressing(chapter, step);
  if (step.id === 'chase') beginChase(worldJob);
  if (step.id === 'gate') record(chapter, 'meet-walkers',
    presentPeople(['rell', 'dace', 'wim'], 'You met at Tin Town’s gate.'));
  if (['theft', 'whistle', 'lamp', 'tower'].includes(step.id)) chapter.night = true;
  if (step.id === 'salt' || step.id === 'escaped') {
    chapter.night = false;
    chapter.evening = .27;
  }
  return {scout: step.id === 'scout', riders: ['tower', 'tower-outcome', 'pot', 'delivery'].includes(step.id) ? riders : []};
}

function stageAfter(chapter, step, result, cue) {
  const selected = result.events.find(event => event.type === 'talkChoice');
  if (selected) {
    record(chapter, 'questions-' + step.id, selected.questionEffects);
    record(chapter, selected.id, selected.effects);
  }
  const action = result.events.find(event => event.type === 'night2Outcome')?.outcome;
  switch (step.id) {
    case 'gate':
      chapter.answer = selected.id;
      return selected.id;
    case 'gift': {
      const stolen = namedThrow(chapter.ledger, 'night-2/dace-steals', night2Odds(chapter).theft);
      cue(stolen ? 'luck.unkind' : 'luck.kind');
      const id = stolen ? 'theft' : 'salt';
      if (!stolen) chapter.scrap = 10;
      record(chapter, id, NIGHT_2_EFFECTS[id]);
      return id;
    }
    case 'chase':
      if (action === 'escaped') record(chapter, action, NIGHT_2_EFFECTS[action]);
      return action;
    case 'caught': return selected.id === 'keep-secret' ? 'close' : selected.id;
    case 'scout':
      if (action === 'scout-escaped') record(chapter, action, NIGHT_2_EFFECTS[action]);
      return action;
    case 'light-pump':
      chapter.lamps.pump = true;
      return 'back-to-hearth';
    case 'refuse': return selected.id === 'tell-mall' ? 'tell-mall' : 'tower';
    case 'tower': {
      if (selected.id === 'carry-ember') return 'pot';
      const refuses = namedThrow(chapter.ledger, 'night-2/clinker-offer', night2Odds(chapter).refuseClinker);
      const id = refuses ? 'walkers-refuse-clinker' : 'walkers-go-with-clinker';
      cue(refuses ? 'luck.kind' : 'luck.unkind');
      record(chapter, id, NIGHT_2_EFFECTS[id]);
      chapter.watchOutcome = id;
      return 'tower-outcome';
    }
    case 'pot':
      record(chapter, 'delivered-ember', NIGHT_2_EFFECTS['carry-ember']);
      return 'delivery';
    case 'close': return null;
    default: return NEXT[step.id];
  }
}

const NEXT = {
  hearth: 'walk-to-gate', 'walk-to-gate': 'gate', salt: 'close', theft: 'reach-store', 'reach-store': 'chase',
  escaped: 'close', 'take-dace-to-rell': 'close', 'send-away': 'close', watch: 'walk-watch-post', 'walk-watch-post': 'whistle',
  whistle: 'scout', 'scout-stopped': 'close', 'scout-escaped': 'close', inside: 'lamp',
  lamp: 'light-pump', 'back-to-hearth': 'at-hearth', 'at-hearth': 'close',
  'tell-mall': 'tower', 'tower-outcome': 'close', delivery: 'close',
};

export function routeNight2(worldJob, previous, result, cue) {
  const chapter = worldJob.night2;
  const step = result.steps[previous];
  const id = stageAfter(chapter, step, result, cue);
  result.stepIndex = id == null ? result.steps.length : result.steps.findIndex(candidate => candidate.id === id);
  if (result.stepIndex < 0) throw new Error('Missing Night 2 scene: ' + id);
  result.done = id == null;
  result.stepState = {};
  result.events = result.events.filter(event => event.type !== 'done');
  if (result.done) result.events.push({type: 'done'});
}

function metres(path, from) {
  let total = 0;
  for (const point of path) {
    total += dist(from, point);
    from = point;
  }
  return total;
}

function direction(chapter, from, via, tail = []) {
  const way = chapter.ways.aim(from, via.id);
  return way ? {point: way, metres: way.metres + metres(tail, at(via))} : null;
}

export function night2BrandRoute(chapter, point, place) {
  const route = direction(chapter, point, place);
  chapter.routes = route ? [{name: place.id === sites.pump.id ? 'The pump lamp' : 'The hearth', ...route}] : [];
}

const SIGHT_RAY = {halfWidth: 0, halfLength: 0, height: 0};
export function night2DaceVisible(from, dace, grid) {
  const range = 90;
  if (!sees(from, dace, {heightAt: scablandsSurfaceHeightAt, range, eye: 1.62, target: 1.12, actorFloors: true, step: 2})) return false;
  const eye = {...from, y: from.y + 1.62}, ember = {...dace, y: dace.y + 1.12};
  return !grid.near(eye.x, eye.z, ember.x, ember.z, 1).some(solid =>
    solid.kind !== 'person' && sweepObstacle(eye, ember, solid, 0, SIGHT_RAY));
}

export function night2Action(worldJob, point, onFoot) {
  const chapter = worldJob.night2, step = worldJob.job.steps[worldJob.job.stepIndex];
  if (step.id === 'chase') {
    const dace = worldJob.storyPeople.find(person => person.id === 'dace');
    const contact = dace.action === 'run' && onFoot && dist(point, dace.position) <= 1.5 && Math.abs(point.y - dace.position.y) < 1.2;
    const beyondWest = point.x < at(sites.westGap).x - 6;
    const tail = [at(sites.westCut), at(sites.campWalk)];
    const inSight = night2DaceVisible(point, dace.position, worldJob.solidGrid);
    if (inSight) chapter.daceTrack = {position: {...dace.position}, visible: true};
    else if (chapter.daceTrack) chapter.daceTrack.visible = false;
    const lastDace = chapter.daceTrack?.position;
    const direct = lastDace && dist(point, lastDace) > 1.5 && (beyondWest || inSight &&
      !worldJob.solidGrid.near(point.x, point.z, lastDace.x, lastDace.z, 1).some(solid =>
        solid.kind !== 'person' && sweepObstacle(point, lastDace, solid, 0, {halfWidth: .4, halfLength: .4, height: 1.5})));
    const outside = beyondWest || point.z >= sites.gate.z + 11;
    const cut = at(sites.westCut), end = at(sites.campWalk);
    const next = point.x > cut.x + 5 ? cut : end;
    const onward = {point: next, metres: dist(point, next) + (next === cut ? dist(cut, end) : 0)};
    const follow = direct ? {point: lastDace, metres: dist(point, lastDace)}
      : beyondWest ? onward : direction(chapter, point, sites.westGap, tail);
    const round = outside ? onward : direction(chapter, point, sites.gateOutside, tail);
    chapter.routes = [follow && {name: 'Through the alleys', ...follow},
      round && {name: 'Round by the gate', ...round}].filter(Boolean);
    return {contact, arrival: dace.action === 'stand' ? 'escaped' : null};
  }
  if (step.id === 'scout') {
    const scout = worldJob.actors.find(actor => actor.id === 'night-2-scout');
    const goal = chapter.scoutTurned ? sites.scoutGate : sites.scoutWall;
    chapter.routes = [{name: 'Ash scout', point: scout, metres: dist(point, scout)}];
    return {arrival: dist(scout, at(goal)) <= goal.radius ?
      (chapter.scoutTurned ? 'scout-stopped' : 'scout-escaped') : null};
  }
  if (step.kind === 'reach') {
    const name = {'walk-to-gate': 'The gate', 'walk-watch-post': 'Dace’s watch', 'back-to-hearth': 'The hearth',
      'reach-store': 'The store'}[step.id];
    const route = direction(chapter, point, step.place);
    chapter.routes = route ? [{name, ...route}] : [];
  }
  return {};
}

export const NIGHT_2_SCOUT = {id: 'night-2-scout', from: night2Point(sites.pump.position.x + 1.5, sites.pump.position.z)};

export function night2ScoutDestination(worldJob, turned) {
  const chapter = worldJob.night2;
  if (turned) chapter.scoutTurned = true;
  return chapter.scoutTurned ? sites.scoutGate : sites.scoutWall;
}
