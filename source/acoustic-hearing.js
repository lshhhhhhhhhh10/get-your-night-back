import {acousticsFor,bandLevel} from './acoustics.js';
import {environmentSources,emittedBands} from './sound-sources.js';
import {PARENT_BED} from './layout.js';
import {floorAt} from './surfaces.js';
import {soundPosition} from './spatial-audio.js';
export const listenerPosition=game=>({...game.player,y:game.hidden?.86:1.35});
export function parentEar(game){const p=game.parent,wake=p.state==='warning'?Math.max(0,Math.min(1,(5-p.timer)/2)):['sleep','alert'].includes(p.state)?0:1;return {x:PARENT_BED.x+(p.x-PARENT_BED.x)*wake,z:PARENT_BED.z+(p.z-PARENT_BED.z)*wake,y:1+.55*wake};}
export function sourcePosition(game,kind,point){
 const source={kind,...soundPosition(kind,point.x,point.z),...(point.y!==undefined?{y:point.y}:{})};
 if(/^door|^hinge|^latch/.test(kind)){const d=game.doors.find(d=>Math.hypot(d.x-point.x,d.z-point.z)<.75);if(d)source.ignoreDoor=d;}
 return source;
}
const through=(bands,path)=>bands.map((v,i)=>v*path.bands[i]);
// 各频段的掩蔽只作用于该频段。数字是相对录音电平，不声称耳机声压标定。
function residual(signal,mask){
 const energy=signal.reduce((s,x)=>s+x*x,0);if(energy<1e-12)return 1;
 return Math.sqrt(signal.reduce((s,x,i)=>s+x*x/(1+(mask[i]/Math.max(.00001,x))**2),0)/energy);
}
export function hearingAt(game,amount,kind,point=game.player){
 const scene=acousticsFor(game),source=sourcePosition(game,kind,point),ear=parentEar(game),path=scene.profile(source,ear);
 const signal=through(emittedBands(kind,amount,floorAt(point.x,point.z)),path),mask=[0,0,0];
 for(const s of environmentSources(game)){if(!s.active)continue;const v=through(emittedBands(s.kind).map(x=>x*s.gain),scene.profile(s,ear));v.forEach((x,i)=>mask[i]+=x*x);}
 const factor=residual(signal,mask.map(Math.sqrt));
 // 原有警觉单位保留；一单位按两米参考距离换算，所有材质／门洞使用同一频谱传播。
 const weights=emittedBands(kind,amount,floorAt(point.x,point.z)).map(x=>x*x),sum=weights.reduce((a,b)=>a+b,0)||1;
 const transmission=bandLevel(path.bands,weights.map(x=>x/sum));
 return {heard:amount*Math.min(1,transmission*2)*factor,factor,path,signal};
}
export function acousticMaskAt(game,point=game.player){
 const scene=acousticsFor(game),listener={...point,y:game.hidden?.86:1.35},own=sourcePosition(game,'floorSoft',point);
 const step=through(emittedBands('floorSoft'),scene.profile(own,listener)),heard=hearingAt(game,25,'floorSoft',point);
 if(heard.factor>.5)return null;
 let best=null;
 for(const s of environmentSources(game)){
  if(!s.active||!s.cover)continue;
  const bands=through(emittedBands(s.kind).map(x=>x*s.gain),scene.profile(s,listener)),ratio=bandLevel(bands)/Math.max(.00001,bandLevel(step));
  if(ratio>=.65&&(!best||ratio>best.ratio))best={id:s.kind,name:s.name,factor:heard.factor,ratio};
 }
 return best;
}
