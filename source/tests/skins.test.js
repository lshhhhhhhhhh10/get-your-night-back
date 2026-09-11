import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SKINS,SKIN_KEY,readSkin,saveSkin,skinById} from '../skins.js';
import {createSkinModel,disposeSkinModel,poseSkin} from '../skin-model.js';
import {Game} from '../engine.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('十一个外观使用稳定标识与本地资源，未知与损坏选择回到默认',()=>{
 assert.equal(SKINS.length,11);assert.equal(new Set(SKINS.map(s=>s.id)).size,11);for(const s of SKINS)assert.ok(s.model.startsWith('assets/models/'));
 const s=storage();for(const value of ['{bad',JSON.stringify({id:'missing'}),'null']){s.setItem(SKIN_KEY,value);assert.equal(readSkin(s),'scarf');}assert.equal(skinById('missing').id,'scarf');
});
test('外观保存独立于游戏进度，无效选择与不可用存储安全返回',()=>{
 const s=storage(),g=new Game();g.start();const before=JSON.stringify(g.serialize());
 s.setItem('night-back:save:v4',before);assert.equal(saveSkin(s,'chef'),true);assert.equal(readSkin(s),'chef');assert.equal(s.getItem('night-back:save:v4'),before);
 assert.equal(saveSkin(s,'unknown'),false);assert.equal(readSkin(s),'chef');const unavailable={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.equal(saveSkin(unavailable,'box'),false);assert.equal(readSkin(unavailable),'scarf');
});
test('外观材质和可见性不污染模板或其他角色，清理不销毁共享贴图',()=>{
 const template=new THREE.Group(),material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry();let disposed=false;material.addEventListener('dispose',()=>disposed=true);
 for(const name of ['HEAD','Hat','CLOTHES']){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;template.add(mesh);}
 const box=createSkinModel(template,'box'),plain=createSkinModel(template,'scarf');assert.equal(box.getObjectByName('HEAD').visible,false);assert.equal(plain.getObjectByName('HEAD').visible,true);assert.equal(template.getObjectByName('Hat').visible,true);
 assert.notEqual(box.getObjectByName('CLOTHES').material,material);disposeSkinModel(box);assert.equal(disposed,false);assert.equal(plain.getObjectByName('CLOTHES').material,material);
});
test('三种改装有独立配件，预览姿态不逐帧累积旋转',()=>{
 const template=new THREE.Group(),bone=new THREE.Bone();bone.name='ArmL';template.add(bone);
 for(const id of ['box','pillow','nightcap']){const model=createSkinModel(template,id);assert.ok(model.children.length>3);poseSkin(model,0);const q=model.getObjectByName('ArmL').quaternion.clone();for(let i=0;i<50;i++)poseSkin(model,0);assert.ok(q.angleTo(model.getObjectByName('ArmL').quaternion)<1e-7);disposeSkinModel(model);}
});
