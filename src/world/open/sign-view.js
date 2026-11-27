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
import {RUNAWAY_PLACES} from './content/runaway-places.js';
import {sitePosition} from './site-rule.js';
import burnedCamp from '../../story/threads/content/burned-camp.js';
import {createHaulerLook} from './looks/stranded-hauler-look.js';
import {createLightsLook} from './looks/lights-on-the-whites-look.js';
import {RADIO_ID, POCKET_ID, RADIO_MARK, radioMarked, radioPlace, pocketWrecks} from './content/radio-hill-voice-places.js';
import {heistLampPose} from './content/mission-kinds.js';
import {lookoutHeading} from './content/mission-kinds.js';
import {TOLL_GATE, TOLL_ID, TOLL_WRECKS, tollPlace} from './content/mall-road-toll-places.js';
import {createDaceLook} from './looks/dace-goes-looking-look.js';
import {DACE_ID, DACE_LANDMARKS} from './content/dace-goes-looking-places.js';
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

function radioBearings(group, positionAt) {
  const props = new THREE.Group();
  group.add(props);
  const lamp = (name, color) => {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.38, 8, 5), new THREE.MeshBasicMaterial({color}));
    glow.name = name;
    glow.visible = false;
    group.add(glow);
    return glow;
  };
  const red = lamp('Radio Hill red lamp', 0xff3526), white = lamp('The Pocket white lamp', 0xfff4d2);
  let placedSeed = null, beam = null;
  const placeProps = pocket => {
    for (const mesh of [...props.children]) disposeMeshes(mesh);
    if (!pocket) return;
    for (const row of pocketWrecks(pocket)) props.add(lookoutHeap(row));
    const wheels = new THREE.Mesh(new THREE.CylinderGeometry(.49, .49, 1.02, 12, 4),
      new THREE.MeshStandardMaterial({color: 0x34302d, roughness: 1}));
    wheels.name = 'The Pocket stack of wheels';
    positionAt(wheels, radioPlace([POCKET_ID, 'wheels'], null, pocket));
    wheels.position.y += .51;
    props.add(wheels);
  };
  return {
    update(open, here, drawnShift) {
      const state = open?.parts.threads;
      const record = state?.places?.checkpointsEnabled && open.world.open.threads[RADIO_ID];
      const seed = record ? open.world.open.landSeed : null;
      const hill = record && sitePosition('radio-hill', seed), pocket = record && sitePosition(POCKET_ID, seed);
      if (seed !== placedSeed) { placeProps(pocket); placedSeed = seed; }
      props.visible = !!pocket && distanceBetween(here, pocket) < 700;
      red.visible = white.visible = false;
      if (beam) beam.visible = false;
      if (!record || !state.radioDark) return;
      const time = open.seconds;
      const age = time - (state.progress?.[RADIO_ID]?.blinkedAt ?? -Infinity);
      const blink = age < 3 ? age % 1 < .38 : time % 2 < 1.35;
      const fuel = open.world.ledger.history.findLast(row => row.key === RADIO_MARK.fuel);
      const broken = fuel?.type === 'settle' && fuel.choiceId.includes('/broken/');
      red.visible = blink && !broken && distanceBetween(here, hill) < 4000;
      if (red.visible) {
        positionAt(red, hill, drawnShift);
        red.position.y += 25;
        red.scale.setScalar(Math.max(1, distanceBetween(here, hill) / 260));
      }
      const silenced = record.end === 'second-set' || radioMarked(open.world, RADIO_MARK.peace);
      white.visible = !silenced && distanceBetween(here, pocket) < 4000;
      if (white.visible) {
        const at = radioPlace([POCKET_ID, 'lamp'], hill, pocket);
        positionAt(white, at, drawnShift);
        white.position.y += 2.5;
        const distance = distanceBetween(here, pocket);
        white.scale.setScalar(Math.max(1, distance / 260));
        const mission = open.parts.missions?.active;
        if (distance < 75 && mission?.id === RADIO_ID + '/take-set' && mission.state.route.lamps.length && !mission.state.delivering) {
          const {rule} = mission.mission;
          const lamp = heistLampPose(mission.state.route.lamps[0], mission.state.elapsed);
          if (!beam) {
            beam = new THREE.SpotLight(0xfff4d2, 210, rule.range, rule.coneDegrees * Math.PI / 360, .3, 1.35);
            beam.name = 'The Pocket lamp beam';
            group.add(beam, beam.target);
          }
          beam.visible = true;
          beam.distance = rule.range;
          beam.position.copy(white.position);
          const x = at.x + Math.sin(lamp.heading) * rule.range, z = at.z + Math.cos(lamp.heading) * rule.range;
          beam.target.position.set(x, scablandsSurfaceHeightAt(x, z) + (drawnShift?.(x, z) ?? 0), z);
        }
      }
    },
    dispose() {
      placeProps(null);
      disposeMeshes(red);
      disposeMeshes(white);
      props.removeFromParent();
      if (beam) { beam.removeFromParent(); beam.target.removeFromParent(); beam.dispose(); }
    },
  };
}

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

function runawayClues() {
  const material = new THREE.MeshStandardMaterial({color: 0x797271, roughness: 1});
  const clue = (name, geometry) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Runaway ' + name;
    mesh.visible = false;
    return mesh;
  };
  const prints = new THREE.Group();
  prints.name = 'Runaway footprints';
  const print = new THREE.CircleGeometry(.12, 12);
  for (let i = 0; i < 10; i++) {
    const foot = new THREE.Mesh(print, material);
    foot.position.set(-i * .29, .035, (i % 2) * .22);
    foot.rotation.x = -Math.PI / 2;
    foot.scale.y = .48;
    prints.add(foot);
  }
  prints.visible = false;
  const wire = clue('wire', new THREE.TorusGeometry(.45, .023, 5, 16, Math.PI));
  const bowl = clue('bowl', new THREE.SphereGeometry(.19, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  const hand = clue('handprint', new THREE.CircleGeometry(.15, 7));
  return [
    {key: 'footprints', mesh: prints, lift: 0}, {key: 'wire', mesh: wire, lift: .32},
    {key: 'bowl', mesh: bowl, lift: .06}, {key: 'handprint', mesh: hand, lift: 1.45},
  ];
}

export function createSignView() {
  const group = new THREE.Group();
  group.name = 'Open land signs';
  const hauler = createHaulerLook();
  group.add(hauler.root);
  const flagSite = createFlagSiteView();
  group.add(flagSite.group);
  const radio = radioBearings(group, (mesh, point, shift) => positionAt(mesh, point, shift));
  const smoke = new Map();
  const clues = runawayClues();
  for (const {mesh} of clues) group.add(mesh);
  const lamps = new THREE.Group();
  lamps.name = 'Runaway search lamps';
  group.add(lamps);
  const campHeap = lookoutHeap(RUNAWAY_PLACES.nobody);
  campHeap.name = 'Grey Camp ash and wrecks';
  campHeap.visible = false;
  group.add(campHeap);
  const heaps = new Map();
  const stalls = new Map();
  let daceLook, dryPumpLook, lightsLook, tollLook, tollBuggy, tollLamp;
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
      radio.update(open, here, drawnShift);
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
      if (view.checkpointsEnabled && !daceLook &&
          (open.world.open.threads[DACE_ID] || DACE_LANDMARKS.some(id => open.world.open.found.includes(id))))
        daceLook = createDaceLook(group, positionAt);
      daceLook?.update(open, signs.find(entry => entry.id === DACE_ID), here, drawnShift);
      const stranger = signs.find(entry => entry.id === 'runaway');
      for (const {key, mesh, lift} of clues) {
        const at = RUNAWAY_PLACES[key];
        mesh.visible = !!stranger && distanceBetween(here, at) <= stranger.sign.seenWithin;
        if (mesh.visible) { positionAt(mesh, at, drawnShift); mesh.position.y += lift; }
      }
      const lights = worldJob?.threadSearchCast?.lamps ?? [];
      while (lamps.children.length < lights.length) {
        const lamp = new THREE.Mesh(new THREE.ConeGeometry(3.2, 9, 16, 1, true),
          new THREE.MeshBasicMaterial({color: 0xffd48b, transparent: true, opacity: .19, depthWrite: false, side: THREE.DoubleSide}));
        lamp.rotation.x = -Math.PI / 2;
        const shutter = new THREE.Group();
        shutter.add(lamp);
        lamp.position.set(0, -.35, 4.5);
        lamps.add(shutter);
      }
      lamps.children.forEach((lamp, index) => {
        const light = lights[index];
        lamp.visible = !!light && distanceBetween(here, light) < 150;
        if (lamp.visible) {
          positionAt(lamp, light, drawnShift);
          lamp.position.y += 1.5;
          lamp.rotation.y = light.heading;
        }
      });
      const grey = open?.world.ledger.marks.includes('rumour/grey-camp') ?
        sitePosition('grey-camp', open.world.open.landSeed) : null;
      campHeap.visible = !!grey && distanceBetween(here, grey) < 240;
      if (campHeap.visible) positionAt(campHeap, grey, drawnShift);
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
      if (view.checkpointsEnabled && !lightsLook) {
        lightsLook = createLightsLook();
        group.add(lightsLook.group);
      }
      lightsLook?.update(open, signs.find(({sign}) => sign.kind === 'lights'), here, drawnShift);
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
      lightsLook?.dispose();
      daceLook?.dispose();
      radio.dispose();
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
      for (const {mesh} of clues) disposeMeshes(mesh);
      disposeMeshes(lamps);
      disposeMeshes(campHeap);
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
