import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';
import {readSettings,readSession,saveSession,writeJSON,SETTINGS_KEY} from './persistence.js';
import {Soundscape} from './audio.js';
import {Game,PRESETS,COVERS,HOME,MAP_DEPTH,mapWidth,MINIMAP_RADIUS,RECOGNITION_TIME,wall,occluded,distance,clamp} from './engine.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const game=new Game(0),keys=new Set();
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('unavailable')}};}
const settings=readSettings(storage);
const view={mode:'overview',hasMoved:false,yaw:0,pitch:-.10};
let assetTemplate,wallMeshes=[],worldLabels=[],ceiling,sceneReady=false;
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
function createPlayer(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const asset=cloneRig(assetTemplate);body.add(asset);const bones={};
  asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if(o.isBone){bones[o.name]={bone:o,rest:o.quaternion.clone()};}});
  g.userData={body,asset,bones};house.add(g);return g;
}
function buildHouse(){
  scene.remove(house);house.traverse(o=>{if(!o.isSkinnedMesh)o.geometry?.dispose();if(o.isSprite)o.material?.map?.dispose();});house=new THREE.Group();scene.add(house);doorMeshes=[];spotMeshes=[];wallMeshes=[];worldLabels=[];
  const maxX=mapWidth(game.level)-1,center=maxX/2,depth=MAP_DEPTH,cz=(depth-1)/2;
  box(maxX+1,.45,15,'#29374b',center,-.31,7);box(maxX+1.25,.16,15.25,'#40526a',center,-.6,7);
  box(maxX-9,.45,4,'#29374b',(maxX+10)/2,-.31,16.5);box(maxX-8.75,.16,4.25,'#40526a',(maxX+10)/2,-.6,16.5);
  ceiling=box(maxX+1,.08,depth,'#556279',center,2.58,cz);ceiling.visible=false;ceiling.castShadow=false;
  const floors=new Map();const floorBox=(w,h,d,c,x,y,z)=>{if(!floors.has(c))floors.set(c,[]);floors.get(c).push([w,h,d,x,y,z]);};
  for(let z=0;z<depth;z++)for(let x=0;x<=maxX;x++){
    if(z>14&&x<10)continue;
    if(wall(x,z,game.level)){
      const h=z===0||x===0||((x===5||z===4)&&z<9&&x<10)?2.25:.72;
      const mesh=box(.99,2.5,.99,'#465369',x,1.20,z),cap=box(1.01,.07,1.01,'#6b788e',x,2.46,z);wallMeshes.push({mesh,cap,height:h});
    }else{
      const bedroom=z>=11&&x<7,parents=x>5&&x<9&&z>4&&z<8;const creak=game.preset.creaks.some(([a,b])=>a===x&&b===z);
      const c=creak?'#b78662':x>18&&z<7?'#8daaa3':x>=15&&z<7?'#657c98':x>=15&&z<14?'#938087':z>=14?'#778d9a':bedroom?'#788399':parents?'#615967':z<=3?'#79867f':(x+z)%2?'#7c6d68':'#8b7970';
      floorBox(.975,.075,.975,c,x,-.025,z);
      for(const off of[-.29,.04,.36])floorBox(.014,.006,.91,creak?'#654532':'#534f55',x+off,.018,z);
      if(creak){const crack=box(.035,.012,.62,'#332e36',x,.025,z);crack.rotation.y=.28;box(.08,.015,.15,'#d4b980',x+.25,.03,z-.25);}
    }
  }
  for(const[color,items]of floors){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(color),items.length),m=new THREE.Matrix4();items.forEach(([w,h,d,x,y,z],i)=>{m.makeScale(w,h,d);m.setPosition(x,y,z);mesh.setMatrixAt(i,m);});mesh.receiveShadow=true;house.add(mesh);}
  // 墙体采用可读的剖面；父母和藏点仍受真正的遮挡判定约束。
  for(const d of game.doors){if(wall(d.x,d.z,game.level))continue;const pivot=new THREE.Group();pivot.position.set(d.x-.47,0,d.z);house.add(pivot);box(.94,1.65,.12,d.x===3?'#bf9475':'#897261',.47,.84,0,pivot);box(.72,1.1,.04,'#8f725e',.47,.92,.07,pivot);ball(.055,'#edca7b',.79,.85,.12,pivot);for(const xx of[-.53,.53])box(.08,1.83,.2,'#d0ac86',d.x+xx,.9,d.z);box(1.16,.10,.2,'#d0ac86',d.x,1.81,d.z);doorMeshes.push({d,pivot});}
  box(1.4,.36,2,'#66546b',1.7,.27,12);box(1.32,.26,1.92,'#b1bdd1',1.7,.57,12);box(1.3,.14,1.23,'#667d9d',1.7,.77,12.3);box(1.14,.18,.44,'#e0d7cc',1.7,.79,11.32);box(1.46,1,.12,'#8b716a',1.7,.6,10.95);lamp(4.8,12.9);box(1.4,.04,1.9,'#c2a383',3.7,.03,12);
  const bedsideGlow=new THREE.PointLight(0xffb95e,20,6,1.8);bedsideGlow.position.set(3.5,2,11.8);house.add(bedsideGlow);
  const seam=box(.82,.015,.04,'#ffd994',3,.06,9.92);seam.material=new THREE.MeshStandardMaterial({color:0xffca79,emissive:0xffb550,emissiveIntensity:2});
  const doorGlow=new THREE.PointLight(0xffb955,5,3,1.5);doorGlow.position.set(3,.18,9.75);house.add(doorGlow);
  box(1.65,.45,2.0,'#674e65',7,.29,5.8);box(1.6,.18,1.9,'#a69da6',7,.62,5.8);box(1.58,.2,1.2,'#867a99',7,.81,6.1);box(1.2,.15,.4,'#d4c6be',7,.81,5.1);label('父母房间',7,2.65,5.4,'#aab5ce',.66);
  label('你的卧室',3.7,.16,13.3,'#f6d6a4',.65).material.depthTest=false;
  for(const c of COVERS){if(wall(c.x,c.z,game.level))continue;
    if(c.name==='沙发'){box(.82,.38,.85,'#587f80',c.x,.34,c.z);box(.9,1.05,.22,'#678e8b',c.x,.65,c.z-.34);for(const s of[-1,1])box(.18,.66,.84,'#4b7175',c.x+s*.4,.39,c.z);box(.58,.14,.54,'#80a5a0',c.x,.61,c.z+.06);}
    else if(c.name==='高背扶手椅'){box(.9,1.12,.24,'#8b6870',c.x,.6,c.z-.3);box(.7,.48,.78,'#a57c7d',c.x,.3,c.z);for(const s of[-1,1])box(.15,.73,.8,'#7e5f6b',c.x+s*.4,.43,c.z);box(.5,.19,.42,'#d4a181',c.x,.61,c.z);}
    else{box(.88,1.75,.8,'#746e6c',c.x,.9,c.z);for(let y=.3;y<1.7;y+=.38){box(.8,.05,.86,'#b79c7c',c.x,y,c.z);for(let i=0;i<3;i++)box(.12,.25,.32,['#bd9168','#719995','#a7a0b4'][i],c.x-.25+i*.21,y+.15,c.z+.2);}}
  }
  for(const s of game.spots){const mesh=cabinet(s.x,s.z,s.name,1.0);const marker=label('E · 搜索',s.x,1.45,s.z,'#f5d899',.48);marker.visible=false;spotMeshes.push({s,mesh,marker});}
  for(const x of[3,11]){if(game.level===0&&x>9)continue;box(2.4,1.25,.10,'#91b4c7',x,1.3,.48);for(const dx of[-1.25,0,1.25])box(.09,1.4,.18,'#b0bac6',x+dx,1.3,.54);box(2.65,.1,.4,'#9198a9',x,.62,.52);box(2.65,.1,.2,'#afb7c2',x,1.99,.54);const light=new THREE.PointLight(0xb9deff,4,6);light.position.set(x,1.8,1);house.add(light);}
  plant(1,1);plant(8,1);if(game.level>0)plant(13,3);lamp(4,1);box(2.0,.035,1.4,'#64777b',5.5,.04,2);box(.8,.4,.62,'#a68978',5.5,.26,2);cyl(.18,.18,.05,'#e2cf9f',5.5,.49,2);
  const vaseStand=cabinet(9,2.8,'花瓶台',.6);vaseMesh=new THREE.Group();vaseMesh.position.set(9,.97,2.8);house.add(vaseMesh);cyl(.11,.2,.32,'#adbdc6',0,.16,0,vaseMesh);cyl(.09,.12,.16,'#bccdd1',0,.4,0,vaseMesh);ball(.14,'#769083',0,.69,0,vaseMesh,[.5,1.7,.5]);vaseMesh.visible=game.level===2;
  // 东侧房间以家具、地面颜色和门口标识提供方向线索。
  box(1.4,.1,.8,'#ae8a65',16,.85,5);for(const x of[15.4,16.6])box(.1,.83,.65,'#715968',x,.42,5);
  box(.45,.05,.38,'#d3c7a6',15.7,.93,4.9);box(.42,.26,.15,'#587878',16.35,1.01,5);lamp(17,1.3,false);
  label('书房',16,2.05,3.1,'#c0d8f7',.6);label('储物间',16,2.05,11.8,'#e5c1b2',.6);
  cabinet(16,12,'纸箱柜');box(.62,.55,.65,'#b89a7f',16,1.25,12);box(.46,.43,.5,'#d0b597',16,1.73,12);
  if(game.level>0){
    for(const x of[20,21,22]){box(.9,.85,.65,'#77938a',x,.43,1);box(.95,.07,.75,'#d1c5ab',x,.89,1);}box(.63,.035,.42,'#66787f',21,.94,1);
    box(1.7,.10,1.1,'#b7a17a',21.5,.84,5);for(const x of[20.8,22.2])box(.1,.82,.85,'#8b776e',x,.41,5);
    cyl(.17,.2,.32,'#d3b9a3',21.4,1.05,5);lamp(22,8,false);label('餐厅',21,2.05,3,'#c5e2cc',.6);
    for(const x of[12,13]){box(.82,1,.75,'#a2b0ba',x,.5,15);const drum=cyl(.27,.27,.04,'#536b7d',x,.52,15.39);drum.rotation.x=Math.PI/2;}
    label('洗衣间',12,2.05,16.2,'#c5dce8',.6);label('后走廊',20,2.05,16,'#c1ccdf',.6);
    cabinet(21,16,'整理台');box(.65,.45,.58,'#ac987b',21,1.2,16);
  }
  playerMesh=createPlayer();playerMesh.position.set(game.player.x,0,game.player.z);phoneMesh=box(.15,.26,.035,'#293349',.30,.45,.20,playerMesh.userData.body);box(.11,.19,.015,'#9bcbc6',0,0,.026,phoneMesh);phoneMesh.visible=false;parentMesh=character(true);parentMesh.position.set(7,0,6);parentMesh.visible=false;
  parentLight=new THREE.SpotLight(0xffd496,16,7,Math.PI/6,.6,1.4);parentLight.position.set(7,1.1,6);parentTarget=new THREE.Object3D();house.add(parentTarget);parentLight.target=parentTarget;house.add(parentLight);
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
  const s=saved?.game;$('#continue-detail').textContent=s?s.status==='won'?`继续 · 第 ${Math.min(3,s.level+2)} 夜`:s.status==='lost'?`重试 · 第 ${s.level+1} 夜`:`继续 · 第 ${s.level+1} 夜 · ${Math.floor(s.time/60)}:${String(Math.floor(s.time%60)).padStart(2,'0')}`:'第一次来？从第一夜开始';
}
function hideDialogs(){for(const id of ['#result','#pause-screen','#settings-screen','#challenge-screen'])$(id).hidden=true;}
function enterPlay(){hideDialogs();$('#start-screen').hidden=true;$('#hud').hidden=false;game.active=true;enableAudio();keys.clear();lastStatus='';lastMode='';lastToast='';updateUI();persist();}
function setupLevel(level){game.reset(level);buildHouse();view.mode='overview';view.hasMoved=false;view.yaw=0;view.pitch=-.10;transition.time=1;game.start();enterPlay();}
function startOrContinue(){
  saved=readSession(storage);const data=saved?.game;
  if(!data){setupLevel(0);return;}
  if(data.status==='restart'){setupLevel(data.level);game.say('住宅扩建了。从你上次所在的这一夜重新探索。','hint');return;}
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
  for(const c of COVERS){if(c.x>maxX||!near(c.x,c.z)||wall(c.x,c.z,level))continue;ctx.fillStyle='#749f96';ctx.fillRect(ox+(c.x+.15)*unit,oz+(c.z+.15)*unit,unit*.7,unit*.7);}
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
  const p=game.parent,parentMoving=['checking','returning'].includes(p.state);parentMesh.position.set(p.x,0,p.z);parentMesh.rotation.y=p.heading;parentMesh.visible=parentMoving&&!occluded(game.player,p,game.level,game.doors);parentLight.visible=parentMoving;parentLight.position.set(p.x,1.1,p.z);parentTarget.position.set(p.x+Math.sin(p.heading)*4,.05,p.z+Math.cos(p.heading)*4);parentMesh.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(now*.006+i*Math.PI)*.22);
  for(const{d,pivot}of doorMeshes)pivot.rotation.y=d.progress*Math.PI*.52;
  for(const{s,mesh,marker}of spotMeshes){marker.visible=!s.searched&&distance(s,game.player)<2&&!occluded(game.player,s,game.level,game.doors);mesh.children[0].material=mat(s.searched?'#56606a':'#765653');}
  stepTarget.visible=game.mode?.type==='step';if(stepTarget.visible)stepTarget.position.set(game.mode.target.x,.045,game.mode.target.z);
  vaseMesh.rotation.z=game.vase==='wobbling'?Math.sin(now*.023)*.32:game.vase==='fallen'?Math.PI/2:0;vaseMesh.position.y=game.vase==='fallen'?.18:.97;
  wallBlend=THREE.MathUtils.damp(wallBlend,fp?1:0,9,dt);for(const{mesh,cap,height}of wallMeshes){const h=THREE.MathUtils.lerp(height,2.5,wallBlend);mesh.scale.y=h/2.5;mesh.position.y=h/2-.05;cap.position.y=h-.04;}ceiling.visible=fp&&wallBlend>.99;for(const l of worldLabels)if(!spotMeshes.some(s=>s.marker===l))l.visible=!fp;
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
window.gameSnapshot=()=>({ready:sceneReady,status:game.status,active:game.active,level:game.level,player:{...game.player},parent:{...game.parent,route:undefined},mode:game.mode?.type,hasDevice:game.hasDevice,hidden:game.hidden,time:game.time,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,doors:game.doors.map(d=>({x:d.x,z:d.z,open:d.open,progress:d.progress})),vase:game.vase,view:{...view},camera:camera.position.toArray(),velocity:{...game.velocity},modelLoaded:!!assetTemplate,settings:{...settings},map:{width:mapWidth(game.level),depth:MAP_DEPTH,radius:MINIMAP_RADIUS},recognitionTime:RECOGNITION_TIME,audio:soundscape?{state:audioContext.state,...soundscape.stats}:null});
