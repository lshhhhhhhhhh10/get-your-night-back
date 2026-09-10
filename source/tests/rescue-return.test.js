import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newRescue,advanceRescue,rescueHelp} from '../rescue.js';
import {objectPose,returnPose} from '../incident-motion.js';
import {IncidentCamera} from '../cinematic.js';
import {rescueControls} from '../rescue-input.js';
import {emptyFrame} from '../gamepad.js';
import {rescueStep} from './rescue-helper.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function held(kind){const r=newRescue(kind,7);let elapsed=0;while(r.stage!=='lower'&&elapsed<4){elapsed+=.02;advanceRescue(r,rescueStep(r),.02,elapsed);}assert.equal(r.stage,'lower');return {type:'catch',incidentId:kind==='vase'?'vase':'storage-search',rescue:r,elapsed};}
function step(m,input,dt=.02){m.elapsed+=dt;return advanceRescue(m.rescue,{gripLeft:.5,gripRight:.5,...input},dt,m.elapsed);}
function projected(m,aspect){const c=new IncidentCamera();c.render({render(){}},m,aspect);const p=objectPose(m);return new THREE.Vector3(p.x,p.y,p.z).project(c.camera);}

test('花瓶和铁盒归位四方向与实际镜头投影一致，纵向不横漂，宽窄屏相同',()=>{
 for(const kind of ['vase','tin'])for(const aspect of[1440/1000,390/844])for(const phase of['lift','back','place'])for(const [x,y]of [[-1,0],[1,0],[0,-1],[0,1]]){
  const m=held(kind),r=m.rescue,rest=returnPose(kind);
  if(phase!=='lift'){r.returnPosition.y=rest.y+.16;r.returnPosition.z=phase==='back'?(r.returnFrom.z+rest.z)/2:rest.z;if(phase==='place')r.returnPhase='place';}
  const before=projected(m,aspect);step(m,{rescueX:x,rescueY:y,rescueAspect:aspect});const after=projected(m,aspect);
  if(x){assert.ok((after.x-before.x)*x>0,`${kind} ${aspect} ${phase} horizontal`);near(after.y,before.y);}
  if(y){assert.ok((after.y-before.y)*y<0,`${kind} ${aspect} ${phase} vertical`);near(after.x,before.x);}
 }
});
test('只向下或只向上不会自动归位，左右偏离原垫不能完成；上移后对准下放才成功',()=>{
 for(const kind of['vase','tin']){
  const m=held(kind),r=m.rescue;for(let i=0;i<60;i++)assert.ok(!step(m,{rescueY:1}).done);
  assert.equal(r.returnPhase,'lift');for(let i=0;i<160;i++)assert.ok(!step(m,{rescueY:-1}).done);
  assert.equal(r.returnPhase,'place');r.returnPosition.x=.28;
  for(let i=0;i<60;i++)assert.ok(!step(m,{rescueY:1}).done);
  for(let i=0;i<80&&Math.abs(r.returnPosition.x)>.025;i++)step(m,{rescueX:-Math.sign(r.returnPosition.x)});assert.ok(Math.abs(r.returnPosition.x)<.065);
  assert.equal(step(m,{rescueY:1}).success,true);
 }
});

test('四方向操作可达的最高位置仍完整显示花瓶和铁盒，不被顶部状态栏裁掉花朵或盒盖',()=>{
 for(const kind of['vase','tin'])for(const aspect of[1440/1000,390/844]){
  const m=held(kind),c=new IncidentCamera();
  for(let i=0;i<200;i++){
   step(m,{rescueY:-1,rescueAspect:aspect});c.render({render(){}},m,aspect);c.scene.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(c.stations.get(kind).userData.incident.object);
   const top=new THREE.Vector3(bounds.max.x,bounds.max.y,bounds.max.z).project(c.camera);assert.ok(top.y<.64,`${kind} top=${top.y}`);
  }
 }
});
test('归位松杆原地停、半幅慢于全幅、失去双手支撑时不残留位移',()=>{
 for(const kind of['vase','tin']){
  const a=held(kind),b=structuredClone(a),start=a.rescue.returnPosition.y;
  step(a,{rescueY:-1});step(b,{rescueY:-.5});near(a.rescue.returnPosition.y-start,2*(b.rescue.returnPosition.y-start));
  const pose={...a.rescue.returnPosition};step(a,{});assert.deepEqual(a.rescue.returnPosition,pose);
  step(a,{rescueY:-1,rescueX:1,gripLeft:0,gripRight:0});assert.deepEqual(a.rescue.returnPosition,pose);
 }
});
test('v0.14.3 归位中途存档首次读取保持位置，随后使用新四方向操作',()=>{
 const m=held('vase'),r=m.rescue;delete r.returnPosition;delete r.returnPhase;r.returnProgress=.48;
 const old=objectPose(m);step(m,{gripLeft:0,gripRight:0});const migrated=objectPose(m);for(const k of['x','y','z'])near(migrated[k],old[k]);
 const start=migrated.y;step(m,{rescueY:-1});assert.ok(objectPose(m).y>start);
});
test('键盘、箭头、鼠标与标准摇杆保留双向纵轴，提示不再把向下写成自动送回',()=>{
 const frame=emptyFrame();frame.left={x:.4,y:-.7};frame.triggers={left:.5,right:.6};assert.equal(rescueControls('gamepad',frame,new Set(),{}).rescueY,-.7);
 for(const key of['w','arrowup'])assert.equal(rescueControls('keyboard',frame,new Set([key]),{}).rescueY,-1);
 for(const key of['s','arrowdown'])assert.equal(rescueControls('keyboard',frame,new Set([key]),{}).rescueY,1);
 assert.equal(rescueControls('keyboard',frame,new Set(['w','s']),{}).rescueY,0);
 assert.equal(rescueControls('keyboard',frame,new Set(),{up:1,left:true}).rescueY,-1);
 assert.equal(rescueControls('keyboard',frame,new Set(),{down:1}).rescueY,1);
 assert.equal(rescueControls('keyboard',frame,new Set(),{}).rescueY,0);
 for(const pad of[true,false])assert.match(rescueHelp(held('vase').rescue,pad),/上下左右/);
});
