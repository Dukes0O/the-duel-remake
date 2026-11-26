import {attendTo, STORY_FIGURES} from '../../jobs/story-people.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {scablandsActorHeightAt} from '../../scablands-ground.js';
import {stepMover, FOOT_GRADE} from '../../scablands-movers.js';
import {isTrue} from '../facts.js';
import {followRoutine, routinePose} from '../routine-rule.js';
import {DRY_PUMP_CAST, PEOPLE} from '../content/people.js';
import {TOWN_BACKGROUND, WALKER_COMPANIONS} from '../content/people-town.js';
import {TALK_TABLES} from '../content/talk-tables.js';
import {TOWN_SCENES} from '../content/talk-town.js';
import {marketPeople} from '../market-day-rule.js';
import {scoutPeople} from '../content/burned-scout.js';
import {haulerPeople} from '../content/stranded-hauler-places.js';
import {haulerTalkScene} from '../content/talk-hauler.js';
import {flagPeople} from '../content/somebody-elses-flag-places.js';

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
  const table = TALK_TABLES[row.talk] ?? [];
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
    const choices = [];
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
      if (event.type === 'openTalkClosed') {
        if (event.finished && !heard.includes(active.scene)) heard = [...heard, active.scene];
        active = null;
      }
    }
    const flag = view.checkpointsEnabled ? flagPeople(world) : [];
    const extras = view.checkpointsEnabled ? [...scoutPeople(view.missionLookoutPosts ?? []),
      ...haulerPeople(world, {...view, seconds: context.seconds}), ...flag] : [];
    const pump = view.checkpointsEnabled && world.open.threads['dry-pump'];
    const mallPeople = pump && (pump.beat !== 'sign' || pump.end) ? DRY_PUMP_CAST.filter(row =>
      row.id === 'nan-tallow' ? pump.end === 'gone' : !pump.end || row.id === 'mr-penny') : [];
    const market = view.checkpointsEnabled ? marketPeople(world, view) : [];
    const staged = Object.fromEntries(market.map(row => [row.id, (row.routine.day.at ?? row.routine.day.around).join('/')]));
    const stageAt = row => Object.hasOwn(staged, row.id) ? staged[row.id] : null;
    const rows = [...residents.filter(row => standsHere(row, world) && !stageAt(row) &&
      !flag.some(person => person.id === row.id)), ...[...extras, ...mallPeople].filter(row => !stageAt(row)), ...market];
    let cast = rows.flatMap(row => {
      if (!Object.hasOwn(STORY_FIGURES, row.figure)) return [];
      // A parallel card can supply a resolver for building or site spots.
      const hasNamedSpot = plan => (plan.stops?.some(stop => stop.at.length === 2) ||
        (plan.at ?? plan.around)?.length === 2);
      const plan = row.routine[partOfDay] ?? row.routine.day;
      if (hasNamedSpot(plan)) return [];
      const target = targetFor(row, context, partOfDay);
      const person = state.cast.find(item => item.id === row.id);
      if (!person || stageAt(row) && stageAt(row) !== state.staged?.[row.id]) return [firstPose(row, target, peopleGrid)];
      if (active?.person === row.id) return [faceDriver(person, driver, dt)];
      return [followRoutine(person, target, dt, {
        pace: STORY_FIGURES[row.figure].pace * 1.15, radius: person.radius, car: carPosition, grid: peopleGrid,
        returnBounds: plan.kind === 'post' && !stageAt(row) ? townEdges : null,
      })];
    });
    const requests = [];
    if (!active && onFoot && interact && !state.useHeld) {
      const nearest = cast.filter(person => distanceToPerson(person, driver) <= TALK_RANGE)
        .sort((a, b) => distanceToPerson(a, driver) - distanceToPerson(b, driver));
      for (const person of nearest) {
        const talk = talkFor(rows.find(row => row.id === person.id), world,
          id => haulerTalkScene(id, context) ?? TOWN_SCENES[id], heard);
        if (!talk) continue;
        active = {person: person.id, scene: talk.id};
        cast = cast.map(item => item === person ? faceDriver(item, driver, 1) : item);
        requests.push({type: 'talk', person: person.id, speaker: person.id, ...talk, asked: asked[talk.id] ?? []});
        break;
      }
    }
    return {state: {cast, active, asked, heard, useHeld: !!interact, ...(market.length ? {staged} : {})}, choices, requests};
  },
};
