// The suspension classroom board: a spring rig with a fixed legend and live readings.
import {BOARD, theme, background, text, keyCap, fitBoard, wrap} from '../classroom/board-art.js';

export {BOARD};
export const pressMovesDrag = false;
const SOFT = [660, 205], STIFF = [880, 205], BUMPY = [660, 345], SMOOTH = [880, 345], RUN = [770, 520];
const hit = (x,y,[cx,cy],rx=83,ry=27) => Math.abs(x-cx)<=rx && Math.abs(y-cy)<=ry;
const inside = (x,y,cx,cy,rx,ry) => Math.abs(x-cx)<=rx && Math.abs(y-cy)<=ry;
const answerPoint = [500, 525];

export function hitTest(view,x,y) {
  if (view.asking) return null;
  for (const [point,action,key] of [[SOFT,'spring:soft','1'],[STIFF,'spring:stiff','2'],[BUMPY,'road:bumpy','3'],[SMOOTH,'road:smooth','4'],[RUN,'run','Space']]) if (hit(x,y,point,point===RUN?90:82,point===RUN?25:26) && view.keys[key]) return {action};
  return null;
}
export function hoverInfo(view,x,y) {
  if (inside(x,y,255,325,160,120)) return `The selected ${view.setup.spring} spring sits between the wheel and car body.`;
  if (hit(x,y,SOFT) || hit(x,y,STIFF)) return 'Choose which spring the rig will use.';
  if (hit(x,y,BUMPY) || hit(x,y,SMOOTH)) return 'Choose the road surface for the next run.';
  if (hit(x,y,RUN)) return 'Run the selected spring and road through the rig.';
  return null;
}
export function targetPoint(view,action) {
  if (action?.startsWith('answer:')) return null;
  if (action==='spring:soft') return SOFT;
  if (action==='spring:stiff') return STIFF;
  if (action==='road:bumpy') return BUMPY;
  if (action==='road:smooth') return SMOOTH;
  if (action==='run' || action==='show') return RUN;
  return view.focus==='spring'?SOFT:[255,325];
}
function panel(ctx,x,y,w,h) { ctx.fillStyle='rgba(13,18,20,.91)'; ctx.strokeStyle=theme.beamLight; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(x,y,w,h,8); ctx.fill(); ctx.stroke(); }
function button(ctx,[x,y],label,key,selected,enabled) {
  ctx.globalAlpha=enabled?1:.43; ctx.fillStyle=selected?'#654c27':'#252c2f'; ctx.strokeStyle=selected?theme.accent:'#778083'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(x-80,y-24,160,48,6); ctx.fill(); ctx.stroke();
  text(ctx,label,x+9,y,{size:15,weight:800}); keyCap(ctx,x-49,y,key); ctx.globalAlpha=1;
}
function rig(ctx,view) {
  const {spring,road}=view.setup;
  // Base and road stay inside the left board field and do not overlap controls.
  ctx.fillStyle='#454c4d'; ctx.fillRect(70,438,370,18); ctx.fillStyle='#a58b58'; ctx.fillRect(105,456,300,6);
  if (road==='bumpy') for(let i=0;i<6;i++){const x=120+i*48; ctx.fillStyle='#747775'; ctx.beginPath(); ctx.ellipse(x,438,16,10,0,Math.PI,Math.PI*2); ctx.fill();}
  const wheelY=road==='bumpy'?416:430, bodyY=wheelY-112;
  ctx.strokeStyle='#bfa562'; ctx.lineWidth=4;
  // coil spring drawn as a readable zig-zag between the wheel and body.
  ctx.beginPath(); ctx.moveTo(255,wheelY-8); for(let i=0;i<7;i++) ctx.lineTo(240+(i%2)*30,wheelY-17-i*10); ctx.lineTo(255,bodyY+34); ctx.stroke();
  ctx.fillStyle='#202729'; ctx.beginPath(); ctx.arc(255,wheelY,34,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#aeb2ad'; ctx.lineWidth=3; ctx.stroke();
  const carPaint=ctx.createLinearGradient(160,bodyY-35,350,bodyY+35); carPaint.addColorStop(0,'#e4ded0'); carPaint.addColorStop(1,'#747c7c'); ctx.fillStyle=carPaint; ctx.strokeStyle='#1a2022'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(155,bodyY-25,200,55,12); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#43535a'; ctx.fillRect(196,bodyY-19,48,25); ctx.fillRect(253,bodyY-19,45,25);
  text(ctx,`${spring} spring`,255,bodyY-48,{size:15,weight:900,colour:theme.accent});
  text(ctx,view.result?`${view.result.bodyShake.toFixed(2)} m/s² body shake`:'Body shake: predict the reading',255,490,{size:15,weight:800});
  text(ctx,view.result?`${view.result.leanDeg.toFixed(1)}° body roll in model bend`:'Body roll: use the model rule',255,512,{size:14,weight:700,colour:'#d5c7a6'});
  text(ctx,view.result?`Tyre contact ${(view.result.contactShare*100).toFixed(1)}%`:'Tyre contact is measured by the rig',255,535,{size:13,weight:700,colour:'#a9d9aa'});
  text(ctx,road==='bumpy'?'BUMPY ROAD':'SMOOTH ROAD',255,580,{size:13,weight:900,colour:'#d5b65f'});
}
function controls(ctx,view) {
  panel(ctx,520,150,430,275); text(ctx,'SELECT THE TEST SETTINGS',545,178,{size:14,align:'left',weight:900,colour:'#d5b65f'});
  text(ctx,'SPRING',545,218,{size:13,align:'left',weight:900});
  button(ctx,SOFT,'Soft','1',view.setup.spring==='soft',Boolean(view.keys['1'])); button(ctx,STIFF,'Stiff','2',view.setup.spring==='stiff',Boolean(view.keys['2']));
  text(ctx,'ROAD SURFACE',545,305,{size:13,align:'left',weight:900});
  button(ctx,BUMPY,'Bumpy','3',view.setup.road==='bumpy',Boolean(view.keys['3'])); button(ctx,SMOOTH,'Smooth','4',view.setup.road==='smooth',Boolean(view.keys['4']));
  if(view.keys.Space) button(ctx,RUN,'Run the rig','Sp',false,true);
}
function results(ctx,view) {
  if(!view.rows.length) return;
  panel(ctx,520,440,430,215); text(ctx,'RECORDED RUNS',540,466,{size:13,align:'left',weight:900,colour:'#d5b65f'});
  view.rows.slice(-4).forEach((row,i)=>text(ctx,`${row.spring} · ${row.road}: ${row.shake} m/s² shake · ${row.roll}° roll · ${row.contact}% contact`,540,495+i*34,{size:13,align:'left',weight:700}));
}
function glow(ctx,view) { const box=view.glow==='settings'?[518,148,434,280]:view.glow==='spring'?[575,175,370,65]:null; if(!box)return; ctx.strokeStyle=theme.accent;ctx.globalAlpha=.65+.2*Math.sin(view.time*5);ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(...box,10);ctx.stroke();ctx.globalAlpha=1; }
function recap(ctx,view) {
  const w=280,gap=24,x0=(BOARD.width-3*w-2*gap)/2;
  view.ideas.forEach((idea,i)=>{const x=x0+i*(w+gap);panel(ctx,x,45,w,590);text(ctx,String(i+1),x+24,76,{size:25,colour:theme.accent});wrap(ctx,idea.text,x+w/2,112,w-42,{size:18,weight:600});
    if(idea.id==='spring'){text(ctx,'wheel',x+w/2,350,{size:17,weight:900});text(ctx,'zig-zag coil',x+w/2,395,{size:16,colour:'#d5b65f'});text(ctx,'car body',x+w/2,440,{size:17,weight:900});}
    if(idea.id==='shake'){text(ctx,'soft / bumpy',x+w/2,365,{size:15,weight:800});text(ctx,'4.09 m/s²',x+w/2,400,{size:20,colour:'#a9d9aa'});text(ctx,'stiff / bumpy',x+w/2,450,{size:15,weight:800});text(ctx,'4.77 m/s²',x+w/2,485,{size:20,colour:'#a9d9aa'});}
    if(idea.id==='roll'){text(ctx,'soft spring',x+w/2,365,{size:15,weight:800});text(ctx,'6.5°',x+w/2,400,{size:20,colour:'#a9d9aa'});text(ctx,'stiff spring',x+w/2,450,{size:15,weight:800});text(ctx,'2.2°',x+w/2,485,{size:20,colour:'#a9d9aa'});}
  });
}
export function drawBoard(ctx,view,width=BOARD.width,height=BOARD.height) { return fitBoard(ctx,width,height,()=>{background(ctx); if(view.scene==='recap'){recap(ctx,view);return;} text(ctx,'SUSPENSION SHAKER RIG',40,30,{size:15,align:'left',weight:900,colour:'#d5b65f'}); rig(ctx,view); controls(ctx,view); results(ctx,view); glow(ctx,view); }); }
export function drawPicture(ctx,picture,width,height) {
  ctx.save(); const grad=ctx.createLinearGradient(0,0,0,height);grad.addColorStop(0,'#343c3f');grad.addColorStop(1,'#1b2224');ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
  const cx=width*.5,cy=height*.5;ctx.strokeStyle='#c6a75e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy-29);ctx.lineTo(cx,cy+22);ctx.stroke();ctx.fillStyle='#d9a640';ctx.beginPath();ctx.arc(cx,cy+29,18,0,Math.PI*2);ctx.fill();
  const unknown=picture.shake==null; text(ctx,unknown?'Result?':`${picture.shake.toFixed(2)} m/s²`,cx,cy-34,{size:14,weight:900});text(ctx,unknown?'Reading?':`${picture.roll.toFixed(1)}° body roll`,cx,cy+57,{size:12,weight:800});ctx.restore();
}
