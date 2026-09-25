import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from './scene-systems.js';

const GATE_LIFT = 7.25;

export function clampGateOpen(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function resourcesOf(root, resources = new Set()) {
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

function joinedWash(road, material) {
  const walls = road.walls;
  const wash = new THREE.Group();
  wash.name = 'Rustwall wash';
  wash.userData.joinedSeams = 0;
  for (const side of [-1, 1]) {
    const ordered = walls.filter(wall => {
      const center = road.poseAt(wall.progress);
      return Math.sign((wall.x - center.x) * Math.cos(wall.heading)
        - (wall.z - center.z) * Math.sin(wall.heading)) === side;
    });
    const positions = [], uvs = [];
    let distance = 0;
    const point = (wall, along) => {
      const h = wall.heading, across = -side * (wall.halfX - .04);
      return {x: wall.x + Math.cos(h) * across + Math.sin(h) * along,
        z: wall.z - Math.sin(h) * across + Math.cos(h) * along,
        y: wall.y, height: wall.height};
    };
    const between = (a, b) => ({x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
      y: (a.y + b.y) / 2, height: Math.min(a.height, b.height)});
    const inside = (wall, position) => {
      const dx = position.x - wall.x, dz = position.z - wall.z;
      return Math.abs(Math.cos(wall.heading) * dx - Math.sin(wall.heading) * dz) <= wall.halfX - .002
        && Math.abs(Math.sin(wall.heading) * dx + Math.cos(wall.heading) * dz) <= wall.halfZ - .002;
    };
    const join = (a, b) => {
      if (!a || !b || b.progress - a.progress > 8.01) return null;
      const station = {...between(point(a, a.halfZ), point(b, -b.halfZ)),
        heading: Math.atan2(Math.sin(a.heading) + Math.sin(b.heading),
          Math.cos(a.heading) + Math.cos(b.heading)),
        width: 2 * Math.min(a.halfX, b.halfX) - .08};
      const far = {x: station.x + Math.cos(station.heading) * side * station.width,
        z: station.z - Math.sin(station.heading) * side * station.width};
      return inside(a, station) && inside(b, station) && inside(a, far) && inside(b, far)
        ? station : null;
    };
    const emit = (a, b, c) => {
      for (const vertex of [a, b, c]) {
        positions.push(vertex.x, vertex.y, vertex.z);
        uvs.push(vertex.u, vertex.v);
      }
    };
    const contour = (station, band, u) => {
      // The visible slope occupies the physical box: low at the track-side
      // foot, broad near the ridge. Interior bands move at shared stations;
      // they remain in order and leave both physical box edges unchanged.
      const t = band === .38
        ? band + .028 * Math.sin(u * .61 + side * .5) + .010 * Math.sin(u * 1.37)
        : band === .72
          ? band + .026 * Math.sin(u * .53 + side * .8) + .011 * Math.sin(u * 1.19 + 1.4)
          : band;
      const spread = station.width * t;
      const h = station.heading;
      const profile = band === 0 ? 0 : band === .38 ? .67 : band === .72 ? .91 : .88;
      const variation = .025 * Math.sin(u * .47 + side * 1.3) * (band > 0 ? 1 : 0);
      const heightFraction = Math.min(1, profile + variation);
      const atlasWarp = .015 * Math.sin(u * .23 + t * 7.1);
      return {x: station.x + Math.cos(h) * side * spread,
        y: station.y + station.height * heightFraction,
        z: station.z - Math.sin(h) * side * spread,
        u: u / 12, v: Math.max(0, Math.min(1, heightFraction + atlasWarp))};
    };
    for (let index = 0; index < ordered.length; index++) {
      const wall = ordered[index], previous = ordered[index - 1], next = ordered[index + 1];
      const before = join(previous, wall), after = join(wall, next);
      if (after) wash.userData.joinedSeams++;
      const start = before
        ? before
        : point(wall, -wall.halfZ);
      const end = after
        ? after
        : point(wall, wall.halfZ);
      const center = point(wall, 0);
      const stations = [start, center, end].map(station => ({...station,
        heading: station.heading ?? wall.heading,
        width: station.width ?? 2 * (wall.halfX - .04)}));
      for (let segment = 0; segment < 2; segment++) {
        const a = stations[segment], b = stations[segment + 1];
        for (const [lo, hi] of [[0,.38],[.38,.72],[.72,1]]) {
          const p = contour(a,lo,distance), q = contour(a,hi,distance);
          const r = contour(b,hi,distance + 1), s = contour(b,lo,distance + 1);
          if (side < 0) { emit(p,q,r); emit(p,r,s); }
          else { emit(p,r,q); emit(p,s,r); }
        }
        distance++;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const bank = new THREE.Mesh(geometry, material);
    bank.name = side < 0 ? 'Joined left wash bank' : 'Joined right wash bank';
    bank.castShadow = true; bank.receiveShadow = true;
    wash.add(bank);
  }
  return wash;
}

export function createRustwallScene(course, {loadAsset = kind =>
  new GLTFLoader().loadAsync(`/assets/models/wasteland/rustwall/${kind}.glb`)} = {}) {
  const group = new THREE.Group();
  group.name = 'Rustwall';
  group.userData.assetStatus = course.hiddenRoad ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false, fraction = 0, panel = null, panelBaseY = 0;
  const released = new Set(), unattached = new Set();

  function releaseUnused(asset) {
    const attached = resourcesOf(group);
    for (const resource of resourcesOf(asset?.scene)) {
      if (attached.has(resource) || released.has(resource) || resource.userData?.sharedAsset) continue;
      released.add(resource);
      resource.dispose();
    }
  }

  function setGateOpen(value) {
    if (retired) return fraction;
    fraction = clampGateOpen(value);
    if (panel) panel.position.y = panelBaseY + GATE_LIFT * fraction;
    return fraction;
  }

  function dispose() {
    if (retired) return;
    retired = true;
    group.visible = false;
    // disposeTree owns the attached graph. Remember these identities so a
    // delayed GLTF sharing its resources cannot release them for a second time.
    resourcesOf(group, released);
    for (const asset of unattached) releaseUnused(asset);
    unattached.clear();
  }
  registerSceneSystem(group, {dispose});
  group.userData.setGateOpen = setGateOpen;
  let sparks=null;
  function updateJourney(view) {
    if(retired)return;
    setGateOpen(view?.gateOpen??0);
    const points=view?.sparks||[];
    if(points.length&&!sparks){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24*3),3));
      const material=new THREE.PointsMaterial({color:0xffd18a,size:.19,sizeAttenuation:true,
        transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending});
      sparks=new THREE.Points(geometry,material);sparks.name='Gate guide sparks';sparks.frustumCulled=false;group.add(sparks);
    }
    if(!sparks)return;
    sparks.visible=points.length>0;
    for(let i=0;i<Math.min(24,points.length);i++){
      const point=points[i];sparks.geometry.attributes.position.setXYZ(i,point.x,point.y,point.z);
    }
    sparks.geometry.setDrawRange(0,Math.min(24,points.length));
    sparks.geometry.attributes.position.needsUpdate=true;
  }
  group.userData.updateJourney=updateJourney;

  function prepareWall(asset) {
    const gate = asset.scene.getObjectByName('gate-panel');
    if (!gate) throw Error('Rustwall asset needs its movable gate-panel.');
    const pose = course.hiddenRoad.poseAt(course.hiddenRoad.length);
    const placement = new THREE.Group();
    placement.name = 'Rustwall gate placement';
    placement.position.set(pose.x, pose.y, pose.z);
    placement.rotation.y = pose.heading;
    asset.scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    placement.add(asset.scene);
    group.add(placement);
    panel = gate;
    panelBaseY = panel.position.y;
    setGateOpen(fraction);
  }

  function prepareWash(asset) {
    const meshes = [], identity = new THREE.Matrix4();
    asset.scene.updateMatrixWorld(true);
    asset.scene.traverse(node => { if (node.isMesh) meshes.push(node); });
    if (!meshes.length || meshes.length > 2) throw Error('Wash asset needs one or two prepared mesh primitives.');
    let draws = 0, triangles = 0;
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry?.attributes.position || mesh.matrixWorld.elements.some((value, i) =>
        Math.abs(value - identity.elements[i]) > 1e-6)) throw Error('Wash transforms must be baked into normalized geometry.');
      geometry.computeBoundingBox();
      const {min, max} = geometry.boundingBox;
      if (min.x < -1.00001 || min.y < -.00001 || min.z < -1.00001 ||
          max.x > 1.00001 || max.y > 1.00001 || max.z > 1.00001)
        throw Error('Wash geometry leaves its normalized collision envelope.');
      draws += Array.isArray(mesh.material) ? geometry.groups.length : 1;
      triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
    }
    const walls = course.hiddenRoad.walls;
    if (draws > 2 || triangles * walls.length > 30000) throw Error('Wash asset exceeds its prepared instance budget.');
    const wash = joinedWash(course.hiddenRoad, meshes[0].material);
    const joinedTriangles = wash.children.reduce((sum, mesh) =>
      sum + mesh.geometry.attributes.position.count / 3, 0);
    if (joinedTriangles > 30000) throw Error('Joined wash exceeds its prepared triangle budget.');
    group.add(wash);
    releaseUnused(asset);
  }

  async function request(kind) {
    let asset;
    try {
      asset = await loadAsset(kind);
      if (retired) { releaseUnused(asset); return false; }
      if (!asset?.scene) throw Error('Local Rustwall asset has no scene.');
      unattached.add(asset);
      if (kind === 'wall') prepareWall(asset); else prepareWash(asset);
      unattached.delete(asset);
      return true;
    } catch (error) {
      if (!retired) group.userData.loadErrors.push(`${kind}: ${String(error?.message || error)}`);
      return false;
    }
  }

  const ready = course.hiddenRoad ? Promise.all([request('wall'), request('wash')]).then(results => {
    for (const asset of unattached) releaseUnused(asset);
    unattached.clear();
    const loaded = !retired && results.every(Boolean);
    if (!retired) group.userData.assetStatus = loaded ? 'ready' : 'failed';
    return loaded;
  }) : Promise.resolve(false);
  return {group, ready, setGateOpen, dispose};
}
