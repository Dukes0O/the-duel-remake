// The existing green wall box is a first-aid cabinet, rather than an empty sign.
export function nameFirstAid(root, doc, THREE) {
  const image = doc.createElement('canvas'); image.width = 256; image.height = 180;
  const ctx = image.getContext?.('2d'); if (!ctx) return;
  ctx.fillStyle = '#237a45'; ctx.fillRect(0, 0, 256, 180);
  ctx.fillStyle = '#fff'; ctx.fillRect(111, 18, 34, 86); ctx.fillRect(85, 44, 86, 34);
  ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FIRST AID', 128, 149);
  const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.4, .28), new THREE.MeshBasicMaterial({map: texture, toneMapped: false}));
  face.name = 'First aid cabinet face'; face.position.set(8.8, 1.9, -8.85); root.add(face);
}
