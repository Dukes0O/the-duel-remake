import * as THREE from 'three';
import {TOWN_CELL_METRES} from '../town-world-data.js';
import {townChunkLod} from './town-chunks.js';

// TOWN-VIEW-ART: the town's buildings, homes, sites and ruins are drawn from the art families (town-art.js). This file
// keeps what is drawn on the ground itself: road surfaces, painted zones, the pegs and string of a home plot not yet
// started, and the placement ghost.
const COLORS = Object.freeze({road:0x756b59, roadPlank:0x6b5945, roadPaved:0x595957, zone:0x89774e, ghostValid:0x56b56f, ghostInvalid:0xc94d42,
  peg:0x786748, string:0xc7b78e});

function roadColour(id) {
  return id?.startsWith('road-paved') ? COLORS.roadPaved : id?.startsWith('road-plank') ? COLORS.roadPlank : COLORS.road;
}

// A road is a slab 0.14 m thick lifted 0.08 m, so its top is 0.15 m above its ground (town-walkers.js keeps its
// people on that top, and town-art-plan.js stands street things on it).
function makeSlabs(rows, color, height = .14, lift = .08) {
  if (!rows.length) return null;
  const geometry = new THREE.BoxGeometry(TOWN_CELL_METRES, height, TOWN_CELL_METRES);
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({color, roughness:.95, metalness:.05}), rows.length);
  mesh.name = `Town ground ${color.toString(16)}`;
  mesh.receiveShadow = true;
  const pose = new THREE.Object3D();
  rows.forEach((row, index) => {
    pose.position.set((row.x + (row.width || 1) / 2) * TOWN_CELL_METRES, (row.groundY ?? 0) + lift, (row.z + (row.depth || 1) / 2) * TOWN_CELL_METRES);
    pose.scale.set(row.width || 1, 1, row.depth || 1); pose.updateMatrix(); mesh.setMatrixAt(index, pose.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.townItems = rows;
  return mesh;
}

function makePegs(plots) {
  if (!plots.length) return [];
  // Four pegs and four strings round each painted plot not yet started, 3.45 m from its middle.
  const corner = 3.45, wood = new THREE.MeshStandardMaterial({color:COLORS.peg, roughness:1}), string = new THREE.MeshBasicMaterial({color:COLORS.string});
  const pegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .08, .38, 5), wood, plots.length * 4);
  const lineGeometry = new THREE.CylinderGeometry(.018, .018, corner * 2, 5); lineGeometry.rotateZ(Math.PI / 2);
  const lines = new THREE.InstancedMesh(lineGeometry, string, plots.length * 4);
  pegs.name = 'Town plot pegs'; lines.name = 'Town plot string';
  const pose = new THREE.Object3D();
  plots.forEach((plot, index) => {
    const y = plot.groundY ?? 0, x = (plot.x + .5) * TOWN_CELL_METRES, z = (plot.z + .5) * TOWN_CELL_METRES;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz], k) => {
      pose.position.set(x + dx * corner, y + .19, z + dz * corner); pose.rotation.set(0, 0, 0); pose.updateMatrix(); pegs.setMatrixAt(index * 4 + k, pose.matrix);
    });
    [[0, -1, 0], [0, 1, 0], [-1, 0, Math.PI / 2], [1, 0, Math.PI / 2]].forEach(([dx, dz, turn], k) => {
      pose.position.set(x + dx * corner, y + .3, z + dz * corner); pose.rotation.set(0, turn, 0); pose.updateMatrix(); lines.setMatrixAt(index * 4 + k, pose.matrix);
    });
  });
  pegs.instanceMatrix.needsUpdate = lines.instanceMatrix.needsUpdate = true;
  pegs.userData.townItems = plots.flatMap(plot => [plot, plot, plot, plot]);
  lines.userData.townItems = pegs.userData.townItems;
  return [pegs, lines];
}

/** The ground-level drawing of one chunk: road surfaces by class, painted zones and the pegs of plots not yet started. */
export function buildTownChunkInstances(town, chunk, lod = townChunkLod({position:{x:chunk.x * 128, z:chunk.z * 128}}, chunk)) {
  void lod;
  const region = town.regions?.scablands;
  if (!region) return [];
  const inChunk = row => (row.regionId ?? 'scablands') === 'scablands' && Math.floor(row.x / 16) === chunk.x && Math.floor(row.z / 16) === chunk.z;
  const roads = new Map();
  for (const building of town.buildings || []) {
    if (!building.buildingId?.startsWith('road-') || !inChunk(building)) continue;
    const color = roadColour(building.buildingId);
    if (!roads.has(color)) roads.set(color, []);
    roads.get(color).push(building);
  }
  const zones = new Map();
  for (const zone of town.zones || []) if (inChunk(zone)) {
    const color = zone.color ?? COLORS.zone;
    if (!zones.has(color)) zones.set(color, []);
    zones.get(color).push({...zone, width:1, depth:1, groundY:zone.groundY ?? 0});
  }
  const meshes = [...[...roads].map(([color, rows]) => makeSlabs(rows, color)), ...[...zones].map(([color, rows]) => makeSlabs(rows, color, .04, .03))].filter(Boolean);
  const waiting = (town.homePlots || []).filter(plot => inChunk(plot) && !(plot.tier > 0) && !plot.household && !plot.burning && !plot.burnt);
  return [...meshes, ...makePegs(waiting)];
}

export function createTownPlacementGhost({valid = true, width = 1, depth = 1} = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width * TOWN_CELL_METRES * .85, 1.2, depth * TOWN_CELL_METRES * .85),
    new THREE.MeshBasicMaterial({color:valid ? COLORS.ghostValid : COLORS.ghostInvalid, transparent:true, opacity:.48}));
  mesh.name = valid ? 'Valid town placement' : 'Invalid town placement';
  mesh.userData.placementValid = valid;
  return mesh;
}

export const TOWN_INSTANCE_COLORS = COLORS;
