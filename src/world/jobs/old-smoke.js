// Old Smoke's furnace chase. Its vents cycle from the job clock, so identical
// seeds and inputs always show the same weak point at the same time.
export const OLD_SMOKE = Object.freeze({
  glowSeconds: 3,
  ventOffsets: Object.freeze([
    Object.freeze({x: -1, y: 1, z: 0}),
    Object.freeze({x: 0, y: 1, z: 0}),
    Object.freeze({x: 1, y: 1, z: 0}),
  ]),
});

export function oldSmokeGlowingVent(elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return 0;
  return Math.floor(elapsedSeconds / OLD_SMOKE.glowSeconds) % OLD_SMOKE.ventOffsets.length;
}

export function oldSmokeVentTargets(actor, elapsedSeconds) {
  if (!actor?.position) return [];
  const glowing = oldSmokeGlowingVent(elapsedSeconds);
  return OLD_SMOKE.ventOffsets.map((offset, index) => ({
    id: `${actor.id}:glowing-vent-${index + 1}`,
    actorId: actor.id,
    kind: 'furnace-vent',
    position: {x: actor.position.x + offset.x, y: actor.position.y + offset.y,
      z: actor.position.z + offset.z},
    radius: 1.2,
    damage: index === glowing ? 1 : 0,
    glowing: index === glowing,
  }));
}
