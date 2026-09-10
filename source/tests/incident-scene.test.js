import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFurniture} from '../furniture.js';
import {applyIncidentResult} from '../incident-props.js';
import {IncidentCamera} from '../cinematic.js';
import {stationFurniture,STATIONS,restingPencil,SURFACE_Y} from '../incident-setting.js';
import {objectPose,pencilPose,cupPose,armJoints} from '../incident-motion.js';
import {newRescue,advanceRescue} from '../rescue.js';
import {rescueStep} from './rescue-helper.js';
import {Game} from '../engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const ids={vase:'vase',fork:'kitchen-search',pencils:'study-search',tin:'storage-search'};
function finish(kind){const r=newRescue(kind,7);let t=0;for(let i=0;i<500;i++){t+=.02;const result=advanceRescue(r,rescueStep(r),.02,t);if(result.done){assert.ok(result.success);return {type:'reaction',rescue:r,elapsed:0,sourceElapsed:t,success:true,incidentId:ids[kind]};}}assert.fail('rescue did not finish');}

test('远景和特写共用实际家具尺寸、装饰及归位坐标，装饰不伸出碰撞占地',()=>{
 const camera=new IncidentCamera();
 for(const [kind,s]of Object.entries(STATIONS)){
  const f=stationFurniture(kind),world=createFurniture({...f,x:0,z:0,yaw:0}),close=camera.stations.get(kind),a=world.userData.incident,b=close.userData.incident;
  near(a.object.position.y,s.rest.y);assert.equal(a.frame.children.length,b.frame.children.length);
  world.updateMatrixWorld(true);close.updateMatrixWorld(true);
  const p=a.object.getWorldPosition(new THREE.Vector3()),q=b.object.getWorldPosition(new THREE.Vector3());near(p.y-f.h,q.y-SURFACE_Y);near(p.x-s.x,q.x);near(p.z-s.z,q.z);
  const bounds=new THREE.Box3().setFromObject(a.frame);assert.ok(bounds.min.x>=-f.w/2-.02&&bounds.max.x<=f.w/2+.02,kind+' width');assert.ok(bounds.min.z>=-f.d/2-.02&&bounds.max.z<=f.d/2+.02,kind+' depth');
 }
});
test('四种救场结束位置与远景原位一致；铅笔真实插回杯口',()=>{
 for(const kind of Object.keys(STATIONS)){
  const m=finish(kind),f=stationFurniture(kind),world=createFurniture(f).userData.incident;
  const start=kind==='pencils'?cupPose(m):objectPose(m),before=kind==='pencils'?cupPose({...m,type:'catch',elapsed:m.sourceElapsed}):objectPose({...m,type:'catch',elapsed:m.sourceElapsed});for(const k of['x','y','z','rx','rz'])near(start[k],before[k]);
  m.elapsed=1.24;const p=kind==='pencils'?cupPose(m):objectPose(m);for(const k of['x','y','z'])near(p[k],world.object.position[k]);near(p.rx,world.object.rotation.x);near(p.rz,world.object.rotation.z);
  if(kind==='pencils')for(let i=0;i<3;i++){const p=pencilPose(m.rescue.pencils[i],i,m),rest=restingPencil(i);for(const k of['x','y','z','rx','ry','rz'])near(p[k],rest[k]);}
 }
});
test('归位包含向后送回和抬起越过桌沿，松开推进／暂停不会继续归位',()=>{
 const g=new Game();g.start();g.beginIncident('vase');for(let i=0;i<150&&g.mode.rescue.stage!=='lower';i++){const r=g.mode.rescue;g.tick(.02,{rescueX:Math.max(-1,Math.min(1,(r.objectX-r.handX)*7)),gripLeft:.5,gripRight:.5});}
 const r=g.mode.rescue;assert.equal(r.stage,'lower');const first=objectPose(g.mode);for(let i=0;i<40;i++)g.tick(.02,{gripLeft:.5,gripRight:.5,rescueY:-1});const middle=objectPose(g.mode);assert.ok(middle.z<first.z-.08);assert.ok(middle.y>first.y+.07);
 const progress={...r.returnPosition};g.tick(.02,{gripLeft:.5,gripRight:.5});assert.deepEqual(r.returnPosition,progress);const saved=g.serialize(),h=new Game();assert.ok(h.restore(structuredClone(saved)));assert.deepEqual(objectPose(h.mode),objectPose(g.mode));g.active=false;g.tick(.05,{rescueY:-1});assert.deepEqual(g.serialize(),saved);
});
test('手臂骨段长度固定、归还到台面上方时无肘部穿台，窄屏也不会拉长',()=>{
 for(const kind of Object.keys(STATIONS)){
  const c=new IncidentCamera(),m=finish(kind);
  for(const aspect of[1440/1000,390/844])for(const elapsed of[0,.35,.8,1.12]){
   m.elapsed=elapsed;c.render({render(){}},m,aspect);
   for(const a of c.arms){near(a.sleeve.scale.y,.27);near(a.upper.scale.y,.30);assert.ok(Number.isFinite(a.sleeve.position.y));}
  }
 }
 for(const sign of[-1,1]){const wrist={x:sign*.2,y:.17,z:-.10},j=armJoints(wrist,sign,true);assert.ok(j.elbow.y>.13);near(Math.hypot(j.elbow.x-wrist.x,j.elbow.y-wrist.y,j.elbow.z-wrist.z),.27);}
});
test('漏接结果回到远景和续玩后仍在地上，部分接住的笔保留在笔筒里',()=>{
 const g=new Game(1);g.start();g.beginIncident('study-search');
 const r=g.mode.rescue;r.pencils.forEach((p,i)=>{p.state=i===1?'caught':'fallen';p.resolvedAt=p.at;});r.handX=.48;g.mode.elapsed=4.6;g.resolveIncident(false,{noiseFactor:2/3});
 const restored=new Game();assert.ok(restored.restore(g.serialize()));assert.deepEqual(restored.incidentResults,g.incidentResults);
 const furniture=createFurniture(stationFurniture('pencils'));applyIncidentResult(furniture,restored.incidentResults['study-search']);furniture.updateMatrixWorld(true);
 const points=furniture.userData.incident.pencils.map(p=>p.getWorldPosition(new THREE.Vector3()));assert.ok(points[0].y<.05&&points[2].y<.05);assert.ok(points[1].y>1);
 const old=g.serialize();delete old.incidentResults;assert.ok(restored.restore(old));assert.deepEqual(restored.incidentResults,{});
});
test('提前取消拦笔时，尚未判定的笔从当前位置连续掉落，不在续玩中复原',()=>{
 const g=new Game(1);g.start();g.beginIncident('study-search');g.mode.elapsed=.12;const first=g.mode.rescue.pencils[0],before=pencilPose(first,0,g.mode);g.cancel();const after=pencilPose(first,0,g.mode);for(const k of['x','y','z','rx','ry'])near(before[k],after[k]);
 const f=createFurniture(stationFurniture('pencils'));applyIncidentResult(f,g.incidentResults['study-search']);f.updateMatrixWorld(true);for(const p of f.userData.incident.pencils)assert.ok(p.getWorldPosition(new THREE.Vector3()).y<.05);
});
