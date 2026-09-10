import {stationFor,stationFurniture,restingPencil,SURFACE_Y} from './incident-setting.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const REACTION_DURATION=1.25;
export const returnPose=kind=>({...stationFor(kind).rest,ry:0,scale:1});
const floorY=kind=>SURFACE_Y-stationFurniture(kind).h;
export function impactTime(r){return r?.kind==='pencils'?.34:.48;}
function path(a,b,u,arc=.12){const p={};for(const k of['x','y','z','rx','rz'])p[k]=mix(a[k]||0,b[k]||0,u);p.y+=Math.sin(u*Math.PI)*arc;return {...p,scale:1};}
export function objectPose(mode){
 const r=mode.rescue||{kind:'vase',height:1.3-Math.min(1,mode.elapsed/3.2),objectX:0,tilt:mode.elapsed*.3,stage:'reach'},kind=r.kind||'vase',rest=returnPose(kind);
 if(mode.type==='reaction'){
  const start=objectPose({type:'catch',rescue:r,elapsed:mode.sourceElapsed||0}),time=mode.elapsed;
  if(mode.success)return path(start,rest,smooth(time/.78),r.returnProgress>=1?0:.14);
  const impact=impactTime(r),u=smooth(time/impact),p=path(start,{x:start.x+.10,y:floorY(kind)+(kind==='fork'?.018:kind==='vase'?.263:.255),z:Math.max(start.z,stationFurniture(kind).d/2+.29),rx:kind==='fork'?Math.PI/2:.15,rz:kind==='fork'?0:Math.sign(start.rz||1)*Math.PI/2},u,0);
  if(time>impact){const a=time-impact;p.y+=Math.abs(Math.sin(a*17))*Math.exp(-a*9)*.055;p.rz+=Math.sin(a*17)*Math.exp(-a*8)*.07;}
  return p;
 }
 if(r.stage==='lower'&&r.returnFrom){const u=smooth(r.returnProgress||0),p=path(r.returnFrom,rest,u,.16);p.x+=(r.handX-(r.returnHandX??r.handX))*.55*(1-u);p.rz+=(r.tilt-(r.returnTilt??r.tilt))*(1-u);return p;}
 const t=mode.elapsed,reach=r.stage==='reach',u=reach?smooth(t/.65):1;
 const p={x:mix(rest.x,(r.objectX||0)*.55,u),y:rest.y-Math.max(0,1.3-r.height)*.5,z:mix(rest.z,stationFurniture(kind).d/2+.15,u),rx:kind==='fork'?mix(rest.rx,.35,u):0,rz:(r.tilt||0)*u,scale:1};
 if(reach)p.rz+=Math.sin(t*11)*.065*(1-u);
 else if(r.contactAt!==undefined){const a=Math.max(0,t-r.contactAt);p.y-=Math.sin(clamp(a/.45)*Math.PI)*.045;p.rz+=Math.sin(a*15)*Math.exp(-a*7)*.045;}
 return p;
}
export function cupPose(mode){
 const rest=returnPose('pencils'),clock=mode.type==='reaction'?(mode.sourceElapsed||0):mode.elapsed,u=smooth(clock/.6),tipped={...rest,x:rest.x+.05*u,y:mix(rest.y,.215,u),z:rest.z,rz:1.31*u};
 return mode.type==='reaction'?path(tipped,rest,smooth(mode.elapsed/.32),.035):tipped;
}
export function handHeight(mode,pose=objectPose(mode)){
 if(mode.rescue?.kind==='pencils')return .11;
 return pose.y-(mode.rescue?.kind==='fork'?.025:.14);
}
export function pencilPose(q,index,mode){
 const reaction=mode.type==='reaction',t=reaction?(mode.sourceElapsed||0):mode.elapsed;
 if(reaction&&!mode.success&&q.state==='rolling')return pencilPose({...q,state:'fallen',resolvedAt:t,fallFrom:pencilPose(q,index,{...mode,type:'catch',elapsed:t})},index,mode);
 const approach=clamp((t-(q.at-1.2))/1.2),at=q.resolvedAt??q.at;
 let p={x:mix(-.43,q.x*.55,smooth(approach*2)),y:.112,z:mix(-.17,.46,approach),rz:0,rx:Math.PI/2,ry:t*4.4+index};
 if(q.state==='rolling'&&t<.6){const rest=restingPencil(index),u=smooth(t/.6);p={...p,...path(rest,p,u,.02),ry:mix(rest.ry,p.ry,u)};}
 if(q.state==='caught'){
  const a=Math.max(0,t-at);p.x=(mode.rescue.handX||0)*.55+(index-1)*.045;p.z=.43;p.y=.122+index*.013;p.ry=Math.PI/2+(index-1)*.12;
  p.y+=Math.sin(clamp(a/.2)*Math.PI)*.02;
  if(reaction){
   // Gather above the upright cup, rotate tip-up, then insert. A partial catch
   // returns only the saved pencils; missed ones keep their original clock.
   const rest=restingPencil(index),lift=smooth((mode.elapsed-.12)/.50),insert=smooth((mode.elapsed-.68)/.35);
   const above={...rest,y:rest.y+.20};p={...p,...path(p,above,lift,.08),ry:mix(p.ry,rest.ry,lift)};p.y=mix(p.y,rest.y,insert);
  }
 }else if(q.state==='fallen'){
  const a=Math.max(0,(reaction?t+mode.elapsed:t)-at),drop=clamp(a/.34),from=q.fallFrom||{x:q.x*.55,y:.112,z:.47,rx:Math.PI/2,ry:p.ry};p.x=mix(from.x,q.x*.55+(index-1)*.04,drop);p.z=mix(from.z,.67,smooth(drop*1.6));p.y=mix(from.y,floorY('pencils')+.018,drop*drop);p.rx=mix(from.rx,Math.PI/2,smooth(drop))+Math.sin(drop*Math.PI)*2.1;p.ry=mix(from.ry,p.ry,drop);
  if(drop===1){const b=a-.34;p.y=floorY('pencils')+.018+Math.abs(Math.sin(b*18))*Math.exp(-b*6)*.05;p.z+=Math.min(.12,b*.12);p.ry=(at+.34)*4.4+index+.6*(1-Math.exp(-b*4));}
 }
 return p;
}
// Bounded anatomy: camera distance never affects the two segment lengths.
// The torso follows a reach; the elbow is the intersection of two fixed radii.
export const FOREARM_LENGTH=.27,UPPER_ARM_LENGTH=.30;
export function armJoints(wrist,sign,overSurface=false){
 const shoulder={x:wrist.x+sign*.14,y:wrist.y+mix(-.19,.025,Number(overSurface)),z:wrist.z+.41},dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,dz=wrist.z-shoulder.z,d=Math.hypot(dx,dy,dz),axis={x:dx/d,y:dy/d,z:dz/d};
 const along=(UPPER_ARM_LENGTH**2-FOREARM_LENGTH**2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,UPPER_ARM_LENGTH**2-along**2));
 const desired={x:sign*.65,y:mix(-1,.15,Number(overSurface)),z:0},dot=desired.x*axis.x+desired.y*axis.y,perp={x:desired.x-dot*axis.x,y:desired.y-dot*axis.y,z:-dot*axis.z},n=Math.hypot(perp.x,perp.y,perp.z);
 return {shoulder,elbow:{x:shoulder.x+axis.x*along+perp.x/n*bend,y:shoulder.y+axis.y*along+perp.y/n*bend,z:shoulder.z+axis.z*along+perp.z/n*bend}};
}
