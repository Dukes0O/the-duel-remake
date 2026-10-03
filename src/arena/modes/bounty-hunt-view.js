import * as THREE from 'three';

// A real roof beacon follows the rendered car, including jumps and slides.
// This view reads the simulation; it never owns the mark or scoring clock.
export function createBountyHuntView() {
  const group = new THREE.Group();
  group.name = 'Bounty vehicle beacon';
  group.visible = false;
  group.matrixAutoUpdate = false;
  const geometry = new THREE.CylinderGeometry(.18, .46, 3.2, 12, 1, true);
  const material = new THREE.MeshBasicMaterial({color: 0xffb52e,
    transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false});
  const beam = new THREE.Mesh(geometry, material);
  beam.position.y = 1.6;
  const haloGeometry = new THREE.TorusGeometry(.75, .09, 6, 20);
  const haloMaterial = new THREE.MeshBasicMaterial({color: 0xffd773});
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.2;
  group.add(beam, halo);
  const offset = new THREE.Matrix4();
  let disposed = false;
  return {group,
    update(state, entries) {
      const bounty = state.arena?.mode === 'bounty-hunt' && state.arena.bountyHunt;
      const entry = bounty && !bounty.pendingVictimId &&
        entries.find(candidate => candidate.id === bounty.markedId);
      group.visible = !disposed && !!entry?.mesh?.visible && !entry.actor.combatWrecking;
      if (!group.visible) return;
      const mesh = entry.mesh;
      mesh.updateWorldMatrix(true, false);
      const roof = mesh.userData.vehicleSockets?.roof;
      offset.makeTranslation(roof?.position.x || 0,
        roof?.position.y ?? ((mesh.userData.size?.height || 1.35) + .08), roof?.position.z || 0);
      group.matrix.multiplyMatrices(mesh.matrixWorld, offset);
      group.matrixWorldNeedsUpdate = true;
      material.opacity = .5 + .15 * Math.sin(state.stageTimeSec * 6);
      group.userData.markedId = bounty.markedId;
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.visible = false; group.removeFromParent();
      geometry.dispose(); material.dispose(); haloGeometry.dispose(); haloMaterial.dispose();
    },
  };
}
