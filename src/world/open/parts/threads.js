// Storylines: the director, the signs and each storyline's beats. A sign appears only while nobody holds "signs".
// Card OPEN-THREADS fills this in. The contract is in src/world/open/open-land.js: a part keeps its own small state, reads the
// world and the view, and asks for changes as choices; it never changes anything itself.
export const threadsPart = {
  id: 'threads',
};
