// 家具的位置、朝向、尺寸同时供模型和碰撞使用。朝向 0 的正面朝 +Z。
export const PARENT_HOME={x:6,z:6};
export const PARENT_BED={x:7.5,z:5.65};
export const FURNITURE=[
  {id:'child-bed',type:'bed',x:1.75,z:12,w:1.55,d:2.25,h:1.05,color:'#748ead'},
  {id:'bedside',type:'cabinet',x:4.3,z:11.05,w:.65,d:.6,h:.7,color:'#b68e70'},
  {id:'bedroom-lamp',type:'lamp',x:5.8,z:12.85,w:.44,d:.44,h:1.85,warm:true},
  {id:'parent-bed',type:'bed',...PARENT_BED,w:1.6,d:2,h:1.05,color:'#9489ad'},
  {id:'parent-dresser',type:'cabinet',x:8.05,z:7.1,w:.65,d:.55,h:.9,color:'#87738e'},
  {id:'living-sofa',type:'sofa',name:'沙发',x:1.12,z:2.7,w:2.2,d:.95,h:1.08,yaw:Math.PI/2,cover:true,color:'#668f91'},
  {id:'living-table',type:'table',x:3,z:3,w:1.1,d:.85,h:.46,color:'#b49778'},
  {id:'living-tv',type:'tv',x:4.25,z:2.7,w:1.5,d:.6,h:1.65,yaw:-Math.PI/2,color:'#6e6067'},
  {id:'living-search',type:'cabinet',name:'客厅矮柜',x:3.2,z:.95,w:1.25,d:.8,h:.9,search:true,color:'#a17d66'},
  {id:'hall-chair',type:'chair',name:'扶手椅',x:1.13,z:7,w:.86,d:.85,h:1.12,yaw:Math.PI/2,cover:true,color:'#a77f8d'},
  {id:'hall-console',type:'shelf',name:'走廊书柜',x:13.15,z:7.9,w:1,d:.65,h:1.85,yaw:-Math.PI/2,cover:true,color:'#897e78'},
  {id:'old-door-books',type:'shelf',name:'书柜',x:12.6,z:5.13,w:1.5,d:.65,h:1.9,yaw:Math.PI,cover:true,color:'#9a8776'},
  {id:'vase-stand',type:'cabinet',x:9.7,z:2.8,w:.58,d:.58,h:.85,color:'#9e8270',vase:true},
  {id:'living-plant',type:'plant',x:.95,z:.95,w:.44,d:.44,h:1.15},
  {id:'study-search',type:'cabinet',name:'书房抽屉',x:16,z:.93,w:1.5,d:.8,h:.85,search:true,color:'#ad9372'},
  {id:'study-desk',type:'desk',x:15.04,z:5.3,w:1.7,d:.88,h:.85,yaw:Math.PI/2,color:'#ad967c'},
  {id:'study-chair',type:'chair',x:15.8,z:5.3,w:.6,d:.62,h:.98,yaw:-Math.PI/2,color:'#748ca0'},
  {id:'study-shelf',type:'shelf',name:'书房书柜',x:17.16,z:4.3,w:1.5,d:.65,h:2,yaw:-Math.PI/2,cover:true,color:'#7e8998'},
  {id:'study-lamp',type:'lamp',x:17.08,z:1.9,w:.42,d:.42,h:1.8,warm:false},
  {id:'storage-west',type:'shelf',name:'储物架',x:14.84,z:10.8,w:1.8,d:.65,h:1.85,yaw:Math.PI/2,cover:true,color:'#929087'},
  {id:'storage-boxes',type:'boxes',name:'纸箱堆',x:15.4,z:13,w:.9,d:.82,h:1.2,cover:true,color:'#ba9b76'},
  {id:'storage-east',type:'shelf',name:'储物架',x:17.16,z:10,w:1.8,d:.65,h:1.85,yaw:-Math.PI/2,cover:true,color:'#8a8f8d'},
  {id:'kitchen-search',type:'kitchen',name:'餐边柜',x:21,z:.98,w:3.1,d:.9,h:.92,search:true,minLevel:1,color:'#88aaa1'},
  {id:'dining-table',type:'table',x:20.8,z:4.6,w:1.7,d:1.12,h:.82,minLevel:1,color:'#c1a77a'},
  {id:'dining-chair-a',type:'chair',x:19.5,z:4.6,w:.6,d:.62,h:.98,yaw:Math.PI/2,minLevel:1,color:'#81998f'},
  {id:'dining-chair-b',type:'chair',x:22.1,z:4.6,w:.6,d:.62,h:.98,yaw:-Math.PI/2,minLevel:1,color:'#81998f'},
  {id:'storage-search',type:'cabinet',name:'储物柜',x:22.12,z:10,w:1.4,d:.68,h:1.3,yaw:-Math.PI/2,search:true,minLevel:1,cover:true,color:'#a88e82'},
  {id:'storage-lamp',type:'lamp',x:22.07,z:8.2,w:.42,d:.42,h:1.8,warm:false,minLevel:1},
  {id:'washer-a',type:'washer',x:11.8,z:15.02,w:.82,d:.9,h:1,minLevel:0},
  {id:'washer-b',type:'washer',x:12.75,z:15.02,w:.82,d:.9,h:1,minLevel:0},
  {id:'laundry-search',type:'cabinet',name:'洗衣间抽屉',x:12,z:17.12,w:1.15,d:.7,h:.86,yaw:Math.PI,search:true,minLevel:1,color:'#a4b2b5'},
  {id:'laundry-shelf',type:'shelf',name:'洗衣间高柜',x:13.16,z:16.5,w:1.1,d:.6,h:1.7,yaw:-Math.PI/2,cover:true,color:'#899ca4'},
  {id:'back-console',type:'cabinet',x:21,z:17.15,w:1.65,d:.65,h:.85,yaw:Math.PI,minLevel:1,color:'#9f8975'}
];
const cache=new Map();
export function furnitureFor(level){if(!cache.has(level))cache.set(level,FURNITURE.filter(f=>(f.minLevel??0)<=level&&(level>0||f.x+(Math.abs(Math.cos(f.yaw||0))*f.w+Math.abs(Math.sin(f.yaw||0))*f.d)/2<17.51)));return cache.get(level);}
export function localPoint(p,f){const a=f.yaw||0,c=Math.cos(a),s=Math.sin(a),x=p.x-f.x,z=p.z-f.z;return{x:x*c-z*s,z:x*s+z*c};}
export function circleHits(p,r,f){const q=localPoint(p,f),dx=Math.max(Math.abs(q.x)-f.w/2,0),dz=Math.max(Math.abs(q.z)-f.d/2,0);return dx*dx+dz*dz<r*r;}
export function doorShape(d){const yaw=d.progress*Math.PI*.49;return{id:'door',x:d.x-.47+.47*Math.cos(yaw),z:d.z-.47*Math.sin(yaw),w:.94,d:.12,h:2.16,yaw};}
export const SEARCH_IDS=[['living-search','study-search'],['living-search','study-search','kitchen-search','storage-search','laundry-search']];
export function searchSpots(level){return [...SEARCH_IDS[level===0?0:1],'study-shelf'].map(id=>{const f=FURNITURE.find(f=>f.id===id);return[f.x,f.z,f.name,id];});}
export const OPENINGS=[
  [3,10,'x','卧室'],[11,10,'x','后走廊'],[7,8,'x','父母房间'],[11,6,'x','旧木门'],
  [14,3,'z','书房'],[14,9,'z','储物区'],[14,12,'z','储物区'],[14,16,'z','后走廊'],
  [18,3,'z','餐厅'],[18,12,'z','储物区'],[18,16,'z','后走廊'],
  [16,7,'x','储物区'],[21,7,'x','餐厅'],[16,14,'x','后走廊'],[21,14,'x','后走廊'],[11,14,'x','洗衣间']
];
