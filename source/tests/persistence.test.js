import test from 'node:test';
import assert from 'node:assert/strict';
import {readSession,readSettings,saveSession,DEFAULT_SETTINGS,SAVE_KEY,SETTINGS_KEY} from '../persistence.js';
import {Game} from '../engine.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('存储不可用时仍能开始游戏并使用默认设置',()=>{const storage={getItem(){throw Error('denied');},setItem(){throw Error('full');}},g=new Game();g.start();assert.equal(readSession(storage),null);assert.deepEqual(readSettings(storage),DEFAULT_SETTINGS);assert.equal(saveSession(storage,g,{}),false);});
test('无效关卡与损坏 JSON 不会成为 Start 的续玩入口',()=>{const s=memory();for(const value of ['{broken',JSON.stringify({version:2,game:{level:999,status:'won',time:20}})]){s.setItem(SAVE_KEY,value);assert.equal(readSession(s),null);}});
test('设置限制范围，正常进度保留视角与关卡',()=>{const s=memory();s.setItem(SETTINGS_KEY,JSON.stringify({master:99,ambience:-3,sensitivity:8,headBob:true}));assert.deepEqual(readSettings(s),{master:1,effects:.7,ambience:0,sensitivity:2,headBob:true});const g=new Game(1);g.start();saveSession(s,g,{yaw:.4,pitch:0,mode:'firstPerson',hasMoved:true});assert.equal(readSession(s).game.level,1);assert.equal(readSession(s).view.mode,'firstPerson');});
