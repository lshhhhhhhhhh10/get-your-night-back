import * as THREE from 'three';
const material=(color,metalness=0,roughness=.72)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:true});
export function createVase(){
 const g=new THREE.Group(),glaze=material('#729caa',.12,.3),cream=material('#e7d7b3',.08,.4);
 const points=[[.11,-.22],[.19,-.18],[.235,-.04],[.22,.10],[.14,.20],[.095,.27],[.105,.35],[.087,.37],[.071,.34],[.073,.26]].map(p=>new THREE.Vector2(...p));
 const body=new THREE.Mesh(new THREE.LatheGeometry(points,14),glaze);g.add(body);
 for(const [y,r,h]of [[-.19,.145,.045],[.09,.214,.05],[.345,.107,.025]]){const band=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,14),cream);band.position.y=y;g.add(band);}
 const flowers=new THREE.Group();flowers.position.y=.27;g.add(flowers);g.userData.flowers=flowers;
 for(let i=0;i<3;i++){
  const stem=new THREE.Group();stem.position.set((i-1)*.055,0,0);stem.rotation.z=(i-1)*.32;flowers.add(stem);const height=.33+i*.065;
  const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.009,.013,height,5),material('#7f997b'));stalk.position.y=height/2;stem.add(stalk);
  const leaf=new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),material('#89a486'));leaf.position.set(.045,height*.48,0);leaf.scale.set(1,.4,.25);leaf.rotation.z=.55;stem.add(leaf);
  const head=new THREE.Group();head.position.y=height;head.rotation.x=.5;stem.add(head);
  for(let j=0;j<6;j++){const a=j/6*Math.PI*2,petal=new THREE.Mesh(new THREE.SphereGeometry(.065,6,4),cream);petal.position.set(Math.cos(a)*.058,Math.sin(a)*.058,.012);petal.scale.set(.8,1,.32);petal.rotation.z=a-Math.PI/2;head.add(petal);}
  const center=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),material('#d5a65a'));center.scale.z=.5;head.add(center);
 }
 return g;
}
export function createPencil(index=0){
 const g=new THREE.Group(),colors=['#dcb469','#86aaa1','#ce8670'];
 function part(geometry,c,y){const m=new THREE.Mesh(geometry,material(c));m.position.y=y;g.add(m);return m;}
 part(new THREE.CylinderGeometry(.026,.026,.39,6),colors[index%3],0);
 part(new THREE.CylinderGeometry(.027,.027,.048,8),'#bdc6bd',-.204);
 part(new THREE.CylinderGeometry(.027,.027,.037,8),'#dca395',-.245);
 part(new THREE.ConeGeometry(.027,.075,6),'#dfc499',.232);
 part(new THREE.ConeGeometry(.009,.025,6),'#344454',.266);
 for(const y of[-.19,-.21])part(new THREE.CylinderGeometry(.028,.028,.007,8),'#8a9997',y);
 return g;
}
