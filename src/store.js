import { initialProgress, progressSummary } from './engine.js';
import { initialPlayerStats, normaliseStats } from './playerStats.js';
const OLD_KEY='chronika:campaign:v1';
const MIGRATION_KEY='chronika:migration:v1-to-uid';
const progressKey=uid=>`chronika:campaign:v2:${uid}`;
const statsKey=uid=>`chronika:stats:v1:${uid}`;

export function readLocalProgress(uid) {
  if(!uid)return initialProgress();
  try {
    const p=JSON.parse(localStorage.getItem(progressKey(uid))||'null');
    if(p && typeof p==='object' && p.stages && typeof p.stages==='object')return p;
    // One-time migration of the original single-device demo. It must not be
    // imported into every new account which subsequently signs in here.
    if(!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(MIGRATION_KEY,uid);
      const old=JSON.parse(localStorage.getItem(OLD_KEY)||'null');
      if(old && typeof old==='object' && old.stages && typeof old.stages==='object') {
        localStorage.setItem(progressKey(uid),JSON.stringify(old));
        return old;
      }
    }
  } catch {}
  return initialProgress();
}
export function saveLocalProgress(progress,uid) {
  if(!uid)return;
  try{localStorage.setItem(progressKey(uid),JSON.stringify(progress));}catch{}
}
export function readLocalStats(uid) {
  if(!uid)return initialPlayerStats();
  try{return normaliseStats(JSON.parse(localStorage.getItem(statsKey(uid))||'null'));}catch{return initialPlayerStats();}
}
export function saveLocalStats(stats,uid) {
  if(!uid)return;
  try{localStorage.setItem(statsKey(uid),JSON.stringify(normaliseStats(stats)));}catch{}
}
export function mergeProgress(local,remote) {
  const combined={...initialProgress(),stages:{}};
  const ids=new Set([...Object.keys(local?.stages||{}),...Object.keys(remote?.stages||{})]);
  for(const id of ids) {
    const a=local?.stages?.[id]||{},b=remote?.stages?.[id]||{};
    combined.stages[id]={
      stars:Math.max(Number(a.stars||0),Number(b.stars||0)),
      bestCorrect:Math.max(Number(a.bestCorrect||0),Number(b.bestCorrect||0)),
      total:Number(a.total||b.total||0),
    };
  }
  const summary=progressSummary(combined);
  combined.totalStars=summary.stars;
  combined.xp=summary.stars*20;
  combined.lastUpdated=Math.max(Number(local?.lastUpdated||0),Number(remote?.lastUpdated||0));
  return combined;
}
