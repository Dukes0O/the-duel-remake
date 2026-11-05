import {buildingById} from '../content/registry.js';

export function bindTownInput(root,{command=()=>{},viewAction=()=>{},onMessage=()=>{}}={}) {
  if(!root?.addEventListener) throw new TypeError('Choose a place for town controls first.');
  let selectedBuilding=null,rotation=0,dragStart=null;
  const message=text=>{onMessage(text);const node=root.querySelector('[role="status"]');if(node)node.textContent=text;};
  const click=event=>{
    const target=event.target.closest?.('[data-town-tab],[data-town-build],[data-town-speed],[data-town-overlay],[data-town-action]');if(!target)return;
    if(target.dataset.townBuild){selectedBuilding=target.dataset.townBuild;viewAction({type:'selectBuilding',buildingId:selectedBuilding,rotation});return;}
    if(target.dataset.townTab){viewAction({type:'showBuildTab',tab:target.dataset.townTab});return;}
    if(target.dataset.townSpeed!==undefined){command({type:'setSpeed',speed:Number(target.dataset.townSpeed)});return;}
    if(target.dataset.townOverlay){viewAction({type:'setOverlay',overlay:target.dataset.townOverlay});return;}
    viewAction({type:target.dataset.townAction});
  };
  const down=event=>{if(!selectedBuilding||!event.target.closest?.('.town-map'))return;dragStart=event.target.closest('[data-cell-x][data-cell-z]');};
  const up=event=>{
    if(!selectedBuilding||!event.target.closest?.('.town-map'))return;
    const cell=event.target.closest('[data-cell-x][data-cell-z]')||dragStart;
    if(!cell)return;
    const x=Number(cell.dataset.cellX),z=Number(cell.dataset.cellZ);
    if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)){message('Choose a map cell first.');return;}
    const row=buildingById.get(selectedBuilding);
    const building=rotation%180===90?{...row,width:row.depth,depth:row.width}:row;
    command({type:'placeBuilding',buildingId:selectedBuilding,building,x,z});dragStart=null;
  };
  const cancel=()=>{selectedBuilding=null;dragStart=null;rotation=0;viewAction({type:'cancelPlacement'});};
  const contextmenu=event=>{if(selectedBuilding){event.preventDefault();cancel();}};
  const keydown=event=>{
    if(event.key==='Escape'){cancel();return;}
    if(event.key.toLowerCase()==='r'&&selectedBuilding){rotation=(rotation+90)%360;viewAction({type:'rotatePlacement',rotation});}
  };
  root.addEventListener('click',click);root.addEventListener('pointerdown',down);root.addEventListener('pointerup',up);root.addEventListener('contextmenu',contextmenu);root.addEventListener('keydown',keydown);
  return {getPlacement:()=>({buildingId:selectedBuilding,rotation}),cancel,dispose(){root.removeEventListener('click',click);root.removeEventListener('pointerdown',down);root.removeEventListener('pointerup',up);root.removeEventListener('contextmenu',contextmenu);root.removeEventListener('keydown',keydown);}};
}
