import {TOWN_CELL_METRES, TOWN_CHUNK_CELLS} from '../town-world-data.js';

export const TOWN_CHUNK_METRES = TOWN_CELL_METRES * TOWN_CHUNK_CELLS;

export function visibleTownChunks(town, camera, {radius = 2} = {}) {
  const region = town?.regions?.scablands;
  if (!region?.chunks) return [];
  const cameraChunkX = Math.floor(camera.position.x / TOWN_CHUNK_METRES);
  const cameraChunkZ = Math.floor(camera.position.z / TOWN_CHUNK_METRES);
  const viewRadius = Math.max(radius, camera.userData?.townView?.zoom > 0.65 ? 8 : radius);
  const chunks = new Map(Object.values(region.chunks).map(chunk => [`${chunk.x}:${chunk.z}`, chunk]));
  for (let x=cameraChunkX-viewRadius; x<=cameraChunkX+viewRadius; x++) for (let z=cameraChunkZ-viewRadius; z<=cameraChunkZ+viewRadius; z++) {
    const key=`${x}:${z}`; if(!chunks.has(key)) chunks.set(key,{x,z,cells:{}});
  }
  return [...chunks.values()].filter(chunk => Math.abs(chunk.x - cameraChunkX) <= viewRadius && Math.abs(chunk.z - cameraChunkZ) <= viewRadius)
    .sort((a, b) => Math.hypot(a.x-cameraChunkX, a.z-cameraChunkZ) - Math.hypot(b.x-cameraChunkX, b.z-cameraChunkZ));
}

export function townChunkLod(camera, chunk) {
  const distance = Math.hypot(chunk.x * TOWN_CHUNK_METRES - camera.position.x, chunk.z * TOWN_CHUNK_METRES - camera.position.z);
  return distance < 180 ? 'near' : distance < 520 ? 'mid' : 'far';
}
