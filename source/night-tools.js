import {acousticMaskAt} from './acoustic-hearing.js';
import {WASHER} from './sound-sources.js';
export {WASHER};
// 可交互道具与局部环境声共用位置；旧便条 ID 只用于兼容 v4 存档。
export const CLUES=[
 {id:'bed-note',name:'床头便条',x:4.3,z:11.05,y:.735,furniture:'bedside'},
 {id:'living-note',name:'茶几留言',x:3.3,z:3,y:.49,furniture:'living-table'},
 {id:'shelf-note',name:'书架夹页',x:17.16,z:4.3,y:1.1,furniture:'study-shelf'}
];
// Legacy note IDs are retained only to read v4 saves. Notes no longer appear in play.
export const LURES=[
 {id:'radio',name:'客厅收音机',x:4.08,z:2.2,y:.60,furniture:'living-tv',kind:'radio',minLevel:0},
 {id:'toy',name:'走廊玩具鸭',x:1.25,z:7,y:.65,furniture:'hall-chair',kind:'toy',minLevel:0},
 {id:'back-radio',name:'后廊收音机',x:21,z:17.15,y:.88,furniture:'back-console',kind:'radio',minLevel:1}
];

export function newNightTools(){return {clues:[],unlocked:[],locks:{},lures:{},maskedSteps:0,lastWasher:-10,phone:{state:'idle',timer:0,hold:0,armed:false,rings:0,lastCue:-1}};}
export const maskAt=acousticMaskAt;
export function phonePending(game){return ['warning','ringing'].includes(game.night.phone.state);}
