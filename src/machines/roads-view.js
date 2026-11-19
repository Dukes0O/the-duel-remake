import {DIG_MACHINE_TONES} from '../sound-bank.js';
import * as THREE from 'three';
import {roadCondition} from './roads.js';
import {createSmokeMaterial, scrapNoise} from '../world/scrap-look.js';
import {earthMaterial, moundGeometry} from './earth-look.js';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const unit = (index, k) => { const v = Math.sin(index * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const plain = name => name.replace(/[^a-z0-9-]/gi, '').toLowerCase();
/** Find a named part of a loaded model. The loader drops ':' and turns spaces to '_', so compare letters and digits only. */
export function machinePart(root, name) {
  let found = null;
  const wanted = plain(name);
  root?.traverse(node => { if (!found && plain(node.name) === wanted) found = node; });
  return found;
}

/** The drawn surface lies this far above the ground it follows, clear of the edited ground's own 0.035 m. */
export const ROAD_SKIN_LIFT = 0.07;

/**
 * What a player should see on one worked cell. `state` is one of `cut` (scraped by the blade), `loose` (fill that has
 * not been rolled), `firm` (rolled), `paved`, `paved-soft` (a surface laid on ground that was never made firm) and
 * `paved-rough` (laid too fast, off its line or over a bump). The numbers feed the drawing.
 */
export function roadSurface(cell) {
  if (!cell) return {state:'untouched', cover:0, fill:0, firm:0, paved:0, fault:0, soft:0};
  const condition = roadCondition(cell), fill = cell.spread > 0 ? 1 : 0, paved = cell.surface ? 1 : 0;
  // A blade cuts a few centimetres below the ground. A deep hole or a heap is the ground's own shape, drawn by the ground.
  const cut = !fill && !paved && cell.height < -0.02 && cell.height > -0.5;
  if (!fill && !paved && !cut) return {state:'untouched', cover:0, fill:0, firm:0, paved:0, fault:0, soft:0};
  const firm = clamp(cell.compaction);
  const state = condition === 'good' ? 'paved' : condition === 'soft' ? 'paved-soft' : condition === 'rough' ? 'paved-rough'
    : !fill ? 'cut' : firm >= 0.9 ? 'firm' : 'loose';
  return {state, cover:1, fill, firm, paved, fault:paved ? clamp(cell.roughness) : 0, soft:condition === 'soft' ? 1 : 0};
}

// Worked ground is drawn by the game's code, as wear is drawn on a machine: one thin surface over every worked cell,
// coloured and lit in the picture's own grain. Loose fill is dark, turned earth in clods with a ragged edge. Each pass
// of the roller presses the clods flat and pales the ground until it is tight. A good surface is a dark mat with a
// straight edge. A surface laid on soft ground cracks and lets the earth show; one laid badly ripples and tears.
function roadSkinMaterial() {
  const material = new THREE.MeshStandardMaterial({color:0xffffff, roughness:1, transparent:true, depthWrite:false,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
  const uniforms = {uRoadNoise:{value:scrapNoise()}};
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aRoad;attribute vec2 aRoadMore;varying vec4 vRoad;varying vec2 vRoadMore;varying vec3 vRoadWorld;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vRoad=aRoad;vRoadMore=aRoadMore;vRoadWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uRoadNoise;varying vec4 vRoad;varying vec2 vRoadMore;varying vec3 vRoadWorld;
        float roadMat=0.0;float roadBad=0.0;float roadRelief=0.0;
        float roadLumps(vec2 p){return texture2D(uRoadNoise,p*.19+.37).r*.55+texture2D(uRoadNoise,p*.83+.11).b*.45;}
        vec2 roadCell(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
        // How far a point is from the nearest wall between small plates: a surface on soft ground breaks into plates.
        float roadPlates(vec2 p){
          vec2 n=floor(p),f=fract(p);float d1=8.0,d2=8.0;
          for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
            vec2 g=vec2(float(i),float(j));float d=length(g+roadCell(n+g)-f);
            if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}
          return d2-d1;}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 rp=vRoadWorld.xz;
        vec3 rBig=texture2D(uRoadNoise,rp*.045).rgb;
        vec3 rMid=texture2D(uRoadNoise,rp*.19+.37).rgb;
        vec3 rFine=texture2D(uRoadNoise,rp*.83+.11).rgb;
        float rCover=vRoad.x,rFirm=clamp(vRoad.y,0.0,1.0),rPaved=vRoad.z,rFault=clamp(vRoad.w,0.0,1.0);
        float rFill=clamp(vRoadMore.x,0.0,1.0),rSoft=clamp(vRoadMore.y,0.0,1.0);
        float rEdge=(rMid.b-.5)*.8+(rFine.r-.5)*.4;
        // Earth: scraped by the blade, loose in clods, or pressed tight and pale by the drum.
        float rClod=smoothstep(.40,.64,rMid.r*.55+rFine.b*.45);
        vec3 rLoose=vec3(.085,.043,.023)*(.42+.95*rClod)*(.82+.36*rFine.g);
        vec3 rCut=vec3(.115,.058,.030)*(.84+.24*rFine.g)*(.88+.24*rBig.r);
        vec3 rTight=vec3(.40,.29,.18)*(.95+.08*rFine.g)*(.95+.08*rBig.b)*(1.0-.22*smoothstep(.58,.70,rFine.b));
        float rPressed=rFirm*rFirm*(3.0-2.0*rFirm);
        vec3 rEarth=mix(mix(rCut,rLoose,rFill),rTight,rPressed);
        // Small stones lie in loose and scraped ground; the drum presses them in.
        rEarth+=vec3(.16,.12,.08)*smoothstep(.70,.78,rFine.g*.55+rFine.b*.45)*(1.0-.8*rPressed)*.6;
        // The laid surface: a dark mat with pale grit in it.
        float rGrit=smoothstep(.58,.70,texture2D(uRoadNoise,rp*2.9+.53).g);
        vec3 rGood=vec3(.014,.014,.016)*(.78+.5*rFine.b)+vec3(.05,.047,.042)*rGrit*.3;
        // Laid on soft ground: it sinks and crazes, and the earth shows in the cracks.
        float rCrack=1.0-smoothstep(.02,.09,roadPlates(rp*2.7+(rMid.rg-.5)*.9));
        float rSunk=smoothstep(.50,.68,rBig.r*.5+rMid.b*.5);
        vec3 rSoftMat=mix(rGood*1.5+vec3(.012,.009,.006),rLoose*1.7,max(rCrack*.95,rSunk*.55));
        // Laid badly: ripples across it and torn patches where the grit pulled out.
        float rRipple=.5+.5*sin(rMid.r*46.0+rBig.b*9.0);
        float rTorn=smoothstep(.54,.64,rMid.b*.6+rFine.r*.4);
        vec3 rRoughMat=rGood*(.7+1.5*rRipple)+vec3(.07,.06,.045)*rTorn;
        float rBad=smoothstep(.2,.45,rFault);
        vec3 rRoad=mix(mix(rGood,rRoughMat,rBad),rSoftMat,rSoft);
        float rRagged=max(rBad,rSoft*.6);
        // Scraped ground lets the ground's own grain show; rolled ground has a firm, plain edge.
        float rEarthShow=smoothstep(.30,.62,rCover+rEdge*.42*(1.0-.75*rPressed))*mix(mix(.62,.92,rFill),.97,rPressed);
        float rMatShow=smoothstep(.47-.14*rRagged,.53+.14*rRagged,rPaved+rEdge*rRagged*.9);
        diffuseColor.rgb=mix(rEarth,rRoad,rMatShow);
        diffuseColor.a=max(rEarthShow,rMatShow);
        roadMat=rMatShow;roadBad=max(rBad,rSoft);
        roadRelief=(1.0-rMatShow)*rFill*(1.0-rFirm)*.16+rMatShow*roadBad*.07;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=mix(1.0,mix(.86,.96,roadBad),roadMat);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float roadH=roadLumps(vRoadWorld.xz);
        vec3 roadBump=vec3(roadH-roadLumps(vRoadWorld.xz+vec2(.06,0.0)),0.0,roadH-roadLumps(vRoadWorld.xz+vec2(0.0,.06)))*(roadRelief/.06);
        normal=normalize(normal+(viewMatrix*vec4(roadBump,0.0)).xyz);`);
  };
  material.customProgramCacheKey = () => 'road-work-skin-2';
  return material;
}

/**
 * Draw the road work over the yard's ground. `heightAt` gives the ground under any point. When the ground itself is
 * shared with the other machines (`sharedGround`) its heights already hold the work; otherwise the work's own heights
 * are added, so a town or a test with flat ground still shows cut and fill.
 */
export function createRoadWorkView(parent, heightAt, sharedGround = false) {
  const group = new THREE.Group();
  group.name = 'yard-road-work';
  parent.add(group);
  const heapMaterial = earthMaterial(0x553a2a, 0);
  const heap = new THREE.Mesh(moundGeometry({seed:5, forward:.55}), heapMaterial);
  heap.name = 'dozer-blade-heap';
  heap.visible = false;
  heap.castShadow = true;
  group.add(heap);
  const skinMaterial = roadSkinMaterial();
  const skin = new THREE.Mesh(new THREE.BufferGeometry(), skinMaterial);
  skin.name = 'road-work-surface';
  skin.receiveShadow = true;
  skin.frustumCulled = false;
  skin.visible = false;
  group.add(skin);
  const previous = new Map();
  let corners = new Map(), calls = 0;

  function rebuild(work) {
    corners = new Map();
    const corner = (x, z) => {
      const key = `${x}:${z}`;
      let entry = corners.get(key);
      if (!entry) corners.set(key, entry = {x, z, cover:0, paved:0, weight:0, firm:0, fill:0, mat:0, fault:0, soft:0, best:0, height:0, index:-1});
      return entry;
    };
    for (const [key, cell] of Object.entries(work.cells)) {
      const look = roadSurface(cell);
      if (!look.cover) continue;
      const [cx, cz] = key.split(':').map(Number);
      // A blade, a drum and a screed are all wider than one cell: each worked cell reaches 1.2 m to either side.
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const strength = clamp(1.65 - Math.max(Math.abs(dx), Math.abs(dz)));
        const entry = corner(cx + dx, cz + dz);
        entry.cover = Math.max(entry.cover, strength);
        entry.paved = Math.max(entry.paved, strength * look.paved);
        entry.weight += strength; entry.firm += strength * look.firm; entry.fill += strength * look.fill;
        entry.mat += strength * look.paved; entry.fault += strength * look.paved * look.fault;
        entry.soft += strength * look.paved * look.soft;
        if (strength > entry.best) { entry.best = strength; entry.height = cell.height || 0; }
      }
    }
    const positions = [], road = [], more = [], indices = [];
    for (const entry of corners.values()) {
      entry.index = positions.length / 3;
      positions.push(entry.x, heightAt(entry.x, entry.z) + (sharedGround ? 0 : entry.height * entry.best) + ROAD_SKIN_LIFT, entry.z);
      const weight = entry.weight || 1, mat = entry.mat || 1;
      road.push(entry.cover, entry.firm / weight, entry.paved, entry.fault / mat);
      more.push(entry.fill / weight, entry.soft / mat);
    }
    for (const entry of corners.values()) {
      const b = corners.get(`${entry.x + 1}:${entry.z}`), c = corners.get(`${entry.x}:${entry.z + 1}`), d = corners.get(`${entry.x + 1}:${entry.z + 1}`);
      if (!b || !c || !d || !(entry.cover || b.cover || c.cover || d.cover)) continue;
      // The same diagonal as the edited ground under it (src/world/ground-view.js), so the two lie parallel.
      indices.push(entry.index, c.index, b.index, b.index, c.index, d.index);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aRoad', new THREE.Float32BufferAttribute(road, 4));
    geometry.setAttribute('aRoadMore', new THREE.Float32BufferAttribute(more, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    skin.geometry.dispose();
    skin.geometry = geometry;
    skin.visible = indices.length > 0;
  }

  // Another machine may dig or tip where a road was worked. Follow the ground without rebuilding the surface.
  function settle() {
    const positions = skin.geometry.attributes.position;
    if (!positions) return;
    let moved = false;
    for (const entry of corners.values()) {
      const y = heightAt(entry.x, entry.z) + (sharedGround ? 0 : entry.height * entry.best) + ROAD_SKIN_LIFT;
      if (Math.abs(positions.getY(entry.index) - y) > 1e-4) { positions.setY(entry.index, y); moved = true; }
    }
    if (moved) { positions.needsUpdate = true; skin.geometry.computeVertexNormals(); }
  }

  return {
    surface: skin,
    /** The drawn values at one whole-metre corner: cover, firm, paved, fault, fill, soft and its height. */
    cornerAt(x, z) {
      const entry = corners.get(`${x}:${z}`), positions = skin.geometry.attributes.position;
      if (!entry) return null;
      const road = skin.geometry.attributes.aRoad, more = skin.geometry.attributes.aRoadMore;
      return {cover:road.getX(entry.index), firm:road.getY(entry.index), paved:road.getZ(entry.index), fault:road.getW(entry.index),
        fill:more.getX(entry.index), soft:more.getY(entry.index), y:positions.getY(entry.index)};
    },
    update(work, dozer = null) {
      const load = Math.max(0, work.bladeLoad || 0);
      heap.visible = !!dozer && load > 0;
      if (heap.visible) {
        const x = dozer.x + Math.sin(dozer.heading) * 2;
        const z = dozer.z + Math.cos(dozer.heading) * 2;
        const size = Math.cbrt(load);
        // Loose earth rolls ahead of the blade as wide as the blade allows and about a third as tall.
        heap.scale.set(Math.min(1.75, .55 + size * 1.25), size * .62, .35 + size * .9);
        heap.position.set(x, heightAt(x, z), z);
        heap.rotation.y = dozer.heading;
      }
      let changed = false;
      for (const key of new Set([...previous.keys(), ...Object.keys(work.cells)])) {
        const cell = work.cells[key];
        if (previous.get(key) === cell) continue;
        changed = true;
        if (cell) previous.set(key, cell); else previous.delete(key);
      }
      if (changed) rebuild(work);
      else if (++calls % 90 === 0) settle();
    },
    dispose() {
      group.removeFromParent();
      heap.geometry.dispose(); heapMaterial.dispose();
      skin.geometry.dispose(); skinMaterial.dispose();
    },
  };
}

// Steam off the fresh surface behind the paver's screed, as soft puffs that face the viewer. They are placed from the
// clock in the paver's own metres, so nothing is stored between frames.
function createSteam(count = 12) {
  const group = new THREE.Group();
  group.name = 'steam off the new surface';
  const material = createSmokeMaterial(0xb7b0a2), card = new THREE.PlaneGeometry(1, 1);
  const puffs = Array.from({length:count}, (_, index) => {
    const puff = new THREE.Mesh(card, material);
    puff.name = 'steam'; puff.renderOrder = 2; puff.visible = false; puff.userData.fade = 0;
    puff.onBeforeRender = () => { material.uniforms.uFade.value = puff.userData.fade; material.uniforms.uSeed.value = index * .37; material.uniformsNeedUpdate = true; };
    group.add(puff);
    return puff;
  });
  group.userData.place = (seconds, strength) => puffs.forEach((puff, index) => {
    const age = (seconds / 2.4 + index / count) % 1;
    puff.position.set((unit(index, 1) - .5) * 4.6, .2 + age * 1.7, -4.9 - age * 1.3 - unit(index, 2) * .9);
    puff.scale.set(.8 + 2 * age, .8 + 2 * age, 1);
    puff.userData.fade = strength * Math.min(1, age / .15) * Math.pow(1 - age, 1.4) * .3;
    puff.visible = puff.userData.fade > .004;
  });
  group.userData.dispose = () => { material.dispose(); card.dispose(); };
  return group;
}

/** The roller and the paver come from a family whose machines face the other way. Turn one to face forward. */
export function roadMachineModel(model) {
  if (!model) return null;
  const root = new THREE.Group();
  root.name = `${model.name} facing forward`;
  model.rotation.y = Math.PI;
  root.add(model);
  return root;
}

// Where the working edge of each tool stands above the ground, in metres.
const BLADE = Object.freeze({travel:.34, spread:.10, cut:-.10});
const SCREED_TRAVEL = .28, DRUM_RADIUS = .75;

/**
 * Move the parts a driver works: the dozer's blade goes down to cut and half way to spread, the roller's drum turns
 * with the ground it covers, and the paver's screed comes down to lay. It reads the machines and changes nothing.
 */
export function createRoadMachinePose() {
  const parts = new WeakMap(), steams = [];
  const toward = (value, target, step) => value + clamp(target - value, -step, step);
  function found(view, id) {
    let entry = parts.get(view);
    if (entry) return entry;
    const name = {dozer:'dozer:blade', roller:'roller:drum', paver:'paver:screed'}[id];
    const node = machinePart(view.body, name);
    entry = {node, base:node ? node.position.y : 0, offset:null, edge:0, turn:0, steam:null, laying:0};
    if (node && id === 'paver') { entry.steam = createSteam(); view.root.add(entry.steam); steams.push(entry.steam); }
    if (node && id === 'dozer') {
      view.root.updateMatrixWorld(true);
      entry.edge = new THREE.Box3().setFromObject(node).min.y - view.root.position.y;
    }
    parts.set(view, entry);
    return entry;
  }
  return {
    update({machines, bladeLoad = 0, active = null, working = false, views, dt = 0} = {}) {
      for (const id of ['dozer', 'roller', 'paver']) {
        const view = views?.get(id), machine = machines?.[id]?.machine;
        if (!view || !machine) continue;
        const entry = found(view, id);
        if (!entry.node) continue;
        const busy = active === id && working && Math.abs(machine.speedMps) > 0.02;
        if (id === 'dozer') {
          const edge = active === id && working ? BLADE.cut : bladeLoad > 0 ? BLADE.spread : BLADE.travel;
          const target = edge - entry.edge;
          entry.offset = entry.offset === null ? target : toward(entry.offset, target, dt * .5);
          entry.node.position.y = entry.base + entry.offset;
        } else if (id === 'roller') {
          // The model faces the other way inside its turned root, so forward travel is a negative turn.
          entry.turn -= machine.speedMps * dt / DRUM_RADIUS;
          entry.node.rotation.x = entry.turn;
          entry.node.position.y = entry.base + (busy ? Math.sin(machine.timeSeconds * 95) * .006 : 0);
        } else {
          const target = active === id && working ? 0 : SCREED_TRAVEL;
          entry.offset = entry.offset === null ? target : toward(entry.offset, target, dt * .35);
          entry.node.position.y = entry.base + entry.offset;
          entry.laying = toward(entry.laying, busy ? 1 : 0, dt * .8);
          entry.steam.userData.place(machine.timeSeconds, entry.laying);
        }
      }
    },
    dispose() { for (const steam of steams) { steam.removeFromParent(); steam.userData.dispose(); } },
  };
}

/**
 * The driver's seat of each road machine, in the machine's own metres (right, up, forward): where the eye sits and
 * what it looks at, so that the blade, the drum or the hopper is in the picture.
 */
export const ROAD_MACHINE_SEATS = Object.freeze({
  dozer: Object.freeze({eye:[0, 4.0, -.3], target:[0, .6, 4.6]}),
  roller: Object.freeze({eye:[0, 3.3, .6], target:[0, .4, 4.6]}),
  paver: Object.freeze({eye:[0, 4.7, .3], target:[0, .5, 6.2]}),
});

export function createRoadSounds(audio) {
  const next = new Map(), voices = new Set();
  return {
    play(cue) {
      const spec = DIG_MACHINE_TONES[cue], ctx = audio?.context;
      if (!spec || !ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (now < (next.get(cue) ?? 0)) return;
      next.set(cue, now + 0.2);
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = spec[1]; oscillator.frequency.setValueAtTime(spec[0], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + 0.18);
    },
    dispose() { for (const voice of voices) voice.stop(); voices.clear(); },
  };
}
