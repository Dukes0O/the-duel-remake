import * as THREE from 'three';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {createStoryPeople, STORY_FIGURES} from '../jobs/story-people.js';
import {createStoryPeopleView} from '../story-people-view.js';
import {RADIO_ID, RADIO_MARK} from './content/radio-hill-voice-places.js';
import {CAMP_SITES, landSite} from './content/sites.js';
import {campPeople} from './content/people-sites.js';
import {stageOf} from './open-record.js';
import {isTrue} from './facts.js';
import {buildGlasshouse, updateGlasshouse} from './looks/glasshouse-look.js';
import {distance, hasSiteServices, residentPose, siteLookStage, sitePosition} from './site-rule.js';
import {flagPeople} from './content/somebody-elses-flag-places.js';
import {buildRadioHill, updateRadioHill} from './looks/radio-hill-look.js';
import {buildBusRing, updateBusRing} from './looks/bus-ring-look.js';
import {buildRatsNest, updateRatsNest} from './looks/rats-nest-look.js';

const LOOKS = {
  glasshouse: buildGlasshouse,
  'radio-hill': buildRadioHill,
  'bus-ring': buildBusRing,
  'rats-nest': buildRatsNest,
};

export function siteLook(id, stage, options = {}) {
  const art = siteLookStage(id, stage, options.secondSet, options.night);
  return art && LOOKS[id] ? LOOKS[id]({...options, stage: art}) : null;
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
  const camps = [...CAMP_SITES, landSite('rats-nest')].map(site => {
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
      const night = phase === 'dusk' || phase === 'dark';
      const secondSet = world.ledger.made.includes('radio-hill/second-set');
      for (const camp of camps) {
        const {site, people, residents, cast} = camp;
        if (site.id !== 'glasshouse' && !state.marketSites) {
          if (camp.node) camp.node.visible = false;
          people.group.visible = false;
          continue;
        }
        const position = sitePosition(site.id, world.open.landSeed);
        const heightAt = (x, z) => scablandsSurfaceHeightAt(position.x + x, position.z + z);
        const range = distance(here, position);
        const stage = stageOf(world, site.id);
        const fresh = site.id === 'glasshouse' && stage === 'burned' && glasshouseFresh(world, site.id);
        // Allow the sun on the screens to be read at 250 m, including the offset from the site's centre.
        const nearRange = phase === 'day' && hasSiteServices(stage) ? 280 : 180;
        const radioThread = site.id === 'radio-hill' && world.open.threads[RADIO_ID];
        const tellRange = radioThread && night ? 4000 : site.tellWithin;
        const visible = range <= (site.tell === 'dusk-smoke' && phase !== 'dusk' ? nearRange : tellRange);
        if (!visible) {
          if (camp.node) camp.node.visible = false;
          people.group.visible = false;
          continue;
        }
        const key = [world.open.landSeed, siteLookStage(site.id, stage, secondSet, night), fresh].join('/');
        if (camp.key !== key) {
          clear(camp.node);
          camp.node = siteLook(site.id, stage, {heightAt, fresh, secondSet, night});
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
        } else if (site.id === 'radio-hill') {
          const fuel = radioThread && world.ledger.history.findLast(row => row.key === RADIO_MARK.fuel);
          const broken = fuel?.type === 'settle' && fuel.choiceId.includes('/broken/');
          const signalAt = worldJob.open.parts.threads?.progress?.[RADIO_ID]?.blinkedAt;
          updateRadioHill(camp.node, worldJob.open.seconds, {night, signalAt, lampPowered: !broken});
        } else if (site.id === 'bus-ring') updateBusRing(camp.node, seconds);
        else updateRatsNest(camp.node, seconds);
        if (range < 100 && hasSiteServices(stage)) {
          for (const [index, person] of cast.entries()) {
            const pose = residentPose(residents[index], world, state, STORY_FIGURES[residents[index].figure].pace);
            // Finch guides the camp's own water cart, drawn with the camp.
            Object.assign(person, pose, {action: pose.action === 'push-cart' ? 'walk' : pose.action});
          }
          const away = new Set(flagPeople(world).map(person => person.id));
          people.update({storyPeople: cast.filter(person => !away.has(person.id)), storySpeaker: state.speaker}, here, seconds, drawnShift);
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
