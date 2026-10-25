import {CIRCUIT_ENTRIES,CIRCUIT_MANIFESTS} from './circuit-manifests.js';
import {getGrandPrixPodiums} from './grand-prix-career.js';
import {COURSE,CARS} from './config.js';

// Stable IDs, not menu positions. A few clean starter wins fund the next road.
export const COURSE_PRICES=Object.freeze({
  'pacific-canyon':0,'high-country':900,'harbor-highlands':1400,
  'titan-arena':1600,'midnight-chase':1800,'ridge-rally':1200,
  'titan-stunt-trial':2000,'neon-drift-trial':1800,'timberline-rush':1600,
  'eifel-crown':1400,'alpine-serpent':1800,'azure-riviera':1400,
  'red-mesa':1600,'neon-docks':1800,'cloudbreak-skyway':2200,'titan-freestyle':900,
  // Phase 4 circuits, behind their switches (docs/CIRCUITS.md section 7).
  ...Object.fromEntries(CIRCUIT_MANIFESTS.map(manifest => [manifest.id, manifest.price])),
});
const requirementOf=id=>CIRCUIT_MANIFESTS.find(manifest=>manifest.id===id)?.unlock;
const included=()=>COURSE.filter(course=>COURSE_PRICES[course.id]===0&&!requirementOf(course.id)).map(course=>course.id);
const known=id=>typeof id==='string'&&COURSE.some(course=>course.id===id)&&Object.hasOwn(COURSE_PRICES,id);
const idOf=course=>typeof course==='number'?COURSE[course]?.id:typeof course==='object'?course?.id:course;

// Presentation only; this never allocates or stores a child entitlement.
export function courseUnlockRequirement(course){
  const unlock=requirementOf(idOf(course));
  if(!unlock)return null;
  const name=CIRCUIT_ENTRIES.find(row=>row.manifest.id===unlock.defaultEventId).definition.name;
  return {...unlock,condition:unlock.kind==='owned-course'?`Own ${name} to enter this solo challenge for free.`:unlock.kind==='spotted-from-air'?`Found from the air: look for its sign from the helicopter over ${name}.`:`Finish top three in the ${name} Grand Prix.`};
}

export function normalizeCourseAccess(value,legacyProfile){
  const unlocked=new Set(included());
  if(value?.version===1){
    for(const id of Array.isArray(value.unlocked)?value.unlocked:[])if(known(id)&&!requirementOf(id))unlocked.add(id);
  }else if(legacyProfile){
    // Preserve demonstrated use and the six older car-purchase entitlements.
    // A saved menu selection alone is not evidence of earned access.
    const cars=Array.isArray(legacyProfile.unlockedCars)?legacyProfile.unlockedCars:[],history=Array.isArray(legacyProfile.history)?legacyProfile.history:[],wins=Array.isArray(legacyProfile.circuitWins)?legacyProfile.circuitWins:[];
    for(const course of COURSE){
      if(course.practice||requirementOf(course.id))continue;
      const id=course.id;
      const previousCarEntitlement=course.stage>=3&&course.stage<=8&&course.requiredCar&&cars.includes(course.requiredCar);
      const completed=history.some(row=>row?.eventId===id&&row.completed===true&&typeof row.key==='string'&&typeof row.won==='boolean'&&Number.isFinite(row.reward));
      const best=Object.entries(legacyProfile.personalBests||{}).some(([key,time])=>key.startsWith(`${id}|layout:`)&&Number.isFinite(time)&&time>0);
      const circuitWin=wins.includes(id);
      const race=legacyProfile.activeRace,active=(typeof race?.stageId==='string'?race.stageId===id:race?.stageIndex===course.stage)&&typeof race.runId==='string'&&race.runId.length>0&&race.runId.length<=128&&Object.hasOwn(CARS,race.car);
      if(previousCarEntitlement||completed||best||circuitWin||active)unlocked.add(id);
    }
  }
  return {version:1,unlocked:COURSE.filter(course=>unlocked.has(course.id)).map(course=>course.id)};
}
// The pilot's map record (src/heli/map-secrets.js) lists the variants found from the helicopter; read here without importing it.
const foundFromAir=(profile,id)=>Array.isArray(profile?.heli?.map?.found)&&profile.heli.map.found.includes(id);
export function isCourseUnlocked(profile,course){
  const id=idOf(course);
  if(!known(id))return false;
  const unlock=requirementOf(id);
  if(unlock)return isCourseUnlocked(profile,unlock.defaultEventId)&&(unlock.kind==='owned-course'||(unlock.kind==='spotted-from-air'?foundFromAir(profile,id):getGrandPrixPodiums(profile).includes(unlock.defaultEventId)));
  return COURSE_PRICES[id]===0||profile?.courses?.version===1&&Array.isArray(profile.courses.unlocked)&&profile.courses.unlocked.includes(id);
}
export function purchaseCourse(profile,course){
  const id=idOf(course),failure=reason=>({profile,ok:false,reason,cost:0});
  if(!known(id))return failure('Choose an available course.');
  const requirement=courseUnlockRequirement(id);
  if(requirement)return failure(isCourseUnlocked(profile,id)?requirement.kind==='owned-course'?'This solo challenge is already available for free.':'This variant is already available for free.':requirement.condition);
  if(isCourseUnlocked(profile,id))return failure('This course is already unlocked.');
  const cost=COURSE_PRICES[id];
  if(!Number.isFinite(profile?.credits)||profile.credits<cost)return failure(`You need ${Math.max(0,cost-(profile?.credits||0))} more credits.`);
  const access=normalizeCourseAccess(profile.courses);
  return {profile:{...profile,credits:profile.credits-cost,courses:normalizeCourseAccess({version:1,unlocked:[...access.unlocked,id]})},ok:true,reason:'',cost};
}
