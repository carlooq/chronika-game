import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS} from '../src/data.js';
import {awardStageProgress,initialProgress,isStageUnlocked,isCorrectGap,startRun,applyAnswer,advanceRun,yearOptions,progressSummary} from '../src/engine.js';
import {mergeProgress} from '../src/store.js';
const constant=()=>0.42;
test('12 level campaign has valid unique stages',()=>{
 const ids=CHAPTERS.flatMap(c=>c.stages.map(s=>s.id));
 assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);
 for(const chapter of CHAPTERS)for(const stage of chapter.stages){const run=startRun({category:chapter.category,type:stage.type,rounds:stage.rounds,stageId:stage.id},constant);assert.equal(run.rounds,stage.rounds);assert.equal(run.phase,'question');}
});
test('timeline correctly accepts boundaries and duplicate years',()=>{
 const arr=[{year:1985},{year:2001}];
 assert.equal(isCorrectGap(arr,0,1950),true);
 assert.equal(isCorrectGap(arr,1,1997),true);
 assert.equal(isCorrectGap(arr,1,2001),true);
 assert.equal(isCorrectGap(arr,2,1997),false);
});
test('timeline game advances, increasing anchors on success',()=>{
 const run=startRun({category:'cinema',type:'timeline',rounds:6},constant);
 const item=run.questions[0];
 const idx=run.anchors.findIndex(a=>a.year>item.year);
 const good=applyAnswer(run,idx<0?run.anchors.length:idx);
 assert.equal(good.correct,1);assert.equal(good.anchors.length,3);
 assert.equal(advanceRun(good).cursor,1);
});
test('earlier mode has enough questions for 7 pairs',()=>{
 const r=startRun({category:'cinema',type:'earlier',rounds:7},constant);
 assert.equal(r.questions.length,14);
 let run=r;
 for(let i=0;i<7;i++){
   const question=run.questions.slice(run.cursor,run.cursor+2);
   run=advanceRun(applyAnswer(run,question[0].year<=question[1].year?0:1));
 }
 assert.equal(run.correct,7);assert.equal(run.phase,'complete');
});
test('year options contain correct year exactly once',()=>{
 const r=startRun({category:'poland',type:'year',rounds:7},constant);
 const choices=yearOptions(r.questions[0],constant);
 assert.equal(choices.length,4);assert.equal(new Set(choices).size,4);assert.ok(choices.includes(r.questions[0].year));
});
test('campaign unlocks only after previous stage completion',()=>{
 const p=initialProgress();
 assert.equal(isStageUnlocked('cinema-1',p),true);
 assert.equal(isStageUnlocked('cinema-2',p),false);
 const one=awardStageProgress(p,'cinema-1',5,6);
 assert.equal(one.stars,2);assert.equal(one.next.xp,40);
 assert.equal(isStageUnlocked('cinema-2',one.next),true);
 const replay=awardStageProgress(one.next,'cinema-1',3,6);
 assert.equal(replay.gained,0);assert.equal(replay.next.xp,40);
 const next=awardStageProgress(replay.next,'cinema-1',6,6);
 assert.equal(next.gained,1);assert.equal(next.next.xp,60);
 assert.equal(progressSummary(next.next).stars,3);
});
test('cloud merge retains best progress, never duplicates XP',()=>{
 const a=awardStageProgress(initialProgress(),'cinema-1',4,6).next;
 const b=awardStageProgress(initialProgress(),'cinema-1',6,6).next;
 const m=mergeProgress(a,b);
 assert.equal(m.stages['cinema-1'].stars,3);assert.equal(m.xp,60);
});
