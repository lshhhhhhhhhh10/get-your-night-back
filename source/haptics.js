import {DualSenseOutput,isDualSensePad} from './dualsense.js';
import {continuousFeedback,eventFeedback} from './feedback-profiles.js';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export class Haptics{
  constructor({output=new DualSenseOutput()}={}){
    this.output=output;this.actuator=null;this.pad=null;this.enabled=true;this.intensity=.75;this.adaptive=true;this.triggerStrength=.6;this.last=-Infinity;this.lastPriority=-1;this.until=0;this.effect=null;this.supported=false;this.failed=false;this.running=false;this.lastOutput=-Infinity;this.hidWasActive=false;this.testUntil=0;this.testing='';this.testTimer=null;
  }
  connect(pad,enabled=true,settings={}){
    const changed=this.pad?.index!==pad?.index||this.pad?.id!==pad?.id;
    if(changed||this.enabled&&!enabled)this.stop();if(changed)this.failed=false;this.pad=pad;this.actuator=pad?.vibrationActuator||pad?.hapticActuators?.[0]||null;
    this.enabled=enabled;this.intensity=clamp(settings.hapticIntensity??.75);this.adaptive=settings.adaptiveTriggers!==false;this.triggerStrength=clamp(settings.triggerStrength??.6);
    this.supported=!!this.actuator?.playEffect||this.hidActive;
  }
  get hidActive(){return this.output.connected&&isDualSensePad(this.pad);}
  async requestDevice(){this.stop();return this.output.request();}
  handle(e,now){const p=eventFeedback(e);if(p)this.pulse(p.strong,p.weak,p.duration,now,p.priority);}
  pulse(strong=.2,weak=.2,duration=90,now=performance.now(),priority=1){
    if(!this.enabled||!this.supported||!this.intensity)return;
    if(now<this.until&&priority<this.lastPriority||now-this.last<120&&priority<=this.lastPriority)return;
    this.last=now;this.lastPriority=priority;this.until=now+Math.min(250,duration);this.effect={strong:clamp(strong)*this.intensity,weak:clamp(weak)*this.intensity};
    if(this.hidActive){this.lastOutput=-Infinity;return;}
    try{Promise.resolve(this.actuator?.playEffect('dual-rumble',{startDelay:0,duration:Math.min(250,duration),strongMagnitude:this.effect.strong,weakMagnitude:this.effect.weak})).then(result=>{if(result==='not-supported')this.failed=true;}).catch(()=>{this.failed=true;});}catch{this.failed=true;}
  }
  tick(game,now,active){
    const testing=now<this.testUntil;
    if(!active&&!testing){if(this.running)this.stop();return;}
    this.running=true;
    const hid=this.hidActive;if(hid&&!this.hidWasActive){try{this.actuator?.reset?.()?.catch?.(()=>{});}catch{}}this.hidWasActive=hid;
    const profile=testing?{left:this.testing==='triggers'?{start:2,strength:2}:null,right:this.testing==='triggers'?{start:4,strength:2}:null}:continuousFeedback(game,now);
    if(profile.pulse)this.pulse(profile.pulse.strong,profile.pulse.weak,profile.pulse.duration,now,0);
    if(!hid)return;
    const adapt=e=>e&&this.adaptive&&this.triggerStrength>0?{...e,strength:e.strength*this.triggerStrength}:null;
    const state={...(this.enabled&&now<this.until?this.effect:{}),left:adapt(profile.left),right:adapt(profile.right)};
    // Complete release bypasses the 20 Hz update limit.
    const neutral=!state.left&&!state.right&&!state.strong&&!state.weak;
    if(neutral||now-this.lastOutput>=50){this.output.update(state);this.lastOutput=now;}
  }
  test(kind,now=performance.now()){
    this.stop();this.testing=kind;this.testUntil=now+650;this.running=true;
    if(kind==='rumble')this.pulse(.25,.35,160,now,5);
    this.testTimer=setTimeout(()=>this.stop(),700);this.testTimer?.unref?.();
  }
  stop(){
    clearTimeout(this.testTimer);this.testUntil=0;this.testing='';this.running=false;this.hidWasActive=false;
    try{this.actuator?.reset?.()?.catch?.(()=>{});}catch{}this.output.stop();this.last=-Infinity;this.lastPriority=-1;this.until=0;this.effect=null;this.lastOutput=-Infinity;
  }
  snapshot(){return {supported:this.supported,failed:this.failed,route:this.hidActive?'dualsense-usb':'gamepad',adaptive:this.hidActive&&this.adaptive&&this.triggerStrength>0,status:this.output.status,sent:this.output.sent};}
}
