import * as THREE from 'three';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {DRY_PUMP_SOLIDS, DRY_PUMP_SPOTS} from '../content/dry-pump-places.js';
import {heistLampPose} from '../content/mission-kinds.js';
import {siteSpot} from '../site-rule.js';

const rust = 0x795c43, plaster = 0x8b806f, metal = 0x625c53, brass = 0xac8439;
const floor = p => scablandsSurfaceHeightAt(p.x, p.z);
const box = (group, name, p, width, height, depth, color) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({color, roughness: .9}));
  mesh.name = name;
  mesh.position.set(p.x, p.y, p.z);
  group.add(mesh);
  return mesh;
};

export function busRingLook(heightAt) {
  const yard = new THREE.Group();
  for (const [x, z, heading] of [[-9, 0, 0], [6, -7, Math.PI / 2], [9, 6, -.3]]) {
    const bus = box(yard, 'Bus Ring bus shell', {x, y: heightAt(x, z) + 1.3, z}, 2.5, 2.6, 7, rust);
    bus.rotation.y = heading;
  }
  return yard;
}

export function makeDryPumpLook(group) {
  const mall = new THREE.Group();
  mall.name = 'Dry Pump Mall';
  const cistern = new THREE.Group();
  cistern.name = 'The dry trough';
  const pump = box(cistern, 'Pump pipe', {x: .42, y: .85, z: 0}, .12, 1.7, .1, metal);
  const rod = box(cistern, 'Pump rod', {x: .5, y: 1.25, z: .05}, .055, .9, .065, metal);
  box(cistern, 'Tin trough bottom', {x: -.4, y: .12, z: .18}, 1.35, .18, .68, metal);
  for (const side of [-1, 1]) {
    box(cistern, 'Tin trough side', {x: -.4, y: .26, z: .18 + side * .31}, 1.35, .25, .04, metal);
    box(cistern, 'Tin trough end', {x: -.4 + side * .675, y: .26, z: .18}, .04, .25, .65, metal);
  }
  box(cistern, 'Water barrel', {x: 1.25, y: .46, z: .75}, .75, .92, .71, rust);
  const water = box(cistern, 'Water in the trough', {x: -.4, y: .29, z: .18}, 1.27, .02, .58, 0x637f76);
  for (const {id, ...p} of DRY_PUMP_SOLIDS)
    box(mall, id, {...p, y: floor(p) + p.height / 2}, p.halfX * 2, p.height, p.halfZ * 2, p.kind === 'wreck' ? rust : plaster);
  const valveAt = DRY_PUMP_SPOTS['shoe-shop'];
  box(mall, 'Shoe shop counter', {...valveAt, z: valveAt.z + 1.25, y: floor(valveAt) + .54}, 2, 1.08, .6, rust);
  const valve = box(mall, 'Brass valve', {...valveAt, z: valveAt.z + 1.25, y: floor(valveAt) + 1.13}, .31, .13, .25, brass);
  box(mall, 'Ash sacks and blanket rolls', {...valveAt, x: valveAt.x + 2, y: floor(valveAt) + .65}, 1.05, 1.3, 2.1, metal);
  const lamps = [0, 1].map(i => {
    const p = DRY_PUMP_SPOTS[i ? 'lamp-east' : 'lamp-west'];
    const rig = new THREE.Group();
    rig.position.set(p.x, floor(p), p.z);
    box(rig, 'Lamp stand', {x: 0, y: .87, z: 0}, .13, 1.74, .14, metal);
    const head = box(rig, 'Search lamp', {x: 0, y: 1.8, z: 0}, .36, .25, .42, brass);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1, 16, Math.PI / 2 - 30 * Math.PI / 360, 30 * Math.PI / 180),
      new THREE.MeshBasicMaterial({color: 0xf1d091, transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide}));
    fan.name = 'Sweeping lamp beam';
    fan.rotation.x = Math.PI / 2;
    fan.position.y = .065;
    const rotating = new THREE.Group();
    rotating.add(fan, head);
    rig.add(rotating);
    mall.add(rig);
    return {rig, rotating, fan};
  });
  cistern.visible = mall.visible = false;
  group.add(cistern, mall);
  return {
    update(open, here, placeAt, drawnShift) {
      const enabled = open?.parts.threads?.places?.dryPumpEnabled;
      const record = enabled && open.world.open.threads['dry-pump'];
      const placed = record && placeAt('@camp', record.cast);
      const spot = placed && (siteSpot(record.cast.camp, open.world.open.landSeed, 'pump') ?? placed);
      const finished = record && open.world.ledger.marks.includes('dry-pump/water-back');
      cistern.visible = !!spot && (finished || !record.end || record.end === 'fetched-it-themselves' &&
        open.world.ledger.night >= record.began + 13) && Math.hypot(here.x - spot.x, here.z - spot.z) <= 160;
      if (cistern.visible) {
        // The Glasshouse already has a wind pump. Stand its trough beside the existing pipe.
        pump.visible = rod.visible = record.cast.camp !== 'glasshouse';
        cistern.position.set(spot.x - 1.25, floor(spot) + (drawnShift?.(spot.x, spot.z) ?? 0), spot.z);
        rod.position.y = 1.25 + Math.sin(4 * open.seconds) * .15;
        water.visible = finished || record.end === 'fetched-it-themselves';
      }
      mall.visible = !!record && !!open.parts.threads.dryPump?.mall && Math.hypot(here.x - valveAt.x, here.z - valveAt.z) <= 180;
      if (!mall.visible) return;
      const active = open.parts.missions?.active;
      const rule = active?.mission.rule;
      const clock = active?.state.elapsed ?? 0;
      const stations = active?.state.route.lamps;
      valve.visible = !active?.state.carrying && !open.world.ledger.marks.includes('dry-pump/took-the-spare');
      lamps.forEach(({rig, rotating, fan}, i) => {
        rig.visible = !!stations?.[i] && !rule.road;
        if (!rig.visible) return;
        rotating.rotation.y = heistLampPose(stations[i], clock).heading;
        fan.scale.setScalar(rule.range);
      });
    },
    roots: [mall, cistern],
  };
}
