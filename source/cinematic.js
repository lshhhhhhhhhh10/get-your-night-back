import {createCatModel,updateCatModel} from './cat-model.js';
import * as THREE from 'three';
import {INCIDENTS,CATCH_DURATION} from './incidents.js';
// 物件特写独立布景，避免近摄穿进柜子或墙里；结束后恢复玩家原视角。
export class IncidentCamera{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#142235');
  this.camera=new THREE.PerspectiveCamera(42,1,.05,20);this.camera.position.set(0,1.35,3.05);this.camera.lookAt(0,.82,0);
  this.scene.add(new THREE.HemisphereLight(0xc4dcff,0x344258,2.8));const light=new THREE.DirectionalLight(0xffd6a0,4);light.position.set(-2,4,3);this.scene.add(light);
  this.cat=createCatModel();this.scene.add(this.cat);this.cat.visible=false;
  this.props=new Map();this.materials=new Map();this.table=this.box(4,.08,3.5,'#aa8b70',0,.04,-.15);
  this.box(2.3,1.05,.58,'#5a7180',0,.605,-1);this.box(2.4,.08,.70,'#c3b698',0,1.17,-.98);
  this.box(1.85,.21,.06,'#8a9e9f',0,.95,-.44);this.box(.32,.04,.06,'#d6c19c',0,.95,-.39);
  this.box(1.88,.04,.58,'#7b8e91',0,.84,-.64);for(const x of[-.6,0,.6])this.box(.025,.12,.48,'#bcc6bb',x,.92,-.65);
  for(let i=-2;i<=2;i++){this.box(.012,.004,3.5,'#65717a',i*.8,.083,-.15);this.box(4,.004,.012,'#65717a',0,.083,i*.7);}
  this.hands=new THREE.Group();this.scene.add(this.hands);this.arms=[];
  for(const sign of[-1,1]){const hand=new THREE.Group();hand.position.set(sign*.23,0,0);hand.userData.side=sign;this.hands.add(hand);
    const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),this.mat('#d6b48e'));palm.scale.set(.10,.045,.13);hand.add(palm);
    const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.065,.115,1,10),this.mat('#708aa5'));this.scene.add(sleeve);this.arms.push({sleeve,hand,sign});
    for(let n=0;n<4;n++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.02,.12,3,6),this.mat('#d6b48e'));finger.position.set((n-1.5)*.046,.013,-.125);finger.rotation.x=Math.PI/2;hand.add(finger);}
    const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.027,.085,3,6),this.mat('#d6b48e'));thumb.position.set(-sign*.11,.018,-.022);thumb.rotation.z=sign*.55;thumb.rotation.x=.8;hand.add(thumb);
  }
  for(const kind of['fork','pencils','tin','vase'])this.props.set(kind,this.makeObject(kind));
  this.loosePencils=[];for(let i=0;i<3;i++){const g=new THREE.Group();this.scene.add(g);const shaft=this.box(.045,.40,.045,['#d2b361','#789c99','#8497b3'][i],0,0,0,g);const tip=new THREE.Mesh(new THREE.ConeGeometry(.03,.075,6),this.mat('#ceb99a'));tip.position.y=.237;g.add(tip);this.loosePencils.push(g);}
  this.wrap=this.box(.48,.13,.30,'#879faf',0,0,0,this.hands);this.wrap.visible=false;
  this.dropShadow=new THREE.Mesh(new THREE.CircleGeometry(.23,24),new THREE.MeshBasicMaterial({color:0x101c24,transparent:true,opacity:.23,depthWrite:false}));this.dropShadow.rotation.x=-Math.PI/2;this.dropShadow.position.y=.086;this.scene.add(this.dropShadow);
 }
 mat(c){if(!this.materials.has(c))this.materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:c==='#c8d6de'?.25:.8,metalness:c==='#c8d6de'?.65:0}));return this.materials.get(c);}
 box(w,h,d,c,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 cyl(rt,rb,h,c,x,y,z,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,12),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 makeObject(kind){const g=new THREE.Group();this.scene.add(g);
  if(kind==='fork'){this.box(.065,.54,.035,'#c8d6de',0,-.09,0,g);this.box(.20,.09,.035,'#c8d6de',0,.20,0,g);for(let i=0;i<4;i++)this.box(.027,.19,.028,'#c8d6de',-.085+i*.057,.33,0,g);}
  if(kind==='pencils'){this.cyl(.16,.12,.34,'#b78872',0,-.02,0,g);this.cyl(.135,.135,.01,'#3b4754',0,.155,0,g);for(let i=0;i<5;i++){const pencil=this.box(.03,.40,.03,['#d2b361','#789c99','#8497b3'][i%3],Math.sin(i*2)*.08,.29,Math.cos(i*2)*.08,g);pencil.rotation.z=(i-2)*.09;}}
  if(kind==='tin'){this.box(.43,.38,.32,'#8fa7b2',0,0,0,g);g.userData.lid=this.box(.46,.05,.35,'#c8d6de',0,.21,0,g);this.box(.23,.16,.009,'#d8c6a1',0,0,.165,g);}
  if(kind==='vase'){this.cyl(.12,.20,.36,'#9fbec7',0,0,0,g);this.cyl(.09,.12,.18,'#bdd5d8',0,.25,0,g);this.box(.03,.35,.03,'#7b9b83',0,.49,0,g);}
  return g;
 }
 render(renderer,mode,aspect){
  this.cat.visible=!!mode.catCause;if(this.cat.visible){updateCatModel(this.cat,{x:-.85,z:-.2,state:'prepare',heading:.35,route:[]},mode.elapsed);this.cat.position.y=.085;if(this.cat.userData.head)this.cat.userData.head.rotation.x=-.35;}
  const event=INCIDENTS[mode.incidentId||'vase'],reaction=mode.type==='reaction',t=reaction?1:Math.min(1,mode.elapsed/CATCH_DURATION);
  this.table.material=this.mat(event.kind==='fork'?'#a1b7ac':event.kind==='tin'?'#8c8390':'#aa8b70');
  const r=mode.rescue;
  for(const[k,g]of this.props){g.visible=k===event.kind;if(!g.visible)continue;
   g.position.set(Math.sin(t*2)*.08,reaction?(mode.success?.73:.25):1.27-t*1.08,0);
   g.rotation.set(reaction?(mode.success?.10:1.5):t*.7,0,reaction?(mode.success?-.1:1.1):-.24+t*1.25);
   if(r&&!reaction){g.position.set(r.objectX,r.height,0);g.rotation.set(event.kind==='fork'?mode.elapsed*1.4:0,0,r.tilt);if(event.kind==='pencils'){g.position.set(-.65,.29,-.6);g.rotation.z=1.3;}if(g.userData.lid){g.userData.lid.position.y=.21+(r.left>.12?0:Math.abs(Math.sin(mode.elapsed*23))*.09);}}
   if(reaction&&!mode.success){g.updateMatrixWorld(true);g.position.y+=.085-new THREE.Box3().setFromObject(g).min.y;g.position.y+=Math.abs(Math.sin(mode.elapsed*14))*Math.max(0,.10-mode.elapsed*.2);}
  }
  this.hands.visible=!!r||reaction&&mode.success;this.hands.position.set(r?.handX||0,r?(r.kind==='pencils'?.34:r.stage==='reach'?.51:r.height-.15):.53,.16);
  this.hands.children.filter(h=>h.userData.side).forEach(hand=>{const grip=hand.userData.side<0?r?.left||0:r?.right||0;hand.rotation.x=r?.kind==='pencils'?-(r.right||0)*1.1:-grip*.35;hand.rotation.z=-hand.userData.side*grip*.24;});
  this.hands.updateMatrixWorld(true);for(const {sleeve,hand,sign}of this.arms){sleeve.visible=this.hands.visible;const wrist=hand.localToWorld(new THREE.Vector3(0,-.015,.065)),end=new THREE.Vector3(sign*.7+(r?.handX||0)*.3,-.5,3.4),direction=wrist.clone().sub(end);sleeve.position.copy(wrist).add(end).multiplyScalar(.5);sleeve.scale.y=direction.length();sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
  this.wrap.visible=event.kind==='fork'&&r?.stage==='damp'&&r.left>.12;
  for(const[i,pencil]of this.loosePencils.entries()){pencil.visible=event.kind==='pencils'&&!!r;if(!pencil.visible)continue;const q=r.pencils[i];const roll=Math.max(0,Math.min(1,(mode.elapsed-(q.at-1.2))/1.2));pencil.position.set(q.x,q.state==='fallen'?.10:.16,q.state==='caught'?.14:-.8+roll*1.05);pencil.rotation.set(Math.PI/2,0,q.state==='caught'?Math.PI/2:mode.elapsed*3+i);}
  this.dropShadow.position.x=r?.objectX||0;this.dropShadow.scale.setScalar(r?Math.max(.45,1.4-r.height*.5):1);this.dropShadow.visible=event.kind!=='pencils';
  this.camera.position.set(0,1.55,4.6/Math.min(1,aspect/1.1));this.camera.lookAt(0,.58,0);this.camera.fov=46;
  this.camera.aspect=aspect;this.camera.updateProjectionMatrix();renderer.render(this.scene,this.camera);
 }
}
