// 猫的行为只使用住宅现有的碰撞和寻路；不占据玩家碰撞空间。
export const CAT_HOME={x:3,z:5.5};
export const CAT_VASE={x:9.7,z:2.8};
export const CAT_APPROACH={x:10.5,z:3};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function newCat(){return {...CAT_HOME,heading:0,state:'idle',timer:0,route:[],repath:0,goal:null,still:0,cooldown:0,toy:null,toyCooldown:0,jumpUsed:false,met:false,pets:0,distractions:0,lastVoice:-20};}
export function catNear(game,radius=1.55){const c=game.cat;return !!c&&dist(c,game.player)<radius&&game.catCanSee(c,game.player)&&!['jump'].includes(c.state);}
export function catInteraction(game){if(!catNear(game))return false;const c=game.cat;if(['calm','play'].includes(c.state))return false;return !game.toolNear()&&!game.doorNear()&&!game.spotNear();}
export function petCat(game){
 if(!game.active||game.status!=='playing'||game.mode||!catNear(game))return false;
 const c=game.cat;c.state='calm';c.timer=18;c.route=[];c.goal=null;c.still=0;c.cooldown=24;c.pets++;c.heading=Math.atan2(game.player.x-c.x,game.player.z-c.z);
 game.say('呼噜噜……猫被摸舒服了，会安静待一会儿。','good');game.emit('catPurr',5,c.x,c.z);return true;
}
export function tossCatToy(game,dx,dz){
 if(!game.active||game.status!=='playing'||game.mode||!catNear(game,6)||game.cat.toyCooldown>0)return false;
 const c=game.cat,angle=Math.atan2(dx,dz);let target;
 for(const offset of[0,.65,-.65,1.3,-1.3,Math.PI]){const a=angle+offset,p={x:game.player.x+Math.sin(a)*2.5,z:game.player.z+Math.cos(a)*2.5};if(!game.catCanSee(game.player,p)||!game.canOccupy(p.x,p.z))continue;const route=game.pathTo(p,c,true);if(route.length&&dist(route.at(-1),p)<.45){target=p;c.route=route;break;}}
 if(!target){game.say('前面没有安全落点，转向空地再丢玩具球。','hint');return false;}
 c.toy={...target,age:0,from:{...game.player}};c.toyCooldown=14;c.state='toy';c.timer=16;c.goal=target;c.distractions++;c.cooldown=24;
 game.say('玩具球滚过去了，猫的注意力被引开了。','good');game.emit('catToy',6,target.x,target.z);return true;
}
export function tickCat(game,dt){
 const c=game.cat;if(!game.active||game.status!=='playing'||['catch','reaction'].includes(game.mode?.type))return;
 c.repath=Math.max(0,c.repath-dt);c.cooldown=Math.max(0,c.cooldown-dt);c.toyCooldown=Math.max(0,c.toyCooldown-dt);if(c.toy){c.toy.age+=dt;if(c.toy.age>18)c.toy=null;}
 const d=dist(c,game.player),visible=game.catCanSee(c,game.player),moving=Math.hypot(game.velocity.x,game.velocity.z)>.12;
 const voice=(kind,strength=4)=>{if(game.time-c.lastVoice>5){game.emit(kind,strength,c.x,c.z);c.lastVoice=game.time;}};
 if(c.state==='calm'||c.state==='play'){c.timer-=dt;if(c.timer<=0){c.state='idle';c.still=0;}return;}
 if(c.state==='jump'){
   if(game.mode)return;c.timer+=dt;if(c.timer>=.55){c.state='calm';c.timer=12;c.cooldown=24;c.route=[];
    if(game.vase==='stable'){game.vase='wobbling';game.beginIncident('vase');game.mode.catCause=true;game.mode.noiseSource={...CAT_VASE};game.say('猫扑上桌沿，尾巴扫到了花瓶！对准落点，双手托住。','warning');}}
   return;
 }
 if(['approach','prepare'].includes(c.state)){
  if(game.vase!=='stable'||dist(game.player,CAT_VASE)>5.5){c.state='idle';c.route=[];c.cooldown=15;return;}
  if(c.state==='prepare'){if(game.mode)return;c.timer-=dt;voice('catChirp');if(c.timer<=0){c.state='jump';c.timer=0;c.jumpUsed=true;game.emit('catHop',8,c.x,c.z);}return;}
 }
 if(c.state==='toy'){c.timer-=dt;if(c.timer<=0){c.state='idle';c.route=[];c.cooldown=10;return;}}
 else if(c.state!=='approach'){
  if(!c.jumpUsed&&c.cooldown===0&&game.vase==='stable'&&!game.mode&&visible&&dist(game.player,CAT_VASE)<3.8&&dist(c,CAT_VASE)<3.5){
   c.state='approach';c.goal={...CAT_APPROACH};c.route=game.pathTo(c.goal,c,true);game.say('猫盯上了花瓶，正在找起跳的位置。靠近 E 安抚，或 Q 丢玩具。','warning');voice('catChirp');
  }else if(d<4.5&&visible){
   if(!c.met){c.met=true;game.say('家里的猫发现你了。它会跟随；靠近 E 安抚，Q 丢玩具球引开。','hint');voice('catMeow');}
   if(d<1&&!moving&&!game.mode){c.still+=dt;if(c.still>.7){c.state='rub';c.route=[];voice('catPurr');return;}}
   else c.still=0;
   c.state='follow';if(d<.85){c.route=[];return;}
   if(c.repath===0&&(!c.goal||dist(c.goal,game.player)>.7||!c.route.length)){c.goal={x:game.player.x,z:game.player.z};c.route=game.pathTo(c.goal,c,true);c.repath=1.2;}
  }else{c.state='idle';c.route=[];c.still=0;return;}
 }
 const next=c.route[0];if(next){const n=dist(c,next),speed=c.state==='toy'?2.1:c.state==='approach'?1.1:1.45,step=Math.min(n,speed*dt);if(n){const p={x:c.x+(next.x-c.x)/n*step,z:c.z+(next.z-c.z)/n*step};if(!game.canOccupy(p.x,p.z)){c.route=[];c.repath=0;return;}c.heading=Math.atan2(next.x-c.x,next.z-c.z);c.x=p.x;c.z=p.z;}if(n<=step+.001)c.route.shift();}
 if(!c.route.length){if(c.state==='toy'&&c.toy&&dist(c,c.toy)<.55){c.state='play';c.timer=12;voice('catPurr');}else if(c.state==='approach'&&dist(c,CAT_APPROACH)<.35){c.state='prepare';c.timer=3.5;c.heading=Math.atan2(CAT_VASE.x-c.x,CAT_VASE.z-c.z);game.say('猫压低了身子——要扑花瓶了！E 安抚，Q 丢玩具，或退开。','warning');}}
}
export function restoreCat(game,data){
 const c=newCat();if(!data||!Number.isFinite(data.x)||!Number.isFinite(data.z)||!game.canOccupy(data.x,data.z))return c;
 for(const k of['x','z','heading','timer','still','cooldown','toyCooldown','pets','distractions','lastVoice'])if(Number.isFinite(data[k]))c[k]=data[k];
 if(['idle','follow','rub','calm','toy','play','approach','prepare','jump'].includes(data.state))c.state=data.state;
 c.met=!!data.met;c.jumpUsed=!!data.jumpUsed;
 if(data.toy&&Number.isFinite(data.toy.x)&&Number.isFinite(data.toy.z)&&game.canOccupy(data.toy.x,data.toy.z))c.toy={x:data.toy.x,z:data.toy.z,age:Number.isFinite(data.toy.age)?data.toy.age:1,from:{x:c.x,z:c.z}};
 if(['toy','approach'].includes(c.state)){c.goal=c.state==='toy'?c.toy:{...CAT_APPROACH};if(c.goal)c.route=game.pathTo(c.goal,c,true);else c.state='idle';}
 return c;
}
