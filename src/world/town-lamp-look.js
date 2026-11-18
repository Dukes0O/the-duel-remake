// A lamp of Tin Town (EVERBURN-REMAKE, job 2 "Light the Town"), drawn in code from the scrap kit: a pipe set in a
// concrete-filled tyre, a bent arm, and a lantern hung from it that was a headlamp shell with four panes wired round
// it. Dark, its panes are sooted. Lit, a flame stands inside, the panes glow and a pool of light lies on the ground.
// Nothing here changes a rule: `setLit` only changes how the lamp is drawn.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, scrapSteel, yardSurface, yardSheetPicture} from './scablands-yard-look.js';
import {createFlameMaterial, createGroundGlowMaterial} from './scrap-look.js';

export const TOWN_LAMP = Object.freeze({
  postHeight: 3.3, postRadius: .055, armReach: .75, lanternDrop: .42,
  lantern: Object.freeze({half: .15, tall: .38}),
  footRadius: .24, footHeight: .22,
  poolRadius: 9, flameWide: .2, flameTall: .34,
});

// Everything of the lamp that is iron, about the foot of the post at (0, 0, 0), the arm reaching along +x.
export function townLampShape(seed = 0) {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0), L = TOWN_LAMP, steel = (a, dark = 1) => scrapSteel(a + seed, seed * 1.3, dark);
  // The foot: a tyre laid flat and filled with concrete, with the post standing a little out of true.
  const tyre = new THREE.CylinderGeometry(L.footRadius, L.footRadius * 1.04, L.footHeight, 14); tyre.translate(0, L.footHeight / 2, 0);
  f.add(tyre, 0x1b1a19);
  const fill = new THREE.CylinderGeometry(L.footRadius * .68, L.footRadius * .68, L.footHeight + .02, 10); fill.translate(0, L.footHeight / 2 + .012, 0);
  f.add(fill, 0x6f6a61);
  const lean = .03 * Math.sin(seed * 7.1 + 1), top = [lean * L.postHeight, L.postHeight, lean * .6 * L.postHeight];
  const post = new THREE.CylinderGeometry(L.postRadius * .9, L.postRadius, L.postHeight, 8);
  post.translate(0, L.postHeight / 2, 0); post.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, lean, lean * .6, 0, 0));
  f.add(post, steel(1, .8));
  // Two welded collars where lengths of pipe were joined, and a rung to climb to the lantern.
  for (const y of [1.15, 2.3]) {
    const collar = new THREE.CylinderGeometry(L.postRadius * 1.5, L.postRadius * 1.5, .07, 8); collar.translate(lean * y, y, lean * .6 * y);
    f.add(collar, steel(y, .65));
  }
  f.strut([lean * 1.7 - .16, 1.7, lean], [lean * 1.7 + .16, 1.7, lean], .03, steel(3, .7));
  // The arm: up and out, with a stay under it.
  const out = [top[0] + L.armReach, L.postHeight + .12, top[2]];
  f.strut(top, out, .045, steel(4, .8));
  f.strut([top[0], L.postHeight - .5, top[2]], [top[0] + L.armReach * .62, L.postHeight + .07, top[2]], .028, steel(5, .7));
  // The lantern hangs from a hook of wire.
  const hang = [out[0], out[1] - L.lanternDrop + L.lantern.tall, out[2]];
  f.strut(out, hang, .014, 0x2a2623);
  const {half, tall} = L.lantern, y0 = hang[1] - tall, x0 = out[0], z0 = out[2];
  // Its cap, a dished headlamp shell, and its tray.
  const cap = new THREE.ConeGeometry(half * 1.75, .14, 8); cap.translate(x0, hang[1] + .04, z0);
  f.add(cap, steel(6, .6));
  f.box(half * 2.3, .035, half * 2.3, x0, y0 - .017, z0, steel(7, .55));
  // Four corner rods of the cage.
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
    f.strut([x0 + sx * half, y0, z0 + sz * half], [x0 + sx * half, hang[1], z0 + sz * half], .018, steel(8 + sx + sz * 2, .6));
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  // Where the lantern's middle is, for the panes, the flame and the light.
  merged.userData.lantern = {x: x0, y: y0 + tall / 2, z: z0};
  return merged;
}

// The four panes: sooted glass that glows from inside when the lamp is lit. `uLit` runs 0 to 1.
function createPaneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {uLit: {value: 0}, uTime: {value: 0}, uSeed: {value: 0}},
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uLit;uniform float uTime;uniform float uSeed;varying vec2 vUv;
      void main(){
        // Soot gathers at the top of each pane and in its corners.
        vec2 p=(vUv-.5)*2.0;
        float soot=smoothstep(.1,1.0,vUv.y)*.55+smoothstep(.55,1.0,max(abs(p.x),abs(p.y)))*.35;
        float flick=.86+.14*sin(uTime*9.0+uSeed*5.0)*sin(uTime*6.1+uSeed);
        // The flame's own brightness shows low in the pane's middle.
        float core=exp(-dot(p*vec2(1.3,1.0)+vec2(0.0,.25),p*vec2(1.3,1.0)+vec2(0.0,.25))*2.2);
        vec3 dark=vec3(.06,.055,.05)*(1.0-soot*.5);
        vec3 lit=vec3(1.0,.52,.14)*(.42+1.25*core)*(1.0-soot*.7)*flick;
        gl_FragColor=vec4(mix(dark,lit,uLit),mix(.82,.95,uLit));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, side: THREE.DoubleSide,
  });
}

// One lamp. `setLit(lit, seconds)` draws it burning or dark; a lamp just lit takes half a second to come up.
export function createTownLamp({seed = 0, surface = null, documentLike = typeof document === 'undefined' ? null : document} = {}) {
  const group = new THREE.Group(), L = TOWN_LAMP;
  group.name = 'A lamp of Tin Town';
  const shape = townLampShape(seed), ownSurface = surface ? null : yardSurface(yardSheetPicture(documentLike));
  const iron = new THREE.Mesh(shape, surface ?? ownSurface);
  iron.name = 'Lamp post and lantern'; iron.castShadow = true; iron.receiveShadow = true;
  group.add(iron);
  const at = shape.userData.lantern, {half, tall} = L.lantern;
  const paneMaterial = createPaneMaterial(); paneMaterial.uniforms.uSeed.value = seed;
  const paneShape = new THREE.PlaneGeometry(half * 2, tall);
  for (let side = 0; side < 4; side++) {
    const pane = new THREE.Mesh(paneShape, paneMaterial), turn = side * Math.PI / 2;
    pane.position.set(at.x + Math.sin(turn) * half, at.y, at.z + Math.cos(turn) * half); pane.rotation.y = turn;
    pane.name = 'Lantern pane'; group.add(pane);
  }
  const flameMaterial = createFlameMaterial(), standing = new THREE.PlaneGeometry(1, 1); standing.translate(0, .5, 0);
  flameMaterial.uniforms.uSeed.value = seed * .37;
  const flame = new THREE.Mesh(standing, flameMaterial);
  flame.name = 'Lamp flame'; flame.position.set(at.x, at.y - tall * .42, at.z); flame.renderOrder = 3; flame.frustumCulled = false; flame.visible = false;
  group.add(flame);
  const glowMaterial = createGroundGlowMaterial(), pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowMaterial);
  pool.name = "The lamp's pool of light"; pool.position.set(at.x, .06, at.z); pool.renderOrder = 1; pool.visible = false;
  group.add(pool);
  let since = null, wasLit = null;
  return {group, lantern: at,
    setLit(lit, seconds) {
      // A lamp drawn for the first time is as the job has it at once; after that a change takes half a second.
      if (lit !== wasLit) { since = wasLit === null ? null : seconds; wasLit = lit; }
      const up = lit ? Math.min(1, since == null ? 1 : (seconds - since) / .5) : 0, eased = up * up * (3 - 2 * up);
      paneMaterial.uniforms.uLit.value = eased; paneMaterial.uniforms.uTime.value = seconds;
      flameMaterial.uniforms.uTime.value = seconds; glowMaterial.uniforms.uTime.value = seconds;
      flame.visible = eased > .05; pool.visible = eased > .05;
      if (!flame.visible) return;
      const lick = .85 + .2 * Math.abs(Math.sin(seconds * 5.3 + seed * 2.1));
      flame.scale.set(L.flameWide * eased, L.flameTall * eased * lick, 1);
      pool.scale.setScalar(L.poolRadius * 2 * (.4 + .6 * eased));
    },
    dispose() {
      shape.dispose(); paneShape.dispose(); standing.dispose(); pool.geometry.dispose();
      paneMaterial.dispose(); flameMaterial.dispose(); glowMaterial.dispose(); ownSurface?.map?.dispose(); ownSurface?.dispose();
    },
  };
}
