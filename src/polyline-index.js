// Exact nearest-segment queries for static {x,z} point arrays. Segment i joins
// points[i-1] to points[i]; there is no implicit closing segment. Coordinates
// are copied at construction, and callers' points are never sorted or changed.
export function createPolylineIndex(points) {
  if (!Array.isArray(points)) throw new TypeError('Polyline points must be an array.');
  const coordinates = points.map(point => {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) throw new TypeError('Polyline coordinates must be finite numbers.');
    return { x: point.x, z: point.z };
  });
  const segments = [];
  for (let index = 1; index < coordinates.length; index++) {
    const a = coordinates[index - 1], b = coordinates[index], dx = b.x - a.x, dz = b.z - a.z;
    segments.push({ index, x: a.x, z: a.z, dx, dz, lengthSq: dx * dx + dz * dz,
      minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z),
      centerX: a.x * .5 + b.x * .5, centerZ: a.z * .5 + b.z * .5 });
  }
  function build(items) {
    if (!items.length) return null;
    const node = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, firstIndex: Infinity };
    for (const segment of items) {
      node.minX = Math.min(node.minX, segment.minX); node.maxX = Math.max(node.maxX, segment.maxX);
      node.minZ = Math.min(node.minZ, segment.minZ); node.maxZ = Math.max(node.maxZ, segment.maxZ);
      node.firstIndex = Math.min(node.firstIndex, segment.index);
    }
    node.maxAbsX = Math.max(Math.abs(node.minX), Math.abs(node.maxX));
    node.maxAbsZ = Math.max(Math.abs(node.minZ), Math.abs(node.maxZ));
    if (items.length <= 8) { node.segments = items; return node; }
    const axis = node.maxX - node.minX >= node.maxZ - node.minZ ? 'centerX' : 'centerZ';
    items.sort((a, b) => a[axis] - b[axis] || a.index - b.index);
    const middle = Math.floor(items.length / 2);
    node.left = build(items.slice(0, middle)); node.right = build(items.slice(middle));
    return node;
  }
  const root = build(segments);
  function query(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Polyline query coordinates must be finite numbers.');
    let bestIndex = -1, bestT = 0, bestDistanceSq = Infinity;
    const absX = Math.abs(x), absZ = Math.abs(z);
    function lowerBound(node) {
      // The legacy residual is evaluated as x-a-t*dx rather than x-(a+t*dx).
      // Pad its box bound for those floating-point operations, including far
      // queries. Padding only visits extra nodes; it never changes distances.
      const padX = (absX + node.maxAbsX) * Number.EPSILON * 16;
      const padZ = (absZ + node.maxAbsZ) * Number.EPSILON * 16;
      const dx = Math.max(0, node.minX - x - padX, x - node.maxX - padX);
      const dz = Math.max(0, node.minZ - z - padZ, z - node.maxZ - padZ);
      return dx * dx + dz * dz;
    }
    function visit(node, bound) {
      // Equality cannot prune: an earlier original segment may have the same
      // computed distance as a segment visited first by the spatial tree.
      if (bound > bestDistanceSq) return;
      if (node.segments) {
        for (const segment of node.segments) {
          // Coincident endpoints deliberately behave as one point, t=0.
          const t = segment.lengthSq === 0 ? 0 : Math.max(0, Math.min(1,
            ((x - segment.x) * segment.dx + (z - segment.z) * segment.dz) / segment.lengthSq));
          const px = x - segment.x - t * segment.dx, pz = z - segment.z - t * segment.dz;
          const distanceSq = px * px + pz * pz;
          if (distanceSq < bestDistanceSq || distanceSq === bestDistanceSq && bestIndex !== -1 && segment.index < bestIndex) {
            bestIndex = segment.index; bestT = t; bestDistanceSq = distanceSq;
          }
        }
        return;
      }
      const left = lowerBound(node.left), right = lowerBound(node.right);
      if (left < right || left === right && node.left.firstIndex < node.right.firstIndex) {
        visit(node.left, left); visit(node.right, right);
      } else { visit(node.right, right); visit(node.left, left); }
    }
    if (root) visit(root, 0);
    // Empty/single-point polylines, or calculations overflowing to infinity,
    // have no finite segment result, matching an unchanged full-scan minimum.
    return { index: bestIndex, t: bestT, distanceSq: bestDistanceSq };
  }
  return Object.freeze({ query });
}
