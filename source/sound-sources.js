import {PARENT_BED} from './layout.js';
import {SAMPLE_BANDS} from './sample-bands.js';
export const WASHER={x:11.8,z:15.02,y:1.1,cycle:18,start:7,end:13};
export const ENVIRONMENT_GAIN={snore:.90,washer:.65};
export const envelope=(age,end,attack,release)=>Math.max(0,Math.min(1,age/attack,(end-age)/release));
export function environmentSources(game){
 const age=game.time-game.lastSnore,phase=game.time%WASHER.cycle-WASHER.start;
 return [
  {kind:'snore',name:'长鼾声',...PARENT_BED,y:1,active:game.parent.state==='sleep'&&age>=0&&age<1.7,cover:age>=.1&&age<1.6,age,duration:1.7,gain:envelope(age,1.7,.09,.1)},
  {kind:'washer',name:'洗衣机脱水声',...WASHER,active:phase>=0&&phase<6,cover:phase>=0&&phase<6,age:phase,duration:6,gain:envelope(phase,6,.05,.06)}
 ];
}
export function sampleGain(kind,surface='wood',strength=25){
 return ({snore:.90,washer:.65,floorCreak:.82,floorPressure:.12,floorSoft:.27,step:.27,crouchStep:.07,parentStep:.92,tileStep:.27})[kind]*(kind==='floorSoft'?Math.max(.02,Math.min(1,strength/25)):1)*(/Step$|^step$/.test(kind)&&surface==='carpet'?.58:1);
}
const mean=keys=>[0,1,2].map(i=>Math.sqrt(keys.reduce((s,k)=>s+(SAMPLE_BANDS[k]?.[i]||0)**2,0)/keys.length));
export function emittedBands(kind,strength=25,surface='wood'){
 let bands,level=1;
 if(kind==='snore'||kind==='washer'){bands=SAMPLE_BANDS[kind==='snore'?'snore-real':'washer-spin'];level=ENVIRONMENT_GAIN[kind];}
 else if(kind.startsWith('floor')){bands=mean([1,2,3].map(i=>`floor-creak-${i}`));level=sampleGain(kind,surface,strength);}
 else if(['step','crouchStep','tileStep','parentStep'].includes(kind)){bands=mean([1,2,3,4].map(i=>`step-${surface}-${i}`));level=sampleGain(kind,surface,strength);}
 else {const file={doorBump:'door-bump',metalDrop:'metal-drop',doorCreak:'door-hinge',hingeMotion:'hinge-real',lockScrape:null}[kind];bands=file?SAMPLE_BANDS[file]:[.06,.08,.035];level=kind==='doorBump'?3*(.18+Math.max(0,Math.min(1,(strength-24)/66))*.82):Math.max(.03,strength/50);}
 return bands.map(v=>v*level);
}
