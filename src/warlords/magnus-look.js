// How Magnus the Magnet looks (docs/SCRAPDOME.md, "Settled for build: Magnus
// the Magnet"): his roof crane and the glow of its magnet. Read by the
// renderer only; nothing here changes the fight.
export const MAGNUS_MAGNET_ASSET = 'magnus-magnet';
// Where the crane's base sits, in metres from the car's roof socket (x right,
// y up, z forward); see tools/blender/magnus-magnet.py. A car without a row
// gets no crane.
const MOUNTS = Object.freeze({falcone_heritage: Object.freeze([0, 0, 0])});
export const magnusMagnetMount = car => MOUNTS[car] ?? null;

const BLUE = 0x2f9bff, RED = 0xff3a12;
// The magnet face: blue and pulsing while it pulls (brighter in the pull than
// the tell), red while it cools, dark otherwise.
export function magnusMagnetGlow(actor, seconds = 0) {
  const stage = actor?.magnusPull?.stage;
  if (stage === 'tell' || stage === 'gap') return {color: BLUE, intensity: 1 + .8 * Math.sin(seconds * Math.PI * 6) ** 2};
  if (stage === 'pull') return {color: BLUE, intensity: 2.4};
  if (stage === 'hot') return {color: RED, intensity: 1.6 + .6 * Math.sin(seconds * Math.PI * 2) ** 2};
  return {color: 0x000000, intensity: 1};
}
