import {acousticProfile,soundPosition} from './spatial-audio.js';
// 原创拨弦/钟琴夜曲；门和金属落地使用本地 CC0 实录，来源见 assets/audio/README.md。
export const MUSIC_BEAT=.625;
export const MELODY=[74,0,77,81,0,77,72,0,70,0,74,77,0,74,69,0,67,0,70,74,0,70,65,0,69,0,72,76,0,72,73,0];
const hz=n=>440*2**((n-69)/12);
export function tone(ctx,bus,time,freq,duration,level,type='sine',pan=0){
  const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,time);p.pan.value=pan;
  g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  o.connect(g);g.connect(p);p.connect(bus);o.start(time);o.stop(time+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
}
export function musicBeat(ctx,bus,time,step,tension=false){
  const n=MELODY[step%MELODY.length];if(n){tone(ctx,bus,time,hz(n),1.25,.105,'sine',Math.sin(step)*.25);tone(ctx,bus,time,hz(n)*2,.38,.023,'sine',-.15);}
  if(step%4===0){const roots=[50,46,43,45],root=roots[Math.floor(step/8)%4];tone(ctx,bus,time,hz(root),1.8,.075,'triangle',-.2);tone(ctx,bus,time+.025,hz(root+7),1.6,.035,'sine',.25);}
  if(tension&&step%2===0)tone(ctx,bus,time,82,.18,.095,'triangle');
}
export class Soundscape{
  constructor(ctx,settings){
    this.ctx=ctx;this.settings=settings;this.master=ctx.createGain();this.effects=ctx.createGain();this.music=ctx.createGain();this.ambience=ctx.createGain();
    this.master.gain.value=settings.master;this.effects.gain.value=settings.effects;this.music.gain.value=0;this.ambience.gain.value=0;
    this.effects.connect(this.master);this.music.connect(this.master);this.ambience.connect(this.master);this.master.connect(ctx.destination);
    this.voices=new Set();this.footSequence={};this.listenerPose={x:0,z:0,yaw:0};
    this.stats={musicNotes:0,effects:{},lastKind:'',samplesReady:0,sampleErrors:[],hingeGrains:0,hingeMoving:false};this.samples={};this.ready=this.loadSamples();this.active=false;this.tension=false;this.step=0;this.next=ctx.currentTime+.05;
    this.hingeSources=new Set();this.hingeNext=0;this.hingeGain=ctx.createGain();this.hingeGain.gain.value=0;this.hingeFilter=ctx.createBiquadFilter();this.hingeFilter.type='lowpass';this.hingePan=ctx.createStereoPanner();this.hingeFilter.connect(this.hingeGain);this.hingeGain.connect(this.hingePan);this.hingePan.connect(this.effects);
    this.noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter();wind.buffer=this.noise;wind.loop=true;filter.type='lowpass';filter.frequency.value=170;wind.connect(filter);filter.connect(this.ambience);wind.start();
    this.apply();this.timer=setInterval(()=>this.schedule(),100);this.schedule();
  }
  async loadSamples(){
    const files={handle:'door-handle.wav',hinge:'door-hinge.wav',hingeReal:'hinge-real.wav',bump:'door-bump.wav',latch:'door-latch.wav',drawer:'drawer.wav',metal:'metal-drop.wav'};
    for(const surface of ['wood','tile','carpet'])for(let i=1;i<=4;i++)files[`step-${surface}-${i}`]=`step-${surface}-${i}.wav`;
    await Promise.all(Object.entries(files).map(async([id,file])=>{try{const response=await fetch(new URL(`assets/audio/${file}`,document.baseURI));if(!response.ok)throw Error(response.status);this.samples[id]=await this.ctx.decodeAudioData(await response.arrayBuffer());this.stats.samplesReady++;}catch{this.stats.sampleErrors.push(file);}}));
  }
  sample(id,bus,time,volume,rate=1,offset=0,maxDuration=2){
    const buffer=this.samples[id];if(!buffer)return false;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=rate;
    const duration=Math.min(maxDuration,buffer.duration-offset),real=duration/rate;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.012);gain.gain.setValueAtTime(volume,time+Math.max(.015,real-.05));gain.gain.linearRampToValueAtTime(.0001,time+real);
    source.connect(gain);gain.connect(bus);source.start(time,offset,duration);source.onended=()=>{source.disconnect();gain.disconnect();};return true;
  }
  doorMotion(mode,active,player,yaw){
    const ctx=this.ctx,t=ctx.currentTime,drive=mode?.type==='door'?mode.drive:null,moving=!!(active&&drive?.moving),buffer=this.samples.hingeReal||this.samples.hinge;
    const listening=!!(active&&mode?.type==='door');if(this.doorListening!==listening){this.doorListening=listening;this.apply();}
    if(!moving||!buffer){
      if(this.stats.hingeMoving){this.hingeGain.gain.setTargetAtTime(0,t,.018);for(const v of this.hingeSources){v.envelope.gain.cancelScheduledValues(t);v.envelope.gain.setTargetAtTime(0,t,.012);v.source.stop(t+.065);}this.hingeSources.clear();this.hingeNext=0;}
      this.stats.hingeMoving=false;return;
    }
    this.stats.hingeMoving=true;
    const rough=drive.roughness,volume=.14+rough*.95,rate=.78+(drive.speed??drive.pressure)*.40;
    this.hingeGain.gain.setTargetAtTime(volume,t,.045);this.hingeFilter.frequency.setTargetAtTime(1100+rough*4500,t,.055);
    const d=mode.door;this.hingePan.pan.setTargetAtTime(Math.max(-.8,Math.min(.8,((d.x-.47-player.x)*Math.cos(yaw)+(d.z-player.z)*Math.sin(yaw))*.8)),t,.04);
    for(const v of this.hingeSources)v.source.playbackRate.setTargetAtTime(rate,t,.08);
    if(t>=this.hingeNext){
      // Long overlapping phrases retain the uneven texture of the real hinge.
      const source=ctx.createBufferSource(),envelope=ctx.createGain(),span=2.35,offset=(this.stats.hingeGrains*3.17) % Math.max(.01,buffer.duration-3.5);
      source.buffer=buffer;source.playbackRate.value=rate;envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(1,t+(this.hingeSources.size?.32:.04));envelope.gain.setValueAtTime(1,t+span-.32);envelope.gain.linearRampToValueAtTime(0,t+span);
      source.connect(envelope);envelope.connect(this.hingeFilter);source.start(t,offset);source.stop(t+span+.01);
      const voice={source,envelope};this.hingeSources.add(voice);source.onended=()=>{source.disconnect();envelope.disconnect();this.hingeSources.delete(voice);};this.hingeNext=t+span-.32;this.stats.hingeGrains++;
    }
  }
  listen(player,yaw,isBlocked=()=>false){
    const t=this.ctx.currentTime,l=this.ctx.listener;this.listenerPose={...player,yaw};
    if(l.positionX){for(const[k,value]of Object.entries({positionX:player.x,positionY:1.35,positionZ:player.z,forwardX:Math.sin(yaw),forwardY:0,forwardZ:-Math.cos(yaw),upX:0,upY:1,upZ:0}))l[k].setTargetAtTime(value,t,.025);}
    else{l.setPosition(player.x,1.35,player.z);l.setOrientation(Math.sin(yaw),0,-Math.cos(yaw),0,1,0);}
    for(const v of this.voices){if(t<v.nextCheck)continue;v.nextCheck=t+.12;const a=acousticProfile(v,player,yaw,isBlocked(v));v.filter.frequency.setTargetAtTime(a.cutoff,t,.06);v.gain.gain.setTargetAtTime(a.gain*v.level,t,.06);}
    this.stats.activeVoices=this.voices.size;
  }
  stopVoices(kind){const t=this.ctx.currentTime;for(const v of this.voices){if(kind&&v.kind!==kind)continue;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.01);this.voices.delete(v);setTimeout(v.dispose,65);}}
  apply(){const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.master,t,.04);this.effects.gain.setTargetAtTime(this.settings.effects,t,.04);this.music.gain.setTargetAtTime(this.settings.music*(this.doorListening?.25:1)*(this.tension?.40:.72)*(this.active?1:.5),t,.3);this.ambience.gain.setTargetAtTime(this.settings.ambience*.06,t,.1);}
  state(active,parent){if(!active&&this.active)this.stopVoices();if(parent!=='sleep')this.stopVoices('snore');const tension=['warning','checking','returning'].includes(parent);if(active!==this.active||tension!==this.tension){this.active=active;this.tension=tension;this.apply();}}
  schedule(){const now=this.ctx.currentTime;if(this.next<now-.3)this.next=now+.02;while(this.next<now+.22){musicBeat(this.ctx,this.music,this.next,this.step++,this.active&&this.tension);this.next+=MUSIC_BEAT;this.stats.musicNotes++;}}
  noiseBurst(bus,time,duration,level,freq,q=1,type='bandpass'){
    const ctx=this.ctx,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=this.noise;f.type=type;f.frequency.setValueAtTime(freq,time);f.Q.value=q;
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(level,time+Math.min(.06,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    s.connect(f);f.connect(g);g.connect(bus);s.start(time,Math.random()*.4,duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};return f;
  }
  effect(kind,strength,x,z,player,yaw,blocked=false,surface='wood'){
    if(kind==='hingeMotion')return; // Continuous doorMotion owns the player hinge voice.
    const ctx=this.ctx,t=ctx.currentTime,g=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createPanner();
    const profile=acousticProfile({x,z},player,yaw,blocked),position=soundPosition(kind,x,z);
    pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=1.8;pan.maxDistance=30;pan.rolloffFactor=1.25;
    pan.positionX.value=position.x;pan.positionY.value=position.y;pan.positionZ.value=position.z;
    const impact=['metalDrop','pencilDrop','crash'].includes(kind),level=impact?Math.max(.05,Math.min(1,strength/(kind==='crash'?90:kind==='pencilDrop'?40:65))):1;
    filter.type='lowpass';filter.frequency.value=profile.cutoff;g.gain.value=profile.gain*level;
    g.connect(filter);filter.connect(pan);pan.connect(this.effects);
    const voice={kind,x,z,level,gain:g,filter,nextCheck:t+.12,dispose:()=>{g.disconnect();filter.disconnect();pan.disconnect();this.voices.delete(voice);}};this.voices.add(voice);
    this.stats.lastKind=kind;this.stats.effects[kind]=(this.stats.effects[kind]||0)+1;this.stats.lastSpatial={kind,...profile,x,z};
    const burst=(time,duration,volume,f,q,type)=>this.noiseBurst(g,time,duration,volume,f,q,type);
    const note=(time,f,duration,level,type='sine')=>tone(ctx,g,time,f,duration,level,type);
    if(kind==='lockPin'){note(t,1550,.065,.035,'triangle');burst(t,.024,.065,2600,3);}
    if(kind==='lockScrape'){burst(t,.15,.14,1850,2.5);note(t,380,.11,.024,'triangle');}
    const foot=['step','crouchStep','parentStep','tileStep'].includes(kind),seq=this.footSequence[surface]||0;
    let footSample=false;
    if(foot){this.footSequence[surface]=seq+1;const variant=[1,3,2,4][seq%4],soft=kind==='crouchStep',parent=kind==='parentStep';
      footSample=this.sample(`step-${surface}-${variant}`,g,t,(soft?.07:parent?.65:.27)*(surface==='carpet'?.58:1),(parent?.90:1.04)+(seq%3-1)*.035,0,.46);this.stats.lastFootstep={surface,variant,recorded:footSample};}
    const sampled=footSample||(kind==='doorHandle'?this.sample('handle',g,t,.7,1,0,.7):kind==='doorSoft'?this.sample('hinge',g,t,.18,.94,.15,.64):kind==='doorCreak'?this.sample('hinge',g,t,.66,.75,.10,.67):kind==='doorBump'?this.sample('bump',g,t,.8,.92):kind==='latch'?this.sample('latch',g,t,.55,1.05,.32,.32):kind==='metalDrop'?this.sample('metal',g,t,.8,.93):kind==='search'?this.sample('drawer',g,t,.22,.9,0,.55):false);
    if(sampled){/* 真实把手、门轴、木门撞击和金属碰撞，不叠加旧电子滑音。 */}
    else if(kind==='catMeow'||kind==='catChirp'){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),e=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(kind==='catMeow'?480:700,t);o.frequency.exponentialRampToValueAtTime(kind==='catMeow'?780:1000,t+.12);o.frequency.exponentialRampToValueAtTime(340,t+.48);f.type='bandpass';f.frequency.value=1400;f.Q.value=1.3;e.gain.setValueAtTime(.0001,t);e.gain.exponentialRampToValueAtTime(.07,t+.06);e.gain.exponentialRampToValueAtTime(.0001,t+.52);o.connect(f);f.connect(e);e.connect(g);o.start(t);o.stop(t+.55);o.onended=()=>{o.disconnect();f.disconnect();e.disconnect();};}
    else if(kind==='catchTouch'){burst(t,.12,.07,600,.8);}
    else if(kind==='parentGiggle'){for(let i=0;i<3;i++){note(t+i*.13,190+i*32,.10,.045,'triangle');burst(t+i*.13,.09,.055,750,1.2);}}
    else if(kind==='catPurr'){for(let i=0;i<24;i++)note(t+i*.045,65,.04,.035,'triangle');burst(t,1.1,.055,180,1.2);}
    else if(kind==='catToy'){for(let i=0;i<3;i++){note(t+i*.13,150+i*50,.08,.035,'triangle');burst(t+i*.13,.05,.04,500,1);}}
    else if(kind==='catHop'){burst(t,.12,.06,420,1);}
    else if(kind==='washer'){burst(t,1.85,.20,180,1.2);for(let i=0;i<7;i++)note(t+i*.24,65,.19,.08,'triangle');}
    else if(kind==='radio'){burst(t,.35,.08,900,.8);for(const [i,f]of [330,440,392,494].entries())note(t+i*.20,f,.24,.10,'triangle');}
    else if(kind==='toy'){for(let i=0;i<2;i++){note(t+i*.35,620-i*140,.18,.12,'triangle');burst(t+i*.35,.15,.10,1050,3);}}
    else if(kind==='phoneBuzz'){for(let i=0;i<2;i++){note(t+i*.18,110,.12,.045,'sawtooth');burst(t+i*.18,.10,.04,240,2);}}
    else if(kind==='phoneRing'){for(let i=0;i<4;i++){note(t+i*.18,i%2?880:660,.13,.14,'sine');}}
    else if(kind==='phoneMute'||kind==='switch'){burst(t,.06,.04,1200,1);if(kind==='phoneMute')note(t,390,.16,.035);}
    else if(kind==='pencilDrop'){for(let i=0;i<5;i++){note(t+i*.07,320+i*73,.08,.055);burst(t+i*.06,.09,.1,850+i*120,1);}}
    else if(['step','crouchStep','parentStep','tileStep'].includes(kind)){
      const soft=kind==='crouchStep',parent=kind==='parentStep',tile=kind==='tileStep',volume=soft?.045:parent?.20:.12;
      note(t,parent?75:tile?175:115,.14,volume);burst(t,.13,volume*1.6,tile?1500:380,.7);burst(t+.075,.08,volume*.65,750,.8);
    }else if(kind==='snore'){
      // 呼吸包络与低频颤音共同构成鼾声；警觉后不再触发。
      const o=ctx.createOscillator(),env=ctx.createGain(),f=ctx.createBiquadFilter(),lfo=ctx.createOscillator(),depth=ctx.createGain();o.type='sawtooth';o.frequency.value=73;lfo.frequency.value=23;depth.gain.value=9;lfo.connect(depth);depth.connect(o.frequency);f.type='lowpass';f.frequency.value=480;
      env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(.15,t+.35);env.gain.exponentialRampToValueAtTime(.08,t+.9);env.gain.exponentialRampToValueAtTime(.0001,t+1.65);o.connect(f);f.connect(env);env.connect(g);o.start(t);lfo.start(t);o.stop(t+1.7);lfo.stop(t+1.7);o.onended=()=>{o.disconnect();lfo.disconnect();depth.disconnect();f.disconnect();env.disconnect();};burst(t+.10,1.6,.17,340,.8);
    }else if(['floorPressure','floorSoft','floorCreak'].includes(kind)){
      const loud=kind==='floorCreak',pressure=kind==='floorPressure',volume=loud?.23:pressure?.028:.065,duration=loud?1.05:pressure?.24:.48;
      // 木板受力产生不均匀的滑音，与鞋底冲击、门轴声分开。
      const o=ctx.createOscillator(),env=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';f.type='lowpass';f.frequency.value=loud?1600:950;
      for(const[at,freq]of[[0,230],[.12,365],[.3,275],[.55,420],[1,155]])o.frequency.linearRampToValueAtTime(freq,t+at*duration);
      env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(volume,t+.025);env.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(f);f.connect(env);env.connect(g);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();f.disconnect();env.disconnect();};burst(t,duration,volume*.8,650,5);
      if(loud){note(t,95,.14,.13);burst(t+.2,.1,.10,1250,3);}
    }else if(['creak','doorCreak','doorSoft','bed'].includes(kind)){
      const soft=kind==='doorSoft',base=kind==='bed'?190:kind==='creak'?400:610,level=soft?.018:.105;
      const f=burst(t,soft?.55:.8,soft?.10:.28,base,7);f.frequency.exponentialRampToValueAtTime(base*.53,t+.6);
      note(t,base,.48,level,'triangle');note(t+.13,base*.78,.52,level*.6,'triangle');
    }else if(kind==='doorBump'||kind==='crash'){
      note(t,kind==='crash'?86:65,.35,.22);burst(t,.6,.42,kind==='crash'?1900:360,1,kind==='crash'?'highpass':'bandpass');
    }else if(kind==='latch'){burst(t,.08,.17,1700,2);note(t+.07,330,.08,.08);}
    else if(kind==='search'||kind==='cloth'){burst(t,.4,kind==='search'?.10:.05,1250,.6);if(kind==='search')burst(t+.35,.23,.08,2100,.6);}
    else if(kind==='wobble'){for(let i=0;i<3;i++)note(t+i*.15,740-i*60,.22,.08,'triangle');}
    else{const notes=kind==='win'?[67,71,74,79]:kind==='found'?[69,76]:kind==='lose'?[57,54,50]:kind==='notice'?[80,81]:[64,71];notes.forEach((n,i)=>note(t+i*.12,hz(n),.4,.12));}
    // 清理一次性声源的输出节点，长时间探索不会积累音频连接。
    setTimeout(voice.dispose,3000);
  }
}
