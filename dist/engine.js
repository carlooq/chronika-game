import { ITEMS, CHAPTERS } from './data.js';
export function shuffled(values, rng=Math.random) {
  const list=[...values];
  for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
}
export function categoryDeck(category) { return ITEMS.filter(item=>item.category===category); }
export function initialProgress() { return { stages:{}, xp:0, totalStars:0, lastUpdated:0 }; }
export function progressSummary(progress){
  const stages=CHAPTERS.flatMap(ch=>ch.stages);
  const stars=stages.reduce((sum,stage)=>sum+Number(progress?.stages?.[stage.id]?.stars||0),0);
  const completed=stages.filter(stage=>(progress?.stages?.[stage.id]?.stars||0)>0).length;
  return {stars,completed,total:stages.length,maxStars:stages.length*3};
}
export function isStageUnlocked(stageId, progress) {
  const stages=CHAPTERS.flatMap(ch=>ch.stages);
  const index=stages.findIndex(stage=>stage.id===stageId);
  return index===0 || (index>0 && !!progress?.stages?.[stages[index-1].id]?.stars);
}
export function starsForRun(correct, total){
  if(!total || correct<=0)return 0;
  const fraction=correct/total;
  return fraction>=.95?3:fraction>=.65?2:fraction>=.35?1:0;
}
export function awardStageProgress(progress,stageId,correct,total){
  const stars=starsForRun(correct,total);
  const prev=progress?.stages?.[stageId]||{stars:0,bestCorrect:0};
  const gained=Math.max(0,stars-prev.stars);
  const next={...progress, stages:{...progress.stages,[stageId]:{stars:Math.max(prev.stars,stars),bestCorrect:Math.max(prev.bestCorrect,correct),total}},xp:Number(progress.xp||0)+gained*20,lastUpdated:Date.now()};
  return {next,gained,stars};
}
export function startRun({category='cinema',type='timeline',rounds=6,stageId=null},rng=Math.random){
  const deck=shuffled(categoryDeck(category),rng);
  const required = type==='earlier' ? rounds*2 : rounds+(type==='timeline'?2:0);
  if(deck.length<required)throw new Error('Za mało wydarzeń w kategorii');
  const anchors=type==='timeline'?deck.slice(0,2).sort((a,b)=>a.year-b.year):[];
  const questions=type==='timeline'?deck.slice(2,rounds+2):deck.slice(0,required);
  return {category,type,rounds,stageId,anchors,questions,cursor:0,correct:0,answers:[],selected:null,phase:'question'};
}
export function currentQuestion(run){
  if(run.type==='earlier')return run.questions.slice(run.cursor,run.cursor+2);
  return run.questions[run.cursor];
}
// In timeline mode, a position is valid iff the year fits between neighbouring cards.
export function isCorrectGap(anchors,index,year){
  if(index<0||index>anchors.length)return false;
  const left=index===0?-Infinity:anchors[index-1].year;
  const right=index===anchors.length?Infinity:anchors[index].year;
  return left<=year && year<=right;
}
export function yearOptions(question, rng=Math.random) {
  const year=question.year;
  const offsets=shuffled([-15,-10,-7,-5,-4,-3,-2,2,3,4,5,7,10,15],rng);
  const choices=[year];
  for(const offset of offsets){const n=year+offset;if(n>=1&&!choices.includes(n))choices.push(n);if(choices.length===4)break;}
  return shuffled(choices,rng);
}
export function applyAnswer(run,answer){
  if(run.phase!=='question')return run;
  const item=currentQuestion(run);
  let correct=false, explanation='';let anchors=run.anchors;
  if(run.type==='timeline'){
    correct=isCorrectGap(run.anchors,Number(answer),item.year);
    explanation=`${item.title} — ${item.year}`;
    if(correct){anchors=[...run.anchors];anchors.splice(Number(answer),0,item);}
  } else if(run.type==='earlier'){
    correct=Number(answer)===(item[0].year<=item[1].year?0:1);
    explanation=`${item[0].title} (${item[0].year}) · ${item[1].title} (${item[1].year})`;
  } else {
    correct=Number(answer)===item.year;
    explanation=`${item.title} — ${item.year}`;
  }
  return {...run,correct:run.correct+Number(correct),answers:[...run.answers,{correct,explanation}],anchors,phase:'feedback',selected:answer};
}
export function advanceRun(run){
  if(run.phase!=='feedback')return run;
  const cursor=run.type==='earlier'?run.cursor+2:run.cursor+1;
  return {...run,cursor,phase:cursor>=(run.type==='earlier'?run.rounds*2:run.rounds)?'complete':'question',selected:null};
}
