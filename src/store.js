import { initialProgress, progressSummary } from './engine.js';
const KEY='chronika:campaign:v1';
export function readLocalProgress(){
  try {
    const p=JSON.parse(localStorage.getItem(KEY)||'null');
    if(p && typeof p==='object' && p.stages && typeof p.stages==='object')return p;
  } catch {}
  return initialProgress();
}
export function saveLocalProgress(progress){
  try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{}
}
export function mergeProgress(local,remote){
  const combined={...initialProgress(),stages:{}};
  const ids=new Set([...Object.keys(local?.stages||{}),...Object.keys(remote?.stages||{})]);
  for(const id of ids){
    const a=local?.stages?.[id]||{},b=remote?.stages?.[id]||{};
    combined.stages[id]={stars:Math.max(Number(a.stars||0),Number(b.stars||0)),bestCorrect:Math.max(Number(a.bestCorrect||0),Number(b.bestCorrect||0)),total:Number(a.total||b.total||0)};
  }
  const summary=progressSummary(combined);
  combined.totalStars=summary.stars;
  combined.xp=summary.stars*20;
  combined.lastUpdated=Math.max(Number(local?.lastUpdated||0),Number(remote?.lastUpdated||0));
  return combined;
}
