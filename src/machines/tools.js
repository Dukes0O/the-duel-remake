import {machineToolPosition} from './machine.js';

const DENSITY_KG_M3 = Object.freeze({topsoil:1_300, clay:1_700, gravel:1_850, rock:2_400});
const finite = Number.isFinite;
const total = load => Object.values(load ?? {}).reduce((sum, volume) => sum + volume, 0);

function addVolumes(target, source, amount) {
  const sourceTotal = total(source);
  if (sourceTotal <= 0 || amount <= 0) return 0;
  const moved = Math.min(sourceTotal, amount);
  for (const [material, volume] of Object.entries(source)) {
    const part = Math.min(volume, volume * moved / sourceTotal);
    source[material] = Math.max(0, volume - part);
    target[material] = (target[material] ?? 0) + part;
  }
  for (const material of Object.keys(source)) if (source[material] < 1e-12) delete source[material];
  return moved;
}

export function machineLoadVolume(state) { return total(state?.load); }

export function machineLoadMassKg(state) {
  return Object.entries(state?.load ?? {}).reduce((sum, [material, volume]) => sum + volume * (DENSITY_KG_M3[material] ?? 1_600), 0);
}

export function transferMachineLoad(sourceState, targetState, volumeM3, targetCapacityM3 = Infinity) {
  if (!sourceState?.load || !targetState?.load || !finite(volumeM3) || volumeM3 < 0 || !(targetCapacityM3 >= 0))
    throw new TypeError('Load transfer needs two machine loads, a non-negative volume and target capacity.');
  const source = {...sourceState.load}, target = {...targetState.load};
  const capacity = Math.max(0, targetCapacityM3 - total(target));
  const available = Math.min(volumeM3, total(source));
  const moved = addVolumes(target, source, Math.min(available, capacity));
  return {sourceState:{...sourceState, load:source}, targetState:{...targetState, load:target}, movedVolumeM3:moved,
    spilledVolumeM3:Math.max(0, available - moved)};
}

/** Apply one ground tool action. The edit layer remains the authority on ground and material. */
export function operateMachineTool(definition, state, {ground, toolId, action, dtSeconds = 0, shape = null, targetHeight = null, material = null, volumeM3 = null} = {}) {
  const tool = definition?.tools?.[toolId];
  if (!tool) throw new RangeError(`Unknown tool: ${toolId}`);
  if (!finite(dtSeconds) || dtSeconds < 0) throw new TypeError('Tool time must be non-negative.');
  const toolPosition = machineToolPosition(definition, state, toolId);
  const position = shape ?? {x:toolPosition.x, z:toolPosition.z, radius:tool.radiusM ?? 1};
  const load = {...state.load};
  const capacity = Math.max(0, (tool.capacityM3 ?? definition.maxLoadKg / 1_600) - total(load));
  if (action === 'dig') {
    if (!ground || typeof ground.cut !== 'function') throw new TypeError('Digging needs an editable ground layer.');
    const before = total(load);
    const depth = tool.cutRateM3s * dtSeconds / (Math.PI * Math.max(0.1, position.radius) ** 2);
    const cut = ground.cut(position, finite(targetHeight) ? targetHeight : ground.heightAt(position.x, position.z) - depth,
      capacity / 1.25);
    const looseCutVolume = cut.looseVolume;
    const accepted = Math.min(capacity, looseCutVolume);
    if (looseCutVolume > 0) for (const [kind, amount] of Object.entries(cut.volumes)) if (amount > 0) load[kind] = (load[kind] ?? 0) + amount * 1.25 * accepted / looseCutVolume;
    return {state:{...state, load}, groundResult:cut, movedVolumeM3:total(load) - before,
      spilledVolumeM3:Math.max(0, cut.looseVolume - accepted), refused:!cut.ok};
  }
  if (action === 'tip') {
    if (!ground || typeof ground.fill !== 'function') throw new TypeError('Tipping needs an editable ground layer.');
    const selectedMaterial = material && load[material] > 0 ? material : Object.keys(load)[0];
    const amount = Math.min(total(load), volumeM3 ?? (tool.dischargeRateM3s ?? 1) * dtSeconds);
    const materialVolumes = {...load};
    const loose = materialVolumes[selectedMaterial] ?? 0;
    const available = materialVolumes[selectedMaterial] ?? 0;
    const requested = Math.min(amount, available);
    const result = requested > 0 ? ground.fill(position, selectedMaterial, requested) : {ok:true,volume:0,looseVolume:0};
    if (result.ok) {
      const consumed = Math.min(requested, result.looseVolume);
      load[selectedMaterial] = Math.max(0, available - consumed);
      if (load[selectedMaterial] < 1e-12) delete load[selectedMaterial];
    }
    return {state:{...state, load}, groundResult:result, movedVolumeM3:result.ok ? result.looseVolume : 0,
      spilledVolumeM3:0, refused:!result.ok, material:loose > 0 ? selectedMaterial : null};
  }
  if (action === 'hook') return {state, groundResult:null, movedVolumeM3:0, spilledVolumeM3:0, refused:false};
  throw new RangeError(`Unsupported machine tool action: ${action}`);
}
