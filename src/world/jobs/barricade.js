// Dimensions and orientation of the standing job barricade, shared by its drawing and flame target.
export const BARRICADE_LENGTH = 12;
export function barricadeEnds(position, heading) {
  const x = Math.cos(heading) * BARRICADE_LENGTH / 2;
  const z = -Math.sin(heading) * BARRICADE_LENGTH / 2;
  return [{x: position.x - x, z: position.z - z}, {x: position.x + x, z: position.z + z}];
}
