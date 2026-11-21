import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {crowdTexture} from '../stadium-crowd.js';
import {createScrapWear} from '../world/scrap-look.js';
import {BOWL_FLOOR, BOWL_STADIUM, bowlBankHeight, bowlCentre} from './bowl-course.js';
import {createBowlOutsideView} from './bowl-outside-view.js';

// The Bowl's stadium, drawn in code round the course's own floor (BOWL-EXPAND,
// Kyle 11 November: stands, crowd and lights in code; photographed surfaces on
// what a truck drives round). Everything is placed from the course frame, so the
// stands follow the floor wherever the course puts it. Presentation only: nothing
// here is read by the simulation.

const browser = typeof document !== 'undefined';
const FACE = BOWL_FLOOR.outerWallOffset - .5;
const {wallHeight: WALL, fenceHeight: FENCE, rows: ROWS, rowDepth: DEPTH, rowRise: RISE, towerHeight: TOWER} = BOWL_STADIUM;
// BOWL-OUT-LOOK: the stands are drawn where the rules put them (src/bowl/bowl-outside.js), so a truck driving on the
// terraces stands on the drawn rows. Distances `d` are metres out from the wall's face. The walkway behind the wall is
// at the first row's height; each row's tread is at the rules' slope halfway across the row, so a wheel sinks a
// quarter of a riser at the back of a tread and stands as far above it at the front.
const WALK = 1, FIRST = .5 + BOWL_STADIUM.standGap, BACK = FIRST + ROWS * DEPTH, OUTER = BACK + .4;
const LOW = BOWL_STADIUM.firstRowHeight, rowY = row => LOW + (row + .5) * RISE, TOP = rowY(ROWS - 1) + .3;
// Where a gate opens: the first four rows and the walkway are cut away over its throat, so the tunnel starts where
// the stand above it is high enough for a truck; the back wall is open up to the tunnel's lintel across its mouth.
const CUT_ROWS = 4, LINTEL = 4.8;
// The crowd's cleared ring round a truck in the stands, and the band beyond it where people run (BOWL-SHOW-2 section 3).
const CLEAR = 6, RUN = 4;
export const BOWL_STAND = Object.freeze({face: FACE, walk: WALK, first: FIRST, back: BACK, outer: OUTER, low: LOW, top: TOP,
  depth: DEPTH, rows: ROWS, cutRows: CUT_ROWS, lintel: LINTEL, rowY});

const textures = new Map();
// One shared texture per photo; the geometry's own coordinates set its scale.
function photo(path) {
  if (!browser) return null;
  if (!textures.has(path)) {
    const texture = new THREE.TextureLoader().load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.userData.sharedAsset = true;
    textures.set(path, texture);
  }
  return textures.get(path);
}

// A canvas picture, or nothing outside a browser.
function drawn(width, height, paint) {
  if (!browser) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Deterministic noise from integers, for seats, colours and gaps.
const hash = (...values) => {
  let h = 2166136261;
  for (const value of values) { h ^= Math.floor(value * 1000) | 0; h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
};

// Sweep a cross-section round the stadium, outward from the floor's wall face.
// `profile(s)` returns points {d, y, colour}; each pair is its own flat strip.
// `gapAt(s, i)` leaves out the strip from point i to point i + 1 at lap distance s (a gate's opening).
function sweep(course, profile, step = 1, gapAt = null) {
  const positions = [], uvs = [], colours = [], indices = [];
  const samples = [];
  for (let s = 0; s <= course.length + 1e-6; s += step) samples.push(Math.min(s, course.length));
  let previous = null;
  const run = [];
  for (const [index, s] of samples.entries()) {
    const points = profile(s), world = points.map(point => {
      const p = course.worldAt(s, FACE + point.d);
      return new THREE.Vector3(p.x, point.y, p.z);
    });
    if (previous) for (let i = 0; i < world.length; i++) run[i] += world[i].distanceTo(previous[i]); else world.forEach((_, i) => { run[i] = 0; });
    if (index) {
      const middle = (samples[index - 1] + s) / 2;
      for (let i = 0; i < world.length - 1; i++) {
        if (gapAt?.(middle, i)) continue;
        const a = previous[i], b = previous[i + 1], c = world[i], d = world[i + 1];
        const v0 = points[i].v ?? 0, v1 = points[i + 1].v ?? Math.hypot(points[i + 1].d - points[i].d, points[i + 1].y - points[i].y);
        const colour = points[i].colour ?? [1, 1, 1];
        const first = positions.length / 3;
        for (const [p, u, v] of [[a, run.prev?.[i] ?? 0, v0], [b, run.prev?.[i + 1] ?? 0, v1], [c, run[i], v0], [d, run[i + 1], v1]]) {
          positions.push(p.x, p.y, p.z); uvs.push(u / 4, v / 4); colours.push(...colour);
        }
        indices.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
      }
    }
    previous = world;
    run.prev = [...run];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const wallTop = s => WALL + bowlBankHeight(s, FACE);

// How far lap distance s lies from the nearest gate's middle, in metres along the lap.
export function gateDistance(course, s) {
  let best = Infinity;
  for (const gate of course.features.bowl.gates) {
    const d = Math.abs(((s - gate.s) % course.length + 1.5 * course.length) % course.length - course.length / 2);
    best = Math.min(best, d);
  }
  return best;
}
const throatHalf = course => course.features.bowl.gates[0].width / 2;
const mouthHalf = course => course.features.bowl.gates[0].mouthWidth / 2;

// Faded seat colours by section, the way a stadium's blocks were painted long ago.
const SEATS = [[.46, .17, .14], [.2, .27, .35], [.52, .42, .2], [.3, .33, .3]];
function standProfile(course) {
  const sections = Math.round(course.length / 18);
  return s => {
    const place = s / course.length * sections, section = Math.floor(place), seat = SEATS[section % SEATS.length];
    const aisle = (place % 1) < .06, concrete = aisle ? [.92, .9, .86] : [.7, .69, .66];
    // A tunnel mouth every third section: a dark opening over rows 9 to 13, where the crowd comes in.
    const mouth = Math.abs((place % 3) - 1.5) < .1;
    const points = [{d: WALK, y: LOW, colour: concrete}, {d: FIRST, y: LOW, colour: concrete}];
    for (let row = 0; row < ROWS; row++) {
      const d = FIRST + row * DEPTH, y = rowY(row), tint = .82 + .18 * hash(section, row);
      const dark = mouth && row >= 9 && row <= 13, tread = dark ? [.03, .03, .03] : concrete;
      points.at(-1).colour = dark ? tread : aisle ? concrete : seat.map(value => value * tint);
      points.push({d, y, colour: tread}, {d: d + DEPTH, y, colour: tread});
    }
    // A low kerb along the back of the top row, then the back wall down to the car park.
    points.at(-1).colour = [.5, .49, .47];
    points.push({d: BACK, y: TOP, colour: [.45, .44, .42]}, {d: OUTER, y: TOP, colour: [.42, .41, .39]},
      {d: OUTER, y: LINTEL, colour: [.42, .41, .39]}, {d: OUTER, y: 0});
    return points;
  };
}

// The strips a gate leaves out: the walkway and the first rows over its throat, and the back wall below the lintel
// across its mouth (the last strip of the profile).
function standGap(course) {
  const last = 2 * ROWS + 4;
  return (s, i) => {
    const d = gateDistance(course, s);
    return (i <= 2 * CUT_ROWS && d < throatHalf(course)) || (i === last && d < mouthHalf(course));
  };
}

// The steel wall in front of the stands, with its face above the dirt banked against it.
function wallProfile() {
  return s => [{d: 0, y: -.3}, {d: 0, y: wallTop(s)}, {d: 1, y: wallTop(s)}, {d: 1, y: 0}];
}

function chainLink() {
  return drawn(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,165,160,0.95)'; g.lineWidth = 3;
    for (let i = -h; i < w + h; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke();
    }
  });
}

function glowTexture() {
  return drawn(128, 128, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,250,235,1)'); gradient.addColorStop(.18, 'rgba(255,236,200,.75)');
    gradient.addColorStop(.5, 'rgba(255,214,160,.16)'); gradient.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, w, h);
  });
}

// The crowd: one cut-out card per occupied seat, facing the floor, standing up and
// sitting down on its own beat (the vertex shader moves each card). BOWL-OUT-LOOK: each card also knows its seat
// and the way along its row, so the shader can clear the people from round a truck in the stands.
function crowd(course, uniforms) {
  const positions = [], uvs = [], colours = [], phases = [], seats = [], indices = [];
  const throat = s => gateDistance(course, s) < throatHalf(course) + .4;
  const heads = [];
  for (let row = 0; row < ROWS; row++) {
    const d = FIRST + row * DEPTH + DEPTH * .55, y = rowY(row);
    let last = course.worldAt(0, FACE + d), along = 0, next = .3;
    for (let s = 0; s < course.length; s += .08) {
      const p = course.worldAt(s, FACE + d);
      along += Math.hypot(p.x - last.x, p.z - last.z); last = p;
      if (along < next) continue;
      next += .64;
      const sections = Math.round(course.length / 18), place = s / course.length * sections;
      if (place % 1 < .07) continue; // the aisles
      if (row >= 9 && row <= 13 && Math.abs((place % 3) - 1.5) < .1) continue; // the tunnel mouths
      if (row < CUT_ROWS && throat(s)) continue; // the open cut over a gate's tunnel
      // Full near the floor, thinning towards the back, with empty patches.
      const fill = .93 - row * .006 - (hash(Math.floor(place * 3), Math.floor(row / 4)) < .12 ? .5 : 0);
      if (hash(row, Math.round(along * 10)) > fill) continue;
      const sn = Math.sin(p.heading), cs = Math.cos(p.heading);
      const height = 1.72 * (.92 + hash(along, row, 3) * .14), width = height * .375, bottom = y - .55;
      const variant = Math.floor(hash(along, row, 7) * 8), u0 = (variant + .008) / 8, u1 = (variant + .992) / 8;
      const tint = .7 + hash(along, row, 11) * .3, phase = hash(along, row, 13) * 6.283;
      const first = positions.length / 3;
      for (const [across, up, u, v] of [[-.5, 0, u0, 0], [.5, 0, u1, 0], [-.5, 1, u0, 1], [.5, 1, u1, 1]]) {
        positions.push(p.x - sn * across * width, bottom + height * up, p.z - cs * across * width);
        uvs.push(u, v); colours.push(tint, tint, tint); phases.push(phase); seats.push(p.x, p.z, sn, cs);
      }
      indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
      if (hash(along, row, 17) < .022) heads.push(p.x, bottom + height * .92, p.z, phase);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('crowdPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('crowdSeat', new THREE.Float32BufferAttribute(seats, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({map: browser ? crowdTexture() : null, alphaTest: .55, roughness: 1,
    side: THREE.DoubleSide, vertexColors: true});
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float crowdPhase; attribute vec4 crowdSeat;
        uniform float uCrowdTime; uniform float uCrowdCheer; uniform vec3 uCrowdTruck; uniform float uCrowdScatter;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float crowdBeat = sin(uCrowdTime * (2.1 + fract(crowdPhase * 7.3) * 1.6) + crowdPhase);
        transformed.y += max(crowdBeat, 0.0) * max(crowdBeat, 0.0) * (0.08 + 0.32 * uCrowdCheer);
        // Round a truck in the stands: inside CLEAR metres everyone has gone from their places, and out to CLEAR + RUN
        // people run along their rows away from it, the nearest fastest, and lean into the run. Nobody is hit.
        vec2 crowdAway = crowdSeat.xy - uCrowdTruck.xz;
        float crowdDistance = length(vec3(crowdAway.x, (position.y - uCrowdTruck.y) * .7, crowdAway.y));
        float crowdGone = (1.0 - smoothstep(${(CLEAR - .4).toFixed(1)}, ${CLEAR.toFixed(1)}, crowdDistance)) * uCrowdScatter;
        float crowdRun = (1.0 - smoothstep(${CLEAR.toFixed(1)}, ${(CLEAR + RUN).toFixed(1)}, crowdDistance)) * uCrowdScatter * (1.0 - crowdGone);
        vec2 crowdAlong = crowdSeat.zw * (dot(crowdAway, crowdSeat.zw) < 0.0 ? -1.0 : 1.0);
        transformed.xz += crowdAlong * (crowdRun * 2.2 + uv.y * crowdRun * .35);
        transformed.y += abs(sin(uCrowdTime * 13.0 + crowdPhase * 3.0)) * .2 * crowdRun;
        // Those who have gone drop out of sight behind the row in front, whole and upright, never lying down.
        transformed.xz = mix(transformed.xz, crowdSeat.xy, crowdGone * .6);
        transformed.y -= 2.6 * crowdGone;`);
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Bowl crowd';
  mesh.userData.cards = positions.length / 12;
  return {mesh, heads};
}

// Phone lights and camera flashes twinkling in the stands.
function flashes(heads, uniforms) {
  const count = heads.length / 4, positions = new Float32Array(count * 3), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) { positions.set(heads.slice(i * 4, i * 4 + 3), i * 3); phases[i] = heads[i * 4 + 3]; }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float phase; uniform float uCrowdTime; varying float vGlow;
      void main(){ vec4 view = modelViewMatrix * vec4(position, 1.0);
        float beat = sin(uCrowdTime * (0.7 + fract(phase * 3.1) * 1.9) + phase * 5.0);
        vGlow = pow(max(beat, 0.0), 40.0);
        gl_PointSize = (1.0 + 3.0 * vGlow) * 140.0 / max(30.0, -view.z);
        gl_Position = projectionMatrix * view; }`,
    fragmentShader: `varying float vGlow; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c));
        gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * vGlow, a * vGlow); }`});
  const points = new THREE.Points(geometry, material);
  points.name = 'Bowl phone lights';
  points.frustumCulled = false;
  return points;
}

// The Spine: rusted containers end to end, the flame jets' housings on top (bowl-view.js),
// and Big Mo's booth in the middle.
function spine(course, centre, wear) {
  const group = new THREE.Group();
  group.name = 'Bowl Spine';
  const straight = course.features.bowl.ring.straight, count = 6, length = straight / count;
  const corrugation = drawn(256, 32, (g, w, h) => {
    for (let x = 0; x < w; x++) { const v = 128 + 110 * Math.sin(x / w * Math.PI * 2 * 18); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); }
  });
  const colours = [0x6e3626, 0x3d5566, 0x5a5c3d, 0x8a5126, 0x5f6463, 0x5a2c29];
  // The Spine runs along the stadium's long axis, the line between the two ends' middles.
  const a = course.worldAt(10, 0), b = course.worldAt(straight - 10, 0);
  const axis = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(), heading = Math.atan2(axis.x, axis.z);
  for (let i = 0; i < count; i++) {
    const material = wear.apply(new THREE.MeshStandardMaterial({color: colours[i], roughness: .82, metalness: .35,
      map: photo('/assets/textures/scrap-plating.png'), bumpMap: corrugation, bumpScale: 2.2}));
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.44, BOWL_STADIUM.spineHeight, length - .18), material);
    const t = (i + .5) / count - .5;
    box.position.set(centre.x + axis.x * t * straight, BOWL_STADIUM.spineHeight / 2, centre.z + axis.z * t * straight);
    box.rotation.y = heading + (hash(i, 5) - .5) * .02;
    box.name = `Bowl Spine container ${i + 1}`;
    box.castShadow = box.receiveShadow = true;
    group.add(box);
  }
  // A rounded concrete nose at each end, where the Spine's wall rounds past the last
  // container, striped so a driver sees it, with a stack of tyres on top.
  const half = course.features.bowl.spine.halfWidth;
  const stripes = drawn(256, 64, (g, w, h) => {
    g.fillStyle = '#b8b2a4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9a227'; for (let x = -h; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  const noseMaterial = wear.apply(new THREE.MeshStandardMaterial({color: 0xd8d2c4, map: stripes, roughness: .92}));
  const rubber = new THREE.MeshStandardMaterial({color: 0x1b1a19, roughness: .95});
  for (const end of [-1, 1]) {
    const nose = new THREE.Group();
    nose.name = `Bowl Spine nose ${end > 0 ? 'end 1' : 'end 2'}`;
    const block = new THREE.Mesh(new THREE.CylinderGeometry(half, half, 1.25, 20, 1, false, -Math.PI / 2, Math.PI), noseMaterial);
    block.position.y = .625;
    nose.add(block);
    for (let k = 0; k < 4; k++) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(.38, .17, 8, 16), rubber);
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(Math.cos(k * 1.1) * .25, 1.42 + k * .3, .45 + Math.sin(k * 1.1) * .2);
      nose.add(tyre);
    }
    nose.position.set(centre.x + axis.x * end * straight / 2, 0, centre.z + axis.z * end * straight / 2);
    nose.rotation.y = heading + (end > 0 ? 0 : Math.PI);
    group.add(nose);
  }
  // Big Mo's booth on the middle containers, its windows lit.
  const booth = new THREE.Group();
  booth.name = 'Big Mo booth';
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.3, 4.2), wear.apply(new THREE.MeshStandardMaterial({color: 0x4b4136, roughness: .8, metalness: .4,
    map: photo('/assets/textures/scrap-plating.png')})));
  cabin.position.y = 1.15;
  const glass = new THREE.MeshStandardMaterial({color: 0x1a1208, emissive: 0xffb45a, emissiveIntensity: 2.2, roughness: .3});
  for (const side of [-1, 1]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(.06, .9, 3.2), glass);
    window.position.set(side * 1.17, 1.45, 0); booth.add(window);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, .16, 4.8), new THREE.MeshStandardMaterial({color: 0x2e2a26, roughness: .7, metalness: .6}));
  roof.position.y = 2.38;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 4.5, 8), new THREE.MeshStandardMaterial({color: 0x555a5c, metalness: .7, roughness: .5}));
  mast.position.y = 4.5;
  booth.add(cabin, roof, mast);
  for (let k = 0; k < 4; k++) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(.38, .9, 10, 1, true), new THREE.MeshStandardMaterial({color: 0x6d6a60, metalness: .5, roughness: .6, side: THREE.DoubleSide}));
    horn.rotation.z = Math.PI / 2; horn.rotation.y = k * Math.PI / 2;
    horn.position.set(Math.cos(k * Math.PI / 2) * .5, 6.3, -Math.sin(k * Math.PI / 2) * .5);
    booth.add(horn);
  }
  booth.position.set(centre.x, BOWL_STADIUM.spineHeight, centre.z);
  booth.rotation.y = heading;
  group.add(booth);
  return group;
}

// BOWL-OUT-LOOK: big tyres stood on end along the foot of the stand wall and both sides of the Spine, half sunk in the
// dirt, so a truck that hits a wall is seen to hit rubber. Their backs are flush with the walls' faces, where the
// rules turn a truck back (src/bowl/bowl-course.js, BOWL_FLOOR).
function tyreWalls(course) {
  const places = [];
  const row = (from, to, off, side) => {
    let last = null, along = 0;
    for (let s = from; s <= to; s += .1) {
      const p = course.groundAt(s, off);
      if (last) along += Math.hypot(p.x - last.x, p.z - last.z);
      last = p;
      if (along < 1.72 && s > from) continue;
      along = 0;
      if (side > 0 && gateDistance(course, s) < throatHalf(course) + 1) continue;
      places.push({p, side, k: places.length});
    }
  };
  row(0, course.length - 1, FACE - .27, 1);
  const straight = course.features.bowl.ring.straight, spineFace = -(BOWL_FLOOR.wallOffset - .5) + .27;
  for (const start of [0, course.features.bowl.halfLap]) row(start + 1.5, start + straight - 1.5, spineFace, -1);
  const geometry = new THREE.TorusGeometry(.6, .27, 8, 18);
  const tyres = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({color: 0x1e1c1a, roughness: .96, metalness: .02}), places.length);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), size = new THREE.Vector3();
  for (const {p, k} of places) {
    // Turned so each tyre's face looks out over the floor, a little out of line, some sunk deeper than others.
    euler.set((hash(k, 51) - .5) * .12, p.heading + Math.PI / 2 + (hash(k, 52) - .5) * .16, (hash(k, 53) - .5) * .3);
    turn.setFromEuler(euler);
    const scale = .94 + hash(k, 54) * .12;
    size.set(scale, scale, scale);
    matrix.compose(new THREE.Vector3(p.x, p.y + .5 - hash(k, 55) * .12, p.z), turn, size);
    tyres.setMatrixAt(k, matrix);
  }
  tyres.name = 'Bowl tyre walls';
  tyres.castShadow = tyres.receiveShadow = true;
  tyres.userData.count = places.length;
  return tyres;
}

// A floodlight tower: four legs braced into a mast, a lamp bank turned to the floor,
// its halo, and a shaft of light falling through the dust.
function tower(position, target, glow, index) {
  const group = new THREE.Group();
  group.name = `Bowl floodlight tower ${index + 1}`;
  const steel = new THREE.MeshStandardMaterial({color: 0x4b5155, metalness: .75, roughness: .55});
  const legs = [], spread = 3.2;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const leg = new THREE.CylinderGeometry(.16, .22, TOWER, 6).translate(0, TOWER / 2, 0);
    const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-z * .055, 0, x * .055));
    legs.push(leg.applyMatrix4(tilt).translate(x * spread, 0, z * spread));
  }
  for (let level = 4; level < TOWER - 2; level += 5) {
    const width = spread * 2 * (1 - level / TOWER * .78);
    for (let k = 0; k < 4; k++) legs.push(new THREE.BoxGeometry(width, .12, .12).translate(0, level, width / 2).applyMatrix4(new THREE.Matrix4().makeRotationY(k * Math.PI / 2)));
  }
  group.add(new THREE.Mesh(mergeGeometries(legs), steel));
  const head = new THREE.Group();
  head.position.set(0, TOWER + 2, 0);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(12, 6, .5), new THREE.MeshStandardMaterial({color: 0x24282b, metalness: .6, roughness: .6}));
  head.add(panel);
  const lamp = new THREE.MeshStandardMaterial({color: 0xfff3dc, emissive: 0xfff0d0, emissiveIntensity: 5, roughness: .2});
  const lamps = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) lamps.push(new THREE.BoxGeometry(1.1, 1.0, .2).translate(-5.25 + col * 1.5, -2.2 + row * 1.45, .32));
  head.add(new THREE.Mesh(mergeGeometries(lamps), lamp));
  if (glow) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glow, color: 0xfff1d8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .85}));
    halo.scale.set(30, 22, 1); halo.position.z = 1.2; halo.name = 'floodlight halo';
    head.add(halo);
  }
  group.add(head);
  group.position.copy(position);
  // Turn the lamp bank to the floor.
  const look = new THREE.Vector3().subVectors(target, new THREE.Vector3(position.x, position.y + TOWER + 2, position.z));
  head.rotation.order = 'YXZ';
  head.rotation.y = Math.atan2(look.x, look.z);
  head.rotation.x = Math.atan2(-look.y, Math.hypot(look.x, look.z));
  // The beam: a long cone, brightest at the lamps, fading into the dust.
  const length = look.length() * .95;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 26, length, 24, 1, true).translate(0, -length / 2, 0),
    new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: {uLength: {value: length}},
      vertexShader: `uniform float uLength; varying float vAlong; varying vec3 vNormal; varying vec3 vView;
        void main(){ vAlong = -position.y / uLength; vec4 view = modelViewMatrix * vec4(position, 1.0); vView = normalize(-view.xyz);
          vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * view; }`,
      fragmentShader: `varying float vAlong; varying vec3 vNormal; varying vec3 vView;
        void main(){ float edge = pow(abs(dot(vNormal, vView)), 1.6); float fade = (1.0 - vAlong) * smoothstep(0.0, 0.06, vAlong);
          gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * 0.11 * edge * fade, 1.0); }`}));
  beam.name = 'floodlight beam';
  const pivot = new THREE.Group();
  pivot.position.set(0, TOWER + 2, 0);
  pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), look.clone().normalize());
  pivot.add(beam);
  group.add(pivot);
  return group;
}

// A big screen on top of each end stand, drawn as a picture.
function screen(text) {
  const picture = drawn(1024, 512, (g, w, h) => {
    g.fillStyle = '#0b0a09'; g.fillRect(0, 0, w, h);
    const gradient = g.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#3a1408'); gradient.addColorStop(1, '#120604');
    g.fillStyle = gradient; g.fillRect(24, 24, w - 48, h - 48);
    g.fillStyle = '#ffb347'; g.font = 'bold 190px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text[0], w / 2, h * .42);
    g.fillStyle = '#f3e6c8'; g.font = 'bold 74px Arial, sans-serif'; g.fillText(text[1], w / 2, h * .78);
    // Scan lines, as an old screen shows them.
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  });
  const group = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), picture
    ? new THREE.MeshBasicMaterial({map: picture, toneMapped: false}) : new THREE.MeshBasicMaterial({color: 0x331100}));
  face.position.set(0, 9 + 4.5, .3);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(19.2, 10.2, .6), new THREE.MeshStandardMaterial({color: 0x222527, metalness: .6, roughness: .6}));
  frame.position.y = 13.5;
  const legs = mergeGeometries([-6, 6].map(x => new THREE.BoxGeometry(.5, 9, .5).translate(x, 4.5, -.2)));
  group.add(face, frame, new THREE.Mesh(legs, new THREE.MeshStandardMaterial({color: 0x3c4144, metalness: .7, roughness: .5})));
  group.name = 'Bowl big screen';
  return group;
}

function raceGate(course, lane, driver) {
  const gate = new THREE.Group();
  gate.name = `Side by Side ${driver} gate`;
  const at = course.groundAt(lane.s, lane.lateral);
  gate.position.set(at.x, at.y, at.z);
  gate.rotation.y = at.heading;
  const metal = new THREE.MeshStandardMaterial({color: 0x4b3c30, metalness: .6, roughness: .56});
  const support = new THREE.BoxGeometry(.32, 5.6, .4);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(11.5, .48, .6), metal);
  beam.position.y = 5.6;
  gate.add(beam);
  for (const x of [-5.5, 5.5]) {
    const leg = new THREE.Mesh(support, metal);
    leg.position.set(x, 2.8, 0);
    gate.add(leg);
  }
  const lamps = [];
  const geometry = new THREE.BoxGeometry(.64, .44, .69);
  for (const x of [-1.1, 0, 1.1]) {
    const material = new THREE.MeshStandardMaterial({color: 0x302928, emissive: 0x000000, roughness: .35});
    const lamp = new THREE.Mesh(geometry, material);
    lamp.position.set(x, 5.6, 0);
    gate.add(lamp);
    lamps.push(material);
  }
  return {gate, lamps, driver};
}

function updateRaceGates(gates, state, event) {
  const countdown = state.status === 'countdown' ? Math.ceil(state.countdown) : 0;
  for (const {lamps, driver} of gates) {
    for (let index = 0; index < lamps.length; index++) {
      const signal = event.finishWinner ? (event.finishWinner === driver ? 0x5fef8a : 0xec433b)
        : countdown > index ? (countdown === 1 ? 0xffb52e : 0xec433b)
          : countdown === 0 && state.stageTimeSec < 1.2 ? 0x5fef8a : 0;
      lamps[index].color.setHex(signal || 0x302928);
      lamps[index].emissive.setHex(signal);
      lamps[index].emissiveIntensity = signal ? 1.2 : 0;
    }
  }
}

export function createBowlStadium(course) {
  const group = new THREE.Group();
  group.name = 'Bowl stadium, floodlights and crowd';
  const centre = bowlCentre(course), uniforms = {uCrowdTime: {value: 0}, uCrowdCheer: {value: .35},
    uCrowdTruck: {value: new THREE.Vector3(0, -999, 0)}, uCrowdScatter: {value: 0}};
  const wear = createScrapWear({dust: 0x5f4b36, dustTop: 1.2});
  // The stands.
  const concrete = new THREE.MeshStandardMaterial({map: photo('/assets/textures/tunnel-concrete.png'), vertexColors: true, roughness: .96, side: THREE.DoubleSide});
  const stands = new THREE.Mesh(sweep(course, standProfile(course), 1, standGap(course)), concrete);
  stands.name = 'Bowl terraces';
  stands.receiveShadow = true;
  // The wall in front of them: welded steel plates over concrete.
  const plates = wear.apply(new THREE.MeshStandardMaterial({color: 0x8a7a68, map: photo('/assets/textures/scrap-plating.png'), roughness: .78, metalness: .45, side: THREE.DoubleSide}));
  const throat = s => gateDistance(course, s) < throatHalf(course);
  const wall = new THREE.Mesh(sweep(course, wallProfile(), 1, throat), plates);
  wall.name = 'Bowl stand wall';
  wall.receiveShadow = true;
  // The catch fence on top of the wall, and its posts.
  // The fence stands at the wall's front edge, in front of the flame jets on the wall top.
  const fence = new THREE.Mesh(sweep(course, s => [{d: .08, y: wallTop(s), v: 0}, {d: .08, y: wallTop(s) + FENCE - WALL, v: FENCE - WALL}], 1, throat),
    new THREE.MeshStandardMaterial({map: chainLink(), color: 0xb5b8b4, metalness: .7, roughness: .45, alphaTest: .35, side: THREE.DoubleSide}));
  if (fence.material.map) { fence.material.map.wrapS = fence.material.map.wrapT = THREE.RepeatWrapping; fence.material.map.repeat.set(1.2, 1.2); }
  fence.name = 'Bowl catch fence';
  const posts = [];
  let last = null, along = 0;
  for (let s = 0; s < course.length; s += .25) {
    const p = course.worldAt(s, FACE + .08);
    if (last) along += Math.hypot(p.x - last.x, p.z - last.z);
    last = p;
    if (along < 3.2 && s) continue;
    along = 0;
    if (throat(s - .3) || throat(s + .3)) continue;
    posts.push(new THREE.CylinderGeometry(.06, .07, FENCE - WALL + .2, 6).translate(p.x, wallTop(s) + (FENCE - WALL) / 2, p.z));
  }
  const postMesh = new THREE.Mesh(mergeGeometries(posts), new THREE.MeshStandardMaterial({color: 0x5b6063, metalness: .8, roughness: .45}));
  postMesh.name = 'Bowl fence posts';
  const people = crowd(course, uniforms);
  group.add(stands, wall, fence, postMesh, people.mesh, flashes(people.heads, uniforms));
  group.add(spine(course, centre, wear), tyreWalls(course));
  // Four floodlight towers behind the ends' stands, each aimed across the floor.
  const glow = glowTexture(), lights = [];
  const ring = course.features.bowl.ring, zones = course.features.bowl.zones;
  [[zones.end1[0] + ring.radius * Math.PI * .22, zones.end2[0] + ring.radius * Math.PI * .78],
    [zones.end1[0] + ring.radius * Math.PI * .78, zones.end2[0] + ring.radius * Math.PI * .22]].flat().forEach((s, index) => {
    const foot = course.worldAt(s, FACE + OUTER + 4), aim = course.worldAt(s, -4);
    const position = new THREE.Vector3(foot.x, 0, foot.z), target = new THREE.Vector3(aim.x * .55 + centre.x * .45, 0, aim.z * .55 + centre.z * .45);
    group.add(tower(position, target, glow, index));
    const light = new THREE.SpotLight(0xfff1dc, 52000, 0, .62, .55, 2);
    light.position.set(foot.x, TOWER + 2, foot.z);
    light.target.position.copy(target);
    light.name = `Bowl floodlight ${index + 1}`;
    group.add(light, light.target);
    lights.push(light);
  });
  // The big screens on the ends' stands.
  for (const [s, words] of [[zones.end1[0] + ring.radius * Math.PI / 2, ['THE BOWL', 'SHOW NIGHT']], [zones.end2[0] + ring.radius * Math.PI / 2, ['THE BOWL', 'BIG MO PRESENTS']]]) {
    const p = course.worldAt(s, FACE + BACK - 1), board = screen(words);
    board.position.set(p.x, TOP, p.z);
    board.rotation.y = p.heading - Math.PI / 2;
    group.add(board);
  }
  // BOWL-OUT-LOOK: the tunnels, the arches, the car park and the marker back to a gate (src/bowl/bowl-outside-view.js).
  const outside = createBowlOutsideView(course, {photo, drawn, hash, glow, stand: BOWL_STAND});
  group.add(outside.group);
  let raceGates, lastNow = null;
  group.userData.update = (now, cheer = .35, state) => {
    const dt = lastNow == null ? 0 : Math.min(.1, Math.max(0, (now - lastNow) * .001));
    lastNow = now;
    uniforms.uCrowdTime.value = now * .001;
    uniforms.uCrowdCheer.value = cheer;
    // The crowd clears from round the truck while it is in the stands, and comes back over two seconds once it has
    // gone. The ring stays where the truck left it while the people walk back.
    const inStands = state?.bowlOutside?.where === 'stands' && (state.airHeight || 0) < 3;
    if (inStands) {
      const p = course.worldAt(state.s, state.lateral);
      uniforms.uCrowdTruck.value.set(p.x, (state.groundHeight || 0) + (state.airHeight || 0), p.z);
    }
    const scatter = uniforms.uCrowdScatter;
    scatter.value = inStands ? Math.min(1, scatter.value + dt * 4) : Math.max(0, scatter.value - dt * .5);
    outside.update(now, state, dt);
    const event = state?.bowlNight?.event;
    const sideBySide = event?.type === 'sideBySide';
    if (sideBySide && !raceGates) {
      raceGates = course.features.bowl.lanes.map((lane, index) => raceGate(course, lane, index ? 'rival' : 'player'));
      group.add(...raceGates.map(({gate}) => gate));
    }
    if (raceGates) {
      for (const {gate} of raceGates) gate.visible = sideBySide;
      if (sideBySide) updateRaceGates(raceGates, state, event);
    }
  };
  group.userData.crowdCards = people.mesh.userData.cards;
  group.userData.lights = lights;
  group.userData.size = {face: FACE, back: BACK, top: TOP};
  return group;
}
