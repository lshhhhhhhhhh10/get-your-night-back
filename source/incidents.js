export const INCIDENTS={
 vase:{name:'花瓶',kind:'vase',chance:1,noise:90,start:'袖子擦到花瓶了！',success:'接住了花瓶。轻轻放回去。',failure:'哐当！花瓶落地。',sound:'crash'},
 'kitchen-search':{name:'叉子',kind:'fork',chance:.7,noise:55,start:'翻找震到餐具格，叉子滑出来了！',success:'接住叉子，轻轻放回餐具格。',failure:'叮啷！叉子掉在瓷砖上。',sound:'metalDrop'},
 'study-search':{name:'铅笔',kind:'pencils',chance:.7,noise:40,start:'翻找时碰到了笔筒！',success:'扶住笔筒，继续轻轻翻找。',failure:'哒哒！笔筒和铅笔滚到地上。',sound:'pencilDrop'},
 'storage-search':{name:'铁盒',kind:'tin',chance:.7,noise:65,start:'柜子里的铁盒滑下来了！',success:'托住铁盒，稳稳放回。',failure:'哐啷！铁盒撞在地上。',sound:'metalDrop'}
};
// 每局固定一次概率，取消搜索或刷新不会重新掷骰。
export function incidentRoll(seed,id){let n=seed>>>0;for(const ch of id)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;n^=n>>>16;n=Math.imul(n,2246822507)>>>0;n^=n>>>13;return(n>>>0)/4294967296;}
export const CATCH_DURATION=3.2;
export const CATCH_INTRO=.45;
export const CATCH_SWEEP=2.4;
export const SLOW_FACTOR=.12;
