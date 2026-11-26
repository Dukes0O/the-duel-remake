// Driven ground: the squares the player has driven over, for the big map (section 16).
// Card OPEN-MAP fills this in. The contract is in src/world/open/open-land.js: a part keeps its own small state, reads the
// world and the view, and asks for changes as choices; it never changes anything itself.
export const groundPart = {
  id: 'ground',
};
