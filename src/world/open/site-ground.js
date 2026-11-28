// The one declaration of a site's terrain. Placement comes from the same seeded site table as discovery.
import {createGroundEdit, CHUNK_METRES} from '../ground-edit.js';
import {scablandsGroundEdit, scablandsSurfaceHeightAt, setScablandsSiteInteriors} from '../scablands-ground.js';
import {sitePosition} from './site-rule.js';
import {ratsNestGround, RATS_NEST_LAYOUT} from './looks/rats-nest-look.js';
import {groundPoint} from './home-rule.js';
import {HOME_DIG} from './content/home-ground.js';

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
  let site = cuts.chunkCount ? cuts : null;
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
  const baseCuts = cuts.toSave();
  let homeKey = '', ended = false;
  const restore = () => { ended = true; if (ground.siteGround === site) ground.setSiteGround(previous); };
  releases.set(site, restore);
  const release = () => {
    releases.get(site)?.();
    releases.delete(site);
  };
  // The home rules own these cells. This adapter projects them into the same sparse ground layer that the Dig draws.
  // Replacing the layer notifies the existing scene to rebuild its edited chunks and sink the coarse underlay.
  release.updateHome = home => {
    const key = JSON.stringify([home?.ditch ?? [], home?.pond && [home.pond.i, home.pond.j, home.pond.scoops]]);
    if (ended || key === homeKey || ground.siteGround !== site) return;
    homeKey = key;
    const next = createGroundEdit({region: {editable: true}, naturalHeight: () => 0});
    next.loadSave(baseCuts);
    const cells = (home?.ditch ?? []).map(row => ({...row, width: 1, depth: HOME_DIG.depth}));
    if (home?.pond) cells.push({...home.pond, width: 2, depth: HOME_DIG.depth * home.pond.scoops / HOME_DIG.scoops});
    const shapes = cells.map(row => ({...groundPoint(row.i, row.j), size: row.width * 2, depth: row.depth}));
    const depthAt = (x, z) => Math.max(0, ...shapes.filter(row => x > row.x && z > row.z && x < row.x + row.size && z < row.z + row.size).map(row => row.depth));
    const samples = new Set();
    for (const row of shapes) for (let z = Math.ceil(row.z); z <= row.z + row.size; z++)
      for (let x = Math.ceil(row.x); x <= row.x + row.size; x++) samples.add(`${x}/${z}`);
    for (const sample of samples) {
      const [x, z] = sample.split('/').map(Number);
      const depth = Math.min(...[-.001, .001].flatMap(dx => [-.001, .001].map(dz => depthAt(x + dx, z + dz))));
      if (!depth) continue;
      next.cut({x, z, radius: .4}, -depth);
      if (x % CHUNK_METRES === 0) next.includeChunkAt(x - 1, z);
      if (z % CHUNK_METRES === 0) next.includeChunkAt(x, z - 1);
      if (x % CHUNK_METRES === 0 && z % CHUNK_METRES === 0) next.includeChunkAt(x - 1, z - 1);
    }
    releases.delete(site);
    site = next;
    ground.setSiteGround(site);
    // Preserve the Rats' Nest drain while changing another site's surface.
    if (ids.includes('rats-nest')) {
      const at = sitePosition('rats-nest', landSeed), {drain, spots} = RATS_NEST_LAYOUT;
      setScablandsSiteInteriors(site, [{id: 'rats-nest/drain', inner: drain.inner,
        floor: scablandsSurfaceHeightAt(at.x + spots['drain-in'].x, at.z + drain.z) - .04,
        from: {x: at.x + drain.from - .45, z: at.z + drain.z}, to: {x: at.x + drain.to + .45, z: at.z + drain.z},
        approach: [drain.from - .45 - spots['drain-in'].x, spots['drain-out'].x - drain.to - .45]}]);
    }
    releases.set(site, restore);
  };
  return release;
}
