// W3C standard layout: × ○ □ △, L1 R1 L2 R2, Create Options, L3 R3, D-pad.
export const BUTTON={confirm:0,back:1,interact:2,map:3,slower:4,faster:5,pause:9,up:12,down:13,left:14,right:15};
const bound=(v,min,max)=>Math.max(min,Math.min(max,v));
export function stick(x=0,y=0,deadzone=.16,curve=1){
  x=Number.isFinite(x)?bound(x,-1,1):0;y=Number.isFinite(y)?bound(y,-1,1):0;
  const length=Math.hypot(x,y);deadzone=bound(deadzone,.05,.35);
  if(length<=deadzone)return {x:0,y:0};
  const magnitude=Math.pow((Math.min(1,length)-deadzone)/(1-deadzone),curve);
  return {x:x/length*magnitude,y:y/length*magnitude};
}
export const emptyFrame=()=>({left:{x:0,y:0},right:{x:0,y:0},triggers:{left:0,right:0},held:[],pressed:[],activity:false});
export class GamepadInput{
  constructor(){this.index=null;this.id='';this.previous=[];this.blocked=true;this.connected=false;this.unsupported=false;}
  inhibit(){this.blocked=true;}
  poll(pads,focused=true,deadzone=.16){
    const all=Array.from(pads||[]).filter(p=>p?.connected),valid=all.filter(p=>p.mapping==='standard');
    // Keep one owner until unplugged, even if another controller is connected.
    const pad=valid.find(p=>p.index===this.index&&p.id===this.id)||valid[0];
    const oldConnected=this.connected,changed=!!pad&&(pad.index!==this.index||pad.id!==this.id);
    this.connected=!!pad;this.unsupported=!pad&&all.length>0;
    const frame=emptyFrame();frame.disconnected=oldConnected&&(!pad||changed);frame.connectedNow=!!pad&&(!oldConnected||changed);
    if(!pad){this.index=null;this.id='';this.previous=[];this.blocked=true;return frame;}
    if(changed){this.index=pad.index;this.id=pad.id;this.previous=[];this.blocked=true;}
    const held=Array.from(pad.buttons,b=>!!b.pressed||b.value>.5);
    const left=stick(pad.axes[0],pad.axes[1],deadzone),right=stick(pad.axes[2],pad.axes[3],deadzone,1.5);
    const trigger=i=>Number.isFinite(pad.buttons[i]?.value)?bound(pad.buttons[i].value,0,1):0;
    const triggers={left:trigger(6),right:trigger(7)};
    const activity=held.some(Boolean)||triggers.left>.035||triggers.right>.035||!!(left.x||left.y||right.x||right.y);
    if(!focused)this.blocked=true;
    if(this.blocked){if(focused&&!activity)this.blocked=false;this.previous=held;frame.activity=focused&&activity;return frame;}
    frame.left=left;frame.right=right;frame.triggers=triggers;frame.held=held;frame.pressed=held.map((down,i)=>down&&!this.previous[i]);frame.activity=activity;this.previous=held;return frame;
  }
}
export class MenuRepeat{
  constructor(){this.direction='';this.next=0;}
  reset(){this.direction='';this.next=0;}
  update(direction,now){
    if(!direction){this.reset();return '';}
    if(direction!==this.direction){this.direction=direction;this.next=now+360;return direction;}
    if(now>=this.next){this.next=now+130;return direction;}return '';
  }
}
