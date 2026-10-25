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
  // Flatten the tree into typed arrays, in the order the recursive walk met the nodes, so a query allocates
  // nothing but its result and visits exactly the nodes, in exactly the order, the recursive version did.
  const nodes = [];
  (function number(node) {
    if (!node) return;
    node.id = nodes.length; nodes.push(node);
    if (!node.segments) { number(node.left); number(node.right); }
  })(root);
  const leafSegments = nodes.filter(node => node.segments).flatMap(node => node.segments);
  const count = nodes.length, total = leafSegments.length;
  const nMinX = new Float64Array(count), nMaxX = new Float64Array(count), nMinZ = new Float64Array(count), nMaxZ = new Float64Array(count);
  const nAbsX = new Float64Array(count), nAbsZ = new Float64Array(count), nFirst = new Float64Array(count);
  const nLeft = new Int32Array(count).fill(-1), nRight = new Int32Array(count).fill(-1), nFrom = new Int32Array(count), nTo = new Int32Array(count);
  const sX = new Float64Array(total), sZ = new Float64Array(total), sDx = new Float64Array(total), sDz = new Float64Array(total);
  const sLengthSq = new Float64Array(total), sIndex = new Int32Array(total);
  let filled = 0;
  // Where each segment sits in the flat arrays, by its source index.
  const sPosition = new Int32Array(segments.length + 1);
  for (const node of nodes) {
    const id = node.id;
    nMinX[id] = node.minX; nMaxX[id] = node.maxX; nMinZ[id] = node.minZ; nMaxZ[id] = node.maxZ;
    nAbsX[id] = node.maxAbsX; nAbsZ[id] = node.maxAbsZ; nFirst[id] = node.firstIndex;
    if (node.segments) {
      nFrom[id] = filled;
      for (const segment of node.segments) {
        sX[filled] = segment.x; sZ[filled] = segment.z; sDx[filled] = segment.dx; sDz[filled] = segment.dz;
        sLengthSq[filled] = segment.lengthSq; sIndex[filled] = segment.index; sPosition[segment.index] = filled; filled++;
      }
      nTo[id] = filled;
    } else { nLeft[id] = node.left.id; nRight[id] = node.right.id; }
  }
  // A walk pushes one far child per level, so the tree's depth (at most about 40 for any real route) bounds the stack.
  const stackNode = new Int32Array(256), stackBound = new Float64Array(256);
  // The legacy residual is evaluated as x-a-t*dx rather than x-(a+t*dx).
  // Pad its box bound for those floating-point operations, including far
  // queries. Padding only visits extra nodes; it never changes distances.
  function lowerBound(node, x, z, absX, absZ) {
    const padX = (absX + nAbsX[node]) * Number.EPSILON * 16;
    const padZ = (absZ + nAbsZ[node]) * Number.EPSILON * 16;
    // The larger of 0 and the two gaps, worked out by comparison (a three-way Math.max was a visible cost).
    let dx = nMinX[node] - x - padX; const dx2 = x - nMaxX[node] - padX;
    if (dx2 > dx) dx = dx2; if (!(dx > 0)) dx = 0;
    let dz = nMinZ[node] - z - padZ; const dz2 = z - nMaxZ[node] - padZ;
    if (dz2 > dz) dz = dz2; if (!(dz > 0)) dz = 0;
    return dx * dx + dz * dz;
  }
  // Queries usually arrive along a path (a row of ground vertices, a run of scenery), so the last answer is a good first guess.
  // It is scored as the segment it is and then competes with every other one, so the winner (the smallest distance, then
  // the earliest segment) is the same whatever the guess; a good guess only lets the walk prune sooner.
  let lastIndex = -1;
  function search(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Polyline query coordinates must be finite numbers.');
    let bestIndex = -1, bestT = 0, bestDistanceSq = Infinity;
    const absX = Math.abs(x), absZ = Math.abs(z);
    if (lastIndex > 0) {
      const k = sPosition[lastIndex];
      const t = sLengthSq[k] === 0 ? 0 : Math.max(0, Math.min(1, ((x - sX[k]) * sDx[k] + (z - sZ[k]) * sDz[k]) / sLengthSq[k]));
      const px = x - sX[k] - t * sDx[k], pz = z - sZ[k] - t * sDz[k], distanceSq = px * px + pz * pz;
      if (distanceSq < Infinity) { bestIndex = lastIndex; bestT = t; bestDistanceSq = distanceSq; }
    }
    if (count) {
      let top = 1;
      stackNode[0] = 0; stackBound[0] = 0;
      while (top > 0) {
        top--;
        // Equality cannot prune: an earlier original segment may have the same
        // computed distance as a segment visited first by the spatial tree.
        if (stackBound[top] > bestDistanceSq) continue;
        let node = stackNode[top];
        for (;;) {
          if (nLeft[node] < 0) {
            for (let k = nFrom[node]; k < nTo[node]; k++) {
              // Coincident endpoints deliberately behave as one point, t=0.
              let t = 0;
              if (sLengthSq[k] !== 0) {
                t = ((x - sX[k]) * sDx[k] + (z - sZ[k]) * sDz[k]) / sLengthSq[k];
                if (t <= 0) t = 0; else if (t >= 1) t = 1;
              }
              const px = x - sX[k] - t * sDx[k], pz = z - sZ[k] - t * sDz[k];
              const distanceSq = px * px + pz * pz;
              if (distanceSq < bestDistanceSq || distanceSq === bestDistanceSq && bestIndex !== -1 && sIndex[k] < bestIndex) {
                bestIndex = sIndex[k]; bestT = t; bestDistanceSq = distanceSq;
              }
            }
            break;
          }
          const left = nLeft[node], right = nRight[node], leftBound = lowerBound(left, x, z, absX, absZ), rightBound = lowerBound(right, x, z, absX, absZ);
          let near, nearBound, far, farBound;
          if (leftBound < rightBound || leftBound === rightBound && nFirst[left] < nFirst[right]) {
            near = left; nearBound = leftBound; far = right; farBound = rightBound;
          } else { near = right; nearBound = rightBound; far = left; farBound = leftBound; }
          stackNode[top] = far; stackBound[top] = farBound; top++;
          if (nearBound > bestDistanceSq) break;
          node = near;
        }
      }
    }
    // Empty/single-point polylines, or calculations overflowing to infinity,
    // have no finite segment result, matching an unchanged full-scan minimum.
    if (bestIndex > 0) lastIndex = bestIndex;
    shared.index = bestIndex; shared.t = bestT; shared.distanceSq = bestDistanceSq;
  }
  // The same answer as a fresh object. Hot loops that read the result at once use `lookup`, which hands back one
  // object that the next call overwrites, so they allocate nothing per query.
  const shared = { index: -1, t: 0, distanceSq: Infinity };
  const query = (x, z) => { search(x, z); return { index: shared.index, t: shared.t, distanceSq: shared.distanceSq }; };
  const lookup = (x, z) => { search(x, z); return shared; };
  return Object.freeze({ query, lookup });
}
