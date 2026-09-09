import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../engine.js';
import {puzzleFor,locked,LOCKS} from '../puzzles.js';
import {CLUES,clueText} from '../night-tools.js';
import {cameraBlocked} from '../follow-camera.js';
import {createFurniture,animateFurniture} from '../furniture.js';
import {furnitureFor} from '../layout.js';
import {createMilkSkin} from '../milk-skins.js';
const tick=(g,t)=>{for(let n=0;n<t;n+=.05)g.tick(.05);};
test('三关都必须整理便条才能看到线索；错误答案不泄露、不误记',()=>{
 for(let l=0;l<3;l++){const g=new Game(l);g.start();for(const c of CLUES.slice(0,2)){g.player={x:c.x,z:c.z+.75};g.action();assert.equal(g.mode.puzzleId,c.id);assert.ok(!g.night.clues.includes(c.id));assert.equal(g.solvePuzzle([99]),false);assert.equal(g.solvePuzzle(puzzleFor(g,c.id).answer),true);assert.ok(g.night.clues.includes(c.id));}
 assert.match(clueText(l,'living-note'),new RegExp(['书房','储物','洗衣'][l]));}
});
test('柜锁不能绕过线索，逐关需要一、二、三处证据，开锁后继续搜索',()=>{
 for(let l=0;l<3;l++){const g=new Game(l);g.start();const id=LOCKS[l][0],p=puzzleFor(g,'lock:'+id);g.mode={type:'puzzle',puzzleId:p.id};assert.equal(p.required.length,l+1);assert.equal(g.solvePuzzle(p.answer),false);g.night.clues=[...p.required];assert.equal(g.solvePuzzle(p.answer.slice().reverse()),false);assert.equal(g.solvePuzzle(p.answer),true);assert.equal(locked(g,id),false);assert.equal(g.mode.type,'search');assert.equal(g.mode.spot.id,id);assert.equal(g.hasDevice,false);
 const h=new Game();assert.equal(h.restore(g.serialize()),true);assert.equal(locked(h,id),false);assert.equal(h.mode.spot.id,id);h.reset(l);assert.equal(locked(h,id),true);}
});
test('书架要实际翻找六秒再解读夹页，取消与恢复无永久卡死',()=>{
 const g=new Game(2);g.start();g.player={x:16.5,z:4.3};g.action();assert.equal(g.mode.spot.id,'study-shelf');tick(g,3);assert.equal(g.night.clues.length,0);const h=new Game();assert.equal(h.restore(g.serialize()),true);h.active=true;tick(h,3.1);assert.equal(h.mode.puzzleId,'shelf-note');h.cancel();h.action();assert.equal(h.mode.type,'search');tick(h,6.1);assert.ok(h.solvePuzzle(puzzleFor(h,'shelf-note').answer));assert.ok(h.spots.find(s=>s.id==='study-shelf').searched);assert.ok(h.night.clues.includes('shelf-note'));
});
test('恢复读题状态、损坏的谜题 ID 和解锁字段安全处理',()=>{
 const g=new Game();g.start();g.mode={type:'puzzle',puzzleId:'bed-note',elapsed:0};const h=new Game();assert.ok(h.restore(g.serialize()));assert.equal(h.mode.puzzleId,'bed-note');const bad=g.serialize();bad.mode.puzzleId='bad';bad.night.unlocked=['bad','study-search','study-search'];assert.ok(h.restore(bad));assert.equal(h.mode,null);assert.deepEqual(h.night.unlocked,['study-search']);
});
test('跟随镜头会避让墙、家具与门，允许无遮挡的近景位置',()=>{const g=new Game();assert.equal(cameraBlocked({x:3,y:1.4,z:12},g),false);assert.equal(cameraBlocked({x:0,y:1.4,z:12},g),true);assert.equal(cameraBlocked({x:3,y:2.6,z:12},g),true);assert.equal(cameraBlocked({x:1.75,y:.5,z:12},g),true);assert.equal(cameraBlocked({x:3,y:1.3,z:10},g),true);g.doors[0].progress=1;assert.equal(cameraBlocked({x:3.2,y:1.3,z:10},g),false);});
test('抽屉具有真实内部与滑轨动作，翻书在取消后归位',()=>{for(const id of ['study-search','study-shelf']){const m=createFurniture(furnitureFor(2).find(f=>f.id===id));animateFurniture(m,1.5,true);if(id==='study-search')assert.ok(m.userData.drawers.every(d=>d.position.z>.3));else assert.ok(m.userData.books.some(b=>b.position.z>.1));animateFurniture(m,0,false);assert.ok((m.userData.drawers||m.userData.books).every(o=>o.position.z===0));}});
test('三套圆润皮肤有不同外形，四肢可动且尺寸适合门洞',()=>{for(const id of ['nailong','naiwa','naishu']){const m=createMilkSkin(id),b=new THREE.Box3().setFromObject(m),size=b.getSize(new THREE.Vector3());assert.ok(size.y>1.4&&size.y<2);assert.ok(size.x<1.2);assert.equal(m.userData.skinId,id);for(const bone of ['ArmL','ArmR','LegL','LegR'])assert.ok(m.getObjectByName(bone).isBone);}});
