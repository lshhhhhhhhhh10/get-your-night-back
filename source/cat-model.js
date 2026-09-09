import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
let catAsset=null,catClips=[];
export function configureCatAsset(gltf){catAsset=gltf.scene;catClips=gltf.animations;}
function downloadedCat(){
 const root=new THREE.Group(),body=new THREE.Group(),model=clone(catAsset);body.add(model);root.add(body);model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),scale=.58/size.y;model.scale.multiplyScalar(scale);model.position.y=-bounds.min.y*scale+.10;
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;const soften=m=>{const c=m.clone();c.metalness=0;c.roughness=.92;c.color.set(({Cat_Main:'#d5a04e',Cat_Secondary:'#8e663f',Ears:'#cc969a',Eye_White:'#e9e1c9',Eye_Black:'#282c32'})[m.name]||'#d5a04e');c.userData.nightOwned=true;return c;};o.material=Array.isArray(o.material)?o.material.map(soften):soften(o.material);}});
 const mixer=new THREE.AnimationMixer(model),actions={};for(const clip of catClips)actions[clip.name.split('|').at(-1)]=mixer.clipAction(clip);
 const orange=new THREE.MeshStandardMaterial({color:'#cf943b',roughness:.9}),cream=new THREE.MeshStandardMaterial({color:'#e6d2af',roughness:.9});orange.userData.nightOwned=cream.userData.nightOwned=true;
 const legs=[];for(const x of[-.17,.17])for(const z of[-.16,.16]){const leg=new THREE.Group();leg.position.set(x,.13,z);body.add(leg);const foot=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),cream);foot.scale.set(.087,.095,.10);foot.position.y=-.045;foot.castShadow=true;leg.add(foot);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.30,-.22);body.add(tail);for(let i=0;i<5;i++){const part=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),i===4?cream:orange);part.scale.set(.036,.075,.036);part.position.set(Math.sin(i*.3)*.09,i*.073,-.08-i*.024);part.castShadow=true;tail.add(part);}
 root.userData={downloaded:true,source:'Quaternius CC0',body,model,mixer,actions,legs,tail,lastTime:null,current:null};return root;
}

export function createCatModel(){
 if(catAsset)return downloadedCat();
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);const mats=new Map();
 const mat=c=>{if(!mats.has(c)){const m=new THREE.MeshStandardMaterial({color:c,roughness:.9});m.userData.nightOwned=true;mats.set(c,m);}return mats.get(c);};
 function ell(parent,c,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const orange='#cc955c',cream='#f0d8a3',stripe='#925b40',dark='#30303a';
 const torso=ell(body,orange,0,.28,0,.20,.22,.32);ell(body,cream,0,.30,.22,.145,.17,.12);
 const head=new THREE.Group();head.position.set(0,.49,.27);body.add(head);ell(head,orange,0,0,0,.225,.205,.18);
 for(const side of[-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.12,.23,3),mat(orange));ear.position.set(side*.15,.19,-.025);ear.rotation.z=-side*.2;head.add(ear);const inner=new THREE.Mesh(new THREE.ConeGeometry(.07,.14,3),mat('#d99686'));inner.position.set(side*.15,.20,.016);inner.rotation.z=-side*.2;head.add(inner);ell(head,cream,side*.07,-.065,.154,.085,.063,.04);}
 const eyes=[];for(const side of[-1,1]){ell(head,'#c5cd86',side*.104,.025,.15,.058,.067,.024);const eye=ell(head,dark,side*.104,.025,.173,.020,.054,.011);eyes.push(eye);ell(head,'#fff0d4',side*.095,.046,.181,.012,.014,.005);
 for(const i of[-1,0,1]){const whisker=new THREE.Mesh(new THREE.BoxGeometry(.12,.005,.006),mat('#e9d7bd'));whisker.position.set(side*.20,-.056+i*.023,.16);whisker.rotation.z=side*i*.15;head.add(whisker);}}
 ell(head,'#b66d6d',0,-.065,.2,.025,.020,.016);
 function patch(parent,point){const pos=[],indices=[];for(let i=0;i<=8;i++)for(let j=0;j<=2;j++)pos.push(...point(i/8,j/2));for(let i=0;i<8;i++)for(let j=0;j<2;j++){const k=i*3+j;indices.push(k,k+1,k+3,k+1,k+4,k+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();const material=mat(stripe);material.side=THREE.DoubleSide;parent.add(new THREE.Mesh(geo,material));}
 for(const side of[-1,1])for(let n=0;n<3;n++)patch(body,(u,v)=>{const z=-.17+n*.15+(v-.5)*.048,a=.45+u*1.35,r=Math.sqrt(1-(z/.325)**2);return [side*.203*Math.sin(a)*r,.28+.224*Math.cos(a)*r,z];});
 for(const side of[-1,0,1])patch(head,(u,v)=>{const y=.065+u*.11,x=side*.064+(v-.5)*.023;return[x,y,.183*Math.sqrt(Math.max(0,1-(x/.225)**2-(y/.205)**2))];});
 const legs=[];for(const x of[-.125,.125])for(const z of[-.19,.19]){const pivot=new THREE.Group();pivot.position.set(x,.24,z);body.add(pivot);ell(pivot,orange,0,-.09,0,.065,.13,.068);ell(pivot,cream,0,-.195,.019,.074,.046,.09);legs.push(pivot);}
 const tail=new THREE.Group();tail.position.set(0,.33,-.26);body.add(tail);const segments=[];let parent=tail;for(let i=0;i<5;i++){const g=new THREE.Group();if(i)g.position.y=.11;parent.add(g);ell(g,i%2?stripe:orange,0,.06,0,.045-i*.004,.085,.045-i*.004);segments.push(g);parent=g;}
 root.userData={body,head,torso,legs,tail,segments,eyes};return root;
}
export function updateCatModel(root,c,time){
 if(root.userData.downloaded){const d=root.userData,dt=d.lastTime===null?0:Math.max(0,Math.min(.06,time-d.lastTime));d.lastTime=time;
  root.position.set(c.x,c.state==='jump'?Math.sin(Math.min(1,c.timer/.55)*Math.PI/2)*.7:0,c.z);if(dt===0)root.rotation.y=c.heading;else root.rotation.y+=Math.atan2(Math.sin(c.heading-root.rotation.y),Math.cos(c.heading-root.rotation.y))*Math.min(1,dt*14);
  const walking=['follow','toy','approach'].includes(c.state)&&c.route.length>0,clip=walking?'Walk':c.state==='play'?'Bite_Front':c.state==='jump'?'Jump':'Idle';
  if(d.current!==clip){d.actions[d.current]?.fadeOut(.2);d.actions[clip]?.reset().fadeIn(.2).play();d.current=clip;}d.mixer.update(dt);
  d.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(time*11+(i===0||i===3?0:Math.PI))*.45:0);d.tail.rotation.z=Math.sin(time*2)*.18;
  d.body.rotation.z=c.state==='rub'?Math.sin(time*3)*.16:0;d.body.scale.y=c.state==='prepare'?.7:1;return;
 }

 root.position.set(c.x,0,c.z);const previous=root.userData.lastTime,dt=previous===undefined?.06:Math.max(0,Math.min(.06,time-previous));root.userData.lastTime=time;if(previous===undefined)root.rotation.y=c.heading;else root.rotation.y+=Math.atan2(Math.sin(c.heading-root.rotation.y),Math.cos(c.heading-root.rotation.y))*Math.min(1,dt*14);const{body,head,torso,legs,tail,segments,eyes}=root.userData;
 const walking=['follow','toy','approach'].includes(c.state)&&c.route.length>0,sitting=['idle','calm','play'].includes(c.state),rub=c.state==='rub',prepare=c.state==='prepare';
 body.position.set(rub?Math.sin(time*3)*.06:0,walking?Math.abs(Math.sin(time*11))*.013:0,0);body.rotation.set(prepare?-.1:0,0,rub?Math.sin(time*3)*.18:0);body.scale.set(1,prepare?.65:sitting?.83:1,1);torso.rotation.x=sitting?-.30:0;
 head.rotation.set(sitting?-.12:prepare?.10:0,rub?Math.sin(time*3)*.18:0,Math.sin(time*1.5)*.035);
 legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(time*11+(i===0||i===3?0:Math.PI))*.45:sitting&&i%2===0?-.5:c.state==='play'&&i===1?Math.sin(time*5)*.5:0;});
 tail.rotation.set(-.45,0,Math.sin(time*(prepare?8:2))*(prepare?.3:.18));segments.forEach((s,i)=>s.rotation.x=.18+Math.sin(time*2-i*.4)*.12);
 const blink=time%5>.0&&time%5<.14;for(const eye of eyes)eye.scale.y=blink?.008:.054;
 if(c.state==='jump'){const t=Math.min(1,c.timer/.55);root.position.y=Math.sin(t*Math.PI/2)*.7;root.position.x-=Math.sin(t*Math.PI/2)*.28;body.rotation.x=-.22;legs[1].rotation.x=-1;legs[3].rotation.x=-1;}
}
export function createCatToy(){const m=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshStandardMaterial({color:'#abbb97',roughness:1}));m.material.userData.nightOwned=true;m.castShadow=true;for(const a of[0,Math.PI/2]){const stripe=new THREE.Mesh(new THREE.TorusGeometry(.065,.006,4,16),new THREE.MeshStandardMaterial({color:'#dfc7a4'}));stripe.material.userData.nightOwned=true;stripe.rotation.x=a;m.add(stripe);}return m;}
