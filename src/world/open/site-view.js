// The sites as they stand in the land, at each stage, from src/world/open/looks/.
// Card OPEN-SITES fills this in. The contract is in src/world/open/open-view.js: return null to draw nothing, or
// {group, update(worldJob, here, seconds, drawnShift), animate?(seconds), dispose()}. A view only reads.
export function createSiteView() {
  return null;
}
