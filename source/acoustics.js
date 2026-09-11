import {wall,mapWidth,MAP_DEPTH} from './world-geometry.js';
import {furnitureFor,doorShape,localPoint,OPENINGS} from './layout.js';
import {floorAt} from './surfaces.js';

export const SOUND_SPEED=343,CEILING=2.6;
// 125 / 1000 / 4000 Hz 附近的振幅透射系数。为本游戏假定材质，非实测隔声量。
export const TRANSMISSION={wall:[.13,.045,.012],door:[.30,.12,.035],wood:[.65,.38,.18],soft:[.40,.20,.075]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.y??1.35)-(b.y??1.35));
const multiply=(a,b)=>a.map((v,i)=>v*b[i]);
export function bandLevel(bands,weights=[.25,.5,.25]){return Math.sqrt(bands.reduce((s,v,i)=>s+v*v*weights[i],0));}
function interval(a,b,box){
 const pa=localPoint(a,box),pb=localPoint(b,box);let lo=0,hi=1;
 for(const [start,end,min,max]of[[pa.x,pb.x,-box.w/2,box.w/2],[pa.z,pb.z,-box.d/2,box.d/2],[a.y??1.35,b.y??1.35,0,box.h]]){
  const delta=end-start;if(Math.abs(delta)<1e-8){if(start<=min||start>=max)return null;continue;}
  const t0=(min-start)/delta,t1=(max-start)/delta;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(hi-lo<1e-6)return null;
 }return hi>.002&&lo<.998?[lo,hi]:null;
}
const emptyPath=(source)=>({bands:[0,0,0],distance:0,delay:0,arrival:source});
export function freeField(distance){const spread=1/Math.max(1,distance);return [spread,spread*Math.exp(-distance*.001),spread*Math.exp(-distance*.006)];}

export class AcousticScene{
 constructor(level=0){
  this.level=level;this.boxes=[];this.cache=new Map();this.doors=[];this.version='';
  for(let z=0;z<MAP_DEPTH;z++)for(let x=0;x<mapWidth(level);x++)if(wall(x,z,level))this.boxes.push({x,z,w:1,d:1,h:CEILING});
  this.furniture=furnitureFor(level).filter(f=>!['lamp','plant','table','desk','chair'].includes(f.type));
  this.portals=[];
  for(const[x,z,axis]of OPENINGS){if(wall(x,z,level)||x>=mapWidth(level)-1)continue;const n=this.portals.length,opening={x,z};
   this.portals.push({x:x+(axis==='z'?-.56:0),z:z+(axis==='x'?-.56:0),y:1.35,opening,mate:n+1},
    {x:x+(axis==='z'?.56:0),z:z+(axis==='x'?.56:0),y:1.35,opening,mate:n});}
  this.links=this.portals.map(()=>[]);
  for(let i=0;i<this.portals.length;i++)for(let j=i+1;j<this.portals.length;j++)if(!this.wallHits(this.portals[i],this.portals[j])){this.links[i].push(j);this.links[j].push(i);}
 }
 update(doors=[]){const version=doors.map(d=>`${d.x},${d.z},${Math.round((d.progress??(d.open?1:0))*100)}`).join(';');this.doors=doors;if(version!==this.version){this.version=version;this.cache.clear();}}
 wallHits(a,b){
  const hits=this.boxes.map(box=>interval(a,b,box)).filter(Boolean).sort((a,b)=>a[0]-b[0]);let count=0,end=-1;
  for(const hit of hits){if(hit[0]>end+1e-5)count++;end=Math.max(end,hit[1]);}return count;
 }
 trace(a,b,{furniture=true,doors=true}={}){
  const walls=this.wallHits(a,b);let bands=TRANSMISSION.wall.map(x=>x**walls),doorCount=0,objects=0;
  if(doors)for(const door of this.doors){if(a.ignoreDoor&&Math.hypot(door.x-a.ignoreDoor.x,door.z-a.ignoreDoor.z)<.01)continue;
   if(interval(a,b,doorShape({...door,progress:door.progress??(door.open?1:0)}))){bands=multiply(bands,TRANSMISSION.door);doorCount++;}}
  if(furniture)for(const f of this.furniture){
   // 发声家具本体及贴在上面的声源不自遮挡；床下／柜后仍按真实高度判断。
   const p=localPoint(a,f),q=localPoint(b,f);if(Math.abs(p.x)<=f.w/2+.04&&Math.abs(p.z)<=f.d/2+.04||Math.abs(q.x)<=f.w/2+.04&&Math.abs(q.z)<=f.d/2+.04)continue;
   if(interval(a,b,f)){bands=multiply(bands,['bed','sofa'].includes(f.type)?TRANSMISSION.soft:TRANSMISSION.wood);objects++;}}
  return {bands,walls,doors:doorCount,objects};
 }
 edge(a,b){
  const bridge=a.opening&&b.opening&&a.opening===b.opening;
  let bands=[1,1,1];
  if(!bridge)for(const d of this.doors)if(!(a.ignoreDoor&&d.x===a.ignoreDoor.x&&d.z===a.ignoreDoor.z)&&interval(a,b,doorShape({...d,progress:d.progress??(d.open?1:0)})))bands=multiply(bands,TRANSMISSION.door);
  // 门洞的有效开口随门板投影连续变化；关闭时只剩门板透射，不瞬间二分。
  if(bridge){const door=this.doors.find(d=>d.x===a.opening.x&&d.z===a.opening.z);if(door){const gap=1-Math.cos((door.progress??(door.open?1:0))*Math.PI*.49);bands=multiply(bands,TRANSMISSION.door.map(v=>gap+(1-gap)*v));}}
  return {distance:length(a,b),bands};
 }
 around(a,b){
  const n=this.portals.length,dist=Array(n).fill(Infinity),prev=Array(n).fill(-1),used=new Set();
  for(let i=0;i<n;i++)if(!this.wallHits(a,this.portals[i])){const e=this.edge(a,this.portals[i]);dist[i]=e.distance-3*Math.log(Math.max(.00001,e.bands[1]));}
  for(let k=0;k<n;k++){let i=-1;for(let j=0;j<n;j++)if(!used.has(j)&&(i<0||dist[j]<dist[i]))i=j;if(i<0||!Number.isFinite(dist[i]))break;used.add(i);
   for(const j of this.links[i]){const e=this.edge(this.portals[i],this.portals[j]),cost=dist[i]+e.distance-3*Math.log(Math.max(.00001,e.bands[1]));if(cost<dist[j]){dist[j]=cost;prev[j]=i;}}}
  let best=-1,cost=Infinity;for(let i=0;i<n;i++)if(!this.wallHits(this.portals[i],b)){const e=this.edge(this.portals[i],b),v=dist[i]+e.distance-3*Math.log(Math.max(.00001,e.bands[1]));if(v<cost){best=i;cost=v;}}
  if(best<0)return emptyPath(a);
  const points=[b];for(let i=best;i>=0;i=prev[i])points.unshift(this.portals[i]);points.unshift(a);
  // 去掉同一通透路径上的多余导航点，避免声源被虚假拐角或邻近门洞拉走。
  for(let i=1;i<points.length-1;){const t=this.trace(points[i-1],points[i+1],{furniture:false});if(!t.walls&&!t.doors)points.splice(i,1);else i++;}
  let bands=[1,1,1],distance=0,turn=0;for(let i=1;i<points.length;i++){const e=this.edge(points[i-1],points[i]);bands=multiply(bands,e.bands);distance+=e.distance;
   if(i<points.length-1){const p=points[i-1],q=points[i],r=points[i+1],u=Math.hypot(q.x-p.x,q.z-p.z),v=Math.hypot(r.x-q.x,r.z-q.z);if(u*v>.001)turn+=Math.acos(clamp(((q.x-p.x)*(r.x-q.x)+(q.z-p.z)*(r.z-q.z))/(u*v),-1,1));}}
  // 绕射在高频损耗更多。只计算门洞图路径，不宣称求解完整波动方程。
  bands=multiply(multiply(bands,freeField(distance)),[Math.exp(-turn*.16),Math.exp(-turn*.45),Math.exp(-turn*.88)]);
  return {bands,distance,delay:distance/SOUND_SPEED,arrival:points.at(-2),turn,points};
 }
 room(point){
  // 房间硬软材质决定短混响；开放走廊较散，地毯／卧室较干。
  const surface=floorAt(point.x,point.z),bedroom=point.x<7&&point.z>10||point.x>5&&point.x<9&&point.z>4&&point.z<8;
  return surface==='carpet'||bedroom?'soft':surface==='tile'?'tile':'wood';
 }
 reflection(a,b,direct){
  if(direct.walls||direct.doors)return emptyPath(a);
  const type=this.room(b),coefficient=type==='soft'?[.20,.12,.06]:type==='tile'?[.56,.48,.38]:[.42,.30,.20];
  const mirror={...a,y:-(a.y??1.1)},distance=length(mirror,b),fraction=(b.y??1.35)/((a.y??1.1)+(b.y??1.35));
  const bounce={x:b.x+(a.x-b.x)*fraction,z:b.z+(a.z-b.z)*fraction,y:.025};
  if(this.wallHits(a,bounce)||this.wallHits(bounce,b))return emptyPath(a);
  return {bands:multiply(multiply(freeField(distance),coefficient),direct.bands),distance,delay:distance/SOUND_SPEED,arrival:mirror};
 }
 profile(source,listener){
  const a={y:1.1,...source},b={y:1.35,...listener};
  const key=[a.x,a.y,a.z,b.x,b.y,b.z].map(v=>Math.round(v*25)).join(',')+(a.ignoreDoor?`,d${a.ignoreDoor.x},${a.ignoreDoor.z}`:'');
  if(this.cache.has(key))return this.cache.get(key);
  const distance=length(a,b),trace=this.trace(a,b),direct={...trace,bands:multiply(trace.bands,freeField(distance)),distance,delay:distance/SOUND_SPEED,arrival:a};
  const routed=trace.walls||trace.doors?this.around(a,b):emptyPath(a),reflection=this.reflection(a,b,trace);
  // 同一条直线穿过门缝与门板只算一次能量，不能把重复路径叠出额外响度。
  if(routed.distance&&routed.distance-distance<.12)routed.bands=routed.bands.map((v,i)=>Math.sqrt(Math.max(0,v*v-direct.bands[i]**2)));
  const bands=direct.bands.map((v,i)=>Math.sqrt(v*v+routed.bands[i]**2+reflection.bands[i]**2));
  const dominant=bandLevel(routed.bands)>bandLevel(direct.bands)?routed:direct;
  const result={direct,routed,reflection,bands,gain:bandLevel(bands),distance:dominant.distance,arrival:dominant.arrival,
   blocked:!!(trace.walls||trace.doors||trace.objects),room:this.room(b),route:dominant===routed?'doorway':'direct',walls:trace.walls,doors:trace.doors};
  if(this.cache.size>256)this.cache.clear();this.cache.set(key,result);return result;
 }
}
const scenes=new WeakMap();
export function acousticsFor(game){let scene=scenes.get(game);if(!scene||scene.level!==game.level){scene=new AcousticScene(game.level);scenes.set(game,scene);}scene.update(game.doors);return scene;}
