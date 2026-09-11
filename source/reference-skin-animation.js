// These authored rigs already rest with their arms down. Their lower limbs and
// fingers are separate deform joints, unlike the legacy attachment rigs.
export const isReferenceSkin=id=>id==='golden-frog'||id==='golden-bull';
export function animateReferenceSkin(root,{time=0,phase=time*5,moving=false,reach=0,crouching=false,sleeping=false,tickle=0}={}){
  const cache=root.userData.referenceRig||(root.userData.referenceRig=new Map());
  if(!cache.size)root.traverse(o=>{if(o.isBone)cache.set(o.name,{bone:o,rotation:o.quaternion.clone(),position:o.position.clone()});});
  for(const {bone,rotation,position} of cache.values()){bone.quaternion.copy(rotation);bone.position.copy(position);}
  const rotate=(name,x=0,y=0,z=0)=>{const b=cache.get(name)?.bone;if(b){b.rotateX(x);b.rotateY(y);b.rotateZ(z);}};
  rotate('Spine',Math.sin(time*1.7)*.012+(crouching?.13:0),0,moving?Math.sin(phase)*.018:0);
  rotate('Head',reach*.04,Math.sin(time*.8)*.018,0);
  for(const [side,offset] of [['L',0],['R',Math.PI]]){
    const swing=moving?Math.sin(phase+offset):0,lift=Math.max(0,-swing);
    rotate('Arm'+side,-swing*.27-reach*.9);
    rotate('Forearm'+side,-.035-Math.max(0,swing)*.12-reach*.35-(crouching?.12:0));
    rotate('Leg'+side,swing*.38+(sleeping?tickle*(.45+Math.sin(time*12)*.15):0));
    rotate('Shin'+side,-lift*.42);rotate('Foot'+side,lift*.18);
    rotate('Hand'+side,0,Math.sin(time*1.4+offset)*.025,0);
    for(let i=0;i<4;i++)rotate('Finger'+side+i,reach*.16);
    rotate('Ear'+side,0,0,Math.sin(time*1.3+offset)*.035);
  }
  rotate('Tail',0,Math.sin(time*(moving?5:1.7))*(moving?.20:.10),0);
  rotate('TailTip',0,Math.sin(time*(moving?5:1.7)-.7)*.12,0);
}
