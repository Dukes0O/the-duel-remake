import {groundWaterFieldAt} from '../town/town-ground.js';
import {createMachineState, stepMachine} from './machine.js';
import {machineDefinition} from './content/machines.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const hash = value => {
  let h = value >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
};

/** A site's hidden water and layers are repeatable for its seed and whole-metre place. */
export function drillSite(seed, x, z) {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z) || !Number.isSafeInteger(seed))
    throw new TypeError('A seed and a whole-metre place are required.');
  const water = groundWaterFieldAt(seed, x, z);
  const variation = hash(seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(z, 0x85ebca77)) / 0xffffffff;
  return {x, z, ...water, clayEnd:water.depth * (0.2 + variation * 0.12),
    gravelEnd:water.depth * (0.55 + variation * 0.15)};
}

export function createDrillState(seed, x, z) {
  return {site:drillSite(seed, x, z), depth:0, mastDown:false, jammed:false, struckWater:false};
}

export function drillMaterialAt(site, depth) {
  if (depth >= site.depth) return 'wet';
  if (depth < site.clayEnd) return 'clay';
  return depth < site.gravelEnd ? 'gravel' : 'rock';
}

/** Feed ranges from -1 (back out) to 1 (hard feed). Raising the mast stops work. */
export function stepDrill(state, controls = {}, dtSeconds = 0) {
  if (!state?.site || !Number.isFinite(dtSeconds) || dtSeconds < 0)
    throw new TypeError('A drill state and non-negative elapsed time are required.');
  const mastDown = controls.mastDown === true;
  const feed = Number.isFinite(controls.feed) ? clamp(controls.feed, -1, 1) : 0;
  let {depth, jammed, struckWater} = state;
  const events = [];
  if (mastDown && feed < 0 && jammed) {
    jammed = false;
    events.push({type:'drill-unjammed', cue:'drill-reverse'});
  } else if (mastDown && feed > 0 && !jammed && !struckWater) {
    const material = drillMaterialAt(state.site, depth);
    if (material === 'rock' && feed > 0.75) {
      jammed = true;
      events.push({type:'drill-jammed', cue:'drill-jam'});
    } else {
      const rate = {clay:0.35, gravel:0.25, rock:0.12}[material];
      depth = Math.min(state.site.depth, depth + rate * feed * dtSeconds);
      events.push({type:'drill-cuttings', material, cue:`drill-${material}`});
      if (depth >= state.site.depth) {
        struckWater = true;
        events.push({type:'water-struck', cue:'drill-water'});
      }
    }
  }
  return {state:{...state, depth, mastDown, jammed, struckWater}, events};
}

/** The yard rig keeps its holes for this visit only. */
export function createDrillRigState(seed, position = {}) {
  return {seed, machine:createMachineState(machineDefinition('drill'), position), hole:null, wellheads:[]};
}

export function stepDrillRig(state, controls = {}, dtSeconds = 0) {
  const mastDown = controls.mastDown === true;
  const machine = stepMachine(machineDefinition('drill'), state.machine,
    mastDown ? {forward:0, steer:0} : controls, dtSeconds);
  const x = Math.round(machine.x), z = Math.round(machine.z);
  let hole = state.hole;
  const events = [];
  let wellheads = state.wellheads;
  if (mastDown && Math.abs(machine.speedMps) < 0.01) {
    if (!hole || hole.site.x !== x || hole.site.z !== z) hole = createDrillState(state.seed, x, z);
    const result = stepDrill(hole, controls, dtSeconds);
    hole = result.state;
    events.push(...result.events.map(event => ({...event, x, z})));
    if (events.some(event => event.type === 'water-struck') && !wellheads.some(well => well.x === x && well.z === z))
      wellheads = [...wellheads, {x, z}];
  } else if (hole && !mastDown) {
    hole = {...hole, mastDown:false};
  }
  return {state:{...state, machine, hole, wellheads}, events};
}

/** The yard uses the same drive and work modes as the other machines. */
export function drillYardControls(keys = {}, mode = 'drive') {
  if (mode === 'drive') return {
    forward:Number(!!keys.KeyW || !!keys.ArrowUp) - Number(!!keys.KeyS || !!keys.ArrowDown),
    steer:Number(!!keys.KeyD || !!keys.ArrowRight) - Number(!!keys.KeyA || !!keys.ArrowLeft),
    mastDown:false, feed:0,
  };
  return {mastDown:true, feed:keys.KeyS ? -1 : keys.Space ? (keys.KeyW ? 1 : 0.5) : 0};
}
