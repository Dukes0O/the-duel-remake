export const CHUNK_METRES = 32;
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

// Every material at zero, in GROUND_MATERIALS order. A machine asks for one with every cut and fill.
function emptyResult(reason = null) {
  return {ok: reason === null, reason, volumes: {topsoil: 0, clay: 0, gravel: 0, rock: 0},
    volume: 0, looseVolume: 0};
}

/** A sparse, deterministic ground layer. Natural ground is supplied by the world. */
export function createGroundEdit({region, seed = 1, naturalHeight, reservedShapes = []} = {}) {
  if (!region || typeof region !== 'object' || typeof region.editable !== 'boolean')
    throw new TypeError('Ground region must say whether it is editable.');
  if (typeof naturalHeight !== 'function') throw new TypeError('Ground edits need a natural height function.');
  for (const shape of reservedShapes) validShape(shape);
  let siteGround = null;
  let chunks = new Map();
  const numericSeed = Number.isFinite(seed) ? seed | 0 : 1;
  let revision = 0, loadedRevision = 0;
  const editHistory = new Array(2048);
  const markChanged = shape => {
    revision++;
    editHistory[revision % editHistory.length] = {revision, ...shape};
  };

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
      const dx = shape.x - reserved.x, dz = shape.z - reserved.z, reach = shape.radius + reserved.radius;
      // The distance is never less than either offset, so a place that far off along one axis is clear.
      if (Math.abs(dx) >= reach || Math.abs(dz) >= reach) continue;
      if (Math.hypot(dx, dz) < reach)
        return reserved.sentence || 'A building or protected place is in the way.';
    }
    return null;
  }

  function baseHeightAt(x, z) {
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

  // Site depth is part of the natural surface during an open job. Work orders
  // remain in their own chunks, so loading another job never carries the site across.
  const siteOffset = (x, z) => siteGround?.hasChunkAt(x, z) ? siteGround.heightAt(x, z) : 0;
  const heightAt = (x, z) => baseHeightAt(x, z) + siteOffset(x, z);
  const unworkedHeight = (x, z) => naturalHeight(x, z) + siteOffset(x, z);

  // Use the same seeded layers as cut(), including material placed above
  // the natural surface. Coordinates select the same one-metre ground cell.
  function materialAt(x, y, z) {
    if (![x, y, z].every(finite)) throw new TypeError('Material coordinates must be finite.');
    const sx = Math.floor(x), sz = Math.floor(z);
    return cellMaterialAt(sx, sz, unworkedHeight(sx, sz), sampleAt(sx, sz), y);
  }

  // The layer at height y in one ground cell, given that cell's natural height and edit sample.
  function cellMaterialAt(sx, sz, natural, sample, y) {
    if (sample && y > natural && sample.chunk.delta[sample.index] > 0)
      return GROUND_MATERIALS[sample.chunk.material[sample.index]];
    const depth = Math.max(0, natural - y), roll = hash(numericSeed, sx, sz);
    const topsoilEnd = 1 + roll, clayEnd = topsoilEnd + 2 + roll * 2;
    const gravelEnd = clayEnd + 4 + roll * 3;
    return depth < topsoilEnd ? 'topsoil' : depth < clayEnd ? 'clay' :
      depth < gravelEnd ? 'gravel' : 'rock';
  }

  function cut(shape, target, maxVolume = Infinity, bore = null) {
    validShape(shape);
    if (!finite(target)) throw new TypeError('Cut target must be a finite height.');
    if (!(maxVolume >= 0)) throw new TypeError('Cut volume limit must be non-negative.');
    if (bore !== null && (!bore || !finite(bore.length) || bore.length < 0))
      throw new TypeError('An underground cut needs a non-negative length.');
    const reason = refusal(shape);
    if (reason) return emptyResult(reason);
    const result = emptyResult();
    if (bore !== null) {
      // The tunnel segments own the void. Do not lower the surface above it.
      // Sample equal-area strips across the circular face for the land's layers.
      const volume = Math.min(Math.PI * shape.radius ** 2 * bore.length, maxVolume);
      const strips = 32;
      let weightSum = 0;
      const weights = [];
      for (let i = 0; i < strips; i++) {
        const offset = (2 * (i + 0.5) / strips - 1) * shape.radius;
        const weight = Math.sqrt(shape.radius ** 2 - offset ** 2);
        weights.push({offset, weight});
        weightSum += weight;
      }
      // Every strip is in the same ground cell, so its natural height and sample are read once.
      const sx = Math.floor(shape.x), sz = Math.floor(shape.z);
      const natural = unworkedHeight(sx, sz), sample = sampleAt(sx, sz);
      for (const {offset, weight} of weights) {
        const y = target + offset;
        if (!finite(y)) throw new TypeError('Material coordinates must be finite.');
        result.volumes[cellMaterialAt(sx, sz, natural, sample, y)] += volume * weight / weightSum;
      }
      result.volume = volume;
      result.looseVolume = volume * BULKING;
      return result;
    }
    const minX = Math.ceil(shape.x - shape.radius), maxX = Math.floor(shape.x + shape.radius);
    const minZ = Math.ceil(shape.z - shape.radius), maxZ = Math.floor(shape.z + shape.radius);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const dx = x - shape.x, dz = z - shape.z;
      if (dx * dx + dz * dz > shape.radius * shape.radius) continue;
      const sample = sampleAt(x, z, true), {chunk, index} = sample;
      const before = unworkedHeight(x, z) + chunk.delta[index];
      const after = Math.max(target, Math.min(before, target));
      if (after >= before) continue;
      const removed = Math.min(before - after, Math.max(0, maxVolume - result.volume));
      if (removed <= 0) continue;
      chunk.delta[index] -= removed;
      const roll = hash(numericSeed, x, z);
      const depthStart = Math.max(0, unworkedHeight(x, z) - before);
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
    if (result.volume > 0) markChanged(shape);
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
    markChanged(shape);
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

  // The mesh sees both layers. Only work orders go through toSave().
  function drawingChunks() {
    const work = toSave().chunks;
    if (!siteGround) return work;
    const rows = new Map(work.map(row => [chunkKey(row.x, row.z), row]));
    for (const site of siteGround.toSave().chunks) {
      const key = chunkKey(site.x, site.z), row = rows.get(key);
      if (!row) { rows.set(key, site); continue; }
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        if (!row.delta[i]) row.material[i] = site.material[i];
        row.delta[i] += site.delta[i];
      }
    }
    return [...rows.values()];
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
    loadedRevision = ++revision;
  }

  return Object.freeze({seed:numericSeed, heightAt, materialAt, cut, fill, refusal, toSave, loadSave, drawingChunks, baseHeightAt,
    get siteGround() { return siteGround; },
    setSiteGround(layer) { siteGround = layer; loadedRevision = ++revision; },
    includeChunkAt(x, z) { sampleAt(x, z, true); },
    hasChunkAt(x, z) { return chunks.has(chunkKey(Math.floor(x / CHUNK_METRES), Math.floor(z / CHUNK_METRES))); },
    get revision() { return revision; },
    changedAlongSince(since, position, distance) {
      if (since < loadedRevision || revision - since > editHistory.length) return true;
      const dx = Math.sin(position.heading), dz = Math.cos(position.heading);
      for (let r = revision; r > since; r--) {
        const edit = editHistory[r % editHistory.length];
        if (!edit || edit.revision !== r) return true;
        const x = edit.x - position.x, z = edit.z - position.z;
        const along = clamp(x * dx + z * dz, 0, distance);
        if (Math.hypot(x - dx * along, z - dz * along) <= edit.radius + 4) return true;
      }
      return false;
    },
    get chunkCount() { return chunks.size; },
    get saveByteLength() { return chunks.size * SAMPLE_COUNT * 5 + chunks.size * 8 + 16; }});
}
