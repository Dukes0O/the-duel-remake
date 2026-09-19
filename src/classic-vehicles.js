import * as THREE from 'three';
import {prepareVehicleDamage} from './vehicles.js';
import {originalVehicleParts as craft} from './unlock-vehicles.js';

// Original classic silhouettes. Both are built synchronously for player, rival
// and ghost; no downloaded concept mesh or temporary sports-car substitute.
export const CLASSIC_VEHICLE_DIMENSIONS=Object.freeze({
  falcone_f42:{width:2.30,length:4.80,height:1.36,wheelRadius:.40},
  stuttgart_959s:{width:2.30,length:4.80,height:1.48,wheelRadius:.41},
});
const defaults={falcone_f42:[0xc81d11,0xf2c200],stuttgart_959s:[0xded6c8,0x2b6cb0]};
const {materials,batch,body,panel,cylinder,cockpit,wheels,exhaust,rearPlate,fitSurfacePatch}=craft;

export function createClassicVehicle({key,color,accent}={}) {
  if(!Object.hasOwn(CLASSIC_VEHICLE_DIMENSIONS,key))return null;
  const vehicle=new THREE.Group();vehicle.name=key;const m=materials(color??defaults[key][0],accent??defaults[key][1]);
  m.paint.metalness=key==='stuttgart_959s'?.46:.30;m.paint.roughness=.27;
  const d=vehicle.userData;Object.assign(d,{paint:m.paint,originalColor:m.paint.color.clone(),wheels:[],wheelPivots:[],brakeLights:[],boostFlames:[],damageMeshes:[],size:{...CLASSIC_VEHICLE_DIMENSIONS[key]},classicKey:key});
  const b=batch(vehicle);
  if(key==='falcone_f42')falcone(vehicle,b,m);else stuttgart(vehicle,b,m);
  b.finish(d);fittedDetails(vehicle,m,key);prepareVehicleDamage(vehicle);vehicle.updateMatrixWorld(true);return vehicle;
}

function shell(b,m,sections,axles,radius,opening) {
  const geometry=body(sections,axles,radius),positions=geometry.attributes.position,index=geometry.index,kept=[];
  // Open the center tub under the actual cabin. Occupants sit below the beltline;
  // a continuous painted hood through this region would hide their bodies.
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],x=ids.reduce((sum,k)=>sum+positions.getX(k),0)/3,y=ids.reduce((sum,k)=>sum+positions.getY(k),0)/3,z=ids.reduce((sum,k)=>sum+positions.getZ(k),0)/3;
    if(opening&&Math.abs(x)<opening.width&&y>opening.y&&z>opening.back&&z<opening.front)continue;
    kept.push(...ids);
  }
  geometry.setIndex(kept);b.add(geometry,m.paint);geometry.dispose();
}

function window(b,m,points) {
  const positions=points.flat(),indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();b.add(geometry,m.glass);geometry.dispose();
  b.tube(m.carbon,[...points,points[0]],.017,Math.max(16,points.length*5));
}

function falcone(vehicle,b,m) {
  shell(b,m,[[-2.36,.98,.28,.78,.86,.83],[-2.02,1.11,.26,.91,.97,.89],[-1.43,1.11,.23,.98,1.04,.90],[-.72,1.06,.23,.90,.95,.86],[.26,1.01,.24,.78,.86,.85],[1.24,1.09,.25,.86,.89,.89],[1.73,1.065,.27,.71,.74,.87],[2.17,1.01,.32,.57,.60,.86],[2.38,.91,.35,.54,.57,.81]],[1.35,-1.41],.40,{width:.71,y:.7,back:-1.04,front:.60});
  // Broad, flat flying buttresses frame the louvered mid-engine rear deck.
  for(const side of[-1,1]) {
    const roofEdge=[[side*.72,.93,-1.54],[side*.68,1.29,-.67],[side*.67,1.30,.02],[side*.80,.89,.84]];
    const pillar=[[side*.89,.94,-1.56],[side*.72,1.28,-.68],[side*.62,1.29,-.55],[side*.72,.97,-1.54]];
    panel(b,m.paint,side>0?pillar.reverse():pillar);
    window(b,m,[[side*.81,.90,.79],[side*.70,1.276,.03],[side*.67,1.275,-.58],[side*.83,.935,-.94]]);
    b.tube(m.paint,roofEdge,.032,16);
    b.tube(m.carbon,[[side*.82,.917,.76],[side*.83,.935,-1.03]],.020,3);
    b.tube(m.carbon,[[side*.75,1.13,-.32],[side*.82,.94,-.32]],.015,2);
    b.box(m.paint,[.17,.086,.23],[side*1.01,.965,.63],[0,side*.12,0],.027);
    b.box(m.alloy,[.12,.048,.008],[side*1.01,.968,.507],[0,side*.12,0],.010);
    b.box(m.carbon,[.10,.10,2.07],[side*1.055,.30,-.02],[0,0,0],.018);
    // Deep rectangular side ducts remain outside the rear-quarter skin.
    b.box(m.carbon,[.045,.25,.54],[side*1.094,.686,-.78],[0,0,0],.025);
    for(let i=0;i<4;i++)b.box(m.darkAlloy,[.013,.022,.47],[side*1.123,.597+i*.057,-.78],[0,0,0],.006);
    b.box(m.carbon,[.03,.031,.13],[side*1.056,.79,-.24],[0,0,0],.009);
    // The freestanding bridge wing rises above a full-width grille and circles.
    const stand=[[side*.998,.89,-2.26],[side*.998,1.34,-2.26],[side*.998,1.34,-1.91],[side*.998,.98,-1.91]];
    const extrude=new THREE.Shape(stand.map(p=>new THREE.Vector2(p[2],p[1]))),geo=new THREE.ExtrudeGeometry(extrude,{depth:.068,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,steps:1});
    geo.rotateY(-Math.PI/2).translate(side*.998+.034,0,0);b.add(geo,m.paint);geo.dispose();
  }
  window(b,m,[[-.81,.90,.84],[.81,.90,.84],[.665,1.278,.035],[-.665,1.278,.035]]);
  window(b,m,[[.71,.968,-1.40],[-.71,.968,-1.40],[-.635,1.27,-.63],[.635,1.27,-.63]]);
  b.box(m.paint,[1.39,.051,.73],[0,1.303,-.315],[.016,0,0],.025);
  b.box(m.carbon,[1.38,.105,.28],[0,.874,.57],[-.06,0,0],.025);
  b.box(m.carbon,[1.43,.08,1.33],[0,.51,-.11],[0,0,0],.030);
  b.box(m.paint,[2.07,.060,.37],[0,1.329,-2.09],[-.025,0,0],.016);
  for(let i=0;i<10;i++) {
    const z=-.71-i*.123,y=1.25-i*.037;
    b.box(m.carbon,[1.23+i*.022,.028,.073],[0,y,z],[-.13,0,0],.007);
  }
  b.box(m.carbon,[1.84,.267,.034],[0,.724,-2.376],[0,0,0],.010);
  for(let i=0;i<6;i++)b.box(m.darkAlloy,[.78,.015,.014],[0,.622+i*.039,-2.399],[0,0,0],.002);
  for(const x of[-.75,-.48,.48,.75]) {
    cylinder(b,m.carbon,.122,.025,[x,.751,-2.392],[Math.PI/2,0,0],28);
    const ring=new THREE.TorusGeometry(.078,.025,10,28);b.add(ring,m.brake,[x,.751,-2.410]);ring.dispose();
    cylinder(b,m.exhaust,.051,.012,[x,.751,-2.413],[Math.PI/2,0,0],24);
  }
  for(const side of[-1,1]) {
    b.box(m.carbon,[.64,.145,.025],[side*.55,.458,2.386],[0,0,0],.014);
    b.box(m.headlight,[.46,.082,.012],[side*.60,.469,2.403],[0,0,0],.012);
    for(let i=0;i<4;i++)b.box(m.darkAlloy,[.009,.082,.004],[side*.60+(i-1.5)*.094,.469,2.412],[0,0,0],0);
    for(let i=0;i<5;i++)b.box(m.carbon,[.23,.009,.026],[side*.81,.773-i*.034,1.72+i*.088],[.32,0,0],.002);
  }
  b.box(m.carbon,[1.84,.045,.16],[0,.337,2.29],[0,0,0],.012);
  b.box(m.carbon,[1.80,.045,.32],[0,.24,-2.18],[0,0,0],.012);
  for(let i=-3;i<=3;i++)b.box(m.carbon,[.022,.15,.27],[i*.21,.30,-2.22],[.08,0,0],.003);
  rearPlate(b,m,.485,-2.398,.32,.105);
  cockpit(vehicle,b,m,[.365,.045,-.27],.86);
  wheels(vehicle,m,{radius:.40,width:.32,track:.987,axles:[1.35,-1.41],spokes:5,roadSmooth:true});
  exhaust(vehicle,b,m,[[-.18,.34,-2.301],[.18,.34,-2.301]],.067);
  vehicle.userData.damageSpace={scale:[1.00,.93,1.00],offset:[0,0,0],frontGlassZ:.50,rearGlassZ:-.98};
}

function stuttgart(vehicle,b,m) {
  shell(b,m,[[-2.36,.83,.31,.72,.83,.71],[-2.12,1.02,.28,.86,.99,.87],[-1.51,1.12,.25,.98,1.10,.89],[-.91,1.09,.25,.96,1.02,.84],[-.12,1.01,.25,.86,.93,.80],[.62,1.025,.27,.86,.95,.80],[1.31,1.10,.27,.98,1.035,.81],[1.77,1.068,.31,.915,.995,.80],[2.13,.955,.35,.77,.82,.77],[2.38,.78,.40,.64,.69,.67]],[1.34,-1.41],.41,{width:.70,y:.73,back:-1.12,front:.62});
  // A curved coupe roof and bowed glazing form the upright continuous cabin.
  const roof=new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2);
  b.add(roof,m.paint,[0,1.345,-.40],[0,0,0],[.684,.128,.63]);roof.dispose();
  const wind=[];
  for(let i=0;i<=16;i++){const x=(i/16*2-1),bulge=1-x*x;wind.push([x*.78,.965+.019*bulge,.88+.038*bulge],[x*.639,1.382+.036*bulge,-.04+.055*bulge]);}
  ribbonWindow(b,m,wind);
  const rear=[];for(let i=0;i<=16;i++){const x=i/16*2-1,bulge=1-x*x;rear.push([x*.79,1.004+.026*bulge,-1.61-.065*bulge],[x*.637,1.371+.029*bulge,-.82-.043*bulge]);}ribbonWindow(b,m,rear);
  for(const side of[-1,1]) {
    const sideWindow=[[side*.815,.98,.76],[side*.745,1.19,.37],[side*.654,1.376,-.045],[side*.648,1.374,-.80],[side*.80,1.025,-1.22]];
    window(b,m,sideWindow);
    b.tube(m.paint,[[side*.812,.957,.88],[side*.744,1.20,.33],[side*.657,1.39,-.055],[side*.657,1.385,-.79],[side*.833,1.009,-1.65]],.037,24);
    const pillar=[[side*.812,1.004,-1.63],[side*.645,1.372,-.80],[side*.631,1.377,-.65],[side*.809,1.025,-1.18]];panel(b,m.paint,side>0?pillar.reverse():pillar);
    b.tube(m.carbon,[[side*.797,1.023,-.69],[side*.667,1.368,-.58]],.021,3);
    b.tube(m.carbon,[[side*.824,.969,.70],[side*.845,.995,-1.19]],.014,4);
    b.box(m.paint,[.18,.107,.235],[side*1.008,1.075,.63],[0,side*.13,0],.040);
    b.box(m.alloy,[.125,.062,.009],[side*1.009,1.081,.502],[0,side*.13,0],.013);
    b.box(m.carbon,[.023,.035,.17],[side*1.027,.86,-.36],[0,0,0],.013);
    b.box(m.paint,[.12,.13,1.97],[side*1.029,.325,-.03],[0,0,0],.032);
    b.box(m.carbon,[.37,.071,.032],[side*.665,.508,2.369],[0,side*.045,0],.026);
    b.box(m.headlight,[.24,.040,.013],[side*.686,.514,2.389],[0,side*.045,0],.015);
    b.box(m.carbon,[.036,.12,.34],[side*1.097,.70,-.83],[0,0,0],.035);
    for(let i=0;i<3;i++)b.box(m.darkAlloy,[.012,.016,.28],[side*1.119,.666+i*.038,-.83],[0,0,0],.004);
  }
  b.box(m.carbon,[1.40,.107,.29],[0,.928,.57],[-.13,0,0],.035);
  b.box(m.carbon,[1.39,.09,1.32],[0,.53,-.10],[0,0,0],.034);
  // The integrated hoop is low and broad; it never resembles Falcone's high
  // freestanding bridge. Curved ends merge into the rear shoulders.
  for(const side of[-1,1])b.tube(m.paint,[[side*1.013,.94,-2.13],[side*1.031,1.045,-2.055],[side*.98,1.092,-1.99]],.062,12);
  b.box(m.paint,[1.96,.061,.285],[0,1.108,-2.045],[-.04,0,0],.026);
  b.box(m.carbon,[1.53,.117,.042],[0,.749,-2.365],[0,0,0],.026);
  b.box(m.brake,[1.42,.082,.019],[0,.756,-2.392],[0,0,0],.020);
  for(const side of[-1,1]) {
    b.box(m.plate,[.15,.051,.010],[side*.56,.748,-2.405],[0,0,0],.010);
    b.box(m.carbon,[.38,.024,.013],[side*.48,.787,-2.409],[0,0,0],.005);
  }
  b.box(m.carbon,[1.57,.083,.071],[0,.486,-2.340],[0,0,0],.030);
  rearPlate(b,m,.58,-2.385,.34,.115);
  b.box(m.carbon,[1.48,.040,.19],[0,.388,2.29],[0,0,0],.018);
  cockpit(vehicle,b,m,[.372,.090,-.24],.92);
  wheels(vehicle,m,{radius:.41,width:.32,track:.987,axles:[1.34,-1.41],spokes:5,roadSmooth:true,broadSpokes:true});
  exhaust(vehicle,b,m,[[-.58,.36,-2.275],[.58,.36,-2.275]],.064);
  vehicle.userData.damageSpace={scale:[1.00,1.04,1.00],offset:[0,.035,0],frontGlassZ:.40,rearGlassZ:-1.20};
}

function ribbonWindow(b,m,points) {
  const positions=[],indices=[];for(const p of points)positions.push(...p);
  for(let i=0;i<points.length/2-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();b.add(g,m.glass);g.dispose();
  b.tube(m.carbon,points.filter((_,i)=>i%2===0),.015,24);b.tube(m.carbon,points.filter((_,i)=>i%2===1),.015,24);
}

function fittedDetails(vehicle,m,key) {
  vehicle.updateMatrixWorld(true);const surfaces=vehicle.userData.damageMeshes.filter(v=>v.mesh.material===m.paint).map(v=>v.mesh),b=batch(vehicle),ray=new THREE.Raycaster();
  const seam=(points,axis='top',side=1)=>{let run=[];const flush=()=>{if(run.length>1)b.tube(m.carbon,run,.0025,Math.max(8,run.length));run=[];};
    for(let edge=1;edge<points.length;edge++)for(let i=0;i<=12;i++){const a=points[edge-1],c=points[edge],u=a[0]+(c[0]-a[0])*i/12,v=a[1]+(c[1]-a[1])*i/12;ray.set(axis==='top'?new THREE.Vector3(u,3,v):new THREE.Vector3(side*3,u,v),axis==='top'?new THREE.Vector3(0,-1,0):new THREE.Vector3(-side,0,0));const hit=ray.intersectObjects(surfaces,false)[0];if(hit)run.push(hit.point.addScaledVector(hit.face.normal,.007).toArray());else flush();}flush();};
  for(const side of[-1,1]) {
    seam(key==='falcone_f42'?[[.83,.54],[.43,.52],[.43,-.57],[.87,-.57]]:[[.91,.65],[.46,.60],[.46,-.69],[.95,-.70]],'side',side);
    if(key==='falcone_f42') {
      seam([[side*.43,1.44],[side*.82,1.44],[side*.82,1.92],[side*.43,1.92],[side*.43,1.44]]);
      fitSurfacePatch(surfaces,b,m.carbon,[[side*.22,.97],[side*.31,1.02],[side*.23,1.42],[side*.12,1.38]],'top');
      seam([[side*.31,.97],[side*.31,2.11]]);
    } else {
      seam([[side*.56,.96],[side*.57,1.44],[side*.45,2.05],[side*.17,2.18]]);
      // Millimetre-offset lenses follow the actual curved fender triangles.
      // Their outline is elliptical in plan; no separate bulb floats over the hood.
      for(const[rx,rz,material,lift]of[[.177,.268,m.carbon,.004],[.164,.249,m.alloy,.006],[.147,.229,m.headlight,.008]]) {
        const points=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;points.push([side*.777+Math.cos(a)*rx,1.865+Math.sin(a)*rz]);}
        fitSurfacePatch(surfaces,b,material,points,'top',1,.5,lift);
      }
      // Wrap cooling mouths and thin slats over the real rounded bumper, with
      // the same fitted-triangle treatment used by the inset fender lamps.
      const port=[[side*.435,.53],[side*.87,.53],[side*.90,.675],[side*.46,.689]];
      fitSurfacePatch(surfaces,b,m.carbon,port,'front',1,.5,.004);
      for(const y of[.559,.604,.649])fitSurfacePatch(surfaces,b,m.darkAlloy,[[side*.453,y],[side*.880,y],[side*.880,y+.010],[side*.453,y+.010]],'front',1,.5,.007);
    }
  }
  if(key==='stuttgart_959s') {
    fitSurfacePatch(surfaces,b,m.carbon,[[-.58,-1.45],[.58,-1.45],[.64,-1.96],[-.64,-1.96]],'top');
    for(let i=0;i<8;i++){const z=-1.48-i*.06;fitSurfacePatch(surfaces,b,m.darkAlloy,[[-.60,z],[.60,z],[.60,z-.018],[-.60,z-.018]],'top',1,.5,.007);}
    for(const x of[-.22,.22])fitSurfacePatch(surfaces,b,m.carbon,[[x-.012,-1.46],[x+.012,-1.46],[x+.012,-1.94],[x-.012,-1.94]],'top',1,.5,.009);
  }
  seam([[-.78,-2.15],[-.78,-1.37],[.78,-1.37],[.78,-2.15]]);
  b.finish(vehicle.userData);
}
