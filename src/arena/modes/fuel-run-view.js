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

function label(text, color, own = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = own ? color : '#29291f'; ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = own ? '#101010' : color; ctx.lineWidth = 10; ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = own ? '#101010' : color; ctx.font = `bold ${text.length > 12 ? 24 : 31}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture,
    transparent: false, depthWrite: false, toneMapped: false}));
  sprite.scale.set(own ? 7 : 5, own ? 3.5 : 2.5, 1); sprite.position.y = own ? 3.2 : 2.5;
  return sprite;
}

export function createFuelRunView(duel) {
  const group = new THREE.Group(); group.name = 'Fuel Run cargo and depots';
  const pads = new THREE.Group(); group.add(pads);
  const geometry = canisterGeometry();
  const material = new THREE.MeshStandardMaterial({color: 0xe5e5d7,
    roughness: .86, metalness: .25});
  const baseGeometry = new THREE.CylinderGeometry(FUEL_RULES.depotMetres, FUEL_RULES.depotMetres, .08, 40);
  // Pickup markers retain their established geometry as delivery depots grow.
  const pickupRingGeometry = new THREE.RingGeometry(2 - .22, 2, 40);
  const pickupBaseGeometry = new THREE.CylinderGeometry(2, 2, .08, 40);
  // A depot is a lit disc with a thick ring. Only the player's own depot also
  // gets a tall light column, so the right one can be found from across the
  // floor: bright while carrying fuel, dimmer while looking for it. Basic
  // (unlit, untoned) materials keep the colours strong in dust and at night.
  const discGeometry = new THREE.CircleGeometry(FUEL_RULES.depotMetres - .5, 40);
  const heavyRingGeometry = new THREE.RingGeometry(FUEL_RULES.depotMetres - .7, FUEL_RULES.depotMetres, 40);
  const BEAM_STEPS = [[.5, 14], [.32, 14], [.2, 14], [.1, 14]];
  const beamGeometries = BEAM_STEPS.map(([, height]) =>
    new THREE.CylinderGeometry(1.1, 1.5, height, 20, 1, true));
  // A thick flat arrow floating above the cargo, tip toward +z.
  const arrowGeometry = (() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.9); shape.lineTo(1.2, .5); shape.lineTo(.4, .5); shape.lineTo(.4, -1.3);
    shape.lineTo(-.4, -1.3); shape.lineTo(-.4, .5); shape.lineTo(-1.2, .5); shape.closePath();
    // Given some thickness, so it still shows from the low chase camera.
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: .6, bevelEnabled: false});
    geometry.translate(0, 0, -.3);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  })();
  const arrowMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false,
    depthTest: false, transparent: true, opacity: .8, side: THREE.DoubleSide});
  const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrow.name = 'Depot arrow'; arrow.scale.setScalar(.5); arrow.visible = false; arrow.renderOrder = 10; arrow.frustumCulled = false;
  group.add(arrow);
  const beams = [], padBeams = [];
  const padBeamGeometry = new THREE.CylinderGeometry(.5, .8, 10, 12, 1, true);
  const dummy = new THREE.Object3D(), local = new THREE.Matrix4();
  const color = new THREE.Color(), arrowFrom = new THREE.Vector3();
  let cargo, capacity = 0, activeArena = null;
  const depotMaterials = [], labelTextures = [];
  const padGround = [], looseGround = new Map(), depotAt = new Map();
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
    pads.clear(); beams.length = 0; padBeams.length = 0; depotAt.clear();
    for (const mat of depotMaterials) mat.dispose();
    for (const texture of labelTextures) texture.dispose();
    depotMaterials.length = labelTextures.length = 0;
  }
  function marker(course, pose, text, shade, fuelPad, own = false) {
    const holder = new THREE.Group(), at = course.groundAt(pose.s, pose.lateral);
    holder.position.set(at.x, at.y + .03, at.z);
    const mat = new THREE.MeshBasicMaterial({color: shade, toneMapped: false,
      transparent: true, opacity: fuelPad ? .75 : .95, side: THREE.DoubleSide, depthWrite: false});
    const ring = new THREE.Mesh(fuelPad ? pickupRingGeometry : heavyRingGeometry, mat);
    ring.rotation.x = -Math.PI / 2;
    holder.add(ring); depotMaterials.push(mat);
    const baseMat = new THREE.MeshStandardMaterial({color: 0x393832, roughness: 1});
    const base = new THREE.Mesh(fuelPad ? pickupBaseGeometry : baseGeometry, baseMat);
    base.position.y = -.015;
    if (fuelPad) { base.scale.setScalar(.65); ring.scale.setScalar(.65); }
    holder.add(base); depotMaterials.push(baseMat);
    if (fuelPad) {
      // Fuel waiting on a pad shows a short pale column, so it reads from afar.
      const padBeamMaterial = new THREE.MeshBasicMaterial({color: '#fff2a8', toneMapped: false,
        transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false,
        blending: THREE.AdditiveBlending});
      const padBeam = new THREE.Mesh(padBeamGeometry, padBeamMaterial);
      padBeam.position.y = 5; padBeam.frustumCulled = false;
      holder.add(padBeam); depotMaterials.push(padBeamMaterial); padBeams.push(padBeam);
    } else {
      const glow = new THREE.MeshBasicMaterial({color: shade, toneMapped: false,
        transparent: true, opacity: own ? .38 : .22, side: THREE.DoubleSide, depthWrite: false});
      const disc = new THREE.Mesh(discGeometry, glow);
      disc.rotation.x = -Math.PI / 2; disc.position.y = .01;
      holder.add(disc); depotMaterials.push(glow);
      // Rivals get a short column in their own colour; the player's is tall.
      const steps = own ? BEAM_STEPS : BEAM_STEPS.slice(0, 1);
      let y = 0;
      steps.forEach(([opacity, height], step) => {
        const beamMaterial = new THREE.MeshBasicMaterial({color: shade, toneMapped: false,
          transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false,
          blending: THREE.AdditiveBlending});
        const beam = new THREE.Mesh(beamGeometries[step], beamMaterial);
        beam.position.y = y + height / 2; beam.frustumCulled = false;
        y += height; holder.add(beam); depotMaterials.push(beamMaterial);
        beams.push({material: beamMaterial, opacity, own});
      });
    }
    const sign = label(text, shade, own); holder.add(sign);
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
        const own = participant.id === 'player';
        depotAt.set(participant.id, marker(duel.course, depot,
          own ? `YOUR DEPOT · ${depot.colorName}` : participant.name, depot.color, false, own));
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
      let count = 0,available = 0,carried = 0,carrying = false;
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
          if (canister.carriedBy === 'player') { carrying = true; arrowFrom.setFromMatrixPosition(dummy.matrix); }
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
      // Presentation only: the player's column is bright while carrying fuel,
      // and an arrow floats above the cargo pointing at the player's depot.
      const pulse = .88 + .12 * Math.sin(state.stageTimeSec * 4);
      const home = fuel.depots.find(depot => depot.participantId === 'player'), target = depotAt.get('player');
      // Fade the player's column out close up, so it never fills the view
      // when sitting in the depot.
      let near = 1;
      if (target) {
        const foot = state.onFoot && state.fighter;
        const mine = foot ? state.fighter : entries.find(entry => entry.id === 'player')?.mesh?.position;
        if (mine) near = Math.max(.12, Math.min(1, (Math.hypot(mine.x - target.x, mine.z - target.z) - 5) / 20));
      }
      for (const beam of beams)
        beam.material.opacity = beam.opacity * pulse * (beam.own ? near * (carrying ? 1 : .6) : 1);
      padBeams.forEach((beam, index) => { beam.visible = !!fuel.pads[index]?.canisterId; });
      const dx = target && carrying ? target.x - arrowFrom.x : 0, dz = target && carrying ? target.z - arrowFrom.z : 0;
      arrow.visible = !!home && carrying && Math.hypot(dx, dz) > FUEL_RULES.depotMetres * 3;
      if (arrow.visible) {
        arrow.material.color.set(home.color);
        arrow.position.set(arrowFrom.x, arrowFrom.y + 3, arrowFrom.z);
        arrow.rotation.set(0, Math.atan2(dx, dz), 0);
      }
      cargo.count = count; cargo.instanceMatrix.needsUpdate = true;
      if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true;
      group.userData.available=available;group.userData.carried=carried;
    },
    dispose() { stop(); clearPads(); looseGround.clear(); padGround.length = 0;
      cargo?.dispose(); geometry.dispose();
      material.dispose(); baseGeometry.dispose();
      pickupRingGeometry.dispose(); pickupBaseGeometry.dispose();
      discGeometry.dispose(); heavyRingGeometry.dispose(); padBeamGeometry.dispose();
      arrowGeometry.dispose(); arrowMaterial.dispose();
      for (const geometry of beamGeometries) geometry.dispose();
      group.removeFromParent(); },
  };
}
