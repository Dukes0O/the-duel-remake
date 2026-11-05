const ROUTE_KINDS = Object.freeze(['pipe', 'road', 'sewer', 'wire', 'rail']);
const ROUTE_STYLES = Object.freeze([
  {id:'around',label:'Around the hill',cutWeight:7,detourWeight:0.12},
  {id:'over',label:'Over the hill',cutWeight:1.1,detourWeight:0.02},
  {id:'through',label:'Through the hill',cutWeight:2.4,detourWeight:0.04},
]);

const finite = (n) => Number.isFinite(n);
const distance = (a,b) => Math.hypot(b.x-a.x,b.z-a.z);
const keyOf = (x,z) => `${x},${z}`;
const compare = (a,b) => a.cost-b.cost || a.key.localeCompare(b.key);

function point(value, name) {
  if (!value || !finite(value.x) || !finite(value.z)) throw new TypeError(`${name} must have finite x and z coordinates.`);
  return {x:value.x,z:value.z};
}

function validate(input) {
  if (!input || !ROUTE_KINDS.includes(input.kind)) throw new TypeError('Route kind must be pipe, road, sewer, wire or rail.');
  if (typeof input.groundAt !== 'function') throw new TypeError('A ground height function is required.');
  const start=point(input.start,'Start'), end=point(input.end,'End');
  const waypoints=(input.waypoints||[]).map((p,i)=>point(p,`Waypoint ${i+1}`));
  const spacing=input.spacing??20;
  if(!finite(spacing)||spacing<2||spacing>200) throw new RangeError('Route spacing must be from 2 to 200 metres.');
  return {start,end,waypoints,spacing,groundAt:input.groundAt,kind:input.kind, tunnelTrialPassed:input.tunnelTrialPassed===true};
}

function cellFor(p, spacing) { return {x:Math.round(p.x/spacing),z:Math.round(p.z/spacing)}; }
function cellPoint(c, spacing) { return {x:c.x*spacing,z:c.z*spacing}; }

function segmentSearch(a,b,style,context) {
  const {spacing,groundAt}=context, start=cellFor(a,spacing), goal=cellFor(b,spacing);
  const startKey=keyOf(start.x,start.z), goalKey=keyOf(goal.x,goal.z);
  const open=[{...start,key:startKey,cost:0}], costs=new Map([[startKey,0]]), previous=new Map(), heights=new Map();
  const originHeight=groundAt(a.x,a.z);
  if(!finite(originHeight)) throw new TypeError('Ground heights must be finite numbers.');
  const height=(x,z)=>{
    const k=keyOf(x,z);
    if(!heights.has(k)) {
      const p=cellPoint({x,z},spacing), h=groundAt(p.x,p.z);
      if(!finite(h)) throw new TypeError('Ground heights must be finite numbers.');
      heights.set(k,h);
    }
    return heights.get(k);
  };
  const deltas=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  let visits=0;
  while(open.length&&visits++<100000) {
    open.sort(compare); const current=open.shift();
    if(current.cost!==costs.get(current.key)) continue;
    if(current.key===goalKey) break;
    for(const [dx,dz] of deltas) {
      const nx=current.x+dx,nz=current.z+dz, p=cellPoint({x:nx,z:nz},spacing);
      const here=height(current.x,current.z), next=height(nx,nz);
      const run=spacing*Math.hypot(dx,dz), cut=Math.max(0,next-here);
      // Detour weight pulls toward the direct line. Cut weight rewards gentle grades.
      const direct=distance(a,b)||1, offLine=Math.abs((p.x-a.x)*(b.z-a.z)-(p.z-a.z)*(b.x-a.x))/direct;
      const separation=context.avoid?.length?Math.min(...context.avoid.map(q=>distance(p,q))):Infinity;
      const diversity=separation<spacing*3?(spacing*3-separation)*2:0;
      const edge=run+cut*style.cutWeight+offLine*style.detourWeight+diversity;
      const nk=keyOf(nx,nz), nc=current.cost+edge;
      if(nc<(costs.get(nk)??Infinity)) { costs.set(nk,nc);previous.set(nk,current.key);open.push({x:nx,z:nz,key:nk,cost:nc}); }
    }
  }
  if(!costs.has(goalKey)) throw new Error('Could not find a route across the ground.');
  const cells=[]; let k=goalKey;
  while(k!==startKey) { const [x,z]=k.split(',').map(Number);cells.push({x,z});k=previous.get(k);if(!k) throw new Error('Route search could not rebuild its path.'); }
  cells.push(start);cells.reverse();
  const points=cells.map(c=>cellPoint(c,spacing));points[0]=a;points[points.length-1]=b;
  return points;
}

function searchRoute(anchors, style, context) {
  const points=[];
  for(let i=1;i<anchors.length;i++) {
    const segment=segmentSearch(anchors[i-1],anchors[i],style,context);
    points.push(...(i===1?segment:segment.slice(1)));
  }
  return points;
}

function summarize(points, kind, groundAt) {
  let length=0,cut=0,peakCut=0,peakRise=0;
  const sourceHead=groundAt(points[0].x,points[0].z)+10;
  const profile=points.map((p,index)=>{
    const ground=groundAt(p.x,p.z);
    const line=kind==='road'?ground-0.2:ground-1.2;
    const previous=profileGround(index);
    if(previous!==null) { const segment=distance(points[index-1],p);length+=segment;const delta=ground-previous;cut+=Math.max(0,delta)*segment*0.35;peakCut=Math.max(peakCut,Math.max(0,delta));peakRise=Math.max(peakRise,delta); }
    return {x:p.x,z:p.z,ground,route:line,pressure:kind==='pipe'?sourceHead-0.12*length:null};
  });
  function profileGround(i){return i===0?null:groundAt(points[i-1].x,points[i-1].z);}
  const material=kind==='pipe'?{pipe:Math.ceil(length),gravel:Math.ceil(length*0.15)}:
    kind==='road'?{gravel:Math.ceil(length*0.8),stone:Math.ceil(length*0.25)}:
    kind==='sewer'?{pipe:Math.ceil(length),gravel:Math.ceil(length*0.2)}:
    kind==='wire'?{wire:Math.ceil(length*1.03),steel:Math.ceil(length*0.02)}:{steel:Math.ceil(length*0.08),gravel:Math.ceil(length*0.1)};
  const machines=kind==='road'||kind==='rail'?['grader','road-roller']:['trencher','pipe-laying-truck','dozer'];
  if(peakCut>1) machines.push('excavator');
  const highestHead=profile.reduce((highest,p)=>Math.max(highest,p.ground+0.12*distance(points[0],p)),0);
  const pumps=kind==='pipe'?Math.ceil(Math.max(0,highestHead-sourceHead)/10):0;
  return {length:Math.round(length),cut:Math.round(cut),cutDepth:Math.round(peakCut*10)/10,ingredients:material,machines,pumps,profile};
}

function routeCost(summary, style) { return summary.length+summary.cut*style.cutWeight+summary.cutDepth*style.detourWeight; }
function distinct(a,b) {
  if(a.points.length!==b.points.length) return true;
  const stride=Math.max(1,Math.floor(a.points.length/12));
  return a.points.some((p,i)=>i%stride===0&&distance(p,b.points[i])>10);
}

/** Plan repeatable ground routes. Inputs are plain data and a pure ground-height function. */
export function planTownRoutes(input) {
  const c=validate(input),anchors=[c.start,...c.waypoints,c.end];
  const found=[];
  for(const style of ROUTE_STYLES) {
    const points=searchRoute(anchors,style,{...c,avoid:found.flatMap(route=>route.points)}), summary=summarize(points,c.kind,c.groundAt);
    const candidate={id:style.id,label:style.label,points,...summary,cost:Math.round(routeCost(summary,style))};
    if(found.every(existing=>distinct(candidate,existing))) found.push(candidate);
    if(found.length===3) break;
  }
  const routes=found.slice(0,3).map(({profile,...route})=>({...route,profile}));
  return {kind:c.kind,routes,tunnel:{id:'tunnel',available:c.tunnelTrialPassed,reason:c.tunnelTrialPassed?null:'The tunnel trial must pass before a tunnel route is available.'}};
}

/** Move one waypoint and recalculate. The caller supplies the new point from its drag control. */
export function moveTownRouteWaypoint(input,index,nextPoint) {
  const waypoints=(input.waypoints||[]).map(p=>({...p}));
  if(!Number.isInteger(index)||index<0||index>=waypoints.length) throw new RangeError('Waypoint index is outside the route.');
  waypoints[index]=point(nextPoint,'Waypoint');
  return planTownRoutes({...input,waypoints});
}

/** Turn the chosen route into construction work data; no world state is changed here. */
export function makeTownRouteWorkOrder(route,kind) {
  if(!route||!finite(route.length)||!Array.isArray(route.points)||route.points.length<2) throw new TypeError('A planned route is required.');
  if(!ROUTE_KINDS.includes(kind)) throw new TypeError('Route kind must be pipe, road, sewer, wire or rail.');
  const stages=[{kind:'survey',amount:route.length,unit:'metres'},{kind:kind==='road'||kind==='rail'?'grade':'trench',amount:route.length,unit:'metres'},{kind:'lay',amount:route.length,unit:'metres'}];
  if (route.cut > 0) stages.push({kind:'fill',amount:route.cut,unit:'cubic metres'});
  return {kind,route:route.points.map(p=>({x:p.x,z:p.z})),length:route.length,cut:route.cut,ingredients:{...route.ingredients},machines:[...route.machines],pumps:route.pumps,stages};
}

export {ROUTE_KINDS};
