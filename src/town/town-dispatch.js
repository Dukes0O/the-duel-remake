import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';
import {TOWN_TIME} from './town-calendar.js';
import {TOWN_DISPATCH_LOGS} from './content/logs.js';

const CREW_IDS = new Set(['cinder','odessa','wren','dune','tusk','nell','jax','rook','vesper']);
const CREW_SPECIALTY = Object.freeze({cinder:'fire', odessa:'repair', wren:'scout', dune:'scout',
  tusk:'muscle', nell:'demolition', jax:'boarding', rook:'*', vesper:'talk'});
const HOURS_PER_YEAR = BigInt(TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear);
const HOURS_PER_DAY = BigInt(TOWN_TIME.ticksPerDay);
const MAX_SKILL = 0.3;

const numberIn = (value, low, high, fallback=0) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : fallback));
const asBigInt = value => typeof value === 'bigint' ? value : BigInt(value);
function ageAtYear(joinedYear, year) {
  const current = asBigInt(year), joined = asBigInt(joinedYear);
  const age = 25n + (current > joined ? current - joined : 0n);
  return age <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(age) : age;
}

function dispatchState(town) {
  town.dispatch ||= {nextId:1n, crew:{}, active:[], completed:[], explored:[]};
  town.dispatch.crew ||= {};
  town.dispatch.active ||= [];
  town.dispatch.completed ||= [];
  town.dispatch.explored ||= [];
  if (typeof town.dispatch.nextId === 'number' && Number.isSafeInteger(town.dispatch.nextId))
    town.dispatch.nextId = BigInt(town.dispatch.nextId);
  if (typeof town.dispatch.nextId !== 'bigint' || town.dispatch.nextId < 1n) town.dispatch.nextId = 1n;
  return town.dispatch;
}

function ensureCrew(town, crewId) {
  const state = dispatchState(town);
  const currentYear = town.calendar?.year ?? 1;
  let member = state.crew[crewId];
  if (!member) {
    member = state.crew[crewId] = {age:25, joinedYear:currentYear, trainingDays:{}, unavailableUntil:0n};
  }
  member.age = ageAtYear(member.joinedYear, currentYear);
  member.trainingDays ||= {};
  return member;
}

function crewSkill(member, crewId, kind) {
  const specialty = CREW_SPECIALTY[crewId];
  const base = specialty === '*' || specialty === kind ? 0.2 : 0.05;
  const yearsUsed = Number(asBigInt(member.trainingDays[kind] || 0) / 360n);
  return Math.min(MAX_SKILL, base + yearsUsed * 0.02);
}

export function townDispatchChance({crewSkill=0, vehicleBonus=0, standing=0, difficulty=0}={}) {
  const skill = numberIn(crewSkill, 0, MAX_SKILL);
  const vehicle = numberIn(vehicleBonus, 0, 0.15);
  const placeStanding = numberIn(standing, -0.1, 0.1);
  const jobDifficulty = numberIn(difficulty, 0, 0.5);
  return Math.min(0.95, Math.max(0.1, 0.5 + skill + vehicle + placeStanding - jobDifficulty));
}

export function townDispatchChanceWords(chance) {
  chance = numberIn(chance, 0.1, 0.95);
  if (chance < 0.35) return 'Risky';
  if (chance < 0.55) return 'Even';
  if (chance < 0.8) return 'Likely';
  return 'Sure thing';
}

function validJob(command) {
  return typeof command.kind === 'string' && command.kind.trim().length > 0
    && Number.isSafeInteger(command.days ?? 1) && (command.days ?? 1) >= 1;
}

function startDispatch(town, command) {
  if (!CREW_IDS.has(command.crewId)) return {ok:false, message:'Choose a crew member who has joined the town.'};
  if (!validJob(command)) return {ok:false, message:'Choose a kind of job and a whole number of days.'};
  const state = dispatchState(town);
  const member = ensureCrew(town, command.crewId);
  if (BigInt(town.tick) < BigInt(member.unavailableUntil || 0)) return {ok:false, message:'That crew member is resting after a hard job.'};
  if (state.active.some(job => job.crewId === command.crewId)) return {ok:false, message:'That crew member is already out on a job.'};
  const kind = command.kind.trim().toLowerCase();
  const skill = crewSkill(member, command.crewId, kind);
  const chance = townDispatchChance({crewSkill:skill, vehicleBonus:command.vehicleBonus,
    standing:command.standing, difficulty:command.difficulty});
  const days = command.days ?? 1;
  if (kind === 'scout' && (!Number.isSafeInteger(command.chunkX) || !Number.isSafeInteger(command.chunkZ)))
    return {ok:false, message:'Choose a whole-number map chunk for the scout to visit.'};
  const job = {id:`dispatch-${state.nextId++}`, crewId:command.crewId, kind,
    chance, chanceWords:townDispatchChanceWords(chance), skill, startedTick:BigInt(town.tick),
    daysRemaining:days, days, target:kind === 'scout' ? {
      regionId:typeof command.regionId === 'string' && command.regionId ? command.regionId : 'scablands',
      chunkX:command.chunkX, chunkZ:command.chunkZ,
    } : null};
  state.active.push(job);
  return {ok:true, job, chance, chanceWords:job.chanceWords,
    message:`${command.crewId[0].toUpperCase()}${command.crewId.slice(1)} is away for ${days} days. The chance is ${Math.round(chance * 100)} percent, ${job.chanceWords.toLowerCase()}.`};
}

registerTownCommand('dispatchCrew', startDispatch);

function addExplored(state, target) {
  const known = new Set(state.explored.map(area => `${area.regionId}:${area.x},${area.z}`));
  for (let z = target.chunkZ - 1; z <= target.chunkZ + 1; z++) {
    for (let x = target.chunkX - 1; x <= target.chunkX + 1; x++) {
      const key = `${target.regionId}:${x},${z}`;
      if (!known.has(key)) state.explored.push({regionId:target.regionId, x, z});
    }
  }
}

function finishDispatch(town, state, job, rng, tick) {
  const succeeded = rng.float() < job.chance;
  const member = ensureCrew(town, job.crewId);
  member.trainingDays[job.kind] = asBigInt(member.trainingDays[job.kind] || 0) + BigInt(job.days);
  const unavailableDays = succeeded ? 0 : Math.max(2, Math.ceil(job.days / 3));
  member.unavailableUntil = BigInt(tick) + BigInt(unavailableDays) * HOURS_PER_DAY;
  if (succeeded && job.kind === 'scout') addExplored(state, job.target);
  const line = rng.pick(TOWN_DISPATCH_LOGS[job.crewId]);
  const elapsedDays = Math.max(1, Number((BigInt(tick) - BigInt(job.startedTick)) / HOURS_PER_DAY));
  const outcome = {id:job.id, crewId:job.crewId, kind:job.kind, succeeded,
    tick:BigInt(tick), chance:job.chance, days:elapsedDays,
    text:`Day ${elapsedDays}. ${line}`};
  state.completed.push(outcome);
  town.book ||= [];
  town.book.push({type:'crew-dispatch', crewId:job.crewId, tick:BigInt(tick), text:outcome.text});
  return outcome;
}

export function dispatchTownSystem({town, rng, tick}) {
  const state = dispatchState(town);
  for (const member of Object.values(state.crew)) {
    const currentYear = town.calendar?.year ?? 1;
    member.age = ageAtYear(member.joinedYear, currentYear);
  }
  const stillActive = [];
  for (const job of state.active) {
    job.daysRemaining--;
    if (job.daysRemaining > 0) stillActive.push(job);
    else finishDispatch(town, state, job, rng, tick);
  }
  state.active = stillActive;
}

registerTownSystem('town-dispatch', 70, TOWN_TIME.ticksPerDay, dispatchTownSystem);

export function townDispatchRecords(town) {
  const state = town?.dispatch;
  return {crew:state?.crew || {}, active:state?.active || [], completed:state?.completed || [], explored:state?.explored || []};
}
