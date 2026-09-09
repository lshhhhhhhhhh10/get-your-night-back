import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,HOME,PRESETS,playerBlocked,mapWidth,MAP_DEPTH,RECOGNITION_TIME,distance} from '../engine.js';
import {readSession} from '../persistence.js';
test('扩建地图中全部候选藏点可由玩家抵达并原路返程',()=>{
  for(let level=0;level<3;level++){
    const queue=[HOME],seen=new Set([`${HOME.x},${HOME.z}`]);
    for(let i=0;i<queue.length;i++){const p=queue[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz,k=`${x},${z}`;if(!seen.has(k)&&!playerBlocked(x,z,level)){seen.add(k);queue.push({x,z});}}}
    for(const[x,z,name]of PRESETS[level].spots)assert.ok(queue.some(p=>distance(p,{x,z})<=1),`${level}: ${name}`);
    assert.ok(queue.some(p=>p.x>14));assert.ok(seen.size>(level===0?115:220));
    assert.equal(mapWidth(level),level===0?19:24);assert.equal(MAP_DEPTH,19);
  }
});
test('蹲行可在任何位置开启，可以移动、开门和搜索',()=>{
  const g=new Game();g.start();g.hide();assert.equal(g.hidden,true);for(let i=0;i<30;i++)g.move(1,0,1/60);assert.ok(g.player.x>3.4&&g.player.x<3.6);
  g.player={x:3,z:11};g.action();assert.equal(g.mode.type,'door');g.cancel();g.player={x:16,z:3};g.action();assert.equal(g.mode.type,'search');
});
test('蹲行比站立更慢且更安静，离开家具遮挡仍会被看见',()=>{
  const a=new Game(),b=new Game();for(const g of[a,b]){g.start();g.player={x:3,z:12};}b.hide();
  for(let i=0;i<45;i++){a.move(1,0,1/60);b.move(1,0,1/60);}assert.ok(a.player.x>b.player.x+.6);assert.ok(a.parent.a>b.parent.a);
  b.parent={...b.parent,x:3,z:11,heading:0};assert.equal(b.visible(),true);
});
test('父母连续看见玩家四分之一秒就识别，预警仍保留五秒',()=>{
  const g=new Game(2);g.start();g.parent={...g.parent,state:'checking',x:3,z:8,heading:0,timer:8};g.player={x:3,z:9};for(let i=0;i<4;i++)g.tick(.05);assert.equal(g.status,'playing');g.tick(.05);assert.equal(g.status,'lost');assert.equal(RECOGNITION_TIME,.25);
  const h=new Game(2);h.start();h.beginWarning();assert.equal(h.parent.timer,5);assert.deepEqual(h.inspectionTarget,{x:16,z:3});
});
test('旧地图存档保留所在关卡，但不会把设备和搜索状态搬入新地图',()=>{
  const old={version:2,game:{level:2,status:'playing',hasDevice:true,time:100}};const s={getItem:k=>k==='night-back:save:v2'?JSON.stringify(old):null};const saved=readSession(s);assert.equal(saved.game.level,2);assert.equal(saved.game.status,'restart');assert.equal(saved.game.hasDevice,undefined);
});
test('扩建后的父母巡查路线避开柜子、桌子和洗衣机',()=>{
  const g=new Game(2);g.doors.forEach(d=>d.open=true);
  for(const target of[{x:16,z:3},{x:21,z:12},{x:11,z:16}]){const path=g.pathTo(target);assert.ok(path.length>0);assert.ok(path.every(p=>!playerBlocked(p.x,p.z,2)));}
});
