import {makeTownRouteWorkOrder,planTownRoutes} from '../town-routes.js';

const COLORS=['#c46a31','#4f91a8','#d7b04d'];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finite=Number.isFinite;
const format=value=>new Intl.NumberFormat('en',{maximumFractionDigits:0}).format(value);
const ROUTE_TOOL_STYLE=`
.town-route-tool{box-sizing:border-box;color:#eee7d9;background:#211f1b;border:1px solid #625949;border-radius:12px;padding:20px;font:15px/1.45 system-ui,sans-serif;max-width:1100px}
.town-route-tool *{box-sizing:border-box}.town-route-tool header{display:flex;justify-content:space-between;align-items:start;gap:20px}.town-route-tool h2,.town-route-tool h3,.town-route-tool p{margin:0}.town-route-tool h2{font-size:25px;line-height:1.2}.town-route-tool header p:not(.town-route-kicker){margin-top:6px;color:#c3b9a7}.town-route-kicker{color:#d39a5c;font-size:12px;font-weight:800;letter-spacing:.14em;margin-bottom:5px!important}.town-route-tool label{display:grid;gap:5px;color:#d8cebd;font-size:13px}.town-route-tool select,.town-route-tool button{font:inherit;color:inherit;background:#38342d;border:1px solid #756a58;border-radius:7px;padding:9px 12px}.town-route-tool button{cursor:pointer}.town-route-tool button:hover{background:#494237}.town-route-tool button:focus-visible,.town-route-waypoint [tabindex]:focus-visible{outline:3px solid #f0c477;outline-offset:3px}.town-route-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}.town-route-choice{border:1px solid #5d5549;border-top:4px solid var(--route-color);border-radius:9px;background:#2b2823;min-width:0;padding:10px}.town-route-choice.is-selected{background:#39342c;box-shadow:inset 0 0 0 1px var(--route-color)}.town-route-select{display:flex;width:100%;align-items:center;gap:10px;text-align:left;border:0!important;background:transparent!important;padding:3px!important}.town-route-select>span:last-child{display:grid;gap:2px}.town-route-select small{color:#c7bdad}.town-route-number{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:50%;background:var(--route-color);color:#171512;font-weight:800}.town-route-choice dl{display:grid;gap:5px;margin:10px 0 0}.town-route-choice dl div{display:grid;grid-template-columns:74px minmax(0,1fr);gap:6px;font-size:12px}.town-route-choice dt{color:#baad99}.town-route-choice dd{margin:0;overflow-wrap:anywhere}.town-route-map-wrap{overflow:hidden;border:1px solid #69604f;border-radius:9px;background:#444137}.town-route-map{display:block;width:100%;height:clamp(240px,38vw,390px)}.town-route-ground-cells rect{stroke:#b9a98d;stroke-opacity:.08}.town-route-map-line path:first-child{fill:none;stroke:var(--route-color);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:.65}.town-route-map-line.is-selected path:first-child{stroke-width:11;opacity:1}.town-route-end{fill:#f1dfad;stroke:#30291e;stroke-width:4}.town-route-end.is-destination{fill:#d67545}.town-route-waypoint circle{fill:#f4dfad;stroke:#2c2924;stroke-width:4}.town-route-waypoint>path{stroke:#322c21;stroke-width:3}.town-route-waypoint text{fill:#201e19;font-size:14px;font-weight:800}.town-route-waypoint rect{cursor:grab}.town-route-flag{fill:none;stroke:#f3d486;stroke-width:3}.town-route-profile-wrap{margin-top:16px}.town-route-profile-wrap h3{font-size:17px}.town-route-profile-wrap p{margin:3px 0 8px;color:#c3b9a7;font-size:13px}.town-route-profile{display:block;width:100%;max-height:180px;border:1px solid #5b5449;border-radius:7px;background:#292722}.town-route-profile path{fill:none;stroke-width:3}.town-route-ground{stroke:#a8a080}.town-route-line{stroke:#df9a52}.town-route-pressure{stroke:#6cb9d4;stroke-dasharray:7 5}.town-route-profile text{fill:#d6cbbb;font:10px system-ui,sans-serif}.town-route-tunnel,.town-route-flags{margin-top:10px;color:#c9bea9;font-size:13px}.town-route-actions{display:flex;align-items:center;gap:12px;margin-top:14px}.town-route-actions [data-town-route-agree]{background:#a65b35;border-color:#d38c5e;font-weight:750}.town-route-actions [data-town-route-agree]:disabled{opacity:.45;cursor:default}.town-route-flags{margin:0}.town-route-message{min-height:1.5em;margin-top:8px!important;color:#e0c17e}.town-route-valve{width:100%;margin-top:12px;background:#376c75!important;border-color:#71a9ac!important}.town-route-empty{padding:16px;color:#c3b9a7}
@media(max-width:760px){.town-route-tool{padding:14px}.town-route-tool header{display:grid}.town-route-choices{grid-template-columns:1fr}.town-route-map{height:280px}.town-route-actions{align-items:flex-start;flex-direction:column}}
`;

function boundsFor(routes,start,end) {
  const points=[start,end,...routes.flatMap(route=>route.points)];
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minZ=Math.min(...points.map(p=>p.z)),maxZ=Math.max(...points.map(p=>p.z));
  const pad=Math.max(20,(Math.max(maxX-minX,maxZ-minZ)||100)*0.12);
  return {minX:minX-pad,maxX:maxX+pad,minZ:minZ-pad,maxZ:maxZ+pad};
}

function mapPoint(point,bounds) {
  const width=bounds.maxX-bounds.minX,height=bounds.maxZ-bounds.minZ;
  return {x:((point.x-bounds.minX)/width)*1000,y:((point.z-bounds.minZ)/height)*560};
}

function groundCells(groundAt,bounds) {
  const cells=[],columns=18,rows=10,values=[];
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const x=bounds.minX+(column+0.5)*(bounds.maxX-bounds.minX)/columns;
    const z=bounds.minZ+(row+0.5)*(bounds.maxZ-bounds.minZ)/rows;
    const height=groundAt(x,z);
    if(!finite(height)) throw new TypeError('Ground heights must be finite numbers.');
    values.push(height);cells.push({column,row,height});
  }
  const low=Math.min(...values),range=Math.max(1,Math.max(...values)-low);
  return cells.map(cell=>({...cell,shade:Math.round(18+Math.min(1,(cell.height-low)/range)*20)}));
}

function profileSvg(route,width=560,height=150) {
  const rows=route?.profile||[];
  if(rows.length<2) return '<p class="town-route-empty">The ground profile is not available.</p>';
  const values=rows.flatMap(row=>[row.ground,row.route,...(finite(row.pressure)?[row.pressure]:[])]);
  const low=Math.min(...values)-2,high=Math.max(...values)+2,span=Math.max(1,high-low);
  const xAt=index=>24+(index/(rows.length-1))*(width-48);
  const yAt=value=>height-20-((value-low)/span)*(height-40);
  const path=key=>rows.map((row,index)=>`${index?'L':'M'}${xAt(index).toFixed(1)},${yAt(row[key]).toFixed(1)}`).join(' ');
  const pressure=rows.some(row=>finite(row.pressure))?`<path class="town-route-pressure" d="${path('pressure')}"/>`:'';
  return `<svg class="town-route-profile" viewBox="0 0 ${width} ${height}" role="img" aria-label="Side view of the ground, route and water pressure"><path class="town-route-ground" d="${path('ground')}"/><path class="town-route-line" d="${path('route')}"/>${pressure}<text x="25" y="15">GROUND</text><text x="${width-24}" y="15" text-anchor="end">${finite(rows[0].pressure)?'PRESSURE':'ROUTE'}</text></svg>`;
}

function routeCard(route,index,selectedId,kind,laidRouteIds) {
  const selected=route.id===selectedId,laid=laidRouteIds.includes(route.id);
  const materials=Object.entries(route.ingredients).map(([name,amount])=>`${escapeHtml(name)} ${format(amount)}`).join(', ');
  const machines=route.machines.map(escapeHtml).join(', ');
  return `<article class="town-route-choice${selected?' is-selected':''}" data-town-route-card="${escapeHtml(route.id)}" style="--route-color:${COLORS[index%COLORS.length]}"><button type="button" class="town-route-select" data-town-route-select="${escapeHtml(route.id)}" aria-pressed="${selected}"><span class="town-route-number">${index+1}</span><span><strong>${escapeHtml(route.label)}</strong><small>${format(route.length)} m · ${format(route.cut)} m³ cut</small></span></button><dl><div><dt>Materials</dt><dd>${materials||'None listed'}</dd></div><div><dt>Machines</dt><dd>${machines||'None needed'}</dd></div>${kind==='pipe'?`<div><dt>Pumps</dt><dd>${format(route.pumps)}</dd></div>`:''}</dl>${laid&&kind==='pipe'?`<button type="button" class="town-route-valve" data-town-route-valve="${escapeHtml(route.id)}">Open the valve</button>`:''}</article>`;
}

/** Build a view model from real world coordinates and the pure route planner. */
export function townRouteToolModel(input,{selectedRouteId=null,waypoint=null,waypoints=null,agreedRouteId=null,laidRouteIds=[]}={}) {
  if(!input||typeof input.groundAt!=='function') throw new TypeError('A route ground function is required.');
  const start=input.start,end=input.end;
  if(!start||!end||![start.x,start.z,end.x,end.z].every(finite)) throw new TypeError('Route ends need finite world coordinates.');
  const activeWaypoints=waypoints|| (waypoint?[waypoint]:input.waypoints||[]);
  const routeInput={...input,waypoints:activeWaypoints};
  const plan=planTownRoutes(routeInput);
  const selected=plan.routes.find(route=>route.id===selectedRouteId)||plan.routes[0]||null;
  const bounds=boundsFor(plan.routes,start,end);
  const cells=groundCells(input.groundAt,bounds);
  const handle=activeWaypoints[0]||{x:(start.x+end.x)/2,z:(start.z+end.z)/2};
  return {kind:plan.kind,start:{...start},end:{...end},routes:plan.routes,tunnel:plan.tunnel,selected,selectedRouteId:selected?.id??null,
    bounds,cells,handle,waypoints:activeWaypoints.map(point=>({...point})),agreedRouteId,laidRouteIds:[...laidRouteIds],profileMarkup:profileSvg(selected)};
}

export function townRouteToolMarkup(model) {
  const {bounds}=model;
  const cellWidth=1000/18,cellHeight=560/10;
  const cells=model.cells.map(cell=>`<rect x="${cell.column*cellWidth}" y="${cell.row*cellHeight}" width="${cellWidth+1}" height="${cellHeight+1}" fill="hsl(34 15% ${cell.shade}%)"/>`).join('');
  const lines=model.routes.map((route,index)=>{
    const points=route.points.map(point=>mapPoint(point,bounds));
    const d=points.map((point,i)=>`${i?'L':'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const selected=route.id===model.selectedRouteId,agreed=route.id===model.agreedRouteId;
    const flags=agreed?points.filter((_,i)=>i===0||i===points.length-1||i%Math.max(1,Math.floor(50/Math.max(1,route.length/points.length)))===0).map(point=>`<path class="town-route-flag" d="M${point.x.toFixed(1)},${point.y.toFixed(1)}v-17h10l-4 4 4 4h-10"/>`).join(''):'';
    return `<g class="town-route-map-line${selected?' is-selected':''}" style="--route-color:${COLORS[index%COLORS.length]}"><path d="${d}"/><title>${escapeHtml(route.label)}, ${format(route.length)} metres</title>${flags}</g>`;
  }).join('');
  const start=mapPoint(model.start,bounds),end=mapPoint(model.end,bounds);
  const agreed=model.routes.find(route=>route.id===model.agreedRouteId);
  const flags=agreed?`<p class="town-route-flags" role="status">Survey flags mark ${format(agreed.length)} metres of ground.</p>`:'';
  const handles=(model.waypoints.length?model.waypoints:[model.handle]).map((point,index)=>{
    const position=mapPoint(point,bounds);
    return `<g class="town-route-waypoint"><circle cx="${position.x}" cy="${position.y}" r="19"/><path d="M${position.x-7},${position.y}h14m-7-7v14"/><text x="${position.x+21}" y="${position.y-15}">DRAG ${index+1}</text><rect data-town-waypoint-hit="${index}" x="${position.x-30}" y="${position.y-30}" width="60" height="60" fill="transparent" tabindex="0" role="slider" aria-label="Route waypoint ${index+1}" aria-valuetext="${Math.round(point.x)} metres east, ${Math.round(point.z)} metres north"/></g>`;
  }).join('');
  const tunnel=model.tunnel.available?'A tunnel route can be planned.':model.tunnel.reason;
  return `<section class="town-route-tool" aria-label="Plan a town route"><style>${ROUTE_TOOL_STYLE}</style><header><div><p class="town-route-kicker">PLAN ON THE GROUND</p><h2>Choose a route</h2><p>Drag the points on the map. The ground, materials and route length will change.</p></div><label>What are you laying?<select data-town-route-kind>${['pipe','road','sewer','wire','rail'].map(kind=>`<option value="${kind}"${model.kind===kind?' selected':''}>${kind[0].toUpperCase()+kind.slice(1)}</option>`).join('')}</select></label></header><div class="town-route-choices">${model.routes.map((route,index)=>routeCard(route,index,model.selectedRouteId,model.kind,model.laidRouteIds)).join('')}</div><div class="town-route-map-wrap"><svg class="town-route-map" viewBox="0 0 1000 560" preserveAspectRatio="none" role="group" aria-label="Map of route choices drawn over the ground"><g class="town-route-ground-cells">${cells}</g>${lines}<circle class="town-route-end" cx="${start.x}" cy="${start.y}" r="12"><title>Start</title></circle><circle class="town-route-end is-destination" cx="${end.x}" cy="${end.y}" r="12"><title>Town</title></circle>${handles}</svg></div><div class="town-route-profile-wrap"><h3>Along the route</h3><p>The line follows the ground. For water, the pressure line shows where a pump may be needed.</p>${model.profileMarkup}</div><p class="town-route-tunnel">${escapeHtml(tunnel)}</p><div class="town-route-actions"><button type="button" data-town-route-agree=""${model.selected?'':' disabled'}>Agree to this route</button>${flags}</div><p class="town-route-message" role="status" aria-live="polite">${model.agreedRouteId?'The route is marked for survey. The work order is ready.':''}</p></section>`;
}

export function renderTownRouteTool(root,input,options={}) {
  if(!root||typeof root.innerHTML!=='string') throw new TypeError('Choose a place for the route tool first.');
  const model=townRouteToolModel(input,options);root.innerHTML=townRouteToolMarkup(model);return model;
}

/** Bind pointer and keyboard controls; all town changes leave through callbacks. */
export function bindTownRouteTool(root,input,{onAgree=()=>{},onPlantFlags=()=>{},onValveMoment=()=>{},onPlanChange=()=>{}}={}) {
  if(!root?.addEventListener) throw new TypeError('Choose a place for route controls first.');
  let current={...input,waypoints:(input.waypoints||[]).map(point=>({...point}))};
  let selectedRouteId=null,agreedRouteId=null,draggingIndex=null,laidRouteIds=[];
  const draw=()=>renderTownRouteTool(root,current,{selectedRouteId,agreedRouteId,laidRouteIds});
  const say=text=>{const node=root.querySelector('.town-route-message');if(node)node.textContent=text;};
  const selectRoute=id=>{selectedRouteId=id;draw();};
  const moveWaypoint=(point,index=0)=>{
    const moved=(current.waypoints||[]).map(value=>({...value}));
    if(index>=moved.length)moved.push(point);else moved[index]=point;
    current={...current,waypoints:moved};const model=draw();onPlanChange({waypoints:moved.map(value=>({...value})),plan:{kind:model.kind,routes:model.routes,tunnel:model.tunnel}});
  };
  const click=event=>{
    const select=event.target.closest?.('[data-town-route-select]');
    if(select){selectRoute(select.dataset.townRouteSelect);return;}
    const agree=event.target.closest?.('[data-town-route-agree]');
    if(agree&&selectedRouteId){
      const route=planTownRoutes(current).routes.find(value=>value.id===selectedRouteId);
      if(!route)return;
      agreedRouteId=route.id;const order=makeTownRouteWorkOrder(route,current.kind);
      const flags=route.points.filter((_,index)=>index===0||index===route.points.length-1||index%Math.max(1,Math.floor(50/Math.max(1,route.length/route.points.length)))===0).map(point=>({...point}));
      draw();say('The route is marked for survey. The work order is ready.');onPlantFlags({route,flags});onAgree({route,workOrder:order,flags});return;
    }
    const valve=event.target.closest?.('[data-town-route-valve]');
    if(valve){
      const route=planTownRoutes(current).routes.find(value=>value.id===valve.dataset.townRouteValve);
      if(route){say('The valve is open. Water is running toward town.');onValveMoment({route,followPoints:route.points.map(point=>({...point})),cameraFollow:true});}
    }
  };
  const pointFromEvent=event=>{
    const model=townRouteToolModel(current,{selectedRouteId,agreedRouteId,laidRouteIds});
    const svg=root.querySelector('.town-route-map'),rect=svg?.getBoundingClientRect?.();
    if(!rect||rect.width<=0||rect.height<=0)return null;
    const x=model.bounds.minX+((event.clientX-rect.left)/rect.width)*(model.bounds.maxX-model.bounds.minX);
    const z=model.bounds.minZ+((event.clientY-rect.top)/rect.height)*(model.bounds.maxZ-model.bounds.minZ);
    return {x,z};
  };
  const down=event=>{
    const handle=event.target.closest?.('[data-town-waypoint-hit]');if(!handle)return;
    draggingIndex=Number(handle.dataset.townWaypointHit)||0;root.setPointerCapture?.(event.pointerId);event.preventDefault?.();
  };
  const move=event=>{if(draggingIndex!==null){const point=pointFromEvent(event);if(point)moveWaypoint(point,draggingIndex);}};
  const up=()=>{draggingIndex=null;};
  const keydown=event=>{
    const handle=event.target.closest?.('[data-town-waypoint-hit]');
    if(!handle)return;
    const index=Number(handle.dataset.townWaypointHit)||0;
    const currentPoint=current.waypoints[index]||{x:(current.start.x+current.end.x)/2,z:(current.start.z+current.end.z)/2};
    const step=event.shiftKey?100:10;let {x,z}=currentPoint;
    if(event.key==='ArrowLeft')x-=step;else if(event.key==='ArrowRight')x+=step;else if(event.key==='ArrowUp')z-=step;else if(event.key==='ArrowDown')z+=step;else return;
    event.preventDefault();moveWaypoint({x,z},index);root.querySelector(`[data-town-waypoint-hit="${index}"]`)?.focus?.();
  };
  const change=event=>{
    const select=event.target.closest?.('[data-town-route-kind]');if(!select)return;
    current={...current,kind:select.value};selectedRouteId=null;agreedRouteId=null;draw();onPlanChange({kind:current.kind,plan:planTownRoutes(current)});
  };
  root.addEventListener('click',click);root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('keydown',keydown);root.addEventListener('change',change);
  draw();
  return {getPlan:()=>planTownRoutes(current),markRouteLaid:id=>{laidRouteIds=[...new Set([...laidRouteIds,id])];draw();},dispose(){root.removeEventListener('click',click);root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);root.removeEventListener('keydown',keydown);root.removeEventListener('change',change);}};
}
