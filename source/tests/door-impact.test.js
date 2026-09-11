import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game,occluded} from '../engine.js';
import {restingDoor} from '../door.js';
import {eventFeedback} from '../feedback-profiles.js';
import {doorsForSound,latestSoundCue} from '../spatial-audio.js';
import {addDoorDetail,animateDoorDetail} from '../door-detail.js';

function fixture({level=0,index=0,direction=1,progress=direction===1?0:1}={}){
  const g=new Game(level);g.start();g.time=2;g.lastSnore=2;g.nextVisit=Infinity;
  const d=g.doors[index];Object.assign(d,{progress,open:progress===1});
  g.player={x:d.x,z:d.z+1.05};g.mode={type:'door',door:d,elapsed:0,drive:{...restingDoor(),direction}};
  return {g,d};
}
function finish(g,input){for(let n=0;n<1200&&g.mode;n++)g.tick(1/120,input);assert.equal(g.mode,null);}
const bumps=g=>g.events.filter(e=>e.kind==='doorBump');

test('两扇门、三夜、开合双向：全程最大 R2 在终点巨响一次，途中仍是安静高速门轴',()=>{
  for(const level of [0,1,2])for(const index of [0,1])for(const direction of [1,-1]){
    const {g,d}=fixture({level,index,direction});finish(g,{doorPush:1});
    const sounds=bumps(g);assert.equal(sounds.length,1);assert.ok(sounds[0].impact>.97);assert.ok(sounds[0].strength>88);
    assert.ok(g.events.filter(e=>e.kind==='hingeMotion').every(e=>e.strength<10));
    assert.equal(d.progress,direction===1?1:0);assert.equal(g.status,'playing');assert.ok(g.parent.a>0);
    for(let n=0;n<120;n++)g.tick(1/120,{doorPush:1});assert.equal(bumps(g).length,1);assert.equal(d.progress,direction===1?1:0);
  }
});
test('最后 5% 改成轻推：之前大力不带入终点，不撞框、不产生撞击脉冲',()=>{
  for(const direction of [1,-1]){
    const {g,d}=fixture({direction});
    while(direction===1?d.progress<.95:d.progress>.05)g.tick(1/120,{doorPush:1});
    assert.equal(bumps(g).length,0);finish(g,{doorPush:.15});
    assert.equal(bumps(g).length,0);assert.equal(d.contact,undefined);
    assert.ok(g.events.some(e=>e.kind==='latch'));assert.ok(!g.events.some(e=>e.kind==='doorBump'&&eventFeedback(e)));
  }
});
test('键鼠持续按住会撞响，末段松手停住再短推可以轻停',()=>{
  const hard=fixture();finish(hard.g,{e:true});assert.equal(bumps(hard.g).length,1);assert.ok(bumps(hard.g)[0].impact>.97);
  const {g,d}=fixture();while(d.progress<.94)g.tick(1/120,{e:true});const before=d.progress;
  for(let n=0;n<48;n++)g.tick(1/120);assert.equal(d.progress,before);
  finish(g,{e:true});assert.equal(bumps(g).length,0);assert.equal(d.progress,1);
});
test('环境掩护减弱父母听闻与噪声负担，撞击声音和手里脉冲保留物理力度',()=>{
  const run=masked=>{const {g}=fixture({progress:.999});g.time=3;g.lastSnore=masked?2.5:0;g.tick(.01,{doorPush:1});return {g,event:bumps(g)[0]};};
  const clear=run(false),masked=run(true);assert.ok(clear.event&&masked.event);
  assert.equal(clear.event.impact,masked.event.impact);assert.equal(masked.event.strength,clear.event.strength);
  assert.deepEqual(eventFeedback(clear.event),eventFeedback(masked.event));
  assert.ok(masked.g.parent.a<clear.g.parent.a);assert.ok(masked.g.metrics.noiseBurden<clear.g.metrics.noiseBurden);
  const hard=eventFeedback(clear.event),light=eventFeedback({...clear.event,impact:.1});assert.ok(hard.strong>light.strong*2);assert.ok(hard.duration>light.duration);
});
test('撞击不新增操作锁；撞后可立即移动，保存不重播瞬间反冲',()=>{
  const {g,d}=fixture({progress:.999});finish(g,{doorPush:1});assert.ok(d.contact);
  const before=g.player.x;g.move(.5,0,.06);assert.ok(g.player.x>before);assert.equal(d.progress,1);
  const h=new Game();assert.ok(h.restore(g.serialize()));assert.equal(h.doors[0].contact,undefined);
  h.active=true;h.tick(.02,{doorPush:1});assert.equal(bumps(h).length,0);assert.equal(h.doors[0].progress,1);
});
test('短促手部反冲与合页余震可结束，不回摆门扇或留下悬空手',()=>{
  const pivot=new THREE.Group(),detail=addDoorDetail(pivot);pivot.rotation.y=Math.PI*.49;
  const contact={at:5,impact:1};animateDoorDetail(detail,null,1,5.1,contact);
  assert.ok(detail.hands.visible);assert.ok(detail.hands.children[0].position.z>.05);assert.notEqual(detail.hinges[0].rotation.z,0);
  assert.equal(pivot.rotation.y,Math.PI*.49);animateDoorDetail(detail,null,1,5.3,contact);
  assert.equal(detail.hands.visible,false);assert.equal(detail.hinges[0].rotation.z,0);
  animateDoorDetail(detail,null,-1,5.1,null);assert.equal(detail.hands.visible,false);
});
test('门框撞击不被自己的门扇闷住；其他门、墙及远处脚步继续遮挡',()=>{
  const doors=[{x:3,z:10,progress:0},{x:11,z:6,progress:0}],source={kind:'doorBump',x:3,z:10},listener={x:3,z:11};
  assert.equal(occluded(listener,source,0,doors,false),true);
  assert.equal(occluded(listener,source,0,doorsForSound(source,doors),false),false);
  assert.deepEqual(doorsForSound(source,doors),[doors[1]]);
  assert.equal(doorsForSound({...source,kind:'parentStep'},doors),doors);
  assert.equal(occluded({x:8,z:11},source,0,doorsForSound(source,doors),false),true);
});
test('父母立即翻身也不吞掉撞门字幕，半拍后恢复回应声音',()=>{
  const bump={kind:'doorBump',at:100},bed={kind:'bed',at:110},cues=[bump,bed];
  assert.equal(latestSoundCue(cues,200),bump);assert.equal(latestSoundCue(cues,551),bed);
  assert.equal(latestSoundCue([bed],200),bed);assert.equal(latestSoundCue([],200),undefined);
});
