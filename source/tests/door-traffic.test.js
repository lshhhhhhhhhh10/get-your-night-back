import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,canStand,distance} from '../engine.js';
import {circleHits,doorShape,PARENT_HOME} from '../layout.js';
import {doorSweepHits} from '../door-traffic.js';

const checkStep=(g,before)=>{
  assert.ok(distance(g.parent,before)<=.058,'父母不能瞬移');
  assert.ok(canStand(g.parent.x,g.parent.z,g.level,.24),'父母不能穿墙或家具');
  assert.ok(!g.doors.some(d=>circleHits(g.parent,.239,doorShape(d))),'父母不能穿门');
};
const setup=(index,progress,x,z)=>{
  const g=new Game(2);g.start();g.nextVisit=Infinity;g.visible=()=>false;
  const d=g.doors[index];Object.assign(d,{progress,open:progress===1,direction:-1});
  g.player={x:d.x,z:d.z+1};Object.assign(g.parent,{x:d.x+x,z:d.z+z,state:'checking',phase:'scan',timer:100,route:[],goal:{x:d.x,z:d.z-1.5}});
  return {g,d};
};
test('两扇门多角度关闭：父母退出门扇，不夺走把手，玩家可以关完并退出',()=>{
  let cases=0;
  for(const index of [0,1])for(const progress of [.2,.5,.8,1])for(const z of [-.9,-.5,-.08,.6]){
    const {g,d}=setup(index,progress,.15,z);if(circleHits(g.parent,.24,doorShape(d)))continue;
    cases++;g.action();const mode=g.mode;let last=d.progress;
    for(let i=0;i<220&&g.mode;i++){
      const before={...g.parent};g.tick(.05,{doorPush:.2});checkStep(g,before);
      assert.ok(d.progress<=last,'父母不能反向抢门');last=d.progress;
      if(g.mode)assert.equal(g.mode,mode,'关门不能被父母强制取消');
    }
    assert.equal(d.progress,0);assert.equal(g.mode,null);assert.equal(g.status,'playing');
    assert.ok(g.move(0,1,.05),'操作结束立即恢复玩家移动');
  }
  assert.ok(cases>=20);
});
test('父母在半开门边自己挡住自己时，退开再开门并完成通行',()=>{
  for(const index of [0,1])for(const progress of [.4,.65,.9])for(const side of [-1,1]){
    const {g,d}=setup(index,progress,.1,side<0?-.95:.45);
    if(circleHits(g.parent,.24,doorShape(d)))continue;
    g.player={x:4,z:12};g.parent.openingDoor=index;g.parent.intent='investigate';
    g.setDestination({x:d.x,z:d.z-side*1.5});
    let passed=false;
    for(let i=0;i<250&&!passed;i++){
      const before={...g.parent};g.tick(.05);checkStep(g,before);
      passed=side<0?g.parent.z>d.z+.7:g.parent.z<d.z-1.15;
    }
    assert.equal(d.open,true);assert.equal(passed,true,`${index} ${progress} ${side} 未通行`);
  }
});
test('玩家与父母同时碰门：保存、续玩、反向和取消仍能继续通行',()=>{
  const {g,d}=setup(0,.65,.15,-.08);g.parent.openingDoor=0;g.parent.intent='investigate';g.setDestination({x:3,z:11.5});g.action();
  for(let i=0;i<8;i++)g.tick(.05,{doorPush:.5});
  const h=new Game();assert.ok(h.restore(g.serialize()));h.visible=()=>false;h.active=true;
  const angle=h.doors[0].progress;for(let i=0;i<10;i++)h.tick(.05);
  assert.equal(h.doors[0].progress,angle,'续玩不能继承施力或让父母抢门');
  h.reverseDoor();h.tick(.05,{doorPush:.3});assert.ok(h.doors[0].progress>=angle);
  h.cancel();h.player={x:4,z:12};
  for(let i=0;i<250&&h.parent.z<10.8;i++){const before={...h.parent};h.tick(.05);checkStep(h,before);}
  assert.ok(h.parent.z>10.8);assert.equal(h.parent.openingDoor,null);
});
test('关门有身体阻挡时不虚报撞门，退出后可以挪开',()=>{
  const {g,d}=setup(0,.6,0,-1.5);g.parent.state='sleep';g.player={x:3.15,z:9.92};g.action();
  for(let i=0;i<100&&!g.mode?.drive.blocked;i++)g.tick(.05,{doorPush:1});
  assert.equal(g.mode?.drive.blocked,true);assert.ok(d.progress>0);
  assert.equal(g.events.filter(e=>e.kind==='doorBump').length,0);
  g.cancel();assert.ok(g.move(0,1,.05));
});
test('整段门扇扫过的区域可检测，不能用末帧越过角色',()=>{
  const d={x:3,z:10,progress:1},actor={x:3.08,z:9.45};
  assert.equal(circleHits(actor,.1,doorShape(d)),false);
  assert.equal(circleHits(actor,.1,doorShape({...d,progress:0})),false);
  assert.equal(doorSweepHits(d,1,0,actor,.1),true);
});
test('第三关完整巡查、开门、返回床边仍持续推进',()=>{
  const g=new Game(2);g.start();g.player={x:4,z:12};g.beginWarning();const phases=new Set();
  for(let i=0;i<3400&&!g.visits;i++){const before={...g.parent};g.tick(.05);checkStep(g,before);phases.add(g.parent.phase);}
  assert.equal(g.status,'playing');assert.equal(g.visits,1);assert.equal(distance(g.parent,PARENT_HOME),0);
  assert.ok(phases.has('opening'));assert.equal(g.doors[1].open,true);
});
test('持门和父母退让不提供视线识别免疫',()=>{
  const g=new Game();g.start();g.player={x:3,z:11};Object.assign(g.parent,{x:3,z:11.6,state:'checking',phase:'scan',timer:100,route:[]});g.action();
  for(let i=0;i<6;i++)g.tick(.05,{doorPush:.2});
  assert.equal(g.status,'lost');assert.equal(g.mode,null);assert.ok(g.parent.recognition>=.25);
});
