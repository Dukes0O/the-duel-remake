import * as THREE from 'three';
import { constrainTunnelCamera } from './camera-clearance.js';

export const REAR_VIEW_FAR = 220;
export const REAR_VIEW_INTERVAL_MS = 1000 / 30;
export const rearViewActive = state => ['countdown', 'racing', 'crashed', 'ticket'].includes(state?.status);

// CSS owns the frame placement; WebGL uses the same measured interior. The
// rectangle is clipped in logical canvas pixels, not device-resolution pixels.
export function rearViewRect(canvas, frame) {
  const left = Math.max(0, Math.floor(frame.left - canvas.left)), top = Math.max(0, Math.floor(frame.top - canvas.top));
  const right = Math.min(Math.floor(canvas.width), Math.floor(frame.left - canvas.left + frame.width));
  const bottom = Math.min(Math.floor(canvas.height), Math.floor(frame.top - canvas.top + frame.height));
  const width = Math.max(0, right - left), height = Math.max(0, bottom - top);
  return { x: left, y: Math.max(0, Math.floor(canvas.height) - top - height), width, height };
}

const forward = new THREE.Vector3(), target = new THREE.Vector3();
export function poseRearView(camera, player, course, state) {
  const eyeHeight = Math.max(1.04, (player.userData.size?.height || 1.3) * .80);
  camera.position.copy(player.position); camera.position.y += eyeHeight;
  // Read the real car heading, including sideways/reverse driving, not the
  // centreline direction. Keep the horizon upright while following road pitch.
  forward.set(0, 0, -1).applyQuaternion(player.quaternion);
  forward.y = THREE.MathUtils.clamp(forward.y, -.75, .75); forward.normalize();
  constrainTunnelCamera(course, camera.position, state.s);
  target.copy(camera.position).addScaledVector(forward, 80); target.y -= .35;
  camera.up.set(0, 1, 0); camera.lookAt(target); camera.updateMatrixWorld();
}

// One reusable low-resolution target gives correct left/right reflection. A
// scissored screen quad presents it without another canvas, shadow pass, AO or
// bloom. Refresh at most 30Hz; the main scene keeps its normal frame rate.
export function createRearView({ renderer, scene, host }) {
  const frame = document.createElement('div'); frame.className = 'rear-view-frame';
  frame.setAttribute('role', 'img'); frame.setAttribute('aria-label', 'Rear-view mirror'); frame.hidden = true;
  const label = document.createElement('span'); label.textContent = 'REAR VIEW'; frame.append(label); host.append(frame);
  const camera = new THREE.PerspectiveCamera(29, 3.2, .15, REAR_VIEW_FAR);
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false });
  renderTarget.texture.name = 'Rear-view mirror';
  const geometry = new THREE.PlaneGeometry(2, 2), uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  const material = new THREE.MeshBasicMaterial({ map: renderTarget.texture, depthTest: false, depthWrite: false, toneMapped: true });
  const screen = new THREE.Scene(), quad = new THREE.Mesh(geometry, material), screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  screenCamera.position.z = 1; quad.frustumCulled = false; screen.add(quad);
  const viewport = new THREE.Vector4(), scissor = new THREE.Vector4();
  let rectangle = null, dirty = true, previousCourse = null, previousPlayer = null, lastRefresh = -Infinity, disposed = false;
  function hide() {
    frame.hidden = true; host.dataset.rearView = 'off'; dirty = true;
  }
  function measure() {
    const canvas = renderer.domElement.getBoundingClientRect(), box = frame.getBoundingClientRect();
    rectangle = rearViewRect(canvas, { left: box.left + frame.clientLeft, top: box.top + frame.clientTop, width: frame.clientWidth, height: frame.clientHeight });
    if (!rectangle.width || !rectangle.height) return false;
    const width = Math.min(320, rectangle.width), height = Math.max(1, Math.round(width * rectangle.height / rectangle.width));
    if (renderTarget.width !== width || renderTarget.height !== height) renderTarget.setSize(width, height);
    camera.aspect = rectangle.width / rectangle.height; camera.updateProjectionMatrix();
    host.dataset.rearViewResolution = `${width}x${height}`;
    return true;
  }
  return {
    camera, frame, hide,
    resize() { dirty = true; },
    render({ state, player, course, now = performance.now() }) {
      if (disposed) return false;
      if (!rearViewActive(state) || !player || !course) { hide(); return false; }
      if (frame.hidden) { frame.hidden = false; dirty = true; }
      if (previousCourse !== course || previousPlayer !== player) { previousCourse = course; previousPlayer = player; dirty = true; }
      if (dirty && !measure()) { host.dataset.rearView = 'unavailable'; return false; }
      const refresh = dirty || !state.paused && now - lastRefresh >= REAR_VIEW_INTERVAL_MS;
      const previousTarget = renderer.getRenderTarget(), scissorTest = renderer.getScissorTest(), autoClear = renderer.autoClear;
      const shadowAuto = renderer.shadowMap.autoUpdate, shadowNeeds = renderer.shadowMap.needsUpdate, visible = player.visible;
      const background = scene.background, fog = scene.fog, near = fog?.near, far = fog?.far;
      renderer.getViewport(viewport); renderer.getScissor(scissor);
      const startedCalls = renderer.info.render.calls;
      try {
        renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
        if (refresh) {
          poseRearView(camera, player, course, state);
          player.visible = false;
          // The far sky dome is deliberately outside the short mirror frustum.
          // Fog-coloured background and a short fade avoid a black horizon.
          if (fog?.color) scene.background = fog.color;
          if (fog?.isFog) { fog.near = 95; fog.far = REAR_VIEW_FAR - 10; }
          renderer.setRenderTarget(renderTarget); renderer.setScissorTest(false);
          renderer.clear(true, true, true); renderer.render(scene, camera);
          lastRefresh = now; dirty = false;
        }
        renderer.setRenderTarget(null); renderer.setViewport(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        renderer.setScissor(rectangle.x, rectangle.y, rectangle.width, rectangle.height); renderer.setScissorTest(true);
        renderer.clearDepth(); renderer.render(screen, screenCamera);
        host.dataset.rearView = 'ready'; host.dataset.rearViewDrawCalls = String(renderer.info.render.calls - startedCalls);
        host.dataset.rearViewRefreshed = String(refresh);
        return true;
      } finally {
        player.visible = visible; scene.background = background;
        if (fog?.isFog) { fog.near = near; fog.far = far; }
        renderer.autoClear = autoClear; renderer.shadowMap.autoUpdate = shadowAuto; renderer.shadowMap.needsUpdate = shadowNeeds;
        renderer.setRenderTarget(previousTarget); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
      }
    },
    dispose() {
      if (disposed) return; disposed = true; hide(); frame.remove();
      geometry.dispose(); material.dispose(); renderTarget.dispose(); screen.clear();
    },
  };
}
