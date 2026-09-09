import {puzzleFor} from './puzzles.js';
import {CLUES,clueText} from './night-tools.js';
export class PuzzleUI{
 constructor(game,{release,resume,save}){
  this.game=game;this.release=release;this.resume=resume;this.save=save;this.id=null;this.entry=[];
  this.root=document.createElement('section');this.root.id='puzzle-screen';this.root.className='modal-backdrop';this.root.hidden=true;this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','puzzle-title');
  this.root.innerHTML='<div class="modal puzzle-dialog"><p class="eyebrow">PIECE BY PIECE · 慢慢揭晓</p><h2 id="puzzle-title"></h2><p id="puzzle-evidence"></p><div id="puzzle-notes"></div><p id="puzzle-slots" aria-live="polite"></p><div id="puzzle-options"></div><p id="puzzle-feedback" role="status"></p><div class="puzzle-actions"><button id="puzzle-reset">重新排列</button><button id="puzzle-hint">给点提示</button><button id="puzzle-submit" class="primary">试试看</button><button id="puzzle-close">先收起来</button></div><small>读题时暂停 · 点选排列 · 手柄方向键选择、× 确认、○ 返回</small></div>';
  document.querySelector('main').append(this.root);this.find=s=>this.root.querySelector(s);
  this.find('#puzzle-close').onclick=()=>this.close();this.find('#puzzle-reset').onclick=()=>{this.entry=[];this.paint();};
  this.find('#puzzle-hint').onclick=()=>this.find('#puzzle-feedback').textContent=this.data.hint;
  this.find('#puzzle-submit').onclick=()=>{if(game.solvePuzzle(this.entry)){this.id=null;this.root.hidden=true;this.resume();this.save();}else{this.find('#puzzle-feedback').textContent=this.missing.length?'还缺少线索：'+this.missing.join('、')+'。先收起来，继续探索。':'还没对上。看看条件里谁在前、谁在后；可以重新排列。';}};
 }
 sync(){if(this.game.mode?.type!=='puzzle')return;if(this.id===this.game.mode.puzzleId&&!this.root.hidden)return;
  this.id=this.game.mode.puzzleId;this.data=puzzleFor(this.game,this.id);if(!this.data){this.game.cancel();return;}this.entry=[];this.release();this.game.active=false;
  this.find('#puzzle-title').textContent=this.data.title;this.find('#puzzle-evidence').textContent=this.data.evidence;this.find('#puzzle-feedback').textContent='';
  const notes=this.find('#puzzle-notes');notes.replaceChildren();this.missing=[];
  for(const id of this.data.required||[]){const p=document.createElement('p');if(this.game.night.clues.includes(id))p.textContent=clueText(this.game.level,id);else{const name=CLUES.find(c=>c.id===id).name;this.missing.push(name);p.textContent='尚未解读：'+name;}notes.append(p);}
  const list=this.find('#puzzle-options');list.replaceChildren();this.data.options.forEach((text,i)=>{const b=document.createElement('button');b.textContent=text;b.dataset.choice=i;b.onclick=()=>{if(this.entry.length<this.data.answer.length){this.entry.push(i);this.paint();}};list.append(b);});this.root.hidden=false;this.paint();this.find('#puzzle-options button').focus();
 }
 paint(){this.find('#puzzle-slots').textContent=Array.from({length:this.data.answer.length},(_,i)=>this.entry[i]===undefined?'＿':this.data.options[this.entry[i]]).join('  →  ');this.find('#puzzle-submit').disabled=this.entry.length!==this.data.answer.length||this.missing.length>0;}
 close(){this.game.cancel();this.id=null;this.root.hidden=true;this.resume();this.save();}
}
