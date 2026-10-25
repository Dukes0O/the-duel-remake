// The pilot's map in the world (docs/PILOT_MAP.md sections 3 and 5, card MAP-VIEW): the five secret
// signs painted on their courses, the corner names of a course you own written over it, and the Table
// (mesa, dirt strip, lookout, wreck and logbook), which has no course of its own. Drawing only: it reads
// the helicopter's view each frame and never changes it.
//
//   - view.secrets.signs: the signs still to be found on this course (id, x, z), drawn from the MAP-ART models.
//   - view.scout: {courseId, corners: [{number, name, label, x, z}]} over a course you own.
//   - view.courseId === 'the-table': the hand-made world (map-secrets.js createTableWorld). The renderer is
//     told to hide the course it last loaded, since the Table is not on it.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TABLE, TABLE_ID, createTableWorld} from './map-secrets.js';

export const MAP_MODEL_DIR = '/assets/models/pilot-map/';
// The model each secret sign uses; `turn`: it faces against the lap (the sign says "the wrong way round").
export const SIGN_MODELS = Object.freeze({
  'tremblant-woods-reverse': Object.freeze({file: 'sign-logging-arrows', turn: true}),
  'panorama-ridge-reverse': Object.freeze({file: 'sign-start-grid', turn: true}),
  'panorama-ridge-night': Object.freeze({file: 'sign-fire-pits', turn: false}),
  'harbour-lights-reverse': Object.freeze({file: 'sign-chalk-line', turn: true}),
  'harbour-lights-dusk': Object.freeze({file: 'sign-lighthouse-window', turn: false}),
});
// The mesa model (origin in the middle of its flat top, 215 m flat radius, ground level 165 m below) fitted to the
// Table's rules: its flat top as wide as TABLE.topRadius and its foot at the floor, TABLE.topY below it.
export const MESA_FIT = Object.freeze({artTopRadius: 200, artDrop: 165,
  scaleXZ: TABLE.topRadius / 200, scaleY: (TABLE.topY - TABLE.floorY) / 165});
const SCOUT_HEIGHT = 10;

const loadModel = file => new GLTFLoader().loadAsync(`${MAP_MODEL_DIR}${file}.glb`).then(gltf => gltf.scene);

function defaultCanvas() {
  return typeof document !== 'undefined' ? document.createElement('canvas') : null;
}

export function createMapWorldView({THREE, scene, load = loadModel, groundHeight = () => 0, roadHeading = () => 0, createCanvas = defaultCanvas}) {
  const group = new THREE.Group();
  group.name = 'Pilot map world';
  group.visible = false;
  scene.add(group);
  const models = new Map();           // file -> Promise of the loaded scene (or null when it failed)
  const modelOf = file => {
    if (!models.has(file)) models.set(file, Promise.resolve().then(() => load(file)).catch(error => {
      console.warn(`Pilot map model ${file} did not load: ${String(error?.message || error)}`); return null; }));
    return models.get(file);
  };
  let disposed = false;

  // ---- the five signs ----
  const signs = new Map();            // id -> {group, x, z}
  const wanted = new Set();
  function placeSign(sign) {
    const spec = SIGN_MODELS[sign.id];
    if (!spec || signs.has(sign.id)) return;
    const holder = new THREE.Group();
    holder.name = `Sign ${sign.id}`;
    holder.position.set(sign.x, groundHeight(sign.x, sign.z), sign.z);
    holder.rotation.y = spec.turn ? roadHeading(sign.x, sign.z) + Math.PI : 0;
    group.add(holder);
    signs.set(sign.id, holder);
    modelOf(spec.file).then(model => { if (model && !disposed && signs.get(sign.id) === holder) holder.add(model.clone(true)); });
  }

  // ---- scouting: the corner names of a course you own, hovering over their corners ----
  const scouts = new Map();           // courseId -> THREE.Group of sprites
  let scoutShown = null;
  function labelSprite(text) {
    const canvas = createCanvas();
    let texture = null;
    if (canvas) {
      canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(20,16,10,.85)'; ctx.strokeText(text, 256, 64);
        ctx.fillStyle = '#f6efd8'; ctx.fillText(text, 256, 64);
        texture = new THREE.CanvasTexture(canvas);
      }
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, transparent: true, depthWrite: false, depthTest: false}));
    sprite.scale.set(56, 14, 1);
    sprite.renderOrder = 20;
    return sprite;
  }
  function scoutGroup(scout) {
    let holder = scouts.get(scout.courseId);
    if (holder) return holder;
    holder = new THREE.Group();
    holder.name = `Corner names ${scout.courseId}`;
    for (const corner of scout.corners) {
      const sprite = labelSprite(corner.name ? `${corner.number} · ${corner.name}` : String(corner.label));
      sprite.position.set(corner.x, groundHeight(corner.x, corner.z) + SCOUT_HEIGHT, corner.z);
      holder.add(sprite);
    }
    group.add(holder);
    scouts.set(scout.courseId, holder);
    return holder;
  }

  // ---- the Table ----
  let table = null;
  function buildTable() {
    const holder = new THREE.Group();
    holder.name = 'The Table';
    // A flat desert at the floor, so the mesa's skirt never shows below it.
    const desert = new THREE.Mesh(new THREE.CircleGeometry(30000, 48), new THREE.MeshStandardMaterial({color: 0xb98a5a, roughness: .98}));
    desert.rotation.x = -Math.PI / 2; desert.position.y = TABLE.floorY - 0.2;
    holder.add(desert);
    // The oval dirt strip on top, laid over the same oval the helicopter's rules use.
    const {course} = createTableWorld();
    const half = TABLE.strip.halfWidth, positions = [], indices = [];
    course.samples.forEach((p, i) => {
      const nx = Math.cos(p.heading), nz = -Math.sin(p.heading);
      positions.push(p.x - nx * half, TABLE.topY + 0.14, p.z - nz * half, p.x + nx * half, TABLE.topY + 0.14, p.z + nz * half);
      const a = i * 2, b = ((i + 1) % course.samples.length) * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    });
    const strip = new THREE.BufferGeometry();
    strip.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    strip.setIndex(indices); strip.computeVertexNormals();
    holder.add(new THREE.Mesh(strip, new THREE.MeshStandardMaterial({color: 0x6e4528, roughness: 1, side: THREE.DoubleSide})));
    group.add(holder);
    const put = (file, place) => modelOf(file).then(model => { if (model && !disposed) place(model.clone(true), holder); });
    put('table-mesa', (model, h) => { model.position.y = TABLE.topY; model.scale.set(MESA_FIT.scaleXZ, MESA_FIT.scaleY, MESA_FIT.scaleXZ); h.add(model); });
    put('table-lookout', (model, h) => {
      model.position.set(TABLE.tower.x, TABLE.topY, TABLE.tower.z); h.add(model);
      // The logbook lies in the cab, at the lookout's own spot for it.
      const spot = model.getObjectByName?.('logbook_spot');
      if (spot) modelOf('table-logbook').then(book => { if (book && !disposed) spot.add(book.clone(true)); });
    });
    put('table-plane-wreck', (model, h) => { model.position.set(TABLE.wreck.x, TABLE.topY, TABLE.wreck.z); model.rotation.y = TABLE.wreck.heading; h.add(model); });
    return holder;
  }

  return {
    group,
    // Returns {hideCourse}: true on the Table, where the course the renderer last loaded is not part of the place.
    update(view) {
      const onTable = view?.courseId === TABLE_ID;
      if (!view?.heli) { group.visible = false; return {hideCourse: false}; }
      group.visible = true;
      // Signs still to be found on this course (a found one is taken off the view).
      wanted.clear();
      for (const sign of view.secrets?.signs ?? []) { wanted.add(sign.id); placeSign(sign); }
      for (const [id, holder] of signs) if (!wanted.has(id)) { group.remove(holder); signs.delete(id); }
      // The corner names over a course you own, for this flight.
      const scout = view.scout ?? null;
      if (scoutShown && scoutShown !== scout?.courseId) scouts.get(scoutShown).visible = false;
      if (scout && scout.corners.length) { scoutGroup(scout).visible = true; scoutShown = scout.courseId; } else scoutShown = null;
      // The Table.
      if (onTable) { table ??= buildTable(); table.visible = true; } else if (table) table.visible = false;
      return {hideCourse: onTable};
    },
    hide() { group.visible = false; },
    get signIds() { return [...signs.keys()]; },
    get tableBuilt() { return table !== null; },
    dispose() {
      disposed = true;
      scene.remove(group);
      group.traverse(object => { object.geometry?.dispose?.(); object.material?.map?.dispose?.(); object.material?.dispose?.(); });
    },
  };
}
