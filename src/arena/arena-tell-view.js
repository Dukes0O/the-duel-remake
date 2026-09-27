import * as THREE from 'three';

// ARENA-FEEL presentation: headlight flares on a computer car telling a
// charge, and a halo on a car that has just respawned. It reads the
// simulation's timers (arenaTellSec, arenaShimmerSec) and never writes state.
const FLARE = Object.freeze({x: .7, y: .95, z: 2.7, base: .6, pulse: 1.1, hz: 4.5});
const HALO = Object.freeze({y: 1.1, from: 3, to: 7});

let glowTexture = null;
function glow() {
  if (glowTexture) return glowTexture;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.25, 'rgba(255,255,255,.75)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  glowTexture.userData.sharedAsset = true;
  return glowTexture;
}

function sprite(color) {
  // Drawn over bodywork and plows so a tell reads even when armour hides the lamps.
  const material = new THREE.SpriteMaterial({map: glow(), color, transparent: true,
    depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    blending: THREE.AdditiveBlending});
  const item = new THREE.Sprite(material);
  item.renderOrder = 5;
  item.visible = false;
  return item;
}

// The sprites live on the car mesh, so they follow it and retire with it.
function partsFor(mesh) {
  if (mesh.userData.arenaTell) return mesh.userData.arenaTell;
  const flares = [-1, 1].map(side => {
    const flare = sprite(0xfff0c8);
    flare.name = 'Arena charge tell';
    flare.position.set(side * FLARE.x, FLARE.y, FLARE.z);
    mesh.add(flare);
    return flare;
  });
  const halo = sprite(0x6fd8ff);
  halo.name = 'Arena respawn shimmer';
  halo.position.set(0, HALO.y, 0);
  mesh.add(halo);
  return (mesh.userData.arenaTell = {flares, halo});
}

// Returns true when it added sprites, so the caller refreshes passes that
// keep a list of scene objects (ambient shading).
export function updateArenaTells(entries, seconds, shimmerSec) {
  let added = false;
  for (const {mesh, actor} of entries) {
    if (!mesh || !actor) continue;
    const tell = actor.arenaTellSec || 0, shimmer = actor.arenaShimmerSec || 0;
    if (!(tell > 0 || shimmer > 0) && !mesh.userData.arenaTell) continue;
    added ||= !mesh.userData.arenaTell;
    const parts = partsFor(mesh);
    // Flashing high beams: a hard size pulse the player can read at range.
    const pulse = .5 + .5 * Math.sin(seconds * Math.PI * 2 * FLARE.hz);
    for (const flare of parts.flares) {
      flare.visible = tell > 0;
      flare.scale.setScalar(FLARE.base + FLARE.pulse * pulse);
    }
    const fraction = shimmerSec > 0 ? Math.min(1, shimmer / shimmerSec) : 0;
    parts.halo.visible = shimmer > 0;
    parts.halo.scale.setScalar(HALO.from + (HALO.to - HALO.from) * (1 - fraction));
    parts.halo.material.opacity = Math.min(1, fraction * 1.4) * (.7 + .3 * Math.sin(seconds * 22) ** 2);
  }
  return added;
}
