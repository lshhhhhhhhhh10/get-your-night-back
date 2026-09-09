import * as THREE from 'three';
import {CLUES,LURES} from './night-tools.js';
export function buildNightProps(house,level){
 const props=[];const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 function mesh(g,geometry,color,x,y,z){const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.material.userData.nightOwned=true;g.add(m);return m;}
 const box=(g,w,h,d,c,x,y,z)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);
 for(const item of [...CLUES,...LURES.filter(l=>l.minLevel<=level)]){
  const g=new THREE.Group();g.position.set(item.x,item.y,item.z);house.add(g);if(item.kind==='radio')g.rotation.y=item.id==='radio'?-Math.PI/2:Math.PI;let lamp;
  if(CLUES.some(c=>c.id===item.id)){box(g,.3,.013,.24,'#ead7ac',0,0,0);for(let i=0;i<3;i++)box(g,.17-i*.025,.003,.009,'#776a5f',-.015,.01,-.065+i*.055);}
  else if(item.kind==='radio'){box(g,.30,.23,.16,'#a38362',0,.115,0);for(let i=0;i<4;i++)box(g,.13,.012,.008,'#463d3f',-.05,.07+i*.04,.084);lamp=box(g,.045,.045,.01,'#cdb481',.095,.16,.085);box(g,.008,.20,.008,'#b5b7aa',.10,.33,0);}
  else{const body=mesh(g,new THREE.SphereGeometry(.16,12,8),'#e8bc58',0,.13,0);body.scale.set(1,.8,1.2);mesh(g,new THREE.SphereGeometry(.10,12,8),'#f1cf72',0,.27,.085);box(g,.12,.04,.10,'#c98a49',0,.25,.17);for(const x of[-.055,.055])mesh(g,new THREE.SphereGeometry(.017,8,6),'#34343c',x,.295,.159);}
  props.push({item,g,lamp});
 }
 return props;
}
export function updateNightProps(props,game){for(const {item,g,lamp}of props){const l=game.night.lures[item.id];g.rotation.z=l&&!l.done&&l.pulses>0?Math.sin(game.time*23)*.035:0;if(lamp){lamp.material.emissive.setHex(l&&!l.done?0xffad45:0x000000);lamp.material.emissiveIntensity=.8;}}}
