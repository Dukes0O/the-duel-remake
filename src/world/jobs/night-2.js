import {applyChoice, bankHearth, createLedger, ledgerPageData, namedThrow, plainStockChange} from '../../story/ledger.js';
import {LEDGER_MARK_LINES} from '../../story/ledger-ui.js';
import {NIGHT_2_EFFECTS, NIGHT_2_GATE_ENCOUNTER, NIGHT_2_SCENES, NIGHT_2_WASH_CHOICE, night2Count} from '../../story/scenes/night-2.js';
import {sweepObstacle} from '../../collision.js';
import {createJobSolidGrid} from '../scablands-solids.js';
import {scablandsActorHeightAt, scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {sees} from '../scablands-ways.js';
import {createBrandWays, townCarWay} from './brand-ways.js';
import {BRAND_RULE} from './brand-rule.js';
import {EMBER_RULE} from './ember-rule.js';
import {NIGHT_2_SITES as sites, night2Cast, night2Point} from './night-2-sites.js';
import {HANDCART, createStoryPeople, setStoryPersonAction} from './story-people.js';
import {SALT_RIDERS} from './ember-rule.js';

export const NIGHT_2_ID = 'story-night-2';
const hearthStart = {...sites.hearthFront.position, heading: Math.PI};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// STORY-NIGHT-2-FLOW (Claude's decision, 19 November 2026): the riders lay siege. One rider circles the camp at about 30 m
// with its headlights on, so that no Walker slips away and a player can find a dark camp by its lights; the others turn to
// meet the player. It starts on the circle on the camp's +x side.
export const NIGHT_2_SIEGE = Object.freeze({riderId: 'wash-rider-1', radius: 30, mps: 9, yieldMetres: 6,
  steps: Object.freeze(['tower', 'tower-outcome', 'wash-get-car', 'wash-drive'])});
const siegeAt = angle => ({x: sites.camp.position.x + Math.cos(angle) * NIGHT_2_SIEGE.radius,
  z: sites.camp.position.z + Math.sin(angle) * NIGHT_2_SIEGE.radius});
// Heading is measured as the game measures it, atan2(dx, dz): the way the circle runs at this angle.
const siegeHeading = angle => Math.atan2(-Math.sin(angle), Math.cos(angle));
const riders = [
  {id: NIGHT_2_SIEGE.riderId, start: siegeAt(0), heading: siegeHeading(0), renderCar: 'dusthawk_rally'},
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

const drive = (id, place, what) => ({id, kind: 'reach', inCar: true, place, radius: place.radius, what});
const returnOnFoot = 'The car will be towed in at dawn. Walk back to the hearth.';
const washRiders = riders.map(({id, start, renderCar: car}, index) => ({
  id, name: `Ash rider ${index + 1}`, car, weapon: 'ash-sack', start, approach: id !== NIGHT_2_SIEGE.riderId,
  home: {x: sites.camp.position.x - 145 - index * 30, z: sites.camp.position.z + (index - 1) * 75},
  ...(id === NIGHT_2_SIEGE.riderId ? {circle: {x: sites.camp.position.x, z: sites.camp.position.z, radius: NIGHT_2_SIEGE.radius}} : {}),
}));
// The crew who leave a wrecked rider car run for the Walkers' camp; any that reach it take it (src/arena/modes/road-riders.js).
const washCrewGoal = {x: sites.camp.position.x, z: sites.camp.position.z, radius: sites.camp.radius};

export function night2Job(seed, {washFight = false} = {}) {
  const tower = talk('tower', 'camp');
  if (washFight) {
    const [watch, ember] = tower.scene.choices;
    tower.scene = {...tower.scene, choices: [watch, NIGHT_2_WASH_CHOICE, ember]};
  }
  const washSteps = washFight ? [
    {id: 'wash-get-car', kind: 'night-2-action', action: 'board', what: 'Find your car and hold F to get in.'},
    drive('wash-drive', sites.washApproach, 'Drive out to the Walkers’ camp at the Wash.'),
    {id: 'wash-fight', kind: 'rider-fight', riders: washRiders.map(rider => ({...rider})), onLost: 'continue', crewGoal: washCrewGoal,
      what: 'Drive off the three Ash riders at the Wash.'},
    talk('wash-fight-won', 'camp-won'),
    drive('wash-drive-home', sites.carHome, 'Drive back to Tin Town.'),
    walk('wash-walk-to-cut', sites.westCut, returnOnFoot),
    walk('wash-walk-to-gap', sites.westGap, 'Walk back through the west opening.'),
    walk('wash-walk-home', sites.hearthApproach, 'Walk back to the hearth.'),
  ] : [];

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
      talk('escaped', 'camp-escape'), talk('watch', 'gate'),
      walk('walk-watch-post', sites.watchPost, 'Walk to the watch by the pump.'), talk('whistle', 'scout'),
      {id: 'scout', kind: 'night-2-action', action: 'scout', what: 'Turn the Ash scout with fire. Drive him out of the gate.', lentWeapon: 'cinders-hand-flamer'},
      talk('scout-stopped', 'scout'), talk('scout-escaped', 'scout'),
      talk('inside', 'gate'), talk('lamp', 'gate'),
      {id: 'light-pump', kind: 'onfoot', brand: true, hearth: sites.hearth,
        places: [sites.pump], ashEntries: [], wayAround: sites.around, what: 'Light the pump lamp for the Walkers.'},
      walk('back-to-hearth', sites.hearthApproach, 'Walk back to the hearth.'), talk('at-hearth', 'sleep'),
      talk('refuse', 'gate'), talk('tell-mall', 'gate'), tower,
      talk('tower-outcome', 'camp'), ...washSteps,
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
    lamps: {}, scrap: 0, props: {}, routes: [], washCarUnavailable: false};
}

const memoryLines = {
  'gave-rell-an-ember': 'You gave Rell an ember and asked nothing.',
  'dace-kept-watch': 'Dace kept a watch nobody asked for.',
  'dace-secret': 'You and Dace have a secret.',
  'dace-sent-away': 'You sent Dace away.',
  'changed-mind-in-night': 'You changed your mind in the night.',
  'wash-car-towed-at-dawn': 'Your car will be towed in at dawn. Bess leaves late.',
  'wash-camp-taken': LEDGER_MARK_LINES['wash-camp-taken'],
};

// STORY-NIGHT-2-FLOW: the one line at the top of the screen when the night ends (Kyle, 19 November 2026), in place of the
// journal page. A promise or debt made tonight comes first (the latest), then the Ash Men taking the camp, then the latest
// thing people will remember, and last how the Walkers now stand with you. A scout nobody saw is never named here.
const WALKER_WORD_LINES = {
  Sworn: 'The Walkers are sworn to you.',
  Friendly: 'The Walkers count you as a friend.',
  Strangers: 'The Walkers still do not know what to make of you.',
  Wary: 'The Walkers do not trust you.',
  Cold: 'The Walkers will not forget that you turned them away.',
};
const HIDDEN_MARKS = new Set(['unseen-night-2-scout']);
const lowerFirst = text => /^(The|You|Your|An|A) /.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
export function night2Remembered(ledger, night = 2) {
  const tonight = (ledger?.history ?? []).filter(change => change.night === night);
  const line = id => memoryLines[id] ?? LEDGER_MARK_LINES[id];
  // A first-version save kept only the key of a debt; its words are still on the ledger's own list.
  const debtText = change => change.after?.text ?? ledger.obligations?.find(item => item.id === change.key)?.text;
  const debt = tonight.findLast(change => ['debt', 'promise'].includes(change.type) && debtText(change));
  const marks = tonight.filter(change => change.type === 'mark' && !HIDDEN_MARKS.has(change.key) && line(change.key));
  const taken = marks.find(change => change.key === 'wash-camp-taken');
  const word = ledger?.words?.walkers;
  const text = (debt && debtText(debt)) ?? (taken && line(taken.key)) ?? (marks.length ? line(marks.at(-1).key) : WALKER_WORD_LINES[word]);
  return text ? 'Remembered: ' + lowerFirst(text) : null;
}

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

// `inNight`: the journal opened from the pause card in the middle of the night marks what changed so far tonight, as the dawn page does.
export function night2Page(ledger, {inNight = false} = {}) {
  const page = ledgerPageData(ledger);
  if (!page) return null;
  const tonight = ledger.history.filter(change => change.night === 2);
  const known = new Set(tonight.filter(change => change.type === 'mark').map(change => change.key));
  const memories = Object.entries(memoryLines).filter(([id]) => known.has(id)).map(([, line]) => line);
  return {...page, memories, saltScrap: known.has('dace-kept-watch') ? 10 : 0, tonight: ledger.night === 3 || inNight ? {
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
  chapter.remembered = night2Remembered(chapter.ledger);
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

// The camp is solid (STORY-NIGHT-2-FLOW, Claude's decision): the lean-tos, the handcarts and the fires when they are lit stop a car.
// The same two fire sites and two lean-tos the picture draws (src/world/night-2-look.js).
export const NIGHT_2_CAMP_FIRES = [[-5, -5], [-2, 6]].map(([x, z]) => night2Point(sites.camp.position.x + x, sites.camp.position.z + z));
export const NIGHT_2_CAMP_SETS = Object.freeze(['camp', 'camp-won', 'camp-escape', 'caught', 'chase']);
export function night2CampSolids(chapter, cast = []) {
  if (!NIGHT_2_CAMP_SETS.includes(chapter.set)) return [];
  const {x, z} = sites.campShelter.position;
  const shelters = [-5, 5].map(offset => ({id: `walkers-lean-to-${offset}`, kind: 'building', x, z: z + offset,
    halfX: SALT_RIDERS.shelterHalfX, halfZ: SALT_RIDERS.shelterHalfZ, height: SALT_RIDERS.shelterHeight}));
  const carts = cast.filter(person => person.cart).map(person => ({id: `walkers-cart-${person.id}`, kind: 'prop',
    x: person.cart.x, z: person.cart.z, heading: person.cart.yaw, halfX: HANDCART.width / 2, halfZ: HANDCART.length / 2, height: 1.1}));
  const fires = chapter.props.campLights ? NIGHT_2_CAMP_FIRES.map((at, index) => ({id: `walkers-fire-${index + 1}`, kind: 'prop',
    shape: 'ellipse', x: at.x, z: at.z, halfX: .65, halfZ: .65, height: 1.15})) : [];
  return [...shelters, ...carts, ...fires];
}

function dressing(chapter, step) {
  chapter.props.salt = step.id === 'salt';
  chapter.props.ladle = ['chase', 'caught'].includes(step.id);
  chapter.props.shawl = step.id === 'at-hearth';
  chapter.props.shelter = ['camp', 'camp-won', 'camp-escape', 'caught', 'chase', 'pump', 'sleep'].includes(chapter.set);
  // STORY-NIGHT-2-FLOW (Claude's decision): fire follows the ember. The Walkers came to Tin Town because they had no fire, so
  // their camp has firelight only where they got an ember: Dace's stolen two, or the one carried out in the night. On every
  // refuse branch the camp is dark and cold, from the tower and at the Wash alike.
  chapter.props.campLights = ['escaped', 'delivery'].includes(step.id);
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
  else if (['escaped', 'wash-fight-won'].includes(step.id)) chapter.camera = {
    position: {...night2Point(sites.camp.position.x + 16, sites.camp.position.z + 14), y: sites.camp.position.y + 4.9},
    target: {...sites.camp.position, y: sites.camp.position.y + 1.25}, fov: 51,
  };
  else if (['take-dace-to-rell', 'send-away'].includes(step.id))
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
  worldJob.solidGrid.setCamp?.(night2CampSolids(chapter, worldJob.storyPeople));
  // The fight's siege car starts where the rider was on its ring, heading along it, so its lights never jump.
  if (step.id === 'wash-fight' && Number.isFinite(chapter.siegeAngle)) {
    const siege = step.riders.find(rider => rider.id === NIGHT_2_SIEGE.riderId);
    if (siege) siege.start = {...siegeAt(chapter.siegeAngle), heading: siegeHeading(chapter.siegeAngle)};
  }
  if (step.id === 'chase') beginChase(worldJob);
  if (step.id === 'gate') record(chapter, 'meet-walkers',
    presentPeople(['rell', 'dace', 'wim'], NIGHT_2_GATE_ENCOUNTER));
  if (['theft', 'whistle', 'lamp', 'tower'].includes(step.id)) chapter.night = true;
  if (step.id === 'salt' || step.id === 'escaped') {
    chapter.night = false;
    chapter.evening = .27;
  }
  return {scout: step.id === 'scout', riders: ['tower', 'tower-outcome', 'pot', 'delivery', 'wash-get-car', 'wash-drive'].includes(step.id) ? riders : []};
}

function stageAfter(chapter, step, result, cue, wrecked) {
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
      if (selected.id === 'drive-riders-off') return 'wash-get-car';
      const refuses = namedThrow(chapter.ledger, 'night-2/clinker-offer', night2Odds(chapter).refuseClinker);
      const id = refuses ? 'walkers-refuse-clinker' : 'walkers-go-with-clinker';
      cue(refuses ? 'luck.kind' : 'luck.unkind');
      record(chapter, id, NIGHT_2_EFFECTS[id]);
      chapter.watchOutcome = id;
      return 'tower-outcome';
    }
    case 'wash-fight': {
      const outcome = result.storyMarks?.riderFight?.outcome;
      const won = outcome === 'won';
      // A camp taken by the crews is not a night Rell thanks you for: the riders still count as driven off, but the
      // Walkers' word has already dropped for the camp, so the win does not set it again.
      if (won) record(chapter, 'wash-fight-won', chapter.campTaken
        ? NIGHT_2_EFFECTS['wash-fight-won'].filter(effect => effect.type !== 'word') : NIGHT_2_EFFECTS['wash-fight-won']);
      if (wrecked || outcome === 'lost') {
        chapter.washCarUnavailable = true;
        record(chapter, 'wash-car-towed', NIGHT_2_EFFECTS['wash-car-towed']);
      }
      if (won && !chapter.campTaken) return 'wash-fight-won';
      return chapter.washCarUnavailable ? 'wash-walk-to-cut' : 'wash-drive-home';
    }
    case 'wash-fight-won': return chapter.washCarUnavailable ? 'wash-walk-to-cut' : 'wash-drive-home';
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
  'wash-get-car': 'wash-drive', 'wash-drive': 'wash-fight', 'wash-drive-home': 'close',
  'wash-walk-to-cut': 'wash-walk-to-gap', 'wash-walk-to-gap': 'wash-walk-home', 'wash-walk-home': 'close',
};

// STORY-NIGHT-2-FLOW: the riders' siege, and the camp the crews can take. A talk holds the world still (its step has no
// time), so the rider stands on its circle while the tower talks and drives it in play.
// The rider waits while the player (on foot or in the car) stands within yieldMetres of its next point on the ring.
export function stepNight2Siege(worldJob, dt, player) {
  const chapter = worldJob.night2, step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!chapter || !NIGHT_2_SIEGE.steps.includes(step?.id)) return false;
  const rider = worldJob.actors.find(actor => actor.id === NIGHT_2_SIEGE.riderId);
  if (!rider?.position) return false;
  const angle = (chapter.siegeAngle ?? 0) + Math.max(0, dt) * NIGHT_2_SIEGE.mps / NIGHT_2_SIEGE.radius;
  const next = siegeAt(angle);
  if (player && Math.hypot(player.x - next.x, player.z - next.z) < NIGHT_2_SIEGE.yieldMetres) return false;
  chapter.siegeAngle = angle;
  const {x, z} = next;
  Object.assign(rider.position, {x, z, y: scablandsActorHeightAt(x, z)});
  rider.heading = siegeHeading(chapter.siegeAngle);
  return true;
}

// The first crew member to reach the camp takes it (src/arena/modes/road-riders.js marks the moment). The Walkers leave
// with their carts, west along the approach, and the ledger records it at once.
export function watchNight2Camp(worldJob, cue) {
  const chapter = worldJob.night2;
  if (!chapter || chapter.campTaken || !worldJob.crewGoalTaken) return false;
  chapter.campTaken = true;
  record(chapter, 'wash-camp-taken', NIGHT_2_EFFECTS['wash-camp-taken']);
  cue('night.camp.taken');
  for (const person of worldJob.storyPeople ?? []) {
    if (['auntie-solder', 'clinker'].includes(person.id)) continue;
    const {x, z} = person.position, away = [{x: x - 35, z: z + 6}, {x: x - 90, z: z + 14}];
    if (person.seat) { person.seat = null; person.position.y = scablandsActorHeightAt(x, z); }
    setStoryPersonAction(person, person.cart ? 'push-cart' : 'walk', away);
  }
  return true;
}

export function routeNight2(worldJob, previous, result, cue, wrecked = false) {
  const chapter = worldJob.night2;
  const step = result.steps[previous];
  const id = stageAfter(chapter, step, result, cue, wrecked);
  result.stepIndex = id == null ? result.steps.length : result.steps.findIndex(candidate => candidate.id === id);
  if (result.stepIndex < 0) throw new Error('Missing Night 2 scene: ' + id);
  result.done = id == null;
  result.stepState = {};
  result.events = result.events.filter(event => event.type !== 'done');
  if (result.done) {
    chapter.completed = step.id === 'close';
    // The night ends in the world at dawn (STORY-NIGHT-2-FLOW): the light comes up over the hearth while the one line
    // of what people remember shows at the top of the screen.
    if (chapter.completed) {
      chapter.night = false;
      chapter.evening = .27;
      chapter.dawn = true;
    }
    result.events.push({type: 'done'});
  }
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

export function night2Action(worldJob, point, onFoot, car) {
  const chapter = worldJob.night2, step = worldJob.job.steps[worldJob.job.stepIndex];
  if (step.action === 'board' || step.inCar && onFoot) {
    const pastGate = point.z >= sites.gate.z + 3;
    const throughGate = car.z >= sites.gate.z && !pastGate && point.x > sites.westGap.position.x;
    const alley = onFoot && townCarWay(step, worldJob.solidGrid, car, sites.around)?.aim(point, 'car');
    const route = alley ? {point: alley, metres: alley.metres}
      : onFoot && throughGate && direction(chapter, point, sites.gateOutside);
    chapter.routes = onFoot ? [{name: 'Your car', ...(route || {point: car, metres: dist(point, car)})}] : [];
    return {arrival: onFoot ? null : 'boarded', marker: chapter.routes[0]?.point};
  }
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
    // One rule for an Ash Man on foot (STORY-NIGHT-2-FLOW item 7): a hit from your car knocks him flat for good, here as at the Wash.
    if (chapter.scoutDowned) return {arrival: 'scout-stopped'};
    return {arrival: dist(scout, at(goal)) <= goal.radius ?
      (chapter.scoutTurned ? 'scout-stopped' : 'scout-escaped') : null};
  }
  if (step.id === 'wash-walk-to-cut' || step.id === 'wash-walk-to-gap') {
    const pointTo = at(step.place);
    chapter.routes = [{name: step.id === 'wash-walk-to-gap' ? 'The west opening' : 'The track home',
      point: pointTo, metres: dist(point, pointTo)}];
  } else if (step.kind === 'reach' && step.onFoot) {
    const name = {'walk-to-gate': 'The gate', 'walk-watch-post': 'Dace’s watch', 'back-to-hearth': 'The hearth',
      'reach-store': 'The store', 'wash-walk-home': 'The hearth'}[step.id];
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
