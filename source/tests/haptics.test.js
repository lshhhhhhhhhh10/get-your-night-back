import test from 'node:test';
import assert from 'node:assert/strict';
import {DualSenseOutput,triggerEffect,usbFeedbackReport,isUSBDevice,isDualSensePad} from '../dualsense.js';
import {eventFeedback,continuousFeedback} from '../feedback-profiles.js';
import {Haptics} from '../haptics.js';
import {Game} from '../engine.js';
import {finishRescue} from './rescue-helper.js';
import {advanceDoor,restingDoor} from '../door.js';
import {readSettings,SETTINGS_KEY} from '../persistence.js';
const neutral=b=>b[2]===0&&b[3]===0&&b[10]===5&&b[21]===5;
const pad={connected:true,id:'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',index:0};
function mockDevice(){const reports=[];return {vendorId:0x054c,productId:0x0ce6,opened:false,collections:[{outputReports:[{reportId:2,items:[{reportSize:8,reportCount:47}]}]}],reports,async open(){this.opened=true;},async close(){this.opened=false;},async sendReport(id,data){reports.push({id,bytes:[...data]});}};}
function mockOutput(device=mockDevice()){
  let timeout,listener;const hid={requestDevice:async()=>[device],addEventListener:(_,f)=>listener=f};
  const output=new DualSenseOutput({hid,setTimer:fn=>{timeout=fn;return 1;},clearTimer:()=>{timeout=null;}});
  return {device,hid,output,expire:()=>timeout?.(),unplug:()=>listener({device})};
}
test('USB packet has independent trigger zones and only rumble/trigger flags',()=>{
  assert.deepEqual([...triggerEffect({start:2,strength:3})],[0x21,0xfc,3,0x80,0x24,0x49,0x12,0,0,0,0]);
  const b=usbFeedbackReport({strong:.25,weak:.5,left:{start:4,strength:2},right:{start:2,strength:3}});
  assert.equal(b.length,47);assert.equal(b[0],0x0f);assert.equal(b[2],128);assert.equal(b[3],64);assert.equal(b[10],0x21);assert.equal(b[21],0x21);
  assert.deepEqual([...b.slice(21,32)],[...triggerEffect({start:4,strength:2})]);
  for(const i of [1,4,5,6,7,8,9,...Array.from({length:15},(_,i)=>i+32)])assert.equal(b[i],0,'unrelated output byte '+i);
  assert.ok(neutral(usbFeedbackReport()));assert.equal(triggerEffect({strength:0})[0],5);assert.deepEqual(triggerEffect({strength:100}),triggerEffect({strength:5}));
});
test('USB descriptor whitelist rejects Bluetooth and other devices',()=>{
  const d=mockDevice();assert.ok(isUSBDevice(d));d.productId=0x1234;assert.equal(isUSBDevice(d),false);d.productId=0x0df2;assert.ok(isUSBDevice(d));d.collections[0].outputReports[0].reportId=0x31;assert.equal(isUSBDevice(d),false);
  assert.ok(isDualSensePad(pad));assert.equal(isDualSensePad({...pad,id:'Xbox'}),false);
});
test('HID access is explicit, neutral on connect, deduplicated and released by watchdog',async()=>{
  const {output,device,expire}=mockOutput();assert.equal(device.reports.length,0);await output.request();assert.ok(neutral(device.reports[0].bytes));
  await output.update({right:{strength:3,start:2}});const count=device.reports.length;await output.update({right:{strength:3,start:2}});assert.equal(device.reports.length,count);
  await expire();assert.ok(neutral(device.reports.at(-1).bytes));await output.disconnect();assert.equal(device.opened,false);
});
test('stop replaces stale queued effects while a HID write is pending',async()=>{
  const {output,device}=mockOutput();await output.request();let release;const send=device.sendReport;
  device.sendReport=async function(id,b){await new Promise(r=>release=r);await send.call(this,id,b);};
  const sending=output.update({right:{strength:3}});output.update({right:{strength:5}});output.stop();
  device.sendReport=send;release();await sending;
  assert.equal(device.reports.length,3);assert.ok(neutral(device.reports.at(-1).bytes));await output.disconnect();
});
test('cancel, denial, unsupported browser, Bluetooth and HID write failure remain usable',async()=>{
  const {output,hid,device}=mockOutput();hid.requestDevice=async()=>[];assert.equal(await output.request(),false);assert.equal(output.status,'cancelled');
  hid.requestDevice=async()=>{throw new Error('denied');};assert.equal(await output.request(),false);assert.equal(output.status,'error');
  const unsupported=new DualSenseOutput({hid:null});assert.equal(await unsupported.request(),false);assert.equal(unsupported.status,'unsupported');
  hid.requestDevice=async()=>[{...device,collections:[]}];assert.equal(await output.request(),false);assert.equal(output.status,'usb-required');
  hid.requestDevice=async()=>[device];await output.request();device.sendReport=async()=>{throw new Error('unplugged');};await output.update({strong:.1});assert.equal(output.connected,false);assert.equal(output.status,'error');assert.equal(device.opened,false);
});
test('disconnect drops pending device state without prompting again',async()=>{
  const {output,unplug}=mockOutput();await output.request();await output.update({left:{strength:3}});unplug();assert.equal(output.status,'disconnected');assert.equal(output.connected,false);assert.equal(output.pending,null);
});
test('tile is short, wood rounded, carpet faint, crouching softer; remote parents have no vibration',()=>{
  const profile=surface=>eventFeedback({type:'sound',kind:'step',surface}),tile=profile('tile'),wood=profile('wood'),carpet=profile('carpet');
  assert.ok(tile.duration<wood.duration);assert.ok(tile.weak>wood.weak);assert.ok(wood.strong>tile.strong);assert.ok(carpet.strong+carpet.weak<wood.strong+wood.weak);
  assert.ok(eventFeedback({type:'sound',kind:'crouchStep',surface:'wood'}).strong<wood.strong);
  for(const kind of ['parentStep','snore','bed','latch','notice'])assert.equal(eventFeedback({type:'sound',kind}),null);
});
test('hinge resistance follows actual sticky zones; less pressure softens grain, release is neutral',()=>{
  const at=(progress,pressure)=>{const door={x:3,progress},drive=restingDoor();advanceDoor(door,drive,{doorPush:pressure},.01);return {mode:{type:'door',drive}};};
  const sticky=continuousFeedback(at(.36,.85),1000),easy=continuousFeedback(at(.1,.85),1000),gentle=continuousFeedback(at(.36,.45),1000);
  assert.ok(sticky.right.strength>easy.right.strength);assert.ok(sticky.pulse.weak>gentle.pulse.weak);
  assert.notDeepEqual(sticky.pulse,continuousFeedback(at(.36,.85),1060).pulse);assert.equal(continuousFeedback(at(.36,0),1000).right,null);
});
test('vase load transfers between hands and unloads; fork stops ringing under sleeve',()=>{
  const r={kind:'vase',stage:'steady',tilt:.2,left:.5,right:.5,height:1,steady:0},g={mode:{type:'catch',rescue:r}};
  const held=continuousFeedback(g,1000);assert.ok(held.right.strength>held.left.strength);r.stage='lower';r.height=.35;assert.ok(continuousFeedback(g,1000).right.strength<held.right.strength);
  r.kind='fork';r.stage='damp';assert.ok(continuousFeedback(g,1000).pulse);r.steady=.6;assert.equal(continuousFeedback(g,1000).pulse,null);r.left=r.right=0;assert.equal(continuousFeedback(g,1000).right,null);
});
test('each pencil gets one contact event; vase contact is stronger and no extra noise is emitted',()=>{
  const g=new Game(1);g.start();g.seed=7;g.player={x:16,z:1.8};g.beginIncident('study-search');finishRescue(g);
  assert.equal(g.events.filter(e=>e.type==='haptic'&&e.kind==='contact').length,3);
  assert.equal(g.events.filter(e=>e.type==='haptic'&&e.kind==='settled').length,1);assert.equal(g.metrics.loudSounds,0);
  const pen=eventFeedback({type:'haptic',kind:'contact',material:'pencils'}),vase=eventFeedback({type:'haptic',kind:'contact',material:'vase'});assert.ok(vase.strong>pen.strong*5);assert.ok(vase.duration>pen.duration);
});
test('contact overrides continuous texture, native errors are caught, stopping resets',async()=>{
  const calls=[],h=new Haptics({output:mockOutput().output});h.connect({...pad,vibrationActuator:{playEffect:(_,p)=>{calls.push(p);return Promise.reject(new Error('unsupported'));},reset:()=>calls.push('stop')}});
  h.pulse(.03,.03,50,1000,0);h.handle({type:'haptic',kind:'contact',material:'vase'},1010);h.pulse(.02,.02,50,1020,0);assert.equal(calls.filter(x=>typeof x==='object').length,2);await new Promise(setImmediate);assert.equal(h.failed,true);h.stop();assert.equal(calls.at(-1),'stop');
});
test('USB owns both effects; settings independent; pause and lost input release output',async()=>{
  const {output,device}=mockOutput();await output.request();const h=new Haptics({output}),native=[];
  h.connect({...pad,vibrationActuator:{playEffect:()=>native.push('pulse'),reset:()=>native.push('reset')}},false,{adaptiveTriggers:true,triggerStrength:1});
  const game={mode:{type:'door',drive:{moving:true,pressure:.7,resistance:1,roughness:.7}}};
  h.tick(game,1000,true);await output.sending;assert.equal(device.reports.at(-1).bytes[10],0x21);assert.equal(device.reports.at(-1).bytes[3],0);assert.equal(native.includes('pulse'),false);
  h.connect(h.pad,true,{adaptiveTriggers:false,hapticIntensity:1});h.handle({type:'sound',kind:'step',surface:'tile'},1200);h.tick(game,1200,true);await output.sending;assert.equal(device.reports.at(-1).bytes[10],5);assert.ok(device.reports.at(-1).bytes[2]>0);
  h.tick(game,1210,false);await output.sending;assert.ok(neutral(device.reports.at(-1).bytes));h.connect(null);await output.sending;assert.ok(neutral(device.reports.at(-1).bytes));await output.disconnect();
});
test('feedback settings migrate and clamp without changing look sensitivity',()=>{
  const s={getItem:key=>key===SETTINGS_KEY?JSON.stringify({hapticIntensity:3,triggerStrength:-1,adaptiveTriggers:false,gamepadSensitivity:1.5}):null};
  const settings=readSettings(s);assert.equal(settings.hapticIntensity,1);assert.equal(settings.triggerStrength,0);assert.equal(settings.adaptiveTriggers,false);assert.equal(settings.gamepadSensitivity,1.5);
});
