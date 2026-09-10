const bounded=n=>Math.max(0,Math.min(1,n));
export function newMetrics(){return {loudSounds:0,noiseBurden:0,steps:0,goodSteps:0,doorSeconds:0,quietDoorSeconds:0,incidents:0,catches:0,exposures:0,partial:false};}
export function evaluatePerformance(game){
 const m=game.metrics,actions=m.steps+m.incidents+(m.doorSeconds>0?1:0),good=m.goodSteps+m.catches+(m.doorSeconds>0?bounded(m.quietDoorSeconds/m.doorSeconds):0);
 const rows=[
  {name:'任务完成',max:40,points:game.status==='won'?40:0,detail:game.status==='won'?'设备已安全带回卧室':'找到设备后，还要安全回家'},
  {name:'声音控制',max:25,points:Math.round(25*Math.max(0,1-m.noiseBurden/160)),detail:`明显声响 ${m.loudSounds} 次；安静等待不扣分`},
  {name:'动作判断',max:25,points:Math.round(25*(actions?bounded(good/actions):1)),detail:`落脚 ${m.goodSteps}/${m.steps} · 接物 ${m.catches}/${m.incidents} · 开合门${m.doorSeconds?Math.round(100*bounded(m.quietDoorSeconds/m.doorSeconds))+'% 安静':'尚未操作'}`},
  {name:'避开视线',max:10,points:Math.max(0,10-m.exposures*5),detail:`进入家长有效视线 ${m.exposures} 次`}
 ];
 const total=rows.reduce((n,r)=>n+r.points,0),grade=game.status!=='won'?'—':total>=90?'S':total>=75?'A':total>=60?'B':'C';
 return {total,grade,rows,partial:m.partial,title:game.status!=='won'?'这次的练习记录':{S:'无声归来',A:'稳稳收尾',B:'有惊无险',C:'再轻一点就好'}[grade]};
}
