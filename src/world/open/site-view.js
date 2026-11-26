import * as THREE from 'three';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {createStoryPeople, STORY_FIGURES} from '../jobs/story-people.js';
import {createStoryPeopleView} from '../story-people-view.js';
import {BUS_RING} from './content/market-day-places.js';
import {CAMP_SITES, RADIO_HILL} from './content/sites.js';
import {campPeople} from './content/people-sites.js';
import {isFound, stageOf} from './open-record.js';
import {isTrue} from './facts.js';
import {buildGlasshouse, updateGlasshouse} from './looks/glasshouse-look.js';
import {distance, hasSiteServices, residentPose, sitePosition} from './site-rule.js';

function radioHillLook(heightAt) {
  const group = new THREE.Group();
  const box = (name, x, y, z, width, height, depth, color, extra = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({color, roughness: .86, ...extra}));
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const [mast, hut, generator, anchor] = RADIO_HILL.structures;
  const top = heightAt(mast.x, mast.z) + mast.height;
  box('Radio Hill mast', mast.x, top - mast.height / 2, mast.z,
    mast.halfX * 2, mast.height, mast.halfZ * 2, 0x63514a);
  for (const height of [mast.height - 1, mast.height - 3, mast.height - 5])
    box('Radio Hill aerial', mast.x, top - mast.height + height, mast.z, 4.2, .12, .13, 0x817061);
  const lamp = box('Radio Hill lamp', mast.x, top + .2, mast.z, .38, .38, .38, 0x6d1d15,
    {emissive: 0xff2308, emissiveIntensity: 2.5});
  const other = [hut, generator, anchor].map(row => box('Radio Hill ' + row.id, row.x,
    heightAt(row.x, row.z) + row.height / 2, row.z, row.halfX * 2, row.height, row.halfZ * 2,
    row === hut ? 0x8e7963 : 0x514c46));
  other.push(box('Radio Hill hut roof', hut.x, heightAt(hut.x, hut.z) + hut.height, hut.z, 6, .19, 4.5, 0x56443b));
  other.push(box('Radio Hill hut door', hut.x, heightAt(hut.x, hut.z) + 1, hut.z + hut.halfZ + .05,
    .95, 2, .12, 0x534941));
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(mast.x, top - 4, mast.z),
    new THREE.Vector3(anchor.x, heightAt(anchor.x, anchor.z) + anchor.height, anchor.z),
    new THREE.Vector3(mast.x, top - 4, mast.z),
    new THREE.Vector3(hut.x, heightAt(hut.x, hut.z) + hut.height, hut.z),
  ]), new THREE.LineBasicMaterial({color: 0x514841}));
  group.add(wires);
  other.push(wires);
  group.userData.update = (range, phase, seconds) => {
    for (const node of other) node.visible = range <= 180;
    lamp.visible = phase === 'dark' && seconds % 2.5 < .65;
  };
  return group;
}

function busRingLook(heightAt) {
  const group = new THREE.Group();
  group.name = 'The Bus Ring';
  const metal = new THREE.MeshStandardMaterial({color: 0x775d43, roughness: .93});
  const glass = new THREE.MeshStandardMaterial({color: 0x302f2a, roughness: .65});
  const wood = new THREE.MeshStandardMaterial({color: 0x5e4732, roughness: .95});
  const box = (material, x, y, z, width, height, depth) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  for (const {x, z, halfX, halfZ, height, kind} of BUS_RING.structures) {
    const y = heightAt(x, z);
    box(kind === 'wreck' ? metal : wood, x, y + height / 2, z, halfX * 2, height, halfZ * 2);
    if (kind !== 'wreck') continue;
    const wide = halfX > halfZ;
    for (const side of [-1, 1]) for (const along of [-3, -1, 1, 3])
      box(glass, x + (wide ? along : side * halfX), y + 1.85, z + (wide ? side * halfZ : along),
        wide ? 1.45 : .06, .65, wide ? .06 : 1.45);
  }
  const lamp = box(new THREE.MeshStandardMaterial({color: 0xdba45b, emissive: 0xff891c, emissiveIntensity: 2}),
    0, heightAt(0, -6) + 2.9, -6, .35, .4, .35);
  group.userData.update = (range, phase) => { lamp.visible = phase !== 'day' || range < 120; };
  return group;
}

const LOOKS = {
  glasshouse: (stage, options) => buildGlasshouse({...options, stage: stage === 'burned' ? 'burned' : 'camp'}),
  'radio-hill': (stage, {heightAt}) => radioHillLook(heightAt),
  'bus-ring': (stage, {heightAt}) => busRingLook(heightAt),
};

export function siteLook(id, stage, options = {}) {
  if (!LOOKS[id] || stage === 'empty') return null;
  if (stage !== 'burned' && !hasSiteServices(stage)) return null;
  return LOOKS[id](stage, {heightAt: () => 0, ...options});
}

function clear(node) {
  if (!node) return;
  if (node.userData.dispose) node.userData.dispose();
  else node.traverse(child => {
    child.geometry?.dispose();
    child.material?.dispose();
  });
  node.removeFromParent();
}

function glasshouseFresh(world, site) {
  const burned = world.open.journal.findLast(change => change.type === 'site' && change.key === site && change.after === 'burned');
  return burned ? world.ledger.night < burned.night + 2 : true;
}

export function createSiteView({loadAsset}) {
  const group = new THREE.Group();
  group.name = 'Open Scablands sites';
  let daylight;
  const direction = new THREE.Vector3(), target = new THREE.Vector3();
  function directionToSun() {
    if (!daylight) group.traverseAncestors(parent => {
      if (parent.isScene) daylight = parent.children.find(light => light.isDirectionalLight && light.castShadow);
    });
    if (daylight) return daylight.getWorldPosition(direction).sub(daylight.target.getWorldPosition(target));
  }
  const camps = CAMP_SITES.map(site => {
    const people = createStoryPeopleView(loadAsset);
    group.add(people.group);
    const residents = campPeople(site.id);
    const cast = createStoryPeople(residents.map(row => ({
      id: row.id, figure: row.figure, position: {x: 0, y: 0, z: 0},
      ...(row.id === 'grower-2' ? {framePartner: 'grower-3'} : {}),
      ...(row.id === 'grower-3' ? {framePartner: 'grower-2'} : {}),
    })));
    return {site, people, residents, cast, node: null, key: null};
  });

  return {
    group,
    update(worldJob, here, seconds, drawnShift) {
      const world = worldJob?.open?.world;
      group.visible = !!world;
      if (!world || !here) return;
      const state = worldJob.open.parts.sites ?? {};
      const phase = state.partOfDay ?? 'day';
      for (const camp of camps) {
        const {site, people, residents, cast} = camp;
        if (site.storyOnly && !state.marketSites) {
          if (camp.node) camp.node.visible = false;
          people.group.visible = false;
          continue;
        }
        const position = sitePosition(site.id, world.open.landSeed);
        const heightAt = (x, z) => scablandsSurfaceHeightAt(position.x + x, position.z + z);
        const range = distance(here, position);
        const stage = stageOf(world, site.id);
        const fresh = stage === 'burned' && glasshouseFresh(world, site.id);
        // Allow the sun on the screens to be read at 250 m, including the offset from the site's centre.
        const nearRange = phase === 'day' && hasSiteServices(stage) ? 280 : 180;
        const visible = range <= (site.tell === 'dusk-smoke' && phase !== 'dusk' ? nearRange : site.tellWithin);
        if (!visible) {
          if (camp.node) camp.node.visible = false;
          people.group.visible = false;
          continue;
        }
        const key = [world.open.landSeed, stage, fresh].join('/');
        if (camp.key !== key) {
          clear(camp.node);
          camp.node = siteLook(site.id, stage, {heightAt, fresh});
          camp.key = key;
          if (camp.node) group.add(camp.node);
        }
        if (!camp.node) {
          people.group.visible = false;
          continue;
        }
        camp.node.visible = true;
        camp.node.position.set(position.x, drawnShift?.(position.x, position.z, heightAt(0, 0), undefined, camp.node) ?? 0, position.z);
        if (site.id === 'glasshouse') {
          const {smoke, cart, glint} = camp.node.userData;
          if (smoke) smoke.visible = phase === 'dusk' || fresh;
          const pumpMended = isTrue({fact: 'mark', id: 'glasshouse/pump-mended'}, world) || state.need !== 'glasshouse/pump';
          if (glint) glint.visible = phase === 'day';
          updateGlasshouse(camp.node, seconds, {pumpRunning: pumpMended, sun: glint?.visible ? directionToSun() : undefined});
          if (cart && range < 95 && state.need !== 'glasshouse/cart-axle') {
            const finch = residents.find(row => row.id === 'finch');
            const pose = residentPose(finch, world, state, STORY_FIGURES.finch.pace);
            if (pose.action === 'push-cart') {
              const x = pose.position.x - position.x + Math.sin(pose.yaw) * 1.3;
              const z = pose.position.z - position.z + Math.cos(pose.yaw) * 1.3;
              cart.position.set(x, heightAt(x, z), z);
              cart.rotation.y = pose.yaw;
            }
          }
        } else camp.node.userData.update(range, phase, seconds);
        if (range < 100 && hasSiteServices(stage)) {
          for (const [index, person] of cast.entries()) {
            const pose = residentPose(residents[index], world, state, STORY_FIGURES[residents[index].figure].pace);
            // Finch guides the camp's own water cart, drawn with the camp.
            Object.assign(person, pose, {action: pose.action === 'push-cart' ? 'walk' : pose.action});
          }
          people.update({storyPeople: cast, storySpeaker: state.speaker}, here, seconds, drawnShift);
        } else people.group.visible = false;
      }
    },
    dispose() {
      for (const camp of camps) {
        clear(camp.node);
        camp.people.dispose();
      }
      group.removeFromParent();
    },
  };
}
