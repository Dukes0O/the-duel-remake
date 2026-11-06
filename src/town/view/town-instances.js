import * as THREE from 'three';
import {TOWN_CELL_METRES} from '../town-world-data.js';
import {townChunkLod} from './town-chunks.js';

const COLORS = Object.freeze({road:0x756b59, roadPlank:0x6b5945, roadPaved:0x595957, zone:0x89774e, plan:0x957d59, foundation:0x796954, frame:0x6d5140, finished:0x706b5d, ruined:0x443b33, ghostValid:0x56b56f, ghostInvalid:0xc94d42, pipe:0x377e9d, sewer:0x775343, wire:0xd5b754});
const ROAD_CLASS = id => id?.includes('paved') ? 'paved' : id?.includes('plank') ? 'plank' : 'dirt';

function boxFor(building, lod) {
  if (lod === 'far') return new THREE.BoxGeometry(1, 1, 1);
  const wide = Math.max(1, building.width || 1), deep = Math.max(1, building.depth || 1);
  const proportion = building.buildingId?.includes('tower') || building.buildingId?.includes('mast') ? 1.75 : 1;
  return new THREE.BoxGeometry(wide * TOWN_CELL_METRES * 0.72, proportion * (lod === 'near' ? 9 : 6), deep * TOWN_CELL_METRES * 0.72);
}

function makeInstances(rows, lod, color, yOffset = 0) {
  if (!rows.length) return null;
  const isRoad=rows[0].buildingId?.startsWith('road-'), geometry=isRoad
    ? new THREE.BoxGeometry((rows[0].width||1)*TOWN_CELL_METRES,.14,(rows[0].depth||1)*TOWN_CELL_METRES)
    : boxFor(rows[0], lod);
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({color, roughness:0.92, metalness:color === COLORS.wire ? 0.48 : 0.12}), rows.length);
  mesh.name = `Town ${color.toString(16)} ${lod}`;
  const pose = new THREE.Object3D();
  rows.forEach((row, index) => {
    const centerX = (row.x + (row.width || 1) / 2) * TOWN_CELL_METRES;
    const centerZ = (row.z + (row.depth || 1) / 2) * TOWN_CELL_METRES;
    pose.position.set(centerX, (row.groundY ?? 0) + yOffset + (row.height || 0) / 2, centerZ);
    pose.scale.set((row.width || 1) / Math.max(1, rows[0].width || 1), row.height ? row.height / (lod === 'far' ? 1 : 9) : 1, (row.depth || 1) / Math.max(1, rows[0].depth || 1));
    pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
    mesh.setColorAt(index, new THREE.Color(row.color ?? color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.townItems = rows;
  return mesh;
}

export function buildTownChunkInstances(town, chunk, lod = townChunkLod({position:{x:chunk.x*128,z:chunk.z*128}}, chunk)) {
  const region = town.regions?.scablands;
  if (!region) return [];
  const rows = [];
  for (const building of town.buildings || []) {
    if (building.regionId !== 'scablands' || Math.floor(building.x / 16) !== chunk.x || Math.floor(building.z / 16) !== chunk.z) continue;
    const state = building.state || 'plan';
    const color = building.buildingId?.startsWith('road-paved') ? COLORS.roadPaved : building.buildingId?.startsWith('road-plank') ? COLORS.roadPlank : building.buildingId?.startsWith('road-') ? COLORS.road : building.buildingId?.startsWith('pipe-') ? COLORS.pipe : building.buildingId?.startsWith('sewer-') ? COLORS.sewer : building.buildingId?.startsWith('wire-') ? COLORS.wire : COLORS[state] ?? COLORS.finished;
    const isSite = ['plan','foundation','frame'].includes(state);
    rows.push({...building, color, height:isSite ? (state === 'frame' ? 6 : 1.5) : undefined});
  }
  const byColor = new Map();
  for (const row of rows) {
    const key = row.color; if (!byColor.has(key)) byColor.set(key, []); byColor.get(key).push(row);
  }
  for(const zone of town.zones||[]) if(zone.regionId==='scablands'&&Math.floor(zone.x/16)===chunk.x&&Math.floor(zone.z/16)===chunk.z) {
    const color=zone.color??COLORS.zone;if(!byColor.has(color))byColor.set(color,[]);byColor.get(color).push({...zone,width:1,depth:1,groundY:zone.groundY??0,color});
  }
  return [...byColor].map(([color, entries]) => makeInstances(entries, lod, color, entries[0].buildingId?.startsWith('road-') ? 0.08 : 0)).filter(Boolean);
}

export function createTownPlacementGhost({valid = true, width = 1, depth = 1} = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width*TOWN_CELL_METRES*0.85, 1.2, depth*TOWN_CELL_METRES*0.85), new THREE.MeshBasicMaterial({color:valid?COLORS.ghostValid:COLORS.ghostInvalid, transparent:true, opacity:0.48}));
  mesh.name = valid ? 'Valid town placement' : 'Invalid town placement';
  mesh.userData.placementValid = valid;
  return mesh;
}

export const TOWN_INSTANCE_COLORS = COLORS;
