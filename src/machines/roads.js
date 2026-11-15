// Road work is kept as plain data so it can be used without a renderer or a town.
import {createMachineState, stepMachine} from './machine.js';
import {machineDefinition} from './content/machines.js';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const key = (x, z) => `${x}:${z}`;

export function createRoadWork() {
  return {cells:{}, bladeLoad:0};
}

export function roadCell(work, x, z) {
  return work.cells[key(x, z)] ?? {height:0, spread:0, compaction:0, surface:0, roughness:0};
}

/** Work one whole-metre ground cell. Material carried by the blade is conserved. */
export function workRoadCell(work, action) {
  const {kind, x, z} = action;
  if (!work?.cells || !Number.isSafeInteger(x) || !Number.isSafeInteger(z))
    throw new TypeError('Road work needs a whole-metre place.');
  const cell = {...roadCell(work, x, z)};
  let bladeLoad = work.bladeLoad;
  const events = [];
  if (kind === 'dozer') {
    if (!Number.isFinite(action.bladeHeight)) throw new TypeError('The blade needs a height.');
    if (action.spreading === true) {
      const fill = Math.min(bladeLoad, 0.1);
      cell.height += fill;
      cell.spread += fill;
      bladeLoad -= fill;
    } else if (cell.height > action.bladeHeight) {
      const cut = cell.height - action.bladeHeight;
      cell.height -= cut;
      bladeLoad += cut;
    } else {
      const fill = Math.min(bladeLoad, action.bladeHeight - cell.height);
      cell.height += fill;
      bladeLoad -= fill;
      cell.spread += fill;
    }
    cell.compaction = 0;
    cell.surface = 0;
    cell.roughness = Math.abs(cell.height - action.bladeHeight);
    events.push({type:'blade-work', cue:'dozer-blade'});
  } else if (kind === 'roller') {
    if (cell.spread > 0) {
      cell.compaction = clamp(cell.compaction + 0.35, 0, 1);
      // A drum presses an isolated heap towards the height of the worked ground beside it.
      const neighbours = [[x-1,z], [x+1,z], [x,z-1], [x,z+1]]
        .map(([nx,nz]) => work.cells[key(nx,nz)]).filter(other => other?.spread > 0);
      if (neighbours.length) {
        const level = neighbours.reduce((sum, other) => sum + other.height, 0) / neighbours.length;
        if (cell.height > level) cell.height = Math.max(level, cell.height - 0.25);
      }
    }
    events.push({type:'rolling', cue:'roller-ground'});
  } else if (kind === 'paver') {
    if (!Number.isFinite(action.speedMps) || !Number.isFinite(action.edgeOffsetM))
      throw new TypeError('Paving needs a speed and edge position.');
    if (cell.spread > 0) {
      cell.surface = 1;
      const neighbours = [[x-1,z], [x+1,z], [x,z-1], [x,z+1]]
        .map(([nx,nz]) => work.cells[key(nx,nz)]).filter(other => other?.spread > 0);
      const bump = neighbours.reduce((worst, other) => Math.max(worst, Math.abs(cell.height - other.height)), 0);
      cell.roughness = Math.max(1 - cell.compaction, clamp(Math.abs(action.speedMps - 0.5), 0, 1),
        clamp(Math.abs(action.edgeOffsetM), 0, 1), clamp(bump, 0, 1));
    }
    events.push({type:'paving', cue:'paver-surface'});
  } else {
    throw new RangeError('Unknown road machine.');
  }
  return {work:{...work, bladeLoad, cells:{...work.cells, [key(x, z)]:cell}}, events};
}

export function roadCondition(cell) {
  if (!cell.surface) return 'unfinished';
  if (cell.compaction < 0.9) return 'soft';
  return cell.roughness > 0.2 ? 'rough' : 'good';
}

/** Apply one machine action to a town's separate road-work layer. */
export function workTownRoadCell(town, action) {
  if (!town || typeof town !== 'object' || Array.isArray(town))
    throw new TypeError('Road work needs a town.');
  const result = workRoadCell(town.machineRoadWork ?? createRoadWork(), action);
  town.machineRoadWork = result.work;
  // Town routes use eight-metre cells. A grade covers the whole cell, so a
  // single good strip cannot make a truck treat the surrounding ground as paved.
  const x = Math.floor(action.x / 8), z = Math.floor(action.z / 8);
  let grade = 2;
  for (let dx = 0; dx < 8; dx++) for (let dz = 0; dz < 8; dz++) {
    const cell = roadCell(result.work, x * 8 + dx, z * 8 + dz);
    const cellGrade = roadCondition(cell) === 'good' ? 2 : cell.spread > 0 && cell.compaction >= 0.9 ? 1 : 0;
    grade = Math.min(grade, cellGrade);
  }
  const roads = town.machineRoads ?? (town.machineRoads = []);
  let road = roads.find(item => item.regionId === 'scablands' && item.x === x && item.z === z);
  if (!road) {
    road = {regionId:'scablands', x, z, state:'built'};
    roads.push(road);
  }
  road.roadClass = ['dirt', 'plank', 'paved'][grade];
  return result.events;
}

/** Shift gives the paver a steady working pace with a keyboard. */
export function roadYardControls(kind, controls, keys = {}) {
  const slow = kind === 'paver' && (keys.ShiftLeft || keys.ShiftRight);
  return {...controls, forward:slow ? controls.forward * 0.5 : controls.forward,
    working:!!keys.Space};
}

/** A yard machine works only as it travels, and leaves its work in the supplied yard. */
export function createRoadMachineState(kind, position = {}) {
  if (!['dozer', 'roller', 'paver'].includes(kind)) throw new RangeError('Choose a road machine.');
  return {kind, machine:createMachineState(machineDefinition(kind), position), distanceCarryM:0};
}

export function stepRoadMachine(state, work, controls = {}, dtSeconds = 0) {
  if (!state?.machine || !work?.cells || !Number.isFinite(dtSeconds) || dtSeconds < 0)
    throw new TypeError('Road work needs a machine, ground and elapsed time.');
  const before = state.machine;
  const machine = stepMachine(machineDefinition(state.kind), before, controls, dtSeconds);
  const distance = Math.hypot(machine.x - before.x, machine.z - before.z);
  const spreading = state.kind === 'dozer' && controls.working !== true && work.bladeLoad > 0;
  const active = controls.working === true || spreading;
  let carry = active ? state.distanceCarryM : 0;
  let nextWork = work;
  // The first working pass establishes the straight line the driver is extending.
  let roadLine = active && state.roadLine && state.lastWorkPosition &&
    Math.hypot(before.x - state.lastWorkPosition.x, before.z - state.lastWorkPosition.z) < 2
    ? state.roadLine : null;
  if (active && distance > 0 && !roadLine)
    roadLine = {x:before.x, z:before.z, heading:before.heading};
  const events = [];
  if (active && distance > 0) {
    const steps = Math.floor(carry + distance);
    for (let i = 0; i < steps; i++) {
      const fraction = (1 - carry + i) / distance;
      const x = Math.round(before.x + (machine.x - before.x) * fraction);
      const z = Math.round(before.z + (machine.z - before.z) * fraction);
      if (state.kind === 'paver' && roadCell(nextWork, x, z).spread <= 0) roadLine = null;
      else if (!roadLine) roadLine = {x:before.x, z:before.z, heading:before.heading};
      const result = workRoadCell(nextWork, {kind:state.kind, x, z,
        bladeHeight:Number.isFinite(controls.bladeHeight) ? controls.bladeHeight : -0.1, spreading,
        speedMps:Math.abs(machine.speedMps), edgeOffsetM:!roadLine ? 0 : (before.x + (machine.x-before.x)*fraction-roadLine.x)*Math.cos(roadLine.heading) - (before.z + (machine.z-before.z)*fraction-roadLine.z)*Math.sin(roadLine.heading)});
      nextWork = result.work;
      events.push(...result.events.map(event => ({...event, x, z})));
    }
    carry = (carry + distance) % 1;
  }
  return {state:{...state, machine, distanceCarryM:carry, roadLine, lastWorkPosition:active ? {x:machine.x, z:machine.z} : null}, work:nextWork, events};
}
