import {checkBuilding, requireSound} from '../check-tables.js';

const service = (id, by) => ({id, by, needs: {fact: 'word', of: 'tin-town', atLeast: 'Wary'}});
export const BUILDINGS = Object.freeze(requireSound([
  {id: 'forge-shed', place: 'tin-town', at: [-7.5, -44.75], shell: 'tin-town-cluster-1-slot-6',
    size: [5, 4, 3], door: {side: 'south', width: 1.4}, carBay: {at: [0, 6], radius: 3},
    room: {spots: {work: [-1.25, -.6], bench: [-1.25, -1.5], cot: [1.4, -1], anvil: [-1.8, .6],
      'gas-bottles': [-1.9, -1.5], 'parts-rack': [.25, -1.65]},
      things: ['bench', 'cot', 'anvil', 'gas-bottles', 'parts-rack',
        {id: 'hearth', at: [-2.02, -.48]}, {id: 'forge-scale', at: [-1.4, .6]}]},
    services: [service('repair', 'odessa')], finds: []},
  {id: 'bess-shed', place: 'tin-town', at: [26, 46.25], shell: 'tin-town-cluster-5-slot-5',
    size: [4, 3, 2.6], door: {side: 'south', width: 1.4}, carBay: {at: [0, 6.5], radius: 3.5},
    room: {spots: {work: [-.8, 0], bucket: [-1.4, .25], brush: [-1.5, -.9], bench: [.9, -.8]},
      things: ['bucket', 'brush', 'bench', {id: 'hose', at: [-.55, -1.38]},
        {id: 'floor-drain', at: [.48, .48]}]},
    services: [service('wash', 'moss')], finds: []},
], checkBuilding, 'Tin Town service sheds'));
