import * as THREE from 'three';
import {SKINS,skinById} from './skins.js';
import {createSkinModel,disposeSkinModel,poseSkin} from './skin-model.js';
export class Wardrobe{
  constructor({loadTemplate,equipped,onEquip,onClose}){
    this.loadTemplate=loadTemplate;this.equipped=equipped;this.onEquip=onEquip;this.onClose=onClose;this.selected=equipped;this.ready=false;this.token=0;this.angle=.22;
    this.root=document.querySelector('#skin-screen');this.canvas=document.querySelector('#skin-preview');
    const list=document.querySelector('#skin-list');
    for(const skin of SKINS){const b=document.createElement('button');b.className='skin-card';b.dataset.skin=skin.id;b.innerHTML=`<img src="assets/skins/${skin.id}.png" alt="" width="240" height="260"><span><strong>${skin.name}</strong><small>${skin.tag}</small></span><i aria-hidden="true">✓</i>`;b.onclick=()=>this.select(skin.id);list.append(b);}
    document.querySelector('#skin-close').onclick=()=>this.close();
    document.querySelector('#skin-equip').onclick=()=>this.equip();
    document.querySelector('#skin-retry').onclick=()=>this.select(this.selected);
    document.querySelector('#skin-turn-left').onclick=()=>this.rotate(-.5);
    document.querySelector('#skin-turn-right').onclick=()=>this.rotate(.5);
    this.canvas.onpointerdown=e=>{this.dragX=e.clientX;this.canvas.setPointerCapture(e.pointerId);};
    this.canvas.onpointermove=e=>{if(this.dragX===undefined)return;this.rotate((e.clientX-this.dragX)*.012);this.dragX=e.clientX;};
    this.canvas.onpointerup=this.canvas.onpointercancel=()=>this.dragX=undefined;
  }
  init(){
    if(this.renderer)return;
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#142237');
    this.scene.add(new THREE.HemisphereLight(0xd7eaff,0x735349,2.8));
    for(const [color,power,x,y,z]of [[0xffd9a4,3,3,4,4],[0x84baf0,2,-3,2,-2]]){const light=new THREE.DirectionalLight(color,power);light.position.set(x,y,z);this.scene.add(light);}
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(.65,.70,.07,32),new THREE.MeshStandardMaterial({color:'#394b60',roughness:1}));floor.position.y=-.07;this.scene.add(floor);
    this.camera=new THREE.PerspectiveCamera(34,1,.05,20);
  }
  async open(){this.root.hidden=false;await this.select(this.equipped);}
  close(){this.token++;this.root.hidden=true;this.dragX=undefined;this.onClose();}
  async select(id){
    const skin=skinById(id),token=++this.token;this.selected=skin.id;this.ready=false;this.angle=.22;if(this.model)this.model.visible=false;
    document.querySelector('#skin-save-status').textContent='当前穿着：'+skinById(this.equipped).name+'。预览不会自动换装。';
    document.querySelector('#skin-name').textContent=skin.name;document.querySelector('#skin-description').textContent=skin.description;
    document.querySelector('#skin-load-status').textContent='正在取出这套衣服……';document.querySelector('#skin-retry').hidden=true;this.updateCards();
    try{
      this.init();const template=await this.loadTemplate(skin.id);if(token!==this.token)return;
      if(this.model){this.scene.remove(this.model);disposeSkinModel(this.model);}
      this.model=createSkinModel(template,skin.id);poseSkin(this.model);this.scene.add(this.model);
      const bounds=new THREE.Box3().setFromObject(this.model),height=bounds.max.y-bounds.min.y;
      this.model.position.y=-bounds.min.y;this.height=Math.max(1.8,height);this.ready=true;
      document.querySelector('#skin-load-status').textContent='拖动角色或按转身按钮 · 手柄右摇杆旋转';this.updateCards();
    }catch{if(token!==this.token)return;document.querySelector('#skin-load-status').textContent='这套外观没能载入，请重试。当前穿着保持不变。';document.querySelector('#skin-retry').hidden=false;this.updateCards();}
  }
  updateCards(){
    for(const b of document.querySelectorAll('[data-skin]')){b.setAttribute('aria-pressed',String(b.dataset.skin===this.selected));b.classList.toggle('equipped',b.dataset.skin===this.equipped);b.setAttribute('aria-label',`${skinById(b.dataset.skin).name}${b.dataset.skin===this.equipped?'，正在穿着':''}`);}
    const button=document.querySelector('#skin-equip');button.disabled=!this.ready||this.selected===this.equipped;button.textContent=this.selected===this.equipped?'正在穿着':'穿上这套';
  }
  async equip(){
    if(!this.ready||this.selected===this.equipped)return;
    const id=this.selected;await this.onEquip(id);this.equipped=id;this.updateCards();
  }
  rotate(delta){this.angle+=delta;}
  render(now){
    if(this.root.hidden||!this.renderer||!this.model)return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
    if(this.width!==w||this.heightPx!==h){this.width=w;this.heightPx=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
    const distance=this.height*1.9/Math.min(1,this.camera.aspect);this.camera.position.set(0,this.height*.56,distance);this.camera.lookAt(0,this.height*.51,0);
    this.model.rotation.y=this.angle;poseSkin(this.model,now/1000);this.renderer.render(this.scene,this.camera);
  }
}
