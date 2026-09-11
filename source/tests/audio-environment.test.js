import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../engine.js';
import {environmentAudioFrame} from '../audio-environment.js';
import {acousticProfile,latestSoundCue} from '../spatial-audio.js';
import {maskAt} from '../night-tools.js';
test('掩护混音与原判定同一窗口，家长醒来与暂停停止环境声',()=>{
 const g=new Game();g.start();g.lastSnore=0;
 for(const t of[0,.05,.1,.8,1.59,1.6,1.7,6,7,8,12.99,13,18]){g.time=t;const f=environmentAudioFrame(g);assert.equal(f.mask,maskAt(g)?.id||null);assert.equal(f.selfGain,1);}
 g.time=.5;g.parent.state='alert';assert.equal(environmentAudioFrame(g).sources[0].active,false);
 g.time=8;g.player={x:12,z:16};assert.equal(environmentAudioFrame(g).mask,'washer');g.active=false;const f=environmentAudioFrame(g);assert.equal(f.mask,null);assert.ok(f.sources.every(s=>!s.active));assert.equal(f.selfGain,1);
});
test('洗衣机范围外仍可听到但没有脚步压低，慢动作只同步播放时钟',()=>{
 const g=new Game();g.start();g.time=8;g.player={x:3,z:3};let f=environmentAudioFrame(g);assert.equal(f.selfGain,1);assert.equal(f.sources[1].active,true);g.mode={type:'catch'};f=environmentAudioFrame(g);assert.equal(f.clockRate,.12);assert.equal(f.selfGain,1);
});
test('脚步字幕随转头互换左右；HRTF 负责前后频谱，不另加人工背后滤波',()=>{
 const source={kind:'parentStep',x:3,z:-3},listener={x:0,z:0};const a=acousticProfile(source,listener),b=acousticProfile(source,listener,Math.PI),wall=acousticProfile(source,listener,0,true);
 assert.ok(a.lateral>.6&&b.lateral<-.6);assert.equal(a.cutoff,undefined);assert.equal(b.gain,undefined);
 assert.equal(latestSoundCue([{kind:'parentStep',at:100},{kind:'washer',at:200}],300).kind,'parentStep');
});
test('新增五个实录为单声道 PCM，淡入淡出、无削波；脱水声持续覆盖六秒',()=>{
 for(const name of['floor-creak-1','floor-creak-2','floor-creak-3','snore-real','washer-spin']){
  const b=readFileSync(new URL(`../../assets/audio/${name}.wav`,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),32000);let peak=0;for(let n=44;n<b.length;n+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(n)));assert.ok(peak>10000&&peak<26000);assert.equal(b.readInt16LE(44),0);assert.equal(b.readInt16LE(b.length-2),0);
  if(name==='washer-spin'){assert.equal((b.length-44)/64000,6);for(let block=0;block<12;block++){let energy=0;for(let i=0;i<16000;i++)energy+=(b.readInt16LE(44+2*(block*16000+i))/32768)**2;assert.ok(Math.sqrt(energy/16000)>.12);}}
 }
});
