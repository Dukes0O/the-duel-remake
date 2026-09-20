import { farTerrainHeightSampler } from './far-terrain-surface.js';

// Shared numeric mesh source; physics uses the same Float32 surface without Three.
// Normalized ridge networks stay strictly inside the existing collision ellipse.
// Each path stores x, z, elevation; subsidiary paths form connected spurs.
const RIDGES = [
  { width:.42, paths:[
    [[-.84,-.18,.08],[-.59,-.08,.45],[-.32,.1,.76],[-.07,.02,.61],[.23,.17,1],[.52,.09,.61],[.82,.29,.08]],
    [[-.32,.1,.72],[-.42,.4,.48],[-.64,.7,.03]],[[.23,.17,.85],[.38,-.22,.53],[.58,-.68,.02]],[[.05,.07,.54],[-.12,-.38,.3],[-.37,-.86,.01]],
  ]},
  { width:.46, paths:[
    [[-.7,-.54,.03],[-.43,-.33,.48],[-.27,-.08,1],[.04,.1,.7],[.35,.22,.81],[.62,.44,.29],[.71,.68,.02]],
    [[-.27,-.08,.9],[-.65,.19,.42],[-.88,.33,.02]],[[.35,.22,.73],[.49,-.1,.45],[.72,-.47,.03]],[[.04,.1,.57],[-.12,.46,.32],[-.25,.89,.01]],
  ]},
  { width:.39, paths:[
    [[-.72,.53,.03],[-.5,.21,.43],[-.2,.33,.86],[.02,.12,.6],[.21,-.12,1],[.46,-.28,.65],[.81,-.3,.04]],
    [[-.2,.33,.75],[-.49,-.04,.47],[-.73,-.53,.02]],[[.21,-.12,.86],[.07,-.51,.49],[-.19,-.86,.02]],[[.21,-.12,.77],[.55,.12,.42],[.84,.46,.02]],
  ]},
  { width:.50, paths:[
    [[-.85,-.15,.01],[-.56,.06,.42],[-.27,.02,.73],[-.1,.24,1],[.2,.33,.64],[.52,.29,.78],[.81,.13,.03]],
    [[-.27,.02,.65],[-.18,-.4,.44],[-.48,-.77,.02]],[[.52,.29,.72],[.59,-.13,.37],[.73,-.6,.02]],[[.02,.29,.73],[.08,.59,.37],[-.04,.92,.01]],
  ]},
];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

function ridgeHeight(x,z,variant) {
  const definition=RIDGES[variant%RIDGES.length],r=Math.hypot(x,z);
  let h=.15*Math.max(0,1-r*r);
  for(let pathIndex=0;pathIndex<definition.paths.length;pathIndex++){
    const path=definition.paths[pathIndex];
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));
      const distance=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),height=((1-t)*a[2]+t*b[2]);
      const width=definition.width*1.32*(pathIndex? .74:1)*(.67+.33*height);
      // Linear crest segments and broad tapered faces read as connected rock
      // shoulders. The former Gaussian profile rounded each high ridge into
      // a narrow dome, particularly on the tallest alpine instances.
      h=Math.max(h,height*Math.max(0,1-distance/width)**1.3);
    }
  }
  // Fine gullies break the flank silhouette without making separate cones.
  const erosion=1+.035*Math.sin(x*19+Math.sin(z*9)*2)+.022*Math.sin(z*31-x*17)+.012*Math.sin(x*57+z*43);
  return Math.max(0,h*erosion*(1-smooth((r-.82)/.18)));
}

export function buildMountainSurface(variant=0) {
  const radial=38,angular=112,positions=[],uv=[],indices=[],heights=[];
  let highest=0;
  const vertex=(x,z)=>{const h=ridgeHeight(x,z,variant);highest=Math.max(highest,h);positions.push(x,h,z);uv.push(x,z);heights.push(h);};
  vertex(0,0);
  for(let ring=1;ring<=radial;ring++)for(let i=0;i<angular;i++){const a=i/angular*Math.PI*2,r=ring/radial;vertex(Math.cos(a)*r,Math.sin(a)*r);}
  for(let i=0;i<angular;i++)indices.push(0,1+(i+1)%angular,1+i);
  for(let ring=2;ring<=radial;ring++)for(let i=0;i<angular;i++){
    const current=1+(ring-1)*angular+i,next=1+(ring-1)*angular+(i+1)%angular,previous=current-angular,previousNext=next-angular;
    indices.push(previous,next,current,previous,previousNext,next);
  }
  for(let i=0;i<heights.length;i++)positions[i*3+1]=heights[i]/highest;
  return {positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint16Array(indices),rimStart:1+(radial-1)*angular};
}

// The original obstacle ellipses remain solid. Bound the visible height by the
// narrower footprint so a 200m seed cannot become a vertical 110m-wide blob.
export function mountainVisualHeight(mountain){
  return Math.min(mountain.height,Math.min(mountain.halfX,mountain.halfZ)*1.08);
}

// Bury the full rendered rim beneath both terrain representations. Increasing
// the vertical scale by the burial depth preserves the capped top elevation.
const placementCache=new WeakMap();
export function mountainPlacement(course,mountain) {
  let entries=placementCache.get(course.samples);
  if(!entries){entries=new WeakMap();placementCache.set(course.samples,entries);}
  if(entries.has(mountain))return entries.get(mountain);
  let minY=mountain.y;
  const c=Math.cos(mountain.heading),sn=Math.sin(mountain.heading),farSurface=farTerrainHeightSampler(course);
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,x=Math.cos(a)*mountain.halfX,z=Math.sin(a)*mountain.halfZ,n=course.nearest(mountain.x+c*x+sn*z,mountain.z-sn*x+c*z);
    minY=Math.min(minY,course.groundAt(n.s,n.lateral).y);
  }
  for(let i=0;i<112;i++){
    const a=i*Math.PI/56,b=(i+1)*Math.PI/56,ax=Math.cos(a)*mountain.halfX,az=Math.sin(a)*mountain.halfZ,bx=Math.cos(b)*mountain.halfX,bz=Math.sin(b)*mountain.halfZ;
    for(const t of[0,.25,.5,.75]){
      const x=ax+(bx-ax)*t,z=az+(bz-az)*t,worldX=mountain.x+c*x+sn*z,worldZ=mountain.z-sn*x+c*z,height=farSurface(worldX,worldZ);
      // Steeper authored expansion terrain needs the actual rendered rim's
      // 112 vertices and edge quarters, not only the coarser 64-point ring.
      // Keep the legacy transforms byte-for-byte unchanged.
      if(course.def.expansion){const nearest=course.nearest(worldX,worldZ);minY=Math.min(minY,course.groundAt(nearest.s,nearest.lateral).y);}
      if(height!==null)minY=Math.min(minY,height);
    }
  }
  const burial=mountain.y-minY+4;
  const placement={x:mountain.x,y:mountain.y-burial,z:mountain.z,heading:mountain.heading,sx:mountain.halfX,sy:mountainVisualHeight(mountain)+burial,sz:mountain.halfZ};
  entries.set(mountain,placement);return placement;
}
