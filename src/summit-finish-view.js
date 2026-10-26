// Finish-area presentation. The course and helicopter retain their own rules.
import * as THREE from 'three';
import {crowdTexture} from './stadium-crowd.js';
import {standCrowdGeometry} from './stand-crowd.js';
import {registerSceneSystem} from './scene-systems.js';
import {worldAtExtended} from './world-surfaces.js';

export function addSummitFinish(group, course) {
  if (!course.def.kitPlacements?.some(row => row.id === 'summit-finish')) return;
  const finish = new THREE.Group();
  finish.name = 'Summit finish area';
  const spectators = [];
  const coats = new THREE.MeshStandardMaterial({map:crowdTexture(), alphaTest:.55,
    side:THREE.DoubleSide, vertexColors:true, roughness:1, color:0xa8aaa9});
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? -1 : 1;
    const p = course.groundAt(course.length - 185 + i * 12, side * 12.4);
    const mesh = new THREE.Mesh(standCrowdGeometry({half:0, rows:[[0,.36]]}, i+41, 1), coats);
    mesh.name = 'Summit bundled spectator';
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.heading - side * Math.PI / 2;
    mesh.userData.restY = p.y;
    spectators.push(mesh);
    finish.add(mesh);
  }
  // Round 1 visual apron: keep its extent explicit for the drive-through review.
  // The existing open-course race ends at the gantry; this adds no race distance.
  const p = worldAtExtended(course, course.length + 65);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(56,.18,150),
    new THREE.MeshStandardMaterial({color:0xadb7bc, roughness:1}));
  apron.name = 'Summit car park - 150 m clear apron';
  apron.position.set(p.x,p.y-.1,p.z);
  apron.rotation.y = p.heading;
  apron.receiveShadow = true;
  finish.add(apron);
  group.add(finish);
  registerSceneSystem(group, {animate(seconds) {
    spectators.forEach((mesh, i) => {
      mesh.rotation.z = Math.sin(seconds * 2.3 + i * 1.7) * .035;
      mesh.position.y = mesh.userData.restY + Math.max(0,Math.sin(seconds * 2 + i)) * .06;
    });
  }});
  return finish;
}
