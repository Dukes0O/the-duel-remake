import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {FUEL_RULES} from './fuel-run.js';

// Fuel presentation is read-only. Resources are made on arena/cargo events,
// outside rendering. Instancing keeps scattered fuel to one extra draw call.
function canisterGeometry() {
  const pieces = [];
  const box = (x, y, z, w, h, d, angle = 0) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.rotateZ(angle); geometry.translate(x, y, z); pieces.push(geometry);
  };
  box(0, .34, 0, .52, .64, .30);
  box(-.15, .71, 0, .06, .15, .12); box(.15, .71, 0, .06, .15, .12);
  box(0, .78, 0, .34, .06, .12);
  box(.17, .69, .06, .13, .05, .13);
  box(0, .35, .16, .045, .60, .018, .61);
  box(0, .35, .16, .045, .60, .018, -.61);
  const geometry = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  return geometry;
}

function label(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#29291f'; ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = color; ctx.font = 'bold 31px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture,
    transparent: false, depthWrite: false, toneMapped: false}));
  sprite.scale.set(5, 2.5, 1); sprite.position.y = 2.5;
  return sprite;
}

export function createFuelRunView(duel) {
  const group = new THREE.Group(); group.name = 'Fuel Run cargo and depots';
  const pads = new THREE.Group(); group.add(pads);
  const geometry = canisterGeometry();
  const material = new THREE.MeshStandardMaterial({color: 0xe5e5d7,
    roughness: .86, metalness: .25});
  const ringGeometry = new THREE.RingGeometry(FUEL_RULES.depotMetres - .22, FUEL_RULES.depotMetres, 40);
  const baseGeometry = new THREE.CylinderGeometry(FUEL_RULES.depotMetres, FUEL_RULES.depotMetres, .08, 40);
  // Pickup markers retain their established geometry as delivery depots grow.
  const pickupRingGeometry = new THREE.RingGeometry(2 - .22, 2, 40);
  const pickupBaseGeometry = new THREE.CylinderGeometry(2, 2, .08, 40);
  const dummy = new THREE.Object3D(), local = new THREE.Matrix4();
  const color = new THREE.Color();
  let cargo, capacity = 0, activeArena = null;
  const depotMaterials = [], labelTextures = [];
  const padGround = [], looseGround = new Map();
  function reserve(count) {
    if (count <= capacity) return;
    capacity = Math.max(256, capacity * 2, count);
    if (cargo) { group.remove(cargo); cargo.dispose(); }
    cargo = new THREE.InstancedMesh(geometry, material, capacity);
    cargo.name = 'Fuel canisters'; cargo.count = 0;
    cargo.castShadow = true; cargo.receiveShadow = true; cargo.frustumCulled = false;
    cargo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cargo.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
    cargo.instanceColor.setUsage(THREE.DynamicDrawUsage);
    group.add(cargo);
  }
  function clearPads() {
    pads.clear();
    for (const mat of depotMaterials) mat.dispose();
    for (const texture of labelTextures) texture.dispose();
    depotMaterials.length = labelTextures.length = 0;
  }
  function marker(course, pose, text, shade, fuelPad) {
    const holder = new THREE.Group(), at = course.groundAt(pose.s, pose.lateral);
    holder.position.set(at.x, at.y + .03, at.z);
    const mat = new THREE.MeshBasicMaterial({color: shade,
      transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false});
    const ring = new THREE.Mesh(fuelPad ? pickupRingGeometry : ringGeometry, mat);
    ring.rotation.x = -Math.PI / 2;
    holder.add(ring); depotMaterials.push(mat);
    const baseMat = new THREE.MeshStandardMaterial({color: 0x393832, roughness: 1});
    const base = new THREE.Mesh(fuelPad ? pickupBaseGeometry : baseGeometry, baseMat);
    base.position.y = -.015;
    if (fuelPad) { base.scale.setScalar(.65); ring.scale.setScalar(.65); }
    holder.add(base); depotMaterials.push(baseMat);
    const sign = label(text, shade); holder.add(sign);
    depotMaterials.push(sign.material); labelTextures.push(sign.material.map);
    pads.add(holder);
    return at;
  }
  function prepare() {
    const arena = duel.state.arena;
    if (arena?.mode !== 'fuel-run') { group.visible = false; return; }
    reserve(arena.fuelRun.canisters.length + 8);
    if (activeArena !== arena) {
      activeArena = arena; clearPads(); padGround.length = 0;
      for (const pad of arena.fuelRun.pads)
        padGround.push(marker(duel.course, pad, 'FUEL', '#e8c55b', true));
      for (const depot of arena.fuelRun.depots) {
        const participant = arena.participants.find(p => p.id === depot.participantId);
        marker(duel.course, depot, participant.id === 'player' ? 'YOUR DEPOT' : participant.name,
          depot.color, false);
      }
    }
    // These objects belong to presentation and are prepared only at events.
    // Refills reuse their fixed pad pose without needing a render-time sample.
    looseGround.clear();
    for (const canister of arena.fuelRun.canisters) {
      if (canister.carriedBy) continue;
      let at = null;
      for (let index = 0; index < arena.fuelRun.pads.length; index++) {
        const pad = arena.fuelRun.pads[index];
        if (canister.s === pad.s && canister.lateral === pad.lateral) {
          at = padGround[index]; break;
        }
      }
      looseGround.set(canister.id, at || duel.course.groundAt(canister.s, canister.lateral));
    }
  }
  const stop = duel.onChange((_state, event) => {
    if (event.arenaLoaded || event.fuelPickup || event.fuelDrop || event.fuelDelivery) prepare();
  });
  prepare();
  return {group,
    update(state, course, entries) {
      const fuel = state.arena?.mode === 'fuel-run' ? state.arena.fuelRun : null;
      group.visible = !!fuel;
      if (!fuel || !cargo) return;
      let count = 0,available = 0,carried = 0;
      for (const canister of fuel.canisters) {
        if(canister.carriedBy)carried++;else available++;
        if (canister.carriedBy) {
          if (canister.carriedBy === 'player' && state.onFoot && state.fighter) {
            const f = state.fighter;
            dummy.position.set(f.x - Math.cos(f.yaw) * .45, f.y + .45,
              f.z + Math.sin(f.yaw) * .45);
            dummy.rotation.set(0, f.yaw, 0); dummy.scale.setScalar(1);
            dummy.updateMatrix();
          } else {
            let entry=null;
            for(const candidate of entries)if(candidate.id===canister.carriedBy){entry=candidate;break;}
            if (!entry?.mesh) continue;
            entry.mesh.updateWorldMatrix(true, false);
            const roof = entry.mesh.userData.vehicleSockets?.roof;
            const height = roof?.position.y ?? ((entry.mesh.userData.size?.height || 1.35) + .08);
            local.makeTranslation(0, height, (roof?.position.z || 0) + .55);
            dummy.matrix.multiplyMatrices(entry.mesh.matrixWorld, local);
          }
        } else {
          let at = looseGround.get(canister.id);
          if (!at) {
            for (let index = 0; index < fuel.pads.length; index++) {
              if (fuel.pads[index].canisterId === canister.id) {
                at = padGround[index]; break;
              }
            }
          }
          if (!at) continue;
          dummy.position.set(at.x, at.y + .08, at.z);
          dummy.rotation.set(0, at.heading, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        }
        cargo.setMatrixAt(count, dummy.matrix);
        let shade='#c9ac55';
        if(canister.carriedBy)for(const depot of fuel.depots)if(depot.participantId===canister.carriedBy){shade=depot.color;break;}
        color.set(shade);
        cargo.setColorAt(count++, color);
      }
      cargo.count = count; cargo.instanceMatrix.needsUpdate = true;
      if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true;
      group.userData.available=available;group.userData.carried=carried;
    },
    dispose() { stop(); clearPads(); looseGround.clear(); padGround.length = 0;
      cargo?.dispose(); geometry.dispose();
      material.dispose(); ringGeometry.dispose(); baseGeometry.dispose();
      pickupRingGeometry.dispose(); pickupBaseGeometry.dispose(); group.removeFromParent(); },
  };
}
