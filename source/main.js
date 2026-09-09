import {furnitureFor,OPENINGS,PARENT_BED} from './layout.js';
import {createFurniture} from './furniture.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';
import {readSettings,readSession,saveSession,writeJSON,SETTINGS_KEY} from './persistence.js';
import {Soundscape} from './audio.js';
import {Game,PRESETS,HOME,MAP_DEPTH,mapWidth,MINIMAP_RADIUS,RECOGNITION_TIME,wall,occluded,distance,clamp} from './engine.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const game=new Game(0),keys=new Set();
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('unavailable')}};}
const settings=readSettings(storage);
const view={mode:'overview',hasMoved:false,yaw:0,pitch:-.10};
let assetTemplate,wallMeshes=[],openingMeshes=[],worldLabels=[],ceiling,sceneReady=false;
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
function label(text,x,y,z,color='#c8d6ee',size=.7){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='500 38px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,59);const t=new THREE.CanvasTexture(c);const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));m.scale.set(size*3,size*.56,1);m.position.set(x,y,z);house.add(m);worldLabels.push(m);return m;}
function createPlayer(parent=false){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const asset=cloneRig(assetTemplate);body.add(asset);const bones={};
  asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if(o.isBone){bones[o.name]={bone:o,rest:o.quaternion.clone()};}});
  if(parent){
    g.scale.setScalar(1.12);
    asset.traverse(o=>{if(o.isMesh&&/CLOTHES|Scarf/i.test(o.name)){const tint=m=>{const copy=m.clone();copy.color.multiply(new THREE.Color('#aca6d8'));copy.userData.parentOwned=true;return copy;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);}});
  }
  g.userData={body,asset,bones,role:parent?'parent':'player'};house.add(g);return g;
}
function buildHouse(){
  scene.remove(house);house.traverse(o=>{if(!o.isSkinnedMesh)o.geometry?.dispose();if(o.isSprite)o.material?.map?.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.parentOwned)m.dispose();});house=new THREE.Group();scene.add(house);doorMeshes=[];spotMeshes=[];wallMeshes=[];openingMeshes=[];worldLabels=[];
  const maxX=mapWidth(game.level)-1,center=maxX/2,depth=MAP_DEPTH,cz=(depth-1)/2;
  box(maxX+1,.45,15,'#29374b',center,-.31,7);box(maxX+1.25,.16,15.25,'#40526a',center,-.6,7);
  box(maxX-9,.45,4,'#29374b',(maxX+10)/2,-.31,16.5);box(maxX-8.75,.16,4.25,'#40526a',(maxX+10)/2,-.6,16.5);
  ceiling=box(maxX+1,.08,depth,'#556279',center,2.64,cz);ceiling.visible=false;ceiling.castShadow=false;
  const floors=new Map();const floorBox=(w,h,d,c,x,y,z)=>{if(!floors.has(c))floors.set(c,[]);floors.get(c).push([w,h,d,x,y,z]);};
  for(let z=0;z<depth;z++)for(let x=0;x<=maxX;x++){
    if(z>14&&x<10)continue;
    if(wall(x,z,game.level)){
      const h=z===0||x===0||((x===5||z===4)&&z<9&&x<10)?2.25:.72;
      const mesh=box(1.005,2.6,1.005,'#465369',x,1.3,z),cap=box(1.015,.045,1.015,'#6b788e',x,2.585,z);wallMeshes.push({mesh,cap,height:h});
    }else{
      const bedroom=z>=11&&x<7,parents=x>5&&x<9&&z>4&&z<8;const creak=game.preset.creaks.some(([a,b])=>a===x&&b===z);
      const c=creak?'#b78662':x>18&&z<7?'#8daaa3':x>=15&&z<7?'#657c98':x>=15&&z<14?'#938087':z>=14?'#778d9a':bedroom?'#788399':parents?'#615967':z<=3?'#79867f':(x+z)%2?'#7c6d68':'#8b7970';
      floorBox(.975,.075,.975,c,x,-.025,z);
      for(const off of[-.29,.04,.36])floorBox(.014,.006,.91,creak?'#654532':'#534f55',x+off,.018,z);
      if(creak){const crack=box(.035,.012,.62,'#332e36',x,.025,z);crack.rotation.y=.28;box(.08,.015,.15,'#d4b980',x+.25,.03,z-.25);}
    }
  }
  for(const[color,items]of floors){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(color),items.length),m=new THREE.Matrix4();items.forEach(([w,h,d,x,y,z],i)=>{m.makeScale(w,h,d);m.setPosition(x,y,z);mesh.setMatrixAt(i,m);});mesh.receiveShadow=true;house.add(mesh);}
  // 门洞有侧壁、完整过梁，第一人称墙顶与天花板严密相接。
  for(const[x,z,axis]of OPENINGS){if(wall(x,z,game.level))continue;
    const opening=new THREE.Group();opening.position.set(x,0,z);opening.rotation.y=axis==='z'?Math.PI/2:0;house.add(opening);opening.visible=false;openingMeshes.push(opening);
    box(1,.35,1.005,'#465369',0,2.425,0,opening);
    for(const xx of[-.48,.48])box(.04,2.25,1.03,'#b7a38f',xx,1.125,0,opening);
    box(1.06,.09,1.04,'#c6b29a',0,2.245,0,opening);
  }
  for(const d of game.doors){const pivot=new THREE.Group();pivot.position.set(d.x-.47,0,d.z);house.add(pivot);
    box(.94,2.16,.12,d.x===3?'#ba9479':'#958474',.47,1.08,0,pivot);
    for(const y of[.58,1.55])for(const side of[-1,1])box(.73,.76,.022,'#aa8b73',.47,y,side*.07,pivot);
    for(const side of[-1,1]){ball(.045,'#edca7b',.81,1.03,side*.11,pivot);box(.09,.18,.016,'#786657',.81,1.03,side*.077,pivot);}
    doorMeshes.push({d,pivot});
  }
  const furniture=new Map();for(const f of furnitureFor(game.level)){const mesh=createFurniture(f);house.add(mesh);furniture.set(f.id,mesh);}
  for(const s of game.spots){const mesh=furniture.get(s.id),f=furnitureFor(game.level).find(f=>f.id===s.id);const marker=label('E · 搜索',s.x,f.h+.38,s.z,'#f5d899',.48);marker.visible=false;spotMeshes.push({s,mesh,marker});}
  // 薄地毯没有阻挡体积；居住用途通过成组家具、挂画和灯光表达。
  box(1.3,.018,1.8,'#b6a086',3.65,.026,12.15);box(2.2,.018,2.6,'#5e7d82',2.6,.026,2.8);
  const bedsideGlow=new THREE.PointLight(0xffb95e,14,6,1.8);bedsideGlow.position.set(3.5,2,11.8);house.add(bedsideGlow);
  const seam=box(.82,.015,.04,'#ffd994',3,.06,9.92);seam.material=new THREE.MeshStandardMaterial({color:0xffca79,emissive:0xffb550,emissiveIntensity:2});
  const doorGlow=new THREE.PointLight(0xffb955,5,3,1.5);doorGlow.position.set(3,.18,9.75);house.add(doorGlow);
  for(const x of[3,11,...(game.level>0?[21]:[])]){
    box(2.2,1.15,.045,'#273d59',x,1.58,.515);
    for(const dx of[-1.13,0,1.13])box(.065,1.27,.10,'#a4b4c4',x+dx,1.58,.55);
    for(const y of[.96,2.20])box(2.33,.075,.15,'#c0c7c7',x,y,.56);
    box(2.42,.075,.28,'#afb7bf',x,.93,.62);box(1.02,.015,.018,'#718caa',x-.56,1.86,.544);
    const light=new THREE.PointLight(0xb9deff,3.6,5);light.position.set(x,1.8,1);house.add(light);
  }
  // 踢脚线只附着在可见墙面上，不伸入门洞。
  for(let z=1;z<MAP_DEPTH-1;z++)for(let x=1;x<mapWidth(game.level)-1;x++)if(!wall(x,z,game.level))for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(wall(x+dx,z+dz,game.level))box(dx?.035:1,.11,dz?.035:1,'#88909b',x+dx*.49,.055,z+dz*.49);
  for(const[x,z,axis]of[[2,10.51,'x'],[14.51,4.8,'z']]){const g=new THREE.Group();g.position.set(x,1.6,z);g.rotation.y=axis==='z'?Math.PI/2:0;house.add(g);box(.63,.54,.035,'#b7a185',0,0,0,g);box(.53,.44,.008,'#5b8490',0,0,.022,g);box(.29,.15,.01,'#b6b4a5',0,-.08,.029,g);}
  vaseMesh=new THREE.Group();vaseMesh.position.set(9.7,.88,2.8);house.add(vaseMesh);cyl(.11,.2,.32,'#adbdc6',0,.16,0,vaseMesh);cyl(.09,.12,.16,'#bccdd1',0,.4,0,vaseMesh);ball(.14,'#769083',0,.69,0,vaseMesh,[.5,1.7,.5]);vaseMesh.visible=game.level===2;
  for(const[text,x,z]of[['你的卧室',4,12],['父母房间',7,6],['客厅',3,4.1],['书房',16,3],['储物间',16,11.8],['洗衣间',12,16.2],...(game.level>0?[['餐厅',21,3],['后走廊',21,16]]:[])])label(text,x,2.72,z,'#c5d5e5',.58);
  playerMesh=createPlayer();playerMesh.position.set(game.player.x,0,game.player.z);phoneMesh=box(.15,.26,.035,'#293349',.30,.45,.20,playerMesh.userData.body);box(.11,.19,.015,'#9bcbc6',0,0,.026,phoneMesh);phoneMesh.visible=false;parentMesh=createPlayer(true);parentMesh.position.set(7,0,6);parentMesh.visible=false;
  parentLight=new THREE.SpotLight(0xffd496,16,7,Math.PI/6,.6,1.4);parentLight.castShadow=true;parentLight.shadow.mapSize.set(512,512);parentLight.shadow.normalBias=.03;parentLight.position.set(7,1.1,6);parentTarget=new THREE.Object3D();house.add(parentTarget);parentLight.target=parentTarget;house.add(parentLight);
  stepTarget=new THREE.Mesh(new THREE.RingGeometry(.30,.37,40),new THREE.MeshBasicMaterial({color:0xf4ce8a,transparent:true,opacity:.85,depthWrite:false}));stepTarget.rotation.x=-Math.PI/2;stepTarget.visible=false;house.add(stepTarget);
  ring=new THREE.Mesh(new THREE.RingGeometry(.32,.37,40),new THREE.MeshBasicMaterial({color:0xf7d28c,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;house.add(ring);
}

let audioContext,soundscape;
function applyAudio(){soundscape?.apply();}
function enableAudio(){if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();soundscape=new Soundscape(audioContext,settings);}audioContext.resume().catch(()=>{});}
function sound(kind,strength,x,z){soundscape?.effect(kind,strength,x,z,game.player,view.yaw,occluded(game.player,{x,z},game.level,game.doors));}
const stateNames={sleep:'鼾声平稳',alert:'鼾声停了',warning:'床板响了',checking:'脚步靠近',returning:'脚步远去'};
let saved=readSession(storage),selectedLevel=0,settingsFromPause=false,lastStatus='',lastMode='',lastToast='',lastSave=0,lastUi=0,unlockUntil=0;
let transition={time:1,from:camera.position.clone(),rotation:camera.quaternion.clone()};
function setView(mode){
  if(view.mode===mode)return;transition={time:0,from:camera.position.clone(),rotation:camera.quaternion.clone()};view.mode=mode;
  if(mode==='overview')unlockMouse();keys.clear();game.velocity={x:0,z:0};persist();
}
function unlockMouse(){unlockUntil=performance.now()+500;if(document.pointerLockElement)document.exitPointerLock();}
function persist(){if(game.status!=='ready'&&sceneReady){saveSession(storage,game,view);saved=readSession(storage);updateStartLabel();}}
function updateStartLabel(){
  const s=saved?.game;$('#continue-detail').textContent=s?s.status==='won'?`继续 · 第 ${Math.min(3,s.level+2)} 夜`:s.status==='restart'?`布置已更新 · 重开第 ${s.level+1} 夜`:s.status==='lost'?`重试 · 第 ${s.level+1} 夜`:`继续 · 第 ${s.level+1} 夜 · ${Math.floor(s.time/60)}:${String(Math.floor(s.time%60)).padStart(2,'0')}`:'第一次来？从第一夜开始';
}
function hideDialogs(){for(const id of ['#result','#pause-screen','#settings-screen','#challenge-screen'])$(id).hidden=true;}
function enterPlay(){hideDialogs();$('#start-screen').hidden=true;$('#hud').hidden=false;game.active=true;enableAudio();keys.clear();lastStatus='';lastMode='';lastToast='';updateUI();persist();}
function setupLevel(level){game.reset(level);buildHouse();view.mode='overview';view.hasMoved=false;view.yaw=0;view.pitch=-.10;transition.time=1;game.start();enterPlay();}
function startOrContinue(){
  saved=readSession(storage);const data=saved?.game;
  if(!data){setupLevel(0);return;}
  if(data.status==='restart'){setupLevel(data.level);game.say('家具布置与巡查路线更新了。从你上次所在的这一夜重新探索。','hint');return;}
  if(data.status==='won'){setupLevel(Math.min(2,data.level+1));return;}
  if(data.status==='lost'){setupLevel(data.level);return;}
  if(!game.restore(data)){setupLevel(0);return;}
  const v=saved.view||{};view.yaw=Number.isFinite(v.yaw)?v.yaw:0;view.pitch=clamp(Number.isFinite(v.pitch)?v.pitch:-.1,-.95,.8);view.hasMoved=Boolean(v.hasMoved);view.mode=v.mode==='firstPerson'?'firstPerson':'overview';transition.time=1;buildHouse();enterPlay();game.say('接着上一刻继续。进度已保存在这台浏览器里。','hint');
}
function returnMenu(){persist();game.active=false;game.velocity={x:0,z:0};keys.clear();unlockMouse();hideDialogs();$('#start-screen').hidden=false;$('#hud').hidden=true;$('#interaction').hidden=true;transition.time=0;transition.from=camera.position.clone();transition.rotation=camera.quaternion.clone();updateStartLabel();}
function pause(){if(game.status!=='playing'||!game.active)return;persist();game.active=false;game.velocity={x:0,z:0};keys.clear();unlockMouse();$('#pause-screen').hidden=false;}
function resume(){hideDialogs();game.active=true;keys.clear();enableAudio();}
function toggleMap(){if(game.status!=='playing')return;view.hasMoved=true;setView(view.mode==='firstPerson'?'overview':'firstPerson');}
function context(){if(game.mode)return'';const d=game.doorNear(),s=game.spotNear(),c=game.coverNear();if(d)return`E · 推开${d.name}`;if(s)return`E · 搜索${s.name}`;if(game.hidden)return'C · 站起身 · WASD 蹲行';if(c)return`C · 蹲到${c.name}后`;return game.hasDevice?'带设备回到暖光卧室':view.mode==='firstPerson'?'WASD 移动 · 鼠标看向四周':'WASD 移动 · 点击小地图切换视角';}
function drawMap(target,level,player=null){
  const ctx=target.getContext('2d'),w=target.width,h=target.height,pad=10,maxX=mapWidth(level)-1;
  const unit=player?Math.min(w,h)/(MINIMAP_RADIUS*2+1):Math.min((w-pad*2)/(maxX+1),(h-pad*2)/MAP_DEPTH);
  const ox=player?w/2-(player.x+.5)*unit:(w-(maxX+1)*unit)/2,oz=player?h/2-(player.z+.5)*unit:(h-MAP_DEPTH*unit)/2;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1423';ctx.fillRect(0,0,w,h);ctx.save();
  if(player){ctx.beginPath();ctx.arc(w/2,h/2,MINIMAP_RADIUS*unit,0,Math.PI*2);ctx.clip();}
  const near=(x,z)=>!player||Math.hypot(x-player.x,z-player.z)<=MINIMAP_RADIUS+.7;
  for(let z=0;z<MAP_DEPTH;z++)for(let x=0;x<=maxX;x++){if(!near(x,z))continue;ctx.fillStyle=wall(x,z,level)?'#4b5c75':z>=11&&x<7?'#9f865d':x>18&&z<7?'#477568':x>=15?'#334866':'#253c53';ctx.fillRect(ox+x*unit,oz+z*unit,unit+.2,unit+.2);}
  for(const c of furnitureFor(level)){if(!near(c.x,c.z))continue;ctx.save();ctx.translate(ox+(c.x+.5)*unit,oz+(c.z+.5)*unit);ctx.rotate(-(c.yaw||0));ctx.fillStyle=c.cover?'#749f96':'#687c89';ctx.fillRect(-c.w*unit/2,-c.d*unit/2,c.w*unit,c.d*unit);ctx.restore();}
  for(const[x,z]of PRESETS[level].creaks){if(!near(x,z))continue;ctx.fillStyle='#b18a5f';ctx.fillRect(ox+(x+.2)*unit,oz+(z+.2)*unit,.6*unit,.6*unit);}
  ctx.restore();
  if(player){ctx.save();ctx.translate(w/2,h/2);ctx.rotate(view.mode==='firstPerson'?view.yaw:Math.PI-player.heading);ctx.fillStyle='#fff1c9';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,3);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#8eabc6';ctx.font='10px sans-serif';ctx.fillText('N ↑',8,15);}
}
function buildChallengeCards(){
  const list=$('#challenge-list');list.replaceChildren();
  PRESETS.forEach((p,i)=>{const button=document.createElement('button');button.className='map-card';button.dataset.level=i;button.setAttribute('aria-pressed',String(i===selectedLevel));button.innerHTML=`<canvas width="280" height="208" aria-hidden="true"></canvas><span class="map-number">0${i+1}</span><strong>${p.name}</strong><span>${p.description}</span>`;button.onclick=()=>{selectedLevel=i;for(const b of list.children)b.setAttribute('aria-pressed',String(Number(b.dataset.level)===i));$('#launch-challenge').textContent=`开始 · ${p.name}`;};list.append(button);drawMap(button.querySelector('canvas'),i);});
}
function updateUI(){
  const p=game.parent,m=game.mode;$('#objective').textContent=game.hasDevice?'带设备回到卧室':'探索房间，找回设备';$('#device-icon').classList.toggle('found',game.hasDevice);$('#parent-cue').textContent=stateNames[p.state];$('#parent-cue').dataset.state=p.state;$('#context').textContent=context();$('#context').hidden=!context();$('#hide-badge').hidden=!game.hidden;
  $('#preset-title').textContent=`0${game.level+1} / ${PRESETS[game.level].name}`;$('#view-name').textContent=view.mode==='firstPerson'?'第一人称':'全景';$('#minimap-button').setAttribute('aria-label',view.mode==='firstPerson'?'切换第三人称全景':'切换第一人称近景');$('#crosshair').hidden=view.mode!=='firstPerson'||!game.active;
  $('#look-hint').hidden=view.mode!=='firstPerson'||!game.active||game.hidden||!!document.pointerLockElement;drawMap($('#minimap'),game.level,game.player);
  const noise=Math.max(0,game.noise*(1-game.noiseAge/3));$('#noise-fill').style.width=`${noise}%`;$('#noise-label').textContent=game.noiseAge<2?noise>25?'刚才有点响':'轻轻的':'听一听';$('#detection').hidden=p.recognition<=0;$('#detection-fill').style.width=`${Math.min(100,p.recognition/RECOGNITION_TIME*100)}%`;
  const text=game.toastLeft>0?game.toast:p.state==='sleep'?'远处传来平稳的鼾声。':p.state==='checking'?'留意脚步方向和移动的暖光。':'停一下，再判断。';if(lastToast!==text){$('#subtitle').textContent=text;lastToast=text;}
  $('#interaction').hidden=!m||!game.active;const type=m?.type||'';if(type!==lastMode){lastMode=type;$('#timing-panel').hidden=!['step','catch'].includes(type);$('#door-panel').hidden=type!=='door';$('#search-panel').hidden=type!=='search';}
  if(m){$('#interaction-title').textContent={step:'轻轻落脚',catch:'接住花瓶',door:m.door?.name,search:`搜索${m.spot?.name}`}[m.type];
    if(m.type==='step'||m.type==='catch'){$('#safe-band').style.left=`${(1-game.preset.width)*50}%`;$('#safe-band').style.width=`${game.preset.width*100}%`;$('#timing-help').textContent=m.type==='catch'?`花瓶在晃 · ${Math.max(0,m.remaining).toFixed(1)} 秒`:'亮区内按空格，稳稳落下';$('#timing-button').textContent=m.type==='catch'?'空格 · 接住':'空格 · 落脚';}
    if(m.type==='door'){$('#door-speed').value=game.speed;$('#door-progress').style.width=`${m.door.progress*100}%`;const b=m.door.band;$('#door-help').textContent=game.speed<b[0]?'太慢 · 门轴持续吱响':game.speed>b[1]?'太快 · 门可能碰响':'声音很轻 · 保持这个速度';$('#speed-value').textContent=`${Math.round(game.speed*100)}%`;}
    if(m.type==='search')$('#search-progress').style.width=`${Math.min(100,m.elapsed/6*100)}%`;
  }
  if(game.status!==lastStatus){lastStatus=game.status;if(['won','lost'].includes(game.status))showResult();}
}
function showResult(){
  persist();unlockMouse();const won=game.status==='won';$('#result').hidden=false;$('#result-kicker').textContent=won?'这一夜，平安收尾':'先别急着再来';$('#result-title').textContent=won?'夜晚，拿回来了。':'被看见了。';$('#result-copy').textContent=won?`设备已经回到卧室。这一夜用了 ${Math.floor(game.time/60)} 分 ${Math.floor(game.time%60)} 秒。`:'一次响声没有让你失败；父母看见你后，只留了极短的反应时间。下次先蹲到家具后，听清脚步方向再行动。';$('#replay-list').replaceChildren();for(const item of game.history.slice(-5)){const li=document.createElement('li');li.textContent=`${Math.floor(item.time)} 秒 · ${item.text}`;$('#replay-list').append(li);}$('#next-night').hidden=!won||game.level===2;$('#retry').textContent=won?'再玩这一夜':'调整一下，再试';$('#all-done').hidden=!won||game.level!==2;
}
function openSettings(fromPause=false){enableAudio();settingsFromPause=fromPause;if(game.active)pause();$('#settings-screen').hidden=false;syncSettings();unlockMouse();}
function syncSettings(){for(const k of ['master','music','effects','ambience','sensitivity']){const el=$(`[data-setting="${k}"]`);el.value=settings[k];el.nextElementSibling.textContent=k==='sensitivity'?`${settings[k].toFixed(1)}×`:`${Math.round(settings[k]*100)}%`;}$('#head-bob').checked=settings.headBob;}
for(const el of document.querySelectorAll('[data-setting]'))el.oninput=()=>{settings[el.dataset.setting]=Number(el.value);applyAudio();syncSettings();writeJSON(storage,SETTINGS_KEY,settings);};
$('#head-bob').onchange=e=>{settings.headBob=e.target.checked;writeJSON(storage,SETTINGS_KEY,settings);};
$('#settings-close').onclick=()=>{$('#settings-screen').hidden=true;if(settingsFromPause)$('#pause-screen').hidden=false;};
$('#settings-open').onclick=()=>openSettings(false);$('#pause-settings').onclick=()=>openSettings(true);$('#game-settings').onclick=()=>openSettings(true);
$('#challenges-open').onclick=()=>{selectedLevel=saved?.game?.level||0;buildChallengeCards();$('#launch-challenge').textContent=`开始 · ${PRESETS[selectedLevel].name}`;$('#challenge-screen').hidden=false;};$('#challenges-close').onclick=()=>$('#challenge-screen').hidden=true;
$('#launch-challenge').onclick=()=>setupLevel(selectedLevel);$('#begin').onclick=startOrContinue;$('#retry').onclick=()=>setupLevel(game.level);$('#next-night').onclick=()=>setupLevel(game.level+1);$('#pause-button').onclick=pause;$('#resume').onclick=resume;
for(const b of document.querySelectorAll('[data-menu]'))b.onclick=returnMenu;
$('#minimap-button').onclick=toggleMap;
function escape(){if(!$('#settings-screen').hidden){$('#settings-close').click();return;}if(!$('#challenge-screen').hidden){$('#challenge-screen').hidden=true;return;}if(!game.active){if(!$('#pause-screen').hidden)resume();return;}if(game.mode){game.cancel();persist();}else pause();}
const movementKeys=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(e.target.matches('input,select')&&k!=='escape')return;
  if(k==='escape'){e.preventDefault();escape();return;}if(!game.active||game.status!=='playing')return;
  if([...movementKeys,' ','tab'].includes(k))e.preventDefault();
  if(k==='tab'){unlockMouse();return;}if(k==='m'&&!e.repeat){toggleMap();return;}
  keys.add(k);if(movementKeys.includes(k)&&!view.hasMoved){view.hasMoved=true;setView('firstPerson');keys.add(k);}
  if(e.repeat)return;if(k==='e'){game.action();persist();}if(k===' '){game.pressSpace();persist();}if(k==='c'){game.hide();persist();}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('click',()=>{if(game.active&&view.mode==='firstPerson'){enableAudio();const request=canvas.requestPointerLock?.();request?.catch?.(()=>{});}});
document.addEventListener('mousemove',e=>{if(!game.active||view.mode!=='firstPerson')return;if(document.pointerLockElement===canvas||e.buttons===1&&e.target===canvas){view.yaw+=e.movementX*.0023*settings.sensitivity;view.pitch=clamp(view.pitch-e.movementY*.002*settings.sensitivity,-.95,.80);}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&performance.now()>unlockUntil&&game.active)pause();});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',persist);window.addEventListener('beforeunload',persist);
window.addEventListener('wheel',e=>{if(game.active&&game.mode?.type==='door'){e.preventDefault();game.speed=clamp(game.speed-e.deltaY*.0006,.05,1);}},{passive:false});
$('#door-speed').oninput=e=>game.speed=Number(e.target.value);$('#timing-button').onclick=()=>game.pressSpace();$('#cancel-action').onclick=()=>game.cancel();
$('#push-door').onpointerdown=e=>{e.preventDefault();keys.add('e');e.target.setPointerCapture(e.pointerId);};$('#push-door').onpointerup=()=>keys.delete('e');$('#push-door').onpointercancel=()=>keys.delete('e');
$('#context').onclick=()=>{if(game.doorNear()||game.spotNear())game.action();else game.hide();};
for(const el of document.querySelectorAll('[data-move]')){el.onpointerdown=e=>{e.preventDefault();if(!view.hasMoved){view.hasMoved=true;setView('firstPerson');}keys.add(el.dataset.move);el.setPointerCapture(e.pointerId);};el.onpointerup=()=>keys.delete(el.dataset.move);el.onpointercancel=()=>keys.delete(el.dataset.move);}
let last=performance.now(),fps=60,frames=0,acc=0,wallBlend=0,walkPhase=0,eyeHeight=1.37;
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.06,(now-last)/1000);last=now;if(!sceneReady)return;frames++;acc+=dt;if(acc>=1){fps=frames/acc;frames=0;acc=0;}
  const old={x:game.player.x,z:game.player.z};
  if(game.active&&game.status==='playing'){
    if(game.mode?.type==='door'){if(keys.has('arrowleft')||keys.has('a'))game.speed=clamp(game.speed-dt*.4,.05,1);if(keys.has('arrowright')||keys.has('d'))game.speed=clamp(game.speed+dt*.4,.05,1);}
    else{
      const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),yaw=view.mode==='firstPerson'?view.yaw:0;
      game.move(side*Math.cos(yaw)+forward*Math.sin(yaw),side*Math.sin(yaw)-forward*Math.cos(yaw),dt);
    }game.tick(dt,{e:keys.has('e')});
    if(now-lastSave>900){persist();lastSave=now;}
  }
  soundscape?.state(game.active&&game.status==='playing',game.parent.state);
  for(const e of game.events.splice(0))if(e.type==='sound')sound(e.kind,e.strength,e.x,e.z);
  const traveled=distance(old,game.player),moving=traveled>.0001;walkPhase+=traveled*8;
  playerMesh.position.set(game.player.x,0,game.player.z);const angle=game.player.heading-playerMesh.rotation.y;playerMesh.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,dt*16);
  const body=playerMesh.userData.body;body.position.y=moving?Math.abs(Math.sin(walkPhase))*.025:0;body.scale.y=THREE.MathUtils.damp(body.scale.y,game.hidden?.65:1,16,dt);body.rotation.x=game.hidden?-.12:0;
  for(const[name,{bone,rest}]of Object.entries(playerMesh.userData.bones)){
    bone.quaternion.copy(rest);
    if(name==='ArmL'||name==='ArmR'){const sign=name==='ArmL'?1:-1;const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sign*.72);bone.quaternion.premultiply(q);bone.rotateX(game.mode?.type==='catch'?-1.05:game.mode?.type==='door'?-.5:moving?Math.sin(walkPhase+(sign>0?0:Math.PI))*.32:0);}
    if(name==='LegL'||name==='LegR')bone.rotateX(moving?Math.sin(walkPhase+(name==='LegL'?0:Math.PI))*.4:0);
  }
  if(game.status==='won')body.position.y=Math.abs(Math.sin(now*.006))*.16;phoneMesh.visible=game.hasDevice;
  const fp=view.mode==='firstPerson'&&$('#start-screen').hidden&&!['won','lost'].includes(game.status);playerMesh.visible=!fp;ring.visible=!fp;ring.position.set(game.player.x,.045,game.player.z);
  const p=game.parent,parentMoving=['checking','returning'].includes(p.state)&&p.phase==='walk',parentSleeping=['sleep','alert'].includes(p.state);
  const wake=p.state==='warning'?clamp((5-p.timer)/2,0,1):parentSleeping?0:1;
  parentMesh.position.set(THREE.MathUtils.lerp(PARENT_BED.x,p.x,wake),0,THREE.MathUtils.lerp(PARENT_BED.z,p.z,wake));parentMesh.rotation.y=parentSleeping?0:p.heading;
  // 第一人称交给真实深度和墙体遮挡。脚下射线不能代表头部是否可见。
  parentMesh.visible=fp||!occluded(game.player,p,game.level,game.doors,game.hidden);
  const pb=parentMesh.userData.body;pb.position.set(0,.84*(1-wake),.78*(1-wake));pb.rotation.x=-Math.PI/2*(1-wake);
  for(const[name,{bone,rest}]of Object.entries(parentMesh.userData.bones)){
    bone.quaternion.copy(rest);
    if(name==='ArmL'||name==='ArmR'){const sign=name==='ArmL'?1:-1;bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sign*.72));bone.rotateX(parentMoving?Math.sin(now*.006+(sign>0?0:Math.PI))*.25:0);}
    if(name==='LegL'||name==='LegR')bone.rotateX(parentMoving?Math.sin(now*.006+(name==='LegL'?0:Math.PI))*.35:p.state==='warning'?-.65*Math.sin(wake*Math.PI):0);
    if(name==='Spine'&&parentSleeping)bone.rotateX(Math.sin(now*.0015)*.018);
  }
  parentLight.visible=['checking','returning'].includes(p.state);parentLight.position.set(p.x,1.25,p.z);parentTarget.position.set(p.x+Math.sin(p.heading)*4,.05,p.z+Math.cos(p.heading)*4);
  for(const{d,pivot}of doorMeshes)pivot.rotation.y=d.progress*Math.PI*.49;
  for(const{s,mesh,marker}of spotMeshes){marker.visible=!s.searched&&distance(s,game.player)<2&&!occluded(game.player,s,game.level,game.doors,true,s.id);}
  stepTarget.visible=game.mode?.type==='step';if(stepTarget.visible)stepTarget.position.set(game.mode.target.x,.045,game.mode.target.z);
  vaseMesh.rotation.z=game.vase==='wobbling'?Math.sin(now*.023)*.32:game.vase==='fallen'?Math.PI/2:0;vaseMesh.position.y=game.vase==='fallen'?.18:.88;
  wallBlend=THREE.MathUtils.damp(wallBlend,fp?1:0,9,dt);for(const{mesh,cap,height}of wallMeshes){const h=THREE.MathUtils.lerp(height,2.6,wallBlend);mesh.scale.y=h/2.6;mesh.position.y=h/2;cap.position.y=h-.015;}ceiling.visible=fp&&wallBlend>.99;for(const m of openingMeshes)m.visible=fp;for(const l of worldLabels)if(!spotMeshes.some(s=>s.marker===l))l.visible=!fp;
  const targetPos=new THREE.Vector3(),targetRotation=new THREE.Quaternion();
  eyeHeight=THREE.MathUtils.damp(eyeHeight,game.hidden?.85:1.37,16,dt);
  if(fp){const bob=settings.headBob&&moving?Math.sin(walkPhase)*.013:0;targetPos.set(game.player.x,eyeHeight+bob,game.player.z);targetRotation.setFromEuler(new THREE.Euler(view.pitch,-view.yaw,0,'YXZ'));}
  else{const center=(mapWidth(game.level)-1)/2;targetPos.set(center+15,26,34);const m=new THREE.Matrix4().lookAt(targetPos,new THREE.Vector3(center,.3,9),new THREE.Vector3(0,1,0));targetRotation.setFromRotationMatrix(m);}
  transition.time=Math.min(1,transition.time+dt/.48);const blend=transition.time*transition.time*(3-2*transition.time);
  if(transition.time<1){camera.position.lerpVectors(transition.from,targetPos,blend);camera.quaternion.slerpQuaternions(transition.rotation,targetRotation,blend);}else{camera.position.copy(targetPos);camera.quaternion.copy(targetRotation);}
  const fov=fp?78:43;if(camera.fov!==fov){camera.fov=THREE.MathUtils.damp(camera.fov,fov,12,dt);camera.updateProjectionMatrix();}
  if(game.mode?.type==='step'||game.mode?.type==='catch')$('#pointer').style.left=`${game.pointer*100}%`;
  renderer.render(scene,camera);if(now-lastUi>80){updateUI();lastUi=now;}
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
async function boot(){
  try{const gltf=await new GLTFLoader().loadAsync('assets/models/peak-character.glb');assetTemplate=gltf.scene;buildHouse();sceneReady=true;resize();updateStartLabel();syncSettings();$('#loading').hidden=true;$('#begin').disabled=false;}
  catch(e){$('#loading').replaceChildren();const text=document.createElement('p');text.textContent='角色模型未能载入。请检查网络后重试。';const b=document.createElement('button');b.className='primary';b.textContent='重新载入';b.onclick=()=>location.reload();$('#loading').append(text,b);console.error(e);}
}
requestAnimationFrame(animate);boot();
window.gameSnapshot=()=>({ready:sceneReady,status:game.status,active:game.active,level:game.level,player:{...game.player},parent:{...game.parent,route:undefined},mode:game.mode?.type,hasDevice:game.hasDevice,hidden:game.hidden,time:game.time,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,doors:game.doors.map(d=>({x:d.x,z:d.z,open:d.open,progress:d.progress})),vase:game.vase,view:{...view},camera:camera.position.toArray(),velocity:{...game.velocity},modelLoaded:!!assetTemplate,settings:{...settings},map:{width:mapWidth(game.level),depth:MAP_DEPTH,radius:MINIMAP_RADIUS},recognitionTime:RECOGNITION_TIME,parentRender:{visible:parentMesh?.visible??false,model:parentMesh?.userData.role==='parent'?'peak':'loading',pose:game.parent.state,position:parentMesh?.position.toArray()??[]},audio:soundscape?{state:audioContext.state,...soundscape.stats}:null});
