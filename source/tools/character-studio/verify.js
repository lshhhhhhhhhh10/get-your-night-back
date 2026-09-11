import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createSkinModel} from '../../skin-model.js';
import {animateReferenceSkin} from '../../reference-skin-animation.js';
const result=document.querySelector('#result'),canvas=document.querySelector('#preview'),checks=[];
const assert=(v,m)=>{if(!v)throw Error(m);};
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(canvas.clientWidth,560,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#26354a');scene.add(new THREE.HemisphereLight(0xd7eaff,0x735349,2.8));
for(const [color,power,x,y,z] of [[0xffd9a4,3,3,4,4],[0x84baf0,2,-3,2,-2]]){const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);}
const camera=new THREE.PerspectiveCamera(34,canvas.clientWidth/560,.05,30);camera.position.set(0,1,4.5/Math.min(1,camera.aspect));camera.lookAt(0,.92,0);const models=[];
function update(root){root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
function sample(root){update(root);const out=[];root.traverse(o=>{if(o.isSkinnedMesh)for(let i=0;i<o.geometry.attributes.position.count;i+=41)out.push(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));});return out;}
try{
 for(const [i,id] of ['golden-frog','golden-bull'].entries()){
  const gltf=await new GLTFLoader().loadAsync('../../../assets/models/'+id+'.glb');
  const a=createSkinModel(gltf.scene,id),b=createSkinModel(gltf.scene,id);scene.add(a);a.position.x=(i-.5)*1.4;models.push(a);
  const skinned=[];a.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);});assert(skinned.length>0,id+' skinned mesh missing');
  assert(a.getObjectByName('ArmL')!==b.getObjectByName('ArmL'),'clones share bones');
  animateReferenceSkin(a,{time:0});const rest=sample(a);animateReferenceSkin(a,{time:1,phase:Math.PI/2,moving:true});const moved=sample(a);const displacement=Math.max(...rest.map((v,j)=>v.distanceTo(moved[j])));assert(displacement>.03,'no actual runtime deformation');
  assert(b.getObjectByName('ShinR').quaternion.angleTo(gltf.scene.getObjectByName('ShinR').quaternion)<1e-7,'second instance changed');
  const clips=[];
  for(const clip of gltf.animations){const asset=clone(gltf.scene),mixer=new THREE.AnimationMixer(asset);mixer.clipAction(clip).play();mixer.setTime(clip.duration*.25);update(asset);const bounds=new THREE.Box3().setFromObject(asset,true);assert(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite),'invalid animation bounds');clips.push({name:clip.name,duration:clip.duration,height:bounds.max.y-bounds.min.y});mixer.stopAllAction();mixer.uncacheRoot(asset);}
  assert(clips.length===4,'four animation clips');
  update(b);const restBounds=new THREE.Box3().setFromObject(b,true);assert(restBounds.max.y>1.5&&restBounds.max.y<1.9,'wrong runtime scale: '+JSON.stringify([restBounds.min.toArray(),restBounds.max.toArray()]));assert(Math.abs(restBounds.min.y)<.03,'feet not near floor');
  assert(!gltf.scene.getObjectByName('Cube'),'startup cube leaked');
  checks.push({id,skinnedMeshes:skinned.length,bones:skinned[0].skeleton.bones.length,maxVertexMovement:displacement,height:restBounds.max.y,clips});
 }
 result.textContent=JSON.stringify({passed:true,checks},null,2);result.dataset.passed='true';
 const start=performance.now();function frame(now){const t=(now-start)/1000;for(const m of models)animateReferenceSkin(m,{time:t,phase:t*5,moving:true});renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(e){result.textContent=JSON.stringify({passed:false,error:e.stack,checks},null,2);result.dataset.passed='false';throw e;}
