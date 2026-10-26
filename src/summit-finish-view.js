// Finish-area presentation. The course and helicopter retain their own rules.
import * as THREE from 'three';
import {crowdTexture} from './stadium-crowd.js';
import {standCrowdGeometry} from './stand-crowd.js';
import {registerSceneSystem} from './scene-systems.js';
import {worldAtExtended} from './world-surfaces.js';
import {renderedGroundHeight} from './rendered-ground.js';
import {SUMMIT_PADS} from './ski/runs/summit-zones.js';

export function addSummitFinish(group, course) {
  if (!course.def.kitPlacements?.some(row => row.id === 'summit-finish')) return;
  const finish = new THREE.Group();
  finish.name = 'Summit finish area';
  const spectators = [];
  const coats = new THREE.MeshStandardMaterial({map:crowdTexture(), alphaTest:.55,
    side:THREE.DoubleSide, vertexColors:true, roughness:1, color:0xa8aaa9});
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? -1 : 1;
    const p = course.groundAt(course.length - 185 + i * 15, side * 12.1);
    const mesh = new THREE.Mesh(standCrowdGeometry({half:0, rows:[[0,.36]]}, i+41, 1), coats);
    mesh.name = 'Summit bundled spectator';
    mesh.scale.setScalar(1.12);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.heading + Math.PI - side * .4;
    mesh.userData.restY = p.y;
    spectators.push(mesh);
    finish.add(mesh);
  }
  // This snow-dusted parking surface sits on the shared graded ground.
  // Its surrounding slope is terrain, rather than an unsupported box edge.
  const p = worldAtExtended(course, course.length + 60);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(56,120,14,30),
    new THREE.MeshStandardMaterial({color:0xb6bec2, roughness:.96}));
  apron.name = 'Summit car park - 120 m clear terrace';
  apron.position.set(p.x,p.y+.015,p.z);
  apron.rotation.set(-Math.PI/2,0,p.heading);
  apron.receiveShadow = true;
  finish.add(apron);
  // Keep the established ski/rescue pad operational. The packed path links
  // its existing yard to the enlarged hut without moving a ski drop.
  const pad=course.nearest(SUMMIT_PADS.summit.x,SUMMIT_PADS.summit.z);
  const positions=[],indices=[];
  for(let i=0;i<=40;i++){
    const t=i/40,back=16+(course.length-pad.s-16)*t;
    const lateral=25+(pad.lateral-25)*t;
    for(const side of [-1,1]){
      const point=course.worldAt(course.length-back,lateral+side*1.25);
      const y=renderedGroundHeight(course,{...point,s:course.length-back,off:lateral+side*1.25},{requireSurface:true});
      positions.push(point.x,y+.045,point.z);
    }
    if(i){const a=i*2;indices.push(a-2,a-1,a,a,a-1,a+1);}
  }
  const pathGeometry=new THREE.BufferGeometry();
  pathGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  pathGeometry.setIndex(indices);pathGeometry.computeVertexNormals();
  const path=new THREE.Mesh(pathGeometry,new THREE.MeshStandardMaterial({color:0xa7b2b8,roughness:1,side:THREE.DoubleSide}));
  path.name='Packed path from summit helipad to finish hut';
  path.receiveShadow=true;finish.add(path);
  // Three practical lamps: one over the line and two on the snow fence.
  // No shadow maps or simulation state are needed for these light pools.
  for (const [back,off,height,power,reach] of [[0,0,6.8,190,42],[60,11,3.4,100,30],[150,-11,3.4,100,30]]) {
    const point=course.groundAt(course.length-back,off);
    const lamp=new THREE.PointLight(0xffcb8b,power,reach,2);
    lamp.name='Summit practical lamp';
    lamp.position.set(point.x,point.y+height,point.z);
    finish.add(lamp);
  }
  group.add(finish);
  registerSceneSystem(group, {animate(seconds) {
    spectators.forEach((mesh, i) => {
      mesh.rotation.z = Math.sin(seconds * 2.3 + i * 1.7) * .035;
      mesh.position.y = mesh.userData.restY + Math.max(0,Math.sin(seconds * 2 + i)) * .06;
    });
  }});
  return finish;
}
