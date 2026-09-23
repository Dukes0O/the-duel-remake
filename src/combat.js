import {normalizeWeapons} from './weapon-upgrades.js';
import {contactZone} from './collision.js';
import {NpcRoutePlanner} from './npc-route.js';
import {DRIVE} from './config.js';
import {makeRng} from './rng.js';
// Arcade vehicle combat. All timers and projectile motion use simulation time.
export const WEAPONS=Object.freeze({ufo:{name:'UFO SWAP',key:'1',cooldown:18},bomb:{name:'BOMB STORM',key:'2',cooldown:9},crossbow:{name:'CROSSBOW',key:'3',cooldown:4},star:{name:'STAR SHIELD',key:'4',cooldown:16}});
const CPU_COMBAT=Object.freeze({
 easy:{interval:10,aimError:Math.PI/18,shieldReaction:.20,visionCos:.5},
 medium:{interval:7,aimError:.055,shieldReaction:.13,visionCos:.26},
 hard:{interval:5,aimError:.03,shieldReaction:.07,visionCos:.09},
});
export const supportsCombat=stage=>!!stage?.hasRival&&!stage.practice&&!stage.stuntTrial;
export function createCombat(levels){return {levels:normalizeWeapons({levels}).levels,cooldowns:{ufo:0,bomb:0,crossbow:0,star:0},shield:0,rivalShield:0,projectiles:[],bursts:[],pickups:[],pickupTimer:4,pickupCount:0,serial:0,aiTimer:null,aiShot:0,aiShieldCooldown:0,cpuPickupCharges:{bomb:0,crossbow:0,star:0},hits:0};}
const point=(duel,actor)=>{const p=duel.course.groundAt(actor.s,actor.lateral);return {...p,y:p.y+1+(actor.airHeight||0)};};
const velocity=(actor,p)=>{
 const heading=p.heading+(actor.headingError||0),speed=(actor.speedMph||0)*(actor.dir||1)*DRIVE.mphToWorld;
 return {x:Math.sin(heading)*speed+Math.cos(p.heading)*(actor.pushVelocity||0),
  z:Math.cos(heading)*speed-Math.sin(p.heading)*(actor.pushVelocity||0)};
};
function predictedPoint(duel,actor,seconds){
 const frame=duel.course.at(actor.s),speed=(actor.speedMph||0)*(actor.dir||1)*DRIVE.mphToWorld;
 const headingError=actor.headingError||0;
 const along=Math.cos(headingError)*speed/Math.max(.25,1-frame.curvature*actor.lateral);
 const lateral=Math.sin(headingError)*speed+(actor.pushVelocity||0);
 return duel.course.groundAt(actor.s+along*seconds,actor.lateral+lateral*seconds);
}
function burst(c,p,kind='blast'){c.bursts.push({...p,kind,id:++c.serial,age:0});if(c.bursts.length>32)c.bursts.shift();}
function relocate(actor,pose){
 Object.assign(actor,pose);actor.prevS=actor.s;actor.prevLateral=actor.lateral;
 actor.headingError=pose.headingError||0;actor.yawVelocity=0;actor.pushVelocity=0;actor.slipAngle=0;
 actor.airborne=false;actor.airHeight=0;actor._jumpY=null;actor._verticalSpeed=0;actor._airOrigin=null;actor._jumpOrigin=null;
 actor.groundHeight=null;actor.terrainPitch=null;actor.terrainRoll=null;actor.tumble=null;
}
export function fireWeapon(duel,weapon,enemy=false){
 const s=duel.state,c=s.combat,actor=enemy?s.rival:s,target=enemy?s:s.rival;
 if(!c||s.mode!=='wasteland'||s.status!=='racing'||s.paused||!actor||actor.finished||actor.crushed||actor.impactTimer>0||!WEAPONS[weapon])return false;
 if(!enemy&&c.cooldowns[weapon]>0)return false;
 const p=point(duel,actor),level=enemy?0:c.levels[weapon];
 if(weapon==='ufo'){
  if(enemy)return false;
  let swapped=false;
  if(target&&!target.finished&&!target.crushed&&target.s>s.s){
   swapped=true;
   const fields=['s','lateral','headingError','completedLaps','nextLapGate','routeId','routeLap'];
   const a=Object.fromEntries(fields.map(k=>[k,s[k]])),b=Object.fromEntries(fields.map(k=>[k,target[k]]));
   // The player model also turns with slip and crash spin; the rival does not.
   const facing=(s.headingError||0)+(s.slipAngle||0)+(s.crashSpin||0);
   a.headingError=Math.atan2(Math.sin(facing),Math.cos(facing));
   const playerSpeed=s.speedMph,rivalSpeed=target.speedMph;
   burst(c,point(duel,target),'ufo');relocate(s,b);relocate(target,a);
   for(const [car,oldSpotSpeed,spec] of [[s,rivalSpeed,duel.car],[target,playerSpeed,duel.rivalSpec||duel.car]]){
    const surface=duel._drivingSurface(car.s,car.lateral,spec);
    const landingCap=surface.mainRoad?surface.speedLimit:surface.preparedGravel?Math.min(100,surface.speedLimit):Math.min(68,surface.speedLimit);
    car.speedMph=Math.sign(car.speedMph)*Math.min(Math.abs(car.speedMph),Math.abs(oldSpotSpeed),landingCap);
   }
   if(s.cpuDifficulty!=='easy'){
    const car=duel.rivalSpec||duel.car;
    if(duel._npcRoutePlanner?.course!==duel.course||duel._npcRoutePlanner?.car!==car)
     duel._npcRoutePlanner=new NpcRoutePlanner(duel.course,{car,surfaceAt:(distance,lateral)=>duel._drivingSurface(distance,lateral,car)});
    const route=duel._npcRoutePlanner.land(target,s.cpuDifficulty);
    target.routeId=route?.routeId||null;target.routeLap=route?.lap||null;
   }else{duel._npcRoutePlanner?.reset(target);target.routeId=null;target.routeLap=null;}
   // Progress belongs to the stolen position; timing belongs to this driver.
   for(const car of [s,target]){
    car.lap=car.currentLap=car.completedLaps+1;
    car.assistedLaps??=(car.lapTimes||[]).map(()=>false);
    car.assistedLap=true;
   }
   c.shield=Math.max(c.shield,1.2);c.rivalShield=Math.max(c.rivalShield,1.2);
   duel._callout('UFO / POSITIONS SWAPPED',2);
  }else{
   const next=s.completedLaps*duel.course.length+(duel._lapGates[s.nextLapGate]??duel.course.length);
   relocate(s,{s:Math.max(s.s,Math.min(s.s+100+75*level,next-2)),lateral:0});
   duel._callout('UFO / WARP FORWARD',2);
  }
  s.invulnerableSec=Math.max(s.invulnerableSec,swapped?1.2:1);burst(c,p,'ufo');burst(c,point(duel,s),'ufo');
 }else if(weapon==='star'){
  if(enemy)c.rivalShield=5;else {c.shield=5;s.invulnerableSec=Math.max(s.invulnerableSec,5);}
  burst(c,p,'star');
 }else{
  if(weapon==='crossbow'&&(!target||target.finished||target.crushed))return false;
  const count=weapon==='bomb'?8+2*level:1;
  if(c.projectiles.length+count>40)return false;
  // A moving car throws the whole bomb ring with its own velocity.
  const travelHeading=p.heading+(actor.headingError||0);
  const travelSpeed=(actor.speedMph||0)*(actor.dir||1)*DRIVE.mphToWorld;
  const carryX=weapon==='bomb'?Math.sin(travelHeading)*travelSpeed+Math.cos(p.heading)*(actor.pushVelocity||0):0;
  const carryZ=weapon==='bomb'?Math.cos(travelHeading)*travelSpeed-Math.sin(p.heading)*(actor.pushVelocity||0):0;
  for(let i=0;i<count;i++){
   let dx,dz,speed,vy=13;
   if(weapon==='bomb'){const angle=p.heading+i*Math.PI*2/count;dx=Math.sin(angle);dz=Math.cos(angle);speed=27;}
   else{
    const t=point(duel,target);speed=200+30*level;
    let aimX=t.x,aimZ=t.z;
    if(enemy){
     const travel=Math.min(.75,Math.hypot(t.x-p.x,t.z-p.z)/speed);
     const predicted=predictedPoint(duel,target,travel);
     aimX=predicted.x;aimZ=predicted.z;
    }
    dx=aimX-p.x;dz=aimZ-p.z;
    const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;
    if(enemy){
     const spread=CPU_COMBAT[s.cpuDifficulty]?.aimError??CPU_COMBAT.medium.aimError;
     const error=makeRng((duel.seed^(s.stageIndex*0x51ed)^(c.aiShot*0x9e3779b9))>>>0).range(-spread,spread);
     const x=dx*Math.cos(error)+dz*Math.sin(error);
     dz=dz*Math.cos(error)-dx*Math.sin(error);dx=x;
    }
    vy=(t.y-p.y-1)/length*speed;
   }
   c.projectiles.push({id:++c.serial,kind:weapon,enemy,level,x:p.x+dx*3,y:p.y+1,z:p.z+dz*3,
    vx:dx*speed+carryX,vz:dz*speed+carryZ,vy,age:0});
  }
 }
 if(!enemy)c.cooldowns[weapon]=WEAPONS[weapon].cooldown*(1-level*.15);
 duel.emit({weaponFired:weapon});return true;
}
function hit(duel,actor,p,power,enemy){
 const s=duel.state,c=s.combat;
 if(!actor||actor.finished||actor.crushed||(actor===s?(c.shield>0||s.invulnerableSec>0):c.rivalShield>0)||
   (p.kind==='bomb'&&actor.bombImpactCooldown>0))return;
 const where=point(duel,actor),normal=Math.sign((where.x-p.x)*Math.cos(where.heading)-(where.z-p.z)*Math.sin(where.heading))||1;
 const renderedTurn=actor===s?(actor.slipAngle||0)+(actor.crashSpin||0):actor!==s.rival&&actor.dir<0?Math.PI:0;
 const heading=where.heading+(actor.headingError||0)+renderedTurn;
 let nx=where.x-p.x,nz=where.z-p.z;
 // An exact overlap has no visible side; use travel, then the former rear default.
 if(nx*nx+nz*nz<1e-8){nx=p.vx||0;nz=p.vz||0;}
 if(nx*nx+nz*nz<1e-8){nx=Math.sin(heading);nz=Math.cos(heading);}
 const zone=contactZone(nx,nz,heading);
 actor.speedMph*=1-power*.65;actor.pushVelocity=Math.max(-18,Math.min(18,(actor.pushVelocity||0)+normal*power*14));
 actor.headingError=Math.max(-.65,Math.min(.65,(actor.headingError||0)+normal*power*.25));
 actor.damageZones??={front:0,rear:0,left:0,right:0};actor.damageZones[zone]=Math.min(5,actor.damageZones[zone]+power);
 // One bomb ring makes one shove; overlapping explosions cannot repeatedly
 // hit the same car in the same instant.
 if(p.kind==='bomb')actor.bombImpactCooldown=.3;
 if(actor===s){s.crashFlash=.35;s.impactStrength=power;duel._callout('INCOMING / ARMOR HIT',1.3);}
 else if(actor===s.rival&&!enemy){c.hits++;duel._callout('DIRECT HIT / RIVAL SHOVED',1.3);}
 duel.emit({combatHit:true,strength:power,enemy,victim:actor===s?'player':actor===s.rival?'rival':'traffic'});
}
function sweptDistance(p,old,t){const dx=p.x-old.x,dz=p.z-old.z,d=dx*dx+dz*dz,f=d?Math.max(0,Math.min(1,((t.x-old.x)*dx+(t.z-old.z)*dz)/d)):0;return Math.hypot(old.x+f*dx-t.x,old.z+f*dz-t.z);}
function incomingBolt(duel,cpu){
 const s=duel.state,c=s.combat,r=s.rival;if(!r||r.finished||r.crushed||c.rivalShield>0)return false;
 const t=point(duel,r),v=velocity(r,t),radius=duel._vehicleSpec(r).halfWidth+1.2;
 const facing=t.heading+(r.headingError||0),forwardX=Math.sin(facing),forwardZ=Math.cos(facing);
 for(const p of c.projectiles){
  if(p.enemy||p.kind!=='crossbow')continue;
  const dx=t.x-p.x,dz=t.z-p.z,rvx=p.vx-v.x,rvz=p.vz-v.z;
  const distance=Math.hypot(dx,dz);
  // The driver needs time to recognize a bolt inside the visible forward cone.
  if(p.age<cpu.shieldReaction||(-dx*forwardX-dz*forwardZ)<distance*cpu.visionCos)continue;
  const relativeSpeed=rvx*rvx+rvz*rvz;
  const soon=relativeSpeed?Math.max(0,Math.min(.4,(dx*rvx+dz*rvz)/relativeSpeed)):0;
  if(soon<=0||Math.hypot(dx-rvx*soon,dz-rvz*soon)>=radius)continue;
  if(Math.abs(p.y+p.vy*soon-t.y)<4)return true;
 }
 return false;
}
const cpuCanUsePickup = (state, combat, pickup) => state.cpuDifficulty !== 'easy' &&
 pickup.weapon !== 'ufo' && (combat.cpuPickupCharges?.[pickup.weapon] ?? 0) < 1;

function crossesPickup(actor,pickup){
 const start=actor.prevS??actor.s,delta=actor.s-start;
 const fraction=delta?Math.max(0,Math.min(1,(pickup.s-start)/delta)):1;
 const lateral=(actor.prevLateral??actor.lateral)+(actor.lateral-(actor.prevLateral??actor.lateral))*fraction;
 return (Math.abs(actor.s-pickup.s)<3||(delta>0&&start<=pickup.s&&actor.s>=pickup.s))&&
  Math.abs(lateral)<2.5&&(actor.airHeight||0)<3&&(actor.impactTimer||0)<=0;
}

function useCpuPickupShield(duel){
 const s=duel.state,c=s.combat,r=s.rival;
 if(!r||r.finished||r.crushed||r.impactTimer>0)return;
 if(c.cpuPickupCharges.star&&fireWeapon(duel,'star',true)){
  c.cpuPickupCharges.star--;duel.emit({cpuPickupUsed:'star'});
 }
}
export function stepCombat(duel,dt){
 const s=duel.state,c=s.combat;if(!c||s.status!=='racing'||s.paused)return;
 s.bombImpactCooldown=Math.max(0,(s.bombImpactCooldown||0)-dt);
 if(s.rival)s.rival.bombImpactCooldown=Math.max(0,(s.rival.bombImpactCooldown||0)-dt);
 for(const actor of s.traffic)if(actor)
  actor.bombImpactCooldown=Math.max(0,(actor.bombImpactCooldown||0)-dt);
 c.pickupTimer-=dt;
 if(c.pickupTimer<=0){
  const n=c.pickupCount++,where=s.s+100+40*(n%3);
  c.pickupTimer=10+3*(n%4);
  if(where<duel.raceLength-12&&c.pickups.length<4)c.pickups.push({s:where,weapon:Object.keys(WEAPONS)[n%4],age:0});
 }
 c.pickups=c.pickups.filter(p=>{
  p.age+=dt;
  if(crossesPickup(s,p)){
   c.cooldowns[p.weapon]=0;burst(c,duel.course.groundAt(p.s,0),'star');
   duel._callout(`${WEAPONS[p.weapon].name} / POWER-UP READY`,2);duel.emit({powerupCollected:p.weapon});return false;
  }
  const rival=s.rival;
  if(rival&&cpuCanUsePickup(s,c,p)&&!rival.finished&&!rival.crushed&&crossesPickup(rival,p)){
   c.cpuPickupCharges[p.weapon]++;
   burst(c,duel.course.groundAt(p.s,0),'star');
   duel._callout(`RIVAL / ${WEAPONS[p.weapon].name} PICKUP`,2);
   duel.emit({powerupCollected:p.weapon,collector:'rival'});
   return false;
  }
  const rivalCanClaim=rival&&cpuCanUsePickup(s,c,p)&&!rival.finished&&!rival.crushed;
  return p.age<24&&(p.s>s.s-30||(rivalCanClaim&&p.s>rival.s-30));
 });
 for(const key of Object.keys(c.cooldowns))c.cooldowns[key]=Math.max(0,c.cooldowns[key]-dt);
 c.shield=Math.max(0,c.shield-dt);c.rivalShield=Math.max(0,c.rivalShield-dt);
 c.aiShieldCooldown=Math.max(0,(c.aiShieldCooldown||0)-dt);
 c.bursts=c.bursts.filter(b=>(b.age+=dt)<1.4);
 c.blastSound=Math.max(0,(c.blastSound||0)-dt);
 const cpu=CPU_COMBAT[s.cpuDifficulty]??CPU_COMBAT.medium;
 if(s.cpuDifficulty!=='easy')useCpuPickupShield(duel);
 if(c.aiTimer==null)c.aiTimer=cpu.interval;
 c.aiTimer-=dt;
 if(c.aiShieldCooldown<=0&&incomingBolt(duel,cpu)&&fireWeapon(duel,'star',true))
  c.aiShieldCooldown=WEAPONS.star.cooldown;
 if(c.aiTimer<=0){
  c.aiTimer=cpu.interval;
  const r=s.rival;
  if(r&&!r.finished&&!r.crushed){
   const a=point(duel,r),b=point(duel,s),gap=Math.hypot(a.x-b.x,a.z-b.z);
   if(gap<180){
    const usual=gap<35?'bomb':'crossbow';
    let weapon=usual;
    // A collected weapon selects this scheduled attack. It does not add a
    // free shot or shorten the difficulty's 10/7/5-second attack interval.
    if(s.cpuDifficulty!=='easy'){
     if(gap>=35&&gap<50&&c.cpuPickupCharges.bomb)weapon='bomb';
    }
    c.aiShot++;
    if(fireWeapon(duel,weapon,true)&&c.cpuPickupCharges[weapon]){
     c.cpuPickupCharges[weapon]--;duel.emit({cpuPickupUsed:weapon});
    }
   }
  }
 }
 const live=[];
 for(const p of c.projectiles){
  const old={x:p.x,z:p.z};p.age+=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
  if(p.kind==='bomb')p.vy-=18*dt;
  const nearest=duel.course.nearest(p.x,p.z),floor=duel.course.groundAt(nearest.s,nearest.lateral).y;
  const target=p.enemy?s:s.rival,t=target?point(duel,target):null;
  const contact=t&&Math.abs(p.y-t.y)<4&&sweptDistance(p,old,t)<duel._vehicleSpec(target).halfWidth+1.2;
  const expired=p.age>(p.kind==='bomb'?1.4:2.5);
  if(contact||p.y<=floor+.25||expired){
   burst(c,{x:p.x,y:Math.max(floor+.3,p.y),z:p.z},p.kind==='bomb'?'blast':'spark');
   if(p.kind==='bomb'&&!c.blastSound){duel.emit({combatExplosion:true});c.blastSound=.12;}
   if(p.kind==='bomb'){
    const thrower=p.enemy?s.rival:s;
    for(const actor of [s,s.rival,...s.traffic]){
     if(!actor||actor.alive===false)continue;
     const a=point(duel,actor),distance=Math.hypot(a.x-p.x,a.z-p.z,a.y-p.y),radius=22+2*p.level;
     const selfDamage=actor===thrower ? .25 : 1;
     if(distance<radius)hit(duel,actor,p,(1-distance/radius)*1.3*(1+p.level*.15)*selfDamage,p.enemy);
    }
   }else if(contact)hit(duel,target,p,.9*(1+p.level*.2),p.enemy);
  }else live.push(p);
 }
 c.projectiles=live;
}
