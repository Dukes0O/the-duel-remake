import * as THREE from 'three';

const finishes = ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness'];
const states = new WeakMap(), owners = new WeakMap();
const color = new THREE.Color();

// Factories already provide private paint. Protect a future shared-material
// factory too, without touching its textures, trim, shader hooks or geometry.
function privatePaint(vehicle) {
  const data = vehicle.userData, source = data.paint;
  const owner = owners.get(source);
  if (source.userData.sharedAsset || owner && owner !== vehicle) {
    const paint = source.clone();
    paint.userData.sharedAsset = false;
    paint.onBeforeCompile = source.onBeforeCompile;
    paint.customProgramCacheKey = source.customProgramCacheKey;
    vehicle.traverse(object => {
      if (object.material === source) object.material = paint;
      else if (Array.isArray(object.material) && object.material.includes(source)) {
        object.material = object.material.map(material => material === source ? paint : material);
      }
    });
    data.paint = paint;
  }
  owners.set(data.paint, vehicle);
  return data.paint;
}

function appearanceKey(id, name, tint, finish) {
  return `${id}:${name}:${tint.r}:${tint.g}:${tint.b}:${finishes.map(key => finish[key]).join(':')}`;
}

/**
 * Apply a garage preset before updateVehicleDamage. Returns true only when the
 * appearance changes. null or {id:'factory'} restores the car's exact finish.
 * Presets may omit color/finish fields; omitted fields use factory values.
 * Existing dents and scratches are retained by the following damage update.
 */
export function applyVehiclePaint(vehicle, appearance = null) {
  const data = vehicle?.userData;
  if (!data?.paint?.color) return false;
  let state = states.get(vehicle);
  if (!state || state.paint !== data.paint) {
    const paint = privatePaint(vehicle);
    // Damage can be present before the garage first applies a finish. Its
    // intact baselines are authoritative, not the current scorched material.
    const factoryColor = (data.originalColor || paint.color).clone();
    const factory = Object.fromEntries(finishes.map(key => [key, paint[key]]));
    factory.roughness = data.damageBase?.roughness ?? paint.roughness;
    factory.clearcoat = data.damageBase?.clearcoat ?? paint.clearcoat;
    state = { paint, factoryColor, factory, finish: { ...factory } };
    state.key = appearanceKey('factory', 'Factory finish', factoryColor, factory);
    states.set(vehicle, state);
    data.paintAppearance = { id: 'factory', name: 'Factory finish' };
  }
  const factory = !appearance || appearance.id === 'factory';
  const id = factory ? 'factory' : String(appearance.id || 'custom');
  const name = factory ? 'Factory finish' : String(appearance.name || id);
  color.copy(state.factoryColor);
  if (!factory && appearance.color != null) {
    const value = appearance.color;
    if (value?.isColor) color.copy(value);
    else if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 0xffffff) color.setHex(value);
    else if (typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) color.set(value);
  }
  for (const key of finishes) {
    const value = factory ? undefined : appearance[key];
    state.finish[key] = typeof value === 'number' && Number.isFinite(value)
      ? THREE.MathUtils.clamp(value, 0, 1) : state.factory[key];
  }
  const key = appearanceKey(id, name, color, state.finish);
  if (key === state.key) return false;
  state.key = key;
  const paint = state.paint, hadClearcoat = paint.clearcoat > 0;
  paint.color.copy(color);
  for (const property of finishes) paint[property] = state.finish[property];
  // Crossing zero changes Three's clearcoat shader feature. Normal preset
  // changes only update uniforms and preserve the existing wear shader.
  if (hadClearcoat !== (paint.clearcoat > 0)) paint.needsUpdate = true;
  if (data.originalColor) data.originalColor.copy(color);
  else data.originalColor = color.clone();
  data.damageBase ||= {};
  data.damageBase.roughness = state.finish.roughness;
  data.damageBase.clearcoat = state.finish.clearcoat;
  data.damageKey = null;
  data.paintAppearance.id = id;
  data.paintAppearance.name = name;
  return true;
}
