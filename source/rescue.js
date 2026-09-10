import {objectPose} from './incident-motion.js';
import {moveReturn} from './rescue-return.js';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const RESCUE_DURATION=10;
export function newRescue(kind,seed=0){
  const sign=seed%2?1:-1;
  return {kind,stage:kind==='pencils'?'sweep':'reach',handX:0,objectX:sign*.44,height:1.3,tilt:sign*.24,left:0,right:0,steady:0,release:0,grace:.65,lidNoise:0,clink:false,
    pencils:[{x:-.58,at:1.65,state:'rolling'},{x:.48,at:3.0,state:'rolling'},{x:-.02,at:4.35,state:'rolling'}]};
}
export function rescueHelp(r,pad=false){
  const steer=pad?'左摇杆左右':'A / D',left=pad?'L2':'Q',right=pad?'R2':'E',move=pad?'左摇杆':'W / A / S / D';
  if(r.kind==='pencils')return `${steer} 移动手掌，按住 ${right} 拦住滚向桌沿的铅笔。已拦 ${r.pencils.filter(p=>p.state==='caught').length} / 3 枝。`;
  if(r.stage==='reach')return r.kind==='fork'?`${steer} 对准叉子，${right} 托住，再用 ${left} 裹住止响。`:
    r.kind==='tin'?`${steer} 对准铁盒，${right} 托底，${left} 压住盒盖。`:`${steer} 对准花瓶，${left} ＋ ${right} 双手托住。左右用力不均会歪。`;
  if(r.stage==='damp')return `保持 ${right} 托住，按住 ${left} 用袖口包住叉子，等它停止颤动。`;
  if(r.stage==='steady')return r.kind==='tin'?`保持 ${right} 托底，${left} 轻压盒盖，别让它叮当响。`:`保持 ${left} ＋ ${right} 托住，${pad?'轻压倾斜一侧的扳机':'两只手一起稳稳托住'}，把花瓶扶正。`;
  return `保持 ${left} ＋ ${right} 支撑，${move} 按画面上下左右移物。${r.returnPhase==='place'?'左右对准原垫，向下轻放。':'先向上抬过桌沿、送到原垫上方，再向下轻放。'}`;
}
// No moving cursor: hand position, grip balance, rolling trajectories and support
// are the controls. Durations are a game slow-motion model, not physical units.
export function advanceRescue(r,input,dt,elapsed){
  const oldX=r.handX;if(r.stage!=='lower')r.handX=clamp(r.handX+(input.rescueX||0)*dt*1.5,-.95,.95);
  r.left=clamp(input.gripLeft||0);r.right=clamp(input.gripRight||0);r.grace=Math.max(0,r.grace-dt);
  if(r.kind==='pencils'){
    let contacts=0;
    for(const pencil of r.pencils){if(pencil.state!=='rolling')continue;
      if(elapsed>=pencil.at-.4&&elapsed<=pencil.at+.18&&r.right>.12&&Math.abs(r.handX-pencil.x)<.27){pencil.state='caught';pencil.resolvedAt=elapsed;pencil.caughtZ=-.74+Math.max(0,Math.min(1,(elapsed-(pencil.at-1.2))/1.2))*1.14;contacts++;}
      else if(elapsed>pencil.at+.18){pencil.state='fallen';pencil.resolvedAt=elapsed;}}
    if(r.pencils.every(p=>p.state!=='rolling')){const caught=r.pencils.filter(p=>p.state==='caught').length;return {contacts,done:true,success:caught===3,noiseFactor:(3-caught)/3,text:caught===3?'三枝铅笔全拦住了，轻轻收回笔筒。':`拦住了 ${caught} / 3 枝铅笔，其余滚到了地上。`};}
    return {contacts,done:false};
  }
  const fork=r.kind==='fork',tin=r.kind==='tin',both=r.left>.12&&r.right>.12,supported=fork?r.right>.12:both;
  if(r.stage==='reach'){
    r.objectX=clamp(r.objectX+Math.sin(elapsed*2.2)*dt*.16,-.65,.65);r.height=1.3-Math.max(0,elapsed-.65)*.22;
    if(elapsed>.65&&r.height>.32&&Math.abs(r.handX-r.objectX)<.25&&(fork?r.right>.12:tin?r.right>.12:both)){r.stage=fork?'damp':'steady';r.contactAt=elapsed;r.release=0;r.grace=.4;return {contact:true};}
    if(elapsed>4.9)return {done:true,success:false};
  }else{
    r.objectX=r.handX;r.release=supported?0:r.release+dt;
    if(r.release>.20&&r.grace<=0&&!(tin&&r.right>.12))return {done:true,success:false,text:'手松得太早，物件又滑了下去。'};
    if(fork){r.steady=both?r.steady+dt:Math.max(0,r.steady-dt);r.tilt=Math.sin(elapsed*35)*.12*Math.max(0,1-r.steady/.6);if(r.steady>=.6)return {done:true,success:true,text:'袖口裹住叉子，金属的颤动停了。'};}
    else if(tin){r.tilt*=Math.exp(-dt*4);if(r.left<.12){r.lidNoise+=dt;if(r.lidNoise>.5&&!r.clink){r.clink=true;return {clink:true};}}r.steady=both?r.steady+dt:0;}
    else{r.tilt=clamp(r.tilt*Math.exp(-dt*1.7)+(r.right-r.left)*dt*2+(r.handX-oldX)*.22,-1.5,1.5);if(Math.abs(r.tilt)>.85)return {done:true,success:false,text:'两只手用力差太多，花瓶歪了出去。'};r.steady=both&&Math.abs(r.tilt)<.20?r.steady+dt:0;}
    if(!fork&&r.steady>.5&&r.stage!=='lower'){
      r.returnFrom=objectPose({type:'catch',rescue:r,elapsed});r.returnHandX=r.handX;r.returnTilt=r.tilt;r.returnHeight=r.height;r.returnProgress=0;r.returnPosition={...r.returnFrom};r.returnPhase='lift';r.stage='lower';
    }
    if(r.stage==='lower'){
      // Preserve the exact visible pose of v4 saves made along the old path.
      if(!r.returnPosition){r.returnPosition=objectPose({type:'catch',rescue:r,elapsed});r.returnFrom={...r.returnPosition};r.returnHeight=r.height;r.returnTilt=r.tilt;r.returnPhase='lift';}
      if(both&&moveReturn(r,input,dt)){r.returnProgress=1;return {done:true,success:true};}
    }
  }
  return {done:false};
}
