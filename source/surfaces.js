// The same rugs and tile boundaries are used by rendering and footstep selection.
export const RUGS=[{x:3.65,z:12.15,w:1.3,d:1.8,color:'#b6a086'},{x:2.6,z:2.8,w:2.2,d:2.6,color:'#5e7d82'}];
export function floorAt(x,z){
  if(RUGS.some(r=>Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.d/2))return 'carpet';
  return Math.round(x)>18&&Math.round(z)<7||Math.round(x)>=10&&Math.round(x)<=13&&Math.round(z)>=14?'tile':'wood';
}
export const FLOOR_NAMES={wood:'木地板',tile:'瓷砖',carpet:'地毯'};
