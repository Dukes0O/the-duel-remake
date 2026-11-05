// G-force classroom board: a steel workshop arm, car, cord, and live meter.
import {BOARD, theme, background, text, keyCap, wrap, fitBoard} from '../classroom/board-art.js';
export {BOARD};
export const pressMovesDrag = false;
const SPEED = Object.freeze({x: 650, y: 115, up:[910,115], down:[690,115]});
const RADIUS = Object.freeze({x: 650, y: 230, up:[910,230], down:[690,230]});
const RUN = [800, 335];
const box = (ctx,x,y,w,h) => {ctx.fillStyle='#171e20';ctx.strokeStyle=theme.beamLight;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.fill();ctx.stroke();};
const hit = (x,y,cx,cy,rx=68,ry=30) => Math.abs(x-cx)<rx && Math.abs(y-cy)<ry;

export function hitTest(view,x,y) {
  for (const [name, control] of [['speed',SPEED],['radius',RADIUS]]) {
    if (view.keys[ name === 'speed' ? 'ArrowRight' : 'ArrowUp'] && hit(x,y,...control.up)) return {action:`${name}:up`};
    if (view.keys[ name === 'speed' ? 'ArrowLeft' : 'ArrowDown'] && hit(x,y,...control.down)) return {action:`${name}:down`};
  }
  if (view.keys.Space && hit(x,y,...RUN,115,33)) return {action:view.keys.Space};
  if (view.asking) for (let i=0;i<view.cards.length;i++) if (hit(x,y,650+i%2*155,440+Math.floor(i/2)*90,140,38)) return {action:view.cards[i].id};
  return null;
}
export function hoverInfo(view,x,y) {
  if (hit(x,y,380,370,170,160)) return 'The arm turns around its marked centre. The car follows the arm at the selected radius.';
  if (hit(x,y,380,370,220,220)) return `The car is travelling at ${view.speedKmh.toFixed(1)} km/h on a turn with a ${view.radiusM} m radius.`;
  if (hit(x,y,500,220,80,100)) return `The cord shows the sideways acceleration. The meter reads ${view.g.toFixed(2)} g.`;
  if (hit(x,y,...SPEED.up) || hit(x,y,...SPEED.down)) return 'The speed dial changes the car speed and the G-force calculation.';
  if (hit(x,y,...RADIUS.up) || hit(x,y,...RADIUS.down)) return 'The radius control moves the car inward or outward along the arm.';
  if (hit(x,y,...RUN,130,40)) return 'Run the selected settings and record the meter reading.';
  return null;
}
export function targetPoint(view,action) {
  if (action==='speed:up') return SPEED.up;
  if (action==='speed:down') return SPEED.down;
  if (action==='radius:up') return RADIUS.up;
  if (action==='radius:down') return RADIUS.down;
  if (action==='run') return RUN;
  if (action?.startsWith('answer:')) { const i=Number(action.split(':')[1]); return [650+i%2*155,440+Math.floor(i/2)*90]; }
  return null;
}
function panelButton(ctx,xy,label,key,enabled) {
  const [x,y]=xy;ctx.globalAlpha=enabled?1:.35;ctx.fillStyle='#30383a';ctx.strokeStyle='#c7a45b';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-55,y-20,110,40,5);ctx.fill();ctx.stroke();
  text(ctx,label,x+10,y,{size:16,weight:700});keyCap(ctx,x-35,y,key);ctx.globalAlpha=1;
}
function drawArm(ctx,v) {
  const cx=365,cy=360,scale=2.15,r=Math.min(205,v.radiusM*scale),angle=-.48;
  ctx.strokeStyle='#6b7371';ctx.lineWidth=15;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI*1.12,Math.PI*1.88);ctx.stroke();
  ctx.strokeStyle='#c8a457';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r);ctx.stroke();
  ctx.fillStyle='#d2b46a';ctx.beginPath();ctx.arc(cx,cy,17,0,Math.PI*2);ctx.fill();
  const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
  ctx.strokeStyle='#d7c89e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x-4,y+72);ctx.stroke();
  ctx.fillStyle='#c94e37';ctx.beginPath();ctx.roundRect(x-31,y-4,63,32,7);ctx.fill();
  ctx.fillStyle='#202829';ctx.beginPath();ctx.roundRect(x-18,y+2,36,14,3);ctx.fill();
  ctx.strokeStyle='#f0cb65';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-4,y+72);ctx.lineTo(x-31,y+95);ctx.stroke();
  ctx.fillStyle='#f0cb65';ctx.beginPath();ctx.arc(x-31,y+95,12,0,Math.PI*2);ctx.fill();
  text(ctx,`${v.radiusM} m`,cx+Math.cos(angle)*r*.48+10,cy+Math.sin(angle)*r*.48,{size:16,weight:800,colour:'#f0cb65'});
  return {x,y};
}
function drawAnswers(ctx,v) {
  v.cards.forEach((card,i)=>{
    const x=650+i%2*155,y=440+Math.floor(i/2)*90;ctx.fillStyle=card.state==='right'?'#28533a':card.state==='wrong'?'#65352f':'#272f31';ctx.strokeStyle=card.state==='right'?'#83d99e':'#b9a46b';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-140,y-34,280,68,7);ctx.fill();ctx.stroke();wrap(ctx,card.label,x,y,250,{size:17,weight:700,colour:'#f2eddf'});keyCap(ctx,x-120,y,String(i+1));
  });
}
export function drawBoard(ctx,view,width=1000,height=680) {
  fitBoard(ctx,width,height,()=>{background(ctx,'G-FORCE WORKSHOP');
  text(ctx,'TURNING ARM · SIDEWAYS LOAD',45,46,{size:17,weight:800,colour:'#d5b65f'});
  const car=drawArm(ctx,view);
  // A plumb line and a live force arrow make the changing load visible.
  ctx.strokeStyle='#b4bcb6';ctx.lineWidth=2;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(car.x,car.y+10);ctx.lineTo(car.x,car.y+96);ctx.stroke();ctx.setLineDash([]);
  const shownG=view.meterReference == null ? view.g : Number(view.meterReference);
  const lean=Math.min(33,shownG*20), y=car.y+72;ctx.strokeStyle='#f0cb65';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(car.x,y);ctx.lineTo(car.x+lean,y+34);ctx.stroke();ctx.fillStyle='#f0cb65';ctx.beginPath();ctx.arc(car.x+lean,y+34,7,0,Math.PI*2);ctx.fill();
  box(ctx,570,65,390,95);text(ctx,'SPEED',600,91,{size:14,weight:800,colour:'#d6bd79'});text(ctx,`${view.speedKmh.toFixed(1)} km/h`,790,91,{size:24,weight:800});
  panelButton(ctx,SPEED.down,'Slower','←',Boolean(view.keys.ArrowLeft));panelButton(ctx,SPEED.up,'Faster','→',Boolean(view.keys.ArrowRight));
  box(ctx,570,180,390,95);text(ctx,'TURN RADIUS',600,205,{size:14,weight:800,colour:'#d6bd79'});text(ctx,`${view.radiusM} m`,790,205,{size:24,weight:800});
  panelButton(ctx,RADIUS.down,'Shorter','↓',Boolean(view.keys.ArrowDown));panelButton(ctx,RADIUS.up,'Wider','↑',Boolean(view.keys.ArrowUp));
  box(ctx,570,295,390,86);text(ctx,'G-METER',600,320,{size:14,weight:800,colour:'#d6bd79'});text(ctx,`${shownG.toFixed(2)} g`,790,350,{size:32,weight:900,colour:'#9ee7ab'});
  ctx.fillStyle='#384344';ctx.fillRect(610,360,260,8);ctx.fillStyle='#72c888';ctx.fillRect(610,360,Math.min(260,shownG/3.5*260),8);text(ctx,'0 g',610,378,{size:13});text(ctx,'3.5 g',870,378,{size:13});
  if(view.rows?.length){box(ctx,50,510,900,115);text(ctx,'YOUR TESTS',75,537,{size:15,weight:800,colour:'#d6bd79'});view.rows.slice(-3).forEach((r,i)=>text(ctx,`Run ${i+1}: ${r.speed.toFixed(1)} km/h · ${r.radius} m · ${r.g} g`,90,568+i*23,{size:16}));}
  if(view.asking)drawAnswers(ctx,view);
  if(view.keys.Space){panelButton(ctx,RUN,'Run turn','Space',true);}
  if(view.cards?.length && !view.asking)drawAnswers(ctx,view);
  text(ctx,'A larger radius moves the car farther from the centre.',50,655,{size:15,colour:'#d8d3c7'});
  });
}
export function drawPicture(ctx,picture,width,height) {
  ctx.save();ctx.fillStyle='#252d30';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#c6a75e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(width/2,height/2,Math.min(width,height)*.3,0,Math.PI*1.6);ctx.stroke();
  ctx.fillStyle='#f0cb65';ctx.beginPath();ctx.arc(width*.68,height*.35,6,0,Math.PI*2);ctx.fill();text(ctx,`${Number(picture.g).toFixed(2)} g`,width/2,height*.82,{size:16,weight:800});ctx.restore();
}
