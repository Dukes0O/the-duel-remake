// The three lamps of "Light the Town" (EVERBURN-REMAKE, job 2), each the town lamp drawn by src/world/town-lamp-look.js
// with a light of its own for the ground and walls around it. Presentation reads the job, never steps it.
import * as THREE from 'three';
import {GAS_LOAD_RULE} from './jobs/gas-load-rule.js';
import {BRAND_RULE} from './jobs/brand-rule.js';
import {createTownLamp} from './town-lamp-look.js';

// `surface` is the scrap surface the scene already has (or a function that answers it), so that three lamps do not
// make three pictures of their own.
export function createBrandLamps({surface = null} = {}) {
  const group = new THREE.Group();
  group.name = 'Light the Town lamps';
  group.visible = false;
  const lamps = [];
  let places = null, seconds = 0;
  function clear() {
    for (const lamp of lamps) lamp.look.dispose();
    lamps.length = 0;
    group.clear();
  }
  return {group,
    update(worldJob) {
      const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
      group.visible = step?.brand === true || step?.gasLoad === true;
      if (!group.visible) return;
      const sites = step.gasLoad ? step.gasLamps : step.places;
      if (places !== sites) {
        clear();
        places = sites;
        (places ?? []).forEach((place, index) => {
          const lamp = new THREE.Group();
          lamp.name = `Town lamp: ${place.id}`;
          lamp.position.set(place.position.x, place.position.y, place.position.z);
          // Each lamp's arm points a different way, as lamps put up by hand over the years would.
          const turn = index * 2.1 + .4;
          const look = createTownLamp({seed: index + 1, surface: typeof surface === 'function' ? surface() : surface});
          look.group.rotation.y = turn;
          lamp.add(look.group);
          const glow = new THREE.PointLight(0xffa64a, 0, BRAND_RULE.lanternLightRadius);
          glow.position.set(look.lantern.x * Math.cos(turn) + look.lantern.z * Math.sin(turn), look.lantern.y,
            look.lantern.z * Math.cos(turn) - look.lantern.x * Math.sin(turn));
          lamp.add(glow);
          group.add(lamp);
          lamps.push({id: place.id, look, glow, lit: false});
        });
      }
      for (const lamp of lamps) {
        lamp.lit = step.gasLoad || worldJob.job.stepState.lamps?.[lamp.id] === true;
        lamp.brightness = step.gasLoad ? GAS_LOAD_RULE.lampBeforeGasShare + (1 - GAS_LOAD_RULE.lampBeforeGasShare) * (worldJob.forgeGasShare ?? 0) : 1;
        lamp.look.setLit(lamp.lit, seconds, lamp.brightness);
        lamp.glow.intensity = lamp.lit ? 10 * lamp.brightness : 0;
      }
    },
    // The scene's own clock: the flame's flicker and the half second a lamp takes to come up.
    animate(now) {
      seconds = now;
      if (group.visible) for (const lamp of lamps) lamp.look.setLit(lamp.lit, now, lamp.brightness);
    },
    dispose() { clear(); },
  };
}
