// Skirmishes on the open road: the draw at each checkpoint and the encounter that follows. It runs only while nobody holds "checkpoints".
// Card OPEN-CHECKPOINTS fills this in. The contract is in src/world/open/open-land.js: a part keeps its own small state, reads the
// world and the view, and asks for changes as choices; it never changes anything itself.
export const checkpointsPart = {
  id: 'checkpoints',
};
