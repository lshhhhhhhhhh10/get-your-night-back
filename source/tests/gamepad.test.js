import test from 'node:test';
import assert from 'node:assert/strict';
import {stick,GamepadInput,MenuRepeat} from '../gamepad.js';
import {Game} from '../engine.js';
import {readSettings,SETTINGS_KEY} from '../persistence.js';
const pad=(index=0)=>({index,id:'DualSense Wireless Controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});
const press=(p,i,down=true)=>p.buttons[i]={pressed:down,value:down?1:0};
test('径向死区消除漂移，轻推保留模拟量，斜向幅度不超过 1',()=>{
  assert.deepEqual(stick(.1,-.1),{x:0,y:0});assert.deepEqual(stick(NaN,Infinity),{x:0,y:0});
  assert.ok(stick(.58,0).x>.49&&stick(.58,0).x<.51);
  const diagonal=stick(1,1);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-10);
  assert.ok(stick(.5,0,.16,1.5).x<stick(.5,0).x);
});
test('长按动作只触发一次；接入、失焦和换手柄需要松开后再操作',()=>{
  const input=new GamepadInput(),p=pad();press(p,0);assert.equal(input.poll([p]).pressed[0],undefined);
  press(p,0,false);input.poll([p]);press(p,0);assert.equal(input.poll([p]).pressed[0],true);assert.equal(input.poll([p]).pressed[0],false);
  input.poll([p],false);assert.equal(input.poll([p],true).held[0],undefined);press(p,0,false);input.poll([p]);press(p,0);assert.equal(input.poll([p]).pressed[0],true);
  assert.equal(input.poll([]).disconnected,true);assert.equal(input.poll([p]).pressed[0],undefined);
});
test('保持已选择的手柄，忽略非标准布局，断开时输入归零',()=>{
  const input=new GamepadInput(),p=pad(2),other=pad(0);input.poll([null,null,p]);
  p.axes[0]=1;assert.equal(input.poll([other,null,p]).left.x,1);assert.equal(input.index,2);
  const swap=input.poll([other]);assert.equal(swap.disconnected,true);assert.equal(swap.left.x,0);
  other.mapping='';const raw=input.poll([other]);assert.equal(input.unsupported,true);assert.equal(input.connected,false);assert.deepEqual(raw.left,{x:0,y:0});
});
test('菜单切换抑制遗留按住状态，方向键有首次延迟与稳定重复',()=>{
  const input=new GamepadInput(),p=pad();input.poll([p]);press(p,2);assert.equal(input.poll([p]).held[2],true);input.inhibit();assert.equal(input.poll([p]).held[2],undefined);press(p,2,false);input.poll([p]);press(p,2);assert.equal(input.poll([p]).pressed[2],true);
  const repeat=new MenuRepeat();assert.equal(repeat.update('down',0),'down');assert.equal(repeat.update('down',359),'');assert.equal(repeat.update('down',360),'down');assert.equal(repeat.update('down',489),'');assert.equal(repeat.update('down',490),'down');repeat.update('',500);assert.equal(repeat.update('down',501),'down');
});
test('模拟摇杆半幅移动更慢，蹲行仍可移动，松开后迅速停下',()=>{
  const run=(amount,hidden=false)=>{const g=new Game();g.start();g.hidden=hidden;for(let i=0;i<12;i++)g.move(0,-amount,1/60);return g;};
  const full=run(1),half=run(.5),crouch=run(1,true);assert.ok(Math.abs(half.velocity.z/full.velocity.z-.5)<1e-10);assert.ok(Math.abs(crouch.velocity.z)<Math.abs(full.velocity.z));assert.ok(crouch.player.z<12);
  for(let i=0;i<16;i++)full.move(0,0,1/60);assert.equal(full.velocity.z,0);
});
test('手柄设置独立保存且坏值限制范围',()=>{
  const raw={gamepadSensitivity:99,stickDeadzone:-1,sensitivity:.6};const settings=readSettings({getItem:key=>key===SETTINGS_KEY?JSON.stringify(raw):null});
  assert.equal(settings.gamepadSensitivity,2);assert.equal(settings.stickDeadzone,.05);assert.equal(settings.sensitivity,.6);
});
