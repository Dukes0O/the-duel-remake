import {scablandsSurfaceHeightAt} from '../world/scablands-ground.js';

export const TOWN_CELL_METRES = 8;
export const TOWN_CHUNK_CELLS = 16;

const oval = Object.freeze({id:'dome-oval', type:'ellipse', x:0, z:0, halfWidth:112, halfDepth:80});
const gate = Object.freeze({id:'dome-gate', type:'rectangle', x:0, z:-92, halfWidth:24, halfDepth:12, heading:0});
const strip = (id, a, b, halfWidth=12) => Object.freeze({id,type:'strip',ax:a[0],az:a[1],bx:b[0],bz:b[1],halfWidth});
const oldRoads = Object.freeze([
  strip('old-road-gate-safe',[0,-104],[230,150]),
  strip('old-road-safe-barricade-2',[230,150],[410,210]),
  strip('old-road-barricade-boneyard',[410,210],[424,304]),
  strip('old-road-safe-boneyard',[230,150],[424,304]),
  strip('old-road-safe-tintown',[230,150],[600,0]),
  strip('old-road-safe-everburn',[230,150],[-424,304]),
  strip('old-road-mall-safe',[0,430],[230,150]),
  strip('old-road-bowl-gate',[0,-104],[-340,20]),
]);
export const SCABLANDS_TOWN_REGION = Object.freeze({
  id:'scablands', cellMetres:TOWN_CELL_METRES, chunkCells:TOWN_CHUNK_CELLS,
  groundHeightAt:scablandsSurfaceHeightAt,
  reservedShapes:Object.freeze([oval, gate,...oldRoads]),
});
export const TOWN_REGIONS = Object.freeze(new Map([[SCABLANDS_TOWN_REGION.id, SCABLANDS_TOWN_REGION]]));

function insideRectangle(cellX, cellZ, width, depth, shape) {
  const left = cellX * TOWN_CELL_METRES, top = cellZ * TOWN_CELL_METRES;
  const right = left + width * TOWN_CELL_METRES, bottom = top + depth * TOWN_CELL_METRES;
  const centerX = (left + right) / 2, centerZ = (top + bottom) / 2;
  if (shape.type === 'rectangle') return right > shape.x - shape.halfWidth && left < shape.x + shape.halfWidth && bottom > shape.z - shape.halfDepth && top < shape.z + shape.halfDepth;
  if (shape.type === 'ellipse') {
    // Scale the footprint rectangle to a unit circle, then test its nearest
    // point to the center. This catches narrow overlaps without a grid sample.
    const nearestX=Math.max((left-shape.x)/shape.halfWidth,Math.min(0,(right-shape.x)/shape.halfWidth));
    const nearestZ=Math.max((top-shape.z)/shape.halfDepth,Math.min(0,(bottom-shape.z)/shape.halfDepth));
    return nearestX*nearestX+nearestZ*nearestZ<=1;
  }
  if (shape.type === 'strip') {
    const px=(left+right)/2, pz=(top+bottom)/2, dx=shape.bx-shape.ax, dz=shape.bz-shape.az;
    const t=Math.max(0,Math.min(1,((px-shape.ax)*dx+(pz-shape.az)*dz)/(dx*dx+dz*dz)));
    const gap=Math.hypot(px-(shape.ax+t*dx),pz-(shape.az+t*dz));
    return gap<=shape.halfWidth+Math.hypot(right-left,bottom-top)/2;
  }
  throw new TypeError(`Unknown reserved shape: ${shape.type}.`);
}

export function cellIsReserved(regionId, cellX, cellZ, width=1, depth=1) {
  const region = TOWN_REGIONS.get(regionId);
  if (!region) return true;
  return region.reservedShapes.some(shape => insideRectangle(cellX, cellZ, width, depth, shape));
}

function floorDiv(value, divisor) { return Math.floor(value / divisor); }
function localCell(value, chunk) { return value - chunk * TOWN_CHUNK_CELLS; }

export function getTownChunk(regionState, cellX, cellZ, create=false) {
  if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellZ)) throw new TypeError('Town cells must use whole coordinates.');
  const chunkX = floorDiv(cellX,TOWN_CHUNK_CELLS), chunkZ = floorDiv(cellZ,TOWN_CHUNK_CELLS);
  const key = `${chunkX}:${chunkZ}`;
  let chunk = regionState.chunks[key];
  if (!chunk && create) chunk = regionState.chunks[key] = {x:chunkX,z:chunkZ,cells:{}};
  if (!chunk) return null;
  const localX = localCell(cellX,chunkX), localZ = localCell(cellZ,chunkZ);
  const cellKey = `${localX}:${localZ}`;
  let cell = chunk.cells[cellKey];
  if (!cell && create) cell = chunk.cells[cellKey] = {x:cellX,z:cellZ,buildingId:null};
  return cell ? {chunk,cell,key,cellKey,chunkKey:key} : null;
}

export function ensureTownRegion(town, regionId) {
  const region=TOWN_REGIONS.get(regionId);
  if(!region) return null;
  if(!town.regions) town.regions={};
  if(!town.regions[regionId]) town.regions[regionId]={chunks:{}};
  if(!town.regions[regionId].chunks) town.regions[regionId].chunks={};
  return town.regions[regionId];
}
