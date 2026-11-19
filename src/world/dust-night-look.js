// How the night storm looks (SHIPS-DECKS): thick dust closing the fog in, dust blowing past the player, and the lighthouse beam
// sweeping over it all, the one thing that shows through, so the player can steer by it. Drawing only: it reads the step's
// weather through src/world/dust-night.js and its own clock, and never writes to the game's state.
import * as THREE from 'three';
import {DUST_NIGHT, beamHeading} from './dust-night.js';
import {makeRng} from '../rng.js';

const DUST_FOG = new THREE.Color(DUST_NIGHT.fogColor);

// Called each frame after the light of day is set: the dust brings the fog in close and turns it the colour of the storm.
export function applyDustNightFog(scene, weather, dt) {
  if (!weather || !scene?.fog) return false;
  scene.fog.near = Math.min(scene.fog.near, weather.fogNear);
  scene.fog.far = Math.min(scene.fog.far, weather.fogFar);
  scene.fog.color.lerp(DUST_FOG, 1 - Math.exp(-Math.max(0, dt) * 1.5));
  return true;
}

export function createDustNightLook(weather = DUST_NIGHT) {
  const group = new THREE.Group();
  group.name = 'Night storm';
  group.visible = false;
  const resources = [];
  const keep = item => { resources.push(item); return item; };

  // The beam: a long open cone from the lamp, bright at the lamp and fading to nothing at its far end. It is not fogged, because
  // a real beam lights the dust it passes through; that is how it reads in a storm.
  // Narrow at the lamp (its foot, at the origin once moved) and 52 m across at its far end, laid along +z.
  const beamGeometry = keep(new THREE.CylinderGeometry(26, .5, weather.beamLength, 24, 8, true));
  beamGeometry.translate(0, weather.beamLength / 2, 0);
  beamGeometry.rotateX(Math.PI / 2);
  const along = beamGeometry.attributes.position, shade = [];
  for (let i = 0; i < along.count; i++) {
    const share = THREE.MathUtils.clamp(along.getZ(i) / weather.beamLength, 0, 1), fade = (1 - share) ** 1.6;
    shade.push(fade, fade * .94, fade * .78);
  }
  beamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  const beamMaterial = keep(new THREE.MeshBasicMaterial({color: 0xfff1c8, vertexColors: true, transparent: true, opacity: .22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false}));
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);
  beam.name = 'Lighthouse beam';
  beam.frustumCulled = false;
  const lamp = new THREE.Group();
  lamp.name = 'Lighthouse lamp';
  lamp.position.set(weather.lamp.x, weather.lamp.y, weather.lamp.z);
  // The beam dips a little toward the ground as it goes, as the light of a lighthouse on a low shore does.
  beam.rotation.x = .035;
  const turning = new THREE.Group();
  turning.add(beam);
  const glow = new THREE.Mesh(keep(new THREE.SphereGeometry(1.1, 16, 10)),
    keep(new THREE.MeshBasicMaterial({color: 0xfff6dc, fog: false})));
  glow.name = 'Lamp glow';
  lamp.add(turning, glow);
  group.add(lamp);

  // The dust: points in a box that travels with the player, blown downwind and wrapping round, the same pattern every night.
  const rng = makeRng(7177), base = new Float32Array(weather.dustCount * 3);
  for (let i = 0; i < base.length; i++) base[i] = rng.float() * weather.dustBox;
  const dustGeometry = keep(new THREE.BufferGeometry());
  const dustPositions = new Float32Array(base.length);
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, keep(new THREE.PointsMaterial({color: 0x8d6d4e, size: .14, transparent: true,
    opacity: .6, depthWrite: false, sizeAttenuation: true})));
  dust.name = 'Blowing dust';
  dust.frustumCulled = false;
  group.add(dust);

  const wrap = value => value - Math.floor(value / weather.dustBox) * weather.dustBox - weather.dustBox / 2;
  return {
    group,
    // `here` is the player's {x, y, z} in the world; `seconds` the view's clock.
    update(active, seconds, here) {
      group.visible = !!active;
      if (!active) return;
      turning.rotation.y = beamHeading(seconds, weather);
      const driftX = weather.windX * seconds, driftZ = weather.windZ * seconds, fall = -.6 * seconds;
      for (let i = 0; i < base.length; i += 3) {
        dustPositions[i] = wrap(base[i] + driftX);
        dustPositions[i + 1] = wrap(base[i + 1] + fall) * .35;
        dustPositions[i + 2] = wrap(base[i + 2] + driftZ);
      }
      dustGeometry.attributes.position.needsUpdate = true;
      dust.position.set(here?.x ?? 0, (here?.y ?? 0) + 2, here?.z ?? 0);
    },
    dispose() {
      group.removeFromParent();
      for (const item of resources) item.dispose?.();
    },
  };
}
