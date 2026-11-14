// Shared Iron Line geometry for Iron Mule and later freight jobs. Every rail point is a place of the land plus an offset, or a
// share of the way between two places plus an offset (src/world/scablands-names.js); `ironLineFor(land)` builds the rail for any
// land, so that it moves with the places it runs through. The third number of a point is its height above the ground's own.
import {LAND} from './scablands-names.js';

export function ironLineFor(land) {
  const {at, between} = land;
  const place = (id, point, y = 0) => Object.freeze({id, position:Object.freeze({x:point.x, y, z:point.z})});
  const bedWest = () => place('rail-bed-west', at('dry-dam', 124, -31), .4);
  const loopWest = () => place('rail-loop-west', at('ships-in-sand', -60, 105), 1.7), loopEast = () => place('rail-loop-east', at('ships-in-sand', 40, 105), .8);
  return Object.freeze({
    line: Object.freeze([
      place('rail-siding-end', at('iron-line', -20, 90)), place('rail-halt', at('iron-line')),
      place('rail-north-cut', at('iron-line', 10, -130), 1.6), place('rail-dam-junction', at('dry-dam', -76, 59), -2.8),
      bedWest(), place('rail-bed-mid', between('dry-dam', 'ships-in-sand', .679, 16.2, 54.52), 1.9),
      loopWest(), place('rail-loop-north', at('ships-in-sand', 0, 80), -2),
      loopEast(), place('rail-bed-east', between('ships-in-sand', 'ridge', .426, -10.78, 36.28), -.9),
      place('rail-bridge', between('ships-in-sand', 'ridge', .711, -1.6, 5.37), -1.5), place('rail-east-cut', at('ridge', -94, 104), -1.9),
      place('rail-east-run', at('tin-town', -40, -120), 1), place('rail-tin-town', at('tin-town', 50, -60)),
    ]),
    loopArcs: Object.freeze({
      north: Object.freeze([loopWest(), place('rail-loop-north', at('ships-in-sand', 0, 80), -2), loopEast()]),
      south: Object.freeze([loopWest(), place('rail-loop-south', at('ships-in-sand', 0, 120), 1.1), loopEast()]),
    }),
    gateSpur: Object.freeze([bedWest(), place('dam-rail-gate', at('dry-dam', -21, -41), -3), place('dam-filling-shed', at('dry-dam', -38, -64), -3)]),
  });
}
const BUILT = ironLineFor(LAND);
export const IRON_LINE = BUILT.line;
export const IRON_LOOP_ARCS = BUILT.loopArcs;
export const IRON_RAIL_GATE_SPUR = BUILT.gateSpur;

const point = p => p?.position ?? p;
const distance = (a,b) => Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
const curveCache=new WeakMap();

function curveSamples(path, subdivisions=12) {
  const cached=curveCache.get(path);
  if(cached)return cached;
  if(path.length<3) {const straight=path.map(point);curveCache.set(path,straight);return straight;}
  const output=[];
  for(let i=0;i<path.length-1;i++) {
    const p0=point(path[Math.max(0,i-1)]),p1=point(path[i]),p2=point(path[i+1]),p3=point(path[Math.min(path.length-1,i+2)]);
    for(let j=0;j<subdivisions;j++) {
      const t=j/subdivisions,t2=t*t,t3=t2*t;
      const f=(key)=>.5*((2*p1[key])+(-p0[key]+p2[key])*t+(2*p0[key]-5*p1[key]+4*p2[key]-p3[key])*t2+(-p0[key]+3*p1[key]-3*p2[key]+p3[key])*t3);
      output.push({x:f('x'),y:f('y'),z:f('z')});
    }
  }
  output.push(point(path.at(-1)));
  curveCache.set(path,output);
  return output;
}

export function sampleIronLine(path, metres) {
  if (!Array.isArray(path) || path.length === 0) return null;
  if (path.length === 1) return {...point(path[0]), heading:0, distance:0};
  path=curveSamples(path);
  let left = Math.max(0, metres);
  for (let i=0;i<path.length-1;i++) {
    const a=point(path[i]), b=point(path[i+1]), length=distance(a,b);
    if (left <= length || i === path.length-2) {
      const t=length ? Math.min(1,left/length) : 1;
      return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t,
        heading:Math.atan2(b.x-a.x,b.z-a.z), distance:Math.max(0,metres)};
    }
    left-=length;
  }
  return null;
}

export function ironLineLength(path) {
  path=curveSamples(path??[]);
  let total=0;
  for(let i=1;i<(path?.length??0);i++) total+=distance(point(path[i-1]),point(path[i]));
  return total;
}

export function nearestIronLineDistance(path, target) {
  path=curveSamples(path??[]);
  const q=point(target); let best={distance:Infinity, metres:0}, travelled=0;
  for(let i=1;i<(path?.length??0);i++) {
    const a=point(path[i-1]), b=point(path[i]), dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    const length=Math.hypot(dx,dy,dz), t=length ? Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy+(q.z-a.z)*dz)/(length*length))) : 0;
    const gap=Math.hypot(q.x-a.x-dx*t,q.y-a.y-dy*t,q.z-a.z-dz*t);
    if(gap<best.distance) best={distance:gap,metres:travelled+length*t};
    travelled+=length;
  }
  return best;
}
