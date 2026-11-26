// The signs a storyline shows in the land: smoke, a flare, a glow, lights, tracks.
// Card OPEN-THREADS fills this in. The contract is in src/world/open/open-view.js: return null to draw nothing, or
// {group, update(worldJob, here, seconds, drawnShift), animate?(seconds), dispose()}. A view only reads.
export function createSignView() {
  return null;
}
