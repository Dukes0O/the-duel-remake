// Pure placement shared by the Pacific view and the actual Deep ramp.
import { DRIVE } from './config.js';

const SEA = -15;
export const isPacificCoast = course => course.def.id === 'pacific-canyon';

// Visual-only sea stacks remain beyond both main-road and shortcut recovery
// corridors. No seeded Course RNG, feature list, collider or route is changed.
export function buildPacificRockLayout(course) {
  if (!isPacificCoast(course)) return [];
  const coast = course.sections.find(section => section.theme === 'coast');
  if (!coast) return [];
  const anchors = [.17, .28, .40, .50, .555, .615, .71, .80, .875];
  const entries = [];
  for (let index = 0; index < anchors.length; index++) {
    const prominent = [1, 2, 3, 4, 6, 8].includes(index);
    for (let fragment = 0; fragment < 3; fragment++) {
      const s = coast.start + (coast.end - coast.start) * anchors[index] + (fragment - 1) * 15;
      const halfX = fragment === 0 ? prominent ? 16 : 13 : fragment === 1 ? 9 : 5;
      const halfZ = fragment === 0 ? prominent ? 32 : 22 : fragment === 1 ? 16 : 9;
      const radius = Math.hypot(halfX, halfZ) * 1.08;
      let off = 99 + fragment * 24 + 8 * Math.sin(index * 2.1), point;
      for (let attempt = 0; attempt < 18; attempt++, off += 6) {
        point = course.groundAt(s, off);
        if (offshoreClearance(course, point.x, point.z, radius)) break;
        point = null;
      }
      if (!point) continue;
      const heading = point.heading + .18 * Math.sin(index * 2.3 + fragment);
      let floor = Math.min(SEA - 4, point.y);
      for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2;
        const x = point.x + Math.cos(angle) * radius, z = point.z + Math.sin(angle) * radius;
        const nearest = course.nearest(x, z);
        floor = Math.min(floor, course.groundAt(nearest.s, nearest.lateral).y);
      }
      // The first pass used sea-relative tips hidden below the grassy road
      // shoulder. Main cliffs now rise above the adjacent road's elevation;
      // only the smaller skerries retain low, tide-level silhouettes.
      const roadHeight = course.at(s).y;
      const headlandTop = roadHeight + (prominent ? 18 : 3) + 4.5 * Math.sin(index * 1.7);
      const top = fragment === 0 ? headlandTop : fragment === 1 ? headlandTop - 13 : SEA + 3.8 + Math.sin(index * 1.7);
      entries.push({ s, off, x: point.x, z: point.z, heading, halfX, halfZ, radius, bottom: floor - 5, top, variant: (index * 2 + fragment) % 6, prominent: prominent && fragment === 0 });
    }
  }
  return entries;
}

export function offshoreClearance(course, x, z, radius = 0) {
  const nearest = course.nearest(x, z);
  if (nearest.distance - radius <= DRIVE.boundaryReset + 4) return false;
  for (const cut of course.features.shortcuts) {
    for (let s = cut.start; s <= cut.end; s += 12) {
      const point = course.worldAt(s, course.shortcutOffset(cut, s));
      // Half the sampling step is added to cover points between samples.
      if (Math.hypot(x - point.x, z - point.z) - radius <= cut.halfWidth + 40) return false;
    }
  }
  return true;
}

