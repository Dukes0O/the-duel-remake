const finite = value => Number.isFinite(value);
const vec = value => Array.isArray(value) && value.length === 3 && value.every(finite);
const identity = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const add = (a, b) => a.map((value, index) => value + b[index]);
const multiply = (a, b) => a.map(row => b[0].map((_, column) => row.reduce((sum, value, index) => sum + value * b[index][column], 0)));
const apply = (matrix, value) => matrix.map(row => row.reduce((sum, entry, index) => sum + entry * value[index], 0));

function axisRotation(axis, angle) {
  const length = Math.hypot(...axis);
  const [x, y, z] = axis.map(value => value / length);
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [[t*x*x+c, t*x*y-s*z, t*x*z+s*y],
    [t*x*y+s*z, t*y*y+c, t*y*z-s*x],
    [t*x*z-s*y, t*y*z+s*x, t*z*z+c]];
}

/** Solve named, parented joints into world-space poses. All distances are metres. */
export function forwardKinematics(joints, angles = {}, tool = null) {
  if (!Array.isArray(joints)) throw new TypeError('Machine joints must be an array.');
  const byName = new Map(), poses = {};
  for (const joint of joints) {
    if (!joint || typeof joint.name !== 'string' || byName.has(joint.name) ||
        (joint.parent != null && !byName.has(joint.parent)) || !vec(joint.origin) || !vec(joint.axis) ||
        Math.hypot(...joint.axis) === 0 || !Array.isArray(joint.limits) || joint.limits.length !== 2 ||
        !joint.limits.every(finite)) throw new TypeError('Machine joints need unique names, ordered parents, vectors and finite limits.');
    const parent = joint.parent == null ? {position:[0,0,0], rotation:identity()} : poses[joint.parent];
    const position = add(parent.position, apply(parent.rotation, joint.origin));
    const angle = Math.max(joint.limits[0], Math.min(joint.limits[1], finite(angles[joint.name]) ? angles[joint.name] : 0));
    const rotation = multiply(parent.rotation, axisRotation(joint.axis, angle));
    poses[joint.name] = {position, rotation, angle};
    byName.set(joint.name, joint);
  }
  if (!tool) return poses;
  const pose = tool.joint == null ? {position:[0,0,0], rotation:identity()} : poses[tool.joint];
  if (!pose || !vec(tool.offset ?? [0,0,0])) throw new TypeError('Machine tool must name a joint and a three-dimensional offset.');
  return {...poses, toolPosition:add(pose.position, apply(pose.rotation, tool.offset ?? [0,0,0]))};
}

export function clampJointAngle(joint, angle) {
  if (!joint || !Array.isArray(joint.limits) || !finite(angle)) throw new TypeError('A joint and a finite angle are required.');
  return Math.max(joint.limits[0], Math.min(joint.limits[1], angle));
}
