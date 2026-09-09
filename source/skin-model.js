import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
export function createSkinModel(template,id='scarf'){
  const root=new THREE.Group(),asset=clone(template);root.add(asset);root.userData.skinId=id;
  const ownedMaterial=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true});m.userData.skinOwned=true;return m;};
  const prop=(geometry,color,x,y,z)=>{const m=new THREE.Mesh(geometry,ownedMaterial(color));m.userData.skinOwned=true;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
  const box=(w,h,d,c,x,y,z)=>prop(new THREE.BoxGeometry(w,h,d),c,x,y,z);
  const ball=(r,c,x,y,z)=>prop(new THREE.SphereGeometry(r,12,8),c,x,y,z);
  if(['box','pillow','nightcap'].includes(id)){
    asset.traverse(o=>{
      if(!o.isMesh)return;
      if(/Hat|Scarf|Scarft/i.test(o.name)||id==='box'&&/HEAD/.test(o.name))o.visible=false;
      if(/CLOTHES|Belt/.test(o.name)){o.material=ownedMaterial(id==='box'?'#587d78':id==='pillow'?'#a87898':'#6688b3');}
    });
  }
  if(id==='box'){
    box(.69,.64,.66,'#be9460',0,1.27,0);
    for(const x of[-.17,.17])box(.12,.065,.014,'#302b2c',x,1.31,.338);
    box(.12,.018,.017,'#7a583b',0,1.1,.338);box(.10,.018,.67,'#ddbd86',0,1.598,0);
    box(.10,.64,.015,'#ddbd86',0,1.27,-.337);
    for(const x of[-.32,.32]){const flap=box(.12,.25,.66,'#cba574',x,1.03,0);flap.rotation.z=x<0?-.25:.25;}
  }
  if(id==='pillow'){
    const pillow=ball(.43,'#d2b9ce',0,.8,-.28);pillow.scale.set(.82,1.08,.35);pillow.rotation.z=.1;
    for(const x of[-.16,.16])box(.065,.51,.06,'#e7d4aa',x,.79,.23);
    for(const x of[-.32,.32]){const pad=ball(.135,'#ccafbb',x,1.29,0);pad.scale.set(.50,1,1);}
    const band=prop(new THREE.TorusGeometry(.33,.033,5,18,Math.PI),'#dbc8d0',0,1.3,0);
    for(const x of[-.17,.17])for(const y of[.57,1.01]){const tuft=ball(.035,'#b592b3',x,y,-.416);tuft.scale.z=.35;}
  }
  if(id==='nightcap'){
    const cap=prop(new THREE.ConeGeometry(.32,.47,10),'#7898c0',-.035,1.71,0);cap.rotation.z=.24;
    const rim=prop(new THREE.TorusGeometry(.285,.057,6,14),'#e7d6b3',0,1.49,0);rim.rotation.x=Math.PI/2;
    ball(.085,'#efdbad',-.095,1.95,0);
    for(const [x,y]of [[-.1,1.63],[.065,1.72]]){const star=box(.055,.055,.018,'#f5dfa6',x,y,.21);star.rotation.z=Math.PI/4;}
    for(const y of [.65,.79,.93])ball(.025,'#e6d6b6',0,y,.235);
  }
  return root;
}
export function disposeSkinModel(root){root?.traverse(o=>{if(o.userData.skinOwned)o.geometry?.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.skinOwned)m.dispose();o.skeleton?.dispose();});}
export function poseSkin(root,time=0){root.traverse(o=>{if(o.isBone&&(o.name==='ArmL'||o.name==='ArmR')){if(!o.userData.skinRest)o.userData.skinRest=o.quaternion.clone();o.quaternion.copy(o.userData.skinRest);o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),(o.name==='ArmL'?-1:1)*.72));o.rotateX(Math.sin(time*1.3)*.035);}});}
