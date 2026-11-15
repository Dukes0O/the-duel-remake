import * as THREE from 'three';

/** Add the mast and drill to the tracked machine used in the yard. */
export function createDrillView(model) {
  const root = model.clone(true);
  root.traverse(node => { if (node.name.replace(/[\[\].:\/]/g, '').toLowerCase() === 'trencherboom') node.visible = false; });
  const steel = new THREE.MeshStandardMaterial({color:0x61574a, roughness:0.85, metalness:0.2});
  const dark = new THREE.MeshStandardMaterial({color:0x34332f, roughness:0.8, metalness:0.3});
  const mast = new THREE.Group();
  mast.name = 'drill-mast';
  mast.position.set(0, 1.3, -1.2);
  root.add(mast);
  const beam = (x, y, z, width, height, depth, mat = steel) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    part.position.set(x, y, z); part.castShadow = true; mast.add(part); return part;
  };
  for (const x of [-0.45, 0.45]) beam(x, 2.2, 0, 0.14, 4.4, 0.18);
  for (let y = 0.3; y <= 4.2; y += 0.65) beam(0, y, 0, 0.95, 0.1, 0.18);
  const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 3.6, 10), dark);
  bit.name = 'drill-bit'; bit.position.set(0, 1.65, 0.25); bit.castShadow = true; mast.add(bit);
  return {root, update(rig, body) {
    const visibleMast = body.getObjectByName('drill-mast');
    const visibleBit = body.getObjectByName('drill-bit');
    visibleMast.rotation.x = rig.hole?.mastDown ? 0 : -Math.PI / 2.5;
    visibleBit.position.y = 1.65 - Math.min(1, rig.hole?.depth ?? 0);
  }};
}
