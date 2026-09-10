const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const REACTION_DURATION=1.25;
export function impactTime(r){return r?.kind==='pencils'?.34:clamp(Math.sqrt(Math.max(0,(r?.height??.6)-.31)/5),.16,.48);}
export function objectPose(mode){
 const r=mode.rescue||{height:1.3-Math.min(1,mode.elapsed/3.2),objectX:0,tilt:mode.elapsed*.3},t=mode.type==='reaction'?(mode.sourceElapsed||0):mode.elapsed;
 let x=r.objectX,y=r.height,z=0,rz=r.tilt,rx=r.kind==='fork'?t*1.4:0,scale=1;
 if(mode.type==='reaction'){
  const start=objectPose({type:'catch',rescue:r,elapsed:mode.sourceElapsed||0});({x,y,z,rx,rz,scale}=start);
  const time=mode.elapsed,impact=impactTime(r),fall=smooth(time/impact);
  if(mode.success){const u=smooth(time/.6);x=mix(x,0,u);y=mix(y,r.kind==='fork'?.16:.31,u);rz=mix(rz,0,u);rx=mix(rx,r.kind==='fork'?Math.PI/2:0,u);scale=1-Math.sin(clamp(time/.22)*Math.PI)*.025;}
  else {x+=fall*.22;y=mix(y,.29,fall);rz=mix(rz,Math.sign(rz||1)*1.42,fall);rx=mix(rx,.22,fall);if(time>impact){const a=time-impact,bounce=Math.abs(Math.sin(a*17))*Math.exp(-a*9);y+=bounce*.09;rz+=Math.sin(a*17)*Math.exp(-a*8)*.13;scale=1-Math.sin(clamp(a/.15)*Math.PI)*.06;}}
 }else if(r.stage==='reach'){
  const anticipation=smooth(t/.65);rz+=(Math.sin(t*11)*.065*(1-anticipation));rz+=Math.sin(Math.max(0,t-.65)*1.8)*.22;
 }else if(r.contactAt!==undefined){const a=t-r.contactAt,buffer=Math.sin(Math.min(1,a/.45)*Math.PI)*.065;y-=buffer;rz+=Math.sin(a*15)*Math.exp(-a*7)*.07;}
 return {x,y,z,rx,rz,scale};
}
export function handHeight(mode,pose=objectPose(mode)){
 const r=mode.rescue;
 if(r?.kind==='pencils')return .15;
 if(r?.stage==='reach'&&mode.type!=='reaction')return mix(.49,pose.y-.20,smooth(mode.elapsed/.65));
 return pose.y-.20-(mode.type==='reaction'&&!mode.success?smooth(mode.elapsed/.35)*.3:0);
}
// The same screen-space lane is used for approaching, catching and missing a pencil.
// Timestamped outcomes prevent the old reaction cut from resetting the roll clock.
export function pencilPose(q,index,mode){
 const t=mode.type==='reaction'?(mode.sourceElapsed||0)+mode.elapsed:mode.elapsed;
 const approach=clamp((t-(q.at-1.2))/1.2),at=q.resolvedAt??q.at;
 let x=mix(-.62,q.x,smooth(approach*2)),y=.128,z=mix(-.74,.40,approach),rz=0,rx=Math.PI/2,ry=t*4.4+index;
 if(q.state==='caught'){
  const a=Math.max(0,t-at),u=smooth(a/.23);x=q.x;y+=Math.sin(clamp(a/.2)*Math.PI)*.027;z=mix(q.caughtZ??.22,.27,u);ry=(at*4.4+index)+Math.sin(a*22)*Math.exp(-a*16)*.18;
  if(mode.type==='reaction'){const gather=smooth((mode.elapsed-.12)/.65);x=mix(x,-.08+index*.065,gather);z=mix(z,.32,gather);ry=mix(ry,Math.PI/2,gather);}
 }else if(q.state==='fallen'){
  const a=Math.max(0,t-at),drop=clamp(a/.34);x=q.x+(index-1)*drop*.07;z=.43+drop*.42;y=.128-.94*drop*drop;rx+=Math.sin(drop*Math.PI)*2.1;
  if(drop===1){const b=a-.34;y=-.81+Math.abs(Math.sin(b*18))*Math.exp(-b*6)*.08;z+=Math.min(.22,b*.22);ry=(at+.34)*4.4+index+.6*(1-Math.exp(-b*4));}
 }
 return {x,y,z,rx,ry,rz};
}
