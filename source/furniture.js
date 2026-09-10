import * as THREE from 'three';
import {addIncidentDressing} from './incident-props.js';
const materials=new Map();
function material(c){if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.88}));return materials.get(c);}
// 所有实心体积限定在 layout 的占地内；抽屉、靠背和灯罩都随家具整体转向。
export function createFurniture(f){
  const g=new THREE.Group(),{w,d,h}=f,c=f.color||'#adb8be';g.position.set(f.x,0,f.z);g.rotation.y=f.yaw||0;g.userData.furnitureId=f.id;
  const box=(a,b,e,col,x=0,y=b/2,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,e),material(col));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const cyl=(rt,rb,hh,col,x,y,z,n=12)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,hh,n),material(col));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const legs=(top=h-.09)=>{for(const x of[-w*.39,w*.39])for(const z of[-d*.36,d*.36])box(.065,top,.065,'#514b52',x,top/2,z);};
  const book=(x,y,z,color)=>{const b=box(.075,.21,.24,color,x,y+.105,z);(g.userData.books??=[]).push(b);return b;};
  if(['cabinet','kitchen','tv'].includes(f.type)){
    const bh=f.type==='tv'?.58:h;box(w,bh-.14,.055,c,0,(bh-.14)/2+.10,-d/2+.028);for(const x of[-w/2+.03,w/2-.03])box(.06,bh-.14,d,c,x,(bh-.14)/2+.10);box(w,.06,d,c,0,.14);box(w,.055,d,'#c5af91',0,bh-.025);for(const x of[-w*.39,w*.39])for(const z of[-d*.34,d*.34])box(.08,.12,.08,'#514b52',x,.06,z);
    const count=Math.max(1,Math.round(w/.65));g.userData.drawers=[];g.userData.contents=[];
    for(let i=0;i<count;i++){const x=-w/2+(i+.5)*w/count,drawer=new THREE.Group();g.add(drawer);g.userData.drawers.push(drawer);
      const add=(...args)=>{const m=box(...args);drawer.attach(m);return m;};
      box(w/count-.04,bh*.24,.025,c,x,bh*.27,d/2);box(w/count-.04,bh*.23,.025,c,x,bh*.845,d/2);
      add(w/count-.04,bh*.30,.035,c,x,bh*.55,d/2+.009);add(.12,.025,.045,'#dfc694',x,bh*.56,d/2+.04);
      add(w/count-.08,.035,d-.1,'#705c4d',x,bh*.42,0);
      for(const side of[-1,1])add(.025,bh*.24,d-.1,'#9b8066',x+side*(w/count-.1)/2,bh*.54,0);
      for(let j=0;j<3;j++){const item=add(w/count*.60,.025,.24,['#d6c9ad','#859da8','#a28c99'][j],x+(j-1)*.04,bh*.45+j*.026,0);g.userData.contents.push({item,y:item.position.y,z:item.position.z});}
    }
    if(f.search){const lock=new THREE.Group();lock.position.set(0,bh*.64,d/2+.045);g.add(lock);const metal=new THREE.MeshStandardMaterial({color:'#bba576',metalness:.5,roughness:.4});const body=new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.055),metal);lock.add(body);const loop=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,5,12,Math.PI),metal);loop.position.y=.07;lock.add(loop);g.userData.padlock=lock;}

    if(f.type==='tv'){box(w*.83,.71,.075,'#30394c',0,1.22,0);box(w*.75,.60,.009,'#455c70',0,1.22,.043);box(.07,.28,.07,'#343846',0,.77,0);box(.48,.045,.26,'#343846',0,.62,0);}
    if(f.type==='kitchen'){box(.68,.035,.49,'#526b77',w*.25,h+.015,-.06);box(.57,.012,.38,'#8eacb1',w*.25,h+.035,-.06);cyl(.026,.026,.25,'#c4d0cb',w*.25,h+.14,-d*.32);box(.026,.028,.2,'#c4d0cb',w*.25,h+.25,-d*.22);if(f.id!=='kitchen-search')box(.36,.026,.27,'#c9a876',-w*.28,h+.013,.02);}
  }else if(f.type==='bed'){
    box(w,.29,d,'#756672',0,.255);box(w*.96,.23,d*.94,'#c9c8ca',0,.51);box(w*.96,.14,d*.58,c,0,.695,d*.17);box(w,.99,.08,c,0,.545,-d/2+.04);box(w*.76,.16,d*.21,'#e5ddd1',0,.705,-d*.32);for(const x of[-w*.40,w*.4])box(.06,.2,d*.54,'#bdcbd0',x,.68,d*.18);
  }else if(f.type==='sofa'||f.type==='chair'){
    legs(.37);box(w,.19,d*.88,c,0,.43);box(w,.61,d*.18,c,0,h-.305,-d*.41);const seats=f.type==='sofa'?3:1;for(let i=0;i<seats;i++)box(w/seats-.055,.13,d*.66,'#a8b6b1',-w/2+(i+.5)*w/seats,.575,d*.08);if(f.type==='sofa'||w>.8)for(const x of[-w/2+.065,w/2-.065])box(.13,.33,d,c,x,.59);
  }else if(f.type==='table'||f.type==='desk'){
    legs();box(w,.085,d,c,0,h-.042);if(f.type==='desk'){box(.36,.042,.25,'#d9d1b9',-.34,h+.021,0);box(.30,.029,.20,'#7b8b9e',-.30,h+.055,-.02);cyl(.1,.12,.18,'#ae8d78',w*.3,h+.09,-d*.18);}
    else{cyl(.15,.17,.022,'#cdc9b6',0,h+.013,0);cyl(.075,.06,.12,'#c89e80',0,h+.075,0);}
  }else if(f.type==='shelf'){
    box(w,h,.06,c,0,h/2,-d/2+.03);for(const x of[-w/2+.035,w/2-.035])box(.07,h,d,c,x,h/2);for(let i=0;i<5;i++){const y=.12+i*(h-.17)/4;box(w,.055,d,'#b0a28e',0,y);if(i<4)for(let j=0;j<Math.min(5,Math.floor(w/.17));j++)book(-w*.35+j*.14,y+.03,0,['#a48991','#779598','#be9d79'][j%3]);}
  }else if(f.type==='washer'){
    box(w,h,d,'#b4c2c7');box(w-.04,.14,.028,'#d9ded9',0,h-.1,d/2+.014);for(const x of[-.19,.18]){const dial=cyl(.045,.045,.025,'#687b8b',x,h-.1,d/2+.042);dial.rotation.x=Math.PI/2;}const ring=cyl(w*.30,w*.30,.04,'#d3d9d6',0,.44,d/2+.02);ring.rotation.x=Math.PI/2;const drum=cyl(w*.24,w*.24,.044,'#4e687c',0,.44,d/2+.043);drum.rotation.x=Math.PI/2;
  }else if(f.type==='boxes'){
    box(w,h*.55,d,c,0,h*.275);box(w*.8,h*.45,d*.77,'#c8b18d',w*.05,h*.775,-d*.07);box(.085,h*.55+.006,d+.006,'#ddcdae',0,h*.275);box(.08,h*.45+.006,d*.77+.006,'#ddcdae',w*.05,h*.775,-d*.07);
  }else if(f.type==='lamp'){
    cyl(w*.38,w*.48,.065,'#44465a',0,.033,0);cyl(.022,.022,h-.25,'#a58c71',0,(h-.25)/2,0);cyl(w*.29,w*.5,.32,f.warm?'#e8c58b':'#b1c9d8',0,h-.16,0);
    const light=new THREE.PointLight(f.warm?0xffc781:0xb0d5ff,4.6,5,2);light.position.set(0,h-.34,0);g.add(light);
  }else if(f.type==='plant'){
    cyl(w*.48,w*.33,.34,'#b18c78',0,.17,0);for(let i=0;i<4;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),material(i%2?'#648e83':'#507c7c'));leaf.scale.set(.47,2.4,.60);leaf.position.set(Math.sin(i*1.57)*.09,.70,Math.cos(i*1.57)*.09);leaf.castShadow=true;g.add(leaf);}
  }
  addIncidentDressing(f,g);return g;
}

export function animateFurniture(g,time,active){
 if(!g)return;const open=active?Math.min(1,time/.85)*.42:0;
 for(const drawer of g.userData.drawers||[])drawer.position.z=open;
 for(const {item,y,z}of g.userData.contents||[]){item.position.y=y+(active?Math.max(0,Math.sin(time*5+y*35))*.065:0);item.rotation.y=active?Math.sin(time*4+y*25)*.12:0;}
 (g.userData.books||[]).forEach((b,i)=>{const pull=active?Math.max(0,Math.sin(time*3-i*.65)):0;b.position.z=pull*.28;b.rotation.x=pull*-.24;});
}
