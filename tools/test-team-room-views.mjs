// Team Room pictures (Kyle, 11 October 2026): every flag on every closed event
// and route is photographed from above and behind, like the race camera pulled
// up. This check works out each camera from the real road, with no graphics, and
// proves that the corner (or the feature) is in frame and not hidden by the road.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {buildTrackDossier, cornerId, trackSnapshotPose, SNAPSHOT_FOV, SNAPSHOT_UP, SNAPSHOT_CHASE} from '../src/track-analysis.js';
import {referenceLap} from '../src/reference-laps.js';
import {referenceTargets} from './build-reference-laps.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const ASPECT = 16 / 9;
const wrap = (value, length) => ((value % length) + length) % length;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const length = Math.hypot(...a); return a.map(value => value / length); };

// Where a world point lands in the picture: x and y from -1 to 1 are inside the frame.
function framing(pose, point) {
  const eye = [pose.position.x, pose.position.y, pose.position.z];
  const forward = unit(sub([pose.target.x, pose.target.y, pose.target.z], eye));
  const right = unit(cross(forward, [0, 1, 0])), up = cross(right, forward);
  const offset = sub(point, eye), depth = dot(offset, forward), tangent = Math.tan(SNAPSHOT_FOV * Math.PI / 360);
  return {depth, x: dot(offset, right) / depth / (tangent * ASPECT), y: dot(offset, up) / depth / tangent};
}

const pointAt = (course, s) => { const road = course.at(wrap(s, course.length)), ground = course.groundAt(wrap(s, course.length), 0); return [road.x, ground.y, road.z]; };

// The road itself must not rise between the eye and the feature and hide it.
function roadBlocksView(course, pose, featureS) {
  const eye = [pose.position.x, pose.position.y, pose.position.z], feature = pointAt(course, featureS);
  const steps = Math.max(2, Math.ceil(wrap(featureS - pose.s, course.length) / 4));
  for (let i = 1; i < steps; i++) {
    const s = pose.s + wrap(featureS - pose.s, course.length) * i / steps;
    const ground = pointAt(course, s), along = Math.hypot(ground[0] - eye[0], ground[2] - eye[2]);
    const total = Math.hypot(feature[0] - eye[0], feature[2] - eye[2]);
    const sight = eye[1] + (feature[1] - eye[1]) * Math.min(1, along / Math.max(total, 1e-6));
    if (ground[1] > sight + .3) return true;
  }
  return false;
}

// Dossiers use published references for the installed road. A slotted dev
// replacement gets its reference and dossier checks in C3.
const definitions = [...new Map([...ALL_CIRCUITS, ...COURSE].map(entry => [entry.id, entry])).values()];
let flagCount = 0, cornerCount = 0;
const problems = [];
for (const target of referenceTargets(definitions)) {
  const definition = definitions.find(entry => entry.id === target.eventId);
  const reference = referenceLap(target.eventId, target.route);
  check(reference, `${target.key} has a reference lap`);
  const course = new Course(definition, reference.seed);
  const dossier = buildTrackDossier(course, {route: target.route, reference});
  const corners = new Map(dossier.analysis.corners.map(corner => [cornerId(corner), corner]));
  for (const flag of dossier.flags) {
    flagCount++;
    const label = `${target.key}/${flag.id}`;
    const pose = trackSnapshotPose(course, flag);
    const eyeGround = course.groundAt(pose.s, 0).y, roof = course.tunnelAt?.(pose.s)?.height;
    const wanted = eyeGround + (roof ? Math.min(flag.camera.up, roof - 1.5) : flag.camera.up);
    check(Math.abs(pose.position.y - wanted) < 1e-9 || (!roof && pose.position.y > wanted && pose.position.y - eyeGround < 20),
      `${label}: eye stands ${flag.camera.up} m above the road (lower inside a tunnel, higher where another road passes close by)`);
    if (roof) check(pose.position.y - eyeGround < roof, `${label}: camera stays under the tunnel roof`);
    check(flag.camera.up >= 8 && flag.camera.up <= 10, `${label}: camera is 8 to 10 m up`);
    check(Math.abs(wrap(flag.snapshotS - pose.s, course.length) - SNAPSHOT_CHASE) < 1e-9, `${label}: camera is ${SNAPSHOT_CHASE} m behind its viewing point`);
    // A flag that stands for a corner is judged at that corner's real apex; an authored flag may stand earlier on the road.
    const apexS = corners.get(flag.id)?.apexS ?? flag.s;
    const feature = framing(pose, pointAt(course, apexS));
    const fail = text => problems.push(`${label}: ${text}`);
    if (!(feature.depth > 5 && Math.abs(feature.x) <= .75 && Math.abs(feature.y) <= .75)) fail(`feature is out of frame or too near (depth ${feature.depth.toFixed(0)}, x ${feature.x.toFixed(2)}, y ${feature.y.toFixed(2)})`);
    if (roadBlocksView(course, pose, flag.kind === 'crest' ? apexS - 1 : apexS)) fail('the road hides the feature');
    if (flag.kind === 'corner') {
      cornerCount++;
      const exit = framing(pose, pointAt(course, apexS + 20));
      if (!(exit.depth > 5 && Math.abs(exit.x) <= 1.1 && Math.abs(exit.y) <= 1)) fail(`road leaving the corner is out of frame (x ${exit.x.toFixed(2)}, y ${exit.y.toFixed(2)})`);
    }
    // A written camera belongs to the author (Skyline on Panorama Ridge looks over a crest, not at a bend).
    if (corners.has(flag.id) && !dossier.intel.flags.some(item => item.id === flag.id && Object.keys(item.camera ?? {}).length)) {
      check(Math.abs(wrap(apexS - flag.snapshotS, course.length) - flag.camera.ahead) < 1e-6, `${label}: corner view is aimed at its apex`);
      check(wrap(apexS - flag.snapshotS, course.length) <= 60 + 1e-6, `${label}: corner is no further than 60 m from the viewing point`);
    }
  }
}
assert.deepEqual(problems, [], `Team Room views that do not show their feature:\n${problems.join('\n')}`);
console.log(`Team Room views: ${checks} checks, ${flagCount} flags (${cornerCount} corners) on ${referenceTargets(definitions).length} event/routes, all in frame from above.`);
