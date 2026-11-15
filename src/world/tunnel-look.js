// How a bored tunnel is drawn (MACHINE-BORER; Claude's drawing). Everything is drawn in code: no model file and no picture file.
//
// Inside, the sun does not reach. The lining makes its own light: a lamp at the crown every 14 m with dark between, the grey of day
// for a few lengths in from an open mouth, and the beam of the player's headlights. It wears what a scrap-built bore would: steel
// liner plates bolted ring by ring (one ring a metre, as Odessa says), rust run down from the joints, dust up the lower walls, an
// air duct and the lamps' cable along the crown, a water pipe on one wall, and a floor of packed muck with two wheel ruts.
//
// The lining's mesh (createTunnelMesh in src/world/scablands-ground-look.js) gives each corner two measures in metres: how far along
// the bore it is, and how far round the arch from one edge of the floor. This file reads only those and the place in the world.
// Nothing here changes race state.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapNoise} from './scrap-look.js';

export const TUNNEL_LAMP_EVERY = 14;
const FLOOR_ANGLE = Math.asin(.55);
// Metres round the arch from one edge of the floor, over the crown, to the other, for a bore of this radius.
export const tunnelArchLength = radius => (Math.PI + 2 * FLOOR_ANGLE) * radius;

const VERTEX = `
  varying vec2 vTunnel; varying vec3 vWorld;
  void main(){
    vTunnel=uv; vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz;
    gl_Position=projectionMatrix*viewMatrix*world;
  }`;

const FRAGMENT = `
  uniform sampler2D uNoise; uniform float uRadius; uniform float uArch;
  uniform vec3 uCar; uniform vec2 uForward; uniform float uHeadlights;
  uniform vec4 uMouths[4]; uniform vec3 uDay;
  varying vec2 vTunnel; varying vec3 vWorld;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    float d=vTunnel.x,a=vTunnel.y;
    vec3 px=dFdx(vWorld),py=dFdy(vWorld);
    vec3 n=normalize(cross(px,py));
    float pix=sqrt(dot(px,px)+dot(py,py))+1e-5;
    float isFloor=smoothstep(.6,.8,n.y);
    // The closed face at the end of a bore: every corner of it is the same distance along.
    float isFace=(1.0-isFloor)*(1.0-smoothstep(.02,.08,length(vec2(dFdx(d),dFdy(d)))/pix));
    vec3 big=texture2D(uNoise,vec2(d,a)*.031).rgb;
    vec3 fine=texture2D(uNoise,vec2(d,a)*.37+3.1).rgb;
    vec3 grit=texture2D(uNoise,vec2(d,a)*2.3).rgb;
    float near=1.0-smoothstep(.02,.07,pix),mid=1.0-smoothstep(.12,.4,pix);

    // ---- The arch: liner plates, one ring a metre, each ring's plates set half a plate round from the last.
    float ring=floor(d),plate=1.57;
    float around=a/plate+.5*mod(ring,2.0);
    float shade=hash(vec2(ring,floor(around)));
    vec3 steel=mix(vec3(.105,.1,.098),vec3(.15,.138,.128),shade);
    vec3 rust=mix(vec3(.15,.085,.055),vec3(.2,.115,.07),fine.g);
    vec3 wall=mix(steel,rust,smoothstep(.4,.85,big.r*.75+fine.r*.4+shade*.12));
    // Pressed ribs across each plate, seen only near.
    wall*=1.0+.07*sin(a*39.0)*near;
    // Joints: a dark line where rings and plates meet, a worn bright edge beside it, bolts along the ring joints.
    float jd=abs(fract(d)-.5)*2.0,ja=abs(fract(around)-.5)*2.0;
    float wd=.05+pix*1.5,wa=(.05+pix*1.5)/plate;
    float joint=max(smoothstep(1.0-wd,1.0,jd),smoothstep(1.0-wa,1.0,ja))*mid;
    float edge=max(smoothstep(1.0-wd*2.6,1.0-wd*1.3,jd)*(1.0-smoothstep(1.0-wd*1.3,1.0-wd,jd)),0.0)*mid;
    wall=mix(wall,wall*.32,joint*.85)+vec3(.05,.045,.04)*edge;
    float bolt=(1.0-smoothstep(.018,.03,length(vec2((fract(d+.5)-.5)-sign(fract(d+.5)-.5)*.07,(fract(a/.27)-.5)*.27))))*near;
    wall=mix(wall,vec3(.07,.06,.055),bolt*.8);
    // Rust runs down the wall from the joints, and dust lies up the lower plates.
    float run=texture2D(uNoise,vec2(d*2.7,a*.11)).b;
    wall=mix(wall,vec3(.17,.09,.05),smoothstep(.56,.8,run)*.45);
    float low=1.0-smoothstep(.0,1.9,min(a,uArch-a));
    wall=mix(wall,vec3(.2,.185,.16)*(.8+.4*grit.g),low*.7);

    // ---- What hangs in it. The air duct along the crown, a little to one side: a long bag, seamed every 5 m.
    float bagAt=uArch*.5+.95,bag=(a-bagAt)/.44;
    float emit=0.0;
    if(abs(bag)<1.0){
      float body=sqrt(1.0-bag*bag);
      vec3 cloth=vec3(.33,.27,.12)*(.42+.58*body)*(.75+.4*fine.g);
      cloth*=1.0-.5*smoothstep(.9,1.0,abs(fract(d/5.0)-.5)*2.0+pix*.3);
      wall=mix(wall,cloth,smoothstep(1.0,.9,abs(bag)));
    }
    // The water pipe on one wall, in brackets every 3 m.
    float pipe=(a-1.55)/.115;
    if(abs(pipe)<1.6){
      float body=sqrt(max(0.0,1.0-pipe*pipe));
      vec3 iron=vec3(.2,.21,.21)*(.35+.9*body)+vec3(.12)*smoothstep(.75,.95,body)*smoothstep(-.6,.2,-pipe);
      float bracket=smoothstep(.93,.97,abs(fract(d/3.0)-.5)*2.0)*step(abs(pipe),1.6);
      wall=mix(wall,iron,step(abs(pipe),1.0));
      wall=mix(wall,vec3(.08,.07,.065),bracket);
    }
    // The lamps' cable on the other wall, sagging between hooks 2 m apart.
    float cable=abs(a-(uArch-2.05+.16*pow(sin(d*.5236),2.0)));
    wall=mix(wall,vec3(.035),(1.0-smoothstep(.014,.014+pix*1.2,cable))*mid);

    // ---- The floor: packed muck, two ruts, loose stones at the edges. Across the floor the second measure runs from one edge to the other.
    float across=(a/uArch-.5)*1.67*uRadius;
    vec2 fl=vec2(d,across);
    vec3 muck=vec3(.19,.172,.155)*(.7+.5*texture2D(uNoise,mat2(.8,.6,-.6,.8)*fl*.043).g)*(.8+.4*texture2D(uNoise,mat2(.6,.8,-.8,.6)*fl*.61).r);
    float rut=(1.0-smoothstep(.22,.42,abs(abs(across)-.82)));
    muck*=1.0-.34*rut*(.7+.6*fine.b);
    muck=mix(muck,vec3(.3,.27,.23)*(.6+.8*grit.g),smoothstep(.6,1.0,abs(across)/(.835*uRadius))*.6);
    // ---- The face: fresh rock, pale where the cutters have just been, scored in arcs.
    vec3 rock=vec3(.36,.33,.29)*(.55+.9*fine.r)*(.8+.4*big.b);
    rock*=.92+.14*smoothstep(.4,.6,fract(length(vWorld.xy)*1.7+fine.g*.6));
    vec3 albedo=mix(mix(wall,muck,isFloor),rock,isFace);

    // ---- The light. Lamps at the crown, by distance through the bore; day at the mouths; the headlights.
    float lampD=(floor(d/${TUNNEL_LAMP_EVERY}.0)+.5)*${TUNNEL_LAMP_EVERY}.0,lampA=uArch*.5-.75;
    float dd=d-lampD;
    float chord=2.0*uRadius*sin(min(abs(a-lampA)/uRadius,3.1416)*.5);
    float wallDist=dd*dd+chord*chord;
    float floorDist=dd*dd+2.4*uRadius*uRadius+(across+.75)*(across+.75);
    float lampDist=mix(wallDist,floorDist,isFloor);
    vec3 light=vec3(.011,.011,.013)+vec3(1.0,.7,.4)*1.9/(1.0+lampDist/2.6);
    float housing=(1.0-isFloor)*(1.0-isFace)*step(abs(dd),.3)*step(abs(a-lampA),.075);
    for(int i=0;i<4;i++){
      if(uMouths[i].w<.5)continue;
      float reach=distance(vWorld,uMouths[i].xyz);
      light+=uDay*(.5*exp(-reach/(2.4*uRadius))+.03*exp(-reach/(9.0*uRadius)));
    }
    vec3 toward=vWorld-uCar;
    float along=dot(toward.xz,uForward);
    float aside=max(0.0,dot(toward,toward)-along*along);
    float beam=smoothstep(.5,4.0,along)*exp(-aside/(.1*along*along+5.0))/(1.0+along*along/1100.0);
    light+=vec3(1.0,.95,.82)*1.05*beam*uHeadlights;
    gl_FragColor=vec4(albedo*light+vec3(2.6,1.9,1.05)*housing,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// The lining's surface for one bore radius. `update` is given, each frame, where the player's car is and which way it faces, and
// the open mouths: [{x, y, z}] (up to four, the nearest first is best).
export function createTunnelLook({radius = 3} = {}) {
  const uniforms = {
    uNoise: {value: scrapNoise()}, uRadius: {value: radius}, uArch: {value: tunnelArchLength(radius)},
    uCar: {value: new THREE.Vector3(0, -1e4, 0)}, uForward: {value: new THREE.Vector2(0, 1)}, uHeadlights: {value: 1},
    uMouths: {value: Array.from({length: 4}, () => new THREE.Vector4())}, uDay: {value: new THREE.Color(.78, .82, .9)},
  };
  const material = new THREE.ShaderMaterial({uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide, fog: false});
  material.name = 'Tunnel lining';
  function update({car = null, forward = null, mouths = null, headlights = 1, day = null} = {}) {
    if (car) uniforms.uCar.value.set(car.x, car.y, car.z);
    if (forward) { const length = Math.hypot(forward.x, forward.z) || 1; uniforms.uForward.value.set(forward.x / length, forward.z / length); }
    uniforms.uHeadlights.value = headlights;
    if (day) uniforms.uDay.value.copy(day);
    if (mouths) for (let i = 0; i < 4; i++) {
      const mouth = mouths[i];
      if (mouth) uniforms.uMouths.value[i].set(mouth.x, mouth.y, mouth.z, 1); else uniforms.uMouths.value[i].set(0, 0, 0, 0);
    }
  }
  function setRadius(value) { uniforms.uRadius.value = value; uniforms.uArch.value = tunnelArchLength(value); }
  return {material, uniforms, update, setRadius};
}

// ---- The portal ---------------------------------------------------------------------------------------------------------------------------
// What stands at an open mouth: three steel arch ribs set out from the rock, timber lagging laid over them with gaps where boards
// have gone, a sill beam across the floor at each rib, warning stripes on the outermost rib, and a board over the crown for the
// machine's name. In the mouth's own frame: the bore's centre line at the origin, y up, z pointing out of the hill. One geometry
// with a colour at every corner, for a plain rough material lit by the sun.
export function tunnelPortalShape(radius = 3, seed = 7) {
  const parts = [], R = radius + .16, from = -FLOOR_ANGLE, sweep = Math.PI + 2 * FLOOR_ANGLE, pieces = 16;
  const rand = (a, b) => { const v = Math.abs(Math.sin(a * 12.9898 + b * 78.233 + seed) * 43758.5453) % 1; return v; };
  const tint = (geometry, r, g, b) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry, values = new Float32Array(flat.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = r; values[i + 1] = g; values[i + 2] = b; }
    flat.setAttribute('color', new THREE.BufferAttribute(values, 3)); flat.deleteAttribute('uv');
    return flat;
  };
  const ribs = [.35, 1.6, 2.85];
  ribs.forEach((z, rib) => {
    for (let piece = 0; piece < pieces; piece++) {
      const angle = from + sweep * (piece + .5) / pieces, length = sweep * R / pieces + .06;
      const box = new THREE.BoxGeometry(.24, length, .22).rotateZ(angle).translate(Math.cos(angle) * R, Math.sin(angle) * R, z);
      const outer = rib === ribs.length - 1, t = rand(rib, piece);
      // The outermost rib is painted in warning stripes, faded and chipped; the others are bare rusted steel.
      if (outer && piece % 2 === 0) parts.push(tint(box, .46 - .14 * t, .36 - .12 * t, .1));
      else if (outer) parts.push(tint(box, .07 + .03 * t, .065 + .03 * t, .06));
      else parts.push(tint(box, .23 + .08 * t, .125 + .04 * t, .08 + .02 * t));
    }
    // A sill of squared timber across the floor under each rib.
    parts.push(tint(new THREE.BoxGeometry(2 * .835 * radius + .5, .22, .3).translate(0, -.55 * radius - .02, z), .3, .25, .2));
  });
  // Lagging: boards along the bore, laid over the ribs round the arch. Some are missing, some have slipped.
  const boards = Math.round(sweep * (R + .15) / .42), span = ribs.at(-1) - ribs[0] + .7;
  for (let board = 0; board < boards; board++) {
    const t = rand(board, 41), u = rand(board, 57);
    if (t < .13) continue;
    const angle = from + sweep * (board + .5) / boards, out = R + .16;
    const plank = new THREE.BoxGeometry(.05, .36, span * (u < .2 ? .7 : 1)).rotateZ(angle)
      .translate(Math.cos(angle) * out, Math.sin(angle) * out, ribs[0] - .35 + span / 2 - (u < .2 ? span * .15 : 0) + (t - .5) * .2);
    const grey = .3 + .16 * u;
    parts.push(tint(plank, grey, grey * .9, grey * .76));
  }
  // The name board over the crown, on two short hangers.
  parts.push(tint(new THREE.BoxGeometry(2.6, .55, .07).translate(0, R + .75, ribs.at(-1) + .16), .34, .3, .24));
  for (const x of [-1, 1]) parts.push(tint(new THREE.BoxGeometry(.07, .5, .07).translate(x, R + .3, ribs.at(-1) + .16), .2, .12, .08));
  const geometry = mergeGeometries(parts);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function tunnelPortalSurface() {
  return new THREE.MeshStandardMaterial({vertexColors: true, roughness: .95, metalness: .05});
}
