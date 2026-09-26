import assert from 'node:assert/strict';
import test from 'node:test';
import {PerspectiveCamera, Vector3} from 'three';
import {onFootCameraPose} from '../src/onfoot-camera.js';
import {applyFootLook, footMoveDirection} from '../src/onfoot.js';

// Kyle, 25 September 2026: on foot, the controls felt backwards. Judge every
// direction the way a player does: through the first-person camera on screen.
const flat = {nearest: () => ({s: 0, lateral: 0}), groundAt: () => ({y: -100})};

function screenX(fighter, point) {
  const pose = onFootCameraPose(flat, fighter);
  const camera = new PerspectiveCamera(pose.fov, 16 / 9, .1, 1000);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  return new Vector3(point.x, pose.position.y, point.z).project(camera).x;
}

for (const yaw of [0, 1.1, -2.3, Math.PI]) {
  test(`at yaw ${yaw}: D moves right on screen, A left, and the mouse turns the same way`, () => {
    const at = {x: 0, y: 0, z: 0, yaw, pitch: 0};
    const forward = {x: Math.sin(yaw) * 5, z: Math.cos(yaw) * 5};
    const offset = input => {
      const moved = footMoveDirection(yaw, input);
      return {x: forward.x + moved.x, z: forward.z + moved.z};
    };
    assert.ok(screenX(at, offset({right: true})) > .05, 'D moves the fighter to the right of the screen');
    assert.ok(screenX(at, offset({left: true})) < -.05, 'A moves the fighter to the left of the screen');
    const turned = {...at};
    applyFootLook(turned, {lookX: 90, lookY: 0});
    const view = {x: Math.sin(turned.yaw) * 8, z: Math.cos(turned.yaw) * 8};
    assert.ok(screenX(at, view) > .05, 'moving the mouse right turns the view to the right');
    const up = {...at};
    applyFootLook(up, {lookX: 0, lookY: -40});
    assert.ok(up.pitch > 0, 'moving the mouse up looks up');
  });
}
