import * as THREE from 'three';

// World-space pools: tire dust and gravel persist where contact occurred.
// No texture downloads or per-frame material allocation.
export function createDrivingEffects() {
  const group = new THREE.Group();
  group.name = 'Driving contact and impact effects';
  const count = 480, markCount = 160, chipCount = 28;
  const position = new Float32Array(count * 3), color = new Float32Array(count * 3);
  const size = new Float32Array(count), opacity = new Float32Array(count), kind = new Float32Array(count);
  const velocity = new Float32Array(count * 3), life = new Float32Array(count), lifetime = new Float32Array(count);
  const floor = new Float32Array(count), initialSize = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, width] of [['position', position, 3], ['color', color, 3], ['particleSize', size, 1], ['particleAlpha', opacity, 1], ['particleKind', kind, 1]]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, width).setUsage(THREE.DynamicDrawUsage));
  }
  geometry.boundingSphere = new THREE.Sphere();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: `attribute float particleSize; attribute float particleAlpha; attribute float particleKind;
      varying vec3 vColor; varying float vAlpha; varying float vKind;
      void main(){vColor=color;vAlpha=particleAlpha;vKind=particleKind;
        vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(particleSize*540./max(1.,-mv.z),1.,110.);}`,
    fragmentShader: `varying vec3 vColor;varying float vAlpha;varying float vKind;
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);
        float mask=1.-smoothstep(.12,1.,r);
        if(vKind>.5)mask=1.-smoothstep(.64,1.,r);
        if(vKind>1.5)mask=exp(-dot(p*vec2(3.8,.8),p*vec2(3.8,.8)))*1.2;
        gl_FragColor=vec4(vColor,vAlpha*mask);if(gl_FragColor.a<.008)discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const particles = new THREE.Points(geometry, material);
  particles.renderOrder = 2;
  group.add(particles);

  const markGeometry = new THREE.PlaneGeometry(.27, 1);
  const markAlpha = new Float32Array(markCount), markLife = new Float32Array(markCount);
  markGeometry.setAttribute('markAlpha', new THREE.InstancedBufferAttribute(markAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const markMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    vertexShader: `attribute float markAlpha;varying float vAlpha;varying vec2 vUv;
      void main(){vAlpha=markAlpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `varying float vAlpha;varying vec2 vUv;
      void main(){float edge=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);
        float grooves=.82+.18*sin(vUv.x*70.);gl_FragColor=vec4(.045,.032,.024,vAlpha*edge*grooves);}`,
  });
  markMaterial.forceSinglePass = true;
  const marks = new THREE.InstancedMesh(markGeometry, markMaterial, markCount);
  marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // A small world-space pool can span behind the camera; disable instance culling
  // rather than risk marks vanishing when the original pool origin leaves view.
  marks.frustumCulled = false;
  group.add(marks);

  const chipGeometry = new THREE.TetrahedronGeometry(.12);
  const chipMaterial = new THREE.MeshStandardMaterial({ color: 0x383533, roughness: .76, metalness: .3 });
  const chips = new THREE.InstancedMesh(chipGeometry, chipMaterial, chipCount);
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chips.frustumCulled = false;
  group.add(chips);
  const chipPosition = new Float32Array(chipCount * 3), chipVelocity = new Float32Array(chipCount * 3);
  const chipLife = new Float32Array(chipCount), chipFloor = new Float32Array(chipCount);
  const transform = new THREE.Object3D();
  transform.scale.setScalar(0); transform.updateMatrix();
  for (let i = 0; i < markCount; i++) marks.setMatrixAt(i, transform.matrix);
  for (let i = 0; i < chipCount; i++) chips.setMatrixAt(i, transform.matrix);
  let cursor = 0, markCursor = 0, chipCursor = 0, previousImpact = 0;
  let dustBudget = 0, gravelBudget = 0, skidBudget = 0, previousX, previousZ;

  function emit(x, y, z, vx, vy, vz, type, strength = 1) {
    const i = cursor++ % count, n = i * 3;
    position[n] = x; position[n + 1] = y; position[n + 2] = z;
    velocity[n] = vx; velocity[n + 1] = vy; velocity[n + 2] = vz;
    floor[i] = y - .09; kind[i] = type;
    lifetime[i] = type === 0 ? 1.0 + Math.random() * .95 : type === 1 ? .45 + Math.random() * .55 : .23 + Math.random() * .48;
    life[i] = lifetime[i];
    initialSize[i] = type === 0 ? .65 + Math.random() * .7 : type === 1 ? .055 + Math.random() * .075 : .1 + Math.random() * .2;
    const shade = .78 + Math.random() * .22;
    color[n] = (type === 2 ? 3.4 : type === 1 ? .45 : .72) * shade;
    color[n + 1] = (type === 2 ? 1.8 : type === 1 ? .31 : .49) * shade;
    color[n + 2] = (type === 2 ? .32 : type === 1 ? .18 : .28) * shade;
    opacity[i] = type === 0 ? .28 * strength : .95;
  }

  function update({ p, state, dt, now = 0 }) {
    if (!(dt > 0) || !p || !state) return;
    dt = Math.min(dt, .06);
    const activeDrive = !state.status || state.status === 'racing';
    const speed = Math.max(0, state.speedMph || 0), moving = speed > 9 && activeDrive;
    const heading = (p.heading || 0) + (state.headingError || 0) + (state.slipAngle || 0);
    const fx = Math.sin(heading), fz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading);
    const ground = p.y || 0, roughness = Math.max(.2, state.roughness || 0);
    const impact = state.impactTimer || 0;
    const teleported = previousX !== undefined && Math.hypot(p.x - previousX, p.z - previousZ) > 45;
    if (teleported) { life.fill(0); markLife.fill(0); chipLife.fill(0); }
    previousX = p.x; previousZ = p.z;

    if (state.offRoad && moving) {
      dustBudget += dt * Math.min(65, 16 + speed * .3) * roughness;
      gravelBudget += dt * Math.min(55, speed * .37) * roughness;
      while (dustBudget >= 1) {
        dustBudget--;
        const side = Math.random() < .5 ? -1 : 1;
        emit(p.x - fx * 1.45 + rx * side, ground + .12, p.z - fz * 1.45 + rz * side,
          -fx * 1.8 + rx * (Math.random() - .5) * 2.6, .8 + Math.random() * .8,
          -fz * 1.8 + rz * (Math.random() - .5) * 2.6, 0);
      }
      while (gravelBudget >= 1) {
        gravelBudget--;
        const side = Math.random() < .5 ? -1 : 1, scatter = side * (1.5 + Math.random() * 3);
        emit(p.x - fx * 1.4 + rx * side, ground + .14, p.z - fz * 1.4 + rz * side,
          -fx * (3 + speed * .035) + rx * scatter, 1.8 + Math.random() * 3,
          -fz * (3 + speed * .035) + rz * scatter, 1);
      }
    } else { dustBudget = 0; gravelBudget = 0; }

    if (impact > previousImpact + .12) {
      const power = Math.max(.25, Math.min(1, state.impactStrength || .5)), side = state.impactSide || 1;
      const x = p.x + rx * side, z = p.z + rz * side;
      for (let i = 0; i < 30 + power * 65; i++) {
        const spread = (Math.random() - .5) * (4 + power * 13);
        emit(x, ground + .45, z, -fx * (3 + Math.random() * 12) + rx * spread,
          Math.random() * (4 + power * 4), -fz * (3 + Math.random() * 12) + rz * spread, i % 5 === 0 ? 0 : 2, power);
      }
      for (let n = 0; n < 7 + power * 9; n++) {
        const i = chipCursor++ % chipCount, j = i * 3;
        chipLife[i] = 1.8; chipFloor[i] = ground + .06;
        chipPosition[j] = x; chipPosition[j + 1] = ground + .48; chipPosition[j + 2] = z;
        chipVelocity[j] = -fx * 5 + (Math.random() - .5) * 10;
        chipVelocity[j + 1] = 2 + Math.random() * 5;
        chipVelocity[j + 2] = -fz * 5 + (Math.random() - .5) * 10;
      }
    }
    previousImpact = impact;

    const braking = Number(state.input?.brake || 0) > .2;
    const sliding = !!state.drifting || (Math.abs(state.slipAngle || 0) > .075);
    if (activeDrive && !state.offRoad && speed > 24 && (braking || sliding || impact > .1)) {
      skidBudget += dt;
      const interval = .045;
      while (skidBudget >= interval) {
        skidBudget -= interval;
        for (const side of [-1, 1]) {
          const i = markCursor++ % markCount;
          markLife[i] = 7;
          transform.position.set(p.x - fx * 1.4 + rx * side, ground + .034, p.z - fz * 1.4 + rz * side);
          transform.rotation.set(-Math.PI / 2, 0, heading);
          transform.scale.set(1, Math.max(.45, speed * .44704 * interval * 1.18), 1);
          transform.updateMatrix(); marks.setMatrixAt(i, transform.matrix);
        }
        if (sliding && Math.random() > .35) emit(p.x - fx * 1.6, ground + .1, p.z - fz * 1.6, -fx, .6, -fz, 0, .3);
      }
    } else skidBudget = 0;

    let minX = p.x, maxX = p.x, minY = ground, maxY = ground, minZ = p.z, maxZ = p.z;
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) { opacity[i] = 0; size[i] = 0; continue; }
      life[i] -= dt;
      const n = i * 3, age = 1 - Math.max(0, life[i]) / lifetime[i], isDust = kind[i] === 0;
      velocity[n + 1] -= (isDust ? -.15 : 12) * dt;
      position[n] += velocity[n] * dt; position[n + 1] += velocity[n + 1] * dt; position[n + 2] += velocity[n + 2] * dt;
      if (!isDust && position[n + 1] < floor[i]) { position[n + 1] = floor[i]; velocity[n + 1] *= -.22; velocity[n] *= .6; velocity[n + 2] *= .6; }
      size[i] = initialSize[i] * (isDust ? 1 + age * 2.3 : 1);
      opacity[i] = (isDust ? .26 : .95) * Math.pow(1 - age, isDust ? 1.3 : .6) * Math.min(1, (age + .05) * 8);
      minX = Math.min(minX, position[n]); maxX = Math.max(maxX, position[n]);
      minY = Math.min(minY, position[n + 1]); maxY = Math.max(maxY, position[n + 1]);
      minZ = Math.min(minZ, position[n + 2]); maxZ = Math.max(maxZ, position[n + 2]);
    }
    geometry.boundingSphere.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    geometry.boundingSphere.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + 5;
    for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
    for (let i = 0; i < markCount; i++) { markLife[i] = Math.max(0, markLife[i] - dt); markAlpha[i] = Math.min(.48, markLife[i] * .2); }
    markGeometry.attributes.markAlpha.needsUpdate = true; marks.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < chipCount; i++) {
      chipLife[i] = Math.max(0, chipLife[i] - dt);
      const j = i * 3;
      if (chipLife[i] > 0) {
        chipVelocity[j + 1] -= 13 * dt;
        for (let axis = 0; axis < 3; axis++) chipPosition[j + axis] += chipVelocity[j + axis] * dt;
        if (chipPosition[j + 1] < chipFloor[i]) { chipPosition[j + 1] = chipFloor[i]; chipVelocity[j + 1] *= -.3; chipVelocity[j] *= .78; chipVelocity[j + 2] *= .78; }
        transform.position.set(chipPosition[j], chipPosition[j + 1], chipPosition[j + 2]);
        transform.rotation.set(now * (3 + i % 4), now * (i % 5 + 2), i);
        transform.scale.setScalar(Math.min(1, chipLife[i] * 3));
      } else transform.scale.setScalar(0);
      transform.updateMatrix(); chips.setMatrixAt(i, transform.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
  }

  return { group, update, dispose() {
    marks.dispose(); chips.dispose();
    geometry.dispose(); material.dispose(); markGeometry.dispose(); markMaterial.dispose();
    chipGeometry.dispose(); chipMaterial.dispose(); group.removeFromParent(); group.clear();
  } };
}
