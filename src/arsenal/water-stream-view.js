// WEAPON-WATER-CANNON: how a stream of water looks, drawn the same wherever it comes from, so a player learns one thing: the
// fire truck's cannon on flames or on a car (src/town/view/work-vehicle-view.js) and the Armory's car cannon in a fight
// (src/combat-scene.js).
// TOWN-FIRE-STREAM-LOOK: the stream is a jet, drawn in code. It leaves the nozzle as one tight rope of water, arcs, tears into
// ropes and drops as it goes and lands as spray. On a wall it runs down and leaves the wall dark and wet for a while; on
// flames it throws steam, and `burst` throws a cloud of it when a fire goes out. View only: it reads points and never changes
// race state. Everything is placed from the clock it is given, so it is the same in every replay.
import * as THREE from 'three';
import {scrapNoise} from '../world/scrap-look.js';

export const WATER_STREAM_LOOK = Object.freeze({
  // The jet: half its width in metres at the nozzle and where it lands, and how fast the water runs along it (m/s).
  segments: 26, nearWidth: .09, farWidth: .6, flow: 24,
  // The arc rises by this share of its length, at most `maxRise` metres.
  rise: .1, maxRise: 3.5,
  // Soft points: drops torn off the jet, spray where it lands, water running off, steam off flames, the cloud as a fire goes out.
  drops: 64, mist: 12, runoff: 14, steam: 14, burst: 16,
  colour: 0xdfe9f1, steamColour: 0xe6e4df,
  // A wall takes `wetSeconds` of water to darken fully and `drySeconds` to dry; the cloud of steam lasts `burstSeconds`.
  wetSeconds: 2.5, drySeconds: 14, burstSeconds: 4,
});

const UP = new THREE.Vector3(0, 1, 0);
const share = (index, salt) => { const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453; return value - Math.floor(value); };

const JET_VERTEX = `
  uniform vec3 uFrom; uniform vec3 uTo; uniform float uRise; uniform float uNear; uniform float uFar;
  attribute float aAlong; attribute float aSide;
  varying float vAlong; varying float vSide;
  vec3 arc(float s) { vec3 p = mix(uFrom, uTo, s); p.y += uRise * 4.0 * s * (1.0 - s); return p; }
  void main() {
    vec3 p = (modelMatrix * vec4(arc(aAlong), 1.0)).xyz, q = (modelMatrix * vec4(arc(aAlong + .01), 1.0)).xyz;
    vec3 side = normalize(cross(normalize(q - p), normalize(cameraPosition - p)));
    vAlong = aAlong; vSide = aSide;
    gl_Position = projectionMatrix * viewMatrix * vec4(p + side * aSide * mix(uNear, uFar, pow(aAlong, 1.5)), 1.0);
  }`;
const JET_FRAGMENT = `
  uniform sampler2D uNoise; uniform float uClock; uniform float uLength; uniform float uFlow; uniform float uLight; uniform vec3 uColour;
  varying float vAlong; varying float vSide;
  void main() {
    float edge = 1.0 - smoothstep(.3, 1.0, abs(vSide));
    // The water's own streaks, running out along the jet.
    vec2 at = vec2((vAlong * uLength - uClock * uFlow) * .11, vSide * .22);
    float ropes = texture2D(uNoise, at).b * .6 + texture2D(uNoise, at * vec2(2.7, 1.9) + .37).g * .4;
    // Solid at the nozzle, torn into ropes and gaps as it goes.
    float torn = smoothstep(.12, .9, vAlong);
    float body = smoothstep(torn * .5, torn * .5 + .18, ropes + (1.0 - torn) * .5);
    float alpha = edge * body * mix(.95, .55, vAlong) * smoothstep(0.0, .015, vAlong);
    // Water in the open is the sky's light: white in the middle of a rope, bluer and darker towards its edges.
    vec3 colour = uColour * mix(vec3(.5, .58, .68), vec3(1.06), edge * (.5 + .5 * ropes)) * uLight;
    gl_FragColor = vec4(colour, alpha);
  }`;
const POINT_VERTEX = `
  uniform float uScale;
  attribute float aSize; attribute vec4 aColour; attribute float aCloud;
  varying vec4 vColour; varying float vCloud;
  void main() {
    vec4 eye = modelViewMatrix * vec4(position, 1.0);
    vColour = aColour; vCloud = aCloud;
    gl_PointSize = aSize > 0.0 ? clamp(aSize * uScale / max(.1, -eye.z), 1.5, 260.0) : 0.0;
    gl_Position = projectionMatrix * eye;
  }`;
const POINT_FRAGMENT = `
  uniform sampler2D uNoise;
  varying vec4 vColour; varying float vCloud;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.0;
    float a = vColour.a * (1.0 - smoothstep(.25, 1.0, d));
    // A puff of spray or steam is ragged, each one differently; a drop (no cloud) stays round.
    if (vCloud > 0.0) {
      vec3 torn = texture2D(uNoise, gl_PointCoord * .42 + vec2(vCloud * 7.31, vCloud * 3.17)).rgb;
      a *= smoothstep(.3, .72, torn.r * .7 + torn.b * .5 + (1.0 - d) * .25);
    }
    if (a < .004) discard;
    gl_FragColor = vec4(vColour.rgb, a);
  }`;
const WET_VERTEX = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// The wet patch: a rough splash round where the water lands and, on a wall, runs below it that reach further the wetter the
// wall is. On the ground it is the splash alone, wider. `uDark` is the share of the light it takes: a sunlit pale wall is far
// brighter than the picture can show, and the tone mapping squeezes it, so that taking half its light changes almost nothing
// on the screen (a cream cloth read 234, 219, 187 dry and 228, 210, 174 under a patch at 0.6). A wall loses nearly all of it.
const WET_FRAGMENT = `
  uniform sampler2D uNoise; uniform float uWet; uniform vec2 uSize; uniform vec2 uCentre; uniform float uRuns; uniform float uDark; uniform float uSeed;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - uCentre) * uSize;
    float blot = texture2D(uNoise, vUv * vec2(1.3, .9) + uSeed).r, streak = texture2D(uNoise, vec2(vUv.x * 5.0, vUv.y * .5) + uSeed).b;
    float radius = (.5 + .9 * uWet) * (.7 + .6 * blot);
    float splash = 1.0 - smoothstep(radius * .5, radius, length(p * vec2(1.0, 1.15)));
    float reach = (.5 + 2.6 * uWet) * (.3 + streak);
    float run = uRuns * step(p.y, 0.0) * (1.0 - smoothstep(reach * .55, reach, -p.y)) * (1.0 - smoothstep(radius * .45, radius * .95, abs(p.x)));
    float a = max(splash, run) * uDark * (.88 + .12 * blot) * smoothstep(0.0, .12, uWet);
    a *= smoothstep(0.0, .06, vUv.x) * smoothstep(1.0, .94, vUv.x) * smoothstep(0.0, .05, vUv.y) * smoothstep(1.0, .95, vUv.y);
    gl_FragColor = vec4(.022, .024, .028, a);
  }`;

/**
 * One stream's drawing. `draw(scene, from, to, clock, {wall, ground, heat, light})` shows it between two points of `scene`:
 * `wall` is the way the wall it lands on faces ({x, y, z}), when it lands on one; `ground` is the height of the ground under
 * where it lands, when it lands on no wall and the ground is to be wetted; `heat` (0 to 1) is how hard the flames it
 * lands on are burning; `light` (0 to 1) is the daylight. `rest(clock)` is a frame with the water off: a wet wall dries and
 * a cloud of steam finishes. `burst(scene, at, clock)` throws the cloud a fire gives off as it goes out. `hide()` hides it all.
 */
export function createWaterStreamView({name = 'water-stream', layer = null} = {}) {
  const look = WATER_STREAM_LOOK, total = look.drops + look.mist + look.runoff + look.steam + look.burst;
  let group = null, jet = null, points = null, wet = null;
  const state = {clock: null, wet: 0, wetAt: new THREE.Vector3(), wetSet: false, burstAt: new THREE.Vector3(), burstClock: -Infinity, light: 1};
  const water = new THREE.Color(look.colour), steam = new THREE.Color(look.steamColour);
  const from = new THREE.Vector3(), to = new THREE.Vector3(), chord = new THREE.Vector3(), side = new THREE.Vector3(), out = new THREE.Vector3();
  const at = new THREE.Vector3(), basisX = new THREE.Vector3(), basisY = new THREE.Vector3(), turn = new THREE.Matrix4(), size = new THREE.Vector2();

  function build() {
    group = new THREE.Group(); group.name = name;
    const strip = new THREE.BufferGeometry(), along = [], sides = [], index = [];
    for (let i = 0; i <= look.segments; i++) {
      along.push(i / look.segments, i / look.segments); sides.push(-1, 1);
      if (i < look.segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    strip.setAttribute('position', new THREE.BufferAttribute(new Float32Array((look.segments + 1) * 6), 3));
    strip.setAttribute('aAlong', new THREE.BufferAttribute(new Float32Array(along), 1));
    strip.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(sides), 1));
    strip.setIndex(index);
    jet = new THREE.Mesh(strip, new THREE.ShaderMaterial({vertexShader: JET_VERTEX, fragmentShader: JET_FRAGMENT, transparent: true,
      depthWrite: false, side: THREE.DoubleSide, uniforms: {uFrom: {value: new THREE.Vector3()}, uTo: {value: new THREE.Vector3()},
        uRise: {value: 0}, uNear: {value: look.nearWidth}, uFar: {value: look.farWidth}, uNoise: {value: scrapNoise()}, uClock: {value: 0},
        uLength: {value: 1}, uFlow: {value: look.flow}, uLight: {value: 1}, uColour: {value: water.clone()}}}));
    jet.name = `${name}:jet`; jet.frustumCulled = false; jet.renderOrder = 3;
    const cloud = new THREE.BufferGeometry();
    for (const [key, width] of [['position', 3], ['aSize', 1], ['aColour', 4], ['aCloud', 1]]) {
      const attribute = new THREE.BufferAttribute(new Float32Array(total * width), width);
      attribute.setUsage(THREE.DynamicDrawUsage); cloud.setAttribute(key, attribute);
    }
    points = new THREE.Points(cloud, new THREE.ShaderMaterial({vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT, transparent: true,
      depthWrite: false, uniforms: {uScale: {value: 600}, uNoise: {value: scrapNoise()}}}));
    // Drops come first in the list and stay round; everything after them is a puff with its own raggedness.
    for (let i = look.drops; i < total; i++) cloud.attributes.aCloud.setX(i, .1 + share(i, 51));
    for (let i = look.drops + look.mist; i < look.drops + look.mist + look.runoff; i++) cloud.attributes.aCloud.setX(i, 0);
    points.name = `${name}:spray`; points.frustumCulled = false; points.renderOrder = 4;
    // A point's size is given in metres; the picture's height and the camera's lens turn it into pixels.
    points.onBeforeRender = (renderer, _scene, camera) => {
      points.material.uniforms.uScale.value = renderer.getDrawingBufferSize(size).y * .5 * camera.projectionMatrix.elements[5];
    };
    wet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({vertexShader: WET_VERTEX, fragmentShader: WET_FRAGMENT,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      uniforms: {uNoise: {value: scrapNoise()}, uWet: {value: 0}, uSize: {value: new THREE.Vector2(3.6, 4.8)},
        uCentre: {value: new THREE.Vector2(.5, .72)}, uRuns: {value: 1}, uDark: {value: 1}, uSeed: {value: .37}}}));
    wet.name = `${name}:wet-wall`; wet.scale.set(3.6, 4.8, 1); wet.visible = false; wet.renderOrder = 2;
    group.add(wet, jet, points);
    if (layer !== null) for (const part of [wet, jet, points]) part.layers.set(layer);
  }
  function attach(scene) {
    if (!group) build();
    if (group.parent !== scene) scene.add(group);
    group.visible = true;
  }
  // The seconds of the game's clock since the last frame this stream was given (a slow frame still wets the wall for as
  // long as the water was on it); a clock that runs back (a new race) starts everything again.
  function step(clock) {
    const dt = state.clock === null || clock < state.clock ? 0 : Math.min(2, clock - state.clock);
    if (state.clock !== null && clock < state.clock) { state.wet = 0; state.wetSet = false; state.burstClock = -Infinity; }
    state.clock = clock;
    return dt;
  }
  const arc = (target, s, rise) => target.lerpVectors(from, to, s).setY(target.y + rise * 4 * s * (1 - s));

  // Every soft point, each frame: `jetOn` says whether water is flowing; the cloud of steam and nothing else outlives it.
  function fill(clock, jetOn, wall, heat, rise) {
    const position = points.geometry.attributes.position, sizes = points.geometry.attributes.aSize, colours = points.geometry.attributes.aColour;
    const light = state.light;
    let n = 0;
    const put = (p, metres, tone, alpha) => {
      position.setXYZ(n, p.x, p.y, p.z); sizes.setX(n, alpha > .004 ? metres : 0);
      colours.setXYZW(n, tone.r * light, tone.g * light, tone.b * light, alpha); n++;
    };
    const skip = count => { for (let i = 0; i < count; i++) { sizes.setX(n, 0); n++; } };
    if (jetOn) {
      chord.subVectors(to, from);
      const length = chord.length();
      side.crossVectors(chord, UP).normalize();
      if (!(side.lengthSq() > .5)) side.set(1, 0, 0);
      // Where spray is thrown from where the water lands: off a wall, or back and up off whatever else it hits.
      if (wall) out.set(wall.x, wall.y, wall.z); else out.copy(chord).multiplyScalar(-.25 / Math.max(.01, length)).add(UP).normalize();
      for (let i = 0; i < look.drops; i++) {
        const shed = .15 + .6 * share(i, 1), age = (share(i, 2) + clock * (1 + share(i, 3))) % 1;
        arc(at, Math.min(1, shed + age * (1 - shed) * 1.05), rise);
        at.addScaledVector(side, (share(i, 4) - .5) * 2 * age * (.2 + .7 * share(i, 5)));
        at.y += (share(i, 6) - .35) * age * .6 - (.3 + share(i, 7)) * age * age * 1.1;
        put(at, .05 + .07 * share(i, 8), water, .8 * (1 - age * .55));
      }
      for (let i = 0; i < look.mist; i++) {
        const age = (i / look.mist + clock * 1.6) % 1;
        at.copy(to).addScaledVector(out, .15 + age * 1.1).addScaledVector(side, (share(i, 11) - .5) * 2.2 * age);
        at.y += (share(i, 12) - .3) * 1.4 * age - 1.1 * age * age;
        put(at, .5 + 1.5 * age, water, .3 * (1 - age));
      }
      for (let i = 0; i < look.runoff; i++) {
        const age = (i / look.runoff + clock * 1.25 + share(i, 21)) % 1;
        if (wall) at.copy(to).addScaledVector(out, .08).addScaledVector(side, (share(i, 22) - .5) * 1.7 * (.4 + age)).setY(to.y - age * .3 - age * age * 2.6);
        else at.copy(to).addScaledVector(side, (share(i, 22) - .5) * 2.4 * age).addScaledVector(out, age * .8).setY(to.y + 1.1 * age - 2.4 * age * age);
        put(at, .08 + .06 * share(i, 23), water, .65 * (1 - age));
      }
      const hot = Math.min(1, heat * 2.5);
      for (let i = 0; i < look.steam; i++) {
        const age = (i / look.steam + clock * .5) % 1;
        if (!(hot > 0)) { skip(1); continue; }
        at.copy(to).addScaledVector(out, .5 + age * (.4 + 1.6 * share(i, 32)))
          .addScaledVector(side, (share(i, 31) - .5) * (1.2 + 5 * age) + Math.sin(age * 5 + i) * .5 * age);
        at.y += .3 + age * (2.6 + 3 * share(i, 33));
        put(at, 1.1 + 3.6 * age, steam, hot * .5 * Math.pow(Math.sin(Math.PI * age), .8));
      }
    } else skip(look.drops + look.mist + look.runoff + look.steam);
    // The cloud a fire gives off as it goes out: puffs thrown out and up one after another over the first second, each
    // growing and thinning as it climbs, so that it is never one ball.
    const told = (clock - state.burstClock) / look.burstSeconds;
    for (let i = 0; i < look.burst; i++) {
      const age = Math.min(1, (told - i / look.burst * .28) * 1.3);
      if (!(told >= 0 && told < 1) || age <= 0) { skip(1); continue; }
      const angle = share(i, 41) * Math.PI * 2, reach = .3 + 1.5 * share(i, 43) + age * 3.4 * share(i, 44);
      at.copy(state.burstAt).setY(state.burstAt.y - .6 + 2.2 * share(i, 45) + age * (4 + 4.5 * share(i, 42)));
      at.x += Math.cos(angle) * reach; at.z += Math.sin(angle) * reach;
      put(at, 1 + 1.6 * share(i, 46) + 5 * age, steam, .5 * Math.pow(1 - age, 1.15) * Math.min(1, age * 6));
    }
    position.needsUpdate = true; sizes.needsUpdate = true; colours.needsUpdate = true;
  }
  function showWet() {
    wet.visible = state.wetSet && state.wet > .01;
    wet.material.uniforms.uWet.value = state.wet;
  }
  const burstLive = clock => clock - state.burstClock >= 0 && clock - state.burstClock < look.burstSeconds;

  function draw(scene, start, end, clock = 0, {wall = null, ground = null, heat = 0, light = 1} = {}) {
    attach(scene);
    const dt = step(clock);
    from.set(start.x, start.y, start.z); to.set(end.x, end.y, end.z);
    state.light = light;
    const length = from.distanceTo(to), rise = Math.min(look.maxRise, length * look.rise), uniforms = jet.material.uniforms;
    uniforms.uFrom.value.copy(from); uniforms.uTo.value.copy(to); uniforms.uRise.value = rise; uniforms.uClock.value = clock;
    uniforms.uLength.value = length; uniforms.uLight.value = light;
    jet.visible = true; points.visible = true;
    const onGround = !wall && Number.isFinite(ground);
    if (wall || onGround) {
      // What is under the water darkens; a stream that moves on to another place starts a new patch.
      if (!state.wetSet || state.wetAt.distanceTo(to) > 1.2) { state.wetAt.copy(to); state.wetSet = true; state.wet = Math.min(state.wet, .12); }
      state.wet = Math.min(1, state.wet + dt / look.wetSeconds);
      const patch = wet.material.uniforms;
      if (wall) {
        out.set(wall.x, wall.y, wall.z).normalize();
        basisX.crossVectors(UP, out).normalize(); basisY.crossVectors(out, basisX).normalize();
        wet.quaternion.setFromRotationMatrix(turn.makeBasis(basisX, basisY, out));
        wet.scale.set(3.6, 4.8, 1); patch.uSize.value.set(3.6, 4.8); patch.uCentre.value.set(.5, .72); patch.uRuns.value = 1; patch.uDark.value = 1;
        wet.position.copy(state.wetAt).addScaledVector(out, .08).addScaledVector(basisY, -(.72 - .5) * wet.scale.y);
      } else {
        wet.quaternion.setFromAxisAngle(basisX.set(1, 0, 0), -Math.PI / 2);
        wet.scale.set(5, 5, 1); patch.uSize.value.set(3.4, 3.4); patch.uCentre.value.set(.5, .5); patch.uRuns.value = 0; patch.uDark.value = .62;
        wet.position.set(state.wetAt.x, ground + .05, state.wetAt.z);
      }
    } else state.wet = Math.max(0, state.wet - dt / look.drySeconds);
    showWet();
    fill(clock, true, wall, heat, rise);
  }
  function rest(clock = 0) {
    if (!group) return;
    const dt = step(clock);
    state.wet = Math.max(0, state.wet - dt / look.drySeconds);
    jet.visible = false;
    showWet();
    const live = burstLive(clock);
    if (live) fill(clock, false, null, 0, 0);
    points.visible = live;
    group.visible = live || wet.visible;
  }
  function burst(scene, where, clock = 0, light = 1) {
    attach(scene);
    state.burstAt.set(where.x, where.y, where.z); state.burstClock = clock; state.light = light;
    points.visible = true;
  }
  function hide() { if (group) group.visible = false; state.wet = 0; state.wetSet = false; state.burstClock = -Infinity; }
  function remove() { group?.removeFromParent(); hide(); }
  function dispose() {
    remove();
    for (const part of [jet, points, wet]) { part?.geometry.dispose(); part?.material.dispose(); }
    group = jet = points = wet = null;
  }
  return {draw, rest, burst, hide, remove, dispose, get mesh() { return group; }, get wetness() { return state.wet; }};
}
