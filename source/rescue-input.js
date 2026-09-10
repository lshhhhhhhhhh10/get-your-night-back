const clamp=v=>Math.max(-1,Math.min(1,v));
export function rescueControls(device,frame,keys,pointers){
 if(device==='gamepad')return {rescueX:frame.left.x,rescueY:frame.left.y,gripLeft:frame.triggers.left,gripRight:frame.triggers.right};
 return {rescueX:clamp(Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+(pointers.x||0)),
  rescueY:clamp(Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+(pointers.down||0)-(pointers.up||0)),
  gripLeft:(keys.has('q')||pointers.left)?.55:0,gripRight:(keys.has('e')||pointers.right)?.55:0};
}
