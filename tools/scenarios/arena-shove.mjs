import assert from 'node:assert/strict';
import {writeFile, mkdir, copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, realpathSync, readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join, resolve, sep} from 'node:path';
import {DRIVE} from '../../src/config.js';
import {arenaParticipant, outOfPlay, arenaTargetOutOfPlay} from '../../src/combat-teams.js';

// Production App entry and native Duel contacts/120 Hz steps. Temporary profile,
// starting poses, one-armor wreck setup, stopped motion and held CPU goals are
// labelled fixtures. Renderer calls read state; no solver or actor API is replaced.
async function ready(c, label) {
  await c.waitFor(`(() => {
    const a=window.__qaApp,r=window.__render;a?.onFrame?.(a.duel.state,0);r?.renderFrame();
    if(!a?.visualReady||!r||document.querySelector('#view3d')?.dataset.vehicleAsset!=='ready'||
      !document.querySelector('#renderer-loading')?.hidden)return false;
    const cars=a.duel.state.status==='menu'?[a.menuCar||a.duel.state.car]:
      [a.duel.state.car,...a.duel.state.opponents.map(actor=>actor.car)];
    if(!cars.every(key=>r.scene.children.some(node=>node.userData.vehicleKey===key&&node.userData.vehicleSource)))return false;
    if(a.duel.state.onFoot){
      const group=r.scene.getObjectByName('Rigged on-foot fighters'),id=a.duel.state.fighter?.crewId||'rook';
      if(group?.userData.loadErrors?.length)throw Error('Authored crew failed to load');
      if(group?.userData.crews[id]!=='ready')return false;
      let authored=false;group.children.filter(node=>node.visible&&node.userData.crewId===id)
        .forEach(node=>node.traverse(mesh=>{if(mesh.isSkinnedMesh){let visible=true;
          for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible)visible=false;
          authored ||= visible;}}));
      if(!authored)return false;
    }
    return true;
  })()`,label,60000);
}
async function capture(c, label) {
  await collapseQA(c);
  await ready(c,label+' actual car/crew readiness');
  await c.screenshot(label);
}
function installFixtures(mphToWorld, arenaTargetOutOfPlay) {
  const a=window.__qaApp,dt=1/120;
  const tick=n=>{for(let i=0;i<n;i++)a.duel.step(dt);};
  const pose=(actor,s,lateral=0,headingError=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,
    headingError,speedMph:0,steerVisual:0,yawVelocity:0,pushVelocity:0,slipAngle:0,knock:null,
    airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,contactCooldown:0,damageCooldown:0});
  const member=actor=>a.duel.state.arena.participants.find(p=>p.id===(actor===a.duel.state?'player':actor.arenaId));
  const hold=actor=>{const d=a.duel,at=d.course.worldAt(actor.s,actor.lateral),heading=d.course.at(actor.s).heading+actor.headingError;
    Object.assign(member(actor),{targetId:arenaTargetOutOfPlay(d,d.state)?null:'player',targetHeldSec:-100,reactionSec:10,
      goal:{x:at.x+Math.sin(heading)*30,z:at.z+Math.cos(heading)*30,speedMph:0,boost:false}});};
  const shell=(x,y)=>{const d=a.duel,A=d._vehicleSpec(x),B=d._vehicleSpec(y),alpha=x.headingError||0,beta=y.headingError||0;
    return{width:A.halfWidth*Math.abs(Math.cos(alpha))+B.halfWidth*Math.abs(Math.cos(beta))+
      A.halfLength*Math.abs(Math.sin(alpha))+B.halfLength*Math.abs(Math.sin(beta))+.2,
      length:A.halfLength*Math.abs(Math.cos(alpha))+B.halfLength*Math.abs(Math.cos(beta))+
      A.halfWidth*Math.abs(Math.sin(alpha))+B.halfWidth*Math.abs(Math.sin(beta))+.3};};
  function approach(mph,normal=false,side=1){const d=a.duel,s=d.state,b=s.opponents[0];
    pose(s,20);d._vehicleContact(s,b,'rival'); // Native separation clears the previous real incident.
    pose(s,b.s,b.lateral,normal?side*Math.PI/2:0);const envelope=shell(s,b);
    pose(s,normal?b.s:b.s-envelope.length-.02,normal?b.lateral-side*(envelope.width+.02):b.lateral,normal?side*Math.PI/2:0);
    s.speedMph=mph+1.1;d.setInput({throttle:0,brake:0,steer:0,boost:false});
  }
  function prepare(kind,mph,normal=false,side=1){
    if(!a.restart())throw Error('Production arena rematch failed');tick(362);
    const d=a.duel,s=d.state,b=s.opponents[0];
    if(s.status!=='racing'||s.arena.phase!=='fight')throw Error('Actual arena countdown did not finish');
    s.combat.aiTimer=s.combat.pickupTimer=Infinity; // Isolate car contact from unrelated weapon/crate timing.
    pose(s,20);pose(b,90);hold(b);d.setInput({throttle:0,brake:0,steer:0,boost:false});
    if(kind==='wreck'||kind==='protected'){
      b.armor=1;approach(60);d._drive(dt);
      if(!d._vehicleContact(s,b,'rival')||!b.combatWrecking)throw Error('Native owned contact failed to create wreck');
      tick(1);
      if(kind==='protected'){
        for(let n=0;n<430&&b.combatWrecking;n++)tick(1);
        if(b.combatWrecking||member(b).protectedSec!==2||b.armor!==b.maxArmor)
          throw Error('Native deadline/full-armor/two-second protection failed');
      }
    }
    const limit=d.course.def.scrapdome.floorHalfWidth;
    pose(b,90,normal||kind==='pinned'?side*(limit+.01):0,kind==='pinned'&&!normal?side*Math.PI/2:0);
    hold(b);if(normal||kind==='pinned')tick(1); // Actual event containment pins the stopped actor.
    approach(mph,normal,side);
    window.__shoveCase={kind,mph,normal,side,initial:d.course.worldAt(b.s,b.lateral),
      armor:b.armor,attackerArmor:s.armor,timer:b.combatWreckTimer,protection:member(b).protectedSec,
      count:member(b).wrecked,limit};
    return{...window.__shoveCase,car:s.car,targetCar:b.car,stopped:b.speedMph,
      wreck:b.combatWrecking,protectedSec:member(b).protectedSec,wall:b.lateral};
  }
  function hit(){const d=a.duel,s=d.state,b=s.opponents[0],q=window.__shoveCase,frame=d.course.at(b.s);
    d._drive(dt);const incoming=q.normal?Math.abs(Math.sin(s.headingError)*s.speedMph):s.speedMph;
    if(incoming+1e-8<q.mph||!d._vehicleContact(s,b,'rival'))throw Error('Actual swept ram missed the fixture threshold/contact');
    const start=s.lateral;let moved=0,reverse=0,rebound=0,air=0;
    for(let n=0;n<210;n++){
      tick(1);const at=d.course.worldAt(b.s,b.lateral);
      moved=Math.max(moved,Math.hypot(at.x-q.initial.x,at.z-q.initial.z));air=Math.max(air,b.airHeight||0);
      if(Math.abs(b.lateral)>q.limit+1e-8||Math.abs(s.lateral)>q.limit+1e-8)throw Error('Native bodies escaped the solid arena');
      const k=s.knock,velocity=k?q.side*(k.vx*Math.cos(frame.heading)-k.vz*Math.sin(frame.heading)):
        q.side*(Math.sin(s.headingError)*s.speedMph*mphToWorld+(s.pushVelocity||0));
      reverse=Math.max(reverse,-velocity);rebound=Math.max(rebound,q.side*(start-s.lateral));
    }
    return{kind:q.kind,mph:q.mph,normal:q.normal,side:q.side,incoming,moved,reverse,rebound,air,
      armorBefore:q.armor,armorAfter:b.armor,attackerArmorBefore:q.attackerArmor,attackerArmorAfter:s.armor,
      initialTimer:q.timer,remainingTimer:b.combatWreckTimer,wreck:b.combatWrecking,
      protectedSec:member(b).protectedSec,wreckCount:member(b).wrecked,targetLateral:b.lateral,limit:q.limit};
  }
  function deadline(){const d=a.duel,b=d.state.opponents[0];let ticks=0;
    while(b.combatWrecking&&ticks<430){tick(1);ticks++;}
    return{ticks,wreck:b.combatWrecking,armor:b.armor,maxArmor:b.maxArmor,
      protectedSec:member(b).protectedSec,wreckCount:member(b).wrecked};}
  window.__shove={prepare,hit,deadline};return true;
}

const REFERENCE='0f934845',PUBLIC_SEED=1989;
// This is a QA-output snapshot, never a worktree or a source overlay. The
// independent browser worker runs the same owned recipe against the real App.
export async function preparePublicBaseline() {
  const lane=resolve(fileURLToPath(new URL('../../',import.meta.url))),integration=resolve(lane,'../..');
  assert.ok(lane.toLowerCase().startsWith((integration+sep+'.lanes'+sep).toLowerCase()));
  const commit=execFileSync('git',['rev-parse',REFERENCE],{cwd:lane,encoding:'utf8'}).trim();
  const publicTree=ref=>execFileSync('git',['ls-tree','-r',ref,'--','public'],{cwd:lane,encoding:'utf8'});
  assert.equal(publicTree(commit),publicTree('HEAD'),'baseline and candidate runtime asset bytes are identical');
  const different=execFileSync('git',['diff','--name-only',commit,'HEAD','--','src'],{cwd:lane,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  const granted=new Set(['src/arena/arena-event.js','src/sim-contacts.js','src/vehicle-collision.js','src/vehicle-knock.js','src/arena/arena-floor.js']);
  assert.ok(different.every(path=>granted.has(path)),'reference differs only in the granted Shove source');
  const qa=join(integration,'.qa-dist');await mkdir(qa,{recursive:true});
  const home=mkdtempSync(join(qa,'arena-shove-public-baseline-'));
  assert.ok(resolve(home).toLowerCase().startsWith((resolve(qa)+sep).toLowerCase()));
  const archive=join(home,'reference.tar'),snapshot=join(home,'snapshot');await mkdir(snapshot);
  execFileSync('git',['archive','--format=tar','--output',archive,commit,'src','public','tools','index.html','package.json','package-lock.json','vite.config.js'],{cwd:lane});
  execFileSync('tar',['-xf',archive,'-C',snapshot]);
  await mkdir(join(snapshot,'tools/scenarios'),{recursive:true});
  const archived=execFileSync('git',['ls-tree','-rz',commit,'--','src','public','tools','index.html','package.json','package-lock.json','vite.config.js'],{cwd:lane,encoding:'utf8'}).split('\0').filter(Boolean);
  for(const entry of archived){const [header,path]=entry.split('\t'),[mode,kind,expected]=header.split(' ');assert.equal(kind,'blob');
    const bytes=readFileSync(join(snapshot,path)),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual,expected,'actual archived source/runtime bytes: '+path);}
  await copyFile(fileURLToPath(import.meta.url),join(snapshot,'tools/scenarios/arena-shove.mjs'));
  const dependencies=realpathSync(join(integration,'node_modules')),junction=join(snapshot,'node_modules');
  assert.equal(dependencies.toLowerCase().startsWith('c:'+sep+'users'+sep+'kyleb'+sep+'dev'+sep+'the-duel-remake'),false,'never link live dependencies');
  const psQuote=value=>"'"+value.replaceAll("'","''")+"'";
  execFileSync('powershell',['-NoProfile','-Command',`New-Item -ItemType Junction -Path ${psQuote(junction)} -Target ${psQuote(dependencies)} | Out-Null`]);
  const provenance={commit,verifiedArchivedFiles:archived.length,sourceDifferences:different,runtimeAssetTree:publicTree(commit),snapshot,junction,dependencies,
    command:'ARENA_SHOVE_PUBLIC_ONLY=1 node tools/browser-harness.mjs scenario arena-shove --output-dir .evidence/2026-10-01/ARENA-SHOVE/public-baseline',
    cleanup:'Resolve and verify snapshot remains inside integration/.qa-dist. Unlink node_modules junction nonrecursively before deleting checked QA output. No forced worktree or history action.'};
  await writeFile(join(home,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  return provenance;
}
async function collapseQA(c) {
  const points=await c.evaluate(`(() => [...document.querySelectorAll('details[open]')].flatMap(panel=>{
    const summary=panel.querySelector('summary'),title=summary?.textContent||'';
    if(!/TEMPORARY SAVES|Performance samples/.test(title)||panel.hidden)return [];
    const r=summary.getBoundingClientRect();return r.width&&r.height?[{x:r.x+r.width/2,y:r.y+r.height/2}]:[];
  }))()`);
  for(const point of points)for(const type of ['mousePressed','mouseReleased'])
    await c.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});
  assert.equal(await c.evaluate(`[...document.querySelectorAll('details[open]')].some(panel=>!panel.hidden&&/TEMPORARY SAVES|Performance samples/.test(panel.querySelector('summary')?.textContent||''))`),false,
    'private overlay is collapsed through its actual summary control');
}
function installReviewTools(mphToWorld,arenaTargetOutOfPlay,sweepObstacle) {
  const a=window.__qaApp,dt=1/120,r=window.__render;
  const actor=id=>id==='player'?a.duel.state:a.duel.state.opponents.find(car=>car.arenaId===id);
  const member=car=>a.duel.state.arena.participants.find(p=>p.id===(car===a.duel.state?'player':car.arenaId));
  const tick=n=>{for(let i=0;i<n;i++)a.duel.step(dt);};
  const uiTick=n=>{for(let i=0;i<n;i++)a.advance(dt);};
  const paint=()=>{a.onFrame?.(a.duel.state,0);r.renderFrame();r.scene.updateMatrixWorld(true);};
  const visible=node=>{for(let at=node;at;at=at.parent)if(!at.visible)return false;return true;};
  const pose=(car,s,lateral=0,headingError=0)=>Object.assign(car,{s,prevS:s,lateral,prevLateral:lateral,headingError,
    speedMph:0,yawVelocity:0,pushVelocity:0,steerVisual:0,slipAngle:0,knock:null,tumble:null,
    airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,contactCooldown:0,damageCooldown:0});
  const hold=(car,speedMph=0)=>{if(car===a.duel.state){a.duel.setInput({throttle:0,brake:0,steer:0,boost:false});return;}
    const d=a.duel,g=d.course.worldAt(car.s,car.lateral),heading=d.course.at(car.s).heading+car.headingError;
    Object.assign(member(car),{targetId:arenaTargetOutOfPlay(d,d.state)?null:'player',targetHeldSec:-100,reactionSec:10,
      goal:{x:g.x+Math.sin(heading)*30,z:g.z+Math.cos(heading)*30,speedMph,boost:false}});};
  function roots(){paint();const used=new Set(),all=[];r.scene.traverse(node=>{if(node.userData.vehicleKey&&node.userData.vehicleSource&&visible(node))all.push(node);});
    return [a.duel.state,...a.duel.state.opponents].map(car=>{const at=a.duel.course.worldAt(car.s,car.lateral),choices=all.filter(node=>!used.has(node)&&node.userData.vehicleKey===car.car)
      .sort((x,y)=>{const xp=x.getWorldPosition(x.position.clone()),yp=y.getWorldPosition(y.position.clone());return Math.hypot(xp.x-at.x,xp.z-at.z)-Math.hypot(yp.x-at.x,yp.z-at.z);});
      if(!choices.length)throw Error('Actual visible authored car root missing: '+car.car);used.add(choices[0]);return {car,node:choices[0]};});}
  function faces(node,matrix=null){const rows=[];node.traverse(mesh=>{if(!mesh.isMesh||!visible(mesh)||!mesh.geometry?.attributes.position||(Array.isArray(mesh.material)?mesh.material.every(mat=>!mat.visible):mesh.material?.visible===false))return;
    const g=mesh.geometry,p=g.attributes.position,count=g.index?.count??p.count;
    if(count>750000)throw Error('Bounded actual mesh inspection exceeds 250k triangles');
    for(let i=0;i<count;i+=3)rows.push({mesh:mesh.name,points:[0,1,2].map(offset=>mesh.position.clone().fromBufferAttribute(p,g.index?g.index.getX(i+offset):i+offset)
      .applyMatrix4(matrix||mesh.matrixWorld).toArray())});});return rows;}
  function geometry(){return roots().map(({car,node})=>{const rows=faces(node),points=rows.flatMap(row=>row.points),offsets=points.map(p=>a.duel.course.nearest(p[0],p[2],car.s).lateral),spec=a.duel._vehicleSpec(car);
    return {id:car===a.duel.state?'player':car.arenaId,car:car.car,source:node.userData.vehicleSource,authoredKit:!!node.getObjectByName('authored-kit'),
      frontMeshes:[...new Set(rows.map(row=>row.mesh).filter(name=>/front|bull|bar|crossbow|kit/i.test(name)))],triangles:rows.length,
      lateralMin:offsets.reduce((x,y)=>Math.min(x,y),Infinity),lateralMax:offsets.reduce((x,y)=>Math.max(x,y),-Infinity),floorLimit:a.duel.course.def.scrapdome.floorHalfWidth,
      center:{s:car.s,lateral:car.lateral,heading:car.headingError,speedMph:car.speedMph},nativeEnvelope:{halfWidth:spec.halfWidth,halfLength:spec.halfLength},rows,points};});}
  function wallGeometry(){paint();const barriers=a.duel.course.features.barriers,near=barriers.map((feature,index)=>({feature,index,
    distance:Math.hypot(feature.x-a.duel.course.worldAt(a.duel.state.s,a.duel.state.lateral).x,feature.z-a.duel.course.worldAt(a.duel.state.s,a.duel.state.lateral).z)})).filter(row=>row.feature.arenaWall).sort((x,y)=>x.distance-y.distance).slice(0,4);
    const meshes=[];r.scene.traverse(mesh=>{if(mesh.isInstancedMesh&&visible(mesh)&&mesh.count===barriers.length&&mesh.geometry?.attributes.position){
      const p=mesh.geometry.attributes.position,coords=Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),range=i=>Math.max(...coords.map(p=>p[i]))-Math.min(...coords.map(p=>p[i]));
      if(Math.abs(range(2)-8)<1e-5&&Math.abs(range(1)-.38)<1e-5)meshes.push(mesh);}});
    if(!meshes.length)throw Error('Actual instanced arena rail geometry not found');
    return meshes.flatMap(mesh=>near.map(({feature,index})=>{const matrix=mesh.matrixWorld.clone();mesh.getMatrixAt(index,matrix);matrix.premultiply(mesh.matrixWorld);
      return {feature:{id:feature.id,x:feature.x,y:feature.y,z:feature.z,heading:feature.heading,arenaWall:feature.arenaWall},instance:index,
        rows:faces(mesh,matrix),mesh:mesh.name||mesh.type};}));}
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
  function strictCross(a,b){const norm=face=>{const n=cross(sub(face[1],face[0]),sub(face[2],face[0])),len=Math.hypot(...n);return n.map(v=>v/len);},an=norm(a),bn=norm(b),ad=a.map(p=>dot(bn,sub(p,b[0]))),bd=b.map(p=>dot(an,sub(p,a[0]))),eps=1e-7;
    if(![ad,bd].every(d=>Math.min(...d)<-eps&&Math.max(...d)>eps))return false;
    const line=cross(an,bn),len=Math.hypot(...line);if(len<eps)return false;const direction=line.map(v=>v/len);
    const slice=(face,distances)=>{const values=[];for(let i=0;i<3;i++){const j=(i+1)%3;if(Math.abs(distances[i])<=eps)values.push(dot(face[i],direction));
      if(distances[i]*distances[j]<0){const t=distances[i]/(distances[i]-distances[j]);values.push(dot(face[i].map((v,k)=>v+(face[j][k]-v)*t),direction));}}return values;};
    const av=slice(a,ad),bv=slice(b,bd);return Math.min(Math.max(...av),Math.max(...bv))-Math.max(Math.min(...av),Math.min(...bv))>eps;}
  const overlap=(a,b)=>[0,1,2].every(i=>Math.max(...a.map(p=>p[i]))>=Math.min(...b.map(p=>p[i]))&&Math.max(...b.map(p=>p[i]))>=Math.min(...a.map(p=>p[i])));
  function measure(){const cars=geometry(),walls=wallGeometry();return {stageTimeSec:a.duel.state.stageTimeSec,seed:a.duel.state.seed,
    wallPolicy:{floorHalfWidth:a.duel.course.def.scrapdome.floorHalfWidth,wallOffset:a.duel.course.def.scrapdome.wallOffset,scope:'Existing center containment; mesh/attachment clearance is measured separately, never assumed.'},
    cars:cars.map(({rows,points,...car})=>({...car,crossings:walls.flatMap(wall=>rows.flatMap((row,index)=>wall.rows.flatMap((surface,face)=>overlap(row.points,surface.points)&&strictCross(row.points,surface.points)?[{mesh:row.mesh,face:index,wall:wall.feature.id,wallFace:face}]:[])))})),
    walls:walls.map(wall=>({feature:wall.feature,instance:wall.instance,mesh:wall.mesh,triangles:wall.rows.length,points:wall.rows.flatMap(row=>row.points)}))};}
  function view(mode,scope='both'){const before=JSON.stringify([a.duel.state,...a.duel.state.opponents].map(car=>[car.s,car.lateral,car.speedMph,car.armor,car.combatWreckTimer])),cars=geometry(),selected=scope==='player'&&mode!=='world'?cars.filter(car=>car.id==='player'):cars;
    const points=selected.flatMap(car=>car.points),center=points.reduce((sum,p)=>sum.map((v,i)=>v+p[i]),[0,0,0]).map(v=>v/points.length),radius=points.reduce((max,p)=>Math.max(max,Math.hypot(...sub(p,center))),3),heading=a.duel.course.at(a.duel.state.s).heading;
    const distance=Math.max(mode==='world'?100:mode==='medium'?24:12,radius*3.4),side=a.duel.state.lateral>0?-1:1;
    a.inspectionCamera={position:[center[0]+Math.sin(heading)*distance*.45+Math.cos(heading)*side*distance*.65,center[1]+distance*.75,
      center[2]+Math.cos(heading)*distance*.45-Math.sin(heading)*side*distance*.65],target:center};
    r.camera.position.fromArray(a.inspectionCamera.position);r.camera.lookAt(...center);r.camera.updateMatrixWorld(true);paint();
    const projection=cars.map(car=>{const projected=car.points.map(point=>r.camera.position.clone().fromArray(point).project(r.camera));return {id:car.id,
      inFrame:projected.every(p=>Math.abs(p.x)<.98&&Math.abs(p.y)<.98&&p.z>=-1&&p.z<=1),
      x:[projected.reduce((v,p)=>Math.min(v,p.x),Infinity),projected.reduce((v,p)=>Math.max(v,p.x),-Infinity)],y:[projected.reduce((v,p)=>Math.min(v,p.y),Infinity),projected.reduce((v,p)=>Math.max(v,p.y),-Infinity)],source:car.source,triangles:car.triangles};});
    if(JSON.stringify([a.duel.state,...a.duel.state.opponents].map(car=>[car.s,car.lateral,car.speedMph,car.armor,car.combatWreckTimer]))!==before)throw Error('Inspection camera changed native actor state');
    if(projection.filter(p=>scope==='both'||mode==='world'||p.id==='player').some(p=>!p.inFrame))throw Error('Actual required authored actor geometry is outside the inspection frame');
    return {mode,scope,camera:a.inspectionCamera,projection};}
  function publicStart(){if(a.autopilot)throw Error('Public control must be driven by real input, not autopilot');if(!a.restart())throw Error('Public native rematch failed');return {countdown:a.duel.state.countdown,seed:a.duel.state.seed};}
  function publicCountdown(){uiTick(362);const d=a.duel,s=d.state,spec=d._vehicleSpec(s);
    if(s.status!=='racing'||s.arena.phase!=='fight')throw Error('Public countdown not completed by native ticks');
    if(Math.abs(s.lateral)+spec.halfWidth>=d.course.def.scrapdome.floorHalfWidth)throw Error('Public spawn body is not fully inside floor');
    window.__publicWall={startS:s.s,inputs:[],trace:[],samples:[],events:[],contacts:[],boundaryContacts:[],observerErrors:[],tick:-1};return {s:s.s,lateral:s.lateral,seed:s.seed,car:s.car,opponents:s.opponents.map(car=>car.car)};}
  function publicDrive(side,alongTicks,recorded=null){const d=a.duel,s=d.state,q=window.__publicWall;let touched=false;
    const off=d.onChange((_,event)=>{const keys=['scrape','crash','combatWreck','combatRecovered','arenaWallHit','vehicleSmash','combatRamHit','boundaryReset'].filter(key=>event[key]);
      if(keys.length)q.events.push({tick:q.tick,time:s.stageTimeSec,keys,zone:event.zone||null,strength:event.strength||null,wall:event.arenaWallHit||null});
      if(event.arenaWallHit?.id==='player'){
        const wall=structuredClone(event.arenaWallHit),limit=d.course.def.scrapdome.floorHalfWidth,atSide=Math.sign(s.lateral),
          eventState={s:s.s,lateral:s.lateral,heading:s.headingError,speedMph:s.speedMph,pushVelocity:s.pushVelocity||0,armor:s.armor,
            world:d.course.worldAt(s.s,s.lateral),nativeInput:structuredClone(s.input)},
          remainingNormalMph=Math.max(0,atSide*(Math.sin(s.headingError)*s.speedMph+(s.pushVelocity||0)/mphToWorld)),
          changedResponse=q.stepBefore&&(Math.abs(s.speedMph)<Math.abs(q.stepBefore.speedMph)-1e-7||
            Math.abs(s.headingError-q.stepBefore.heading)>1e-7||Math.abs(s.pushVelocity||0)<Math.abs(q.stepBefore.pushVelocity)-1e-7);
        q.boundaryContacts.push({tick:q.tick,time:s.stageTimeSec,path:'actual arenaWallHit emission',event:wall,side:atSide,chosen:atSide===side,
          limit,beforeStep:q.stepBefore,eventState,remainingNormalMph,afterStep:null,
          physicalResponse:wall.normalMph>0&&s.lateral===atSide*limit&&remainingNormalMph<wall.normalMph-1e-7&&!!changedResponse});
      }
    });
    const descriptor=Object.getOwnPropertyDescriptor(d,'_staticContacts'),original=d._staticContacts;
    q.wrapperCalls=0;q.originalCalls=0;
    d._staticContacts=function(...args){
      q.wrapperCalls++;let before=null;
      try{const car=args[0];if(car===s&&!car.crushed&&!car.combatWrecking&&!car.tumble){
        const oldS=car.prevS??car.s,oldLateral=car.prevLateral??car.lateral,start=d.course.worldAt(oldS,oldLateral),end=d.course.worldAt(car.s,car.lateral);
        if(car.airborne||car.airHeight>0||car.prevAirHeight>0||car.groundHeight!=null){
          start.y=(car.prevGroundHeight??d.course.groundAt(oldS,oldLateral).y)+(car.prevAirHeight??car.airHeight??0);
          end.y=(car.groundHeight??d.course.groundAt(car.s,car.lateral).y)+(car.airHeight||0);
        }else{start.y=end.y=undefined;}
        before={s:car.s,lateral:car.lateral,oldS,oldLateral,speedMph:car.speedMph,pushVelocity:car.pushVelocity||0,
          start,end,heading:d.course.at(car.s).heading+(car.headingError||0)+(car.dir<0?Math.PI:0)+(car.slipAngle||0),dimensions:d._vehicleSpec(car)};
      }}catch(error){q.observerErrors.push(error.message);}
      q.originalCalls++;
      const result=Reflect.apply(original,this,args); // Captured production method, once, original receiver and arguments.
      try{if(before){let first=null;
        // Native query runs after production resolution; it cannot alter that call's chosen hit or result.
        for(const obstacle of d._obstacles(before.oldS,before.s)){
          const hit=sweepObstacle(before.start,before.end,obstacle,before.heading,before.dimensions);
          if(hit&&(!first||hit.t<first.t))first=hit;
        }
        if(first?.obstacle.arenaWall){const car=args[0],afterWorld=d.course.worldAt(car.s,car.lateral),
          correctionAlongNormal=(afterWorld.x-before.end.x)*first.nx+(afterWorld.z-before.end.z)*first.nz,
          reducedSpeed=Math.abs(car.speedMph)<Math.abs(before.speedMph)-1e-7,
          chosenSide=Math.sign(first.obstacle.off??d.course.nearest(first.obstacle.x,first.obstacle.z,before.s).lateral);
          q.contacts.push({tick:q.tick,time:s.stageTimeSec,side:chosenSide,chosen:chosenSide===side,
            originalInvocation:q.originalCalls,playerArgument:args[1],returnType:typeof result,returnUndefined:result===undefined,
            before,hit:{t:first.t,nx:first.nx,nz:first.nz,penetration:first.penetration,inside:first.inside,obstacle:structuredClone(first.obstacle)},
            after:{s:car.s,lateral:car.lateral,speedMph:car.speedMph,pushVelocity:car.pushVelocity||0,world:afterWorld},
            correctionAlongNormal,reducedSpeed,physicalResponse:correctionAlongNormal>1e-7&&reducedSpeed});
        }
      }}catch(error){q.observerErrors.push(error.message);}
      return result;
    };
    try{
    for(let i=0;i<(recorded?recorded.length:alongTicks+2400);i++){
      const toward=i<alongTicks?0:side*Math.PI/2,error=Math.atan2(Math.sin(toward-s.headingError),Math.cos(toward-s.headingError));
      const input=recorded?recorded[i]:{KeyW:true,ArrowLeft:error>.1,ArrowRight:error<-.1};
      for(const [code,key] of [['KeyW','w'],['ArrowLeft','ArrowLeft'],['ArrowRight','ArrowRight']])if(!!a.keys[code]!==!!input[code])
        window.dispatchEvent(new KeyboardEvent(input[code]?'keydown':'keyup',{code,key,bubbles:true}));
      q.tick=i;q.stepBefore={s:s.s,lateral:s.lateral,heading:s.headingError,speedMph:s.speedMph,pushVelocity:s.pushVelocity||0,armor:s.armor,
        world:d.course.worldAt(s.s,s.lateral),nativeInput:structuredClone(s.input),keys:{KeyW:!!a.keys.KeyW,ArrowLeft:!!a.keys.ArrowLeft,ArrowRight:!!a.keys.ArrowRight}};
      a.advance(dt);
      for(const receipt of q.boundaryContacts)if(receipt.tick===i)receipt.afterStep={s:s.s,lateral:s.lateral,heading:s.headingError,speedMph:s.speedMph,
        pushVelocity:s.pushVelocity||0,armor:s.armor,world:d.course.worldAt(s.s,s.lateral),nativeInput:structuredClone(s.input)};
      q.samples.push({tick:i,time:s.stageTimeSec,status:s.status,paused:s.paused,inputContext:a.activeInputContext(),
        keys:{KeyW:!!a.keys.KeyW,KeyA:!!a.keys.KeyA,KeyD:!!a.keys.KeyD,ArrowLeft:!!a.keys.ArrowLeft,ArrowRight:!!a.keys.ArrowRight},
        s:s.s,lateral:s.lateral,heading:s.headingError,speedMph:s.speedMph,armor:s.armor,combatWrecking:!!s.combatWrecking,nativeInput:structuredClone(s.input)});
      q.inputs.push(input);if(i%12===0)q.trace.push({tick:i,s:s.s,lateral:s.lateral,heading:s.headingError,speedMph:s.speedMph,armor:s.armor,nativeInput:structuredClone(s.input)});
      if(i>=alongTicks&&(q.contacts.some(contact=>contact.tick>=alongTicks&&contact.chosen&&contact.physicalResponse)||
        q.boundaryContacts.some(contact=>contact.tick>=alongTicks&&contact.chosen&&contact.physicalResponse&&contact.afterStep))){touched=true;if(!recorded)break;}}
    }finally{
      if(descriptor)Object.defineProperty(d,'_staticContacts',descriptor);else delete d._staticContacts;
      off();
      for(const [code,key] of [['KeyW','w'],['ArrowLeft','ArrowLeft'],['ArrowRight','ArrowRight']])window.dispatchEvent(new KeyboardEvent('keyup',{code,key,bubbles:true}));
      q.restored=d._staticContacts===original;
    }
    if(!q.restored||q.originalCalls!==q.wrapperCalls||q.observerErrors.length)
      throw Error('Native contact observation failed its once-only/restoration contract: '+JSON.stringify({restored:q.restored,calls:q.originalCalls,wrappers:q.wrapperCalls,errors:q.observerErrors}));
    if(!touched){
      const at=d.course.worldAt(s.s,s.lateral),heading=d.course.at(s.s).heading+s.headingError,spec=d._vehicleSpec(s);
      const nearby=d._obstacles(s.s-8,s.s+8).filter(obstacle=>obstacle.arenaWall).map(obstacle=>{
        const cs=Math.cos(obstacle.heading||0),sn=Math.sin(obstacle.heading||0),relative=heading-(obstacle.heading||0),
          localX=(at.x-obstacle.x)*cs-(at.z-obstacle.z)*sn,localZ=(at.x-obstacle.x)*sn+(at.z-obstacle.z)*cs;
        return {id:obstacle.id,x:obstacle.x,z:obstacle.z,heading:obstacle.heading,halfX:obstacle.halfX,halfZ:obstacle.halfZ,
          localX,localZ,expandedHalfX:obstacle.halfX+spec.halfWidth*Math.abs(Math.cos(relative))+spec.halfLength*Math.abs(Math.sin(relative)),
          expandedHalfZ:obstacle.halfZ+spec.halfLength*Math.abs(Math.cos(relative))+spec.halfWidth*Math.abs(Math.sin(relative))};
      }).sort((x,y)=>Math.hypot(x.localX,x.localZ)-Math.hypot(y.localX,y.localZ)).slice(0,6);
      window.__publicWallFailure={side,alongTicks,touched,limitSeconds:20,predicate:'actual chosen-wall static sweep response or actual player arenaWallHit clamped state and physical response',
        inputs:q.inputs,trace:q.trace,samples:q.samples,events:q.events,contacts:q.contacts,boundaryContacts:q.boundaryContacts,
        final:{s:s.s,lateral:s.lateral,heading:s.headingError,world:at,nativeHeading:heading,speedMph:s.speedMph,armor:s.armor,
          status:s.status,paused:s.paused,inputContext:a.activeInputContext(),nativeInput:structuredClone(s.input),nativeEnvelope:spec,nearbyWalls:nearby},...measure()};
      throw Error('Legal public controls did not reach chosen wall within twenty seconds');
    }
    return {side,alongTicks,touched,inputs:q.inputs,trace:q.trace,samples:q.samples,events:q.events,contacts:q.contacts,boundaryContacts:q.boundaryContacts,
      observation:{restored:q.restored,wrapperCalls:q.wrapperCalls,originalCalls:q.originalCalls,errors:q.observerErrors},...measure()};}
  function scripted(kind,role,side=1,normal=false,oblique=0,segment=260){
    if(!a.restart())throw Error('Scripted native rematch failed');tick(362);const d=a.duel,s=d.state,cpu=s.opponents[0],target=role==='player-attacker'?cpu:s,attacker=target===s?cpu:s;
    s.combat.aiTimer=s.combat.pickupTimer=Infinity;pose(s,20);pose(cpu,90);hold(cpu);
    function approach(mph){const heading=normal?side*Math.PI/2-oblique:0;
      pose(attacker,target.s,target.lateral,heading);const A=d._vehicleSpec(attacker),B=d._vehicleSpec(target),alpha=attacker.headingError,beta=target.headingError;
      const width=A.halfWidth*Math.abs(Math.cos(alpha))+B.halfWidth*Math.abs(Math.cos(beta))+A.halfLength*Math.abs(Math.sin(alpha))+B.halfLength*Math.abs(Math.sin(beta))+.2;
      const length=A.halfLength*Math.abs(Math.cos(alpha))+B.halfLength*Math.abs(Math.cos(beta))+A.halfWidth*Math.abs(Math.sin(alpha))+B.halfWidth*Math.abs(Math.sin(beta))+.3;
      pose(attacker,normal?target.s:target.s-length-.02,normal?target.lateral-side*(width+.02):target.lateral,heading);
      hold(attacker,(mph+1.1)/Math.cos(oblique));attacker.speedMph=(mph+1.1)/Math.cos(oblique);}
    if(kind==='wreck'||kind==='protected'){target.armor=1;approach(60);d._vehicleContact(attacker,target,'rival');tick(1);
      if(!target.combatWrecking)throw Error('Real owned contact did not create scripted wreck');
      if(kind==='protected'){for(let n=0;n<430&&target.combatWrecking;n++)tick(1);
        if(target.combatWrecking||member(target).protectedSec!==2||target.armor!==target.maxArmor)throw Error('Real scripted deadline/protection failed');}}
    const limit=d.course.def.scrapdome.floorHalfWidth,pinned=normal||kind==='pinned';
    pose(target,segment,pinned?side*(limit+.01):0,kind==='pinned'&&!normal?side*Math.PI/2:0);hold(target);if(pinned||kind==='wreck')tick(1);
    approach(40);const start=d.course.worldAt(target.s,target.lateral),frame=d.course.at(target.s),events=[];
    const off=d.onChange((_,event)=>{if(event.vehicleSmash||event.combatRamHit)events.push({time:s.stageTimeSec,event:structuredClone(event)});});
    window.__shoveExtended={kind,role,side,normal,oblique,target,attacker,start,frame,events,off,ticks:0,moved:0,tangent:0,reverse:0,rebound:0,air:0,
      targetArmor:target.armor,attackerArmor:attacker.armor,timer:target.combatWreckTimer,protectedSec:member(target).protectedSec,limit,attackerStart:attacker.lateral};
    return {kind,role,side,normal,oblique,segment,poseScope:pinned?'Explicit center-at-floor fixture; full body/front-kit may extend beyond the center boundary. Not public body clearance.':'Explicit stopped native actors on open floor.',...measure()};}
  function observe(){const d=a.duel,q=window.__shoveExtended,t=q.target,x=q.attacker,at=d.course.worldAt(t.s,t.lateral),k=x.knock,
    velocity=k?k.vx*Math.cos(q.frame.heading)-k.vz*Math.sin(q.frame.heading):Math.sin(x.headingError)*x.speedMph*mphToWorld+(x.pushVelocity||0);
    q.moved=Math.max(q.moved,Math.hypot(at.x-q.start.x,at.z-q.start.z));q.tangent=Math.max(q.tangent,Math.abs((at.x-q.start.x)*Math.sin(q.frame.heading)+(at.z-q.start.z)*Math.cos(q.frame.heading)));
    q.reverse=Math.max(q.reverse,-q.side*velocity);q.rebound=Math.max(q.rebound,q.side*(q.attackerStart-x.lateral));q.air=Math.max(q.air,t.airHeight||0);
    if(Math.abs(t.lateral)>q.limit+1e-8||Math.abs(x.lateral)>q.limit+1e-8)throw Error('Real scripted center escaped native containment');}
  function progress(to){const q=window.__shoveExtended;if(to<q.ticks)throw Error('Cannot rewind a native transient');
    while(q.ticks<to){tick(1);q.ticks++;observe();}
    return {kind:q.kind,role:q.role,side:q.side,normal:q.normal,oblique:q.oblique,ticks:q.ticks,moved:q.moved,tangent:q.tangent,reverse:q.reverse,rebound:q.rebound,air:q.air,
      targetArmorBefore:q.targetArmor,targetArmor:q.target.armor,attackerArmorBefore:q.attackerArmor,attackerArmor:q.attacker.armor,
      remainingTimer:q.target.combatWreckTimer,initialTimer:q.timer,protectedSec:member(q.target).protectedSec,wreck:q.target.combatWrecking,
      actualEvents:q.events.map(row=>({time:row.time,smash:row.event.vehicleSmash?{severity:row.event.vehicleSmash.severity,dvMph:row.event.vehicleSmash.dvMph}:null,ram:row.event.combatRamHit||null})),...measure()};}
  window.__shoveReview={geometry:measure,view,publicStart,publicCountdown,publicDrive,scripted,progress,finish(){window.__shoveExtended?.off();}};return true;
}
async function reviewedCapture(c,label,mode='medium',scope='both') {
  await collapseQA(c);await ready(c,label+' actual authored readiness');
  await c.waitFor(`(() => {const a=window.__qaApp,r=window.__render;a.onFrame?.(a.duel.state,0);r.renderFrame();
    let count=0,kit=0;r.scene.traverse(node=>{if(node.userData.vehicleKey&&node.userData.vehicleSource&&node.visible){count++;if(node.getObjectByName('authored-kit'))kit++;}});
    return count>=a.duel.state.opponents.length+1&&kit>=a.duel.state.opponents.length+1&&document.querySelector('#view3d')?.dataset.combatEffectsStatus==='ready';})()`,label+' bounded actual front-kit/effects readiness',60000);
  const view=await c.evaluate(`window.__shoveReview.view(${JSON.stringify(mode)},${JSON.stringify(scope)})`);
  await c.screenshot(label);return view;
}
async function extendedQuality(c,quality,report,save) {
  const wire=`(() => {${arenaParticipant.toString()}\n${outOfPlay.toString()}\nreturn ${arenaTargetOutOfPlay.toString()};})()`;
  const collisionSource=readFileSync(new URL('../../src/collision.js',import.meta.url),'utf8');
  assert.equal(/^import\s/m.test(collisionSource),false,'actual collision observer module has no unbound imported dependencies');
  const collisionWire=`(() => {${collisionSource.replace(/^export /gm,'')}\nreturn sweepObstacle;})()`;
  report.collisionObserverSourceSha256=createHash('sha256').update(collisionSource).digest('hex');
  await c.evaluate(`(${installReviewTools.toString()})(${DRIVE.mphToWorld},${wire},${collisionWire})`);
  // Public/legal-input controls run BEFORE any constructed pinned contact.
  for(const side of [-1,1])for(const alongTicks of [0,360]){
    const label=quality+'-public-'+side+'-'+alongTicks;
    await c.evaluate('window.__shoveReview.publicStart()');await ready(c,label+' real rematch readiness before public controls');
    const start=await c.evaluate('window.__shoveReview.publicCountdown()');
    const before=await reviewedCapture(c,label+'-spawn-world','world','player');
    const startGeometry=await c.evaluate('window.__shoveReview.geometry()'),player=startGeometry.cars.find(car=>car.id==='player');
    assert.ok(player.lateralMin>-player.floorLimit&&player.lateralMax<player.floorLimit,'actual loaded public spawn body and attachments start fully inside floor');
    const reference=process.env.ARENA_SHOVE_PUBLIC_INPUTS_FILE?JSON.parse(readFileSync(resolve(process.env.ARENA_SHOVE_PUBLIC_INPUTS_FILE),'utf8')):null;
    const referenceCase=reference?.publicWalls.find(row=>row.quality===quality&&row.result.side===side&&row.result.alongTicks===alongTicks);
    if(reference){assert.ok(reference.sourceCommit.startsWith('0f934845')&&reference.baselineVerifiedArchivedFiles>0,'actual baseline source bytes were verified');
      assert.equal(reference.runtimeAssetTree,report.runtimeAssetTree,'actual public runtime assets match');assert.ok(referenceCase,'exact public baseline input recipe is present');}

    let result;
    try{result=await c.evaluate(`window.__shoveReview.publicDrive(${side},${alongTicks},${JSON.stringify(referenceCase?.result.inputs||null)})`);}
    catch(error){
      const failure=await c.evaluate('window.__publicWallFailure||null');
      if(failure){const row={quality,start,startGeometry,before,failure,sourceCommit:report.sourceCommit,runtimeAssetTree:report.runtimeAssetTree,
        baselineVerifiedArchivedFiles:report.baselineVerifiedArchivedFiles,error:error.message,views:[]};
        (report.publicFailures??=[]).push(row);await save();
        await writeFile(join(c.outputDir,label+'-failure.json'),JSON.stringify(row,null,2)+'\n');
        for(const mode of ['close','world']){
          try{row.views.push(await reviewedCapture(c,label+'-failure-'+mode,mode,'player'));}
          catch(captureError){row.views.push({mode,captureError:captureError.message});}
          await save();await writeFile(join(c.outputDir,label+'-failure.json'),JSON.stringify(row,null,2)+'\n');
        }
      }
      throw error;
    }
    const views=[];
    if(referenceCase){assert.equal(start.seed,referenceCase.start.seed);assert.equal(start.car,referenceCase.start.car);assert.deepEqual(start.opponents,referenceCase.start.opponents);
      assert.deepEqual(result.inputs,referenceCase.result.inputs,'candidate uses the exact native baseline input stream');}

    assert.ok(result.contacts.some(contact=>contact.chosen&&contact.physicalResponse&&contact.playerArgument===true&&contact.returnUndefined)||
      result.boundaryContacts.some(contact=>contact.chosen&&contact.physicalResponse&&contact.event.id==='player'&&contact.event.normalMph>0&&
        contact.eventState.lateral===result.side*contact.limit&&contact.afterStep),
      'public goal observes actual chosen-wall static hit/response or genuine player containment event/clamped state/response');
    assert.equal(result.observation.restored,true,'actual native contact method is restored before capture');
    assert.equal(result.observation.originalCalls,result.observation.wrapperCalls,'every wrapper delegates its production method exactly once');
    assert.deepEqual(result.observation.errors,[],'native contact observation is complete');
    views.push(await reviewedCapture(c,label+'-wall-close','close','player'));
    views.push(await reviewedCapture(c,label+'-wall-world','world','player'));
    report.publicWalls.push({quality,start,startGeometry,before,result,views,matchedBaselineInputs:!!referenceCase});await save();
    assert.ok(result.touched&&result.cars.every(car=>Math.abs(car.center.lateral)<=result.wallPolicy.floorHalfWidth+1e-8),'actual legal-input actors preserve the existing center policy');
  }
  if(process.env.ARENA_SHOVE_PUBLIC_ONLY==='1')return;
  for(const kind of ['wreck','pinned','protected','idle'])for(const role of ['player-attacker','cpu-attacker']){
    const label=quality+'-roles-'+kind+'-'+role,before=await c.evaluate(`window.__shoveReview.scripted(${JSON.stringify(kind)},${JSON.stringify(role)})`),views=[];
    views.push(await reviewedCapture(c,label+'-before-close','close'));views.push(await reviewedCapture(c,label+'-before-world','world'));
    const during=await c.evaluate('window.__shoveReview.progress(8)');views.push(await reviewedCapture(c,label+'-during-medium','medium'));
    const after=await c.evaluate('window.__shoveReview.progress(210)');views.push(await reviewedCapture(c,label+'-after-close','close'));views.push(await reviewedCapture(c,label+'-after-world','world'));
    report.roleCases.push({quality,before,during,after,views});await save();
    assert.ok(after.moved>=4-1e-8,'both actual attacker roles meet the forty-mph open-direction minimum');
    if(kind==='wreck')assert.ok(after.wreck&&after.air===0&&after.remainingTimer>0&&after.remainingTimer<after.initialTimer,'real stopped-player/CPU wreck preserves native deadline and floor slide');
    if(kind==='protected')assert.ok(after.targetArmor===after.targetArmorBefore&&after.attackerArmor===after.attackerArmorBefore&&after.protectedSec>0,'both real roles preserve actual protection');
    await c.evaluate('window.__shoveReview.finish()');
  }
  for(const role of ['player-attacker','cpu-attacker'])for(const side of [-1,1]){
    const label=quality+'-roles-normal-'+role+'-'+side,before=await c.evaluate(`window.__shoveReview.scripted('idle',${JSON.stringify(role)},${side},true,0,${side<0?260:360})`),views=[];
    views.push(await reviewedCapture(c,label+'-before-close','close'));views.push(await reviewedCapture(c,label+'-before-world','world'));
    const during=await c.evaluate('window.__shoveReview.progress(8)');views.push(await reviewedCapture(c,label+'-during-medium','medium'));
    const after=await c.evaluate('window.__shoveReview.progress(210)');views.push(await reviewedCapture(c,label+'-after-close','close'));views.push(await reviewedCapture(c,label+'-after-world','world'));
    report.extraWalls.push({quality,before,during,after,views});await save();
    assert.ok(after.moved<1e-4&&after.reverse>1e-6&&after.rebound>.01,'both actual attacker roles retain strict normal-wall stay/rebound');
    assert.ok(after.targetArmor<after.targetArmorBefore,'real normal-wall eligible damage remains');await c.evaluate('window.__shoveReview.finish()');
  }
  for(const [role,side,angle] of [['player-attacker',1,Math.PI/12],['cpu-attacker',-1,-Math.PI/12]]){
    const label=quality+'-transient-'+role+'-'+side,before=await c.evaluate(`window.__shoveReview.scripted('idle',${JSON.stringify(role)},${side},true,${angle},260)`),frames=[];
    frames.push({ticks:0,view:await reviewedCapture(c,label+'-before-world','world')});
    for(const [ticks,mode] of [[1,'close'],[24,'medium'],[210,'world']]){const state=await c.evaluate(`window.__shoveReview.progress(${ticks})`),view=await reviewedCapture(c,label+'-tick-'+ticks+'-'+mode,mode);frames.push({ticks,state,view});}
    report.obliques.push({quality,before,frames});await save();
    assert.ok(frames.at(-1).state.tangent>1e-6,'actual oblique transient retains physical along-wall motion');
    await c.evaluate('window.__shoveReview.finish()');
  }
  await c.evaluate('window.__qaApp.inspectionCamera=null');
}

export async function comparePublicWalls(referencePath,candidatePath,outputPath) {
  const reference=JSON.parse(readFileSync(resolve(referencePath),'utf8')),candidate=JSON.parse(readFileSync(resolve(candidatePath),'utf8'));
  assert.ok(reference.sourceCommit.startsWith('0f934845')&&reference.baselineVerifiedArchivedFiles>0,'reference is the verified real pre-card snapshot');
  assert.equal(candidate.runtimeAssetTree,reference.runtimeAssetTree,'matched real runtime asset bytes');
  assert.equal(reference.publicWalls.length,8,'all High/Performance legal wall controls are present');
  assert.equal(candidate.publicWalls.length,8,'candidate has the same full public control matrix');
  const cases=reference.publicWalls.map(before=>{const after=candidate.publicWalls.find(row=>row.quality===before.quality&&row.result.side===before.result.side&&row.result.alongTicks===before.result.alongTicks);
    assert.ok(after);assert.deepEqual(after.result.inputs,before.result.inputs,'identical actual native input stream');
    assert.deepEqual(after.start,before.start,'identical real seed, spawn and actors');
    const player=report=>report.result.cars.find(car=>car.id==='player'),a=player(before),b=player(after);
    const geometryEqual=JSON.stringify({min:a.lateralMin,max:a.lateralMax,center:a.center,crossings:a.crossings})===JSON.stringify({min:b.lateralMin,max:b.lateralMax,center:b.center,crossings:b.crossings});
    const classification=a.crossings.length?b.crossings.length?geometryEqual?'pre-existing public mesh/rail crossing, exact matched geometry':'pre-existing public crossing; candidate geometry differs and needs review':'reference crosses, candidate does not; review required':
      b.crossings.length?'new candidate public mesh/rail crossing':'no public mesh/rail crossing in this matched sample';
    return {quality:before.quality,side:before.result.side,alongTicks:before.result.alongTicks,classification,
      reference:{source:reference.sourceCommit,player:a,wallPolicy:before.result.wallPolicy,walls:before.result.walls},
      candidate:{source:candidate.sourceCommit,player:b,wallPolicy:after.result.wallPolicy,walls:after.result.walls},
      geometryExactlyEqual:geometryEqual,tracesExactlyEqual:JSON.stringify(before.result.trace)===JSON.stringify(after.result.trace),
      scope:'Actual loaded triangles and actual rail instances. Body extent beyond the existing center-limit floor is recorded separately; no new whole-body containment rule is invented.'};});
  const report={reference:reference.sourceCommit,candidate:candidate.sourceCommit,cases,
    verdict:cases.some(row=>/crossing|review required/.test(row.classification)&&!row.classification.startsWith('no public'))?
      'Actual public mismatch needs Claude review; do not repair global source or alter containment in this QA card.':'No public rail crossing in these matched inputs. Constructed fixtures remain separately labelled; this is not all-model/all-wall clearance.',
    limits:'Natural public close views show player/wall; world covers the roster. Matched samples do not grant art, frame, handling or listening clearance.'};
  const scenarioRoot=resolve(fileURLToPath(new URL('../../',import.meta.url))),integration=resolve(scenarioRoot,'../..'),destination=resolve(outputPath);
  assert.ok([join(scenarioRoot,'.evidence'),join(integration,'.evidence')].some(home=>destination.toLowerCase().startsWith((resolve(home)+sep).toLowerCase())),
    'comparison output stays in ignored card evidence');
  await writeFile(destination,JSON.stringify(report,null,2)+'\n');return report;
}

export async function run(c) {
  const scenarioRoot=resolve(fileURLToPath(new URL('../../',import.meta.url))),snapshotProvenance=join(scenarioRoot,'../provenance.json');
  const baseline=process.env.ARENA_SHOVE_PUBLIC_ONLY==='1'&&existsSync(snapshotProvenance)?JSON.parse(readFileSync(snapshotProvenance,'utf8')):null;
  const sourceCommit=baseline?.commit||execFileSync('git',['rev-parse','HEAD'],{cwd:scenarioRoot,encoding:'utf8'}).trim();
  const runtimeAssetTree=baseline?.runtimeAssetTree||execFileSync('git',['ls-tree','-r','HEAD','--','public'],{cwd:scenarioRoot,encoding:'utf8'});
  if(process.env.ARENA_SHOVE_PUBLIC_ONLY!=='1')assert.ok(process.env.ARENA_SHOVE_PUBLIC_INPUTS_FILE,'run verified public baseline first and provide its exact native input report');
  const report={publicWalls:[],roleCases:[],extraWalls:[],obliques:[],publicOnly:process.env.ARENA_SHOVE_PUBLIC_ONLY==='1',sourceCommit,runtimeAssetTree,baselineVerifiedArchivedFiles:baseline?.verifiedArchivedFiles||null,referenceCommit:REFERENCE,publicSeed:PUBLIC_SEED,cases:[],walls:[],frames:[],fixtures:'Memory-only discovered profile, stopped/approach poses, one-armor native wreck setup, real recovery timers, existing held CPU goals and isolated weapon/crate timers. Contacts and subsequent 120 Hz physics remain genuine.',
    limits:'Scripted contact/state captures do not prove natural CPU behavior, human Preview feel, listening or resolved historical HUD overlaps. Native all-mass/FPS/traffic controls remain independent.'};
  const save=()=>writeFile(join(c.outputDir,'arena-shove-browser.json'),JSON.stringify(report,null,2)+'\n');
  for(const quality of ['high','performance']){
    await c.evaluate('window.name=""');
    await c.navigate('/tools/menu-check.html?seed='+PUBLIC_SEED+'&harness=arena-shove-'+quality);
    await c.waitFor('!!window.__qaApp&&!!window.__render',quality+' private menu',60000);
    await c.evaluate(`(() => {const a=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only QA is required');
      a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});a.menuCar='falcone_f42';
      for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false;
      a.profile={...a.profile,wasteland:{...a.profile.wasteland,discoveredGate:true,xp:3500,rank:6}};
      if(!a._saveProfile()||!a.visitWasteland())throw Error('Memory-only discovery fixture failed');})()`);
    await ready(c,quality+' actual yard approach');await c.evaluate('window.__qaApp.advance(8)');
    await c.waitFor('window.__qaApp.isYardHomeActive()',quality+' actual yard');
    await c.evaluate(`(() => {const a=window.__qaApp;if(!a.startArenaEvent({opponents:1}))throw Error('Production arena entry failed');a.setCamera('chase');a.inspectionCamera=null;})()`);
    await c.evaluate(`(${installFixtures.toString()})(${DRIVE.mphToWorld},(() => {
      ${arenaParticipant.toString()}
      ${outOfPlay.toString()}
      return ${arenaTargetOutOfPlay.toString()};
    })())`);
    await extendedQuality(c,quality,report,save);
    if(report.publicOnly)continue;
    await collapseQA(c);
    for(const kind of ['wreck','pinned','protected','idle'])for(const mph of [20,40]){
      const label=quality+'-'+kind+'-'+mph+'mph';
      const before=await c.evaluate(`window.__shove.prepare(${JSON.stringify(kind)},${mph})`);
      assert.equal(before.stopped,0,'target is a real stopped actor');
      if(kind==='wreck')assert.equal(before.wreck,true);
      if(kind==='protected')assert.equal(before.protectedSec,2);
      await capture(c,label+'-before');
      const result=await c.evaluate('window.__shove.hit()');report.cases.push({quality,before,result});await save();
      assert.ok(result.moved+1e-8>=(mph===40?4:1.5),'actual native shove minimum: '+JSON.stringify(result));
      if(kind==='wreck'){assert.equal(result.wreck,true);assert.equal(result.air,0);assert.equal(result.wreckCount,1);
        assert.ok(result.remainingTimer>0&&result.remainingTimer<result.initialTimer);}
      if(kind==='protected'){assert.equal(result.armorAfter,result.armorBefore);assert.equal(result.attackerArmorAfter,result.attackerArmorBefore);assert.ok(result.protectedSec>0);}
      await capture(c,label+'-after');
      if(kind==='wreck'&&mph===40){const recovery=await c.evaluate('window.__shove.deadline()');report.cases.at(-1).recovery=recovery;await save();
        assert.equal(recovery.wreck,false);assert.equal(recovery.armor,recovery.maxArmor);assert.equal(recovery.protectedSec,2);assert.equal(recovery.wreckCount,1);
        await capture(c,quality+'-native-deadline-respawn-protection');}
    }
    for(const side of [-1,1]){
      await c.evaluate(`window.__shove.prepare('idle',40,true,${side})`);
      await capture(c,quality+'-normal-wall-'+side+'-before');
      const result=await c.evaluate('window.__shove.hit()');report.walls.push({quality,result});await save();
      await capture(c,quality+'-normal-wall-'+side+'-after');
      assert.ok(result.moved<1e-4,'pure outward target stays at the solid wall');
      assert.ok(result.armorAfter<result.armorBefore,'eligible normal ram retains armor damage');
      assert.ok(result.reverse>1e-6&&result.rebound>.01,'attacker actually rebounds away from solid wall: '+JSON.stringify(result));
    }
    const frames=await c.evaluate(`(async()=>{const a=window.__qaApp;if(!a.restart())throw Error('Native pacing rematch failed');a.advance(3.1);
      a.duel.setInput({throttle:.45,brake:0,steer:.08,boost:false});a.start();const times=[];let last=0;
      try{for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(last&&i>30)times.push(t-last);last=t;}}
      finally{a.stop();}const sorted=[...times].sort((a,b)=>a-b);
      return{mean:times.reduce((x,y)=>x+y,0)/times.length,p95:sorted[Math.floor(sorted.length*.95)],samples:times.length,
        draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};})()`);
    report.frames.push({quality,...frames});await save();
  }
  await c.evaluate('window.__qaApp.stop()');
  console.log('Arena shove recipe completed its scoped native assertions. Public mesh/solid clearance requires the matched baseline comparison; browser/frame/art/human/listening clearance remains independent.');
}
