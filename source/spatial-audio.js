export function soundPosition(kind,x,z){return {x:kind==='hingeMotion'?x-.47:x,y:kind==='hingeMotion'?1.2:/Step$|step|floor|Drop|crash/i.test(kind)?.12:kind==='snore'?1:kind==='radio'?(x>20?.88:.6):kind==='toy'?.65:1.1,z};}
// 门框撞击来自门本体；自己的门扇不能把这一下误判为隔门闷响。
export function doorsForSound(source,doors){return source.kind==='doorBump'?doors.filter(d=>Math.hypot(d.x-source.x,d.z-source.z)>.01):doors;}
// 父母紧接着翻身时，给接触声留半拍字幕，再显示其回应。
export function latestSoundCue(cues,now){return cues.findLast(c=>c.kind==='doorBump'&&now-c.at<450)||cues.findLast(c=>c.kind==='parentStep'&&now-c.at<1000)||cues.at(-1);}
export function acousticProfile(source,listener,yaw=0){
  const dx=source.x-listener.x,dz=source.z-listener.z,distance=Math.hypot(dx,dz);
  const side=dx*Math.cos(yaw)+dz*Math.sin(yaw),front=dx*Math.sin(yaw)-dz*Math.cos(yaw);
  const direction=distance<.3?'身边':Math.abs(side)<distance*.38?(front>=0?'前方':'身后'):(side>0?'右':'左')+(front>=0?'前方':'后方');
  return {distance,direction,range:distance<2?'很近':distance<6?'附近':'远处',lateral:distance>.05?side/distance:0};
}
export const SOUND_LABELS={lockPin:'弹子卡入',lockScrape:'锁芯刮响',parentStep:'脚步',snore:'鼾声',bed:'床板声',doorSoft:'推门声',doorCreak:'门轴声',doorBump:'门框撞击',latch:'门锁声',crash:'花瓶落地',pencilDrop:'文具滚落',metalDrop:'金属碰撞',toy:'玩具声',radio:'收音机',washer:'洗衣机',catMeow:'猫叫',catChirp:'猫叫',parentGiggle:'忍不住的笑声'};
