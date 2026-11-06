import {BUILDINGS} from './buildings.js';
import {GOODS} from './goods.js';

function assertUnique(rows, kind) {
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id))
      throw new TypeError(`Each ${kind} needs a lower-case id.`);
    if (seen.has(row.id)) throw new TypeError(`The ${kind} id ${row.id} is listed twice.`);
    seen.add(row.id);
  }
}

export function validateTownContent({buildings, goods}) {
  if (!Array.isArray(buildings) || !Array.isArray(goods)) throw new TypeError('Town buildings and goods must be lists.');
  assertUnique(buildings, 'building');
  assertUnique(goods, 'good');
  const goodIds = new Set(goods.map(good => good.id));
  for (const building of buildings) {
    if (!Number.isSafeInteger(building.width) || building.width < 1 || !Number.isSafeInteger(building.depth) || building.depth < 1)
      throw new TypeError(`The ${building.id} footprint must use whole cells.`);
    if (!Number.isFinite(building.workerHours) || building.workerHours < 0 || !Number.isFinite(building.upkeepMonthly) || building.upkeepMonthly < 0 || !Number.isSafeInteger(building.staff) || building.staff < 0)
      throw new TypeError(`The ${building.id} work, upkeep and staff must be zero or greater.`);
    if (!building.materials || typeof building.materials !== 'object' || Array.isArray(building.materials))
      throw new TypeError(`The ${building.id} materials must be a list by good.`);
    for (const [id, amount] of Object.entries(building.materials)) {
      if (!goodIds.has(id)) throw new TypeError(`The ${building.id} needs an unknown good: ${id}.`);
      if (!Number.isFinite(amount) || amount < 0) throw new TypeError(`The ${building.id} material amounts must be zero or greater.`);
    }
    for (const key of ['opensWith', 'gives']) if (typeof building[key] !== 'string' || !building[key].trim())
      throw new TypeError(`The ${building.id} needs a plain ${key} note.`);
  }
  for (const good of goods) if (typeof good.unit !== 'string' || !good.unit.trim()) throw new TypeError(`The ${good.id} needs a unit.`);
  return true;
}

validateTownContent({buildings:BUILDINGS, goods:GOODS});
export const buildingById = new Map(BUILDINGS.map(building => [building.id, building]));
export const goodById = new Map(GOODS.map(good => [good.id, good]));
export {BUILDINGS, GOODS};
