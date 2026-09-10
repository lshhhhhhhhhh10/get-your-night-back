import {FURNITURE} from './layout.js';

// All poses are in a station frame: its supporting surface is y = .085,
// +Z faces the player. World, search and rescue use the same placement.
export const SURFACE_Y=.085;
export const STATIONS={
 vase:{id:'vase-stand',x:0,z:0,rest:{x:0,y:.319,z:0,rx:0,rz:0}},
 pencils:{id:'study-search',x:0,z:0,charger:{x:-.15,z:.26},rest:{x:-.43,y:.225,z:-.17,rx:0,rz:0}},
 fork:{id:'kitchen-search',x:-.91,z:0,rest:{x:-.09,y:.123,z:0,rx:Math.PI/2,rz:0}},
 tin:{id:'storage-search',x:0,z:0,charger:{x:.40,z:.23},rest:{x:0,y:.287,z:-.04,rx:0,rz:0}}
};
export function stationFor(kind){return STATIONS[kind]||STATIONS.vase;}
export function stationFurniture(kind){return FURNITURE.find(f=>f.id===stationFor(kind).id);}
export function restingPencil(index){return {x:-.43+(index-1)*.044,y:.403+index*.018,z:-.17,rx:0,ry:index*.8,rz:(index-1)*-.12};}
