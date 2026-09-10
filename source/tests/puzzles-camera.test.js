import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../engine.js';
import {locked,LOCKS} from '../lockpick.js';
import {finishLock} from './lockpick-helper.js';

import {cameraBlocked} from '../follow-camera.js';
import {createFurniture,animateFurniture} from '../furniture.js';
import {furnitureFor} from '../layout.js';
import {createMilkSkin} from '../milk-skins.js';
const tick=(g,t)=>{for(let n=0;n<t;n+=.05)g.tick(.05);};
test('三夜柜锁直接操作机械结构，空线索也可打开，之后才翻找',()=>{
 for(let level=0;level<3;level++){const g=new Game(level);g.start();const id=LOCKS[level][0],spot=g.spots.find(s=>s.id===id);g.beginLock(spot);assert.deepEqual(g.night.clues,[]);finishLock(g);assert.equal(g.mode.type,'search');assert.equal(g.mode.spot.id,id);assert.equal(locked(g,id),false);assert.equal(g.hasDevice,false);const h=new Game();assert.ok(h.restore(g.serialize()));assert.equal(locked(h,id),false);}
});
test('书架翻找完成后回探索，不再打开文字谜题',()=>{const g=new Game(2);g.start();g.player={x:16.5,z:4.3};g.action();assert.equal(g.mode.spot.id,'study-shelf');tick(g,6.1);assert.equal(g.mode,null);assert.ok(g.spots.find(s=>s.id==='study-shelf').searched);});
test('旧读题存档收起便条，旧柜锁存档迁移机械开锁，解锁成果保留',()=>{const g=new Game();g.start();const h=new Game();for(const id of ['bed-note','bad','lock:bad']){g.mode={type:'puzzle',puzzleId:id,elapsed:0};assert.ok(h.restore(g.serialize()));assert.equal(h.mode,null);}g.mode={type:'puzzle',puzzleId:'lock:study-search',elapsed:0};assert.ok(h.restore(g.serialize()));assert.equal(h.mode.type,'lockpick');assert.equal(h.mode.spot.id,'study-search');const data=g.serialize();data.night.unlocked=['bad','study-search','study-search'];assert.ok(h.restore(data));assert.equal(h.mode,null);assert.deepEqual(h.night.unlocked,['study-search']);});
test('跟随镜头会避让墙、家具与门，允许无遮挡的近景位置',()=>{const g=new Game();assert.equal(cameraBlocked({x:3,y:1.4,z:12},g),false);assert.equal(cameraBlocked({x:0,y:1.4,z:12},g),true);assert.equal(cameraBlocked({x:3,y:2.6,z:12},g),true);assert.equal(cameraBlocked({x:1.75,y:.5,z:12},g),true);assert.equal(cameraBlocked({x:3,y:1.3,z:10},g),true);g.doors[0].progress=1;assert.equal(cameraBlocked({x:3.2,y:1.3,z:10},g),false);});
test('抽屉具有真实内部与滑轨动作，翻书在取消后归位',()=>{for(const id of ['study-search','study-shelf']){const m=createFurniture(furnitureFor(2).find(f=>f.id===id));animateFurniture(m,1.5,true);if(id==='study-search')assert.ok(m.userData.drawers.every(d=>d.position.z>.3));else assert.ok(m.userData.books.some(b=>b.position.z>.1));animateFurniture(m,0,false);assert.ok((m.userData.drawers||m.userData.books).every(o=>o.position.z===0));}});
test('三套圆润皮肤有不同外形，四肢可动且尺寸适合门洞',()=>{for(const id of ['nailong','naiwa','naishu']){const m=createMilkSkin(id),b=new THREE.Box3().setFromObject(m),size=b.getSize(new THREE.Vector3());assert.ok(size.y>1.4&&size.y<2);assert.ok(size.x<1.2);assert.equal(m.userData.skinId,id);for(const bone of ['ArmL','ArmR','LegL','LegR'])assert.ok(m.getObjectByName(bone).isBone);}});
