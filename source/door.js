// A game model of a sticky hinge, not a physical measurement of the recording.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const restingDoor=()=>({pressure:0,moving:false,roughness:0,rate:0,noiseClock:0,noiseEnergy:0});
export function advanceDoor(door,drive,input,dt,level=0){
  const analog=Number.isFinite(input.doorPush)?clamp(input.doorPush):null;
  const held=analog===null?!!input.e:analog>.035;
  // A key/mouse hold leans into the handle; a trigger directly controls pressure.
  drive.pressure=held?(analog===null?clamp(drive.pressure+dt*.56):analog):Math.max(0,drive.pressure-dt*3.8);
  drive.moving=held&&!door.open;
  if(!drive.moving){drive.rate=0;drive.roughness=0;return;}
  const bump=(center,width)=>Math.exp(-(((door.progress-center)/width)**2));
  const resistance=Math.max(bump(door.x===3?.36:.27,.09),bump(door.x===3?.77:.68,.075));
  const easyPressure=.65-level*.035-(door.x===3?0:.08)-resistance*.34;
  // No minimum-speed penalty: easing off always reduces friction noise.
  drive.roughness=clamp((drive.pressure-easyPressure)/.42);
  drive.rate=(.075+drive.pressure*.25)*(1-resistance*.2);
  door.progress=clamp(door.progress+drive.rate*dt);
  drive.noiseClock+=dt;
  drive.noiseEnergy+=(3+drive.roughness*25)*dt;
}
export function hingeCaption(drive){
  return !drive?.moving?'手扶着门，屋里又安静下来。':drive.roughness>.65?'咯吱——门把手在轻颤。':drive.roughness>.22?'吱……门轴有些发涩。':'沙沙……门缝缓缓张开。';
}
