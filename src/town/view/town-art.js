// TOWN-VIEW-ART: the town's buildings, homes, sites, ruins and street things, drawn from the art families.
//
// Cost (docs/WASTELAND_TOWN.md section 10: no caps, the view holds at any size). Each family file is loaded once. Each
// piece is merged once into one geometry per material, at three levels of detail: near (every part), mid (the parts a
// metre or more across) and far (the main body). The town is then drawn as one instanced mesh per piece, material and
// level, so draw calls grow with the kinds of thing in view and not with how many there are; a thing too small to
// see or past the fog is not drawn at all. Parts that move (the windmill's rotor, the pump house's flywheel, the water
// tower's gauge) are drawn as their own objects near the camera, where town-fx.js turns them.
//
// Drawing only: the plan comes from town-art-plan.js and nothing here writes the town.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TOWN_ART_FAMILIES, TOWN_ART_FOLDER, TOWN_ART_KEEP_WITHIN, TOWN_BUILDING_ART} from './town-art-table.js';

// Distances from the viewer, in metres, where a piece changes to its mid and far level. Past `fogMargin` times the
// fog's far distance a piece is not drawn, nor when it would be under about two pixels on a 1080p screen.
// Near pieces keep every part and material; mid ones keep their parts a metre or more across; far ones are one draw
// each, their parts painted the average colour of their photographs.
export const TOWN_ART_BANDS = Object.freeze({near:130, mid:420, fogMargin:1.05, smallest:.0016});
// The sound cues for what this draws: none of its own. A fire is town.fire (town-fx.js); a finished site is town.ready.
export const TOWN_ART_SOUNDS = Object.freeze({burnt:'town.fire', site:'town.ready'});
// Moving parts town-fx.js turns or shows, by their model names.
const LIVE_PART = /^(windmill:rotor|pump-house:flywheel|water-tower:fill-\d)$/;
// Lamp glass, lit at night: `<id>:lamp`, `<id>:lamp-2` and the Dome's `lamp-0-face-1` faces.
const LAMP_PART = /:lamp(-\d+)*(-face-\d+)?$/;
const OPTIONAL_PARTS = new Map(Object.values(TOWN_BUILDING_ART).filter(row => row.markers).map(row => [row.node, new Set(row.markers)]));
const modelName = object => object?.userData?.name ?? object?.name ?? '';
const sanitized = name => String(name).replace(/[[\]\.:/\s]/g, '');
const sameName = (object, name) => modelName(object) === name || object?.name === sanitized(name);

function fixWinding(geometry) {
  const index = geometry.index;
  for (let i = 0; i < index.count; i += 3) { const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b); }
  index.needsUpdate = true;
}

function prepareGeometry(mesh, matrix) {
  const source = mesh.geometry, geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) if (source.getAttribute(name)) geometry.setAttribute(name, source.getAttribute(name).clone());
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
  geometry.setIndex(source.index ? source.index.clone() : [...Array(geometry.getAttribute('position').count).keys()]);
  geometry.applyMatrix4(matrix);
  if (matrix.determinant() < 0) fixWinding(geometry);
  return geometry;
}

const triangles = geometry => (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;

/**
 * A coarse copy of a coloured geometry for far away: corners closer than `cell` metres become one, and the triangles
 * that vanish are dropped (vertex clustering). Colours are averaged; normals are worked out again.
 */
export function clusterGeometry(geometry, cell) {
  const position = geometry.getAttribute('position'), colour = geometry.getAttribute('color'), index = geometry.index;
  const keys = new Map(), sums = [], remap = new Uint32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)}`;
    let at = keys.get(key);
    if (at === undefined) { at = sums.length; keys.set(key, at); sums.push([0, 0, 0, 0, 0, 0, 0]); }
    const sum = sums[at]; sum[0] += x; sum[1] += y; sum[2] += z; sum[6]++;
    if (colour) { sum[3] += colour.getX(i); sum[4] += colour.getY(i); sum[5] += colour.getZ(i); }
    remap[i] = at;
  }
  const faces = [], seen = new Set(), count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const a = remap[index ? index.getX(i) : i], b = remap[index ? index.getX(i + 1) : i + 1], c = remap[index ? index.getX(i + 2) : i + 2];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((p, q) => p - q).join(',') + (a < b === b < c ? '+' : '-');
    if (seen.has(key)) continue;
    seen.add(key); faces.push(a, b, c);
  }
  const positions = new Float32Array(sums.length * 3), colours = new Float32Array(sums.length * 3);
  sums.forEach((sum, i) => { positions.set([sum[0] / sum[6], sum[1] / sum[6], sum[2] / sum[6]], i * 3); colours.set([sum[3] / sum[6], sum[4] / sum[6], sum[5] / sum[6]], i * 3); });
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  result.setIndex(faces); result.computeVertexNormals();
  return result;
}

// The average colour of a material's photograph, read once from a small copy of it (in a browser); its own colour
// alone where the picture cannot be read.
const averages = new WeakMap();
function averageColour(material) {
  if (averages.has(material)) return averages.get(material);
  const colour = material.color ? material.color.clone() : new THREE.Color(0x8a7c68), image = material.map?.image;
  try {
    const canvas = image && (globalThis.OffscreenCanvas ? new OffscreenCanvas(8, 8) : globalThis.document?.createElement('canvas'));
    if (canvas) {
      canvas.width = canvas.height = 8;
      const context = canvas.getContext('2d', {willReadFrequently:true});
      context.drawImage(image, 0, 0, 8, 8);
      const pixels = context.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < pixels.length; i += 4) { r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; }
      const count = pixels.length / 4 * 255;
      colour.multiply(new THREE.Color().setRGB(r / count, g / count, b / count, THREE.SRGBColorSpace));
    }
  } catch { /* The material's own colour stands in. */ }
  averages.set(material, colour);
  return colour;
}

/**
 * The town's art: loads each family file once, the first time a piece from it is asked for, and prepares each piece
 * once. `loadModel(url)` resolves to the family's scene. `onLoad` is called when a family arrives.
 */
export function createTownArtLibrary({loadModel, folder = TOWN_ART_FOLDER, onLoad = () => {}} = {}) {
  if (typeof loadModel !== 'function') throw new TypeError('The town art needs a way to load its models.');
  const families = new Map(), pieces = new Map(), lamps = new Map(), faults = [];
  const flat = new THREE.MeshStandardMaterial({vertexColors:true, roughness:.92, metalness:.08}); flat.name = 'Town art far colours';
  let lit = false, disposed = false;
  const lampMaterial = material => {
    if (!lamps.has(material)) {
      const glow = material.clone();
      glow.emissive = new THREE.Color(0xffc27a); glow.emissiveIntensity = lit ? 2.4 : 0; glow.name = `${material.name || 'lamp'} (lit at night)`;
      lamps.set(material, glow);
    }
    return lamps.get(material);
  };
  const family = name => {
    if (!families.has(name)) {
      const entry = {status:'loading', scene:null};
      families.set(name, entry);
      Promise.resolve().then(() => loadModel(folder + TOWN_ART_FAMILIES[name])).then(scene => {
        if (disposed) return;
        entry.scene = scene?.scene ?? scene; entry.status = entry.scene ? 'ready' : 'error'; entry.scene?.updateMatrixWorld(true); onLoad(name);
      }, () => { entry.status = 'error'; onLoad(name); });
    }
    return families.get(name);
  };

  const prepare = (key, root) => {
    const [, nodePart] = key.split('/'), [node, part] = nodePart.split('#');
    let pieceRoot = null;
    root.traverse(object => { if (!pieceRoot && sameName(object, node)) pieceRoot = object; });
    if (!pieceRoot) { faults.push(`${key}: the family has no piece of that name`); return null; }
    let source = pieceRoot;
    if (part) {
      source = null; pieceRoot.traverse(object => { if (!source && sameName(object, `${node}:${part}`)) source = object; });
      if (!source) { faults.push(`${key}: the piece has no part of that name`); return null; }
    }
    pieceRoot.updateMatrixWorld(true);
    const toPiece = pieceRoot.matrixWorld.clone().invert(), optional = OPTIONAL_PARTS.get(node);
    const meshes = [], live = [];
    const walk = (object, liveOwner) => {
      const name = modelName(object);
      if (!part && object !== pieceRoot && optional && optional.has(name.split(':').slice(1).join(':'))) return;
      const isLive = !liveOwner && LIVE_PART.test(name);
      if (isLive) live.push({source:object, parent:new THREE.Matrix4().multiplyMatrices(toPiece, object.parent.matrixWorld)});
      const owner = liveOwner || (isLive ? object : null);
      if (object.isMesh && !object.isSkinnedMesh && object.geometry?.getAttribute('position')) {
        const matrix = new THREE.Matrix4().multiplyMatrices(toPiece, object.matrixWorld);
        const box = new THREE.Box3().setFromBufferAttribute(object.geometry.getAttribute('position')).applyMatrix4(matrix);
        const lamp = LAMP_PART.test(name) || LAMP_PART.test(modelName(object.parent));
        meshes.push({object, matrix, box, live:!!owner, lamp, material:Array.isArray(object.material) ? object.material[0] : object.material,
          triangles:triangles(object.geometry)});
      }
      for (const child of object.children) walk(child, owner);
    };
    walk(source, null);
    if (!meshes.length) { faults.push(`${key}: the piece has no meshes`); return null; }
    // A part the table says strays outside its piece (an export fault, TOWN_ART_KEEP_WITHIN) is left out and named.
    const within = TOWN_ART_KEEP_WITHIN[key.split('#')[0]] ?? Infinity;
    const kept = meshes.filter(mesh => {
      const nearest = Math.hypot(Math.max(mesh.box.min.x, 0, -mesh.box.max.x), Math.max(mesh.box.min.z, 0, -mesh.box.max.z));
      if (nearest <= within) return true;
      faults.push(`${key}: ${modelName(mesh.object) || 'a part'} stands ${Math.round(nearest)} m from the piece and is left out`);
      return false;
    });
    const bounds = new THREE.Box3();
    for (const mesh of kept) bounds.union(mesh.box);
    const diagonal = bounds.getSize(new THREE.Vector3()).length();
    const size = mesh => mesh.box.getSize(new THREE.Vector3()).length();
    const sets = {near:kept.filter(mesh => !mesh.live), mid:kept.filter(mesh => size(mesh) >= Math.max(.9, diagonal * .06)),
      far:kept.filter(mesh => size(mesh) >= Math.max(2.5, diagonal * .22))};
    for (const level of ['mid', 'far']) if (!sets[level].length) sets[level] = [kept.reduce((a, b) => size(a) >= size(b) ? a : b)];
    const merged = new Map();
    const build = list => {
      const signature = list.map(mesh => mesh.object.uuid).join(',');
      if (merged.has(signature)) return merged.get(signature);
      const groups = new Map();
      for (const mesh of list) {
        const material = mesh.lamp ? lampMaterial(mesh.material) : mesh.material;
        if (!groups.has(material)) groups.set(material, []);
        groups.get(material).push(prepareGeometry(mesh.object, mesh.matrix));
      }
      const parts = [...groups].map(([material, geometries]) => {
        const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
        if (geometries.length > 1) geometries.forEach(item => item.dispose());
        geometry.computeBoundingSphere(); geometry.computeBoundingBox();
        return {geometry, material, triangles:triangles(geometry)};
      });
      merged.set(signature, parts);
      return parts;
    };
    // Far: one geometry for the whole piece, each part in its photograph's average colour. See-through parts (chain
    // fence, glass) are left out at that distance.
    const buildFlat = list => {
      const solid = list.filter(mesh => !mesh.material?.transparent && !(mesh.material?.alphaTest > 0));
      const geometries = (solid.length ? solid : list).map(mesh => {
        const geometry = prepareGeometry(mesh.object, mesh.matrix), colour = averageColour(mesh.material), count = geometry.getAttribute('position').count;
        const colours = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) colours.set([colour.r, colour.g, colour.b], i * 3);
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        return geometry;
      });
      for (const item of geometries) item.deleteAttribute('uv');
      const whole = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
      if (geometries.length > 1) geometries.forEach(item => item.dispose());
      // Corners closer than a 28th of the piece's size (and at least 0.35 m) become one.
      const geometry = clusterGeometry(whole, Math.max(.35, diagonal / 28));
      whole.dispose();
      geometry.computeBoundingSphere(); geometry.computeBoundingBox();
      return [{geometry, material:flat, triangles:triangles(geometry)}];
    };
    const levels = {near:build(sets.near), mid:build(sets.mid), far:buildFlat(sets.far)};
    merged.set('far', levels.far);
    return {key, levels, live, radius:Math.max(.5, diagonal / 2), bounds, name:node, homes:/^(shack|stack|block|terrace)-[a-z]$/.test(node),
      geometries:[...new Set([...merged.values()].flat().map(item => item.geometry))]};
  };

  return {
    families,
    faults,
    /** The prepared piece, null while its family loads (it is then asked for), or undefined if it cannot be drawn. */
    piece(key, familyName = key.split('/')[0]) {
      if (pieces.has(key)) return pieces.get(key);
      if (!TOWN_ART_FAMILIES[familyName]) { pieces.set(key, undefined); return undefined; }
      const entry = family(familyName);
      if (entry.status === 'loading') return null;
      const prepared = entry.status === 'ready' ? prepare(key, entry.scene) ?? undefined : undefined;
      pieces.set(key, prepared);
      return prepared;
    },
    /** Whether lamps glow (at night). */
    setLit(value) {
      if (lit === !!value) return;
      lit = !!value;
      for (const glow of lamps.values()) glow.emissiveIntensity = lit ? 2.4 : 0;
    },
    get lit() { return lit; },
    status() { return Object.fromEntries([...families].map(([name, entry]) => [name, entry.status])); },
    dispose() {
      disposed = true;
      for (const prepared of pieces.values()) prepared?.geometries.forEach(geometry => geometry.dispose());
      for (const glow of lamps.values()) glow.dispose();
      flat.dispose();
      for (const entry of families.values()) entry.scene?.traverse(object => {
        object.geometry?.dispose?.();
        for (const material of [object.material].flat().filter(Boolean)) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
          material.dispose?.();
        }
      });
      pieces.clear(); families.clear(); lamps.clear();
    },
  };
}

const pose = new THREE.Object3D();
function placementMatrix(placement, target = new THREE.Matrix4()) {
  pose.position.set(placement.x, placement.y, placement.z); pose.rotation.set(0, placement.turn || 0, 0);
  pose.scale.set(placement.sx || 1, placement.sy || 1, placement.sz || 1); pose.updateMatrix();
  return target.copy(pose.matrix);
}

/**
 * Draws a plan's placements into `parent`. Call `setPlan` when the town changes and `update` each frame with the
 * viewer's position; the instance lists are rebuilt when the plan changes, a family arrives or the viewer has moved
 * 24 m, at most four times a second.
 */
export function createTownArtDrawing({library, parent, bands = TOWN_ART_BANDS, shadows = true}) {
  if (!library || !parent) throw new TypeError('The town art needs its library and a group to draw in.');
  const pools = new THREE.Group(); pools.name = 'Town art'; parent.add(pools);
  let live = null;
  const pool = new Map();
  const proxyGeometry = new THREE.BoxGeometry(1, 1, 1), proxyMaterial = new THREE.MeshBasicMaterial();
  const state = {placements:[], dirty:true, viewer:null, fogFar:Infinity, since:Infinity, drawn:{drawCalls:0, triangles:0, instances:0, live:0, skipped:0},
    disposed:false};
  const matrix = new THREE.Matrix4();

  const meshFor = (id, part, level, count) => {
    let mesh = pool.get(id);
    if (mesh && mesh.instanceMatrix.count < count) { pools.remove(mesh); mesh.dispose(); mesh = null; }
    if (!mesh) {
      mesh = new THREE.InstancedMesh(part.geometry, part.material, Math.max(4, Math.ceil(count * 1.5)));
      mesh.name = `Town art ${id}`; mesh.receiveShadow = true; mesh.castShadow = shadows && level === 'near';
      mesh.userData.sharedTownAsset = true; mesh.userData.townArt = true;
      // The instance lists are already cut to what can be seen (rebuild), so the whole list is drawn.
      mesh.frustumCulled = false;
      pool.set(id, mesh); pools.add(mesh);
    }
    return mesh;
  };

  const sphere = new THREE.Sphere(), frustum = new THREE.Frustum(), viewMatrix = new THREE.Matrix4();
  const rebuild = (viewer, camera) => {
    const buckets = new Map();
    let skipped = 0, waiting = 0;
    // With a camera, what is behind or beside it is left out too, with room to turn a little before the next rebuild.
    if (camera) { camera.updateMatrixWorld(); viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(viewMatrix); }
    for (const placement of state.placements) {
      const piece = library.piece(placement.key, placement.family);
      if (piece === null) { waiting++; continue; }
      if (!piece) { skipped++; continue; }
      const distance = Math.hypot(placement.x - viewer.x, placement.y - (viewer.y ?? placement.y), placement.z - viewer.z);
      if (distance - piece.radius > state.fogFar * bands.fogMargin || piece.radius / Math.max(1, distance) < bands.smallest) { skipped++; continue; }
      if (camera) {
        sphere.center.set(placement.x, placement.y, placement.z); sphere.radius = piece.radius * Math.max(placement.sx || 1, placement.sz || 1) + 12 + distance * .35;
        if (!frustum.intersectsSphere(sphere)) { skipped++; continue; }
      }
      const level = distance < bands.near ? 'near' : distance < bands.mid ? 'mid' : 'far';
      const id = `${level}|${placement.key}`;
      if (!buckets.has(id)) buckets.set(id, {level, piece, list:[]});
      buckets.get(id).list.push(placement);
    }
    const used = new Set();
    let drawCalls = 0, tris = 0, instances = 0;
    for (const [id, {level, piece, list}] of buckets) {
      piece.levels[level].forEach((part, index) => {
        const mesh = meshFor(`${id}|${index}`, part, level, list.length);
        used.add(`${id}|${index}`);
        list.forEach((placement, at) => mesh.setMatrixAt(at, placementMatrix(placement, matrix)));
        mesh.count = list.length; mesh.visible = true;
        mesh.instanceMatrix.needsUpdate = true;
        // Picking tests each instance against this sphere first; one round the whole list is enough for that.
        mesh.boundingSphere = null;
        mesh.userData.townItems = list.map(placement => placement.item);
        drawCalls++; tris += part.triangles * list.length;
      });
      instances += list.length;
    }
    for (const [id, mesh] of pool) if (!used.has(id)) { mesh.count = 0; mesh.visible = false; mesh.userData.townItems = []; }
    // Moving parts and the homes' roofs (for chimney smoke) near the viewer, as their own objects. A new group each
    // time, so town-fx.js sees that its parts changed.
    if (live) { parent.remove(live); live.clear(); }
    live = new THREE.Group(); live.name = 'Town art moving parts';
    for (const [, {level, piece, list}] of buckets) {
      if (level !== 'near') continue;
      for (const placement of list) {
        placementMatrix(placement, matrix);
        for (const part of piece.live) {
          const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.multiplyMatrices(matrix, part.parent);
          const copy = part.source.clone(true); copy.traverse(object => { object.userData.sharedTownAsset = true; });
          copy.userData.townItem = placement.item; holder.add(copy); live.add(holder);
        }
        if (piece.homes) {
          const roof = new THREE.Group(); roof.name = piece.name; roof.matrixAutoUpdate = false; roof.matrix.copy(matrix);
          const box = new THREE.Mesh(proxyGeometry, proxyMaterial); box.visible = false; box.layers.set(31);
          box.position.copy(piece.bounds.getCenter(new THREE.Vector3())); box.scale.copy(piece.bounds.getSize(new THREE.Vector3()));
          roof.userData.sharedTownAsset = box.userData.sharedTownAsset = true; roof.add(box); live.add(roof);
        }
      }
    }
    parent.add(live);
    state.drawn = {drawCalls, triangles:Math.round(tris), instances, live:live.children.length, skipped, waiting};
    // A piece whose family is still loading is drawn as soon as it arrives.
    state.dirty = waiting > 0;
  };

  return {
    group:pools,
    state,
    setPlan(placements) { state.placements = placements; state.dirty = true; },
    markDirty() { state.dirty = true; },
    update({viewer, camera = null, fogFar = Infinity, hour = 12, dt = 1 / 60} = {}) {
      if (state.disposed || !viewer) return state.drawn;
      library.setLit(hour >= 18 || hour < 6);
      state.since += dt;
      const moved = !state.viewer || Math.hypot(viewer.x - state.viewer.x, (viewer.y ?? 0) - (state.viewer.y ?? 0), viewer.z - state.viewer.z) > 24;
      const fogChanged = Math.abs(fogFar - state.fogFar) > Math.max(20, state.fogFar * .08);
      const looking = camera ? camera.getWorldDirection(new THREE.Vector3()) : null;
      const turned = looking && (!state.looking || looking.dot(state.looking) < Math.cos(.12));
      if ((state.dirty || moved || fogChanged || turned) && state.since >= .25) {
        state.since = 0; state.viewer = {x:viewer.x, y:viewer.y, z:viewer.z}; state.fogFar = fogFar; state.dirty = false; state.looking = looking;
        rebuild(state.viewer, camera);
      }
      return state.drawn;
    },
    stats() { return {...state.drawn}; },
    dispose() {
      state.disposed = true;
      for (const mesh of pool.values()) mesh.dispose();
      pool.clear(); parent.remove(pools); if (live) parent.remove(live);
      proxyGeometry.dispose(); proxyMaterial.dispose();
    },
  };
}
