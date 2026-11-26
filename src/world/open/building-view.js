// A building's inside: the room, its things, and the roof and near wall left undrawn while the player is inside.
// Card OPEN-DOORS fills this in. The contract is in src/world/open/open-view.js: return null to draw nothing, or
// {group, update(worldJob, here, seconds, drawnShift), animate?(seconds), dispose()}. A view only reads.
export function createBuildingView() {
  return null;
}
