import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Car Concept by Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0.
// See public/assets/models/CREDITS.md. Original badges are omitted at runtime.
let assetPromise;
export function loadHeroVehicle() {
  assetPromise ||= new GLTFLoader().loadAsync('/assets/models/car-concept.glb').then(gltf => {
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(source), size = box.getSize(new THREE.Vector3());
    const scale = 4.8 / size.z;
    const center = box.getCenter(new THREE.Vector3());
    const normalize = new THREE.Matrix4().makeScale(scale, scale, scale);
    normalize.multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
    const entries = [], wheelCenters = new Map();
    source.traverse(o => {
      if (/^Wheel(?:Front|Rear)[LR]$/.test(o.name)) {
        wheelCenters.set(o.name, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(normalize));
      }
    });
    source.traverse(o => {
      if (!o.isMesh || /Emblem|Logo/i.test(o.name)) return;
      let ancestor = o, wheelName;
      while (ancestor) { if (wheelCenters.has(ancestor.name)) { wheelName = ancestor.name; break; } ancestor = ancestor.parent; }
      const geometry = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, o.matrixWorld));
      if (wheelName) {
        const c = wheelCenters.get(wheelName);
        geometry.translate(-c.x, -c.y, -c.z);
        // The source poses its front wheels at 30 degrees. Start the game straight.
        if (wheelName.includes('Front')) geometry.rotateY(Math.PI / 6);
      }
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv', 'uv1'].includes(name)) geometry.deleteAttribute(name);
      for (const name of ['uv', 'uv1']) if (!geometry.attributes[name]) geometry.setAttribute(name, new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, i) => i));
      const material = o.material;
      for (const value of Object.values(material)) if (value?.isTexture) value.userData.sharedAsset = true;
      entries.push({geometry, material, wheelName, stationary: /BrakePad/.test(o.name)});
    });
    // Batch static parts by material, while retaining independent wheel pivots.
    const batches = new Map();
    for (const e of entries) {
      const key = `${e.material.uuid}:${e.wheelName || 'body'}:${e.stationary}`;
      if (!batches.has(key)) batches.set(key, {...e, geometries: []});
      batches.get(key).geometries.push(e.geometry);
    }
    const parts = [...batches.values()].map(b => {
      const geometry = mergeGeometries(b.geometries); b.geometries.forEach(g => g.dispose());
      geometry.userData.sharedAsset = true;
      return {...b, geometry};
    });
    const originals = new Set(); source.traverse(o => { if (o.geometry) originals.add(o.geometry); });
    originals.forEach(g => g.dispose());
    return options => instantiate(parts, wheelCenters, options);
  });
  return assetPromise;
}

function instantiate(parts, wheelCenters, {color, kind}) {
  const vehicle = new THREE.Group(), materials = new Map(), pivots = new Map(), spins = new Map();
  const silver = kind === 'stuttgart';
  const data = vehicle.userData;
  data.wheels = []; data.wheelPivots = []; data.brakeLights = []; data.damageMeshes = [];
  data.originalColor = new THREE.Color(color);
  for (const [name, center] of wheelCenters) {
    const pivot = new THREE.Group(), spin = new THREE.Group();
    pivot.position.copy(center); pivot.userData.restPosition = center.clone(); pivot.userData.front = name.includes('Front');
    pivot.add(spin); vehicle.add(pivot); pivots.set(name, pivot); spins.set(name, spin);
    data.wheels.push(spin); data.wheelPivots.push(pivot);
  }
  for (const part of parts) {
    if (!materials.has(part.material)) {
      const m = part.material.clone();
      if (/Paint 1/.test(m.name)) {
        m.color.set(color); m.metalness = silver ? .82 : .65; m.roughness = .24; m.clearcoat = 1;
        m.normalScale?.setScalar(.13); m.aoMapIntensity = .6; m.side = THREE.FrontSide; data.paint = m;
      }
      if (/Paint 2/.test(m.name)) { m.color.set(silver ? 0x262c32 : 0x080c10); m.roughness = .3; }
      if (m.name === 'License') { m.map = null; m.color.set(0xd0d5cc); }
      if (m.name === 'Headlight') m.emissiveIntensity = 3;
      if (m.name === 'Signallight') m.emissiveIntensity = .12;
      // Transparent glazing avoids a second full-scene transmission render.
      if (m.name === 'Glass') { m.transmission = 0; m.transparent = true; m.opacity = .28; m.color.set(0x738d9d); m.roughness = .06; m.depthWrite = false; m.side = THREE.FrontSide; }
      materials.set(part.material, m);
    }
    const material = materials.get(part.material);
    const geometry = part.wheelName ? part.geometry : part.geometry.clone();
    if (!part.wheelName) geometry.userData.sharedAsset = false;
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = material.name !== 'Glass'; mesh.receiveShadow = true;
    if (part.wheelName) (part.stationary ? pivots : spins).get(part.wheelName).add(mesh);
    else { vehicle.add(mesh); data.damageMeshes.push({mesh, rest: geometry.attributes.position.array.slice()}); }
    if (material.name === 'Brakelight') data.brakeLights.push(mesh);
    if (material.name === 'Glass') {
      const points = [], ray = new THREE.Raycaster(), down = new THREE.Vector3(0,-1,0);
      const surface = (x,z) => { ray.set(new THREE.Vector3(x,3,z),down); const hit=ray.intersectObject(mesh,false)[0]; return hit ? hit.point.addScaledVector(hit.face.normal,.008) : null; };
      for(let i=0;i<11;i++) {
        const angle=i*2.4, a=surface(-.22,.88), b=surface(-.22+Math.sin(angle)*.11,.88+Math.cos(angle)*.1), c=surface(-.22+Math.sin(angle+.12)*.26,.88+Math.cos(angle+.12)*.23);
        if(a&&b)points.push(...a.toArray(),...b.toArray());if(b&&c)points.push(...b.toArray(),...c.toArray());
      }
      const cracks=new THREE.BufferGeometry();cracks.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      const fracture=new THREE.LineSegments(cracks,new THREE.LineBasicMaterial({color:0xbad0db,transparent:true,opacity:.65}));fracture.visible=false;vehicle.add(fracture);data.fracture=fracture;
    }
  }
  data.size = {width: 2.3, length: 4.8, height: 1.3};
  // Soft underbody occlusion complements the moving sun shadow at low GPU cost.
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.5), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-pow(p.x*1.8,4.)-pow(p.y*1.8,6.))*.38;gl_FragColor=vec4(.015,.02,.025,a);}',
  }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = -.015; vehicle.add(contact); data.contactShadow = contact;
  data.heroAsset = true;
  return vehicle;
}
