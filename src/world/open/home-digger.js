// The Dig's excavator, working on Home Ground's discrete building and earth jobs.
// The machine's joints, bucket reach, capacity, controls and tracked movement stay in the machine modules.
import {machineDefinition} from '../../machines/content/machines.js';
import {createMachineState, machineToolPosition, stepMachine} from '../../machines/machine.js';
import {machineLoadVolume, transferMachineLoad} from '../../machines/tools.js';
import {machineMoveContact} from '../../machines/yard-solids.js';
import {machineControlInput} from '../../input-contexts.js';
import {DIG_MACHINE_CONTROLS} from '../../machines/controls-view.js';
import {stepMover} from '../scablands-movers.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {HOME_CUES, HOME_DIG, HOME_WORDS} from './content/home-ground.js';
import {buildBounds, canBorrowDigger, digCellar, digDitch, digPond, ditchRefusal, homeSolids,
  pondRefusal, tearHomeBuild, tearRefusal, toGrid} from './home-rule.js';

const definition = machineDefinition('excavator');
const kinds = ['tear', 'ditch', 'cellar', 'pond'];
const cue = name => ({type: 'homeCue', cue: name});
const within = (at, bounds, pad = 0) => at.a >= bounds.i0 - pad && at.a <= bounds.i1 + pad &&
  at.b >= bounds.j0 - pad && at.b <= bounds.j1 + pad;

export function homeDigTarget(home, machine, kind, heightAt = scablandsSurfaceHeightAt) {
  const tip = machineToolPosition(definition, machine, 'bucket');
  tip.y += heightAt(machine.x, machine.z);
  const grid = toGrid(tip.x, tip.z), cell = {i: Math.floor(grid.a), j: Math.floor(grid.b)};
  const row = home.builds.find(row => within(grid, buildBounds(row), .3));
  let reason = !canBorrowDigger(home) ? 'digLocked' : null;
  if (!reason && kind === 'tear') reason = tearRefusal(home, row);
  if (!reason && kind === 'cellar') reason = home.cellar.dug === HOME_DIG.scoops ? 'cellarDone' :
    row?.kind === 'shed' && row.stage === 4 ? null : 'digCellar';
  if (!reason && kind === 'ditch') reason = ditchRefusal(home, cell);
  if (kind === 'pond' && home.pond && within(grid, {i0: home.pond.i, j0: home.pond.j, i1: home.pond.i + 2, j1: home.pond.j + 2})) {
    cell.i = home.pond.i; cell.j = home.pond.j;
  }
  if (!reason && kind === 'pond') reason = pondRefusal(home, cell);
  const ground = heightAt(tip.x, tip.z);
  // The bucket must meet the building or ground, rather than work from high in the air.
  const top = kind === 'tear' && row ? ground + (row.kind === 'tower' ? row.stage >= 2 ? 4.4 : 2 :
    row.stage >= 2 ? row.kind === 'greenhouse' ? 3.1 : 2.5 : .25) : ground;
  const touches = tip.y <= top + definition.tools.bucket.radiusM && tip.y >= ground - HOME_DIG.depth - .8;
  if (!reason && !touches) reason = 'digAim';
  return {kind, row, cell, tip, reason, key: `${kind}/${row && ['tear', 'cellar'].includes(kind) ? `${row.i}/${row.j}` : `${cell.i}/${cell.j}`}`};
}

export function stepHomeDigger(previous, home, view, seconds, flock = []) {
  const keys = !view.onFoot && !view.homeTalking ? view.homeDrillKeys ?? {} : {};
  const driving = !view.onFoot && !view.homeTalking;
  let state = previous ?? {machine: createMachineState(definition, {...view.carPosition, heading: view.homeCarHeading ?? 0}),
    mode: 'drive', kind: 'tear', heldKind: false, seconds: 0, targetKey: null, evacuation: null};
  state = {...state};
  if (keys.KeyB) { state.mode = state.mode === 'drive' ? 'work' : 'drive'; state.seconds = 0; }
  if (keys.KeyG && !state.heldKind) {
    state.kind = kinds[(kinds.indexOf(state.kind) + 1) % kinds.length]; state.seconds = 0; state.evacuation = null;
  }
  state.heldKind = !!keys.KeyG;
  const before = {...state.machine, ...view.carPosition, heading: view.homeCarHeading ?? state.machine.heading};
  const controls = machineControlInput(keys, null, state.mode);
  let machine = stepMachine(definition, before, controls, seconds);
  const solids = [...(view.peopleGrid?.near(before.x, before.z, machine.x, machine.z, 10) ?? []).filter(row => !String(row.id).startsWith('home/')),
    ...homeSolids(home, {gateOpen: true, heightAt: scablandsSurfaceHeightAt})];
  if (!driving || stepMover(before, machine, {solids: false}).blocked || machineMoveContact('excavator', before, machine, solids))
    machine = {...machine, x: before.x, z: before.z, heading: before.heading, speedMps: 0};
  const target = homeDigTarget(home, machine, state.kind), events = [];
  let prompt = state.mode === 'drive' ? HOME_WORDS.digDrive : DIG_MACHINE_CONTROLS.excavator.words + ' ' + HOME_WORDS.digWork;
  if (!driving || state.mode === 'drive') {
    return {home, state: {...state, machine, seconds: 0, targetKey: null, evacuation: null, target: null}, events, prompt: driving ? prompt : ''};
  }
  if (keys.KeyE && machineLoadVolume(machine) > 0) {
    // The removed building is already in its own pile. This only empties the bucket, using the Dig's load transfer.
    const tipped = transferMachineLoad(machine, {load: {}}, definition.tools.bucket.dischargeRateM3s * seconds);
    machine = tipped.sourceState;
    if (machineLoadVolume(machine) <= 1e-9) events.push(cue(HOME_CUES.digDump));
  }
  const full = machineLoadVolume(machine) > 1e-9;
  const needsHens = state.kind === 'tear' && target.row?.kind === 'coop' && target.row.stage === 4;
  if (needsHens && keys.Space && !target.reason && !full) state.evacuation = {...target.row};
  if (!needsHens) state.evacuation = null;
  const waiting = state.evacuation && flock.some(hen => within(toGrid(hen.x, hen.z), buildBounds(state.evacuation), .2));
  if (waiting) prompt = HOME_WORDS.digHens;
  else if (full) prompt = HOME_WORDS.digFull;
  else prompt += ' ' + (target.reason ? HOME_WORDS[target.reason] : HOME_WORDS[{tear: 'digTear', ditch: 'digDitch', cellar: 'digCellar', pond: 'digPond'}[state.kind]]);
  const working = keys.Space && !keys.KeyE && !full && !waiting && !target.reason && Math.abs(machine.speedMps) < .01;
  state.seconds = working ? (state.targetKey === target.key ? state.seconds : 0) + seconds : 0;
  state.targetKey = target.key;
  if (state.seconds >= HOME_DIG.seconds) {
    const cut = state.kind === 'tear' ? tearHomeBuild(home, target.row) : state.kind === 'ditch' ? digDitch(home, target.cell) :
      state.kind === 'cellar' ? digCellar(home, target.row) : digPond(home, target.cell);
    if (cut !== home) {
      home = cut;
      machine = {...machine, load: {topsoil: definition.tools.bucket.capacityM3}};
      events.push(cue(HOME_CUES.digBite), cue(state.kind === 'tear' ? HOME_CUES.digTear : HOME_CUES.digDitch));
    }
    state.seconds = 0;
  }
  return {home, state: {...state, machine, target}, prompt, events};
}
