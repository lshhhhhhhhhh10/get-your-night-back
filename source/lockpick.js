// Stylised game mechanism. Heights and forces are animation units, not a real lock specification.
export const LOCKS=[['study-search'],['storage-search','kitchen-search'],['laundry-search','storage-search']];
export const locked=(g,id)=>LOCKS[g.level].includes(id)&&!g.night.unlocked?.includes(id);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function newLock(level,seed=0,id=''){
  let hash=seed>>>0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
  const pins=Array.from({length:level===0?3:4},(_,i)=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return {target:.35+(hash/4294967296)*.39,lift:0,seated:false,spool:level>0&&i%2===1,cleared:false};});
  return {level,pins,selected:0,pressure:0,velocity:0,held:false,armed:false,nav:0,stress:0,cooldown:0,turn:0,feedback:'lift',flash:0};
}
export function releaseLock(lock){if(!lock)return;Object.assign(lock,{pressure:0,velocity:0,held:false,armed:false,nav:0,stress:0});}
export function restoreLock(level,seed,id,saved){
  const l=newLock(level,seed,id);
  if(saved?.pins?.length===l.pins.length){l.pins.forEach((p,i)=>{const q=saved.pins[i];p.seated=q?.seated===true;p.lift=p.seated?p.target:clamp(Number(q?.lift)||0);p.cleared=q?.cleared===true;});l.selected=clamp(Math.floor(Number(saved.selected)||0),0,l.pins.length-1);l.turn=clamp(Number(saved.turn)||0);}
  releaseLock(l);return l;
}
export function advanceLock(l,input,dt){
  dt=clamp(dt,0,.06);l.cooldown=Math.max(0,l.cooldown-dt);l.flash=Math.max(0,l.flash-dt);
  if(l.pins.every(p=>p.seated)){l.turn=Math.min(1,l.turn+dt/1.05);l.feedback='open';return {done:l.turn===1};}
  const pressure=clamp(Number(input.lockPressure)||0),held=pressure>.06;
  // Entry, pause, device changes and resume all require neutral input. Never set a pin by pausing.
  if(!l.armed){if(!held)l.armed=true;l.pressure=0;return {};}
  const nav=Math.abs(input.lockNav||0)>.45?Math.sign(input.lockNav):0;
  if(!held&&!l.held){let n=l.selected;if(Number.isInteger(input.lockSelect))n=clamp(input.lockSelect,0,l.pins.length-1);else if(nav&&nav!==l.nav)n=(n+nav+l.pins.length)%l.pins.length;if(n!==l.selected){l.pins[l.selected].lift=l.pins[l.selected].seated?l.pins[l.selected].target:0;l.selected=n;l.velocity=0;l.feedback='lift';}}
  l.nav=nav;const p=l.pins[l.selected];let click=false,noise=false;
  if(!p.seated){
    if(held){
      const movement=Number.isFinite(input.lockDrag)?clamp(input.lockDrag,-.10,.10):dt*(.12+pressure*.55);
      l.velocity+=(movement/Math.max(dt,.001)-l.velocity)*Math.min(1,dt*18);
      let lift=clamp(p.lift+(Number.isFinite(input.lockDrag)?movement:l.velocity*dt));
      const shoulder=p.target*.58;
      if(p.spool&&!p.cleared&&lift>=shoulder){if(input.lockEase>.12){p.cleared=true;l.feedback='freed';click=true;l.flash=.25;}else{lift=shoulder;l.feedback='binding';}}
      p.lift=lift;
      if(p.lift>p.target+.075){l.stress+=dt;l.feedback='over';if(l.cooldown===0&&l.stress>.18){noise=true;l.cooldown=.85;l.flash=.25;if(l.level===2){const previous=l.pins[(l.selected+l.pins.length-1)%l.pins.length];if(previous.seated){previous.seated=false;previous.cleared=false;previous.lift=0;l.feedback='slipped';}}}}
      else {l.stress=0;if(!p.spool||p.cleared||p.lift<shoulder)l.feedback=Math.abs(p.lift-p.target)<.05?'aligned':'lift';}
    }else if(l.held){
      if(Math.abs(p.lift-p.target)<=.05&&(!p.spool||p.cleared)){p.seated=true;p.lift=p.target;click=true;l.flash=.4;l.feedback='set';}
      else {l.feedback='miss';p.cleared=false;}
      l.velocity=0;l.stress=0;
    }else p.lift=Math.max(0,p.lift-dt*1.3);
  }else l.feedback='set';
  l.pressure=held?pressure:0;l.held=held;return {click,noise};
}
export function lockCaption(l,pad=false){
  const ease=pad?'轻压 L2':'按住 Q';
  return {lift:'顶起弹子，让金银接缝靠近横向锁芯边缘。',aligned:'接缝齐了。现在松手。',set:'咔哒，这根卡住了。移向下一根。',miss:'弹回来了。看着接缝，再试一次。',over:'顶过头了，锁芯在发颤。松手卸力。',binding:`腰形弹子卡在台肩。保持顶住，${ease} 卸开扭力。`,freed:'台肩让开了，继续轻轻顶起。',slipped:'共用压片被带动，旁边的弹子滑脱了。',open:'弹子全部到位，锁芯正在转开。'}[l.feedback];
}
