import * as THREE from 'three';

// Three roadside warning posts share four draw calls. Their matrices are set
// once per stage; the renderer only reads the simulation's flagged raid data.
export function createRaiderMarkers() {
  const group = new THREE.Group();
  group.name = 'Roadside ambush warnings';
  const capacity = 3;
  const pieces = [
    [new THREE.CylinderGeometry(.07, .09, 3.1, 6),
      new THREE.MeshStandardMaterial({color: 0x292d2e, metalness: .65}),
      [0, 1.55, 0], 0],
    [new THREE.BoxGeometry(1.65, 1.65, .15),
      new THREE.MeshStandardMaterial({color: 0xf29e28, emissive: 0x58200a,
        metalness: .18, roughness: .58, side: THREE.DoubleSide}),
      [0, 2.95, 0], Math.PI / 4],
    [new THREE.BoxGeometry(.19, .74, .035),
      new THREE.MeshBasicMaterial({color: 0x241a16}),
      [0, 3.06, .16], 0],
    [new THREE.SphereGeometry(.13, 8, 6),
      new THREE.MeshBasicMaterial({color: 0xb5220c}),
      [0, 2.51, .16], 0],
  ];
  const meshes = pieces.map(([geometry, material], index) => {
    const mesh = new THREE.InstancedMesh(geometry, material,
      index < 2 ? capacity : capacity * 2);
    mesh.name = `raid-warning-${index}`;
    mesh.frustumCulled = false;
    mesh.castShadow = index < 2;
    group.add(mesh);
    return mesh;
  });
  const root = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4();
  let previousZones = null;
  function update(duel) {
    const zones = duel.state.raids?.zones || null;
    group.visible = !!zones;
    if (!zones || zones === previousZones) return;
    previousZones = zones;
    zones.slice(0, capacity).forEach((zone, slot) => {
      const warning = zone.warning;
      root.position.set(warning.x, warning.y, warning.z);
      root.rotation.set(0, warning.heading, 0);
      root.updateMatrix();
      pieces.forEach(([, , offset, tilt], index) => {
        for (let face = 0; face < (index < 2 ? 1 : 2); face++) {
          part.position.set(offset[0], offset[1], face ? -offset[2] : offset[2]);
          part.rotation.set(0, 0, tilt);
          part.updateMatrix();
          matrix.multiplyMatrices(root.matrix, part.matrix);
          meshes[index].setMatrixAt(index < 2 ? slot : slot * 2 + face, matrix);
        }
      });
    });
    meshes.forEach((mesh, index) => {
      mesh.count = Math.min(capacity, zones.length) * (index < 2 ? 1 : 2);
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
  return {group, meshes, drawCallBudget: meshes.length, update,
    dispose() {
      group.removeFromParent();
      pieces.forEach(([geometry, material]) => {geometry.dispose(); material.dispose();});
    }};
}
