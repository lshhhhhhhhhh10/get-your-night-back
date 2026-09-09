// 每一夜的线索、可交互道具与局部环境声，共用位置数据。
export const CLUES=[
 {id:'bed-note',name:'床头便条',x:4.3,z:11.05,y:.735,furniture:'bedside'},
 {id:'living-note',name:'茶几留言',x:3.3,z:3,y:.49,furniture:'living-table'},
 {id:'shelf-note',name:'书架夹页',x:17.16,z:4.3,y:1.1,furniture:'study-shelf'}
];
export const CLUE_TEXT=[
 ['便条拼好了：“最安静的故事，都藏在书页旁。”背面的书签依次画着：月 → 星 → 云。','留言拼好了：“设备和充电线收在书房抽屉里。”图案锁的顺序在床头书签上。','夹页上写着：“锁开的那声咔哒之后，记得轻轻翻找。”'],
 ['标签背面：“找纸箱，不找碗盘。”三个记号依次是：月 → 星 → 云。数字对照藏在客厅茶几。','杯垫背面写着：月 = 2，星 = 3，云 = 8。设备随纸箱收进东侧储物柜。','夹页提醒：“先排图案，再换数字，不要按数字大小重新排序。”'],
 ['四张标签背面：月 → 星 → 叶 → 云。下一张对照表在客厅茶几，最后的读法夹在书房书架里。','杯垫背面：月 = 2，星 = 3，叶 = 5，云 = 8。设备藏在洗衣间抽屉，别去翻洗衣机。','书架夹页：“新锁反着读。把整串数字从右往左输入。”现在可以去洗衣间开锁。']
];
export const LURES=[
 {id:'radio',name:'客厅收音机',x:4.08,z:2.2,y:.60,furniture:'living-tv',kind:'radio',minLevel:0},
 {id:'toy',name:'走廊玩具鸭',x:1.25,z:7,y:.65,furniture:'hall-chair',kind:'toy',minLevel:0},
 {id:'back-radio',name:'后廊收音机',x:21,z:17.15,y:.88,furniture:'back-console',kind:'radio',minLevel:1}
];
export const WASHER={x:11.8,z:15.02,radius:7.5,cycle:18,start:7,end:13};
export function newNightTools(){return {clues:[],unlocked:[],lures:{},maskedSteps:0,lastWasher:-10,phone:{state:'idle',timer:0,hold:0,armed:false,rings:0,lastCue:-1}};}
export function maskAt(game,point=game.player){
 if(game.parent.state==='sleep'&&game.time-game.lastSnore>=.1&&game.time-game.lastSnore<1.6)return {id:'snore',name:'长鼾声',factor:.28};
 const phase=game.time%WASHER.cycle;
 if(phase>=WASHER.start&&phase<WASHER.end&&Math.hypot(point.x-WASHER.x,point.z-WASHER.z)<=WASHER.radius)return {id:'washer',name:'洗衣机脱水声',factor:.3};
 return null;
}
export function phonePending(game){return ['warning','ringing'].includes(game.night.phone.state);}
export function clueText(level,id){return CLUE_TEXT[level][CLUES.findIndex(c=>c.id===id)]||'';}
