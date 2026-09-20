import {COURSE,CARS} from './config.js';

// Stable IDs, not menu positions. A few clean starter wins fund the next road.
export const COURSE_PRICES=Object.freeze({
  'pacific-canyon':0,'high-country':900,'harbor-highlands':1400,
  'titan-arena':1600,'midnight-chase':1800,'ridge-rally':1200,
  'titan-stunt-trial':2000,'neon-drift-trial':1800,'timberline-rush':1600,
  'eifel-crown':1400,'alpine-serpent':1800,'azure-riviera':1400,
  'red-mesa':1600,'neon-docks':1800,'cloudbreak-skyway':2200,'titan-freestyle':900,
});
const included=()=>COURSE.filter(course=>COURSE_PRICES[course.id]===0).map(course=>course.id);
const known=id=>typeof id==='string'&&COURSE.some(course=>course.id===id)&&Object.hasOwn(COURSE_PRICES,id);
const idOf=course=>typeof course==='number'?COURSE[course]?.id:typeof course==='object'?course?.id:course;

export function normalizeCourseAccess(value,legacyProfile){
  const unlocked=new Set(included());
  if(value?.version===1){
    for(const id of Array.isArray(value.unlocked)?value.unlocked:[])if(known(id))unlocked.add(id);
  }else if(legacyProfile){
    // Preserve demonstrated use and the six older car-purchase entitlements.
    // A saved menu selection alone is not evidence of earned access.
    const cars=Array.isArray(legacyProfile.unlockedCars)?legacyProfile.unlockedCars:[],history=Array.isArray(legacyProfile.history)?legacyProfile.history:[],wins=Array.isArray(legacyProfile.circuitWins)?legacyProfile.circuitWins:[];
    for(const course of COURSE){
      if(course.practice)continue;
      const id=course.id;
      const previousCarEntitlement=course.stage>=3&&course.stage<=8&&course.requiredCar&&cars.includes(course.requiredCar);
      const completed=history.some(row=>row?.eventId===id&&row.completed===true&&typeof row.key==='string'&&typeof row.won==='boolean'&&Number.isFinite(row.reward));
      const best=Object.entries(legacyProfile.personalBests||{}).some(([key,time])=>key.startsWith(`${id}|layout:`)&&Number.isFinite(time)&&time>0);
      const circuitWin=wins.includes(id);
      const race=legacyProfile.activeRace,active=race?.stageIndex===course.stage&&typeof race.runId==='string'&&race.runId.length>0&&race.runId.length<=128&&Object.hasOwn(CARS,race.car);
      if(previousCarEntitlement||completed||best||circuitWin||active)unlocked.add(id);
    }
  }
  return {version:1,unlocked:COURSE.filter(course=>unlocked.has(course.id)).map(course=>course.id)};
}
export function isCourseUnlocked(profile,course){
  const id=idOf(course);
  return known(id)&&(COURSE_PRICES[id]===0||profile?.courses?.version===1&&Array.isArray(profile.courses.unlocked)&&profile.courses.unlocked.includes(id));
}
export function purchaseCourse(profile,course){
  const id=idOf(course),failure=reason=>({profile,ok:false,reason,cost:0});
  if(!known(id))return failure('Choose an available course.');
  if(isCourseUnlocked(profile,id))return failure('This course is already unlocked.');
  const cost=COURSE_PRICES[id];
  if(!Number.isFinite(profile?.credits)||profile.credits<cost)return failure(`You need ${Math.max(0,cost-(profile?.credits||0))} more credits.`);
  const access=normalizeCourseAccess(profile.courses);
  return {profile:{...profile,credits:profile.credits-cost,courses:normalizeCourseAccess({version:1,unlocked:[...access.unlocked,id]})},ok:true,reason:'',cost};
}
