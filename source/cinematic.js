import {createCatModel,updateCatModel} from './cat-model.js';
import * as THREE from 'three';
import {createVase,createPencil} from './incident-props.js';
import {objectPose,pencilPose,handHeight,smooth,impactTime} from './incident-motion.js';
import {INCIDENTS} from './incidents.js';
// 物件特写独立布景，避免近摄穿进柜子或墙里；结束后恢复玩家原视角。
export class IncidentCamera{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#152335');
  this.camera=new THREE.PerspectiveCamera(42,1,.05,20);this.camera.position.set(0,1.35,3.05);this.camera.lookAt(0,.82,0);
  this.scene.add(new THREE.HemisphereLight(0xc4dcff,0x26374a,1.5));const light=new THREE.DirectionalLight(0xffd6a0,3.1);light.position.set(-2,4,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.015;this.scene.add(light);const rim=new THREE.DirectionalLight('#8bbdcf',1.4);rim.position.set(2,2,-2);this.scene.add(rim);
  this.cat=createCatModel();this.scene.add(this.cat);this.cat.visible=false;
  this.props=new Map();this.materials=new Map();this.table=this.box(3.4,.13,2.3,'#ac8b6c',0,.02,-.69);
  this.box(3.42,.035,.06,'#d7b78e',0,.07,.44);this.box(8,.1,8,'#26384b',0,-.91,0);
  for(const x of[-1.42,1.42])this.box(.10,.85,.10,'#596873',x,-.43,.2);
  this.box(2.3,1.05,.58,'#5a7180',0,.605,-1);this.box(2.4,.08,.70,'#c3b698',0,1.17,-.98);
  this.box(1.85,.21,.06,'#8a9e9f',0,.95,-.44);this.box(.32,.04,.06,'#d6c19c',0,.95,-.39);
  this.box(1.88,.04,.58,'#7b8e91',0,.84,-.64);for(const x of[-.6,0,.6])this.box(.025,.12,.48,'#bcc6bb',x,.92,-.65);
  for(let i=-2;i<=2;i++)this.box(.009,.003,2.22,'#8f735d',i*.58,.087,-.69);
  this.box(.64,.012,.42,'#bec6b5',.92,.102,-.32).rotation.y=-.15;this.box(.48,.018,.36,'#d7c59f',.88,.12,-.34).rotation.y=.1;
  this.hands=new THREE.Group();this.scene.add(this.hands);this.arms=[];
  for(const sign of[-1,1]){const hand=new THREE.Group();hand.position.set(sign*.23,0,0);hand.userData.side=sign;this.hands.add(hand);
    const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),this.mat('#d6b48e'));palm.scale.set(.10,.045,.13);hand.add(palm);
    const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.065,.115,1,10),this.mat('#708aa5'));this.scene.add(sleeve);const upper=new THREE.Mesh(new THREE.CylinderGeometry(.106,.145,1,10),this.mat('#5e7690'));this.scene.add(upper);const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.078,.083,.075,10),this.mat('#aebfbf'));this.scene.add(cuff);this.arms.push({sleeve,upper,cuff,hand,sign});
    for(let n=0;n<4;n++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.02,.12,3,6),this.mat('#d6b48e'));finger.position.set((n-1.5)*.046,.013,-.125);finger.rotation.x=Math.PI/2;hand.add(finger);}
    const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.027,.085,3,6),this.mat('#d6b48e'));thumb.position.set(-sign*.11,.018,-.022);thumb.rotation.z=sign*.55;thumb.rotation.x=.8;hand.add(thumb);
  }
  for(const kind of['fork','pencils','tin','vase'])this.props.set(kind,this.makeObject(kind));
  this.loosePencils=Array.from({length:3},(_,i)=>{const g=createPencil(i);this.scene.add(g);return g;});
  this.contactRing=new THREE.Mesh(new THREE.RingGeometry(.20,.208,40),new THREE.MeshBasicMaterial({color:'#e6d4a5',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));this.contactRing.rotation.x=-Math.PI/2;this.scene.add(this.contactRing);
  this.specks=Array.from({length:7},()=>{const g=this.box(.021,.021,.021,'#d5c2a3',0,0,0);return g;});
  this.streaks=Array.from({length:3},(_,i)=>{const points=Array.from({length:16},(_,j)=>{const t=j/15;return new THREE.Vector3(-.31-i*.055-Math.sin(t*Math.PI)*.06,t*.22,0);});const g=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#b8d6d8',transparent:true,opacity:.28}));this.scene.add(g);return g;});
  this.wrap=this.box(.48,.13,.30,'#879faf',0,0,0,this.hands);this.wrap.visible=false;
  this.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  this.dropShadow=new THREE.Mesh(new THREE.CircleGeometry(.23,24),new THREE.MeshBasicMaterial({color:0x101c24,transparent:true,opacity:.23,depthWrite:false}));this.dropShadow.rotation.x=-Math.PI/2;this.dropShadow.position.y=.086;this.scene.add(this.dropShadow);
 }
 mat(c){if(!this.materials.has(c))this.materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:c==='#c8d6de'?.25:.8,metalness:c==='#c8d6de'?.65:0}));return this.materials.get(c);}
 box(w,h,d,c,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 cyl(rt,rb,h,c,x,y,z,parent){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,12),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 makeObject(kind){const g=new THREE.Group();this.scene.add(g);
  if(kind==='fork'){this.box(.065,.54,.035,'#c8d6de',0,-.09,0,g);this.box(.20,.09,.035,'#c8d6de',0,.20,0,g);for(let i=0;i<4;i++)this.box(.027,.19,.028,'#c8d6de',-.085+i*.057,.33,0,g);}
  if(kind==='pencils'){this.cyl(.16,.12,.34,'#b78872',0,-.02,0,g);this.cyl(.165,.165,.03,'#d7ba91',0,.15,0,g);this.cyl(.135,.135,.012,'#344653',0,.159,0,g);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const rib=this.box(.014,.25,.014,'#ccab8a',Math.sin(a)*.143,-.02,Math.cos(a)*.143,g);rib.rotation.z=Math.sin(a)*.10;}}
  if(kind==='tin'){this.box(.43,.38,.32,'#8fa7b2',0,0,0,g);g.userData.lid=this.box(.46,.05,.35,'#c8d6de',0,.21,0,g);this.box(.23,.16,.009,'#d8c6a1',0,0,.165,g);}
  if(kind==='vase'){const vase=createVase();g.add(vase);g.userData.flowers=vase.userData.flowers;}
  return g;
 }
 render(renderer,mode,aspect){
  const event=INCIDENTS[mode.incidentId||'vase'],reaction=mode.type==='reaction',r=mode.rescue,pose=objectPose(mode),pencils=event.kind==='pencils';
  const clock=reaction?(mode.sourceElapsed||0)+mode.elapsed:mode.elapsed;
  const frameImpact=reaction&&!mode.success?mode.elapsed-impactTime(r):-1,shake=frameImpact>=0?Math.sin(frameImpact*42)*Math.exp(-frameImpact*11)*.018:0;
  this.camera.position.set(shake,pencils?2.55:1.7,4.7/Math.min(1,aspect/.98));this.camera.lookAt(0,pencils?.12:.63,0);this.camera.fov=pencils?44:42;
  this.camera.setViewOffset(1000,1000,0,pencils?(aspect<.85?110:75):(aspect<.85?45:5),1000,1000);this.camera.aspect=aspect;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);

  this.cat.visible=!!mode.catCause;if(this.cat.visible){updateCatModel(this.cat,{x:-1.18,z:-.48,state:'prepare',heading:.35,route:[]},clock);this.cat.position.y=.085;if(this.cat.userData.head)this.cat.userData.head.rotation.x=-.35;}
  this.table.material=this.mat(event.kind==='fork'?'#91aaa3':event.kind==='tin'?'#9d8a8c':'#ac8b6c');
  for(const [kind,g]of this.props){g.visible=kind===event.kind;if(!g.visible)continue;
   g.position.set(pose.x,pose.y,pose.z);g.rotation.set(pose.rx,0,pose.rz);g.scale.set(1,pose.scale,1);
   if(pencils){const tip=smooth(clock/.6);g.position.set(-.67,.27-Math.sin(tip*Math.PI/2)*.025,-.74);g.rotation.set(0,.1,tip*1.31);if(reaction&&mode.success){const u=smooth(mode.elapsed/.9);g.rotation.z*=1-u;g.position.y+=u*.008;}}
   if(g.userData.flowers){const a=r?.contactAt===undefined?0:Math.max(0,clock-r.contactAt);g.userData.flowers.rotation.z=-pose.rz*.22+Math.sin(clock*8)*.055*(reaction?Math.exp(-mode.elapsed*3):r?.stage==='reach'?1:Math.exp(-a*4));}
   if(g.userData.lid){const damp=r?.left>.12?0:1;g.userData.lid.position.y=.21+Math.abs(Math.sin(clock*23))*.06*damp*(reaction?Math.exp(-mode.elapsed*5):1);g.userData.lid.rotation.z=Math.sin(clock*20)*.08*damp;}
  }
  this.hands.visible=!!r||reaction&&mode.success;
  const pull=reaction&&!mode.success?smooth(mode.elapsed/.35):0,catchBuffer=r?.contactAt!==undefined?Math.sin(Math.min(1,(clock-r.contactAt)/.45)*Math.PI)*.045:0;
  this.hands.position.set(pencils?(reaction&&mode.success?(r?.handX||0)*(1-smooth(mode.elapsed/.7)):r?.handX||0):r?.handX||0,handHeight(mode,pose),pencils?.35:.18+pull*.35);
  for(const hand of this.hands.children.filter(h=>h.userData.side)){
   const grip=hand.userData.side<0?r?.left||0:r?.right||0;
   hand.position.x=pencils?hand.userData.side*.17:hand.userData.side*(.27-grip*.12);
   hand.rotation.x=pencils?-.15-(r?.right||0)*.85:-grip*.4;hand.rotation.z=-hand.userData.side*grip*.40;
   hand.scale.set(1.12,1.12+catchBuffer*2,1.12);hand.visible=!pencils||hand.userData.side>0||reaction;
  }
  this.hands.updateMatrixWorld(true);
  for(const {sleeve,upper,cuff,hand,sign}of this.arms){
   sleeve.visible=upper.visible=cuff.visible=this.hands.visible&&hand.visible;
   const wrist=hand.localToWorld(new THREE.Vector3(0,-.015,.065));
   const ray=new THREE.Vector3(sign*.9,-1.4,.5).unproject(this.camera).sub(this.camera.position).normalize();
   const end=this.camera.position.clone().addScaledVector(ray,1.0),elbow=wrist.clone().lerp(end,.52);elbow.x+=sign*.12;elbow.y-=.16;
   const segment=(mesh,a,b)=>{const direction=a.clone().sub(b);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());};
   segment(sleeve,wrist,elbow);segment(upper,elbow,end);cuff.position.copy(wrist).lerp(elbow,.06);cuff.quaternion.copy(sleeve.quaternion);
  }
  this.wrap.visible=event.kind==='fork'&&r?.stage==='damp'&&r.left>.12;
  for(const [i,pencil]of this.loosePencils.entries()){pencil.visible=pencils&&!!r;if(!pencil.visible)continue;const p=pencilPose(r.pencils[i],i,mode);pencil.position.set(p.x,p.y,p.z);pencil.rotation.set(p.rx,p.ry,p.rz);}
  const impact=reaction&&!mode.success?mode.elapsed-impactTime(r):-1,contact=!reaction&&r?.contactAt!==undefined?clock-r.contactAt:-1;
  const ringTime=impact>=0?impact:contact;this.contactRing.visible=!pencils&&ringTime>=0&&ringTime<.38;this.contactRing.position.set(pose.x,impact>=0?.097:pose.y-.2,.08);this.contactRing.scale.setScalar(.9+Math.max(0,ringTime)*2.8);this.contactRing.material.opacity=Math.max(0,.42-ringTime*1.1);
  this.specks.forEach((s,i)=>{s.visible=impact>=0&&impact<.5&&!pencils;if(!s.visible)return;const a=i*2.4,range=impact*(.3+i*.06);s.position.set(pose.x+Math.cos(a)*range,.10+Math.max(0,Math.sin(impact/.5*Math.PI))*(.03+i*.007),Math.sin(a)*range);s.rotation.set(i+impact*4,0,impact*7);s.scale.setScalar(1-impact*1.6);});
  for(const streak of this.streaks){streak.visible=!reaction&&!pencils&&r?.stage==='reach'&&clock>.65;streak.position.set(pose.x,pose.y,0);streak.rotation.z=-pose.rz*.4;}
  this.dropShadow.position.set(pencils?-.67:pose.x,.091,pencils?-.7:0);this.dropShadow.scale.setScalar(Math.max(.55,1.6-pose.y*.45));this.dropShadow.material.opacity=.17+Math.max(0,1-pose.y)*.10;
  renderer.render(this.scene,this.camera);
 }
}
