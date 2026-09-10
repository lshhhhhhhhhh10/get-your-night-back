import {circleHits,doorShape} from './layout.js';

// Sample the swept leaf, using the same dimensions as rendering and navigation.
export function doorSweepHits(door,from,to,actor,radius){
  const steps=Math.max(1,Math.ceil(Math.abs(to-from)/.02));
  for(let i=0;i<=steps;i++)if(circleHits(actor,radius,doorShape({...door,progress:from+(to-from)*i/steps})))return true;
  return false;
}

// Leave the swing arc before touching the handle. Keep the investigation goal.
export function clearDoorSwing(game,door,dt){
  const p=game.parent;
  if(!doorSweepHits(door,0,1,p,.28)){
    if(p.doorRetreat){delete p.doorRetreat;if(p.goal)game.setDestination(p.goal);}
    return true;
  }
  const id=game.doors.indexOf(door);
  if(p.doorRetreat?.door!==id||!p.doorRetreat.route.length){
    const side=p.z<door.z?-1:1,candidates=[];
    for(const sign of [side,-side])for(const x of [door.x,door.x+.5,door.x-.5]){
      const target={x,z:door.z+sign*1.5},route=game.pathTo(target,p,true),last=route.at(-1);
      if(last&&Math.hypot(last.x-target.x,last.z-target.z)<.1&&!doorSweepHits(door,0,1,last,.28)){
        let length=0,prev=p;for(const q of route){length+=Math.hypot(q.x-prev.x,q.z-prev.z);prev=q;}
        candidates.push({route,length:length+(sign===side?0:1)});
      }
    }
    candidates.sort((a,b)=>a.length-b.length);
    p.doorRetreat={door:id,route:candidates[0]?.route||[]};
  }
  const route=p.doorRetreat.route,dest=route[0];p.phase='doorYield';
  if(!dest)return false;
  const dx=dest.x-p.x,dz=dest.z-p.z,length=Math.hypot(dx,dz),step=Math.min(length,.95*dt);
  const next=length?{x:p.x+dx/length*step,z:p.z+dz/length*step}:{x:p.x,z:p.z};
  if(game.doors.some(d=>circleHits(next,.24,doorShape(d)))){p.doorRetreat.route=[];return false;}
  p.x=next.x;p.z=next.z;
  if(step>=length-.001)route.shift();
  if(game.time-game.lastFoot>.7){game.lastFoot=game.time;game.emit('parentStep',40,p.x,p.z);}
  return false;
}
