import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LOCKS,puzzleFor} from '../puzzles.js';
import {Game,canStand,wall,distance} from '../engine.js';
import {furnitureFor,doorShape,circleHits,PARENT_HOME} from '../layout.js';
import {createFurniture} from '../furniture.js';
const tick=(g,t)=>{for(let n=0;n<t;n+=.05)g.tick(.05);};
test('家具模型占地与碰撞尺寸相符，且不穿进房间墙体',()=>{
 for(const f of furnitureFor(2)){
  const mesh=createFurniture(f);mesh.position.set(0,0,0);mesh.rotation.y=0;mesh.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(mesh);
  assert.ok(b.min.x>=-f.w/2-.075&&b.max.x<=f.w/2+.075&&b.min.z>=-f.d/2-.075&&b.max.z<=f.d/2+.075,`${f.id} 模型超出占地`);
  const a=f.yaw||0;for(let x=-f.w/2+.03;x<f.w/2;x+=.15)for(let z=-f.d/2+.03;z<f.d/2;z+=.15)assert.equal(wall(Math.round(f.x+x*Math.cos(a)+z*Math.sin(a)),Math.round(f.z-x*Math.sin(a)+z*Math.cos(a)),2),false,`${f.id} 穿墙`);
 }
});
test('移除旧整格空气墙；家具边缘按真实宽度阻挡',()=>{
 assert.equal(canStand(5.5,2,2),true);assert.equal(canStand(16,12,2),true);assert.equal(canStand(3,7,2),true);
 const g=new Game();assert.equal(g.canOccupy(3,10.35),true);assert.equal(g.canOccupy(3,10),false);
 g.doors[0].progress=.8;assert.equal(g.canOccupy(3.15,10),true);assert.equal(circleHits(doorShape(g.doors[0]),.2,doorShape(g.doors[0])),true);
});
test('三关可沿半格路径抵达每个藏点并触发搜索',()=>{
 for(let level=0;level<3;level++){const g=new Game(level);g.start();g.doors.forEach(d=>{d.open=true;d.progress=1;});
  for(const s of g.spots){g.parent={...g.parent,x:3,z:12};const path=g.pathTo(s);assert.ok(path.length);assert.ok(path.every(p=>g.canOccupy(p.x,p.z)));g.player={...path.at(-1)};g.action();if(g.mode?.type==='puzzle'){g.night.clues=['bed-note','living-note','shelf-note'];assert.equal(g.solvePuzzle(puzzleFor(g,g.mode.puzzleId).answer),true);}assert.equal(g.mode?.spot,s,`${level} ${s.name}`);g.cancel();}
 }
});
test('家长完成多个巡视地点、停看、推门和真实回程，无穿家具或瞬移',()=>{
 const g=new Game(2);g.start();g.player={x:4,z:12};g.beginWarning();const phases=new Set(),stops=new Set();let last={...g.parent};
 for(let t=0;t<160&&!g.visits;t+=.05){g.tick(.05);const p=g.parent;phases.add(p.phase);if(p.phase==='scan'&&p.state==='checking')stops.add(`${p.goal.x},${p.goal.z}`);assert.ok(distance(p,last)<.061);assert.ok(canStand(p.x,p.z,2,.23));assert.ok(!g.doors.some(d=>circleHits(p,.23,doorShape(d))));last={...p};}
 assert.equal(g.status,'playing');assert.equal(g.visits,1);assert.ok(stops.size>=3);for(const phase of['walk','scan','opening','rest'])assert.ok(phases.has(phase));assert.equal(distance(g.parent,PARENT_HOME),0);assert.equal(g.doors[1].open,true);
});
test('调查记住最后明显声源，轻脚步不会不断追踪；新响声打断回程',()=>{
 const g=new Game(2);g.start();g.parent.state='checking';g.parent.intent='investigate';g.setDestination({x:3,z:9});g.player={x:16,z:3};g.makeNoise(50,'响声');assert.deepEqual(g.parent.goal,{x:16,z:3});g.player={x:11,z:12};g.makeNoise(1,'轻脚步');assert.deepEqual(g.parent.goal,{x:16,z:3});tick(g,1.3);g.parent.state='returning';g.makeNoise(50,'新响声');assert.equal(g.parent.state,'checking');assert.deepEqual(g.parent.goal,{x:11,z:12});
 const h=new Game();assert.equal(h.restore(g.serialize()),true);assert.deepEqual(h.parent,g.parent);
});
