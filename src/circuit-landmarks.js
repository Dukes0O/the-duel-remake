// Authored circuit structures: presentation only, grounded in the actual world.
import * as THREE from 'three';
import {renderedGroundHeight} from './rendered-ground.js';
import {registerSceneSystem} from './scene-systems.js';

function weatheredMaterial(name, color, metalness = 0) {
  const material = new THREE.MeshStandardMaterial({name, color, metalness, roughness: .83});
  material.customProgramCacheKey = () => 'circuit-landmark-weathered-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCircuitDetail;').replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvCircuitDetail=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCircuitDetail;').replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat wear=.5+.5*sin(vCircuitDetail.y*19.7+vCircuitDetail.x*13.3+sin(vCircuitDetail.z*11.1));\ndiffuseColor.rgb*=.83+.17*wear;');
  };
  return material;
}
// Ardennes rubble stone (ARDENNES-STAVELOT-STONE): courses of grey-brown stones of varied length in darker mortar,
// drawn in world space so every wall, whatever its size, shows stones of the same scale.
function rubbleMaterial(name, color) {
  const material = new THREE.MeshStandardMaterial({name, color, roughness: .94});
  material.customProgramCacheKey = () => 'circuit-landmark-rubble-v2';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      `#include <common>
varying vec3 vRubbleWorld;
varying vec3 vRubbleNormal;`).replace('#include <worldpos_vertex>',
      `#include <worldpos_vertex>
vec4 rubbleWorld=vec4(transformed,1.0);
vec3 rubbleNormal=objectNormal;
#ifdef USE_INSTANCING
rubbleWorld=instanceMatrix*rubbleWorld;
rubbleNormal=mat3(instanceMatrix)*rubbleNormal;
#endif
vRubbleWorld=(modelMatrix*rubbleWorld).xyz;
vRubbleNormal=normalize(mat3(modelMatrix)*rubbleNormal);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      `#include <common>
varying vec3 vRubbleWorld;
varying vec3 vRubbleNormal;
float rubbleHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`).replace('#include <color_fragment>',
      `#include <color_fragment>
// Stones run along each wall: the horizontal coordinate is the one the wall face spans.
vec3 rn=abs(vRubbleNormal);
float u=rn.x>rn.z?vRubbleWorld.z:vRubbleWorld.x;
float v=vRubbleWorld.y+(rn.y>.7?vRubbleWorld.z:0.0);
float row=floor(v/.27);
float len=.32+.34*rubbleHash(vec2(row,7.0));
float run=u/len+row*.53;
vec2 cell=vec2(floor(run),row);
float shade=.62+.5*rubbleHash(cell);
vec3 tint=mix(vec3(1.0,.96,.9),vec3(.88,.92,.98),rubbleHash(cell+11.0));
float fy=fract(v/.27),fx=fract(run);
float wobble=.05*rubbleHash(floor(vec2(run*3.0,v/.09)));
float edge=min(min(fy,1.0-fy)*1.6,min(fx,1.0-fx)*len*3.2)+wobble;
float mortar=1.0-smoothstep(.04,.11,edge);
diffuseColor.rgb*=mix(shade*tint,vec3(.36,.34,.31),mortar);`);
  };
  return material;
}
// Half-timbered walls (EIFEL-CROWN-C5): pale plaster in a frame of dark oak, as in the Eifel's old villages.
// Drawn in the wall's own metres (the unit box scaled by its instance), so every house shows posts about 1.5 m
// apart, a sill, a floor beam at each storey and a plate under the eaves, with a brace in each bay; the plaster
// takes the instance colour. Faces turned up or down stay plain.
function timberMaterial(name, color) {
  const material = new THREE.MeshStandardMaterial({name, color, roughness: .92});
  material.customProgramCacheKey = () => 'circuit-landmark-half-timber-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      `#include <common>
varying vec3 vTimberPos;
varying vec3 vTimberSize;
varying vec3 vTimberNormal;`).replace('#include <begin_vertex>',
      `#include <begin_vertex>
vec3 timberSize=vec3(1.0);
#ifdef USE_INSTANCING
timberSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
#endif
vTimberSize=timberSize;
vTimberPos=(position+vec3(.5))*timberSize;
vTimberNormal=normal;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      `#include <common>
varying vec3 vTimberPos;
varying vec3 vTimberSize;
varying vec3 vTimberNormal;`).replace('#include <color_fragment>',
      `#include <color_fragment>
vec3 tn=abs(vTimberNormal);
if(tn.y<.5){
  bool alongX=tn.z>tn.x;
  float u=alongX?vTimberPos.x:vTimberPos.z;
  float w=alongX?vTimberSize.x:vTimberSize.z;
  float v=vTimberPos.y, h=vTimberSize.y;
  float bays=max(1.0,floor(w/1.5+.5));
  float bay=w/bays;
  float post=abs(mod(u+bay*.5,bay)-bay*.5);
  float edgeU=min(u,w-u);
  float storeys=max(1.0,floor(h/3.0+.5));
  float storey=h/storeys;
  float rail=abs(mod(v+storey*.5,storey)-storey*.5);
  float timber=0.0;
  float beam=.085;
  if(post<beam||edgeU<.17) timber=1.0;
  if(rail<beam||v<.2||h-v<.2) timber=1.0;
  // A brace rising from each post across the bay, the other way in alternate bays.
  float k=floor(u/bay);
  float local=u-k*bay;
  float within=mod(v,storey);
  float lean=mod(k,2.0)<1.0?local/bay:1.0-local/bay;
  float brace=abs(within-lean*storey*.8-storey*.1);
  if(brace<.07 && within>.2 && within<storey-.2 && local>.15 && local<bay-.15) timber=1.0;
  diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.0,.985,.95),vec3(.045,.032,.024),timber);
}`);
  };
  return material;
}
function block(group, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  return mesh;
}
function rods(group, lines, radius, material, name) {
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius, radius, 1, 6), material, lines.length);
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  lines.forEach(([a, b], i) => {
    direction.subVectors(b, a); transform.position.copy(a).add(b).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    transform.scale.set(1, direction.length(), 1); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
}
function radioMast(height) {
  const group = new THREE.Group(), steel = weatheredMaterial('galvanized lattice steel', 0x68767f, .68);
  const concrete = weatheredMaterial('mast concrete footing', 0x777873);
  const lines = [], wire = [], point = (side, level) => {
    const width = 1.7 - 1.15 * level / height;
    return new THREE.Vector3((side % 2 ? 1 : -1) * width / 2, level, (side < 2 ? 1 : -1) * width / 2);
  };
  for (let side = 0; side < 4; side++) {
    const x = side % 2 ? 1 : -1, z = side < 2 ? 1 : -1;
    block(group, .85, .7, .85, x * .85, .35, z * .85, concrete);
    lines.push([point(side, .7), point(side, height)]);
  }
  const cycle = [0, 1, 3, 2];
  for (let y = 1; y < height; y += 3) for (let face = 0; face < 4; face++) {
    const a = cycle[face], b = cycle[(face + 1) % 4], top = Math.min(height, y + 3);
    lines.push([point(a, y), point(b, top)], [point(b, y), point(a, top)], [point(a, y), point(b, y)]);
  }
  for (const y of [height - 5, height - 2]) {
    lines.push([new THREE.Vector3(-2.1, y, 0), new THREE.Vector3(2.1, y, 0)]);
    for (const x of [-1.8, -1.2, 1.2, 1.8]) lines.push([
      new THREE.Vector3(x, y - .7, -.1), new THREE.Vector3(x, y + .7, -.1)]);
  }
  for (const side of [-1, 1]) for (const z of [-1, 1]) wire.push([
    new THREE.Vector3(side * .4, height * .68, z * .4), new THREE.Vector3(side * 6, .4, z * 6)]);
  rods(group, lines, .065, steel, 'radio lattice and aerials');
  rods(group, wire, .025, steel, 'radio mast guy wires');
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6),
    new THREE.MeshStandardMaterial({name: 'radio beacon', color: 0xb51f16, emissive: 0xb51f16, emissiveIntensity: .7, roughness: .4}));
  beacon.position.y = height; group.add(beacon); return group;
}
// A country town drawn from authored houses (Panorama's valley town, PANORAMA-TOWN, Claude 14 October 2026):
// painted weatherboard houses of one or two storeys under pitched iron roofs, a veranda on posts across the
// front, a brick chimney, a stone footing that takes up the slope, windows that glow at dusk (some stay dark),
// and street lamps. Each part is one instanced mesh, so the whole town is a handful of draw calls. Every house
// stands on the rendered ground at its corners and must clear every road segment.
const TOWN_WALLS = [0xe2d9c3, 0xd8c99a, 0xf0ece2, 0xa9b59a, 0x9fb0b8, 0xb5654d, 0xcfc2a8, 0xe6dfcf];
const TOWN_ROOFS = [0x7d8388, 0x8c4a35, 0x4f5b4c, 0x6b7177, 0x9a9c98];
// Ardennes stone (ARDENNES-STAVELOT-STONE): grey-brown rubble and slate-grey stone, pale blue-stone frames.
const STONE_WALLS = [0x6e665a, 0x625c53, 0x77705f, 0x5a5955, 0x6a645b, 0x5f5d58];
// Eifel plaster: whitewash, cream and a weathered grey-white, with the odd faded ochre.
const PLASTERS = [0x938f84, 0x888372, 0x9c998e, 0x7f7a6a, 0x8f866c, 0x7c7d75];
function gableGeometry() {
  // A unit gable roof: ridge along x at height 1, eaves at y = 0, from z = -0.5 to 0.5, x from -0.5 to 0.5.
  const shape = new THREE.Shape(); shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, 1); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 1, bevelEnabled: false});
  geometry.translate(0, 0, -.5); geometry.rotateY(Math.PI / 2);
  return geometry;
}
// Optional visual streets follow authored station/lateral paths, never the race surface.
function townStreetRows(course, streets) {
  const invalid = () => {throw new Error('Invalid circuit landmark street or missing clear drawn support.');};
  if (!Array.isArray(streets) || streets.length < 1 || streets.length > 3) invalid();
  return streets.map(street => {
    if (!street || !Number.isFinite(street.width) || street.width <= 0 || street.width > 8 ||
        !Array.isArray(street.points) || street.points.length < 2 || street.points.length > 512) invalid();
    for (let i = 0; i < street.points.length; i++) {
      const point = street.points[i];
      if (!point || ![point.s, point.lateral].every(Number.isFinite) || point.s < 0 || point.s >= course.length ||
          i > 0 && point.s <= street.points[i - 1].s) invalid();
    }
    const positions = [], indices = [], rows = [], across = Math.floor(street.width / .5) + 1;
    let previous = null;
    const append = (s, lateral) => {
      const start = positions.length / 3;
      for (let i = 0; i <= across; i++) {
        const point = course.worldAt(s, lateral + street.width * (i / across - .5));
        // Query the exact Float32 x/z that the renderer will draw, not a displaced double proxy.
        const x = Math.fround(point.x), z = Math.fround(point.z), near = course.nearest(x, z);
        if (near.distance < course.roadHalfWidthAt(near.s) + 3) invalid();
        const ground = renderedGroundHeight(course, {x, z, s: near.s, off: near.lateral}, {requireSurface: true});
        if (!Number.isFinite(ground)) invalid();
        positions.push(x, Math.fround(ground + .04), z);
      }
      const end = positions.length / 3 - 1;
      rows.push({start, end, previous});
      if (previous !== null) for (let i = 0; i < across; i++)
        indices.push(previous + i, start + i, previous + i + 1, previous + i + 1, start + i, start + i + 1);
      previous = start;
    };
    for (let i = 1; i < street.points.length; i++) {
      const a = street.points[i - 1], b = street.points[i];
      let length = 0;
      for (const side of [-.5, .5]) {
        const from = course.worldAt(a.s, a.lateral + side * street.width), to = course.worldAt(b.s, b.lateral + side * street.width);
        length = Math.max(length, Math.hypot(to.x - from.x, to.z - from.z));
      }
      // One extra subdivision keeps stored Float32 edges strictly below the sampling bounds.
      const steps = Math.ceil(length) + 1;
      for (let j = i === 1 ? 0 : 1; j <= steps; j++) {
        const fraction = j / steps;
        append(a.s + (b.s - a.s) * fraction, a.lateral + (b.lateral - a.lateral) * fraction);
      }
    }
    if (!indices.length) invalid();
    return {positions, indices, rows};
  });
}
function town(course, spec) {
  const group = new THREE.Group(), houses = spec.houses || [], lamps = spec.lamps || [];
  if (!houses.length || houses.length > 120 || lamps.length > 40) throw new Error('Invalid circuit landmark town.');
  const roofColours = spec.roofColours === undefined ? TOWN_ROOFS : spec.roofColours;
  if (!Array.isArray(roofColours) || spec.roofColours !== undefined &&
      (roofColours.length < 2 || roofColours.length > 3 || roofColours.some(colour => !Number.isSafeInteger(colour) || colour < 0 || colour > 0xffffff)))
    throw new Error('Invalid circuit landmark roof palette.');
  if (spec.houseStyle !== undefined && spec.houseStyle !== 'ardennes-stone' && spec.houseStyle !== 'half-timber') throw new Error('Invalid circuit landmark house style.');
  const stoneStyle = spec.houseStyle === 'ardennes-stone', timberStyle = spec.houseStyle === 'half-timber';
  const streets = spec.streets === undefined ? null : townStreetRows(course, spec.streets);
  const box = new THREE.BoxGeometry(1, 1, 1), gable = gableGeometry(), post = new THREE.CylinderGeometry(.07, .07, 1, 6);
  const walls = stoneStyle ? rubbleMaterial('town rubble stone', 0xffffff) : timberStyle ? timberMaterial('town half-timber plaster', 0xffffff) : weatheredMaterial('town weatherboard', 0xffffff);
  const roofs = stoneStyle || timberStyle ? weatheredMaterial('town roof slate', 0xffffff) : weatheredMaterial('town roof iron', 0xffffff, .45);
  const plain = timberStyle ? weatheredMaterial('town plaster gable', 0xffffff) : walls;
  const frames = weatheredMaterial('town blue stone frames', 0x6d706d);
  const stone = weatheredMaterial('town stone footing', 0x77726a), timber = weatheredMaterial('town dark timber', 0x3b2e25);
  const brick = weatheredMaterial('town chimney brick', 0x7a4232), steel = weatheredMaterial('town lamp post', 0x4d555b, .6);
  const lit = new THREE.MeshStandardMaterial({name: 'town window', color: 0x34302a, roughness: .3});
  const dark = new THREE.MeshStandardMaterial({name: 'town unlit pane', color: 0x1f2326, roughness: .25, metalness: .2});
  const lampGlass = new THREE.MeshStandardMaterial({name: 'town lamp window', color: 0x8a7a5a, roughness: .4});
  const rows = {footings: [], walls: [], roofs: [], verandas: [], posts: [], doors: [], chimneys: [], lit: [], dark: [], poles: [], heads: [], frames: [], gables: [], steps: [], timbers: []};
  const hash = n => {const x = Math.sin(n * 91.7 + 17.3) * 24634.6345; return x - Math.floor(x);};
  const heightAt = (x, z) => {
    const near = course.nearest(x, z);
    if (near.distance < course.roadHalfWidthAt(near.s) + 3) throw new Error('Circuit landmark town hides the road.');
    return renderedGroundHeight(course, {x, z, s: near.s, off: near.lateral});
  };
  houses.forEach((house, i) => {
    const {s, lateral, heading = 0, width = 7, depth = 8, storeys = 1} = house;
    if (![s, lateral, heading, width, depth].every(Number.isFinite) || s < 0 || s >= course.length || !(storeys === 1 || storeys === 2))
      throw new Error('Invalid circuit landmark town house.');
    const centre = course.groundAt(s, lateral), turn = centre.heading + heading;
    const cos = Math.cos(turn), sin = Math.sin(turn);
    let low = Infinity, high = -Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      const x = a * width / 2, z = b * (depth / 2 + (b > 0 ? 2.3 : 0));
      const y = heightAt(centre.x + x * cos + z * sin, centre.z - x * sin + z * cos);
      low = Math.min(low, y); high = Math.max(high, y);
    }
    const footing = Math.max(.35, high - low + .35), floor = low + footing, wall = storeys * 3.0;
    const frame = {x: centre.x, z: centre.z, turn};
    const put = (list, x, y, z, sx, sy, sz, more = {}) => list.push({frame, x, y, z, sx, sy, sz, ...more});
    // Ardennes stone: rubble walls on the same footprint, a steep slate roof with a short overhang and stone
    // gables, no veranda or porch; small windows sit deep in blue-stone surrounds and a stone stack rises from
    // a side wall. The ridge runs front to back, so the gable ends are the front and back walls.
    function stoneHouse() {
      const roofColour = roofColours[Math.floor(hash(i + 40) * roofColours.length)];
      const pitch = Math.min(depth, width) * .78, front = depth / 2, back = -depth / 2;
      // The plinth is the same rubble, a shade darker, so the slope is taken up in stone.
      put(rows.footings, 0, low + footing / 2 - .2, 0, width + .3, footing + .4, depth + .3, {colour: 0x4f4b45});
      put(rows.walls, 0, floor + wall / 2, 0, width, wall, depth, {colour: STONE_WALLS[Math.floor(hash(i) * STONE_WALLS.length)]});
      put(rows.roofs, 0, floor + wall, 0, depth + .5, pitch, width + .35, {colour: roofColour, spin: Math.PI / 2});
      // Stone gable ends: the wall's rubble fills the triangle under the slates, standing a hair past the roof ends
      // (the gable's first scale is the ridge length, as for the roof).
      put(rows.gables, 0, floor + wall - .01, 0, depth + .52, pitch * width / (width + .35), width,
        {colour: STONE_WALLS[Math.floor(hash(i) * STONE_WALLS.length)], spin: Math.PI / 2});
      // The door: dark timber under a stone lintel, with a rubble step from the ground in front up to the floor.
      put(rows.frames, width * .18, floor + 2.2, front + .08, 1.3, .22, .16);
      put(rows.doors, width * .18, floor + 1.05, front + .1, .9, 2.0, .08);
      let stepGround = Infinity;
      for (const [x, z] of [[-.65, 0], [.65, 0], [-.65, .7], [.65, .7], [0, .35]]) {
        const px = width * .18 + x, pz = front + .15 + z;
        stepGround = Math.min(stepGround, heightAt(centre.x + px * cos + pz * sin, centre.z - px * sin + pz * cos));
      }
      const stepHeight = floor - stepGround + .2;
      put(rows.steps, width * .18, stepGround - .2 + stepHeight / 2, front + .5, 1.3, stepHeight, .7, {colour: 0x4f4b45});
      // A small pane just proud of the wall inside a blue-stone surround (lintel, sill and two jambs) that
      // stands 0.15 m out: the opening reads deep. facing: the window is in a side (eave) wall.
      const deepWindow = (list, x, y, z, facing) => {
        const out = Math.sign(facing ? x : z), w = .8, h = 1.0, t = .15;
        const at = (along, up, sAlong, sUp) => facing
          ? put(rows.frames, x + out * t / 2, y + up, z + along, t, sUp, sAlong)
          : put(rows.frames, x + along, y + up, z + out * t / 2, sAlong, sUp, t);
        at(0, h / 2 + .09, w + .36, .18); at(0, -h / 2 - .07, w + .44, .14);
        at(-w / 2 - .09, 0, .18, h); at(w / 2 + .09, 0, .18, h);
        put(list, x + (facing ? out * .02 : 0), y, z + (facing ? 0 : out * .02), facing ? .06 : w, h, facing ? w : .06);
      };
      const across = width > 7.5 ? [-width * .32, -width * .02] : [-width * .28];
      for (let storey = 0; storey < storeys; storey++) for (const x of storey ? [...across, width * .3] : [...across, width * .4]) {
        const glow = hash(i * 7 + storey * 3 + (x > 0 ? 1 : 0)) < .62;
        deepWindow(glow ? rows.lit : rows.dark, x, floor + 1.6 + storey * 3, front + .06, false);
      }
      for (const side of [-1, 1]) deepWindow(hash(i * 11 + side) < .5 ? rows.lit : rows.dark, side * (width / 2 + .06), floor + 1.6, 0, true);
      for (let storey = 0; storey < storeys; storey++) for (const x of [-width * .25, width * .25])
        deepWindow(hash(i * 13 + storey * 5 + (x > 0 ? 1 : 0)) < .6 ? rows.lit : rows.dark, x, floor + 1.6 + storey * 3, back - .06, false);
      // A stone stack against a side wall, rising clear of the steep ridge.
      const stack = pitch + 1.3;
      put(rows.chimneys, -width / 2 + .45, floor + wall - .1 + stack / 2, 0, .8, stack, .9, {colour: STONE_WALLS[Math.floor(hash(i + 7) * STONE_WALLS.length)]});
    }
    // Half-timber: a stone plinth, plaster and dark oak up to a steep slate roof, the gable to the street with
    // its tie beam and king post showing, small windows in dark frames, a plain stone stack.
    function timberHouse() {
      const roofColour = roofColours[Math.floor(hash(i + 40) * roofColours.length)];
      const pitch = Math.min(depth, width) * .85, front = depth / 2, back = -depth / 2;
      const plaster = PLASTERS[Math.floor(hash(i) * PLASTERS.length)];
      put(rows.footings, 0, low + footing / 2 - .2, 0, width + .3, footing + .4, depth + .3, {colour: 0x58544d});
      put(rows.walls, 0, floor + wall / 2, 0, width, wall, depth, {colour: plaster});
      put(rows.roofs, 0, floor + wall, 0, depth + .9, pitch, width + .7, {colour: roofColour, spin: Math.PI / 2});
      // Plaster gable ends under the slates, with the tie beam and king post in oak.
      put(rows.gables, 0, floor + wall - .01, 0, depth + .92, pitch * width / (width + .7), width, {colour: plaster, spin: Math.PI / 2});
      for (const end of [front + .02, back - .02]) {
        put(rows.timbers, 0, floor + wall + .08, end, width, .16, .16);
        put(rows.timbers, 0, floor + wall + pitch * .36, end, .16, pitch * .72, .16);
      }
      put(rows.doors, width * .18, floor + 1.05, front + .1, .95, 2.0, .1);
      put(rows.timbers, width * .18, floor + 2.1, front + .05, 1.25, .2, .2);
      let stepGround = Infinity;
      for (const [x, z] of [[-.65, 0], [.65, 0], [-.65, .7], [.65, .7], [0, .35]]) {
        const px = width * .18 + x, pz = front + .15 + z;
        stepGround = Math.min(stepGround, heightAt(centre.x + px * cos + pz * sin, centre.z - px * sin + pz * cos));
      }
      const stepHeight = floor - stepGround + .2;
      put(rows.steps, width * .18, stepGround - .2 + stepHeight / 2, front + .5, 1.3, stepHeight, .7, {colour: 0x58544d});
      const across = width > 7.5 ? [-width * .32, -width * .02] : [-width * .28];
      for (let storey = 0; storey < storeys; storey++) for (const x of storey ? [...across, width * .3] : [...across, width * .4]) {
        const glow = hash(i * 7 + storey * 3 + (x > 0 ? 1 : 0)) < .62;
        put(rows.timbers, x, floor + 1.55 + storey * 3, front + .03, 1.15, 1.4, .06);
        put(glow ? rows.lit : rows.dark, x, floor + 1.55 + storey * 3, front + .06, .9, 1.15, .06);
      }
      for (const side of [-1, 1]) put(hash(i * 11 + side) < .5 ? rows.lit : rows.dark, side * (width / 2 + .04), floor + 1.55, 0, .08, 1.15, .9);
      for (let storey = 0; storey < storeys; storey++) for (const x of [-width * .25, width * .25])
        put(hash(i * 13 + storey * 5 + (x > 0 ? 1 : 0)) < .6 ? rows.lit : rows.dark, x, floor + 1.55 + storey * 3, back - .05, .9, 1.15, .06);
      const stack = pitch + 1.2;
      put(rows.chimneys, -width / 2 + .45, floor + wall - .1 + stack / 2, 0, .95, stack, 1.0, {colour: 0x3a3834});
    }
    const roofColour = roofColours[Math.floor(hash(i + 40) * roofColours.length)];
    if (stoneStyle) { stoneHouse(); return; }
    if (timberStyle) { timberHouse(); return; }
    put(rows.footings, 0, low + footing / 2 - .2, 0, width + .3, footing + .4, depth + .3);
    put(rows.walls, 0, floor + wall / 2, 0, width, wall, depth, {colour: TOWN_WALLS[Math.floor(hash(i) * TOWN_WALLS.length)]});
    put(rows.roofs, 0, floor + wall, 0, depth + .8, Math.min(depth, width) * .42, width + .8, {colour: roofColour, spin: Math.PI / 2});
    put(rows.verandas, 0, floor + 2.75, depth / 2 + 1.1, width + .2, .12, 2.3, {colour: roofColour});
    // A deck at floor height under the veranda; on a slope its posts run down to the ground like stilts.
    put(rows.doors, 0, floor - .06, depth / 2 + 1.1, width + .2, .12, 2.3);
    for (const x of [-width / 2 + .2, 0, width / 2 - .2]) {
      const z = depth / 2 + 2.1, ground = heightAt(centre.x + x * cos + z * sin, centre.z - x * sin + z * cos) - .1;
      put(rows.posts, x, (ground + floor + 2.7) / 2, z, 1, floor + 2.7 - ground, 1);
    }
    put(rows.doors, width * .18, floor + 1.05, depth / 2 + .03, .95, 2.1, .08);
    const across = width > 7.5 ? [-width * .32, -width * .02] : [-width * .28];
    for (let storey = 0; storey < storeys; storey++) for (const x of storey ? [...across, width * .3] : [...across, width * .4]) {
      const glow = hash(i * 7 + storey * 3 + (x > 0 ? 1 : 0)) < .62;
      put(glow ? rows.lit : rows.dark, x, floor + 1.55 + storey * 3, depth / 2 + .03, 1.15, 1.45, .08);
    }
    for (const side of [-1, 1]) put(hash(i * 11 + side) < .5 ? rows.lit : rows.dark, side * (width / 2 + .03), floor + 1.55, 0, .08, 1.45, 1.25);
    // Back windows: the lower street's houses turn their backs to Conrod Straight, so the town glows from the road.
    for (let storey = 0; storey < storeys; storey++) for (const x of [-width * .25, width * .25])
      put(hash(i * 13 + storey * 5 + (x > 0 ? 1 : 0)) < .6 ? rows.lit : rows.dark, x, floor + 1.55 + storey * 3, -depth / 2 - .03, 1.15, 1.45, .08);
    // The chimney rises from the wall top through the roof slope and stands about 0.9 m clear of it.
    const ridge = Math.min(depth, width) * .42, eave = (width + .8) / 2, chimneyX = -width / 2 + .9;
    const throughRoof = ridge * (1 - Math.abs(chimneyX) / eave) + 1.0;
    put(rows.chimneys, chimneyX, floor + wall - .1 + throughRoof / 2, -depth * .15, .65, throughRoof, .65);
  });
  lamps.forEach(lamp => {
    if (![lamp.s, lamp.lateral].every(Number.isFinite)) throw new Error('Invalid circuit landmark town lamp.');
    const at = course.groundAt(lamp.s, lamp.lateral), y = heightAt(at.x, at.z), frame = {x: at.x, z: at.z, turn: 0};
    rows.poles.push({frame, x: 0, y: y + 3, z: 0, sx: 1.6, sy: 6, sz: 1.6});
    rows.heads.push({frame, x: 0, y: y + 6.15, z: 0, sx: .75, sy: .35, sz: .75});
  });
  const object = new THREE.Object3D(), colour = new THREE.Color();
  const build = (name, geometry, material, list, shadows = true) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((row, i) => {
      const {frame} = row, cos = Math.cos(frame.turn), sin = Math.sin(frame.turn);
      object.position.set(frame.x + row.x * cos + row.z * sin, row.y, frame.z - row.x * sin + row.z * cos);
      object.rotation.set(0, frame.turn + (row.spin || 0), 0); object.scale.set(row.sx, row.sy, row.sz); object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
      if (row.colour !== undefined) mesh.setColorAt(i, colour.set(row.colour));
    });
    mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
  };
  build('town footings', box, stoneStyle ? walls : timberStyle ? plain : stone, rows.footings);
  build('town houses', box, walls, rows.walls);
  build('town roofs', gable, roofs, rows.roofs);
  build('town stone gables', gable, plain, rows.gables);
  build('town oak timbers', box, timber, rows.timbers, false);
  build('town verandas', box, roofs, rows.verandas);
  build('town veranda posts', post, timber, rows.posts);
  build('town doors', box, timber, rows.doors, false);
  build('town chimneys', box, stoneStyle ? walls : timberStyle ? plain : brick, rows.chimneys);
  build('town window frames', box, frames, rows.frames);
  build('town door steps', box, timberStyle ? plain : walls, rows.steps);
  build('town lit windows', box, lit, rows.lit, false);
  build('town dark windows', box, dark, rows.dark, false);
  build('town lamp posts', post, steel, rows.poles);
  build('town lamp heads', box, lampGlass, rows.heads, false);
  if (streets) {
    const gravel = weatheredMaterial('town gravel streets', 0x81796a); gravel.side = THREE.DoubleSide;
    streets.forEach((street, i) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(street.positions, 3));
      geometry.setIndex(street.indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, gravel); mesh.name = 'town street ' + i;
      mesh.receiveShadow = true; mesh.userData.streetRows = street.rows; group.add(mesh);
    });
  }
  return group;
}
// A country town church (Panorama's valley town, PANORAMA-TOWN): painted weatherboard nave under a pitched
// corrugated-iron roof, a square tower at the road end with a shingled spire, tall windows that glow at dusk
// (the world lighting lights any material named 'window'), a dark timber door. Faces the road like the mast.
// Opt-in stone footings sample both real rotated footprints, never analytic ground.
// This is a bounded .5 m sample, not a continuous triangle-intersection proof.
function churchFootprint(course, base) {
  const rectangles = [[-3.9, 3.9, -7.3, 7.3], [-1.9, 1.9, 6.4, 10.2]];
  const cos = Math.cos(base.heading), sin = Math.sin(base.heading), lows = [];
  let top = -Infinity;
  for (const [x0, x1, z0, z1] of rectangles) {
    const nx = Math.ceil((x1 - x0) / .5), nz = Math.ceil((z1 - z0) / .5);
    let low = Infinity;
    for (let ix = 0; ix <= nx; ix++) for (let iz = 0; iz <= nz; iz++) {
      const x = x0 + (x1 - x0) * ix / nx, z = z0 + (z1 - z0) * iz / nz;
      const point = {x: base.x + x * cos + z * sin, z: base.z - x * sin + z * cos};
      const near = course.nearest(point.x, point.z);
      if (near.distance < course.roadHalfWidthAt(near.s) + 1) throw new Error('Circuit landmark hides another road segment.');
      const y = renderedGroundHeight(course, {...point, s: near.s, off: near.lateral}, {requireSurface: true});
      if (!Number.isFinite(y)) throw new Error('Church footprint lacks actual drawn ground support.');
      low = Math.min(low, y); top = Math.max(top, y);
    }
    lows.push(low);
  }
  return {top, lows};
}
function church(height, {stoneWalls = false, footprint = null} = {}) {
  const group = new THREE.Group();
  const boards = stoneWalls ? weatheredMaterial('church weathered stone', 0x747570) : weatheredMaterial('church weatherboard', 0xd8d0bf);
  const iron = weatheredMaterial('church roof iron', 0x6b7177, .45);
  const trim = weatheredMaterial('church dark timber', 0x3a2c22), stone = weatheredMaterial('church stone footing', 0x7a756b);
  const glass = new THREE.MeshStandardMaterial({name: 'church window', color: 0x2d2a26, roughness: .3});
  const nave = {width: 7.2, wall: 5.6, length: 14};
  if (footprint) {
    const depth = .5 + footprint.top - footprint.lows[0] + .2;
    block(group, nave.width + .6, depth, nave.length + .6, 0, .5 - depth / 2, 0, stone).name = 'church nave foundation';
  } else block(group, nave.width + .6, .5, nave.length + .6, 0, .25, 0, stone);
  block(group, nave.width, nave.wall, nave.length, 0, .5 + nave.wall / 2, 0, boards);
  // Pitched roof: a triangular prism along the nave, eaves a little proud of the walls.
  const gable = new THREE.Shape();
  gable.moveTo(-nave.width / 2 - .45, 0); gable.lineTo(nave.width / 2 + .45, 0); gable.lineTo(0, 3.4); gable.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(gable, {depth: nave.length + .8, bevelEnabled: false});
  roofGeometry.translate(0, .5 + nave.wall, -(nave.length + .8) / 2);
  const roof = new THREE.Mesh(roofGeometry, iron); roof.castShadow = roof.receiveShadow = true; group.add(roof);
  // Tall windows down both sides, and a door under the tower.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++)
    block(group, .08, 2.4, 1.0, side * (nave.width / 2 + .02), .5 + 2.9, -nave.length / 2 + 2.6 + i * 3, glass);
  // The tower at the road end (+z), with louvred belfry openings and a spire.
  const tower = {size: 3.4, top: height - 6.5}, front = nave.length / 2 + tower.size / 2 - .4;
  if (footprint) {
    const depth = .5 + footprint.top - footprint.lows[1] + .2;
    block(group, tower.size + .4, depth, tower.size + .4, 0, .5 - depth / 2, front, stone).name = 'church tower foundation';
  } else block(group, tower.size + .4, .5, tower.size + .4, 0, .25, front, stone);
  block(group, tower.size, tower.top, tower.size, 0, .5 + tower.top / 2, front, boards);
  block(group, 1.5, 2.6, .1, 0, 1.8, front + tower.size / 2 + .03, trim);
  block(group, 1.0, 1.8, .1, 0, 4.6, front + tower.size / 2 + .03, glass);
  for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    block(group, x ? .1 : 1.1, 1.3, z ? .1 : 1.1, x * (tower.size / 2 + .03), tower.top - 1.2, front + z * (tower.size / 2 + .03), trim);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(tower.size * .78, 6.5, 4), iron);
  spire.rotation.y = Math.PI / 4; spire.position.set(0, .5 + tower.top + 3.25, front);
  spire.castShadow = spire.receiveShadow = true; group.add(spire);
  block(group, .12, 1.2, .12, 0, .5 + tower.top + 7.0, front, trim);
  block(group, .7, .12, .12, 0, .5 + tower.top + 7.2, front, trim);
  return group;
}
export function scoreboardText(state, title = 'CIRCUIT') {
  const order = state?.field?.order || [];
  const lines = [title, 'RACE CONTROL'];
  if (order.length) for (const row of order.slice(0, 5)) {
    const name = row.you ? 'YOU' : String(row.name || 'RACER').toUpperCase().slice(0, 12);
    lines.push(String(row.position) + '  ' + name);
  } else lines.push('GRID', String((state?.opponents?.length || 0) + 1) + ' CARS');
  return lines.join('\n');
}
function scoreboard(height, title) {
  const group = new THREE.Group(), concrete = weatheredMaterial('timing tower concrete', 0x777e80);
  const frame = weatheredMaterial('timing tower dark steel', 0x27343b, .55);
  block(group, 3.9, height - 1, 3.9, 0, (height - 1) / 2, 0, concrete);
  block(group, 5.1, .5, 5.1, 0, height - .25, 0, frame);
  const material = new THREE.MeshStandardMaterial({name: 'timing display', color: 0xffffff,
    emissive: 0xffffff, emissiveIntensity: .8, roughness: .7});
  let canvas = null, context = null, signature = null;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384;
    context = canvas.getContext('2d');
    if (!context) throw new Error('The timing display cannot draw its field.');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    material.map = material.emissiveMap = texture;
  }
  for (const side of [-1, 1]) {
    const display = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5.25), material);
    display.position.set(0, height - 4, side * 1.98); display.rotation.y = side < 0 ? Math.PI : 0;
    group.add(display);
    block(group, 3.85, 5.6, .08, 0, height - 4, side * 1.95, frame);
  }
  for (const y of [2, 5, 8]) block(group, 4.0, .12, 4.0, 0, y, 0, frame);
  const sync = state => {
    if (!context) return;
    const text = scoreboardText(state, title); if (text === signature) return; signature = text;
    context.fillStyle = '#0b181f'; context.fillRect(0, 0, 256, 384);
    context.strokeStyle = '#59727b'; context.lineWidth = 4; context.strokeRect(4, 4, 248, 376);
    text.split('\n').forEach((line, i) => {
      context.fillStyle = i < 2 ? '#e5b762' : '#c7e5db';
      context.font = i === 0 ? 'bold 30px Arial' : i === 1 ? '16px Arial' : 'bold 26px Arial';
      context.textAlign = 'center'; context.fillText(line, 128, 42 + i * 45, 235);
    }); material.map.needsUpdate = true;
  };
  sync({}); return {group, sync};
}

export function addCircuitLandmarks(world, course) {
  const definitions = course.def.circuitLandmarks || [], systems = [], ids = new Set();
  if (!definitions.length) return null;
  if (!Array.isArray(definitions) || definitions.length > 16) throw new Error('Too many circuit landmarks.');
  const group = new THREE.Group(); group.name = 'Authored circuit landmarks';
  for (const spec of definitions) {
    if (!spec.id || ids.has(spec.id) || !['radio-mast', 'scoreboard', 'church', 'town'].includes(spec.type) || !Number.isFinite(spec.s) || spec.s < 0 || spec.s >= course.length ||
      !Number.isFinite(spec.lateral) || !(spec.height >= 12 && spec.height <= 40)) throw new Error('Invalid circuit landmark.');
    ids.add(spec.id);
    if (spec.type === 'town') {
      // The town grounds and clears each of its own houses and lamps.
      const placed = town(course, spec); placed.name = spec.id; group.add(placed); continue;
    }
    const halfWidth = spec.type === 'radio-mast' ? 6 : spec.type === 'church' ? 10 : 3;
    if (Math.abs(spec.lateral) - halfWidth < course.roadHalfWidthAt(spec.s) + 1) throw new Error('Circuit landmark hides the road.');
    for (const along of [-halfWidth, 0, halfWidth]) for (const side of [-halfWidth, 0, halfWidth]) {
      const at = course.worldAt(spec.s + along, spec.lateral + side), nearest = course.nearest(at.x, at.z);
      if (nearest.distance < course.roadHalfWidthAt(nearest.s) + 1) throw new Error('Circuit landmark hides another road segment.');
    }
    if (spec.type === 'church' && (spec.churchStyle !== undefined && spec.churchStyle !== 'stone' ||
        spec.grounding !== undefined && spec.grounding !== 'footprint')) throw new Error('Invalid church style or grounding.');
    const base = course.groundAt(spec.s, spec.lateral);
    const footprint = spec.type === 'church' && spec.grounding === 'footprint' ? churchFootprint(course, base) : null;
    const detail = spec.type === 'radio-mast' ? {group: radioMast(spec.height)} :
      spec.type === 'church' ? {group: church(spec.height, {stoneWalls: spec.churchStyle === 'stone', footprint})} : scoreboard(spec.height, spec.title || 'CIRCUIT');
    detail.group.position.set(base.x, footprint ? footprint.top : renderedGroundHeight(course, {...base, s: spec.s, off: spec.lateral}), base.z);
    detail.group.rotation.y = base.heading; detail.group.name = spec.id; group.add(detail.group);
    if (detail.sync) systems.push(detail.sync);
  }
  world.add(group); registerSceneSystem(world, {sync: state => systems.forEach(sync => sync(state))});
  return group;
}

// Materials belong to this ready kit owner; keep source assets and placement exact.
export function finishRidgeKitMaterials(owner) {
  const finish=()=>{
    if(owner.status && owner.status!=='ready')return false;
    const finished=new Set();
    owner.group.traverse(mesh=>{
      if(!mesh.isMesh)return;
      for(const material of [].concat(mesh.material||[])){
        if(mesh.userData.trackKitId==='catch-fence'&&!finished.has(material)){
          finished.add(material);if(material.userData.ridgeFenceFinish)continue;
          const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
          material.userData.ridgeFenceFinish=true;
          material.onBeforeCompile=(shader,renderer)=>{
            compile.call(material,shader,renderer);
            shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vRidgeFenceHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRidgeFenceHeight=position.y;');
            shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vRidgeFenceHeight;').replace('#include <map_fragment>','diffuseColor.rgb*=mix(vec3(.34,.38,.39),vec3(.42,.43,.40),1.0-step(.95,vRidgeFenceHeight));');
          };
          material.customProgramCacheKey=()=>key+':ridge-concrete-fence-v1';material.needsUpdate=true;
        }
      }
    });
    return true;
  };
  // Native prepared owners are already ready when world lighting scans once.
  if(owner.status==='ready')return Promise.resolve(finish());
  return owner.ready.then(ready=>ready?finish():false);
}
