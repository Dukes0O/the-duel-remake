import {namedThrow} from '../ledger.js';
import {feudOf} from '../../world/open/open-record.js';
import {FEUD_WORDS, GROUPS, PEOPLES, PERSONS, SITES} from '../../world/open/register.js';
import {subjectFor} from '../../world/open/roles.js';

const sources = {sites: SITES.map(site => site.id), groups: GROUPS, peoples: PEOPLES, persons: PERSONS};
export const distanceBetween = (a, b) => a && b ? Math.hypot(a.x - b.x, a.z - b.z) : Infinity;

// Reservoir selection gives each row its share of the total weight, with a named draw for each row.
export function weightedPick(seed, name, rows, weight) {
  let total = 0, selected = null;
  for (const row of rows) {
    const share = weight(row);
    if (share <= 0) continue;
    total += share;
    if (namedThrow({seed}, `${name}/${row.id}`, share / total)) selected = row;
  }
  return selected;
}

export function castThread(thread, world, {ask, placeAt, allows = () => true}) {
  const cast = {};
  const name = `${thread.id}/night-${world.ledger.night}/cast`;
  for (const [role, row] of Object.entries(thread.cast)) {
    if (row.late) continue;
    const candidates = sources[row.from].filter(id =>
      (!row.among || row.among.includes(id)) && !row.except?.includes(id) &&
      !row.apartFrom?.some(other => cast[other] === id) && allows(thread, role, id) &&
      ask(row.where, cast, subjectFor(row.from, id))).map(id => ({id}));
    const near = row.nearest && placeAt(row.nearest, cast);
    if (near) candidates.sort((a, b) => distanceBetween(near, placeAt(a.id, cast)) - distanceBetween(near, placeAt(b.id, cast)));
    const picked = near ? candidates.find(candidate => placeAt(candidate.id, cast))
      : weightedPick(world.seed, `${name}/${role}`, candidates,
        ({id}) => row.weightBy === 'feud' ? FEUD_WORDS.indexOf(feudOf(world, id)) + 1 : 1);
    if (picked) cast[role] = picked.id;
    else if (!row.optional) return null;
  }
  return cast;
}
