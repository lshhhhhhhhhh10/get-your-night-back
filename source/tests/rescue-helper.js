export function rescueStep(r){
  const returning=r.stage==='lower',target=returning?0:r.kind==='pencils'?(r.pencils.find(p=>p.state==='rolling')?.x||0):r.objectX;
  return {rescueX:Math.max(-1,Math.min(1,returning?-(r.returnPosition?.x||0)*9:(target-r.handX)*7)),gripLeft:.5,gripRight:.5,rescueY:returning?(r.returnPhase==='place'?1:-1):0};
}
export function finishRescue(game){
  for(let i=0;i<650&&game.mode?.type==='catch';i++)game.tick(.02,rescueStep(game.mode.rescue));
}
