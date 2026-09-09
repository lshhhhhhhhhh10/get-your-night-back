import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../engine.js';
function approach(){const g=new Game();g.start();g.doors[0].open=true;g.player={x:3,z:9.7};g.footTile='3,10';for(let i=0;i<40&&!g.mode;i++)g.move(0,-1,1/60);return g;}
test('踩上松动木板先有受力吱声，成功落脚仍有轻微吱呀声',()=>{const g=approach();assert.equal(g.mode.type,'step');assert.ok(g.events.some(e=>e.kind==='floorPressure'));g.events=[];g.pointer=.5;g.pressSpace();assert.ok(g.events.some(e=>e.kind==='floorSoft'));assert.equal(g.noise,5);});
test('失误落脚播放较强木板吱声，保持原有警觉风险',()=>{const g=approach();g.events=[];g.pointer=.99;g.pressSpace();assert.ok(g.events.some(e=>e.kind==='floorCreak'));assert.equal(g.noise,50);assert.equal(g.status,'playing');});
