// 每一夜的线索、可交互道具与局部环境声，共用位置数据。
export const CLUES=[
 {id:'bed-note',name:'床头便条',x:4.3,z:11.05,y:.735,furniture:'bedside'},
 {id:'living-note',name:'茶几留言',x:3.3,z:3,y:.49,furniture:'living-table'}
];
export const CLUE_TEXT=[
 ['“设备放在书房了，别再熬夜。”先去东侧书房。客厅茶几上还有一张留言。','“充电线和手机都收进书房抽屉。”靠近抽屉时留意微弱的充电灯。'],
 ['“放在干燥、远离餐具的地方了。”先排除餐厅和洗衣间，再去客厅茶几找留言。','“充电线收在放纸箱的房间，手机跟它在一起。”去东侧储物间看看柜子。'],
 ['“明早洗衣服时记得把设备拿出来。”线索指向南侧洗衣间；客厅茶几可能还有说明。','“手机和充电线在洗衣间抽屉里，没放进洗衣机。”找到后先处理来电，再回卧室。']
];
export const LURES=[
 {id:'radio',name:'客厅收音机',x:4.08,z:2.2,y:.60,furniture:'living-tv',kind:'radio',minLevel:0},
 {id:'toy',name:'走廊玩具鸭',x:1.25,z:7,y:.65,furniture:'hall-chair',kind:'toy',minLevel:0},
 {id:'back-radio',name:'后廊收音机',x:21,z:17.15,y:.88,furniture:'back-console',kind:'radio',minLevel:1}
];
export const WASHER={x:11.8,z:15.02,radius:7.5,cycle:18,start:7,end:13};
export function newNightTools(){return {clues:[],lures:{},maskedSteps:0,lastWasher:-10,phone:{state:'idle',timer:0,hold:0,armed:false,rings:0,lastCue:-1}};}
export function maskAt(game,point=game.player){
 if(game.parent.state==='sleep'&&game.time-game.lastSnore>=.1&&game.time-game.lastSnore<1.6)return {id:'snore',name:'长鼾声',factor:.28};
 const phase=game.time%WASHER.cycle;
 if(phase>=WASHER.start&&phase<WASHER.end&&Math.hypot(point.x-WASHER.x,point.z-WASHER.z)<=WASHER.radius)return {id:'washer',name:'洗衣机脱水声',factor:.3};
 return null;
}
export function phonePending(game){return ['warning','ringing'].includes(game.night.phone.state);}
export function clueText(level,id){return CLUE_TEXT[level][CLUES.findIndex(c=>c.id===id)]||'';}
