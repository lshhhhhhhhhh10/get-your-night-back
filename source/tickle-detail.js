import * as THREE from 'three';
import {TICKLE_TARGET} from './tickle.js';
export function createTickleHands(){
  const root=new THREE.Group();root.position.set(TICKLE_TARGET.x,.89,TICKLE_TARGET.z+.1);
  const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9});m.userData.nightOwned=true;return m;};
  const skin=material('#e1bf98'),cloth=material('#839cab');
  for(const sign of[-1,1]){const hand=new THREE.Group();root.add(hand);hand.position.x=sign*.19;
    const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),skin);palm.scale.set(.075,.035,.10);hand.add(palm);
    const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.055,.1,.52,10),cloth);sleeve.rotation.x=Math.PI/2;sleeve.position.set(sign*.03,-.06,.30);hand.add(sleeve);
    for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.014,.09,3,6),skin);finger.position.set((i-1.5)*.033,0,-.1);finger.rotation.x=Math.PI/2;finger.userData.finger=i+1;hand.add(finger);}
    const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.02,.05,3,6),skin);thumb.position.set(-sign*.08,0,-.01);thumb.rotation.z=sign*.8;hand.add(thumb);
  }
  return root;
}
export function animateTickleHands(root,mode,time){
  root.visible=mode?.type==='tickle';if(!root.visible)return;
  for(const[side,hand]of root.children.entries()){hand.position.z=mode.moving?Math.sin(time*9+side)*.03:0;hand.position.y=mode.moving?mode.pressure*.025:-.035;
    for(const mesh of hand.children)if(mesh.userData.finger)mesh.rotation.x=Math.PI/2+(mode.moving?Math.sin(time*24+mesh.userData.finger+side)*.48:0);}
}
