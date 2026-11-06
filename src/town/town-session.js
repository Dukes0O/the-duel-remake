import {stepTown} from './index.js';

export function townsAvailableToVisit(records,{currentTownId=null,ownedTownId=null,unclaimedIds=[]}={}) {
  const unclaimed=new Set(unclaimedIds);
  return records.filter(record=>record&&record.id!==currentTownId&&record.id!==ownedTownId&&!unclaimed.has(record.id));
}

// Owns the state-changing decisions for an open town. The view may call this
// controller, while tests can drive the same lifecycle without a browser.
export function createTownSession({town,homeTown:returnedTown=null,store,clock={step:stepTown},visiting=false,save=async()=>{},onReturn=()=>{}}={}) {
  let activeTown=town, homeTown=visiting?returnedTown:town, isVisiting=visiting, leaving=null, entered=false;
  const enter=async id=>{
    const loaded=await store.load(id,{readOnly:true});
    if(!loaded.town)return {ok:false,message:loaded.message||'This town could not be opened.'};
    activeTown=loaded.town;isVisiting=true;entered=true;
    return {ok:true,town:activeTown,message:loaded.message||''};
  };
  const frame=(delta,speed=1)=>{
    if(isVisiting)return false;
    clock.step(activeTown,{delta,speed});
    return true;
  };
  const command=cmd=>{
    if(isVisiting)return {ok:false,message:'Visiting this town. You can look around. Nothing you do here changes it.'};
    return clock.command?clock.command(activeTown,cmd):{ok:true,answers:clock.step(activeTown,cmd)};
  };
  const book=()=>({town:activeTown,readOnly:isVisiting});
  const card=id=>({town:activeTown,id,readOnly:isVisiting});
  const leave=reason=>{
    if(leaving)return leaving;
    leaving=(async()=>{
      if(isVisiting){if(homeTown)await save(homeTown,reason);activeTown=homeTown;}
      else await save(activeTown,reason);
      return onReturn({town:activeTown,visiting:isVisiting,entered,reason});
    })();
    return leaving;
  };
  return Object.freeze({enter,frame,command,book,card,escape:()=>leave('escape'),return:()=>leave('return'),get town(){return activeTown;},get visiting(){return isVisiting;}});
}
