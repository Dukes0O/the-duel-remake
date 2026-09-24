const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const CINEMATIC=new Set(['arriving','opening','choice','entering','arrived']);

/** Read-only presentation. Repeated or rewound snapshots produce the same view. */
export function hiddenRoadPresentation(state,course,{aspect=16/9}={}) {
  const journey=state?.hiddenRoadJourney,road=course?.hiddenRoad;
  const inactive={active:false,phase:null,hudOpacity:1,controlsLocked:false,choiceReady:false,
    gateOpen:0,camera:null,sparks:[],arrivalReady:false};
  if(!road||!journey?.departed||state.status!=='exploring')return inactive;
  const phase=journey.phase,age=Math.max(0,Number(journey.phaseElapsedSec)||0);
  const gate=road.poseAt(road.length),c=Math.cos(gate.heading),s=Math.sin(gate.heading);
  const world=(x,y,z)=>({x:gate.x+x*c+z*s,y:gate.y+y,z:gate.z-x*s+z*c});
  const returning=phase==='turned-back'&&age<.8;
  const narrow=aspect<.85;
  const camera=CINEMATIC.has(phase)||returning?{
    position:world(narrow?6:8,narrow?3.4:2.2,-30),target:world(0,narrow?2.6:10,narrow?-2:0),fov:64,
    blend:phase==='arriving'?smooth(age/1.25):returning?1-smooth(age/.8):1
  }:null;
  if(camera&&(phase==='entering'||phase==='arrived')){
    const point=course.worldAt(state.s,state.lateral);
    const carZ=(point.x-gate.x)*s+(point.z-gate.z)*c;
    const follow=world(0,2.6,carZ-9),target=world(0,1.5,carZ);
    const blend=phase==='entering'?smooth(age/.9):1;
    for(const axis of ['x','y','z']){
      camera.position[axis]+=(follow[axis]-camera.position[axis])*blend;
      camera.target[axis]+=(target[axis]-camera.target[axis])*blend;
    }
    if(phase==='arrived'){
      const orbit=smooth(age/1.3),end=world(7,3.2,21);
      for(const axis of ['x','y','z'])camera.position[axis]+=(end[axis]-camera.position[axis])*orbit;
    }
    camera.fov=60;
  }
  const gateOpen=clamp(journey.gateOpen),sparks=[];
  if(phase==='opening'&&!state.paused&&gateOpen>0&&gateOpen<1){
    for(let i=0;i<24;i++){
      const life=(age*2.6+i*.137)%1,side=i%2?-1:1;
      const point=world(side*(4.7+life*(.35+.17*Math.sin(i*4.3))),
        Math.max(.1,7*gateOpen+.6-life*life*2.2),-.9-life*.8);
      sparks.push({...point,size:.035+.04*(1-life),opacity:(1-life)*.8});
    }
  }
  return{active:true,phase,hudOpacity:1-smooth((Number(journey.elapsedSec)||0)/1.2),
    controlsLocked:!!journey.controlsLocked,choiceReady:phase==='choice'&&!!journey.choiceReady&&!state.paused,
    gateOpen,camera,sparks,arrivalReady:phase==='arrived'};
}

export function createHiddenRoadUi({host,onChoose,onMenu}) {
  const doc=host.ownerDocument,section=doc.createElement('section'),eyebrow=doc.createElement('p');
  const title=doc.createElement('h2'),copy=doc.createElement('p'),actions=doc.createElement('div');
  const enter=doc.createElement('button'),back=doc.createElement('button'),menu=doc.createElement('button');
  section.className='hidden-road-dialog';section.hidden=true;
  section.setAttribute('data-hidden-road-dialog','');section.setAttribute('role','dialog');
  section.setAttribute('aria-modal','true');section.setAttribute('aria-labelledby','hidden-road-title');
  title.setAttribute('id','hidden-road-title');eyebrow.className='hidden-road-eyebrow';
  copy.className='hidden-road-copy';actions.className='hidden-road-actions';
  eyebrow.textContent='THE RUSTWALL';enter.textContent='Enter the Wasteland';back.textContent='Turn back';menu.textContent='Return to menu';
  enter.className='hidden-road-enter';
  for(const node of [eyebrow,title,copy,actions])section.appendChild(node);
  for(const node of [enter,back,menu]){node.setAttribute('type','button');actions.appendChild(node);}
  host.appendChild(section);
  let view=null,disposed=false,priorFocus=null,wasVisible=false;
  const bindings=[];
  const listen=(node,type,fn)=>{node.addEventListener(type,fn);bindings.push([node,type,fn]);};
  listen(enter,'click',()=>{if(!disposed&&view?.choiceReady)onChoose('enter');});
  listen(back,'click',()=>{if(!disposed&&view?.choiceReady)onChoose('turn-back');});
  listen(menu,'click',()=>{if(!disposed&&view?.arrivalReady&&!section.hidden)onMenu();});
  listen(section,'keydown',event=>{
    if(section.hidden)return;
    if(event.key==='Tab'){
      const buttons=[enter,back,menu].filter(button=>!button.hidden&&!button.disabled),first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus({preventScroll:true});}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus({preventScroll:true});}
      event.stopPropagation();
    }else if(['Enter',' '].includes(event.key))event.stopPropagation();
  });
  function restoreFocus(){if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});}
  const set=(node,key,value)=>{if(node[key]!==value)node[key]=value;};
  return{
    update(state,course){
      if(disposed)return;
      const previousPhase=view?.phase;
      view=hiddenRoadPresentation(state,course);
      const visible=(view.choiceReady||view.arrivalReady)&&!state.paused;
      set(section,'hidden',!visible);
      for(const button of [enter,back]){set(button,'hidden',!view.choiceReady);set(button,'disabled',!view.choiceReady);}
      set(menu,'hidden',!view.arrivalReady);set(menu,'disabled',!visible||!view.arrivalReady);
      set(title,'textContent',view.arrivalReady?'Beyond the wall.':'Come in, driver.');
      set(copy,'textContent',view.arrivalReady?'The Rustwall stands behind you.':"Outsiders don’t find this road by accident. Come in, driver.");
      if(visible&&!wasVisible){
        if(!priorFocus||!section.contains(doc.activeElement))priorFocus=doc.activeElement;
        (view.choiceReady?enter:menu).focus({preventScroll:true});
      }
      if(visible&&wasVisible&&previousPhase!==view.phase)(view.choiceReady?enter:menu).focus({preventScroll:true});
      if(!visible&&wasVisible&&section.contains(doc.activeElement))restoreFocus();
      wasVisible=visible;
      return view;
    },
    dispose(){
      if(disposed)return;disposed=true;
      for(const [node,type,fn] of bindings)node.removeEventListener(type,fn);
      section.remove();restoreFocus();
    }
  };
}
