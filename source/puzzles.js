// Evidence is always available before the corresponding lock: no random codes or consumable keys.
export const LOCKS=[['study-search'],['storage-search','kitchen-search'],['laundry-search','storage-search']];
export const locked=(g,id)=>LOCKS[g.level].includes(id)&&!g.night.unlocked?.includes(id);
const puzzles=[
 {title:'被打乱的睡前便条',evidence:'三个小图画掉了下来。先刷牙，再换睡衣，最后钻进被窝。把睡前的顺序拼回去，背面的字才连得上。',options:['钻被窝','刷牙','换睡衣'],answer:[1,2,0],hint:'先做洗漱的事。'},
 {title:'杯垫下的半句话',evidence:'碎纸上写着：“不是吃饭的地方，也没有流水声；只有书页沙沙响。”把它对应的房间找出来。',options:['餐厅','书房','洗衣间'],answer:[1],hint:'哪种房间会有很多书？'},
 {title:'夹在书脊里的纸条',evidence:'三本书的卷号乱了：下册、上册、中册。按故事的阅读顺序抽出来，拼好夹在里面的字。',options:['下册','上册','中册'],answer:[1,2,0],hint:'从上册开始。'}
];
export function puzzleFor(g,id){
 if(typeof id!=='string')return null;
 if(id.startsWith('lock:')){
  const required=g.level===0?['bed-note']:g.level===1?['bed-note','living-note']:['bed-note','living-note','shelf-note'];
  return {id,title:g.level===0?'书签图案锁':g.level===1?'收纳柜数字锁':'反向四位密码锁',
   evidence:g.level===0?'锁旁刻着：按床头书签上的顺序。':g.level===1?'锁旁刻着：床头记顺序，茶几换数字。':'锁旁刻着：床头的顺序、茶几的数字、书架的读法，缺一不可。',
   options:g.level===0?['云','月','星']:['0','1','2','3','4','5','6','7','8','9'],answer:g.level===0?[1,2,0]:g.level===1?[2,3,8]:[8,5,3,2],required,
   hint:g.level===0?'从书签上的月亮开始。':g.level===1?'依次把月、星、云换成数字。':'先把四个图案换成数字，再把整串倒过来读。'};
 }
 const index=['bed-note','living-note','shelf-note'].indexOf(id);if(index<0)return null;
 const p={...puzzles[index],id};
 if(g.level===1&&index===0)Object.assign(p,{title:'收纳标签的顺序',evidence:'三张标签写着：纸箱在相册之后，相册在书本之后。按收拾房间的先后排好。',options:['相册','纸箱','书本'],answer:[2,0,1],hint:'先收书本，最后收纸箱。'});
 if(g.level===2&&index===0)Object.assign(p,{title:'四张散落的标签',evidence:'袜子紧跟毛巾；睡衣排在最后；牙刷在毛巾之前。排好四张标签，读出背面的记号。',options:['睡衣','袜子','牙刷','毛巾'],answer:[2,3,1,0],hint:'先确定牙刷和睡衣的位置，再把毛巾、袜子放在中间。'});
 if(g.level>0&&index===1)Object.assign(p,{title:'茶几上的收纳谜语',evidence:g.level===1?'三个地方中：手机怕水，也不能和吃饭用的东西混放。哪种东西旁边最合适？':'纸条写着：它不是餐具，也不是纸箱；每天成双出现，洗完又要配成对。',options:['餐具','纸箱','袜子'],answer:[g.level===1?1:2],hint:g.level===1?'选择干燥、没有餐具的一项。':'想想脚上穿的东西。'});
 return p;
}
export function checkPuzzle(g,id,entry){const p=puzzleFor(g,id);return !!p&&(!p.required||p.required.every(c=>g.night.clues.includes(c)))&&Array.isArray(entry)&&entry.length===p.answer.length&&entry.every((v,i)=>v===p.answer[i]);}
