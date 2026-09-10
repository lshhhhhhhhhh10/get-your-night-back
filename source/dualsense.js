// USB output-report layout verified against nondebug/dualsense and hid-playstation.
// Protocol references and supported scope: docs/controller-feedback.md.
const clamp=(n,max=1)=>Math.max(0,Math.min(max,Number.isFinite(n)?n:0));
export const SONY=0x054c,DUALSENSE_PRODUCTS=[0x0ce6,0x0df2];
export function triggerEffect(effect){
  const bytes=new Uint8Array(11);bytes[0]=0x05; // Explicit neutral / release.
  const strength=Math.round(clamp(effect?.strength,5)),start=Math.round(clamp(effect?.start??2,9));
  if(!strength)return bytes;
  bytes[0]=0x21; // Ten-zone feedback; no calibration or unofficial modes.
  const mask=(0x3ff<<start)&0x3ff;new DataView(bytes.buffer).setUint16(1,mask,true);
  let zones=0;for(let zone=start;zone<10;zone++)zones+=(strength-1)*2**(zone*3);
  new DataView(bytes.buffer).setUint32(3,zones,true);return bytes;
}
export function usbFeedbackReport({strong=0,weak=0,left=null,right=null}={}){
  const bytes=new Uint8Array(47);bytes[0]=0x0f; // Rumble + both triggers only.
  bytes[2]=Math.round(clamp(weak)*255);bytes[3]=Math.round(clamp(strong)*255);
  bytes.set(triggerEffect(right),10);bytes.set(triggerEffect(left),21);return bytes;
}
function outputReports(collections){return collections.flatMap(c=>[...(c.outputReports||[]),...outputReports(c.children||[])]);}
export function isUSBDevice(device){
  return device?.vendorId===SONY&&DUALSENSE_PRODUCTS.includes(device.productId)&&outputReports(device.collections||[]).some(r=>r.reportId===2&&r.items?.reduce((n,i)=>n+i.reportSize*i.reportCount,0)===376);
}
export function isDualSensePad(pad){return !!pad?.connected&&(/dualsense/i.test(pad.id)||/054c/i.test(pad.id)&&/(0ce6|0df2)/i.test(pad.id));}
export class DualSenseOutput{
  constructor({hid=globalThis.navigator?.hid,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
    this.hid=hid;this.setTimer=setTimer;this.clearTimer=clearTimer;this.device=null;this.pending=null;this.sending=null;this.last=null;this.timer=null;this.busy=false;this.sent=0;this.failed=false;this.status=hid?'idle':'unsupported';
    this.disconnectListener=e=>{if(e.device!==this.device)return;this.clearTimer(this.timer);this.device=null;this.pending=null;this.last=null;this.status='disconnected';};hid?.addEventListener?.('disconnect',this.disconnectListener);
  }
  get connected(){return !!this.device?.opened&&!this.failed;}
  async request(){
    if(!this.hid||this.busy)return false;this.busy=true;
    try{
      const devices=await this.hid.requestDevice({filters:DUALSENSE_PRODUCTS.map(productId=>({vendorId:SONY,productId}))});
      if(!devices.length){if(!this.connected)this.status='cancelled';return false;}
      const device=devices.find(isUSBDevice);if(!device){if(!this.connected)this.status='usb-required';return false;}
      await this.disconnect();if(!device.opened)await device.open();this.device=device;this.failed=false;this.status='connected';this.last=null;await this.stop();return this.connected;
    }catch{this.status='error';return false;}finally{this.busy=false;}
  }
  update(state){
    if(!this.connected)return;this.clearTimer(this.timer);
    // Silence output if the animation loop stalls but the event loop still runs.
    this.timer=this.setTimer(()=>this.stop(),300);
    return this.queue(usbFeedbackReport(state));
  }
  queue(bytes,force=false){
    if(!this.connected)return Promise.resolve();const key=bytes.join(',');
    if(!force&&key===this.last&&!this.pending)return this.sending||Promise.resolve();
    this.pending={bytes,key};if(!this.sending)this.sending=this.drain().finally(()=>{this.sending=null;});return this.sending;
  }
  async drain(){
    while(this.pending&&this.connected){const {bytes,key}=this.pending,device=this.device;this.pending=null;
      try{await device.sendReport(2,bytes);if(device!==this.device)return;this.last=key;this.sent++;}
      catch{this.pending=null;this.failed=true;this.status='error';this.clearTimer(this.timer);
        // One best-effort release, then close; never replay stale effects.
        try{await device.sendReport(2,usbFeedbackReport());}catch{}
        try{await device.close();}catch{}if(this.device===device)this.device=null;return;}
    }
  }
  stop(){this.clearTimer(this.timer);this.timer=null;return this.queue(usbFeedbackReport(),true);}
  async disconnect(){await this.stop();const device=this.device;this.device=null;this.pending=null;this.last=null;if(device?.opened)try{await device.close();}catch{}if(this.hid)this.status='idle';}
}
