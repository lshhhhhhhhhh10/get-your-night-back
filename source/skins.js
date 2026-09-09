export const SKIN_KEY='night-back:skin:v1';
export const SKINS=[
  {id:'scarf',name:'围巾夜行',tag:'老朋友',description:'帽子压低，围巾裹好。今晚也要悄悄出发。',model:'assets/models/peak-character.glb',color:'#d4a16e',source:'附件角色 3'},
  {id:'crab',name:'螃蟹侦察员',tag:'横着也能走',description:'顶着一只大螃蟹，假装自己只是路过。',model:'assets/models/peak-character-1.glb',color:'#e98570',source:'附件角色 1'},
  {id:'chef',name:'偷吃小厨师',tag:'厨房值夜班',description:'厨师帽戴好了，先找设备，再想夜宵。',model:'assets/models/peak-character-2.glb',color:'#a8c5ac',source:'附件角色 2'},
  {id:'box',name:'纸箱潜行员',tag:'可疑的快递',description:'一个长了腿的纸箱。家长可不会因此认错。',model:'assets/models/peak-character.glb',color:'#c69b69',source:'附件角色改装 · 自制纸箱'},
  {id:'pillow',name:'抱枕骑士',tag:'随时准备睡觉',description:'背好小抱枕，摆出一副刚刚梦游的样子。',model:'assets/models/peak-character.glb',color:'#cda7ca',source:'附件角色改装 · 自制抱枕与耳罩'},
  {id:'nightcap',name:'晚安星星',tag:'睡帽还没摘',description:'星星睡帽轻轻晃。夜晚还不想说晚安。',model:'assets/models/peak-character.glb',color:'#8aaacc',source:'附件角色改装 · 自制睡帽'}
];
export const skinById=id=>SKINS.find(s=>s.id===id)||SKINS[0];
export function readSkin(storage){try{return skinById(JSON.parse(storage.getItem(SKIN_KEY)||'null')?.id).id;}catch{return SKINS[0].id;}}
export function saveSkin(storage,id){if(!SKINS.some(s=>s.id===id))return false;try{storage.setItem(SKIN_KEY,JSON.stringify({id}));return true;}catch{return false;}}
