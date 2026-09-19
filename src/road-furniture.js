// Shared placements keep the drawn furniture and physical supports in agreement.
// Clearance includes the widest earned car, not only a sign's narrow posts.
const VEHICLE_MARGIN=2.0;
export function tunnelCoverShape(tunnel,s){
  const t=Math.max(0,Math.min(1,(s-tunnel.start)/(tunnel.end-tunnel.start))),swell=Math.sin(t*Math.PI);
  return{width:tunnel.width+14+12*swell,height:tunnel.height+6+16*swell};
}

export function buildRoadFurniture(course){
  const signs=[],chevrons=[];
  const clear=(s,off,halfWidth)=>{
    const p=course.worldAt(s,off),c=Math.cos(p.heading),sn=Math.sin(p.heading);
    for(const x of[-halfWidth,0,halfWidth])for(const z of[-.25,.25]){
      const n=course.nearest(p.x+c*x+sn*z,p.z-sn*x+c*z);
      if(Math.abs(n.lateral)<course.roadHalfWidthAt(n.s)+VEHICLE_MARGIN)return false;
      if(course.features.shortcuts.some(cut=>n.s>cut.start-5&&n.s<cut.end+5&&Math.abs(n.lateral-course.shortcutOffset(cut,n.s))<cut.halfWidth+VEHICLE_MARGIN))return false;
    }
    if(course.features.tunnels.some(t=>s>t.start-7&&s<t.end+7&&Math.abs(off)<tunnelCoverShape(t,s).width+halfWidth+2))return false;
    for(const o of course.features.obstacles){
      const dx=p.x-o.x,dz=p.z-o.z,cs=Math.cos(o.heading),sn=Math.sin(o.heading),x=dx*cs-dz*sn,z=dx*sn+dz*cs;
      const relative=p.heading-o.heading,c=Math.abs(Math.cos(relative)),s=Math.abs(Math.sin(relative));
      if(Math.abs(x)<o.halfX+halfWidth*c+.3*s+.2&&Math.abs(z)<o.halfZ+halfWidth*s+.3*c+.2)return false;
    }
    return true;
  };
  const place=(s,requested,halfWidth)=>{
    for(const side of[Math.sign(requested)||1,-Math.sign(requested)||-1]){
      const base=Math.max(Math.abs(requested),course.roadHalfWidthAt(s)+halfWidth+VEHICLE_MARGIN+.15);
      for(let off=base;off<73;off+=1.5)if(clear(s,side*off,halfWidth))return course.groundAt(s,side*off);
    }
    return null;
  };
  const sign=(s,off,top,bottom,bg)=>{
    const p=place(s,off,2.6);if(!p)return;
    const n=course.nearest(p.x,p.z),id=`road-sign-${signs.length}`,posts=[];
    for(const localX of[-1.8,1.8]){
      const q=course.groundAt(s,n.lateral-localX);posts.push({localX,...q,id:`${id}-post-${localX}`,off:n.lateral-localX,s:course.phase(s),halfX:.065,halfZ:.08});
    }
    const y=Math.max(...posts.map(post=>post.y));posts.forEach(post=>{post.y-=.05;post.height=y+4.25-post.y;});
    signs.push({id,s:course.phase(s),off:n.lateral,...p,y,heading:p.heading+Math.PI,top,bottom,bg,posts});
  };
  for(const cut of course.features.shortcuts)sign(cut.start-42,Math.sign(cut.offset)*12,'SHORTCUT',cut.name.toUpperCase(),'#8c6528');
  for(const lane of course.features.passingLanes){sign(lane.start-42,13,'PASSING LANE','KEEP LEFT','#25433d');sign(lane.end-70,13,'LANE ENDS','MERGE LEFT','#a27228');}
  for(const trap of course.features.radarTraps)sign(trap.s-160,10.8,'SPEED LIMIT',`${trap.limitMph}`,'#ede2c6');
  for(const section of course.sections)sign(section.start+65,-14,section.name.toUpperCase(),course.def.arena?'STADIUM LOOP':'TWO LAP CIRCUIT','#25433d');
  sign(course.length-220,-14,'FINISH STRAIGHT','200 M','#ce4c2d');
  for(const turn of course.features.turns){
    sign(turn.signS,10.8,turn.direction>0?'LEFT BEND':'RIGHT BEND',`${turn.advisory} MPH`,'#b78720');
    for(let d=0;d<=64;d+=16){const s=turn.s+d,p=place(s,-turn.direction*10.5,.6);if(!p)continue;
      const n=course.nearest(p.x,p.z);chevrons.push({id:`turn-chevron-${chevrons.length}`,s:course.phase(s),off:n.lateral,...p,heading:p.heading+Math.PI,direction:turn.direction,height:2.725,halfX:.05,halfZ:.05});}
  }
  return{signs,chevrons};
}
