import {wall} from './engine.js';
import {furnitureFor,circleHits,doorShape} from './layout.js';
export function cameraBlocked(p,g){
 if(p.y>2.48||p.y<.16)return true;
 for(const dx of[-.12,.12])for(const dz of[-.12,.12])if(wall(Math.round(p.x+dx),Math.round(p.z+dz),g.level))return true;
 return [...furnitureFor(g.level),...g.doors.map(doorShape)].some(f=>f.h+.12>p.y&&circleHits(p,.15,f));
}
