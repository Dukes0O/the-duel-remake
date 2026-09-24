import * as THREE from 'three';
import {crewAppearance} from './crew.js';

export const MAX_FIGHTER_FIGURES = 12;

const PARTS = Object.freeze({plates: 12, limbs: 8, joints: 5, lights: 2});
const UP = new THREE.Vector3(0, 1, 0);
const COLORS = Object.freeze({
  coat: 0xa44b34, vest: 0x383d3a, armor: 0x89877a, trousers: 0x38454c,
  boots: 0x242a2b, gloves: 0x756951, helmet: 0xc7b999, skin: 0xc8936e,
  pack: 0x594d3d, light: 0x8de8ee,
});

// Four reusable InstancedMeshes draw every body, including future CPU crews.
// +Z is forward and Y=0 is the fighter's feet, matching the fixed-step fighter.
export function createOnFootFigures({capacity = MAX_FIGHTER_FIGURES} = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_FIGHTER_FIGURES)
    throw new RangeError('Fighter figure capacity must be between 1 and 12.');
  const group = new THREE.Group();
  group.name = 'On-foot fighters';
  const geometries = {
    plates: new THREE.BoxGeometry(1, 1, 1),
    limbs: new THREE.CylinderGeometry(.5, .5, 1, 7),
    joints: new THREE.IcosahedronGeometry(.5, 1),
    lights: new THREE.BoxGeometry(1, 1, 1),
  };
  const materials = {
    plates: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .86, flatShading: true}),
    limbs: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .92, flatShading: true}),
    joints: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .66, metalness: .12, flatShading: true}),
    lights: new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false}),
  };
  const meshes = Object.fromEntries(Object.keys(PARTS).map(kind => {
    const mesh = new THREE.InstancedMesh(geometries[kind], materials[kind], capacity * PARTS[kind]);
    mesh.name = `fighter-${kind}`;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = kind !== 'lights';
    mesh.receiveShadow = kind !== 'lights';
    group.add(mesh);
    return [kind, mesh];
  }));
  const color = new THREE.Color();
  const colorParts = {
    plates: ['coat', 'vest', 'trousers', 'armor', 'pack', 'boots', 'boots',
      'gloves', 'gloves', 'armor', 'armor', 'pack'],
    limbs: ['coat', 'coat', 'coat', 'coat', 'trousers', 'trousers', 'trousers', 'trousers'],
    joints: ['skin', 'helmet', 'armor', 'armor', 'vest'],
    lights: ['accent', 'accent'],
  };
  const paintedCrew=[];
  function paint(actor,id){
    if(paintedCrew[actor]===id)return;
    const appearance=crewAppearance(id);
    for(const [kind,mesh] of Object.entries(meshes)){
      for(let index=0;index<PARTS[kind];index++){
        const key=colorParts[kind][index];
        color.setHex(appearance[key]??COLORS[key]??COLORS.light);
        mesh.setColorAt(actor*PARTS[kind]+index,color);
      }
      mesh.instanceColor.needsUpdate=true;
    }
    paintedCrew[actor]=id;
  }
  for (const [kind, mesh] of Object.entries(meshes)) {
    for (let actor = 0; actor < capacity; actor++) {
      for (let part = 0; part < PARTS[kind]; part++) {
        const shade = actor ? 1 - (actor % 4) * .055 : 1;
        color.setHex(COLORS[colorParts[kind][part]]).multiplyScalar(shade);
        mesh.setColorAt(actor * PARTS[kind] + part, color);
      }
    }
    mesh.instanceColor.needsUpdate = true;
  }

  const root = new THREE.Object3D(), part = new THREE.Object3D();
  const matrix = new THREE.Matrix4(), from = new THREE.Vector3(), to = new THREE.Vector3();
  const direction = new THREE.Vector3(), lastPositions = new WeakMap();
  const eye = new THREE.Vector3();
  let actorCount = 0, localFighter = null, disposed = false;
  for (const [kind, mesh] of Object.entries(meshes)) {
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      // The local figure remains available in a distant mirror or photo view.
      // The first-person eye is inside its helmet, so omit only its last slot
      // for a camera at the fighter's eye. No matrix upload is needed here.
      const hideLocal = localFighter && camera.position.distanceToSquared(
        eye.set(localFighter.x, localFighter.y + 1.62, localFighter.z)) < .7 ** 2;
      mesh.count = (actorCount - (hideLocal ? 1 : 0)) * PARTS[kind];
    };
  }

  function store(kind, actor, index) {
    part.updateMatrix();
    matrix.multiplyMatrices(root.matrix, part.matrix);
    meshes[kind].setMatrixAt(actor * PARTS[kind] + index, matrix);
  }
  function block(kind, actor, index, x, y, z, sx, sy, sz, rz = 0) {
    part.position.set(x, y, z);
    part.rotation.set(0, 0, rz);
    part.scale.set(sx, sy, sz);
    store(kind, actor, index);
  }
  function limb(actor, index, ax, ay, az, bx, by, bz, width) {
    from.set(ax, ay, az); to.set(bx, by, bz);
    direction.subVectors(to, from);
    const length = direction.length();
    part.position.copy(from).add(to).multiplyScalar(.5);
    part.quaternion.setFromUnitVectors(UP, direction.normalize());
    part.scale.set(width, length, width);
    store('limbs', actor, index);
  }
  function pose(fighter, actor) {
    const appearance=crewAppearance(fighter.crewId);
    const last = lastPositions.get(fighter);
    const distance = last ? Math.hypot(fighter.x - last.x, fighter.z - last.z) : 0;
    if (last) { last.x = fighter.x; last.z = fighter.z; }
    else lastPositions.set(fighter, {x: fighter.x, z: fighter.z});
    const down = !!fighter.knockedDown, airborne = !down && fighter.airHeight > .05;
    const gait = !down && !airborne && distance > .003
      ? Math.sin((fighter.steps || 0) * .11) * .17 : 0;
    root.position.set(fighter.x, fighter.y + (down ? .48 : 0), fighter.z);
    root.rotation.set(down ? -Math.PI / 2 : 0, fighter.yaw || 0, 0, 'YXZ');
    root.updateMatrix();

    block('plates', actor, 0, 0, 1.12, 0,
      .53*appearance.shoulder, .55, .29);
    block('plates', actor, 1, 0, 1.13, .17, .45, .42, .06);
    block('plates', actor, 2, 0, .76, 0, .41, .23, .28);
    block('plates', actor, 3, 0, .73, .02, .45, .09, .29);
    block('plates', actor, 4, 0, 1.08, -.23,
      .37*appearance.pack, .48*appearance.pack, .18);
    block('plates', actor, 9, -.2*appearance.shoulder, 1.16,
      .19, .075*appearance.shoulder, .43, .05, -.25);
    block('plates', actor, 10, .2*appearance.shoulder, 1.16,
      .19, .075*appearance.shoulder, .43, .05, .25);
    block('plates', actor, 11, .31, .62, -.05, .12, .26, .17);
    block('joints', actor, 0, 0, 1.56, .025, .39, .45, .36);
    block('joints', actor, 1, 0, appearance.hood?1.68:1.73,
      0, appearance.hood?.48:.43, appearance.hood?.30:.18,
      appearance.hood?.44:.39);
    block('joints', actor, 2, -.31, 1.36, 0, .27, .19, .31);
    block('joints', actor, 3, .31, 1.36, 0, .27, .19, .31);
    block('joints', actor, 4, 0, 1.38, 0, .21, .20, .20);
    block('lights', actor, 0, 0, 1.56, .22, .31, .095, .035);
    block('lights', actor, 1, 0, 1.08, .205, .07, .05, .025);

    for (const side of [-1, 1]) {
      const offset = side < 0 ? 0 : 2;
      const step = side * gait, lift = airborne ? .15 : 0;
      const handZ = -step * .9 + (airborne ? .16 : 0);
      const elbowZ = -step * .4 + (airborne ? .08 : 0);
      limb(actor, offset, side * .32, 1.32, 0,
        side * .41, 1.08 + lift * .4, elbowZ, .17);
      limb(actor, offset + 1, side * .41, 1.08 + lift * .4, elbowZ,
        side * .45, .84 + lift, handZ, .14);
      limb(actor, 4 + offset, side * .16, .68, 0,
        side * .17, .42 + lift, step * .3 + lift, .22);
      limb(actor, 5 + offset, side * .17, .42 + lift, step * .3 + lift,
        side * .18, .18 + lift, step + lift * .5, .18);
      const boxIndex = side < 0 ? 5 : 6;
      block('plates', actor, boxIndex, side * .18, .115 + lift,
        step + .11 + lift * .5, .24, .20, .36);
      block('plates', actor, boxIndex + 2, side * .45, .83 + lift,
        handZ, .15, .16, .16);
    }
  }

  function update(fighters = [], {active = false} = {}) {
    if (disposed) return 0;
    const valid = (Array.isArray(fighters) ? fighters : []).filter(entry => {
      const fighter = entry?.fighter || entry;
      return Number.isFinite(fighter?.x) && Number.isFinite(fighter?.y) &&
        Number.isFinite(fighter?.z) && Number.isFinite(fighter?.yaw);
    });
    const local = valid.find(entry => entry.local) || null;
    const ordered = valid.filter(entry => !entry.local).slice(0, capacity - (local ? 1 : 0));
    if (local) ordered.push(local);
    actorCount = active ? ordered.length : 0;
    localFighter = active ? local?.fighter || local : null;
    group.visible = actorCount > 0;
    for (const [kind, mesh] of Object.entries(meshes)) mesh.count = actorCount * PARTS[kind];
    if (!group.visible) return 0;
    ordered.forEach((entry, index) => {
      const fighter=entry.fighter||entry;
      paint(index,fighter.crewId||entry.crewId||'rook');
      pose(fighter,index);
    });
    for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
    return actorCount;
  }

  return {group, meshes, capacity, drawCallBudget: Object.keys(meshes).length, update,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent(); group.clear();
      Object.values(geometries).forEach(geometry => geometry.dispose());
      Object.values(materials).forEach(material => material.dispose());
    }};
}
