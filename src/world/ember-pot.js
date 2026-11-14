// Cinder's ember pot and the two braziers (EVERBURN-REMAKE), drawn in code: no model files, no pictures, no lights.
// The pot rides on the back of the player's car in Hot Delivery. Its glow, its flame and the sparks it throws all follow the
// ember (src/world/jobs/ember-rule.js): bright when full, dull when low, dark at 0. Nothing here reads anything but the job's
// state and never changes it. The braziers stand at the two places a fresh scoop can be taken.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFlameMaterial, createGroundGlowMaterial, createSparks, createScrapWear, scrapNoise} from './scrap-look.js';

// Live coals: a flat disc whose bright spots follow the clock and whose heat follows `uHeat` (0 dark, 1 full).
function createCoalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uHeat: {value: 1}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;uniform float uHeat;varying vec2 vUv;
      void main(){
        vec2 p=vUv-.5;float edge=1.0-smoothstep(.36,.5,length(p));
        float a=texture2D(uNoise,vUv*1.6+vec2(uTime*.04,0.0)).r,b=texture2D(uNoise,vUv*3.1-vec2(0.0,uTime*.07)).g;
        // Uneven glow: hot spots that breathe, over dull red coals; at low heat only a few spots survive.
        float spots=smoothstep(.55-.35*uHeat,.85,a*.6+b*.5+.15*sin(uTime*3.0+a*9.0));
        vec3 colour=mix(vec3(.05,.015,.01),vec3(.62,.12,.02),clamp(uHeat*1.2,0.0,1.0)*(.35+.65*a));
        colour=mix(colour,vec3(1.0,.62,.16),spots*uHeat);
        colour=mix(colour,vec3(1.0,.9,.55),spots*smoothstep(.75,1.0,uHeat)*.5);
        gl_FragColor=vec4(colour*edge,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

const SOOT_IRON = () => new THREE.MeshStandardMaterial({color: 0x24201c, roughness: .88, metalness: .45, side: THREE.DoubleSide});
function disposeAll(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const material of [].concat(node.material || [])) materials.add(material); });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

// The pot: a squat iron pot, a thick rim, a bail handle and a bracket, as one piece of geometry. Metres, y up, +z the way the car faces.
function potGeometry() {
  const body = new THREE.LatheGeometry([[.0, 0], [.2, 0], [.3, .06], [.35, .2], [.34, .34], [.37, .37], [.37, .4], [.32, .4], [.31, .37]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const bracket = new THREE.BoxGeometry(.84, .05, .62); bracket.translate(0, -.03, 0);
  const rails = [-.3, .3].map(x => { const rail = new THREE.BoxGeometry(.06, .22, .62); rail.translate(x, .08, 0); return rail; });
  const bail = new THREE.TorusGeometry(.33, .022, 5, 14, Math.PI); bail.translate(0, .4, 0);
  return mergeGeometries([body, bracket, ...rails, bail], false);
}

// Where the pot stands on a car, from the car's own box (metres in the car's own frame): across its middle, at the back, on the deck.
function carBox(root) {
  root.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert(), box = new THREE.Box3(), part = new THREE.Box3(), matrix = new THREE.Matrix4();
  root.traverse(node => {
    if (!node.isMesh || !node.geometry) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    matrix.multiplyMatrices(inverse, node.matrixWorld);
    box.union(part.copy(node.geometry.boundingBox).applyMatrix4(matrix));
  });
  return box;
}

const FULL_SPARKS = 24;
export function createEmberPot() {
  const group = new THREE.Group(); group.name = "Cinder's ember pot"; group.visible = false;
  const wear = createScrapWear({paint: 1});
  const iron = wear.apply(SOOT_IRON());
  const pot = new THREE.Mesh(potGeometry(), iron); pot.name = 'Iron pot'; pot.castShadow = true; group.add(pot);
  const coalMaterial = createCoalMaterial(), coals = new THREE.Mesh(new THREE.CircleGeometry(.31, 16), coalMaterial);
  coals.name = 'Ember coals'; coals.rotation.x = -Math.PI / 2; coals.position.y = .34; group.add(coals);
  const flameMaterial = createFlameMaterial(), standing = new THREE.PlaneGeometry(1, 1); standing.translate(0, .5, 0);
  const flame = new THREE.Mesh(standing, flameMaterial); flame.name = 'Flame over the pot'; flame.position.y = .36; flame.renderOrder = 3; flame.frustumCulled = false;
  flame.onBeforeRender = () => { flameMaterial.uniforms.uSeed.value = .31; flameMaterial.uniformsNeedUpdate = true; };
  group.add(flame);
  const sparks = createSparks(FULL_SPARKS); sparks.name = 'Sparks from the pot'; sparks.visible = false; group.add(sparks);
  let burstUntil = 0, lastJolts = 0, lastSeconds = 0, mountedOn = null;
  const mounts = new WeakMap();
  return {
    group,
    // Stands the pot on the back of `car` (the player's car group), or takes it off when `view` is null.
    // `view` is {ember, max, out, rate, jolts} from the job's step state; `seconds` is the scene clock.
    update(car, view, seconds) {
      if (!view || !car) { this.detach(); return; }
      if (mountedOn !== car) {
        this.detach();
        if (!mounts.has(car)) {
          const box = carBox(car);
          mounts.set(car, {x: 0, y: box.min.y + (box.max.y - box.min.y) * .52, z: box.min.z + .16});
        }
        const at = mounts.get(car); group.position.set(at.x, at.y, at.z);
        car.add(group); mountedOn = car;
      }
      group.visible = true;
      const heat = Math.max(0, Math.min(1, view.ember / view.max));
      if (view.jolts !== lastJolts) { if (view.jolts > lastJolts) burstUntil = seconds + .7; lastJolts = view.jolts; }
      const bursting = seconds < burstUntil && !view.out, rate = view.out ? 0 : view.rate;
      coalMaterial.uniforms.uTime.value = seconds; coalMaterial.uniforms.uHeat.value = view.out ? 0 : heat;
      flameMaterial.uniforms.uTime.value = seconds;
      // The flame stands only while the pot has fire in it, and gutters low as the ember falls.
      flame.visible = !view.out && heat > .04;
      const lick = (.14 + .5 * heat) * (.85 + .25 * Math.abs(Math.sin(seconds * 6.1)));
      flame.scale.set(.42 + .28 * heat, lick, 1);
      // Sparks fly while the pot is losing more than 1 a second, and in a burst at a hit.
      const showing = bursting ? FULL_SPARKS : rate > 1 ? Math.min(FULL_SPARKS, Math.ceil(6 + rate * 2)) : 0;
      sparks.visible = showing > 0;
      if (showing > 0) {
        sparks.geometry.setDrawRange(0, showing);
        sparks.userData.place(seconds, {x: 0, y: .42, z: 0}, {x: 0, z: -1}, 3);
      }
      lastSeconds = seconds;
      wear.follow(group);
    },
    detach() { if (mountedOn) { mountedOn.remove(group); mountedOn = null; } group.visible = false; },
    dispose() { this.detach(); disposeAll(group); },
  };
}

// The spot for a brazier beside a scoop place: `offset` metres to the left of the line from the place toward `toward`.
export function brazierSpot(place, toward, offset = 9) {
  const dx = toward.x - place.x, dz = toward.z - place.z, length = Math.hypot(dx, dz) || 1;
  return {x: place.x + dz / length * offset, z: place.z - dx / length * offset};
}

// A brazier: an iron bowl on three legs with live coals and a tall flame, firelight on the ground and sparks.
function bowlGeometry() {
  const bowl = new THREE.LatheGeometry([[0, .86], [.3, .82], [.55, .98], [.62, 1.12], [.56, 1.12], [.5, .98], [.28, .9], [0, .9]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const legs = [0, 1, 2].map(i => {
    const angle = i * Math.PI * 2 / 3, leg = new THREE.CylinderGeometry(.045, .07, 1.0, 5);
    leg.rotateZ(.22); leg.translate(.18, .5, 0); leg.rotateY(angle); return leg;
  });
  const ring = new THREE.TorusGeometry(.3, .035, 4, 10); ring.rotateX(Math.PI / 2); ring.translate(0, .45, 0);
  return mergeGeometries([bowl, ...legs, ring], false);
}

export function createBraziers(count = 2) {
  const group = new THREE.Group(); group.name = 'Braziers at the scoop places'; group.visible = false;
  const wear = createScrapWear({paint: 1}), iron = wear.apply(SOOT_IRON());
  const bowls = bowlGeometry(), card = new THREE.PlaneGeometry(1, 1), standing = new THREE.PlaneGeometry(1, 1); standing.translate(0, .5, 0);
  const flameMaterial = createFlameMaterial(), glowMaterial = createGroundGlowMaterial(), coalMaterial = createCoalMaterial();
  const coalDisc = new THREE.CircleGeometry(.5, 14);
  const stands = [];
  for (let index = 0; index < count; index++) {
    const stand = new THREE.Group(); stand.name = 'Brazier';
    const bowl = new THREE.Mesh(bowls, iron); bowl.castShadow = true; stand.add(bowl);
    const coals = new THREE.Mesh(coalDisc, coalMaterial); coals.rotation.x = -Math.PI / 2; coals.position.y = 1.07; stand.add(coals);
    const flame = new THREE.Mesh(standing, flameMaterial); flame.position.y = 1.1; flame.scale.set(2.6, 3.2, 1); flame.renderOrder = 3; flame.frustumCulled = false;
    flame.onBeforeRender = () => { flameMaterial.uniforms.uSeed.value = index * .47; flameMaterial.uniformsNeedUpdate = true; };
    stand.add(flame);
    const glow = new THREE.Mesh(card, glowMaterial); glow.rotation.x = -Math.PI / 2; glow.position.y = .14; glow.scale.setScalar(13); glow.renderOrder = 1; stand.add(glow);
    const sparks = createSparks(18); sparks.name = 'Sparks from the brazier'; stand.add(sparks);
    group.add(stand); stands.push({stand, flame, sparks});
  }
  return {
    group,
    // `spots` are {x, y, z} in world metres, one for each brazier.
    place(spots) { stands.forEach((entry, index) => { const spot = spots[index]; entry.stand.visible = !!spot; if (spot) entry.stand.position.set(spot.x, spot.y, spot.z); }); },
    dispose() { disposeAll(group); },
    animate(seconds) {
      if (!group.visible) return;
      flameMaterial.uniforms.uTime.value = seconds; glowMaterial.uniforms.uTime.value = seconds; coalMaterial.uniforms.uTime.value = seconds; coalMaterial.uniforms.uHeat.value = 1;
      stands.forEach((entry, index) => {
        entry.flame.scale.y = 3.2 * (.86 + .2 * Math.abs(Math.sin(seconds * 4.7 + index * 2.1)));
        entry.sparks.userData.place(seconds + index * .37, {x: 0, y: 1.3, z: 0}, {x: .3, z: .2}, 1);
      });
      wear.follow(group);
    },
  };
}
