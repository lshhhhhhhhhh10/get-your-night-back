import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {animateReferenceSkin} from '../reference-skin-animation.js';
import {createSkinModel,poseSkin} from '../skin-model.js';
function glb(id){
 const bytes=readFileSync(new URL(`../../assets/models/${id}.glb`,import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
 const size=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+size).toString());
 const bin=bytes.subarray(28+size);
 const accessor=index=>{const a=json.accessors[index],v=json.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],width={5121:1,5123:2,5125:4,5126:4}[a.componentType],offset=(a.byteOffset||0)+(v.byteOffset||0),values=[];
 for(let i=0;i<a.count;i++){const row=[];for(let j=0;j<n;j++){const pos=offset+i*(v.byteStride||n*width)+j*width;let x=a.componentType===5126?bin.readFloatLE(pos):width===1?bin.readUInt8(pos):width===2?bin.readUInt16LE(pos):bin.readUInt32LE(pos);if(a.normalized)x/=width===1?255:65535;row.push(x);}values.push(row);}return values;};
 return {json,accessor};
}
for(const id of ['golden-frog','golden-bull'])test(`${id} 实际 GLB 包含可用蒙皮、完整权重与四条关节动作`,()=>{
 const {json,accessor}=glb(id);assert.ok(json.skins.length>=1);const skin=json.skins[0];assert.ok(skin.joints.length>=30);
 for(const name of ['Head','ForearmL','HandR','ShinL','FootR'])assert.ok(skin.joints.some(i=>json.nodes[i].name===name),name);
 const names=json.animations.map(a=>a.name);for(const name of ['Idle','Walk','Crouch','Reach'])assert.ok(names.includes(name),names.join(','));
 for(const m of json.meshes)for(const p of m.primitives){assert.ok(p.attributes.WEIGHTS_0!==undefined);const weights=accessor(p.attributes.WEIGHTS_0),joints=accessor(p.attributes.JOINTS_0);assert.equal(weights.length,joints.length);weights.forEach((w,i)=>{assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<.002);assert.ok(w.every(Number.isFinite));assert.ok(joints[i].every(j=>j<skin.joints.length));});}
 assert.ok((json.images||[]).every(i=>i.bufferView!==undefined),'no external texture dependencies');
 if(id==='golden-bull')assert.ok(json.materials.some(m=>m.normalTexture)&&json.images.length>0,'fleece normal texture embedded');
 if(id==='golden-bull'){
  const fur=json.materials.findIndex(m=>m.name==='fur'),torso=new Set(skin.joints.map((n,i)=>['Spine','Hips','Chest'].includes(json.nodes[n].name)?i:-1));
  const p=json.meshes.flatMap(m=>m.primitives).find(p=>p.material===fur),uv=accessor(p.attributes.TEXCOORD_0),w=accessor(p.attributes.WEIGHTS_0),j=accessor(p.attributes.JOINTS_0);
  const bodyUV=uv.filter((_,i)=>j[i].some((joint,k)=>torso.has(joint)&&w[i][k]>.6));assert.ok(bodyUV.length>100);assert.ok([0,1].every(axis=>Math.max(...bodyUV.map(v=>v[axis]))-Math.min(...bodyUV.map(v=>v[axis]))>.1),'torso shares the material UV set rather than a zero-filled localized layer');
 }
 const walk=json.animations.find(a=>a.name==='Walk');assert.ok(walk.channels.some(c=>json.nodes[c.target.node].name==='ShinL'));
 assert.ok(walk.samplers.some(s=>{const v=accessor(s.output);return v.length>2&&v.some(row=>row.some((x,j)=>Math.abs(x-v[0][j])>.01));}),'actual keyed motion');
});
test('新骨架保留自然垂臂，预览不累积旋转且角色实例相互独立',()=>{
 const template=new THREE.Group();for(const name of ['ArmL','ShinL','Tail']){const b=new THREE.Bone();b.name=name;b.rotation.x=.1;template.add(b);}
 const a=createSkinModel(template,'golden-bull'),b=createSkinModel(template,'golden-bull');poseSkin(a,0);assert.ok(a.getObjectByName('ArmL').quaternion.angleTo(template.getObjectByName('ArmL').quaternion)<1e-7);
 animateReferenceSkin(a,{time:1,phase:Math.PI*1.5,moving:true});const q=a.getObjectByName('ShinL').quaternion.clone();for(let i=0;i<100;i++)animateReferenceSkin(a,{time:1,phase:Math.PI*1.5,moving:true});assert.ok(q.angleTo(a.getObjectByName('ShinL').quaternion)<1e-7);assert.ok(q.angleTo(b.getObjectByName('ShinL').quaternion)>.1);
 animateReferenceSkin(a,{time:0});assert.ok(a.getObjectByName('ShinL').quaternion.angleTo(b.getObjectByName('ShinL').quaternion)<1e-7);
});
