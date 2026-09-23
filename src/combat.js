import {normalizeWeapons} from './weapon-upgrades.js';
import {contactZone} from './collision.js';
// Arcade vehicle combat. All timers and projectile motion use simulation time.
export const WEAPONS=Object.freeze({ufo:{name:'UFO SWAP',key:'1',cooldown:18},bomb:{name:'BOMB STORM',key:'2',cooldown:9},crossbow:{name:'CROSSBOW',key:'3',cooldown:4},star:{name:'STAR SHIELD',key:'4',cooldown:16}});
export const supportsCombat=stage=>!!stage?.hasRival&&!stage.practice&&!stage.stuntTrial;
export function createCombat(levels){return {levels:normalizeWeapons({levels}).levels,cooldowns:{ufo:0,bomb:0,crossbow:0,star:0},shield:0,rivalShield:0,projectiles:[],bursts:[],pickups:[],pickupTimer:4,pickupCount:0,serial:0,aiTimer:7,aiShot:0,hits:0};}
const point=(duel,actor)=>{const p=duel.course.groundAt(actor.s,actor.lateral);return {...p,y:p.y+1+(actor.airHeight||0)};};
function burst(c,p,kind='blast'){c.bursts.push({...p,kind,id:++c.serial,age:0});if(c.bursts.length>32)c.bursts.shift();}
function relocate(actor,pose){
 Object.assign(actor,pose);actor.prevS=actor.s;actor.prevLateral=actor.lateral;
 actor.headingError=0;actor.yawVelocity=0;actor.pushVelocity=0;actor.slipAngle=0;
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
  if(target&&!target.finished&&!target.crushed&&target.s>s.s){
   const fields=['s','lateral','completedLaps','nextLapGate'];
   const a=Object.fromEntries(fields.map(k=>[k,s[k]])),b=Object.fromEntries(fields.map(k=>[k,target[k]]));
   burst(c,point(duel,target),'ufo');relocate(s,b);relocate(target,a);
   // Progress belongs to the stolen position; timing belongs to this driver.
   for(const car of [s,target]){car.lap=car.currentLap=car.completedLaps+1;car.lapStartedAt=s.stageTimeSec;car.lapTimes=[];}
   duel._callout('UFO / POSITIONS SWAPPED',2);
  }else{
   const next=s.completedLaps*duel.course.length+(duel._lapGates[s.nextLapGate]??duel.course.length);
   relocate(s,{s:Math.max(s.s,Math.min(s.s+100+75*level,next-2)),lateral:0});
   duel._callout('UFO / WARP FORWARD',2);
  }
  s.invulnerableSec=Math.max(s.invulnerableSec,1);burst(c,p,'ufo');burst(c,point(duel,s),'ufo');
 }else if(weapon==='star'){
  if(enemy)c.rivalShield=5;else {c.shield=5;s.invulnerableSec=Math.max(s.invulnerableSec,5);}
  burst(c,p,'star');
 }else{
  if(weapon==='crossbow'&&(!target||target.finished||target.crushed))return false;
  const count=weapon==='bomb'?8+2*level:1;
  if(c.projectiles.length+count>40)return false;
  for(let i=0;i<count;i++){
   let dx,dz,speed,vy=13;
   if(weapon==='bomb'){const angle=p.heading+i*Math.PI*2/count;dx=Math.sin(angle);dz=Math.cos(angle);speed=27;}
   else{const t=point(duel,target);dx=t.x-p.x;dz=t.z-p.z;const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;speed=200+30*level;vy=(t.y-p.y-1)/length*speed;}
   c.projectiles.push({id:++c.serial,kind:weapon,enemy,level,x:p.x+dx*3,y:p.y+1,z:p.z+dz*3,vx:dx*speed,vz:dz*speed,vy,age:0});
  }
 }
 if(!enemy)c.cooldowns[weapon]=WEAPONS[weapon].cooldown*(1-level*.15);
 duel.emit({weaponFired:weapon});return true;
}
function hit(duel,actor,p,power,enemy){
 const s=duel.state,c=s.combat;
 if(!actor||actor.finished||actor.crushed||(actor===s?(c.shield>0||s.invulnerableSec>0):c.rivalShield>0))return;
 const where=point(duel,actor),normal=Math.sign((where.x-p.x)*Math.cos(where.heading)-(where.z-p.z)*Math.sin(where.heading))||1;
 const heading=where.heading+(actor.headingError||0)+(actor.slipAngle||0)+(actor.crashSpin||0)+(actor.dir<0?Math.PI:0);
 let nx=where.x-p.x,nz=where.z-p.z;
 // An exact overlap has no visible side; use travel, then the former rear default.
 if(nx*nx+nz*nz<1e-8){nx=p.vx||0;nz=p.vz||0;}
 if(nx*nx+nz*nz<1e-8){nx=Math.sin(heading);nz=Math.cos(heading);}
 const zone=contactZone(nx,nz,heading);
 actor.speedMph*=1-power*.65;actor.pushVelocity=Math.max(-18,Math.min(18,(actor.pushVelocity||0)+normal*power*14));
 actor.headingError=Math.max(-.65,Math.min(.65,(actor.headingError||0)+normal*power*.25));
 actor.damageZones??={front:0,rear:0,left:0,right:0};actor.damageZones[zone]=Math.min(5,actor.damageZones[zone]+power);
 if(actor===s){s.crashFlash=.35;s.impactStrength=power;duel._callout('INCOMING / ARMOR HIT',1.3);}
 else if(actor===s.rival&&!enemy){c.hits++;duel._callout('DIRECT HIT / RIVAL SHOVED',1.3);}
 duel.emit({combatHit:true,strength:power,enemy});
}
function sweptDistance(p,old,t){const dx=p.x-old.x,dz=p.z-old.z,d=dx*dx+dz*dz,f=d?Math.max(0,Math.min(1,((t.x-old.x)*dx+(t.z-old.z)*dz)/d)):0;return Math.hypot(old.x+f*dx-t.x,old.z+f*dz-t.z);}
export function stepCombat(duel,dt){
 const s=duel.state,c=s.combat;if(!c||s.status!=='racing'||s.paused)return;
 c.pickupTimer-=dt;
 if(c.pickupTimer<=0){
  const n=c.pickupCount++,where=s.s+100+40*(n%3);
  c.pickupTimer=10+3*(n%4);
  if(where<duel.raceLength-12&&c.pickups.length<4)c.pickups.push({s:where,weapon:Object.keys(WEAPONS)[n%4],age:0});
 }
 c.pickups=c.pickups.filter(p=>{
  p.age+=dt;
  const delta=s.s-(s.prevS??s.s),t=delta?Math.max(0,Math.min(1,(p.s-s.prevS)/delta)):1;
  const lateral=(s.prevLateral??s.lateral)+(s.lateral-(s.prevLateral??s.lateral))*t;
  const crossed=Math.abs(s.s-p.s)<3||(delta>0&&s.prevS<=p.s&&s.s>=p.s);
  if(crossed&&Math.abs(lateral)<2.5&&(s.airHeight||0)<3&&s.impactTimer<=0){
   c.cooldowns[p.weapon]=0;burst(c,duel.course.groundAt(p.s,0),'star');
   duel._callout(`${WEAPONS[p.weapon].name} / POWER-UP READY`,2);duel.emit({powerupCollected:p.weapon});return false;
  }
  return p.age<24&&p.s>s.s-30;
 });
 for(const key of Object.keys(c.cooldowns))c.cooldowns[key]=Math.max(0,c.cooldowns[key]-dt);
 c.shield=Math.max(0,c.shield-dt);c.rivalShield=Math.max(0,c.rivalShield-dt);
 c.bursts=c.bursts.filter(b=>(b.age+=dt)<1.4);
 c.blastSound=Math.max(0,(c.blastSound||0)-dt);
 c.aiTimer-=dt;
 if(c.aiTimer<=0){c.aiTimer=8;const r=s.rival;if(r&&!r.finished&&!r.crushed){const gap=Math.hypot(point(duel,r).x-point(duel,s).x,point(duel,r).z-point(duel,s).z);if(gap<180)fireWeapon(duel,++c.aiShot%3===0?'star':gap<35?'bomb':'crossbow',true);}}
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
    for(const actor of [s,s.rival,...s.traffic]){
     if(!actor||actor.alive===false)continue;
     const a=point(duel,actor),distance=Math.hypot(a.x-p.x,a.z-p.z,a.y-p.y),radius=22+2*p.level;
     if(distance<radius)hit(duel,actor,p,(1-distance/radius)*1.3*(1+p.level*.15),p.enemy);
    }
   }else if(contact)hit(duel,target,p,.9*(1+p.level*.2),p.enemy);
  }else live.push(p);
 }
 c.projectiles=live;
}
