import * as THREE from 'three';
import {Game,PRESETS,COVERS,HOME,wall,occluded,distance,clamp} from './engine.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const game=new Game(0),keys=new Set();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#loading').innerHTML='浏览器无法启动 3D。请使用开启硬件加速的 Chrome、Edge 或 Safari。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
const scene=new THREE.Scene();scene.background=new THREE.Color('#111b30');scene.fog=new THREE.FogExp2('#111b30',.018);
const camera=new THREE.PerspectiveCamera(43,1,.1,90);camera.position.set(18,20,26);const cameraAim=new THREE.Vector3(5,.15,7);
const ambient=new THREE.HemisphereLight(0xb9d4ff,0x2a2341,2.1);scene.add(ambient);
const moon=new THREE.DirectionalLight(0x9fc5ff,3);moon.position.set(-8,18,-6);moon.castShadow=true;moon.shadow.mapSize.set(1536,1536);moon.shadow.camera.left=-14;moon.shadow.camera.right=14;moon.shadow.camera.top=14;moon.shadow.camera.bottom=-14;moon.shadow.normalBias=.04;scene.add(moon);
let house=new THREE.Group();scene.add(house);let doorMeshes=[],spotMeshes=[],vaseMesh,playerMesh,parentMesh,parentLight,parentTarget,stepTarget,ring,phoneMesh;
const MAT=new Map();function mat(c,roughness=.85){if(!MAT.has(c))MAT.set(c,new THREE.MeshStandardMaterial({color:c,roughness}));return MAT.get(c);}
function box(w,h,d,c,x,y,z,parent=house){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function ball(r,c,x,y,z,parent=house,scale=[1,1,1]){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(c));mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;}
function cyl(rt,rb,h,c,x,y,z,parent=house,n=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function label(text,x,y,z,color='#c8d6ee',size=.7){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='500 38px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,59);const t=new THREE.CanvasTexture(c);const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));m.scale.set(size*3,size*.56,1);m.position.set(x,y,z);house.add(m);return m;}
function lamp(x,z,warm=true){cyl(.18,.23,.12,'#393446',x,.08,z);cyl(.027,.027,1.7,'#94775f',x,.95,z);cyl(.23,.42,.46,warm?'#f4cf86':'#9fbdd6',x,1.7,z);const l=new THREE.PointLight(warm?0xffc476:0xb1d4ff,5.5,6,2);l.position.set(x,1.55,z);house.add(l);}
function plant(x,z){cyl(.21,.16,.4,'#b68169',x,.22,z);for(let i=0;i<5;i++){const a=i*1.256;const b=ball(.32,i%2?'#487c76':'#65978b',x+Math.sin(a)*.20,.6+(i%2)*.13,z+Math.cos(a)*.2,house,[.5,1.7,.7]);b.rotation.z=Math.sin(a)*.45;}}
function cabinet(x,z,name,wide=1){const g=new THREE.Group();g.position.set(x,0,z);house.add(g);box(wide,.76,.65,'#765653',0,.5,0,g);box(wide+.08,.1,.75,'#bc9577',0,.92,0,g);for(const xx of[-wide*.28,wide*.28]){box(.055,.52,.05,'#d7b38a',xx,.49,.34,g);box(.09,.05,.04,'#e8ce91',xx,.55,.38,g);}for(const xx of[-wide*.36,wide*.36])for(const zz of[-.22,.22])box(.07,.16,.07,'#363345',xx,.08,zz,g);return g;}
function character(parent=false){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const c=parent?'#b98c9c':'#edaa65';cyl(.25,.29,.6,c,0,.64,0,body);ball(.41,'#e4bd9b',0,1.24,0,body,[1,1.03,.96]);ball(.415,parent?'#5b4a54':'#443c46',0,1.4,-.05,body,[1,.48,.88]);
  for(const x of[-.14,.14]){ball(.045,'#252839',x,1.27,.36,body,[1,1.25,.5]);ball(.063,'#ce8f80',x*1.65,1.15,.33,body,[1,.45,.25]);}
  const nose=ball(.055,'#e6b08a',0,1.2,.405,body);const legs=[],arms=[];
  for(const s of[-1,1]){const leg=new THREE.Group();leg.position.set(s*.14,.43,0);cyl(.074,.082,.31,c,0,-.13,0,leg);box(.17,.105,.26,'#ece2cd',0,-.32,.04,leg);body.add(leg);legs.push(leg);const arm=new THREE.Group();arm.position.set(s*.27,.88,0);cyl(.067,.067,.38,c,0,-.17,0,arm);ball(.078,'#e4bd9b',0,-.38,0,arm);arm.rotation.z=-s*.17;body.add(arm);arms.push(arm);}
  if(!parent){const tuft=ball(.14,'#443c46',.04,1.66,-.07,body,[.7,1.5,.8]);tuft.rotation.z=-.4;}else{box(.12,.2,.16,'#e3c67f',.31,.58,.16,body);}
  g.userData={body,legs,arms};house.add(g);return g;
}
function buildHouse(){
  scene.remove(house);house.traverse(o=>{o.geometry?.dispose();if(o.material?.map)o.material.map.dispose();});house=new THREE.Group();scene.add(house);doorMeshes=[];spotMeshes=[];
  const maxX=game.level===0?10:14,center=maxX/2;
  box(maxX+1,.45,15,'#29374b',center,-.31,7);box(maxX+1.25,.16,15.25,'#40526a',center,-.6,7);
  for(let z=0;z<15;z++)for(let x=0;x<=maxX;x++){
    if(wall(x,z,game.level)){
      const h=z===0||x===0||((x===5||z===4)&&z<9&&x<10)?2.25:.72;
      box(.99,h,.99,'#465369',x,h/2-.05,z);box(1.01,.07,1.01,'#6b788e',x,h-.04,z);
    }else{
      const bedroom=z>=11&&x<7,parents=x>5&&x<9&&z>4&&z<8;const creak=game.preset.creaks.some(([a,b])=>a===x&&b===z);
      const c=creak?'#b78662':bedroom?'#788399':parents?'#615967':z<=3?'#79867f':(x+z)%2?'#7c6d68':'#8b7970';
      box(.975,.075,.975,c,x,-.025,z);
      for(const off of[-.29,.04,.36])box(.014,.006,.91,creak?'#654532':'#534f55',x+off,.018,z);
      if(creak){const crack=box(.035,.012,.62,'#332e36',x,.025,z);crack.rotation.y=.28;box(.08,.015,.15,'#d4b980',x+.25,.03,z-.25);}
    }
  }
  // 墙体采用可读的剖面；父母和藏点仍受真正的遮挡判定约束。
  for(const d of game.doors){if(game.level===0&&d.x>9)continue;const pivot=new THREE.Group();pivot.position.set(d.x-.47,0,d.z);house.add(pivot);box(.94,1.65,.12,d.x===3?'#bf9475':'#897261',.47,.84,0,pivot);box(.72,1.1,.04,'#8f725e',.47,.92,.07,pivot);ball(.055,'#edca7b',.79,.85,.12,pivot);for(const xx of[-.53,.53])box(.08,1.83,.2,'#d0ac86',d.x+xx,.9,d.z);box(1.16,.10,.2,'#d0ac86',d.x,1.81,d.z);doorMeshes.push({d,pivot});}
  box(1.4,.36,2,'#66546b',1.7,.27,12);box(1.32,.26,1.92,'#b1bdd1',1.7,.57,12);box(1.3,.14,1.23,'#667d9d',1.7,.77,12.3);box(1.14,.18,.44,'#e0d7cc',1.7,.79,11.32);box(1.46,1,.12,'#8b716a',1.7,.6,10.95);lamp(4.8,12.9);box(1.4,.04,1.9,'#c2a383',3.7,.03,12);
  const bedsideGlow=new THREE.PointLight(0xffb95e,20,6,1.8);bedsideGlow.position.set(3.5,2,11.8);house.add(bedsideGlow);
  const seam=box(.82,.015,.04,'#ffd994',3,.06,9.92);seam.material=new THREE.MeshStandardMaterial({color:0xffca79,emissive:0xffb550,emissiveIntensity:2});
  const doorGlow=new THREE.PointLight(0xffb955,5,3,1.5);doorGlow.position.set(3,.18,9.75);house.add(doorGlow);
  box(1.65,.45,2.0,'#674e65',7,.29,5.8);box(1.6,.18,1.9,'#a69da6',7,.62,5.8);box(1.58,.2,1.2,'#867a99',7,.81,6.1);box(1.2,.15,.4,'#d4c6be',7,.81,5.1);label('父母房间',7,2.65,5.4,'#aab5ce',.66);
  label('你的卧室',3.7,.16,13.3,'#f6d6a4',.65).material.depthTest=false;
  for(const c of COVERS){if(game.level===0&&c.x>9)continue;
    if(c.name==='沙发'){box(.82,.38,.85,'#587f80',c.x,.34,c.z);box(.9,1.05,.22,'#678e8b',c.x,.65,c.z-.34);for(const s of[-1,1])box(.18,.66,.84,'#4b7175',c.x+s*.4,.39,c.z);box(.58,.14,.54,'#80a5a0',c.x,.61,c.z+.06);}
    else if(c.name==='高背扶手椅'){box(.9,1.12,.24,'#8b6870',c.x,.6,c.z-.3);box(.7,.48,.78,'#a57c7d',c.x,.3,c.z);for(const s of[-1,1])box(.15,.73,.8,'#7e5f6b',c.x+s*.4,.43,c.z);box(.5,.19,.42,'#d4a181',c.x,.61,c.z);}
    else{box(.88,1.75,.8,'#746e6c',c.x,.9,c.z);for(let y=.3;y<1.7;y+=.38){box(.8,.05,.86,'#b79c7c',c.x,y,c.z);for(let i=0;i<3;i++)box(.12,.25,.32,['#bd9168','#719995','#a7a0b4'][i],c.x-.25+i*.21,y+.15,c.z+.2);}}
  }
  for(const s of game.spots){const mesh=cabinet(s.x,s.z,s.name,1.0);const marker=label('E · 搜索',s.x,1.45,s.z,'#f5d899',.48);marker.visible=false;spotMeshes.push({s,mesh,marker});}
  for(const x of[3,11]){if(game.level===0&&x>9)continue;box(2.4,1.25,.10,'#91b4c7',x,1.3,.48);for(const dx of[-1.25,0,1.25])box(.09,1.4,.18,'#b0bac6',x+dx,1.3,.54);box(2.65,.1,.4,'#9198a9',x,.62,.52);box(2.65,.1,.2,'#afb7c2',x,1.99,.54);const light=new THREE.PointLight(0xb9deff,4,6);light.position.set(x,1.8,1);house.add(light);}
  plant(1,1);plant(8,1);if(game.level>0)plant(13,3);lamp(4,1);box(2.0,.035,1.4,'#64777b',5.5,.04,2);box(.8,.4,.62,'#a68978',5.5,.26,2);cyl(.18,.18,.05,'#e2cf9f',5.5,.49,2);
  const vaseStand=cabinet(9,2.8,'花瓶台',.6);vaseMesh=new THREE.Group();vaseMesh.position.set(9,.97,2.8);house.add(vaseMesh);cyl(.11,.2,.32,'#adbdc6',0,.16,0,vaseMesh);cyl(.09,.12,.16,'#bccdd1',0,.4,0,vaseMesh);ball(.14,'#769083',0,.69,0,vaseMesh,[.5,1.7,.5]);vaseMesh.visible=game.level===2;
  playerMesh=character();playerMesh.position.set(game.player.x,0,game.player.z);phoneMesh=box(.15,.26,.035,'#293349',.30,.45,.20,playerMesh.userData.body);box(.11,.19,.015,'#9bcbc6',0,0,.026,phoneMesh);phoneMesh.visible=false;parentMesh=character(true);parentMesh.position.set(7,0,6);parentMesh.visible=false;
  parentLight=new THREE.SpotLight(0xffd496,16,7,Math.PI/6,.6,1.4);parentLight.position.set(7,1.1,6);parentTarget=new THREE.Object3D();house.add(parentTarget);parentLight.target=parentTarget;house.add(parentLight);
  stepTarget=new THREE.Mesh(new THREE.RingGeometry(.30,.37,40),new THREE.MeshBasicMaterial({color:0xf4ce8a,transparent:true,opacity:.85,depthWrite:false}));stepTarget.rotation.x=-Math.PI/2;stepTarget.visible=false;house.add(stepTarget);
  ring=new THREE.Mesh(new THREE.RingGeometry(.32,.37,40),new THREE.MeshBasicMaterial({color:0xf7d28c,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;house.add(ring);
}

let audioContext,master,volume=.55,muted=false;
function enableAudio(){if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();master=audioContext.createGain();master.gain.value=volume;master.connect(audioContext.destination);}audioContext.resume();}
function sound(kind,strength,x,z){if(!audioContext||muted)return;const now=audioContext.currentTime;const g=audioContext.createGain(),pan=audioContext.createStereoPanner();pan.pan.value=clamp((x-game.player.x)/9,-.85,.85);g.connect(pan);pan.connect(master);const dist=Math.max(1,distance({x,z},game.player));const loud=Math.min(.19,.08+(strength||20)/450)/(1+dist*.11);
  if(['step','parentStep','crash','bed','snore','wobble','creak'].includes(kind)){
    const duration=kind==='snore'?1.5:kind==='crash'?.65:kind==='creak'?.48:.23;const n=audioContext.sampleRate*duration;const b=audioContext.createBuffer(1,n,audioContext.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1);const src=audioContext.createBufferSource();src.buffer=b;const filter=audioContext.createBiquadFilter();filter.type=kind==='crash'?'highpass':'bandpass';filter.frequency.value=kind==='snore'?150:kind==='creak'?520:kind==='bed'?240:kind==='crash'?1700:120;filter.Q.value=kind==='creak'?9:1.2;src.connect(filter);filter.connect(g);g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(loud,now+.035);g.gain.exponentialRampToValueAtTime(.001,now+duration);src.start();src.stop(now+duration);
  }else{const notes=kind==='win'?[392,494,587,784]:kind==='found'?[440,659]:kind==='lose'?[220,185,146]:kind==='notice'?[620,660]:[340,510];notes.forEach((hz,i)=>{const o=audioContext.createOscillator(),ng=audioContext.createGain();o.type='sine';o.frequency.value=hz;o.connect(ng);ng.connect(g);ng.gain.setValueAtTime(.0,now+i*.12);ng.gain.linearRampToValueAtTime(loud,now+i*.12+.02);ng.gain.exponentialRampToValueAtTime(.001,now+i*.12+.35);o.start(now+i*.12);o.stop(now+i*.12+.4);});g.gain.value=.7;}
}
const stateNames={sleep:'鼾声平稳',alert:'鼾声停了',warning:'床板响了',checking:'脚步靠近',returning:'脚步远去'};
function setupLevel(level,start=true){game.reset(level);buildHouse();$('#result').hidden=true;$('#pause-screen').hidden=true;$('#start-screen').hidden=start;$('#hud').hidden=!start;$('#preset-title').textContent=`0${level+1} / ${PRESETS[level].name}`;$('#night-number').textContent=`第 ${level+1} 夜`;if(start){game.start();enableAudio();}keys.clear();renderUI();}
function context(){if(game.hidden)return'C · 离开掩体';if(game.mode)return'';const d=game.doorNear(),s=game.spotNear(),c=game.coverNear();if(d)return`E · 推开${d.name}`;if(s)return`E · 搜索${s.name}`;if(c)return`C · 躲在${c.name}后`;return game.hasDevice?'带设备返回卧室':'WASD / 方向键 · 移动';}
let lastStatus='',lastMode='',lastToast='';
function renderUI(){
  const p=game.parent,m=game.mode;$('#objective').textContent=game.hasDevice?'带设备回到卧室':'去客厅找回设备';$('#device-icon').classList.toggle('found',game.hasDevice);$('#parent-cue').textContent=stateNames[p.state];$('#parent-cue').dataset.state=p.state;$('#context').textContent=context();$('#context').hidden=!context();$('#hide-badge').hidden=!game.hidden;
  const noise=Math.max(0,game.noise*(1-game.noiseAge/3));$('#noise-fill').style.width=`${noise}%`;$('#noise-label').textContent=game.noiseAge<2?noise>25?'刚才有点响':'轻轻的':'听一听';
  $('#detection').hidden=p.recognition<=0;$('#detection-fill').style.width=`${Math.min(100,p.recognition/1.65*100)}%`;
  const displayText=game.toastLeft>0?game.toast:(p.state==='sleep'?'远处传来平稳的鼾声。':p.state==='checking'?'留意脚步方向和移动的暖光。':'停一下，再判断。');if(lastToast!==displayText){$('#subtitle').textContent=displayText;lastToast=displayText;}
  $('#interaction').hidden=!m;const type=m?.type||'';if(type!==lastMode){lastMode=type;$('#timing-panel').hidden=!['step','catch'].includes(type);$('#door-panel').hidden=type!=='door';$('#search-panel').hidden=type!=='search';}
  if(m){$('#interaction-title').textContent={step:'轻轻落脚',catch:'接住花瓶',door:m.door?.name,search:`搜索${m.spot?.name}`}[m.type];
    if(m.type==='step'||m.type==='catch'){$('#safe-band').style.left=`${(1-game.preset.width)*50}%`;$('#safe-band').style.width=`${game.preset.width*100}%`;$('#pointer').style.left=`${game.pointer*100}%`;$('#timing-help').textContent=m.type==='catch'?`花瓶在晃 · ${Math.max(0,m.remaining).toFixed(1)} 秒`:'指针进入亮区时按空格';$('#timing-button').textContent=m.type==='catch'?'空格 · 接住':'空格 · 落脚';}
    if(m.type==='door'){$('#door-speed').value=game.speed;$('#door-progress').style.width=`${m.door.progress*100}%`;const b=m.door.band;$('#door-help').textContent=game.speed<b[0]?'太慢 · 听见持续吱响':game.speed>b[1]?'太快 · 门可能碰响':'声音很轻 · 保持这个速度';$('#speed-value').textContent=`${Math.round(game.speed*100)}%`;}
    if(m.type==='search')$('#search-progress').style.width=`${Math.min(100,m.elapsed/6*100)}%`;
  }
  if(game.status!==lastStatus){lastStatus=game.status;if(['won','lost'].includes(game.status))showResult();}
}
function showResult(){
  const won=game.status==='won';$('#result').hidden=false;$('#result-kicker').textContent=won?'这一夜，平安收尾':'先别急着再来';$('#result-title').textContent=won?'夜晚，拿回来了。':'被看见了。';$('#result-copy').textContent=won?`设备已经回到卧室。你用了 ${Math.floor(game.time/60)} 分 ${Math.floor(game.time%60)} 秒，完成了 ${game.safeSteps} 次安静落脚。`:'一次响声没有让你失败；父母走近后持续看清了你。下次可以更早停下，或让家具挡住视线。';
  $('#replay-list').replaceChildren();for(const item of game.history.slice(-5)){const li=document.createElement('li');li.textContent=`${Math.floor(item.time)} 秒 · ${item.text}`;$('#replay-list').append(li);}
  $('#next-night').hidden=!won||game.level===2;$('#retry').textContent=won?'再玩这一夜':'调整一下，再试';$('#all-done').hidden=!won||game.level!==2;
}
function togglePause(){if(game.status!=='playing')return;game.active=!game.active;$('#pause-screen').hidden=game.active;keys.clear();}
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
  if(k==='escape'){if(game.mode)game.cancel();else togglePause();return;}
  if(!game.active)return;keys.add(k);if(e.repeat)return;if(k==='e')game.action();if(k===' ')game.pressSpace();if(k==='c')game.hide();
});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();if(game.active&&game.status==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.active&&game.status==='playing')togglePause();});
window.addEventListener('wheel',e=>{if(game.mode?.type==='door'){e.preventDefault();game.speed=clamp(game.speed-e.deltaY*.0006,.05,1);}},{passive:false});
$('#begin').onclick=()=>setupLevel(Number($('#level-select').value));$('#retry').onclick=()=>setupLevel(game.level);$('#next-night').onclick=()=>setupLevel(game.level+1);$('#pause-button').onclick=togglePause;$('#resume').onclick=togglePause;
for(const b of document.querySelectorAll('[data-menu]'))b.onclick=()=>{game.active=false;game.status='ready';$('#pause-screen').hidden=true;$('#result').hidden=true;$('#hud').hidden=true;$('#start-screen').hidden=false;};
$('#level-select').onchange=e=>{const n=Number(e.target.value);setupLevel(n,false);$('#level-description').textContent=PRESETS[n].description;};
$('#door-speed').oninput=e=>game.speed=Number(e.target.value);$('#timing-button').onclick=()=>game.pressSpace();$('#cancel-action').onclick=()=>game.cancel();
$('#push-door').onpointerdown=e=>{e.preventDefault();keys.add('e');e.target.setPointerCapture(e.pointerId);};$('#push-door').onpointerup=()=>keys.delete('e');$('#push-door').onpointercancel=()=>keys.delete('e');
$('#sound-button').onclick=()=>{enableAudio();muted=!muted;$('#sound-button').textContent=muted?'声音：关':'声音：开';$('#sound-button').setAttribute('aria-pressed',String(!muted));};$('#volume').oninput=e=>{volume=Number(e.target.value);if(master)master.gain.value=volume;};
$('#context').onclick=()=>{if(game.coverNear()&&!game.doorNear()&&!game.spotNear()||game.hidden)game.hide();else game.action();};
for(const el of document.querySelectorAll('[data-move]')){el.onpointerdown=e=>{e.preventDefault();keys.add(el.dataset.move);el.setPointerCapture(e.pointerId);};el.onpointerup=()=>keys.delete(el.dataset.move);el.onpointercancel=()=>keys.delete(el.dataset.move);}
let last=performance.now(),fps=60,frames=0,acc=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.06,(now-last)/1000);last=now;frames++;acc+=dt;if(acc>=1){fps=frames/acc;frames=0;acc=0;}
  if(game.active){if(game.mode?.type==='door'){if(keys.has('arrowleft')||keys.has('a'))game.speed=clamp(game.speed-dt*.4,.05,1);if(keys.has('arrowright')||keys.has('d'))game.speed=clamp(game.speed+dt*.4,.05,1);}else if(!game.mode){const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(dx)game.move(dx,0);else if(dz)game.move(0,dz);}game.tick(dt,{e:keys.has('e')});}
  for(const e of game.events.splice(0))if(e.type==='sound')sound(e.kind,e.strength,e.x,e.z);
  const target=new THREE.Vector3(game.player.x,0,game.player.z),moving=playerMesh.position.distanceTo(target)>.035;playerMesh.position.lerp(target,Math.min(1,dt*12));playerMesh.rotation.y=THREE.MathUtils.lerp(playerMesh.rotation.y,game.player.heading,dt*12);const body=playerMesh.userData.body;body.position.y=game.hidden?-.37:moving?Math.abs(Math.sin(now*.010))*.045:Math.sin(now*.002)*.013;body.rotation.x=game.hidden?-.23:0;
  playerMesh.userData.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(now*.011+i*Math.PI)*.58:0);playerMesh.userData.arms.forEach((a,i)=>{a.rotation.x=game.mode?.type==='catch'?-1.9:game.mode?.type==='door'?-1.1:moving?Math.sin(now*.011+i*Math.PI)*.40:0;});phoneMesh.visible=game.hasDevice;
  if(game.status==='won'){body.position.y=Math.abs(Math.sin(now*.005))*.25;playerMesh.userData.arms.forEach((a,i)=>a.rotation.z=(i===0?1:-1)*1.9);}
  ring.position.set(playerMesh.position.x,.045,playerMesh.position.z);ring.material.opacity=game.hidden?.25:.65;
  parentMesh.position.set(game.parent.x,0,game.parent.z);parentMesh.rotation.y=game.parent.heading;const parentMoving=['checking','returning'].includes(game.parent.state);parentMesh.visible=parentMoving&&!occluded(game.player,game.parent,game.level,game.doors);parentLight.visible=parentMoving;parentLight.position.set(game.parent.x,1.1,game.parent.z);parentTarget.position.set(game.parent.x+Math.sin(game.parent.heading)*4,.05,game.parent.z+Math.cos(game.parent.heading)*4);parentMesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(now*.006+i*Math.PI)*.22);
  for(const{d,pivot}of doorMeshes)pivot.rotation.y=d.progress*Math.PI*.52;
  for(const{s,mesh,marker}of spotMeshes){marker.visible=!s.searched&&distance(s,game.player)<2&&!occluded(game.player,s,game.level,game.doors);mesh.children[0].material=mat(s.searched?'#56606a':'#765653');}
  stepTarget.visible=game.mode?.type==='step';if(stepTarget.visible)stepTarget.position.set(game.mode.target.x,.045,game.mode.target.z);
  vaseMesh.rotation.z=game.vase==='wobbling'?Math.sin(now*.023)*.32:game.vase==='fallen'?Math.PI/2:0;vaseMesh.position.y=game.vase==='fallen'?.18:.97;
  const inAction=game.active&&['door','search','catch'].includes(game.mode?.type)&&!parentMoving;
  const center=game.level===0?5:7;
  const framing=game.status==='ready'?new THREE.Vector3(center,0,7):new THREE.Vector3(center+(game.player.x-center)*.28,0,7+(game.player.z-7)*.32);
  const offset=game.status==='ready'?new THREE.Vector3(13,19,20):inAction?new THREE.Vector3(4.3,7,8):new THREE.Vector3(9,17.8,18.5);
  if(inAction)framing.lerp(target,.88);camera.position.lerp(framing.clone().add(offset),dt*2);cameraAim.lerp(new THREE.Vector3(framing.x,.4,framing.z),dt*3);camera.lookAt(cameraAim);
  renderer.render(scene,camera);renderUI();
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
buildHouse();resize();$('#loading').hidden=true;requestAnimationFrame(animate);
// 本地测试只读入口；不提供改变胜负、传送或自动通关的线上控制。
window.gameSnapshot=()=>({status:game.status,level:game.level,player:{...game.player},parent:{...game.parent,route:undefined},mode:game.mode?.type,hasDevice:game.hasDevice,hidden:game.hidden,time:game.time,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,doors:game.doors.map(d=>({x:d.x,z:d.z,open:d.open})),vase:game.vase});
