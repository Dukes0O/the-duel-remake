const CHUNK_METRES = 32;
const SIDE = CHUNK_METRES;
const SAMPLE_COUNT = SIDE * SIDE;
export const GROUND_MATERIALS = Object.freeze(['topsoil', 'clay', 'gravel', 'rock']);
const MATERIAL_ID = Object.freeze(Object.fromEntries(GROUND_MATERIALS.map((name, index) => [name, index])));
const BULKING = 1.25;

const finite = value => Number.isFinite(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const hash = (seed, x, z) => {
  let value = (seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(z, 0x119de1f3)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
};

function validShape(shape) {
  if (!shape || !finite(shape.x) || !finite(shape.z) || !finite(shape.radius) || shape.radius <= 0)
    throw new TypeError('Ground shapes need a centre and a positive radius.');
}

function emptyResult(reason = null) {
  return {ok: reason === null, reason, volumes: Object.fromEntries(GROUND_MATERIALS.map(name => [name, 0])),
    volume: 0, looseVolume: 0};
}

/** A sparse, deterministic ground layer. Natural ground is supplied by the world. */
export function createGroundEdit({region, seed = 1, naturalHeight, reservedShapes = []} = {}) {
  if (!region || typeof region !== 'object' || typeof region.editable !== 'boolean')
    throw new TypeError('Ground region must say whether it is editable.');
  if (typeof naturalHeight !== 'function') throw new TypeError('Ground edits need a natural height function.');
  for (const shape of reservedShapes) validShape(shape);
  let chunks = new Map();
  const numericSeed = Number.isFinite(seed) ? seed | 0 : 1;

  const chunkKey = (cx, cz) => `${cx},${cz}`;
  function sampleAt(x, z, create = false) {
    const cx = Math.floor(x / CHUNK_METRES), cz = Math.floor(z / CHUNK_METRES);
    const lx = x - cx * CHUNK_METRES, lz = z - cz * CHUNK_METRES;
    const key = chunkKey(cx, cz);
    let chunk = chunks.get(key);
    if (!chunk && create) {
      chunk = {x: cx, z: cz, delta: new Float32Array(SAMPLE_COUNT), material: new Uint8Array(SAMPLE_COUNT)};
      chunks.set(key, chunk);
    }
    if (!chunk) return null;
    const index = lz * SIDE + lx;
    return {chunk, index};
  }

  function refusal(shape) {
    if (!region.editable) return 'This region is protected ground.';
    for (const reserved of reservedShapes) {
      if (Math.hypot(shape.x - reserved.x, shape.z - reserved.z) < shape.radius + reserved.radius)
        return reserved.sentence || 'A building or protected place is in the way.';
    }
    return null;
  }

  function heightAt(x, z) {
    if (!finite(x) || !finite(z)) throw new TypeError('Ground coordinates must be finite.');
    const x0 = Math.floor(x), z0 = Math.floor(z), tx = x - x0, tz = z - z0;
    const deltaAt = (sx, sz) => {
      const sample = sampleAt(sx, sz);
      return sample ? sample.chunk.delta[sample.index] : 0;
    };
    const north = deltaAt(x0, z0) * (1 - tx) + deltaAt(x0 + 1, z0) * tx;
    const south = deltaAt(x0, z0 + 1) * (1 - tx) + deltaAt(x0 + 1, z0 + 1) * tx;
    return naturalHeight(x, z) + north * (1 - tz) + south * tz;
  }

  function cut(shape, target, maxVolume = Infinity) {
    validShape(shape);
    if (!finite(target)) throw new TypeError('Cut target must be a finite height.');
    if (!(maxVolume >= 0)) throw new TypeError('Cut volume limit must be non-negative.');
    const reason = refusal(shape);
    if (reason) return emptyResult(reason);
    const result = emptyResult();
    const minX = Math.ceil(shape.x - shape.radius), maxX = Math.floor(shape.x + shape.radius);
    const minZ = Math.ceil(shape.z - shape.radius), maxZ = Math.floor(shape.z + shape.radius);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const dx = x - shape.x, dz = z - shape.z;
      if (dx * dx + dz * dz > shape.radius * shape.radius) continue;
      const sample = sampleAt(x, z, true), {chunk, index} = sample;
      const before = naturalHeight(x, z) + chunk.delta[index];
      const after = Math.max(target, Math.min(before, target));
      if (after >= before) continue;
      const removed = Math.min(before - after, Math.max(0, maxVolume - result.volume));
      if (removed <= 0) continue;
      chunk.delta[index] -= removed;
      const roll = hash(numericSeed, x, z);
      const depthStart = Math.max(0, naturalHeight(x, z) - before);
      const depthEnd = depthStart + removed;
      const topsoilEnd = 1 + roll;
      const clayEnd = topsoilEnd + 2 + roll * 2;
      const gravelEnd = clayEnd + 4 + roll * 3;
      const boundaries = [topsoilEnd, clayEnd, gravelEnd, Infinity];
      const starts = [0, topsoilEnd, clayEnd, gravelEnd];
      for (let layer = 0; layer < boundaries.length; layer++) {
        const inLayer = Math.max(0, Math.min(depthEnd, boundaries[layer]) - Math.max(depthStart, starts[layer]));
        result.volumes[GROUND_MATERIALS[layer]] += inLayer;
        if (inLayer > 0) chunk.material[index] = layer;
      }
      result.volume += removed;
    }
    result.looseVolume = result.volume * BULKING;
    return result;
  }

  function fill(shape, material, volume) {
    validShape(shape);
    if (!Object.hasOwn(MATERIAL_ID, material)) throw new TypeError('Fill material must be topsoil, clay, gravel or rock.');
    if (!finite(volume) || volume < 0) throw new TypeError('Fill volume must be a non-negative finite number.');
    const reason = refusal(shape);
    if (reason) return emptyResult(reason);
    const result = emptyResult();
    if (volume === 0) return result;
    const cells = [];
    const minX = Math.ceil(shape.x - shape.radius), maxX = Math.floor(shape.x + shape.radius);
    const minZ = Math.ceil(shape.z - shape.radius), maxZ = Math.floor(shape.z + shape.radius);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const dx = x - shape.x, dz = z - shape.z;
      if (dx * dx + dz * dz <= shape.radius * shape.radius) cells.push([x, z]);
    }
    if (!cells.length) return result;
    const compacted = volume / BULKING, each = compacted / cells.length, id = MATERIAL_ID[material];
    for (const [x, z] of cells) {
      const {chunk, index} = sampleAt(x, z, true);
      chunk.delta[index] += each;
      chunk.material[index] = id;
    }
    result.volumes[material] = compacted;
    result.volume = compacted;
    result.looseVolume = volume;
    return result;
  }

  function toSave() {
    return {version: 1, seed: numericSeed, chunkMetres: CHUNK_METRES,
      chunks: [...chunks.values()].sort((a, b) => a.x - b.x || a.z - b.z)
        .map(chunk => ({x: chunk.x, z: chunk.z, delta: new Float32Array(chunk.delta), material: new Uint8Array(chunk.material)}))};
  }

  function loadSave(save) {
    if (!save || save.version !== 1 || save.chunkMetres !== CHUNK_METRES || !Array.isArray(save.chunks))
      throw new TypeError('Unsupported ground edit save.');
    const nextChunks = new Map();
    for (const row of save.chunks) {
      if (!Number.isInteger(row.x) || !Number.isInteger(row.z) || !(row.delta instanceof Float32Array) ||
          row.delta.length !== SAMPLE_COUNT || !(row.material instanceof Uint8Array) || row.material.length !== SAMPLE_COUNT)
        throw new TypeError('Invalid ground edit chunk.');
      for (let index = 0; index < SAMPLE_COUNT; index++) {
        if (!finite(row.delta[index]) || row.material[index] >= GROUND_MATERIALS.length)
          throw new TypeError('Invalid ground edit sample.');
      }
      nextChunks.set(chunkKey(row.x, row.z), {x: row.x, z: row.z, delta: new Float32Array(row.delta), material: new Uint8Array(row.material)});
    }
    chunks = nextChunks;
  }

  return Object.freeze({heightAt, cut, fill, toSave, loadSave, get chunkCount() { return chunks.size; },
    get saveByteLength() { return chunks.size * SAMPLE_COUNT * 5 + chunks.size * 8 + 16; }});
}
