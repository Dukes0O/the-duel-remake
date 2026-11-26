import {nearGroundHeightAt, NEAR_GROUND} from './near-ground.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt, scablandsGroundEdit,
  scablandsNaturalHeightAt, selectScablandsFloor} from './scablands-ground.js';
import {riverDepthAt,riverGorgeDepthAt} from './scablands-regions.js';

// Drawing only. The shader cuts the near mesh away below distance 80; the
// gorge ribbon continues to 92. Outside the cut, the higher mesh is visible.
export function createScablandsDrawnFeet({near, gorge, riverField, course}) {
  const floors = [], tunnelPoint={x:0,y:0,z:0};
  function inTunnel(x,z,y) {
    if(!course?.groundTunnels)return false;
    tunnelPoint.x=x;tunnelPoint.y=y;tunnelPoint.z=z;
    return !!course.groundTunnels.tubeAt(tunnelPoint,y,.1);
  }
  // View-owned geometry only. Rebuilt pieces get fresh indices; no actor or
  // simulation state is cached, and the answer never depends on past queries.
  const indices=new WeakMap();
  function refresh() {
    for(const piece of gorge.pieces??[]) {
      const geometry=piece.mesh?.geometry;
      if(!geometry||indices.has(geometry))continue;
      const bins=new Map(), positions=geometry.attributes.position, order=geometry.index;
      for(let k=0;k<order.count;k+=3) {
        const a=order.getX(k),b=order.getX(k+1),c=order.getX(k+2);
        const ax=positions.getX(a),az=positions.getZ(a),ay=positions.getY(a);
        const bx=positions.getX(b),bz=positions.getZ(b),by=positions.getY(b);
        const cx=positions.getX(c),cz=positions.getZ(c),cy=positions.getY(c);
        const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
        if(Math.abs(det)<1e-9)continue;
        const triangle={cx,cz,cy,ux:(bz-cz)/det,uz:(cx-bx)/det,vx:(cz-az)/det,vz:(ax-cx)/det,dyA:ay-cy,dyB:by-cy};
        for(let i=Math.floor(Math.min(ax,bx,cx)/32);i<=Math.floor(Math.max(ax,bx,cx)/32);i++)
          for(let j=Math.floor(Math.min(az,bz,cz)/32);j<=Math.floor(Math.max(az,bz,cz)/32);j++) {
            let column=bins.get(i);if(!column){column=new Map();bins.set(i,column);}
            if(!column.has(j))column.set(j,[]);column.get(j).push(triangle);
          }
      }
      indices.set(geometry,bins);
    }
  }
  function riverAt(x,z) {
    let height=null;
    const i=Math.floor(x/32),j=Math.floor(z/32);
    for(const piece of gorge.pieces??[])for(const t of indices.get(piece.mesh?.geometry)?.get(i)?.get(j)??[]) {
      const dx=x-t.cx,dz=z-t.cz,u=t.ux*dx+t.uz*dz,v=t.vx*dx+t.vz*dz;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)height=Math.max(height??-Infinity,t.cy+u*t.dyA+v*t.dyB);
    }
    return height??gorge.heightAtDrawn(x,z);
  }
  const plainAt = (x, z) => scablandsSurfaceHeightAt(x, z) + riverDepthAt(x, z);
  function groundAt(x, z) {
    if (scablandsGroundEdit.siteGround?.hasChunkAt(x,z)) return scablandsGroundEdit.heightAt(x,z) + .035;
    const distance = riverField.distanceAt(x, z);
    const land = near.heightAtDrawn(x, z) ?? nearGroundHeightAt(x, z, plainAt);
    const river = distance < 94 ? riverAt(x, z) : null;
    if (river === null) return land;
    const top = Math.max(land, river);
    if (distance <= 77) return river;
    if (distance >= 83) return top;
    // Join the cut edge across six metres. At the edge, the departure from
    // either surface is half their separation; outside the band it is exact.
    return river + (top - river) * (distance - 77) / 6;
  }
  function rawShift(x, z, support, airborneFeet) {
    const actorFeet=Number.isFinite(airborneFeet)?airborneFeet:support;
    if(Number.isFinite(actorFeet)&&inTunnel(x,z,actorFeet))return null;
    const distance=riverField.distanceAt(x,z);
    // The edit layer already includes the current natural ground. The public
    // surface query cancels and re-adds that same natural height for marks.
    // Ask the floor selector only where a deck actually adds a second floor.
    const layered=distance<100&&riverGorgeDepthAt(x,z)>riverDepthAt(x,z);
    const count=layered?scablandsFloorsAt(x,z,floors):0;
    const own=count?floors[count-1]:scablandsGroundEdit.heightAt(x,z);
    const floor = Number.isFinite(airborneFeet)?(count?selectScablandsFloor(floors,count,airborneFeet):own):
      Number.isFinite(support) ? support : count?floors[0]:own;
    // Unknown supports, decks, edited yards and tunnel floors keep their own drawing.
    if (Math.abs(floor - own) > .1 ||
        (scablandsGroundEdit.chunkCount>0 && Math.abs(scablandsGroundEdit.heightAt(x,z) - scablandsNaturalHeightAt(x,z)) > 1e-6) ||
        inTunnel(x,z,floor)) return null;
    // The plain already has a small drawing lift. Keep lattice corners fixed,
    // but do not subtract that lift at the river join (which has none).
    const lift=NEAR_GROUND.lift*Math.max(0,Math.min(1,(distance-83)/3));
    return Math.max(-1.2, Math.min(1.2, groundAt(x,z) - own - lift));
  }
  function shift(x,z,support,airborneFeet) {
    return rawShift(x,z,support,airborneFeet)??0;
  }
  function shiftFor(object,seconds,x,z,support,airborneFeet) {
    const raw=rawShift(x,z,support,airborneFeet),blocked=raw===null,target=raw??0;
    const data=object.userData??(object.userData={});
    let ease=data.scablandsFeet;
    if(!ease) {
      data.scablandsFeet={blocked,value:target,offset:0,start:seconds};
      return target;
    }
    if(blocked!==ease.blocked) {
      ease.offset=ease.value-target;ease.start=seconds;ease.blocked=blocked;
    }
    const remaining=Math.max(0,1-Math.max(0,seconds-ease.start)/.4);
    ease.value=target+ease.offset*remaining;
    return ease.value;
  }
  refresh();
  return {groundAt, shift, shiftFor, refresh};
}
