import {nearGroundHeightAt, NEAR_GROUND} from './near-ground.js';
import {scablandsSurfaceHeightAt, scablandsFloorsAt, scablandsGroundEdit,
  scablandsNaturalHeightAt} from './scablands-ground.js';
import {riverDepthAt} from './scablands-regions.js';

// Drawing only. The shader cuts the near mesh away below distance 80; the
// gorge ribbon continues to 92. Outside the cut, the higher mesh is visible.
export function createScablandsDrawnFeet({near, gorge, riverField, course}) {
  const floors = [];
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
            const key=`${i},${j}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(triangle);
          }
      }
      indices.set(geometry,bins);
    }
  }
  function riverAt(x,z) {
    let height=null;
    const key=`${Math.floor(x/32)},${Math.floor(z/32)}`;
    for(const piece of gorge.pieces??[])for(const t of indices.get(piece.mesh?.geometry)?.get(key)??[]) {
      const dx=x-t.cx,dz=z-t.cz,u=t.ux*dx+t.uz*dz,v=t.vx*dx+t.vz*dz;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)height=Math.max(height??-Infinity,t.cy+u*t.dyA+v*t.dyB);
    }
    return height??gorge.heightAtDrawn(x,z);
  }
  const plainAt = (x, z) => scablandsSurfaceHeightAt(x, z) + riverDepthAt(x, z);
  function groundAt(x, z) {
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
  function shift(x, z, support) {
    const count = scablandsFloorsAt(x, z, floors), own = floors[count - 1];
    const floor = Number.isFinite(support) ? support : floors[0];
    // Unknown supports, decks, edited yards and tunnel floors keep their own drawing.
    if (Math.abs(floor - own) > .1 ||
        (scablandsGroundEdit.chunkCount>0 && Math.abs(scablandsGroundEdit.heightAt(x,z) - scablandsNaturalHeightAt(x,z)) > 1e-6) ||
        course?.groundTunnels?.tubeAt({x,y:floor,z},floor,.1)) return 0;
    // The plain already has a small drawing lift. Keep lattice corners fixed,
    // but do not subtract that lift at the river join (which has none).
    const lift=NEAR_GROUND.lift*Math.max(0,Math.min(1,(riverField.distanceAt(x,z)-83)/3));
    return Math.max(-1.2, Math.min(1.2, groundAt(x,z) - own - lift));
  }
  refresh();
  return {groundAt, shift, refresh};
}
