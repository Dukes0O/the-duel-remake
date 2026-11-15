import {machineDefinition} from './content/machines.js';
import {makeRng} from '../rng.js';

export const BORER_NO_FACE = 'There is not enough hill over her here. Dig her a cutting first.';
export const BORER_OBSTRUCTION = 'She will not cut there. Something stands in the way.';
export const BORER_STALL = 'The head has stalled. Ease off, then push again.';
export const BORER_OPEN_GROUND = 'She is coming up under open ground. Turn her down, or stop here.';
export const BORER_TRENCH = 'She is cutting a trench, not a tunnel. Raise her head and bring her up to the ground.';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const radians = degrees => degrees * Math.PI / 180;
const hardness = Object.freeze({topsoil:1, clay:0.8, gravel:0.55, rock:1 / 3});
const refusalMessage = refusal => (refusal === 'A building or protected place is in the way.' ||
  refusal === 'This region is protected ground.') ? BORER_OBSTRUCTION : refusal;

/** Ground height includes any cutting already dug by another machine. */
export function borerHasFace(ground, position, heading, radius = 3) {
  const floor = Number.isFinite(position.y) ? position.y : ground.heightAt(position.x, position.z);
  for (let distance = 1; distance <= 12; distance++) {
    const x = position.x + Math.sin(heading) * distance;
    const z = position.z + Math.cos(heading) * distance;
    const across = Math.max(0, radius - 0.5);
    if ([-across, 0, across].every(offset =>
      ground.heightAt(x + Math.cos(heading) * offset, z - Math.sin(heading) * offset) >= floor + 2 * radius)) return true;
  }
  return false;
}

/** Survey the first far-side crossing on the head's present horizontal line. */
export function borerSurvey(ground, state) {
  if (!ground || typeof ground.heightAt !== 'function' || !state ||
      ![state.x, state.y, state.z, state.heading].every(Number.isFinite))
    throw new TypeError('The survey needs ground and a position.');
  const dx = Math.sin(state.heading), dz = Math.cos(state.heading);
  const crown = state.y + 2 * machineDefinition('borer').boreRadiusM;
  let inside = false;
  for (let distanceM = 1; distanceM <= 2000; distanceM++) {
    const height = ground.heightAt(state.x + dx * distanceM, state.z + dz * distanceM);
    if (height > crown) inside = true;
    else if (inside) {
      // The crown crossing is still on the face. Aim for the ground beyond it,
      // using the same twelve-metre look ahead as the breakthrough rule.
      const riseM = ground.heightAt(state.x + dx * (distanceM + 12),
        state.z + dz * (distanceM + 12)) - state.y;
      return {distanceM, riseM, gradeOneIn:Math.abs(riseM) < 1e-9 ? null : distanceM / Math.abs(riseM)};
    }
  }
  return null;
}

export function createBorerState({x = 0, y = 0, z = 0, heading = 0, name = 'Mabel'} = {}) {
  if (![x, y, z, heading].every(Number.isFinite)) throw new TypeError('The borer needs a finite position and heading.');
  return {x, y, z, heading, slope:0, name, started:false, distanceM:0, travelM:0, headSpeed:0,
    lever:0, stalled:false, overloadSeconds:0, releaseSeconds:0, stepCarrySeconds:0, message:null, segments:[], covered:false, finished:false};
}

/** The conveyor starts its bank twelve metres to the right of the first mouth. */
export function borerMuckPile(segments) {
  if (!Array.isArray(segments)) throw new TypeError('The borer needs a list of tunnel segments.');
  if (!segments.length) return null;
  const {start, end} = segments[0];
  if (![start?.x, start?.z, end?.x, end?.z].every(Number.isFinite))
    throw new TypeError('The tunnel mouth needs finite coordinates.');
  const dx = end.x - start.x, dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-9) throw new RangeError('The tunnel mouth needs a direction.');
  // A radius of 0.75 m covers a sample on the one-metre ground grid.
  return {x:start.x + 12 * dz / length, z:start.z - 12 * dx / length, radius:0.75};
}


// Plan deposits before cutting so protected ground can never swallow material.
// One-metre ground samples are filled individually and capped against their
// height before the bank reached them. Removed material makes room again.
function planSpoil(ground, segments, bank, amount) {
  const {start, end} = segments[0];
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  const rightX = dz / length, rightZ = -dx / length;
  const cells = bank.cells, allocations = [];
  let remaining = amount, lastReason = null;
  while (remaining > 1e-9) {
    const nearEnd = cells.filter(cell => cell.along >= bank.far - 6 - 1e-9);
    let best = null;
    for (const cell of nearEnd) {
      const height = ground.heightAt(cell.x, cell.z) - cell.base + (cell.planned || 0);
      if (height < 5 - 1e-8 && (!best || height < best.height)) best = {cell, height};
    }
    if (!best) {
      let added = false;
      for (let tries = 0; tries < 128; tries++) {
        const along = bank.far + 1.5;
        bank.far = along;
        // Bridge the 1.5 m load positions on the one-metre ground grid.
        // A three-cell-wide strip remains visible on the two-metre view grid.
        for (const back of [1, 0.5, 0]) for (const across of [0, -1, 1]) {
          const distance = Math.max(0, along - back);
          const x = Math.round(start.x + rightX * (12 + distance) - rightZ * across);
          const z = Math.round(start.z + rightZ * (12 + distance) + rightX * across);
          if (cells.some(cell => cell.x === x && cell.z === z)) continue;
          const shape = {x, z, radius:0.49};
          const reason = (ground.spoilRefusal || ground.refusal)(shape);
          if (reason) { lastReason = reason; continue; }
          cells.push({x, z, along:distance, base:ground.heightAt(x, z)});
          added = true;
        }
        if (added) break;
      }
      if (!added) return {reason:lastReason || BORER_OBSTRUCTION};
      continue;
    }
    const volume = Math.min(remaining, 5 - best.height);
    best.cell.planned = (best.cell.planned || 0) + volume;
    allocations.push({cell:best.cell, volume});
    remaining -= volume;
  }
  for (const cell of cells) delete cell.planned;
  return {allocations};
}

// Follow the recorded centre line, including bends and slopes, without
// changing the cut or letting steering move the machine into the rock.
function placeOnCut(state, distance, radius) {
  let left = distance;
  for (const segment of state.segments) {
    const dx = segment.end.x - segment.start.x, dy = segment.end.y - segment.start.y;
    const dz = segment.end.z - segment.start.z, length = Math.hypot(dx, dy, dz);
    if (left <= length + 1e-8) {
      const t = clamp(left / length, 0, 1);
      state.x = segment.start.x + dx * t;
      state.y = segment.start.y + dy * t - radius * 0.55;
      state.z = segment.start.z + dz * t;
      state.heading = Math.atan2(dx, dz);
      state.slope = Math.atan2(dy, Math.hypot(dx, dz));
      return;
    }
    left -= length;
  }
}

// The far mouth must have rock behind it across the full width.
function behindIsFace(ground, state, radius) {
  if (state.distanceM < 12) return false;
  const behind = {...state};
  placeOnCut(behind, state.distanceM - 12, radius);
  const side = radius - 0.5;
  return [-side, 0, side].every(offset =>
    ground.heightAt(behind.x + Math.cos(behind.heading) * offset,
      behind.z - Math.sin(behind.heading) * offset) >= state.y + 2 * radius);
}

function atCrown(ground, state, radius) {
  const side = radius - 0.5;
  return [-side, 0, side].every(offset =>
    ground.heightAt(state.x + Math.cos(state.heading) * offset, state.z - Math.sin(state.heading) * offset) < state.y + 2 * radius - 1e-6);
}

function daylight(state, events, offLevelM) {
  state.offLevelM = Math.abs(offLevelM);
  state.finished = true;
  state.message = `Daylight. She is through, ${state.offLevelM.toFixed(1)} m off level.`;
  events.push({type:'daylight', cue:'borer.daylight', message:state.message});
}

// Keep straight cuts as one segment; a change in direction starts a new one.
function addCut(segments, start, end, radius) {
  const last = segments.at(-1);
  if (last) {
    const a = {x:last.end.x - last.start.x, y:last.end.y - last.start.y, z:last.end.z - last.start.z};
    const b = {x:end.x - start.x, y:end.y - start.y, z:end.z - start.z};
    const cross = Math.hypot(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    const lengths = Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z);
    if (cross <= lengths * 1e-9 && a.x * b.x + a.y * b.y + a.z * b.z > 0) {
      last.end = end;
      return;
    }
  }
  segments.push({start, end, radius, startOpen:segments.length === 0, endOpen:false});
}

/** Work is deterministic in fixed steps. A supplied material overrides the face query. */
export function stepBorer(state, controls = {}, ground, material = null, dtSeconds = 0) {
  if (!state || !ground || typeof ground.heightAt !== 'function' || typeof ground.refusal !== 'function' ||
      typeof ground.cut !== 'function' || typeof ground.fill !== 'function' ||
      !Number.isFinite(dtSeconds) || dtSeconds < 0 ||
      (material === null ? typeof ground.materialAt !== 'function' : !Object.hasOwn(hardness, material)))
    throw new TypeError('The borer needs ground, material and non-negative time.');
  const radius = machineDefinition('borer').boreRadiusM;
  const thrust = clamp(Number.isFinite(controls.thrust) ? controls.thrust : 0, -1, 1);
  const steer = clamp(Number.isFinite(controls.steer) ? controls.steer : 0, -1, 1);
  const slopeInput = clamp(Number.isFinite(controls.slope) ? controls.slope : 0, -1, 1);
  let next = {...state, segments:state.segments || [], spoilBank:state.spoilBank ?
    {far:state.spoilBank.far, cells:state.spoilBank.cells.map(cell => ({...cell}))} : {far:-1.5, cells:[]}}, carry = (state.stepCarrySeconds || 0) + dtSeconds;
  const events = [], step = 1 / 120;
  while (carry >= step - 1e-10) {
    carry -= step;
    // Old states have no separate travel position and start at the face.
    if (!Number.isFinite(next.travelM)) next.travelM = next.distanceM;
    if (next.stalled) {
      next.headSpeed = 0;
      next.releaseSeconds = thrust <= 0 ? next.releaseSeconds + step : 0;
      if (next.releaseSeconds >= 1 - 1e-9) {
        next.stalled = false; next.releaseSeconds = 0; next.overloadSeconds = 0; next.message = null;
      }
      continue;
    }
    if (thrust < 0) {
      next.headSpeed = 0; next.overloadSeconds = 0; next.message = null;
      next.travelM = Math.max(0, next.travelM + thrust * 1.4 * step);
      if (next.segments.length) placeOnCut(next, next.travelM, radius);
      continue;
    }
    if (thrust > 0 && next.travelM < next.distanceM - 1e-8) {
      next.headSpeed = 1; next.overloadSeconds = 0; next.message = null;
      next.travelM = Math.min(next.distanceM, next.travelM + thrust * 0.5 * step);
      placeOnCut(next, next.travelM, radius);
      continue;
    }
    if (!thrust || next.finished) {
      next.headSpeed = 1; next.overloadSeconds = 0;
      if (!thrust) next.message = null;
      continue;
    }
    const refusal = ground.refusal({x:next.x, z:next.z, radius});
    if (refusal || (!next.started && !borerHasFace(ground, next, next.heading, radius))) {
      const message = refusal ? refusalMessage(refusal) : BORER_NO_FACE;
      if (next.message !== message) events.push({type:'refuse', cue:'borer.refuse', message});
      next.message = message; next.headSpeed = 1; next.overloadSeconds = 0; continue;
    }
    const faceY = next.y + radius * 0.55;
    let faceMaterial = material ?? ground.materialAt(next.x, faceY, next.z);
    if (material === null && ground.heightAt(next.x, next.z) - (next.y + 2 * radius) > 3) {
      // The land's depth layers are sampled at the face. Rock has seeded, longer seams.
      if (!next.rockSeam || next.distanceM >= next.rockSeam.end) {
        const mouth = next.segments[0]?.start ?? {x:next.x,z:next.z};
        const index = (next.rockSeam?.index ?? -1) + 1;
        const seed = (ground.seed ?? 1) ^ Math.imul(Math.floor(mouth.x), 73856093) ^
          Math.imul(Math.floor(mouth.z), 19349663) ^ Math.imul(index + 1, 83492791);
        const random = makeRng(seed);
        next.rockSeam = {index, end:next.distanceM + random.range(8, 30), material:index % 2 ? 'gravel' : 'rock'};
      }
      faceMaterial = next.rockSeam.material;
    }
    const capacity = hardness[faceMaterial];
    if (capacity === undefined) throw new TypeError('The ground returned an unknown face material.');
    const overloaded = thrust > capacity + 1e-9;
    next.headSpeed = overloaded ? capacity / thrust : 1;
    next.overloadSeconds = overloaded ? next.overloadSeconds + step : 0;
    if (next.overloadSeconds >= 2 - 1e-9) {
      next.stalled = true; next.headSpeed = 0; next.message = BORER_STALL;
      events.push({type:'stall', cue:'borer.stall', message:BORER_STALL});
      continue;
    }
    const distance = 0.5 * Math.min(thrust, capacity) * step;
    if (ground.heightAt(next.x, next.z) >= next.y + 2 * radius) next.covered = true;
    if (next.covered && !next.exitCutting && atCrown(ground, next, radius)) {
      if (!behindIsFace(ground, next, radius)) {
        if (next.message !== BORER_OPEN_GROUND)
          events.push({type:'refuse', cue:'borer.refuse', message:BORER_OPEN_GROUND});
        next.message = BORER_OPEN_GROUND;
        continue;
      }
      const farX = next.x + Math.sin(next.heading) * 12;
      const farZ = next.z + Math.cos(next.heading) * 12;
      const difference = ground.heightAt(farX, farZ) - next.y;
      if (difference < -1) {
        const message = `She has come out ${(-difference).toFixed(1)} m up the face. Tip spoil below the mouth until she can drive out.`;
        if (next.message !== message) events.push({type:'refuse', cue:'borer.refuse', message});
        next.message = message;
        continue;
      }
      // Open the last covered segment once. The cutting beyond it is not lining.
      if (!controls.mutableSegments && next.segments === state.segments) {
        next.segments = next.segments.slice();
        if (next.segments.length) next.segments[next.segments.length - 1] = {...next.segments.at(-1)};
      }
      next.segments.at(-1).endOpen = true;
      events.push({type:'breakthrough', cue:'borer.breakthrough'});
      next.exitCutting = {distanceM:0, floor:next.y};
      if (difference <= 0.5) {
        daylight(next, events, difference);
        continue;
      }
    }
    if (next.exitCutting) {
      const difference = ground.heightAt(next.x, next.z) - next.y;
      if (Math.abs(difference) <= 0.5) {
        daylight(next, events, next.y - next.exitCutting.floor);
        continue;
      }
    }
    const heading = next.heading + steer * radians(0.5) * distance;
    const slope = clamp(next.slope + slopeInput * radians(0.3) * distance, -radians(6), radians(6));
    const x = next.x + Math.sin(heading) * Math.cos(slope) * distance;
    const z = next.z + Math.cos(heading) * Math.cos(slope) * distance;
    const obstruction = ground.refusal({x, z, radius});
    if (obstruction) {
      const message = refusalMessage(obstruction);
      if (next.message !== message) events.push({type:'refuse', cue:'borer.refuse', message});
      next.message = message;
      continue;
    }
    const start = {x:next.x, y:next.y + radius * 0.55, z:next.z};
    const end = {x, y:next.y + Math.sin(slope) * distance + radius * 0.55, z};
    const bank = {far:next.spoilBank.far, cells:next.spoilBank.cells.map(cell => ({...cell}))};
    const deposit = planSpoil(ground, next.segments.length ? next.segments : [{start, end}],
      bank, Math.PI * radius ** 2 * distance);
    if (deposit.reason) {
      const message = refusalMessage(deposit.reason);
      if (next.message !== message) events.push({type:'refuse', cue:'borer.refuse', message});
      next.message = message;
      continue;
    }
    const cut = ground.cut({x:(start.x + end.x) / 2, z:(start.z + end.z) / 2, radius},
      (start.y + end.y) / 2, Infinity, {length:distance});
    if (!cut.ok) {
      const message = refusalMessage(cut.reason);
      if (next.message !== message) events.push({type:'refuse', cue:'borer.refuse', message});
      next.message = message;
      continue;
    }
    for (const {cell, volume} of deposit.allocations) {
      for (const [kind, cutVolume] of Object.entries(cut.volumes)) {
        if (cutVolume > 0) ground.fill({x:cell.x, z:cell.z, radius:0.49}, kind,
          volume * cutVolume / cut.volume * 1.25);
      }
    }
    next.spoilBank = bank;
    if (next.message !== BORER_TRENCH) next.message = null;
    next.heading = heading; next.slope = slope; next.x = x; next.z = z;
    next.y += Math.sin(slope) * distance;
    if (!controls.mutableSegments && next.segments === state.segments) {
      next.segments = next.segments.slice();
      if (next.segments.length) next.segments[next.segments.length - 1] = {...next.segments.at(-1)};
    }
    if (next.exitCutting) {
      next.exitCutting = {...next.exitCutting, distanceM:next.exitCutting.distanceM + distance};
      const warningAt = next.exitCutting.nextTrenchWarningM ?? 60;
      if (next.exitCutting.distanceM >= warningAt) {
        next.exitCutting.nextTrenchWarningM = warningAt + 30;
        next.message = BORER_TRENCH;
        events.push({type:'refuse', cue:'borer.refuse', message:BORER_TRENCH});
      }
    } else {
      addCut(next.segments, start, end, radius);
      next.distanceM += distance; next.travelM = next.distanceM; next.started = true;
    }
    // An existing passage can open the face underground as well as daylight.
    // Ignore the recent cut behind the head, but allow older stretches to join.
    const passage = controls.tunnels?.tubeAt({x:next.x, y:next.y, z:next.z}, next.y, 0.6,
      controls.tunnelsIncludeCurrent ? Math.max(0, next.distanceM - 2 * radius - 1) : Infinity);
    const joinedPassage = passage && Math.abs(passage.floor - next.y) <= 0.6;
    if (!next.exitCutting && joinedPassage) {
      next.segments.at(-1).endOpen = true;
      next.finished = true;
      events.push({type:'breakthrough', cue:'borer.breakthrough'});
    }
  }
  next.stepCarrySeconds = Math.max(0, carry);
  return {state:next, events};
}
