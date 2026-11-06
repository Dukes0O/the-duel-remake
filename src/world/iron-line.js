// Shared Iron Line geometry for Iron Mule and later freight jobs.
const place = (id, x, z, y = 0) => Object.freeze({id, position:Object.freeze({x, y, z})});
export const IRON_LINE = Object.freeze([
  place('rail-siding-end', -620, 90), place('rail-halt', -600, 0),
  place('rail-north-cut', -590, -130, 1.6), place('rail-dam-junction', -500, -245, -2.8),
  place('rail-bed-west', -300, -335, .4), place('rail-bed-mid', -120, -335, 1.9),
  place('rail-loop-west', -60, -325, 1.7), place('rail-loop-north', 0, -350, -2),
  place('rail-loop-east', 40, -325, .8), place('rail-bed-east', 170, -340, -.9),
  place('rail-bridge', 300, -335, -1.5), place('rail-east-cut', 330, -200, -1.9),
  place('rail-east-run', 560, -120, 1), place('rail-tin-town', 650, -60),
]);
export const IRON_LOOP_ARCS=Object.freeze({
  north:Object.freeze([place('rail-loop-west',-60,-325,1.7),place('rail-loop-north',0,-350,-2),place('rail-loop-east',40,-325,.8)]),
  south:Object.freeze([place('rail-loop-west',-60,-325,1.7),place('rail-loop-south',0,-310,1.1),place('rail-loop-east',40,-325,.8)]),
});
export const IRON_RAIL_GATE_SPUR=Object.freeze([place('rail-bed-west',-300,-335,.4),place('dam-rail-gate',-445,-345,-3),place('dam-filling-shed',-462,-368,-3)]);

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
