import {TOLL_ID, tollGateStanding} from '../content/mall-road-toll-places.js';
import {attendTo, STORY_FIGURES} from '../../jobs/story-people.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {scablandsActorHeightAt} from '../../scablands-ground.js';
import {stepMover, FOOT_GRADE} from '../../scablands-movers.js';
import {isTrue} from '../facts.js';
import {followRoutine, routinePose} from '../routine-rule.js';
import {DRY_PUMP_CAST, PEOPLE, LIGHTS_CAST, TOLL_CAST} from '../content/people.js';
import {TOWN_BACKGROUND, WALKER_COMPANIONS} from '../content/people-town.js';
import {TALK_TABLES} from '../content/talk-tables.js';
import {TOWN_SCENES} from '../content/talk-town.js';
import {runawayPeople} from '../content/runaway-places.js';
import {runawayTalkScene} from '../content/talk-threads.js';
import {routineFor} from '../routine-run-rule.js';
import {marketPeople} from '../market-day-rule.js';
import {scoutPeople} from '../content/burned-scout.js';
import {penPeople} from '../content/burned-pen.js';
import {heldGrowers, GROWERS} from '../burned-rescue-rule.js';
import {haulerPeople} from '../content/stranded-hauler-places.js';
import {lightsTalkScene} from '../content/talk-lights.js';
import {haulerTalkScene} from '../content/talk-hauler.js';
import {LAND} from '../../scablands-names.js';
import {lightsCrew} from '../content/lights-on-the-whites-places.js';
import {POCKET_ID, radioPeople, PARROT_TALK, PARROT_SCENE} from '../content/radio-hill-voice-places.js';
import {sitePosition} from '../site-rule.js';
import {dacePeople} from '../content/dace-goes-looking-places.js';
import {daceSignIsOut} from '../content/dace-goes-looking-rule.js';
import {flagPeople} from '../content/somebody-elses-flag-places.js';
import {homeFolkRows, homeFolkTalk} from '../home-folk-rule.js';
import {buildInLand, outsideGarlic, powerStrength} from '../home-rule.js';

export const TALK_RANGE = 2.5;
export const distanceToPerson = (person, point) => point ? Math.hypot(
  person.position.x - point.x, person.position.y - (point.y ?? person.position.y), person.position.z - point.z) : Infinity;

const residents = [...PEOPLE, ...TOWN_BACKGROUND, ...WALKER_COMPANIONS];
const townEdges = [NIGHT_2_SITES.gate, NIGHT_2_SITES.pump.position];
const standsHere = (row, world) => !row.needs || isTrue(row.needs, world);
const targetFor = (row, context, partOfDay) => routinePose(
  {id: row.id, pace: STORY_FIGURES[row.figure].pace, ...row.routine}, context.seconds, context.seed, partOfDay);

function firstPose(row, target, grid) {
  const {height, width} = STORY_FIGURES[row.figure];
  const radius = .4 * width * height / 1.7;
  const {x, y, z} = row.elevation ? {...target, y: scablandsActorHeightAt(target.x, target.z)} :
    stepMover(target, target, {radius, grade: FOOT_GRADE, grid});
  return {id: row.id, figure: row.figure, position: {x, y: scablandsActorHeightAt(x, z, y) + (row.elevation ?? 0), z},
    yaw: target.yaw, task: target.travelTask ?? target.task, distance: 0, radius, height};
}

export function talkFor(row, world, resolveScene = id => TOWN_SCENES[id], heard = []) {
  const table = TALK_TABLES[row?.talk] ?? [];
  for (const entry of [...table.filter(row => row.scene.startsWith('stranded-hauler/')),
    ...table.filter(row => !row.scene.startsWith('stranded-hauler/'))]) {
    if (entry.once && heard.includes(entry.scene)) continue;
    if (entry.needs && !isTrue(entry.needs, world)) continue;
    if (entry.afterChoice && !world.ledger.history.some(change => change.night === 2 && change.choiceId === entry.afterChoice))
      continue;
    const scene = resolveScene(entry.scene);
    if (scene) return {id: entry.scene, scene};
  }
  return null;
}

export function faceDriver(person, target, dt) {
  const facing = {yaw: person.yaw, headYaw: 0};
  attendTo({...person, action: 'stand'}, facing, target, dt);
  return {...person, yaw: facing.yaw, task: 'stand'};
}

export const peoplePart = {
  id: 'people',
  begin: () => ({cast: [], active: null, asked: {}, heard: [], useHeld: false}),
  step(state, context, dt) {
    const {world, view} = context;
    if (!view.openRoam) return;
    const {fighter, onFoot, interact, carPosition, peopleGrid, jobEvents = [], partOfDay = 'day'} = view;
    const driver = fighter?.position;
    let {active, asked, heard} = state;
    const choices = [], events = [];
    for (const event of jobEvents) {
      if (active && event.type === 'openTalkClosed' && typeof event.scene === 'string' &&
          event.scene.startsWith('market-day/')) active = null;
      if (!active || event.scene !== active.scene) continue;
      if (event.type === 'openTalkQuestion') {
        asked = {...asked, [active.scene]: [...(asked[active.scene] ?? []), event.id]};
        if (event.effects?.length) choices.push({id: active.scene + '/ask/' + event.id, effects: event.effects});
      }
      if (event.type === 'talkChoice' && event.effects?.length)
        choices.push({id: active.scene + '/choose/' + event.id, effects: event.effects});
      if (event.type === 'openTalkClosed' || event.type === 'openTalkSkipped') {
        if (event.type === 'openTalkClosed' && event.finished && !heard.includes(active.scene)) heard = [...heard, active.scene];
        active = null;
      }
    }
    // A guard's lamp (OPEN-BURNED-PEN) is drawn as a search lamp is, but nobody is being searched for.
    const search = view.threadSearchCast?.guards ? null : view.threadSearchCast;
    const runaways = view.checkpointsEnabled ? runawayPeople(world, search, view.sitePositions, partOfDay) : [];
    const toll = view.checkpointsEnabled && world.open.threads[TOLL_ID];
    const tollPeople = toll ? TOLL_CAST.filter(row => {
      if (runaways.some(person => person.id === row.id)) return false;
      if (row.id === 'sump') return tollGateStanding(world);
      if (row.id === 'sumps-rider') return ['caught', 'slope-run', 'slope-fight'].includes(toll.beat);
      if (row.id === 'rell') return !world.ledger.marks.includes('walkers-inside') &&
        isTrue({fact: 'word', of: 'walkers', atLeast: 'Friendly'}, world);
      return true;
    }) : [];
    const dace = view.checkpointsEnabled ? dacePeople(world, daceSignIsOut(context), view.threadMission) : [];
    const storyPeople = view.checkpointsEnabled ? [...flagPeople(world), ...tollPeople].filter(row =>
      !dace.some(person => person.id === row.id)).concat(dace) : [];
    const convoy = view.checkpointsEnabled && view.threadConvoy;
    const burnt = world.open.threads['burned-camp'];
    const remaining = convoy && !convoy.truck ? (convoy.allFreed ? GROWERS : heldGrowers(world)) : [];
    const walkers = remaining.slice(0, convoy?.people ?? 0).map((name, index) => {
      const {x, z, heading} = convoy.place;
      const behind = 3 + index * 1.5;
      const at = {x: x - Math.sin(heading) * behind, z: z - Math.cos(heading) * behind};
      return {id: 'rescued/' + name, figure: STORY_FIGURES[name] ? name : 'grower-' + (1 + index % 3),
        position: {...at, y: scablandsActorHeightAt(at.x, at.z)}, yaw: heading, task: 'walk'};
    });
    const homeGrowers = view.checkpointsEnabled && burnt && (burnt.beat === 'gate' && !burnt.end ||
      world.ledger.marks.includes('burned-camp/stayed-inside')) ? GROWERS.map((name, index) => ({
        id: 'rescued/' + name, figure: STORY_FIGURES[name] ? name : 'grower-' + (1 + index % 3), talk: null, routine: {day: {kind: 'post',
          at: ['tin-town', -6 - index % 4 * 1.85, 44 + Math.floor(index / 4) * 2], task: 'stand'}}})) : [];
    const finchAtHome = view.checkpointsEnabled && ['home', 'party'].includes(burnt?.beat) && !burnt.end && !heldGrowers(world).includes('finch');
    if (finchAtHome) homeGrowers.push({id: 'rescued/finch', figure: 'finch', talk: null,
      routine: {day: {kind: 'post', at: ['tin-town', 24.8, 8.4], task: 'sit'}}});
    const finchCar = view.finchRide && view.road?.id === view.finchRide && view.road.cars.find(car => !car.wrecked);
    if (finchCar) homeGrowers.push({id: 'checkpoint/finch', figure: 'finch', position: {
      x: finchCar.x - Math.sin(finchCar.heading) * 1.3, z: finchCar.z - Math.cos(finchCar.heading) * 1.3, y: finchCar.y + .65,
    }, yaw: finchCar.heading, task: 'sit'});
    const extras = view.checkpointsEnabled ? [...scoutPeople(view.missionLookoutPosts ?? []), ...penPeople(world),
      ...haulerPeople(world, {...view, seconds: context.seconds}), ...storyPeople, ...walkers, ...homeGrowers,
      ...radioPeople(world, view.checkpointSites?.[POCKET_ID] ?? sitePosition(POCKET_ID, world.open.landSeed))] : [];
    const learner = view.dayClock ? routineFor(world).learner : null;
    const pump = view.checkpointsEnabled && world.open.threads['dry-pump'];
    const mallPeople = pump && (pump.beat !== 'sign' || pump.end) ? DRY_PUMP_CAST.filter(row =>
      (row.id === 'nan-tallow' ? pump.end === 'gone' : !pump.end || row.id === 'mr-penny') && !tollPeople.some(person => person.id === row.id)) : [];
    const market = view.checkpointsEnabled ? marketPeople(world, view) : [];
    const staged = Object.fromEntries(market.map(row => [row.id, (row.routine.day.at ?? row.routine.day.around).join('/')]));
    const stageAt = row => Object.hasOwn(staged, row.id) ? staged[row.id] : null;
    const ships = LAND.at('ships-in-sand');
    const lightsRows = view.checkpointsEnabled ? lightsCrew(world, view.threadMission, partOfDay).map(({id, position, deckHeight}) => {
      const row = LIGHTS_CAST.find(person => person.id === id);
      return {...row, elevation: deckHeight === undefined ? undefined : deckHeight - scablandsActorHeightAt(position.x, position.z),
        routine: {day: {kind: 'post', at: ['ships-in-sand', position.x - ships.x, position.z - ships.z], action: 'stand'}}};
    }) : [];
    const rows = homeFolkRows(world, view, [...residents.filter(row => (standsHere(row, world) || row.id === learner) && !stageAt(row) &&
      !storyPeople.some(person => person.id === row.id)), ...[...extras, ...mallPeople, ...lightsRows].filter(row => !stageAt(row)), ...market, ...runaways]);
    let cast = rows.flatMap(row => {
      if (row.absent || !Object.hasOwn(STORY_FIGURES, row.figure)) return [];
      if (row.position) {
        const at = row.position;
        const {height, width} = STORY_FIGURES[row.figure];
        return [{id: row.id, figure: row.figure, position: {...at, y: (at.y ?? scablandsActorHeightAt(at.x, at.z)) + (row.elevation ?? 0)},
          yaw: row.yaw ?? 0, task: row.task ?? 'stand', radius: .4 * width * height / 1.7, height, distance: 0}];
      }
      // A parallel card can supply a resolver for building or site spots.
      const hasNamedSpot = plan => (plan.stops?.some(stop => stop.at.length === 2) ||
        (plan.at ?? plan.around)?.length === 2);
      const plan = row.routine[partOfDay] ?? row.routine.day;
      if (hasNamedSpot(plan)) return [];
      let target = targetFor(row, context, partOfDay);
      let person = state.cast.find(item => item.id === row.id);
      if (row.homeFolk) {
        if (!person || !person.homeFolk) person = firstPose(row, row.homeArrived ? target : {...row.homeSource, yaw: 0, task: 'stand'}, peopleGrid);
        let leg = person.homeLeg ?? (row.homeArrived ? 3 : 0);
        if (leg < 3) {
          if (Math.hypot(person.position.x - row.homeRoute[leg].x, person.position.z - row.homeRoute[leg].z) < .8) leg++;
          if (leg < 3) target = {...row.homeRoute[leg], task: 'walk'};
        }
        if (leg === 3 && !row.homeArrived && (row.id === row.homeFolk || row.id === 'marigold'))
          events.push({type: 'homeFolkArrived', id: row.homeFolk});
        const moved = active?.person === row.id ? faceDriver(person, driver, dt) : followRoutine(person, target, dt,
          {pace: STORY_FIGURES[row.figure].pace * 1.15, radius: person.radius, car: carPosition, grid: peopleGrid, returnBounds: leg === 0 ? townEdges : null});
        if (row.homeFolk === 'finch' && row.homeArrived && partOfDay !== 'dark') {
          const tower = world.open.home.builds.find(row => row.kind === 'tower' && row.stage === 4);
          if (tower) {
            const top = buildInLand(tower), occupied = driver && Math.hypot(driver.x - top.x, driver.z - top.z) < 3 &&
              driver.y > scablandsActorHeightAt(top.x, top.z) + 3;
            if (!occupied && Math.hypot(moved.position.x - target.x, moved.position.z - target.z) < .8)
              moved.position = {...top, y: scablandsActorHeightAt(top.x, top.z) + 4.4};
          }
        }
        return [{...moved, homeFolk: row.homeFolk, homeLeg: leg}];
      }
      if (!person || row.elevation !== undefined || row.home === 'ships-in-sand' ||
          stageAt(row) && stageAt(row) !== state.staged?.[row.id]) return [firstPose(row, target, peopleGrid)];
      if (active?.person === row.id) return [faceDriver(person, driver, dt)];
      return [followRoutine(person, target, dt, {
        pace: STORY_FIGURES[row.figure].pace * 1.15, radius: person.radius, car: carPosition, grid: peopleGrid,
        returnBounds: plan.kind === 'post' && !stageAt(row) ? townEdges : null,
      })];
    });
    const garlic = view.homeGround && onFoot ? powerStrength(view.homePowers?.stinkGarlic) : 0;
    if (garlic > 0) cast = cast.map(person => {
      const aim = outsideGarlic(person.position, person.position, driver, garlic, 3, dt);
      if (aim === person.position) return person;
      const moved = stepMover(person.position, aim, {radius: person.radius, grade: FOOT_GRADE, grid: peopleGrid});
      return {...person, position: {x: moved.x, y: moved.y, z: moved.z}, task: 'walk',
        yaw: Math.atan2(moved.x - driver.x, moved.z - driver.z)};
    });
    const requests = [];
    if (!active && !view.threadSearchCast?.target && onFoot && interact && !state.useHeld &&
        !context.events?.some(event => event.type === 'routineInteraction')) {
      const nearest = cast.filter(person => distanceToPerson(person, driver) <= TALK_RANGE)
        .sort((a, b) => distanceToPerson(a, driver) - distanceToPerson(b, driver));
      for (const person of nearest) {
        const thread = view.checkpointsEnabled && (TALK_TABLES[person.id] ?? []).find(row =>
          row.scene.startsWith('runaway/later/') && !heard.includes(row.scene) &&
          (!row.needs || isTrue(row.needs, world)) && runawayTalkScene(row.scene, context));
        const homeTalk = homeFolkTalk(rows.find(row => row.id === person.id)?.talk);
        const talk = homeTalk ?? (thread ? {id: thread.scene, scene: runawayTalkScene(thread.scene, context)} : talkFor(rows.find(row => row.id === person.id), world,
          id => id === PARROT_TALK ? PARROT_SCENE : (view.checkpointsEnabled ? runawayTalkScene(id, context) : null) ?? haulerTalkScene(id, context) ?? lightsTalkScene(id, context) ?? TOWN_SCENES[id], heard));
        if (!talk) continue;
        active = {person: person.id, scene: talk.id};
        if (homeTalk) events.push({type: 'homeCue', cue: 'home.folk.greet'});
        cast = cast.map(item => item === person ? faceDriver(item, driver, 1) : item);
        requests.push({type: 'talk', person: person.id, speaker: person.id, ...talk, asked: asked[talk.id] ?? []});
        break;
      }
    }
    return {state: {cast, active, asked, heard, useHeld: !!interact, ...(market.length ? {staged} : {})}, choices, requests, events};
  },
};
