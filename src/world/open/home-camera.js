// HOME-GROUND-1: the view from straight above the player's ground (docs/HOME_GROUND.md, section 6). The renderer calls
// this with the walker's own camera pose and how far the lift has gone (0 on his shoulders, 1 straight above); it reads
// nothing of the race and changes nothing.
import {HOME_VIEW} from './content/home-ground.js';
import {groundCentre} from './home-rule.js';

const ease = t => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

// The lift goes from 0 to 1 in HOME_VIEW.liftSeconds and back the same way.
export function stepHomeLift(lift, above, dt) {
  const step = Math.max(0, dt) / HOME_VIEW.liftSeconds;
  return above ? Math.min(1, lift + step) : Math.max(0, lift - step);
}

export function homeBuildCameraPose(pose) {
  const dx = pose.target.x - pose.position.x, dz = pose.target.z - pose.position.z;
  const horizontal = Math.hypot(dx, dz), dy = pose.target.y - pose.position.y;
  const reach = Math.hypot(horizontal, dy), pitch = Math.atan2(dy, horizontal) - Math.PI / 12;
  if (!horizontal) return pose;
  return {...pose, target: {x: pose.position.x + dx / horizontal * Math.cos(pitch) * reach,
    y: pose.position.y + Math.sin(pitch) * reach, z: pose.position.z + dz / horizontal * Math.cos(pitch) * reach}};
}

// North is at the top of the screen, as on the map: the camera looks down with a hair of tilt toward the north, so that
// its up is never the same as the way it looks.
export function homeCameraPose(footPose, lift, groundHeight = 0) {
  const t = ease(Math.max(0, Math.min(1, lift)));
  const centre = groundCentre();
  const top = {position: {x: centre.x, y: groundHeight + HOME_VIEW.height, z: centre.z + .02},
    target: {x: centre.x, y: groundHeight, z: centre.z}};
  const pick = key => ({x: mix(footPose[key].x, top[key].x, t), y: mix(footPose[key].y, top[key].y, t), z: mix(footPose[key].z, top[key].z, t)});
  return {position: pick('position'), target: pick('target'), fov: mix(footPose.fov, HOME_VIEW.fov, t)};
}
