import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original code-built R34 study. Metres, +Z forward. No maker assets or logos.
export const SKYLINE_VEHICLE_DIMENSIONS = Object.freeze({
  nissan_skyline_gtr_r34: Object.freeze({ width: 1.96, length: 4.60, height: 1.25, wheelRadius: .37 }),
});
const { materials, batch, sculpt, panel, cylinder, cockpit, wheels, exhaust, rearPlate } = originalVehicleParts;
const AXLES = [1.32, -1.345];

export function createSkylineVehicle({ key = 'nissan_skyline_gtr_r34', color = 0x1b3d8c, accent = 0xc7ccd1 } = {}) {
  if (!Object.hasOwn(SKYLINE_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Bayside Blue body'; m.paint.metalness = .35; m.paint.roughness = .32;
  m.paint.clearcoat = .38; m.paint.clearcoatRoughness = .24;
  m.glass.color.setHex(0x17252e); m.glass.opacity = .78;
  m.brake.emissiveIntensity = .35;
  m.headlight.color.setHex(0x536575); m.headlight.emissive.setHex(0x687d90); m.headlight.emissiveIntensity = .10;
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SKYLINE_VEHICLE_DIMENSIONS[key] },
    damageSpace: { scale: [.88, .94, 1], offset: [0, 0, 0], frontGlassZ: 1.00, rearGlassZ: -1.28 },
  });
  // Level bonnet, broad flared shoulders and a high square front face.
  sculpt(b, m.paint, [
    [-2.28,.84,.23,.80,.86,.74],[-2.12,.91,.20,.84,.88,.75],
    [-1.75,.95,.19,.85,.89,.76],[-1.345,.96,.18,.88,.90,.73],
    [-.90,.90,.18,.82,.87,.75],[-.20,.89,.18,.81,.86,.75],
    [.55,.90,.18,.82,.87,.75],[1.0,.94,.18,.86,.88,.73],
    [1.32,.96,.18,.88,.89,.73],[1.75,.94,.19,.85,.88,.73],
    [2.10,.90,.20,.82,.85,.74],[2.28,.86,.23,.80,.83,.74],
  ], AXLES, .345, .37, { width: .71, y: .49, back: -1.30, front: 1.14 });
  b.box(m.carbon, [1.42,.055,2.0], [0,.29,-.15], [0,0,0], .01);
  cabin(b, m);
  for (const side of [-1,1]) {
    b.tube(m.carbon,[[side*.685,.90,1.16],[side*.68,.913,1.4],[side*.70,.906,1.82],[side*.70,.875,2.08]],.003,16);
  }
  cockpit(vehicle, b, m, [.34,.015,.02], .84);
  for (const side of [-1,1]) {
    b.box(m.paint,[.095,.095,1.92],[side*.9,.23,-.01],[0,0,0],.018);
    b.box(m.carbon,[.014,.018,.19],[side*.907,.79,-.45],[0,0,0],.005);
    b.tube(m.carbon,[[side*.898,.79,-.59],[side*.902,.36,-.61],[side*.9,.32,.72]],.004,12);
    b.box(m.paint,[.17,.09,.23],[side*.895,.96,1.00],[0,side*.10,0],.025);
    b.box(m.alloy,[.125,.055,.008],[side*.895,.964,.88],[0,side*.10,0],.009);
    // Headlight housings stay outside the closed front cap.
    b.box(m.carbon,[.48,.145,.032],[side*.61,.755,2.29],[0,0,side*.06],.017);
    b.box(m.headlight,[.44,.106,.012],[side*.61,.755,2.311],[0,0,side*.06],.014);
    for (const dx of [-.115,.065]) {
      cylinder(b,m.carbon,.044,.012,[side*.61+dx,.755,2.323],[Math.PI/2,0,0],24);
      const ring = new THREE.TorusGeometry(.041,.005,6,24);
      b.add(ring,m.alloy,[side*.61+dx,.755,2.332]); ring.dispose();
      cylinder(b,m.headlight,.031,.008,[side*.61+dx,.755,2.334],[Math.PI/2,0,0],24);
    }
    b.box(m.carbon,[.29,.13,.016],[side*.67,.37,2.29],[0,0,0],.009);
    cylinder(b,m.carbon,.066,.024,[side*.69,.51,2.30],[Math.PI/2,0,0],24);
    cylinder(b,m.headlight,.049,.016,[side*.69,.51,2.318],[Math.PI/2,0,0],24);
    // Corner wrap, door crease and a painted flare follow each open arch.
    b.box(m.headlight,[.035,.09,.14],[side*.861,.755,2.20],[0,side*.14,0],.008);
    b.tube(m.paint,[[side*.915,.71,-.92],[side*.907,.70,0],[side*.925,.72,.92]],.012,12);
    for (const axle of AXLES) {
      const arch = Array.from({length:17},(_,i)=>{
        const angle=Math.PI*i/16;
        return [side*(.957-.016*Math.abs(Math.cos(angle))),.37+Math.sin(angle)*.405,axle+Math.cos(angle)*.405];
      });
      b.tube(m.paint,arch,.023,24);
    }
    // Outer lamps are larger, the signature four circles on a blue rear panel.
    for (const [x,r] of [[.70,.111],[.45,.083]]) {
      cylinder(b,m.carbon,r+.013,.035,[side*x,.72,-2.281],[Math.PI/2,0,0],32);
      cylinder(b,m.brake,r,.015,[side*x,.72,-2.305],[Math.PI/2,0,0],32);
    }
    b.box(m.paint,[.052,.21,.15],[side*.69,1.005,-1.97],[.14,0,0],.009);
    b.box(m.alloy,[.014,.05,.06],[side*.724,1.09,-1.97],[0,0,0],.002);
  }
  b.box(m.paint,[1.86,.062,.26],[0,1.14,-1.99],[-.06,0,0],.018);
  b.box(m.carbon,[.66,.13,.02],[0,.75,2.306],[0,0,0],.009);
  b.box(m.carbon,[.93,.23,.025],[0,.37,2.296],[0,0,0],.015);
  for (let i=0;i<8;i++) b.box(m.darkAlloy,[.85,.008,.008],[0,.28+i*.026,2.313],[0,0,0],0);
  for (const x of [-.35,-.18,0,.18,.35]) b.box(m.darkAlloy,[.008,.21,.008],[x,.37,2.32],[0,0,0],0);
  b.box(m.paint,[1.77,.055,.12],[0,.205,2.23],[0,0,0],.012);
  b.box(m.carbon,[1.68,.026,.17],[0,.174,2.21],[0,0,0],.008);
  for (let i=0;i<5;i++) b.box(m.darkAlloy,[.62,.007,.008],[0,.70+i*.025,2.323],[0,0,0],0);
  for (const x of [-.26,-.13,0,.13,.26]) b.box(m.darkAlloy,[.007,.12,.008],[x,.75,2.327],[0,0,0],0);
  b.box(m.carbon,[1.48,.16,.025],[0,.31,-2.29],[0,0,0],.01);
  rearPlate(b,m,.46,-2.306,.36,.17);
  // Independent red caliper material; the silver wheel trim stays silver.
  const caliper = m.accent.clone(); caliper.color.setHex(0xb51e20);
  wheels(vehicle,{...m,accent:caliper,darkAlloy:m.alloy},{radius:.37,width:.28,track:.84,axles:AXLES,spokes:6,roadSmooth:true});
  // Larger alloy diameter with a low-profile tyre, without changing its contact.
  for (const wheel of data.wheels) wheel.traverse(mesh => {
    if (mesh.isMesh && mesh.material === m.alloy) mesh.geometry.scale(1,1.17,1.17);
  });
  exhaust(vehicle,b,m,[[-.64,.27,-2.214]],.085);
  b.finish(data);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

function cabin(b,m) {
  const low=.89, top=1.215, width=.77, roof=.65, front=1.18, frontTop=.55, back=-1.43, backTop=-.65;
  panel(b,m.glass,[[-width,low,front],[width,low,front],[roof,top,frontTop],[-roof,top,frontTop]]);
  panel(b,m.glass,[[width,low,back],[-width,low,back],[-roof,top,backTop],[roof,top,backTop]]);
  b.box(m.paint,[1.34,.055,1.26],[0,1.222,-.05],[0,0,0],.04);
  for(const side of [-1,1]) {
    const points=[[side*width,low,front],[side*roof,top,frontTop],[side*roof,top,backTop],[side*width,low,back]];
    panel(b,m.glass,side>0?points.slice().reverse():points);
    for(const [a,c] of [[points[0],points[1]],[points[2],points[3]]]) b.tube(m.paint,[a,c],.036,4);
    // Inset toward the pane centre so seals clear the painted pillar tubes.
    const seals=points.map(([x,y,z])=>[
      x+side*.009,y+((low+top)/2-y)*.12,z+((front+frontTop+backTop+back)/4-z)*.12,
    ]);
    for(const [a,c] of [[seals[0],seals[1]],[seals[1],seals[2]],[seals[2],seals[3]]]) b.tube(m.carbon,[a,c],.014,4);
    b.tube(m.paint,[points[1],points[2]],.025,2);
    b.tube(m.carbon,[points[0],points[3]],.017,2);
    b.tube(m.carbon,[[side*width,low,-.36],[side*roof,top,-.36]],.026,2);
    const pillar=[[side*width,low,back],[side*width,low,back+.29],[side*roof,top,backTop+.18],[side*roof,top,backTop]];
    panel(b,m.paint,side>0?pillar.reverse():pillar);
  }
  for(const z of [frontTop,backTop]) b.tube(m.paint,[[-roof,top,z],[roof,top,z]],.025,2);
}
