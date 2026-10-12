// Small soft lights for a night circuit: the bulbs of a lantern string, the lamps on a
// boat, the glow of a neon sign, the Lantern Tower's lamp and the heads of the street
// lamps. A circuit asks for them in its definition (`glows` for lights fixed on a kit
// piece, `streetLight` for the street lamps); a circuit that does not ask gets nothing.
// Drawing only: one additive point cloud, no real lights, nothing here changes race
// state. A light never grows to a big ball close to the camera: it stops growing at
// about thirty pixels and fades out inside a few metres.
import * as THREE from 'three';
import { renderedGroundHeight } from './rendered-ground.js';
import { basinReach } from './circuit-hills.js';
import { lakeLevel } from './circuit-effects.js';
import { planWaterside } from './waterside-scenery.js';

const VERTEX = `
attribute vec3 tint; attribute float size;
uniform float pixelScale;
varying vec3 vTint; varying float vFade;
void main(){
  vec4 view=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*view;
  float distance=max(-view.z,.1);
  float pixels=size*pixelScale/distance;
  // Small and far: keep two pixels and give the missing size back as less light.
  vFade=smoothstep(1.5,6.0,distance)*min(1.0,pixels/2.5);
  gl_PointSize=clamp(pixels,2.5,30.0);
  vTint=tint;
}`;
const FRAGMENT = `
varying vec3 vTint; varying float vFade;
void main(){
  vec2 c=gl_PointCoord*2.0-1.0;
  float r2=dot(c,c);
  float light=(exp(-r2*16.0)+.3*exp(-r2*3.0))*(1.0-smoothstep(.7,1.0,sqrt(r2)));
  gl_FragColor=vec4(vTint*light*vFade,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const colourOf = value => new THREE.Color(value);

// The look of street lamp number `index` at `s`: through the sodium stretch most lamps burn warm
// white and every `sodium.mix`-th burns sodium orange; elsewhere the cooler white.
export function lampLook(street, s, index) {
  const sodium = street.sodium;
  if (sodium && s >= sodium.from && s <= sodium.to) return sodium.mix && index % sodium.mix ? sodium.warm ?? street.white : sodium;
  return street.white;
}

// Where a point on a placed kit piece (metres in the piece's own frame) stands in the world.
function pieceFrame(course, entry) {
  const ground = course.groundAt(entry.s, entry.lateral);
  let height = ground.y;
  try { height = renderedGroundHeight(course, { ...ground, s: entry.s, off: entry.lateral }, { requireSurface: true }); } catch { /* keep the road height */ }
  if (!Number.isFinite(height)) height = ground.y;
  const angle = ground.heading + (entry.heading ?? 0), cos = Math.cos(angle), sin = Math.sin(angle);
  const scale = Array.isArray(entry.scale) ? entry.scale : [entry.scale ?? 1, entry.scale ?? 1, entry.scale ?? 1];
  return { x: ground.x, y: height + (entry.lift ?? 0), z: ground.z, cos, sin, scale };
}
const pointOf = (frame, [px, py, pz]) => {
  const x = px * frame.scale[0], y = py * frame.scale[1], z = pz * frame.scale[2];
  return [frame.x + x * frame.cos + z * frame.sin, frame.y + y, frame.z - x * frame.sin + z * frame.cos];
};

export function addNightGlows(group, course) {
  const def = course.def, rules = def.glows ?? [], street = def.streetLight;
  if (!rules.length && !street && !def.waterside) return null;
  const positions = [], tints = [], sizes = [];
  const colour = new THREE.Color();
  const add = (point, hex, size, strength) => {
    colour.set(hex);
    positions.push(point[0], point[1], point[2]);
    tints.push(colour.r * strength, colour.g * strength, colour.b * strength);
    sizes.push(size);
  };

  // Lights fixed on kit pieces.
  const placements = def.kitPlacements ?? [];
  for (const rule of rules) {
    const colours = [].concat(rule.colour), basins = rule.reflect ? (def.basins ?? []) : [];
    let n = 0;
    for (const entry of placements) {
      if (entry.id !== rule.piece) continue;
      const frame = pieceFrame(course, entry);
      let basin = null;
      if (basins.length) basin = basins.find(item => basinReach(item, entry.s - item.s, entry.lateral - item.lateral) < 1);
      for (const point of rule.points) {
        const world = pointOf(frame, point), hex = colours[(n++) % colours.length];
        add(world, hex, rule.size, rule.strength);
        // A dim copy on the water below the boat's light.
        if (basin) add([world[0], lakeLevel(course, basin) + .05, world[2]], hex, rule.size * 2.2, rule.strength * (rule.reflect ?? .3));
      }
    }
  }

  // The street lamps stand every `every` metres on both sides (src/scene-lighting.js lays them
  // out the same way); a light-coloured head halo on each, sodium through the old town.
  if (street) {
    const every = street.every ?? 40, count = Math.floor(course.length / every);
    for (let i = 0; i < count; i++) {
      const s = i * every;
      if ((course.themeAt?.(s) || def.theme) !== 'city') continue;
      const width = course.roadHalfWidthAt(s), look = lampLook(street, s, i);
      for (const side of [-1, 1]) {
        const head = course.groundAt(s, side * (width - 2)), pole = course.groundAt(s, side * (width + 3.4));
        add([head.x, pole.y + 10.2, head.z], look.colour, street.haloSize ?? 2.4, street.haloStrength ?? .7);
      }
    }
  }

  // Riding lights, pier and lighthouse lamps and the tall harbour street lamps (src/waterside-scenery.js).
  if (def.waterside) for (const item of planWaterside(course).lights) add(item.point, item.colour, item.size, item.strength);

  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('tint', new THREE.Float32BufferAttribute(tints, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const pixelScale = { value: 600 };
  const material = new THREE.ShaderMaterial({ name: 'Night glows', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { pixelScale }, vertexShader: VERTEX, fragmentShader: FRAGMENT });
  const size = new THREE.Vector2();
  const mesh = new THREE.Points(geometry, material);
  mesh.name = 'night-glows'; mesh.renderOrder = 4; mesh.frustumCulled = false;
  mesh.userData.excludeAmbientOcclusion = true;
  mesh.onBeforeRender = (renderer, scene, camera) => {
    renderer.getDrawingBufferSize(size);
    pixelScale.value = size.y * .5 * camera.projectionMatrix.elements[5];
    material.uniformsNeedUpdate = true;
  };
  group.add(mesh);
  return { lights: sizes.length };
}
