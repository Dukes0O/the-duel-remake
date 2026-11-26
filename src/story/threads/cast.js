import {namedThrow} from '../ledger.js';
import {feudOf} from '../../world/open/open-record.js';
import {FEUD_WORDS, GROUPS, PEOPLES, PERSONS, SITES} from '../../world/open/register.js';
import {subjectFor} from '../../world/open/roles.js';

const sources = {sites: SITES.map(site => site.id), groups: GROUPS, peoples: PEOPLES, persons: PERSONS};
export const distanceBetween = (a, b) => a && b ? Math.hypot(a.x - b.x, a.z - b.z) : Infinity;

// The same named throw tests each cumulative threshold, so the draw has one result across the whole list.
export function weightedPick(seed, name, rows, weight) {
  const weights = rows.map(row => Math.max(0, weight(row)));
  const total = weights.reduce((sum, share) => sum + share, 0);
  if (!total) return null;
  let threshold = 0;
  return rows.find((row, index) => {
    threshold += weights[index];
    return weights[index] > 0 && namedThrow({seed}, name, threshold / total);
  }) ?? null;
}

export function castThread(thread, world, {ask, placeAt, allows = () => true}) {
  const cast = {};
  const name = `${thread.id}/night-${world.ledger.night}/cast`;
  for (const [role, row] of Object.entries(thread.cast)) {
    if (row.late) continue;
    const candidates = sources[row.from].filter(id =>
      (!row.among || row.among.includes(id)) && !row.except?.includes(id) &&
      !row.apartFrom?.some(other => cast[other] === id) && allows(thread, role, id, cast) &&
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
