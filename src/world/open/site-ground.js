// The one declaration of a site's terrain. Placement comes from the same seeded site table as discovery.
import {createGroundEdit, CHUNK_METRES} from '../ground-edit.js';
import {scablandsGroundEdit, scablandsSurfaceHeightAt, setScablandsSiteInteriors} from '../scablands-ground.js';
import {sitePosition} from './site-rule.js';
import {ratsNestGround, RATS_NEST_LAYOUT} from './looks/rats-nest-look.js';

const SITE_GROUND = {
  'rats-nest': {radius: RATS_NEST_LAYOUT.radius, depthAt: ratsNestGround},
};

// The job normally releases its cut with its loan. Its frozen results scene can take
// ownership of that same release until the duel enters the menu or another arena.
const releases = new WeakMap();
export function keepSiteGroundForResults(duel) {
  const arena = duel.state.arena, site = scablandsGroundEdit.siteGround;
  const restore = releases.get(site);
  if (!arena?.worldJob?.definition.open || !restore) return;
  releases.delete(site);
  const unsubscribe = duel.onChange(state => {
    if (state.arena === arena) return;
    unsubscribe();
    restore();
  });
}

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
  if (ids.includes('rats-nest')) {
    const at = sitePosition('rats-nest', landSeed), {drain, spots} = RATS_NEST_LAYOUT;
    // Match the drawn bore's anchor and its 45 cm lips, with open aprons to the named spots.
    setScablandsSiteInteriors(site, [{id: 'rats-nest/drain', inner: drain.inner,
      floor: scablandsSurfaceHeightAt(at.x + spots['drain-in'].x, at.z + drain.z) - .04,
      from: {x: at.x + drain.from - .45, z: at.z + drain.z},
      to: {x: at.x + drain.to + .45, z: at.z + drain.z},
      approach: [drain.from - .45 - spots['drain-in'].x, spots['drain-out'].x - drain.to - .45]}]);
  }
  releases.set(site, () => { if (ground.siteGround === site) ground.setSiteGround(previous); });
  return () => {
    releases.get(site)?.();
    releases.delete(site);
  };
}
