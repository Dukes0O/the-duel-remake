import * as THREE from 'three';
import {drillMaterialAt} from './drill.js';
import {createScrapWear, scrapNoise} from '../world/scrap-look.js';
import {earthMaterial, moundGeometry} from './earth-look.js';
import {machinePart} from './roads-view.js';

import {DIG_MACHINE_TONES} from '../sound-bank.js';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const toward = (value, target, step) => value + clamp(target - value, -step, step);
const unit = (index, k) => { const v = Math.sin(index * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

/** Play through the game's own mixer, with each sound limited independently. */
export function createDrillSounds(audio) {
  const next = new Map(), voices = new Set();
  return {
    play(cue) {
      const spec = DIG_MACHINE_TONES[cue], ctx = audio?.context;
      if (!spec || !ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (now < (next.get(cue) ?? 0)) return;
      const [frequency, waveform, duration] = spec;
      next.set(cue, now + (cue === 'drill-engine' ? 0.5 : cue === 'drill-feed' ? 0.3 : 0.22));
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + duration);
    },
    dispose() { for (const voice of voices) voice.stop(); voices.clear(); },
  };
}

/** The line under the rig's name: how deep the bit is and what it is in, as a whole sentence. */
export function drillDepthWords(hole) {
  if (!hole) return 'Ready to drill.';
  const depth = hole.depth.toFixed(1);
  if (hole.struckWater) return `Water at ${depth} m. The bit is in wet ground.`;
  return `The bit is ${depth} m down, in ${drillMaterialAt(hole.site, hole.depth)}.`;
}

// What comes up from each layer: its colour and how its grains are drawn (see earthMaterial).
const LAYERS = Object.freeze({
  clay: Object.freeze({colour:0x9c5b38, kind:0}),
  gravel: Object.freeze({colour:0x8a6f4d, kind:1}),
  rock: Object.freeze({colour:0x8f8c86, kind:2}),
  wet: Object.freeze({colour:0x302c27, kind:3}),
});
// Everything beside a hole is placed in the rig's own metres (right, forward), with the hole at the middle and the
// truck standing ahead of it.
const HEAP_PLACE = Object.freeze([1.25, -.75]);
const SAMPLE_ROW = Object.freeze({right:-2.05, forward:-2.2, step:.46, rowStep:-.5, perRow:10});
const PIXELS_PER_METRE = 1000;   // at one metre from the eye, for a picture about a thousand pixels tall

// Chips of ground or drops of water thrown up at the hole, as soft points. Size is given in metres.
function sprayMaterial() {
  return new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color(0xffffff)}, uSize:{value:.1}, uFade:{value:1}},
    vertexShader:`uniform float uSize;attribute float aLife;varying float vLife;
      void main(){vLife=aLife;vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=clamp(uSize*${PIXELS_PER_METRE}.0/max(1.0,-mv.z),2.0,48.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uColor;uniform float uFade;varying float vLife;
      void main(){float d=length(gl_PointCoord-.5)*2.0;float a=(1.0-smoothstep(.45,1.0,d))*uFade*smoothstep(1.0,.75,vLife);
        if(a<.02)discard;
        gl_FragColor=vec4(uColor*(1.15-.45*d),a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true, depthWrite:false,
  });
}
function createSpray(count, name) {
  const positions = new Float32Array(count * 3), life = new Float32Array(count), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  const points = new THREE.Points(geometry, sprayMaterial());
  points.name = name; points.frustumCulled = false; points.visible = false;
  // `place(seconds, height, spread)`: every point flies one low arc from the hole and starts again.
  points.userData.place = (seconds, height, spread) => {
    for (let index = 0; index < count; index++) {
      const t = (seconds * (.9 + .5 * unit(index, 1)) + unit(index, 2)) % 1, angle = unit(index, 3) * Math.PI * 2;
      const reach = spread * (.25 + .75 * unit(index, 4)) * t, rise = height * (.45 + .55 * unit(index, 5));
      positions[index * 3] = Math.sin(angle) * reach;
      positions[index * 3 + 1] = Math.max(0, rise * 4 * t * (1 - t) * (1 - .25 * t)) + .04;
      positions[index * 3 + 2] = Math.cos(angle) * reach;
      life[index] = t;
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.aLife.needsUpdate = true;
  };
  return points;
}

// Water drawn three ways. Standing (`flow` 0): wet dark earth round the rim and open water in the middle, dark where
// the eye looks down into it and pale with sky where it looks along it. Falling in a ribbon (1) and rising in a jet
// (2): bright streaks that run along it, brown with mud while `uWaterMud` is up.
function waterMaterial(flow = 0) {
  const material = new THREE.MeshStandardMaterial({color:0x2a2620, roughness:.12, transparent:true, depthWrite:false,
    polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3, side:THREE.DoubleSide});
  const uniforms = {uWaterNoise:{value:scrapNoise()}, uWaterTime:{value:0}, uWaterFlow:{value:flow}, uWaterMud:{value:0}};
  material.userData.water = uniforms;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWaterUv;varying vec3 vWaterWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWaterUv=uv;vWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uWaterNoise;uniform float uWaterTime;uniform float uWaterFlow;uniform float uWaterMud;varying vec2 vWaterUv;varying vec3 vWaterWorld;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if(uWaterFlow>.5){
          float streak=texture2D(uWaterNoise,vec2(vWaterUv.x*.9,vWaterUv.y*.35+uWaterTime*.9)).b;
          vec3 clear=mix(vec3(.26,.32,.33),vec3(.80,.85,.84),smoothstep(.35,.75,streak));
          diffuseColor.rgb=mix(clear,vec3(.30,.21,.13)*(.6+.8*streak),uWaterMud);
          float side=uWaterFlow>1.5?1.0:smoothstep(0.0,.12,vWaterUv.x)*smoothstep(1.0,.88,vWaterUv.x);
          diffuseColor.a=(.5+.45*streak)*side;
        }else{
          vec3 waterEye=normalize(vViewPosition);
          vec3 waterUp=normalize((viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);
          float waterGlance=pow(1.0-clamp(abs(dot(waterEye,waterUp)),0.0,1.0),2.2);
          float waterFar=length(vWaterUv-.5)*2.0;
          float edge=waterFar+(texture2D(uWaterNoise,vWaterWorld.xz*.21).r-.5)*.5;
          float pool=1.0-smoothstep(.50,.62,edge);
          float ripple=texture2D(uWaterNoise,vWaterWorld.xz*.9+vec2(uWaterTime*.07,-uWaterTime*.05)).g;
          float ring=.5+.5*sin(waterFar*42.0-uWaterTime*4.5);
          vec3 open=mix(vec3(.012,.012,.011),vec3(.15,.14,.12),clamp(waterGlance*.9+.05*ripple,0.0,.7))+vec3(.025)*ring*waterGlance;
          diffuseColor.rgb=mix(vec3(.040,.024,.014)*(.8+.4*ripple),open,pool);
          diffuseColor.a=(1.0-smoothstep(.86,1.0,edge))*mix(.8,.95,pool);
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=uWaterFlow>.5?.25:mix(.8,.1,1.0-smoothstep(.50,.62,length(vWaterUv-.5)*2.0));');
  };
  material.customProgramCacheKey = () => 'machine-water-3';
  return material;
}

/**
 * Show each completed yard well at the ground height for this visit: a pad, a painted casing with its valve and
 * hand wheel, and a standpipe that runs water into the wet ground beside it. While the rig still stands on the hole
 * with its mast up, only the casing shows. `rig` is the drill's state; without it the whole wellhead shows at once.
 */
export function createYardWellheadView(parent, heightAt) {
  const group = new THREE.Group();
  group.name = 'yard-wellheads';
  parent.add(group);
  const wear = createScrapWear({dust:0x6b5238, dustTop:.5});
  const paint = wear.apply(new THREE.MeshStandardMaterial({color:0x3f6a63, roughness:.7, metalness:.2}));
  const steel = wear.apply(new THREE.MeshStandardMaterial({color:0x5b5650, roughness:.75, metalness:.3}));
  const red = wear.apply(new THREE.MeshStandardMaterial({color:0x8c2f1e, roughness:.7, metalness:.2}));
  const concrete = earthMaterial(0x9a9486, 1, {vertexColors:false});
  const stream = waterMaterial(1), splash = waterMaterial(0);
  const geometries = [];
  const keep = geometry => { geometries.push(geometry); return geometry; };
  const made = {
    pad:keep(new THREE.CylinderGeometry(.62, .72, .14, 18)), casing:keep(new THREE.CylinderGeometry(.115, .115, 1.02, 14)),
    flange:keep(new THREE.CylinderGeometry(.21, .21, .05, 14)), valve:keep(new THREE.SphereGeometry(.17, 12, 8)),
    stem:keep(new THREE.CylinderGeometry(.03, .03, .34, 8)), wheel:keep(new THREE.TorusGeometry(.19, .022, 6, 18)),
    spoke:keep(new THREE.CylinderGeometry(.014, .014, .38, 6)), riser:keep(new THREE.CylinderGeometry(.055, .055, .78, 10)),
    neck:keep(new THREE.TorusGeometry(.24, .055, 8, 14, Math.PI)), drop:keep(new THREE.CylinderGeometry(.055, .06, .2, 10)),
    cap:keep(new THREE.CylinderGeometry(.13, .15, .07, 12)), stub:keep(new THREE.CylinderGeometry(.115, .115, .32, 14)),
    fall:keep(new THREE.PlaneGeometry(.13, 1, 1, 6)), splash:keep(new THREE.CircleGeometry(.5, 20)),
  };
  made.splash.rotateX(-Math.PI / 2);
  const shown = new Map();
  let clock = 0;
  function build(key, x, z, heading) {
    const well = new THREE.Group();
    well.name = `wellhead-${key}`;
    well.position.set(x, heightAt(x, z), z);
    well.rotation.y = heading;
    const add = (parentGroup, geometry, material, [px, py, pz], turn = null) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz); if (turn) mesh.rotation.set(...turn);
      mesh.castShadow = true; mesh.receiveShadow = true; parentGroup.add(mesh); return mesh;
    };
    // The casing alone, while the rig is still over the hole.
    const stub = new THREE.Group(); stub.name = 'well casing';
    add(stub, made.stub, steel, [0, .16, 0]);
    // The finished head.
    const head = new THREE.Group(); head.name = 'well head';
    add(head, made.pad, concrete, [0, .07, 0]);
    add(head, made.casing, paint, [0, .65, 0]);
    add(head, made.flange, steel, [0, .17, 0]); add(head, made.flange, steel, [0, 1.16, 0]);
    add(head, made.cap, steel, [0, 1.22, 0]);
    add(head, made.valve, red, [0, .78, 0]);
    add(head, made.stem, steel, [.26, .78, 0], [0, 0, Math.PI / 2]);
    const wheel = new THREE.Group(); wheel.position.set(.43, .78, 0); wheel.rotation.y = Math.PI / 2; head.add(wheel);
    add(wheel, made.wheel, red, [0, 0, 0]);
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) add(wheel, made.spoke, red, [0, 0, 0], [0, 0, angle]);
    // A standpipe rises beside the casing and bends over, so that a truck or a bucket can be filled under it.
    add(head, made.riser, paint, [-.24, 1.0, 0]);
    add(head, made.stem, steel, [-.12, .95, 0], [0, 0, Math.PI / 2]);
    add(head, made.neck, paint, [-.48, 1.39, 0]);
    add(head, made.drop, paint, [-.72, 1.3, 0]);
    const fall = add(head, made.fall, stream, [-.72, .62, 0]); fall.scale.y = 1.2; fall.castShadow = false; fall.name = 'water from the standpipe';
    const cross = add(head, made.fall, stream, [-.72, .62, 0], [0, Math.PI / 2, 0]); cross.scale.y = 1.2; cross.castShadow = false;
    const pool = add(head, made.splash, splash, [-.72, .1, 0]); pool.castShadow = false; pool.name = 'water on the ground';
    well.add(stub, head);
    return {well, stub, head, x, z};
  }
  return {
    update(wellheads, dt = 0, rig = null) {
      clock += dt;
      stream.userData.water.uWaterTime.value = clock; splash.userData.water.uWaterTime.value = clock;
      for (const {x, z} of wellheads) {
        const key = `${x}:${z}`;
        if (shown.has(key)) continue;
        const entry = build(key, x, z, rig?.machine?.heading ?? 0);
        shown.set(key, entry);
        group.add(entry.well);
      }
      for (const entry of shown.values()) {
        const under = !!rig?.hole && rig.hole.site.x === entry.x && rig.hole.site.z === entry.z &&
          (rig.hole.mastDown || Math.hypot(rig.machine.x - entry.x, rig.machine.z - entry.z) < 1.5);
        entry.head.visible = !under; entry.stub.visible = under;
        wear.follow(entry.well);
      }
    },
    dispose() {
      group.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      for (const material of [paint, steel, red, concrete, stream, splash]) material.dispose();
    },
  };
}

/**
 * Keep what came up at each hole for the length of the yard visit. A heap grows beside the hole in the colour of the
 * layer the bit is in. Behind the rig a row of small sample piles is laid out, one for each metre drilled, so the
 * ground can be read from the top down: red clay, grey gravel, pale rock, and dark wet ground last. When water is
 * struck it comes up the hole and spreads on the ground.
 */
export function createDrillCuttingsView(parent, heightAt) {
  const group = new THREE.Group();
  group.name = 'drill-cuttings';
  parent.add(group);
  const heapGeometry = moundGeometry({seed:3});
  const sampleGeometries = [11, 12, 13].map(seed => moundGeometry({seed, rings:5, spokes:12}));
  const sampleMaterials = Object.fromEntries(Object.entries(LAYERS).map(([name, {colour, kind}]) => [name, earthMaterial(colour, kind)]));
  sampleMaterials.wet.roughness = .45;
  const poolGeometry = new THREE.CircleGeometry(.5, 40); poolGeometry.rotateX(-Math.PI / 2);
  const jetGeometry = new THREE.CylinderGeometry(.07, .17, 1, 10, 1, true);
  const heaps = new Map(), clear = new THREE.Color(.50, .56, .57);
  function start(hole, heading) {
    const {x, z} = hole.site, key = `${x}:${z}`, sin = Math.sin(heading), cos = Math.cos(heading);
    const place = (right, forward) => ({x:x + right * cos + forward * sin, z:z + forward * cos - right * sin});
    const holder = new THREE.Group(); holder.name = `cuttings-at-${key}`;
    const at = place(...HEAP_PLACE);
    const heap = new THREE.Mesh(heapGeometry, earthMaterial(LAYERS.clay.colour, LAYERS.clay.kind));
    heap.name = `cuttings-${key}`;
    heap.castShadow = true; heap.receiveShadow = true;
    heap.position.set(at.x, heightAt(at.x, at.z), at.z);
    heap.rotation.y = heading + key.length;
    const chips = createSpray(26, 'cuttings thrown up at the hole'), water = createSpray(140, 'water coming up the hole');
    water.material.uniforms.uSize.value = .07;
    const jet = new THREE.Mesh(jetGeometry, waterMaterial(2));
    jet.name = 'water rising from the hole'; jet.visible = false;
    const pool = new THREE.Mesh(poolGeometry, waterMaterial(0));
    pool.name = 'water on the ground'; pool.visible = false; pool.renderOrder = 1;
    for (const item of [chips, water, pool, jet]) item.position.set(x, heightAt(x, z) + .1, z);
    holder.add(heap, chips, water, pool, jet);
    group.add(holder);
    const entry = {key, holder, heap, chips, water, pool, jet, place, ground:heightAt(x, z) + .1, samples:[], depth:0, fed:0, wet:-1, clock:0};
    heaps.set(key, entry);
    return entry;
  }
  function addSample(entry, layer) {
    const index = entry.samples.length, row = Math.floor(index / SAMPLE_ROW.perRow), along = index % SAMPLE_ROW.perRow;
    const at = entry.place(SAMPLE_ROW.right + along * SAMPLE_ROW.step, SAMPLE_ROW.forward + row * SAMPLE_ROW.rowStep);
    const pile = new THREE.Mesh(sampleGeometries[index % sampleGeometries.length], sampleMaterials[layer]);
    pile.name = `sample of ${layer}`;
    pile.castShadow = true; pile.receiveShadow = true;
    pile.position.set(at.x, heightAt(at.x, at.z), at.z);
    pile.rotation.y = index * 2.4;
    pile.scale.set(.2, .14, .2);
    entry.holder.add(pile); entry.samples.push(pile);
  }
  return {
    update(hole, dt = 0, heading = 0) {
      const current = hole && hole.depth > 0 ? `${hole.site.x}:${hole.site.z}` : null;
      if (current) {
        const entry = heaps.get(current) ?? start(hole, heading);
        const layer = drillMaterialAt(hole.site, hole.depth);
        const size = Math.min(1.2, 0.25 + hole.depth * 0.055);
        entry.heap.scale.set(size, size * .48, size * .9);
        entry.heap.material.color.setHex(LAYERS[layer].colour);
        entry.heap.material.userData.earth.uEarthKind.value = LAYERS[layer].kind;
        entry.heap.material.roughness = hole.struckWater ? 0.55 : 1;
        // One sample pile for every whole metre, in the colour of the middle of that metre.
        while (entry.samples.length < Math.floor(hole.depth) && entry.samples.length < 60)
          addSample(entry, drillMaterialAt(hole.site, entry.samples.length + .5));
        if (hole.struckWater && entry.wet < 0) { entry.wet = 0; addSample(entry, 'wet'); }
        if (hole.depth > entry.depth + 1e-6) entry.fed = .3;
        entry.depth = hole.depth;
        entry.chips.material.uniforms.uColor.value.setHex(LAYERS[layer].colour).multiplyScalar(.8);
      }
      for (const entry of heaps.values()) {
        entry.clock += dt;
        entry.fed = Math.max(0, entry.fed - dt);
        entry.chips.visible = entry.fed > 0 && entry.wet < 0;
        if (entry.chips.visible) entry.chips.userData.place(entry.clock * 1.6, .9, .8);
        if (entry.wet < 0) continue;
        entry.wet += dt;
        // The first water comes up brown and hard, clears, and settles to a low boil.
        const rigHere = entry.key === current && hole.mastDown;
        const force = Math.min(1, entry.wet / .35) * (.14 + .86 * Math.exp(-Math.max(0, entry.wet - 2.5) / 2.2));
        entry.water.visible = rigHere || entry.wet < 9;
        if (entry.water.visible) {
          entry.water.userData.place(entry.clock * 1.25, 3.4 * force + .25, 1.5 * force + .35);
          entry.water.material.uniforms.uColor.value.setRGB(.17, .12, .075).lerp(clear, clamp((entry.wet - .6) / 3));
          entry.water.material.uniforms.uFade.value = rigHere ? 1 : clamp((9 - entry.wet) / 2);
        }
        // A solid jet while the water comes hard; it sinks back as the hole settles.
        const tall = 3.2 * force;
        entry.jet.visible = entry.water.visible && tall > .5;
        if (entry.jet.visible) {
          entry.jet.scale.set(1, tall, 1); entry.jet.position.y = entry.ground + tall / 2;
          entry.jet.material.userData.water.uWaterTime.value = entry.clock * 1.6;
          entry.jet.material.userData.water.uWaterMud.value = 1 - clamp((entry.wet - .6) / 3);
        }
        entry.pool.visible = true;
        entry.pool.scale.setScalar(2 * (.5 + 1.7 * (1 - Math.exp(-entry.wet / 5))));
        entry.pool.material.userData.water.uWaterTime.value = entry.clock;
      }
    },
    dispose() {
      group.removeFromParent();
      heapGeometry.dispose(); poolGeometry.dispose(); jetGeometry.dispose();
      for (const geometry of sampleGeometries) geometry.dispose();
      for (const material of Object.values(sampleMaterials)) material.dispose();
      for (const entry of heaps.values()) {
        entry.heap.material.dispose(); entry.pool.material.dispose(); entry.jet.material.dispose();
        for (const spray of [entry.chips, entry.water]) { spray.geometry.dispose(); spray.material.dispose(); }
      }
    },
  };
}

const MAST_UP = Math.PI / 2, STROKE = 2.4, BIT_AT_GROUND = 2;

/**
 * The drill rig is a truck with a lattice mast hinged at its tail. The mast lies along the deck to travel and stands
 * over the hole to drill; the drill string runs down inside it with an auger at its foot. The truck is placed so
 * that the standing string is exactly over the rig's own place, which is where the rules put the hole.
 */
export function createDrillView(model) {
  const root = new THREE.Group();
  root.name = 'drill rig display';
  model.rotation.y = Math.PI;
  root.add(model);
  const mast = machinePart(model, 'drill-rig:mast'), string = machinePart(model, 'drill-rig:string');
  if (mast && string) {
    model.position.z = mast.position.z + string.position.y;
    const steel = new THREE.MeshStandardMaterial({color:0x3f3a35, roughness:.72, metalness:.3, side:THREE.DoubleSide});
    // An auger: a steel ribbon wound round the foot of the string. Turning, it carries the cuttings up.
    const turns = 5, steps = 14, pitch = .34, positions = [], indices = [];
    for (let index = 0; index <= turns * steps; index++) {
      const angle = index / steps * Math.PI * 2, along = -index / steps * pitch;
      positions.push(Math.cos(angle) * .09, Math.sin(angle) * .09, along, Math.cos(angle) * .25, Math.sin(angle) * .25, along - .04);
      if (index) { const a = index * 2 - 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const flight = new THREE.BufferGeometry();
    flight.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    flight.setIndex(indices); flight.computeVertexNormals();
    const auger = new THREE.Group();
    auger.name = 'drill-auger';
    const ribbon = new THREE.Mesh(flight, steel); ribbon.castShadow = true;
    const bit = new THREE.Mesh(new THREE.ConeGeometry(.2, .34, 9), steel);
    bit.rotation.x = Math.PI / 2; bit.position.z = .15; bit.castShadow = true;
    auger.add(ribbon, bit);
    // The pipe runs from the string's own origin at the mast head to 5.7 m along it; the auger sits at that far end.
    const pipe = string.children[0];
    const far = new THREE.Vector3(0, 0, 5.7);
    if (pipe) far.applyQuaternion(pipe.quaternion).add(pipe.position);
    auger.position.copy(far);
    auger.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), far.clone().normalize());
    string.add(auger);
  }
  const poses = new WeakMap();
  return {root,
    /** Where the driller stands while the mast is up: behind the rig and to one side, facing the hole. */
    seat(rig) {
      return rig?.hole?.mastDown ? {eye:[-4.2, 3.0, -5.8], target:[-.3, 1.0, -.4]} : null;
    },
    update(rig, body, dt = 0) {
      let pose = poses.get(body);
      if (!pose) {
        const mastNode = machinePart(body, 'drill-rig:mast'), stringNode = machinePart(body, 'drill-rig:string');
        pose = {mast:mastNode, string:stringNode, angle:0, feed:0, spin:0, depth:0, clock:0,
          baseZ:stringNode?.position.z ?? 0, baseTurn:stringNode?.quaternion.clone() ?? null};
        poses.set(body, pose);
      }
      if (!pose.mast || !pose.string) return;
      const hole = rig.hole, working = hole?.mastDown === true, depth = hole?.depth ?? 0;
      const up = pose.angle > MAST_UP - .02;
      // The string goes down only inside a standing mast, and comes back up before the mast is laid down.
      const feed = !working || !up ? 0 : depth <= 0 ? BIT_AT_GROUND - .45 : hole.struckWater ? BIT_AT_GROUND + STROKE : BIT_AT_GROUND + depth % STROKE;
      pose.feed = toward(pose.feed, feed, dt * (feed < pose.feed ? 2.6 : 1.3));
      if (working || pose.feed < .05) pose.angle = toward(pose.angle, working ? MAST_UP : 0, dt * .62);
      if (depth > pose.depth + 1e-6) pose.spin += dt * 9;
      pose.depth = depth;
      pose.mast.rotation.x = pose.angle;
      // A jammed bit shows: the string shudders in the mast and nothing comes up.
      pose.clock += dt;
      pose.string.position.x = hole?.jammed ? Math.sin(pose.clock * 70) * .014 : 0;
      pose.string.position.z = pose.baseZ + pose.feed + (hole?.jammed ? Math.sin(pose.clock * 43) * .01 : 0);
      pose.string.quaternion.copy(pose.baseTurn).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pose.spin));
    }};
}
