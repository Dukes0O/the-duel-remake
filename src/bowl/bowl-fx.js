import * as THREE from 'three';
import {scrapNoise} from '../world/scrap-look.js';

// BOWL-LOOK-FIX: drawing pieces shared by the Bowl's views. Drawing only; nothing here reads or writes race state.
// - `screenShare` and `nearCap`: how much of the picture's height a drawn card covers, and a fade that stops a flame
//   or a ball of fire from covering the screen when the camera is close (batch drive 3: the Scrapasaurus's fire turned
//   the whole picture orange);
// - `createSpray`: sparks sized so they still show at thirty metres, thrown to one side, both sides or back;
// - `createSteelCable`: a lit steel wire rope of short round pieces, with the twist of its strands drawn on it;
// - `createFlameBar`: High Jump's bar, a gas pipe on sliding collars with a wall of real flames along its top.

const clamp01 = value => Math.min(1, Math.max(0, value));
const smoothstep = (from, to, value) => { const t = clamp01((value - from) / (to - from)); return t * t * (3 - 2 * t); };
const unit = (index, k) => { const v = Math.sin(index * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const at = new THREE.Vector3(), eye = new THREE.Vector3();

// The share of the picture's height that something `size` metres across covers, seen from this camera.
export function screenShare(object, camera, size) {
  object.getWorldPosition(at);
  eye.setFromMatrixPosition(camera.matrixWorld);
  const distance = Math.max(.05, at.distanceTo(eye));
  const fov = camera.isPerspectiveCamera ? THREE.MathUtils.degToRad(camera.fov) : 1;
  return size / (2 * distance * Math.tan(fov / 2));
}

// 1 while a card covers less than `from` of the picture's height, falling to 0 by `to`.
export const FIRE_CAP = Object.freeze({from: .16, to: .42});
export function nearCap(object, camera, size, from = FIRE_CAP.from, to = FIRE_CAP.to) {
  return 1 - smoothstep(from, to, screenShare(object, camera, size));
}

// Sparks: hot white heads cooling to orange as they fly and fall. Each point is sized in pixels from its distance,
// with a floor, so that a spray still reads from across the arena (docs/ART_LINE.md, "Points drawn too small to see").
// `place(seconds, origin, back, side, options)` lays them out in the parent's metres: `back` is the way they are
// thrown, `side` the way across; `both` throws half of them to each side, `share` lights only that part of them.
export function createSpray(count = 96, name = 'Bowl sparks') {
  const positions = new Float32Array(count * 3), heat = new Float32Array(count), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: `attribute float aHeat;varying float vHeat;
      void main(){vHeat=aHeat;vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=aHeat<=0.0 ? 0.0 : clamp((150.0+190.0*aHeat)/max(1.0,-mv.z),3.0,15.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vHeat;
      void main(){float d=length(gl_PointCoord-.5)*2.0;float a=(1.0-smoothstep(.1,1.0,d))*vHeat;
        vec3 colour=mix(vec3(1.0,.42,.08),vec3(1.0,.93,.7),smoothstep(.45,1.0,vHeat)*(1.0-d));
        gl_FragColor=vec4(colour*a*2.0,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = name; points.frustumCulled = false; points.renderOrder = 8;
  points.userData.place = (seconds, origin, back, side, {reach = 3, rise = 2, spread = .5, both = false, share = 1, life: pace = 1.4} = {}) => {
    const lit = Math.round(count * clamp01(share));
    for (let index = 0; index < count; index++) {
      const k = index * 3;
      if (index >= lit) { heat[index] = 0; positions[k] = origin.x; positions[k + 1] = origin.y; positions[k + 2] = origin.z; continue; }
      const life = (seconds * pace * (.7 + .6 * unit(index, 1)) + unit(index, 2)) % 1;
      const across = both ? (index % 2 ? 1 : -1) * (.55 + .7 * unit(index, 4)) : (unit(index, 4) - .5) * 2 * spread;
      const out = reach * life * (.45 + .75 * unit(index, 3)), up = rise * (.5 + unit(index, 5)) * life - 4.2 * life * life;
      const sideways = (both ? reach * .9 : reach) * life * across;
      positions[k] = origin.x + back.x * out + side.x * sideways;
      positions[k + 1] = origin.y + up + back.y * out;
      positions[k + 2] = origin.z + back.z * out + side.z * sideways;
      heat[index] = Math.pow(1 - life, .7);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aHeat.needsUpdate = true;
  };
  return points;
}

// A wire rope's lay: dark grooves running round it on a slant. A small picture made in code, so it also exists in
// tests without a browser.
let layTexture = null;
function cableLay() {
  if (layTexture) return layTexture;
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const band = ((x + y * .75) / size * 4) % 1, groove = Math.pow(Math.abs(band - .5) * 2, 3);
    const shade = 140 + 115 * (1 - groove), i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = shade; data[i + 3] = 255;
  }
  layTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  layTexture.wrapS = layTexture.wrapT = THREE.RepeatWrapping;
  layTexture.repeat.set(2, 5);
  layTexture.magFilter = THREE.LinearFilter; layTexture.needsUpdate = true;
  layTexture.userData.sharedAsset = true;
  return layTexture;
}

// A steel cable of `steps` round pieces. `lay(points, radius, tight)` puts its pieces along steps + 1 points.
export function createSteelCable(steps = 18, name = 'Steel cable') {
  const group = new THREE.Group(); group.name = name;
  const card = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const material = new THREE.MeshStandardMaterial({color: 0x8d8880, map: cableLay(), metalness: .8, roughness: .42,
    emissive: 0x15130f});
  const up = new THREE.Vector3(0, 1, 0), span = new THREE.Vector3();
  const pieces = Array.from({length: steps}, () => {
    const piece = new THREE.Mesh(card, material); piece.frustumCulled = false; piece.castShadow = true; group.add(piece); return piece;
  });
  return {group, material, card, steps, lay(points, radius, tight) {
    pieces.forEach((piece, k) => {
      const a = points[k], b = points[k + 1];
      span.subVectors(b, a);
      const length = span.length();
      piece.position.addVectors(a, b).multiplyScalar(.5);
      // Pieces overlap a little, so the rope never shows a gap at a bend.
      piece.scale.set(radius, Math.max(length + radius * .6, .001), radius);
      if (length > 1e-6) piece.quaternion.setFromUnitVectors(up, span.divideScalar(length));
    });
    // Pulled straight it shines along its length; slack it is duller and greasy.
    material.color.setHex(tight ? 0xb2ada3 : 0x7d786f);
    material.roughness = tight ? .3 : .5;
  }};
}

// High Jump's bar: a sooty gas pipe on two sliding collars, with a row of burner nozzles along its top and a wall of
// flames that rise from blue roots at the nozzles to ragged orange tips. One flame sheet across the pipe and a second
// just behind it, so the fire has depth; each is a single drawing (two draws for the whole bar).
export const FLAME_BAR = Object.freeze({height: 1.9, pipe: .12});
export function createFlameBar(line) {
  const group = new THREE.Group(), {posts, halfWidth} = line.bar;
  group.name = 'High Jump flame bar';
  const steel = new THREE.MeshStandardMaterial({color: 0x494442, roughness: .73, metalness: .5});
  for (const point of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.27, 15, .34), steel);
    post.position.set(point.x, point.y + 7.5, point.z);
    group.add(post);
  }
  const flame = new THREE.Group(); flame.name = 'High Jump gas pipe';
  const width = halfWidth * 2;
  const soot = new THREE.MeshStandardMaterial({color: 0x2b2522, roughness: .8, metalness: .55, emissive: 0x3a1204, emissiveIntensity: .6});
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(FLAME_BAR.pipe, FLAME_BAR.pipe, width, 14).rotateZ(Math.PI / 2), soot);
  pipe.name = 'High Jump gas pipe body'; pipe.castShadow = true;
  flame.add(pipe);
  // The collars slide on the posts; the feed hose drops from one end.
  for (const side of [-1, 1]) {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(.5, .46, .56), steel);
    collar.position.set(side * halfWidth, 0, 0); flame.add(collar);
  }
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 8), new THREE.MeshStandardMaterial({color: 0x161412, roughness: .9}));
  hose.position.set(-halfWidth + .35, -.85, .12); flame.add(hose);
  const nozzleCount = Math.max(6, Math.round(width / .45));
  const nozzles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .045, .12, 8), steel, nozzleCount);
  const place = new THREE.Matrix4();
  for (let i = 0; i < nozzleCount; i++) nozzles.setMatrixAt(i, place.makeTranslation(-halfWidth + (i + .5) * width / nozzleCount, FLAME_BAR.pipe + .04, 0));
  nozzles.name = 'High Jump burner nozzles';
  flame.add(nozzles);
  const material = new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uSeed: {value: 0}, uLength: {value: width}, uGain: {value: 1}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D uNoise;uniform float uTime;uniform float uSeed;uniform float uLength;uniform float uGain;varying vec2 vUv;
      void main(){
        float y=vUv.y, x=vUv.x*uLength;
        float a=texture2D(uNoise,vec2(x*.16+uSeed,y*.55-uTime*.9)).r;
        float b=texture2D(uNoise,vec2(x*.42-uSeed*1.3,y*1.1-uTime*1.9)).b;
        float lick=a*.7+b*.5;
        // A tongue over every nozzle that sways and breaks up as it rises.
        float cell=fract(x/.45+(a-.5)*.9*y+.5)-.5;
        float tongue=1.0-smoothstep(.12,.5,abs(cell)*(1.0+y*1.6));
        float top=.25+.75*mix(tongue,lick,.45)*(.65+.55*lick);
        float body=clamp((top-y)/.28,0.0,1.0)*smoothstep(0.0,.04,y);
        body*=smoothstep(0.0,.25,vUv.x*uLength)*smoothstep(0.0,.25,(1.0-vUv.x)*uLength);
        vec3 colour=mix(vec3(.75,.1,.01),vec3(1.0,.45,.06),smoothstep(.1,.5,body));
        colour=mix(colour,vec3(1.0,.86,.5),smoothstep(.55,.95,body)*(1.0-y));
        // The roots at the nozzles burn blue.
        float root=1.0-smoothstep(.0,.09,y);
        colour=mix(colour,vec3(.25,.4,1.0),root*.75);
        gl_FragColor=vec4(colour*body*uGain,body*uGain);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const sheet = new THREE.PlaneGeometry(width, FLAME_BAR.height).translate(0, FLAME_BAR.height / 2 + FLAME_BAR.pipe, 0);
  const sheets = [0, 1].map(k => {
    const mesh = new THREE.Mesh(sheet, material);
    mesh.name = 'High Jump flames'; mesh.position.z = k ? -.16 : .02; mesh.renderOrder = 6; mesh.frustumCulled = false;
    mesh.onBeforeRender = () => { material.uniforms.uSeed.value = k * .37; material.uniforms.uGain.value = k ? .55 : .85; material.uniformsNeedUpdate = true; };
    flame.add(mesh);
    return mesh;
  });
  flame.position.set((posts[0].x + posts[1].x) / 2, 0, (posts[0].z + posts[1].z) / 2);
  flame.rotation.y = line.crest.heading;
  group.add(flame);
  return {group, flame, sheets, material, update(now) {
    material.uniforms.uTime.value = now * .001;
    soot.emissiveIntensity = .5 + .2 * Math.sin(now * .011);
  }};
}
