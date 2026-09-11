// 模型、碰撞与声学共用住宅墙体定义。
export const MAP_DEPTH=19;
export const mapWidth=level=>level===0?19:24;
export function wall(x,z,level=0){
  if(x<=0||x>=mapWidth(level)-1||z<=0||z>=MAP_DEPTH-1)return true;
  if(z>=14&&x<10)return true;
  if(x===14&&![3,9,12,16].includes(z))return true;
  if(x>=15){
    if(x===18&&![3,12,16].includes(z))return true;
    if((z===7||z===14)&&![16,21].includes(x))return true;
    return false;
  }
  if(z===14&&x>=10&&x<14&&x!==11)return true;
  if(z===10 && x!==3 && x!==11)return true;
  if(x===7&&z>=11)return true;
  if((z===4||z===8)&&x>=5&&x<=9 && !(z===8&&x===7))return true;
  if((x===5||x===9)&&z>=4&&z<=8)return true;
  if(z===6&&x>=10&&x!==11)return true;
  return false;
}
