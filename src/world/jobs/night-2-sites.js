import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {tinTownGateFor} from '../tin-town-gate.js';
import {brandSites} from './brand-sites.js';
import {HANDCART, STORY_FIGURES, walkerGroupAt} from './story-people.js';

const heightAt = scablandsSurfaceHeightAt;
export const night2Point = (x, z) => ({x, y: heightAt(x, z), z});
const place = (id, x, z, radius) => ({id, position: night2Point(x, z), radius});
const town = brandSites();
const gate = tinTownGateFor(LAND).gate;
const around = town.ashEntries;

// The Wash crossing is several kilometres away on this map. The Walkers camp
// on the Tin Town approach, beyond the open west side of the fence.
const camp = place('wash-camp', Math.round(gate.x - Math.sqrt(600 ** 2 - (250 - gate.z - 26) ** 2)), 250, 8);
const gateInside = place('gate-inside', gate.x, gate.z - 12, 3);
const gateOutside = place('gate-outside', gate.x, gate.z + 14, 3);
const westGap = place('west-gap', 5914, 0, 4);
const westCut = place('west-cut', 5820, 109, 5);
const scoutWall = place('scout-wall', 6069, -48, 2.2);
const scoutGate = place('scout-gate', gate.x, gate.z + 10, 2);
const store = place('ember-store', 6024, 14, 2);
const campWalk = place('wash-edge', camp.position.x + 14, camp.position.z - 4, 5);
const hearthApproach = place('hearth-approach', town.hearthFront.position.x, town.hearthFront.position.z + 2.2, 2.2);
const pump = town.lamps[0];
export const NIGHT_2_SITES = {
  ...town, gate, gateInside, gateOutside, westGap, westCut, scoutWall, scoutGate, store, camp, campWalk, hearthApproach, around, pump,
  car: {...night2Point(gate.x, gate.z + 26), heading: -Math.PI / 2},
  tower: {
    position: {...night2Point(gate.x + 4.8, gate.z + .5), y: gate.postHeight + 1.8},
    target: {...camp.position, y: camp.position.y + 1.1},
    fov: 9,
  },
  campShelter: place('wash-lean-to', camp.position.x - 6, camp.position.z, 5),
};

const person = (id, position, yaw = 0, action, seat) => ({id, position, yaw, action, seat});

function sitWimOnCart(people) {
  const child = people.find(item => item.id === 'wim');
  const adult = people.find(item => item.id === 'walker-1');
  const {x, z} = adult.position;
  const yaw = adult.yaw, forward = HANDCART.axleAhead + .13;
  const at = night2Point(x + Math.sin(yaw) * forward, z + Math.cos(yaw) * forward);
  // The imported sit pose is measured from a low stool. Lift it so her hips
  // rest on the cart's slats and turn the knees towards the open end.
  at.y = adult.position.y + HANDCART.bedHeight - STORY_FIGURES.wim.height * .263;
  Object.assign(child, {position: at, yaw: yaw + Math.PI, action: 'sit', seat: 'handcart'});
}

export function night2Cast(set, daceAt) {
  const {auntie, pump, camp, gate, hearthApproach: hearth} = NIGHT_2_SITES;
  const solder = person('auntie-solder', auntie.position, 0, set === 'sleep' ? 'sit' : 'stand');
  const cinder = person('cinder', night2Point(hearth.position.x + 1.25, hearth.position.z + 1.1));
  const gateCinder = person('cinder', night2Point(gate.x + 2.8, gate.z + 11));
  const gateRell = person('rell', night2Point(gate.x - 1.4, gate.z + 19), Math.PI);
  const atGate = () => {
    const people = walkerGroupAt(night2Point(gate.x - 1.4, gate.z + 19), Math.PI, heightAt);
    sitWimOnCart(people);
    return people;
  };
  const campPeople = () => {
    const people = walkerGroupAt(night2Point(camp.position.x + 2, camp.position.z), Math.PI / 2, heightAt);
    sitWimOnCart(people);
    return people;
  };
  if (set === 'gate') return [solder, gateCinder, ...atGate()];
  if (set === 'camp') return [solder, ...campPeople(), person('clinker', night2Point(camp.position.x + 1, camp.position.z - 7))];
  if (set === 'pump' || set === 'sleep') {
    const people = walkerGroupAt(night2Point(pump.position.x + 6, pump.position.z + 5), Math.PI / 2, heightAt);
    if (set === 'sleep') {
      const wim = people.find(item => item.id === 'wim');
      Object.assign(wim, person('wim', night2Point(auntie.position.x - .5, auntie.position.z - .25), -.45, 'sleep'));
    }
    return [solder, cinder, ...people];
  }
  if (set === 'salt') return [solder, person('dace', night2Point(gate.x - 3, gate.z + 7), 0, 'sleep')];
  if (set === 'rell-at-gate') return [solder, gateRell];
  if (set === 'scout') return [solder, person('dace', night2Point(pump.position.x + 7, pump.position.z + 4))];
  if (set === 'chase' || set === 'caught') return [solder, ...campPeople().filter(item => item.id !== 'dace'), person('dace', daceAt)];
  return [solder, cinder];
}
