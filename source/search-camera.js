import * as THREE from 'three';
import {applyIncidentResult} from './incident-props.js';
import {furnitureFor} from './layout.js';
import {createFurniture,animateFurniture} from './furniture.js';
export class SearchCamera{
 constructor(){this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#142235');this.camera=new THREE.PerspectiveCamera(48,1,.035,20);this.scene.add(new THREE.HemisphereLight(0xc4dbff,0x344258,2.5));const light=new THREE.DirectionalLight(0xffd3a0,3);light.position.set(-2,4,3);this.scene.add(light);this.cache=new Map();this.hands=new THREE.Group();this.scene.add(this.hands);
  for(const x of[-.28,.28]){const hand=new THREE.Group();hand.position.x=x;this.hands.add(hand);const mat=new THREE.MeshStandardMaterial({color:'#dfbe96',roughness:.9});const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat);palm.scale.set(.10,.05,.14);hand.add(palm);for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.021,.12,3,6),mat);finger.rotation.x=Math.PI/2;finger.position.set((i-1.5)*.043,0,-.12);hand.add(finger);}const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.083,.07,.38,10),new THREE.MeshStandardMaterial({color:'#7f9bab'}));sleeve.rotation.x=Math.PI/2;sleeve.position.z=.25;hand.add(sleeve);}
 }
 render(renderer,mode,level,aspect,result){const f=furnitureFor(level).find(f=>f.id===mode.spot.id);if(!f)return;let prop=this.cache.get(f.id);if(!prop){prop=createFurniture({...f,x:0,z:0,yaw:0});this.cache.set(f.id,prop);this.scene.add(prop);}for(const p of this.cache.values())p.visible=p===prop;if(prop.userData.padlock)prop.userData.padlock.visible=false;
  applyIncidentResult(prop,result);const t=mode.elapsed,shelf=f.type==='shelf',progress=Math.min(1,t/.85),h=shelf?f.h*.52:f.h*.7;
  animateFurniture(prop,t,true);this.hands.position.set(0,h-.035,f.d/2+.18);this.hands.visible=t>.35;
  this.hands.children.forEach((hand,i)=>{hand.position.y=Math.sin(t*6+i*Math.PI)*.05;hand.position.z=Math.sin(t*5+i*Math.PI)*.11;hand.rotation.x=-.22+Math.sin(t*5+i)*.12;hand.rotation.z=Math.sin(t*4+i*2)*.13;});
  this.camera.position.set(.08,h+(shelf?.62:1.08),Math.max(1.7,f.d+1.3)+(.5*(1-progress)));this.camera.lookAt(0,h,f.d*.25);this.camera.aspect=aspect;this.camera.updateProjectionMatrix();renderer.render(this.scene,this.camera);
 }
}
