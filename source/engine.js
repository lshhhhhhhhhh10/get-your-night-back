import {REACTION_DURATION,impactTime} from './incident-motion.js';
import {newRescue,advanceRescue,RESCUE_DURATION} from './rescue.js';
import {tickleNear,tickTickle} from './tickle.js';
import {floorAt} from './surfaces.js';
import {locked,newLock,advanceLock,releaseLock,restoreLock,LOCKS} from './lockpick.js';
import {newCat,tickCat,catNear,catInteraction,petCat,tossCatToy,restoreCat} from './cat.js';
import {CLUES,LURES,WASHER,newNightTools,maskAt,phonePending} from './night-tools.js';
import {newMetrics,evaluatePerformance} from './performance.js';
import {INCIDENTS,incidentRoll,CATCH_DURATION,CATCH_INTRO,CATCH_SWEEP,SLOW_FACTOR} from './incidents.js';
import {furnitureFor,searchSpots,circleHits,doorShape,PARENT_HOME,PARENT_BED} from './layout.js';
import {restingDoor,advanceDoor,hingeCaption} from './door.js';
import {doorSweepHits,clearDoorSwing} from './door-traffic.js';
export const PRESETS = [
  {name:'第一声吱呀',subtitle:'从客厅找到书房',description:'两个藏点。观察锁芯接缝，借长鼾声轻轻通过，再去书房找设备。',width:.22,nightVisit:false,spots:[[3,2,'客厅矮柜'],[16,2,'书房抽屉']],creaks:[[3,9],[15,3]],device:1},
  {name:'今晚走哪边',subtitle:'近路，未必安静',description:'五个藏点。柜锁多了腰形弹子，遇到台肩先卸力；借环境声掩护探索。',width:.16,nightVisit:false,spots:[[2,2,'窗边矮柜'],[16,2,'书房抽屉'],[21,3,'餐边柜'],[21,11,'储物柜'],[12,17,'洗衣间抽屉']],creaks:[[3,9],[3,7],[3,5],[4,3],[10,3],[15,3],[16,10],[20,12]],device:3},
  {name:'脚步近了',subtitle:'边探索，边听动静',description:'父母会起夜巡视。用声源引开巡查，蹲行避开视线，取物后先静音再返程。',width:.16,nightVisit:true,spots:[[2,2,'窗边矮柜'],[16,2,'书房抽屉'],[21,3,'餐边柜'],[21,11,'储物柜'],[12,17,'洗衣间抽屉']],creaks:[[3,9],[3,5],[4,3],[10,3],[15,3],[16,10],[20,12]],device:4}
];
PRESETS.forEach((p,i)=>p.spots=searchSpots(i));
export const MAP_DEPTH=19;
export const mapWidth=level=>level===0?19:24;
export const RECOGNITION_TIME=.25;
export const MINIMAP_RADIUS=4;
export const HOME={x:3,z:12};
export const COVERS=furnitureFor(2).filter(f=>f.cover);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function wall(x,z,level=0){
  if(x<=0||x>=mapWidth(level)-1||z<=0||z>=MAP_DEPTH-1)return true;
  if(z>=14&&x<10)return true;
  if(x===14&&![3,9,12,16].includes(z))return true;
  if(x>=15){
    if(x===18&&![3,12,16].includes(z))return true;
    if((z===7||z===14)&&![16,21].includes(x))return true;
    return false;
  }
  if(z===14&&x>=10&&x<14&&x!==11)return true;
  if(z===10 && x!==3 && x!==11)return true;
  if(x===7&&z>=11)return true;
  if((z===4||z===8)&&x>=5&&x<=9 && !(z===8&&x===7))return true;
  if((x===5||x===9)&&z>=4&&z<=8)return true;
  if(z===6&&x>=10&&x!==11)return true;
  return false;
}
export function canStand(x,z,level=0,radius=.20){
  for(let iz=Math.floor(z-.8);iz<=Math.ceil(z+.8);iz++)for(let ix=Math.floor(x-.8);ix<=Math.ceil(x+.8);ix++)if(wall(ix,iz,level)&&circleHits({x,z},radius,{x:ix,z:iz,w:1,d:1}))return false;
  return !furnitureFor(level).some(f=>circleHits({x,z},radius,f));
}
export function solid(x,z,level=0){return !canStand(x,z,level,.01);}
export function playerBlocked(x,z,level=0){return !canStand(x,z,level);}
export function occluded(a,b,level,doors=[],lowCoverBlocks=true,ignoreId=null){
  const steps=Math.ceil(distance(a,b)*30),furniture=furnitureFor(level).filter(f=>f.id!==ignoreId&&f.h>=(lowCoverBlocks?.74:1.35));
  for(let i=1;i<steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    if(wall(Math.round(p.x),Math.round(p.z),level)||furniture.some(f=>circleHits(p,.005,f))||doors.some(d=>circleHits(p,.005,doorShape(d))))return true;
  }return false;
}
// 半格导航与实际圆形碰撞使用相同数据，不把柜子空隙误当整格墙。
const navCache=new Map();
function navNodes(level){if(!navCache.has(level)){const nodes=new Map();for(let z=1;z<MAP_DEPTH-1;z+=.5)for(let x=1;x<mapWidth(level)-1;x+=.5)if(canStand(x,z,level,.24))nodes.set(`${x},${z}`,{x,z});navCache.set(level,nodes);}return navCache.get(level);}
export class Game{
  constructor(level=0){this.reset(level);}
  reset(level=0){
    this.level=level;this.preset=PRESETS[level];this.player={...HOME,heading:Math.PI};
    this.parent={...PARENT_HOME,heading:0,state:'sleep',phase:'rest',intent:'patrol',a:0,recognition:0,route:[],itinerary:[],timer:0,lastRetarget:-10,scanHeading:0};
    this.doors=[{x:3,z:10,name:'卧室门',open:false,progress:0},{x:11,z:6,name:'旧木门',open:false,progress:0}];
    this.spots=this.preset.spots.map(([x,z,name,id],i)=>({x,z,name,id,searched:false,device:i===this.preset.device}));
    this.active=false;this.status='ready';this.mode=null;this.hidden=false;this.hasDevice=false;this.time=0;this.moveCooldown=0;this.noise=0;this.noiseAt={...HOME};this.noiseAge=100;this.quiet=0;this.events=[];this.toast='';this.toastLeft=0;this.history=[];this.vase='stable';this.nextVisit=level===2?32:Infinity;this.visits=0;this.pointer=.5;this.lastSnore=-9;this.lastFoot=0;this.lastSeen=0;this.aim=null;this.inspectionTarget={x:3,z:9};this.safeSteps=0;
    this.cat=newCat();this.night=newNightTools();this.metrics=newMetrics();this.seed=Math.floor(Math.random()*4294967296)>>>0;this.incidentUsed={};this.incidentOutcomes={};this.realTime=0;
    this.velocity={x:0,z:0};this.walked=0;this.footTile=`${HOME.x},${HOME.z}`;this.stepTransit=null;
  }
  start(){this.status='playing';this.active=true;this.say('先听屋里的动静，再去房间找设备。遇到柜锁，靠近按 E 观察里面的机械结构。','hint');}
  say(text,type='info'){this.toast=text;this.toastLeft=5;this.events.push({type,text,time:this.time});if(type!=='snore'&&type!=='hint'){this.history.push({text,time:this.realTime});if(this.history.length>12)this.history.shift();}}
  emit(kind,strength=0,x=this.player.x,z=this.player.z){this.events.push({type:'sound',kind,strength,x,z,surface:floorAt(x,z)});}
  makeNoise(amount,label,kind,source=this.player){
    const mask=maskAt(this,source);if(mask)amount*=mask.factor;
    if(amount>10){this.metrics.loudSounds++;this.metrics.noiseBurden+=amount-10;}
    this.noise=amount;this.noiseAt={x:source.x,z:source.z};this.noiseAge=0;this.quiet=0;
    // 墙和距离影响父母实际听到的声响；声响本身从不直接判负。
    this.hearNoise(amount,source);
    if(amount>10)this.say(label,'noise');this.emit(kind||(amount>15?'creak':'step'),amount,source.x,source.z);
  }
  hearNoise(amount,source,force=false){
    if(force)this.quiet=0;
    const dist=distance(source,this.parent),attenuation=occluded(source,this.parent,this.level,this.doors)?.50:1;
    const heard=amount*attenuation/(1+dist*.07);
    this.parent.a=clamp(this.parent.a+heard,0,100);if(heard>=6){this.inspectionTarget={x:source.x,z:source.z};if(['checking','returning'].includes(this.parent.state)&&this.time-this.parent.lastRetarget>1.2){this.parent.state='checking';this.parent.intent='investigate';this.parent.itinerary=[];this.parent.lastRetarget=this.time;this.setDestination(this.inspectionTarget);}}
    if(heard>=6&&this.parent.state==='warning'){this.parent.intent='investigate';this.parent.itinerary=[{...this.inspectionTarget}];}
    if(force&&heard>=6&&['sleep','alert'].includes(this.parent.state))this.parent.a=Math.max(60,this.parent.a);
  }
  toolNear(){
    const list=LURES.filter(l=>l.minLevel<=this.level&&!this.night.lures[l.id]);
    const tool=list.filter(t=>distance(t,this.player)<1.25&&!occluded(this.player,t,this.level,this.doors,true,t.furniture)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
    if(tool&&[this.doorNear(),this.spotNear()].some(t=>t&&distance(t,this.player)<=distance(tool,this.player)))return null;return tool;
  }
  tickNightTools(dt,input,cinematic){
    if(this.status!=='playing')return;
    const phase=this.time%WASHER.cycle;
    if(phase>=WASHER.start&&phase<WASHER.end&&this.time-this.night.lastWasher>=1.6){this.night.lastWasher=this.time;this.emit('washer',30,WASHER.x,WASHER.z);}
    for(const l of LURES){const state=this.night.lures[l.id];if(!state||state.done)continue;state.timer-=dt;if(state.timer<=0){state.pulses++;state.timer=1.6;this.emit(l.kind,50,l.x,l.z);this.hearNoise(65,l,true);if(state.pulses===1)this.say(`${l.name} 响了，父母会去查看那个位置。`,'info');if(state.pulses>=4)state.done=true;}}
    const phone=this.night.phone;
    if(!phonePending(this)||cinematic)return;
    phone.timer-=dt;
    if(input.e&&phone.armed&&!this.mode&&Math.hypot(this.velocity.x,this.velocity.z)<.12){phone.hold+=dt;if(phone.hold>=1.2){phone.state='silenced';phone.armed=false;this.say('来电已静音。带手机回到卧室。','good');this.emit('phoneMute',5);return;}}
    else{phone.hold=0;if(!input.e)phone.armed=false;}
    if(phone.state==='warning'){const second=Math.ceil(phone.timer);if(second!==phone.lastCue){phone.lastCue=second;this.emit('phoneBuzz',4);}if(phone.timer<=0){phone.state='ringing';phone.timer=0;this.say('来电响了！停下，按住 E 静音。','warning');}}
    if(phone.state==='ringing'&&phone.timer<=0){phone.rings++;this.makeNoise(38,'手机铃声传进了走廊。','phoneRing');phone.timer=2.4;if(phone.rings>=3){phone.state='missed';phone.armed=false;this.say('来电挂断了。留意父母的脚步。','warning');}}
  }
  catCanSee(a,b){return !occluded(a,b,this.level,this.doors,true);}
  catNear(radius){return catNear(this,radius);}
  catInteraction(){return catInteraction(this);}
  petCat(){return petCat(this);}
  tossCatToy(dx,dz){return tossCatToy(this,dx,dz);}
  tickleNear(){return tickleNear(this);}
  doorNear(){return this.doors.find(d=>distance(d,this.player)<1.2);}
  doorDirection(d){return d.progress<=0?1:d.progress>=1?-1:d.direction||1;}
  reverseDoor(){if(this.mode?.type!=='door')return;const m=this.mode;m.drive={...restingDoor(),direction:-m.drive.direction};m.door.direction=m.drive.direction;}
  coverNear(){return furnitureFor(this.level).find(c=>c.cover&&distance(c,this.player)<1.5);}
  spotNear(){return this.spots.find(s=>distance(s,this.player)<1.2&&!s.searched&&!occluded(this.player,s,this.level,this.doors,true,s.id));}
  canOccupy(x,z){
    return canStand(x,z,this.level)&&!this.doors.some(d=>circleHits({x,z},.20,doorShape(d)));
  }
  move(dx,dz,dt=1/60){
    if(!this.active||this.status!=='playing'||this.mode||this.stepTransit){this.velocity={x:0,z:0};return false;}
    dt=clamp(dt,0,.06);const mag=Math.hypot(dx,dz),speed=this.hidden?1.05:2.05,k=1-Math.exp(-(mag?24:36)*dt);
    this.velocity.x+=((mag?dx/Math.max(1,mag)*speed:0)-this.velocity.x)*k;
    this.velocity.z+=((mag?dz/Math.max(1,mag)*speed:0)-this.velocity.z)*k;
    if(Math.hypot(this.velocity.x,this.velocity.z)<.005){this.velocity={x:0,z:0};return false;}
    const p={x:this.player.x,z:this.player.z};
    if(this.canOccupy(p.x+this.velocity.x*dt,p.z))p.x+=this.velocity.x*dt;else this.velocity.x=0;
    if(this.canOccupy(p.x,p.z+this.velocity.z*dt))p.z+=this.velocity.z*dt;else this.velocity.z=0;
    const tile=`${Math.round(p.x)},${Math.round(p.z)}`;
    if(tile!==this.footTile&&this.preset.creaks.some(([x,z])=>x===Math.round(p.x)&&z===Math.round(p.z))){
      const length=Math.hypot(dx,dz)||1,target={x:p.x+dx/length*.34,z:p.z+dz/length*.34};
      if(!this.canOccupy(target.x,target.z)){target.x=p.x;target.z=p.z;}
      if(maskAt(this)){this.night.maskedSteps++;this.metrics.steps++;this.metrics.goodSteps++;this.footTile=tile;this.makeNoise(25,'借着环境声走过木板。','floorSoft');this.say('趁着掩护声，直接走过了松动木板。视线仍然危险。','good');}
      else{this.mode={type:'step',target,tile,elapsed:0,continuous:true};this.velocity={x:0,z:0};
      this.emit('floorPressure',3);this.say('脚下是松动木板。亮区内按空格，轻轻落下；Esc 可以退开。','hint');return false;}
    }
    const traveled=distance(p,this.player);this.player.x=p.x;this.player.z=p.z;this.footTile=tile;this.walked+=traveled;
    if(traveled>.00001)this.player.heading=Math.atan2(dx||this.velocity.x,dz||this.velocity.z);
    if(this.walked>=.72){this.walked%=.72;this.makeNoise(this.hidden?1:3,'轻轻落脚。',this.hidden?'crouchStep':'step');}
    this.checkSpatialEvents();return traveled>0;
  }
  land(p,noise){this.player.x=p.x;this.player.z=p.z;this.footTile=`${Math.round(p.x)},${Math.round(p.z)}`;this.makeNoise(noise,noise>12?'吱呀——这块木板响了。':'轻轻落脚。');this.checkSpatialEvents();}
  checkSpatialEvents(){
    if(this.level===2&&this.vase==='stable'&&distance(this.player,{x:9.7,z:2.8})<1.35){this.vase='wobbling';this.beginIncident('vase');}
    this.checkWin();
  }
  action(){
    if(!this.active||this.status!=='playing')return;
    if(this.mode)return;
    if(phonePending(this)){this.night.phone.armed=true;return;}
    if(this.tickleNear()){this.velocity={x:0,z:0};this.mode={type:'tickle',elapsed:0,pressure:0,moving:false,strokes:0};this.say('轻轻挠脚底，留意呼吸和缩脚。按住 E，松开停下；Esc 收手。','hint');return;}
    if(this.catInteraction()){this.petCat();return;}
    const tool=this.toolNear();if(tool){this.night.lures[tool.id]={timer:2.5,pulses:0,done:false};this.say(`${tool.name} 已定时，2.5 秒后响起。先离开这里。`,'hint');this.emit('switch',5);return;}
    const d=this.doorNear();if(d){d.direction=this.doorDirection(d);this.mode={type:'door',door:d,elapsed:0,drive:{...restingDoor(),direction:d.direction}};this.emit('doorHandle',5,d.x,d.z);this.say('手搭上门把。按住施力，松手停下；R 可换开合方向。','hint');return;}
    const s=this.spotNear();if(s){if(locked(this,s.id)){this.beginLock(s);return;}this.mode={type:'search',spot:s,elapsed:0};this.say('轻轻翻找……有动静时按 Esc 立即停下。','hint');return;}
    this.say(this.hasDevice?'设备拿到了，返回发暖光的卧室。':'靠近门或房间里的柜子，再按 E。','hint');
  }
  beginLock(spot){
    const mechanism=this.night.locks[spot.id]??=newLock(this.level,this.seed,spot.id);releaseLock(mechanism);
    this.velocity={x:0,z:0};this.mode={type:'lockpick',spot,mechanism,elapsed:0};
    this.say('看锁芯里的接缝。顶到边缘齐平时松手；Esc 随时收手听动静。','hint');
  }
  pressSpace(){
    if(!this.active||!this.mode)return;
    const m=this.mode;if(m.type!=='step'&&m.type!=='catch')return;
    if(m.type==='catch'&&(m.rescue||m.elapsed<CATCH_INTRO))return;
    const success=Math.abs(this.pointer-.5)<=this.preset.width/2;
    if(m.type==='step'){
      this.metrics.steps++;if(success)this.metrics.goodSteps++;this.mode=null;
      if(m.continuous){this.stepTransit={from:{x:this.player.x,z:this.player.z},target:m.target,elapsed:0};this.footTile=m.tile;this.makeNoise(success?5:50,success?'木板轻轻吱了一声。':'吱呀——这块木板响了。',success?'floorSoft':'floorCreak');}
      else{this.player.x=m.target.x;this.player.z=m.target.z;this.footTile=`${Math.round(m.target.x)},${Math.round(m.target.z)}`;this.makeNoise(success?5:50,success?'木板轻轻吱了一声。':'吱呀——这块木板响了。',success?'floorSoft':'floorCreak');this.checkSpatialEvents();}
      if(success){this.safeSteps++;this.say('稳稳落下。再听听卧室里有没有变化。','good');}
    }else this.resolveIncident(success);
  }

  hide(){if(!this.active||this.mode)return;this.hidden=!this.hidden;this.say(this.hidden?'蹲低了。可以慢慢移动；身体要藏在家具后，才挡得住视线。':'站起来了。脚步会更快，也更响。','hint');this.emit('cloth',8);}
  cancel(){this.night.phone.armed=false;this.night.phone.hold=0;if(this.mode?.type==='lockpick')releaseLock(this.mode.mechanism);if(this.mode?.type==='catch'){this.resolveIncident(false);return;}if(this.mode?.type==='reaction'){this.mode.resume=null;return;}this.mode=null;}
  beginIncident(id,resume=null){
    const event=INCIDENTS[id];this.incidentUsed[id]=true;this.metrics.incidents++;this.pointer=0;this.velocity={x:0,z:0};
    const source=id==='vase'?{x:9.7,z:2.8}:this.spots.find(s=>s.id===id)||this.player;
    this.parent.recognition=0;this.mode={type:'catch',incidentId:id,elapsed:0,remaining:RESCUE_DURATION,resume,rescue:newRescue(event.kind,this.seed),noiseSource:{x:source.x,z:source.z}};
    this.say(`${event.start} 看清物件，用手救场。`,'warning');this.emit('wobble',15);
  }
  resolveIncident(success,result={}){
    const m=this.mode;if(m?.type!=='catch')return;const id=m.incidentId||'vase',event=INCIDENTS[id];
    this.incidentOutcomes[id]=success?'caught':'fallen';if(success)this.metrics.catches++;
    if(id==='vase')this.vase=success?'caught':'fallen';
    const message=result.text||(success?event.success:event.failure);
    if(success){this.say(message,'good');this.emit('cloth',8);this.events.push({type:'haptic',kind:'settled',material:event.kind});}else if(!m.rescue)this.makeNoise(event.noise*(result.noiseFactor??1),`${message} 先听听父母的动静。`,event.sound,m.noiseSource||this.player);
    this.mode={type:'reaction',catCause:m.catCause,rescue:m.rescue,resultText:message,noiseSource:m.noiseSource,incidentId:id,elapsed:0,sourceElapsed:m.elapsed,pendingImpact:!success&&m.rescue?{at:impactTime(m.rescue),noise:event.noise*(result.noiseFactor??1),message:`${message} 先听听父母的动静。`,sound:event.sound}:null,success,resume:m.resume};
  }
  performance(){return evaluatePerformance(this);}
  checkWin(){if(this.hasDevice&&this.player.z>=11&&this.player.x<=6&&this.status==='playing'){this.status='won';this.mode=null;this.say('安全回到卧室。今晚的时间，拿回来了。','good');this.emit('win',50);}}
  visible(){const d=distance(this.player,this.parent);if(d>5.2||occluded(this.player,this.parent,this.level,this.doors,this.hidden))return false;
    const bearing=Math.atan2(this.player.x-this.parent.x,this.player.z-this.parent.z),diff=Math.atan2(Math.sin(bearing-this.parent.heading),Math.cos(bearing-this.parent.heading));
    return d<1.2||Math.abs(diff)<.85;
  }
  pathTo(target,origin=this.parent,blockClosed=false){
    const nodes=navNodes(this.level),all=[...nodes.values()],key=p=>`${p.x},${p.z}`;
    const clearSegment=(a,b)=>{const n=Math.ceil(distance(a,b)*20);for(let i=0;i<=n;i++){const t=n?i/n:0;const q={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(!canStand(q.x,q.z,this.level,.24)||this.doors.some(d=>(d.open||blockClosed)&&circleHits(q,.24,doorShape(d))))return false;}return true;};
    const start=all.filter(n=>distance(n,origin)<1&&clearSegment(origin,n)).sort((a,b)=>distance(a,origin)-distance(b,origin))[0];if(!start)return[];
    const queue=[start],prev=new Map([[key(start),null]]);let found=start;
    for(let i=0;i<queue.length;i++){const p=queue[i];if(distance(p,target)<distance(found,target))found=p;if(distance(p,target)<.1){found=p;break;}for(const[dx,dz]of[[0,.5],[.5,0],[-.5,0],[0,-.5]]){const n=nodes.get(`${p.x+dx},${p.z+dz}`);if(!n||prev.has(key(n))||!clearSegment(p,n))continue;prev.set(key(n),p);queue.push(n);}}
    const path=[];for(let p=found;p;p=prev.get(key(p)))path.unshift({...p});if(distance(path[0],origin)<.01)path.shift();return path;
  }
  setDestination(target){const p=this.parent;p.goal={...target};p.route=this.pathTo(target);p.phase=p.route.length?'walk':'scan';p.timer=p.intent==='investigate'?3.5:2.6;p.scanHeading=p.heading;}
  beginWarning(){if(!['sleep','alert'].includes(this.parent.state))return;
    const p=this.parent,scheduled=this.level===2&&p.a<60;
    p.intent=scheduled?'patrol':'investigate';p.itinerary=scheduled?(this.visits%2?[{x:11,z:9},{x:11,z:16},{x:16,z:12}]:[{x:3,z:9},{x:16,z:3},{x:21,z:9}]):[{...this.inspectionTarget}];
    this.inspectionTarget={...p.itinerary[0]};p.state='warning';p.phase='rest';p.timer=5;this.say('床板响了……父母翻身，准备起床。还有时间停下或躲藏。','warning');this.emit('bed',55,PARENT_BED.x,PARENT_BED.z);
  }
  patrol(dt){
    const p=this.parent;
    const heldDoor=this.mode?.type==='door'?this.mode.door:null;
    if(heldDoor&&!clearDoorSwing(this,heldDoor,dt))return;
    if(p.doorRetreat&&!heldDoor&&p.openingDoor==null){delete p.doorRetreat;if(p.goal)this.setDestination(p.goal);}
    if(p.openingDoor!=null){const door=this.doors[p.openingDoor];p.phase='opening';
      if(door===heldDoor){p.phase='doorWait';return;}
      if(!clearDoorSwing(this,door,dt))return;
      door.direction=1;const next=clamp(door.progress+dt*.72,0,1);
      if(!doorSweepHits(door,door.progress,next,this.player,.20)&&!doorSweepHits(door,door.progress,next,p,.24))door.progress=next;
      if(door.progress===1){door.open=true;p.openingDoor=null;this.emit('latch',12,door.x,door.z);this.setDestination(p.goal);}return;}
    if(p.route.length){
      const dest=p.route[0],dx=dest.x-p.x,dz=dest.z-p.z,d=Math.hypot(dx,dz),heading=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(heading-p.heading),Math.cos(heading-p.heading));p.heading+=clamp(diff,-dt*3,dt*3);
      const speed=p.state==='returning'?1.15:.95,step=Math.min(d,speed*dt),next=d?{x:p.x+dx/d*step,z:p.z+dz/d*step}:{x:p.x,z:p.z};
      if(heldDoor&&doorSweepHits(heldDoor,0,1,next,.29)){p.phase='doorWait';return;}
      const door=this.doors.find(door=>!door.open&&distance(door,p)<1.15&&circleHits({x:p.x+dx/(d||1)*.38,z:p.z+dz/(d||1)*.38},.24,doorShape(door)));
      if(door){p.openingDoor=this.doors.indexOf(door);p.phase='opening';this.emit('doorSoft',15,door.x,door.z);return;}
      if(this.doors.some(door=>circleHits(next,.24,doorShape(door)))){p.phase='opening';this.setDestination(p.goal);return;}
      p.phase='walk';p.x=next.x;p.z=next.z;if(d<=step+.001)p.route.shift();
      if(this.time-this.lastFoot>.7){this.lastFoot=this.time;this.emit('parentStep',40,p.x,p.z);}
      if(!p.route.length){p.phase='scan';p.timer=p.intent==='investigate'?3.5:2.6;p.scanHeading=p.heading;}
    }else if(p.state==='checking'){
      p.phase='scan';p.timer-=dt;p.heading=p.scanHeading+Math.sin((p.intent==='investigate'?3.5:2.6)-p.timer)*.8;
      if(p.timer<=0){if(p.itinerary.length)this.setDestination(p.itinerary.shift());else{p.state='returning';p.intent='return';this.setDestination(PARENT_HOME);this.say('脚步开始远去。等它真正离开，再继续。','good');}}
    }else if(distance(p,PARENT_HOME)<.12){p.state='sleep';p.phase='rest';p.heading=0;p.a=12;p.recognition=0;this.visits++;this.nextVisit=this.level===2?this.time+45:Infinity;this.say('卧室重新传来鼾声。','good');}
    else{p.phase='scan';p.timer-=dt;if(p.timer<=0)this.setDestination(PARENT_HOME);}
  }
  tick(dt,input={}){
    if(!this.active||this.status!=='playing')return;
    const realDt=Math.min(dt,.06),cinematic=['catch','reaction'].includes(this.mode?.type);this.realTime+=realDt;dt=realDt*(cinematic?SLOW_FACTOR:1);this.time+=dt;this.moveCooldown=Math.max(0,this.moveCooldown-dt);this.noiseAge+=dt;this.quiet+=dt;this.toastLeft-=dt;
    if(this.stepTransit){const s=this.stepTransit;s.elapsed+=dt;const t=clamp(s.elapsed/.25,0,1),u=t*t*(3-2*t);this.player.x=s.from.x+(s.target.x-s.from.x)*u;this.player.z=s.from.z+(s.target.z-s.from.z)*u;if(t===1){this.stepTransit=null;this.checkSpatialEvents();}}
    if(!cinematic)this.pointer=.5+.48*Math.sin(this.time*3.8);const p=this.parent;
    if(this.quiet>3)p.a=Math.max(0,p.a-dt*2.1);if(this.mode?.type!=='tickle')p.tickleHeat=Math.max(0,(p.tickleHeat||0)-dt*.025);
    if(p.state==='sleep'&&p.a>=30){p.state='alert';this.say('鼾声停了。父母翻了个身，先别急。','warning');this.emit('bed',35,PARENT_BED.x,PARENT_BED.z);}
    if(p.state==='alert'&&p.a<20){p.state='sleep';this.say('鼾声重新响起，房间慢慢安静下来。','good');}
    if((p.state==='sleep'||p.state==='alert')&&(p.a>=60||this.time>=this.nextVisit)){this.beginWarning();this.nextVisit=Infinity;}
    if(p.state==='sleep'&&this.time-this.lastSnore>6){this.lastSnore=this.time;this.emit('snore',25,PARENT_BED.x,PARENT_BED.z);}
    if(p.state==='warning'){p.timer-=dt;if(p.timer<=0){p.state='checking';this.setDestination(p.itinerary.shift()||this.inspectionTarget);this.say('咔哒。脚步从父母房间出来了。','warning');}}
    if(p.state==='checking'||p.state==='returning'){
      this.patrol(dt);
      if(!cinematic&&this.visible()){
        if(p.recognition===0){this.metrics.exposures++;this.say('灯光停在你身上——赶快离开视线！','danger');this.emit('notice',60);}
        p.recognition+=dt;
        if(p.recognition>=RECOGNITION_TIME){this.status='lost';this.mode=null;this.say('父母看清了你。先看看刚才的线索，再试一次。','danger');this.emit('lose',50);}
      }else if(!cinematic)p.recognition=0;
    }
    this.tickNightTools(dt,input,cinematic);
    tickCat(this,dt);
    const m=this.mode;if(m){m.elapsed+=cinematic?realDt:dt;
      if(m.type==='tickle')tickTickle(this,m,input,dt);
      if(m.type==='door'){
        const d=m.door,drive=m.drive??={...restingDoor(),direction:d.direction||1},before=d.progress,clock=drive.noiseClock,energy=drive.noiseEnergy;
        advanceDoor(d,drive,input,dt,this.level);drive.blocked=false;
        if(d.progress!==before&&(doorSweepHits(d,before,d.progress,this.player,.20)||(['checking','returning'].includes(p.state)&&doorSweepHits(d,before,d.progress,p,.24)))){d.progress=before;d.open=before===1;drive.blocked=true;drive.moving=false;drive.rate=0;drive.speed=0;drive.impact=0;drive.roughness=0;drive.noiseClock=clock;drive.noiseEnergy=energy;}
        if(drive.moving){this.metrics.doorSeconds+=dt;this.metrics.quietDoorSeconds+=dt*(1-clamp((drive.roughness-.14)/.86,0,1));
          if(drive.noiseClock>=.75){this.makeNoise(drive.noiseEnergy/drive.noiseClock,'门轴发出了一阵咯吱声。','hingeMotion',d);drive.noiseClock=0;drive.noiseEnergy=0;}
        }
        if(drive.moving&&(drive.direction===-1?d.progress<=0:d.progress>=1)){
          d.open=d.progress===1;this.mode=null;
          if(drive.impact>0)this.makeNoise(24+drive.impact*38,d.open?'砰！门推到底，撞上了门挡。':'砰！门板撞上了门框。','doorBump',d);
          else{this.say(d.open?'门开了。停一拍，听听有没有回应。':'门轻轻合上了。听听门外的动静。','good');this.emit('latch',12,d.x,d.z);}
        }
      }
      if(m.type==='lockpick'){
        const result=advanceLock(m.mechanism,input,dt);
        if(result.click)this.emit('lockPin',6,m.spot.x,m.spot.z);
        if(result.noise)this.makeNoise(19,'锁里的金属刮响了。先收力听听屋里。','lockScrape',m.spot);
        if(result.done){if(!this.night.unlocked.includes(m.spot.id))this.night.unlocked.push(m.spot.id);this.emit('latch',10,m.spot.x,m.spot.z);this.mode={type:'search',spot:m.spot,elapsed:0};this.say('锁芯转开了。轻轻翻找……','good');}
      }
      if(m.type==='search'&&m.elapsed>=(m.nextSound||0)){m.nextSound=m.elapsed+1.2;this.emit('search',8);}
      if(m.type==='search'&&m.elapsed>=2.2&&!this.incidentUsed[m.spot.id]&&INCIDENTS[m.spot.id]){
        const id=m.spot.id;this.incidentUsed[id]=true;if(incidentRoll(this.seed,id)<INCIDENTS[id].chance){this.beginIncident(id,{spotIndex:this.spots.indexOf(m.spot),elapsed:m.elapsed,nextSound:m.nextSound});return;}
      }
      if(m.type==='search'&&m.elapsed>=6){m.spot.searched=true;this.mode=null;if(m.spot.device){this.hasDevice=true;this.night.phone={state:'warning',timer:6,hold:0,armed:false,rings:0,lastCue:-1};this.say('找到了！屏幕亮了，有来电预兆。停下，按住 E 1.2 秒静音。','good');this.emit('found',45);}else this.say('这里没有设备，换个藏点看看。','info');}
      if(m.type==='catch'){
        m.remaining=Math.max(0,(m.rescue?RESCUE_DURATION:CATCH_DURATION)-m.elapsed);
        if(m.rescue){const result=advanceRescue(m.rescue,input,realDt,m.elapsed);if(result.contact)this.emit('catchTouch',4);if(result.contact||result.contacts)this.events.push({type:'haptic',kind:'contact',material:m.rescue.kind,count:result.contacts||1});if(result.clink)this.makeNoise(16,'盒盖叮了一声，左手轻轻压住它。','metalDrop',m.noiseSource);if(result.done)this.resolveIncident(result.success,result);}
        else this.pointer=clamp((m.elapsed-CATCH_INTRO)/CATCH_SWEEP,0,1);
        if(this.mode===m&&m.remaining<=0)this.resolveIncident(false);
      }
      if(m.type==='reaction'&&m.pendingImpact&&m.elapsed>=m.pendingImpact.at){const impact=m.pendingImpact;m.pendingImpact=null;this.makeNoise(impact.noise,impact.message,impact.sound,m.noiseSource||this.player);}
      if(m.type==='reaction'&&m.elapsed>=(m.rescue?REACTION_DURATION:.7)){const r=m.resume;this.mode=r?{type:'search',spot:this.spots[r.spotIndex],elapsed:r.elapsed,nextSound:r.nextSound}:null;if(r)this.say('继续轻轻翻找……Esc 可以停下。','hint');}
    }
  }
  serialize(){
    const fields=['cat','night','metrics','seed','incidentUsed','incidentOutcomes','realTime','level','player','parent','hidden','hasDevice','time','noise','noiseAt','noiseAge','quiet','toast','toastLeft','history','vase','visits','pointer','lastSnore','lastFoot','inspectionTarget','safeSteps','walked','footTile','stepTransit','status'];
    const data=Object.fromEntries(fields.map(k=>[k,structuredClone(this[k])]));
    data.nextVisit=Number.isFinite(this.nextVisit)?this.nextVisit:null;
    data.doors=this.doors.map(d=>({open:d.open,progress:d.progress,direction:d.direction||1}));data.searched=this.spots.map(s=>s.searched);
    data.mode=this.mode?{catCause:this.mode.catCause,rescue:this.mode.rescue?structuredClone(this.mode.rescue):undefined,resultText:this.mode.resultText,strokes:this.mode.strokes,puzzleId:this.mode.puzzleId,sourceElapsed:this.mode.sourceElapsed,pendingImpact:this.mode.pendingImpact?structuredClone(this.mode.pendingImpact):null,noiseSource:this.mode.noiseSource,type:this.mode.type,incidentId:this.mode.incidentId,resume:this.mode.resume,success:this.mode.success,elapsed:this.mode.elapsed,remaining:this.mode.remaining,target:this.mode.target,tile:this.mode.tile,continuous:this.mode.continuous,doorIndex:this.doors.indexOf(this.mode.door),spotIndex:this.spots.indexOf(this.mode.spot)}:null;
    return data;
  }
  restore(data){
    if(!data||!Number.isInteger(data.level)||!PRESETS[data.level]||!Number.isFinite(data.player?.x)||!Number.isFinite(data.player?.z)||!Number.isFinite(data.time)||data.time<0||!Array.isArray(data.doors)||!data.parent||!Array.isArray(data.parent.route)||!Number.isFinite(data.parent.x)||!Number.isFinite(data.parent.z)||!Number.isFinite(data.parent.a))return false;
    this.reset(data.level);
    const allowed=['metrics','seed','incidentUsed','incidentOutcomes','realTime','player','parent','hidden','hasDevice','time','noise','noiseAt','noiseAge','quiet','toast','toastLeft','history','vase','visits','pointer','lastSnore','lastFoot','inspectionTarget','safeSteps','walked','footTile','stepTransit'];
    for(const k of allowed)if(data[k]!==undefined)this[k]=structuredClone(data[k]);
    if(data.night){
      const n=data.night;
      for(const id of LOCKS[this.level])if(n.locks?.[id])this.night.locks[id]=restoreLock(this.level,this.seed,id,n.locks[id]);
      this.night.unlocked=Array.isArray(n.unlocked)?[...new Set(n.unlocked.filter(id=>LOCKS[this.level].includes(id)))]:[];
      this.night.clues=Array.isArray(n.clues)?[...new Set(n.clues.filter(id=>CLUES.some(c=>c.id===id)))]:[];
      for(const l of LURES){const s=n.lures?.[l.id];if(s&&Number.isFinite(s.timer)&&Number.isInteger(s.pulses)&&s.pulses>=0&&s.pulses<=4)this.night.lures[l.id]={timer:clamp(s.timer,0,2.5),pulses:s.pulses,done:Boolean(s.done)||s.pulses===4};}
      this.night.maskedSteps=Number.isInteger(n.maskedSteps)&&n.maskedSteps>=0?n.maskedSteps:0;
      if(Number.isFinite(n.lastWasher))this.night.lastWasher=n.lastWasher;
      const p=n.phone;if(p&&['idle','warning','ringing','silenced','missed'].includes(p.state)&&Number.isFinite(p.timer))this.night.phone={...this.night.phone,state:p.state,timer:clamp(p.timer,0,6),rings:clamp(Number(p.rings)||0,0,3)};
      else if(data.hasDevice)this.night.phone.state='silenced';
    }else if(data.hasDevice)this.night.phone.state='silenced';
    if(!data.metrics){this.metrics.partial=data.time>0;this.realTime=data.time;}
    this.nextVisit=data.nextVisit===null?Infinity:data.nextVisit;this.doors.forEach((d,i)=>Object.assign(d,data.doors[i]||{}));this.spots.forEach((s,i)=>s.searched=Boolean(data.searched?.[i]));
    if(!this.canOccupy(this.player.x,this.player.z)){this.reset(data.level);return false;}
    if(data.mode){this.mode={...data.mode};if(this.mode.type==='catch'&&!this.mode.incidentId){this.mode.incidentId='vase';this.mode.elapsed=0;this.mode.remaining=CATCH_DURATION;this.metrics.incidents++;}if(this.mode.type==='door')this.mode.door=this.doors[this.mode.doorIndex];if(this.mode.type==='search')this.mode.spot=this.spots[this.mode.spotIndex];if(this.mode.type==='door'&&!this.mode.door||this.mode.type==='search'&&!this.mode.spot)this.mode=null;}
    if(this.mode?.type==='puzzle'){const id=this.mode.puzzleId?.startsWith('lock:')?this.mode.puzzleId.slice(5):null;const spot=this.spots.find(s=>s.id===id);this.mode=null;if(spot&&locked(this,id))this.beginLock(spot);}
    else if(this.mode?.type==='lockpick'){const spot=this.spots[data.mode.spotIndex];this.mode=null;if(spot&&locked(this,spot.id))this.beginLock(spot);}

    if(this.mode?.type==='door')this.mode.drive={...restingDoor(),direction:this.mode.door.direction||1};
    if(this.mode?.rescue)Object.assign(this.mode.rescue,{left:0,right:0,release:0,grace:.65});
    if(this.mode?.type==='tickle'){if(!['sleep','alert'].includes(this.parent.state))this.mode=null;else Object.assign(this.mode,{pressure:0,moving:false,stroke:0});}
    this.cat=restoreCat(this,data.cat);
    this.status='playing';this.active=false;this.velocity={x:0,z:0};return true;
  }
}
