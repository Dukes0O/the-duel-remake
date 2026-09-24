import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRearView, rearViewActive, rearViewRect, poseRearView, REAR_VIEW_FAR, REAR_VIEW_INTERVAL_MS } from '../src/rear-view.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const near = (a, b, tolerance, label) => ok(Math.abs(a - b) < tolerance, `${label}: ${a}/${b}`);
for (const status of ['countdown', 'racing', 'crashed', 'ticket']) ok(rearViewActive({ status }), `${status}: mirror visible`);
for (const status of ['menu', 'results', 'gameover', 'finished', undefined]) ok(!rearViewActive({ status }), `${status}: mirror hidden`);
ok(!rearViewActive({ status: 'racing', onFoot: true }), 'Walking hides the mirror and skips its render pass');
equal(rearViewRect({ left: 20, top: 10, width: 1280, height: 720 }, { left: 1020, top: 110, width: 256, height: 80 }), { x: 1000, y: 540, width: 256, height: 80 }, 'Frame and canvas offsets align');
equal(rearViewRect({ left: 0, top: 0, width: 100, height: 60 }, { left: -20, top: -10, width: 80, height: 40 }), { x: 0, y: 30, width: 60, height: 30 }, 'Small viewport safely clips negative edges');
equal(rearViewRect({ left: 0, top: 0, width: 100, height: 60 }, { left: 80, top: 45, width: 80, height: 40 }), { x: 80, y: 0, width: 20, height: 15 }, 'Small viewport safely clips far edges');
const course = { features: { tunnels: [] } }, state = { status: 'racing', s: 30 }, player = new THREE.Group();
player.userData.size = { height: 1.25 }; player.position.set(10, 3, 20); player.rotation.order = 'YXZ';
const camera = new THREE.PerspectiveCamera(29, 3.2, .15, REAR_VIEW_FAR), direction = new THREE.Vector3();
for (const yaw of [0, .7, Math.PI, -Math.PI / 2]) {
  player.rotation.set(0, yaw, 0, 'YXZ'); poseRearView(camera, player, course, state); camera.getWorldDirection(direction);
  near(direction.x, -Math.sin(yaw), .001, 'Rear camera follows actual heading X'); near(direction.z, -Math.cos(yaw), .001, 'Rear camera follows actual heading Z');
  near(camera.position.y, player.position.y + 1.04, .00001, 'Low car mirror eye position');
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const behind = camera.position.clone().addScaledVector(direction, 40), ahead = camera.position.clone().addScaledVector(direction, -40);
  ok(frustum.containsPoint(behind) && !frustum.containsPoint(ahead), 'Mirror genuinely sees behind and culls ahead');
  ok(!frustum.containsPoint(camera.position.clone().addScaledVector(direction, REAR_VIEW_FAR + 20)), 'Short rear frustum culls distant geometry');
}
player.rotation.set(-.3, .7, 0, 'YXZ'); poseRearView(camera, player, course, state); camera.getWorldDirection(direction); ok(direction.y < -.25, 'Rear view looks down a hill the car is climbing');
player.userData.size.height = 3.6; poseRearView(camera, player, course, state); near(camera.position.y, 5.88, .00001, 'Monster truck eye is higher');
const tunnel = { features: { tunnels: [{}] }, nearest: () => ({ s: 30, lateral: 0 }), tunnelAt: () => ({ width: 7, height: 4 }), at: () => ({ y: 0 }) };
poseRearView(camera, player, tunnel, state); ok(camera.position.y <= 3.55, 'Mirror cannot look through a low tunnel roof');

const originalDocument = globalThis.document, children = [];
const element = tag => ({ tag, hidden: false, attributes: {}, children: [], clientLeft: 2, clientTop: 2, clientWidth: 256, clientHeight: 80,
  setAttribute(k, v) { this.attributes[k] = v; }, append(child) { this.children.push(child); }, remove() { this.removed = true; }, getBoundingClientRect() { return { left: 980, top: 90, width: 260, height: 84 }; } });
globalThis.document = { createElement: element };
try {
  const host = { dataset: {}, append(child) { children.push(child); } }, scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xaabbcc, 260, 1650); scene.background = new THREE.Color(0x123456);
  player.rotation.set(0, 0, 0, 'YXZ'); player.userData.size.height = 1.25; player.visible = true; scene.add(player);
  const initialBackground = scene.background, initialTarget = { original: true }, calls = [];
  let activeTarget = initialTarget, viewport = new THREE.Vector4(3, 4, 1280, 720), scissor = new THREE.Vector4(1, 2, 1278, 718), scissorTest = false, failScene = false;
  const renderer = {
    domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) },
    shadowMap: { autoUpdate: true, needsUpdate: true }, autoClear: true, info: { render: { calls: 0 } },
    getRenderTarget: () => activeTarget, setRenderTarget(value) { activeTarget = value; },
    getViewport: target => target.copy(viewport), setViewport(...args) { viewport = args[0]?.isVector4 ? args[0].clone() : new THREE.Vector4(...args); },
    getScissor: target => target.copy(scissor), setScissor(...args) { scissor = args[0]?.isVector4 ? args[0].clone() : new THREE.Vector4(...args); },
    getScissorTest: () => scissorTest, setScissorTest(value) { scissorTest = value; }, clear() {}, clearDepth() {},
    render(rendered, renderedCamera) {
      this.info.render.calls++;
      calls.push({ scene: rendered, camera: renderedCamera, target: activeTarget, playerVisible: player.visible, shadowAuto: this.shadowMap.autoUpdate, shadowNeeds: this.shadowMap.needsUpdate, near: scene.fog.near, far: scene.fog.far, viewport: viewport.clone(), scissor: scissor.clone(), scissorTest });
      if (rendered === scene && failScene) throw new Error('Mirror draw failed');
    },
  };
  const originalViewport = viewport.clone(), originalScissor = scissor.clone(), rear = createRearView({ renderer, scene, host });
  ok(rear.frame.hidden && rear.frame.attributes['aria-label'] === 'Rear-view mirror', 'Accessible frame begins hidden');
  const stateSnapshot = JSON.stringify(state), playerSnapshot = player.position.toArray();
  ok(rear.render({ state, player, course, now: 0 }), 'First racing frame draws mirror');
  equal(calls.length, 2, 'One rear scene plus one presentation quad');
  ok(calls[0].scene === scene && calls[0].camera === rear.camera && calls[0].target.isWebGLRenderTarget, 'Actual game scene renders to reusable target');
  equal([calls[0].target.width, calls[0].target.height], [256, 80], 'Small CSS-sized target ignores high-DPI overhead');
  ok(!calls[0].playerVisible && !calls[0].shadowAuto && !calls[0].shadowNeeds, 'Rear pass hides own car and never regenerates shadow maps');
  equal([calls[0].near, calls[0].far], [95, 210], 'Rear fade ends inside the bounded view');
  ok(calls[1].target === null && calls[1].scissorTest, 'Mirror is drawn only into a scissored canvas area');
  equal(calls[1].viewport.toArray(), [982, 548, 256, 80], 'WebGL viewport matches frame interior');
  equal(calls[1].scissor.toArray(), calls[1].viewport.toArray(), 'Scissor prevents erasing main scene');
  const quad = calls[1].scene.children[0], uvs = quad.geometry.attributes.uv;
  equal(Array.from(uvs.array), [1, 1, 0, 1, 1, 0, 0, 0], 'Horizontal reflection—not an unmirrored reversing camera');
  ok(quad.material.toneMapped && !quad.material.depthWrite && !quad.material.depthTest, 'Mirror uses display tone mapping without depth pollution');
  const restored = () => {
    ok(activeTarget === initialTarget && viewport.equals(originalViewport) && scissor.equals(originalScissor) && !scissorTest, 'Render target, viewport and scissor restored');
    ok(renderer.autoClear && renderer.shadowMap.autoUpdate && renderer.shadowMap.needsUpdate, 'Main renderer clear/shadow flags restored');
    ok(player.visible && scene.background === initialBackground && scene.fog.near === 260 && scene.fog.far === 1650, 'Main scene visibility, sky and fog restored');
  };
  restored(); equal(JSON.stringify(state), stateSnapshot, 'Mirror never writes gameplay state'); equal(player.position.toArray(), playerSnapshot, 'Mirror never moves player');
  rear.render({ state, player, course, now: 10 }); equal(calls.length, 3, 'Intervening frame reuses target and only presents quad');
  rear.render({ state, player, course, now: REAR_VIEW_INTERVAL_MS + 1 }); equal(calls.length, 5, 'Rear scene refreshes at 30Hz');
  rear.render({ state: { ...state, paused: true }, player, course, now: 200 }); equal(calls.length, 6, 'Pause retains image without scene rendering');
  rear.resize(); rear.render({ state: { ...state, paused: true }, player, course, now: 220 }); equal(calls.length, 8, 'Resize refreshes once even while paused');
  rear.render({ state: { status: 'menu' }, player, course, now: 240 }); equal(calls.length, 8, 'Menu adds no mirror render'); ok(rear.frame.hidden && host.dataset.rearView === 'off', 'Menu frame hidden');
  rear.render({ state, player, course, now: 250 }); equal(calls.length, 10, 'Return from menu refreshes immediately');
  const changedCourse = { features: { tunnels: [] } }; rear.render({ state, player, course: changedCourse, now: 251 }); equal(calls.length, 12, 'Stage change cannot display stale road');
  failScene = true; rear.resize(); assert.throws(() => rear.render({ state, player, course, now: 300 }), /Mirror draw failed/); checks++; restored(); failScene = false;
  let targetDisposed = 0, geometryDisposed = 0, materialDisposed = 0;
  calls[0].target.addEventListener('dispose', () => targetDisposed++); quad.geometry.addEventListener('dispose', () => geometryDisposed++); quad.material.addEventListener('dispose', () => materialDisposed++);
  rear.dispose(); rear.dispose(); equal([targetDisposed, geometryDisposed, materialDisposed], [1, 1, 1], 'All mirror GPU resources release exactly once');
  ok(rear.frame.removed && rear.frame.hidden, 'Mirror DOM is removed on disposal'); ok(!rear.render({ state, player, course, now: 500 }), 'Disposed mirror cannot render');
} finally { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; }
console.log(`Rear-view mirror: ${checks} checks; real rear frustum, reflected sides, 30Hz caching, bounded target, clear/shadow/state isolation, restart/resize and exact disposal.`);
