// How the dangers on Hot Delivery's ways are drawn (EVERBURN-REMAKE slice 8): the furnace's glass throwing its light on
// the plates, the cold mist in the river bed, and the ash tipped from the Girder Bridge. Written as drawing code, with
// no model file and no picture file. Nothing here changes a rule: each piece is placed by the scene from what the job's
// own rules say (src/world/jobs/furnace-sightings.js, src/world/jobs/ember-rule.js).
import * as THREE from 'three';
import {scrapNoise} from './scrap-look.js';

const PLAIN_VERTEX = `varying vec2 vUv;varying vec3 vWorld;
  void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;

// ---- The furnace's glass ---------------------------------------------------------------------------------------------
// The patch on the ground. It is laid on a ring whose uv runs 0 to 1 across the whole disc (three's RingGeometry), so
// the distance from the middle is read from uv. A hot middle, a hard bright rim as a lens leaves, and dust crossing it.
export function createGlassPatchMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}},
    vertexShader: PLAIN_VERTEX,
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
      void main(){
        float d=length((vUv-.5)*2.0);
        float dust=texture2D(uNoise,vWorld.xz*.035+vec2(uTime*.03,uTime*.011)).r;
        float grain=texture2D(uNoise,vWorld.xz*.22-vec2(uTime*.05,0.0)).g;
        float shimmer=.86+.14*sin(uTime*9.0+dust*12.0);
        // The body of the light, a little brighter at its middle, with a ragged soft edge.
        float body=(1.0-smoothstep(.80,1.0,d+(dust-.5)*.10))*(.62+.55*pow(1.0-d,1.5));
        // The lens's bright rim.
        float rim=smoothstep(.74,.90,d)*(1.0-smoothstep(.90,1.0,d));
        float light=(body*(.80+.35*grain)+rim*.8)*shimmer;
        // A glare thrown on the ground: bright enough to be picked out on the dark plates from a long way off.
        gl_FragColor=vec4(vec3(1.0,.80,.46)*light*1.05,light);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

// The shaft of light from the glass down to its patch, and the flash of the glass itself, which is what a player sees
// from far off. `place(source, target, radius, seconds)` stands the shaft between two points; the shaft is an open tube,
// narrow at the glass and as wide as the patch at the ground, brightest where the eye looks through its middle.
export function createGlassBeam({sourceRadius = 1.6} = {}) {
  const group = new THREE.Group();
  group.name = "The furnace's glass: its shaft and its flash";
  const tube = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true);
  // The tube's own y runs from the ground end (-.5) to the glass (+.5). Its top is narrowed in the shader.
  const shaftMaterial = new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uTop: {value: .05}, uStrength: {value: 1}},
    vertexShader: `uniform float uTop;varying vec3 vNormalView;varying vec3 vView;varying float vAlong;varying vec3 vWorld;
      void main(){
        float along=position.y+.5;vAlong=along;
        vec3 p=vec3(position.x*mix(1.0,uTop,along),position.y,position.z*mix(1.0,uTop,along));
        vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;
        vec4 mv=viewMatrix*world;vView=-mv.xyz;
        vNormalView=normalMatrix*vec3(position.x,0.0,position.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;uniform float uStrength;
      varying vec3 vNormalView;varying vec3 vView;varying float vAlong;varying vec3 vWorld;
      void main(){
        float facing=abs(dot(normalize(vNormalView),normalize(vView)));
        // Dust drifting through the shaft.
        float dust=texture2D(uNoise,vec2(vWorld.x+vWorld.z,vWorld.y)*.018+vec2(uTime*.02,-uTime*.035)).r;
        float body=(.35+.65*pow(facing,1.4))*(.55+.75*dust);
        // It thins toward the ground, where it has spread, and is lost just before it lands.
        float alpha=body*mix(.30,1.0,vAlong)*smoothstep(0.0,.05,vAlong)*.34*uStrength;
        gl_FragColor=vec4(vec3(1.0,.92,.68)*alpha,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const shaft = new THREE.Mesh(tube, shaftMaterial);
  shaft.name = "The glass's shaft of light"; shaft.frustumCulled = false; shaft.renderOrder = 3;
  group.add(shaft);

  // The flash at the glass: a star that always faces the viewer and keeps its size on the screen within limits, so that
  // it can be picked out from two kilometres and does not swallow the mesa from two hundred metres.
  const flashMaterial = new THREE.ShaderMaterial({
    uniforms: {uTime: {value: 0}, uToward: {value: 1}},
    vertexShader: `varying vec2 vUv;
      void main(){
        vUv=uv;
        vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0);
        float size=clamp(-mv.z*.05,5.0,80.0);
        mv.xy+=position.xy*size;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform float uTime;uniform float uToward;varying vec2 vUv;
      void main(){
        vec2 p=(vUv-.5)*2.0;float d=length(p);
        float core=pow(max(0.0,1.0-d),6.0)*2.2;
        float halo=pow(max(0.0,1.0-d),2.4)*.45;
        // Four thin rays, as a bright point throws in the eye.
        float rays=(pow(max(0.0,1.0-abs(p.x)*9.0),2.0)+pow(max(0.0,1.0-abs(p.y)*9.0),2.0))*max(0.0,1.0-d)*.9;
        float flick=.82+.18*sin(uTime*13.0)*sin(uTime*5.1);
        float light=(core+halo+rays)*flick*uToward;
        gl_FragColor=vec4(vec3(1.0,.95,.78)*light,min(1.0,light));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flashMaterial);
  flash.name = "The flash of the furnace's glass"; flash.frustumCulled = false; flash.renderOrder = 4;
  group.add(flash);

  const up = new THREE.Vector3(0, 1, 0), along = new THREE.Vector3(), middle = new THREE.Vector3();
  function place(source, target, radius, seconds, camera = null) {
    along.set(source.x - target.x, source.y - target.y, source.z - target.z);
    const length = along.length() || 1;
    middle.set((source.x + target.x) / 2, (source.y + target.y) / 2, (source.z + target.z) / 2);
    shaft.position.copy(middle);
    shaft.quaternion.setFromUnitVectors(up, along.multiplyScalar(1 / length));
    shaft.scale.set(radius, length, radius);
    shaftMaterial.uniforms.uTop.value = sourceRadius / radius;
    shaftMaterial.uniforms.uTime.value = seconds;
    flash.position.set(source.x, source.y, source.z);
    flashMaterial.uniforms.uTime.value = seconds;
    // The glass is brightest to an eye near the line of its shaft: brightest of all to a car standing in the patch.
    if (camera) {
      const cx = camera.position.x - source.x, cy = camera.position.y - source.y, cz = camera.position.z - source.z;
      const distance = Math.hypot(cx, cy, cz) || 1;
      const toward = -(cx * along.x + cy * along.y + cz * along.z) / distance;
      flashMaterial.uniforms.uToward.value = .45 + .55 * Math.max(0, toward) ** 6;
    }
  }
  return {group, shaft, flash, place,
    dispose() { tube.dispose(); shaftMaterial.dispose(); flash.geometry.dispose(); flashMaterial.dispose(); }};
}

// ---- Cold mist in the river bed --------------------------------------------------------------------------------------
// One material for every sheet. The mist is drawn as a few thin sheets one above another over each patch: the lowest lies
// on the drawn ground where the rule's patch is, and the upper ones are the same shape lifted, each fainter and each
// drifting a little differently, so that a car inside it is half hidden and a car beside it sees its top.
export const MIST_LOOK = Object.freeze({lifts: Object.freeze([0, .45, .95, 1.5, 2.1]), drift: .35});
export function createMistMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}},
    vertexShader: `attribute float layer;varying vec2 vUv;varying vec3 vWorld;varying float vLayer;
      void main(){vUv=uv;vLayer=layer;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;varying float vLayer;
      void main(){
        vec2 drift=vec2(uTime*.012,uTime*.007)*(1.0+vLayer*.6);
        float big=texture2D(uNoise,vWorld.xz*.021+drift+vLayer*.17).r;
        float fine=texture2D(uNoise,vWorld.xz*.085-drift*1.7+vLayer*.31).b;
        float cloud=big*.72+fine*.28;
        // The patch's edge is eaten into by the cloud, and it thins upward.
        vec2 e=min(vUv,1.0-vUv);
        float edge=smoothstep(0.0,.22,min(e.x,e.y)+(cloud-.5)*.16);
        float top=1.0-vLayer*.62;
        float alpha=edge*top*smoothstep(.16+vLayer*.20,.66,cloud)*.74;
        vec3 colour=mix(vec3(.70,.76,.80),vec3(.93,.95,.96),cloud);
        gl_FragColor=vec4(colour,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

// The sheets of one patch. `corners` are the patch's four corners in order round it ({x, z}); `groundAt(x, z)` is the
// drawn ground. Each sheet is cut into strips, so that it follows the bed's floor. The first four vertices are the
// patch's own corners at `lift` above the ground, as the plain drawing had them.
// A fixed unevenness for the mist's top, read from a place, so that the same patch always has the same humps.
const hump = (x, z) => {
  const wave = (a, b, c) => Math.sin(x * a + z * b + c);
  return .5 + .5 * (wave(.071, .043, 1.3) * .5 + wave(-.033, .092, 4.1) * .3 + wave(.151, -.117, 2.2) * .2);
};
export function createMistGeometry(corners, groundAt, lift = .1, strips = 8) {
  const positions = [], uvs = [], layers = [], index = [];
  const at = (u, v) => {
    const ax = corners[0].x + (corners[1].x - corners[0].x) * u, az = corners[0].z + (corners[1].z - corners[0].z) * u;
    const bx = corners[3].x + (corners[2].x - corners[3].x) * u, bz = corners[3].z + (corners[2].z - corners[3].z) * u;
    return {x: ax + (bx - ax) * v, z: az + (bz - az) * v};
  };
  const push = (u, v, rise, layer) => {
    const point = at(u, v);
    positions.push(point.x, groundAt(point.x, point.z) + lift + rise * (.45 + 1.1 * hump(point.x, point.z)), point.z); uvs.push(u, v); layers.push(layer);
  };
  // The patch's own corners first.
  for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) push(u, v, 0, 0);
  MIST_LOOK.lifts.forEach((rise, number) => {
    const layer = number / (MIST_LOOK.lifts.length - 1), start = positions.length / 3;
    for (let j = 0; j <= strips; j++) for (let i = 0; i <= strips; i++) push(i / strips, j / strips, rise, layer);
    for (let j = 0; j < strips; j++) for (let i = 0; i < strips; i++) {
      const q = start + j * (strips + 1) + i;
      index.push(q, q + strips + 1, q + 1, q + 1, q + strips + 1, q + strips + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('layer', new THREE.Float32BufferAttribute(layers, 1));
  geometry.setIndex(index);
  return geometry;
}

// ---- Ash tipped from the Girder Bridge ---------------------------------------------------------------------------------
// The fall fills the box the rule gives (the scene sets the group's place, turn and scale: x is the opening's width, y
// the drop from the deck to the bed, z the opening's length). Its walls and two sheets through its middle carry falling
// streaks; a low skirt at its foot is the cloud where it lands. `update(seconds)` runs it.
export function createAshFall() {
  const group = new THREE.Group();
  group.name = 'Ash falling under the Girder Bridge';
  // Four walls and two sheets through the middle, each a face one unit wide and one tall. `wide` says which of the
  // box's sides a face runs along (0 its x, 1 its z), so that streaks keep their size in metres whatever the box.
  const positions = [], uvs = [], wide = [], normals = [], index = [];
  const face = (ax, az, bx, bz) => {
    const q = positions.length / 3, alongZ = Math.abs(bz - az) > Math.abs(bx - ax) ? 1 : 0;
    positions.push(ax, -.5, az, bx, -.5, bz, bx, .5, bz, ax, .5, az);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1); wide.push(alongZ, alongZ, alongZ, alongZ);
    for (let i = 0; i < 4; i++) normals.push(alongZ ? 1 : 0, 0, alongZ ? 0 : 1);
    index.push(q, q + 1, q + 2, q, q + 2, q + 3);
  };
  face(-.5, -.5, .5, -.5); face(.5, -.5, .5, .5); face(.5, .5, -.5, .5); face(-.5, .5, -.5, -.5);
  face(-.5, 0, .5, 0); face(0, -.5, 0, .5);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('wide', new THREE.Float32BufferAttribute(wide, 1));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(index);
  const scale = new THREE.Vector3(1, 1, 1);
  const make = skirt => new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uScale: {value: scale}, uSkirt: {value: skirt}},
    vertexShader: `attribute float wide;uniform vec3 uScale;uniform float uSkirt;varying vec2 vMetres;varying float vUp;varying float vAcross;varying float vFacing;
      void main(){
        vUp=uv.y;vAcross=uv.x;
        // A face seen edge-on is let go, so that its streaks do not crowd into a dark line.
        vec4 centre=modelViewMatrix*vec4(position,1.0);
        vFacing=abs(dot(normalize(normalMatrix*normal),normalize(centre.xyz)));
        vMetres=vec2(uv.x*mix(uScale.x,uScale.z,wide),vUp*uScale.y);
        vec3 p=position;
        // The cloud at the foot spreads beyond the fall.
        p.xz*=1.0+uSkirt*(1.0-vUp);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uNoise;uniform float uTime;uniform float uSkirt;varying vec2 vMetres;varying float vUp;varying float vAcross;varying float vFacing;
      void main(){
        float fall=uTime*.9;
        float streak=texture2D(uNoise,vec2(vMetres.x*.11,vMetres.y*.016+fall)).b;
        float clump=texture2D(uNoise,vec2(vMetres.x*.045+.3,vMetres.y*.03+fall*.6)).r;
        // Ragged at its sides, thick under the deck, thinning as it nears the bed.
        float side=smoothstep(0.0,.16,min(vAcross,1.0-vAcross)+(clump-.5)*.12);
        // Tipped from the deck in separate pours a few metres wide, each swaying, with clear air between them.
        float pour=texture2D(uNoise,vec2(vMetres.x*.022+.11,uTime*.013+vUp*.05)).r;
        float gap=smoothstep(.50,.63,pour+(clump-.5)*.18)*mix(.55,1.0,vUp);
        float body=smoothstep(.18,.60,streak*.55+clump*.65)*side*gap*mix(.70,1.0,vUp);
        // The cloud where it lands: low, and rolling outward.
        float roll=texture2D(uNoise,vec2(vMetres.x*.05-uTime*.04,vMetres.y*.09+uTime*.02)).r;
        float foot=(1.0-smoothstep(0.0,.34,vUp))*smoothstep(.18,.62,roll)*side;
        float alpha=mix(body,foot*.8,step(.01,uSkirt));
        vec3 colour=mix(vec3(.10,.095,.09),vec3(.36,.34,.31),clump*.7+streak*.3);
        gl_FragColor=vec4(colour,min(1.0,alpha*1.15)*smoothstep(.06,.38,vFacing));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fallMaterial = make(0), skirtMaterial = make(1.6);
  const fall = new THREE.Mesh(geometry, fallMaterial), skirt = new THREE.Mesh(geometry, skirtMaterial);
  fall.name = 'The falling ash'; skirt.name = 'The ash cloud at its foot';
  for (const mesh of [fall, skirt]) { mesh.frustumCulled = false; mesh.renderOrder = 2; group.add(mesh); }
  group.userData.update = seconds => {
    group.getWorldScale(scale);
    fallMaterial.uniforms.uTime.value = seconds; skirtMaterial.uniforms.uTime.value = seconds;
  };
  group.userData.dispose = () => { geometry.dispose(); fallMaterial.dispose(); skirtMaterial.dispose(); };
  return group;
}
