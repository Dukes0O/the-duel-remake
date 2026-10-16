import {CARS, COURSE} from './config.js';
import {airOnlyNote} from './heli/heli-jobs.js';
import {closureCard} from './course-closures.js';
import {isCourseUnlocked} from './course-access.js';

export function createRendererReadiness({app, ui, choices, profile, isDisposed, importRenderer=()=>import('./render3d.js'), reportError=console.error}) {
  let rendererPromise=null, rendererHandle=null, disposed=false;
  const stopped=()=>disposed||isDisposed();
function ensureRenderer() {
  if(rendererHandle && ui.view3d.dataset.trackKitAsset==='error'){
    rendererHandle.retryTrackKits?.();syncRendererReadiness(app.duel.state);
    return rendererPromise;
  }
  if (!rendererPromise) {
    ui['renderer-loading'].hidden = false; ui['renderer-error'].hidden = true;
    ui['start-engine'].disabled = true;
    rendererPromise = importRenderer().then(({attachRenderer}) => { if(stopped())return;rendererHandle=attachRenderer(ui.view3d,app); ui.view3d.classList.add('live');syncRendererReadiness(app.duel.state); }).catch(error => {
      if(stopped())return;
      rendererPromise = null; ui['renderer-error'].hidden = false; ui['start-engine'].disabled = true;
      if (['racing','countdown'].includes(app.duel.state.status) && !app.duel.state.paused) app.togglePause();
      reportError('Unable to initialize 3D graphics.',error);
    }).finally(() => { if(!stopped()){if(rendererHandle)syncRendererReadiness(app.duel.state);else ui['renderer-loading'].hidden = true;} });
  }
  return rendererPromise;
}
function syncRendererReadiness(s) {
  if(stopped())return;
  if(rendererHandle){
    rendererHandle.prepareVehicle(s.status==='menu'?app.menuCar||choices.car:s.car);
    const asset=ui.view3d.dataset.vehicleAsset,kit=ui.view3d.dataset.trackKitAsset;
    const kitFailed=kit==='error',kitLoading=kit==='loading';
    const loading=asset==='loading'||asset==='idle'||kitLoading,failed=asset==='error'||kitFailed;
    const preparing=!failed&&asset==='ready'&&!app.visualReady;
    ui['renderer-loading'].hidden=!(loading||preparing);
    ui['renderer-loading'].lastChild.textContent=kitLoading?' LOADING TRACK SCENERY':preparing?' PREPARING THE ROAD':` LOADING ${CARS[ui.view3d.dataset.vehicleKey]?.name.toUpperCase()||'VEHICLE'}`;
    // Special cars travel only by air (docs/HELICOPTER.md section 5): say why
    // START is closed instead of letting it do nothing.
    // A course closed after a forest fire (docs/HELI_FIRE.md section 8.1) says so the same way.
    const menuCar=app.menuCar||choices.car,menuCourse=COURSE[choices.startStage],airOnly=s.status==='menu'?(airOnlyNote({enabled:app._switches?.().enabled('helicopter')===true,
      profile:profile(),carId:menuCar,courseId:menuCourse?.id,carName:CARS[menuCar]?.name})||
      (app._fireOn?.()===true&&menuCourse?closureCard(profile(),menuCourse.id,undefined,{enabled:true,name:menuCourse.name})?.startNote:null)||null):null;
    ui['start-engine'].disabled=failed||kitLoading||asset!=='ready'||!app.visualReady||!isCourseUnlocked(profile(),choices.startStage)||!!airOnly;
    const note=ui['start-engine'].parentElement?.querySelector?.('.start-note');
    if(note){if(airOnly){if(note.textContent!==airOnly){note.dataset.before=note.textContent;note.textContent=airOnly;}note.dataset.airOnly='1';note.dataset.airOnlyText=airOnly;}
      // Put the saved line back only if the menu has not written a newer one.
      else if(note.dataset.airOnly){if(note.textContent===note.dataset.airOnlyText)note.textContent=note.dataset.before||'';delete note.dataset.airOnly;delete note.dataset.before;delete note.dataset.airOnlyText;}}
    ui['renderer-error'].hidden=!failed;
    if(kitFailed){
      ui['renderer-error'].querySelector('strong').textContent="The track scenery couldn't load.";
      ui['renderer-error'].querySelector('span').textContent='Retry loading the track, or choose another course. Your progress is unchanged.';
      ui['renderer-error'].querySelector('button').textContent='RETRY TRACK ↗';
    }else if(failed){ui['renderer-error'].querySelector('strong').textContent="The car couldn't load.";ui['renderer-error'].querySelector('span').textContent='Retry the car download, or choose another car. Your progress is unchanged.';ui['renderer-error'].querySelector('button').textContent='RETRY CAR ↗';}
  }
}
  return {ensureRenderer, syncRendererReadiness, get handle(){return rendererHandle;}, dispose(){disposed=true;rendererHandle?.dispose();rendererHandle=null;}};
}
