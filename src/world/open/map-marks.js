// The map reads the open record. Its caller supplies each site's position for this land.
import {namedThrow} from '../../story/ledger.js';
import {isTrue} from './facts.js';
import {isFound, stageOf} from './open-record.js';
import {SITES} from './register.js';
import {TOLL_GATE, TOLL_ID} from './content/mall-road-toll-places.js';
import {flagStory, FLAG_ID} from './content/somebody-elses-flag-places.js';

export function openMapMarks(world, positionOf) {
  const sites = [], rumours = [];
  for (const site of SITES) {
    const found = isFound(world, site.id);
    const mark = 'rumour/' + site.id;
    if (!found && !isTrue({fact: 'mark', id: mark}, world)) continue;
    // A site whose place in this land is not known yet (a storyline may tell of one before its row has positions) is left off.
    const at = positionOf(site.id, world.open.landSeed);
    if (!Number.isFinite(at?.x) || !Number.isFinite(at?.z)) continue;
    const {x, z} = at;
    if (found) {
      const drilling = site.id === flagStory.sign.at && isTrue({fact: 'mark', id: FLAG_ID + '/tower-seen'}, world) &&
        !['bought', 'driven-off'].includes(world.open.threads[FLAG_ID]?.end);
      const broken = site.id === TOLL_GATE && isTrue({fact: 'mark', id: TOLL_ID + '/gate-broken'}, world);
      const name = drilling ? flagStory.notes.sign.mapName : broken ? site.name + ' (broken)' :
        stageOf(world, site.id) === 'burned' ? site.name + ' (burned)' : site.name;
      sites.push({id: site.id, name, x, z});
    } else {
      // Each axis is 70 or 135 metres off, so even the longest diagonal is within 200 m.
      const draw = key => namedThrow(world, mark + '/' + key, .5);
      const offset = axis => (draw(axis + '/far') ? 135 : 70) * (draw(axis + '/positive') ? 1 : -1);
      rumours.push({id: site.id, x: x + offset('east'), z: z + offset('south'), radius: 300, name: site.name + ' is said to be near here.'});
    }
  }
  return {driven: world.open.driven, sites, rumours};
}
