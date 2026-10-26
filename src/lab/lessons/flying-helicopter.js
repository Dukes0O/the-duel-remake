import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Runtime Kestrel, the same asset as Lift and weight. This display owns this
// load; nothing reaches the flight session or a player's progress.
export function withHelicopter(mount, pose) {
  return args => {
    const base = mount(args);
    let heli = null, disposed = false;
    const release = root => root.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) { m.map?.dispose(); m.dispose(); } });
    new GLTFLoader().loadAsync('/assets/heli/kestrel-one.glb').then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      heli = gltf.scene; heli.scale.setScalar(.32); args.group.add(heli);
      args.canvas.dataset.labFlyingHeli = 'ready';
    }).catch(error => { args.canvas.dataset.labFlyingHeli = 'failed'; console.error('Flying lesson Kestrel:', error); });
    return {draw(d, clock) {
      base.draw(d, clock);
      if (!heli) return;
      const p = pose(d, clock); heli.visible = Boolean(p);
      if (p) { heli.position.set(...p); const rotor = heli.getObjectByName('main_rotor'); if (rotor) rotor.rotation.y = clock.time * 5; }
    }, dispose() { disposed = true; base.dispose(); if (heli) { heli.removeFromParent(); release(heli); } }};
  };
}
