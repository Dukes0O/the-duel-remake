// A soft dark patch under a car (or anything on the floor), so it sits in the
// sand instead of hovering over it. The sun's own shadow is sharp and offset;
// this is the occlusion of the ground right under the body and wheels.
// Made from a small generated image, no files.
import * as THREE from 'three';

function softRectangleTexture(size = 96) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1, ny = (y + 0.5) / size * 2 - 1;
      // A rounded rectangle: distance with a high power, then a soft edge.
      const d = Math.pow(Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2), 1 / 3.2);
      const t = Math.min(1, Math.max(0, (1 - d) / 0.75));
      const a = t * t * (3 - 2 * t);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(a * 255); data[i + 3] = 255;   // the map reads the green channel
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function createContactShadow(parent, { length = 5.6, width = 3.0, opacity = 0.62, lift = 0.035 } = {}) {
  const texture = softRectangleTexture();
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000, alphaMap: texture, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false, fog: false,
  });
  const geometry = new THREE.PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Contact shadow';
  mesh.position.set(0, lift, -0.03);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return { mesh, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); parent.remove(mesh); } };
}
