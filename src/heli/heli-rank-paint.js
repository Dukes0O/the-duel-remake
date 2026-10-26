// Rank colours are projected onto the existing Blender airframe in metres.
// This changes drawing only. The session owns which paint has been earned.
export const RANK_PAINTS = Object.freeze(['rank-student', 'rank-private', 'rank-commercial', 'rank-mountain', 'rank-chief']);
const PAINT_MATERIALS = new Set(['paint_white', 'paint_navy', 'paint_red']);
const FINISH = { 'rank-student': [.43, .3], 'rank-private': [.24, .65], 'rank-commercial': [.45, .3],
  'rank-mountain': [.3, .45], 'rank-chief': [.35, .5] };

export function createRankPaint({THREE, loadTexture = url => new THREE.TextureLoader().loadAsync(url)}) {
  const cache = new Map(), original = new Map(), geometries = new Set();
  let model = null, wanted = null, drawn = null, disposed = false;
  function textureFor(id) {
    if (!cache.has(id)) cache.set(id, loadTexture(`/assets/heli/skins/${id}.png`).then(texture => {
      if (disposed) { texture.dispose(); return null; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      return texture;
    }).catch(() => null));
    return cache.get(id);
  }
  function draw(id, texture) {
    if (!model || disposed || wanted !== id) return;
    model.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (!materials.some(material => PAINT_MATERIALS.has(material.name))) return;
      if (id && !geometries.has(object)) {
        const positions = object.geometry.attributes.position, uv = new Float32Array(positions.count * 2);
        for (let i = 0; i < positions.count; i++) {
          uv[i * 2] = (positions.getZ(i) + 6.8) / 9.5;
          uv[i * 2 + 1] = positions.getY(i) / 3;
        }
        object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geometries.add(object);
      }
      for (const material of materials) {
        if (!PAINT_MATERIALS.has(material.name)) continue;
        if (!original.has(material)) original.set(material, {color: material.color.clone(), map: material.map,
          roughness: material.roughness, metalness: material.metalness, clearcoat: material.clearcoat});
        const base = original.get(material);
        material.color.copy(id ? new THREE.Color(0xffffff) : base.color);
        material.map = id ? texture : base.map;
        material.roughness = id ? FINISH[id][0] : base.roughness;
        material.metalness = id === 'rank-private' && material.name === 'paint_red' ? .45 : base.metalness;
        if (material.clearcoat !== undefined) material.clearcoat = id ? FINISH[id][1] : base.clearcoat;
        material.needsUpdate = true;
      }
    });
    drawn = id;
  }
  return {
    attach(next) { model = next; drawn = undefined; },
    update(value) {
      const id = RANK_PAINTS.includes(value) ? value : null;
      if (wanted === id && drawn === id) return;
      wanted = id;
      if (!id) draw(null, null);
      else void textureFor(id).then(texture => { if (texture && drawn !== id) draw(id, texture); });
    },
    dispose() {
      disposed = true;
      for (const promise of cache.values()) void promise.then(texture => texture?.dispose());
      original.clear(); geometries.clear(); model = null;
    },
  };
}
