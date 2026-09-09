import * as THREE from 'three';
// Game-scale adaptations: the pale variants follow the student's explicit colour choice.
export function createMilkSkin(id){
 const root=new THREE.Group();root.userData.skinId=id;const mouse=id==='naishu',frog=id==='naiwa';
 const skin=mouse?'#eee6db':frog?'#f1edd4':'#f4c545',belly=mouse?'#fff6eb':frog?'#fff8e3':'#ffe5a0',dark='#292b30';
 const mats=new Map();const mat=c=>{if(!mats.has(c)){const m=new THREE.MeshStandardMaterial({color:c,roughness:.8});m.userData.skinOwned=true;mats.set(c,m);}return mats.get(c);};
 const ell=(p,c,x,y,z,a,b,d)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),mat(c));mesh.scale.set(a,b,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.userData.skinOwned=true;p.add(mesh);return mesh;};
 ell(root,skin,0,.70,0,.43,.54,.33);ell(root,belly,0,.65,.235,.33,.37,.13);
 const head=new THREE.Group();head.position.set(0,1.22,.055);root.add(head);ell(head,skin,0,0,0,frog?.32:.39,frog?.33:.35,.30);
 if(mouse){
  for(const s of[-1,1]){ell(head,skin,s*.30,.27,-.025,.205,.205,.105);ell(head,'#ddb7b3',s*.30,.27,.06,.133,.138,.023);ell(head,belly,s*.1,-.08,.255,.14,.12,.10);}
  ell(head,'#b17c82',0,-.035,.36,.045,.036,.034);
  const tooth=new THREE.Mesh(new THREE.BoxGeometry(.078,.067,.025),mat('#fff9ea'));tooth.position.set(0,-.18,.338);head.add(tooth);tooth.userData.skinOwned=true;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.32,-.26),new THREE.Vector3(.22,.20,-.56),new THREE.Vector3(.41,.24,-.61),new THREE.Vector3(.44,.34,-.48)]);const tail=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.024,7,false),mat('#d9b1ad'));tail.userData.skinOwned=true;root.add(tail);
 }else if(!frog){
  ell(head,skin,0,-.10,.17,.35,.22,.24);
  for(const s of[-1,1]){ell(head,'#efcf78',s*.22,.26,-.1,.055,.11,.055);ell(head,'#9f8639',s*.095,-.052,.38,.018,.016,.009);}
  const tail=ell(root,skin,0,.38,-.39,.18,.17,.36);tail.rotation.x=-.25;
  for(let i=0;i<3;i++)ell(root,'#e1ab38',0,.75-i*.14,-.30-i*.09,.063,.10,.06);
 }
 for(const s of[-1,1]){
  const ex=s*(frog?.235:mouse?.16:.19),ey=frog?.14:.07,ez=frog?.235:.252;
  ell(head,frog?skin:'#fff8e6',ex,ey,ez,frog?.142:.12,frog?.15:.15,.072);
  if(!mouse)ell(head,'#8d9f61',ex,ey,ez+.055,.078,.10,.028);
  ell(head,dark,ex,ey,ez+.079,mouse?.057:.052,mouse?.073:.078,.022);ell(head,'#fffdf5',ex-.019,ey+.032,ez+.099,.021,.025,.009);
  ell(head,'#e1b0a0',s*.265,-.08,.24,.05,.024,.019);
  const arm=new THREE.Bone();arm.name=s<0?'ArmL':'ArmR';arm.position.set(s*.34,.88,.01);arm.rotation.z=s<0?.72:-.72;root.add(arm);ell(arm,skin,s*.015,-.17,.05,.11,.23,.115);ell(arm,skin,s*.024,-.34,.095,.115,.095,.10);
  const leg=new THREE.Bone();leg.name=s<0?'LegL':'LegR';leg.position.set(s*.20,.30,0);root.add(leg);ell(leg,skin,0,-.075,0,.15,.17,.145);ell(leg,skin,0,-.21,.10,.17,.082,.22);
  if(!mouse)for(let i=0;i<3;i++)ell(leg,belly,(i-1)*.064,-.21,.277,.027,.022,.035);
 }
 if(!mouse){const mouth=new THREE.Mesh(new THREE.TorusGeometry(frog?.17:.105,.008,4,20,Math.PI),mat('#796846'));mouth.rotation.z=Math.PI;mouth.position.set(0,-.1,frog?.283:.387);mouth.userData.skinOwned=true;head.add(mouth);}
 return root;
}
