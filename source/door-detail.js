import * as THREE from 'three';
// Details attach to the actual rotating leaf; the door gap remains the real room.
export function addDoorDetail(pivot){
  const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72});m.userData.nightOwned=true;return m;};
  const skin=material('#e1bf98'),cloth=material('#839cab'),metal=material('#8f8264');
  const shape=(geometry,mat,parent,x,y,z)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  const hinges=[];
  for(const y of [.42,1.75]){const g=new THREE.Group();g.position.set(0,y,0);pivot.add(g);hinges.push(g);shape(new THREE.CylinderGeometry(.024,.024,.18,10),metal,g,0,0,.077);for(const yy of[-.055,.055])shape(new THREE.SphereGeometry(.01,6,4),metal,g,.06,yy,.077);shape(new THREE.BoxGeometry(.11,.16,.015),metal,g,.04,0,.067);}
  const hands=new THREE.Group();pivot.add(hands);hands.visible=false;
  for(let i=0;i<2;i++){const hand=new THREE.Group();hand.position.set(i?.45:.81,i?1.22:1.03,0);hands.add(hand);
    const palm=shape(new THREE.SphereGeometry(1,12,8),skin,hand,0,0,0);palm.scale.set(.065,.082,.032);
    for(let n=0;n<4;n++){const finger=shape(new THREE.CapsuleGeometry(.014,i?.075:.045,3,6),skin,hand,(n-1.5)*.030,.075,-.015);finger.rotation.x=i?-.1:-.65;}
    const thumb=shape(new THREE.CapsuleGeometry(.019,.052,3,6),skin,hand,-.069,0,-.013);thumb.rotation.z=-.7;
    const sleeve=shape(new THREE.CylinderGeometry(.055,.105,.85,10),cloth,hand,0,-.30,.33);sleeve.rotation.x=-.85;
  }
  return {hands,hinges};
}
export function animateDoorDetail(detail,drive,side,time){
  detail.hands.visible=!!drive;
  for(const hinge of detail.hinges)hinge.rotation.z=drive?.moving?Math.sin(time*65)*(drive.roughness||0)*.025:0;
  if(!drive)return;
  detail.hands.scale.z=side;detail.hands.position.z=side*.14;
  const shake=drive.moving?drive.roughness*Math.sin(time*53)*.006:0;
  detail.hands.children.forEach((hand,i)=>{hand.position.z=shake+(i?-.015:0);hand.rotation.x=-drive.pressure*.14;hand.rotation.z=(i?1:-1)*drive.pressure*.07+shake;});
}
