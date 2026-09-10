import * as THREE from 'three';
import {STATIONS,SURFACE_Y,restingPencil} from './incident-setting.js';
import {objectPose,cupPose,pencilPose,REACTION_DURATION} from './incident-motion.js';
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
 g.scale.setScalar(.68);return g;
}

function box(parent,w,h,d,color,x=0,y=0,z=0,metal=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,metal,metal?.3:.72));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function cylinder(parent,rt,rb,h,color,x=0,y=0,z=0,metal=0){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,16),material(color,metal));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
export function createIncidentObject(kind){
 if(kind==='vase')return createVase();
 const g=new THREE.Group();
 if(kind==='fork'){
  box(g,.028,.22,.014,'#c8d6de',0,-.025,0,.8);box(g,.084,.043,.018,'#c8d6de',0,.095,0,.8);
  for(let i=0;i<4;i++)box(g,.011,.085,.013,'#c8d6de',-.034+i*.023,.148,0,.8);
  box(g,.014,.13,.003,'#9baeb8',0,-.04,.008,.65);
 }
 if(kind==='pencils'){
  // Open cup: a real inner wall and base, so pencils can visibly return inside.
  const points=[[.087,-.13],[.12,-.115],[.133,.12],[.122,.139],[.111,.126],[.101,-.104],[0,-.104]].map(p=>new THREE.Vector2(...p));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(points,16),material('#b78872')));
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.121,.012,6,24),material('#d7ba91'));rim.rotation.x=Math.PI/2;rim.position.y=.125;g.add(rim);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(g,.009,.19,.01,'#ccab8a',Math.sin(a)*.119,-.004,Math.cos(a)*.119);}
 }
 if(kind==='tin'){
  box(g,.43,.36,.32,'#8fa7b2');box(g,.438,.018,.328,'#c8d6de',0,-.18,0,.55);
  const lid=new THREE.Group();lid.position.y=.198;g.add(lid);g.userData.lid=lid;
  box(lid,.46,.032,.35,'#c8d6de',0,0,0,.65);box(lid,.41,.008,.30,'#8fa7b2',0,.022,0,.3);
  for(const x of[-.17,.17])box(g,.028,.12,.012,'#c8d6de',x,0,.165,.65);
  box(g,.22,.13,.006,'#d8c6a1',0,.01,.169);for(let i=0;i<3;i++)box(g,.13-i*.02,.006,.002,'#938570',0,.045-i*.027,.174);
  box(g,.057,.045,.025,'#d7ba91',0,.16,.173,.45);
 }
 return g;
}

// This dressing is attached to the real furniture in every camera, including
// its grain, bevel strips, tray, companion objects and exact rest transforms.
export function addIncidentDressing(f,furniture){
 const entry=Object.entries(STATIONS).find(([,s])=>s.id===f.id);if(!entry)return;
 const [kind,s]=entry,g=new THREE.Group();g.position.set(s.x,f.h-SURFACE_Y,s.z);furniture.add(g);
 const wood=kind==='fork'?'#c3b698':'#d0ad86';
 for(const z of[-f.d/2+.018,f.d/2-.018])box(furniture,f.w-.03,.021,.022,wood,0,f.h-.025,z);
 for(let i=1;i<5;i++)box(furniture,.004,.001,f.d-.07,'#947758',-f.w/2+f.w*i/5,f.h+.003,0);
 if(kind==='vase'){
  cylinder(g,.259,.259,.012,'#bec6b5',0,.091,0);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.237,.005,4,32),material('#d7c59f'));ring.rotation.x=Math.PI/2;ring.position.y=.099;g.add(ring);
 }
 if(kind==='fork'){
  box(g,.63,.016,.57,'#7b8e91',0,.093,0);
  for(const x of[-.315,-.17,.025,.17,.315])box(g,.017,.052,.57,'#bdc7bd',x,.123,0);
  for(const z of[-.282,.282])box(g,.645,.052,.015,'#bdc7bd',0,.123,z);
  // Other cutlery gives the recovered fork a recognizable empty slot.
  const spare=createIncidentObject('fork');spare.position.set(.095,.123,0);spare.rotation.x=Math.PI/2;g.add(spare);
  for(const z of[-.10,.08]){const spoon=new THREE.Group();box(spoon,.023,.23,.012,'#c8d6de',0,0,0,.75);const bowl=new THREE.Mesh(new THREE.SphereGeometry(.048,12,8),material('#c8d6de',.7,.25));bowl.scale.set(.7,1,.17);bowl.position.y=.15;spoon.add(bowl);spoon.rotation.x=Math.PI/2;spoon.position.set(.242,.12,z);g.add(spoon);}
 }
 if(kind==='pencils'){
  const notebook=box(g,.46,.027,.39,'#7e979f',.29,.106,-.045);notebook.rotation.y=-.12;
  const pages=box(g,.424,.013,.36,'#ded3b6',.29,.125,-.045);pages.rotation.y=-.12;
  for(let i=0;i<8;i++)box(g,.014,.014,.02,'#d8c6a1',.075,.14,-.195+i*.041,.3);
  box(g,.068,.039,.034,'#dca395',.56,.108,.23);box(g,.105,.005,.24,'#cfb788',.04,.09,.03).rotation.y=.21;
 }
 if(kind==='tin'){
  box(g,.52,.014,.41,'#bec6b5',0,.093,-.04);
  box(g,.23,.048,.28,'#b5967d',-.48,.109,-.10);box(g,.20,.014,.25,'#ded3b6',-.48,.14,-.1);
  box(g,.16,.034,.19,'#8099a3',.46,.105,-.13);
 }
 const object=createIncidentObject(kind);object.position.set(s.rest.x,s.rest.y,s.rest.z);object.rotation.set(s.rest.rx,0,s.rest.rz);g.add(object);
 const pencils=kind==='pencils'?Array.from({length:3},(_,i)=>{const p=createPencil(i),r=restingPencil(i);p.position.set(r.x,r.y,r.z);p.rotation.set(r.rx,r.ry,r.rz);g.add(p);return p;}):[];
 furniture.userData.incident={kind,frame:g,object,pencils};
 g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
}

export function applyIncidentResult(furniture,result){
 const d=furniture?.userData.incident;if(!d||!result?.rescue)return;
 const mode={...result,type:'reaction',elapsed:REACTION_DURATION},p=d.kind==='pencils'?cupPose(mode):objectPose(mode);
 d.object.position.set(p.x,p.y,p.z);d.object.rotation.set(p.rx,0,p.rz);
 if(d.object.userData.flowers)d.object.userData.flowers.rotation.z=0;
 d.pencils.forEach((pencil,i)=>{const p=pencilPose(result.rescue.pencils[i],i,mode);pencil.position.set(p.x,p.y,p.z);pencil.rotation.set(p.rx,p.ry,p.rz);});
}
