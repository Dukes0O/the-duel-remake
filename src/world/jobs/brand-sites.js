// Job 2's places come from the town that is drawn, not a second town layout.
// The route is a clear way through its alleys, not a movement system. The
// existing fighter still owns every step, collision and choice of direction.
import {LAND} from '../scablands-names.js';
import {tinTownLayout, tinTownFence} from '../tin-town-shacks.js';
import {forgePlan} from '../forge-look.js';
import {tinTownGateFor} from '../tin-town-gate.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {BRAND_RULE} from './brand-rule.js';

export function brandSites(land = LAND) {
  const slots = tinTownLayout(land).clusters.flatMap(cluster => cluster.slots);
  const pump = slots.find(slot => slot.kind === 'T');
  const tower = slots.find(slot => slot.kind === 'W');
  if (!pump || !tower) throw new Error('Light the Town needs both town towers.');
  const rule = BRAND_RULE.sites;
  const place = (id, point) => Object.freeze({id, position: Object.freeze({
    x: point.x, y: scablandsSurfaceHeightAt(point.x, point.z), z: point.z,
  })});
  const hearthAt = forgePlan(land).hearth;
  const hearth = place('town-hearth', hearthAt);
  const auntie = place('town-auntie-solder', {x: hearthAt.x + BRAND_RULE.auntieEast,
    z: hearthAt.z + BRAND_RULE.auntieSouth});
  const lamps = Object.freeze([
    place('pump', {x: pump.x, z: pump.z + rule.pumpSouth}),
    // Ladders in the folk kit are scenery. The fighter has no ladder action.
    place('tower', {x: tower.x + rule.towerEast, z: tower.z}),
    place('far', {x: pump.x - rule.farWest, z: pump.z - rule.farNorth}),
  ]);
  const farWalk = Object.freeze([
    place('hearth-front', {x: hearthAt.x, z: hearthAt.z + rule.hearthApproachSouth}),
    place('forge-alley', land.at('tin-town', rule.firstAlleyEast, rule.firstAlleySouth)),
    place('inner-alley', land.at('tin-town', rule.firstAlleyEast, -rule.innerAlleyNorth)),
    place('west-alley', land.at('tin-town', -rule.westAlleyWest, -rule.westAlleyNorth)),
    place('north-alley', land.at('tin-town', -rule.westAlleyWest, -rule.northAlleyNorth)),
    place('far-alley', {x: lamps[2].position.x, z: land.at('tin-town').z - rule.northAlleyNorth}),
    lamps[2],
  ]);
  const centre = land.at('tin-town');
  const ashEntries = Object.freeze(tinTownFence(land).map((sheet, index) => {
    const dx = centre.x - sheet.x, dz = centre.z - sheet.z;
    const scale = BRAND_RULE.wallEntryInset / Math.hypot(dx, dz);
    return place(`town-wall-${index}`, {x: sheet.x + dx * scale, z: sheet.z + dz * scale});
  }));
  const gate = tinTownGateFor(land).gate;
  const theftPath = Object.freeze([farWalk[0],
    place('thief-bay', land.at('tin-town', rule.thiefAlleyEast, rule.thiefAlleySouth)),
    place('thief-south-alley', land.at('tin-town', rule.thiefAlleyEast, rule.thiefGateApproachSouth)),
    place('thief-gate-approach', {x: gate.x, z: land.at('tin-town').z + rule.thiefGateApproachSouth}),
    place('thief-gate', gate)]);
  return Object.freeze({hearth, auntie, lamps, farWalk, ashEntries, theftPath, towerAtFoot: true});
}
