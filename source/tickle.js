import {PARENT_BED} from './layout.js';
export const TICKLE_TARGET={x:PARENT_BED.x,z:PARENT_BED.z+.72};
export function tickleNear(game){
  return game.parent.state==='sleep'&&Math.hypot(game.player.x-TICKLE_TARGET.x,game.player.z-TICKLE_TARGET.z)<1.15&&game.catCanSee(game.player,{x:TICKLE_TARGET.x,z:PARENT_BED.z+1.16});
}
export function tickleCaption(mode,parent){
  if(parent.state==='alert')return '鼾声停了，脚缩了回去……现在可以收手。';
  return mode.moving?'脚趾蜷了一下，嘴角忍不住上扬。':'手停在被子边，先听听呼吸。';
}
export function tickTickle(game,mode,input,dt){
  const p=game.parent;
  if(!['sleep','alert'].includes(p.state)){game.mode=null;return;}
  const analog=Number.isFinite(input.ticklePressure),pressure=analog?Math.max(0,Math.min(1,input.ticklePressure)):input.e?.28:0;
  const stroke=analog?Math.min(1,Math.abs(input.tickleStroke||0)):input.e?.6:0;
  mode.pressure=pressure;mode.moving=pressure>.035&&stroke>.08;mode.stroke=stroke;
  if(!mode.moving)return;
  const amount=pressure*(.35+stroke*.75);p.tickleHeat=(p.tickleHeat||0)+amount*dt;mode.strokes=(mode.strokes||0)+stroke*dt;
  if(mode.elapsed-(mode.lastSound||0)>.7){mode.lastSound=mode.elapsed;game.emit('cloth',2,TICKLE_TARGET.x,TICKLE_TARGET.z);}
  if(p.tickleHeat>.3&&mode.elapsed-(mode.lastGiggle||-9)>1.4){mode.lastGiggle=mode.elapsed;game.emit('parentGiggle',8+pressure*16,PARENT_BED.x,PARENT_BED.z);game.quiet=0;}
  if(p.tickleHeat>=.85&&p.state==='sleep'){p.a=Math.max(p.a,32);p.state='alert';game.say('鼾声突然停了，父母缩起脚。再挠可能会醒，松手或 Esc 收手。','warning');game.emit('bed',25,PARENT_BED.x,PARENT_BED.z);}
  if(p.tickleHeat>=1.65){p.a=Math.max(p.a,60);game.inspectionTarget={...game.player};game.beginWarning();game.mode=null;}
}
