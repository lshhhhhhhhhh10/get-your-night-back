const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const pulse=(strong,weak,duration,priority=1)=>({strong,weak,duration,priority});
// Event feedback is tied to the player's contact, never to an unseen parent.
export function eventFeedback(e){
  if(e.type==='haptic'){
    if(e.kind==='contact')return e.material==='vase'?pulse(.38,.20,100,4):e.material==='tin'?pulse(.22,.35,75,4):e.material==='fork'?pulse(.07,.24,55,4):pulse(.025,.12,28,4);
    if(e.kind==='settled')return pulse(.04,.08,40,2);
    return null;
  }
  if(e.type!=='sound')return null;
  const softer=e.kind==='crouchStep'?.4:1;
  if(['step','crouchStep'].includes(e.kind)){
    const p=e.surface==='tile'?pulse(.04,.22,32):e.surface==='carpet'?pulse(.012,.025,28):pulse(.10,.09,65);
    return {...p,strong:p.strong*softer,weak:p.weak*softer};
  }
  const sounds={floorPressure:pulse(.13,.09,90,2),floorSoft:pulse(.08,.055,65,2),floorCreak:pulse(.29,.27,140,3),creak:pulse(.27,.24,130,3),
    phoneBuzz:pulse(.13,.25,85,3),phoneMute:pulse(.035,.07,35,2),catPurr:pulse(.045,.025,180,1),catToy:pulse(.055,.11,45,1),
    doorHandle:pulse(.035,.11,35,2),search:pulse(.045,.035,65,1),switch:pulse(.02,.085,32,2)};
  return sounds[e.kind]||null;
}
export function continuousFeedback(game,now){
  const result={left:null,right:null,pulse:null},m=game.mode;
  if(m?.type==='door'&&m.drive?.moving&&!m.drive.blocked){
    const d=m.drive,p=clamp(d.pressure),grain=.3+.7*Math.abs(Math.sin(now*.031)*Math.sin(now*.017));
    result.right={start:2,strength:clamp(1+(d.resistance||0)*2.7+p*.7,0,5)*Math.min(1,p*4)};
    if(d.roughness>.06)result.pulse=pulse(d.roughness*p*.18*grain,d.roughness*p*.36*grain,25+grain*45,0);
  }
  const r=m?.type==='catch'?m.rescue:null;
  if(r&&r.stage!=='reach'&&r.kind!=='pencils'){
    const weight=r.kind==='vase'?3.4:r.kind==='tin'?2.4:1.1,unload=r.stage==='lower'?clamp((r.height-.34)/.7,.15,1):1;
    if(r.left>.12)result.left={start:2,strength:clamp((weight-(r.tilt||0)*2.5)*unload,1,5)};
    if(r.right>.12)result.right={start:2,strength:clamp((weight+(r.tilt||0)*2.5)*unload,1,5)};
    if(r.kind==='tin'){
      if(r.left>.12)result.left={start:3,strength:1.5};
      if(r.left<.12&&r.right>.12)result.pulse=pulse(.04,.20*(.6+.4*Math.sin(now*.04)),45,0);
    }
    if(r.kind==='fork'){
      if(r.left>.12)result.left={start:3,strength:1};
      const ring=clamp(1-r.steady/.6);if(r.right>.12&&ring>.02)result.pulse=pulse(.01,ring*.18,35,0);
    }
  }
  if(m?.type==='tickle'&&m.moving){
    result.right={start:3,strength:1+clamp(game.parent.tickleHeat||0)*1.3};
    result.pulse=pulse(.015,.045+clamp(game.parent.tickleHeat||0)*.075,40,0);
  }
  return result;
}
