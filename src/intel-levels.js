// Prospective Team Room progress. Callers supply native ownership/finish proof;
// these immutable operations neither read storage nor settle race rewards.
export const INTEL_PRICES = Object.freeze({3:400,4:800});
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const eventId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(id)&&!['constructor','prototype'].includes(id);
const integer=(value,max)=>Number.isSafeInteger(value)&&value>=0?Math.min(max,value):0;
const empty=()=>({version:1,events:{}});
const supported=profile=>object(profile)&&(!Object.hasOwn(profile,'intel')||object(profile.intel)&&profile.intel.version===1);
function row(value) {
  const source=object(value)?value:{};
  return {...source,laps:integer(source.laps,3),level:integer(source.level,4),
    lapKeys:[...new Set((Array.isArray(source.lapKeys)?source.lapKeys:[])
      .filter(key=>typeof key==='string'&&key.length>0&&key.length<=180))].slice(0,3)};
}
export function normalizeIntel(value) {
  if(object(value)&&Number.isSafeInteger(value.version)&&value.version>1)return value;
  if(!object(value)||value.version!==1)return empty();
  return {...value,version:1,events:Object.fromEntries(Object.entries(object(value.events)?value.events:{})
    .filter(([id])=>eventId(id)).map(([id,value])=>{
      const saved=row(value);
      // Optional progress fields stay absent until the operation needs them.
      for(const key of ['level','laps','lapKeys'])if(!object(value)||!Object.hasOwn(value,key))delete saved[key];
      return [id,saved];
    }))};
}
function current(profile,id) {
  const data=profile?.intel;
  return row(data?.version===1&&object(data.events)&&Object.hasOwn(data.events,id)?data.events[id]:null);
}
export function intelLevel(profile,id,{owned=false}={}) {
  if(owned!==true||!eventId(id))return 0;
  const data=current(profile,id);
  return Math.max(1,data.level,data.laps>=3?2:1);
}
function put(profile,id,next) {
  const data=profile.intel??empty();
  return {...profile,intel:{...data,version:1,events:{...(object(data.events)?data.events:{}),[id]:next}}};
}
export function recordIntelLap(profile,id,receipt,{owned=false}={}) {
  if(owned!==true||!eventId(id)||!supported(profile)||receipt?.valid!==true||
    typeof receipt.runId!=='string'||!receipt.runId.length||receipt.runId.length>120||
    !Number.isSafeInteger(receipt.lap)||receipt.lap<1)return profile;
  const before=current(profile,id),key=JSON.stringify([receipt.runId,receipt.lap]);
  if(key.length>180||before.laps>=3||before.lapKeys.includes(key))return profile;
  const laps=before.laps+1;
  return put(profile,id,{...before,laps,level:Math.max(before.level,laps>=3?2:0),lapKeys:[...before.lapKeys,key]});
}
export function recordIntelFinish(profile,id,result,{owned=false,validated=false}={}) {
  // No inferred historical or two-car positions. Native GP results carry an
  // explicit size and position; the existing settlement must validate first.
  if(owned!==true||validated!==true||!eventId(id)||!supported(profile)||result?.mode!=='grandprix'||
    result.completed!==true||!Number.isFinite(result.timeSec)||result.timeSec<=0||
    !Number.isSafeInteger(result.laps)||result.laps<1||
    !Number.isSafeInteger(result.fieldSize)||result.fieldSize<2||result.fieldSize>8||
    !Number.isSafeInteger(result.position)||result.position<1||result.position>result.fieldSize)return profile;
  const before=current(profile,id),level=result.position<=3?4:result.position<=5?3:0;
  return level>Math.max(before.level,before.laps>=3?2:0)?put(profile,id,{...before,level}):profile;
}
export function purchaseIntel(profile,id,level,{owned=false}={}) {
  const reject=reason=>({ok:false,changed:false,profile,cost:0,reason});
  if(owned!==true||!eventId(id)||!supported(profile)||!Object.hasOwn(INTEL_PRICES,level)||!Number.isInteger(level))return reject('unavailable');
  const before=current(profile,id);
  if(intelLevel(profile,id,{owned})>=level)return {ok:true,changed:false,profile,cost:0,level};
  const cost=INTEL_PRICES[level];
  if(!Number.isSafeInteger(profile.credits)||profile.credits<cost)return reject('credits');
  const next=put(profile,id,{...before,level});
  return {ok:true,changed:true,cost,level,profile:{...next,credits:profile.credits-cost}};
}
