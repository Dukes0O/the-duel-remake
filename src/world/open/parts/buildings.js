// Buildings to enter and their services: the forge shed, the repair, the wash and the dirt on the car.
// Card OPEN-DOORS fills this in. The contract is in src/world/open/open-land.js: a part keeps its own small state, reads the
// world and the view, and asks for changes as choices; it never changes anything itself.
export const buildingsPart = {
  id: 'buildings',
};
