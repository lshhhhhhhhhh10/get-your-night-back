// Tuned sticky-hinge response for this game's doors, not a universal friction law.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const restingDoor=()=>({pressure:0,moving:false,roughness:0,resistance:0,rate:0,speed:0,impact:0,noiseClock:0,noiseEnergy:0,blocked:false});
// Internal relative speed only; players still read the sound, hands and door gap.
export function hingeRoughness(speed,resistance=0,wear=0){
  const knots=[[0,.035],[.2,.09],[.3,.32],[.45,.82],[.6,.76],[.8,.16],[1,.055]];
  const s=clamp(speed),i=knots.findIndex(([x])=>s<=x);
  if(i===0)return knots[0][1];
  const [x,a]=knots[i-1],[y,b]=knots[i],t=(s-x)/(y-x),smooth=t*t*(3-2*t);
  return clamp((a+(b-a)*smooth)*(.72+resistance*.40+wear));
}
export function advanceDoor(door,drive,input,dt,level=0){
  const analog=Number.isFinite(input.doorPush)?clamp(input.doorPush):null;
  const held=analog===null?!!input.e:analog>.035;
  drive.pressure=held?(analog===null?clamp(drive.pressure+dt*.56):analog):Math.max(0,drive.pressure-dt*3.8);
  const direction=drive.direction===-1?-1:1;
  drive.impact=0;
  drive.moving=held&&(direction===1?door.progress<1:door.progress>0);
  if(!drive.moving){drive.rate=0;drive.speed=0;drive.roughness=0;return;}
  const bump=(center,width)=>Math.exp(-(((door.progress-center)/width)**2));
  const resistance=Math.max(bump(door.x===3?.36:.27,.09),bump(door.x===3?.77:.68,.075));
  drive.resistance=resistance;
  // Retain the trigger's pressure/angle resistance; fast sliding reduces creak.
  drive.rate=.075+drive.pressure*.25*(1-resistance*.08);
  drive.speed=clamp((drive.rate-.075)/.25);
  drive.roughness=hingeRoughness(drive.speed,resistance,level*.025+(door.x===3?0:.055));
  door.progress=clamp(door.progress+direction*drive.rate*dt);
  door.open=door.progress===1;
  if(direction===1?door.progress===1:door.progress===0)drive.impact=clamp((drive.rate-.235)/.09)**2;
  drive.noiseClock+=dt;
  drive.noiseEnergy+=(3+drive.roughness*25)*dt;
}
export function hingeCaption(drive){
  return drive?.blocked?'门边有人，先松开把手挪一挪。':!drive?.moving?'手扶着门，屋里又安静下来。':drive.speed>.76?'门轴声轻下来了，快到头时收住力。':drive.roughness>.65?'咯吱咯吱——涩点带着把手轻颤。':drive.roughness>.22?'吱……门轴有些发涩。':drive.direction===-1?'轻轻咯吱……门缝缓缓合拢。':'轻轻咯吱……门缝缓缓张开。';
}
