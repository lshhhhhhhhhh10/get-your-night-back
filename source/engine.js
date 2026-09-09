export const PRESETS = [
  {name:'第一声吱呀',subtitle:'从客厅找到书房',description:'穿过客厅，探索东侧书房。两个藏点，先把动作和声音联系起来。',width:.42,doorBand:[.25,.78],nightVisit:false,spots:[[3,2,'客厅矮柜'],[16,2,'书房抽屉']],creaks:[[3,9],[15,3]],device:1},
  {name:'今晚走哪边',subtitle:'近路，未必安静',description:'书房、餐厅和储物间开放，五个藏点。走旧门近路，还是绕过松动地板？',width:.30,doorBand:[.34,.70],nightVisit:false,spots:[[2,2,'窗边矮柜'],[16,2,'书房抽屉'],[21,3,'餐边柜'],[21,11,'储物柜'],[12,17,'洗衣间抽屉']],creaks:[[3,9],[3,7],[3,5],[4,3],[10,3],[15,3],[16,10],[20,12]],device:3},
  {name:'脚步近了',subtitle:'边探索，边听动静',description:'更大的住宅里父母会起夜巡视。蹲行绕过视线，听脚步判断何时搜索。',width:.30,doorBand:[.34,.70],nightVisit:true,spots:[[2,2,'窗边矮柜'],[16,2,'书房抽屉'],[21,3,'餐边柜'],[21,11,'储物柜'],[12,17,'洗衣间抽屉']],creaks:[[3,9],[3,5],[4,3],[10,3],[15,3],[16,10],[20,12]],device:4}
];
export const MAP_DEPTH=19;
export const mapWidth=level=>level===0?19:24;
export const RECOGNITION_TIME=.25;
export const MINIMAP_RADIUS=4;
export const HOME={x:3,z:12};
export const COVERS=[{x:2,z:7,name:'高背扶手椅'},{x:12,z:8,name:'高柜'},{x:2,z:3,name:'沙发'},{x:12,z:4,name:'书柜'},{x:15,z:5,name:'书柜'},{x:17,z:9,name:'高柜'},{x:20,z:5,name:'高背扶手椅'},{x:20,z:10,name:'高柜'},{x:16,z:16,name:'高柜'},{x:11,z:16,name:'高柜'}];
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
  if(z===10 && x!==3 && x!==11)return true;
  if(x===7&&z>=11)return true;
  if((z===4||z===8)&&x>=5&&x<=9 && !(z===8&&x===7))return true;
  if((x===5||x===9)&&z>=4&&z<=8)return true;
  if(z===6&&x>=10&&x!==11)return true;
  return false;
}
export function solid(x,z,level=0){return wall(x,z,level)||COVERS.some(c=>c.x===x&&c.z===z);}
export function playerBlocked(x,z,level=0){
  if(solid(x,z,level))return true;
  const props=[[1,11],[2,11],[1,12],[2,12],[1,13],[2,13],[7,5],[7,6],[5,2],[6,2],[1,1],[8,1],[4,1],[5,13],[9,3],[16,5],[16,12],[20,1],[21,1],[22,1],[21,5],[22,5],[12,15],[13,15],[21,16]];
  return props.some(([a,b])=>x===a&&z===b)||PRESETS[level].spots.some(([a,b])=>x===a&&z===b);
}
export function occluded(a,b,level,doors=[],lowCoverBlocks=true){
  const len=distance(a,b),steps=Math.ceil(len*12);
  for(let i=1;i<steps;i++){
    const t=i/steps,x=Math.round(a.x+(b.x-a.x)*t),z=Math.round(a.z+(b.z-a.z)*t);
    const furniture=COVERS.some(c=>c.x===x&&c.z===z&&(lowCoverBlocks||c.name==='高柜'||c.name==='书柜'));
    if(wall(x,z,level)||furniture||doors.some(d=>!d.open&&d.x===x&&d.z===z))return true;
  }return false;
}
export class Game{
  constructor(level=0){this.reset(level);}
  reset(level=0){
    this.level=level;this.preset=PRESETS[level];this.player={...HOME,heading:Math.PI};
    this.parent={x:7,z:6,heading:0,state:'sleep',a:0,recognition:0,route:[],timer:0};
    this.doors=[{x:3,z:10,name:'卧室门',open:false,progress:0,band:this.preset.doorBand},{x:11,z:6,name:'旧木门',open:false,progress:0,band:[.42,.63]}];
    this.spots=this.preset.spots.map(([x,z,name],i)=>({x,z,name,searched:false,device:i===this.preset.device}));
    this.active=false;this.status='ready';this.mode=null;this.hidden=false;this.hasDevice=false;this.time=0;this.moveCooldown=0;this.noise=0;this.noiseAt={...HOME};this.noiseAge=100;this.quiet=0;this.events=[];this.toast='';this.toastLeft=0;this.history=[];this.vase='stable';this.nextVisit=level===2?32:Infinity;this.visits=0;this.speed=.5;this.pointer=.5;this.lastSnore=-9;this.lastFoot=0;this.lastDoorSound=0;this.lastSeen=0;this.aim=null;this.inspectionTarget={x:3,z:9};this.safeSteps=0;
    this.velocity={x:0,z:0};this.walked=0;this.footTile=`${HOME.x},${HOME.z}`;this.stepTransit=null;
  }
  start(){this.status='playing';this.active=true;this.say('先沿地板走到卧室门前。靠近后按 E。','hint');}
  say(text,type='info'){this.toast=text;this.toastLeft=5;this.events.push({type,text,time:this.time});if(type!=='snore'&&type!=='hint'){this.history.push({text,time:this.time});if(this.history.length>12)this.history.shift();}}
  emit(kind,strength=0,x=this.player.x,z=this.player.z){this.events.push({type:'sound',kind,strength,x,z});}
  makeNoise(amount,label,kind){
    this.noise=amount;this.noiseAt={...this.player};this.noiseAge=0;this.quiet=0;
    // 墙和距离影响父母实际听到的声响；声响本身从不直接判负。
    const dist=distance(this.player,this.parent),attenuation=occluded(this.player,this.parent,this.level,this.doors)?.50:1;
    const heard=amount*attenuation/(1+dist*.07);
    this.parent.a=clamp(this.parent.a+heard,0,100);if(heard>=3)this.inspectionTarget={x:this.player.x,z:this.player.z};
    if(amount>10)this.say(label,'noise');this.emit(kind||(amount>15?'creak':'step'),amount);
  }
  doorNear(){return this.doors.find(d=>!d.open&&distance(d,this.player)<1.2);}
  coverNear(){return COVERS.find(c=>distance(c,this.player)<1.5);}
  spotNear(){return this.spots.find(s=>distance(s,this.player)<1.2&&!s.searched);}
  canOccupy(x,z){
    const radius=.20;
    for(let iz=Math.floor(z-1);iz<=Math.ceil(z+1);iz++)for(let ix=Math.floor(x-1);ix<=Math.ceil(x+1);ix++){
      const closedDoor=this.doors.some(d=>!d.open&&d.x===ix&&d.z===iz);
      if(!playerBlocked(ix,iz,this.level)&&!closedDoor)continue;
      // 圆形身体与墙体碰撞，分轴滑动；不靠每格停顿防止穿墙。
      const nx=clamp(x,ix-.49,ix+.49),nz=clamp(z,iz-.49,iz+.49);
      if(Math.hypot(x-nx,z-nz)<radius)return false;
    }return true;
  }
  move(dx,dz,dt=1/60){
    if(!this.active||this.status!=='playing'||this.mode||this.stepTransit){this.velocity={x:0,z:0};return false;}
    dt=clamp(dt,0,.06);const mag=Math.hypot(dx,dz),speed=this.hidden?1.05:2.05,k=1-Math.exp(-(mag?24:36)*dt);
    this.velocity.x+=((mag?dx/mag*speed:0)-this.velocity.x)*k;
    this.velocity.z+=((mag?dz/mag*speed:0)-this.velocity.z)*k;
    if(Math.hypot(this.velocity.x,this.velocity.z)<.005){this.velocity={x:0,z:0};return false;}
    const p={x:this.player.x,z:this.player.z};
    if(this.canOccupy(p.x+this.velocity.x*dt,p.z))p.x+=this.velocity.x*dt;else this.velocity.x=0;
    if(this.canOccupy(p.x,p.z+this.velocity.z*dt))p.z+=this.velocity.z*dt;else this.velocity.z=0;
    const tile=`${Math.round(p.x)},${Math.round(p.z)}`;
    if(tile!==this.footTile&&this.preset.creaks.some(([x,z])=>x===Math.round(p.x)&&z===Math.round(p.z))){
      const length=Math.hypot(dx,dz)||1,target={x:p.x+dx/length*.34,z:p.z+dz/length*.34};
      if(!this.canOccupy(target.x,target.z)){target.x=p.x;target.z=p.z;}
      this.mode={type:'step',target,tile,elapsed:0,continuous:true};this.velocity={x:0,z:0};
      this.emit('floorPressure',3);this.say('脚下是松动木板。亮区内按空格，轻轻落下；Esc 可以退开。','hint');return false;
    }
    const traveled=distance(p,this.player);this.player.x=p.x;this.player.z=p.z;this.footTile=tile;this.walked+=traveled;
    if(traveled>.00001)this.player.heading=Math.atan2(dx||this.velocity.x,dz||this.velocity.z);
    if(this.walked>=.72){this.walked%=.72;this.makeNoise(this.hidden?1:3,'轻轻落脚。',this.hidden?'crouchStep':this.player.x>18&&this.player.z<7?'tileStep':'step');}
    this.checkSpatialEvents();return traveled>0;
  }
  land(p,noise){this.player.x=p.x;this.player.z=p.z;this.footTile=`${Math.round(p.x)},${Math.round(p.z)}`;this.makeNoise(noise,noise>12?'吱呀——这块木板响了。':'轻轻落脚。');this.checkSpatialEvents();}
  checkSpatialEvents(){
    if(this.level===2&&this.vase==='stable'&&distance(this.player,{x:9,z:2.8})<1.35){this.vase='wobbling';this.mode={type:'catch',elapsed:0,remaining:4.5};this.say('袖子擦到花瓶了！亮区内按空格接住，或按 Esc 放弃。','warning');this.emit('wobble',35);}
    this.checkWin();
  }
  action(){
    if(!this.active||this.status!=='playing')return;
    if(this.mode)return;
    const d=this.doorNear();if(d){this.mode={type:'door',door:d,elapsed:0};this.speed=.5;this.say('按住 E 推门；滚轮、左右键或滑块调整速度。听门轴的声音。','hint');return;}
    const s=this.spotNear();if(s){this.mode={type:'search',spot:s,elapsed:0};this.say('轻轻翻找……有动静时按 Esc 立即停下。','hint');return;}
    this.say(this.hasDevice?'设备拿到了，返回发暖光的卧室。':'靠近门或房间里的柜子，再按 E。','hint');
  }
  pressSpace(){
    if(!this.active||!this.mode)return;
    const m=this.mode;if(m.type!=='step'&&m.type!=='catch')return;
    const success=Math.abs(this.pointer-.5)<=this.preset.width/2;
    if(m.type==='step'){
      this.mode=null;
      if(m.continuous){this.stepTransit={from:{x:this.player.x,z:this.player.z},target:m.target,elapsed:0};this.footTile=m.tile;this.makeNoise(success?5:50,success?'木板轻轻吱了一声。':'吱呀——这块木板响了。',success?'floorSoft':'floorCreak');}
      else{this.player.x=m.target.x;this.player.z=m.target.z;this.footTile=`${Math.round(m.target.x)},${Math.round(m.target.z)}`;this.makeNoise(success?5:50,success?'木板轻轻吱了一声。':'吱呀——这块木板响了。',success?'floorSoft':'floorCreak');this.checkSpatialEvents();}
      if(success){this.safeSteps++;this.say('稳稳落下。再听听卧室里有没有变化。','good');}
    }else{this.vase=success?'caught':'fallen';this.mode=null;if(success){this.say('接住了。花瓶还好，你也是。','good');this.emit('catch',15);}else{this.makeNoise(90,'哐当！花瓶落地。先找掩体，仍有机会。');this.emit('crash',80);}}
  }
  hide(){if(!this.active||this.mode)return;this.hidden=!this.hidden;this.say(this.hidden?'蹲低了。可以慢慢移动；身体要藏在家具后，才挡得住视线。':'站起来了。脚步会更快，也更响。','hint');this.emit('cloth',8);}
  cancel(){if(this.mode?.type==='catch'){this.vase='fallen';this.makeNoise(90,'哐当！花瓶落地，快找掩体。');this.emit('crash',80);}this.mode=null;}
  checkWin(){if(this.hasDevice&&this.player.z>=11&&this.player.x<=6&&this.status==='playing'){this.status='won';this.mode=null;this.say('安全回到卧室。今晚的时间，拿回来了。','good');this.emit('win',50);}}
  visible(){const d=distance(this.player,this.parent);if(d>5.2||occluded(this.player,this.parent,this.level,this.doors,this.hidden))return false;
    const bearing=Math.atan2(this.player.x-this.parent.x,this.player.z-this.parent.z),diff=Math.atan2(Math.sin(bearing-this.parent.heading),Math.cos(bearing-this.parent.heading));
    return d<1.2||Math.abs(diff)<.85;
  }
  pathTo(target){
    let end={x:Math.round(target.x),z:Math.round(target.z)},start={x:Math.round(this.parent.x),z:Math.round(this.parent.z)};
    const key=p=>`${p.x},${p.z}`,queue=[start],prev=new Map([[key(start),null]]);let found=null;
    while(queue.length){const p=queue.shift();if(distance(p,end)<1.1){found=p;break;}for(const [dx,dz]of[[0,1],[1,0],[-1,0],[0,-1]]){const n={x:p.x+dx,z:p.z+dz},k=key(n);if(prev.has(k)||playerBlocked(n.x,n.z,this.level)||this.doors.some(d=>!d.open&&d.x===n.x&&d.z===n.z))continue;prev.set(k,p);queue.push(n);}}
    if(!found)return[];const path=[];for(let p=found;prev.get(key(p));p=prev.get(key(p)))path.unshift(p);return path;
  }
  beginWarning(){if(this.parent.state==='sleep'||this.parent.state==='alert'){if(this.level===2&&this.parent.a<60){const route=[{x:16,z:3},{x:21,z:12},{x:11,z:16}];this.inspectionTarget=route[this.visits%route.length];}this.parent.state='warning';this.parent.timer=5;this.say('床板响了……父母翻身，准备起床。还有时间停下或躲藏。','warning');this.emit('bed',55,7,6);}}
  tick(dt,input={}){
    if(!this.active||this.status!=='playing')return;
    dt=Math.min(dt,.06);this.time+=dt;this.moveCooldown=Math.max(0,this.moveCooldown-dt);this.noiseAge+=dt;this.quiet+=dt;this.toastLeft-=dt;
    if(this.stepTransit){const s=this.stepTransit;s.elapsed+=dt;const t=clamp(s.elapsed/.25,0,1),u=t*t*(3-2*t);this.player.x=s.from.x+(s.target.x-s.from.x)*u;this.player.z=s.from.z+(s.target.z-s.from.z)*u;if(t===1){this.stepTransit=null;this.checkSpatialEvents();}}
    this.pointer=.5+.48*Math.sin(this.time*3.8);const p=this.parent;
    if(this.quiet>3)p.a=Math.max(0,p.a-dt*2.1);
    if(p.state==='sleep'&&p.a>=30){p.state='alert';this.say('鼾声停了。父母翻了个身，先别急。','warning');this.emit('bed',35,7,6);}
    if(p.state==='alert'&&p.a<20){p.state='sleep';this.say('鼾声重新响起，房间慢慢安静下来。','good');}
    if((p.state==='sleep'||p.state==='alert')&&(p.a>=60||this.time>=this.nextVisit)){this.beginWarning();this.nextVisit=Infinity;}
    if(p.state==='sleep'&&this.time-this.lastSnore>4.4){this.lastSnore=this.time;this.emit('snore',25,7,6);}
    if(p.state==='warning'){p.timer-=dt;if(p.timer<=0){p.state='checking';p.route=this.pathTo(this.inspectionTarget);p.timer=8;this.say('咔哒。脚步从父母房间出来了。','warning');}}
    if(p.state==='checking'||p.state==='returning'){
      if(p.route.length){const dest=p.route[0],dx=dest.x-p.x,dz=dest.z-p.z,d=Math.hypot(dx,dz);p.heading=Math.atan2(dx,dz);const speed=p.state==='returning'?1.15:.95;if(d<speed*dt){p.x=dest.x;p.z=dest.z;p.route.shift();}else{p.x+=dx/d*speed*dt;p.z+=dz/d*speed*dt;}
        if(this.time-this.lastFoot>.7){this.lastFoot=this.time;this.emit('parentStep',40,p.x,p.z);}}
      else if(p.state==='checking'){p.timer-=dt;p.heading+=dt*.55;if(p.timer<=0){p.state='returning';p.route=this.pathTo({x:7,z:5});this.say('脚步开始远去。等它真正离开，再继续。','good');}}
      else{p.state='sleep';p.x=7;p.z=6;p.heading=0;p.a=12;this.visits++;this.nextVisit=this.level===2?this.time+45:Infinity;this.say('卧室重新传来鼾声。','good');}
      if(this.visible()){
        if(p.recognition===0){this.say('灯光停在你身上——赶快离开视线！','danger');this.emit('notice',60);}
        p.recognition+=dt;
        if(p.recognition>=RECOGNITION_TIME){this.status='lost';this.mode=null;this.say('父母看清了你。先看看刚才的线索，再试一次。','danger');this.emit('lose',50);}
      }else p.recognition=0;
    }
    const m=this.mode;if(m){m.elapsed+=dt;
      if(m.type==='door'&&input.e){
        const d=m.door,s=this.speed,good=s>=d.band[0]&&s<=d.band[1];d.progress=clamp(d.progress+dt*(.10+s*.15),0,1);
        if(this.time-this.lastDoorSound>.85){this.lastDoorSound=this.time;this.makeNoise(good?4:s<d.band[0]?20:29,good?'门轴轻轻转动。':s<d.band[0]?'吱——推得太慢，门轴持续摩擦。':'咚！太快了，门撞到了边框。',good?'doorSoft':s<d.band[0]?'doorCreak':'doorBump');}
        if(d.progress>=1){d.open=true;this.mode=null;this.say('门开了。停一拍，听听有没有回应。','good');this.emit('latch',12);}
      }
      if(m.type==='search'&&m.elapsed>=(m.nextSound||0)){m.nextSound=m.elapsed+1.2;this.emit('search',8);}
      if(m.type==='search'&&m.elapsed>=6){m.spot.searched=true;this.mode=null;if(m.spot.device){this.hasDevice=true;this.say('找到了！带着设备回卧室，才算成功。','good');this.emit('found',45);}else this.say('这里没有设备，换个藏点看看。','info');}
      if(m.type==='catch'){m.remaining-=dt;if(m.remaining<=0)this.cancel();}
    }
  }
  serialize(){
    const fields=['level','player','parent','hidden','hasDevice','time','noise','noiseAt','noiseAge','quiet','toast','toastLeft','history','vase','visits','speed','pointer','lastSnore','lastFoot','lastDoorSound','inspectionTarget','safeSteps','walked','footTile','stepTransit','status'];
    const data=Object.fromEntries(fields.map(k=>[k,structuredClone(this[k])]));
    data.nextVisit=Number.isFinite(this.nextVisit)?this.nextVisit:null;
    data.doors=this.doors.map(d=>({open:d.open,progress:d.progress}));data.searched=this.spots.map(s=>s.searched);
    data.mode=this.mode?{type:this.mode.type,elapsed:this.mode.elapsed,remaining:this.mode.remaining,target:this.mode.target,tile:this.mode.tile,continuous:this.mode.continuous,doorIndex:this.doors.indexOf(this.mode.door),spotIndex:this.spots.indexOf(this.mode.spot)}:null;
    return data;
  }
  restore(data){
    if(!data||!Number.isInteger(data.level)||!PRESETS[data.level]||!Number.isFinite(data.player?.x)||!Number.isFinite(data.player?.z)||!Number.isFinite(data.time)||data.time<0||!Array.isArray(data.doors)||!data.parent||!Array.isArray(data.parent.route)||!Number.isFinite(data.parent.x)||!Number.isFinite(data.parent.z)||!Number.isFinite(data.parent.a))return false;
    this.reset(data.level);
    const allowed=['player','parent','hidden','hasDevice','time','noise','noiseAt','noiseAge','quiet','toast','toastLeft','history','vase','visits','speed','pointer','lastSnore','lastFoot','lastDoorSound','inspectionTarget','safeSteps','walked','footTile','stepTransit'];
    for(const k of allowed)if(data[k]!==undefined)this[k]=structuredClone(data[k]);
    this.nextVisit=data.nextVisit===null?Infinity:data.nextVisit;this.doors.forEach((d,i)=>Object.assign(d,data.doors[i]||{}));this.spots.forEach((s,i)=>s.searched=Boolean(data.searched?.[i]));
    if(!this.canOccupy(this.player.x,this.player.z)){this.reset(data.level);return false;}
    if(data.mode){this.mode={...data.mode};if(this.mode.type==='door')this.mode.door=this.doors[this.mode.doorIndex];if(this.mode.type==='search')this.mode.spot=this.spots[this.mode.spotIndex];if(this.mode.type==='door'&&!this.mode.door||this.mode.type==='search'&&!this.mode.spot)this.mode=null;}
    this.status='playing';this.active=false;this.velocity={x:0,z:0};return true;
  }
}
