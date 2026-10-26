// A cutaway teaching view: the left hand and the actual model's rotor.
// It changes display poses only and exists only while this word is shown.
export function createCollectiveInset({THREE, doc, overlay, rotorBlades, pitchBlades}) {
  const box = doc.createElement('aside'); box.className = 'lab-collective-inset'; box.hidden = true;
  box.innerHTML = '<b>Collective · cockpit cutaway</b><div class="lab-collective-views"><span>Pilot’s left hand</span><span>Every blade twists</span></div>';
  const canvas = doc.createElement('canvas'); canvas.setAttribute('aria-label', 'Left hand raises the collective while every rotor blade twists together'); box.append(canvas); overlay.append(box);
  let renderer = null, rotor = null, blades = [];
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#202c2c');
  const camera = new THREE.OrthographicCamera(-1.6, 1.6, .8, -.8, .01, 20); camera.position.set(0, 1.3, 5); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#edf3e7', '#464032', 3));
  const light = new THREE.DirectionalLight('#fff4db', 3); light.position.set(-2, 3, 4); scene.add(light);
  const skin = new THREE.MeshStandardMaterial({color: '#ae8164', roughness: .88});
  const cuff = new THREE.MeshStandardMaterial({color: '#727c78', roughness: 1});
  const dark = new THREE.MeshStandardMaterial({color: '#202625', roughness: .8});
  const metal = new THREE.MeshStandardMaterial({color: '#9da29b', roughness: .65, metalness: .5});
  function mesh(geometry, material, position, parent = scene) {
    const m = new THREE.Mesh(geometry, material); m.position.set(...position); parent.add(m); return m;
  }
  const pivot = new THREE.Group(); pivot.position.set(-.8, -.66, .2); scene.add(pivot);
  mesh(new THREE.BoxGeometry(.5, .13, .65), dark, [0, -.04, 0], pivot);
  mesh(new THREE.CylinderGeometry(.035, .045, .85, 12), metal, [0, .425, 0], pivot);
  mesh(new THREE.CylinderGeometry(.065, .065, .24, 12), dark, [0, .85, 0], pivot).rotation.z = Math.PI / 2;
  const hand = new THREE.Group(); hand.position.set(0, .85, .035); pivot.add(hand);
  mesh(new THREE.SphereGeometry(1, 18, 12), skin, [-.055, .02, .065], hand).scale.set(.16, .065, .12);
  // Four curled fingers wrap over the grip; the thumb closes on its near side.
  for (let i = 0; i < 4; i++) {
    mesh(new THREE.CapsuleGeometry(.025, .105, 4, 8), skin, [-.12 + i * .06, .025, -.025], hand).rotation.x = .8;
    mesh(new THREE.SphereGeometry(.027, 8, 6), skin, [-.12 + i * .06, -.04, -.055], hand);
  }
  mesh(new THREE.CapsuleGeometry(.035, .1, 4, 8), skin, [.11, -.035, .1], hand).rotation.z = -.8;
  mesh(new THREE.CapsuleGeometry(.085, .42, 6, 12), skin, [-.34, .005, .12], hand).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.105, .105, .14, 16), cuff, [-.57, .005, .12], hand).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.13, .11, .35, 16), cuff, [-.8, .005, .12], hand).rotation.z = Math.PI / 2;
  // Seat edge and cockpit sill locate the lever beside, rather than in front of, the pilot.
  mesh(new THREE.BoxGeometry(.32, .8, .45), dark, [-.35, -.55, -.28]);
  mesh(new THREE.BoxGeometry(.08, 1.6, .08), metal, [-1.45, .1, -.35]).rotation.z = -.25;
  return {
    setRotor(source) {
      rotor = source.clone(true); rotor.rotation.set(.55, 0, 0); rotor.position.set(.45, .2, -.05); rotor.scale.setScalar(.2);
      // Own both geometry and materials; the inset must never dispose the main rotor.
      rotor.traverse(n => { if (n.material) n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone(); });
      blades = rotorBlades(rotor);
      // Magnify the narrow chord in this cutaway so a child can see the twist.
      for (const blade of blades) for (let i = 2; i < blade.original.length; i += 3) blade.original[i] *= 3;
      scene.add(rotor);
    },
    draw(visible, collective) {
      if (box.hidden !== !visible) box.hidden = !visible;
      if (!visible) return;
      if (!renderer) { renderer = new THREE.WebGLRenderer({canvas, antialias: true}); renderer.setSize(640, 320, false); renderer.outputColorSpace = THREE.SRGBColorSpace; }
      pivot.rotation.x = -(1 - collective) * .85;
      if (rotor) { pitchBlades(blades, collective); rotor.rotation.y = -.3; }
      renderer.render(scene, camera);
      if (canvas.dataset.collective !== String(collective)) canvas.dataset.collective = String(collective);
    },
    dispose() {
      scene.traverse(n => { n.geometry?.dispose(); for (const material of [].concat(n.material ?? [])) material.dispose(); });
      renderer?.dispose(); renderer?.forceContextLoss(); box.remove();
    },
  };
}
