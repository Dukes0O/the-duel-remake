import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original code-built R34 study. Metres, +Z forward. No maker assets or logos.
export const SKYLINE_VEHICLE_DIMENSIONS = Object.freeze({
  nissan_skyline_gtr_r34: Object.freeze({ width: 1.96, length: 4.60, height: 1.38, wheelRadius: .34 }),
});
const { materials, batch, sculpt, panel, cylinder, cockpit, wheels, exhaust, rearPlate } = originalVehicleParts;
const AXLES = [1.32, -1.345];

export function createSkylineVehicle({ key = 'nissan_skyline_gtr_r34', color = 0x1b3d8c, accent = 0xc7ccd1 } = {}) {
  if (!Object.hasOwn(SKYLINE_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Bayside Blue body'; m.paint.metalness = .46; m.paint.roughness = .27;
  m.glass.color.setHex(0x263b45); m.glass.opacity = .44;
  m.headlight.color.setHex(0x536575); m.headlight.emissive.setHex(0x687d90); m.headlight.emissiveIntensity = .10;
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SKYLINE_VEHICLE_DIMENSIONS[key] },
    damageSpace: { scale: [.88, .94, 1], offset: [0, 0, 0], frontGlassZ: .65, rearGlassZ: -1.20 },
  });
  // Broad level shoulders, wedge bonnet, squared caps and open wheel arches.
  sculpt(b, m.paint, [
    [-2.28,.84,.23,.79,.85,.74],[-2.12,.91,.20,.84,.88,.75],
    [-1.75,.95,.19,.85,.89,.76],[-1.345,.96,.18,.88,.90,.73],
    [-.90,.90,.18,.84,.88,.74],[-.20,.89,.18,.82,.86,.74],
    [.55,.90,.18,.81,.84,.74],[1.0,.94,.18,.85,.83,.68],
    [1.32,.96,.18,.87,.82,.68],[1.75,.94,.19,.81,.79,.68],
    [2.10,.90,.20,.72,.75,.74],[2.28,.86,.23,.69,.72,.72],
  ], AXLES, .34, .34, { width: .71, y: .49, back: -1.22, front: .80 });
  b.box(m.carbon, [1.42,.055,2.0], [0,.29,-.15], [0,0,0], .01);
  cabin(b, m);
  for (const side of [-1,1]) {
    b.tube(m.carbon,[[side*.685,.858,.87],[side*.68,.838,1.3],[side*.70,.794,1.82],[side*.70,.755,2.08]],.003,16);
  }
  cockpit(vehicle, b, m, [.34,.08,-.26], .90);
  for (const side of [-1,1]) {
    b.box(m.paint,[.095,.095,1.92],[side*.9,.23,-.01],[0,0,0],.018);
    b.box(m.carbon,[.014,.018,.19],[side*.907,.79,-.45],[0,0,0],.005);
    b.tube(m.carbon,[[side*.898,.79,-.59],[side*.902,.36,-.61],[side*.9,.32,.72]],.004,12);
    b.box(m.paint,[.17,.09,.23],[side*.895,.98,.63],[0,side*.10,0],.025);
    b.box(m.alloy,[.125,.055,.008],[side*.895,.984,.51],[0,side*.10,0],.009);
    // Headlight housings stay outside the closed front cap.
    b.box(m.carbon,[.48,.155,.032],[side*.61,.663,2.28],[0,0,side*.06],.017);
    b.box(m.headlight,[.44,.116,.012],[side*.61,.665,2.301],[0,0,side*.06],.014);
    for (const dx of [-.115,.065]) {
      cylinder(b,m.carbon,.044,.012,[side*.61+dx,.668,2.311],[Math.PI/2,0,0],24);
      const ring = new THREE.TorusGeometry(.041,.005,6,24);
      b.add(ring,m.alloy,[side*.61+dx,.668,2.320]); ring.dispose();
      cylinder(b,m.headlight,.031,.008,[side*.61+dx,.668,2.322],[Math.PI/2,0,0],24);
    }
    b.box(m.carbon,[.29,.13,.016],[side*.67,.37,2.29],[0,0,0],.009);
    b.box(m.headlight,[.12,.052,.013],[side*.70,.49,2.30],[0,0,0],.009);
    // Outer lamps are larger, the signature four circles on a blue rear panel.
    for (const [x,r] of [[.70,.111],[.45,.083]]) {
      cylinder(b,m.carbon,r+.013,.035,[side*x,.72,-2.281],[Math.PI/2,0,0],32);
      cylinder(b,m.brake,r,.015,[side*x,.72,-2.305],[Math.PI/2,0,0],32);
    }
    b.box(m.paint,[.052,.25,.15],[side*.65,1.03,-1.97],[.14,0,0],.009);
    b.box(m.alloy,[.014,.05,.06],[side*.684,1.14,-1.97],[0,0,0],.002);
  }
  b.box(m.paint,[1.76,.062,.26],[0,1.18,-1.99],[-.06,0,0],.018);
  b.box(m.carbon,[.78,.13,.02],[0,.66,2.293],[0,0,0],.009);
  b.box(m.carbon,[.93,.23,.025],[0,.37,2.296],[0,0,0],.015);
  for (let i=0;i<8;i++) b.box(m.darkAlloy,[.85,.008,.008],[0,.28+i*.026,2.313],[0,0,0],0);
  for (const x of [-.35,-.18,0,.18,.35]) b.box(m.darkAlloy,[.008,.21,.008],[x,.37,2.32],[0,0,0],0);
  b.box(m.paint,[1.77,.055,.12],[0,.205,2.23],[0,0,0],.012);
  b.box(m.carbon,[1.68,.026,.17],[0,.174,2.21],[0,0,0],.008);
  b.box(m.carbon,[.22,.012,.14],[.40,.828,1.14],[0,0,0],.006);
  b.box(m.carbon,[1.48,.07,.016],[0,.34,-2.29],[0,0,0],.01);
  rearPlate(b,m,.46,-2.306,.36,.17);
  // Independent red caliper material; the silver wheel trim stays silver.
  const caliper = m.accent.clone(); caliper.color.setHex(0xb51e20);
  wheels(vehicle,{...m,accent:caliper,darkAlloy:m.alloy},{radius:.34,width:.25,track:.855,axles:AXLES,spokes:5,roadSmooth:true});
  exhaust(vehicle,b,m,[[.55,.26,-2.20],[.68,.26,-2.20]],.047);
  b.finish(data);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

function cabin(b,m) {
  const low=.855, top=1.345, width=.77, roof=.65, front=.82, frontTop=.19, back=-1.40, backTop=-.91;
  panel(b,m.glass,[[-width,low,front],[width,low,front],[roof,top,frontTop],[-roof,top,frontTop]]);
  panel(b,m.glass,[[width,low,back],[-width,low,back],[-roof,top,backTop],[roof,top,backTop]]);
  b.box(m.paint,[1.34,.055,1.16],[0,1.352,-.36],[0,0,0],.04);
  for(const side of [-1,1]) {
    const points=[[side*width,low,front],[side*roof,top,frontTop],[side*roof,top,backTop],[side*width,low,back]];
    panel(b,m.glass,side>0?points.slice().reverse():points);
    for(const [a,c] of [[points[0],points[1]],[points[2],points[3]]]) b.tube(m.paint,[a,c],.032,2);
    b.tube(m.paint,[points[1],points[2]],.025,2);
    b.tube(m.carbon,[points[0],points[3]],.017,2);
    b.tube(m.carbon,[[side*width,low,-.56],[side*roof,top,-.56]],.026,2);
    const pillar=[[side*width,low,back],[side*width,low,back+.29],[side*roof,top,backTop+.18],[side*roof,top,backTop]];
    panel(b,m.paint,side>0?pillar.reverse():pillar);
  }
  for(const z of [frontTop,backTop]) b.tube(m.paint,[[-roof,top,z],[roof,top,z]],.025,2);
}
