// Drawing H4 Rescue (docs/HELI_RESCUE.md sections 5, 7 and 13): the rescuer on
// the line, the lost hiker with the orange flare, the slide's snow blocks and
// the skier dug out of it, the driver on the slope, the supply crates, the
// search ring and the landing circles, and the paramedics who take a rescued
// person away. Drawing only: it reads the session's `view().rescue` each frame
// and never changes it. With the rescue switch off the session gives no
// `rescue` view, so nothing here is created, loaded or drawn.
//
// The people and props are Claude's own recipes (docs/board/looks/
// heli-rescue-people, docs/board/looks/heli-rescue); the flare's smoke and
// the digging snow reuse H2's fire atlas, tinted.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {FIRE_FX_URL, FIRE_FX_TABLE_URL} from './heli-fire-view.js';
import {JOB_CARS} from './heli-jobs.js';
import {createVehicleAssets} from '../vehicle-assets.js';

const PEOPLE = '/assets/heli/people/', PROPS = '/assets/heli/rescue/';
export const RESCUE_MODEL_URLS = Object.freeze({
  rescuer: PEOPLE + 'rescuer-hanging.glb', pair: PEOPLE + 'rescuer-casualty-hanging.glb',
  'hiker-standing': PEOPLE + 'hiker-standing.glb', 'hiker-walking': PEOPLE + 'hiker-walking.glb',
  'skier-sitting': PEOPLE + 'skier-sitting.glb', 'skier-standing': PEOPLE + 'skier-standing.glb',
  'driver-standing': PEOPLE + 'driver-standing.glb', 'driver-lying': PEOPLE + 'driver-lying.glb',
  'paramedic-1': PEOPLE + 'paramedic-1-walking.glb', 'paramedic-2': PEOPLE + 'paramedic-2-walking.glb',
  stretcher: PROPS + 'stretcher.glb', beacon: PROPS + 'beacon.glb',
  'crate-food': PROPS + 'crate-food.glb', 'crate-medicine': PROPS + 'crate-medicine.glb', 'crate-fuel': PROPS + 'crate-fuel.glb',
});
// At most this many snow chunks and sprites by graphics quality (sections 13 and 16); Performance has half.
export const RESCUE_LIMITS = Object.freeze({
  high: Object.freeze({debris: 220, sprites: 160}), performance: Object.freeze({debris: 110, sprites: 80})});
// A little larger than life, so a person reads from the helicopter's cameras; crates larger still.
export const PEOPLE_SCALE = 1.25, CRATE_SCALE = 1.5;
// Where each model's clip point and top sit above its origin (read from the file once it loads).
const RESCUER = Object.freeze({harness: 1.36, top: 2.49});
// A rescued person's walk away: how long the paramedics need to arrive and to leave.
export const HANDOVER = Object.freeze({approach: 7, leave: 7, from: 13, stand: 1.4});
const CASUALTY_MODEL = Object.freeze({hiker: 'hiker-standing', avalanche: 'skier-standing', hoist: 'driver-standing'});
const CRATE_KEY = Object.freeze({food: 'crate-food', medicine: 'crate-medicine', fuel: 'crate-fuel'});
const CRATE_ID_ORDER = Object.freeze(['food', 'medicine', 'fuel']);

// A whole number from a seed, so each block and puff sits the same way every frame.
const hash = (a, b) => {
  let h = Math.imul((Math.floor(a * 10) | 0) ^ 0x9e3779b9, 2654435761) ^ Math.imul((b | 0) + 7, 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const VERTEX = `
attribute float size; attribute vec4 rect; attribute float alpha; attribute vec3 tint;
uniform float scale; varying vec4 vRect; varying float vAlpha; varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(640.0, size * scale / max(1.0, -mv.z));
  // A puff close to the camera fades out instead of filling the screen.
  vRect = rect; vAlpha = alpha * smoothstep(12.0, 40.0, -mv.z); vTint = tint;
}`;
const FRAGMENT = `
uniform sampler2D atlas; varying vec4 vRect; varying float vAlpha; varying vec3 vTint;
void main() {
  vec2 uv = vec2(vRect.x + gl_PointCoord.x * vRect.z, 1.0 - (vRect.y + gl_PointCoord.y * vRect.w));
  vec4 c = texture2D(atlas, uv);
  if (c.a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(c.rgb * vTint, c.a * vAlpha);
}`;

// Sprites from the atlas, drawn as points: the same shader as the fire's.
function spriteLayer(THREE, capacity, blending, fades) {
  const geometry = new THREE.BufferGeometry();
  const make = (name, size) => geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage));
  make('position', 3); make('size', 1); make('rect', 4); make('alpha', 1); make('tint', 3);
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({uniforms: {atlas: {value: null}, scale: {value: 900}}, vertexShader: fades ? VERTEX : VERTEX.replace('smoothstep(12.0, 40.0, -mv.z)', '1.0'),
    fragmentShader: FRAGMENT, transparent: true, depthWrite: false, blending});
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const size = new THREE.Vector2();
  points.onBeforeRender = (renderer, _scene, camera) => {
    const height = renderer.getDrawingBufferSize?.(size).y ?? 900;
    material.uniforms.scale.value = camera.isPerspectiveCamera ? height / (2 * Math.tan(camera.fov * Math.PI / 360)) : height;
  };
  let count = 0, cap = capacity;
  return {points, material,
    reset() { count = 0; },
    setCap(next) { cap = Math.min(capacity, next); },
    add(x, y, z, size, rect, alpha, r = 1, g = 1, b = 1) {
      if (count >= cap || !rect) return false;
      const a = geometry.attributes;
      a.position.setXYZ(count, x, y, z); a.size.setX(count, size); a.rect.setXYZW(count, ...rect);
      a.alpha.setX(count, alpha); a.tint.setXYZ(count, r, g, b);
      count++;
      return true;
    },
    get count() { return count; },
    finish() {
      if (count === 0 && geometry.drawRange.count === 0) return;
      geometry.setDrawRange(0, count);
      for (const name of ['position', 'size', 'rect', 'alpha', 'tint']) {
        const attribute = geometry.attributes[name];
        attribute.clearUpdateRanges?.(); attribute.addUpdateRange?.(0, count * attribute.itemSize);
        attribute.needsUpdate = true;
      }
    }};
}

const defaultLoad = {
  model: url => new GLTFLoader().loadAsync(url).then(gltf => gltf.scene),
  texture: (THREE, url) => new THREE.TextureLoader().loadAsync(url),
  table: url => fetch(url).then(response => response.json()),
};

export function createRescueView({THREE, scene, load = defaultLoad, quality = 'high', vehicleAssets = null}) {
  const group = new THREE.Group();
  group.name = 'H4 Rescue';
  group.visible = false;
  scene.add(group);
  let time = 0;
  const limits = () => RESCUE_LIMITS[quality] ?? RESCUE_LIMITS.high;

  // ---- models: each file loads the first time something needs it ----
  const models = new Map();
  function template(key) {
    let entry = models.get(key);
    if (!entry) {
      entry = {status: 'loading', root: null, harness: RESCUER.harness, top: RESCUER.top, min: 0, max: 1, error: ''};
      models.set(key, entry);
      load.model(RESCUE_MODEL_URLS[key]).then(root => {
        root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        entry.min = box.min.y; entry.max = box.max.y; entry.top = box.max.y;
        const harness = root.getObjectByName('harness');
        if (harness) entry.harness = harness.position.y;
        if (key === 'rescuer' || key === 'pair') brightenRescuer(root);
        if (key.startsWith('crate-')) outlineCrate(root);
        entry.root = root; entry.status = 'ready';
      }).catch(error => { entry.status = 'error'; entry.error = String(error?.message || error); console.warn(`Rescue model ${key} did not load: ${entry.error}`); });
    }
    return entry.status === 'ready' ? entry : null;
  }

  // The rescuer reads from afar: a white helmet on the red suit, the suit a shade stronger.
  function brightenRescuer(root) {
    root.traverse(object => {
      if (!object.isMesh || !object.material) return;
      if (object.material.name === 'helmet_black') { object.material = object.material.clone(); object.material.color.setRGB(.82, .8, .76); object.material.roughness = .35; }
      else if (object.material.name === 'red_suit') { object.material = object.material.clone(); object.material.color.setRGB(.62, .035, .02); }
    });
  }
  // A dark rim round every part of a crate (a slightly larger copy seen from inside), so it shows on snow and on grass.
  function outlineCrate(root) {
    const rim = new THREE.MeshBasicMaterial({color: 0x15110c, side: THREE.BackSide}), parts = [];
    root.traverse(object => { if (object.isMesh) parts.push(object); });
    for (const part of parts) {
      part.geometry.computeBoundingBox();
      const centre = part.geometry.boundingBox.getCenter(new THREE.Vector3()), hull = new THREE.Mesh(part.geometry, rim);
      hull.scale.setScalar(1.07); hull.position.copy(centre).multiplyScalar(-.07);
      part.add(hull);
    }
  }

  // ---- actors: one clone of a model per role, moved each frame ----
  const actors = new Map(), touched = new Set();
  function put(name, key, x, y, z, heading = 0, scale = 1) {
    touched.add(name);
    const model = template(key);
    if (!model) return null;
    let actor = actors.get(name);
    if (!actor || actor.key !== key) {
      if (actor) group.remove(actor.object);
      actor = {key, object: model.root.clone(true)};
      actors.set(name, actor); group.add(actor.object);
    }
    actor.object.visible = true;
    actor.object.position.set(x, y, z);
    actor.object.rotation.set(0, heading, 0);
    actor.object.scale.setScalar(scale);
    return actor.object;
  }

  // ---- the stranded driver's car, beside the driver at the hoist site ----
  // The session's hoist site says where it lies; which car it is comes from the site if the session names one,
  // else a seeded pick from the customer cars Kestrel One can lift, the same list the recovery job draws from
  // (heli-jobs.js wreckFor), so the same site always shows the same car.
  const wreck = {id: '', object: null, assets: vehicleAssets};
  const wreckCarId = site => site.car.carId ?? JOB_CARS[Math.floor(hash(site.car.x, site.car.z | 0) * JOB_CARS.length)];
  function drawWreck(sites, ground) {
    if (!sites?.car) return;
    const id = wreckCarId(sites), spot = sites.car;
    wreck.assets ??= createVehicleAssets();
    const status = wreck.assets.status(id);
    if (status === 'idle') void wreck.assets.load(id);
    if (status !== 'ready') return;
    if (wreck.id !== id || !wreck.object) {
      if (wreck.object) group.remove(wreck.object);
      wreck.object = wreck.assets.create(id);
      wreck.id = id;
      if (!wreck.object) return;
      wreck.object.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
      group.add(wreck.object);
    }
    // It lies on the slope: its up follows the ground's.
    const y = ground ? ground(spot.x, spot.z) : spot.y ?? 0;
    let up = new THREE.Vector3(0, 1, 0);
    if (ground) {
      const d = 1.6;
      up = new THREE.Vector3((ground(spot.x - d, spot.z) - ground(spot.x + d, spot.z)) / (2 * d), 1, (ground(spot.x, spot.z - d) - ground(spot.x, spot.z + d)) / (2 * d)).normalize();
    }
    wreck.object.position.set(spot.x, y, spot.z);
    wreck.object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.heading || 0));
    wreck.object.visible = true;
  }

  // ---- crates set down in the yard stay where they were set down ----
  // The session keeps a crate only while its course is loaded, so each one seen resting in the yard is
  // remembered here, and drawn again whenever the helicopter is back over that course in the same run (and
  // after the last one, until the course changes or a new rescue begins).
  let down = {run: '', course: '', crates: new Map()};

  // ---- sprites: the flare's smoke and the digging snow (the fire's atlas) ----
  const glow = spriteLayer(THREE, RESCUE_LIMITS.high.sprites, THREE.AdditiveBlending, false);
  const cover = spriteLayer(THREE, RESCUE_LIMITS.high.sprites, THREE.NormalBlending, true);
  cover.points.renderOrder = 2; glow.points.renderOrder = 3;
  group.add(cover.points, glow.points);
  const art = {status: 'idle', rects: null, error: ''};
  function ensureArt() {
    if (art.status !== 'idle') return;
    art.status = 'loading';
    Promise.all([load.texture(THREE, FIRE_FX_URL), load.table(FIRE_FX_TABLE_URL)]).then(([texture, table]) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      glow.material.uniforms.atlas.value = cover.material.uniforms.atlas.value = texture;
      art.rects = Object.fromEntries(Object.entries(table.frames).map(([kind, frames]) =>
        [kind, frames.map(f => [f.x / table.size, f.y / table.size, f.w / table.size, f.h / table.size])]));
      art.status = 'ready';
    }).catch(error => { art.status = 'error'; art.error = String(error?.message || error); console.warn(`Rescue art did not load: ${art.error}`); });
  }

  // ---- rings: the hiker's search area, the clearing, the yard ----
  const flat = (color, radius, opacity = .6) => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - .35, radius, 64),
      new THREE.MeshBasicMaterial({color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, depthTest: false}));
    // Drawn over the ground, so a mound never buries half of it (as the fire's aim ring).
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 4;
    group.add(mesh);
    return mesh;
  };
  const clearingRing = flat(0xff9a3c, 12), yardRing = flat(0xf4f1e8, 10);
  const SEARCH_POINTS = 160;
  const searchGeometry = new THREE.BufferGeometry();
  searchGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEARCH_POINTS * 3), 3));
  const searchRing = new THREE.LineLoop(searchGeometry, new THREE.LineBasicMaterial({color: 0xffeaa8, transparent: true, opacity: .8, depthTest: false}));
  searchRing.frustumCulled = false; searchRing.visible = false; searchRing.renderOrder = 4;
  group.add(searchRing);
  let searchKey = '';
  function layoutSearchRing(centre, radius, groundAt) {
    const key = `${centre.x}|${centre.z}|${radius}|${groundAt ? 1 : 0}`;
    if (key === searchKey) return;
    searchKey = key;
    const p = searchGeometry.attributes.position;
    for (let i = 0; i < SEARCH_POINTS; i++) {
      const a = i / SEARCH_POINTS * Math.PI * 2, x = centre.x + Math.cos(a) * radius, z = centre.z + Math.sin(a) * radius;
      p.setXYZ(i, x, (groundAt ? groundAt(x, z) : centre.y ?? 0) + 1.5, z);
    }
    p.needsUpdate = true;
    searchGeometry.computeBoundingSphere();
  }

  // ---- the slide: packed-snow chunks strewn over the debris area ----
  // Rounded lumps of mixed size (0.5 to 3 m across), half sunk in the slope,
  // white on top and blue-grey in the shade, thickest in a fan down the slope.
  // Four lump shapes, each one instanced mesh, so a couple of hundred chunks
  // cost four draws.
  const CHUNK_SHAPES = 4;
  function chunkGeometry(seed) {
    let geometry = new THREE.IcosahedronGeometry(1, 2);
    geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
    geometry = mergeVertices(geometry, 1e-4);
    const p = geometry.attributes.position, v = new THREE.Vector3(), flat = [.82 + .18 * hash(seed, 1), .55 + .12 * hash(seed, 2), .78 + .2 * hash(seed, 3)];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      // Each point pushed in or out by its place on the lump, and the lump squashed and its foot cut level.
      const lump = .72 + .5 * hash(Math.round(v.x * 5) + seed * 17, Math.round(v.y * 5) * 31 + Math.round(v.z * 5) * 977 + seed)
        + .12 * Math.sin(v.x * 4 + seed) * Math.cos(v.z * 3 - seed);
      v.multiplyScalar(lump);
      p.setXYZ(i, v.x * flat[0], Math.max(-.3, v.y * flat[1]), v.z * flat[2]);
    }
    geometry.computeVertexNormals();
    const n = geometry.attributes.normal, colours = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      // White where it faces the sky, a cold blue-grey where it faces away.
      const up = Math.min(1, Math.max(0, n.getY(i) * .5 + .5)) ** 1.6;
      colours.set([.4 + .58 * up, .48 + .5 * up, .64 + .36 * up], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    return geometry;
  }
  let debrisKey = '', debrisCount = 0;
  const debris = {meshes: []};
  const tmp = new THREE.Object3D(), tint = new THREE.Color();
  function buildDebris() {
    const material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .93, metalness: 0});
    const capacity = Math.ceil(RESCUE_LIMITS.high.debris / CHUNK_SHAPES) + 1;
    for (let shape = 0; shape < CHUNK_SHAPES; shape++) {
      const mesh = new THREE.InstancedMesh(chunkGeometry(shape + 1), material, capacity);
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = true; mesh.visible = false;
      mesh.userData.shape = shape;
      group.add(mesh); debris.meshes.push(mesh);
    }
  }
  function layoutDebris(slide, beacon, groundAt) {
    if (!debris.meshes.length) buildDebris();
    const total = limits().debris;
    const key = `${slide.x}|${slide.z}|${beacon.x}|${beacon.z}|${groundAt ? 1 : 0}|${total}`;
    if (key === debrisKey) return;
    debrisKey = key;
    const down = slide.down, across = {x: -down.z, z: down.x}, slope = Math.tan((slide.slope ?? 20) * Math.PI / 180);
    const counts = new Array(CHUNK_SHAPES).fill(0), slot = new Array(CHUNK_SHAPES).fill(0);
    for (let i = 0; i < total; i++) {
      // A fan: narrow at the crown, wide at the foot, thickest down the middle and toward the foot;
      // a sixth of the chunks lie close around the buried beacon, but never on it.
      let x, z, toe = 1;
      if (i % 6 === 0) {
        const a = hash(slide.x + i, 1) * Math.PI * 2, r = 5 + hash(slide.z + i, 2) * 12;
        x = beacon.x + Math.cos(a) * r; z = beacon.z + Math.sin(a) * r;
      } else {
        toe = hash(slide.z + i, 4) ** .6;
        const spread = 10 + 88 * toe, u = (hash(slide.x + i, 3) + hash(slide.x + i, 13) - 1) * spread, v = -40 + 80 * toe;
        x = slide.x + across.x * u + down.x * v; z = slide.z + across.z * u + down.z * v;
      }
      const y = groundAt ? groundAt(x, z) : beacon.y - slope * ((x - beacon.x) * down.x + (z - beacon.z) * down.z);
      // Mostly small, a few large, the large ones nearer the foot.
      const size = (.3 + .9 * hash(x, i + 11) ** 1.5) * (.75 + .35 * toe);
      const shape = i % CHUNK_SHAPES, mesh = debris.meshes[shape];
      tmp.position.set(x, y - .12 * size, z);
      tmp.rotation.set((hash(x, i + 31) - .5) * .35, hash(z, i + 5) * Math.PI * 2, (hash(z, i + 41) - .5) * .35);
      tmp.scale.set(size * (.85 + .3 * hash(x, i + 51)), size * (.8 + .3 * hash(z, i + 61)), size * (.85 + .3 * hash(x, i + 71)));
      tmp.updateMatrix();
      const shade = .74 + .18 * hash(x + z, i + 21);
      tint.setRGB(shade, shade, shade * 1.03);
      mesh.setMatrixAt(slot[shape], tmp.matrix); mesh.setColorAt(slot[shape], tint);
      slot[shape]++; counts[shape]++;
    }
    for (const mesh of debris.meshes) { mesh.count = counts[mesh.userData.shape]; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.visible = true; }
    debrisCount = total;
  }

  // ---- a rescued person is taken away by two paramedics ----
  // Begins when a person carried to a landing circle is no longer in hand;
  // runs on its own clock (HANDOVER) and then the paramedics walk out of sight.
  let carrying = null, handover = null;
  // The hiker rides in the cabin; the others hang on the line as a pair. Both are stage 'carry'.
  const carryingNow = r => {
    const a = r.active;
    if (!a || a.kind === 'supply' || a.stage !== 'carry') return null;
    if (a.kind !== 'hiker' && r.line?.who !== 'pair') return null;
    return {kind: a.kind, condition: a.condition};
  };
  function beginHandover(previous, r, view) {
    const h = view.heli, line = r.line;
    let x, z, y, away;
    if (previous.kind === 'hiker') {
      // Out of the cabin on the helicopter's right, well clear of the rotor.
      if (!h.onGround) return null;
      x = h.x + Math.cos(h.heading) * 9; z = h.z - Math.sin(h.heading) * 9; away = {x: Math.cos(h.heading), z: -Math.sin(h.heading)};
    } else {
      if (!line || !line.onGround) return null;
      x = line.x; z = line.z;
      const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz);
      away = d > .5 ? {x: dx / d, z: dz / d} : {x: Math.cos(h.heading), z: -Math.sin(h.heading)};
    }
    y = r.ground ? r.ground(x, z) : (line ? line.y - 1.3 : h.y);
    const look = previous.condition >= 2 ? 'stretcher' : previous.condition === 1 ? 'limp' : 'walk';
    return {t: 0, x, y, z, away, side: {x: -away.z, z: away.x}, look, kind: previous.kind};
  }
  const walkBob = (phase, amount) => Math.abs(Math.sin(phase)) * amount;
  function drawHandover(r, dt) {
    if (!handover) return;
    handover.t += dt;
    const t = handover.t, total = HANDOVER.approach + HANDOVER.leave;
    if (t > total) { handover = null; return; }
    const {away, side, look} = handover, stretcher = look === 'stretcher';
    const standing = {x: handover.x + side.x * HANDOVER.stand, z: handover.z + side.z * HANDOVER.stand};
    const groundAt = (x, z, fallback) => r.ground ? r.ground(x, z) : fallback;
    const arrive = Math.min(1, t / HANDOVER.approach), leaving = Math.max(0, (t - HANDOVER.approach) / HANDOVER.leave);
    // A limp is slower; a stretcher slower still.
    const pace = look === 'walk' ? 1.5 : look === 'limp' ? .9 : 1.1;
    const gone = leaving * HANDOVER.leave * pace;
    const walkFace = Math.atan2(-away.x, -away.z), leaveFace = Math.atan2(away.x, away.z);
    const bob = walkBob(time * 7, .045);
    const medic = (name, key, offset) => {
      const start = HANDOVER.from + offset * .6, here = start + (HANDOVER.stand + offset - start) * arrive;
      const along = leaving > 0 ? HANDOVER.stand + offset + gone : here;
      const lateral = (offset - .4) * 1.1;
      const x = handover.x + away.x * along + side.x * lateral, z = handover.z + away.z * along + side.z * lateral;
      put(name, key, x, groundAt(x, z, handover.y) + (arrive < 1 || leaving > 0 ? bob : 0), z, leaving > 0 ? leaveFace : walkFace, PEOPLE_SCALE);
    };
    medic('medic-1', 'paramedic-1', 0.2); medic('medic-2', 'paramedic-2', 1.6);
    const cx = standing.x + away.x * gone, cz = standing.z + away.z * gone;
    const cy = groundAt(cx, cz, handover.y);
    if (stretcher) {
      // The litter lies by the rescuer, then is lifted and carried off between them.
      const lift = Math.min(1, Math.max(0, (t - HANDOVER.approach) / 1.2)) * .75;
      const turn = leaveFace + Math.PI / 2;
      put('stretcher', 'stretcher', cx, cy + 1.21 * PEOPLE_SCALE + lift, cz, turn, PEOPLE_SCALE);
      put('casualty', 'driver-lying', cx, cy + (1.21 - 1.02) * PEOPLE_SCALE + lift, cz, turn, PEOPLE_SCALE);
    } else {
      put('casualty', CASUALTY_MODEL[handover.kind] ?? 'hiker-standing', cx, cy + (leaving > 0 ? bob * (look === 'limp' ? 1.6 : 1) : 0), cz, leaving > 0 ? leaveFace : walkFace + Math.PI, PEOPLE_SCALE);
    }
  }

  // ---- the frame ----
  let lineHeading = null;
  function drawLine(r, view) {
    const line = r.line;
    if (!line) return;
    const key = line.who === 'pair' ? 'pair' : 'rescuer', model = template(key);
    const h = view.heli;
    const origin = line.y - (model?.harness ?? RESCUER.harness) * PEOPLE_SCALE;
    // In the air he faces the way the helicopter flies; on the ground he stays as he was set down.
    const heading = line.onGround && lineHeading != null ? lineHeading : h.heading || 0;
    if (!line.onGround) lineHeading = heading;
    put('line', key, line.x, origin, line.z, heading, PEOPLE_SCALE);
  }
  function drawHiker(a, r, view, ground) {
    const sites = a.sites;
    if (!sites) return;
    const hiker = sites.hiker;
    searchRing.visible = a.here && !hiker;
    if (searchRing.visible) layoutSearchRing(sites.lastSeen, a.target?.radius ?? 300, ground);
    clearingRing.visible = !!hiker && !sites.aboard;
    if (clearingRing.visible) clearingRing.position.set(sites.clearing.x, (ground ? ground(sites.clearing.x, sites.clearing.z) : sites.clearing.y) + .12, sites.clearing.z);
    if (!hiker || sites.aboard) return;
    const gy = ground ? ground(hiker.x, hiker.z) : hiker.y ?? sites.clearing.y;
    const walking = !hiker.arrived, h = view.heli;
    const toward = walking ? Math.atan2(sites.clearing.x - hiker.x, sites.clearing.z - hiker.z) : Math.atan2(h.x - hiker.x, h.z - hiker.z);
    const body = put('hiker', walking ? 'hiker-walking' : 'hiker-standing', hiker.x, gy + (walking ? walkBob(time * 6.5, .05) : 0), hiker.z, toward, PEOPLE_SCALE);
    if (body && walking) body.rotation.z = Math.sin(time * 6.5) * .025;
    // The flare in the raised hand, and its orange smoke leaning with the day's drift.
    if (sites.flareLeft > 0 && art.rects) drawFlare(hiker.x, gy + 1.9 * PEOPLE_SCALE, hiker.z, sites.flareLeft);
  }
  function drawFlare(x, y, z, left) {
    const rects = art.rects, fade = Math.min(1, left / 6);
    glow.add(x, y, z, 2.6 + .5 * Math.sin(time * 31), rects.flame[Math.floor(time * 11) % rects.flame.length], .95 * fade, 1, .45, .26);
    glow.add(x, y + .2, z, 1.2, rects.ember[0], fade, 1, .75, .55);
    // The steam frames are pale, so the tint gives them the flare's colour: strong red-orange at the flare,
    // paling and thinning as the column climbs.
    const puffs = 22, cycle = 7, every = quality === 'performance' ? 2 : 1;
    for (let i = 0; i < puffs; i += every) {
      const age = (time + i * cycle / puffs) % cycle, share = age / cycle, rise = age * 9;
      const jitter = hash(i, 90) - .5, jitterZ = hash(i, 91) - .5;
      const frame = rects.steam[i % rects.steam.length];
      const px = x + rise * .35 + jitter * 3 * (1 + share), py = y + 1 + rise, pz = z + jitterZ * 3 * (1 + share), size = (5 + share * 20) * (1 + (every - 1) * .3);
      cover.add(px, py, pz, size, frame, Math.min(1, (1 - share) ** .6 * 2.4) * fade, 1, .2 + share * .3, .03 + share * .22);
      // The low part of the column glows.
      if (share < .35) glow.add(px, py, pz, size * .8, frame, (.35 - share) * 1.4 * fade, 1, .38, .1);
    }
  }

  function drawAvalanche(a, r, view, ground) {
    const sites = a.sites;
    if (!sites) return;
    layoutDebris(sites.slide, sites.beacon, ground);
    for (const mesh of debris.meshes) mesh.visible = debrisCount > 0;
    const line = r.line, digging = !!line && line.holding && line.hold > 0 && a.stage !== 'carry';
    if (!digging) return;
    const b = sites.beacon, gy = ground ? ground(b.x, b.z) : b.y, h = view.heli;
    // The skier comes up out of the snow as the hold fills.
    put('skier', 'skier-sitting', b.x, gy - (1 - Math.min(1, line.hold)) * 1.05 * PEOPLE_SCALE, b.z, Math.atan2(h.x - b.x, h.z - b.z), PEOPLE_SCALE);
    put('beacon', 'beacon', b.x + .5, gy + .05, b.z);
    if (art.rects) for (let i = 0; i < 10; i += quality === 'performance' ? 2 : 1) {
      const age = (time * .9 + i / 10) % 1, spin = hash(i, 60) * Math.PI * 2, r0 = .6 + hash(i, 61) * 1.4;
      cover.add(b.x + Math.cos(spin) * r0 * (1 + age), gy + .4 + age * 2.6, b.z + Math.sin(spin) * r0 * (1 + age), 1.6 + age * 3.4,
        art.rects.steam[i % art.rects.steam.length], (1 - age) * .55, .93, .96, 1);
    }
  }

  function drawHoist(a, r, view, ground) {
    const sites = a.sites;
    drawWreck(sites, ground);
    if (!sites || a.stage === 'carry' || r.line?.who === 'pair') return;
    const d = sites.driver, h = view.heli;
    put('driver', 'driver-standing', d.x, ground ? ground(d.x, d.z) : d.y, d.z, Math.atan2(h.x - d.x, h.z - d.z), PEOPLE_SCALE);
  }

  function drawSupply(a, r, ground) {
    const sites = a.sites;
    yardRing.visible = !!sites?.yard;
    if (yardRing.visible) {
      const yard = sites.yard;
      yardRing.position.set(yard.x, (ground ? ground(yard.x, yard.z) : yard.y ?? 0) + .12, yard.z);
    }
  }
  function drawCrates(r, view) {
    const a = r.active, live = new Set();
    // Remember each crate seen at rest once the session counts it down; forget them all when a new rescue begins.
    if (a && a.kind === 'supply' && down.run !== a.id) down = {run: a.id, course: '', crates: new Map()};
    else if (a && a.kind !== 'supply') down = {run: '', course: '', crates: new Map()};
    for (const crate of r.crates ?? []) {
      live.add(crate.id);
      const index = CRATE_ID_ORDER.indexOf(crate.id);
      if (a?.kind === 'supply' && a.crates?.[index] === 2 && !crate.hooked) {
        down.course = view.courseId ?? '';
        down.crates.set(crate.id, {x: crate.x, y: crate.y, z: crate.z, heading: crate.heading || 0});
      }
    }
    const draw = (id, c) => {
      const key = CRATE_KEY[id];
      if (!key) return;
      const model = template(key);
      if (!model) { touched.add(`crate-${id}`); return; }
      // Origin at the crate's rest height (0.7 m above the ground): the (larger) foot sits on the ground at rest.
      put(`crate-${id}`, key, c.x, c.y - .7 - model.min * CRATE_SCALE, c.z, c.heading || 0, CRATE_SCALE);
    };
    for (const crate of r.crates ?? []) draw(crate.id, crate);
    // Set down earlier and gone from the session's list: still lying in the yard while this course is the one flown.
    if (down.crates.size && down.course === (view.courseId ?? '') && (!a || (a.kind === 'supply' && a.id === down.run)))
      for (const [id, c] of down.crates) if (!live.has(id) && (!a || a.crates?.[CRATE_ID_ORDER.indexOf(id)] === 2)) draw(id, c);
  }

  const api = {
    group,
    update(view, {dt = 1 / 60} = {}) {
      time += dt;
      const r = view?.rescue;
      if (!view?.heli || !r) { carrying = null; handover = null; down = {run: '', course: '', crates: new Map()}; group.visible = false; return; }
      group.visible = true;
      touched.clear(); glow.reset(); cover.reset();
      glow.setCap(limits().sprites); cover.setCap(limits().sprites);
      ensureArt();
      const ground = typeof r.ground === 'function' ? r.ground : null;
      const a = r.active;
      // A person carried to a circle and handed on: the paramedics come for them.
      const now = carryingNow(r);
      if (carrying && !a && !handover) handover = beginHandover(carrying, r, view);
      carrying = now;
      if (a && handover) handover = null;
      searchRing.visible = false; clearingRing.visible = false; yardRing.visible = false;
      for (const mesh of debris.meshes) mesh.visible = false;
      if (wreck.object) wreck.object.visible = false;
      drawLine(r, view);
      if (a?.here) {
        if (a.kind === 'hiker') drawHiker(a, r, view, ground);
        else if (a.kind === 'avalanche') drawAvalanche(a, r, view, ground);
        else if (a.kind === 'hoist') drawHoist(a, r, view, ground);
      }
      if (a?.kind === 'supply') drawSupply(a, r, ground);
      drawCrates(r, view);
      drawHandover(r, dt);
      for (const [name, actor] of actors) if (!touched.has(name)) actor.object.visible = false;
      glow.finish(); cover.finish();
    },
    // The cable's lower end with a person or a crate on the line.
    cableEnd(view) {
      const r = view?.rescue;
      if (!r) return null;
      const line = r.line;
      if (line) {
        const model = models.get(line.who === 'pair' ? 'pair' : 'rescuer');
        const harness = model?.status === 'ready' ? model.harness : RESCUER.harness, top = model?.status === 'ready' ? model.top : RESCUER.top;
        return {x: line.x, y: line.y + (top - harness) * PEOPLE_SCALE, z: line.z};
      }
      const crate = (r.crates ?? []).find(item => item.hooked);
      if (crate) {
        const model = models.get(CRATE_KEY[crate.id]);
        const ready = model?.status === 'ready', low = ready ? model.min : -.7, high = ready ? model.max : .5;
        return {x: crate.x, y: crate.y - .7 + (high - low) * CRATE_SCALE, z: crate.z};
      }
      return null;
    },
    // What is drawn now, in plain words, for the checks.
    get state() {
      return {actors: [...actors].filter(([, actor]) => actor.object.visible).map(([name, actor]) => ({name, key: actor.key})),
        debris: debris.meshes.some(mesh => mesh.visible) ? debrisCount : 0, sprites: glow.count + cover.count, glowSprites: glow.count,
        car: wreck.object?.visible ? wreck.id : null,
        searchRing: searchRing.visible, clearingRing: clearingRing.visible, yardRing: yardRing.visible,
        handover: handover ? {t: handover.t, look: handover.look, kind: handover.kind} : null};
    },
    // The model standing for a role ('line', 'hiker', 'skier', 'driver', 'crate-food', 'medic-1', ...), for the checks.
    object(name) { return name === 'car' ? wreck.object : actors.get(name)?.object ?? null; },
    setQuality(next) { quality = next in RESCUE_LIMITS ? next : 'high'; },
    get quality() { return quality; },
    get artStatus() { return art.status; },
    modelStatus(key) { return models.get(key)?.status ?? 'idle'; },
    get spriteCount() { return glow.count + cover.count; },
    get visible() { return group.visible; },
    hide() { group.visible = false; },
    dispose() {
      scene.remove(group);
      // The stranded driver's car is built fresh from the vehicle assets, so it is freed here.
      wreck.object?.traverse(o => { o.geometry?.dispose?.(); [o.material].flat().forEach(m => m?.dispose?.()); });
      // The clones share their geometry and materials with the loaded files, so those are freed once.
      for (const entry of models.values()) entry.root?.traverse(object => { object.geometry?.dispose?.(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m?.dispose?.()); });
      for (const layer of [glow, cover]) { layer.points.geometry.dispose(); layer.material.uniforms.atlas.value?.dispose?.(); layer.material.dispose(); }
      for (const ring of [clearingRing, yardRing, searchRing]) { ring.geometry.dispose(); ring.material.dispose(); }
      for (const mesh of debris.meshes) { mesh.geometry.dispose(); mesh.dispose?.(); }
      debris.meshes[0]?.material.dispose();
    },
  };
  return api;
}
