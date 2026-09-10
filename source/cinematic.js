import {createCatModel,updateCatModel} from './cat-model.js';
import * as THREE from 'three';
import {createFurniture,animateFurniture} from './furniture.js';
import {STATIONS,stationFor,stationFurniture,SURFACE_Y} from './incident-setting.js';
import {objectPose,pencilPose,cupPose,handHeight,armJoints,smooth,impactTime} from './incident-motion.js';
import {INCIDENTS} from './incidents.js';
import {incidentView} from './incident-view.js';
// A separate camera scene contains the exact same furniture and dressing as
// exploration/search, normalized around its surface, with no substitute set.
export class IncidentCamera{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#152335');
  this.camera=new THREE.PerspectiveCamera(42,1,.035,20);
  this.scene.add(new THREE.HemisphereLight(0xc4dcff,0x26374a,1.8));const light=new THREE.DirectionalLight(0xffd6a0,3.1);light.position.set(-2,4,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.008;this.scene.add(light);const rim=new THREE.DirectionalLight('#8bbdcf',1.4);rim.position.set(2,2,-2);this.scene.add(rim);
  this.materials=new Map();this.stations=new Map();
  for(const kind of Object.keys(STATIONS)){
   const f=stationFurniture(kind),s=stationFor(kind),g=createFurniture({...f,x:-s.x,z:-s.z,yaw:0});g.position.y=SURFACE_Y-f.h;
   if(g.userData.padlock)g.userData.padlock.visible=false;
   this.scene.add(g);this.stations.set(kind,g);
  }
  this.floor=this.box(8,.06,8,'#26384b',0,-.91,0);
  this.cat=createCatModel();this.scene.add(this.cat);this.cat.visible=false;
  this.hands=new THREE.Group();this.scene.add(this.hands);this.arms=[];
  for(const sign of[-1,1]){
   const hand=new THREE.Group();hand.userData.side=sign;this.hands.add(hand);
   const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),this.mat('#d6b48e'));palm.scale.set(.078,.032,.085);hand.add(palm);
   for(let n=0;n<4;n++){
    const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.015,[.048,.066,.058,.042][n],3,6),this.mat('#d6b48e'));finger.position.set((n-1.5)*.036,.008,-.076);finger.rotation.x=Math.PI/2;hand.add(finger);
   }
   const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.020,.052,3,6),this.mat('#d6b48e'));thumb.position.set(-sign*.072,.012,-.012);thumb.rotation.set(.8,0,sign*.55);hand.add(thumb);
   const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.047,.066,1,10),this.mat('#708aa5')),upper=new THREE.Mesh(new THREE.CylinderGeometry(.066,.089,1,10),this.mat('#5e7690')),cuff=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.05,10),this.mat('#aebfbf'));
   const elbowCap=new THREE.Mesh(new THREE.SphereGeometry(.066,10,8),this.mat('#708aa5'));
   upper.material=upper.material.clone();upper.material.transparent=true;upper.material.depthWrite=false;upper.material.onBeforeCompile=shader=>{shader.vertexShader='varying float sleeveY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsleeveY = position.y;');shader.fragmentShader='varying float sleeveY;\n'+shader.fragmentShader.replace('#include <dithering_fragment>','gl_FragColor.a *= smoothstep(-0.4, 0.18, sleeveY);\n#include <dithering_fragment>');};this.scene.add(sleeve,upper,cuff,elbowCap);this.arms.push({sleeve,upper,cuff,elbowCap,hand,sign});
  }
  this.wrap=this.box(.20,.055,.19,'#879faf',0,0,0,this.hands);this.wrap.visible=false;
  this.contactRing=new THREE.Mesh(new THREE.RingGeometry(.17,.175,36),new THREE.MeshBasicMaterial({color:'#e6d4a5',transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));this.contactRing.rotation.x=-Math.PI/2;this.scene.add(this.contactRing);
  this.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});for(const {upper}of this.arms)upper.castShadow=false;
 }
 mat(c){if(!this.materials.has(c))this.materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.8}));return this.materials.get(c);}
 box(w,h,d,c,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 render(renderer,mode,aspect){
  const event=INCIDENTS[mode.incidentId||'vase'],kind=event.kind,reaction=mode.type==='reaction',r=mode.rescue,pencils=kind==='pencils',clock=reaction?(mode.sourceElapsed||0)+mode.elapsed:mode.elapsed;
  const f=stationFurniture(kind),station=this.stations.get(kind),detail=station.userData.incident,pose=pencils?cupPose(mode):objectPose(mode);
  for(const [k,g]of this.stations)g.visible=k===kind;
  this.floor.position.y=SURFACE_Y-f.h-.03;animateFurniture(station,mode.resume?.elapsed||0,!!mode.resume);
  const impact=reaction&&!mode.success?mode.elapsed-impactTime(r):-1,shake=impact>=0?Math.sin(impact*42)*Math.exp(-impact*11)*.01:0;
  const view=incidentView(kind,aspect);this.camera.position.set(shake,view.y,view.z);
  this.camera.lookAt(0,view.targetY,view.targetZ);this.camera.fov=42;
  this.camera.setViewOffset(1000,1000,0,kind==='vase'||kind==='tin'?0:aspect<.85?100:95,1000,1000);this.camera.aspect=aspect;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
  this.cat.visible=!!mode.catCause;
  if(this.cat.visible){updateCatModel(this.cat,{x:-.68,z:.08,state:'prepare',heading:.35,route:[]},clock);this.cat.position.y=SURFACE_Y-f.h;}
  const object=detail.object;object.position.set(pose.x,pose.y,pose.z);object.rotation.set(pose.rx,0,pose.rz);object.scale.y=pose.scale;
  if(object.userData.flowers){const a=r?.contactAt===undefined?0:Math.max(0,clock-r.contactAt);object.userData.flowers.rotation.z=-pose.rz*.22+Math.sin(clock*8)*.04*(reaction?Math.exp(-mode.elapsed*5):r?.stage==='reach'?1:Math.exp(-a*4));}
  if(object.userData.lid){const damp=r?.left>.12?0:1;object.userData.lid.position.y=.198+Math.abs(Math.sin(clock*23))*.045*damp*(reaction?Math.exp(-mode.elapsed*6):1);object.userData.lid.rotation.z=Math.sin(clock*20)*.06*damp;}
  for(const [i,pencil]of detail.pencils.entries()){if(!r)continue;const p=pencilPose(r.pencils[i],i,mode);pencil.position.set(p.x,p.y,p.z);pencil.rotation.set(p.rx,p.ry,p.rz);}
  this.hands.visible=!!r||reaction&&mode.success;
  this.hands.position.set(0,0,0);
  const withdraw=reaction?smooth((mode.elapsed-(pencils?.98:mode.success?.70:.05))/.22):0;
  for(const hand of this.hands.children.filter(h=>h.userData.side)){
   const sign=hand.userData.side,grip=sign<0?r?.left||0:r?.right||0;
   hand.visible=!pencils||sign>0||reaction;
   let x=pose.x+sign*(kind==='fork'?.082:kind==='tin'?.19:.175),y=handHeight(mode,pose)+(kind==='fork'?.055:0),z=pose.z+.085;
   if(!reaction&&r?.stage==='reach')x=(r.handX||0)*.55+sign*(kind==='fork'?.082:.175);
   if(pencils){
    x=(r?.handX||0)*.55;y=.104;z=.49;
    if(reaction&&sign>0){const saved=r?.pencils.findIndex(p=>p.state==='caught')??-1;if(saved>=0){const p=pencilPose(r.pencils[saved],saved,mode);x=p.x+.09;y=p.y-.05;z=p.z+.055;}}
    if(reaction&&sign<0){x=pose.x-.17;y=pose.y-.05;z=pose.z+.055;}
   }
   hand.position.set(x+sign*withdraw*.12,y+withdraw*.045,z+withdraw*.36);
   hand.rotation.set(pencils?-.12:kind==='fork'?-.10:-grip*.32,0,-sign*grip*.3);hand.scale.setScalar(1);
  }
  this.hands.updateMatrixWorld(true);
  const axis=new THREE.Vector3(0,1,0),segment=(mesh,a,b)=>{const direction=a.clone().sub(b);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(axis,direction.normalize());};
  for(const {sleeve,upper,cuff,elbowCap,hand,sign}of this.arms){
   sleeve.visible=upper.visible=cuff.visible=elbowCap.visible=this.hands.visible&&hand.visible;
   const wrist=hand.localToWorld(new THREE.Vector3(0,-.006,.07)),j=armJoints(wrist,sign,smooth((f.d/2+.22-wrist.z)/.22)),elbow=new THREE.Vector3(j.elbow.x,j.elbow.y,j.elbow.z),shoulder=new THREE.Vector3(j.shoulder.x,j.shoulder.y,j.shoulder.z);
   segment(sleeve,wrist,elbow);segment(upper,elbow,shoulder);cuff.position.copy(wrist).lerp(elbow,.035);cuff.quaternion.copy(sleeve.quaternion);elbowCap.position.copy(elbow);
  }
  this.wrap.visible=kind==='fork'&&r?.left>.12&&(r.stage==='damp'||reaction&&mode.elapsed<.62);
  this.wrap.position.set(pose.x,pose.y-.035,pose.z+.035);
  const contact=!reaction&&r?.contactAt!==undefined?clock-r.contactAt:-1,ringTime=impact>=0?impact:contact;
  this.contactRing.visible=!pencils&&ringTime>=0&&ringTime<.3;this.contactRing.position.set(pose.x,impact>=0?SURFACE_Y-f.h+.012:pose.y-.14,pose.z);this.contactRing.scale.setScalar(.8+Math.max(0,ringTime)*2);this.contactRing.material.opacity=Math.max(0,.3-ringTime);
  renderer.render(this.scene,this.camera);
 }
}
