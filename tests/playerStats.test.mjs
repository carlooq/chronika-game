import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRunStats, initialPlayerStats, accuracyPercent, formatDuration } from '../src/playerStats.js';
import { readLocalProgress, saveLocalProgress, mergeProgress, readLocalStats, saveLocalStats } from '../src/store.js';

test('run stats count quick and campaign separately, with historical accuracy', () => {
  const one=applyRunStats(initialPlayerStats(), {category:'culture',type:'earlier',correct:4,rounds:6,stageId:'st_1',durationSeconds:110});
  const two=applyRunStats(one, {category:'cinema',type:'year',correct:6,rounds:6,durationSeconds:60});
  assert.equal(two.totalRuns,2);
  assert.equal(two.campaignRuns,1);
  assert.equal(two.quickRuns,1);
  assert.equal(two.correctAnswers,10);
  assert.equal(two.totalAnswers,12);
  assert.equal(two.categories.culture.played,1);
  assert.equal(two.categories.cinema.correct,6);
  assert.equal(two.modes.year.played,1);
  assert.equal(two.recentRuns.length,2);
  assert.equal(accuracyPercent(two.correctAnswers,two.totalAnswers),83);
  assert.equal(formatDuration(two.totalTimeSeconds),'2 min');
});
test('recent runs stay capped at eight', () => {
  let stats=initialPlayerStats();
  for(let i=0;i<12;i++) stats=applyRunStats(stats,{category:'sport',type:'timeline',correct:6,rounds:6});
  assert.equal(stats.totalRuns,12);
  assert.equal(stats.recentRuns.length,8);
});
test('local progress is isolated by Firebase UID and old demo is migrated only once', () => {
  const storage=new Map();
  globalThis.localStorage={
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
  };
  const old={stages:{s1:{stars:2,bestCorrect:4,total:6}},xp:40,lastUpdated:50};
  storage.set('chronika:campaign:v1',JSON.stringify(old));
  assert.equal(readLocalProgress('guestA').stages.s1.stars,2);
  assert.equal(readLocalProgress('registeredB').stages.s1,undefined);
  saveLocalProgress({stages:{s1:{stars:3,bestCorrect:6,total:6}},xp:60},'registeredB');
  assert.equal(readLocalProgress('registeredB').stages.s1.stars,3);
  assert.equal(readLocalProgress('guestA').stages.s1.stars,2);
  saveLocalStats({totalRuns:4},'guestA');
  assert.equal(readLocalStats('guestA').totalRuns,4);
  assert.equal(readLocalStats('registeredB').totalRuns,0);
  assert.equal(mergeProgress(readLocalProgress('guestA'),readLocalProgress('registeredB')).stages.s1.stars,3);
});
