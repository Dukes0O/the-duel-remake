import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createVehicle} from '../../vehicles.js';

// Only this corner uses these parts. Models, labels and ghosts are display-only.
export function tunnelMount(id) {
  return ({group, THREE, models, doc, canvas, camera}) => {
    const own = new THREE.Group(); group.add(own);
    const tunnel = models.get('wind-tunnel'), wasVisible = tunnel?.visible;
    if (tunnel) tunnel.visible = false;
    // A cutaway leaves the accepted rolling road and fan beside the enlarged part.
    // These clones share room-owned geometry, so detach them before releasing ours.
    const benchParts = [];
    for (const name of ['belt', 'fan']) {
      const part = tunnel?.getObjectByName(name)?.clone(true); if (!part) continue;
      part.scale.setScalar(name === 'belt' ? .65 : .3);
      part.position.set(...(name === 'belt' ? [0, .15, 0] : [-2.2, 1.15, -.7]));
      own.add(part); benchParts.push(part);
    }
    const signs = group.parent.getObjectByName('Lab 2 signs and Brian'), signsVisible = signs?.visible;
    if (signs) signs.visible = false;
    const parts = new Map(), oldParts = new Map(), labels = [], resources = new Set();
    let disposed = false, loaded = null;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(5.5, .12, 3.7), new THREE.MeshStandardMaterial({color: '#38454a', roughness: .7}));
    floor.position.y = .06; own.add(floor);
    function vehicle(colour) {
      const car = createVehicle({color: colour});
      // Vehicle wheels and trim include global cached resources. Own copies only.
      const copies = new Map();
      const copy = (r, texture = false) => { if (!r.userData?.sharedAsset && !texture) return r; if (!copies.has(r)) { const own = r.clone(); own.userData.sharedAsset = false; copies.set(r, own); } return copies.get(r); };
      car.traverse(n => {
        if (n.geometry) n.geometry = copy(n.geometry);
        if (n.material) {
          const material = m => { const result = copy(m); for (const [key, value] of Object.entries(m)) if (value?.isTexture) result[key] = copy(value, true); return result; };
          n.material = Array.isArray(n.material) ? n.material.map(material) : material(n.material);
        }
      });
      return car;
    }
    const cars = [0, 1].map(i => {
      const car = vehicle(i ? 0x477cad : 0xd6b85e);
      car.scale.setScalar(.48); own.add(car); return car;
    });
    const ghost = vehicle(0xa8bccc); ghost.scale.setScalar(.48);
    ghost.traverse(n => {
      for (const m of [].concat(n.material ?? [])) { m.transparent = true; m.opacity = .2; m.depthWrite = false; }
    });
    own.add(ghost);
    new GLTFLoader().loadAsync('/assets/models/lab/tunnel-parts.glb').then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      loaded = gltf.scene;
      for (const name of ['tyre', 'brake', 'spring', 'wing', 'can', 'scale', 'wing-stand', 'dial']) {
        const part = loaded.getObjectByName(name); part.removeFromParent(); own.add(part); parts.set(name, part);
        const old = part.clone(true);
        old.traverse(n => { if (n.material) { n.material = n.material.clone(); n.material.transparent = true; n.material.opacity = .2; n.material.depthWrite = false; } });
        own.add(old); oldParts.set(name, old);
      }
      canvas.dataset.labTunnelModel = id;
    }).catch(error => { if (disposed) return; canvas.dataset.labTunnelModel = 'failed'; console.error('Tunnel parts failed to load:', error); });
    function release(root) {
      root.traverse(n => { if (n.geometry) resources.add(n.geometry); for (const m of [].concat(n.material ?? [])) { resources.add(m); for (const value of Object.values(m)) if (value?.isTexture) resources.add(value); } });
      resources.forEach(r => r.dispose()); resources.clear();
    }
    function sign(i) {
      const surface = doc.createElement('canvas'); surface.width = 768; surface.height = 96;
      const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, depthTest: false, toneMapped: false}));
      sprite.scale.set(2.3, .38, 1); sprite.renderOrder = 101; own.add(sprite);
      return labels[i] = {surface, texture, sprite, text: null};
    }
    return {
      draw(d, clock) {
        const fan = benchParts.find(p => p.name === 'fan'); if (fan) fan.rotation.x = clock.time * 3;
        for (const part of parts.values()) part.visible = false;
        for (const part of oldParts.values()) part.visible = false;
        for (const row of d.parts ?? []) {
          const part = parts.get(row.name); if (!part) continue;
          part.visible = true; part.position.set(...row.position); part.rotation.order = row.order ?? 'XYZ'; part.rotation.set(...(row.rotation ?? [0, 0, 0]));
          part.scale.set(...(row.scale ?? [1, 1, 1]));
          const level = part.getObjectByName('fuel-level'); if (level) level.scale.y = Math.max(.001, row.fill ?? 1);
          const needle = part.getObjectByName('dial-needle'); if (needle) needle.rotation.z = (.75 - 1.5 * (row.dial ?? 0)) * Math.PI;
        }
        cars.forEach((car, i) => {
          const pose = d.cars?.[i]; car.visible = Boolean(pose);
          if (pose) { car.position.set(...pose.position); car.rotation.order = pose.order ?? 'XYZ'; car.rotation.set(...(pose.rotation ?? [0, Math.PI / 2, 0])); }
        });
        ghost.visible = Boolean(d.previous?.cars?.length);
        if (ghost.visible) { ghost.position.set(...d.previous.cars[0].position); ghost.position.z -= .45; ghost.rotation.order = d.previous.cars[0].order ?? 'XYZ'; ghost.rotation.set(...(d.previous.cars[0].rotation ?? [0, Math.PI / 2, 0])); }
        for (const pose of d.previous?.parts ?? []) {
          const old = oldParts.get(pose.name); if (!old) continue;
          old.visible = true; old.position.set(...pose.position); old.position.x -= 1.2;
          old.rotation.order = pose.order ?? 'XYZ'; old.rotation.set(...(pose.rotation ?? [0, 0, 0])); old.scale.set(...(pose.scale ?? [1, 1, 1]));
          const level = old.getObjectByName('fuel-level'); if (level) level.scale.y = Math.max(.001, pose.fill ?? 1);
          const needle = old.getObjectByName('dial-needle'); if (needle) needle.rotation.z = (.75 - 1.5 * (pose.dial ?? 0)) * Math.PI;
        }
        labels.forEach(l => { l.sprite.visible = false; });
        // Never more than three signs, and never a corner readout.
        (d.labels ?? []).slice(0, 3).forEach((row, i) => {
          const l = labels[i] ?? sign(i); l.sprite.visible = true; l.sprite.position.set(...row.position);
          if (row.text !== l.text) {
            l.text = row.text;
            const ctx = l.surface.getContext('2d'); ctx.font = 'bold 44px sans-serif';
            l.texture.dispose(); // Resized canvas signs need fresh GPU storage before upload.
            l.surface.width = Math.ceil(ctx.measureText(row.text).width + 48);
            ctx.fillStyle = '#172327ed'; ctx.fillRect(0, 0, l.surface.width, 96);
            ctx.fillStyle = row.colour ?? '#f5f0dc'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(row.text, l.surface.width / 2, 63); l.texture.needsUpdate = true;
          }
          const world = group.localToWorld(new THREE.Vector3(...row.position));
          const height = 2 * camera.position.distanceTo(world) * Math.tan(camera.fov * Math.PI / 360) * 52 / canvas.clientHeight;
          l.sprite.scale.set(height * l.surface.width / 96, height, 1);
        });
        canvas.dataset.labTunnelResult = JSON.stringify({id, ...d.result});
      },
      dispose() {
        disposed = true;
        if (tunnel) tunnel.visible = wasVisible;
        if (signs) signs.visible = signsVisible;
        benchParts.forEach(p => p.removeFromParent());
        release(own); own.removeFromParent();
        delete canvas.dataset.labTunnelModel; delete canvas.dataset.labTunnelResult;
      },
    };
  };
}

export const tunnelCamera = {position: [1.8, 1.5, 3.5], target: [0, .9, 0]};
export function tunnelDrawing(result) {
  return {result, camera: tunnelCamera, hideLabels: true, objects: [], forces: [], parts: [], labels: [],
    streams: [-.5, 0, .5].map(z => ({medium: 'air', origin: [-2.6, 1.4, z], direction: [1, 0, 0], speed: 1.6, length: 5, radius: .12, opacity: .8}))};
}
export function arrow(kind, amount, origin, direction, scale) {
  // Grip is a relative share; other magnitudes are kg-equivalent from the bench.
  return {kind, newtons: amount, origin, direction, headWidth: .25, headLength: .3, inFront: true};
}
export function arrowShafts(d, scale) {
  d.metresPerNewton = scale;
  d.forces.forEach((f, i) => {
    const length = f.newtons * scale;
    const vertical = Math.abs(f.direction[1]) > 0;
    const thickness = Math.min(.075, length * .12);
    d.objects.push({id: `shaft-${i}`, position: f.origin.map((v, a) => v + f.direction[a] * length / 2),
      size: vertical ? [thickness, Math.max(.001, length * .8), thickness] : [Math.max(.001, length * .8), thickness, thickness],
      colour: {grip: '#619dff', push: '#56d683', drag: '#f0a148', weight: '#f06464'}[f.kind], inFront: true});
  });
  return d;
}
