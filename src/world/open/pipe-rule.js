// A site's pipe is an interior, like a building room: its plan, floor and bore are data.
// The surface above it is never cut. Heights here are absolute world metres.
export function pipeSectionAt(pipe, x, z, surfaceAt, radius = 0) {
  const dx = pipe.to.x - pipe.from.x, dz = pipe.to.z - pipe.from.z;
  const length = Math.hypot(dx, dz);
  const along = ((x - pipe.from.x) * dx + (z - pipe.from.z) * dz) / length;
  const across = ((x - pipe.from.x) * dz - (z - pipe.from.z) * dx) / length;
  if (along < -pipe.approach[0] || along > length + pipe.approach[1]) return null;
  const inside = along >= 0 && along <= length;
  const inner = pipe.inner - (inside ? radius : 0);
  if (inner <= 0 || Math.abs(across) >= inner) return null;
  // A vertical capsule rests against the lower bore; its upper cap must also fit.
  const reach = Math.sqrt(inner * inner - across * across);
  const floor = pipe.floor + pipe.inner - reach - (inside ? radius : 0);
  if (inside) return {pipe, floor, ceiling: pipe.floor + pipe.inner + reach + radius};
  // The short open aprons join the existing yard and gully without a step at either lip.
  const t = along < 0 ? 1 + along / pipe.approach[0] : 1 - (along - length) / pipe.approach[1];
  const blend = t * t * (3 - 2 * t), surface = surfaceAt(x, z);
  return {pipe, floor: surface + (floor - surface) * blend, ceiling: Infinity};
}

export function pipeInteriorAt(pipes, x, z, feet, surfaceAt, radius = 0) {
  if (!Number.isFinite(feet)) return null;
  for (const pipe of pipes ?? []) {
    const section = pipeSectionAt(pipe, x, z, surfaceAt, radius);
    // Like roomAt, height keeps somebody on the roof out of the room below it.
    const crown = pipe.floor + pipe.inner * 2;
    if (section && feet >= section.floor - .6 && feet < crown) return section;
  }
  return null;
}

// Feed the existing terrain opening shader the same bore, leaving all land above its crown intact.
export function pipeMouths(pipes) {
  return pipes.map(pipe => ({start: {...pipe.from, y: pipe.floor + pipe.inner},
    end: {...pipe.to, y: pipe.floor + pipe.inner}, radius: pipe.inner}));
}
