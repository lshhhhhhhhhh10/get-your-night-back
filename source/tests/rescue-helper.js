export function finishRescue(game){
  for(let i=0;i<650&&game.mode?.type==='catch';i++){
    const r=game.mode.rescue;
    const target=r.kind==='pencils'?(r.pencils.find(p=>p.state==='rolling')?.x||0):r.objectX;
    game.tick(.02,{rescueX:Math.max(-1,Math.min(1,(target-r.handX)*7)),gripLeft:.5,gripRight:.5,rescueDown:1});
  }
}
