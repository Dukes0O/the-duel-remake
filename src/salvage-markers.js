import * as THREE from 'three';

// One crate per ambush camp. All pieces are shared instanced meshes; collecting
// a crate only changes the instance count and never creates scene objects.
export function createSalvageMarkers() {
  const group = new THREE.Group();
  group.name = 'On-foot ledge salvage';
  const pieces = [
    [new THREE.CylinderGeometry(1.4, 1.5, 1.35, 6),
      new THREE.MeshStandardMaterial({color: 0x675b4d, roughness: 1}),
      [0, .675, 0]],
    [new THREE.BoxGeometry(1.05, .74, .85),
      new THREE.MeshStandardMaterial({color: 0xd58a37, metalness: .32,
        roughness: .54, emissive: 0x462008}), [0, 1.67, 0]],
    [new THREE.BoxGeometry(.11, 2.4, .11),
      new THREE.MeshBasicMaterial({color: 0xffca54, toneMapped: false}),
      [0, 3.22, 0]],
  ];
  const meshes = pieces.map(([geometry, material], index) => {
    const mesh = new THREE.InstancedMesh(geometry, material, 3);
    mesh.name = `ledge-salvage-${index}`;
    mesh.frustumCulled = false;
    mesh.castShadow = index < 2;
    group.add(mesh);
    return mesh;
  });
  const transform = new THREE.Object3D();
  function update(duel) {
    const crates = duel.state.raids?.zones.map(zone => zone.salvage)
      .filter(crate => crate && !crate.collected) || [];
    group.visible = crates.length > 0;
    for (let slot = 0; slot < crates.length; slot++) {
      const crate = crates[slot];
      for (let part = 0; part < pieces.length; part++) {
        const [, , offset] = pieces[part];
        transform.position.set(crate.x + offset[0], crate.y + offset[1],
          crate.z + offset[2]);
        transform.rotation.set(0, 0, 0);
        transform.scale.set(1, 1, 1);
        transform.updateMatrix();
        meshes[part].setMatrixAt(slot, transform.matrix);
      }
    }
    for (const mesh of meshes) {
      mesh.count = crates.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  return {group, meshes, drawCallBudget: meshes.length, update,
    dispose() {
      group.removeFromParent();
      pieces.forEach(([geometry, material]) => {
        geometry.dispose();
        material.dispose();
      });
    }};
}
