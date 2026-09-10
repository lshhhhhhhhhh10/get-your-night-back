import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../engine.js';
import {advanceDoor,restingDoor} from '../door.js';
import {GamepadInput} from '../gamepad.js';
const near=(level=0)=>{const g=new Game(level);g.start();g.player={x:3,z:11};g.action();return g;};
const tick=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=.05)g.tick(.05,input);};
test('施力推进真实门角度，松手立即停；再次推门保留开口',()=>{const g=near();tick(g,.8,{e:true});const p=g.doors[0].progress,score=g.metrics.doorSeconds;assert.ok(p>0);tick(g,.5);assert.equal(g.doors[0].progress,p);assert.equal(g.metrics.doorSeconds,score);assert.equal(g.mode.drive.rate,0);assert.equal(g.mode.drive.pressure,0);tick(g,.5,{e:true});assert.ok(g.doors[0].progress>p);});
test('慢速轻响、中速涩响、高速滑动减响；途中不产生撞门声',()=>{
  for(const direction of [1,-1])for(const level of [0,1,2]){
    const run=pressure=>{const g=near(level),d=g.doors[0];d.progress=direction===1?.1:.9;g.mode.drive.direction=direction;g.time=3;g.lastSnore=0;tick(g,1.5,{doorPush:pressure});return g;};
    const low=run(.2),mid=run(.5),fast=run(1);
    assert.ok(Math.abs(fast.doors[0].progress-(direction===1?.1:.9))>Math.abs(mid.doors[0].progress-(direction===1?.1:.9)));
    assert.ok(mid.metrics.noiseBurden>low.metrics.noiseBurden);
    assert.ok(mid.metrics.noiseBurden>fast.metrics.noiseBurden);
    assert.equal(low.metrics.quietDoorSeconds,low.metrics.doorSeconds);
    for(const g of [low,mid,fast])assert.ok(!g.events.some(e=>e.kind==='doorBump'));
  }
});
test('涩点随门角度改变，及时收力能减轻摩擦，后两夜要求更轻',()=>{const run=(progress,pressure,level=0)=>{const d={x:3,progress,open:false},m=restingDoor();advanceDoor(d,m,{doorPush:pressure},.05,level);return m;};assert.ok(run(.36,.6).roughness>run(.1,.6).roughness);assert.ok(run(.36,.2).roughness<run(.36,.6).roughness);assert.ok(run(.36,.6,2).roughness>run(.36,.6,0).roughness);});
test('每一关可通过短推停顿开门，停顿不会回关或重置表现',()=>{for(let level=0;level<3;level++){const g=near(level);for(let n=0;n<40&&!g.doors[0].open;n++){tick(g,.45,{e:true});tick(g,.12);}assert.equal(g.doors[0].open,true);assert.equal(g.mode,null);assert.equal(g.metrics.noiseBurden,0);assert.equal(g.status,'playing');assert.ok(g.canOccupy(3.2,10));}});
test('保存半开门并续玩时不继承施力；旧版门速不影响新版',()=>{const g=near();tick(g,1,{e:true});const data=g.serialize();data.speed=1;const h=new Game();assert.equal(h.restore(data),true);const p=h.doors[0].progress;assert.equal(h.active,false);h.active=true;h.tick(.05);assert.equal(h.doors[0].progress,p);assert.equal(h.mode.drive.pressure,0);h.cancel();h.action();assert.equal(h.mode.door.progress,p);});
test('开门时家长与时间仍推进；暂停则所有门状态冻结',()=>{const g=near(2);g.nextVisit=.2;tick(g,1);assert.equal(g.parent.state,'warning');const before=g.time;g.active=false;tick(g,2,{e:true});assert.equal(g.time,before);assert.equal(g.doors[0].progress,0);});
test('R2 提供小于一半的连续压深，失焦或断线不会残留扳机',()=>{const input=new GamepadInput(),p={index:0,id:'DualSense',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({value:0,pressed:false}))};input.poll([p]);p.buttons[7].value=.22;const f=input.poll([p]);assert.equal(f.triggers.right,.22);assert.equal(f.held[7],false);assert.equal(f.activity,true);assert.equal(input.poll([p],false).triggers.right,0);assert.equal(input.poll([p]).triggers.right,0);p.buttons[7].value=0;input.poll([p]);p.buttons[7].value=.35;assert.equal(input.poll([p]).triggers.right,.35);assert.equal(input.poll([]).triggers.right,0);});
test('完整开关门、反向与关门中途续玩保持角度和方向',()=>{const g=near();tick(g,10,{doorPush:.2});assert.ok(g.doors[0].open);g.action();assert.equal(g.mode.drive.direction,-1);tick(g,2,{doorPush:.2});const progress=g.doors[0].progress;assert.ok(progress<1);const h=new Game();assert.ok(h.restore(g.serialize()));h.active=true;tick(h,.5);assert.equal(h.doors[0].progress,progress);assert.equal(h.mode.drive.direction,-1);h.reverseDoor();tick(h,.2,{doorPush:.3});assert.ok(h.doors[0].progress>progress);h.reverseDoor();tick(h,12,{doorPush:.2});assert.equal(h.doors[0].progress,0);assert.equal(h.doors[0].open,false);assert.equal(h.mode,null);assert.equal(h.canOccupy(3,10),false);h.action();assert.equal(h.mode.drive.direction,1);});
test('关闭门扇遇到玩家或家长时停止，不穿过角色',()=>{for(const role of['player','parent']){const g=near(),d=g.doors[0];g.visible=()=>false;d.progress=1;d.open=true;g.cancel();g.action();if(role==='player')g.player={x:3.15,z:9.92};else Object.assign(g.parent,{x:3.15,z:9.92,state:'checking',phase:'scan',timer:100,route:[]});for(let n=0;n<200&&!g.mode?.drive.blocked;n++)g.tick(.05,{doorPush:.2});assert.equal(g.mode?.drive.blocked,true);assert.ok(d.progress>0);assert.equal(g.status,'playing');}});

test('开到底和关到底仅撞一次；提前收力可以轻轻停住',()=>{
  for(const direction of [1,-1])for(const gentleFinish of [false,true]){
    const g=near();g.visible=()=>false;g.time=3;g.lastSnore=0;g.doors[0].progress=direction===1?.7:.3;g.mode.drive.direction=direction;
    tick(g,.5,{doorPush:1});assert.equal(g.events.filter(e=>e.kind==='doorBump').length,0);
    tick(g,3,{doorPush:gentleFinish?.15:1});
    assert.equal(g.mode,null);assert.equal(g.doors[0].progress,direction===1?1:0);
    const bumps=g.events.filter(e=>e.kind==='doorBump');assert.equal(bumps.length,gentleFinish?0:1);
    if(!gentleFinish){assert.ok(bumps[0].strength>50);assert.equal(bumps[0].x,3);assert.equal(bumps[0].z,10);assert.ok(g.metrics.noiseBurden>0);}
    tick(g,1,{doorPush:1});assert.equal(g.events.filter(e=>e.kind==='doorBump').length,bumps.length);
  }
});
test('门轴声以实际门为声源；键鼠长按也能越过中速涩响区',()=>{
  const g=near();g.time=3;g.lastSnore=0;tick(g,1.4,{e:true});const mid=g.mode.drive.roughness;
  tick(g,.45,{e:true});assert.ok(g.mode.drive.roughness<mid);
  const sound=g.events.find(e=>e.kind==='hingeMotion');assert.equal(sound.x,3);assert.equal(sound.z,10);
  tick(g,.5);assert.equal(g.mode.drive.rate,0);assert.equal(g.mode.drive.impact,0);
});
