import * as THREE from 'three';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// A real 3D cutaway: the split in each pin is rendered at its simulated height.
export class LockCamera{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#101b2b');
  this.camera=new THREE.PerspectiveCamera(36,1,.05,30);this.materials=new Map();
  this.scene.add(new THREE.HemisphereLight('#b6d7eb','#172132',2));
  for(const [color,power,pos]of [['#ffe0a1',5,[-3,4,5]],['#7fc7e0',3,[3,1,2]]]){const l=new THREE.DirectionalLight(color,power);l.position.set(...pos);this.scene.add(l);}
  this.root=new THREE.Group();this.scene.add(this.root);this.pins=[];
  this.box(4.8,3.8,.22,'#1e3041',0,.3,-.7);
  this.box(3.55,2.8,.14,'#324957',0,.35,-.48);
  for(const x of [-1.68,1.68])for(const y of [-.88,1.58]){const screw=this.cyl(.065,.065,.04,'#9daeb1',x,y,-.38);screw.rotation.x=Math.PI/2;this.box(.072,.013,.025,'#273b46',x,y,-.345);}
  this.box(2.86,.2,.55,'#71858b',-.12,1.62,-.12);this.box(2.86,.18,.55,'#71858b',-.12,-.83,-.12);
  for(let i=0;i<5;i++)this.box(.075,2.27,.45,'#536873',-1.47+i*.675,.38,-.1);
  this.rotor=new THREE.Group();this.rotor.position.set(1.47,.22,.01);this.root.add(this.rotor);
  const end=this.cyl(.45,.45,.20,'#99a4a4',0,0,0,this.rotor);end.rotation.x=Math.PI/2;
  const inset=this.cyl(.33,.33,.22,'#b6a16e',0,0,0,this.rotor);inset.rotation.x=Math.PI/2;
  this.box(.08,.42,.04,'#172631',0,0,.13,this.rotor);this.box(.13,.14,.04,'#172631',.02,-.12,.13,this.rotor);
  // The physical shear edge, visible behind the open pin channels.
  this.plate=this.box(2.78,.027,.06,'#a9e0df',-.12,.48,.16);this.box(2.78,.025,.05,'#213742',-.12,.435,.16);
  for(let i=0;i<4;i++){
   const group=new THREE.Group();group.position.x=-1.13+i*.675;this.root.add(group);
   this.box(.43,2.10,.035,'#213847',0,.36,-.33,group);
   const lower=new THREE.Group(),upper=new THREE.Group();group.add(lower,upper);
   this.cyl(.107,.107,.49,'#bf9451',0,-.254,0,lower);this.cyl(.12,.12,.048,'#ead49b',0,-.47,0,lower);
   this.cyl(.113,.113,.035,'#f0d99d',0,-.022,0,lower);
   const driver=this.cyl(.113,.113,.31,'#9caeb4',0,.17,0,upper);this.cyl(.122,.122,.05,'#cbd6d7',0,.326,0,upper);
   const groove=new THREE.Group();upper.add(groove);this.cyl(.069,.069,.11,'#789198',0,.16,0,groove);for(const y of [.057,.263])this.cyl(.113,.113,.105,'#9caeb4',0,y,0,groove);groove.visible=false;
   const points=Array.from({length:181},(_,n)=>{const t=n/180,a=t*Math.PI*2*9;return new THREE.Vector3(Math.cos(a)*.08,t,Math.sin(a)*.08);});
   const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.014,5,false),this.mat('#96a8ae'));group.add(spring);
   const led=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),new THREE.MeshStandardMaterial({color:'#496471',emissive:'#496471',emissiveIntensity:.2}));led.position.set(0,-.98,.13);group.add(led);
   this.pins.push({group,lower,upper,driver,groove,spring,led});
  }
  this.pick=new THREE.Group();this.root.add(this.pick);
  this.box(2.3,.042,.055,'#a5b8bc',-1.10,0,.18,this.pick);this.box(.13,.065,.075,'#e2dac0',.05,.025,.18,this.pick);
  const handle=this.box(.65,.14,.15,'#775f50',-2.22,-.015,.18,this.pick);handle.rotation.z=-.025;
  this.box(.38,.027,.17,'#b9986e',-2.14,-.015,.18,this.pick);
  this.tension=this.box(.65,.085,.09,'#aeb9b8',1.72,-.29,.29);this.tension.rotation.z=-.35;
 }
 mat(color){if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,metalness:color==='#101b2b'?0:.65,roughness:.34}));return this.materials.get(color);}
 box(w,h,d,c,x,y,z,parent=this.root){const m=new THREE.Mesh(this.boxGeometry(w,h,d),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 boxGeometry(w,h,d){if(Math.min(w,h,d)<.11)return new THREE.BoxGeometry(w,h,d);const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:d-.03,bevelEnabled:true,bevelThickness:.015,bevelSize:.018,bevelSegments:1,steps:1});g.translate(0,0,-d/2+.015);return g;}
 cyl(a,b,h,c,x,y,z,parent=this.root){const m=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,20),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 render(renderer,mode,aspect){
  const l=mode.mechanism,turn=smooth(l.turn),shake=l.stress>0?Math.sin(mode.elapsed*63)*Math.min(.013,l.stress*.02):0;
  this.root.rotation.set(.055,-.12,shake);this.root.position.set(0,.2,0);
  this.pins.forEach((obj,i)=>{const p=l.pins[i];obj.group.visible=!!p;if(!p)return;
   const seam=.48+(p.lift-p.target)*.98;
   obj.lower.position.y=seam;obj.upper.position.y=seam+.016;obj.groove.visible=p.spool;obj.driver.visible=!p.spool;
   obj.lower.rotation.z=-turn*.18;obj.lower.position.x=turn*.08;
   obj.spring.position.y=seam+.36;obj.spring.scale.y=Math.max(.13,1.51-(seam+.36));
   obj.led.material.color.set(p.seated?'#a4dec8':l.selected===i?'#f2c780':'#496471');obj.led.material.emissive.copy(obj.led.material.color);obj.led.material.emissiveIntensity=p.seated?1:.3;
  });
  const selected=l.pins[l.selected],x=-1.13+l.selected*.675;
  this.pick.position.set(x,.48+(selected.lift-selected.target)*.98-.55,.13);this.pick.rotation.z=l.pressure*.022;this.pick.visible=l.turn===0;
  this.plate.position.x=-.12+(l.level===2?shake*3:0);
  this.rotor.rotation.z=-turn*1.4;this.tension.rotation.z=-.35-turn*.6;
  this.camera.position.set(0,1.25,7.4/Math.min(1,aspect/1.02));this.camera.lookAt(0,.53,0);this.camera.setViewOffset(1000,1000,0,90,1000,1000);this.camera.aspect=aspect;this.camera.updateProjectionMatrix();renderer.render(this.scene,this.camera);
 }
}
