import {SOUND_SPEED} from './acoustics.js';
// 同一声学参数用于实录、连续声与程序拟音；左右定位仅由 HRTF 负责。
const db=x=>20*Math.log10(Math.max(.000001,x));
function bandRack(ctx){
 const input=ctx.createGain(),low=ctx.createBiquadFilter(),high=ctx.createBiquadFilter();
 low.type='lowshelf';low.frequency.value=400;high.type='highshelf';high.frequency.value=2300;input.connect(low);low.connect(high);
 return {input,output:high,set(bands,t,initial=false){for(const [param,value]of [[input.gain,bands[1]],[low.gain,Math.max(-60,Math.min(60,db(bands[0])-db(bands[1])))],[high.gain,Math.max(-60,Math.min(60,db(bands[2])-db(bands[1])))]]){if(initial)param.value=value;else param.setTargetAtTime(value,t,.045);}},dispose(){input.disconnect();low.disconnect();high.disconnect();}};
}
export const ROOM_DECAY={soft:.24,wood:.46,tile:.74};
export function roomImpulse(ctx,type){
 const rt=ROOM_DECAY[type],buffer=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*(rt+.05)),ctx.sampleRate);
 let seed=18463;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let low=0;
  for(let i=0;i<data.length;i++){const time=i/ctx.sampleRate;if(time<.024)continue;low=low*.72+random()*.28;data[i]=low*Math.exp(-6.908*time/rt)*.11;}}
 return buffer;
}
export class AcousticVoice{
 constructor(ctx,source,bus,reverbs,profile){
  this.ctx=ctx;this.source=source;this.gain=ctx.createGain();this.output=ctx.createGain();this.output.connect(bus);this.paths=[];this.reverbs=reverbs;this.disposed=false;
  for(let i=0;i<3;i++){
   const rack=bandRack(ctx),delay=ctx.createDelay(.5),pan=ctx.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.rolloffFactor=0;pan.channelCount=1;pan.channelCountMode='explicit';
   rack.input.gain.value=0;this.gain.connect(rack.input);rack.output.connect(delay);delay.connect(pan);pan.connect(this.output);this.paths.push({rack,delay,pan});
  }
  this.wet=bandRack(ctx);this.wet.input.gain.value=0;this.wetDelay=ctx.createDelay(.5);this.wetGain=ctx.createGain();this.wetGain.gain.value=.10;this.gain.connect(this.wet.input);this.wet.output.connect(this.wetDelay);this.wetDelay.connect(this.wetGain);
  this.update(profile,true);
 }
 update(profile,initial=false){
  if(this.disposed)return;this.profile=profile;const t=this.ctx.currentTime;
  for(const [i,path]of[profile.direct,profile.routed,profile.reflection].entries()){
   const v=this.paths[i];v.rack.set(path.bands,t,initial);const at=path.arrival;
   for(const[k,x]of Object.entries({positionX:at.x,positionY:at.y??1.1,positionZ:at.z})){if(initial)v.pan[k].value=x;else v.pan[k].setTargetAtTime(x,t,.045);}
   if(initial)v.delay.delayTime.value=Math.min(.49,path.delay);else v.delay.delayTime.setTargetAtTime(Math.min(.49,path.delay),t,.06);
  }
  this.wet.set(profile.bands,t,initial);const wetDelay=Math.min(.49,profile.distance/SOUND_SPEED);if(initial)this.wetDelay.delayTime.value=wetDelay;else this.wetDelay.delayTime.setTargetAtTime(wetDelay,t,.06);
  if(this.room!==profile.room){this.wetGain.disconnect();this.room=profile.room;this.wetGain.connect(this.reverbs[this.room]);}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.gain.disconnect();this.output.disconnect();this.wet.dispose();this.wetDelay.disconnect();this.wetGain.disconnect();for(const v of this.paths){v.rack.dispose();v.delay.disconnect();v.pan.disconnect();}}
}
