// Plain lamps for Claude to redraw. Presentation reads the job, never steps it.
import * as THREE from 'three';
import {BRAND_RULE} from './jobs/brand-rule.js';

export function createBrandLamps() {
  const group = new THREE.Group();
  group.name = 'Light the Town lamps';
  group.visible = false;
  const lamps = [];
  let places = null;
  const iron = new THREE.MeshStandardMaterial({color: 0x514b42, roughness: 1});
  const postShape = new THREE.CylinderGeometry(BRAND_RULE.postRadius, BRAND_RULE.postRadius,
    BRAND_RULE.postHeight, 8);
  const boxShape = new THREE.BoxGeometry(BRAND_RULE.lanternWidth, BRAND_RULE.lanternHeight,
    BRAND_RULE.lanternWidth);
  function clear() {
    for (const lamp of lamps) lamp.glass.dispose();
    lamps.length = 0;
    group.clear();
  }
  return {group,
    update(worldJob) {
      const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
      group.visible = step?.brand === true;
      if (!group.visible) return;
      if (places !== step.places) {
        clear();
        places = step.places;
        for (const place of places ?? []) {
          const lamp = new THREE.Group();
          lamp.name = `Town lamp: ${place.id}`;
          lamp.position.set(place.position.x, place.position.y, place.position.z);
          const post = new THREE.Mesh(postShape, iron);
          post.position.y = BRAND_RULE.postHeight / 2;
          post.castShadow = true;
          lamp.add(post);
          const glass = new THREE.MeshStandardMaterial({color: 0x514739, roughness: .6,
            emissive: 0xffa13b, emissiveIntensity: 0});
          const box = new THREE.Mesh(boxShape, glass);
          box.position.y = BRAND_RULE.postHeight;
          lamp.add(box);
          const glow = new THREE.PointLight(0xffb455, 0, BRAND_RULE.lanternLightRadius);
          glow.position.y = BRAND_RULE.postHeight;
          lamp.add(glow);
          group.add(lamp);
          lamps.push({id: place.id, glass, glow});
        }
      }
      for (const lamp of lamps) {
        const lit = worldJob.job.stepState.lamps?.[lamp.id] === true;
        lamp.glass.emissiveIntensity = lit ? 2 : 0;
        lamp.glow.intensity = lit ? 10 : 0;
      }
    },
    dispose() { clear(); postShape.dispose(); boxShape.dispose(); iron.dispose(); },
  };
}
