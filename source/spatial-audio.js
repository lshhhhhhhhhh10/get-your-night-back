export function soundPosition(kind,x,z){return {x,y:/Step$|step|floor|Drop|crash/i.test(kind)?.12:kind==='snore'?1:1.1,z};}
export function acousticProfile(source,listener,yaw=0,blocked=false){
  const dx=source.x-listener.x,dz=source.z-listener.z,distance=Math.hypot(dx,dz);
  const side=dx*Math.cos(yaw)+dz*Math.sin(yaw),front=dx*Math.sin(yaw)-dz*Math.cos(yaw);
  const direction=distance<.3?'身边':Math.abs(side)<distance*.38?(front>=0?'前方':'身后'):(side>0?'右':'左')+(front>=0?'前方':'后方');
  return {distance,direction,range:distance<2?'很近':distance<6?'附近':'远处',cutoff:blocked?850:Math.max(2400,14000/(1+distance*.2)),gain:blocked?.48:1};
}
export const SOUND_LABELS={parentStep:'脚步',snore:'鼾声',bed:'床板声',doorSoft:'推门声',doorCreak:'门轴声',latch:'门锁声',crash:'花瓶落地',pencilDrop:'文具滚落',metalDrop:'金属碰撞',toy:'玩具声',radio:'收音机',washer:'洗衣机',catMeow:'猫叫',catChirp:'猫叫',parentGiggle:'忍不住的笑声'};
