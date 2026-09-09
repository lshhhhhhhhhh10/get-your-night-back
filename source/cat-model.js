import * as THREE from 'three';
export function createCatModel(){
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
