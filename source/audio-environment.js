import {maskAt,WASHER} from './night-tools.js';
import {PARENT_BED} from './layout.js';
import {SLOW_FACTOR} from './incidents.js';

// 只把已有掩护规则映射成听觉包络，不另造一套生效时钟或扩大掩护范围。
export function environmentAudioFrame(game){
  const active=game.active&&game.status==='playing',age=game.time-game.lastSnore;
  const phase=game.time%WASHER.cycle-WASHER.start,mask=active?maskAt(game):null;
  const snore=active&&game.parent.state==='sleep'&&age>=0&&age<1.7;
  const washer=active&&phase>=0&&phase<WASHER.end-WASHER.start;
  const envelope=(age,end,attack,release)=>Math.max(0,Math.min(1,age/attack,(end-age)/release));
  return {mask:mask?.id||null,selfGain:mask?.id==='snore'?.60:mask?.id==='washer'?.55:1,
    clockRate:['catch','reaction'].includes(game.mode?.type)?SLOW_FACTOR:1,
    sources:[
      {kind:'snore',...PARENT_BED,active:snore,age,duration:1.7,gain:snore?envelope(age,1.7,.09,.1):0},
      {kind:'washer',...WASHER,active:washer,age:phase,duration:6,gain:washer?envelope(phase,6,.05,.06):0}
    ]};
}
