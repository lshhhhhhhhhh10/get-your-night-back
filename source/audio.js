// 原创的稀疏拨弦/钟琴夜曲。无采样、远程文件或音乐版权依赖。
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
    this.stats={musicNotes:0,effects:{},lastKind:''};this.active=false;this.tension=false;this.step=0;this.next=ctx.currentTime+.05;
    this.noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter();wind.buffer=this.noise;wind.loop=true;filter.type='lowpass';filter.frequency.value=170;wind.connect(filter);filter.connect(this.ambience);wind.start();
    this.apply();this.timer=setInterval(()=>this.schedule(),100);this.schedule();
  }
  apply(){const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.master,t,.04);this.effects.gain.setTargetAtTime(this.settings.effects,t,.04);this.music.gain.setTargetAtTime(this.settings.music*(this.tension?.40:.72)*(this.active?1:.5),t,.3);this.ambience.gain.setTargetAtTime(this.settings.ambience*.06,t,.1);}
  state(active,parent){const tension=['warning','checking','returning'].includes(parent);if(active!==this.active||tension!==this.tension){this.active=active;this.tension=tension;this.apply();}}
  schedule(){const now=this.ctx.currentTime;if(this.next<now-.3)this.next=now+.02;while(this.next<now+.22){musicBeat(this.ctx,this.music,this.next,this.step++,this.active&&this.tension);this.next+=MUSIC_BEAT;this.stats.musicNotes++;}}
  noiseBurst(bus,time,duration,level,freq,q=1,type='bandpass'){
    const ctx=this.ctx,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=this.noise;f.type=type;f.frequency.setValueAtTime(freq,time);f.Q.value=q;
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(level,time+Math.min(.06,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    s.connect(f);f.connect(g);g.connect(bus);s.start(time,Math.random()*.4,duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};return f;
  }
  effect(kind,strength,x,z,player,yaw,blocked=false){
    const ctx=this.ctx,t=ctx.currentTime,dist=Math.hypot(x-player.x,z-player.z),g=ctx.createGain(),pan=ctx.createStereoPanner();
    pan.pan.value=Math.max(-.95,Math.min(.95,((x-player.x)*Math.cos(yaw)+(z-player.z)*Math.sin(yaw))/5));
    g.gain.value=(blocked?.60:1)/(1+dist*.09);g.connect(pan);pan.connect(this.effects);this.stats.lastKind=kind;this.stats.effects[kind]=(this.stats.effects[kind]||0)+1;
    const burst=(time,duration,volume,f,q,type)=>this.noiseBurst(g,time,duration,volume,f,q,type);
    const note=(time,f,duration,level,type='sine')=>tone(ctx,g,time,f,duration,level,type);
    if(['step','crouchStep','parentStep','tileStep'].includes(kind)){
      const soft=kind==='crouchStep',parent=kind==='parentStep',tile=kind==='tileStep',volume=soft?.045:parent?.20:.12;
      note(t,parent?75:tile?175:115,.14,volume);burst(t,.13,volume*1.6,tile?1500:380,.7);burst(t+.075,.08,volume*.65,750,.8);
    }else if(kind==='snore'){
      // 呼吸包络与低频颤音共同构成鼾声；警觉后不再触发。
      const o=ctx.createOscillator(),env=ctx.createGain(),f=ctx.createBiquadFilter(),lfo=ctx.createOscillator(),depth=ctx.createGain();o.type='sawtooth';o.frequency.value=73;lfo.frequency.value=23;depth.gain.value=9;lfo.connect(depth);depth.connect(o.frequency);f.type='lowpass';f.frequency.value=480;
      env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(.15,t+.35);env.gain.exponentialRampToValueAtTime(.08,t+.9);env.gain.exponentialRampToValueAtTime(.0001,t+1.65);o.connect(f);f.connect(env);env.connect(g);o.start(t);lfo.start(t);o.stop(t+1.7);lfo.stop(t+1.7);o.onended=()=>{o.disconnect();lfo.disconnect();depth.disconnect();f.disconnect();env.disconnect();};burst(t+.10,1.6,.17,340,.8);
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
    setTimeout(()=>{g.disconnect();pan.disconnect();},3000);
  }
}
