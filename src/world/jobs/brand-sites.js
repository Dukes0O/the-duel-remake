// Job 2's places come from the town that is drawn, not a second town layout.
// The route is a clear way through its alleys, not a movement system. The
// existing fighter still owns every step, collision and choice of direction.
import {LAND} from '../scablands-names.js';
import {tinTownLayout, tinTownFence} from '../tin-town-shacks.js';
import {forgePlan} from '../forge-look.js';
import {tinTownGateFor} from '../tin-town-gate.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {BRAND_RULE} from './brand-rule.js';
import {pushOutOfSolids, SOLID_GRID} from '../scablands-solids.js';

export function brandSites(land = LAND) {
  const slots = tinTownLayout(land).clusters.flatMap(cluster => cluster.slots);
  const pump = slots.find(slot => slot.kind === 'T');
  const tower = slots.find(slot => slot.kind === 'W');
  if (!pump || !tower) throw new Error('Light the Town needs both town towers.');
  const rule = BRAND_RULE.sites;
  const place = (id, point) => Object.freeze({id, position: Object.freeze({
    x: point.x, y: scablandsSurfaceHeightAt(point.x, point.z), z: point.z,
  })});
  const hearthAt = forgePlan(land).hearth;
  const hearth = place('town-hearth', hearthAt);
  const auntie = place('town-auntie-solder', {x: hearthAt.x + BRAND_RULE.auntieEast,
    z: hearthAt.z + BRAND_RULE.auntieSouth});
  const lamps = Object.freeze([
    place('pump', {x: pump.x, z: pump.z + rule.pumpSouth}),
    // Ladders in the folk kit are scenery. The fighter has no ladder action.
    place('tower', {x: tower.x + rule.towerEast, z: tower.z}),
    place('far', {x: pump.x - rule.farWest, z: pump.z - rule.farNorth}),
  ]);
  const farWalk = Object.freeze([
    place('hearth-front', {x: hearthAt.x, z: hearthAt.z + rule.hearthApproachSouth}),
    place('forge-alley', land.at('tin-town', rule.firstAlleyEast, rule.firstAlleySouth)),
    place('inner-alley', land.at('tin-town', rule.firstAlleyEast, -rule.innerAlleyNorth)),
    place('west-alley', land.at('tin-town', -rule.westAlleyWest, -rule.westAlleyNorth)),
    place('north-alley', land.at('tin-town', -rule.westAlleyWest, -rule.northAlleyNorth)),
    place('far-alley', {x: lamps[2].position.x, z: land.at('tin-town').z - rule.northAlleyNorth}),
    lamps[2],
  ]);
  const centre = land.at('tin-town');
  const ashEntries = Object.freeze(tinTownFence(land).map((sheet, index) => {
    const dx = centre.x - sheet.x, dz = centre.z - sheet.z;
    const scale = BRAND_RULE.wallEntryInset / Math.hypot(dx, dz);
    return place(`town-wall-${index}`, {x: sheet.x + dx * scale, z: sheet.z + dz * scale});
  }));
  const gate = tinTownGateFor(land).gate;
  const theftPath = Object.freeze([farWalk[0],
    place('thief-bay', land.at('tin-town', rule.thiefAlleyEast, rule.thiefAlleySouth)),
    place('thief-south-alley', land.at('tin-town', rule.thiefAlleyEast, rule.thiefGateApproachSouth)),
    place('thief-gate-approach', {x: gate.x, z: land.at('tin-town').z + rule.thiefGateApproachSouth}),
    place('thief-gate', gate)]);
  return Object.freeze({hearth, auntie, lamps, farWalk, ashEntries, theftPath, towerAtFoot: true});
}

// Choose alley waypoints only. The existing foot mover owns every actual step.
// Cache a route on the actor so a moving player does not rebuild it each frame.
export function brandAshAim(actor, goal, entries, grid) {
  const r=BRAND_RULE, gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const clear=(a,b)=>{
    const parts=Math.max(1,Math.ceil(gap(a,b)/r.alleySampleMetres));
    for(let i=1;i<=parts;i++) {
      const x=a.x+(b.x-a.x)*i/parts,z=a.z+(b.z-a.z)*i/parts;
      if(pushOutOfSolids(x,z,r.ashRadiusMetres,grid,scablandsSurfaceHeightAt(x,z)).hit)return false;
    }
    return true;
  };
  let kept=actor.brandAlley;
  if(!kept || gap(kept.goal,goal)>r.alleyRepathMetres) {
    if(clear(actor,goal)) kept={goal:{...goal},route:[goal]};
    else {
      const points=[actor,goal,...entries.map(entry=>entry.position??entry)];
      const minX=Math.min(...points.map(p=>p.x))-r.alleyMarginMetres;
      const minZ=Math.min(...points.map(p=>p.z))-r.alleyMarginMetres;
      const maxX=Math.max(...points.map(p=>p.x))+r.alleyMarginMetres;
      const maxZ=Math.max(...points.map(p=>p.z))+r.alleyMarginMetres;
      const cell=r.alleyCellMetres;
      const point=node=>({x:minX+node.x*cell,z:minZ+node.z*cell});
      const key=node=>`${node.x},${node.z}`;
      // Link the actor to a clear nearby grid point, even beside a fence.
      const sx=Math.round((actor.x-minX)/cell),sz=Math.round((actor.z-minZ)/cell);
      const starts=[];
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
        const node={x:sx+dx,z:sz+dz};
        if(clear(actor,point(node)))starts.push(node);
      }
      starts.sort((a,b)=>gap(point(a),actor)-gap(point(b),actor));
      const queue=starts,previous=new Map(starts.map(node=>[key(node),null]));
      let end,finish;
      for(let index=0;index<queue.length;index++) {
        const node=queue[index],here=point(node);
        // A lamp is itself solid. A clear nearby stop is enough to smother it.
        const distance=gap(here,goal);
        if(distance<cell*2) {
          const reach=r.smotherRadius-r.ashRadiusMetres;
          const stop=clear(here,goal)?{...goal}:{x:goal.x+(here.x-goal.x)*Math.min(1,reach/(distance||1)),
            z:goal.z+(here.z-goal.z)*Math.min(1,reach/(distance||1))};
          if(clear(here,stop)) {end=node;finish=stop;break;}
        }
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          const next={x:node.x+dx,z:node.z+dz},at=point(next);
          if(at.x<minX||at.x>maxX||at.z<minZ||at.z>maxZ||previous.has(key(next))||!clear(here,at))continue;
          previous.set(key(next),node);queue.push(next);
        }
      }
      const route=[];
      for(let node=end;node;node=previous.get(key(node)))route.unshift(point(node));
      if(finish)route.push(finish);
      // Collapse clear stretches; keep every turn needed to clear a solid.
      const smooth=[];let here=actor;
      while(route.length) {
        let index=route.length-1;
        while(index>0&&!clear(here,route[index]))index--;
        here=route[index];smooth.push(here);route.splice(0,index+1);
      }
      kept={goal:{...goal},route:smooth};
    }
    actor.brandAlley=kept;
  }
  while(kept.route.length>1&&gap(actor,kept.route[0])<r.alleyReachMetres)kept.route.shift();
  return kept.route[0]??actor;
}

// Recovery reuses the checked hearth approach and clear points beside a post.
export function brandRecoveryPose(step, place, grid = SOLID_GRID) {
  const at = place.position ?? place;
  const hearth = place.id === step.hearth.id;
  const candidates = hearth ? [step.farWalk[0].position] :
    Array.from({length: BRAND_RULE.recoveryDirections}, (_, index) => {
      const angle = index * Math.PI * 2 / BRAND_RULE.recoveryDirections;
      return {x: at.x + Math.sin(angle) * BRAND_RULE.recoveryLampMetres,
        z: at.z + Math.cos(angle) * BRAND_RULE.recoveryLampMetres};
    });
  for (const point of candidates) {
    const y = scablandsSurfaceHeightAt(point.x, point.z);
    if ([SOLID_GRID, grid].some(solids => pushOutOfSolids(point.x, point.z,
      BRAND_RULE.recoveryClearanceMetres, solids, y).hit)) continue;
    return {...point, y, yaw: Math.atan2(at.x - point.x, at.z - point.z)};
  }
  throw new Error('Light the Town needs a clear place to get up.');
}
