import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MARKET_PLACES} from './content/market-day-places.js';
import {marketStalls} from './market-day-rule.js';
import {isHeld} from './holds.js';
import {openThreadSigns} from './parts/threads.js';
import {placeForThread} from '../../story/scenes/burned-camp.js';
import {distanceBetween} from '../../story/threads/cast.js';
import {SMOKE_HEIGHT} from '../../story/threads/signs.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {createSmokeColumn} from '../smoke-column.js';
import {SERVICE_LANDMARKS} from './building-rule.js';
import {scoutTrail} from './content/burned-scout.js';
import {buildGlasshouseTrail} from './looks/glasshouse-look.js';
import {makeDryPumpLook} from './looks/dry-pump-look.js';
import {isFresh} from '../../story/threads/signs.js';
import burnedCamp from '../../story/threads/content/burned-camp.js';
import {createHaulerLook} from './looks/stranded-hauler-look.js';
import {lookoutHeading} from './content/mission-kinds.js';
import {TOLL_GATE, TOLL_ID, TOLL_WRECKS, tollPlace} from './content/mall-road-toll-places.js';
import {createFlagSiteView} from './looks/somebody-elses-flag-look.js';

function paintedSign({label}) {
  const canvas = globalThis.document?.createElement?.('canvas');
  const ink = canvas?.getContext('2d');
  if (!ink) return null;
  canvas.width = 512;
  canvas.height = 144;
  ink.fillStyle = '#392b20';
  ink.fillRect(0, 0, 512, 144);
  ink.fillStyle = '#564331';
  ink.fillRect(7, 6, 498, 132);
  ink.strokeStyle = '#be9a61';
  ink.lineWidth = 3;
  ink.strokeRect(13, 12, 486, 120);
  ink.fillStyle = '#f3dab0';
  ink.font = '900 110px Impact, "Arial Black", sans-serif';
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  ink.fillText(label, 256, 76, 460);
  ink.fillStyle = '#201a14';
  for (const x of [24, 488]) for (const y of [24, 120]) {
    ink.beginPath();
    ink.arc(x, y, 4, 0, Math.PI * 2);
    ink.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.25, .92),
    new THREE.MeshStandardMaterial({map, emissive: 0x584633, emissiveMap: map, roughness: .9}));
  mesh.name = label + ' painted shed sign';
  mesh.visible = false;
  return mesh;
}

function falseTrailAsh() {
  const group = new THREE.Group();
  group.name = 'Ash heaped on the cook fire';
  const geometry = new THREE.SphereGeometry(1, 9, 5);
  const material = new THREE.MeshStandardMaterial({color: 0x746d65, roughness: 1});
  for (const [x, z, width, height] of [[0, 0, .66, .19], [.45, .12, .38, .13], [-.37, -.21, .44, .15]]) {
    const heap = new THREE.Mesh(geometry, material);
    heap.position.set(x, .02, z);
    heap.scale.set(width, height, width * .74);
    group.add(heap);
  }
  group.userData.dispose = () => { geometry.dispose(); material.dispose(); };
  return group;
}

function lookoutHeap(post) {
  const group = new THREE.Group();
  group.name = 'Scouting lookout wreck heap';
  const rust = new THREE.MeshStandardMaterial({color: 0x514034, roughness: 1, metalness: .25});
  const dark = new THREE.MeshStandardMaterial({color: 0x272522, roughness: .95});
  const body = new THREE.BoxGeometry(1.8, .55, 4.4);
  const wheel = new THREE.CylinderGeometry(.34, .34, .24, 9);
  // Three tiers of crossed, crushed bodies. Open roof rails leave the broken windows readable.
  for (let tier = 0; tier < 3; tier++) for (const side of [-1, 1]) {
    const car = new THREE.Group();
    car.position.set(side * 1.05, .45 + tier * .96, tier % 2 ? .35 : -.35);
    car.rotation.set(.035 * side, tier % 2 ? .5 : -.3, .05 * side);
    const shell = new THREE.Mesh(body, rust);
    car.add(shell);
    for (const x of [-.81, .81]) for (const z of [-1.4, 1.4]) {
      const tyre = new THREE.Mesh(wheel, dark);
      tyre.rotation.z = Math.PI / 2;
      tyre.position.set(x, -.19, z);
      car.add(tyre);
    }
    for (const x of [-.72, .72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, 1.9), rust);
      rail.position.set(x, .54, -.2);
      car.add(rail);
      for (const z of [-1.1, .7]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(.07, .55, .07), rust);
        pillar.position.set(x, .3, z);
        car.add(pillar);
      }
    }
    group.add(car);
  }
  // Merge the repeated bodies, rails and wheels into two draws for each heap.
  group.updateMatrixWorld(true);
  const pieces = new Map([[rust, []], [dark, []]]), originals = new Set();
  group.traverse(node => {
    if (!node.isMesh) return;
    pieces.get(node.material).push(node.geometry.clone().applyMatrix4(node.matrixWorld));
    originals.add(node.geometry);
  });
  group.clear();
  for (const [material, geometries] of pieces) {
    group.add(new THREE.Mesh(mergeGeometries(geometries), material));
    for (const geometry of geometries) geometry.dispose();
  }
  for (const geometry of originals) geometry.dispose();
  group.position.set(post.x, scablandsSurfaceHeightAt(post.x, post.z), post.z);
  group.rotation.y = post.heading ?? 0;
  return group;
}


function wreckageGate(drawnShift) {
  const root = new THREE.Group();
  root.name = "Sump's Gate wreckage";
  for (const at of TOLL_WRECKS) {
    const wreck = lookoutHeap({...at, heading: at.heading + Math.PI / 2});
    wreck.scale.set(.95, .58, 1.35);
    wreck.position.y += drawnShift?.(at.x, at.z) ?? 0;
    root.add(wreck);
  }
  const at = tollPlace(TOLL_GATE);
  const stand = new THREE.Group();
  stand.position.set(at.x, scablandsSurfaceHeightAt(at.x, at.z) + (drawnShift?.(at.x, at.z) ?? 0), at.z);
  stand.rotation.y = at.heading;
  root.add(stand);
  const metal = new THREE.MeshStandardMaterial({color: 0x716052, roughness: .9});
  const beam = (x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal);
    mesh.position.set(x, y, z);
    stand.add(mesh);
    return mesh;
  };
  beam(-8.8, 1.6, 0, .28, 3.2, .28);
  beam(8.8, .7, 0, .22, 1.4, .22);
  const pivot = new THREE.Group();
  pivot.position.set(-8.8, 1.05, 0);
  const pole = beam(8.8, 0, 0, 17.6, .15, .16);
  pivot.add(pole);
  stand.add(pivot);
  const sign = paintedSign({label: 'TOLL. 2 SCRAP A WHEEL.'});
  if (sign) {
    sign.visible = true;
    sign.position.set(-9, 2.35, -.17);
    sign.rotation.y = Math.PI;
    stand.add(sign);
  }
  const light = new THREE.PointLight(0xff8732, 25, 11);
  light.position.set(-5.5, 1.15, 8);
  const smoke = createSmokeColumn({height: 12, foot: .7, top: 3, strength: .65});
  smoke.position.copy(light.position);
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(.58, .21, 6, 14), metal);
  tyre.rotation.x = Math.PI / 2;
  tyre.position.set(-5.5, .25, 8);
  stand.add(tyre, light, smoke);
  return {root, pivot, smoke, sign};
}

function lookoutFlare() {
  const group = new THREE.Group();
  group.name = 'Scouting lookout flare';
  const light = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6),
    new THREE.MeshBasicMaterial({color: 0xffb96a, transparent: true}));
  light.name = 'Scouting flare light';
  const glow = new THREE.PointLight(0xff6c22, 100, 38, 1.5);
  const smoke = createSmokeColumn({height: 7, foot: .2, top: 1.4, strength: .65, colour: 0x7d7064, pale: 0xc2b9ac});
  smoke.name = 'Scouting flare smoke';
  group.add(light, glow, smoke);
  group.visible = false;
  group.userData.animate = age => {
    const up = Math.max(0, 18 * age - 2.5 * age * age);
    light.position.set(age * .65, up, age * .22);
    glow.position.copy(light.position);
    smoke.position.set(light.position.x, up - 6, light.position.z);
    const fade = Math.min(1, (7.2 - age) / 1.3);
    light.material.opacity = Math.max(0, fade);
    glow.intensity = Math.max(0, 100 * fade);
    smoke.material.uniforms.uStrength.value = Math.max(0, .65 * fade);
    smoke.userData.update(age);
  };
  return group;
}

const disposeMeshes = root => {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => { if (node.isMesh) { geometries.add(node.geometry); materials.add(node.material); } });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  root.removeFromParent();
};

function marketStall(pitch, index, stake) {
  const group = new THREE.Group();
  group.name = (stake ? 'Market stake ' : 'Market stall ') + pitch;
  const wood = new THREE.MeshStandardMaterial({color: 0x785b42, roughness: .94});
  const cloth = new THREE.MeshStandardMaterial({color: [0x9c4840, 0xaa8a57, 0x5c7d84, 0x6d7e52][index % 4], roughness: 1});
  const box = (material, x, y, z, width, height, depth) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    piece.position.set(x, y, z);
    group.add(piece);
  };
  if (stake) {
    box(wood, 0, .35, 0, .1, .7, .1);
    box(cloth, 0, .62, 0, .18, .14, .18);
  } else {
    box(wood, 0, .91, 0, 2.1, .12, .78);
    box(cloth, 0, 2.1, 0, 2.45, .09, 1.45);
    for (const x of [-.96, .96]) for (const z of [-.32, .32])
      box(wood, x, 1.05, z, .075, 2.1, .075);
  }
  return group;
}

export function createSignView() {
  const group = new THREE.Group();
  group.name = 'Open land signs';
  const hauler = createHaulerLook();
  group.add(hauler.root);
  const flagSite = createFlagSiteView();
  group.add(flagSite.group);
  const smoke = new Map();
  const heaps = new Map();
  const stalls = new Map();
  let dryPumpLook, tollLook, tollBuggy, tollLamp;
  const flare = lookoutFlare();
  group.add(flare);
  let trail = null, trailKey = '', flareSeq = 0, flareBorn = 0, lastJob = null;
  const ash = falseTrailAsh();
  ash.visible = false;
  group.add(ash);
  const sheds = SERVICE_LANDMARKS.flatMap(landmark => {
    const sign = paintedSign(landmark);
    if (!sign) return [];
    group.add(sign);
    return [{sign, landmark}];
  });
  const disposeSmoke = (id, mesh) => {
    group.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    smoke.delete(id);
  };
  const positionAt = (mesh, {x, z}, drawnShift) => {
    mesh.position.set(x, scablandsSurfaceHeightAt(x, z) + (drawnShift?.(x, z) ?? 0), z);
  };
  return {
    group,
    update(worldJob, here, seconds, drawnShift) {
      for (const {sign, landmark} of sheds) {
        sign.visible = !!worldJob?.serviceSheds && distanceBetween(here, landmark) < 550;
        if (sign.visible) {
          positionAt(sign, landmark, drawnShift);
          sign.position.y += landmark.height;
        }
      }
      const open = worldJob?.open;
      const market = open?.world.open.threads['market-day'];
      const marketActive = market && open.parts.missions?.active?.thread === 'market-day';
      const placing = market?.beat === 'stakes' && !market.end && !!open.parts.threads?.market;
      const marketRows = marketActive ? [{people: 'dot', pitch: 'gate'}, ...marketStalls(open.world, market)] :
        placing ? ['beside-the-gate', 'the-pump', 'the-sunny-wall', 'the-forge-wall', 'bess-shed']
          .map(pitch => ({people: pitch, pitch})) : [];
      const keys = new Set(marketRows.map(({people, pitch}) => (placing ? 'stake/' : 'stall/') + people + '/' + pitch));
      for (const [key, stall] of stalls) if (!keys.has(key)) { disposeMeshes(stall); stalls.delete(key); }
      marketRows.forEach(({people, pitch}, index) => {
        const key = (placing ? 'stake/' : 'stall/') + people + '/' + pitch;
        let stall = stalls.get(key);
        if (!stall) { stall = marketStall(pitch, index, placing); stalls.set(key, stall); group.add(stall); }
        const point = MARKET_PLACES[pitch];
        stall.visible = distanceBetween(here, point) < 180;
        if (stall.visible) {
          positionAt(stall, point, drawnShift);
          if (!placing) stall.position.z -= 1.7;
        }
      });

      hauler.update(open, here, open?.seconds ?? seconds, drawnShift);
      flagSite.update(open?.parts.threads?.places.checkpointsEnabled ? open : null, here, seconds, drawnShift);
      if (lastJob !== worldJob) {
        flareSeq = 0;
        flare.visible = false;
        lastJob = worldJob;
      }
      const posts = open?.parts.missions?.active?.state.route.posts ?? [];
      const keptPosts = new Set(posts.map((post, i) => post.heap ? i : null));
      for (const [id, heap] of heaps) if (!keptPosts.has(id)) { disposeMeshes(heap); heaps.delete(id); }
      posts.forEach((post, i) => {
        if (!post.heap) return;
        let heap = heaps.get(i);
        if (!heap) { heap = lookoutHeap(post); heaps.set(i, heap); group.add(heap); }
        heap.visible = distanceBetween(here, post) < 1200;
        if (heap.visible) positionAt(heap, post, drawnShift);
      });
      const spotted = open?.events.findLast(event => event.type === 'threadMissionSpotted');
      if (spotted && spotted.seq > flareSeq) {
        flareSeq = spotted.seq;
        flareBorn = spotted.seconds ?? open.seconds;
        flare.position.set(spotted.position.x, spotted.position.y + (spotted.position.eye ?? 1.8), spotted.position.z);
        flare.visible = true;
      }
      const flareAge = (open?.seconds ?? 0) - flareBorn;
      if (!open || flareAge > 7.2) flare.visible = false;
      if (flare.visible) flare.userData.animate(flareAge);
      const view = open?.parts.threads?.places ?? {};
      const tollRecord = view.checkpointsEnabled && open.world.open.threads[TOLL_ID];
      const wreck = tollPlace([TOLL_GATE, 'buggy']);
      const buggyVisible = tollRecord && distanceBetween(here, wreck) <= 500 &&
        (tollRecord.beat === 'round' || open.world.ledger.marks.includes(TOLL_ID + '/knows-the-round')) &&
        !open.world.ledger.marks.some(id => id === TOLL_ID + '/buggy-stripped' || id === TOLL_ID + '/buggy-told');
      if (buggyVisible && !tollBuggy) {
        tollBuggy = lookoutHeap(wreck);
        tollBuggy.scale.set(.65, .4, .85);
        tollBuggy.rotation.z = .42;
        positionAt(tollBuggy, wreck, drawnShift);
        group.add(tollBuggy);
      }
      if (tollBuggy) tollBuggy.visible = !!buggyVisible;
      const active = open?.parts.missions?.active;
      const lampPost = active?.mission.kind === 'lookout' && posts[0];
      if (lampPost && !tollLamp) {
        const geometry = new THREE.ConeGeometry(1, 1, 18, 1, true);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, 0, .5);
        tollLamp = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xffc185,
          transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false}));
        group.add(tollLamp);
      }
      if (tollLamp) {
        tollLamp.visible = !!lampPost;
        if (lampPost) {
          positionAt(tollLamp, lampPost, drawnShift);
          tollLamp.position.y += lampPost.eye ?? 2;
          tollLamp.rotation.y = lookoutHeading(lampPost, active.mission.rule.turnsIn, active.state.elapsed);
          tollLamp.scale.set(30, 1.8, lampPost.range);
        }
      }
      const signs = open ? openThreadSigns({...open, view}) : [];
      const tollVisible = view.tollGate && distanceBetween(here, tollPlace(TOLL_GATE)) <= 600;
      if (tollVisible && !tollLook) {
        tollLook = wreckageGate(drawnShift);
        group.add(tollLook.root);
      }
      if (tollLook) {
        tollLook.root.visible = !!tollVisible;
        if (tollVisible) {
          tollLook.pivot.rotation.z = view.tollGate === 'open' ? 1.38 : 0;
          tollLook.smoke.userData.update(seconds);
        }
      }
      if (view.dryPumpEnabled && open.world.open.threads['dry-pump'] && !dryPumpLook)
        dryPumpLook = makeDryPumpLook(group);
      dryPumpLook?.update(open, here, (place, cast) => placeForThread(place, cast, view), drawnShift);
      const columns = signs.filter(({sign, at}) => sign.kind === 'smoke' && at);
      const kept = new Set(columns.map(({id}) => id));
      for (const [id, mesh] of smoke) if (!kept.has(id)) disposeSmoke(id, mesh);
      for (const {id, sign, at} of columns) {
        let mesh = smoke.get(id);
        if (!mesh) {
          mesh = createSmokeColumn({height: SMOKE_HEIGHT, foot: 4, top: 33, strength: 1.2});
          mesh.name = `${id} smoke`;
          group.add(mesh);
          smoke.set(id, mesh);
        }
        mesh.visible = distanceBetween(here, at) <= (sign.seenWithin ?? Infinity);
        if (mesh.visible) {
          positionAt(mesh, at, drawnShift);
          mesh.userData.update(seconds);
        }
      }
      const burned = open?.world.open.threads['burned-camp'];
      const camp = burned && !burned.end && isFresh(burnedCamp, burned, open.world.ledger.night) &&
        placeForThread('@camp', burned.cast, view);
      const nextTrailKey = camp ? `${camp.x}/${camp.z}` : '';
      if (trailKey !== nextTrailKey) {
        if (trail) { trail.userData.dispose(); group.remove(trail); trail = null; }
        trailKey = nextTrailKey;
        if (camp) {
          trail = buildGlasshouseTrail(scoutTrail(camp), (x, z) => scablandsSurfaceHeightAt(x, z) + (drawnShift?.(x, z) ?? 0));
          group.add(trail);
        }
      }
      const ashAt = burned?.cast.blamed && placeForThread(['@camp', 'stove'], burned.cast, view);
      ash.visible = !!ashAt && distanceBetween(here, ashAt) <= 100 && !isHeld(open.holds, 'signs');
      if (ash.visible) positionAt(ash, ashAt, drawnShift);
    },
    dispose() {
      hauler.dispose();
      flagSite.dispose();
      if (tollBuggy) disposeMeshes(tollBuggy);
      if (tollLamp) disposeMeshes(tollLamp);
      if (tollLook) {
        tollLook.sign?.material.map.dispose();
        disposeMeshes(tollLook.root);
      }
      for (const [id, mesh] of smoke) disposeSmoke(id, mesh);
      for (const heap of heaps.values()) disposeMeshes(heap);
      heaps.clear();
      for (const stall of stalls.values()) disposeMeshes(stall);
      stalls.clear();
      trail?.userData.dispose();
      for (const root of dryPumpLook?.roots ?? []) disposeMeshes(root);
      disposeMeshes(flare);
      for (const {sign} of sheds) {
        sign.geometry.dispose();
        sign.material.map.dispose();
        sign.material.dispose();
      }
      ash.userData.dispose();
      group.clear();
    },
  };
}
