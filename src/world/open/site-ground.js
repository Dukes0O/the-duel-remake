// The one declaration of a site's terrain. Placement comes from the same seeded site table as discovery.
import {createGroundEdit, CHUNK_METRES} from '../ground-edit.js';
import {scablandsGroundEdit} from '../scablands-ground.js';
import {sitePosition} from './site-rule.js';
import {ratsNestGround, RATS_NEST_LAYOUT} from './looks/rats-nest-look.js';

const SITE_GROUND = {
  'rats-nest': {radius: RATS_NEST_LAYOUT.radius, depthAt: ratsNestGround},
};

// Author the metre samples once per outing. A sample on a west or north border also
// belongs to the mesh on the other side of that border (its last row of vertices).
export function installSiteGround(landSeed, ids = Object.keys(SITE_GROUND)) {
  const cuts = createGroundEdit({region: {editable: true}, naturalHeight: () => 0});
  for (const id of ids) {
    const shape = SITE_GROUND[id];
    if (!shape) continue;
    const at = sitePosition(id, landSeed);
    for (let z = Math.ceil(at.z - shape.radius); z <= at.z + shape.radius; z++) {
      for (let x = Math.ceil(at.x - shape.radius); x <= at.x + shape.radius; x++) {
        const depth = shape.depthAt(x - at.x, z - at.z);
        if (depth <= 0) continue;
        cuts.cut({x, z, radius: .4}, -depth);
        if (x % CHUNK_METRES === 0) cuts.includeChunkAt(x - 1, z);
        if (z % CHUNK_METRES === 0) cuts.includeChunkAt(x, z - 1);
        if (x % CHUNK_METRES === 0 && z % CHUNK_METRES === 0) cuts.includeChunkAt(x - 1, z - 1);
      }
    }
  }
  const ground = scablandsGroundEdit;
  const previous = ground.siteGround;
  const site = cuts.chunkCount ? cuts : null;
  if (!site) return () => {};
  ground.setSiteGround(site);
  return () => { if (ground.siteGround === site) ground.setSiteGround(previous); };
}
