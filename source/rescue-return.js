import {returnPose} from './incident-motion.js';
import {incidentDepth} from './incident-view.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// +Y input is screen-down, as in the standard Gamepad axes. Keep the object
// clear of the cabinet edge before carrying it back; the player then lowers it.
export function moveReturn(r,input,dt){
 const p=r.returnPosition,rest=returnPose(r.kind),oldDepth=incidentDepth(p,r.kind,input.rescueAspect);
 let x=clamp(input.rescueX||0,-1,1),y=clamp(input.rescueY||0,-1,1);
 const magnitude=Math.max(1,Math.hypot(x,y));x/=magnitude;y/=magnitude;
 const amount=-y*dt*.50,clearY=Math.max(rest.y+.16,r.returnFrom.y);
 if(r.returnPhase==='place')p.y=clamp(p.y+amount,rest.y,clearY+.12);
 else if(amount>0){
  const lift=Math.min(amount,Math.max(0,clearY-p.y));p.y+=lift;
  p.z=Math.max(rest.z,p.z-(amount-lift)*1.8);
  if(p.z<=rest.z)r.returnPhase='place';
 }else if(amount<0){
  const forward=Math.min(-amount*1.8,Math.max(0,r.returnFrom.z-p.z));p.z+=forward;
  p.y=Math.max(rest.y-.30,p.y+amount+forward/1.8);
 }
 const depth=incidentDepth(p,r.kind,input.rescueAspect);
 p.x=clamp(p.x*depth/oldDepth+x*dt*.65*depth/2.5,-.65,.65);
 r.handX=clamp(p.x/.55,-.95,.95);
 // Existing trigger unloading follows actual placement, not elapsed animation.
 r.returnProgress=r.returnPhase==='place'?clamp(1-(p.y-rest.y)/.16,0,1):0;
 r.height=.34+(r.returnHeight-.34)*(1-r.returnProgress);
 return r.returnPhase==='place'&&y>.08&&p.y<=rest.y+.001&&Math.abs(p.x-rest.x)<.065;
}
