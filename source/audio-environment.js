import {maskAt} from './night-tools.js';
import {SLOW_FACTOR} from './incidents.js';

import {environmentSources} from './sound-sources.js';
export function environmentAudioFrame(game){
 const active=game.active&&game.status==='playing';
 return {mask:active?maskAt(game)?.id||null:null,selfGain:1,
  clockRate:['catch','reaction'].includes(game.mode?.type)?SLOW_FACTOR:1,
  sources:environmentSources(game).map(s=>({...s,active:active&&s.active}))};
}
