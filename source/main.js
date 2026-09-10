import {STATIONS} from './incident-setting.js';
import {applyIncidentResult} from './incident-props.js';
import {rescueHelp} from './rescue.js';
import {rescueControls} from './rescue-input.js';
import {Haptics} from './haptics.js';
import {createTickleHands,animateTickleHands} from './tickle-detail.js';
import {TICKLE_TARGET,tickleCaption} from './tickle.js';
import {floorAt,FLOOR_NAMES,RUGS} from './surfaces.js';
import {acousticProfile,doorsForSound,latestSoundCue,SOUND_LABELS} from './spatial-audio.js';
import {hingeCaption} from './door.js';
import {addDoorDetail,animateDoorDetail} from './door-detail.js';
import {cameraBlocked} from './follow-camera.js';
import {locked,lockCaption,releaseLock} from './lockpick.js';
import {LockCamera} from './lock-camera.js';
import {SearchCamera} from './search-camera.js';
import {createCatModel,updateCatModel,createCatToy,configureCatAsset} from './cat-model.js';
import {LURES,maskAt,phonePending} from './night-tools.js';
import {buildNightProps,updateNightProps} from './night-props.js';
import {skinById,readSkin,saveSkin} from './skins.js';
import {createSkinModel,disposeSkinModel} from './skin-model.js';
import {Wardrobe} from './wardrobe.js';
import {GamepadInput,MenuRepeat,BUTTON,emptyFrame} from './gamepad.js';
import {INCIDENTS,CATCH_INTRO} from './incidents.js';
import {IncidentCamera} from './cinematic.js';
import {furnitureFor,OPENINGS,PARENT_BED} from './layout.js';
import {createFurniture,animateFurniture} from './furniture.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readSettings,readSession,saveSession,writeJSON,SETTINGS_KEY} from './persistence.js';
import {Soundscape} from './audio.js';
import {Game,PRESETS,HOME,MAP_DEPTH,mapWidth,MINIMAP_RADIUS,RECOGNITION_TIME,wall,occluded,distance,clamp} from './engine.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const game=new Game(0),keys=new Set(),incidentCamera=new IncidentCamera(),searchCamera=new SearchCamera();
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('unavailable')}};}
const settings=readSettings(storage);
let equippedSkin=readSkin(storage),parentSkin=readSkin(storage,'parent'),wardrobe;const skinTemplates=new Map(),skinRequests=new Map();
async function loadSkinTemplate(id){const url=skinById(id).model;if(skinTemplates.has(url))return skinTemplates.get(url);if(!skinRequests.has(url))skinRequests.set(url,new GLTFLoader().loadAsync(url).then(gltf=>{skinTemplates.set(url,gltf.scene);skinRequests.delete(url);return gltf.scene;}).catch(error=>{skinRequests.delete(url);throw error;}));return skinRequests.get(url);}
const view={closeMode:'firstPerson',mode:'overview',hasMoved:false,yaw:0,pitch:-.10};
let nightProps=[],toolLabels=[],chargerLamp,catMesh,catToyMesh;
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
  const skinId=parent?parentSkin:equippedSkin,template=skinTemplates.get(skinById(skinId).model)||assetTemplate;
  const asset=createSkinModel(template,skinId);body.add(asset);const bones={};
  asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if(o.isMesh&&!parent){const own=m=>{const c=m.clone();c.userData.skinOwned=true;return c;};o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}if(o.isBone){bones[o.name]={bone:o,rest:o.quaternion.clone()};}});
  if(parent){
    g.scale.setScalar(1.12);
    asset.traverse(o=>{if(skinId==='scarf'&&o.isMesh&&/CLOTHES|Scarf/i.test(o.name)){const tint=m=>{const copy=m.clone();copy.color.multiply(new THREE.Color('#aca6d8'));copy.userData.parentOwned=true;return copy;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);}});
  }
  g.userData={body,asset,bones,skinId,role:parent?'parent':'player'};house.add(g);return g;
}
function buildHouse(){
  scene.remove(house);house.traverse(o=>{if(!o.isSkinnedMesh)o.geometry?.dispose();if(o.isSprite)o.material?.map?.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.parentOwned||m?.userData.skinOwned||m?.userData.nightOwned)m.dispose();});house=new THREE.Group();scene.add(house);doorMeshes=[];spotMeshes=[];wallMeshes=[];openingMeshes=[];worldLabels=[];
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
      const bedroom=z>=11&&x<7,parents=x>5&&x<9&&z>4&&z<8;
      const c=x>18&&z<7?'#8daaa3':x>=15&&z<7?'#657c98':x>=15&&z<14?'#938087':z>=14?'#778d9a':bedroom?'#788399':parents?'#615967':z<=3?'#79867f':(x+z)%2?'#7c6d68':'#8b7970';
      floorBox(.975,.075,.975,c,x,-.025,z);
      if(floorAt(x,z)==='tile'){floorBox(.96,.006,.014,'#536c70',x,.018,z+.47);}else for(const off of[-.29,.04,.36])floorBox(.014,.006,.91,'#534f55',x+off,.018,z);

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
    doorMeshes.push({d,pivot,detail:addDoorDetail(pivot)});
  }
  const furniture=new Map();for(const f of furnitureFor(game.level)){const mesh=createFurniture(f);house.add(mesh);furniture.set(f.id,mesh);}
  for(const s of game.spots){const mesh=furniture.get(s.id),f=furnitureFor(game.level).find(f=>f.id===s.id);const marker=label('搜索',s.x,f.h+.38,s.z,'#f5d899',.48);marker.visible=false;spotMeshes.push({s,mesh,marker});}
  catMesh=createCatModel();house.add(catMesh);catToyMesh=createCatToy();catToyMesh.visible=false;house.add(catToyMesh);
  nightProps=buildNightProps(house,game.level);toolLabels=[];
  for(const item of LURES.filter(l=>l.minLevel<=game.level)){const marker=label(item.name,item.x,item.y+.45,item.z,'#efd5a2',.40);marker.visible=false;toolLabels.push({item,marker});}
  const target=game.spots.find(s=>s.device),support=furnitureFor(game.level).find(f=>f.id===target.id);
  const hint=Object.values(STATIONS).find(s=>s.id===target.id)?.charger||{x:0,z:0},hintYaw=support.yaw||0,hintX=target.x+hint.x*Math.cos(hintYaw)+hint.z*Math.sin(hintYaw),hintZ=target.z-hint.x*Math.sin(hintYaw)+hint.z*Math.cos(hintYaw);
  box(.13,.04,.10,'#353c48',hintX,support.h+.025,hintZ);box(.18,.009,.016,'#a9afac',hintX+.14,support.h+.010,hintZ);
  chargerLamp=ball(.022,'#9de4b8',hintX,support.h+.047,hintZ+.052);chargerLamp.material=new THREE.MeshStandardMaterial({color:0x9de4b8,emissive:0x74c9a1,emissiveIntensity:.7});chargerLamp.material.userData.nightOwned=true;
  // 薄地毯没有阻挡体积；居住用途通过成组家具、挂画和灯光表达。
  for(const r of RUGS)box(r.w,.018,r.d,r.color,r.x,.026,r.z);
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
  vaseMesh=furniture.get('vase-stand').userData.incident.object;
  for(const[text,x,z]of[['你的卧室',4,12],['父母房间',7,6],['客厅',3,4.1],['书房',16,3],['储物间',16,11.8],['洗衣间',12,16.2],...(game.level>0?[['餐厅',21,3],['后走廊',21,16]]:[])])label(text,x,2.72,z,'#c5d5e5',.58);
  playerMesh=createPlayer();playerMesh.position.set(game.player.x,0,game.player.z);phoneMesh=box(.15,.26,.035,'#293349',.30,.45,.20,playerMesh.userData.body);box(.11,.19,.015,'#9bcbc6',0,0,.026,phoneMesh);phoneMesh.visible=false;parentMesh=createPlayer(true);parentMesh.position.set(7,0,6);parentMesh.visible=false;tickleHands=createTickleHands();house.add(tickleHands);tickleHands.visible=false;
  parentLight=new THREE.SpotLight(0xffd496,16,7,Math.PI/6,.6,1.4);parentLight.castShadow=true;parentLight.shadow.mapSize.set(512,512);parentLight.shadow.normalBias=.03;parentLight.position.set(7,1.1,6);parentTarget=new THREE.Object3D();house.add(parentTarget);parentLight.target=parentTarget;house.add(parentLight);
  stepTarget=new THREE.Mesh(new THREE.RingGeometry(.30,.37,40),new THREE.MeshBasicMaterial({color:0xf4ce8a,transparent:true,opacity:.85,depthWrite:false}));stepTarget.rotation.x=-Math.PI/2;stepTarget.visible=false;house.add(stepTarget);
  ring=new THREE.Mesh(new THREE.RingGeometry(.32,.37,40),new THREE.MeshBasicMaterial({color:0xf7d28c,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;house.add(ring);
}

let audioContext,soundscape;
const heardCues=[];let listeningYaw=0;
function applyAudio(){soundscape?.apply();}
function enableAudio(){if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();soundscape=new Soundscape(audioContext,settings);}audioContext.resume().catch(()=>{});}
function sound(kind,strength,x,z,surface,impact){
  const source={kind,x,z},blocked=occluded(game.player,source,game.level,doorsForSound(source,game.doors),false);
  soundscape?.effect(kind,strength,x,z,game.player,listeningYaw,blocked,surface,impact);
  if(SOUND_LABELS[kind]&&distance(game.player,{x,z})>.6){heardCues.push({kind,x,z,at:performance.now()});if(heardCues.length>5)heardCues.shift();}
}
function updateHearing(){
  const now=performance.now();while(heardCues.length&&now-heardCues[0].at>2200)heardCues.shift();
  const cue=latestSoundCue(heardCues,now),el=$('#sound-direction');el.hidden=!cue||!game.active;
  if(cue){const blocked=occluded(game.player,cue,game.level,doorsForSound(cue,game.doors),false),a=acousticProfile(cue,game.player,listeningYaw,blocked);el.textContent=`${a.direction} · ${a.range}${blocked?' · 隔着墙或门':''} ｜ ${SOUND_LABELS[cue.kind]}`;}
}

const stateNames={sleep:'鼾声平稳',alert:'鼾声停了',warning:'床板响了',checking:'脚步靠近',returning:'脚步远去'};
let saved=readSession(storage),selectedLevel=0,settingsFromPause=false,lastStatus='',lastMode='',lastToast='',lastSave=0,lastUi=0,unlockUntil=0;
const lockCamera=new LockCamera();let lockFocused=false,lockPointer=false,lockButton=false,lockEaseButton=false,lockDrag=0,lockPointerY=0,lockSelect=null;
function clearLockInput(){releaseLock(game.mode?.mechanism);lockPointer=false;lockButton=false;lockEaseButton=false;lockDrag=0;lockSelect=null;}
let doorPointer=false,doorFocused=false,ticklePointer=false,tickleFocused=false;
let rescueFocused=false;let tickleHands;const haptics=new Haptics(),rescuePointers={left:false,right:false,x:0,up:0,down:0};
let transition={time:1,from:camera.position.clone(),rotation:camera.quaternion.clone()};
function setView(mode){
  if(view.mode===mode)return;transition={time:0,from:camera.position.clone(),rotation:camera.quaternion.clone()};view.mode=mode;if(mode!=='overview')view.closeMode=mode;
  if(mode==='overview')unlockMouse();keys.clear();game.velocity={x:0,z:0};persist();
}
function unlockMouse(){unlockUntil=performance.now()+500;if(document.pointerLockElement)document.exitPointerLock();}
function persist(){if(game.status!=='ready'&&sceneReady){saveSession(storage,game,view);saved=readSession(storage);updateStartLabel();}}
function updateStartLabel(){
  const s=saved?.game;$('#continue-detail').textContent=s?s.status==='won'?`继续 · 第 ${Math.min(3,s.level+2)} 夜`:s.status==='restart'?`布置已更新 · 重开第 ${s.level+1} 夜`:s.status==='lost'?`重试 · 第 ${s.level+1} 夜`:`继续 · 第 ${s.level+1} 夜 · ${Math.floor((s.realTime??s.time)/60)}:${String(Math.floor((s.realTime??s.time)%60)).padStart(2,'0')}`:'第一次来？从第一夜开始';
}
function hideDialogs(){for(const id of ['#result','#pause-screen','#settings-screen','#challenge-screen','#skin-screen'])$(id).hidden=true;}
function enterPlay(){heardCues.length=0;hideDialogs();$('#start-screen').hidden=true;$('#hud').hidden=false;game.active=true;enableAudio();keys.clear();lastStatus='';lastMode='';lastToast='';updateUI();persist();}
function setupLevel(level){game.reset(level);buildHouse();view.mode='overview';view.hasMoved=false;view.yaw=0;view.pitch=-.10;transition.time=1;game.start();enterPlay();}
function startOrContinue(){
  saved=readSession(storage);const data=saved?.game;
  if(!data){setupLevel(0);return;}
  if(data.status==='restart'){setupLevel(data.level);game.say('家具布置与巡查路线更新了。从你上次所在的这一夜重新探索。','hint');return;}
  if(data.status==='won'){setupLevel(Math.min(2,data.level+1));return;}
  if(data.status==='lost'){setupLevel(data.level);return;}
  if(!game.restore(data)){setupLevel(0);return;}
  const v=saved.view||{};view.yaw=Number.isFinite(v.yaw)?v.yaw:0;view.pitch=clamp(Number.isFinite(v.pitch)?v.pitch:-.1,-.95,.8);view.hasMoved=Boolean(v.hasMoved);view.closeMode=v.closeMode==='thirdPerson'?'thirdPerson':'firstPerson';view.mode=['firstPerson','thirdPerson'].includes(v.mode)?v.mode:'overview';transition.time=1;buildHouse();enterPlay();game.say('接着上一刻继续。进度已保存在这台浏览器里。','hint');
}
function returnMenu(){persist();game.active=false;haptics.stop();game.velocity={x:0,z:0};keys.clear();unlockMouse();hideDialogs();$('#start-screen').hidden=false;$('#hud').hidden=true;$('#interaction').hidden=true;transition.time=0;transition.from=camera.position.clone();transition.rotation=camera.quaternion.clone();updateStartLabel();}
function pause(){if(game.status!=='playing'||!game.active)return;haptics.stop();clearLockInput();if(game.mode?.rescue)Object.assign(game.mode.rescue,{left:0,right:0,release:0,grace:.65});Object.assign(rescuePointers,{left:false,right:false,x:0,up:0,down:0});doorPointer=false;ticklePointer=false;if(game.mode?.type==='tickle')Object.assign(game.mode,{moving:false,pressure:0,stroke:0});if(game.mode?.drive)Object.assign(game.mode.drive,{pressure:0,moving:false,roughness:0,rate:0});persist();game.active=false;game.velocity={x:0,z:0};keys.clear();unlockMouse();$('#pause-screen').hidden=false;}
function resume(){clearLockInput();padInput.inhibit();if(game.mode?.rescue){game.mode.rescue.grace=.65;game.mode.rescue.release=0;}hideDialogs();game.active=true;keys.clear();enableAudio();}
function toggleMap(){if(game.status!=='playing'||['catch','reaction','search','lockpick','door','tickle'].includes(game.mode?.type))return;view.hasMoved=true;setView(view.mode==='overview'?view.closeMode:'overview');}
function toggleCloseView(){if(!game.active||game.mode)return;view.hasMoved=true;setView(view.closeMode==='thirdPerson'?'firstPerson':'thirdPerson');}
$('#camera-toggle').onclick=toggleCloseView;
function context(){if(game.mode)return'';if(phonePending(game))return'E · 按住静音（先停下）';if(game.tickleNear())return'E · 给熟睡的家长挠痒痒';if(game.catInteraction())return'E · 安抚猫咪 · Q 丢玩具球';const tool=game.toolNear();if(tool)return `E · 定时启动${tool.name}（本夜一次）`;const d=game.doorNear(),s=game.spotNear(),c=game.coverNear();if(d)return`E · ${game.doorDirection(d)===-1?"轻轻关上":"推开"}${d.name}`;if(s)return`E · ${locked(game,s.id)?'查看柜锁':'翻找'}${s.name}`;if(game.hidden)return'C · 站起身 · WASD 蹲行';if(c)return`C · 蹲到${c.name}后`;return game.hasDevice?'带设备回到暖光卧室':view.mode!=='overview'?'WASD 移动 · 鼠标看向四周':'WASD 移动 · 点击小地图切换视角';}
function drawMap(target,level,player=null){
  const ctx=target.getContext('2d'),w=target.width,h=target.height,pad=10,maxX=mapWidth(level)-1;
  const unit=player?Math.min(w,h)/(MINIMAP_RADIUS*2+1):Math.min((w-pad*2)/(maxX+1),(h-pad*2)/MAP_DEPTH);
  const ox=player?w/2-(player.x+.5)*unit:(w-(maxX+1)*unit)/2,oz=player?h/2-(player.z+.5)*unit:(h-MAP_DEPTH*unit)/2;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1423';ctx.fillRect(0,0,w,h);ctx.save();
  if(player){ctx.beginPath();ctx.arc(w/2,h/2,MINIMAP_RADIUS*unit,0,Math.PI*2);ctx.clip();}
  const near=(x,z)=>!player||Math.hypot(x-player.x,z-player.z)<=MINIMAP_RADIUS+.7;
  for(let z=0;z<MAP_DEPTH;z++)for(let x=0;x<=maxX;x++){if(!near(x,z))continue;ctx.fillStyle=wall(x,z,level)?'#4b5c75':z>=11&&x<7?'#9f865d':x>18&&z<7?'#477568':x>=15?'#334866':'#253c53';ctx.fillRect(ox+x*unit,oz+z*unit,unit+.2,unit+.2);}
  for(const c of furnitureFor(level)){if(!near(c.x,c.z))continue;ctx.save();ctx.translate(ox+(c.x+.5)*unit,oz+(c.z+.5)*unit);ctx.rotate(-(c.yaw||0));ctx.fillStyle=c.cover?'#749f96':'#687c89';ctx.fillRect(-c.w*unit/2,-c.d*unit/2,c.w*unit,c.d*unit);ctx.restore();}

  ctx.restore();
  if(player){ctx.save();ctx.translate(w/2,h/2);ctx.rotate(view.mode!=='overview'?view.yaw:Math.PI-player.heading);ctx.fillStyle='#fff1c9';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,3);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#8eabc6';ctx.font='10px sans-serif';ctx.fillText('N ↑',8,15);}
}
function buildChallengeCards(){
  const list=$('#challenge-list');list.replaceChildren();
  PRESETS.forEach((p,i)=>{const button=document.createElement('button');button.className='map-card';button.dataset.level=i;button.setAttribute('aria-pressed',String(i===selectedLevel));button.innerHTML=`<canvas width="280" height="208" aria-hidden="true"></canvas><span class="map-number">0${i+1}</span><strong>${p.name}</strong><span>${p.description}</span>`;button.onclick=()=>{selectedLevel=i;for(const b of list.children)b.setAttribute('aria-pressed',String(Number(b.dataset.level)===i));$('#launch-challenge').textContent=`开始 · ${p.name}`;};list.append(button);drawMap(button.querySelector('canvas'),i);});
}
$('#phone-mute').onpointerdown=e=>{e.preventDefault();game.action();keys.add('e');e.target.setPointerCapture(e.pointerId);};$('#phone-mute').onpointerup=$('#phone-mute').onpointercancel=()=>keys.delete('e');
function tossToy(){const yaw=view.mode!=='overview'?view.yaw:0;game.tossCatToy(Math.sin(yaw),-Math.cos(yaw));persist();}
function updateCatUI(){const c=game.cat,near=game.catNear(5.5);$('#cat-panel').hidden=!game.active||!near||!!game.mode||phonePending(game);const names={idle:'猫在看着你',follow:'猫悄悄跟了过来',rub:'猫正贴着腿蹭蹭',calm:'呼噜噜……猫很满足',toy:'猫追着玩具球去了',play:'猫正和球较劲',approach:'猫盯上了花瓶',prepare:`猫准备起跳 · ${Math.max(0,c.timer).toFixed(1)} 秒`,jump:'猫扑向桌沿！'};$('#cat-state').textContent=names[c.state];$('#cat-pet').disabled=!game.catNear()||['calm','play','jump'].includes(c.state);$('#cat-pet').textContent=padText('E · 安抚');$('#cat-toy').disabled=c.toyCooldown>0||c.state==='jump';$('#cat-toy').textContent=c.toyCooldown>0?`玩具 · ${Math.ceil(c.toyCooldown)} 秒后可用`:inputDevice==='gamepad'?'R2 · 丢玩具球':'Q · 丢玩具球';}
$('#cat-pet').onclick=()=>{game.petCat();persist();};$('#cat-toy').onclick=tossToy;
function updateNightUI(){const mask=maskAt(game);$('#mask-cue').textContent=mask?`${mask.name}掩护中 · 可直接走过木板`:'留意鼾声／脱水声盖过脚步时再走';$('#mask-cue').classList.toggle('active',!!mask);
 const phone=game.night.phone;$('#phone-panel').hidden=!phonePending(game)||!game.active||['catch','reaction'].includes(game.mode?.type);$('#phone-state').textContent=phone.state==='warning'?`来电预兆 · ${Math.max(0,phone.timer).toFixed(1)} 秒后响铃`:'手机正在响铃';$('#phone-hold').style.width=`${Math.min(100,phone.hold/1.2*100)}%`;$('#phone-mute').textContent=padText('停下，按住 E · 1.2 秒静音');$('#phone-help').textContent=game.mode?padText('先按 Esc 停下当前动作，再静音。'):'可蹲着静音；移动会打断进度。';}
function updateUI(){updateHearing();updateNightUI();updateCatUI();document.body.classList.toggle('door-active',game.mode?.type==='door'&&game.active);document.body.classList.toggle('tickle-active',game.mode?.type==='tickle'&&game.active);
  const p=game.parent,m=game.mode;document.body.classList.toggle('lock-active',m?.type==='lockpick'&&game.active);const cinematic=['catch','reaction','search','lockpick'].includes(m?.type);document.body.classList.toggle('incident-active',cinematic&&game.active);document.body.classList.toggle('search-active',m?.type==='search'&&game.active);$('#incident-caption').hidden=!cinematic;$('#incident-caption').textContent=cinematic?(m.type==='lockpick'?'一点点，听见咔哒。':m.type==='search'?'轻轻翻，仔细找。':m.type==='reaction'?(m.resultText||(m.success?'接住了。':'糟了，落地了。')):'那一瞬间，时间慢了下来。'):'';$('#objective').textContent=game.hasDevice?'带设备回到卧室':'探索房间，找回设备';$('#device-icon').classList.toggle('found',game.hasDevice);$('#parent-cue').textContent=stateNames[p.state];$('#parent-cue').dataset.state=p.state;$('#context').textContent=context();$('#context').hidden=!context();$('#hide-badge').hidden=!game.hidden;
  $('#preset-title').textContent=`0${game.level+1} / ${PRESETS[game.level].name}`;$('#view-name').textContent=view.mode==='firstPerson'?'第一人称':view.mode==='thirdPerson'?'近景跟随':'全景';$('#minimap-button').setAttribute('aria-label',view.mode==='overview'?'返回近景视角':'查看第三人称全景');$('#crosshair').hidden=view.mode!=='firstPerson'||!game.active||['door','tickle','catch','reaction','lockpick'].includes(game.mode?.type);
  $('#look-hint').hidden=view.mode==='overview'||!game.active||game.hidden||['door','tickle','catch','reaction','lockpick'].includes(game.mode?.type)||!!document.pointerLockElement;drawMap($('#minimap'),game.level,game.player);
  const noise=Math.max(0,game.noise*(1-game.noiseAge/3));$('#noise-fill').style.width=`${noise}%`;$('#noise-label').textContent=game.noiseAge<2?noise>25?'刚才有点响':'轻轻的':'听一听';$('#detection').hidden=p.recognition<=0;$('#detection-fill').style.width=`${Math.min(100,p.recognition/RECOGNITION_TIME*100)}%`;
  const text=game.toastLeft>0?game.toast:p.state==='sleep'?'停一停，听听屋里的动静。':p.state==='checking'?'留意脚步方向和移动的暖光。':'停一下，再判断。';if(lastToast!==text){$('#subtitle').textContent=text;lastToast=text;}
  $('#interaction').hidden=!m||!game.active||['reaction'].includes(m.type);const type=m?.type||'';if(type!==lastMode){lastMode=type;$('#timing-panel').hidden=type!=='step'&&!(type==='catch'&&!m.rescue);$('#rescue-panel').hidden=type!=='catch'||!m.rescue;$('#door-panel').hidden=type!=='door';$('#search-panel').hidden=type!=='search';$('#tickle-panel').hidden=type!=='tickle';$('#lock-panel').hidden=type!=='lockpick';}
  if(m){$('#interaction-title').textContent={lockpick:'锁芯 · '+['黄铜弹子','腰形弹子','共用压片'][game.level],step:'轻轻落脚',tickle:'悄悄挠脚底',catch:`接住${INCIDENTS[m.incidentId||'vase']?.name}`,door:`${m.drive?.direction===-1?'轻轻关上':'推开'}${m.door?.name}`,search:`搜索${m.spot?.name}`}[m.type];
    if(m.type==='lockpick'){
      const l=m.mechanism;$('#lock-ease').hidden=game.level===0;$('#lock-help').textContent=lockCaption(l,inputDevice==='gamepad');$('#lock-status').textContent=`${l.pins.filter(p=>p.seated).length} / ${l.pins.length} 已就位 · 屋里的时间仍在走`;
      $('#lock-instruction').textContent=inputDevice==='gamepad'?'左摇杆左右换针 · 轻压 R2 顶起，接缝齐平时松开 · 卡肩时 L2 卸力':'A / D 换针 · 按住 E 顶起，接缝齐平时松开 · 也可按住画面向下拖 · 卡肩时 Q 卸力';
      for(const [i,b]of [...document.querySelectorAll('[data-lock-pin]')].entries()){b.hidden=i>=l.pins.length;b.setAttribute('aria-pressed',String(l.selected===i));b.textContent=l.pins[i]?.seated?`${i+1} ✓`:`${i+1}`;}
    }
    if(m.type==='catch'&&m.rescue){for(const el of document.querySelectorAll('[data-rescue=up],[data-rescue=down]'))el.hidden=m.rescue.stage!=='lower';$('#rescue-left-button').hidden=m.rescue.kind==='pencils';$('#rescue-help').textContent=rescueHelp(m.rescue,inputDevice==='gamepad');$('#rescue-phase').textContent={reach:'看清落点，把手移过去',steady:'扶住了，稳一稳',lower:'把它轻轻放回',damp:'裹住，让颤动停下',sweep:'先看哪一枝会滚到桌沿'}[m.rescue.stage];}
    if(m.type==='step'||m.type==='catch'&&!m.rescue){$('#safe-band').style.left=`${(1-game.preset.width)*50}%`;$('#safe-band').style.width=`${game.preset.width*100}%`;$('#timing-help').textContent=m.type==='catch'?m.elapsed<CATCH_INTRO?'看清物件，准备接住……':`亮区内按一次空格 · ${Math.max(0,m.remaining).toFixed(1)} 秒`:'亮区内按空格，稳稳落下';$('#timing-button').textContent=m.type==='catch'?'空格 · 接住':'空格 · 落脚';$('#timing-button').disabled=m.type==='catch'&&m.elapsed<CATCH_INTRO;$('#timing-center-label').textContent=m.type==='catch'?'伸手接住':'轻轻落下';}
    if(m.type==='tickle'){$('#tickle-help').textContent=tickleCaption(m,game.parent);}
    if(m.type==='door'){$('#door-help').textContent=hingeCaption(m.drive);$('#push-door').classList.toggle('pushing',!!m.drive?.moving);}
    if(m.type==='search')$('#search-progress').style.width=`${Math.min(100,m.elapsed/6*100)}%`;
  }
  updateControllerHints();
  if(game.status!==lastStatus){lastStatus=game.status;if(['won','lost'].includes(game.status))showResult();}
}
function renderPerformance(){
  const report=game.performance();$('#score-total').textContent=report.total;$('#score-grade').textContent=report.grade;$('#score-title').textContent=report.title;
  $('#score-note').textContent=report.partial?'本局从更新后的续玩开始统计，评价仅供参考。':'探索和等待不扣分。遇到意外的数量不会直接扣分，处理结果才会。';
  const list=$('#score-breakdown');list.replaceChildren();for(const row of report.rows){const item=document.createElement('div');item.className='score-row';const title=document.createElement('strong'),value=document.createElement('b'),detail=document.createElement('small');title.textContent=row.name;value.textContent=`${row.points} / ${row.max}`;detail.textContent=row.detail;item.append(title,value,detail);list.append(item);}
}
function showResult(){
  renderPerformance();persist();unlockMouse();const won=game.status==='won';$('#result').hidden=false;$('#result-kicker').textContent=won?'这一夜，平安收尾':'先别急着再来';$('#result-title').textContent=won?'夜晚，拿回来了。':'被看见了。';$('#result-copy').textContent=won?`设备已经回到卧室。这一夜用了 ${Math.floor(game.realTime/60)} 分 ${Math.floor(game.realTime%60)} 秒。`:'一次响声没有让你失败；父母看见你后，只留了极短的反应时间。下次先蹲到家具后，听清脚步方向再行动。';$('#replay-list').replaceChildren();for(const item of game.history.slice(-5)){const li=document.createElement('li');li.textContent=`${Math.floor(item.time)} 秒 · ${item.text}`;$('#replay-list').append(li);}$('#next-night').hidden=!won||game.level===2;$('#retry').textContent=won?'再玩这一夜':'调整一下，再试';$('#all-done').hidden=!won||game.level!==2;
}
function openSettings(fromPause=false){enableAudio();settingsFromPause=fromPause;if(game.active)pause();$('#settings-screen').hidden=false;syncSettings();unlockMouse();}
function syncSettings(){for(const k of ['master','music','effects','ambience','sensitivity','gamepadSensitivity','stickDeadzone','hapticIntensity','triggerStrength']){const el=$(`[data-setting="${k}"]`);el.value=settings[k];el.nextElementSibling.textContent=['sensitivity','gamepadSensitivity'].includes(k)?`${settings[k].toFixed(1)}×`:`${Math.round(settings[k]*100)}%`;}$('#head-bob').checked=settings.headBob;$('#vibration').checked=settings.vibration;$('#adaptive-triggers').checked=settings.adaptiveTriggers;}
for(const el of document.querySelectorAll('[data-setting]'))el.oninput=()=>{settings[el.dataset.setting]=Number(el.value);if(['hapticIntensity','triggerStrength'].includes(el.dataset.setting))haptics.stop();applyAudio();syncSettings();writeJSON(storage,SETTINGS_KEY,settings);};
$('#vibration').onchange=e=>{settings.vibration=e.target.checked;if(!settings.vibration)haptics.stop();writeJSON(storage,SETTINGS_KEY,settings);};
$('#adaptive-triggers').onchange=e=>{settings.adaptiveTriggers=e.target.checked;haptics.stop();writeJSON(storage,SETTINGS_KEY,settings);};
$('#dualsense-connect').onclick=async()=>{await haptics.requestDevice();updateFeedbackStatus();};
$('#dualsense-disconnect').onclick=async()=>{haptics.stop();await haptics.output.disconnect();updateFeedbackStatus();};
$('#test-rumble').onclick=()=>haptics.test('rumble');$('#test-triggers').onclick=()=>haptics.test('triggers');$('#stop-feedback').onclick=()=>haptics.stop();
function updateFeedbackStatus(){
  const s=haptics.snapshot(),messages={idle:'自适应扳机尚未连接。用 USB 接上 DualSense，再点击连接。',unsupported:'当前浏览器不支持自适应扳机连接，请使用桌面版 Chrome 或 Edge。普通手柄操作仍可使用。',cancelled:'没有选择手柄。普通震动仍按浏览器支持情况工作。','usb-required':'请选择 USB 连接的 DualSense；本版尚未接入蓝牙自适应扳机。',error:'设备连接或输出失败。请重新连接，并关闭其他占用手柄的软件。',disconnected:'DualSense 已断开。重新接上 USB 后点击连接。'};
  $('#dualsense-status').textContent=s.status==='connected'?(s.adaptive?'USB 自适应扳机已就绪；回到游戏后生效。':!haptics.hidActive?'设备已连接；在游戏中按一下这只 DualSense 的按键，完成输入识别。':'设备已连接；自适应扳机已关闭或强度为零。'):messages[s.status];
  $('#rumble-status').textContent=haptics.failed?'普通震动输出失败，可重新连接手柄后重试。':s.route==='dualsense-usb'?'震动通过 USB 输出。':haptics.supported?'浏览器已提供普通震动接口。':'尚未检测到震动接口；连接手柄并按一下按键。';
  $('#dualsense-connect').disabled=haptics.output.busy||s.status==='unsupported';$('#dualsense-connect').textContent=haptics.output.busy?'正在连接…':'连接 DualSense（USB）';$('#dualsense-disconnect').disabled=!haptics.output.connected;
  $('#test-rumble').disabled=!haptics.supported||!settings.vibration||settings.hapticIntensity===0;$('#test-triggers').disabled=!s.adaptive;
}
$('#head-bob').onchange=e=>{settings.headBob=e.target.checked;writeJSON(storage,SETTINGS_KEY,settings);};
$('#settings-close').onclick=()=>{haptics.stop();$('#settings-screen').hidden=true;if(settingsFromPause)$('#pause-screen').hidden=false;};
$('#settings-open').onclick=()=>openSettings(false);$('#pause-settings').onclick=()=>openSettings(true);$('#game-settings').onclick=()=>openSettings(true);
$('#challenges-open').onclick=()=>{selectedLevel=saved?.game?.level||0;buildChallengeCards();$('#launch-challenge').textContent=`开始 · ${PRESETS[selectedLevel].name}`;$('#challenge-screen').hidden=false;};$('#challenges-close').onclick=()=>$('#challenge-screen').hidden=true;
$('#launch-challenge').onclick=()=>setupLevel(selectedLevel);$('#begin').onclick=startOrContinue;$('#retry').onclick=()=>setupLevel(game.level);$('#next-night').onclick=()=>setupLevel(game.level+1);$('#pause-button').onclick=pause;$('#resume').onclick=resume;
for(const b of document.querySelectorAll('[data-menu]'))b.onclick=returnMenu;
$('#minimap-button').onclick=toggleMap;
function escape(){if(!$('#skin-screen').hidden){wardrobe.close();return;}if(!$('#settings-screen').hidden){$('#settings-close').click();return;}if(!$('#challenge-screen').hidden){$('#challenge-screen').hidden=true;return;}if(!game.active){if(!$('#pause-screen').hidden)resume();return;}if(game.mode){game.cancel();persist();}else pause();}
const movementKeys=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(e.repeat&&!keys.has(k))return;if(e.target.matches('input,select')&&k!=='escape')return;
  if(k==='escape'){e.preventDefault();escape();return;}if(!game.active||game.status!=='playing')return;
  if([...movementKeys,' ','tab'].includes(k))e.preventDefault();
  if(k==='v'&&!e.repeat){toggleCloseView();return;}if(k==='q'&&!e.repeat&&!game.mode?.rescue&&game.mode?.type!=='lockpick'){tossToy();return;}if(k==='tab'){unlockMouse();return;}if(k==='m'&&!e.repeat){toggleMap();return;}
  keys.add(k);if(movementKeys.includes(k)&&!view.hasMoved&&!game.mode){view.hasMoved=true;setView(view.closeMode);keys.add(k);}
  if(e.repeat)return;if(k==='r'){game.reverseDoor();persist();}if(k==='e'){game.action();persist();}if(k===' '){game.pressSpace();persist();}if(k==='c'){game.hide();persist();}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('click',()=>{if(game.active&&view.mode!=='overview'&&!game.mode){enableAudio();const request=canvas.requestPointerLock?.();request?.catch?.(()=>{});}});
document.addEventListener('mousemove',e=>{if(!game.active||view.mode==='overview'||['catch','reaction','search','door','tickle','lockpick'].includes(game.mode?.type))return;if(document.pointerLockElement===canvas||e.buttons===1&&e.target===canvas){view.yaw+=e.movementX*.0023*settings.sensitivity;view.pitch=clamp(view.pitch-e.movementY*.002*settings.sensitivity,-.95,.80);}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&performance.now()>unlockUntil&&game.active)pause();});
window.addEventListener('blur',()=>{haptics.stop();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){haptics.stop();pause();}});window.addEventListener('pagehide',()=>{haptics.stop();persist();});window.addEventListener('beforeunload',()=>{haptics.stop();persist();});
$('#reverse-door').onclick=()=>game.reverseDoor();
$('#timing-button').onclick=()=>game.pressSpace();$('#cancel-action').onclick=()=>game.cancel();
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!game.active||game.mode?.type!=='lockpick')return;e.preventDefault();lockPointer=true;lockPointerY=e.clientY;lockDrag=0;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!lockPointer)return;lockDrag+=Math.max(-.06,Math.min(.06,(e.clientY-lockPointerY)/320));lockPointerY=e.clientY;});
canvas.addEventListener('pointerup',()=>{lockPointer=false;lockDrag=0;});
canvas.addEventListener('pointercancel',clearLockInput);
canvas.addEventListener('lostpointercapture',()=>{if(lockPointer)clearLockInput();});
$('#lock-lift').onpointerdown=e=>{if(!game.active||game.mode?.type!=='lockpick')return;e.preventDefault();lockButton=true;e.currentTarget.setPointerCapture(e.pointerId);};
$('#lock-lift').onpointerup=()=>{lockButton=false;};$('#lock-lift').onpointercancel=clearLockInput;$('#lock-lift').onlostpointercapture=()=>{if(lockButton)clearLockInput();};
$('#lock-ease').onpointerdown=e=>{if(!game.active||game.mode?.type!=='lockpick')return;e.preventDefault();lockEaseButton=true;e.currentTarget.setPointerCapture(e.pointerId);};$('#lock-ease').onpointerup=$('#lock-ease').onpointercancel=$('#lock-ease').onlostpointercapture=()=>{lockEaseButton=false;};
for(const b of document.querySelectorAll('[data-lock-pin]'))b.onclick=()=>{lockSelect=Number(b.dataset.lockPin);};
for(const el of [canvas,$('#push-door')])el.addEventListener('pointerdown',e=>{if(e.button!==0||!game.active||game.mode?.type!=='door')return;e.preventDefault();doorPointer=true;el.setPointerCapture(e.pointerId);});
for(const button of document.querySelectorAll('[data-rescue]')){button.onpointerdown=e=>{e.preventDefault();const k=button.dataset.rescue;rescuePointers[k]=button.dataset.value?Number(button.dataset.value):true;button.setPointerCapture(e.pointerId);};const release=()=>rescuePointers[button.dataset.rescue]=0;button.onpointerup=button.onpointercancel=button.onlostpointercapture=release;}
$('#tickle-hold').onpointerdown=e=>{e.preventDefault();ticklePointer=true;e.currentTarget.setPointerCapture(e.pointerId);};
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,()=>{doorPointer=false;ticklePointer=false;});
$('#context').onclick=()=>{if(phonePending(game)||game.tickleNear()||game.catInteraction()||game.toolNear()||game.doorNear()||game.spotNear())game.action();else game.hide();};
for(const el of document.querySelectorAll('[data-move]')){el.onpointerdown=e=>{e.preventDefault();if(!view.hasMoved){view.hasMoved=true;setView(view.closeMode);}keys.add(el.dataset.move);el.setPointerCapture(e.pointerId);};el.onpointerup=()=>keys.delete(el.dataset.move);el.onpointercancel=()=>keys.delete(el.dataset.move);}
// Controller input is polled even while menus are open; it never synthesizes keyboard events.
const padInput=new GamepadInput(),menuRepeat=new MenuRepeat();
let padFrame=emptyFrame(),inputDevice='keyboard',controllerContext='',controllerFocus=null,controllerLost=false;
const keyboardLegend=$('.controls-legend').innerHTML;
function padText(text){return inputDevice==='gamepad'?text.replaceAll('WASD','左摇杆').replaceAll('空格','×').replace(/\bQ\b/g,'R2').replaceAll('Esc','○').replace(/\bE\b/g,'□').replace(/\bC\b/g,'○').replace(/\bM\b/g,'△').replaceAll('鼠标看向四周','右摇杆看向四周').replaceAll('鼠标转头','右摇杆转头').replaceAll('点击小地图','按 △'):text;}
function useInput(device){
  if(inputDevice===device)return;clearLockInput();keys.clear();haptics.stop();inputDevice=device;document.body.classList.toggle('using-gamepad',device==='gamepad');lastToast='';lastUi=0;
  if(device==='gamepad')unlockMouse();else document.querySelectorAll('.gamepad-focus').forEach(el=>el.classList.remove('gamepad-focus'));
  $('.controls-legend').innerHTML=device==='gamepad'?'<span><kbd>左摇杆</kbd> 移动</span><span><kbd>右摇杆</kbd> 转头</span><span><kbd>×</kbd> 落脚</span><span><kbd>□</kbd> 交互</span><span><kbd>○</kbd> 蹲行 / 取消</span><span><kbd>△</kbd> 全景</span><span><kbd>Options</kbd> 暂停</span>':keyboardLegend;
}
function updateControllerHints(){
  const pad=inputDevice==='gamepad';
  const set=(selector,text)=>{const el=$(selector);if(el.textContent!==text)el.textContent=text;};
  set('#controller-status',padInput.connected?(game.active&&game.status==='playing'?(game.mode?.type==='lockpick'?'手柄已连接 · R2 顶针 · L2 卸力':game.mode?.type==='door'?'手柄已连接 · R2 施力 · L1 换方向':game.mode?.rescue?'手柄已连接 · 摇杆 ＋ L2 / R2 救场':game.mode?.type==='tickle'?'手柄已连接 · R2 ＋ 右摇杆轻挠':'手柄已连接 · Options 暂停 · △ 切视角'):'手柄已连接 · × 确认 · ○ 返回 · 方向键选择'):padInput.unsupported?'手柄未提供标准按键布局，请尝试更新 Chrome 或 Edge。':controllerLost?'手柄已断开 · 重新连接后按 Options 继续':'PS5 手柄：USB 连接后按 × 识别');
  $('#controller-status').dataset.connected=String(padInput.connected);
  $('#audio-unlock').hidden=!audioContext||audioContext.state==='running';
  set('.menu-footer',pad?'左摇杆移动 · 右摇杆转头 · 自动保存':'WASD 移动 · 鼠标转头 · 自动保存');
  set('#look-hint',pad?'右摇杆看向四周 · △ 切换全景':'点击画面，鼠标转头 · Tab 显示鼠标');
  set('#hide-badge',padText('◐ 正在蹲行 · C 站起 · 家具才会遮挡视线'));
  set('#camera-toggle',pad?'R3 · 近景视角':'V · 近景视角');
  set('#minimap-button small',padText('附近区域 · M 切视角'));
  set('#cancel-action',padText('Esc · 停下'));
  set('#door-instruction',pad?'轻压 R2 推门，压深更用力；松开停下。':'按住 E 或画面逐渐施力，松手停下。');
  set('#rescue-move-left',pad?'← · 向左':'A · 向左');set('#rescue-move-right',pad?'→ · 向右':'D · 向右');set('#rescue-move-up',pad?'↑ · 向上':'W · 向上');set('#rescue-move-down',pad?'↓ · 向下':'S · 向下');
  set('#rescue-left-button',pad?'L2 · 左手':'Q · 左手');
  set('#rescue-right-button',pad?'R2 · 右手':'E · 右手');
  set('#tickle-instruction',pad?'轻压 R2 接触脚底，右摇杆左右轻挠；松开即停。':'按住 E 或下方按钮轻挠，松开停下；留意缩脚和呼吸。');
  set('#tickle-hold',pad?'R2 ＋ 右摇杆 · 轻挠':'按住轻挠 · 松开停下');
  set('#reverse-door',pad?'L1 · 换开合方向':'R · 换开合方向');
  set('#push-door',pad?'轻压 R2 · 手扶着门':'按住轻推 · 松手停下');
  for(const selector of ['#context','#subtitle','#timing-help','#timing-button'])set(selector,padText($(selector).textContent));
}
function menuRoot(){for(const id of ['skin-screen','settings-screen','challenge-screen','result','pause-screen','start-screen'])if(!$('#'+id).hidden)return $('#'+id);return null;}
function menuItems(root){return [...root.querySelectorAll('button,input,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length);}
function focusControl(el){
  document.querySelectorAll('.gamepad-focus').forEach(item=>item.classList.remove('gamepad-focus'));controllerFocus=el;
  if(el){el.classList.add('gamepad-focus');el.focus({preventScroll:true});el.scrollIntoView({block:'nearest',inline:'nearest'});}
}
function menuInput(root,frame,now){
  const items=menuItems(root);if(!items.length)return;
  if(!items.includes(controllerFocus))focusControl(root.querySelector(root.id==='skin-screen'?'[data-skin="'+wardrobe.selected+'"]':root.id==='settings-screen'?'[data-setting="master"]':root.id==='challenge-screen'?'[aria-pressed="true"]':root.id==='pause-screen'?'#resume':root.id==='result'?'#next-night:not([hidden]),#retry':'#begin:not(:disabled)')||items[0]);
  if(inputDevice==='gamepad'&&!controllerFocus.classList.contains('gamepad-focus'))focusControl(controllerFocus);
  const h=frame.held,direction=h[12]?'up':h[13]?'down':h[14]?'left':h[15]?'right':Math.abs(frame.left.y)>.5?(frame.left.y<0?'up':'down'):Math.abs(frame.left.x)>.5?(frame.left.x<0?'left':'right'):'';
  const step=menuRepeat.update(direction,now);
  if(step){
    if(controllerFocus.matches('input[type="range"]')&&['left','right'].includes(step)){
      const el=controllerFocus,delta=Number(el.step)||.05;el.value=clamp(Number(el.value)+(step==='left'?-delta:delta),Number(el.min),Number(el.max));el.dispatchEvent(new Event('input',{bubbles:true}));
    }else{const offset=['up','left'].includes(step)?-1:1;focusControl(items[(items.indexOf(controllerFocus)+offset+items.length)%items.length]);}
  }
  if(frame.pressed[BUTTON.back]){if(root.id==='skin-screen')wardrobe.close();else if(root.id==='settings-screen')$('#settings-close').click();else if(root.id==='challenge-screen')$('#challenges-close').click();else if(root.id==='pause-screen')resume();else if(root.id==='result')returnMenu();}
  else if(frame.pressed[BUTTON.pause]&&root.id==='pause-screen')resume();
  else if(frame.pressed[BUTTON.confirm]&&!controllerFocus.matches('input[type="range"]'))controllerFocus.click();
}
function pollController(now,dt){
  let pads=[];try{pads=navigator.getGamepads?.()||[];}catch{}
  let frame=padInput.poll(pads,document.hasFocus()&&!document.hidden,settings.stickDeadzone);
  if(frame.connectedNow)controllerLost=false;
  if(frame.disconnected){controllerLost=true;pause();keys.clear();game.velocity={x:0,z:0};$('#controller-status').textContent='手柄已断开 · 游戏暂停，重新连接后按 Options 继续';}
  if(frame.activity)useInput('gamepad');
  const root=menuRoot(),context=root?.id||'play';
  if(context!==controllerContext){controllerContext=context;controllerFocus=null;menuRepeat.reset();padInput.inhibit();frame=emptyFrame();}
  if(root){if(root.id==='skin-screen')wardrobe?.rotate(frame.right.x*dt*2.4);if(inputDevice==='gamepad')menuInput(root,frame,now);return emptyFrame();}
  if(!game.active||game.status!=='playing')return emptyFrame();
  if(frame.pressed[BUTTON.pause]){pause();return emptyFrame();}
  const cinematic=['catch','reaction','search','door','tickle','lockpick'].includes(game.mode?.type);
  if(!cinematic&&(frame.left.x||frame.left.y)&&!view.hasMoved){view.hasMoved=true;setView(view.closeMode);}
  if(!cinematic&&view.mode!=='overview'){
    view.yaw+=frame.right.x*2.2*settings.gamepadSensitivity*dt;
    view.pitch=clamp(view.pitch-frame.right.y*1.7*settings.gamepadSensitivity*dt,-.95,.8);
  }
  if(frame.pressed[4]&&game.mode?.type==='door')game.reverseDoor();
  if(frame.pressed[11]&&!cinematic)toggleCloseView();
  if(frame.pressed[7]&&!cinematic){tossToy();}
  if(frame.pressed[BUTTON.back]){if(game.mode)game.cancel();else game.hide();persist();}
  else if(frame.pressed[BUTTON.confirm]){game.pressSpace();persist();}
  else if(frame.pressed[BUTTON.interact]){game.action();persist();}
  if(frame.pressed[BUTTON.map]||frame.pressed[17])toggleMap();
  return frame;
}
window.addEventListener('gamepaddisconnected',e=>{if(e.gamepad?.index!==padInput.index)return;padInput.inhibit();padFrame=emptyFrame();pause();keys.clear();});
window.addEventListener('blur',()=>{padInput.inhibit();padFrame=emptyFrame();keys.clear();game.velocity={x:0,z:0};});
document.addEventListener('keydown',()=>useInput('keyboard'));
document.addEventListener('pointerdown',()=>{useInput('keyboard');enableAudio();});
$('#audio-unlock').onclick=enableAudio;

let last=performance.now(),fps=60,frames=0,acc=0,wallBlend=0,walkPhase=0,eyeHeight=1.37;
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.06,(now-last)/1000);last=now;if(!sceneReady)return;frames++;acc+=dt;if(acc>=1){fps=frames/acc;frames=0;acc=0;}
  padFrame=pollController(now,dt);
  let activePad;try{activePad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.index===padInput.index);}catch{}haptics.connect(activePad,settings.vibration,settings);
  if(!$('#settings-screen').hidden)updateFeedbackStatus();
  const old={x:game.player.x,z:game.player.z};
  if(game.active&&game.status==='playing'){
    if(game.mode?.type!=='door'){
      const side=padFrame.left.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),forward=-padFrame.left.y+(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),yaw=view.mode!=='overview'?view.yaw:0;
      game.move(side*Math.cos(yaw)+forward*Math.sin(yaw),side*Math.sin(yaw)-forward*Math.cos(yaw),dt);
    }game.tick(dt,{lockPressure:inputDevice==='gamepad'?padFrame.triggers.right:(lockPointer||lockButton||keys.has('e'))?.52:0,lockDrag:lockPointer?lockDrag:undefined,lockNav:inputDevice==='gamepad'?padFrame.left.x:(keys.has('d')?1:0)-(keys.has('a')?1:0),lockSelect,lockEase:inputDevice==='gamepad'?padFrame.triggers.left:(keys.has('q')||lockEaseButton)?1:0,...rescueControls(inputDevice,padFrame,keys,rescuePointers),rescueAspect:camera.aspect,e:keys.has('e')||doorPointer||ticklePointer||padFrame.held[BUTTON.interact],ticklePressure:game.mode?.type==='tickle'&&inputDevice==='gamepad'?padFrame.triggers.right:undefined,tickleStroke:padFrame.right.x,doorPush:game.mode?.type==='door'&&inputDevice==='gamepad'?padFrame.triggers.right:undefined});
    if(now-lastSave>900){persist();lastSave=now;}
  }
  lockDrag=0;lockSelect=null;
  const focusLock=game.mode?.type==='lockpick';if(focusLock!==lockFocused){lockFocused=focusLock;clearLockInput();keys.clear();padInput.inhibit();padFrame=emptyFrame();haptics.stop();if(focusLock)unlockMouse();}
  soundscape?.state(game.active&&game.status==='playing',game.parent.state);
  const focusDoor=game.mode?.type==='door',focusTickle=game.mode?.type==='tickle';
  if(focusTickle!==tickleFocused){tickleFocused=focusTickle;ticklePointer=false;transition={time:0,from:camera.position.clone(),rotation:camera.quaternion.clone()};if(focusTickle)unlockMouse();else{keys.clear();padInput.inhibit();padFrame=emptyFrame();haptics.stop();}}
  const focusRescue=!!game.mode?.rescue;if(focusRescue!==rescueFocused){rescueFocused=focusRescue;Object.assign(rescuePointers,{left:false,right:false,x:0,up:0,down:0});if(focusRescue)unlockMouse();else{keys.clear();padInput.inhibit();padFrame=emptyFrame();haptics.stop();}}
  animateTickleHands(tickleHands,game.mode,game.time);
  if(focusDoor!==doorFocused){doorFocused=focusDoor;doorPointer=false;transition={time:0,from:camera.position.clone(),rotation:camera.quaternion.clone()};if(focusDoor)unlockMouse();}
  const frameEvents=game.events.splice(0);for(const e of frameEvents)if(game.active&&inputDevice==='gamepad')haptics.handle(e,now);
  haptics.tick(game,now,!!activePad&&game.active&&game.status==='playing'&&inputDevice==='gamepad');
  const traveled=distance(old,game.player),moving=traveled>.0001;walkPhase+=traveled*8;
  playerMesh.position.set(game.player.x,0,game.player.z);const angle=game.player.heading-playerMesh.rotation.y;playerMesh.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,dt*16);
  const body=playerMesh.userData.body;body.position.y=moving?Math.abs(Math.sin(walkPhase))*.025:0;body.scale.y=THREE.MathUtils.damp(body.scale.y,game.hidden?.65:1,16,dt);body.rotation.x=game.hidden?-.12:0;
  for(const[name,{bone,rest}]of Object.entries(playerMesh.userData.bones)){
    bone.quaternion.copy(rest);
    if(name==='ArmL'||name==='ArmR'){const sign=name==='ArmL'?1:-1;const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sign*.72);bone.quaternion.premultiply(q);bone.rotateX(game.mode?.type==='catch'?-1.05:game.mode?.type==='door'?-.5:moving?Math.sin(walkPhase+(sign>0?0:Math.PI))*.32:0);}
    if(name==='LegL'||name==='LegR')bone.rotateX(moving?Math.sin(walkPhase+(name==='LegL'?0:Math.PI))*.4:0);
  }
  if(game.status==='won')body.position.y=Math.abs(Math.sin(now*.006))*.16;phoneMesh.visible=game.hasDevice;
  const close=(focusDoor||focusTickle||view.mode!=='overview')&&$('#start-screen').hidden&&!['won','lost'].includes(game.status);const fp=view.mode==='firstPerson'&&$('#start-screen').hidden&&!['won','lost'].includes(game.status);playerMesh.visible=!fp&&!focusDoor&&!focusTickle;ring.visible=!fp&&!focusDoor&&!focusTickle;ring.position.set(game.player.x,.045,game.player.z);
  const p=game.parent,parentMoving=['checking','returning'].includes(p.state)&&p.phase==='walk',parentSleeping=['sleep','alert'].includes(p.state);
  const wake=p.state==='warning'?clamp((5-p.timer)/2,0,1):parentSleeping?0:1;
  parentMesh.position.set(THREE.MathUtils.lerp(PARENT_BED.x,p.x,wake),0,THREE.MathUtils.lerp(PARENT_BED.z,p.z,wake));parentMesh.rotation.y=parentSleeping?0:p.heading;
  // 第一人称交给真实深度和墙体遮挡。脚下射线不能代表头部是否可见。
  parentMesh.visible=close||!occluded(game.player,p,game.level,game.doors,game.hidden);
  const pb=parentMesh.userData.body;pb.position.set(0,.84*(1-wake),.78*(1-wake));pb.rotation.x=-Math.PI/2*(1-wake);pb.rotation.z=parentSleeping?Math.sin(now*.017)*Math.min(.07,(p.tickleHeat||0)*.055):0;
  for(const[name,{bone,rest}]of Object.entries(parentMesh.userData.bones)){
    bone.quaternion.copy(rest);
    if(name==='ArmL'||name==='ArmR'){const sign=name==='ArmL'?1:-1;bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sign*.72));bone.rotateX(parentMoving?Math.sin(now*.006+(sign>0?0:Math.PI))*.25:0);}
    if(name==='LegL'||name==='LegR')bone.rotateX(parentMoving?Math.sin(now*.006+(name==='LegL'?0:Math.PI))*.35:p.state==='warning'?-.65*Math.sin(wake*Math.PI):parentSleeping?Math.min(.7,p.tickleHeat||0)*(.6+Math.sin(now*.012)*.2):0);
    if(name==='Spine'&&parentSleeping)bone.rotateX(Math.sin(now*.0015)*.018);
  }
  parentLight.visible=['checking','returning'].includes(p.state);parentLight.position.set(p.x,1.25,p.z);parentTarget.position.set(p.x+Math.sin(p.heading)*4,.05,p.z+Math.cos(p.heading)*4);
  for(const{d,pivot,detail}of doorMeshes){pivot.rotation.y=d.progress*Math.PI*.49;animateDoorDetail(detail,focusDoor&&game.mode.door===d?game.mode.drive||{}:null,game.player.z>=d.z?1:-1,game.time,distance(game.player,d)<1.7?d.contact:null);}
  for(const{s,mesh,marker}of spotMeshes){applyIncidentResult(mesh,game.incidentResults[s.id]);animateFurniture(mesh,game.mode?.elapsed||0,game.mode?.type==='search'&&game.mode.spot.id===s.id);if(mesh.userData.padlock)mesh.userData.padlock.visible=locked(game,s.id);marker.visible=!s.searched&&distance(s,game.player)<2&&!occluded(game.player,s,game.level,game.doors,true,s.id);}
  updateCatModel(catMesh,game.cat,game.time);catToyMesh.visible=!!game.cat.toy;if(game.cat.toy){const t=game.cat.toy,u=Math.min(1,t.age/.5);catToyMesh.position.set(t.from.x+(t.x-t.from.x)*u,.07+Math.sin(u*Math.PI)*.35,t.from.z+(t.z-t.from.z)*u);catToyMesh.rotation.x=game.time*3;}
  updateNightProps(nightProps,game);const nearest=game.toolNear();for(const {item,marker}of toolLabels)marker.visible=game.active&&nearest?.id===item.id;chargerLamp.visible=!game.hasDevice&&!locked(game,game.spots.find(s=>s.device).id);
  stepTarget.visible=game.mode?.type==='step';if(stepTarget.visible)stepTarget.position.set(game.mode.target.x,.045,game.mode.target.z);
  if(game.incidentResults.vase)applyIncidentResult(vaseMesh.parent.parent,game.incidentResults.vase);else {vaseMesh.rotation.z=game.vase==='wobbling'?Math.sin(now*.023)*.32:game.vase==='fallen'?Math.PI/2:0;vaseMesh.position.set(game.vase==='fallen'?.34:0,STATIONS.vase.rest.y,game.vase==='fallen'?.58:0);if(game.vase==='fallen'){vaseMesh.updateWorldMatrix(true,true);vaseMesh.position.y+=.04-new THREE.Box3().setFromObject(vaseMesh).min.y;}}
  wallBlend=THREE.MathUtils.damp(wallBlend,close?1:0,9,dt);for(const{mesh,cap,height}of wallMeshes){const h=THREE.MathUtils.lerp(height,2.6,wallBlend);mesh.scale.y=h/2.6;mesh.position.y=h/2;cap.position.y=h-.015;}ceiling.visible=close&&wallBlend>.99;for(const m of openingMeshes)m.visible=close;for(const l of worldLabels)if(!spotMeshes.some(s=>s.marker===l)&&!toolLabels.some(s=>s.marker===l))l.visible=!close;
  const targetPos=new THREE.Vector3(),targetRotation=new THREE.Quaternion();
  eyeHeight=THREE.MathUtils.damp(eyeHeight,game.hidden?.85:1.37,16,dt);
  if(focusTickle){targetPos.set(game.player.x,camera.aspect<.8?1.85:1.48,game.player.z);targetRotation.setFromRotationMatrix(new THREE.Matrix4().lookAt(targetPos,new THREE.Vector3(PARENT_BED.x,.90,PARENT_BED.z),new THREE.Vector3(0,1,0)));}
  else if(focusDoor){const d=game.mode.door,side=game.player.z>=d.z?1:-1;targetPos.set(d.x,1.38,d.z+side*1.06);if(cameraBlocked(targetPos,game))targetPos.set(game.player.x,1.38,game.player.z);const aim=new THREE.Vector3(d.x-.47+Math.cos(d.progress*Math.PI*.49)*.5,1.12,d.z-Math.sin(d.progress*Math.PI*.49)*.5);targetRotation.setFromRotationMatrix(new THREE.Matrix4().lookAt(targetPos,aim,new THREE.Vector3(0,1,0)));}
  else if(fp){const bob=settings.headBob&&moving?Math.sin(walkPhase)*.013:0;targetPos.set(game.player.x,eyeHeight+bob,game.player.z);targetRotation.setFromEuler(new THREE.Euler(view.pitch,-view.yaw,0,'YXZ'));}
  else if(close){
    const anchor=new THREE.Vector3(game.player.x+Math.cos(view.yaw)*.38,game.hidden?.85:1.45,game.player.z+Math.sin(view.yaw)*.38);
    if(cameraBlocked(anchor,game))anchor.set(game.player.x,game.hidden?.85:1.45,game.player.z);
    const distance=2.5,dy=.32-view.pitch*.9;
    const desired=new THREE.Vector3(-Math.sin(view.yaw)*distance,dy,Math.cos(view.yaw)*distance);
    // Sample a camera-sized sphere along the boom, stopping before visible walls and furniture.
    let fraction=1;for(let t=.08;t<=1;t+=.025){const p=anchor.clone().addScaledVector(desired,t);if(cameraBlocked(p,game)){fraction=Math.max(0,t-.07);break;}}
    targetPos.copy(anchor).addScaledVector(desired,fraction);
    targetRotation.setFromRotationMatrix(new THREE.Matrix4().lookAt(targetPos,anchor.clone().add(new THREE.Vector3(Math.sin(view.yaw)*.8,view.pitch*.45,-Math.cos(view.yaw)*.8)),new THREE.Vector3(0,1,0)));
  }
  else{const center=(mapWidth(game.level)-1)/2;targetPos.set(center+15,26,34);const m=new THREE.Matrix4().lookAt(targetPos,new THREE.Vector3(center,.3,9),new THREE.Vector3(0,1,0));targetRotation.setFromRotationMatrix(m);}
  transition.time=Math.min(1,transition.time+dt/.48);const blend=transition.time*transition.time*(3-2*transition.time);
  if(transition.time<1){camera.position.lerpVectors(transition.from,targetPos,blend);camera.quaternion.slerpQuaternions(transition.rotation,targetRotation,blend);}else{camera.position.copy(targetPos);camera.quaternion.copy(targetRotation);}
  // 用本帧实际镜头朝向，切视角／转头插值时声道也跟着画面转；听者仍在玩家处。
  const audioForward=camera.getWorldDirection(new THREE.Vector3());listeningYaw=Math.atan2(audioForward.x,-audioForward.z);
  const soundBlocked=v=>occluded(game.player,v,game.level,doorsForSound(v,game.doors),false);
  soundscape?.listen(game.player,listeningYaw,soundBlocked);
  soundscape?.environment(game,listeningYaw,soundBlocked);
  soundscape?.doorMotion(game.mode,game.active&&game.status==='playing',game.player,focusDoor?(game.player.z>game.mode.door.z?0:Math.PI):view.yaw);
  for(const e of frameEvents)if(e.type==='sound')sound(e.kind,e.strength,e.x,e.z,e.surface,e.impact);
  const fade=close&&!fp&&camera.position.distanceTo(new THREE.Vector3(game.player.x,eyeHeight,game.player.z))<1.35?.35:1;playerMesh.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material])){m.transparent=fade<1;m.opacity=fade;m.depthWrite=fade===1;}});
  const fov=focusTickle?(camera.aspect<.8?100:78):focusDoor?69:fp?78:close?72:43;if(camera.fov!==fov){camera.fov=THREE.MathUtils.damp(camera.fov,fov,12,dt);camera.updateProjectionMatrix();}
  if(game.mode?.type==='step'||game.mode?.type==='catch')$('#pointer').style.left=`${game.pointer*100}%`;
  if(['catch','reaction'].includes(game.mode?.type)){$('#incident-caption').textContent=game.mode.type==='reaction'?(game.mode.resultText||(game.mode.success?'接住了。':'糟了，落地了。')):'那一瞬间，时间慢了下来。';$('#interaction').hidden=game.mode.type==='reaction'||!game.active;}
  if(['catch','reaction'].includes(game.mode?.type))incidentCamera.render(renderer,game.mode,camera.aspect);else if(game.mode?.type==='lockpick')lockCamera.render(renderer,game.mode,camera.aspect);else if(game.mode?.type==='search')searchCamera.render(renderer,game.mode,game.level,camera.aspect,game.incidentResults[game.mode.spot.id]);else renderer.render(scene,camera);wardrobe?.render(now);if(now-lastUi>80){updateUI();lastUi=now;}
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
async function boot(){
  try{const catGltf=await new GLTFLoader().loadAsync('assets/models/quaternius-cat.glb');configureCatAsset(catGltf);incidentCamera.scene.remove(incidentCamera.cat);incidentCamera.cat=createCatModel();incidentCamera.scene.add(incidentCamera.cat);assetTemplate=await loadSkinTemplate('scarf');try{await loadSkinTemplate(equippedSkin);}catch{equippedSkin='scarf';}try{await loadSkinTemplate(parentSkin);}catch{parentSkin='scarf';}
  wardrobe=new Wardrobe({loadTemplate:loadSkinTemplate,equipped:equippedSkin,parentEquipped:parentSkin,onEquip:async(id,role)=>{await loadSkinTemplate(id);
    if(role==='parent'){parentSkin=id;const old=parentMesh;parentMesh=createPlayer(true);parentMesh.position.copy(old.position);parentMesh.rotation.copy(old.rotation);house.remove(old);disposeSkinModel(old);const stored=saveSkin(storage,id,'parent');$('#skin-save-status').textContent=stored?'家长已换装，并保存在这台浏览器。':'家长已换装；浏览器未允许保存。';return;}
    equippedSkin=id;const old=playerMesh;playerMesh=createPlayer();playerMesh.position.copy(old.position);playerMesh.rotation.copy(old.rotation);house.remove(old);disposeSkinModel(old);phoneMesh.geometry.dispose();phoneMesh.children.forEach(o=>o.geometry?.dispose());phoneMesh=box(.15,.26,.035,'#293349',.30,.45,.20,playerMesh.userData.body);box(.11,.19,.015,'#9bcbc6',0,0,.026,phoneMesh);phoneMesh.visible=game.hasDevice;$('#skins-open small').textContent=skinById(id).name;const stored=saveSkin(storage,id);$('#skin-save-status').textContent=stored?'已穿上，并保存在这台浏览器。':'已穿上；浏览器未允许保存，关闭页面后可能恢复。';},onClose:()=>{}});
  $('#skins-open').onclick=()=>{enableAudio();$('#skin-save-status').textContent='外观不改变移动、声音、评分或被发现的规则。';wardrobe.open();};$('#skins-open').disabled=false;$('#skins-open small').textContent=skinById(equippedSkin).name;
  buildHouse();sceneReady=true;resize();updateStartLabel();syncSettings();$('#loading').hidden=true;$('#begin').disabled=false;}
  catch(e){$('#loading').replaceChildren();const text=document.createElement('p');text.textContent='角色模型未能载入。请检查网络后重试。';const b=document.createElement('button');b.className='primary';b.textContent='重新载入';b.onclick=()=>location.reload();$('#loading').append(text,b);console.error(e);}
}
requestAnimationFrame(animate);boot();
window.gameSnapshot=()=>({ready:sceneReady,status:game.status,active:game.active,level:game.level,player:{...game.player},parent:{...game.parent,route:undefined},mode:game.mode?.type,hasDevice:game.hasDevice,hidden:game.hidden,time:game.time,realTime:game.realTime,incident:game.mode?.incidentId?{id:game.mode.incidentId,type:game.mode.type,elapsed:game.mode.elapsed,remaining:game.mode.remaining,success:game.mode.success,rescue:game.mode.rescue?structuredClone(game.mode.rescue):null}:null,tickleInteraction:game.mode?.type==='tickle'?{...game.mode,heat:game.parent.tickleHeat}:null,doorInteraction:game.mode?.type==='door'?{...game.mode.drive,focus:doorFocused}:null,performance:game.performance(),metrics:{...game.metrics},fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,doors:game.doors.map(d=>({x:d.x,z:d.z,open:d.open,progress:d.progress})),vase:game.vase,view:{...view},camera:camera.position.toArray(),velocity:{...game.velocity},modelLoaded:!!assetTemplate,lock:game.mode?.mechanism?structuredClone(game.mode.mechanism):null,searchRender:game.mode?.type==='search',cat:{...structuredClone(game.cat),visible:catMesh?.visible,model:catMesh?.userData.source||'procedural'},night:{...structuredClone(game.night),mask:maskAt(game),nearTool:game.toolNear()?.id},skin:{equipped:equippedSkin,parentEquipped:parentSkin,role:wardrobe?.role,rendered:playerMesh?.userData.skinId,preview:wardrobe?.selected,previewReady:wardrobe?.ready,open:!$('#skin-screen').hidden},settings:{...settings},controller:{feedback:haptics.snapshot(),haptics:haptics.supported,hapticsFailed:haptics.failed,connected:padInput.connected,standard:padInput.connected,index:padInput.index,inputDevice,blocked:padInput.blocked,context:controllerContext},map:{width:mapWidth(game.level),depth:MAP_DEPTH,radius:MINIMAP_RADIUS,markedFloors:false},recognitionTime:RECOGNITION_TIME,parentRender:{skin:parentMesh?.userData.skinId,visible:parentMesh?.visible??false,model:parentMesh?.userData.role==='parent'?'peak':'loading',pose:game.parent.state,position:parentMesh?.position.toArray()??[]},audio:soundscape?{state:audioContext.state,...soundscape.stats}:null});
