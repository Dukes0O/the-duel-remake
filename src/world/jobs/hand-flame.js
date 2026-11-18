// The Hand Flamer in the Everburn's jobs on foot (Light the Town, Run Him Down): where its barrel's mouth is, and whether
// the barrel is aimed at a man's height. Plain numbers only, no drawing: the rules and the scene both read this file.
// Kyle's try of 18 November 2026: aimed at a lamp overhead, the fire still ran along the ground and burned what stood there.
export const HAND_FLAME = Object.freeze({
  // A man is burned only when the barrel is aimed no more than this far above his head or below his feet.
  aimDegrees: 30,
  // The walker's eye above his feet (the same height as the camera's, src/onfoot-camera.js) and a standing man's height.
  eyeMetres: 1.62,
  manMetres: 1.8,
  // The barrel's mouth from the eye: ahead along the aim, to the right, and below the line of sight.
  muzzleAheadMetres: .75,
  muzzleRightMetres: .24,
  muzzleBelowMetres: .3,
});

const pitchOf = fighter => Math.max(-1.25, Math.min(1.25, fighter?.pitch || 0));

/** The barrel's mouth in the world, for the drawn burst. */
export function handFlameMuzzle(fighter, rule = HAND_FLAME) {
  const yaw = fighter.yaw || 0, pitch = pitchOf(fighter);
  const ahead = {x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch)};
  const right = {x: -Math.cos(yaw), z: Math.sin(yaw)};
  const above = {x: -Math.sin(yaw) * Math.sin(pitch), y: Math.cos(pitch), z: -Math.cos(yaw) * Math.sin(pitch)};
  return {
    x: fighter.x + ahead.x * rule.muzzleAheadMetres + right.x * rule.muzzleRightMetres - above.x * rule.muzzleBelowMetres,
    y: fighter.y + rule.eyeMetres + ahead.y * rule.muzzleAheadMetres - above.y * rule.muzzleBelowMetres,
    z: fighter.z + ahead.z * rule.muzzleAheadMetres + right.z * rule.muzzleRightMetres - above.z * rule.muzzleBelowMetres,
  };
}

/**
 * True when the barrel's tilt lies between the line from the walker's eye to the feet of a man standing at `at` and the
 * line to his head, or within the rule's angle outside them. Measured to the whole man and not to one point of him, so
 * that a level barrel still burns a man who stands at arm's length (the review of 18 November 2026).
 */
export function handFlameAimsAt(fighter, at, rule = HAND_FLAME) {
  if (!fighter || !at) return false;
  const flat = Math.max(Math.hypot(at.x - fighter.x, at.z - fighter.z), 1e-6), eye = fighter.y + rule.eyeMetres;
  const feet = at.y ?? fighter.y, slack = rule.aimDegrees * Math.PI / 180 + 1e-9, pitch = pitchOf(fighter);
  return pitch >= Math.atan2(feet - eye, flat) - slack && pitch <= Math.atan2(feet + rule.manMetres - eye, flat) + slack;
}
