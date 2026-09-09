import * as THREE from 'three';
import {INCIDENTS,CATCH_DURATION} from './incidents.js';
// 物件特写独立布景，避免近摄穿进柜子或墙里；结束后恢复玩家原视角。
export class IncidentCamera{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#142235');
  this.camera=new THREE.PerspectiveCamera(42,1,.05,20);this.camera.position.set(0,1.35,3.05);this.camera.lookAt(0,.82,0);
  this.scene.add(new THREE.HemisphereLight(0xc4dcff,0x344258,2.8));const light=new THREE.DirectionalLight(0xffd6a0,4);light.position.set(-2,4,3);this.scene.add(light);
  this.props=new Map();this.materials=new Map();this.table=this.box(4,.08,3.5,'#aa8b70',0,.04,-.15);
  this.box(2.3,1.05,.58,'#5a7180',0,.605,-1);this.box(2.4,.08,.70,'#c3b698',0,1.17,-.98);
  this.box(1.85,.21,.06,'#8a9e9f',0,.95,-.44);this.box(.32,.04,.06,'#d6c19c',0,.95,-.39);
  this.box(1.88,.04,.58,'#7b8e91',0,.84,-.64);for(const x of[-.6,0,.6])this.box(.025,.12,.48,'#bcc6bb',x,.92,-.65);
  for(let i=-2;i<=2;i++){this.box(.012,.004,3.5,'#65717a',i*.8,.083,-.15);this.box(4,.004,.012,'#65717a',0,.083,i*.7);}
  this.hands=new THREE.Group();this.scene.add(this.hands);for(const sign of[-1,1]){const h=this.box(.27,.14,.3,'#d6a46c',sign*.25,0,0,this.hands);h.rotation.z=sign*.24;this.box(.13,.13,.48,'#708aa5',sign*.38,-.1,.28,this.hands);}
  for(const kind of['fork','pencils','tin','vase'])this.props.set(kind,this.makeObject(kind));
 }
 mat(c){if(!this.materials.has(c))this.materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:c==='#c8d6de'?.25:.8,metalness:c==='#c8d6de'?.65:0}));return this.materials.get(c);}
 box(w,h,d,c,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 cyl(rt,rb,h,c,x,y,z,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,12),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 makeObject(kind){const g=new THREE.Group();this.scene.add(g);
  if(kind==='fork'){this.box(.065,.54,.035,'#c8d6de',0,-.09,0,g);this.box(.20,.09,.035,'#c8d6de',0,.20,0,g);for(let i=0;i<4;i++)this.box(.027,.19,.028,'#c8d6de',-.085+i*.057,.33,0,g);}
  if(kind==='pencils'){this.cyl(.16,.12,.34,'#b78872',0,-.02,0,g);this.cyl(.135,.135,.01,'#3b4754',0,.155,0,g);for(let i=0;i<5;i++){const pencil=this.box(.03,.40,.03,['#d2b361','#789c99','#8497b3'][i%3],Math.sin(i*2)*.08,.29,Math.cos(i*2)*.08,g);pencil.rotation.z=(i-2)*.09;}}
  if(kind==='tin'){this.box(.43,.38,.32,'#8fa7b2',0,0,0,g);this.box(.46,.05,.35,'#c8d6de',0,.21,0,g);this.box(.23,.16,.009,'#d8c6a1',0,0,.165,g);}
  if(kind==='vase'){this.cyl(.12,.20,.36,'#9fbec7',0,0,0,g);this.cyl(.09,.12,.18,'#bdd5d8',0,.25,0,g);this.box(.03,.35,.03,'#7b9b83',0,.49,0,g);}
  return g;
 }
 render(renderer,mode,aspect){
  const event=INCIDENTS[mode.incidentId||'vase'],reaction=mode.type==='reaction',t=reaction?1:Math.min(1,mode.elapsed/CATCH_DURATION);
  this.table.material=this.mat(event.kind==='fork'?'#a1b7ac':event.kind==='tin'?'#8c8390':'#aa8b70');
  for(const[k,g]of this.props){g.visible=k===event.kind;if(!g.visible)continue;
   g.position.set(Math.sin(t*2)*.08,reaction?(mode.success?.73:.25):1.27-t*1.08,0);
   g.rotation.set(reaction?(mode.success?.10:1.5):t*.7,0,reaction?(mode.success?-.1:1.1):-.24+t*1.25);if(reaction&&!mode.success){g.updateMatrixWorld(true);g.position.y+=.085-new THREE.Box3().setFromObject(g).min.y;}
  }
  this.hands.visible=reaction&&mode.success;this.hands.position.set(0,.53,.10);
  this.camera.aspect=aspect;this.camera.updateProjectionMatrix();renderer.render(this.scene,this.camera);
 }
}
