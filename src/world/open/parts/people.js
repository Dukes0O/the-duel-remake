import {attendTo, STORY_FIGURES} from '../../jobs/story-people.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {scablandsActorHeightAt} from '../../scablands-ground.js';
import {stepMover, FOOT_GRADE} from '../../scablands-movers.js';
import {isTrue} from '../facts.js';
import {followRoutine, routinePose} from '../routine-rule.js';
import {PEOPLE} from '../content/people.js';
import {TOWN_BACKGROUND, WALKER_COMPANIONS} from '../content/people-town.js';
import {TALK_TABLES} from '../content/talk-tables.js';
import {TOWN_SCENES} from '../content/talk-town.js';
import {runawayPeople} from '../content/runaway-places.js';
import {runawayTalkScene} from '../content/talk-threads.js';
import {scoutPeople} from '../content/burned-scout.js';

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
  for (const entry of TALK_TABLES[row?.talk] ?? []) {
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
    const extras = view.checkpointsEnabled ? scoutPeople(view.missionLookoutPosts ?? []) : [];
    const runaways = view.checkpointsEnabled ? runawayPeople(world, view.threadSearchCast, view.sitePositions, partOfDay) : [];
    const rows = [...residents.filter(row => standsHere(row, world)), ...extras, ...runaways];
    let cast = rows.flatMap(row => {
      if (!Object.hasOwn(STORY_FIGURES, row.figure)) return [];
      if (row.position) {
        const at = row.position;
        const {height, width} = STORY_FIGURES[row.figure];
        return [{id: row.id, figure: row.figure, position: {...at, y: at.y ?? scablandsActorHeightAt(at.x, at.z)},
          yaw: row.yaw ?? 0, task: 'stand', radius: .4 * width * height / 1.7, height, distance: 0}];
      }
      // A parallel card can supply a resolver for building or site spots.
      const hasNamedSpot = plan => (plan.stops?.some(stop => stop.at.length === 2) ||
        (plan.at ?? plan.around)?.length === 2);
      const plan = row.routine[partOfDay] ?? row.routine.day;
      if (hasNamedSpot(plan)) return [];
      const target = targetFor(row, context, partOfDay);
      const person = state.cast.find(item => item.id === row.id);
      if (!person) return [firstPose(row, target, peopleGrid)];
      if (active?.person === row.id) return [faceDriver(person, driver, dt)];
      return [followRoutine(person, target, dt, {
        pace: STORY_FIGURES[row.figure].pace * 1.15, radius: person.radius, car: carPosition, grid: peopleGrid,
        returnBounds: plan.kind === 'post' ? townEdges : null,
      })];
    });
    const requests = [];
    if (!active && !view.threadSearchCast?.target && onFoot && interact && !state.useHeld) {
      const nearest = cast.filter(person => distanceToPerson(person, driver) <= TALK_RANGE)
        .sort((a, b) => distanceToPerson(a, driver) - distanceToPerson(b, driver));
      for (const person of nearest) {
        const thread = view.checkpointsEnabled && (TALK_TABLES[person.id] ?? []).find(row =>
          row.scene.startsWith('runaway/later/') && !heard.includes(row.scene) &&
          (!row.needs || isTrue(row.needs, world)) && runawayTalkScene(row.scene, context));
        const talk = thread ? {id: thread.scene, scene: runawayTalkScene(thread.scene, context)} : talkFor(rows.find(row => row.id === person.id), world,
          id => (view.checkpointsEnabled ? runawayTalkScene(id, context) : null) ?? TOWN_SCENES[id], heard);
        if (!talk) continue;
        active = {person: person.id, scene: talk.id};
        cast = cast.map(item => item === person ? faceDriver(item, driver, 1) : item);
        requests.push({type: 'talk', person: person.id, speaker: person.id, ...talk, asked: asked[talk.id] ?? []});
        break;
      }
    }
    return {state: {cast, active, asked, heard, useHeld: !!interact}, choices, requests};
  },
};
