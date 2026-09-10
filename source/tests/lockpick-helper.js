export function finishLock(g){
  g.tick(.02,{});
  for(let n=0;n<1800&&g.mode?.type==='lockpick';n++){
    const l=g.mode.mechanism,idx=l.pins.findIndex(p=>!p.seated),p=l.pins[l.selected];
    if(idx<0){g.tick(.02,{});continue;}
    if(p.seated){g.tick(.02,{lockSelect:idx});continue;}
    g.tick(.02,{lockPressure:p.lift<p.target-.005?.5:0,lockEase:1});
  }
}
