// Yard machines are solid to each other. Each one is its model's plan outline, turned with the machine,
// and the contact test is the game's own oriented-box sweep, so a machine meets another as a car meets a wall.
import {sweepObstacle} from '../collision.js';
import {machineDefinition} from './content/machines.js';

/** The machine's footprint in the yard: a turned box centred on the outline, not on the machine's own place. */
export function machineFootprint(id, machine) {
  const outline = machineDefinition(id).footprint;
  if (!outline) throw new RangeError(`The ${id} has no footprint.`);
  const heading = machine.heading ?? 0, c = Math.cos(heading), s = Math.sin(heading);
  const localX = (outline.minX + outline.maxX) / 2, localZ = (outline.minZ + outline.maxZ) / 2;
  return {id, x:machine.x + localX * c + localZ * s, z:machine.z + localZ * c - localX * s, heading,
    halfX:(outline.maxX - outline.minX) / 2, halfZ:(outline.maxZ - outline.minZ) / 2};
}

/** How far one footprint is pressed into another, in metres; zero when they do not touch. */
export function footprintOverlap(a, b) {
  const centre = {x:a.x, z:a.z};
  const hit = sweepObstacle(centre, centre, {...b, exactCarCorners:true}, a.heading,
    {halfWidth:a.halfX, halfLength:a.halfZ});
  return hit?.inside ? hit.penetration : 0;
}

/**
 * The solid a machine's move would push into, or null. A move that starts clear must stay clear; a machine
 * that already overlaps another (placed there, never driven there) may move only so the overlap shrinks.
 */
export function machineMoveContact(id, before, after, solids = []) {
  const from = machineFootprint(id, before), to = machineFootprint(id, after);
  for (const solid of solids) {
    const pressed = footprintOverlap(to, solid);
    if (pressed > 1e-9 && pressed > footprintOverlap(from, solid) - 1e-9) return solid;
  }
  return null;
}

/** Controls that hold a machine still while keeping its work controls, used for the step it is stopped in. */
export function stoppedControls(controls = {}) {
  return {...controls, forward:0, steer:0, leftTrack:0, rightTrack:0};
}
