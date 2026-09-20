import {buildRouteMapGeometry} from './route-map.js';
import {supportsRouteVariants} from './route-variants.js';

export const PREVIEW_BIOMES=Object.freeze({
  desert:Object.freeze({label:'Canyon',color:'#dfaa79'}),
  alpine:Object.freeze({label:'Alpine',color:'#bed3af'}),
  coast:Object.freeze({label:'Coast',color:'#80bdcf'}),
  city:Object.freeze({label:'City',color:'#b3a9d0'}),
  arena:Object.freeze({label:'Stadium',color:'#d5c583'}),
});
export function buildCoursePreview(course,width=320,height=200){
  const map=buildRouteMapGeometry(course,width,height,19);if(!map)return null;
  const biomes=[...new Set(course.sections.map(section=>section.theme))].map(key=>({key,...(PREVIEW_BIOMES[key]||{label:key,color:'#c8d5c2'})}));
  const elevation=new Float32Array(65);let minimum=Infinity,maximum=-Infinity;
  for(let i=0;i<elevation.length;i++){const y=course.at(course.length*i/(elevation.length-1)).y;elevation[i]=y;minimum=Math.min(minimum,y);maximum=Math.max(maximum,y);}
  return {map,biomes,elevation,reliefMeters:Math.round(maximum-minimum),minimum,maximum,showElevation:supportsRouteVariants(course.def)||!!course.def.expansion,laps:course.def.laps||2,distanceKm:course.raceLength/1000};
}
function path(ctx,points){ctx.beginPath();for(let i=0;i<points.length;i+=2)i?ctx.lineTo(points[i],points[i+1]):ctx.moveTo(points[i],points[i+1]);}
// A static menu view. It redraws only when the selected Course or label changes.
export class CoursePreview {
  constructor(canvas,elevationCanvas){this.canvas=canvas;this.context=canvas.getContext('2d');this.elevationCanvas=elevationCanvas;this.elevationContext=elevationCanvas?.getContext('2d');this.cache=new WeakMap();this.course=null;this.label='';this.current=null;}
  update(course,label=''){
    if(!this.canvas||!course)return null;
    let data=this.cache.get(course);if(!data||data.map.width!==this.canvas.width||data.map.height!==this.canvas.height){data=buildCoursePreview(course,this.canvas.width,this.canvas.height);if(!data)return null;this.cache.set(course,data);}
    if(this.course===course&&this.label===label&&this.current===data)return data;
    this.course=course;this.label=label;this.current=data;
    const {map,biomes}=data,ctx=this.context;
    if(ctx){
      ctx.clearRect(0,0,map.width,map.height);ctx.lineCap=ctx.lineJoin='round';
      path(ctx,map.route);ctx.strokeStyle='#0d1e21';ctx.lineWidth=13;ctx.stroke();
      for(const section of map.sections){path(ctx,section.points);ctx.strokeStyle=PREVIEW_BIOMES[section.theme]?.color||'#c8d5c2';ctx.lineWidth=4.2;ctx.stroke();}
      for(const branch of map.branches){path(ctx,branch.points);ctx.strokeStyle=branch.color;ctx.lineWidth=3.3;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);}
      for(const gate of map.gates){ctx.beginPath();ctx.arc(gate.marker.x,gate.marker.y,3.8,0,Math.PI*2);ctx.fillStyle='#ffce75';ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle='#122426';ctx.stroke();}
      ctx.save();ctx.translate(map.finish.x,map.finish.y);ctx.rotate(map.finishHeading);ctx.fillStyle='#0d1e21';ctx.fillRect(-9,-6,18,12);
      for(let x=0;x<4;x++)for(let y=0;y<2;y++){ctx.fillStyle=(x+y)%2?'#132324':'#f2ecd4';ctx.fillRect(-8+x*4,-4+y*4,4,4);}ctx.restore();
    }
    const elevation=this.elevationContext,canvas=this.elevationCanvas;
    if(elevation&&canvas){
      elevation.clearRect(0,0,canvas.width,canvas.height);
      if(data.showElevation){
        const points=new Float32Array(data.elevation.length*2),range=Math.max(1,data.maximum-data.minimum);
        for(let i=0;i<data.elevation.length;i++){points[i*2]=i/(data.elevation.length-1)*(canvas.width-4)+2;points[i*2+1]=canvas.height-3-(data.elevation[i]-data.minimum)/range*(canvas.height-6);}
        path(elevation,points);elevation.lineTo(canvas.width-2,canvas.height);elevation.lineTo(2,canvas.height);elevation.closePath();elevation.fillStyle='#b8cda61a';elevation.fill();path(elevation,points);elevation.lineWidth=2;elevation.strokeStyle='#b5c8a0';elevation.stroke();
      }
    }
    this.canvas.setAttribute('aria-label',`${course.def.name}. ${label}. ${data.laps} laps, ${data.distanceKm.toFixed(1)} kilometers. ${biomes.map(b=>b.label).join(', ')}. ${map.branches.length} dashed shortcut${map.branches.length===1?'':'s'}.${map.gates.length?` ${map.gates.length} gold gate markers per lap.`:''} Checkered line marks the start and finish.${data.showElevation?` Elevation changes by ${data.reliefMeters} meters.`:''}`);
    return data;
  }
  dispose(){this.context?.clearRect(0,0,this.canvas.width,this.canvas.height);this.elevationContext?.clearRect(0,0,this.elevationCanvas.width,this.elevationCanvas.height);this.cache=new WeakMap();this.canvas=this.context=this.elevationCanvas=this.elevationContext=this.current=this.course=null;}
}
