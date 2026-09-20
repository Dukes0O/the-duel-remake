import * as THREE from 'three';

// Refine the existing decorative crane positions, not Course's physical map.
// The complete assembly fits the former [-13.5,13.5] × [0,48] × [-45,25]
// local envelope. Two instanced draws per crane retain useful local culling.
export function addHarborCranes(world, course) {
  const poses = [];
  for (let s = 420; s < course.length; s += 680) {
    if (course.themeAt(s) === 'city') poses.push({ ...course.groundAt(s, 130), s });
  }
  if (!poses.length) return null;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const steel = new THREE.MeshStandardMaterial({ color: 0x3e5966, metalness: .7, roughness: .55 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffb93d, emissive: 0xf77722, emissiveIntensity: 1.8 });
  const parts = { steel: [], amber: [] }, object = new THREE.Object3D();
  const put = (kind, size, position, rotation) => {
    object.position.set(...position); object.scale.set(...size);
    object.quaternion.copy(rotation || new THREE.Quaternion()); object.updateMatrix();
    parts[kind].push(object.matrix.clone());
  };
  const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), axis = new THREE.Vector3(), q = new THREE.Quaternion();
  const beam = (from, to, thickness = .18) => {
    a.set(...from); b.set(...to); axis.subVectors(b, a);
    const length = axis.length(); q.setFromUnitVectors(up, axis.normalize());
    put('steel', [thickness, length, thickness], a.add(b).multiplyScalar(.5).toArray(), q);
  };
  // Preserve the six large forms of the original silhouette.
  for (const x of [-12, 12]) put('steel', [1.4, 45, 1.4], [x, 22.5, 0]);
  put('steel', [27, 2, 2], [0, 44, 0]);
  put('steel', [2, 2, 70], [0, 47, -10]);
  put('steel', [.15, 31, .15], [0, 31, -36]);
  put('amber', [2, .5, 2], [0, 15.5, -36]);
  // Cross-braced portal and open truss beneath the existing upper boom.
  for (const y of [11, 22, 33]) {
    beam([-11.2, y, 0], [11.2, y, 0], .22);
    beam([-11.2, y, -.24], [11.2, y + 10.4, -.24], .24);
    beam([11.2, y, .24], [-11.2, y + 10.4, .24], .24);
  }
  for (const x of [-.78, .78]) {
    beam([x, 42.7, -44.5], [x, 42.7, 24.5], .22);
    for (let i = 0; i < 10; i++) {
      const z = -44.5 + i * 6.9;
      beam([x, i % 2 ? 45.9 : 42.7, z], [x, i % 2 ? 42.7 : 45.9, z + 6.9], .16);
    }
  }
  // Paired hoist lines and spreader sit inside the old suspended-hook bounds.
  for (const x of [-.65, .65]) beam([x, 45.8, -36], [x, 15.8, -36], .065);
  put('steel', [3.1, .28, 1.4], [0, 16, -36]);
  // A compact glazed operator cab adds human scale. Opaque emissive panes
  // reuse the existing amber material: no textures, lights or transparency.
  put('steel', [3.2, 2.8, 3.5], [0, 40.7, -7]);
  for (const side of [-1, 1]) {
    put('amber', [.035, 1.42, 2.45], [side * 1.612, 41.05, -7]);
    put('steel', [.06, 1.5, .07], [side * 1.64, 41.05, -7]);
    put('amber', [.22, .22, .22], [side * .78, 47.76, -44.65]);
  }
  put('amber', [2.36, 1.42, .035], [0, 41.05, -8.762]);
  put('steel', [.07, 1.5, .06], [0, 41.05, -8.79]);
  put('steel', [3.35, .16, 3.65], [0, 42.17, -7]);

  const group = new THREE.Group(); group.name = 'Harbor working cranes';
  for (const pose of poses) {
    const crane = new THREE.Group(); crane.name = `Harbor crane ${pose.s}`;
    crane.position.set(pose.x, pose.y, pose.z); crane.rotation.y = pose.heading;
    for (const [kind, matrices] of Object.entries(parts)) {
      const mesh = new THREE.InstancedMesh(geometry, kind === 'steel' ? steel : amber, matrices.length);
      mesh.name = `Harbor crane ${kind}`;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      // The original steel and hook cast shadows; keep the same two material
      // passes rather than adding separate draws for each brace or lamp.
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.005); mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .005;
      crane.add(mesh);
    }
    crane.userData.harborCrane = { s: pose.s, offset: 130 };
    group.add(crane);
  }
  group.userData.harborCranes = { count: poses.length, draws: poses.length * 2, instances: poses.length * (parts.steel.length + parts.amber.length) };
  world.add(group); return group;
}
